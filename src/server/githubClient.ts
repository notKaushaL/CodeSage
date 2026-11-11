/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  GitHubPrIdentifier,
  GitHubPrMetadata,
  GitHubPublishComment,
  GitHubPublishRequest,
  GitHubPublishResult,
} from '../engine/githubTypes';
import { ParsedDiff } from '../engine/types';

const GITHUB_API_BASE = 'https://api.github.com';
const USER_AGENT = 'CodeSage-AI-Diff-Reviewer/1.0.0';

/**
 * Redacts tokens and secret authorization headers from strings and error logs.
 */
export function redactToken(input: string): string {
  if (!input) return '';
  return input
    .replace(/(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}/g, '[REDACTED_GH_TOKEN]')
    .replace(/github_pat_[A-Za-z0-9_]{40,}/g, '[REDACTED_GH_PAT]')
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/g, 'Bearer [REDACTED_TOKEN]')
    .replace(/ey[A-Za-z0-9_=-]{16,}(?:\.[A-Za-z0-9_=-]{10,})*/g, '[REDACTED_TOKEN]');
}

/**
 * Resolves token from explicit user parameter or server environment variable.
 */
export function resolveGitHubToken(userSuppliedToken?: string): string | undefined {
  if (userSuppliedToken && typeof userSuppliedToken === 'string' && userSuppliedToken.trim().length > 0) {
    return userSuppliedToken.trim();
  }
  if (process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN.trim().length > 0) {
    return process.env.GITHUB_TOKEN.trim();
  }
  return undefined;
}

/**
 * Parses and validates GitHub repository and Pull Request identifiers from URLs or shorthand strings.
 * Examples:
 * - https://github.com/facebook/react/pull/12345
 * - github.com/owner/repo/pull/42
 * - owner/repo#42
 * - owner/repo (when pullNumber is supplied separately)
 */
export function parseGitHubPrUrl(
  input: string,
  explicitPullNumber?: number | string
): GitHubPrIdentifier | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();

  // Pattern 1: Full or partial GitHub URL (e.g. https://github.com/owner/repo/pull/123)
  const urlMatch = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)\/pull\/(\d+)/i
  );
  if (urlMatch) {
    const owner = urlMatch[1];
    const repo = urlMatch[2].replace(/\.git$/i, '');
    const pullNumber = parseInt(urlMatch[3], 10);
    if (isValidOwnerRepo(owner, repo) && pullNumber > 0 && pullNumber <= 10000000) {
      return { owner, repo, pullNumber };
    }
    return null;
  }

  // Pattern 2: Shorthand owner/repo#123 or owner/repo/pull/123
  const shorthandMatch = trimmed.match(
    /^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)(?:#|\/pull\/)(\d+)$/i
  );
  if (shorthandMatch) {
    const owner = shorthandMatch[1];
    const repo = shorthandMatch[2].replace(/\.git$/i, '');
    const pullNumber = parseInt(shorthandMatch[3], 10);
    if (isValidOwnerRepo(owner, repo) && pullNumber > 0 && pullNumber <= 10000000) {
      return { owner, repo, pullNumber };
    }
    return null;
  }

  // Pattern 3: owner/repo with explicit pullNumber argument
  if (explicitPullNumber !== undefined) {
    const pNum = typeof explicitPullNumber === 'number' ? explicitPullNumber : parseInt(explicitPullNumber, 10);
    const repoMatch = trimmed.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
    if (repoMatch && Number.isInteger(pNum) && pNum > 0 && pNum <= 10000000) {
      const owner = repoMatch[1];
      const repo = repoMatch[2].replace(/\.git$/i, '');
      if (isValidOwnerRepo(owner, repo)) {
        return { owner, repo, pullNumber: pNum };
      }
    }
  }

  return null;
}

function isValidOwnerRepo(owner: string, repo: string): boolean {
  // Disallow path traversal, empty segments, or reserved names
  if (!owner || !repo) return false;
  if (owner === '.' || owner === '..' || repo === '.' || repo === '..') return false;
  const validIdent = /^[a-zA-Z0-9_.-]{1,100}$/;
  return validIdent.test(owner) && validIdent.test(repo);
}

/**
 * Builds standard GitHub API headers with optional authorization and token redaction.
 */
function buildGitHubHeaders(accept: string, token?: string): HeadersInit {
  const headers: Record<string, string> = {
    Accept: accept,
    'User-Agent': USER_AGENT,
    'X-GitHub-Api-Version': '2022-11-28',
  };

  const resolved = resolveGitHubToken(token);
  if (resolved) {
    headers.Authorization = `Bearer ${resolved}`;
  }

  return headers;
}

/**
 * Fetches Pull Request metadata from the GitHub REST API.
 */
