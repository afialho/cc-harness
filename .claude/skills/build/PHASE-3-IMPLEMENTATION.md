# Phase 3 — Implementation

> **Emit:** `▶ [3/3] Implementation`

---

## Git Setup — Feature Branch (MANDATORY)

Before any implementation, create a dedicated branch:

```bash
rtk git checkout -b feature/[kebab-case-name]
```

**All Phase 3 work happens on this branch.** Incremental commits throughout implementation (see commit rules below). Merge into `main` only after BUILD COMPLETE.

---

## Automatic Detection: Web vs. Mobile

Before the Foundation Protocol, detect the project type:

```bash
# Mobile: if package.json contains "expo" or "react-native"
rtk cat package.json | grep -E '"expo"|"react-native"'
```

- **Mobile detected** → use Foundation Protocol Mobile (below)
- **Web (default)** → use Foundation Protocol Web (below)

---

## Automatic Detection: Library/Package

If no frontend detected (no `src/pages/`, `app/`, `pages/`, nor Expo/React Native) AND project has a package manifest (`"main"` or `"exports"` in package.json, `[build-system]` in pyproject.toml, `Cargo.toml`, `setup.py`/`setup.cfg`):

- **Library detected** → use Foundation Protocol Library (below)

---

## Foundation Protocol Library (MANDATORY for packages/libraries)

Libraries have no UI, no Docker, and no auth. The focus is: clean public API, solid tests, build/publish pipeline.

### [3a-lib] Project Setup
1. Configure build toolchain (tsup/esbuild for TS, setuptools/hatch for Python, cargo for Rust)
2. Configure exports/entry points in the package manifest
3. Configure linting + formatting (eslint/prettier, ruff, clippy)

### [3b-lib] Public API Design
1. Define public exports — what the consumer imports
2. Generate types (TypeScript declarations, type stubs for Python)
3. Create `src/index.ts` (or equivalent) with clean re-exports

### Phase Gate Library

```
PHASE GATE — execute after each public module:
  □ Unit tests passing (100% of public API)
  □ Build produces correct artifact (rtk npm run build / rtk cargo build)
  □ Types/declarations generated correctly
  □ /qa-loop (scope: [module], dimensions: qa-code + qa-backend)
  □ PASS mandatory before next module
```

### Scale Gates Library

| Skill | MVP | Product | Scale |
|-------|-----|---------|-------|
| `/ci-cd` (build + test + publish) | — | **mandatory** | **mandatory** |
| `/docs-gen` (API docs + README) | — | **mandatory** | **mandatory** |
| `/security-hardening audit` | — | **mandatory** | **mandatory** |
| Benchmarks | — | — | **mandatory** |

---

## Foundation Protocol Mobile (MANDATORY for React Native projects)

Delegate entirely to `/mobile` — do not reimplement here.

```
▶ Executing Foundation Protocol Mobile via /mobile...

Mandatory phases:
  [M-3a] /mobile scaffold → design system + navigation base → GATE (/mobile qa)
  [M-3b] /auth scaffold   → register/login/logout/refresh → GATE (/mobile qa scope: auth)

If GATE [M-3b] fails → the ENTIRE build stops here. No exceptions.
```

Refer to the `/mobile` skill for the complete protocol of each phase.

---

## Foundation Protocol Web (MANDATORY for any web app with UI)

Before implementing any product feature, execute in strict sequence:

### [PRE] Ensure agent-browser + Docker

Before [3a], verify that visual QA tools are available:

**agent-browser CLI:**
```bash
which agent-browser && agent-browser --version
```
If not found → install:
```bash
npm install -g agent-browser && agent-browser install
```
Verify again. If it fails after 2 attempts → stop and inform the user.
**Without agent-browser CLI, the visual gates [3a] and [3b] cannot work.**

**Docker:**
```bash
rtk docker compose up -d
rtk docker compose ps
```
The application must be accessible before visual gates. Determine URL (`http://localhost:[port]`).

---

### [3a] Design System + Base Layout

1. Install and configure shadcn/ui + theme (colors, fonts, dark/light mode based on app type)
2. Build base layout: navigational structure (header, sidebar or nav, main content area)
3. Execute QA:

