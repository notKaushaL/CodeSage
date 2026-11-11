import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateShannonEntropy, runStaticAnalysis } from './rules';
import { parseUnifiedDiff } from './parser';

test('Shannon entropy calculation identifies random secret keys', () => {
  const lowEntropy = calculateShannonEntropy('aaaaabbbbbccccc');
  const highEntropy = calculateShannonEntropy('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY');

  assert.ok(highEntropy > 4.2);
  assert.ok(lowEntropy < 2.0);
});

test('static analyzer detects hardcoded AWS key and SQL injection', () => {
  const diff = `diff --git a/src/service.ts b/src/service.ts
--- a/src/service.ts
+++ b/src/service.ts
@@ -1,5 +1,7 @@
 function run() {
+  const awsKey = "AKIAIOSFODNN7EXAMPLE";
+  const q = "SELECT * FROM users WHERE id = " + input;
   return q;
 }
`;
  const parsed = parseUnifiedDiff(diff);
  const findings = runStaticAnalysis(parsed);

  assert.equal(findings.length, 2);
  const awsFinding = findings.find((f) => f.cwe_id === 'CWE-798');
  assert.ok(awsFinding);
  assert.equal(awsFinding?.severity, 'CRITICAL');
  assert.equal(awsFinding?.line_number, 2);

  const sqlFinding = findings.find((f) => f.cwe_id === 'CWE-89');
  assert.ok(sqlFinding);
  assert.equal(sqlFinding?.severity, 'CRITICAL');
  assert.equal(sqlFinding?.line_number, 3);
});

test('static analyzer ignores deleted lines', () => {
  const diff = `diff --git a/src/service.ts b/src/service.ts
--- a/src/service.ts
+++ b/src/service.ts
@@ -1,3 +1,2 @@
-  const awsKey = "AKIAIOSFODNN7EXAMPLE";
   const clean = true;
`;
  const parsed = parseUnifiedDiff(diff);
  const findings = runStaticAnalysis(parsed);
  assert.equal(findings.length, 0);
});
