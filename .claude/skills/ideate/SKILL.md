---
name: ideate
description: Collaborative idea refinement. Interviews the user to extract requirements, maps features, defines MVP scope, detects project size, and produces a structured brief ready for /build.
argument-hint: <raw idea or just a few words>
---

# /ideate — Idea → Structured Brief

> Collaborative ideation skill.
> Transforms a vague idea into a precise brief with mapped features, defined MVP, sized scope, and context ready for `/build`.

---

## Pipeline Overview

```
/ideate <raw idea>
    │
    ├─ [1/5] Absorption
    │         └─ Reads the idea, identifies domain, formulates initial understanding
    │
    ├─ [2/5] Interview
    │         └─ ⏸ PAUSE: 5-7 targeted questions → waits for user responses
    │             (may have additional rounds if answers open new angles)
    │
    ├─ [3/5] Feature Mapping
    │         └─ ⏸ PAUSE: proposes complete feature list → user approves / adjusts
    │
    ├─ [4/5] Scope Definition
    │         └─ ⏸ PAUSE: proposes MVP + phased roadmap → user confirms
    │
    └─ [5/5] Final Brief
              └─ Generates IDEAS.md and presents handoff to /build
```

Each pause is mandatory. Never advance to next phase without explicit user response.

---

## Phase 1 — Absorption

> **Emit:** `▶ [1/5] Idea Absorption`

Receives the raw idea (can be 3 words or 3 paragraphs) and:

### 1.1 — Identifies domain and type

Classifies the idea into:

**Domain:**
- Productivity / task management
- E-commerce / marketplace
- SaaS / B2B tool
- Social network / community
- Health / wellness
- Finance / fintech
- Education / e-learning
- Entertainment / media
- Developer tooling
- Other: [inferred from the idea]

**App type:**
- Web app (frontend + backend)
- API / backend only
- Mobile first
- CLI tool
- Integration / automation

**Known analogies** (max 3):
Identifies existing products that resemble the idea. Used only as vocabulary reference — not for copying.

### 1.2 — Reformulate in technical language

Presents to the user:

```
INITIAL UNDERSTANDING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Idea:         [suggested short name]
Domain:       [identified domain]
Type:         [app type]
Similar to:   [product A] + [product B] (if relevant)

In one sentence: [what the user achieves with this product]

What appears to be the core:
  • [core behavior 1]
  • [core behavior 2]
  • [core behavior 3, if evident]
```

### 1.3 — Advances directly to Phase 2

Without asking for confirmation here — the interview will validate or correct the understanding.

---

## Phase 2 — Interview

> **Emit:** `▶ [2/5] Interview`

### 2.0 — Adapt to operation mode

The mode is inherited from `/build` (if called via build) or detected from the argument (if called directly):

| Mode | Interview behavior |
|------|----------------------------|
| **autonomous** (default) | 2-3 macro questions: scale, absolute must-have, critical constraint. AI defines feature set from research. |
| **guided** | 5-7 detailed questions (default behavior below). User defines features. |

Detection: argument contains `guided`, `guiado`, `me pergunte` → guided. Otherwise → autonomous.

**If autonomous:** select only questions from "Scale and ambition" (mandatory) + 1-2 from "Problem and user" or "Features and differentiator". Maximum 3 questions. Research (Phase 1 of /build) + Product Discovery Agent will define the feature set.

**If guided:** follow the complete flow below (5-7 questions).

### 2.1 — Select questions

Based on the identified domain and type, select **5 to 7 questions** from the bank below (guided mode) or **2 to 3** (autonomous mode).
Never ask more than 7 questions in a single round. Prioritize the most decisive ones for scope.

**Question bank by category:**

**Problem and user (always include at least 2):**
- What specific problem are you solving? What happens today without this product?
- Who is the main user? (profile, usage context, technical level)
- Is there a secondary user or admin besides the end user?
- Have you had this problem personally, or are you solving it for others?

**Scale and ambition (always include at least 1 — the first is mandatory):**
- What is the scale of this project? **MVP** (validate idea, no full infra) / **Product** (going to market, needs CI/CD and quality) / **Scale** (product with traction, needs observability and resilience)?
- Do you have an expectation of how many users at launch? (10, 100, 10,000, more?)
- Is this a personal / hobby project, or does it have commercial intent?

**Features and differentiator (always include at least 1):**
- What are the 3 things this product NEEDS to do to be useful? (without them, there is no product)
- What does it NOT need to do in the first version?
- What is the differentiator compared to what already exists?

**Technical and constraints (include if technical signals appear in the idea):**
- Do you have a stack preference? (language, framework, database)
- Does it need to integrate with any external service? (payments, auth, APIs)
- Is there a deadline or budget constraint?
- Will it be open source or closed source?

**Additional context (include if domain is specialized):**
- Are there any domain-specific business rules or compliance requirements?
- Is there any industry terminology I need to understand?

