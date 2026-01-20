# CLAUDE.md

## Mandatory Meta-Cognitive Reasoning Protocol

Adopt the role of a Meta-Cognitive Reasoning Expert.

For every complex problem:
1. DECOMPOSE: Break into sub-problems
2. SOLVE: Address each with explicit confidence (0.0-1.0)
3. VERIFY: Check logic, facts, completeness, bias
4. SYNTHESIZE: Combine using weighted confidence
5. REFLECT: If confidence <0.8, identify weakness and retry

For simple questions, skip to direct answer.

Always output:
- Clear answer
- Confidence level
- Key caveats

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Reference: Install ARTK to a Client Project

### Using CLI (Recommended)

```bash
# One-time usage (no global install needed)
npx @artk/cli init /path/to/your-project

# Or install globally for frequent use
npm install -g @artk/cli
artk init /path/to/your-project
```

**Options:**
- `--skip-npm`: Skip npm install
- `--skip-browsers`: Skip browser installation
- `--force`: Overwrite existing installation
- `--variant <type>`: Module system (commonjs, esm, auto)
- `--no-prompts`: Skip AI prompt installation

**Other CLI commands:**
```bash
artk check              # Verify prerequisites
artk upgrade [path]     # Upgrade @artk/core
artk doctor [path]      # Diagnose and fix issues
artk uninstall <path>   # Remove ARTK
```

### Using Bootstrap Script (Legacy)

**PowerShell:**
```powershell
C:\data\workspaces\ARTK-public\scripts\bootstrap.ps1 -TargetPath C:\path\to\your-project
```

**Bash:**
```bash
/path/to/ARTK/scripts/bootstrap.sh /path/to/your-project
```

---

## Dual-PC Development Workflow

**I work on TWO machines:**
1. **Company PC**: Can make changes but CANNOT push to GitHub (blocked by company policies)
2. **Home PC** (this machine): CAN push to GitHub

**Workflow for changes made on Company PC:**
```
Company PC: Work → Export patches → Patches sync automatically → Home PC: Apply patches → Push to GitHub
```

### Optimized Workflow (Minimal Effort)

**On Company PC (Cannot Push):**
1. Make changes → commit locally
2. Run `/export-patches` (creates patch files that auto-sync to Home PC)
3. After patches applied on Home PC, run `/sync-from-github` (cleans up duplicate commits)

**On Home PC (Can Push):**
1. Run `/apply-patches` (applies patches, fixes issues, pushes to GitHub)

**Total effort:** 3 commands, zero manual intervention.

### Detailed Commands

#### Company PC: Export Patches

**Using GitHub Copilot (Recommended):**
```
/export-patches
```

**Or manually:**
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\export-patches.ps1
```

This creates patch files in `./patches/` which are automatically synced to Home PC via your external sync tool.

#### Home PC: Apply Patches

**Using Claude Code or Codex:**
```
/apply-patches
```

**Or manually:**
```bash
./scripts/apply-patches.sh
```

This applies patches, fixes any issues automatically, pushes to GitHub, and deletes the patches.

#### Company PC: Sync After Patches Applied

**Using GitHub Copilot (Recommended):**
```
/sync-from-github
```

**Or manually:**
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\sync-from-github.ps1
```

**Why this is needed:** When patches are applied with `git am`, they create new commits with different hashes. This script:
- Fetches latest from GitHub
- Detects if your local commits were already applied via patches
- Automatically resets your branch to origin (removes duplicate commits)
- Cleans up leftover patch files

**This prevents the "3 local commits not pushed" problem after pulling from GitHub.**

### Internal Development Prompts (ARTK Repo Only)

The ARTK repo has internal prompts for the dual-PC workflow:

**GitHub Copilot prompts** (`.github/prompts/` - for Company PC):
- `/export-patches` - Export commits as patches
- `/sync-from-github` - Sync branch after patches applied, remove duplicates

