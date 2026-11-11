import { GoogleGenAI, Type } from '@google/genai';
import { Finding, ParsedDiff, Category, Severity } from '../engine/types';
import { packDiffForLLM } from '../engine/chunker';

export interface GeminiReviewResult {
  findings: Finding[];
  aiDurationMs: number;
  status: 'ACTIVE' | 'SKIPPED_NO_KEY' | 'ERROR';
  errorDetail?: string;
}

export async function runGeminiReview(
  parsedDiff: ParsedDiff,
  explicitApiKey?: string
): Promise<GeminiReviewResult> {
  const startTime = Date.now();
  const apiKey = explicitApiKey !== undefined ? explicitApiKey : process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === '' || apiKey === 'MY_GEMINI_API_KEY') {
    return {
      findings: [],
      aiDurationMs: 0,
      status: 'SKIPPED_NO_KEY',
      errorDetail: 'GEMINI_API_KEY not configured. Deterministic static security analysis completed review.',
    };
  }

  const { packedPrompt } = packDiffForLLM(parsedDiff);

  const systemInstruction = `You are a Principal Security Engineer and Staff Code Reviewer at a top-tier tech company.
Analyze the provided unified Git diff.

Crucial rules:
1. ONLY report findings for newly added (+) code lines.
2. The 'line_number' MUST be the exact target line number indicated in the diff line annotations [L<number>]. Do not guess or hallucinate.
3. Classify severity strictly:
   - CRITICAL: Remote code execution, SQL injection, hardcoded secrets, authentication bypass, critical data loss.
   - HIGH: Memory leaks, unhandled exceptions in core paths, SSRF, authorization flaws, race conditions.
   - MEDIUM: Broken error handling, missing timeouts, deprecations, potential logic bugs.
   - LOW: Code style, minor inefficiencies, missing documentation on critical contracts.
4. For 'category', choose one of: 'SECURITY', 'BUG', 'PERFORMANCE', 'CODE_STYLE'.
5. Include relevant 'cwe_id' (e.g. 'CWE-89', 'CWE-798', 'CWE-400') and 'owasp_category' whenever applicable.
6. Provide a concise 'suggestion_diff' showing a unified replacement snippet (- old \\n + new).
7. If the code diff is clean and safe, return an empty findings array.`;

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const timeoutPromise = new Promise<GeminiReviewResult>((_, reject) =>
      setTimeout(() => reject(new Error('Gemini API timeout after 10000ms')), 10000)
    );

    const callPromise = (async (): Promise<GeminiReviewResult> => {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: packedPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              findings: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    file_path: { type: Type.STRING },
                    line_number: { type: Type.INTEGER },
                    category: { type: Type.STRING },
                    severity: { type: Type.STRING },
                    cwe_id: { type: Type.STRING },
                    owasp_category: { type: Type.STRING },
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    suggestion_diff: { type: Type.STRING },
                    confidence: { type: Type.NUMBER },
                  },
                  required: [
                    'file_path',
                    'line_number',
                    'category',
                    'severity',
                    'title',
                    'description',
                    'confidence',
                  ],
                },
              },
            },
            required: ['findings'],
          },
        },
      });

      const aiDurationMs = Date.now() - startTime;
      const jsonStr = (response.text ?? '{}').trim();
      let parsed: any = {};
      try {
        parsed = JSON.parse(jsonStr);
      } catch (jsonErr: any) {
        return {
          findings: [],
          aiDurationMs,
          status: 'ERROR',
          errorDetail: `Failed to parse structured model response: ${jsonErr.message}`,
        };
      }

      const findings = validateAndNormalizeAiFindings(parsed?.findings);
      return { findings, aiDurationMs, status: 'ACTIVE' };
    })();

    return await Promise.race([callPromise, timeoutPromise]);
  } catch (error: any) {
    const errorMsg = error?.message || 'Gemini review error';
    return {
      findings: [],
      aiDurationMs: Date.now() - startTime,
      status: 'ERROR',
      errorDetail: errorMsg.includes('timeout') ? 'Gemini API call timed out after 10s' : 'Gemini API temporarily unavailable',
    };
  }
}

export function validateAndNormalizeAiFindings(rawList: any): Finding[] {
  if (!Array.isArray(rawList)) return [];

  const validCategories: Record<string, Category> = {
    SECURITY: 'SECURITY',
    BUG: 'BUG',
    PERFORMANCE: 'PERFORMANCE',
    CODE_STYLE: 'CODE_STYLE',
  };
  const validSeverities: Record<string, Severity> = {
    CRITICAL: 'CRITICAL',
    HIGH: 'HIGH',
    MEDIUM: 'MEDIUM',
    LOW: 'LOW',
    INFO: 'INFO',
  };

  const results: Finding[] = [];
  for (let idx = 0; idx < rawList.length; idx++) {
    const f = rawList[idx];
    if (!f || typeof f !== 'object') continue;

    const filePath = typeof f.file_path === 'string' ? f.file_path.trim() : '';
    if (!filePath) continue;

    const lineNum = Math.floor(Number(f.line_number));
    if (!Number.isFinite(lineNum) || lineNum < 1) continue;

    const rawCat = typeof f.category === 'string' ? f.category.toUpperCase().trim() : '';
    const category = validCategories[rawCat] || 'BUG';

    const rawSev = typeof f.severity === 'string' ? f.severity.toUpperCase().trim() : '';
    const severity = validSeverities[rawSev] || 'MEDIUM';

    const confidence = typeof f.confidence === 'number' && Number.isFinite(f.confidence)
      ? Math.min(1.0, Math.max(0.1, f.confidence))
      : 0.85;

    results.push({
      id: `ai-${idx + 1}-${Date.now().toString(36)}`,
      file_path: filePath,
      line_number: lineNum,
      category,
      severity,
      cwe_id: typeof f.cwe_id === 'string' && f.cwe_id.trim() ? f.cwe_id.trim() : undefined,
      owasp_category: typeof f.owasp_category === 'string' && f.owasp_category.trim() ? f.owasp_category.trim() : undefined,
      title: typeof f.title === 'string' && f.title.trim() ? f.title.trim() : 'Code defect detected',
      description: typeof f.description === 'string' ? f.description : '',
      suggestion_diff: typeof f.suggestion_diff === 'string' ? f.suggestion_diff : undefined,
      confidence,
      source: 'GEMINI_ENGINE',
    });
  }

  return results;
}
