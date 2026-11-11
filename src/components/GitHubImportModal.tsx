import React, { useState } from 'react';
import { 
  GitPullRequest, 
  X, 
  Search, 
  ExternalLink, 
  AlertCircle, 
  GitBranch,
  FileCode,
  ArrowRight,
  Upload
} from 'lucide-react';
import { GitHubPrMetadata } from '../engine/githubTypes';
import { ReviewReport } from '../engine/types';

interface GitHubImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (report: ReviewReport) => void;
  onSwitchToUpload?: () => void;
}

const POPULAR_EXAMPLES = [
  { label: 'facebook/react #28000', url: 'https://github.com/facebook/react/pull/28000' },
  { label: 'facebook/react #31427', url: 'https://github.com/facebook/react/pull/31427' },
  { label: 'astral-sh/uv #10000', url: 'https://github.com/astral-sh/uv/pull/10000' },
];

export const GitHubImportModal: React.FC<GitHubImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  onSwitchToUpload,
}) => {
  const [prInput, setPrInput] = useState('');
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [prMetadata, setPrMetadata] = useState<GitHubPrMetadata | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFetchMetadata = async () => {
    if (!prInput.trim()) {
      setErrorMessage('Please enter a GitHub Pull Request URL or repository identifier (e.g. facebook/react#28000).');
      return;
    }

    setIsFetchingMetadata(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/v1/github/pr/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrlOrInput: prInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}: Failed to fetch PR`);
      }

      setPrMetadata(data.metadata);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to fetch Pull Request details.');
      setPrMetadata(null);
    } finally {
      setIsFetchingMetadata(false);
    }
  };

  const handleRunAnalysis = async () => {
    if (!prInput.trim()) return;

    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/v1/github/pr/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrlOrInput: prInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}: Failed to analyze PR diff`);
      }

      onImportSuccess(data);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Analysis failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSelectExample = (url: string) => {
    setPrInput(url);
    setPrMetadata(null);
    setErrorMessage(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Import GitHub Pull Request"
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-[6px] shadow-xl max-w-xl w-full overflow-hidden text-[#1f2328] dark:text-[#e6edf3] flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-2.5 border-b border-[#d0d7de] dark:border-[#30363d] flex items-center justify-between bg-[#f6f8fa] dark:bg-[#161b22]">
          <div className="flex items-center gap-2">
            <GitPullRequest className="w-4 h-4 text-[#1a7f37] dark:text-[#3fb950]" />
            <div>
              <h3 className="text-xs font-semibold text-[#1f2328] dark:text-[#e6edf3]">Import Public GitHub Pull Request</h3>
              <p className="text-[11px] text-[#656d76] dark:text-[#8b949e]">
                Public repositories · No login or access token required
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onSwitchToUpload && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSwitchToUpload();
                }}
                className="inline-flex items-center gap-1.5 h-6 px-2 rounded-[6px] text-[11px] font-medium bg-white dark:bg-[#21262d] hover:bg-[#f3f4f6] dark:hover:bg-[#30363d] text-[#1f2328] dark:text-[#e6edf3] border border-[#d0d7de] dark:border-[#30363d] transition-colors"
              >
                <Upload className="w-3 h-3 text-[#656d76] dark:text-[#8b949e]" />
                <span>Paste Diff Instead</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-[6px] text-[#656d76] hover:text-[#1f2328] dark:hover:text-[#e6edf3] transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto">
          {/* Input & Fetch */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#1f2328] dark:text-[#e6edf3]">
              Pull Request URL or Shorthand
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <GitPullRequest className="w-3.5 h-3.5 text-[#656d76] dark:text-[#8b949e] absolute left-2.5 top-2" />
                <input
                  type="text"
                  value={prInput}
                  onChange={(e) => {
                    setPrInput(e.target.value);
                    setPrMetadata(null);
                    setErrorMessage(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (!prMetadata) handleFetchMetadata();
                    }
                  }}
                  placeholder="https://github.com/owner/repo/pull/123 or owner/repo#123"
                  className="w-full h-7 pl-8 pr-3 bg-[#f6f8fa] dark:bg-[#0d1117] border border-[#d0d7de] dark:border-[#30363d] rounded-[6px] text-xs text-[#1f2328] dark:text-[#e6edf3] font-mono focus:outline-none focus:border-[#0969da] dark:focus:border-[#2f81f7] placeholder-[#656d76] dark:placeholder-[#6e7681]"
                />
              </div>
              <button
                onClick={handleFetchMetadata}
                disabled={isFetchingMetadata || !prInput.trim()}
                className="h-7 px-2.5 rounded-[6px] bg-[#f6f8fa] hover:bg-[#f3f4f6] dark:bg-[#21262d] dark:hover:bg-[#30363d] text-[#1f2328] dark:text-[#e6edf3] text-xs font-medium border border-[#d0d7de] dark:border-[#30363d] transition-colors disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0"
              >
                {isFetchingMetadata ? (
                  <>
                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>Checking...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3 h-3" />
                    <span>Preview PR</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Popular Public Examples */}
          <div>
            <div className="text-xs font-medium text-[#656d76] dark:text-[#8b949e] mb-1">
              Or try a public Pull Request example:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_EXAMPLES.map((ex, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectExample(ex.url)}
                  className="px-2 py-0.5 text-xs font-mono rounded-[6px] bg-[#f6f8fa] hover:bg-[#f3f4f6] dark:bg-[#0d1117] dark:hover:bg-[#21262d] text-[#1f2328] dark:text-[#e6edf3] border border-[#d0d7de] dark:border-[#30363d] transition-colors"
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>

          {/* PR Metadata Preview Card */}
          {prMetadata && (
            <div className="p-3 rounded-[6px] border border-[#d0d7de] dark:border-[#30363d] bg-[#f6f8fa] dark:bg-[#0d1117] space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-mono text-[#0969da] dark:text-[#58a6ff] font-semibold block">
                    {prMetadata.owner}/{prMetadata.repo} #{prMetadata.pullNumber}
                  </span>
                  <h4 className="text-xs font-semibold text-[#1f2328] dark:text-[#e6edf3] mt-0.5 leading-snug">
                    {prMetadata.title}
                  </h4>
                </div>
                <a
                  href={prMetadata.htmlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 rounded text-[#656d76] hover:text-[#1f2328] dark:hover:text-[#e6edf3]"
                  title="Open on GitHub"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#656d76] dark:text-[#8b949e] font-mono tabular-nums">
                <div className="flex items-center gap-1">
                  <GitBranch className="w-3 h-3" />
                  <span>{prMetadata.base.ref} ← {prMetadata.head.ref}</span>
                </div>
                <span>·</span>
                <div className="flex items-center gap-1">
                  <FileCode className="w-3 h-3" />
                  <span>{prMetadata.changedFilesCount} files</span>
                </div>
                <span>·</span>
                <div>
                  <span className="text-[#1a7f37] dark:text-[#3fb950] font-semibold">+{prMetadata.additions}</span>{' '}
                  <span className="text-[#cf222e] dark:text-[#f85149] font-semibold">-{prMetadata.deletions}</span>
                </div>
              </div>
            </div>
          )}

          {/* Error message */}
          {errorMessage && (
            <div className="p-2.5 rounded-[6px] bg-[#ffebe9] dark:bg-[#f85149]/15 border border-[#cf222e]/30 dark:border-[#f85149]/40 text-[#cf222e] dark:text-[#f85149] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-[#d0d7de] dark:border-[#30363d]">
            <button
              type="button"
              onClick={onClose}
              disabled={isAnalyzing}
              className="h-7 px-3 rounded-[6px] text-xs font-medium text-[#1f2328] dark:text-[#e6edf3] bg-[#f6f8fa] hover:bg-[#f3f4f6] dark:bg-[#21262d] dark:hover:bg-[#30363d] border border-[#d0d7de] dark:border-[#30363d] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRunAnalysis}
              disabled={isAnalyzing || !prInput.trim()}
              className="h-7 px-3 rounded-[6px] bg-[#1f883d] hover:bg-[#1a7f37] text-white dark:bg-[#238636] dark:hover:bg-[#2ea043] dark:text-white text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Analyzing PR...</span>
                </>
              ) : (
                <>
                  <span>Analyze Pull Request</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
