---
name: resume
description: Resume work autonomously from a checkpoint after context reset (/clear or /compact). Reads checkpoint, PLAN.md, RESEARCH.md, capabilities.json, and git state to reconstruct full context and continue exactly where the previous session stopped.
disable-model-invocation: true
---

# /resume — Autonomous Context Resumption

Resumes work from where it stopped after a context reset.

## Instructions

When `/resume` is invoked:

### 1. Read the checkpoint
> **Emit:** `↺ Resuming from checkpoint...`

Read `.claude/checkpoint.md`. If it exists → proceed to step 2.
If it does not exist → proceed to step 1b (reconstruct from artifacts).

### 1b. Reconstruct from artifacts (no checkpoint)

When no checkpoint exists, reconstruct full state from project artifacts:

```bash
# Git state
rtk git log --oneline -20
rtk git diff HEAD --name-only
rtk git status
rtk git branch --show-current
```

Read these files (if they exist):
- `RESEARCH.md` → research phase completed? what was found?
- `PLAN.md` → planning phase completed? what features were planned?
- `.claude/capabilities.json` → which capabilities were selected?
- `.claude/browser-qa-report.md` → was browser QA run? any issues?
- `COMPLETENESS_REPORT.md` → was PM validation run?
- `docker-compose.yml` → is Docker configured? what port?

**Feature completion detection:** compare PLAN.md features with git commits:
```bash
rtk git log --oneline --all | head -30
```

For each feature in PLAN.md:
- Has a commit like `feat([feature-scope]): ...`? → DONE
- Has modified files but no commit? → IN PROGRESS
- No trace in git? → PENDING

### 2. Reconstruct context

From the checkpoint (or reconstructed artifacts), identify:
- **Which skill** was being executed (`/build`, `/feature-dev`, `/agent-teams`, etc.)
- **At which phase/step** it stopped (e.g., "Phase 3 — feature 4 of 7")
- **Which files** were created/modified
- **What the exact next step** is
- **Capabilities** selected (from `.claude/capabilities.json`)
- **Features completed vs pending** (from PLAN.md + git)

Read the relevant files mentioned in the checkpoint to reconstruct the technical context.

### 3. Present summarized state

Show the user in a clear format:

```
RESUMING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Skill:        [/build | /feature-dev | /agent-teams]
Phase:        [current phase — e.g., Phase 3 Implementation]
Feature:      [current feature name]

Capabilities: [list from capabilities.json]

Progress:
  ✅ [feature 1] — committed
  ✅ [feature 2] — committed
  🔄 [feature 3] — in progress (files modified, not committed)
  ☐ [feature 4] — pending
  ☐ [feature 5] — pending

Docker:       [running / not running]
Next action:  [exact step to execute — e.g., "Continue implementing feature 3, Phase 5 TDD"]

Continuing automatically...
```

### 4. Continue autonomously

Execute the next step indicated in the checkpoint without asking for confirmation.
Follow the original skill's protocol from the indicated point.

**Important:** before continuing implementation, verify:
- Docker running? If not → `rtk docker compose up -d`
- On correct branch? If not → `rtk git checkout [branch]`
- Dependencies installed? Quick check: `rtk npm test -- --bail` or equivalent

### 5. After completing the session

Upon reaching the context threshold again (~60k tokens), write a new updated checkpoint:

```markdown
# Checkpoint — [date/time]

## Context
- Skill: /build (Phase 3 — Implementation)
- Branch: feature/[name]
- Capabilities: [from capabilities.json]

## Features
- [feature 1]: DONE (committed: abc1234)
- [feature 2]: DONE (committed: def5678)
- [feature 3]: IN PROGRESS — Phase 5.3 TDD cycle, 3/5 tests green
- [feature 4]: PENDING
- [feature 5]: PENDING

## Files modified (not committed)
- src/features/[feature3]/...
- tests/e2e/[feature3].cy.ts

## Next step
Continue /feature-dev for [feature 3]:
- Phase 5.3 — implement remaining behaviors (test 4: [description], test 5: [description])
- Then Phase 6 (Quality Review) → Phase 7 (Commit)
- After commit → start [feature 4]

## Key decisions
- [any non-obvious decisions made during this session]
```

Emit: `↺ Context ~60k — checkpoint written. Recommend /compact.`

## Behavior with incomplete self-healing loop

If the checkpoint indicates the build was in the Self-Healing Loop:
1. Read `.claude/browser-qa-report.md` for the last known issues
2. Check which iteration was in progress
3. Resume the loop from the next iteration (don't restart from 1)
4. Continue fixing and retesting until PASS or max iterations
