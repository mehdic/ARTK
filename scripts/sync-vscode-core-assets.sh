#!/bin/bash
# Sync Core dist, AutoGen dist, and bootstrap templates to VS Code extension assets
# Follows the same atomic-staging pattern as sync-vscode-journeys.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

CORE_SOURCE="$REPO_ROOT/core/typescript"
AUTOGEN_SOURCE="$REPO_ROOT/core/typescript/autogen"
BOOTSTRAP_SOURCE="$REPO_ROOT/templates/bootstrap"
ASSETS_DIR="$REPO_ROOT/packages/vscode-extension/assets"

CORE_TARGET="$ASSETS_DIR/core"
AUTOGEN_TARGET="$ASSETS_DIR/autogen"
BOOTSTRAP_TARGET="$ASSETS_DIR/bootstrap-templates"

# Trap handler to clean up staging and .old directories on failure
cleanup() {
  for dir in "$CORE_TARGET.staging.$$" "$AUTOGEN_TARGET.staging.$$" "$BOOTSTRAP_TARGET.staging.$$" \
             "$CORE_TARGET.old.$$" "$AUTOGEN_TARGET.old.$$" "$BOOTSTRAP_TARGET.old.$$"; do
    if [ -d "$dir" ]; then
      rm -rf "$dir" 2>/dev/null || true
    fi
  done
}
trap cleanup EXIT

error() {
  echo "ERROR: $*" >&2
}

echo "Syncing VS Code extension core assets..."

# ── Verify source directories ──────────────────────────────────────

if [ ! -d "$CORE_SOURCE/dist" ]; then
  error "Core dist not found at: $CORE_SOURCE/dist"
  error "Run 'npm run build' in core/typescript/ first."
  exit 1
fi

if [ ! -d "$AUTOGEN_SOURCE/dist" ]; then
  error "AutoGen dist not found at: $AUTOGEN_SOURCE/dist"
  error "Run 'npm run build' in core/typescript/autogen/ first."
  exit 1
fi

if [ ! -d "$BOOTSTRAP_SOURCE" ]; then
  error "Bootstrap templates not found at: $BOOTSTRAP_SOURCE"
  exit 1
fi

# FIX EDGE-01: Check for empty source directories
if [ -z "$(ls -A "$BOOTSTRAP_SOURCE" 2>/dev/null)" ]; then
  error "Bootstrap templates directory is empty: $BOOTSTRAP_SOURCE"
  exit 1
fi

# ── Security checks on targets ─────────────────────────────────────

for target in "$CORE_TARGET" "$AUTOGEN_TARGET" "$BOOTSTRAP_TARGET"; do
  if [ -L "$target" ]; then
    error "Target is a symlink, refusing to continue for security: $target"
    exit 1
  fi
done

# FIX MISS-04: Warn if source contains symlinks (matching sync-vscode-journeys.sh)
for src_dir in "$CORE_SOURCE/dist" "$AUTOGEN_SOURCE/dist" "$BOOTSTRAP_SOURCE"; do
  if find "$src_dir" -type l 2>/dev/null | grep -q .; then
    echo "WARNING: Source contains symlinks ($src_dir) - they will be copied as symlinks (not followed)" >&2
  fi
done

# ── Strip package.json helper ──────────────────────────────────────
# FIX SEC-01: Pass paths via process.argv to avoid path injection

strip_package_json() {
  local src="$1"
  local dest="$2"
  if [ ! -f "$src" ]; then
    error "Source package.json not found: $src"
    return 1
  fi
  node -e "
    const [, src, dest] = process.argv;
    const pkg = JSON.parse(require('fs').readFileSync(src, 'utf-8'));
    delete pkg.devDependencies;
    delete pkg.scripts;
    pkg.private = true;
    require('fs').writeFileSync(dest, JSON.stringify(pkg, null, 2));
  " -- "$src" "$dest"
}

# FIX ATM-02: Safe atomic swap using rename-old pattern instead of rm-then-mv
atomic_swap() {
  local staging="$1"
  local target="$2"
  if [ -d "$target" ]; then
    mv "$target" "$target.old.$$"
  fi
  mv "$staging" "$target"
  rm -rf "$target.old.$$" 2>/dev/null || true
}

# ── 1. Sync Core ───────────────────────────────────────────────────

echo "  1/3 Syncing @artk/core..."