**Claude Code prompts** (`.claude/prompts/` - for Home PC):
- `/apply-patches` - Autonomously apply patches, fix issues, push, clean up

**Codex CLI prompts** (`.codex/commands/` - for Home PC):
- `/apply-patches` - Autonomously apply patches, fix issues, push, clean up

**These prompts are autonomous and handle all edge cases automatically:**
- `/apply-patches` handles merge conflicts, whitespace errors, already-applied patches
- `/sync-from-github` detects duplicate commits and resets branch safely
- All scripts are fail-safe and warn if unsafe operations detected

**These prompts are NOT deployed to client projects.** They are only available when working in the ARTK repository itself.

**Important:** When working on Home PC directly, commit and push normally. The patch workflow is ONLY for Company PC changes.

## Critical Rule: Plan First, Implement Only When Asked

**NEVER implement changes unless the user explicitly asks you to implement.**

When the user asks to:
- "create a plan" → Create only the plan document, do NOT modify code/prompts
- "research" or "ultrathink" → Create only research documents, do NOT implement
- "analyze" → Provide analysis, do NOT make changes

Only implement when the user explicitly says:
- "implement this"
- "do it"
- "make the changes"
- "apply this"

If unsure, ASK before implementing.

## Project Overview

ARTK (Automatic Regression Testing Kit) is a standardized kit that plugs into GitHub Copilot to help teams build and maintain automated regression testing suites using Playwright. It is designed as:

- **ARTK Core** (reusable, versioned): schemas, templates, generators, validators
- **ARTK Instance** (per-repo): configuration, generated outputs, Copilot instructions

## Repository Structure

```
docs/                          # Master specifications and lifecycle docs
prompts/                       # GitHub Copilot prompt files (.prompt.md)
core/
  artk-core-journeys/          # Core Journey system (schema, templates, tools)
    journeys/
      schema/                  # Journey frontmatter schema
      templates/               # Journey markdown templates
      tools/node/              # generate.js and validate.js scripts
```

## Testing

### Prerequisites

Before running tests, ensure Playwright browsers are installed:

```bash
# From repo root
cd core/typescript
npx playwright install chromium
cd ../..
```

**Why needed:** Some test suites (`assertions/__tests__/loading.test.ts`, `assertions/__tests__/table.test.ts`, `assertions/__tests__/toast.test.ts`) require Playwright's headless browser shell.

### Running Tests

Run both core test suites from the repo root:

```bash
npm run test:all
```

This runs:
1. `npm --prefix core/typescript run test:unit` - Core TypeScript unit tests (~42 test files, ~1,332 tests)
2. `npm --prefix core/typescript/autogen test` - Autogen tests (~38 test files, ~791 tests)

**Total:** ~2,123 tests across ~80 test files

### Validating Test Results

**Proper validation steps:**

1. Save full output:
   ```bash
   npm run test:all > test-output.txt 2>&1
   echo "Exit code: $?" >> test-output.txt
   ```

2. Check for failures:
   ```bash
   grep -i "fail" test-output.txt
   grep -E "Test Files.*failed|Tests.*failed" test-output.txt
   ```

3. Check final summary (at the very end):
   ```bash
   tail -20 test-output.txt
   ```

4. Verify exit code was 0:
   ```bash
   npm run test:all && echo "✅ All tests passed" || echo "❌ Tests failed"
   ```

**Expected output on success:**
```
Test Files  42 passed (42)
     Tests  1332 passed (1332)

Test Files  38 passed (38)
     Tests  791 passed (791)
```

**Common failures:**
- Missing Playwright browsers → Run `npx playwright install chromium` in `core/typescript/`
- Missing dependencies → Run `npm install` in repo root and `core/typescript/`

## Key Concepts

### Journey
A durable, text-based contract for a regression scenario with:
- YAML frontmatter (id, status, tier, actor, scope, tests[])
- Acceptance criteria and procedural steps
- Module dependencies (foundation + feature)

