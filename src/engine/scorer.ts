import { Finding, ReviewSummary } from './types';

export function calculateRiskScore(findings: Finding[]): {
  score: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  infoCount: number;
  status: 'CRITICAL_RISK' | 'HIGH_RISK' | 'MODERATE_RISK' | 'CLEAN_PASS';
} {
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;
  let infoCount = 0;

  for (const f of findings) {
    switch (f.severity) {
      case 'CRITICAL':
        criticalCount++;
        break;
      case 'HIGH':
        highCount++;
        break;
      case 'MEDIUM':
        mediumCount++;
        break;
      case 'LOW':
        lowCount++;
        break;
      case 'INFO':
        infoCount++;
        break;
    }
  }

  // Composite Risk Index formula from specification:
  // Score = 100 - [(Crit×25) + (High×15) + (Med×8) + (Low×2)]
  const penalty =
    criticalCount * 25 +
    highCount * 15 +
    mediumCount * 8 +
    lowCount * 2;

  const rawScore = 100 - penalty;
  const score = Math.max(0, Math.min(100, rawScore));

  let status: 'CRITICAL_RISK' | 'HIGH_RISK' | 'MODERATE_RISK' | 'CLEAN_PASS';
  if (score < 50) {
    status = 'CRITICAL_RISK';
  } else if (score < 70) {
    status = 'HIGH_RISK';
  } else if (score < 85) {
    status = 'MODERATE_RISK';
  } else {
    status = 'CLEAN_PASS';
  }

  return {
    score,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    infoCount,
    status,
  };
}

export function generateExecutiveSummary(
  findings: Finding[],
  filesAnalyzed: number,
  linesAnalyzed: number,
  score: number,
  status: string
): { executive_summary: string; top_recommendations: string[] } {
  if (findings.length === 0) {
    return {
      executive_summary: `Clean diff: Analyzed ${filesAnalyzed} file(s) across ${linesAnalyzed} line change(s). No security vulnerabilities, regressions, or code defects detected. Ready for merge review.`,
      top_recommendations: [
        'Ensure unit and integration tests pass in CI.',
        'Verify backwards compatibility of exported interfaces.',
      ],
    };
  }

  const criticals = findings.filter((f) => f.severity === 'CRITICAL');
  const highs = findings.filter((f) => f.severity === 'HIGH');
  const mediums = findings.filter((f) => f.severity === 'MEDIUM');

  let summary = `Analysis complete across ${filesAnalyzed} file(s) (${linesAnalyzed} lines). Risk Score: ${score}/100 (${status.replace('_', ' ')}). `;

  if (criticals.length > 0) {
    summary += `CRITICAL BLOCKERS DETECTED: ${criticals.map((c) => c.title).slice(0, 2).join('; ')}. Immediate remediation required before merging.`;
  } else if (highs.length > 0) {
    summary += `High-risk issues identified: ${highs.map((h) => h.title).slice(0, 2).join('; ')}.`;
  } else {
    summary += `Identified ${mediums.length} medium and minor code quality improvements.`;
  }

  const recommendations: string[] = [];
  if (criticals.some((c) => c.cwe_id === 'CWE-798' || c.cwe_id === 'CWE-312')) {
    recommendations.push('Revoke any committed secrets/keys immediately and rotate credentials in KMS/Secrets Manager.');
  }
  if (criticals.some((c) => c.cwe_id === 'CWE-89')) {
    recommendations.push('Refactor dynamic SQL string concatenations to parameterized queries with bind variables.');
  }
  if (criticals.some((c) => c.cwe_id === 'CWE-94' || c.cwe_id === 'CWE-78')) {
    recommendations.push('Eliminate dynamic code/command execution; replace with structured APIs and allowlists.');
  }
  if (findings.some((f) => f.category === 'PERFORMANCE')) {
    recommendations.push('Implement concurrency bounds (semaphore/worker pool) to prevent thread/goroutine leaks.');
  }
  if (recommendations.length < 2) {
    recommendations.push('Add automated regression tests covering the modified control flow.');
    recommendations.push('Review OWASP Top 10 guidelines for authorization and data validation.');
  }

  return {
    executive_summary: summary,
    top_recommendations: recommendations.slice(0, 4),
  };
}
