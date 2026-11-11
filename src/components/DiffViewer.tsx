import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Columns, 
  AlignJustify, 
  FileCode, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
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
  defaultViewMode = 'split',
}) => {
  const [viewMode, setViewMode] = useState<'unified' | 'split'>(defaultViewMode);
  const [isFileCollapsed, setIsFileCollapsed] = useState(false);
  const [localActiveFindingId, setLocalActiveFindingId] = useState<string | null>(null);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [highlightedTokensMap, setHighlightedTokensMap] = useState<Map<string, HighlightedToken[]>>(new Map());

  useEffect(() => {
    setViewMode(defaultViewMode);
  }, [defaultViewMode]);

  useEffect(() => {
    setIsFileCollapsed(false);
  }, [selectedFileIndex]);

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

    setIsFileCollapsed(false);
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
      <div className="flex-1 bg-white dark:bg-[#0d1117] rounded-[6px] border border-[#d0d7de] dark:border-[#30363d] p-8 text-center text-[#656d76] dark:text-[#8b949e]">
        <FileCode className="w-8 h-8 mx-auto text-[#6e7781] dark:text-[#6e7681] mb-2" />
        <p className="text-xs font-medium">No modified files to display in this review run.</p>
      </div>
    );
  }

  // Compute GitHub 5-block diffstat squares
  const totalChanges = activeFile.addedLineCount + activeFile.deletedLineCount;
  const addBlocks = totalChanges > 0 ? Math.round((activeFile.addedLineCount / totalChanges) * 5) : 0;
  const delBlocks = totalChanges > 0 ? Math.min(5 - addBlocks, Math.round((activeFile.deletedLineCount / totalChanges) * 5)) : 0;
  const neutralBlocks = Math.max(0, 5 - addBlocks - delBlocks);

  const displayPath = activeFile.newPath !== '/dev/null' ? activeFile.newPath : activeFile.oldPath;
  const oldDisplayPath = activeFile.oldPath !== '/dev/null' ? activeFile.oldPath : displayPath;
  const newDisplayPath = activeFile.newPath !== '/dev/null' ? activeFile.newPath : displayPath;

  return (
    <div className="flex-1 min-w-0 bg-white dark:bg-[#0d1117] rounded-[6px] border border-[#d0d7de] dark:border-[#30363d] flex flex-col relative transition-colors">
      {/* Compact GitHub PR File Header Bar (Sticky while scrolling) */}
      <div className="bg-[#f6f8fa] dark:bg-[#161b22] px-3 py-1.5 border-b border-[#d0d7de] dark:border-[#30363d] rounded-t-[6px] flex flex-wrap items-center justify-between gap-2 sticky top-12 z-20">
        {/* Left: Collapse Chevron, File Path, Diffstat Squares */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => setIsFileCollapsed(!isFileCollapsed)}
            className="p-0.5 rounded hover:bg-[#d0d7de]/50 dark:hover:bg-[#30363d] text-[#656d76] dark:text-[#8b949e] transition-colors flex-shrink-0"
            title={isFileCollapsed ? 'Expand file diff' : 'Collapse file diff'}
            aria-label={isFileCollapsed ? 'Expand file diff' : 'Collapse file diff'}
          >
            {isFileCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <div className="min-w-0 flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-semibold text-[#1f2328] dark:text-[#e6edf3] truncate">
              {displayPath}
            </span>
            {activeFile.isRename && (
              <span className="text-[11px] text-[#656d76] dark:text-[#8b949e] font-mono">
                (from {activeFile.oldPath})
              </span>
            )}
            <span className="text-[#d0d7de] dark:text-[#30363d]">·</span>
            <span className="text-[11px] font-mono text-[#656d76] dark:text-[#8b949e]">
              {activeFile.language}
            </span>
            <span className="text-[#d0d7de] dark:text-[#30363d]">·</span>

            {/* GitHub Diffstat (+X -Y and 5 squares) */}
            <div className="inline-flex items-center gap-1.5 font-mono text-[11px] tabular-nums">
              <span className="text-[#1a7f37] dark:text-[#3fb950] font-semibold">+{activeFile.addedLineCount}</span>
              <span className="text-[#cf222e] dark:text-[#f85149] font-semibold">-{activeFile.deletedLineCount}</span>
              <span className="inline-flex items-center gap-[2px] ml-0.5" aria-hidden="true">
                {Array.from({ length: addBlocks }).map((_, i) => (
                  <span key={`a-${i}`} className="w-2 h-2 rounded-[1px] bg-[#1a7f37] dark:bg-[#3fb950]" />
                ))}
                {Array.from({ length: delBlocks }).map((_, i) => (
                  <span key={`d-${i}`} className="w-2 h-2 rounded-[1px] bg-[#cf222e] dark:bg-[#f85149]" />
                ))}
                {Array.from({ length: neutralBlocks }).map((_, i) => (
                  <span key={`n-${i}`} className="w-2 h-2 rounded-[1px] bg-[#d0d7de] dark:bg-[#30363d]" />
                ))}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Compact Issue Stepper, Split/Unified Switcher & Shortcuts */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {allOrderedFindings.length > 0 && (
            <div className="inline-flex items-center bg-white dark:bg-[#0d1117] h-6 px-0.5 rounded-[6px] border border-[#d0d7de] dark:border-[#30363d] text-[11px]">
              <button
                onClick={handlePrevFinding}
                className="p-0.5 rounded text-[#656d76] dark:text-[#8b949e] hover:text-[#1f2328] dark:hover:text-[#e6edf3] hover:bg-[#f3f4f6] dark:hover:bg-[#21262d] transition-colors"
                title="Previous issue (k)"
                aria-label="Previous finding"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleNextFinding}
                className="px-1.5 text-[11px] font-mono font-medium text-[#1f2328] dark:text-[#e6edf3] hover:text-[#0969da] dark:hover:text-[#2f81f7] transition-colors select-none whitespace-nowrap"
                title="Click to jump to next issue (j)"
              >
                {currentFindingIdx >= 0 ? (
                  <span>
                    Issue <strong className="text-[#0969da] dark:text-[#2f81f7]">{currentFindingIdx + 1}</strong>/{allOrderedFindings.length}
                  </span>
                ) : (
                  <span>
                    Issues ({allOrderedFindings.length})
                  </span>
                )}
              </button>

              <button
                onClick={handleNextFinding}
                className="p-0.5 rounded text-[#656d76] dark:text-[#8b949e] hover:text-[#1f2328] dark:hover:text-[#e6edf3] hover:bg-[#f3f4f6] dark:hover:bg-[#21262d] transition-colors"
                title="Next issue (j)"
                aria-label="Next finding"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {activeFindingId && (
                <button
                  onClick={handleClearFinding}
                  className="p-0.5 rounded text-[#656d76] hover:text-[#cf222e] dark:hover:text-[#f85149] hover:bg-[#f3f4f6] dark:hover:bg-[#21262d] transition-colors border-l border-[#d0d7de] dark:border-[#30363d] ml-0.5"
                  title="Clear active issue focus (Esc)"
                  aria-label="Clear active finding"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Split (Side-by-Side) vs Unified View Switcher */}
          <div className="inline-flex items-center bg-white dark:bg-[#0d1117] h-6 p-0.5 rounded-[6px] border border-[#d0d7de] dark:border-[#30363d] text-[11px]">
            <button
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1 px-2 h-full rounded-[4px] transition-colors whitespace-nowrap ${
                viewMode === 'split'
                  ? 'bg-[#f6f8fa] dark:bg-[#21262d] text-[#1f2328] dark:text-[#e6edf3] font-semibold'
                  : 'text-[#656d76] dark:text-[#8b949e] hover:text-[#1f2328] dark:hover:text-[#e6edf3]'
              }`}
              title="Side-by-side split diff view (s)"
            >
              <Columns className="w-3 h-3" />
              <span>Split</span>
            </button>
            <button
              onClick={() => setViewMode('unified')}
              className={`flex items-center gap-1 px-2 h-full rounded-[4px] transition-colors whitespace-nowrap ${
                viewMode === 'unified'
                  ? 'bg-[#f6f8fa] dark:bg-[#21262d] text-[#1f2328] dark:text-[#e6edf3] font-semibold'
                  : 'text-[#656d76] dark:text-[#8b949e] hover:text-[#1f2328] dark:hover:text-[#e6edf3]'
              }`}
              title="Unified diff view (u)"
            >
              <AlignJustify className="w-3 h-3" />
              <span>Unified</span>
            </button>
          </div>

          {/* Keyboard Shortcuts Help Button */}
          <button
            onClick={() => setShowShortcutsModal(true)}
            className="inline-flex items-center gap-1 text-[11px] h-6 px-2 rounded-[6px] bg-white dark:bg-[#0d1117] hover:bg-[#f3f4f6] dark:hover:bg-[#21262d] border border-[#d0d7de] dark:border-[#30363d] text-[#656d76] dark:text-[#8b949e] hover:text-[#1f2328] dark:hover:text-[#e6edf3] transition-colors whitespace-nowrap"
            title="Keyboard Shortcuts (?)"
            aria-label="View Keyboard Shortcuts"
          >
            <Keyboard className="w-3 h-3" />
            <span className="hidden sm:inline">Shortcuts</span>
          </button>
        </div>
      </div>

      {/* Single Shared Horizontal Scroll Container for Entire Diff Table */}
      {!isFileCollapsed && (
        <div
          ref={diffContainerRef}
          data-testid="diff-scroll-container"
          className="w-full overflow-x-auto bg-white dark:bg-[#0d1117] rounded-b-[6px]"
        >
          {viewMode === 'split' ? (
            /* SIDE-BY-SIDE (SPLIT) DIFF TABLE — Single Shared Container, Lockstep Vertical Alignment */
            <table
              data-testid="split-diff-table"
              className="w-full min-w-[760px] border-collapse font-mono text-[12px] leading-[20px]"
            >
              <colgroup>
                <col className="w-[44px]" />
                <col className="w-[20px]" />
                <col className="w-1/2" />
                <col className="w-[44px]" />
                <col className="w-[20px]" />
                <col className="w-1/2" />
              </colgroup>

              {/* Left (Original / Before) & Right (Modified / After) Panel Headers */}
              <thead>
                <tr className="bg-[#f6f8fa] dark:bg-[#161b22] border-b border-[#d0d7de] dark:border-[#30363d] text-[11px] text-[#656d76] dark:text-[#8b949e] select-none">
                  <th
                    colSpan={3}
                    className="py-1 px-3 text-left font-normal border-r border-[#d0d7de] dark:border-[#30363d]"
                  >
                    <div className="flex items-center justify-between gap-2 truncate">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-semibold text-[#1f2328] dark:text-[#e6edf3]">
                          Original (Before)
                        </span>
                        <span>·</span>
                        <span className="truncate">a/{oldDisplayPath}</span>
                      </div>
                      <span className="text-[#cf222e] dark:text-[#f85149] font-semibold tabular-nums flex-shrink-0">
                        -{activeFile.deletedLineCount} removed
                      </span>
                    </div>
                  </th>
                  <th colSpan={3} className="py-1 px-3 text-left font-normal">
                    <div className="flex items-center justify-between gap-2 truncate">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-semibold text-[#1f2328] dark:text-[#e6edf3]">
                          Modified (After)
                        </span>
                        <span>·</span>
                        <span className="truncate">b/{newDisplayPath}</span>
                      </div>
                      <span className="text-[#1a7f37] dark:text-[#3fb950] font-semibold tabular-nums flex-shrink-0">
                        +{activeFile.addedLineCount} added
                      </span>
                    </div>
                  </th>
                </tr>
              </thead>

              <tbody>
                {activeFile.hunks.map((hunk, hunkIdx) => {
                  const splitRows = alignSplitDiffHunk(hunk, findingsByLineNumber);

                  return (
                    <React.Fragment key={hunkIdx}>
                      {/* GitHub Hunk Header Row */}
                      <tr className="gh-diff-hunk border-y border-[#d0d7de] dark:border-[#30363d] text-[11px] select-none">
                        <td
                          colSpan={2}
                          className="gh-diff-hunk-gutter py-1 px-2 text-center font-mono border-r border-[#d0d7de]/70 dark:border-[#30363d]/70"
                        >
                          @@
                        </td>
                        <td colSpan={4} className="py-1 px-3 font-mono">
                          <span className="text-[#0969da] dark:text-[#58a6ff] font-medium">
                            {hunk.header}
                          </span>
                          {hunk.enclosingScope && !hunk.header.includes(hunk.enclosingScope) && (
                            <span className="ml-2 text-[#656d76] dark:text-[#8b949e]">
                              {hunk.enclosingScope}
                            </span>
                          )}
                        </td>
                      </tr>

                      {/* Side-by-Side Diff Rows */}
                      {splitRows.map((row: SplitDiffRow) => {
                        const hasActiveFinding = row.findings?.some((f) => f.id === activeFindingId);
                        const isLeftDeleted = Boolean(row.left && (row.type === 'deleted' || row.type === 'modified'));
                        const isRightAdded = Boolean(row.right && (row.type === 'added' || row.type === 'modified'));

                        const leftCellBg = isLeftDeleted
                          ? 'gh-diff-del text-[#1f2328] dark:text-[#e6edf3]'
                          : !row.left
                          ? 'gh-diff-empty select-none'
                          : 'bg-white dark:bg-[#0d1117] text-[#1f2328] dark:text-[#e6edf3]';

                        const leftGutterBg = isLeftDeleted
                          ? 'gh-diff-del-gutter'
                          : !row.left
                          ? 'gh-diff-empty text-transparent'
                          : 'bg-[#f6f8fa] dark:bg-[#0d1117] text-[#6e7781] dark:text-[#6e7681]';

                        const rightCellBg = isRightAdded
                          ? 'gh-diff-add text-[#1f2328] dark:text-[#e6edf3]'
                          : !row.right
                          ? 'gh-diff-empty select-none'
                          : 'bg-white dark:bg-[#0d1117] text-[#1f2328] dark:text-[#e6edf3]';

                        const rightGutterBg = isRightAdded
                          ? 'gh-diff-add-gutter'
                          : !row.right
                          ? 'gh-diff-empty text-transparent'
                          : 'bg-[#f6f8fa] dark:bg-[#0d1117] text-[#6e7781] dark:text-[#6e7681]';

                        return (
                          <React.Fragment key={row.id}>
                            <tr
                              id={row.right?.newLineNumber ? `line-new-${row.right.newLineNumber}` : undefined}
                              className={hasActiveFinding ? 'ring-1 ring-inset ring-[#0969da] dark:ring-[#2f81f7]' : ''}
                            >
                              {/* Left Panel: Old Line Number */}
                              <td
                                className={`w-[44px] py-0 px-2 text-right select-none text-[11px] leading-[20px] tabular-nums border-r border-[#d0d7de]/60 dark:border-[#30363d]/60 align-top ${leftGutterBg}`}
                              >
                                {row.left?.oldLineNumber ?? ''}
                              </td>

                              {/* Left Panel: Deletion Sign (-) */}
                              <td
                                className={`w-[20px] py-0 text-center select-none text-[12px] leading-[20px] align-top ${leftCellBg} ${
                                  isLeftDeleted ? 'text-[#cf222e] dark:text-[#f85149] font-semibold' : 'text-transparent'
                                }`}
                              >
                                {isLeftDeleted ? '-' : ' '}
                              </td>

                              {/* Left Panel: Original Code Content */}
                              <td
                                className={`py-0 px-2 whitespace-pre text-[12px] leading-[20px] align-top border-r border-[#d0d7de] dark:border-[#30363d] ${leftCellBg}`}
                              >
                                {row.left ? renderLineContent(row.left.content) : <span>&nbsp;</span>}
                              </td>

                              {/* Right Panel: New Line Number */}
                              <td
                                className={`w-[44px] py-0 px-2 text-right select-none text-[11px] leading-[20px] tabular-nums border-r border-[#d0d7de]/60 dark:border-[#30363d]/60 align-top ${rightGutterBg}`}
                              >
                                {row.right?.newLineNumber ?? ''}
                              </td>

                              {/* Right Panel: Addition Sign (+) */}
                              <td
                                className={`w-[20px] py-0 text-center select-none text-[12px] leading-[20px] align-top ${rightCellBg} ${
                                  isRightAdded ? 'text-[#1a7f37] dark:text-[#3fb950] font-semibold' : 'text-transparent'
                                }`}
                              >
                                {isRightAdded ? '+' : ' '}
                              </td>

                              {/* Right Panel: Modified Code Content */}
                              <td
                                className={`py-0 px-2 whitespace-pre text-[12px] leading-[20px] align-top ${rightCellBg}`}
                              >
                                {row.right ? renderLineContent(row.right.content) : <span>&nbsp;</span>}
                              </td>
                            </tr>

                            {/* Inline Review Findings Row */}
                            {row.findings && row.findings.length > 0 && (
                              <tr className="bg-[#f6f8fa] dark:bg-[#0d1117] border-y border-[#d0d7de] dark:border-[#30363d]">
                                <td colSpan={6} className="p-0">
                                  {row.findings.map((finding) => (
                                    <InlineFindingCard
                                      key={finding.id}
                                      finding={finding}
                                      isActive={finding.id === activeFindingId}
                                    />
                                  ))}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          ) : (
            /* UNIFIED DIFF TABLE — Single Shared Scroll Container */
            <table
              data-testid="unified-diff-table"
              className="w-full min-w-[640px] border-collapse font-mono text-[12px] leading-[20px]"
            >
              <colgroup>
                <col className="w-[44px]" />
                <col className="w-[44px]" />
                <col className="w-[20px]" />
                <col />
              </colgroup>
              <tbody>
                {activeFile.hunks.map((hunk, hunkIdx) => (
                  <React.Fragment key={hunkIdx}>
                    <tr className="gh-diff-hunk border-y border-[#d0d7de] dark:border-[#30363d] text-[11px] select-none">
                      <td
                        colSpan={2}
                        className="gh-diff-hunk-gutter py-1 px-2 text-center font-mono border-r border-[#d0d7de]/70 dark:border-[#30363d]/70"
                      >
                        @@
                      </td>
                      <td colSpan={2} className="py-1 px-3 font-mono">
                        <span className="text-[#0969da] dark:text-[#58a6ff] font-medium">
                          {hunk.header}
                        </span>
                        {hunk.enclosingScope && !hunk.header.includes(hunk.enclosingScope) && (
                          <span className="ml-2 text-[#656d76] dark:text-[#8b949e]">
                            {hunk.enclosingScope}
                          </span>
                        )}
                      </td>
                    </tr>

                    {hunk.lines.map((line, lineIdx) => {
                      const lineNum = line.newLineNumber;
                      const lineFindings = lineNum ? findingsByLineNumber.get(lineNum) : undefined;
                      const isAdded = line.type === 'ADDED';
                      const isDeleted = line.type === 'DELETED';
                      const hasActiveFinding = lineFindings?.some((f) => f.id === activeFindingId);

                      let rowBg = 'bg-white dark:bg-[#0d1117] text-[#1f2328] dark:text-[#e6edf3]';
                      let gutterClass = 'bg-[#f6f8fa] dark:bg-[#0d1117] text-[#6e7781] dark:text-[#6e7681]';
                      let symbolColor = 'text-transparent';
                      let symbol = ' ';

                      if (isAdded) {
                        rowBg = 'gh-diff-add text-[#1f2328] dark:text-[#e6edf3]';
                        gutterClass = 'gh-diff-add-gutter';
                        symbolColor = 'text-[#1a7f37] dark:text-[#3fb950] font-semibold';
                        symbol = '+';
                      } else if (isDeleted) {
                        rowBg = 'gh-diff-del text-[#1f2328] dark:text-[#e6edf3]';
                        gutterClass = 'gh-diff-del-gutter';
                        symbolColor = 'text-[#cf222e] dark:text-[#f85149] font-semibold';
                        symbol = '-';
                      }

                      return (
                        <React.Fragment key={lineIdx}>
                          <tr
                            id={line.newLineNumber ? `line-new-${line.newLineNumber}` : undefined}
                            className={`${rowBg} ${hasActiveFinding ? 'ring-1 ring-inset ring-[#0969da] dark:ring-[#2f81f7]' : ''}`}
                          >
                            <td className={`w-[44px] py-0 px-2 text-right select-none text-[11px] leading-[20px] tabular-nums border-r border-[#d0d7de]/60 dark:border-[#30363d]/60 align-top ${gutterClass}`}>
                              {line.oldLineNumber ?? ''}
                            </td>
                            <td className={`w-[44px] py-0 px-2 text-right select-none text-[11px] leading-[20px] tabular-nums border-r border-[#d0d7de] dark:border-[#30363d] align-top ${gutterClass}`}>
                              {line.newLineNumber ?? ''}
                            </td>
                            <td className={`w-[20px] py-0 text-center select-none text-[12px] leading-[20px] align-top ${symbolColor}`}>
                              {symbol}
                            </td>
                            <td className="py-0 px-2 whitespace-pre text-[12px] leading-[20px] align-top">
                              {renderLineContent(line.content)}
                            </td>
                          </tr>

                          {lineFindings && lineFindings.length > 0 && (
                            <tr className="bg-[#f6f8fa] dark:bg-[#0d1117] border-y border-[#d0d7de] dark:border-[#30363d]">
                              <td colSpan={4} className="p-0">
                                {lineFindings.map((finding) => (
                                  <InlineFindingCard
                                    key={finding.id}
                                    finding={finding}
                                    isActive={finding.id === activeFindingId}
                                  />
                                ))}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

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
            className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-[6px] shadow-xl max-w-md w-full p-4 text-[#1f2328] dark:text-[#e6edf3]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2.5 border-b border-[#d0d7de] dark:border-[#30363d]">
              <div className="flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-[#656d76] dark:text-[#8b949e]" />
                <h3 className="text-xs font-semibold">Keyboard Shortcuts</h3>
              </div>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="p-1 rounded text-[#656d76] hover:text-[#1f2328] dark:hover:text-[#e6edf3] transition-colors"
                aria-label="Close shortcuts modal"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-3 space-y-1.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-[#d8dee4] dark:border-[#21262d]">
                <span className="text-[#656d76] dark:text-[#8b949e]">Jump to next issue</span>
                <kbd className="px-1.5 py-0.5 rounded bg-[#f6f8fa] dark:bg-[#21262d] border border-[#d0d7de] dark:border-[#30363d] font-mono text-[11px] font-semibold">
                  j
                </kbd>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[#d8dee4] dark:border-[#21262d]">
                <span className="text-[#656d76] dark:text-[#8b949e]">Jump to previous issue</span>
                <kbd className="px-1.5 py-0.5 rounded bg-[#f6f8fa] dark:bg-[#21262d] border border-[#d0d7de] dark:border-[#30363d] font-mono text-[11px] font-semibold">
                  k
                </kbd>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[#d8dee4] dark:border-[#21262d]">
                <span className="text-[#656d76] dark:text-[#8b949e]">Clear active issue highlight</span>
                <kbd className="px-1.5 py-0.5 rounded bg-[#f6f8fa] dark:bg-[#21262d] border border-[#d0d7de] dark:border-[#30363d] font-mono text-[11px]">
                  Esc
                </kbd>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[#d8dee4] dark:border-[#21262d]">
                <span className="text-[#656d76] dark:text-[#8b949e]">Side-by-side split diff view</span>
                <kbd className="px-1.5 py-0.5 rounded bg-[#f6f8fa] dark:bg-[#21262d] border border-[#d0d7de] dark:border-[#30363d] font-mono text-[11px]">
                  s
                </kbd>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[#d8dee4] dark:border-[#21262d]">
                <span className="text-[#656d76] dark:text-[#8b949e]">Unified diff view</span>
                <kbd className="px-1.5 py-0.5 rounded bg-[#f6f8fa] dark:bg-[#21262d] border border-[#d0d7de] dark:border-[#30363d] font-mono text-[11px]">
                  u
                </kbd>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-[#656d76] dark:text-[#8b949e]">Toggle shortcuts help</span>
                <kbd className="px-1.5 py-0.5 rounded bg-[#f6f8fa] dark:bg-[#21262d] border border-[#d0d7de] dark:border-[#30363d] font-mono text-[11px]">
                  ?
                </kbd>
              </div>
            </div>

            <div className="mt-4 pt-2.5 border-t border-[#d0d7de] dark:border-[#30363d] flex justify-between items-center text-[11px] text-[#656d76] dark:text-[#8b949e]">
              <span>Shortcuts pause when typing in inputs.</span>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="px-2.5 py-1 rounded-[6px] bg-[#f6f8fa] hover:bg-[#f3f4f6] text-[#1f2328] dark:bg-[#21262d] dark:hover:bg-[#30363d] dark:text-[#e6edf3] border border-[#d0d7de] dark:border-[#30363d] font-medium transition-colors text-xs"
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
