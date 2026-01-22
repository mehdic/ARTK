# Comprehensive Code Review: Bootstrap Template Fixes

**Date:** 2026-01-22
**Reviewer:** Octo Review (Multi-AI Analysis)
**Files Reviewed:**
- `scripts/bootstrap.ps1` (lines 1042-1155)
- `scripts/bootstrap.sh` (lines 1050-1173)
- `packages/cli/src/lib/bootstrap.ts` (lines 946-1042)

---

## Review Summary

| Category | Score | Status |
|----------|-------|--------|
| Functionality | 7/10 | Core fix works, but inconsistencies |
| Consistency | 4/10 | **CRITICAL** - Scripts diverge significantly |
| Security | 6/10 | Missing error handling |
| Maintainability | 5/10 | Three separate templates to maintain |
| Backward Compatibility | 8/10 | Non-breaking, but behavioral changes |
| **Overall** | **6/10** | **Needs fixes before merge** |

---

## Self-Review Validation

### CONFIRMED Issues (All 5 Valid)

| # | Issue | Confirmed | Additional Notes |
|---|-------|-----------|------------------|
| 1 | PowerShell missing `browserUse` | ✅ YES | **Worse than stated** - affects chromium project too |
| 2 | Reporter config mismatch | ✅ YES | Correct analysis |
| 3 | Missing timeout in PowerShell | ✅ YES | Correct analysis |
| 4 | Different baseUrl fallback | ✅ YES | Correct analysis |
| 5 | Warning spam | ✅ YES | Correct analysis |

---

## NEW Issues Discovered

### Issue #6: Package.json Template Inconsistencies
**Severity:** MEDIUM | **Missed in self-review**

| Aspect | PowerShell | Bash | CLI |
|--------|------------|------|-----|
| yaml version | `^2.3.0` | `^2.3.4` | (generated) |
| `test:regression` script | ❌ Missing | ✅ Present | ✅ Present |
| `test:validation` script | ❌ Missing | ✅ Present | ✅ Present |
| `typecheck` script | ❌ Missing | ✅ Present | ✅ Present |

**Impact:** PowerShell users get fewer npm scripts and older yaml version.

---

### Issue #7: Chromium Project Also Ignores Browser Channel
**Severity:** HIGH | **Worse than self-review stated**

Self-review only mentioned validation project. But chromium project is ALSO affected:

**PowerShell:**
```typescript
{
  name: 'chromium',
  use: { ...devices['Desktop Chrome'] },  // ❌ NO browser channel!
  dependencies: ['setup'],
},
```

**Bash/CLI:**
```typescript
{
  name: 'chromium',
  use: browserUse,  // ✅ Includes browser channel
  dependencies: ['setup'],
},
```

**Impact:** PowerShell users setting `browsers.channel: msedge` will have it ignored for BOTH chromium and validation projects. Only the global `use` config has the channel.

---

### Issue #8: Global `use` Config Structure Differs
**Severity:** MEDIUM | **Missed in self-review**

**PowerShell:**
```typescript
use: {
  baseURL,
  trace: 'on-first-retry',
  screenshot: 'only-on-failure',
  ...(browserChannel && browserChannel !== 'bundled' ? { channel: browserChannel } : {}),
},
```

**Bash/CLI:**
```typescript
use: {
  baseURL,
  trace: 'on-first-retry',
  screenshot: 'only-on-failure',
},
// Channel is in browserUse, not global use
```

**Impact:** In PowerShell, browser channel is in global config. In Bash/CLI, it's in project-specific `browserUse`. Different inheritance behavior.

---

### Issue #9: Missing Try-Catch for YAML Parsing
**Severity:** MEDIUM | **Mentioned but not fully analyzed**

```typescript
// Current (all scripts):
return yaml.parse(fs.readFileSync(configPath, 'utf8'));

// If YAML is malformed, user sees:
// YAMLParseError: Implicit map keys need to be on a single line at line 5, column 1
```

