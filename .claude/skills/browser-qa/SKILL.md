---
name: browser-qa
description: Exhaustive browser QA using Cypress (programmatic) + agent-browser CLI (visual/exploratory). Crawls all pages, clicks all interactive elements, runs Cypress specs in loop until zero failures and zero BLOCKER/MAJOR. Requires agent-browser CLI + Cypress installed.
disable-model-invocation: true
argument-hint: <application url — e.g.: http://localhost:3000>
---

# /browser-qa — Exhaustive Browser QA

Dual-engine QA: **Cypress** (programmatic, deterministic) + **agent-browser CLI** (visual, exploratory).
Both run in loop until the application is **100% functional** — zero Cypress failures, zero BLOCKER/MAJOR in browser.

**Engines:**
- `agent-browser` CLI — visual navigation, exploratory clicks, visual error detection
- Cypress — deterministic E2E specs, covering all defined flows
- Loop until: Cypress 0 failures ∧ agent-browser 0 BLOCKER/MAJOR

**Prerequisites:** `agent-browser` CLI (`npm install -g agent-browser`) + `npx cypress` available.

---

## When to invoke

| Context | When |
|---------|------|
| After any UI delivery | Before marking feature as DONE |
| Final gate of `/build` | Always — all pages |
| Manual on demand | `/browser-qa <url>` |
| After UI bug fix | To verify regression |

---

## Prerequisite — agent-browser CLI (REQUIRED)

Before any phase, ensure the `agent-browser` CLI is installed and functional.

### Verification

```bash
# Check if CLI is installed
which agent-browser && agent-browser --version
```

### Installation (if not found)

```bash
# Install globally
npm install -g agent-browser
# Install browser engine (Chrome for Testing)
agent-browser install
```

### If it fails

If after installation the command is still not found:
1. Check Node.js/npm is in PATH: `which npm`
2. Try with explicit path: `npx agent-browser --version`
3. If still failing after 2 attempts → **stop and escalate to user**:

```
⛔ AGENT-BROWSER NOT AVAILABLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
agent-browser CLI not found after 2 install attempts.

Install manually:
  npm install -g agent-browser && agent-browser install

After installing, run /browser-qa again.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Do not proceed without functional agent-browser.** This is the visual navigation engine — without it, browser-qa cannot test the application.

---

## Phase 0 — Configuration

> **Emit:** `▶ [BROWSER-QA 0/6] Configuration`

1. Receive application base URL (argument or infer from project — `localhost:3000` by default)

2. **Verify the application is running (REQUIRED):**

   ```bash
   # Check if Docker is up
   rtk docker compose ps
   ```

   - If services **are not running** → start automatically:
     ```bash
     rtk docker compose up -d
     ```
   - Wait for health check (polling up to 60s): `rtk docker compose ps` until all healthy/running
   - If fails after 60s → `rtk docker compose logs` → emit error with logs and stop
   - Test URL access: `curl -s -o /dev/null -w "%{http_code}" http://localhost:[port]`
   - If URL does not respond → check logs, fix, re-launch (max 3 attempts)
   - **Do not proceed to Discovery without accessible URL**

3. Read route files for early discovery:
   - Next.js: `app/**/page.tsx`, `pages/**/*.tsx`
   - React Router: files with `<Route`, `createBrowserRouter`
   - Express/Rails/Django: routes files
4. Read `PLAN.md` or `RESEARCH.md` if they exist — extract list of interface requirements for later validation
5. Define scope: base URL + list of known routes + test credentials (if auth exists)
6. Emit: `Application accessible at [url]. Scope: [N] known routes + dynamic crawl. Auth: [yes/no].`

---

## Phase 1 — Discovery

> **Emit:** `▶ [BROWSER-QA 1/6] Discovery`

**Agent: browser-discovery**

```
Role: Application route and element mapper.
Tool: agent-browser CLI
Actions:
  1. Open base URL
  2. Capture screenshot of initial state
  3. Extract all links (<a href>), navigation buttons, menu items
  4. For each discovered route: visit and repeat extraction (max 2 levels deep)
  5. For apps with auth: log in with test credentials before mapping protected routes
  6. Record: URL, page title, type (public/protected), interactive elements found

Output:
  SITEMAP.md with:
  - Complete route list (URL, title, type, number of interactive elements)
  - Interactive elements per page (buttons, links, forms, menus, dropdowns, modals)
  - Elements that require specific state (e.g.: modal opens only after action)
  - Errors found during discovery (404, redirect loop, crash)
```

---

## Phase 2A — Cypress Run (programmatic)

> **Emit:** `▶ [BROWSER-QA 2A/6] Cypress Run`

```bash
rtk npx cypress run --reporter json --reporter-options "output=.claude/cypress-results.json"
```

