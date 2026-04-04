---
name: adapt
description: Auto-configure cc-harness for an existing project. Detects stack, architecture pattern, and test framework. Updates architecture.json, CLAUDE.md, and hooks to match the real project structure. Run once after adopt.sh.
disable-model-invocation: true
---

# /adapt — Configure the Kit for an Existing Project

Run after `adopt.sh` has installed the kit in an existing project.
Detects the real stack and automatically adapts all configurations.

---

## When to use /adapt vs. other skills

| I want to... | Right skill |
|----------|------------|
| **Install the kit** in a project that already exists and configure it for the project's stack | `/adapt` (this skill) |
| **Improve code quality** — clean, extract, reorganize layers | `/refactor` |
| **Change the app's interface** — new visual, new UX, new components | `/redesign` |
| **Change the architecture** — hexagonal, modular, microservices | `/modernize` |
| **Build something new** — feature, product, prototype | `/build` |

**Practical rule:**
- Just ran `adopt.sh`? → `/adapt` first, then `/build` for features
- Kit already installed and you want to improve code? → `/refactor`
- Kit already installed and you want to change architecture? → `/modernize`

---

---

## Phase 1 — Exploration

> **Emit:** `▶ [1/6] Exploring the project`

### Detect language and runtime

Check for the existence of the following files (use Glob and Read):

- `package.json` → Node.js / TypeScript / JavaScript
- `pyproject.toml` ou `requirements.txt` → Python
- `go.mod` → Go
- `Gemfile` → Ruby
- `pom.xml` ou `build.gradle` → Java / Kotlin
- `Cargo.toml` → Rust

### Detect framework

**Node.js — read `package.json` (field `dependencies`):**

| Dependency | Framework |
|---|---|
| `next` | Next.js |
| `react` (sem `next`) | React (SPA) |
| `vue` | Vue |
| `express` | Express |
| `fastify` | Fastify |
| `@nestjs/core` | NestJS |
| `@hapi/hapi` | Hapi |

**Python — read `requirements.txt` or `pyproject.toml`:**

| Package | Framework |
|---|---|
| `django` | Django |
| `fastapi` | FastAPI |
| `flask` | Flask |

**Ruby — read `Gemfile`:**

| Gem | Framework |
|---|---|
| `rails` | Rails |
| `sinatra` | Sinatra |

### Detect test framework

**Node.js — read `package.json` (field `devDependencies`):**

| Dependency | Framework |
|---|---|
| `jest` | Jest |
| `vitest` | Vitest |
| `@playwright/test` | Playwright |
| `cypress` | Cypress |

**Python:** `pytest` em requirements → pytest

**Ruby:** `rspec` em Gemfile → RSpec

**Go:** presence of `*_test.go` files or `testing` in `go.mod` → Go testing

### Detect architectural pattern

Execute via Bash:

```bash
find . -type d \
  -not -path '*/node_modules/*' \
  -not -path '*/.git/*' \
  -not -path '*/dist/*' \
  -not -path '*/build/*' \
  -not -path '*/.next/*' \
  -maxdepth 4
```

Map result to pattern:

| Directories present | Pattern |
|---|---|
| `src/domain/` **and** `src/application/` | **hexagonal** |
| `app/models/`, `app/controllers/`, `app/views/` | **MVC (Rails/Django)** |
| `src/routes/`, `src/controllers/`, `src/services/`, `src/models/` | **MVC (Express/NestJS)** |
| `apps/` with feature subdirectories (e.g.: `users/`, `products/`) | **Django apps / feature-based** |
| `src/features/` or `src/modules/` | **feature-based** |
| `app/` with `layout.tsx` or `page.tsx` inside | **Next.js App Router** |
| `pages/` at root | **Next.js Pages Router** |
| No clear pattern above | **flat/unknown** |

Also check if `.claude/architecture.json` already exists with custom content. If so, record as "existing customizations detected" and warn in Phase 2.

---

## Phase 2 — Diagnostic

> **Emit:** `▶ [2/6] Diagnosing compatibility`

Determine compatibility of each hook with the detected stack:

**architecture-guard:**
- hexagonal → `✅ compatible` (check if paths match the real structure)
- any other pattern → `⚠ needs reconfiguration` or `❌ not applicable`

**tdd-guard:**
- Jest → `✅ compatible`
- Vitest, pytest, RSpec, Go testing → `⚠ file extensions to update`
- no framework detected → `❌ not applicable`

**Test command:**

| Framework | Comando |
|---|---|
| Jest | `npm test` ou `npm run test` |
| Vitest | `npm run test` |
| pytest | `python -m pytest` |
| RSpec | `bundle exec rspec` |
| Go testing | `go test ./...` |

Present complete diagnostic before any changes:

