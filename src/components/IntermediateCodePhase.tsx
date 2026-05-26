import type { TacInstruction } from '@/lib/icgOptimizer';

interface Props {
  instructions: TacInstruction[];
  error?: string;
}

export default function IntermediateCodePhase({ instructions, error }: Props) {
  // Check if a structural validation error cascaded from the wrapper or WebAssembly layer
  const isStrictError = error?.includes("Strict Error") || error?.includes("Compilation Error");

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-3 h-3 rounded-full bg-phase-icg" />
        <h3 className="text-lg font-semibold text-foreground">Phase 4: Intermediate Code Generation</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        The semantically valid program is translated into <span className="font-medium text-foreground">Three-Address Code (TAC)</span>:
        each instruction has at most one operator and three operands, using temporaries (t1, t2, …) for sub-expressions.
      </p>

      {error && (
        <div className="bg-destructive/10 text-destructive rounded-md p-3 mb-4 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Enhanced conditional check to halt phase rendering on standard C structural failures */}
      {isStrictError ? (
        <div className="text-sm text-muted-foreground italic bg-muted/40 border border-dashed rounded-md p-4 text-center">
          Intermediate Code Generation was skipped because the program structure is missing its proper C environment wrappers.
        </div>
      ) : instructions.length === 0 && !error ? (
        <div className="text-sm text-muted-foreground italic">
          No three-address instructions were generated for this input.
        </div>
      ) : (
        !error && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium w-12">#</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Instruction</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Op</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Arg1</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Arg2</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Result</th>
                </tr>
              </thead>
              <tbody>
                {instructions.map((ins, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                    <td className="py-2 px-3 text-muted-foreground">{i + 1}</td>
                    <td className="py-2 px-3 font-mono text-foreground">{ins.raw}</td>
                    <td className="py-2 px-3">
                      <span className="font-mono text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded">
                        {ins.op}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono text-foreground">{ins.arg1}</td>
                    <td className="py-2 px-3 font-mono text-foreground">{ins.arg2 || '—'}</td>
                    <td className="py-2 px-3 font-mono text-foreground">{ins.result}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}