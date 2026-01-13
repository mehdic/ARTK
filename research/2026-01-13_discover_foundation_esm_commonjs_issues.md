# Discovery Foundation ESM/CommonJS Compatibility Issues

**Date:** 2026-01-13
**Topic:** Analysis of module system compatibility failures during `/discover-foundation` execution and recommendations for preventing recurrence

---

## Incident Summary

During execution of the `/discover-foundation` prompt on the ITSS project (`req-apps-it-service-shop`), the generated foundation code underwent multiple breaking changes to fix module system compatibility:

1. **Initial Generation**: Code generated with ESM syntax (`"type": "module"`, `.js` import extensions, `import.meta.url`)
2. **Node Version Conflict**: Node 18.12.1 couldn't properly handle the ESM setup
3. **Emergency Migration**: Forced migration to CommonJS (removed `"type": "module"`, removed `.js` extensions, replaced `import.meta.url` with `__dirname`)
4. **Cascading Failures**: Multiple rounds of fixes for `import.meta` usage, dynamic imports, and dependency issues (nanoid)

**Result:** ~15 file edits to fix what should have worked correctly from the first generation.

---

## Root Cause Analysis

### 1. **Assumption of ESM Environment**

The prompt/generator assumed a modern ESM-first environment without detecting:
- Node.js version compatibility (18.12.1 has partial ESM support)
- Project's existing module system (CommonJS vs ESM)
- TypeScript configuration (`tsconfig.json` with `module` and `moduleResolution` settings)

### 2. **Missing Environment Detection**

The foundation generator should have checked:
```typescript
// What SHOULD have been checked:
- Node.js version (process.version)
- package.json "type" field (existing value)
- tsconfig.json "module" field
- Project dependencies' module systems
- Playwright config module system
```

### 3. **Brittle Import Patterns**

Generated code used patterns that only work in specific environments:
- `import.meta.url` (ESM-only)
- `.js` extensions in imports (ESM convention, breaks in some TS setups)
- Dynamic imports without fallback (`import()` not supported everywhere)

### 4. **No Compatibility Layer**

The generator lacked a compatibility abstraction for environment-specific APIs:
```typescript
// Missing abstraction layer:
export const getDirname = () => {
  if (typeof __dirname !== 'undefined') {
    return __dirname; // CommonJS
  }
  return fileURLToPath(new URL('.', import.meta.url)); // ESM
};
```

---

## Compatibility Matrix

| Environment | Node Version | package.json type | Import Style | import.meta | __dirname |
|-------------|--------------|-------------------|--------------|-------------|-----------|
| **CommonJS** | Any | (none) or "commonjs" | `require()` or `import` | ❌ | ✅ |
| **ESM (strict)** | 14.8.0+ | "module" | `import` | ✅ | ❌ |
| **ESM (TypeScript)** | 18.0.0+ | "module" | `import` | ✅ (needs polyfill) | ❌ (needs polyfill) |
| **Hybrid** | 18.0.0+ | (none) | Both | ⚠️ Context-dependent | ⚠️ Context-dependent |

**Key Insight:** Node 18.12.1 with TypeScript can use `import` syntax but doesn't always support `import.meta` depending on `tsconfig` settings.

---

## Why This Happens with Each New Project

### Current Workflow Gaps

1. **No Pre-Flight Check**: Generator doesn't inspect target environment before generating code
2. **Template Hardcoding**: Templates use hardcoded ESM patterns instead of detected patterns
3. **No Graceful Degradation**: No fallback for older Node versions or CommonJS projects
4. **Manual Triage Required**: AI must manually detect issues and apply ~15 fixes

### Impact

- **Time Cost**: ~10-15 minutes of back-and-forth fixing per project
- **Reliability**: Foundation tests fail immediately, eroding confidence
- **User Experience**: User sees multiple error iterations instead of "just working"
- **Maintainability**: Each project may need custom fixes

---

## Recommended Solutions

### Solution 1: **Environment Detection Phase** (Immediate Fix)

Add a pre-generation detection phase to `/discover-foundation`:

```typescript
// pseudo-code for detection logic
async function detectEnvironment(projectRoot: string) {
  const packageJson = await readJSON(`${projectRoot}/package.json`);
  const tsConfig = await readJSON(`${projectRoot}/tsconfig.json`);
  const nodeVersion = process.version; // e.g., "v18.12.1"

  return {
    moduleSystem: packageJson.type === 'module' ? 'esm' : 'commonjs',
    nodeVersion: parseNodeVersion(nodeVersion),
    tsModule: tsConfig?.compilerOptions?.module || 'commonjs',
    supportsImportMeta: checkImportMetaSupport(nodeVersion, tsConfig),
  };
}
```

**Action Items:**
- [ ] Add `detectEnvironment()` function to generator
- [ ] Store result in `.artk/context.json` for reuse
- [ ] Use detection result to choose template variant

### Solution 2: **Dual Template System** (Recommended)

Maintain separate template sets for ESM and CommonJS:

```
templates/
  esm/
    auth/
      login.ts        # Uses import.meta.url
      storage-state.ts
  commonjs/
    auth/
      login.ts        # Uses __dirname
      storage-state.ts
  shared/
    auth/
      login.interface.ts  # Shared types
```

**Action Items:**
- [ ] Create `templates/commonjs/` and `templates/esm/` directories
- [ ] Migrate current templates to appropriate directories
- [ ] Add template selector logic to generator
- [ ] Test both variants on sample projects

### Solution 3: **Compatibility Shim Layer** (Best Long-Term)

Create a `@artk/compat` utility module that abstracts environment differences:

```typescript
// @artk/core/compat.ts
export const getDirname = (): string => {
  if (typeof __dirname !== 'undefined') {
    return __dirname;
  }
  if (typeof import.meta !== 'undefined' && import.meta.url) {
    return fileURLToPath(new URL('.', import.meta.url));
  }
  throw new Error('Cannot determine directory name in this environment');
};

export const resolveProjectRoot = (): string => {
  return path.resolve(getDirname(), '../../../..');
};

export const dynamicImport = async <T = any>(specifier: string): Promise<T> => {
  try {
    return await import(specifier);
  } catch {
    // Fallback for environments without dynamic import
    return require(specifier);
  }
};
```

**Usage in generated code:**
```typescript
import { getDirname, resolveProjectRoot } from '@artk/core/compat';

const __dirname = getDirname();
const projectRoot = resolveProjectRoot();
```

**Action Items:**
- [ ] Create `core/typescript/src/compat.ts` module
- [ ] Update templates to use compat layer
- [ ] Add unit tests for both CommonJS and ESM environments
- [ ] Document compatibility guarantees

### Solution 4: **Validation Gate** (Defense in Depth)

Add a post-generation validation step:

```typescript
async function validateFoundation(artkRoot: string, env: Environment) {
  const checks = [
    validateImports(artkRoot, env.moduleSystem),
    validatePaths(artkRoot),
    validateDependencies(artkRoot),
  ];

  const results = await Promise.all(checks);
  const failures = results.filter(r => !r.success);

  if (failures.length > 0) {
    throw new ValidationError('Foundation validation failed', failures);
  }
}
```

**Action Items:**
- [ ] Create validation script in `core/artk-core-journeys/tools/node/validate-foundation.js`
- [ ] Add to `/discover-foundation` workflow after generation
- [ ] Fail fast with actionable error messages

---

## Recommended Implementation Order

### Phase 1: Quick Fix (This Week)
1. Add environment detection to `/discover-foundation` prompt
2. Update prompt to check Node version and package.json
3. Generate CommonJS-compatible code by default for Node < 20
4. Add warning if ESM requested on older Node

### Phase 2: Robust Solution (Next Sprint)
1. Create `@artk/core/compat` module
2. Update all templates to use compat layer
3. Add unit tests for both module systems
4. Update bootstrap to detect and document module system choice

### Phase 3: Complete Solution (Following Sprint)
1. Create dual template system
2. Add validation gate to foundation generator
3. Document compatibility matrix in CLAUDE.md
4. Add troubleshooting guide for module system issues

---

## Testing Strategy

### Compatibility Test Matrix

