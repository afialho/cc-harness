#!/usr/bin/env node

import { spawn, execSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const KIT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// --- Output ---
const G = '\x1b[32m', Y = '\x1b[33m', R = '\x1b[31m', B = '\x1b[1m', N = '\x1b[0m';
const ok   = function(m) { console.log(G + '✅  ' + m + N); };
const warn = function(m) { console.log(Y + '⚠️   ' + m + N); };
const fail = function(m) { console.error(R + '❌  ' + m + N); process.exit(1); };

// --- Help / Version ---
const arg = process.argv[2];
if (arg === '--help' || arg === '-h') {
  console.log([
    '',
    B + 'cc-harness' + N + ' — AI development harness for Claude Code',
    '',
    B + 'Usage:' + N,
    '  npx cc-harness [project-name]',
    '',
    B + 'Modes (auto-detected):' + N,
    '  init      Empty dir or project-name given → new project',
    '  adopt     Existing project without harness → install harness',
    '  update    Project with harness → update to latest',
    '',
    B + 'Examples:' + N,
    '  npx cc-harness my-app     Create new project',
    '  npx cc-harness            Auto-detect in current dir',
    '',
  ].join('\n'));
  process.exit(0);
}
if (arg === '--version' || arg === '-v') {
  console.log(JSON.parse(readFileSync(join(KIT, 'package.json'), 'utf8')).version);
  process.exit(0);
}

// --- Detect mode ---
let target, mode;

if (arg && !arg.startsWith('-')) {
  target = resolve(process.cwd(), arg);
  mode = 'init';
} else {
  target = process.cwd();
  if (existsSync(join(target, '.claude/skills/build/SKILL.md'))) {
    mode = 'update';
  } else {
    const markers = ['package.json', 'pyproject.toml', 'go.mod', 'Gemfile', 'pom.xml', 'Cargo.toml'];
    const dirs = ['src', 'app', 'lib'];
    const hasProject = markers.some(function(m) { return existsSync(join(target, m)); })
                    || dirs.some(function(d) { return existsSync(join(target, d)); });
    mode = hasProject ? 'adopt' : 'init';
  }
}

// --- Banner ---
var modeLabels = { init: 'new project', adopt: 'adopting', update: 'upgrading' };
console.log('');
console.log(B + 'cc-harness' + N + ' — ' + modeLabels[mode]);
console.log('━'.repeat(45));
console.log('');

// --- Init: create directory ---
if (mode === 'init' && arg) {
  mkdirSync(target, { recursive: true });
  ok('Created ' + basename(target) + '/');
}

// --- File helpers ---
function copyDir(src, dest, overwrite) {
  if (!existsSync(src)) return;
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    var s = join(src, entry.name);
    var d = join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d, overwrite);
    else if (overwrite || !existsSync(d)) copyFileSync(s, d);
  }
}

function installMarkdown(filename) {
  var src = join(KIT, filename);
  var dest = join(target, filename);
  if (!existsSync(src)) return;

  if (mode === 'init' || !existsSync(dest)) {
    copyFileSync(src, dest);
    ok('Installed ' + filename);
    return;
  }

  // adopt/update: @reference pattern
  var kitName = filename.replace('.md', '.kit.md');
  var kitDest = join(target, '.claude', kitName);
  mkdirSync(dirname(kitDest), { recursive: true });
  copyFileSync(src, kitDest);

  var refLine = '@.claude/' + kitName;
  var content = readFileSync(dest, 'utf8');
  if (!content.includes(refLine)) {
    writeFileSync(dest, refLine + '\n' + content);
    ok('Merged ' + filename);
  } else {
    ok('Refreshed ' + filename);
  }
}

// --- Copy harness files ---
var overwrite = mode !== 'adopt';
mkdirSync(join(target, '.claude'), { recursive: true });

var skillsLabel = mode === 'update' ? 'Refreshed skills' : 'Installed skills';
copyDir(join(KIT, '.claude/skills'), join(target, '.claude/skills'), overwrite);
ok(skillsLabel);

var hooksLabel = mode === 'update' ? 'Refreshed hooks' : 'Installed hooks';
copyDir(join(KIT, '.claude/hooks'), join(target, '.claude/hooks'), overwrite);
ok(hooksLabel);

