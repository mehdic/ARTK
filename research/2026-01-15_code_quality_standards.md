# Code Quality Standards & Prevention Strategy

**Date:** 2026-01-15
**Topic:** Systematic approach to prevent recurring code quality issues
**Trigger:** Code review revealed 7 fixable issues in autogen package

---

## Executive Summary

The issues found during code review fall into **5 categories** with **specific preventable root causes**. This document proposes tooling, patterns, and process changes to catch these issues automatically.

---

## Issue Classification

| Category | Issues Found | Root Cause | Prevention |
|----------|--------------|------------|------------|
| **Magic Values** | `99` instead of `ScriptTarget.ESNext` | No lint rule | ESLint `no-magic-numbers` |
| **Silent Failures** | Locator init skipped without warning | No error reporting standard | Result type pattern |
| **Dead Code** | `visibleTimeout` computed but unused | No unused var detection | ESLint `no-unused-vars` + stricter checks |
| **Input Validation** | `parseInt` without NaN check | No validation helpers | Shared parsing utilities |
| **Data Structure Bugs** | Id-less blocks using `''` as key | No edge case tests | Property-based testing |

---

## Category 1: Magic Values

### Problem
```typescript
// BAD: What does 99 mean?
compilerOptions: {
  target: 99,
  module: 99,
}
```

### Solution
```typescript
// GOOD: Self-documenting
compilerOptions: {
  target: ScriptTarget.ESNext,
  module: ModuleKind.ESNext,
}
```

### Prevention

**1. ESLint Configuration** (`.eslintrc.json`):
```json
{
  "rules": {
    "no-magic-numbers": ["warn", {
      "ignore": [0, 1, -1, 2],
      "ignoreArrayIndexes": true,
      "ignoreDefaultValues": true,
      "enforceConst": true
    }]
  }
}
```

**2. TypeScript Strict Enums** - When using numeric values, always import the enum:
```typescript
// Create a lint rule or code review checklist item:
// "If a number is passed to a library function, check if an enum exists"
```

**3. Constants File Pattern**:
```typescript
// src/constants.ts
export const COMPILER_OPTIONS = {
  target: ScriptTarget.ESNext,
  module: ModuleKind.ESNext,
  strict: true,
} as const;
```

---

## Category 2: Silent Failures

### Problem
```typescript
// BAD: Silently does nothing if no constructor
const constructor = classDecl.getConstructors()[0];
if (constructor) {
  // ... add initialization
}
// No else - caller has no idea initialization was skipped
return true; // Lies about success
```

### Solution
```typescript
// GOOD: Explicit failure reporting
if (!constructor) {
  console.warn(`Cannot add locator initialization: no constructor`);
  return true; // Still returns true (property added) but warns
}
```

### Prevention

**1. Result Type Pattern** - Replace boolean returns with structured results:

```typescript
// src/types/result.ts
export type Result<T, E = string> =
  | { success: true; value: T; warnings?: string[] }
  | { success: false; error: E };

// Usage
export function addLocatorProperty(
  classDecl: ClassDeclaration,
  locator: ModuleLocator,
): Result<boolean> {
  // ... add property ...

  const constructor = classDecl.getConstructors()[0];
  if (!constructor) {
    return {
      success: true,
      value: true, // Property was added
      warnings: [`Locator '${locator.name}' added but not initialized (no constructor)`]
    };
  }

  return { success: true, value: true };
}
```

**2. ESLint Rule** - Custom rule to flag functions that return boolean without logging:
```typescript
// Flag pattern: if (condition) { return true/false } with no else
```

**3. API Design Principle**:
> "Every function that can partially succeed MUST return a structured result with warnings"

---

## Category 3: Dead Code / Redundant Logic

### Problem
```typescript
// BAD: Variable computed but then re-computed inline
const visibleTimeout = primitive.timeout ? `{ timeout: ${primitive.timeout} }` : '';
return `...toBeVisible(${visibleTimeout ? `{ timeout: ${primitive.timeout} }` : ''});`;
//                      ^^^^^^^^^^^^^^^^^ redundant check, should use visibleTimeout
```