```
DIAGNOSTIC
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Detected stack:      [language + framework]
Architectural pattern: [hexagonal | MVC | feature-based | flat | Next.js App Router]
Test framework:      [name]
Test command:        [command]

Compatibility:
  architecture-guard: [✅ compatible | ⚠ needs reconfiguration | ❌ not applicable]
  tdd-guard:          [✅ compatible | ⚠ extensions to update | ❌ not applicable]

What will be changed:
  - .claude/architecture.json → [change description]
  - CLAUDE.md (or CLAUDE.kit.md) → [change description]
  - .claude/hooks/session-start.mjs → test commands updated
  [other detected items]

⚠ Existing customizations detected: [yes/no — if yes, list files]

Proceed? (yes/adjust)
```

**Wait for explicit user confirmation before proceeding to Phase 3.**

If the user responds "adjust", ask what should be corrected in the diagnostic and repeat the revised diagnostic before proceeding.

---

## Phase 3 — Update architecture.json

> **Emit:** `▶ [3/6] Configuring architecture`

Generate and write `.claude/architecture.json` based on the detected pattern.

### hexagonal (pattern already correct)

Check if the paths in `allowedImportPrefixes` match the real structure.
Fix only what doesn't match. Don't overwrite what is already correct.

```json
{
  "pattern": "hexagonal",
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
  }
}
```

### MVC (Rails / Django)

```json
{
  "pattern": "mvc-rails",
  "layers": {
    "models": {
      "path": "app/models/",
      "description": "Domain entities and data models"
    },
    "controllers": {
      "path": "app/controllers/",
      "description": "Request handlers"
    },
    "services": {
      "path": "app/services/",
      "description": "Business logic and use cases"
    },
    "views": {
      "path": "app/views/",
      "description": "Presentation layer"
    }
  },
  "note": "MVC pattern — architecture-guard layer enforcement disabled (not hexagonal)"
}
```

### MVC (Express / NestJS)

```json
{
  "pattern": "mvc-express",
  "layers": {
    "routes": {
      "path": "src/routes/",
      "description": "Route definitions and request entry points"
    },
    "controllers": {
      "path": "src/controllers/",
      "description": "Request handlers"
    },
    "services": {
      "path": "src/services/",
      "description": "Business logic and use cases"
    },
    "models": {
      "path": "src/models/",
      "description": "Data models and entities"
    }
  },
  "note": "MVC pattern — architecture-guard layer enforcement disabled (not hexagonal)"
}
```

### Next.js App Router

```json
{
  "pattern": "nextjs-app-router",
  "layers": {
    "app": {
      "path": "app/",
      "description": "Next.js App Router — pages, layouts, route segments"
    },
    "components": {
      "path": "components/",
      "description": "React components (server and client)"
    },
    "lib": {
      "path": "lib/",
      "description": "Business logic, utilities, and server-side helpers"
    },
    "api": {
      "path": "app/api/",
      "description": "API Route Handlers"
    }
  },
  "note": "Next.js App Router — architecture-guard adapted for Next.js structure"
}
```

### feature-based

```json
{
  "pattern": "feature-based",
  "layers": {
    "features": {
      "path": "src/features/",
      "description": "Feature modules — each feature is self-contained"
    },
    "shared": {
      "path": "src/shared/",
      "description": "Shared utilities, components, and cross-cutting concerns"
    }
  },
  "note": "Feature-based architecture — architecture-guard layer enforcement disabled"
}
```

### flat / unknown

```json
{
  "pattern": "flat",
  "layers": {},
  "disabled": true,
  "note": "Architecture pattern not detected — architecture-guard disabled. Update manually if needed."
}
```

> **Checkpoint:** If context reaches ~60k tokens → writes `.claude/checkpoint.md` with skill: adapt, phase: 3, detected pattern, files to change, next step. Emits: `↺ Context ~60k. Recommend /compact. Use /resume to continue.`

---

## Phase 4 — Update CLAUDE.md and hooks

> **Emit:** `▶ [4/6] Updating configurations`

### CLAUDE.md / CLAUDE.kit.md

Determine which file to use:
- If `CLAUDE.kit.md` exists at root → edit `CLAUDE.kit.md`
- Otherwise → edit `CLAUDE.md`

Locate the section `## Core Development Principles` and within it the subsection `### 1. Hexagonal Architecture`.
Replace that subsection with the block corresponding to the detected pattern:

**hexagonal** — keep original content, only fix paths if needed.

**MVC (Rails/Django):**
```markdown
### 1. Architecture — MVC (Rails/Django)
MVC pattern detected. Business logic in `app/services/`, models in `app/models/`.

```
app/
  models/       Entities and data logic
  controllers/  Request handlers
  services/     Business logic (use cases)
  views/        Presentation layer
```

Test command: `bundle exec rspec`
```

**MVC (Express/NestJS):**
```markdown
### 1. Architecture — MVC (Express/NestJS)
MVC pattern detected. Routes in `src/routes/`, logic in `src/services/`.

```
src/
  routes/      Entry points and route definitions
  controllers/ Request handlers
  services/    Business logic (use cases)
  models/      Data models and entities
```

Test command: `npm test`
```

**Next.js App Router:**
```markdown
### 1. Architecture — Next.js App Router
Next.js App Router detected. Server Components by default, Client Components with `'use client'`.

```
app/           Pages, layouts, route segments (App Router)
app/api/       API Route Handlers
components/    React components (server and client)
lib/           Business logic and server-side helpers
```

Test command: `npm test`
```

