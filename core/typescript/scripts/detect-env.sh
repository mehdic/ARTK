#!/usr/bin/env bash
#
# detect-env.sh - Environment detection script for Unix/macOS/Linux
# Detects CommonJS vs ESM module system and outputs JSON result
#
# Usage:
#   ./detect-env.sh [project-root]
#
# Output: JSON object with detection results
#

set -euo pipefail

# Get project root (default to current directory)
PROJECT_ROOT="${1:-.}"

# Ensure project root exists
if [ ! -d "$PROJECT_ROOT" ]; then
  echo "{\"error\": \"Project root does not exist: $PROJECT_ROOT\"}" >&2
  exit 1
fi

# Change to project root
cd "$PROJECT_ROOT"

# Function to detect module system from package.json
detect_from_package_json() {
  if [ ! -f "package.json" ]; then
    echo "unknown"
    return
  fi

  # Extract "type" field from package.json
  local package_type
  package_type=$(node -e "
    try {
      const pkg = require('./package.json');
      console.log(pkg.type || 'commonjs');
    } catch (e) {
      console.log('unknown');
    }
  " 2>/dev/null || echo "unknown")

  echo "$package_type"
}

# Function to detect module system from tsconfig.json
detect_from_tsconfig() {
  if [ ! -f "tsconfig.json" ]; then
    echo "unknown"
    return
  fi

  # Extract "module" field from tsconfig.json
  local ts_module
  ts_module=$(node -e "
    const stripJsonComments = require('strip-json-comments');
    const fs = require('fs');
    try {
      const content = fs.readFileSync('tsconfig.json', 'utf8');
      const stripped = stripJsonComments(content);
      const tsconfig = JSON.parse(stripped);
      const module = tsconfig.compilerOptions?.module || 'unknown';
      console.log(module);
    } catch (e) {
      console.log('unknown');
    }
  " 2>/dev/null || echo "unknown")

  echo "$ts_module"
}

# Function to determine final module system
determine_module_system() {
  local package_type="$1"
  local ts_module="$2"

  # ESM indicators
  if [ "$package_type" = "module" ]; then
    echo "esm"
    return
  fi

  case "$ts_module" in
    ESNext|ES2020|ES2022|NodeNext)
      echo "esm"
      return
      ;;
  esac

  # CommonJS indicators
  if [ "$package_type" = "commonjs" ]; then
    echo "commonjs"
    return
  fi

  if [ "$ts_module" = "CommonJS" ]; then
    echo "commonjs"
    return
  fi

  # Default
  echo "unknown"
}

# Function to determine confidence
determine_confidence() {
  local package_type="$1"
  local ts_module="$2"
  local module_system="$3"

  # High confidence: both package.json and tsconfig.json agree
  if [ "$module_system" = "esm" ]; then
    if [ "$package_type" = "module" ] && [[ "$ts_module" =~ ^(ESNext|ES2020|ES2022|NodeNext)$ ]]; then
      echo "high"
      return
    fi
  fi

  if [ "$module_system" = "commonjs" ]; then
    if [ "$package_type" = "commonjs" ] && [ "$ts_module" = "CommonJS" ]; then
      echo "high"
      return
    fi
  fi

  # Medium confidence: one indicator
  if [ "$package_type" != "unknown" ] || [ "$ts_module" != "unknown" ]; then
    echo "medium"
    return
  fi

  # Low confidence: no indicators
  echo "low"
}

# Main detection
main() {
  # Detect Node.js version
  local node_version
  node_version=$(node --version 2>/dev/null | sed 's/^v//' || echo "unknown")

  # Detect from package.json
  local package_type
  package_type=$(detect_from_package_json)

  # Detect from tsconfig.json
  local ts_module
  ts_module=$(detect_from_tsconfig)

  # Determine final module system
  local module_system
  module_system=$(determine_module_system "$package_type" "$ts_module")

  # Determine confidence
  local confidence
  confidence=$(determine_confidence "$package_type" "$ts_module" "$module_system")

  # Output JSON
  cat <<EOF
{
  "projectRoot": "$(pwd)",
  "detection": {
    "nodeVersion": "$node_version",
    "moduleSystem": "$module_system",
    "packageType": $([ "$package_type" = "unknown" ] && echo "null" || echo "\"$package_type\""),
    "tsConfigModule": $([ "$ts_module" = "unknown" ] && echo "null" || echo "\"$ts_module\""),
    "confidence": "$confidence"
  },
  "validation": {
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "valid": true,
    "errors": []
  }
}
EOF
}

# Run main
main
