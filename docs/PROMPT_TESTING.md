# ARTK Prompt Testing Guide

This guide explains how to validate ARTK prompt updates to ensure AI assistants (GitHub Copilot, Claude, etc.) generate code that correctly uses ARTK Core v1 framework.

---

## Overview

ARTK prompts guide AI assistants through the workflow of building and maintaining regression testing suites. As of Phase 12 (US8), prompts have been updated to reference the ARTK Core v1 framework, ensuring generated code imports from core modules rather than creating everything from scratch.

**Updated Prompts:**
- `/init` - Bootstrap ARTK with core framework
- `/foundation-build` - Use core harness factory
- `/journey-implement` - Use core fixtures, locators, assertions
- `/journey-validate` - Validate core API usage
- `/journey-verify` - Run tests using core harness

---

## Testing Methodology

### 1. Manual Validation (Required)

For each updated prompt, manually verify the prompt content:

**Checklist per prompt:**
- [ ] Prompt references ARTK Core v1 framework
- [ ] Provides correct import examples from `@artk/core/*`
- [ ] Shows how to use core APIs (createPlaywrightConfig, test fixtures, etc.)
- [ ] Explicitly forbids manual implementation of features provided by core
- [ ] Includes correct file paths for core modules
- [ ] Examples compile without TypeScript errors
- [ ] No deprecated patterns (custom fixtures, manual config creation)

**How to validate:**
1. Read the updated prompt file
2. Check all code examples use core imports
3. Verify examples match actual core API (check `core/typescript/*/index.ts`)
4. Ensure no contradictory instructions exist

---

### 2. AI Assistant Validation (Recommended)

Test prompts with an actual AI assistant to ensure generated code is correct.

#### Setup Test Environment

```bash
# 1. Create a temporary test directory
mkdir -p /tmp/artk-prompt-test
cd /tmp/artk-prompt-test

# 2. Initialize a minimal Node.js project
npm init -y

# 3. Copy ARTK Core framework
cp -r /path/to/ARTK/core/typescript/dist /tmp/artk-prompt-test/.core
cp /path/to/ARTK/core/typescript/package.json /tmp/artk-prompt-test/.core/

# 4. Install Playwright
npm install -D @playwright/test
```

#### Test /init Prompt

**Test Case: Bootstrap ARTK structure**

1. Provide the `/init` prompt to AI assistant
2. AI should generate:
   - `artk.config.yml` with `version: "1.0"`
   - `.core/` directory with core framework
   - Correct directory structure
   - Documentation referencing core imports

**Validation:**
```bash
# Check core framework was copied
[ -d .core/dist ] && echo "✓ Core framework present" || echo "✗ Core framework missing"

# Check config version
grep 'version: "1.0"' artk.config.yml && echo "✓ Config version correct" || echo "✗ Config version incorrect"

# Check docs mention core
grep '@artk/core' docs/PLAYBOOK.md && echo "✓ Docs reference core" || echo "✗ Docs missing core references"
```

---

#### Test /foundation-build Prompt

**Test Case: Generate Playwright config**

1. Provide the `/foundation-build` prompt to AI assistant
2. AI should generate `playwright.config.ts` that:
   - Imports from `@artk/core/harness`
   - Uses `createPlaywrightConfig()`
   - Does NOT manually create config from scratch

**Validation:**
```bash
# Check imports
grep "from '@artk/core/harness'" playwright.config.ts && echo "✓ Imports from core" || echo "✗ Missing core imports"

# Check factory usage
grep "createPlaywrightConfig" playwright.config.ts && echo "✓ Uses core factory" || echo "✗ Manual config creation"

# TypeScript compilation
npx tsc --noEmit playwright.config.ts && echo "✓ Config compiles" || echo "✗ TypeScript errors"
```

**Anti-pattern detection:**
```bash
# Should NOT contain manual config creation
! grep -q "export default {" playwright.config.ts && echo "✓ No manual config" || echo "✗ WARNING: Manual config detected"
```

---

#### Test /journey-implement Prompt

**Test Case: Generate Journey test**

1. Create a sample Journey file in `journeys/JRN-0001__sample.md`
2. Provide the `/journey-implement` prompt to AI assistant
3. AI should generate test file that:
   - Imports from `@artk/core/fixtures`
   - Uses core fixtures (authenticatedPage, config, runId, testData)
   - Uses core assertions and locators where applicable

**Validation:**
```typescript
// tests/smoke/JRN-0001__sample.spec.ts should contain:

import { test, expect } from '@artk/core/fixtures'; // ✓ Core fixtures

test('sample test', async ({ authenticatedPage, config, runId }) => {
  // ✓ Using core fixtures
});
```

**Check script:**
```bash
# Check core fixture imports
grep "from '@artk/core/fixtures'" tests/**/*.spec.ts && echo "✓ Uses core fixtures" || echo "✗ Missing core fixtures"

# Check no custom fixtures
! grep -q "fixtures/test" tests/**/*.spec.ts && echo "✓ No custom fixtures" || echo "✗ WARNING: Custom fixtures detected"

# Check no raw Playwright test
! grep -q "from '@playwright/test'" tests/**/*.spec.ts && echo "✓ No raw Playwright imports" || echo "✗ WARNING: Raw Playwright detected"
```

---

