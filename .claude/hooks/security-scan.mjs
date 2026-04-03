#!/usr/bin/env node
/**
 * security-scan.mjs — Security Anti-Pattern Detection [AUTO RULE-SEC-001 through RULE-SEC-002]
 *
 * Triggered: PreToolUse / Write + Edit
 * Hard blocks (exit 2) on CRITICAL security anti-patterns being introduced.
 * Injects additionalContext warnings for ADVISORY patterns.
 *
 * CRITICAL (exit 2):
 *   RULE-SEC-001 — Hardcoded secrets (API keys, passwords, tokens, private keys)
 *   RULE-SEC-002 — SQL injection via string concatenation with user input
 *   RULE-SEC-002 — eval() on non-literal values (potential code injection)
 *
 * ADVISORY (additionalContext):
 *   RULE-SEC-002 — innerHTML assignment (XSS risk)
 *   RULE-SEC-013 — Math.random() in security/token/password/crypto context
 */

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

// ---------------------------------------------------------------------------
// Pattern definitions
// ---------------------------------------------------------------------------

/**
 * CRITICAL patterns — hard block (exit 2).
 * Each entry: { id, rule, label, pattern, description, fix }
 */
const CRITICAL_PATTERNS = [
  {
    id: 'SEC-CRIT-001',
    rule: 'RULE-SEC-001',
    label: 'Hardcoded API key',
    // Matches: api_key = "abc123...", API_KEY: "sk-...", apiKey="...", etc.
    pattern: /(?:api[_\-]?key|apiKey)\s*[=:]\s*["'][A-Za-z0-9_\-\.]{8,}["']/i,
    description: 'An API key appears to be hardcoded in source code.',
    fix: 'Store the key in an environment variable (process.env.API_KEY) and add it to .env.example with a placeholder. Never commit real credentials.',
  },
  {
    id: 'SEC-CRIT-002',
    rule: 'RULE-SEC-001',
    label: 'Hardcoded password',
    // Matches: password = "secret", passwd: "abc123", pwd = "...", etc.
    // Excludes common test/placeholder values and hash function names
    pattern: /(?:^|[^a-zA-Z])(?:password|passwd|pwd)\s*[=:]\s*["'][^"']{4,}["']/im,
    description: 'A password value appears to be hardcoded in source code.',
    fix: 'Use an environment variable (process.env.DB_PASSWORD). In tests, use a clearly fake value like "test-password-not-real" and annotate with a comment.',
  },
  {
    id: 'SEC-CRIT-003',
    rule: 'RULE-SEC-001',
    label: 'Hardcoded secret/token',
    // Matches: secret = "...", SECRET: "...", auth_token = "...", jwt_secret = "...", etc.
    pattern: /(?:secret|auth[_\-]?token|jwt[_\-]?secret|access[_\-]?token|private[_\-]?key)\s*[=:]\s*["'][A-Za-z0-9_\-\.\/+]{8,}["']/i,
    description: 'A secret or token value appears to be hardcoded in source code.',
    fix: 'Move this value to an environment variable. Use a secret manager (AWS Secrets Manager, GCP Secret Manager, HashiCorp Vault) in production.',
  },
  {
    id: 'SEC-CRIT-004',
    rule: 'RULE-SEC-001',
    label: 'Hardcoded AWS access key',
    // AWS access keys always start with AKIA followed by 16 uppercase alphanumeric chars
    pattern: /AKIA[0-9A-Z]{16}/,
    description: 'An AWS access key ID is hardcoded in source code.',
    fix: 'Revoke this key immediately via AWS IAM console. Use IAM roles (for EC2/Lambda) or environment variables for local development. Never commit AWS credentials.',
  },
  {
    id: 'SEC-CRIT-005',
    rule: 'RULE-SEC-001',
    label: 'Hardcoded private key',
    // PEM-encoded private key header
    pattern: /-----BEGIN\s+(?:RSA\s+|EC\s+|OPENSSH\s+|DSA\s+)?PRIVATE\s+KEY-----/,
    description: 'A PEM private key is hardcoded in source code.',
    fix: 'Remove the private key from source code immediately. Store it in a secrets manager or as a secured environment variable. Rotate the key if it was ever committed to git history.',
  },
  {
    id: 'SEC-CRIT-006',
    rule: 'RULE-SEC-001',
    label: 'Hardcoded database credentials in connection string',
    // Matches postgres/mysql/mongodb/redis URLs with credentials embedded
    pattern: /(?:postgres|postgresql|mysql|mongodb|redis):\/\/[^:@\s"']{2,}:[^@\s"']{2,}@/i,
    description: 'A database connection string with embedded credentials is hardcoded.',
    fix: 'Use an environment variable for the full connection string (process.env.DATABASE_URL) or split into separate env vars per component (DB_USER, DB_PASS, DB_HOST).',
  },
  {
    id: 'SEC-CRIT-007a',
    rule: 'RULE-SEC-002',
    label: 'SQL injection via template literal interpolation',
    // Matches template literals containing SQL keywords with variable interpolation:
    //   `SELECT * FROM users WHERE id = ${userId}`
    // The SQL keyword must appear inside the backtick string before an interpolation slot.
    pattern: /`[^`]*(?:SELECT|INSERT|UPDATE|DELETE|WHERE|FROM)[^`]*\$\{(?!\s*['"`])[^}]+\}/i,
    description: 'A SQL query is built using a template literal with variable interpolation. If any interpolated value is user-controlled, this enables SQL injection.',
    fix: 'Use parameterized queries: db.query("SELECT * FROM users WHERE id = $1", [userId]). Or use an ORM query builder that handles escaping automatically.',
  },
  {
    id: 'SEC-CRIT-007b',
    rule: 'RULE-SEC-002',
    label: 'SQL injection via string concatenation',
    // Matches patterns where a SQL string literal is concatenated with a variable:
    //   "SELECT * FROM users WHERE id = " + userId
    //   'WHERE email = ' + req.body.email
    // Requires a closing quote/double-quote immediately followed by \s*+\s* and a non-literal token.
    pattern: /(?:"[^"]*(?:SELECT|INSERT|UPDATE|DELETE|WHERE|FROM)[^"]*"|'[^']*(?:SELECT|INSERT|UPDATE|DELETE|WHERE|FROM)[^']*')\s*\+\s*(?!['"`])\w/i,
    description: 'A SQL query is built by concatenating a string literal with a variable. If the variable is user-controlled, this enables SQL injection.',
    fix: 'Use parameterized queries: db.query("SELECT * FROM users WHERE id = $1", [userId]). Or use an ORM query builder that handles escaping automatically.',
  },
  {
    id: 'SEC-CRIT-008',
    rule: 'RULE-SEC-002',
    label: 'eval() call with non-literal argument',
    // eval( followed by anything that is not a plain string literal
    pattern: /\beval\s*\(\s*(?!['"`])[^)]/,
    description: 'eval() is called with a non-literal argument. If this argument derives from user input, it enables arbitrary code execution.',
    fix: 'Remove eval(). Use JSON.parse() for JSON data, or restructure the logic to avoid dynamic code evaluation. If dynamic dispatch is needed, use a lookup table (object map) instead.',
  },
];

/**
 * ADVISORY patterns — inject additionalContext warning (no block).
 */
const ADVISORY_PATTERNS = [
  {
    id: 'SEC-ADV-001',
    rule: 'RULE-SEC-002',
    label: 'innerHTML assignment (XSS risk)',
    // Matches .innerHTML = or .innerHTML+= patterns
    pattern: /\.innerHTML\s*[+]?=/,
    description: 'Direct innerHTML assignment can introduce XSS if the value contains user-controlled content.',
    fix: 'Use textContent for plain text, or sanitize the HTML with DOMPurify before assignment: element.innerHTML = DOMPurify.sanitize(userContent). For React: avoid dangerouslySetInnerHTML unless content is sanitized.',
  },
  {
    id: 'SEC-ADV-002',
    rule: 'RULE-SEC-013',
    label: 'Math.random() in security context',
    // Math.random() near security-sensitive identifiers (token, secret, password, crypto, salt, nonce, key)
    pattern: /Math\.random\(\)(?=[\s\S]{0,200}(?:token|secret|password|crypto|salt|nonce|key|session|auth))|(?:token|secret|password|crypto|salt|nonce|key|session|auth)(?=[\s\S]{0,200}Math\.random\(\))/i,
    multiline: true,
    description: 'Math.random() is not cryptographically secure and must not be used for tokens, passwords, salts, session IDs, or any security-sensitive value.',
    fix: 'Use crypto.randomBytes(32) (Node.js), crypto.getRandomValues() (browser), or crypto.randomUUID() for IDs. Example: const token = crypto.randomBytes(32).toString("hex");',
  },
];

// ---------------------------------------------------------------------------
// File classification helpers
// ---------------------------------------------------------------------------

/** Returns true if the file path looks like a test/spec/fixture file. */
function isTestFile(filePath) {
  return /\.(test|spec|fixture|mock|stub|fake)\.(ts|js|py|rb|go|java)$/i.test(filePath);
}

/** Returns true for file paths that should be scanned. */
function shouldScanFile(filePath) {
  if (!filePath) return false;

  // Skip binary / non-source extensions
  const SKIP_EXTENSIONS = [
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp',
    '.mp4', '.mp3', '.wav', '.pdf', '.zip', '.tar', '.gz',
    '.woff', '.woff2', '.ttf', '.eot',
    '.lock',      // package-lock.json, yarn.lock — dependency manifests, not source
    '.map',       // source maps
  ];
  const lower = filePath.toLowerCase();
  if (SKIP_EXTENSIONS.some((ext) => lower.endsWith(ext))) return false;

  // Skip .env files themselves — they ARE the right place for secrets
  if (/(?:^|\/)\.env(?:\.[a-z]+)?$/.test(filePath)) return false;

  // Skip changelog and README files
  if (/(?:CHANGELOG|HISTORY|README)\.(md|txt)$/i.test(filePath)) return false;

  return true;
}

// ---------------------------------------------------------------------------
// Content extraction
// ---------------------------------------------------------------------------

/**
 * Extract the file content string from the tool input.
 * Works for both Write (has `content`) and Edit (has `new_string`).
 */
function extractContent(toolName, toolInput) {
  if (toolName === 'Write') return toolInput?.content || '';
  if (toolName === 'Edit') return toolInput?.new_string || '';
  return '';
}

// ---------------------------------------------------------------------------
// Matching helpers
// ---------------------------------------------------------------------------

/**
 * Find the first matching line and line number for a pattern in content.
 * Returns { lineNumber, lineText } or null.
 */
function findMatch(pattern, content, multiline = false) {
  if (multiline) {
    const m = pattern.exec(content);
    if (!m) return null;
    const lineNumber = content.slice(0, m.index).split('\n').length;
    return { lineNumber, lineText: content.split('\n')[lineNumber - 1].trim() };
  }
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    pattern.lastIndex = 0;
    if (pattern.test(lines[i])) {
      return { lineNumber: i + 1, lineText: lines[i].trim() };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const raw = await readStdin();

  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    // Malformed JSON — pass through unchanged, never block
    process.stdout.write(raw || '{}');
    return;
  }

  const toolName = input.tool_name;

  // Only inspect Write and Edit operations
  if (toolName !== 'Write' && toolName !== 'Edit') {
    process.stdout.write(JSON.stringify(input));
    return;
  }

  const filePath = input.tool_input?.file_path || '';
  const content = extractContent(toolName, input.tool_input);

  // Skip files that don't need scanning
  if (!shouldScanFile(filePath)) {
    process.stdout.write(JSON.stringify(input));
    return;
  }

  // No content to scan
  if (!content) {
    process.stdout.write(JSON.stringify(input));
    return;
  }

  // --- Check CRITICAL patterns (collect ALL before blocking) ---
  // Skip heuristic credential patterns in test files (test files have fake creds)
  const isTest = isTestFile(filePath);
  const HEURISTIC_IDS = new Set(['SEC-CRIT-001', 'SEC-CRIT-002', 'SEC-CRIT-003']);
  const criticalHits = [];
  for (const def of CRITICAL_PATTERNS) {
    if (isTest && HEURISTIC_IDS.has(def.id)) continue;
    def.pattern.lastIndex = 0;
    const match = findMatch(def.pattern, content, def.multiline);
    if (match) criticalHits.push({ def, match });
  }

  if (criticalHits.length > 0) {
    const findings = criticalHits
      .map(({ def, match }) =>
        [
          `🚫 ${def.id} [${def.rule}] — ${def.label}`,
          `   File:  ${filePath}:${match.lineNumber}`,
          `   Found: ${match.lineText.slice(0, 120)}`,
          `   Risk:  ${def.description}`,
          `   Fix:   ${def.fix}`,
        ].join('\n')
      )
      .join('\n\n');

    const err = [
      `SECURITY BLOCKED — ${criticalHits.length} critical finding(s):`,
      ``,
      findings,
      ``,
      `Resolve ALL issues above and retry.`,
    ].join('\n');

    process.stderr.write(err + '\n');
    process.exit(2);
  }

  // --- Check ADVISORY patterns ---
  const advisoryHits = [];
  for (const def of ADVISORY_PATTERNS) {
    def.pattern.lastIndex = 0;
    const match = findMatch(def.pattern, content, def.multiline);
    if (match) {
      advisoryHits.push({ def, match });
    }
  }

  if (advisoryHits.length > 0) {
    const warnings = advisoryHits
      .map(({ def, match }) =>
        [
          `⚠️  ${def.id} [${def.rule}] — ${def.label}`,
          `   File: ${filePath}:${match.lineNumber}`,
          `   ${def.description}`,
          `   Fix: ${def.fix}`,
        ].join('\n')
      )
      .join('\n\n');

    const advisory = [
      `SECURITY ADVISORY — review before proceeding:`,
      ``,
      warnings,
      ``,
      `These are warnings, not blocks. Verify that the flagged usage is safe in context.`,
    ].join('\n');

    // Inject as additionalContext so the model sees the warning without blocking
    const existing = input.tool_input?.additionalContext || '';
    input = {
      ...input,
      tool_input: {
        ...input.tool_input,
        additionalContext: existing
          ? `${existing}\n\n${advisory}`
          : advisory,
      },
    };
  }

  process.stdout.write(JSON.stringify(input));
}

main().catch((err) => {
  // Hook errors must never block the user — log and exit cleanly
  process.stderr.write(`[security-scan] Hook error: ${err.message}\n`);
  process.exit(0);
});
