# Implementation Plan: Fixing AutoGen Empty Stubs Problem

**Date:** 2026-01-27
**Topic:** Maximizing AutoGen test generation effectiveness to eliminate empty stubs
**Status:** IMPLEMENTATION PLAN
**Confidence:** 0.88

---

## Executive Summary

AutoGen generates empty test stubs (with `throw new Error('ARTK BLOCKED: ...')`) instead of full implementations because journey step text doesn't match the rigid regex patterns in `patterns.ts`. This plan details a 4-phase approach to solve this problem systematically.

**Root Cause:** Pattern mismatch between natural language journey steps and AutoGen's regex-based pattern matching.

**Goal:** Reduce blocked steps from ~80% to <10% through improved feedback, format enforcement, targeted pattern expansion, and learning loops.

---

## Problem Analysis

### Current AutoGen Pipeline

```
Journey.md → parseJourney.ts → stepMapper.ts → patterns.ts → IR → generateTest.ts → Playwright
                                     ↓
                              matchPattern()
                                     ↓
                           [null if no match]
                                     ↓
                              { type: 'blocked' }
                                     ↓
                    throw new Error('ARTK BLOCKED: ...')
```

### Key Files Involved

| File | Location | Purpose |
|------|----------|---------|
| `patterns.ts` | `core/typescript/autogen/src/mapping/patterns.ts` | 541 lines of regex patterns |
| `stepMapper.ts` | `core/typescript/autogen/src/mapping/stepMapper.ts` | Step-to-IR conversion |
| `glossary.ts` | `core/typescript/autogen/src/mapping/glossary.ts` | Synonym normalization |
| `parseJourney.ts` | `core/typescript/autogen/src/journey/parseJourney.ts` | Journey markdown parsing |
| `generateTest.ts` | `core/typescript/autogen/src/codegen/generateTest.ts` | IR-to-Playwright code |
| `generate.ts` | `core/typescript/autogen/src/cli/generate.ts` | CLI entry point |

### Current Blocked Step Output (Line 233-234 of generateTest.ts)

```typescript
case 'blocked':
  return `${indent}// ARTK BLOCKED: ${primitive.reason}\n${indent}// Source: ${escapeString(primitive.sourceText)}\n${indent}throw new Error('ARTK BLOCKED: ${escapeString(primitive.reason)}');`;
```

### What AutoGen Expects (from patterns.ts)

**Structured format:**
```markdown
1. **Action**: Navigate to `/login`
2. **Action**: Fill email field `(testid=email-input)` with "test@example.com"
3. **Action**: Click Login button `(role=button, name=Sign In)`
4. **Wait for**: Dashboard to load
5. **Assert**: User sees "Welcome" heading `(role=heading, name=Welcome)`
```

**Natural language format (examples that match):**
- `User navigates to /login`
- `User clicks 'Login' button`
- `User enters 'password123' in 'Password' field`
- `User should see 'Welcome'`

### Why Steps Are Blocked

1. **Pattern mismatch**: "Click on Submit" doesn't match any click patterns
2. **Missing hints**: No `(role=button, name=...)` locator hints
3. **Vague language**: "Verify the page loads correctly" has no specific assertion
4. **Novel phrasing**: Patterns don't cover all natural language variations

---

## Implementation Phases

### Phase 0: Multi-Variant Build System (Foundation)

**Priority:** FOUNDATIONAL (parallel with Phase 1)
**Effort:** 3-4 days
**Impact:** AutoGen works on Node.js 14, 16, 18, 20, 22 with both ESM and CommonJS

AutoGen must support the same multi-variant build system as @artk/core to work across different Node.js versions and module systems.

#### Variant Matrix

| Variant | Node.js | Module | Playwright | ES Target |
|---------|---------|--------|------------|-----------|
| `modern-esm` | 18+ | ESM | 1.57.x | ES2022 |
| `modern-cjs` | 18+ | CJS | 1.57.x | ES2022 |
| `legacy-16` | 16+ | CJS | 1.49.x | ES2021 |
| `legacy-14` | 14+ | CJS | 1.33.x | ES2020 |

#### 0.1 Create Build Configuration Files

**Files to create in `core/typescript/autogen/`:**

```
autogen/
├── tsconfig.json              # Modern ESM (default)
├── tsconfig.cjs.json          # Modern CJS
├── tsconfig.legacy-16.json    # Legacy Node 16
├── tsconfig.legacy-14.json    # Legacy Node 14
├── tsup.config.ts             # Multi-variant bundler config
└── package.json               # With conditional exports
```

**tsconfig.json (Modern ESM - Default):**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "declaration": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["**/*.test.ts", "**/__tests__/**"]
}
```

**tsconfig.legacy-16.json:**
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "target": "ES2021",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "outDir": "./dist-legacy-16"
  }
}
```

**tsconfig.legacy-14.json:**
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "outDir": "./dist-legacy-14"
  }
}
```

#### 0.2 Update package.json with Conditional Exports

**File:** `core/typescript/autogen/package.json`

```json
{
  "name": "@artk/autogen",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist-cjs/index.cjs"
    },
    "./cli": {
      "import": "./dist/cli/index.js",
      "require": "./dist-cjs/cli/index.cjs"
    }
  },
  "bin": {
    "artk-autogen": "./dist/cli/index.js"
  },
  "scripts": {
    "build": "npm run build:esm",
    "build:esm": "tsc -p tsconfig.json",
    "build:cjs": "tsc -p tsconfig.cjs.json",
    "build:legacy-16": "tsc -p tsconfig.legacy-16.json",
    "build:legacy-14": "tsc -p tsconfig.legacy-14.json",
    "build:variants": "npm run build:esm && npm run build:cjs && npm run build:legacy-16 && npm run build:legacy-14"
  },
  "peerDependencies": {
    "@playwright/test": ">=1.33.0"
  },
  "peerDependenciesMeta": {
    "@playwright/test": {
      "optional": false
    }
  }
}
```

#### 0.3 Create Variant-Specific Entry Points

**File:** `core/typescript/autogen/src/variants/index.ts` (NEW)

```typescript
/**
 * Variant detection and feature flags
 */
export interface VariantInfo {
  id: 'modern-esm' | 'modern-cjs' | 'legacy-16' | 'legacy-14';
  nodeVersion: number;
  moduleSystem: 'esm' | 'cjs';
  playwrightVersion: string;
  features: VariantFeatures;
}

export interface VariantFeatures {
  ariaSnapshots: boolean;
  clockApi: boolean;
  topLevelAwait: boolean;
  promiseAny: boolean;
}

export function detectVariant(): VariantInfo {
  const nodeVersion = parseInt(process.version.slice(1).split('.')[0], 10);
  const isESM = typeof import.meta !== 'undefined';

  if (nodeVersion >= 18) {
    return {
      id: isESM ? 'modern-esm' : 'modern-cjs',
      nodeVersion,
      moduleSystem: isESM ? 'esm' : 'cjs',
      playwrightVersion: '1.57.x',
      features: {
        ariaSnapshots: true,
        clockApi: true,
        topLevelAwait: true,
        promiseAny: true,
      },
    };
  } else if (nodeVersion >= 16) {
    return {
      id: 'legacy-16',
      nodeVersion,
      moduleSystem: 'cjs',
      playwrightVersion: '1.49.x',
      features: {
        ariaSnapshots: true,
        clockApi: true,
        topLevelAwait: true,
        promiseAny: true,
      },
    };
  } else {
    return {
      id: 'legacy-14',
      nodeVersion,
      moduleSystem: 'cjs',
      playwrightVersion: '1.33.x',
      features: {
        ariaSnapshots: false,
        clockApi: false,
        topLevelAwait: false,
        promiseAny: false,
      },
    };
  }
}
```

#### 0.4 Adapt Code Generation for Variant Features

**File:** `core/typescript/autogen/src/codegen/generateTest.ts`

Add variant-aware code generation:

```typescript
import { detectVariant, type VariantInfo } from '../variants/index.js';

/**
 * Generate code that's compatible with the target variant
 */
function renderPrimitiveForVariant(
  primitive: IRPrimitive,
  variant: VariantInfo,
  indent = ''
): string {
  // Check if primitive uses unsupported features
  if (primitive.type === 'ariaSnapshot' && !variant.features.ariaSnapshots) {
    return `${indent}// ARIA snapshots not supported in Playwright ${variant.playwrightVersion}\n${indent}// Falling back to text assertion\n${indent}await expect(page.locator('body')).toContainText('${primitive.expected}');`;
  }

  if (primitive.type === 'clockFreeze' && !variant.features.clockApi) {
    return `${indent}// Clock API not supported in Playwright ${variant.playwrightVersion}\n${indent}// Manual time mocking required`;
  }

  // Default rendering for supported primitives
  return renderPrimitive(primitive, indent);
}
```

#### 0.5 Create Build Scripts

**File:** `core/typescript/autogen/scripts/build-variants.sh` (NEW)

```bash
#!/bin/bash
set -e

echo "Building AutoGen variants..."

# Clean previous builds
rm -rf dist dist-cjs dist-legacy-16 dist-legacy-14

# Build Modern ESM (default)
echo "Building modern-esm..."
npx tsc -p tsconfig.json

# Build Modern CJS
echo "Building modern-cjs..."
npx tsc -p tsconfig.cjs.json

# Build Legacy Node 16
echo "Building legacy-16..."
npx tsc -p tsconfig.legacy-16.json

# Build Legacy Node 14
echo "Building legacy-14..."
npx tsc -p tsconfig.legacy-14.json

echo "All variants built successfully!"
```

**File:** `core/typescript/autogen/scripts/build-variants.ps1` (NEW)

```powershell
# Build all AutoGen variants
$ErrorActionPreference = "Stop"

Write-Host "Building AutoGen variants..."

# Clean previous builds
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue dist, dist-cjs, dist-legacy-16, dist-legacy-14

# Build each variant
Write-Host "Building modern-esm..."
npx tsc -p tsconfig.json

Write-Host "Building modern-cjs..."
npx tsc -p tsconfig.cjs.json

Write-Host "Building legacy-16..."
npx tsc -p tsconfig.legacy-16.json

Write-Host "Building legacy-14..."
npx tsc -p tsconfig.legacy-14.json

Write-Host "All variants built successfully!"
```

#### 0.6 Update CLI to Support Variant Selection

**File:** `core/typescript/autogen/src/cli/index.ts`

```typescript
import { detectVariant } from '../variants/index.js';

// Log variant info at startup
const variant = detectVariant();
if (!process.env.ARTK_QUIET) {
  console.log(`AutoGen running as ${variant.id} (Node ${variant.nodeVersion}, Playwright ${variant.playwrightVersion})`);
}

// Warn if using legacy variant
if (variant.id.startsWith('legacy-')) {
  console.warn(`⚠️  Running in legacy mode. Some features may be unavailable.`);
}
```

#### 0.7 Add Variant Tests

**File:** `core/typescript/autogen/src/__tests__/variants.test.ts` (NEW)

```typescript
import { describe, it, expect } from 'vitest';
import { detectVariant } from '../variants/index.js';

describe('Variant Detection', () => {
  it('should detect correct variant based on Node version', () => {
    const variant = detectVariant();
    const nodeVersion = parseInt(process.version.slice(1).split('.')[0], 10);

    if (nodeVersion >= 18) {
      expect(variant.id).toMatch(/^modern-/);
    } else if (nodeVersion >= 16) {
      expect(variant.id).toBe('legacy-16');
    } else {
      expect(variant.id).toBe('legacy-14');
    }
  });

  it('should have correct feature flags', () => {
    const variant = detectVariant();

    if (variant.id === 'legacy-14') {
      expect(variant.features.ariaSnapshots).toBe(false);
      expect(variant.features.clockApi).toBe(false);
    } else {
      expect(variant.features.ariaSnapshots).toBe(true);
      expect(variant.features.clockApi).toBe(true);
    }
  });
});
```

#### 0.8 CI/CD Pipeline Updates

**File:** `.github/workflows/autogen-build-variants.yml` (NEW)

```yaml
name: AutoGen Build Variants

on:
  push:
    paths:
      - 'core/typescript/autogen/**'
  pull_request:
    paths:
      - 'core/typescript/autogen/**'

jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [14, 16, 18, 20, 22]

    steps:
      - uses: actions/checkout@v4

      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}

      - name: Install dependencies
        working-directory: core/typescript/autogen
        run: npm ci

      - name: Build all variants
        working-directory: core/typescript/autogen
        run: npm run build:variants

      - name: Run tests
        working-directory: core/typescript/autogen
        run: npm test

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: autogen-build-node${{ matrix.node-version }}
          path: |
            core/typescript/autogen/dist/
            core/typescript/autogen/dist-cjs/
            core/typescript/autogen/dist-legacy-16/
            core/typescript/autogen/dist-legacy-14/
```

#### Phase 0 Tasks

| # | Task | File | Effort |
|---|------|------|--------|
| 0.1 | Create tsconfig.json (modern ESM) | autogen/tsconfig.json | 30min |
| 0.2 | Create tsconfig.cjs.json | autogen/tsconfig.cjs.json | 30min |
| 0.3 | Create tsconfig.legacy-16.json | autogen/tsconfig.legacy-16.json | 30min |
| 0.4 | Create tsconfig.legacy-14.json | autogen/tsconfig.legacy-14.json | 30min |
| 0.5 | Update package.json with exports | autogen/package.json | 1h |
| 0.6 | Create variants/index.ts | NEW file | 2h |
| 0.7 | Add variant-aware code generation | generateTest.ts | 3h |
| 0.8 | Create build-variants.sh | NEW file | 1h |
| 0.9 | Create build-variants.ps1 | NEW file | 1h |
| 0.10 | Update CLI with variant logging | cli/index.ts | 1h |
| 0.11 | Add variant detection tests | variants.test.ts | 2h |
| 0.12 | Create CI/CD pipeline | autogen-build-variants.yml | 2h |
| 0.13 | Test on Node 14, 16, 18, 20, 22 | Manual | 3h |
| 0.14 | Update documentation | README.md | 1h |

**Phase 0 Total Effort:** ~19 hours (3-4 days)

---

### Phase 0.5: LLKB CLI Consolidation & Documentation Verification

**Priority:** IMMEDIATE (blocks journey-implement workflow)
**Effort:** 1-2 days
**Impact:** Fixes broken LLKB mandatory gates, prevents future documentation-implementation gaps

#### Problem Statement

**Issue 1: CLI doesn't exist**
The `artk-llkb` npm package referenced in CLAUDE.md and prompts **does not exist**:
- LLKB library is fully implemented in `core/typescript/llkb/` (1,500+ lines)
- LLKB is exported from `@artk/core/llkb` and works programmatically
- But `npx artk-llkb export --for-autogen` and other CLI commands fail
- Agents skip the "mandatory" LLKB gate because the tool doesn't exist

**Root Cause 1:** Library was implemented, but CLI entry point was never created.

**Issue 2: Wrong path resolution**
Even when LLKB is initialized, agents look in the **wrong directory**:
- LLKB is installed at: `artk-e2e/.artk/llkb/`
- But prompts reference: `.artk/llkb/` (project root)
- Agent reports "NOT INITIALIZED" even though LLKB exists

**Root Cause 2:** Prompts use `.artk/llkb/` instead of `<harnessRoot>/.artk/llkb/`

**Issue 3: Bootstrap creates `.artk/` at project root**
The bootstrap scripts and CLI create a SECOND `.artk/` directory at the project root:
- `scripts/bootstrap.sh:1282` - `mkdir -p "$TARGET_PROJECT/.artk"`
- `scripts/bootstrap.ps1:1393` - `$ArtkDir = Join-Path $TargetProject ".artk"`
- `cli/src/utils/lock-manager.ts:27` - `path.join(targetPath, '.artk')`
- `cli/src/utils/install-logger.ts:29` - `path.join(targetPath, '.artk')`

**Result:** Two `.artk/` directories:
```
<project>/
├── .artk/                    # Created by bootstrap (wrong location)
│   ├── context.json
│   ├── install.lock
│   └── install.log
└── artk-e2e/
    └── .artk/                # Created by discover-foundation (correct)
        └── llkb/
```

**Root Cause 3:** Bootstrap was designed before the `artk-e2e/` harness structure was finalized.

**Design Decision Needed:** Should `.artk/` be at project root OR inside `artk-e2e/`?
- **Option A:** All `.artk/` inside `artk-e2e/` (consistent, but requires bootstrap fix)
- **Option B:** Keep context.json at root, LLKB inside artk-e2e (current broken state)

**Recommendation:** Option A - Move everything to `artk-e2e/.artk/`

#### Solution: Consolidate into @artk/cli

Instead of creating a separate `artk-llkb` package, add LLKB as a subcommand of the main CLI:

```bash
# Instead of (doesn't work):
npx artk-llkb export --for-autogen

