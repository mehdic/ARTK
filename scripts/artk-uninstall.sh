#!/bin/bash
#
# ARTK Uninstall Script (Bash)
# Usage: ./artk-uninstall.sh [--dry-run] [--yes] [--root <path>]
#
# This script removes ARTK-installed assets from a client repo.
# It is destructive and requires confirmation unless --yes is provided.
#

set -euo pipefail

DRY_RUN=false
ASSUME_YES=false
ROOT_ARG=""

usage() {
  cat <<'USAGE'
ARTK Uninstall Script

Usage:
  ./artk-uninstall.sh [--dry-run] [--yes] [--root <path>]

Options:
  --dry-run   Show planned removals only
  --yes       Skip confirmation prompt
  --root      Repo root (defaults to git root or current directory)
USAGE
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --dry-run)
      DRY_RUN=true
      ;;
    --yes)
      ASSUME_YES=true
      ;;
    --root)
      shift
      ROOT_ARG="${1:-}"
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1"
      usage
      exit 1
      ;;
  esac
  shift
done

resolve_repo_root() {
  local root=""
  if [ -n "$ROOT_ARG" ]; then
    root="$ROOT_ARG"
  else
    if command -v git >/dev/null 2>&1; then
      root=$(git -C . rev-parse --show-toplevel 2>/dev/null || true)
    fi
    if [ -z "$root" ]; then
      root=$(pwd)
    fi
  fi
  if [ -z "$root" ]; then
    echo "Unable to determine repo root." >&2
    exit 1
  fi
  (cd "$root" && pwd)
}

REPO_ROOT=$(resolve_repo_root)

log() {
  printf '%s\n' "$*"
}

warn() {
  printf 'WARN: %s\n' "$*" >&2
}

read_context_artk_root() {
  local context_file="$REPO_ROOT/.artk/context.json"
  if [ ! -f "$context_file" ]; then
    return 1
  fi

  if command -v node >/dev/null 2>&1; then
    node -e "const fs=require('fs');const data=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));if(data.artkRoot)process.stdout.write(String(data.artkRoot));" "$context_file" 2>/dev/null || true
    return 0
  fi

  if command -v python3 >/dev/null 2>&1; then
    python3 - "$context_file" <<'PY' 2>/dev/null || true
import json
import sys
try:
    with open(sys.argv[1], 'r') as handle:
        data = json.load(handle)
    value = data.get('artkRoot', '')
    if value:
        print(value)
except Exception:
    pass
PY
    return 0
  fi

  if command -v python >/dev/null 2>&1; then
    python - "$context_file" <<'PY' 2>/dev/null || true
import json
import sys
try:
    with open(sys.argv[1], 'r') as handle:
        data = json.load(handle)
    value = data.get('artkRoot', '')
    if value:
        print(value)
except Exception:
    pass
PY
    return 0
  fi

  return 1
}

