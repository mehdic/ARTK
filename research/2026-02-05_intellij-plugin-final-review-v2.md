# IntelliJ Plugin Final Review - Second Pass

**Date:** 2026-02-05
**Reviewer:** Claude (Opus 4.5) - Ultrathink Mode
**Participants:** Claude-only (External LLMs unavailable)
**Confidence:** 0.89

---

## Executive Summary

This is a brutally honest, comprehensive second-pass review of the IntelliJ ARTK plugin implementation. The first review (v1) identified and fixed critical issues. This review goes deeper into edge cases, decision tree analysis, and backward compatibility risks.

**Overall Score: 78/100** (down from estimated 95 after first fixes)

The implementation is functionally complete but has **critical test suite failures**, **architectural inconsistencies**, and **decision tree gaps** that could cause issues in production.

---

## CRITICAL ISSUES (Blocks Release)

### C1: Test Suite Will Not Compile - API Mismatch

**Severity:** CRITICAL
**Location:** `src/test/kotlin/com/artk/intellij/installer/VariantDetectorTest.kt`
**Impact:** CI/CD will fail; plugin cannot be released

**Problem:** The test file calls methods that don't exist or have wrong signatures:

```kotlin
// TEST CODE (lines 25-27):
val result = VariantDetector.detect(projectDir)
assertEquals(VariantDetector.Variant.MODERN_ESM, result)

// ACTUAL CODE - detect() returns DetectionResult, not Variant:
fun detect(targetPath: File): DetectionResult  // returns wrapper, not Variant

// TEST CODE (lines 81-87):
assertEquals(VariantDetector.Variant.MODERN_ESM, VariantDetector.selectVariant(22, "esm"))

// ACTUAL CODE - selectVariant() DOES NOT EXIST

// TEST CODE (lines 106-124):
val features = VariantDetector.getFeatureAvailability(VariantDetector.Variant.MODERN_ESM)
assertTrue(features.locatorHandler)

// ACTUAL CODE - getFeatureAvailability() DOES NOT EXIST
// Actual method: getVariantFeatures() returns Map<String, FeatureInfo>, not a data class with boolean fields
```

**Root Cause:** Tests were written for an earlier API design and never updated when VariantDetector was refactored.

**Fix Required:**
1. Update all `detect()` assertions to extract `.variant` from DetectionResult
2. Remove `selectVariant()` tests or add the missing method
3. Update `getFeatureAvailability()` tests to use `getVariantFeatures()` with correct structure

---

### C2: InitAction Bypasses InstallOptionsDialog

**Severity:** CRITICAL
**Location:** `src/main/kotlin/com/artk/intellij/actions/InitAction.kt:51-64`
**Impact:** Users cannot configure variants, browser preference, or other options via menu

**Problem:** The `showOptionsDialog()` method in InitAction shows a basic Yes/No dialog instead of using the sophisticated `InstallOptionsDialog`:

```kotlin
// CURRENT CODE:
private fun showOptionsDialog(project: Project): InstallOptions? {
    val result = Messages.showYesNoDialog(
        project,
        "Initialize ARTK in this project?...",
        "Initialize ARTK",
        "Initialize", "Cancel",
        Messages.getQuestionIcon()
    )
    return if (result == Messages.YES) InstallOptions() else null  // DEFAULT OPTIONS ONLY
}

// EXPECTED CODE:
private fun showOptionsDialog(project: Project): InstallOptions? {
    return InstallOptionsDialog.showAndGet(project)  // Uses the real dialog
}
```

**Root Cause:** The comment "For now, use defaults. A full dialog can be implemented later." was never addressed.

**Impact:**
- User's Node.js variant override is ignored
- Browser preference cannot be set
- Skip options (skipNpm, skipBrowsers, skipLlkb) are inaccessible
- Force reinstall checkbox is not shown

---

### C3: BROWSER_INSTALL_TIMEOUT_SECONDS Defined But Unused