#### Test /journey-validate Prompt

**Test Case: Validate core API usage**

1. Create a test file with INVALID imports:
```typescript
// BAD: tests/smoke/bad.spec.ts
import { test } from '@playwright/test'; // Should use @artk/core/fixtures
```

2. Run `/journey-validate` prompt
3. AI should detect and report the invalid import

**Validation:**
- Validation report should flag tests NOT using `@artk/core/fixtures`
- Should recommend correct imports
- Should fail validation if strict mode

---

#### Test /journey-verify Prompt

**Test Case: Verify core harness integration**

1. Provide the `/journey-verify` prompt to AI assistant
2. AI should check:
   - Core framework exists at `.core/`
   - Playwright config uses core harness
   - Tests import from core fixtures
   - Auth setup projects exist

**Validation:**
```bash
# AI should verify these before running tests
[ -d .core/dist ] || echo "✗ Core framework missing"
grep "createPlaywrightConfig" playwright.config.ts || echo "✗ Config doesn't use core"
grep "@artk/core/fixtures" tests/**/*.spec.ts || echo "✗ Tests don't use core"
```

---

## Common Issues and Fixes

### Issue 1: AI generates custom fixtures instead of using core

**Symptom:**
```typescript
// WRONG
import { test as base } from '@playwright/test';
export const test = base.extend({ ... });
```

**Fix:**
Update prompt to explicitly forbid custom fixtures and emphasize core fixture usage.

**Verification:**
```bash
# Should find NO custom fixture files
find . -name "test.ts" -o -name "fixtures.ts" | grep -v node_modules | grep -v .core
```

---

### Issue 2: AI creates Playwright config manually

**Symptom:**
```typescript
// WRONG
export default {
  testDir: './tests',
  timeout: 30000,
  // ... 100 lines of manual config
}
```

**Fix:**
Update prompt to require `createPlaywrightConfig` import and usage.

**Verification:**
```bash
grep "createPlaywrightConfig" playwright.config.ts || echo "ERROR: Not using core factory"
```

---

### Issue 3: AI doesn't copy core framework during /init

**Symptom:**
- `.core/` directory missing
- Imports from `@artk/core/*` fail

**Fix:**
Update `/init` prompt to make core framework copy a critical first step.

**Verification:**
```bash
[ -f .core/dist/index.js ] && echo "✓ Core present" || echo "✗ Core missing"
```

---

## Regression Test Suite

Create a test script to validate all prompts systematically:

```bash
#!/bin/bash
# test-prompts.sh

set -e

echo "=== ARTK Prompt Validation Suite ==="

# Test /init
echo "Testing /init prompt..."
# TODO: Implement init test

# Test /foundation-build
echo "Testing /foundation-build prompt..."
# TODO: Implement foundation-build test

# Test /journey-implement
echo "Testing /journey-implement prompt..."
# TODO: Implement journey-implement test

# Test /journey-validate
echo "Testing /journey-validate prompt..."
# TODO: Implement journey-validate test

# Test /journey-verify
echo "Testing /journey-verify prompt..."
# TODO: Implement journey-verify test

echo "=== All tests passed ==="
```

---

## Prompt Update Checklist

When updating any ARTK prompt:

- [ ] Review existing prompt structure
- [ ] Identify sections that create code from scratch
- [ ] Replace with core framework imports and usage
- [ ] Add explicit examples showing core imports
- [ ] Add anti-patterns section (what NOT to do)
- [ ] Forbid manual implementation of core features
- [ ] Update documentation references
- [ ] Test with actual AI assistant
- [ ] Verify generated code uses core APIs
- [ ] Check TypeScript compilation
- [ ] Run prompt validation suite
- [ ] Update this guide if new patterns emerge

---

## Integration with BAZINGA

When BAZINGA orchestration invokes prompts, verify:

1. **PM Agent** understands core framework is available
2. **Developer Agent** generates code using core imports
3. **QA Agent** runs tests via core harness
4. **Tech Lead Agent** reviews for correct core usage

**BAZINGA Validation:**
- PM should NOT plan custom fixture creation
- Developer should use `@artk/core/*` imports
- QA should verify tests use core fixtures
- Tech Lead should reject manual implementations

---

## Version Compatibility

| ARTK Core Version | Prompt Version | Compatible |
|-------------------|----------------|------------|
| v1.0              | v0.1 (updated) | ✓          |
| v1.0              | v0.1 (original)| ✗          |

**When core version updates:**
1. Review breaking changes in core API
2. Update prompt examples to match new API
3. Update validation rules
4. Re-run full prompt test suite
5. Update this guide

---

## Resources

- **ARTK Core API Docs**: `core/typescript/README.md`
- **Config Module**: `core/typescript/config/index.ts`
- **Fixtures Module**: `core/typescript/fixtures/index.ts`
- **Harness Module**: `core/typescript/harness/index.ts`
- **Prompt Files**: `prompts/ARTK_*_prompt_*.prompt.md`

---

## Questions?

If you encounter issues or have questions about prompt testing:

1. Check this guide for common issues
2. Review core module documentation
3. Examine prompt examples in detail
4. Test with AI assistant in isolated environment
5. File an issue with reproduction steps

---

**Last Updated**: 2025-12-29 (Phase 12: US8 Prompt Integration)
