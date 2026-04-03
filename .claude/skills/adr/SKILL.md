---
name: adr
description: Create and manage Architecture Decision Records (ADRs). Documents technical decisions with context, options considered, and rationale. Prevents revisiting the same debates.
disable-model-invocation: true
argument-hint: <decision title>
---

# /adr — Architecture Decision Records

Document technical decisions before they become folklore. ADRs create a permanent record of *why* the codebase looks the way it does.

---

## When to Create an ADR

Create an ADR whenever you face any of these situations:

- **New technology or library choice** — why this DB, this HTTP client, this queue, this framework?
- **Architectural pattern selection** — hexagonal vs. MVC vs. event-driven; REST vs. GraphQL vs. gRPC
- **Major trade-off accepted** — performance vs. simplicity, consistency vs. availability, speed-to-ship vs. correctness
- **Decision that will surprise a new team member** — if someone will ask "why is it done this way?", write it down now
- **Decision you'll need to justify in 6 months** — especially if it felt controversial at the time
- **Rejection of a seemingly obvious choice** — if you're NOT using Postgres/Redis/REST when people would expect it

If you're unsure whether something needs an ADR, it does.

---

## ADR Storage

```
docs/adr/
  README.md           ← index table (maintained automatically)
  0001-[title].md
  0002-[title].md
  0003-[title].md
  ...
```

Naming: `NNNN-kebab-case-title.md` where NNNN is zero-padded sequential (0001, 0002, ...).

---

## Workflow (5 Phases)

### Phase 1 — Gather Information
> **Emit:** `▶ [1/5] Gathering Decision Context`

If the decision title was provided as argument, extract as much context as possible from it.
Otherwise, ask the user these 5 structured questions:

```
1. What decision needs to be made?
   (describe the choice you're facing in one sentence)

2. What constraints exist?
   (technical, team, timeline, cost, compliance, existing codebase)

3. What options have you already considered?
   (even partially — list them so we can evaluate thoroughly)

4. What does "good" look like for this decision?
   (what criteria will you use to evaluate options?)

5. Is there a deadline or forcing function?
   (something that means this decision must be made now)
```

Wait for answers before proceeding. If arguments are rich enough (e.g., `/adr use postgres over mongodb for user data`), proceed without asking.

---

### Phase 2 — Research Options
> **Emit:** `▶ [2/5] Researching Options`

Based on the decision context:

- Read relevant files in the codebase that inform this decision:
  - `docker-compose.yml` (existing services)
  - `package.json` / `pyproject.toml` / `go.mod` (existing dependencies)
  - `.claude/architecture.json` (architectural constraints)
  - Any existing ADRs in `docs/adr/` that relate to this decision

- Identify 2–4 concrete options (not straw men — give each option a fair evaluation)

- For each option, assess:
  - Fit with existing architecture and team conventions
  - Operational complexity (how much to run, monitor, and maintain?)
  - Learning curve for the team
  - Community / ecosystem maturity
  - Known failure modes

---

### Phase 3 — Draft ADR
> **Emit:** `▶ [3/5] Drafting ADR`

Generate the full ADR content following this template:

```markdown
# [NNNN] [Decision Title]

**Date:** [YYYY-MM-DD]
**Status:** Proposed

---

## Context

[Why does this decision need to be made? What is the problem being solved?
What constraints exist — technical, organizational, timeline, cost?
What was happening in the project that forced this decision now?
2–5 sentences. No fluff.]

---

## Options Considered

### Option A: [Name]

[One sentence description.]

**Pros:**
- [concrete advantage]
- [concrete advantage]

**Cons:**
- [concrete trade-off]
- [concrete trade-off]

### Option B: [Name]

[One sentence description.]

**Pros:**
- [concrete advantage]

**Cons:**
- [concrete trade-off]

### Option C: [Name] *(if applicable)*

...

---

## Decision

**We will use [Option X].**

[The rationale — not just "we chose X" but WHY this option, given the constraints and options above.
What tipped the scales? What did we explicitly accept as a trade-off?
3–7 sentences. Be direct.]

---

## Consequences

**What becomes easier:**
- [concrete improvement]
- [concrete improvement]

**What becomes harder:**
- [concrete trade-off accepted]
- [concrete trade-off accepted]

**Tech debt accepted (if any):**
- [any shortcuts or future work this decision creates]

---

## Related

- ADR [NNNN]: [related title] — [how it relates]
- Issue/PR: [link if applicable]
- External reference: [doc, blog post, RFC that informed this decision]
```

---

### Phase 4 — Determine ADR Number and Write File
> **Emit:** `▶ [4/5] Writing ADR File`

**Step 4.1 — Determine next number**

Read `docs/adr/` directory:
```bash
rtk ls docs/adr/ | grep -E '^[0-9]{4}-' | sort | tail -1
```

Extract the last number and increment by 1. If no ADRs exist yet, start at `0001`.

**Step 4.2 — Generate filename**

Convert title to kebab-case:
- `Use Postgres over MongoDB` → `0003-use-postgres-over-mongodb.md`
- `Adopt hexagonal architecture` → `0001-adopt-hexagonal-architecture.md`

**Step 4.3 — Write the file**

Write to `docs/adr/NNNN-kebab-case-title.md` with the `Status: Proposed`.

**Step 4.4 — Link from relevant code (optional)**

If the decision directly affects a specific file (e.g., the database adapter, the auth middleware), add a comment linking to the ADR:

```typescript
// Architecture decision: docs/adr/0003-use-postgres-over-mongodb.md
```

---

### Phase 5 — Update ADR Index
> **Emit:** `▶ [5/5] Updating ADR Index`