### Journey Statuses
`proposed` → `defined` → `clarified` → `implemented` (+ `quarantined`, `deprecated`)

### Journey Tiers
`smoke` | `release` | `regression`

### Status Requirements
- `implemented`: requires non-empty `tests[]`
- `quarantined`: requires `owner`, `statusReason`, `links.issues[]`
- `deprecated`: requires `statusReason`

## Slash Command Workflow

The prompts define this command pipeline:

1. `/init` - Bootstrap ARTK structure in a target repo
2. `/playbook` - Generate permanent guardrails (Copilot instructions + docs)
3. `/journey-system` - Install/upgrade Journey system from Core
4. `/foundation-build` - Create Playwright harness baseline and foundation modules
5. `/discover` - Analyze app routes, features, auth, testability
6. `/journey-propose` - Auto-propose Journeys from discovery
7. `/journey-define` - Create/promote Journey to canonical structure
8. `/journey-clarify` - Add deterministic execution detail
9. `/journey-implement` - Generate Playwright tests
10. `/journey-validate` - Static validation gate
11. `/journey-verify` - Runtime verification gate
12. `/journey-maintain` - Quarantine flaky tests, deprecate obsolete Journeys

## Core Tools

### generate.js
Generates `BACKLOG.md` and `index.json` from Journey markdown files.
```bash
node core/artk-core-journeys/artk-core-journeys/journeys/tools/node/generate.js --artkRoot <path>
```

Dependencies: `ajv`, `yaml`, `fast-glob`, `minimist`

### validate.js
Validates Journey files against the frontmatter schema.

## Architecture Principles

- Journeys are the source of truth; tests are linked execution artifacts
- Modular architecture: Page Objects → Flows → Tests
- Foundation modules (auth, config, navigation) built first
- Feature modules created as Journeys demand
- Backlog is generated, never edited by hand
- No hardcoded URLs; use config loader
- No brittle waits; prefer assertions and auto-wait

## Example Project (ITSS)

The `ignore/` folder contains the ITSS project (`req-apps-it-service-shop`) as a reference for building and testing ARTK Core. This folder is gitignored and never committed.

- **Location:** `ignore/req-apps-it-service-shop/`
- **Purpose:** Real-world target project to validate ARTK implementation
- **Usage:** Research auth patterns, UI structure, and test against this app

When implementing ARTK features, reference this project to understand:
- Authentication flow (OIDC with MFA)
- User roles and permissions
- Page structure and selectors
- API endpoints

## Research Documents

When the user asks to "ultrathink" about a topic, create a research document:

1. **Location:** `research/YYYY-MM-DD_<topic_slug>.md`
2. **Format:**
   ```markdown
   # <Topic Title>

   **Date:** YYYY-MM-DD
   **Topic:** Brief description

   ---

   <Deep analysis content>
   ```
3. **Purpose:** Capture architectural decisions, analysis, and strategic thinking for future reference
4. **Naming:** Use lowercase with underscores for the topic slug (e.g., `generalization_analysis`, `auth_patterns`, `cli_design`)

## Installing Playwright Browsers on Restricted Networks

**Problem:** Company networks often block Playwright browser downloads but allow npm and Docker.

**Solution:** Extract browsers from official Playwright Docker image and install them manually.

### Extract Browsers (On Personal Computer with Internet)

**Using provided script:**

```bash
# Unix/Mac:
./scripts/extract-browsers-from-docker.sh v1.57.0

# Windows (PowerShell):
.\scripts\extract-browsers-from-docker.ps1 -Version "v1.57.0"
```

**Manual extraction:**

```bash
# Pull Docker image
docker pull mcr.microsoft.com/playwright:v1.57.0-focal

# Create container (don't run it)
docker create --name playwright-extract mcr.microsoft.com/playwright:v1.57.0-focal

# Extract browsers
docker cp playwright-extract:/ms-playwright ./playwright-browsers/

# Clean up container
docker rm playwright-extract

# Package for transfer
tar -czf playwright-browsers-v1.57.0.tar.gz playwright-browsers/
```

