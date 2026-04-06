# Phase 2 — Planning

> **Emit:** `▶ [2/3] Planning`

Before generating any plan, extract structured data from RESEARCH.md:

**Identified APIs:**
→ Each external API found = outbound port + specifically named infrastructure adapter
→ Each relevant endpoint = a granular task in the wave decomposition (not "integrate API", but "implement POST /charges in StripeAdapter")

**Business rules found:**
→ Each rule = a concrete BDD Scenario with specific Given/When/Then
→ Domain edge cases = additional Scenarios
→ Use exact domain terminology found in the research to name entities

**Competitors and architecture references:**
→ Patterns that repeated across multiple references = preferred pattern for this project
→ Trade-offs documented in findings = informed and documented design decisions

**Implementation findings:**
→ Technical approaches found in RESEARCH.md inform the implementation sequence
→ Identified pitfalls = attention items in the plan

**Identified domain entities:**
→ If the plan introduces new entities (tables, models) → call `/dba design` before starting Phase 3
→ `/dba` returns the approved schema that feeds the implementation

This explicit mapping ensures that planning is grounded in real research findings,
not in generic model decisions.

## What to Generate

Read `RESEARCH.md` and the user's clarification responses to inform each decision.

**Architecture mapping (based on `.claude/architecture.json`):**

Read `.claude/architecture.json` before mapping. Use the template corresponding to the detected `pattern`:

- **hexagonal** (or new project): Domain → Application → Ports → Infrastructure → Shared
- **mvc-rails**: Models → Services → Controllers → Views/Serializers
- **mvc-express / mvc-nestjs**: Models/DTOs → Services → Controllers → Routes
- **nextjs-app-router**: lib/ (server logic) → Server Actions → API Routes → Server Components → Client Components
- **feature-based**: src/features/[name]/ (self-contained) → src/shared/ (shared)
- **flat / disabled**: document existing structure without imposing a pattern

**BDD scenarios (Gherkin):**
- Happy path
- Error cases
- Edge cases

**Test plan:**
- Unit tests per domain entity and use case
- Integration tests per adapter
- E2E (Cypress) if there's UI
- Load test (k6) if there's an HTTP endpoint

**Implementation sequence (TDD — based on detected pattern):**

*hexagonal:* BDD file → Domain entities → Ports → Use Cases → Adapters → Composition root → Cucumber → Cypress → k6
*mvc-rails:* BDD file → Model → Service → Controller → Request tests → Cucumber → Cypress
*mvc-express/nestjs:* BDD file → DTO/Model → Service → Controller → Routes → Integration tests → Cucumber → Cypress → k6
*nextjs-app-router:* BDD file → lib/ functions → Server Actions → API Routes → Server Components → Client Components → Cucumber → Cypress → k6
*feature-based:* BDD file → Business logic → UI components → API integration → Integration tests → Cucumber → Cypress

**Agent wave decomposition** (if complex feature):
- Which components can be implemented in parallel
- Which have sequential dependencies
- Estimated number of waves needed

**Git strategy:**
- Branch name: `feature/[kebab-case-name]`
- Atomic commits: suggested sequence

**Definition of Done:**
- Complete checklist with all criteria

**Feature mapping vs reference products (if Product Discovery exists in RESEARCH.md):**

```
## Feature Mapping — Reference Products
| Reference Feature | Include? | Our version | Justification |
|-------------------|----------|-------------|---------------|
| [feature from prod A] | YES/NO/PARTIAL | [how we implement] | [why yes/no] |
```

In **autonomous** mode: AI fills based on research. In **guided** mode: AI proposes, user adjusts.

---

## Tech Lead — Technical Decomposition + UI Inventory

After the PM defines the feature set (above), the Tech Lead decomposes technically:

**1. Technical tasks per feature:**
For each feature, list granular tasks: endpoint, component, hook, migration, test.
Each task = one implementable unit for an agent.

**2. UI Inventory per screen (MANDATORY for features with UI):**

```
Screen: /[route]
  Elements:
    - [Button/Link/Form/Filter/Menu] "[label]" → [action: endpoint, navigation, modal, state]
    - ...
  States: loading | empty | error | success
```

**Anti-stub rule:** if the element is in the inventory, it is MANDATORY to implement end-to-end.
If it will not be implemented in this build → DO NOT include in the inventory and DO NOT render in the UI.

**3. Technical acceptance criteria per feature:**
Each feature has verifiable criteria that the Tech Lead will use to validate the delivery.

## Post-Plan QA Gate

Before presenting to the user, execute:
```
/qa-loop (scope: PLAN.md, dimensions: qa-plan)
```
If `qa-plan` returns BLOCKER (e.g., user story without scenario, critical decision without justification) → fix the plan before presenting.

## Presentation to User

Present the complete plan (can be inline or reference `PLAN.md` if generated).

**Autonomous mode:** Display the plan summary, then **proceed immediately to Phase 3**. The AI approves its own plan. Log: `Plan auto-approved (autonomous mode)` in checkpoint.

**Semi-guided / Guided mode:** Present the plan with the feature set and architecture. Ask: **"Plan approved? Can I start implementation?"** Accepts: "yes", "go", "approved", "implement" or equivalent. If the user requests adjustments: incorporate and present again.

> **Checkpoint after Phase 2:**
> Write `.claude/checkpoint.md`:
> ```
> phase: planning_complete
> plan_md: generated
> user_approval: confirmed
> next: phase_3_implementation
> ```

If context reaches ~60k tokens (write checkpoint) / ~80k (compact recommended) before completing Phase 2:
Write checkpoint with partial plan and emit:
`↺ Context ~60k. Recommend /compact. Use /resume to continue in Phase 2 (partial plan recorded).`
