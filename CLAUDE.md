# CLAUDE.md

> AI development harness for Claude Code — stack-agnostic, fully autonomous.

---

## Project Capabilities

Instead of rigid tiers, capabilities are selected per project. `/build` infers defaults from context and presents an editable checklist at the UNDERSTANDING step.

**Always ON (non-negotiable):**
- Docker, Auth gate (if users exist), Security scan, Conventional Commits
- Unit tests, TDD, Agent-browser verification (navigate + test all screens)

**Inferred from context (user can add ✅ or remove ☐ any):**

| Capability | Default ON when | Skill/Tool |
|-----------|----------------|-----------|
| BDD (Gherkin) | always | Cucumber |
| E2E tests (Cypress) | UI exists | Cypress |
| Hexagonal architecture | new project or detected | architecture-guard |
| CI/CD | "production", "deploy", "team" | `/ci-cd` |
| Structured logging | backend + "production" | pino / structlog |
| Rate limiting | auth + public APIs | middleware |
| Security hardening | "production", "security" | `/security-hardening` |
| API documentation | "API", "public" | `/docs-gen` |
| Observability (OTel) | "monitoring", "tracing" | `/observability` |
| Load tests (k6) | "performance", "scale" | k6 |
| Multi-tenancy | "SaaS", "organizations" | tenant isolation |

Selected capabilities are saved in `.claude/capabilities.json` and drive which quality gates run in Phase 3.

---

## Non-Negotiable Rules

**RTK CLI** — Prefix ALL commands with `rtk`: `rtk git status`, `rtk npm test`, `rtk docker compose up -d`

**Docker** — ALL services run in Docker. `docker-compose.yml` at project root. Never connect to host services.
```bash
rtk docker compose up -d      # start all services
rtk docker compose logs -f    # follow logs
rtk docker compose down       # stop
```

**Architecture** — Defined in `.claude/architecture.json`. Default: hexagonal. Supported: `hexagonal`, `mvc-rails`, `mvc-express`, `nextjs-app-router`, `feature-based`, `flat`.
Session-start hook injects the active pattern at runtime. Respect the layer rules for the detected pattern — see `Rules.md` RULE-ARCH-001.

**TDD / BDD / Hexagonal** — ON by default. User can disable per capability at the UNDERSTANDING step.

**Agents** — Max 5 parallel. Each agent = 1 granular activity. 100k token budget per agent.

**Git** — Conventional Commits [AUTO enforced]. Worktrees for parallel work:
```bash
# Create repo
rtk gh repo create [name] --private && rtk git push -u origin main

# Worktrees
rtk git worktree add ../[project]-[feature] -b feature/[feat]
rtk git worktree list
rtk git worktree remove ../[project]-[feature]

# Commits (enforced format)
rtk git commit -m "feat(scope): description"
rtk git commit -m "fix(scope): description"
```

Full rules: `Rules.md` | Agent protocol: `Agents.md`

---

## Context Budget

System context starts ~18k tokens.

| Threshold | Action |
|-----------|--------|
| **60k** | Write `.claude/checkpoint.md` immediately — capture: skill in progress, phase N/N, files modified, exact next step, key decisions. Emit: `↺ Context ~60k — checkpoint written. Recommend /compact.` |
| **80k** | Strongly recommended: run `/compact`. After compact → SessionStart injects checkpoint → `/resume` resumes autonomously. |
| **100k** | Absolute limit — context quality degrades. Always compact before reaching this. |

Token estimates: file read ~1k | agent call ~8k | long response ~2k | phase ~3k

---

## Progress Reporting

Before each phase/step: `▶ [N/Total] Phase Name`

---

## Quality Gate Pipeline

Canonical sequence — always in this order:

```
1. Tests         → rtk npm test + rtk npx cucumber-js + rtk npx cypress run
2. Code Review   → /code-review (architecture + SOLID + TDD compliance)
3. QA Loop       → /qa-loop (multi-dimensional: code, security, backend, design, UX, a11y, e2e, perf)
4. Perf Audit    → /perf-audit (if load-tests or perf capability enabled)
5. Browser Audit → agent-browser crawl (exhaustive navigation — MANDATORY final gate)
```

Skip steps that don't apply (e.g., no browser crawl for backend-only libraries, no `/perf-audit` unless capability enabled).
Never reorder — earlier gates catch issues cheaper than later ones.

---

## UI Quality Protocol

**Foundation first** — Every build with UI starts with the design system + base layout. Verify with agent-browser before any feature.

**Auth first** — Auth (register/login/logout) is always the first feature. If auth fails the gate, the build stops. No exceptions.

**Phase gates** — After each feature with UI, run the Quality Gate Pipeline (above). Advance ONLY when PASS.

**Final verification** — Full Quality Gate Pipeline with all dimensions at the end of the build.

---

## Skills

Entry point: **`/build`** — auto-routes based on context:
- Empty project → `/scaffold`
- Vague idea → `/ideate` → resumes `/build` automatically
- UI transformation → `/redesign`
- Code refactoring → `/refactor`
- Architecture change → `/modernize`

**Operation modes:** `autonomous` (default — AI as PM, deep research defines feature set) | `guided` (user guides, detailed interview). Pass as argument: `/build guided`.

**Feature routing** — during implementation, `/build` delegates to specialized skills:

| Feature type | Delegate to | When |
|-------------|------------|------|
| Authentication | `/auth` | Register, login, logout, OAuth, RBAC |
| UI-heavy feature | `/ui` | Design system, complex components, accessibility |
| Schema/data model changes | `/dba design` | New entities, migrations, indexing |
| API contract validation | `/api-contract` | Breaking changes, versioning, backward compat |
| Production incident | `/hotfix` | Expedited fix with reduced gates |
| General feature | `/feature-dev` | Default for all other features |
| Complex feature (3+ components) | `/agent-teams` | Parallel teams with worktree isolation |

**Anti-stub:** zero placeholders in delivered UI. If a feature isn't implemented, its UI element must not exist. PM Validation checks completeness before every commit (RULE-CODE-011).

Mandatory QA after each feature: Quality Gate Pipeline (see above).

Full skill catalog: `docs/SKILLS.md`

---

Full rules: `Rules.md` | Agent protocol: `Agents.md` | Skills: `docs/SKILLS.md`
