# @artk/cli Critical Architecture Review

**Date:** 2026-01-14
**Author:** Claude Code (Critical Review)
**Subject:** Brutal Honest Assessment of CLI Implementation

---

## Executive Summary

The @artk/cli implementation has **one critical architectural flaw** that must be addressed immediately, along with several medium-priority issues that affect maintainability and feature parity with the shell scripts.

| Severity | Issue | Status |
|----------|-------|--------|
| 🔴 **CRITICAL** | Duplicate template generator (CLI vs @artk/core) | Needs immediate fix |
| 🟠 **HIGH** | Missing @artk/core integration for foundation generation | Needs fix |
| 🟡 **MEDIUM** | Browser resolver doesn't call Playwright install | Known limitation |
| 🟡 **MEDIUM** | No upgrade path verification | Missing feature |
| 🟢 **LOW** | Config validation warnings could be more specific | Enhancement |

---

## 🔴 CRITICAL: Duplicate Template Generators

### The Problem

The CLI implementation created a **completely separate template processor** instead of using the existing @artk/core template system.

**What exists:**

| Location | Purpose | Features |
|----------|---------|----------|
| `core/typescript/src/templates/generator.ts` | @artk/core's template generator | Full validation, backup, rollback, variable extraction, syntax checking |
| `core/typescript/scripts/generate-foundation.ts` | CLI script called by shell bootstrap | Uses @artk/core's generator |
| `packages/cli/src/lib/template-processor.ts` | **NEW - Duplicate implementation** | Basic placeholder replacement only |

**The shell script `bootstrap.sh` does this (lines 940-960):**

```bash
# Step [5.5/7]: Generate Foundation Modules
if [[ -f "$ARTK_CORE/scripts/generate-foundation.ts" ]]; then
  # Uses @artk/core's full template system
  node "$ARTK_CORE/scripts/generate-foundation.ts" --projectRoot="$PROJECT_ROOT" --variant="$VARIANT"
fi
```

**The CLI does this (bootstrap.ts line 499-504):**

```typescript
// Uses a completely separate, simpler implementation
const foundationResult = await generateFoundationModules(
  artkE2ePath,
  assetsDir,  // <-- Looks for templates in CLI assets, not @artk/core
  templateContext,
  logger
);
```

### Why This is Critical

1. **Feature Loss**: @artk/core's generator has:
   - Template syntax validation
   - Variable extraction and validation
   - Proper backup with timestamps
   - Rollback on failure
   - Integration with ValidationRunner

   CLI's template-processor.ts has:
   - Basic `{{placeholder}}` replacement
   - That's it.

2. **Maintenance Burden**: Two generators means two places to fix bugs, add features, update templates.

3. **Behavioral Drift**: Shell script and CLI will generate different output over time.

4. **Template Location Mismatch**:
   - @artk/core has templates at `core/typescript/templates/`
   - CLI looks for templates at `packages/cli/assets/core/templates/`
   - These may not be the same or even exist!

### The Fix

**Option A (Recommended):** CLI should invoke @artk/core's `generate-foundation.ts` script directly, just like the shell script does.

```typescript
// In bootstrap.ts, replace generateFoundationModules() call with:
import { spawn } from 'child_process';

const coreGeneratorPath = path.join(artkE2ePath, 'vendor', 'artk-core', 'scripts', 'generate-foundation.ts');
if (fs.existsSync(coreGeneratorPath)) {
  await runScript('node', [coreGeneratorPath, `--projectRoot=${projectPath}`, `--variant=${variant}`]);
}
```

**Option B:** Import and use @artk/core's template system directly:

```typescript
// This requires @artk/core to be a proper dependency of @artk/cli
import { generateFoundationModules, createTemplateContext } from '@artk/core/templates';
```

**Option C (Not Recommended):** Delete template-processor.ts entirely and skip foundation generation in CLI (let the user run it separately).

---

## 🟠 HIGH: Missing @artk/core Integration

### Related Issues

1. **Assets Directory Structure**: The CLI expects assets at specific paths but:
   - `getAssetsDir()` tries multiple paths with no verification
   - No error if assets don't exist
   - No mechanism to ensure assets match @artk/core version

2. **Version Mismatch Risk**: When CLI copies @artk/core to vendor:
   - No version checking
   - No hash verification
   - Could copy mismatched templates/scripts

### The Fix

1. Add version verification when copying @artk/core:

```typescript
// Verify @artk/core version matches what CLI expects
const expectedVersion = require('../package.json').artkCoreVersion;
const actualVersion = require(path.join(coreSource, 'package.json')).version;
if (actualVersion !== expectedVersion) {
  logger.warning(`@artk/core version mismatch: expected ${expectedVersion}, got ${actualVersion}`);
}
```

2. Add hash verification for critical files.

---

## 🟡 MEDIUM: Browser Resolver Limitations

### What Works

- Detects system browsers (Edge, Chrome)
- Updates artk.config.yml with browser configuration
- Logs decisions to `.artk/logs/`

### What Doesn't Work

- Does NOT actually run `npx playwright install` (unlike shell script)
- Relies on npm postinstall to trigger browser download
- If `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` is set (which the CLI does!), browsers won't install

### The Issue in Code (bootstrap.ts line 645-650):

```typescript
const child = spawn('npm', ['install', '--legacy-peer-deps'], {
  env: {
    ...process.env,
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1',  // This prevents browser download!
  },
});
```

The shell script does this differently - it skips browser download during npm install, then explicitly runs browser installation afterward.

### The Fix

