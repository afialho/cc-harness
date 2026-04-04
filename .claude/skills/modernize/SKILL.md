---
name: modernize
description: Transform a monolith into a structured, maintainable architecture. Analyzes the existing codebase, identifies bounded contexts, proposes target architecture (hexagonal monolith, modular monolith, or microservices), and executes the migration incrementally with zero downtime and full test coverage.
disable-model-invocation: true
argument-hint: [target: hexagonal | modular | microservices]
---

# /modernize — Monolith Modernization

> Transforms a monolith into a structured architecture.
> Analyzes what exists → identifies bounded contexts → proposes strategy → migrates incrementally.
> The system keeps running throughout the entire migration. Never a big bang rewrite.

---

## Available Targets

| Target | What it is | When to choose |
|--------|---------|----------------|
| `hexagonal` | Monolith restructured with hexagonal layers (domain, application, ports, infrastructure) | Monolith with mixed logic but reasonable scale — wants order without distributed complexity |
| `modular` | Monolith divided into well-defined modules with clear interfaces between them | Growing team, accumulating features, wants clear boundaries without microservices |
| `microservices` | Extraction of independent services with API/messaging communication | High scale, autonomous teams, parts of the system with distinct deploy cycles |

**Default recommendation:** start with `hexagonal` or `modular` before `microservices`.
Microservices introduce distributed complexity — only worth it when the problems they solve are real.

---

## Phase 1 — Monolith analysis

> **Emit:** `▶ [1/6] Analyzing the monolith`

### 1.1 — Structural mapping

```bash
# Directory structure
find . -type d -not -path '*/node_modules/*' -not -path '*/.git/*' -maxdepth 5

# Module sizes (identify the largest)
find src -name "*.ts" -o -name "*.js" -o -name "*.py" -o -name "*.rb" | \
  xargs wc -l 2>/dev/null | sort -rn | head -30
```

### 1.2 — Dependency mapping

Identify:
- **External dependencies**: which services/APIs the system consumes
- **Internal dependencies**: which modules import from which (dependency graph)
- **Problematic couplings**: modules that import from many others (high fan-out)
- **Bottlenecks**: modules imported by many others (high fan-in — candidates for extraction as library)

### 1.3 — Identify bounded contexts

A bounded context is a domain with its own language, entities, and rules.

Signs of distinct bounded contexts in code:
- Groups of entities that reference each other but rarely cross into other groups
- Business logic with its own terminology (e.g.: "invoice" in the billing context vs. "order" in the sales context)
- Parts of the system that change for different reasons (distinct change cycles)
- Data that does not need to be real-time consistent across parts of the system

For each bounded context identified, record:
```
Context: [name]
Main entities: [list]
Responsibility: [what this context does]
Dependencies on other contexts: [list]
Estimated size: [N] files
```

### 1.4 — Technical debt diagnostic

```
For each module/file:
  □ Violates separation of responsibilities (business logic mixed with DB/HTTP)?
  □ Has circular dependencies?
  □ Has tests? What is the coverage?
  □ Has > 500 lines? (candidate for extraction)
  □ Is directly accessed by more than 5 other modules? (candidate for interface)
```

### 1.5 — Diagnostic report

```
MONOLITH DIAGNOSTIC
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Size:            [N] files, [N] lines
Stack:           [language + framework]
Current coverage: [X]%

Bounded contexts identified:
  1. [context] — [N] files — [responsibility]
  2. [context] — [N] files
  ...

Critical issues:
  □ Business logic mixed with infrastructure in [N] files
  □ Circular dependencies in [list]
  □ [other issues]

Test coverage by context:
  [context 1]: [X]%
  [context 2]: [X]%
```

---

## Phase 2 — Migration strategy

> **Emit:** `▶ [2/6] Defining strategy`

### 2.1 — Choose migration pattern

**Strangler Fig (recommended for most cases):**
- Build new code alongside the old
- Gradually redirect to the new
- Remove the old when the new is validated
- Zero downtime, low risk, verifiable incremental progress

**Branch by Abstraction:**
- Introduce an interface in front of the legacy code
- Create new implementation behind the interface
- Swap the implementation when the new one is ready
- Ideal when the legacy code cannot be easily isolated

**Big Bang Rewrite (rarely recommended):**
- Rewrite everything at once in a new structure
- High risk, zero value delivered until the end
- Only justified if the legacy code is literally impossible to test or isolate

For functional monoliths: **Strangler Fig** or **Branch by Abstraction** always.

### 2.2 — Define migration order

Principles:
- Start with bounded contexts with **lowest coupling** (easiest to isolate)
- Leave for last the contexts with most dependencies between them
- Auth and shared infrastructure contexts go last (everything depends on them)

```
PROPOSED MIGRATION ORDER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase A (lowest coupling — start here):
  1. [context] — reason: [X external dependencies, easy to isolate]
  2. [context]

Phase B (medium coupling):
  3. [context]
  4. [context]

Phase C (highest coupling — last):
  5. [context] — reason: [depends on A and B, only isolate after]
  6. [context] — shared auth/infra
```