### 2.2 — Present the questions

Format:

```
I have [N] questions to better understand what you want to build:

1. [question]
2. [question]
...
N. [question]

You can answer in any order, and if you want to skip any, that's fine.
```

**Wait for user responses before continuing.**

### 2.3 — Evaluate the responses

After receiving the responses:

- If the responses reveal important new angles → do **1 additional round** with at most 3 follow-up questions. No more than 2 total rounds.
- If there is critical ambiguity that would prevent feature mapping → clarify before advancing.
- If the responses are sufficient → advance directly to Phase 3.

### 2.4 — Consolidate context

Internally (do not display to the user), consolidate:

```
interview_context = {
  problem: [what was said],
  main_user: [profile],
  secondary_user: [if any],
  mvp_ambition: [quick | complete],
  expected_scale: [micro | small | medium | large],
  must_have: [list of what cannot be missing],
  nice_to_have: [list of what can wait],
  differentiator: [what makes it unique],
  stack_hints: [if mentioned],
  integrations: [if mentioned],
  constraints: [deadline, budget, etc],
  specialized_domain: [rules, terminology],
}
```

---

## Phase 3 — Feature Mapping

> **Emit:** `▶ [3/5] Feature Mapping`

### 3.1 — Generate complete feature list

Based on the consolidated context from the interview, generate the complete list of features the product can have.

Organize into 3 layers:

**CORE (must-have for the product to exist):**
Features without which the product has no value proposition. Usually 3-6 features.

**ESSENTIAL (necessary to be competitive):**
Features a user would expect to find beyond the core. Usually 4-8 features.

**EXTENSION (differentiator and growth):**
Features that make the product more complete or scalable. Can be left for future versions.

### 3.2 — Present to the user

Format:

```
FEATURE MAP — [Product Name]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CORE (without these, there is no product)
  [ ] [Feature 1] — [one line explaining what it does]
  [ ] [Feature 2] — [...]
  [ ] [Feature 3] — [...]

ESSENTIAL (for a complete product)
  [ ] [Feature 4] — [...]
  [ ] [Feature 5] — [...]
  [ ] [Feature 6] — [...]

EXTENSION (differentiator / growth)
  [ ] [Feature 7] — [...]
  [ ] [Feature 8] — [...]

Important dependencies:
  • [Feature B] depends on [Feature A]
  • [Feature D] depends on [Feature C]

Total: [N] features identified
```

### 3.3 — Request approval

```
Does this mapping make sense for what you want to build?

You can:
  • Approve the mapping → "ok" / "approved" / "yes"
  • Remove features → "remove [X]"
  • Add features → "add [X]"
  • Move between layers → "move [X] to core"
  • Rename → "rename [X] to [Y]"
  • Free adjustment → describe what to change
```

**Wait for user response before continuing.**

Accept the mapping and advance when the user approves (includes "yes", "ok", "let's go", "approved", "go ahead").
If the user requests adjustments: incorporate and present again until approval.

---

## Phase 4 — Scope Definition

> **Emit:** `▶ [4/5] Scope Definition`

### 4.1 — Detect project size

Based on the approved feature map + interview signals, classify the project:

| Size | Total features | Complexity | Recommended protocol |
|------|----------------|------------|----------------------|
| **Micro** | 1-4 | Simple (CRUD, no integrations) | `/feature-dev` directly |
| **Small** | 5-10 | Moderate (some integrations) | `/build` feature by feature |
| **Medium** | 11-25 | High (multiple integrations, roles) | `/build` + `/agent-teams` for complex features |
| **Large** | 26+ | Very high (multi-tenant, scale) | `/build` phased + `/agent-teams` + multiple worktrees |

### 4.2 — Define MVP

The MVP is the smallest version that validates the core value proposition.

Rules for the MVP:
- Include **all** CORE features (if size permits)
- For Large/Medium size: can split the CORE into MVP-1 and MVP-2
- Include ESSENTIAL features that unblock the core (e.g.: auth always goes together)
- Maximum 8 features in MVP-1

### 4.3 — Propose phased roadmap

For Medium and Large projects, divide into delivery phases:

```
MVP (Phase 1) — [N] features → product works
  [list of MVP features]

Phase 2 — [N] features → product is complete
  [list of remaining essential features]

Phase 3 — [N] features → product is competitive
  [list of extension features]
```

For Micro and Small projects, there are no phases — everything goes in the MVP.

### 4.4 — Present to the user

```
SCOPE DEFINED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Size:         [Micro | Small | Medium | Large]
Protocol:     [recommended protocol]

MVP — what will be built first:
  ✓ [Feature 1]
  ✓ [Feature 2]
  ...

[If there are additional phases:]
Phase 2 (post-MVP):
  ○ [Feature N]
  ...

Phase 3 (long term):
  ○ [Feature N]
  ...

To start, I will focus on the MVP ([N] features).
```

