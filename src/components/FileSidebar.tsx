import React, { useState } from 'react';
import { 
  FileCode, 
  FilePlus, 
  FileX, 
  Search,
  CornerDownRight,
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  X
} from 'lucide-react';
import { DiffFile, Finding } from '../engine/types';

interface FileSidebarProps {
  files: DiffFile[];
  findings: Finding[];
  selectedFileIndex: number;
  onSelectFile: (index: number) => void;
  activeFindingId?: string | null;
  onSelectFinding?: (finding: Finding, fileIndex: number) => void;
}

export const FileSidebar: React.FC<FileSidebarProps> = ({
  files,
  findings,
  selectedFileIndex,
  onSelectFile,
  activeFindingId,
  onSelectFinding,
}) => {
  const [activeTab, setActiveTab] = useState<'files' | 'issues'>('files');
  const [filterQuery, setFilterQuery] = useState('');

  const getFileFindings = (file: DiffFile) => {
    return findings.filter(
      (f) => f.file_path === file.newPath || f.file_path === file.oldPath
    );
  };

  const filteredFilesWithIndices = files
    .map((file, originalIndex) => ({ file, originalIndex }))
    .filter(({ file }) => {
      if (!filterQuery.trim()) return true;
      const q = filterQuery.toLowerCase();
      const path = (file.newPath !== '/dev/null' ? file.newPath : file.oldPath).toLowerCase();
      const lang = (file.language || '').toLowerCase();
      return path.includes(q) || lang.includes(q);
    });

  const filteredFindings = findings.filter((f) => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    return (
      f.title.toLowerCase().includes(q) ||
      f.file_path.toLowerCase().includes(q) ||
      f.severity.toLowerCase().includes(q)
    );
  });

  const handleIssueClick = (finding: Finding) => {
    const fileIdx = files.findIndex(
      (f) => f.newPath === finding.file_path || f.oldPath === finding.file_path
    );
    const targetFileIdx = fileIdx >= 0 ? fileIdx : 0;

    if (onSelectFinding) {
      onSelectFinding(finding, targetFileIdx);
    } else {
      onSelectFile(targetFileIdx);
    }

    setTimeout(() => {
      const findingEl = document.getElementById(`finding-${finding.id}`);
      if (findingEl) {
        findingEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        const lineEl = document.getElementById(`line-new-${finding.line_number}`);
        if (lineEl) {
          lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }, 80);
  };

  return (
    <aside className="w-full lg:w-72 flex-shrink-0 bg-white dark:bg-[#161b22] rounded-lg border border-[#e4e4e7] dark:border-[#30363d] flex flex-col h-fit sticky top-20 overflow-hidden transition-colors">
      {/* Segmented Tab Switcher: Files vs Issues */}
      <div className="p-2.5 border-b border-[#e4e4e7] dark:border-[#30363d] bg-[#fafafa] dark:bg-[#0d1117]/60">
        <div className="grid grid-cols-2 p-0.5 rounded-md bg-[#e4e4e7]/70 dark:bg-[#0d1117] border border-[#e4e4e7] dark:border-[#30363d] text-xs">
          <button
            onClick={() => setActiveTab('files')}
            className={`py-1.5 px-2.5 rounded font-medium transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'files'
                ? 'bg-white dark:bg-[#21262d] text-[#171717] dark:text-[#e6edf3] shadow-2xs font-semibold'
                : 'text-[#52525b] dark:text-[#8b949e] hover:text-[#171717] dark:hover:text-[#e6edf3]'
            }`}
          >
            <span>Files</span>
            <span className="font-mono text-[11px] tabular-nums text-[#71717a] dark:text-[#8b949e]">
              ({files.length})
            </span>
          </button>

          <button
            onClick={() => setActiveTab('issues')}
            className={`py-1.5 px-2.5 rounded font-medium transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'issues'
                ? 'bg-white dark:bg-[#21262d] text-[#171717] dark:text-[#e6edf3] shadow-2xs font-semibold'
                : 'text-[#52525b] dark:text-[#8b949e] hover:text-[#171717] dark:hover:text-[#e6edf3]'
            }`}
          >
            <span>Issues</span>
            <span className="font-mono text-[11px] tabular-nums text-[#71717a] dark:text-[#8b949e]">
              ({findings.length})
            </span>
          </button>
        </div>

        {/* Search Input */}
        {(files.length > 1 || findings.length > 2) && (
          <div className="mt-2 relative">
            <Search className="w-3.5 h-3.5 text-[#71717a] dark:text-[#8b949e] absolute left-2.5 top-2" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder={activeTab === 'files' ? 'Filter files...' : 'Filter issues...'}
              className="w-full pl-8 pr-7 py-1 bg-white dark:bg-[#0d1117] rounded-md border border-[#d4d4d8] dark:border-[#30363d] text-xs text-[#171717] dark:text-[#e6edf3] placeholder-[#71717a] dark:placeholder-[#6e7681] focus:outline-none focus:border-[#0969da] dark:focus:border-[#2f81f7] font-mono"
            />
            {filterQuery && (
              <button
                onClick={() => setFilterQuery('')}
                className="absolute right-2 top-1.5 text-[#71717a] hover:text-[#171717] dark:hover:text-[#e6edf3]"
                aria-label="Clear filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tab 1: Changed Files Tree */}
      {activeTab === 'files' ? (
        <div className="divide-y divide-[#f4f4f5] dark:divide-[#21262d] max-h-[calc(100vh-15rem)] overflow-y-auto">
          {filteredFilesWithIndices.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#71717a] dark:text-[#8b949e]">
              No files match "{filterQuery}"
            </div>
          ) : (
            filteredFilesWithIndices.map(({ file, originalIndex }) => {
              const fileFindings = getFileFindings(file);
              const hasCritical = fileFindings.some((f) => f.severity === 'CRITICAL');
              const hasHigh = fileFindings.some((f) => f.severity === 'HIGH');
              const isSelected = selectedFileIndex === originalIndex;

              const fullPath = file.newPath !== '/dev/null' ? file.newPath : file.oldPath;
              const parts = fullPath.split('/');
              const fileName = parts.pop() || fullPath;
              const dirPath = parts.length > 0 ? parts.join('/') + '/' : '';

              let statusIcon = <FileCode className="w-3.5 h-3.5 text-[#71717a] dark:text-[#8b949e] flex-shrink-0" />;
              if (file.isNew) {
                statusIcon = <FilePlus className="w-3.5 h-3.5 text-[#1a7f37] dark:text-[#3fb950] flex-shrink-0" />;
              } else if (file.isDeleted) {
                statusIcon = <FileX className="w-3.5 h-3.5 text-[#cf222e] dark:text-[#f85149] flex-shrink-0" />;
              } else if (file.isRename) {
                statusIcon = <CornerDownRight className="w-3.5 h-3.5 text-[#d97706] dark:text-[#d29922] flex-shrink-0" />;
              }

              return (
                <button
                  key={originalIndex}
                  data-testid={`file-sidebar-item-${originalIndex}`}
                  onClick={() => onSelectFile(originalIndex)}
                  className={`w-full text-left px-3 py-2.5 transition-colors flex flex-col gap-1 ${
                    isSelected
                      ? 'bg-[#0969da]/8 dark:bg-[#2f81f7]/15 text-[#171717] dark:text-[#e6edf3]'
                      : 'hover:bg-[#fafafa] dark:hover:bg-[#1f242c] text-[#52525b] dark:text-[#8b949e]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      {statusIcon}
                      <div className="min-w-0 truncate font-mono text-xs">
                        {dirPath && (
                          <span className="text-[#71717a] dark:text-[#6e7681]">{dirPath}</span>
                        )}
                        <span className={isSelected ? 'font-semibold text-[#0969da] dark:text-[#58a6ff]' : 'font-medium text-[#171717] dark:text-[#e6edf3]'}>
                          {fileName}
                        </span>
                      </div>
                    </div>

                    {fileFindings.length > 0 && (
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-mono tabular-nums font-medium flex-shrink-0 ${
                          hasCritical
                            ? 'text-[#cf222e] dark:text-[#f85149]'
                            : hasHigh
                            ? 'text-[#d97706] dark:text-[#d29922]'
                            : 'text-[#71717a] dark:text-[#8b949e]'
                        }`}
                        title={`${fileFindings.length} issues in this file`}
                      >
                        {hasCritical ? (
                          <ShieldAlert className="w-3 h-3" />
                        ) : hasHigh ? (
                          <AlertTriangle className="w-3 h-3" />
                        ) : null}
                        <span>{fileFindings.length}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pl-5 text-[11px] text-[#71717a] dark:text-[#6e7681] font-mono tabular-nums">
                    <span>{file.language}</span>
                    <div className="flex items-center gap-1.5">
                      {file.addedLineCount > 0 && (
                        <span className="text-[#1a7f37] dark:text-[#3fb950]">+{file.addedLineCount}</span>
                      )}
                      {file.deletedLineCount > 0 && (
                        <span className="text-[#cf222e] dark:text-[#f85149]">-{file.deletedLineCount}</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      ) : (
        /* Tab 2: Direct Issues List for 1-Click Jump */
        <div className="divide-y divide-[#f4f4f5] dark:divide-[#21262d] max-h-[calc(100vh-15rem)] overflow-y-auto">
          {filteredFindings.length === 0 ? (
            <div className="p-6 text-center space-y-1.5">
              <CheckCircle2 className="w-6 h-6 text-[#1a7f37] dark:text-[#3fb950] mx-auto" />
              <p className="text-xs font-medium text-[#171717] dark:text-[#e6edf3]">No issues detected</p>
              <p className="text-[11px] text-[#71717a] dark:text-[#8b949e]">
                All lines in this diff passed static and AI analysis.
              </p>
            </div>
          ) : (
            filteredFindings.map((finding) => {
              const isSelected = activeFindingId === finding.id;
              const isCrit = finding.severity === 'CRITICAL';
              const isHigh = finding.severity === 'HIGH';

              return (
                <button
                  key={finding.id}
                  onClick={() => handleIssueClick(finding)}
                  className={`w-full text-left px-3 py-2.5 transition-colors flex flex-col gap-1 ${
                    isSelected
                      ? 'bg-[#0969da]/10 dark:bg-[#2f81f7]/15'
                      : 'hover:bg-[#fafafa] dark:hover:bg-[#1f242c]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {isCrit ? (
                        <ShieldAlert className="w-3.5 h-3.5 text-[#cf222e] dark:text-[#f85149] flex-shrink-0" />
                      ) : isHigh ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-[#d97706] dark:text-[#d29922] flex-shrink-0" />
                      ) : (
                        <Info className="w-3.5 h-3.5 text-[#0969da] dark:text-[#58a6ff] flex-shrink-0" />
                      )}
                      <span className="text-xs font-medium text-[#171717] dark:text-[#e6edf3] truncate">
                        {finding.title}
                      </span>
                    </div>
                  </div>
                  <div className="pl-5 flex items-center gap-1.5 text-[11px] text-[#71717a] dark:text-[#8b949e] font-mono truncate">
                    <span className="truncate">{finding.file_path.split('/').pop()}</span>
                    <span>·</span>
                    <span className="flex-shrink-0">Line {finding.line_number}</span>
                    <span>·</span>
                    <span className={`flex-shrink-0 ${
                      isCrit ? 'text-[#cf222e] dark:text-[#f85149]' : isHigh ? 'text-[#d97706] dark:text-[#d29922]' : ''
                    }`}>
                      {finding.severity}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </aside>
  );
};
