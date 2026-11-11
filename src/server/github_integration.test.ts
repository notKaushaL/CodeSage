import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseGitHubPrUrl,
  redactToken,
  validateCommentPositions,
  fetchPullRequestMetadata,
  fetchPullRequestDiff,
  filterDuplicateComments,
  publishPullRequestReview,
} from './githubClient';
import { ParsedDiff } from '../engine/types';
import { GitHubPublishComment, GitHubPublishRequest } from '../engine/githubTypes';

test('GITHUB 1: URL and PR identifier validation handles standard and edge-case formats', () => {
  // Full HTTPS URLs
  assert.deepEqual(parseGitHubPrUrl('https://github.com/facebook/react/pull/12345'), {
    owner: 'facebook',
    repo: 'react',
    pullNumber: 12345,
  });

  assert.deepEqual(parseGitHubPrUrl('https://github.com/torvalds/linux/pull/1'), {
    owner: 'torvalds',
    repo: 'linux',
    pullNumber: 1,
  });

  // URL with trailing /files or query params
  assert.deepEqual(parseGitHubPrUrl('https://github.com/vercel/next.js/pull/999/files'), {
    owner: 'vercel',
    repo: 'next.js',
    pullNumber: 999,
  });

  // Shorthand notation
  assert.deepEqual(parseGitHubPrUrl('golang/go#45678'), {
    owner: 'golang',
    repo: 'go',
    pullNumber: 45678,
  });

  // owner/repo with explicit pull number
  assert.deepEqual(parseGitHubPrUrl('google/genai-toolbox', 42), {
    owner: 'google',
    repo: 'genai-toolbox',
    pullNumber: 42,
  });

  // Invalid formats reject safely
  assert.equal(parseGitHubPrUrl('not a github url'), null);
  assert.equal(parseGitHubPrUrl('https://gitlab.com/owner/repo/pull/12'), null);
  assert.equal(parseGitHubPrUrl('https://github.com/owner/repo/pull/notanumber'), null);
  assert.equal(parseGitHubPrUrl('https://github.com/../evil/pull/1'), null); // path traversal
  assert.equal(parseGitHubPrUrl(''), null);
});

test('GITHUB 2: Secret and token redaction sanitizes tokens from error messages and logs', () => {
  const sampleError =
    'Error connecting with token ghp_1234567890abcdefghijklmnopqrstuvwxyz and bearer Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
  const redacted = redactToken(sampleError);

  assert.ok(!redacted.includes('ghp_1234567890abcdefghijklmnopqrstuvwxyz'));
  assert.ok(!redacted.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'));
  assert.ok(redacted.includes('[REDACTED_GH_TOKEN]'));
  assert.ok(redacted.includes('Bearer [REDACTED_TOKEN]'));
});

test('GITHUB 3: Parses GitHub Pull Request metadata response correctly', async () => {
  const mockFetch: typeof fetch = async (url) => {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        title: 'Add JWT authorization middleware',
        body: 'Implements secure token verification and role checking.',
        user: {
          login: 'octocat',
          avatar_url: 'https://avatars.githubusercontent.com/u/583231',
          html_url: 'https://github.com/octocat',
        },
        html_url: 'https://github.com/octocat/Hello-World/pull/1347',
        state: 'open',
        draft: false,
        merged: false,
        head: {
          ref: 'new-topic',
          sha: '6dcb09b5b57875f334f61aebed695e2e4193db5e',
          repo: { full_name: 'octocat/Hello-World' },
        },
        base: {
          ref: 'master',
          sha: '6dcb09b5b57875f334f61aebed695e2e4193db5e',
        },
        changed_files: 3,
        additions: 120,
        deletions: 15,
      }),
    } as any;
  };

  const meta = await fetchPullRequestMetadata(
    { owner: 'octocat', repo: 'Hello-World', pullNumber: 1347 },
    undefined,
    mockFetch
  );

  assert.equal(meta.owner, 'octocat');
  assert.equal(meta.repo, 'Hello-World');
  assert.equal(meta.pullNumber, 1347);
  assert.equal(meta.title, 'Add JWT authorization middleware');
  assert.equal(meta.author.login, 'octocat');
  assert.equal(meta.changedFilesCount, 3);
  assert.equal(meta.additions, 120);
  assert.equal(meta.deletions, 15);
  assert.equal(meta.head.ref, 'new-topic');
  assert.equal(meta.head.sha, '6dcb09b5b57875f334f61aebed695e2e4193db5e');
});

