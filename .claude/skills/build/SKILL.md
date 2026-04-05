---
name: build
description: Full lifecycle orchestrator. Runs research → clarify → plan → implement pipeline. Each phase uses parallel agents and has its own context budget with automatic checkpoints.
disable-model-invocation: true
argument-hint: <raw idea>
---

# /build — Full Pipeline: Idea → Implementation

> **Extends:** `claude-code-setup@claude-plugins-official`
> Adds: research wave, BDD planning, parallel agent orchestration, and quality gates (/qa-loop + /browser-qa) at every phase.
> The official plugin handles project setup; this skill runs the full development lifecycle on top.

Three-phase orchestrator with real research, informed planning and autonomous implementation.
Each phase has its own context budget and automatic checkpoints.

---

## Pipeline Overview

```
/build <idea>
    │
    ├─ [0/3] Phase 0 — Context Detection
    │         ├─ Empty project? → /scaffold → continue
    │         ├─ Transformation detected? → /redesign | /refactor | /modernize (full handoff)
    │         ├─ Vague idea? → /ideate → wait for IDEAS.md → resume automatically
    │         └─ ⏸ PAUSE: confirm understanding
    │
    ├─ [1/3] Phase 1 — Research
    │         ├─ Parallel agent wave:
    │         │   ├─ Business/Market Agent    (whenever feature has users)
    │         │   ├─ API/Docs Agent           (if integrating with third parties)
    │         │   ├─ Architecture Agent       (if has backend/infra)
    │         │   ├─ Domain/Rules Agent       (if specialized domain)
    │         │   ├─ Implementations Agent    (always)
    │         │   └─ YouTube Agent            (if relevant tutorials exist)
    │         ├─ Aggregate into RESEARCH.md
    │         ├─ /qa-loop (qa-research) → GATE: does research have real evidence?
    │         └─ ⏸ PAUSE: key insights + 3-5 clarification questions
    │
    ├─ [2/3] Phase 2 — Planning
    │         ├─ Extract structured data from RESEARCH.md → hexagonal architecture, BDD, test plan
    │         ├─ Generate PLAN.md
    │         ├─ /qa-loop (qa-plan) → GATE: BDD complete? architecture mapped?
    │         └─ ⏸ PAUSE: present plan → wait for approval
    │
    └─ [3/3] Phase 3 — Implementation
              ├─ git checkout -b feature/[name]
              ├─ [3a] Foundation (design system + layout) → GATE → COMMIT
              ├─ [3b] Auth (register/login/logout) → GATE → COMMIT
              ├─ Simple feature → /feature-dev + phase gate → COMMIT per feature
              ├─ Complex feature (3+ components) → /agent-teams + phase gate → COMMIT per wave
              │
              ├─ [CONCLUSION] Launch + Self-Healing Loop
              │   ├─ Complete test suite (unit + BDD + Cypress + k6)
              │   ├─ docker compose up -d → health check → local URL
              │   ├─ /code-review → PASS
              │   ├─ /qa-loop (qa-code + qa-security + qa-backend)
              │   ├─ Capability gates (per .claude/capabilities.json)
              │   ├─ Self-Healing Loop (MANDATORY):
              │   │   ├─ Agent(agent-browser) → crawl ALL pages, test ALL elements
              │   │   ├─ Issues found? → fix → retest (max 5 iterations)
              │   │   └─ Loop until 0 BLOCKER/MAJOR
              │   ├─ Final commit (only remaining fixes)
              │   └─ BUILD COMPLETE — app running at http://localhost:[port]
              │
              └─ Docker is NOT shut down — app remains accessible
```

Automatic checkpoints at the end of each phase and whenever estimated context reaches ~60k tokens (write checkpoint) / ~80k (compact recommended).

---

## Phase 0 — Context Detection + Refinement

> **Emit:** `▶ [0/3] Analyzing context`

### 0.0 — Detect if context is sufficient to build

