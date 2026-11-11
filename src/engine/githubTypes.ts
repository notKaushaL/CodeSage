/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GitHubPrIdentifier {
  owner: string;
  repo: string;
  pullNumber: number;
}

export interface GitHubPrAuthor {
  login: string;
  avatarUrl: string;
  htmlUrl: string;
}

export interface GitHubPrMetadata {
  owner: string;
  repo: string;
  pullNumber: number;
  title: string;
  body: string | null;
  author: GitHubPrAuthor;
  htmlUrl: string;
  diffUrl: string;
  state: 'open' | 'closed';
  isDraft: boolean;
  merged: boolean;
  head: {
    ref: string;
    sha: string;
    repoFullName: string;
  };
  base: {
    ref: string;
    sha: string;
  };
  changedFilesCount: number;
  additions: number;
  deletions: number;
}

export interface GitHubPrFile {
  sha: string;
  filename: string;
  status: 'added' | 'removed' | 'modified' | 'renamed';
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  rawUrl?: string;
}

export interface GitHubPublishComment {
  findingId: string;
  path: string;
  line: number;
  side: 'RIGHT' | 'LEFT';
  body: string;
  selected: boolean;
  isAttachable: boolean;
  nonAttachableReason?: string;
}

export interface GitHubPublishRequest {
  owner: string;
  repo: string;
  pullNumber: number;
  commitSha: string;
  event: 'COMMENT' | 'REQUEST_CHANGES';
  reviewBody: string;
  comments: GitHubPublishComment[];
  githubToken?: string;
}

export interface GitHubPublishResult {
  reviewId: number;
  reviewUrl: string;
  publishedCommentsCount: number;
  failedCommentsCount: number;
  comments: Array<{
    findingId: string;
    status: 'published' | 'skipped' | 'failed';
    url?: string;
    error?: string;
  }>;
  summary: string;
}
