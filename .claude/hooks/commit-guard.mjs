#!/usr/bin/env node
/**
 * commit-guard.mjs — Git Workflow Enforcement Hook
 *
 * Consolidates all git-related rule checks into a single hook.
 * Triggered: PreToolUse / Bash
 *
 * Enforces:
 *   RULE-GIT-001 [ADVISORY] — Suggest worktrees for new branch creation
 *   RULE-GIT-002 [HARD BLOCK] — Conventional Commits format required
 *   RULE-GIT-003 [HARD BLOCK] — Block --no-verify (bypass test checks)
 *
 * Skips: merge commits, heredoc commits, non-git commands.
 */

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

const CONVENTIONAL_RE =
  /^(feat|fix|test|refactor|docs|chore|perf|style|ci|build|revert)(\([^)]+\))?(!)?: .{1,200}/;

const VALID_TYPES = 'feat | fix | test | refactor | docs | chore | perf | style | ci | build | revert';

async function main() {
  const raw = await readStdin();
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.stdout.write(raw || '{}');
    return;
  }

  if (input.tool_name !== 'Bash') {
    process.stdout.write(JSON.stringify(input));
    return;
  }

  const command = (input.tool_input?.command || '').trim();

  // ── RULE-GIT-001 [ADVISORY]: Suggest worktrees for new branch creation ────
  if ((command.includes('git checkout -b') || command.includes('git switch -c')) && !command.includes('worktree')) {
    const advisory = [
      `RULE-GIT-001: Creating a new branch?`,
      `Consider using a worktree for parallel work:`,
      `  rtk git worktree add ../[project]-[branch-name] -b [branch-name]`,
      `See docs/WORKTREES.md for patterns.`,
    ].join('\n');

    const output = {
      ...input,
      additionalContext: advisory,
    };
    process.stdout.write(JSON.stringify(output));
    return;
  }

  // Only inspect git commit commands from here
  if (!command.includes('git commit')) {
    process.stdout.write(JSON.stringify(input));
    return;
  }

  // ── RULE-GIT-003 [HARD BLOCK]: No --no-verify ────────────────────────────
  if (command.includes('--no-verify')) {
    process.stderr.write([
      `RULE-GIT-003 VIOLATED: --no-verify bypasses test checks.`,
      `Run tests first: rtk npm test (or equivalent)`,
      `All tests must pass before committing.`,
    ].join('\n') + '\n');
    process.exit(2);
  }

  // Skip --amend without new message, --allow-empty-message, merge commits
  if (command.includes('--allow-empty-message') || command.includes('MERGE_MSG')) {
    process.stdout.write(JSON.stringify(input));
    return;
  }

  // ── RULE-GIT-002 [HARD BLOCK]: Conventional Commits format ────────────────
  // Extract message from -m flag (handles single and double quotes)
  const mMatch = command.match(/-m\s+(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')/);
  if (!mMatch) {
    // Heredoc or no -m flag — can't validate statically, allow through
    process.stdout.write(JSON.stringify(input));
    return;
  }

  const message = (mMatch[1] || mMatch[2] || '').trim();
  const firstLine = message.split('\n')[0].trim();

  if (!CONVENTIONAL_RE.test(firstLine)) {
    const err = [
      `RULE-GIT-002 — Conventional Commits format required.`,
      ``,
      `Format:  type(scope): description`,
      `Types:   ${VALID_TYPES}`,
      ``,
      `Examples:`,
      `  feat(auth): add JWT refresh token rotation`,
      `  fix(board): correct card drag-drop on mobile`,
      `  test(user): add unit tests for CreateUserUseCase`,
      `  chore(docker): add postgres service to compose`,
      ``,
      `Received: "${firstLine}"`,
      ``,
      `Fix the commit message and retry.`,
    ].join('\n');

    process.stderr.write(err + '\n');
    process.exit(2);
  }

  process.stdout.write(JSON.stringify(input));
}

main().catch((err) => {
  process.stderr.write(`[commit-guard] Hook error: ${err.message}\n`);
  process.exit(0); // Never block on hook errors
});
