---
name: qa-loop
description: Agentic QA orchestrator. Runs tiered quality gates (research, design, UX, backend, security, E2E) with automatic fix loops. Called from /build and /feature-dev at all quality gates.
argument-hint: <scope: what was built>
---

# /qa-loop — QA Agentic Loop

> **Extends:** `code-review@claude-plugins-official`
> Adds: multi-dimensional wave orchestration (design, UX, backend, security, a11y, E2E), automatic fix loop (max 3 iterations), and `/browser-qa` integration for exhaustive UI verification.
> The official plugin handles code review; this skill adds QA gates across all layers with auto-remediation.

Multi-dimensional QA orchestrator. Launches QA agents in parallel waves, aggregates findings into a structured QA Report, spawns fix agents for BLOCKER/MAJOR issues and iterates until PASS or escalates to the user.

---

## When to invoke

| Context | Dimensions |
|---------|-----------|
| Foundation [3a] — layout + design system | `qa-design` `qa-a11y` |
| Foundation [3b] — auth | `qa-backend` `qa-security` `qa-e2e` |
| After feature with UI + backend (e.g.: task dashboard) | `qa-design` `qa-ux` `qa-a11y` `qa-backend` `qa-security` `qa-e2e` |
| After backend-only feature (e.g.: scheduled job, webhook) | `qa-backend` `qa-security` `qa-code` |
| After UI-only feature (e.g.: new component, static page) | `qa-design` `qa-ux` `qa-a11y` |
| After feature with paginated lists or search endpoints | dimensions above + `qa-perf` |
| After feature with upload, export, or heavy operations | dimensions above + `qa-perf` |
| Dashboard with lots of data or charts (UI heavy) | `qa-design` `qa-ux` `qa-perf` `qa-a11y` |
| Payment or sensitive data feature | + `qa-security` required |
| After research/build (planning phase) | `qa-research` `qa-plan` |
| Post-deploy | `qa-smoke` |
| End of build | all dimensions + `/browser-qa` |
| Manual: `/qa-loop <scope>` | infer dimensions from scope |

---

## Token Budget

| Phase | Agents | Estimated budget |
|-------|--------|-----------------|
| Scope Analysis | — | ~2k |
| Wave 1A (static, up to 5) | qa-code, qa-security, qa-backend, qa-plan, qa-research | ~5 × 15k = 75k (parallel) |
| Wave 1B (overflow, if >5 static) | qa-perf | ~15k |
| Wave 2 (visual, up to 3) | qa-design, qa-ux, qa-a11y | ~3 × 20k = 60k (parallel) |
| Wave 3 (functional, sequential) | qa-e2e or /browser-qa | ~20-40k |
| Aggregate + Fix Loop | fix agents (up to 5/wave) | ~5 × 20k per iteration |
| **Total max (all dimensions, 1 iteration)** | | **~230k** |

> **Orchestrator checkpoint:** if the orchestrator context (not sub-agents) reaches **45k tokens** (not 60k — headroom for subsequent waves), write `.claude/checkpoint.md` and emit `↺ Context ~45k in qa-loop — wrote checkpoint. Continue or /compact + /resume.`

---

## Phase 0 — Scope Analysis

> **Emit:** `▶ [QA 0/6] Scope Analysis`

1. Identify what was built — read modified files (git diff or agent handoff)
2. Determine applicable dimensions:
   - Has UI? → `qa-design` + `qa-ux` + `qa-a11y`
   - Has API/backend? → `qa-backend` + `qa-security`
   - Has complete user flow? → `qa-e2e`
   - Is research phase? → `qa-research`
   - Is plan phase? → `qa-plan`
   - Has new code? → `qa-code` (always)
   - Has perf indicators or heavy endpoints? → `qa-perf`
