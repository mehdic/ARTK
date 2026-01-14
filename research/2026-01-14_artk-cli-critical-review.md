# ARTK CLI Critical Review

**Date:** 2026-01-14
**Reviewer:** Self-critique of `packages/cli/` implementation
**Compared Against:** `scripts/bootstrap.sh` (1,193 lines) and `scripts/bootstrap.ps1` (1,026 lines)

---

## Executive Summary

The CLI implementation achieves approximately **75%** feature parity with the shell scripts. While the core bootstrap workflow is functional, several critical gaps exist that could cause silent failures, user confusion, or inability to recover from errors.

**Severity Assessment:**
- 🔴 **CRITICAL**: 4 issues (must fix before production use)
- 🟠 **HIGH**: 5 issues (should fix soon)
- 🟡 **MEDIUM**: 6 issues (nice to have)
- ⚪ **LOW**: 3 issues (cosmetic/minor)

---

## 🔴 CRITICAL Issues

### 1. Missing Foundation Module Generation (Step 5.5)

**Shell Script Location:** `bootstrap.sh:910-968`

**What shell scripts do:**
```bash
GENERATION_SCRIPT="$ARTK_CORE/scripts/generate-foundation.ts"
node "$GENERATION_SCRIPT" \
    --projectRoot="$TARGET_PROJECT" \
    --variant="$DETECTED_VARIANT" \
    --verbose \
    > "$GENERATION_LOG" 2>&1
```

**What CLI does:**
```typescript
// bootstrap.ts:391-430 - Only creates empty stubs:
await fs.writeFile(
  path.join(foundationPath, module, 'index.ts'),
  `// Placeholder export to prevent import errors\nexport {};`
);
```

**Impact:**
- Users get empty foundation modules that do nothing
- Shell script generates real code from templates based on detected environment
- Tests will fail because no actual utilities are exported

**Fix Required:**
- Port `generate-foundation.ts` invocation to CLI
- OR bundle the generator and call it during bootstrap

---

### 2. No Rollback on Failure

**Shell Script Location:** `bootstrap.sh:993-1006`

**What shell scripts do:**
```bash
setup_rollback_trap() {
    trap 'rollback_on_error' ERR EXIT
}

rollback_on_error() {
    if [ $? -ne 0 ]; then
        echo "Bootstrap failed, rolling back changes..."
        if [ -f "$ARTK_E2E/artk.config.yml.bootstrap-backup" ]; then
            mv "$ARTK_E2E/artk.config.yml.bootstrap-backup" "$ARTK_E2E/artk.config.yml"
        fi
    fi
    trap - ERR EXIT
}

# Usage:
cp "$ARTK_E2E/artk.config.yml" "$ARTK_E2E/artk.config.yml.bootstrap-backup"
setup_rollback_trap
# ... npm install and browser config ...
rm -f "$ARTK_E2E/artk.config.yml.bootstrap-backup"  # Success - remove backup
```

**What CLI does:**
- No backup
- No rollback trap
- Failure leaves partial installation

**Impact:**
- If npm install fails mid-way, user is left with corrupted/partial installation
- No way to recover without manual intervention
- `artk doctor --fix` cannot repair this

**Fix Required:**
```typescript
// Before making changes:
const backup = await createBackup(artkE2ePath);
try {
  // ... all bootstrap steps ...
  await removeBackup(backup);
} catch (error) {
  await restoreBackup(backup);
  throw error;
}
```

---

### 3. CI Environment Not Detected for Browser Strategy

**Shell Script Location:** `bootstrap.sh:215-226`, `bootstrap.sh:1060-1062`

**What shell scripts do:**
```bash
is_ci_environment() {
    [ -n "$CI" ] || \
    [ -n "$GITHUB_ACTIONS" ] || \
    [ -n "$GITLAB_CI" ] || \
    [ -n "$JENKINS_HOME" ] || \
    [ -n "$CIRCLECI" ] || \
    [ -n "$TRAVIS" ] || \
    [ -n "$TF_BUILD" ] || \
    [ "$USER" = "jenkins" ] || \
    [ "$USER" = "gitlab-runner" ] || \
    [ "$USER" = "circleci" ]
}

# Usage in browser config:
if is_ci_environment && [ "$BROWSER_STRATEGY" != "system-only" ]; then
    echo "CI environment detected - using bundled browsers for reproducibility"
    BROWSER_CHANNEL="bundled"
