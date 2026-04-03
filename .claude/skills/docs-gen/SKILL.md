---
name: docs-gen
description: Auto-generate living documentation: OpenAPI/Swagger from routes, C4 architecture diagrams (Mermaid), CHANGELOG from Conventional Commits, and developer runbook.
disable-model-invocation: true
argument-hint: [type: openapi | c4 | changelog | runbook | all]
---

# /docs-gen — Living Documentation Generator

Generate and maintain technical documentation that stays in sync with the codebase.
Run with a specific type to generate only that artifact, or `all` to generate everything.

---

## Workflow (6 Phases)

### Phase 1 — Detection
> **Emit:** `▶ [1/6] Detection`

Scan the codebase to understand what exists before generating anything.

**Detect API routes:**
- Express: scan `src/` for `router.get`, `router.post`, `app.get`, `app.post`, route files
- FastAPI: scan for `@app.get`, `@app.post`, `@router.get`, `APIRouter`
- NestJS: scan for `@Controller`, `@Get`, `@Post`, `@Put`, `@Delete`, `@Patch`
- Rails: scan `config/routes.rb`, `app/controllers/`
- Gin/Echo/Fiber: scan for `.GET(`, `.POST(`, `router.Handle`

**Detect existing docs:**
- Check `docs/` directory — what already exists
- Check `CHANGELOG.md` — does it follow Keep a Changelog format?
- Check `docs/adr/` — ADR index present?

**Detect architecture:**
- Read `.claude/architecture.json` if present
- Scan `src/` layer structure

**Detect git history:**
- Run `rtk git log --oneline --no-merges --format="%H %s" | head -200` to assess commit history quality

Report what was found. Confirm which artifacts will be generated based on argument (or `all`).

---

### Phase 2 — OpenAPI Generation
> **Emit:** `▶ [2/6] OpenAPI Generation`

Skip if: no API routes detected and argument is not `openapi`.

**Step 2.1 — Extract all endpoints**

For each route file found, extract:
- HTTP method + path (e.g., `POST /api/users`)
- Path parameters (`:id`, `{user_id}`)
- Query parameters (from `req.query`, `query: QueryDto`, etc.)
- Request body shape (from DTOs, Pydantic models, Zod schemas, serializers)
- Response shapes (from return types, serializers, `res.json()` calls)
- Auth requirements (middleware presence: `authenticate`, `@UseGuards`, `before_action`)
- Description (from JSDoc/docstring comments if present)

**Step 2.2 — Generate openapi.yaml**

Create `docs/openapi.yaml` following OpenAPI 3.1.0:

```yaml
openapi: 3.1.0
info:
  title: [Project Name from package.json or inferred]
  version: [version from package.json or "0.1.0"]
  description: [brief description]

servers:
  - url: http://localhost:[port]
    description: Local development
  - url: https://[staging-url]
    description: Staging (if detected from .env.example)

paths:
  /api/[resource]:
    [method]:
      summary: [inferred from controller name + action]
      operationId: [camelCase unique ID]
      tags: [resource name]
      security: [bearerAuth] # if auth middleware detected
      parameters: [path + query params]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/[DtoName]'
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/[ResponseName]'
        '400':
          $ref: '#/components/responses/ValidationError'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          $ref: '#/components/responses/NotFound'

components:
  schemas: [all DTOs, models, response shapes]
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
  responses:
    ValidationError: ...
    Unauthorized: ...
    NotFound: ...
```

**Step 2.3 — Security warnings**

For each endpoint, check:
- Missing input validation (no DTO, no schema, raw `req.body` access) → warn: `⚠ [METHOD /path] — no input validation detected (security risk)`
- Missing auth on non-public endpoints → warn: `⚠ [METHOD /path] — no auth middleware detected`
- Returning full DB objects that may include sensitive fields → warn: `⚠ [METHOD /path] — response may include sensitive fields, verify serialization`

Print all warnings after generating the file.

**Output:** `docs/openapi.yaml`

---

### Phase 3 — C4 Architecture Diagrams
> **Emit:** `▶ [3/6] C4 Architecture Diagrams`

Skip if: no `src/` directory and no `.claude/architecture.json`. Skip if argument is not `c4`.

Create `docs/architecture/` directory if not present.

**Diagram 1 — Context (c4-context.md)**

Shows the system and everything that interacts with it from outside.

```markdown
# C4 Context Diagram

> What is this system, who uses it, and what external systems does it integrate with?

[mermaid block]
C4Context
  title System Context: [Project Name]

  Person(user, "End User", "Uses the application via web or mobile")
  Person(admin, "Administrator", "Manages the platform")

  System(system, "[Project Name]", "Core application — [one-line purpose]")

  System_Ext(db, "Database", "[Postgres/MySQL/MongoDB — detected from compose]")
  System_Ext(email, "Email Provider", "[SendGrid/SES — if detected]")
  System_Ext(payment, "Payment Gateway", "[Stripe/PayPal — if detected]")

  Rel(user, system, "Uses", "HTTPS")
  Rel(admin, system, "Administers", "HTTPS")
  Rel(system, db, "Reads/writes", "SQL/TCP")
  Rel(system, email, "Sends emails", "SMTP/API")
[/mermaid]

**Narrative:** [2-3 sentences explaining what this diagram shows and key integration points]
```

