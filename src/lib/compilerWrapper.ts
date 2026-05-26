// @ts-nocheck

let moduleInstance: any = null;
let initPromise: Promise<void> | null = null;

interface Token {
  type: string;
  value: string;
  line: number;
  col: number;
}

const TYPE_KEYWORDS = new Set(['KEYWORD_INT', 'KEYWORD_FLOAT', 'KEYWORD_CHAR', 'KEYWORD_DOUBLE']);
const CONTROL_KEYWORDS = new Set(['KEYWORD_WHILE', 'KEYWORD_IF', 'KEYWORD_ELSE']);
const RETURN_KEYWORD = 'KEYWORD_RETURN';
const OP_TYPES = new Set([
  'OPERATOR_PLUS',
  'OPERATOR_MINUS',
  'OPERATOR_MULTIPLY',
  'OPERATOR_DIVIDE',
  'OPERATOR_LESS',
  'OPERATOR_GREATER',
  'OPERATOR_LESS_EQUAL',
  'OPERATOR_GREATER_EQUAL',
  'OPERATOR_EQUAL',
  'OPERATOR_NOT_EQUAL',
  'OPERATOR_ASSIGN',
]);

function isNumberToken(t: Token): boolean {
  return t.type === 'INTEGER_LITERAL' || t.type === 'FLOAT_LITERAL' || t.type === 'NUMBER';
}

function isFactorToken(t: Token): boolean {
  return t.type === 'IDENTIFIER' || isNumberToken(t);
}

function extractMainBodyFromSource(rawInput: string): string {
  const trimmed = rawInput.trim();
  const mainBodyMatch = /main\s*\([^)]*\)\s*\{([\s\S]*)\}/.exec(trimmed);
  if (mainBodyMatch && mainBodyMatch[1]) {
    return mainBodyMatch[1].trim();
  }
  return trimmed;
}

function indent(out: string[], depth: number, text: string) {
  out.push(`${'  '.repeat(depth)}${text}`);
}

function skipBalanced(tokens: Token[], startIndex: number, openType: string, closeType: string): number {
  if (tokens[startIndex]?.type !== openType) return startIndex;
  let depth = 0;
  let i = startIndex;
  while (i < tokens.length) {
    const t = tokens[i];
    if (t.type === openType) depth++;
    else if (t.type === closeType) {
      depth--;
      if (depth === 0) return i + 1;
    }
    i++;
  }
  return tokens.length;
}

