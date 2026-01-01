# ARTK Core v1 Bonus Modules

**Feature Branch**: `001-artk-core-v1`
**Created**: 2026-01-01
**Status**: Implemented

## Overview

The ARTK Core v1 implementation includes 3 bonus modules that were implemented beyond the original specification. These modules provide essential capabilities for project detection, installation scaffolding, and multi-target support.

| Module | Purpose | Status |
|--------|---------|--------|
| `detection/` | Frontend framework detection | Implemented |
| `install/` | Project scaffolding | Implemented |
| `targets/` | Multi-target support | Implemented |

These modules were not part of User Stories 1-7 but were added to enable the `/init` workflow and support advanced multi-frontend testing scenarios.

---

## Module 1: Detection

### Purpose

The `detection` module provides intelligent frontend framework detection using multi-signal weighted scoring. It identifies React, Vue, Angular, Next.js, and Nuxt.js applications within a project or monorepo structure.

### Use Cases

- **Project initialization**: Automatically detect frontend applications during `/init` command
- **Monorepo analysis**: Find all frontend apps in a multi-package workspace
- **Configuration generation**: Generate target-specific configurations based on detected frameworks
- **Git submodule discovery**: Identify frontend apps in Git submodules

### Main Exports

#### Core Classes

```typescript
// Main detector class
class FrontendDetector {
  async detectAll(
    rootPath: string,
    options?: FrontendDetectorOptions
  ): Promise<DetectionResult[]>
}

// Git submodule checker
class SubmoduleChecker {
  async check(rootPath: string): Promise<SubmoduleInfo[]>
}
```

#### Detection Components

```typescript
// Package.json scanner
class PackageScanner {
  async scan(packageJsonPath: string): Promise<PackageScanResult>
}

// Entry file detector
class EntryFileDetector {
  async detect(directoryPath: string): Promise<EntryFileResult>
}

// Directory heuristics analyzer
class DirectoryAnalyzer {
  async analyze(directoryPath: string): Promise<DirectoryAnalysisResult>
}
```

#### Types

```typescript
interface DetectionResult {
  path: string;                       // Absolute path to frontend
  type: ArtkTargetType;               // 'react' | 'vue' | 'angular' | etc.
  confidence: ArtkConfidenceLevel;    // 'high' | 'medium' | 'low'
  score: number;                      // Weighted signal score
  signals: DetectionSignal[];         // Individual detection signals
  name?: string;                      // Suggested target name
}

interface FrontendDetectorOptions {
  maxDepth?: number;                  // Default: 3
  minScore?: number;                  // Default: 10
  maxResults?: number;                // Default: 5
  includeLowConfidence?: boolean;     // Default: true
  relativeTo?: string;                // Base path for relative paths
}
```

### Multi-Signal Weighted Scoring

The detector uses multiple signals with weighted scoring:

| Signal Type | Weight | Examples |
|-------------|--------|----------|
| Package dependencies | 100 | `react`, `vue`, `@angular/core` |
| Package devDependencies | 80 | `@vitejs/plugin-react`, `vue-loader` |
| Entry files | 90 | `index.tsx`, `main.ts`, `app.vue` |
| Configuration files | 70 | `vite.config.ts`, `angular.json`, `nuxt.config.ts` |
| Directory structure | 60 | `src/components/`, `pages/`, `app/` |

**Confidence Levels:**
- **High**: Score >= 200 (strong signals from multiple sources)
- **Medium**: Score >= 100 (moderate signals)
- **Low**: Score >= 10 (weak signals, possibly a false positive)

### Example Usage

#### Basic Detection

```typescript
import { FrontendDetector } from '@artk/core/detection';

const detector = new FrontendDetector();
const results = await detector.detectAll('/path/to/monorepo');

for (const result of results) {
  console.log(`Found ${result.type} at ${result.path}`);
  console.log(`  Confidence: ${result.confidence} (score: ${result.score})`);
  console.log(`  Signals: ${result.signals.length} detected`);
}

// Example output:
// Found react at /path/to/monorepo/packages/user-portal
//   Confidence: high (score: 280)
//   Signals: 5 detected
```

