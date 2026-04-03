# cc-harness

AI development harness for [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Build any software from zero to production with one command.

## How It Works

```
/build a SaaS expense tracker with team budgets, recurring transactions, charts and PDF reports
```

This triggers a fully autonomous pipeline:

1. **Research** — parallel agents search the web for patterns, APIs, references
2. **Plan** — BDD scenarios, architecture mapping, test plan (waits for your approval)
3. **Implement** — TDD, foundation first, auth gate, feature-by-feature with QA gates
4. **Launch** — Docker up, browser audit of ALL screens, fix loop until zero issues
5. **Deliver** — app running at `http://localhost:3000`, ready for manual testing

Works for hackathons (`scale=MVP`), launches (`scale=Product`), or production systems (`scale=Scale`).

## Install

**New project:**

```bash
bash <(curl -s "https://raw.githubusercontent.com/afialho/cc-harness/main/scripts/new-project.sh?t=$(date +%s)") my-app
cd my-app && claude
```

**Existing codebase** (run from your project root):

```bash
bash <(curl -s "https://raw.githubusercontent.com/afialho/cc-harness/main/scripts/adopt.sh?t=$(date +%s)")
claude
/adapt
```

## Requirements

Node.js 18+, Git 2.5+, Docker, [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code).

`scripts/setup.sh` checks and installs dependencies automatically.

## Skills

27 slash commands. Entry point: **`/build`** (auto-routes everything).

| Category | Skills |
|----------|--------|
| **Setup** | `/ideate` `/scaffold` `/build` `/adapt` |
| **Transform** | `/redesign` `/refactor` `/modernize` |
| **Develop** | `/feature-dev` `/auth` `/ui` `/frontend-design` `/mobile` `/dba` `/data-migration` |
| **Quality** | `/qa-loop` `/browser-qa` `/code-review` `/perf-audit` `/security-hardening` |
| **Infra** | `/deploy` `/ci-cd` `/observability` |
| **Docs** | `/research` `/docs-gen` `/adr` `/agent-teams` `/resume` |

Full catalog: [docs/SKILLS.md](docs/SKILLS.md)

## License

MIT
