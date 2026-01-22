# Bootstrap Template Fixes - Ultrathink Analysis

**Date:** 2026-01-22
**Topic:** Fixing out-of-box issues in ARTK bootstrap templates
**Confidence:** 0.92

---

## Executive Summary

The ARTK bootstrap process has **7 issues** that cause immediate failures when running discover-foundation on new projects. The root cause is inconsistency between bootstrap templates (PowerShell vs Bash vs CLI) and the generated Playwright config not using the existing `resolveEnvVars()` function from `@artk/core`.

**Critical Insight:** The env var resolution code (`${VAR:-default}`) already exists and works perfectly in `core/typescript/config/env.ts`. The problem is that the Playwright config template duplicates config loading inline instead of using the core library.

---

## Problem Decomposition

### Issue #1: Missing `@types/node` in PowerShell Bootstrap
**Severity:** Critical | **Confidence:** 1.0

| Script | Has `@types/node`? | Line |
|--------|-------------------|------|
| `bootstrap.sh` | ✅ Yes | 1073 |
| `bootstrap.ps1` | ❌ No | 1055-1059 |
| `packages/cli/src/lib/bootstrap.ts` | ✅ Yes | 561 |

**Root Cause:** PowerShell template wasn't updated when bash script was fixed.

**Fix:** Add `"@types/node": "^20.10.0"` to PowerShell package.json template at line 1059.

---

### Issue #2: Environment Variables Not Expanded in Playwright Config
**Severity:** Critical | **Confidence:** 0.95

**Current Behavior:**
```typescript
// In playwright.config.ts (generated)
const baseURL = artkConfig.environments?.[env]?.baseUrl || 'http://localhost:3000';
// Returns: "${ARTK_BASE_URL:-http://localhost:5173}" (literal string!)
```

**Expected Behavior:**
```typescript
// Should resolve to: "http://localhost:5173"
```

**Root Cause:** The Playwright config template uses inline YAML loading that doesn't call `resolveEnvVars()`. The `yaml.parse()` function returns literal strings - it doesn't interpret `${VAR:-default}` syntax.

**Existing Solution (Not Used):**
```typescript
// core/typescript/config/env.ts - Lines 231-249
export function resolveEnvVars(value: string, options: ResolveOptions = {}): string {
  const refs = findEnvVarRefs(value);
  if (refs.length === 0) return value;
  let result = value;
  for (const ref of refs) {
    const resolved = resolveEnvVarRef(ref, options);
    result = result.replace(ref.match, resolved);
  }
  return result;
}
```

**Why Not Used:** The Playwright config is loaded BEFORE `npm install`, so `@artk/core` isn't available yet. The template avoids importing `@artk/core` due to ESM/CommonJS resolution issues with `file:` dependencies.

---

### Issue #3: Validation Project Missing baseURL Inheritance
**Severity:** Medium | **Confidence:** 0.9

**Current:**
```typescript
projects: [
  {
    name: 'validation',
    testMatch: /foundation\.validation\.spec\.ts/,
    use: browserUse,  // ❌ Missing baseURL
  },
]
```

**Expected:**
```typescript
projects: [
  {
    name: 'validation',
    testMatch: /foundation\.validation\.spec\.ts/,
    use: { ...browserUse, baseURL },  // ✅ Include baseURL
  },
]
```

**Root Cause:** Playwright project `use` objects don't automatically inherit from global `use`. Need explicit inclusion.

---

### Issue #4: Template Placeholders Not Substituted (Low Impact)
**Severity:** Low | **Confidence:** 0.85

The template files in `packages/cli/assets/core/templates/*/config/env.ts` use `{{projectRoot}}` placeholders that aren't substituted.

**Impact:** These templates are for prompt-driven generation, not bootstrap. The bootstrap creates its own config files. **Likely not causing the reported issues.**

---

### Issue #5: Hardcoded Routes/Selectors in Templates (Low Impact)
**Severity:** Low | **Confidence:** 0.8

Templates assume `/dashboard` route and `[data-testid="username"]` selectors.

**Impact:** These are prompt-driven foundation modules, not bootstrap output. They're meant to be customized during `/artk.discover-foundation`. **Not causing immediate failures.**