**Impact:** Cryptic error message. User doesn't know it's ARTK config issue.

---

### Issue #10: No Deduplication of Warnings
**Severity:** LOW | **Extension of Issue #5**

If config has multiple env vars without defaults:
```yaml
auth:
  roles:
    admin:
      username: ${ADMIN_USER}
      password: ${ADMIN_PASS}
    viewer:
      username: ${VIEWER_USER}
      password: ${VIEWER_PASS}
```

User sees 4 separate warnings even though they're related.

---

## Consistency Matrix

### Feature Comparison Table

| Feature | PowerShell | Bash | CLI | Consistent? |
|---------|------------|------|-----|-------------|
| `resolveEnvVars` function | ✅ | ✅ | ✅ | ✅ YES |
| `browserUse` variable | ❌ | ✅ | ✅ | ❌ NO |
| Reporter `open: 'never'` | ❌ | ✅ | ✅ | ❌ NO |
| Timeout from config | ❌ | ✅ | ✅ | ❌ NO |
| baseUrl fallback to `local` | ✅ | ❌ | ❌ | ❌ NO |
| `test:regression` script | ❌ | ✅ | ✅ | ❌ NO |
| `test:validation` script | ❌ | ✅ | ✅ | ❌ NO |
| `typecheck` script | ❌ | ✅ | ✅ | ❌ NO |
| yaml version | `2.3.0` | `2.3.4` | (gen) | ❌ NO |
| Channel in global use | ✅ | ❌ | ❌ | ❌ NO |
| Channel in browserUse | ❌ | ✅ | ✅ | ❌ NO |
| YAML error handling | ❌ | ❌ | ❌ | ✅ YES (all bad) |

**Consistency Score: 3/12 features (25%)**

---

## Security Analysis

### OWASP Assessment

| Risk | Status | Notes |
|------|--------|-------|
| Injection | ✅ Safe | Regex is strict, no eval |
| Path Traversal | ✅ Safe | Uses `__dirname` |
| Information Disclosure | ⚠️ Low | Warnings expose var names |
| DoS | ✅ Safe | No unbounded operations |
| Error Handling | ⚠️ Medium | YAML parse errors not caught |

### Regex Security

```typescript
/\$\{([A-Z_][A-Z0-9_]*)(:-([^}]*))?\}/gi
```

- ✅ No ReDoS vulnerability (no nested quantifiers)
- ✅ Strict character class `[A-Z_][A-Z0-9_]*`
- ✅ Case-insensitive but doesn't allow special chars
- ⚠️ `[^}]*` in default value could match anything except `}`

**Edge case:** `${VAR:-value}more}` would stop at first `}`, leaving `more}` as literal. Acceptable.

---

## Backward Compatibility Analysis

### Breaking Changes: NONE

The implementation adds functionality without removing any existing behavior.

### Behavioral Changes

| Change | Risk | Mitigation |
|--------|------|------------|
| Console warnings for undefined vars | Low | Could filter in CI |
| Different fallback in PowerShell | Medium | Document the difference |
| Reporter auto-open in PowerShell | Low | User annoyance only |

---

## Recommendations

### P0: Must Fix Before Merge

1. **Sync PowerShell with Bash/CLI template structure**
   - Add `browserUse` variable
   - Update chromium and validation projects to use `browserUse`
   - Add `reporter: [['html', { open: 'never' }]]`
   - Add `timeout: artkConfig.settings?.timeout || 30000`
   - Use same baseUrl fallback chain

2. **Sync package.json templates**
   - Add missing scripts to PowerShell
   - Use same yaml version

### P1: Should Fix Soon

3. **Add try-catch for YAML parsing**
   ```typescript
   try {
     return yaml.parse(fs.readFileSync(configPath, 'utf8'));
   } catch (e) {
     console.error(`[ARTK] Error parsing artk.config.yml: ${e.message}`);
     console.error('[ARTK] Using default configuration');
     return { environments: { local: { baseUrl: 'http://localhost:3000' } } };
   }
   ```

