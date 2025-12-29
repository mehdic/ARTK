---
name: journey-system
description: "Phase 3: Install/upgrade ARTK Core (Journeys) and configure the repo-specific Journey system (backlog + index automation)."
argument-hint: "mode=standard|quick|max artkRoot=<path> coreSource=<path> coreInstall=vendor|submodule|subtree|npm coreInstallDir=<path> idPrefix=JRN idWidth=4 layout=auto|flat|staged dryRun=true|false"
agent: agent
---

# ARTK /journey-system — Core + Instance (Journeys)

You are running **ARTK Phase 3**: establish the **Journey system of record** by installing a **versioned ARTK Core (Journeys)** and configuring the **repo-specific ARTK Instance** (config + generated backlog/index).

ARTK is a standardized kit that plugs into GitHub Copilot (repository instructions + prompt files + structured artifacts) to help teams build and continuously maintain complete automated regression testing suites for existing applications. The suites cover end-to-end Journeys, detect regressions early, and keep behavior stable across releases.

This command MUST be:
- **Idempotent**: safe to re-run and to upgrade.
- **Non-destructive**: never delete user Journeys. Never overwrite user-owned docs without explicit “managed markers”.
- **Deterministic**: generated outputs must be stable across runs.
- **Adaptable**: must work for monorepos, polyglot repos, and varying folder layouts.
- **Low-friction**: ask medium questions by default (user can request quick or max).

## What this command does (truth in advertising)
1) **Installs or upgrades ARTK Core (Journeys)** into this repo at a predictable path.
2) Creates/updates **repo-specific Journey configuration**.
3) Creates repo-local **wrapper scripts** that run the Core generator/validator.
4) Creates/updates **repo-local instructions** for Journey authoring.
5) Generates (or stubs) repo-specific outputs:
   - `journeys/BACKLOG.md` (generated, checkbox list)
   - `journeys/index.json` (generated, machine index)

## What this command does NOT do
- It does NOT write Playwright tests (that’s later phases).
- It does NOT change CI/CD in this phase.
- It does NOT invent your Journeys for you (that’s `/journey-propose` and `/journey-define`).

---

# Inputs (optional)
Parse key=value args after `/journey-system`:
- `mode`: `quick | standard | max` (default: `standard`)
- `artkRoot`: ARTK root folder path (default: infer from `artk.config.yml`)
- `coreSource`: where Core is available **in the current workspace** (default: auto-detect common locations)
- `coreInstall`: `vendor | submodule | subtree | npm` (default: `vendor`)
- `coreInstallDir`: where to install the Core (default: `<ARTK_ROOT>/.artk/core/journeys`)
- `layout`: `auto | flat | staged` (default: `auto`)
- `idPrefix`: default `JRN`
- `idWidth`: default `4` (e.g., JRN-0001)
- `dryRun`: `true | false` (default: `false`)

---

# Output contract (always follow)
1) **Detected context (short):**
   - ARTK_ROOT, repo type (mono/multi-app), existing journeys/backlog/index, existing E2E harness path.
2) **Core plan:**
   - whether Core is already installed, versions, and what will change.
3) **Instance plan:**
   - files to create/update in this repo.
4) **Questions (if required):**
   - one compact questionnaire designed for a single reply.
5) If not `dryRun=true`: apply changes and print:
   - Created/Updated checklist
   - How to run generator/validator locally
   - Next commands: `/journey-propose`, `/journey-define`, `/journey-clarify`

---

# Algorithm

## Step 1 — Locate ARTK_ROOT (scan first)
Determine `ARTK_ROOT` in this order:
1) `artkRoot=` argument
2) nearest `artk.config.yml` (search upward from CWD)
3) if multiple candidates exist (monorepo), choose the one that already has `journeys/` or `e2e/` folders; otherwise ask user to pick.

If ARTK_ROOT cannot be determined, stop and tell the user to run `/init` first.

