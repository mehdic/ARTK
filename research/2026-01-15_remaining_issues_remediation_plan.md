# Remediation Plan: Code Quality Remaining Issues

**Date:** 2026-01-15
**Status:** Plan Phase
**Estimated Effort:** 3-4 focused sessions

---

## Executive Summary

Four issues remain from the code quality implementation:

| Issue | Severity | Effort | Approach |
|-------|----------|--------|----------|
| Pre-commit hooks disabled | CRITICAL | High | Phased TypeScript error remediation |
| Result type has zero adoption | HIGH | Medium | Strategic migration of 5 functions |
| codedError not throwable | MEDIUM | Low | Replace with Error subclass |
| lint-staged Windows incompatible | LOW | Low | Cross-platform configuration |

**Total TypeScript Errors:** 485
- 313 (65%) from `noUncheckedIndexedAccess` (undefined checks)
- 67 type argument mismatches
- 43 unused variables
- 36 type assignment issues
- 26 other

---

## Issue 1: Pre-commit Hooks Disabled

### Root Cause Analysis

The `noUncheckedIndexedAccess` compiler option makes all array/object indexed access return `T | undefined`. This is a **good** strict check that catches real bugs, but the existing codebase wasn't written with it in mind.

### Strategy: Phased Remediation

**Phase 1: Core Source Files (Priority)**

Focus on source files that have the most impact:

| File | Errors | Priority |
|------|--------|----------|
| `autogen/src/mapping/patterns.ts` | 31 | P0 |
| `autogen/src/journey/parseJourney.ts` | 29 | P0 |
| `autogen/src/codegen/blocks.ts` | 19 | P0 |
| `validation/rules/dependency-compat.ts` | 16 | P1 |
| `autogen/src/selectors/scanner.ts` | 10 | P1 |

**Phase 2: Test Files (Defer)**

Test files have many errors but lower impact. After Phase 1, either:
- Fix test files systematically, OR
- Add test files to a separate tsconfig with relaxed settings

### Implementation Patterns

**Pattern 1: Array Access with Guard**
```typescript
// Before (error TS2532)
const item = items[index];
console.log(item.name);

// After
const item = items[index];
if (item === undefined) {
  throw new Error(`Item at index ${index} not found`);
}
console.log(item.name);
```

**Pattern 2: Non-null Assertion (When Safe)**
```typescript
// Only when you've validated the index exists
const match = line.match(/pattern/);
if (match) {
  const group = match[1]!; // Safe: regex group exists if match exists
}
```

**Pattern 3: Optional Chaining + Nullish Coalescing**
```typescript
// Before
const value = obj.items[0].value;

// After
const value = obj.items[0]?.value ?? defaultValue;
```

**Pattern 4: Create Safe Access Utilities**
```typescript
// New utility: src/utils/array.ts
export function at<T>(arr: T[], index: number): T | undefined {
  return arr[index];
}

export function atOrThrow<T>(arr: T[], index: number, message?: string): T {
  const item = arr[index];
  if (item === undefined) {
    throw new Error(message ?? `Index ${index} out of bounds (length: ${arr.length})`);
  }
  return item;
}

export function first<T>(arr: T[]): T | undefined {
  return arr[0];
}

export function firstOrThrow<T>(arr: T[], message?: string): T {
  return atOrThrow(arr, 0, message ?? 'Array is empty');
}
```

### Pre-commit Enablement Timeline

1. **Immediate:** Enable pre-commit for `lint` only (not typecheck)
2. **After Phase 1:** Enable typecheck for `src/` directories
3. **After Phase 2:** Enable typecheck for all files

### Pre-commit Configuration (Interim)

```sh
#!/bin/sh
# .husky/pre-commit - Phase 1 version

# Run ESLint on staged files (cross-platform)
npx lint-staged

# Typecheck only src directories (skip tests for now)
npm --prefix core/typescript run typecheck -- --project tsconfig.src.json 2>/dev/null || true
npm --prefix core/typescript/autogen run typecheck 2>/dev/null || true

echo "Pre-commit checks complete"
```

---

## Issue 2: Result Type Has Zero Adoption

### Problem

Created a full Result monad but nothing uses it. The pattern exists but developers will continue using boolean returns and exceptions.

### Strategy: Demonstrate Value Through Migration

Migrate 5 strategic functions to show the pattern works:

| Function | Current Return | Location | Why Migrate |
|----------|---------------|----------|-------------|
| `parseJourneyContent` | throws | parseJourney.ts | High visibility, clear errors |
| `loadSelectorCatalog` | null | catalog.ts | File I/O can fail |
| `validateJourneyFrontmatter` | boolean | normalize.ts | Needs error details |
| `generateTest` | object + warnings | generateTest.ts | Already has warnings |
| `injectManagedBlocks` | string | blocks.ts | Can have structural errors |

### Migration Template

**Before:**
```typescript
export function parseJourneyContent(content: string): Journey {
  try {
    const parsed = yaml.parse(content);
    if (!parsed) {
      throw new Error('Empty content');
    }
    return parsed as Journey;
  } catch (error) {
    throw new Error(`Failed to parse journey: ${error}`);
  }
}

// Caller
try {
  const journey = parseJourneyContent(content);
  process(journey);
} catch (error) {
  console.error(error);
}
```

**After:**
```typescript
import { Result, ok, err, isOk, codedError } from '../utils/result.js';

export function parseJourneyContent(content: string): Result<Journey, CodedError> {
  try {
    const parsed = yaml.parse(content);
    if (!parsed) {
      return err(codedError('EMPTY_CONTENT', 'Journey content is empty'));
    }
    return ok(parsed as Journey);
  } catch (error) {
    return err(codedError('PARSE_ERROR', `Failed to parse journey: ${error}`));
  }
}

// Caller
const result = parseJourneyContent(content);
if (isOk(result)) {
  process(result.value);
} else {
  console.error(`[${result.error.code}] ${result.error.message}`);
}
```

### Documentation Update

Add to CLAUDE.md:
```markdown
## Error Handling Pattern

Use the Result type for operations that can fail:

\`\`\`typescript
import { Result, ok, err, isOk, codedError } from '@artk/core-autogen';

function riskyOperation(): Result<Data, CodedError> {
  if (somethingWrong) {
    return err(codedError('ERROR_CODE', 'Human message'));
  }
  return ok(data);
}
\`\`\`
```

---

## Issue 3: codedError Not Throwable

### Problem

`codedError()` returns a plain object, not an Error subclass:
- No stack traces
- Can't use `instanceof CodedError`
- Doesn't integrate with standard error handling

### Solution: Create CodedError Class

**New implementation:**
```typescript
// src/utils/result.ts

/**
 * Error class with code, message, and optional details
 *
 * Can be used both with Result type and thrown directly.
 */
export class CodedError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'CodedError';
    this.code = code;
    this.details = details;

    // Maintains proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CodedError);
    }
  }

  /**
   * Create a CodedError (convenience factory)
   */
  static create(code: string, message: string, details?: Record<string, unknown>): CodedError {
    return new CodedError(code, message, details);
  }

  /**
   * Convert to plain object (for serialization)
   */
  toJSON(): { code: string; message: string; details?: Record<string, unknown> } {
    return {
      code: this.code,
      message: this.message,
      ...(this.details && { details: this.details }),
    };
  }
}

// Keep factory function for backward compatibility
export function codedError(
  code: string,
  message: string,
  details?: Record<string, unknown>
): CodedError {
  return new CodedError(code, message, details);
}
```

### Usage Examples

```typescript
// With Result type
function parse(input: string): Result<Data, CodedError> {
  if (!input) {
    return err(new CodedError('EMPTY_INPUT', 'Input cannot be empty'));
  }
  return ok(parseData(input));
}

// Thrown directly
function validateOrThrow(data: Data): void {
  if (!data.id) {
    throw new CodedError('MISSING_ID', 'Data must have an id', { data });
  }
}

// Caught with instanceof
try {
  validateOrThrow(data);
} catch (error) {
  if (error instanceof CodedError) {
    console.error(`[${error.code}] ${error.message}`);
    if (error.details) {
      console.error('Details:', error.details);
    }
  } else {
    throw error;
  }
}
```

---

## Issue 4: lint-staged Windows Incompatible

### Problem

Current configuration:
```json
"lint-staged": {
  "core/typescript/src/**/*.ts": "bash -c 'cd core/typescript && npx eslint --fix \"$@\"' _"
}
```

Uses `bash -c` which doesn't work on Windows without WSL/Git Bash.

### Solution: Cross-Platform Configuration

**Option A: Use lint-staged's cwd option (Recommended)**

