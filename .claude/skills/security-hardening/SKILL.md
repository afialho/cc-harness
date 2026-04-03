---
name: security-hardening
description: Proactive security hardening: OWASP Top 10 checklist, security headers, secrets management, dependency scanning, rate limiting, and encryption guidance.
disable-model-invocation: true
argument-hint: [scope: e.g. "auth endpoints" or "full app"]
---

# /security-hardening — Proactive Security Audit

> **Purpose:** Prevent security vulnerabilities upfront — not discover them after deployment.
> Systematic OWASP Top 10 coverage, secrets hygiene, header hardening, dependency scanning,
> and a structured remediation report with deploy-gate severity tiers.

---

## When to invoke

| Context | Recommended scope |
|---------|-------------------|
| Before deploying to production | `full app` |
| After implementing auth | `auth endpoints` |
| After adding new API endpoints | `api layer` |
| After adding a third-party integration | `integrations` + `dependency scan` |
| After adding file upload / user data handling | `data handling` |
| Routine sprint security gate | `full app` |

---

## Phase 1 — Scope Analysis

> **Emit:** `▶ [1/7] Scope Analysis`

Launch a **code-explorer agent** to map what exists:

```
Agent: scope-mapper
Task: Map security-relevant surface area of the codebase.
Read:
  - All route/controller files (Express routes, FastAPI routers, Next.js API routes, etc.)
  - All authentication/session files
  - All files that handle file uploads, user input, or external HTTP calls
  - package.json / requirements.txt / go.mod / Gemfile (dependency manifests)
  - .env.example (to understand what secrets are expected)
  - docker-compose.yml and Dockerfile (for infrastructure config)
Output:
  SCOPE_MAP:
    endpoints: [list with HTTP method + path + auth required y/n + handles PII y/n]
    auth_files: [list]
    data_sensitivity:
      PII: [files/tables that handle personally identifiable information]
      financial: [files/tables that handle payment or financial data]
      credentials: [files that handle passwords, tokens, API keys]
      public: [endpoints/components with no auth requirement]
    external_calls: [list of URLs/services called outbound]
    dependency_manifests: [list of found manifests]
    infra_files: [Dockerfile, compose, nginx config if present]
```

Emit summary:
```
Scope: [description of what was found]
Surface area: [N] endpoints ([N] authenticated, [N] public), [N] data sensitivity tiers
Proceeding to OWASP audit.
```

---

## Phase 2 — OWASP Top 10 Audit

> **Emit:** `▶ [2/7] OWASP Top 10 Audit`

Launch **5 parallel agents** (Wave A), then **5 more** (Wave B) for the remaining categories.

### Wave A (parallel — A01 through A05)

#### Agent: owasp-a01 — Broken Access Control

```
Role: Access control auditor (OWASP A01).
Context: SCOPE_MAP from Phase 1.
Read: all route handlers, middleware, and auth guards.

Check:
  □ Every non-public endpoint has authentication middleware applied
  □ Authorization checks verify ownership — not just "is logged in" but "can THIS user access THIS resource"
  □ No IDOR: resource IDs (URL params, body) validated against authenticated user's ownership before use
  □ Admin endpoints have role checks beyond simple auth
  □ CORS policy is explicit — no wildcard origin (*) in production
  □ Directory listing disabled (no autoindex in nginx, no static dir listing)
  □ JWT audience and issuer validated (not just signature)
  □ Privilege escalation: user cannot promote themselves to admin via API

Vulnerable example (Node.js):
  // INSECURE — no ownership check
  app.get('/api/orders/:id', auth, async (req, res) => {
    const order = await Order.findById(req.params.id);
    res.json(order);
  });

Fixed example:
  app.get('/api/orders/:id', auth, async (req, res) => {
    const order = await Order.findOne({ _id: req.params.id, userId: req.user.id });
    if (!order) return res.status(404).json({ error: 'Not found' });
    res.json(order);
  });

Verification tool: manual code review + grep for routes missing ownership checks

Output: OWASP_A01 findings with CRITICAL|HIGH|MEDIUM|LOW + file:line
```

#### Agent: owasp-a02 — Cryptographic Failures