#### With Options

```typescript
const results = await detector.detectAll('/path/to/monorepo', {
  maxDepth: 2,                    // Only scan 2 levels deep
  minScore: 150,                  // Only high-confidence results
  includeLowConfidence: false,    // Exclude low confidence
  maxResults: 3,                  // Limit to 3 results
});
```

#### Submodule Detection

```typescript
import { SubmoduleChecker } from '@artk/core/detection';

const checker = new SubmoduleChecker();
const submodules = await checker.check('/path/to/monorepo');

for (const submodule of submodules) {
  console.log(`Submodule: ${submodule.name}`);
  console.log(`  Path: ${submodule.path}`);
  console.log(`  URL: ${submodule.url}`);
}
```

### Integration with Other Modules

#### With `install` Module

```typescript
import { FrontendDetector } from '@artk/core/detection';
import { generatePlaywrightConfig } from '@artk/core/install';

// Detect frontends
const detector = new FrontendDetector();
const results = await detector.detectAll(projectRoot);

// Generate config with detected targets
const targets = results.map(r => ({
  name: r.name || path.basename(r.path),
  type: r.type,
  path: r.path,
}));

const config = generatePlaywrightConfig({ targets });
```

#### With `targets` Module

```typescript
import { FrontendDetector } from '@artk/core/detection';
import { TargetResolver } from '@artk/core/targets';

// Detection informs target configuration
const results = await detector.detectAll(projectRoot);

// Target resolver uses detected type for framework-specific logic
const resolver = new TargetResolver(config);
const target = resolver.resolve('user-portal'); // Uses detected type
```

### Configuration

No configuration required. The detector is self-contained and uses built-in heuristics.

---

## Module 2: Install

### Purpose

The `install` module generates project scaffolding files for ARTK E2E test suites. It creates `package.json`, `playwright.config.ts`, and `.gitignore` files with sensible defaults and support for multi-target configurations.

### Use Cases

- **Project initialization**: Generate starter files during `/init` command
- **Target scaffolding**: Create configurations for newly detected targets
- **Upgrade support**: Regenerate configs when updating ARTK Core
- **Custom installations**: Generate configs with project-specific settings

### Main Exports

#### Generator Functions

```typescript
// Generate package.json
export function generatePackageJson(
  options?: PackageJsonOptions
): string;

// Generate playwright.config.ts
export function generatePlaywrightConfig(
  options?: PlaywrightConfigOptions
): string;

// Generate .gitignore
export function generateGitignore(
  options?: GitignoreOptions
): string;
```

#### Types

```typescript
interface PackageJsonOptions {
  projectName?: string;                     // Default: 'artk-e2e-tests'
  description?: string;                     // Default: 'ARTK E2E Testing Suite'
  artkCoreVersion?: string;                 // Default: '1.0.0'
  playwrightVersion?: string;               // Default: '^1.40.0'
  additionalScripts?: Record<string, string>;
  additionalDependencies?: Record<string, string>;
  additionalDevDependencies?: Record<string, string>;
  includeTypeScript?: boolean;              // Default: true
  typescriptVersion?: string;               // Default: '^5.3.3'
  vendored?: boolean;                       // Default: true
}

interface PlaywrightConfigOptions {
  targets?: TargetConfig[];                 // Detected targets
  baseUrl?: string;                         // Default base URL
  outputDir?: string;                       // Test results directory
  retries?: number;                         // Test retry count
  workers?: number;                         // Parallel workers
  timeout?: number;                         // Test timeout (ms)
  useAuthentication?: boolean;              // Enable auth fixtures
  reporters?: string[];                     // Reporter list
}

interface GitignoreOptions {
  includeNodeModules?: boolean;             // Default: true
  includeTestResults?: boolean;             // Default: true
  includeAuthStates?: boolean;              // Default: true
  includePlaywrightCache?: boolean;         // Default: true
  additionalPatterns?: string[];            // Custom ignore patterns
}
```

