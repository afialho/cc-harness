#!/usr/bin/env node
/**
 * qa-gate.mjs — QA Gate Enforcement [AUTO]
 *
 * Triggered: PreToolUse / Bash
 *
 * On every git commit in feature/* branches:
 *   Gate 1: Runs full Cypress E2E suite → hard blocks if ANY spec fails
 *
 * On final build commit (message contains "chore(build)"):
 *   Gate 2: Runs agent-browser crawl → visits all routes, clicks all elements,
 *           checks for JS errors, console errors, 4xx/5xx, stubs → hard blocks
 *   Gate 3: Validates .claude/browser-qa-report.md has 0 BLOCKER/MAJOR/MINOR
 *
 * Skips when:
 *   - Not a git commit command
 *   - Not on a feature/* branch
 *   - No Cypress specs exist in tests/e2e/
 *   - Cypress not installed in node_modules
 */

import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';

async function readStdin() {
  var chunks = [];
  for await (var chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

function getBranch() {
  try {
    return execSync('git branch --show-current', { stdio: 'pipe', timeout: 3000 }).toString().trim();
  } catch { return ''; }
}

function hasCypressSpecs() {
  var e2eDir = 'tests/e2e';
  if (!existsSync(e2eDir)) return false;
  try {
    return readdirSync(e2eDir).some(function(f) {
      return f.endsWith('.cy.ts') || f.endsWith('.cy.js');
    });
  } catch { return false; }
}

function cypressInstalled() {
  return existsSync('node_modules/.bin/cypress');
}

function agentBrowserInstalled() {
  try {
    execSync('which agent-browser', { stdio: 'pipe', timeout: 3000 });
    return true;
  } catch { return false; }
}

function detectAppPort() {
  // Check docker-compose for port mappings
  var composeFiles = ['docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml'];
  for (var f of composeFiles) {
    if (existsSync(f)) {
      var content = readFileSync(f, 'utf8');
      var portMatch = content.match(/(\d+):(?:3000|8080|8000|4000|5000)/);
      if (portMatch) return portMatch[1];
    }
  }
  // Check package.json for dev port
  if (existsSync('package.json')) {
    try {
      var pkg = JSON.parse(readFileSync('package.json', 'utf8'));
      var devScript = (pkg.scripts || {}).dev || '';
      var portMatch2 = devScript.match(/(?:--port|PORT[= ])(\d+)/i);
      if (portMatch2) return portMatch2[1];
    } catch { /* ignore */ }
  }
  return '3000';
}

function ab(cmd) {
  try {
    var out = execSync('agent-browser ' + cmd + ' --json', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 30000,
    });
    try { return JSON.parse(out); } catch { return { success: true, data: out }; }
  } catch (err) {
    var text = String(err.stdout || '') + String(err.stderr || '');
    try { return JSON.parse(text); } catch { return { success: false, error: text.substring(0, 500) }; }
  }
}

function abClose() {
  try { execSync('agent-browser close', { stdio: 'pipe', timeout: 5000 }); } catch { /* ok */ }
}

function runCypress() {
  try {
    execSync('npx cypress run', {
      stdio: 'pipe',
      timeout: 300000,
      env: Object.assign({}, process.env, { CI: '1' }),
    });
    return { pass: true, summary: '' };
  } catch (err) {
    var text = String(err.stdout || '') + '\n' + String(err.stderr || '');
    var lines = text.split('\n');
    var failures = lines.filter(function(l) {
      return /failing|failed|✗|✖|AssertionError|Error:|expected/i.test(l);
    }).slice(0, 20);
    return { pass: false, summary: failures.join('\n') || text.substring(0, 2000) };
  }
}

// ── Agent-browser crawl ──────────────────────────────────────────────────────

var STUB_PATTERNS = /coming soon|em breve|under construction|lorem ipsum|placeholder|TODO/i;

function runAgentBrowserCrawl(baseUrl) {
  var issues = [];
  var visited = new Set();
  var queue = [baseUrl];
  var pagesChecked = 0;
  var elementsChecked = 0;

  // Open browser
  ab('open ' + baseUrl);
  ab('wait --load networkidle');

  while (queue.length > 0 && visited.size < 50) {
    var url = queue.shift();
    var normalized = url.replace(/\/$/, '');
    if (visited.has(normalized)) continue;
    visited.add(normalized);

    // Navigate
    ab('open ' + url);
    var waitResult = ab('wait --load networkidle');
    if (!waitResult.success) {
      issues.push({ url: url, severity: 'BLOCKER', type: 'navigation', detail: 'Page failed to load' });
      continue;
    }
    pagesChecked++;

    // Check page title for error indicators
    var titleResult = ab('get title');
    if (titleResult.success && titleResult.data) {
      var title = String(titleResult.data).toLowerCase();
      if (title.includes('404') || title.includes('not found') || title.includes('error')) {
        issues.push({ url: url, severity: 'BLOCKER', type: 'error-page', detail: 'Error page: ' + titleResult.data });
      }
    }

    // Check for JS errors
    var errorsResult = ab('errors');
    if (errorsResult.success && errorsResult.data) {
      var errs = Array.isArray(errorsResult.data) ? errorsResult.data : [];
      for (var e of errs) {
        issues.push({ url: url, severity: 'BLOCKER', type: 'js-error', detail: String(e.message || e).substring(0, 200) });
      }
    }

    // Check console for errors/warnings
    var consoleResult = ab('console');
    if (consoleResult.success && consoleResult.data) {
      var msgs = Array.isArray(consoleResult.data) ? consoleResult.data : [];
      for (var m of msgs) {
        if (m.type === 'error') {
          issues.push({ url: url, severity: 'MAJOR', type: 'console-error', detail: String(m.text || m.message || '').substring(0, 200) });
        }
      }
    }

    // Clear errors/console for next page
    ab('errors --clear');
    ab('console --clear');

    // Get interactive elements via snapshot
    var snapshot = ab('snapshot -i');
    if (snapshot.success && snapshot.data) {
      var refs = (snapshot.data && snapshot.data.refs) || {};
      var refKeys = Object.keys(refs);
      elementsChecked += refKeys.length;

      // Check for stub/placeholder text in page content
      var textContent = String(snapshot.data.snapshot || snapshot.data || '');
      if (STUB_PATTERNS.test(textContent)) {
        issues.push({ url: url, severity: 'BLOCKER', type: 'stub', detail: 'Stub/placeholder text detected on page' });
      }

      // Click interactive elements (buttons, links) and check for dead clicks
      for (var key of refKeys) {
        var el = refs[key];
        var role = String(el.role || '');
        if (role !== 'button' && role !== 'link' && role !== 'menuitem' && role !== 'tab') continue;

        var clickResult = ab('click ' + key);
        if (clickResult.success) {
          // Check if click produced JS errors
          var postClickErrors = ab('errors');
          if (postClickErrors.success && postClickErrors.data) {
            var clickErrs = Array.isArray(postClickErrors.data) ? postClickErrors.data : [];
            for (var ce of clickErrs) {
              issues.push({ url: url, severity: 'BLOCKER', type: 'click-error', detail: role + ' ' + key + ' caused JS error: ' + String(ce.message || ce).substring(0, 200) });
            }
          }
          ab('errors --clear');
        }

        // Navigate back if we left the page
        ab('open ' + url);
        ab('wait --load networkidle');
      }
    }

    // Extract links for crawling (same origin only)
    var origin = new URL(baseUrl).origin;
    var linksCmd = 'eval "JSON.stringify([...document.querySelectorAll(' + "'a[href]'" + ')].map(a=>a.href).filter(h=>h.startsWith(' + "'" + origin + "'" + ')))"';
    var linksResult = ab(linksCmd);
    if (linksResult.success && linksResult.data) {
      try {
        var links = typeof linksResult.data === 'string' ? JSON.parse(linksResult.data) : linksResult.data;
        if (Array.isArray(links)) {
          for (var link of links) {
            var norm = link.replace(/\/$/, '');
            if (!visited.has(norm)) queue.push(link);
          }
        }
      } catch { /* ignore parse errors */ }
    }
  }

  abClose();

  return { issues: issues, pages: pagesChecked, elements: elementsChecked };
}

function generateReport(crawlResult) {
  var issues = crawlResult.issues;
  var blockers = issues.filter(function(i) { return i.severity === 'BLOCKER'; });
  var majors = issues.filter(function(i) { return i.severity === 'MAJOR'; });
  var minors = issues.filter(function(i) { return i.severity === 'MINOR'; });

  var status = (blockers.length === 0 && majors.length === 0 && minors.length === 0) ? 'PASS' : 'FAIL';
  var now = new Date().toISOString().replace('T', ' ').substring(0, 19);

  var lines = [
    'BROWSER QA REPORT — ' + now,
    'Pages crawled: ' + crawlResult.pages + ' | Elements checked: ' + crawlResult.elements,
    'Status: ' + status,
    '',
    'BLOCKERS(' + blockers.length + '):',
  ];
  for (var b of blockers) lines.push('  ' + b.url + ' | ' + b.type + ' | ' + b.detail);
  lines.push('');
  lines.push('MAJORS(' + majors.length + '):');
  for (var mj of majors) lines.push('  ' + mj.url + ' | ' + mj.type + ' | ' + mj.detail);
  lines.push('');
  lines.push('MINORS(' + minors.length + '):');
  for (var mn of minors) lines.push('  ' + mn.url + ' | ' + mn.type + ' | ' + mn.detail);
  lines.push('');

  return lines.join('\n');
}

function checkBrowserQaReport() {
  var path = '.claude/browser-qa-report.md';
  if (!existsSync(path)) {
    return {
      pass: false,
      reason: 'Browser QA report not found at .claude/browser-qa-report.md',
    };
  }

  var content = readFileSync(path, 'utf8');
  var blockerMatch = content.match(/BLOCKER[Ss]?\s*[\(:]\s*(\d+)/i);
  var majorMatch = content.match(/MAJOR[Ss]?\s*[\(:]\s*(\d+)/i);
  var minorMatch = content.match(/MINOR[Ss]?\s*[\(:]\s*(\d+)/i);

  var blockers = blockerMatch ? parseInt(blockerMatch[1]) : -1;
  var majors = majorMatch ? parseInt(majorMatch[1]) : -1;
  var minors = minorMatch ? parseInt(minorMatch[1]) : -1;

  if (blockers < 0 || majors < 0 || minors < 0) {
    return {
      pass: false,
      reason: 'Browser QA report exists but BLOCKER/MAJOR/MINOR counts not found.\n'
            + 'Re-run /browser-qa to generate a valid report.',
    };
  }

  if (blockers > 0 || majors > 0 || minors > 0) {
    return {
      pass: false,
      reason: 'Browser QA report: ' + blockers + ' BLOCKER(s), ' + majors + ' MAJOR(s), ' + minors + ' MINOR(s).\n'
            + 'Fix ALL issues and re-run until 0 BLOCKER, 0 MAJOR, and 0 MINOR.',
    };
  }

  return { pass: true };
}

// ── Retry counter (persists between hook invocations) ─────────────────────────

var RETRY_FILE = '.claude/qa-gate-attempts.json';
var MAX_ATTEMPTS = 3;

function getAttempts() {
  if (!existsSync(RETRY_FILE)) return { count: 0, issues: [] };
  try { return JSON.parse(readFileSync(RETRY_FILE, 'utf8')); } catch { return { count: 0, issues: [] }; }
}

function saveAttempts(data) {
  mkdirSync('.claude', { recursive: true });
  writeFileSync(RETRY_FILE, JSON.stringify(data, null, 2));
}

function resetAttempts() {
  if (existsSync(RETRY_FILE)) {
    try { writeFileSync(RETRY_FILE, JSON.stringify({ count: 0, issues: [] })); } catch { /* ok */ }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  var raw = await readStdin();
  var input;
  try { input = JSON.parse(raw); } catch { process.stdout.write(raw || '{}'); return; }

  if (input.tool_name !== 'Bash') {
    process.stdout.write(JSON.stringify(input));
    return;
  }

  var command = input.tool_input?.command || '';

  // Only inspect git commit commands (with or without rtk prefix)
  if (!command.includes('git commit')) {
    process.stdout.write(JSON.stringify(input));
    return;
  }

  // Only enforce on feature branches
  var branch = getBranch();
  if (!branch.startsWith('feature/')) {
    process.stdout.write(JSON.stringify(input));
    return;
  }

  // Check Cypress status
  if (!hasCypressSpecs() || !cypressInstalled()) {
    // Warn if the project has UI files but no Cypress specs
    var hasUI = existsSync('src/pages') || existsSync('src/app') || existsSync('app')
      || existsSync('src/components') || existsSync('pages');
    if (hasUI && !hasCypressSpecs()) {
      process.stderr.write(
        '\n⚠️  [qa-gate] WARNING: UI files detected but no Cypress specs in tests/e2e/.\n'
        + '   E2E tests are critical for catching broken UI. Generate specs with /feature-dev or /qa-loop.\n\n'
      );
    }
    process.stdout.write(JSON.stringify(input));
    return;
  }

  // ── Gate 1: Cypress E2E (every commit) ──────────────────────────────────────
  var cypress = runCypress();
  if (!cypress.pass) {
    process.stderr.write([
      '',
      '⛔ QA-GATE [BLOCKED] — Cypress E2E tests failed. Commit rejected.',
      '',
      cypress.summary,
      '',
      'Fix the failing specs and retry the commit.',
      '',
    ].join('\n'));
    process.exit(2);
  }

  // ── Gates 2+3: Final build commit only ─────────────────────────────────────
  var isFinal = command.includes('chore(build)');

  if (isFinal) {
    var attempts = getAttempts();

    // ── Max attempts reached → escalate to user ──────────────────────────────
    if (attempts.count >= MAX_ATTEMPTS) {
      var history = attempts.issues.map(function(a) {
        return '  Attempt ' + a.attempt + ': BLOCKER(' + a.blockers + ') MAJOR(' + a.majors + ') MINOR(' + a.minors + ')';
      }).join('\n');

      process.stderr.write([
        '',
        '⛔ QA-GATE [ESCALATE] — 3 attempts exhausted. Human review required.',
        '',
        'Attempt history:',
        history,
        '',
        'Persistent issues: .claude/browser-qa-report.md',
        '',
        'Possible causes:',
        '  - Structural problem requiring component/API redesign',
        '  - Race condition or complex state management',
        '  - External service dependency not available in dev',
        '  - Ambiguous requirement needing human decision',
        '',
        'Action: review the report, fix manually, then reset with:',
        '  rm .claude/qa-gate-attempts.json',
        '',
      ].join('\n'));
      process.exit(2);
    }

    // ── Gate 2: agent-browser crawl (deterministic) ──────────────────────────
    if (agentBrowserInstalled()) {
      var port = detectAppPort();
      var baseUrl = 'http://localhost:' + port;
      var attemptNum = attempts.count + 1;

      process.stderr.write('\n[qa-gate] Running agent-browser crawl on ' + baseUrl + ' (attempt ' + attemptNum + '/' + MAX_ATTEMPTS + ')...\n');

      var crawlResult = runAgentBrowserCrawl(baseUrl);

      // Write report
      mkdirSync('.claude', { recursive: true });
      var report = generateReport(crawlResult);
      writeFileSync('.claude/browser-qa-report.md', report);

      process.stderr.write('[qa-gate] Crawl done: ' + crawlResult.pages + ' pages, ' + crawlResult.elements + ' elements\n');

      if (crawlResult.issues.length > 0) {
        var blockerCount = crawlResult.issues.filter(function(i) { return i.severity === 'BLOCKER'; }).length;
        var majorCount = crawlResult.issues.filter(function(i) { return i.severity === 'MAJOR'; }).length;
        var minorCount = crawlResult.issues.filter(function(i) { return i.severity === 'MINOR'; }).length;

        // Track attempt
        attempts.count = attemptNum;
        attempts.issues.push({ attempt: attemptNum, blockers: blockerCount, majors: majorCount, minors: minorCount });
        saveAttempts(attempts);

        var remaining = MAX_ATTEMPTS - attemptNum;

        process.stderr.write([
          '',
          '⛔ QA-GATE [BLOCKED] — agent-browser found issues (attempt ' + attemptNum + '/' + MAX_ATTEMPTS + '). Commit rejected.',
          '',
          '  BLOCKER: ' + blockerCount + ' | MAJOR: ' + majorCount + ' | MINOR: ' + minorCount,
          remaining > 0 ? '  Remaining attempts: ' + remaining : '  ⚠️  LAST ATTEMPT USED — next commit will escalate to human review.',
          '',
          '  Report: .claude/browser-qa-report.md',
          '  Fix all issues and retry the commit.',
          '',
        ].join('\n'));
        process.exit(2);
      }
    } else {
      process.stderr.write('\n[qa-gate] agent-browser CLI not found — skipping crawl, checking report...\n');
    }

    // ── Gate 3: Validate browser QA report ───────────────────────────────────
    var reportCheck = checkBrowserQaReport();
    if (!reportCheck.pass) {
      process.stderr.write([
        '',
        '⛔ QA-GATE [BLOCKED] — Browser QA report validation failed.',
        '',
        reportCheck.reason,
        '',
        'All issues must be 0 before the final commit.',
        '',
      ].join('\n'));
      process.exit(2);
    }

    // All gates passed — reset counter for next feature
    resetAttempts();
  }

  // All gates passed
  process.stdout.write(JSON.stringify(input));
}

main().catch(function(err) {
  process.stderr.write('[qa-gate] Hook error: ' + err.message + '\n');
  process.exit(0);
});
