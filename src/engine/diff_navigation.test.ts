import test from 'node:test';
import assert from 'node:assert/strict';
import { parseUnifiedDiff } from './parser';
import { alignSplitDiffHunk } from './splitAligner';
import { DiffFile, Finding } from './types';

test('DIFF NAVIGATION 1: Aggregates finding counts and severity per file correctly', () => {
  const files: DiffFile[] = [
    {
      oldPath: 'src/auth.ts',
      newPath: 'src/auth.ts',
      isNew: false,
      isDeleted: false,
      isRename: false,
      language: 'TypeScript',
      hunks: [],
      addedLineCount: 10,
      deletedLineCount: 2,
    },
    {
      oldPath: 'src/db.ts',
      newPath: 'src/db.ts',
      isNew: false,
      isDeleted: false,
      isRename: false,
      language: 'TypeScript',
      hunks: [],
      addedLineCount: 5,
      deletedLineCount: 1,
    },
  ];

  const findings: Finding[] = [
    {
      id: 'f1',
      file_path: 'src/auth.ts',
      line_number: 12,
      severity: 'CRITICAL',
      category: 'SECURITY',
      title: 'Secret key',
      description: '',
      confidence: 0.99,
      source: 'STATIC_ANALYZER',
    },
    {
      id: 'f2',
      file_path: 'src/auth.ts',
      line_number: 24,
      severity: 'HIGH',
      category: 'SECURITY',
      title: 'Token expiry missing',
      description: '',
      confidence: 0.85,
      source: 'GEMINI_ENGINE',
    },
    {
      id: 'f3',
      file_path: 'src/db.ts',
      line_number: 8,
      severity: 'LOW',
      category: 'CODE_STYLE',
      title: 'Unused import',
      description: '',
      confidence: 0.9,
      source: 'STATIC_ANALYZER',
    },
  ];

  const getFileStats = (file: DiffFile) => {
    const fileFindings = findings.filter(
      (f) => f.file_path === file.newPath || f.file_path === file.oldPath
    );
    return {
      count: fileFindings.length,
      hasCritical: fileFindings.some((f) => f.severity === 'CRITICAL'),
      hasHigh: fileFindings.some((f) => f.severity === 'HIGH'),
    };
  };

  const authStats = getFileStats(files[0]);
  assert.equal(authStats.count, 2);
  assert.equal(authStats.hasCritical, true);
  assert.equal(authStats.hasHigh, true);

  const dbStats = getFileStats(files[1]);
  assert.equal(dbStats.count, 1);
  assert.equal(dbStats.hasCritical, false);
  assert.equal(dbStats.hasHigh, false);
});

test('DIFF NAVIGATION 2: Handles large diff with 100 hunks without memory or alignment errors', () => {
  let largeDiff = 'diff --git a/large_file.ts b/large_file.ts\n--- a/large_file.ts\n+++ b/large_file.ts\n';
  for (let i = 0; i < 100; i++) {
    const lineStart = i * 10 + 1;
    largeDiff += `@@ -${lineStart},4 +${lineStart},5 @@\n`;
    largeDiff += ` context line ${lineStart}\n`;
    largeDiff += `-deleted line ${lineStart + 1}\n`;
    largeDiff += `+added line ${lineStart + 1}a\n`;
    largeDiff += `+added line ${lineStart + 1}b\n`;
    largeDiff += ` context line ${lineStart + 2}\n`;
  }

  const parsed = parseUnifiedDiff(largeDiff);
  assert.equal(parsed.files.length, 1);
  assert.equal(parsed.files[0].hunks.length, 100);

  for (let h = 0; h < parsed.files[0].hunks.length; h++) {
    const rows = alignSplitDiffHunk(parsed.files[0].hunks[h]);
    assert.ok(rows.length >= 4);
    assert.equal(rows[0].type, 'context');
  }
});
