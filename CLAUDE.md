# CLAUDE.md — [Project Name]

> Stack-agnostic AI development starter kit.
> Replace `[Project Name]` with your project name before using.

---

## Project Scale

Declare o scale no início de cada projeto. Determina quais skills e infra são ativados.

| Scale | Quando usar | O que inclui |
|-------|------------|--------------|
| **MVP** | POC, validação de ideia, hackathon, protótipo | Auth, core feature, Docker dev, testes unitários básicos. Sem CI/CD, sem observabilidade, sem rate limit. |
| **Product** | App indo a mercado, early stage | MVP + CI/CD (GitHub Actions), rate limiting em auth, structured logging (pino), testes E2E |
| **Scale** | Produto com tração, time crescendo | Product + observabilidade completa (OpenTelemetry → Grafana), feature flags, multi-tenancy se necessário, load tests |

**Como usar:** ao iniciar `/ideate` ou `/build`, informar o scale. Ex: `/build scale=MVP`.
Se não informado → `/ideate` pergunta antes de avançar.

**Regras que se aplicam em TODOS os scales:** TDD, BDD, hexagonal, auth gate, security-scan.
**Regras que se aplicam só em Product/Scale:** CI/CD, observabilidade, rate limiting, load tests.

---

## Non-Negotiable Rules

**RTK CLI** — Prefix ALL commands with `rtk`: `rtk git status`, `rtk npm test`, `rtk docker compose up -d`

**Docker** — ALL services run in Docker. `docker-compose.yml` at project root. Never connect to host services.
```bash
rtk docker compose up -d      # start all services
rtk docker compose logs -f    # follow logs
rtk docker compose down       # stop
```

**Architecture** — Hexagonal. Layers are sacred:
```
src/domain/         Pure business logic. Zero external deps.
src/application/    Use cases. Depends on Domain + Ports only.
src/ports/          Interface contracts.
src/infrastructure/ Adapters implementing ports.
src/shared/         Cross-cutting (config, logging, utils).
```

**TDD** — RED → GREEN → REFACTOR. Always. Tests before implementation.

**BDD** — Gherkin scenarios before any code. Cucumber.js at `tests/bdd/features/`

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

System context starts ~18k tokens. Threshold: **60k total**.

At threshold → write `.claude/checkpoint.md` → output `↺ Contexto ~60k — escrevi checkpoint. Recomendo /compact.`
After /compact → SessionStart hook injects checkpoint → `/resume` retoma autonomamente.

Checkpoint format: skill, phase, files modified, exact next step, key decisions.

Token estimates: file read ~1k | agent call ~8k | long response ~2k | phase ~3k

---

## Progress Reporting

Before each phase/step: `▶ [N/Total] Phase Name`

---

## UI Quality Protocol

**Foundation first** — Todo build com UI começa por design system + layout base. Verificar com agent-browser antes de qualquer feature.

**Auth first** — Auth (register/login/logout) é sempre a primeira feature. Se auth falha no gate, o build para. Sem exceções.

**Phase gates** — Após cada feature com UI:
1. `rtk npx cypress run --spec tests/e2e/[feature].cy.ts`
2. `/qa-loop` com dimensões corretas para o tipo de feature
3. `/browser-qa <url>` — navegação exaustiva de todos os elementos da feature
4. Avança SOMENTE quando PASS — fix loop automático até lá

**Verificação final** — `/browser-qa <url>` + `/qa-loop` com todas as dimensões ao final do build.

---

## Skills

| Skill | Purpose |
|-------|---------|
| `/ideate` | Collaborative idea refinement: interview → feature map → MVP scope → IDEAS.md → handoff to /build |
| `/research` | Parallel research wave → RESEARCH.md (UX, libs, YouTube, docs) |
| `/build` | Full pipeline: research → clarify → plan → implement |
| `/plan` | Development plan with arch mapping, BDD, test plan |
| `/auth` | Auth completa: JWT + refresh rotation, OAuth2/social, RBAC, reset, audit. Stack-aware (Next.js/Node/RN/Django/Rails) |
| `/feature-dev` | TDD + hexagonal implementation, 7 phases |
| `/ui` | Full UI pipeline: research → TDD → geração via plugin oficial → enforce → browser-qa gate |
| `/frontend-design` | Plugin oficial — geração base de UI. Chamado internamente pelo `/ui` na Fase 5 |
| `/browser-qa` | Exhaustive browser QA: crawl all UI, detect + classify + fix all errors |
| `/code-review` | Architecture + quality + TDD + security review (extends `code-review@claude-plugins-official`) |
| `/simplify` | Refactor for reuse, quality, efficiency (extends `code-simplifier@claude-plugins-official`) |
| `/tdd` | Red → Green → Refactor guidance |
| `/hexagonal` | Hexagonal architecture reference |
| `/agent-teams` | Multi-team parallel orchestration |
| `/qa-loop` | QA agentic: design, UX, backend, security, E2E + fix loop automático |
| `/resume` | Resume from checkpoint after context reset |
| `/adapt` | Auto-configure the kit for an existing project (run once after adopt.sh) |
| `/deploy` | Deployment pipeline: infra-as-code, docker prod, secrets, post-deploy validation |
| `/ci-cd` | CI/CD pipeline generation: GitHub Actions, GitLab CI, quality gates, security scans |
| `/security-hardening` | Proactive security: OWASP Top 10, security headers, secrets audit, dependency scanning |
| `/perf-audit` | Performance audit: bundle analysis, N+1 detection, caching strategy, Core Web Vitals |
| `/docs-gen` | Living docs: OpenAPI, C4 diagrams (Mermaid), CHANGELOG, developer runbook |
| `/adr` | Architecture Decision Records: template, lifecycle, ADR index |
| `/mobile` | React Native + Expo mobile-first: scaffold, TDD com RNTL, Detox E2E, EAS Build |
| `/data-migration` | Database migrations, zero-downtime patterns, event sourcing/CQRS, state machines |
| `/observability` | Structured logging + OpenTelemetry → Grafana stack (Prometheus + Loki + Tempo) |
