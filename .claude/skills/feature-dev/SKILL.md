---
name: feature-dev
description: Implement a feature end-to-end with TDD (Red→Green→Refactor), multi-pattern architecture (hexagonal, MVC, Next.js App Router, feature-based), BDD (Cucumber), load tests (k6), Cypress E2E, and git worktree isolation. 7-phase workflow.
disable-model-invocation: true
argument-hint: <feature name>
---

# /feature-dev — Feature Implementation

> **Extends:** `feature-dev@claude-plugins-official`
> Adds: TDD (Red→Green→Refactor), Hexagonal Architecture, BDD (Cucumber), Load Tests (k6), Git Worktrees, and `/browser-qa` gate.
> The official plugin handles base feature scaffolding; this skill adds the project's quality and architecture layers on top.

---

## Workflow (7 Phases)

### Phase 1 — Discovery
> **Emit:** `▶ [1/7] Discovery`

Understand the requirement fully before touching any code.

- Restate the feature in your own words to confirm understanding
- Identify the user-facing behavior (what changes for the user?)
- Identify business rules and invariants (what must always be true?)
- Clarify ambiguities — ask the user if anything is unclear
- Define the Definition of Done (acceptance criteria)

### Phase 2 — Codebase Exploration
> **Emit:** `▶ [2/7] Codebase Exploration`

Use the **code-explorer** agent to map the existing codebase.

```
Agent: code-explorer
Task: Map existing architecture layers, identify patterns, trace execution paths
      relevant to this feature. Report:
      1. Read .claude/architecture.json to determine the architecture pattern (pattern field).
         If the file does not exist, assume hexagonal.
      2. Current file structure in the layers defined by architecture.json
         (e.g., src/domain/ + src/application/ for hexagonal; app/models/ + app/services/ for mvc-rails;
          app/ + lib/ + components/ for nextjs-app-router; src/features/ for feature-based)
      3. Existing test patterns (unit, integration, BDD) and their locations
      4. Conventions used (naming, error handling, dependency injection)
      5. Any existing code this feature will interact with
```

Output: context handoff with architecture map and conventions summary.

### Phase 3 — Clarifying Questions
> **Emit:** `▶ [3/7] Clarifying Questions`

Based on exploration, surface any remaining unknowns:

- Are there existing domain objects this feature extends or replaces?
- Are there existing ports that cover the needed interfaces, or new ones required?
- Are there performance requirements? (determines if k6 load test is needed)
- Is there a UI component? (determines if Cypress E2E is needed)
- Are there security constraints? (auth, authorization, data validation)

Ask the user. Wait for answers before proceeding.

### Phase 4 — Architecture Design
> **Emit:** `▶ [4/7] Architecture Design`

Use the **code-architect** agent to propose implementation approaches.

```
Agent: code-architect
Task: Propose 2–3 implementation approaches for this feature using the architecture
      pattern from .claude/architecture.json (read it first). For each approach document:

      If hexagonal:
      - Domain model changes (new/modified entities, value objects, domain events)
      - Application layer: use cases needed
      - Ports: new inbound/outbound interfaces
      - Infrastructure: adapters to implement

      If mvc-rails or mvc-express:
      - Model changes (new/modified models, validations, associations)
      - Service changes (business logic, use cases)
      - Controller changes (new actions or modifications)
      - Route changes

      If nextjs-app-router:
      - lib/ changes (server-side logic, data fetching, server actions)
      - Component changes (Server Components and Client Components)
      - API Route Handlers (if new endpoints needed)

      If feature-based:
      - Feature module structure (src/features/[name]/)
      - Business logic (services, hooks, utilities within the feature)
      - UI components within the feature (if applicable)

      For all patterns also document:
      - Trade-offs and recommended approach
      - BDD scenarios (Gherkin) for the feature
      - Test plan (unit / integration / E2E / load)
```

Present the options to the user. Get approval on the chosen approach before implementing.

> **Checkpoint:** Se o contexto estimado atingir ~60k tokens neste ponto, escreva `.claude/checkpoint.md` com: skill=feature-dev, phase=4/7, feature name, approach aprovado, BDD scenarios, arquivos planejados, proximo=Phase 5.
> Emita: `↺ Contexto ~60k — checkpoint escrito. Recomendo /compact.`

**Architecture constraints (read from `.claude/architecture.json`):**
- Hexagonal: domain layer zero external deps; application depends only on domain + ports; external deps behind port interfaces
- MVC: business logic in services (not controllers); controllers are thin; no direct DB calls in controllers
- Next.js App Router: server-side logic in lib/; keep 'use client' boundary as deep as possible; mutations via Server Actions
- Feature-based: features are self-contained; shared code only in src/shared/; no cross-feature imports
- Consult `.claude/architecture.json` and `Rules.md` for hexagonal-specific decisions

### Phase 5 — Implementation (TDD)
> **Emit:** `▶ [5/7] Implementation (TDD)`

Implement using strict Red→Green→Refactor. Git worktree isolation is mandatory.

#### 5.1 — Create worktree
```bash
rtk git worktree add ../[project]-[feature-name] -b feature/[feature-name]
```

#### 5.2 — BDD Feature File (FIRST — before any code)
Create `tests/bdd/features/[feature-name].feature` with the Gherkin scenarios from Phase 4.
This is the acceptance criteria. Nothing is done until these scenarios pass.

#### 5.3 — TDD Cycle (repeat for each behavior)

