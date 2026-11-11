import React, { useState } from 'react';
import { 
  Menu, 
  Sun, 
  Moon, 
  Download, 
  Plus, 
  ChevronDown, 
  FileText,
  FolderGit2
} from 'lucide-react';
import { SAMPLE_DIFFS, SampleDiff } from '../samples/diffSamples';
import { ReviewReport } from '../engine/types';
import { ActiveNavPage } from './Sidebar';

interface NavbarProps {
  activePage: ActiveNavPage;
  onSelectPage?: (page: ActiveNavPage) => void;
  currentReport: ReviewReport | null;
  isLoading: boolean;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenUpload: () => void;
  onOpenGitHubModal?: () => void;
  onSelectSample: (sample: SampleDiff) => void;
  onOpenMobileSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activePage,
  onSelectPage,
  currentReport,
  isLoading,
  theme,
  onToggleTheme,
  onOpenUpload,
  onSelectSample,
  onOpenMobileSidebar,
}) => {
  const [isSamplesOpen, setIsSamplesOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const getPageTitle = () => {
    switch (activePage) {
      case 'dashboard':
        return 'Quick Start';
      case 'diff':
        if (currentReport?.github_pr) {
          return `${currentReport.github_pr.owner}/${currentReport.github_pr.repo} #${currentReport.github_pr.pullNumber}`;
        }
        return currentReport?.diff_title || 'Pull Request Review';
      case 'history':
        return 'Past Reviews';
      case 'pipeline':
        return 'Engine Metrics';
      case 'architecture':
        return 'How It Works';
      case 'settings':
        return 'Preferences';
      default:
        return 'CodeSage';
    }
  };

  const exportAsMarkdown = () => {
    if (!currentReport) return;
    const { summary, findings } = currentReport;

    let md = `# Code Review Report: ${currentReport.diff_title || 'Git Diff'}\n\n`;
    md += `**Date:** ${new Date(currentReport.created_at).toLocaleString()}\n`;
    md += `**Overall Risk Score:** ${summary.overall_risk_score}/100 (${summary.risk_status})\n`;
    md += `**Files Analyzed:** ${summary.total_files_analyzed} | **Lines Analyzed:** ${summary.total_lines_analyzed}\n\n`;
    md += `## Executive Summary\n${summary.executive_summary}\n\n`;
    md += `## Top Recommendations\n`;
    summary.top_recommendations.forEach((rec, i) => {
      md += `${i + 1}. ${rec}\n`;
    });
    md += `\n## Findings (${findings.length})\n\n`;

    findings.forEach((f, i) => {
      md += `### ${i + 1}. [${f.severity}] ${f.title}\n`;
      md += `- **File:** \`${f.file_path}\` (Line ${f.line_number})\n`;
      md += `- **Category:** ${f.category}${f.cwe_id ? ` | **CWE:** ${f.cwe_id}` : ''}\n`;
      md += `- **Source:** ${f.source} (${Math.round(f.confidence * 100)}% confidence)\n\n`;
      md += `${f.description}\n\n`;
      if (f.suggestion_diff) {
        md += `\`\`\`diff\n${f.suggestion_diff}\n\`\`\`\n\n`;
      }
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `codesage-review-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setIsExportOpen(false);
  };

  const exportAsJSON = () => {
    if (!currentReport) return;
    const blob = new Blob([JSON.stringify(currentReport, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentReport.id || 'codesage-report'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setIsExportOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 h-12 bg-[#f6f8fa] dark:bg-[#161b22] border-b border-[#d0d7de] dark:border-[#30363d] px-3 sm:px-4 flex items-center justify-between gap-4 select-none transition-colors">
      {/* Zone 1: Compact GitHub Context Breadcrumb */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onOpenMobileSidebar}
          className="md:hidden p-1 rounded-[6px] hover:bg-[#eaeef2] dark:hover:bg-[#21262d] text-[#656d76] dark:text-[#8b949e]"
          aria-label="Open navigation menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1.5 text-xs min-w-0">
          {onSelectPage ? (
            <button
              onClick={() => onSelectPage('dashboard')}
              className="hidden sm:inline text-[#656d76] dark:text-[#8b949e] hover:text-[#0969da] dark:hover:text-[#2f81f7] transition-colors whitespace-nowrap shrink-0"
            >
              codesage
            </button>
          ) : (
            <span className="hidden sm:inline text-[#656d76] dark:text-[#8b949e] whitespace-nowrap shrink-0">
              codesage
            </span>
          )}
          <span className="hidden sm:inline text-[#656d76] dark:text-[#8b949e]">/</span>
          <span className="font-semibold text-[#1f2328] dark:text-[#e6edf3] truncate max-w-[200px] sm:max-w-[320px]">
            {getPageTitle()}
          </span>
        </div>
      </div>

      {/* Zone 2: GitHub Pull Request Style Navigation Tabs */}
      {onSelectPage && (
        <nav className="hidden xl:flex items-center gap-4 text-xs font-medium text-[#656d76] dark:text-[#8b949e]">
          <button
            onClick={() => onSelectPage('diff')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 ${
              activePage === 'diff'
                ? 'text-[#1f2328] dark:text-[#e6edf3] font-semibold underline decoration-[#fd8c73] decoration-2 underline-offset-[14px]'
                : 'hover:text-[#1f2328] dark:hover:text-[#e6edf3]'
            }`}
          >
            Files changed
          </button>
          <button
            onClick={() => onSelectPage('dashboard')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 ${
              activePage === 'dashboard'
                ? 'text-[#1f2328] dark:text-[#e6edf3] font-semibold underline decoration-[#fd8c73] decoration-2 underline-offset-[14px]'
                : 'hover:text-[#1f2328] dark:hover:text-[#e6edf3]'
            }`}
          >
            Quick Start
          </button>
          <button
            onClick={() => onSelectPage('history')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 ${
              activePage === 'history'
                ? 'text-[#1f2328] dark:text-[#e6edf3] font-semibold underline decoration-[#fd8c73] decoration-2 underline-offset-[14px]'
                : 'hover:text-[#1f2328] dark:hover:text-[#e6edf3]'
            }`}
          >
            Past Reviews
          </button>
          <button
            onClick={() => onSelectPage('pipeline')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 ${
              activePage === 'pipeline'
                ? 'text-[#1f2328] dark:text-[#e6edf3] font-semibold underline decoration-[#fd8c73] decoration-2 underline-offset-[14px]'
                : 'hover:text-[#1f2328] dark:hover:text-[#e6edf3]'
            }`}
          >
            Engine Metrics
          </button>
        </nav>
      )}

      {/* Zone 3: Compact GitHub Controls & Theme Switcher */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Sample Diffs Selector */}
        <div className="relative">
          <button
            onClick={() => {
              setIsSamplesOpen(!isSamplesOpen);
              setIsExportOpen(false);
            }}
            className="flex items-center gap-1.5 h-7 px-2.5 rounded-[6px] bg-white hover:bg-[#f3f4f6] dark:bg-[#21262d] dark:hover:bg-[#30363d] text-[#1f2328] dark:text-[#e6edf3] border border-[#d0d7de] dark:border-[#30363d] text-xs font-medium transition-colors whitespace-nowrap shrink-0"
            title="Try pre-built sample code diffs"
          >
            <FolderGit2 className="w-3.5 h-3.5 text-[#656d76] dark:text-[#8b949e]" />
            <span className="hidden sm:inline">Sample Diffs</span>
            <ChevronDown className="w-3 h-3 text-[#656d76] dark:text-[#8b949e]" />
          </button>

          {isSamplesOpen && (
            <div 
              className="absolute right-0 mt-1 w-64 p-1 bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-[6px] shadow-lg z-50 text-xs"
              onMouseLeave={() => setIsSamplesOpen(false)}
            >
              <div className="text-[11px] font-medium text-[#656d76] dark:text-[#8b949e] px-2 py-1 border-b border-[#d8dee4] dark:border-[#21262d]">
                Select a sample diff
              </div>
              <div className="mt-0.5 space-y-0.5">
                {SAMPLE_DIFFS.map((sample) => (
                  <button
                    key={sample.id}
                    onClick={() => {
                      onSelectSample(sample);
                      setIsSamplesOpen(false);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded-[4px] hover:bg-[#f6f8fa] dark:hover:bg-[#21262d] transition-colors flex flex-col"
                  >
                    <span className="font-medium text-[#1f2328] dark:text-[#e6edf3] truncate">{sample.title}</span>
                    <span className="text-[11px] text-[#656d76] dark:text-[#8b949e] truncate">{sample.badge}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Export Dropdown */}
        {currentReport && (
          <div className="relative">
            <button
              onClick={() => {
                setIsExportOpen(!isExportOpen);
                setIsSamplesOpen(false);
              }}
              className="flex items-center gap-1.5 h-7 px-2.5 rounded-[6px] bg-white hover:bg-[#f3f4f6] dark:bg-[#21262d] dark:hover:bg-[#30363d] text-[#1f2328] dark:text-[#e6edf3] border border-[#d0d7de] dark:border-[#30363d] text-xs font-medium transition-colors whitespace-nowrap shrink-0"
              title="Export review report"
            >
              <Download className="w-3.5 h-3.5 text-[#656d76] dark:text-[#8b949e]" />
              <span className="hidden sm:inline">Export</span>
              <ChevronDown className="w-3 h-3 text-[#656d76] dark:text-[#8b949e]" />
            </button>

            {isExportOpen && (
              <div 
                className="absolute right-0 mt-1 w-44 p-1 bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-[6px] shadow-lg z-50 text-xs"
                onMouseLeave={() => setIsExportOpen(false)}
              >
                <button
                  onClick={exportAsMarkdown}
                  className="w-full text-left px-2 py-1.5 rounded-[4px] hover:bg-[#f6f8fa] dark:hover:bg-[#21262d] transition-colors flex items-center gap-2 text-[#1f2328] dark:text-[#e6edf3]"
                >
                  <FileText className="w-3.5 h-3.5 text-[#656d76] dark:text-[#8b949e]" />
                  <span>Markdown (.md)</span>
                </button>
                <button
                  onClick={exportAsJSON}
                  className="w-full text-left px-2 py-1.5 rounded-[4px] hover:bg-[#f6f8fa] dark:hover:bg-[#21262d] transition-colors flex items-center gap-2 text-[#1f2328] dark:text-[#e6edf3]"
                >
                  <Download className="w-3.5 h-3.5 text-[#656d76] dark:text-[#8b949e]" />
                  <span>JSON (.json)</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* GitHub Light / Dark Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className="flex items-center gap-1.5 h-7 px-2.5 rounded-[6px] bg-white hover:bg-[#f3f4f6] dark:bg-[#21262d] dark:hover:bg-[#30363d] text-[#1f2328] dark:text-[#e6edf3] border border-[#d0d7de] dark:border-[#30363d] text-xs font-medium transition-colors whitespace-nowrap shrink-0"
          title={theme === 'dark' ? 'Switch to GitHub Light Theme' : 'Switch to GitHub Dark Theme'}
          aria-label={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-3.5 h-3.5 text-[#d29922]" />
              <span className="hidden md:inline">Light</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-[#656d76]" />
              <span className="hidden md:inline">Dark</span>
            </>
          )}
        </button>

        {/* GitHub Primary Green CTA Button */}
        <button
          onClick={onOpenUpload}
          disabled={isLoading}
          className="flex items-center gap-1 h-7 px-2.5 rounded-[6px] bg-[#1f883d] hover:bg-[#1a7f37] text-white dark:bg-[#238636] dark:hover:bg-[#2ea043] dark:text-white text-xs font-medium transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          {isLoading ? (
            <>
              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" />
              <span>New Review</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
