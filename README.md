# cc-harness

AI development harness for [Claude Code](https://docs.anthropic.com/en/docs/claude-code).

Build **any software from zero to production** -- a to-do list, a SaaS platform, a Pipefy clone, a Netflix-scale app. Or start simple with an MVP and evolve. It also works on **existing codebases**: add new features, refactor messy code, redesign the UI, modernize the architecture, or fix bugs -- all with the same toolkit.

27 skills, 8 deterministic hooks, 6 architecture patterns, 3 project scales. One command to start.

---

## The Magic: `/build`

This is the heart of the kit. **You type one command and the entire software lifecycle runs autonomously.**

```
/build a project management app like Pipefy with boards, cards, automations and team collaboration
```

That single command triggers a full pipeline:

```
/build <your idea>
  |
  |  Phase 0 -- Understand
  |  Detects what you need and auto-routes:
  |    No project yet?     --> scaffolds from scratch
  |    Idea is vague?      --> interviews you to clarify, then resumes
  |    Want to transform?  --> routes to /redesign, /refactor, or /modernize
  |    Clear feature?      --> continues below
  |
  |  Phase 1 -- Research                           [parallel agents]
  |  Launches up to 6 specialized agents that search the web:
  |  market analysis, API docs, architecture patterns, domain rules,
  |  real implementations, video tutorials. Produces RESEARCH.md.
  |  Pauses to show key insights and ask clarifying questions.
  |
  |  Phase 2 -- Planning                           [informed by research]
  |  Generates BDD scenarios (Gherkin), architecture mapping for your
  |  detected pattern, test plan, agent wave decomposition.
  |  Produces PLAN.md. Pauses for your approval.
  |
  |  Phase 3 -- Implementation                     [TDD + agent waves]
  |  Foundation first (design system + layout), auth gate, then features.
  |  Each feature: failing test --> implementation --> review --> QA gate.
  |  Parallel agents, structured handoffs, automatic fix loops.
  |  Commits, reports, done.
```

It works for a weekend hackathon (`scale=MVP`) or a production launch (`scale=Product`). You choose the level of rigor; the kit enforces it.

---

## Quick Start

**One-liner** (no clone needed):

```bash
bash <(curl -s "https://raw.githubusercontent.com/afialho/cc-harness/main/scripts/new-project.sh?t=$(date +%s)") my-app
```

This clones the kit, initializes a fresh git history, runs setup, and leaves you ready to go.

**Then:**

```bash
cd my-app
claude
/build <your idea>
```

**Manual setup** (if you prefer):

```bash
git clone https://github.com/afialho/cc-harness.git my-project
cd my-project
chmod +x scripts/setup.sh && ./scripts/setup.sh
# Edit CLAUDE.md: replace [Project Name]
claude
```

**For existing codebases** (one-liner, run from your project root):

```bash
bash <(curl -s "https://raw.githubusercontent.com/afialho/cc-harness/main/scripts/adopt.sh?t=$(date +%s)")
```

This installs skills, hooks, and config into your project without touching your code. Then:

```bash
claude
/adapt              # auto-detects your stack and configures everything
/build new feature  # or /refactor, /redesign, /modernize
```

## What's Included

| Path | Purpose |
|------|---------|
| `CLAUDE.md` | Main AI instructions -- loaded every session |
| `Rules.md` | Enforced project constraints (architecture, testing, git, docker) |
| `.claude/hooks/` | 8 deterministic hooks (architecture guard, security scan, etc.) |
| `.claude/skills/` | 27 slash commands covering the full lifecycle |
| `.claude/architecture.json` | Active architecture pattern and layer rules |
| `docs/` | Architecture, testing, usage, and hook documentation |
| `scripts/setup.sh` | One-command dependency installer |

## Architecture Patterns

Six supported patterns. Set in `.claude/architecture.json`, enforced by the `architecture-guard` hook.

| Pattern | Best For | Structure |
|---------|----------|-----------|
| `hexagonal` (default) | APIs, backends, any stack | `domain/`, `application/`, `ports/`, `infrastructure/`, `shared/` |
| `mvc-rails` | Rails, Django, server-rendered | `models/`, `services/`, `controllers/`, `views/` |
| `mvc-express` | Express, Fastify, NestJS | `models/`, `services/`, `controllers/`, `routes/` |
| `nextjs-app-router` | Next.js 13+ | `lib/`, `app/`, `components/`, `shared/` |
| `feature-based` | Large apps, vertical slices | `features/[name]/`, `shared/` |
| `flat` | Scripts, CLIs, small utils | No enforced structure |

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for full details, import rules, and configuration examples.

## Project Scales

Scale determines what practices and tooling are included. Set via `/ideate` or passed directly: `/build scale=MVP`.

| | MVP | Product | Scale |
|---|-----|---------|-------|
| **When** | POC, hackathon, prototype | Going to market, early stage | Traction, growing team |
| **TDD** | Advisory | Required | Required |
| **BDD (Gherkin)** | Optional | Required | Required |
| **Hexagonal layers** | Advisory | Required | Required |
| **E2E (Cypress)** | Optional | Required | Required |
| **CI/CD** | Optional | Required | Required |
| **Load tests (k6)** | -- | Optional | Required |
| **Observability** | -- | Structured logging | OpenTelemetry + Grafana |

All scales enforce: auth gate, security scan, Docker, Conventional Commits.

## Skills Overview

27 slash commands organized by lifecycle phase.

### Project Setup

| Skill | Purpose |
|-------|---------|
| `/ideate` | Collaborative interview to define feature map, MVP scope, and IDEAS.md |
| `/scaffold` | Initialize project from scratch: structure, Docker, testing, Git, GitHub |
| `/build` | Full orchestrator: research, planning, implementation. Auto-routes by context |
| `/adapt` | Configure the kit for an existing project (detect stack, update hooks/config) |

### Transformation

| Skill | Purpose |
|-------|---------|
| `/redesign` | Modernize the UI/UX: analyze, research references, implement with full QA |
| `/refactor` | Improve code quality: simplify, clean, extract, layer, inline, module |
| `/modernize` | Transform architecture: monolith to hexagonal/modular/microservices |

### Feature Development

| Skill | Purpose |
|-------|---------|
| `/feature-dev` | TDD + hexagonal implementation in 7 phases with agent teams |
| `/auth` | Full auth: JWT + refresh, OAuth2, RBAC, password reset, audit logging |
| `/ui` | Full UI pipeline: research, TDD, frontend-design, a11y, browser-qa gate |
| `/frontend-design` | Production-grade UI generation (extends official plugin) |
| `/mobile` | React Native + Expo: scaffold, TDD (RNTL), Detox E2E, EAS Build |
| `/dba` | Schema design, indexing, multi-tenancy, seed data |
| `/data-migration` | Zero-downtime migrations, CQRS, event sourcing, state machines |

### Quality and Review

| Skill | Purpose |
|-------|---------|
| `/qa-loop` | Per-feature QA: selectable dimensions (design, UX, backend, security, E2E) |
| `/browser-qa` | Final gate: exhaustive browser crawl of all UI elements and states |
| `/code-review` | Architecture + TDD + security review |
| `/perf-audit` | Bundle analysis, N+1 detection, caching, Core Web Vitals |
| `/security-hardening` | OWASP Top 10, headers, secrets audit, dependency scanning |

### Infrastructure

| Skill | Purpose |
|-------|---------|
| `/deploy` | Deploy pipeline: infra-as-code, Docker prod, secrets, post-deploy validation |
| `/ci-cd` | CI/CD: GitHub Actions, GitLab CI, quality gates, security scans |
| `/observability` | Structured logging + OpenTelemetry to Grafana (Prometheus, Loki, Tempo) |

### Documentation and Planning

| Skill | Purpose |
|-------|---------|
| `/research` | Parallel research wave producing RESEARCH.md |
| `/docs-gen` | OpenAPI, C4 diagrams (Mermaid), CHANGELOG, developer runbook |
| `/adr` | Architecture Decision Records: template, lifecycle, index |
| `/agent-teams` | Multi-team parallel orchestration |
| `/resume` | Resume work from checkpoint after context reset |

Full catalog: [docs/SKILLS.md](docs/SKILLS.md)

## Hooks

8 hooks in `.claude/hooks/` provide deterministic enforcement and advisory context.

| Hook | Trigger | What It Does |
|------|---------|-------------|
| `architecture-guard` | Write/Edit to source files | **Blocks** domain/application imports of infrastructure packages. Injects layer rules as context. |
| `rules-engine` | All tool calls | **Blocks** `--no-verify` on commits, test files inside `src/`. Enforces hard rules from Rules.md. |
| `commit-guard` | Bash: `git commit` | **Blocks** commits not following Conventional Commits format. |
| `docker-guard` | Session start | **Blocks** session start if `docker-compose.yml` exists but Docker is not running. |
| `security-scan` | Write/Edit | **Blocks** files containing hardcoded secrets, API keys, or credentials. |
| `tdd-guard` | Write to implementation files | Advisory: reminds to write tests first when no corresponding test file exists. |
| `rtk-rewrite` | Every Bash command | Advisory: suggests RTK CLI prefix for token-efficient operations. |
| `session-start` | Session startup/resume | Injects project context, checkpoint data, and architecture info. |

Hooks using `exit 2` are fully deterministic (the action is cancelled). Advisory hooks inject context that strongly influences but does not force behavior. See [docs/HOOKS.md](docs/HOOKS.md) for the full breakdown.

## Autonomous Agents

Complex features are implemented using waves of parallel agents, each handling one granular task.

```
/feature-dev payment-processing

Claude (orchestrator):
  Wave 1: [explorer-1, explorer-2]            -- explore codebase
  Wave 2: [planner, bdd-writer]               -- plan + BDD scenarios
  Wave 3: [test-writer, implementer-domain]   -- TDD domain layer
  Wave 4: [implementer-app, implementer-infra, test-integration] -- full stack
  Wave 5: [reviewer, e2e-writer]              -- quality gates
```

Constraints:
- Maximum 5 agents in parallel per wave
- Each agent handles exactly 1 granular activity
- 100k token budget per agent context
- Structured handoffs between waves (no context loss)
- Reviewer agent is mandatory before marking a feature complete

## Testing Stack

| Layer | Tool | Location | Required At |
|-------|------|----------|-------------|
| Unit | Framework-native (Vitest, Jest, Pytest, etc.) | `tests/unit/` | All scales |
| BDD | Cucumber.js | `tests/bdd/features/` | Product, Scale |
| E2E | Cypress | `tests/e2e/` | Product, Scale |
| Load | k6 | `tests/load/` | Scale |

See [docs/TESTING.md](docs/TESTING.md) for the full testing strategy.

## Requirements

| Tool | Version | Required | Notes |
|------|---------|----------|-------|
| Node.js | 18+ | Yes | Runtime for hooks and most project tooling |
| Git | 2.5+ | Yes | Worktree support for parallel development |
| Docker | Latest | Yes | All services run in containers |
| Claude Code CLI | Latest | Yes | `npm install -g @anthropic-ai/claude-code` |
| RTK CLI | Latest | No | Token-efficient CLI proxy (60-90% savings) |
| k6 | Latest | No | Required only for load tests (Scale) |

`scripts/setup.sh` checks for and installs all dependencies automatically.

## Documentation

| File | Contents |
|------|---------|
| [docs/USAGE.md](docs/USAGE.md) | Complete usage guide with end-to-end example |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | All 6 architecture patterns with config examples |
| [docs/TESTING.md](docs/TESTING.md) | Full testing strategy: unit, BDD, E2E, load |
| [docs/BDD.md](docs/BDD.md) | Cucumber.js setup and Gherkin guide |
| [docs/HOOKS.md](docs/HOOKS.md) | Hook enforcement levels and implementation details |
| [docs/SKILLS.md](docs/SKILLS.md) | Full skill catalog with descriptions |
| [docs/WORKTREES.md](docs/WORKTREES.md) | Git worktrees for parallel development |

## License

MIT
