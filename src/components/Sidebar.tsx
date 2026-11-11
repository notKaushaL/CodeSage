import React from 'react';
import { 
  ShieldCheck, 
  LayoutGrid, 
  GitPullRequest, 
  History, 
  SlidersHorizontal, 
  BookOpen, 
  Settings, 
  Plus, 
  PanelLeftClose, 
  PanelLeft, 
  X,
  FileCode2
} from 'lucide-react';
import { ReviewReport } from '../engine/types';

export type ActiveNavPage = 'dashboard' | 'diff' | 'pipeline' | 'history' | 'architecture' | 'settings';

interface SidebarProps {
  activePage: ActiveNavPage;
  onSelectPage: (page: ActiveNavPage) => void;
  onOpenUpload: () => void;
  onOpenGitHubModal: () => void;
  currentReport: ReviewReport | null;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onSelectPage,
  onOpenUpload,
  onOpenGitHubModal,
  currentReport,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}) => {
  const primaryNavItems: { id: ActiveNavPage; label: string; subtitle: string; icon: React.ReactNode; count?: number }[] = [
    {
      id: 'diff',
      label: 'Code Review',
      subtitle: 'Inspect files & issues',
      icon: <FileCode2 className="w-4 h-4 flex-shrink-0" />,
      count: currentReport ? currentReport.findings.length : undefined,
    },
    {
      id: 'dashboard',
      label: 'Quick Start',
      subtitle: 'Import PR or sample',
      icon: <LayoutGrid className="w-4 h-4 flex-shrink-0" />,
    },
    {
      id: 'history',
      label: 'Past Reviews',
      subtitle: 'Saved audit reports',
      icon: <History className="w-4 h-4 flex-shrink-0" />,
    },
  ];

  const secondaryNavItems: { id: ActiveNavPage; label: string; icon: React.ReactNode }[] = [
    {
      id: 'pipeline',
      label: 'Engine Metrics',
      icon: <SlidersHorizontal className="w-4 h-4 flex-shrink-0" />,
    },
    {
      id: 'architecture',
      label: 'How It Works',
      icon: <BookOpen className="w-4 h-4 flex-shrink-0" />,
    },
    {
      id: 'settings',
      label: 'Preferences',
      icon: <Settings className="w-4 h-4 flex-shrink-0" />,
    },
  ];

  const handleNavClick = (id: ActiveNavPage) => {
    onSelectPage(id);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-[#161b22] border-r border-[#e4e4e7] dark:border-[#30363d] select-none transition-colors">
      {/* Brand Header */}
      <div className="h-14 px-3.5 flex items-center justify-between border-b border-[#e4e4e7] dark:border-[#30363d]">
        <button
          onClick={() => handleNavClick('dashboard')}
          className="flex items-center gap-2.5 min-w-0 text-left focus:outline-none group"
        >
          <div className="w-7 h-7 rounded-md bg-[#171717] dark:bg-[#f0f6fc] flex items-center justify-center text-white dark:text-[#0d1117] flex-shrink-0 shadow-2xs">
            <ShieldCheck className="w-4 h-4" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <span className="font-semibold text-[13px] text-[#171717] dark:text-[#e6edf3] tracking-tight block truncate">
                CodeSage
              </span>
            </div>
          )}
        </button>

        {/* Desktop Collapse Toggle */}
        <button
          onClick={onToggleCollapse}
          className="hidden md:flex p-1.5 rounded-md hover:bg-[#f4f4f5] dark:hover:bg-[#21262d] text-[#71717a] dark:text-[#8b949e] hover:text-[#171717] dark:hover:text-[#e6edf3] transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>

        {/* Mobile Close Button */}
        <button
          onClick={onCloseMobile}
          className="md:hidden p-1.5 rounded-md hover:bg-[#f4f4f5] dark:hover:bg-[#2126f2]/10 text-[#52525b] dark:text-[#8b949e]"
          aria-label="Close sidebar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Primary Quick Actions */}
      <div className="p-3 space-y-2 border-b border-[#e4e4e7] dark:border-[#30363d]">
        <button
          onClick={() => {
            onOpenUpload();
            onCloseMobile();
          }}
          className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-md bg-[#171717] hover:bg-[#27272a] text-white dark:bg-[#238636] dark:hover:bg-[#2ea043] dark:text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
            isCollapsed ? 'px-2' : ''
          }`}
          title="New Diff Review (Paste or upload .diff)"
        >
          <Plus className="w-3.5 h-3.5 flex-shrink-0" />
          {!isCollapsed && <span>New Diff Review</span>}
        </button>

        <button
          onClick={() => {
            onOpenGitHubModal();
            onCloseMobile();
          }}
          className={`w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-md border border-[#d4d4d8] dark:border-[#30363d] bg-[#fafafa] hover:bg-[#f4f4f5] dark:bg-[#21262d] dark:hover:bg-[#30363d] text-[#171717] dark:text-[#e6edf3] text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
            isCollapsed ? 'px-2' : ''
          }`}
          title="Import Public GitHub Pull Request"
        >
          <GitPullRequest className="w-3.5 h-3.5 text-[#52525b] dark:text-[#8b949e] flex-shrink-0" />
          {!isCollapsed && <span>Import GitHub PR</span>}
        </button>
      </div>

      {/* Primary Workspace Navigation */}
      <div className="flex-1 px-2.5 py-3 space-y-5 overflow-y-auto">
        <div>
          {!isCollapsed && (
            <div className="px-2.5 pb-1.5 text-[11px] font-medium text-[#71717a] dark:text-[#8b949e]">
              Workspace
            </div>
          )}
          <nav className="space-y-1" aria-label="Primary Workspace Navigation">
            {primaryNavItems.map((item) => {
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-[#f4f4f5] dark:bg-[#21262d] text-[#171717] dark:text-[#e6edf3] font-semibold'
                      : 'text-[#52525b] dark:text-[#8b949e] hover:text-[#171717] dark:hover:text-[#e6edf3] hover:bg-[#fafafa] dark:hover:bg-[#1f242c]'
                  } ${isCollapsed ? 'justify-center px-2' : ''}`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <span className={isActive ? 'text-[#0969da] dark:text-[#2f81f7]' : ''}>
                    {item.icon}
                  </span>
                  {!isCollapsed && (
                    <span className="flex-1 text-left truncate">{item.label}</span>
                  )}
                  {!isCollapsed && item.count !== undefined && (
                    <span className="text-[11px] font-mono tabular-nums text-[#71717a] dark:text-[#8b949e]">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div>
          {!isCollapsed && (
            <div className="px-2.5 pb-1.5 text-[11px] font-medium text-[#71717a] dark:text-[#8b949e]">
              System & Guide
            </div>
          )}
          <nav className="space-y-1" aria-label="System Navigation">
            {secondaryNavItems.map((item) => {
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-[#f4f4f5] dark:bg-[#21262d] text-[#171717] dark:text-[#e6edf3] font-semibold'
                      : 'text-[#52525b] dark:text-[#8b949e] hover:text-[#171717] dark:hover:text-[#e6edf3] hover:bg-[#fafafa] dark:hover:bg-[#1f242c]'
                  } ${isCollapsed ? 'justify-center px-2' : ''}`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <span className={isActive ? 'text-[#0969da] dark:text-[#2f81f7]' : ''}>
                    {item.icon}
                  </span>
                  {!isCollapsed && (
                    <span className="flex-1 text-left truncate">{item.label}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Active Review Footer Summary */}
      {!isCollapsed && currentReport && (
        <div className="p-3 border-t border-[#e4e4e7] dark:border-[#30363d] bg-[#fafafa] dark:bg-[#0d1117]/60">
          <div className="text-[11px] text-[#71717a] dark:text-[#8b949e] truncate">
            Active review
          </div>
          <button
            onClick={() => handleNavClick('diff')}
            className="mt-0.5 text-xs font-medium text-[#171717] dark:text-[#e6edf3] hover:text-[#0969da] dark:hover:text-[#2f81f7] truncate block w-full text-left transition-colors"
          >
            {currentReport.diff_title || 'Git Diff Review'}
          </button>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[#71717a] dark:text-[#8b949e] font-mono tabular-nums">
            <span>Score {currentReport.summary.overall_risk_score}/100</span>
            <span>·</span>
            <span>{currentReport.summary.total_files_analyzed} files</span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden md:block flex-shrink-0 transition-all duration-150 ease-out z-20 ${
          isCollapsed ? 'w-14' : 'w-60'
        }`}
      >
        <div className="sticky top-0 h-screen">
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 md:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Mobile Drawer Panel */}
      <div
        className={`fixed inset-y-0 left-0 w-64 z-50 md:hidden transform transition-transform duration-150 ease-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </div>
    </>
  );
};
