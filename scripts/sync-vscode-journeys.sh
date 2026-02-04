#!/bin/bash
# Sync Journey Core to VS Code extension assets

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

SOURCE_DIR="$REPO_ROOT/core/artk-core-journeys/artk-core-journeys"
TARGET_DIR="$REPO_ROOT/packages/vscode-extension/assets/journeys"

echo "Syncing VS Code extension journeys..."

# Verify source exists
if [ ! -d "$SOURCE_DIR" ]; then
  echo "ERROR: Source directory not found: $SOURCE_DIR"
  exit 1
fi

# Create target directory
mkdir -p "$TARGET_DIR"

# Remove old files
rm -rf "$TARGET_DIR"/*

# Copy journey core files
cp -R "$SOURCE_DIR"/* "$TARGET_DIR/"

# Remove .DS_Store files
find "$TARGET_DIR" -name ".DS_Store" -delete 2>/dev/null || true

echo "✓ VS Code extension journeys synced"