```
Role: Cryptography auditor (OWASP A02).
Context: SCOPE_MAP from Phase 1.
Read: auth files, database models, config files, any file handling sensitive data.

Check:
  □ Passwords hashed with bcrypt/argon2/scrypt — NEVER MD5, SHA1, SHA256 alone, or plain text
  □ Sensitive data (SSN, credit card, health data) encrypted at rest with AES-256-GCM or equivalent
  □ HTTPS enforced: no HTTP fallback in production; HSTS header present
  □ TLS version: TLS 1.2 minimum, TLS 1.3 preferred; SSLv3/TLS 1.0/1.1 disabled
  □ Secrets in environment variables, never in source code or database in plaintext
  □ JWT signed with RS256 (asymmetric) for production or HS256 with secret ≥ 256 bits
  □ No weak or predictable session IDs (must use cryptographically secure random)
  □ Sensitive data not logged (no password, token, or PII in log output)
  □ Database connections use TLS (ssl=true in connection string)
  □ Backups encrypted

Vulnerable example (Python):
  import hashlib
  password_hash = hashlib.md5(password.encode()).hexdigest()  # INSECURE

Fixed example:
  from passlib.context import CryptContext
  pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
  password_hash = pwd_context.hash(password)

Verification tool: grep for md5|sha1|sha256 in auth context; check bcrypt rounds ≥ 12

Output: OWASP_A02 findings with CRITICAL|HIGH|MEDIUM|LOW + file:line
```

#### Agent: owasp-a03 — Injection

```
Role: Injection vulnerability auditor (OWASP A03).
Context: SCOPE_MAP from Phase 1.
Read: all database query files, command execution code, template rendering code.

Categories:
  SQL Injection:
    □ No string concatenation in SQL queries with user input
    □ Parameterized queries or ORM query builders used everywhere
    □ Stored procedures use parameterized input

  NoSQL Injection (MongoDB/Redis):
    □ User input not passed directly as query operators ($where, $regex, etc.)
    □ Input validated/sanitized before use in NoSQL queries

  Command Injection:
    □ No shell exec with user input (exec, spawn, system, subprocess.call)
    □ If shell exec is necessary: allowlist validation + no shell: true

  LDAP Injection:
    □ LDAP queries use parameterized APIs, not string construction

  Template Injection (SSTI):
    □ User input never passed to template engine render function directly
    □ Sandboxed template environments for user-controlled templates

  XXE (XML External Entities):
    □ XML parsers configured to disable external entities and DTD processing

Vulnerable example (Node.js SQL):
  const query = "SELECT * FROM users WHERE email = '" + email + "'";
  db.query(query);

Fixed example:
  const query = "SELECT * FROM users WHERE email = $1";
  db.query(query, [email]);

Verification tool: grep for raw string concatenation in query context; use sqlmap for dynamic testing

Output: OWASP_A03 findings with CRITICAL|HIGH|MEDIUM|LOW + file:line
```

#### Agent: owasp-a04 — Insecure Design

```
Role: Design threat model auditor (OWASP A04).
Context: SCOPE_MAP from Phase 1.
Read: all API endpoint handlers, business logic in application layer.

Check:
  □ Abuse cases considered for each endpoint (what happens if attacker calls this 1000x/sec?)
  □ Rate limiting on auth endpoints (brute force protection)
  □ Account enumeration prevented (login error: "invalid credentials" not "user not found")
  □ Password reset flow: token-based with expiry, not security questions
  □ Email verification before account activation
  □ Multi-step sensitive operations have server-side state, not client-side trust
  □ Business logic limits enforced server-side (max order quantity, max transfer amount)
  □ Anti-automation: CAPTCHA or proof-of-work on registration/contact forms
  □ Sensitive workflows (password change, email change) require re-authentication
  □ Audit trail: sensitive operations logged with user, timestamp, IP

Threat model prompt for each endpoint:
  - Who calls this?
  - What's the worst case if abused?
  - Is the worst case handled?

Output: OWASP_A04 findings with HIGH|MEDIUM|LOW + specific endpoint + threat description
```

#### Agent: owasp-a05 — Security Misconfiguration