Either:
1. Remove `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` from npm install env
2. Or add explicit `npx playwright install` call after npm install succeeds

---

## 🟡 MEDIUM: Interactive Mode Edge Cases

### What Works

- `isInteractive()` correctly checks `process.stdin.isTTY && process.stdout.isTTY`
- `promptVariant()` falls back to defaults in non-interactive mode
- `promptSelect()` handles invalid input gracefully

### Decision Tree Gaps

1. **Piped Input**: If stdin is TTY but stdout is piped (e.g., `artk init . | tee log.txt`), prompts work but output is buffered.

2. **SSH Sessions**: Some SSH sessions report TTY incorrectly. No override flag exists.

3. **CI Detection**: No automatic CI detection to skip prompts:
   ```typescript
   // Should add:
   const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
   if (isCI) return defaultValue;
   ```

### The Fix

Add `--non-interactive` flag and CI environment detection.

---

## 🟡 MEDIUM: Config Validation Improvements

### What Works

- Zod schemas validate structure correctly
- Environment variable placeholders (`${VAR}`) are allowed
- Additional validation catches semantic issues

### What Could Be Better

1. **Placeholder Validation**: Accepts `${ANYTHING}` but doesn't warn about undefined env vars:
   ```yaml
   baseUrl: ${UNDEFINED_VAR}  # Should warn this is undefined
   ```

2. **URL Validation**: Uses `z.string().url()` but this rejects `http://localhost:3000` in strict mode. Current workaround with `.or(z.string().regex())` works but is fragile.

3. **Missing `type` Default**: If `app.type` is missing, defaults to `'web'` silently. Should log this.

---

## 🟢 LOW: Backward Compatibility Analysis

### Breaking Changes vs Shell Scripts

| Behavior | Shell Script | CLI | Risk |
|----------|--------------|-----|------|
| Foundation generation | Uses @artk/core generator | Uses separate template-processor | 🔴 Different output |
| Browser download | Explicit playwright install | Skipped (env var) | 🟠 May not install |
| Config format | YAML with env vars | YAML with env vars | ✅ Same |
| Directory structure | artk-e2e/ | artk-e2e/ | ✅ Same |
| Prompts location | .github/prompts/ | .github/prompts/ | ✅ Same |
| Context location | .artk/context.json | .artk/context.json | ✅ Same |

### Migration Path

Users migrating from shell scripts to CLI should:
1. Run `artk doctor --fix` after migration
2. Verify foundation modules are complete
3. Re-run `npx playwright install` if browsers missing

---

## Feature Parity Checklist

| Feature | Shell Script | CLI | Notes |
|---------|--------------|-----|-------|
| Basic bootstrap | ✅ | ✅ | |
| Environment detection | ✅ | ✅ | |
| Variant selection | ✅ | ✅ | Interactive added |
| Config generation | ✅ | ✅ | |
| Config validation | ❌ | ✅ | CLI has Zod validation |
| Foundation modules | ✅ Full | ⚠️ Partial | **Duplicate implementation** |
| Browser fallback | ✅ | ✅ | Different mechanism |
| Playwright install | ✅ | ❌ | CLI skips this |
| Rollback on failure | ✅ | ✅ | |
| Backup creation | ✅ | ✅ | |
| Verbose logging | ✅ | ✅ | |
| Dry run mode | ❌ | ❌ | Neither has this |
| Version check | ❌ | ❌ | Neither has this |

---

## Recommendations

### Immediate (Before Release)

1. **Fix template generator duplication** - Either use @artk/core's generator or properly integrate the template system
2. **Fix browser installation** - Remove `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` or add explicit install step

### Short Term

3. **Add version verification** when copying @artk/core
4. **Add `--non-interactive` flag** for CI environments
5. **Add CI detection** to auto-skip prompts

### Nice to Have

6. **Add `--dry-run` flag** to preview changes
7. **Improve config validation** warnings with env var suggestions
8. **Add telemetry** (opt-in) to track CLI usage patterns

---

## Appendix: When is Foundation Generation Used?

To answer the user's question directly:

**Q: "When is foundation module generation used? Don't we have a generate... file?"**

**A:** Yes! There are TWO generators that should be ONE:

1. **`core/typescript/scripts/generate-foundation.ts`** - The existing, full-featured generator
   - Called by `bootstrap.sh` at step [5.5/7]
   - Uses @artk/core's complete template system
   - Has validation, backup, rollback
   - This is the CANONICAL generator

2. **`packages/cli/src/lib/template-processor.ts`** - The duplicate, simpler generator
   - Created for the CLI implementation
   - Only does basic `{{placeholder}}` replacement
   - Missing all the advanced features
   - This should be REMOVED or REPLACED

**What foundation modules do:**
- `auth/login.ts` - Authentication flow helpers
- `config/env.ts` - Environment configuration loading
- `navigation/nav.ts` - Route navigation utilities

**When they're generated:**
- During bootstrap (step 5/7 in shell script, step 5 in CLI)
- Before npm install
- After config files are created

**The correct approach:**
The CLI should call `generate-foundation.ts` from the vendored @artk/core, not use its own template processor. This ensures consistency between shell script and CLI installations.

---

## Conclusion

The CLI implementation is **90% complete** but has one critical architectural flaw: the duplicate template generator. This must be fixed before the CLI can be considered production-ready.

The other issues are manageable and can be addressed incrementally. The foundation (environment detection, config validation, browser resolution, interactive prompts) is solid.

**Recommended action:** Fix the template generator issue first, then address browser installation, then ship.