# Use (will work):
artk llkb export --for-autogen
```

#### 0.5.1 Design Subcommand Structure

```
artk init [path]           # Existing
artk check                 # Existing
artk upgrade [path]        # Existing
artk doctor [path]         # Existing
artk uninstall <path>      # Existing
artk llkb init             # NEW: Initialize LLKB directory structure
artk llkb export           # NEW: Export LLKB for AutoGen
artk llkb learn            # NEW: Record learning events
artk llkb health           # NEW: Check LLKB health
artk llkb stats            # NEW: Show statistics
artk llkb prune            # NEW: Clean old data
artk llkb check-updates    # NEW: Check for outdated tests
artk llkb update-test      # NEW: Update single test
artk llkb update-tests     # NEW: Update all tests
```

#### 0.5.2 Implement LLKB Subcommand Group

**Directory:** `packages/cli/src/commands/llkb/`

```
llkb/
├── index.ts          # Subcommand registration
├── init.ts           # artk llkb init (CRITICAL - called by discover-foundation)
├── export.ts         # artk llkb export --for-autogen
├── learn.ts          # artk llkb learn --type component ...
├── health.ts         # artk llkb health
├── stats.ts          # artk llkb stats
├── prune.ts          # artk llkb prune --history-retention-days 90
├── check-updates.ts  # artk llkb check-updates --tests-dir
├── update-test.ts    # artk llkb update-test --test <path>
└── update-tests.ts   # artk llkb update-tests --tests-dir
```

**Example implementation (`export.ts`):**

```typescript
import { runExportForAutogen } from '@artk/core/llkb';

export async function llkbExport(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      'for-autogen': { type: 'boolean', default: false },
      output: { type: 'string', short: 'o' },
      'min-confidence': { type: 'string', default: '0.7' },
      'dry-run': { type: 'boolean', default: false },
    },
  });

  if (values['for-autogen']) {
    const result = await runExportForAutogen({
      outputDir: values.output || process.cwd(),
      minConfidence: parseFloat(values['min-confidence']),
      dryRun: values['dry-run'],
    });

    console.log(`Exported ${result.entriesExported} LLKB entries`);
    if (result.configFile) console.log(`Config: ${result.configFile}`);
    if (result.glossaryFile) console.log(`Glossary: ${result.glossaryFile}`);
  }
}
```

**Example implementation (`init.ts`) - CRITICAL:**

```typescript
import { initializeLLKB } from '@artk/core/llkb';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export async function llkbInit(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      'llkb-root': { type: 'string', default: '.artk/llkb' },
      force: { type: 'boolean', default: false },
    },
  });

  const llkbRoot = values['llkb-root'];

  // Check if already initialized
  if (existsSync(join(llkbRoot, 'config.yml')) && !values.force) {
    console.log(`LLKB already initialized at ${llkbRoot}`);
    console.log('Use --force to reinitialize');
    return;
  }

  console.log(`Initializing LLKB at ${llkbRoot}...`);

  const result = await initializeLLKB(llkbRoot);

  if (result.success) {
    console.log('✅ LLKB initialized successfully');
    console.log(`   Created: ${llkbRoot}/config.yml`);
    console.log(`   Created: ${llkbRoot}/lessons.json`);
    console.log(`   Created: ${llkbRoot}/components.json`);
    console.log(`   Created: ${llkbRoot}/analytics.json`);
    console.log(`   Created: ${llkbRoot}/patterns/`);
  } else {
    console.error(`❌ Failed to initialize LLKB: ${result.error}`);
    process.exit(1);
  }
}
```

#### 0.5.3 Update discover-foundation to Call LLKB Init

**File:** `prompts/artk.discover-foundation.md`

The prompt has Step F11 (LLKB Initialization) with full specification but **never calls** the init function. Add this execution step:

```markdown
### Step F11.9: Execute LLKB Initialization

Run the LLKB initialization command:

\`\`\`bash
artk llkb init --llkb-root .artk/llkb
\`\`\`

**Expected output:**
\`\`\`
✅ LLKB initialized successfully
   Created: .artk/llkb/config.yml
   Created: .artk/llkb/lessons.json
   Created: .artk/llkb/components.json
   Created: .artk/llkb/analytics.json
   Created: .artk/llkb/patterns/
\`\`\`

**If LLKB already exists:**
- Check if migration is needed (legacy format)
- Use `--force` to reinitialize if corrupted
```

#### 0.5.4 Wire to Main CLI

**File:** `packages/cli/src/index.ts`

```typescript
import { llkbCommand } from './commands/llkb/index.js';

// In command registration:
program
  .command('llkb')
  .description('LLKB (Lessons Learned Knowledge Base) operations')
  .action(llkbCommand);
```

#### 0.5.4 Update All Documentation References

Replace all occurrences in documentation:

| Before | After |
|--------|-------|
| `npx artk-llkb export --for-autogen` | `artk llkb export --for-autogen` |
| `npx artk-llkb health` | `artk llkb health` |
| `npx artk-llkb learn --type ...` | `artk llkb learn --type ...` |
| `npx artk-llkb stats` | `artk llkb stats` |
| `npx artk-llkb prune` | `artk llkb prune` |
| `npx artk-llkb check-updates` | `artk llkb check-updates` |
| `npx artk-llkb update-test` | `artk llkb update-test` |
| `npx artk-llkb update-tests` | `artk llkb update-tests` |

**Files to update:**
- `CLAUDE.md` (LLKB-AutoGen Integration section)
- `prompts/artk.journey-implement.md` (Step 2.5)
- `prompts/artk.journey-verify.md` (learning hooks)
- `packages/cli/README.md`

#### 0.5.5 Fix LLKB Path Resolution (CRITICAL)

**Problem:** Prompts reference `.artk/llkb/` but LLKB is installed at `artk-e2e/.artk/llkb/`.

**The Fix:** All LLKB path references must use `<harnessRoot>` variable, not hardcoded `.artk/llkb/`.

| Before (Wrong) | After (Correct) |
|----------------|-----------------|
| `.artk/llkb/` | `<harnessRoot>/.artk/llkb/` |
| `Directory: .artk/llkb/ does not exist` | `Directory: artk-e2e/.artk/llkb/` |

**Update prompts to:**

1. **Detect harnessRoot first:**
   ```markdown
   # In journey-implement prompt, add at start:
   HARNESS_ROOT = detect harness root (look for artk-e2e/ or artk.config.yml)
   LLKB_ROOT = ${HARNESS_ROOT}/.artk/llkb
   ```

2. **Use LLKB_ROOT consistently:**
   ```bash
   # Wrong:
   artk llkb export --llkb-root .artk/llkb

   # Correct:
   artk llkb export --llkb-root artk-e2e/.artk/llkb
   ```

3. **Check LLKB existence correctly:**
   ```markdown
   # Wrong check:
   IF directory .artk/llkb/ exists

   # Correct check:
   IF directory <harnessRoot>/.artk/llkb/ exists
   ```

**Files to update:**
- `prompts/artk.journey-implement.md` - Use `<harnessRoot>/.artk/llkb/`
- `prompts/artk.journey-verify.md` - Use `<harnessRoot>/.artk/llkb/`
- `CLAUDE.md` - Document correct path structure

#### 0.5.6 Add Documentation Verification Gate (ARTK Repo Only)

**Purpose:** This CI check runs in the **ARTK repository only** to ensure prompts shipped with ARTK don't reference non-existent CLI commands. Target projects don't have CLAUDE.md - this prevents us from shipping broken prompts.

**File:** `scripts/verify-doc-commands.ts` (NEW - in ARTK repo)