### Example Usage

#### Generate package.json

```typescript
import { generatePackageJson } from '@artk/core/install';
import { writeFile } from 'node:fs/promises';

const packageJson = generatePackageJson({
  projectName: 'my-e2e-tests',
  description: 'E2E tests for my application',
  playwrightVersion: '^1.41.0',
  additionalScripts: {
    'test:smoke': 'playwright test --grep @smoke',
  },
});

await writeFile('artk-e2e/package.json', packageJson);
```

**Generated Output:**

```json
{
  "name": "my-e2e-tests",
  "version": "1.0.0",
  "description": "E2E tests for my application",
  "type": "module",
  "scripts": {
    "test": "playwright test",
    "test:smoke": "playwright test --grep @smoke",
    "test:ui": "playwright test --ui",
    "test:debug": "playwright test --debug"
  },
  "dependencies": {
    "@artk/core": "file:./.core"
  },
  "devDependencies": {
    "@playwright/test": "^1.41.0",
    "typescript": "^5.3.3"
  }
}
```

#### Generate playwright.config.ts

```typescript
import { generatePlaywrightConfig } from '@artk/core/install';

const config = generatePlaywrightConfig({
  targets: [
    { name: 'user-portal', type: 'react', path: './apps/user-portal' },
    { name: 'admin-portal', type: 'angular', path: './apps/admin' },
  ],
  baseUrl: 'http://localhost:3000',
  workers: 4,
  retries: 2,
  useAuthentication: true,
  reporters: ['html', 'json'],
});

await writeFile('artk-e2e/playwright.config.ts', config);
```

**Generated Output:**

```typescript
import { defineConfig } from '@playwright/test';
import { createPlaywrightConfig } from '@artk/core/harness';

export default defineConfig(
  createPlaywrightConfig({
    baseURL: 'http://localhost:3000',
    workers: 4,
    retries: 2,
    reporter: [['html'], ['json']],
    use: {
      trace: 'on-first-retry',
      screenshot: 'only-on-failure',
    },
  })
);
```

#### Generate .gitignore

```typescript
import { generateGitignore } from '@artk/core/install';

const gitignore = generateGitignore({
  includeNodeModules: true,
  includeTestResults: true,
  includeAuthStates: true,
  additionalPatterns: [
    '.env.local',
    'coverage/',
  ],
});

await writeFile('artk-e2e/.gitignore', gitignore);
```

**Generated Output:**

```
# Dependencies
node_modules/

# Test results
test-results/
playwright-report/
playwright/.cache/

# Authentication
.auth-states/

# Environment
.env.local

# Coverage
coverage/
```

### Integration with Other Modules

#### With `detection` Module

```typescript
import { FrontendDetector } from '@artk/core/detection';
import {
  generatePackageJson,
  generatePlaywrightConfig,
} from '@artk/core/install';

// Detect frontends
const detector = new FrontendDetector();
const detected = await detector.detectAll(projectRoot);

// Generate config based on detection
const config = generatePlaywrightConfig({
  targets: detected.map(d => ({
    name: d.name || path.basename(d.path),
    type: d.type,
    path: path.relative(projectRoot, d.path),
  })),
});
```

#### With `config` Module

Generated `playwright.config.ts` imports from `harness` module:

```typescript
import { createPlaywrightConfig } from '@artk/core/harness';
```

This ensures generated configs use ARTK Core's configuration system.

### Configuration

No runtime configuration required. Generators are invoked with options at generation time.

---

## Module 3: Targets

### Purpose

The `targets` module provides multi-target support for ARTK E2E architecture. It resolves targets by name, manages target-specific configurations, and provides environment-aware URL resolution.

### Use Cases

