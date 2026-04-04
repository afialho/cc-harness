---
name: hotfix
description: Expedited production fix with reduced quality gates. For critical incidents where speed matters. Includes rollback strategy, targeted fix, smoke test, and post-mortem prevention.
disable-model-invocation: true
argument-hint: <error description or incident URL>
---

# /hotfix — Expedited Production Fix

> Fast-track fix for production incidents. Reduced gates, focused scope, mandatory rollback plan.
> Use `/debug` for non-production failures. Use `/feature-dev` for non-urgent fixes.

---

## Pipeline Overview

```
/hotfix <error description>
    │
    ├─ [1/5] Triage
    │         ├─ classify severity (P0 critical / P1 high / P2 medium)
    │         ├─ identify blast radius (who/what is affected)
    │         └─ decide: rollback first or fix forward?
    │
    ├─ [2/5] Rollback Plan
    │         └─ document how to revert if the fix fails
    │
    ├─ [3/5] Targeted Fix
    │         ├─ minimal change targeting root cause
    │         └─ test ONLY the affected path
    │
    ├─ [4/5] Smoke Test
    │         └─ verify fix + no regression on critical paths
    │
    └─ [5/5] Post-Mortem
              └─ prevention: test, guard, or monitoring
```

---

## When to use /hotfix vs other skills

| Situation | Use |
|-----------|-----|
| Production is broken NOW | `/hotfix` |
| Test/dev failure during build | `/debug` |
| Non-urgent bug in backlog | `/feature-dev` |
| Performance degradation in prod | `/hotfix` (if user-facing) or `/perf-audit` (if investigative) |

---

## Phase 1 — Triage

> **Emit:** `▶ [1/5] Triage`

### 1.1 — Capture the incident

```
INCIDENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Error:       [error message or symptom]
Source:      [log, alert, user report, monitoring]
Affected:    [users, endpoints, services]
Since:       [when it started or was noticed]
```

### 1.2 — Classify severity

| Level | Criteria | Response time |
|-------|---------|---------------|
| **P0 Critical** | Service down, data loss, security breach | Fix NOW — skip non-essential gates |
| **P1 High** | Major feature broken, degraded for many users | Fix within the hour |
| **P2 Medium** | Minor feature broken, workaround exists | Fix today |

### 1.3 — Decide approach

- **Rollback first** (P0 default): revert to last known good state, THEN investigate
- **Fix forward** (P1/P2 default): identify root cause, apply targeted fix

For P0: present rollback command to the user IMMEDIATELY before any investigation:

```
⚠️ P0 CRITICAL — Recommend immediate rollback:

  [rollback command based on deploy target — e.g.:]
  rtk git revert HEAD --no-edit && rtk git push
  # or: vercel rollback / fly deploy --image [previous]

Rollback first, then investigate. Confirm to proceed with rollback or "fix forward" to skip.
```

Wait for user decision before continuing.

---

## Phase 2 — Rollback Plan

> **Emit:** `▶ [2/5] Rollback Plan`

Before touching any code, document the rollback:

```
ROLLBACK PLAN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Last known good: [commit hash or deploy version]
Rollback command: [exact command to revert]
Data impact:      [are there DB migrations to revert? data to restore?]
Verification:     [how to confirm rollback worked]
```

If DB migrations are involved: flag this as high-risk and confirm with user before proceeding.

---

## Phase 3 — Targeted Fix

> **Emit:** `▶ [3/5] Targeted Fix`

### 3.1 — Root cause (fast mode)

Use `/debug` Phase 1-3 logic but compressed:
1. Read error + stack trace
2. Check `rtk git log --oneline -5` for recent changes
3. Top 2-3 hypotheses → check the most likely one first
4. Max 2 investigation rounds (not 3) — if not found, escalate

### 3.2 — Apply fix

**Hotfix rules (stricter than normal):**
1. **ONE file change** preferred — if the fix spans 3+ files, reconsider if rollback is better
2. **No refactoring** — fix the bug, nothing else
3. **No new dependencies** — never add a package in a hotfix
4. **Branch from main:** `rtk git checkout -b hotfix/[description]`

### 3.3 — Write regression test

**Mandatory even for hotfixes:** write ONE test that catches this specific failure.

```bash
rtk npm test -- tests/unit/[affected].test.ts
```

The test must fail WITHOUT the fix and pass WITH the fix.

---

## Phase 4 — Smoke Test

> **Emit:** `▶ [4/5] Smoke Test`

**Reduced gate** — only test what matters:

```bash
# 1. All existing tests still pass
rtk npm test

# 2. The specific failing scenario is fixed
rtk npm test -- tests/unit/[regression-test].test.ts

# 3. Docker health check (if applicable)
rtk docker compose up -d && rtk docker compose ps
```

**Skipped gates (compared to /feature-dev):**
- No `/qa-loop` (too slow for incidents)
- No `/browser-qa` (unless the fix is UI-related)
- No `/perf-audit`
- No `/code-review` (review happens post-merge via PR)

**If the fix is UI-related:** add a quick `/browser-qa` of ONLY the affected page (not exhaustive).

---

## Phase 5 — Post-Mortem & Prevention

> **Emit:** `▶ [5/5] Post-Mortem`

### 5.1 — Commit and merge

```bash
rtk git add [specific files]
rtk git commit -m "fix([scope]): [description]

Hotfix for [incident description].
Root cause: [1 sentence]."
rtk git push -u origin hotfix/[description]
```

Create PR for review:
```bash
rtk gh pr create --title "fix([scope]): [description]" --body "Hotfix — review post-merge"
```

### 5.2 — Prevention (same as /debug Phase 6)

| What to add | When |
|------------|------|
| Regression test | Always (already done in Phase 3) |
| Monitoring/alert | If this was caught by a user, not monitoring |
| Input validation | If bad data caused the issue |
| Health check | If the service crashed silently |

### 5.3 — Summary

```
HOTFIX COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Severity:    [P0/P1/P2]
Root cause:  [1 sentence]
Fix:         [1 sentence]
Branch:      hotfix/[description]
PR:          [URL]
Test added:  [test file path]
Prevention:  [what was added to prevent recurrence]
Rollback:    [command if needed]

Next: merge PR after team review.
```

---

## Rules

1. **Speed over perfection** — a correct fix now beats a perfect fix later
2. **Minimal blast radius** — change as little as possible
3. **Always have a rollback** — documented before any code change
4. **One regression test minimum** — no hotfix ships without a test
5. **P0 = rollback first** — stabilize, then investigate
6. **No scope creep** — fix the incident, not adjacent issues (file those as separate tasks)
7. **Post-mortem is not optional** — Phase 5 always runs
