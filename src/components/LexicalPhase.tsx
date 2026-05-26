interface Token {
  type: string;
  value: string;
  line: number;
  col: number;
}

interface LexicalPhaseProps {
  tokens: Token[];
}

export default function LexicalPhase({ tokens }: LexicalPhaseProps) {
  // Isolate structural errors passed down from our underlying WebAssembly compiler validation
  const structErrorToken = tokens.find(t => t.type === 'ERROR' && t.value.includes('Strict Error'));
  const visibleTokens = tokens.filter(t => t.type !== 'EOF' && t.type !== 'ERROR');

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-3 h-3 rounded-full bg-phase-lexer" />
        <h3 className="text-lg font-semibold text-foreground">Phase 1: Lexical Analysis</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Characters are converted into tokens (lexemes). Each token has a type and value.
      </p>

      {structErrorToken ? (
        /* Structural validation failure banner */
        <div className="mt-2 p-4 text-sm rounded-md bg-destructive/15 text-destructive border border-destructive/20 font-medium">
          <div className="font-semibold mb-1">Lexical Analysis Interrupted</div>
          {structErrorToken.value} Please wrap your processing variables inside a legal C environment template block.
        </div>
      ) : visibleTokens.length === 0 ? (
        <div className="text-sm text-muted-foreground italic bg-muted/20 border border-dashed rounded-md p-4 text-center">
          No tokens parsed yet. Input source code to inspect lexical evaluation tables.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Token Type</th>
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Value</th>
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Line</th>
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Col</th>
              </tr>
            </thead>
            <tbody>
              {visibleTokens.map((token, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                  <td className="py-2 px-3">
                    <span className="font-mono text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded">
                      {token.type}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-mono text-foreground">{token.value}</td>
                  <td className="py-2 px-3 text-muted-foreground">{token.line}</td>
                  <td className="py-2 px-3 text-muted-foreground">{token.col}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}