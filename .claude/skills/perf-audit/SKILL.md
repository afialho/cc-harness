---
name: perf-audit
description: Performance audit: bundle analysis, database N+1 detection, caching strategy, Core Web Vitals thresholds, API response time profiling, and regression prevention.
disable-model-invocation: true
argument-hint: [scope: frontend | backend | full]
---

# /perf-audit — Performance Audit

Structured performance audit across frontend bundle, backend queries, API response times, and infrastructure. Produces a severity-ranked report and installs regression-prevention guardrails into CI/CD.

---

## Fase 1 — Scope & Baseline

> **Emitir:** `▶ [1/6] Scope & Baseline`

1. Identify what was built — read modified files (git diff or build handoff).
2. Determine audit scope:
   - Argument `frontend` → Phases 2 + 4 + 5 + 6
   - Argument `backend` → Phases 3 + 4 + 5 + 6
   - Argument `full` or no argument → all phases
3. Establish baseline metrics if available:
   - Lighthouse CI JSON reports in `.lighthouseci/` or `ci/` → extract LCP, CLS, INP, total bundle size
   - k6 result summaries in `tests/load/` → extract p95 response times per endpoint
   - Webpack/Vite bundle stats already generated → extract chunk sizes
4. Emit baseline summary:
   ```
   BASELINE
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Scope:    [frontend | backend | full]
   LCP:      [Xs | no baseline]
   CLS:      [0.XX | no baseline]
   INP:      [Xms | no baseline]
   Bundle:   [XkB total | no baseline]
   API p95:  [Xms | no baseline]
   ```

---

## Fase 2 — Frontend Performance Audit

> **Emitir:** `▶ [2/6] Frontend Performance Audit`

Skip entirely if scope is `backend`.

### 2.1 — Bundle Size Analysis

Detect build tool and run analyzer:

| Tool | Analyzer command |
|------|-----------------|
| Vite | `rtk npx vite-bundle-visualizer` or check `dist/stats.html` |
| Next.js | `rtk npx @next/bundle-analyzer` (set `ANALYZE=true`) |
| webpack | `rtk npx webpack-bundle-analyzer dist/stats.json` |
| CRA | `rtk npm run build -- --stats` + `rtk npx webpack-bundle-analyzer build/bundle-stats.json` |

Identify:
- Total JS payload (target: < 200kB gzipped for initial load)
- Largest chunks — list top 5 by size
- Heavy dependencies duplicated across chunks (e.g., lodash, moment, date-fns)
- Libraries where only a fraction is used (e.g., `import _ from 'lodash'` instead of `import debounce from 'lodash/debounce'`)

### 2.2 — Core Web Vitals Thresholds

Thresholds (Google "Good" band):

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| LCP | < 2.5s | 2.5s–4s | > 4s |
| CLS | < 0.1 | 0.1–0.25 | > 0.25 |
| INP | < 200ms | 200ms–500ms | > 500ms |

Measurement command (add to CI):
```bash
rtk npx lhci autorun --upload.target=temporary-public-storage
```

Check Lighthouse CI config at `.lighthouserc.js` or `.lighthouserc.json` — if absent, flag as MAJOR (regression prevention gap).

### 2.3 — Code Splitting

Inspect route definitions and heavy component imports:

- Routes: are they lazy-loaded? (`React.lazy`, `dynamic()` in Next.js, `loadComponent` in Angular)
- Heavy components (charts, editors, maps, PDF renderers): loaded lazily?
- Flag any component > 50kB that is imported statically at the top of a route file

### 2.4 — Image Optimization

- Next.js: `<img>` tags not using `next/image` → flag
- Non-Next.js: images without `loading="lazy"` → flag
- Image formats: serving JPEG/PNG where WebP or AVIF would reduce size > 20%
- Images without explicit `width`/`height` → CLS risk, flag as MAJOR

### 2.5 — Font Loading

- `font-display: swap` missing on `@font-face` declarations → flag
- Google Fonts loaded without `&display=swap` → flag
- Large font files (> 100kB) not subsetted → flag MINOR
- Critical fonts not `<link rel="preload">` → flag MINOR

### 2.6 — Tree Shaking

Scan imports for known anti-patterns:

```
import * as _ from 'lodash'         → use lodash-es or named imports
import moment from 'moment'          → replace with date-fns (tree-shakeable)
import { everything } from 'antd'    → use babel-plugin-import
import { everything } from '@mui/material'  → use path imports
```

---

## Fase 3 — Backend Performance Audit

> **Emitir:** `▶ [3/6] Backend Performance Audit`

Skip entirely if scope is `frontend`.

### 3.1 — Database Query Analysis

