---
name: ui
description: Full UI quality pipeline. Orchestrates design research → contract → TDD → official frontend-design plugin (generation) → enforce standards → accessibility → performance → browser-qa gate. Use this for any component or page that needs production quality.
argument-hint: <component or page>
---

# /ui — UI Quality Pipeline

> Frontend quality orchestrator.
> The official `frontend-design` plugin is the generation engine — this skill defines what to generate, ensures TDD, enforces standards, and performs the final gate with browser-qa.
>
> Flow: real research → design contract → failing tests → **generation via official plugin** → enforcement → accessibility → performance → browser-qa

---

## Phase 0 — Design Reference Research

> **Emit:** `▶ [0/9] Design Reference Research`
> **Token budget: ~6k** — 3-5 references maximum.

This phase is MANDATORY. Designs without real references result in AI slop.

### 0.1 — Context Brief

Define before researching:
- Product type: SaaS dashboard / landing page / e-commerce / dev tool / consumer app / etc.
- Target audience: devs / consumers / enterprises / creators
- Desired tone: modern/technical · elegant/refined · playful · minimalist · bold
- Keywords: `[type]-[tone]` e.g.: `saas-dashboard dark`, `fintech minimal`

### 0.2 — Deep Design Research

**Agent: design-researcher**

```
Tool: agent-browser CLI
Token budget: 4k

Research in this order, stop with 5 quality references:
1. Dribbble  → dribbble.com/search/[keywords]
2. Awwwards  → awwwards.com/websites/[category]
3. Behance   → behance.net/search/projects?field=ui-ux&search=[keywords]
4. Mobbin    → mobbin.com/screens?platform=web&keyword=[keywords]
5. Layers.to → layers.to

Per reference, document:
- Color palette (hex of the 3-4 dominant colors)
- Typography (visible fonts)
- Layout pattern
- Standout element (what makes it memorable)
- Applicability to the project

Output: DESIGN_REFS.md
```

### 0.3 — Synthesis

Read DESIGN_REFS.md and extract:
- **Palette**: most frequent and appealing hex values across references
- **Typography**: fonts from references or equivalents on Google Fonts
- **Layout pattern**: most recurring pattern adapted to the project
- **Signature element**: a specific and memorable visual element

---

## Phase 1 — Context + Design Direction

> **Emit:** `▶ [1/9] Context + Design Direction`

Commit to a **clear and intentional aesthetic direction**:

1. **Purpose**: What problem does it solve? Who uses it?
2. **Tone** — choose one extreme and execute with precision:
   - Brutally minimal · chaotic maximalism · retro-futuristic
   - Organic/natural · luxury/refined · playful/whimsical
   - Editorial/magazine · brutalist/raw · art deco/geometric
   - Soft/pastel · industrial/utilitarian
3. **Differentiator**: What will make this design UNFORGETTABLE?
4. **Data**: Which domain entities are displayed or mutated?
5. **Constraints**: Framework, performance, accessibility.

**Critical rule**: bold maximalism and refined minimalism work equally well — what does not work is indecision. Choose and execute with precision.

---

## Phase 2 — Design Contract

> **Emit:** `▶ [2/9] Design Contract`

```
COMPONENT: [Name]
Aesthetic direction: [e.g.: "brutalist with warm amber accents"]
Purpose: [what the user achieves]
Variants: [default, loading, error, empty]
States: [hover, focus, active, disabled]
Props/API:
  - [prop]: [type] — [purpose]
Data: [domain entities involved]
Accessibility:
  - ARIA role: [role]
  - Keyboard nav: [tab order, shortcuts]
  - Screen reader: [announcements]
Responsive:
  - Mobile (< 768px): [layout]
  - Tablet (768–1024px): [layout]
  - Desktop (> 1024px): [layout]
```

---

## Phase 3 — Component Hierarchy

> **Emit:** `▶ [3/9] Component Hierarchy`

```
Page/Container (smart — fetch data, manage state)
└── Layout
    ├── Header/Navigation
    ├── Main Content
    │   ├── [PrimaryComponent]
    │   │   ├── [SubComponent A]
    │   │   └── [SubComponent B]
    └── Sidebar/Footer (if applicable)
```

- **Smart** (containers): fetch data, manage state, dispatch events
- **Dumb** (presentational): receive props, render UI, emit events

---

## Phase 4 — TDD: Write Failing Tests First

> **Emit:** `▶ [4/9] TDD — Tests before code`

Write tests BEFORE invoking the generation plugin. The tests define the contract; the plugin must generate code that passes them.

