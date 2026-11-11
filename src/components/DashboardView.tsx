import React from 'react';
import { 
  GitPullRequest, 
  Upload, 
  Sparkles, 
  History, 
  ShieldCheck, 
  FileCode, 
  ArrowUpRight,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Layers
} from 'lucide-react';
import { ReviewReport } from '../engine/types';
import { SAMPLE_DIFFS, SampleDiff } from '../samples/diffSamples';

interface DashboardViewProps {
  onOpenUpload: () => void;
  onOpenGitHubModal: () => void;
  onSelectSample: (sample: SampleDiff) => void;
  onSelectReport: (report: ReviewReport) => void;
  history: ReviewReport[];
  currentReport: ReviewReport | null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenUpload,
  onOpenGitHubModal,
  onSelectSample,
  onSelectReport,
  history,
  currentReport,
}) => {
  // Compute true activity summary from actual history (no fake stats)
  const totalReviews = history.length;
  const avgScore = totalReviews > 0
    ? Math.round(history.reduce((acc, r) => acc + (r.summary?.overall_risk_score ?? 100), 0) / totalReviews)
    : 100;
  const totalFindings = history.reduce((acc, r) => acc + (r.findings?.length ?? 0), 0);
  const cleanPasses = history.filter((r) => r.summary?.risk_status === 'CLEAN_PASS').length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Developer Hero */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
              Code Review Engine
            </span>
            <span className="text-xs text-zinc-500 font-mono">v1.4</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mt-1.5">
            CodeSage AI
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1 max-w-xl leading-relaxed">
            Deterministic security and quality rules combined with Gemini 3.8 Flash for line-anchored Git diff analysis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentReport && (
            <button
              onClick={() => onSelectReport(currentReport)}
              className="px-3.5 py-1.5 rounded bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-medium border border-zinc-200 dark:border-zinc-700 transition-colors flex items-center gap-1.5"
            >
              <span>Current Review</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={onOpenUpload}
            className="px-4 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-xs font-medium transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>New Review</span>
          </button>
        </div>
      </div>

      {/* Main Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Action 1: Upload / Paste Diff */}
        <div 
          onClick={onOpenUpload}
          className="bg-white dark:bg-zinc-900 p-5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors shadow-sm cursor-pointer flex flex-col justify-between group"
        >
          <div>
            <div className="w-8 h-8 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-800 dark:text-zinc-200 mb-3 group-hover:border-zinc-400 transition-colors">
              <Upload className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Upload or Paste Diff</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
              Upload a unified <code className="font-mono text-[11px]">.diff</code> or <code className="font-mono text-[11px]">.patch</code> file, or paste raw git diff text.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs font-medium text-zinc-800 dark:text-zinc-200">
            <span>Submit Diff</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200" />
          </div>
        </div>

        {/* Action 2: GitHub PR Import */}
        <div 
          onClick={onOpenGitHubModal}
          className="bg-white dark:bg-zinc-900 p-5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors shadow-sm cursor-pointer flex flex-col justify-between group"
        >
          <div>
            <div className="w-8 h-8 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-800 dark:text-zinc-200 mb-3 group-hover:border-zinc-400 transition-colors">
              <GitPullRequest className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Import Public GitHub PR</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
              Inspect public Pull Requests directly using URL or shorthand (<code className="font-mono text-[11px]">owner/repo#123</code>) without credentials.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs font-medium text-zinc-800 dark:text-zinc-200">
            <span>Fetch PR</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200" />
          </div>
        </div>

        {/* Action 3: Pre-Baked Fixtures */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-800 dark:text-zinc-200 mb-3">
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Curated Test Fixtures</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
              Instantly run the review engine on pre-built diff scenarios.
            </p>
          </div>
          <div className="mt-3 space-y-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            {SAMPLE_DIFFS.slice(0, 2).map((s) => (
              <button
                key={s.id}
                onClick={() => onSelectSample(s)}
                className="w-full text-left p-1.5 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-xs font-mono text-zinc-700 dark:text-zinc-300 flex items-center justify-between transition-colors truncate"
              >
                <span className="truncate">{s.title}</span>
                <span className="text-[10px] text-zinc-400 flex-shrink-0">Load</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Review Activity Summary Strip (Real metrics from history) */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <h3 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
          Review Activity Summary
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center sm:text-left">
          <div className="p-2.5 rounded bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block">Total Reviews</span>
            <span className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100 tabular-nums">
              {totalReviews}
            </span>
          </div>

          <div className="p-2.5 rounded bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block">Average Score</span>
            <span className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100 tabular-nums">
              {avgScore} / 100
            </span>
          </div>

          <div className="p-2.5 rounded bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block">Findings Detected</span>
            <span className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100 tabular-nums">
              {totalFindings}
            </span>
          </div>

          <div className="p-2.5 rounded bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block">Clean Passes</span>
            <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
              {cleanPasses}
            </span>
          </div>
        </div>
      </div>

      {/* Recent Reviews Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-zinc-500" />
            <h3 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">Recent Review Activity</h3>
          </div>
          <span className="text-[11px] text-zinc-500 font-mono">
            {history.length} {history.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>

        {history.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-500">
            No reviews analyzed yet. Upload a diff or select a curated fixture above.
          </div>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {history.slice(0, 5).map((rep) => {
              const isCrit = rep.summary.risk_status === 'CRITICAL_RISK';
              const isHigh = rep.summary.risk_status === 'HIGH_RISK';
              const isClean = rep.summary.risk_status === 'CLEAN_PASS';

              return (
                <div
                  key={rep.id}
                  onClick={() => onSelectReport(rep)}
                  className="px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {rep.diff_title || 'Untitled Diff Review'}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold border ${
                          isCrit
                            ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900/60'
                            : isHigh
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/60'
                            : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60'
                        }`}
                      >
                        {rep.summary.overall_risk_score}/100
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                      <span>{new Date(rep.created_at).toLocaleDateString()}</span>
                      <span>·</span>
                      <span>{rep.summary.total_files_analyzed} files</span>
                      <span>·</span>
                      <span>{rep.findings.length} findings</span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectReport(rep);
                    }}
                    className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                    title="Open Review"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
