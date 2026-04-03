#!/usr/bin/env node
/**
 * commit-guard.mjs — Conventional Commits Enforcement [AUTO RULE-GIT-002]
 *
 * Triggered: PreToolUse / Bash
 * Hard blocks (exit 2) git commits that don't follow Conventional Commits format.
 * Skips: merge commits, heredoc commits (can't parse statically), non-commit commands.
 */

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

const CONVENTIONAL_RE =
  /^(feat|fix|test|refactor|docs|chore|perf|style|ci|build|revert)(\([^)]+\))?(!)?: .{1,100}/;

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

  const toolName = input.tool_name;
  if (toolName !== 'Bash') {
    process.stdout.write(JSON.stringify(input));
    return;
  }

  const command = input.tool_input?.command || '';

  // Only inspect git commit commands
  if (!command.includes('git commit')) {
    process.stdout.write(JSON.stringify(input));
    return;
  }

  // Skip --amend without new message, --allow-empty-message, merge commits
  if (command.includes('--allow-empty-message') || command.includes('MERGE_MSG')) {
    process.stdout.write(JSON.stringify(input));
    return;
  }

  // Extract message from -m flag (handles single and double quotes)
  const mMatch = command.match(/-m\s+(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')/);
  if (!mMatch) {
    // Heredoc or no -m flag — can't validate statically, allow through
    process.stdout.write(JSON.stringify(input));
    return;
  }

  const message = (mMatch[1] || mMatch[2] || '').trim();

  // Allow co-author trailers appended by Claude
  const firstLine = message.split('\n')[0].trim();

  if (!CONVENTIONAL_RE.test(firstLine)) {
    const err = [
      `🚫 RULE-GIT-002 — Conventional Commits format required.`,
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
    process.exit(2); // Hard block
  }

  process.stdout.write(JSON.stringify(input));
}

main().catch((err) => {
  process.stderr.write(`[commit-guard] Hook error: ${err.message}\n`);
  process.exit(0); // Never block on hook errors
});
