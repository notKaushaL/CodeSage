import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRiskScore } from './scorer';
import { Finding } from './types';

function makeFinding(severity: any, id: string = 'f1'): Finding {
  return {
    id,
    file_path: 'app.ts',
    line_number: 1,
    category: 'SECURITY',
    severity,
    title: 'Test finding',
    description: 'Description',
    confidence: 1.0,
    source: 'STATIC_ANALYZER',
  };
}

test('SCORER 1: No findings results in score 100 and CLEAN_PASS', () => {
  const result = calculateRiskScore([]);
  assert.equal(result.score, 100);
  assert.equal(result.status, 'CLEAN_PASS');
  assert.equal(result.criticalCount, 0);
});

test('SCORER 2: Single critical finding reduces score by exactly 25 points', () => {
  const result = calculateRiskScore([makeFinding('CRITICAL')]);
  assert.equal(result.score, 75);
  assert.equal(result.criticalCount, 1);
  assert.equal(result.status, 'MODERATE_RISK');
});

test('SCORER 3: Multiple critical findings saturate to minimum 0 without going negative', () => {
  const findings = [
    makeFinding('CRITICAL', 'c1'),
    makeFinding('CRITICAL', 'c2'),
    makeFinding('CRITICAL', 'c3'),
    makeFinding('CRITICAL', 'c4'),
    makeFinding('CRITICAL', 'c5'),
  ];
  // 5 * 25 = 125 penalty -> raw score -25 -> clamped to 0
  const result = calculateRiskScore(findings);
  assert.equal(result.score, 0);
  assert.equal(result.status, 'CRITICAL_RISK');
  assert.equal(result.criticalCount, 5);
});

test('SCORER 4: Mixed severity penalties: Crit(25) + High(15) + Med(8) + Low(2) = 50', () => {
  const findings = [
    makeFinding('CRITICAL', 'c1'), // 25
    makeFinding('HIGH', 'h1'),     // 15
    makeFinding('MEDIUM', 'm1'),   // 8
    makeFinding('LOW', 'l1'),      // 2
    makeFinding('INFO', 'i1'),     // 0
  ];
  // 100 - 50 = 50
  const result = calculateRiskScore(findings);
  assert.equal(result.score, 50);
  assert.equal(result.status, 'HIGH_RISK');
  assert.equal(result.infoCount, 1);
});

test('SCORER 5: Invalid or unrecognized severities do not crash scorer and do not apply penalties', () => {
  const findings = [
    makeFinding('UNKNOWN_SEVERITY', 'u1'),
    makeFinding('warning', 'u2'),
  ];
  const result = calculateRiskScore(findings);
  assert.equal(result.score, 100);
  assert.equal(result.status, 'CLEAN_PASS');
});

test('SCORER 6: Maximum boundary clamp ensures score never exceeds 100', () => {
  const result = calculateRiskScore([]);
  assert.ok(result.score <= 100);
  assert.ok(result.score >= 0);
});