3. Define `qa-e2e` scope: which specific flows to test (e.g.: auth, create board, create card)
4. Decompose into waves respecting **max 5 agents per wave** (RULE-AGENT-001):
   - Wave 1A (static): priority → `qa-code`, `qa-security`, `qa-backend`, `qa-plan`, `qa-research` (max 5)
   - Wave 1B (static overflow): `qa-perf` if needed (only if Wave 1A reached 5)
   - Wave 2 (visual, uses agent-browser): `qa-design`, `qa-ux`, `qa-a11y` (max 3 — limited by agent-browser)
   - Wave 3 (functional): `qa-e2e` or `/browser-qa` (sequential)
5. Emit complete plan before starting:

```
SCOPE:      [what was built]
DIMENSIONS: [list]
E2E FLOWS:  [list]

WAVE PLAN:
  Wave 1A (static):     [agents] — ~[N]k tokens
  Wave 1B (overflow):   [agents or "none"] — ~[N]k tokens
  Wave 2  (visual):     [agents or "none"] — ~[N]k tokens
  Wave 3  (functional): [agent or "none"]  — ~[N]k tokens
  Estimated total budget: ~[N]k tokens
```

---

## Phase 1 — Static Wave (parallel, no browser)

> **Emit:** `▶ [QA 1/6] Static QA Wave`

### Decomposition rule

If static dimensions ≤ 5 → launch all in Wave 1A at once.
If static dimensions > 5 → launch Wave 1A (5 agents) → wait → launch Wave 1B (remaining).

Wave 1A priority (if cutoff needed): `qa-security` > `qa-backend` > `qa-code` > `qa-plan` > `qa-research` > `qa-perf`.

Launches in parallel only agents applicable to the scope:

### Agent: qa-code

```
Role: Code quality auditor — architecture, TDD and clean code.
Read: all modified files in scope.
Check:
  □ Architecture: layers respected? Correct imports per layer?
  □ TDD: every behavior has test written first? RED→GREEN→REFACTOR?
  □ SOLID: SRP (function does one thing), OCP, LSP, ISP, DIP (depends on abstractions)?
  □ Clean code: names reveal intent? No magic numbers/strings? No dead code?
  □ Coverage: domain + application have corresponding unit tests?
  □ No old TODOs or commented-out code (use git history)
Output: QA_REPORT with BLOCKER|MAJOR|MINOR|OK per item + exact file:line
```

### Agent: qa-security

```
Role: Security auditor — injection, auth and data exposure.
Read: modified endpoints, controllers, adapters.
Check:
  □ SQL injection: parameterized queries or ORM? Never string concatenation with input
  □ XSS: user input never in dangerouslySetInnerHTML without sanitization
  □ Auth: protected routes verify authentication before processing?
  □ Auth: protected routes verify authorization (not just authentication)?
  □ Secrets: no API key, password or token hardcoded in code
  □ CORS: explicit policy, no wildcard in production
  □ Data exposure: responses do not expose sensitive fields (password hash, internal tokens, sequential IDs)
  □ Input sanitization: user input sanitized before storing
  □ Rate limiting: public endpoints have protection?
Output: QA_REPORT with BLOCKER|MAJOR|MINOR|OK + evidence (file:line)
```

### Agent: qa-backend

```
Role: API + backend quality auditor.
Read: modified route handlers, controllers, use cases.
Check:
  □ Input validation: all API inputs validated before processing
  □ Error handling: all errors caught, structured response returned
  □ HTTP semantics: correct methods (GET/POST/PUT/PATCH/DELETE), correct status codes
  □ Response format: consistent success and error format across all endpoints
  □ Auth gates: protected endpoints reject without token → 401, invalid token → 401, no permission → 403
  □ Idempotency: POSTs that create resources handle duplicates (unique constraint or check)
  □ N+1 queries: queries inside loops identified and resolved
  □ Pagination: list endpoints have pagination?
Output: QA_REPORT with BLOCKER|MAJOR|MINOR|OK + file:line
```

### Agent: qa-research

```
Role: Research quality auditor — rigor and completeness of research.
Read: RESEARCH.md
Check:
  □ All library choices referenced to real findings (not "we chose it because it's popular")
  □ Trade-offs documented for each major architectural decision
  □ Domain-specific pitfalls section (not generic)
  □ Multiple sources consulted per topic (not just one)
  □ No critical decision made "by default" without documented justification
  □ References with real URLs (not invented links)
Output: QA_REPORT with MAJOR|MINOR|OK
```