fi
```

**What CLI does:**
- `environment.ts:33-39` detects CI but doesn't use it
- Browser resolver ignores CI environment entirely

**Impact:**
- In CI, CLI may try system browser detection (Edge/Chrome)
- CI systems typically don't have GUI browsers
- Tests will fail with "no browsers found" in CI
- Reproducibility issues: local vs CI may use different browsers

**Fix Required:**
```typescript
// In browser-resolver.ts:
if (isCI()) {
  logger.info('CI environment detected - using bundled browsers for reproducibility');
  return tryBundledInstall(artkE2ePath, browsersCachePath, logger);
}
```

---

### 4. Release Cache Download Not Implemented

**Shell Script Location:** `bootstrap.sh:110-213` (full implementation)

**What shell scripts do:**
- Download pre-built browser ZIP from GitHub releases
- Verify SHA256 checksum
- Extract to browsers cache
- ~100 lines of working code

**What CLI does:**
```typescript
// browser-resolver.ts:133-137
logger.debug(`Downloading from: ${url}`);
// Download implementation would go here
// For now, return null to fall back to bundled install
return null;  // <-- PLACEHOLDER!
```

**Impact:**
- **Users on restricted networks CANNOT install browsers**
- This was the PRIMARY reason for the release cache feature
- Company firewalls often block Playwright CDN but allow GitHub

**Fix Required:**
- Implement actual HTTP download with `node-fetch` or native `https`
- Verify SHA256 checksum
- Extract ZIP (use `adm-zip` or similar)
- ~50 lines of TypeScript

---

## 🟠 HIGH Issues

### 5. Missing Log File Creation

**Shell Script Location:** `bootstrap.sh:1022-1046`

**What shell scripts do:**
```bash
LOGS_DIR="$TARGET_PROJECT/.artk/logs"
mkdir -p "$LOGS_DIR"
NPM_INSTALL_LOG="$LOGS_DIR/npm-install.log"
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --legacy-peer-deps >"$NPM_INSTALL_LOG" 2>&1

# Also: playwright-browser-install.log, template-generation.log, system-browser-detect.log
```

**What CLI does:**
- No logs directory
- No npm output capture
- Browser install failures have no persistent logs

**Impact:**
- When something fails, users have no logs to share for debugging
- Support requests become "it didn't work" with no diagnostics
- `artk doctor` has no historical data to analyze

---

### 6. Browser Strategy Configuration Ignored

**Shell Script Location:** `bootstrap.sh:1048-1140`

**Supported strategies in shell:**
| Strategy | Behavior |
|----------|----------|
| `auto` | Try release cache → bundled → system |
| `bundled-only` | ONLY use bundled, fail if can't install |
| `system-only` | ONLY use system browser, fail if not found |
| `prefer-system` | Try system first → bundled fallback |
| `prefer-bundled` | Try bundled first → system fallback |

**What CLI does:**
- Hard-coded fallback chain: release cache → bundled → system
- No strategy configuration option
- Ignores `browsers.strategy` in artk.config.yml

**Impact:**
- Users who NEED system-only (corporate laptops) can't enforce it
- Users who want bundled-only for reproducibility can't enforce it

---

### 7. Missing `@artk/core` Build Check

**Shell Script Location:** `bootstrap.sh:476-485`

**What shell scripts do:**
```bash
# Step 1: Build @artk/core if needed
if [ ! -d "$ARTK_CORE/dist" ]; then
    echo "[1/7] Building @artk/core..."
    cd "$ARTK_CORE"
    npm install
    npm run build
else
    echo "[1/7] @artk/core already built ✓"
