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
    <div className="max-w-2xl mx-auto space-y-3">
      {/* Header */}
      <div className="bg-[#f6f8fa] dark:bg-[#161b22] px-4 py-3 rounded-[6px] border border-[#d0d7de] dark:border-[#30363d]">
        <h2 className="text-sm font-semibold text-[#1f2328] dark:text-[#e6edf3]">Preferences</h2>
        <p className="text-xs text-[#656d76] dark:text-[#8b949e]">
          Configure GitHub theme appearance and default diff viewer layout
        </p>
      </div>

      {/* Theme Selection */}
      <div className="bg-white dark:bg-[#161b22] p-4 rounded-[6px] border border-[#d0d7de] dark:border-[#30363d] space-y-2.5">
        <div>
          <h3 className="text-xs font-semibold text-[#1f2328] dark:text-[#e6edf3]">
            Color Theme
          </h3>
          <p className="text-xs text-[#656d76] dark:text-[#8b949e]">
            Switch between GitHub Default Light and GitHub Default Dark
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            onClick={() => onSelectTheme('light')}
            className={`p-3 rounded-[6px] border text-left transition-colors flex items-center gap-2.5 ${
              theme === 'light'
                ? 'bg-[#f6f8fa] dark:bg-[#21262d] border-[#0969da] dark:border-[#2f81f7] ring-1 ring-[#0969da] dark:ring-[#2f81f7]'
                : 'bg-white dark:bg-[#0d1117] border-[#d0d7de] dark:border-[#30363d] hover:border-[#8c959f] dark:hover:border-[#484f58]'
            }`}
          >
            <Sun className="w-4 h-4 text-[#9a6700] flex-shrink-0" />
            <div>
              <span className="text-xs font-semibold text-[#1f2328] dark:text-[#e6edf3] block">GitHub Light</span>
              <span className="text-[11px] text-[#656d76] dark:text-[#8b949e]">#ffffff canvas · #f6f8fa headers · #d0d7de borders</span>
            </div>
          </button>

          <button
            onClick={() => onSelectTheme('dark')}
            className={`p-3 rounded-[6px] border text-left transition-colors flex items-center gap-2.5 ${
              theme === 'dark'
                ? 'bg-[#f6f8fa] dark:bg-[#21262d] border-[#0969da] dark:border-[#2f81f7] ring-1 ring-[#0969da] dark:ring-[#2f81f7]'
                : 'bg-white dark:bg-[#0d1117] border-[#d0d7de] dark:border-[#30363d] hover:border-[#8c959f] dark:hover:border-[#484f58]'
            }`}
          >
            <Moon className="w-4 h-4 text-[#0969da] dark:text-[#58a6ff] flex-shrink-0" />
            <div>
              <span className="text-xs font-semibold text-[#1f2328] dark:text-[#e6edf3] block">GitHub Dark</span>
              <span className="text-[11px] text-[#656d76] dark:text-[#8b949e]">#0d1117 canvas · #161b22 surfaces · #30363d borders</span>
            </div>
          </button>
        </div>
      </div>

      {/* Diff View Mode Defaults */}
      <div className="bg-white dark:bg-[#161b22] p-4 rounded-[6px] border border-[#d0d7de] dark:border-[#30363d] space-y-2.5">
        <div>
          <h3 className="text-xs font-semibold text-[#1f2328] dark:text-[#e6edf3]">
            Default Diff Layout
          </h3>
          <p className="text-xs text-[#656d76] dark:text-[#8b949e]">
            Choose how code changes are displayed when opening a review
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            onClick={() => onSelectDefaultViewMode('split')}
            className={`p-3 rounded-[6px] border text-left transition-colors flex items-center gap-2.5 ${
              defaultViewMode === 'split'
                ? 'bg-[#f6f8fa] dark:bg-[#21262d] border-[#0969da] dark:border-[#2f81f7] ring-1 ring-[#0969da] dark:ring-[#2f81f7]'
                : 'bg-white dark:bg-[#0d1117] border-[#d0d7de] dark:border-[#30363d] hover:border-[#8c959f] dark:hover:border-[#484f58]'
            }`}
          >
            <Columns className="w-4 h-4 text-[#656d76] dark:text-[#8b949e] flex-shrink-0" />
            <div>
              <span className="text-xs font-semibold text-[#1f2328] dark:text-[#e6edf3] block">Split View (Side-by-Side)</span>
              <span className="text-[11px] text-[#656d76] dark:text-[#8b949e]">Original (Before) on left · Modified (After) on right</span>
            </div>
          </button>

          <button
            onClick={() => onSelectDefaultViewMode('unified')}
            className={`p-3 rounded-[6px] border text-left transition-colors flex items-center gap-2.5 ${
              defaultViewMode === 'unified'
                ? 'bg-[#f6f8fa] dark:bg-[#21262d] border-[#0969da] dark:border-[#2f81f7] ring-1 ring-[#0969da] dark:ring-[#2f81f7]'
                : 'bg-white dark:bg-[#0d1117] border-[#d0d7de] dark:border-[#30363d] hover:border-[#8c959f] dark:hover:border-[#484f58]'
            }`}
          >
            <AlignJustify className="w-4 h-4 text-[#656d76] dark:text-[#8b949e] flex-shrink-0" />
            <div>
              <span className="text-xs font-semibold text-[#1f2328] dark:text-[#e6edf3] block">Unified View</span>
              <span className="text-[11px] text-[#656d76] dark:text-[#8b949e]">Single-column view with old and new line gutters</span>
            </div>
          </button>
        </div>
      </div>

      {/* Engine Configuration Summary */}
      <div className="bg-white dark:bg-[#161b22] p-4 rounded-[6px] border border-[#d0d7de] dark:border-[#30363d] space-y-2">
        <h3 className="text-xs font-semibold text-[#1f2328] dark:text-[#e6edf3]">
          System Specifications
        </h3>

        <div className="space-y-1.5 text-xs font-mono">
          <div className="flex items-center justify-between py-1 border-b border-[#d8dee4] dark:border-[#21262d]">
            <span className="text-[#656d76] dark:text-[#8b949e]">AI Reasoning Model</span>
            <span className="text-[#1f2328] dark:text-[#e6edf3] font-semibold">Gemini 3.8 Flash</span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-[#d8dee4] dark:border-[#21262d]">
            <span className="text-[#656d76] dark:text-[#8b949e]">Syntax Highlighting</span>
            <span className="text-[#1f2328] dark:text-[#e6edf3] font-semibold">Shiki (github-light & github-dark)</span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-[#d8dee4] dark:border-[#21262d]">
            <span className="text-[#656d76] dark:text-[#8b949e]">Static Security Rules</span>
            <span className="text-[#1f2328] dark:text-[#e6edf3] font-semibold">10 Rules + Shannon Entropy</span>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-[#656d76] dark:text-[#8b949e]">Max Diff Payload</span>
            <span className="text-[#1f2328] dark:text-[#e6edf3] font-semibold">2 MB</span>
          </div>
        </div>
      </div>
    </div>
  );
};
