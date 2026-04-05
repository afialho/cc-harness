---
name: redesign
description: Transform an existing application into a modern one. Analyzes the current app (via browser or codebase), detects whether in-place UI replacement or a full rewrite to a new folder is appropriate, proposes UX improvements (navigation reorganization, design system, animations), gets user approval, then implements with full feature parity guarantee.
argument-hint: <url or path of existing app>
---

# /redesign — Application Modernization & UI Transformation

> Transforms an existing app into a modern one.
> Analyzes what exists → detects the correct mode → proposes improved UX → implements with parity guarantee.
> The original app is never touched until explicit confirmation (or never, in the case of rewrite).

---

## Two modes — automatically detected

| Mode | When | What happens |
|------|------|-------------|
| **rewrite** | Legacy framework (AngularJS, Backbone, jQuery, Ember, CoffeeScript), stack incompatible with incremental migration, or user wants new folder | New folder + new stack + same features + improved UX |
| **in-place** | Modern framework (React, Vue, Next.js, Angular 14+), preservable structure, user wants to replace only UI | Same folder + replaces presentation layer + backend intact |

The skill detects and recommends — never acts without user confirmation.

---

## Phase 1 — Existing app analysis

> **Emit:** `▶ [1/7] Analyzing the existing app`

### 1.1 — Identify input type

- **URL provided** → use agent-browser to navigate the app in production/staging
- **Codebase path** → explore file structure + read main components

### 1.2 — Map via agent-browser (if URL available)

Navigate systematically:

```
For each page/screen of the app:
  □ URL and page title
  □ Navigation elements (main menu, sidebar, breadcrumb, tabs)
  □ Main visible components (tables, forms, cards, modals, dashboards)
  □ Available actions (buttons, links, forms, drag-drop)
  □ UI states (loading, empty, error, success)
  □ User flows (step sequences to complete a task)

Also record:
  □ API integration (observe XHR/fetch calls if DevTools accessible)
  □ Auth (login, logout, route-based access control)
  □ Responsiveness (test in mobile viewport)
  □ Visual pain points (inconsistencies, misaligned elements, outdated UI)
```

### 1.3 — Map via codebase (if path available, in parallel or alternative)

```bash
# Detect framework and stack
rtk cat package.json 2>/dev/null || rtk cat requirements.txt 2>/dev/null

# Map routes/screens
find . -name "*.routes.*" -o -name "router*" -o -name "routes*" | head -20
find . -name "*.component.*" -o -name "*.page.*" -o -name "*.view.*" | grep -v node_modules | head -40
```

Extract from each route file:
- URL path
- Associated component/view
- Auth guards (if any)

### 1.4 — Detect framework and evaluate mode

**REWRITE signals (new folder recommended):**
- AngularJS (angular.js v1.x), Backbone.js, old Ember.js, jQuery as main framework
- Stack without TypeScript with > 50 components (incremental migration infeasible)
- No component structure (HTML + JS directly)
- Framework version with EOL (end-of-life)
- User explicitly wants new folder / new project

**IN-PLACE signals:**
- React (any version), Vue 3, Angular 14+, Next.js
- Codebase with existing tests that need to be preserved
- Backend + frontend in same repo and backend does not change
- User wants to replace only the visual layer

### 1.5 — Generate structured inventory

```
CURRENT APP INVENTORY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Framework:    [name + version]
Screens:      [N] screens mapped
Features:     [structured list by module]
Navigation:   [current menu/route structure]
Auth:         [yes/no + type]
APIs:         [list of identified integrations]
Pain points:  [visual/UX problems found]
```

---

## Phase 2 — Mode detection + Stack decision

> **Emit:** `▶ [2/7] Detecting mode + defining stack`

Present recommendation with justification:

```
MODE RECOMMENDATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Current framework: [name + version]
Reason:            [why rewrite or in-place]

Recommended mode: REWRITE | IN-PLACE

[If REWRITE:]
Suggested stack for the new app:
  Framework:    Next.js 14 (App Router) — [justification]
  Styling:      Tailwind CSS + shadcn/ui
  Animations:   Framer Motion (page transitions + micro-interactions)
  State:        [Zustand | TanStack Query — based on what the app uses]
  Auth:         [keep current backend | rewrite — based on analysis]

New folder:     ../[project-name]-redesign/

[If IN-PLACE:]
Replacement:    UI components swapped, logic preserved
Design system:  shadcn/ui + Tailwind
Animations:     Framer Motion
```

