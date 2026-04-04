---
name: agent-teams
description: Orchestrate multiple parallel agent teams for large-scale work. Token budget estimation, worktree isolation per team, wave decomposition, and handoff aggregation protocol.
disable-model-invocation: true
---

# /agent-teams — Multi-Team Parallel Orchestration

Orchestrates multiple agent teams in parallel for large-scale work.
Each team has 3-5 agents. Each agent has a maximum context window of 100k tokens.
The orchestrator ensures granularity before dispatching any team.

---

## When to use

Use `/agent-teams` when the task:
- Involves 3+ features or independent components simultaneously
- Would have more than 500 lines of code in total
- Can be divided into workstreams that don't depend on each other
- Benefits from real parallelism (different parts of the system)

Use `/feature-dev` for single features.
Use `/agent-teams` for multiple features or very large features in parallel.

---

## Mental Model

```
ORCHESTRATOR (you, main Claude)
├── Team Alpha  ←── worktree: feature/alpha
│   ├── Agent 1 (explorer)
│   ├── Agent 2 (test-writer)
│   └── Agent 3 (implementer)
│
├── Team Beta   ←── worktree: feature/beta
│   ├── Agent 1 (explorer)
│   ├── Agent 2 (implementer)
│   └── Agent 3 (reviewer)
│
└── Team Gamma  ←── worktree: feature/gamma
    ├── Agent 1 (bdd-writer)
    ├── Agent 2 (implementer)
    └── Agent 3 (e2e-writer)

All 3 teams run in PARALLEL (simultaneous Agent tool calls).
Each team manages its own internal waves.
Orchestrator aggregates results at the end.
```

---

## Orchestrator Protocol

### Step 1 — Workstream Decomposition
> **Emit:** `▶ [1/5] Workstream Decomposition`

Before creating any team, the orchestrator:

1. Receives the overall objective
2. Identifies independent workstreams (no data dependency between them)
3. For each workstream, estimates the token budget:

```
TOKEN BUDGET ESTIMATE:
  Files to read:       N × ~1,500 tokens/file
  Internal reasoning:  ~20,000 fixed tokens
  Code to generate:    lines × ~20 tokens/line
  Output handoff:      ~5,000 fixed tokens
  ─────────────────────────────────────────────
  Estimated total:     must stay below 85,000 tokens

  If estimate > 85k → split the workstream in 2
  If estimate < 20k → consider merging with another small workstream
```

**Practical rules for granularity:**
- Max 25 files to read per team
- Max 15 files to create/modify per team
- Max 300 lines of code per team
- A task should be described in 1-2 sentences. If it needs more → too large.

### Step 2 — Team Creation
> **Emit:** `▶ [2/5] Team Creation`

For each approved workstream, create a **Team Brief**:

```
TEAM BRIEF — [Team Name]
──────────────────────────────────────────────
Workstream:    [what this team will build]
Worktree:      rtk git worktree add ../[proj]-[name] -b feature/[name]
Files read:    [exact file list — max 25]
Files created/modified: [exact list — max 15]
Constraints:   [relevant rules from Rules.md]
Agents (3–5):  [list with type and task of each]
Estimated budget: [Xk tokens]
Expected output: [what the team must return]
```

### Step 3 — Parallel Launch
> **Emit:** `▶ [3/5] Launching Teams`

Launch all teams **in the same turn** (multiple simultaneous Agent tool calls):

```
← Single orchestrator turn →
  Agent(Team Alpha, run_in_background=false)
  Agent(Team Beta,  run_in_background=false)
  Agent(Team Gamma, run_in_background=false)
```

Each team runs independently in its worktree.
The orchestrator waits for all to complete before proceeding.

### Step 4 — Internal Waves per Team
> **Emit:** `▶ [4/5] Internal Waves` *(emit again when starting each wave: `▶ Wave N — <name>`)*

Within each team, the lead agent organizes internal waves:

```
Internal Wave 1 (exploration):
  Explorer — understands the specific workstream context

Internal Wave 2 (tests first — TDD):
  Test-writer — writes failing tests (RED)

Internal Wave 3 (implementation):
  Implementer — makes the tests pass (GREEN → REFACTOR)

Internal Wave 4 (quality):
  Reviewer — reviews the team's own code
```

Maximum 5 agents per internal wave. If a wave needs more → create additional wave.

### Step 5 — Handoff and Aggregation
> **Emit:** `▶ [5/5] Aggregating Results`

Each team returns to the orchestrator:

