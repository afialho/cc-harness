---
name: debug
description: Structured debugging and troubleshooting. Diagnoses failures during build, test, or deploy with systematic hypothesis elimination and fix verification.
disable-model-invocation: true
argument-hint: <error description or "last failure">
---

# /debug — Structured Debugging & Troubleshooting

> Systematic diagnostic process for failures during build, test, deploy, or runtime.
> Replaces ad-hoc debugging with a reproducible 6-phase protocol.

---

## Pipeline Overview

```
/debug [error description or "last failure"]
    │
    ├─ [1/6] Error Capture
    │         ├─ read error output
    │         ├─ classify error type
    │         └─ extract key details + recent changes
    │
    ├─ [2/6] Hypothesis Generation
    │         └─ 3-5 hypotheses ranked by likelihood
    │
    ├─ [3/6] Systematic Investigation
    │         └─ confirm or eliminate each hypothesis
    │
    ├─ [4/6] Applying Fix
    │         └─ minimal change targeting root cause
    │
    ├─ [5/6] Verification
    │         └─ re-run failing command + regression check
    │
    └─ [6/6] Prevention
              └─ test gap, config guard, or pattern doc
```

---

## When to invoke

- Build fails mid-pipeline (Docker, dependencies, compilation)
- Tests fail unexpectedly (flaky, environment, race conditions)
- Deploy fails (health check, startup, configuration)
- Runtime errors (crashes, 500s, performance degradation)
- QA gate failures that resist automatic fix loops
- Any error where the root cause is not immediately obvious

---

## Phase 1 — Error Capture

> **Emit:** `▶ [1/6] Error Capture`

### 1.1 — Read the error

If an error description is provided as argument, use it. Otherwise:

1. Check the terminal output for the last failed command
2. Read test output files if the failure was in tests
3. Check Docker logs if the failure is container-related: `rtk docker compose logs --tail=100`
4. Check application logs for runtime errors

### 1.2 — Classify the error type

| Error Type | Indicators |
|-----------|-----------|
| **Build/compilation** | Syntax error, type error, missing import, module not found |
| **Dependency/package** | Version conflict, peer dependency, missing package, lock file mismatch |
| **Docker/infrastructure** | Container exit code, port conflict, volume permission, network error |
| **Test failure (unit)** | Assertion failed, expected vs actual mismatch, mock setup error |
| **Test failure (integration)** | Connection refused, timeout, service unavailable, fixture error |
| **Test failure (E2E)** | Element not found, navigation timeout, screenshot diff, Cypress/Playwright error |
| **Runtime error** | Unhandled exception, 500 response, segfault, OOM, deadlock |
| **Configuration error** | Missing env var, invalid port, wrong path, permission denied |

### 1.3 — Extract key details

Capture and present:

```
ERROR CAPTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Type:        [classification from 1.2]
Command:     [the command that failed]
Error:       [key error message — first meaningful line]
File:        [affected file:line if available]
Stack trace: [top 3 frames if available]
Exit code:   [if applicable]
```

### 1.4 — Check recent changes

```bash
rtk git diff HEAD~3 --stat
rtk git log --oneline -5
```

Correlate: did the error appear after a specific commit? If the error file was recently modified, that commit is the prime suspect.

---

## Phase 2 — Hypothesis Generation

> **Emit:** `▶ [2/6] Hypothesis Generation`

Generate 3-5 hypotheses ranked by likelihood. Use the error classification from Phase 1 combined with common failure patterns for the detected stack.

### Hypothesis table format

| # | Hypothesis | Likelihood | Evidence |
|---|-----------|-----------|----------|
| 1 | [most likely cause] | High | [what supports this] |
| 2 | [second cause] | Medium | [what supports this] |
| 3 | [third cause] | Low | [what supports this] |

### Hypothesis sources (in priority order)

1. **Error message text** — literal interpretation of what the error says
2. **Stack trace** — call chain analysis, which layer failed
3. **Recent changes** — git diff correlation with the error location
4. **Known failure patterns** for the detected stack (see common patterns below)
5. **Environment differences** — Docker version, node version, OS, CI vs local

### Common failure patterns by category

**Build errors:**
- Missing dependency after branch switch (stale node_modules / lock file)
- TypeScript strict mode catching a new type error
- Circular dependency causing undefined import
- Wrong Node.js / Python / Go version (nvm/pyenv mismatch)

**Test errors:**
- Database not running or not migrated (Docker container down)
- Port conflict from a previous test run that didn't clean up
- Race condition in async test (missing await)
- Stale test fixtures / snapshots after schema change
- Environment variable missing in test context

**Docker errors:**
- Port already in use on host (`lsof -i :[port]`)
- Volume permission mismatch (Linux UID vs container UID)
- Out of disk space (`docker system df`)
- Stale image cache after Dockerfile change
- Network conflict between compose projects

**Deploy errors:**
- Missing environment variable in production config
- Health check endpoint not responding (app crash on startup)
- Database migration not applied before deploy
- Secret not configured in the deploy target

**Runtime errors:**
- Unhandled promise rejection (missing try/catch or .catch)
- N+1 query causing timeout under load
- Memory leak from unclosed connections / event listeners
- CORS misconfiguration blocking frontend requests

---

## Phase 3 — Investigation

> **Emit:** `▶ [3/6] Systematic Investigation`

For each hypothesis (starting from highest likelihood):

### 3.1 — Design a minimal check

Each check should be a single command or file read that definitively confirms or eliminates the hypothesis.

**Examples of good checks:**

