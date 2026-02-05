#!/bin/bash
# Sync Journey Core to VS Code extension assets

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

SOURCE_DIR="$REPO_ROOT/core/artk-core-journeys/artk-core-journeys"
TARGET_DIR="$REPO_ROOT/packages/vscode-extension/assets/journeys"

# FIX Issue 4: Trap handler to clean up staging directory on failure
STAGING_DIR=""
cleanup() {
  if [ -n "$STAGING_DIR" ] && [ -d "$STAGING_DIR" ]; then
    rm -rf "$STAGING_DIR" 2>/dev/null || true
  fi
}
trap cleanup EXIT

echo "Syncing VS Code extension journeys..."

# FIX Issue 9: Send errors to stderr
error() {
  echo "ERROR: $*" >&2
}

# Verify source exists
if [ ! -d "$SOURCE_DIR" ]; then
  error "Journey Core not found at: $SOURCE_DIR"
  error "Expected structure: core/artk-core-journeys/artk-core-journeys/"
  exit 1
fi

# Verify source is not empty
if [ -z "$(ls -A "$SOURCE_DIR" 2>/dev/null)" ]; then
  error "Source directory is empty: $SOURCE_DIR"
  exit 1
fi

# FIX Issue 7: Check if target is a symlink (security check)
if [ -L "$TARGET_DIR" ]; then
  error "Target is a symlink, refusing to continue for security: $TARGET_DIR"
  exit 1
fi

# FIX Issue 6: Check if source contains symlinks and warn
if find "$SOURCE_DIR" -type l 2>/dev/null | grep -q .; then
  echo "WARNING: Source contains symlinks - they will be copied as symlinks (not followed)" >&2
fi

# Atomic operation using staging directory
# This prevents corrupted state if interrupted mid-copy
STAGING_DIR="$TARGET_DIR.staging.$$"

# Clean up any leftover staging directories from previous runs
rm -rf "$TARGET_DIR".staging.* 2>/dev/null || true

# Create staging directory
mkdir -p "$STAGING_DIR"

# FIX Issue 6: Copy journey core files to staging
# Use -P to preserve symlinks (don't follow them) for security
# Use -R for recursive copy
cp -PR "$SOURCE_DIR"/* "$STAGING_DIR/"

# Remove .DS_Store files from staging
find "$STAGING_DIR" -name ".DS_Store" -delete 2>/dev/null || true

# Post-copy verification for critical files
CRITICAL_FILES=(
  "core.manifest.json"
  "journeys/schema/journey.frontmatter.schema.json"
)
for file in "${CRITICAL_FILES[@]}"; do
  if [ ! -f "$STAGING_DIR/$file" ]; then
    error "Post-copy verification failed - $file not found"
    exit 1
  fi
done

# Atomic swap - remove old, rename staging to target
# This ensures hidden files are also removed (rm -rf /* doesn't remove dotfiles)
rm -rf "$TARGET_DIR"
mv "$STAGING_DIR" "$TARGET_DIR"

# Clear staging dir variable so trap doesn't try to clean it up
STAGING_DIR=""

echo "Done: VS Code extension journeys synced"