### Agent: qa-plan

```
Role: Plan quality auditor — BDD completeness and architectural coverage.
Read: PLAN.md, .feature files in tests/bdd/features/
Check:
  □ Each user story has at least 1 Gherkin scenario (happy path)
  □ Edge cases documented as separate scenarios
  □ Scenarios use domain terminology (not technical terms)
  □ Architecture mapping covers all necessary layers
  □ Definition of Done has measurable criteria (not vague)
  □ Test plan covers unit + integration + E2E + load (if applicable)
  □ No "TBD" or deferred decisions on critical items
Output: QA_REPORT with BLOCKER|MAJOR|MINOR|OK
```

### Agent: qa-perf

```
Role: Performance auditor — bundle, queries, caching and response times.
Read: modified files in scope; k6 results in tests/load/ if they exist; Lighthouse CI reports if they exist.
Check:
  □ Bundle: chunks > 500kB without lazy loading? Heavy deps imported entirely (lodash, moment)?
  □ N+1: queries inside loops? ORM associations lazy-loaded in iteration?
  □ Missing indexes: FK columns or columns used in WHERE/ORDER without index?
  □ Caching: identical data fetched multiple times per request without request cache?
  □ API p95: k6 results available? GET > 200ms or POST > 500ms?
  □ Blocking ops: email, file processing or external API calls inline in request handler?
  □ Connection pool: DB client configured with explicit pool (not default)?
  □ Compression: gzip/brotli enabled on HTTP server?
  □ Regression guardrails: Lighthouse CI config exists? k6 thresholds defined?
Output: QA_REPORT with BLOCKER|HIGH|MEDIUM|OK + file:line for each finding
Note: for complete performance audit (all 6 phases) → invoke /perf-audit directly
```

---

## Phase 2 — Visual Wave (parallel, uses agent-browser)

> **Emit:** `▶ [QA 2/6] Visual QA Wave`

### Prerequisite — check agent-browser CLI

Before launching visual agents, ensure `agent-browser` CLI is installed:

```bash
which agent-browser && agent-browser --version
```

If not found → install automatically:

```bash
npm install -g agent-browser && agent-browser install
```

Check again with `agent-browser --version`. If still not available after 2 attempts → **skip Wave 2 and emit alert**:

```
⚠️ agent-browser CLI not available — Visual Wave SKIPPED
Dimensions qa-design, qa-ux, qa-a11y were NOT verified.
Install manually: npm install -g agent-browser && agent-browser install
```

**Visual Wave without agent-browser is a MAJOR in the QA Report** — it is not silent.

### Execution

Uses agent-browser to navigate pages in scope. Launches in parallel:

### Agent: qa-design

```
Role: Visual design auditor — alignment, spacing and consistency.
Actions: agent-browser → open each page/component in scope, take screenshots.
Check:
  □ Alignment: elements aligned to grid? No arbitrary positioning?
  □ Spacing: consistent? Uses design system tokens (not arbitrary px)?
  □ Typography: clear hierarchy (h1 > h2 > body > caption)? Max 3 sizes per context?
  □ States: loading / error / empty states exist for all data-dependent components?
  □ Interactive elements: all have visible hover + focus + active states?
  □ Responsiveness: no horizontal scroll on mobile? No overflow? Layout adapts?
  □ Overlapping: no elements overlapping unexpectedly? (z-index controlled)
  □ Design system: using primitives (shadcn/ui)? Not reinventing buttons, inputs, cards with divs?
  □ Icons: consistent library (Lucide or similar), not mixed with other sources?
  □ Contrast: text readable? (WCAG AA: 4.5:1 minimum for normal text)
  □ Dark/light mode: works in both if configured?
Evidence: screenshot of each issue found
Output: QA_REPORT with BLOCKER|MAJOR|MINOR|OK + screenshot path
```