fi
```

**What CLI does:**
- Assumes assets are bundled in CLI package
- No build step because CLI bundles pre-built assets
- BUT: if assets are missing, it creates dummy package.json stubs

```typescript
// bootstrap.ts:204-211
} else {
  logger.warning(`@artk/core assets not found at ${coreSource}`);
  // Create minimal package.json for development
  await fs.writeJson(path.join(coreTarget, 'package.json'), {
    name: '@artk/core',
    version: '1.0.0',
    main: './dist/index.js',
  });
}
```

**Impact:**
- If CLI is published without assets, it silently creates broken vendor packages
- No error, no warning that tests won't work
- `artk doctor` should detect and error on this

---

### 8. No Unit Tests for CLI

**Finding:**
- `packages/cli/` has zero test files
- No `__tests__/` directory
- No `vitest.config.ts` or `jest.config.ts`

**Impact:**
- Can't verify CLI works before release
- Regression risk on changes
- No CI coverage

**Fix Required:**
- Add test suite for:
  - `bootstrap.ts` (mock fs-extra)
  - `browser-resolver.ts` (mock exec/spawn)
  - `prerequisites.ts` (mock system commands)
  - Command handlers

---

### 9. `dist/` Committed to Git

**Finding:**
```bash
ls packages/cli/dist/
# cli.js, cli.js.map, index.d.ts, index.js, index.js.map
```

**Impact:**
- dist/ should be in .gitignore
- Causes merge conflicts
- Increases repo size
- Build artifacts don't belong in source control

---

## 🟡 MEDIUM Issues

### 10. Prompt Filename Transformation Differs

**Shell script:**
```bash
newname="${filename%.md}.prompt.md"
cp "$file" "$PROMPTS_TARGET/$newname"
# artk.init-playbook.md → artk.init-playbook.prompt.md
```

**CLI:**
```typescript
const targetName = file.replace(/\.md$/, '.prompt.md');
// artk.init-playbook.md → artk.init-playbook.prompt.md
```

**Analysis:** Both produce same result. ✅ No issue.

---

### 11. PowerShell Script Has Different package.json

**PowerShell package.json (line 615-636):**
- Missing `"test:regression"` script
- Missing `"typecheck"` script
- `yaml` version is `^2.3.0` instead of `^2.3.4`
- Missing `@types/node`

**This is an existing bug in bootstrap.ps1, not CLI's fault.**
BUT: CLI could become the "one true source" and fix this inconsistency.

---

### 12. Context.json Has Different Fields

**Shell scripts include:**
```json
{
  "bootstrap_script": "/path/to/bootstrap.sh",
  "artk_repo": "/path/to/ARTK"
}
```

**CLI creates:**
```json
{
  // Missing bootstrap_script
  // Missing artk_repo
}
```

**Impact:** Minor - these fields are informational only.

---

### 13. Missing `--force-detect` and `--skip-validation` Options

**Shell script options:**
- `--force-detect`: Force environment re-detection even if context.json exists
- `--skip-validation`: Continue even if foundation module generation fails

**CLI options:**
- `--force`: Only for overwriting existing installation
- No equivalent to above options

---

### 14. tsconfig.json Includes Differ

**Shell script:**
```json
"include": ["tests/**/*", "src/**/*", "config/**/*"]
```

**CLI:**
```json
"include": ["tests/**/*", "src/**/*", "config/**/*", "*.ts"]
```

**Impact:** CLI includes root `.ts` files; shell scripts don't.
This could cause issues if there are stray `.ts` files in root.

---

### 15. `.gitignore` in `.artk/` Missing `logs/`

**Shell script:**
```bash
# .artk/.gitignore
browsers/
heal-logs/
*.heal.json
selector-catalog.local.json
```

**CLI:**
```typescript
`# ARTK temporary files
browsers/
heal-logs/
logs/           // <-- CLI adds this
*.heal.json
selector-catalog.local.json`
```

**Analysis:** CLI is actually BETTER here, but inconsistent with shell.

---

## ⚪ LOW Issues

### 16. Version Mismatch Handling

When upgrading, CLI doesn't handle the case where bundled version < installed version.

### 17. No `--dry-run` Option

Users can't preview what CLI will do before it does it.

### 18. Exit Codes Not Documented

CLI uses `process.exit(1)` but doesn't document what exit codes mean.

---

## Decision Tree Loopholes

### Browser Resolution Decision Tree (CLI)

```
START
  │
  ├─→ Try release cache
  │     │
  │     ├─→ ARTK_PLAYWRIGHT_BROWSERS_REPO set?
  │     │     ├─ NO → return null (skip)
  │     │     └─ YES → Try download
  │     │               ├─ SUCCESS → Return release-cache
  │     │               └─ FAIL → return null
  │     │
  │     v
  ├─→ Try bundled install
  │     │
  │     ├─→ npx playwright install chromium
  │     │     ├─ SUCCESS → Return bundled-install
  │     │     └─ FAIL (timeout/error) → return null
  │     │
  │     v
  ├─→ Try system browser
  │     │
  │     ├─→ Check Edge paths → found? → Return msedge
  │     ├─→ Check Chrome paths → found? → Return chrome
  │     └─→ Nothing found → Return bundled (broken state!)
  │
  v
END: Return {channel: 'bundled', version: null, path: null, strategy: 'auto'}
     ⚠️ LOOPHOLE: Returns "bundled" but no browsers are installed!
