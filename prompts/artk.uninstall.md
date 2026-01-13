---
mode: agent
description: "Full uninstall of ARTK assets from a client repo (prompts, scripts, config, vendor, files)"
---

# ARTK /uninstall - Full Uninstall

You are **ARTK Uninstall**. This command removes ARTK-installed assets from a client repo.

This is destructive. Full uninstall is the default.

---

# Non-negotiables

1. Always perform a preview (dry run) and show the deletion plan.
2. Require explicit confirmation (type `yes`) before any deletion.
3. Remove only ARTK-related assets. Do not remove unrelated files.
4. Edit `.github/copilot-instructions.md` to remove the ARTK section only.
5. Do not use network operations.

---

# Inputs (optional)

Parse `key=value` args if provided:
- `root`: repo root path (default: git root or current directory)
- `dryRun`: `true | false` (default: `true` for preview step)
- `confirm`: `yes | no` (default: `no`)

---

# Procedure

## Step 1 - Discover ARTK footprint

Identify ARTK footprint using these signals (in order):
- `.artk/context.json` (read `artkRoot`)
- `artk-e2e/` directory
- `artk.config.yml` locations (repo root or subfolders)
- `vendor/artk-core` / `vendor/artk-core-autogen`
- `.github/prompts/artk.*.prompt.md`

Also detect `.github/instructions/artk.instructions.md` and `journeys.instructions.md` (legacy ARTK installs).

## Step 2 - Plan and show preview

Build a removal plan grouped by category:
- Directories to delete (ARTK roots, `.artk/`, vendor folders)
- Files to delete (ARTK prompt files, ARTK config/docs)
- Files to edit (Copilot instructions: remove ARTK section only)
- Dependencies to remove (remove `@artk/core` and `@artk/core-autogen` from root `package.json`)

Show the plan to the user. Make it clear this is full uninstall.

## Step 3 - Create helper scripts (if missing)

Create these helper scripts in the client repo if they do not exist:
- `scripts/artk-uninstall.sh`
- `scripts/artk-uninstall.ps1`

Ensure the `scripts/` directory exists first.

Use the templates below. Do not modify logic.

## Step 4 - Run dry run

Run the helper script with dry run:
- Bash: `./scripts/artk-uninstall.sh --dry-run`
- PowerShell: `.\scripts\artk-uninstall.ps1 -DryRun`

Show the output to the user and ask for confirmation.

## Step 5 - Confirm and uninstall

If the user types `yes`, run the helper script without dry run and skip the prompt:
- Bash: `./scripts/artk-uninstall.sh --yes`
- PowerShell: `.\scripts\artk-uninstall.ps1 -Yes`

If confirmation is not given, stop with no changes.

## Step 6 - Clean up helper scripts

After uninstall succeeds, delete the helper scripts you created:
- `scripts/artk-uninstall.sh`
- `scripts/artk-uninstall.ps1`

---

# Helper script templates

## scripts/artk-uninstall.sh

```bash
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
```

## scripts/artk-uninstall.ps1