Detect ORM in use (Prisma, TypeORM, Sequelize, ActiveRecord, SQLAlchemy, GORM, Hibernate) by scanning `package.json`, `Gemfile`, `requirements.txt`, or `go.mod`.

**N+1 detection patterns to look for:**

```
// N+1 — JavaScript/TypeScript ORM
const posts = await Post.findMany();
for (const post of posts) {
  post.author = await User.findById(post.userId); // N queries
}
→ Fix: Post.findMany({ include: { author: true } })

# N+1 — Python SQLAlchemy
posts = session.query(Post).all()
for post in posts:
    print(post.author.name)  # lazy load per post
→ Fix: session.query(Post).options(joinedload(Post.author)).all()

# N+1 — ActiveRecord
Post.all.each { |post| puts post.author.name }
→ Fix: Post.includes(:author).all
```

Scan all use case / service files for: queries inside loops, nested `findById` / `findOne` calls, lazy-loaded associations accessed in iteration.

**Missing index detection:**

Scan migration files and schema definitions for:
- Foreign key columns without an index
- Columns used in frequent `.where()` / `filter()` clauses without an index
- Columns used in `.order()` / `ORDER BY` without an index
- Composite queries (two columns in AND) without a composite index

**Full table scan risk:**

Flag queries with:
- `LIKE '%term'` (leading wildcard — cannot use B-tree index)
- No `WHERE` clause on large tables
- `ORDER BY` on unindexed columns with no `LIMIT`

### 3.2 — API Response Time Analysis

If k6 results exist in `tests/load/`:
- Extract p95 per endpoint
- Flag endpoints exceeding thresholds:

| Endpoint type | p95 target | Flag if |
|---------------|-----------|---------|
| Read (GET) | < 200ms | > 200ms → MAJOR, > 500ms → BLOCKER |
| Write (POST/PUT/PATCH) | < 500ms | > 500ms → MAJOR, > 1s → BLOCKER |
| Auth (login/register) | < 300ms | > 300ms → MAJOR |
| File upload | < 2s | > 2s → MAJOR |

If no k6 results exist: flag as MAJOR — `Load tests missing: add k6 tests for all public endpoints`.

### 3.3 — Caching Strategy

For each data access pattern identified in the codebase, recommend caching tier:

| Pattern | Recommended cache | TTL |
|---------|-------------------|-----|
| Per-request deduplication (same data fetched multiple times in one request) | In-process Map / DataLoader | request lifetime |
| Per-user session data | Redis, keyed by userId | 15–60 min |
| Shared reference data (configs, feature flags, lookup tables) | Redis or in-process LRU | 5–30 min |
| Public, rarely-changing content | CDN (Cloudflare, Vercel Edge) | hours–days |
| Expensive DB aggregations | Redis, keyed by query params | 1–5 min |

Check if a caching layer is already configured — if not and the codebase has repeated identical queries, flag as MAJOR.

### 3.4 — Async vs Sync Blocking Operations

Scan route handlers and controllers for blocking patterns:

- Email sending inline in request handler (should be queued)
- File processing / image resizing inline (should be queued)
- External API calls that are not latency-critical (can be async/background)
- `await Promise.all([...])` where sequential `await` is used instead (parallelization gap)
- CPU-heavy computation (PDF generation, report building) blocking the event loop

Flag each as MAJOR if it is in a request handler on a hot path.

> **Checkpoint:** Se contexto atingir ~60k tokens → escreve `.claude/checkpoint.md` com skill, fase, arquivos, próximo passo. Emite: `↺ Contexto ~60k. Recomendo /compact. Use /resume para continuar.`

---

## Fase 4 — Infrastructure & Networking

> **Emitir:** `▶ [4/6] Infrastructure & Networking`

### 4.1 — Database Connection Pooling

Scan DB client configuration for pool settings:

| ORM/Client | Key config | Recommended |
|-----------|-----------|-------------|
| Prisma | `connection_limit` in `datasource url` | 5–20 depending on DB instance |
| TypeORM | `extra.max` in `DataSource` | 10–25 |
| pg (node-postgres) | `Pool({ max })` | 10–20 |
| SQLAlchemy | `pool_size`, `max_overflow` | 5 + 10 overflow |
| ActiveRecord | `pool:` in database.yml | (CPUs × 2) + 1 |

Flag missing pool configuration as MAJOR (default pool sizes are often 1 or unlimited).

### 4.2 — HTTP Compression

Check HTTP server / framework config for gzip or brotli:

- Express: `compression` middleware present?
- Fastify: `@fastify/compress` registered?
- Next.js: compression enabled in `next.config.js`? (enabled by default for standalone — verify not disabled)
- Nginx / Caddy / reverse proxy: `gzip on` / `encode zstd gzip` in config?

Flag missing compression as MAJOR for any production-facing HTTP server.

