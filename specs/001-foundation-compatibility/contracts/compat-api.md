# Compatibility Layer API Contract

**Package**: `@artk/core/compat`
**Version**: 1.0.0
**Purpose**: Runtime abstraction for Node.js module system differences

## Overview

The compatibility layer provides a unified API for environment-specific operations that differ between CommonJS and ESM. All functions are synchronous (except `dynamicImport`) and have zero external dependencies.

---

## API Reference

### `getDirname(): string`

Returns the current directory path, abstracting `__dirname` (CommonJS) vs `import.meta.url` (ESM).

**Signature:**
```typescript
export function getDirname(): string;
```

**Returns:** Absolute path to the directory containing the calling module

**Throws:** `Error` if environment cannot be determined (neither `__dirname` nor `import.meta` available)

**Performance:** < 10μs in CommonJS, < 20μs in ESM (with Node 20.11.0+ built-in: < 5μs)

**Example:**
```typescript
import { getDirname } from '@artk/core/compat';

const __dirname = getDirname();
// CommonJS: returns __dirname directly
// ESM (Node 20.11.0+): returns import.meta.dirname
// ESM (Node 18-20.10): returns fileURLToPath(new URL('.', import.meta.url))
```

**Implementation Strategy:**
1. Check for `__dirname` (CommonJS)
2. Check for `import.meta.dirname` (Node 20.11.0+)
3. Use `fileURLToPath(new URL('.', import.meta.url))` (Node 18+)
4. Throw error if none available

---

### `resolveProjectRoot(): string`

Resolves the project root directory (where `package.json` is located) from any module depth.

**Signature:**
```typescript
export function resolveProjectRoot(): string;
```

**Returns:** Absolute path to the project root directory

**Throws:**
- `Error` if `package.json` cannot be found in any parent directory
- `Error` if filesystem root is reached without finding `package.json`

**Performance:** < 5ms (depends on directory depth, typically 3-5 levels)

**Example:**
```typescript
import { resolveProjectRoot } from '@artk/core/compat';

const projectRoot = resolveProjectRoot();
// /Users/user/my-project

const configPath = path.join(projectRoot, 'artk.config.yml');
```

**Implementation Strategy:**
1. Start from `getDirname()`
2. Walk up directories checking for `package.json`
3. Return directory when `package.json` found
4. Throw if filesystem root reached

---

### `dynamicImport<T>(specifier: string): Promise<T>`

Dynamically imports a module, abstracting `require()` (CommonJS) vs `import()` (ESM).

**Signature:**
```typescript
export function dynamicImport<T = any>(specifier: string): Promise<T>;
```

**Parameters:**
- `specifier` - Module specifier (e.g., `'./config'`, `'@artk/core'`, `'yaml'`)

**Returns:** Promise resolving to the loaded module

**Throws:**
- `Error` if module cannot be loaded
- `Error` if specifier is invalid

**Performance:** Depends on module load time (typically < 10ms for already-loaded modules)

**Example:**
```typescript
import { dynamicImport } from '@artk/core/compat';

// Works in both CommonJS and ESM
const config = await dynamicImport<Config>('./config');
const yaml = await dynamicImport('yaml');
```

**Implementation Strategy:**
1. Try `import()` (available in both ESM and CommonJS Node 18+)
2. Fallback to `require()` if `import()` fails (CommonJS only)
3. Return Promise for consistent async interface

**Note:** Prefer static imports when possible. Use `dynamicImport()` only for:
- Conditional imports based on environment
- Lazy loading for performance
- Importing ESM modules from CommonJS context (with limitations)

---

### `getModuleSystem(): 'commonjs' | 'esm' | 'unknown'`

Detects the current runtime module system.

**Signature:**
```typescript
export function getModuleSystem(): 'commonjs' | 'esm' | 'unknown';
```

**Returns:**
- `'commonjs'` - Running in CommonJS context
- `'esm'` - Running in ESM context
- `'unknown'` - Cannot determine (rare edge case)

**Performance:** < 1μs (cached after first call)

**Example:**
```typescript
import { getModuleSystem } from '@artk/core/compat';

const moduleSystem = getModuleSystem();

if (moduleSystem === 'esm') {
  // ESM-specific behavior
}
```

**Implementation Strategy:**
1. Check for `__dirname` → return 'commonjs'
2. Check for `import.meta` → return 'esm'
3. Return 'unknown' if neither

**Caching:** Result is cached in module-level variable for performance.

---

### `isESM(): boolean`