test('GITHUB 4: Handles 404 private repo or missing PR with actionable guidance', async () => {
  const mockFetch: typeof fetch = async () => {
    return {
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: new Headers(),
      json: async () => ({ message: 'Not Found' }),
    } as any;
  };

  await assert.rejects(
    async () => {
      await fetchPullRequestMetadata(
        { owner: 'private-org', repo: 'secret-service', pullNumber: 99 },
        undefined,
        mockFetch
      );
    },
    /GitHub Pull Request 'private-org\/secret-service#99' was not found/
  );
});

test('GITHUB 5: Handles rate limit response (403/429) with reset timestamp', async () => {
  const resetEpoch = Math.floor(Date.now() / 1000) + 3600;
  const mockFetch: typeof fetch = async () => {
    const headers = new Headers({
      'x-ratelimit-remaining': '0',
      'x-ratelimit-reset': resetEpoch.toString(),
    });
    return {
      ok: false,
      status: 403,
      headers,
      json: async () => ({ message: 'API rate limit exceeded' }),
    } as any;
  };

  await assert.rejects(
    async () => {
      await fetchPullRequestDiff(
        { owner: 'facebook', repo: 'react', pullNumber: 100 },
        undefined,
        mockFetch
      );
    },
    /GitHub API rate limit exceeded/
  );
});

test('GITHUB 6: Line-position mapping validates attachable lines and flags invalid/unmodified lines', () => {
  const parsedDiff: ParsedDiff = {
    totalFiles: 1,
    totalAdded: 2,
    totalDeleted: 1,
    rawSize: 300,
    files: [
      {
        oldPath: 'src/auth.ts',
        newPath: 'src/auth.ts',
        isNew: false,
        isDeleted: false,
        isRename: false,
        language: 'TypeScript',
        addedLineCount: 2,
        deletedLineCount: 1,
        hunks: [
          {
            header: '@@ -10,3 +10,4 @@',
            oldStart: 10,
            oldLines: 3,
            newStart: 10,
            newLines: 4,
            lines: [
              { type: 'CONTEXT', content: 'import express from "express";', oldLineNumber: 10, newLineNumber: 10 },
              { type: 'DELETED', content: 'const oldKey = "123";', oldLineNumber: 11 },
              { type: 'ADDED', content: 'const awsKey = "AKIAIOSFODNN7EXAMPLE";', newLineNumber: 11 },
              { type: 'ADDED', content: 'const nextKey = "test";', newLineNumber: 12 },
              { type: 'CONTEXT', content: 'export default app;', oldLineNumber: 12, newLineNumber: 13 },
            ],
          },
        ],
      },
    ],
  };

  const comments: GitHubPublishComment[] = [
    {
      findingId: 'f-1',
      path: 'src/auth.ts',
      line: 11, // Valid ADDED line
      side: 'RIGHT',
      body: 'AWS Key detected',
      selected: true,
      isAttachable: false,
    },
    {
      findingId: 'f-2',
      path: 'src/auth.ts',
      line: 99, // Non-existent line outside diff hunks
      side: 'RIGHT',
      body: 'Out of bounds finding',
      selected: true,
      isAttachable: false,
    },
    {
      findingId: 'f-3',
      path: 'src/nonExistent.ts', // Non-existent file
      line: 5,
      side: 'RIGHT',
      body: 'Wrong file',
      selected: true,
      isAttachable: false,
    },
  ];

  const validated = validateCommentPositions(comments, parsedDiff);

  assert.equal(validated[0].isAttachable, true);
  assert.equal(validated[0].nonAttachableReason, undefined);

  assert.equal(validated[1].isAttachable, false);
  assert.ok(validated[1].nonAttachableReason?.includes('not an active diff line'));

  assert.equal(validated[2].isAttachable, false);
  assert.ok(validated[2].nonAttachableReason?.includes('not present in the PR diff files'));
});

