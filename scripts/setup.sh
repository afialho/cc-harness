#!/usr/bin/env bash
# setup.sh — CC Starter Kit Setup Script
# Installs all required tools, plugins and dependencies.
# Run once when starting a new project from this template.

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

ok()      { echo -e "${GREEN}✅  $1${NC}"; }
warn()    { echo -e "${YELLOW}⚠️   $1${NC}"; }
fail()    { echo -e "${RED}❌  $1${NC}"; }
info()    { echo -e "    $1"; }
section() { echo -e "\n${BOLD}$1${NC}"; }

ERRORS=()
track_error() { ERRORS+=("$1"); }

echo ""
echo "🚀  CC Starter Kit — Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── Detect OS ────────────────────────────────────────────────────────────────
OS="unknown"
if [[ "$OSTYPE" == "darwin"* ]]; then
  OS="macos"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  OS="linux"
fi

# ── 1. Node.js ────────────────────────────────────────────────────────────────
section "1/10  Node.js"
if command -v node &>/dev/null; then
  NODE_VERSION=$(node --version | tr -d 'v')
  MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
  if [ "$MAJOR" -ge 18 ]; then
    ok "Node.js $NODE_VERSION"
  else
    warn "Node.js $NODE_VERSION found — v18+ required"
    info "Upgrade: https://nodejs.org or: nvm install 20 && nvm use 20"
    track_error "Node.js v18+ required (found $NODE_VERSION)"
  fi
else
  fail "Node.js not found — required"
  info "Install: https://nodejs.org  or  brew install node"
  track_error "Node.js not installed"
fi

# ── 2. Git ────────────────────────────────────────────────────────────────────
section "2/10  Git"
if command -v git &>/dev/null; then
  GIT_VERSION=$(git --version | awk '{print $3}')
  GIT_MAJOR=$(echo "$GIT_VERSION" | cut -d. -f1)
  GIT_MINOR=$(echo "$GIT_VERSION" | cut -d. -f2)
  if [ "$GIT_MAJOR" -gt 2 ] || ([ "$GIT_MAJOR" -eq 2 ] && [ "$GIT_MINOR" -ge 5 ]); then
    ok "Git $GIT_VERSION (worktrees supported)"
  else
    warn "Git $GIT_VERSION — v2.5+ required for git worktrees"
    info "Upgrade: brew install git"
    track_error "Git v2.5+ required (found $GIT_VERSION)"
  fi
else
  fail "Git not found — required"
  info "Install: brew install git"
  track_error "Git not installed"
fi

# ── 3. Claude Code CLI ────────────────────────────────────────────────────────
section "3/10  Claude Code CLI"
if command -v claude &>/dev/null; then
  CLAUDE_VERSION=$(claude --version 2>/dev/null || echo "unknown")
  ok "Claude Code CLI $CLAUDE_VERSION"
else
  echo "    Installing Claude Code CLI..."
  if npm install -g @anthropic-ai/claude-code 2>/dev/null; then
    ok "Claude Code CLI installed"
  else
    fail "Could not auto-install Claude Code CLI"
    info "Install manually: npm install -g @anthropic-ai/claude-code"
    track_error "Claude Code CLI not installed"
  fi
fi

# ── 4. RTK CLI ────────────────────────────────────────────────────────────────
section "4/10  RTK CLI (token-efficient proxy)"
if command -v rtk &>/dev/null; then
  RTK_VERSION=$(rtk --version 2>/dev/null || echo "unknown")
  ok "RTK CLI $RTK_VERSION — 60-90% token savings on all CLI ops"
else
  echo "    Installing RTK CLI..."
  if npm install -g rtk 2>/dev/null; then
    ok "RTK CLI installed"
    info "All bash commands are now auto-prefixed with rtk via hooks"
  else
    fail "Could not auto-install RTK CLI"
    info "Install manually: npm install -g rtk"
    track_error "RTK CLI not installed (RULE-EFF-001)"
  fi
fi

# ── 5. k6 (load testing) ──────────────────────────────────────────────────────
section "5/10  Docker"

if command -v docker &>/dev/null && docker info &>/dev/null 2>&1; then
  DOCKER_VERSION=$(docker --version | awk '{print $3}' | tr -d ',')
  ok "Docker $DOCKER_VERSION (running)"
