import { Finding, ParsedDiff, DiffLine } from './types';

export function calculateShannonEntropy(str: string): number {
  if (!str || str.length === 0) return 0;
  const frequencies: Record<string, number> = {};
  for (const char of str) {
    frequencies[char] = (frequencies[char] || 0) + 1;
  }
  let entropy = 0;
  const len = str.length;
  for (const char in frequencies) {
    const p = frequencies[char] / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

interface StaticRule {
  id: string;
  name: string;
  category: 'SECURITY' | 'BUG' | 'PERFORMANCE' | 'CODE_STYLE';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  cwe_id: string;
  owasp_category: string;
  pattern: RegExp;
  minEntropy?: number;
  message: (match: RegExpMatchArray, lineContent: string) => {
    title: string;
    description: string;
    suggestion_diff?: string;
  };
}

const STATIC_SECURITY_RULES: StaticRule[] = [
  {
    id: 'SEC-AWS-KEY',
    name: 'Hardcoded AWS Access Key',
    category: 'SECURITY',
    severity: 'CRITICAL',
    cwe_id: 'CWE-798',
    owasp_category: 'A07:2021-Identification and Authentication Failures',
    pattern: /\b(AKIA[0-9A-Z]{16})\b/,
    message: (match, line) => ({
      title: 'Hardcoded AWS Access Key ID Detected',
      description: `Identified hardcoded AWS credential: '${match[1].slice(0, 8)}...'. Hardcoding credentials in source code exposes production infrastructure to credential harvesting.`,
      suggestion_diff: `- ${line.trim()}\n+ const awsKey = process.env.AWS_ACCESS_KEY_ID;`,
    }),
  },
  {
    id: 'SEC-JWT-TOKEN',
    name: 'Hardcoded JWT Token',
    category: 'SECURITY',
    severity: 'CRITICAL',
    cwe_id: 'CWE-798',
    owasp_category: 'A07:2021-Identification and Authentication Failures',
    pattern: /\b(eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})\b/,
    message: (_match, line) => ({
      title: 'Hardcoded JWT Secret or Signed Token',
      description: 'Found a raw JSON Web Token committed in source code. This grants unauthorized session or authorization privileges if committed to version control.',
      suggestion_diff: `- ${line.trim()}\n+ const token = process.env.AUTH_JWT_TOKEN;`,
    }),
  },
  {
    id: 'SEC-PRIVATE-KEY',
    name: 'Unencrypted Private Key Block',
    category: 'SECURITY',
    severity: 'CRITICAL',
    cwe_id: 'CWE-312',
    owasp_category: 'A02:2021-Cryptographic Failures',
    pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/,
    message: (_match, line) => ({
      title: 'Committed Asymmetric Private Key',
      description: 'Detected unencrypted private key header. Private cryptographic keys must never be stored in repository files.',
      suggestion_diff: `- ${line.trim()}\n+ const privateKey = process.env.PRIVATE_KEY_PEM;`,
    }),
  },
  {
    id: 'SEC-SQL-CONCAT',
    name: 'Raw SQL Query String Concatenation',
    category: 'SECURITY',
    severity: 'CRITICAL',
    cwe_id: 'CWE-89',
    owasp_category: 'A03:2021-Injection',
    pattern: /(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE).*?(?:\+\s*(?:req|input|id|user|query|param|name)|\$\{\s*(?:req|input|id|user|query|param|name))/i,
    message: (_match, line) => ({
      title: 'SQL Injection via String Concatenation',
      description: 'SQL queries constructed via dynamic string concatenation or template literals bypass parameterization and allow attackers to execute arbitrary SQL commands.',
      suggestion_diff: `- ${line.trim()}\n+ const query = 'SELECT * FROM users WHERE id = $1'; // Use parameterized query values: [userId]`,
    }),
  },
  {
    id: 'SEC-EVAL-CALL',
    name: 'Dynamic Code Execution via eval()',
    category: 'SECURITY',
    severity: 'CRITICAL',
    cwe_id: 'CWE-94',
    owasp_category: 'A03:2021-Injection',
    pattern: /\beval\s*\(|\bnew\s+Function\s*\(.*userInput/i,
    message: (_match, line) => ({
      title: 'Remote Code Execution Risk (eval)',
      description: 'Use of eval() or dynamic Function constructors can execute malicious payloads within the current runtime scope.',
      suggestion_diff: `- ${line.trim()}\n+ // Refactor to use safe JSON.parse or a schema-validated parser`,
    }),
  },
  {
    id: 'SEC-COMMAND-INJECTION',
    name: 'Shell Command Execution without Sanitization',
    category: 'SECURITY',
    severity: 'CRITICAL',
    cwe_id: 'CWE-78',
    owasp_category: 'A03:2021-Injection',
    pattern: /(?:child_process\.(?:exec|execSync)|os\.system|subprocess\.Popen\(.*?shell\s*=\s*True).*?(?:\+|\$|\%)/i,
    message: (_match, line) => ({
      title: 'OS Command Injection',
      description: 'Executing shell commands with concatenated arguments can allow arbitrary host system command execution.',
      suggestion_diff: `- ${line.trim()}\n+ execFile(cmd, [args], options, callback); // Use execFile with sanitized arguments array`,
    }),
  },
  {
    id: 'SEC-HARDCODED-SECRET-LITERAL',
    name: 'Suspicious High-Entropy Secret Assignment',
    category: 'SECURITY',
    severity: 'HIGH',
    cwe_id: 'CWE-798',
    owasp_category: 'A07:2021-Identification and Authentication Failures',
    pattern: /(?:api[_-]?key|secret|password|jwt[_-]?secret|private[_-]?token)\s*[:=]\s*['"]([a-zA-Z0-9_\-.~+=]{16,})['"]/i,
    minEntropy: 3.8,
    message: (match, line) => ({
      title: 'Hardcoded High-Entropy Secret Literal',
      description: `Discovered variable assignment containing high-entropy token literal '${match[1].slice(0, 6)}...'. Move sensitive values to environment secrets.`,
      suggestion_diff: `- ${line.trim()}\n+ const secret = process.env.APP_SECRET;`,
    }),
  },
  {
    id: 'SEC-WEAK-HASH',
    name: 'Weak Cryptographic Hash (MD5 / SHA1)',
    category: 'SECURITY',
    severity: 'MEDIUM',
    cwe_id: 'CWE-328',
    owasp_category: 'A02:2021-Cryptographic Failures',
    pattern: /(?:crypto\.createHash\(['"](?:md5|sha1)['"]\)|hashlib\.(?:md5|sha1)\()/i,
    message: (_match, line) => ({
      title: 'Use of Broken Cryptographic Hash Function',
      description: 'MD5 and SHA-1 have known collision vulnerabilities. Use SHA-256 or SHA-512, or bcrypt/argon2 for passwords.',
      suggestion_diff: `- ${line.trim()}\n+ crypto.createHash('sha256');`,
    }),
  },
  {
    id: 'SEC-SENSITIVE-LOG',
    name: 'Potential Sensitive Data Leak in Logs',
    category: 'SECURITY',
    severity: 'MEDIUM',
    cwe_id: 'CWE-532',
    owasp_category: 'A09:2021-Security Logging and Monitoring Failures',
    pattern: /(?:console\.log|logger\.(?:info|debug|error))\s*\(.*?(?:password|token|secret|credit_card|auth_header)/i,
    message: (_match, line) => ({
      title: 'Sensitive Credential Exposed to Log Stream',
      description: 'Logging credentials or auth headers can write plaintext authentication material into log storage, telemetry, or third-party monitoring.',
      suggestion_diff: `- ${line.trim()}\n+ logger.info('User authenticated successfully', { userId });`,
    }),
  },
  {
    id: 'PERF-UNBOUNDED-CONCURRENCY',
    name: 'Unbounded Concurrency / Goroutine Leak Risk',
    category: 'PERFORMANCE',
    severity: 'HIGH',
    cwe_id: 'CWE-400',
    owasp_category: 'A04:2021-Insecure Design',
    pattern: /(?:go\s+func\s*\(|new\s+Worker\s*\(|Promise\.all\s*\(\s*items\.map).*?(?:without\s+limit|unbounded)/i,
    message: (_match, line) => ({
      title: 'Unbounded Asynchronous Concurrency',
      description: 'Spawning unconstrained goroutines or Promise.all batches over unbound inputs can cause worker thread pool exhaustion and denial of service.',
      suggestion_diff: `- ${line.trim()}\n+ // Introduce a bounded worker pool or semaphore (e.g. p-limit or buffered channel)`,
    }),
  },
];

/**
 * Runs deterministic security and quality static heuristics over added lines in diff.
 * Zero LLM tokens consumed.
 */
export function runStaticAnalysis(parsedDiff: ParsedDiff): Finding[] {
  const findings: Finding[] = [];
  let counter = 1;

  for (const file of parsedDiff.files) {
    if (file.isDeleted) continue;

    for (const hunk of file.hunks) {
      for (const line of hunk.lines) {
        // We focus static analysis primarily on ADDED lines in the patch
        if (line.type !== 'ADDED') continue;
        const lineContent = line.content;
        const lineNum = line.newLineNumber ?? hunk.newStart;

        const isCommentLine = /^\s*(?:\/\/|\*|\/\*|#|--|<!--)/.test(lineContent);

        for (const rule of STATIC_SECURITY_RULES) {
          // Code-execution, injection, concurrency, and logging rules should not fire on pure comments
          if (isCommentLine && rule.id !== 'SEC-AWS-KEY' && rule.id !== 'SEC-JWT-TOKEN' && rule.id !== 'SEC-PRIVATE-KEY') {
            continue;
          }

          // Safe operational logging: skip log statements that only contain a single static string literal with no variables
          if (rule.id === 'SEC-SENSITIVE-LOG') {
            const isPureStaticLogString = /^(?:console\.log|logger\.(?:info|debug|error|warn))\s*\(\s*['"][^'"]*['"]\s*\);?$/i.test(lineContent.trim());
            if (isPureStaticLogString) {
              continue;
            }
          }

          const match = lineContent.match(rule.pattern);
          if (match) {
            // Check entropy threshold if rule requires it
            if (rule.minEntropy !== undefined && match[1]) {
              const entropy = calculateShannonEntropy(match[1]);
              if (entropy < rule.minEntropy) {
                continue;
              }
            }

            const details = rule.message(match, lineContent);
            findings.push({
              id: `static-${counter++}-${rule.id.toLowerCase()}`,
              file_path: file.newPath,
              line_number: lineNum,
              hunk_header: hunk.header,
              category: rule.category,
              severity: rule.severity,
              cwe_id: rule.cwe_id,
              owasp_category: rule.owasp_category,
              title: details.title,
              description: details.description,
              suggestion_diff: details.suggestion_diff,
              confidence: 0.95,
              source: 'STATIC_ANALYZER',
              code_snippet: lineContent.trim(),
            });
          }
        }
      }
    }
  }

  return findings;
}