**⏸ PAUSE:** Confirm mode + stack before any implementation.

If the user wants to adjust the suggested stack → incorporate and confirm again.

---

## Phase 3 — UX Proposal

> **Emit:** `▶ [3/7] Improved UX proposal`

This is the highest-value phase — not just replicate, but improve.

### 3.1 — Analysis of equivalent modern patterns

For each screen type identified in the inventory, research (agent-browser on reference sites):
- Dribbble, Mobbin, Awwwards for the product type (SaaS dashboard, e-commerce, management tool, etc.)
- Equivalent modern apps and how they solve the same problems

### 3.2 — New information architecture (IA) proposal

Compare current structure vs. proposed:

```
CURRENT NAVIGATION                 PROPOSED NAVIGATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Menu principal:                    Menu principal:
  ├─ [item atual 1]           →      ├─ [item proposto 1] [motivo]
  ├─ [item atual 2]           →      ├─ [item proposto 2] [motivo]
  └─ [item atual 3]           →      └─ [item proposto 3] [motivo]
                                     └─ [item novo sugerido] [motivo]

Sidebar/secondary:                 Sidebar/secondary:
  └─ [atual]                  →      └─ [proposto]

Reorganized flows:
  "[tarefa X]" era 4 passos → proposta: 2 passos ([justificativa])
  "[recurso Y]" estava oculto → proposta: destaque em dashboard ([justificativa])
```

### 3.3 — Design system and visual identity

```
PROPOSED DESIGN SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Base:        shadcn/ui (accessible, customizable components)
Theme:       [light | dark | both — based on product type]
Palette:     [suggestion of 3 colors with justification]
Typography:  [suggested font + scale]
Icons:       Lucide Icons (consistent with shadcn/ui)
Animations:
  - Page transitions: Framer Motion (fade + slide)
  - Micro-interactions: hover states, loading skeletons, success feedback
  - Data loading: skeleton screens (not spinners)
  - Empty states: illustrations + call-to-action
```

### 3.4 — Present complete proposal to user

Format:

```
REDESIGN PROPOSAL — [App Name]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NEW INFORMATION ARCHITECTURE
[text diagram comparing current vs. proposed]

PROPOSED UX IMPROVEMENTS
  1. [improvement] — [reason based on analysis]
  2. [improvement] — [reason]
  ...

DESIGN SYSTEM
  [summary of visual choices]

FEATURES MAINTAINED (parity guaranteed)
  ✓ [feature 1]
  ✓ [feature 2]
  ... all [N] features of the current app

FEATURES OUT OF SCOPE (suggestion)
  ○ [old feature that can be deprecated — with justification]
```

**⏸ PAUSE:** Awaits approval or adjustments. Only advances when user confirms.

> **Checkpoint:** Writes `.claude/checkpoint.md`:
> ```
> skill: redesign
> phase: ux-proposal-approved
> modified_files: [list]
> next: platform-detection
> ```
> If context reaches ~60k tokens → writes checkpoint and emits:
> `↺ Context ~60k. Recommend /compact. Use /resume to continue.`

---

## Phase 4 — Platform detection + mobile delegation

> **Emit:** `▶ [4/7] Platform detection`

Before starting implementation, check if the app is mobile-native:

**Mobile app signals:**
- `react-native` or `expo` in `package.json`
- Directories `android/` or `ios/` at root
- Files `.xcodeproj`, `MainActivity.java`, or `app.json` (Expo)

**If mobile detected:**

```
Mobile app detected (React Native / Expo).
Mobile redesign uses /mobile scaffold + iterative /mobile feature — delegating now.
```

Execute in sequence:

1. **`/mobile scaffold`** — creates the new RN/Expo project with hexagonal architecture, mobile design system (NativeWind), navigation, auth scaffold, and App Store/Play Store requirements. Pass as context the navigation + design system proposal approved in Phase 3.

