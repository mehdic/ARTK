# Data Model: Foundation Module System Compatibility

**Feature**: 001-foundation-compatibility
**Date**: 2026-01-13
**Phase**: 1 (Data Model & Contracts)

## Overview

This document defines the data entities used for environment detection, validation, and compatibility management. All entities are stored as JSON files in the `.artk/` directory for persistence and reuse across commands.

---

## Entity 1: Environment Context

**Purpose**: Represents the detected project environment configuration, cached for reuse across bootstrap and foundation commands.

**Storage**: `.artk/context.json`

**Lifecycle**: Created during first bootstrap run, updated when `--force-detect` flag is used.

### Schema

```typescript
interface EnvironmentContext {
  // Module system detection
  moduleSystem: 'commonjs' | 'esm';

  // Node.js version information
  nodeVersion: string;  // Semantic version (e.g., "18.12.1")
  nodeVersionParsed: {
    major: number;
    minor: number;
    patch: number;
  };

  // TypeScript configuration
  tsModule: string | null;  // From tsconfig.json "module" field (e.g., "commonjs", "esnext")

  // Environment capabilities
  supportsImportMeta: boolean;  // true if Node 18+ and ESM
  supportsBuiltinDirname: boolean;  // true if Node 20.11.0+ (import.meta.dirname)

  // Template selection
  templateVariant: 'commonjs' | 'esm';  // Which template set was used for generation
  templateSource: 'bundled' | 'local-override';  // Where templates came from

  // Detection metadata
  detectionTimestamp: string;  // ISO 8601 timestamp
  detectionConfidence: 'high' | 'medium' | 'low';  // Based on signal consistency
  detectionMethod: 'package.json' | 'tsconfig.json' | 'fallback';  // Which method determined result

  // Warnings and conflicts
  warnings: string[];  // e.g., ["package.json and tsconfig.json have conflicting module settings"]
}
```

### Validation Rules

1. **moduleSystem** MUST be either 'commonjs' or 'esm'
2. **nodeVersion** MUST match semver format: `/^\d+\.\d+\.\d+$/`
3. **nodeVersionParsed.major** MUST be >= 18 (FR-009)
4. **templateVariant** MUST match moduleSystem unless explicitly overridden
5. **detectionTimestamp** MUST be valid ISO 8601 format
6. **detectionConfidence**:
   - 'high': package.json and tsconfig.json agree, or only one present
   - 'medium': package.json and tsconfig.json conflict, but clear precedence rule applied
   - 'low': fallback used, or detection timeout occurred

### State Transitions

```
[No context.json]
    ↓ bootstrap (first run)
[Context created with detectionTimestamp]
    ↓ subsequent commands
[Context reused (cached)]
    ↓ bootstrap --force-detect
[Context regenerated with new detectionTimestamp]
```

### Example

```json
{
  "moduleSystem": "commonjs",
  "nodeVersion": "18.12.1",
  "nodeVersionParsed": {
    "major": 18,
    "minor": 12,
    "patch": 1
  },
  "tsModule": "commonjs",
  "supportsImportMeta": false,
  "supportsBuiltinDirname": false,
  "templateVariant": "commonjs",
  "templateSource": "bundled",
  "detectionTimestamp": "2026-01-13T15:30:00.000Z",
  "detectionConfidence": "high",
  "detectionMethod": "package.json",
  "warnings": []
}
```

---

## Entity 2: Validation Result

**Purpose**: Records the outcome of foundation module validation, persisted for audit trail and debugging.

**Storage**: `.artk/validation-results.json`

**Lifecycle**: Appended to (array of results) after each validation run. Preserved during rollback (FR-034).

### Schema

```typescript
interface ValidationResult {
  // Execution metadata
  timestamp: string;  // ISO 8601 timestamp when validation ran
  environmentContext: string;  // Hash or reference to EnvironmentContext used
  executionTime: number;  // Milliseconds taken to validate

  // Overall status
  status: 'passed' | 'failed' | 'warnings';

  // Rule execution details
  rules: ValidationRuleResult[];

  // Issues found
  errors: ValidationIssue[];  // Critical issues that must be fixed
  warnings: ValidationIssue[];  // Non-critical issues for developer awareness

  // Files validated
  validatedFiles: string[];  // List of file paths checked

  // Rollback information
  rollbackPerformed: boolean;  // true if automatic rollback triggered (FR-033)
  rollbackSuccess: boolean | null;  // null if no rollback, true/false otherwise
}

interface ValidationRuleResult {
  ruleId: string;  // e.g., "import-meta-usage", "dirname-usage"
  pass: boolean;
  affectedFiles: string[];
  message: string;
}

interface ValidationIssue {
  file: string;  // Absolute path to file
  line: number | null;  // Line number (null if not applicable)
  column: number | null;  // Column number (null if not available)
  severity: 'error' | 'warning';
  ruleId: string;
  message: string;
  suggestedFix: string | null;  // Human-readable suggestion (FR-027)
}
```

### Validation Rules

1. **status** MUST be 'passed' if errors array is empty
2. **status** MUST be 'failed' if errors array has any items
3. **status** MUST be 'warnings' if errors array is empty but warnings array has items
4. **executionTime** MUST be <= 10000ms (FR-029: 10 second timeout)
5. **rollbackPerformed** MUST be true if status is 'failed' (FR-033)
6. **timestamp** MUST be valid ISO 8601 format

### State Transitions

```
[Validation starts]
    ↓ rules execute
[ValidationResult created]
    ↓ if status === 'failed'
[Rollback triggered, rollbackPerformed = true]
    ↓ always
[Result appended to validation-results.json]
```

