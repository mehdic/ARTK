#!/bin/bash
#
# Test Script: Two-Tier Architecture for ARTK Prompts/Agents
#
# This script tests:
# 1. Fresh install creates both .github/prompts/ and .github/agents/
# 2. Stub prompt files have correct format
# 3. Agent files contain full content with handoffs
# 4. Upgrade from old installation creates backup and migrates
#
# Usage: ./scripts/test-two-tier-architecture.sh
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ARTK_REPO="$(dirname "$SCRIPT_DIR")"
TEST_DIR="/tmp/artk-two-tier-test-$$"
PASSED=0
FAILED=0

cleanup() {
    echo -e "\n${CYAN}Cleaning up test directories...${NC}"
    rm -rf "$TEST_DIR" 2>/dev/null || true
}

trap cleanup EXIT

log_pass() {
    echo -e "${GREEN}✓ PASS: $1${NC}"
    PASSED=$((PASSED + 1))
}

log_fail() {
    echo -e "${RED}✗ FAIL: $1${NC}"
    FAILED=$((FAILED + 1))
}

log_test() {
    echo -e "\n${YELLOW}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}TEST: $1${NC}"
    echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
}

# ============================================================================
# TEST 1: Fresh Install
# ============================================================================
test_fresh_install() {
    log_test "Fresh Install - Two-Tier Architecture"

    local PROJECT_DIR="$TEST_DIR/fresh-install"
    local LOG_FILE="$TEST_DIR/fresh-install-bootstrap.log"
    mkdir -p "$PROJECT_DIR"

    echo -e "${CYAN}Running bootstrap on fresh project...${NC}"
    # [H3] Capture bootstrap output to log file for debugging
    "$ARTK_REPO/scripts/bootstrap.sh" "$PROJECT_DIR" --skip-npm --skip-llkb --yes > "$LOG_FILE" 2>&1 || true

    # Verify Step 4 completed (check for success message in log)
    if grep -q "Installing prompts and agents" "$LOG_FILE"; then
        log_pass "Bootstrap Step 4 started (two-tier installation)"
    else
        log_fail "Bootstrap Step 4 NOT started - check $LOG_FILE"
    fi

    # Test 1.1: .github/prompts/ directory exists
    if [ -d "$PROJECT_DIR/.github/prompts" ]; then
        log_pass ".github/prompts/ directory created"
    else
        log_fail ".github/prompts/ directory NOT created"
    fi

    # Test 1.2: .github/agents/ directory exists
    if [ -d "$PROJECT_DIR/.github/agents" ]; then
        log_pass ".github/agents/ directory created"
    else
        log_fail ".github/agents/ directory NOT created"
    fi

    # Test 1.3: Stub prompt files exist
    STUB_COUNT=$(ls -1 "$PROJECT_DIR/.github/prompts"/artk.*.prompt.md 2>/dev/null | wc -l)
    if [ "$STUB_COUNT" -gt 0 ]; then
        log_pass "Stub prompt files created ($STUB_COUNT files)"
    else
        log_fail "No stub prompt files created"
    fi

    # Test 1.4: Agent files exist
    AGENT_COUNT=$(ls -1 "$PROJECT_DIR/.github/agents"/artk.*.agent.md 2>/dev/null | wc -l)
    if [ "$AGENT_COUNT" -gt 0 ]; then
        log_pass "Agent files created ($AGENT_COUNT files)"
    else
        log_fail "No agent files created"
    fi

    # Test 1.5: Stub and agent counts match (excluding variant-info which is generated separately)
    STUB_COUNT_ADJUSTED=$(ls -1 "$PROJECT_DIR/.github/prompts"/artk.*.prompt.md 2>/dev/null | grep -v "variant-info" | wc -l)
    if [ "$STUB_COUNT_ADJUSTED" -eq "$AGENT_COUNT" ]; then
        log_pass "Stub count (excl. variant-info: $STUB_COUNT_ADJUSTED) matches agent count ($AGENT_COUNT)"
    else
        log_fail "Stub count (excl. variant-info: $STUB_COUNT_ADJUSTED) does NOT match agent count ($AGENT_COUNT)"
    fi

    # Test 1.6: Stub file has correct format (agent: property)
    STUB_FILE="$PROJECT_DIR/.github/prompts/artk.journey-propose.prompt.md"
    if [ -f "$STUB_FILE" ]; then
        if grep -q "^agent: artk.journey-propose" "$STUB_FILE"; then
            log_pass "Stub file has 'agent:' property"
        else
            log_fail "Stub file missing 'agent:' property"
        fi

        # Stub should NOT have full content (no "## Non-Negotiables" etc.)
        if ! grep -q "## Non" "$STUB_FILE"; then
            log_pass "Stub file is minimal (no full content)"
        else
            log_fail "Stub file contains full content (should be minimal)"
        fi
    else
        log_fail "Stub file not found: $STUB_FILE"
    fi

    # Test 1.7: Agent file has full content with handoffs
    AGENT_FILE="$PROJECT_DIR/.github/agents/artk.journey-propose.agent.md"
    if [ -f "$AGENT_FILE" ]; then
        if grep -q "^handoffs:" "$AGENT_FILE"; then
            log_pass "Agent file has 'handoffs:' property"
        else
            log_fail "Agent file missing 'handoffs:' property"
        fi

        # Agent should have full content
        if grep -q "## Non" "$AGENT_FILE" || grep -q "# ARTK /artk" "$AGENT_FILE"; then
            log_pass "Agent file has full content"
        else
            log_fail "Agent file missing full content"
        fi
    else
        log_fail "Agent file not found: $AGENT_FILE"
    fi

    # Test 1.8: All expected prompts are installed
    EXPECTED_PROMPTS=("artk.journey-propose" "artk.journey-define" "artk.journey-clarify" "artk.journey-implement" "artk.journey-validate" "artk.journey-verify" "artk.discover-foundation" "artk.init-playbook")
    for prompt in "${EXPECTED_PROMPTS[@]}"; do
        if [ -f "$PROJECT_DIR/.github/prompts/${prompt}.prompt.md" ] && [ -f "$PROJECT_DIR/.github/agents/${prompt}.agent.md" ]; then
            log_pass "Prompt/agent pair exists: $prompt"
        else
            log_fail "Prompt/agent pair missing: $prompt"
        fi
    done

    # Test 1.9: [H1] Cross-reference validation - verify stub's agent: property references existing agent
    echo -e "${CYAN}Validating cross-references (stub -> agent)...${NC}"
    CROSS_REF_ERRORS=0
    for stub in "$PROJECT_DIR/.github/prompts"/artk.*.prompt.md; do
        if [ -f "$stub" ]; then
            filename=$(basename "$stub")
            # Skip variant-info - it's not a delegation stub
            if [[ "$filename" == *"variant-info"* ]]; then
                continue
            fi

            # Extract agent: property value
            AGENT_REF=$(grep "^agent:" "$stub" 2>/dev/null | sed 's/^agent: *//')
            if [ -n "$AGENT_REF" ]; then
                # Check if referenced agent file exists
                EXPECTED_AGENT="$PROJECT_DIR/.github/agents/${AGENT_REF}.agent.md"
                if [ -f "$EXPECTED_AGENT" ]; then
                    log_pass "Cross-ref valid: $filename -> ${AGENT_REF}.agent.md"
                else
                    log_fail "Cross-ref BROKEN: $filename references non-existent agent: $AGENT_REF"
                    CROSS_REF_ERRORS=$((CROSS_REF_ERRORS + 1))
                fi
            else
                log_fail "Cross-ref MISSING: $filename has no agent: property"
                CROSS_REF_ERRORS=$((CROSS_REF_ERRORS + 1))
            fi
        fi
    done

    if [ "$CROSS_REF_ERRORS" -eq 0 ]; then
        log_pass "All stub->agent cross-references are valid"
    fi
}

