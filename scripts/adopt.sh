#!/usr/bin/env bash
# adopt.sh — Adopt cc-harness into an existing project
#
# Usage (one-liner, no clone needed):
#   bash <(curl -s "https://raw.githubusercontent.com/afialho/cc-harness/main/scripts/adopt.sh?t=$(date +%s)")
#
# Or if the kit is cloned locally:
#   bash /path/to/cc-harness/scripts/adopt.sh

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

ok()   { echo -e "${GREEN}✅  $1${NC}"; }
info() { echo -e "    $1"; }
warn() { echo -e "${YELLOW}⚠️   $1${NC}"; }
fail() { echo -e "${RED}❌  $1${NC}"; exit 1; }

INSTALLED=()
SKIPPED=()

track_installed() { INSTALLED+=("$1"); }
track_skipped()   { SKIPPED+=("$1"); }

# ── Step 1 — Verify we are at a project root ──────────────────────────────────
PROJECT_MARKERS=(package.json pyproject.toml go.mod Gemfile pom.xml Cargo.toml)
FOUND_MARKER=false
for marker in "${PROJECT_MARKERS[@]}"; do
  if [ -f "$marker" ]; then
    FOUND_MARKER=true
    break
  fi
done

if [ "$FOUND_MARKER" = false ]; then
  fail "Run this from your project root directory."
fi

if [ ! -d ".git" ]; then
  warn "No .git directory found — continuing without git."
fi

echo ""
echo -e "${BOLD}Adopting cc-harness into this project...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── Step 2 — Clone kit into temp dir ─────────────────────────────────────────
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

echo "Downloading cc-harness..."
git clone --depth=1 --quiet https://github.com/afialho/cc-harness.git "$TEMP_DIR/kit"
ok "Kit downloaded"
echo ""

# ── Step 3 — Install skills and hooks (.claude/) ─────────────────────────────
mkdir -p .claude/skills .claude/hooks

