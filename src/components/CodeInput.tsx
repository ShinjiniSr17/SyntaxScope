import { useState } from 'react';

interface CodeInputProps {
  onAnalyze: (code: string) => void;
  isLoading: boolean;
}

// Updated placeholder code to reflect proper and strict standard C syntax rules
const EXAMPLE_CODE = `#include <stdio.h>

int main() {
    int x = 5 + 3 * 2;
    float y = x + 1.5;
    return 0;
}`;

export default function CodeInput({ onAnalyze, isLoading }: CodeInputProps) {
  const [code, setCode] = useState(EXAMPLE_CODE);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleRunAnalysis = () => {
  const trimmedCode = code.trim();

  // 1. Strict validation checks
  const hasStdio = /^\s*#\s*include\s*<\s*stdio\.h\s*>/.test(trimmedCode);
  if (!hasStdio) {
    setValidationError("Compilation Error: Standard C programs must begin with '#include <stdio.h>'");
    return;
  }

  const hasMain = /main\s*\([^)]*\)\s*\{/.test(trimmedCode);
  if (!hasMain) {
    setValidationError("Compilation Error: Target program requires an explicit 'main()' entry block context.");
    return;
  }

  setValidationError(null);

  // 2. EXTRACT CORE INNER STATEMENTS
  // This regex grabs everything inside the main function's curly braces {}
  const mainBodyMatch = /main\s*\([^)]*\)\s*\{([\s\S]*)\}/.exec(trimmedCode);
  
  if (mainBodyMatch && mainBodyMatch[1]) {
    let cleanBody = mainBodyMatch[1].trim();
    
    // Remove the 'return 0;' statement if present so it doesn't trip up the assignment parser
    cleanBody = cleanBody.replace(/return\s+\d+\s*;/g, '').trim();

    // Pass ONLY the inner arithmetic/assignment expressions to the compiler phases
    onAnalyze(cleanBody);
  } else {
    // Fallback if regex parsing fails
    onAnalyze(code);
  }
};

  const handleReset = () => {
    setCode(EXAMPLE_CODE);
    setValidationError(null);
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Source Code Input</h2>
        <button
          onClick={handleReset}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Reset Example
        </button>
      </div>
      
      <textarea
        value={code}
        onChange={(e) => {
          setCode(e.target.value);
          if (validationError) setValidationError(null); // Clear errors dynamically on type
        }}
        className="w-full h-48 bg-code-bg text-code-fg font-mono text-sm p-4 rounded-md border border-input resize-none focus:outline-none focus:ring-2 focus:ring-primary"
        placeholder="Enter your standard C code here..."
        spellCheck={false}
      />

      {/* Render validation error alert message box if any checks trigger failures */}
      {validationError && (
        <div className="mt-3 p-3 text-sm rounded-md bg-destructive/15 text-destructive border border-destructive/20 font-medium font-sans">
          {validationError}
        </div>
      )}

      <button
        onClick={handleRunAnalysis}
        disabled={isLoading || !code.trim()}
        className="mt-4 w-full bg-primary text-primary-foreground font-medium py-2.5 px-4 rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {isLoading ? 'Analyzing...' : 'Run Compiler Phases'}
      </button>
    </div>
  );
}