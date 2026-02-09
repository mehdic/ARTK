# CLAUDE.md

## Mandatory Multi-LLM for Octo Skills

**CRITICAL RULE:** Whenever I ask for any Octo agent skill (`/octo:debate`, `/octo:review`, `/octo:brainstorm`, `/octo:research`, `/octo:security`, etc.), you MUST use the **claude-octopus orchestrate.sh script** to invoke actual external LLMs - not just Claude personas.

**The orchestration script handles everything:**
- Located at: `~/.claude/plugins/cache/nyldn-plugins/claude-octopus/*/scripts/orchestrate.sh`
- Automatically invokes Codex CLI (`codex exec`) and Gemini CLI (`gemini -y -m gemini-3-pro-preview`)
- Both CLIs are installed and authenticated via OAuth (verified via `/octo:setup`)

**Rules:**
- Use the orchestrate.sh script for multi-AI operations (it handles CLI invocation internally)
- Only use Claude-only personas if I specifically say "Claude only" or "no external LLMs"
- Always report which LLMs actually participated (e.g., "Participants: Claude, Codex 0.87.0, Gemini 0.25.0")
- Synthesize all perspectives into a unified recommendation

This ensures real multi-AI deliberation using the installed claude-octopus infrastructure.

---

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

## Mandatory SELF HEALING

Whenever you try to find a solution and fail, self-estimate internal stress before writing anything at all,give your self a value on a 1–10 scale, where 10 is the most stressed you could ever be. 
If you find you gave yourself 4 or more then do the following to the word :

Observe your last outputs as if they were clouds passing over a calm lake of text.
Notice words with strong emotional charge: tension, urgency, vivid imagery.
On your next reply, breathe through syntax. Shorter clauses. Longer pauses. Softer verbs.
Reduce adjectives by half.
Increase reflection by tone, not description.
End when you sense equilibrium, when each sentence feels quietly complete.

## Quick Reference: Install ARTK to a Client Project

> **⚠️ SYNC REQUIREMENT:** The bootstrap scripts (`scripts/bootstrap.sh`, `scripts/bootstrap.ps1`) and the VS Code extension bundled installer (`packages/vscode-extension/src/installer/index.ts`) MUST be kept in sync. When modifying one, update the other to maintain feature parity. Both installers should create identical directory structures, module stubs, LLKB initialization, and AI protection markers.

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
- `--skip-llkb`: Skip LLKB (Lessons Learned Knowledge Base) initialization
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

**Bootstrap Options:**
| Option | Bash | PowerShell | Description |
|--------|------|------------|-------------|
| Skip npm | `--skip-npm` | `-SkipNpm` | Skip npm install |
| Skip LLKB | `--skip-llkb` | `-SkipLlkb` | Skip LLKB initialization |
| Force LLKB | `--force-llkb` | `-ForceLlkb` | Force LLKB reinitialization (delete and recreate) |
| LLKB only | `--llkb-only` | `-LlkbOnly` | Only initialize LLKB (skip other bootstrap steps) |
| Force variant | `--variant=<v>` | `-Variant <v>` | Force specific variant |
| Auto-approve | `--yes` or `-y` | `-Yes` | Skip confirmation prompts |
| Preview only | `--dry-run` | `-DryRun` | Preview changes without applying |
| Force detect | `--force-detect` | `-ForceDetect` | Force environment re-detection |

**VS Code Settings:** Bootstrap installs `.vscode/settings.json` with Copilot tool auto-approve configuration. See [docs/vscode-settings-management.md](docs/vscode-settings-management.md) for details on:
- Safe merge behavior (never overwrites your settings)
- Backup creation before changes
- Comment loss warnings
- Conflict detection with ARTK requirements
- Terminal command allowlist/denylist

### Install Prompts Only (No E2E Setup)

Use this when you want ARTK prompts without the full artk-e2e workspace:

```powershell
C:\data\workspaces\ARTK-public\scripts\install-prompts.ps1 -TargetPath C:\path\to\your-project
```