elif command -v docker &>/dev/null; then
  warn "Docker installed but not running — start Docker Desktop"
  track_error "Docker daemon not running (RULE-DOCKER-001)"
else
  echo "    Installing Docker..."
  INSTALLED_DOCKER=false
  if [ "$OS" = "macos" ] && command -v brew &>/dev/null; then
    if brew install --cask docker 2>/dev/null; then
      ok "Docker Desktop installed — open it to start the daemon"
      INSTALLED_DOCKER=true
    fi
  elif [ "$OS" = "linux" ]; then
    if curl -fsSL https://get.docker.com | sh 2>/dev/null; then
      sudo usermod -aG docker "$USER" 2>/dev/null || true
      ok "Docker installed — logout/login for group permissions"
      INSTALLED_DOCKER=true
    fi
  fi
  if [ "$INSTALLED_DOCKER" = false ]; then
    warn "Could not auto-install Docker"
    info "macOS: brew install --cask docker  or  https://docker.com/get-started"
    info "Linux: curl -fsSL https://get.docker.com | sh"
    track_error "Docker not installed (RULE-DOCKER-001)"
  fi
fi

section "6/10  k6 (load & stress testing)"
if command -v k6 &>/dev/null; then
  K6_VERSION=$(k6 version 2>/dev/null | awk '{print $3}' || echo "unknown")
  ok "k6 $K6_VERSION"
else
  echo "    Installing k6..."
  INSTALLED_K6=false
  if [ "$OS" = "macos" ] && command -v brew &>/dev/null; then
    if brew install k6 2>/dev/null; then
      ok "k6 installed via Homebrew"
      INSTALLED_K6=true
    fi
  elif [ "$OS" = "linux" ] && command -v apt-get &>/dev/null; then
    if sudo gpg --no-default-keyring \
         --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
         --keyserver hkp://keyserver.ubuntu.com:80 \
         --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69 2>/dev/null \
       && echo 'deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main' \
         | sudo tee /etc/apt/sources.list.d/k6.list &>/dev/null \
       && sudo apt-get update -qq 2>/dev/null \
       && sudo apt-get install -y k6 2>/dev/null; then
      ok "k6 installed via apt"
      INSTALLED_K6=true
    fi
  fi
  if [ "$INSTALLED_K6" = false ]; then
    warn "Could not auto-install k6"
    info "macOS:  brew install k6"
    info "Linux:  https://k6.io/docs/get-started/installation/"
    info "Docker: docker pull grafana/k6"
    track_error "k6 not installed (load tests require it)"
  fi
fi

# ── 6. npm install (Cypress + Cucumber + Jest) ───────────────────────────────
section "7/10  npm dependencies (Cypress, Cucumber, Jest)"
if [ -f "package.json" ]; then
  echo "    Running npm install..."
  if npm install 2>/dev/null; then
    ok "npm install complete"
    [ -f "node_modules/.bin/cypress" ]   && ok "Cypress installed"
    [ -f "node_modules/.bin/cucumber-js" ] && ok "Cucumber.js installed"
    [ -f "node_modules/.bin/jest" ]       && ok "Jest installed"
  else
    fail "npm install failed"
    track_error "npm install failed"
  fi
else
  warn "package.json not found — skipping npm install"
fi

