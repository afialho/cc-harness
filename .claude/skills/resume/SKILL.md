---
name: resume
description: Resume work autonomously from a checkpoint after context reset (/clear or /compact). Reads .claude/checkpoint.md and continues exactly where the previous session stopped.
disable-model-invocation: true
---

# /resume — Autonomous Context Resumption

Resumes work from where it stopped after a context reset.

## Instructions

When `/resume` is invoked:

### 1. Read the checkpoint
> **Emit:** `↺ Resuming from checkpoint...`

Read `.claude/checkpoint.md`. If it does not exist, inform the user that there is no work in progress.

### 2. Reconstruct context
From the checkpoint, identify:
- Which skill was being executed (`/feature-dev`, `/build`, `/agent-teams`, etc.)
- At which phase/step it stopped
- Which files were created/modified
- What the exact next step is

Read the relevant files mentioned in the checkpoint to reconstruct the technical context.

### 3. Present summarized state
Show the user in 5 lines:
```
Resuming: [skill] — [feature name]
Completed: [phases/steps already done]
State:     [what is working]
Next:      [exact action to execute]
Continuing automatically...
```

### 4. Continue autonomously
Execute the next step indicated in the checkpoint without asking for confirmation.
Follow the original skill's protocol (feature-dev, agent-teams, etc.) from the indicated point.

### 5. After completing the session
Upon reaching the context threshold again (~60k tokens), write a new updated checkpoint and emit the compact warning.

## Behavior when there is no checkpoint

If `.claude/checkpoint.md` does not exist, reconstruct context from git:

```bash
rtk git log --oneline -15
rtk git diff HEAD --name-only
rtk git status
```

Based on the outputs:
- Identify the last feature in development (recent commits)
- List modified but uncommitted files (work in progress)
- Present to the user:

```
No checkpoint found. Context reconstructed from git:

Last commits:
  [list of 15 most recent commits]

Modified uncommitted files:
  [list or "none"]

Based on history, the most recent work appears to be:
  [inference based on commits — e.g.: "auth implementation (feat/auth)"]

Do you want to continue from here? If so, tell me what you need to resume.
```
