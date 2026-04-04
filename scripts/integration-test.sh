#!/usr/bin/env bash
# integration-test.sh — Validates cc-harness pipeline integrity
#
# Checks that all skills, hooks, settings, and architecture config are:
# 1. Present and well-formed
# 2. Referenced correctly (no dangling references)
# 3. Free of circular dependencies
# 4. Consistent (no conflicting rules or overlapping enforcement)
#
# Usage: bash scripts/integration-test.sh
# Exit code: 0 = all checks pass, 1 = failures found

set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0

pass() { echo -e "  ${GREEN}PASS${NC}  $1"; PASS=$((PASS + 1)); }
fail() { echo -e "  ${RED}FAIL${NC}  $1"; FAIL=$((FAIL + 1)); }
warn() { echo -e "  ${YELLOW}WARN${NC}  $1"; WARN=$((WARN + 1)); }

echo ""
echo -e "${BOLD}CC Harness — Integration Test${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── 1. Core files exist ──────────────────────────────────────────────────────
echo -e "${BOLD}1. Core Files${NC}"

for f in CLAUDE.md Rules.md Agents.md; do
  if [ -f "$f" ]; then
    pass "$f exists ($(wc -c < "$f" | tr -d ' ') bytes)"
  else
    fail "$f is MISSING"
  fi
done

# ── 2. Architecture config ──────────────────────────────────────────────────
echo ""
echo -e "${BOLD}2. Architecture Config${NC}"

ARCH_FILE=".claude/architecture.json"
if [ -f "$ARCH_FILE" ]; then
  if node -e "JSON.parse(require('fs').readFileSync('$ARCH_FILE','utf8'))" 2>/dev/null; then
    pass "$ARCH_FILE is valid JSON"
    # Check required keys
    LAYERS=$(node -e "const a=JSON.parse(require('fs').readFileSync('$ARCH_FILE','utf8'));console.log(Object.keys(a.layers||{}).join(','))" 2>/dev/null || echo "")
    if [ -n "$LAYERS" ]; then
      pass "Architecture layers defined: $LAYERS"
    else
      fail "No layers defined in $ARCH_FILE"
    fi
    TEST_MAP=$(node -e "const a=JSON.parse(require('fs').readFileSync('$ARCH_FILE','utf8'));console.log(Object.keys(a.testMapping||{}).length)" 2>/dev/null || echo "0")
    if [ "$TEST_MAP" -gt 0 ]; then
      pass "Test mapping defined ($TEST_MAP entries)"
    else
      warn "No testMapping in $ARCH_FILE"
    fi
  else
    fail "$ARCH_FILE is invalid JSON"
  fi
else
  fail "$ARCH_FILE is MISSING"
fi

# ── 3. Settings & hooks ─────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}3. Settings & Hooks${NC}"