**Diagram 2 — Container (c4-container.md)**

Shows the deployable units inside the system.

```markdown
# C4 Container Diagram

> What are the major deployable units and how do they communicate?

[mermaid block — showing API, frontend, DB, cache, queues from docker-compose.yml]
[/mermaid]

**Narrative:** [2-3 sentences]
```

**Diagram 3 — Component (c4-component.md)**

Shows the internal structure using the architecture layers from `architecture.json`.

```markdown
# C4 Component Diagram

> Internal structure of the [API/Backend] container.

[mermaid block — using actual layer names from architecture.json]
C4Component
  title Component Diagram: [Service Name]

  Container_Boundary(api, "API") {
    Component(routes, "Routes/Controllers", "HTTP handlers")
    Component(usecases, "Use Cases", "Application business logic")
    Component(domain, "Domain", "Core entities and rules")
    Component(adapters, "Adapters", "DB, external APIs, messaging")
  }

  Rel(routes, usecases, "Calls")
  Rel(usecases, domain, "Uses")
  Rel(usecases, adapters, "Via ports")
[/mermaid]

**Narrative:** [2-3 sentences]
```

Adapt diagrams to actual layers detected from `architecture.json` and `src/` structure. Do not invent layers that don't exist.

**Output:** `docs/architecture/c4-context.md`, `docs/architecture/c4-container.md`, `docs/architecture/c4-component.md`

> **Checkpoint:** Se contexto atingir ~60k tokens → escreve `.claude/checkpoint.md` com skill, fase, arquivos, próximo passo. Emite: `↺ Contexto ~60k. Recomendo /compact. Use /resume para continuar.`

---

### Phase 4 — CHANGELOG Generation
> **Emit:** `▶ [4/6] CHANGELOG Generation`

Skip if argument is not `changelog`.

**Step 4.1 — Read git history**
```bash
rtk git log --oneline --no-merges --format="%H|||%s|||%ad" --date=short
```

Also read existing version tags:
```bash
rtk git tag --sort=-creatordate | head -20
```

**Step 4.2 — Parse Conventional Commits**

Group commits by type:
- `feat:` → Features
- `fix:` → Bug Fixes
- `perf:` → Performance
- `docs:` → Documentation
- `refactor:` → Refactoring
- `test:` → Tests (omit from user-facing changelog)
- `chore:` → Maintenance (omit from user-facing changelog)
- `feat!:` or `BREAKING CHANGE:` → Breaking Changes (highest priority)

Group by version tag if tags exist, otherwise group by month.

**Step 4.3 — Generate/update CHANGELOG.md**

Follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format:

```markdown
# Changelog

All notable changes to this project will be documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

## [Unreleased]

### Breaking Changes
- (commits since last tag with feat! or BREAKING CHANGE)

### Added
- (feat: commits)

### Fixed
- (fix: commits)

### Performance
- (perf: commits)

### Documentation
- (docs: commits)

## [1.2.0] — 2026-01-15
### Added
- ...

[Unreleased]: https://github.com/[org]/[repo]/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/[org]/[repo]/compare/v1.1.0...v1.2.0
```

If `CHANGELOG.md` already exists: prepend new entries since last recorded version. Do not overwrite existing content.

**Output:** `CHANGELOG.md` (root)

---

### Phase 5 — Developer Runbook
> **Emit:** `▶ [5/6] Developer Runbook`

Skip if argument is not `runbook`.

Generate `docs/RUNBOOK.md`:

```markdown
# Developer Runbook — [Project Name]

> Operational reference for developers and on-call engineers.
> Last generated: [date]

---

## Local Development Setup

### Prerequisites
- Docker & Docker Compose (required — all services run in containers)
- [Node.js vXX / Python 3.XX / Go 1.XX — detected from package.json / pyproject.toml / go.mod]
- [Any other detected prerequisites]

### First-time setup
```bash
cp .env.example .env
# Edit .env — fill in required values (see Environment Variables section)
rtk docker compose up -d
rtk npm install          # or pip install / bundle install / go mod download
rtk npm run migrate      # or equivalent — if migrations detected
```

### Start development server
```bash
rtk docker compose up -d    # ensure services are running
rtk npm run dev             # or equivalent
```

Open: http://localhost:[port]

---

## Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
[populated from .env.example]

---

## Running Tests

```bash
# All tests
rtk npm test

# Unit tests only
rtk npm test -- tests/unit

# Integration tests only
rtk npm test -- tests/integration

# BDD (Cucumber)
rtk npx cucumber-js

# E2E (Cypress)
rtk npx cypress run

# Load tests (k6)
rtk k6 run tests/load/[endpoint].js
```

---

## Deployment

See `/deploy` skill for the full deployment pipeline.

Quick reference:
```bash
# Staging
rtk gh workflow run deploy.yml -f environment=staging