test('GITHUB 7: Duplicate comment prevention flags already-posted review comments', async () => {
  const mockFetch: typeof fetch = async () => {
    return {
      ok: true,
      json: async () => [
        {
          path: 'src/auth.ts',
          line: 11,
          body: 'CodeSage AI Finding: Hardcoded AWS Access Key ID Detected [f-1]',
        },
      ],
    } as any;
  };

  const comments: GitHubPublishComment[] = [
    {
      findingId: 'f-1', // Matches existing comment body
      path: 'src/auth.ts',
      line: 11,
      side: 'RIGHT',
      body: 'Hardcoded AWS Access Key ID Detected',
      selected: true,
      isAttachable: true,
    },
    {
      findingId: 'f-new', // Brand new finding
      path: 'src/auth.ts',
      line: 12,
      side: 'RIGHT',
      body: 'New SQL finding',
      selected: true,
      isAttachable: true,
    },
  ];

  const deduped = await filterDuplicateComments(
    { owner: 'octocat', repo: 'Hello-World', pullNumber: 1 },
    comments,
    'mock-token',
    mockFetch
  );

  // f-1 is detected as duplicate and deselected
  assert.equal(deduped[0].selected, false);
  assert.equal(deduped[0].isAttachable, false);
  assert.ok(deduped[0].nonAttachableReason?.includes('Duplicate'));

  // f-new remains selected and attachable
  assert.equal(deduped[1].selected, true);
  assert.equal(deduped[1].isAttachable, true);
});

test('GITHUB 8: Publishes review comments via official GitHub Reviews API with summary', async () => {
  let requestSent: any = null;

  const mockFetch: typeof fetch = async (_url, options) => {
    requestSent = JSON.parse(options?.body as string);
    return {
      ok: true,
      status: 200,
      json: async () => ({
        id: 987654,
        html_url: 'https://github.com/octocat/Hello-World/pull/1#pullrequestreview-987654',
      }),
    } as any;
  };

  const publishReq: GitHubPublishRequest = {
    owner: 'octocat',
    repo: 'Hello-World',
    pullNumber: 1,
    commitSha: '6dcb09b5b57875f334f61aebed695e2e4193db5e',
    event: 'COMMENT',
    reviewBody: 'CodeSage AI automated security audit',
    githubToken: 'ghp_mocktoken12345678901234567890',
    comments: [
      {
        findingId: 'f-1',
        path: 'src/auth.ts',
        line: 15,
        side: 'RIGHT',
        body: 'CWE-89: SQL Injection detected in dynamic query.',
        selected: true,
        isAttachable: true,
      },
      {
        findingId: 'f-2',
        path: 'src/config.ts',
        line: 99,
        side: 'RIGHT',
        body: 'Global config note',
        selected: true,
        isAttachable: false, // Unattachable -> will be appended to review summary
        nonAttachableReason: 'Line outside diff hunk',
      },
    ],
  };

  const result = await publishPullRequestReview(publishReq, mockFetch);

  assert.equal(result.reviewId, 987654);
  assert.equal(result.publishedCommentsCount, 1);
  assert.ok(result.summary.includes('Successfully published review with 1 inline comment(s)'));

  // Verify outgoing payload
  assert.equal(requestSent.commit_id, '6dcb09b5b57875f334f61aebed695e2e4193db5e');
  assert.equal(requestSent.event, 'COMMENT');
  assert.equal(requestSent.comments.length, 1);
  assert.equal(requestSent.comments[0].path, 'src/auth.ts');
  assert.equal(requestSent.comments[0].line, 15);
  // Verify unattached finding was appended to executive review body
  assert.ok(requestSent.body.includes('Additional Diff Findings (Non-inline)'));
  assert.ok(requestSent.body.includes('src/config.ts:99'));
});
