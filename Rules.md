# Rules.md — Project Rules & Constraints

> Rules marked **[AUTO]** are enforced deterministically by hooks in `.claude/settings.json`.
> All other rules are enforced through code review and the continuous improvement loop.

---

## Architecture Rules

### RULE-ARCH-001 [AUTO]
**Domain layer has zero external dependencies.**
- Files in `src/domain/` may only import from `src/domain/` and `src/shared/`
- No database, HTTP framework, ORM, or third-party library imports in domain
- Domain entities and value objects are pure: no I/O, no side effects
- *Enforcement: architecture-guard hook warns on Write/Edit to domain files*

### RULE-ARCH-002 [AUTO]
**Application layer depends only on domain and ports.**
- Files in `src/application/` import from `src/domain/`, `src/ports/`, and `src/shared/`
- No direct infrastructure imports (no DB clients, no HTTP clients) in application
- Use cases depend on port interfaces, never on concrete adapters
- *Enforcement: architecture-guard hook warns on Write/Edit to application files*

### RULE-ARCH-003
**Every infrastructure adapter implements a port interface.**
- Each file in `src/infrastructure/` must have a corresponding interface in `src/ports/`
- Example: `src/infrastructure/persistence/PostgresUserRepository.ts` implements `src/ports/outbound/UserRepository.ts`

### RULE-ARCH-004
**Dependency injection at the composition root.**
- Infrastructure adapters are injected into use cases, never instantiated inside them
- The composition root (entry point) is the only place that wires concrete implementations to ports

### RULE-ARCH-005
**No circular dependencies between layers.**
- Domain → nothing
- Application → Domain, Ports
- Ports → Domain only
- Infrastructure → Ports, Domain, Application (for use case wiring only)
- Shared → nothing else

---

## Testing Rules

### RULE-TEST-001 [ADVISORY]
**Write tests before implementation (TDD).**
- The RED phase (failing test) must precede the GREEN phase (implementation)
- Commit history should show test commits before implementation commits
- *Enforcement: tdd-guard hook adds context reminder when writing implementation files (advisory — does not hard-block)*

### RULE-TEST-002
**Every feature has BDD scenarios written before implementation starts.**
- Gherkin feature files in `tests/bdd/features/` exist before code is written
- Use `/build` (planning phase) to generate BDD scenarios as part of planning

### RULE-TEST-003
**Every domain and application file has a corresponding unit test.**
- `src/domain/X.ts` → `tests/unit/domain/X.test.ts`
- `src/application/Y.ts` → `tests/unit/application/Y.test.ts`
- Coverage target: 100% of business logic

### RULE-TEST-004
**Every infrastructure adapter has an integration test.**
- `src/infrastructure/Z.ts` → `tests/integration/Z.test.ts`
- Integration tests hit real or containerized dependencies (no mocks for external services)
- Domain objects are real — only external service dependencies may be mocked in integration tests

### RULE-TEST-005
**Load tests for every new API endpoint.**
- `tests/load/[endpoint-name].js` created for every new HTTP endpoint
- Baseline: p95 < 200ms at expected steady load
- Stress test: system stable at 2x expected peak
- Run with: `k6 run tests/load/[endpoint-name].js`

### RULE-TEST-006
**Cypress tests for every user-facing flow.**
- `tests/e2e/[feature-name].cy.ts` for every new user journey
- Covers happy path + key error states

### RULE-TEST-007
**No tests that test implementation details.**
- Tests verify behavior (what the code does), not implementation (how it does it)
- Refactoring must not break tests unless behavior changes

---

## Code Quality Rules

> SOLID completo (RULE-CODE-001 a 008) + Clean Code (RULE-CODE-002, 003, 004, 009).
> Enforcement: `qa-code` agent no `/qa-loop` verifica todos estes após cada feature.
> Key rules are injected at session start via `session-start.mjs` hook. Full rules are enforced by hooks (deterministic) and `/qa-loop` (code review).

### RULE-CODE-001
**Single Responsibility Principle (S em SOLID).**
- Each class: one reason to change
- Each function: one responsibility
- Functions < 20 lines (prefer < 10)
- Classes < 200 lines (prefer < 100)

### RULE-CODE-002
**No magic numbers or strings.**
- All constants defined with descriptive names
- Domain constants in `src/domain/constants/`
- Configuration values in `src/shared/config/`