# Production (requires approval)
rtk gh workflow run deploy.yml -f environment=production
```

---

## Database

```bash
# Run migrations
rtk npm run migrate

# Rollback last migration
rtk npm run migrate:rollback

# Connect to DB (via Docker)
rtk docker compose exec db psql -U [user] -d [database]

# Reset DB (dev only)
rtk npm run db:reset
```

---

## Common Troubleshooting

### Docker containers won't start
```bash
rtk docker compose down -v          # stop and remove volumes
rtk docker compose up -d --build    # rebuild and start
rtk docker compose logs -f          # watch logs
```

### DB connection refused
- Confirm `docker compose up -d` ran successfully
- Check `DB_HOST` in `.env` — must be the Docker service name, not `localhost`
- Check port mapping: `rtk docker compose ps`

### Environment variable issues
- Copy `.env.example` → `.env` and fill all required values
- Restart services after changing `.env`: `rtk docker compose restart`

### Tests failing after fresh clone
- Ensure all containers are running: `rtk docker compose ps`
- Run migrations: `rtk npm run migrate`
- Seed test data if required: `rtk npm run db:seed:test`

### Port already in use
```bash
lsof -i :[port]     # find what's using the port
kill -9 [PID]       # stop it
```

---

## Architecture Overview

See `docs/architecture/` for C4 diagrams.

Key decisions documented in `docs/adr/` — ADR index at `docs/adr/README.md`.

**Layer responsibilities:**
[populated from .claude/architecture.json layers descriptions, or default hexagonal description]

---

## Monitoring & Alerting

| What broke | Where to look |
|-----------|---------------|
| Application errors | [logs service / Sentry — if detected in deps] |
| Slow queries | [DB slow query log / query analyzer] |
| Failed jobs | [queue dashboard — if queue service detected] |
| High error rate | [monitoring dashboard URL from .env or README] |

---

## Key Contacts & Resources

- Repository: [gh repo view --json url]
- CI/CD: [GitHub Actions / detected CI URL]
- ADRs: `docs/adr/README.md`
- OpenAPI spec: `docs/openapi.yaml` — serve with `npx @redocly/cli preview-docs docs/openapi.yaml`
```

**Output:** `docs/RUNBOOK.md`

---

### Phase 6 — Index Update
> **Emit:** `▶ [6/6] Index Update`

Create or update `docs/README.md` as a navigation index for all generated documentation:

```markdown
# Documentation — [Project Name]

## Technical Reference

| Document | Description | Location |
|----------|-------------|----------|
| API Reference (OpenAPI) | All endpoints, request/response schemas | [docs/openapi.yaml](openapi.yaml) |
| Architecture — Context | System and external actors | [docs/architecture/c4-context.md](architecture/c4-context.md) |
| Architecture — Containers | Deployable services | [docs/architecture/c4-container.md](architecture/c4-container.md) |
| Architecture — Components | Internal layer structure | [docs/architecture/c4-component.md](architecture/c4-component.md) |
| Developer Runbook | Setup, deployment, troubleshooting | [docs/RUNBOOK.md](RUNBOOK.md) |
| Architecture Decisions | Technical decisions with rationale | [docs/adr/README.md](adr/README.md) |
| Changelog | All notable changes by version | [CHANGELOG.md](../CHANGELOG.md) |

## Quick Start

```bash
cp .env.example .env && rtk docker compose up -d && rtk npm install
```

See [RUNBOOK.md](RUNBOOK.md) for full setup instructions.
```

Only include links to files that were actually generated or already exist.

---

## Invocation Examples

```bash
/docs-gen all          # generate everything (recommended for new projects)
/docs-gen openapi      # only OpenAPI spec
/docs-gen c4           # only C4 architecture diagrams
/docs-gen changelog    # only CHANGELOG from git history
/docs-gen runbook      # only developer runbook
```

---

## Output Summary

After each run, print:

```
DOCS GENERATED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
docs/openapi.yaml           [generated | skipped | updated]
docs/architecture/
  c4-context.md             [generated | skipped | updated]
  c4-container.md           [generated | skipped | updated]
  c4-component.md           [generated | skipped | updated]
CHANGELOG.md                [generated | skipped | updated]
docs/RUNBOOK.md             [generated | skipped | updated]
docs/README.md              [generated | skipped | updated]

Warnings: [N]               (list security warnings from Phase 2 if any)

Serve OpenAPI locally:
  npx @redocly/cli preview-docs docs/openapi.yaml
```

---

## Notes

- Re-run `/docs-gen` after adding new routes or significant refactors — docs drift fast.
- CHANGELOG is append-only: never overwrites existing entries, only prepends new ones.
- C4 diagrams use actual layer names from `.claude/architecture.json` — not generic placeholders.
- OpenAPI warnings are advisory, not blockers, but should be resolved before shipping.
- For ADR management, use `/adr <decision title>` — it integrates with the index at `docs/adr/README.md`.
