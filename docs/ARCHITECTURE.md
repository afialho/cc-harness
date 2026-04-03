# Architecture Guide

This kit supports 6 architecture patterns. The active pattern is set in `.claude/architecture.json` and enforced by the `architecture-guard` hook.

> **Note:** The default `architecture.json` shipped with this kit uses hexagonal layers. Other patterns have different layer definitions — see each pattern below for its corresponding config.

---

## Supported Patterns

### `hexagonal` (default)

Ports & adapters architecture. Business logic is isolated from all external dependencies via port interfaces, with infrastructure adapters wired at the composition root.

**Directory structure:**
```
src/
├── domain/           Pure business logic — zero external deps
├── application/      Use cases — depends on domain + ports only
├── ports/            Interface contracts (inbound + outbound)
├── infrastructure/   Adapters implementing ports
├── shared/           Cross-cutting concerns (config, logging, utils)
└── main.ts           Composition root — wire everything here
```

**Import rules (enforced by hooks):**

| Layer | Can Import From | Cannot Import From |
|-------|-----------------|-------------------|
| `domain` | `domain`, `shared` | Everything else |
| `application` | `domain`, `ports`, `shared` | `infrastructure` |
| `ports` | `domain` | `application`, `infrastructure` |
| `infrastructure` | All layers | — |
| `shared` | Nothing | Business logic |

**Configuration:**
```json
{
  "pattern": "hexagonal",
  "layers": {
    "domain":         { "pattern": "src/domain/**",         "allowedImportPrefixes": ["src/domain/", "src/shared/"] },
    "application":    { "pattern": "src/application/**",    "allowedImportPrefixes": ["src/domain/", "src/ports/", "src/shared/"] },
    "ports":          { "pattern": "src/ports/**",          "allowedImportPrefixes": ["src/domain/"] },
    "infrastructure": { "pattern": "src/infrastructure/**", "allowedImportPrefixes": ["src/domain/", "src/application/", "src/ports/", "src/shared/"] },
    "shared":         { "pattern": "src/shared/**",         "allowedImportPrefixes": [] }
  }
}
```

---

### `mvc-rails`

Classic MVC for Rails, Django, and similar server-rendered frameworks. Business logic lives in services, not controllers. Controllers stay thin — receive request, call service, return response.

**Directory structure:**
```
app/
├── models/           Domain entities and data models
├── services/         Business logic and use cases
├── controllers/      Request handlers (thin — delegate to services)
└── views/            Presentation layer (templates, serializers)
```

**Import rules (advisory):**
- Models: standalone, no imports from controllers or views.
- Services: import models. No direct HTTP/request access.
- Controllers: import services and models. Never contain business logic.
- Views: import models for serialization only.

**Configuration:**
```json
{
  "pattern": "mvc-rails",
  "layers": {
    "models":      { "path": "app/models/",      "description": "Domain entities and data models" },
    "services":    { "path": "app/services/",     "description": "Business logic and use cases" },
    "controllers": { "path": "app/controllers/",  "description": "Request handlers" },
    "views":       { "path": "app/views/",        "description": "Presentation layer" }
  }
}
```

---

### `mvc-express`

MVC for Express, Fastify, NestJS, and similar Node.js backends. Same principle as `mvc-rails` — thin controllers, logic in services — but with a `routes/` layer for route definitions and `models/` (or DTOs) for data shapes.

**Directory structure:**
```
src/
├── models/           Data models, DTOs, and entities
├── services/         Business logic and use cases
├── controllers/      Request handlers (thin)
└── routes/           Route definitions and request entry points
```

**Import rules (advisory):**
- Models: standalone.
- Services: import models. No direct request/response access.
- Controllers: import services and models. No business logic.
- Routes: import controllers only (wiring layer).

**Configuration:**
```json
{
  "pattern": "mvc-express",
  "layers": {
    "models":      { "path": "src/models/",      "description": "Data models and entities" },
    "services":    { "path": "src/services/",     "description": "Business logic and use cases" },
    "controllers": { "path": "src/controllers/",  "description": "Request handlers" },
    "routes":      { "path": "src/routes/",       "description": "Route definitions and request entry points" }
  }
}
```

---

### `nextjs-app-router`

Next.js 13+ App Router structure. Server logic lives in `lib/`, `'use client'` is pushed as deep as possible, and Server Components are the default.

**Directory structure:**
```
src/
├── lib/              Server-side logic (queries, actions, utils)
├── app/              App Router — pages, layouts, route segments
│   └── api/          API Route Handlers
├── components/       React components (server and client)
└── shared/           Config, types, constants
```

**Import rules (advisory):**
- `lib/`: pure server logic. No React, no `'use client'`.
- Server Components: import from `lib/` and other Server Components freely.
- Client Components (`'use client'`): cannot import server-only code. Keep as leaf nodes.
- API Routes (`app/api/`): import from `lib/` only.
- Server Actions: defined in `lib/` or inline in Server Components with `'use server'`.

**Configuration:**
```json
{
  "pattern": "nextjs-app-router",
  "layers": {
    "lib":        { "path": "lib/",        "description": "Business logic, utilities, and server-side helpers" },
    "app":        { "path": "app/",        "description": "Next.js App Router — pages, layouts, route segments" },
    "api":        { "path": "app/api/",    "description": "API Route Handlers" },
    "components": { "path": "components/", "description": "React components (server and client)" }
  }
}
```

---

### `feature-based`

Each feature is a self-contained module with its own models, services, and routes. Features never import from each other — shared code goes in `src/shared/`.

