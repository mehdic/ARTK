# ARTK Naming Conventions

**Version:** 1.0.0
**Last Updated:** 2026-01-23

## Overview

This document defines the naming conventions used throughout the ARTK codebase to ensure consistency and maintainability.

## TypeScript Code Conventions

### Variables and Properties

**Convention:** `camelCase`

```typescript
// ✅ Correct
const minConfidence = 0.7;
const llkbGlossary = new Map();
const testFilePath = './tests/login.spec.ts';

// ❌ Incorrect
const min_confidence = 0.7;      // snake_case
const llkb_glossary = new Map();  // snake_case
const TestFilePath = './...';     // PascalCase
```

### Types and Interfaces

**Convention:** `PascalCase`

```typescript
// ✅ Correct
interface UpdateTestOptions {
  testPath: string;
  dryRun?: boolean;
}

type LLKBCategory = 'ui-interaction' | 'api' | 'data';

// ❌ Incorrect
interface updateTestOptions { }  // camelCase
type llkbCategory = '...';        // camelCase
```

### Functions and Methods

**Convention:** `camelCase`

```typescript
// ✅ Correct
export function runHealthCheck(): HealthCheckResult { }
export async function exportForAutogen(config: Config): Promise<Result> { }

// ❌ Incorrect
export function RunHealthCheck() { }  // PascalCase
export function run_health_check() { } // snake_case
```

### Constants

**Convention:** `SCREAMING_SNAKE_CASE` for true constants, `camelCase` for configuration values

```typescript
// ✅ Correct
const DEFAULT_LLKB_ROOT = '.artk/llkb';
const TABLE_COLUMN_WIDTH = 80;

const minConfidence = 0.7;  // Configuration value (can change)

// ❌ Incorrect
const default_llkb_root = '.artk/llkb';  // snake_case
const tableColumnWidth = 80;             // camelCase for constant
```

### File Names

**Convention:** `kebab-case.ts` for multi-word files, `lowercase.ts` for single words

```typescript
// ✅ Correct
adapter-types.ts
adapter-transforms.ts
cli.ts
types.ts

// ❌ Incorrect
adapterTypes.ts         // camelCase
adapter_types.ts        // snake_case
AdapterTypes.ts         // PascalCase
```

## CLI Argument Conventions

### Command Names

**Convention:** `kebab-case`

```bash
# ✅ Correct
artk-llkb check-updates
artk-llkb update-test
artk-llkb update-tests

# ❌ Incorrect
artk-llkb checkUpdates   # camelCase
artk-llkb check_updates  # snake_case
```

### Flag Names

**Convention:** `kebab-case`

```bash
# ✅ Correct
--min-confidence 0.7
--tests-dir ./tests
--llkb-root ./llkb
--dry-run

# ❌ Incorrect
--minConfidence 0.7      # camelCase
--min_confidence 0.7     # snake_case
--testsDir ./tests       # camelCase
```

### Boolean Flags

**Convention:** Use positive form, support `--no-` prefix for negation

```bash
# ✅ Correct
--dry-run
--no-dry-run
--generate-glossary
--no-generate-glossary

# ❌ Incorrect
--skip-write             # Negative form
--dont-generate-glossary # Negative form with don't
```

## YAML Configuration Conventions

### Keys

**Convention:** `camelCase` (follows JavaScript/TypeScript object style)

```yaml
# ✅ Correct
minConfidence: 0.7
llkbRoot: ./llkb
includeCategories:
  - ui-interaction
  - api

# ❌ Incorrect
min_confidence: 0.7      # snake_case
llkb-root: ./llkb        # kebab-case
```

### Exception: Nested Configuration Keys

When a key represents a CLI-style option, use `kebab-case`:

```yaml
# ✅ Correct
browsers:
  enabled:
    - chromium
  channel: msedge
  strategy: prefer-system

additionalPatterns:
  - name: "llkb-ag-grid-edit-cell"
```

## JSON Configuration Conventions

### Keys

**Convention:** `camelCase` (aligns with TypeScript)

```json
{
  "minConfidence": 0.7,
  "llkbRoot": "./llkb",
  "includeCategories": ["ui-interaction"]
}
```

## Comments and Documentation Conventions

### Code Comments

