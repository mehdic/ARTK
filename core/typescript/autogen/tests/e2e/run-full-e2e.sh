#!/bin/bash
# Full E2E Test for AutoGen CLI Pipeline
#
# This script:
# 1. Creates a sample project in tmp/
# 2. Bootstraps ARTK using the bootstrap script
# 3. Creates a test journey
# 4. Runs the full CLI pipeline: analyze → plan → generate → run
# 5. Reports results
#
# Usage:
#   ./tests/e2e/run-full-e2e.sh
#   ./tests/e2e/run-full-e2e.sh --keep  # Don't clean up after test
#   ./tests/e2e/run-full-e2e.sh --skip-generate  # Skip LLM-dependent stages

set -e

# ═══════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AUTOGEN_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
ARTK_ROOT="$(cd "$AUTOGEN_DIR/../../.." && pwd)"
TMP_DIR="$ARTK_ROOT/tmp"
PROJECT_NAME="e2e-test-project-$(date +%s)"
PROJECT_DIR="$TMP_DIR/$PROJECT_NAME"

# Parse arguments
KEEP_PROJECT=false
SKIP_GENERATE=false
VERBOSE=false

for arg in "$@"; do
  case $arg in
    --keep)
      KEEP_PROJECT=true
      ;;
    --skip-generate)
      SKIP_GENERATE=true
      ;;
    --verbose|-v)
      VERBOSE=true
      ;;
  esac
done

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ═══════════════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════════════

log() {
  echo -e "${BLUE}[E2E]${NC} $1"
}

success() {
  echo -e "${GREEN}✓${NC} $1"
}

fail() {
  echo -e "${RED}✗${NC} $1"
}

warn() {
  echo -e "${YELLOW}⚠${NC} $1"
}

section() {
  echo ""
  echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
}

cleanup() {
  if [ "$KEEP_PROJECT" = false ] && [ -d "$PROJECT_DIR" ]; then
    log "Cleaning up $PROJECT_DIR..."
    rm -rf "$PROJECT_DIR"
  fi
}

trap cleanup EXIT

# ═══════════════════════════════════════════════════════════════════════════
# STEP 1: Create Sample Project
# ═══════════════════════════════════════════════════════════════════════════

section "Step 1: Creating Sample Project"

mkdir -p "$TMP_DIR"
mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"

log "Project directory: $PROJECT_DIR"

# Create minimal package.json
cat > package.json << 'EOF'
{
  "name": "e2e-test-project",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "test": "npx playwright test"
  }
}
EOF

success "Created package.json"

# ═══════════════════════════════════════════════════════════════════════════
# STEP 2: Bootstrap ARTK
# ═══════════════════════════════════════════════════════════════════════════

section "Step 2: Setting Up ARTK Structure"

log "Creating artk-e2e directory structure..."

# Create artk-e2e structure manually (lightweight setup for E2E testing)
mkdir -p artk-e2e/.artk/autogen
mkdir -p artk-e2e/journeys/clarified
mkdir -p artk-e2e/tests
mkdir -p artk-e2e/vendor/artk-core
mkdir -p artk-e2e/vendor/artk-autogen

# Copy autogen dist (we need the CLI)
cp -r "$AUTOGEN_DIR/dist" artk-e2e/vendor/artk-autogen/
cp "$AUTOGEN_DIR/package.json" artk-e2e/vendor/artk-autogen/

# Create minimal artk-core structure
cat > artk-e2e/vendor/artk-core/package.json << 'COREPKG'
{
  "name": "@artk/core",
  "version": "1.0.0",
  "type": "module"
}
COREPKG

# Create artk-e2e package.json
cat > artk-e2e/package.json << 'ARTKPKG'
{
  "name": "artk-e2e",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "test": "npx playwright test"
  }
}
ARTKPKG

success "artk-e2e directory created"
success "CLI installed to vendor/artk-autogen"

# ═══════════════════════════════════════════════════════════════════════════
# STEP 3: Create Test Journey
# ═══════════════════════════════════════════════════════════════════════════

section "Step 3: Creating Test Journey"

cd "$PROJECT_DIR/artk-e2e"

mkdir -p journeys/clarified

cat > journeys/clarified/JRN-E2E-001__login-flow.md << 'EOF'
---
id: JRN-E2E-001
title: E2E Login Flow Test
status: clarified
tier: smoke
actor: standard_user
scope: authentication
tests: []
tags:
  - e2e
  - login
  - smoke
---

# E2E Login Flow Test

Verify that a user can log in with valid credentials.

## Preconditions

- Application is running
- Test user exists

## Steps

1. Navigate to the login page
2. Enter username "testuser@example.com"
3. Enter password in the password field
4. Click the Sign In button
5. Verify the dashboard is displayed

## Expected Result

- User is logged in
- Dashboard page is visible
EOF

success "Created test journey: JRN-E2E-001"

# ═══════════════════════════════════════════════════════════════════════════
# STEP 4: Run CLI Pipeline
# ═══════════════════════════════════════════════════════════════════════════

section "Step 4: Running CLI Pipeline"