### Solution
```typescript
// GOOD: Use the computed variable
const visibleOptions = primitive.timeout ? `{ timeout: ${primitive.timeout} }` : '';
return `...toBeVisible(${visibleOptions});`;
```

### Prevention

**1. ESLint Configuration**:
```json
{
  "rules": {
    "no-unused-vars": ["error", {
      "varsIgnorePattern": "^_",
      "argsIgnorePattern": "^_"
    }],
    "@typescript-eslint/no-unused-vars": ["error"]
  }
}
```

**2. TypeScript `noUnusedLocals`** (`tsconfig.json`):
```json
{
  "compilerOptions": {
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

**3. Code Review Checklist**:
- [ ] Every declared variable is used
- [ ] No duplicate condition checks
- [ ] Computed values are used, not recomputed

---

## Category 4: Input Validation

### Problem
```typescript
// BAD: parseInt can return NaN, which propagates silently
maxHealAttempts: parseInt(values['max-heal'], 10),
// If values['max-heal'] is "abc", this becomes NaN
```

### Solution
```typescript
// GOOD: Validated parsing with fallback
function parseIntSafe(value: string | undefined, name: string, defaultValue: number): number {
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    console.warn(`Invalid value '${value}' for --${name}, using default: ${defaultValue}`);
    return defaultValue;
  }
  if (parsed < 0) {
    console.warn(`Negative value for --${name}, using default: ${defaultValue}`);
    return defaultValue;
  }
  return parsed;
}
```

### Prevention

**1. Shared Parsing Utilities** (`src/utils/parsing.ts`):
```typescript
export function parseIntSafe(value: string | undefined, name: string, defaultValue: number): number;
export function parseFloatSafe(value: string | undefined, name: string, defaultValue: number): number;
export function parseBoolSafe(value: string | undefined, defaultValue: boolean): boolean;
export function parseEnumSafe<T>(value: string | undefined, enumObj: T, defaultValue: T[keyof T]): T[keyof T];
```

**2. Ban Direct parseInt** - ESLint rule:
```json
{
  "rules": {
    "no-restricted-globals": ["error", {
      "name": "parseInt",
      "message": "Use parseIntSafe() from utils/parsing.ts instead"
    }]
  }
}
```

Actually, `parseInt` is not a global in the restricted sense. Better approach:

**3. Custom ESLint Rule or Grep Check**:
```bash
# CI check: fail if raw parseInt is used outside utils/
grep -r "parseInt(" src/ --include="*.ts" | grep -v "utils/parsing.ts" && exit 1
```

**4. Zod for CLI Arguments**:
```typescript
import { z } from 'zod';

const CliOptionsSchema = z.object({
  maxHeal: z.coerce.number().int().positive().default(3),
  stabilityRuns: z.coerce.number().int().positive().default(3),
  timeout: z.coerce.number().int().positive().optional(),
});

// Zod handles parsing, validation, and defaults in one place
```

---

## Category 5: Data Structure Edge Cases

### Problem
```typescript
// BAD: All id-less blocks share the same key ''
processedIds.add(currentBlockId || '');
// ...
if (!processedIds.has(block.id || '')) { // Always false for 2nd id-less block
```

### Solution
```typescript
// GOOD: Track id-less blocks by position
let idLessBlockIndex = 0;
const idLessNewBlocks = newBlocks.filter(b => !b.id);
const processedIdLessIndices = new Set<number>();

// For id-less blocks, match by position
if (!currentBlockId) {
  if (idLessBlockIndex < idLessNewBlocks.length) {
    replacement = idLessNewBlocks[idLessBlockIndex];
    processedIdLessIndices.add(idLessBlockIndex);
  }
  idLessBlockIndex++;
}
```

### Prevention

**1. Property-Based Testing** (with fast-check):
```typescript
import * as fc from 'fast-check';

describe('injectManagedBlocks', () => {
  it('should handle any combination of id/id-less blocks', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({
          id: fc.option(fc.string(), { nil: undefined }),
          content: fc.string(),
        })),
        fc.array(fc.record({
          id: fc.option(fc.string(), { nil: undefined }),
          content: fc.string(),
        })),
        (existingBlocks, newBlocks) => {
          // Property: number of blocks in output >= number of unique new blocks
          const result = injectManagedBlocks({
            existingCode: blocksToCode(existingBlocks),
            newBlocks,
          });
          const outputBlocks = extractManagedBlocks(result).blocks;
          // Assert invariants...
        }
      )
    );
  });
});
```

**2. Edge Case Test Checklist**:
- [ ] Empty input
- [ ] Single item
- [ ] Multiple identical items (same id, same content)
- [ ] Mixed present/absent optional fields
- [ ] Maximum size input

**3. Defensive Data Structures** - Don't use empty string as a sentinel:
```typescript
// BAD: Using '' to mean "no id"
const key = id || '';

