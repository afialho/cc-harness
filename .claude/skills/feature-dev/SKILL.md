---
name: feature-dev
description: Implement a feature end-to-end with TDD (Red→Green→Refactor), hexagonal architecture, BDD (Cucumber), load tests (k6), Cypress E2E, and git worktree isolation. 7-phase workflow.
disable-model-invocation: true
argument-hint: <feature name>
---

# /feature-dev — Feature Implementation

Extends the official Anthropic feature-dev workflow with project-specific requirements:
TDD (Red→Green→Refactor), Hexagonal Architecture, BDD (Cucumber), Load Tests (k6), and Git Worktrees.

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

**Architecture constraints (read from `.claude/architecture.json`):**
- Hexagonal: domain layer zero external deps; application depends only on domain + ports; external deps behind port interfaces
- MVC: business logic in services (not controllers); controllers are thin; no direct DB calls in controllers
- Next.js App Router: server-side logic in lib/; keep 'use client' boundary as deep as possible; mutations via Server Actions
- Feature-based: features are self-contained; shared code only in src/shared/; no cross-feature imports
- Run `/hexagonal` if guidance needed on hexagonal-specific decisions

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

**Order of implementation — based on `.claude/architecture.json` pattern:**

*hexagonal (or new project):*
1. Domain entities and value objects (unit tests)
2. Port interfaces (src/ports/)
3. Application use cases (unit tests with fake adapters)
4. Infrastructure adapters (integration tests)
5. Composition root (wire adapters to ports)
6. Cucumber step definitions

*mvc-rails:*
1. Model + spec (unit tests — validations, associations, scopes)
2. Service + spec (unit tests — business logic)
3. Controller + spec (unit tests — action responses)
4. Request/integration tests
5. Cucumber step definitions

*mvc-express / mvc-nestjs:*
1. DTO/Model + test (unit tests)
2. Service + test (unit tests — business logic)
3. Controller + test (unit tests — response contracts)
4. Route wiring
5. Integration tests
6. Cucumber step definitions

*nextjs-app-router:*
1. lib/ functions + test (server-side logic, data fetching)
2. Server Actions (if mutations)
3. API Route Handlers + integration test (if new endpoint)
4. Server Components
5. Client Components + test
6. Cucumber step definitions

*feature-based:*
1. Business logic + test (services, utilities)
2. UI components (if applicable)
3. API integration (if applicable)
4. Integration tests
5. Cucumber step definitions

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

Use the **code-reviewer** agent to inspect all changes.

```
Agent: code-reviewer
Task: Review all files modified in this feature. Check:
      1. Architecture — hexagonal layers respected? No cross-layer violations?
      2. TDD — every behavior has a test? Tests test behavior, not internals?
      3. SOLID — Single Responsibility, Open/Closed, Liskov, Interface Segregation, DI?
      4. Clean Code — readable names? No magic numbers? No dead code?
      5. Security — injection risks? Auth gaps? Data exposure?
      6. Performance — N+1 queries? Obvious bottlenecks?

Output format:
  REVIEW: [PASS | FAIL | PASS_WITH_SUGGESTIONS]
  Blockers: [list or "None"]
  Suggestions: [list or "None"]
```

**Continuous improvement loop:**
```
run tests → if failures → fix → run tests again
run review → if blockers → fix → run review again
repeat until: all tests green AND review PASS
```

**Additional quality gates (run after review passes):**
- Cypress E2E (if UI involved): `rtk npx cypress run --spec tests/e2e/[feature].cy.ts`
- k6 load test (if endpoint added): `rtk k6 run tests/load/[feature].js`
  - Required threshold: p95 < 200ms at expected load
  - Required threshold: error rate < 1%

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
  ✅ Cypress E2E pass       (if applicable)
  ✅ k6 load within SLA     (if applicable)
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

## Deviating from this workflow

Only skip phases with explicit user approval:
- Skip Phase 3 (clarifying questions) if requirements are unambiguous
- Skip load test if the feature has no HTTP endpoints or performance requirements
- Skip Cypress if the feature is backend-only with no UI
- Never skip Phase 4 (architecture design) or Phase 6 (code review)
