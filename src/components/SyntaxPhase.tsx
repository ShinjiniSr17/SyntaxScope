interface GrammarRule {
  name: string;
  leftRecursive: boolean;
  rightRecursive: boolean;
}

interface SyntaxResult {
  success: boolean;
  error: string;
  parseTree: string;
  grammar: {
    rules: GrammarRule[];
    isAmbiguous: boolean;
    ambiguityReason: string;
    hasLeftRecursion: boolean;
    leftRecursionDetail: string;
    hasRightRecursion: boolean;
  };
}

interface SyntaxPhaseProps {
  result: SyntaxResult;
}

export default function SyntaxPhase({ result }: SyntaxPhaseProps) {
  const { grammar } = result;
  // Parse tree has escaped newlines from C
  const treeLines = result.parseTree.split('\\n').filter(l => l.trim());

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-3 h-3 rounded-full bg-phase-parser" />
        <h3 className="text-lg font-semibold text-foreground">Phase 2: Syntax Analysis</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Tokens are organized into a parse tree. Grammar properties are analyzed for recursion and ambiguity.
      </p>

      {!result.success && (
        <div className="bg-destructive/10 text-destructive rounded-md p-3 mb-4 text-sm">
          <strong>Parse Error:</strong> {result.error}
        </div>
      )}

      {/* Parse Tree */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-foreground mb-2">Parse Tree</h4>
        <pre className="bg-code-bg text-code-fg font-mono text-xs p-4 rounded-md overflow-x-auto max-h-64 overflow-y-auto">
          {treeLines.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </pre>
      </div>

      {/* Grammar Rules */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-foreground mb-2">Grammar Rules</h4>
        <div className="space-y-2">
          {grammar.rules.map((rule, i) => (
            <div key={i} className="flex items-center justify-between bg-muted/50 rounded-md px-4 py-2">
              <span className="font-mono text-sm text-foreground">{rule.name}</span>
              <div className="flex gap-2">
                {rule.leftRecursive && (
                  <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded font-medium">
                    Left Recursive
                  </span>
                )}
                {rule.rightRecursive && (
                  <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded font-medium">
                    Right Recursive
                  </span>
                )}
                {!rule.leftRecursive && !rule.rightRecursive && (
                  <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded font-medium">
                    Non-Recursive
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grammar Properties */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-muted/50 rounded-md p-3 text-center">
          <div className="text-sm font-medium text-foreground">
            {grammar.hasLeftRecursion ? '⚠️ Left Recursive' : '✅ No Left Recursion'}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{grammar.leftRecursionDetail}</p>
        </div>
        <div className="bg-muted/50 rounded-md p-3 text-center">
          <div className="text-sm font-medium text-foreground">
            {grammar.hasRightRecursion ? '⚠️ Right Recursive' : '✅ No Right Recursion'}
          </div>
        </div>
        <div className="bg-muted/50 rounded-md p-3 text-center">
          <div className="text-sm font-medium text-foreground">
            {grammar.isAmbiguous ? '⚠️ Ambiguous' : '✅ Unambiguous'}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{grammar.ambiguityReason}</p>
        </div>
      </div>
    </div>
  );
}
