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
          headerBg: 'bg-[#ffebe9]/60 dark:bg-[#f85149]/10',
          textColor: 'text-[#cf222e] dark:text-[#f85149]',
          icon: <AlertOctagon className="w-3.5 h-3.5 text-[#cf222e] dark:text-[#f85149] flex-shrink-0" />,
        };
      case 'HIGH':
        return {
          border: 'border-[#d97706]/40 dark:border-[#d29922]/50',
          headerBg: 'bg-[#fef3c7]/60 dark:bg-[#d29922]/10',
          textColor: 'text-[#d97706] dark:text-[#d29922]',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-[#d97706] dark:text-[#d29922] flex-shrink-0" />,
        };
      case 'MEDIUM':
        return {
          border: 'border-[#ca8a04]/40 dark:border-[#e3b341]/40',
          headerBg: 'bg-[#fef9c3]/50 dark:bg-[#e3b341]/10',
          textColor: 'text-[#a16207] dark:text-[#e3b341]',
          icon: <Layers className="w-3.5 h-3.5 text-[#a16207] dark:text-[#e3b341] flex-shrink-0" />,
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
    return 'Static Analysis';
  };

  return (
    <div
      id={`finding-${finding.id}`}
      data-testid={`finding-card-${finding.id}`}
      className={`my-2 mx-3 sm:mx-8 rounded-lg border bg-white dark:bg-[#161b22] overflow-hidden font-sans transition-all ${
        isActive
          ? 'ring-2 ring-[#0969da] dark:ring-[#2f81f7] border-[#0969da] dark:border-[#2f81f7] shadow-md'
          : `${sevConfig.border} shadow-2xs`
      }`}
    >
      {/* GitHub PR Review Comment Style Header */}
      <div className={`px-3.5 py-2 border-b border-[#e4e4e7] dark:border-[#30363d] flex flex-wrap items-center justify-between gap-2 ${sevConfig.headerBg}`}>
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {sevConfig.icon}
          <span className={`font-semibold font-mono ${sevConfig.textColor}`}>
            {finding.severity}
          </span>
          <span className="text-[#a1a1aa] dark:text-[#484f58]">·</span>
          <span className="font-semibold text-[#171717] dark:text-[#e6edf3]">
            {finding.title}
          </span>
          <span className="text-[#a1a1aa] dark:text-[#484f58]">·</span>
          <span className="font-mono text-[11px] text-[#52525b] dark:text-[#8b949e]">
            Line {finding.line_number}
          </span>

          {finding.cwe_id && (
            <>
              <span className="text-[#a1a1aa] dark:text-[#484f58]">·</span>
              <a
                href={`https://cwe.mitre.org/data/definitions/${finding.cwe_id.replace('CWE-', '')}.html`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-mono text-[#0969da] dark:text-[#58a6ff] hover:underline"
                title="Open MITRE CWE Reference"
              >
                <span>{finding.cwe_id}</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-[#52525b] dark:text-[#8b949e]">
          <span>{finding.category}</span>
          <span>·</span>
          <span>{getSourceLabel(finding.source)}</span>
          <span>·</span>
          <span className="font-mono tabular-nums">{Math.round(finding.confidence * 100)}%</span>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-[#52525b] dark:text-[#8b949e] transition-colors ml-1"
            title={isExpanded ? 'Collapse details' : 'Expand details'}
            aria-label={isExpanded ? 'Collapse finding details' : 'Expand finding details'}
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Body: Explanation & Suggested Code Fix */}
      {isExpanded && (
        <div className="p-3.5 space-y-3 text-xs">
          <p className="text-[#171717] dark:text-[#e6edf3] leading-relaxed">
            {finding.description}
          </p>

          {finding.suggestion_diff && (
            <div className="rounded-md border border-[#e4e4e7] dark:border-[#30363d] overflow-hidden bg-[#f6f8fa] dark:bg-[#0d1117]">
              <div className="flex items-center justify-between px-3 py-1.5 bg-[#f4f4f5] dark:bg-[#161b22] border-b border-[#e4e4e7] dark:border-[#30363d] text-[11px] text-[#52525b] dark:text-[#8b949e]">
                <span className="font-medium text-[#171717] dark:text-[#e6edf3]">Suggested Fix</span>
                <button
                  onClick={handleCopyPatch}
                  className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#171717] dark:text-[#e6edf3] hover:text-[#0969da] dark:hover:text-[#58a6ff] px-2 py-0.5 rounded hover:bg-[#e4e4e7]/60 dark:hover:bg-[#21262d] transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-[#1a7f37] dark:text-[#3fb950]" />
                      <span className="text-[#1a7f37] dark:text-[#3fb950]">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Patch</span>
                    </>
                  )}
                </button>
              </div>
              <div className="p-2.5 font-mono text-xs overflow-x-auto space-y-0.5">
                {finding.suggestion_diff.split('\n').map((patchLine, pIdx) => {
                  if (patchLine.startsWith('+')) {
                    return (
                      <div
                        key={pIdx}
                        className="text-[#116329] dark:text-[#3fb950] bg-[#dafbe1] dark:bg-[#2ea043]/15 px-2 py-0.5 rounded-xs"
                      >
                        {patchLine}
                      </div>
                    );
                  }
                  if (patchLine.startsWith('-')) {
                    return (
                      <div
                        key={pIdx}
                        className="text-[#cf222e] dark:text-[#f85149] bg-[#ffebe9] dark:bg-[#f85149]/15 px-2 py-0.5 rounded-xs"
                      >
                        {patchLine}
                      </div>
                    );
                  }
                  return (
                    <div key={pIdx} className="text-[#52525b] dark:text-[#8b949e] px-2">
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