CORE_STAGING="$CORE_TARGET.staging.$$"
rm -rf "$CORE_TARGET".staging.* 2>/dev/null || true
mkdir -p "$CORE_STAGING"

# Copy dist
cp -PR "$CORE_SOURCE/dist" "$CORE_STAGING/dist"

# Copy templates
if [ -d "$CORE_SOURCE/templates" ]; then
  cp -PR "$CORE_SOURCE/templates" "$CORE_STAGING/templates"
fi

# Copy version.json
if [ -f "$CORE_SOURCE/version.json" ]; then
  cp -P "$CORE_SOURCE/version.json" "$CORE_STAGING/version.json"
fi

# Strip and copy package.json
strip_package_json "$CORE_SOURCE/package.json" "$CORE_STAGING/package.json"

# Remove .DS_Store files
find "$CORE_STAGING" -name ".DS_Store" -delete 2>/dev/null || true

# Verify critical files
CORE_CRITICAL=(
  "dist/index.js"
  "dist/llkb/index.js"
  "package.json"
)
for file in "${CORE_CRITICAL[@]}"; do
  if [ ! -f "$CORE_STAGING/$file" ]; then
    error "Post-copy verification failed - core/$file not found"
    exit 1
  fi
done

# Copy CJS helpers (bootstrap-llkb.cjs, verify-llkb-artifacts.cjs)
HELPERS_DIR="$REPO_ROOT/scripts/helpers"
for helper in bootstrap-llkb.cjs verify-llkb-artifacts.cjs; do
  if [ -f "$HELPERS_DIR/$helper" ]; then
    cp -P "$HELPERS_DIR/$helper" "$CORE_STAGING/$helper"
  fi
done

# Atomic swap (rename-old pattern)
atomic_swap "$CORE_STAGING" "$CORE_TARGET"
echo "     core/dist/, templates/, package.json (stripped), version.json, CJS helpers"

# ── 2. Sync AutoGen ────────────────────────────────────────────────

echo "  2/3 Syncing @artk/core-autogen..."

AUTOGEN_STAGING="$AUTOGEN_TARGET.staging.$$"
rm -rf "$AUTOGEN_TARGET".staging.* 2>/dev/null || true
mkdir -p "$AUTOGEN_STAGING"

# Copy dist
cp -PR "$AUTOGEN_SOURCE/dist" "$AUTOGEN_STAGING/dist"

# Strip and copy package.json
strip_package_json "$AUTOGEN_SOURCE/package.json" "$AUTOGEN_STAGING/package.json"

# Remove .DS_Store files
find "$AUTOGEN_STAGING" -name ".DS_Store" -delete 2>/dev/null || true

# Verify critical files
AUTOGEN_CRITICAL=(
  "dist/cli/index.js"
  "dist/mapping/index.js"
  "package.json"
)
for file in "${AUTOGEN_CRITICAL[@]}"; do
  if [ ! -f "$AUTOGEN_STAGING/$file" ]; then
    error "Post-copy verification failed - autogen/$file not found"
    exit 1
  fi
done

# Atomic swap (rename-old pattern)
atomic_swap "$AUTOGEN_STAGING" "$AUTOGEN_TARGET"
echo "     autogen/dist/, package.json (stripped)"

# ── 3. Sync Bootstrap Templates ────────────────────────────────────

echo "  3/3 Syncing bootstrap templates..."

BOOTSTRAP_STAGING="$BOOTSTRAP_TARGET.staging.$$"
rm -rf "$BOOTSTRAP_TARGET".staging.* 2>/dev/null || true
mkdir -p "$BOOTSTRAP_STAGING"

# Copy bootstrap template files
cp -PR "$BOOTSTRAP_SOURCE"/* "$BOOTSTRAP_STAGING/"

# Remove .DS_Store files
find "$BOOTSTRAP_STAGING" -name ".DS_Store" -delete 2>/dev/null || true

# FIX EDGE-03: Verify critical bootstrap template files
if [ ! -f "$BOOTSTRAP_STAGING/playwright.config.template.ts" ]; then
  error "Post-copy verification failed - bootstrap-templates/playwright.config.template.ts not found"
  exit 1
fi

# Atomic swap (rename-old pattern)
atomic_swap "$BOOTSTRAP_STAGING" "$BOOTSTRAP_TARGET"
echo "     bootstrap-templates/"

echo "Done: VS Code extension core assets synced"
