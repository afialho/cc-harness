#!/usr/bin/env bash
# setup.sh — Starter Kit Setup Script
# Run once when starting a new project from this template.

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

ok()   { echo -e "${GREEN}✅  $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️   $1${NC}"; }
fail() { echo -e "${RED}❌  $1${NC}"; }
info() { echo -e "    $1"; }

echo ""
echo "🚀  AI Development Starter Kit — Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── 1. Node.js ────────────────────────────────────────────────────────────────
if command -v node &>/dev/null; then
  NODE_VERSION=$(node --version | tr -d 'v')
  MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
  if [ "$MAJOR" -ge 18 ]; then
    ok "Node.js $NODE_VERSION"
  else
    warn "Node.js $NODE_VERSION found — v18+ recommended"
    info "Upgrade: https://nodejs.org or use nvm"
  fi
else
  fail "Node.js not found"
  info "Install: https://nodejs.org"
  info "Or: brew install node"
fi

# ── 2. Git (with worktree support) ───────────────────────────────────────────
if command -v git &>/dev/null; then
  GIT_VERSION=$(git --version | awk '{print $3}')
  GIT_MAJOR=$(echo "$GIT_VERSION" | cut -d. -f1)
  GIT_MINOR=$(echo "$GIT_VERSION" | cut -d. -f2)
  if [ "$GIT_MAJOR" -gt 2 ] || ([ "$GIT_MAJOR" -eq 2 ] && [ "$GIT_MINOR" -ge 5 ]); then
    ok "Git $GIT_VERSION (worktrees supported)"
  else
    warn "Git $GIT_VERSION — v2.5+ required for worktrees"
    info "Upgrade: brew install git"
  fi
else
  fail "Git not found"
  info "Install: brew install git"
fi

# ── 3. RTK CLI ───────────────────────────────────────────────────────────────
if command -v rtk &>/dev/null; then
  RTK_VERSION=$(rtk --version 2>/dev/null || echo "unknown")
  ok "RTK CLI $RTK_VERSION (token-efficient command proxy)"
else
  warn "RTK CLI not installed (RULE-EFF-001)"
  info "Install: npm install -g rtk"
  info "RTK provides 60-90% token savings on CLI operations"
  info "After install, all CLI commands auto-use RTK via hooks"
fi

# ── 4. k6 (load testing) ─────────────────────────────────────────────────────
if command -v k6 &>/dev/null; then
  K6_VERSION=$(k6 version | awk '{print $3}')
  ok "k6 $K6_VERSION (load & stress testing)"
else
  warn "k6 not installed — needed for load tests (docs/TESTING.md)"
  info "macOS:  brew install k6"
  info "Linux:  sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \\"
  info "            --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69"
  info "        echo 'deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main' \\"
  info "            | sudo tee /etc/apt/sources.list.d/k6.list"
  info "        sudo apt-get update && sudo apt-get install k6"
  info "Docker: docker pull grafana/k6"
fi

# ── 5. npm install ───────────────────────────────────────────────────────────
if [ -f "package.json" ]; then
  echo ""
  echo "📦  Installing dependencies..."
  npm install
  ok "npm install complete"
else
  warn "package.json not found — skipping npm install"
fi

# ── 6. Cypress (E2E testing) ─────────────────────────────────────────────────
if [ -f "package.json" ] && grep -q '"cypress"' package.json 2>/dev/null; then
  ok "Cypress included in package.json"
fi

# ── 7. Cucumber.js (BDD) ─────────────────────────────────────────────────────
if [ -f "package.json" ] && grep -q '"@cucumber/cucumber"' package.json 2>/dev/null; then
  ok "Cucumber.js included in package.json"
fi

# ── 7. Claude Code hooks (Node.js modules) ───────────────────────────────────
echo ""
echo "🔧  Checking hooks..."

HOOKS_DIR=".claude/hooks"
if [ -d "$HOOKS_DIR" ]; then
  HOOK_COUNT=$(ls "$HOOKS_DIR"/*.mjs 2>/dev/null | wc -l | tr -d ' ')
  ok "$HOOK_COUNT hooks found in $HOOKS_DIR"
  for hook in "$HOOKS_DIR"/*.mjs; do
    chmod +x "$hook" 2>/dev/null || true
    info "$(basename "$hook")"
  done
else
  fail "Hooks directory not found: $HOOKS_DIR"
fi

# ── 8. Make hooks executable ─────────────────────────────────────────────────
if [ -d "$HOOKS_DIR" ]; then
  chmod +x "$HOOKS_DIR"/*.mjs 2>/dev/null || true
fi

# ── 9. Summary ───────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Setup complete. Next steps:"
echo ""
echo "  1. Replace [Project Name] in CLAUDE.md with your project name"
echo "  2. Update .claude/architecture.json if your src/ structure differs"
echo "  3. Open Claude Code: claude"
echo ""
echo "Available skills in Claude Code:"
echo "  /build           → Full lifecycle: idea → plan → parallel agents → done"
echo "  /plan            → Generate structured development plan"
echo "  /feature-dev     → Implement with full TDD + hexagonal workflow"
echo "  /frontend-design → Design and implement production-grade UI"
echo "  /tdd             → TDD workflow: red → green → refactor"
echo "  /hexagonal       → Hexagonal architecture reference"
echo "  /agent-teams     → Multi-team parallel orchestration"
echo ""
echo "Documentation:"
echo "  docs/ARCHITECTURE.md  → Hexagonal architecture guide"
echo "  docs/TESTING.md       → Full testing strategy"
echo "  docs/BDD.md           → Cucumber.js BDD guide"
echo "  docs/WORKTREES.md     → Git worktrees for parallel work"
echo ""