**Severity:** HIGH (borderline critical)
**Location:** `ARTKInstaller.kt:37` (defined), `installBrowsersWithFallback:1435` (not used)
**Impact:** Browser installation uses wrong timeout (hardcoded 300 in ProcessUtils.executeNpx)

```kotlin
// DEFINED:
private const val BROWSER_INSTALL_TIMEOUT_SECONDS = 300L

// NOT USED - installBrowsersWithFallback calls:
ProcessUtils.executeNpx(
    listOf("playwright", "install", "chromium"),
    artkE2eDir,
    300  // Hardcoded, not using BROWSER_INSTALL_TIMEOUT_SECONDS
)
```

**Why Critical:** If the timeout constant is changed for slow networks, the actual timeout won't change.

---

## MEDIUM ISSUES (Should Fix Before Release)

### M1: Inconsistent OS Detection Patterns

**Locations:**
- `ProcessUtils.kt:33-34` uses `SystemInfo.isWindows`
- `NodeDetector.kt:121-122` uses `System.getProperty("os.name").lowercase().contains("windows")`
- `BrowserDetector.kt:48-50` uses `System.getProperty("os.name").lowercase().contains(...)`
- `ProcessUtils.kt:112,128,140` uses `System.getProperty("os.name").lowercase().contains("windows")`

**Impact:** Different OS detection methods could theoretically give different results on edge-case OSes.

**Recommendation:** Use `ProcessUtils.isWindows` everywhere or create a centralized `OSUtils.kt`.

---

### M2: No Upgrade Path for LLKB Schema Changes

**Location:** `initializeLLKB()` and `mergeLlkbPatterns()`
**Impact:** If LLKB schema changes between versions, old installations will fail to merge

**Current State:**
- `LLKB_VERSION = "1.0.0"` is hardcoded
- `parseLearnedPatterns()` fails silently on schema mismatch
- No migration logic for v1.0 -> v1.1 patterns

**Scenario:**
1. User installs with LLKB v1.0
2. ARTK updates LLKB schema to v1.1 (adds required field)
3. User upgrades ARTK
4. Merge fails silently, patterns are lost

---

### M3: Node 17 and 19 Edge Cases

**Location:** `VariantDetector.kt:79-82`
**Impact:** Odd-numbered Node versions (17, 19, 21) are not officially LTS

**Current Logic:**
```kotlin
val variant = when {
    majorVersion >= 18 -> if (isEsm) Variant.MODERN_ESM else Variant.MODERN_CJS
    majorVersion >= 16 -> Variant.LEGACY_16
    else -> Variant.LEGACY_14
}
```

**Problem:**
- Node 17 → LEGACY_16 (correct behavior but confusing)
- Node 19 → MODERN_ESM/CJS (may have compatibility quirks)
- Node 21 → MODERN_ESM/CJS (not yet tested)

**Recommendation:** Add explicit handling for odd-numbered versions with warning.

---

### M4: Missing Cancel Support During Installation

**Location:** `InstallerService.kt:50-64`
**Impact:** Once installation starts, user cannot cancel

The `Task.Backgroundable` is cancellable (`true` in constructor), but the `ARTKInstaller.install()` method never checks `indicator.isCanceled`.

**Fix:** Add periodic cancellation checks:
```kotlin
if (indicator?.isCanceled == true) {
    throw CancellationException("Installation cancelled by user")
}
```

---

### M5: Bundled Assets Extraction Verification Too Weak

**Location:** `extractBundledAssets():889-891`

```kotlin
// Verify extraction was successful
val success = File(destDir, "dist/index.js").exists() ||
       File(destDir, "package.json").exists()
```

**Problem:** Uses `OR` instead of `AND`. A partial extraction (only package.json, no dist/) would pass.

**Recommendation:** Change to `AND`:
```kotlin
val success = File(destDir, "dist/index.js").exists() &&
       File(destDir, "package.json").exists()
```

---

