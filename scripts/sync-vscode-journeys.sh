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
  echo "ERROR: Journey Core not found at: $SOURCE_DIR"
  echo "Expected structure: core/artk-core-journeys/artk-core-journeys/"
  exit 1
fi

# Verify source is not empty
if [ -z "$(ls -A "$SOURCE_DIR" 2>/dev/null)" ]; then
  echo "ERROR: Source directory is empty: $SOURCE_DIR"
  exit 1
fi

# P1 FIX: Atomic operation using staging directory
# This prevents corrupted state if interrupted mid-copy
STAGING_DIR="$TARGET_DIR.staging.$$"

# Clean up any leftover staging directories
rm -rf "$TARGET_DIR".staging.* 2>/dev/null || true

# Create staging directory
mkdir -p "$STAGING_DIR"

# Copy journey core files to staging
cp -R "$SOURCE_DIR"/* "$STAGING_DIR/"

# Remove .DS_Store files from staging
find "$STAGING_DIR" -name ".DS_Store" -delete 2>/dev/null || true

# P1 FIX: Atomic swap - remove old, rename staging to target
# This ensures hidden files are also removed (rm -rf /* doesn't remove dotfiles)
rm -rf "$TARGET_DIR"
mv "$STAGING_DIR" "$TARGET_DIR"

# Verify critical files exist after copy
if [ ! -f "$TARGET_DIR/core.manifest.json" ]; then
  echo "ERROR: Post-copy verification failed - core.manifest.json not found"
  exit 1
fi

echo "Done: VS Code extension journeys synced"