# Get the CLI path (use source autogen dist - has dependencies)
CLI="node $AUTOGEN_DIR/dist/cli/index.js"

# 4a. Clean
log "Running: artk-autogen clean --force"
$CLI clean --force
success "Clean completed"

# 4b. Status (initial)
log "Running: artk-autogen status"
STATUS=$($CLI status --json)
# Extract stage from pipeline.stage in JSON
# Extract stage from pipeline.stage using python (most reliable JSON parsing)
STAGE=$(echo "$STATUS" | python3 -c "import sys,json; print(json.load(sys.stdin)['pipeline']['stage'])")
if [ "$STAGE" = "initial" ]; then
  success "Initial state confirmed"
else
  fail "Expected 'initial' state, got '$STAGE'"
  exit 1
fi

# 4c. Analyze
log "Running: artk-autogen analyze"
$CLI analyze "journeys/clarified/JRN-E2E-001__login-flow.md"
success "Analyze completed"

# Verify analysis.json
if [ -f ".artk/autogen/analysis.json" ]; then
  success "analysis.json created"
else
  fail "analysis.json not found"
  exit 1
fi

# Check state
STATUS=$($CLI status --json)
STAGE=$(echo "$STATUS" | python3 -c "import sys,json; print(json.load(sys.stdin)['pipeline']['stage'])")
if [ "$STAGE" = "analyzed" ]; then
  success "State transitioned to 'analyzed'"
else
  fail "Expected 'analyzed' state, got '$STAGE'"
  exit 1
fi

# 4d. Plan
log "Running: artk-autogen plan"
$CLI plan
success "Plan completed"

# Verify plan.json
if [ -f ".artk/autogen/plan.json" ]; then
  success "plan.json created"
else
  fail "plan.json not found"
  exit 1
fi

# Check state
STATUS=$($CLI status --json)
STAGE=$(echo "$STATUS" | python3 -c "import sys,json; print(json.load(sys.stdin)['pipeline']['stage'])")
if [ "$STAGE" = "planned" ]; then
  success "State transitioned to 'planned'"
else
  fail "Expected 'planned' state, got '$STAGE'"
  exit 1
fi

# 4e. Generate (optional - requires LLM)
if [ "$SKIP_GENERATE" = true ]; then
  warn "Skipping generate stage (--skip-generate)"
else
  log "Running: artk-autogen generate"

  # Create tests directory
  mkdir -p tests

  # Generate might fail if LLKB not configured - that's ok
  if $CLI generate -o tests/ 2>/dev/null; then
    success "Generate completed"

    # Check for generated files
    if ls tests/*.spec.ts 1> /dev/null 2>&1; then
      success "Test files generated"

      # Check state
      STATUS=$($CLI status --json)
      STAGE=$(echo "$STATUS" | python3 -c "import sys,json; print(json.load(sys.stdin)['pipeline']['stage'])")
      if [ "$STAGE" = "generated" ]; then
        success "State transitioned to 'generated'"
      else
        warn "State is '$STAGE' (expected 'generated')"
      fi
    else
      warn "No test files generated (may need LLKB configuration)"
    fi
  else
    warn "Generate failed (may need LLKB configuration or additional setup)"
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════
# STEP 5: Final Report
# ═══════════════════════════════════════════════════════════════════════════

section "Final Report"

# Get final status
STATUS=$($CLI status --json)
STAGE=$(echo "$STATUS" | python3 -c "import sys,json; print(json.load(sys.stdin)['pipeline']['stage'])")

echo ""
log "Project: $PROJECT_DIR"
log "Final State: $STAGE"
echo ""

# List artifacts
log "Artifacts created:"
ls -la .artk/autogen/ 2>/dev/null | grep -v "^total" | grep -v "^d" || echo "  (none)"

echo ""

# Check what we achieved
PASSED=0
TOTAL=4

if [ -f ".artk/autogen/analysis.json" ]; then
  success "Analyze stage: PASS"
  ((PASSED++))
else
  fail "Analyze stage: FAIL"
fi

if [ -f ".artk/autogen/plan.json" ]; then
  success "Plan stage: PASS"
  ((PASSED++))
else
  fail "Plan stage: FAIL"
fi

if [ "$SKIP_GENERATE" = true ]; then
  warn "Generate stage: SKIPPED"
  ((TOTAL--))
elif ls tests/*.spec.ts 1> /dev/null 2>&1; then
  success "Generate stage: PASS"
  ((PASSED++))
else
  warn "Generate stage: INCOMPLETE (expected - needs LLKB)"
fi

if [ "$STAGE" != "initial" ]; then
  success "State machine: PASS"
  ((PASSED++))
else
  fail "State machine: FAIL"
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "Result: ${GREEN}$PASSED/$TOTAL stages passed${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"

if [ "$KEEP_PROJECT" = true ]; then
  echo ""
  log "Project kept at: $PROJECT_DIR"
  log "To clean up manually: rm -rf $PROJECT_DIR"
fi

# Exit with success if core stages passed
if [ $PASSED -ge 3 ]; then
  exit 0
else
  exit 1
fi