### Agent: qa-ux

```
Role: UX flow auditor — usability, feedback and recovery.
Actions: agent-browser → simulate user flows in scope.
Check:
  □ Primary flow: user can complete the main task without instructions?
  □ Immediate feedback: actions have loading state? Success/error confirmed visually?
  □ Recovery: every error state has a clear recovery path (not dead end)?
  □ Navigation: user knows where they are? Breadcrumb or position indicator?
  □ Confirmation: destructive actions (delete, logout, cancel) request confirmation?
  □ Form validation: real-time + helpful messages (what to do, not just "invalid field")
  □ Empty states: explain what to do ("Create your first board →"), not just "no data"
  □ Consistency: consistent interaction patterns across the entire app?
  □ Affordance: is it obvious what is clickable/interactive?
Output: QA_REPORT with BLOCKER|MAJOR|MINOR|OK
```

### Agent: qa-a11y

```
Role: Accessibility auditor — keyboard, ARIA and contrast.
Actions: inspect code + agent-browser.
Check:
  □ Keyboard nav: all interactive elements accessible via Tab (no traps)?
  □ Focus visible: focus outline not removed by CSS (outline: none)?
  □ Images: descriptive alt text? (or alt="" if decorative)
  □ Forms: all inputs have associated <label> (not just placeholder)?
  □ ARIA: correct roles (role="button" on clickable divs, aria-label where needed)?
  □ Touch targets: clickable elements ≥ 44×44px on mobile?
  □ Color: information not conveyed by color alone (icon + color, not just color)?
  □ Headings: correct hierarchy (h1 → h2 → h3, no skipped levels)?
Output: QA_REPORT with BLOCKER|MAJOR|MINOR|OK
```

---

## Phase 3 — Functional Wave (agent-browser sequential)

> **Emit:** `▶ [QA 3/6] Functional QA Wave`

### Agent: qa-e2e

```
Role: Functional E2E auditor — complete flows in the browser.
Actions: agent-browser → execute each flow defined in scope.

For apps with auth (always check):
  □ Register: create new account → success + correct redirect?
  □ Valid login: correct credentials → success + correct redirect?
  □ Invalid login: wrong credentials → helpful error message (not crash)?
  □ Protected route without auth → redirect to login (not 404 or error)?
  □ Logout → session cleared + correct redirect?
  □ Login after logout → works?

For each feature in scope:
  □ Primary flow (happy path): user can complete?
  □ Error flow: what happens with invalid input?
  □ Links/buttons: all feature links lead to correct destination?
  □ Persistence: created data persists after page reload?
  □ Loading feedback: slow operations show loading state?

Evidence: screenshot of each critical step, console error log
Output: QA_REPORT with BLOCKER|MAJOR|MINOR|OK + mandatory evidence per BLOCKER
```

> **End of build gate (all dimensions):** replace qa-e2e with `/browser-qa <url>`.
> `/browser-qa` does exhaustive navigation (all components, menus, clickables) instead of
> only predefined flows. The `/browser-qa` QA Report replaces the qa-e2e QA_REPORT.

---

## Phase 4 — Aggregate QA Report

> **Emit:** `▶ [QA 4/6] Aggregate Report`

Consolidates all reports from waves:

```
QA REPORT: [scope]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status:    PASS | FAIL
Iteration: [N/3]

BLOCKERS — block progression (must be fixed before advancing):
  [qa-dimension] [file:line or component] — [specific and actionable description]
  Ex: [qa-e2e]    auth/login — post-login redirect broken: stays on /login after submit
  Ex: [qa-design] BoardCard.tsx — overlapping elements on mobile (missing overflow: hidden)
  Ex: [qa-backend] POST /api/boards — input.title undefined not rejected → creation with null title

MAJORS — degrade quality (fix before finalizing):
  [qa-dimension] [file:line or component] — [specific and actionable description]
  Ex: [qa-security] boards/route.ts:42 — no authorization check (any user can delete another's board)
  Ex: [qa-ux] CreateBoard — no loading feedback on save (user clicks multiple times)

MINORS — recommended improvements (non-blocking):
  [qa-dimension] [component] — [suggestion]

OK — dimensions that passed:
  [qa-dimension] — PASS ([N] items verified)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Automatic decision:**
- `BLOCKERS or MAJORS exist` → **Phase 5 (Fix Loop)**
- `Only MINORS or no issues` → **Phase 6 (PASS)**

---

## Phase 5 — Fix Loop

> **Emit:** `▶ [QA 5/6] Fix Loop — Iteration [N/3]`

**Maximum 3 iterations. If FAIL after iteration 3 → Escalate to user.**

### Issue prioritization

Within each iteration, prioritize in order:
1. **BLOCKER from qa-security** — vulnerability risk in production
2. **BLOCKER from qa-e2e / qa-backend** — app does not work
3. **BLOCKER from qa-design** — UI broken
4. **MAJOR from qa-security**
5. **MAJOR from remaining dimensions**

If BLOCKERs + MAJORs > 5 in an iteration → resolve the 5 highest priority first; remaining go to next iteration.

### Per iteration:

**5.1 — Select issues** (max 5, by priority above)

**5.2 — Spawn fix agents** (one per selected issue, in parallel):

```
Fix Agent: [issue id, e.g.: "qa-e2e/auth-redirect"]
Task: Fix SPECIFICALLY: [exact description of BLOCKER/MAJOR from QA Report]
Target file: [file:line]
Required fix: [specific action inferred from report]
Context: [handoff with complete QA Report + files relevant to issue]
Restriction:
  - Max 20k tokens (surgical fix — does not need full project context)
  - Fix ONLY this specific issue
  - Do not refactor adjacent code unrelated to the issue
  - If fix requires > 20k tokens → report "fix requires redesign" and do not attempt
Mandatory output: list of modified files + fix description + confirmation "FIXED" or "NEEDS_REDESIGN"
```

> **Why 20k per fix agent (not 100k)?** Surgical fix reads at most 3-5 files + the report. 100k would be wasted on unnecessary context. If a fix genuinely needs more context, it signals a structural problem → escalate.

**5.3 — Wait** for completion of all fix agents

**5.4 — Re-run only affected QA agents** (not the entire wave):
- `qa-design` issue? → re-run only `qa-design` (budget: 15k)
- `qa-e2e` issue? → re-run only `qa-e2e` for the affected flow (budget: 15k)
- `qa-backend` issue? → re-run only `qa-backend` for the affected endpoint (budget: 10k)
- `qa-security` issue? → re-run only `qa-security` (budget: 10k)

**5.5 — Checkpoint if needed:**
If orchestrator context reached **45k tokens** during fix loop → write checkpoint before starting next iteration.

**5.6 — Evaluate result:**
- No BLOCKERS/MAJORS → **Phase 6 (PASS)**
- Remaining BLOCKERS/MAJORS and iteration < 3 → next iteration (back to 5.1 with remaining issues)
- Iteration 3 reached with issues → **Escalate**

### Escalate condition:

```
⚠️ QA ESCALATE: [scope]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
After 3 fix iterations, the following issues persist:

[list of unresolved issues with attempt history]

Possible causes:
  - Structural problem requiring redesign
  - External dependency not available in dev environment
  - Ambiguous requirement needing human decision

Required action: manual review.
Suggestion: [specific recommendation based on issue type]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Phase 5b — Post-Deploy Validation (optional, if /deploy was executed)

> **Emit:** `▶ [QA 5b] Post-Deploy Smoke Tests`

Execute only when `qa-smoke` is in the scope dimension set (context: post-deploy).

### Agent: qa-smoke