Test foundation generation on:
- ✅ Node 18.12.1 + CommonJS (current failing case)
- ✅ Node 18.20.0 + ESM
- ✅ Node 20.x + ESM
- ✅ Node 22.x + ESM
- ✅ TypeScript 5.0 + CommonJS
- ✅ TypeScript 5.0 + ESM

### Automated Checks

```bash
# Test script to validate foundation on multiple environments
./scripts/test-foundation-compatibility.sh

# Should test:
# 1. Generation succeeds without errors
# 2. TypeScript compilation succeeds
# 3. Playwright tests can import foundation modules
# 4. No import.meta in CommonJS output
# 5. No __dirname in ESM output
```

---

## Documentation Updates Needed

### CLAUDE.md

Add new section: **Module System Compatibility**

```markdown
## Module System Compatibility

ARTK foundation modules support both CommonJS and ESM environments.

**Automatic Detection:**
Bootstrap and `/discover-foundation` automatically detect:
- Node.js version
- package.json "type" field
- TypeScript configuration

**Manual Override:**
If automatic detection fails, set in `.artk/context.json`:

```json
{
  "moduleSystem": "commonjs",  // or "esm"
  "nodeVersion": "18.12.1"
}
```

**Troubleshooting:**
- Error: "Cannot use import.meta" → Set moduleSystem to "commonjs"
- Error: "__dirname is not defined" → Set moduleSystem to "esm"
```

### README.md (artk-e2e/)

Add section: **Environment Requirements**

```markdown
## Environment Requirements

- Node.js: 18.0.0+ (20.0.0+ recommended for full ESM support)
- TypeScript: 5.0.0+
- Playwright: 1.57.0+

**Module System:**
Generated code adapts to your project's module system.
For best compatibility, ensure package.json includes:

```json
{
  "type": "module"  // for ESM, or omit for CommonJS
}
```
```

---

## Cost-Benefit Analysis

### Current State (No Fix)
- **Cost per project**: ~15 file edits, ~10-15 minutes troubleshooting
- **Risk**: Foundation failures reduce user confidence in ARTK
- **Maintenance**: Each project may need custom fixes

### With Phase 1 (Detection Only)
- **Implementation**: ~2-3 hours
- **Benefit**: 80% reduction in manual fixes
- **Risk reduction**: Early detection prevents cascading failures

### With Phase 2 (Compat Layer)
- **Implementation**: ~8-10 hours
- **Benefit**: 95% reduction in manual fixes
- **Risk reduction**: Future-proof against Node/TS version changes
- **Maintenance**: Centralized compatibility logic

### With Phase 3 (Complete Solution)
- **Implementation**: ~16-20 hours total
- **Benefit**: 100% elimination of manual fixes
- **Risk reduction**: Validated, tested, documented solution
- **Maintenance**: Zero ongoing fixes per project

**Recommendation:** Implement all three phases. The ~20 hours investment pays for itself after 10-15 project installations.

---

## Related Issues

### Dependency Version Mismatches
- `nanoid` v5 (ESM-only) fails in CommonJS environments
- Solution: Pin to v3 for CommonJS, v5 for ESM, or use built-in crypto

### Playwright Config Module System
- Playwright config must match test module system
- Solution: Generate config with correct `import`/`require` syntax

### TypeScript Path Mapping
- Relative imports (`../../../../config/env`) are brittle
- Solution: Use TypeScript path mapping in generated `tsconfig.json`:
  ```json
  {
    "compilerOptions": {
      "paths": {
        "@artk/*": ["./src/*"],
        "@config/*": ["./config/*"]
      }
    }
  }
  ```

---

## Conclusion

**What Happened:** The foundation generator produced ESM-only code without detecting that the target environment (Node 18.12.1 + existing TypeScript setup) couldn't properly support it.

**Why It Happens:** No environment detection, hardcoded ESM templates, no compatibility layer, no validation.

**How to Fix:**
1. **Immediate**: Add environment detection to prompt
2. **Short-term**: Create compat layer
3. **Long-term**: Dual templates + validation gate

**Priority:** HIGH - This issue affects every new ARTK installation and creates a poor first impression.

**Next Steps:** Implement Phase 1 (detection) immediately, schedule Phases 2-3 for next sprint.