**Convention:** Match the style of the code being commented

```typescript
// ✅ Correct
// Minimum confidence threshold for LLKB export
const minConfidence = 0.7;

// Update test file with current LLKB version
function updateTestLlkbVersion(content: string, version: string): string { }

// ❌ Incorrect
// minimum_confidence threshold for LLKB export (snake_case in comment)
const minConfidence = 0.7;
```

### JSDoc

**Convention:** Use full sentences, match code style for identifiers

```typescript
/**
 * Export LLKB knowledge for AutoGen consumption.
 *
 * Generates configuration and glossary files that AutoGen can use
 * to enhance test generation with learned patterns and components.
 *
 * @param options - Export options with minConfidence and outputDir
 * @returns Export result with paths and statistics
 */
export async function runExportForAutogen(
  options: AutogenExportOptions
): Promise<LLKBAdapterResult> { }
```

## Naming Pattern Summary

| Context | Convention | Example |
|---------|------------|---------|
| TypeScript variables | `camelCase` | `minConfidence`, `llkbGlossary` |
| TypeScript types/interfaces | `PascalCase` | `UpdateTestOptions`, `LLKBCategory` |
| TypeScript functions | `camelCase` | `runHealthCheck`, `exportForAutogen` |
| TypeScript constants | `SCREAMING_SNAKE_CASE` | `DEFAULT_LLKB_ROOT` |
| TypeScript files | `kebab-case.ts` | `adapter-types.ts` |
| CLI commands | `kebab-case` | `check-updates`, `update-test` |
| CLI flags | `kebab-case` | `--min-confidence`, `--tests-dir` |
| YAML keys | `camelCase` | `minConfidence`, `outputDir` |
| JSON keys | `camelCase` | `"minConfidence"`, `"outputDir"` |

## Migration Notes

### Existing Code

When updating existing code to follow these conventions:

1. **TypeScript**: Update property names to `camelCase` in a single commit
2. **CLI**: Maintain backward compatibility with aliases when renaming flags
3. **YAML**: Add migration script to convert old `snake_case` keys to `camelCase`
4. **Documentation**: Update all examples to use new conventions

### Breaking Changes

CLI flag changes should:
- Announce deprecation 1 version before removal
- Support both old and new forms during deprecation period
- Provide migration guide with find-and-replace commands

Example:
```bash
# Deprecated (v1.0 - v1.2)
--tests_dir ./tests   # Will be removed in v2.0

# New (v1.0+)
--tests-dir ./tests   # Preferred form
```

## Rationale

### Why camelCase for TypeScript?

- Standard JavaScript/TypeScript convention
- Consistent with most npm packages
- Natural for JavaScript objects and JSON serialization

### Why kebab-case for CLI?

- POSIX/GNU long option standard
- More readable in command-line context
- Prevents confusion with environment variables (SCREAMING_SNAKE_CASE)

### Why camelCase for YAML?

- YAML configs map directly to TypeScript objects
- Avoids transformation overhead
- Easier to copy-paste from code to config

## Examples

### Good Example: Consistent Naming

```typescript
// TypeScript code
export interface UpdateTestOptions {
  testPath: string;           // camelCase property
  minConfidence?: number;     // camelCase property
  dryRun?: boolean;
}

// CLI usage
// artk-llkb update-test --test-path ./login.spec.ts --min-confidence 0.7 --dry-run

// YAML config
// updateTest:
//   testPath: ./login.spec.ts
//   minConfidence: 0.7
//   dryRun: true
```

### Bad Example: Mixed Conventions

```typescript
// ❌ Inconsistent
export interface UpdateTestOptions {
  test_path: string;          // snake_case (wrong)
  MinConfidence?: number;     // PascalCase (wrong)
  'dry-run'?: boolean;        // kebab-case (wrong)
}
```

## References

- [TypeScript Coding Guidelines](https://github.com/Microsoft/TypeScript/wiki/Coding-guidelines)
- [POSIX Utility Conventions](https://pubs.opengroup.org/onlinepubs/9699919799/basedefs/V1_chap12.html)
- [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)

## Questions?

For questions or exceptions to these conventions, please:
1. Check if there's existing precedent in the codebase
2. Consult with the team before introducing new patterns
3. Document exceptions in this file with rationale