```json
{
  "lint-staged": {
    "core/typescript/src/**/*.ts": {
      "cwd": "core/typescript",
      "commands": ["eslint --fix"]
    },
    "core/typescript/autogen/{src,tests}/**/*.ts": {
      "cwd": "core/typescript/autogen",
      "commands": ["eslint --fix"]
    }
  }
}
```

Wait - lint-staged doesn't support `cwd` per-glob. Let me think of another approach.

**Option B: Create ESLint config at root**

Create a root `.eslintrc.cjs` that delegates to subproject configs:

```javascript
// .eslintrc.cjs (root)
module.exports = {
  root: true,
  overrides: [
    {
      files: ['core/typescript/src/**/*.ts'],
      extends: ['./core/typescript/.eslintrc.cjs'],
    },
    {
      files: ['core/typescript/autogen/**/*.ts'],
      extends: ['./core/typescript/autogen/.eslintrc.cjs'],
    },
  ],
};
```

Then lint-staged becomes:
```json
{
  "lint-staged": {
    "core/typescript/**/*.ts": "eslint --fix"
  }
}
```

**Option C: Use Node script (Most Portable)**

Create `scripts/lint-staged-eslint.js`:
```javascript
#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');

const files = process.argv.slice(2);

// Group files by their project
const coreFiles = files.filter(f => f.includes('core/typescript/src/'));
const autogenFiles = files.filter(f => f.includes('core/typescript/autogen/'));

if (coreFiles.length > 0) {
  execSync(`npx eslint --fix ${coreFiles.join(' ')}`, {
    cwd: path.join(__dirname, '../core/typescript'),
    stdio: 'inherit',
  });
}

if (autogenFiles.length > 0) {
  execSync(`npx eslint --fix ${autogenFiles.join(' ')}`, {
    cwd: path.join(__dirname, '../core/typescript/autogen'),
    stdio: 'inherit',
  });
}
```

Then:
```json
{
  "lint-staged": {
    "core/typescript/**/*.ts": "node scripts/lint-staged-eslint.js"
  }
}
```

### Recommendation

**Use Option C** (Node script) because:
1. Works on all platforms
2. Handles complex directory structures
3. Easy to extend with more logic
4. No ESLint config changes needed

---

## Implementation Order

### Session 1: Quick Wins (1-2 hours)
1. ✅ Fix codedError → CodedError class
2. ✅ Fix lint-staged Windows compatibility
3. ✅ Enable pre-commit with lint-only

### Session 2: TypeScript Errors Phase 1 (2-3 hours)
1. Create array utility functions
2. Fix `patterns.ts` (31 errors)
3. Fix `parseJourney.ts` (29 errors)
4. Fix `blocks.ts` (19 errors)

### Session 3: TypeScript Errors Phase 1 Continued (2-3 hours)
1. Fix `dependency-compat.ts` (16 errors)
2. Fix `scanner.ts` (10 errors)
3. Enable pre-commit typecheck for src/

### Session 4: Result Type Adoption (2-3 hours)
1. Migrate `parseJourneyContent`
2. Migrate `loadSelectorCatalog`
3. Migrate `validateJourneyFrontmatter`
4. Update documentation

### Session 5: Test Files & Polish (2-3 hours)
1. Fix test file TypeScript errors
2. Enable full pre-commit typecheck
3. Final documentation updates

---

## Success Criteria

| Metric | Current | Target |
|--------|---------|--------|
| TypeScript errors | 485 | 0 |
| Pre-commit enabled | No | Yes |
| Result type adoption | 0 functions | 5+ functions |
| codedError throwable | No | Yes |
| Windows compatible | No | Yes |

---

## Appendix: Error Categories

### TS2532: Object is possibly 'undefined' (218 errors)
Most common. Fix with guards, optional chaining, or non-null assertion.

### TS18048: 'X' is possibly 'undefined' (95 errors)
Similar to TS2532. Usually array/map access results.

### TS2345: Argument type mismatch (67 errors)
Type narrowing not propagating. Fix with explicit checks or type assertions.

### TS6133: Unused declaration (43 errors)
Remove unused variables or prefix with underscore.

### TS2322: Type assignment mismatch (36 errors)
Return types or property types don't match. Fix with proper typing.

### TS2307: Cannot find module (8 errors)
Missing imports or incorrect paths. Fix imports.