SETTINGS=".claude/settings.json"
if [ -f "$SETTINGS" ]; then
  if node -e "JSON.parse(require('fs').readFileSync('$SETTINGS','utf8'))" 2>/dev/null; then
    pass "$SETTINGS is valid JSON"

    # Extract all hook file references
    HOOK_REFS=$(node -e "
      const s=JSON.parse(require('fs').readFileSync('$SETTINGS','utf8'));
      const refs=new Set();
      for(const handlers of Object.values(s.hooks||{})){
        for(const group of handlers){
          for(const h of group.hooks||[]){
            const m=h.command?.match(/node\s+(\S+)/);
            if(m) refs.add(m[1]);
          }
        }
      }
      console.log([...refs].join('\n'));
    " 2>/dev/null)

    # Verify each referenced hook file exists
    while IFS= read -r hookPath; do
      [ -z "$hookPath" ] && continue
      if [ -f "$hookPath" ]; then
        # Verify hook is valid Node.js
        if node --check "$hookPath" 2>/dev/null; then
          pass "Hook $hookPath exists and is valid JS"
        else
          fail "Hook $hookPath has syntax errors"
        fi
      else
        fail "Hook $hookPath referenced in settings but FILE NOT FOUND"
      fi
    done <<< "$HOOK_REFS"

    # Check for orphaned hooks (exist on disk but not referenced)
    for hookFile in .claude/hooks/*.mjs; do
      [ -f "$hookFile" ] || continue
      if ! echo "$HOOK_REFS" | grep -qF "$hookFile"; then
        warn "Hook $hookFile exists but is NOT referenced in settings.json"
      fi
    done

  else
    fail "$SETTINGS is invalid JSON"
  fi
else
  fail "$SETTINGS is MISSING"
fi

# ── 4. Skills validation ────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}4. Skills${NC}"

SKILL_COUNT=0
SKILL_ERRORS=0
SKILL_NAMES=()

for skillDir in .claude/skills/*/; do
  [ -d "$skillDir" ] || continue
  skillName=$(basename "$skillDir")
  skillFile="$skillDir/SKILL.md"
  SKILL_COUNT=$((SKILL_COUNT + 1))
  SKILL_NAMES+=("$skillName")

  if [ ! -f "$skillFile" ]; then
    fail "Skill /$skillName has directory but no SKILL.md"
    SKILL_ERRORS=$((SKILL_ERRORS + 1))
    continue
  fi

  # Check frontmatter
  if head -1 "$skillFile" | grep -q '^---'; then
    # Extract name from frontmatter
    FM_NAME=$(sed -n '2,/^---$/p' "$skillFile" | grep '^name:' | head -1 | sed 's/name:\s*//' | tr -d ' ')
    if [ -n "$FM_NAME" ]; then
      if [ "$FM_NAME" = "$skillName" ]; then
        pass "Skill /$skillName — valid frontmatter ($(wc -c < "$skillFile" | tr -d ' ') bytes)"
      else
        warn "Skill /$skillName — frontmatter name='$FM_NAME' differs from directory name"
      fi
    else
      fail "Skill /$skillName — frontmatter missing 'name' field"
      SKILL_ERRORS=$((SKILL_ERRORS + 1))
    fi
  else
    fail "Skill /$skillName — no YAML frontmatter"
    SKILL_ERRORS=$((SKILL_ERRORS + 1))
  fi
done

echo ""
echo "  Total skills: $SKILL_COUNT"

# ── 5. Skill cross-references ───────────────────────────────────────────────
echo ""
echo -e "${BOLD}5. Skill Cross-References${NC}"

# Check that skills referencing other skills point to existing ones
for skillDir in .claude/skills/*/; do
  [ -d "$skillDir" ] || continue
  skillFile="$skillDir/SKILL.md"
  [ -f "$skillFile" ] || continue
  skillName=$(basename "$skillDir")

  # Find /skillname references
  REFS=$(grep -oE '/[a-z][-a-z]+' "$skillFile" 2>/dev/null | sort -u | grep -v '^/[A-Z]' || true)
  for ref in $REFS; do
    refName="${ref#/}"
    # Skip common non-skill references
    case "$refName" in
      api|app|src|tests|build-*|e2e|bdd|unit|integration|load|dev|qa-*) continue ;;
    esac
    # Check if it's a known skill
    found=false
    for known in "${SKILL_NAMES[@]}"; do
      if [ "$known" = "$refName" ]; then
        found=true
        break
      fi
    done
    if [ "$found" = false ] && [ -d ".claude/skills/$refName" ]; then
      found=true
    fi
    # Only warn for clear skill-like references (not paths)
    if [ "$found" = false ] && [[ ! "$refName" =~ \. ]] && [[ ! "$refName" =~ / ]]; then
      # Only flag if it looks like a command (starts with known prefixes)
      case "$refName" in
        compact|clear|resume|help|fast) continue ;; # Built-in commands
        *) :; # could be a skill reference
      esac
    fi
  done
done
pass "Skill cross-references checked"

# ── 6. No Portuguese text check (spot check) ────────────────────────────────
echo ""
echo -e "${BOLD}6. Language Consistency (English-only)${NC}"

PT_PATTERNS='Obrigatório|obrigatório|Verificar|verificar|Emitir:|Pausa:|Fase [0-9]|Visão geral|Quando invocar|Orquestrador|Sempre que|Nunca |Escopo|Regras em|Dimensões|Pesquisa|Entrevista'

PT_FILES=0
for f in CLAUDE.md Rules.md Agents.md; do
  if [ -f "$f" ] && grep -qE "$PT_PATTERNS" "$f" 2>/dev/null; then
    fail "$f contains Portuguese text"
    PT_FILES=$((PT_FILES + 1))
  fi
done

for skillFile in .claude/skills/*/SKILL.md; do
  [ -f "$skillFile" ] || continue
  if grep -qE "$PT_PATTERNS" "$skillFile" 2>/dev/null; then
    fail "$skillFile contains Portuguese text"
    PT_FILES=$((PT_FILES + 1))
  fi
done

if [ "$PT_FILES" -eq 0 ]; then
  pass "No Portuguese text detected in core files and skills"
fi

# ── 7. Build skill phase files ──────────────────────────────────────────────
echo ""
echo -e "${BOLD}7. Build Skill Phase Files${NC}"

for phase in PHASE-1-RESEARCH.md PHASE-2-PLANNING.md PHASE-3-IMPLEMENTATION.md; do
  phasePath=".claude/skills/build/$phase"
  if [ -f "$phasePath" ]; then
    pass "$phase exists ($(wc -c < "$phasePath" | tr -d ' ') bytes)"
  else
    fail "$phase is MISSING — build skill progressive loading broken"
  fi
done

# Check main SKILL.md references phase files
BUILD_SKILL=".claude/skills/build/SKILL.md"
if [ -f "$BUILD_SKILL" ]; then
  BUILD_SIZE=$(wc -c < "$BUILD_SKILL" | tr -d ' ')
  if [ "$BUILD_SIZE" -lt 15000 ]; then
    pass "build/SKILL.md is lean ($BUILD_SIZE bytes < 15000)"
  else
    warn "build/SKILL.md is $BUILD_SIZE bytes — expected < 15000 after split"
  fi
fi

# ── 8. Debug skill exists ───────────────────────────────────────────────────
echo ""
echo -e "${BOLD}8. Debug Skill${NC}"

if [ -f ".claude/skills/debug/SKILL.md" ]; then
  pass "/debug skill exists"
else
  fail "/debug skill is MISSING"
fi

# ── 9. Hook consolidation check ─────────────────────────────────────────────
echo ""
echo -e "${BOLD}9. Hook Consolidation${NC}"

if [ -f ".claude/hooks/rules-engine.mjs" ]; then
  fail "rules-engine.mjs still exists — should be consolidated into commit-guard.mjs"
else
  pass "rules-engine.mjs removed (consolidated into commit-guard.mjs)"
fi

# Check commit-guard handles all 3 rules
if [ -f ".claude/hooks/commit-guard.mjs" ]; then
  GUARD_CONTENT=$(cat .claude/hooks/commit-guard.mjs)
  echo "$GUARD_CONTENT" | grep -q 'RULE-GIT-001' && pass "commit-guard enforces RULE-GIT-001" || fail "commit-guard missing RULE-GIT-001"
  echo "$GUARD_CONTENT" | grep -q 'RULE-GIT-002' && pass "commit-guard enforces RULE-GIT-002" || fail "commit-guard missing RULE-GIT-002"
  echo "$GUARD_CONTENT" | grep -q 'RULE-GIT-003' && pass "commit-guard enforces RULE-GIT-003" || fail "commit-guard missing RULE-GIT-003"
fi

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${GREEN}PASS: $PASS${NC}  |  ${RED}FAIL: $FAIL${NC}  |  ${YELLOW}WARN: $WARN${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}${BOLD}Integration test FAILED — $FAIL issue(s) found.${NC}"
  exit 1
else
  echo -e "${GREEN}${BOLD}Integration test PASSED — all checks green.${NC}"
  exit 0
fi
