import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { runGeminiReview, validateAndNormalizeAiFindings } from './geminiReviewer';
import { redactToken, parseGitHubPrUrl } from './githubClient';
import { parseUnifiedDiff } from '../engine/parser';

const BASE_URL = 'http://localhost:3000';

test('RELIABILITY 1: runGeminiReview handles missing GEMINI_API_KEY with graceful fallback', async () => {
  const dummyDiff = parseUnifiedDiff(`diff --git a/a.ts b/a.ts
--- a/a.ts
+++ b/a.ts
@@ -1,2 +1,3 @@
+ const x = 1;
`);

  // Explicitly call with empty/missing API key
  const result = await runGeminiReview(dummyDiff, '');
  assert.equal(result.status, 'SKIPPED_NO_KEY');
  assert.deepEqual(result.findings, []);
  assert.equal(result.aiDurationMs, 0);
  assert.ok(result.errorDetail?.includes('not configured'));
});

test('RELIABILITY 2: runGeminiReview handles invalid API key or model rejection gracefully', async () => {
  const dummyDiff = parseUnifiedDiff(`diff --git a/a.ts b/a.ts
--- a/a.ts
+++ b/a.ts
@@ -1,2 +1,3 @@
+ const x = 1;
`);

  // Call with bogus key
  const result = await runGeminiReview(dummyDiff, 'invalid_dummy_key_12345');
  assert.equal(result.status, 'ERROR');
  assert.deepEqual(result.findings, []);
  assert.ok(result.errorDetail !== undefined);
});

test('RELIABILITY 3: validateAndNormalizeAiFindings handles corrupt JSON responses without crashing', () => {
  assert.deepEqual(validateAndNormalizeAiFindings('{"error": "broken json"'), []);
  assert.deepEqual(validateAndNormalizeAiFindings([{}, { file_path: 123 }, { line_number: 'nan' }]), []);
});

test('RELIABILITY 4: API returns security headers (nosniff, SAMEORIGIN, Referrer-Policy)', async () => {
  const res = await fetch(`${BASE_URL}/api/v1/health`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(res.headers.get('x-frame-options'), 'SAMEORIGIN');
  assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
});

test('RELIABILITY 5: Secret redactor sanitizes GitHub tokens, Bearer headers, and JWT credentials', () => {
  const dirty = 'Error at ghp_123456789012345678901234567890 and Bearer secret_token_xyz and eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig';
  const clean = redactToken(dirty);
  assert.ok(!clean.includes('ghp_123456789012345678901234567890'));
  assert.ok(!clean.includes('secret_token_xyz'));
  assert.ok(clean.includes('[REDACTED_GH_TOKEN]'));
  assert.ok(clean.includes('Bearer [REDACTED_TOKEN]'));
});

test('RELIABILITY 6: parseGitHubPrUrl prevents path traversal and malformed inputs', () => {
  assert.equal(parseGitHubPrUrl('../../../etc/passwd#1'), null);
  assert.equal(parseGitHubPrUrl('owner/repo#0'), null);
  assert.equal(parseGitHubPrUrl('owner/repo#-1'), null);
  assert.equal(parseGitHubPrUrl(''), null);
  assert.equal(parseGitHubPrUrl('not a github url'), null);
});

test('RELIABILITY 7: Production build output exists and contains zero exposed API keys', () => {
  const distDir = path.resolve(process.cwd(), 'dist');
  assert.ok(fs.existsSync(distDir), 'dist/ directory must exist from build');
  assert.ok(fs.existsSync(path.join(distDir, 'index.html')), 'dist/index.html must exist');

  // Verify built assets do not leak secrets
  const assetsDir = path.join(distDir, 'assets');
  if (fs.existsSync(assetsDir)) {
    const files = fs.readdirSync(assetsDir);
    for (const f of files) {
      if (f.endsWith('.js')) {
        const content = fs.readFileSync(path.join(assetsDir, f), 'utf-8');
        assert.ok(!content.includes('MY_GEMINI_API_KEY'));
        assert.ok(!content.includes('AIzaSy')); // Standard Google API key prefix
      }
    }
  }
});