```typescript
#!/usr/bin/env ts-node
/**
 * Verify that all CLI commands referenced in ARTK documentation exist.
 * This runs in CI for the ARTK repo, NOT in target projects.
 */
import { readFileSync, existsSync } from 'node:fs';
import { glob } from 'fast-glob';

interface CommandReference {
  command: string;
  file: string;
  line: number;
}

async function main(): Promise<void> {
  const docFiles = await glob([
    'CLAUDE.md',
    'prompts/**/*.md',
    'packages/cli/README.md',
  ]);

  const references: CommandReference[] = [];

  // Parse each file for CLI references
  for (const file of docFiles) {
    const content = readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Match patterns: npx artk-*, artk *, npx @artk/*
      const patterns = [
        /npx\s+(artk-\w+)/g,           // npx artk-llkb, npx artk-autogen
        /npx\s+(@artk\/\w+)/g,         // npx @artk/cli
        /\bartk\s+(\w+(?:\s+\w+)?)/g,  // artk llkb export, artk init
      ];

      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(line)) !== null) {
          references.push({
            command: match[1],
            file,
            line: i + 1,
          });
        }
      }
    }
  }

  // Verify each command exists
  const errors: string[] = [];
  const validCommands = getValidCommands();

  for (const ref of references) {
    if (!isValidCommand(ref.command, validCommands)) {
      errors.push(`${ref.file}:${ref.line}: Unknown command "${ref.command}"`);
    }
  }

  if (errors.length > 0) {
    console.error('❌ Documentation references non-existent commands:\n');
    for (const error of errors) {
      console.error(`  ${error}`);
    }
    process.exit(1);
  }

  console.log(`✅ All ${references.length} command references are valid`);
}

function getValidCommands(): Set<string> {
  // Parse package.json bin entries and known subcommands
  return new Set([
    'artk',
    'artk init',
    'artk check',
    'artk upgrade',
    'artk doctor',
    'artk uninstall',
    'artk llkb',
    'artk llkb export',
    'artk llkb learn',
    'artk llkb health',
    'artk llkb stats',
    'artk llkb prune',
    'artk llkb check-updates',
    'artk llkb update-test',
    'artk llkb update-tests',
    'artk-autogen',
    '@artk/cli',
    '@artk/core',
  ]);
}

function isValidCommand(cmd: string, valid: Set<string>): boolean {
  // Check exact match or prefix match
  if (valid.has(cmd)) return true;
  for (const v of valid) {
    if (cmd.startsWith(v + ' ')) return true;
  }
  return false;
}

main().catch(console.error);
```

#### 0.5.6 Add CI Workflow

**File:** `.github/workflows/verify-docs.yml` (NEW)

```yaml
name: Verify Documentation

on:
  push:
    paths:
      - 'CLAUDE.md'
      - 'prompts/**/*.md'
      - 'packages/cli/**'
  pull_request:
    paths:
      - 'CLAUDE.md'
      - 'prompts/**/*.md'
      - 'packages/cli/**'

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - name: Verify CLI commands in documentation
        run: npx ts-node scripts/verify-doc-commands.ts
```

#### 0.5.7 Add npm Script

**File:** `package.json` (root)

```json
{
  "scripts": {
    "verify:docs": "ts-node scripts/verify-doc-commands.ts"
  }
}
```

#### Phase 0.5 Tasks

| # | Task | File | Effort |
|---|------|------|--------|
| 0.5.1 | Create llkb command group directory | packages/cli/src/commands/llkb/ | 30min |
| 0.5.2 | **Implement init.ts (CRITICAL)** | llkb/init.ts | 1h |
| 0.5.3 | Implement export.ts | llkb/export.ts | 1h |
| 0.5.4 | Implement learn.ts | llkb/learn.ts | 1h |
| 0.5.5 | Implement health.ts | llkb/health.ts | 30min |
| 0.5.6 | Implement stats.ts | llkb/stats.ts | 30min |
| 0.5.7 | Implement prune.ts | llkb/prune.ts | 30min |
| 0.5.8 | Implement check-updates.ts | llkb/check-updates.ts | 45min |
| 0.5.9 | Implement update-test.ts | llkb/update-test.ts | 45min |
| 0.5.10 | Implement update-tests.ts | llkb/update-tests.ts | 45min |
| 0.5.11 | Wire llkb to main CLI | packages/cli/src/index.ts | 30min |
| 0.5.12 | Update CLAUDE.md | CLAUDE.md | 1h |
| 0.5.13 | Update journey-implement prompt (commands) | prompts/artk.journey-implement.md | 30min |
| 0.5.14 | Update journey-verify prompt (commands) | prompts/artk.journey-verify.md | 30min |
| 0.5.15 | **Update discover-foundation prompt** | prompts/artk.discover-foundation.md | 30min |
| 0.5.16 | **Fix LLKB path resolution in journey-implement** | prompts/artk.journey-implement.md | 1h |
| 0.5.17 | **Fix LLKB path resolution in journey-verify** | prompts/artk.journey-verify.md | 30min |
| 0.5.18 | **Fix bootstrap.sh - move .artk inside artk-e2e** | scripts/bootstrap.sh | 1h |
| 0.5.19 | **Fix bootstrap.ps1 - move .artk inside artk-e2e** | scripts/bootstrap.ps1 | 1h |
| 0.5.20 | **Fix lock-manager.ts path** | cli/src/utils/lock-manager.ts | 30min |
| 0.5.21 | **Fix install-logger.ts path** | cli/src/utils/install-logger.ts | 30min |
| 0.5.22 | Create verify-doc-commands.ts (ARTK repo CI) | scripts/verify-doc-commands.ts | 2h |
| 0.5.23 | Create CI workflow | .github/workflows/verify-docs.yml | 30min |
| 0.5.24 | Add tests for llkb commands | packages/cli/src/commands/llkb/__tests__/ | 2h |

**Phase 0.5 Total Effort:** ~19 hours (2-3 days)

#### How This Prevents Future Gaps

| Gap Type | Prevention Mechanism |
|----------|----------------------|
| CLI command documented but not implemented | CI verification gate fails on PR |
| Multiple separate CLIs with inconsistent behavior | Consolidated into single `artk` CLI |
| Documentation drifts from implementation | `verify:docs` runs on every push |
| New features added without documentation | Documentation-first development enforced by CI |
| Agents reference non-existent commands | Prompts are verified before deployment |
| Wrong path resolution (`.artk/` vs `artk-e2e/.artk/`) | Use `<harnessRoot>` variable consistently |

---

### Phase 1: Enhanced Error Feedback (Position D)

**Priority:** IMMEDIATE
**Effort:** 2-3 days
**Impact:** 40% reduction in blocked steps through AI auto-fix

#### 1.1 Create Enhanced BlockedStepAnalysis Interface

**File:** `core/typescript/autogen/src/mapping/stepMapper.ts`

```typescript
/**
 * Enhanced analysis of why a step was blocked
 */
export interface BlockedStepAnalysis {
  /** Original step text */
  step: string;
  /** Reason for blocking */
  reason: string;
  /** Suggested fixes with priority */
  suggestions: StepSuggestion[];
  /** Nearest pattern that almost matched */
  nearestPattern?: {
    name: string;
    distance: number; // Levenshtein distance
    exampleMatch: string;
    mismatchReason: string;
  };
  /** Suggested machine hint to add */
  machineHintSuggestion?: string;
  /** Category of the blocked step */
  category: 'navigation' | 'interaction' | 'assertion' | 'wait' | 'unknown';
}

/**
 * A specific suggestion for fixing a blocked step
 */
export interface StepSuggestion {
  /** Priority (1 = highest) */
  priority: number;
  /** Suggested replacement text */
  text: string;
  /** Explanation of why this would work */
  explanation: string;
  /** Confidence that this fix is correct (0-1) */
  confidence: number;
}
```

#### 1.2 Implement Pattern Distance Calculation

**File:** `core/typescript/autogen/src/mapping/patternDistance.ts` (NEW)

```typescript
/**
 * Calculate Levenshtein distance between step text and pattern expectations
 */
export function calculatePatternDistance(
  text: string,
  patternExample: string
): number {
  // Levenshtein distance implementation
}

/**
 * Find the nearest pattern for a given step text
 */
export function findNearestPattern(text: string): NearestPatternResult | null {
  // Iterate all patterns, calculate distance, return nearest
}

/**
 * Explain why a pattern didn't match
 */
export function explainMismatch(
  text: string,
  pattern: PatternDefinition
): string {
  // Analyze what's different between text and pattern
}
```

#### 1.3 Enhance suggestImprovements Function

**File:** `core/typescript/autogen/src/mapping/stepMapper.ts`

Replace the existing `suggestImprovements` function (lines 379-418) with:

```typescript
/**
 * Generate detailed suggestions for blocked steps
 */
export function suggestImprovements(blockedSteps: StepMappingResult[]): BlockedStepAnalysis[] {
  return blockedSteps.map(step => {
    const text = step.sourceText;
    const lowerText = text.toLowerCase();
    const category = categorizeStep(lowerText);

    const analysis: BlockedStepAnalysis = {
      step: text,
      reason: step.message || 'Could not map step',
      suggestions: [],
      category,
    };

    // Find nearest pattern
    const nearest = findNearestPattern(text);
    if (nearest) {
      analysis.nearestPattern = nearest;
    }

    // Generate category-specific suggestions
    switch (category) {
      case 'navigation':
        analysis.suggestions = getNavigationSuggestions(text);
        break;
      case 'interaction':
        analysis.suggestions = getInteractionSuggestions(text);
        analysis.machineHintSuggestion = inferMachineHint(text);
        break;
      case 'assertion':
        analysis.suggestions = getAssertionSuggestions(text);
        break;
      case 'wait':
        analysis.suggestions = getWaitSuggestions(text);
        break;
      default:
        analysis.suggestions = getGenericSuggestions(text);
    }

    return analysis;
  });
}

function categorizeStep(text: string): BlockedStepAnalysis['category'] {
  if (text.includes('navigate') || text.includes('go to') || text.includes('open')) {
    return 'navigation';
  }
  if (text.includes('click') || text.includes('fill') || text.includes('enter') ||
      text.includes('select') || text.includes('check')) {
    return 'interaction';
  }
  if (text.includes('see') || text.includes('visible') || text.includes('verify') ||
      text.includes('assert') || text.includes('confirm') || text.includes('should')) {
    return 'assertion';
  }
  if (text.includes('wait') || text.includes('load') || text.includes('until')) {
    return 'wait';
  }
  return 'unknown';
}
```

#### 1.4 Update CLI Output

**File:** `core/typescript/autogen/src/cli/generate.ts`

Add structured JSON output for blocked steps:

```typescript
// After line 156, add:
if (result.blockedSteps && result.blockedSteps.length > 0) {
  const analyses = suggestImprovements(result.blockedSteps);

  console.log('\n🔧 Blocked Step Analysis:');
  for (const analysis of analyses) {
    console.log(`\n  Step: "${analysis.step}"`);
    console.log(`  Category: ${analysis.category}`);
    console.log(`  Reason: ${analysis.reason}`);

    if (analysis.nearestPattern) {
      console.log(`  Nearest pattern: ${analysis.nearestPattern.name}`);
      console.log(`  Example that works: "${analysis.nearestPattern.exampleMatch}"`);
    }

    console.log('  Suggestions:');
    for (const suggestion of analysis.suggestions) {
      console.log(`    ${suggestion.priority}. ${suggestion.text}`);
      console.log(`       (${suggestion.explanation})`);
    }

    if (analysis.machineHintSuggestion) {
      console.log(`  Add hint: ${analysis.machineHintSuggestion}`);
    }
  }

  // Also output as JSON for AI consumption
  if (process.env.ARTK_JSON_OUTPUT) {
    writeFileSync(
      join(outputDir, 'blocked-steps-analysis.json'),
      JSON.stringify(analyses, null, 2)
    );
  }
}
```

#### 1.5 Update journey-implement Prompt

**File:** `prompts/artk.journey-implement.md`

Add auto-fix loop after AutoGen:

```markdown
### Step 2.6: AutoGen Output Analysis and Auto-Fix

After running AutoGen, analyze blocked steps and auto-fix:

1. **Check for blocked steps:**
   ```bash
   # If blocked-steps-analysis.json exists, process it
   if [ -f "<harnessRoot>/tests/blocked-steps-analysis.json" ]; then
     # Read the file and apply fixes
   fi
   ```

2. **For each blocked step:**
   - Read the suggestion from `blocked-steps-analysis.json`
   - Apply the highest-priority suggestion to the journey file
   - Add machine hints if suggested

3. **Re-run AutoGen after fixes:**
   ```bash
   npx artk-autogen generate \
     --config <harnessRoot>/autogen.config.yml \
     -o <testsDir> -m <journeyPath>
   ```

4. **Iterate up to 3 times** or until no blocked steps remain
```

#### Phase 1 Tasks

| # | Task | File | Effort |
|---|------|------|--------|
| 1.1 | Create `BlockedStepAnalysis` interface | stepMapper.ts | 1h |
| 1.2 | Implement `StepSuggestion` type | stepMapper.ts | 30min |
| 1.3 | Create patternDistance.ts module | NEW file | 3h |
| 1.4 | Implement `findNearestPattern()` | patternDistance.ts | 2h |
| 1.5 | Implement `explainMismatch()` | patternDistance.ts | 1h |
| 1.6 | Rewrite `suggestImprovements()` | stepMapper.ts | 3h |
| 1.7 | Add category-specific suggestion generators | stepMapper.ts | 2h |
| 1.8 | Update CLI output with structured analysis | generate.ts | 2h |
| 1.9 | Add JSON output mode | generate.ts | 1h |
| 1.10 | Update journey-implement prompt with auto-fix | artk.journey-implement.md | 2h |
| 1.11 | Add tests for new functionality | stepMapper.test.ts | 3h |

**Phase 1 Total Effort:** ~20 hours (2-3 days)

---

### Phase 2: Journey Format Enforcement (Position A)

**Priority:** SHORT TERM
**Effort:** 2-3 days
**Impact:** 90% of new journeys will be AutoGen-compatible

#### 2.1 Add Format Validation to Journey Parser

**File:** `core/typescript/autogen/src/journey/validator.ts` (NEW)

```typescript
/**
 * Validation result for journey format
 */
export interface JourneyValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  autoFixable: AutoFixSuggestion[];
}

export interface ValidationError {
  line: number;
  step: string;
  error: string;
  suggestion?: string;
}

export interface ValidationWarning {
  line: number;
  step: string;
  warning: string;
}

export interface AutoFixSuggestion {
  line: number;
  original: string;
  fixed: string;
  confidence: number;
}

/**
 * Validate journey format for AutoGen compatibility
 */
export function validateJourneyFormat(journeyContent: string): JourneyValidationResult {
  const result: JourneyValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    autoFixable: [],
  };

  // Parse steps
  const steps = parseStepsFromContent(journeyContent);

  for (const step of steps) {
    // Check 1: Does step have machine hints?
    if (!hasMachineHints(step.text)) {
      result.warnings.push({
        line: step.line,
        step: step.text,
        warning: 'Step has no machine hints (role=, testid=, name=)',
      });
    }

    // Check 2: Does step match any AutoGen pattern?
    const matchResult = matchPattern(step.text);
    if (!matchResult) {
      result.errors.push({
        line: step.line,
        step: step.text,
        error: 'Step does not match any AutoGen pattern',
        suggestion: getSuggestionForStep(step.text),
      });
      result.valid = false;

      // Check if we can auto-fix
      const autoFix = attemptAutoFix(step.text);
      if (autoFix && autoFix.confidence > 0.7) {
        result.autoFixable.push({
          line: step.line,
          original: step.text,
          fixed: autoFix.text,
          confidence: autoFix.confidence,
        });
      }
    }
  }

  return result;
}
```

#### 2.2 Add Pre-Generation Validation CLI Command

**File:** `core/typescript/autogen/src/cli/validate.ts`

Add new validation mode:

```typescript
export async function runValidate(args: string[]): Promise<void> {
  // ... existing code ...

  // Add --format flag for AutoGen format validation
  if (values.format) {
    const content = readFileSync(journeyPath, 'utf-8');
    const result = validateJourneyFormat(content);

    if (!result.valid) {
      console.error('\n❌ Journey is not AutoGen-compatible:');
      for (const error of result.errors) {
        console.error(`  Line ${error.line}: ${error.step}`);
        console.error(`    Error: ${error.error}`);
        if (error.suggestion) {
          console.error(`    Suggestion: ${error.suggestion}`);
        }
      }

      if (result.autoFixable.length > 0) {
        console.log('\n🔧 Auto-fixable issues:');
        for (const fix of result.autoFixable) {
          console.log(`  Line ${fix.line}:`);
          console.log(`    Original: ${fix.original}`);
          console.log(`    Fixed: ${fix.fixed}`);
          console.log(`    Confidence: ${(fix.confidence * 100).toFixed(0)}%`);
        }

        if (values.fix) {
          // Apply auto-fixes
          const fixedContent = applyAutoFixes(content, result.autoFixable);
          writeFileSync(journeyPath, fixedContent);
          console.log('\n✅ Auto-fixes applied');
        }
      }

      process.exit(1);
    }

    console.log('✅ Journey is AutoGen-compatible');
  }
}
```

