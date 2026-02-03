# VS Code Extension - CLI Dependency Audit & Review v5

**Date:** 2026-02-03
**Reviewer:** Claude (Opus 4.5) with multi-perspective analysis
**Focus:** CLI dependencies causing npm registry failures

---

## Executive Summary

The VS Code extension still has **critical CLI dependencies** that will fail on networks where `@artk/cli` isn't published. After fixing `check`, several other commands still use `npx @artk/cli`.

**Status: NOT PRODUCTION READY** until critical CLI dependencies are resolved.

---

## CLI Dependency Audit

### Commands Using CLI Runner

| Command | Function | CLI Call | Priority | Native Alternative |
|---------|----------|----------|----------|-------------------|
| `artk.init` | `runInitWizard()` | **NONE** ✅ | - | Uses bundled installer |
| `artk.check` | `runCheck()` | **NONE** ✅ | - | Native implementation |
| `artk.doctor` | `runDoctor()` | `artk doctor` | **P0** | File system checks |
| `artk.upgrade` | inline | `artk upgrade` | **P0** | Re-run bundled installer with force |
| `artk.uninstall` | inline | `artk uninstall` | **P1** | `fs.rm(artkE2ePath)` |
| `artk.llkb.health` | `runLLKBHealth()` | `artk llkb health` | **P2** | Read JSON files |
| `artk.llkb.stats` | `runLLKBStats()` | `artk llkb stats` | **P2** | Read JSON files |
| `artk.llkb.export` | `runLLKBExport()` | `artk llkb export` | **P2** | Write JSON files |
| `artk.llkb.seed` | `runLLKBSeed()` | `artk llkb seed` | **P3** | Copy pattern files |
| `artk.journey.validate` | `runJourneyValidate()` | `artk journey validate` | **P3** | Schema validation |
| `artk.journey.implement` | `runJourneyImplement()` | `artk journey implement` | **P3** | Complex - needs LLM |

### Priority Definitions

- **P0 (Critical):** User will hit this in normal workflow, blocks basic usage
- **P1 (High):** User will likely hit this, but can work around
- **P2 (Medium):** Power user feature, can defer
- **P3 (Low):** Advanced feature, acceptable to require CLI

---

## P0 Fixes Required

### 1. `artk.doctor` - Native Implementation

**Current:** Calls `artk doctor` via npx
**Impact:** Users click "Run Doctor" → npm error

**Native Implementation:**
```typescript
async function runDoctorNative(): Promise<DiagnosticResult> {
  const checks = {
    // 1. Check artk-e2e directory structure
    directoryStructure: await checkDirectoryStructure(),
    // 2. Check package.json dependencies
    dependencies: await checkDependencies(),
    // 3. Check artk.config.yml validity
    config: await checkConfig(),
    // 4. Check LLKB structure
    llkb: await checkLLKB(),
    // 5. Check context.json
    context: await checkContext(),
    // 6. Check Playwright installation
    playwright: await checkPlaywright(),
  };
  return { checks, issues: collectIssues(checks) };
}
```

**Effort:** ~100 lines, 30 minutes

### 2. `artk.upgrade` - Use Bundled Installer with Force

**Current:** Calls `artk upgrade` via npx
**Impact:** Users click "Upgrade" → npm error

**Native Implementation:**
```typescript
// Upgrade = reinstall with force flag
const result = await installBundled(extensionContext, {
  targetPath,
  force: true,
  skipNpm: false, // Re-run npm install
  skipLlkb: true, // Preserve LLKB
  skipBrowsers: true, // Preserve browser config
  noPrompts: true, // Don't reinstall prompts
});
```

**Effort:** ~20 lines, 10 minutes (mostly reusing existing code)

---

## P1 Fixes Required

### 3. `artk.uninstall` - Native Implementation

**Current:** Calls `artk uninstall` via npx
**Impact:** Users click "Uninstall" → npm error

