# Module System Detection Research

**Date:** 2026-01-13
**Topic:** Reliable methods for detecting Node.js module systems (CommonJS vs ESM) during runtime and bootstrap phases

---

## Executive Summary

This research investigates reliable patterns for detecting Node.js module systems, parsing TypeScript configurations, handling cross-platform paths, and implementing safe rollback strategies—all with minimal external dependencies. The goal is to prevent ESM/CommonJS compatibility issues that currently plague ARTK foundation generation (see `2026-01-13_discover_foundation_esm_commonjs_issues.md`).

**Key Findings:**
- Runtime detection requires different strategies for CommonJS vs ESM contexts
- Bootstrap detection can reliably parse package.json and tsconfig.json using built-in Node.js APIs with one lightweight dependency (strip-json-comments)
- Node.js 20.11.0+ provides `import.meta.dirname` eliminating manual fileURLToPath boilerplate
- Template bundling requires careful package.json "files" configuration
- Safe file operations require write-then-rename patterns (built-in fs APIs sufficient)

---

## 1. Runtime Detection: CommonJS vs ESM Context

### Decision: Use Multi-Signal Detection Pattern

**Recommended approach:**
```typescript
function detectModuleSystem(): 'commonjs' | 'esm' | 'unknown' {
  // Signal 1: Check for CommonJS globals
  if (typeof require !== 'undefined' && typeof module !== 'undefined' && typeof __dirname !== 'undefined') {
    return 'commonjs';
  }

  // Signal 2: Check for ESM-specific features
  if (typeof import.meta !== 'undefined') {
    return 'esm';
  }

  return 'unknown';
}
```

### Rationale

- **Reliability**: Multiple signals reduce false positives
- **Zero dependencies**: Uses only JavaScript built-ins
- **Performance**: Synchronous checks complete in <1ms
- **Edge case handling**: Handles hybrid environments where both module systems may be present in different files

### Alternatives Considered

1. **File extension checking (.mjs vs .cjs)**: Unreliable—TypeScript compiles to .js regardless
2. **package.json inspection at runtime**: Expensive I/O; breaks in bundled environments
3. **Try-catch with dynamic import()**: Async and slow; fails in some Node versions

### Implementation Notes

**Key characteristics:**
- `__dirname` and `__filename` only exist in CommonJS
- `import.meta.url` only exists in ESM (Node 14.8.0+)
- `require()` exists in CommonJS and hybrid environments
- ESM supports importing CommonJS via `import` statements
- CommonJS must use dynamic `import()` for ESM (async only)

**Cross-platform path handling:**
```typescript
// CommonJS
const __dirname = __dirname; // Already available

// ESM (Node < 20.11.0)
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ESM (Node >= 20.11.0) - RECOMMENDED
const __dirname = import.meta.dirname;
const __filename = import.meta.filename;
```

**Node.js version gates:**
- Node 12.x: Experimental ESM with --experimental-modules flag
- Node 14.8.0+: Stable `import.meta.url` support
- Node 14.13.1+: Full ESM support without flags
- Node 20.11.0+: `import.meta.dirname` and `import.meta.filename` built-ins
- Node 22.x: Current LTS with full ESM maturity