- **Multi-frontend testing**: Test multiple frontend applications from a single test suite
- **Monorepo support**: Test different apps in a monorepo with isolated configurations
- **Environment switching**: Resolve target URLs based on environment (local, dev, staging, prod)
- **Target isolation**: Maintain separate test data, auth states, and configs per target

### Main Exports

#### Core Classes

```typescript
// Target resolver
class TargetResolver {
  constructor(config: ArtkConfig, options?: TargetResolverOptions)

  resolve(targetName: string): ResolvedTarget
  getUrl(targetName: string, environment?: string): string
  getAllTargets(): ResolvedTarget[]
  hasTarget(targetName: string): boolean
}
```

#### Helper Functions

```typescript
// Resolve a target by name
export function resolveTarget(
  config: ArtkConfig,
  targetName: string
): ResolvedTarget;

// Get target URL for environment
export function getTargetUrl(
  config: ArtkConfig,
  targetName: string,
  environment?: string
): string;

// Get base URL for a target
export function getTargetBaseUrl(
  config: ArtkConfig,
  targetName: string,
  environment?: string
): string;
```

#### Types

```typescript
interface ResolvedTarget {
  name: string;                     // Target name
  path: string;                     // Relative path to frontend
  type: ArtkTargetType;            // 'react' | 'vue' | 'angular' | etc.
  baseUrl: string;                 // Base URL for current environment
  environments: Record<string, ArtkEnvironmentUrls>;  // All environments
  metadata?: Record<string, unknown>;  // Custom metadata
}

interface TargetResolverOptions {
  defaultTarget?: string;          // Default target if none specified
  defaultEnvironment?: string;     // Default: 'local'
  throwOnMissing?: boolean;        // Default: true
}

interface ArtkConfigTarget {
  name: string;
  type: ArtkTargetType;
  path: string;
  environments: Record<string, ArtkEnvironmentUrls>;
  metadata?: Record<string, unknown>;
}
```

### Example Usage

#### Basic Target Resolution

```typescript
import { TargetResolver } from '@artk/core/targets';
import { loadConfig } from '@artk/core/config';

const config = await loadConfig();
const resolver = new TargetResolver(config);

// Resolve a target
const target = resolver.resolve('user-portal');
console.log(target.name);        // 'user-portal'
console.log(target.type);        // 'react'
console.log(target.path);        // './apps/user-portal'
console.log(target.baseUrl);     // 'http://localhost:3000'
```

#### Environment-Aware URL Resolution

```typescript
// Get URL for specific environment
const stagingUrl = resolver.getUrl('user-portal', 'staging');
console.log(stagingUrl);  // 'https://staging.example.com'

const prodUrl = resolver.getUrl('user-portal', 'production');
console.log(prodUrl);     // 'https://www.example.com'

// Use current environment (from ARTK_ENV)
const currentUrl = resolver.getUrl('user-portal');
console.log(currentUrl);  // Uses ARTK_ENV or default
```

#### Multi-Target Testing

```typescript
import { test } from '@playwright/test';
import { TargetResolver } from '@artk/core/targets';
import { loadConfig } from '@artk/core/config';

test.describe('Multi-target smoke tests', () => {
  let resolver: TargetResolver;

  test.beforeAll(async () => {
    const config = await loadConfig();
    resolver = new TargetResolver(config);
  });

  test('user portal health check', async ({ page }) => {
    const target = resolver.resolve('user-portal');
    await page.goto(target.baseUrl);
    await expect(page).toHaveTitle(/User Portal/);
  });

  test('admin portal health check', async ({ page }) => {
    const target = resolver.resolve('admin-portal');
    await page.goto(target.baseUrl);
    await expect(page).toHaveTitle(/Admin/);
  });
});
```

#### Target-Specific Configuration