### M6: Upgrade Doesn't Preserve Browser Preference

**Location:** `upgrade()` method
**Impact:** After upgrade, browser preference is reset to auto

The upgrade method re-reads `context.json` for variant but doesn't read `artk.config.yml` for browser preference. If vendor libs are upgraded, the original browser preference is lost.

---

## MINOR ISSUES (Nice to Fix)

### N1: Dialog Doesn't Remember Last-Used Options

**Location:** `InstallOptionsDialog.kt`
**Impact:** UX - users must re-select options each time

Store last-used options in `ARTKSettings` and restore them in dialog init.

---

### N2: No Retry Logic for npm install

**Location:** `runNpmInstall()` and network operations
**Impact:** Transient network failures cause installation to fail

Bootstrap scripts have retry logic; plugin should too.

---

### N3: ProcessUtils.executeNpm Has Redundant OS Check

**Location:** `ProcessUtils.kt:111-118`

```kotlin
fun executeNpm(...): ProcessResult {
    val npmCommand = if (System.getProperty("os.name").lowercase().contains("windows")) {
        listOf("cmd", "/c", "npm") + args
    } else {
        listOf("npm") + args
    }
    return execute(...)
}
```

`executeShellCommand()` already handles this. Consider consolidating.

---

### N4: Empty Templates Directory Silently Skipped

**Location:** `bundleArtkAssets` task in build.gradle.kts:117-120

```kotlin
onlyIf {
    file("../../core/typescript/dist").exists() ||
    file("../../core/typescript/autogen/dist").exists()
}
```

Templates directory (`../../templates`) is copied but not checked in `onlyIf`. If templates don't exist, empty directory is created.

---

### N5: InstallResult.warnings Not Surfaced to User

**Location:** `InstallerService.kt:100-102`

```kotlin
val message = if (result.success) "Installation successful" else (result.error ?: "Unknown error")
onComplete(InstallResult(result.success, message))
```

The `warnings` list from `ARTKInstaller.InstallResult` is ignored. User doesn't see npm install warnings.

---

## DECISION TREE ANALYSIS

### Decision: Variant Selection
```
Node Version → Variant
├── >= 18 + ESM → modern-esm
├── >= 18 + CJS → modern-cjs
├── 16-17 → legacy-16
└── < 16 → legacy-14

Loophole: Node 17 (not LTS) goes to legacy-16
Loophole: Node 21+ (future) assumed to work with modern-esm
```

### Decision: Browser Selection
```
Browser Preference → Detection
├── AUTO → Edge > Chrome > Chromium
├── EDGE → Edge OR fallback to AUTO
├── CHROME → Chrome OR fallback to AUTO
└── CHROMIUM → Always bundled

Loophole: If user prefers Edge but Edge not found, falls back to AUTO
          User preference is not persisted as "attempted Edge, got Chrome"
```

### Decision: Force Reinstall
```
Existing Installation + Force
├── Force=true → Backup + Preserve LLKB + Delete + Install
└── Force=false → ERROR "Already installed"

Missing: Option to "merge" instead of "replace"
```

### Decision: LLKB Merge
```
Preserved + Current Patterns
├── Both valid → Merge with weighted average
├── Preserved invalid → Keep current
├── Current invalid → Restore preserved
└── Both invalid → Nothing

Loophole: "Invalid" means parse failure OR empty normalizedText
          A pattern with normalizedText but corrupt other fields passes validation
```

---

## BACKWARD COMPATIBILITY RISKS

### Risk 1: context.json Schema Evolution

**Current Schema:**
```json
{
  "version": "1.0",
  "artkVersion": "1.0.0",
  "variant": "modern-esm",
  ...
}
```

**Risk:** If future versions add required fields, `upgrade()` may fail because it only updates existing fields with regex replace.

**Mitigation:** Add schema version checking and migration in upgrade().

---

### Risk 2: Playwright Version Pinning