```
Role: Post-deploy smoke tester — validates that the production environment is healthy after deploy.
Actions: direct HTTP requests to the production URL (not localhost).
Requires: production URL available in context (via /deploy handoff or argument).

Health check:
  □ GET /health (or /api/health, /healthz) → must return 200 in < 2s
  □ GET / (home/root) → must return 200, no 5xx

Main routes (test the primary app routes — infer from plan or route structure):
  □ Each main public route → 200, no 5xx, no redirect loop
  □ Protected route without auth → 401 or redirect to login (not 500)

Auth flow quick check (if auth exists):
  □ POST /api/auth/login with test credentials → 200 or 422 (not 500)
  □ Response contains expected structure (token or session)

Console / response errors:
  □ No 5xx response in any check
  □ No "Cannot connect to database" or equivalent in error body

Output: SMOKE_REPORT with PASS | FAIL per check + URL + received status code
```

**Automatic post-smoke decision:**
- All checks PASS → emit `✅ SMOKE PASS — deploy validated`
- Any check FAIL → emit immediate alert:

```
⚠️ SMOKE FAIL — DEPLOY ROLLBACK RECOMMENDED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Environment: [production URL]
Failed checks:
  [check] [URL] → expected: [code] | received: [code]

Recommended action: immediate rollback via /deploy rollback or deploy platform.
Do not investigate root cause before rollback — production is degraded.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Phase 6 — Final QA Report

> **Emit:** `▶ [QA 6/6] Final Report`

```
QA COMPLETE: [scope]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status:     ✅ PASS
Iterations: [N] (1 = passed first time | 2-3 = fixes applied)

Dimensions verified:
  qa-code      ✅ PASS ([N] items)           (if applicable)
  qa-security  ✅ PASS ([N] items)           (if applicable)
  qa-backend   ✅ PASS ([N] items)           (if applicable)
  qa-research  ✅ PASS ([N] items)           (if applicable)
  qa-plan      ✅ PASS ([N] items)           (if applicable)
  qa-design    ✅ PASS ([N] items)           (if applicable)
  qa-ux        ✅ PASS ([N] items)           (if applicable)
  qa-a11y      ✅ PASS ([N] items)           (if applicable)
  qa-e2e       ✅ PASS ([N] flows)           (if applicable)
  qa-perf      ✅ PASS ([N] items)           (if applicable)
  qa-smoke     ✅ PASS ([N] checks)          (if post-deploy)

Issues resolved: [N] BLOCKERs, [N] MAJORs in [N] iterations
Pending issues (MINOR): [list — record as backlog]

Pipeline: ✅ can proceed to next phase.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## QA Loop Rules

1. **QA agents are independent** — they do not know the dev's intent, only what is working
2. **Fix agents are surgical** — they fix only the specific issue, never refactor adjacent code
3. **Mandatory evidence** — every BLOCKER/MAJOR must have file:line or screenshot
4. **MINOR never blocks** — documented for backlog, does not prevent progression
5. **Re-run only affected** — does not run the entire wave again after fix
6. **Max 3 iterations** — persistent problem after 3 is systemic → escalate to user
7. **Max 5 agents per wave** — RULE-AGENT-001: split into Wave 1A/1B if >5 static dimensions
8. **Budget per agent**: QA agents: 15k | Fix agents: 20k | qa-e2e/browser-qa: 40k
9. **Orchestrator checkpoint at 45k** — not 60k, to have headroom for subsequent waves
10. **Fix with NEEDS_REDESIGN** → escalate immediately, do not wait for 3 iterations

---

## Quick reference — dimensions per /build phase

| Gate | Dimensions |
|------|-----------|
| Research complete | `qa-research` |
| Plan approved | `qa-plan` |
| Foundation [3a] layout | `qa-design` |
| Foundation [3b] auth | `qa-backend` `qa-security` `qa-e2e` |
| Feature UI | `qa-design` `qa-ux` `qa-e2e` + `/browser-qa` |
| Feature backend | `qa-backend` `qa-security` `qa-code` |
| Full-stack feature | all except `qa-research` and `qa-plan` + `/browser-qa` |
| Feature with endpoints or UI heavy | dimensions above + `qa-perf` (or `/perf-audit` for complete audit) |
| Post-deploy | `qa-smoke` |
| End of build | all + `/browser-qa` (exhaustive navigation — replaces qa-e2e) |
