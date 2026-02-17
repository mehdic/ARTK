---
name: artk.discover-foundation-validate
mode: agent
description: "Foundation validation - TypeScript compilation, module imports, integration checks, validation summary"
---

# ARTK /discover-foundation — PART 4: Foundation Validation

> **DO NOT RUN DIRECTLY.** This is a sub-agent of `/artk.discover-foundation`. It requires the orchestrator to complete Phases 1-3 (Discovery, Foundation Build, LLKB setup) first. If you are running this directly, stop and run `/artk.discover-foundation` instead.

This prompt contains the **VALIDATION phase** of the discover-foundation workflow. It is invoked after Parts 1–3 (Discovery, Foundation Build, and LLKB setup) are complete.

---

# ═══════════════════════════════════════════════════════════════════
# PART 4: FOUNDATION VALIDATION
# ═══════════════════════════════════════════════════════════════════

# ╔═══════════════════════════════════════════════════════════════════╗
# ║  🛑🛑🛑 HARD GATE — CANNOT PROCEED TO VALIDATION 🛑🛑🛑          ║
# ╠═══════════════════════════════════════════════════════════════════╣
# ║                                                                   ║
# ║  BEFORE running ANY validation (V0-V6), verify these files exist: ║
# ║                                                                   ║
# ║  CHECK 1: learned-patterns.json has patterns (not empty array)    ║
# ║    → Read ${HARNESS_ROOT}/.artk/llkb/learned-patterns.json        ║
# ║    → If patterns array is empty: run bootstrap-llkb.cjs --force   ║
# ║                                                                   ║
# ║  CHECK 2: discovered-patterns.json exists                         ║
# ║    → Read ${HARNESS_ROOT}/.artk/llkb/discovered-patterns.json     ║
# ║    → If missing: run Step F12 NOW (npx artk-autogen llkb-patterns ║
# ║      discover --project-root .. --llkb-root .artk/llkb)           ║
# ║                                                                   ║
# ║  CHECK 3: discovered-profile.json exists                          ║
# ║    → Read ${HARNESS_ROOT}/.artk/llkb/discovered-profile.json      ║
# ║    → Created by F12 alongside discovered-patterns.json            ║
# ║                                                                   ║
# ║  IF learned-patterns.json CHECK FAILS (HARD BLOCK):               ║
# ║    DO NOT proceed to V0. Report this failure to the user:         ║
# ║    "LLKB seed patterns are missing. Re-run bootstrap:             ║
# ║     artk init . --force"                                          ║
# ║    This is a prerequisite set up by the orchestrator (Phase 3).   ║
# ║                                                                   ║
# ║  IF discovered-patterns/profile CHECKS FAIL (SOFT WARNING):      ║
# ║    Log warnings but PROCEED to V0. These enrich LLKB but         ║
# ║    journey-implement can still work with seed patterns only.      ║
# ║                                                                   ║
# ║  Output the check results:                                        ║
# ║    ✅ or ❌ learned-patterns.json: {count} patterns                ║
# ║    ✅ or ❌ discovered-patterns.json: {count} patterns             ║
# ║    ✅ or ❌ discovered-profile.json: {framework}                   ║
# ║                                                                   ║
# ╚═══════════════════════════════════════════════════════════════════╝

**This step validates that all foundation modules compile and work correctly.**

## Step V0 — Pre-Compilation Validation (MANDATORY)

**BEFORE running TypeScript compilation, you MUST complete the Pre-Compilation Validation Checklist from `.github/prompts/common/GENERAL_RULES.md`.**

Run through each check:
1. **Duplicate Function Check** — No function defined in multiple files
2. **ESM Import Path Check** — Directory imports include `/index`
3. **Import Usage Check** — No unused imports, unused params prefixed with `_`
4. **Path Alias Check** — Consistent import patterns, aliases defined in tsconfig
5. **Syntax Quick Check** — Template literals use backticks, no unclosed brackets

**Only proceed to Step V1 after ALL checks pass.**

---

## Step V1 — TypeScript Compilation Check

Run TypeScript compiler to catch type errors:

```bash
cd <ARTK_ROOT>
npx tsc --noEmit
```

**Expected outcome:** No compilation errors.