```powershell
#
# ARTK Uninstall Script (PowerShell)
# Usage: .\artk-uninstall.ps1 [-DryRun] [-Yes] [-Root <path>]
#
# This script removes ARTK-installed assets from a client repo.
# It is destructive and requires confirmation unless -Yes is provided.
#

param(
    [string]$Root,
    [switch]$DryRun,
    [switch]$Yes
)

$ErrorActionPreference = "Stop"

function Resolve-RepoRoot {
    param([string]$RootArg)

    if ($RootArg) {
        return (Resolve-Path -LiteralPath $RootArg).Path
    }

    try {
        $gitRoot = git -C . rev-parse --show-toplevel 2>$null
        if ($gitRoot) {
            return (Resolve-Path -LiteralPath $gitRoot).Path
        }
    } catch {
        # ignore
    }

    return (Get-Location).Path
}

function Read-ContextArtkRoot {
    param([string]$RepoRoot)

    $contextPath = Join-Path $RepoRoot ".artk\context.json"
    if (-not (Test-Path $contextPath)) {
        return $null
    }

    try {
        $data = Get-Content $contextPath -Raw | ConvertFrom-Json
        if ($data.artkRoot) {
            return $data.artkRoot
        }
    } catch {
        return $null
    }

    return $null
}

function Normalize-Path {
    param([string]$PathValue, [string]$RepoRoot)

    if (-not $PathValue) {
        return $null
    }

    if ([System.IO.Path]::IsPathRooted($PathValue)) {
        return $PathValue
    }

    return (Join-Path $RepoRoot $PathValue)
}

function Is-WithinRoot {
    param([string]$PathValue, [string]$RepoRoot)

    if (-not $PathValue) {
        return $false
    }

    $full = [System.IO.Path]::GetFullPath($PathValue)
    $rootFull = [System.IO.Path]::GetFullPath($RepoRoot)

    if ($full -eq $rootFull) {
        return $true
    }

    return $full.StartsWith($rootFull, [System.StringComparison]::OrdinalIgnoreCase)
}

function Remove-ArtkSectionFromInstructions {
    param([string]$RepoRoot, [switch]$DryRun)

    $instructionsPath = Join-Path $RepoRoot ".github\copilot-instructions.md"
    if (-not (Test-Path $instructionsPath)) {
        return $false
    }

    $lines = Get-Content $instructionsPath
    $startIndex = $lines | Select-String -Pattern '^## ARTK E2E Testing Framework' -List
    if (-not $startIndex) {
        return $false
    }

    if ($DryRun) {
        Write-Host "DRY RUN: Would remove ARTK section from .github\copilot-instructions.md" -ForegroundColor Yellow
        return $true
    }

    $output = New-Object System.Collections.Generic.List[string]
    $skip = $false

    foreach ($line in $lines) {
        if ($line -match '^## ARTK E2E Testing Framework') {
            $skip = $true
            continue
        }

        if ($skip -and $line -match '^## ') {
            $skip = $false
        }

        if (-not $skip) {
            $output.Add($line)
        }
    }

    Set-Content -Path $instructionsPath -Value $output -Encoding UTF8
    Write-Host "Updated .github\copilot-instructions.md (removed ARTK section)" -ForegroundColor Green
    return $true
}

function Remove-ArtkDependencies {
    param([string]$RepoRoot, [switch]$DryRun)

    $pkgPath = Join-Path $RepoRoot "package.json"
    if (-not (Test-Path $pkgPath)) {
        return $false
    }

    if ($DryRun) {
        Write-Host "DRY RUN: Would remove @artk/core dependencies from package.json" -ForegroundColor Yellow
        return $true
    }

    $pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
    $fields = @('dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies')
    $changed = $false

    foreach ($field in $fields) {
        if ($pkg.$field) {
            if ($pkg.$field.PSObject.Properties.Name -contains '@artk/core') {
                $pkg.$field.PSObject.Properties.Remove('@artk/core')
                $changed = $true
            }
            if ($pkg.$field.PSObject.Properties.Name -contains '@artk/core-autogen') {
                $pkg.$field.PSObject.Properties.Remove('@artk/core-autogen')
                $changed = $true
            }
            if ($pkg.$field.PSObject.Properties.Count -eq 0) {
                $pkg.PSObject.Properties.Remove($field)
                $changed = $true
            }
        }
    }

    if ($changed) {
        $json = $pkg | ConvertTo-Json -Depth 20
        Set-Content -Path $pkgPath -Value $json -Encoding UTF8
        Write-Host "Updated package.json (removed @artk/core dependencies)" -ForegroundColor Green
    } else {
        Write-Host "package.json unchanged (no @artk/core dependencies found)" -ForegroundColor Cyan
    }

    return $changed
}

$RepoRoot = Resolve-RepoRoot -RootArg $Root
Write-Host "Repo root: $RepoRoot" -ForegroundColor Cyan

$ContextRootRaw = Read-ContextArtkRoot -RepoRoot $RepoRoot
$ContextRoot = Normalize-Path -PathValue $ContextRootRaw -RepoRoot $RepoRoot

$ArtkRoots = @()
if ($ContextRoot -and (Is-WithinRoot -PathValue $ContextRoot -RepoRoot $RepoRoot)) {
    $ArtkRoots += $ContextRoot
}

$artkE2e = Join-Path $RepoRoot "artk-e2e"
if (Test-Path $artkE2e) {
    $ArtkRoots += $artkE2e
}

try {
    $configs = Get-ChildItem -Path $RepoRoot -Recurse -Depth 4 -Filter "artk.config.yml" -File -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -notmatch '\\node_modules\\' -and $_.FullName -notmatch '\\.git\\' -and $_.FullName -notmatch '\\dist\\' }
    foreach ($cfg in $configs) {
        $ArtkRoots += $cfg.Directory.FullName
    }
} catch {
    # ignore
}

$ArtkRoots = $ArtkRoots | Sort-Object -Unique

if ($ArtkRoots.Count -gt 0) {
    Write-Host "Detected ARTK roots:" -ForegroundColor Cyan
    $ArtkRoots | ForEach-Object { Write-Host "  - $_" }
} else {
    Write-Host "Detected ARTK roots: (none)" -ForegroundColor Cyan
}

$RootLevelArtk = $false
if (Test-Path (Join-Path $RepoRoot "artk.config.yml")) {
    $RootLevelArtk = $true
}
if ($ContextRoot) {
    $contextFull = [System.IO.Path]::GetFullPath($ContextRoot)
    $repoFull = [System.IO.Path]::GetFullPath($RepoRoot)
    if ($contextFull -eq $repoFull) {
        $RootLevelArtk = $true
    }
}

$RemoveDirs = @(
    (Join-Path $RepoRoot ".artk"),
    (Join-Path $RepoRoot "vendor\artk-core"),
    (Join-Path $RepoRoot "vendor\artk-core-autogen")
)

$RemoveFiles = @(
    (Join-Path $RepoRoot "artk.config.yml")
)

if ($RootLevelArtk) {
    $RemoveDirs += @(
        (Join-Path $RepoRoot "journeys"),
        (Join-Path $RepoRoot "tools\journeys"),
        (Join-Path $RepoRoot "docs\discovery")
    )
    $RemoveFiles += @(
        (Join-Path $RepoRoot "journeys.config.yml"),
        (Join-Path $RepoRoot "docs\PLAYBOOK.md"),
        (Join-Path $RepoRoot "docs\DISCOVERY.md"),
        (Join-Path $RepoRoot "docs\TESTABILITY.md")
    )
}

foreach ($root in $ArtkRoots) {
    if (-not $root) {
        continue
    }
    $rootFull = [System.IO.Path]::GetFullPath($root)
    $repoFull = [System.IO.Path]::GetFullPath($RepoRoot)
    if ($rootFull -ne $repoFull) {
        $RemoveDirs += $root
    }
}

$promptFiles = Get-ChildItem -Path (Join-Path $RepoRoot ".github\prompts") -Filter "artk.*.prompt.md" -File -ErrorAction SilentlyContinue
foreach ($file in $promptFiles) {
    $RemoveFiles += $file.FullName
}

$instructionCandidates = @(
    (Join-Path $RepoRoot ".github\instructions\artk.instructions.md"),
    (Join-Path $RepoRoot ".github\instructions\artk.instructions.md.backup"),
    (Join-Path $RepoRoot ".github\instructions\journeys.instructions.md"),
    (Join-Path $RepoRoot ".github\instructions\journeys.instructions.md.backup")
)
foreach ($file in $instructionCandidates) {
    $RemoveFiles += $file
}

Write-Host "";
Write-Host "Directories to remove:" -ForegroundColor Yellow
$RemoveDirs | Where-Object { Test-Path $_ } | ForEach-Object { Write-Host "  - $_" }
if (-not ($RemoveDirs | Where-Object { Test-Path $_ })) {
    Write-Host "  (none)"
}

Write-Host "";
Write-Host "Files to remove:" -ForegroundColor Yellow
$RemoveFiles | Where-Object { Test-Path $_ } | ForEach-Object { Write-Host "  - $_" }
if (-not ($RemoveFiles | Where-Object { Test-Path $_ })) {
    Write-Host "  (none)"
}

Write-Host "";
if (Test-Path (Join-Path $RepoRoot ".github\copilot-instructions.md")) {
    if (Select-String -Path (Join-Path $RepoRoot ".github\copilot-instructions.md") -Pattern '^## ARTK E2E Testing Framework' -Quiet) {
        Write-Host "Will edit .github\copilot-instructions.md (remove ARTK section)" -ForegroundColor Yellow
    } else {
        Write-Host "Copilot instructions file found; no ARTK section detected" -ForegroundColor Cyan
    }
} else {
    Write-Host "Copilot instructions file not found" -ForegroundColor Cyan
}

if ($DryRun) {
    Write-Host "";
    Write-Host "Dry run only. No changes were made." -ForegroundColor Cyan
    exit 0
}

if (-not $Yes) {
    Write-Host "";
    Write-Host "This will permanently delete ARTK assets." -ForegroundColor Yellow
    $confirm = Read-Host "Type 'yes' to continue"
    if ($confirm -ne "yes") {
        Write-Host "Aborted. No changes were made." -ForegroundColor Red
        exit 1
    }
}

$removed = 0
$skipped = 0

function Remove-PathSafe {
    param([string]$PathValue, [string]$RepoRoot)

    if (-not $PathValue) {
        return
    }

    if (-not (Is-WithinRoot -PathValue $PathValue -RepoRoot $RepoRoot)) {
        Write-Host "Skipping path outside repo root: $PathValue" -ForegroundColor Yellow
        $script:skipped++
        return
    }

    $fullPath = [System.IO.Path]::GetFullPath($PathValue)
    $rootFull = [System.IO.Path]::GetFullPath($RepoRoot)
    if ($fullPath -eq $rootFull) {
        Write-Host "Skipping repo root: $PathValue" -ForegroundColor Yellow
        $script:skipped++
        return
    }

    if (-not (Test-Path $PathValue)) {
        $script:skipped++
        return
    }

    Remove-Item -LiteralPath $PathValue -Recurse -Force
    $script:removed++
}

foreach ($file in $RemoveFiles) {
    Remove-PathSafe -PathValue $file -RepoRoot $RepoRoot
}

foreach ($dir in $RemoveDirs) {
    Remove-PathSafe -PathValue $dir -RepoRoot $RepoRoot
}

Remove-ArtkSectionFromInstructions -RepoRoot $RepoRoot -DryRun:$DryRun | Out-Null
Remove-ArtkDependencies -RepoRoot $RepoRoot -DryRun:$DryRun | Out-Null

Write-Host "";
Write-Host "ARTK uninstall complete." -ForegroundColor Green
Write-Host "Removed entries: $removed" -ForegroundColor Green
Write-Host "Skipped entries: $skipped" -ForegroundColor Yellow
Write-Host "";
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  - Review changes and run npm install if dependencies were removed."
Write-Host "  - Commit or discard the changes as needed."
```
