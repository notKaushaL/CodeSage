import React, { useState } from 'react';
import { 
  GitPullRequest, 
  Upload, 
  History, 
  ArrowUpRight,
  FolderGit2,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { ReviewReport } from '../engine/types';
import { SAMPLE_DIFFS, SampleDiff } from '../samples/diffSamples';

interface DashboardViewProps {
  onOpenUpload: () => void;
  onOpenGitHubModal: () => void;
  onSelectSample: (sample: SampleDiff) => void;
  onSelectReport: (report: ReviewReport) => void;
  onImportGitHubSuccess?: (report: ReviewReport) => void;
  history: ReviewReport[];
  currentReport: ReviewReport | null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenUpload,
  onOpenGitHubModal,
  onSelectSample,
  onSelectReport,
  onImportGitHubSuccess,
  history,
  currentReport,
}) => {
  const [quickPrInput, setQuickPrInput] = useState('');
  const [isImportingPr, setIsImportingPr] = useState(false);
  const [quickPrError, setQuickPrError] = useState<string | null>(null);

  const totalReviews = history.length;
  const avgScore = totalReviews > 0
    ? Math.round(history.reduce((acc, r) => acc + (r.summary?.overall_risk_score ?? 100), 0) / totalReviews)
    : 100;
  const totalFindings = history.reduce((acc, r) => acc + (r.findings?.length ?? 0), 0);
  const cleanPasses = history.filter((r) => r.summary?.risk_status === 'CLEAN_PASS').length;

  const handleQuickPrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPrInput.trim()) {
      onOpenGitHubModal();
      return;
    }

    if (!onImportGitHubSuccess) {
      onOpenGitHubModal();
      return;
    }

    setIsImportingPr(true);
    setQuickPrError(null);

    try {
      const res = await fetch('/api/v1/github/pr/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrlOrInput: quickPrInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}: Failed to analyze PR`);
      }
      setQuickPrInput('');
      onImportGitHubSuccess(data);
    } catch (err: any) {
      setQuickPrError(err.message || 'Could not import GitHub PR.');
    } finally {
      setIsImportingPr(false);
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Compact GitHub-Style Launchpad Card */}
      <div className="bg-white dark:bg-[#161b22] rounded-[6px] border border-[#d0d7de] dark:border-[#30363d] overflow-hidden">
        <div className="px-4 py-3 bg-[#f6f8fa] dark:bg-[#161b22] border-b border-[#d0d7de] dark:border-[#30363d] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-sm font-semibold text-[#1f2328] dark:text-[#e6edf3]">
              Start a Pull Request or Diff Review
            </h1>
            <p className="text-xs text-[#656d76] dark:text-[#8b949e]">
              Inspect side-by-side diffs for security vulnerabilities, leaked secrets, and logic bugs
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {currentReport && (
              <button
                onClick={() => onSelectReport(currentReport)}
                className="h-7 px-2.5 rounded-[6px] bg-white hover:bg-[#f3f4f6] dark:bg-[#21262d] dark:hover:bg-[#30363d] text-[#1f2328] dark:text-[#e6edf3] text-xs font-medium border border-[#d0d7de] dark:border-[#30363d] transition-colors flex items-center gap-1.5 whitespace-nowrap"
              >
                <span>Resume Active Review</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={onOpenUpload}
              className="h-7 px-3 rounded-[6px] bg-[#1f883d] hover:bg-[#1a7f37] text-white dark:bg-[#238636] dark:hover:bg-[#2ea043] dark:text-white text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Paste / Upload Diff</span>
            </button>
          </div>
        </div>

        {/* Inline Public GitHub PR Quick-Import Input */}
        <form onSubmit={handleQuickPrSubmit} className="p-4 space-y-2">
          <label className="block text-xs font-medium text-[#1f2328] dark:text-[#e6edf3]">
            Import Public GitHub Pull Request (No account or token required)
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <GitPullRequest className="w-3.5 h-3.5 text-[#656d76] dark:text-[#8b949e] absolute left-2.5 top-2" />
              <input
                type="text"
                value={quickPrInput}
                onChange={(e) => {
                  setQuickPrInput(e.target.value);
                  setQuickPrError(null);
                }}
                placeholder="https://github.com/facebook/react/pull/28000 or owner/repo#28000"
                className="w-full h-7 pl-8 pr-3 bg-[#f6f8fa] dark:bg-[#0d1117] border border-[#d0d7de] dark:border-[#30363d] rounded-[6px] text-xs text-[#1f2328] dark:text-[#e6edf3] font-mono placeholder-[#656d76] dark:placeholder-[#6e7681] focus:outline-none focus:border-[#0969da] dark:focus:border-[#2f81f7]"
              />
            </div>
            <button
              type="submit"
              disabled={isImportingPr}
              className="h-7 px-3 rounded-[6px] bg-[#f6f8fa] hover:bg-[#f3f4f6] dark:bg-[#21262d] dark:hover:bg-[#30363d] text-[#1f2328] dark:text-[#e6edf3] border border-[#d0d7de] dark:border-[#30363d] text-xs font-medium transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
            >
              {isImportingPr ? (
                <>
                  <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Fetching PR...</span>
                </>
              ) : (
                <>
                  <span>Analyze PR</span>
                  <ArrowRight className="w-3 h-3" />
                </>
              )}
            </button>
          </div>
          {quickPrError && (
            <div className="flex items-center gap-1.5 text-xs text-[#cf222e] dark:text-[#f85149] pt-1">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{quickPrError}</span>
            </div>
          )}
        </form>
      </div>

      {/* Compact 1-Click Sample Diff Scenarios */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-[#1f2328] dark:text-[#e6edf3]">
            Sample Pull Request Diffs
          </h2>
          <span className="text-[11px] text-[#656d76] dark:text-[#8b949e]">
            Click any scenario to inspect in Side-by-Side Diff Viewer
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {SAMPLE_DIFFS.map((sample) => (
            <button
              key={sample.id}
              onClick={() => onSelectSample(sample)}
              className="bg-white dark:bg-[#161b22] p-3 rounded-[6px] border border-[#d0d7de] dark:border-[#30363d] hover:border-[#0969da] dark:hover:border-[#2f81f7] transition-colors text-left flex flex-col justify-between group"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <FolderGit2 className="w-3.5 h-3.5 text-[#0969da] dark:text-[#58a6ff]" />
                  <span className="text-[11px] font-mono text-[#656d76] dark:text-[#8b949e]">
                    {sample.badge}
                  </span>
                </div>
                <h3 className="text-xs font-semibold text-[#1f2328] dark:text-[#e6edf3] group-hover:text-[#0969da] dark:group-hover:text-[#58a6ff] transition-colors">
                  {sample.title}
                </h3>
                <p className="text-[11px] text-[#656d76] dark:text-[#8b949e] line-clamp-2 leading-snug">
                  {sample.description}
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-[#d8dee4] dark:border-[#21262d] flex items-center justify-between text-[11px] font-medium text-[#0969da] dark:text-[#58a6ff]">
                <span>Inspect side-by-side diff</span>
                <ArrowUpRight className="w-3 h-3" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Compact Workspace Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#161b22] p-3 rounded-[6px] border border-[#d0d7de] dark:border-[#30363d]">
          <span className="text-[11px] text-[#656d76] dark:text-[#8b949e] block">Reviews Completed</span>
          <span className="text-base font-bold font-mono text-[#1f2328] dark:text-[#e6edf3] tabular-nums mt-0.5 block">
            {totalReviews}
          </span>
        </div>

        <div className="bg-white dark:bg-[#161b22] p-3 rounded-[6px] border border-[#d0d7de] dark:border-[#30363d]">
          <span className="text-[11px] text-[#656d76] dark:text-[#8b949e] block">Average Health Score</span>
          <span className="text-base font-bold font-mono text-[#1f2328] dark:text-[#e6edf3] tabular-nums mt-0.5 block">
            {avgScore}/100
          </span>
        </div>

        <div className="bg-white dark:bg-[#161b22] p-3 rounded-[6px] border border-[#d0d7de] dark:border-[#30363d]">
          <span className="text-[11px] text-[#656d76] dark:text-[#8b949e] block">Total Issues Caught</span>
          <span className="text-base font-bold font-mono text-[#1f2328] dark:text-[#e6edf3] tabular-nums mt-0.5 block">
            {totalFindings}
          </span>
        </div>

        <div className="bg-white dark:bg-[#161b22] p-3 rounded-[6px] border border-[#d0d7de] dark:border-[#30363d]">
          <span className="text-[11px] text-[#656d76] dark:text-[#8b949e] block">Clean Passes</span>
          <span className="text-base font-bold font-mono text-[#1a7f37] dark:text-[#3fb950] tabular-nums mt-0.5 block">
            {cleanPasses}
          </span>
        </div>
      </div>

      {/* Recent Reviews List */}
      <div className="bg-white dark:bg-[#161b22] rounded-[6px] border border-[#d0d7de] dark:border-[#30363d] overflow-hidden">
        <div className="px-3.5 py-2 border-b border-[#d0d7de] dark:border-[#30363d] flex items-center justify-between bg-[#f6f8fa] dark:bg-[#161b22]">
          <div className="flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-[#656d76] dark:text-[#8b949e]" />
            <h3 className="text-xs font-semibold text-[#1f2328] dark:text-[#e6edf3]">Recent Reviews</h3>
          </div>
          <span className="text-[11px] text-[#656d76] dark:text-[#8b949e] font-mono tabular-nums">
            {history.length} saved
          </span>
        </div>

        {history.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#656d76] dark:text-[#8b949e]">
            No reviews analyzed yet. Paste a diff or select a sample above.
          </div>
        ) : (
          <div className="divide-y divide-[#d8dee4] dark:divide-[#21262d]">
            {history.slice(0, 5).map((rep) => {
              const isCrit = rep.summary.risk_status === 'CRITICAL_RISK';
              const isHigh = rep.summary.risk_status === 'HIGH_RISK';

              return (
                <div
                  key={rep.id}
                  onClick={() => onSelectReport(rep)}
                  className="px-3.5 py-2.5 hover:bg-[#f6f8fa] dark:hover:bg-[#1f242c] cursor-pointer flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="min-w-0 flex-1 flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-semibold text-[#1f2328] dark:text-[#e6edf3] truncate">
                      {rep.diff_title || 'Untitled Diff Review'}
                    </span>
                    <span className="text-[#d0d7de] dark:text-[#30363d]">·</span>
                    <span
                      className={`font-mono tabular-nums font-semibold ${
                        isCrit
                          ? 'text-[#cf222e] dark:text-[#f85149]'
                          : isHigh
                          ? 'text-[#9a6700] dark:text-[#d29922]'
                          : 'text-[#1a7f37] dark:text-[#3fb950]'
                      }`}
                    >
                      Score {rep.summary.overall_risk_score}/100
                    </span>
                    <span className="text-[#d0d7de] dark:text-[#30363d]">·</span>
                    <span className="text-[11px] text-[#656d76] dark:text-[#8b949e] font-mono tabular-nums">
                      {rep.summary.total_files_analyzed} files · {rep.findings.length} issues · {new Date(rep.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <span className="text-xs font-medium text-[#0969da] dark:text-[#58a6ff] flex items-center gap-1 flex-shrink-0">
                    <span>Open</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
