import React, { useState } from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Layers, 
  ExternalLink, 
  GitBranch,
  GitPullRequest,
  ChevronDown,
  ChevronUp,
  Plus,
  FolderGit2
} from 'lucide-react';
import { ReviewSummary } from '../engine/types';
import { GitHubPrMetadata } from '../engine/githubTypes';

interface RiskMeterProps {
  diffTitle?: string;
  summary: ReviewSummary;
  githubPr?: GitHubPrMetadata;
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
  selectedSeverity: string | null;
  onSelectSeverity: (severity: string | null) => void;
  onOpenUpload?: () => void;
  onOpenGitHubModal?: () => void;
}

export const RiskMeter: React.FC<RiskMeterProps> = ({
  diffTitle,
  summary,
  githubPr,
  selectedSeverity,
  onSelectSeverity,
  onOpenUpload,
  onOpenGitHubModal,
}) => {
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);

  const {
    overall_risk_score,
    risk_status,
    critical_count,
    high_count,
    medium_count,
    low_count,
    info_count,
    total_files_analyzed,
    total_lines_analyzed,
    executive_summary,
    top_recommendations,
  } = summary;

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'CRITICAL_RISK':
        return {
          label: 'Action Required — Critical Issues',
          sub: 'Security vulnerabilities or high-risk defects detected before merge',
          scoreColor: 'text-[#cf222e] dark:text-[#f85149]',
          icon: <ShieldAlert className="w-4 h-4 text-[#cf222e] dark:text-[#f85149] flex-shrink-0" />
        };
      case 'HIGH_RISK':
        return {
          label: 'Review Recommended — High Risk',
          sub: 'Important security or logic issues need attention',
          scoreColor: 'text-[#d97706] dark:text-[#d29922]',
          icon: <AlertTriangle className="w-4 h-4 text-[#d97706] dark:text-[#d29922] flex-shrink-0" />
        };
      case 'MODERATE_RISK':
        return {
          label: 'Moderate Risk — Minor Issues',
          sub: 'Code quality and non-blocking suggestions identified',
          scoreColor: 'text-[#ca8a04] dark:text-[#e3b341]',
          icon: <Layers className="w-4 h-4 text-[#ca8a04] dark:text-[#e3b341] flex-shrink-0" />
        };
      default:
        return {
          label: 'Ready to Merge — Clean Pass',
          sub: 'No security vulnerabilities or blocking defects detected',
          scoreColor: 'text-[#1a7f37] dark:text-[#3fb950]',
          icon: <CheckCircle2 className="w-4 h-4 text-[#1a7f37] dark:text-[#3fb950] flex-shrink-0" />
        };
    }
  };

  const statusConfig = getStatusConfig(risk_status);
  const totalFindings = critical_count + high_count + medium_count + low_count + info_count;

  return (
    <section className="bg-white dark:bg-[#161b22] rounded-lg border border-[#e4e4e7] dark:border-[#30363d] p-4 sm:p-5 transition-colors space-y-4">
      {/* Top Row: Review Title / GitHub PR Context + Quick Switch Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-[#f4f4f5] dark:border-[#21262d]">
        <div className="min-w-0 flex-1">
          {githubPr ? (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <GitPullRequest className="w-4 h-4 text-[#0969da] dark:text-[#2f81f7] flex-shrink-0" />
              <span className="font-mono font-semibold text-[#171717] dark:text-[#e6edf3]">
                {githubPr.owner}/{githubPr.repo} #{githubPr.pullNumber}
              </span>
              <span className="text-[#d4d4d8] dark:text-[#30363d]">·</span>
              <span className="font-medium text-[#171717] dark:text-[#e6edf3] truncate max-w-md">
                {githubPr.title}
              </span>
              <span className="text-[#d4d4d8] dark:text-[#30363d] hidden sm:inline">·</span>
              <span className="hidden sm:inline-flex items-center gap-1 font-mono text-[11px] text-[#71717a] dark:text-[#8b949e]">
                <GitBranch className="w-3 h-3" />
                <span>{githubPr.base.ref} ← {githubPr.head.ref}</span>
              </span>
              <a
                href={githubPr.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[#0969da] dark:text-[#2f81f7] hover:underline ml-1"
              >
                <span>View on GitHub</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-sm sm:text-base font-semibold text-[#171717] dark:text-[#e6edf3] truncate">
                {diffTitle || 'Active Code Review'}
              </h1>
              <span className="text-[#d4d4d8] dark:text-[#30363d]">·</span>
              <span className="text-xs text-[#71717a] dark:text-[#8b949e] font-mono tabular-nums">
                {total_files_analyzed} {total_files_analyzed === 1 ? 'file' : 'files'} changed · {total_lines_analyzed} lines analyzed
              </span>
            </div>
          )}
        </div>

        {/* Quick Switch Review Source Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {onOpenGitHubModal && (
            <button
              onClick={onOpenGitHubModal}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#fafafa] hover:bg-[#f4f4f5] dark:bg-[#21262d] dark:hover:bg-[#30363d] text-[#52525b] dark:text-[#e6edf3] border border-[#d4d4d8] dark:border-[#30363d] transition-colors whitespace-nowrap shrink-0"
            >
              <GitPullRequest className="w-3.5 h-3.5 text-[#71717a] dark:text-[#8b949e]" />
              <span>Import PR</span>
            </button>
          )}
          {onOpenUpload && (
            <button
              onClick={onOpenUpload}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#fafafa] hover:bg-[#f4f4f5] dark:bg-[#21262d] dark:hover:bg-[#30363d] text-[#52525b] dark:text-[#e6edf3] border border-[#d4d4d8] dark:border-[#30363d] transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5 text-[#71717a] dark:text-[#8b949e]" />
              <span>Paste / Upload Diff</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Row: Score + Status + Interactive Issue Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Score & Verdict */}
        <div className="flex items-center gap-4">
          <div className="flex items-baseline gap-1 px-3.5 py-2 rounded-md bg-[#fafafa] dark:bg-[#0d1117] border border-[#e4e4e7] dark:border-[#30363d]">
            <span className={`text-2xl font-bold font-mono tabular-nums leading-none ${statusConfig.scoreColor}`}>
              {overall_risk_score}
            </span>
            <span className="text-xs text-[#71717a] dark:text-[#8b949e] font-mono tabular-nums">/100</span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {statusConfig.icon}
              <span className="text-sm font-semibold text-[#171717] dark:text-[#e6edf3]">
                {statusConfig.label}
              </span>
            </div>
            <p className="text-xs text-[#52525b] dark:text-[#8b949e] mt-0.5">
              {statusConfig.sub}
            </p>
          </div>
        </div>

        {/* Right: Segmented Filter Controls & Summary Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center p-1 rounded-lg bg-[#f4f4f5] dark:bg-[#0d1117] border border-[#e4e4e7] dark:border-[#30363d] gap-0.5 flex-wrap">
            <button
              onClick={() => onSelectSeverity(null)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                selectedSeverity === null
                  ? 'bg-white dark:bg-[#21262d] text-[#171717] dark:text-[#e6edf3] shadow-2xs font-semibold'
                  : 'text-[#52525b] dark:text-[#8b949e] hover:text-[#171717] dark:hover:text-[#e6edf3]'
              }`}
            >
              All Issues ({totalFindings})
            </button>

            <button
              onClick={() => onSelectSeverity(selectedSeverity === 'CRITICAL' ? null : 'CRITICAL')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                selectedSeverity === 'CRITICAL'
                  ? 'bg-[#cf222e] text-white font-semibold'
                  : critical_count > 0
                  ? 'text-[#cf222e] dark:text-[#f85149] hover:bg-white/60 dark:hover:bg-[#161b22]'
                  : 'text-[#a1a1aa] dark:text-[#484f58]'
              }`}
            >
              Critical ({critical_count})
            </button>

            <button
              onClick={() => onSelectSeverity(selectedSeverity === 'HIGH' ? null : 'HIGH')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                selectedSeverity === 'HIGH'
                  ? 'bg-[#d97706] text-white font-semibold'
                  : high_count > 0
                  ? 'text-[#d97706] dark:text-[#d29922] hover:bg-white/60 dark:hover:bg-[#161b22]'
                  : 'text-[#a1a1aa] dark:text-[#484f58]'
              }`}
            >
              High ({high_count})
            </button>

            <button
              onClick={() => onSelectSeverity(selectedSeverity === 'MEDIUM' ? null : 'MEDIUM')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                selectedSeverity === 'MEDIUM'
                  ? 'bg-[#ca8a04] text-white font-semibold'
                  : medium_count > 0
                  ? 'text-[#a16207] dark:text-[#e3b341] hover:bg-white/60 dark:hover:bg-[#161b22]'
                  : 'text-[#a1a1aa] dark:text-[#484f58]'
              }`}
            >
              Medium ({medium_count})
            </button>

            <button
              onClick={() => onSelectSeverity(selectedSeverity === 'LOW' ? null : 'LOW')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                selectedSeverity === 'LOW'
                  ? 'bg-[#0969da] text-white font-semibold'
                  : low_count > 0
                  ? 'text-[#0969da] dark:text-[#58a6ff] hover:bg-white/60 dark:hover:bg-[#161b22]'
                  : 'text-[#a1a1aa] dark:text-[#484f58]'
              }`}
            >
              Low ({low_count})
            </button>
          </div>

          <button
            onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
            className="px-3 py-1.5 rounded-md border border-[#d4d4d8] dark:border-[#30363d] bg-[#fafafa] hover:bg-[#f4f4f5] dark:bg-[#21262d] dark:hover:bg-[#30363d] text-[#171717] dark:text-[#e6edf3] text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            title={isSummaryExpanded ? 'Hide Overview & Advice' : 'Show Overview & Advice'}
          >
            <span>Overview</span>
            {isSummaryExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expandable Executive Summary & Actionable Recommendations */}
      {isSummaryExpanded && (
        <div className="pt-3.5 border-t border-[#e4e4e7] dark:border-[#30363d] grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {executive_summary && (
            <div className="space-y-1">
              <span className="font-semibold text-[#171717] dark:text-[#e6edf3] block">
                Review Summary
              </span>
              <p className="text-[#52525b] dark:text-[#8b949e] leading-relaxed">
                {executive_summary}
              </p>
            </div>
          )}

          {top_recommendations && top_recommendations.length > 0 && (
            <div className="space-y-1">
              <span className="font-semibold text-[#171717] dark:text-[#e6edf3] block">
                Recommended Actions
              </span>
              <ol className="list-decimal list-inside space-y-1 text-[#52525b] dark:text-[#8b949e] leading-relaxed">
                {top_recommendations.map((rec, rIdx) => (
                  <li key={rIdx}>{rec}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
