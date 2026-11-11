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
import { SAMPLE_DIFFS, SampleDiff } from './samples/diffSamples';
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
  const [defaultViewMode, setDefaultViewMode] = useState<'unified' | 'split'>('unified');

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

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex font-sans selection:bg-blue-500/20 selection:text-blue-900 dark:selection:text-blue-200">
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
          currentReport={currentReport}
          isLoading={isLoading}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onOpenUpload={() => setIsUploadOpen(true)}
          onSelectSample={handleSelectSample}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
        />

        {/* Content Body */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-5">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-xs text-red-600 dark:text-red-400 hover:underline font-medium flex-shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Loading Pipeline State Indicator */}
          {isLoading && (
            <div className="p-5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-zinc-300 dark:border-zinc-700 border-t-zinc-900 dark:border-t-zinc-100 animate-spin" />
              <div>
                <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  Executing 5-Stage Hybrid Review Pipeline
                </h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Unidiff Lexer → Security Rules → Smart Chunker → Gemini 3.8 Flash → Risk Scorer
                </p>
              </div>
            </div>
          )}

          {/* View 1: Dashboard / Welcome Page */}
          {activePage === 'dashboard' && (
            <DashboardView
              onOpenUpload={() => setIsUploadOpen(true)}
              onOpenGitHubModal={() => setIsGitHubModalOpen(true)}
              onSelectSample={handleSelectSample}
              onSelectReport={handleSelectHistoryReport}
              history={history}
              currentReport={currentReport}
            />
          )}

          {/* View 2: Review Workspace */}
          {activePage === 'diff' && currentReport && (
            <div className="space-y-4 flex flex-col flex-1">
              {/* Review Header & Summary */}
              <RiskMeter
                summary={currentReport.summary}
                githubPr={currentReport.github_pr}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                selectedSeverity={selectedSeverity}
                onSelectSeverity={setSelectedSeverity}
              />

              {/* Workspace Layout: Changed Files Sidebar + Diff Viewer */}
              <div className="flex flex-col lg:flex-row items-start gap-4 flex-1">
                <FileSidebar
                  files={currentReport.parsed_diff?.files || []}
                  findings={currentReport.findings}
                  selectedFileIndex={selectedFileIndex}
                  onSelectFile={(idx) => {
                    setSelectedFileIndex(idx);
                    setActiveFindingId(null);
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
                />
              </div>
            </div>
          )}

          {/* View 3: Review History */}
          {activePage === 'history' && (
            <ReviewHistoryView
              history={history}
              onSelectReport={handleSelectHistoryReport}
              onClearHistory={handleClearHistory}
            />
          )}

          {/* View 4: Pipeline Inspector */}
          {activePage === 'pipeline' && (
            <PipelineInspector report={currentReport} />
          )}

          {/* View 5: Architecture */}
          {activePage === 'architecture' && <ArchitectureView />}

          {/* View 6: Settings */}
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

      {/* Upload Diff Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSubmitDiff={handleAnalyzeDiff}
        isLoading={isLoading}
      />

      {/* GitHub PR Import Modal (Public PRs only) */}
      <GitHubImportModal
        isOpen={isGitHubModalOpen}
        onClose={() => setIsGitHubModalOpen(false)}
        onImportSuccess={(report) => {
          setCurrentReport(report);
          setSelectedFileIndex(0);
          setSelectedCategory(null);
          setSelectedSeverity(null);
          setActiveFindingId(null);
          saveReportToHistory(report);
          setActivePage('diff');
        }}
      />
    </div>
  );
}
