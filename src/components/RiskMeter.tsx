import React, { useState } from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle, 
  Info, 
  Layers, 
  FileCode, 
  ExternalLink, 
  GitBranch,
  GitPullRequest,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { ReviewSummary } from '../engine/types';
import { GitHubPrMetadata } from '../engine/githubTypes';

interface RiskMeterProps {
  summary: ReviewSummary;
  githubPr?: GitHubPrMetadata;
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
  selectedSeverity: string | null;
  onSelectSeverity: (severity: string | null) => void;
}

export const RiskMeter: React.FC<RiskMeterProps> = ({
  summary,
  githubPr,
  selectedCategory,
  onSelectCategory,
  selectedSeverity,
  onSelectSeverity,
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

  // Status visual configurations with neutral developer styling
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'CRITICAL_RISK':
        return {
          label: 'CRITICAL RISK',
          sub: 'Merge Blocked — Severe vulnerabilities identified',
          badgeClass: 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border-red-300 dark:border-red-800',
          scoreColor: 'text-red-600 dark:text-red-400',
          icon: <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400" />
        };
      case 'HIGH_RISK':
        return {
          label: 'HIGH RISK',
          sub: 'Major defects found — Resolution strongly recommended',
          badgeClass: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800',
          scoreColor: 'text-amber-600 dark:text-amber-400',
          icon: <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        };
      case 'MODERATE_RISK':
        return {
          label: 'MODERATE RISK',
          sub: 'Code quality and non-blocking issues detected',
          badgeClass: 'bg-yellow-100 dark:bg-yellow-950/60 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-800',
          scoreColor: 'text-yellow-600 dark:text-yellow-400',
          icon: <Layers className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
        };
      default:
        return {
          label: 'CLEAN PASS',
          sub: 'No critical defects or secrets detected',
          badgeClass: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
          scoreColor: 'text-emerald-600 dark:text-emerald-400',
          icon: <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        };
    }
  };

  const statusConfig = getStatusConfig(risk_status);
  const totalFindings = critical_count + high_count + medium_count + low_count + info_count;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm space-y-3">
      {/* GitHub PR Metadata Strip (when reviewing PR) */}
      {githubPr && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-zinc-200 dark:border-zinc-800 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-mono text-[11px] font-semibold">
              <GitPullRequest className="w-3.5 h-3.5 text-zinc-500" />
              <span>{githubPr.owner}/{githubPr.repo}#{githubPr.pullNumber}</span>
            </span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-lg">
              {githubPr.title}
            </span>
          </div>

          <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400 font-mono text-[11px]">
            <div className="flex items-center gap-1">
              <GitBranch className="w-3 h-3 text-zinc-400" />
              <span>{githubPr.base.ref}</span>
              <span>←</span>
              <span className="text-zinc-800 dark:text-zinc-200 font-medium">{githubPr.head.ref}</span>
            </div>
            <a
              href={githubPr.htmlUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-sans"
            >
              <span>GitHub</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      )}

      {/* Main Review Summary Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Risk Score & Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-baseline gap-1.5 bg-zinc-50 dark:bg-zinc-950 px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Score
            </span>
            <span className={`text-2xl font-bold font-mono tabular-nums leading-none ${statusConfig.scoreColor}`}>
              {overall_risk_score}
            </span>
            <span className="text-xs text-zinc-400 font-mono">/100</span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded border ${statusConfig.badgeClass}`}>
                {statusConfig.icon}
                <span>{statusConfig.label}</span>
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono tabular-nums">
                {total_files_analyzed} {total_files_analyzed === 1 ? 'file' : 'files'} · {total_lines_analyzed} lines
              </span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
              {statusConfig.sub}
            </p>
          </div>
        </div>

        {/* Severity Filter Controls */}
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-xs text-zinc-500 dark:text-zinc-400 mr-1 hidden sm:inline">Filters:</span>
          
          <button
            onClick={() => onSelectSeverity(null)}
            className={`px-2.5 py-1 text-xs font-mono rounded border transition-colors ${
              selectedSeverity === null
                ? 'bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-800 dark:border-zinc-100 font-semibold'
                : 'bg-zinc-50 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            All ({totalFindings})
          </button>

          <button
            onClick={() => onSelectSeverity(selectedSeverity === 'CRITICAL' ? null : 'CRITICAL')}
            className={`px-2 py-1 text-xs font-mono rounded border transition-colors ${
              selectedSeverity === 'CRITICAL'
                ? 'bg-red-600 text-white border-red-600 font-semibold'
                : critical_count > 0
                ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900/60 hover:border-red-400'
                : 'bg-zinc-50 dark:bg-zinc-800/40 text-zinc-400 dark:text-zinc-600 border-zinc-200 dark:border-zinc-800 opacity-60'
            }`}
          >
            Crit: {critical_count}
          </button>

          <button
            onClick={() => onSelectSeverity(selectedSeverity === 'HIGH' ? null : 'HIGH')}
            className={`px-2 py-1 text-xs font-mono rounded border transition-colors ${
              selectedSeverity === 'HIGH'
                ? 'bg-amber-600 text-white border-amber-600 font-semibold'
                : high_count > 0
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/60 hover:border-amber-400'
                : 'bg-zinc-50 dark:bg-zinc-800/40 text-zinc-400 dark:text-zinc-600 border-zinc-200 dark:border-zinc-800 opacity-60'
            }`}
          >
            High: {high_count}
          </button>

          <button
            onClick={() => onSelectSeverity(selectedSeverity === 'MEDIUM' ? null : 'MEDIUM')}
            className={`px-2 py-1 text-xs font-mono rounded border transition-colors ${
              selectedSeverity === 'MEDIUM'
                ? 'bg-yellow-600 text-white border-yellow-600 font-semibold'
                : medium_count > 0
                ? 'bg-yellow-50 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-900/60 hover:border-yellow-400'
                : 'bg-zinc-50 dark:bg-zinc-800/40 text-zinc-400 dark:text-zinc-600 border-zinc-200 dark:border-zinc-800 opacity-60'
            }`}
          >
            Med: {medium_count}
          </button>

          <button
            onClick={() => onSelectSeverity(selectedSeverity === 'LOW' ? null : 'LOW')}
            className={`px-2 py-1 text-xs font-mono rounded border transition-colors ${
              selectedSeverity === 'LOW'
                ? 'bg-sky-600 text-white border-sky-600 font-semibold'
                : low_count > 0
                ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-900/60 hover:border-sky-400'
                : 'bg-zinc-50 dark:bg-zinc-800/40 text-zinc-400 dark:text-zinc-600 border-zinc-200 dark:border-zinc-800 opacity-60'
            }`}
          >
            Low: {low_count}
          </button>

          <button
            onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
            className="ml-2 p-1.5 rounded border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs flex items-center gap-1 transition-colors"
            title={isSummaryExpanded ? 'Collapse Executive Summary' : 'Expand Executive Summary'}
          >
            <span>Summary</span>
            {isSummaryExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Collapsible Executive Summary & Recommendations Accordion */}
      {isSummaryExpanded && (
        <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2.5 text-xs">
          {executive_summary && (
            <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 leading-relaxed font-sans">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 block mb-1">Executive Summary</span>
              {executive_summary}
            </div>
          )}

          {top_recommendations && top_recommendations.length > 0 && (
            <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded border border-zinc-200 dark:border-zinc-800 space-y-1.5">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 block">Top Recommendations</span>
              <ol className="list-decimal list-inside space-y-1 text-zinc-700 dark:text-zinc-300 font-sans">
                {top_recommendations.map((rec, rIdx) => (
                  <li key={rIdx}>{rec}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