export async function fetchPullRequestMetadata(
  identifier: GitHubPrIdentifier,
  token?: string,
  customFetch: typeof fetch = fetch
): Promise<GitHubPrMetadata> {
  const { owner, repo, pullNumber } = identifier;
  const url = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${pullNumber}`;

  const response = await customFetch(url, {
    headers: buildGitHubHeaders('application/vnd.github.v3+json', token),
  });

  if (!response.ok) {
    await handleGitHubApiErrors(response, owner, repo, pullNumber);
  }

  const data = await response.json();

  return {
    owner,
    repo,
    pullNumber,
    title: data.title || `PR #${pullNumber}`,
    body: data.body || null,
    author: {
      login: data.user?.login || 'unknown',
      avatarUrl: data.user?.avatar_url || '',
      htmlUrl: data.user?.html_url || '',
    },
    htmlUrl: data.html_url || `https://github.com/${owner}/${repo}/pull/${pullNumber}`,
    diffUrl: data.diff_url || `${url}.diff`,
    state: data.state === 'closed' ? 'closed' : 'open',
    isDraft: Boolean(data.draft),
    merged: Boolean(data.merged),
    head: {
      ref: data.head?.ref || 'head',
      sha: data.head?.sha || '',
      repoFullName: data.head?.repo?.full_name || `${owner}/${repo}`,
    },
    base: {
      ref: data.base?.ref || 'base',
      sha: data.base?.sha || '',
    },
    changedFilesCount: data.changed_files || 0,
    additions: data.additions || 0,
    deletions: data.deletions || 0,
  };
}

/**
 * Fetches the raw unified diff for a Pull Request from GitHub.
 */
export async function fetchPullRequestDiff(
  identifier: GitHubPrIdentifier,
  token?: string,
  customFetch: typeof fetch = fetch
): Promise<string> {
  const { owner, repo, pullNumber } = identifier;
  const url = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${pullNumber}`;

  const response = await customFetch(url, {
    headers: buildGitHubHeaders('application/vnd.github.v3.diff', token),
  });

  if (!response.ok) {
    await handleGitHubApiErrors(response, owner, repo, pullNumber);
  }

  const diffText = await response.text();
  return diffText;
}

/**
 * Formats structured review error messages according to HTTP status and rate limit headers.
 */
async function handleGitHubApiErrors(
  response: Response,
  owner: string,
  repo: string,
  pullNumber: number
): Promise<never> {
  const status = response.status;
  const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
  const rateLimitReset = response.headers.get('x-ratelimit-reset');

  if (status === 403 || status === 429) {
    if (rateLimitRemaining === '0') {
      const resetDate = rateLimitReset
        ? new Date(parseInt(rateLimitReset, 10) * 1000).toLocaleTimeString()
        : 'shortly';
      throw new Error(
        `GitHub API rate limit exceeded (resets at ${resetDate}). Configure a GitHub Personal Access Token in CodeSage to unlock 5,000 requests/hour.`
      );
    }
    throw new Error(
      `Access to GitHub repository '${owner}/${repo}' was forbidden (HTTP 403). Ensure token has 'repo' scope or appropriate pull request read permissions.`
    );
  }

  if (status === 401) {
    throw new Error('GitHub authentication failed (HTTP 401). The provided GitHub token is invalid or expired.');
  }

  if (status === 404) {
    throw new Error(
      `GitHub Pull Request '${owner}/${repo}#${pullNumber}' was not found (HTTP 404). If this repository is private, provide a GitHub Personal Access Token with repository read access.`
    );
  }

  let errorDetail = '';
  try {
    const errorJson = await response.json();
    errorDetail = errorJson.message || '';
  } catch {
    // Non-JSON error body
  }

  throw new Error(
    `GitHub API error (${status}): ${errorDetail || response.statusText || 'Failed to fetch Pull Request'}`
  );
}

/**
 * Validates which findings correspond to valid changed lines in the PR diff
 * and can be attached as inline GitHub review comments on the modified (RIGHT) side.
 */
export function validateCommentPositions(
  comments: GitHubPublishComment[],
  parsedDiff: ParsedDiff
): GitHubPublishComment[] {
  return comments.map((comment) => {
    // Locate the matching file in parsed diff
    const file = parsedDiff.files.find(
      (f) => f.newPath === comment.path || f.oldPath === comment.path
    );

    if (!file) {
      return {
        ...comment,
        isAttachable: false,
        nonAttachableReason: `File '${comment.path}' is not present in the PR diff files.`,
      };
    }

    if (file.isBinary) {
      return {
        ...comment,
        isAttachable: false,
        nonAttachableReason: `File '${comment.path}' is a binary file; GitHub does not support inline comments on binary diffs.`,
      };
    }

    // Check if the targeted line exists in any hunk as an ADDED or CONTEXT line on the new side
    let hasMatchingLine = false;
    for (const hunk of file.hunks) {
      for (const line of hunk.lines) {
        if (line.newLineNumber === comment.line && (line.type === 'ADDED' || line.type === 'CONTEXT')) {
          hasMatchingLine = true;
          break;
        }
      }
      if (hasMatchingLine) break;
    }

    if (!hasMatchingLine) {
      return {
        ...comment,
        isAttachable: false,
        nonAttachableReason: `Line ${comment.line} in '${comment.path}' is not an active diff line in this PR. It will be reported in the summary review overview.`,
      };
    }

    return {
      ...comment,
      isAttachable: true,
      nonAttachableReason: undefined,
    };
  });
}

/**
 * Checks for existing review comments on the PR to prevent submitting duplicate comments.
 */
export async function filterDuplicateComments(
  identifier: GitHubPrIdentifier,
  comments: GitHubPublishComment[],
  token?: string,
  customFetch: typeof fetch = fetch
): Promise<GitHubPublishComment[]> {
  const { owner, repo, pullNumber } = identifier;
  const url = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${pullNumber}/comments?per_page=100`;

  try {
    const res = await customFetch(url, {
      headers: buildGitHubHeaders('application/vnd.github.v3+json', token),
    });

    if (!res.ok) {
      // If fetching comments fails, proceed with the original comments without failing the review
      return comments;
    }

    const existingComments: Array<{ path: string; line?: number; original_line?: number; body: string }> = await res.json();

    return comments.map((comment) => {
      // Check if an existing comment matches path, line, and has CodeSage signature
      const isDuplicate = existingComments.some((ec) => {
        const samePath = ec.path === comment.path;
        const sameLine = ec.line === comment.line || ec.original_line === comment.line;
        // Check for common title keyword or finding ID
        const sameContent = ec.body && (
          ec.body.includes(comment.findingId) ||
          ec.body.includes(comment.body.slice(0, 40))
        );
        return samePath && sameLine && sameContent;
      });

      if (isDuplicate) {
        return {
          ...comment,
          selected: false,
          isAttachable: false,
          nonAttachableReason: 'Duplicate: This finding has already been posted to the PR.',
        };
      }

      return comment;
    });
  } catch {
    return comments;
  }
}

