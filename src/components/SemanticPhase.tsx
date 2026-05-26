interface SemanticCheck {
  check: string;
  message: string;
  pass: boolean;
  line: number;
}

interface SymbolEntry {
  name: string;
  type: string;
  initialized: boolean;
}

interface SemanticResult {
  success: boolean;
  checks: SemanticCheck[];
  symbolTable: SymbolEntry[];
}

interface SemanticPhaseProps {
  result: SemanticResult;
}

export default function SemanticPhase({ result }: SemanticPhaseProps) {
  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-3 h-3 rounded-full bg-phase-semantic" />
        <h3 className="text-lg font-semibold text-foreground">Phase 3: Semantic Analysis</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Using Syntax-Directed Translation (SDT), the parse tree is checked for semantic correctness: type checking, undeclared variables, and more.
      </p>

      {/* Overall result */}
      <div className={`rounded-md p-3 mb-4 text-sm ${result.success ? 'bg-accent/10 text-accent' : 'bg-destructive/10 text-destructive'}`}>
        {result.success
          ? '✅ All semantic checks passed — the code is semantically correct.'
          : '❌ Semantic errors found — see details below.'}
      </div>

      {/* Checks */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-foreground mb-2">SDT Checks</h4>
        <div className="space-y-2">
          {result.checks.map((check, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 rounded-md px-4 py-2 ${
                check.pass ? 'bg-accent/5' : 'bg-destructive/5'
              }`}
            >
              <span className="mt-0.5">{check.pass ? '✅' : '❌'}</span>
              <div>
                <div className="text-sm font-medium text-foreground">{check.check}</div>
                <div className="text-xs text-muted-foreground">
                  {check.message} <span className="opacity-60">(line {check.line})</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Symbol Table */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-2">Symbol Table</h4>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-3 text-muted-foreground font-medium">Name</th>
              <th className="text-left py-2 px-3 text-muted-foreground font-medium">Type</th>
              <th className="text-left py-2 px-3 text-muted-foreground font-medium">Initialized</th>
            </tr>
          </thead>
          <tbody>
            {result.symbolTable.map((sym, i) => (
              <tr key={i} className="border-b border-border/50">
                <td className="py-2 px-3 font-mono text-foreground">{sym.name}</td>
                <td className="py-2 px-3">
                  <span className="font-mono text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded">
                    {sym.type}
                  </span>
                </td>
                <td className="py-2 px-3 text-muted-foreground">{sym.initialized ? '✅ Yes' : '❌ No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
