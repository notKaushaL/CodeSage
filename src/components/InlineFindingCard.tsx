import React, { useState } from 'react';
import { 
  AlertOctagon, 
  AlertTriangle, 
  Info, 
  Layers, 
  Copy, 
  Check, 
  ExternalLink, 
  Cpu, 
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Target
} from 'lucide-react';
import { Finding } from '../engine/types';

interface InlineFindingCardProps {
  finding: Finding;
  isActive?: boolean;
}

export const InlineFindingCard: React.FC<InlineFindingCardProps> = ({ 
  finding, 
  isActive = false 
}) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const handleCopyPatch = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!finding.suggestion_diff) return;
    navigator.clipboard.writeText(finding.suggestion_diff);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Severity visual styles with high-contrast, professional developer theme
  const getSeverityStyle = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return {
          border: 'border-red-300 dark:border-red-900/70',
          bg: 'bg-red-50/70 dark:bg-red-950/20',
          badgeText: 'text-red-700 dark:text-red-300',
          badgeBg: 'bg-red-100 dark:bg-red-950/60 border-red-200 dark:border-red-800',
          icon: <AlertOctagon className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />,
        };
      case 'HIGH':
        return {
          border: 'border-amber-300 dark:border-amber-900/70',
          bg: 'bg-amber-50/70 dark:bg-amber-950/20',
          badgeText: 'text-amber-800 dark:text-amber-300',
          badgeBg: 'bg-amber-100 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />,
        };
      case 'MEDIUM':
        return {
          border: 'border-yellow-300 dark:border-yellow-900/70',
          bg: 'bg-yellow-50/70 dark:bg-yellow-950/20',
          badgeText: 'text-yellow-800 dark:text-yellow-300',
          badgeBg: 'bg-yellow-100 dark:bg-yellow-950/60 border-yellow-200 dark:border-yellow-800',
          icon: <Layers className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />,
        };
      default:
        return {
          border: 'border-sky-300 dark:border-sky-900/70',
          bg: 'bg-sky-50/70 dark:bg-sky-950/20',
          badgeText: 'text-sky-800 dark:text-sky-300',
          badgeBg: 'bg-sky-100 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800',
          icon: <Info className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />,
        };
    }
  };

  const sevStyle = getSeverityStyle(finding.severity);

  return (
    <div
      id={`finding-${finding.id}`}
      data-testid={`finding-card-${finding.id}`}
      className={`my-2 mx-3 sm:mx-6 p-4 rounded-lg border transition-all ${
        isActive
          ? 'ring-2 ring-blue-500 bg-white dark:bg-zinc-900 border-blue-500 shadow-md'
          : `${sevStyle.border} ${sevStyle.bg} bg-white dark:bg-zinc-900/90 shadow-sm`
      }`}
    >
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2 flex-wrap">
          {isActive && (
            <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-600 text-white">
              <Target className="w-3 h-3" />
              <span>Target</span>
            </span>
          )}

          <div className="flex items-center gap-1">
            {sevStyle.icon}
            <span className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded border ${sevStyle.badgeBg} ${sevStyle.badgeText}`}>
              {finding.severity}
            </span>
          </div>

          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
            {finding.category}
          </span>

          {finding.cwe_id && (
            <a
              href={`https://cwe.mitre.org/data/definitions/${finding.cwe_id.replace('CWE-', '')}.html`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-blue-700 dark:text-blue-300 border border-zinc-200 dark:border-zinc-700 hover:border-blue-400 transition-colors"
              title="View MITRE CWE Knowledge Base"
            >
              <span>{finding.cwe_id}</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}

          {finding.owasp_category && (
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 hidden md:inline truncate max-w-xs font-mono">
              {finding.owasp_category}
            </span>
          )}
        </div>

        {/* Source & Confidence Badge + Expand/Collapse */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[11px] text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
            {finding.source === 'HYBRID_CONSENSUS' ? (
              <>
                <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span className="font-medium text-emerald-700 dark:text-emerald-400">Hybrid Consensus</span>
              </>
            ) : finding.source === 'GEMINI_ENGINE' ? (
              <>
                <Cpu className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                <span className="font-medium text-purple-700 dark:text-purple-300">Gemini 3.8 Flash</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                <span className="font-medium text-blue-700 dark:text-blue-300">Static Scanner</span>
              </>
            )}
            <span className="text-zinc-400 dark:text-zinc-600">·</span>
            <span className="font-mono tabular-nums text-zinc-700 dark:text-zinc-300">{Math.round(finding.confidence * 100)}% conf</span>
          </span>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors"
            title={isExpanded ? 'Collapse finding details' : 'Expand finding details'}
            aria-label={isExpanded ? 'Collapse finding details' : 'Expand finding details'}
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Body: Title and Description */}
      <div className="mt-2.5">
        <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <span>{finding.title}</span>
          <span className="text-[11px] font-normal text-zinc-500 dark:text-zinc-400 font-mono">
            Line {finding.line_number}
          </span>
        </h4>
        {isExpanded && (
          <p className="mt-1 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-sans">
            {finding.description}
          </p>
        )}
      </div>

      {/* Mini-Diff Suggestion Box */}
      {isExpanded && finding.suggestion_diff && (
        <div className="mt-3 bg-zinc-50 dark:bg-zinc-950 rounded border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400 font-mono">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Suggested Fix:</span>
            <button
              onClick={handleCopyPatch}
              className="flex items-center gap-1 text-[11px] text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white px-2 py-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-zinc-500" />
                  <span>Copy Patch</span>
                </>
              )}
            </button>
          </div>
          <div className="p-3 font-mono text-xs overflow-x-auto space-y-1">
            {finding.suggestion_diff.split('\n').map((patchLine, pIdx) => {
              if (patchLine.startsWith('+')) {
                return (
                  <div key={pIdx} className="text-emerald-800 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                    {patchLine}
                  </div>
                );
              }
              if (patchLine.startsWith('-')) {
                return (
                  <div key={pIdx} className="text-red-800 dark:text-red-300 bg-red-100/70 dark:bg-red-950/40 px-2 py-0.5 rounded line-through opacity-80">
                    {patchLine}
                  </div>
                );
              }
              return (
                <div key={pIdx} className="text-zinc-600 dark:text-zinc-400 px-2">
                  {patchLine}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
