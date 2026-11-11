import React from 'react';
import { 
  ShieldCheck, 
  LayoutGrid, 
  GitPullRequest, 
  History, 
  SlidersHorizontal, 
  BookOpen, 
  Settings, 
  Upload, 
  PanelLeftClose, 
  PanelLeft, 
  X
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
  const navItems: { id: ActiveNavPage; label: string; icon: React.ReactNode; badge?: string | number }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutGrid className="w-4 h-4 flex-shrink-0" />,
    },
    {
      id: 'diff',
      label: 'Review Workspace',
      icon: <GitPullRequest className="w-4 h-4 flex-shrink-0" />,
      badge: currentReport ? currentReport.findings.length : undefined,
    },
    {
      id: 'history',
      label: 'Review History',
      icon: <History className="w-4 h-4 flex-shrink-0" />,
    },
    {
      id: 'pipeline',
      label: 'Pipeline Inspector',
      icon: <SlidersHorizontal className="w-4 h-4 flex-shrink-0" />,
    },
    {
      id: 'architecture',
      label: 'Architecture',
      icon: <BookOpen className="w-4 h-4 flex-shrink-0" />,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-4 h-4 flex-shrink-0" />,
    },
  ];

  const handleNavClick = (id: ActiveNavPage) => {
    onSelectPage(id);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 select-none">
      {/* Brand Header */}
      <div className="h-14 px-3.5 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900 flex-shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 tracking-tight block truncate">
                CodeSage AI
              </span>
              <span className="text-[10px] text-zinc-500 font-mono block">
                Diff Reviewer
              </span>
            </div>
          )}
        </div>

        {/* Desktop Collapse Toggle */}
        <button
          onClick={onToggleCollapse}
          className="hidden md:flex p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>

        {/* Mobile Close Button */}
        <button
          onClick={onCloseMobile}
          className="md:hidden p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
          aria-label="Close sidebar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Primary Action: New Review */}
      <div className="p-2.5">
        <button
          onClick={() => {
            onOpenUpload();
            onCloseMobile();
          }}
          className={`w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-xs font-medium transition-colors shadow-xs ${
            isCollapsed ? 'px-1.5' : ''
          }`}
          title="New Review (Upload or paste diff)"
        >
          <Upload className="w-3.5 h-3.5 flex-shrink-0" />
          {!isCollapsed && <span>New Review</span>}
        </button>
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-2 py-1 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
              } ${isCollapsed ? 'justify-center px-2' : ''}`}
              title={isCollapsed ? item.label : undefined}
            >
              {item.icon}
              {!isCollapsed && (
                <span className="flex-1 text-left truncate">{item.label}</span>
              )}
              {!isCollapsed && item.badge !== undefined && (
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                  isActive
                    ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Quick Public PR Import Button in Sidebar */}
      <div className="p-2.5 border-t border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => {
            onOpenGitHubModal();
            onCloseMobile();
          }}
          className={`w-full flex items-center gap-2 py-1.5 px-2.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs transition-colors ${
            isCollapsed ? 'justify-center px-1.5' : ''
          }`}
          title="Import Public GitHub Pull Request"
        >
          <GitPullRequest className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
          {!isCollapsed && <span className="truncate">Import GitHub PR</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden md:block flex-shrink-0 transition-all duration-200 ease-in-out z-20 ${
          isCollapsed ? 'w-14' : 'w-56'
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
        className={`fixed inset-y-0 left-0 w-64 z-50 md:hidden transform transition-transform duration-200 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </div>
    </>
  );
};