### RULE-CODE-003
**Names reveal intent.**
- No single-letter variables (except loop indices)
- No abbreviations unless universally understood (id, url, db, api)
- Booleans: `isActive`, `hasPermission`, `canEdit`, `shouldRetry`
- Functions: verb + noun (`getUserById`, `processPayment`, `validateEmail`)
- No `data`, `info`, `manager`, `handler`, `util`, `helper` as standalone names

### RULE-CODE-004
**No dead code.**
- Remove unused imports, variables, functions, classes
- No commented-out code blocks (use git history)
- No TODO comments older than one sprint (convert to tracked issues)

### RULE-CODE-005
**Open/Closed Principle.**
- Classes/functions open for extension, closed for modification
- Add behavior via new classes or composition — don't modify existing stable code
- Use polymorphism, strategy pattern, or dependency injection to extend behavior
- If you find yourself adding `if type == X` to existing code, consider a new subtype instead

### RULE-CODE-006
**Liskov Substitution Principle.**
- Subtypes must be substitutable for their base types without altering correctness
- Overriding methods must honor the contract of the parent (preconditions no stricter, postconditions no weaker)
- Never throw exceptions in overrides where the parent doesn't
- If a subclass can't fulfill the parent's contract, it's inheritance misuse — prefer composition

### RULE-CODE-007
**Interface Segregation Principle.**
- Clients should not depend on methods they don't use
- Prefer many small, focused interfaces over one fat interface
- If an implementor leaves methods empty or throws `NotImplemented`, the interface is too broad — split it
- Each port interface should represent exactly one capability

### RULE-CODE-008
**Dependency Inversion Principle.**
- Depend on interfaces/abstract types, never on concrete implementations
- Constructor injection preferred over property or method injection
- No `new ConcreteClass()` inside business logic

### RULE-CODE-009
**DRY — Don't Repeat Yourself.**
- Every piece of knowledge must have a single, authoritative representation
- If you write the same logic twice, extract it — but only after the second occurrence (Rule of Three)
- DRY applies to logic, not necessarily to structure (two similar-looking functions with different semantics are NOT duplication)
- Prefer extraction to a shared module over copy-paste with minor variations

### RULE-CODE-010
**No defensive programming inside domain.**
- Domain assumes valid input (validate at application layer boundaries)
- Application layer validates all inputs before calling domain
- Infrastructure validates all external inputs

---

## Docker Rules

### RULE-DOCKER-001 [AUTO]
**All services run in Docker containers.**
- Every external dependency (DB, cache, queues, etc.) runs via `docker-compose.yml`
- Never connect to host machine services — always use container service names
- `docker-compose.yml` required at project root before any backend implementation
- *Enforcement: docker-guard hook hard-blocks (exit 2) at SessionStart if docker-compose.yml exists and Docker is not running. Advisory only for new projects without a compose file.*

### RULE-DOCKER-002
**One service per container.**
- Separate containers for: API, DB, cache, queue, frontend (if SSR)
- Use named networks — never `--network host` in production config
- Volumes for persistent data: DB data, uploads, logs

### RULE-DOCKER-003
**Environment parity: dev = staging = prod shape.**
- `.env.example` committed, `.env` gitignored
- All environment variables documented in `.env.example`
- Docker Compose overrides for dev (`docker-compose.override.yml`): hot reload, debug ports
- No hardcoded credentials anywhere — always from environment variables

---

## Git Workflow Rules

### RULE-GIT-001
**Use worktrees for every parallel feature.**
```bash
rtk git worktree add ../[project]-[feature] -b feature/[feature-name]
```
- Each independent feature/task runs in a separate worktree
- Never develop two unrelated features in the same working tree
- List active worktrees: `rtk git worktree list`
- Remove when merged: `rtk git worktree remove ../[project]-[feature]`
- *Reminder: session-start hook injects worktree command as context. Not hard-enforced (no exit code).*

