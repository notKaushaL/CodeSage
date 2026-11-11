import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Columns, 
  AlignJustify, 
  FileCode, 
  ChevronLeft, 
  ChevronRight, 
  Keyboard, 
  X,
  Target
} from 'lucide-react';
import { DiffFile, DiffHunk, DiffLine, Finding } from '../engine/types';
import { InlineFindingCard } from './InlineFindingCard';
import { alignSplitDiffHunk, SplitDiffRow } from '../engine/splitAligner';
import { 
  resolveLanguageId, 
  highlightLines, 
  getCachedLineTokens,
  HighlightedToken, 
  SupportedLang 
} from '../utils/highlighter';
import { 
  getOrderedFindings, 
  getNextFindingIndex, 
  getPrevFindingIndex, 
  isEditableElement,
  OrderedFinding 
} from '../utils/navigation';

interface DiffViewerProps {
  files: DiffFile[];
  findings: Finding[];
  selectedFileIndex: number;
  onSelectFileIndex?: (index: number) => void;
  selectedCategory: string | null;
  selectedSeverity: string | null;
  activeFindingId?: string | null;
  onSelectFindingId?: (id: string | null) => void;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  files,
  findings,
  selectedFileIndex,
  onSelectFileIndex,
  selectedCategory,
  selectedSeverity,
  activeFindingId: propActiveFindingId,
  onSelectFindingId: propOnSelectFindingId,
}) => {
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified');
  const [localActiveFindingId, setLocalActiveFindingId] = useState<string | null>(null);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [highlightedTokensMap, setHighlightedTokensMap] = useState<Map<string, HighlightedToken[]>>(new Map());

  const activeFindingId = propActiveFindingId !== undefined ? propActiveFindingId : localActiveFindingId;
  const setActiveFindingId = (id: string | null) => {
    if (propOnSelectFindingId) {
      propOnSelectFindingId(id);
    } else {
      setLocalActiveFindingId(id);
    }
  };

  const activeFile = files[selectedFileIndex] || files[0];
  const diffContainerRef = useRef<HTMLDivElement>(null);

  // Ordered findings across all files for sequential navigation
  const allOrderedFindings = useMemo(
    () => getOrderedFindings(files, findings, selectedCategory, selectedSeverity),
    [files, findings, selectedCategory, selectedSeverity]
  );

  const currentFindingIdx = useMemo(() => {
    if (!activeFindingId) return -1;
    return allOrderedFindings.findIndex((o) => o.finding.id === activeFindingId);
  }, [activeFindingId, allOrderedFindings]);

  // Filter findings for this active file
  const fileFindings = useMemo(() => {
    if (!activeFile) return [];
    return findings.filter((f) => {
      const isTarget = f.file_path === activeFile.newPath || f.file_path === activeFile.oldPath;
      if (!isTarget) return false;
      if (selectedCategory && f.category !== selectedCategory) return false;
      if (selectedSeverity && f.severity !== selectedSeverity) return false;
      return true;
    });
  }, [activeFile, findings, selectedCategory, selectedSeverity]);

  // Index findings by line number for rapid inline lookup
  const findingsByLineNumber = useMemo(() => {
    const map = new Map<number, Finding[]>();
    for (const f of fileFindings) {
      const existing = map.get(f.line_number) || [];
      existing.push(f);
      map.set(f.line_number, existing);
    }
    return map;
  }, [fileFindings]);

  // Detect normalized Shiki language
  const detectedLangId = useMemo(() => {
    if (!activeFile) return null;
    const path = activeFile.newPath !== '/dev/null' ? activeFile.newPath : activeFile.oldPath;
    return resolveLanguageId(activeFile.language, path);
  }, [activeFile]);

  // Asynchronously tokenize active file lines using Shiki without blocking the UI
  useEffect(() => {
    if (!activeFile || !detectedLangId) return;

    let isCancelled = false;
    const allFileLines: string[] = [];

    // Collect all unique line contents from hunks
    for (const hunk of activeFile.hunks) {
      for (const line of hunk.lines) {
        allFileLines.push(line.content);
      }
    }

    if (allFileLines.length === 0) return;

    highlightLines(allFileLines, detectedLangId)
      .then((tokenizedLines) => {
        if (isCancelled) return;
        setHighlightedTokensMap((prev) => {
          const next = new Map(prev);
          allFileLines.forEach((lineText, idx) => {
            const tokens = tokenizedLines[idx];
            if (tokens) {
              next.set(`${detectedLangId}:${lineText}`, tokens);
            }
          });
          return next;
        });
      })
      .catch((err) => {
        console.warn('Syntax highlighting background task caught:', err);
      });

    return () => {
      isCancelled = true;
    };
  }, [activeFile, detectedLangId]);

  // Helper to render tokenized code line with Shiki styling or fallback
  const renderLineContent = (content: string) => {
    if (!content) {
      return <span>&nbsp;</span>;
    }

    if (detectedLangId) {
      const tokens = highlightedTokensMap.get(`${detectedLangId}:${content}`) || getCachedLineTokens(content, detectedLangId);
      if (tokens && tokens.length > 0) {
        return (
          <>
            {tokens.map((token, tIdx) => (
              <span
                key={tIdx}
                style={{
                  color: token.color,
                  fontStyle: token.fontStyle === 1 ? 'italic' : undefined,
                }}
              >
                {token.content}
              </span>
            ))}
          </>
        );
      }
    }

    // Default plain text fallback
    return <span>{content}</span>;
  };

  // Jump to specific finding and scroll into view
  const jumpToFindingByIndex = (idx: number) => {
    if (idx < 0 || idx >= allOrderedFindings.length) return;
    const target = allOrderedFindings[idx];

    // If target finding is in a different file, notify parent to select that file
    if (target.fileIndex !== selectedFileIndex && onSelectFileIndex) {
      onSelectFileIndex(target.fileIndex);
    }

    setActiveFindingId(target.finding.id);

    // Smooth scroll to target element
    setTimeout(() => {
      const findingEl = document.getElementById(`finding-${target.finding.id}`);
      if (findingEl) {
        findingEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        const lineEl = document.getElementById(`line-new-${target.lineNumber}`);
        if (lineEl) {
          lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }, 80);
  };

  const handleNextFinding = () => {
    const nextIdx = getNextFindingIndex(currentFindingIdx, allOrderedFindings.length);
    jumpToFindingByIndex(nextIdx);
  };

  const handlePrevFinding = () => {
    const prevIdx = getPrevFindingIndex(currentFindingIdx, allOrderedFindings.length);
    jumpToFindingByIndex(prevIdx);
  };

  const handleClearFinding = () => {
    setActiveFindingId(null);
  };

  // Global Keyboard Navigation (j, k, Esc, u, s, ?) with strict input suppression
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditableElement(e.target)) {
        return;
      }

      if (e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        handleNextFinding();
      } else if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        handlePrevFinding();
      } else if (e.key === 'Escape') {
        handleClearFinding();
        setShowShortcutsModal(false);
      } else if (e.key === 'u' || e.key === 'U') {
        setViewMode('unified');
      } else if (e.key === 's' || e.key === 'S') {
        setViewMode('split');
      } else if (e.key === '?') {
        e.preventDefault();
        setShowShortcutsModal((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [allOrderedFindings, currentFindingIdx, selectedFileIndex, onSelectFileIndex]);

  if (!activeFile) {
    return (
      <div className="flex-1 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-12 text-center text-zinc-500">
        <FileCode className="w-10 h-10 mx-auto text-zinc-400 mb-2.5" />
        <p className="text-sm font-medium">No modified files to display in this review run.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm flex flex-col relative">
      {/* File & Navigation Header Bar */}
      <div className="bg-zinc-50 dark:bg-zinc-950 px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
        {/* Left: File metadata */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded bg-zinc-200/60 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 flex-shrink-0">
            <FileCode className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                {activeFile.newPath !== '/dev/null' ? activeFile.newPath : activeFile.oldPath}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">
                {detectedLangId ? `${activeFile.language} (Shiki)` : activeFile.language}
              </span>
            </div>
            {activeFile.isRename && (
              <span className="text-[11px] text-zinc-500 font-mono">
                renamed from {activeFile.oldPath}
              </span>
            )}
          </div>
        </div>

        {/* Right: Finding Navigation & View Mode Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Finding Navigator Controls */}
          {allOrderedFindings.length > 0 && (
            <div className="flex items-center bg-white dark:bg-zinc-900 p-0.5 rounded border border-zinc-200 dark:border-zinc-700 text-xs">
              <button
                onClick={handlePrevFinding}
                className="p-1 rounded text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Previous finding (k)"
                aria-label="Previous finding"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <span className="px-2 text-[11px] font-mono font-medium text-zinc-700 dark:text-zinc-300 select-none">
                {currentFindingIdx >= 0 ? (
                  <span>
                    Finding <strong className="text-blue-600 dark:text-blue-400">{currentFindingIdx + 1}</strong> of{' '}
                    {allOrderedFindings.length}
                  </span>
                ) : (
                  <span>
                    {allOrderedFindings.length} {allOrderedFindings.length === 1 ? 'Finding' : 'Findings'}
                  </span>
                )}
              </span>

              <button
                onClick={handleNextFinding}
                className="p-1 rounded text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Next finding (j)"
                aria-label="Next finding"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {activeFindingId && (
                <button
                  onClick={handleClearFinding}
                  className="p-1 rounded text-zinc-400 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border-l border-zinc-200 dark:border-zinc-700 ml-0.5"
                  title="Clear finding focus (Esc)"
                  aria-label="Clear active finding"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Unified vs Split Mode Switcher */}
          <div className="flex items-center bg-white dark:bg-zinc-900 p-0.5 rounded border border-zinc-200 dark:border-zinc-700 text-xs">
            <button
              onClick={() => setViewMode('unified')}
              className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${
                viewMode === 'unified'
                  ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium shadow-xs'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
              title="Unified diff view (u)"
            >
              <AlignJustify className="w-3.5 h-3.5" />
              <span>Unified</span>
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${
                viewMode === 'split'
                  ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium shadow-xs'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
              title="Split side-by-side diff view (s)"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Split</span>
            </button>
          </div>

          {/* Keyboard Shortcuts Help Button */}
          <button
            onClick={() => setShowShortcutsModal(true)}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
            title="Keyboard Shortcuts (?)"
            aria-label="View Keyboard Shortcuts"
          >
            <Keyboard className="w-3.5 h-3.5 text-zinc-500" />
            <span className="hidden sm:inline">Shortcuts</span>
          </button>

          {/* Diff Stats Badge */}
          <div className="text-xs font-mono px-2 py-1 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">+{activeFile.addedLineCount}</span>{' '}
            <span className="text-red-700 dark:text-red-400 font-semibold">-{activeFile.deletedLineCount}</span>
          </div>
        </div>
      </div>

      {/* Diff Content Body */}
      <div 
        ref={diffContainerRef}
        className="overflow-x-auto divide-y divide-zinc-200 dark:divide-zinc-800 font-mono text-xs max-h-[calc(100vh-14rem)] overflow-y-auto bg-white dark:bg-zinc-950"
      >
        {activeFile.hunks.map((hunk, hunkIdx) => {
          return (
            <div key={hunkIdx} className="bg-white dark:bg-zinc-950">
              {/* Hunk Header */}
              <div className="bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 px-4 py-1.5 border-y border-zinc-200 dark:border-zinc-800 flex items-center justify-between font-mono text-[11px] select-none sticky top-0 z-10">
                <span className="font-semibold text-blue-700 dark:text-blue-400">{hunk.header}</span>
                {hunk.enclosingScope && (
                  <span className="text-zinc-500 dark:text-zinc-400 truncate max-w-sm hidden sm:inline">
                    scope: {hunk.enclosingScope}
                  </span>
                )}
              </div>

              {/* View Mode A: Unified View */}
              {viewMode === 'unified' ? (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-900/60">
                  {hunk.lines.map((line, lineIdx) => {
                    const lineNum = line.newLineNumber;
                    const lineFindings = lineNum ? findingsByLineNumber.get(lineNum) : undefined;
                    const isAdded = line.type === 'ADDED';
                    const isDeleted = line.type === 'DELETED';
                    const hasActiveFinding = lineFindings?.some((f) => f.id === activeFindingId);

                    let rowBg = 'hover:bg-zinc-50 dark:hover:bg-zinc-900/40 text-zinc-800 dark:text-zinc-200';
                    let gutterColor = 'text-zinc-400 dark:text-zinc-500';
                    let symbolColor = 'text-zinc-400 dark:text-zinc-500';
                    let symbol = ' ';

                    if (isAdded) {
                      rowBg = 'bg-emerald-50/70 dark:bg-emerald-950/25 hover:bg-emerald-50 dark:hover:bg-emerald-950/35 text-zinc-900 dark:text-emerald-200';
                      gutterColor = 'text-emerald-700 dark:text-emerald-500';
                      symbolColor = 'text-emerald-700 dark:text-emerald-400 font-bold';
                      symbol = '+';
                    } else if (isDeleted) {
                      rowBg = 'bg-red-50/70 dark:bg-red-950/25 hover:bg-red-50 dark:hover:bg-red-950/35 text-zinc-900 dark:text-red-300';
                      gutterColor = 'text-red-700 dark:text-red-500';
                      symbolColor = 'text-red-700 dark:text-red-400 font-bold';
                      symbol = '-';
                    }

                    if (hasActiveFinding) {
                      rowBg = 'bg-blue-50/80 dark:bg-blue-950/30 hover:bg-blue-50 dark:hover:bg-blue-950/40 border-l-2 border-blue-500';
                    }

                    return (
                      <React.Fragment key={lineIdx}>
                        <div
                          id={line.newLineNumber ? `line-new-${line.newLineNumber}` : undefined}
                          className={`flex items-stretch transition-colors ${rowBg}`}
                        >
                          {/* Old Line # */}
                          <div className={`w-12 py-1 px-2 text-right select-none font-mono text-[11px] ${gutterColor} bg-zinc-50/80 dark:bg-zinc-950/60 border-r border-zinc-200 dark:border-zinc-800/80`}>
                            {line.oldLineNumber || ''}
                          </div>
                          {/* New Line # */}
                          <div className={`w-12 py-1 px-2 text-right select-none font-mono text-[11px] ${gutterColor} bg-zinc-50/80 dark:bg-zinc-950/60 border-r border-zinc-200 dark:border-zinc-800/80`}>
                            {line.newLineNumber || ''}
                          </div>
                          {/* +/- Symbol */}
                          <div className={`w-6 py-1 text-center select-none ${symbolColor}`}>
                            {symbol}
                          </div>
                          {/* Code Content with Syntax Tokens */}
                          <div className="flex-1 py-1 px-3 whitespace-pre overflow-x-auto leading-relaxed">
                            {renderLineContent(line.content)}
                          </div>
                        </div>

                        {/* Inline Findings Pinned Below Line */}
                        {lineFindings && lineFindings.length > 0 && (
                          <div className="bg-zinc-50/60 dark:bg-zinc-950/80 border-y border-zinc-200 dark:border-zinc-800 py-1">
                            {lineFindings.map((finding) => (
                              <InlineFindingCard
                                key={finding.id}
                                finding={finding}
                                isActive={finding.id === activeFindingId}
                              />
                            ))}
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              ) : (
                /* View Mode B: Split Side-by-Side View */
                <div className="divide-y divide-zinc-100 dark:divide-zinc-900/60">
                  {alignSplitDiffHunk(hunk, findingsByLineNumber).map((row: SplitDiffRow) => {
                    const hasActiveFinding = row.findings?.some((f) => f.id === activeFindingId);

                    return (
                      <React.Fragment key={row.id}>
                        <div className={`grid grid-cols-2 divide-x divide-zinc-200 dark:divide-zinc-800 ${hasActiveFinding ? 'bg-blue-50/60 dark:bg-blue-950/30' : ''}`}>
                          {/* Left Column: Original / Deletions */}
                          <div
                            className={`flex items-stretch min-w-0 ${
                              row.left && (row.type === 'deleted' || row.type === 'modified')
                                ? 'bg-red-50/70 dark:bg-red-950/25 text-zinc-900 dark:text-red-300'
                                : !row.left
                                ? 'bg-zinc-100/50 dark:bg-zinc-950/60 opacity-40 select-none'
                                : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/40 text-zinc-800 dark:text-zinc-200'
                            }`}
                          >
                            <div className="w-12 py-1 px-2 text-right select-none text-[11px] text-zinc-400 dark:text-zinc-500 bg-zinc-50/80 dark:bg-zinc-950/60 border-r border-zinc-200 dark:border-zinc-800/80 flex-shrink-0 font-mono">
                              {row.left?.oldLineNumber || ''}
                            </div>
                            <div className="w-6 py-1 text-center select-none text-red-700 dark:text-red-400 font-bold flex-shrink-0">
                              {row.left && (row.type === 'deleted' || row.type === 'modified') ? '-' : ' '}
                            </div>
                            <div className="flex-1 py-1 px-3 whitespace-pre overflow-x-auto leading-relaxed">
                              {row.left ? renderLineContent(row.left.content) : <span>&nbsp;</span>}
                            </div>
                          </div>

                          {/* Right Column: Modified / Additions */}
                          <div
                            id={row.right?.newLineNumber ? `line-new-${row.right.newLineNumber}` : undefined}
                            className={`flex items-stretch min-w-0 ${
                              row.right && (row.type === 'added' || row.type === 'modified')
                                ? 'bg-emerald-50/70 dark:bg-emerald-950/25 text-zinc-900 dark:text-emerald-200'
                                : !row.right
                                ? 'bg-zinc-100/50 dark:bg-zinc-950/60 opacity-40 select-none'
                                : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/40 text-zinc-800 dark:text-zinc-200'
                            }`}
                          >
                            <div className="w-12 py-1 px-2 text-right select-none text-[11px] text-zinc-400 dark:text-zinc-500 bg-zinc-50/80 dark:bg-zinc-950/60 border-r border-zinc-200 dark:border-zinc-800/80 flex-shrink-0 font-mono">
                              {row.right?.newLineNumber || ''}
                            </div>
                            <div className="w-6 py-1 text-center select-none text-emerald-700 dark:text-emerald-400 font-bold flex-shrink-0">
                              {row.right && (row.type === 'added' || row.type === 'modified') ? '+' : ' '}
                            </div>
                            <div className="flex-1 py-1 px-3 whitespace-pre overflow-x-auto leading-relaxed">
                              {row.right ? renderLineContent(row.right.content) : <span>&nbsp;</span>}
                            </div>
                          </div>
                        </div>

                        {/* Inline Findings Pinned Below Split Row */}
                        {row.findings && row.findings.length > 0 && (
                          <div className="bg-zinc-50/60 dark:bg-zinc-950/80 border-y border-zinc-200 dark:border-zinc-800 py-1">
                            {row.findings.map((finding) => (
                              <InlineFindingCard
                                key={finding.id}
                                finding={finding}
                                isActive={finding.id === activeFindingId}
                              />
                            ))}
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Accessible Keyboard Shortcuts Help Popover Modal */}
      {showShortcutsModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Keyboard Shortcuts Help"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowShortcutsModal(false)}
        >
          <div
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl max-w-md w-full p-6 text-zinc-900 dark:text-zinc-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                <h3 className="text-sm font-semibold">Keyboard Shortcuts</h3>
              </div>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                aria-label="Close shortcuts modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-zinc-600 dark:text-zinc-300">Next finding</span>
                <kbd className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono text-[11px] text-zinc-900 dark:text-zinc-100 font-semibold">
                  j
                </kbd>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-zinc-600 dark:text-zinc-300">Previous finding</span>
                <kbd className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono text-[11px] text-zinc-900 dark:text-zinc-100 font-semibold">
                  k
                </kbd>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-zinc-600 dark:text-zinc-300">Clear active finding focus</span>
                <kbd className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono text-[11px] text-zinc-900 dark:text-zinc-100">
                  Esc
                </kbd>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-zinc-600 dark:text-zinc-300">Switch to Unified diff view</span>
                <kbd className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono text-[11px] text-zinc-900 dark:text-zinc-100">
                  u
                </kbd>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-zinc-600 dark:text-zinc-300">Switch to Split diff view</span>
                <kbd className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono text-[11px] text-zinc-900 dark:text-zinc-100">
                  s
                </kbd>
              </div>

              <div className="flex items-center justify-between py-1.5">
                <span className="text-zinc-600 dark:text-zinc-300">Toggle this shortcuts help</span>
                <kbd className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono text-[11px] text-zinc-900 dark:text-zinc-100">
                  ?
                </kbd>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center text-[11px] text-zinc-500 dark:text-zinc-400">
              <span>Shortcuts pause automatically while typing in inputs.</span>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="px-3 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 font-medium transition-colors text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
