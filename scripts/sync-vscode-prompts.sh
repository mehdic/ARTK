#!/bin/bash
# Sync prompts from source to VS Code extension assets
# This ensures the extension installer has the latest prompts

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

SOURCE_DIR="$REPO_ROOT/prompts"
TARGET_DIR="$REPO_ROOT/packages/vscode-extension/assets/prompts"

echo "Syncing VS Code extension prompts..."

# Sync main prompt files
for file in "$SOURCE_DIR"/artk.*.md; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        cp "$file" "$TARGET_DIR/$filename"
    fi
done

# Sync next-commands directory
if [ -d "$SOURCE_DIR/next-commands" ]; then
    mkdir -p "$TARGET_DIR/next-commands"
    cp "$SOURCE_DIR/next-commands"/*.txt "$TARGET_DIR/next-commands/" 2>/dev/null || true
fi

# Sync common directory
if [ -d "$SOURCE_DIR/common" ]; then
    mkdir -p "$TARGET_DIR/common"
    cp "$SOURCE_DIR/common"/*.md "$TARGET_DIR/common/" 2>/dev/null || true
fi

echo "✓ VS Code extension prompts synced"