Create or update `docs/adr/README.md`:

```markdown
# Architecture Decision Records

| # | Title | Status | Date |
|---|-------|--------|------|
| [0001](0001-adopt-hexagonal-architecture.md) | Adopt hexagonal architecture | Accepted | 2026-01-10 |
| [0002](0002-use-jwt-for-authentication.md) | Use JWT for authentication | Accepted | 2026-01-15 |
| [0003](0003-use-postgres-over-mongodb.md) | Use Postgres over MongoDB | Proposed | 2026-04-03 |

---

## About ADRs

Architecture Decision Records capture the *why* behind technical choices.
Status meanings:
- **Proposed** — decision drafted, awaiting team review
- **Accepted** — decision agreed upon and in effect
- **Deprecated** — no longer applies (context changed)
- **Superseded by [link]** — replaced by a newer decision
```

Add the new ADR to the table, maintaining sort order by number.

---

## ADR Lifecycle

To update an ADR status after team review:
```bash
# Mark as Accepted
/adr accept 0003

# Mark as Superseded
/adr supersede 0003 by 0007
```

When called with `accept NNNN`: read the file, change `Status: Proposed` → `Status: Accepted`, update the index.

When called with `supersede NNNN by MMMM`: read both files, update status to `Status: Superseded by [MMMM](MMMM-title.md)`, add a `Superseded by` line in the Related section, update the index.

---

## Reference Example

Below is a complete realistic ADR to illustrate what a well-written record looks like.

---

### Example: `docs/adr/0003-use-postgres-over-mongodb.md`

```markdown
# 0003 — Use PostgreSQL over MongoDB for User and Order Data

**Date:** 2026-03-12
**Status:** Accepted

---

## Context

We are building a marketplace platform where users place orders for products, each with
pricing, status history, and multi-currency support. The team evaluated both relational
and document-oriented databases during the initial infrastructure decision (ADR 0001 chose
hexagonal architecture, requiring an outbound port for persistence).

Two questions drove this decision: (1) can our primary domain data model tolerate schema
flexibility, or does it require strong relational constraints? (2) what does the team have
operational experience with?

---

## Options Considered

### Option A: PostgreSQL

Mature relational database with strong ACID guarantees, rich query capabilities, and
JSON column support for flexible fields.

**Pros:**
- Strong consistency and foreign key constraints prevent data integrity bugs at the DB layer
- Rich JOIN and aggregation support simplifies complex reporting queries (orders by user, revenue by period)
- JSON/JSONB columns provide document-style flexibility where needed (order metadata, user preferences)
- Full-text search via `tsvector` covers our search requirements without an additional service
- Entire team has operational experience with Postgres

**Cons:**
- Schema migrations required for structural changes (adds friction for rapid iteration)
- Horizontal write scaling requires additional tooling (Citus, read replicas) — not needed now but a future concern

### Option B: MongoDB

Document database with flexible schema, horizontal scaling, and native JSON storage.

**Pros:**
- Schema-less: easy to iterate on data shape without migrations
- Horizontal scaling built in (sharding)
- Natural fit for storing heterogeneous documents

**Cons:**
- No ACID transactions across multiple collections (multi-document transactions added in 4.0 but have overhead)
- Lack of foreign key enforcement means referential integrity must be maintained in application code — high risk for an order system where consistency is critical
- No team operational experience — would require new runbooks, monitoring setup, and DBA knowledge
- Aggregation pipeline syntax is significantly harder to maintain than SQL for reporting queries

### Option C: MySQL / MariaDB

**Pros:** Wide adoption, familiar SQL.
**Cons:** Less feature-rich than Postgres (weaker JSON support, no partial indexes, MVCC is less refined). No advantage over Postgres given the team's existing expertise.

---

## Decision

**We will use PostgreSQL.**

The order and user data models are fundamentally relational: an order belongs to a user,
contains line items referencing products, and has a status history with strict sequencing.
MongoDB's schema flexibility would be a liability here, not an asset — referential
integrity bugs in financial data are unacceptable and costly to debug. PostgreSQL's JSONB
columns cover the few genuinely flexible fields (order metadata, user preferences) without
sacrificing relational guarantees for the core model. The team's existing Postgres
operational experience eliminates the onboarding cost that MongoDB would impose.

---

## Consequences

**What becomes easier:**
- Complex reporting queries (revenue by period, orders per user cohort) are straightforward SQL
- Referential integrity is enforced by the database, not just the application
- The team can operate and debug the database with existing knowledge

**What becomes harder:**
- Adding new columns to high-traffic tables requires careful migration planning (online schema changes via `pg_repack` or zero-downtime migration patterns)
- If write throughput exceeds single-node limits in 2+ years, scaling requires a migration or read replica setup

**Tech debt accepted:**
- We are deferring the write-scaling question. If the platform reaches 10k+ writes/second we will revisit this decision. At current projections (< 500 writes/second) Postgres is well within limits.

---

## Related

- ADR 0001: Adopt hexagonal architecture — outbound persistence port isolates DB choice from domain
- ADR 0002: Use JWT for authentication — no impact on this decision
- External: [Postgres vs MongoDB for app data (2024)](https://www.enterprisedb.com/blog/postgres-vs-mongodb) — benchmarks referenced during evaluation
```

---

---

## Commit Convention

ADR commits follow Conventional Commits:

```bash
rtk git add docs/adr/0003-use-postgres-over-mongodb.md docs/adr/README.md
rtk git commit -m "docs(adr): add ADR 0003 — use postgres over mongodb"
```

Use `docs(adr):` scope. Never use `chore:` for ADRs — they are first-class technical documentation.
