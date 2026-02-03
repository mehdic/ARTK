#!/bin/bash
# Sync assets for VS Code extension
# This script copies source files to the extension's assets directory
# Run manually or add to pre-commit hook

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Source locations
JOURNEYS_SRC="$REPO_ROOT/core/artk-core-journeys/artk-core-journeys"
AUTOGEN_SRC="$REPO_ROOT/core/typescript/autogen/dist"
CORE_SRC="$REPO_ROOT/core/typescript/dist"
PROMPTS_SRC="$REPO_ROOT/prompts"

# Destination
ASSETS_DIR="$REPO_ROOT/packages/vscode-extension/assets"

echo "=== Syncing VS Code Extension Assets ==="
echo ""

# Sync journeys
if [ -d "$JOURNEYS_SRC" ]; then
    echo "[1/4] Syncing journeys..."
    rm -rf "$ASSETS_DIR/journeys"
    mkdir -p "$ASSETS_DIR/journeys"
    cp -r "$JOURNEYS_SRC"/* "$ASSETS_DIR/journeys/"
    echo "  ✓ Copied journeys from core/artk-core-journeys"
else
    echo "  ⚠ Journeys source not found at $JOURNEYS_SRC"
fi

# Sync autogen
if [ -d "$AUTOGEN_SRC" ]; then
    echo "[2/4] Syncing autogen..."
    rm -rf "$ASSETS_DIR/autogen"
    mkdir -p "$ASSETS_DIR/autogen"
    cp -r "$AUTOGEN_SRC"/* "$ASSETS_DIR/autogen/"
    echo "  ✓ Copied autogen dist"
else
    echo "  ⚠ Autogen dist not found at $AUTOGEN_SRC"
fi

# Sync core
if [ -d "$CORE_SRC" ]; then
    echo "[3/4] Syncing core..."
    rm -rf "$ASSETS_DIR/core"
    mkdir -p "$ASSETS_DIR/core"
    cp -r "$CORE_SRC"/* "$ASSETS_DIR/core/"
    echo "  ✓ Copied core dist"
else
    echo "  ⚠ Core dist not found at $CORE_SRC"
fi

# Sync prompts (including common/ and next-commands/)
if [ -d "$PROMPTS_SRC" ]; then
    echo "[4/4] Syncing prompts..."
    rm -rf "$ASSETS_DIR/prompts"
    mkdir -p "$ASSETS_DIR/prompts"

    # Copy artk.*.md files
    for f in "$PROMPTS_SRC"/artk.*.md; do
        [ -f "$f" ] && cp "$f" "$ASSETS_DIR/prompts/"
    done

    # Copy common/ directory
    if [ -d "$PROMPTS_SRC/common" ]; then
        cp -r "$PROMPTS_SRC/common" "$ASSETS_DIR/prompts/"
        echo "  ✓ Copied common/ (shared rules)"
    fi

    # Copy next-commands/ directory
    if [ -d "$PROMPTS_SRC/next-commands" ]; then
        cp -r "$PROMPTS_SRC/next-commands" "$ASSETS_DIR/prompts/"
        echo "  ✓ Copied next-commands/ (handoff files)"
    fi

    echo "  ✓ Copied prompts from prompts/"
else
    echo "  ⚠ Prompts source not found at $PROMPTS_SRC"
fi

echo ""
echo "=== Sync Complete ==="
echo ""
echo "Assets directory contents:"
ls -la "$ASSETS_DIR"
