import { ParsedDiff, DiffHunk, DiffLine } from './types';

export interface PackedChunk {
  filePath: string;
  language: string;
  hunkHeader: string;
  enclosingScope?: string;
  lineRange: { start: number; end: number };
  compactContent: string;
  originalLinesCount: number;
  packedLinesCount: number;
}

export interface ChunkingResult {
  chunks: PackedChunk[];
  packedPrompt: string;
  rawEstimatedTokens: number;
  packedEstimatedTokens: number;
  savingsPercentage: number;
}

/**
 * Filter and pack context lines: keeps at most maxContextDistance (5) context lines
 * adjacent to added/deleted lines, discarding distant boilerplate context.
 */
function packHunkLines(lines: DiffLine[], maxContextDistance = 5): DiffLine[] {
  // Find indices of all changed lines (ADDED or DELETED)
  const changedIndices: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].type === 'ADDED' || lines[i].type === 'DELETED') {
      changedIndices.push(i);
    }
  }

  // If no changes, keep a minimal slice
  if (changedIndices.length === 0) {
    return lines.slice(0, Math.min(lines.length, 5));
  }

  // Mark lines within maxContextDistance of any changed line
  const keep = new Array<boolean>(lines.length).fill(false);
  for (const idx of changedIndices) {
    const start = Math.max(0, idx - maxContextDistance);
    const end = Math.min(lines.length - 1, idx + maxContextDistance);
    for (let j = start; j <= end; j++) {
      keep[j] = true;
    }
  }

  const result: DiffLine[] = [];
  let skipped = false;

  for (let i = 0; i < lines.length; i++) {
    if (keep[i]) {
      if (skipped) {
        // Insert a marker indicating collapsed boilerplate context
        result.push({
          type: 'CONTEXT',
          content: '... [Boilerplate context collapsed for token optimization] ...',
        });
        skipped = false;
      }
      result.push(lines[i]);
    } else {
      skipped = true;
    }
  }

  return result;
}

export function packDiffForLLM(parsedDiff: ParsedDiff): ChunkingResult {
  const chunks: PackedChunk[] = [];
  let packedPromptLines: string[] = [];

  packedPromptLines.push('=== CODE REVIEW TARGET DIFF WITH LINE MAPPINGS ===');
  packedPromptLines.push('Instructions: Analyze modified lines (+) in each file. Reference exact Target Line numbers.');

  for (const file of parsedDiff.files) {
    if (file.isDeleted) {
      packedPromptLines.push(`\nFILE (DELETED): ${file.oldPath}`);
      continue;
    }

    const path = file.newPath;
    packedPromptLines.push(`\nFILE: ${path} (${file.language})`);

    for (const hunk of file.hunks) {
      const packedLines = packHunkLines(hunk.lines, 5);
      const scopeTag = hunk.enclosingScope ? ` | SCOPE: ${hunk.enclosingScope}` : '';
      packedPromptLines.push(`  HUNK: ${hunk.header}${scopeTag}`);

      let chunkBody = '';
      for (const line of packedLines) {
        let prefix = ' ';
        let lineRef = '';
        if (line.type === 'ADDED') {
          prefix = '+';
          lineRef = `[L${line.newLineNumber}] `;
        } else if (line.type === 'DELETED') {
          prefix = '-';
          lineRef = `[DEL L${line.oldLineNumber}] `;
        } else {
          prefix = ' ';
          lineRef = line.newLineNumber ? `[L${line.newLineNumber}] ` : ' ';
        }

        const formatted = `    ${prefix} ${lineRef}${line.content}`;
        packedPromptLines.push(formatted);
        chunkBody += `${formatted}\n`;
      }

      chunks.push({
        filePath: path,
        language: file.language,
        hunkHeader: hunk.header,
        enclosingScope: hunk.enclosingScope,
        lineRange: {
          start: hunk.newStart,
          end: hunk.newStart + hunk.newLines,
        },
        compactContent: chunkBody,
        originalLinesCount: hunk.lines.length,
        packedLinesCount: packedLines.length,
      });
    }
  }

  const packedPrompt = packedPromptLines.join('\n');
  const rawSize = parsedDiff.rawSize;
  const rawEstimatedTokens = Math.max(1, Math.round(rawSize / 3.8));
  const packedEstimatedTokens = Math.max(1, Math.round(packedPrompt.length / 3.8));

  const savingsPercentage = rawEstimatedTokens > packedEstimatedTokens
    ? Math.round(((rawEstimatedTokens - packedEstimatedTokens) / rawEstimatedTokens) * 100)
    : 0;

  return {
    chunks,
    packedPrompt,
    rawEstimatedTokens,
    packedEstimatedTokens,
    savingsPercentage,
  };
}
