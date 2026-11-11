export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type Category = 'SECURITY' | 'BUG' | 'PERFORMANCE' | 'CODE_STYLE';

export type LineType = 'ADDED' | 'DELETED' | 'CONTEXT';

export interface DiffLine {
  type: LineType;
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface DiffHunk {
  header: string;
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  enclosingScope?: string;
  lines: DiffLine[];
}

export interface DiffFile {
  oldPath: string;
  newPath: string;
  isNew: boolean;
  isDeleted: boolean;
  isRename: boolean;
  isBinary?: boolean;
  language: string;
  hunks: DiffHunk[];
  addedLineCount: number;
  deletedLineCount: number;
}

export interface ParsedDiff {
  files: DiffFile[];
  totalFiles: number;
  totalAdded: number;
  totalDeleted: number;
  rawSize: number;
}

export interface Finding {
  id: string;
  file_path: string;
  line_number: number;
  hunk_header?: string;
  category: Category;
  severity: Severity;
  cwe_id?: string;
  owasp_category?: string;
  title: string;
  description: string;
  suggestion_diff?: string;
  confidence: number;
  source: 'STATIC_ANALYZER' | 'GEMINI_ENGINE' | 'HYBRID_CONSENSUS';
  code_snippet?: string;
}

export interface ReviewSummary {
  total_files_analyzed: number;
  total_lines_analyzed: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  info_count: number;
  overall_risk_score: number; // 0 to 100, where 100 = safe, <50 = critical
  risk_status: 'CRITICAL_RISK' | 'HIGH_RISK' | 'MODERATE_RISK' | 'CLEAN_PASS';
  executive_summary: string;
  top_recommendations: string[];
}

export interface PipelineMetrics {
  durationMs: number;
  rawDiffBytes: number;
  packedPromptTokensEstimated: number;
  rawDiffTokensEstimated: number;
  tokensSavedPercentage: number;
  staticFindingsCount: number;
  aiFindingsCount: number;
  dedupedCount: number;
  staticLatencyMs: number;
  aiLatencyMs: number;
}

export interface ReviewReport {
  id: string;
  created_at: string;
  diff_title?: string;
  summary: ReviewSummary;
  findings: Finding[];
  parsed_diff?: ParsedDiff;
  metrics: PipelineMetrics;
  github_pr?: import('./githubTypes').GitHubPrMetadata;
}
