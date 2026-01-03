# ARTK Implementation Review - Brutal Honesty Edition

**Date:** 2026-01-03
**Scope:** All changes made since yesterday (prompt merger, validation, instructions consolidation)

---

## Executive Summary

**Overall Assessment: 7/10 - Good foundation, but several gaps need addressing**

The changes are directionally correct but have implementation gaps that could cause user confusion, silent failures, or inconsistent behavior across prompts.

---

## 1. Prompt Merger (`init-playbook` + `journey-system`)

### What Was Done
- Merged two prompts into one (`artk.init-playbook.md`)
- Added `journeySystem=true|false` opt-out flag
- Deleted `artk.journey-system.md`

### Issues Found

#### 🔴 CRITICAL: Journey System Steps Are Incomplete

The merged prompt references steps that don't fully exist:

**Step 9-11 reference Core detection/installation, but:**
- Where is the Core source? The prompt says "auto-detect" from paths like `<repoRoot>/artk-core-journeys`
- But we install from `.artk/core/` (copied by install-prompts.sh)
- **The auto-detect paths don't match what we actually install**

**Broken flow:**
```
Prompt says: Look for Core at vendor/artk-core-journeys
Reality: Core is at .artk/core/ (from install script)
```

**Fix needed:** Update Step 10 to look for `.artk/core/` first.

#### 🟡 MEDIUM: Missing `core.manifest.json`

Step 9 says Core is installed if `core.manifest.json` exists. But:
- Does @artk/core actually have a `core.manifest.json`?
- I don't see this file being created or copied

**Check needed:** Verify if `core.manifest.json` exists in the core package.

#### 🟡 MEDIUM: No Version Tracking

The prompt talks about version comparison (upgrade if newer, refuse if older), but:
- Where is the version stored?
- How does the prompt compare versions?
- No concrete implementation guidance

#### 🟢 LOW: Questionnaire Length

Standard mode now has 15 questions (was 12 in init-playbook, added 3 from journey-system). This might be too many for "standard" mode.

---

## 2. Foundation Validation (Part 4 in discover-foundation)

### What Was Done
- Added Part 4: Foundation Validation with steps V1-V6
- TypeScript compilation check
- Validation test file template
- Core integration verification
- Summary output

### Issues Found

#### 🔴 CRITICAL: Validation Test File Has Wrong Import Paths

The test file template uses:
```typescript
const { loadConfig } = await import('../../config/env');
const nav = await import('../../src/modules/foundation/navigation/nav');
```

**Problems:**
1. `__dirname` doesn't work in ESM modules (which Playwright uses)
2. The relative paths assume test file is at `tests/foundation/foundation.validation.spec.ts`
3. If ARTK_ROOT is not `artk-e2e`, paths break

**Fix needed:** Use Playwright's `import.meta.url` or absolute paths.

#### 🔴 CRITICAL: fs/path Imports in Browser Context

The validation tests use:
```typescript
const fs = await import('fs');
const path = await import('path');
```

**Problem:** Playwright tests run in Node.js, but this pattern is fragile. Dynamic imports of Node built-ins can fail depending on bundler configuration.

**Better approach:** Use `@playwright/test`'s built-in file utilities or move these to setup fixtures.

#### 🟡 MEDIUM: No Fallback for Missing Modules

If a module doesn't exist, the validation test will crash with an unhelpful error. Should have graceful error handling:
```typescript
try {
  const nav = await import('../../src/modules/foundation/navigation/nav');
} catch (e) {
  test.fail(`Module not found: foundation/navigation/nav`);
}
```

#### 🟡 MEDIUM: Step V4 Uses CommonJS

```bash
node -e "
const { loadConfig } = require('./vendor/artk-core/dist/config');
```

**Problem:** @artk/core is ESM (`"type": "module"` in package.json). `require()` won't work.

**Fix needed:** Use ESM syntax:
```bash
node --experimental-vm-modules -e "
import('./vendor/artk-core/dist/config/index.js').then(m => console.log('✓'));
"
```

#### 🟢 LOW: Auth Validation Optional But Not Clearly Gated

Step V5 says "If auth modules were created" but doesn't specify how to detect this. Should check for `tests/setup/auth.setup.ts` existence.

---

## 3. Copilot Instructions Consolidation