function parseSyntaxFromTokens(tokens: Token[]): any {
  let i = 0;
  const lines: string[] = [];
  const errors: string[] = [];

  const peek = (offset = 0) => tokens[i + offset] ?? { type: 'EOF', value: 'EOF', line: 0, col: 0 };
  const consume = () => tokens[i++] ?? { type: 'EOF', value: 'EOF', line: 0, col: 0 };

  const fail = (msg: string) => {
    errors.push(msg);
  };

  const parseFactor = (depth: number): boolean => {
    const t = peek();
    if (t.type === 'LEFT_PAREN') {
      indent(lines, depth, 'Factor');
      indent(lines, depth + 1, '(');
      consume();
      if (!parseExpr(depth + 1)) return false;
      if (peek().type !== 'RIGHT_PAREN') {
        fail(`Expected ')' but got ${peek().value || peek().type} at line ${peek().line}, col ${peek().col}`);
        return false;
      }
      indent(lines, depth + 1, ')');
      consume();
      return true;
    }

    if (t.type === 'IDENTIFIER') {
      indent(lines, depth, 'Factor');
      indent(lines, depth + 1, `ID: ${t.value}`);
      consume();
      return true;
    }

    if (isNumberToken(t)) {
      indent(lines, depth, 'Factor');
      indent(lines, depth + 1, `NUM: ${t.value}`);
      consume();
      return true;
    }

    fail(`Unexpected token '${t.value}' (${t.type}) at line ${t.line}, col ${t.col}`);
    return false;
  };

  const parseTerm = (depth: number): boolean => {
    indent(lines, depth, 'Term');
    if (!parseFactor(depth + 1)) return false;

    while (OP_TYPES.has(peek().type) && (peek().type === 'OPERATOR_MULTIPLY' || peek().type === 'OPERATOR_DIVIDE')) {
      const op = consume();
      indent(lines, depth + 1, `Op: ${op.value}`);
      if (!parseFactor(depth + 1)) return false;
    }
    return true;
  };

  const parseExpr = (depth: number): boolean => {
    indent(lines, depth, 'Expr');
    if (!parseTerm(depth + 1)) return false;

    while (OP_TYPES.has(peek().type) && (
      peek().type === 'OPERATOR_PLUS' ||
      peek().type === 'OPERATOR_MINUS'
    )) {
      const op = consume();
      indent(lines, depth + 1, `Op: ${op.value}`);
      if (!parseTerm(depth + 1)) return false;
    }
    return true;
  };

  const skipConditionGroup = () => {
    if (peek().type !== 'LEFT_PAREN') return;
    let depth = 0;
    while (i < tokens.length) {
      const t = consume();
      if (t.type === 'LEFT_PAREN') depth++;
      else if (t.type === 'RIGHT_PAREN') {
        depth--;
        if (depth === 0) break;
      }
    }
  };

  const parseStatement = (depth = 0): boolean => {
    const t = peek();

    if (t.type === 'EOF' || t.type === 'RIGHT_BRACE') return false;

    // Skip stray braces safely.
    if (t.type === 'LEFT_BRACE') {
      consume();
      indent(lines, depth, 'Block');
      while (peek().type !== 'RIGHT_BRACE' && peek().type !== 'EOF') {
        if (!parseStatement(depth + 1)) break;
      }
      if (peek().type === 'RIGHT_BRACE') consume();
      return true;
    }

    // Function definition wrapper: int main() { ... }
    if (TYPE_KEYWORDS.has(t.type) && peek(1).type === 'IDENTIFIER' && peek(2).type === 'LEFT_PAREN') {
      const typeTok = consume();
      const nameTok = consume();
      indent(lines, depth, 'Function');
      indent(lines, depth + 1, `ReturnType: ${typeTok.value}`);
      indent(lines, depth + 1, `Name: ${nameTok.value}`);

      // Skip parameter list.
      if (peek().type === 'LEFT_PAREN') {
        let j = i;
        j = skipBalanced(tokens, j, 'LEFT_PAREN', 'RIGHT_PAREN');
        i = j;
      }

      // Parse body if present.
      if (peek().type === 'LEFT_BRACE') {
        consume();
        indent(lines, depth + 1, 'Body');
        while (peek().type !== 'RIGHT_BRACE' && peek().type !== 'EOF') {
          if (!parseStatement(depth + 2)) break;
        }
        if (peek().type === 'RIGHT_BRACE') consume();
      }
      return true;
    }

    // Control flow: while / if / else
    if (CONTROL_KEYWORDS.has(t.type)) {
      const kw = consume();
      indent(lines, depth, kw.type === 'KEYWORD_WHILE' ? 'While' : kw.type === 'KEYWORD_IF' ? 'If' : 'Else');

      if (peek().type === 'LEFT_PAREN') {
        indent(lines, depth + 1, 'Condition');
        skipConditionGroup();
      }

      if (peek().type === 'LEFT_BRACE') {
        consume();
        indent(lines, depth + 1, 'Block');
        while (peek().type !== 'RIGHT_BRACE' && peek().type !== 'EOF') {
          if (!parseStatement(depth + 2)) break;
        }
        if (peek().type === 'RIGHT_BRACE') consume();
      } else if (peek().type !== 'SEMICOLON' && peek().type !== 'EOF') {
        parseStatement(depth + 1);
      }

      return true;
    }

    // Return statement: consume and skip expression.
    if (t.type === RETURN_KEYWORD) {
      consume();
      indent(lines, depth, 'Return');
      while (peek().type !== 'SEMICOLON' && peek().type !== 'EOF' && peek().type !== 'RIGHT_BRACE') {
        consume();
      }
      if (peek().type === 'SEMICOLON') consume();
      return true;
    }

    // Skip function calls like printf(...);
    if (t.type === 'IDENTIFIER' && peek(1).type === 'LEFT_PAREN' && peek(2).type !== 'OPERATOR_ASSIGN') {
      const name = consume();
      indent(lines, depth, `Call: ${name.value}`);
      i = skipBalanced(tokens, i, 'LEFT_PAREN', 'RIGHT_PAREN');
      if (peek().type === 'SEMICOLON') consume();
      return true;
    }

    // Declaration / assignment / expression statement.
    indent(lines, depth, 'Statement');

    if (TYPE_KEYWORDS.has(t.type)) {
      const typeTok = consume();
      indent(lines, depth + 1, `Type: ${typeTok.value}`);
    }

    if (peek().type === 'IDENTIFIER') {
      const idTok = consume();
      indent(lines, depth + 1, `ID: ${idTok.value}`);

      if (peek().type === 'OPERATOR_ASSIGN') {
        consume();
        indent(lines, depth + 1, '=');
        if (!parseExpr(depth + 1)) return false;
      } else if (peek().type === 'LEFT_PAREN') {
        // function call-like expression after identifier
        i = skipBalanced(tokens, i, 'LEFT_PAREN', 'RIGHT_PAREN');
      } else if (!TYPE_KEYWORDS.has(t.type)) {
        // bare identifier expression
      }
    } else {
      // Parse expression statements (like parenthesized expressions)
      if (!parseExpr(depth + 1)) {
        return false;
      }
    }

    // Consume trailing semicolon if present.
    if (peek().type === 'SEMICOLON') consume();
    return true;
  };

  while (i < tokens.length && peek().type !== 'EOF') {
    if (!parseStatement(0)) break;
    if (errors.length) break;
  }

  const hasError = errors.length > 0;
  const parseTree = lines.join('\\n') + (lines.length ? '\\n' : '');
  return {
    success: !hasError,
    error: hasError ? errors[0] : '',
    parseTree,
    grammar: {
      rules: [
        { name: 'E → E + T | E - T | T', leftRecursive: true, rightRecursive: false },
        { name: 'T → T * F | T / F | F', leftRecursive: true, rightRecursive: false },
        { name: 'F → ( E ) | id | num', leftRecursive: false, rightRecursive: false },
      ],
      isAmbiguous: false,
      ambiguityReason: 'Operator precedence (* binds tighter than +) and left-associativity remove ambiguity.',
      hasLeftRecursion: true,
      leftRecursionDetail: 'E → E + T and T → T * F are left recursive. Handled by iterative parsing (equivalent to left-recursion elimination).',
      hasRightRecursion: false,
    },
  };
}