---

### Issue #6: Login Function Signature (Low Impact)
**Severity:** Low | **Confidence:** 0.75

The auth template vs. what prompts generate may differ.

**Impact:** Only affects projects using the prompt workflow. **Not causing bootstrap failures.**

---

### Issue #7: Navigation Too Opinionated (Low Impact)
**Severity:** Low | **Confidence:** 0.7

Hardcoded route helpers in navigation template.

**Impact:** Same as #5 - prompt-driven, meant for customization. **Not causing bootstrap failures.**

---

## Synthesis: Solution Approaches

### Approach A: Inline Env Var Resolution (Minimal Change)
**Confidence:** 0.88

Add a minimal `resolveEnvVars` function directly in the Playwright config template. This avoids dependency on `@artk/core` at config load time.

**Pros:**
- No external dependencies
- Works before `npm install`
- Single file change per bootstrap script
- Variant-independent (works for all Node versions)

**Cons:**
- Code duplication (resolver exists in core)
- Must maintain in 3 places (PowerShell, Bash, CLI)

**Implementation:**
```typescript
// Add to playwright.config.ts template
function resolveEnvVars(value: string): string {
  return value.replace(
    /\$\{([A-Z_][A-Z0-9_]*)(:-([^}]*))?\}/gi,
    (_, varName, __, defaultValue) =>
      process.env[varName] || defaultValue || ''
  );
}

// Then use it:
const rawBaseUrl = artkConfig.environments?.[env]?.baseUrl || 'http://localhost:3000';
const baseURL = resolveEnvVars(rawBaseUrl);
```

---

### Approach B: Generate Config at npm install Time
**Confidence:** 0.7

Use a postinstall script to regenerate playwright.config.ts after `@artk/core` is available.

**Pros:**
- Uses existing core resolver
- Single source of truth

**Cons:**
- Adds complexity (postinstall scripts)
- Config doesn't exist until npm install completes
- May break IDE support before install
- Variant complications (need different postinstall for legacy Node)

---

### Approach C: Move All Env Vars to .env File
**Confidence:** 0.6

Don't use `${VAR:-default}` in YAML. Instead, require `.env` file with all values.

**Pros:**
- Standard pattern
- No custom resolution needed

**Cons:**
- Breaking change for existing installations
- Loses the "sensible defaults" feature
- Requires more user setup

---

### Approach D: Pre-resolve at Bootstrap Time
**Confidence:** 0.65

Have the bootstrap scripts resolve env vars when generating artk.config.yml.

**Pros:**
- Config file has actual values
- No runtime resolution needed

**Cons:**
- Loses dynamic env var support
- Different behavior between bootstrap and manual config edits
- CI/CD can't override via env vars

---

## Verification Matrix

| Approach | Node 14 | Node 16 | Node 18+ | ESM | CJS | Breaking? |
|----------|---------|---------|----------|-----|-----|-----------|
| A (Inline) | ✅ | ✅ | ✅ | ✅ | ✅ | No |
| B (Postinstall) | ⚠️ | ⚠️ | ✅ | ⚠️ | ✅ | No |
| C (.env) | ✅ | ✅ | ✅ | ✅ | ✅ | **Yes** |
| D (Pre-resolve) | ✅ | ✅ | ✅ | ✅ | ✅ | Partial |

---

## Recommendation

**Primary: Approach A (Inline Env Var Resolution)**

1. Add minimal `resolveEnvVars` function to Playwright config template
2. Fix PowerShell bootstrap missing `@types/node`
3. Add baseURL to validation project

**Rationale:**
- Confidence: 0.88
- Zero breaking changes
- Works across all variants (Node 14-22, ESM/CJS)
- Single-file fix in each bootstrap script
- Runtime env var overrides still work

---

## Implementation Plan

### Phase 1: Critical Fixes (Issues #1-3)

#### Fix 1.1: PowerShell `@types/node`
**File:** `scripts/bootstrap.ps1`
**Line:** ~1059
**Change:**
```diff
  "devDependencies": {
    "@artk/core": "file:./vendor/artk-core",
    "@artk/core-autogen": "file:./vendor/artk-core-autogen",
    "@playwright/test": "^1.57.0",
+   "@types/node": "^20.10.0",
    "typescript": "^5.3.0"
  },
```