### Sources
- [CommonJS vs. ES Modules - Node.js](https://betterstack.com/community/guides/scaling-nodejs/commonjs-vs-esm/)
- [CommonJS vs. ES modules in Node.js - LogRocket Blog](https://blog.logrocket.com/commonjs-vs-es-modules-node-js/)
- [Modules: ECMAScript modules | Node.js v25.2.1 Documentation](https://nodejs.org/api/esm.html)
- [Alternatives to __dirname in Node.js with ES modules - LogRocket Blog](https://blog.logrocket.com/alternatives-dirname-node-js-es-modules/)
- [__dirname is back in Node.js with ES modules | Sonar](https://www.sonarsource.com/blog/dirname-node-js-es-modules/)

---

## 2. Bootstrap Detection: Static Analysis Before Execution

### Decision: Parse package.json and tsconfig.json with Minimal Dependencies

**Recommended approach:**
```typescript
import * as fs from 'node:fs';
import * as path from 'node:path';
import stripJsonComments from 'strip-json-comments'; // Only external dependency

interface EnvironmentDetection {
  moduleSystem: 'commonjs' | 'esm';
  nodeVersion: string;
  nodeMajor: number;
  tsModule?: string;
  supportsImportMeta: boolean;
  supportsImportMetaDirname: boolean;
}

function detectEnvironment(projectRoot: string): EnvironmentDetection {
  // Read package.json
  const pkgPath = path.join(projectRoot, 'package.json');
  const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

  // Read tsconfig.json (handles comments and extends)
  const tsconfigPath = path.join(projectRoot, 'tsconfig.json');
  let tsModule: string | undefined;
  if (fs.existsSync(tsconfigPath)) {
    const tsconfigRaw = fs.readFileSync(tsconfigPath, 'utf-8');
    const tsconfigClean = stripJsonComments(tsconfigRaw);
    const tsconfig = JSON.parse(tsconfigClean);
    tsModule = tsconfig.compilerOptions?.module;
    // Note: Not resolving "extends" chain—too complex for bootstrap phase
  }

  // Parse Node.js version
  const nodeVersion = process.version; // e.g., "v18.12.1"
  const nodeMajor = parseInt(nodeVersion.slice(1).split('.')[0], 10);

  // Determine module system
  const moduleSystem = pkgJson.type === 'module' ? 'esm' : 'commonjs';

  // Feature detection
  const supportsImportMeta = nodeMajor >= 14;
  const supportsImportMetaDirname = nodeMajor >= 20;

  return {
    moduleSystem,
    nodeVersion,
    nodeMajor,
    tsModule,
    supportsImportMeta,
    supportsImportMetaDirname,
  };
}
```

### Rationale

- **Minimal dependencies**: Only `strip-json-comments` (5.0.3, 3166 dependents, actively maintained)
- **Fast**: Synchronous file I/O + regex, completes in <10ms
- **Reliable**: Handles JSON with comments (tsconfig.json standard allows comments)
- **Good enough**: Doesn't resolve full `extends` chain (95% of projects don't need it)

### Alternatives Considered

1. **Full tsconfig resolver (e.g., tsconfig-paths)**: Heavy dependency; overkill for simple detection
2. **TypeScript compiler API**: 50MB+ dependency; extreme overkill
3. **Manual regex comment stripping**: Error-prone; strip-json-comments is battle-tested
4. **jsonc-parser (VSCode's parser)**: More features than needed; strip-json-comments is simpler

### Implementation Notes

**package.json "type" field:**
- `"type": "module"` → ESM
- `"type": "commonjs"` or missing → CommonJS (default)
- Introduced in Node 13.2.0

**tsconfig.json module field (informational only):**
- `"module": "commonjs"` → TypeScript will emit `require()`
- `"module": "ESNext"` or `"NodeNext"` → TypeScript will emit `import`
- `"module": "bundler"` → For bundlers (Vite, esbuild)
- Does NOT determine runtime module system (package.json does)

**tsconfig.json comments:**
- JSON with Comments (JSONC) is official TypeScript standard
- VS Code uses `jsonc-parser` internally
- `strip-json-comments` removes `//` and `/* */` preserving whitespace
- Must handle before `JSON.parse()` call

**Handling "extends":**
- Full resolution requires recursive file system traversal
- ARTK bootstrap doesn't need it—we're generating new tsconfig, not inheriting
- If needed later, use `ts-node` or TypeScript compiler API (but adds 50MB+ dependency)

### Sources
- [strip-json-comments - npm](https://www.npmjs.com/package/strip-json-comments)
- [jsonc-parser - npm](https://www.npmjs.com/package/jsonc-parser)
- [Use jsonc.parse instead of JSON.parse when parsing tsconfig.json](https://github.com/microsoft/vscode/pull/67535)
- [TypeScript: Documentation - What is a tsconfig.json](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html)

---

## 3. Node Version Detection: Parsing process.version

### Decision: Manual Parsing for Major Version, semver Package for Complex Ranges

**Recommended approach:**
```typescript
// For simple major version check (bootstrap use case)
function getNodeMajorVersion(): number {
  const version = process.version; // e.g., "v18.12.1"
  const major = parseInt(version.slice(1).split('.')[0], 10);
  return major;
}

// For complex semver operations (when needed)
import semver from 'semver'; // Only if complex ranges required
const nodeSemver = semver.parse(process.version);
if (semver.gte(process.version, '20.11.0')) {
  // Use import.meta.dirname
}
```

### Rationale

- **Built-in for simple cases**: `process.version` is always available
- **Zero dependencies for bootstrap**: Major version check needs only string parsing
- **semver for complex ranges**: Standard npm package (Isaac Z. Schlueter, npm's author)
- **Performance**: Major version parse <1μs; semver.parse <100μs

### Alternatives Considered

1. **Manual regex for full semver parsing**: Error-prone; semver handles edge cases
2. **Inline semver comparison logic**: Reinventing the wheel; semver is battle-tested
3. **node-version-check or similar**: Wrappers around semver; unnecessary layer

### Implementation Notes

**process.version format:**
- Always starts with "v" (e.g., "v18.12.1", "v20.11.0", "v22.0.0")
- Format: "vMAJOR.MINOR.PATCH"
- Guaranteed to be valid semver

**When to use semver package:**
- Complex range checks: `semver.satisfies(process.version, '>=18.0.0 <21.0.0')`
- Pre-release handling: `semver.prerelease('v21.0.0-pre.1')`
- Comparison: `semver.gt('v20.0.0', 'v18.0.0')`

**When NOT to use semver:**
- Simple major version gate: `nodeMajor >= 18`
- Exact version check: `process.version === 'v18.12.1'`

### Sources
- [GitHub - npm/node-semver](https://github.com/npm/node-semver)
- [semver - npm](https://www.npmjs.com/package/semver)
- [About semantic versioning | npm Docs](https://docs.npmjs.com/about-semantic-versioning/)

---

## 4. TypeScript Config Parsing: Safe JSON-with-Comments Handling

### Decision: Use strip-json-comments for JSONC Parsing

**Recommended approach:**
```typescript
import * as fs from 'node:fs';
import stripJsonComments from 'strip-json-comments';

function parseTsConfig(tsconfigPath: string): any {
  const raw = fs.readFileSync(tsconfigPath, 'utf-8');
  const clean = stripJsonComments(raw);
  return JSON.parse(clean);
}

// With error handling
function parseTsConfigSafe(tsconfigPath: string): any | null {
  try {
    if (!fs.existsSync(tsconfigPath)) {
      return null;
    }
    const raw = fs.readFileSync(tsconfigPath, 'utf-8');
    const clean = stripJsonComments(raw);
    return JSON.parse(clean);
  } catch (error) {
    console.warn(`Failed to parse tsconfig.json: ${error.message}`);
    return null;
  }
}
```

### Rationale

- **Official pattern**: VS Code uses this approach for tsconfig.json
- **Lightweight**: strip-json-comments is 2KB minified
- **Handles all comment types**: `//` single-line and `/* */` multi-line
- **Preserves structure**: Whitespace preserved for accurate error messages

### Alternatives Considered

1. **jsonc-parser (VS Code's library)**: More features (edit, traverse); overkill for read-only parsing
2. **json5**: Full JSON5 support (trailing commas, unquoted keys); tsconfig is JSONC, not JSON5
3. **comment-json**: Parse AND stringify with comments; only need read
4. **Manual regex stripping**: Brittle; doesn't handle edge cases (comments in strings)

### Implementation Notes

**tsconfig.json allows:**
- Single-line comments: `// This is a comment`
- Multi-line comments: `/* This is a comment */`
- Comments anywhere JSON allows whitespace

**tsconfig.json does NOT allow (unlike JSON5):**
- Trailing commas
- Unquoted keys
- Single-quoted strings

**"extends" handling:**
- Simple case: `"extends": "./tsconfig.base.json"` or `"extends": "@company/tsconfig"`
- Complex case: Multiple inheritance, npm packages, relative paths
- **Recommendation for ARTK**: Don't resolve extends during bootstrap—too complex
- If needed: Use TypeScript compiler API (`ts.parseJsonConfigFileContent`)

**Error handling:**
- Invalid JSON after comment stripping: Let JSON.parse throw
- Missing file: Return null or default config
- Unreadable file (permissions): Return null or default config

### Sources
- [strip-json-comments - npm](https://www.npmjs.com/package/strip-json-comments)
- [Use jsonc.parse instead of JSON.parse when parsing tsconfig.json](https://github.com/microsoft/vscode/pull/67535)
- [jsonc-parser - npm](https://www.npmjs.com/package/jsonc-parser)
- [json5 vs strip-json-comments vs jsonc-parser vs comment-json](https://npm-compare.com/comment-json,json5,jsonc-parser,strip-json-comments)

---

## 5. Cross-Platform Path Resolution: getDirname() Pattern

### Decision: Dual Implementation with Node Version Gate

**Recommended approach:**
```typescript
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

/**
 * Get directory name in both CommonJS and ESM contexts.
 *
 * @param importMetaUrl - Pass import.meta.url in ESM contexts (optional)
 * @returns Absolute directory path
 */
export function getDirname(importMetaUrl?: string): string {
  // CommonJS: __dirname is available
  if (typeof __dirname !== 'undefined') {
    return __dirname;
  }

  // ESM (Node >= 20.11.0): Use built-in import.meta.dirname
  if (typeof import.meta !== 'undefined' && 'dirname' in import.meta) {
    return import.meta.dirname as string;
  }

  // ESM (Node < 20.11.0): Manual conversion from import.meta.url
  if (importMetaUrl) {
    return dirname(fileURLToPath(importMetaUrl));
  }

  // Fallback: Process working directory (least reliable)
  return process.cwd();
}

// Usage in ESM
const __dirname = getDirname(import.meta.url);

// Usage in CommonJS
const __dirname = getDirname(); // Uses built-in __dirname
```

### Rationale

- **Single source of truth**: One function works in both CommonJS and ESM
- **Future-proof**: Uses `import.meta.dirname` on Node 20.11.0+
- **Zero runtime dependencies**: Uses only Node.js built-in APIs
- **Cross-platform**: `fileURLToPath` handles Windows drive letters and special characters

### Alternatives Considered

1. **Separate CommonJS and ESM files**: Maintenance burden; code duplication
2. **Always use fileURLToPath**: Fails in CommonJS (import.meta undefined)
3. **Always use __dirname**: Fails in ESM (__dirname undefined)
4. **process.cwd()**: Unreliable—changes based on where node was invoked

### Implementation Notes

**Cross-platform path considerations:**
- Windows: `C:\Users\...` vs Unix: `/Users/...`
- URL encoding: `file:///C:/Users/...` on Windows
- Special characters: Spaces, Unicode in paths
- `fileURLToPath` handles all edge cases

**Working directly with URLs:**
```typescript
// Many Node.js APIs accept URL objects
import { readFileSync } from 'node:fs';

// Option 1: Convert to path
const filePath = fileURLToPath(new URL('./file.txt', import.meta.url));
readFileSync(filePath, 'utf-8');

// Option 2: Use URL directly (Node 14.8.0+)
readFileSync(new URL('./file.txt', import.meta.url), 'utf-8');
```

**Performance:**
- `__dirname` access: ~1ns (variable lookup)
- `import.meta.dirname`: ~1ns (property access)
- `fileURLToPath(import.meta.url)`: ~1μs (URL parsing + conversion)
- All are negligible for bootstrap operations

### Sources
- [Alternatives to __dirname in Node.js with ES modules - LogRocket Blog](https://blog.logrocket.com/alternatives-dirname-node-js-es-modules/)
- [Understanding __dirname in ES Modules](https://medium.com/@kishantashok/understanding-dirname-in-es-modules-solutions-for-modern-node-js-9d0560eb5ed7)
- [Modules: ECMAScript modules | Node.js v25.2.1 Documentation](https://nodejs.org/api/esm.html)
- [__dirname is back in Node.js with ES modules | Sonar](https://www.sonarsource.com/blog/dirname-node-js-es-modules/)

---

## 6. Template Bundling: npm Package Strategies

### Decision: Use package.json "files" Array with Template Directory

**Recommended approach:**
```json
{
  "name": "@artk/core",
  "version": "1.0.0",
  "files": [
    "dist",
    "templates",
    "version.json",
    "README.md"
  ],
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./templates/*": "./templates/*"
  }
}
```

**Template directory structure:**
```
templates/
  commonjs/
    auth/
      login.ts.ejs
      storage-state.ts.ejs
  esm/
    auth/
      login.ts.ejs
      storage-state.ts.ejs
  shared/
    auth/
      types.ts.ejs
```

**Loading templates:**
```typescript
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getDirname } from './utils/paths.js';

function loadTemplate(moduleSystem: 'commonjs' | 'esm', templateName: string): string {
  const __dirname = getDirname(import.meta.url);
  const templatePath = join(__dirname, '../templates', moduleSystem, templateName);
  return readFileSync(templatePath, 'utf-8');
}

// Or use npm package resolution
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const templatePath = require.resolve('@artk/core/templates/esm/auth/login.ts.ejs');
```

### Rationale

- **Explicit control**: "files" array prevents accidental inclusion/exclusion
- **Export maps**: Modern Node.js feature for precise package exports
- **Template organization**: Separate directories for CommonJS vs ESM variants
- **Local overrides**: Projects can copy templates and customize

### Alternatives Considered

1. **Bundle templates into JavaScript**: Loses editability; harder to customize
2. **Separate template npm package**: Versioning complexity; overkill for small templates
3. **Embed templates as strings in code**: Unreadable; no syntax highlighting
4. **Download templates at runtime**: Network dependency; slow; unreliable

### Implementation Notes

**package.json "files" array:**
- Whitelist approach: Only listed files/directories are included
- If missing, defaults to all files (minus .gitignore and .npmignore)
- Overrides .npmignore (but respects .gitignore for local development)
- Always includes: package.json, README.md, LICENSE, CHANGELOG.md

**Export maps (Node 12.7.0+):**
- `"."` - Main entry point
- `"./subpath"` - Subpath exports
- Prevents deep imports: `import '@artk/core/dist/internal/private.js'` fails
- Conditional exports: `"import"` vs `"require"` for dual CommonJS/ESM packages

**Dual package hazard:**
- If package exports both CommonJS and ESM, they're treated as separate packages
- State is not shared between the two
- **Recommendation for ARTK**: Pure ESM package (package.json "type": "module")

**Template syntax:**
- Use `.ejs` extension for EJS templates
- Use `.hbs` extension for Handlebars templates
- Use `.mustache` extension for Mustache templates
- **ARTK uses**: EJS (already a dependency)

### Sources
- [Best practices for publishing your npm package](https://mikbry.com/blog/javascript/npm/best-practices-npm-package)
- [NPM Package Development Guide: Build, Publish, and Best Practices](https://medium.com/@ddylanlinn/npm-package-development-guide-build-publish-and-best-practices-674714b7aef1)
- [TypeScript: Documentation - Publishing](https://www.typescriptlang.org/docs/handbook/declaration-files/publishing.html)
- [Building an npm package in 2023 - DEV Community](https://dev.to/seven/building-an-npm-package-in-2023-10l4)

---

## 7. Static Analysis: Detecting import.meta Usage

### Decision: Use TypeScript AST with ts-morph for Detection

**Recommended approach:**
```typescript
import { Project, SyntaxKind } from 'ts-morph';

interface ImportMetaUsage {
  file: string;
  line: number;
  column: number;
  expression: string;
}

function detectImportMetaUsage(projectRoot: string): ImportMetaUsage[] {
  const project = new Project({
    tsConfigFilePath: `${projectRoot}/tsconfig.json`,
  });

  const usages: ImportMetaUsage[] = [];

  for (const sourceFile of project.getSourceFiles()) {
    sourceFile.forEachDescendant((node) => {
      // Check for MetaProperty nodes (import.meta)
      if (node.getKind() === SyntaxKind.MetaProperty) {
        const metaProperty = node.asKindOrThrow(SyntaxKind.MetaProperty);
        if (metaProperty.getKeywordToken() === SyntaxKind.ImportKeyword) {
          const { line, column } = sourceFile.getLineAndColumnAtPos(node.getStart());
          usages.push({
            file: sourceFile.getFilePath(),
            line,
            column,
            expression: node.getText(),
          });
        }
      }
    });
  }

  return usages;
}

// Alternative: Regex-based detection (faster but less accurate)
function detectImportMetaSimple(filePath: string): boolean {
  const content = fs.readFileSync(filePath, 'utf-8');
  return /import\.meta\b/.test(content);
}
```

### Rationale

- **ts-morph**: High-level API over TypeScript compiler; easier than raw AST
- **Accurate**: Handles edge cases (import.meta in strings, comments)
- **Type-aware**: Can distinguish import.meta.url vs import.meta.dirname
- **Fast enough**: Parses ~100 files in <1 second

### Alternatives Considered

1. **Raw TypeScript compiler API**: Lower-level; steeper learning curve
2. **Regex search**: Fast but inaccurate (false positives in strings/comments)
3. **ESLint plugin**: Overkill for simple detection; heavy runtime
4. **grep/ripgrep**: Fast but zero context; can't distinguish real usage from comments

### Implementation Notes

**When to use AST analysis:**
- Pre-generation validation: Check if existing code uses import.meta
- Migration tooling: Rewrite import.meta to __dirname for CommonJS
- Dependency analysis: Find all files that require ESM

**When to use regex:**
- Quick sanity check: "Does this file contain import.meta at all?"
- First-pass filter: Eliminate files before expensive AST parse
- Read-only checks: Don't need to modify code

**MetaProperty AST node:**
```typescript
// import.meta is a MetaProperty node
node.kind === SyntaxKind.MetaProperty
node.keywordToken === SyntaxKind.ImportKeyword
node.name.text === 'url' | 'dirname' | 'filename' | etc.

// Example expressions:
import.meta.url
import.meta.dirname
import.meta.resolve('./file.js')
```

**Performance characteristics:**
- ts-morph parsing: ~10ms per file (cold)
- ts-morph parsing: ~1ms per file (warm, cached)
- Regex search: ~0.1ms per file
- For bootstrap validation: Regex is sufficient

### Sources
- [GitHub - ThomZz/ts-jest-mock-import-meta](https://github.com/ThomZz/ts-jest-mock-import-meta)
- [Going beyond the Abstract Syntax Tree (AST) with the TypeScript Type Checker](https://www.satellytes.com/blog/post/typescript-ast-type-checker/)
- [GitHub - olasunkanmi-SE/ts-codebase-analyzer](https://github.com/olasunkanmi-SE/ts-codebase-analyzer)
- [Fast TypeScript Analyzer – FTA](https://ftaproject.dev/)

---

## 8. Rollback Strategies: Safe File Operation Patterns

### Decision: Write-Then-Rename Pattern with Built-in fs APIs

**Recommended approach:**
```typescript
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

/**
 * Safe atomic file write with automatic rollback on error.
 *
 * Uses write-then-rename pattern:
 * 1. Write to temporary file (filename.tmp.RANDOM)
 * 2. Rename temp file to target (atomic operation on most filesystems)
 * 3. If error, delete temp file
 */
async function safeWriteFile(
  filePath: string,
  content: string | Buffer,
  options: { encoding?: BufferEncoding; mode?: number } = {}
): Promise<void> {
  const dir = path.dirname(filePath);
  const base = path.basename(filePath);
  const tmpFile = path.join(dir, `${base}.tmp.${crypto.randomBytes(8).toString('hex')}`);

  try {
    // Ensure directory exists
    await fs.promises.mkdir(dir, { recursive: true });

    // Write to temporary file
    await fs.promises.writeFile(tmpFile, content, {
      encoding: options.encoding ?? 'utf-8',
      mode: options.mode ?? 0o666,
    });

    // Atomic rename (overwrites existing file)
    await fs.promises.rename(tmpFile, filePath);
  } catch (error) {
    // Rollback: Delete temp file if it exists
    try {
      await fs.promises.unlink(tmpFile);
    } catch {
      // Ignore unlink errors (file may not exist)
    }
    throw error;
  }
}

/**
 * Safe multi-file operation with automatic rollback.
 *
 * Tracks all written files and deletes them if any operation fails.
 */
async function safeWriteMultiple(
  operations: Array<{ path: string; content: string | Buffer }>
): Promise<void> {
  const written: string[] = [];

  try {
    for (const op of operations) {
      await safeWriteFile(op.path, op.content);
      written.push(op.path);
    }
  } catch (error) {
    // Rollback: Delete all written files
    await Promise.all(
      written.map(async (filePath) => {
        try {
          await fs.promises.unlink(filePath);
        } catch {
          // Log but don't throw—best effort rollback
          console.warn(`Failed to rollback ${filePath}`);
        }
      })
    );
    throw error;
  }
}
```

### Rationale

- **No external dependencies**: Uses only Node.js built-in fs, path, crypto modules
- **Atomic on POSIX**: `fs.rename()` is atomic on Linux/macOS for same-device operations
- **Near-atomic on Windows**: NTFS supports atomic renames with some caveats
- **Crash-safe**: If process crashes mid-write, temp file is orphaned (not target file)
- **Concurrent-safe**: Random suffix prevents conflicts from parallel processes

### Alternatives Considered

1. **write-file-atomic npm package**: External dependency; ARTK wants minimal deps
2. **atomically npm package**: "Tries harder" but adds complexity; built-in is sufficient
3. **Manual backup-and-restore**: Error-prone; doesn't handle crashes
4. **Database-style WAL**: Overkill for file generation

### Implementation Notes

**Write-then-rename pattern:**
1. Generate unique temp filename (append random suffix)
2. Write content to temp file
3. `fsync()` to ensure data on disk (optional, for critical data)
4. Rename temp file to target filename (atomic)
5. On error, delete temp file

**Atomicity guarantees:**
- POSIX (Linux/macOS): `rename()` is atomic if source and dest are on same filesystem
- Windows NTFS: `MoveFileEx()` with `MOVEFILE_REPLACE_EXISTING` is atomic
- Cross-device: Not atomic; use same-directory temp files

**Rollback strategies:**
- **Single file**: Delete temp file on error
- **Multiple files**: Track written files; delete all on error
- **Complex state**: Use transaction log pattern (write operations to log, replay/undo)

**Handling edge cases:**
- **Permissions**: Preserve original file mode with `fs.chmod()`
- **Symlinks**: Use `fs.lstat()` to detect; decide whether to follow or preserve
- **Concurrent writes**: Unique temp filenames prevent conflicts
- **Disk full**: Catch ENOSPC error; rollback written files

**Performance:**
- Write-then-rename: ~10-20ms per file (SSD)
- Direct write: ~5-10ms per file (SSD)
- Overhead: Acceptable for bootstrap operations

### Sources
- [write-file-atomic - npm](https://www.npmjs.com/package/write-file-atomic)
- [GitHub - npm/write-file-atomic](https://github.com/npm/write-file-atomic)
- [atomically - npm](https://www.npmjs.com/package/atomically)
- [Node.JS | Atomic Operations](https://v-checha.medium.com/node-js-atomic-operations-b1ac914559c7)

---

## Summary Table: Recommended Approaches

| Topic | Recommended Approach | External Dependencies | Performance |
|-------|---------------------|----------------------|-------------|
| **Runtime Detection** | Multi-signal pattern (check `__dirname`, `import.meta`) | None | <1ms |
| **Bootstrap Detection** | Parse package.json + tsconfig.json | `strip-json-comments` | <10ms |
| **Node Version Detection** | Manual parse for major version; semver for ranges | None (semver optional) | <1μs |
| **TypeScript Config Parsing** | `strip-json-comments` + `JSON.parse()` | `strip-json-comments` | <5ms |
| **Cross-Platform Paths** | `getDirname()` helper with version gates | None | <1μs |
| **Template Bundling** | package.json "files" array + export maps | None | N/A |
| **Static Analysis** | ts-morph for accuracy; regex for speed | `ts-morph` (optional) | <1s/100 files |
| **Safe File Operations** | Write-then-rename with built-in fs | None | <20ms/file |

---

## Implementation Roadmap for ARTK

### Phase 1: Environment Detection (Immediate - This Week)

**Goal**: Prevent ESM/CommonJS compatibility issues during foundation generation

**Tasks:**
1. Create `core/typescript/src/compat/detect.ts`:
   - `detectEnvironment(projectRoot)` function
   - Returns moduleSystem, nodeVersion, feature flags
   - Uses `strip-json-comments` for tsconfig parsing

2. Create `core/typescript/src/compat/paths.ts`:
   - `getDirname(importMetaUrl?)` helper function
   - Works in both CommonJS and ESM contexts
   - Uses `import.meta.dirname` on Node 20.11.0+

3. Update bootstrap scripts:
   - Call `detectEnvironment()` early
   - Store result in `.artk/context.json`
   - Pass to config generator and template selector

**Dependencies:**
- `strip-json-comments@^5.0.3` (already widely used; stable)

**Timeline:** 2-3 hours

### Phase 2: Dual Template System (Short-term - Next Sprint)

**Goal**: Support both CommonJS and ESM projects with appropriate templates

**Tasks:**
1. Create template directory structure:
   ```
   core/typescript/templates/
     commonjs/
       auth/...
       config/...
     esm/
       auth/...
       config/...
     shared/
       types/...
   ```

2. Implement template loader:
   - `loadTemplate(moduleSystem, templateName)` function
   - Resolves to correct template variant
   - Supports local overrides in target project

3. Update `/discover-foundation` prompt:
   - Use detected module system to select templates
   - Generate appropriate import syntax
   - Include compatibility helper imports

**Dependencies:**
- None (uses existing EJS dependency)

**Timeline:** 8-10 hours

### Phase 3: Validation Gates (Following Sprint)

**Goal**: Catch compatibility issues before they cause runtime failures

**Tasks:**
1. Create `core/typescript/src/validation/foundation.ts`:
   - `validateFoundation(artkRoot, env)` function
   - Checks for import.meta in CommonJS context
   - Checks for __dirname in ESM context
   - Validates dependency versions

2. Add validation to `/discover-foundation` workflow:
   - Run after generation completes
   - Fail fast with actionable error messages
   - Suggest fixes (e.g., "Set package.json type to 'module'")

3. Add pre-commit validation:
   - Prevent commits with incompatible code
   - Optional: Auto-fix with --fix flag

**Dependencies:**
- `ts-morph@^21.0.0` (for AST-based validation, optional)

**Timeline:** 6-8 hours

### Phase 4: Safe File Operations (Maintenance)

**Goal**: Prevent partial writes and enable rollback on errors

**Tasks:**
1. Create `core/typescript/src/utils/safe-fs.ts`:
   - `safeWriteFile(path, content)` function
   - `safeWriteMultiple(operations)` function
   - Uses write-then-rename pattern

2. Refactor file generation:
   - Replace `fs.writeFile()` with `safeWriteFile()`
   - Batch operations in `safeWriteMultiple()`
   - Add rollback on error

3. Add recovery mechanisms:
   - Detect incomplete generations
   - Offer to retry or clean up
   - Log operations for debugging

**Dependencies:**
- None (uses built-in fs module)

**Timeline:** 4-6 hours

---

## Testing Strategy

### Unit Tests

```typescript
describe('detectEnvironment', () => {
  it('detects ESM from package.json type field', () => {
    const env = detectEnvironment('/path/to/esm-project');
    expect(env.moduleSystem).toBe('esm');
  });

  it('defaults to CommonJS when type field missing', () => {
    const env = detectEnvironment('/path/to/cjs-project');
    expect(env.moduleSystem).toBe('commonjs');
  });

  it('parses tsconfig.json with comments', () => {
    const env = detectEnvironment('/path/to/project-with-comments');
    expect(env.tsModule).toBe('NodeNext');
  });

  it('detects Node version capabilities', () => {
    const env = detectEnvironment('/path/to/project');
    expect(env.supportsImportMeta).toBe(true);
    expect(env.supportsImportMetaDirname).toBe(nodeMajor >= 20);
  });
});

describe('getDirname', () => {
  it('returns __dirname in CommonJS', () => {
    // Mock CommonJS environment
    global.__dirname = '/test/path';
    expect(getDirname()).toBe('/test/path');
  });

  it('converts import.meta.url in ESM', () => {
    const url = 'file:///test/path/file.js';
    expect(getDirname(url)).toBe('/test/path');
  });

  it('uses import.meta.dirname on Node 20.11.0+', () => {
    // Mock import.meta.dirname
    const dirname = getDirname();
    expect(dirname).toMatch(/^\/.*$/); // Absolute path
  });
});

describe('safeWriteFile', () => {
  it('writes file atomically', async () => {
    await safeWriteFile('/tmp/test.txt', 'content');
    const content = await fs.promises.readFile('/tmp/test.txt', 'utf-8');
    expect(content).toBe('content');
  });

  it('rolls back on error', async () => {
    await expect(safeWriteFile('/invalid/path/test.txt', 'content')).rejects.toThrow();
    expect(fs.existsSync('/invalid/path/test.txt')).toBe(false);
  });
});
```

### Integration Tests

```bash
# Test foundation generation on multiple environments
./scripts/test-foundation-compatibility.sh

# Matrix:
# - Node 18.12.1 + CommonJS
# - Node 20.11.0 + ESM
# - Node 22.x + ESM
# - TypeScript 5.0 + CommonJS
# - TypeScript 5.0 + ESM

# Validation checks:
# 1. Generation succeeds without errors
# 2. TypeScript compilation succeeds
# 3. Playwright tests can import foundation modules
# 4. No import.meta in CommonJS output
# 5. No __dirname in ESM output
```

---

## Related Documentation Updates

### CLAUDE.md

Add new section: **Module System Compatibility**

```markdown
## Module System Compatibility

ARTK automatically detects and adapts to your project's module system (CommonJS or ESM).

**Automatic Detection:**
- Reads `package.json` "type" field
- Parses `tsconfig.json` "module" field
- Detects Node.js version capabilities
- Stores result in `.artk/context.json`

**Manual Override:**
Edit `.artk/context.json`:
```json
{
  "moduleSystem": "commonjs",  // or "esm"
  "nodeVersion": "18.12.1"
}
```

**Requirements:**
- Node.js 18.0.0+ (20.0.0+ recommended for full ESM support)
- TypeScript 5.0.0+
- Playwright 1.57.0+

**Troubleshooting:**
- Error: "Cannot use import.meta" → Set `"type": "module"` in package.json or set moduleSystem to "commonjs" in .artk/context.json
- Error: "__dirname is not defined" → Remove `"type": "module"` from package.json or set moduleSystem to "esm" in .artk/context.json
```

### core/typescript/README.md

Add **Compatibility** section:

```markdown
## Compatibility

@artk/core supports both CommonJS and ESM environments:

| Environment | package.json | Import Syntax | __dirname | import.meta |
|-------------|--------------|---------------|-----------|-------------|
| CommonJS | (default) | `import` or `require()` | ✅ | ❌ |
| ESM | `"type": "module"` | `import` | ❌ | ✅ |

**Node.js Version Support:**
- Node 18.x: Full CommonJS support; basic ESM support
- Node 20.x: Recommended; full ESM support with `import.meta.dirname`
- Node 22.x: Latest LTS; optimized ESM performance

**Cross-Platform Paths:**
Use the provided `getDirname()` helper:
```typescript
import { getDirname } from '@artk/core/utils';
const __dirname = getDirname(import.meta.url);
```
```

---

## Conclusion

**Key Takeaways:**

1. **Runtime Detection**: Use multi-signal pattern (check for `__dirname`, `import.meta`)
2. **Bootstrap Detection**: Parse package.json and tsconfig.json with `strip-json-comments`
3. **Node Version**: Manual parsing for major version; semver package for complex ranges
4. **TypeScript Config**: Use `strip-json-comments` for JSONC support
5. **Cross-Platform Paths**: Use `getDirname()` helper with Node version gates
6. **Template Bundling**: Use package.json "files" array + export maps
7. **Static Analysis**: ts-morph for accuracy; regex for speed
8. **Safe File Operations**: Write-then-rename pattern with built-in fs APIs

**Minimal Dependency Strategy:**
- Only one required dependency: `strip-json-comments@^5.0.3`
- Optional: `semver@^7.0.0` (only if complex version ranges needed)
- Optional: `ts-morph@^21.0.0` (only if AST-based validation needed)

**Performance Targets:**
- Environment detection: <10ms
- Template selection: <1ms
- File generation: <20ms per file
- Total bootstrap overhead: <100ms

**Next Steps:**
1. Implement Phase 1 (detection) this week
2. Schedule Phases 2-3 for next sprint
3. Add validation to `/discover-foundation` prompt
4. Document in CLAUDE.md and README.md

**Priority:** HIGH - Resolves critical compatibility issues affecting every new ARTK installation.
