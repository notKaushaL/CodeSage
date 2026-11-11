import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  AlertCircle, 
  FolderGit2,
  GitPullRequest
} from 'lucide-react';
import { SAMPLE_DIFFS, SampleDiff } from '../samples/diffSamples';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitDiff: (diffText: string, title?: string) => Promise<void>;
  onSwitchToGitHub?: () => void;
  isLoading: boolean;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onSubmitDiff,
  onSwitchToGitHub,
  isLoading,
}) => {
  const [diffText, setDiffText] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const MAX_BYTES = 2 * 1024 * 1024; // 2MB limit

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_BYTES) {
      setError(`File size exceeds 2MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB).`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setDiffText(content);
      if (!title) setTitle(file.name);
      setError(null);
    };
    reader.readAsText(file);
  };

  const handleSelectSample = (sample: SampleDiff) => {
    setDiffText(sample.rawDiff);
    setTitle(sample.title);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!diffText.trim()) {
      setError('Please paste a unified git diff or upload a .diff / .patch file.');
      return;
    }

    const byteLen = new TextEncoder().encode(diffText).length;
    if (byteLen > MAX_BYTES) {
      setError(`Diff payload exceeds 2MB limit (${(byteLen / 1024 / 1024).toFixed(2)}MB).`);
      return;
    }

    try {
      setError(null);
      await onSubmitDiff(diffText, title || 'Custom Git Diff');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to analyze diff');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Submit Git Diff for Review"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-[6px] shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-2.5 border-b border-[#d0d7de] dark:border-[#30363d] flex items-center justify-between bg-[#f6f8fa] dark:bg-[#161b22]">
          <div>
            <h3 className="text-xs font-semibold text-[#1f2328] dark:text-[#e6edf3]">New Code Review</h3>
            <p className="text-[11px] text-[#656d76] dark:text-[#8b949e]">
              Paste a Git diff, upload a .diff/.patch file, or load a sample scenario
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onSwitchToGitHub && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSwitchToGitHub();
                }}
                className="inline-flex items-center gap-1.5 h-6 px-2 rounded-[6px] text-[11px] font-medium bg-white dark:bg-[#21262d] hover:bg-[#f3f4f6] dark:hover:bg-[#30363d] text-[#1f2328] dark:text-[#e6edf3] border border-[#d0d7de] dark:border-[#30363d] transition-colors"
              >
                <GitPullRequest className="w-3 h-3 text-[#0969da] dark:text-[#58a6ff]" />
                <span>Import GitHub PR Instead</span>
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

        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-3 flex-1">
          {/* Quick Pre-Built Samples */}
          <div>
            <label className="block text-xs font-medium text-[#656d76] dark:text-[#8b949e] mb-1">
              Load a pre-built sample diff:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {SAMPLE_DIFFS.map((sample) => (
                <button
                  type="button"
                  key={sample.id}
                  onClick={() => handleSelectSample(sample)}
                  className="p-2 rounded-[6px] border border-[#d0d7de] dark:border-[#30363d] bg-[#f6f8fa] dark:bg-[#0d1117] hover:border-[#0969da] dark:hover:border-[#2f81f7] text-left transition-colors"
                >
                  <div className="flex items-center gap-1.5 text-xs font-medium text-[#1f2328] dark:text-[#e6edf3] truncate">
                    <FolderGit2 className="w-3.5 h-3.5 text-[#0969da] dark:text-[#58a6ff] flex-shrink-0" />
                    <span className="truncate">{sample.title}</span>
                  </div>
                  <span className="text-[11px] text-[#656d76] dark:text-[#8b949e] block truncate font-mono">
                    {sample.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Diff Title */}
          <div>
            <label className="block text-xs font-medium text-[#1f2328] dark:text-[#e6edf3] mb-1">
              Review Title (Optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. PR #1042: Add user authentication and query refactor"
              className="w-full h-7 px-2.5 rounded-[6px] bg-[#f6f8fa] dark:bg-[#0d1117] border border-[#d0d7de] dark:border-[#30363d] text-xs text-[#1f2328] dark:text-[#e6edf3] placeholder-[#656d76] dark:placeholder-[#6e7681] focus:outline-none focus:border-[#0969da] dark:focus:border-[#2f81f7] font-mono"
            />
          </div>

          {/* Paste Raw Diff */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-[#1f2328] dark:text-[#e6edf3]">
                Unified Diff Content
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-[#0969da] dark:text-[#58a6ff] hover:underline flex items-center gap-1 font-medium"
              >
                <Upload className="w-3 h-3" />
                <span>Upload .diff / .patch file</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".diff,.patch,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            <textarea
              rows={8}
              value={diffText}
              onChange={(e) => setDiffText(e.target.value)}
              placeholder={`diff --git a/src/index.ts b/src/index.ts\n--- a/src/index.ts\n+++ b/src/index.ts\n@@ -1,3 +1,5 @@\n+ const apiKey = "AKIA...";\n`}
              className="w-full p-2.5 rounded-[6px] bg-[#f6f8fa] dark:bg-[#0d1117] border border-[#d0d7de] dark:border-[#30363d] text-xs text-[#1f2328] dark:text-[#e6edf3] placeholder-[#656d76] dark:placeholder-[#6e7681] font-mono focus:outline-none focus:border-[#0969da] dark:focus:border-[#2f81f7] leading-snug"
            />
            <div className="flex items-center justify-between mt-1 text-[11px] text-[#656d76] dark:text-[#8b949e]">
              <span>Standard Git unified diff format</span>
              <span>Max size: 2 MB</span>
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded-[6px] bg-[#ffebe9] dark:bg-[#f85149]/15 border border-[#cf222e]/30 dark:border-[#f85149]/40 text-[#cf222e] dark:text-[#f85149] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-[#d0d7de] dark:border-[#30363d]">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="h-7 px-3 rounded-[6px] text-xs font-medium text-[#1f2328] dark:text-[#e6edf3] bg-[#f6f8fa] hover:bg-[#f3f4f6] dark:bg-[#21262d] dark:hover:bg-[#30363d] border border-[#d0d7de] dark:border-[#30363d] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !diffText.trim()}
              className="h-7 px-3 rounded-[6px] bg-[#1f883d] hover:bg-[#1a7f37] text-white dark:bg-[#238636] dark:hover:bg-[#2ea043] dark:text-white text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {isLoading ? (
                <>
                  <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Analyzing Diff...</span>
                </>
              ) : (
                <span>Run Analysis</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