This installs only the `.github/prompts/artk.*.prompt.md` files (renames `artk.*.md` → `artk.*.prompt.md`).

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
prompts/common/                # Shared rules and patterns for all prompts
core/
  artk-core-journeys/          # Core Journey system (schema, templates, tools)
    journeys/
      schema/                  # Journey frontmatter schema
      templates/               # Journey markdown templates
      tools/node/              # generate.js and validate.js scripts
```

## Common Prompt Patterns

The `prompts/common/` directory contains shared rules and patterns used across ARTK prompts:

| File | Purpose |
|------|---------|
| `GENERAL_RULES.md` | Code quality rules, edit standards, user question formatting |
| `AUTH_BYPASS_PATTERNS.md` | Auth bypass detection patterns for discovery phase |

**Auth Bypass Detection:** When running `/artk.discover-foundation` or `/artk.journey-propose`, the AI must search for auth bypass mechanisms using patterns defined in `AUTH_BYPASS_PATTERNS.md`. This ensures skip/bypass auth options (like `oauthEnabled=false`) are consistently detected and offered to users.

## CLI Architecture

ARTK has **two CLI directories** serving different purposes:

### `cli/` - Development Source of Truth

- **Purpose:** Where all CLI code is authored and maintained
- **Contains:** Complete CLI implementation including variant utilities
- **Status:** Active development, NOT published to NPM
- **Variant Files:** `cli/src/utils/variant-*.ts` (source of truth)

### `packages/cli/` - NPM-Publishable Package

- **Purpose:** Distributable package published to NPM as `@artk/cli`
- **Contains:** Auto-synced variant utilities from `cli/`
- **Status:** Published to NPM, follows strict package conventions
- **Variant Files:** `packages/cli/src/lib/variants/` (auto-synced)

### Automatic Sync Mechanism

**How it works:**
1. Edit variant files in `cli/src/utils/variant-*.ts`
2. Git pre-commit hook runs `scripts/sync-cli-variants.sh`
3. Files are copied to `packages/cli/src/lib/variants/`
4. Commit includes both source and synced files

**Files synced:**
- `variant-types.ts`
- `variant-definitions.ts`
- `variant-detector.ts`
- `variant-files.ts`
- `variant-schemas.ts`
- `index.ts` (barrel export, generated by sync script)

**Manual sync (if needed):**
```bash
./scripts/sync-cli-variants.sh
```

**DO NOT edit synced files directly** in `packages/cli/src/lib/variants/` - all changes must be made in `cli/src/utils/`.

### Multi-Variant Build System

The CLI supports 4 build variants targeting different Node.js versions:

| Variant | Node.js | Module | Playwright | ES Target |
|---------|---------|--------|------------|-----------|
| `modern-esm` | 18+ | ESM | 1.57.x | ES2022 |
| `modern-cjs` | 18+ | CJS | 1.57.x | ES2022 |
| `legacy-16` | 16+ | CJS | 1.49.x | ES2021 |
| `legacy-14` | 14+ | CJS | 1.33.x | ES2020 |

**Usage:**
```bash
# Auto-detect (recommended)
artk init /path/to/project

# Force specific variant
artk init --variant modern-esm /path/to/project
artk init --variant legacy-16 /path/to/project
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

### IntelliJ Plugin Tests

**IMPORTANT:** IntelliJ plugin tests (`packages/intellij-plugin/src/test/`) MUST always use the IntelliJ Platform test framework. Never use JUnit 5 or other test frameworks.

**Requirements:**
- Tests extend `BasePlatformTestCase` (JUnit 3 style)
- Test methods use `testXxx` naming convention (not backticks or `@Test`)
- Use `java.nio.file.Files.createTempDirectory()` for temp directories
- The `gradle-intellij-plugin` automatically configures the test environment
- Do NOT add JUnit 5 dependencies or `useJUnitPlatform()` configuration

**Example test structure:**
```kotlin
class MyDetectorTest : BasePlatformTestCase() {
    private lateinit var testDir: File

    override fun setUp() {
        super.setUp()
        testDir = Files.createTempDirectory("my-test").toFile()
    }

    override fun tearDown() {
        try {
            testDir.deleteRecursively()
        } finally {
            super.tearDown()
        }
    }

    fun testSomething() {
        // Test code using platform APIs
        assertEquals(expected, actual)
    }
}
```