**Native Implementation:**
```typescript
async function uninstallNative(targetPath: string): Promise<void> {
  const artkE2ePath = path.join(targetPath, 'artk-e2e');

  // Confirm with user (already done in command)

  // Remove artk-e2e directory
  await fs.promises.rm(artkE2ePath, { recursive: true, force: true });

  // Optionally remove .github/prompts/artk.* and .github/agents/artk.*
  // (ask user first)
}
```

**Effort:** ~30 lines, 15 minutes

---

## Review of Current check.ts Implementation

### Strengths
1. ✅ No CLI dependency - fully native
2. ✅ Proper timeout handling on browser detection
3. ✅ Race condition prevention with `resolved` flag
4. ✅ Cross-platform browser paths
5. ✅ Checks Playwright cache for bundled Chromium

### Weaknesses
1. ⚠️ `execSync` is synchronous (blocks event loop briefly)
2. ⚠️ No caching of results (re-detects every time)
3. ⚠️ Mac Playwright cache path might be wrong (should be `~/Library/Caches/ms-playwright`)

### Bug Found

```typescript
// Line 130-131 - Mac path is WRONG
: isMac
  ? `${process.env.HOME}/Library/Caches/ms-playwright`
```

Should be:
```typescript
: isMac
  ? `${process.env.HOME}/Library/Caches/ms-playwright`  // This IS correct
```

Actually, checking Playwright docs - the Mac path IS `~/Library/Caches/ms-playwright`. No bug.

---

## Decision Tree Analysis

### User Clicks "Install ARTK" (Popup)

```
showWelcomeMessage()
    → artk.init
    → runInitWizard()
    → installBundled()  ✅ No CLI dependency
```
**Status:** FIXED ✅

### User Clicks "Check Prerequisites"

```
artk.check
    → runCheck()
    → checkPrerequisitesNative()  ✅ No CLI dependency
```
**Status:** FIXED ✅

### User Clicks "Run Doctor"

```
artk.doctor
    → runDoctor()
    → doctor() from CLI runner
    → npx @artk/cli doctor  ❌ FAILS
```
**Status:** BROKEN ❌

### User Clicks "Upgrade"

```
artk.upgrade
    → upgrade() from CLI runner
    → npx @artk/cli upgrade  ❌ FAILS
```
**Status:** BROKEN ❌

### User Clicks "Uninstall"

```
artk.uninstall
    → uninstall() from CLI runner
    → npx @artk/cli uninstall  ❌ FAILS
```
**Status:** BROKEN ❌

---

## Backward Compatibility

| Scenario | Risk | Notes |
|----------|------|-------|
| Existing ARTK installation | ✅ Safe | Native check detects existing files |
| User has @artk/cli installed | ✅ Safe | Native commands don't interfere |
| Corporate network blocks npm | ✅ Fixed for init/check | Still broken for doctor/upgrade/uninstall |

---

## Recommendations

### Immediate (Before Release)

1. **Implement native `doctor`** - File system checks only
2. **Implement native `upgrade`** - Reuse bundled installer with force
3. **Implement native `uninstall`** - Simple fs.rm

### Deferred (Post-Release)

4. **LLKB commands** - Can require CLI for now (power user feature)
5. **Journey commands** - Complex, requires significant effort

---

## Implementation Priority

```
P0: artk.doctor     → Native file checks
P0: artk.upgrade    → Reuse installBundled with force
P1: artk.uninstall  → Native fs.rm
```

**Total Effort:** ~2 hours to make extension fully self-contained for basic operations.

---

## Confidence Assessment

| Aspect | Current | After P0/P1 Fixes |
|--------|---------|-------------------|
| Basic Install | 0.95 | 0.98 |
| Check | 0.95 | 0.95 |
| Doctor | 0.00 | 0.90 |
| Upgrade | 0.00 | 0.90 |
| Uninstall | 0.00 | 0.95 |
| LLKB Commands | 0.00 | 0.00 (deferred) |
| Journey Commands | 0.00 | 0.00 (deferred) |
| **Overall** | **0.40** | **0.85** |

---

*Review conducted by Claude (Opus 4.5)*
