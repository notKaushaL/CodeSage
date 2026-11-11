import React, { useState } from 'react';
import { 
  GitPullRequest, 
  X, 
  Search, 
  ExternalLink, 
  ShieldCheck, 
  AlertCircle, 
  GitBranch,
  FileCode,
  ArrowRight
} from 'lucide-react';
import { GitHubPrMetadata } from '../engine/githubTypes';
import { ReviewReport } from '../engine/types';

interface GitHubImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (report: ReviewReport) => void;
}

const POPULAR_EXAMPLES = [
  { label: 'facebook/react #31427', url: 'https://github.com/facebook/react/pull/31427' },
  { label: 'vercel/next.js #73210', url: 'https://github.com/vercel/next.js/pull/73210' },
  { label: 'astral-sh/uv #10000', url: 'https://github.com/astral-sh/uv/pull/10000' },
];

export const GitHubImportModal: React.FC<GitHubImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const [prInput, setPrInput] = useState('');
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [prMetadata, setPrMetadata] = useState<GitHubPrMetadata | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFetchMetadata = async () => {
    if (!prInput.trim()) {
      setErrorMessage('Please enter a GitHub Pull Request URL or repository identifier (e.g. facebook/react#12345).');
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
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl max-w-xl w-full p-5 text-zinc-900 dark:text-zinc-100 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
              <GitPullRequest className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Review GitHub Pull Request</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Public Repositories Only · No Authentication or Token Required
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Input & Fetch */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Pull Request URL or Shorthand
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <GitPullRequest className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
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
                className="w-full pl-9 pr-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded text-xs text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:border-blue-500 placeholder-zinc-400"
              />
            </div>
            <button
              onClick={handleFetchMetadata}
              disabled={isFetchingMetadata || !prInput.trim()}
              className="px-3 py-1.5 rounded bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-medium border border-zinc-200 dark:border-zinc-700 transition-colors disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0"
            >
              {isFetchingMetadata ? (
                <>
                  <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Fetching...</span>
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>Fetch Info</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Popular Public Examples */}
        <div>
          <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
            Quick public sample fixtures:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {POPULAR_EXAMPLES.map((ex, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSelectExample(ex.url)}
                className="px-2.5 py-1 text-[11px] font-mono rounded bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 transition-colors"
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>

        {/* PR Metadata Preview Card (When Loaded) */}
        {prMetadata && (
          <div className="p-3.5 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950/80 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400 font-semibold block">
                  {prMetadata.owner}/{prMetadata.repo} #{prMetadata.pullNumber}
                </span>
                <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5 leading-snug">
                  {prMetadata.title}
                </h4>
              </div>
              <a
                href={prMetadata.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                title="View on GitHub"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
              <div className="flex items-center gap-1">
                <GitBranch className="w-3 h-3 text-zinc-400" />
                <span>{prMetadata.base.ref}</span>
                <span>←</span>
                <span className="text-zinc-800 dark:text-zinc-200 font-medium">{prMetadata.head.ref}</span>
              </div>
              <span>·</span>
              <div className="flex items-center gap-1.5">
                <FileCode className="w-3 h-3 text-zinc-400" />
                <span>{prMetadata.changedFilesCount} files</span>
              </div>
              <span>·</span>
              <div>
                <span className="text-emerald-700 dark:text-emerald-400 font-medium">+{prMetadata.additions}</span>{' '}
                <span className="text-red-700 dark:text-red-400 font-medium">-{prMetadata.deletions}</span>
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isAnalyzing}
            className="px-3.5 py-1.5 rounded text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleRunAnalysis}
            disabled={isAnalyzing || !prInput.trim()}
            className="px-4 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isAnalyzing ? (
              <>
                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>Running Review Engine...</span>
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
  );
};
