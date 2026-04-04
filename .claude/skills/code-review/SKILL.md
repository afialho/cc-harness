---
name: code-review
description: Reviews code for bugs, architecture violations, security issues, and test coverage. Extends the official code-review plugin with hexagonal architecture, TDD, SOLID, and project-specific rules from Rules.md.
disable-model-invocation: true
argument-hint: <file, PR, or scope — omit for git diff>
---

# /code-review — Code Review

> **Extends:** `code-review@claude-plugins-official`
> Adds: Hexagonal Architecture layer validation, TDD compliance (RED→GREEN→REFACTOR), BDD scenario coverage, SOLID rules, and RTK efficiency enforcement.
> The official plugin handles base review; this skill adds the project's architectural and quality constraints.

---

## Scope

If argument is a PR → `rtk gh pr diff <number>`
If argument is file(s) → read the specified files
If none → `rtk git diff main...HEAD`

---

## Phase 1 — Architecture Review

> **Emit:** `▶ [1/4] Architecture`

Validate the rules from `Rules.md` (RULE-ARCH-001 to 005) for each modified file:

```
□ RULE-ARCH-001: Domain layer — zero external imports (only stdlib and internal types)?
□ RULE-ARCH-002: Application layer — imports only Domain + Ports, never Infrastructure?
□ RULE-ARCH-003: Infrastructure — implements Port defined in src/ports/?
□ RULE-ARCH-004: DI in composition root — never `new ConcreteClass()` in Application/Domain?
□ RULE-ARCH-005: No circular dependencies between modules?
```

For each violation: file:line + violated rule + how to fix.

---

## Phase 2 — Code Quality Review

> **Emit:** `▶ [2/4] Code Quality`

Validate RULE-CODE-001 to 006:

```
□ RULE-CODE-001: SRP — each function/class has a single reason to change?
□ RULE-CODE-002: No magic numbers/strings — named constants?
□ RULE-CODE-003: Names reveal intent — no `data`, `temp`, `obj`, `x`?
□ RULE-CODE-004: No dead code — no uncalled functions, unused imports, commented-out code?
□ RULE-CODE-005: DIP — depends on abstractions, not implementations?
□ RULE-CODE-006: No defensive programming in Domain — no defensive null checks, trusting internal code?
```

Additional:
```
□ No stale TODOs (> 1 week without resolution)
□ Error handling consistent with project patterns
□ No leftover debug console.log/print
```

---

## Phase 3 — Testing Review

> **Emit:** `▶ [3/4] Testing`

Validate RULE-TEST-001 to 007:

```
□ RULE-TEST-001: TDD — tests were written before implementation? (verify via git log order)
□ RULE-TEST-002: BDD — are there Gherkin scenarios for each affected user story?
□ RULE-TEST-003: Domain + Application have 100% unit test coverage?
□ RULE-TEST-004: Infrastructure has integration tests with real deps (not mocks)?
□ RULE-TEST-005: API endpoints have k6 load tests?
□ RULE-TEST-006: User flows have Cypress E2E?
□ RULE-TEST-007: Tests test behavior, not implementation?
```

If there is new code without a corresponding test → BLOCKER.

---

## Phase 4 — Security Review

> **Emit:** `▶ [4/4] Security`

```
□ Input validation on all public endpoints?
□ No SQL injection (parameterized queries or ORM)?
□ No XSS (no dangerouslySetInnerHTML without sanitize)?
□ Auth guards on protected routes?
□ No hardcoded secrets (API keys, passwords, tokens)?
□ Explicit CORS policy?
□ No sensitive data exposure in responses?
```

---

## Final Report

```
CODE REVIEW: [scope]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status: PASS | FAIL

BLOCKERS (must be fixed before merge):
  [RULE-X] file:line — description + how to fix

MAJORS (fix before finalizing):
  [category] file:line — description

MINORS (recommendations):
  [category] file:line — suggestion

Dimensions:
  Architecture  ✅/❌  ([N] files, [N] violations)
  Code Quality  ✅/❌  ([N] issues)
  Testing       ✅/❌  ([N] issues)
  Security      ✅/❌  ([N] issues)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Rules

1. **Mandatory evidence** — every BLOCKER/MAJOR has file:line
2. **Rule reference** — cite the corresponding RULE-X when applicable
3. **Actionable** — each issue describes what to do, not just the problem
4. **No false positives** — only report what is objectively wrong, not style preference
5. **RTK in all commands** — `rtk git diff`, `rtk gh pr diff`, etc.
