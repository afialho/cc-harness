---
name: dba
description: Database schema design, data modeling, indexing strategy, and migration planning. ORM-aware (Prisma, TypeORM, Drizzle, Django ORM, ActiveRecord). Use before implementing features that introduce new entities or modify the existing schema.
disable-model-invocation: true
argument-hint: [scope: design | index | seed | multi-tenant | review]
---

# /dba — Database Schema Design

> Data modeling, schema design, indexing strategy, and multi-tenancy patterns.
> Called before implementing features that introduce new entities or modify the existing schema.
> Output feeds `/feature-dev` and `/data-migration` with the approved schema.

---

## When to invoke

| Situation | Recommended scope |
|---------|-------------------|
| New feature with unmapped entities | `design` |
| Existing schema with suspected missing indexes | `index` |
| Adding multi-tenancy to the project | `multi-tenant` |
| Schema review before going to production | `review` |
| Development and test data | `seed` |

---

## Scope: design (default)

> Complete schema design for a domain or feature.

### Phase 1 — Entities and relationships

> **Emit:** `▶ [1/4] Entities and relationships`

Reads IDEAS.md, PLAN.md, or RESEARCH.md if they exist to extract identified entities.
If they do not exist, asks the user for a domain description before continuing.

Presents the initial ER model:
- Entities (domain nouns)
- Attributes of each entity with suggested types
- Relationships (1:1, 1:N, N:M) with cardinality and constraints
- Identification of audit entities (need `created_at`, `updated_at`)

**Mandatory pause:** presents model → waits for approval before continuing.

### Phase 2 — Modeling decisions

> **Emit:** `▶ [2/4] Modeling decisions`

For each entity with variable attributes or N:M relationships, documents the decision:

| Pattern | When to use | Trade-off |
|---------|------------|-----------|
| **Normalize (3NF)** | High write rate, critical integrity (financial, users) | More JOINs on reads |
| **Denormalize** | Frequent reads, dashboards, analytics, historical data | Duplication; more care on writes |
| **JSON/JSONB column** | Variable attributes per record (e.g.: metadata, configs per tenant) | No FK constraints; GIN indexes for queries |
| **Lookup table** | Enums that change rarely or need FK | Simple, FK-safe, auditable |
| **Soft delete** | Entities with history, audit, restore capability | `deleted_at` field; queries need filter |

Documents each entity's decision with justification.

### Phase 3 — Schema in the project's ORM

> **Emit:** `▶ [3/4] Schema`

Detects the installed ORM:
```
Prisma:    prisma/schema.prisma exists OR @prisma/client in package.json
TypeORM:   typeorm in package.json OR DataSource config
Drizzle:   drizzle-orm in package.json
Sequelize: sequelize in package.json
Django:    models.py exists OR django in requirements.txt
Rails:     schema.rb or Gemfile with activerecord
```

Generates the complete schema in the detected ORM's format.

**Mandatory patterns in every entity:**
- Primary key: UUID/CUID (not sequential ID for entities exposed by API)
- Timestamps: `created_at`, `updated_at` on every persisted entity
- Soft delete: nullable `deleted_at` on entities that need history
- Explicit unique constraints on business fields (email, slug, code)

### Phase 4 — Indexing strategy

> **Emit:** `▶ [4/4] Indexes`

Applied rules:

```
ALWAYS index:
  □ Primary keys (automatic)
  □ Foreign keys used in frequent JOINs
  □ Columns in WHERE clauses of frequent read queries
  □ Columns in ORDER BY of paginated lists
  □ Fields with unique constraint

DO NOT index by default:
  □ Columns with low cardinality (boolean, status with 2-3 values) — evaluate case by case
  □ Columns rarely used in read queries
  □ Tables with fewer than 10k rows — overhead outweighs benefit

SPECIAL INDEXES:
  □ Composite index: when WHERE uses multiple columns (order matters — leftmost prefix)
  □ Partial index: when the query has a fixed condition (e.g.: WHERE is_active = true)
  □ GIN index: for JSONB columns or full-text search
  □ BRIN index: for timestamp columns on very large append-only tables
```

Presents list of recommended indexes with the query that justifies each one.

---

## Scope: review

> Audits the existing schema and identifies issues.

Reads the current schema and checks:

```
□ FK columns without corresponding index
□ Columns used in frequent WHERE (verify via code) without index
□ N:M relationships without explicit junction table
□ Nullable fields that should be NOT NULL
□ Fields that should be unique but lack constraint
□ Tables with more than 40 columns (candidate for decomposition)
□ Audit entities without created_at / updated_at
□ Mix of UUID and sequential ID for the same entity
□ Inconsistent soft delete (some entities have it, others do not)
□ Inline enums that should be lookup tables (if they need FK)
```

Output: list of issues with severity (BLOCKER | MAJOR | MINOR) and suggested fix.

---

## Scope: multi-tenant

> Adds multi-tenancy support to the existing schema.

Presents the 3 strategies with recommendation based on declared scale:

| Strategy | Isolation | Complexity | Recommended scale |
|----------|-----------|------------|-------------------|
| **Row-level** (tenant_id on each table) | Software | Low | MVP, Product |
| **Schema per tenant** (PostgreSQL schemas) | Database | Medium | Product, Scale |
| **Database per tenant** | Infra | High | Scale + compliance requiring total isolation |

**For MVP and Product → row-level isolation:**

1. Adds `tenant_id` column (UUID, NOT NULL, FK to `tenants` table) on business tables
2. Adds composite index `[tenant_id, <primary_lookup_column>]` on each table
3. For PostgreSQL: configures Row Level Security (RLS) as an additional security layer
4. Generates the migration via `/data-migration` with the changes

---

## Scope: seed

> Generates structured seed data for development and tests.

### When each seed is generated

| Seed | When to generate | Automatic? |
|------|-----------------|------------|
| **Dev** | Always — every project with UI needs varied data for design and visual testing | ✅ Automatic when invoking `/dba seed` |
| **Test** | Always — fixtures are needed for unit and integration tests from the start | ✅ Automatic when invoking `/dba seed` |
| **Staging** | On demand — only when staging/demo exists or is being configured | ⚡ On demand: `/dba seed staging` |

### Development seed (`src/shared/seeds/dev.ts`)

**Generated automatically.** Covers all visual states of the UI:
- Empty list (to test empty states)
- List with 1 item (to test singular)
- List with many items (to test pagination and scroll)
- Items with optional fields filled and others empty
- Items in different states (active/inactive, pending/approved, etc.)
- Test user credentials documented in the development README

### Test seed (`tests/fixtures/`)

**Generated automatically.** Minimal and deterministic data:
- Factories per entity: `create[Entity](overrides?)` functions with sensible defaults
- Usage: `const user = createUser({ role: 'admin' })` — explicit and readable in tests

### Staging seed (`src/shared/seeds/staging.ts`)

**On demand.** Realistic data for demo and manual QA:
- Enough to simulate real usage (e.g.: 5-10 projects, 20-30 tasks, 3-5 users)
- No real personal data — use faker.js to generate synthetic names, emails, addresses
- Reset script: `rtk npm run seed:staging` should be idempotent (can run multiple times)

---

## Integration with other skills

| When | What happens |
|------|-------------|
| `/build` detects new entities in the plan | Calls `/dba design` before implementation |
| `/feature-dev` Phase 4 (Architecture Design) | Uses the schema approved by `/dba` as reference |
| `/data-migration` | Receives the schema defined here and generates migrations |
| `/perf-audit` | Uses the indexing strategy defined here to diagnose N+1 |