```
⛔ GATE [3a]: /qa-loop (scope: base layout, dimensions: qa-design)
             PASS mandatory — without this gate, no feature starts
             Automatic fix loop until PASS or escalate to user
```

**Commit after [3a] PASS:**
```bash
rtk git add [specific files — never git add .]
rtk git commit -m "chore(scaffold): add design system and base layout"
```

### [3b] Auth — Register / Login / Logout

1. Implement complete flow: register, login, logout, post-login redirect, route protection
2. Create `tests/e2e/auth.cy.ts` with happy path + error case
3. `rtk npx cypress run --spec tests/e2e/auth.cy.ts`
4. Execute QA:

```
⛔ GATE [3b]: /qa-loop (scope: auth, dimensions: qa-backend + qa-security + qa-e2e)
             PASS mandatory
             If auth returns BLOCKER → stop completely. Present to user:
```

**If QA returns BLOCKER on auth:**

```
⛔ AUTH GATE BLOCKER — Build paused

Issues found:
  [list of BLOCKERs from QA Report with file:line]

Auth with BLOCKER = build does not advance. No exceptions.

Options:
  1. Fix the issues above and confirm "you can continue"
  2. Replace auth with /auth complete (recommended if > 2 BLOCKERs)

Waiting for confirmation to resume.
```

Wait for explicit user response before continuing any implementation.

**Commit after [3b] PASS:**
```bash
rtk git add [specific files — never git add .]
rtk git commit -m "feat(auth): add register, login, logout with route protection"
```

---

## Phase Gate Protocol

After EACH implemented feature (not just at the end of the build):

**Web:**
```
PHASE GATE — execute after each feature:
  □ Docker running: rtk docker compose ps (if not → rtk docker compose up -d)
  □ rtk npx cypress run --spec tests/e2e/[feature].cy.ts
  □ /qa-loop (scope: [feature], dimensions: by type)
      UI only      → qa-design + qa-ux + qa-e2e
      Backend only → qa-backend + qa-security + qa-code
      Full-stack   → qa-design + qa-ux + qa-backend + qa-security + qa-e2e
  □ [Scale only] If feature has HTTP endpoint → add qa-perf + rtk k6 run tests/load/[feature].js
  □ PASS mandatory before starting the next feature
  □ Automatic fix loop (max 3 iterations) before escalating to user
  □ TECH LEAD VALIDATION — compare implemented feature with PLAN.md:
      - Do all UI inventory elements exist and work?
      - Do all planned endpoints/technical tasks exist?
      - Do all BDD scenarios pass?
      - If MISSING → implement before committing. Loop until complete.
  □ COMMIT after PASS + Tech Lead validation:
      rtk git add [specific files — never git add .]
      rtk git commit -m "feat([feature-scope]): [feature description]"
```

**Mobile:**
```
PHASE GATE — execute after each mobile feature:
  □ rtk npx detox test tests/e2e/[feature].e2e.ts
  □ /mobile qa (scope: [feature])
  □ PASS mandatory before starting the next feature
  □ Automatic fix loop (max 3 iterations) before escalating to user
```

**Dependency rule**: features that depend on another only start if the dependency's gate passed.

**Fix priority rule**: the QA Loop spawns fix agents automatically — the /build orchestrator waits for PASS before advancing, without manual intervention.

---

## Automatic Protocol Decision

| Criterion | Protocol |
|-----------|----------|
| Feature with 3+ independent components | `/agent-teams` (parallel teams) |
| Single or sequential feature | `/feature-dev` (7 phases, agents per wave) |
| Feature with significant UI | Include `/frontend-design` within implementation |
| Library (no UI, no API server) | `/feature-dev` (no Foundation Web/Mobile, no auth gate) |

The decision is made automatically based on the Phase 2 plan.

## Feature Routing — Specialized Skills

Before starting each feature, check if it matches a specialized skill. Specialized skills have deeper domain knowledge and produce better results than generic `/feature-dev` for their area.

| Feature type | Route to | Instead of |
|-------------|---------|-----------|
| Auth (register, login, logout, OAuth, RBAC, password reset) | `/auth scaffold` or `/auth` | `/feature-dev` |
| UI-heavy (design system, complex components, accessibility) | `/ui` (orchestrates `/frontend-design` + QA) | `/feature-dev` with manual UI work |
| New entities, schema changes, migrations | `/dba design` BEFORE `/feature-dev` | `/feature-dev` alone (may miss indexing, constraints) |
| API breaking changes, versioning | `/api-contract` BEFORE implementation | Implementing without contract check |