```
TEAM REPORT — [Name]
──────────────────────────────────────────────
Status:          [COMPLETE | PARTIAL | BLOCKED]
Files created:   [list]
Files modified:  [list]
Tests:           [N unit, N integration, N BDD]
Issues:          [problems found or "None"]
Discovered dependencies: [things other teams need to know]
Next steps:      [what the orchestrator should do after merge]
```

The orchestrator:
1. Collects all reports
2. Checks for conflicts between workstreams
3. Merges branches into the main feature branch
4. Launches a final global review team (if needed)

---

## Example: Large Feature in Multiple Teams

### Objective: "Complete order system"

#### Orchestrator decomposition:

```
Workstream A — Orders domain
  Estimate: 15 files read × 1.5k + 200 lines × 20 = ~26k tokens ✅
  Files: Order entity, OrderItem VO, OrderStatus VO, unit tests

Workstream B — Orders use cases
  Estimate: 20 files read × 1.5k + 250 lines × 20 = ~35k tokens ✅
  Files: PlaceOrderUseCase, CancelOrderUseCase, unit tests

Workstream C — Infrastructure + API
  Estimate: 18 files read × 1.5k + 300 lines × 20 = ~33k tokens ✅
  Files: PostgresOrderRepository, OrderController, integration tests

Dependency: C depends on A and B → C runs in separate wave
```

#### Launch:

```
Team Wave 1 (parallel):
  Agent(Team A — domain)     → worktree: proj-orders-domain
  Agent(Team B — use cases)  → worktree: proj-orders-usecases

Team Wave 2 (after Wave 1):
  Agent(Team C — infra+api)  → worktree: proj-orders-infra
  Agent(Team D — BDD+E2E)    → worktree: proj-orders-tests
```

#### Each team internally:

```
Team A — Domain (3 agents):
  Agent 1 (explorer):      explores existing entity patterns
  Agent 2 (test-writer):   writes Order.test.ts, OrderItem.test.ts (RED)
  Agent 3 (implementer):   implements Order, OrderItem, OrderStatus (GREEN)

Team B — Use Cases (4 agents):
  Agent 1 (explorer):      explores existing use cases for patterns
  Agent 2 (test-writer):   writes PlaceOrderUseCase.test.ts (RED)
  Agent 3 (implementer):   implements PlaceOrderUseCase (GREEN)
  Agent 4 (reviewer):      reviews SOLID + hexagonal compliance
```

---

## Context Window Management

### Each agent monitors its own budget:

```
BUDGET PER AGENT:
├── Received context (brief + previous handoffs): ≤ 20k tokens
├── Active work (reading, reasoning, writing):    ≤ 70k tokens
└── Output handoff:                               ≤ 5k tokens
                                           TOTAL: ≤ 95k tokens
```

### If an agent approaches 80k tokens consumed:

1. Stops current work
2. Writes partial handoff: `Status: PARTIAL`
3. Describes exactly where it stopped and what remains
4. Signals the team lead to launch a continuation agent

### The orchestrator prevents overflow with the granularity rule:
- No workstream is passed to a team without a budget estimate
- If estimate > 85k → workstream split before launching

---

## Worktree Structure per Team

```bash
# Orchestrator creates worktrees before launching teams
rtk git worktree add ../[proj]-[workstream-a] -b feature/[workstream-a]
rtk git worktree add ../[proj]-[workstream-b] -b feature/[workstream-b]
rtk git worktree add ../[proj]-[workstream-c] -b feature/[workstream-c]

# After all teams complete:
rtk git checkout feature/[feature-principal]
rtk git merge feature/[workstream-a]
rtk git merge feature/[workstream-b]
rtk git merge feature/[workstream-c]

# Cleanup
rtk git worktree remove ../[proj]-[workstream-a]
rtk git worktree remove ../[proj]-[workstream-b]
rtk git worktree remove ../[proj]-[workstream-c]
```

---

## Orchestrator Checklist

Before launching any team:
- [ ] Workstreams are independent (no data race conditions)
- [ ] Token estimate calculated for each workstream (< 85k)
- [ ] Team Brief written for each team (agents defined, files listed)
- [ ] Worktrees created
- [ ] Dependencies between workstreams mapped (which wave must wait for which)

After all teams complete:
- [ ] All reports collected
- [ ] No team returned `Status: BLOCKED` without resolution
- [ ] Branch merge without conflicts
- [ ] Full test suite running on the merged branch
- [ ] Global review (if changes cross multiple workstreams)
