# P4 Features Critical Review

**Date:** 2026-01-05
**Topic:** Critical analysis of accessibility timing, data strategy, and blocks API implementation

---

## Executive Summary

The P4 implementation is **functional but incomplete**. Three significant issues require immediate attention:

1. **Schema Inconsistency**: `timing: AccessibilityTimingSchema.default('afterEach').optional()` creates ambiguous behavior
2. **Data Strategy Generates Dead Code**: All data strategy code is commented out, providing scaffolding but no executable logic
3. **Blocks Strategy Wraps Entire File**: The approach defeats the purpose of partial regeneration

**Verdict**: 65% complete. Core mechanics work but design decisions need revision.

---

## Issue 1: Schema Default/Optional Inconsistency (CRITICAL)

### The Problem

```typescript
// schema.ts line 128
timing: AccessibilityTimingSchema.default('afterEach').optional(),
```

In Zod, combining `.default()` and `.optional()` creates confusing behavior:

| Input | Result |
|-------|--------|
| Field missing | `undefined` (optional wins) |
| Field explicitly `undefined` | `'afterEach'` (default wins) |
| Field set to value | Uses that value |

This means:
- If a journey YAML has no `timing` field → `undefined`
- Template checks `timing === 'inTest'` → false (correct)
- Template checks `timing !== 'inTest'` → true (generates afterEach)

**Currently works by accident**, but semantically wrong.

### The Fix

Option A - Remove optional (always has a value):
```typescript
timing: AccessibilityTimingSchema.default('afterEach'),
```

Option B - Remove default (handle undefined in template):
```typescript
timing: AccessibilityTimingSchema.optional(),
// Template: timing === 'inTest' vs !timing || timing === 'afterEach'
```

**Recommendation**: Option A - simpler, explicit.

### Impact

- **Breakage Risk**: Low (current behavior accidentally correct)
- **Future Bug Risk**: HIGH (someone will expect default to always apply)

---

## Issue 2: Data Strategy Generates Dead Code (DESIGN FLAW)

### The Problem

All generated data strategy code is commented out:

```typescript
// Generated output for 'seed' strategy:
test.beforeAll(async () => {
  // Load seed data for this journey
  // Note: Implement seedData() in your test fixtures
  // await seedData(['products', 'categories']);
});
```

This provides:
- Documentation value: YES
- Executable code: NO
- User action required: YES (must uncomment and implement)

### Why This Is Problematic

1. **Tests won't actually use data strategy** until user manually edits
2. **Defeats regeneration safety** - user edits inside beforeAll will be lost
3. **No runtime validation** - data.strategy='seed' passes validation but does nothing

### Alternative Design Options

**Option A: Import from fixtures (recommended)**
```typescript
// Generate actual import if fixtures exist:
import { seedData, cleanupTestData } from '@fixtures/data';

test.beforeAll(async () => {
  await seedData(['products', 'categories']);
});
```

**Option B: Type-safe stub that throws**
```typescript
test.beforeAll(async () => {
  throw new Error('Data strategy "seed" configured but seedData() not implemented. See: https://artk.dev/data-strategies');
});
```

**Option C: Config-driven (current approach, but documented)**

Keep current behavior but:
1. Add clear documentation in generated comment
2. Add lint rule to detect enabled-but-commented data strategies
3. Consider adding `data.implemented: boolean` field

### Impact

- **Current State**: Works as scaffolding only
- **Production Risk**: Medium - tests might run without expected data
- **User Confusion**: HIGH - "I set strategy to 'seed' but nothing happens"

---

## Issue 3: Blocks Strategy Design Limitations (ARCHITECTURE)

### The Problem

Current implementation wraps the **entire generated test** in a single block:

```typescript
// ARTK:BEGIN GENERATED id=test-JRN-0001
/**
 * Test Login
 * Journey: JRN-0001
 * ... entire 200-line test file ...
 */
// ARTK:END GENERATED
```

### Why This Defeats the Purpose

The value of managed blocks is **partial regeneration**:
- User adds custom setup → preserved
- Generated test code → regenerated
- User adds custom assertions → preserved

With current design:
- User can only add code **outside** the block
- Entire test is regenerated, destroying any inline customizations
- No granular block IDs for steps, assertions, etc.

### Better Design: Granular Blocks

```typescript
import { test, expect } from '@playwright/test';
// ARTK:BEGIN GENERATED id=JRN-0001-imports
import AxeBuilder from '@axe-core/playwright';
// ARTK:END GENERATED

// User: Custom setup preserved
function myHelper() {}

test.describe('Login Flow', () => {
  // ARTK:BEGIN GENERATED id=JRN-0001-AC1
  test.step('AC-1: Navigate', async () => {
    await page.goto('/login');
  });
  // ARTK:END GENERATED

  // User: Custom assertion preserved
  test.step('Custom check', async () => {
    // my code
  });

  // ARTK:BEGIN GENERATED id=JRN-0001-AC2
  test.step('AC-2: Fill form', async () => {
    // generated
  });
  // ARTK:END GENERATED
});
```