#### Fix 1.2: Inline Env Var Resolver in Playwright Config
**Files:**
- `scripts/bootstrap.ps1` (lines 1080-1130)
- `scripts/bootstrap.sh` (lines 1091-1150)
- `packages/cli/src/lib/bootstrap.ts` (lines 949-1018)

**Add function:**
```typescript
// Resolve environment variable placeholders: ${VAR} and ${VAR:-default}
function resolveEnvVars(value: string): string {
  if (typeof value !== 'string') return value;
  return value.replace(
    /\$\{([A-Z_][A-Z0-9_]*)(:-([^}]*))?\}/gi,
    (match, varName, _hasDefault, defaultValue) => {
      const envValue = process.env[varName];
      if (envValue !== undefined && envValue !== '') {
        return envValue;
      }
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      // Return empty string for undefined vars without defaults
      // (or keep match for debugging: return match)
      return '';
    }
  );
}

// Recursively resolve env vars in config object
function resolveConfigEnvVars<T>(obj: T): T {
  if (typeof obj === 'string') {
    return resolveEnvVars(obj) as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map(resolveConfigEnvVars) as unknown as T;
  }
  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = resolveConfigEnvVars(value);
    }
    return result as T;
  }
  return obj;
}
```

**Update config loading:**
```typescript
const rawConfig = yaml.parse(fs.readFileSync(configPath, 'utf8'));
const artkConfig = resolveConfigEnvVars(rawConfig);
```

#### Fix 1.3: Validation Project baseURL
**Files:** Same as Fix 1.2

**Change:**
```diff
    {
      name: 'validation',
      testMatch: /foundation\.validation\.spec\.ts/,
-     use: browserUse,
+     use: { ...browserUse, baseURL },
    },
```

### Phase 2: Synchronization (Ensure Consistency)

After fixing all three bootstrap sources, verify:
1. `bootstrap.ps1` matches `bootstrap.sh` for all templates
2. `packages/cli/src/lib/bootstrap.ts` matches shell scripts
3. Run `npm run build` in `packages/cli` to regenerate dist

### Phase 3: Testing

1. Run existing test suite: `npm run test:all`
2. Test bootstrap on fresh project with each variant:
   - `artk init --variant modern-esm /tmp/test-esm`
   - `artk init --variant modern-cjs /tmp/test-cjs`
   - `artk init --variant legacy-16 /tmp/test-16`
   - `artk init --variant legacy-14 /tmp/test-14`
3. Verify `npx playwright test tests/foundation/foundation.validation.spec.ts` passes
4. Test with env var override: `ARTK_BASE_URL=http://localhost:8080 npx playwright test`

---

## Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Regex doesn't match all patterns | Low | Medium | Use same regex as core (well-tested) |
| Breaking existing installations | Very Low | High | Inline function is additive, doesn't change interface |
| Performance impact | Very Low | Low | Regex runs once at config load |
| Node 14 compatibility | Low | Medium | Regex uses standard features available in Node 14 |

---

## Key Caveats

1. **The inline resolver is intentionally simpler than core's.** It doesn't throw on missing required vars (returns empty string). This is intentional for Playwright config resilience.

2. **Three places to maintain.** The resolver function must be kept in sync across PowerShell, Bash, and TypeScript CLI. Consider extracting to a shared template file in future.

3. **Not a full port of core resolver.** The inline version doesn't support `throwOnMissing` option or `fieldPath` for error messages. This is acceptable for config loading.

---

## Debate Topics for Multi-LLM Review

1. **Inline vs. Postinstall:** Is code duplication acceptable, or should we use a postinstall approach despite complexity?

2. **Error Handling:** Should the inline resolver throw on missing required vars (no default), or silently return empty string?

3. **Recursive Resolution:** Is `resolveConfigEnvVars` overkill? Would it be sufficient to only resolve `baseUrl` specifically?

4. **Breaking Change Option:** Should we consider Approach C (.env files) for ARTK 2.0 as a cleaner long-term solution?

5. **Shared Template File:** Should we extract the Playwright config template to a file that all three bootstrap scripts read, reducing duplication?