# ============================================================================
# TEST 2: Upgrade from Old Installation
# ============================================================================
test_upgrade_install() {
    log_test "Upgrade Install - Migration from Old Structure"

    local PROJECT_DIR="$TEST_DIR/upgrade-install"
    local LOG_FILE="$TEST_DIR/upgrade-install-bootstrap.log"
    mkdir -p "$PROJECT_DIR/.github/prompts"
    mkdir -p "$PROJECT_DIR/artk-e2e"

    # Create old-style full content prompt file (NO agent: property - key detection heuristic)
    cat > "$PROJECT_DIR/.github/prompts/artk.journey-propose.prompt.md" << 'OLD_CONTENT'
---
name: artk.journey-propose
mode: agent
description: "Old style full content prompt"
handoffs:
  - label: "Test"
    agent: test
---
# ARTK /artk.journey-propose — Old Content

This is old full content that should be backed up and replaced.

## Non-Negotiables
- Old content here
OLD_CONTENT

    # Create another old prompt (also no agent: property)
    cat > "$PROJECT_DIR/.github/prompts/artk.journey-define.prompt.md" << 'OLD_CONTENT2'
---
name: artk.journey-define
description: "Old journey define"
---
# ARTK Journey Define Old

Old content
OLD_CONTENT2

    echo -e "${CYAN}Running bootstrap on existing project (upgrade scenario)...${NC}"
    # [H3] Capture bootstrap output to log file for debugging
    "$ARTK_REPO/scripts/bootstrap.sh" "$PROJECT_DIR" --skip-npm --skip-llkb --yes > "$LOG_FILE" 2>&1 || true

    # Verify upgrade was detected
    if grep -qi "upgrading to two-tier" "$LOG_FILE"; then
        log_pass "Bootstrap detected upgrade scenario"
    else
        echo -e "${YELLOW}! WARN: Bootstrap may not have detected upgrade (check $LOG_FILE)${NC}"
    fi

    # Test 2.1: Backup was created
    BACKUP_COUNT=$(ls -1d "$PROJECT_DIR/.github/prompts.backup-"* 2>/dev/null | wc -l)
    if [ "$BACKUP_COUNT" -gt 0 ]; then
        log_pass "Backup directory created"
    else
        log_fail "No backup directory created during upgrade"
    fi

    # Test 2.2: Backup contains old content
    BACKUP_DIR=$(ls -1d "$PROJECT_DIR/.github/prompts.backup-"* 2>/dev/null | head -1)
    if [ -n "$BACKUP_DIR" ] && [ -f "$BACKUP_DIR/artk.journey-propose.prompt.md" ]; then
        if grep -q "Old style full content" "$BACKUP_DIR/artk.journey-propose.prompt.md"; then
            log_pass "Backup contains original old content"
        else
            log_fail "Backup does not contain original content"
        fi
    else
        log_fail "Backup file not found"
    fi

    # Test 2.3: New stub files replaced old content
    STUB_FILE="$PROJECT_DIR/.github/prompts/artk.journey-propose.prompt.md"
    if grep -q "^agent: artk.journey-propose" "$STUB_FILE"; then
        log_pass "Old prompt replaced with new stub"
    else
        log_fail "Old prompt NOT replaced with stub"
    fi

    # Test 2.4: Agents directory was created
    if [ -d "$PROJECT_DIR/.github/agents" ]; then
        log_pass ".github/agents/ directory created during upgrade"
    else
        log_fail ".github/agents/ directory NOT created during upgrade"
    fi

    # Test 2.5: Agent files have full content
    AGENT_FILE="$PROJECT_DIR/.github/agents/artk.journey-propose.agent.md"
    if [ -f "$AGENT_FILE" ] && grep -q "handoffs:" "$AGENT_FILE"; then
        log_pass "Agent file created with handoffs during upgrade"
    else
        log_fail "Agent file not properly created during upgrade"
    fi
}

