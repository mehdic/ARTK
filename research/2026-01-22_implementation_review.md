# Brutal Self-Review: Bootstrap Template Fixes

**Date:** 2026-01-22
**Reviewer:** Claude (Self-Review)
**Verdict:** PARTIALLY SUCCESSFUL - Critical inconsistencies found

---

## Executive Summary

The implementation fixes the core issue (env var resolution) but introduces **5 inconsistencies** between the three bootstrap scripts. These inconsistencies could cause subtle behavioral differences depending on which bootstrap method is used.

**Confidence in current implementation:** 0.68 (down from 0.91)

---

## Critical Issues Found

### Issue #1: PowerShell Missing `browserUse` Pattern
**Severity:** HIGH | **Type:** Behavioral Inconsistency

**PowerShell (BROKEN):**
```typescript
// No browserUse variable - uses inline spread
use: {
  baseURL,
  trace: 'on-first-retry',
  screenshot: 'only-on-failure',
  ...(browserChannel && browserChannel !== 'bundled' ? { channel: browserChannel } : {}),
},

projects: [
  {
    name: 'validation',
    use: { ...devices['Desktop Chrome'], baseURL },  // ❌ NO browser channel!
  },
]
```

**Bash/CLI (CORRECT):**
```typescript
const browserUse: Record<string, any> = { ...devices['Desktop Chrome'] };
if (browserChannel && browserChannel !== 'bundled') {
  browserUse.channel = browserChannel;
}

projects: [
  {
    name: 'validation',
    use: { ...browserUse, baseURL },  // ✅ Includes browser channel
  },
]
```

**Impact:** PowerShell-bootstrapped projects will IGNORE custom browser channel for validation tests. If user sets `browsers.channel: msedge` in artk.config.yml, the validation project will still use bundled Chromium.

---

### Issue #2: Reporter Configuration Mismatch
**Severity:** MEDIUM | **Type:** Configuration Inconsistency

| Script | Reporter Config |
|--------|-----------------|
| PowerShell | `reporter: 'html'` |
| Bash | `reporter: [['html', { open: 'never' }]]` |
| CLI | `reporter: [['html', { open: 'never' }]]` |

**Impact:** PowerShell-bootstrapped projects will auto-open HTML report in browser after tests. This is annoying in CI/CD environments.

---

### Issue #3: Missing Timeout Configuration
**Severity:** MEDIUM | **Type:** Missing Feature

| Script | Has `timeout` from config? |
|--------|---------------------------|
| PowerShell | ❌ No |
| Bash | ✅ Yes (`timeout: artkConfig.settings?.timeout \|\| 30000`) |
| CLI | ✅ Yes |

**Impact:** PowerShell-bootstrapped projects will always use Playwright's default timeout (30s), ignoring `settings.timeout` in artk.config.yml.

---

### Issue #4: Different Fallback Chain for baseUrl
**Severity:** LOW | **Type:** Subtle Behavioral Difference

**PowerShell:**
```typescript
const envConfig = artkConfig.environments?.[env] || artkConfig.environments?.local || {};
const rawBaseUrl = envConfig.baseUrl || 'http://localhost:3000';
```

**Bash/CLI:**
```typescript
const rawBaseUrl = artkConfig.environments?.[env]?.baseUrl || 'http://localhost:3000';
```

**Impact:** PowerShell falls back to `local` environment if specified env doesn't exist, THEN falls back to default URL. Bash/CLI skip directly to default URL. Edge case, but could cause confusion.

---

### Issue #5: Warning Message Spam (All Scripts)
**Severity:** LOW | **Type:** UX Issue

```typescript
console.warn(`[ARTK] Warning: Environment variable ${varName} is not defined and has no default`);
```

**Impact:** Every undefined env var logs a warning. In CI/CD, if someone has `${ADMIN_USER}` in auth config but doesn't set it (because they don't use that role), they'll see warnings.

**Should be:** Debug-level logging, not warning.

---

## Missing Features

### 1. No Unit Tests Added
The `resolveEnvVars` function has no unit tests. Should add tests to:
- `core/typescript/config/__tests__/` (for core parity)
- Or document that the inline function is intentionally untested

### 2. No Validation Test File
No `foundation.validation.spec.ts` template is created by bootstrap. User sees "testMatch: /foundation.validation.spec.ts/" but the file doesn't exist.

### 3. No Error Recovery
If `yaml.parse()` throws (malformed YAML), the config loading crashes Playwright startup with an unhelpful error.

---

## Regex Analysis

