#!/usr/bin/env bash
#
# validate-generated.sh - Validation script for generated foundation modules
# Validates that generated code matches the detected environment
#
# Usage:
#   ./validate-generated.sh [project-root]
#
# Exit codes:
#   0 - Validation passed
#   1 - Validation failed
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get project root (default to current directory)
PROJECT_ROOT="${1:-.}"

# Ensure project root exists
if [ ! -d "$PROJECT_ROOT" ]; then
  echo -e "${RED}✗ Project root does not exist: $PROJECT_ROOT${NC}" >&2
  exit 1
fi

# Change to project root
cd "$PROJECT_ROOT"

echo "Validating generated foundation modules..."
echo "Project root: $(pwd)"
echo ""

# Check if artk-e2e directory exists
if [ ! -d "artk-e2e" ]; then
  echo -e "${YELLOW}⚠ No artk-e2e directory found. Skipping validation.${NC}"
  exit 0
fi

# Check if foundation modules exist
FOUNDATION_DIR="artk-e2e/foundation"
if [ ! -d "$FOUNDATION_DIR" ]; then
  echo -e "${YELLOW}⚠ No foundation directory found. Skipping validation.${NC}"
  exit 0
fi

# Run validation using Node.js
VALIDATION_RESULT=$(node -e "
const path = require('path');
const fs = require('fs');

// Import validation runner
const validationModule = require('@artk/core/validation');
const { runValidation } = validationModule;

// Run validation
const projectRoot = process.cwd();
runValidation(projectRoot)
  .then(result => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.valid ? 0 : 1);
  })
  .catch(error => {
    console.error(JSON.stringify({
      valid: false,
      errors: [{
        rule: 'validation-error',
        file: 'unknown',
        message: error.message
      }]
    }, null, 2));
    process.exit(1);
  });
" 2>&1 || echo '{"valid": false, "errors": [{"rule": "script-error", "message": "Validation script failed"}]}')

# Parse validation result
VALID=$(echo "$VALIDATION_RESULT" | node -e "
  const stdin = require('fs').readFileSync(0, 'utf-8');
  try {
    const result = JSON.parse(stdin);
    console.log(result.valid ? 'true' : 'false');
  } catch (e) {
    console.log('false');
  }
")

# Check result
if [ "$VALID" = "true" ]; then
  echo -e "${GREEN}✓ Validation passed${NC}"
  echo ""
  echo "Generated foundation modules are compatible with detected environment."
  exit 0
else
  echo -e "${RED}✗ Validation failed${NC}"
  echo ""
  echo "Errors found:"
  echo "$VALIDATION_RESULT" | node -e "
    const stdin = require('fs').readFileSync(0, 'utf-8');
    try {
      const result = JSON.parse(stdin);
      if (result.errors && result.errors.length > 0) {
        result.errors.forEach(error => {
          console.log('  - ' + error.file + ': ' + error.message);
        });
      }
    } catch (e) {
      console.log('  - Failed to parse validation errors');
    }
  "
  echo ""
  echo "Generated code does not match detected environment."
  echo "Run with --force-detect to re-detect and regenerate."
  exit 1
fi