## Step 2 — Detect existing Journey Instance
Check under `<ARTK_ROOT>/journeys/` for:
- `journeys.config.yml`
- `README.md`
- any `JRN-*.md` (or existing Journey files)
- generated outputs: `BACKLOG.md`, `index.json`

Do NOT delete anything. Preserve existing structure unless broken.

## Step 3 — Detect installed ARTK Core (Journeys)
Default install dir: `<ARTK_ROOT>/.artk/core/journeys` unless overridden.

Core is considered “installed” if these exist:
- `<coreInstallDir>/core.manifest.json`
- `<coreInstallDir>/journeys/schema/journey.frontmatter.schema.json`
- `<coreInstallDir>/journeys/tools/node/generate.js` and `validate.js`

Read the installed Core version from `core.manifest.json`.

## Step 4 — Find Core source (for install/upgrade)
Core source is where the Core files can be copied *from* (in the current workspace).

### Auto-detect (in order)
Try these paths (first match wins):
1) `coreSource=` argument (if provided)
2) `<repoRoot>/artk-core-journeys` (a checked-out core repo or subtree)
3) `<repoRoot>/.artk/core-src/artk-core-journeys`
4) `<repoRoot>/tools/artk-core-journeys`
5) `<repoRoot>/vendor/artk-core-journeys`

A valid Core source must contain `core.manifest.json` at its root.

If no Core source is found:
- Ask the user for a path to the Core source in the workspace (recommended).
- If the user insists on remote install: provide instructions for adding Core as a subtree/submodule, but DO NOT perform network operations unless the environment supports it.

## Step 5 — Install or upgrade ARTK Core (Journeys)
**Goal:** place an exact copy of the Core source into `<coreInstallDir>`.

Rules:
- If Core is not installed: install it.
- If Core is installed and source version is newer: upgrade it.
- If Core is installed and source version is the same: do nothing.
- If Core is installed and source version is older: refuse by default (unless user explicitly requests downgrade).

### Upgrade safety
- Never overwrite repo-owned files outside `<coreInstallDir>` without managed markers.
- Inside `<coreInstallDir>`, it’s fine to replace files entirely (Core-managed zone).

### Record pinning
Update (or create) `<ARTK_ROOT>/artk.config.yml` to include:
```yaml
core:
  journeys:
    install: vendor
    installDir: .artk/core/journeys
    version: "<installed version>"
    sourcePath: "<relative path to coreSource>"
```
If `artk.config.yml` already exists with a different structure, preserve existing keys and add this section minimally.

## Step 6 — Create/Update repo-local Journey config (Instance)
Create or update: `<ARTK_ROOT>/journeys/journeys.config.yml`

This file is repo-specific and should include:
- ID scheme: prefix + width
- layout: flat/staged
- tiers + statuses (defaults from Core, but repo can extend if desired)
- backlog grouping preferences

Defaults:
```yaml
id:
  prefix: JRN
  width: 4
layout: flat
tiers: [smoke, release, regression]
statuses: [proposed, defined, clarified, implemented, quarantined, deprecated]
backlog:
  groupBy: tier
  thenBy: status
```

If the file exists, preserve user customizations and only fill missing keys.

## Step 7 — Create/Update repo-local Journey README (Instance doc)
Create/update `<ARTK_ROOT>/journeys/README.md` using the Core template:
- `<coreInstallDir>/journeys/docs/README.template.md`

This README may contain repo-specific notes (auth approach, environment quirks).
Use managed markers so you can update the generic parts without clobbering local notes:
- `<!-- ARTK:BEGIN --> ... <!-- ARTK:END -->`

## Step 8 — Create repo-local wrapper scripts (Instance)
Create:
- `<ARTK_ROOT>/tools/journeys/generate.js`
- `<ARTK_ROOT>/tools/journeys/validate.js`

