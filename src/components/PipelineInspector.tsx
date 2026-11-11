import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Zap
} from 'lucide-react';
import { ReviewReport } from '../engine/types';

interface PipelineInspectorProps {
  report: ReviewReport | null;
}

export const PipelineInspector: React.FC<PipelineInspectorProps> = ({ report }) => {
  const [activeStage, setActiveStage] = useState<number>(1);

  if (!report) {
    return (
      <div className="bg-white dark:bg-[#161b22] rounded-lg border border-[#e4e4e7] dark:border-[#30363d] p-12 text-center text-[#71717a] dark:text-[#8b949e] max-w-2xl mx-auto">
        <Zap className="w-8 h-8 mx-auto text-[#a1a1aa] dark:text-[#6e7681] mb-2.5" />
        <h3 className="text-sm font-semibold text-[#171717] dark:text-[#e6edf3]">No Review Run Selected</h3>
        <p className="text-xs text-[#52525b] dark:text-[#8b949e] mt-1">
          Submit a diff or open a sample review to inspect pipeline metrics.
        </p>
      </div>
    );
  }

  const { metrics, parsed_diff, summary, findings } = report;

  const stages = [
    {
      id: 1,
      title: '01. Diff Parser & Line Mapper',
      subtitle: 'Accurate Old/New Physical Line Tracking',
      summaryText: `${parsed_diff?.totalFiles || 0} files · ${summary.total_lines_analyzed} lines`,
      description: 'Parses unified Git diffs into structured files, hunks, and added/deleted/context lines. Computes exact line numbers so every issue anchors to the right line of code.',
      metrics: [
        { label: 'Files Parsed', value: parsed_diff?.totalFiles || 0 },
        { label: 'Lines Added (+)', value: parsed_diff?.totalAdded || 0 },
        { label: 'Lines Deleted (-)', value: parsed_diff?.totalDeleted || 0 },
        { label: 'Diff Size', value: `${((metrics?.rawDiffBytes || 0) / 1024).toFixed(1)} KB` },
      ],
      details: 'Handles multi-hunk files, renamed files, and newly created or deleted files without line drift.',
    },
    {
      id: 2,
      title: '02. Static Security Scanner',
      subtitle: 'Instant Heuristic Rules & Secret Entropy Check',
      summaryText: '0 AI Tokens · Instant Check',
      description: 'Scans added lines in milliseconds using Shannon entropy and 10 security rules to catch hardcoded AWS keys, private keys, JWT tokens, SQL injection, and command execution risks.',
      metrics: [
        { label: 'Static Issues Found', value: metrics?.staticFindingsCount || 0 },
        { label: 'Scan Duration', value: `${metrics?.staticLatencyMs || 0} ms` },
        { label: 'Entropy Threshold', value: '4.0 bits' },
        { label: 'Active Rules', value: '10 rules' },
      ],
      details: 'Runs deterministically on the server even when no Gemini API key is configured.',
    },
    {
      id: 3,
      title: '03. Smart Context Chunker',
      subtitle: 'Token-Optimized Window Packing',
      summaryText: `${metrics?.tokensSavedPercentage || 0}% tokens saved`,
      description: 'Groups modified lines with surrounding context lines while collapsing unchanged boilerplate so large diffs stay fast and focused.',
      metrics: [
        { label: 'Packed Tokens', value: `${metrics?.packedPromptTokensEstimated || 0}` },
        { label: 'Raw Tokens', value: `${metrics?.rawDiffTokensEstimated || 0}` },
        { label: 'Tokens Saved', value: `${metrics?.tokensSavedPercentage || 0}%` },
        { label: 'Context Window', value: '±5 lines' },
      ],
      details: 'Preserves enclosing function signatures so AI analysis understands the surrounding scope.',
    },
    {
      id: 4,
      title: '04. Gemini 3.8 Flash Reasoning',
      subtitle: 'Deep Logic & Concurrency Review',
      summaryText: 'Structured JSON Output',
      description: 'Evaluates code changes for subtle logic bugs, race conditions, missing error handling, and security flaws that static regex rules cannot catch.',
      metrics: [
        { label: 'AI Issues Found', value: metrics?.aiFindingsCount || 0 },
        { label: 'AI Latency', value: `${metrics?.aiLatencyMs || 0} ms` },
        { label: 'Model', value: 'gemini-3.8-flash' },
        { label: 'Fallback Mode', value: 'Graceful' },
      ],
      details: 'All AI findings are verified against actual diff line numbers to prevent hallucinated locations.',
    },
    {
      id: 5,
      title: '05. Deduplication & Health Score',
      subtitle: 'Final Report Synthesis',
      summaryText: `Score: ${summary.overall_risk_score}/100`,
      description: 'Merges overlapping findings between the static scanner and Gemini AI, then computes the overall 0–100 health score based on issue severity.',
      metrics: [
        { label: 'Total Issues', value: findings.length },
        { label: 'Total Time', value: `${metrics?.durationMs || 0} ms` },
        { label: 'Health Score', value: `${summary.overall_risk_score}/100` },
        { label: 'Score Deduction', value: `-${100 - summary.overall_risk_score} pts` },
      ],
      details: 'Formula: 100 - (Critical × 25 + High × 15 + Medium × 8 + Low × 2), bounded between 0 and 100.',
    },
  ];

  const currentStage = stages.find((s) => s.id === activeStage) || stages[0];

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Top Metric Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#161b22] p-4 rounded-lg border border-[#e4e4e7] dark:border-[#30363d]">
          <span className="text-xs text-[#52525b] dark:text-[#8b949e] block">Total Analysis Time</span>
          <span className="text-lg font-bold font-mono text-[#171717] dark:text-[#e6edf3] tabular-nums mt-1 block">
            {metrics?.durationMs || 0} ms
          </span>
        </div>

        <div className="bg-white dark:bg-[#161b22] p-4 rounded-lg border border-[#e4e4e7] dark:border-[#30363d]">
          <span className="text-xs text-[#52525b] dark:text-[#8b949e] block">Static Scanner Issues</span>
          <span className="text-lg font-bold font-mono text-[#171717] dark:text-[#e6edf3] tabular-nums mt-1 block">
            {metrics?.staticFindingsCount || 0}
          </span>
        </div>

        <div className="bg-white dark:bg-[#161b22] p-4 rounded-lg border border-[#e4e4e7] dark:border-[#30363d]">
          <span className="text-xs text-[#52525b] dark:text-[#8b949e] block">Gemini AI Issues</span>
          <span className="text-lg font-bold font-mono text-[#171717] dark:text-[#e6edf3] tabular-nums mt-1 block">
            {metrics?.aiFindingsCount || 0}
          </span>
        </div>

        <div className="bg-white dark:bg-[#161b22] p-4 rounded-lg border border-[#e4e4e7] dark:border-[#30363d]">
          <span className="text-xs text-[#52525b] dark:text-[#8b949e] block">Health Score</span>
          <span className="text-lg font-bold font-mono text-[#171717] dark:text-[#e6edf3] tabular-nums mt-1 block">
            {summary.overall_risk_score} / 100
          </span>
        </div>
      </div>

      {/* Interactive 5-Stage Inspector */}
      <div className="bg-white dark:bg-[#161b22] rounded-lg border border-[#e4e4e7] dark:border-[#30363d] p-5 space-y-5">
        <div>
          <h2 className="text-sm font-semibold text-[#171717] dark:text-[#e6edf3]">
            5-Stage Review Pipeline Breakdown
          </h2>
          <p className="text-xs text-[#52525b] dark:text-[#8b949e] mt-0.5">
            Click any stage below to see how your diff was processed
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 mt-3">
            {stages.map((stage) => {
              const isSelected = activeStage === stage.id;
              return (
                <button
                  key={stage.id}
                  onClick={() => setActiveStage(stage.id)}
                  className={`p-3 rounded-md text-left transition-colors flex flex-col gap-1 border ${
                    isSelected
                      ? 'bg-[#f4f4f5] dark:bg-[#21262d] border-[#0969da] dark:border-[#2f81f7]'
                      : 'bg-[#fafafa] dark:bg-[#0d1117] border-[#e4e4e7] dark:border-[#30363d] hover:border-[#a1a1aa] dark:hover:border-[#484f58]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-semibold text-[#71717a] dark:text-[#8b949e]">
                      Step 0{stage.id}
                    </span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#0969da] dark:text-[#58a6ff]" />}
                  </div>
                  <span className="text-xs font-semibold text-[#171717] dark:text-[#e6edf3] truncate">
                    {stage.title.split('. ')[1]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Stage Detail View */}
        <div className="p-4 rounded-md border border-[#e4e4e7] dark:border-[#30363d] bg-[#fafafa] dark:bg-[#0d1117] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#e4e4e7] dark:border-[#30363d]">
            <div>
              <h3 className="text-sm font-semibold text-[#171717] dark:text-[#e6edf3]">{currentStage.title}</h3>
              <p className="text-xs text-[#52525b] dark:text-[#8b949e]">{currentStage.subtitle}</p>
            </div>
            <span className="text-xs font-mono text-[#52525b] dark:text-[#8b949e]">
              {currentStage.summaryText}
            </span>
          </div>

          <p className="text-xs text-[#171717] dark:text-[#e6edf3] leading-relaxed">
            {currentStage.description}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {currentStage.metrics.map((m, mIdx) => (
              <div key={mIdx} className="bg-white dark:bg-[#161b22] p-3 rounded-md border border-[#e4e4e7] dark:border-[#30363d]">
                <span className="text-[11px] text-[#71717a] dark:text-[#8b949e] block">{m.label}</span>
                <span className="text-xs font-bold font-mono text-[#171717] dark:text-[#e6edf3] tabular-nums mt-0.5 block">
                  {m.value}
                </span>
              </div>
            ))}
          </div>

          <div className="text-xs text-[#52525b] dark:text-[#8b949e] pt-1">
            <strong className="text-[#171717] dark:text-[#e6edf3]">How it works:</strong> {currentStage.details}
          </div>
        </div>
      </div>
    </div>
  );
};
