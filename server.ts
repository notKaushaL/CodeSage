import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { parseUnifiedDiff } from './src/engine/parser';
import { runStaticAnalysis } from './src/engine/rules';
import { packDiffForLLM } from './src/engine/chunker';
import { runGeminiReview } from './src/server/geminiReviewer';
import { deduplicateFindings } from './src/engine/dedup';
import { calculateRiskScore, generateExecutiveSummary } from './src/engine/scorer';
import { ReviewReport, ReviewSummary, PipelineMetrics } from './src/engine/types';
import { SAMPLE_DIFFS } from './src/samples/diffSamples';
import {
  parseGitHubPrUrl,
  fetchPullRequestMetadata,
  fetchPullRequestDiff,
  filterDuplicateComments,
  publishPullRequestReview,
  redactToken,
} from './src/server/githubClient';
import { GitHubPrIdentifier, GitHubPrMetadata } from './src/engine/githubTypes';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const MAX_DIFF_SIZE_BYTES = 2 * 1024 * 1024; // 2MB size guard limit

// Security Headers & CORS Middleware
app.use((_req: Request, res: Response, next: express.NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Middlewares for json and raw text
app.use(express.json({ limit: '4mb' }));
app.use(express.text({ type: ['text/plain', 'text/x-diff', 'text/x-patch', 'application/octet-stream'], limit: '4mb' }));

// Safe JSON error handling middleware
app.use((err: any, _req: Request, res: Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Malformed JSON payload in request body.' });
  }
  next(err);
});

// Health Check Endpoint (supports /api/health, /api/v1/health, and /health)
app.get(['/api/health', '/api/v1/health', '/health'], (_req: Request, res: Response) => {
  const memory = process.memoryUsage();
  res.json({
    status: 'healthy',
    service: 'CodeSage AI — Intelligent Git Diff Reviewer',
    version: '1.0.0',
    model: 'gemini-3.8-flash',
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0),
    maxDiffSizeLimit: `${MAX_DIFF_SIZE_BYTES / (1024 * 1024)}MB`,
    uptimeSeconds: Math.floor(process.uptime()),
    memoryUsage: {
      rssMb: Math.round(memory.rss / (1024 * 1024)),
      heapUsedMb: Math.round(memory.heapUsed / (1024 * 1024)),
      heapTotalMb: Math.round(memory.heapTotal / (1024 * 1024)),
    },
    timestamp: new Date().toISOString(),
  });
});

// Samples Endpoint
app.get('/api/v1/reviews/sample', (_req: Request, res: Response) => {
  res.json({ samples: SAMPLE_DIFFS });
});

app.get('/api/v1/reviews/sample/:id', (req: Request, res: Response) => {
  const sample = SAMPLE_DIFFS.find((s) => s.id === req.params.id);
  if (!sample) {
    return res.status(404).json({ error: `Sample with ID '${req.params.id}' not found.` });
  }
  res.json(sample);
});

/**
 * Reusable core review pipeline executing the 5-stage hybrid analysis
 */
