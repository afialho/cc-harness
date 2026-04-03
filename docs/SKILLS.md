# Skills Catalog

> Full catalog of available slash commands (27 skills + 1 built-in). Entry point: `/build`.

---

## Project Setup

| Skill | Purpose |
|-------|---------|
| `/ideate` | Collaborative idea refinement. Interviews the user to extract requirements, maps features, defines MVP scope, detects project size, and produces a structured brief ready for `/build`. |
| `/scaffold` | Initialize a new project from scratch: project structure, Docker Compose, testing framework, Git repo, and GitHub push. Called automatically by `/build` when no project exists. For mobile projects, delegates to `/mobile scaffold`. |
| `/build` | Full lifecycle orchestrator. Auto-routes based on context: empty project --> `/scaffold`, vague idea --> `/ideate`, UI transformation --> `/redesign`, code quality --> `/refactor`, architecture change --> `/modernize`. When routing is not needed, runs the full pipeline: research --> planning (PLAN.md) --> implementation with quality gates at every phase. |
| `/adapt` | Auto-configure the kit for an existing project. Detects stack, architecture pattern, and test framework. Updates `architecture.json`, `CLAUDE.md`, and hooks to match the real project. Run once after adopting the kit -- does not refactor code (use `/refactor` for that). |

## Project Transformation

| Skill | Purpose |
|-------|---------|
| `/redesign` | Application modernization and UI transformation. Analyzes the current app (via browser or codebase), detects mode (in-place replacement or full rewrite to new folder), proposes UX improvements, and implements with full feature parity guarantee. Mobile-aware: detects React Native and delegates to `/mobile`. |
| `/refactor` | Structured refactoring of existing code. Scopes: `simplify` (auto-scope via git diff, post-feature cleanup), `clean` (dead code, naming), `extract` (split modules), `inline` (remove over-abstraction), `layer` (fix architecture violations), `module` (full module overhaul). Test-first: establishes coverage before any change. |
| `/modernize` | Architecture transformation for monoliths. Identifies bounded contexts, proposes target architecture (`hexagonal`, `modular`, or `microservices`), and migrates incrementally using Strangler Fig pattern (zero downtime). |

## Feature Development

| Skill | Purpose |
|-------|---------|
| `/feature-dev` | End-to-end feature implementation with TDD (Red-->Green-->Refactor). Architecture-aware: reads `architecture.json` to detect the project's pattern (hexagonal, MVC, Next.js App Router, feature-based). 7-phase workflow with BDD (Cucumber), Cypress E2E, load tests (k6), and git worktree isolation. |
| `/auth` | Full authentication and authorization. Stack-aware: detects Next.js, Node/Express/Fastify, React Native, Django, Rails. Covers JWT + refresh rotation, OAuth2/social login, RBAC, password reset, and audit logging. |
| `/ui` | Full UI quality pipeline. Orchestrates: design research --> contract --> TDD --> generation via official `frontend-design` plugin --> standards enforcement --> accessibility --> performance --> `/browser-qa` gate. |
| `/frontend-design` | Official plugin passthrough for UI generation. Called internally by `/ui`. For the full quality pipeline (TDD, standards, accessibility, browser QA), use `/ui` instead. |
| `/mobile` | React Native + Expo mobile development. TDD with React Native Testing Library, Detox E2E, NativeWind styling, EAS Build pipeline. Hexagonal architecture adapted for mobile. Scopes: `scaffold`, `feature`, `qa`, `release`. |
| `/dba` | Database schema design, data modeling, indexing strategy, and migration planning. ORM-aware (Prisma, TypeORM, Drizzle, Django ORM, ActiveRecord). Scopes: `design`, `index`, `seed`, `multi-tenant`, `review`. |
| `/data-migration` | Database migration strategy with zero-downtime schema changes. Covers backwards-compatible migrations, CQRS, event sourcing patterns, and state machine validation for complex domains. |

## Quality & Review

| Skill | Purpose |
|-------|---------|
| `/qa-loop` | Agentic QA orchestrator. Runs tiered quality gates (research, design, UX, backend, security, E2E) with automatic fix loops (max 3 iterations). Called from `/build` and `/feature-dev` at all quality gates. |
| `/browser-qa` | Exhaustive browser QA. Dual-engine: Cypress (programmatic, deterministic) + agent-browser (visual, exploratory). Crawls all pages, clicks all interactive elements, loops until zero failures and zero BLOCKER/MAJOR findings. |
| `/code-review` | Code review for bugs, architecture violations, security issues, and test coverage. Extends the official plugin with hexagonal architecture validation, TDD compliance, SOLID rules, and project-specific rules from `Rules.md`. |
| `/simplify` | Built-in skill (configured outside the skills directory). Reviews changed code for reuse, quality, and efficiency, then fixes any issues found. Equivalent to running `/refactor simplify` on the current diff. |
| `/perf-audit` | Performance audit: bundle analysis, database N+1 detection, caching strategy, Core Web Vitals thresholds, API response time profiling, and regression prevention. Scopes: `frontend`, `backend`, `full`. |
| `/security-hardening` | Proactive security hardening: OWASP Top 10 checklist, security headers, secrets management, dependency scanning, rate limiting, and encryption guidance. |

## Infrastructure & Operations

| Skill | Purpose |
|-------|---------|
| `/deploy` | Production deploy pipeline (8 phases): target detection, environment audit, security gate, production Docker config, Infrastructure-as-Code, secrets strategy, pre-deploy checklist, and post-deploy health validation. |
| `/ci-cd` | CI/CD pipeline generation for GitHub Actions, GitLab CI, Bitbucket Pipelines, or CircleCI. Includes quality gates, security scans, Conventional Commits validation, caching, and environment-based deploy automation. |
| `/observability` | Structured logging and OpenTelemetry instrumentation. Default backend: Grafana stack (Prometheus + Loki + Tempo + Grafana + Alertmanager). Docker Compose for local dev and production setup guidance. Scopes: `logging`, `tracing`, `metrics`, `all`. |

## Documentation & Planning

| Skill | Purpose |
|-------|---------|
| `/research` | Parallel research wave. Launches specialized agents (Business/Market, API/Docs, Architecture, Domain/Rules, Implementations, YouTube) based on topic type. Produces `RESEARCH.md` consumed by `/build` during planning. |
| `/docs-gen` | Living documentation generator: OpenAPI/Swagger from routes, C4 architecture diagrams (Mermaid), CHANGELOG from Conventional Commits, and developer runbook. Types: `openapi`, `c4`, `changelog`, `runbook`, `all`. |
| `/adr` | Architecture Decision Records. Documents technical decisions with context, options considered, and rationale. Creates a permanent record of why the codebase looks the way it does. |
| `/agent-teams` | Multi-team parallel orchestration. Token budget estimation, worktree isolation per team, wave decomposition, and handoff aggregation. For large-scale work requiring multiple coordinated agent teams. |
| `/resume` | Resume work autonomously from a checkpoint after context reset (`/clear` or `/compact`). Reads `.claude/checkpoint.md` and continues exactly where the previous session stopped. |
