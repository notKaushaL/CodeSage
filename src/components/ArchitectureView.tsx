import React from 'react';
import { 
  ShieldCheck, 
  Zap
} from 'lucide-react';

export const ArchitectureView: React.FC = () => {
  const steps = [
    {
      num: '01',
      title: 'Unified Diff Parser',
      summary: 'Splits raw git patches into files, hunks, and added/deleted/context lines while tracking exact old and new line numbers.',
      meta: 'Exact line anchoring',
    },
    {
      num: '02',
      title: 'Static Security Scanner',
      summary: 'Uses 10 deterministic security rules and Shannon entropy analysis to catch hardcoded secrets, SQL injection, and command execution.',
      meta: '0 AI tokens · < 5ms',
    },
    {
      num: '03',
      title: 'Smart Context Chunker',
      summary: 'Packs modified lines with surrounding context while collapsing unchanged boilerplate to keep token usage low.',
      meta: 'Context window packing',
    },
    {
      num: '04',
      title: 'Gemini 3.8 Flash',
      summary: 'Evaluates subtle logic flaws, race conditions, and missing error handling, returning structured findings with suggested code patches.',
      meta: '10s circuit timeout',
    },
    {
      num: '05',
      title: 'Deduplication & Scoring',
      summary: 'Combines static and AI findings, verifies line numbers against the parsed diff, and computes a 0–100 health score.',
      meta: '0–100 health score',
    },
  ];

  return (
    <div className="space-y-3 max-w-5xl mx-auto">
      {/* Header Section */}
      <div className="bg-[#f6f8fa] dark:bg-[#161b22] p-4 rounded-[6px] border border-[#d0d7de] dark:border-[#30363d] space-y-1">
        <span className="text-[11px] font-medium text-[#0969da] dark:text-[#58a6ff]">
          System Architecture & Workflow
        </span>
        <h1 className="text-base font-bold text-[#1f2328] dark:text-[#e6edf3]">
          How CodeSage Reviews Your Code
        </h1>
        <p className="text-xs text-[#656d76] dark:text-[#8b949e] leading-snug max-w-3xl">
          CodeSage combines fast, deterministic static security rules with Gemini 3.8 Flash reasoning so every review is accurate, fast, and anchored to exact line numbers in the side-by-side diff viewer.
        </p>
      </div>

      {/* 5-Step Flow Grid */}
      <div className="bg-white dark:bg-[#161b22] rounded-[6px] border border-[#d0d7de] dark:border-[#30363d] p-4 space-y-3">
        <h2 className="text-xs font-semibold text-[#1f2328] dark:text-[#e6edf3]">
          5-Stage Review Pipeline
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
          {steps.map((step) => (
            <div
              key={step.num}
              className="bg-[#f6f8fa] dark:bg-[#0d1117] p-3 rounded-[6px] border border-[#d0d7de] dark:border-[#30363d] flex flex-col justify-between space-y-2"
            >
              <div className="space-y-1">
                <span className="text-[11px] font-mono font-bold text-[#0969da] dark:text-[#58a6ff] block">
                  {step.num}.
                </span>
                <h3 className="text-xs font-semibold text-[#1f2328] dark:text-[#e6edf3]">
                  {step.title}
                </h3>
                <p className="text-[11px] text-[#656d76] dark:text-[#8b949e] leading-snug">
                  {step.summary}
                </p>
              </div>
              <div className="pt-1.5 border-t border-[#d0d7de] dark:border-[#21262d] text-[11px] font-mono text-[#656d76] dark:text-[#8b949e]">
                {step.meta}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Core Engineering Principles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white dark:bg-[#161b22] p-4 rounded-[6px] border border-[#d0d7de] dark:border-[#30363d] space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-[#9a6700] dark:text-[#d29922]" />
            <h3 className="text-xs font-semibold text-[#1f2328] dark:text-[#e6edf3]">
              Why Combine Static Rules with AI?
            </h3>
          </div>
          <p className="text-xs text-[#656d76] dark:text-[#8b949e] leading-snug">
            Pure AI reviewers can miss obfuscated API keys or hallucinate line numbers, while pure static regex tools miss multi-line logic bugs. Running deterministic rules first and pairing them with Gemini 3.8 Flash gives you instant secret detection plus deep semantic review.
          </p>
        </div>

        <div className="bg-white dark:bg-[#161b22] p-4 rounded-[6px] border border-[#d0d7de] dark:border-[#30363d] space-y-1.5">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#1a7f37] dark:text-[#3fb950]" />
            <h3 className="text-xs font-semibold text-[#1f2328] dark:text-[#e6edf3]">
              Side-by-Side Physical Line Mapping
            </h3>
          </div>
          <p className="text-xs text-[#656d76] dark:text-[#8b949e] leading-snug">
            Every hunk in a Git diff shifts line numbers as lines are added or removed. CodeSage tracks independent old and new line counters across every hunk and pairs consecutive modifications side-by-side so inline review cards always attach to the exact line of code.
          </p>
        </div>
      </div>
    </div>
  );
};
