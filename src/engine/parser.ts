import { DiffFile, DiffHunk, DiffLine, ParsedDiff } from './types';

const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  ts: 'TypeScript',
  tsx: 'TypeScript (React)',
  js: 'JavaScript',
  jsx: 'JavaScript (React)',
  py: 'Python',
  go: 'Go',
  rs: 'Rust',
  java: 'Java',
  c: 'C',
  cpp: 'C++',
  h: 'C/C++ Header',
  cs: 'C#',
  rb: 'Ruby',
  php: 'PHP',
  sql: 'SQL',
  sh: 'Shell',
  bash: 'Bash',
  json: 'JSON',
  yaml: 'YAML',
  yml: 'YAML',
  html: 'HTML',
  htm: 'HTML',
  css: 'CSS',
  md: 'Markdown',
};

function detectLanguage(filePath: string): string {
  const parts = filePath.split('.');
  if (parts.length > 1) {
    const ext = parts[parts.length - 1].toLowerCase();
    return EXTENSION_LANGUAGE_MAP[ext] || 'Text';
  }
  return 'Text';
}

function cleanPath(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1);
  }
  if (cleaned.startsWith('a/') || cleaned.startsWith('b/')) {
    cleaned = cleaned.substring(2);
  }
  return cleaned;
}

/**
 * Parses raw unified diff string content into structured Files, Hunks, and Lines
 * with exact physical line mappings for both original (-) and modified (+) files.
 */
