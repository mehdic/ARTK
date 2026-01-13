# ARTK Uninstall Prompt

**Date:** 2026-01-13
**Topic:** Plan for a client-deployed prompt that fully uninstalls ARTK assets (prompts, scripts, config, files)

---

## Context and goal
We need a new client-deployed prompt that removes everything ARTK installed, across both bootstrap installs and subsequent prompt-driven setup (playbook + journey system). The uninstall must be safe, explicit, and idempotent because it performs destructive deletions, and it must avoid removing non-ARTK or user-authored content unless explicitly confirmed.

## Inventory: what ARTK installs today
Based on `scripts/bootstrap.sh` (and matching PowerShell flow), a full install writes:
- Root-level
  - `.github/prompts/artk.*.prompt.md` (copied from `prompts/artk.*.md`)
  - `.artk/context.json`
  - `.artk/.gitignore`
  - `.artk/browsers/` (Playwright cache)
  - `.artk/logs/` (bootstrap logs)
- `artk-e2e/`
  - `vendor/artk-core/` + `vendor/artk-core-autogen/`
  - `tests/`, `docs/`, `journeys/`, `.auth-states/`
  - `package.json`, `playwright.config.ts`, `tsconfig.json`, `artk.config.yml`, `.gitignore`
  - `node_modules/` (if npm install ran)

The `/artk.init-playbook` prompt additionally creates or updates:
- `.github/copilot-instructions.md` (ARTK section appended or full file created)
- `<ARTK_ROOT>/docs/PLAYBOOK.md`
- Journey system files under `<ARTK_ROOT>/journeys/` (including `BACKLOG.md`, `index.json`, `README.md`)
- `tools/journeys/*` wrapper scripts (generate/validate)
- `<coreInstallDir>/journeys/*` (often `.artk/core/journeys`), or `.artk/core/` and `.artk/autogen/` when Core is bundled
- `<ARTK_ROOT>/artk.config.yml` (if not already present)

The @artk/core vendor-only script (`core/typescript/scripts/install-to-project.*`) installs:
- `vendor/artk-core/`
- `package.json` devDependency update (`@artk/core: file:./vendor/artk-core`)
- `node_modules/` (if npm install ran)

## Design principles for uninstall
1. **Explicit consent:** Always show a full deletion list and require confirmation. Offer a dry-run mode by default.
2. **Idempotent:** If files already missing, skip without error and report it.
3. **Safe by default:** Only delete files that match known ARTK-managed paths or carry ARTK markers; prompt for confirmation before deleting anything ambiguous or user-authored.
4. **Preserve user content:** If `artk-e2e/` contains user tests/journeys beyond template scaffolding, warn and ask whether to keep or remove.
5. **Cross-platform:** Provide commands for PowerShell and bash. Avoid network operations.
6. **Minimal footprint:** Remove only ARTK prompt files, not other `.github/prompts`.

## Proposed behavior of the uninstall prompt
### Phase 1: Discovery and validation
- Locate ARTK root from `.artk/context.json` (`artkRoot`) when available.
- Fallback heuristics: detect `artk-e2e/`, `artk.config.yml`, `.github/prompts/artk.*.prompt.md`, `.artk/`.
- Collect all candidate paths for removal (grouped by category).
- Scan for references to `@artk/core` in repo `package.json` and usage in source to avoid removing a dependency that is still in active use.
- Check `git status` and warn if dirty (optional: recommend commit/backup).

### Phase 2: Safety checks and user choices
- Present a removal plan with:
  - guaranteed ARTK-managed paths (safe deletes)
  - ambiguous or user-authored areas (require explicit confirmation)
- Provide choices:
  - **Full uninstall** (remove all ARTK assets, including `artk-e2e/` content)
  - **Framework-only uninstall** (remove scaffolding + prompts, keep user tests/journeys)
- If `.github/copilot-instructions.md` exists and contains the ARTK block, remove only that block; if it only contains ARTK content, delete the file (after confirmation).

### Phase 3: Removal execution
- Remove safe paths first (prompts, `.artk/`, `vendor/` artifacts, `node_modules` under ARTK root).
- Remove `artk-e2e/` or `artk/` root depending on user selection.
- Update `package.json` to remove `@artk/core` and `@artk/core-autogen` dependencies if they were added by ARTK and no remaining references are found.
- Clean up `.github/instructions/*.backup` only if they were created by ARTK migration and the user opts in.

### Phase 4: Report
- Provide a summary of deleted, skipped, and retained files.
- Show next steps (e.g., `npm install` if dependencies were removed).

## Implementation plan (repo changes)
1. **Define uninstall prompt file**
   - Add a new prompt, e.g., `prompts/artk.uninstall.md`, with strict safety flow: discovery → dry-run output → explicit confirmation → deletion.
   - Include OS-specific command snippets for removal (PowerShell + bash).
   - Ensure the prompt only deletes ARTK-owned prompts (`.github/prompts/artk.*.prompt.md`).

2. **Augment bootstrap/install metadata**
   - Extend `.artk/context.json` (future installs) to include a `manifest` list of created paths and maybe hashes for files that can be safely removed.
   - Use this manifest in the uninstall prompt if present, otherwise fall back to heuristics.

3. **Create helper scripts (optional but recommended)**
   - Add `scripts/uninstall.sh` + `scripts/uninstall.ps1` to encapsulate the deletion logic.
   - The prompt can generate and run these scripts in the client repo to keep behavior consistent and testable.

4. **Prompt tests (optional but recommended)**
   - Add a prompt test in `prompts/__tests__/` to assert the uninstall prompt includes confirmation gates and the safe/ambiguous split.

5. **Documentation update**
   - Add uninstall guidance to `README.md` or a dedicated doc, and reference the new `/artk.uninstall` prompt.

## Open questions
- Should uninstall remove user-authored tests/journeys by default, or only on explicit “full uninstall” confirmation?
- Should `.github/copilot-instructions.md` be preserved with ARTK section removed only, or removed entirely when it appears to be ARTK-only?
- Do we want to support uninstalling installations done by `core/typescript/scripts/install-to-project.*` separately (root `vendor/` + `package.json` only)?