Read `.claude/cypress-results.json` after execution:
- Extract: total specs, passing, failing, pending
- For each failure: spec file + test name + error message + screenshot path
- If **0 failures** → Cypress PASS, continue to Phase 2B
- If **failures > 0** → list all in `.claude/cypress-failures.md` and go to Phase 4 (Fix Loop) before visual crawl

> **Note:** Cypress tests predefined flows (register, login, feature flows).
> Agent-browser tests what Cypress does not cover: non-scripted elements, visual errors, unexpected states.

---

## Phase 2B — Exhaustive Visual Crawl (agent-browser)

> **Emit:** `▶ [BROWSER-QA 2B/6] Visual Crawl — [N] pages`

Launches agents in parallel (max 5), one per page group:

**Agent: browser-crawler-[N]**

```
Role: Exhaustive navigator — tests like a real user.
Tool: agent-browser CLI
Input: page list from SITEMAP.md (subset per agent)

For each page:
  1. Navigate to URL
  2. Capture initial screenshot
  3. For EACH interactive element (button, link, input, select, dropdown, modal trigger):
     a. Click / hover / focus
     b. Record: what happened? (navigation, modal, state, error, nothing)
     c. Screenshot if state changed or error occurred
     d. Press Escape / go back before next element
  4. Test forms:
     - Empty submit → validation appears with clear message?
     - Invalid data submit → helpful message (not just "invalid field")?
     - Valid data submit → success + visual feedback?
  5. Capture: JS console errors, network failures (4xx/5xx), warnings
  6. Responsiveness: resize to 375px (mobile), repeat screenshot
  7. Check: overlapping elements, horizontal overflow, broken layout

Output: CRAWL_REPORT_[N].md
  - Element | Action | Result | Screenshot | Error
```

---

## Phase 3 — Detection and Classification

> **Emit:** `▶ [BROWSER-QA 3/6] Detection and Classification`

**Agent: browser-classifier**

```
Role: Interface error classifier.
Input: all CRAWL_REPORT_N.md + SITEMAP.md + PLAN.md requirements (if exists)

For each item in reports, classify:

BLOCKER (prevents use):
  - Crash / white screen / unhandled JS error
  - Button/link that does nothing (no action, no feedback)
  - Form that does not submit or submits without required field validation
  - 404 route that should exist
  - Protected route accessible without authentication
  - Data does not persist after reload
  - Stub / placeholder in UI: "coming soon", "em breve", "TODO", "Lorem ipsum", "under construction", empty page with placeholder text
  - Feature listed in PLAN.md but not implemented (element exists in UI without real functionality)

MAJOR (significantly degrades):
  - Interactive element without visual feedback (hover, active, focus)
  - Non-informative error message ("Error", "Something went wrong")
  - Broken layout on mobile (horizontal overflow, overlapping elements)
  - Missing empty state (empty list without explanation)
  - Destructive action without confirmation
  - Missing loading state on operation > 500ms
  - Inconsistency with PLAN.md requirements

MINOR (recommended improvement):
  - Truncated text without tooltip
  - Missing animation expected by design system
  - Minor visual inconsistency (spacing, color slightly off standard)

OK:
  - Element works as expected

Output: BROWSER_QA_REPORT.md with:
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  BROWSER QA REPORT — [date/time]
  Application: [url]
  Pages navigated: [N] | Elements tested: [N]
  Status: PASS | FAIL
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  BLOCKERS ([N]):
    [page] | [element] | [description] | [screenshot]

  MAJORS ([N]):
    [page] | [element] | [description] | [screenshot]

  MINORS ([N]):
    [page] | [element] | [suggestion]

  OK: [N] elements without issues
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Save in `.claude/browser-qa-report.md`.

---

## Phase 3 — Detection and Classification (merge Cypress + Visual)

> **Emit:** `▶ [BROWSER-QA 3/6] Detection and Classification`

**Agent: browser-classifier**

```
Input: cypress-failures.md (if exists) + all CRAWL_REPORT_N.md + SITEMAP.md + PLAN.md (requirements)

Classify each issue found:

BLOCKER:
  - Any Cypress test failing (always BLOCKER)
  - Crash / white screen / unhandled JS error
  - Button/link with no action (no response, no feedback)
  - Form that does not submit or does not validate required fields
  - 404 route that should exist
  - Protected route accessible without authentication
  - Data does not persist after reload
  - Stub / placeholder detected: "coming soon", "em breve", "TODO", "Lorem ipsum", "under construction", empty page
  - Feature in PLAN.md not implemented (UI element exists but has no real functionality)

