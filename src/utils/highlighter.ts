import { createHighlighter, type Highlighter, type ThemedToken } from 'shiki';

export const SUPPORTED_LANGUAGES = [
  'typescript',
  'javascript',
  'python',
  'java',
  'go',
  'rust',
  'c',
  'cpp',
  'php',
  'ruby',
  'html',
  'css',
  'json',
  'yaml',
  'sql',
  'bash',
] as const;

export type SupportedLang = typeof SUPPORTED_LANGUAGES[number];

export interface HighlightedToken {
  content: string;
  color?: string;
  fontStyle?: number;
}

const EXT_TO_LANG: Record<string, SupportedLang> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  py: 'python',
  pyw: 'python',
  java: 'java',
  go: 'go',
  rs: 'rust',
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  hpp: 'cpp',
  php: 'php',
  rb: 'ruby',
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'css',
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  sql: 'sql',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
};

const NAME_TO_LANG: Record<string, SupportedLang> = {
  typescript: 'typescript',
  'typescript (react)': 'typescript',
  javascript: 'javascript',
  'javascript (react)': 'javascript',
  python: 'python',
  java: 'java',
  go: 'go',
  rust: 'rust',
  c: 'c',
  'c++': 'cpp',
  cpp: 'cpp',
  'c/c++ header': 'cpp',
  php: 'php',
  ruby: 'ruby',
  html: 'html',
  css: 'css',
  json: 'json',
  yaml: 'yaml',
  sql: 'sql',
  shell: 'bash',
  bash: 'bash',
};

/**
 * Resolves a normalized Shiki language ID from language metadata and/or file path.
 * Returns null if the language is unsupported or plain text.
 */
export function resolveLanguageId(languageName?: string, filePath?: string): SupportedLang | null {
  if (languageName) {
    const normalizedName = languageName.trim().toLowerCase();
    if (NAME_TO_LANG[normalizedName]) {
      return NAME_TO_LANG[normalizedName];
    }
  }

  if (filePath) {
    const ext = filePath.split('.').pop()?.toLowerCase();
    if (ext && EXT_TO_LANG[ext]) {
      return EXT_TO_LANG[ext];
    }
  }

  return null;
}

// Global singleton highlighter instance promise supporting both GitHub Dark & GitHub Light
let highlighterPromise: Promise<Highlighter> | null = null;
const THEME_DARK = 'github-dark-default';
const THEME_LIGHT = 'github-light-default';

export function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [THEME_DARK, THEME_LIGHT],
      langs: [...SUPPORTED_LANGUAGES],
    }).catch((err) => {
      console.warn('Failed to initialize Shiki highlighter:', err);
      highlighterPromise = null;
      throw err;
    });
  }
  return highlighterPromise;
}

// In-memory cache for highlighted line tokens keyed by themeMode:langId:lineContent
const lineTokenCache = new Map<string, HighlightedToken[]>();
const MAX_CACHE_SIZE = 8000;

/**
 * Tokenizes a single code line synchronously if cached, or returns null.
 */
export function getCachedLineTokens(
  lineContent: string,
  langId: string | null,
  themeMode: 'dark' | 'light' = 'dark'
): HighlightedToken[] | null {
  if (!langId) return null;
  const cacheKey = `${themeMode}:${langId}:${lineContent}`;
  return lineTokenCache.get(cacheKey) || null;
}

/**
 * Tokenizes an array of code lines using Shiki, with in-memory caching for both dark and light modes.
 * Falls back gracefully to plain uncolored tokens on any error or unsupported language.
 */
export async function highlightLines(
  lines: string[],
  langId: SupportedLang | null,
  themeMode: 'dark' | 'light' = 'dark'
): Promise<HighlightedToken[][]> {
  const fallbackColor = themeMode === 'light' ? '#1f2328' : '#e6edf3';

  if (!langId || lines.length === 0) {
    return lines.map((line) => [{ content: line, color: fallbackColor }]);
  }

  // Check if all lines are already cached for this themeMode
  const uncachedIndices: number[] = [];
  const result: (HighlightedToken[] | null)[] = lines.map((line, idx) => {
    const cached = lineTokenCache.get(`${themeMode}:${langId}:${line}`);
    if (cached) return cached;
    uncachedIndices.push(idx);
    return null;
  });

  if (uncachedIndices.length === 0) {
    return result as HighlightedToken[][];
  }

  try {
    const highlighter = await getHighlighter();
    const fullCode = lines.join('\n');
    const shikiTheme = themeMode === 'light' ? THEME_LIGHT : THEME_DARK;
    const { tokens } = highlighter.codeToTokens(fullCode, {
      lang: langId,
      theme: shikiTheme,
    });

    return tokens.map((lineTokens: ThemedToken[], idx: number) => {
      const converted: HighlightedToken[] = lineTokens.map((t) => ({
        content: t.content,
        color: t.color,
        fontStyle: t.fontStyle,
      }));

      // Cache tokenized line
      const originalLine = lines[idx];
      if (originalLine !== undefined && lineTokenCache.size < MAX_CACHE_SIZE) {
        lineTokenCache.set(`${themeMode}:${langId}:${originalLine}`, converted);
      }

      return converted;
    });
  } catch (err) {
    // Graceful fallback to unstyled text
    return lines.map((line) => [{ content: line, color: fallbackColor }]);
  }
}
