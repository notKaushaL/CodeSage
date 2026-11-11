import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Columns, 
  AlignJustify, 
  FileCode, 
  ChevronLeft, 
  ChevronRight, 
  Keyboard, 
  X
} from 'lucide-react';
import { DiffFile, Finding } from '../engine/types';
import { InlineFindingCard } from './InlineFindingCard';
import { alignSplitDiffHunk, SplitDiffRow } from '../engine/splitAligner';
import { 
  resolveLanguageId, 
  highlightLines, 
  getCachedLineTokens,
  HighlightedToken
} from '../utils/highlighter';
import { 
  getOrderedFindings, 
  getNextFindingIndex, 
  getPrevFindingIndex, 
  isEditableElement
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
  theme?: 'light' | 'dark';
  defaultViewMode?: 'unified' | 'split';
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
  theme = 'dark',
  defaultViewMode = 'unified',
}) => {
  const [viewMode, setViewMode] = useState<'unified' | 'split'>(defaultViewMode);
  const [localActiveFindingId, setLocalActiveFindingId] = useState<string | null>(null);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [highlightedTokensMap, setHighlightedTokensMap] = useState<Map<string, HighlightedToken[]>>(new Map());

  useEffect(() => {
    setViewMode(defaultViewMode);
  }, [defaultViewMode]);

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

  // Asynchronously tokenize active file lines using Shiki for current theme ('light' | 'dark')
  useEffect(() => {
    if (!activeFile || !detectedLangId) return;

    let isCancelled = false;
    const allFileLines: string[] = [];

    for (const hunk of activeFile.hunks) {
      for (const line of hunk.lines) {
        allFileLines.push(line.content);
      }
    }

    if (allFileLines.length === 0) return;

    highlightLines(allFileLines, detectedLangId, theme)
      .then((tokenizedLines) => {
        if (isCancelled) return;
        setHighlightedTokensMap((prev) => {
          const next = new Map(prev);
          allFileLines.forEach((lineText, idx) => {
            const tokens = tokenizedLines[idx];
            if (tokens) {
              next.set(`${theme}:${detectedLangId}:${lineText}`, tokens);
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
  }, [activeFile, detectedLangId, theme]);

  // Render tokenized code line with theme-accurate Shiki styling
  const renderLineContent = (content: string) => {
    if (!content) {
      return <span>&nbsp;</span>;
    }

    if (detectedLangId) {
      const tokens =
        highlightedTokensMap.get(`${theme}:${detectedLangId}:${content}`) ||
        getCachedLineTokens(content, detectedLangId, theme);
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

    return <span>{content}</span>;
  };

  // Jump to specific finding and scroll into view
  const jumpToFindingByIndex = (idx: number) => {
    if (idx < 0 || idx >= allOrderedFindings.length) return;
    const target = allOrderedFindings[idx];

    if (target.fileIndex !== selectedFileIndex && onSelectFileIndex) {
      onSelectFileIndex(target.fileIndex);
    }

    setActiveFindingId(target.finding.id);

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

  // Global Keyboard Navigation (j, k, Esc, u, s, ?)
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
      <div className="flex-1 bg-white dark:bg-[#161b22] rounded-lg border border-[#e4e4e7] dark:border-[#30363d] p-12 text-center text-[#71717a] dark:text-[#8b949e]">
        <FileCode className="w-10 h-10 mx-auto text-[#a1a1aa] dark:text-[#6e7681] mb-2.5" />
        <p className="text-sm font-medium">No modified files to display in this review run.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 bg-white dark:bg-[#0d1117] rounded-lg border border-[#e4e4e7] dark:border-[#30363d] overflow-hidden flex flex-col relative transition-colors">
      {/* GitHub PR File Header Bar */}
      <div className="bg-[#f6f8fa] dark:bg-[#161b22] px-4 py-2.5 border-b border-[#e4e4e7] dark:border-[#30363d] flex flex-wrap items-center justify-between gap-3">
        {/* Left: File path & language */}
        <div className="flex items-center gap-2.5 min-w-0">
          <FileCode className="w-4 h-4 text-[#52525b] dark:text-[#8b949e] flex-shrink-0" />
          <div className="min-w-0 flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-semibold text-[#171717] dark:text-[#e6edf3] truncate">
              {activeFile.newPath !== '/dev/null' ? activeFile.newPath : activeFile.oldPath}
            </span>
            <span className="text-[#a1a1aa] dark:text-[#484f58]">·</span>
            <span className="text-[11px] font-mono text-[#52525b] dark:text-[#8b949e]">
              {activeFile.language}
            </span>
            <span className="text-[#a1a1aa] dark:text-[#484f58]">·</span>
            <span className="text-xs font-mono tabular-nums">
              <span className="text-[#1a7f37] dark:text-[#3fb950] font-semibold">+{activeFile.addedLineCount}</span>{' '}
              <span className="text-[#cf222e] dark:text-[#f85149] font-semibold">-{activeFile.deletedLineCount}</span>
            </span>
            {activeFile.isRename && (
              <span className="text-[11px] text-[#71717a] dark:text-[#8b949e] font-mono">
                (renamed from {activeFile.oldPath})
              </span>
            )}
          </div>
        </div>

        {/* Right: Issue Stepper, View Switcher, & Shortcuts */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Issue Stepper */}
          {allOrderedFindings.length > 0 && (
            <div className="inline-flex items-center bg-white dark:bg-[#0d1117] p-0.5 rounded-md border border-[#d4d4d8] dark:border-[#30363d] text-xs">
              <button
                onClick={handlePrevFinding}
                className="p-1 rounded text-[#52525b] dark:text-[#8b949e] hover:text-[#171717] dark:hover:text-[#e6edf3] hover:bg-[#f4f4f5] dark:hover:bg-[#21262d] transition-colors"
                title="Previous issue (k)"
                aria-label="Previous finding"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleNextFinding}
                className="px-2 py-0.5 text-[11px] font-mono font-medium text-[#171717] dark:text-[#e6edf3] hover:text-[#0969da] dark:hover:text-[#58a6ff] transition-colors select-none whitespace-nowrap"
                title="Click to jump to next issue (j)"
              >
                {currentFindingIdx >= 0 ? (
                  <span>
                    Issue <strong className="text-[#0969da] dark:text-[#58a6ff]">{currentFindingIdx + 1}</strong> of{' '}
                    {allOrderedFindings.length}
                  </span>
                ) : (
                  <span>
                    Jump to Issue ({allOrderedFindings.length})
                  </span>
                )}
              </button>

              <button
                onClick={handleNextFinding}
                className="p-1 rounded text-[#52525b] dark:text-[#8b949e] hover:text-[#171717] dark:hover:text-[#e6edf3] hover:bg-[#f4f4f5] dark:hover:bg-[#21262d] transition-colors"
                title="Next issue (j)"
                aria-label="Next finding"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {activeFindingId && (
                <button
                  onClick={handleClearFinding}
                  className="p-1 rounded text-[#71717a] hover:text-[#cf222e] dark:hover:text-[#f85149] hover:bg-[#f4f4f5] dark:hover:bg-[#21262d] transition-colors border-l border-[#e4e4e7] dark:border-[#30363d] ml-0.5"
                  title="Clear active issue focus (Esc)"
                  aria-label="Clear active finding"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Unified vs Split View Switcher */}
          <div className="inline-flex items-center bg-white dark:bg-[#0d1117] p-0.5 rounded-md border border-[#d4d4d8] dark:border-[#30363d] text-xs">
            <button
              onClick={() => setViewMode('unified')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
                viewMode === 'unified'
                  ? 'bg-[#f4f4f5] dark:bg-[#21262d] text-[#171717] dark:text-[#e6edf3] font-semibold'
                  : 'text-[#52525b] dark:text-[#8b949e] hover:text-[#171717] dark:hover:text-[#e6edf3]'
              }`}
              title="Unified diff view (u)"
            >
              <AlignJustify className="w-3.5 h-3.5" />
              <span>Unified</span>
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
                viewMode === 'split'
                  ? 'bg-[#f4f4f5] dark:bg-[#21262d] text-[#171717] dark:text-[#e6edf3] font-semibold'
                  : 'text-[#52525b] dark:text-[#8b949e] hover:text-[#171717] dark:hover:text-[#e6edf3]'
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
            className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-white dark:bg-[#0d1117] hover:bg-[#f4f4f5] dark:hover:bg-[#21262d] border border-[#d4d4d8] dark:border-[#30363d] text-[#52525b] dark:text-[#8b949e] hover:text-[#171717] dark:hover:text-[#e6edf3] transition-colors whitespace-nowrap"
            title="Keyboard Shortcuts (?)"
            aria-label="View Keyboard Shortcuts"
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Shortcuts</span>
          </button>
        </div>
      </div>

      {/* Diff Code Body */}
      <div 
        ref={diffContainerRef}
        className="overflow-x-auto font-mono text-xs max-h-[calc(100vh-14rem)] overflow-y-auto bg-white dark:bg-[#0d1117]"
      >
        {activeFile.hunks.map((hunk, hunkIdx) => {
          return (
            <div key={hunkIdx} className="bg-white dark:bg-[#0d1117]">
              {/* GitHub-Style Hunk Header */}
              <div className="bg-[#f6f8fa] dark:bg-[#161b22] text-[#57606a] dark:text-[#8b949e] px-4 py-1.5 border-y border-[#e4e4e7] dark:border-[#30363d] flex items-center justify-between font-mono text-[11px] select-none sticky top-0 z-10">
                <span className="font-semibold text-[#0969da] dark:text-[#58a6ff]">{hunk.header}</span>
                {hunk.enclosingScope && (
                  <span className="text-[#57606a] dark:text-[#8b949e] truncate max-w-md hidden sm:inline">
                    {hunk.enclosingScope}
                  </span>
                )}
              </div>

              {/* View Mode A: Unified View */}
              {viewMode === 'unified' ? (
                <div>
                  {hunk.lines.map((line, lineIdx) => {
                    const lineNum = line.newLineNumber;
                    const lineFindings = lineNum ? findingsByLineNumber.get(lineNum) : undefined;
                    const isAdded = line.type === 'ADDED';
                    const isDeleted = line.type === 'DELETED';
                    const hasActiveFinding = lineFindings?.some((f) => f.id === activeFindingId);

                    let rowBg = 'hover:bg-[#f6f8fa] dark:hover:bg-[#161b22]/70 text-[#1f2328] dark:text-[#e6edf3]';
                    let gutterClass = 'bg-[#f6f8fa] dark:bg-[#0d1117] text-[#6e7781] dark:text-[#6e7681]';
                    let symbolColor = 'text-[#6e7781] dark:text-[#6e7681]';
                    let symbol = ' ';

                    if (isAdded) {
                      rowBg = 'gh-diff-add text-[#1f2328] dark:text-[#e6edf3]';
                      gutterClass = 'gh-diff-add-gutter';
                      symbolColor = 'text-[#116329] dark:text-[#3fb950] font-semibold';
                      symbol = '+';
                    } else if (isDeleted) {
                      rowBg = 'gh-diff-del text-[#1f2328] dark:text-[#e6edf3]';
                      gutterClass = 'gh-diff-del-gutter';
                      symbolColor = 'text-[#cf222e] dark:text-[#f85149] font-semibold';
                      symbol = '-';
                    }

                    if (hasActiveFinding) {
                      rowBg = 'bg-[#ddf4ff] dark:bg-[#388bfd]/20';
                    }

                    return (
                      <React.Fragment key={lineIdx}>
                        <div
                          id={line.newLineNumber ? `line-new-${line.newLineNumber}` : undefined}
                          className={`flex items-stretch transition-colors ${rowBg}`}
                        >
                          {/* Old Line # */}
                          <div className={`w-12 py-0.5 px-2 text-right select-none font-mono text-[11px] tabular-nums border-r border-[#e4e4e7]/70 dark:border-[#30363d]/70 ${gutterClass}`}>
                            {line.oldLineNumber || ''}
                          </div>
                          {/* New Line # */}
                          <div className={`w-12 py-0.5 px-2 text-right select-none font-mono text-[11px] tabular-nums border-r border-[#e4e4e7] dark:border-[#30363d] ${gutterClass}`}>
                            {line.newLineNumber || ''}
                          </div>
                          {/* +/- Symbol */}
                          <div className={`w-6 py-0.5 text-center select-none ${symbolColor}`}>
                            {symbol}
                          </div>
                          {/* Code Content with Syntax Tokens */}
                          <div className="flex-1 py-0.5 px-3 whitespace-pre overflow-x-auto leading-5">
                            {renderLineContent(line.content)}
                          </div>
                        </div>

                        {/* Inline Findings Pinned Below Line */}
                        {lineFindings && lineFindings.length > 0 && (
                          <div className="bg-[#f6f8fa] dark:bg-[#0d1117] border-y border-[#e4e4e7] dark:border-[#30363d] py-1">
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
                <div>
                  {alignSplitDiffHunk(hunk, findingsByLineNumber).map((row: SplitDiffRow) => {
                    const hasActiveFinding = row.findings?.some((f) => f.id === activeFindingId);
                    const isLeftDeleted = row.left && (row.type === 'deleted' || row.type === 'modified');
                    const isRightAdded = row.right && (row.type === 'added' || row.type === 'modified');

                    return (
                      <React.Fragment key={row.id}>
                        <div className={`grid grid-cols-2 divide-x divide-[#e4e4e7] dark:divide-[#30363d] ${hasActiveFinding ? 'bg-[#ddf4ff] dark:bg-[#388bfd]/20' : ''}`}>
                          {/* Left Column: Original / Deletions */}
                          <div
                            className={`flex items-stretch min-w-0 ${
                              isLeftDeleted
                                ? 'gh-diff-del text-[#1f2328] dark:text-[#e6edf3]'
                                : !row.left
                                ? 'bg-[#f6f8fa] dark:bg-[#161b22]/50 select-none'
                                : 'hover:bg-[#f6f8fa] dark:hover:bg-[#161b22]/70 text-[#1f2328] dark:text-[#e6edf3]'
                            }`}
                          >
                            <div className={`w-12 py-0.5 px-2 text-right select-none text-[11px] font-mono tabular-nums border-r border-[#e4e4e7] dark:border-[#30363d] flex-shrink-0 ${
                              isLeftDeleted ? 'gh-diff-del-gutter' : 'bg-[#f6f8fa] dark:bg-[#0d1117] text-[#6e7781] dark:text-[#6e7681]'
                            }`}>
                              {row.left?.oldLineNumber || ''}
                            </div>
                            <div className="w-6 py-0.5 text-center select-none text-[#cf222e] dark:text-[#f85149] font-semibold flex-shrink-0">
                              {isLeftDeleted ? '-' : ' '}
                            </div>
                            <div className="flex-1 py-0.5 px-3 whitespace-pre overflow-x-auto leading-5">
                              {row.left ? renderLineContent(row.left.content) : <span>&nbsp;</span>}
                            </div>
                          </div>

                          {/* Right Column: Modified / Additions */}
                          <div
                            id={row.right?.newLineNumber ? `line-new-${row.right.newLineNumber}` : undefined}
                            className={`flex items-stretch min-w-0 ${
                              isRightAdded
                                ? 'gh-diff-add text-[#1f2328] dark:text-[#e6edf3]'
                                : !row.right
                                ? 'bg-[#f6f8fa] dark:bg-[#161b22]/50 select-none'
                                : 'hover:bg-[#f6f8fa] dark:hover:bg-[#161b22]/70 text-[#1f2328] dark:text-[#e6edf3]'
                            }`}
                          >
                            <div className={`w-12 py-0.5 px-2 text-right select-none text-[11px] font-mono tabular-nums border-r border-[#e4e4e7] dark:border-[#30363d] flex-shrink-0 ${
                              isRightAdded ? 'gh-diff-add-gutter' : 'bg-[#f6f8fa] dark:bg-[#0d1117] text-[#6e7781] dark:text-[#6e7681]'
                            }`}>
                              {row.right?.newLineNumber || ''}
                            </div>
                            <div className="w-6 py-0.5 text-center select-none text-[#116329] dark:text-[#3fb950] font-semibold flex-shrink-0">
                              {isRightAdded ? '+' : ' '}
                            </div>
                            <div className="flex-1 py-0.5 px-3 whitespace-pre overflow-x-auto leading-5">
                              {row.right ? renderLineContent(row.right.content) : <span>&nbsp;</span>}
                            </div>
                          </div>
                        </div>

                        {/* Inline Findings Pinned Below Split Row */}
                        {row.findings && row.findings.length > 0 && (
                          <div className="bg-[#f6f8fa] dark:bg-[#0d1117] border-y border-[#e4e4e7] dark:border-[#30363d] py-1">
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

      {/* Keyboard Shortcuts Help Dialog */}
      {showShortcutsModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Keyboard Shortcuts Help"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowShortcutsModal(false)}
        >
          <div
            className="bg-white dark:bg-[#161b22] border border-[#e4e4e7] dark:border-[#30363d] rounded-lg shadow-xl max-w-md w-full p-6 text-[#171717] dark:text-[#e6edf3]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#e4e4e7] dark:border-[#30363d]">
              <div className="flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-[#52525b] dark:text-[#8b949e]" />
                <h3 className="text-sm font-semibold">Keyboard Shortcuts</h3>
              </div>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="p-1 rounded text-[#71717a] hover:text-[#171717] dark:hover:text-[#e6edf3] transition-colors"
                aria-label="Close shortcuts modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-[#f4f4f5] dark:border-[#21262d]">
                <span className="text-[#52525b] dark:text-[#8b949e]">Jump to next issue</span>
                <kbd className="px-2 py-0.5 rounded bg-[#f4f4f5] dark:bg-[#21262d] border border-[#d4d4d8] dark:border-[#30363d] font-mono text-[11px] font-semibold">
                  j
                </kbd>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-[#f4f4f5] dark:border-[#21262d]">
                <span className="text-[#52525b] dark:text-[#8b949e]">Jump to previous issue</span>
                <kbd className="px-2 py-0.5 rounded bg-[#f4f4f5] dark:bg-[#21262d] border border-[#d4d4d8] dark:border-[#30363d] font-mono text-[11px] font-semibold">
                  k
                </kbd>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-[#f4f4f5] dark:border-[#21262d]">
                <span className="text-[#52525b] dark:text-[#8b949e]">Clear active issue highlight</span>
                <kbd className="px-2 py-0.5 rounded bg-[#f4f4f5] dark:bg-[#21262d] border border-[#d4d4d8] dark:border-[#30363d] font-mono text-[11px]">
                  Esc
                </kbd>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-[#f4f4f5] dark:border-[#21262d]">
                <span className="text-[#52525b] dark:text-[#8b949e]">Unified diff view</span>
                <kbd className="px-2 py-0.5 rounded bg-[#f4f4f5] dark:bg-[#21262d] border border-[#d4d4d8] dark:border-[#30363d] font-mono text-[11px]">
                  u
                </kbd>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-[#f4f4f5] dark:border-[#21262d]">
                <span className="text-[#52525b] dark:text-[#8b949e]">Split side-by-side diff view</span>
                <kbd className="px-2 py-0.5 rounded bg-[#f4f4f5] dark:bg-[#21262d] border border-[#d4d4d8] dark:border-[#30363d] font-mono text-[11px]">
                  s
                </kbd>
              </div>

              <div className="flex items-center justify-between py-1.5">
                <span className="text-[#52525b] dark:text-[#8b949e]">Toggle shortcuts help</span>
                <kbd className="px-2 py-0.5 rounded bg-[#f4f4f5] dark:bg-[#21262d] border border-[#d4d4d8] dark:border-[#30363d] font-mono text-[11px]">
                  ?
                </kbd>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-[#e4e4e7] dark:border-[#30363d] flex justify-between items-center text-[11px] text-[#71717a] dark:text-[#8b949e]">
              <span>Shortcuts pause automatically when typing in inputs.</span>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="px-3 py-1.5 rounded-md bg-[#171717] hover:bg-[#27272a] text-white dark:bg-[#21262d] dark:hover:bg-[#30363d] dark:text-[#e6edf3] font-medium transition-colors text-xs"
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
