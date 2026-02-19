---
name: artk.journey-implement-gates
mode: agent
description: "Quality gates and finalization (Steps 8-15) — runs journey-promote.cjs deterministic gatekeeper, then displays results. Part of the journey-implement workflow; requires core steps (0-7.5) to be complete."
---

# ARTK /journey-implement-gates — Quality Gates + Finalization

> **DO NOT RUN DIRECTLY.** This is a sub-agent of `/artk.journey-implement`. It requires the core steps (0-7.5) to be complete before running. If you are running this directly, stop and run `/artk.journey-implement` instead.

This handles **Steps 8–15** of the journey-implement workflow using the **deterministic `journey-promote.cjs` gatekeeper script**. The script runs 6 sequential quality gates and only promotes a journey to `status: implemented` if ALL pass.

---

# Step 8–12.9 — Run Deterministic Quality Gates

All quality gates are enforced by `journey-promote.cjs`. Your job is to **run the script and interpret its output** — not to evaluate gate logic yourself.

## 8.1 Locate the script

Find `journey-promote.cjs` in one of these locations (in priority order):
1. `<harnessRoot>/vendor/artk-core/journey-promote.cjs`
2. `<ARTK_ROOT>/scripts/helpers/journey-promote.cjs`

If not found, tell the user to re-run bootstrap: `artk init . --force`

## 8.2 Run the script

```bash
cd <harnessRoot>

# Standard run (all 6 gates, promotes on success):
node vendor/artk-core/journey-promote.cjs <journey-file> . --verbose

# With healing enabled:
node vendor/artk-core/journey-promote.cjs <journey-file> . --verbose --heal

# Dry-run (check gates without modifying journey):
node vendor/artk-core/journey-promote.cjs <journey-file> . --verbose --dry-run

# Skip runtime verification (no test environment):
node vendor/artk-core/journey-promote.cjs <journey-file> . --verbose --skip-verify

# Skip LLKB check:
node vendor/artk-core/journey-promote.cjs <journey-file> . --verbose --skip-llkb
```

**Replace `<journey-file>` with the path to the journey markdown file (e.g., `../journeys/clarified/JRN-0001.md`).**

## 8.3 Interpret results

The script runs these 6 gates (ALL run, no short-circuit):

| Gate | What it checks | Pass condition |
|------|---------------|----------------|
| 1. Empty Stub Detection | await/expect/test.step in each test file | All files have >= 1 of each, no empty bodies |
| 2. TSC Compilation | `npx tsc --noEmit` | Exit 0 (SKIP if no tsconfig.json) |
| 3. Scenario Coverage | AC-N references in test content | >= 80% ACs referenced (SKIP if no ACs found) |
| 4. Static Validation | `npx artk-autogen validate --strict` | Exit 0 (SKIP if autogen unavailable) |
| 5. Runtime Verification | `npx artk-autogen verify` | Exit 0 (SKIP if --skip-verify) |
| 6. LLKB Learning | learned-patterns.json has journey ID | Found (SKIP if --skip-llkb) |

**Step mapping:** Gate 3 (Scenario Coverage) replaces Step 12.9 (Scenario Coverage Audit). Gate 6 (LLKB Learning) replaces Step 12.5 (Record Learning). Do NOT execute Steps 12.5 or 12.9 separately — the script handles them.

**Exit codes:**
- `0` — All gates PASS (or SKIP). Journey promoted to `implemented` (unless `--dry-run`).
- `1` — One or more gates FAIL. Journey NOT promoted. Fix issues and re-run.
- `2` — Pre-condition failure (missing files, invalid frontmatter). Fix setup first.

## 8.4 On gate failure

The script prints **specific fix suggestions** for each failing gate. Read and relay them to the user:

| Failing gate | Fix action |
|-------------|------------|
| Empty Stub Detection | Re-run AutoGen or manually add await/expect/test.step |
| TSC Compilation | Fix TypeScript errors shown in output |
| Scenario Coverage | Add missing AC-N references to test.step() or expect() calls |
| Static Validation | Run `npx artk-autogen validate <journey> --strict` manually |
| Runtime Verification | Run `npx artk-autogen verify <journey> --heal` manually |
| LLKB Learning | Run `npx artk-autogen generate <journey>` to record patterns |

**After fixing, re-run the script.** Do NOT manually set `status: implemented`.

## 8.5 Read evidence

Evidence is always written to `<harnessRoot>/.artk/evidence/<JRN-ID>/gates.json` regardless of pass/fail. Read this file if you need detailed gate results:

```bash
cat <harnessRoot>/.artk/evidence/<JRN-ID>/gates.json
```

---

# Step 13 — Verify promotion (handled by script)

If all gates pass and `--dry-run` is NOT set, `journey-promote.cjs` automatically:
- Sets `status: implemented` in the journey frontmatter
- Records evidence to `.artk/evidence/<JRN-ID>/gates.json`

**You do NOT need to manually update the frontmatter.** The script handles it.

After successful promotion, regenerate backlog/index. Find `generate.js` in one of these locations (in priority order):
1. `<ARTK_ROOT>/tools/journeys/generate.js` (wrapper created by `/artk.init-playbook`)
2. `<harnessRoot>/vendor/artk-core-journeys/journeys/tools/node/generate.js` (vendored copy)

```bash
node <path-to-generate.js> --artkRoot <ARTK_ROOT>
```

If the script exited 0 but the journey wasn't promoted (e.g., status was already `implemented`), note this to the user — it's expected.

---

# Step 14 — Loop to Next Journey

For subagent mode, batch looping is handled by the orchestrator.

For serial mode: loop back to the orchestrator for the next journey.

---

# Step 15 — Print run/debug instructions

After gates complete (pass or fail), always print:

```
Run tests:
  npx playwright test --grep @JRN-#### --workers=1
  npx playwright test <test-file-path>

Debug:
  npx playwright test --grep @JRN-#### --ui
  npx playwright test --grep @JRN-#### --headed

Report & traces:
  npx playwright show-report
  Traces: test-results/
```

**Replace `@JRN-####` with the actual journey ID.**

---

# Final Output (MANDATORY)

Read and display: `.github/prompts/next-commands/artk.journey-implement-gates.txt`

If that file doesn't exist, display:
```
╔════════════════════════════════════════════════════════════════════╗
║  NEXT COMMANDS                                                      ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                     ║
║  1. (IF GATES FAILED) Fix issues and re-run:                       ║
║     node vendor/artk-core/journey-promote.cjs <journey> . --verbose║
║                                                                     ║
║  2. (OPTIONAL) Implement another journey:                           ║
║     /artk.journey-implement id=JRN-####                            ║
║                                                                     ║
║  3. (OPTIONAL) Run all tests for the tier:                          ║
║     npm run test:smoke   (or test:release, test:regression)        ║
║                                                                     ║
╚════════════════════════════════════════════════════════════════════╝
```

**Replace `<journey>` and `JRN-####` with actual values.**