async function executeReviewPipeline(
  diffText: string,
  diffTitle: string,
  overallStart: number,
  githubPr?: import('./src/engine/githubTypes').GitHubPrMetadata
): Promise<ReviewReport> {
  const rawDiffBytes = Buffer.byteLength(diffText, 'utf8');

  // 1. Ingestion & Unidiff Lexer
  const parsedDiff = parseUnifiedDiff(diffText);
  if (parsedDiff.files.length === 0) {
    throw new Error(
      'Could not parse unified diff. Ensure content conforms to standard Git diff format ("diff --git a/... b/..." or "--- a/... +++ b/...").'
    );
  }

  // 2. Static Pre-Filter Analysis (Zero LLM Tokens)
  const staticStart = Date.now();
  const staticFindings = runStaticAnalysis(parsedDiff);
  const staticLatencyMs = Date.now() - staticStart;

  // 3. Smart Chunking & Context Window Packing
  const chunking = packDiffForLLM(parsedDiff);

  // 4. Gemini Structured Reasoning Engine
  const { findings: aiFindings, aiDurationMs } = await runGeminiReview(parsedDiff);

  // 5. Post-Processing: Deduplicate findings & verify line anchors
  const dedupedFindings = deduplicateFindings(staticFindings, aiFindings, parsedDiff);

  // 6. Algorithmic Risk Computation
  const scoring = calculateRiskScore(dedupedFindings);
  const totalLinesAnalyzed = parsedDiff.totalAdded + parsedDiff.totalDeleted;
  const { executive_summary, top_recommendations } = generateExecutiveSummary(
    dedupedFindings,
    parsedDiff.totalFiles,
    totalLinesAnalyzed,
    scoring.score,
    scoring.status
  );

  const summary: ReviewSummary = {
    total_files_analyzed: parsedDiff.totalFiles,
    total_lines_analyzed: totalLinesAnalyzed,
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
    durationMs: Date.now() - overallStart,
    rawDiffBytes,
    packedPromptTokensEstimated: chunking.packedEstimatedTokens,
    rawDiffTokensEstimated: chunking.rawEstimatedTokens,
    tokensSavedPercentage: chunking.savingsPercentage,
    staticFindingsCount: staticFindings.length,
    aiFindingsCount: aiFindings.length,
    dedupedCount: dedupedFindings.length,
    staticLatencyMs,
    aiLatencyMs: aiDurationMs,
  };

  return {
    id: `rev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    created_at: new Date().toISOString(),
    diff_title: diffTitle,
    summary,
    findings: dedupedFindings,
    parsed_diff: parsedDiff,
    metrics,
    github_pr: githubPr,
  };
}

// Analyze Unified Diff Endpoint
app.post('/api/v1/reviews/analyze', async (req: Request, res: Response) => {
  const overallStart = Date.now();

  try {
    let diffText = '';
    let diffTitle = 'Git Diff Review';

    if (typeof req.body === 'string') {
      diffText = req.body;
    } else if (req.body && typeof req.body === 'object') {
      diffText = req.body.diffText || req.body.patch || '';
      if (req.body.title) diffTitle = req.body.title;
    }

    if (!diffText || typeof diffText !== 'string' || diffText.trim().length === 0) {
      return res.status(400).json({
        error: 'Missing or empty diff payload. Provide raw diff text or JSON with "diffText" field.',
      });
    }

    // Size Guard: Enforce <2MB limit
    const rawDiffBytes = Buffer.byteLength(diffText, 'utf8');
    if (rawDiffBytes > MAX_DIFF_SIZE_BYTES) {
      return res.status(413).json({
        error: `Diff payload exceeds maximum limit of 2MB (received ${(rawDiffBytes / 1024 / 1024).toFixed(2)}MB). Split your diff into smaller logical review chunks.`,
      });
    }

    const report = await executeReviewPipeline(diffText, diffTitle, overallStart);
    return res.json(report);
  } catch (err: any) {
    if (err.message && err.message.startsWith('Could not parse unified diff')) {
      return res.status(422).json({ error: err.message });
    }
    console.error('[API /analyze] Unexpected error processing diff:', err);
    return res.status(500).json({
      error: 'Internal server error while processing Git diff review.',
    });
  }
});

// GitHub PR Fetch Metadata Endpoint
app.post('/api/v1/github/pr/fetch', async (req: Request, res: Response) => {
  try {
    const { repoUrlOrInput, pullNumber, githubToken } = req.body || {};

    const identifier = parseGitHubPrUrl(repoUrlOrInput, pullNumber);
    if (!identifier) {
      return res.status(400).json({
        error: 'Invalid GitHub repository or Pull Request identifier. Provide a URL like "https://github.com/owner/repo/pull/123" or shorthand "owner/repo#123".',
      });
    }

    const metadata = await fetchPullRequestMetadata(identifier, githubToken);
    return res.json({ identifier, metadata });
  } catch (err: any) {
    const message = redactToken(err.message || 'Failed to fetch Pull Request');
    const isClientError =
      message.includes('not found') ||
      message.includes('rate limit') ||
      message.includes('authentication failed') ||
      message.includes('forbidden');

    return res.status(isClientError ? 400 : 500).json({ error: message });
  }
});

// GitHub PR Analyze Endpoint
app.post('/api/v1/github/pr/analyze', async (req: Request, res: Response) => {
  const overallStart = Date.now();

  try {
    const { repoUrlOrInput, pullNumber, githubToken } = req.body || {};

    const identifier = parseGitHubPrUrl(repoUrlOrInput, pullNumber);
    if (!identifier) {
      return res.status(400).json({
        error: 'Invalid GitHub repository or Pull Request identifier. Provide a URL like "https://github.com/owner/repo/pull/123" or shorthand "owner/repo#123".',
      });
    }

    // 1. Fetch metadata & diff in parallel from GitHub
    const [metadata, rawDiff] = await Promise.all([
      fetchPullRequestMetadata(identifier, githubToken),
      fetchPullRequestDiff(identifier, githubToken),
    ]);

    if (!rawDiff || rawDiff.trim().length === 0) {
      return res.status(422).json({
        error: `GitHub Pull Request #${identifier.pullNumber} has no text diff changes (e.g., empty PR or binary files only).`,
      });
    }

    // Size Guard: Enforce <2MB limit
    const rawDiffBytes = Buffer.byteLength(rawDiff, 'utf8');
    if (rawDiffBytes > MAX_DIFF_SIZE_BYTES) {
      return res.status(413).json({
        error: `GitHub PR diff exceeds 2MB limit (${(rawDiffBytes / 1024 / 1024).toFixed(2)}MB). Reviewing PRs exceeding 2MB is restricted for safety.`,
      });
    }

    // 2. Execute full existing hybrid pipeline with PR metadata
    const diffTitle = `GitHub PR #${identifier.pullNumber}: ${metadata.title} (${identifier.owner}/${identifier.repo})`;
    const report = await executeReviewPipeline(rawDiff, diffTitle, overallStart, metadata);

    return res.json(report);
  } catch (err: any) {
    const message = redactToken(err.message || 'Failed to analyze Pull Request');
    const isClientError =
      message.includes('not found') ||
      message.includes('rate limit') ||
      message.includes('authentication failed') ||
      message.includes('forbidden') ||
      message.includes('no text diff');

    return res.status(isClientError ? 400 : 500).json({ error: message });
  }
});