/**
 * Submits a batch Pull Request review with inline comments and an executive summary
 * using the official GitHub Pull Request Reviews API.
 */
export async function publishPullRequestReview(
  req: GitHubPublishRequest,
  customFetch: typeof fetch = fetch
): Promise<GitHubPublishResult> {
  const { owner, repo, pullNumber, commitSha, event, reviewBody, comments, githubToken } = req;
  const resolvedToken = resolveGitHubToken(githubToken);

  if (!resolvedToken) {
    throw new Error(
      'GitHub Personal Access Token is required to publish review comments. Provide a token with repo or pull_requests:write permission.'
    );
  }

  // Filter only selected and attachable inline comments
  const activeComments = comments.filter((c) => c.selected && c.isAttachable);

  // Group unattached findings to append to the review overview body
  const unattached = comments.filter((c) => c.selected && !c.isAttachable);
  let finalReviewBody = reviewBody;

  if (unattached.length > 0) {
    finalReviewBody += '\n\n---\n### Additional Diff Findings (Non-inline)\n';
    unattached.forEach((u) => {
      finalReviewBody += `\n- **${u.path}:${u.line}**: ${u.body.split('\n')[0]} (${u.nonAttachableReason || 'File-level note'})`;
    });
  }

  finalReviewBody += '\n\n_Review generated automatically by [CodeSage AI](https://github.com/google/ai-studio)._';

  const payload: Record<string, any> = {
    commit_id: commitSha,
    body: finalReviewBody,
    event: event || 'COMMENT',
  };

  if (activeComments.length > 0) {
    payload.comments = activeComments.map((c) => ({
      path: c.path,
      line: c.line,
      side: c.side || 'RIGHT',
      body: c.body,
    }));
  }

  const url = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${pullNumber}/reviews`;

  const response = await customFetch(url, {
    method: 'POST',
    headers: {
      ...buildGitHubHeaders('application/vnd.github.v3+json', resolvedToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorMsg = `HTTP ${response.status}: Failed to submit review`;
    try {
      const errJson = await response.json();
      errorMsg = redactToken(errJson.message || errorMsg);
    } catch {
      // Ignored
    }
    throw new Error(errorMsg);
  }

  const reviewData = await response.json();

  const commentResults = comments.map((c) => {
    if (!c.selected) {
      return { findingId: c.findingId, status: 'skipped' as const };
    }
    if (!c.isAttachable) {
      return {
        findingId: c.findingId,
        status: 'published' as const,
        error: 'Included in main review summary (not attached to specific line)',
      };
    }
    return {
      findingId: c.findingId,
      status: 'published' as const,
      url: reviewData.html_url,
    };
  });

  return {
    reviewId: reviewData.id,
    reviewUrl: reviewData.html_url || `https://github.com/${owner}/${repo}/pull/${pullNumber}`,
    publishedCommentsCount: activeComments.length,
    failedCommentsCount: 0,
    comments: commentResults,
    summary: `Successfully published review with ${activeComments.length} inline comment(s) and full executive summary to GitHub PR #${pullNumber}.`,
  };
}
