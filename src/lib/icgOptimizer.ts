// @ts-nocheck
// Intermediate Code Generation (Three-Address Code) + Code Optimization
// Operates on the token stream produced by the WASM lexer so we don't need to
// recompile the C backend. Supports simple statements of the form:
//   [type] ident = expr ;
// where expr is a sequence of identifiers / numbers combined with + - * /.

export interface TacInstruction {
  op: string;          // '=', '+', '-', '*', '/', 'copy'
  arg1: string;
  arg2: string;
  result: string;
  raw: string;         // human-readable "t1 = a + b"
}

export interface OptimizationStep {
  type: 'constant-folding' | 'algebraic-simplification' | 'dead-code-elimination' | 'copy-propagation';
  before: string;
  after: string;
  reason: string;
}

export interface IcgResult {
  instructions: TacInstruction[];
  error?: string;
}

export interface OptimizationResult {
  optimized: TacInstruction[];
  steps: OptimizationStep[];
}

interface Token {
  type: string;
  value: string;
  line: number;
  col: number;
}

const KEYWORD_TYPES = new Set(['KEYWORD_INT', 'KEYWORD_FLOAT', 'KEYWORD_CHAR', 'KEYWORD_DOUBLE']);
const OP_MAP: Record<string, string> = {
  OPERATOR_PLUS: '+',
  OPERATOR_MINUS: '-',
  OPERATOR_MULTIPLY: '*',
  OPERATOR_DIVIDE: '/',
};

function precedence(op: string): number {
  if (op === '+' || op === '-') return 1;
  if (op === '*' || op === '/') return 2;
  return 0;
}

// Convert an infix expression token slice into postfix (Shunting-Yard).
function isOperand(t: Token): boolean {
  return t.type === 'IDENTIFIER' || t.type === 'NUMBER' ||
         t.type === 'INTEGER_LITERAL' || t.type === 'FLOAT_LITERAL';
}

function toPostfix(tokens: Token[]): Token[] {
  const output: Token[] = [];
  const stack: Token[] = [];
  for (const t of tokens) {
    if (isOperand(t)) {
      output.push(t);
    } else if (t.type in OP_MAP) {
      while (
        stack.length &&
        stack[stack.length - 1].type in OP_MAP &&
        precedence(OP_MAP[stack[stack.length - 1].type]) >= precedence(OP_MAP[t.type])
      ) {
        output.push(stack.pop()!);
      }
      stack.push(t);
    }
  }
  while (stack.length) output.push(stack.pop()!);
  return output;
}