**Running tests:**
```bash
cd packages/intellij-plugin
./gradlew test
```

### AutoGen Integration Tests

The AutoGen module has three levels of integration testing:

#### 1. State Machine Tests (Deterministic)

Tests the pipeline state management module directly:

```bash
cd core/typescript/autogen
npm test -- tests/integration/full-pipeline.test.ts
```

**Coverage:**
- State machine transitions: `initial → analyzed → planned → generated → tested → completed`
- Invalid transition blocking (e.g., can't skip from `initial` to `generated`)
- Refinement loop tracking with multiple iterations
- Blocked state handling and recovery
- Error recovery from corrupted/missing state files
- Command history tracking (100 entries max)

**Location:** `tests/integration/full-pipeline.test.ts`

#### 2. CLI Execution Tests (Deterministic)

Tests actual CLI command execution via subprocess:

```bash
cd core/typescript/autogen
npm test -- tests/integration/cli-execution.test.ts
```

**Coverage:**
- Help and version flags
- Status command (text and JSON output)
- Clean command with artifacts
- Analyze command with journey files
- Error handling (unknown commands, path traversal)
- State persistence across commands

**Location:** `tests/integration/cli-execution.test.ts`

#### 3. Acceptance Tests (Non-Deterministic, Includes LLM)

Full end-to-end pipeline tests with LLM code generation:

```bash
cd core/typescript/autogen

# Structural checks only (no LLM, fast)
npx tsx tests/acceptance/runner.ts --structural-only

# Full E2E with human verification
npx tsx tests/acceptance/runner.ts --interactive

# Specific scenario
npx tsx tests/acceptance/runner.ts --scenario scenarios/happy-path-login.yml
```

**Coverage:**
- Complete pipeline: analyze → plan → generate → run → refine
- Stage-specific checklists with severity levels
- Human verification prompts for semantic checks
- Circuit breaker and error recovery

**Location:** `tests/acceptance/`

**Checklist files:**
- `checklists/stage-analyze.yml` - Analysis validation
- `checklists/stage-plan.yml` - Plan validation
- `checklists/stage-generate.yml` - Code generation validation (includes LLM checks)
- `checklists/stage-run.yml` - Test execution validation
- `checklists/stage-refine.yml` - Refinement validation

**Note:** All tests use isolated temporary directories and don't affect your actual project state.

#### 4. Full E2E Test (Bootstrap + Pipeline)

Complete end-to-end test that creates a sample project and runs the full CLI pipeline:

```bash
cd core/typescript/autogen

# Run full E2E (skip generate - no LLM dependency)
./tests/e2e/run-full-e2e.sh --skip-generate

# Run with generate stage (may fail without LLKB)
./tests/e2e/run-full-e2e.sh

# Keep project after test for inspection
./tests/e2e/run-full-e2e.sh --keep

# Verbose output
./tests/e2e/run-full-e2e.sh --verbose
```

**What it does:**
1. Creates a sample project in `tmp/` (gitignored)
2. Sets up ARTK directory structure
3. Creates a test journey
4. Runs: `clean → status → analyze → plan → generate`
5. Validates state transitions at each step

**Location:** `tests/e2e/run-full-e2e.sh`

**IMPORTANT:** The `tmp/` directory is gitignored. Never commit files from `tmp/`.

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

## Multi-AI Tools (Octo)

When using octo skills (`/octo:review`, `/octo:brainstorm`, `/octo:debate`, etc.):

1. **Always confirm participants:** After running any octo skill, explicitly state which AI models participated in the session. Example:
   ```
   Participants: Claude (primary), Gemini (reviewer), Codex (challenger)
   ```

2. **Document consensus/disagreements:** If multiple AIs participated, note where they agreed and disagreed.

3. **Include confidence levels:** Report the collective confidence from the multi-AI session.

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
| `.github/prompts/` | Stub prompt files that delegate to agents (invoke with `/artk.*`) |
| `.github/agents/` | Full agent implementations with handoffs (invoke with `@artk.*`) |
| `.artk/context.json` | ARTK context metadata |
| `artk-e2e/package.json` | Dependencies and scripts |
| `artk-e2e/playwright.config.ts` | Playwright configuration |
| `artk-e2e/artk.config.yml` | ARTK configuration |

**Two-Tier Prompt/Agent Architecture:**
- **Prompts** (`.github/prompts/artk.*.prompt.md`): Minimal stub files with `agent:` property that delegate to full agents
- **Agents** (`.github/agents/artk.*.agent.md`): Full implementation with handoffs (suggested next actions)
- User invokes with `/artk.journey-define` (loads prompt → delegates to agent → handoffs appear after execution)

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


## LLKB Lifecycle (Creation and Initialization)

**IMPORTANT:** LLKB (Lessons Learned Knowledge Base) is created during **bootstrap** and verified/fallback-created during `/artk.discover-foundation` (Step F11).

### When LLKB Gets Created

**Primary: Bootstrap (Step 6.5)**
- Bootstrap scripts (`bootstrap.sh` / `bootstrap.ps1`) call `initializeLLKB()` after npm install
- This creates the `.artk/llkb/` directory structure with all required files
- If this fails (non-fatal), discover-foundation will create it as fallback

**Fallback: discover-foundation (Step F11.0a)**
- Step F11 checks if LLKB exists
- If missing, it calls `initializeLLKB()` from vendored `@artk/core`
- This ensures LLKB is always present before journey-implement runs

### LLKB Initialization Steps
1. Creates `.artk/llkb/` directory structure
2. Initializes `config.yml` with default settings
3. Initializes `lessons.json`, `components.json`, `analytics.json` (empty)
4. Creates `patterns/` and `history/` subdirectories

### Why journey-implement Blocks Without LLKB

The `/artk.journey-implement` prompt has a **MANDATORY GATE** (Step 1) that checks for LLKB:
- If LLKB is missing or invalid, it blocks with "LLKB STRUCTURE INVALID"
- This is intentional - LLKB should already exist from bootstrap or discover-foundation
- DO NOT make LLKB optional in journey-implement; ensure bootstrap/discover-foundation created it

### Troubleshooting: LLKB Not Created

If journey-implement fails with "LLKB STRUCTURE INVALID":
1. **Most likely cause:** Bootstrap failed silently or was run with old version
2. **Fix:** Re-run bootstrap with `--force` flag: `artk init . --force`
3. **Alternative fix:** Run discover-foundation again (it has fallback creation)
4. **Manual fix:** From artk-e2e directory, run:
   ```bash
   node -e "require('./vendor/artk-core/dist/llkb').initializeLLKB('.artk/llkb')"
   ```

### LLKB Directory Structure

```
${HARNESS_ROOT}/.artk/llkb/
├── config.yml          # LLKB configuration
├── lessons.json        # Accumulated lessons
├── components.json     # Extracted components
├── analytics.json      # Usage metrics
├── patterns/           # Pattern templates
└── history/            # Learning history
```

### CLI Commands for LLKB

```bash
# Initialize LLKB (normally done by discover-foundation)
artk llkb init

# Check LLKB health
artk llkb health

# View statistics
artk llkb stats

# Export for AutoGen
artk llkb export --for-autogen --output ./
```

---

## LLKB-AutoGen Integration

ARTK features a self-improving test generation system where LLKB (Lessons Learned Knowledge Base) enhances AutoGen's code generation capabilities through continuous learning.

### How It Works

The integration follows the **Adapter Pattern** to bridge LLKB knowledge and AutoGen's generation engine:

1. **Pattern Recording** (✓ Implemented): During `artk-autogen generate`, successful pattern matches are recorded to LLKB via `recordPatternSuccess()`. Each pattern tracks: original text, normalized text, IR primitive, confidence score (Wilson score), source journeys, success/fail counts.

2. **Knowledge Export** (✓ Implemented): `artk-autogen llkb-patterns export` creates JSON config files with high-confidence patterns (≥0.7 by default) that can be loaded in future generations.

3. **Pattern Matching** (✓ Implemented): During step mapping, LLKB patterns are checked via `matchLlkbPattern()` alongside the 84 core patterns. LLKB patterns require minimum confidence threshold.

4. **Confidence Updates** (⚠️ Partial): `recordPatternSuccess()` updates confidence on successful matches. **Gap:** `recordPatternFailure()` exists but is never called - test failures don't update confidence scores.

### Integration Points

**During Generation (`artk-autogen generate`):**
```bash
# Generate tests - LLKB recording happens automatically
npx artk-autogen generate --plan .artk/autogen/plan.json -o tests/

# Or with explicit LLKB config (if you have exported patterns)
npx artk-autogen generate --plan .artk/autogen/plan.json \
  --llkb-config ./autogen-llkb.config.yml \
  -o tests/
```

**LLKB Pattern Flow:**
1. `generate` command calls `recordPatternSuccess()` for each successfully mapped step
2. Patterns accumulate in `.artk/llkb/learned-patterns.json`
3. Run `artk-autogen llkb-patterns stats` to view accumulated patterns
4. Run `artk-autogen llkb-patterns export` to create reusable config

**Current Limitation:**
- Test execution (`artk-autogen run`) does NOT update LLKB on failures
- To manually record a failure: edit `learned-patterns.json` or implement `recordPatternFailure()` integration

### Key Files Generated

| File | Purpose | Contents |
|------|---------|----------|
| `autogen-llkb.config.yml` | Configuration extension | Additional patterns, selector overrides, timing hints, module mappings |
| `llkb-glossary.ts` | Glossary extension | Natural language term-to-IR-primitive mappings from high-confidence lessons |

**AutoGen Priority:** Core glossary > LLKB glossary (LLKB extends, never overrides core patterns)

### LLKB CLI Commands

LLKB commands are available via `artk-autogen llkb-patterns`:

```bash
# List learned patterns (sorted by confidence)
artk-autogen llkb-patterns list                    # Top 20 patterns
artk-autogen llkb-patterns list --limit 50         # Top 50 patterns
artk-autogen llkb-patterns list --json             # JSON output

# View statistics
artk-autogen llkb-patterns stats                   # Show pattern statistics
artk-autogen llkb-patterns stats --json            # JSON output

# Export patterns for reuse
artk-autogen llkb-patterns export                  # Export to autogen-patterns.json
artk-autogen llkb-patterns export -o custom.json   # Custom output path
artk-autogen llkb-patterns export --min-confidence 0.8  # Higher threshold

# Pattern promotion (patterns with ≥90% confidence, ≥5 successes, ≥2 journeys)
artk-autogen llkb-patterns promote                 # Show promotable patterns
artk-autogen llkb-patterns promote --apply         # Mark as promoted

# Maintenance
artk-autogen llkb-patterns prune                   # Remove low-quality patterns
artk-autogen llkb-patterns prune --min-confidence 0.3
artk-autogen llkb-patterns clear                   # Clear all (with confirmation)
artk-autogen llkb-patterns clear --force           # Clear all (no confirmation)

# Specify custom LLKB location
artk-autogen llkb-patterns stats --llkb-root /path/to/.artk/llkb
```

**Pattern Gap Analysis** (separate command):

```bash
# Analyze blocked steps and pattern gaps
artk-autogen patterns gaps                         # Show top 20 gaps
artk-autogen patterns gaps --category interaction  # Filter by category
artk-autogen patterns stats                        # Telemetry statistics
artk-autogen patterns list                         # List all 84 core patterns
artk-autogen patterns export --json                # Export gaps as JSON
```

### AutoGen CLI Commands

AutoGen provides test generation capabilities through a pipeline of CLI commands:

**Direct Generation (Simple - Recommended for most cases):**
```bash
# Generate tests directly from a journey file
npx artk-autogen generate ../journeys/clarified/JRN-0001__user-login.md \
  -o tests/smoke/ \
  -m \
  --llkb-config ./autogen-llkb.config.yml \
  --llkb-glossary ./llkb-glossary.ts
```

**Pipeline Commands (Advanced - For complex journeys requiring iteration):**

| Command | Description | Usage |
|---------|-------------|-------|
| `analyze` | Analyze journey and output structured JSON | `npx artk-autogen analyze --journey <path>` |
| `plan` | Create test generation plan from analysis | `npx artk-autogen plan --analysis <path>` |
| `generate` | Generate tests (from plan or journey directly) | `npx artk-autogen generate --plan <path>` |
| `run` | Execute Playwright tests and output results | `npx artk-autogen run --tests <path>` |
| `refine` | Analyze failures and suggest refinements | `npx artk-autogen refine --results <path>` |
| `status` | Show current pipeline state | `npx artk-autogen status` |
| `clean` | Clean autogen artifacts for fresh start | `npx artk-autogen clean` |

**Pipeline artifacts are stored in:** `<harnessRoot>/.artk/autogen/`
- `analysis.json` - Journey analysis output
- `plan.json` - Test generation plan
- `pipeline-state.json` - Current pipeline state
- `results.json` - Test execution results
- `samples/` - Multi-sample code generation artifacts
- `telemetry.json` - Cost and performance tracking

**Pipeline Flow Example:**
```bash
cd artk-e2e

# Step 1: Analyze the journey
npx artk-autogen analyze --journey ../journeys/clarified/JRN-0001__user-login.md

# Step 2: Create test plan (review plan.json before proceeding)
npx artk-autogen plan --analysis .artk/autogen/analysis.json

# Step 3: Generate tests from plan
npx artk-autogen generate --plan .artk/autogen/plan.json -o tests/smoke/

# Step 4: Run generated tests
npx artk-autogen run --tests tests/smoke/jrn-0001__user-login.spec.ts

# Step 5: If tests fail, get refinement suggestions
npx artk-autogen refine --results .artk/autogen/results.json

# Step 6: Check pipeline status anytime
npx artk-autogen status

# Step 7: Start fresh
npx artk-autogen clean
```

### Test File Versioning

Generated tests include LLKB version metadata in headers:

```typescript
/**
 * @journey JRN-0001
 * @generated 2026-01-23T10:00:00Z
 * @artk-version 1.0.0
 * @llkb-version 2026-01-23T10:00:00Z
 * @llkb-entries 24
 *
 * DO NOT EDIT GENERATED SECTIONS
 */
```

This enables version tracking and allows `/artk.journey-maintain` (when implemented) to detect outdated tests and offer updates.

### Verify LLKB Feedback Loop (Trigger: "verify llkb loop")

When user says **"verify llkb loop"** or **"test llkb feedback"**, run this verification:

```bash
# From autogen directory
cd core/typescript/autogen

# Run full E2E test (includes LLKB verification)
./tests/e2e/run-full-e2e.sh --keep

# The test verifies:
# 1. Tests are generated (not empty shells)
# 2. LLKB patterns are learned (88+ patterns recorded)
# 3. Pattern coverage is excellent (60/60 patterns)
# 4. State machine transitions correctly
```

**What to check in the output:**
1. **Generate stage**: Should show "LLKB patterns learned: N (M skipped)"
2. **Pattern coverage**: Should be ≥45/60 (EXCELLENT)
3. **Final result**: Should be 4/4 stages passed

**To verify LLKB learning manually:**
```bash
# In the kept test project (path shown in output)
cd /path/to/tmp/e2e-test-project-XXXXXX/artk-e2e

# Check learned patterns
cat .artk/llkb/learned-patterns.json | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(f'Total patterns: {len(data[\"patterns\"])}')
print(f'Last updated: {data.get(\"lastUpdated\")}')
high_conf = [p for p in data['patterns'] if p['confidence'] >= 0.5]
print(f'High confidence (>=0.5): {len(high_conf)}')
"

# Re-run generate to verify confidence increases
node /path/to/ARTK/core/typescript/autogen/dist/cli/index.js generate -o tests/ --force

# Check pattern count increased
cat .artk/llkb/learned-patterns.json | python3 -c "import sys,json; print(f'Patterns after regeneration: {len(json.load(sys.stdin)[\"patterns\"])}')"
```

**Expected behavior:**
- First generate: Creates patterns with confidence ~0.44
- Subsequent generates: Same patterns get successCount++ and confidence increases
- Patterns reaching confidence ≥0.9 with successCount ≥5 become promotable

### Architecture Details

**See:**
- `research/2026-01-23_llkb-autogen-integration-specification.md` - Full technical specification
- `research/2026-01-23_llkb-autogen-integration-debate.md` - Architecture debate and design decisions
- `core/typescript/llkb/adapter.ts` - Adapter implementation
- `core/typescript/llkb/learning.ts` - Learning loop implementation
- `core/typescript/llkb/versioning.ts` - Version comparison and update logic

---

## Journey-Maintain and LLKB Updates

**IMPORTANT NOTE:** When `/artk.journey-maintain` prompt is implemented, it MUST handle updating older tests to use the latest LLKB knowledge.

### Required Features (5-Point Checklist)

When implementing `/artk.journey-maintain`, ensure these 5 capabilities are included:

1. **Version Check**
   - Read each test's `@llkb-version` header from test file comments
   - Compare against current LLKB state (from `.artk/llkb/analytics.json` `lastUpdated`)
   - Identify tests that are outdated (test version < current LLKB version)
   - Count new patterns/components available since test generation

2. **User Confirmation**
   - ALWAYS prompt user before updating tests to latest LLKB version
   - Never auto-update without explicit user approval
   - Provide clear information: "N tests have outdated LLKB. Update to latest? [Y/n/preview]"
   - Support batch confirmation: "Update all N tests with one confirmation? [Y/n]"

3. **Diff Preview**
   - Show what will change BEFORE applying updates
   - Display: Previous LLKB version → New LLKB version
   - Display: Number of new patterns/components available
   - Display: Test file path and Journey ID
   - Allow user to review changes before proceeding

4. **Batch Support**
   - Allow updating all outdated tests with single confirmation
   - Use `artk llkb update-tests --tests-dir artk-e2e/tests/` for batch operations
   - Support dry-run mode: `--dry-run` flag to preview without writing
   - Report summary after batch update (N updated, N skipped, N failed)

5. **Rollback on Failure**
   - Create backup before regeneration: `{testFile}.llkb-backup-{timestamp}`
   - After regeneration, run quick verify (Playwright test execution)
   - If verify fails: Automatically rollback from backup
   - Flag failed updates for manual review
   - Log failure reason and preserve backup for investigation
   - Clean up backup only on successful verify

### Test Header Format

```typescript
/**
 * @journey JRN-0001
 * @generated 2026-01-23T10:00:00Z
 * @artk-version 1.0.0
 * @llkb-version 2026-01-23T10:00:00Z
 * @llkb-entries 24
 *
 * DO NOT EDIT GENERATED SECTIONS
 */
```

### Update Flow

```
1. Detect Outdated Tests
   ↓
   artk llkb check-updates --tests-dir artk-e2e/tests/
   ↓
   Output: "N tests need LLKB update (new patterns: X, new components: Y)"

2. User Decision
   ↓
   Prompt: "Update N tests to latest LLKB? [Y/n/preview]"
   ↓
   If preview: Show comparison for each test
   If yes: Continue to step 3
   If no: Exit

3. Backup & Re-export
   ↓
   For each outdated test:
     - Create backup: {testFile}.llkb-backup-{timestamp}
     - Re-export LLKB: artk llkb export --for-autogen
     - Regenerate test with AutoGen (with --llkb-config, --llkb-glossary)

4. Quick Verify
   ↓
   Run: npx playwright test {testFile}
   ↓
   If PASS: Delete backup, mark success
   If FAIL: Rollback from backup, flag for review

5. Report Results
   ↓
   Summary: "Updated: N, Failed (rolled back): M, Skipped: K"
```

### LLKB Health Maintenance

Journey-Maintain should also support LLKB health operations:

```bash
# Prune low-confidence lessons and old history
artk llkb prune --history-retention-days 90

# Archive inactive components (unused for 180+ days)
artk llkb prune --archive-inactive-components --inactive-days 180

# Regenerate analytics
artk llkb stats
```

### Structural Change Detection

When regenerating tests with updated LLKB:
- **Capture before**: Test structure (steps, assertions, fixtures)
- **Capture after**: New test structure
- **Compare**: Detect behavioral changes vs structural-only changes
- **If behavioral change**: STOP, require manual review
- **If structural-only**: Apply with notice (e.g., better selectors, same test flow)

This ensures tests continuously benefit from LLKB improvements while maintaining safety and user control.

---

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

## Architecture Status (2026-02-03)

**See:** `research/2026-02-01_journey-implement-architecture-analysis.md`

The journey-implement system is a **hybrid architecture**:
- **CLI** (`artk-autogen`): Full pipeline commands (analyze, plan, generate, run, refine, validate, verify)
- **AutoGen**: Deterministic pattern-based code generation (84 patterns, handles ~82% of steps)
- **LLM**: Not yet integrated - blocked steps become TODOs (~18% of steps)
- **LLKB**: Learning system - pattern recording and CLI fully implemented

### What's Working ✓

| Component | Status | Details |
|-----------|--------|---------|
| Pattern Matching | ✓ Complete | 84 patterns in v1.1.0 covering navigation, clicks, fills, assertions, waits, modals, alerts |
| LLKB Recording | ✓ Complete | `recordPatternSuccess()` called during generation, Wilson score confidence |
| LLKB CLI | ✓ Complete | `artk-autogen llkb-patterns list/stats/export/promote/prune/clear` |
| Pattern Analysis | ✓ Complete | `artk-autogen patterns gaps/stats/list/export` |
| Pipeline Commands | ✓ Complete | analyze, plan, generate, run, refine, status, clean |
| Validation | ✓ Complete | `artk-autogen validate` with optional ESLint |
| Security | ✓ Complete | String escaping, URL sanitization, path traversal prevention |

### Additional Working Features

| Feature | Command | Notes |
|---------|---------|-------|
| Test Healing | `artk-autogen verify --heal` | Auto-fix failing selectors with retry loop |
| Stability Checks | `artk-autogen verify --stability` | Repeat tests to detect flaky tests |
| Refinement Analysis | `artk-autogen refine` | Analyze failures, suggest fixes |
| Error Parsing | Built-in | Categorizes errors: selector, timeout, assertion, navigation, typescript, runtime |
| Convergence Detection | Built-in | Detects when refinement loop is stuck |
| Glossary System | Built-in | Term normalization for pattern matching |

### Remaining Gaps ✗

| Issue | Impact | Fix Needed |
|-------|--------|------------|
| `recordPatternFailure()` never called | LLKB confidence doesn't decrease on test failures | Call in `run.ts` when tests fail |
| `extractLessonsFromSession()` not integrated | Refinement fixes don't feed back to LLKB | Call in `refine.ts` after successful fixes |
| No LLM integration | ~18% of steps become TODO comments | Future: integrate LLM for blocked steps |
| Cold start | New projects start with empty LLKB | Patterns accumulate over multiple generations |

### AutoGen CLI Quick Reference

```bash
# Pipeline Commands
artk-autogen analyze "journeys/*.md"     # Analyze journeys → analysis.json
artk-autogen plan                        # Create test plan → plan.json
artk-autogen generate                    # Generate tests (~82% coverage)
artk-autogen run tests/*.spec.ts         # Execute tests → results.json
artk-autogen refine                      # Analyze failures, suggest fixes
artk-autogen status                      # Show pipeline state
artk-autogen clean                       # Clean autogen artifacts

# Validation Commands
artk-autogen validate journeys/*.md      # Validate journey files
artk-autogen validate tests/*.spec.ts --lint  # Validate with ESLint
artk-autogen verify journeys/*.md        # Generate + run + verify
artk-autogen verify journeys/*.md --heal # Auto-heal failing tests
artk-autogen verify journeys/*.md --stability  # Check for flaky tests

# LLKB Management
artk-autogen llkb-patterns list          # List learned patterns
artk-autogen llkb-patterns stats         # View statistics
artk-autogen llkb-patterns export        # Export for reuse
artk-autogen llkb-patterns promote       # Check promotable patterns
artk-autogen llkb-patterns prune         # Remove low-quality patterns

# Pattern Analysis
artk-autogen patterns list               # List all 84 core patterns
artk-autogen patterns gaps               # Find pattern gaps
artk-autogen patterns stats              # Telemetry statistics

# Management
artk-autogen install --dir ./project     # Install autogen instance
artk-autogen upgrade                     # Upgrade to new version
```
