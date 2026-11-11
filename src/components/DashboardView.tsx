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
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Clean Hero & Direct Start Bar */}
      <div className="bg-white dark:bg-[#161b22] p-6 sm:p-8 rounded-lg border border-[#e4e4e7] dark:border-[#30363d] space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#171717] dark:text-[#e6edf3]">
              Start a Code Review
            </h1>
            <p className="text-xs sm:text-sm text-[#52525b] dark:text-[#8b949e] leading-relaxed">
              Analyze Git diffs or public GitHub Pull Requests for security risks, hardcoded secrets, and logic bugs with exact line-by-line suggestions.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-shrink-0">
            {currentReport && (
              <button
                onClick={() => onSelectReport(currentReport)}
                className="px-3.5 py-2 rounded-md bg-[#fafafa] hover:bg-[#f4f4f5] dark:bg-[#21262d] dark:hover:bg-[#30363d] text-[#171717] dark:text-[#e6edf3] text-xs font-medium border border-[#d4d4d8] dark:border-[#30363d] transition-colors flex items-center gap-1.5 whitespace-nowrap"
              >
                <span>Resume Current Review</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={onOpenUpload}
              className="px-4 py-2 rounded-md bg-[#171717] hover:bg-[#27272a] text-white dark:bg-[#238636] dark:hover:bg-[#2ea043] dark:text-white text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Paste or Upload Diff</span>
            </button>
          </div>
        </div>

        {/* Inline Public GitHub PR Quick-Import Input */}
        <form onSubmit={handleQuickPrSubmit} className="pt-4 border-t border-[#f4f4f5] dark:border-[#21262d] space-y-2">
          <label className="block text-xs font-medium text-[#171717] dark:text-[#e6edf3]">
            Quick Import Public GitHub Pull Request (No account or token required)
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <GitPullRequest className="w-4 h-4 text-[#71717a] dark:text-[#8b949e] absolute left-3 top-2.5" />
              <input
                type="text"
                value={quickPrInput}
                onChange={(e) => {
                  setQuickPrInput(e.target.value);
                  setQuickPrError(null);
                }}
                placeholder="Paste PR URL (e.g. https://github.com/facebook/react/pull/28000) or owner/repo#28000"
                className="w-full pl-9 pr-3 py-2 bg-[#fafafa] dark:bg-[#0d1117] border border-[#d4d4d8] dark:border-[#30363d] rounded-md text-xs text-[#171717] dark:text-[#e6edf3] font-mono placeholder-[#71717a] dark:placeholder-[#6e7681] focus:outline-none focus:border-[#0969da] dark:focus:border-[#2f81f7]"
              />
            </div>
            <button
              type="submit"
              disabled={isImportingPr}
              className="px-4 py-2 rounded-md bg-[#fafafa] hover:bg-[#f4f4f5] dark:bg-[#21262d] dark:hover:bg-[#30363d] text-[#171717] dark:text-[#e6edf3] border border-[#d4d4d8] dark:border-[#30363d] text-xs font-medium transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
            >
              {isImportingPr ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Fetching & Analyzing PR...</span>
                </>
              ) : (
                <>
                  <span>Analyze GitHub PR</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
          {quickPrError && (
            <div className="flex items-center gap-2 text-xs text-[#cf222e] dark:text-[#f85149] pt-1">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{quickPrError}</span>
            </div>
          )}
        </form>
      </div>

      {/* 1-Click Sample Diff Scenarios */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[#171717] dark:text-[#e6edf3]">
              Try a 1-Click Sample Review
            </h2>
            <p className="text-xs text-[#52525b] dark:text-[#8b949e]">
              Click any realistic scenario below to see how CodeSage highlights vulnerabilities and suggests fixes
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {SAMPLE_DIFFS.map((sample) => (
            <button
              key={sample.id}
              onClick={() => onSelectSample(sample)}
              className="bg-white dark:bg-[#161b22] p-4 rounded-lg border border-[#e4e4e7] dark:border-[#30363d] hover:border-[#0969da] dark:hover:border-[#2f81f7] transition-colors text-left flex flex-col justify-between group"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <FolderGit2 className="w-4 h-4 text-[#0969da] dark:text-[#58a6ff]" />
                  <span className="text-[11px] font-mono text-[#71717a] dark:text-[#8b949e]">
                    {sample.badge}
                  </span>
                </div>
                <h3 className="text-xs font-semibold text-[#171717] dark:text-[#e6edf3] group-hover:text-[#0969da] dark:group-hover:text-[#58a6ff] transition-colors">
                  {sample.title}
                </h3>
                <p className="text-xs text-[#52525b] dark:text-[#8b949e] line-clamp-2 leading-relaxed">
                  {sample.description}
                </p>
              </div>
              <div className="mt-4 pt-2.5 border-t border-[#f4f4f5] dark:border-[#21262d] flex items-center justify-between text-xs font-medium text-[#171717] dark:text-[#e6edf3]">
                <span>Open in Review Workspace</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-[#71717a] group-hover:text-[#0969da] dark:group-hover:text-[#58a6ff]" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Workspace Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#161b22] p-4 rounded-lg border border-[#e4e4e7] dark:border-[#30363d]">
          <span className="text-xs text-[#52525b] dark:text-[#8b949e] block">Reviews Completed</span>
          <span className="text-xl font-bold font-mono text-[#171717] dark:text-[#e6edf3] tabular-nums mt-1 block">
            {totalReviews}
          </span>
        </div>

        <div className="bg-white dark:bg-[#161b22] p-4 rounded-lg border border-[#e4e4e7] dark:border-[#30363d]">
          <span className="text-xs text-[#52525b] dark:text-[#8b949e] block">Average Health Score</span>
          <span className="text-xl font-bold font-mono text-[#171717] dark:text-[#e6edf3] tabular-nums mt-1 block">
            {avgScore}/100
          </span>
        </div>

        <div className="bg-white dark:bg-[#161b22] p-4 rounded-lg border border-[#e4e4e7] dark:border-[#30363d]">
          <span className="text-xs text-[#52525b] dark:text-[#8b949e] block">Total Issues Caught</span>
          <span className="text-xl font-bold font-mono text-[#171717] dark:text-[#e6edf3] tabular-nums mt-1 block">
            {totalFindings}
          </span>
        </div>

        <div className="bg-white dark:bg-[#161b22] p-4 rounded-lg border border-[#e4e4e7] dark:border-[#30363d]">
          <span className="text-xs text-[#52525b] dark:text-[#8b949e] block">Clean Passes</span>
          <span className="text-xl font-bold font-mono text-[#1a7f37] dark:text-[#3fb950] tabular-nums mt-1 block">
            {cleanPasses}
          </span>
        </div>
      </div>

      {/* Recent Reviews List */}
      <div className="bg-white dark:bg-[#161b22] rounded-lg border border-[#e4e4e7] dark:border-[#30363d] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#e4e4e7] dark:border-[#30363d] flex items-center justify-between bg-[#fafafa] dark:bg-[#0d1117]/40">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#52525b] dark:text-[#8b949e]" />
            <h3 className="text-xs font-semibold text-[#171717] dark:text-[#e6edf3]">Recent Reviews</h3>
          </div>
          <span className="text-[11px] text-[#71717a] dark:text-[#8b949e] font-mono tabular-nums">
            {history.length} saved
          </span>
        </div>

        {history.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#71717a] dark:text-[#8b949e]">
            No reviews analyzed yet. Paste a diff or select a sample above.
          </div>
        ) : (
          <div className="divide-y divide-[#e4e4e7] dark:divide-[#21262d]">
            {history.slice(0, 5).map((rep) => {
              const isCrit = rep.summary.risk_status === 'CRITICAL_RISK';
              const isHigh = rep.summary.risk_status === 'HIGH_RISK';

              return (
                <div
                  key={rep.id}
                  onClick={() => onSelectReport(rep)}
                  className="px-4 py-3 hover:bg-[#fafafa] dark:hover:bg-[#1f242c] cursor-pointer flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-[#171717] dark:text-[#e6edf3] truncate">
                        {rep.diff_title || 'Untitled Diff Review'}
                      </span>
                      <span className="text-[#d4d4d8] dark:text-[#30363d]">·</span>
                      <span
                        className={`text-xs font-mono tabular-nums font-semibold ${
                          isCrit
                            ? 'text-[#cf222e] dark:text-[#f85149]'
                            : isHigh
                            ? 'text-[#d97706] dark:text-[#d29922]'
                            : 'text-[#1a7f37] dark:text-[#3fb950]'
                        }`}
                      >
                        Score {rep.summary.overall_risk_score}/100
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-[#71717a] dark:text-[#8b949e] font-mono tabular-nums mt-0.5">
                      <span>{new Date(rep.created_at).toLocaleDateString()}</span>
                      <span>·</span>
                      <span>{rep.summary.total_files_analyzed} files</span>
                      <span>·</span>
                      <span>{rep.findings.length} issues</span>
                    </div>
                  </div>

                  <span className="text-xs font-medium text-[#0969da] dark:text-[#58a6ff] flex items-center gap-1 flex-shrink-0">
                    <span>Open</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
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