# ── 7. Claude Code hooks ──────────────────────────────────────────────────────
section "8/10  Claude Code hooks"
HOOKS_DIR=".claude/hooks"
if [ -d "$HOOKS_DIR" ]; then
  chmod +x "$HOOKS_DIR"/*.mjs 2>/dev/null || true
  HOOK_COUNT=$(ls "$HOOKS_DIR"/*.mjs 2>/dev/null | wc -l | tr -d ' ')
  ok "$HOOK_COUNT hooks configured and executable"
  for hook in "$HOOKS_DIR"/*.mjs; do
    info "$(basename "$hook")"
  done
else
  fail "Hooks directory not found: $HOOKS_DIR"
  track_error "Hooks not found — run from project root"
fi

# ── 8. Claude Code plugins ────────────────────────────────────────────────────
section "9/10  Claude Code plugins"
if command -v claude &>/dev/null; then

  install_plugin() {
    local name="$1"
    local pkg="$2"
    if claude plugin list 2>/dev/null | grep -q "$name"; then
      ok "Plugin $name already installed"
    else
      echo "    Installing plugin $name..."
      if claude plugin install "$pkg" 2>/dev/null; then
        ok "Plugin $name installed"
      else
        warn "Could not auto-install plugin $name"
        info "Install manually: claude plugin install $pkg"
        track_error "Plugin $name not installed"
      fi
    fi
  }

  # Official Claude Code plugins (project skills extend these)
  install_plugin "claude-code-setup" "claude-code-setup@claude-plugins-official"
  install_plugin "feature-dev"       "feature-dev@claude-plugins-official"
  install_plugin "frontend-design"   "frontend-design@claude-plugins-official"
  install_plugin "code-review"       "code-review@claude-plugins-official"
  install_plugin "code-simplifier"   "code-simplifier@claude-plugins-official"

  # vercel:agent-browser MCP (browser QA — required)
  if claude mcp list 2>/dev/null | grep -q "vercel"; then
    ok "vercel:agent-browser MCP already installed"
  else
    echo "    Installing vercel:agent-browser MCP..."
    if claude mcp add vercel npx -y @vercel/mcp-server 2>/dev/null; then
      ok "vercel:agent-browser MCP installed"
    else
      warn "Could not auto-install vercel:agent-browser"
      info "Install manually: claude mcp add vercel npx -y @vercel/mcp-server"
      track_error "vercel:agent-browser MCP not installed"
    fi
  fi

  # EAS CLI (React Native / Expo builds) — instalar se projeto Expo detectado
  if [ -f "package.json" ] && grep -qE '"expo"|"react-native"' package.json 2>/dev/null; then
    if command -v eas &>/dev/null; then
      ok "EAS CLI already installed (React Native project detected)"
    else
      echo "    React Native detected — installing EAS CLI..."
      if npm install -g eas-cli 2>/dev/null; then
        ok "EAS CLI installed"
      else
        warn "Could not auto-install EAS CLI"
        info "Install manually: npm install -g eas-cli"
        track_error "EAS CLI not installed"
      fi
    fi
  fi

else
  warn "claude CLI not found — skipping plugin installation"
  info "After installing Claude Code, re-run this script"
fi

# ── 9. Summary ────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ${#ERRORS[@]} -eq 0 ]; then
  echo -e "${GREEN}${BOLD}✅  Setup complete — all dependencies ready.${NC}"
else
  echo -e "${YELLOW}${BOLD}⚠️   Setup complete with warnings:${NC}"
  for err in "${ERRORS[@]}"; do
    echo -e "    ${RED}•${NC} $err"
  done
fi

echo ""
section "10/10  Git repository"
if [ -d ".git" ]; then
  REMOTE=$(git remote get-url origin 2>/dev/null || echo "")
  if [ -n "$REMOTE" ]; then
    ok "Git repo with remote: $REMOTE"
  else
    warn "Git repo exists but no remote — push with: rtk gh repo create [name] --private && rtk git push -u origin main"
  fi
else
  echo "    Initializing git repository..."
  git init --quiet && git add . && git commit -m "chore: init project from cc-starterkit" --quiet 2>/dev/null || true
  ok "Git repo initialized"
  info "Create remote: rtk gh repo create [name] --private && rtk git push -u origin main"
fi

echo "Next steps:"
echo "  1. Replace [Project Name] in CLAUDE.md"
echo "  2. Update .claude/architecture.json if your src/ differs"
echo "  3. Create GitHub repo: rtk gh repo create [name] --private"
echo "  4. Open Claude Code: claude"
echo ""
echo "Skills available:"
echo "  /build           → Full pipeline: research → plan → implement"
echo "  /feature-dev     → TDD + hexagonal implementation (extends official feature-dev plugin)"
echo "  /frontend-design → Production-grade UI (extends official frontend-design plugin)"
echo "  /browser-qa      → Exhaustive browser QA: crawl all UI, fix all errors"
echo "  /qa-loop         → Tiered QA gates with automatic fix loop"
echo "  /research        → Parallel research wave"
echo "  /agent-teams     → Multi-team parallel orchestration"
echo ""
