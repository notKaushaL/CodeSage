import { Finding, ParsedDiff } from './types';

/**
 * Deduplicates overlapping static analyzer findings and Gemini AI findings.
 * If both engines identify an issue at the same file and proximate line number (+/- 2 lines),
 * merge them into a high-confidence HYBRID_CONSENSUS finding.
 */
export function deduplicateFindings(
  staticFindings: Finding[],
  aiFindings: Finding[],
  parsedDiff: ParsedDiff
): Finding[] {
  const merged: Finding[] = [];
  const matchedAiIndices = new Set<number>();

  // Helper to check if line number exists in parsed hunks for this file
  const isValidLine = (filePath: string, lineNum: number): boolean => {
    if (!filePath || !lineNum || lineNum < 1) return false;
    const file = parsedDiff.files.find(
      (f) => f.newPath === filePath || f.oldPath === filePath
    );
    if (!file) return false;
    for (const hunk of file.hunks) {
      if (lineNum >= hunk.newStart && lineNum <= hunk.newStart + hunk.newLines) {
        return true;
      }
    }
    return false;
  };

  for (const sf of staticFindings) {
    let consensusFound = false;

    for (let j = 0; j < aiFindings.length; j++) {
      if (matchedAiIndices.has(j)) continue;
      const af = aiFindings[j];

      // Validate AI line before considering for consensus
      if (!isValidLine(af.file_path, af.line_number)) continue;

      const sameFile =
        sf.file_path === af.file_path ||
        sf.file_path.endsWith(af.file_path) ||
        af.file_path.endsWith(sf.file_path);
      const closeLine = Math.abs(sf.line_number - af.line_number) <= 2;
      const sameCategory = sf.category === af.category || sf.cwe_id === af.cwe_id;

      if (sameFile && closeLine && sameCategory) {
        matchedAiIndices.add(j);
        consensusFound = true;

        merged.push({
          id: `consensus-${sf.id}-${af.id}`,
          file_path: sf.file_path,
          line_number: sf.line_number, // Trust the exact lexer mapped line
          hunk_header: sf.hunk_header || af.hunk_header,
          category: sf.category,
          severity: sf.severity === 'CRITICAL' || af.severity === 'CRITICAL' ? 'CRITICAL' : sf.severity,
          cwe_id: sf.cwe_id || af.cwe_id,
          owasp_category: sf.owasp_category || af.owasp_category,
          title: af.title.length > sf.title.length ? af.title : sf.title,
          description: `${sf.description} (Confirmed by Gemini AI Reasoning: ${af.description})`,
          suggestion_diff: af.suggestion_diff || sf.suggestion_diff,
          confidence: Math.min(1.0, Math.max(sf.confidence, af.confidence) + 0.05),
          source: 'HYBRID_CONSENSUS',
          code_snippet: sf.code_snippet || af.code_snippet,
        });
        break;
      }
    }

    if (!consensusFound) {
      merged.push(sf);
    }
  }

  // Add remaining unmatched AI findings (strictly rejecting invalid line or file references)
  for (let j = 0; j < aiFindings.length; j++) {
    if (matchedAiIndices.has(j)) continue;
    const af = aiFindings[j];

    // Reject hallucinated files or invalid line references
    if (!isValidLine(af.file_path, af.line_number)) {
      continue;
    }

    merged.push({
      ...af,
      source: 'GEMINI_ENGINE',
    });
  }

  // Sort by severity (CRITICAL first) then line number
  const severityRank: Record<string, number> = {
    CRITICAL: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
    INFO: 4,
  };

  merged.sort((a, b) => {
    const sDiff = severityRank[a.severity] - severityRank[b.severity];
    if (sDiff !== 0) return sDiff;
    if (a.file_path !== b.file_path) return a.file_path.localeCompare(b.file_path);
    return a.line_number - b.line_number;
  });

  return merged;
}