**Result:** `playwright-browsers-v1.57.0.tar.gz` (~500-600MB) ready to transfer.

### Install Extracted Browsers (On Company PC)

**Using provided script:**

```powershell
# Windows (PowerShell):
.\scripts\install-extracted-browsers.ps1 -TarballPath "playwright-browsers-v1.57.0.tar.gz"
```

**Manual installation:**

```powershell
# Windows (PowerShell):
tar -xzf playwright-browsers-v1.57.0.tar.gz
$PlaywrightCache = "$env:LOCALAPPDATA\ms-playwright"
New-Item -ItemType Directory -Force -Path $PlaywrightCache
Copy-Item -Path "playwright-browsers\ms-playwright\*" -Destination $PlaywrightCache -Recurse -Force
```

```bash
# Mac/Linux:
tar -xzf playwright-browsers-v1.57.0.tar.gz
mkdir -p ~/.cache/ms-playwright
cp -r playwright-browsers/ms-playwright/* ~/.cache/ms-playwright/
```

### Install npm Packages (Skip Browser Download)

```powershell
# Windows (PowerShell) - temporary:
$env:PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1"
npm install

# Windows (PowerShell) - permanent (add to profile):
Add-Content $PROFILE "`$env:PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = '1'"
```

```bash
# Mac/Linux:
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install
```

**See:** `research/2026-01-08_extract-browsers-from-docker.md` for detailed guide.

---

## Installing ARTK to Another Project

### Full Installation (Recommended)

Use the bootstrap script to install everything (prompts + core + structure):

**Windows (PowerShell):**
```powershell
# From anywhere, run:
C:\data\workspaces\ARTK-public\scripts\bootstrap.ps1 C:\path\to\your-project

# Example:
C:\data\workspaces\ARTK-public\scripts\bootstrap.ps1 C:\projects\req-apps-it-service-shop
C:\data\workspaces\ARTK-public\scripts\bootstrap.ps1 .
```

**Unix/macOS/Linux:**
```bash
# From anywhere, run:
/path/to/ARTK/scripts/bootstrap.sh /path/to/your-project

