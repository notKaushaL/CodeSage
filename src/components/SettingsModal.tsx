import React from 'react';
import { 
  Sun, 
  Moon, 
  Monitor, 
  Columns, 
  AlignJustify, 
  Sliders, 
  ShieldCheck, 
  Cpu, 
  Database,
  ExternalLink
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
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Settings Header */}
      <div className="bg-white dark:bg-zinc-900 p-5 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Settings & Preferences</h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Customize code review visual appearance, layout density, and default diff viewer options
        </p>
      </div>

      {/* Theme Settings */}
      <div className="bg-white dark:bg-zinc-900 p-5 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Appearance & Theme
        </h3>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Select your preferred editor contrast and interface theme
        </p>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={() => onSelectTheme('dark')}
            className={`p-3.5 rounded border text-left transition-colors flex items-center gap-3 ${
              theme === 'dark'
                ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 font-medium ring-1 ring-zinc-900 dark:ring-zinc-100'
                : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400'
            }`}
          >
            <Moon className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
            <div>
              <span className="text-xs font-medium block">Dark Theme</span>
              <span className="text-[11px] text-zinc-500">Charcoal & deep neutral</span>
            </div>
          </button>

          <button
            onClick={() => onSelectTheme('light')}
            className={`p-3.5 rounded border text-left transition-colors flex items-center gap-3 ${
              theme === 'light'
                ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 font-medium ring-1 ring-zinc-900 dark:ring-zinc-100'
                : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400'
            }`}
          >
            <Sun className="w-4 h-4 text-amber-500" />
            <div>
              <span className="text-xs font-medium block">Light Theme</span>
              <span className="text-[11px] text-zinc-500">High-contrast white & slate</span>
            </div>
          </button>
        </div>
      </div>

      {/* Diff View Mode Defaults */}
      <div className="bg-white dark:bg-zinc-900 p-5 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Diff Viewer Preferences
        </h3>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Default presentation mode when loading new code reviews
        </p>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={() => onSelectDefaultViewMode('unified')}
            className={`p-3.5 rounded border text-left transition-colors flex items-center gap-3 ${
              defaultViewMode === 'unified'
                ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 font-medium ring-1 ring-zinc-900 dark:ring-zinc-100'
                : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400'
            }`}
          >
            <AlignJustify className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
            <div>
              <span className="text-xs font-medium block">Unified Diff</span>
              <span className="text-[11px] text-zinc-500">Single column with old/new gutters</span>
            </div>
          </button>

          <button
            onClick={() => onSelectDefaultViewMode('split')}
            className={`p-3.5 rounded border text-left transition-colors flex items-center gap-3 ${
              defaultViewMode === 'split'
                ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 font-medium ring-1 ring-zinc-900 dark:ring-zinc-100'
                : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400'
            }`}
          >
            <Columns className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
            <div>
              <span className="text-xs font-medium block">Split Diff</span>
              <span className="text-[11px] text-zinc-500">Side-by-side with synchronized scroll</span>
            </div>
          </button>
        </div>
      </div>

      {/* Engine & Service Architecture Info */}
      <div className="bg-white dark:bg-zinc-900 p-5 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Engine Runtime Status
        </h3>

        <div className="space-y-2 text-xs font-mono">
          <div className="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
            <span className="text-zinc-500">AI Reasoning Model</span>
            <span className="text-zinc-900 dark:text-zinc-100 font-semibold">Gemini 3.8 Flash (server-side proxy)</span>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
            <span className="text-zinc-500">Syntax Tokenizer</span>
            <span className="text-zinc-900 dark:text-zinc-100 font-semibold">Shiki (Wasm on-demand)</span>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
            <span className="text-zinc-500">Static Scanners</span>
            <span className="text-zinc-900 dark:text-zinc-100 font-semibold">Shannon Entropy + Deterministic AST Regex</span>
          </div>

          <div className="flex items-center justify-between py-1.5">
            <span className="text-zinc-500">Payload Guard</span>
            <span className="text-zinc-900 dark:text-zinc-100 font-semibold">&lt; 2MB size limit</span>
          </div>
        </div>
      </div>
    </div>
  );
};