MAJOR:
  - Interactive element without visual feedback
  - Non-informative error message
  - Broken layout on mobile
  - Missing empty state
  - Destructive action without confirmation
  - Missing loading state on operation > 500ms
  - Inconsistency with PLAN.md requirements

MINOR: improvements with no functional impact

Output: BROWSER_QA_REPORT.md (see format in previous Phase)
```

---

## Phase 4 — Fix Agent Dispatch

> **Emit:** `▶ [BROWSER-QA 4/6] Fix Dispatch — Iteration [N/3]`

**If PASS (zero BLOCKER and MAJOR):** skip to Phase 6.

**If FAIL:** launch fix agents in parallel (max 5), one per BLOCKER/MAJOR:

```
Fix Agent: [issue id — e.g.: "home/cta-button-no-action"]
Task: Fix SPECIFICALLY: [exact description of BLOCKER/MAJOR]
Type: frontend | backend | full-stack (infer from error type)
Probable file: [infer from component/route]
Required fix: [specific action — e.g.: "add onClick handler", "return 400 if title absent"]
Evidence: [screenshot path or error log]
Context: [handoff with BROWSER_QA_REPORT.md + relevant files]
Restrictions:
  - Max 100k tokens
  - Fix ONLY this issue
  - Do not refactor adjacent code
  - If backend: validate that fix does not break API contract
Mandatory output: modified files + fix description
```

**Automatic routing by type:**
- UI/CSS/layout error → fix agent frontend
- Form validation error (client-side) → fix agent frontend
- API error (4xx/5xx) → fix agent backend
- Protected route accessible → fix agent backend (middleware/guard)
- JS crash from unexpected data → fix agent full-stack (null check + API contract)

---

## Phase 5 — Dual Re-verification (Cypress + Visual)

> **Emit:** `▶ [BROWSER-QA 5/6] Re-verification — Iteration [N/3]`

### 5.1 — Re-run Cypress (only affected specs)

```bash
# Re-run only the specs that failed (not the entire suite)
rtk npx cypress run --spec "tests/e2e/[affected-specs]" --reporter json \
  --reporter-options "output=.claude/cypress-results-iter[N].json"
```

Read results: are there still failures? → note for next iteration

### 5.2 — Visual Re-navigation (agent-browser)

```
Role: Post-fix verifier.
Tool: agent-browser CLI
Input: list of pages/elements affected by fixes

For each fixed issue:
  1. Navigate to the affected page
  2. Repeat the exact action that caused the error
  3. Verify correct behavior
  4. Verify there is no regression in adjacent pages
  5. Capture confirmation screenshot

Output: VERIFICATION_REPORT_iter[N].md
  - Issue | Status (RESOLVED | STILL_FAILING | REGRESSION) | Screenshot
```

### 5.3 — Decision

**PASS if:** Cypress 0 failures ∧ agent-browser 0 BLOCKER/MAJOR → **Phase 6**
**FAIL if:** any failure or remaining BLOCKER/MAJOR:
  - iteration < 3 → go back to Phase 4 (next iteration)
  - iteration = 3 → **Escalate**

```
⚠️ BROWSER-QA ESCALATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
After 3 iterations, the following issues persist:

[list with attempt history per issue]

Possible causes:
  - Structural problem (requires component/API redesign)
  - Race condition or complex state management
  - External service dependency not available in dev
  - Ambiguous requirement — needs human decision

Required action: manual review.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Phase 6 — Final Report

> **Emit:** `▶ [BROWSER-QA 6/6] Final Report`

```
BROWSER QA COMPLETE ✅
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
URL:       [url]
Iterations: [N/3]

Cypress:
  Specs:   [N] | Passing: [N] | Failing: 0 ✅

Agent-Browser:
  Pages:      [N] navigated
  Elements:   [N] tested
  Forms:      [N] tested
  Viewports:  desktop (1280px) + mobile (375px)
  BLOCKERs:   0 ✅ | MAJORs: 0 ✅

Issues fixed this session:
  Cypress failures: [N] → 0
  BLOCKERs: [N] → 0
  MAJORs:   [N] → 0

Pending (MINOR — backlog):
  [list]

Report: .claude/browser-qa-report.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The application is functional. ✅ Can proceed.
```

---

## Rules

1. **Total coverage** — every visible interactive element must be tested, no exceptions
2. **Clean state between elements** — Escape / go back after each interaction before testing the next
3. **Auth before everything** — login done before any test in protected area
4. **Mandatory screenshot** — every BLOCKER/MAJOR has evidence screenshot
5. **Surgical fix** — fix agents fix ONLY the specific issue
6. **Post-fix verification** — re-navigate affected areas, do not assume it is fixed
7. **Max 3 iterations** — if it persists after 3, escalate to user
8. **Max 5 parallel agents** — follow RULE-AGENT-001
