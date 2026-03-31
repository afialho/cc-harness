# CLAUDE.md — [Project Name]

> Stack-agnostic AI development starter kit.
> Replace `[Project Name]` with your project name before using.

---

## Non-Negotiable Rules

**RTK CLI** — Prefix ALL commands with `rtk`: `rtk git status`, `rtk npm test`, `rtk ls -la`

**Architecture** — Hexagonal. Layers are sacred:
```
src/domain/         Pure business logic. Zero external deps.
src/application/    Use cases. Depends on Domain + Ports only.
src/ports/          Interface contracts.
src/infrastructure/ Adapters implementing ports.
src/shared/         Cross-cutting (config, logging, utils).
```

**TDD** — RED → GREEN → REFACTOR. Always. Tests before implementation.

**BDD** — Gherkin scenarios before any code. Cucumber.js at `tests/bdd/features/`

**Agents** — Max 5 parallel. Each agent = 1 granular activity. 100k token budget per agent.

**Git** — Worktrees for parallel work: `rtk git worktree add ../$PROJECT-feat -b feature/feat`

Full rules: `Rules.md` | Agent protocol: `Agents.md`

---

## Context Budget

System context starts ~18k tokens. Threshold: **60k total**.

At threshold → write `.claude/checkpoint.md` → output `↺ Contexto ~60k — escrevi checkpoint. Recomendo /compact.`
After /compact → SessionStart hook injects checkpoint → `/resume` retoma autonomamente.

Checkpoint format: skill, phase, files modified, exact next step, key decisions.

Token estimates: file read ~1k | agent call ~8k | long response ~2k | phase ~3k

---

## Progress Reporting

Before each phase/step: `▶ [N/Total] Phase Name`

---

## Skills

| Skill | Purpose |
|-------|---------|
| `/research` | Parallel research wave → RESEARCH.md (UX, libs, YouTube, docs) |
| `/build` | Full pipeline: research → clarify → plan → implement |
| `/plan` | Development plan with arch mapping, BDD, test plan |
| `/feature-dev` | TDD + hexagonal implementation, 7 phases |
| `/frontend-design` | Production-grade UI with modern design |
| `/tdd` | Red → Green → Refactor guidance |
| `/hexagonal` | Hexagonal architecture reference |
| `/agent-teams` | Multi-team parallel orchestration |
| `/resume` | Resume from checkpoint after context reset |
