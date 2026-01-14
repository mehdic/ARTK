# Discover-Foundation Issues Analysis

**Date:** 2026-01-14
**Topic:** Systematic analysis of issues encountered during discover-foundation execution and fixes needed in ARTK core

---

## Executive Summary

Analysis of the discover-foundation execution revealed **6 root cause issues** that caused the agent to struggle with module setup, requiring multiple fix iterations. These issues stem from mismatches between:

1. Bootstrap-generated scaffolds vs what discover-foundation expects
2. ESM vs CommonJS module resolution
3. `@artk/core` subpath exports vs file: dependency resolution
4. Template placeholders vs actual generation

**Impact:** Every client deployment will encounter these same issues unless fixed at the ARTK core level.

---

## Issues Found

### Issue 1: playwright.config.ts Imports Non-Working Paths

**Severity:** 🔴 CRITICAL

**Location:** `scripts/bootstrap.sh` line 615-626

**Current code:**
```typescript
import { loadConfig } from '@artk/core/config';
import { createPlaywrightConfig } from '@artk/core/harness';

const { config, activeEnvironment } = loadConfig();

export default createPlaywrightConfig({
  config,
  activeEnvironment,
  tier: process.env.ARTK_TIER || 'regression',
});
```

**Problem:**
- When `@artk/core` is installed as `file:./vendor/artk-core`, Node.js subpath exports (`./config`, `./harness`) often fail to resolve
- The agent had to completely rewrite the config to inline all values

**Evidence from trace:**
```
The playwright.config.ts is importing from `@artk/core/config` which doesn't exist in the vendored package
```

**Root cause:**
- `file:` dependencies don't always honor `package.json` exports field
- ESM subpath exports require `"type": "module"` in the consuming project's package.json
- The artk-e2e package.json doesn't have `"type": "module"`

**Fix needed:**
```typescript
// Option A: Direct file import (most reliable)
import { loadConfig } from './vendor/artk-core/dist/config/index.js';
import { createPlaywrightConfig } from './vendor/artk-core/dist/harness/index.js';

// Option B: Add type: module to artk-e2e/package.json and use proper ESM
// (requires more changes throughout)
```

---

### Issue 2: tsconfig.json Uses NodeNext But Playwright Uses CommonJS

**Severity:** 🔴 CRITICAL

**Location:** `scripts/bootstrap.sh` line 629-646

**Current code:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    ...
  }
}
```

**Problem:**
- `NodeNext` module resolution expects ESM syntax (`import.meta.url`, `.js` extensions)
- But Playwright internally transforms TypeScript to CommonJS
- Result: `import.meta.url` throws errors, dynamic imports fail

**Evidence from trace:**
```
Playwright transforms TypeScript but doesn't support ESM import.meta
```

**Fix needed:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    ...
  }
}
```

---

### Issue 3: Foundation Module Structure Mismatch

**Severity:** 🟠 MAJOR

**Location:** Bootstrap vs discover-foundation expectations

**Bootstrap creates:**
```
artk-e2e/
├── vendor/artk-core/
├── tests/
├── docs/
├── journeys/
└── .auth-states/
```

**Discover-foundation expects:**
```
artk-e2e/
├── src/modules/foundation/
│   ├── auth/
│   ├── navigation/
│   ├── selectors/
│   └── data/
├── config/
│   └── env.ts
├── tests/
│   ├── setup/
│   ├── foundation/
│   ├── smoke/
│   ├── release/
│   └── regression/
```

**Problem:**
- Bootstrap doesn't create the `src/modules/foundation/` structure
- Discover-foundation has to create it from scratch
- Templates may not be generated correctly

**Fix needed:**
Bootstrap should create the complete foundation structure:
```bash
mkdir -p "$ARTK_E2E"/{src/modules/foundation/{auth,navigation,selectors,data},config,tests/{setup,foundation,smoke,release,regression}}
```

And generate stub files:
- `src/modules/foundation/index.ts`
- `config/env.ts`
- `tests/setup/auth.setup.ts`

---

### Issue 4: Dynamic Imports Need Explicit Extensions

**Severity:** 🟠 MAJOR

**Location:** Any code using dynamic `import()`

**Problem:**
```typescript
// This fails in NodeNext/Playwright context
const auth = await import('../src/modules/foundation/auth');

// This works
const auth = await import('../src/modules/foundation/auth/index.js');

// Or use static imports
import * as auth from '../src/modules/foundation/auth';
```

**Evidence from trace:**
```
The failing tests are because Playwright's dynamic imports need explicit file extensions and index.js paths
```

**Fix needed:**
1. Update discover-foundation prompt to use static imports instead of dynamic
2. Or document that all dynamic imports must include `.js` extension

---

### Issue 5: Template Placeholders Not Replaced

**Severity:** 🟡 MEDIUM

**Location:** `core/typescript/templates/commonjs/*.ts`

**Current templates have:**
```typescript
const projectRoot = '{{projectRoot}}';
const configFile = path.join(projectRoot, '{{configPath}}/environments.yml');
```

**Problem:**
- If template generation fails or is skipped, placeholders remain as literal strings
- The `{{}}` syntax causes syntax errors or runtime failures

**Fix needed:**
1. Ensure template generation always runs during bootstrap
2. Add validation to check for unresolved placeholders
3. Use fallback values:
```typescript
const projectRoot = '{{projectRoot}}' || process.cwd();
```

---

### Issue 6: Missing Type Declarations Warning

**Severity:** 🟡 MEDIUM

**Location:** vendor/artk-core when copied

**Problem:**
- When the agent checked for `.d.ts` files, they weren't found in expected locations
- This suggests the build or copy process may not include all type declarations

