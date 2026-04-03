#!/usr/bin/env node
/**
 * docker-guard.mjs — Docker Runtime Check [AUTO RULE-DOCKER-001]
 *
 * Triggered: SessionStart
 * Checks: docker-compose.yml exists + Docker daemon is running
 * Advisory only — adds warning context, does not hard block.
 */

import { existsSync, readFileSync } from 'fs';
import { execSync } from 'child_process';

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

function dockerRunning() {
  try {
    execSync('docker info', { stdio: 'pipe', timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

function composeFileExists() {
  return existsSync('docker-compose.yml') || existsSync('docker-compose.yaml') || existsSync('compose.yml');
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

  const lines = [];
  const hasCompose = composeFileExists();
  const isRunning = dockerRunning();

  if (!isRunning) {
    lines.push('');
    lines.push('⚠️  DOCKER NOT RUNNING — [RULE-DOCKER-001]');
    lines.push('All services must run in Docker containers.');
    lines.push('Start Docker Desktop or run: sudo systemctl start docker');
    if (!hasCompose) {
      lines.push('');
      lines.push('⚠️  docker-compose.yml not found at project root.');
      lines.push('Run /build to generate the full Docker setup for this project.');
    }
  } else if (hasCompose) {
    lines.push('');
    lines.push('🐳 Docker running. Services via docker-compose.');
    lines.push('  Start: rtk docker compose up -d');
    lines.push('  Stop:  rtk docker compose down');
    lines.push('  Logs:  rtk docker compose logs -f');
  }

  if (lines.length === 0) {
    process.stdout.write(JSON.stringify(input));
    return;
  }

  const output = {
    ...input,
    additionalContext: (input.additionalContext || '') + lines.join('\n'),
  };

  process.stdout.write(JSON.stringify(output));
}

main().catch((err) => {
  process.stderr.write(`[docker-guard] Hook error: ${err.message}\n`);
  process.exit(0);
});
