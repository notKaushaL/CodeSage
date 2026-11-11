import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Trash2, 
  Download, 
  ArrowUpRight
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

  const statusLabels: Record<string, string> = {
    ALL: 'All',
    CRITICAL_RISK: 'Critical Risk',
    HIGH_RISK: 'High Risk',
    MODERATE_RISK: 'Moderate',
    CLEAN_PASS: 'Clean Pass',
  };

  return (
    <div className="space-y-3 max-w-5xl mx-auto">
      {/* Compact Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#f6f8fa] dark:bg-[#161b22] px-4 py-3 rounded-[6px] border border-[#d0d7de] dark:border-[#30363d]">
        <div>
          <div className="flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-[#656d76] dark:text-[#8b949e]" />
            <h2 className="text-sm font-semibold text-[#1f2328] dark:text-[#e6edf3]">Past Code Reviews</h2>
          </div>
          <p className="text-xs text-[#656d76] dark:text-[#8b949e]">
            Saved code review sessions stored locally in your browser
          </p>
        </div>

        {history.length > 0 && (
          <button
            onClick={onClearHistory}
            className="flex items-center gap-1.5 h-7 px-2.5 rounded-[6px] bg-white hover:bg-[#ffebe9] hover:text-[#cf222e] dark:bg-[#21262d] dark:hover:bg-[#f85149]/15 text-[#656d76] dark:text-[#8b949e] dark:hover:text-[#f85149] border border-[#d0d7de] dark:border-[#30363d] text-xs font-medium transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* Filter and Search */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-[#656d76] dark:text-[#8b949e] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by review title or file path..."
            className="w-full h-7 pl-8 pr-3 rounded-[6px] bg-white dark:bg-[#0d1117] border border-[#d0d7de] dark:border-[#30363d] text-xs text-[#1f2328] dark:text-[#e6edf3] placeholder-[#656d76] dark:placeholder-[#6e7681] focus:outline-none focus:border-[#0969da] dark:focus:border-[#2f81f7] font-mono"
          />
        </div>

        <div className="flex items-center gap-0.5 bg-[#f6f8fa] dark:bg-[#161b22] p-0.5 rounded-[6px] border border-[#d0d7de] dark:border-[#30363d] text-[11px] flex-wrap">
          {['ALL', 'CRITICAL_RISK', 'HIGH_RISK', 'MODERATE_RISK', 'CLEAN_PASS'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-2 py-0.5 rounded-[4px] transition-colors whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-white dark:bg-[#21262d] text-[#1f2328] dark:text-[#e6edf3] font-semibold'
                  : 'text-[#656d76] dark:text-[#8b949e] hover:text-[#1f2328] dark:hover:text-[#e6edf3]'
              }`}
            >
              {statusLabels[status] || status}
            </button>
          ))}
        </div>
      </div>

      {/* History List */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-[#161b22] rounded-[6px] border border-[#d0d7de] dark:border-[#30363d] p-6 text-center text-[#656d76] dark:text-[#8b949e] text-xs">
          No saved reviews match your filter.
        </div>
      ) : (
        <div className="bg-white dark:bg-[#161b22] rounded-[6px] border border-[#d0d7de] dark:border-[#30363d] divide-y divide-[#d8dee4] dark:divide-[#21262d] overflow-hidden">
          {filtered.map((report) => {
            const isCrit = report.summary.risk_status === 'CRITICAL_RISK';
            const isHigh = report.summary.risk_status === 'HIGH_RISK';

            return (
              <div
                key={report.id}
                className="px-3.5 py-2.5 hover:bg-[#f6f8fa] dark:hover:bg-[#1f242c] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-xs text-[#1f2328] dark:text-[#e6edf3] truncate">
                      {report.diff_title || 'Untitled Diff Review'}
                    </span>
                    <span className="text-[#d0d7de] dark:text-[#30363d]">·</span>
                    <span
                      className={`text-xs font-mono tabular-nums font-semibold ${
                        isCrit
                          ? 'text-[#cf222e] dark:text-[#f85149]'
                          : isHigh
                          ? 'text-[#9a6700] dark:text-[#d29922]'
                          : 'text-[#1a7f37] dark:text-[#3fb950]'
                      }`}
                    >
                      Score {report.summary.overall_risk_score}/100
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-[#656d76] dark:text-[#8b949e] font-mono tabular-nums">
                    <span>{new Date(report.created_at).toLocaleDateString()}</span>
                    <span>·</span>
                    <span>{report.summary.total_files_analyzed} files</span>
                    <span>·</span>
                    <span>{report.summary.total_lines_analyzed} lines</span>
                    <span>·</span>
                    <span>{report.findings.length} issues</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-center flex-shrink-0">
                  <button
                    onClick={() => exportJSON(report)}
                    className="h-7 px-2 rounded-[6px] hover:bg-[#eaeef2] dark:hover:bg-[#21262d] text-[#656d76] dark:text-[#8b949e] hover:text-[#1f2328] dark:hover:text-[#e6edf3] transition-colors"
                    title="Export JSON report"
                    aria-label="Export JSON report"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onSelectReport(report)}
                    className="flex items-center gap-1 h-7 px-2.5 rounded-[6px] bg-[#f6f8fa] hover:bg-[#f3f4f6] dark:bg-[#21262d] dark:hover:bg-[#30363d] text-[#1f2328] dark:text-[#e6edf3] text-xs font-medium border border-[#d0d7de] dark:border-[#30363d] transition-colors"
                  >
                    <span>Open Review</span>
                    <ArrowUpRight className="w-3 h-3" />
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