# Skills
for skill_dir in "$TEMP_DIR/kit/.claude/skills/"/*/; do
  [ -d "$skill_dir" ] || continue
  skill_name=$(basename "$skill_dir")
  if [ ! -d ".claude/skills/$skill_name" ]; then
    cp -r "$skill_dir" ".claude/skills/$skill_name"
    ok "Installed skill: /$skill_name"
    track_installed "skill: /$skill_name"
  else
    info "Skipped skill /$skill_name (already exists)"
    track_skipped "skill: /$skill_name"
  fi
done

# Hooks
for hook_file in "$TEMP_DIR/kit/.claude/hooks/"*.mjs; do
  [ -f "$hook_file" ] || continue
  hook_name=$(basename "$hook_file")
  if [ ! -f ".claude/hooks/$hook_name" ]; then
    cp "$hook_file" ".claude/hooks/$hook_name"
    ok "Installed hook: $hook_name"
    track_installed "hook: $hook_name"
  else
    info "Skipped hook: $hook_name (already exists)"
    track_skipped "hook: $hook_name"
  fi
done

# architecture.json
if [ ! -f ".claude/architecture.json" ]; then
  cp "$TEMP_DIR/kit/.claude/architecture.json" ".claude/architecture.json"
  ok "Installed architecture.json (run /adapt to customize)"
  track_installed "architecture.json"
else
  info "Skipped architecture.json (already exists)"
  track_skipped "architecture.json"
fi

# ── Step 4 — Install CLAUDE.md, Rules.md, Agents.md ─────────────────────────
install_or_merge_md() {
  local filename="$1"
  local kit_basename="${filename%.md}.kit.md"

  if [ ! -f "$filename" ]; then
    cp "$TEMP_DIR/kit/$filename" "$filename"
    ok "Installed $filename"
    track_installed "$filename"
  else
    local kit_dest=".claude/$kit_basename"
    cp "$TEMP_DIR/kit/$filename" "$kit_dest"
    local ref_line="@.claude/$kit_basename"
    if ! grep -qF "$ref_line" "$filename"; then
      # Prepend the @reference line at the top
      local tmp_file
      tmp_file=$(mktemp)
      { echo "$ref_line"; cat "$filename"; } > "$tmp_file"
      mv "$tmp_file" "$filename"
      ok "Merged: added '$ref_line' to top of $filename"
      track_installed "$kit_dest (referenced from $filename)"
    else
      info "Skipped injecting $ref_line (already in $filename)"
      track_skipped "$kit_dest reference in $filename"
    fi
  fi
}

install_or_merge_md "CLAUDE.md"
install_or_merge_md "Rules.md"
install_or_merge_md "Agents.md"

# ── Step 5 — Merge settings.json ─────────────────────────────────────────────
if command -v node &>/dev/null; then
  export TEMP_KIT="$TEMP_DIR/kit"
  node << 'EOF'
const fs = require('fs');

const kitSettings = JSON.parse(fs.readFileSync(process.env.TEMP_KIT + '/.claude/settings.json', 'utf8'));
const targetPath = '.claude/settings.json';

if (!fs.existsSync(targetPath)) {
  fs.writeFileSync(targetPath, JSON.stringify({ hooks: kitSettings.hooks }, null, 2) + '\n');
  console.log('INSTALLED');
} else {
  const existing = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
  existing.hooks = existing.hooks || {};

  for (const [event, handlers] of Object.entries(kitSettings.hooks || {})) {
    if (!existing.hooks[event]) {
      existing.hooks[event] = handlers;
    }
    // If event already exists, preserve the user's configuration
  }

  fs.writeFileSync(targetPath, JSON.stringify(existing, null, 2) + '\n');
  console.log('MERGED');
}
EOF
  SETTINGS_RESULT=$(TEMP_KIT="$TEMP_DIR/kit" node << 'EOF2'
const fs = require('fs');
const kitSettings = JSON.parse(fs.readFileSync(process.env.TEMP_KIT + '/.claude/settings.json', 'utf8'));
const targetPath = '.claude/settings.json';
const content = fs.readFileSync(targetPath, 'utf8');
const existing = JSON.parse(content);
const hasAllHooks = Object.keys(kitSettings.hooks || {}).every(k => existing.hooks && existing.hooks[k]);
console.log(hasAllHooks ? 'complete' : 'partial');
EOF2
  ) 2>/dev/null || SETTINGS_RESULT="done"

  ok "settings.json configured"
  track_installed "settings.json (hooks merged)"
else
  warn "node not found — skipping settings.json merge. Copy .claude/settings.json manually."
  track_skipped "settings.json (node not available)"
fi

# ── Step 6 — Merge test devDependencies (Node.js only) ───────────────────────
if [ -f "package.json" ] && command -v node &>/dev/null; then
  ADDED_DEPS=$(TEMP_KIT="$TEMP_DIR/kit" node << 'EOF'
const fs = require('fs');

const kitPkg = JSON.parse(fs.readFileSync(process.env.TEMP_KIT + '/package.json', 'utf8'));
const projectPkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

const testDepPrefixes = ['jest', 'ts-jest', '@types/jest', '@cucumber/cucumber', 'cypress', 'k6'];
const kitDev = kitPkg.devDependencies || {};

projectPkg.devDependencies = projectPkg.devDependencies || {};

const added = [];
for (const [pkg, version] of Object.entries(kitDev)) {
  const isTestDep = testDepPrefixes.some(t => pkg.startsWith(t));
  if (isTestDep && !projectPkg.devDependencies[pkg]) {
    projectPkg.devDependencies[pkg] = version;
    added.push(pkg);
  }
}

fs.writeFileSync('package.json', JSON.stringify(projectPkg, null, 2) + '\n');
if (added.length > 0) {
  console.log(added.join(', '));
}
EOF
  )

  if [ -n "$ADDED_DEPS" ]; then
    ok "Added test devDependencies: $ADDED_DEPS"
    track_installed "package.json devDependencies: $ADDED_DEPS"
  else
    info "No new test devDependencies to add"
    track_skipped "package.json devDependencies (all already present)"
  fi
fi

# ── Step 7 — Final output ─────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}${BOLD}✅  cc-harness adopted successfully!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ ${#INSTALLED[@]} -gt 0 ]; then
  echo -e "${BOLD}Installed:${NC}"
  for item in "${INSTALLED[@]}"; do
    echo "  + $item"
  done
  echo ""
fi

if [ ${#SKIPPED[@]} -gt 0 ]; then
  echo -e "${BOLD}Skipped (already existed):${NC}"
  for item in "${SKIPPED[@]}"; do
    echo "  ~ $item"
  done
  echo ""
fi

# ── Tools: Claude Code CLI, RTK, k6 ──────────────────────────────────────────
echo ""
echo "Installing required tools..."

OS="unknown"
[[ "$OSTYPE" == "darwin"* ]] && OS="macos"
[[ "$OSTYPE" == "linux-gnu"* ]] && OS="linux"

# Claude Code CLI
if command -v claude &>/dev/null; then
  ok "Claude Code CLI already installed"
  track_skipped "Claude Code CLI"
else
  if npm install -g @anthropic-ai/claude-code 2>/dev/null; then
    ok "Claude Code CLI installed"
    track_installed "Claude Code CLI"
  else
    warn "Could not auto-install Claude Code CLI"
    info "Install manually: npm install -g @anthropic-ai/claude-code"
    track_skipped "Claude Code CLI (manual install needed)"
  fi
fi

# RTK CLI
if command -v rtk &>/dev/null; then
  ok "RTK CLI already installed"
  track_skipped "RTK CLI"
else
  if npm install -g rtk 2>/dev/null; then
    ok "RTK CLI installed"
    track_installed "RTK CLI"
  else
    warn "Could not auto-install RTK CLI"
    info "Install manually: npm install -g rtk"
    track_skipped "RTK CLI (manual install needed)"
  fi
fi

# agent-browser CLI
if command -v agent-browser &>/dev/null; then
  ok "agent-browser CLI already installed"
  track_skipped "agent-browser CLI"
else
  if npm install -g agent-browser 2>/dev/null; then
    agent-browser install 2>/dev/null || true
    ok "agent-browser CLI installed"
    track_installed "agent-browser CLI"
  else
    warn "Could not auto-install agent-browser CLI"
    info "Install manually: npm install -g agent-browser && agent-browser install"
    track_skipped "agent-browser CLI (manual install needed)"
  fi
fi

# k6
if command -v k6 &>/dev/null; then
  ok "k6 already installed"
  track_skipped "k6"
else
  INSTALLED_K6=false
  if [ "$OS" = "macos" ] && command -v brew &>/dev/null; then
    brew install k6 2>/dev/null && INSTALLED_K6=true && ok "k6 installed" && track_installed "k6"
  elif [ "$OS" = "linux" ] && command -v apt-get &>/dev/null; then
    sudo gpg --no-default-keyring \
      --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
      --keyserver hkp://keyserver.ubuntu.com:80 \
      --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69 2>/dev/null \
    && echo 'deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main' \
      | sudo tee /etc/apt/sources.list.d/k6.list &>/dev/null \
    && sudo apt-get update -qq && sudo apt-get install -y k6 2>/dev/null \
    && INSTALLED_K6=true && ok "k6 installed" && track_installed "k6"
  fi
  if [ "$INSTALLED_K6" = false ]; then
    warn "Could not auto-install k6"
    info "macOS: brew install k6  |  Linux: https://k6.io/docs/get-started/installation/"
    track_skipped "k6 (manual install needed)"
  fi
fi

# ── Plugins: Claude Code official + vercel MCP ────────────────────────────────
echo ""
echo "Installing Claude Code plugins..."

if command -v claude &>/dev/null; then

  install_plugin() {
    local name="$1"
    local pkg="$2"
    if claude plugin list 2>/dev/null | grep -q "$name"; then
      ok "Plugin $name already installed"
      track_skipped "plugin: $name"
    else
      if claude plugin install "$pkg" 2>/dev/null; then
        ok "Plugin $name installed"
        track_installed "plugin: $name"
      else
        warn "Could not auto-install plugin $name"
        info "Install manually: claude plugin install $pkg"
        track_skipped "plugin: $name (manual install needed)"
      fi
    fi
  }

  # Official Claude Code plugins (project skills extend these)
  install_plugin "claude-code-setup" "claude-code-setup@claude-plugins-official"
  install_plugin "feature-dev"       "feature-dev@claude-plugins-official"
  install_plugin "frontend-design"   "frontend-design@claude-plugins-official"
  install_plugin "code-review"       "code-review@claude-plugins-official"
  install_plugin "code-simplifier"   "code-simplifier@claude-plugins-official"

  # agent-browser CLI is installed separately — no MCP needed

else
  warn "claude CLI not found — skipping plugin installation"
  info "After installing Claude Code, re-run: bash adopt.sh"
  track_skipped "all Claude Code plugins (claude CLI not found)"
fi

echo -e "${BOLD}Next steps:${NC}"
echo "  1. Open Claude Code in this project:"
echo "       claude"
echo ""
echo "  2. Run /adapt to configure the kit for your stack:"
echo "       /adapt"
echo ""
echo "     /adapt will detect your stack (Node/Python/Go/etc.) and"
echo "     configure architecture rules, hooks, and CLAUDE.md"
echo "     to match your project's actual structure."
echo ""
echo "  3. Start building:"
echo "       /build <your idea>"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
