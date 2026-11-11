import test from 'node:test';
import assert from 'node:assert/strict';
import { parseUnifiedDiff } from './parser';

test('PARSER 1: Multiple files with multiple hunks independently track lines', () => {
  const multiFileMultiHunk = `diff --git a/file1.ts b/file1.ts
--- a/file1.ts
+++ b/file1.ts
@@ -10,3 +10,4 @@ function first() {
   const a = 1;
+  const b = 2;
   return a;
 }
@@ -30,2 +31,3 @@ function second() {
-  const oldVal = 10;
+  const newVal = 20;
+  console.log(newVal);
 }
diff --git a/file2.ts b/file2.ts
--- a/file2.ts
+++ b/file2.ts
@@ -1,2 +1,3 @@
 const x = 1;
+const y = 2;
 const z = 3;
`;
  const result = parseUnifiedDiff(multiFileMultiHunk);
  assert.equal(result.totalFiles, 2);

  const file1 = result.files[0];
  assert.equal(file1.newPath, 'file1.ts');
  assert.equal(file1.hunks.length, 2);
  assert.equal(file1.hunks[0].newStart, 10);
  assert.equal(file1.hunks[0].lines.find((l) => l.type === 'ADDED')?.newLineNumber, 11);
  assert.equal(file1.hunks[1].newStart, 31);
  assert.equal(file1.hunks[1].lines.filter((l) => l.type === 'ADDED').length, 2);
  assert.equal(file1.hunks[1].lines.filter((l) => l.type === 'ADDED')[0].newLineNumber, 31);
  assert.equal(file1.hunks[1].lines.filter((l) => l.type === 'ADDED')[1].newLineNumber, 32);

  const file2 = result.files[1];
  assert.equal(file2.newPath, 'file2.ts');
  assert.equal(file2.hunks.length, 1);
  assert.equal(file2.hunks[0].lines.find((l) => l.type === 'ADDED')?.newLineNumber, 2);
});

test('PARSER 2: Multiple consecutive additions and deletions retain strict line ordering', () => {
  const consecutiveDiff = `diff --git a/data.ts b/data.ts
--- a/data.ts
+++ b/data.ts
@@ -10,4 +10,4 @@
-line1_old
-line2_old
+line1_new
+line2_new
 line3_context
 line4_context
`;
  const result = parseUnifiedDiff(consecutiveDiff);
  assert.equal(result.totalFiles, 1);
  const hunk = result.files[0].hunks[0];

  const deleted = hunk.lines.filter((l) => l.type === 'DELETED');
  assert.equal(deleted.length, 2);
  assert.equal(deleted[0].oldLineNumber, 10);
  assert.equal(deleted[1].oldLineNumber, 11);

  const added = hunk.lines.filter((l) => l.type === 'ADDED');
  assert.equal(added.length, 2);
  assert.equal(added[0].newLineNumber, 10);
  assert.equal(added[1].newLineNumber, 11);

  const context = hunk.lines.filter((l) => l.type === 'CONTEXT');
  assert.equal(context.length, 2);
  assert.equal(context[0].oldLineNumber, 12);
  assert.equal(context[0].newLineNumber, 12);
});

test('PARSER 3: Empty file creation (zero hunks) is correctly identified as new file', () => {
  const emptyNewFileDiff = `diff --git a/empty.txt b/empty.txt
new file mode 100644
index 0000000..e69de29
`;
  const result = parseUnifiedDiff(emptyNewFileDiff);
  assert.equal(result.totalFiles, 1);
  assert.equal(result.files[0].isNew, true);
  assert.equal(result.files[0].newPath, 'empty.txt');
  assert.equal(result.files[0].hunks.length, 0);
});

test('PARSER 4: CRLF line endings (Windows \\r\\n) parse identically to LF', () => {
  const crlfDiff = 'diff --git a/win.ts b/win.ts\r\n--- a/win.ts\r\n+++ b/win.ts\r\n@@ -1,2 +1,3 @@\r\n context\r\n+added\r\n context2\r\n';
  const result = parseUnifiedDiff(crlfDiff);
  assert.equal(result.totalFiles, 1);
  assert.equal(result.files[0].hunks.length, 1);
  assert.equal(result.files[0].addedLineCount, 1);
  assert.equal(result.files[0].hunks[0].lines.find((l) => l.type === 'ADDED')?.newLineNumber, 2);
});

