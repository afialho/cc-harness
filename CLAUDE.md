# CLAUDE.md — [Project Name]

> Stack-agnostic AI development starter kit.
> Replace `[Project Name]` with your project name before using.

---

## Project Scale

O scale é capturado pelo `/ideate` (pergunta obrigatória) ou passado diretamente como argumento: `/build scale=MVP`.

| Scale | Quando usar | O que inclui |
|-------|------------|--------------|
| **MVP** | POC, validação de ideia, hackathon, protótipo | Auth, core feature, Docker dev, testes unitários básicos |
| **Product** | App indo a mercado, early stage | MVP + CI/CD (GitHub Actions), rate limiting, structured logging, testes E2E |
| **Scale** | Produto com tração, time crescendo | Product + OpenTelemetry → Grafana, feature flags, multi-tenancy, load tests |

**Regras em TODOS os scales:** TDD, BDD, auth gate, security-scan, hexagonal (ou pattern do projeto).
**Só em Product/Scale:** CI/CD, observabilidade, rate limiting, load tests.

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

### Início de projeto
| Skill | Purpose |
|-------|---------|
| `/ideate` | Entrevista colaborativa → feature map → MVP scope → IDEAS.md → handoff para /build |
| `/scaffold` | Inicializa projeto do zero: estrutura, Docker, testing, Git, GitHub. Chamado automaticamente pelo /build se projeto vazio |
| `/build` | Orquestrador completo: research → planning (gera PLAN.md) → implement. Entry point para tudo |
| `/adapt` | Auto-configure o kit para um projeto existente (rodar uma vez após adopt.sh) |

### Desenvolvimento de features
| Skill | Purpose |
|-------|---------|
| `/feature-dev` | Implementação TDD + arquitetura, 7 fases |
| `/auth` | Auth completa: JWT + refresh, OAuth2/social, RBAC, reset, audit. Stack-aware |
| `/ui` | Full UI pipeline: research → TDD → frontend-design → a11y → browser-qa gate |
| `/frontend-design` | Plugin oficial de geração de UI — chamado internamente pelo `/ui` |
| `/mobile` | React Native + Expo: scaffold, TDD (RNTL), Detox E2E, EAS Build |
| `/dba` | Schema design, modelagem, índices, multi-tenancy, seed data |
| `/data-migration` | Migrations zero-downtime, CQRS, event sourcing, state machines |

### Qualidade e revisão
| Skill | Purpose |
|-------|---------|
| `/qa-loop` | QA agentic: design, UX, backend, security, E2E + fix loop automático |
| `/browser-qa` | Browser QA exaustivo: crawl de toda a UI + fix loop até 0 falhas |
| `/code-review` | Revisão de arquitetura + TDD + segurança |
| `/simplify` | Refactor para reuso, qualidade e eficiência |
| `/perf-audit` | Bundle analysis, N+1 detection, caching, Core Web Vitals |
| `/security-hardening` | OWASP Top 10, headers, secrets audit, dependency scanning |

### Infra e operações
| Skill | Purpose |
|-------|---------|
| `/deploy` | Pipeline de deploy: infra-as-code, Docker prod, secrets, post-deploy validation |
| `/ci-cd` | CI/CD: GitHub Actions, GitLab CI, quality gates, security scans |
| `/observability` | Structured logging + OpenTelemetry → Grafana (Prometheus + Loki + Tempo) |

### Documentação e planejamento
| Skill | Purpose |
|-------|---------|
| `/research` | Parallel research wave → RESEARCH.md (mercado, libs, arquitetura, docs) |
| `/docs-gen` | OpenAPI, C4 diagrams (Mermaid), CHANGELOG, developer runbook |
| `/adr` | Architecture Decision Records: template, lifecycle, ADR index |
| `/agent-teams` | Orquestração multi-time em paralelo |
| `/resume` | Retoma trabalho a partir do checkpoint após reset de contexto |


@Rules.md
@Agents.md
