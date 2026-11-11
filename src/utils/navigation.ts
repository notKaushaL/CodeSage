import { DiffFile, Finding } from '../engine/types';

/**
 * Checks if the target element of a keyboard event is an active input, textarea,
 * select, or contenteditable element where shortcut keys (j, k, etc.) must be suppressed.
 */
export function isEditableElement(target: EventTarget | null): boolean {
  if (!target || typeof target !== 'object') {
    return false;
  }

  const el = target as {
    tagName?: string;
    isContentEditable?: boolean;
    getAttribute?: (attr: string) => string | null;
    closest?: (selector: string) => unknown;
  };

  const tagName = typeof el.tagName === 'string' ? el.tagName.toUpperCase() : '';
  if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
    return true;
  }

  if (el.isContentEditable || (typeof el.getAttribute === 'function' && el.getAttribute('contenteditable') === 'true')) {
    return true;
  }

  if (typeof el.closest === 'function' && el.closest('[contenteditable="true"]')) {
    return true;
  }

  return false;
}

export interface OrderedFinding {
  finding: Finding;
  fileIndex: number;
  filePath: string;
  lineNumber: number;
}

/**
 * Flattens and orders findings across files by file index and line number for sequential navigation.
 */
export function getOrderedFindings(
  files: DiffFile[],
  findings: Finding[],
  selectedCategory: string | null = null,
  selectedSeverity: string | null = null
): OrderedFinding[] {
  const filtered = findings.filter((f) => {
    if (selectedCategory && f.category !== selectedCategory) return false;
    if (selectedSeverity && f.severity !== selectedSeverity) return false;
    return true;
  });

  const ordered: OrderedFinding[] = [];

  // Group and sort by file order in parsed diff
  files.forEach((file, fileIdx) => {
    const fileFindings = filtered.filter(
      (f) => f.file_path === file.newPath || f.file_path === file.oldPath
    );

    // Sort findings within the file by line number ascending
    fileFindings.sort((a, b) => a.line_number - b.line_number);

    for (const f of fileFindings) {
      ordered.push({
        finding: f,
        fileIndex: fileIdx,
        filePath: file.newPath !== '/dev/null' ? file.newPath : file.oldPath,
        lineNumber: f.line_number,
      });
    }
  });

  return ordered;
}

/**
 * Calculates the next finding index with wrap-around support.
 */
export function getNextFindingIndex(currentIndex: number, totalCount: number): number {
  if (totalCount === 0) return -1;
  if (currentIndex === -1) return 0;
  return (currentIndex + 1) % totalCount;
}

/**
 * Calculates the previous finding index with wrap-around support.
 */
export function getPrevFindingIndex(currentIndex: number, totalCount: number): number {
  if (totalCount === 0) return -1;
  if (currentIndex === -1) return totalCount - 1;
  return (currentIndex - 1 + totalCount) % totalCount;
}
