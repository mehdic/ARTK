# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

## Installing ARTK to Another Project

### Full Installation (Recommended)

Use the main install script to install everything (prompts + core + autogen CLI):

**Unix/macOS/Linux:**
```bash
# From anywhere, run:
/Users/chaouachimehdi/IdeaProjects/ARTK/scripts/install-prompts.sh /path/to/your-project

# Example:
/Users/chaouachimehdi/IdeaProjects/ARTK/scripts/install-prompts.sh ~/projects/req-apps-it-service-shop
/Users/chaouachimehdi/IdeaProjects/ARTK/scripts/install-prompts.sh .
```

**Windows (PowerShell):**
```powershell
# From anywhere, run:
C:\Users\...\ARTK\scripts\install-prompts.ps1 C:\path\to\your-project

# Example:
C:\Users\...\ARTK\scripts\install-prompts.ps1 C:\projects\req-apps-it-service-shop
C:\Users\...\ARTK\scripts\install-prompts.ps1 .
```

**What it installs:**
| Location | Contents |
|----------|----------|
| `.github/prompts/` | Copilot slash commands (`/artk.init`, `/artk.journey-implement`, etc.) |
| `.artk/core/` | @artk/core library (auth, config, fixtures) |
| `.artk/autogen/` | @artk/core-autogen CLI (generate, validate, verify) |

**After installation:**
1. Open VS Code, launch Copilot Chat, run: `/artk.init`
2. Use AutoGen CLI: `node .artk/autogen/dist/cli/index.js generate "journeys/*.md"`

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

**Unix/macOS/Linux** - Add to your `~/.zshrc` or `~/.bashrc`:
```bash
alias artk-install="/Users/chaouachimehdi/IdeaProjects/ARTK/scripts/install-prompts.sh"
alias artk-core-install="/Users/chaouachimehdi/IdeaProjects/ARTK/core/typescript/scripts/install-to-project.sh"
```

**Windows (PowerShell)** - Add to your PowerShell profile (`$PROFILE`):
```powershell
function artk-install { & "C:\Users\...\ARTK\scripts\install-prompts.ps1" @args }
function artk-core-install { & "C:\Users\...\ARTK\core\typescript\scripts\install-to-project.ps1" @args }
```

Then just run:
```bash
# Unix/macOS/Linux
cd ~/projects/my-playwright-project
artk-install .
```
```powershell
# Windows
cd C:\projects\my-playwright-project
artk-install .
```

## Active Technologies
- TypeScript 5.x (Node.js 18.0.0+) + Playwright 1.40.0+, Zod (schema validation), yaml (config parsing), otplib (TOTP generation) (001-artk-core-v1)
- File system (storage states in `.auth-states/`, config in `artk.config.yml`) (001-artk-core-v1)
- TypeScript 5.x (Node.js 18.0.0+) for scripts; Bash for install scripts (with PowerShell parity for Windows) + @artk/core 1.0.0+, @playwright/test 1.40.0+, yaml (config parsing), zod (schema validation) (002-artk-e2e-independent-architecture)
- File-based (YAML config, JSON context, Markdown journeys) (002-artk-e2e-independent-architecture)
- TypeScript 5.x (Node.js 18.0.0+) + Bash/PowerShell scripts + Playwright 1.40+, @artk/core (built in 001), Zod, yaml, otplib (003-artk-pilot-launch)
- File-based (artk.config.yml, .auth-states/*.json, .artk/context.json) (003-artk-pilot-launch)

## Recent Changes
- 001-artk-core-v1: Added TypeScript 5.x (Node.js 18.0.0+) + Playwright 1.40.0+, Zod (schema validation), yaml (config parsing), otplib (TOTP generation)