**Routing rules:**
1. If the feature is primarily auth → delegate entirely to `/auth`
2. If the feature has new DB entities → run `/dba design` first, then `/feature-dev` with the approved schema
3. If the feature is UI-heavy → use `/ui` for the UI layer, `/feature-dev` for backend
4. For all other features → `/feature-dev` (default)
5. If 3+ independent components → `/agent-teams` regardless of feature type

## Implementation Context

All implementation agents receive as context:
- `RESEARCH.md` — library decisions and visual patterns
- Approved plan from Phase 2 — architecture, sequence, test plan
- User clarification responses from Phase 1

### If protocol is /feature-dev

Execute the 7 phases of `/feature-dev` with agents per wave:
- Phase 1: BDD scenarios
- Phase 2: Domain (RED — failing tests)
- Phase 3: Domain (GREEN — implementation)
- Phase 4: Ports + Application (RED → GREEN)
- Phase 5: Infrastructure adapters (integration tests)
- Phase 6: Wiring + E2E
- Phase 7: Review + Load test

Checkpoint at the end of each phase.

### If protocol is /agent-teams

Execute `/agent-teams` with parallel teams:
- Decompose into independent workstreams (max 85k tokens per team)
- Launch waves of simultaneous teams (max 5 agents per wave)
- Each team returns TEAM REPORT with status, files and decisions
- Orchestrator aggregates handoffs between waves

Checkpoint at the end of each wave.

## Checkpoints During Implementation

At each completed phase (if /feature-dev) or each wave (if /agent-teams):
Update `.claude/checkpoint.md` with exact progress.

If context reaches ~60k at any point:
`↺ Context ~60k. Recommend /compact. Use /resume to continue at [exact phase/wave].`

## Implementation Conclusion

After complete implementation of ALL features:

1. **Run complete test suite:**
   ```bash
   rtk npm test
   rtk npx cucumber-js
   rtk npx cypress run          # if UI was built
   rtk k6 run tests/load/[f].js # if endpoint was added
   ```

2. **Launch — Start the application (MANDATORY):**

   > **Emit:** `▶ [3/3] Launch — starting application`

   Before any visual QA or browser audit, the application **MUST** be running in Docker:

   ```bash
   rtk docker compose up -d
   rtk docker compose ps        # verify all services are healthy/running
   ```

   - Wait for health check of all services (try up to 60s with polling)
   - If any service fails → `rtk docker compose logs [service]` → fix → re-launch
   - Determine URL: read `docker-compose.yml` → exposed port of the web service → `http://localhost:[port]`
   - Emit: `Application running at http://localhost:[port]`

   **If Docker doesn't start after 3 fix attempts → escalate to user. Build does not advance without the app running.**

3. **Quality Gate Pipeline (canonical order — see CLAUDE.md):**

   Execute in this exact order. Each gate must PASS before the next starts.

   **Step 3a — Code Review:**
   ```
   /code-review
   ```
   - Hexagonal conformity, SOLID principles, test coverage, security
   - If FAIL → fix loop until PASS

   **Step 3b — QA Loop (static dimensions):**
   ```
   /qa-loop (scope: complete build, dimensions: qa-code + qa-security + qa-backend + qa-perf)
   ```
   Only code/architecture dimensions — visual dimensions are covered by `/browser-qa` next.
   Automatic fix loop until PASS.

   **Step 3c — Perf Audit (Scale only):**
   ```
   /perf-audit full
   ```
   Only if scale = Scale (already in Scale Gates below). Skip for MVP/Product.

   **Step 3d — Browser Audit (MANDATORY for apps with UI):**

   > **Emit:** `▶ [3/3] Browser Audit — exhaustive navigation`

   With the application running, execute a complete audit of ALL screens and ALL components:

   ```
   /browser-qa http://localhost:[port]
   ```

   This is the **final visual and functional quality gate**:
   - Navigate through ALL pages (public + protected)
   - Test ALL interactive elements (buttons, links, forms, menus, modals)
   - Classify ALL errors found (BLOCKER / MAJOR / MINOR)
   - Automatic fix loop (max 3 iterations) until zero BLOCKER/MAJOR
   - If escalating → present to user before commit
   - **The application MUST remain running** throughout the audit and after the build