Checks if code is running in ESM context. Convenience wrapper around `getModuleSystem()`.

**Signature:**
```typescript
export function isESM(): boolean;
```

**Returns:** `true` if ESM, `false` otherwise

**Performance:** < 1μs (uses cached `getModuleSystem()` result)

**Example:**
```typescript
import { isESM } from '@artk/core/compat';

if (isESM()) {
  console.log('Running in ESM mode');
} else {
  console.log('Running in CommonJS mode');
}
```

**Implementation:**
```typescript
export const isESM = (): boolean => getModuleSystem() === 'esm';
```

---

## Error Handling

All functions throw descriptive errors with actionable messages:

```typescript
// getDirname() in unsupported environment
throw new Error(
  'Cannot determine directory name in this environment. ' +
  'Expected __dirname (CommonJS) or import.meta (ESM) to be available.'
);

// resolveProjectRoot() when package.json not found
throw new Error(
  `Cannot find project root: package.json not found in any parent directory of ${startDir}`
);

// dynamicImport() when module not found
throw new Error(
  `Cannot load module '${specifier}': ${originalError.message}`
);
```

---

## Type Definitions

```typescript
/**
 * Compatibility layer for Node.js module systems
 * @module @artk/core/compat
 */

/**
 * Module system identifier
 */
export type ModuleSystem = 'commonjs' | 'esm' | 'unknown';

/**
 * Returns the current directory path
 */
export function getDirname(): string;

/**
 * Resolves the project root directory
 */
export function resolveProjectRoot(): string;

/**
 * Dynamically imports a module
 */
export function dynamicImport<T = any>(specifier: string): Promise<T>;

/**
 * Detects the current runtime module system
 */
export function getModuleSystem(): ModuleSystem;

/**
 * Checks if code is running in ESM context
 */
export function isESM(): boolean;
```

---

## Usage Guidelines

### DO:
- ✅ Use `getDirname()` instead of `__dirname` or `import.meta.url`
- ✅ Use `resolveProjectRoot()` instead of `path.resolve(__dirname, '../../../..')`
- ✅ Use `dynamicImport()` for conditional/lazy loading
- ✅ Cache `getModuleSystem()` result if checking multiple times
- ✅ Handle errors with try-catch blocks

### DON'T:
- ❌ Use `__dirname` directly in shared code
- ❌ Use `import.meta.url` directly in shared code
- ❌ Use `dynamicImport()` for static imports (use `import` statement)
- ❌ Assume `getModuleSystem()` will never return 'unknown'
- ❌ Catch and ignore errors silently

---

## Performance Benchmarks

| Function | CommonJS | ESM (Node 20.11.0+) | ESM (Node 18-20.10) |
|----------|----------|---------------------|---------------------|
| `getDirname()` | < 10μs | < 5μs | < 20μs |
| `resolveProjectRoot()` | < 5ms | < 5ms | < 5ms |
| `dynamicImport()` | ~10ms | ~10ms | ~10ms |
| `getModuleSystem()` | < 1μs | < 1μs | < 1μs |
| `isESM()` | < 1μs | < 1μs | < 1μs |

**Total overhead**: < 5% vs native calls (meets SC-007 success criterion)

---

## Compatibility Matrix

| Node Version | CommonJS | ESM | Notes |
|--------------|----------|-----|-------|
| 18.0.0 - 18.11.x | ✅ | ✅ | Uses `fileURLToPath` conversion |
| 18.12.0 - 20.10.x | ✅ | ✅ | Uses `fileURLToPath` conversion |
| 20.11.0+ | ✅ | ✅ | Uses `import.meta.dirname` (fastest) |
| < 18.0.0 | ❌ | ❌ | Not supported (FR-009) |

---

## Testing Strategy

Each function MUST be tested in both CommonJS and ESM environments:

```typescript
describe('@artk/core/compat', () => {
  describe('getDirname()', () => {
    it('should return absolute path in CommonJS', () => {
      // Test in CommonJS environment
    });

    it('should return absolute path in ESM', () => {
      // Test in ESM environment
    });

    it('should throw error in unsupported environment', () => {
      // Mock environment where neither __dirname nor import.meta exist
    });
  });

  // Similar tests for other functions
});
```

**Test Coverage Target**: > 95% line coverage for all functions

---

## Changelog

### v1.0.0 (2026-01-13)
- Initial release
- Functions: `getDirname`, `resolveProjectRoot`, `dynamicImport`, `getModuleSystem`, `isESM`
- Zero external dependencies
- Support for Node 18.0.0+
