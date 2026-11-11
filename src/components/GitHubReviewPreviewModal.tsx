import React, { useState } from 'react';
import { 
  GitPullRequest, 
  X, 
  Send, 
  ShieldAlert, 
  CheckSquare, 
  Square, 
  Edit3, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle, 
  AlertOctagon, 
  Info, 
  Layers, 
  Key, 
  Eye, 
  EyeOff, 
  ShieldCheck,
  FileCode,
  CornerDownRight
} from 'lucide-react';
import { ReviewReport, Finding } from '../engine/types';
import { GitHubPublishComment, GitHubPublishResult } from '../engine/githubTypes';
import { validateCommentPositions } from '../server/githubClient';

interface GitHubReviewPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: ReviewReport;
}

export const GitHubReviewPreviewModal: React.FC<GitHubReviewPreviewModalProps> = ({
  isOpen,
  onClose,
  report,
}) => {
  const pr = report.github_pr;
  if (!isOpen || !pr) return null;

  // Initialize editable comments from findings
  const initialComments: GitHubPublishComment[] = report.findings.map((f) => {
    let commentBody = `### [${f.severity}] ${f.title}\n\n${f.description}`;
    if (f.cwe_id) {
      commentBody += `\n\n**CWE**: [${f.cwe_id}](https://cwe.mitre.org/data/definitions/${f.cwe_id.replace('CWE-', '')}.html)`;
    }
    if (f.suggestion_diff) {
      commentBody += `\n\n\`\`\`suggestion\n${f.suggestion_diff
        .split('\n')
        .filter((l) => l.startsWith('+'))
        .map((l) => l.substring(1))
        .join('\n')}\n\`\`\``;
    }

    return {
      findingId: f.id,
      path: f.file_path,
      line: f.line_number,
      side: 'RIGHT' as const,
      body: commentBody,
      selected: f.severity === 'CRITICAL' || f.severity === 'HIGH' || f.severity === 'MEDIUM',
      isAttachable: true,
    };
  });

  // Validate line positions against parsed diff
  const validatedInitialComments = report.parsed_diff
    ? validateCommentPositions(initialComments, report.parsed_diff)
    : initialComments;

  const [comments, setComments] = useState<GitHubPublishComment[]>(validatedInitialComments);
  const [reviewEvent, setReviewEvent] = useState<'COMMENT' | 'REQUEST_CHANGES'>(
    report.summary.critical_count > 0 || report.summary.high_count > 0 ? 'REQUEST_CHANGES' : 'COMMENT'
  );
  const [reviewBody, setReviewBody] = useState<string>(
    `## CodeSage AI Automated Security & Quality Review\n\n**Overall Risk Score:** ${report.summary.overall_risk_score}/100 (${report.summary.risk_status})\n\n${report.summary.executive_summary}\n\n### Top Recommendations:\n${report.summary.top_recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}`
  );
  const [githubToken, setGithubToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<GitHubPublishResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editingFindingId, setEditingFindingId] = useState<string | null>(null);

  const toggleCommentSelection = (findingId: string) => {
    setComments((prev) =>
      prev.map((c) => (c.findingId === findingId ? { ...c, selected: !c.selected } : c))
    );
  };

  const updateCommentBody = (findingId: string, newBody: string) => {
    setComments((prev) =>
      prev.map((c) => (c.findingId === findingId ? { ...c, body: newBody } : c))
    );
  };

  const selectedCount = comments.filter((c) => c.selected).length;
  const attachableCount = comments.filter((c) => c.selected && c.isAttachable).length;

  const handlePublish = async () => {
    setIsPublishing(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/v1/github/pr/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: pr.owner,
          repo: pr.repo,
          pullNumber: pr.pullNumber,
          commitSha: pr.head.sha,
          event: reviewEvent,
          reviewBody,
          comments,
          githubToken: githubToken.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}: Failed to submit review`);
      }

      setPublishResult(data);
      setIsConfirming(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to publish review to GitHub.');
      setIsConfirming(false);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="GitHub Review Preview and Publication"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl max-w-3xl w-full p-6 text-zinc-100 flex flex-col gap-5 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <GitPullRequest className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-zinc-100">Review Preview & Publish</h3>
                <span className="font-mono text-xs text-indigo-400 font-semibold">
                  {pr.owner}/{pr.repo}#{pr.pullNumber}
                </span>
              </div>
              <p className="text-xs text-zinc-400 line-clamp-1">{pr.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Screen */}
        {publishResult ? (
          <div className="p-8 text-center flex flex-col items-center gap-4 bg-zinc-950/60 rounded-xl border border-emerald-500/30">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center ring-4 ring-emerald-500/10">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-white">Review Published Successfully!</h4>
              <p className="text-xs text-zinc-300 mt-1 max-w-md mx-auto">
                {publishResult.summary}
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <a
                href={publishResult.reviewUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-lg transition-colors"
              >
                <span>View on GitHub</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-300 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Error Banner */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertOctagon className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {/* Confirmation Alert Overlay */}
            {isConfirming && (
              <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/50 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm">
                  <ShieldAlert className="w-4 h-4 text-indigo-400" />
                  <span>Confirm Publishing to GitHub</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  You are about to publish a <strong>{reviewEvent}</strong> review to{' '}
                  <span className="font-mono text-indigo-300 font-semibold">
                    {pr.owner}/{pr.repo}#{pr.pullNumber}
                  </span>{' '}
                  with <strong>{attachableCount}</strong> inline code comments. This action will be visible to repository collaborators.
                </p>

                {/* Token check if not supplied */}
                <div>
                  <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5 mb-1">
                    <Key className="w-3.5 h-3.5 text-zinc-400" />
                    <span>GitHub Personal Access Token (Requires write scope)</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showToken ? 'text' : 'password'}
                      value={githubToken}
                      onChange={(e) => setGithubToken(e.target.value)}
                      placeholder="ghp_... or github_pat_... (pull_requests:write)"
                      className="w-full pl-3 pr-10 py-2 bg-zinc-950 rounded-xl border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 font-mono focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-zinc-300"
                    >
                      {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setIsConfirming(false)}
                    className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 font-medium"
                  >
                    Back to Edit
                  </button>
                  <button
                    onClick={handlePublish}
                    disabled={isPublishing}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-xs font-bold text-white shadow-md transition-colors"
                  >
                    {isPublishing ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Submitting Review...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Confirm & Publish</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {!isConfirming && (
              <>
                {/* Stats Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex flex-col">
                    <span className="text-[10px] text-zinc-400 uppercase font-semibold">Risk Index</span>
                    <span className="text-lg font-bold text-white font-mono mt-0.5">
                      {report.summary.overall_risk_score}
                      <span className="text-xs text-zinc-500">/100</span>
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex flex-col">
                    <span className="text-[10px] text-zinc-400 uppercase font-semibold">Critical / High</span>
                    <span className="text-lg font-bold text-rose-400 font-mono mt-0.5">
                      {report.summary.critical_count + report.summary.high_count}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex flex-col">
                    <span className="text-[10px] text-zinc-400 uppercase font-semibold">Selected Comments</span>
                    <span className="text-lg font-bold text-indigo-400 font-mono mt-0.5">
                      {selectedCount} of {comments.length}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex flex-col">
                    <span className="text-[10px] text-zinc-400 uppercase font-semibold">Attachable Inline</span>
                    <span className="text-lg font-bold text-emerald-400 font-mono mt-0.5">
                      {attachableCount}
                    </span>
                  </div>
                </div>

                {/* Review Action Selector */}
                <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-zinc-200">GitHub Review Action:</span>
                    <p className="text-[11px] text-zinc-400">
                      Choose whether to comment or block PR merge
                    </p>
                  </div>
                  <div className="flex items-center gap-2 bg-zinc-900 p-1 rounded-lg border border-zinc-800 text-xs">
                    <button
                      type="button"
                      onClick={() => setReviewEvent('COMMENT')}
                      className={`px-3 py-1 rounded-md font-medium transition-all ${
                        reviewEvent === 'COMMENT'
                          ? 'bg-zinc-800 text-white shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Comment
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewEvent('REQUEST_CHANGES')}
                      className={`px-3 py-1 rounded-md font-medium transition-all ${
                        reviewEvent === 'REQUEST_CHANGES'
                          ? 'bg-rose-950/80 text-rose-300 shadow-sm border border-rose-500/30'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Request Changes
                    </button>
                  </div>
                </div>

                {/* Findings Selection & Comment Customization */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                      Proposed Inline Review Comments ({selectedCount} Selected)
                    </h4>
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        onClick={() =>
                          setComments((prev) => prev.map((c) => ({ ...c, selected: true })))
                        }
                        className="text-xs text-indigo-400 hover:text-indigo-300"
                      >
                        Select All
                      </button>
                      <span className="text-zinc-600">|</span>
                      <button
                        onClick={() =>
                          setComments((prev) => prev.map((c) => ({ ...c, selected: false })))
                        }
                        className="text-xs text-zinc-400 hover:text-zinc-300"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {comments.map((c) => {
                      const isEditing = editingFindingId === c.findingId;

                      return (
                        <div
                          key={c.findingId}
                          className={`p-3 rounded-xl border transition-all ${
                            c.selected
                              ? 'bg-zinc-950/80 border-zinc-800'
                              : 'bg-zinc-950/30 border-zinc-900 opacity-60'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2.5 min-w-0">
                              <button
                                type="button"
                                onClick={() => toggleCommentSelection(c.findingId)}
                                className="mt-0.5 text-zinc-400 hover:text-white"
                                aria-label={c.selected ? 'Deselect comment' : 'Select comment'}
                              >
                                {c.selected ? (
                                  <CheckSquare className="w-4 h-4 text-indigo-400" />
                                ) : (
                                  <Square className="w-4 h-4" />
                                )}
                              </button>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-xs font-bold text-zinc-200">
                                    {c.path}:{c.line}
                                  </span>

                                  {c.isAttachable ? (
                                    <span className="text-[10px] font-semibold px-2 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                      Inline Attachable
                                    </span>
                                  ) : (
                                    <span
                                      className="text-[10px] font-semibold px-2 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                      title={c.nonAttachableReason}
                                    >
                                      Summary Note
                                    </span>
                                  )}
                                </div>

                                {isEditing ? (
                                  <div className="mt-2">
                                    <textarea
                                      rows={4}
                                      value={c.body}
                                      onChange={(e) => updateCommentBody(c.findingId, e.target.value)}
                                      className="w-full p-2 bg-zinc-900 rounded-lg border border-zinc-700 text-xs font-mono text-zinc-200 focus:outline-none focus:border-indigo-500"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setEditingFindingId(null)}
                                      className="mt-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[11px] font-medium text-zinc-300"
                                    >
                                      Done Editing
                                    </button>
                                  </div>
                                ) : (
                                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2 font-mono">
                                    {c.body}
                                  </p>
                                )}
                              </div>
                            </div>

                            {!isEditing && (
                              <button
                                type="button"
                                onClick={() => setEditingFindingId(c.findingId)}
                                className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                                title="Edit comment text"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-3 border-t border-zinc-800 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-300 transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsConfirming(true)}
                    disabled={selectedCount === 0}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 text-xs font-semibold text-white shadow-lg transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Proceed to Publish ({selectedCount})</span>
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};
