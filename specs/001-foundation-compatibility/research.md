# Research: Foundation Module System Compatibility

**Feature**: 001-foundation-compatibility
**Date**: 2026-01-13
**Phase**: 0 (Research & Design Decisions)

## Overview

This document consolidates research findings for implementing automatic environment detection and cross-platform compatibility for ARTK foundation module generation. The research addresses 6 key technical decisions required for the implementation.

---

## 1. Node.js Module System Detection (Runtime)

### Decision

Use multi-signal detection pattern with typeof checks for built-in globals:

```typescript
export function getModuleSystem(): 'commonjs' | 'esm' | 'unknown' {
  if (typeof __dirname !== 'undefined') return 'commonjs';
  if (typeof import.meta !== 'undefined' && import.meta.url) return 'esm';
  return 'unknown';
}
```

### Rationale

- **Zero dependencies**: Uses only built-in globals
- **Fast**: < 1ms detection time
- **Reliable**: `__dirname` and `import.meta` are fundamental to their respective module systems
- **Handles hybrids**: Returns 'unknown' for edge cases, allowing fallback logic

### Alternatives Considered

1. **Check file extension**: `.mjs` (ESM) vs `.cjs` (CommonJS) vs `.js` (depends on package.json)
   - Rejected: Doesn't work for runtime detection after compilation

2. **Parse package.json**: Check "type" field
   - Rejected: Not available at runtime, requires fs operations

3. **Use `module.createRequire`**: Check if available (ESM only)
   - Rejected: Too specific, doesn't handle all cases

### Implementation Notes

