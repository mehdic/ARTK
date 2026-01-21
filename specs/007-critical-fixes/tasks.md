# Tasks: Critical Fixes Implementation

**Spec:** 007-critical-fixes
**Date:** 2026-01-21

---

## Phase 1: CLI Consolidation (Issues 1 + 2)

### Task 1.0: Setup Automatic Sync (COMPLETED ✅)

**Priority:** P0
**Status:** DONE

- [x] Created `scripts/sync-cli-variants.sh` - syncs variant utilities
- [x] Updated `.husky/pre-commit` to run sync before commit
- [x] Tested sync script - works correctly
- [x] Files now auto-sync to `packages/cli/src/lib/variants/`

### Task 1.1: Verify Synced Files Compile

**Priority:** P0
**Estimate:** 15 min
**Dependencies:** Task 1.0 ✅

- [ ] Run `npm --prefix packages/cli run typecheck`
- [ ] Fix any import path issues in synced files
- [ ] Ensure `packages/cli/src/lib/variants/index.ts` exports correctly

### Task 1.2: Update Init Command

**Priority:** P0
**Estimate:** 45 min
**Dependencies:** Task 1.1

**File:** `packages/cli/src/commands/init.ts`

- [ ] Change variant option from `commonjs|esm|auto` to `modern-esm|modern-cjs|legacy-16|legacy-14|auto`
- [ ] Add backward compatibility mapping:
  ```typescript
  // Map old values to new
  const variantMap = {
    'commonjs': 'modern-cjs',
    'esm': 'modern-esm',
    'cjs': 'modern-cjs',  // alias
  };
  ```
- [ ] Add deprecation warning for old values
- [ ] Import and use variant detector for `auto` mode
- [ ] Pass resolved variant to bootstrap

### Task 1.3: Update Bootstrap Logic

**Priority:** P0
**Estimate:** 1 hour
**Dependencies:** Task 1.1, Task 1.2

**File:** `packages/cli/src/lib/bootstrap.ts`

- [ ] Import variant utilities
- [ ] Update `copyArtkCore()` to:
  - [ ] Select correct dist folder based on variant (dist, dist-cjs, dist-legacy-16, dist-legacy-14)
  - [ ] Copy variant-features.json
  - [ ] Generate READONLY.md with variant info
  - [ ] Generate .ai-ignore
- [ ] Update context.json generation to include variant metadata
- [ ] Handle variant-specific Playwright versions

### Task 1.4: Copy Tests

**Priority:** P1
**Estimate:** 30 min
**Dependencies:** Task 1.1

- [ ] Copy from `cli/src/utils/__tests__/`:
  - [ ] `variant-definitions.test.ts`
  - [ ] `variant-detector.test.ts`
  - [ ] `variant-files.test.ts`
  - [ ] `variant-types.test.ts`
  - [ ] `variant-schemas.test.ts`
- [ ] Update import paths
- [ ] Run tests: `npm --prefix packages/cli test`

### Task 1.5: Document CLI Architecture

**Priority:** P2
**Estimate:** 10 min
**Dependencies:** Tasks 1.1-1.4 complete

- [ ] Add README to `packages/cli/src/lib/variants/` explaining sync
- [ ] Update `cli/README.md` (if exists) to note it's source of truth
- [ ] Document in CLAUDE.md which CLI is which:
  - `cli/` = development source of truth
  - `packages/cli/` = npm-publishable (auto-synced)

---

## Phase 2: Prompt Fixes (Issue 3)

### Task 2.1: Fix Mode Decision Logic

**Priority:** P0
**Estimate:** 20 min
**Dependencies:** None

**File:** `prompts/artk.init-playbook.md`

- [ ] Find mode decision section (~line 188-220)
- [ ] Update condition from:
  ```markdown
  IF coreInstalled AND autogenInstalled THEN Mode C
  ```
  To:
  ```markdown
  IF coreInstalled AND autogenInstalled AND journeyCoreInstalled THEN Mode C
  ```
