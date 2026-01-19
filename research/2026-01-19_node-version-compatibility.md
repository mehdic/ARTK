# Node.js Version Compatibility Strategy

**Date:** 2026-01-19
**Topic:** Multi-variant ARTK builds for Node.js/npm compatibility

---

## Problem Statement

ARTK is failing in client projects due to Node.js/npm version incompatibilities. The AI agent (Copilot) is forced to modify ARTK Core code at runtime to fix issues like:

1. `ERR_REQUIRE_ESM` - ESM/CommonJS module system conflicts
2. Environment variable substitution in YAML not working
3. Import path resolution differences

**This is unacceptable** - ARTK Core should be immutable after installation.

---

## Observed Failure Chain

```
1. package.json has "type": "module"
2. Node tries to load as ESM
3. Some dependency or config uses require()
4. ERR_REQUIRE_ESM thrown
5. Agent removes "type": "module"
6. Now YAML parsing behaves differently
7. Agent adds resolveEnvVars() function
8. More patches needed...
```

**Each "fix" causes new issues** - classic compatibility whack-a-mole.

---

## Root Cause Analysis

### Current Architecture

```
@artk/core (single build)
├── dist/
│   ├── index.js (ESM with .js extension)
│   ├── index.d.ts
│   └── ...
└── package.json ("type": "module")
```

### The Problem

| Project Type | Node Version | Expected | Actual |
|--------------|--------------|----------|--------|
| ESM + Node 20 | 20.x | Works | Works |
| ESM + Node 18 | 18.x | Works | Sometimes fails |
| CJS + Node 20 | 20.x | Works | ERR_REQUIRE_ESM |
| CJS + Node 18 | 18.x | Works | ERR_REQUIRE_ESM |
| CJS + Node 16 | 16.x | Works | Multiple failures |

---

## Proposed Solution: Pre-built Variants

### Variant Matrix

| Variant | Target | Module System | Node Range | Use Case |
|---------|--------|---------------|------------|----------|
| `modern-esm` | ES2022 | ESM | 18.18+, 20.x, 22.x | New projects with `"type": "module"` |
| `modern-cjs` | ES2022 | CommonJS | 18.18+, 20.x, 22.x | Projects without `"type": "module"` |
| `legacy-cjs` | ES2020 | CommonJS | 16.x, 18.x | Older corporate environments |

### Directory Structure

```
core/typescript/
├── dist/                    # Default (modern-esm)
├── dist-cjs/                # CommonJS variant
├── dist-legacy/             # Legacy CommonJS variant
├── package.json             # With conditional exports
└── scripts/
    └── build-variants.sh    # Builds all variants
```

### Conditional Exports (package.json)

```json
{
  "name": "@artk/core",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist-cjs/index.cjs"
    },
    "./fixtures": {
      "import": "./dist/fixtures/index.js",
      "require": "./dist-cjs/fixtures/index.cjs"
    }
  },
  "main": "./dist-cjs/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts"
}
```

---

## Implementation Plan

### Phase 1: Build System Updates

**File: `core/typescript/scripts/build-variants.sh`**

```bash
#!/bin/bash
set -e

echo "Building ARTK Core variants..."

# Clean
rm -rf dist dist-cjs dist-legacy

# Variant 1: Modern ESM (default)
echo "Building modern-esm..."
npx tsc -p tsconfig.json

# Variant 2: Modern CommonJS
echo "Building modern-cjs..."
npx tsc -p tsconfig.cjs.json
# Rename .js to .cjs for explicit CommonJS
find dist-cjs -name "*.js" -exec bash -c 'mv "$0" "${0%.js}.cjs"' {} \;

# Variant 3: Legacy CommonJS (ES2020 target)
echo "Building legacy-cjs..."
npx tsc -p tsconfig.legacy.json
find dist-legacy -name "*.js" -exec bash -c 'mv "$0" "${0%.js}.cjs"' {} \;

echo "All variants built successfully"
```

**File: `core/typescript/tsconfig.cjs.json`**

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "Node",
    "outDir": "./dist-cjs",
    "declaration": false
  }
}
```

**File: `core/typescript/tsconfig.legacy.json`**

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "outDir": "./dist-legacy",
    "declaration": false,
    "lib": ["ES2020", "DOM"]
  }
}
```

### Phase 2: Bootstrap Script Updates

**Update `scripts/bootstrap.ps1` and `scripts/bootstrap.sh`:**

```bash
# Detect Node.js version
NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
echo "Detected Node.js major version: $NODE_VERSION"

# Detect project module system
if [ -f "$TARGET/package.json" ]; then
  PROJECT_TYPE=$(node -pe "JSON.parse(require('fs').readFileSync('$TARGET/package.json')).type || 'commonjs'")
else
  PROJECT_TYPE="commonjs"
fi
echo "Project module system: $PROJECT_TYPE"

# Select appropriate variant
if [ "$NODE_VERSION" -lt 18 ]; then
  VARIANT="dist-legacy"
  echo "Using legacy-cjs variant (Node < 18)"
elif [ "$PROJECT_TYPE" = "module" ]; then
  VARIANT="dist"
  echo "Using modern-esm variant"
else
  VARIANT="dist-cjs"
  echo "Using modern-cjs variant"
fi

# Copy selected variant
cp -r "$ARTK_CORE_PATH/$VARIANT/"* "$TARGET/vendor/artk-core/"
```

