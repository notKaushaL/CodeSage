import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAndNormalizeAiFindings } from './geminiReviewer';

test('AI REVIEWER 1: Valid structured findings are normalized with required fields', () => {
  const rawFindings = [
    {
      file_path: 'src/auth.ts',
      line_number: 42,
      category: 'SECURITY',
      severity: 'CRITICAL',
      cwe_id: 'CWE-89',
      title: 'SQL Injection in Query',
      description: 'Raw concat allows arbitrary SQL execution',
      suggestion_diff: '- q = a + b;\n+ q = db.param(a, b);',
      confidence: 0.95,
    },
  ];

  const normalized = validateAndNormalizeAiFindings(rawFindings);
  assert.equal(normalized.length, 1);
  assert.equal(normalized[0].file_path, 'src/auth.ts');
  assert.equal(normalized[0].line_number, 42);
  assert.equal(normalized[0].category, 'SECURITY');
  assert.equal(normalized[0].severity, 'CRITICAL');
  assert.equal(normalized[0].confidence, 0.95);
  assert.equal(normalized[0].source, 'GEMINI_ENGINE');
});

test('AI REVIEWER 2: Non-array or malformed JSON inputs return empty array without crashing', () => {
  assert.deepEqual(validateAndNormalizeAiFindings(null), []);
  assert.deepEqual(validateAndNormalizeAiFindings(undefined), []);
  assert.deepEqual(validateAndNormalizeAiFindings('not an array'), []);
  assert.deepEqual(validateAndNormalizeAiFindings({}), []);
  assert.deepEqual(validateAndNormalizeAiFindings([null, undefined, 'string', 123]), []);
});

test('AI REVIEWER 3: Rejects findings with missing or empty file_path', () => {
  const rawFindings = [
    { file_path: '', line_number: 10, category: 'BUG', severity: 'HIGH' },
    { file_path: '   ', line_number: 10, category: 'BUG', severity: 'HIGH' },
    { line_number: 10, category: 'BUG', severity: 'HIGH' },
  ];
  const normalized = validateAndNormalizeAiFindings(rawFindings);
  assert.equal(normalized.length, 0);
});

test('AI REVIEWER 4: Rejects findings with invalid, NaN, negative, or zero line numbers', () => {
  const rawFindings = [
    { file_path: 'a.ts', line_number: -5, category: 'BUG', severity: 'HIGH' },
    { file_path: 'a.ts', line_number: 0, category: 'BUG', severity: 'HIGH' },
    { file_path: 'a.ts', line_number: NaN, category: 'BUG', severity: 'HIGH' },
    { file_path: 'a.ts', line_number: 'invalid', category: 'BUG', severity: 'HIGH' },
    { file_path: 'a.ts', line_number: Infinity, category: 'BUG', severity: 'HIGH' },
  ];
  const normalized = validateAndNormalizeAiFindings(rawFindings);
  assert.equal(normalized.length, 0);
});

test('AI REVIEWER 5: Normalizes lowercase and unknown severity values to safe defaults', () => {
  const rawFindings = [
    { file_path: 'a.ts', line_number: 10, category: 'security', severity: 'critical' },
    { file_path: 'a.ts', line_number: 20, category: 'bug', severity: 'unknown_severity_value' },
  ];
  const normalized = validateAndNormalizeAiFindings(rawFindings);
  assert.equal(normalized.length, 2);
  assert.equal(normalized[0].severity, 'CRITICAL');
  assert.equal(normalized[0].category, 'SECURITY');
  assert.equal(normalized[1].severity, 'MEDIUM', 'Unknown severity should safely default to MEDIUM');
  assert.equal(normalized[1].category, 'BUG');
});

test('AI REVIEWER 6: Confidence is clamped to [0.1, 1.0]', () => {
  const rawFindings = [
    { file_path: 'a.ts', line_number: 10, confidence: 5.0 },
    { file_path: 'a.ts', line_number: 11, confidence: -1.0 },
    { file_path: 'a.ts', line_number: 12, confidence: 'not-a-number' },
  ];
  const normalized = validateAndNormalizeAiFindings(rawFindings);
  assert.equal(normalized[0].confidence, 1.0);
  assert.equal(normalized[1].confidence, 0.1);
  assert.equal(normalized[2].confidence, 0.85); // default confidence
});