test('PARSER 5: Files containing spaces and Unicode filenames', () => {
  const unicodeDiff = `diff --git "a/src/日本語/設定.json" "b/src/日本語/設定.json"
--- "a/src/日本語/設定.json"
+++ "b/src/日本語/設定.json"
@@ -1,2 +1,3 @@
 {
+  "キー": "値",
 }
`;
  const result = parseUnifiedDiff(unicodeDiff);
  assert.equal(result.totalFiles, 1);
  assert.equal(result.files[0].newPath, 'src/日本語/設定.json');
  assert.equal(result.files[0].language, 'JSON');
  assert.equal(result.files[0].addedLineCount, 1);
});

test('PARSER 6: Renamed file diffs without hunk changes', () => {
  const renameDiff = `diff --git a/old_name.ts b/new_name.ts
similarity index 100%
rename from old_name.ts
rename to new_name.ts
`;
  const result = parseUnifiedDiff(renameDiff);
  assert.equal(result.totalFiles, 1);
  assert.equal(result.files[0].isRename, true);
  assert.equal(result.files[0].oldPath, 'old_name.ts');
  assert.equal(result.files[0].newPath, 'new_name.ts');
});

test('PARSER 7: File permission / mode change diffs', () => {
  const modeDiff = `diff --git a/run.sh b/run.sh
old mode 100644
new mode 100755
`;
  const result = parseUnifiedDiff(modeDiff);
  assert.equal(result.totalFiles, 1);
  assert.equal(result.files[0].newPath, 'run.sh');
  assert.equal(result.files[0].language, 'Shell');
});

test('PARSER 8: Missing final newline warning is skipped without shifting lines', () => {
  const noNewlineDiff = `diff --git a/eof.ts b/eof.ts
--- a/eof.ts
+++ b/eof.ts
@@ -1,2 +1,2 @@
-hello
+hello world
\\ No newline at end of file
`;
  const result = parseUnifiedDiff(noNewlineDiff);
  assert.equal(result.totalFiles, 1);
  const lines = result.files[0].hunks[0].lines;
  assert.equal(lines.length, 2);
  assert.equal(lines[1].content, 'hello world');
});

test('PARSER 9: Malformed hunk headers do not cause crashes or line number corruption', () => {
  const malformedDiff = `diff --git a/bad.ts b/bad.ts
--- a/bad.ts
+++ b/bad.ts
@@ invalid hunk header @@
+some added line
@@ -10,1 +10,2 @@
 valid context
+valid added
`;
  const result = parseUnifiedDiff(malformedDiff);
  assert.equal(result.totalFiles, 1);
  // Valid hunk must be parsed cleanly
  assert.equal(result.files[0].hunks.length, 1);
  assert.equal(result.files[0].hunks[0].newStart, 10);
});

test('PARSER 10: Hunk line-count mismatch handles extra lines gracefully without offset desync', () => {
  // Hunk claims 1 line (+10,1) but actually contains 3 additions
  const mismatchDiff = `diff --git a/mismatch.ts b/mismatch.ts
--- a/mismatch.ts
+++ b/mismatch.ts
@@ -10,1 +10,1 @@
+line1
+line2
+line3
`;
  const result = parseUnifiedDiff(mismatchDiff);
  assert.equal(result.totalFiles, 1);
  const added = result.files[0].hunks[0].lines.filter((l) => l.type === 'ADDED');
  assert.equal(added.length, 3);
  assert.equal(added[0].newLineNumber, 10);
  assert.equal(added[1].newLineNumber, 11);
  assert.equal(added[2].newLineNumber, 12);
});

test('PARSER 11: Binary file diffs are recognized without throwing', () => {
  const binaryDiff = `diff --git a/logo.png b/logo.png
Binary files a/logo.png and b/logo.png differ
`;
  const result = parseUnifiedDiff(binaryDiff);
  assert.equal(result.totalFiles, 1);
  assert.equal(result.files[0].newPath, 'logo.png');
  assert.equal(result.files[0].hunks.length, 0);
});

test('PARSER 12: Large diff with 60 files parses efficiently', () => {
  let largeDiff = '';
  for (let i = 1; i <= 60; i++) {
    largeDiff += `diff --git a/file_${i}.ts b/file_${i}.ts\n--- a/file_${i}.ts\n+++ b/file_${i}.ts\n@@ -1,1 +1,2 @@\n context\n+added_${i}\n`;
  }
  const start = Date.now();
  const result = parseUnifiedDiff(largeDiff);
  const elapsed = Date.now() - start;

  assert.equal(result.totalFiles, 60);
  assert.equal(result.totalAdded, 60);
  assert.ok(elapsed < 200, `Large diff took ${elapsed}ms, expected < 200ms`);
});
