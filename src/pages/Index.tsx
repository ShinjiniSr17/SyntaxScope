import { useState, useEffect } from 'react';
import CodeInput from '@/components/CodeInput';
import LexicalPhase from '@/components/LexicalPhase';
import SyntaxPhase from '@/components/SyntaxPhase';
import SemanticPhase from '@/components/SemanticPhase';
import IntermediateCodePhase from '@/components/IntermediateCodePhase';
import OptimizationPhase from '@/components/OptimizationPhase';
import { initCompiler, lexicalAnalysis, syntaxAnalysis, semanticAnalysis } from '@/lib/compilerWrapper';
import { generateTAC, optimize, type TacInstruction, type OptimizationStep } from '@/lib/icgOptimizer';

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [tokens, setTokens] = useState<any[] | null>(null);
  const [syntaxResult, setSyntaxResult] = useState<any | null>(null);
  const [semanticResult, setSemanticResult] = useState<any | null>(null);
  const [tac, setTac] = useState<{ instructions: TacInstruction[]; error?: string } | null>(null);
  const [optimization, setOptimization] = useState<{ optimized: TacInstruction[]; steps: OptimizationStep[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initCompiler().then(() => setIsReady(true)).catch(e => setError('Failed to load WASM compiler: ' + e.message));
  }, []);

  const handleAnalyze = (code: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const t = lexicalAnalysis(code);
      setTokens(t);
      const s = syntaxAnalysis(code);
      setSyntaxResult(s);
      const sem = semanticAnalysis(code);
      setSemanticResult(sem);

      // Phase 4 — Intermediate Code Generation (TAC)
      const icg = generateTAC(t);
      setTac(icg);

      // Phase 5 — Code Optimization (only if semantic phase passed and we have TAC)
      if (sem?.success && icg.instructions.length > 0) {
        setOptimization(optimize(icg.instructions));
      } else {
        setOptimization(null);
      }
    } catch (e: any) {
      setError(e.message);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-foreground">Compiler Design — Phase Visualizer</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Lexical Analysis → Syntax Analysis → Semantic Analysis
            <span className="ml-2 text-xs opacity-60">(Backend: C/C++ compiled to WebAssembly)</span>
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {!isReady && !error && (
          <div className="text-center py-12 text-muted-foreground">Loading WASM compiler...</div>
        )}

        {error && (
          <div className="bg-destructive/10 text-destructive rounded-md p-4 text-sm">{error}</div>
        )}

        {isReady && <CodeInput onAnalyze={handleAnalyze} isLoading={isLoading} />}

        {/* Phase flow arrows */}
        {tokens && (
          <div className="flex flex-wrap items-center justify-center gap-3 text-muted-foreground text-sm">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-phase-lexer" /> Lexer</span>
            <span>→</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-phase-parser" /> Parser</span>
            <span>→</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-phase-semantic" /> Semantic</span>
            <span>→</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-phase-icg" /> ICG (TAC)</span>
            <span>→</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-phase-optimizer" /> Optimizer</span>
          </div>
        )}

        {tokens && <LexicalPhase tokens={tokens} />}
        {syntaxResult && <SyntaxPhase result={syntaxResult} />}
        {semanticResult && <SemanticPhase result={semanticResult} />}
        {tac && <IntermediateCodePhase instructions={tac.instructions} error={tac.error} />}
        {optimization && tac && (
          <OptimizationPhase
            original={tac.instructions}
            optimized={optimization.optimized}
            steps={optimization.steps}
          />
        )}
      </main>

      <footer className="border-t border-border bg-card mt-12">
        <div className="max-w-5xl mx-auto px-4 py-4 text-center text-xs text-muted-foreground">
          Compiler Design Project — C/C++ Backend compiled to WebAssembly via Emscripten
        </div>
      </footer>
    </div>
  );
};

export default Index;
