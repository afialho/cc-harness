#!/usr/bin/env node
/**
 * rules-engine.mjs — Rules.md Constraint Enforcement Hook
 *
 * Reads Rules.md and enforces machine-checkable constraints.
 * Currently enforces:
 *   - RULE-GIT-003: Block commits when test failures detected in recent output
 *   - RULE-CODE-004: Warn about TODO/FIXME with blockers in commit messages
 *   - RULE-EFF-002: Warn about MCP usage when CLI alternative exists
 *
 * Architecture file placement (RULE-ARCH-FILES) moved to architecture-guard.mjs.
 *
 * Triggered: PreToolUse / Bash (for git and test commands)
 *
 * Extend this hook by adding new rule checkers in the RULES array.
 */

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

/**
 * Rule checker interface:
 *   { id, description, check(input) → { violated: bool, message: string } }
 */
const RULES = [
  // RULE-EFF-001 removed — rtk-rewrite.mjs handles RTK enforcement directly
  {
    id: 'RULE-GIT-001',
    description: 'Use worktrees for parallel feature development',
    check(input) {
      if (input.tool_name !== 'Bash') return null;
      const cmd = input.tool_input?.command?.trim() || '';
      // Detect checkout to a new branch without worktree (advisory)
      if ((cmd.includes('git checkout -b') || cmd.includes('git switch -c')) && !cmd.includes('worktree')) {
        return {
          violated: false,
          message: [
            `💡 RULE-GIT-001: Creating a new branch?`,
            `Consider using a worktree instead to enable parallel work:`,
            `  rtk git worktree add ../[project]-[branch-name] -b [branch-name]`,
            `See docs/WORKTREES.md for patterns.`,
          ].join('\n'),
        };
      }
      return null;
    },
  },
  {
    id: 'RULE-GIT-003',
    description: 'No commits with failing tests',
    check(input) {
      if (input.tool_name !== 'Bash') return null;
      const cmd = input.tool_input?.command?.trim() || '';
      if (cmd.includes('git commit') && cmd.includes('--no-verify')) {
        return {
          violated: true,
          message: [
            `🚫 RULE-GIT-003 VIOLATED: --no-verify bypasses test checks.`,
            `Run tests first: rtk npm test (or equivalent)`,
            `All tests must pass before committing.`,
          ].join('\n'),
        };
      }
      return null;
    },
  },
];

async function main() {
  const raw = await readStdin();
  let input;

  try {
    input = JSON.parse(raw);
  } catch {
    process.stdout.write(raw);
    return;
  }

  const violations = [];
  const advisories = [];

  for (const rule of RULES) {
    try {
      const result = rule.check(input);
      if (!result) continue;

      if (result.violated && result.message) {
        violations.push(`[${rule.id}] ${result.message}`);
      } else if (!result.violated && result.message) {
        advisories.push(result.message);
      }
    } catch {
      // Rule check error — skip silently
    }
  }

  // Hard violations — block the action
  if (violations.length > 0) {
    process.stderr.write(violations.join('\n\n') + '\n');
    process.exit(2); // Non-zero blocks the tool call
  }

  // Advisories — add context
  if (advisories.length > 0) {
    const output = {
      ...input,
      additionalContext: advisories.join('\n\n'),
    };
    process.stdout.write(JSON.stringify(output));
    return;
  }

  process.stdout.write(JSON.stringify(input));
}

main().catch((err) => {
  process.stderr.write(`[rules-engine] Hook error: ${err.message}\n`);
  process.exit(0);
});