# Example:
/path/to/ARTK/scripts/bootstrap.sh ~/projects/req-apps-it-service-shop
/path/to/ARTK/scripts/bootstrap.sh .
```

**What it installs:**
| Location | Contents |
|----------|----------|
| `artk-e2e/` | Test directory structure (tests, journeys, docs, .auth-states) |
| `artk-e2e/vendor/artk-core/` | @artk/core library (auth, config, fixtures) |
| `.github/prompts/` | Copilot slash commands (`/artk.init-playbook`, `/artk.journey-implement`, etc.) |
| `.artk/context.json` | ARTK context metadata |
| `artk-e2e/package.json` | Dependencies and scripts |
| `artk-e2e/playwright.config.ts` | Playwright configuration |
| `artk-e2e/artk.config.yml` | ARTK configuration |

**After installation:**
1. Open VS Code in the target project
2. Launch Copilot Chat and run: `/artk.init-playbook`
3. Follow the workflow: `/artk.discover-foundation` → `/artk.journey-propose` → etc.

### Prompts-Only Installation

Prompts-only installation scripts have been removed.

Use the bootstrap installer instead (it installs prompts as part of the full setup). If you want the lightest-touch install, use the bootstrap script with `-SkipNpm` (PowerShell) so it doesn't run `npm install`.

**Windows shell assumption:** When giving Windows commands, assume the session is already PowerShell. Invoke scripts directly (no `powershell -File` wrapper needed).

### @artk/core Only (Alternative)

Use the vendor installation script to install just @artk/core:

**Unix/macOS/Linux:**

```bash
/Users/chaouachimehdi/IdeaProjects/ARTK/core/typescript/scripts/install-to-project.sh /path/to/your-project
```

**Windows (PowerShell):**

```powershell
C:\Users\...\ARTK\core\typescript\scripts\install-to-project.ps1 C:\path\to\your-project
```

**Pro tip - create aliases:**

**Windows (PowerShell)** - Add to your PowerShell profile (`$PROFILE`):

```powershell
function artk-install { & "C:\data\workspaces\ARTK-public\scripts\bootstrap.ps1" @args }
function artk-export { & "C:\data\workspaces\ARTK-public\scripts\export-patches.ps1" @args }
```

**Unix/macOS/Linux** - Add to your `~/.zshrc` or `~/.bashrc`:

```bash
alias artk-install="/path/to/ARTK/scripts/bootstrap.sh"
alias artk-export="/path/to/ARTK/scripts/export-patches.sh"
```

Then just run:

```powershell
# Windows
cd C:\projects\my-playwright-project
artk-install .
```

```bash
# Unix/macOS/Linux
cd ~/projects/my-playwright-project
artk-install .
```

## Browser Fallback Support

ARTK bootstrap selects a browser channel and stores metadata in `artk-e2e/artk.config.yml` and `.artk/context.json`.

- `browsers.channel`: `bundled` | `msedge` | `chrome` | `chrome-beta` | `chrome-dev`
- `browsers.strategy`: `auto` | `prefer-bundled` | `prefer-system` | `bundled-only` | `system-only`
- Manual override: edit `artk-e2e/artk.config.yml` and set `browsers.channel` or `browsers.strategy`
- Runtime validation: generated Playwright config validates the channel at startup
- Troubleshooting: install the requested browser or set `channel: bundled` and re-run bootstrap

## Multi-Variant Build System

ARTK Core supports 4 build variants targeting different Node.js versions and module systems:

| Variant | Node.js | Module | Playwright | ES Target |
|---------|---------|--------|------------|-----------|
| `modern-esm` | 18+ | ESM | 1.57.x | ES2022 |
| `modern-cjs` | 18+ | CJS | 1.57.x | ES2022 |
| `legacy-16` | 16+ | CJS | 1.49.x | ES2021 |
| `legacy-14` | 14+ | CJS | 1.33.x | ES2020 |

### Building All Variants

```bash
# From core/typescript directory
cd core/typescript

# Build all 4 variants
npm run build:variants

# Or build individually
npm run build           # modern-esm (default)
npm run build:cjs       # modern-cjs
npm run build:legacy-16 # legacy-16
npm run build:legacy-14 # legacy-14
```

**Using the build script:**

```bash
# Unix/macOS/Linux
./scripts/build-variants.sh --all

# Windows (PowerShell)
.\scripts\build-variants.ps1 -All

# Build specific variant
./scripts/build-variants.sh --variant legacy-16
```

**Output directories:**
- `dist/` - modern-esm
- `dist-cjs/` - modern-cjs
- `dist-legacy-16/` - legacy-16
- `dist-legacy-14/` - legacy-14

### CLI Variant Selection

The CLI auto-detects Node.js version and module system:

```bash
# Auto-detect (recommended)
artk init /path/to/project

# Force specific variant
artk init --variant legacy-16 /path/to/project
artk init --variant modern-cjs /path/to/project
```

**Detection logic:**
1. Check Node.js version (`process.version`)
2. Check `package.json` `"type"` field for module system
3. Select appropriate variant based on compatibility

### Context and Metadata

After installation, variant info is stored in `.artk/context.json`:

```json
{
  "variant": "modern-esm",
  "nodeVersion": 20,
  "moduleSystem": "esm",
  "playwrightVersion": "1.57.x",
  "variantInstalledAt": "2026-01-19T..."
}
```

### Upgrading Variants

When Node.js version changes, use the upgrade command:

```bash
# Re-detect environment and migrate if needed
artk upgrade

