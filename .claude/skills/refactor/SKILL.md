---
name: refactor
description: Structured refactoring of existing code. Covers module extraction, layer cleanup, dependency untangling, and incremental architecture improvement. Always test-first: establishes coverage before any change. Supports scopes from a single function to an entire layer.
disable-model-invocation: true
argument-hint: [scope: simplify | clean | extract | inline | layer | module]
---

# /refactor — Structured Code Refactoring

> Safe refactoring: test coverage first, then the change.
> "Make it work, make it right, make it fast" — this skill handles the "make it right".
> Never breaks existing behavior. Every step is verifiable and reversible.

---

## Available Scopes

| Scope | What it does | When to use |
|-------|-----------|-------------|
| `simplify` | **Auto-scope via git diff** — reuse, efficiency (loops, Promise.all, cache), naming, dead code in recently modified files. No coverage gate — operates on current diff. | Post-implementation: clean up what was just written |
| `clean` | Removes dead code, magic numbers, bad names, long functions | Code that works but is hard to read/maintain |
| `extract` | Extracts logic from a module into smaller/more cohesive modules | Module with multiple responsibilities (god class/module) |
| `inline` | Consolidates unnecessary abstractions that add complexity without value | Over-engineered — too many layers for too little logic |
| `layer` | Reorganizes code between architectural layers (e.g.: business logic in controller → service) | Accumulated architecture violations |
| `module` | Full module refactoring: analysis + clean + extract + test coverage | Critical module with high technical debt |

If no scope provided → runs analysis and recommends which to apply.

---

## Phase 1 — Analysis and safety net

> **Emit:** `▶ [1/5] Analysis and test coverage`

### 1.1 — Map the target

Read the files in the declared scope (or inferred from the argument):

```
For each file in scope:
  □ How many responsibilities does it have? (SRP check)
  □ Which functions have > 20 lines?
  □ Which classes have > 200 lines?
  □ Are there imports that violate layers defined in architecture.json?
  □ Is there duplicated logic (DRY violations)?
  □ Are there magic numbers or strings?
  □ Do names reveal intent?
  □ Is there dead code (unused imports, uncalled functions)?
```

### 1.2 — Check existing test coverage

```bash
rtk npm test -- --coverage 2>/dev/null || rtk npx vitest run --coverage 2>/dev/null
```

Record the current coverage for files in scope:
- If coverage > 80% → can proceed to refactoring
- If coverage < 80% → **Phase 2 mandatory: write tests first**
- If zero tests → **Phase 2 always mandatory**

### 1.3 — Generate diagnostic report

```
REFACTORING DIAGNOSTIC — [module/file]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Files in scope:     [N]
Current coverage:   [X]% → [sufficient | insufficient — tests needed first]

Issues found:
  CRITICAL (blocks maintenance):
    [file:line] — [problem description]

  IMPORTANT (impacts quality):
    [file:line] — [description]

  MINOR (improvement opportunity):
    [file:line] — [description]

Recommended scope: [clean | extract | layer | module]
Strategy:          [1-2 sentence description of what will be done]
Estimate:          [N] files affected, [N] tests to write
```

**PAUSE:** Presents diagnostic → awaits confirmation before any change.

---

## Phase 2 — Safety net (tests before refactoring)

> **Emit:** `▶ [2/5] Establishing test safety net`

**Only executed if coverage < 80% in scope files.**

Principle: tests written here capture the *current behavior* — not the desired one.
The goal is to have a safety net that detects if the refactoring breaks something.

For each file without sufficient coverage:
1. Identify existing behaviors (inputs → observable outputs)
2. Write tests that document current behavior — without judgment on whether it is correct
3. Verify that all pass before any change

```bash
rtk npm test -- --coverage
# Goal: coverage of files in scope ≥ 80% before proceeding
```

If the code is so coupled that it cannot be tested without extensive mocks:
- Record in the diagnostic as "requires seam introduction"
- Introduce a minimal seam (interface or injection) to make the code testable
- Never change behavior at this stage — only make the code testable

---

## Phase 3 — Incremental refactoring

> **Emit:** `▶ [3/5] Refactoring`

Principle: **one change at a time, green tests between each change**.
Never accumulate multiple changes before running the tests.

### Scope: simplify

Automatic scope: `rtk git diff HEAD --name-only` to identify files modified in the current session.
No coverage gate (operates on the diff — coverage of diff files is assumed adequate since they were recently written).

For each file in the diff, check and fix:

```
Reuse:
  □ Duplicated code (3+ repetitions) → extract function/constant
  □ Equivalent utility function already exists in the project → reuse
  □ Unused imports → remove

Quality (RULE-CODE-001 to 006):
  □ SRP: function/class does more than one thing? → separate
  □ Magic numbers/strings → extract to named constants
  □ Names don't reveal intent? → rename (update all references)
  □ Dead code (commented out, never called) → remove
  □ Depends on concrete implementation where it should depend on abstraction? → annotate (don't change alone if it requires wiring)

Efficiency:
  □ Loops with queries inside → identify N+1, propose solution
  □ Sequential promises when they could be Promise.all → parallelize
  □ Identical computation repeated multiple times in the same request → extract and cache in variable

Architecture:
  □ Domain file imports something external? → violation (report, don't fix if it requires restructuring)
  □ Application file imports infrastructure directly? → violation (report)
```

After each change: `rtk npm test` (or equivalent) — green is a prerequisite to continue.

