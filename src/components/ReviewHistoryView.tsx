import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Trash2, 
  Download, 
  ArrowUpRight, 
  FileCode, 
  CheckCircle2,
  AlertTriangle,
  ShieldAlert
} from 'lucide-react';
import { ReviewReport } from '../engine/types';

interface ReviewHistoryViewProps {
  history: ReviewReport[];
  onSelectReport: (report: ReviewReport) => void;
  onClearHistory: () => void;
}

export const ReviewHistoryView: React.FC<ReviewHistoryViewProps> = ({
  history,
  onSelectReport,
  onClearHistory,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filtered = history.filter((rep) => {
    const matchesSearch =
      (rep.diff_title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      rep.findings.some((f) => f.file_path.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === 'ALL' || rep.summary.risk_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const exportJSON = (report: ReviewReport) => {
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-zinc-500" />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Review & Audit History</h2>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Persisted review runs with deterministic risk scores and reproducible findings
          </p>
        </div>

        {history.length > 0 && (
          <button
            onClick={onClearHistory}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-100 hover:bg-red-50 hover:text-red-700 dark:bg-zinc-800 dark:hover:bg-red-950/40 text-zinc-600 dark:text-zinc-400 dark:hover:text-red-400 border border-zinc-200 dark:border-zinc-700 text-xs transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* Filter and Search */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by review title or affected file path..."
            className="w-full pl-8 pr-3 py-1.5 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-blue-500 font-mono"
          />
        </div>

        <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 p-0.5 rounded border border-zinc-200 dark:border-zinc-800 text-xs">
          {['ALL', 'CRITICAL_RISK', 'HIGH_RISK', 'MODERATE_RISK', 'CLEAN_PASS'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-2.5 py-1 rounded transition-colors ${
                statusFilter === status
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              {status === 'ALL' ? 'All' : status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* History List */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-8 text-center text-zinc-500 text-xs">
          No review runs match your search query.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((report) => {
            const isCrit = report.summary.risk_status === 'CRITICAL_RISK';
            const isHigh = report.summary.risk_status === 'HIGH_RISK';
            const isClean = report.summary.risk_status === 'CLEAN_PASS';

            return (
              <div
                key={report.id}
                className="p-3.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-xs text-zinc-900 dark:text-zinc-100 truncate">
                      {report.diff_title || 'Untitled Diff Review'}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded border font-semibold ${
                        isCrit
                          ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900/60'
                          : isHigh
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/60'
                          : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60'
                      }`}
                    >
                      Score: {report.summary.overall_risk_score}/100
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                    <span>{new Date(report.created_at).toLocaleDateString()}</span>
                    <span>·</span>
                    <span>{report.summary.total_files_analyzed} files</span>
                    <span>·</span>
                    <span>{report.summary.total_lines_analyzed} lines</span>
                    <span>·</span>
                    <span>{report.findings.length} findings</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                  <button
                    onClick={() => exportJSON(report)}
                    className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
                    title="Export JSON report"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onSelectReport(report)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-medium border border-zinc-200 dark:border-zinc-700 transition-colors"
                  >
                    <span>View Diff</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
