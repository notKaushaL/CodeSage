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
  Plus
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
          label: 'Changes requested · Critical issues',
          scoreColor: 'text-[#cf222e] dark:text-[#f85149]',
          icon: <ShieldAlert className="w-3.5 h-3.5 text-[#cf222e] dark:text-[#f85149] flex-shrink-0" />,
        };
      case 'HIGH_RISK':
        return {
          label: 'Review recommended · High risk',
          scoreColor: 'text-[#9a6700] dark:text-[#d29922]',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-[#9a6700] dark:text-[#d29922] flex-shrink-0" />,
        };
      case 'MODERATE_RISK':
        return {
          label: 'Moderate risk · Minor issues',
          scoreColor: 'text-[#9a6700] dark:text-[#e3b341]',
          icon: <Layers className="w-3.5 h-3.5 text-[#9a6700] dark:text-[#e3b341] flex-shrink-0" />,
        };
      default:
        return {
          label: 'Approved · Clean pass',
          scoreColor: 'text-[#1a7f37] dark:text-[#3fb950]',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-[#1a7f37] dark:text-[#3fb950] flex-shrink-0" />,
        };
    }
  };

  const statusConfig = getStatusConfig(risk_status);
  const totalFindings = critical_count + high_count + medium_count + low_count + info_count;

  return (
    <section className="bg-white dark:bg-[#161b22] rounded-[6px] border border-[#d0d7de] dark:border-[#30363d] px-3.5 py-2.5 transition-colors space-y-2">
      {/* Compact GitHub PR Header & Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Left: PR Title, Stats & Score */}
        <div className="flex flex-wrap items-center gap-2 min-w-0 text-xs">
          <GitPullRequest className="w-4 h-4 text-[#1a7f37] dark:text-[#3fb950] flex-shrink-0" />
          {githubPr ? (
            <>
              <span className="font-mono font-semibold text-[#1f2328] dark:text-[#e6edf3]">
                {githubPr.owner}/{githubPr.repo} #{githubPr.pullNumber}
              </span>
              <span className="text-[#d0d7de] dark:text-[#30363d]">·</span>
              <span className="font-semibold text-[#1f2328] dark:text-[#e6edf3] truncate max-w-sm">
                {githubPr.title}
              </span>
              <span className="hidden md:inline text-[#d0d7de] dark:text-[#30363d]">·</span>
              <span className="hidden md:inline-flex items-center gap-1 font-mono text-[11px] text-[#656d76] dark:text-[#8b949e]">
                <GitBranch className="w-3 h-3" />
                <span>{githubPr.base.ref} ← {githubPr.head.ref}</span>
              </span>
              <a
                href={githubPr.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-[#0969da] dark:text-[#2f81f7] hover:underline"
              >
                <span>GitHub</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </>
          ) : (
            <>
              <h1 className="text-xs sm:text-sm font-semibold text-[#1f2328] dark:text-[#e6edf3] truncate">
                {diffTitle || 'Active Code Review'}
              </h1>
              <span className="text-[#d0d7de] dark:text-[#30363d]">·</span>
              <span className="text-[11px] text-[#656d76] dark:text-[#8b949e] font-mono tabular-nums">
                {total_files_analyzed} {total_files_analyzed === 1 ? 'file' : 'files'} changed ({total_lines_analyzed} lines)
              </span>
            </>
          )}

          <span className="text-[#d0d7de] dark:text-[#30363d]">·</span>

          {/* Health Score & Verdict inline */}
          <div className="inline-flex items-center gap-1.5">
            {statusConfig.icon}
            <span className={`font-mono font-bold tabular-nums ${statusConfig.scoreColor}`}>
              Score {overall_risk_score}/100
            </span>
            <span className="hidden sm:inline text-[#656d76] dark:text-[#8b949e]">
              ({statusConfig.label})
            </span>
          </div>
        </div>

        {/* Right: Segmented Issue Filter Bar & Quick Actions */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="inline-flex items-center p-0.5 rounded-[6px] bg-[#f6f8fa] dark:bg-[#0d1117] border border-[#d0d7de] dark:border-[#30363d] text-[11px]">
            <button
              onClick={() => onSelectSeverity(null)}
              className={`px-2 py-0.5 font-medium rounded-[4px] transition-colors whitespace-nowrap shrink-0 ${
                selectedSeverity === null
                  ? 'bg-white dark:bg-[#21262d] text-[#1f2328] dark:text-[#e6edf3] shadow-2xs font-semibold'
                  : 'text-[#656d76] dark:text-[#8b949e] hover:text-[#1f2328] dark:hover:text-[#e6edf3]'
              }`}
            >
              All ({totalFindings})
            </button>

            <button
              onClick={() => onSelectSeverity(selectedSeverity === 'CRITICAL' ? null : 'CRITICAL')}
              className={`px-2 py-0.5 font-medium rounded-[4px] transition-colors whitespace-nowrap shrink-0 ${
                selectedSeverity === 'CRITICAL'
                  ? 'bg-[#cf222e] text-white font-semibold'
                  : critical_count > 0
                  ? 'text-[#cf222e] dark:text-[#f85149] hover:bg-white/60 dark:hover:bg-[#161b22]'
                  : 'text-[#6e7781] dark:text-[#484f58]'
              }`}
            >
              Critical ({critical_count})
            </button>

            <button
              onClick={() => onSelectSeverity(selectedSeverity === 'HIGH' ? null : 'HIGH')}
              className={`px-2 py-0.5 font-medium rounded-[4px] transition-colors whitespace-nowrap shrink-0 ${
                selectedSeverity === 'HIGH'
                  ? 'bg-[#9a6700] dark:bg-[#d29922] text-white dark:text-[#0d1117] font-semibold'
                  : high_count > 0
                  ? 'text-[#9a6700] dark:text-[#d29922] hover:bg-white/60 dark:hover:bg-[#161b22]'
                  : 'text-[#6e7781] dark:text-[#484f58]'
              }`}
            >
              High ({high_count})
            </button>

            <button
              onClick={() => onSelectSeverity(selectedSeverity === 'MEDIUM' ? null : 'MEDIUM')}
              className={`px-2 py-0.5 font-medium rounded-[4px] transition-colors whitespace-nowrap shrink-0 ${
                selectedSeverity === 'MEDIUM'
                  ? 'bg-[#9a6700] dark:bg-[#e3b341] text-white dark:text-[#0d1117] font-semibold'
                  : medium_count > 0
                  ? 'text-[#9a6700] dark:text-[#e3b341] hover:bg-white/60 dark:hover:bg-[#161b22]'
                  : 'text-[#6e7781] dark:text-[#484f58]'
              }`}
            >
              Medium ({medium_count})
            </button>

            <button
              onClick={() => onSelectSeverity(selectedSeverity === 'LOW' ? null : 'LOW')}
              className={`px-2 py-0.5 font-medium rounded-[4px] transition-colors whitespace-nowrap shrink-0 ${
                selectedSeverity === 'LOW'
                  ? 'bg-[#0969da] text-white font-semibold'
                  : low_count > 0
                  ? 'text-[#0969da] dark:text-[#58a6ff] hover:bg-white/60 dark:hover:bg-[#161b22]'
                  : 'text-[#6e7781] dark:text-[#484f58]'
              }`}
            >
              Low ({low_count})
            </button>
          </div>

          <button
            onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
            className="h-6 px-2 rounded-[6px] border border-[#d0d7de] dark:border-[#30363d] bg-[#f6f8fa] hover:bg-[#f3f4f6] dark:bg-[#21262d] dark:hover:bg-[#30363d] text-[#1f2328] dark:text-[#e6edf3] text-[11px] font-medium inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
            title={isSummaryExpanded ? 'Hide Overview & Advice' : 'Show Overview & Advice'}
          >
            <span>Summary</span>
            {isSummaryExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {onOpenGitHubModal && (
            <button
              onClick={onOpenGitHubModal}
              className="hidden sm:inline-flex items-center gap-1 h-6 px-2 rounded-[6px] text-[11px] font-medium bg-[#f6f8fa] hover:bg-[#f3f4f6] dark:bg-[#21262d] dark:hover:bg-[#30363d] text-[#1f2328] dark:text-[#e6edf3] border border-[#d0d7de] dark:border-[#30363d] transition-colors whitespace-nowrap shrink-0"
            >
              <GitPullRequest className="w-3 h-3 text-[#656d76] dark:text-[#8b949e]" />
              <span>Import PR</span>
            </button>
          )}

          {onOpenUpload && (
            <button
              onClick={onOpenUpload}
              className="hidden sm:inline-flex items-center gap-1 h-6 px-2 rounded-[6px] text-[11px] font-medium bg-[#f6f8fa] hover:bg-[#f3f4f6] dark:bg-[#21262d] dark:hover:bg-[#30363d] text-[#1f2328] dark:text-[#e6edf3] border border-[#d0d7de] dark:border-[#30363d] transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3 h-3 text-[#656d76] dark:text-[#8b949e]" />
              <span>Upload Diff</span>
            </button>
          )}
        </div>
      </div>

      {/* Expandable Executive Summary & Actionable Recommendations */}
      {isSummaryExpanded && (
        <div className="pt-2.5 border-t border-[#d0d7de] dark:border-[#30363d] grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {executive_summary && (
            <div className="space-y-1">
              <span className="font-semibold text-[#1f2328] dark:text-[#e6edf3] block">
                Review Summary
              </span>
              <p className="text-[#656d76] dark:text-[#8b949e] leading-snug">
                {executive_summary}
              </p>
            </div>
          )}

          {top_recommendations && top_recommendations.length > 0 && (
            <div className="space-y-1">
              <span className="font-semibold text-[#1f2328] dark:text-[#e6edf3] block">
                Recommended Actions
              </span>
              <ol className="list-decimal list-inside space-y-0.5 text-[#656d76] dark:text-[#8b949e] leading-snug">
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