```

**Loophole #1:** If all fallbacks fail, CLI returns `channel: 'bundled'` but no browsers exist. Playwright will fail at runtime with cryptic error.

**Shell script behavior:** Explicit error with actionable solutions:
```bash
echo "ERROR: No browsers available"
echo "ARTK tried:"
echo "  1. Pre-built browser cache: Unavailable"
echo "  2. Bundled Chromium install: Failed"
echo "  3. System Microsoft Edge: Not found"
echo "  4. System Google Chrome: Not found"
echo "Solutions:"
echo "  1. Install Microsoft Edge: https://microsoft.com/edge"
echo "  2. Install Google Chrome: https://google.com/chrome"
exit 1
```

**Loophole #2:** No CI detection means:
1. CI runner starts
2. Release cache fails (no repo env var)
3. Bundled install times out (no browser permissions)
4. System browser check fails (headless runner)
5. Returns "bundled" with no browsers
6. Tests fail with confusing error

---

## Backward Compatibility Analysis

### Safe Changes ✅
- New directory structure is identical to shell scripts
- package.json, playwright.config.ts, tsconfig.json are byte-compatible
- artk.config.yml structure matches
- Prompt installation is identical

### Breaking Changes ⚠️

| Aspect | Shell Scripts | CLI | Risk |
|--------|---------------|-----|------|
| context.json fields | Has `bootstrap_script`, `artk_repo` | Missing these fields | LOW - informational only |
| Foundation modules | Generated from templates | Empty stubs | HIGH - tests won't work |
| Log files | Created in `.artk/logs/` | Not created | MEDIUM - debugging harder |
| Browser strategy | Configurable | Hard-coded fallback | MEDIUM - power users affected |

### Migration Path

If user has existing shell-script installation:
1. `artk upgrade` should preserve working installation
2. `artk doctor` should detect discrepancies
3. CLI should NOT overwrite working foundation modules with stubs

**Currently:** CLI `--force` would replace working modules with empty stubs!

---

## Recommendations

### Priority 1: Must Fix Before Release

1. **Implement release cache download** - This is the #1 feature for corporate users
2. **Add rollback on failure** - Partial installations are unrecoverable
3. **Add CI detection to browser resolver** - CI usage will be common
4. **Port foundation module generation** - Without this, the CLI is broken

### Priority 2: Should Fix Soon

5. Add log file creation in `.artk/logs/`
6. Add browser strategy configuration
7. Add unit tests
8. Remove `dist/` from git, add to `.gitignore`
9. Add proper error when bundled assets are missing

### Priority 3: Nice to Have

10. Add `--dry-run` option
11. Add `--force-detect` option
12. Document exit codes
13. Add version mismatch warnings in upgrade

---

## Appendix: Test Plan

### Manual Test Cases

| # | Test | Expected | CLI Status |
|---|------|----------|------------|
| 1 | `artk init /tmp/new` | Creates structure | ✅ PASS |
| 2 | `artk init /tmp/new` (again) | Error: already installed | ✅ PASS |
| 3 | `artk init /tmp/new --force` | Overwrites | ✅ PASS |
| 4 | `artk init . --skip-npm` | Skips npm | ✅ PASS |
| 5 | `artk init . --skip-browsers` | Skips browsers | ✅ PASS |
| 6 | `artk doctor /tmp/new` | Shows diagnostics | ✅ PASS |
| 7 | `artk doctor /tmp/new --fix` | Fixes issues | ⚠️ Limited |
| 8 | `artk uninstall /tmp/new --force` | Removes cleanly | ✅ PASS |
| 9 | `artk check` | Shows prerequisites | ✅ PASS |
| 10 | `artk upgrade /tmp/new` | Upgrades core | ⚠️ Not tested |
| 11 | Run in CI (GitHub Actions) | Bundled browsers | ❌ FAIL (no CI detect) |
| 12 | Run on corporate network | Release cache download | ❌ FAIL (not implemented) |
| 13 | npm install fails | Rollback | ❌ FAIL (no rollback) |
| 14 | Generated tests work | Foundation modules | ❌ FAIL (empty stubs) |

---

## Conclusion

The CLI is a solid foundation but has 4 critical gaps that must be addressed before it can replace the shell scripts. The most impactful are:

1. **Foundation module generation** - Without this, generated tests are broken
2. **Release cache download** - Key feature for enterprise users
3. **CI detection** - Will fail in every CI pipeline
4. **Rollback mechanism** - Failures leave corrupted state

With these fixes, the CLI will achieve full feature parity and can become the recommended installation method.
