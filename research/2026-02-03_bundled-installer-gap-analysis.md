# Bundled Installer Gap Analysis

**Date:** 2026-02-03
**Topic:** VS Code Extension Bundled Installer vs Bootstrap.sh Feature Parity
**Confidence:** 0.95 (verified through multi-AI review)

---

## Executive Summary

The bundled installer (`packages/vscode-extension/src/installer/index.ts`) has **27 critical gaps** compared to the reference implementation (`scripts/bootstrap.sh`). Without remediation, installations from the VS Code extension will be **incompatible** with existing ARTK workflows and CI/CD pipelines.

**Risk Level: HIGH**

---

## 1. CRITICAL MISSING FEATURES (P0 - Block Release)

### 1.1 Package.json Missing file: Dependencies

**bootstrap.sh Lines 1704-1730:**
```json
{
  "devDependencies": {
    "@artk/core": "file:./vendor/artk-core",
    "@artk/core-autogen": "file:./vendor/artk-core-autogen",
    "@playwright/test": "^1.57.0"
  }
}
```

**Bundled Installer Lines 294-319:** Missing the `file:` dependencies entirely.

**Impact:** Import statements like `import { loadConfig } from '@artk/core'` will fail.

**Fix Location:** `createPackageJson()` function, line 291-319

### 1.2 Missing tsconfig.json

**bootstrap.sh Lines 1827-1852:** Creates tsconfig.json with path aliases:
```json
{
  "paths": {
    "@artk/core": ["./vendor/artk-core/dist"],
    "@artk/core/*": ["./vendor/artk-core/dist/*"]
  }
}
```

**Bundled Installer:** Does NOT create tsconfig.json at all.

**Impact:** TypeScript compilation will fail without path aliases.

**Fix:** Add new `createTsConfig()` function.

### 1.3 Variant-Specific Dist Directory Selection

**bootstrap.sh Lines 488-529:**
```bash
get_variant_dist_dir() {
    case "$variant" in
        modern-esm) echo "dist" ;;
        modern-cjs) echo "dist-cjs" ;;
        legacy-16) echo "dist-legacy-16" ;;
        legacy-14) echo "dist-legacy-14" ;;
    esac
}
```

**Bundled Installer Lines 603-680:** Always copies from single `assets/core` directory.

**Impact:** Module format mismatch for CJS/ESM projects.

**Fix:** Add variant-aware asset selection or bundle all variants.

### 1.4 common/GENERAL_RULES.md Not Installed

**bootstrap.sh Lines 1258-1263:**
```bash
COMMON_PROMPTS_SOURCE="$ARTK_PROMPTS/common"
cp "$COMMON_PROMPTS_SOURCE"/GENERAL_RULES.md "$COMMON_PROMPTS_TARGET/"
```

**Bundled Installer:** Does not install common prompts directory.

**Impact:** Prompts referencing common rules will fail.

**Fix:** Add to `installPrompts()` function.

---

## 2. HIGH PRIORITY GAPS (P1 - Before GA)

### 2.1 VS Code Settings Installation

**bootstrap.sh Lines 1275-1605:** Complete VS Code settings merge with:
- Deep merge with array union
- Backup creation before changes
- Conflict detection with warnings
- Comment loss warning
- Preview of changes

**Bundled Installer:** No VS Code settings installation whatsoever.

**Fix:** Add new `installVscodeSettings()` function.

### 2.2 Staging Directories and Rollback

**bootstrap.sh Lines 1160-1243:**
```bash
PROMPTS_STAGING="$TARGET_PROJECT/.github/.prompts-staging-$$"
# ... atomic operations with rollback
```

**Bundled Installer:** No atomic operations or rollback capability.

**Fix:** Add staging pattern to `installPrompts()`.

### 2.3 Upgrade Detection for Old Prompts

**bootstrap.sh Lines 1136-1157:** Detects prompts without `agent:` property and upgrades.

**Bundled Installer:** No upgrade detection.

**Fix:** Add upgrade detection before prompt installation.

### 2.4 next-commands/*.txt Files

**bootstrap.sh Lines 1265-1272:**
```bash
cp "$NEXT_COMMANDS_SOURCE"/*.txt "$NEXT_COMMANDS_TARGET/"
```

**Bundled Installer:** Does not install anti-hallucination files.

**Fix:** Add to `installPrompts()` function.

---

## 3. MEDIUM PRIORITY GAPS (P2)

### 3.1 variant-info.prompt.md Generation

**bootstrap.sh Lines 1921-2040:** Generates variant-specific Copilot instructions.