export function generateTAC(tokens: Token[]): IcgResult {
  const instructions: TacInstruction[] = [];
  let tempCount = 0;
  const newTemp = () => `t${++tempCount}`;

  // --- ARMED PROTECTIVE GUARD BOUNDARY ---
  // If previous validation fails or receives an error token, halt TAC pipeline execution cleanly.
  const containsError = tokens.some(t => t.type === 'ERROR');
  if (containsError) {
    return { instructions: [], error: "ICG Generation Skipped: Valid environment source expression context missing." };
  }

  // Recursively walk the raw token stream and collect only assignable statements
  // from inside blocks, while/if/else bodies, and the main function wrapper.
  const statements: Token[][] = [];
  let current: Token[] = [];
  let i = 0;

  const peek = (offset = 0) => tokens[i + offset] as Token | undefined;
  const pushCurrent = () => {
    if (current.length) statements.push(current);
    current = [];
  };

  const skipBalanced = (openType: string, closeType: string) => {
    if (peek()?.type !== openType) return;
    let depth = 0;
    while (i < tokens.length) {
      const t = tokens[i++];
      if (t.type === openType) depth++;
      else if (t.type === closeType) {
        depth--;
        if (depth === 0) break;
      }
    }
  };

  const skipControlHeader = () => {
    if (peek()?.type !== 'LEFT_PAREN') return;
    let depth = 0;
    while (i < tokens.length) {
      const t = tokens[i++];
      if (t.type === 'LEFT_PAREN') depth++;
      else if (t.type === 'RIGHT_PAREN') {
        depth--;
        if (depth === 0) break;
      }
    }
  };

  const walk = () => {
    while (i < tokens.length) {
      const t = tokens[i];

      if (t.type === 'EOF') break;

      if (t.type === 'LEFT_BRACE') {
        i++;
        walk();
        continue;
      }

      if (t.type === 'RIGHT_BRACE') {
        i++;
        pushCurrent();
        return;
      }

      if (t.type === 'KEYWORD_WHILE' || t.type === 'KEYWORD_IF' || t.type === 'KEYWORD_ELSE') {
        i++;
        skipControlHeader();
        if (peek()?.type === 'LEFT_BRACE') {
          i++;
          walk();
        }
        continue;
      }

      if (t.type === 'KEYWORD_RETURN') {
        // Ignore return statements in TAC generation.
        while (i < tokens.length && tokens[i].type !== 'SEMICOLON' && tokens[i].type !== 'RIGHT_BRACE') i++;
        if (tokens[i]?.type === 'SEMICOLON') i++;
        pushCurrent();
        continue;
      }

      if (t.type === 'SEMICOLON') {
        pushCurrent();
        i++;
        continue;
      }

      current.push(t);
      i++;
    }
    pushCurrent();
  };

  walk();

  const filteredStatements = statements.filter(stmt => stmt.some(t => t.type !== 'LEFT_BRACE' && t.type !== 'RIGHT_BRACE'));
  const cleanStatements = filteredStatements.map(stmt => stmt.filter(t => t.type !== 'LEFT_BRACE' && t.type !== 'RIGHT_BRACE'));

  const processStatement = (stmt: Token[]) => {
    // Strip leading type keyword (declaration).
    let j = 0;
    if (stmt[j] && KEYWORD_TYPES.has(stmt[j].type)) j++;
    if (!stmt[j] || stmt[j].type !== 'IDENTIFIER') return;
    const target = stmt[j].value;
    j++;
    // Expect '='
    if (!stmt[j] || (stmt[j].value !== '=' && stmt[j].type !== 'OPERATOR_ASSIGN')) return;
    j++;
    const exprTokens = stmt.slice(j);
    if (exprTokens.length === 0) return;

    const postfix = toPostfix(exprTokens);
    const evalStack: string[] = [];

    for (const tok of postfix) {
      if (tok.type === 'IDENTIFIER' || tok.type === 'NUMBER' ||
          tok.type === 'INTEGER_LITERAL' || tok.type === 'FLOAT_LITERAL') {
        evalStack.push(tok.value);
      } else if (tok.type in OP_MAP) {
        const b = evalStack.pop();
        const a = evalStack.pop();
        if (a === undefined || b === undefined) {
          throw new Error(`Malformed expression assigning to ${target}`);
        }
        const tmp = newTemp();
        const op = OP_MAP[tok.type];
        instructions.push({ op, arg1: a, arg2: b, result: tmp, raw: `${tmp} = ${a} ${op} ${b}` });
        evalStack.push(tmp);
      }
    }

    if (evalStack.length === 1) {
      const final = evalStack.pop()!;
      instructions.push({ op: 'copy', arg1: final, arg2: '', result: target, raw: `${target} = ${final}` });
    }
  };

  try {
    for (const stmt of cleanStatements) {
      processStatement(stmt);
    }
  } catch (e: any) {
    return { instructions, error: e?.message || 'Malformed TAC input' };
  }

  return { instructions };
}

const isNumeric = (s: string) => /^-?\d+(\.\d+)?$/.test(s);

