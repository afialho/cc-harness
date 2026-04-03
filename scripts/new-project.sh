#!/usr/bin/env bash
# new-project.sh — Create a new project from cc-harness
#
# Usage (one-liner, no clone needed):
#   bash <(curl -s "https://raw.githubusercontent.com/afialho/cc-harness/main/scripts/new-project.sh?t=$(date +%s)") <project-name> [destination]
#
# Examples:
#   bash new-project.sh my-app
#   bash new-project.sh my-app ~/workspace/my-app

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

ok()   { echo -e "${GREEN}✅  $1${NC}"; }
info() { echo -e "    $1"; }
fail() { echo -e "${RED}❌  $1${NC}"; exit 1; }

# ── Args ──────────────────────────────────────────────────────────────────────
PROJECT_NAME=${1:-""}
if [ -z "$PROJECT_NAME" ]; then
  echo -e "${RED}Error: project name required${NC}"
  echo "Usage: bash new-project.sh <project-name> [destination]"
  exit 1
fi

DEST=${2:-"$(pwd)/$PROJECT_NAME"}

echo ""
echo -e "${BOLD}🚀  Creating project '$PROJECT_NAME'${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── Clone ─────────────────────────────────────────────────────────────────────
echo "📥  Cloning cc-harness..."
git clone https://github.com/afialho/cc-harness.git "$DEST"
ok "Cloned to $DEST"

cd "$DEST"

# ── Git reset ─────────────────────────────────────────────────────────────────
echo ""
echo "🔧  Initializing fresh git history..."
rm -rf .git
git init --quiet
git add .
git commit -m "chore: init $PROJECT_NAME from cc-harness" --quiet
ok "Git initialized (clean history)"

# ── Project name ──────────────────────────────────────────────────────────────
if command -v node &>/dev/null; then
  node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    pkg.name = '${PROJECT_NAME}';
    pkg.description = '${PROJECT_NAME}';
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
  "
  ok "package.json name set to '$PROJECT_NAME'"
fi

# ── Setup (installs deps + checks env) ───────────────────────────────────────
echo ""
bash scripts/setup.sh

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}${BOLD}Project '$PROJECT_NAME' is ready!${NC}"
echo ""
echo "  cd $DEST"
echo "  claude"
echo ""
echo "Then start with:"
echo "  /build <your idea>"
echo ""
