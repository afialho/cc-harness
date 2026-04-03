# cc-starterkit

Stack-agnostic AI development starter kit for [Claude Code](https://docs.anthropic.com/en/docs/claude-code).

Pre-configured skills, hooks, and rules that orchestrate the full software lifecycle -- from idea to deploy -- using autonomous agent teams, TDD, and enforced architecture. Drop it into any project, run `/build`, and let Claude Code handle research, planning, implementation, and QA.

## Quick Start

```bash
# Clone
git clone https://github.com/afialho/cc-starterkit.git my-project
cd my-project

# Setup
chmod +x scripts/setup.sh && ./scripts/setup.sh

# Configure
# Edit CLAUDE.md: replace [Project Name] with your project name
# Edit .claude/architecture.json if not using hexagonal (default)

# Start
claude
/build my amazing app idea
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

## The Pipeline

`/build` is the entry point. It detects project context and routes automatically:

```
/build <idea>
  |
  +-- Phase 0: Context detection
  |     Empty project    --> /scaffold (initialize from scratch)
  |     Vague idea       --> /ideate (collaborative interview first)
  |     UI transform     --> /redesign
  |     Code cleanup     --> /refactor
  |     Arch migration   --> /modernize
  |
  +-- Phase 1: Research
  |     Parallel agents --> RESEARCH.md (market, libs, architecture, docs)
  |
  +-- Phase 2: Planning
  |     BDD scenarios + architecture mapping --> PLAN.md
  |
  +-- Phase 3: Implementation
        TDD + agent waves --> tested, deployed code
```

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

## Using with Existing Projects

```bash
# Copy the kit into your project root
cp -r cc-starterkit/.claude cc-starterkit/CLAUDE.md cc-starterkit/Rules.md cc-starterkit/docs your-project/

# Start Claude Code and run adapt
claude
/adapt
```

`/adapt` auto-detects your stack, architecture pattern, and test framework, then updates `architecture.json`, `CLAUDE.md`, and hooks to match. It configures the kit -- it does not refactor your code (use `/refactor` for that).

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
