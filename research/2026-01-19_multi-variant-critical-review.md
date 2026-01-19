# Critical Review: ARTK Multi-Variant Build System (006)

**Date:** 2026-01-19
**Reviewer:** Claude (Opus 4.5)
**Subject:** Brutal honest review of 006-multi-variant-builds implementation
**Confidence Level:** 0.85

---

## Executive Summary

The implementation is **substantially complete** but has **several gaps and risks** that should be addressed before production use. The architecture is sound, but execution details reveal inconsistencies between CLI and bootstrap implementations, missing edge case handling, and some spec requirements that are implemented only partially.

**Overall Assessment: B+ (Good, but not production-ready)**

---

## 1. Functional Requirements Compliance

### Fully Implemented (GREEN)

| FR | Description | Status | Evidence |
|----|-------------|--------|----------|
| FR-001 | Four distinct variants | ✅ Complete | `variant-definitions.ts:12-52` defines all 4 |
| FR-002 | Build from same source | ✅ Complete | tsconfig files all extend base |
| FR-005 | Detect Node.js version | ✅ Complete | `variant-detector.ts:25-32` |
| FR-006 | Detect module system | ✅ Complete | `variant-detector.ts:50-72` |
| FR-007 | Select appropriate variant | ✅ Complete | `variant-definitions.ts:96-115` |
| FR-008 | Manual variant override | ✅ Complete | `--variant` flag in CLI and bootstrap |
| FR-009 | Store variant metadata | ✅ Complete | context.json written on install |
| FR-014 | READONLY.md markers | ✅ Complete | Written in both CLI and bootstrap |
| FR-015 | .ai-ignore files | ✅ Complete | Written in both CLI and bootstrap |
| FR-024 | Verbose install logs | ✅ Complete | `install-logger.ts` with structured logging |
| FR-025 | Log file append mode | ✅ Complete | `install-logger.ts:83-101` with rotation |
| FR-026 | Lock file acquisition | ✅ Complete | `lock-manager.ts` with PID tracking |
| FR-027 | Concurrent install fail | ✅ Complete | Lock check with clear error |
| FR-028 | Lock file release | ✅ Complete | Always released in finally block |

### Partially Implemented (YELLOW)

| FR | Description | Status | Issue |
|----|-------------|--------|-------|
| FR-003 | Both packages matching | ⚠️ Partial | CLI creates directories but doesn't copy autogen variant-specific builds |
| FR-004 | Reproducible builds | ⚠️ Partial | Verified once, but no CI enforcement yet |
| FR-010 | Modern works on 18/20/22 | ⚠️ Partial | Logic correct, but no runtime CI verification |
| FR-011 | Legacy-16 works on 16/18/20 | ⚠️ Partial | Logic correct, but no runtime CI verification |
| FR-012 | Legacy-14 works on 14/16/18 | ⚠️ Partial | Logic correct, but no runtime CI verification |
| FR-013 | Compatible Playwright versions | ⚠️ Partial | Versions defined, but not enforced at install |
| FR-016 | Variant info in markers | ⚠️ Partial | READONLY.md has info, but incomplete |
| FR-017 | AI protection in Copilot | ⚠️ Partial | Template exists but not auto-installed |
| FR-018 | Upgrade detects changes | ⚠️ Partial | Detection works, actual migration is incomplete |
| FR-021 | Dual format feature docs | ⚠️ Partial | JSON only, no prose in Copilot instructions |
| FR-022 | Auto-substitute guidance | ⚠️ Partial | Only in variant-features.json, not in prompts |
| FR-023 | Structured feature file | ⚠️ Partial | File created but incomplete API coverage |

### Not Implemented (RED)

| FR | Description | Status | Impact |
|----|-------------|--------|--------|
| FR-019 | Preserve user config on upgrade | ❌ Missing | **High** - config.yml could be lost |
| FR-020 | Log variant changes to install.log | ❌ Missing | **Low** - debugging impact only |

---

## 2. Critical Issues Found

### Issue #1: CLI Doesn't Actually Copy Variant Files

**Severity: CRITICAL**

The CLI `init.ts` creates directory structures and writes metadata, but the actual file copying logic is a placeholder comment:

```typescript
// init.ts:181-183
// Copy variant files (placeholder - in production, copy from dist directories)
// For now, we create the structure and write metadata
```

The bootstrap script DOES copy files (`bootstrap.sh:761-764`), but the CLI doesn't. This means:
- `artk init` command creates empty vendor directories
- Only `bootstrap.sh` produces a working installation
- **Users relying on CLI will get broken installations**

**Fix Required:** Implement actual file copying in `init.ts:checkVariantBuildFiles()` or create a new `copyVariantFiles()` function.

### Issue #2: Upgrade Doesn't Replace Vendor Files

**Severity: HIGH**

