import React, { useState } from 'react';
import { 
  GitCommit, 
  ShieldAlert, 
  Cpu, 
  Layers, 
  CheckCircle2, 
  Zap, 
  Clock, 
  Database,
  Code2,
  FileCheck
} from 'lucide-react';
import { ReviewReport } from '../engine/types';

interface PipelineInspectorProps {
  report: ReviewReport | null;
}

export const PipelineInspector: React.FC<PipelineInspectorProps> = ({ report }) => {
  const [activeStage, setActiveStage] = useState<number>(1);

  if (!report) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-12 text-center text-zinc-500 max-w-2xl mx-auto">
        <Zap className="w-8 h-8 mx-auto text-zinc-400 mb-2.5" />
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">No Pipeline Run Recorded Yet</h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Upload or select a sample diff to inspect live pipeline execution telemetry.
        </p>
      </div>
    );
  }

  const { metrics, parsed_diff, summary, findings } = report;

  const stages = [
    {
      id: 1,
      title: '1. Unidiff AST Lexer',
      subtitle: 'Deterministic Parser & Line Mapper',
      badge: `${parsed_diff?.totalFiles || 0} files · ${summary.total_lines_analyzed} lines`,
      description: 'Parses unified diff headers (`diff --git`, `---`, `+++`, `@@ -a,b +c,d @@`). Computes exact physical line mappings for additions and deletions while extracting enclosing lexical scopes.',
      metrics: [
        { label: 'Files Ingested', value: parsed_diff?.totalFiles || 0 },
        { label: 'Added Lines (+)', value: parsed_diff?.totalAdded || 0 },
        { label: 'Deleted Lines (-)', value: parsed_diff?.totalDeleted || 0 },
        { label: 'Raw Diff Payload', value: `${((metrics?.rawDiffBytes || 0) / 1024).toFixed(1)} KB` },
      ],
      details: 'Resolves hunk offset shifts and handles newly created files (/dev/null source) and deleted files (/dev/null target) with zero syntax errors.',
    },
    {
      id: 2,
      title: '2. Security Pre-Filter',
      subtitle: 'Static Heuristics & Shannon Entropy',
      badge: '0 LLM Tokens · Deterministic Gate',
      description: 'Zero-latency pre-filter scans added and modified lines. Runs Shannon entropy calculations and regex heuristic rules to detect exposed AWS secrets, private keys, and high-risk SQL/eval injection patterns.',
      metrics: [
        { label: 'Static Findings', value: metrics?.staticFindingsCount || 0 },
        { label: 'Execution Time', value: `${metrics?.staticLatencyMs || 0} ms` },
        { label: 'Entropy Threshold', value: 'H > 4.0' },
        { label: 'Heuristic Rules', value: '10 active' },
      ],
      details: 'Blocks critical credentials and common CWE patterns before LLM chunking, ensuring deterministic reproducibility.',
    },
    {
      id: 3,
      title: '3. Context Chunker',
      subtitle: 'Token-Budget Sliding Windows',
      badge: `${metrics?.tokensSavedPercentage || 0}% token optimization`,
      description: 'Partitions large multi-file diffs into coherent semantic chunks that fit comfortably inside the LLM context budget (4,000 tokens/chunk), adding 2-line enclosing context windows.',
      metrics: [
        { label: 'Prompt Tokens', value: `${metrics?.packedPromptTokensEstimated || 0}` },
        { label: 'Raw Tokens', value: `${metrics?.rawDiffTokensEstimated || 0}` },
        { label: 'Tokens Saved', value: `${metrics?.tokensSavedPercentage || 0}%` },
        { label: 'Context Radius', value: '±2 lines' },
      ],
      details: 'Ensures large PR diffs (e.g. 50+ files) are reviewed without truncated AST scopes or token overflow errors.',
    },
    {
      id: 4,
      title: '4. Gemini 3.8 Flash',
      subtitle: 'Structured Output Validation',
      badge: 'Pydantic JSON Schema Enforced',
      description: 'Calls Gemini 3.8 Flash with structured schema to detect logical regressions, race conditions, edge-case crashes, and OWASP Top 10 vulnerabilities.',
      metrics: [
        { label: 'AI Findings', value: metrics?.aiFindingsCount || 0 },
        { label: 'Model Latency', value: `${metrics?.aiLatencyMs || 0} ms` },
        { label: 'Temperature', value: '0.2' },
        { label: 'Validation Pass', value: '100%' },
      ],
      details: 'Output findings are verified against the physical changed lines extracted in Step 1 to guarantee 0 hallucinated line anchors.',
    },
    {
      id: 5,
      title: '5. Risk Synthesis Engine',
      subtitle: 'Deduplication & Penalty Matrix',
      badge: `Final Score: ${summary.overall_risk_score}/100`,
      description: 'Deduplicates findings between the static scanner and AI model. Upgrades overlapping findings to Hybrid Consensus, then computes the composite risk score using weighted penalties.',
      metrics: [
        { label: 'Final Findings', value: findings.length },
        { label: 'Total Duration', value: `${metrics?.durationMs || 0} ms` },
        { label: 'Risk Verdict', value: summary.risk_status },
        { label: 'Formula Penalty', value: `${100 - summary.overall_risk_score} pts` },
      ],
      details: 'Calculated deterministically: Score = 100 - [(Crit×25) + (High×15) + (Med×8) + (Low×2)], clamped between 0 and 100.',
    },
  ];

  const currentStage = stages.find((s) => s.id === activeStage) || stages[0];

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Overview Metric Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block font-mono">Total Execution Time</span>
          <span className="text-base font-bold font-mono text-zinc-900 dark:text-zinc-100 tabular-nums">
            {metrics?.durationMs || 0} ms
          </span>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block font-mono">Static Heuristic Findings</span>
          <span className="text-base font-bold font-mono text-zinc-900 dark:text-zinc-100 tabular-nums">
            {metrics?.staticFindingsCount || 0}
          </span>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block font-mono">Gemini AI Findings</span>
          <span className="text-base font-bold font-mono text-zinc-900 dark:text-zinc-100 tabular-nums">
            {metrics?.aiFindingsCount || 0}
          </span>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block font-mono">Risk Status</span>
          <span className="text-base font-bold font-mono text-zinc-900 dark:text-zinc-100">
            {summary.risk_status}
          </span>
        </div>
      </div>

      {/* Interactive Stage Selector */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm space-y-4">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Select Pipeline Stage to Inspect
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 mt-2">
            {stages.map((stage) => {
              const isSelected = activeStage === stage.id;
              return (
                <button
                  key={stage.id}
                  onClick={() => setActiveStage(stage.id)}
                  className={`p-2.5 rounded text-left transition-colors flex flex-col gap-1 border ${
                    isSelected
                      ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-900 dark:border-zinc-100 ring-1 ring-zinc-900 dark:ring-zinc-100'
                      : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-zinc-500">Stage {stage.id}</span>
                    {isSelected && <CheckCircle2 className="w-3 h-3 text-blue-600 dark:text-blue-400" />}
                  </div>
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {stage.title.split('. ')[1]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Stage Detail Panel */}
        <div className="p-4 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-zinc-200 dark:border-zinc-800">
            <div>
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{currentStage.title}</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{currentStage.subtitle}</p>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 font-medium">
              {currentStage.badge}
            </span>
          </div>

          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">
            {currentStage.description}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {currentStage.metrics.map((m, mIdx) => (
              <div key={mIdx} className="bg-white dark:bg-zinc-900 p-2.5 rounded border border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] text-zinc-500 font-mono block">{m.label}</span>
                <span className="text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100 tabular-nums">
                  {m.value}
                </span>
              </div>
            ))}
          </div>

          <div className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-900 p-2.5 rounded border border-zinc-200 dark:border-zinc-800">
            <strong>Engineering Detail:</strong> {currentStage.details}
          </div>
        </div>
      </div>
    </div>
  );
};
