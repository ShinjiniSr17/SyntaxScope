import type { TacInstruction, OptimizationStep } from '@/lib/icgOptimizer';

interface Props {
  original: TacInstruction[];
  optimized: TacInstruction[];
  steps: OptimizationStep[];
  isParentError?: boolean; // New prop flag to safely identify if previous compiler phases failed structural validation
}

const TYPE_LABEL: Record<OptimizationStep['type'], string> = {
  'constant-folding': 'Constant Folding',
  'algebraic-simplification': 'Algebraic Simplification',
  'dead-code-elimination': 'Dead Code Elimination',
  'copy-propagation': 'Copy Propagation',
};

export default function OptimizationPhase({ original, optimized, steps, isParentError = false }: Props) {
  const removed = original.length - optimized.length;

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-3 h-3 rounded-full bg-phase-optimizer" />
        <h3 className="text-lg font-semibold text-foreground">Phase 5: Code Optimization</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        The intermediate code is rewritten using <span className="font-medium text-foreground">constant folding</span>,{' '}
        <span className="font-medium text-foreground">algebraic simplification</span>,{' '}
        <span className="font-medium text-foreground">copy propagation</span>, and{' '}
        <span className="font-medium text-foreground">dead-code elimination</span> — without changing the program's output.
      </p>

      {isParentError ? (
        /* Global Fallback rendering when strict C layout requirements are missing */
        <div className="text-sm text-muted-foreground italic bg-muted/40 border border-dashed rounded-md p-4 text-center">
          Code Optimization phase was skipped because the original program failed basic C structure validations.
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-muted/50 rounded-md p-3">
              <div className="text-xs text-muted-foreground">Original instructions</div>
              <div className="text-xl font-semibold text-foreground">{original.length}</div>
            </div>
            <div className="bg-muted/50 rounded-md p-3">
              <div className="text-xs text-muted-foreground">Optimized instructions</div>
              <div className="text-xl font-semibold text-foreground">{optimized.length}</div>
            </div>
            <div className="bg-accent/10 rounded-md p-3">
              <div className="text-xs text-muted-foreground">Removed / simplified</div>
              <div className="text-xl font-semibold text-accent">{Math.max(removed, 0)} • {steps.length} steps</div>
            </div>
          </div>

          {/* Side-by-side */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">Before</h4>
              <pre className="bg-code-bg text-code-fg rounded-md p-3 text-xs font-mono overflow-x-auto leading-relaxed">
    {original.length ? original.map((i, n) => `${n + 1}: ${i.raw}`).join('\n') : '— empty —'}
              </pre>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">After</h4>
              <pre className="bg-code-bg text-code-fg rounded-md p-3 text-xs font-mono overflow-x-auto leading-relaxed">
    {optimized.length ? optimized.map((i, n) => `${n + 1}: ${i.raw}`).join('\n') : '— empty —'}
              </pre>
            </div>
          </div>

          {/* Steps */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">Optimization Steps</h4>
            {steps.length === 0 ? (
              <div className="text-sm text-muted-foreground italic">
                No optimizations were applied — the intermediate code is already optimal for these techniques.
              </div>
            ) : (
              <div className="space-y-2">
                {steps.map((s, i) => (
                  <div key={i} className="rounded-md bg-muted/40 px-4 py-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs bg-phase-optimizer/20 text-foreground px-2 py-0.5 rounded">
                        {TYPE_LABEL[s.type]}
                      </span>
                      <span className="text-xs text-muted-foreground">{s.reason}</span>
                    </div>
                    <div className="font-mono text-xs">
                      <span className="text-destructive">- {s.before}</span>
                      <br />
                      <span className="text-accent">+ {s.after}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}