**Current:** `^1.57.0`, `^1.49.0`, `^1.33.0` per variant

**Risk:** User project may already have Playwright installed at a different version. The `npm install` will either:
- Upgrade/downgrade their Playwright (breaking their other tests)
- Fail if version ranges are incompatible

**Mitigation:** Check for existing Playwright in package.json before writing.

---

### Risk 3: Plugin.xml Version Range

```xml
<sinceBuild.set("241")>
<untilBuild.set("251.*")>
```

**Risk:** Plugin supports IntelliJ 2024.1 to 2025.1. When 2025.2 releases, plugin will stop working.

**Mitigation:** Consider wider `untilBuild` or document update cadence.

---

## BREAKAGE RISKS

### Risk 1: JAR Resource Extraction on Different JVMs

**Location:** `extractResourceRecursively()`

The code handles `JarURLConnection` and file URLs. On some JVM distributions (GraalVM, custom builds), the resource URL format may differ.

**Mitigation:** Add logging when URL type is unrecognized.

---

### Risk 2: File System Case Sensitivity

**Location:** Multiple file checks

Windows is case-insensitive, macOS APFS can be either. Code assumes case-sensitive matching:

```kotlin
File(destDir, "dist/index.js").exists()
```

If files are `DIST/INDEX.JS`, this fails on Linux but works on Windows.

---

### Risk 3: npm/node Not in PATH

**Location:** `NodeDetector.detectFromPath()`

Returns `null` if node not found. Variant detection then defaults to Node 20:

```kotlin
val majorVersion = nodeInfo?.majorVersion ?: 20 // Default to Node 20
```

**Risk:** User has Node 14 installed but not in PATH. Plugin assumes Node 20, installs modern-esm, tests fail.

**Mitigation:** Show explicit warning when node not detected.

---

## FEATURE PARITY GAP ANALYSIS

| Feature | Bootstrap Scripts | VS Code Extension | IntelliJ Plugin |
|---------|-------------------|-------------------|-----------------|
| Variant detection | ✓ | ✓ | ✓ |
| Browser detection | ✓ | ✓ | ✓ |
| LLKB initialization | ✓ | ✓ | ✓ |
| LLKB preservation | ✓ | ✓ | ✓ |
| Prompt installation | ✓ | ✓ | ✓ |
| Agent installation | ✓ | ✓ | ✓ |
| Interactive options | ✓ | ✓ | ✗ (C2) |
| Retry logic | ✓ | ✓ | ✗ |
| Dry-run mode | ✓ | N/A | ✗ |
| LLKB migration | ✓ | ✓ | ✗ (M2) |
| VS Code settings | N/A | ✓ | N/A |

---

## RECOMMENDATIONS

### Must Fix Before Release

1. **C1:** Fix test suite - tests will not compile
2. **C2:** Use InstallOptionsDialog in InitAction
3. **C3:** Use BROWSER_INSTALL_TIMEOUT_SECONDS constant

### Should Fix Before Release

4. **M1:** Centralize OS detection
5. **M3:** Warn on odd Node versions
6. **M5:** Change asset verification from OR to AND
7. **N5:** Surface warnings to user

### Future Improvements

8. Add retry logic for network operations
9. Add LLKB schema migration
10. Add dry-run mode
11. Persist dialog options
12. Add cancellation support

---

## CONCLUSION

The IntelliJ plugin implementation is architecturally sound but has **execution gaps**. The test suite failure (C1) is a showstopper - CI will fail. The dialog bypass (C2) means users can't access 60% of the configuration options.

**Confidence:** 0.89
**Recommendation:** Fix C1, C2, C3 before any release.

**Estimated Effort:**
- C1 (Test fixes): 30 minutes
- C2 (Dialog fix): 5 minutes
- C3 (Constant usage): 5 minutes
- Medium issues: 2-3 hours
- Minor issues: 1-2 hours

---

*Generated by Claude (Opus 4.5) in ultrathink mode*
