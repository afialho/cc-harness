# Usage Guide

> How to use the starter kit to build software from zero to production.

---

## 1. Getting Started

```bash
# Clone the kit into your new project
cp -r cc-starterkit/ my-project/
cd my-project/

# Check dependencies (RTK, Docker, Cypress, k6, Cucumber)
./scripts/setup.sh

# Replace [Project Name] in CLAUDE.md with your actual project name
# Optionally set your architecture pattern in .claude/architecture.json

# Start Claude Code
claude
```

The `session-start` hook fires automatically, injecting active rules, detected stack, and available skills.

---

## 2. The Build Pipeline

`/build` is the single entry point. It detects your context and routes accordingly:

```
/build <idea or description>
  |
  |-- Empty project?       --> /scaffold  --> resumes /build
  |-- Vague idea?          --> /ideate    --> resumes /build
  |-- UI transformation?   --> /redesign  (full handoff)
  |-- Code quality fix?    --> /refactor  (full handoff)
  |-- Architecture change? --> /modernize (full handoff)
  |-- Clear feature?       --> runs the full pipeline below
```

When `/build` proceeds with a clear feature, it runs three phases:

| Phase | What happens | User interaction |
|-------|-------------|-----------------|
| **0 -- Context** | Detects scale, confirms understanding | Approves understanding block |
| **1 -- Research** | Parallel agents research market, APIs, architecture, implementations. Produces `RESEARCH.md` | Answers 3-5 clarification questions |
| **2 -- Planning** | BDD scenarios, architecture mapping, test plan, agent decomposition. Produces `PLAN.md` | Approves the plan |
| **3 -- Implementation** | Foundation, auth, then features via `/feature-dev` or `/agent-teams`. Quality gates after every feature | Unblocks auth gate if needed |

Between phases, `/build` is fully autonomous. It only pauses at the two mandatory checkpoints (post-research, post-plan) and when an auth gate fails.

---

## 3. Example: Building a Task Manager

```
/build task manager with projects, tasks, and team collaboration
```

### Phase 0 -- Context detection

`/build` checks the project state. If empty, it calls `/scaffold` first. Then it asks for the scale:

```
UNDERSTANDING
--------------------------------------------
Feature:      Task Manager
Scale:        Product
Objective:    Team task management with projects, assignments, and status tracking
What it builds:
  - User authentication (register, login, logout)
  - Project CRUD with team membership
  - Task CRUD with status workflow (todo, in_progress, done)
  - Dashboard with filters
Entities:     User, Project, Task, TeamMember
Type:         Full-stack

Is this correct? Can I proceed to research?
```

You confirm. `/build` proceeds.

### Phase 1 -- Research wave

Parallel agents launch:

| Agent | Searches for |
|-------|-------------|
| Business/Market | How Asana, Linear, Todoist solve task management. User pain points from reviews |
| Architecture | Hexagonal patterns for multi-entity CRUD. Permission models for team access |
| Implementations | Open-source task manager repos. Common schema patterns for tasks + projects |
| Domain/Rules | Status transition rules. Assignment constraints. Cascade behaviors |

Results aggregate into `RESEARCH.md`. A QA gate verifies research quality. Then `/build` presents key insights and asks clarification questions:

```
Key insights:
  - Status transitions should be explicit (state machine), not free-form updates
  - Team membership needs role-based access (owner, member, viewer)
  - Most task apps fail on notification fatigue -- keep notifications minimal

Questions:
  1. Should tasks support subtasks, or keep it flat for MVP?
  2. The research found two permission models: RBAC vs. simple owner/member.
     RBAC is more flexible but adds complexity. Preference?
  3. Should the dashboard show cross-project views or project-scoped only?
```

You answer. `/build` proceeds.

### Phase 2 -- Planning

`/build` generates `PLAN.md` with:

- Architecture mapping (hexagonal layers for each entity)
- BDD scenarios (Gherkin) for every feature
- Test plan (unit, integration, BDD, E2E, load)
- Implementation sequence with agent wave decomposition
- Git strategy (branch names, commit sequence)

A QA gate validates plan completeness. You review and approve.

### Phase 3 -- Implementation