**Directory structure:**
```
src/
├── features/
│   ├── auth/         Self-contained: model, service, controller, routes, tests
│   ├── billing/      Self-contained: model, service, controller, routes, tests
│   └── [feature]/    Each feature owns its full vertical slice
└── shared/           Cross-feature utilities, types, middleware
```

**Import rules (advisory):**
- Features: import from own feature directory and `src/shared/` only. No cross-feature imports.
- Shared: standalone — no imports from any feature.

**Configuration:**
```json
{
  "pattern": "feature-based",
  "layers": {
    "features": { "path": "src/features/", "description": "Feature modules — each feature is self-contained" },
    "shared":   { "path": "src/shared/",   "description": "Shared utilities, components, and cross-cutting concerns" }
  }
}
```

---

### `flat`

No enforced directory structure or import rules. The `architecture-guard` hook is disabled. Use this for scripts, CLIs, small utilities, or when adopting an existing codebase that doesn't fit other patterns.

**Directory structure:** None enforced.

**Import rules:** None enforced.

**Configuration:**
```json
{
  "pattern": "flat",
  "layers": {},
  "disabled": true
}
```

---

## How the Guard Works

The `architecture-guard` hook (`.claude/hooks/architecture-guard.mjs`) reads `.claude/architecture.json` at write time:

1. **Deterministic block (exit 2):** For `hexagonal` pattern, domain and application files importing known infrastructure packages (ORMs, HTTP clients, frameworks) are hard-blocked.
2. **Advisory context:** For all patterns, the hook injects layer descriptions and allowed imports as context when writing to tracked directories.
3. **Pattern detection:** The hook supports both `pattern` (glob-style, used by hexagonal) and `path` (prefix-style, used by MVC/feature-based) keys in layer definitions.

If no `.claude/architecture.json` exists, the hook defaults to `hexagonal`. Set `"disabled": true` to disable all enforcement.

---

## Hexagonal Deep Dive

The remainder of this document covers hexagonal in detail, since it is the default and most strictly enforced pattern.

### Detailed Directory Structure

```
src/
├── domain/                    Pure business logic
│   ├── [entity]/
│   │   ├── [Entity].ts        Entity definition
│   │   ├── [Entity]Id.ts      Typed ID value object
│   │   └── [Entity]Events.ts  Domain events (if applicable)
│   ├── [value-object]/
│   │   └── [ValueObject].ts
│   └── constants/
│       └── index.ts
│
├── application/               Use cases
│   ├── [feature]/
│   │   ├── [Action][Entity]UseCase.ts
│   │   ├── [Action][Entity]Command.ts  Input DTO
│   │   └── [Action][Entity]Result.ts   Output DTO
│   └── shared/
│
├── ports/                     Interface contracts
│   ├── inbound/               What the app exposes
│   │   └── I[Action][Entity]UseCase.ts
│   └── outbound/              What the app needs
│       ├── [Entity]Repository.ts
│       └── [Service]Port.ts
│
├── infrastructure/            Adapters
│   ├── persistence/
│   │   └── [technology]/
│   │       └── [Technology][Entity]Repository.ts
│   ├── http/
│   │   └── [technology]/
│   │       └── [Technology][Service].ts
│   └── [other-adapters]/
│
├── shared/                    Cross-cutting concerns
│   ├── config/
│   ├── logging/
│   ├── errors/
│   └── validation/
│
└── main.ts                    Composition root — wire everything here
```

### Adding a New Feature — Checklist

1. **Define the domain model**
   - [ ] Entity or Value Object in `src/domain/[feature]/`
   - [ ] Domain rules as methods on the entity (not in use cases)

2. **Define port interfaces**
   - [ ] Outbound port for any data storage: `src/ports/outbound/[Feature]Repository.ts`
   - [ ] Outbound port for any external service: `src/ports/outbound/[Feature]ServicePort.ts`

3. **Implement use cases**
   - [ ] One use case per user action: `src/application/[feature]/[Action][Feature]UseCase.ts`
   - [ ] Input/Output DTOs alongside each use case

4. **Implement infrastructure adapters**
   - [ ] Each adapter in `src/infrastructure/[technology]/`
   - [ ] Each adapter implements its port interface

5. **Wire in composition root**
   - [ ] Add new adapters and use cases to `src/main.ts`

6. **Tests**
   - [ ] Domain: `tests/unit/domain/[Feature].test.ts`
   - [ ] Use cases: `tests/unit/application/[Feature]UseCase.test.ts`
   - [ ] Adapters: `tests/integration/[Feature]Repository.test.ts`
   - [ ] BDD: `tests/bdd/features/[feature].feature`

### Common Mistakes

**Infrastructure in domain:**
```typescript
// WRONG — database in entity
import { prisma } from '../infrastructure/db'; // ❌

// RIGHT — domain entity is pure
export class User {
  // No imports from infrastructure
}
```

**Concrete class instead of port:**
```typescript
// WRONG — use case depends on concrete adapter
import { PostgresUserRepo } from '../infrastructure/...'; // ❌

// RIGHT — use case depends on port interface
import { UserRepository } from '../ports/outbound/UserRepository'; // ✅
constructor(private readonly users: UserRepository) {}
```

**Business logic in infrastructure:**
```typescript
// WRONG — business rule in adapter
class PostgresUserRepo implements UserRepository {
  async findByEmail(email: string) {
    const user = await db.query('SELECT...');
    if (!user.isActive) throw new Error('Account suspended'); // ❌ business logic here
    return user;
  }
}

// RIGHT — adapter just adapts data
class PostgresUserRepo implements UserRepository {
  async findByEmail(email: string) {
    const row = await db.query('SELECT...');
    return row ? User.reconstitute(row) : null; // ✅ just data mapping
  }
}
```