The `upgrade.ts` command:
1. Updates `context.json` with new variant ✅
2. Updates `variant-features.json` ✅
3. Updates `READONLY.md` ✅
4. **Does NOT replace actual vendor code** ❌

If a user upgrades from `legacy-16` to `modern-esm`, they get updated metadata but the old ES2021 code remains. This is a silent failure that could cause hard-to-debug issues.

```typescript
// upgrade.ts:184-189 - only updates markers, not code
const vendorCorePath = path.join(targetPath, 'artk-e2e', 'vendor', 'artk-core');
if (fs.existsSync(vendorCorePath)) {
  updateVariantFeatures(vendorCorePath, newVariant);
  updateReadonlyMarker(vendorCorePath, newVariant, newContext);
}
// Missing: actual vendor code replacement!
```

### Issue #3: autogen Package Not Variant-Aware

**Severity: MEDIUM**

While `@artk/core` has variant-specific builds (`dist-cjs`, `dist-legacy-16`, etc.), the autogen package only has one build (`autogen/dist`).

This violates FR-003: "Each variant MUST include both @artk/core and @artk/core-autogen packages with matching configurations"

The autogen tsconfig files exist but aren't used by the bootstrap script:
```bash
# bootstrap.sh:823-831 - always copies autogen/dist, ignores variants
cp -r "$ARTK_CORE/autogen/dist" "$ARTK_E2E/vendor/artk-core-autogen/"
```

### Issue #4: Inconsistent Node Range Definitions

**Severity: MEDIUM**

The variant definitions include odd Node versions:

```typescript
// variant-definitions.ts:16, 36, 46
nodeRange: ['18', '19', '20', '21', '22']  // Node 19 and 21 are not LTS!
nodeRange: ['16', '17', '18', '19', '20']  // Node 17 is not LTS!
nodeRange: ['14', '15', '16', '17', '18']  // Node 15 is not LTS!
```

Including non-LTS versions (15, 17, 19, 21) creates support expectations that may not be tested. The CI only tests `14, 16, 18, 20, 22` (per T063).

**Recommendation:** Either remove non-LTS versions from ranges OR add them to CI matrix.

### Issue #5: Lock File Race Condition

**Severity: LOW**

The lock acquisition in `lock-manager.ts:35-52` has a TOCTOU (time-of-check-time-of-use) race:

```typescript
// Check if lock exists
if (fs.existsSync(lockFilePath)) {
  // ... check if stale ...
}
// Gap here - another process could create lock!
fs.writeFileSync(lockFilePath, JSON.stringify(lockData));
```

Two processes starting simultaneously could both pass the existence check and create locks. This is mitigated by the 10-minute stale timeout, but still technically a race condition.

**Mitigation:** Use `O_EXCL` flag with `fs.openSync()` for atomic creation.

---

## 3. Decision Tree Analysis

### Variant Selection Decision Tree

```
Node Version Check
├── < 14 → ERROR ✅ (handled)
├── 14-15 → legacy-14 ✅
├── 16-17 → legacy-16 ✅
└── >= 18
    ├── package.json type === "module" → modern-esm ✅
    └── else → modern-cjs ✅
```

**Loopholes Found:**

1. **No package.json exists**: Defaults to CJS ✅ (correct)
2. **Malformed package.json**: Defaults to CJS ✅ (correct)
3. **type: "commonjs" explicit**: Treated as CJS ✅ (correct)
4. **type: "" (empty string)**: Treated as CJS ✅ (correct)
5. **Multiple package.json files**: Only checks target directory root ⚠️

**Missing Edge Case:** Monorepo scenarios where the target directory has no package.json but a parent does. The detection only looks in `targetPath`, not up the tree.

### Override Validation Decision Tree

```
--variant flag provided?
├── No → auto-detect
└── Yes
    ├── Invalid variant ID → ERROR with help ✅
    └── Valid variant ID
        ├── Compatible with Node version → use override ✅
        └── Incompatible → ERROR with range info ✅
```

**Loophole Found:**

The CLI allows overriding to an incompatible variant but shows an error. The bootstrap script, however, accepts any valid variant without compatibility check:

```bash
# bootstrap.sh:511-522
if ! validate_variant "$FORCED_VARIANT"; then
    echo -e "${RED}Error: Invalid variant '$FORCED_VARIANT'${NC}"
    exit 1
fi
# No compatibility check after validation!
```

This means `bootstrap.sh --variant=legacy-14` on Node 22 will proceed and create a broken installation.

---

## 4. Backward Compatibility Analysis

### Breaking Changes

| Change | Risk | Mitigation |
|--------|------|------------|
| New context.json schema | **Low** | Old contexts readable, new fields optional |
| .artk directory required | **Low** | Created automatically |
| Variant field mandatory | **Medium** | Upgrades add it, but direct reads may fail |
| dist directory structure | **High** | Old imports from `dist/` still work (default variant) |

### Migration Path for Existing Installations