4. **Reduce warning verbosity**
   - Track warned variables to avoid duplicates
   - Or use debug-level logging

### P2: Nice to Have

5. **Extract to shared template file**
   - Create `templates/playwright-config.ts.template`
   - All scripts read and process this single source

6. **Add foundation.validation.spec.ts template**
   - Users expect the file to exist if config references it

---

## Code Quality Metrics

### Cyclomatic Complexity

| Function | Complexity | Assessment |
|----------|------------|------------|
| `loadArtkConfig` | 2 | ✅ Simple |
| `resolveEnvVars` | 4 | ✅ Acceptable |
| Config setup | 3 | ✅ Simple |

### Lines of Code

| Script | Template Lines | Change |
|--------|---------------|--------|
| PowerShell | 82 | +18 |
| Bash | 93 | +18 |
| CLI | 91 | +18 |

### Duplication

**Before fix:** 3 templates, ~75 lines each, ~80% similar
**After fix:** 3 templates, ~90 lines each, ~70% similar (MORE divergent)

---

## Final Verdict

### What Works Well
- ✅ Core env var resolution is correct
- ✅ Regex matches core library pattern
- ✅ Edge cases handled appropriately
- ✅ No security vulnerabilities introduced
- ✅ Backward compatible (no breaking changes)

### What Needs Work
- ❌ PowerShell template significantly diverges from Bash/CLI
- ❌ 9 out of 12 features are inconsistent between scripts
- ❌ Missing error handling for YAML parsing
- ❌ Warning spam could annoy CI/CD users

### Overall Assessment

**The implementation solves the original problem (env var resolution) but creates new problems (inconsistency). The PowerShell template is now the "odd one out" and needs to be synchronized before this can be considered complete.**

**Recommendation:** Fix P0 issues, then merge. P1/P2 can be follow-up work.

---

## Appendix: Quick Fix for PowerShell

Replace the entire `$PlaywrightConfig` block with this synchronized version:

```powershell
$PlaywrightConfig = @"
import { defineConfig, devices } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

function loadArtkConfig(): Record<string, any> {
  const configPath = path.join(__dirname, 'artk.config.yml');
  if (!fs.existsSync(configPath)) {
    console.warn('ARTK config not found, using defaults');
    return { environments: { local: { baseUrl: 'http://localhost:3000' } } };
  }
  try {
    const yaml = require('yaml');
    return yaml.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (e) {
    console.error('[ARTK] Error parsing config:', e.message);
    return { environments: { local: { baseUrl: 'http://localhost:3000' } } };
  }
}

function resolveEnvVars(value: string): string {
  if (typeof value !== 'string') return String(value);
  return value.replace(
    /\`$\{([A-Z_][A-Z0-9_]*)(:-([^}]*))?\}/gi,
    (match, varName, _hasDefault, defaultValue) => {
      const envValue = process.env[varName];
      if (envValue !== undefined && envValue !== '') return envValue;
      if (defaultValue !== undefined) return defaultValue;
      console.warn('[ARTK] Warning: ' + varName + ' not defined');
      return '';
    }
  );
}

const artkConfig = loadArtkConfig();
const env = process.env.ARTK_ENV || 'local';
const rawBaseUrl = artkConfig.environments?.[env]?.baseUrl || 'http://localhost:3000';
const baseURL = resolveEnvVars(rawBaseUrl);
const browserChannel = artkConfig.browsers?.channel;

const browserUse: Record<string, any> = { ...devices['Desktop Chrome'] };
if (browserChannel && browserChannel !== 'bundled') {
  browserUse.channel = browserChannel;
}

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }]],
  timeout: artkConfig.settings?.timeout || 30000,

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    { name: 'chromium', use: browserUse, dependencies: ['setup'] },
    { name: 'validation', testMatch: /foundation\.validation\.spec\.ts/, use: { ...browserUse, baseURL } },
  ],
});
"@
```

**Note:** Also update package.json template to include missing scripts.