- [ ] Add comment explaining why all three are required

### Task 2.2: Fix Version Comparison

**Priority:** P1
**Estimate:** 15 min
**Dependencies:** None

**File:** `prompts/artk.init-playbook.md`

- [ ] Find version comparison section (~line 250-280)
- [ ] Change from semver string comparison to integer:
  ```markdown
  // BEFORE
  IF installedVersion < "2.0.0" THEN upgrade

  // AFTER
  IF installedConfigVersion < 2 THEN upgrade
  ```
- [ ] Add note: "Config version is an integer (1, 2, 3...), not semver"

---

## Phase 3: Documentation Alignment (Issues 4 + 5)

### Task 3.1: Fix Version Examples in Docs

**Priority:** P1
**Estimate:** 30 min
**Dependencies:** None

- [ ] Search for version examples:
  ```bash
  grep -rn "version.*1\.0" docs/ packages/cli/README.md
  grep -rn '"version".*"1' docs/ packages/cli/README.md
  ```
- [ ] Update all to use integer format: `version: 1`
- [ ] Files to check:
  - [ ] `packages/cli/README.md`
  - [ ] `docs/ARTK_Core_v1_Specification.md`
  - [ ] `docs/ARTK_Module_Architecture.md`

### Task 3.2: Add Schema Documentation

**Priority:** P2
**Estimate:** 10 min
**Dependencies:** None

**File:** `core/typescript/config/schema.ts`

- [ ] Add JSDoc to version field:
  ```typescript
  /**
   * Configuration schema version (integer, not semver).
   * Increment when making breaking changes to schema.
   * Example: 1, 2, 3 (NOT "1.0.0")
   */
  version: z.number().int().min(1)
  ```

### Task 3.3: Update Journey Lifecycle Doc

**Priority:** P1
**Estimate:** 15 min
**Dependencies:** None

**File:** `docs/ARTK_Journey_Lifecycle_v0.1.md`

- [ ] Find line 201: `(future phase)`
- [ ] Remove "(future phase)" from journey-implement transition
- [ ] Search for other "(future)" or "(planned)" markers
- [ ] Update any that are now implemented
- [ ] Add "Last Updated: 2026-01-21" header

---

## Verification Checklist

### After Phase 1

```bash
# Build CLI
npm --prefix packages/cli run build

# Run tests
npm --prefix packages/cli test

# Test all variants manually
mkdir -p /tmp/artk-test
cd /tmp/artk-test

artk init --variant modern-esm ./test-esm
artk init --variant modern-cjs ./test-cjs
artk init --variant legacy-16 ./test-16
artk init --variant legacy-14 ./test-14
artk init ./test-auto

# Verify each has correct variant
for d in test-*; do
  echo "=== $d ==="
  cat $d/artk-e2e/vendor/artk-core/variant-features.json | head -5
done

# Test backward compatibility
artk init --variant commonjs ./test-old-cjs  # Should work with warning
```

### After Phase 2

```bash
# No automated tests for prompts currently
# Manual verification:
# 1. Create test project with partial install (core but no journey)
# 2. Run /artk.init-playbook
# 3. Verify it detects as Mode A or B, not Mode C
```

### After Phase 3

```bash
# Search for any remaining issues
grep -rn "version.*\"1\." docs/ packages/cli/
grep -rn "future phase" docs/
```

---

## Rollback Plan

If issues are found after deployment:

1. **CLI issues:** Revert to previous packages/cli version
2. **Prompt issues:** Prompts can be updated independently
3. **Doc issues:** No rollback needed (docs are non-breaking)

---

## Definition of Done

- [ ] All tasks completed
- [ ] Tests passing
- [ ] Manual verification complete
- [ ] No TypeScript errors
- [ ] `cli/` directory deleted
- [ ] Documentation consistent
- [ ] Commit pushed with descriptive message