```typescript
// Unit tests (component-level)
describe('[ComponentName]', () => {
  it('renders correctly with required props')
  it('shows loading state when isLoading=true')
  it('shows error state when error is set')
  it('shows empty state when data is empty')
  it('fires correct events on user interaction')
  it('matches design contract: [variant] variant renders correctly')
})

// Integration
it('fetches and displays data end-to-end')

// Cypress E2E
// Full user flow involving this component
```

Run: `rtk npx jest [component].test.tsx` — confirm they fail (RED).

---

## Phase 5 — Generate via Official Plugin

> **Emit:** `▶ [5/9] Generation — official plugin`

**Invoke the official `frontend-design` plugin via Skill tool**, passing as argument the complete context from previous phases:

```
Argument for frontend-design:

Component: [component/page name]

Aesthetic direction: [direction defined in Phase 1]
References: [DESIGN_REFS.md synthesis — palette, typography, signature element]

Design contract:
[paste complete contract from Phase 2]

Hierarchy:
[paste hierarchy from Phase 3]

Required stack:
- shadcn/ui + Tailwind CSS + Framer Motion
- Lucide React for icons (never emojis as UI icons)
- Skeleton screens for loading (not spinners for shaped content)
- Rive for stateful animations, Lottie for decorative ones

Quality constraints:
- NEVER: Arial, Inter, Roboto, system fonts
- NEVER: purple gradient on white background or timid palette evenly distributed
- NEVER: emojis as functional icons
- NEVER: mix icon styles (outline + filled)
- ALWAYS: prefers-reduced-motion respected
- ALWAYS: complete states (loading, error, empty, populated)
- ALWAYS: atmosphere and depth in background (not a generic solid color)
```

After generation, verify that Phase 4 tests pass. If not → adjust until GREEN.

---

## Phase 6 — Enforce Standards

> **Emit:** `▶ [6/9] Enforce — quality standards`

Review the generated code and fix any violations:

**Icons:**
- [ ] No emojis as functional icons — replace with Lucide, Font Awesome, or Unicons
- [ ] Consistent icon styles (outline OR filled, not mixed)
- [ ] Icon + label when there is space (not isolated icon without accessibility)

**Animations:**
- [ ] `prefers-reduced-motion` implemented
- [ ] Loading states: skeleton screen for shaped content, not spinner
- [ ] Transitions exist where state changes (no element appears/disappears in 0ms)
- [ ] Micro-animations only where they add value (not on every element)
- [ ] Button has press feedback (`scale(0.97)` or equivalent)

**Hexagonal Architecture:**
- [ ] Presentational components do not fetch data directly
- [ ] Smart containers use use cases via hooks, not calling API directly
- [ ] No `import` from `infrastructure/` inside `screens/` or `components/`

**Anti-patterns:**
- [ ] No `<div>` as button — use `<button>`
- [ ] No `onClick` without keyboard equivalent
- [ ] No nested conditional render > 2 levels (extract component)
- [ ] No state that can be derived from props
- [ ] No hardcoded strings (use constants or i18n keys)
- [ ] No inline styles beyond dynamic values

---

## Phase 7 — Accessibility

> **Emit:** `▶ [7/9] Accessibility`

- [ ] All interactive elements reachable by keyboard (Tab)
- [ ] Visible focus (not removed by CSS)
- [ ] Images have `alt` attribute
- [ ] Forms have associated `<label>`
- [ ] Correct ARIA roles (`role="button"`, `role="dialog"`, etc.)
- [ ] Errors announced to screen readers
- [ ] Color is not the only means of conveying information
- [ ] WCAG AA minimum contrast (4.5:1 for text)
- [ ] Touch targets ≥ 44×44px

---

## Phase 8 — Performance

> **Emit:** `▶ [8/9] Performance`

- [ ] Images optimized (WebP/AVIF, lazy load, correct size)
- [ ] No layout shift (CLS < 0.1)
- [ ] Long lists (> 100 items) virtualized
- [ ] Expensive calculations memoized
- [ ] Event listeners cleaned up on unmount
- [ ] No unnecessary re-renders

---

## Phase 9 — browser-qa Gate

> **Emit:** `▶ [9/9] browser-qa gate`

```
⛔ GATE /ui:
  □ Unit tests: 0 failures
  □ Cypress E2E: 0 failures
  □ Accessibility: Phase 7 checklist passed
  □ Performance: Phase 8 checklist passed
  □ Enforcement: Phase 6 checklist passed (no violations)
```

**Invoke `/browser-qa`** on the component/page URL for exhaustive visual verification.

Automatic fix loop (max 3 iterations) before escalating to the user.
Only advance when all items are PASS.