### What Was Done
- Removed references to `.github/instructions/*.md`
- Updated init-playbook to use single `.github/copilot-instructions.md`
- Updated master document

### Issues Found

#### 🟢 LOW: Template Uses Placeholder

The template in init-playbook has:
```markdown
ARTK (Automatic Regression Testing Kit) is installed in this project at `<ARTK_ROOT>/`.
```

The prompt says to replace `<ARTK_ROOT>` but doesn't give the agent a concrete instruction on WHERE to get this value. Should be:

```markdown
**Replace `<ARTK_ROOT>` with the value computed in Step 2** (e.g., `artk-e2e`).
```

#### 🟢 LOW: No Append Logic for Existing File

The prompt says "If the file exists: append the `## ARTK E2E Testing Framework` section."

But there's no guidance on:
- How to detect if ARTK section already exists (to avoid duplicates)
- Where to append (end of file? after which section?)
- How to handle if file has conflicting rules

**Should add:** Check for `## ARTK E2E Testing Framework` header; if exists, replace section instead of append.

---

## 4. Cross-Prompt Consistency Issues

### 🔴 CRITICAL: Next Commands Are Out of Sync

| Prompt | Says Next Is |
|--------|--------------|
| `init-playbook` completion checklist | `/discover-foundation`, `/journey-propose` |
| `discover-foundation` completion checklist | `/journey-propose` |
| README workflow | `/artk.init-playbook` → `/artk.discover-foundation` |

**But:** `discover-foundation` Step F7.5 references AutoGen Core (`artk-autogen catalog-generate`). Is this actually installed? Is the CLI available?

**Check needed:** Verify artk-autogen CLI is installed and accessible.

### 🟡 MEDIUM: Module Path Inconsistencies

| Prompt | Module Path |
|--------|-------------|
| `discover-foundation` | `src/modules/foundation/navigation/nav.ts` |
| `init-playbook` (directory structure) | No `src/` prefix shown for modules |

The directory structure in Step 5A shows:
```
tests/
  journeys/
  modules/     <-- modules inside tests?
```

But Step F9 (discover-foundation) shows:
```
src/
  modules/
    foundation/
```

**Which is correct?** Need to standardize.

### 🟡 MEDIUM: Package.json Script Names

`init-playbook` Step 5E creates:
```json
"journeys:generate": "node tools/journeys/generate.js",
"journeys:validate": "node tools/journeys/validate.js"
```

But the Journey System part (Step 14) creates wrappers at:
```
<ARTK_ROOT>/tools/journeys/generate.js
<ARTK_ROOT>/tools/journeys/validate.js
```

**Question:** Do these wrappers exist or does init-playbook need to create them?

If `journeySystem=false`, the scripts in package.json will fail because the wrappers don't exist.

**Fix needed:** Only add these scripts if `journeySystem=true`.

---

## 5. Backward Compatibility Risks

### 🔴 CRITICAL: Existing Journey System Installations

If a user previously ran `/journey-system` (old separate prompt), then upgrades ARTK:
- The old prompt file is now deleted
- Their existing `journeys/journeys.config.yml` may not match new expectations
- No migration path documented

**Fix needed:** Add a migration note or detection for existing Journey System installations.

### 🟡 MEDIUM: Existing `.github/instructions/` Files

If a user previously had:
```
.github/instructions/artk-tests.instructions.md
.github/instructions/artk-journeys.instructions.md
```

These files will now be orphaned (not used by new setup, but not deleted either).

**Fix needed:** Add cleanup guidance or detection.

### 🟡 MEDIUM: Demo Project May Be Outdated

The `demo/` directory was created with the old flow. Does it still work with the new merged prompt?

**Check needed:** Verify demo project structure matches new expectations.

---

## 6. Missing Features

### 🔴 CRITICAL: No Schema Validation in Init-Playbook

The Journey System part references:
- `journey.frontmatter.schema.json`
- `core.manifest.json`

But these don't appear to be installed or referenced in the actual Core package.

**Check needed:** Verify these files exist in `core/typescript/`.

### 🟡 MEDIUM: No Rollback Mechanism

If foundation validation fails, there's no way to:
- Roll back changes
- Start fresh
- Identify what specifically failed

The validation just says "NEEDS FIXES" but doesn't help diagnose.

