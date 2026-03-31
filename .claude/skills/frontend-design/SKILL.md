---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces with high design quality. Combines bold aesthetic direction (avoid AI slop) with engineering rigor (TDD, accessibility, hexagonal architecture).
disable-model-invocation: true
argument-hint: <component or page>
---

# /frontend-design — Frontend Design and Implementation

Create distinctive, production-grade frontend interfaces. Combines creative aesthetic direction with engineering rigor.

---

## Phase 1 — Understand Context + Design Thinking

Before designing anything, commit to a **bold aesthetic direction**:

1. **Purpose**: What problem does this interface solve? Who uses it?
2. **Tone**: Pick an extreme and execute it with precision:
   - Brutally minimal / maximalist chaos / retro-futuristic
   - Organic/natural / luxury/refined / playful/toy-like
   - Editorial/magazine / brutalist/raw / art deco/geometric
   - Soft/pastel / industrial/utilitarian
   — or any other direction that is true to the context
3. **Differentiation**: What makes this UNFORGETTABLE? What's the one thing someone will remember?
4. **Data**: What domain entities does it display or mutate?
5. **Constraints**: Framework, performance requirements, accessibility requirements.

**CRITICAL**: Choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work — the key is **intentionality**, not intensity.

---

## Phase 2 — Design Contract

Before writing any code, define the design contract:

```
COMPONENT: [Name]
Aesthetic direction: [the bold tone chosen — e.g., "brutalist with warm amber accents"]
Purpose: [what the user achieves with this]
Variants: [default, loading, error, empty]
States: [hover, focus, active, disabled if interactive]
Props/API:
  - [prop]: [type] — [purpose]
Data: [what domain data it displays or mutates]
Accessibility:
  - ARIA role: [role]
  - Keyboard nav: [tab order, keyboard shortcuts]
  - Screen reader: [announcements needed]
Responsive:
  - Mobile (< 768px): [layout description]
  - Tablet (768–1024px): [layout description]
  - Desktop (> 1024px): [layout description]
```

---

## Phase 3 — Component Hierarchy

Design from the outside in:

```
Page/Container (smart, fetches data)
└── Layout (grid, flex structure)
    ├── Header/Navigation
    ├── Main Content
    │   ├── [PrimaryComponent]
    │   │   ├── [SubComponent A]
    │   │   └── [SubComponent B]
    └── Sidebar/Footer (if applicable)
```

- **Smart components** (containers): fetch data, manage state, handle events
- **Dumb components** (presentational): receive props, render UI, emit events

---

## Phase 4 — Aesthetic Guidelines

Every UI must be visually striking and memorable. Focus on:

### Typography
- Choose fonts that are **beautiful, unique, and interesting**
- Pair a **distinctive display font** with a **refined body font**
- Consistent scale (e.g., 12/14/16/20/24/32/40/48px), line height 1.4–1.6 for body
- **NEVER**: Arial, Inter, Roboto, system fonts, or any generic AI-default font

### Color & Theme
- Commit to a cohesive aesthetic with CSS variables for consistency
- **Dominant colors with sharp accents** outperform timid, evenly-distributed palettes
- One accent color for primary actions
- Semantic: green (success), red (error), yellow (warning), blue (info)
- Sufficient contrast (WCAG AA minimum: 4.5:1 for text)
- **NEVER**: purple gradients on white backgrounds or any clichéd AI color scheme

### Motion
- Use animations for effects and micro-interactions
- One well-orchestrated page load with staggered reveals (`animation-delay`) creates more delight than scattered micro-interactions
- Scroll-triggering and hover states that **surprise**
- Prefer CSS-only solutions for HTML; Motion library for React

### Spatial Composition
- Unexpected layouts, asymmetry, overlap, diagonal flow
- Grid-breaking elements and generous negative space OR controlled density
- One primary action per screen; clear visual weight: primary > secondary > tertiary

### Backgrounds & Visual Details
- Create **atmosphere and depth** rather than defaulting to solid colors
- Gradient meshes, noise textures, geometric patterns, layered transparencies
- Dramatic shadows, decorative borders, grain overlays when fitting the aesthetic

### Dark Mode
- Default to dark mode for dashboards, developer tools, AI products
- Light mode for content-first or editorial surfaces

**NEVER converge on generic AI aesthetics**: overused fonts, clichéd color schemes, predictable layouts, cookie-cutter design that lacks context-specific character. Every design should be unique.

---

## Phase 5 — TDD for Frontend

Write component tests before implementing:

```
Unit tests (component-level):
  - Renders correctly with all props
  - Shows loading state when isLoading=true
  - Shows error state when error is set
  - Shows empty state when data is empty
  - Fires correct events on user interaction

Integration tests:
  - Data fetching and display end-to-end

Cypress E2E:
  - Full user flow involving this component
```

---

## Phase 6 — Implementation Order

1. Write failing component tests (RED)
2. Build the component skeleton (GREEN — tests pass with minimal impl)
3. Add all states (loading, error, empty, populated)
4. Add interactivity and event handlers
5. Apply the aesthetic direction (typography, color, motion, composition)
6. Add responsive behavior
7. Add accessibility attributes (ARIA, keyboard nav)
8. Refactor for readability (REFACTOR)
9. Run tests + Cypress

**Match implementation complexity to the aesthetic vision**: maximalist designs need elaborate animations and effects; minimalist designs need restraint, precision, and careful spacing.

---

## Phase 7 — Accessibility Checklist

Before marking any UI component done:
- [ ] All interactive elements reachable by keyboard (Tab)
- [ ] Focus visible (not removed by CSS)
- [ ] Images have `alt` attributes
- [ ] Forms have associated `<label>` elements
- [ ] ARIA roles correct (`role="button"`, `role="dialog"`, etc.)
- [ ] Error messages announced to screen readers
- [ ] Color is not the only way to convey information
- [ ] Touch targets ≥ 44×44px on mobile

---

## Phase 8 — Performance Checklist

- [ ] Images optimized (WebP/AVIF, lazy loaded, correct sizes)
- [ ] No layout shift (CLS < 0.1)
- [ ] Large lists virtualized (> 100 items)
- [ ] Expensive computations memoized
- [ ] Event listeners cleaned up on unmount
- [ ] No unnecessary re-renders

---

## Phase 9 — Code Review Checklist

- [ ] Component does one thing (Single Responsibility)
- [ ] Props interface clearly typed
- [ ] No hardcoded strings (use constants or i18n keys)
- [ ] No inline styles unless truly dynamic
- [ ] Tests cover all states and main interactions
- [ ] Accessible (checklist above passed)
- [ ] Responsive on mobile, tablet, desktop
- [ ] Aesthetic direction is distinctive and intentional (not generic)

---

## Anti-Patterns to Avoid

**Engineering:**
- Raw `<div>` buttons (use `<button>`)
- `onClick` without keyboard equivalent
- Nested conditional renders more than 2 levels deep (extract components)
- Fetching data inside presentational components
- State that could be derived from props
- God components that do everything
- Missing loading/error/empty states

**Aesthetic:**
- Generic AI font defaults (Inter, Roboto, Space Grotesk, Arial)
- Purple gradient on white background
- Evenly-distributed, timid color palettes
- Predictable, cookie-cutter layouts
- Scattered micro-interactions with no focal point
- Solid color backgrounds with no atmosphere or depth