4. **Fix loop** (if unit/BDD test failures): spawn targeted fix agents. Repeat until all green.
   After each fix round, verify Docker is still healthy: `rtk docker compose ps`

7. **PM Validation — Completeness Check (MANDATORY):**

   > **Emit:** `▶ [3/3] PM Validation — checking completeness`

   Compare the delivered application with the feature set defined in PLAN.md:

   - For each feature in PLAN.md: is it implemented end-to-end?
   - For each screen in the UI inventory: do all elements exist and work?
   - Are there stubs, placeholders, "coming soon", "TODO", "Lorem ipsum" in the UI?
   - Are there buttons/links that do nothing or lead to empty pages?

   Generate `COMPLETENESS_REPORT.md`:
   ```
   COMPLETENESS REPORT
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Feature             | Status   | Notes
   [feature 1]         | COMPLETE |
   [feature 2]         | PARTIAL  | [missing: X, Y]
   [feature 3]         | STUB     | [button exists but does nothing]

   Stubs detected: [N]
   Incomplete features: [N]
   ```

   - If STUBS > 0 or PARTIAL features → **mandatory fix loop**: implement end-to-end or remove from UI
   - Feature not implemented in this build → remove UI element completely (never leave a stub)
   - Loop until COMPLETENESS_REPORT shows 100% COMPLETE or elements removed
   - **Only after PM Validation PASS → advance to Scale Gates**

## Scale Gates — Mandatory Skills by Scale

Before the commit, check the scale declared in Phase 0 (UNDERSTANDING block) and execute the mandatory skills:

| Skill | MVP | Product | Scale |
|-------|-----|---------|-------|
| `/ci-cd` | — | **mandatory** | **mandatory** |
| `/security-hardening audit` | — | **mandatory** | **mandatory** |
| `/docs-gen all` | — | **mandatory** | **mandatory** |
| Rate limiting (auth + public APIs) | — | **mandatory** | **mandatory** |
| Structured logging (request-id) | — | **mandatory** | **mandatory** |
| `/observability all` | — | — | **mandatory** |
| `/perf-audit full` | — | — | **mandatory** |
| Load tests (`k6 run tests/load/*.js`) | — | — | **mandatory** |

**Execution:**

**If scale = Product:**
```
▶ Scale Gate — Product: executing mandatory skills

1. /ci-cd                    → GitHub Actions pipeline (build, test, lint, security-scan)
2. /security-hardening audit → OWASP Top 10, headers, secrets audit, dependency scanning
3. /docs-gen all             → OpenAPI, C4 diagrams, CHANGELOG, developer runbook
4. Check rate limiting on auth endpoints and public APIs. If not implemented → add rate limiting middleware before commit.
5. Check structured logging (pino/structlog/slog) is configured. If absent → configure basic logging with request-id before commit.

If any skill returns BLOCKER → fix loop before commit.
```

