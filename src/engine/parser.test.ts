import test from 'node:test';
import assert from 'node:assert/strict';
import { parseUnifiedDiff } from './parser';

const SAMPLE_DIFF = `diff --git a/src/auth.ts b/src/auth.ts
index 83a21b4..6a99b21 100644
--- a/src/auth.ts
+++ b/src/auth.ts
@@ -10,6 +10,8 @@ export function authenticateUser(req: Request) {
   const token = req.headers['authorization'];
+  // Insecure hardcoded token check
+  const masterKey = "AKIAIOSFODNN7EXAMPLE";
   if (!token) {
     return false;
   }
@@ -25,4 +27,5 @@ export function getUserById(id: string) {
-  const query = "SELECT * FROM users WHERE id = '" + id + "'";
+  const query = \`SELECT * FROM users WHERE id = \${id}\`;
+  console.log("Querying for user:", id);
   return db.execute(query);
 }
`;

test('parser correctly detects files and language', () => {
  const result = parseUnifiedDiff(SAMPLE_DIFF);
  assert.equal(result.totalFiles, 1);
  const file = result.files[0];
  assert.equal(file.newPath, 'src/auth.ts');
  assert.equal(file.language, 'TypeScript');
  assert.equal(file.hunks.length, 2);
});

test('parser computes exact physical line numbers for additions and deletions', () => {
  const result = parseUnifiedDiff(SAMPLE_DIFF);
  const hunk1 = result.files[0].hunks[0];
  assert.equal(hunk1.newStart, 10);
  assert.equal(hunk1.lines.length, 6);

  const addedLines = hunk1.lines.filter((l) => l.type === 'ADDED');
  assert.equal(addedLines.length, 2);
  assert.equal(addedLines[0].newLineNumber, 11);
  assert.equal(addedLines[1].newLineNumber, 12);
  assert.match(addedLines[1].content, /AKIAIOSFODNN7EXAMPLE/);

  const hunk2 = result.files[0].hunks[1];
  const deletedLines = hunk2.lines.filter((l) => l.type === 'DELETED');
  assert.equal(deletedLines.length, 1);
  assert.equal(deletedLines[0].oldLineNumber, 25);
});

test('parser handles newly created files (/dev/null source)', () => {
  const newFileDiff = `diff --git a/dev/null b/src/config.json
new file mode 100644
--- /dev/null
+++ b/src/config.json
@@ -0,0 +1,3 @@
+{
+  "env": "production"
+}
`;
  const result = parseUnifiedDiff(newFileDiff);
  assert.equal(result.totalFiles, 1);
  assert.equal(result.files[0].isNew, true);
  assert.equal(result.files[0].newPath, 'src/config.json');
  assert.equal(result.totalAdded, 3);
});

test('parser handles deleted files (/dev/null target)', () => {
  const deletedFileDiff = `diff --git a/old.txt b/dev/null
deleted file mode 100644
--- a/old.txt
+++ /dev/null
@@ -1,2 +0,0 @@
-first line
-second line
`;
  const result = parseUnifiedDiff(deletedFileDiff);
  assert.equal(result.totalFiles, 1);
  assert.equal(result.files[0].isDeleted, true);
  assert.equal(result.totalDeleted, 2);
});

test('parser handles standard multi-file patch without diff --git headers', () => {
  const standardPatch = `--- a/file1.ts
+++ b/file1.ts
@@ -1,2 +1,2 @@
-const old = 1;
+const old = 2;
--- a/file2.ts
+++ b/file2.ts
@@ -5,2 +5,2 @@
-foo()
+bar()
`;
  const result = parseUnifiedDiff(standardPatch);
  assert.equal(result.totalFiles, 2);
  assert.equal(result.files[0].newPath, 'file1.ts');
  assert.equal(result.files[1].newPath, 'file2.ts');
  assert.equal(result.totalAdded, 2);
  assert.equal(result.totalDeleted, 2);
});

test('parser handles quoted file paths with spaces', () => {
  const quotedDiff = `diff --git "a/path with spaces.ts" "b/path with spaces.ts"
--- "a/path with spaces.ts"
+++ "b/path with spaces.ts"
@@ -1,1 +1,2 @@
+// added line
`;
  const result = parseUnifiedDiff(quotedDiff);
  assert.equal(result.totalFiles, 1);
  assert.equal(result.files[0].newPath, 'path with spaces.ts');
  assert.equal(result.totalAdded, 1);
});