### 2.3 — Present proposal to user

```
MODERNIZATION PROPOSAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Target:      [hexagonal | modular | microservices]
Strategy:    Strangler Fig (incremental migration, zero downtime)
Contexts:    [N] bounded contexts identified

Migration sequence:
  [detailed order]

Estimate:
  [N] migration phases
  System functional in production throughout the entire migration

Identified risks:
  [list of risks with mitigation]
```

**PAUSE:** Awaits approval before any code modification.

> **Checkpoint:** Writes `.claude/checkpoint.md`:
> ```
> skill: modernize
> phase: strategy-approved
> files_modified: [list]
> next: safety-net
> ```
> If context reaches ~60k tokens → writes checkpoint and emits:
> `↺ Context ~60k. Recommend /compact. Use /resume to continue.`

---

## Phase 3 — Global safety net

> **Emit:** `▶ [3/6] Establishing safety net`

Before any migration, ensure adequate test coverage.

**Goal:** coverage >= 70% in files that will be modified.

For each bounded context in migration order:
1. Identify existing tests
2. Add tests for uncovered critical behaviors
3. Add integration tests for exposed APIs/endpoints
4. Verify that all pass

```bash
rtk npm test -- --coverage
# Record baseline: this coverage must not regress during migration
```

---

## Phase 4 — Migration by context

> **Emit:** `▶ [4/6] Migrating — Context [N/Total]`

For **each bounded context**, in sequence (one at a time):

### 4.1 — Create target structure

**Target hexagonal:**
```
src/[context]/
  domain/        Pure context entities
  application/   Use cases
  ports/         Interfaces (inbound + outbound)
  infrastructure/ Adapters
```

**Target modular:**
```
src/modules/[context]/
  [context].module.ts    Barrel export (public interface)
  [context].service.ts   Business logic
  [context].types.ts     Types and DTOs
  [context].repository.ts Data access
```

**Target microservices:**
```
services/[context]/      Independent service (own package.json, Dockerfile)
  src/
  tests/
  Dockerfile
  docker-compose.yml (development)
```

### 4.2 — Migrate with Strangler Fig

```
Step 1: Create new EMPTY module/service alongside the old one
Step 2: Implement one feature of the context in the new module (TDD)
Step 3: Add feature flag or adapter that redirects to the new one
Step 4: Test new behavior in production (or staging)
Step 5: When validated → remove the corresponding old code
Step 6: Repeat for the next feature of the context
```

For microservices, add after Step 1:
- Define API contract (OpenAPI) of the service
- Configure communication (synchronous REST or asynchronous messaging)
- Add service to global docker-compose

### 4.3 — Verification after each context

```bash
rtk npm test             # tests must not regress
rtk docker compose up -d # system must start completely
```

If `/qa-loop` reveals regression → revert the context, diagnose, restart.

---

## Phase 5 — Cleanup and consolidation

> **Emit:** `▶ [5/6] Cleanup`

After all contexts are migrated:

1. **Remove legacy code** — all code that was replaced by the Strangler Fig
2. **Check circular dependencies** — none should exist after migration
3. **Update `architecture.json`** — reflect the new structure
4. **Update Docker Compose** — for microservices, ensure all services start

```bash
# Verify that no legacy file is still imported
rtk grep -r "from.*legacy\|require.*legacy\|import.*old" src/ --include="*.ts"
```

---

## Phase 6 — Final validation

> **Emit:** `▶ [6/6] Validation`

```bash
rtk npm test                    # 100% of tests passing
rtk docker compose up -d        # all services start
```

```
/qa-loop (scope: full system, dimensions: qa-code + qa-backend + qa-security)
```

If there is UI: `/browser-qa <url>` — verify that no flow broke.

### Final output

```
MODERNIZE COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Target:          [hexagonal | modular | microservices]
Strategy:        Strangler Fig

Before:
  Architecture:  Unstructured monolith
  Coverage:      [X]%
  Mixed bounded contexts: [N]

After:
  Architecture:  [target] with [N] isolated contexts
  Coverage:      [Y]% (+[Z]%)
  Legacy code removed: [N] files

[If microservices:]
Services created:
  ├─ [service-1]  → port [N]  (responsibility: [X])
  ├─ [service-2]  → port [N]
  └─ [service-N]  → port [N]

Tests:           ✅ PASS (no regressions)
Architecture:    ✅ architecture.json updated
System:          ✅ rtk docker compose up -d functional
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Rules

1. **Never big bang** — incremental migration with Strangler Fig; if not possible, Branch by Abstraction; big bang only as last resort explicitly approved
2. **System functional at all times** — after each context migrated, the system must work in production
3. **Safety net first** — test coverage established before any modification
4. **Tests don't regress** — a test that passes before migration cannot fail after
5. **Microservices are the last step** — never extract services before having clear boundaries (hexagonal or modular first)
6. **One context at a time** — never migrate two contexts in parallel (refactoring conflicts)
7. **`architecture.json` updated** — at the end, reflects the new structure so that hooks and skills work correctly