**If scale = Scale:**
```
▶ Scale Gate — Scale: executing mandatory skills (Product + extras)

1. /ci-cd                    → GitHub Actions pipeline (build, test, lint, security-scan)
2. /security-hardening audit → OWASP Top 10, headers, secrets audit, dependency scanning
3. /docs-gen all             → OpenAPI, C4 diagrams, CHANGELOG, developer runbook
4. /observability all        → Structured logging + OpenTelemetry → Grafana stack
5. /perf-audit full          → Bundle analysis, N+1 detection, caching, Core Web Vitals
6. Check rate limiting on auth endpoints and public APIs. If not implemented → add rate limiting middleware before commit.
7. Execute complete load test suite: `rtk k6 run tests/load/*.js`. If p95 > threshold → BLOCKER.

If any skill returns BLOCKER → fix loop before commit.
```

**If scale = MVP:** no additional skills — proceed directly to commit.

4. **Final commit** (only scale gate changes, review fixes and browser audit fixes — features were already committed incrementally):
   ```bash
   rtk git add [specific files — never git add .]
   rtk git commit -m "chore(build): add scale gates, review fixes, and final QA adjustments

   Co-Authored-By: Claude <noreply@anthropic.com>"
   ```
   If there are no pending changes (everything already committed in phase gates) → skip this commit.

5. **Verify Docker is still running:**
   ```bash
   rtk docker compose ps   # confirm all services healthy
   ```
   If any service went down during fixes → `rtk docker compose up -d` again.

6. **Present final summary to user:**

```
BUILD COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Feature:        [feature name]
Branch:         feature/[name]
Commits:        [N] (incremental — foundation, auth, per-feature, final)
URL:            http://localhost:[port]
Docker:         running (docker compose up)

What was built:
  [2-4 bullets describing what was implemented]

Files:
  Created:    [N]
  Modified:   [N]

Tests:
  Unit:        [N] passing
  Integration: [N] passing
  BDD:         [N] scenarios passing
  E2E:         [N] passing     (if applicable)
  Load:        p95 Xms @ Y rps (if applicable)

Quality gates:
  Foundation:    ✅ Design system + layout verified (agent-browser)
  Auth:          ✅ Register/login/logout verified (agent-browser + Cypress)
  Per-feature:   ✅ Phase gate passed on each feature
  Browser Audit: ✅ All screens navigated, all components tested (agent-browser)
  Static QA:     ✅ Code + Security + Backend + Perf verified

Protocol:     [feature-dev | agent-teams]
Review:       PASS

The application is running at http://localhost:[port].
Docker was NOT shut down — the app remains accessible for manual testing.

Next: rtk git checkout main && rtk git merge feature/[name]
```

---

## General Rules

1. **Never skip research** — UI features without `RESEARCH.md` result in generic solutions without real grounding.
2. **Mandatory pauses** after Phase 1 (clarification) and Phase 2 (plan approval). Outside these pauses, execution is fully autonomous.
3. **Checkpoints** at the end of each phase and whenever estimated ~60k tokens (write checkpoint) / ~80k (compact recommended) consumed.
4. **Progress markers** at all points (`▶ [N/3] Phase Name`).
5. **Maximum autonomy within each phase** — architecture, naming, patterns and dependency decisions are made by agents without asking the user.
6. **Documented decisions** — every non-obvious choice is recorded in the handoff of the agent that made it.
7. **TDD is non-negotiable** — failing test before any implementation, no exceptions.
8. **Incremental commits** — commit after each milestone: foundation [3a], auth [3b], each feature (phase gate PASS), and final (scale gates/review). Never accumulate all work in a single commit at the end. Each commit must be atomic and functional (tests passing).
9. **Mandatory branch** — all implementation happens in `feature/[name]`, never on `main`. Merge to `main` only after BUILD COMPLETE.
10. **Docker always running before visual QA** — every visual wave (qa-design, qa-ux, qa-a11y, qa-e2e) and every `/browser-qa` require `docker compose up`. Check with `docker compose ps` before launching visual agents.
11. **App delivered running** — the build ALWAYS ends with the application accessible via Docker at `http://localhost:[port]`. Docker is NOT shut down after the build. BUILD COMPLETE includes the URL.
12. **Browser Audit is mandatory** — at the end of the build, `/browser-qa` runs with exhaustive navigation (all screens, all components). It is not optional. Fix loop until zero BLOCKER/MAJOR.
13. **Zero stubs / placeholders** — no UI element can exist as a stub ("coming soon", "TODO", "Lorem ipsum", button without action, empty page). If the feature will not be implemented in this build, the element MUST NOT exist in the UI. PM Validation checks completeness before commit.

---

## Failure Handling

| Situation | Behavior |
|-----------|----------|
| Research returns few results | Document the gap in RESEARCH.md, advance with what was found |
| Test does not pass after 3 attempts | Document in handoff, mark workstream PARTIAL, continue the rest |
| Architecture violation detected | Fix the violation, document the decision |
| Missing dependency | Install, document in handoff |
| Ambiguous requirement | Choose the simplest interpretation, document the assumption |
| Workstream BLOCKED (impossible) | Report in handoff, orchestrator decides whether to skip or adapt |
| Docker doesn't start | Read logs, fix config/code, re-launch. Max 3 attempts → escalate to user |
| App doesn't respond at URL | Check port, health check, web service logs. Fix and re-launch |