```
[3a] Design system + layout base  --> browser QA gate
[3b] Auth (register/login/logout) --> Cypress + security QA gate (BLOCKER = build stops)
[3c] Projects CRUD                --> phase gate (qa-loop)
[3d] Tasks CRUD                   --> phase gate (qa-loop)
[3e] Dashboard                    --> phase gate (qa-loop)
[3f] Final QA + code review       --> commit
```

Each feature goes through its own phase gate before the next one starts.

---

## 4. Scales

Scale determines what gets enforced. Set it via `/build scale=Product`, or `/build` asks during Phase 0.

### What each scale includes

| Capability | MVP | Product | Scale |
|-----------|-----|---------|-------|
| Auth gate | yes | yes | yes |
| Docker | yes | yes | yes |
| Security scan | yes | yes | yes |
| Conventional Commits | yes | yes | yes |
| Unit tests | basic | full | full |
| TDD | advisory | required | required |
| BDD (Gherkin) | optional | required | required |
| Hexagonal layers | advisory | required | required |
| E2E (Cypress) | optional | required | required |
| CI/CD (GitHub Actions) | optional | required | required |
| Rate limiting | -- | required | required |
| Structured logging | -- | required | required |
| Docs generation | -- | required | required |
| Observability (OTel) | -- | -- | required |
| Load tests (k6) | -- | -- | required |
| Performance audit | -- | -- | required |

### When to use each scale

| Scale | Use case |
|-------|---------|
| **MVP** | Proof of concept, hackathon, idea validation |
| **Product** | Going to market, early-stage product |
| **Scale** | Product with traction, growing team |

---

## 5. Architecture Patterns

Six patterns are supported. Set the active pattern in `.claude/architecture.json`. The `architecture-guard` hook enforces import rules at write time.

| Pattern | Best for | Directory root |
|---------|---------|---------------|
| `hexagonal` (default) | Clean architecture, DDD projects | `src/domain/`, `src/application/`, `src/ports/`, `src/infrastructure/` |
| `mvc-rails` | Rails, Django, server-rendered apps | `app/models/`, `app/services/`, `app/controllers/` |
| `mvc-express` | Express, Fastify, NestJS backends | `src/models/`, `src/services/`, `src/controllers/` |
| `nextjs-app-router` | Next.js 13+ with App Router | `src/lib/`, `src/app/`, `src/components/` |
| `feature-based` | Feature-module monoliths | `src/features/[name]/`, `src/shared/` |
| `flat` | Scripts, CLIs, small utilities | No enforcement |

To change the pattern, edit `.claude/architecture.json`:

```json
{
  "pattern": "mvc-express",
  "layers": {
    "models":      { "path": "src/models/",      "description": "Data models and entities" },
    "services":    { "path": "src/services/",     "description": "Business logic and use cases" },
    "controllers": { "path": "src/controllers/",  "description": "Request handlers" },
    "routes":      { "path": "src/routes/",       "description": "Route definitions" }
  }
}
```

Full pattern details and import rules: [docs/ARCHITECTURE.md](ARCHITECTURE.md).

---

## 6. Library / Package Projects

For libraries with no UI and no server, `/build` detects the library context automatically (presence of `"main"` or `"exports"` in `package.json`, `Cargo.toml`, `pyproject.toml`, etc.) and skips Docker, auth gates, and UI protocols.

The library pipeline:

```
/build <library description>
  |
  Phase 0-2: same (research, plan)
  |
  Phase 3 (library mode):
    [3a] Build toolchain setup (tsup, esbuild, setuptools, cargo)
    [3b] Public API design (exports, type declarations)
    [3c] Implementation with TDD per module
    [3d] Scale gates (CI/CD, docs, security audit for Product/Scale)
```

Phase gates run after each public module: unit tests, build artifact verification, type checking.

---

## 7. Parallel Development

### Agent teams for multiple features

When 3+ features are independent, `/build` delegates to `/agent-teams` automatically based on the Phase 2 plan. You can also invoke it directly:

```
/agent-teams build user-auth + projects + tasks in parallel
```

Each team gets its own worktree, its own agent wave, and a token budget capped at 85k. If a workstream exceeds the budget, the orchestrator splits it.