### 3.2 Browser Detection with Fallback

**bootstrap.sh Lines 241-340:** Detects Edge, Chrome, falls back to bundled.

### 3.3 artk-core-journeys Population

**bootstrap.sh Lines 1086-1124:** Copies journeys files and adds protection markers.

### 3.4 .gitignore File Creation

**bootstrap.sh:** Creates `.artk/.gitignore` and `artk-e2e/.gitignore`.

### 3.5 Backup Before Force Reinstall

**bootstrap.sh:** Creates backups before overwriting existing installations.

---

## 4. INCONSISTENCIES

### 4.1 artk.config.yml Schema Differences

| Field | bootstrap.sh | Bundled Installer |
|-------|--------------|-------------------|
| `version` | "1.0" | Missing |
| `app.type` | "web" | Missing |
| `app.description` | Present | Missing |
| `core.*` sections | Present | Missing |

### 4.2 context.json Schema Differences

| Field | bootstrap.sh | Bundled Installer |
|-------|--------------|-------------------|
| `bootstrap_script` | Present | Missing |
| `artk_repo` | Present | Missing |
| `templateVariant` | Present | Missing |
| `next_suggested` | "/artk.init-playbook" | Missing |
| `overrideUsed` | true/false | Missing |

### 4.3 Node Version Detection

**Bundled Installer Issue:** Detects VS Code's Node version (Electron), not project's Node version.

---

## 5. DECISION TREE LOOPHOLES

### 5.1 Missing Assets Handling
- **Current:** Silently continues if assets missing
- **Should:** Fail with clear error message

### 5.2 Partial Installation State
- **Current:** No rollback on mid-copy failure
- **Should:** Use staging directories with cleanup

### 5.3 npm Install Timeout
- **Current:** No timeout, could hang indefinitely
- **Should:** Add reasonable timeout

### 5.4 Force Flag Without Backup
- **Current:** Overwrites without backup
- **Should:** Create backup before force overwrite

---

## 6. SECURITY CONCERNS

### 6.1 Path Traversal Risk
- **Current:** `copyDir()` follows symlinks
- **Should:** Skip symlinks or resolve them safely

### 6.2 No Input Validation
- **Current:** No path validation on targetPath
- **Should:** Validate path doesn't escape intended directory

---

## 7. REMEDIATION PLAN

### Phase 1: P0 Fixes (Immediate)

1. **Fix package.json** (30 min)
   - Add `file:` dependencies for `@artk/core` and `@artk/core-autogen`
   - Move `@playwright/test` to devDependencies

2. **Add tsconfig.json** (20 min)
   - Create `createTsConfig()` function
   - Match bootstrap.sh structure with path aliases

3. **Fix common prompts** (15 min)
   - Add common directory creation
   - Copy GENERAL_RULES.md

4. **Document variant limitation** (10 min)
   - Since assets are pre-bundled, document that only one variant is included
   - Add clear error if variant mismatch detected

### Phase 2: P1 Fixes (Before GA)

5. **VS Code settings installation** (2 hours)
   - Port deep merge logic from bootstrap.sh
   - Add backup and conflict detection

6. **Atomic operations** (1 hour)
   - Add staging directory pattern
   - Implement rollback on failure

7. **Upgrade detection** (45 min)
   - Detect old-style prompts
   - Migrate to two-tier architecture

8. **next-commands installation** (15 min)
   - Bundle and copy anti-hallucination files

### Phase 3: P2 Fixes (Post-GA)

9. variant-info.prompt.md generation
10. Browser detection logic
11. artk-core-journeys population
12. .gitignore creation
13. Backup before force reinstall

---

## 8. TESTING CHECKLIST

After remediation, verify:

- [ ] `import { loadConfig } from '@artk/core'` works
- [ ] `npm run test` succeeds in artk-e2e
- [ ] TypeScript compilation succeeds
- [ ] Existing ARTK installations can be upgraded
- [ ] Force reinstall creates backups
- [ ] VS Code settings merge preserves user settings
- [ ] Prompts work with common rules
- [ ] CI/CD pipeline succeeds

---

## 9. CONCLUSION

The bundled installer requires **significant work** before it can be considered production-ready. The P0 fixes are mandatory for basic functionality. P1 fixes are needed for production use. P2 fixes can be deferred.

**Estimated Total Remediation Time:** 6-8 hours

**Recommendation:** Implement P0 fixes immediately, ship with clear documentation of limitations, then address P1/P2 in follow-up releases.