**feature-based:**
```markdown
### 1. Architecture — Feature-Based
Feature-based architecture. Each feature is self-contained in `src/features/`.

```
src/
  features/    Feature modules (each feature is self-contained)
  shared/      Shared utilities, components and concerns
```

Test command: `npm test`
```

**flat/unknown:**
```markdown
### 1. Architecture — Not detected
Architectural pattern not automatically identified.
Update `.claude/architecture.json` manually with the project's layers.

Test command: [update manually]
```

Also update the tests section to reflect the correct test command for the detected stack.

### session-start.mjs

Locate the file `.claude/hooks/session-start.mjs`.
Find the block that defines test commands (look for references to `npm test`, `jest`, `vitest`, etc.).
Replace with the correct command detected in Phase 1.

If the file does not exist, skip this step and record in the final report.

### architecture-guard hook

Locate the file `.claude/hooks/architecture-guard.*` (any extension).
If `architecture.json` has `"disabled": true`:
- Add at the beginning of the hook, after any shebang or imports, the following check:

  **Para shell scripts:**
  ```sh
  # Check if architecture guard is disabled
  DISABLED=$(node -e "const c=require('./.claude/architecture.json'); console.log(c.disabled||false)" 2>/dev/null)
  if [ "$DISABLED" = "true" ]; then exit 0; fi
  ```

  **Para arquivos .mjs / .js:**
  ```js
  import { readFileSync } from 'fs';
  const arch = JSON.parse(readFileSync('.claude/architecture.json', 'utf-8'));
  if (arch.disabled) process.exit(0);
  ```

If the hook does not exist, skip this step and record in the final report.

---

## Phase 5 — Validation

> **Emit:** `▶ [5/6] Validating configuration`

Verify that the changes made are functional:

### 5.1 — Validar architecture.json

```bash
node -e "const c = JSON.parse(require('fs').readFileSync('.claude/architecture.json','utf8')); console.log('pattern:', c.pattern); console.log('layers:', Object.keys(c.layers || {}).join(', ')); console.log('valid: true')"
```

If it fails (invalid JSON, parse error) → fix before continuing.

### 5.2 — Validate hooks

Verify that essential hooks exist and are executable:

```bash
# Verify that hooks exist
ls -la .claude/hooks/session-start.mjs .claude/hooks/architecture-guard.mjs .claude/hooks/tdd-guard.mjs 2>/dev/null
```

If `architecture.json` has `"disabled": true` → verify that architecture-guard respects the flag:
```bash
echo '{"tool_name":"Write","tool_input":{"file_path":"test.ts","content":"import x from \"prisma\""}}' | node .claude/hooks/architecture-guard.mjs
# Should return ALLOW (not block) when disabled
```

### 5.3 — Test stack detection

```bash
# Run session-start and verify it detects the correct stack
echo '{}' | node .claude/hooks/session-start.mjs 2>/dev/null | node -e "process.stdin.on('data',d=>{const o=JSON.parse(d);console.log(o.additionalContext?.substring(0,500))})"
```

Verify that the output mentions the correct stack and framework (detected in Phase 1).

If any validation fails → fix the affected file and re-validate before advancing to the report.

---

## Phase 6 — Final report

> **Emit:** `▶ [6/6] Adaptation complete`

Present complete report:

```
ADAPT COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Stack:    [language + framework]
Pattern:  [detected architectural pattern]

Changes made:
  ✅ .claude/architecture.json — [description of what was changed]
  ✅ CLAUDE.md (or CLAUDE.kit.md) — architecture section updated for [pattern]
  ✅ .claude/hooks/session-start.mjs — test command: [command]
  [list other changed files]

Items skipped (file not found):
  [list items that were skipped and the reason]

Skills available for this project:
  /build       → entry point: research → planning (PLAN.md) → implement
  /research    → research before any feature
  /feature-dev → TDD implementation + detected architecture
  /dba         → schema design, indexes, multi-tenancy (before implementing new entities)
  /adapt       → run again if the stack changes

⚠ Verify manually:
  [list of items that need human attention]
  Examples:
  - architecture-guard disabled (non-hexagonal pattern detected)
  - tdd-guard: file extensions not automatically updated for [framework]
  - session-start.mjs not found — update the test command manually

Ready. Use /build <your idea> to get started.
```

---

## Behavior Notes

- **Never overwrite without confirming** — Phase 2 always presents the complete diagnostic and waits for explicit confirmation before changing any file.
- **Be conservative when in doubt** — if the architectural pattern cannot be clearly determined, report as "flat/unknown" and disable guards instead of configuring incorrectly.
- **Preserve existing customizations** — if `.claude/architecture.json` or `CLAUDE.md` have already been edited by the user, detect, warn in the diagnostic and don't overwrite without explicit confirmation.
- **Skip missing steps gracefully** — if an expected file (e.g.: `session-start.mjs`, `architecture-guard`) doesn't exist, record in the final report instead of failing.
- **Don't create files beyond those listed** — this skill updates existing kit files. Don't create new configuration files.
