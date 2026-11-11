import React, { useState } from 'react';
import { 
  Menu, 
  Sun, 
  Moon, 
  Sparkles, 
  Download, 
  Upload, 
  ChevronDown, 
  GitPullRequest, 
  FileText
} from 'lucide-react';
import { SAMPLE_DIFFS, SampleDiff } from '../samples/diffSamples';
import { ReviewReport } from '../engine/types';
import { ActiveNavPage } from './Sidebar';

interface NavbarProps {
  activePage: ActiveNavPage;
  currentReport: ReviewReport | null;
  isLoading: boolean;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenUpload: () => void;
  onSelectSample: (sample: SampleDiff) => void;
  onOpenMobileSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activePage,
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
        return 'Dashboard';
      case 'diff':
        if (currentReport?.github_pr) {
          return `${currentReport.github_pr.owner}/${currentReport.github_pr.repo} #${currentReport.github_pr.pullNumber}`;
        }
        return currentReport?.diff_title || 'Review Workspace';
      case 'history':
        return 'Review History';
      case 'pipeline':
        return 'Pipeline Inspector';
      case 'architecture':
        return 'System Architecture';
      case 'settings':
        return 'Settings';
      default:
        return 'CodeSage AI';
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
    <header className="sticky top-0 z-30 h-14 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 flex items-center justify-between gap-3 select-none">
      {/* Left: Mobile hamburger & Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileSidebar}
          className="md:hidden p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
          aria-label="Open sidebar menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-mono truncate">
          <span className="hidden sm:inline">CodeSage</span>
          <span className="hidden sm:inline">/</span>
          <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
            {getPageTitle()}
          </span>
        </div>

        {/* Application Status Indicator */}
        <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-[11px] font-mono text-zinc-600 dark:text-zinc-400">
          <span className={`w-1.5 h-1.5 rounded-full ${isLoading ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
          <span>{isLoading ? 'Pipeline Active' : 'Ready'}</span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Curated Samples Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsSamplesOpen(!isSamplesOpen)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 text-xs font-medium transition-colors"
            title="Load sample diff fixtures"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">Samples</span>
            <ChevronDown className="w-3 h-3 text-zinc-400" />
          </button>

          {isSamplesOpen && (
            <div 
              className="absolute right-0 mt-1.5 w-64 p-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg z-50 text-xs"
              onMouseLeave={() => setIsSamplesOpen(false)}
            >
              <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 px-2 py-1">
                Curated Diff Fixtures
              </div>
              {SAMPLE_DIFFS.map((sample) => (
                <button
                  key={sample.id}
                  onClick={() => {
                    onSelectSample(sample);
                    setIsSamplesOpen(false);
                  }}
                  className="w-full text-left p-2 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex flex-col gap-0.5"
                >
                  <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{sample.title}</span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-1">{sample.badge}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Export Report Dropdown */}
        {currentReport && (
          <div className="relative">
            <button
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 text-xs font-medium transition-colors"
              title="Export report"
            >
              <Download className="w-3.5 h-3.5 text-zinc-500" />
              <span className="hidden sm:inline">Export</span>
              <ChevronDown className="w-3 h-3 text-zinc-400" />
            </button>

            {isExportOpen && (
              <div 
                className="absolute right-0 mt-1.5 w-44 p-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg z-50 text-xs"
                onMouseLeave={() => setIsExportOpen(false)}
              >
                <button
                  onClick={exportAsMarkdown}
                  className="w-full text-left px-2.5 py-1.5 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2 text-zinc-800 dark:text-zinc-200"
                >
                  <FileText className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Markdown (.md)</span>
                </button>
                <button
                  onClick={exportAsJSON}
                  className="w-full text-left px-2.5 py-1.5 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2 text-zinc-800 dark:text-zinc-200"
                >
                  <Download className="w-3.5 h-3.5 text-zinc-400" />
                  <span>JSON (.json)</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Theme Toggle Button */}
        <button
          onClick={onToggleTheme}
          className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors border border-zinc-200 dark:border-zinc-800"
          title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          aria-label={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-600" />}
        </button>

        {/* Upload Button */}
        <button
          onClick={onOpenUpload}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-xs font-medium transition-colors shadow-xs disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span className="hidden sm:inline">Analyzing...</span>
            </>
          ) : (
            <>
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Upload Diff</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