export function parseUnifiedDiff(rawDiff: string): ParsedDiff {
  const lines = rawDiff.split(/\r?\n/);
  const files: DiffFile[] = [];

  let currentFile: DiffFile | null = null;
  let currentHunk: DiffHunk | null = null;
  let currentOldLine = 0;
  let currentNewLine = 0;

  let totalAdded = 0;
  let totalDeleted = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect file header
    if (line.startsWith('diff --git ')) {
      // e.g. diff --git a/src/auth.ts b/src/auth.ts
      if (currentHunk && currentFile) {
        currentFile.hunks.push(currentHunk);
        currentHunk = null;
      }
      if (currentFile) {
        files.push(currentFile);
      }

      const match = line.match(/^diff --git (?:"?a\/(.+?)"?|a\/(.+?)) (?:"?b\/(.+?)"?|b\/(.+?))$/);
      const oldPath = match ? (match[1] || match[2] || 'unknown') : 'unknown';
      const newPath = match ? (match[3] || match[4] || 'unknown') : 'unknown';

      currentFile = {
        oldPath: cleanPath(oldPath),
        newPath: cleanPath(newPath),
        isNew: false,
        isDeleted: false,
        isRename: oldPath !== newPath && oldPath !== 'dev/null' && newPath !== 'dev/null',
        isBinary: false,
        language: detectLanguage(newPath !== 'dev/null' ? newPath : oldPath),
        hunks: [],
        addedLineCount: 0,
        deletedLineCount: 0,
      };
      continue;
    }

    // Git metadata lines
    if (line.startsWith('new file mode ')) {
      if (currentFile) currentFile.isNew = true;
      continue;
    }
    if (line.startsWith('deleted file mode ')) {
      if (currentFile) currentFile.isDeleted = true;
      continue;
    }
    if (line.startsWith('rename from ')) {
      if (currentFile) {
        currentFile.isRename = true;
        currentFile.oldPath = cleanPath(line.substring(12));
      }
      continue;
    }
    if (line.startsWith('rename to ')) {
      if (currentFile) {
        currentFile.isRename = true;
        currentFile.newPath = cleanPath(line.substring(10));
        currentFile.language = detectLanguage(currentFile.newPath);
      }
      continue;
    }
    if (line.startsWith('Binary files ') || line.includes('GIT binary patch')) {
      if (currentFile) {
        currentFile.isBinary = true;
      }
      continue;
    }

    if (line.startsWith('--- ')) {
      const pathPart = line.substring(4).trim();
      const isDevNull = pathPart === '/dev/null';
      const cleaned = isDevNull ? '/dev/null' : cleanPath(pathPart);

      // If previous file already had hunks or a pending hunk, finalize previous file
      if (currentFile && (currentFile.hunks.length > 0 || currentHunk !== null)) {
        if (currentHunk) {
          currentFile.hunks.push(currentHunk);
          currentHunk = null;
        }
        files.push(currentFile);
        currentFile = null;
      }

      if (!currentFile) {
        currentFile = {
          oldPath: cleaned,
          newPath: 'unknown',
          isNew: isDevNull,
          isDeleted: false,
          isRename: false,
          isBinary: false,
          language: 'Text',
          hunks: [],
          addedLineCount: 0,
          deletedLineCount: 0,
        };
      } else {
        if (isDevNull) {
          currentFile.isNew = true;
          currentFile.oldPath = '/dev/null';
        } else {
          currentFile.oldPath = cleaned;
        }
      }
      continue;
    }

    if (line.startsWith('+++ ')) {
      if (currentFile) {
        const pathPart = line.substring(4).trim();
        if (pathPart === '/dev/null') {
          currentFile.isDeleted = true;
          currentFile.newPath = '/dev/null';
        } else {
          currentFile.newPath = cleanPath(pathPart);
          currentFile.language = detectLanguage(currentFile.newPath);
        }
      }
      continue;
    }

    // Detect Hunk header: @@ -oldStart,oldLen +newStart,newLen @@ [enclosing scope]
    if (line.startsWith('@@ ')) {
      if (currentHunk && currentFile) {
        currentFile.hunks.push(currentHunk);
      }
      currentHunk = null;

      const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/);
      if (hunkMatch) {
        const oldStart = parseInt(hunkMatch[1], 10);
        const oldLines = hunkMatch[2] !== undefined ? parseInt(hunkMatch[2], 10) : 1;
        const newStart = parseInt(hunkMatch[3], 10);
        const newLines = hunkMatch[4] !== undefined ? parseInt(hunkMatch[4], 10) : 1;
        const enclosingScope = hunkMatch[5] ? hunkMatch[5].trim() : undefined;

        currentOldLine = oldStart;
        currentNewLine = newStart;

        currentHunk = {
          header: line,
          oldStart,
          oldLines,
          newStart,
          newLines,
          enclosingScope,
          lines: [],
        };
      }
      continue;
    }

    // Process hunk lines if we're currently inside a hunk
    if (currentHunk && currentFile) {
      if (line.startsWith('+')) {
        const content = line.substring(1);
        const diffLine: DiffLine = {
          type: 'ADDED',
          content,
          newLineNumber: currentNewLine,
        };
        currentNewLine++;
        currentHunk.lines.push(diffLine);
        currentFile.addedLineCount++;
        totalAdded++;
      } else if (line.startsWith('-')) {
        const content = line.substring(1);
        const diffLine: DiffLine = {
          type: 'DELETED',
          content,
          oldLineNumber: currentOldLine,
        };
        currentOldLine++;
        currentHunk.lines.push(diffLine);
        currentFile.deletedLineCount++;
        totalDeleted++;
      } else if (line.startsWith(' ')) {
        const content = line.substring(1);
        const diffLine: DiffLine = {
          type: 'CONTEXT',
          content,
          oldLineNumber: currentOldLine,
          newLineNumber: currentNewLine,
        };
        currentOldLine++;
        currentNewLine++;
        currentHunk.lines.push(diffLine);
      } else if (line === '') {
        // Only treat empty string as context if it is NOT the trailing newline of the whole diff
        if (i < lines.length - 1) {
          const diffLine: DiffLine = {
            type: 'CONTEXT',
            content: '',
            oldLineNumber: currentOldLine,
            newLineNumber: currentNewLine,
          };
          currentOldLine++;
          currentNewLine++;
          currentHunk.lines.push(diffLine);
        }
      } else if (line.startsWith('\\ No newline at end of file')) {
        // Metadata line, ignore without shifting line indices
      }
    }
  }

  // Push pending structures
  if (currentHunk && currentFile) {
    currentFile.hunks.push(currentHunk);
  }
  if (currentFile) {
    files.push(currentFile);
  }

  return {
    files,
    totalFiles: files.length,
    totalAdded,
    totalDeleted,
    rawSize: new TextEncoder().encode(rawDiff).length,
  };
}