```
Role: Configuration security auditor (OWASP A05).
Context: SCOPE_MAP from Phase 1.
Read: server config files, Docker/compose files, .env.example, framework config.

Check:
  □ Debug mode disabled in production (NODE_ENV=production, DEBUG=false, FLASK_DEBUG=0)
  □ Default credentials changed or disabled (admin/admin, postgres/postgres, root/root)
  □ Error responses don't expose stack traces, file paths, or DB schema in production
  □ Verbose error messages only in development (controlled by environment)
  □ Unnecessary HTTP methods disabled (TRACE, OPTIONS if not used by CORS)
  □ Server version headers suppressed (Server: header, X-Powered-By removed)
  □ Directory listing disabled
  □ Unused features/endpoints/services disabled or removed
  □ Security patches up to date (checked in Phase 6)
  □ Docker: containers not run as root; no --privileged flag
  □ Docker: no sensitive environment variables in Dockerfile (use runtime env injection)
  □ Cloud storage: S3/GCS buckets not public unless intentionally CDN
  □ Database: not exposed on public network; firewall rules applied

Vulnerable example (Express):
  // INSECURE — exposes internals
  app.use((err, req, res, next) => {
    res.status(500).json({ error: err.stack });
  });

Fixed example:
  app.use((err, req, res, next) => {
    logger.error(err);
    const message = process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message;
    res.status(err.statusCode || 500).json({ error: message });
  });

Output: OWASP_A05 findings with CRITICAL|HIGH|MEDIUM|LOW + file:line
```

---

### Wave B (parallel — A06 through A10)

#### Agent: owasp-a06 — Vulnerable Components

```
Role: Dependency vulnerability auditor (OWASP A06).
Context: dependency_manifests from SCOPE_MAP.

Actions per detected stack:
  Node.js (package.json present):
    → Run: npm audit --json
    → Parse: CRITICAL and HIGH severity advisories
    → Check: are CRITICAL deps directly used or transitive?

  Python (requirements.txt or Pipfile present):
    → Run: pip-audit --format json (install if needed: pip install pip-audit)
    → Parse: vulnerabilities by severity

  Container images (Dockerfile present):
    → Run: trivy image [image-name] --severity CRITICAL,HIGH --format json
    → Parse: OS-level and application-level vulnerabilities

  Java (pom.xml or build.gradle present):
    → Run: mvn dependency-check:check or gradle dependencyCheckAnalyze

  Go (go.mod present):
    → Run: govulncheck ./...

  Ruby (Gemfile present):
    → Run: bundle audit

Check beyond tool output:
  □ Dependencies pinned to exact versions in production lock files
  □ Lock file committed to version control
  □ No packages abandoned for > 2 years with known CVEs
  □ No packages with npm namespace squatting risk (typosquatting)

Triage guide:
  CRITICAL: RCE, authentication bypass, data exfiltration — block deploy
  HIGH: Privilege escalation, significant data exposure — fix this sprint
  MEDIUM: Limited impact, requires chaining — next sprint
  LOW: Theoretical, no known exploit — track in backlog

Output: OWASP_A06 findings per dependency with CVE ID + severity + fix version
```

#### Agent: owasp-a07 — Authentication Failures

```
Role: Authentication implementation auditor (OWASP A07).
Context: SCOPE_MAP from Phase 1.
Read: auth files, session management, JWT handling code.

Check:
  □ Password policy: minimum 12 chars, complexity not required (length > complexity per NIST 800-63)
  □ Breached password check: compare against known breached passwords on registration
  □ Account lockout: after N failed attempts (5-10), temporary lockout with exponential backoff
  □ MFA: supported (TOTP/WebAuthn) for sensitive operations at minimum
  □ Session tokens: cryptographically random, ≥ 128 bits of entropy
  □ Session invalidation: logout destroys server-side session, not just clears cookie
  □ Session expiry: idle timeout + absolute timeout enforced server-side
  □ JWT: short expiry (≤ 15 min for access tokens), refresh token rotation
  □ JWT: algorithm explicitly set (no "alg": "none" vulnerability)
  □ JWT: stored in httpOnly cookie or memory — never localStorage (XSS risk)
  □ Concurrent session management: optional (flag suspicious multiple sessions)
  □ Password reset: tokens single-use, expire in ≤ 1 hour, invalidated after use
  □ Remember me: long-lived tokens stored server-side and rotated on use

Vulnerable example (JWT stored in localStorage):
  // INSECURE — localStorage accessible by XSS
  localStorage.setItem('token', jwt);

Fixed example:
  // Secure — httpOnly cookie, not accessible by JS
  res.cookie('token', jwt, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000
  });

Output: OWASP_A07 findings with CRITICAL|HIGH|MEDIUM|LOW + file:line
```