Before anything, evaluate what was received **in order**:

**Step A — Empty project? → call `/scaffold` first**

Check if the project has minimal structure:
- Does `package.json`, `pyproject.toml`, `go.mod`, or `Gemfile` exist? OR
- Does `src/`, `app/`, `lib/`, `app.py`, or `main.go` exist?

If **none** of these exist → project is empty. Call `/scaffold` before continuing:

```
No project structure detected. Need to initialize the environment before implementing.

▶ Starting /scaffold...
```

After `/scaffold` completes → continue to Step B automatically.

**Step B — Transformation intent? → delegate completely**

Before evaluating if the idea is vague, check if the argument or context indicates **transformation of something that already exists**.

These are **full handoffs**: when detected, `/build` delegates entirely to the corresponding skill and **does not continue its own pipeline** (does not do research, plan, implement on its own).

**Signals for `/redesign`** (UI/UX transformation):
- Explicit keywords: "redesign", "new interface", "new UI", "modernize interface", "new visual", "redo the frontend", "new layout"
- Legacy framework detected in codebase (`angular.js v1`, `backbone`, `ember`, `jquery` as main framework) + intention to create new app
- "create a new app from an existing one", "new application with the same features"

**Signals for `/refactor`** (code quality improvement):
- Explicit keywords: "refactor", "clean code", "technical debt", "legacy code", "improve quality"
- Context: existing codebase + code quality language without mention of new features
- "extract module", "separate responsibilities", "decouple", "remove dead code"

**Signals for `/modernize`** (architecture transformation):
- Explicit keywords: "modernize", "hexagonal", "microservices", "modular", "monolith", "strangler fig"
- Context: existing codebase + intention to change the architecture as a whole
- "extract services", "split the monolith", "refactor to hexagonal", "create independent modules"

**When any signal above is detected:**

```
Detected that the intent is [interface redesign / code refactoring / architecture modernization].

Delegating to /[redesign|refactor|modernize] which has the complete pipeline for this.

▶ Starting /[redesign|refactor|modernize]...
```

Call the corresponding skill with the received argument as context. Do not resume the `/build` pipeline after the skill completes.