### Example

```json
{
  "timestamp": "2026-01-13T15:35:00.000Z",
  "environmentContext": "commonjs-node-18.12.1",
  "executionTime": 245,
  "status": "failed",
  "rules": [
    {
      "ruleId": "import-meta-usage",
      "pass": false,
      "affectedFiles": ["artk-e2e/src/modules/foundation/auth/login.ts"],
      "message": "import.meta usage detected in CommonJS environment"
    },
    {
      "ruleId": "import-paths",
      "pass": true,
      "affectedFiles": [],
      "message": "All import paths resolved correctly"
    }
  ],
  "errors": [
    {
      "file": "/Users/user/project/artk-e2e/src/modules/foundation/auth/login.ts",
      "line": 5,
      "column": 15,
      "severity": "error",
      "ruleId": "import-meta-usage",
      "message": "import.meta.url is not available in CommonJS environments",
      "suggestedFix": "Replace with getDirname() from @artk/core/compat"
    }
  ],
  "warnings": [],
  "validatedFiles": [
    "artk-e2e/src/modules/foundation/auth/login.ts",
    "artk-e2e/src/modules/foundation/config/env.ts",
    "artk-e2e/src/modules/foundation/navigation/nav.ts"
  ],
  "rollbackPerformed": true,
  "rollbackSuccess": true
}
```

---

## Entity 3: Compatibility Shim API

**Purpose**: Runtime abstraction layer for environment-specific APIs. Not persisted (pure functions), but defines the contract for compatibility layer.

**Storage**: N/A (exported functions from `@artk/core/compat`)

**Lifecycle**: Imported and called at runtime by generated foundation modules.

### Schema

```typescript
/**
 * Compatibility layer for Node.js module systems
 * @module @artk/core/compat
 */

/**
 * Returns the current directory path, abstracting __dirname (CJS) vs import.meta.url (ESM)
 * @throws {Error} If environment cannot be determined
 * @returns {string} Absolute path to current directory
 */
export function getDirname(): string;

/**
 * Resolves the project root directory from any foundation module depth
 * @throws {Error} If project root cannot be determined
 * @returns {string} Absolute path to project root (where package.json is located)
 */
export function resolveProjectRoot(): string;

/**
 * Dynamically imports a module, abstracting require() (CJS) vs import() (ESM)
 * @param {string} specifier - Module specifier (e.g., './config', '@artk/core')
 * @throws {Error} If module cannot be loaded
 * @returns {Promise<any>} Loaded module
 */
export function dynamicImport<T = any>(specifier: string): Promise<T>;

/**
 * Detects the current runtime module system
 * @returns {'commonjs' | 'esm' | 'unknown'} Module system identifier
 */
export function getModuleSystem(): 'commonjs' | 'esm' | 'unknown';

/**
 * Checks if code is running in ESM context
 * @returns {boolean} true if ESM, false otherwise
 */
export function isESM(): boolean;
```

### Validation Rules

1. **getDirname()** MUST return absolute path (starts with `/` on Unix or drive letter on Windows)
2. **getDirname()** MUST throw Error with clear message if environment indeterminate
3. **resolveProjectRoot()** MUST return path containing `package.json`
4. **dynamicImport()** MUST return Promise (async operation)
5. **getModuleSystem()** MUST return one of 3 enum values, never null/undefined
6. **isESM()** MUST return boolean, derived from getModuleSystem()

### Relationships

- Used by: Generated foundation modules (auth, config, navigation)
- Depends on: Node.js built-ins (`fs`, `path`, `url`)
- Performance: All functions MUST complete in < 10ms (< 5% overhead target)

### Example Usage

```typescript
// Generated foundation module using compat layer
import { getDirname, resolveProjectRoot } from '@artk/core/compat';

const __dirname = getDirname(); // Works in both CJS and ESM
const projectRoot = resolveProjectRoot();
const configPath = path.join(projectRoot, 'artk.config.yml');
```

---

## Entity Relationships

```
EnvironmentContext (1)
    ↓ references
ValidationResult (many)
    ↓ validates
Generated Foundation Modules (many)
    ↓ imports
Compatibility Shim API (singleton)
```

**Cardinality**:
- 1 EnvironmentContext per project
- Many ValidationResults per EnvironmentContext (one per validation run)
- Many Generated Modules per EnvironmentContext (auth, config, navigation, etc.)
- 1 Compatibility Shim API (stateless, shared by all modules)

**Dependencies**:
- ValidationResult.environmentContext references EnvironmentContext via hash or moduleSystem+nodeVersion string
- Generated modules import Compatibility Shim functions
- Compatibility Shim functions use EnvironmentContext indirectly (via runtime detection)

---

## Persistence Strategy

| Entity | Storage | Format | Mutability | Backup |
|--------|---------|--------|-----------|--------|
| EnvironmentContext | `.artk/context.json` | JSON | Updated on `--force-detect` | N/A (regenerable) |
| ValidationResult | `.artk/validation-results.json` | JSON array | Append-only | Preserved during rollback |
| Compatibility Shim | `@artk/core/compat` | TypeScript code | Immutable (versioned with package) | Git |

**Concurrency**: Single-user tool, no concurrent access concerns. File writes are atomic (write-to-temp-then-rename pattern).

---

## Schema Versioning

**Version**: 1.0.0 (initial)

**Migration Strategy**: If schema changes in future versions:
1. Add `schemaVersion` field to each entity
2. Implement migration function that upgrades old schemas
3. Run migration automatically on first detection of old version
4. Preserve unknown fields for forward compatibility

**Backward Compatibility**: New fields MUST be optional with sensible defaults to support older consumers.