| Hypothesis | Check |
|-----------|-------|
| Missing dependency | `rtk npm ls [package]` — is it installed? |
| Port conflict | `lsof -i :[port]` — who is using it? |
| Docker container down | `rtk docker compose ps` — is the service running? |
| Missing env var | `rtk docker compose exec api env \| grep VAR_NAME` |
| Stale migration | `rtk docker compose exec api npx prisma migrate status` |
| Wrong Node version | `node --version` vs `.nvmrc` content |
| Type error in file | Read the file at the reported line number |
| Test fixture stale | Compare schema definition with test fixture |

### 3.2 — Execute and record

For each hypothesis, execute the check and record the result:

```
Hypothesis 1: [description]
  Check: [command or action]
  Result: CONFIRMED / ELIMINATED / INCONCLUSIVE
  Details: [what was found]
```

### 3.3 — Decision logic

- **CONFIRMED** → proceed to Phase 4 with this root cause
- **ELIMINATED** → move to next hypothesis
- **INCONCLUSIVE** → refine the check, then re-evaluate
- **All eliminated** → generate 3 new hypotheses based on investigation findings
- **Max 3 investigation rounds** → if still unresolved, escalate to user with full findings:

```
⚠ ESCALATION: Could not determine root cause after 3 investigation rounds.

Findings so far:
  [summary of all checks performed and results]

Possible next steps for manual investigation:
  1. [suggestion]
  2. [suggestion]
  3. [suggestion]
```

---

## Phase 4 — Fix

> **Emit:** `▶ [4/6] Applying Fix`

### 4.1 — Identify the minimal change

Based on the confirmed root cause, determine the smallest change that resolves the issue.

### 4.2 — Apply the fix

Edit the file, update the config, fix the dependency, or adjust the infrastructure.

### 4.3 — Document the change

```
FIX APPLIED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Root cause:  [1 sentence]
File:        [path:line]
Change:      [what was changed]
Rationale:   [why this fixes the root cause]
```

### Fix rules

1. **Fix the root cause, not the symptom** — if a test fails because of a missing migration, run the migration; do not skip the test
2. **Prefer the smallest change** — one line > one file > one feature
3. **Do not introduce new dependencies** unless the fix specifically requires one
4. **Do not change unrelated code** — scope the fix to the confirmed root cause only
5. **Do not suppress errors** — catching and swallowing exceptions is not a fix

---

## Phase 5 — Verification

> **Emit:** `▶ [5/6] Verification`

### 5.1 — Re-run the exact failing command

Run the same command that originally failed. It must now pass.

```bash
# Example: if `npm test` failed
rtk npm test

# Example: if Docker build failed
rtk docker compose up -d --build

# Example: if a specific test file failed
rtk npx jest tests/unit/user.service.test.ts
```

### 5.2 — Check for regressions

Run a broader test to ensure the fix didn't break anything else:

```bash
# Run the full test suite
rtk npm test

# If the fix was in Docker config
rtk docker compose up -d && rtk curl -sf http://localhost:3000/health
```

### 5.3 — Handle verification failure

If the fix introduced new failures:
- Return to Phase 2 with the **new** error
- The previous fix becomes context for the new investigation
- Do NOT revert the fix unless it is clearly unrelated to the original issue

---

## Phase 6 — Prevention

> **Emit:** `▶ [6/6] Prevention`

For every resolved issue, evaluate what would have prevented it:

### 6.1 — Testing gap

Was this a gap in the test suite?

| Gap type | Action |
|---------|--------|
| Missing unit test | Write a test that catches this specific failure |
| Missing integration test | Write a test that validates the integration point |
| Missing E2E scenario | Add a Cypress/Playwright test for the user flow |
| Flaky test not quarantined | Mark as `.skip` with a TODO, file issue |

### 6.2 — Configuration guard

Was this a configuration issue that could be validated earlier?

| Guard type | Action |
|-----------|--------|
| Missing env var | Add validation at startup: fail fast if required vars are missing |
| Wrong version | Add `.nvmrc` / `.python-version` / `engines` field |
| Docker config | Add `healthcheck` to docker-compose.yml for the affected service |
| Port conflict | Document required ports in `.env.example` or RUNBOOK |

### 6.3 — Known footgun

Is this a pattern that will recur?

| Pattern type | Action |
|-------------|--------|
| Common mistake for this stack | Add a pre-commit hook or lint rule |
| Recurring CI failure | Add a CI step that catches it earlier |
| Environment-specific | Document in `docs/RUNBOOK.md` troubleshooting section |

### 6.4 — Summary

Output a brief, actionable summary:

```
DEBUG COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Root cause:   [1 sentence]
Fix applied:  [1 sentence]
Prevention:   [1 sentence — test added / guard configured / pattern documented]
Time to fix:  [N phases completed]
```

---

## Rules

1. **Never guess** — every hypothesis must be checked with evidence before a fix is attempted
2. **Fix the root cause** — symptom suppression (try/catch swallowing, skipping tests) is not debugging
3. **Minimal blast radius** — the fix should change only what is necessary, nothing more
4. **Verify before declaring success** — the original failing command must pass after the fix
5. **Prevention is not optional** — Phase 6 always runs; every bug fixed is a future bug prevented
6. **Max 3 investigation rounds** — escalate to user if systematic investigation does not converge
7. **Document as you go** — every hypothesis, check, and result is recorded so the user can review the reasoning

---

## Failure Handling

| Situation | Behavior |
|-----------|----------|
| No error description provided | Check last terminal output, `git diff`, and Docker logs |
| Error is in a file outside the project | Report with context; likely a dependency or environment issue |
| Fix breaks something else | Return to Phase 2 with the new error as input |
| All hypotheses eliminated | Generate new hypotheses from investigation findings |
| Max investigation rounds reached | Escalate to user with full diagnostic report |
| Error cannot be reproduced | Document the conditions; add logging to capture it next time |
| Multiple root causes | Fix them in order of severity; re-verify after each fix |
