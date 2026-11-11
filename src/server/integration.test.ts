import test from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = 'http://localhost:3000';

test('GET /api/v1/health returns 200 with service metadata', async () => {
  const res = await fetch(`${BASE_URL}/api/v1/health`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, 'healthy');
  assert.equal(data.model, 'gemini-3.8-flash');
  assert.ok(data.uptimeSeconds !== undefined);
});

test('GET /api/v1/reviews/sample returns all pre-baked fixtures', async () => {
  const res = await fetch(`${BASE_URL}/api/v1/reviews/sample`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.samples));
  assert.ok(data.samples.length >= 3);
  assert.ok(data.samples.some((s: any) => s.id === 'vulnerable_sql_jwt'));
  assert.ok(data.samples.some((s: any) => s.id === 'memory_leak_goroutine'));
  assert.ok(data.samples.some((s: any) => s.id === 'clean_refactor'));
});

test('GET /api/v1/reviews/sample/:id returns sample fixture or 404 for unknown', async () => {
  const okRes = await fetch(`${BASE_URL}/api/v1/reviews/sample/vulnerable_sql_jwt`);
  assert.equal(okRes.status, 200);
  const sample = await okRes.json();
  assert.equal(sample.id, 'vulnerable_sql_jwt');

  const notFoundRes = await fetch(`${BASE_URL}/api/v1/reviews/sample/unknown_sample_xyz`);
  assert.equal(notFoundRes.status, 404);
});

test('POST /api/v1/reviews/analyze rejects empty payload with 400', async () => {
  const res = await fetch(`${BASE_URL}/api/v1/reviews/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ diffText: '' }),
  });
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /Missing or empty diff payload/);
});

test('POST /api/v1/reviews/analyze enforces 2MB size guard with 413', async () => {
  // Generate 2.1MB dummy diff
  const oversizedDiff = 'diff --git a/large.txt b/large.txt\n' + '+'.repeat(2.1 * 1024 * 1024);
  const res = await fetch(`${BASE_URL}/api/v1/reviews/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ diffText: oversizedDiff }),
  });
  assert.equal(res.status, 413);
  const data = await res.json();
  assert.match(data.error, /exceeds maximum limit of 2MB/);
});

test('POST /api/v1/reviews/analyze executes hybrid pipeline and returns valid report', async () => {
  const validDiff = `diff --git a/src/db.ts b/src/db.ts
--- a/src/db.ts
+++ b/src/db.ts
@@ -10,3 +10,4 @@ export function find(id: string) {
+  const q = "SELECT * FROM users WHERE id = " + id;
   return execute(q);
 }
`;
  const res = await fetch(`${BASE_URL}/api/v1/reviews/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ diffText: validDiff, title: 'Integration Test PR' }),
  });

  assert.equal(res.status, 200);
  const report = await res.json();

  assert.ok(report.id);
  assert.equal(report.diff_title, 'Integration Test PR');
  assert.ok(report.summary);
  assert.equal(report.summary.total_files_analyzed, 1);
  assert.ok(report.summary.overall_risk_score <= 100);
  assert.ok(report.findings.length >= 1);
  assert.ok(report.metrics);
  assert.equal(report.metrics.staticFindingsCount, 1);
});