2. **`/mobile feature`** (one call per feature) — for each feature in the inventory (Phase 1), from most critical to secondary. Each call receives:
   - How the feature works in the original app (Phase 1 inventory)
   - How it should look in the new app (Phase 3 approved proposal)
   - Components and design system already created by scaffold

3. **`/mobile qa`** — final QA of the complete app after all features.

`/mobile` executes its own pipeline per scope (TDD with RNTL, Detox E2E, EAS Build).
`/redesign` does not continue after delegation.

**If web app:** continue to Phase 5.

---

## Phase 5 — Implementation

> **Emit:** `▶ [5/7] Implementation`

### Default frontend stack (applied in every web redesign)

The redesign uses the complete frontend ecosystem of the kit:

| Layer | Technology | Responsibility |
|-------|-----------|----------------|
| Design system | shadcn/ui + Tailwind CSS | Accessible components, design tokens, light/dark theme |
| Icons | Lucide Icons | Consistent library, co-designed with shadcn/ui |
| Animations | Framer Motion | Page transitions, micro-interactions, skeleton loaders |
| Forms | React Hook Form + Zod | Type-safe validation with real-time feedback |
| Global state | Zustand or TanStack Query | As detected in app inventory |
| Unit tests | Vitest + Testing Library | TDD: RED → GREEN → REFACTOR on each component |
| E2E tests | Cypress | Complete flow per feature, before advancing |
| Visual QA | agent-browser via /qa-loop | Verification with real browser after each section |

### If REWRITE mode

```bash
# Create new folder alongside the original — never inside
mkdir ../[project]-redesign
cd ../[project]-redesign
```

Execute in strict sequence:

#### Step 1 — Scaffold
```
/scaffold fullstack
```
Generates: hexagonal structure, Docker, GitHub Actions (if scale ≥ Product), Git, GitHub repo with `-redesign` suffix.

#### Step 2 — Foundation with complete /ui pipeline

```
/ui foundation
```

`/ui` executes internally:
1. **Visual research** — agent-browser on Dribbble / Mobbin / Awwwards for product type references
2. **Design system TDD** — tests for tokens, themes and base components before implementing
3. **`/frontend-design`** (official plugin) — generates base layout, design tokens, light/dark theme per Phase 3
4. **a11y check** — semantic structure, WCAG AA contrast, keyboard nav
5. **browser-qa gate** — agent-browser verifies layout on desktop + mobile before advancing

```
⛔ GATE Foundation: /qa-loop (dimensions: qa-design + qa-a11y)
   Mandatory PASS before any feature
```

#### Step 3 — Auth

```
/auth scaffold
```

Replicates the auth system of the original app. Required gate:

```
⛔ GATE Auth: /qa-loop (dimensions: qa-backend + qa-security + qa-e2e)
   If BLOCKER → redesign paused. Fix auth before any feature.
```

#### Step 4 — Features (one at a time, in inventory order)

For **each feature** in the inventory (from most critical to secondary):

```
Required context for the implementation agent:
  - How the feature works in the original app (Phase 1 inventory)
  - How it should look in the new app (Phase 3 approved proposal)
  - Design system + available components (Step 2)
  - Feature schema if new entities → /dba design before implementing
```

**TDD sequence per feature:**

```
1. Gherkin scenario → tests/bdd/features/[feature].feature
2. Unit tests (RED) → tests/unit/[feature].test.ts
3. Implementation (GREEN) — components with shadcn/ui + Lucide + Framer Motion
4. Refactor (REFACTOR) — extract to reusable components if needed
5. E2E test → tests/e2e/[feature].cy.ts
```

**Gate per feature:**

```
⛔ PHASE GATE [feature]:
   □ rtk npx vitest run --coverage (unit tests passing)
   □ rtk npx cypress run --spec tests/e2e/[feature].cy.ts
   □ /qa-loop (scope: [feature], dimensions: qa-design + qa-ux + qa-a11y + qa-e2e)
   □ /browser-qa <url> (exhaustive feature navigation)
   Mandatory PASS before advancing to next feature
   Automatic fix loop (max 3 iterations) → escalate if persists
```

