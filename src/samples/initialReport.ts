import { parseUnifiedDiff } from '../engine/parser';
import { runStaticAnalysis } from '../engine/rules';
import { packDiffForLLM } from '../engine/chunker';
import { deduplicateFindings } from '../engine/dedup';
import { calculateRiskScore, generateExecutiveSummary } from '../engine/scorer';
import { ReviewReport, ReviewSummary, PipelineMetrics } from '../engine/types';
import { SAMPLE_DIFFS } from './diffSamples';

export function createLocalReviewReport(rawDiff: string, title: string): ReviewReport {
  const start = Date.now();
  const rawBytes = new TextEncoder().encode(rawDiff).length;
  const parsed = parseUnifiedDiff(rawDiff);
  const staticFindings = runStaticAnalysis(parsed);
  const chunking = packDiffForLLM(parsed);
  const deduped = deduplicateFindings(staticFindings, [], parsed);
  const scoring = calculateRiskScore(deduped);
  const totalLines = parsed.totalAdded + parsed.totalDeleted;
  const { executive_summary, top_recommendations } = generateExecutiveSummary(
    deduped,
    parsed.totalFiles,
    totalLines,
    scoring.score,
    scoring.status
  );

  const summary: ReviewSummary = {
    total_files_analyzed: parsed.totalFiles,
    total_lines_analyzed: totalLines,
    critical_count: scoring.criticalCount,
    high_count: scoring.highCount,
    medium_count: scoring.mediumCount,
    low_count: scoring.lowCount,
    info_count: scoring.infoCount,
    overall_risk_score: scoring.score,
    risk_status: scoring.status,
    executive_summary,
    top_recommendations,
  };

  const metrics: PipelineMetrics = {
    durationMs: Date.now() - start,
    rawDiffBytes: rawBytes,
    packedPromptTokensEstimated: chunking.packedEstimatedTokens,
    rawDiffTokensEstimated: chunking.rawEstimatedTokens,
    tokensSavedPercentage: chunking.savingsPercentage,
    staticFindingsCount: staticFindings.length,
    aiFindingsCount: 0,
    dedupedCount: deduped.length,
    staticLatencyMs: 3,
    aiLatencyMs: 0,
  };

  return {
    id: `seed-${Date.now().toString(36)}`,
    created_at: new Date().toISOString(),
    diff_title: title,
    summary,
    findings: deduped,
    parsed_diff: parsed,
    metrics,
  };
}

export const INITIAL_SEED_REPORT: ReviewReport = createLocalReviewReport(
  SAMPLE_DIFFS[0].rawDiff,
  SAMPLE_DIFFS[0].title
);
