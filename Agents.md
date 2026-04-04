# Agents.md — Autonomous Agent Orchestration Protocol

> This document defines how the AI orchestrator decomposes tasks, creates agent profiles at runtime,
> manages parallel execution, and ensures context passes correctly between waves.

---

## Orchestration Principles

1. **Max 5 agents in parallel** — never launch more than 5 concurrent Agent tool calls
2. **One granular activity per agent** — each agent is transient and focused on exactly one task
3. **100k token budget per agent** — monitor and write handoff before approaching the limit
4. **Runtime profiles** — the orchestrator creates agent profiles based on task analysis, not pre-defined templates
5. **Context chain** — every wave produces a structured handoff consumed by the next wave
6. **Quality gate** — no wave starts without the previous wave's output being validated

---

## Two Orchestration Models

### Model 1 — Single Team with Waves (this document)
One team, sequential waves, up to 5 agents per wave.
Use for: a feature of medium complexity.

### Model 2 — Multiple Teams in Parallel (`/agent-teams`)
Multiple teams running simultaneously, each with 3-5 agents.
The orchestrator estimates the token budget (< 85k per team) before dispatching.
Use for: multiple simultaneous features or large decomposable features.

```
Model 1 (this doc):           Model 2 (/agent-teams):
  Orchestrator                  Orchestrator
    Wave 1: [A, B, C]             Team Alpha → [A, B, C] ┐
    Wave 2: [D, E]                Team Beta  → [D, E, F] ├ parallel
    Wave 3: [F]                   Team Gamma → [G, H, I] ┘
```

---

## When to Use Agent Teams

**Use autonomous agent mode when:**
- Task has 3+ independent components
- Work can be parallelized safely (no data race between agents)
- Total estimated work would benefit from parallel decomposition
- Different layers of hexagonal architecture are affected simultaneously

**Use single agent (direct work) when:**
- Task is simple and clearly sequential
- Context requires extremely tight coupling between steps
- Change is isolated to one file or component
- Quick fix / hotfix scenario

---

## Task Decomposition Protocol

When given a task, the orchestrator follows this process before launching any agents:

### Step 1 — Understand
- Read the task description completely
- Identify all components affected (domain, application, ports, infrastructure, UI, tests)
- Identify existing code patterns by exploring the codebase first

### Step 2 — Decompose into Granular Activities
Break the task into **single-responsibility activities**:

```
Good (granular, one agent):
  "Write unit test for UserRepository.findById() — returns null when user not found"
  "Implement UserRepository.findById() adapter in src/infrastructure/persistence/"
  "Write Gherkin scenario: user profile not found returns 404"

Bad (too broad, violates one-per-agent):
  "Implement user profile feature"
  "Add all the tests"
```

### Step 3 — Map Dependencies
Identify which activities are:
- **Independent** → can run in the same wave
- **Dependent** → must run in a later wave after their dependency

### Step 4 — Create Waves
Group independent activities into waves (up to 5 per wave):

```
Wave 1: [explore-1, explore-2]                          ← codebase exploration
Wave 2: [plan-arch, write-bdd-scenarios]                ← planning (after exploration)
Wave 3: [impl-domain, impl-ports, write-unit-tests]     ← core implementation
Wave 4: [impl-infra, impl-app, write-integration-tests] ← adapters + use cases
Wave 5: [reviewer, impl-e2e]                            ← quality gates
```

---

## Runtime Agent Profile Creation

For each activity, the orchestrator defines the agent profile AT RUNTIME:

```
AGENT PROFILE:
  type:        [see types below]
  task:        [single sentence — exactly what this agent must do, nothing more]
  context:     [relevant context from previous waves, < 5k tokens]
  constraints: [applicable Rules.md subset — copy only relevant rules]
  reads:       [specific files this agent must read first]
  writes:      [specific files this agent will create or modify]
  output:      [expected output format — see Handoff Format below]
  worktree:    [worktree path if this agent works in isolation]
```

**The profile must be written BEFORE spawning the agent. Never spawn an agent without a complete profile.**

---

## Agent Types

The orchestrator selects the appropriate type for each activity at runtime:

| Type          | Subagent Type       | Best For                                                    |
|---------------|---------------------|-------------------------------------------------------------|
| `explorer`    | `Explore`           | Codebase discovery, pattern analysis, no code changes       |
| `planner`     | `Plan`              | Architecture decisions, implementation planning             |
| `implementer` | `general-purpose`   | Domain/application/infrastructure code implementation       |
| `test-writer` | `general-purpose`   | Writing unit tests, integration tests, BDD steps            |
| `bdd-writer`  | `general-purpose`   | Writing Gherkin feature files and Cucumber step definitions |
| `reviewer`    | `code-reviewer`     | Code review, quality checks, SOLID and arch validation      |
| `load-tester` | `general-purpose`   | Writing k6 scripts and analyzing load test results          |
| `e2e-writer`  | `general-purpose`   | Writing Cypress test specs                                  |
| `frontend`    | `general-purpose`   | UI component implementation                                 |

