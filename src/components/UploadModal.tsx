import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  AlertCircle, 
  Sparkles, 
  FileCode
} from 'lucide-react';
import { SAMPLE_DIFFS, SampleDiff } from '../samples/diffSamples';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitDiff: (diffText: string, title?: string) => Promise<void>;
  isLoading: boolean;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onSubmitDiff,
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
      setError('Please provide a unified git diff or patch.');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Submit Git Diff for Review</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Deterministic security rules + Gemini 3.8 Flash hybrid analysis
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Quick Pre-Baked Samples */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
              Or load a curated test fixture:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {SAMPLE_DIFFS.map((sample) => (
                <button
                  type="button"
                  key={sample.id}
                  onClick={() => handleSelectSample(sample)}
                  className="p-2.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-left transition-colors"
                >
                  <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">
                    <Sparkles className="w-3 h-3 text-amber-500 flex-shrink-0" />
                    <span className="truncate">{sample.title}</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block truncate mt-0.5">
                    {sample.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Diff Title */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Review Title / Branch Name (Optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. PR #1042: Add user authentication and query refactor"
              className="w-full px-3 py-1.5 rounded bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          {/* Paste Raw Diff */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Unified Diff Content
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
              >
                <Upload className="w-3.5 h-3.5" />
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
              rows={10}
              value={diffText}
              onChange={(e) => setDiffText(e.target.value)}
              placeholder={`diff --git a/src/index.ts b/src/index.ts\n--- a/src/index.ts\n+++ b/src/index.ts\n@@ -1,3 +1,5 @@\n+ const apiKey = "AKIA...";\n`}
              className="w-full p-3 rounded bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 font-mono focus:outline-none focus:border-blue-500 leading-relaxed"
            />
            <div className="flex items-center justify-between mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              <span>Standard Git unified diff format</span>
              <span>Max payload: 2MB</span>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-3.5 py-1.5 rounded text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !diffText.trim()}
              className="px-4 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
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
