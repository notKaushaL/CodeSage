import React, { useState, useEffect } from 'react';
import { Sidebar, ActiveNavPage } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { RiskMeter } from './components/RiskMeter';
import { FileSidebar } from './components/FileSidebar';
import { DiffViewer } from './components/DiffViewer';
import { DashboardView } from './components/DashboardView';
import { UploadModal } from './components/UploadModal';
import { GitHubImportModal } from './components/GitHubImportModal';
import { PipelineInspector } from './components/PipelineInspector';
import { ReviewHistoryView } from './components/ReviewHistoryView';
import { ArchitectureView } from './components/ArchitectureView';
import { SettingsModal } from './components/SettingsModal';
import { ReviewReport } from './engine/types';
import { SampleDiff } from './samples/diffSamples';
import { AlertCircle } from 'lucide-react';
import { INITIAL_SEED_REPORT } from './samples/initialReport';

const LOCAL_STORAGE_HISTORY_KEY = 'codesage_reviews_history_v1';
const LOCAL_STORAGE_THEME_KEY = 'codesage_theme';
const LOCAL_STORAGE_SIDEBAR_KEY = 'codesage_sidebar_collapsed';

export default function App() {
  const [activePage, setActivePage] = useState<ActiveNavPage>('diff');
  const [currentReport, setCurrentReport] = useState<ReviewReport | null>(INITIAL_SEED_REPORT);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSeverity, setSelectedSeverity] = useState<string | null>(null);
  const [activeFindingId, setActiveFindingId] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<ReviewReport[]>([INITIAL_SEED_REPORT]);
  const [defaultViewMode, setDefaultViewMode] = useState<'unified' | 'split'>('split');

  // Theme Management (Light / Dark)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_THEME_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch (e) {
      // fallback
    }
    return 'dark';
  });

  // Sidebar collapse state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(LOCAL_STORAGE_SIDEBAR_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Sync theme to DOM class on <html>
  useEffect(() => {
    try {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem(LOCAL_STORAGE_THEME_KEY, theme);
    } catch (e) {
      console.warn('Failed to sync theme to localStorage:', e);
    }
  }, [theme]);

  // Sync sidebar collapse state
  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(LOCAL_STORAGE_SIDEBAR_KEY, String(next));
      } catch (e) {
        // ignore
      }
      return next;
    });
  };

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setHistory(parsed);
          setCurrentReport(parsed[0]);
        }
      }
    } catch (e) {
      console.warn('Failed to load review history from localStorage:', e);
    }
  }, []);

  const saveReportToHistory = (report: ReviewReport) => {
    setHistory((prev) => {
      const updated = [report, ...prev.filter((r) => r.id !== report.id)].slice(0, 25);
      try {
        localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save to localStorage:', e);
      }
      return updated;
    });
  };

  const handleClearHistory = () => {
    try {
      localStorage.removeItem(LOCAL_STORAGE_HISTORY_KEY);
    } catch (e) {
      // ignore
    }
    setHistory([]);
  };

  const handleAnalyzeDiff = async (diffText: string, title?: string) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/v1/reviews/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diffText, title }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status}: Failed to analyze diff`);
      }

      const report: ReviewReport = await res.json();
      setCurrentReport(report);
      setSelectedFileIndex(0);
      setSelectedCategory(null);
      setSelectedSeverity(null);
      setActiveFindingId(null);
      saveReportToHistory(report);
      setActivePage('diff');
    } catch (err: any) {
      console.error('Error analyzing diff:', err);
      setErrorMessage(err.message || 'An error occurred during diff analysis.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSample = (sample: SampleDiff) => {
    setActiveFindingId(null);
    handleAnalyzeDiff(sample.rawDiff, sample.title);
  };

  const handleSelectHistoryReport = (report: ReviewReport) => {
    setCurrentReport(report);
    setSelectedFileIndex(0);
    setSelectedCategory(null);
    setSelectedSeverity(null);
    setActiveFindingId(null);
    setActivePage('diff');
  };

  const handleImportGitHubReport = (report: ReviewReport) => {
    setCurrentReport(report);
    setSelectedFileIndex(0);
    setSelectedCategory(null);
    setSelectedSeverity(null);
    setActiveFindingId(null);
    saveReportToHistory(report);
    setActivePage('diff');
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0d1117] text-[#1f2328] dark:text-[#e6edf3] flex font-sans selection:bg-[#0969da]/20 dark:selection:bg-[#2f81f7]/30 transition-colors">
      {/* Collapsible Application Sidebar */}
      <Sidebar
        activePage={activePage}
        onSelectPage={setActivePage}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenGitHubModal={() => setIsGitHubModalOpen(true)}
        currentReport={currentReport}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main View Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navigation */}
        <Navbar
          activePage={activePage}
          onSelectPage={setActivePage}
          currentReport={currentReport}
          isLoading={isLoading}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onOpenUpload={() => setIsUploadOpen(true)}
          onOpenGitHubModal={() => setIsGitHubModalOpen(true)}
          onSelectSample={handleSelectSample}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
        />

        {/* Compact Full-Width Workspace Body */}
        <main className="flex-1 w-full px-3 sm:px-4 py-3 flex flex-col gap-3">
          {/* Error Banner */}
          {errorMessage && (
            <div className="px-3 py-2 rounded-[6px] bg-[#ffebe9] dark:bg-[#f85149]/15 border border-[#cf222e]/30 dark:border-[#f85149]/40 text-[#cf222e] dark:text-[#f85149] text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-xs hover:underline font-medium flex-shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Loading Pipeline State Indicator */}
          {isLoading && (
            <div className="p-4 rounded-[6px] bg-[#f6f8fa] dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] flex items-center justify-center gap-3 text-xs">
              <div className="w-4 h-4 rounded-full border-2 border-[#d0d7de] dark:border-[#30363d] border-t-[#1f2328] dark:border-t-[#e6edf3] animate-spin" />
              <span className="font-medium text-[#1f2328] dark:text-[#e6edf3]">
                Analyzing code changes and aligning side-by-side diff...
              </span>
            </div>
          )}

          {/* View 1: Quick Start & Overview */}
          {activePage === 'dashboard' && (
            <DashboardView
              onOpenUpload={() => setIsUploadOpen(true)}
              onOpenGitHubModal={() => setIsGitHubModalOpen(true)}
              onSelectSample={handleSelectSample}
              onSelectReport={handleSelectHistoryReport}
              onImportGitHubSuccess={handleImportGitHubReport}
              history={history}
              currentReport={currentReport}
            />
          )}

          {/* View 2: Code Review Workspace (GitHub PR Files Changed Layout) */}
          {activePage === 'diff' && currentReport && (
            <div className="space-y-3 flex flex-col flex-1">
              {/* Compact PR Review Header & Severity Filter Toolbar */}
              <RiskMeter
                diffTitle={currentReport.diff_title}
                summary={currentReport.summary}
                githubPr={currentReport.github_pr}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                selectedSeverity={selectedSeverity}
                onSelectSeverity={setSelectedSeverity}
                onOpenUpload={() => setIsUploadOpen(true)}
                onOpenGitHubModal={() => setIsGitHubModalOpen(true)}
              />

              {/* Workspace Layout: Compact File Tree + Side-by-Side Diff Viewer */}
              <div className="flex flex-col lg:flex-row items-start gap-3 flex-1 min-w-0">
                <FileSidebar
                  files={currentReport.parsed_diff?.files || []}
                  findings={currentReport.findings}
                  selectedFileIndex={selectedFileIndex}
                  onSelectFile={(idx) => {
                    setSelectedFileIndex(idx);
                    setActiveFindingId(null);
                  }}
                  activeFindingId={activeFindingId}
                  onSelectFinding={(finding, fileIdx) => {
                    setSelectedFileIndex(fileIdx);
                    setActiveFindingId(finding.id);
                  }}
                />

                <DiffViewer
                  files={currentReport.parsed_diff?.files || []}
                  findings={currentReport.findings}
                  selectedFileIndex={selectedFileIndex}
                  onSelectFileIndex={setSelectedFileIndex}
                  selectedCategory={selectedCategory}
                  selectedSeverity={selectedSeverity}
                  activeFindingId={activeFindingId}
                  onSelectFindingId={setActiveFindingId}
                  theme={theme}
                  defaultViewMode={defaultViewMode}
                />
              </div>
            </div>
          )}

          {/* View 3: Past Reviews */}
          {activePage === 'history' && (
            <ReviewHistoryView
              history={history}
              onSelectReport={handleSelectHistoryReport}
              onClearHistory={handleClearHistory}
            />
          )}

          {/* View 4: Engine Metrics */}
          {activePage === 'pipeline' && (
            <PipelineInspector report={currentReport} />
          )}

          {/* View 5: How It Works */}
          {activePage === 'architecture' && <ArchitectureView />}

          {/* View 6: Preferences */}
          {activePage === 'settings' && (
            <SettingsModal
              theme={theme}
              onSelectTheme={setTheme}
              defaultViewMode={defaultViewMode}
              onSelectDefaultViewMode={setDefaultViewMode}
            />
          )}
        </main>
      </div>

      {/* Upload / Paste Diff Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSubmitDiff={handleAnalyzeDiff}
        onSwitchToGitHub={() => setIsGitHubModalOpen(true)}
        isLoading={isLoading}
      />

      {/* GitHub PR Import Modal */}
      <GitHubImportModal
        isOpen={isGitHubModalOpen}
        onClose={() => setIsGitHubModalOpen(false)}
        onImportSuccess={handleImportGitHubReport}
        onSwitchToUpload={() => setIsUploadOpen(true)}
      />
    </div>
  );
}
