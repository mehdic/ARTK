# Critical Review: Multi-Variant Build Implementation (v2)

**Date**: 2026-01-19
**Reviewer**: Claude (self-review with brutal honesty)
**Confidence**: 0.9 (thorough analysis, some edge cases may exist)

---

## Executive Summary

The implementation fixes many issues from the original critical review, but introduces **new critical bugs** and has **significant inconsistencies** between CLI and bootstrap scripts. The most severe issue is that the CLI will **crash on startup in ESM mode** due to using `__dirname`.

**Verdict**: NOT production ready. Requires fixes before deployment.

---

## 1. CRITICAL ISSUES (Must Fix Before Deployment)

### 1.1. `__dirname` Doesn't Exist in ESM Modules

**File**: `cli/src/utils/variant-files.ts:18-22`

```typescript
const possiblePaths = [
  path.join(__dirname, '..', '..', 'package.json'),  // CRASH!
  path.join(__dirname, '..', '..', '..', 'package.json'),
  path.join(process.cwd(), 'cli', 'package.json'),
];
```

**Problem**: The CLI uses ESM (`.js` imports with `type: "module"`), but `__dirname` is a CommonJS-only global. This throws `ReferenceError: __dirname is not defined` at runtime.

**Impact**: CLI crashes immediately on any command.

**Fix**:
```typescript
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

**Severity**: CRITICAL (0 confidence in production)

---

### 1.2. CLI Missing Core Features (Incomplete vs Bootstrap)

**Files**: `cli/src/commands/init.ts`

The CLI `init` command is **severely incomplete** compared to bootstrap scripts:

| Feature | Bootstrap | CLI |
|---------|-----------|-----|
| Copy vendor files | ✅ | ✅ |
| Create context.json | ✅ | ✅ |
| Run `npm install` | ✅ | ❌ (option parsed but unused) |
| Install browsers | ✅ | ❌ (option parsed but unused) |
| Install prompts | ✅ | ❌ (only variant-info) |
| Create artk.config.yml | ✅ | ❌ |
| Create package.json | ✅ | ❌ |
| Create playwright.config.ts | ✅ | ❌ |
| Create foundation modules | ✅ | ❌ |
| Create directory structure | ✅ | Partial |

**Impact**: Users who use CLI (vs bootstrap) get an incomplete, non-functional installation.

**Severity**: HIGH (CLI is not feature-complete)

---

### 1.3. Upgrade Doesn't Generate Copilot Instructions

**File**: `cli/src/commands/upgrade.ts`

After vendor replacement, the code updates AI protection markers but forgets to regenerate Copilot instructions:

```typescript
// Update AI protection markers in both vendor directories
if (fs.existsSync(vendorCorePath)) {
  writeAllAiProtectionMarkers(vendorCorePath, newVariant, newContext);
}
// MISSING: writeCopilotInstructions(targetPath, newVariant);
```

**Impact**: After upgrade, `artk.variant-info.prompt.md` has stale variant information.

**Severity**: MEDIUM

---

## 2. RACE CONDITIONS & CONCURRENCY

### 2.1. Stale Lock Cleanup Race

**File**: `cli/src/utils/lock-manager.ts:110-123`

```typescript
if (existingLock) {
  if (this.isLockStale(existingLock)) {
    this.release();  // RACE WINDOW: Another process can acquire here
    // ... then we try openSync('wx') below
  }
}
```

**Problem**: Between `release()` and `openSync()`, another process could:
1. Create the lock
2. Start its operation
3. Get its lock overwritten by our subsequent `openSync()`

**Fix**: Use retry loop:
```typescript
for (let attempt = 0; attempt < 3; attempt++) {
  const result = this.tryAcquireOnce(operation);
  if (result.acquired) return result;
  if (!result.isStale) return result; // Not stale, give up
  this.release(); // Try to clear stale
  await sleep(100); // Give other process a chance
}
```

**Severity**: MEDIUM (rare in practice)

---

## 3. INCONSISTENCIES

### 3.1. Variant Features: Dynamic vs Static

| Method | Source |
|--------|--------|
| CLI | `generateVariantFeatures()` function (dynamic) |
| Bootstrap | Static JSON files in `cli/src/templates/variant-features/` |

If features change, only one source gets updated.

**Fix**: Remove static templates, have bootstrap call CLI or share generation logic.

---

### 3.2. Monorepo Support: CLI Only

**CLI** (`variant-detector.ts`): Has `findNearestPackageJson()` that walks up directories.

**Bootstrap** (`detect_module_system()`): Only checks target directory's package.json.

```bash
# Bootstrap doesn't check parent package.json for "type": "module"
detect_module_system() {
    local target_path="$1"
    local package_json="$target_path/package.json"  # Only local!
    ...
}
```

**Impact**: In monorepos, CLI and bootstrap may detect different module systems.

---

### 3.3. Config Preservation Inconsistent

| Scenario | artk.config.yml Preserved? |
|----------|---------------------------|
| `artk upgrade` | ✅ Yes (FR-019) |
| `artk init --force` | ❌ No |
| Bootstrap re-run | ✅ Yes (checks existence) |

---

## 4. MISSING ERROR HANDLING

### 4.1. No Autogen Warning

**File**: `cli/src/utils/variant-files.ts:229-238`

```typescript
if (fs.existsSync(autogenDist)) {
  // Copy autogen
} else if (!fs.existsSync(path.join(autogenPath, 'dist'))) {
  // SILENTLY succeeds with no autogen files!
}
```

Users don't know autogen wasn't installed.

---

### 4.2. Symlink Handling

`copyDirectoryRecursive()` uses `entry.isDirectory()` which returns false for symlinks. Symlinks to directories won't be recursed, symlinks to files may fail.

---

### 4.3. ARTK_CORE_PATH Validation

```typescript
const possiblePaths = [
  process.env.ARTK_CORE_PATH,  // If set to invalid path, silently skipped
  ...
];
```

If user sets `ARTK_CORE_PATH` incorrectly, no error is shown.

---

## 5. BACKWARD COMPATIBILITY

### 5.1. LTS-Only Ranges

Updated `nodeRange` arrays:
- `modern-esm`: `['18', '20', '22']` (was including 17?)
- `legacy-16`: `['16', '18', '20']` (removed 17)
- `legacy-14`: `['14', '16', '18']` (removed 15)

**Risk Assessment**:
- `getRecommendedVariant()` still handles odd versions (falls through ranges) ✅
- `isVariantCompatible()` returns false for forced variants on 15/17/19/21 ⚠️
- Forced variant with Node 17 now fails where it worked before

**Verdict**: Acceptable breaking change, odd versions are non-LTS.

---

## 6. CODE QUALITY

### 6.1. Module Load-Time Side Effects

```typescript
// init.ts, upgrade.ts
const ARTK_VERSION = getArtkVersion();  // Called at import time!
```

If `getArtkVersion()` throws (e.g., corrupted package.json), the entire CLI crashes on import of any command.

---

### 6.2. Duplicate Logic

Both CLI and bootstrap have:
- Variant selection logic
- Module system detection
- Compatibility checking
- File copying

No shared code between them.

---

## 7. TESTING GAPS

### 7.1. Mocked Tests Don't Test Real Operations

`variant-files.test.ts` mocks the entire `fs` module, so:
- `copyDirectoryRecursive` is never actually tested
- File permission errors aren't tested
- Symlink behavior isn't tested

### 7.2. No Integration Tests

No test actually:
- Creates a temp directory
- Runs `init()` or `upgrade()`
- Verifies the result

---

## 8. PRIORITY FIX LIST

### P0: Must Fix Immediately
1. **Fix `__dirname` in ESM** - CLI crashes
2. **Add `writeCopilotInstructions` to upgrade.ts**

### P1: Should Fix Before Release
3. **Add monorepo support to bootstrap scripts**
4. **Make config preservation consistent (init --force)**
5. **Add warning when autogen not found**

### P2: Should Fix Soon
6. **Improve stale lock cleanup (retry loop)**
7. **Add ARTK_CORE_PATH validation**
8. **Add symlink handling to copy function**

### P3: Technical Debt
9. **Unify variant-features generation**
10. **Move version reading out of module scope**
11. **Add integration tests**

---

## 9. RECOMMENDED FIXES

### Fix 1: ESM-compatible `__dirname`

```typescript
// At top of variant-files.ts
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

