import test from 'node:test';
import assert from 'node:assert/strict';
import { packDiffForLLM } from './chunker';
import { deduplicateFindings } from './dedup';
import { parseUnifiedDiff } from './parser';
import { Finding } from './types';

test('CHUNKING 1: Context lines <= 5 from changes are preserved while distant boilerplate is collapsed', () => {
  let contextBefore = '';
  for (let i = 1; i <= 20; i++) {
    contextBefore += ` const pre_${i} = ${i};\n`;
  }
  let contextAfter = '';
  for (let i = 1; i <= 20; i++) {
    contextAfter += ` const post_${i} = ${i};\n`;
  }

  const diffWithBoilerplate = `diff --git a/big.ts b/big.ts
--- a/big.ts
+++ b/big.ts
@@ -1,41 +1,42 @@
${contextBefore}+  const CHANGED_LINE = "critical_change";
${contextAfter}`;

  const parsed = parseUnifiedDiff(diffWithBoilerplate);
  const result = packDiffForLLM(parsed);

  assert.equal(result.chunks.length, 1);
  assert.ok(result.chunks[0].compactContent.includes('Boilerplate context collapsed'));
  assert.ok(result.chunks[0].compactContent.includes('[L21]   const CHANGED_LINE = "critical_change";'));
  assert.ok(result.savingsPercentage > 0, 'Token savings percentage must be positive');
});

test('CHUNKING 2: Hunk enclosing scope metadata is preserved in prompt chunks', () => {
  const diffWithScope = `diff --git a/service.ts b/service.ts
--- a/service.ts
+++ b/service.ts
@@ -10,3 +10,4 @@ class PaymentGateway {
   init() {}
+  charge() {}
 }
`;
  const parsed = parseUnifiedDiff(diffWithScope);
  const result = packDiffForLLM(parsed);
  assert.equal(result.chunks[0].enclosingScope, 'class PaymentGateway {');
  assert.ok(result.packedPrompt.includes('SCOPE: class PaymentGateway {'));
});

test('DEDUP 1: Overlapping static and AI findings on proximate lines merge into HYBRID_CONSENSUS', () => {
  const diff = `diff --git a/auth.ts b/auth.ts
--- a/auth.ts
+++ b/auth.ts
@@ -10,2 +10,3 @@
 function check() {
+  const key = "AKIA1234567890ABCDEF";
 }
`;
  const parsed = parseUnifiedDiff(diff);

  const staticFinding: Finding = {
    id: 'static-1',
    file_path: 'auth.ts',
    line_number: 11,
    category: 'SECURITY',
    severity: 'CRITICAL',
    cwe_id: 'CWE-798',
    title: 'Hardcoded AWS Key',
    description: 'Static detected AWS key',
    confidence: 0.95,
    source: 'STATIC_ANALYZER',
  };

  const aiFinding: Finding = {
    id: 'ai-1',
    file_path: 'auth.ts',
    line_number: 11,
    category: 'SECURITY',
    severity: 'CRITICAL',
    cwe_id: 'CWE-798',
    title: 'Exposed AWS Credential',
    description: 'AI model confirmed exposed credential',
    confidence: 0.9,
    source: 'GEMINI_ENGINE',
  };

  const merged = deduplicateFindings([staticFinding], [aiFinding], parsed);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].source, 'HYBRID_CONSENSUS');
  assert.equal(merged[0].line_number, 11);
  assert.ok(merged[0].confidence >= 0.95);
});

test('DEDUP 2: Static and AI findings with different categories or distant lines do NOT merge', () => {
  const diff = `diff --git a/auth.ts b/auth.ts
--- a/auth.ts
+++ b/auth.ts
@@ -1,15 +1,18 @@
+ line1
+ line2
+ line3
+ line4
+ line5
+ line6
+ line7
+ line8
+ line9
+ line10
+ line11
`;
  const parsed = parseUnifiedDiff(diff);

  const staticFinding: Finding = {
    id: 'static-1',
    file_path: 'auth.ts',
    line_number: 2,
    category: 'SECURITY',
    severity: 'HIGH',
    title: 'Security flaw',
    description: 'Static security flaw',
    confidence: 0.9,
    source: 'STATIC_ANALYZER',
  };

  const aiFinding: Finding = {
    id: 'ai-1',
    file_path: 'auth.ts',
    line_number: 10, // Far apart (> 2 lines)
    category: 'SECURITY',
    severity: 'HIGH',
    title: 'Security flaw',
    description: 'AI flaw at line 10',
    confidence: 0.9,
    source: 'GEMINI_ENGINE',
  };

  const merged = deduplicateFindings([staticFinding], [aiFinding], parsed);
  assert.equal(merged.length, 2);
  assert.ok(merged.some((f) => f.source === 'STATIC_ANALYZER'));
  assert.ok(merged.some((f) => f.source === 'GEMINI_ENGINE'));
});

test('DEDUP 3: AI findings referencing hallucinated files or out-of-bounds lines are REJECTED', () => {
  const diff = `diff --git a/real.ts b/real.ts
--- a/real.ts
+++ b/real.ts
@@ -1,2 +1,3 @@
 const a = 1;
+const b = 2;
`;
  const parsed = parseUnifiedDiff(diff);

  const hallucinatedFileFinding: Finding = {
    id: 'ai-fake-file',
    file_path: 'ghost_file_does_not_exist.ts',
    line_number: 10,
    category: 'SECURITY',
    severity: 'HIGH',
    title: 'Fake file issue',
    description: 'Model hallucinated a file',
    confidence: 0.9,
    source: 'GEMINI_ENGINE',
  };

  const outOfBoundsLineFinding: Finding = {
    id: 'ai-fake-line',
    file_path: 'real.ts',
    line_number: 99999, // Hunk only spans lines 1-3
    category: 'SECURITY',
    severity: 'HIGH',
    title: 'Fake line issue',
    description: 'Model hallucinated line 99999',
    confidence: 0.9,
    source: 'GEMINI_ENGINE',
  };

  const merged = deduplicateFindings([], [hallucinatedFileFinding, outOfBoundsLineFinding], parsed);
  assert.equal(merged.length, 0, 'Hallucinated files and out-of-bounds lines must be rejected');
});