#### 2.3 Update journey-clarify Prompt

**File:** `prompts/artk.journey-clarify.md`

Add mandatory format enforcement:

```markdown
### Step 4: Machine Hint Injection (MANDATORY)

**GATE:** Every interaction step MUST have machine hints before marking journey as clarified.

For each step that involves UI interaction:

1. **Identify the element type:**
   - Button → `(role=button, name=...)`
   - Link → `(role=link, name=...)`
   - Text input → `(testid=...) or (role=textbox, name=...)`
   - Checkbox → `(role=checkbox, name=...)`
   - Select/dropdown → `(role=combobox, name=...)`

2. **Add the hint to the step text:**
   ```markdown
   # Before:
   - Click the Submit button

   # After:
   - Click the Submit button `(role=button, name=Submit)`
   ```

3. **Use structured format when possible:**
   ```markdown
   1. **Action**: Click Login button `(role=button, name=Log In)`
   2. **Wait for**: Dashboard to load `(signal=networkidle)`
   3. **Assert**: User sees welcome message `(role=heading, name=Welcome)`
   ```

### Step 5: Validate Before Clarification

Before setting `status: clarified`, run validation:

```bash
npx artk-autogen validate --format <journeyPath>
```

If validation fails:
1. Review the errors
2. Fix each step with machine hints
3. Re-run validation
4. Only proceed to `clarified` when validation passes
```

#### 2.4 Add Format Gate to journey-implement

**File:** `prompts/artk.journey-implement.md`

Add validation gate before AutoGen:

```markdown
### Step 2.4.5: Pre-Generation Format Validation (MANDATORY GATE)

Before calling AutoGen, validate the journey format:

```bash
npx artk-autogen validate --format <journeyPath>
```

**If validation fails:**
1. Do NOT proceed to AutoGen
2. Return to journey-clarify to fix format issues
3. Or apply auto-fixes if available:
   ```bash
   npx artk-autogen validate --format --fix <journeyPath>
   ```
4. Re-run validation until it passes

**Only proceed when validation passes.**
```

#### Phase 2 Tasks

| # | Task | File | Effort |
|---|------|------|--------|
| 2.1 | Create validator.ts module | NEW file | 3h |
| 2.2 | Implement `validateJourneyFormat()` | validator.ts | 3h |
| 2.3 | Implement `attemptAutoFix()` | validator.ts | 2h |
| 2.4 | Add `--format` flag to validate CLI | validate.ts | 2h |
| 2.5 | Add `--fix` flag for auto-fixing | validate.ts | 2h |
| 2.6 | Update journey-clarify prompt | artk.journey-clarify.md | 2h |
| 2.7 | Update journey-implement prompt | artk.journey-implement.md | 1h |
| 2.8 | Add tests for validation | validator.test.ts | 3h |

**Phase 2 Total Effort:** ~18 hours (2-3 days)

---

### Phase 3: Targeted Pattern Expansion (Position B)

**Priority:** MEDIUM TERM
**Effort:** 3-4 days
**Impact:** 30% reduction in remaining blocked steps

#### 3.1 Add Telemetry for Blocked Steps

**File:** `core/typescript/autogen/src/mapping/telemetry.ts` (NEW)

```typescript
/**
 * Record blocked step for pattern analysis
 */
export interface BlockedStepRecord {
  timestamp: string;
  journeyId: string;
  stepText: string;
  category: string;
  suggestedFix?: string;
  userFix?: string; // Captured if user manually fixes
}

/**
 * Append blocked step to telemetry file
 */
export function recordBlockedStep(record: BlockedStepRecord): void {
  const telemetryPath = join(process.cwd(), '.artk', 'blocked-steps-telemetry.jsonl');
  appendFileSync(telemetryPath, JSON.stringify(record) + '\n');
}

/**
 * Analyze telemetry to find top blocked patterns
 */
export function analyzeBlockedPatterns(): PatternGap[] {
  const telemetryPath = join(process.cwd(), '.artk', 'blocked-steps-telemetry.jsonl');
  if (!existsSync(telemetryPath)) return [];

  const records = readFileSync(telemetryPath, 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map(line => JSON.parse(line) as BlockedStepRecord);

  // Group by similarity and count
  const groups = groupBySimilarity(records);

  // Return top gaps
  return groups
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
}
```

#### 3.2 Add CLI Command for Pattern Analysis

**File:** `core/typescript/autogen/src/cli/patterns.ts` (NEW)

```typescript
export async function runPatternAnalysis(): Promise<void> {
  const gaps = analyzeBlockedPatterns();

  console.log('Top 20 Pattern Gaps:\n');
  for (const gap of gaps) {
    console.log(`  ${gap.count}x: "${gap.exampleText}"`);
    console.log(`       Category: ${gap.category}`);
    console.log(`       Suggested pattern: ${gap.suggestedPattern || 'N/A'}`);
    console.log();
  }
}
```

#### 3.3 Add Common Missing Patterns

**File:** `core/typescript/autogen/src/mapping/patterns.ts`

Based on analysis, add patterns for common gaps:

```typescript
// Additional click patterns
const additionalClickPatterns: PatternMatch[] = [
  {
    // "Click on Submit" (missing "on" support)
    regex: /^(?:user\s+)?clicks?\s+on\s+(?:the\s+)?['"]?(.+?)['"]?\s*(?:button|link)?$/i,
    handler: (match) => ({
      type: 'click',
      locator: { strategy: 'role', value: 'button', options: { name: match[1] } },
    }),
  },
  {
    // "Press the Enter key" or "Hit Enter"
    regex: /^(?:user\s+)?(?:press(?:es)?|hits?)\s+(?:the\s+)?(\w+)\s+key$/i,
    handler: (match) => ({
      type: 'press',
      key: match[1],
    }),
  },
];

// Additional assertion patterns
const additionalAssertionPatterns: PatternMatch[] = [
  {
    // "Verify the dashboard is showing/displayed"
    regex: /^(?:verify|confirm|ensure)\s+(?:that\s+)?(?:the\s+)?['"]?(.+?)['"]?\s+(?:is\s+)?(?:showing|displayed|visible)$/i,
    handler: (match) => ({
      type: 'expectVisible',
      locator: { strategy: 'text', value: match[1] },
    }),
  },
  {
    // "The page should show 'Welcome'"
    regex: /^(?:the\s+)?page\s+should\s+(?:show|display|contain)\s+['"](.+?)['"]$/i,
    handler: (match) => ({
      type: 'expectContainsText',
      locator: { strategy: 'role', value: 'main' },
      text: match[1],
    }),
  },
];

// Additional fill patterns
const additionalFillPatterns: PatternMatch[] = [
  {
    // "Fill in the email address" (without explicit value)
    regex: /^(?:user\s+)?fill(?:s)?\s+(?:in\s+)?(?:the\s+)?['"]?(.+?)['"]?\s*(?:field|input)?$/i,
    handler: (match) => ({
      type: 'fill',
      locator: { strategy: 'label', value: match[1] },
      value: { type: 'actor', value: match[1].toLowerCase().replace(/\s+/g, '_') },
    }),
  },
  {
    // "Type 'password' into the Password field"
    regex: /^(?:user\s+)?types?\s+['"](.+?)['"]\s+into\s+(?:the\s+)?['"]?(.+?)['"]?\s*(?:field|input)?$/i,
    handler: (match) => ({
      type: 'fill',
      locator: { strategy: 'label', value: match[2] },
      value: { type: 'literal', value: match[1] },
    }),
  },
];
```

#### 3.4 Pattern Versioning

**File:** `core/typescript/autogen/src/mapping/patterns.ts`

Add version tracking for patterns:

```typescript
export const PATTERN_VERSION = '1.2.0';

export interface PatternMetadata {
  name: string;
  version: string;
  addedDate: string;
  source: 'core' | 'llkb' | 'telemetry';
  matchCount: number; // For telemetry
}

// Track pattern usage
export function recordPatternMatch(patternName: string): void {
  // Increment match count for telemetry
}
```

#### Phase 3 Tasks