export async function initCompiler(): Promise<void> {
  if (moduleInstance) return;
  if (initPromise) return initPromise;

  initPromise = new Promise<void>((resolve, reject) => {
    // Set locateFile before the script loads so it finds the .wasm
    (window as any).Module = {
      locateFile: (path: string) => '/wasm/' + path,
      onRuntimeInitialized: () => {
        moduleInstance = (window as any).Module;
        resolve();
      }
    };

    const script = document.createElement('script');
    script.src = '/wasm/compiler.js';
    script.onerror = () => reject(new Error('Failed to load compiler.js'));
    document.head.appendChild(script);
  });

  return initPromise;
}

export { extractMainBodyFromSource };

/**
 * Keep lexical and semantic analysis on the full raw C program so the WASM
 * structural checks still see #include and main().
 */
export function lexicalAnalysis(input: string): any[] {
  if (!moduleInstance) throw new Error('Compiler not initialized');
  return JSON.parse(moduleInstance.ccall('do_lexical_analysis', 'string', ['string'], [input]));
}

export function syntaxAnalysis(input: string): any {
  if (!moduleInstance) throw new Error('Compiler not initialized');
  const tokens: Token[] = lexicalAnalysis(input);
  const body = extractMainBodyFromSource(input);

  // Use a safer frontend parser for syntax so control-flow statements
  // such as while/if/else do not trip the WASM parser.
  const bodyTokens = JSON.parse(moduleInstance.ccall('do_lexical_analysis', 'string', ['string'], [body])) as Token[];

  // If the body still triggers the structural guard in the WASM lexer,
  // fall back to parsing the token stream from the full input and simply
  // ignore the wrapper tokens.
  const parseTokens = bodyTokens.length && bodyTokens[0]?.type !== 'ERROR' ? bodyTokens : tokens;
  return parseSyntaxFromTokens(parseTokens);
}

export function semanticAnalysis(input: string): any {
  if (!moduleInstance) throw new Error('Compiler not initialized');
  return JSON.parse(moduleInstance.ccall('do_semantic_analysis', 'string', ['string'], [input]));
}
