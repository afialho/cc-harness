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

function getArchPattern() {
  const configPath = '.claude/architecture.json';
  if (!existsSync(configPath)) return 'hexagonal';
  try {
    const config = JSON.parse(readFileSync(configPath, 'utf8'));
    if (config.disabled) return 'flat';
    return config.pattern || 'hexagonal';
  } catch {
    return 'hexagonal';
  }
}

function detectStack() {
  const markers = [];
  if (existsSync('package.json')) {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps['next']) markers.push('Next.js');
    else if (deps['expo']) markers.push('Expo (React Native) 📱');
    else if (deps['react-native']) markers.push('React Native 📱');
    else if (deps['react']) markers.push('React');
    else if (deps['vue']) markers.push('Vue');
    if (deps['express']) markers.push('Express');
    if (deps['fastify']) markers.push('Fastify');
    if (deps['@cucumber/cucumber']) markers.push('Cucumber.js ✅');
    if (deps['cypress']) markers.push('Cypress ✅');
    if (deps['detox']) markers.push('Detox ✅');
  }
  if (existsSync('requirements.txt') || existsSync('pyproject.toml')) markers.push('Python');
  if (existsSync('go.mod')) markers.push('Go');
  if (existsSync('pom.xml') || existsSync('build.gradle')) markers.push('Java');
  return markers;
}

function detectTestingStack() {
  const parts = [];
  if (existsSync('package.json')) {
    try {
      const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (deps['vitest']) parts.push('Unit: Vitest');
      else if (deps['jest']) parts.push('Unit: Jest');
      if (deps['@cucumber/cucumber']) parts.push('BDD: Cucumber.js');
      if (deps['cypress']) parts.push('E2E: Cypress');
      else if (deps['playwright']) parts.push('E2E: Playwright');
      if (deps['detox']) parts.push('Mobile E2E: Detox');
      if (deps['k6']) parts.push('Load: k6');
    } catch { /* ignore */ }
  }
  if (existsSync('pyproject.toml') || existsSync('requirements.txt')) parts.push('Unit: pytest');
  if (existsSync('go.mod')) parts.push('Unit: go test');
  if (existsSync('Gemfile')) parts.push('Unit: RSpec');
  return parts.length > 0 ? parts.join(' | ') : 'Not yet configured';
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
  const testingStack = detectTestingStack();
  const archPattern = getArchPattern();

  const archRuleByPattern = {
    hexagonal: 'RULE-ARCH-001: Domain layer — zero external dependencies',
    'mvc-rails': 'RULE-ARCH-001: Business logic in services/, controllers stay thin',
    'mvc-express': 'RULE-ARCH-001: Business logic in services/, controllers stay thin',
    'nextjs-app-router': "RULE-ARCH-001: Server logic in lib/, push 'use client' as deep as possible",
    'feature-based': 'RULE-ARCH-001: Features are self-contained — no cross-feature imports',
  };
  const archRule = archRuleByPattern[archPattern] ?? 'RULE-ARCH-001: Respect architecture layers';

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
    `- RULE-EFF-001 [AUTO]: \`rtk <cmd>\` for ALL CLI ops (60-90% token savings)`,
    `- RULE-DOCKER-001 [AUTO]: All services in Docker — \`rtk docker compose up -d\``,
    `- RULE-GIT-002 [AUTO]: Conventional Commits — feat|fix|test|refactor|chore|perf(scope): desc`,
    `- RULE-GIT-001: Worktrees for parallel features — \`rtk git worktree add ../[proj]-[feat] -b feature/[feat]\``,
    `- ${archRule}`,
    `- RULE-TEST-001: Tests BEFORE implementation (TDD) — RED → GREEN → REFACTOR`,
    `- RULE-TEST-002: BDD Gherkin scenarios before code`,
    `- RULE-AGENT-001: Max 5 parallel agents | RULE-AGENT-002: 1 granular activity per agent`,
    ``,
    `## Main Flow`,
    `  /build → (auto-detects vague idea → calls /ideate if needed) → research → plan → implement → /deploy`,
    ``,
    `## Skills`,
    `### Start here`,
    `- /build           → Entry point for everything. Vague idea? Calls /ideate automatically. Clear spec? Goes straight to build.`,
    `- /deploy          → Production deploy: Docker, IaC, secrets, post-deploy validation`,
    ``,
    `### Feature development`,
    `- /feature-dev     → TDD + hexagonal impl, 7 phases`,
    `- /auth            → Auth complete: JWT+refresh, OAuth, RBAC, magic link (stack-aware)`,
    `- /ui              → Full UI pipeline: research → TDD → frontend-design → a11y → browser-qa`,
    `- /mobile          → React Native + Expo: scaffold, TDD (RNTL), Detox E2E, EAS Build`,
    ``,
    `### Quality & review`,
    `- /qa-loop         → QA gates: design, UX, backend, security, E2E + auto fix loop`,
    `- /browser-qa      → Cypress + agent-browser dual loop until 0 failures`,
    `- /code-review     → Architecture + TDD + security review`,
    `- /simplify        → Refactor for reuse + SOLID`,
    `- /perf-audit      → Bundle analysis, N+1 detection, Core Web Vitals`,
    `- /security-hardening → OWASP Top 10, headers, secrets audit, dependency scanning`,
    ``,
    `### Infrastructure & ops`,
    `- /ci-cd           → CI/CD pipeline: GitHub Actions, GitLab CI, quality gates`,
    `- /observability   → Structured logging + OpenTelemetry → Grafana stack`,
    `- /data-migration  → Zero-downtime migrations, CQRS, state machines`,
    ``,
    `### Planning & docs`,
    `- /research        → Parallel research wave → RESEARCH.md`,
    `- /plan            → BDD + arch mapping + test plan`,
    `- /docs-gen        → OpenAPI, C4 diagrams, CHANGELOG, developer runbook`,
    `- /adr             → Architecture Decision Records`,
    ``,
    `### Utilities`,
    `- /agent-teams     → Multi-team parallel orchestration`,
    `- /adapt           → Auto-configure for existing project`,
    `- /resume          → Resume from checkpoint`,
    ``,
    `## Testing Stack`,
    testingStack,
    ``,
    `## Context Budget`,
    `Threshold: 60k tokens → write .claude/checkpoint.md → /compact → /resume`,
    ``,
    `See CLAUDE.md, Rules.md, Agents.md for full documentation.`,
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