# ============================================================================
# TEST 3: Stub File Format Validation
# ============================================================================
test_stub_format() {
    log_test "Stub File Format Validation"

    local PROJECT_DIR="$TEST_DIR/format-test"
    local LOG_FILE="$TEST_DIR/format-test-bootstrap.log"
    mkdir -p "$PROJECT_DIR"

    "$ARTK_REPO/scripts/bootstrap.sh" "$PROJECT_DIR" --skip-npm --skip-llkb --yes > "$LOG_FILE" 2>&1 || true

    # Check each stub file for required format (excluding variant-info which is generated separately)
    for stub in "$PROJECT_DIR/.github/prompts"/artk.*.prompt.md; do
        if [ -f "$stub" ]; then
            filename=$(basename "$stub")

            # Skip variant-info - it's generated differently (not a delegation stub)
            if [[ "$filename" == *"variant-info"* ]]; then
                continue
            fi

            # Must have YAML frontmatter
            if head -1 "$stub" | grep -q "^---"; then
                log_pass "$filename has YAML frontmatter"
            else
                log_fail "$filename missing YAML frontmatter"
            fi

            # Must have name: property
            if grep -q "^name:" "$stub"; then
                log_pass "$filename has name: property"
            else
                log_fail "$filename missing name: property"
            fi

            # Must have description: property
            if grep -q "^description:" "$stub"; then
                log_pass "$filename has description: property"
            else
                log_fail "$filename missing description: property"
            fi

            # Must have agent: property
            if grep -q "^agent:" "$stub"; then
                log_pass "$filename has agent: property"
            else
                log_fail "$filename missing agent: property"
            fi

            # File should be small (< 700 bytes for stub - allows for longer descriptions)
            SIZE=$(wc -c < "$stub")
            if [ "$SIZE" -lt 700 ]; then
                log_pass "$filename is minimal size ($SIZE bytes)"
            else
                log_fail "$filename is too large for stub ($SIZE bytes)"
            fi
        fi
    done
}

