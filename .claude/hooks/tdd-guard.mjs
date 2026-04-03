#!/usr/bin/env node
/**
 * tdd-guard.mjs — TDD Enforcement Hook
 *
 * Enforces RULE-TEST-001: implementation files must have corresponding test files.
 * Triggered: PostToolUse / Write
 *
 * Behavior:
 *   - After a source file is written, checks if a test file exists
 *   - If no test file found, adds additionalContext with TDD reminder
 *   - Maps implementation paths to expected test paths via .claude/architecture.json
 */

import { existsSync, readFileSync } from 'fs';
import { resolve, dirname, basename } from 'path';

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

function loadArchConfig() {
  const configPath = resolve('.claude/architecture.json');
  if (!existsSync(configPath)) return null;
  try {
    return JSON.parse(readFileSync(configPath, 'utf8'));
  } catch {
    return null;
  }
}

function isImplementationFile(filePath, config) {
  const implExts = config?.implementationExtensions || ['.ts', '.js', '.go', '.py', '.java', '.rb'];
  const testExts = config?.testExtensions || ['.test.ts', '.test.js', '.spec.ts', '.spec.js'];
  const ignorePaths = config?.ignorePaths || ['node_modules/', 'dist/', 'build/', '.git/'];

  // Skip test files themselves
  if (testExts.some(ext => filePath.endsWith(ext))) return false;
  // Skip ignored paths
  if (ignorePaths.some(p => filePath.includes(p))) return false;
  // Must be in src/ and have an impl extension
  return filePath.includes('src/') && implExts.some(ext => filePath.endsWith(ext));
}

function findExpectedTestPaths(filePath, config) {
  const testExts = config?.testExtensions || ['.test.ts', '.test.js', '.spec.ts', '.spec.js'];
  const testMapping = config?.testMapping || {};

  const candidates = [];

  // Check test mapping from architecture.json
  for (const [srcDir, testDir] of Object.entries(testMapping)) {
    if (filePath.includes(srcDir)) {
      const fileName = basename(filePath).replace(/\.(ts|js|go|py|java|rb)$/, '');
      const relPath = filePath.substring(filePath.indexOf(srcDir) + srcDir.length);
      const relDir = dirname(relPath);

      for (const ext of testExts) {
        const testPath = resolve(`${testDir}${relDir !== '.' ? relDir + '/' : ''}${fileName}${ext}`);
        candidates.push(testPath);
      }
      break;
    }
  }

  // Also check co-located tests (same directory as implementation)
  const fileBase = filePath.replace(/\.(ts|js|go|py|java|rb)$/, '');
  for (const ext of testExts) {
    candidates.push(resolve(`${fileBase}${ext}`));
  }

  return candidates;
}

async function main() {
  const raw = await readStdin();
  let input;

  try {
    input = JSON.parse(raw);
  } catch {
    process.stdout.write(raw);
    return;
  }

  if (input.tool_name !== 'Write') {
    process.stdout.write(JSON.stringify(input));
    return;
  }

  const filePath = (input.tool_input?.file_path || '').replace(/\\/g, '/');
  if (!filePath) {
    process.stdout.write(JSON.stringify(input));
    return;
  }

  const config = loadArchConfig();

  if (!isImplementationFile(filePath, config)) {
    process.stdout.write(JSON.stringify(input));
    return;
  }

  const expectedTestPaths = findExpectedTestPaths(filePath, config);
  const existingTest = expectedTestPaths.find(p => existsSync(p));

  if (existingTest) {
    // Test exists — all good, no context needed
    process.stdout.write(JSON.stringify(input));
    return;
  }

  const suggestedPath = expectedTestPaths[0] || `tests/unit/${basename(filePath).replace(/\.(ts|js)$/, '.test.ts')}`;

  const context = [
    `🔴 TDD GUARD — RULE-TEST-001`,
    ``,
    `Implementation file written: ${filePath}`,
    `No corresponding test file found.`,
    ``,
    `Expected test at (one of):`,
    ...expectedTestPaths.slice(0, 3).map(p => `  ${p}`),
    ``,
    `Next step: write the failing test (RED phase) before continuing.`,
    `Follow TDD: RED → GREEN → REFACTOR.`,
    ``,
    `If the test file should exist elsewhere, update testMapping in .claude/architecture.json.`,
  ].join('\n');

  const output = {
    ...input,
    additionalContext: context,
  };

  process.stdout.write(JSON.stringify(output));
}

main().catch((err) => {
  process.stderr.write(`[tdd-guard] Hook error: ${err.message}\n`);
  process.exit(0);
});