Existing ARTK installations without variant metadata will:
1. `doctor` command: Correctly identifies missing context as unhealthy ✅
2. `upgrade` command: Correctly creates new context with detected variant ✅
3. `init --force`: Correctly overwrites with new variant system ✅

**Risk:** The `artk init` command checks for existing installation and refuses without `--force`. This is correct behavior.

### API Stability

The exported types and functions are:
- `VariantId` - new type, additive
- `ModuleSystem` - new type, additive
- `detectEnvironment()` - new function, additive
- `selectVariant()` - new function, additive

**No breaking changes to existing @artk/core API.** All changes are additive.

---

## 5. Code Quality Issues

### Duplicated Logic

The variant-features.json generation is duplicated:
1. `init.ts:342-431` - `writeVariantFeatures()`
2. `upgrade.ts:221-291` - `updateVariantFeatures()`

These should share a common implementation.

### Hardcoded Version

```typescript
// init.ts:34
const ARTK_VERSION = '1.0.0';

// upgrade.ts:28
const ARTK_VERSION = '1.0.0';
```

This should be read from package.json or a central version file.

### Incomplete Error Context

```typescript
// variant-detector.ts:104-114
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown detection error';
  return {
    // ... error state without original error object
  };
}
```

The original error object is lost, making debugging harder.

### Missing Input Validation

The `rollback.ts:39` accepts any string for `reason` without sanitization. While not a security issue for file-system-only operations, the reason is written to logs and could theoretically contain malicious content if the caller is compromised.

---

## 6. Test Coverage Analysis

### What's Tested

- variant-types.ts: 4 tests (type guards) ✅
- variant-definitions.ts: 25 tests (variant logic) ✅
- variant-schemas.ts: 32 tests (Zod schemas) ✅
- variant-detector.ts: 22 tests (detection logic) ✅
- install-logger.ts: 21 tests (logging) ✅
- lock-manager.ts: 24 tests (concurrency) ✅
- rollback.ts: 18 tests (cleanup) ✅

**Total: 146 unit tests**

### What's NOT Tested

| Component | Gap |
|-----------|-----|
| `init.ts` | No unit tests |
| `upgrade.ts` | No unit tests |
| `doctor.ts` | No unit tests |
| `bootstrap.sh` | No integration tests |
| `bootstrap.ps1` | No integration tests |
| Cross-version compatibility | Mocked, no real Node version tests |
| File copying logic | Not tested (also not implemented in CLI) |

### Integration Test Gaps

No tests verify:
1. Full installation flow end-to-end
2. Upgrade with actual variant change
3. Rollback after partial failure
4. Lock file behavior with concurrent processes
5. Bootstrap script on different Node versions

---

## 7. Recommendations

### Priority 1 (Must Fix Before Release)

1. **Implement actual file copying in CLI init.ts**
   - The CLI is broken without this
   - Users will get empty vendor directories

2. **Implement vendor replacement in upgrade.ts**
   - Currently only updates metadata
   - Silent failure risk

3. **Add compatibility check to bootstrap.sh override**
   - Currently allows incompatible variant selection

### Priority 2 (Should Fix)

4. **Unify variant-features.json generation**
   - Create shared function in `variant-definitions.ts`
   - Call from both `init.ts` and `upgrade.ts`

5. **Add autogen variant support**
   - Build autogen for each variant
   - Copy correct autogen variant in bootstrap

6. **Add integration tests for commands**
   - Test init, upgrade, doctor flows
   - Mock fs but test full logic

### Priority 3 (Nice to Have)

7. **Remove non-LTS Node versions from ranges**
   - Or add them to CI matrix

8. **Fix lock file race condition**
   - Use atomic file creation

9. **Read ARTK_VERSION from package.json**
   - Single source of truth

10. **Add Copilot instruction integration**
    - Auto-add AI protection guidance to `.github/copilot-instructions.md`

---

## 8. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| CLI produces broken install | High | Critical | Fix file copying |
| Upgrade leaves old code | High | High | Implement vendor replacement |
| Bootstrap allows incompatible variant | Medium | Medium | Add compatibility check |
| Race condition in locking | Low | Low | Use atomic operations |
| Non-LTS Node versions untested | Low | Low | Update ranges or CI |

---

## 9. Conclusion

The multi-variant build system architecture is **well-designed** with proper separation of concerns, comprehensive type definitions, and good test coverage of utility functions. The detection logic is correct and handles edge cases appropriately.

However, the **implementation is incomplete in critical areas**:
- CLI doesn't copy files
- Upgrade doesn't replace code
- Bootstrap allows incompatible overrides

**Confidence in assessment: 0.85**

Key caveats:
- Did not test actual cross-Node-version execution
- Did not verify CI workflow runs
- Some edge cases inferred from code, not tested

**Recommendation:** Address Priority 1 issues before any release. The current state is suitable for development/testing but NOT production use.

---

*Generated by Claude Opus 4.5 as requested "brutal honesty" review*