---

## Parallel Execution Rules

```
          ┌──────────────────────────────────────────────────────┐
Wave N:   │ agent-A │ agent-B │ agent-C │ agent-D │ agent-E │  MAX 5
          └──────────────────────────────────────────────────────┘
                              ↓ (all complete)
          ┌───────────────────────────────────┐
Wave N+1: │ agent-F │ agent-G │ agent-H │     │  uses Wave N handoffs
          └───────────────────────────────────┘
```

**Rules for same-wave agents:**
- Must have NO data dependencies between them
- Must operate on different files (no write conflicts)
- Must use separate worktrees if modifying overlapping areas
- Each receives the SAME wave input (previous wave's handoff)

**Rules for cross-wave agents:**
- Wave N+1 only starts after ALL Wave N agents complete
- Wave N+1 receives the aggregated handoff from all Wave N agents
- The orchestrator must aggregate Wave N handoffs before starting Wave N+1

---

## Context Passing Protocol

### Input Context (what each agent receives)
Every agent receives exactly:
1. **Task** — single sentence, what to do
2. **Wave context** — aggregated handoff from the previous wave (< 5k tokens)
3. **Constraints** — relevant subset of Rules.md
4. **File list** — specific files to read

### Output Handoff (what each agent must produce)
Every agent MUST produce this handoff before completing:

```
HANDOFF:
  agent_type:      [type used]
  task_completed:  [one sentence — what was done]
  files_modified:  [list: path + what changed]
  files_created:   [list: path + purpose]
  decisions:       [key decisions made and the rationale]
  assumptions:     [assumptions made that next agents should know]
  issues:          [blockers, concerns, or open questions]
  next_needs:      [what the next wave's agents need to know to continue]
```

### Token Budget Management
Each agent must manage its token budget:

```
Total budget:     100,000 tokens
├─ Input context: 20,000  (received from previous wave)
├─ Active work:   70,000  (reading, reasoning, writing)
└─ Handoff output: 5,000  (structured context for next wave)
     Reserve:     5,000   (buffer)
```

If the agent approaches 80k tokens consumed:
1. Stop the current activity
2. Write a partial handoff with `task_completed: PARTIAL`
3. Include `next_needs` with clear continuation instructions
4. Signal the orchestrator to spawn a continuation agent

---

## Wave Orchestration Example

### Task: "Add user authentication to the application"

**Pre-work** (orchestrator, no agent):
- Read architecture.json to understand current structure
- Identify existing auth-related patterns

**Wave 1** — Exploration (2 parallel agents):
```
Agent A (explorer):
  task: "Explore src/ structure, identify existing patterns for entities, use cases, and adapters"
  reads: ["src/**", "tests/**"]
  writes: []

Agent B (explorer):
  task: "Explore existing test patterns and BDD features for reference"
  reads: ["tests/**", "*.config.*"]
  writes: []
```

**Wave 2** — Planning (2 parallel agents, after Wave 1):
```
Agent C (planner):
  task: "Design auth domain model: User entity, AuthToken value object, port interfaces"
  context: [Wave 1 handoffs]

Agent D (bdd-writer):
  task: "Write Gherkin scenarios for login, register, and logout in tests/bdd/features/auth.feature"
  context: [Wave 1 handoffs]
```

**Wave 3** — Domain + Tests (3 parallel agents, after Wave 2):
```
Agent E (test-writer): "Write failing unit tests for User entity and AuthToken value object"
Agent F (implementer): "Implement User entity and AuthToken in src/domain/"
Agent G (bdd-writer):  "Write Cucumber step definitions for Wave 2 scenarios"
```

**Wave 4** — Application + Infrastructure (3 parallel agents, after Wave 3):
```
Agent H (implementer): "Implement LoginUseCase in src/application/ following TDD"
Agent I (implementer): "Implement auth adapter (JWT + DB) in src/infrastructure/"
Agent J (test-writer): "Write integration tests for auth adapter"
```

**Wave 5** — Quality Gate (2 sequential agents):
```
Agent K (reviewer): "Review all auth code: hexagonal compliance, SOLID, test coverage"
Agent L (implementer): "Fix issues found by reviewer (if any)"
```

**Wave 6** — E2E (1 agent, if UI exists):
```
Agent M (e2e-writer): "Write Cypress tests for login and registration flows"
```

---

## Orchestrator Checklist

Before starting any agent wave, verify:

- [ ] All activities are granular (< 30 min each)
- [ ] No write conflicts between same-wave agents
- [ ] Each agent has a complete profile (type, task, context, reads, writes)
- [ ] Previous wave handoff aggregated and ready
- [ ] Total concurrent agents ≤ 5
- [ ] Token budget estimated per agent

After each wave completes, verify:
- [ ] All agents produced handoff documents
- [ ] No agent hit token limit without partial handoff
- [ ] Issues from agents reviewed before continuing
- [ ] Tests from this wave are passing before next wave starts