| # | Task | File | Effort |
|---|------|------|--------|
| 3.1 | Create telemetry.ts module | NEW file | 2h |
| 3.2 | Implement `recordBlockedStep()` | telemetry.ts | 1h |
| 3.3 | Implement `analyzeBlockedPatterns()` | telemetry.ts | 3h |
| 3.4 | Create patterns.ts CLI command | NEW file | 2h |
| 3.5 | Analyze real blocked steps data | Manual | 2h |
| 3.6 | Add 10-15 new patterns based on analysis | patterns.ts | 4h |
| 3.7 | Add pattern versioning | patterns.ts | 2h |
| 3.8 | Update generate.ts to record telemetry | generate.ts | 1h |
| 3.9 | Add tests for new patterns | patterns.test.ts | 4h |

**Phase 3 Total Effort:** ~21 hours (3-4 days)

---

### Phase 4: LLKB Learning Loop

**Priority:** LONG TERM
**Effort:** 4-5 days
**Impact:** Continuous improvement, diminishing blocked steps over time

#### 4.1 LLKB Pattern Extension Schema

**File:** `core/typescript/autogen/src/llkb/patternExtension.ts` (NEW)

```typescript
/**
 * LLKB-learned pattern extension
 */
export interface LearnedPattern {
  id: string;
  originalText: string;
  normalizedText: string;
  mappedPrimitive: IRPrimitive;
  confidence: number;
  sourceJourneys: string[];
  successCount: number;
  failCount: number;
  lastUsed: string;
  promotedToCore: boolean;
}

/**
 * Record a successful pattern transformation
 */
export function recordPatternSuccess(
  originalText: string,
  normalizedText: string,
  primitive: IRPrimitive,
  journeyId: string
): void {
  const patterns = loadLearnedPatterns();
  const existing = patterns.find(p => p.normalizedText === normalizedText);

  if (existing) {
    existing.successCount++;
    existing.confidence = recalculateConfidence(existing);
    existing.lastUsed = new Date().toISOString();
    if (!existing.sourceJourneys.includes(journeyId)) {
      existing.sourceJourneys.push(journeyId);
    }
  } else {
    patterns.push({
      id: generatePatternId(),
      originalText,
      normalizedText,
      mappedPrimitive: primitive,
      confidence: 0.5, // Initial confidence
      sourceJourneys: [journeyId],
      successCount: 1,
      failCount: 0,
      lastUsed: new Date().toISOString(),
      promotedToCore: false,
    });
  }

  saveLearnedPatterns(patterns);
}

/**
 * Promote high-confidence patterns to core
 */
export function promotePatterns(): PromotedPattern[] {
  const patterns = loadLearnedPatterns();
  const toPromote = patterns.filter(p =>
    p.confidence >= 0.9 &&
    p.successCount >= 5 &&
    p.sourceJourneys.length >= 2 &&
    !p.promotedToCore
  );

  // Generate regex patterns for promotion
  return toPromote.map(p => ({
    pattern: p,
    generatedRegex: generateRegexFromExamples(p),
    priority: p.successCount * p.confidence,
  }));
}
```

#### 4.2 Integration with AutoGen Pipeline

**File:** `core/typescript/autogen/src/mapping/stepMapper.ts`

Add LLKB lookup before pattern matching:

```typescript
export function mapStepText(
  text: string,
  options: StepMapperOptions = {}
): StepMappingResult {
  // ... existing code ...

  // NEW: Check LLKB learned patterns first
  const llkbMatch = matchLlkbPattern(processedText);
  if (llkbMatch) {
    recordPatternUsage(llkbMatch.patternId, 'llkb');
    return {
      primitive: llkbMatch.primitive,
      sourceText: text,
      isAssertion: isAssertion(llkbMatch.primitive),
      message: `Matched LLKB pattern: ${llkbMatch.patternId}`,
    };
  }

  // Then try core patterns
  let primitive = matchPattern(processedText);

  // ... rest of existing code ...
}
```

#### 4.3 Learning Hook in Journey Verification

**File:** `prompts/artk.journey-verify.md`

Add learning capture:

```markdown
### Step 5: Record Learning Events

After successful test verification:

1. **For each step that was initially blocked but manually fixed:**
   ```bash
   npx artk-llkb learn \
     --type pattern \
     --journey <journeyId> \
     --success \
     --original "<originalStepText>" \
     --fixed "<fixedStepText>"
   ```

2. **For successful test runs:**
   ```bash
   npx artk-llkb record-success \
     --journey <journeyId> \
     --test <testPath>
   ```

This enables LLKB to learn from successful transformations.
```

#### 4.4 LLKB CLI Commands for Pattern Management

**File:** `core/typescript/autogen/src/cli/llkb-patterns.ts` (NEW)

```typescript
export async function runLlkbPatterns(args: string[]): Promise<void> {
  const command = args[0];

  switch (command) {
    case 'list':
      // List all learned patterns
      const patterns = loadLearnedPatterns();
      console.log(`${patterns.length} learned patterns:\n`);
      for (const p of patterns.slice(0, 20)) {
        console.log(`  [${p.confidence.toFixed(2)}] "${p.originalText}"`);
        console.log(`       → ${p.mappedPrimitive.type}`);
        console.log(`       Success: ${p.successCount}, Fail: ${p.failCount}`);
      }
      break;

    case 'promote':
      // Check and promote high-confidence patterns
      const toPromote = promotePatterns();
      console.log(`${toPromote.length} patterns ready for promotion:\n`);
      for (const p of toPromote) {
        console.log(`  ${p.pattern.originalText}`);
        console.log(`  Regex: ${p.generatedRegex}`);
        console.log(`  Priority: ${p.priority.toFixed(1)}`);
      }
      break;

    case 'export':
      // Export to autogen-llkb.config.yml
      exportPatternsToConfig();
      break;

    case 'prune':
      // Remove low-confidence patterns
      prunePatterns({ minConfidence: 0.3, minSuccess: 1 });
      break;
  }
}
```

#### Phase 4 Tasks

| # | Task | File | Effort |
|---|------|------|--------|
| 4.1 | Create patternExtension.ts module | NEW file | 3h |
| 4.2 | Implement `LearnedPattern` schema | patternExtension.ts | 1h |
| 4.3 | Implement `recordPatternSuccess()` | patternExtension.ts | 2h |
| 4.4 | Implement `promotePatterns()` | patternExtension.ts | 3h |
| 4.5 | Implement `generateRegexFromExamples()` | patternExtension.ts | 4h |
| 4.6 | Add LLKB lookup to stepMapper | stepMapper.ts | 2h |
| 4.7 | Create llkb-patterns.ts CLI | NEW file | 3h |
| 4.8 | Update journey-verify prompt | artk.journey-verify.md | 2h |
| 4.9 | Implement confidence recalculation | patternExtension.ts | 2h |
| 4.10 | Add tests for LLKB patterns | patternExtension.test.ts | 4h |

**Phase 4 Total Effort:** ~26 hours (4-5 days)

---

## Timeline Summary

| Phase | Priority | Effort | Cumulative Impact |
|-------|----------|--------|-------------------|
| Phase 0: Multi-Variant Build | FOUNDATIONAL | 3-4 days | Works on Node 14-22, ESM+CJS |
| Phase 0.5: LLKB CLI & Doc Verification | IMMEDIATE | 1-2 days | Fixes broken LLKB gates, prevents future gaps |
| Phase 1: Error Feedback | IMMEDIATE | 2-3 days | 40% reduction in blocked steps |
| Phase 2: Format Enforcement | SHORT TERM | 2-3 days | 90% new journeys compatible |
| Phase 3: Pattern Expansion | MEDIUM TERM | 3-4 days | 30% of remaining blocked |
| Phase 4: LLKB Learning | LONG TERM | 4-5 days | Continuous improvement |

**Total Effort:** 15-21 days (spread across 5-8 weeks)

**Parallelization:**
- Phase 0 and Phase 0.5 can run in parallel (different codebases)
- Phase 0.5 and Phase 1 can run in parallel (different concerns)
- Phase 0.5 should complete before Phase 4 (LLKB Learning depends on working LLKB CLI)

---

## Quick Wins (Can Implement Today)

### 1. Update journey-implement to Always Use Structured Format

**File:** `prompts/artk.journey-implement.md`

Add at the beginning of AutoGen section:

```markdown
### Step 2.3.5: Format Journey for AutoGen (MANDATORY)

Before calling AutoGen, ensure journey steps use structured format:

**Convert natural language steps:**
```
Before: Click the login button
After:  1. **Action**: Click Login button `(role=button, name=Log In)`