### Fix 2: Add Copilot instructions to upgrade

```typescript
// In upgrade.ts, after writeAllAiProtectionMarkers calls:
import { writeCopilotInstructions } from '../utils/variant-files.js';

// After line 270:
writeCopilotInstructions(targetPath, newVariant);
```

### Fix 3: Add monorepo support to bootstrap

```bash
# In bootstrap.sh, update detect_module_system:
detect_module_system() {
    local target_path="$1"
    local current="$target_path"

    while [ "$current" != "/" ]; do
        local pkg="$current/package.json"
        if [ -f "$pkg" ]; then
            local type_val=$(grep -o '"type"\s*:\s*"[^"]*"' "$pkg" | grep -o '"[^"]*"$' | tr -d '"')
            if [ "$type_val" = "module" ]; then
                echo "esm"
                return
            fi
            echo "cjs"
            return
        fi
        current=$(dirname "$current")
    done

    echo "cjs"
}
```

---

## 10. CONCLUSION

**Overall Assessment**: The implementation is ~70% complete. Core variant detection and file copying work, but:

1. CLI has a fatal ESM bug
2. CLI is incomplete compared to bootstrap
3. Multiple inconsistencies between CLI and bootstrap
4. Missing error handling for edge cases

**Recommendation**: Fix P0 issues immediately, then evaluate if CLI needs feature parity with bootstrap or if it should remain a "lite" installer.
