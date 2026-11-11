import test from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = 'http://localhost:3000';

test('API SECURITY 1: Malformed JSON request body returns clean 400 JSON error without HTML or stack trace', async () => {
  const res = await fetch(`${BASE_URL}/api/v1/reviews/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"diffText": "incomplete json payload ...',
  });

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.error, 'Malformed JSON payload in request body.');
});

test('API SECURITY 2: Non-diff payload (gibberish or binary) returns 422 Unprocessable Entity', async () => {
  const res = await fetch(`${BASE_URL}/api/v1/reviews/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ diffText: 'Just some random text without any diff or hunk markers' }),
  });

  assert.equal(res.status, 422);
  const data = await res.json();
  assert.ok(data.error.includes('Could not parse unified diff'));
});

test('API SECURITY 3: Oversized diff payload (> 2MB) is blocked at size guard with 413', async () => {
  const oversizedDiff = 'diff --git a/huge.ts b/huge.ts\n' + 'A'.repeat(2.1 * 1024 * 1024);
  const res = await fetch(`${BASE_URL}/api/v1/reviews/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ diffText: oversizedDiff }),
  });

  assert.equal(res.status, 413);
  const data = await res.json();
  assert.ok(data.error.includes('exceeds maximum limit of 2MB'));
});

test('API SECURITY 4: Error responses never expose internal stack traces or environment secrets', async () => {
  const res = await fetch(`${BASE_URL}/api/v1/reviews/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ diffText: '' }),
  });

  assert.equal(res.status, 400);
  const bodyText = await res.text();
  assert.ok(!bodyText.includes('node_modules'));
  assert.ok(!bodyText.includes('GEMINI_API_KEY'));
  assert.ok(!bodyText.includes('at process.processTicksAndRejections'));
});