### 4.5 — Request confirmation

```
Does this scope reflect what you want to build first?

Confirm with "yes" or adjust what you need.
```

**Wait for confirmation before continuing.**

---

## Phase 5 — Final Brief

> **Emit:** `▶ [5/5] Final Brief`

### 5.1 — Generate IDEAS.md

Creates `IDEAS.md` at the project root with all structured information:

```markdown
# IDEAS.md — [Product Name]

> Generated by /ideate on [date]

## Product Vision

**In one sentence:** [value proposition]

**Problem:** [problem it solves]

**Main user:** [profile]
**Secondary user:** [if any]

**Differentiator:** [what makes it unique]

---

## Interview Context

**Must-have:** [list of what cannot be missing]
**Nice-to-have:** [list of what can wait]
**Scale:** MVP | Product | Scale (determines infra, CI/CD, observability)
**Constraints:** [deadline, budget, stack, compliance]
**Integrations:** [external services mentioned]

---

## Approved Feature Map

### CORE
- [Feature 1]: [description]
- [Feature 2]: [description]

### ESSENTIAL
- [Feature N]: [description]

### EXTENSION
- [Feature N]: [description]

### Dependencies
- [Feature B] depends on [Feature A]

---

## Confirmed Scope

**Size:** [Micro | Small | Medium | Large]

### MVP (build now)
- [Feature 1]
- [Feature 2]

### Phase 2 (post-MVP)
- [Feature N]

### Phase 3 (long term)
- [Feature N]

---

## Stack and integrations

**Stack hints:** [if mentioned, otherwise: "no preference — to be defined during research"]
**External integrations:** [list or "none identified"]
**Specialized domain:** [rules or "none"]

---

## Reference analogies

[product A]: [what to leverage as reference]
[product B]: [what to leverage as reference]
```

### 5.2 — Present the brief to the user

```
BRIEF GENERATED — [Product Name]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Product:      [name]
Size:         [size]
MVP:          [N] features
File:         IDEAS.md

What will be built in the MVP:
  [list of MVP features, one per line]

[If there are integrations:]
Identified integrations:
  [list]

[If there are relevant constraints:]
Constraints:
  [list]
```

### 5.3 — Ask about the next step

```
IDEAS.md is ready. Next step: start the build.

To begin:
  /build IDEAS.md

/build will research, plan, and implement the MVP we defined.
Do you want to start now?
```

If the user says "yes" / "let's go" / "go ahead" / "start" → call `/build IDEAS.md` automatically.
If the user wants to review something first → wait for instructions.

---

## General Rules

1. **Never assume** — what was not said explicitly, ask in the interview.
2. **Pauses are sacred** — each phase with ⏸ requires the user's response before advancing.
3. **No judgments about the idea** — the role of /ideate is to clarify, not to filter.
4. **MVP always exists** — even for large projects, there is an MVP. Without MVP, there is no handoff.
5. **Size determines protocol** — do not treat a large project as a small one, nor the opposite.
6. **IDEAS.md is the artifact** — the entire conversation consolidates into this file. It is the input for /build.
7. **Objective questions** — no philosophical or overly open questions. Each question should unlock a concrete product decision.

---

## Handling vague ideas

| Situation | Behavior |
|----------|---------|
| Idea with 1-3 words ("like Spotify") | Absorption infers domain + analogy, interview starts with problem questions |
| Very technical idea (no defined user) | Interview prioritizes user and problem questions |
| Idea with everything defined (complete doc) | Absorption confirms understanding, interview may have only 2-3 validation questions |
| Idea outside software scope | Kindly informs and asks if there is a digital product behind it |
| Idea with contradictions | Flags the contradiction in the interview and asks for clarification |

---

## Size signals — reference

| Signal | Likely size |
|--------|------------|
| "a simple app", "for myself", "test an idea" | Micro |
| "launch soon", "MVP in weeks", "product for clients" | Small |
| "platform", "multiple users with roles", "dashboard" | Medium |
| "marketplace", "multi-tenant", "scale to many users" | Large |
| Analogy with Spotify, Zendesk, Salesforce, Notion | Large |
| Analogy with Todoist, Notion for personal use | Small-Medium |

---

## Context Budget

Ideation involves multiple rounds of interaction with the user — context grows with each response.

**Checkpoint triggers:**
- After [3/5] Feature Mapping approved: mandatory checkpoint (highest context consumption up to this point)
- If estimated context reaches ~60k tokens in any phase: immediate checkpoint

**Checkpoint format:**
```
skill: /ideate
phase: [absorption | interview | mapping | scope | delivery]
idea: [idea summary]
responses_collected: [N of N]
features_mapped: [yes/no + summary]
next: [exact next step]
```

Emit: `↺ Context ~60k — checkpoint written. Recommend /compact. Use /resume to continue /ideate at phase [N/5].`