**If errors found:**
- Fix each error before proceeding
- Common issues:
  - Missing type imports
  - Incorrect @artk/core import paths
  - Config type mismatches

## Step V2 — Create Foundation Validation Tests

Create `tests/foundation/foundation.validation.spec.ts`:

```typescript
/**
 * Foundation Validation Tests
 *
 * These tests verify that all foundation modules:
 * 1. Import correctly
 * 2. Compile without errors
 * 3. Basic functionality works
 *
 * Run with: npx playwright test tests/foundation/
 */
import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

// ═══════════════════════════════════════════════════════════════════
// Module Import Validation
// NOTE: Using require() instead of dynamic import() for CommonJS compatibility
// artk-e2e uses CommonJS by default (see tsconfig.json module: "CommonJS")
// ═══════════════════════════════════════════════════════════════════

test.describe('Foundation Module Imports', () => {
  test('config loader imports and loads', async () => {
    const { loadConfig } = require('../../config/env');
    const config = loadConfig();

    expect(config).toBeDefined();
    expect(config.baseUrl).toBeDefined();
  });

  test('navigation module imports', async () => {
    const nav = require('../../src/modules/foundation/navigation/nav');

    expect(nav.gotoBase).toBeDefined();
    expect(nav.gotoPath).toBeDefined();
  });

  test('selector utilities import', async () => {
    const selectors = require('../../src/modules/foundation/selectors/locators');

    expect(selectors.byTestId).toBeDefined();
  });

  test('data harness imports', async () => {
    const runId = require('../../src/modules/foundation/data/run-id');

    expect(runId.generateRunId).toBeDefined();
  });

  test('auth module imports', async () => {
    const auth = require('../../src/modules/foundation/auth/login');

    // Auth module should export login helper
    expect(auth).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════
// Config Validation
// ═══════════════════════════════════════════════════════════════════

test.describe('Config Validation', () => {
  test('environment config has required fields', async () => {
    const { loadConfig } = require('../../config/env');
    const config = loadConfig();

    // Required fields
    expect(config.baseUrl).toBeTruthy();
    expect(typeof config.baseUrl).toBe('string');

    // URL should be valid
    expect(() => new URL(config.baseUrl)).not.toThrow();
  });

  test('environments.json exists and is valid', async () => {
    const envPath = path.join(__dirname, '../../config/environments.json');
    const envExamplePath = path.join(__dirname, '../../config/environments.example.json');

    // Either environments.json or environments.example.json should exist
    const exists = fs.existsSync(envPath) || fs.existsSync(envExamplePath);
    expect(exists).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Playwright Config Validation
// ═══════════════════════════════════════════════════════════════════

test.describe('Playwright Config Validation', () => {
  test('playwright.config.ts is valid', async () => {
    // This test passes if it runs at all - config was loaded by Playwright
    expect(true).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Module Registry Validation
// ═══════════════════════════════════════════════════════════════════

test.describe('Module Registry', () => {
  test('registry.json exists and is valid', async () => {
    const registryPath = path.join(__dirname, '../../src/modules/registry.json');
    expect(fs.existsSync(registryPath)).toBe(true);

    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
    expect(registry.foundation).toBeDefined();
    expect(Array.isArray(registry.foundation)).toBe(true);
    expect(registry.foundation.length).toBeGreaterThan(0);
  });

  test('all registered modules exist', async () => {
    const registryPath = path.join(__dirname, '../../src/modules/registry.json');
    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));

    for (const mod of registry.foundation) {
      const modPath = path.join(__dirname, '../../src/modules', mod.path);
      expect(fs.existsSync(modPath)).toBe(true);
    }
  });
});
```

## Step V3 — Run Validation Tests

Execute the validation tests:

```bash
cd <ARTK_ROOT>
npx playwright test tests/foundation/ --reporter=list
```

**Expected outcome:** All validation tests pass.

**If tests fail:**
1. Check the error message for the specific failure
2. Fix the underlying module/config issue
3. Re-run validation
4. Do NOT proceed until all validation tests pass

## Step V4 — Verify @artk/core Integration

Test that core library integration works.