# ============================================================================
# TEST 4: Agent File Content Validation
# ============================================================================
test_agent_content() {
    log_test "Agent File Content Validation"

    local PROJECT_DIR="$TEST_DIR/agent-test"
    local LOG_FILE="$TEST_DIR/agent-test-bootstrap.log"
    mkdir -p "$PROJECT_DIR"

    "$ARTK_REPO/scripts/bootstrap.sh" "$PROJECT_DIR" --skip-npm --skip-llkb --yes > "$LOG_FILE" 2>&1 || true

    # Check each agent file for required content
    for agent in "$PROJECT_DIR/.github/agents"/artk.*.agent.md; do
        if [ -f "$agent" ]; then
            filename=$(basename "$agent")

            # Should have YAML frontmatter with handoffs (warn if missing, don't fail)
            # Some prompts like artk.uninstall may not have handoffs
            if grep -q "^handoffs:" "$agent"; then
                log_pass "$filename has handoffs: property"
            else
                echo -e "${YELLOW}! WARN: $filename missing handoffs: property (optional)${NC}"
            fi

            # Must have substantial content (> 1000 bytes)
            SIZE=$(wc -c < "$agent")
            if [ "$SIZE" -gt 1000 ]; then
                log_pass "$filename has substantial content ($SIZE bytes)"
            else
                log_fail "$filename content too small ($SIZE bytes)"
            fi

            # Should have markdown headers
            if grep -q "^#" "$agent"; then
                log_pass "$filename has markdown headers"
            else
                log_fail "$filename missing markdown headers"
            fi
        fi
    done
}

# ============================================================================
# TEST 5: Common Files Still Work
# ============================================================================
test_common_files() {
    log_test "Common Files and Next-Commands Installation"

    local PROJECT_DIR="$TEST_DIR/common-test"
    local LOG_FILE="$TEST_DIR/common-test-bootstrap.log"
    mkdir -p "$PROJECT_DIR"

    "$ARTK_REPO/scripts/bootstrap.sh" "$PROJECT_DIR" --skip-npm --skip-llkb --yes > "$LOG_FILE" 2>&1 || true

    # Test common/GENERAL_RULES.md still installed
    if [ -f "$PROJECT_DIR/.github/prompts/common/GENERAL_RULES.md" ]; then
        log_pass "common/GENERAL_RULES.md installed"
    else
        log_fail "common/GENERAL_RULES.md NOT installed"
    fi

    # Test next-commands still installed
    if [ -d "$PROJECT_DIR/.github/prompts/next-commands" ]; then
        NEXT_CMD_COUNT=$(ls -1 "$PROJECT_DIR/.github/prompts/next-commands"/*.txt 2>/dev/null | wc -l)
        if [ "$NEXT_CMD_COUNT" -gt 0 ]; then
            log_pass "next-commands files installed ($NEXT_CMD_COUNT files)"
        else
            log_fail "next-commands directory empty"
        fi
    else
        log_fail "next-commands directory NOT created"
    fi
}

# ============================================================================
# MAIN
# ============================================================================
main() {
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║  ARTK Two-Tier Architecture Test Suite                         ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "Test directory: ${CYAN}$TEST_DIR${NC}"
    echo -e "ARTK repo: ${CYAN}$ARTK_REPO${NC}"

    mkdir -p "$TEST_DIR"

    test_fresh_install
    test_upgrade_install
    test_stub_format
    test_agent_content
    test_common_files

    echo -e "\n${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║  TEST RESULTS                                                   ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}Passed: $PASSED${NC}"
    echo -e "${RED}Failed: $FAILED${NC}"

    if [ "$FAILED" -gt 0 ]; then
        echo -e "\n${RED}Some tests failed!${NC}"
        exit 1
    else
        echo -e "\n${GREEN}All tests passed!${NC}"
        exit 0
    fi
}

main "$@"
