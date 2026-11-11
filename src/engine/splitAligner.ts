import { DiffHunk, DiffLine, Finding } from './types';

export interface SplitDiffRow {
  /** Unique stable key for React rendering */
  id: string;
  /** Row categorization */
  type: 'context' | 'modified' | 'added' | 'deleted';
  /** Left (original) side line, or null if this is an added line placeholder */
  left: DiffLine | null;
  /** Right (modified) side line, or null if this is a deleted line placeholder */
  right: DiffLine | null;
  /** Any security/quality findings associated with this row */
  findings?: Finding[];
}

/**
 * Aligns a single DiffHunk into side-by-side rows for split diff rendering.
 * Consecutive deleted and added lines are paired up horizontally.
 * Unbalanced lines receive null placeholders on the opposing side to maintain lockstep vertical alignment.
 */
export function alignSplitDiffHunk(
  hunk: DiffHunk,
  findingsByLineNumber?: Map<number, Finding[]>
): SplitDiffRow[] {
  const rows: SplitDiffRow[] = [];
  let pendingDeletions: DiffLine[] = [];
  let pendingAdditions: DiffLine[] = [];

  const flushPending = () => {
    if (pendingDeletions.length === 0 && pendingAdditions.length === 0) {
      return;
    }

    const maxLen = Math.max(pendingDeletions.length, pendingAdditions.length);

    for (let i = 0; i < maxLen; i++) {
      const leftLine = pendingDeletions[i] || null;
      const rightLine = pendingAdditions[i] || null;

      let rowType: 'modified' | 'added' | 'deleted' = 'modified';
      if (leftLine && !rightLine) {
        rowType = 'deleted';
      } else if (!leftLine && rightLine) {
        rowType = 'added';
      }

      // Check for inline findings anchored to either old or new line numbers
      let rowFindings: Finding[] | undefined;
      if (findingsByLineNumber) {
        const findings: Finding[] = [];
        if (rightLine?.newLineNumber && findingsByLineNumber.has(rightLine.newLineNumber)) {
          findings.push(...(findingsByLineNumber.get(rightLine.newLineNumber) || []));
        } else if (leftLine?.oldLineNumber && findingsByLineNumber.has(leftLine.oldLineNumber)) {
          findings.push(...(findingsByLineNumber.get(leftLine.oldLineNumber) || []));
        }
        if (findings.length > 0) {
          rowFindings = findings;
        }
      }

      const rowId = `hunk-${hunk.oldStart}-${hunk.newStart}-split-${leftLine?.oldLineNumber ?? 'x'}-${rightLine?.newLineNumber ?? 'x'}-${i}`;

      rows.push({
        id: rowId,
        type: rowType,
        left: leftLine,
        right: rightLine,
        findings: rowFindings,
      });
    }

    pendingDeletions = [];
    pendingAdditions = [];
  };

  for (let i = 0; i < hunk.lines.length; i++) {
    const line = hunk.lines[i];

    if (line.type === 'CONTEXT') {
      flushPending();

      let rowFindings: Finding[] | undefined;
      if (findingsByLineNumber && line.newLineNumber && findingsByLineNumber.has(line.newLineNumber)) {
        rowFindings = findingsByLineNumber.get(line.newLineNumber);
      }

      const rowId = `hunk-${hunk.oldStart}-${hunk.newStart}-ctx-${line.oldLineNumber ?? i}-${line.newLineNumber ?? i}`;

      rows.push({
        id: rowId,
        type: 'context',
        left: line,
        right: line,
        findings: rowFindings,
      });
    } else if (line.type === 'DELETED') {
      pendingDeletions.push(line);
    } else if (line.type === 'ADDED') {
      pendingAdditions.push(line);
    }
  }

  flushPending();
  return rows;
}
