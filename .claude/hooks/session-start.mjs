#!/usr/bin/env node
/**
 * session-start.mjs — Session Context Injection Hook
 *
 * Triggered: SessionStart / startup | resume
 *
 * Injects key project context at the start of every session:
 *   - Active rules summary
 *   - Available skills
 *   - Token efficiency reminders
 *   - Current project state (if detectable)
 */

import { existsSync, readFileSync } from 'fs';

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

function getProjectName() {
  // Try package.json first
  if (existsSync('package.json')) {
    try {
      const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
      return pkg.name || null;
    } catch { return null; }
  }
  // Try pyproject.toml
  if (existsSync('pyproject.toml')) {
    const content = readFileSync('pyproject.toml', 'utf8');
    const match = content.match(/name\s*=\s*"([^"]+)"/);
    return match ? match[1] : null;
  }
  return null;
}

function detectStack() {
  const markers = [];
  if (existsSync('package.json')) {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps['next']) markers.push('Next.js');
    else if (deps['react']) markers.push('React');
    else if (deps['vue']) markers.push('Vue');
    if (deps['express']) markers.push('Express');
    if (deps['fastify']) markers.push('Fastify');
    if (deps['@cucumber/cucumber']) markers.push('Cucumber.js ✅');
    if (deps['cypress']) markers.push('Cypress ✅');
  }
  if (existsSync('requirements.txt') || existsSync('pyproject.toml')) markers.push('Python');
  if (existsSync('go.mod')) markers.push('Go');
  if (existsSync('pom.xml') || existsSync('build.gradle')) markers.push('Java');
  return markers;
}

async function main() {
  const raw = await readStdin();
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.stdout.write(raw || '{}');
    return;
  }

  const projectName = getProjectName() || '[Project Name]';
  const stack = detectStack();
  const stackStr = stack.length > 0 ? stack.join(', ') : 'Not yet configured';

  // Inject checkpoint if one exists (written after /clear or /compact)
  const checkpointPath = '.claude/checkpoint.md';
  let checkpointBlock = '';
  if (existsSync(checkpointPath)) {
    const checkpoint = readFileSync(checkpointPath, 'utf8').trim();
    checkpointBlock = [
      ``,
      `## ↺ Checkpoint Restored`,
      `Work was in progress when context was reset. Resume with \`/resume\`.`,
      ``,
      checkpoint,
      ``,
      `---`,
    ].join('\n');
  }

  const lines = [
    `# Session Start — ${projectName}`,
    ``,
    `## Active Stack`,
    stackStr,
    ``,
    `## Key Rules (Always Active)`,
    `- RULE-EFF-001: Use \`rtk <cmd>\` for all CLI operations (60-90% token savings)`,
    `- RULE-EFF-002: Prefer CLI over MCP`,
    `- RULE-ARCH-001: Domain layer — zero external dependencies`,
    `- RULE-TEST-001: Write failing tests BEFORE implementation (TDD)`,
    `- RULE-TEST-002: BDD scenarios (Gherkin) written before code`,
    `- RULE-AGENT-001: Max 5 parallel agents`,
    `- RULE-AGENT-002: Each agent = 1 granular activity`,
    `- RULE-GIT-001: Use worktrees for parallel feature work`,
    ``,
    `## Available Skills`,
    `- /research        → Parallel research wave → RESEARCH.md (UX, libs, YouTube, docs)`,
    `- /build           → Full pipeline: research → clarify → plan → implement`,
    `- /plan            → Development plan with arch mapping, BDD, test plan`,
    `- /feature-dev     → TDD + hexagonal feature implementation`,
    `- /frontend-design → Production-grade UI with modern design`,
    `- /tdd             → Red-Green-Refactor workflow guidance`,
    `- /hexagonal       → Hexagonal architecture reference`,
    `- /agent-teams     → Multi-team parallel orchestration`,
    `- /resume          → Resume from checkpoint after context reset`,
    ``,
    `## Testing Stack`,
    `- Unit/Integration: Framework-native (see docs/TESTING.md)`,
    `- BDD: Cucumber.js (@cucumber/cucumber)`,
    `- E2E: Cypress`,
    `- Load/Stress: k6 (run: k6 run tests/load/<script>.js)`,
    ``,
    `## Start a Feature`,
    `1. /plan [describe what you want to build]`,
    `2. /feature-dev [feature name]  ← orchestrates full TDD + agent workflow`,
    ``,
    `See CLAUDE.md, Agents.md, Rules.md for full documentation.`,
  ];

  const output = {
    ...input,
    additionalContext: checkpointBlock + lines.join('\n'),
  };

  process.stdout.write(JSON.stringify(output));
}

main().catch((err) => {
  process.stderr.write(`[session-start] Hook error: ${err.message}\n`);
  process.exit(0);
});