- Place check in compatibility layer (`@artk/core/compat`)
- Cache result for performance (module system doesn't change during execution)
- Use result to select appropriate implementation (e.g., `__dirname` vs `import.meta.url`)

---

## 2. Bootstrap Environment Detection

### Decision

Parse `package.json` + `tsconfig.json` using built-in `fs` + `strip-json-comments` for JSON-with-comments:

```typescript
import fs from 'fs';
import stripJsonComments from 'strip-json-comments';

function detectModuleSystem(projectRoot: string): 'commonjs' | 'esm' {
  const pkgPath = path.join(projectRoot, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  // package.json "type" field is authoritative
  if (pkg.type === 'module') return 'esm';

  return 'commonjs'; // Default per Node.js spec
}

function detectTypeScriptModule(projectRoot: string): string | null {
  const tsconfigPath = path.join(projectRoot, 'tsconfig.json');
  if (!fs.existsSync(tsconfigPath)) return null;

  const content = fs.readFileSync(tsconfigPath, 'utf8');
  const tsconfig = JSON.parse(stripJsonComments(content));

  return tsconfig?.compilerOptions?.module || null;
}
```

### Rationale

- **Minimal dependencies**: Only `strip-json-comments` (~2KB) needed for tsconfig.json
- **Authoritative**: package.json "type" field is the Node.js standard
- **Fast**: < 10ms for both files
- **Handles comments**: tsconfig.json commonly has comments

### Alternatives Considered

1. **Use `ts-node` or TypeScript API**:
   - Rejected: Heavyweight (20MB+), overkill for reading one field

2. **Regex-based comment stripping**:
   - Rejected: Fragile, doesn't handle all comment styles correctly

3. **JSON5 parser**:
   - Rejected: tsconfig.json isn't JSON5, just JSON-with-comments

### Implementation Notes

- Single dependency: `strip-json-comments@^5.0.3` (used by VS Code)
- Handle missing files gracefully (tsconfig.json is optional)
- Store result in `.artk/context.json` for caching (FR-005, FR-006)
- Prioritize TypeScript config for `.ts` files (Edge Case from spec)

---

## 3. Node.js Version Detection

### Decision

Parse `process.version` directly for simple checks; use `semver` package only if complex range checks needed:

```typescript
function getNodeVersion(): { major: number; minor: number; patch: number } {
  const match = process.version.match(/^v(\d+)\.(\d+)\.(\d+)/);
  if (!match) throw new Error(`Invalid Node version: ${process.version}`);

  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10)
  };
}

function supportsESM(nodeVersion: ReturnType<typeof getNodeVersion>): boolean {
  return nodeVersion.major >= 18; // Basic ESM support
}

function supportsFullESM(nodeVersion: ReturnType<typeof getNodeVersion>): boolean {
  return nodeVersion.major >= 20; // Full ESM support (FR-004)
}
```

### Rationale

- **Zero dependencies**: Manual parsing sufficient for version checks
- **Reliable**: `process.version` always available
- **Performance**: < 1ms
- **Meets requirements**: FR-004 only needs major version check (18.0.0+ vs 20.0.0+)

### Alternatives Considered

1. **semver package**:
   - Use if: Need complex range checks like `">=18.12.1 <19.0.0 || >=20.0.0"`
   - Current need: Simple major version checks, don't add dependency yet

2. **process.versions.node**:
   - Rejected: Returns string, still needs parsing

### Implementation Notes

- Store parsed version in `.artk/context.json` (FR-005)
- Fail fast if Node < 18.0.0 (FR-009)
- Use major version for ESM capability determination (FR-004)

---

## 4. TypeScript Config Parsing

### Decision

Use `strip-json-comments` package to safely parse tsconfig.json:

```typescript
import stripJsonComments from 'strip-json-comments';

function parseTsConfig(tsconfigPath: string): TsConfig | null {
  if (!fs.existsSync(tsconfigPath)) return null;

  try {
    const content = fs.readFileSync(tsconfigPath, 'utf8');
    const cleaned = stripJsonComments(content);
    return JSON.parse(cleaned);
  } catch (error) {
    // Log warning and continue with defaults
    console.warn(`Failed to parse tsconfig.json: ${error.message}`);
    return null;
  }
}
```

### Rationale

- **Industry standard**: Used by VS Code, TypeScript Language Service
- **Lightweight**: 2KB minified
- **Battle-tested**: 3166+ npm dependents
- **Handles all comment styles**: Single-line `//` and multi-line `/* */`

### Alternatives Considered

1. **TypeScript Compiler API (`ts.parseJsonConfigFileContent`)**:
   - Rejected: 20MB+ dependency, slow initialization

2. **jsonc-parser package**:
   - Rejected: Heavier (10KB+), designed for VS Code extensions specifically

3. **Regex-based stripping**:
   - Rejected: Edge cases with strings containing `//` or `/*`

### Implementation Notes

- Dependency: `strip-json-comments@^5.0.3`
- Handle parse failures gracefully (warn + continue with defaults)
- Don't resolve `extends` field (out of scope, adds complexity)
- Extract only `compilerOptions.module` field (FR-003)

---

## 5. Cross-Platform Path Resolution

### Decision

Implement `getDirname()` helper with Node version detection and fallback chain:

```typescript
import { fileURLToPath } from 'url';

export function getDirname(): string {
  // CommonJS environment
  if (typeof __dirname !== 'undefined') {
    return __dirname;
  }

  // ESM environment with Node 20.11.0+ built-in
  if (typeof import.meta !== 'undefined' && 'dirname' in import.meta) {
    return import.meta.dirname as string;
  }

  // ESM environment with manual conversion (Node 18+)
  if (typeof import.meta !== 'undefined' && import.meta.url) {
    return fileURLToPath(new URL('.', import.meta.url));
  }

  throw new Error('Cannot determine directory name in this environment');
}
```

### Rationale

- **Node 20.11.0+ optimization**: Use built-in `import.meta.dirname` when available
- **Node 18+ fallback**: Manual conversion using `fileURLToPath` + `URL`
- **CommonJS support**: Direct `__dirname` usage
- **Zero external dependencies**: Uses only Node.js built-ins (FR-018)

### Alternatives Considered

1. **Always use `fileURLToPath` conversion**:
   - Rejected: Slower than built-in `import.meta.dirname`, unnecessary conversion

2. **Separate functions for each environment**:
   - Rejected: Requires caller to know environment, defeats abstraction purpose

3. **Use `path.dirname(fileURLToPath(import.meta.url))`**:
   - Rejected: More operations than `new URL('.', import.meta.url)` pattern

### Implementation Notes

- Place in `@artk/core/compat/dirname.ts`
- Also provide `resolveProjectRoot()` using similar pattern (FR-013)
- Unit test in both CommonJS and ESM environments (FR-019)
- Performance: < 1μs in CommonJS, < 10μs in ESM

---

## 6. Template Bundling & Resolution

### Decision

Bundle templates in `@artk/core` package using package.json `files` array, resolve with fallback hierarchy:

**Package structure:**
```
@artk/core/
├── package.json       # "files": ["dist", "templates"]
├── templates/
│   ├── commonjs/
│   │   ├── auth/
│   │   ├── config/
│   │   └── navigation/
│   ├── esm/
│   │   ├── auth/
│   │   ├── config/
│   │   └── navigation/
│   └── shared/
│       └── types/
```

**Resolution logic:**
```typescript
function resolveTemplate(moduleName: string, variant: 'commonjs' | 'esm'): string {
  // 1. Check local override
  const localPath = path.join(process.cwd(), 'artk-e2e/templates', variant, moduleName);
  if (fs.existsSync(localPath)) {
    return localPath;
  }

  // 2. Fall back to bundled template
  const bundledPath = path.join(__dirname, '../templates', variant, moduleName);
  if (fs.existsSync(bundledPath)) {
    return bundledPath;
  }

  throw new Error(`Template not found: ${variant}/${moduleName}`);
}
```

### Rationale

- **Simple distribution**: Templates included in npm package via "files" array
- **Local customization**: Projects can override in `artk-e2e/templates/` (FR-033)
- **Clear precedence**: Local overrides always win (FR-034)
- **No build step**: Templates are text files, no compilation needed

### Alternatives Considered

1. **Separate `@artk/templates` package**:
   - Rejected: Additional dependency, version sync complexity

2. **Download templates from GitHub**:
   - Rejected: Requires network access, violates Assumption #6

3. **Embed templates as strings in code**:
   - Rejected: Hard to maintain, no syntax highlighting, large bundle size

### Implementation Notes

- Update `package.json` "files" field: `["dist", "templates"]`
- Add package.json "exports" for template access:
  ```json
  "exports": {
    ".": "./dist/index.js",
    "./templates/*": "./templates/*"
  }
  ```
- Validate local override templates before use (Edge Case: incomplete/syntax errors)
- Document template structure in README.md

---

## 7. Static Analysis (Validation Rules)

### Decision

Use lightweight regex for quick filtering, AST-based analysis for accurate validation:

**Quick check (regex):**
```typescript
function hasImportMeta(content: string): boolean {
  return /import\.meta\b/.test(content);
}

function hasDirname(content: string): boolean {
  return /\b__dirname\b/.test(content);
}
```

**Accurate validation (optional AST):**
```typescript
import { Project } from 'ts-morph';

function validateImportMetaUsage(filePath: string): ValidationIssue[] {
  const project = new Project();
  const sourceFile = project.addSourceFileAtPath(filePath);

  const issues: ValidationIssue[] = [];

  sourceFile.forEachDescendant(node => {
    if (Node.isMetaProperty(node) &&
        node.getNameNode().getText() === 'import' &&
        node.getPropertyNode().getText() === 'meta') {
      issues.push({
        file: filePath,
        line: node.getStartLineNumber(),
        message: 'import.meta usage detected in CommonJS environment'
      });
    }
  });

  return issues;
}
```

### Rationale

- **Two-tier approach**: Regex for fast filtering (< 1ms per file), AST for accurate diagnosis
- **Regex sufficient for most cases**: False positives rare (string literal edge cases)
- **AST for validation gate**: FR-022 requires accurate detection with file/line reporting
- **Optional dependency**: `ts-morph` only needed if AST validation is enabled

### Alternatives Considered

1. **Regex only**:
   - Rejected: Can't get accurate line numbers, false positives on string literals

2. **ESLint plugin**:
   - Rejected: Heavy dependency (ESLint + plugins), slow initialization

3. **Babel parser**:
   - Rejected: Doesn't understand TypeScript decorators/syntax well

### Implementation Notes

- Use regex for quick checks in `@artk/core/validation/rules/`
- Optionally add `ts-morph` dependency for validation gate (FR-022 through FR-027)
- Report violations with file path, line number, description (FR-027)
- Performance: < 10ms per file with regex, < 100ms with AST

---

## 8. Rollback Transaction Patterns

### Decision

Use write-to-temp-then-rename pattern with transaction log for rollback:

```typescript
interface Transaction {
  generatedFiles: string[];
  originalFiles: Map<string, string>; // path -> backup path
}

async function generateWithRollback(files: FileToGenerate[]): Promise<void> {
  const transaction: Transaction = {
    generatedFiles: [],
    originalFiles: new Map()
  };

  try {
    for (const file of files) {
      // Backup existing file if present
      if (fs.existsSync(file.path)) {
        const backup = `${file.path}.backup-${Date.now()}`;
        fs.copyFileSync(file.path, backup);
        transaction.originalFiles.set(file.path, backup);
      }

      // Write to temp file
      const tempPath = `${file.path}.tmp-${Date.now()}`;
      fs.writeFileSync(tempPath, file.content);

      // Atomic rename
      fs.renameSync(tempPath, file.path);
      transaction.generatedFiles.push(file.path);
    }

    // Success: cleanup backups
    for (const backup of transaction.originalFiles.values()) {
      fs.unlinkSync(backup);
    }

  } catch (error) {
    // Failure: rollback all changes
    await rollback(transaction);
    throw error;
  }
}

async function rollback(transaction: Transaction): Promise<void> {
  // Remove generated files
  for (const file of transaction.generatedFiles) {
    try {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    } catch (err) {
      console.warn(`Failed to remove ${file} during rollback: ${err.message}`);
    }
  }

  // Restore backups
  for (const [original, backup] of transaction.originalFiles) {
    try {
      if (fs.existsSync(backup)) {
        fs.renameSync(backup, original);
      }
    } catch (err) {
      console.warn(`Failed to restore ${original} during rollback: ${err.message}`);
    }
  }
}
```

### Rationale

- **No external dependencies**: Uses only `fs` built-in (FR-018)
- **Atomic operations**: `fs.renameSync()` is atomic on POSIX, near-atomic on Windows
- **Backup strategy**: Preserves existing files before overwrite
- **Crash-safe**: Temp files prevent partial writes
- **Clear errors**: Lists which files couldn't be rolled back (Edge Case)

### Alternatives Considered

1. **write-file-atomic package**:
   - Rejected: External dependency, `fs.renameSync()` already atomic

2. **SQLite transaction log**:
   - Rejected: Heavyweight, requires database dependency

3. **Git-based rollback**:
   - Rejected: Requires git, not all projects use git

### Implementation Notes

- Track generated files in-memory during generation (FR-032)
- Rollback automatically on validation failure (FR-033)
- Preserve `.artk/validation-results.json` during rollback (FR-034)
- Report rollback status with file list (FR-035)
- Handle rollback failures gracefully (Edge Case: file permissions)

---

## Summary of Decisions

| Decision Area | Choice | Key Dependency | Performance |
|---------------|--------|----------------|-------------|
| Runtime Detection | Multi-signal typeof checks | None | < 1ms |
| Bootstrap Detection | Parse package.json + tsconfig | `strip-json-comments` | < 10ms |
| Node Version | Manual parse of process.version | None | < 1ms |
| TypeScript Config | strip-json-comments | `strip-json-comments` | < 5ms |
| Path Resolution | getDirname() with fallback chain | None | < 10μs |
| Template Bundling | Package files + local overrides | None | < 1ms |
| Static Analysis | Regex + optional AST | Optional: `ts-morph` | < 10ms (regex) |
| Rollback | Write-to-temp-then-rename | None | < 100ms |

**Total Required Dependencies**: 1 (`strip-json-comments@^5.0.3`)
**Optional Dependencies**: 1 (`ts-morph@^21.0.0` for AST validation)

**Total Bootstrap Overhead**: < 100ms (meets performance goal)

---

## Implementation Priority

1. **Phase 0 (This PR)**: Environment detection + compatibility layer
   - `@artk/core/compat/` module
   - `@artk/core/detection/` module
   - Unit tests for both CommonJS and ESM

2. **Phase 1 (Next Sprint)**: Template bundling + resolution
   - Bundle templates in package.json
   - Implement local override resolution
   - Update bootstrap scripts

3. **Phase 2 (Following Sprint)**: Validation engine + rollback
   - `@artk/core/validation/` module
   - Regex-based validation rules
   - Transaction-based rollback

4. **Phase 3 (Optional)**: AST-based validation
   - Add `ts-morph` dependency
   - Implement accurate line-number reporting
   - Performance optimization

---

## References

- Node.js ES Modules documentation: https://nodejs.org/docs/latest/api/esm.html
- TypeScript Module Resolution: https://www.typescriptlang.org/docs/handbook/module-resolution.html
- strip-json-comments package: https://www.npmjs.com/package/strip-json-comments
- Node.js File System API: https://nodejs.org/docs/latest/api/fs.html
- import.meta.dirname proposal: https://github.com/nodejs/node/pull/48740