// GitHub PR Validate & Publish Review Comments Endpoint
app.post('/api/v1/github/pr/publish', async (req: Request, res: Response) => {
  try {
    const { owner, repo, pullNumber, commitSha, event, reviewBody, comments, githubToken } = req.body || {};

    if (!owner || !repo || !pullNumber || !commitSha) {
      return res.status(400).json({
        error: 'Missing required PR review fields: owner, repo, pullNumber, commitSha.',
      });
    }

    if (!Array.isArray(comments)) {
      return res.status(400).json({
        error: 'Field "comments" must be an array of review comments.',
      });
    }

    const identifier: GitHubPrIdentifier = { owner, repo, pullNumber };

    // 1. Prevent duplicate comments by querying existing comments
    const dedupedComments = await filterDuplicateComments(identifier, comments, githubToken);

    // 2. Publish to GitHub Pull Request Reviews API
    const publishResult = await publishPullRequestReview({
      owner,
      repo,
      pullNumber,
      commitSha,
      event: event || 'COMMENT',
      reviewBody: reviewBody || 'CodeSage AI Pull Request Security & Quality Analysis',
      comments: dedupedComments,
      githubToken,
    });

    return res.json(publishResult);
  } catch (err: any) {
    const message = redactToken(err.message || 'Failed to publish GitHub review');
    return res.status(400).json({ error: message });
  }
});

// Dev server vs production bundle mounting
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CodeSage AI] Server listening at http://0.0.0.0:${PORT}`);
  });
}

startServer();
