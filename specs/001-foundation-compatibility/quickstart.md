# Quickstart: Foundation Module System Compatibility

**Feature**: 001-foundation-compatibility
**Audience**: Developers implementing or using this feature
**Time to Complete**: 5 minutes to understand, 2-3 hours to implement P1

## What This Feature Does

Automatically detects your project's Node.js and TypeScript environment (CommonJS or ESM) and generates compatible foundation modules without requiring manual fixes. Eliminates the "15-file manual edit problem" observed when module systems are mismatched.

**Before this feature:**
```
bootstrap → generates code → 15 import.meta errors → 15 manual fixes → frustration
```

**After this feature:**
```
bootstrap → detects environment → generates compatible code → tests pass ✅
```

---

## Quick Example

### For Users (Running Bootstrap)

```bash
# Navigate to your Playwright project
cd ~/projects/my-playwright-project

# Run ARTK bootstrap (automatic detection happens here)
/path/to/ARTK/scripts/bootstrap.sh .

# Detection runs automatically:
# ✓ Detected Node.js 18.12.1
# ✓ Detected CommonJS (package.json has no "type" field)
# ✓ Detected TypeScript module: "commonjs"
# ✓ Confidence: high
# ✓ Generating foundation modules with CommonJS templates...
# ✓ Validation passed (245ms)
# ✓ Foundation ready!

# Check detection results
cat .artk/context.json

# Check validation results (if needed)
cat .artk/validation-results.json
```

### For Developers (Using Compat Layer)

**Before (breaks in CommonJS):**
```typescript
// auth/login.ts - BREAKS in CommonJS ❌
import { fileURLToPath } from 'url';
const __dirname = fileURLToPath(new URL('.', import.meta.url));
```

**After (works everywhere):**
```typescript
// auth/login.ts - WORKS in both CommonJS and ESM ✅
import { getDirname } from '@artk/core/compat';
const __dirname = getDirname();
```

---

## Implementation Roadmap

### Phase 1: Environment Detection (P1) - **START HERE**

**Goal**: Detect Node version, module system, and TypeScript config before generation.

**Files to Create:**
- `core/typescript/src/detection/index.ts`
- `core/typescript/src/detection/node-version.ts`
- `core/typescript/src/detection/module-system.ts`
- `core/typescript/src/detection/typescript-config.ts`
- `core/typescript/src/detection/confidence.ts`

**Key APIs:**
```typescript
// detection/index.ts
export interface DetectionResult {
  moduleSystem: 'commonjs' | 'esm';
  nodeVersion: string;
  nodeVersionParsed: { major: number; minor: number; patch: number };
  tsModule: string | null;
  detectionConfidence: 'high' | 'medium' | 'low';
}

export async function detectEnvironment(projectRoot: string): Promise<DetectionResult>;
```

**Integration Points:**
- Called by `scripts/bootstrap.sh` and `scripts/bootstrap.ps1`
- Stores result in `.artk/context.json`
- Used by template selection logic

**Success Criteria:**
- ✅ Detects Node 18.12.1 as CommonJS correctly
- ✅ Detects Node 20.x with "type": "module" as ESM correctly
- ✅ Completes in < 5 seconds (FR-094 timeout)
- ✅ Falls back safely when conflicting signals detected

**Testing:**
```bash
# Unit tests
cd core/typescript
npm run test -- detection

# Integration test
cd /tmp/test-project-cjs
node -e "console.log(require('@artk/core/detection').detectEnvironment(process.cwd()))"
```

---

### Phase 2: Compatibility Layer (P2)

**Goal**: Provide runtime abstraction for `__dirname` vs `import.meta.url`.

**Files to Create:**
- `core/typescript/src/compat/index.ts`
- `core/typescript/src/compat/dirname.ts`
- `core/typescript/src/compat/project-root.ts`
- `core/typescript/src/compat/dynamic-import.ts`
- `core/typescript/src/compat/detect-env.ts`

**Key APIs:**
```typescript
// compat/index.ts
export function getDirname(): string;
export function resolveProjectRoot(): string;
export function dynamicImport<T>(specifier: string): Promise<T>;
export function getModuleSystem(): 'commonjs' | 'esm' | 'unknown';
export function isESM(): boolean;
```

