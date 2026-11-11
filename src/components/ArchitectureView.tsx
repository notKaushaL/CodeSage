import React from 'react';
import { 
  GitBranch, 
  Layers, 
  ShieldCheck, 
  Cpu, 
  Terminal, 
  CheckCircle2, 
  Zap, 
  Box,
  Binary,
  ArrowRight
} from 'lucide-react';

export const ArchitectureView: React.FC = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Hero Card */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
        <div className="space-y-2 max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
              System Architecture & Core Pipeline
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Hybrid Deterministic + Gemini 3.8 Flash Engine
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">
            Engineered to address core distributed systems and AI engineering challenges: context window management, token-cost optimization, hybrid deterministic + probabilistic analysis, and zero-hallucination line mapping.
          </p>
        </div>
      </div>

      {/* Interactive System Pipeline Flow Diagram */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-zinc-500" />
          <span>Pipeline Ingestion & Analysis Flow</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Step 1 */}
          <div className="bg-zinc-50 dark:bg-zinc-950 p-3.5 rounded border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between space-y-2.5">
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 uppercase">
                Step 01
              </span>
              <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Unidiff Lexer</h4>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Splits raw unified patches into Files, Hunks, and Line types (ADDED, DELETED, CONTEXT). Maps offsets to physical line numbers.
              </p>
            </div>
            <div className="text-[10px] font-mono text-zinc-500 bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded border border-zinc-200 dark:border-zinc-800">
              @@ -a,b +c,d @@ mapping
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-zinc-50 dark:bg-zinc-950 p-3.5 rounded border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between space-y-2.5">
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                Step 02
              </span>
              <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Security Pre-Filter</h4>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Zero LLM Tokens. Shannon entropy scanner catches AWS keys, JWT tokens, and private keys. Flags SQL injection & eval() sinks.
              </p>
            </div>
            <div className="text-[10px] font-mono text-zinc-500 bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded border border-zinc-200 dark:border-zinc-800">
              Entropy &gt; 4.0 + Regex sinks
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-zinc-50 dark:bg-zinc-950 p-3.5 rounded border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between space-y-2.5">
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 uppercase">
                Step 03
              </span>
              <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Smart Chunker</h4>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Dynamically groups hunks within 4,000 token limits with 2-line sliding context windows to preserve enclosing functions.
              </p>
            </div>
            <div className="text-[10px] font-mono text-zinc-500 bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded border border-zinc-200 dark:border-zinc-800">
              Token budget packing
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-zinc-50 dark:bg-zinc-950 p-3.5 rounded border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between space-y-2.5">
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold text-purple-600 dark:text-purple-400 uppercase">
                Step 04
              </span>
              <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Gemini 3.8 Flash</h4>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Analyzes concurrency, subtle logic regressions, and algorithmic antipatterns. Emits structured JSON findings with suggested fixes.
              </p>
            </div>
            <div className="text-[10px] font-mono text-zinc-500 bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded border border-zinc-200 dark:border-zinc-800">
              JSON schema validation
            </div>
          </div>

          {/* Step 5 */}
          <div className="bg-zinc-50 dark:bg-zinc-950 p-3.5 rounded border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between space-y-2.5">
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold text-red-600 dark:text-red-400 uppercase">
                Step 05
              </span>
              <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Deduplication & Risk</h4>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Consolidates overlapping findings across layers, upgrades confidence to Hybrid Consensus, and calculates composite 0-100 risk score.
              </p>
            </div>
            <div className="text-[10px] font-mono text-zinc-500 bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded border border-zinc-200 dark:border-zinc-800">
              Score = 100 - [Penalties]
            </div>
          </div>
        </div>
      </div>

      {/* Engineering Design Decisions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Why a Hybrid Architecture?</h4>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Pure LLM-based diff reviewers hallucinate line numbers, miss obvious API keys obscured by whitespace, and cost 10x-50x more in tokens. Pure static scanners miss multi-file business logic flaws and race conditions. Combining deterministic scanning with Gemini 3.8 Flash delivers precision with high semantic reasoning.
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Physical Line-Number Anchoring</h4>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Diff hunks offset original line numbers by additions and deletions. The custom unidiff lexer computes two independent monotonic counters (<code className="font-mono text-[11px]">oldLine</code> and <code className="font-mono text-[11px]">newLine</code>) for every hunk, guaranteeing that findings anchor directly to the exact target line in the editor.
          </p>
        </div>
      </div>
    </div>
  );
};
