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
| **Scale** | Produto com tração, time crescendo | Product + OpenTelemetry → Grafana, multi-tenancy, load tests (k6) |

**Regras em TODOS os scales:** auth gate, security-scan, Docker, Conventional Commits.
**Só em Product/Scale:** CI/CD, rate limiting, structured logging. **Só em Scale:** observabilidade completa (OTel), load tests (k6).

### Metodologia por scale

| Prática | MVP | Product | Scale |
|---------|-----|---------|-------|
| TDD | advisory | obrigatório | obrigatório |
| BDD (Gherkin) | opcional | obrigatório | obrigatório |
| Hexagonal (camadas) | advisory | obrigatório | obrigatório |
| E2E (Cypress) | opcional | obrigatório | obrigatório |
| Load tests (k6) | ❌ | opcional | obrigatório |
| CI/CD | opcional | obrigatório | obrigatório |
| Observabilidade | ❌ | structured logging | OTel → Grafana |

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

**TDD / BDD / Hexagonal** — Obrigatoriedade varia por scale (ver tabela acima). Nunca ignorar em Product/Scale.

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
| **60k** | Write `.claude/checkpoint.md` immediately — capture: skill in progress, phase N/N, files modified, exact next step, key decisions. Emit: `↺ Contexto ~60k — checkpoint escrito. Recomendo /compact.` |
| **80k** | Strongly recommended: run `/compact`. After compact → SessionStart injects checkpoint → `/resume` retoma autonomamente. |
| **100k** | Absolute limit — context quality degrades. Always compact before reaching this. |

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

Entry point: **`/build`** — auto-routes based on context:
- Projeto vazio → `/scaffold`
- Ideia vaga → `/ideate` → retoma `/build` automaticamente
- Transformação de UI → `/redesign`
- Refatoração de código → `/refactor`
- Mudança de arquitetura → `/modernize`

QA obrigatório após cada feature: `/qa-loop` + `/browser-qa` (gate final).

Full skill catalog: `docs/SKILLS.md`

---

Full rules: `Rules.md` | Agent protocol: `Agents.md` | Skills: `docs/SKILLS.md`
