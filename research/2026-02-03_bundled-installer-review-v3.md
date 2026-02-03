# Bundled Installer Review v3 - Final Audit

**Date:** 2026-02-03
**Topic:** Final code review after P0-P2 + browser fallback implementation
**Confidence:** 0.90

---

## Executive Summary

After implementing P0-P2 fixes and browser fallback, the installer achieves **~92% feature parity** with bootstrap.sh. This review identifies:

- **3 P0 critical issues** (bugs that will cause failures)
- **4 P1 high issues** (should fix before release)
- **3 P2 medium issues** (fix soon)

---

## 1. P0 CRITICAL ISSUES

### 1.1 Force Reinstall Doesn't Delete Existing Directory

**Lines 1726-1734:**
```typescript
if (fs.existsSync(artkE2ePath) && force) {
  backupPath = await createBackup(artkE2ePath);
  // BUG: Never deletes artkE2ePath!
}
```

**Problem:** Backup is created but the existing `artk-e2e/` is never deleted. New files are written over/merged with old files, causing:
- Orphaned files from previous installation
- Corrupted state if old files conflict with new
- `node_modules/` is preserved (may have wrong dependencies)

**Fix:**
```typescript
if (fs.existsSync(artkE2ePath) && force) {
  backupPath = await createBackup(artkE2ePath);
  // Delete existing directory after backup
  await fs.promises.rm(artkE2ePath, { recursive: true, force: true });
}
```

### 1.2 testBrowser Double-Resolution Race Condition

**Lines 178-208:**
```typescript
const testBrowser = async (browserPath: string): Promise<string | null> => {
  return new Promise((resolve) => {
    const proc = spawn(...);

    proc.on('close', (code) => {
      resolve(output.trim());  // First resolve
    });

    setTimeout(() => {
      proc.kill();
      resolve(null);  // Second resolve - RACE CONDITION
    }, 5000);
  });
};
```

**Problem:** If the process closes AFTER the timeout fires, `resolve()` is called twice. While Node.js ignores the second call, the process may still be running and leak resources.

**Fix:**
```typescript
const testBrowser = async (browserPath: string): Promise<string | null> => {
  return new Promise((resolve) => {
    let resolved = false;
    const proc = spawn(...);

    const done = (value: string | null) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      resolve(value);
    };

    proc.on('close', (code) => {
      done(code === 0 && output ? output.trim() : null);
    });

    proc.on('error', () => done(null));

    const timer = setTimeout(() => {
      proc.kill();
      done(null);
    }, 5000);
  });
};
```

### 1.3 installBundledChromium Has No Timeout

**Lines 1527-1556:**
```typescript
async function installBundledChromium(artkE2ePath: string): Promise<...> {
  return new Promise((resolve) => {
    const proc = spawn(npx, ['playwright', 'install', 'chromium'], ...);
    // NO TIMEOUT - can hang indefinitely on slow networks
  });
}
```

**Problem:** Unlike `runNpmInstall` which has a 5-minute timeout, `installBundledChromium` can hang forever if the download stalls.

**Fix:** Add same timeout pattern as `runNpmInstall`:
```typescript
const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
let timedOut = false;
const timeout = setTimeout(() => {
  timedOut = true;
  proc.kill('SIGTERM');
  setTimeout(() => proc.kill('SIGKILL'), 5000);
}, TIMEOUT_MS);
```

---

## 2. P1 HIGH ISSUES

### 2.1 Missing PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD for System Browsers

**bootstrap.sh lines 2159-2162:**
```bash
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --legacy-peer-deps
```

**VS Code installer:** Does NOT set this env var. When using Edge/Chrome, the npm install may still try to download bundled Chromium, wasting bandwidth and time.

**Fix:** Pass env to npm install:
```typescript
const proc = spawn(npm, ['install'], {
  cwd: artkE2ePath,
  env: {
    ...process.env,
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1',  // When using system browser
  },
});
```

### 2.2 variant-features.json Is Incomplete

**Lines 1431-1448:**
```typescript
const features = {
  features: {
    route_from_har: { available: true },
    locator_filter: { available: true },
    // Only 5 features hardcoded
  },
};
```

**Problem:** All variants get the same features. Legacy variants (Node 14/16) should have different feature availability.

**Fix:** Generate features based on variant:
```typescript
const features = {
  features: getVariantFeatures(variant),  // Variant-specific
};

function getVariantFeatures(variant: Variant) {
  const base = {
    route_from_har: { available: true },
    locator_filter: { available: true },
    // ...
  };

  if (variant === 'legacy-14') {
    return {
      ...base,
      clock_api: { available: false, alternative: 'Use manual Date mocking' },
      aria_snapshots: { available: false, alternative: 'Use manual ARIA queries' },
    };
  }
  return base;
}
```

### 2.3 createBackup Only Backs Up 4 Files

**Lines 978-983:**
```typescript
const filesToBackup = [
  'artk.config.yml',
  'playwright.config.ts',
  'tsconfig.json',
  '.artk/context.json',
];
```

**Problem:** User customizations in these directories are lost:
- `journeys/` - User's journey files
- `tests/` - User's custom tests
- `src/modules/` - User's page objects
- `.artk/llkb/` - Learned patterns

