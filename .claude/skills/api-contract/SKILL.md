---
name: api-contract
description: API contract validation and backward compatibility. Detects breaking changes, generates API changelog, validates versioning strategy, and produces contract tests. Run before deploying API changes.
disable-model-invocation: true
argument-hint: [scope? e.g. "all", "v2", "users endpoint"]
---

# /api-contract — API Contract Validation

> Validates API backward compatibility before deploy. Detects breaking changes, generates contract tests, and produces an API changelog.
> Run BEFORE `/deploy` when API endpoints were modified.

---

## Pipeline Overview

```
/api-contract [scope?]
    │
    ├─ [1/5] API Discovery
    │         ├─ detect all API endpoints (routes, controllers, handlers)
    │         ├─ extract request/response schemas
    │         └─ identify what changed (git diff)
    │
    ├─ [2/5] Breaking Change Detection
    │         ├─ classify changes (breaking / non-breaking / additive)
    │         └─ generate compatibility report
    │
    ├─ [3/5] Contract Tests
    │         └─ generate or update API contract tests
    │
    ├─ [4/5] Versioning Strategy
    │         └─ recommend versioning approach if breaking changes exist
    │
    └─ [5/5] API Changelog
              └─ generate human-readable changelog of API changes
```

---

## When to invoke

| Context | Action |
|---------|--------|
| Before `/deploy` with API changes | Run `/api-contract` to detect breaking changes |
| After adding/modifying endpoints | Run `/api-contract [endpoint]` to validate |
| Before major version bump | Run `/api-contract all` for full audit |
| Mobile app + API (multi-client) | **Mandatory** — mobile clients can't update instantly |
| Public API with external consumers | **Mandatory** — breaking changes affect third parties |

---

## Phase 1 — API Discovery

> **Emit:** `▶ [1/5] API Discovery`

### 1.1 — Detect endpoints

Read the project's route definitions based on the detected stack:

| Stack | Where to find routes |
|-------|---------------------|
| Express/Fastify | `src/infrastructure/http/routes/` or `src/routes/` |
| Next.js App Router | `src/app/api/**/route.ts` |
| Django | `urls.py` files |
| Rails | `config/routes.rb` |
| NestJS | `*.controller.ts` with `@Get`, `@Post`, etc. |

### 1.2 — Extract schemas

For each endpoint, extract:
- HTTP method + path
- Request body schema (types, required fields, validation rules)
- Response body schema (shape, status codes)
- Auth requirements (public / authenticated / specific role)
- Query parameters and path parameters

### 1.3 — Identify changes

```bash
rtk git diff main --name-only | grep -E '(route|controller|handler|api)'
rtk git diff main -- [route files]
```

Classify each changed endpoint:
- **NEW** — endpoint didn't exist before
- **MODIFIED** — endpoint exists, schema/behavior changed
- **REMOVED** — endpoint was deleted

---

## Phase 2 — Breaking Change Detection

> **Emit:** `▶ [2/5] Breaking Change Detection`

### Classification rules

| Change type | Breaking? | Examples |
|------------|-----------|---------|
| Add optional field to request | No | New optional query param |
| Add field to response | No | New field in JSON response |
| Remove field from response | **YES** | Clients may depend on it |
| Remove endpoint | **YES** | Clients calling it will get 404 |
| Change field type | **YES** | `string` → `number` breaks clients |
| Rename field | **YES** | Old field name no longer works |
| Make optional field required | **YES** | Existing requests without it will fail |
| Change status code | **YES** | Clients may check specific codes |
| Change auth requirement | **YES** | Public → authenticated breaks unauthenticated clients |
| Change URL path | **YES** | Old URL returns 404 |
| Add required field to request | **YES** | Existing requests missing it will fail |
| Change error response format | **YES** | Clients parsing errors will break |
| Add new endpoint | No | Existing clients unaffected |
| Add new optional header | No | Existing requests still work |

### Compatibility report