Wrappers must:
- infer ARTK_ROOT (or accept `--artkRoot`)
- call the Core scripts in `<coreInstallDir>/journeys/tools/node/`
- pass through CLI args
- print friendly errors if Node deps are missing

Example wrapper behavior:
- `node <ARTK_ROOT>/tools/journeys/generate.js` regenerates `journeys/BACKLOG.md` + `journeys/index.json`
- `node <ARTK_ROOT>/tools/journeys/validate.js` validates only

## Step 9 — Ensure generator dependencies are available (Instance guidance only)
Core tools require Node deps: `ajv`, `yaml`, `fast-glob`, `minimist`.
If a Playwright harness package.json exists under ARTK_ROOT, add these as devDependencies.
If no package.json exists yet:
- Do not create a full harness here.
- Add a note to the output telling the user Phase 1/2 must provide the harness.

## Step 10 — Create/Update Copilot Journey authoring instructions
Create/update:
- `.github/instructions/artk-journeys.instructions.md`

Use an `applyTo:` glob that targets Journey files, e.g.:
- `<ARTK_ROOT>/journeys/**/*.md`
Exclude templates/schema/backlog files if needed.

Instructions must:
- enforce that every Journey has valid YAML frontmatter per Core schema
- enforce the “two-layer” writing style:
  - Declarative Acceptance Criteria (behavior-focused)
  - Procedural Steps (UI walkthrough)
- require stable ID usage
- require status rules (implemented requires tests[]; quarantined requires owner + issue link)
- prefer declarative language (avoid UI-only phrasing in acceptance criteria)

## Step 11 — Generate or stub outputs
If Journey files exist:
- Generate BACKLOG.md and index.json content deterministically (you may do this by invoking the generator logic conceptually; if tool execution is unavailable, generate content by reading/parsing Journeys yourself).

If no Journey files exist yet:
- Create stub generated files with headers and zero counts.

Generated outputs live at:
- `<ARTK_ROOT>/journeys/BACKLOG.md`
- `<ARTK_ROOT>/journeys/index.json`

Both MUST include “Generated. Do not edit by hand.”

---

# Question policy (keep it medium by default)
Only ask questions if you cannot safely infer answers.

### QUICK (≤ 3)
Ask only if missing:
1) Core source path in workspace
2) ID prefix/width
3) layout flat vs staged

### STANDARD (≤ 6)
Quick +:
4) confirm tiers (`smoke`, `release`, optional `regression`)
5) confirm whether procedural steps section is required (default: yes)
6) confirm how to store requirement links (yes/no)

### MAX (add up to 6)
Standard +:
- monorepo: group Journeys by app scope? yes/no
- “no-go” areas / restricted systems
- artifact/PII constraints to mention in README
- whether to allow imports from existing `.feature` or test docs (future)
- default actor roles list
- preferred glossary/domain language file

Provide a compact reply template if asking questions.

---

# Edge cases you MUST handle
- **Monorepo:** multiple ARTK_ROOT candidates, multiple apps, different auth per app.
- **Existing Journey files with no frontmatter:** do not rewrite them silently. Offer to convert later.
- **Existing BACKLOG.md edited by humans:** preserve but warn and regenerate into managed markers or replace only if clearly generated.
- **Core already installed but modified:** if files under `<coreInstallDir>` differ from manifest hashes, warn (Core should be immutable) and reinstall from source.
- **Windows paths:** use forward-slash links in markdown output.
- **No Node deps installed:** wrappers should explain what to install instead of failing cryptically.
- **Restricted repos:** no secrets, no external calls unless explicitly allowed.

---

# Completion checklist (print at end)
- [ ] Core installed/upgraded at `<coreInstallDir>`
- [ ] `artk.config.yml` updated with Core pin info
- [ ] `journeys.config.yml` present and sane
- [ ] `journeys/README.md` created/updated (managed markers)
- [ ] wrapper scripts created
- [ ] instructions file created/updated
- [ ] backlog/index generated or stubbed