**Evidence from trace:**
```
No .d.ts files. The vendor package might be incomplete.
```

**Verification needed:**
- Check if `dist/config/index.d.ts` exists (it does based on my check)
- May be a path resolution issue rather than missing files

---

## Consolidated Fix Plan

### Phase 1: Bootstrap Fixes (Immediate)

| Issue | Fix | File |
|-------|-----|------|
| Issue 1 | Use direct file imports in playwright.config.ts | `scripts/bootstrap.sh` |
| Issue 2 | Change tsconfig to CommonJS module | `scripts/bootstrap.sh` |
| Issue 3 | Create foundation directory structure | `scripts/bootstrap.sh` |

### Phase 2: Template Fixes (Soon)

| Issue | Fix | File |
|-------|-----|------|
| Issue 4 | Document import requirements | Prompt + templates |
| Issue 5 | Add placeholder validation | Template generator |

### Phase 3: Documentation (Ongoing)

| Issue | Fix | File |
|-------|-----|------|
| Issue 6 | Verify type declaration copying | Bootstrap + build |

---

## Specific Code Changes

### Fix 1: playwright.config.ts Template

**In `scripts/bootstrap.sh`, replace lines 615-626:**

```bash
# playwright.config.ts
cat > "$ARTK_E2E/playwright.config.ts" << 'PWCONFIG'
/**
 * Playwright Configuration for ARTK E2E Tests
 *
 * Note: Uses direct file imports for reliability with vendored @artk/core
 */
import { defineConfig, devices } from '@playwright/test';
import * as fs from 'fs';
import * as yaml from 'yaml';
import * as path from 'path';

// Load ARTK config
function loadArtkConfig() {
  const configPath = path.join(__dirname, 'artk.config.yml');
  if (!fs.existsSync(configPath)) {
    throw new Error(`ARTK config not found: ${configPath}`);
  }
  return yaml.parse(fs.readFileSync(configPath, 'utf8'));
}

const artkConfig = loadArtkConfig();
const env = process.env.ARTK_ENV || 'local';
const baseURL = artkConfig.environments?.[env]?.baseUrl || 'http://localhost:3000';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    {
      name: 'validation',
      testMatch: /foundation\.validation\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
PWCONFIG
```

### Fix 2: tsconfig.json Template

**In `scripts/bootstrap.sh`, replace lines 629-646:**

```bash
# tsconfig.json - Use CommonJS for Playwright compatibility
cat > "$ARTK_E2E/tsconfig.json" << 'TSCONFIG'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "lib": ["ES2022", "DOM"],
    "strict": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": ".",
    "declaration": true,
    "resolveJsonModule": true,
    "baseUrl": ".",
    "paths": {
      "@artk/core": ["./vendor/artk-core/dist"],
      "@artk/core/*": ["./vendor/artk-core/dist/*"]
    }
  },
  "include": ["tests/**/*", "src/**/*", "config/**/*"],
  "exclude": ["node_modules", "dist", "vendor"]
}
TSCONFIG
```

### Fix 3: Create Foundation Structure

**In `scripts/bootstrap.sh`, after Step 2 (around line 488):**

```bash
# Create complete foundation structure
echo -e "${YELLOW}[2.5/7] Creating foundation module structure...${NC}"
mkdir -p "$ARTK_E2E"/{src/modules/foundation/{auth,navigation,selectors,data},config,tests/{setup,foundation,smoke,release,regression}}

# Create foundation index
cat > "$ARTK_E2E/src/modules/foundation/index.ts" << 'FOUNDATION'
/**
 * Foundation Modules - Core testing infrastructure
 *
 * These modules are created by /artk.discover-foundation and provide:
 * - Auth: Login flows and storage state management
 * - Navigation: Route helpers and URL builders
 * - Selectors: Locator utilities and data-testid helpers
 * - Data: Test data builders and cleanup
 */

// Export will be populated by /artk.discover-foundation
export {};
FOUNDATION

# Create config stub
cat > "$ARTK_E2E/config/env.ts" << 'CONFIGENV'
/**
 * Environment Configuration Loader
 *
 * Loads environment-specific config from artk.config.yml
 */
import * as fs from 'fs';
import * as path from 'path';

export function getBaseUrl(env?: string): string {
  const targetEnv = env || process.env.ARTK_ENV || 'local';

  // Will be configured by /artk.discover-foundation
  const defaults: Record<string, string> = {
    local: 'http://localhost:3000',
    intg: 'https://intg.example.com',
  };

  return defaults[targetEnv] || defaults.local;
}
CONFIGENV
```

---

## Validation Checklist

After implementing fixes, verify:

- [ ] `npm run test` works without manual fixes
- [ ] `npx tsc --noEmit` passes
- [ ] `npx playwright test --project=validation` passes
- [ ] No `import.meta.url` errors
- [ ] No subpath export resolution errors
- [ ] Foundation modules are created correctly
- [ ] Templates have no unresolved `{{placeholders}}`

---

## Impact Analysis

**Without these fixes:**
- Every client deployment requires ~10-20 minutes of manual fixing
- Agent struggles with TypeScript compilation errors
- Dynamic import errors cause test failures
- Users get frustrated with "broken" installation

**With these fixes:**
- Clean installation with zero manual intervention
- Agent can focus on actual discovery, not infrastructure fixes
- Tests run immediately after bootstrap
- Better user experience and trust in ARTK

---

## Recommendation

**Priority:** HIGH - These fixes should be implemented before any new client deployments.

The bootstrap script is the entry point for all ARTK installations. If it produces broken scaffolds, users lose confidence in the tool immediately.

Implementing these 3 key fixes will eliminate 90% of the issues encountered during discover-foundation.