#### Agent: owasp-a08 — Software/Data Integrity

```
Role: Supply chain and integrity auditor (OWASP A08).
Context: SCOPE_MAP + repository structure.
Read: CI/CD config files (.github/workflows/, .gitlab-ci.yml, Jenkinsfile), package.json scripts.

Check:
  □ CI/CD pipelines don't use unpinned third-party actions (use @sha not @main)
  □ npm scripts don't execute arbitrary code from unpinned sources
  □ Serialization: user-controlled data not deserialized without type validation
  □ Content integrity: CDN assets use SRI (Subresource Integrity) hashes
  □ Build artifacts signed or checksummed
  □ No auto-update of dependencies without security review (dependabot PRs reviewed)
  □ SBOM (Software Bill of Materials) generated for compliance-sensitive projects
  □ Secrets in CI/CD stored as encrypted environment variables, not in workflow files
  □ Branch protection: main/production branches require PR + review before merge
  □ No force-push allowed on protected branches

Vulnerable example (GitHub Actions):
  # INSECURE — unpinned action, could be compromised
  - uses: actions/checkout@main

Fixed example:
  # Secure — pinned to specific commit SHA
  - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1

Output: OWASP_A08 findings with HIGH|MEDIUM|LOW + file:line
```

#### Agent: owasp-a09 — Logging/Monitoring Failures

```
Role: Logging and observability security auditor (OWASP A09).
Context: SCOPE_MAP from Phase 1.
Read: logging configuration, logger usage across codebase, monitoring config.

Check:
  □ Security events logged: login success/failure, password change, permission denied, account lockout
  □ Log format includes: timestamp (UTC), user ID, IP address, action, outcome
  □ No sensitive data in logs: passwords, tokens, credit card numbers, SSNs never logged
  □ Log level appropriate: errors + security events at ERROR/WARN; debug at DEBUG (not in prod)
  □ Logs shipped to centralized system (not only local files that can be deleted)
  □ Log retention policy: ≥ 90 days accessible, ≥ 1 year archived (compliance)
  □ Alerting configured: multiple failed logins, impossible travel, high error rates
  □ Correlation IDs: each request has a trace ID propagated through all log lines
  □ No stack traces in production API responses (logged server-side, not returned to client)
  □ Structured logging (JSON) for machine-parseability in SIEM

Vulnerable example:
  logger.info(`Login attempt: email=${email} password=${password}`);  // INSECURE

Fixed example:
  logger.info('Login attempt', { email, ip: req.ip, timestamp: new Date().toISOString() });
  // Never log password — log outcome instead:
  logger.warn('Failed login attempt', { email, ip: req.ip, reason: 'invalid_credentials' });

Output: OWASP_A09 findings with HIGH|MEDIUM|LOW + file:line
```

#### Agent: owasp-a10 — SSRF

```
Role: Server-Side Request Forgery auditor (OWASP A10).
Context: SCOPE_MAP (external_calls) from Phase 1.
Read: all files making outbound HTTP requests, webhook handlers, URL-accepting endpoints.

Check:
  □ User-supplied URLs validated against an allowlist before fetch
  □ No internal metadata endpoints accessible (AWS: 169.254.169.254, GCP: metadata.google.internal)
  □ DNS rebinding protected: resolve IP and re-check against allowlist after resolution
  □ Redirect following disabled or limited (no following redirects to private IPs)
  □ Response body not proxied verbatim to client (attacker can probe internal services)
  □ Protocol allowlist: only http/https; no file://, ftp://, gopher://, dict://
  □ Webhook validation: webhook URLs verified to be external (not internal network)
  □ URL parsing done with well-tested library, not regex (avoid parser confusion attacks)

Vulnerable example (Node.js):
  // INSECURE — fetches any URL the user provides
  app.post('/fetch-preview', auth, async (req, res) => {
    const response = await fetch(req.body.url);
    res.json(await response.json());
  });

Fixed example:
  const ALLOWED_DOMAINS = ['api.trusted.com', 'cdn.partner.com'];
  app.post('/fetch-preview', auth, async (req, res) => {
    const parsed = new URL(req.body.url);
    if (!ALLOWED_DOMAINS.includes(parsed.hostname)) {
      return res.status(400).json({ error: 'URL not allowed' });
    }
    const response = await fetch(req.body.url);
    res.json(await response.json());
  });

Output: OWASP_A10 findings with CRITICAL|HIGH|MEDIUM|LOW + file:line
```