**For CommonJS projects:**
```bash
# Test core imports work (CommonJS require)
node -e "
const config = require('./vendor/artk-core/dist/config/index.js');
const harness = require('./vendor/artk-core/dist/harness/index.js');
console.log('✓ @artk/core imports successful');
"
```

**For ESM projects (package.json has "type": "module"):**
```bash
# Test core imports work (ESM dynamic import)
node --input-type=module -e "
import('./vendor/artk-core/dist/config/index.js').then(config => {
  return import('./vendor/artk-core/dist/harness/index.js');
}).then(harness => {
  console.log('✓ @artk/core imports successful');
}).catch(err => {
  console.error('✗ Import failed:', err.message);
  process.exit(1);
});
"
```

**Detect module system:**
Check `package.json` for `"type": "module"`. If absent or `"type": "commonjs"`, use the CommonJS version.

**If import fails:**
- Check that vendor/artk-core exists
- Check that dist/ folder is populated
- For CommonJS: Ensure dist contains .js files (not just .mjs)
- Re-run `/artk.init-playbook` to re-copy core

## Step V5 — Optional: Auth Flow Smoke Test

If auth modules were created, validate the auth setup:

```bash
# Run auth setup project only
npx playwright test --project="*-setup" --reporter=list
```

**Note:** This requires valid test credentials configured in environment.

If no credentials available yet:
- Skip this step
- Document in README that auth validation is pending
- Add TODO comment in auth.setup.ts

## Step V6 — Validation Summary

After validation completes, output summary:

```
═══════════════════════════════════════════════════════════════════
FOUNDATION VALIDATION SUMMARY
═══════════════════════════════════════════════════════════════════

TypeScript Compilation:  ✓ PASS / ✗ FAIL
Module Imports:          ✓ PASS / ✗ FAIL
Config Validation:       ✓ PASS / ✗ FAIL
Registry Validation:     ✓ PASS / ✗ FAIL
Core Integration:        ✓ PASS / ✗ FAIL
Auth Flow (optional):    ✓ PASS / ⏭ SKIPPED / ✗ FAIL

Overall: READY / NEEDS FIXES

Next steps:
- If READY: Proceed to /artk.testid-audit (strongly recommended) then /artk.journey-propose
- If NEEDS FIXES: Address errors above before continuing
═══════════════════════════════════════════════════════════════════
```

---

## Completion Checklist

### Discovery
- [ ] `docs/DISCOVERY.md` created/updated (managed markers)
- [ ] `docs/TESTABILITY.md` created/updated (managed markers)
- [ ] Optional machine outputs created (if enabled)
- [ ] Risk-ranked "Top risk flows" list present
- [ ] Smoke/Release Journey shortlist present (if enabled)
- [ ] Blockers captured with remediation actions

### Foundation
- [ ] Playwright config created (uses @artk/core/harness)
- [ ] Auth setup project defined
- [ ] storageState path policy implemented and gitignored
- [ ] env/config loader created
- [ ] Foundation modules scaffolded (auth/nav/selectors/data)
- [ ] Module registry created
- [ ] Harness README created

### LLKB (Lessons Learned Knowledge Base)
- [ ] LLKB migration check performed (Step F11)
- [ ] LLKB pattern discovery completed (Step F12)
- [ ] discovered-patterns.json created with app-specific patterns (Step F12)
- [ ] discovered-profile.json created with framework/library detection (Step F12)
- [ ] LLKB directory structure created (`${HARNESS_ROOT}/.artk/llkb/`)
- [ ] `config.yml` initialized with default settings
- [ ] `lessons.json` initialized (empty array)
- [ ] `components.json` initialized (empty array)
- [ ] `analytics.json` initialized with baseline metrics
- [ ] LLKB CLI utility created or verified

### Validation
- [ ] TypeScript compilation passes (`tsc --noEmit`)
- [ ] Foundation validation tests created
- [ ] All validation tests pass
- [ ] @artk/core integration verified
- [ ] Validation summary output

