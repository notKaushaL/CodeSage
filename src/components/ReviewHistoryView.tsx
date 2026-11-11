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
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#161b22] p-5 rounded-lg border border-[#e4e4e7] dark:border-[#30363d]">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#52525b] dark:text-[#8b949e]" />
            <h2 className="text-base font-semibold text-[#171717] dark:text-[#e6edf3]">Past Code Reviews</h2>
          </div>
          <p className="text-xs text-[#52525b] dark:text-[#8b949e] mt-0.5">
            Saved code review sessions stored locally in your browser
          </p>
        </div>

        {history.length > 0 && (
          <button
            onClick={onClearHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#fafafa] hover:bg-[#ffebe9] hover:text-[#cf222e] dark:bg-[#21262d] dark:hover:bg-[#f85149]/15 text-[#52525b] dark:text-[#8b949e] dark:hover:text-[#f85149] border border-[#d4d4d8] dark:border-[#30363d] text-xs font-medium transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* Filter and Search */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-[#71717a] dark:text-[#8b949e] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by review title or file path..."
            className="w-full pl-8 pr-3 py-1.5 rounded-md bg-white dark:bg-[#161b22] border border-[#d4d4d8] dark:border-[#30363d] text-xs text-[#171717] dark:text-[#e6edf3] placeholder-[#71717a] dark:placeholder-[#6e7681] focus:outline-none focus:border-[#0969da] dark:focus:border-[#2f81f7] font-mono"
          />
        </div>

        <div className="flex items-center gap-1 bg-white dark:bg-[#161b22] p-1 rounded-lg border border-[#e4e4e7] dark:border-[#30363d] text-xs flex-wrap">
          {['ALL', 'CRITICAL_RISK', 'HIGH_RISK', 'MODERATE_RISK', 'CLEAN_PASS'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-[#f4f4f5] dark:bg-[#21262d] text-[#171717] dark:text-[#e6edf3] font-semibold'
                  : 'text-[#52525b] dark:text-[#8b949e] hover:text-[#171717] dark:hover:text-[#e6edf3]'
              }`}
            >
              {statusLabels[status] || status}
            </button>
          ))}
        </div>
      </div>

      {/* History List */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-[#161b22] rounded-lg border border-[#e4e4e7] dark:border-[#30363d] p-8 text-center text-[#71717a] dark:text-[#8b949e] text-xs">
          No saved reviews match your filter.
        </div>
      ) : (
        <div className="bg-white dark:bg-[#161b22] rounded-lg border border-[#e4e4e7] dark:border-[#30363d] divide-y divide-[#e4e4e7] dark:divide-[#21262d] overflow-hidden">
          {filtered.map((report) => {
            const isCrit = report.summary.risk_status === 'CRITICAL_RISK';
            const isHigh = report.summary.risk_status === 'HIGH_RISK';

            return (
              <div
                key={report.id}
                className="p-4 hover:bg-[#fafafa] dark:hover:bg-[#1f242c] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-xs text-[#171717] dark:text-[#e6edf3] truncate">
                      {report.diff_title || 'Untitled Diff Review'}
                    </span>
                    <span className="text-[#d4d4d8] dark:text-[#30363d]">·</span>
                    <span
                      className={`text-xs font-mono tabular-nums font-semibold ${
                        isCrit
                          ? 'text-[#cf222e] dark:text-[#f85149]'
                          : isHigh
                          ? 'text-[#d97706] dark:text-[#d29922]'
                          : 'text-[#1a7f37] dark:text-[#3fb950]'
                      }`}
                    >
                      Score {report.summary.overall_risk_score}/100
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 text-[11px] text-[#71717a] dark:text-[#8b949e] font-mono tabular-nums">
                    <span>{new Date(report.created_at).toLocaleDateString()}</span>
                    <span>·</span>
                    <span>{report.summary.total_files_analyzed} files</span>
                    <span>·</span>
                    <span>{report.summary.total_lines_analyzed} lines</span>
                    <span>·</span>
                    <span>{report.findings.length} issues</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                  <button
                    onClick={() => exportJSON(report)}
                    className="p-1.5 rounded-md hover:bg-[#f4f4f5] dark:hover:bg-[#21262d] text-[#52525b] dark:text-[#8b949e] hover:text-[#171717] dark:hover:text-[#e6edf3] transition-colors"
                    title="Export JSON report"
                    aria-label="Export JSON report"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onSelectReport(report)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#fafafa] hover:bg-[#f4f4f5] dark:bg-[#21262d] dark:hover:bg-[#30363d] text-[#171717] dark:text-[#e6edf3] text-xs font-medium border border-[#d4d4d8] dark:border-[#30363d] transition-colors"
                  >
                    <span>Open Review</span>
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