Before: Enter the username
After:  2. **Action**: Fill Username field `(testid=username-input)` with actor.username

Before: Verify the dashboard loads
After:  3. **Assert**: Dashboard heading is visible `(role=heading, name=Dashboard)`
```

**Required machine hints for each UI element type:**
| Element | Hint Format |
|---------|-------------|
| Button | `(role=button, name=...)` |
| Link | `(role=link, name=...)` |
| Text input | `(testid=...)` or `(role=textbox, name=...)` |
| Heading | `(role=heading, name=...)` |
| Generic text | `(text=...)` |
```

### 2. Add Validation Before AutoGen

Add to `artk.journey-implement.md`:

```markdown
### Pre-AutoGen Checklist

Before running AutoGen, verify:
- [ ] Journey has `status: clarified`
- [ ] Journey has `machineHints: true` in frontmatter
- [ ] All interaction steps have machine hints (role=, testid=, name=)
- [ ] Steps use structured format (**Action**: ..., **Assert**: ...)

If any check fails, return to journey-clarify first.
```

---

## Success Metrics

| Metric | Current | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|--------|---------|---------|---------|---------|---------|
| Blocked step rate | ~80% | ~48% | ~10% | ~7% | <5% |
| Manual intervention required | ~90% | ~60% | ~15% | ~10% | <5% |
| Time to first working test | ~2h | ~1h | ~20min | ~15min | ~10min |
| Auto-fix success rate | 0% | ~40% | ~70% | ~80% | ~90% |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Pattern expansion causes conflicts | Add pattern priority and conflict detection tests |
| LLKB learns bad patterns | Require minimum confidence (0.9) and multiple sources (2+) for promotion |
| Format enforcement breaks existing journeys | Grandfather existing journeys, only enforce on new ones |
| Auto-fix applies wrong transformations | Require user confirmation for low-confidence fixes (<0.7) |

---

## Appendix A: AutoGen Pattern Reference

### Currently Supported Patterns

**Navigation:**
- `User navigates to /path`
- `User opens /path`
- `Go to /path`

**Click:**
- `User clicks 'Button Name' button`
- `Click the 'Label' button`
- `User presses 'Submit'`

**Fill:**
- `User enters 'value' in 'Field' field`
- `Enter 'value' into 'Field'`
- `Type 'value' in the 'Field' input`

**Assertions:**
- `User should see 'Text'`
- `'Element' is visible`
- `Page shows 'Content'`

**Wait:**
- `Wait for network idle`
- `Wait for 'Element' to appear`

### Patterns to Add (Phase 3)

Based on common gaps:
1. `Click on [element]` (with "on")
2. `Verify [element] is showing/displayed`
3. `Fill in [field]` (without value)
4. `Type [value] into [field]`
5. `Press Enter/Tab key`
6. `The page should show [text]`
7. `Confirm that [assertion]`
8. `Make sure [assertion]`

---

## Appendix B: File Changes Summary

### Phase 0: Multi-Variant Build Files

| File | Purpose |
|------|---------|
| `autogen/tsconfig.json` | Modern ESM TypeScript config |
| `autogen/tsconfig.cjs.json` | Modern CJS TypeScript config |
| `autogen/tsconfig.legacy-16.json` | Legacy Node 16 TypeScript config |
| `autogen/tsconfig.legacy-14.json` | Legacy Node 14 TypeScript config |
| `autogen/src/variants/index.ts` | Variant detection and feature flags |
| `autogen/scripts/build-variants.sh` | Unix build script |
| `autogen/scripts/build-variants.ps1` | Windows build script |
| `.github/workflows/autogen-build-variants.yml` | CI/CD pipeline |

### Phase 0.5: LLKB CLI & Documentation Verification Files

| File | Purpose |
|------|---------|
| `packages/cli/src/commands/llkb/index.ts` | LLKB subcommand registration |
| `packages/cli/src/commands/llkb/init.ts` | `artk llkb init` - **CRITICAL** (called by discover-foundation) |
| `packages/cli/src/commands/llkb/export.ts` | `artk llkb export` command |
| `packages/cli/src/commands/llkb/learn.ts` | `artk llkb learn` command |
| `packages/cli/src/commands/llkb/health.ts` | `artk llkb health` command |
| `packages/cli/src/commands/llkb/stats.ts` | `artk llkb stats` command |
| `packages/cli/src/commands/llkb/prune.ts` | `artk llkb prune` command |
| `packages/cli/src/commands/llkb/check-updates.ts` | `artk llkb check-updates` command |
| `packages/cli/src/commands/llkb/update-test.ts` | `artk llkb update-test` command |
| `packages/cli/src/commands/llkb/update-tests.ts` | `artk llkb update-tests` command |
| `scripts/verify-doc-commands.ts` | Documentation verification script (ARTK repo CI only) |
| `.github/workflows/verify-docs.yml` | CI workflow for doc verification (ARTK repo only) |

### Phases 1-4: New Files to Create

| File | Purpose |
|------|---------|
| `autogen/src/mapping/patternDistance.ts` | Pattern distance calculation |
| `autogen/src/journey/validator.ts` | Journey format validation |
| `autogen/src/mapping/telemetry.ts` | Blocked step telemetry |
| `autogen/src/cli/patterns.ts` | Pattern analysis CLI |
| `autogen/src/llkb/patternExtension.ts` | LLKB pattern learning |
| `autogen/src/cli/llkb-patterns.ts` | LLKB patterns CLI |

### Files to Modify

| File | Changes |
|------|---------|
| `autogen/package.json` | Conditional exports, variant scripts |
| `autogen/src/codegen/generateTest.ts` | Variant-aware code generation |
| `autogen/src/cli/index.ts` | Variant detection logging |
| `autogen/src/mapping/stepMapper.ts` | Enhanced suggestions, LLKB lookup |
| `autogen/src/mapping/patterns.ts` | New patterns, versioning |
| `autogen/src/cli/generate.ts` | Structured output, telemetry |
| `autogen/src/cli/validate.ts` | Format validation flag |
| `packages/cli/src/index.ts` | Wire LLKB subcommand group |
| `CLAUDE.md` | Update `npx artk-llkb` → `artk llkb` |
| `prompts/artk.discover-foundation.md` | Add `artk llkb init` call to Step F11 |
| `prompts/artk.journey-implement.md` | Format enforcement, auto-fix loop, LLKB command updates |
| `prompts/artk.journey-clarify.md` | Mandatory hints |
| `prompts/artk.journey-verify.md` | Learning hooks, LLKB command updates |
| `packages/cli/README.md` | Update LLKB command documentation |
| `scripts/bootstrap.sh` | Move `.artk/` creation inside `artk-e2e/` |
| `scripts/bootstrap.ps1` | Move `.artk/` creation inside `artk-e2e/` |
| `cli/src/utils/lock-manager.ts` | Use harness root for `.artk/` path |
| `cli/src/utils/install-logger.ts` | Use harness root for `.artk/` path |

---

## Conclusion

This implementation plan addresses the AutoGen empty stubs problem through a systematic 6-phase approach:

0. **Phase 0** (Foundational): Multi-variant build system for Node 14-22 compatibility
0.5. **Phase 0.5** (Immediate): LLKB CLI consolidation and documentation verification gates
1. **Phase 1** (Immediate): Better error feedback enables AI-assisted fixing
2. **Phase 2** (Short-term): Format enforcement prevents new issues
3. **Phase 3** (Medium-term): Targeted patterns address common gaps
4. **Phase 4** (Long-term): Learning loop provides continuous improvement

**Parallelization Strategy:**
- Phase 0, Phase 0.5, and Phase 1 can all run in parallel (different codebases/concerns)
- Phase 0.5 must complete before Phase 4 (LLKB Learning depends on working LLKB CLI)

The plan prioritizes low-risk, high-impact changes first, with each phase building on the previous one. Implementation can proceed incrementally, with measurable improvements at each phase.

**Recommended starting point:**
1. Start Phase 0.5 (LLKB CLI) first - this unblocks the broken mandatory gate
2. Run Phase 0 (multi-variant builds) and Phase 1 (error feedback) in parallel
3. Proceed with Phases 2-4 sequentially

**Key Lesson Learned:** Phase 0.5 also introduces documentation verification gates to prevent future documentation-implementation gaps. This systemic fix ensures CI fails if documented commands don't exist.