```typescript
import { TargetResolver } from '@artk/core/targets';

const resolver = new TargetResolver(config, {
  defaultTarget: 'user-portal',
  defaultEnvironment: 'staging',
});

// If no target specified, uses defaultTarget
const target = resolver.resolve();  // Resolves to 'user-portal'

// List all available targets
const allTargets = resolver.getAllTargets();
console.log(allTargets.map(t => t.name));  // ['user-portal', 'admin-portal']

// Check if target exists
if (resolver.hasTarget('api-gateway')) {
  // ...
}
```

### Integration with Other Modules

#### With `config` Module

Targets are defined in `artk.config.yml`:

```yaml
targets:
  - name: user-portal
    type: react
    path: ./apps/user-portal
    environments:
      local:
        baseUrl: http://localhost:3000
      staging:
        baseUrl: https://staging.example.com
      production:
        baseUrl: https://www.example.com

  - name: admin-portal
    type: angular
    path: ./apps/admin
    environments:
      local:
        baseUrl: http://localhost:4000
      staging:
        baseUrl: https://admin-staging.example.com
```

The `TargetResolver` reads from this configuration.

#### With `fixtures` Module

```typescript
import { test as base } from '@playwright/test';
import { TargetResolver } from '@artk/core/targets';
import { loadConfig } from '@artk/core/config';

// Create target-aware fixture
export const test = base.extend<{ targetPage: Page }>({
  targetPage: async ({ page }, use, testInfo) => {
    const config = await loadConfig();
    const resolver = new TargetResolver(config);

    // Get target from test project name
    const targetName = testInfo.project.name;
    const target = resolver.resolve(targetName);

    await page.goto(target.baseUrl);
    await use(page);
  },
});
```

#### With `detection` Module

```typescript
import { FrontendDetector } from '@artk/core/detection';
import { generateTargetConfig } from '@artk/core/targets';

// Detect frontends
const detector = new FrontendDetector();
const detected = await detector.detectAll(projectRoot);

// Generate target configs
const targetConfigs = detected.map(d => ({
  name: d.name || path.basename(d.path),
  type: d.type,
  path: path.relative(projectRoot, d.path),
  environments: {
    local: { baseUrl: 'http://localhost:3000' },
  },
}));

// Add to artk.config.yml
```

### Configuration

Targets are configured in `artk.config.yml` under the `targets` section:

```yaml
targets:
  - name: <target-name>
    type: <react|vue|angular|next|nuxt>
    path: <relative-path-to-frontend>
    environments:
      <env-name>:
        baseUrl: <base-url>
        # ... other environment-specific settings
    metadata:
      # Optional custom metadata
      team: frontend
      priority: high
```

**Environment Resolution Order:**

1. `ARTK_ENV` environment variable
2. `defaultEnvironment` in resolver options
3. `'local'` (hardcoded default)

---

## Summary

The three bonus modules provide essential infrastructure for ARTK Core v1:

| Module | Key Feature | Primary Use |
|--------|-------------|-------------|
| `detection/` | Multi-signal weighted scoring | Automatic frontend discovery |
| `install/` | Configuration generators | Project scaffolding |
| `targets/` | Multi-target resolution | Monorepo and multi-app testing |

### Integration Flow

```
┌─────────────┐
│  detection  │ ─── Scans project ──→ Finds frontends
└─────────────┘
       │
       ├─── Detected targets ──→ ┌──────────┐
       │                          │ install  │ ─── Generates configs
       │                          └──────────┘
       │
       └─── Target metadata ──→ ┌──────────┐
                                 │ targets  │ ─── Resolves at runtime
                                 └──────────┘
```

### Version

All three modules are included in **ARTK Core v1.0.0**.

### Future Enhancements

Potential improvements for future versions:

- **detection**: Add support for Svelte, Solid, Qwik frameworks
- **install**: Add GitHub Actions workflow generation
- **targets**: Add dynamic target discovery (no config required)

---

**Created**: 2026-01-01
**Last Updated**: 2026-01-01
**Status**: Documentation Complete