```
Orchestrator
|
+-- Team Alpha (user-auth)     worktree: project-auth
|   Wave 1: explore --> Wave 2: BDD + tests --> Wave 3: implement --> Wave 4: review
|
+-- Team Beta (projects)       worktree: project-projects
|   Wave 1: explore --> Wave 2: BDD + tests --> Wave 3: implement --> Wave 4: review
|
+-- Team Gamma (tasks)         worktree: project-tasks
    Wave 1: explore --> Wave 2: BDD + tests --> Wave 3: implement --> Wave 4: review
```

Teams run simultaneously. The orchestrator merges all branches and runs the full test suite after all teams complete.

### Git worktrees for isolation

Every feature branch uses a worktree for filesystem isolation:

```bash
rtk git worktree add ../my-project-auth -b feature/auth
rtk git worktree add ../my-project-tasks -b feature/tasks
rtk git worktree list
rtk git worktree remove ../my-project-auth
```

---

## 8. Quality Gates

### Per-feature phase gate

After every feature, `/build` runs:

1. `rtk npx cypress run --spec tests/e2e/[feature].cy.ts` (if UI)
2. `/qa-loop` with dimensions matching the feature type
3. Fix loop (max 3 iterations) until PASS

| Feature type | QA dimensions |
|-------------|--------------|
| UI only | qa-design, qa-ux, qa-e2e |
| Backend only | qa-backend, qa-security, qa-code |
| Full-stack | qa-design, qa-ux, qa-backend, qa-security, qa-e2e |
| Scale endpoints | add qa-perf + `rtk k6 run tests/load/[feature].js` |

### Auth gate (mandatory)

Auth is always the first feature. If the auth QA gate returns BLOCKER, the entire build stops until resolved. No exceptions.

### Final verification

After all features are implemented:

1. Full test suite: unit + integration + BDD + E2E + load
2. `/qa-loop` with all applicable dimensions
3. Code review agent (architecture, SOLID, coverage, security)
4. `/browser-qa <url>` for exhaustive UI crawl (if web app)

---

## 9. Context Management

The system context starts at roughly 18k tokens. As work progresses, checkpoints prevent context degradation.

| Threshold | What happens |
|-----------|-------------|
| **~60k tokens** | Automatic checkpoint written to `.claude/checkpoint.md`. Captures: current phase, files modified, next step, key decisions. Emits compact recommendation |
| **~80k tokens** | Strongly recommended: run `/compact`. After compacting, `session-start` re-injects the checkpoint |
| **~100k tokens** | Quality degrades. Always compact before this point |

### Resuming after compact

```
/resume
```

Reads `.claude/checkpoint.md` and continues from the exact phase and step where work stopped. No re-reading of already-processed files.

### Token cost estimates

| Operation | Approximate cost |
|----------|-----------------|
| File read | ~1k tokens |
| Agent call | ~8k tokens |
| Long response | ~2k tokens |
| Full phase | ~3k tokens |

---

## 10. Workflow Summary

### Starting a new project

```
1. Copy kit           cp -r cc-starterkit/ my-project/
2. Setup              ./scripts/setup.sh
3. Configure          Edit CLAUDE.md (project name) + architecture.json (pattern)
4. Start              claude
5. Build              /build <your idea>
6. Interact           Answer scale question, clarification questions, approve plan
7. Wait               Implementation runs autonomously with quality gates
8. Done               Review BUILD COMPLETE summary, merge to main
```

### Starting from an existing codebase

```
1. Copy kit files     Copy .claude/, Rules.md, Agents.md, CLAUDE.md into your project
2. Adapt              /adapt (detects stack, pattern, test framework, updates configs)
3. Build              /build <feature or transformation>
```

### Quick reference: which command to use

| Situation | Command |
|----------|---------|
| New project from scratch | `/build <idea>` |
| Vague idea, need to explore | `/build` (auto-routes to `/ideate`) |
| Existing code, new feature | `/build <feature description>` |
| Redesign the UI | `/build redesign the interface` (auto-routes to `/redesign`) |
| Refactor code quality | `/build refactor the auth module` (auto-routes to `/refactor`) |
| Change architecture | `/build modernize to hexagonal` (auto-routes to `/modernize`) |
| 3+ independent features | `/agent-teams <features>` |
| Mobile app (React Native) | `/mobile` |
| Resume after context reset | `/resume` |

Full skill catalog: [docs/SKILLS.md](SKILLS.md)