**Integration Points:**
- Used by generated foundation modules (auth, config, navigation)
- Imported from `@artk/core/compat`
- Zero external dependencies (FR-018)

**Success Criteria:**
- ✅ `getDirname()` returns correct path in both CommonJS and ESM
- ✅ Runtime overhead < 5% vs native calls (SC-007)
- ✅ Unit tests pass in both module systems (FR-019)

**Testing:**
```bash
# Unit tests (CommonJS)
cd core/typescript
npm run test -- compat

# Unit tests (ESM) - separate test runner
npm run test:esm -- compat
```

---

### Phase 3: Validation Engine (P3)

**Goal**: Validate generated code matches detected environment, rollback on failure.

**Files to Create:**
- `core/typescript/src/validation/index.ts`
- `core/typescript/src/validation/runner.ts`
- `core/typescript/src/validation/rollback.ts`
- `core/typescript/src/validation/rules/import-meta-usage.ts`
- `core/typescript/src/validation/rules/dirname-usage.ts`
- `core/typescript/src/validation/rules/import-paths.ts`
- `core/typescript/src/validation/rules/dependency-compat.ts`

**Key APIs:**
```typescript
// validation/index.ts
export interface ValidationOptions {
  projectRoot: string;
  envContext: EnvironmentContext;
  generatedFiles: string[];
  skipValidation?: boolean;
}

export async function validateFoundation(options: ValidationOptions): Promise<ValidationResult>;
```

**Integration Points:**
- Called by bootstrap after foundation generation
- Stores result in `.artk/validation-results.json`
- Triggers rollback on status: 'failed' (FR-033)

**Success Criteria:**
- ✅ Detects `import.meta` in CommonJS environment (FR-022)
- ✅ Validates all import paths resolve correctly (FR-023)
- ✅ Completes in < 10 seconds (FR-029)
- ✅ Automatic rollback preserves validation results (FR-034)

**Testing:**
```bash
# Unit tests
npm run test -- validation

# Integration test (intentional failure)
cd /tmp/test-project-fail
# ... generate incompatible code ...
node -e "require('@artk/core/validation').validateFoundation({ ... })"
# Expect: status: 'failed', rollbackPerformed: true
```

---

### Phase 4: Dual Template System (P4)

**Goal**: Maintain separate template sets for CommonJS and ESM, support local overrides.

**Files to Create:**
- `core/typescript/templates/commonjs/auth/login.ts`
- `core/typescript/templates/commonjs/config/env.ts`
- `core/typescript/templates/esm/auth/login.ts`
- `core/typescript/templates/esm/config/env.ts`
- `core/typescript/templates/shared/types/index.ts`

**Key Logic:**
```typescript
// Template resolution
function resolveTemplate(moduleName: string, variant: 'commonjs' | 'esm'): string {
  // 1. Check local override
  const localPath = path.join(projectRoot, 'artk-e2e/templates', variant, moduleName);
  if (fs.existsSync(localPath)) return localPath;

  // 2. Use bundled template
  return path.join(__dirname, '../templates', variant, moduleName);
}
```

**Integration Points:**
- Templates bundled in `@artk/core` npm package
- Local overrides in `artk-e2e/templates/` take precedence (FR-034)
- Update `package.json` "files" array: `["dist", "templates"]`

**Success Criteria:**
- ✅ CommonJS templates use `require()` and `__dirname`
- ✅ ESM templates use `import` and `import.meta.url`
- ✅ Local overrides take precedence over bundled (FR-033)
- ✅ Both variants generate functionally identical modules (FR-043)

---

## Common Workflows

### Workflow 1: First-Time Bootstrap

```bash
# User runs bootstrap on a new project
cd ~/my-project
/path/to/ARTK/scripts/bootstrap.sh .

# Behind the scenes:
# 1. Detection runs → creates .artk/context.json
# 2. Template selection → based on detected moduleSystem
# 3. Generation → creates artk-e2e/src/modules/foundation/
# 4. Validation → checks generated code, creates .artk/validation-results.json
# 5. Success → foundation ready!
```