---

## Phase 3 — Security Headers

> **Emit:** `▶ [3/7] Security Headers`

Generate framework-specific security header middleware for the detected stack.

### Required headers and rationale

| Header | Value | Protects against |
|--------|-------|-----------------|
| `Content-Security-Policy` | Strict (see below) | XSS, data injection |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | SSL stripping, downgrade attacks |
| `X-Content-Type-Options` | `nosniff` | MIME-type sniffing |
| `X-Frame-Options` | `DENY` or `SAMEORIGIN` | Clickjacking |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Info leakage in Referer header |
| `Permissions-Policy` | Restrictive (see below) | Browser feature abuse |
| `Cross-Origin-Opener-Policy` | `same-origin` | Cross-origin isolation |
| `Cross-Origin-Resource-Policy` | `same-origin` | Cross-origin reads |

### CSP baseline (adjust per app requirements)
```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' (add CDN hashes if needed);
  style-src 'self' 'unsafe-inline' (ideally hash-based, not unsafe-inline);
  img-src 'self' data: https:;
  font-src 'self';
  connect-src 'self' [API_DOMAIN];
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests;
```

### Permissions-Policy baseline
```
Permissions-Policy:
  camera=(),
  microphone=(),
  geolocation=(),
  interest-cohort=()
```

### Implementation per stack

**Node.js / Express** — use `helmet`:
```javascript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.API_URL],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permissionsPolicy: {
    features: {
      camera: [],
      microphone: [],
      geolocation: [],
    },
  },
}));
```

**Next.js** — `next.config.js` headers:
```javascript
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'nonce-[nonce]'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join('; '),
  },
];

module.exports = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};
```

**Nginx** — `nginx.conf` server block additions:
```nginx
# Security headers
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; frame-ancestors 'none'; upgrade-insecure-requests;" always;

# Remove server tokens
server_tokens off;
more_clear_headers Server;
```

**Provide:** the specific implementation for the detected stack with any CSP adjustments needed based on the actual app's external dependencies (CDN, analytics, etc. found in Phase 1).

---

## Phase 4 — Secrets Audit

> **Emit:** `▶ [4/7] Secrets Audit`

Launch a **code-explorer agent** to scan for hardcoded secrets:

```
Agent: secrets-scanner
Task: Scan entire codebase for hardcoded secrets and insecure secret patterns.

Patterns to scan (regex-based):
  API keys:     (api_key|apikey|api-key)\s*[=:]\s*["'][A-Za-z0-9_\-]{16,}["']
  Passwords:    (password|passwd|pwd)\s*[=:]\s*["'][^"']{6,}["']
  Tokens:       (token|secret|auth)\s*[=:]\s*["'][A-Za-z0-9_\-\.]{16,}["']
  AWS:          AKIA[0-9A-Z]{16}
  Private keys: -----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----
  DB URLs:      (postgres|mysql|mongodb|redis):\/\/[^:]+:[^@]+@
  JWT secrets:  jwt.*secret.*[=:]\s*["'][^"']{8,}["']

Exclude: .env files, test fixtures with obvious fake values (test_*, fake_*, example_*)
Include: all .js .ts .py .go .rb .java .php .sh .yml .yaml .json .config files

For each finding report:
  - file path + line number
  - type of secret (API key, password, token, etc.)
  - severity (CRITICAL if real-looking, HIGH if test-context but still bad practice)
  - recommended fix
```

### Secret management recommendations (by maturity level)