### My Implementation
```typescript
/\$\{([A-Z_][A-Z0-9_]*)(:-([^}]*))?\}/gi
```

### Core Implementation
```typescript
/^\$\{([A-Z_][A-Z0-9_]*)(:-([^}]*))?\}$/i  // For single match
/\$\{([A-Z_][A-Z0-9_]*)(:-([^}]*))?\}/gi   // For findAll
```

**Analysis:** My regex matches core's `findAll` pattern exactly. Good.

### Edge Cases

| Input | Expected | Actual | Status |
|-------|----------|--------|--------|
| `${VAR}` | Resolved or warn | Resolved or warn | ✅ |
| `${VAR:-}` | Empty string default | Empty string default | ✅ |
| `${VAR:-default}` | "default" | "default" | ✅ |
| `${var}` (lowercase) | Resolved (case-insensitive) | Resolved | ✅ |
| `${VAR:-${NESTED}}` | Undefined behavior | Partial resolution | ⚠️ |
| `${123VAR}` | No match | No match | ✅ |
| `$VAR` (no braces) | No match | No match | ✅ |
| `\${VAR}` (escaped) | Literal `${VAR}` | Literal `${VAR}` | ✅ |

**Nested variable issue:** `${VAR:-${NESTED}}` would resolve to `${NESTED}` if VAR is undefined, which is a literal string, not a resolved value. Core has the same behavior. Acceptable.

---

## Backward Compatibility Assessment

| Scenario | Risk | Impact |
|----------|------|--------|
| Existing projects re-bootstrapping | Low | New config will override, but structure unchanged |
| Projects with custom playwright.config.ts | None | Bootstrap doesn't run on existing installs |
| Projects using `${VAR}` without defaults | Low | Will now see console warnings |
| Projects with malformed YAML | High | Will crash instead of using defaults |
| CI/CD with browser channel override | Medium | PowerShell installs won't respect channel |

---

## Decision Tree Loopholes

### Loophole #1: ARTK_ENV not set, environment doesn't exist
```
ARTK_ENV=staging, but artk.config.yml only has local/intg/prod
```
- PowerShell: Falls back to `local`, then resolves
- Bash/CLI: Falls back to default URL directly

**Result:** Different baseURLs depending on bootstrap method.

### Loophole #2: Empty string env var
```
export ARTK_BASE_URL=""
```
- My code: `if (envValue !== undefined && envValue !== '')` → treats as undefined
- User expectation: Maybe they WANT empty string?

**Result:** Silently ignores user's explicit empty value.

### Loophole #3: Browser channel 'bundled' handling
```
browsers:
  channel: bundled
```
- PowerShell: `...(browserChannel && browserChannel !== 'bundled' ? { channel: browserChannel } : {})`
- Bash/CLI: `if (browserChannel && browserChannel !== 'bundled')` → same logic

**Result:** Consistent, but 'bundled' is magic string not documented.

---

## Recommendations

### Immediate Fixes (Before Merge)

1. **Sync PowerShell with Bash/CLI structure:**
   - Add `browserUse` variable
   - Fix reporter config
   - Add timeout from settings
   - Align baseUrl fallback chain

2. **Reduce warning verbosity:**
   - Only warn once per unique variable
   - Or make it debug-level

### Future Improvements

3. **Add validation test file to bootstrap:**
   - Create minimal `tests/foundation/foundation.validation.spec.ts`

4. **Add error handling for YAML parsing:**
   ```typescript
   try {
     return yaml.parse(fs.readFileSync(configPath, 'utf8'));
   } catch (e) {
     console.error(`[ARTK] Failed to parse artk.config.yml: ${e.message}`);
     return { environments: { local: { baseUrl: 'http://localhost:3000' } } };
   }
   ```

5. **Consider extracting to shared template file:**
   - Now that we have 5+ inconsistencies, the "maintain in 3 places" problem is real

---

## Corrected Confidence Scores

| Aspect | Before Review | After Review |
|--------|---------------|--------------|
| Core functionality (env var resolution) | 0.95 | 0.92 |
| Cross-script consistency | 0.90 | 0.55 |
| Backward compatibility | 0.95 | 0.85 |
| Edge case handling | 0.85 | 0.75 |
| Overall implementation | **0.91** | **0.68** |

---

## Verdict

**The implementation partially solves the problem but introduces new inconsistencies that should be fixed before considering this complete.**

The env var resolution works correctly. The validation project baseURL fix works. But the three bootstrap scripts are now MORE inconsistent than before in other areas (reporter, timeout, browserUse).

**Recommendation:** Fix PowerShell to match Bash/CLI structure before merging.