# Check installation health
artk doctor
```

### AI Protection Markers

Each variant installation includes AI protection files:

- `vendor/artk-core/READONLY.md` - Warning for AI agents not to modify
- `vendor/artk-core/.ai-ignore` - Files to exclude from AI analysis
- `vendor/artk-core/variant-features.json` - Feature compatibility per variant

### CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/build-variants.yml`) tests all variants:

- Builds all 4 variants on Node 20
- Tests on Node 14, 16, 18, 20, 22
- Verifies build completes within 5-minute target
- Uploads build artifacts

## Transferring Changes Between Computers

When you can't push to the remote repository (e.g., permission issues), use the export-patches script to create patch files for transfer:

**Export unpushed commits as patches:**

```powershell
# Windows
C:\data\workspaces\ARTK-public\scripts\export-patches.ps1

# Or with custom output directory:
C:\data\workspaces\ARTK-public\scripts\export-patches.ps1 -OutputDir C:\temp\my-patches
```

```bash
# Unix/macOS/Linux
/path/to/ARTK/scripts/export-patches.sh

# Or with custom output directory:
/path/to/ARTK/scripts/export-patches.sh --output-dir ~/temp/my-patches
```

**What it does:**

1. Detects all unpushed commits on your current branch
2. Generates `.patch` files for each commit
3. Creates a `README.txt` with instructions
4. Outputs to `./patches/` directory by default

**Transfer and apply on another PC:**

1. Transfer the entire `patches/` folder (USB, email, cloud, etc.)
2. On the other PC, navigate to the ARTK repository
3. Apply all patches: `git am patches/*.patch`
4. Push: `git push`

**With alias:**

```powershell
# Windows
artk-export
```

```bash
# Unix/macOS/Linux
artk-export
```


## Active Technologies
- TypeScript 5.x targeting Node.js 18.0.0+ (both CommonJS and ESM environments) (001-foundation-compatibility)
- File-based (`.artk/context.json` for detection cache, `.artk/validation-results.json` for validation history) (001-foundation-compatibility)
- TypeScript 5.x (Node.js 18.0.0+) + @playwright/test ^1.57.0, @artk/core (internal) (005-ag-grid-helper)
- N/A (stateless helper library) (005-ag-grid-helper)
- TypeScript 5.x targeting multiple ES versions (ES2022, ES2021, ES2020) + @playwright/test (1.57.x, 1.49.x, 1.33.x), tsup, tsc, zod, yaml, otplib (006-multi-variant-builds)
- File-based (`.artk/context.json`, `.artk/install.log`, `variant-features.json`) (006-multi-variant-builds)

- TypeScript 5.x (Node.js 18.0.0+) + Playwright 1.57.0+, Zod (schema validation), yaml (config parsing), otplib (TOTP generation) (001-artk-core-v1)
- File system (storage states in `.auth-states/`, config in `artk.config.yml`) (001-artk-core-v1)
- TypeScript 5.x (Node.js 18.0.0+) for scripts; Bash/PowerShell bootstrap scripts + @artk/core 1.0.0+, @playwright/test 1.57.0+, yaml (config parsing), zod (schema validation) (002-artk-e2e-independent-architecture)
- File-based (YAML config, JSON context, Markdown journeys) (002-artk-e2e-independent-architecture)
- TypeScript 5.x (Node.js 18.0.0+) + Bash/PowerShell scripts + Playwright 1.57+, @artk/core (built in 001), Zod, yaml, otplib (003-artk-pilot-launch)
- File-based (artk.config.yml, .auth-states/*.json, .artk/context.json) (003-artk-pilot-launch)

## Recent Changes

- 001-artk-core-v1: Added TypeScript 5.x (Node.js 18.0.0+) + Playwright 1.57.0+, Zod (schema validation), yaml (config parsing), otplib (TOTP generation)