### Phase 3: CLI Updates

**Update `cli/src/commands/init.ts`:**

```typescript
function selectVariant(targetPath: string): 'modern-esm' | 'modern-cjs' | 'legacy-cjs' {
  const nodeVersion = parseInt(process.version.slice(1).split('.')[0], 10);

  // Check target project's package.json
  const pkgPath = path.join(targetPath, 'package.json');
  let projectType = 'commonjs';

  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    projectType = pkg.type || 'commonjs';
  }

  // Selection logic
  if (nodeVersion < 18) {
    console.log('  Node < 18 detected, using legacy-cjs variant');
    return 'legacy-cjs';
  }

  if (projectType === 'module') {
    console.log('  ESM project detected, using modern-esm variant');
    return 'modern-esm';
  }

  console.log('  CommonJS project detected, using modern-cjs variant');
  return 'modern-cjs';
}
```

---

## Variant-Specific Considerations

### Modern ESM (`dist/`)

- Uses native ES modules
- File extensions: `.js`
- package.json: `"type": "module"`
- Imports: `import { foo } from './bar.js'`

### Modern CJS (`dist-cjs/`)

- CommonJS with modern syntax
- File extensions: `.cjs`
- No `"type"` field needed
- Imports: `const { foo } = require('./bar.cjs')`

### Legacy CJS (`dist-legacy/`)

- ES2020 target for Node 16 compatibility
- Avoids modern APIs like:
  - `Array.prototype.at()`
  - `Object.hasOwn()`
  - Top-level await
- Includes polyfills where needed

---

## Testing Matrix

| Test | modern-esm | modern-cjs | legacy-cjs |
|------|------------|------------|------------|
| Node 22 + ESM project | ✓ | - | - |
| Node 22 + CJS project | - | ✓ | - |
| Node 20 + ESM project | ✓ | - | - |
| Node 20 + CJS project | - | ✓ | - |
| Node 18 + ESM project | ✓ | - | - |
| Node 18 + CJS project | - | ✓ | - |
| Node 16 + CJS project | - | - | ✓ |

---

## Migration Path

### For Existing Installations

When upgrading ARTK in a project that had compatibility issues:

1. Run `artk doctor` to detect issues
2. `artk upgrade` will automatically select correct variant
3. Remove any manual patches the agent made

### For New Installations

1. `artk init` auto-detects and selects variant
2. No manual intervention needed
3. Variant selection logged for transparency

---

## Alternative Approaches Considered

### 1. Single Dual-Package Build

**Pros:** Single dist, cleaner
**Cons:** Complex build, larger package size, edge case failures

### 2. Runtime Detection

**Pros:** No build variants needed
**Cons:** Runtime overhead, error-prone, current approach that's failing

### 3. Separate npm Packages

**Pros:** Clear separation
**Cons:** Version sync issues, user confusion (`@artk/core` vs `@artk/core-legacy`)

---

## Recommendation

**Implement the 3-variant approach** with:

1. **Build-time variant generation** (Phase 1)
2. **Bootstrap auto-detection** (Phase 2)
3. **CLI integration** (Phase 3)

### Priority Order

1. `modern-cjs` - Covers most enterprise projects (CJS + modern Node)
2. `modern-esm` - Covers modern projects with ESM
3. `legacy-cjs` - Covers older environments (Node 16)

### Timeline

- Phase 1: 2-3 hours (build scripts)
- Phase 2: 1-2 hours (bootstrap updates)
- Phase 3: 1-2 hours (CLI updates)
- Testing: 2-3 hours (matrix validation)

---

## Success Criteria

1. ✅ `artk init` works on Node 16, 18, 20, 22
2. ✅ ESM and CJS projects both work without modification
3. ✅ No agent-modified code in client projects
4. ✅ All existing tests pass with each variant
5. ✅ Clear variant selection logging

---

## Open Questions

1. Should we drop Node 16 support entirely? (EOL was Sept 2023)
2. Should variants be separate npm packages for clearer versioning?
3. How to handle autogen package variants?

---

## Appendix: Error Reference

### ERR_REQUIRE_ESM

```
Error [ERR_REQUIRE_ESM]: require() of ES Module .../index.js not supported.
Instead change the require of index.js to a dynamic import() which is available in all CommonJS modules.
```

**Cause:** CJS project trying to `require()` an ESM package
**Solution:** Use `modern-cjs` variant

### ERR_MODULE_NOT_FOUND

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../foo' imported from '.../bar.js'
```

**Cause:** ESM requires explicit file extensions
**Solution:** Ensure all imports have `.js` extension in ESM variant

### Top-level await error

```
SyntaxError: await is only valid in async functions and the top level bodies of modules
```

**Cause:** Node 16 doesn't support top-level await in CJS
**Solution:** Use `legacy-cjs` variant which avoids top-level await
