# Hooks — What is Deterministic and What is Not

## Direct Answer

**Of the 5 hooks created, only 2 rules are truly deterministic (blocking).**
The rest are *advisory* — they influence Claude, but do not force the action.

---

## How Claude Code Hooks Work

Hooks receive a JSON via stdin with the tool call data and can:

| Output | Effect | Deterministic? |
|-------|--------|----------------|
| `process.exit(2)` + message on stderr | Blocks the tool call — the action does NOT happen | Yes |
| JSON with `additionalContext` | Adds text to Claude's context | No — LLM may ignore |
| Nothing (pass-through) | Lets the action happen normally | — |

**The problem with `additionalContext`:** it injects text into the conversation, which *influences* Claude, but does not *prevent* anything. Claude is an LLM — it may decide to ignore the injected context, especially under pressure to complete a task quickly.

**The only truly deterministic mechanism in hooks** is `process.exit` with a non-zero code, which causes Claude Code to cancel the tool call before executing it.

---

## Audit of Created Hooks

### Deterministic — `rules-engine.mjs`

These rules **actually block** (exit 2):

| Rule | Trigger | What it blocks |
|-------|---------|---------------|
| RULE-GIT-003 | Bash: `git commit --no-verify` | Prevents bypassing the pre-commit hook |
| RULE-ARCH-FILES | Write/Edit | Prevents `.test.*` files inside `src/` |

Registered in `settings.json` for `Bash` and `Write|Edit`.

### Deterministic — `architecture-guard.mjs`

These checks **actually block** (exit 2) via `PreToolUse/Write|Edit`:

| Rule | Trigger | What it blocks |
|-------|---------|---------------|
| RULE-ARCH-001 | Write/Edit in `src/domain/` | Imports of ORMs, HTTP clients, frameworks |
| RULE-ARCH-002 | Write/Edit in `src/application/` | Imports of ORMs, HTTP clients, frameworks |

In addition to the hard block, it injects `additionalContext` with the layer rules as a reminder.

### Advisory — `rtk-rewrite.mjs`
- Detects commands that should use RTK
- Adds `additionalContext` asking to rewrite with `rtk`
- **Does not force anything** — Claude needs to cooperate

*Why not block?* Blocking every `git status` without RTK installed would break the flow for new team members. The correct approach is the global hook from RTK itself (already configured in your environment).

### Advisory — `tdd-guard.mjs`
- Checks if a corresponding test file exists **after** the implementation file is written
- Adds a warning context if it does not exist
- **Does not block the write**

### Informational — `session-start.mjs`
- Injects welcome context at the start of the session
- Purely informational

---

## Why Not Everything Was Made Deterministic

### 1. Import verification requires content parsing
To block a domain file that imports infrastructure, the hook needs to:
1. Receive the `content` from the Write tool call
2. Parse the imports
3. Verify against the rules
4. Block if violated

This is possible in `PreToolUse/Write` — the `tool_input.content` is available. **The updated hook below implements this.**

### 2. TDD guard with hard block has edge cases
If it blocked `Write` of implementation when there is no test, it would break the case where:
- The agent creates test and implementation in the same session (the test has not yet been written when the hook fires on the implementation)
- Configuration files, DTOs, types that do not need tests

Solution: block only domain/application files (pure business logic), not all of `src/`.

### 3. The LLM cooperates when context is clear
In practice, well-written `additionalContext` + clear rules in `CLAUDE.md` + skill prompts work very well. Claude Code follows the injected context in most cases.

---

## Truly Deterministic Hooks: How to Implement More

### Pattern for hard block

```javascript
// In any hook .mjs
const violation = checkSomething(input);

if (violation) {
  process.stderr.write(`🚫 RULE-XXX: ${violation.message}\n`);
  process.exit(2); // Blocks the tool call — exit code != 0
}

// If it reached here, it passed — output the input back
process.stdout.write(JSON.stringify(input));
```

### Import verification (PreToolUse/Write)

```javascript
// Extract imports from TypeScript/JavaScript
function extractImports(content) {
  const importRegex = /^import\s+.*?from\s+['"](.+?)['"]/gm;
  const requireRegex = /require\(['"](.+?)['"]\)/g;
  const matches = [];
  let m;
  while ((m = importRegex.exec(content)) !== null) matches.push(m[1]);
  while ((m = requireRegex.exec(content)) !== null) matches.push(m[1]);
  return matches;
}

// Check if imports violate the layer rules
function findViolations(filePath, content, config) {
  const layer = detectLayer(filePath, config);
  if (!layer || !layer.allowedImportPrefixes.length) return [];
  
  const imports = extractImports(content);
  return imports.filter(imp => {
    if (imp.startsWith('.')) {
      // Relative import — check resolved path
      return false; // Complex to resolve statically, skip for now
    }
    // Absolute import — check if it's a known forbidden package
    const forbidden = ['prisma', 'mongoose', 'sequelize', 'typeorm', 'knex',
                       'axios', 'node-fetch', 'express', 'fastify', 'koa',
                       'pg', 'mysql', 'redis', 'mongodb'];
    return forbidden.some(pkg => imp.includes(pkg)) && layer.name === 'domain';
  });
}
```

### TDD verification in PreToolUse

```javascript
// Block domain/application implementation if test does not exist
if (isBusinessLogicFile(filePath) && !testExists(filePath, config)) {
  const testPath = getExpectedTestPath(filePath, config);
  process.stderr.write([
    `🚫 TDD GUARD (RULE-TEST-001): Write the test first.`,
    `Implementation file: ${filePath}`,
    `Create the test first at: ${testPath}`,
    `Then write the implementation.`,
  ].join('\n'));
  process.exit(2);
}
```

---

## What is Truly Guaranteed Today

| Guarantee | Mechanism | Confidence |
|---------|-----------|-----------|
| Not using `--no-verify` | Hook blocks (exit 2) | 100% |
| Not creating tests in `src/` | Hook blocks (exit 2) | 100% |
| Forbidden imports in domain/application | Hook blocks (exit 2) | 100% |
| Using RTK in CLI | Context + RTK global hook | ~90% |
| TDD (test before implementation) | Context + advisory | ~80% |
| Following CLAUDE.md/Rules.md | Context + skills | ~85% |

## What Provides Complementary Guarantees

Claude Code hooks are one line of defense. The others:

1. **Pre-commit git hooks** (Husky, Lefthook): verify imports, linting, tests before commit — 100% deterministic
2. **CI pipeline**: runs the full test suite — 100% deterministic
3. **Mandatory code review**: on the pull request — human or agent reviewer

For **full guarantee**, also configure:
```bash
# Lefthook (recommended — lighter than Husky)
npm install --save-dev lefthook

# lefthook.yml
pre-commit:
  commands:
    lint:
      run: npm run lint
    test:
      run: npm test
    arch-check:
      run: node scripts/check-architecture.js
```

---

## Summary

> Claude Code hooks are excellent for **guiding and influencing** the LLM's behavior.
> For **guaranteed enforcement**, combine with: pre-commit hooks (git) + CI pipeline.
> The two layers together provide complete coverage.
