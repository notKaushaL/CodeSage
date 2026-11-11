import React, { useState } from 'react';
import { 
  AlertOctagon, 
  AlertTriangle, 
  Info, 
  Layers, 
  Copy, 
  Check, 
  ExternalLink, 
  ChevronDown,
  ChevronUp
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

  const getSeverityConfig = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return {
          border: 'border-[#cf222e]/40 dark:border-[#f85149]/50',
          headerBg: 'bg-[#ffebe9]/50 dark:bg-[#f85149]/10',
          textColor: 'text-[#cf222e] dark:text-[#f85149]',
          icon: <AlertOctagon className="w-3.5 h-3.5 text-[#cf222e] dark:text-[#f85149] flex-shrink-0" />,
        };
      case 'HIGH':
        return {
          border: 'border-[#9a6700]/40 dark:border-[#d29922]/50',
          headerBg: 'bg-[#fff8c5]/60 dark:bg-[#d29922]/10',
          textColor: 'text-[#9a6700] dark:text-[#d29922]',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-[#9a6700] dark:text-[#d29922] flex-shrink-0" />,
        };
      case 'MEDIUM':
        return {
          border: 'border-[#9a6700]/30 dark:border-[#e3b341]/40',
          headerBg: 'bg-[#fff8c5]/40 dark:bg-[#e3b341]/10',
          textColor: 'text-[#9a6700] dark:text-[#e3b341]',
          icon: <Layers className="w-3.5 h-3.5 text-[#9a6700] dark:text-[#e3b341] flex-shrink-0" />,
        };
      default:
        return {
          border: 'border-[#0969da]/30 dark:border-[#388bfd]/40',
          headerBg: 'bg-[#ddf4ff]/50 dark:bg-[#388bfd]/10',
          textColor: 'text-[#0969da] dark:text-[#58a6ff]',
          icon: <Info className="w-3.5 h-3.5 text-[#0969da] dark:text-[#58a6ff] flex-shrink-0" />,
        };
    }
  };

  const sevConfig = getSeverityConfig(finding.severity);

  const getSourceLabel = (source: string) => {
    if (source === 'HYBRID_CONSENSUS') return 'Hybrid Consensus';
    if (source === 'GEMINI_ENGINE') return 'Gemini AI';
    return 'Static Rule';
  };

  return (
    <div
      id={`finding-${finding.id}`}
      data-testid={`finding-card-${finding.id}`}
      className={`my-1.5 mx-3 max-w-4xl rounded-[6px] border bg-white dark:bg-[#161b22] overflow-hidden font-sans whitespace-normal transition-all ${
        isActive
          ? 'ring-2 ring-[#0969da] dark:ring-[#2f81f7] border-[#0969da] dark:border-[#2f81f7]'
          : sevConfig.border
      }`}
    >
      {/* Compact GitHub Code Scanning / Review Thread Header */}
      <div className={`px-3 py-1.5 border-b border-[#d0d7de] dark:border-[#30363d] flex flex-wrap items-center justify-between gap-2 ${sevConfig.headerBg}`}>
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          {sevConfig.icon}
          <span className={`font-semibold font-mono text-[11px] ${sevConfig.textColor}`}>
            {finding.severity}
          </span>
          <span className="text-[#656d76] dark:text-[#8b949e]">·</span>
          <span className="font-semibold text-[#1f2328] dark:text-[#e6edf3]">
            {finding.title}
          </span>
          <span className="text-[#656d76] dark:text-[#8b949e]">·</span>
          <span className="font-mono text-[11px] text-[#656d76] dark:text-[#8b949e]">
            Line {finding.line_number}
          </span>

          {finding.cwe_id && (
            <>
              <span className="text-[#656d76] dark:text-[#8b949e]">·</span>
              <a
                href={`https://cwe.mitre.org/data/definitions/${finding.cwe_id.replace('CWE-', '')}.html`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-0.5 text-[11px] font-mono text-[#0969da] dark:text-[#2f81f7] hover:underline"
                title="Open MITRE CWE Reference"
              >
                <span>{finding.cwe_id}</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-[#656d76] dark:text-[#8b949e]">
          <span>{finding.category}</span>
          <span>·</span>
          <span>{getSourceLabel(finding.source)}</span>
          <span>·</span>
          <span className="font-mono tabular-nums">{Math.round(finding.confidence * 100)}%</span>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 text-[#656d76] dark:text-[#8b949e] transition-colors ml-1"
            title={isExpanded ? 'Collapse details' : 'Expand details'}
            aria-label={isExpanded ? 'Collapse finding details' : 'Expand finding details'}
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Compact Body: Explanation & Suggested Change */}
      {isExpanded && (
        <div className="px-3 py-2 space-y-2 text-xs">
          <p className="text-[#1f2328] dark:text-[#e6edf3] leading-snug">
            {finding.description}
          </p>

          {finding.suggestion_diff && (
            <div className="rounded-[6px] border border-[#d0d7de] dark:border-[#30363d] overflow-hidden bg-[#f6f8fa] dark:bg-[#0d1117]">
              <div className="flex items-center justify-between px-2.5 py-1 bg-[#f6f8fa] dark:bg-[#161b22] border-b border-[#d0d7de] dark:border-[#30363d] text-[11px] text-[#656d76] dark:text-[#8b949e]">
                <span className="font-medium text-[#1f2328] dark:text-[#e6edf3]">Suggested change</span>
                <button
                  onClick={handleCopyPatch}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1f2328] dark:text-[#e6edf3] hover:text-[#0969da] dark:hover:text-[#2f81f7] px-1.5 py-0.5 rounded hover:bg-[#d0d7de]/40 dark:hover:bg-[#30363d] transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-[#1a7f37] dark:text-[#3fb950]" />
                      <span className="text-[#1a7f37] dark:text-[#3fb950]">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy patch</span>
                    </>
                  )}
                </button>
              </div>
              <div className="py-1 font-mono text-[11px] leading-[18px]">
                {finding.suggestion_diff.split('\n').map((patchLine, pIdx) => {
                  if (patchLine.startsWith('+')) {
                    return (
                      <div
                        key={pIdx}
                        className="text-[#1f2328] dark:text-[#e6edf3] gh-diff-add px-2.5 whitespace-pre-wrap break-all"
                      >
                        <span className="text-[#1a7f37] dark:text-[#3fb950] font-semibold mr-1">+</span>
                        {patchLine.slice(1)}
                      </div>
                    );
                  }
                  if (patchLine.startsWith('-')) {
                    return (
                      <div
                        key={pIdx}
                        className="text-[#1f2328] dark:text-[#e6edf3] gh-diff-del px-2.5 whitespace-pre-wrap break-all"
                      >
                        <span className="text-[#cf222e] dark:text-[#f85149] font-semibold mr-1">-</span>
                        {patchLine.slice(1)}
                      </div>
                    );
                  }
                  return (
                    <div key={pIdx} className="text-[#656d76] dark:text-[#8b949e] px-2.5 whitespace-pre-wrap break-all">
                      {patchLine}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