### 4.3 — CDN for Static Assets

- Next.js: `assetPrefix` or Vercel CDN configured?
- Non-Next.js: static assets (`/public`, `/dist`) served through CDN (Cloudflare, CloudFront, Vercel Edge) or directly from origin?
- Cache-Control headers on static assets: `max-age=31536000, immutable` for hashed assets?

Flag direct-from-origin static serving as MAJOR if app has significant frontend traffic.

### 4.4 — Database Indexing Recommendations

Consolidate index gaps found in Phase 3.1 and produce a migration snippet for each:

```sql
-- Example output per missing index:
CREATE INDEX CONCURRENTLY idx_posts_user_id ON posts(user_id);
CREATE INDEX CONCURRENTLY idx_posts_status_created_at ON posts(status, created_at DESC);
```

Use `CONCURRENTLY` for PostgreSQL to avoid table locks. Flag absence of `CONCURRENTLY` in existing migrations as MINOR.

---

## Fase 5 — Performance Report

> **Emitir:** `▶ [5/6] Performance Report`

```
PERF AUDIT REPORT: [scope] — [project name]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status: BLOCKER | HIGH | CLEAN

BLOCKER — deploy blocked until resolved:
  [id] [area]  [metric: current value → target value]
       Fix: [specific actionable fix]
  Ex: [FE-01] Bundle — initial JS 1.2MB gzipped → target < 200kB
       Fix: lazy-load /dashboard and /reports routes; replace moment with date-fns
  Ex: [BE-01] N+1 — UserService.getAll: 1+N queries per request
       Fix: add `.include({ posts: true })` to Prisma findMany call (src/users/user.service.ts:34)

HIGH — fix this sprint:
  [id] [area]  [metric: current value → target value]
       Fix: [specific actionable fix]
  Ex: [FE-02] LCP — no Lighthouse CI baseline established
       Fix: add .lighthouserc.js with LCP assert < 2500 (see Phase 6 template)
  Ex: [BE-02] Caching — /api/products fetches full catalog on every request (no cache)
       Fix: add Redis cache with 5-minute TTL keyed by query params

MEDIUM — next sprint:
  [id] [area]  [description + fix]

OK — areas with no issues found:
  [area] — PASS ([N] patterns checked)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Auto-fix decision:**
- BLOCKER items → spawn targeted fix agents (max 5 parallel, surgical — fix only the flagged issue)
- HIGH items → document with exact file:line for developer action
- MEDIUM items → register as backlog

---

## Fase 6 — Regression Prevention

> **Emitir:** `▶ [6/6] Regression Prevention`

Install guardrails so the findings do not regress silently.

### 6.1 — Lighthouse CI Config

If `.lighthouserc.js` does not exist, create it:

```js
// .lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000'],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.8 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],
        'interactive': ['warn', { maxNumericValue: 3800 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

Add to CI pipeline (`.github/workflows/ci.yml` or equivalent):
```yaml
- name: Lighthouse CI
  run: rtk npx lhci autorun
  env:
    LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

### 6.2 — k6 Performance Thresholds

If k6 test files exist in `tests/load/`, add threshold assertions:

```js
// tests/load/api.k6.js — add thresholds block
export const options = {
  thresholds: {
    // GET endpoints — p95 < 200ms
    'http_req_duration{method:GET}': ['p(95)<200'],
    // POST endpoints — p95 < 500ms
    'http_req_duration{method:POST}': ['p(95)<500'],
    // Error rate < 1%
    'http_req_failed': ['rate<0.01'],
  },
};
```

Add to CI pipeline:
```yaml
- name: Load Tests
  run: rtk k6 run tests/load/api.k6.js
```

### 6.3 — Bundle Size Budget

**Vite** — add to `vite.config.ts`:
```ts
build: {
  rollupOptions: {
    output: {
      // Warn if any chunk exceeds 500kB
    },
  },
  chunkSizeWarningLimit: 500, // kB
}
```

**webpack / Next.js** — add to `next.config.js` or `webpack.config.js`:
```js
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  experimental: {
    // Fail build if pages exceed size budget
  },
});
```

For strict CI enforcement, add `bundlesize` package:
```json
// package.json
"bundlesize": [
  { "path": "./dist/assets/*.js", "maxSize": "200 kB" },
  { "path": "./dist/assets/*.css", "maxSize": "50 kB" }
]
```

```yaml
# CI step
- name: Bundle Size Check
  run: rtk npx bundlesize
```

### 6.4 — Summary of Guardrails Installed

```
REGRESSION PREVENTION INSTALLED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Lighthouse CI:   [created | already existed | skipped (backend-only scope)]
k6 thresholds:   [added to N test files | no k6 files found — add load tests]
Bundle budget:   [configured | skipped (backend-only scope)]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