### Workflow 2: Switching Node Versions

```bash
# User upgrades from Node 18 to Node 20
nvm use 20

# Re-detect environment (optional, compat layer handles it)
/path/to/ARTK/scripts/bootstrap.sh . --force-detect

# Behind the scenes:
# 1. Detection re-runs → updates .artk/context.json
# 2. Note: Existing foundation still works (compat layer abstracts differences)
# 3. Optional: Regenerate with new templates for optimal code
```

### Workflow 3: Local Template Customization

```bash
# Copy bundled template to local override
mkdir -p artk-e2e/templates/commonjs/auth
cp node_modules/@artk/core/templates/commonjs/auth/login.ts artk-e2e/templates/commonjs/auth/login.ts

# Edit local template
vim artk-e2e/templates/commonjs/auth/login.ts

# Regenerate foundation
/path/to/ARTK/scripts/bootstrap.sh . --force

# Behind the scenes:
# 1. Template resolution finds local override
# 2. Uses local template instead of bundled
# 3. Validation still runs on generated code
```

### Workflow 4: Debugging Validation Failures

```bash
# Validation failed during bootstrap
cat .artk/validation-results.json

# Example output:
# {
#   "status": "failed",
#   "errors": [
#     {
#       "file": ".../login.ts",
#       "line": 5,
#       "message": "import.meta.url not available in CommonJS",
#       "suggestedFix": "Replace with getDirname() from @artk/core/compat"
#     }
#   ],
#   "rollbackPerformed": true
# }

# Fix the template or environment config, then retry
/path/to/ARTK/scripts/bootstrap.sh .
```

---

## Troubleshooting

### Issue: "Cannot determine directory name in this environment"

**Cause**: Neither `__dirname` nor `import.meta` available (unsupported environment)

**Solution:**
1. Check Node.js version: `node --version` (must be >= 18.0.0)
2. Check module system: `cat package.json | grep '"type"'`
3. If using bundler (Webpack, esbuild), ensure it preserves module system globals

### Issue: "Validation failed: import.meta usage detected"

**Cause**: Generated code contains `import.meta` in CommonJS environment

**Solution:**
1. Check `.artk/context.json` → ensure `moduleSystem: "commonjs"`
2. Check templates → ensure CommonJS templates don't use `import.meta`
3. Re-run bootstrap with `--force-detect` to refresh environment detection

### Issue: "Template not found: commonjs/auth"

**Cause**: Template missing from both bundled and local locations

**Solution:**
1. Reinstall @artk/core: `npm install @artk/core@latest`
2. Verify templates exist: `ls node_modules/@artk/core/templates/commonjs/auth`
3. Check package.json "files" array includes "templates"

### Issue: Detection confidence is "low"

**Cause**: Conflicting signals from package.json and tsconfig.json

**Solution:**
1. Check warnings in `.artk/context.json`
2. Align package.json "type" and tsconfig.json "module" fields
3. Or manually override: edit `.artk/context.json` → set `moduleSystem: "commonjs"` or `"esm"`

---

## API Reference (Quick Links)

- **Detection API**: See `research.md` § 1-2
- **Compatibility Layer**: See `contracts/compat-api.md`
- **Validation Engine**: See `data-model.md` § Entity 2
- **Data Schemas**: See `contracts/*.schema.json`

---

## Next Steps

1. **Implement P1 (Environment Detection)**: Start with `detection/` module
2. **Test on real projects**: Use ITSS project (`ignore/req-apps-it-service-shop/`)
3. **Measure performance**: Ensure < 5 second detection, < 30 second total bootstrap
4. **Implement P2 (Compat Layer)**: Create `compat/` module
5. **Update existing code**: Replace `__dirname` usage in `@artk/core/auth` and `@artk/core/config`
6. **Run full test suite**: `npm run test:all` (both CommonJS and ESM)

---

## Questions?

- **Spec**: See [spec.md](./spec.md) for functional requirements
- **Research**: See [research.md](./research.md) for technical decisions
- **Data Model**: See [data-model.md](./data-model.md) for entity definitions
- **Contracts**: See [contracts/](./contracts/) for API schemas