normalize_path() {
  local path="$1"
  if [ -z "$path" ]; then
    echo ""
    return 0
  fi
  case "$path" in
    /*)
      echo "$path"
      ;;
    *)
      echo "$REPO_ROOT/$path"
      ;;
  esac
}

is_within_root() {
  local path="$1"
  case "$path" in
    "$REPO_ROOT"/*) return 0 ;;
    "$REPO_ROOT") return 0 ;;
    *) return 1 ;;
  esac
}

remove_artk_section_from_instructions() {
  local file="$REPO_ROOT/.github/copilot-instructions.md"
  if [ ! -f "$file" ]; then
    return 1
  fi
  if ! grep -q "^## ARTK E2E Testing Framework" "$file"; then
    return 2
  fi

  if [ "$DRY_RUN" = true ]; then
    log "DRY RUN: Would remove ARTK section from .github/copilot-instructions.md"
    return 0
  fi

  local tmp="$file.artk-uninstall.tmp"
  awk '
    BEGIN { skip=0 }
    /^## ARTK E2E Testing Framework[[:space:]]*$/ { skip=1; next }
    /^## / { if (skip) { skip=0 } }
    { if (!skip) print }
  ' "$file" > "$tmp"
  mv "$tmp" "$file"
  log "Updated .github/copilot-instructions.md (removed ARTK section)"
  return 0
}

remove_artk_dependencies() {
  local pkg="$REPO_ROOT/package.json"
  if [ ! -f "$pkg" ]; then
    return 1
  fi
  if [ "$DRY_RUN" = true ]; then
    log "DRY RUN: Would remove @artk/core dependencies from package.json"
    return 0
  fi
  if ! command -v node >/dev/null 2>&1; then
    warn "node not available; remove @artk/core and @artk/core-autogen from package.json manually"
    return 2
  fi

  local result
  result=$(node - "$pkg" <<'NODE'
const fs = require('fs');
const path = process.argv[1];
const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));
const fields = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];
let changed = false;
for (const field of fields) {
  if (!pkg[field]) continue;
  if (pkg[field]['@artk/core']) {
    delete pkg[field]['@artk/core'];
    changed = true;
  }
  if (pkg[field]['@artk/core-autogen']) {
    delete pkg[field]['@artk/core-autogen'];
    changed = true;
  }
  if (Object.keys(pkg[field]).length === 0) {
    delete pkg[field];
    changed = true;
  }
}
if (changed) {
  fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
  console.log('UPDATED');
} else {
  console.log('UNCHANGED');
}
NODE
  )

  if [ "$result" = "UPDATED" ]; then
    log "Updated package.json (removed @artk/core dependencies)"
  else
    log "package.json unchanged (no @artk/core dependencies found)"
  fi
  return 0
}

ROOTS=()
context_root=$(read_context_artk_root || true)
if [ -n "$context_root" ]; then
  context_root=$(normalize_path "$context_root")
  if is_within_root "$context_root"; then
    ROOTS+=("$context_root")
  fi
fi

if [ -d "$REPO_ROOT/artk-e2e" ]; then
  ROOTS+=("$REPO_ROOT/artk-e2e")
fi

if command -v find >/dev/null 2>&1; then
  while IFS= read -r cfg; do
    ROOTS+=("$(dirname "$cfg")")
  done < <(find "$REPO_ROOT" -maxdepth 4 -name 'artk.config.yml' \
    -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/dist/*' 2>/dev/null)
fi

ROOTS_UNIQ=()
if [ ${#ROOTS[@]} -gt 0 ]; then
  while IFS= read -r line; do
    ROOTS_UNIQ+=("$line")
  done < <(printf '%s\n' "${ROOTS[@]}" | awk 'NF && !seen[$0]++')
fi

ROOT_LEVEL_ARTK=false
if [ -f "$REPO_ROOT/artk.config.yml" ]; then
  ROOT_LEVEL_ARTK=true
fi
if [ -n "$context_root" ]; then
  resolved_context_root=$(cd "$context_root" 2>/dev/null && pwd || true)
  if [ -n "$resolved_context_root" ] && [ "$resolved_context_root" = "$REPO_ROOT" ]; then
    ROOT_LEVEL_ARTK=true
  fi
fi

REMOVE_DIRS=(
  "$REPO_ROOT/.artk"
  "$REPO_ROOT/vendor/artk-core"
  "$REPO_ROOT/vendor/artk-core-autogen"
)

REMOVE_FILES=(
  "$REPO_ROOT/artk.config.yml"
)

if [ "$ROOT_LEVEL_ARTK" = true ]; then
  REMOVE_DIRS+=(
    "$REPO_ROOT/journeys"
    "$REPO_ROOT/tools/journeys"
    "$REPO_ROOT/docs/discovery"
  )
  REMOVE_FILES+=(
    "$REPO_ROOT/journeys.config.yml"
    "$REPO_ROOT/docs/PLAYBOOK.md"
    "$REPO_ROOT/docs/DISCOVERY.md"
    "$REPO_ROOT/docs/TESTABILITY.md"
  )
fi

for root in "${ROOTS_UNIQ[@]}"; do
  if [ -n "$root" ]; then
    root=$(cd "$root" 2>/dev/null && pwd || true)
  fi
  if [ -z "$root" ]; then
    continue
  fi
  if [ "$root" != "$REPO_ROOT" ]; then
    REMOVE_DIRS+=("$root")
  fi
done

# Prompt files
shopt -s nullglob
PROMPT_FILES=("$REPO_ROOT/.github/prompts/artk."*.prompt.md)
COMMON_PROMPT_FILES=(
  "$REPO_ROOT/.github/prompts/common/GENERAL_RULES.md"
)
INSTRUCTION_FILES=(
  "$REPO_ROOT/.github/instructions/artk.instructions.md"
  "$REPO_ROOT/.github/instructions/artk.instructions.md.backup"
  "$REPO_ROOT/.github/instructions/journeys.instructions.md"
  "$REPO_ROOT/.github/instructions/journeys.instructions.md.backup"
)
shopt -u nullglob

for prompt_file in "${PROMPT_FILES[@]}"; do
  REMOVE_FILES+=("$prompt_file")
done

for prompt_file in "${COMMON_PROMPT_FILES[@]}"; do
  REMOVE_FILES+=("$prompt_file")
done

for instruction_file in "${INSTRUCTION_FILES[@]}"; do
  REMOVE_FILES+=("$instruction_file")
done

filter_existing() {
  local type="$1"
  shift
  local -a list=("$@")
  local -a existing=()
  for path in "${list[@]}"; do
    if [ -e "$path" ]; then
      existing+=("$path")
    fi
  done
  if [ ${#existing[@]} -eq 0 ]; then
    log "  (none)"
  else
    for path in "${existing[@]}"; do
      if [ "$type" = "dir" ] && [ ! -d "$path" ]; then
        continue
      fi
      if [ "$type" = "file" ] && [ -d "$path" ]; then
        continue
      fi
      log "  - $path"
    done
  fi
}

log "ARTK uninstall plan (full uninstall)"
log "Repo root: $REPO_ROOT"
if [ ${#ROOTS_UNIQ[@]} -gt 0 ]; then
  log "Detected ARTK roots:"
  for root in "${ROOTS_UNIQ[@]}"; do
    log "  - $root"
  done
else
  log "Detected ARTK roots: (none)"
fi

log ""
log "Directories to remove:"
filter_existing "dir" "${REMOVE_DIRS[@]}"

log ""
log "Files to remove:"
filter_existing "file" "${REMOVE_FILES[@]}"

log ""
if [ -f "$REPO_ROOT/.github/copilot-instructions.md" ]; then
  if grep -q "^## ARTK E2E Testing Framework" "$REPO_ROOT/.github/copilot-instructions.md"; then
    log "Will edit .github/copilot-instructions.md (remove ARTK section)"
  else
    log "Copilot instructions file found; no ARTK section detected"
  fi
else
  log "Copilot instructions file not found"
fi

if [ "$DRY_RUN" = true ]; then
  log ""
  log "Dry run only. No changes were made."
  exit 0
fi

if [ "$ASSUME_YES" = false ]; then
  log ""
  log "This will permanently delete ARTK assets."
  printf "Type 'yes' to continue: "
  read -r confirm
  if [ "$confirm" != "yes" ]; then
    log "Aborted. No changes were made."
    exit 1
  fi
fi

removed_count=0
skipped_count=0

remove_path() {
  local path="$1"
  if [ -z "$path" ]; then
    return
  fi
  if ! is_within_root "$path"; then
    warn "Skipping path outside repo root: $path"
    skipped_count=$((skipped_count + 1))
    return
  fi
  if [ "$path" = "$REPO_ROOT" ]; then
    warn "Skipping repo root: $path"
    skipped_count=$((skipped_count + 1))
    return
  fi
  if [ ! -e "$path" ]; then
    skipped_count=$((skipped_count + 1))
    return
  fi
  rm -rf -- "$path"
  removed_count=$((removed_count + 1))
}

for path in "${REMOVE_FILES[@]}"; do
  remove_path "$path"
done

for path in "${REMOVE_DIRS[@]}"; do
  remove_path "$path"
done

remove_artk_section_from_instructions || true
remove_artk_dependencies || true

log ""
log "ARTK uninstall complete."
log "Removed entries: $removed_count"
log "Skipped entries: $skipped_count"
log ""
log "Next steps:"
log "  - Review changes and run npm install if dependencies were removed."
log "  - Commit or discard the changes as needed."

exit 0