If the signals are ambiguous (e.g., "I want to improve the app" without indicating if it's UI, code or architecture), ask before delegating:

```
What is your intent?
  (A) Modernize the app's interface/UX → /redesign
  (B) Improve the quality of existing code → /refactor
  (C) Change the architecture (hexagonal, modular, microservices) → /modernize
  (D) Build a new feature → continue with /build
```

**Step C — Clear idea? Check (in order):**

1. Does `IDEAS.md` exist at the project root? → sufficient context, skip to 0.1
2. Does the project already have code and the argument clearly describes **what to build** (feature, entities, expected behavior)? → skip to 0.1

**Signals of a vague idea — call `/ideate` if any of these are true:**
- No argument passed (`/build` with nothing)
- Argument with < 15 words without a concrete feature ("I want an app", "something like Zendesk", "a task platform")
- Analogy without specification ("like Pipefy but different", "like Notion but for X")
- No defined user, no clear problem, no expected behavior
- Multiple loose ideas without defined scope

**If vague idea detected:**

```
I noticed the idea is still in the definition phase.
Before building, I'll interview you to map features, define the MVP and
ensure we build the right thing.

▶ Starting /ideate...
```

Call `/ideate <received argument>` and **wait for the result** (IDEAS.md generated + user approval).
After `/ideate` completes, automatically resume `/build` with `IDEAS.md` as input — without needing the user to call `/build` again.

**If sufficient context:** proceed directly to 0.1.

---

### 0.1 — Detect operation mode

Infer from argument or use default:

| Mode | Activation | Behavior |
|------|------------|----------|
| **autonomous** (default) | no flag, or `autonomous`, `auto` | AI as PM — deep research defines feature set. User validates at macro level. |
| **guided** | `guided`, `guide me`, `ask me` | User guides — detailed interview, user defines features. |

Record the mode for use in subsequent phases.

---

### 0.2 — Idea Refinement

Receive the concrete idea (or IDEAS.md from /ideate) and:

1. **Infer capabilities** from context (idea description, codebase, explicit mentions).
   Do NOT ask "what scale?" — infer and present for confirmation.

   **Always ON (non-negotiable):**
   - Docker (all services containerized)
   - Auth gate (if app has users)
   - Security scan (dependency audit)
   - Conventional Commits
   - Unit tests
   - TDD (Red→Green→Refactor)
   - Agent-browser verification (navigate all screens, test all elements)

   **Inference rules — enable ✅ when context matches:**

   | Capability | Enable when | Tool/Skill |
   |-----------|------------|-----------|
   | BDD (Gherkin) | always (default ON) | Cucumber |
   | E2E tests (Cypress) | UI exists (default ON for web apps) | Cypress |
   | Hexagonal architecture | new project or detected | architecture-guard |
   | CI/CD | "production", "deploy", "team", "market" | `/ci-cd` |
   | Structured logging | backend + "production" or "deploy" | pino / structlog |
   | Rate limiting | auth + public APIs + "production" | middleware |
   | Security hardening | "production", "security", "audit" | `/security-hardening` |
   | API documentation | "API", "public API", "documentation" | `/docs-gen` |
   | Observability (OTel) | "monitoring", "observability", "tracing", "metrics" | `/observability` |
   | Load tests (k6) | "performance", "scale", "load", "stress" | k6 |
   | Multi-tenancy | "multi-tenant", "SaaS", "organizations", "workspaces" | tenant isolation |

   If IDEAS.md exists and has capabilities listed → use those as starting point.
   If called with explicit capabilities (e.g. `/build with CI/CD and load tests`) → enable those.

2. Reformulate in clear technical language:
   - What will be built
   - Expected input and output
   - Entities involved
   - Feature type: UI-heavy | Backend | Full-stack | Library

3. Present the understanding to the user in this format:

```
UNDERSTANDING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Feature:      [short name]
Mode:         autonomous | guided
Objective:    [one sentence — what the user achieves]
What it builds: [2-4 technical bullets]
Entities:     [domain entities involved]
Type:         [UI-heavy | Backend | Full-stack | Library]
References:   [existing products mentioned — "like Jira", "similar to Trello"]

Capabilities (inferred — edit freely):
  ✅ Auth (register/login/logout)
  ✅ Unit tests
  ✅ TDD (Red→Green→Refactor)
  ✅ BDD (Cucumber/Gherkin)
  ✅ E2E tests (Cypress)
  ✅ Docker
  ✅ Hexagonal architecture
  ✅ Agent-browser verification
  ☐ CI/CD (GitHub Actions)
  ☐ Structured logging
  ☐ Rate limiting
  ☐ Security hardening (OWASP)
  ☐ API documentation (OpenAPI)
  ☐ Observability (OpenTelemetry → Grafana)
  ☐ Load tests (k6)
  ☐ Multi-tenancy

Adjust ✅/☐ and confirm to proceed.
```

The ✅/☐ above is an example. Actual defaults are inferred per project.
Save selected capabilities in `.claude/capabilities.json` for use in Phase 3 gates.

4. Ask: **"Is this understanding correct? Can I proceed to research?"**

Wait for confirmation before starting Phase 1.
If the user corrects something, adjust the understanding and confirm again.

---

## Phase Loading

Before starting each phase, read the corresponding phase file for detailed instructions:
- Phase 1 (Research): Read `.claude/skills/build/PHASE-1-RESEARCH.md`
- Phase 2 (Planning): Read `.claude/skills/build/PHASE-2-PLANNING.md`
- Phase 3 (Implementation): Read `.claude/skills/build/PHASE-3-IMPLEMENTATION.md`

This progressive loading saves ~8k tokens at skill invocation.