**Parity gate per feature:**

```
PARITY [feature]:
  □ Behavior equivalent to original?
  □ Data/integrations work?
  □ States (loading / error / empty) implemented?
  □ Responsive in mobile viewport?
```

### If IN-PLACE mode

Section-by-section replacement — business logic untouched:

```
Install: shadcn/ui + Tailwind + Lucide + Framer Motion in existing project
Create: design tokens (colors, typography, spacing) from Phase 3 proposal
```

Replacement sequence:

```
1. Header / Navbar → gate: /qa-loop (qa-design + qa-ux) + /browser-qa
2. Sidebar / Side navigation → gate: /qa-loop + /browser-qa
3. Main pages (product core) → gate per page
4. Secondary pages → gate per page
5. Modals / Drawers / Overlays → final gate
```

**In-place rules:**
- Never touch files outside `components/`, `app/` or `pages/` — business logic, API routes and services remain intact
- For each replaced component: write behavior test before replacing (ensures parity)
- If an original component has no test → write the test documenting current behavior before replacing

---

## Phase 6 — Parity verification

> **Emit:** `▶ [6/7] Parity verification`

Systematically compare the Phase 1 inventory with the new app:

```
PARITY CHECK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
For each feature in the inventory:
  □ Feature exists in new app?
  □ Behavior is equivalent to original?
  □ Data/integrations work?
  □ Complete user flow works?

For each screen in the inventory:
  □ Screen exists in new app?
  □ All visible elements are present?
  □ Responsive on mobile?
```

Use agent-browser on the new app to verify each item.
Issues found → automatic fix before advancing to Phase 7.

---

## Phase 7 — Final QA + delivery

> **Emit:** `▶ [7/7] Final QA`

Complete QA of the entire app (not just the last feature):

```
/qa-loop (scope: complete app, dimensions: qa-design + qa-ux + qa-a11y + qa-code + qa-security + qa-e2e + qa-perf)
```

Followed by exhaustive navigation with real browser:

```
/browser-qa <url-of-new-app>
```

The `/browser-qa` crawls the entire UI (menus, flows, states, mobile/desktop viewports) and replaces individual `qa-e2e`.

Automatic fix loop until PASS in all dimensions.

### Final output

```
REDESIGN COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Mode:           REWRITE | IN-PLACE
Original app:   [path/url] — intact ✅
New app:        [path/url of redesign]
Stack:          [technologies used]

Features implemented: [N]/[N] (100% parity)
Screens:        [N] screens

UX improvements applied:
  ✓ [improvement 1]
  ✓ [improvement 2]

QA:
  Design:       ✅ PASS
  UX:           ✅ PASS
  A11y:         ✅ PASS
  E2E:          ✅ PASS
  Browser:      ✅ PASS

[If REWRITE:]
Repo:           github.com/[user]/[project]-redesign
To run:         rtk docker compose up -d (in folder ../[project]-redesign)

Legacy app remains at [original path] — no changes were made.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Rules

1. **Never touch the original app** without explicit confirmation — in rewrite mode, work exclusively in the new folder
2. **UX proposal before code** — no implementation line starts without Phase 3 approval
3. **Parity is mandatory** — every feature of the original app must be in the new one, or have been explicitly removed with user approval
4. **UX improvements are suggestions** — the user decides which to accept; nothing is imposed
5. **Kit design system** — shadcn/ui + Tailwind + Lucide + Framer Motion as base; `/ui` pipeline for everything visual
6. **TDD in all implementation** — Gherkin → unit test (RED) → implementation (GREEN) → refactor; no component without test
7. **Quality gate per feature** — `/qa-loop` + `/browser-qa` after each feature; never accumulate and test everything at the end
8. **Rewrite for legacy** — AngularJS, Backbone, Ember, jQuery-as-framework → always rewrite; never attempt incremental migration without official path
9. **Mobile detected → /mobile scaffold + feature** — React Native / Expo apps delegate to `/mobile scaffold` (new foundation) followed by `/mobile feature` per feature (reimplementation), then `/mobile qa` (final gate)