var archSrc = join(KIT, '.claude/architecture.json');
var archDest = join(target, '.claude/architecture.json');
if (overwrite || !existsSync(archDest)) {
  copyFileSync(archSrc, archDest);
  ok('Installed architecture.json');
}

installMarkdown('CLAUDE.md');
installMarkdown('Rules.md');
installMarkdown('Agents.md');

// Settings.json (always merge)
var kitSettingsPath = join(KIT, '.claude/settings.json');
var targetSettingsPath = join(target, '.claude/settings.json');
if (existsSync(kitSettingsPath)) {
  var kitSettings = JSON.parse(readFileSync(kitSettingsPath, 'utf8'));
  if (!existsSync(targetSettingsPath)) {
    writeFileSync(targetSettingsPath, JSON.stringify({ hooks: kitSettings.hooks }, null, 2) + '\n');
  } else {
    var existing = JSON.parse(readFileSync(targetSettingsPath, 'utf8'));
    existing.hooks = existing.hooks || {};
    for (var [event, handlers] of Object.entries(kitSettings.hooks || {})) {
      if (!existing.hooks[event]) existing.hooks[event] = handlers;
    }
    writeFileSync(targetSettingsPath, JSON.stringify(existing, null, 2) + '\n');
  }
  ok('Configured settings.json');
}

// Docs
copyDir(join(KIT, 'docs'), join(target, 'docs'), overwrite);

// .gitignore (init only)
if (mode === 'init' && !existsSync(join(target, '.gitignore'))) {
  writeFileSync(join(target, '.gitignore'),
    'node_modules/\ndist/\n.env\n.env.local\n*.log\n.DS_Store\ncoverage/\n.next/\n');
  ok('Created .gitignore');
}

// --- Git init (new projects only) ---
if (mode === 'init' && !existsSync(join(target, '.git'))) {
  try {
    execSync('git init -q && git add . && git commit -qm "chore: init from cc-harness"',
      { cwd: target, stdio: 'pipe' });
    ok('Git initialized');
  } catch { warn('Git init skipped'); }
}

// --- Make hooks executable ---
var hooksDir = join(target, '.claude/hooks');
if (existsSync(hooksDir)) {
  try { execSync('chmod +x "' + hooksDir + '"/*.mjs 2>/dev/null || true', { stdio: 'pipe' }); }
  catch { /* ok */ }
}

// --- Summary ---
console.log('');
console.log('━'.repeat(45));
var doneLabels = { init: 'initialized', adopt: 'adopted', update: 'refreshed' };
ok('cc-harness ' + doneLabels[mode] + '!');
console.log('');

// --- Check claude CLI ---
try {
  execSync('which claude', { stdio: 'pipe' });
} catch {
  fail('Claude Code CLI not found.\n    Install: npm i -g @anthropic-ai/claude-code');
}

// --- Ensure agent-browser CLI ---
try {
  execSync('which agent-browser', { stdio: 'pipe' });
  ok('agent-browser CLI available');
} catch {
  console.log('  Installing agent-browser CLI...');
  try {
    execSync('npm install -g agent-browser', { stdio: 'pipe', timeout: 60000 });
    execSync('agent-browser install', { stdio: 'pipe', timeout: 120000 });
    ok('agent-browser CLI installed');
  } catch {
    warn('Could not auto-install agent-browser CLI');
    console.log('  Install manually: npm install -g agent-browser && agent-browser install');
  }
}

// --- Launch claude (YOLO mode — auto-accept all permissions) ---
var claudeArgs = ['--dangerously-skip-permissions'];
if (mode !== 'init') claudeArgs.push('/adapt');

var skill = mode !== 'init' ? ' → /adapt' : '';
console.log('Launching Claude Code (YOLO mode)' + skill + '...');
if (mode === 'init') console.log('  Type ' + B + '/build <your idea>' + N + ' to start');
console.log('');

var child = spawn('claude', claudeArgs, { cwd: target, stdio: 'inherit', shell: true });
child.on('close', function(code) { process.exit(code ?? 0); });
child.on('error', function() {
  warn('Could not launch Claude Code');
  console.log('  cd ' + target);
  console.log('  claude --dangerously-skip-permissions');
  if (mode !== 'init') console.log('  /adapt');
  process.exit(1);
});
