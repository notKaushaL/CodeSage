import React from 'react';
import { 
  Sun, 
  Moon, 
  Columns, 
  AlignJustify
} from 'lucide-react';

interface SettingsModalProps {
  theme: 'light' | 'dark';
  onSelectTheme: (theme: 'light' | 'dark') => void;
  defaultViewMode: 'unified' | 'split';
  onSelectDefaultViewMode: (mode: 'unified' | 'split') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  theme,
  onSelectTheme,
  defaultViewMode,
  onSelectDefaultViewMode,
}) => {
  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="bg-white dark:bg-[#161b22] p-5 rounded-lg border border-[#e4e4e7] dark:border-[#30363d]">
        <h2 className="text-base font-semibold text-[#171717] dark:text-[#e6edf3]">Preferences</h2>
        <p className="text-xs text-[#52525b] dark:text-[#8b949e] mt-1">
          Choose your preferred visual theme and default diff viewer layout
        </p>
      </div>

      {/* Theme Selection */}
      <div className="bg-white dark:bg-[#161b22] p-5 rounded-lg border border-[#e4e4e7] dark:border-[#30363d] space-y-3">
        <div>
          <h3 className="text-xs font-semibold text-[#171717] dark:text-[#e6edf3]">
            Color Theme
          </h3>
          <p className="text-xs text-[#52525b] dark:text-[#8b949e] mt-0.5">
            Switch between Vercel/Apple inspired Light Mode and GitHub Primer Dark Mode
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <button
            onClick={() => onSelectTheme('light')}
            className={`p-4 rounded-lg border text-left transition-colors flex items-center gap-3 ${
              theme === 'light'
                ? 'bg-[#f4f4f5] dark:bg-[#21262d] border-[#0969da] dark:border-[#2f81f7] ring-1 ring-[#0969da] dark:ring-[#2f81f7]'
                : 'bg-[#fafafa] dark:bg-[#0d1117] border-[#e4e4e7] dark:border-[#30363d] hover:border-[#a1a1aa] dark:hover:border-[#484f58]'
            }`}
          >
            <Sun className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <div>
              <span className="text-xs font-semibold text-[#171717] dark:text-[#e6edf3] block">Light Mode</span>
              <span className="text-[11px] text-[#71717a] dark:text-[#8b949e]">Crisp white & subtle alabaster (Vercel / Apple style)</span>
            </div>
          </button>

          <button
            onClick={() => onSelectTheme('dark')}
            className={`p-4 rounded-lg border text-left transition-colors flex items-center gap-3 ${
              theme === 'dark'
                ? 'bg-[#f4f4f5] dark:bg-[#21262d] border-[#0969da] dark:border-[#2f81f7] ring-1 ring-[#0969da] dark:ring-[#2f81f7]'
                : 'bg-[#fafafa] dark:bg-[#0d1117] border-[#e4e4e7] dark:border-[#30363d] hover:border-[#a1a1aa] dark:hover:border-[#484f58]'
            }`}
          >
            <Moon className="w-4 h-4 text-[#0969da] dark:text-[#58a6ff] flex-shrink-0" />
            <div>
              <span className="text-xs font-semibold text-[#171717] dark:text-[#e6edf3] block">Dark Mode</span>
              <span className="text-[11px] text-[#71717a] dark:text-[#8b949e]">Balanced slate-charcoal (#0d1117 GitHub Primer Dark)</span>
            </div>
          </button>
        </div>
      </div>

      {/* Diff View Mode Defaults */}
      <div className="bg-white dark:bg-[#161b22] p-5 rounded-lg border border-[#e4e4e7] dark:border-[#30363d] space-y-3">
        <div>
          <h3 className="text-xs font-semibold text-[#171717] dark:text-[#e6edf3]">
            Default Diff Layout
          </h3>
          <p className="text-xs text-[#52525b] dark:text-[#8b949e] mt-0.5">
            Choose how code changes are displayed when opening a review
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <button
            onClick={() => onSelectDefaultViewMode('unified')}
            className={`p-4 rounded-lg border text-left transition-colors flex items-center gap-3 ${
              defaultViewMode === 'unified'
                ? 'bg-[#f4f4f5] dark:bg-[#21262d] border-[#0969da] dark:border-[#2f81f7] ring-1 ring-[#0969da] dark:ring-[#2f81f7]'
                : 'bg-[#fafafa] dark:bg-[#0d1117] border-[#e4e4e7] dark:border-[#30363d] hover:border-[#a1a1aa] dark:hover:border-[#484f58]'
            }`}
          >
            <AlignJustify className="w-4 h-4 text-[#52525b] dark:text-[#8b949e] flex-shrink-0" />
            <div>
              <span className="text-xs font-semibold text-[#171717] dark:text-[#e6edf3] block">Unified View</span>
              <span className="text-[11px] text-[#71717a] dark:text-[#8b949e]">Single-column view with old and new line gutters</span>
            </div>
          </button>

          <button
            onClick={() => onSelectDefaultViewMode('split')}
            className={`p-4 rounded-lg border text-left transition-colors flex items-center gap-3 ${
              defaultViewMode === 'split'
                ? 'bg-[#f4f4f5] dark:bg-[#21262d] border-[#0969da] dark:border-[#2f81f7] ring-1 ring-[#0969da] dark:ring-[#2f81f7]'
                : 'bg-[#fafafa] dark:bg-[#0d1117] border-[#e4e4e7] dark:border-[#30363d] hover:border-[#a1a1aa] dark:hover:border-[#484f58]'
            }`}
          >
            <Columns className="w-4 h-4 text-[#52525b] dark:text-[#8b949e] flex-shrink-0" />
            <div>
              <span className="text-xs font-semibold text-[#171717] dark:text-[#e6edf3] block">Split View</span>
              <span className="text-[11px] text-[#71717a] dark:text-[#8b949e]">Side-by-side comparison of original and modified code</span>
            </div>
          </button>
        </div>
      </div>

      {/* Engine Configuration Summary */}
      <div className="bg-white dark:bg-[#161b22] p-5 rounded-lg border border-[#e4e4e7] dark:border-[#30363d] space-y-3">
        <h3 className="text-xs font-semibold text-[#171717] dark:text-[#e6edf3]">
          System Specifications
        </h3>

        <div className="space-y-2 text-xs font-mono">
          <div className="flex items-center justify-between py-1.5 border-b border-[#f4f4f5] dark:border-[#21262d]">
            <span className="text-[#52525b] dark:text-[#8b949e]">AI Reasoning Model</span>
            <span className="text-[#171717] dark:text-[#e6edf3] font-semibold">Gemini 3.8 Flash</span>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-[#f4f4f5] dark:border-[#21262d]">
            <span className="text-[#52525b] dark:text-[#8b949e]">Syntax Highlighting</span>
            <span className="text-[#171717] dark:text-[#e6edf3] font-semibold">Shiki (GitHub Light & Dark)</span>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-[#f4f4f5] dark:border-[#21262d]">
            <span className="text-[#52525b] dark:text-[#8b949e]">Static Security Rules</span>
            <span className="text-[#171717] dark:text-[#e6edf3] font-semibold">10 AST/Regex Rules + Entropy</span>
          </div>

          <div className="flex items-center justify-between py-1.5">
            <span className="text-[#52525b] dark:text-[#8b949e]">Max Diff Payload</span>
            <span className="text-[#171717] dark:text-[#e6edf3] font-semibold">2 MB</span>
          </div>
        </div>
      </div>
    </div>
  );
};
