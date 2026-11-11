import React, { useState } from 'react';
import { 
  FileCode, 
  FilePlus, 
  FileX, 
  Search,
  CornerDownRight,
  ShieldAlert,
  AlertTriangle,
  X
} from 'lucide-react';
import { DiffFile, Finding } from '../engine/types';

interface FileSidebarProps {
  files: DiffFile[];
  findings: Finding[];
  selectedFileIndex: number;
  onSelectFile: (index: number) => void;
}

export const FileSidebar: React.FC<FileSidebarProps> = ({
  files,
  findings,
  selectedFileIndex,
  onSelectFile,
}) => {
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

  return (
    <aside className="w-full lg:w-72 flex-shrink-0 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3.5 flex flex-col h-fit sticky top-20 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-zinc-200 dark:border-zinc-800">
        <h3 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
          <span>Changed Files</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
            {files.length}
          </span>
        </h3>
        <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono tabular-nums">
          {findings.length} {findings.length === 1 ? 'finding' : 'findings'}
        </span>
      </div>

      {/* Quick Search Filter */}
      {files.length > 2 && (
        <div className="mt-2.5 relative">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter files..."
            className="w-full pl-8 pr-7 py-1.5 bg-zinc-50 dark:bg-zinc-950 rounded border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-blue-500 font-mono"
          />
          {filterQuery && (
            <button
              onClick={() => setFilterQuery('')}
              className="absolute right-2 top-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              aria-label="Clear filter"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Files List */}
      <div className="mt-2 space-y-1 max-h-[calc(100vh-14rem)] overflow-y-auto pr-1">
        {filteredFilesWithIndices.length === 0 ? (
          <div className="p-4 text-center text-xs text-zinc-500">
            No files match "{filterQuery}"
          </div>
        ) : (
          filteredFilesWithIndices.map(({ file, originalIndex }) => {
            const fileFindings = getFileFindings(file);
            const hasCritical = fileFindings.some((f) => f.severity === 'CRITICAL');
            const hasHigh = fileFindings.some((f) => f.severity === 'HIGH');
            const isSelected = selectedFileIndex === originalIndex;

            // Determine status label and style
            let statusBadge = (
              <span className="text-[9px] font-mono font-semibold px-1 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                M
              </span>
            );
            let statusIcon = <FileCode className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 flex-shrink-0" />;

            if (file.isNew) {
              statusBadge = (
                <span className="text-[9px] font-mono font-semibold px-1 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  A
                </span>
              );
              statusIcon = <FilePlus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />;
            } else if (file.isDeleted) {
              statusBadge = (
                <span className="text-[9px] font-mono font-semibold px-1 py-0.2 rounded bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
                  D
                </span>
              );
              statusIcon = <FileX className="w-3.5 h-3.5 text-red-600 dark:text-red-400 flex-shrink-0" />;
            } else if (file.isRename) {
              statusBadge = (
                <span className="text-[9px] font-mono font-semibold px-1 py-0.2 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                  R
                </span>
              );
              statusIcon = <CornerDownRight className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />;
            }

            return (
              <button
                key={originalIndex}
                data-testid={`file-sidebar-item-${originalIndex}`}
                onClick={() => onSelectFile(originalIndex)}
                className={`w-full text-left p-2.5 rounded border transition-colors flex flex-col gap-1 ${
                  isSelected
                    ? 'bg-blue-50/80 dark:bg-blue-950/30 border-blue-400 dark:border-blue-800/80 text-blue-900 dark:text-blue-100'
                    : 'bg-white dark:bg-zinc-900/60 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {statusIcon}
                    <span className="text-xs font-mono font-medium truncate">
                      {file.newPath !== '/dev/null' ? file.newPath : file.oldPath}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {statusBadge}
                    {fileFindings.length > 0 && (
                      <span
                        className={`text-[10px] font-mono px-1 py-0.2 rounded font-medium flex items-center gap-0.5 ${
                          hasCritical
                            ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                            : hasHigh
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'
                        }`}
                        title={`${fileFindings.length} findings`}
                      >
                        {hasCritical ? (
                          <ShieldAlert className="w-2.5 h-2.5 text-red-600 dark:text-red-400" />
                        ) : hasHigh ? (
                          <AlertTriangle className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                        ) : null}
                        <span>{fileFindings.length}</span>
                      </span>
                    )}
                  </div>
                </div>

                {file.isRename && (
                  <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 truncate pl-5">
                    from {file.oldPath}
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 pt-0.5">
                  <span className="text-[10px]">{file.language}</span>
                  <div className="flex items-center gap-1.5 font-mono text-[10px]">
                    {file.addedLineCount > 0 && (
                      <span className="text-emerald-700 dark:text-emerald-400 font-medium">+{file.addedLineCount}</span>
                    )}
                    {file.deletedLineCount > 0 && (
                      <span className="text-red-700 dark:text-red-400 font-medium">-{file.deletedLineCount}</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
};
