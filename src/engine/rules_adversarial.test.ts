import test from 'node:test';
import assert from 'node:assert/strict';
import { runStaticAnalysis } from './rules';
import { parseUnifiedDiff } from './parser';

test('RULES POSITIVE: Detects all target security vulnerabilities', () => {
  const diffWithVulnerabilities = `diff --git a/vulns.ts b/vulns.ts
--- a/vulns.ts
+++ b/vulns.ts
@@ -1,10 +1,18 @@
 function handleAuth() {
+  const aws = "AKIA1234567890ABCDEF";
+  const jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";
+  const privateKey = "-----BEGIN RSA PRIVATE KEY----- MIIEowIBAAKCAQEA...";
+  const apiKey = "apiKey = 'aB3!dE5@gH7#jK9$mN1%pQ3^sU5&wY7*'";
+  const query = "SELECT * FROM users WHERE id = " + req.query.id;
+  const res = eval(userInput);
+  const cmd = child_process.exec("rm -rf " + userInput);
+  console.log("Dumping password: ", userPassword);
+  go func() { /* unbounded concurrency */ }();
 }
`;
  const parsed = parseUnifiedDiff(diffWithVulnerabilities);
  const findings = runStaticAnalysis(parsed);

  const cweIds = findings.map((f) => f.cwe_id);
  assert.ok(cweIds.includes('CWE-798'), 'Should detect hardcoded AWS key or secret');
  assert.ok(cweIds.includes('CWE-312'), 'Should detect private key block');
  assert.ok(cweIds.includes('CWE-89'), 'Should detect SQL injection');
  assert.ok(cweIds.includes('CWE-94'), 'Should detect dynamic eval');
  assert.ok(cweIds.includes('CWE-78'), 'Should detect command injection');
  assert.ok(cweIds.includes('CWE-532'), 'Should detect sensitive data logging');
  assert.ok(cweIds.includes('CWE-400'), 'Should detect uncontrolled concurrency');
});

test('RULES FALSE-POSITIVE 1: Parameterized SQL queries do not trigger CWE-89', () => {
  const parameterizedDiff = `diff --git a/safe_db.ts b/safe_db.ts
--- a/safe_db.ts
+++ b/safe_db.ts
@@ -1,5 +1,7 @@
 export async function getUser(db: Database, id: string) {
+  const query1 = "SELECT id, name, email FROM users WHERE id = $1";
+  const query2 = 'SELECT * FROM orders WHERE user_id = ? AND status = ?';
+  return db.query(query1, [id]);
 }
`;
  const parsed = parseUnifiedDiff(parameterizedDiff);
  const findings = runStaticAnalysis(parsed);
  const sqlFindings = findings.filter((f) => f.cwe_id === 'CWE-89');
  assert.equal(sqlFindings.length, 0, 'Parameterized queries must not trigger SQL injection');
});

test('RULES FALSE-POSITIVE 2: Deleted vulnerable lines do not trigger findings', () => {
  const deletedVulnDiff = `diff --git a/fix.ts b/fix.ts
--- a/fix.ts
+++ b/fix.ts
@@ -10,3 +10,3 @@
-  const aws = "AKIA1234567890ABCDEF";
-  const q = "SELECT * FROM users WHERE id = " + id;
+  const aws = process.env.AWS_KEY;
+  const q = "SELECT * FROM users WHERE id = $1";
`;
  const parsed = parseUnifiedDiff(deletedVulnDiff);
  const findings = runStaticAnalysis(parsed);
  assert.equal(findings.length, 0, 'Deleted lines must never produce findings');
});

test('RULES FALSE-POSITIVE 3: Harmless documentation comments containing security keywords', () => {
  const docDiff = `diff --git a/docs.ts b/docs.ts
--- a/docs.ts
+++ b/docs.ts
@@ -1,4 +1,6 @@
+/**
+ * Note for developers: never use eval() or raw SQL concatenation like "SELECT * FROM users WHERE id = " + id.
+ * Always use parameterized queries.
+ */
 export function helper() {}
`;
  const parsed = parseUnifiedDiff(docDiff);
  const findings = runStaticAnalysis(parsed);
  assert.equal(findings.length, 0, 'Comments and documentation must not trigger false positives');
});

test('RULES FALSE-POSITIVE 4: Normal random-looking identifiers and hashes', () => {
  const identifiersDiff = `diff --git a/styles.ts b/styles.ts
--- a/styles.ts
+++ b/styles.ts
@@ -1,4 +1,6 @@
+const uuid = "123e4567-e89b-12d3-a456-426614174000";
+const classHash = "css-1a2b3c4d5e6f7g8h";
+const testSha = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
`;
  const parsed = parseUnifiedDiff(identifiersDiff);
  const findings = runStaticAnalysis(parsed);
  assert.equal(findings.length, 0, 'Normal UUIDs, CSS hashes, and commit hashes must not trigger secret scanner');
});

test('RULES FALSE-POSITIVE 5: Safe operational logging does not trigger CWE-532', () => {
  const safeLogDiff = `diff --git a/log.ts b/log.ts
--- a/log.ts
+++ b/log.ts
@@ -1,5 +1,7 @@
 export function onBoot(port: number) {
+  logger.info("Server started on port", port);
+  logger.info("Database connection established");
+  logger.info("Token validation middleware initialized");
 }
`;
  const parsed = parseUnifiedDiff(safeLogDiff);
  const findings = runStaticAnalysis(parsed);
  const logFindings = findings.filter((f) => f.cwe_id === 'CWE-532');
  assert.equal(logFindings.length, 0, 'Safe logging mentioning status words must not trigger CWE-532');
});
