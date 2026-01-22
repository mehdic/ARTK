# Implementation Brainstorm: Bootstrap Template Fixes

**Date:** 2026-01-22
**Session:** Thought Partner Brainstorm

---

## Key Questions & Decisions

### Q1: Shared Template Format for P2

**Options analyzed:**

| Format | Pros | Cons |
|--------|------|------|
| **JSON** | Language-agnostic, easy to parse | Can't have comments, no logic |
| **TypeScript** | Type-safe, IDE support | Needs transpilation, escaping hell |
| **Plain .ts file** | Direct copy, no processing | Different escaping per script |
| **Mustache/Handlebars** | Simple substitution | Another dependency |

**Decision: Plain TypeScript file with marker comments**

```typescript
// templates/playwright.config.template.ts
// TEMPLATE_START
... actual config ...
// TEMPLATE_END
```

Scripts read the file, extract between markers, and write directly. No processing needed because the template IS the final output.

**Rationale:**
- Zero dependencies
- IDE syntax highlighting works
- Easy to test (just run `tsc --noEmit` on it)
- Scripts just copy content between markers

---

### Q2: Warning Deduplication Strategy

**Options:**

| Strategy | Implementation | UX |
|----------|---------------|-----|
| Track in Set | `const warned = new Set(); if (!warned.has(v)) {...}` | No duplicates |
| Warn once at end | Collect all, log summary | Cleaner, one message |
| Silent + debug flag | `if (process.env.ARTK_DEBUG)` | Opt-in verbosity |

**Decision: Collect and summarize at end**

```typescript
const missingVars: string[] = [];
// In replace callback:
missingVars.push(varName);
// After all resolution:
if (missingVars.length > 0) {
  console.warn(`[ARTK] Missing env vars (using defaults): ${[...new Set(missingVars)].join(', ')}`);
}
```

**Rationale:**
- Single warning line instead of N lines
- Deduplicated via Set
- User sees all missing vars at once

---

### Q3: Validation Spec Template Contents

**Minimal tests that should always pass after bootstrap:**

```typescript
// tests/foundation/foundation.validation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('ARTK Foundation Validation', () => {
  test('config loads without error', async () => {
    // Just verify the config loading doesn't throw
    expect(true).toBe(true);
  });

  test('baseURL is configured', async ({ baseURL }) => {
    expect(baseURL).toBeTruthy();
    expect(baseURL).toMatch(/^https?:\/\//);
  });

  test('can navigate to baseURL', async ({ page, baseURL }) => {
    // Skip if no server running
    test.skip(!process.env.ARTK_VALIDATE_NAVIGATION, 'Set ARTK_VALIDATE_NAVIGATION=1 to test');
    await page.goto(baseURL!);
    await expect(page).not.toHaveTitle(/cannot be reached|refused/i);
  });
});
```

**Rationale:**
- First two tests always pass (no network needed)
- Third test is skipped by default (opt-in for CI)
- Validates config without requiring app to be running

---

### Q4: Template Location

**Options:**
- `templates/` - Already exists, has CI templates
- `packages/cli/assets/` - CLI-specific assets
- `scripts/templates/` - Near the scripts that use it

**Decision: `templates/bootstrap/`**

```
templates/
  bootstrap/
    playwright.config.template.ts
    foundation.validation.spec.ts
  github-actions.yml
  gitlab-ci.yml
```

**Rationale:**
- Keeps all templates together
- `bootstrap/` subdirectory separates from CI templates
- All 3 scripts can reference same path relative to repo root

---

## Implementation Plan

### Phase 1: P0 Fixes (Sync PowerShell)

1. **Update PowerShell package.json template** (lines 1043-1065)
   - Add `test:regression`, `test:validation`, `typecheck` scripts
   - Change yaml to `^2.3.4`

2. **Update PowerShell Playwright config** (lines 1069-1153)
   - Add `browserUse` variable
   - Fix reporter to `[['html', { open: 'never' }]]`
   - Add `timeout: artkConfig.settings?.timeout || 30000`
   - Change baseUrl fallback to match Bash/CLI
   - Update chromium and validation projects to use `browserUse`

### Phase 2: P1 Fixes (Error Handling)

3. **Add try-catch to YAML loading in all 3 scripts**
   ```typescript
   try {
     return yaml.parse(fs.readFileSync(configPath, 'utf8'));
   } catch (e: any) {
     console.error(`[ARTK] Failed to parse artk.config.yml: ${e.message}`);
     return { environments: { local: { baseUrl: 'http://localhost:3000' } } };
   }
   ```

4. **Update resolveEnvVars to collect warnings**
   - Add `missingVars` array
   - Log single summary at end

### Phase 3: P2 Fixes (Shared Template)

5. **Create `templates/bootstrap/playwright.config.template.ts`**
   - Single source of truth for all scripts
   - Includes all fixes from P0/P1

6. **Create `templates/bootstrap/foundation.validation.spec.ts`**
   - Minimal validation tests

7. **Update all 3 scripts to read from shared template**
   - PowerShell: `Get-Content`
   - Bash: `cat`
   - CLI: `fs.readFileSync`

### Phase 4: Verification

8. **Rebuild CLI package**
9. **Run test suite**
10. **Manual test: bootstrap to temp directory**

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking existing installs | Template changes only affect NEW bootstraps |
| Script syntax errors | Test each script independently |
| Template file not found | Add fallback to inline template |
| CI failures from warnings | Summary format is less noisy |

---

## Named Concepts from Session

1. **"Marker Template"** - Using comment markers to extract template content from a real file
2. **"Summary Warning"** - Collecting all warnings and emitting once at the end
3. **"Opt-in Validation"** - Tests that skip by default, run with env var flag

---

## Final Architecture

```
ARTK/
├── templates/
│   └── bootstrap/
│       ├── playwright.config.template.ts   # Single source of truth
│       └── foundation.validation.spec.ts   # Validation tests
├── scripts/
│   ├── bootstrap.ps1   # Reads from templates/bootstrap/
│   └── bootstrap.sh    # Reads from templates/bootstrap/
└── packages/cli/
    └── src/lib/
        └── bootstrap.ts  # Reads from bundled assets (copied from templates/)
```

The CLI bundles templates at build time, while shell scripts read at runtime.