### Implementation Complexity

Granular blocks require:
1. Template changes to wrap individual sections
2. Block ID generation per step: `id=${journey.id}-${step.id}`
3. Smarter injection logic in `injectManagedBlocks()`
4. User education on block structure

### Current State Assessment

- **Works**: For append-only workflows
- **Fails**: For inline customization workflows
- **Documentation Gap**: No guidance on intended usage

---

## Issue 4: Missing Edge Case Tests

### Accessibility Timing

| Scenario | Tested? |
|----------|---------|
| timing='inTest' | YES |
| timing='afterEach' | YES |
| timing=undefined | NO |
| timing=null | NO |
| Data-driven + inTest | NO (only standard tests) |

### Data Strategy

| Scenario | Tested? |
|----------|---------|
| strategy='seed' with seeds[] | YES |
| strategy='seed' without seeds[] | NO |
| strategy='create' with factories[] | YES |
| strategy='create' without factories[] | NO |
| cleanup='required' | YES |
| cleanup='best-effort' | YES |
| cleanup='none' | YES |
| cleanup=undefined | NO |
| data=undefined | YES |

### Blocks Strategy

| Scenario | Tested? |
|----------|---------|
| Empty existing code | YES |
| Code with no blocks | YES |
| Code with matching block | YES |
| Code with different journey block | NO |
| Multiple blocks | NO (in integration) |
| Malformed blocks | YES (unit) |

---

## Issue 5: Backward Compatibility Analysis

### Breaking Changes

| Change | Risk |
|--------|------|
| Added `timing` to AccessibilityConfig | NONE - optional field |
| Added `collectTimeout` to PerformanceConfig | NONE - optional field |
| Added `seeds`/`factories` to JourneyDataConfig | NONE - optional fields |
| Exported blocks.ts | NONE - additive |
| Added regenerateTestWithBlocks() | NONE - additive |

### Template Output Changes

| Feature | Breaking? | Impact |
|---------|-----------|--------|
| Accessibility inTest mode | NO | New journeys only |
| Data strategy scaffolding | NO | New journeys only |
| Performance timeout | YES | Tests with custom timeout get different value |

**One Minor Breaking Change**:
Tests that relied on the hardcoded 1000ms timeout (pre-fix) or 3000ms default now use configured value. If user had `collectTimeout: 5000`, their tests will now actually use 5000ms instead of being ignored.

---

## Issue 6: Type Safety Gaps

### testData Variable Scope

```typescript
// Data strategy 'create' generates:
let testData: Record<string, unknown>;

test.beforeEach(async () => {
  // testData = await createTestData(...);  // COMMENTED
});

// Cleanup tries to reference it:
test.afterEach(async () => {
  // await cleanupTestData(testData);  // COMMENTED
});
```

If user uncomments only one, TypeScript will error. Good!
But if user provides different variable name, no error.

---

## Recommendations Priority Matrix

| Issue | Severity | Effort | Priority |
|-------|----------|--------|----------|
| 1. Schema default/optional | Medium | Low | P1 |
| 2. Data strategy dead code | High | Medium | P2 |
| 3. Blocks granularity | Medium | High | P3 |
| 4. Missing tests | Low | Low | P1 |
| 5. Breaking changes | None | None | Done |
| 6. Type safety | Low | Medium | P4 |

---

## Immediate Action Items

### P1 - Quick Fixes (< 1 hour)

1. **Fix schema default**:
```typescript
timing: AccessibilityTimingSchema.default('afterEach'),  // Remove .optional()
```

2. **Add missing tests**:
- Data strategy with empty seeds/factories arrays
- Accessibility timing=undefined
- Data-driven tests with inTest mode

### P2 - Design Decisions Required

1. **Data strategy philosophy**:
   - Scaffolding (current) vs executable (recommended)
   - Decision owner: Architect

2. **Blocks granularity**:
   - File-level (current) vs step-level (ideal)
   - Trade-off: complexity vs value

### P3 - Documentation

1. Document data strategy as "scaffolding that requires implementation"
2. Document blocks strategy limitations
3. Add examples to README

---

## Conclusion

The implementation delivers working features but makes design compromises that limit usefulness:

- **Accessibility timing**: Works correctly, schema needs cleanup
- **Data strategy**: Generates placeholder code, not production-ready
- **Blocks API**: Works for simple cases, architectural limitations for advanced use

**Recommendation**: Apply P1 fixes immediately, then decide on P2 design direction before 1.0 release.
