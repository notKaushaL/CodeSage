import test from 'node:test';
import assert from 'node:assert/strict';
import { alignSplitDiffHunk } from './splitAligner';
import { DiffHunk, Finding } from './types';

test('SPLIT ALIGNER 1: Context lines align identically on left and right', () => {
  const hunk: DiffHunk = {
    header: '@@ -1,3 +1,3 @@',
    oldStart: 1,
    oldLines: 3,
    newStart: 1,
    newLines: 3,
    lines: [
      { type: 'CONTEXT', content: 'const a = 1;', oldLineNumber: 1, newLineNumber: 1 },
      { type: 'CONTEXT', content: 'const b = 2;', oldLineNumber: 2, newLineNumber: 2 },
      { type: 'CONTEXT', content: 'const c = 3;', oldLineNumber: 3, newLineNumber: 3 },
    ],
  };

  const rows = alignSplitDiffHunk(hunk);
  assert.equal(rows.length, 3);
  for (let i = 0; i < 3; i++) {
    assert.equal(rows[i].type, 'context');
    assert.equal(rows[i].left?.content, hunk.lines[i].content);
    assert.equal(rows[i].right?.content, hunk.lines[i].content);
    assert.equal(rows[i].left?.oldLineNumber, i + 1);
    assert.equal(rows[i].right?.newLineNumber, i + 1);
  }
});

test('SPLIT ALIGNER 2: Equal number of deletions and additions are paired side-by-side', () => {
  const hunk: DiffHunk = {
    header: '@@ -10,2 +10,2 @@',
    oldStart: 10,
    oldLines: 2,
    newStart: 10,
    newLines: 2,
    lines: [
      { type: 'DELETED', content: 'old line 10', oldLineNumber: 10 },
      { type: 'DELETED', content: 'old line 11', oldLineNumber: 11 },
      { type: 'ADDED', content: 'new line 10', newLineNumber: 10 },
      { type: 'ADDED', content: 'new line 11', newLineNumber: 11 },
    ],
  };

  const rows = alignSplitDiffHunk(hunk);
  assert.equal(rows.length, 2);

  assert.equal(rows[0].type, 'modified');
  assert.equal(rows[0].left?.content, 'old line 10');
  assert.equal(rows[0].right?.content, 'new line 10');

  assert.equal(rows[1].type, 'modified');
  assert.equal(rows[1].left?.content, 'old line 11');
  assert.equal(rows[1].right?.content, 'new line 11');
});

test('SPLIT ALIGNER 3: More deletions than additions generates null padding on right side', () => {
  const hunk: DiffHunk = {
    header: '@@ -5,3 +5,1 @@',
    oldStart: 5,
    oldLines: 3,
    newStart: 5,
    newLines: 1,
    lines: [
      { type: 'DELETED', content: 'del 1', oldLineNumber: 5 },
      { type: 'DELETED', content: 'del 2', oldLineNumber: 6 },
      { type: 'DELETED', content: 'del 3', oldLineNumber: 7 },
      { type: 'ADDED', content: 'add 1', newLineNumber: 5 },
    ],
  };

  const rows = alignSplitDiffHunk(hunk);
  assert.equal(rows.length, 3);

  // Row 0: paired
  assert.equal(rows[0].type, 'modified');
  assert.equal(rows[0].left?.content, 'del 1');
  assert.equal(rows[0].right?.content, 'add 1');

  // Row 1: deleted only (right is null placeholder)
  assert.equal(rows[1].type, 'deleted');
  assert.equal(rows[1].left?.content, 'del 2');
  assert.equal(rows[1].right, null);

  // Row 2: deleted only (right is null placeholder)
  assert.equal(rows[2].type, 'deleted');
  assert.equal(rows[2].left?.content, 'del 3');
  assert.equal(rows[2].right, null);
});

test('SPLIT ALIGNER 4: More additions than deletions generates null padding on left side', () => {
  const hunk: DiffHunk = {
    header: '@@ -1,1 +1,3 @@',
    oldStart: 1,
    oldLines: 1,
    newStart: 1,
    newLines: 3,
    lines: [
      { type: 'DELETED', content: 'old 1', oldLineNumber: 1 },
      { type: 'ADDED', content: 'new 1', newLineNumber: 1 },
      { type: 'ADDED', content: 'new 2', newLineNumber: 2 },
      { type: 'ADDED', content: 'new 3', newLineNumber: 3 },
    ],
  };

  const rows = alignSplitDiffHunk(hunk);
  assert.equal(rows.length, 3);

  // Row 0: paired
  assert.equal(rows[0].type, 'modified');
  assert.equal(rows[0].left?.content, 'old 1');
  assert.equal(rows[0].right?.content, 'new 1');

  // Row 1: added only (left is null placeholder)
  assert.equal(rows[1].type, 'added');
  assert.equal(rows[1].left, null);
  assert.equal(rows[1].right?.content, 'new 2');

  // Row 2: added only (left is null placeholder)
  assert.equal(rows[2].type, 'added');
  assert.equal(rows[2].left, null);
  assert.equal(rows[2].right?.content, 'new 3');
});

test('SPLIT ALIGNER 5: Correctly pins findings to corresponding split row', () => {
  const hunk: DiffHunk = {
    header: '@@ -1,2 +1,2 @@',
    oldStart: 1,
    oldLines: 2,
    newStart: 1,
    newLines: 2,
    lines: [
      { type: 'CONTEXT', content: 'line 1', oldLineNumber: 1, newLineNumber: 1 },
      { type: 'ADDED', content: 'api_key = "secret"', newLineNumber: 2 },
    ],
  };

  const mockFinding: Finding = {
    id: 'f-1',
    file_path: 'app.py',
    line_number: 2,
    severity: 'CRITICAL',
    category: 'SECURITY',
    title: 'Hardcoded Secret',
    description: 'Exposed secret',
    confidence: 0.95,
    source: 'STATIC_ANALYZER',
  };

  const findingsMap = new Map<number, Finding[]>([[2, [mockFinding]]]);

  const rows = alignSplitDiffHunk(hunk, findingsMap);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].findings, undefined);
  assert.ok(rows[1].findings);
  assert.equal(rows[1].findings.length, 1);
  assert.equal(rows[1].findings[0].id, 'f-1');
});