### Final Output (MANDATORY)
- [ ] Data-Testid Warning displayed (if applicable)
- [ ] "Next Commands" box displayed from file (READ, don't generate)

---

## 🛑 MANDATORY: Self-Validation Gate (BEFORE Final Output)

**STOP. Before displaying the final output, you MUST verify you completed every phase from the Mandatory Execution Plan at the top of this prompt. Go through each item below. For any item marked MISSING, go back and complete it NOW before continuing.**

**Display this checklist in your output with ✅ or ❌ for each item:**

```
╔════════════════════════════════════════════════════════════════════╗
║  EXECUTION PLAN SELF-CHECK                                         ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  PHASE 1: DISCOVERY                                                ║
║    {✅|❌} Routes discovered and reports/discovery/routes.json created  ║
║    {✅|❌} reports/discovery/summary.json created                       ║
║    {✅|❌} docs/DISCOVERY.md created                                    ║
║    {✅|❌} docs/TESTABILITY.md created                                  ║
║                                                                    ║
║  PHASE 2: FOUNDATION BUILD                                         ║
║    {✅|❌} Playwright config created/updated                            ║
║    {✅|❌} Auth module created                                          ║
║    {✅|❌} Foundation modules scaffolded (auth/nav/selectors/data)      ║
║    {✅|❌} Module registry created/updated                              ║
║                                                                    ║
║  PHASE 3: LLKB (Steps F11-F12) ⚠️ MOST COMMONLY SKIPPED           ║
║    {✅|❌} F11: LLKB structure verified/created at .artk/llkb/         ║
║    {✅|❌} F11: learned-patterns.json has seed patterns (NOT empty)     ║
║    {✅|❌} F12: Discovery pipeline ran (npx artk-autogen llkb-patterns discover) ║
║    {✅|❌} F12: discovered-patterns.json created with app patterns      ║
║    {✅|❌} F12: discovered-profile.json created with framework profile  ║
║                                                                    ║
║  PHASE 4: VALIDATION                                               ║
║    {✅|❌} TypeScript compilation passes (tsc --noEmit)                 ║
║    {✅|❌} Foundation validation tests pass                             ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
```

**IF ANY ❌ APPEARS:**
- For F11 items (LLKB structure, learned-patterns.json): These are HARD BLOCKERS. Report failure: "LLKB seed patterns missing. Re-run bootstrap: `artk init . --force`"
- For F12 items (discovered-patterns.json, discovered-profile.json): These are SOFT WARNINGS. Log the warning but proceed — journey-implement can work with seed patterns alone.
- For other items: Evaluate if they were intentionally skipped (e.g., dry-run mode) or missed.
- Do NOT display the "Next Commands" box until all HARD BLOCKER items are ✅.

**Only after all items are ✅ (or intentionally skipped with explanation), proceed to the final output below.**

---

## MANDATORY: Final Output Section

**You MUST display this section at the end of your output, exactly as formatted.**

### Data-Testid Warning (if applicable)

**If NO `data-testid` or `data-test` attributes were detected during discovery, display this warning:**

```
⚠️  WARNING: No data-testid attributes detected in the codebase!
    This will make tests brittle and hard to maintain.

    STRONGLY RECOMMENDED: Run the testid audit before implementing journeys:

    /artk.testid-audit mode=report

    This will identify critical elements that need test hooks.
```

### Next Commands

**🛑 STOP - READ THE FILE, DON'T GENERATE**

You MUST read and display the contents of this file EXACTLY:

**File to read:** `.github/prompts/next-commands/artk.discover-foundation.txt`

**Instructions:**
1. Use your file reading capability to read the file above
2. Display the ENTIRE contents of that file as a code block
3. Do NOT modify, summarize, or add to the file contents
4. Do NOT generate your own version - READ THE FILE

**If you cannot read the file**, display this fallback EXACTLY:
```
╔════════════════════════════════════════════════════════════════════╗
║                         NEXT COMMANDS                              ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  1. (RECOMMENDED) Audit testid coverage:                           ║
║     /artk.testid-audit mode=report                                 ║
║                                                                    ║
║  2. (OPTIONAL) Propose journeys from discovery:                    ║
║     /artk.journey-propose                                          ║
║                                                                    ║
║  3. (OPTIONAL) Create a specific journey manually:                 ║
║     /artk.journey-define id=JRN-0001 title="<your title>"          ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
```

**DO NOT add anything after this box. END your response here.**