### 🟡 MEDIUM: No Idempotency Testing

The prompts claim to be "idempotent + safe" but:
- No test for running init-playbook twice
- No test for running discover-foundation twice
- Could result in duplicate content or conflicts

### 🟢 LOW: No Version Display

User has no way to know:
- Which version of ARTK is installed
- Which version of prompts they're using
- When updates are available

---

## 7. Decision Tree Loopholes

### Loophole 1: What If ARTK_ROOT Detection Fails?

Both prompts say "if still unknown, stop and instruct user to run `/init-playbook` first."

**But:** What if init-playbook itself can't determine ARTK_ROOT? The prompt says "computed after scan" but doesn't specify a fallback.

**Fix:** Add explicit fallback: "If no suitable location found, default to `artk-e2e/` at repo root."

### Loophole 2: What If Core Source Not Found?

Step 10 says if Core source not found, "Ask the user for a path."

**But:** The Core should already be at `.artk/core/` from install-prompts.sh. Why are we looking for "artk-core-journeys"?

**This is a vestige of the old journey-system prompt that wasn't properly adapted.**

### Loophole 3: What If Validation Fails But User Wants to Continue?

The prompt says "Do NOT proceed until all validation tests pass."

**But:** What if user has a legitimate reason to skip (e.g., missing environment config that will be added later)?

**Fix:** Add `--skip-validation` option or `dryRun=true` behavior.

### Loophole 4: What If Both journeySystem=false AND Manual Journey Files Exist?

If user sets `journeySystem=false` but already has:
- `journeys/*.md` files
- `journeys.config.yml`

What happens? The prompt doesn't address this case.

---

## 8. Recommendations (Priority Order)

### P0 - Must Fix Before Use

1. **Fix Core source detection** - Update Step 10 to look for `.artk/core/` first
2. **Fix validation test imports** - Use proper ESM patterns
3. **Fix ESM/CommonJS mismatch** - Step V4 uses `require()` on ESM package
4. **Conditionally add journey scripts** - Only add to package.json if journeySystem=true

### P1 - Should Fix Soon

5. **Standardize module paths** - Decide on `src/modules/` vs `tests/modules/`
6. **Add migration guidance** - For users with old Journey System installation
7. **Add orphan file cleanup** - For `.github/instructions/` files
8. **Add ARTK section duplicate detection** - In copilot-instructions.md append logic

### P2 - Nice to Have

9. **Add version tracking** - In artk.config.yml and display
10. **Add skip-validation option** - For edge cases
11. **Add idempotency tests** - Verify prompts can run twice safely
12. **Reduce questionnaire** - 15 questions is too many for "standard"

---

## 9. Files That Need Updates

| File | Issue | Priority |
|------|-------|----------|
| `prompts/artk.init-playbook.md` | Core source detection, conditional scripts | P0 |
| `prompts/artk.discover-foundation.md` | Validation test imports, ESM fix | P0 |
| `prompts/artk.init-playbook.md` | Module path standardization | P1 |
| `README.md` | May need module path update | P1 |
| `demo/` | Verify compatibility | P1 |

---

## 10. Test Scenarios Needed

Before considering this complete, these scenarios should be tested:

1. **Fresh install** - New project, run init-playbook, run discover-foundation
2. **Upgrade install** - Existing ARTK project, upgrade prompts, run init-playbook again
3. **journeySystem=false** - Verify journey scripts not added, no errors
4. **journeySystem=true** - Verify full journey system installed
5. **Validation failure** - Break a module, verify clear error message
6. **Idempotency** - Run each prompt twice, verify no duplicates/conflicts
7. **Existing instructions file** - Verify ARTK section appended correctly
8. **Demo project** - Verify demo still works after changes

---

## Conclusion

The architectural decisions are sound:
- ✅ Single entry point (init-playbook) is better UX
- ✅ Single instructions file is more reliable
- ✅ Foundation validation catches issues early

But the implementation has gaps:
- ❌ ESM/CommonJS confusion in validation
- ❌ Core source detection uses wrong paths
- ❌ Module path inconsistencies across prompts
- ❌ Missing conditional logic for journeySystem flag

**Recommendation:** Fix P0 issues before deploying to users. The current state could cause confusing errors during first-time setup.