// GOOD: Use Symbol or branded type
const NO_ID = Symbol('NO_ID');
type BlockKey = string | typeof NO_ID;
```

---

## Recommended Tooling Setup

### 1. ESLint Configuration

```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/strict-type-checked"
  ],
  "rules": {
    "no-magic-numbers": ["warn", { "ignore": [0, 1, -1] }],
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/strict-boolean-expressions": "error",
    "@typescript-eslint/no-floating-promises": "error",
    "eqeqeq": ["error", "always"],
    "no-implicit-coercion": "error"
  }
}
```

### 2. TypeScript Configuration

```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### 3. Pre-commit Hooks

```yaml
# .husky/pre-commit
npm run lint
npm run typecheck
npm run test:unit
```

### 4. CI Pipeline Checks

```yaml
# .github/workflows/ci.yml
jobs:
  quality:
    steps:
      - run: npm run lint -- --max-warnings 0
      - run: npm run typecheck
      - run: npm run test:coverage -- --coverage.thresholds.lines=80
      - run: npm run test:mutation  # Optional: mutation testing
```

---

## Code Review Checklist (Human Review)

Add to PR template:

```markdown
## Code Quality Checklist

### Values & Constants
- [ ] No magic numbers (use named constants or enums)
- [ ] String literals that appear multiple times are constants

### Error Handling
- [ ] Functions that can fail return structured results (not just boolean)
- [ ] Partial success cases include warnings
- [ ] User-facing errors have actionable messages

### Input Validation
- [ ] External inputs (CLI args, config files, API responses) are validated
- [ ] parseInt/parseFloat have NaN checks or use safe wrappers
- [ ] Optional fields have explicit defaults

### Data Structures
- [ ] Empty string is not used as a sentinel value
- [ ] Maps/Sets with optional keys handle undefined/null explicitly
- [ ] Array operations handle empty arrays

### Testing
- [ ] Edge cases tested (empty, single, max size)
- [ ] Error paths tested (invalid input, missing files)
- [ ] New code has corresponding tests
```

---

## Implementation Priority

| Action | Effort | Impact | Priority |
|--------|--------|--------|----------|
| Enable `noUnusedLocals` in tsconfig | Low | High | P0 |
| Add ESLint `no-magic-numbers` | Low | Medium | P1 |
| Create shared `parseIntSafe` utility | Low | Medium | P1 |
| Add Result type pattern to new code | Medium | High | P1 |
| Add property-based tests for data structures | Medium | High | P2 |
| Add pre-commit hooks | Low | Medium | P2 |
| Custom ESLint rule for parseInt ban | High | Low | P3 |

---

## Conclusion

The issues found were not random bugs - they fall into predictable categories that can be prevented with:

1. **Static Analysis** - ESLint + TypeScript strict mode catch 60% of issues
2. **Shared Utilities** - parseIntSafe, Result types reduce boilerplate
3. **Testing Patterns** - Property-based testing catches edge cases humans miss
4. **Code Review** - Checklist ensures human reviewers check known problem areas

**Key Insight:** Most bugs come from **implicit behavior** - silent failures, implicit type coercion, implicit sentinel values. The fix is to make everything **explicit**.

> "Explicit is better than implicit" - The Zen of Python (applies to TypeScript too)