```
RED:      Write a failing test that describes one behavior
GREEN:    Write the minimum code to make it pass
REFACTOR: Improve readability, remove duplication, apply SOLID
```

**Leia `.claude/architecture.json` para determinar o padrão. Sequência por padrão:**

*hexagonal (ou projeto novo):* BDD → Domain entities → Ports → Use Cases → Adapters → Composition root → Cucumber → Cypress → k6
*mvc-rails:* BDD → Model + spec → Service + spec → Controller + request tests → Cucumber → Cypress
*mvc-express/nestjs:* BDD → DTO/Model → Service + tests → Controller + tests → Routes → Integration tests → Cucumber → Cypress → k6
*nextjs-app-router:* BDD → lib/ functions + tests → Server Actions → API Routes → Server Components → Client Components → Cucumber → Cypress → k6
*feature-based:* BDD → Business logic + tests → UI components → API integration → Integration tests → Cucumber → Cypress

Se `architecture.json` nao existir, assume hexagonal. Cypress e k6 sao condicionais (ver Phase 6).

**At each Write/Edit the `architecture-guard` hook fires:**
- Checks the file's layer
- Scans imports for forbidden packages (Prisma, axios, etc. in domain/application)
- Blocks if violation found

#### 5.4 — Agent Teams (for complex features)
If the feature requires parallel implementation across multiple layers, decompose into waves.
Max 5 agents per wave. Each agent: 1 granular activity. Max 100k tokens per agent.
See `Agents.md` for the full orchestration protocol.

**Example waves:**
```
Wave 1: [code-explorer]                                   — re-explore if needed
Wave 2: [test-writer-domain, bdd-writer]                  — tests first
Wave 3: [implementer-domain, implementer-ports]           — domain layer
Wave 4: [implementer-app, implementer-infra, test-integ]  — app + infra
Wave 5: [code-reviewer]                                   — quality gate
```

### Phase 6 — Quality Review
> **Emit:** `▶ [6/7] Quality Review`

Run tests until all pass, then execute the QA Loop:

**Step 1 — Tests:**
```
run tests → if failures → fix → run tests again
repeat until: all unit + integration + BDD green
```

**Step 2 — Cypress E2E (if UI involved):**
```bash
rtk npx cypress run --spec tests/e2e/[feature].cy.ts
```

**Step 3 — k6 load test (if endpoint added):**
```bash
rtk k6 run tests/load/[feature].js
# Required: p95 < 200ms, error rate < 1%
```

**Step 4 — QA Loop (dimensões baseadas no tipo de feature):**
```
/qa-loop (escopo: [feature name], dimensões: conforme tipo)
  UI only      → qa-design + qa-ux + qa-a11y + qa-e2e
  Backend only → qa-code + qa-backend + qa-security
  Full-stack   → qa-code + qa-design + qa-ux + qa-a11y + qa-backend + qa-security + qa-e2e
```

O QA Loop roda agentes independentes, agrega o QA Report e faz fix loop automático (máx 3 iterações) antes de retornar PASS ou escalar para o usuário.

**Gate**: `/qa-loop` PASS obrigatório antes de Phase 7.

### Phase 7 — Summary
> **Emit:** `▶ [7/7] Summary & Commit`

After all quality gates pass, produce a completion summary and commit.

**Commit (conventional commits format):**
```bash
rtk git add [specific files — never git add .]
rtk git commit -m "feat([scope]): [description]"
```

**Completion summary:**
```
FEATURE COMPLETE: [feature name]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Files created:    [N] files
Files modified:   [N] files
Tests added:      [N] unit, [N] integration, [N] BDD scenarios
Quality gates:
  ✅ All unit tests pass
  ✅ All integration tests pass
  ✅ BDD scenarios pass (Cucumber)
  ✅ Code review: PASS
  ✅ Cypress E2E pass           (if applicable)
  ✅ k6 load within SLA         (if applicable)
  ✅ Browser verification: PASS (if UI involved)
Branch: feature/[name]
Worktree: clean up with `rtk git worktree remove ../[project]-[feature-name]`
```

---

## Quick Reference — Test Commands

```bash
rtk npm test                                    # all tests
rtk npm test -- tests/unit                      # unit only
rtk npm test -- tests/integration               # integration only
rtk npx cucumber-js                             # BDD
rtk npx cypress run                             # E2E
rtk k6 run tests/load/[feature].js             # load test
```

---

## Tratamento de falhas

| Situacao | Comportamento |
|----------|---------------|
| Requisito impossivel descoberto | Reporta ao usuario com evidencia, aguarda decisao antes de continuar |
| Contradicao de arquitetura | Corrige a violacao, documenta a decisao no commit |
| Teste nao passa apos 3 tentativas | Documenta o bloqueio, marca como PARTIAL, continua demais itens |
| Dependencia faltando | Instala via Docker, documenta no handoff |
| Pergunta de clarificacao revela mudanca de escopo | Para a implementacao, volta para Phase 1 (Discovery) com o novo escopo |
| Contexto proximo de 80k tokens | Escreve checkpoint, emite recomendacao de /compact |

---

## Deviating from this workflow

Only skip phases with explicit user approval:
- Skip Phase 3 (clarifying questions) if requirements are unambiguous
- Skip load test if the feature has no HTTP endpoints or performance requirements
- Skip Cypress if the feature is backend-only with no UI
- Never skip Phase 4 (architecture design) or Phase 6 (code review)