export function optimize(input: TacInstruction[]): OptimizationResult {
  const steps: OptimizationStep[] = [];
  
  // Guard loop boundary check to make sure input arrays are safe before running algorithms
  if (!input || input.length === 0) {
    return { optimized: [], steps: [] };
  }

  let code = input.map(i => ({ ...i }));

  // --- Pass 1: Constant folding + algebraic simplification (iterate to fixed-point) ---
  let changed = true;
  while (changed) {
    changed = false;
    const constMap = new Map<string, string>(); // temp/var -> literal value

    for (let idx = 0; idx < code.length; idx++) {
      const ins = code[idx];
      const before = ins.raw;

      // Substitute known constant operands.
      const sub = (x: string) => (constMap.has(x) ? constMap.get(x)! : x);
      const a = sub(ins.arg1);
      const b = ins.arg2 ? sub(ins.arg2) : ins.arg2;

      if (ins.op === 'copy') {
        if (a !== ins.arg1) {
          ins.arg1 = a;
          ins.raw = `${ins.result} = ${a}`;
          steps.push({ type: 'copy-propagation', before, after: ins.raw, reason: `Propagated constant/value into ${ins.result}` });
          changed = true;
        }
        if (isNumeric(ins.arg1)) constMap.set(ins.result, ins.arg1);
        continue;
      }

      // Algebraic simplification on original operands first.
      const simplifyTo = (val: string, reason: string) => {
        ins.op = 'copy';
        ins.arg1 = val;
        ins.arg2 = '';
        ins.raw = `${ins.result} = ${val}`;
        steps.push({ type: 'algebraic-simplification', before, after: ins.raw, reason });
        if (isNumeric(val)) constMap.set(ins.result, val);
        changed = true;
      };

      if ((ins.op === '+' && b === '0')) { simplifyTo(a, 'x + 0 → x'); continue; }
      if ((ins.op === '+' && a === '0')) { simplifyTo(b, '0 + x → x'); continue; }
      if ((ins.op === '-' && b === '0')) { simplifyTo(a, 'x - 0 → x'); continue; }
      if ((ins.op === '*' && b === '1')) { simplifyTo(a, 'x * 1 → x'); continue; }
      if ((ins.op === '*' && a === '1')) { simplifyTo(b, '1 * x → x'); continue; }
      if ((ins.op === '*' && (a === '0' || b === '0'))) { simplifyTo('0', 'x * 0 → 0'); continue; }
      if ((ins.op === '/' && b === '1')) { simplifyTo(a, 'x / 1 → x'); continue; }

      // Constant folding.
      if (isNumeric(a) && isNumeric(b)) {
        const na = parseFloat(a);
        const nb = parseFloat(b);
        let result: number | null = null;
        switch (ins.op) {
          case '+': result = na + nb; break;
          case '-': result = na - nb; break;
          case '*': result = na * nb; break;
          case '/': result = nb !== 0 ? na / nb : null; break;
        }
        if (result !== null) {
          const folded = Number.isInteger(result) ? String(result) : String(+result.toFixed(6));
          const newRaw = `${ins.result} = ${folded}`;
          steps.push({ type: 'constant-folding', before, after: newRaw, reason: `${a} ${ins.op} ${b} = ${folded}` });
          ins.op = 'copy';
          ins.arg1 = folded;
          ins.arg2 = '';
          ins.raw = newRaw;
          constMap.set(ins.result, folded);
          changed = true;
          continue;
        }
      }

      // If we substituted operands but couldn't fold, still record the change.
      if (a !== ins.arg1 || b !== ins.arg2) {
        ins.arg1 = a;
        ins.arg2 = b;
        ins.raw = `${ins.result} = ${a} ${ins.op} ${b}`;
        steps.push({ type: 'copy-propagation', before, after: ins.raw, reason: 'Propagated known values' });
        changed = true;
      }
    }
  }

  // --- Pass 2: Dead code elimination ---
  const isTemp = (n: string) => /^t\d+$/.test(n);
  const used = new Set<string>();
  const liveInstr = new Set<number>();
  for (let i = 0; i < code.length; i++) {
    if (!isTemp(code[i].result)) liveInstr.add(i);
  }
  let dceChanged = true;
  while (dceChanged) {
    dceChanged = false;
    used.clear();
    for (const i of liveInstr) {
      const ins = code[i];
      if (ins.arg1) used.add(ins.arg1);
      if (ins.arg2) used.add(ins.arg2);
    }
    for (let i = 0; i < code.length; i++) {
      if (!liveInstr.has(i) && used.has(code[i].result)) {
        liveInstr.add(i);
        dceChanged = true;
      }
    }
  }
  const finalCode: TacInstruction[] = [];
  for (let i = 0; i < code.length; i++) {
    if (liveInstr.has(i)) {
      finalCode.push(code[i]);
    } else {
      steps.push({
        type: 'dead-code-elimination',
        before: code[i].raw,
        after: '(removed)',
        reason: `${code[i].result} is never used`,
      });
    }
  }

  return { optimized: finalCode, steps };
}