```
API COMPATIBILITY REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status:   COMPATIBLE | BREAKING CHANGES DETECTED

BREAKING CHANGES:
  [method] [path] — [what changed] — [why it breaks clients]
  Ex: DELETE /api/users/:id — now requires admin role — existing user self-delete will get 403

NON-BREAKING CHANGES:
  [method] [path] — [what changed]
  Ex: GET /api/users — added optional ?search param

NEW ENDPOINTS:
  [method] [path] — [description]

REMOVED ENDPOINTS:
  [method] [path] — ⚠️ BREAKING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**If breaking changes detected:** present to user with options before proceeding:

```
⚠️ BREAKING CHANGES DETECTED

[N] breaking changes found. Options:
  (A) Add versioning (v1 → v2) — keeps old endpoints working
  (B) Add deprecation headers — warn clients, remove later
  (C) Accept breaking changes — update docs + notify consumers
  (D) Revert the breaking changes — modify implementation to be backward-compatible

Which approach?
```

Wait for user decision.

---

## Phase 3 — Contract Tests

> **Emit:** `▶ [3/5] Contract Tests`

Generate or update contract tests that validate the API schema.

### Test structure

Create `tests/contract/[endpoint-group].contract.test.ts`:

```typescript
// Contract test template — validates API shape, not business logic
describe('[METHOD] [path]', () => {
  it('returns expected response shape', async () => {
    const response = await request(app).[method]('[path]')
      .send(validPayload);

    expect(response.status).toBe(expectedStatus);
    expect(response.body).toMatchObject(expectedShape);
  });

  it('rejects invalid input with structured error', async () => {
    const response = await request(app).[method]('[path]')
      .send(invalidPayload);

    expect(response.status).toBe(400 or 422);
    expect(response.body).toHaveProperty('error');
  });
});
```

### What to test

For each endpoint:
- Response shape matches documented schema (required fields present, types correct)
- Error responses follow consistent format
- Auth requirements enforced (401 without token, 403 without permission)
- Pagination format consistent (if list endpoint)

### Run tests

```bash
rtk npm test -- tests/contract/
```

---

## Phase 4 — Versioning Strategy

> **Emit:** `▶ [4/5] Versioning Strategy`

Only if breaking changes were detected and user chose versioning (option A in Phase 2).

### Recommended approaches

| Strategy | When to use | Implementation |
|----------|------------|----------------|
| **URL versioning** (`/api/v2/`) | REST APIs, clear separation | Duplicate routes with new prefix |
| **Header versioning** (`Accept: application/vnd.api.v2+json`) | GraphQL or when URLs shouldn't change | Version middleware |
| **Query param** (`?version=2`) | Quick and simple | Conditional logic in handler |

### Implementation

1. Keep existing endpoints working (v1)
2. Create new versioned endpoints (v2)
3. Add deprecation header to v1: `Deprecation: true` + `Sunset: [date]`
4. Document migration guide for consumers

---

## Phase 5 — API Changelog

> **Emit:** `▶ [5/5] API Changelog`

Generate `docs/API_CHANGELOG.md` (append, don't overwrite):

```markdown
## [date] — [version or commit range]

### Breaking Changes
- `DELETE /api/users/:id` — now requires admin role

### New Endpoints
- `POST /api/teams` — create a team
- `GET /api/teams/:id/members` — list team members

### Modified Endpoints
- `GET /api/users` — added optional `?search` query parameter
- `POST /api/boards` — added optional `description` field to request body

### Deprecated
- `GET /api/v1/tasks` — use `/api/v2/tasks` instead (sunset: [date])
```

### Summary

```
API CONTRACT COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Endpoints analyzed:  [N]
Breaking changes:    [N] (resolved: [approach])
Contract tests:      [N] added/updated
Changelog:           docs/API_CHANGELOG.md updated
Versioning:          [strategy applied or "not needed"]

Next: /deploy (API is safe to ship)
```

---

## Rules

1. **Run before deploy, not after** — breaking changes are cheaper to fix before they hit production
2. **Contract tests test shape, not logic** — business logic is covered by unit/integration tests
3. **Breaking changes need explicit user approval** — never silently ship a breaking change
4. **Deprecation before removal** — add `Sunset` header at least one version before removing
5. **Mobile clients can't update instantly** — API changes for mobile backends are always high-risk
6. **Changelog is append-only** — never rewrite history
