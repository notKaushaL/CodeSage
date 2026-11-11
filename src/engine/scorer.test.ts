import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRiskScore } from './scorer';
import { Finding } from './types';

function createMockFinding(severity: Finding['severity']): Finding {
  return {
    id: 'test-1',
    file_path: 'test.ts',
    line_number: 10,
    category: 'SECURITY',
    severity,
    title: 'Test issue',
    description: 'Test description',
    confidence: 1.0,
    source: 'STATIC_ANALYZER',
  };
}

test('risk scorer returns 100 for clean diffs with zero findings', () => {
  const result = calculateRiskScore([]);
  assert.equal(result.score, 100);
  assert.equal(result.status, 'CLEAN_PASS');
});

test('risk scorer computes exact formula penalty Score = 100 - [(Crit*25) + (High*15) + (Med*8) + (Low*2)]', () => {
  const findings: Finding[] = [
    createMockFinding('CRITICAL'), // 25
    createMockFinding('HIGH'),     // 15
    createMockFinding('MEDIUM'),   // 8
    createMockFinding('LOW'),      // 2
  ];
  // 100 - (25 + 15 + 8 + 2) = 50
  const result = calculateRiskScore(findings);
  assert.equal(result.score, 50);
  assert.equal(result.status, 'HIGH_RISK');
});

test('risk scorer caps at minimum 0 for multiple critical vulnerabilities', () => {
  const findings: Finding[] = [
    createMockFinding('CRITICAL'),
    createMockFinding('CRITICAL'),
    createMockFinding('CRITICAL'),
    createMockFinding('CRITICAL'),
    createMockFinding('CRITICAL'),
  ]; // 5 * 25 = 125 penalty -> 0
  const result = calculateRiskScore(findings);
  assert.equal(result.score, 0);
  assert.equal(result.status, 'CRITICAL_RISK');
});