**Fix:** Backup more directories:
```typescript
const filesToBackup = [
  'artk.config.yml',
  'playwright.config.ts',
  'tsconfig.json',
];

const dirsToBackup = [
  '.artk',
  'journeys',
  'tests',
  'src/modules',
];
```

### 2.4 Linux Browser Detection Uses fs.existsSync on Command Names

**Lines 219-224 and 248-254:**
```typescript
: [
    'microsoft-edge',           // Command name, not file path
    'microsoft-edge-stable',
    '/snap/bin/microsoft-edge',  // Actual path
  ];

// Then:
if (isWindows && !fs.existsSync(edgePath)) continue;  // Only checks on Windows
```

**Problem:** On Linux, command names like `'microsoft-edge'` are checked with `testBrowser()` even though they're not file paths. This works but wastes time spawning processes that will fail.

**Fix:** Check if it's a path before existsSync:
```typescript
if (!edgePath.startsWith('/') && !edgePath.includes('\\')) {
  // It's a command name, skip existsSync
  const version = await testBrowser(edgePath);
} else if (fs.existsSync(edgePath)) {
  const version = await testBrowser(edgePath);
}
```

---

## 3. P2 MEDIUM ISSUES

### 3.1 Double Browser Detection

**Lines 1743 and 1679:**
```typescript
// First detection at start
const browserInfo = await detectBrowser();

// Second detection if bundled fails
const fallbackBrowser = await detectBrowser();
```

**Problem:** If no browser is found initially and bundled fails, we detect again. This is redundant if nothing changed in the 30 seconds since first detection.

**Impact:** Minor - just wastes ~10 seconds on fallback path.

### 3.2 No --force-llkb Option

**bootstrap.sh has:**
```bash
--force-llkb    Force LLKB reinitialization (delete and recreate)
```

**VS Code installer:** Has `skipLlkb` but not `forceLlkb`.

**Impact:** Users can't force-reset LLKB without manually deleting the directory.

### 3.3 projectName Sanitization Missing

**Lines 1747-1758:**
```typescript
let projectName = path.basename(targetPath);
// ...
projectName = pkg.name;  // Used directly in YAML
```

**Problem:** If `pkg.name` contains special YAML characters (`"`, `\n`, `:`), the generated `artk.config.yml` will be invalid.

**Fix:**
```typescript
projectName = projectName.replace(/["\n\r:]/g, '');
```

---

## 4. DECISION TREE ANALYSIS

### 4.1 Browser Strategy Logic Correct ✅

```
detectBrowser() returns msedge/chrome → Use system browser ✅
detectBrowser() returns chromium → Try bundled install
  ├── bundled succeeds → Use chromium ✅
  └── bundled fails → Re-detect browsers
       ├── system found → Use system browser ✅
       └── system not found → ERROR ✅
```

### 4.2 Variant Detection Logic Correct ✅

```
.nvmrc exists → Parse Node version
  ├── version ≥ 18 → Check ESM → modern-esm/modern-cjs ✅
  ├── version ≥ 16 → legacy-16 ✅
  └── version < 16 → legacy-14 ✅
```

### 4.3 Force Reinstall Logic BROKEN ❌

```
force=true → Create backup → ???
  └── MISSING: Delete existing artk-e2e/
  └── Creates new files over old → CORRUPTION RISK
```

---

## 5. BACKWARD COMPATIBILITY

| Scenario | Status |
|----------|--------|
| Fresh install | ✅ Works |
| Upgrade from bootstrap.sh | ⚠️ context.json compatible but node_modules may differ |
| Force reinstall | ❌ Doesn't delete old directory |
| Old prompts → two-tier | ✅ Detects and upgrades |
| Edge/Chrome system browser | ✅ Works |
| Bundled chromium fallback | ✅ Works |

---

## 6. SECURITY REVIEW

| Item | Status |
|------|--------|
| Symlink skip in copyDir | ✅ Fixed |
| Path traversal in targetPath | ⚠️ No validation |
| Comment stripping preserves URLs | ✅ Fixed |
| No secrets in generated files | ✅ OK |

---

## 7. PRIORITIZED FIXES

### P0 (Must Fix)
1. **Delete artk-e2e on force reinstall** (5 min)
2. **Fix testBrowser double-resolution** (10 min)
3. **Add timeout to installBundledChromium** (10 min)

### P1 (Should Fix)
4. **Set PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD** (10 min)
5. **Generate variant-specific features** (30 min)
6. **Backup more directories** (15 min)
7. **Optimize Linux browser detection** (10 min)

### P2 (Fix Soon)
8. **Add forceLlkb option** (15 min)
9. **Sanitize projectName** (5 min)
10. **Cache first browser detection** (10 min)

---

## 8. ESTIMATED EFFORT

| Priority | Count | Time |
|----------|-------|------|
| P0 | 3 | 25 min |
| P1 | 4 | 65 min |
| P2 | 3 | 30 min |
| **Total** | **10** | **2 hours** |

---

## 9. CONCLUSION

The implementation is **solid but has 3 critical bugs** that will cause problems in production:

1. Force reinstall merges with old files instead of replacing
2. Browser detection can leak process resources
3. Browser download can hang indefinitely

After fixing P0 issues, the installer will be **production-ready** with ~95% feature parity to bootstrap.sh.