### RULE-GIT-002 [AUTO]
**All commits must follow Conventional Commits format.**
- Format: `type(scope): description` (max 72 chars on first line)
- Types: `feat` | `fix` | `test` | `refactor` | `docs` | `chore` | `perf` | `style` | `ci` | `build` | `revert`
- Breaking change: add `!` → `feat(auth)!: remove legacy login endpoint`
- Examples:
  - `feat(auth): add JWT refresh token rotation`
  - `fix(board): correct card drag-drop on mobile`
  - `test(user): add unit tests for CreateUserUseCase`
  - `chore(docker): add postgres service to compose`
- *Enforcement: commit-guard hook hard blocks (exit 2) non-conforming commits*

### RULE-GIT-003
**No commits with failing tests.**
- Run tests before committing: `rtk npm test` (or stack equivalent)
- Never use `--no-verify`
- CI must pass before merge

### RULE-GIT-004
**Test commits precede implementation commits.**
- Git history must show: BDD scenario → unit test → implementation → refactor
- This is the TDD paper trail

### RULE-GIT-005
**GitHub repository created before first commit.**
- New projects: `rtk gh repo create [name] --private` before first push
- Repo name matches folder name
- Default branch: `main`
- Push with tracking: `rtk git push -u origin main`

---

## Efficiency Rules

### RULE-EFF-001 [ADVISORY]
**Use RTK CLI for all commands.**
- Prefix all CLI commands with `rtk`: `rtk git status`, `rtk npm test`, `rtk ls -la`
- RTK provides 60-90% token savings on dev operations
- *Enforcement: rtk-rewrite hook adds context reminder on every Bash tool call (advisory — does not hard-block)*

### RULE-EFF-002
**Prefer CLI over MCP.**
- When a CLI tool exists, use it instead of MCP
- CLI results are faster, deterministic, and token-efficient
- Use MCP only when no CLI alternative exists

### RULE-EFF-003
**Minimal file reads.**
- Use `Glob` and `Grep` before `Read` on large codebases
- Read only files needed for the current task
- Never read entire directories speculatively

---

## Agent Rules

### RULE-AGENT-001
**Maximum 5 agents in parallel.**
- Never launch more than 5 concurrent Agent tool calls
- If task needs more, create additional waves (sequential)

### RULE-AGENT-002
**Each agent executes exactly 1 granular activity.**
- If a task takes more than 30 minutes, decompose it further
- "Implement authentication" is NOT a valid single-agent task
- "Write unit test for LoginUseCase.execute() — invalid password case" IS valid

### RULE-AGENT-003
**Maximum 100k tokens per agent context.**
- Each agent monitors its token budget
- Write partial handoff before approaching the limit
- Signal orchestrator to spawn a continuation agent

### RULE-AGENT-004
**Context handoff required after every wave.**
- Every agent produces a structured handoff (see Agents.md for format)
- Orchestrator aggregates handoffs before starting next wave

### RULE-AGENT-005
**Reviewers are mandatory before marking a feature complete.**
- Every feature goes through at least one code-reviewer agent
- Review checks: architecture compliance, SOLID, test coverage, clean code

---

## Machine-Checkable Rules Configuration

Hooks read `.claude/architecture.json` for layer validation.
See `.claude/hooks/` for all automated enforcement scripts.

```jsonc
// .claude/architecture.json — architecture layer definitions
{
  "layers": {
    "domain": {
      "pattern": "src/domain/**",
      "allowedImportPrefixes": ["src/domain/", "src/shared/"],
      "description": "Pure business logic — zero external deps"
    },
    "application": {
      "pattern": "src/application/**",
      "allowedImportPrefixes": ["src/domain/", "src/ports/", "src/shared/"],
      "description": "Use cases — depends on domain and port interfaces only"
    },
    "ports": {
      "pattern": "src/ports/**",
      "allowedImportPrefixes": ["src/domain/"],
      "description": "Interface contracts (inbound + outbound)"
    },
    "infrastructure": {
      "pattern": "src/infrastructure/**",
      "allowedImportPrefixes": ["src/domain/", "src/application/", "src/ports/", "src/shared/"],
      "description": "Adapters implementing ports"
    },
    "shared": {
      "pattern": "src/shared/**",
      "allowedImportPrefixes": [],
      "description": "Cross-cutting concerns — no business logic"
    }
  },
  "testMapping": {
    "src/domain/**": "tests/unit/domain/**",
    "src/application/**": "tests/unit/application/**",
    "src/infrastructure/**": "tests/integration/**"
  }
}
```