Scope output:
```
SIMPLIFY COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Files in diff: [N]
Issues resolved:
  Reuse:        [N] (duplication, utilities reused)
  Quality:      [N] (magic numbers, names, dead code)
  Efficiency:   [N] (loops, promises, cache)
Issues annotated (require decision):
  Architecture: [list — violations found but requiring restructuring]
Coverage: preserved
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### Scope: clean

Execute in this order (each item = a separate commit):

```
1. Remove unused imports
2. Remove unused variables and functions (dead code)
3. Rename identifiers that don't reveal intent
4. Extract magic numbers/strings to named constants
5. Break functions > 20 lines into sub-functions with descriptive names
6. Break classes > 200 lines if they have multiple responsibilities
```

After each item: `rtk npm test` → must stay green.

### Scope: extract

```
1. Identify the second responsibility (the one to be extracted)
2. Create new module/file with a name that reveals the responsibility
3. Move code to the new module (without changing logic)
4. Adjust imports in the original module
5. Verify tests are green
6. Move corresponding tests to the new module
```

After extraction: verify that the original module became more cohesive.

### Scope: layer

Read `.claude/architecture.json` to determine where each piece should be.

```
For each layer violation identified in Phase 1:
  1. Identify where the code SHOULD be (correct layer)
  2. Create interface/port if needed (to avoid direct dependency)
  3. Move the code to the correct layer
  4. Adjust wiring in the composition root
  5. Verify tests are green
```

**Practical example — business logic in controller:**

```
Violation identified: PaymentController.ts:45 — calculates discount directly in handler
  → should be in: src/domain/pricing/DiscountCalculator.ts

Step 1: Create src/domain/pricing/DiscountCalculator.ts (with unit test first)
Step 2: Create src/ports/outbound/DiscountCalculator.ts (interface)
Step 3: Move logic from controller to domain
Step 4: Controller injects DiscountCalculator via constructor (composition root)
Step 5: rtk npm test → green
```

Other common examples:
- DB query directly in use case → move to infrastructure adapter + create port
- HTTP call in domain entity → move to infrastructure + inject via port
- Config/secrets read in domain → move to shared/config + inject

### Scope: inline

```
For each unnecessary abstraction:
  1. Check: does this abstraction have more than 1 real use? Does it have a real probability of variation?
  2. If not → inline: move the code back to the caller
  3. Remove the abstraction
  4. Verify tests are green
```

Criterion: an abstraction with 1 use and no justified future variation is complexity, not design.

### Scope: module

Combines clean + extract + layer in sequence for a complete module.
Splits into waves if the module is large (> 5 files):

```
Wave 1: clean (no structural changes)
Wave 2: extract (separate responsibilities)
Wave 3: layer (fix architectural violations)
Wave 4: review + additional tests
```

---

## Phase 4 — Verification and code review

> **Emit:** `▶ [4/5] Verification`

```bash
# Tests must all be green
rtk npm test

# Coverage must not have regressed
rtk npm test -- --coverage
```

Run `/qa-loop (scope: modified files, dimensions: qa-code)`:
- Verify that SOLID was respected in the result
- Verify that Clean Code was respected
- Verify that architecture was respected

Run code-reviewer agent on modified files:
- Confirm that no behavior was inadvertently changed
- Confirm that the code became simpler (not more complex) after refactoring

If qa-code returns BLOCKER → fix before advancing.

---

## Phase 5 — Structured commit

> **Emit:** `▶ [5/5] Commit`

Each logically separate change = separate commit.
Never a giant commit with the entire refactoring.

```bash
# Example commit sequence for scope: module
rtk git commit -m "test(auth): add coverage for AuthService before refactor"
rtk git commit -m "refactor(auth): extract TokenValidator from AuthService"
rtk git commit -m "refactor(auth): move token storage to infrastructure layer"
rtk git commit -m "refactor(auth): rename ambiguous variables to reveal intent"
```

### Final output

```
REFACTOR COMPLETE — [module/scope]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Scope:          [clean | extract | layer | inline | module]
Files:          [N] modified, [N] created, [N] removed

Before:
  Coverage:     [X]%
  Issues:       [N] critical, [N] important

After:
  Coverage:     [Y]% (+[Z]%)
  Issues:       0 critical, 0 important

Behavior:      ✅ No test that passed before stopped passing
Architecture:  ✅ Layers respected
SOLID:         ✅ PASS
Clean Code:    ✅ PASS

Commits:       [N] atomic commits
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Rules

1. **Tests first** — never refactor code without adequate test coverage
2. **One change at a time** — each transformation is followed by `npm test` before the next
3. **Behavior preserved** — refactoring doesn't change what the code does, only how it does it
4. **Atomic commits** — each logical step separated; never a "big bang refactor" in one commit
5. **Simpler, not more complex** — if after refactoring the code is harder to understand, undo
6. **Don't scale without evidence** — don't extract abstractions "for the future"; extract when there is real need today

---

## Context Budget

Refactorings with `module` or `layer` scope can consume significant context with analysis + coverage + changes.

**Checkpoint triggers:**
- After complete analysis phase (before starting changes): checkpoint with diagnostic
- After each refactoring step applied and verified: checkpoint with progress
- If estimated context reaches ~60k tokens: immediate checkpoint

**Checkpoint format:**
```
skill: /refactor
scope: [simplify | clean | extract | inline | layer | module]
phase: [analysis | coverage | refactoring | verification]
files_analyzed: [list]
changes_applied: [summarized list]
changes_pending: [list]
tests_status: [passing/failing + details]
next: [exact next step]
```

Emit: `↺ Context ~60k — checkpoint written. Recommend /compact. Use /resume to continue /refactor [scope] at phase [phase].`