**Level 1 — Minimum (environment variables):**
```bash
# .env (gitignored) — local dev only
DATABASE_URL=postgres://user:pass@localhost:5432/mydb
JWT_SECRET=local-dev-secret-not-for-prod

# .env.example (committed) — documents required vars
DATABASE_URL=postgres://user:password@host:5432/dbname
JWT_SECRET=your-256-bit-random-secret-here
```

**Level 2 — Recommended (cloud secret manager):**
- AWS Secrets Manager: `aws secretsmanager get-secret-value --secret-id prod/myapp/jwt`
- GCP Secret Manager: `gcloud secrets versions access latest --secret="jwt-secret"`
- Azure Key Vault: `az keyvault secret show --vault-name myapp --name jwt-secret`
- HashiCorp Vault: `vault kv get secret/myapp/jwt`

**Level 3 — Enterprise (automated rotation):**
- Database credentials rotated automatically via Secrets Manager Lambda
- API keys rotated on schedule and old versions revoked
- All secret access logged and audited

**Pre-commit protection:** add `gitleaks` or `truffleHog` to pre-commit hooks to catch secrets before they enter git history.

---

## Phase 5 — Rate Limiting and DDoS Mitigation

> **Emit:** `▶ [5/7] Rate Limiting and DDoS`

Audit existing rate limiting and provide strategy per endpoint type.

### Rate limit strategy by endpoint type

| Endpoint type | Recommended limit | Window | Block duration |
|--------------|-------------------|--------|----------------|
| Login | 5 attempts | 15 min | 15 min lockout |
| Registration | 3 attempts | 1 hour | 1 hour cooldown |
| Password reset request | 3 attempts | 1 hour | 1 hour cooldown |
| MFA verification | 5 attempts | 15 min | 15 min lockout |
| API (authenticated) | 1000 req | 15 min | Throttle (429) |
| API (public/unauthenticated) | 100 req | 15 min | Throttle (429) |
| File upload | 10 uploads | 1 hour | Throttle (429) |
| Search/list endpoints | 300 req | 15 min | Throttle (429) |
| Webhook endpoints | 500 req | 1 min | Throttle (429) |

### Implementation per stack

**Node.js / Express** — `express-rate-limit` + `rate-limit-redis`:
```javascript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';

const redisClient = createClient({ url: process.env.REDIS_URL });

// Strict limit for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ sendCommand: (...args) => redisClient.sendCommand(args) }),
  message: { error: 'Too many attempts. Try again in 15 minutes.' },
  keyGenerator: (req) => req.ip + ':' + req.path,
});

// General API limit
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  store: new RedisStore({ sendCommand: (...args) => redisClient.sendCommand(args) }),
});

// Apply
app.use('/api/auth/', authLimiter);
app.use('/api/', apiLimiter);
```

**Python / FastAPI** — `slowapi`:
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address, storage_uri=os.getenv("REDIS_URL"))
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.post("/auth/login")
@limiter.limit("5/15minutes")
async def login(request: Request, credentials: LoginRequest):
    ...
```

**DDoS additional measures:**
- Reverse proxy layer (Nginx/Cloudflare) as first line of defense
- Connection limits in Nginx: `limit_conn_zone $binary_remote_addr zone=conn_limit:10m; limit_conn conn_limit 20;`
- Request size limits: `client_max_body_size 10m;` (lower for API-only)
- Cloudflare / AWS WAF rules for volumetric attacks
- Bot protection: challenge suspicious IPs (high rate + missing browser headers)

---

## Phase 6 — Dependency Scan

> **Emit:** `▶ [6/7] Dependency Scan`

Execute dependency scan commands for all detected stacks (results supplement OWASP A06 agent):

```
For each detected dependency manifest, run the appropriate command:

Node.js:
  Command: npm audit --json 2>/dev/null | jq '{
    total: .metadata.vulnerabilities,
    critical: .vulnerabilities | to_entries | map(select(.value.severity == "critical")) | length,
    findings: .vulnerabilities | to_entries | map({
      name: .key,
      severity: .value.severity,
      via: .value.via,
      fixAvailable: .value.fixAvailable
    })
  }'
  Also check: npm outdated (packages > 2 major versions behind)

Python:
  Command: pip-audit --format columns 2>/dev/null
  Fallback: safety check --json

Container:
  Command: trivy fs . --severity HIGH,CRITICAL --format table 2>/dev/null

Go:
  Command: govulncheck ./... 2>/dev/null
```

Triage all findings and add to Remediation Report (Phase 7) with:
- CVE ID (if applicable)
- Package name + current version + fix version
- Severity tier
- Whether fix is breaking-change

---

## Phase 7 — Remediation Report

> **Emit:** `▶ [7/7] Remediation Report`

Consolidate all findings from Phases 1–6 into a single structured report:

```
SECURITY HARDENING REPORT: [scope]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Date:    [ISO date]
Scope:   [what was audited]
Stack:   [detected technology stack]

VERDICT: BLOCK DEPLOY | CONDITIONAL PASS | PASS

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL — Block deploy (fix before any release)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[RULE-SEC-NNN] [OWASP category] [file:line]
  Risk:     [what an attacker can do]
  Evidence: [exact code or config snippet]
  Fix:      [specific action to take]
  Verify:   [how to confirm it's fixed]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HIGH — Fix this sprint (before next release)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[RULE-SEC-NNN] [OWASP category] [file:line]
  Risk:     [description]
  Fix:      [specific action]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MEDIUM — Fix next sprint
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[list with same format]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LOW — Track in backlog
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[list with same format]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Critical: [N]   High: [N]   Medium: [N]   Low: [N]

OWASP coverage:
  A01 Access Control       [PASS|FINDINGS]
  A02 Cryptographic        [PASS|FINDINGS]
  A03 Injection            [PASS|FINDINGS]
  A04 Insecure Design      [PASS|FINDINGS]
  A05 Misconfiguration     [PASS|FINDINGS]
  A06 Vulnerable Deps      [PASS|FINDINGS — N CVEs]
  A07 Auth Failures        [PASS|FINDINGS]
  A08 Integrity            [PASS|FINDINGS]
  A09 Logging              [PASS|FINDINGS]
  A10 SSRF                 [PASS|FINDINGS]

Deploy decision:
  BLOCK DEPLOY   — [N] CRITICAL findings must be resolved first
  CONDITIONAL    — No CRITICAL, but [N] HIGH findings scheduled for fix
  PASS           — No CRITICAL or HIGH findings
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Rules

1. **CRITICAL findings always block deploy** — no exceptions, no overrides
2. **Every finding requires a location** — file:line or config section, never vague
3. **Every fix is specific and actionable** — not "add input validation" but "add Zod schema validation to POST /api/users before the use-case call at routes/users.ts:42"
4. **Agents read real code** — no assumptions; all checks must be grounded in what was actually found
5. **Non-findings are explicitly confirmed** — "A10 SSRF: no outbound HTTP calls found — PASS" is a valid output
6. **Tool commands must be run** — dependency scan findings come from running actual audit commands, not from reading package.json manually
7. **Max 5 agents in parallel** — RULE-AGENT-001; Wave A (A01-A05) and Wave B (A06-A10) run separately

---

## Rule References

| Rule ID | Description |
|---------|-------------|
| RULE-SEC-001 | No hardcoded secrets in source code |
| RULE-SEC-002 | No SQL/NoSQL/command injection via string concatenation |
| RULE-SEC-003 | Passwords must use bcrypt/argon2/scrypt with appropriate work factor |
| RULE-SEC-004 | All non-public endpoints must have authentication middleware |
| RULE-SEC-005 | Authentication must include ownership/authorization check (not just identity) |
| RULE-SEC-006 | Security headers required on all HTTP responses |
| RULE-SEC-007 | Rate limiting required on all auth endpoints |
| RULE-SEC-008 | JWT must be stored in httpOnly cookie, not localStorage |
| RULE-SEC-009 | No CRITICAL or HIGH CVEs in production dependencies |
| RULE-SEC-010 | User-supplied URLs must be validated against an allowlist before fetch |
| RULE-SEC-011 | Sensitive operations must be logged with user, timestamp, and IP |
| RULE-SEC-012 | Error responses must not expose stack traces or internal paths in production |
