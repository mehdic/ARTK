# ARTK AutoGen - Remaining Features Implementation Plan

**Date:** 2026-01-03
**Topic:** Deep implementation plan for 5 remaining spec gaps
**Status:** Planning Complete

---

## Executive Summary

This document provides detailed implementation plans for the 5 remaining features needed to reach full spec compliance:

1. **Journey Frontmatter Update** - Bi-directional traceability
2. **Config Version Field** - Schema migration support
3. **Completion Signals Parsing** - Auto-generate final assertions
4. **Managed Blocks Strategy** - Alternative to AST editing
5. **Install/Upgrade Instance APIs** - Project bootstrapping

**Estimated Total Effort:** 3-4 days of focused implementation

---

## Feature 1: Journey Frontmatter Update

### Problem Statement

When tests are generated from a Journey, the source Journey file is never updated. This breaks **Principle V: Traceability** - users can't tell which Journeys have tests, and the `tests[]` array in frontmatter remains empty.

### Spec Requirement (Section 6.2)

```yaml
# Journey frontmatter after generation
tests:
  - path: "tests/journeys/login.spec.ts"
    generated: "2026-01-03T10:30:00Z"
    hash: "a1b2c3d4"  # Content hash for change detection
modules:
  - "auth"
  - "navigation"
```

### Implementation Design

#### 1.1 Core Function: `updateJourneyFrontmatter()`

```typescript
// src/journey/updater.ts

import { readFileSync, writeFileSync } from 'node:fs';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { createHash } from 'node:crypto';

export interface JourneyTestEntry {
  path: string;
  generated: string;
  hash: string;
}

export interface JourneyUpdateOptions {
  journeyPath: string;
  testPath: string;
  testContent: string;
  modules?: string[];
}

export interface JourneyUpdateResult {
  success: boolean;
  previousTests: JourneyTestEntry[];
  updatedTests: JourneyTestEntry[];
  modulesAdded: string[];
}

/**
 * Update Journey frontmatter with generated test info
 */
export function updateJourneyFrontmatter(
  options: JourneyUpdateOptions
): JourneyUpdateResult {
  const { journeyPath, testPath, testContent, modules = [] } = options;

  // Read Journey file
  const content = readFileSync(journeyPath, 'utf-8');

  // Split frontmatter and body
  const { frontmatter, body } = splitJourneyContent(content);

  // Parse frontmatter
  const parsed = parseYaml(frontmatter);

  // Store previous state
  const previousTests = [...(parsed.tests || [])];

  // Calculate content hash
  const hash = createHash('sha256')
    .update(testContent)
    .digest('hex')
    .substring(0, 8);

  // Create/update test entry
  const testEntry: JourneyTestEntry = {
    path: testPath,
    generated: new Date().toISOString(),
    hash,
  };

  // Update tests array (replace existing or add new)
  parsed.tests = parsed.tests || [];
  const existingIndex = parsed.tests.findIndex(
    (t: JourneyTestEntry) => t.path === testPath
  );

  if (existingIndex >= 0) {
    parsed.tests[existingIndex] = testEntry;
  } else {
    parsed.tests.push(testEntry);
  }

  // Update modules array
  const existingModules = new Set(parsed.modules || []);
  const modulesAdded: string[] = [];

  for (const mod of modules) {
    if (!existingModules.has(mod)) {
      modulesAdded.push(mod);
      existingModules.add(mod);
    }
  }

  parsed.modules = Array.from(existingModules).sort();

  // Reconstruct file
  const newFrontmatter = stringifyYaml(parsed, {
    lineWidth: 0, // Prevent line wrapping
    defaultKeyType: 'PLAIN',
    defaultStringType: 'QUOTE_DOUBLE',
  });

  const newContent = `---\n${newFrontmatter}---\n${body}`;

  // Write back
  writeFileSync(journeyPath, newContent, 'utf-8');

  return {
    success: true,
    previousTests,
    updatedTests: parsed.tests,
    modulesAdded,
  };
}

/**
 * Split Journey content into frontmatter and body
 */
function splitJourneyContent(content: string): {
  frontmatter: string;
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!match) {
    throw new Error('Invalid Journey format: missing frontmatter delimiters');
  }

  return {
    frontmatter: match[1],
    body: match[2],
  };
}

/**
 * Check if a Journey's tests are up-to-date
 */
export function isJourneyTestCurrent(
  journeyPath: string,
  testPath: string,
  testContent: string
): boolean {
  const content = readFileSync(journeyPath, 'utf-8');
  const { frontmatter } = splitJourneyContent(content);
  const parsed = parseYaml(frontmatter);

  const testEntry = parsed.tests?.find(
    (t: JourneyTestEntry) => t.path === testPath
  );

  if (!testEntry) {
    return false;
  }

  const currentHash = createHash('sha256')
    .update(testContent)
    .digest('hex')
    .substring(0, 8);

  return testEntry.hash === currentHash;
}
```

#### 1.2 Integration Point

Update `generateTest()` to call `updateJourneyFrontmatter()`:

```typescript
// src/codegen/generateTest.ts - add at end of generateTest()

import { updateJourneyFrontmatter } from '../journey/updater.js';

// In generateTest(), after code generation:
if (options.updateJourney && options.journeyPath) {
  updateJourneyFrontmatter({
    journeyPath: options.journeyPath,
    testPath: result.filename,
    testContent: result.code,
    modules: collectModuleNames(journey),
  });
}
```

#### 1.3 CLI Integration

```typescript
// src/cli/generate.ts - add flag
const updateJourney = args.includes('--update-journey');
```

### Test Cases

```typescript
describe('Journey Frontmatter Update', () => {
  it('should add test entry to empty tests array');
  it('should update existing test entry by path');
  it('should preserve other frontmatter fields');
  it('should add new modules without duplicates');
  it('should calculate correct content hash');
  it('should detect stale tests via hash comparison');
  it('should handle missing frontmatter gracefully');
});
```

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/journey/updater.ts` | Create | Core update logic |
| `src/codegen/generateTest.ts` | Modify | Add update call |
| `src/cli/generate.ts` | Modify | Add `--update-journey` flag |
| `tests/journey/updater.test.ts` | Create | Unit tests |

---

## Feature 2: Config Version Field

### Problem Statement

The config schema has no version field. Future schema changes can't be migrated, leading to silent failures or cryptic errors when users upgrade ARTK.

### Spec Requirement (Section 7)

```yaml
# autogen.config.yml
version: 1
# ... rest of config
```

### Implementation Design

#### 2.1 Schema Update

```typescript
// src/config/schema.ts

export const CURRENT_CONFIG_VERSION = 1;

export const autogenConfigSchema = z.object({
  version: z.number().int().min(1).default(CURRENT_CONFIG_VERSION),
  // ... existing fields
});

export type AutogenConfig = z.infer<typeof autogenConfigSchema>;
```

#### 2.2 Migration System

```typescript
// src/config/migrate.ts

export interface Migration {
  fromVersion: number;
  toVersion: number;
  description: string;
  migrate: (config: Record<string, unknown>) => Record<string, unknown>;
}

/**
 * Registry of all migrations
 */
const MIGRATIONS: Migration[] = [
  // Future migrations go here
  // {
  //   fromVersion: 1,
  //   toVersion: 2,
  //   description: 'Rename selectorPolicy to locatorPolicy',
  //   migrate: (config) => {
  //     if (config.selectorPolicy) {
  //       config.locatorPolicy = config.selectorPolicy;
  //       delete config.selectorPolicy;
  //     }
  //     return config;
  //   },
  // },
];

export interface MigrationResult {
  migrated: boolean;
  fromVersion: number;
  toVersion: number;
  migrationsApplied: string[];
  config: Record<string, unknown>;
}

/**
 * Migrate config to current version
 */
export function migrateConfig(
  config: Record<string, unknown>
): MigrationResult {
  const fromVersion = (config.version as number) || 0;
  let currentConfig = { ...config };
  const migrationsApplied: string[] = [];

  if (fromVersion === CURRENT_CONFIG_VERSION) {
    return {
      migrated: false,
      fromVersion,
      toVersion: fromVersion,
      migrationsApplied: [],
      config: currentConfig,
    };
  }

  // Apply migrations in order
  for (const migration of MIGRATIONS) {
    if (migration.fromVersion >= fromVersion &&
        migration.toVersion <= CURRENT_CONFIG_VERSION) {
      currentConfig = migration.migrate(currentConfig);
      migrationsApplied.push(migration.description);
    }
  }

  // Set current version
  currentConfig.version = CURRENT_CONFIG_VERSION;

  return {
    migrated: true,
    fromVersion,
    toVersion: CURRENT_CONFIG_VERSION,
    migrationsApplied,
    config: currentConfig,
  };
}

/**
 * Check if config needs migration
 */
export function needsMigration(config: Record<string, unknown>): boolean {
  const version = (config.version as number) || 0;
  return version < CURRENT_CONFIG_VERSION;
}

/**
 * Validate config version is supported
 */
export function isVersionSupported(version: number): boolean {
  return version >= 1 && version <= CURRENT_CONFIG_VERSION;
}
```

#### 2.3 Loader Integration

```typescript
// src/config/loader.ts - update loadConfig()

import { migrateConfig, needsMigration } from './migrate.js';

export function loadConfig(configPath?: string): AutogenConfig {
  // ... existing loading logic

  const rawConfig = parseYaml(content);

  // Check for migration
  if (needsMigration(rawConfig)) {
    const result = migrateConfig(rawConfig);

    if (result.migrationsApplied.length > 0) {
      console.warn(
        `Config migrated from v${result.fromVersion} to v${result.toVersion}:\n` +
        result.migrationsApplied.map(m => `  - ${m}`).join('\n')
      );

      // Optionally write back migrated config
      if (configPath) {
        writeFileSync(configPath, stringifyYaml(result.config));
      }
    }

    return autogenConfigSchema.parse(result.config);
  }

  return autogenConfigSchema.parse(rawConfig);
}
```

### Test Cases

```typescript
describe('Config Migration', () => {
  it('should add version field to legacy config');
  it('should not modify current version config');
  it('should apply migrations in sequence');
  it('should preserve unknown fields during migration');
  it('should reject unsupported future versions');
});
```

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/config/schema.ts` | Modify | Add version field |
| `src/config/migrate.ts` | Create | Migration system |
| `src/config/loader.ts` | Modify | Integrate migration |
| `tests/config/migrate.test.ts` | Create | Migration tests |

---

## Feature 3: Completion Signals Parsing

### Problem Statement

Journey frontmatter can specify `completion` signals that indicate test success, but these are currently ignored. Tests don't auto-generate final assertions.

### Spec Requirement (Section 8.1)

```yaml
completion:
  - type: url
    value: "/dashboard"
  - type: toast
    value: "Login successful"
  - type: element
    selector: "[data-testid='welcome-banner']"
    state: visible
```

### Implementation Design

#### 3.1 Type Definitions

```typescript
// src/ir/types.ts - add to existing types

export type CompletionSignalType = 'url' | 'toast' | 'element' | 'title' | 'api';

export interface CompletionSignal {
  type: CompletionSignalType;
  value: string;
  options?: {
    timeout?: number;
    exact?: boolean;
    state?: 'visible' | 'hidden' | 'attached' | 'detached';
    method?: string; // For API signals
    status?: number; // For API signals
  };
}

// Update JourneyFrontmatter
export interface JourneyFrontmatter {
  // ... existing fields
  completion?: CompletionSignal[];
}
```

#### 3.2 Parser Update

```typescript
// src/journey/parser.ts - update parseJourney()

const completionSchema = z.array(z.object({
  type: z.enum(['url', 'toast', 'element', 'title', 'api']),
  value: z.string(),
  options: z.object({
    timeout: z.number().optional(),
    exact: z.boolean().optional(),
    state: z.enum(['visible', 'hidden', 'attached', 'detached']).optional(),
    method: z.string().optional(),
    status: z.number().optional(),
  }).optional(),
})).optional();

// Add to frontmatter parsing
completion: completionSchema,
```

#### 3.3 IR Conversion

```typescript
// src/ir/normalize.ts - add function

import type { CompletionSignal, IRPrimitive } from './types.js';

/**
 * Convert completion signals to IR primitives (final assertions)
 */
export function completionSignalsToAssertions(
  signals: CompletionSignal[]
): IRPrimitive[] {
  return signals.map(signal => {
    switch (signal.type) {
      case 'url':
        return {
          type: 'expectURL',
          pattern: signal.options?.exact
            ? signal.value
            : new RegExp(escapeRegex(signal.value)),
          timeout: signal.options?.timeout,
        } as IRPrimitive;

      case 'toast':
        return {
          type: 'expectToast',
          message: signal.value,
          timeout: signal.options?.timeout ?? 5000,
        } as IRPrimitive;

      case 'element':
        return {
          type: signal.options?.state === 'hidden'
            ? 'expectNotVisible'
            : 'expectVisible',
          locator: parseLocatorFromSelector(signal.value),
          timeout: signal.options?.timeout,
        } as IRPrimitive;

      case 'title':
        return {
          type: 'expectTitle',
          title: signal.options?.exact
            ? signal.value
            : new RegExp(escapeRegex(signal.value)),
        } as IRPrimitive;

      case 'api':
        return {
          type: 'waitForResponse',
          urlPattern: signal.value,
          method: signal.options?.method,
          status: signal.options?.status,
        } as IRPrimitive;

      default:
        throw new Error(`Unknown completion signal type: ${signal.type}`);
    }
  });
}

/**
 * Parse a selector string to LocatorSpec
 */
function parseLocatorFromSelector(selector: string): LocatorSpec {
  // data-testid
  if (selector.includes('data-testid')) {
    const match = selector.match(/\[data-testid=['"]([^'"]+)['"]\]/);
    if (match) {
      return { strategy: 'testid', value: match[1] };
    }
  }

  // Role selector
  if (selector.startsWith('role=')) {
    return { strategy: 'role', value: selector.slice(5) };
  }

  // Text selector
  if (selector.startsWith('text=')) {
    return { strategy: 'text', value: selector.slice(5) };
  }

  // Default to CSS
  return { strategy: 'css', value: selector };
}
```

#### 3.4 Integration in Test Generation

```typescript
// src/codegen/generateTest.ts - update to include completion assertions

// In generateTest(), after step generation:
if (journey.completion && journey.completion.length > 0) {
  const completionAssertions = completionSignalsToAssertions(journey.completion);

  // Add as final step
  const finalStep: IRStep = {
    id: 'completion-verification',
    description: 'Verify completion signals',
    actions: [],
    assertions: completionAssertions,
  };

  // Render completion assertions
  for (const assertion of completionAssertions) {
    code += '\n  ' + renderPrimitive(assertion, '  ');
  }
}
```

### Test Cases

```typescript
describe('Completion Signals', () => {
  it('should parse url completion signal');
  it('should parse toast completion signal');
  it('should parse element visibility signal');
  it('should parse title completion signal');
  it('should parse api response signal');
  it('should generate expectURL assertion from url signal');
  it('should generate expectToast assertion from toast signal');
  it('should handle exact vs partial matching');
  it('should apply custom timeouts');
});
```

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/ir/types.ts` | Modify | Add CompletionSignal types |
| `src/journey/parser.ts` | Modify | Parse completion field |
| `src/ir/normalize.ts` | Modify | Add signal conversion |
| `src/codegen/generateTest.ts` | Modify | Generate completion assertions |
| `tests/ir/completion.test.ts` | Create | Completion signal tests |

---

## Feature 4: Managed Blocks Strategy

### Problem Statement

AST-based editing with ts-morph is powerful but complex. Some users prefer simpler marker-based regeneration that's predictable and diff-friendly.

### Spec Requirement (Section 12.3)

```typescript
// Generated test with managed blocks
import { test, expect } from '@playwright/test';

// ARTK:BEGIN GENERATED - Do not edit manually
test('login journey', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('test@example.com');
  await page.getByRole('button', { name: 'Submit' }).click();
});
// ARTK:END GENERATED

// Custom helper - preserved across regeneration
async function customSetup(page: Page) {
  // User code here
}
```

### Implementation Design

#### 4.1 Block Markers

```typescript
// src/codegen/blocks.ts

export const BLOCK_START = '// ARTK:BEGIN GENERATED';
export const BLOCK_END = '// ARTK:END GENERATED';
export const BLOCK_ID_PATTERN = /ARTK:BEGIN GENERATED(?:\s+id=([a-zA-Z0-9_-]+))?/;

export interface ManagedBlock {
  id?: string;
  startLine: number;
  endLine: number;
  content: string;
}

export interface BlockExtractionResult {
  blocks: ManagedBlock[];
  preservedCode: string[];
  hasBlocks: boolean;
}
```

#### 4.2 Block Extraction

```typescript
// src/codegen/blocks.ts

/**
 * Extract managed blocks from existing code
 */
export function extractManagedBlocks(code: string): BlockExtractionResult {
  const lines = code.split('\n');
  const blocks: ManagedBlock[] = [];
  const preservedCode: string[] = [];

  let inBlock = false;
  let currentBlock: Partial<ManagedBlock> | null = null;
  let blockContent: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes(BLOCK_START)) {
      inBlock = true;
      const match = line.match(BLOCK_ID_PATTERN);
      currentBlock = {
        id: match?.[1],
        startLine: i,
      };
      blockContent = [];
      continue;
    }

    if (line.includes(BLOCK_END) && inBlock) {
      inBlock = false;
      if (currentBlock) {
        blocks.push({
          ...currentBlock,
          endLine: i,
          content: blockContent.join('\n'),
        } as ManagedBlock);
      }
      currentBlock = null;
      continue;
    }

    if (inBlock) {
      blockContent.push(line);
    } else {
      preservedCode.push(line);
    }
  }

  // Handle unclosed block
  if (inBlock && currentBlock) {
    console.warn('Unclosed managed block detected');
  }

  return {
    blocks,
    preservedCode,
    hasBlocks: blocks.length > 0,
  };
}
```

#### 4.3 Block Injection

```typescript
// src/codegen/blocks.ts

export interface InjectBlocksOptions {
  existingCode: string;
  newBlocks: Array<{
    id?: string;
    content: string;
  }>;
  preserveOrder?: boolean;
}

/**
 * Inject managed blocks into code, preserving user code
 */
export function injectManagedBlocks(options: InjectBlocksOptions): string {
  const { existingCode, newBlocks, preserveOrder = true } = options;

  // If no existing code, just wrap new blocks
  if (!existingCode.trim()) {
    return newBlocks
      .map(block => wrapInBlock(block.content, block.id))
      .join('\n\n');
  }

  const { blocks: existingBlocks, preservedCode, hasBlocks } =
    extractManagedBlocks(existingCode);

  if (!hasBlocks) {
    // No existing blocks - append new blocks at end
    const preserved = preservedCode.join('\n');
    const newContent = newBlocks
      .map(block => wrapInBlock(block.content, block.id))
      .join('\n\n');

    return `${preserved}\n\n${newContent}`;
  }

  // Replace existing blocks by ID, append new ones
  const result: string[] = [];
  const processedIds = new Set<string>();

  // Re-scan to maintain structure
  const lines = existingCode.split('\n');
  let inBlock = false;
  let currentBlockId: string | undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes(BLOCK_START)) {
      inBlock = true;
      const match = line.match(BLOCK_ID_PATTERN);
      currentBlockId = match?.[1];

      // Find replacement block
      const replacement = newBlocks.find(b => b.id === currentBlockId);
      if (replacement) {
        result.push(wrapInBlock(replacement.content, replacement.id));
        processedIds.add(currentBlockId || '');
      } else {
        // Keep original block
        result.push(line);
      }
      continue;
    }

    if (line.includes(BLOCK_END) && inBlock) {
      inBlock = false;
      if (!processedIds.has(currentBlockId || '')) {
        result.push(line);
      }
      currentBlockId = undefined;
      continue;
    }

    if (!inBlock) {
      result.push(line);
    } else if (!processedIds.has(currentBlockId || '')) {
      result.push(line);
    }
  }

  // Append new blocks that weren't replacements
  for (const block of newBlocks) {
    if (!processedIds.has(block.id || '')) {
      result.push('');
      result.push(wrapInBlock(block.content, block.id));
    }
  }

  return result.join('\n');
}

/**
 * Wrap content in managed block markers
 */
function wrapInBlock(content: string, id?: string): string {
  const startMarker = id
    ? `${BLOCK_START} id=${id}`
    : BLOCK_START;

  return `${startMarker}\n${content}\n${BLOCK_END}`;
}
```

#### 4.4 Generation Mode Selection

```typescript
// src/codegen/generateTest.ts - add option

export interface GenerateTestOptions {
  // ... existing options

  /**
   * Code generation strategy
   * - 'full': Generate complete file (default)
   * - 'blocks': Use managed blocks for partial regeneration
   * - 'ast': Use AST editing to preserve structure
   */
  strategy?: 'full' | 'blocks' | 'ast';
}

// In generateTest():
if (options.strategy === 'blocks' && options.existingCode) {
  // Extract preserved code and inject new blocks
  const testBlock = {
    id: `test-${journey.id}`,
    content: generatedTestCode,
  };

  return {
    code: injectManagedBlocks({
      existingCode: options.existingCode,
      newBlocks: [testBlock],
    }),
    // ... rest of result
  };
}
```

### Test Cases

```typescript
describe('Managed Blocks', () => {
  describe('extractManagedBlocks', () => {
    it('should extract single block');
    it('should extract multiple blocks');
    it('should capture block IDs');
    it('should preserve non-block code');
    it('should handle unclosed blocks gracefully');
  });

  describe('injectManagedBlocks', () => {
    it('should inject blocks into empty file');
    it('should replace blocks by ID');
    it('should preserve user code outside blocks');
    it('should append new blocks');
    it('should maintain block order');
  });
});
```

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/codegen/blocks.ts` | Create | Block extraction/injection |
| `src/codegen/generateTest.ts` | Modify | Add blocks strategy |
| `tests/codegen/blocks.test.ts` | Create | Block handling tests |

---

## Feature 5: Install/Upgrade Instance APIs

### Problem Statement

Users have no automated way to bootstrap ARTK in a new project or upgrade an existing installation. Manual setup is error-prone and version mismatches cause issues.

### Spec Requirement (Section 19.1)

```typescript
installAutogenInstance(opts: { rootDir: string }): Promise<void>
upgradeAutogenInstance(opts: { rootDir: string; toVersion: string }): Promise<void>
```

### Implementation Design

#### 5.1 Installation API

```typescript
// src/instance/install.ts

import { existsSync, mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { stringify as stringifyYaml } from 'yaml';
import { CURRENT_CONFIG_VERSION } from '../config/schema.js';

export interface InstallOptions {
  /** Root directory to install into */
  rootDir: string;
  /** Project name (for config) */
  projectName?: string;
  /** Base URL for tests */
  baseUrl?: string;
  /** Test ID attribute */
  testIdAttribute?: string;
  /** Skip if already installed */
  skipIfExists?: boolean;
  /** Include example Journey */
  includeExample?: boolean;
}

export interface InstallResult {
  success: boolean;
  created: string[];
  skipped: string[];
  errors: string[];
}

/**
 * Install ARTK autogen instance in a project
 */
export async function installAutogenInstance(
  options: InstallOptions
): Promise<InstallResult> {
  const {
    rootDir,
    projectName = 'my-project',
    baseUrl = 'http://localhost:3000',
    testIdAttribute = 'data-testid',
    skipIfExists = false,
    includeExample = true,
  } = options;

  const result: InstallResult = {
    success: true,
    created: [],
    skipped: [],
    errors: [],
  };

  try {
    // 1. Create directory structure
    const directories = [
      'journeys',
      'tests/journeys',
      'tests/modules',
      '.artk',
    ];

    for (const dir of directories) {
      const fullPath = join(rootDir, dir);
      if (existsSync(fullPath)) {
        if (skipIfExists) {
          result.skipped.push(dir);
          continue;
        }
      } else {
        mkdirSync(fullPath, { recursive: true });
        result.created.push(dir);
      }
    }

    // 2. Create config file
    const configPath = join(rootDir, 'autogen.config.yml');
    if (!existsSync(configPath) || !skipIfExists) {
      const config = {
        version: CURRENT_CONFIG_VERSION,
        project: projectName,
        baseUrl,
        testIdAttribute,
        paths: {
          journeys: 'journeys',
          tests: 'tests/journeys',
          modules: 'tests/modules',
        },
        healing: {
          enabled: true,
          maxAttempts: 3,
        },
        validation: {
          requireClarified: true,
          forbiddenPatterns: [
            'page\\.waitForTimeout',
            'force:\\s*true',
          ],
        },
      };

      writeFileSync(configPath, stringifyYaml(config));
      result.created.push('autogen.config.yml');
    } else {
      result.skipped.push('autogen.config.yml');
    }

    // 3. Create .gitignore additions
    const gitignorePath = join(rootDir, '.artk/.gitignore');
    if (!existsSync(gitignorePath)) {
      writeFileSync(gitignorePath, [
        '# ARTK temporary files',
        'heal-logs/',
        '*.heal.json',
        'selector-catalog.local.json',
      ].join('\n'));
      result.created.push('.artk/.gitignore');
    }

    // 4. Create example Journey (optional)
    if (includeExample) {
      const examplePath = join(rootDir, 'journeys/EXAMPLE-001.md');
      if (!existsSync(examplePath)) {
        const exampleJourney = `---
id: EXAMPLE-001
title: Example Journey
status: proposed
tier: smoke
scope: example
actor: user
tags:
  - example
  - smoke
tests: []
modules: []
---

# Example Journey

## Overview
This is an example Journey to demonstrate the format.

## Preconditions
- User is on the home page

## Acceptance Criteria
- [ ] AC1: User can see the welcome message

## Steps
1. Navigate to the home page
2. Verify the welcome message is visible
`;
        writeFileSync(examplePath, exampleJourney);
        result.created.push('journeys/EXAMPLE-001.md');
      }
    }

    // 5. Create VS Code settings (optional)
    const vscodePath = join(rootDir, '.vscode');
    if (!existsSync(vscodePath)) {
      mkdirSync(vscodePath, { recursive: true });
    }

    const settingsPath = join(vscodePath, 'settings.json');
    if (!existsSync(settingsPath)) {
      const settings = {
        'files.associations': {
          '*.journey.md': 'markdown',
        },
        'editor.quickSuggestions': {
          strings: true,
        },
      };
      writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
      result.created.push('.vscode/settings.json');
    }

  } catch (error) {
    result.success = false;
    result.errors.push(String(error));
  }

  return result;
}
```

#### 5.2 Upgrade API

```typescript
// src/instance/upgrade.ts

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { migrateConfig, CURRENT_CONFIG_VERSION } from '../config/migrate.js';

export interface UpgradeOptions {
  /** Root directory of ARTK instance */
  rootDir: string;
  /** Target version (default: current) */
  toVersion?: number;
  /** Create backup before upgrade */
  backup?: boolean;
  /** Dry run - don't write changes */
  dryRun?: boolean;
}

export interface UpgradeResult {
  success: boolean;
  fromVersion: number;
  toVersion: number;
  changes: UpgradeChange[];
  backupPath?: string;
  errors: string[];
}

export interface UpgradeChange {
  type: 'config' | 'file' | 'directory';
  path: string;
  description: string;
}

/**
 * Upgrade ARTK autogen instance to new version
 */
export async function upgradeAutogenInstance(
  options: UpgradeOptions
): Promise<UpgradeResult> {
  const {
    rootDir,
    toVersion = CURRENT_CONFIG_VERSION,
    backup = true,
    dryRun = false,
  } = options;

  const result: UpgradeResult = {
    success: true,
    fromVersion: 0,
    toVersion,
    changes: [],
    errors: [],
  };

  try {
    // 1. Load current config
    const configPath = join(rootDir, 'autogen.config.yml');
    if (!existsSync(configPath)) {
      throw new Error('No autogen.config.yml found. Run install first.');
    }

    const configContent = readFileSync(configPath, 'utf-8');
    const config = parseYaml(configContent);
    result.fromVersion = config.version || 0;

    // 2. Check if upgrade needed
    if (result.fromVersion >= toVersion) {
      result.changes.push({
        type: 'config',
        path: configPath,
        description: `Already at version ${result.fromVersion}, no upgrade needed`,
      });
      return result;
    }

    // 3. Create backup
    if (backup && !dryRun) {
      const backupPath = `${configPath}.backup-v${result.fromVersion}`;
      writeFileSync(backupPath, configContent);
      result.backupPath = backupPath;
      result.changes.push({
        type: 'file',
        path: backupPath,
        description: 'Created config backup',
      });
    }

    // 4. Migrate config
    const migrationResult = migrateConfig(config);

    for (const migration of migrationResult.migrationsApplied) {
      result.changes.push({
        type: 'config',
        path: configPath,
        description: migration,
      });
    }

    // 5. Write migrated config
    if (!dryRun) {
      writeFileSync(configPath, stringifyYaml(migrationResult.config));
    }

    result.changes.push({
      type: 'config',
      path: configPath,
      description: `Upgraded config from v${result.fromVersion} to v${toVersion}`,
    });

    // 6. Version-specific upgrades
    // Add new directories, update templates, etc.
    const versionUpgrades = getVersionUpgrades(result.fromVersion, toVersion);

    for (const upgrade of versionUpgrades) {
      if (!dryRun) {
        await upgrade.apply(rootDir);
      }
      result.changes.push({
        type: upgrade.type,
        path: upgrade.path,
        description: upgrade.description,
      });
    }

  } catch (error) {
    result.success = false;
    result.errors.push(String(error));
  }

  return result;
}

interface VersionUpgrade {
  type: 'config' | 'file' | 'directory';
  path: string;
  description: string;
  apply: (rootDir: string) => Promise<void>;
}

/**
 * Get version-specific upgrade tasks
 */
function getVersionUpgrades(
  fromVersion: number,
  toVersion: number
): VersionUpgrade[] {
  const upgrades: VersionUpgrade[] = [];

  // Future version upgrades go here
  // if (fromVersion < 2 && toVersion >= 2) {
  //   upgrades.push({
  //     type: 'directory',
  //     path: 'tests/fixtures',
  //     description: 'Create fixtures directory for v2',
  //     apply: async (rootDir) => {
  //       mkdirSync(join(rootDir, 'tests/fixtures'), { recursive: true });
  //     },
  //   });
  // }

  return upgrades;
}
```

#### 5.3 CLI Commands

```typescript
// src/cli/install.ts

import { parseArgs } from 'node:util';
import { installAutogenInstance } from '../instance/install.js';

export async function runInstall(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      dir: { type: 'string', short: 'd', default: '.' },
      name: { type: 'string', short: 'n' },
      'base-url': { type: 'string' },
      'skip-existing': { type: 'boolean', default: false },
      'no-example': { type: 'boolean', default: false },
    },
  });

  console.log('Installing ARTK autogen...\n');

  const result = await installAutogenInstance({
    rootDir: values.dir as string,
    projectName: values.name as string | undefined,
    baseUrl: values['base-url'] as string | undefined,
    skipIfExists: values['skip-existing'] as boolean,
    includeExample: !values['no-example'],
  });

  if (result.success) {
    console.log('✓ Installation complete\n');

    if (result.created.length > 0) {
      console.log('Created:');
      for (const path of result.created) {
        console.log(`  + ${path}`);
      }
    }

    if (result.skipped.length > 0) {
      console.log('\nSkipped (already exists):');
      for (const path of result.skipped) {
        console.log(`  - ${path}`);
      }
    }

    console.log('\nNext steps:');
    console.log('  1. Edit autogen.config.yml with your project settings');
    console.log('  2. Create Journeys in journeys/ directory');
    console.log('  3. Run: npx artk generate <journey.md>');
  } else {
    console.error('✗ Installation failed:\n');
    for (const error of result.errors) {
      console.error(`  ${error}`);
    }
    process.exit(1);
  }
}

// src/cli/upgrade.ts

import { parseArgs } from 'node:util';
import { upgradeAutogenInstance } from '../instance/upgrade.js';

export async function runUpgrade(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      dir: { type: 'string', short: 'd', default: '.' },
      'dry-run': { type: 'boolean', default: false },
      'no-backup': { type: 'boolean', default: false },
    },
  });

  console.log('Upgrading ARTK autogen...\n');

  const result = await upgradeAutogenInstance({
    rootDir: values.dir as string,
    dryRun: values['dry-run'] as boolean,
    backup: !values['no-backup'],
  });

  if (values['dry-run']) {
    console.log('[DRY RUN] No changes written\n');
  }

  console.log(`Version: ${result.fromVersion} → ${result.toVersion}\n`);

  if (result.changes.length > 0) {
    console.log('Changes:');
    for (const change of result.changes) {
      console.log(`  ${change.description}`);
      console.log(`    → ${change.path}`);
    }
  }

  if (result.backupPath) {
    console.log(`\nBackup: ${result.backupPath}`);
  }

  if (!result.success) {
    console.error('\n✗ Upgrade failed:');
    for (const error of result.errors) {
      console.error(`  ${error}`);
    }
    process.exit(1);
  }

  console.log('\n✓ Upgrade complete');
}
```

### Test Cases

```typescript
describe('Install Instance', () => {
  it('should create directory structure');
  it('should create default config');
  it('should skip existing directories with flag');
  it('should create example Journey');
  it('should create VS Code settings');
});

describe('Upgrade Instance', () => {
  it('should detect current version');
  it('should skip if already at target version');
  it('should create backup before upgrade');
  it('should apply migrations');
  it('should support dry run mode');
  it('should handle missing config gracefully');
});
```

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/instance/install.ts` | Create | Installation logic |
| `src/instance/upgrade.ts` | Create | Upgrade logic |
| `src/cli/install.ts` | Create | Install CLI command |
| `src/cli/upgrade.ts` | Create | Upgrade CLI command |
| `src/cli/index.ts` | Modify | Add install/upgrade commands |
| `tests/instance/install.test.ts` | Create | Install tests |
| `tests/instance/upgrade.test.ts` | Create | Upgrade tests |

---

## Implementation Order

### Phase 1: Foundation (Day 1)

1. **Config Version Field** - Required by upgrade system
   - Update schema
   - Create migration system
   - Update loader

2. **Install/Upgrade APIs** - Uses version field
   - Create install logic
   - Create upgrade logic
   - Add CLI commands

### Phase 2: Core Features (Day 2)

3. **Journey Frontmatter Update**
   - Create updater module
   - Integrate with generation
   - Add CLI flag

4. **Completion Signals Parsing**
   - Add types
   - Update parser
   - Generate assertions

### Phase 3: Advanced (Day 3)

5. **Managed Blocks Strategy**
   - Create block extraction
   - Create block injection
   - Add generation strategy option

### Phase 4: Testing & Polish (Day 4)

- Comprehensive unit tests
- Integration tests
- Documentation updates
- CLI help text

---

## Dependency Graph

```
                    ┌──────────────────┐
                    │ Config Version   │
                    │ (schema.ts)      │
                    └────────┬─────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
    ┌─────────────────┐          ┌─────────────────┐
    │ Migration       │          │ Install/Upgrade │
    │ (migrate.ts)    │          │ (instance/)     │
    └────────┬────────┘          └─────────────────┘
             │
             ▼
    ┌─────────────────┐
    │ Config Loader   │
    │ (loader.ts)     │
    └─────────────────┘

    ┌─────────────────┐          ┌─────────────────┐
    │ Completion      │          │ Journey Update  │
    │ Signals         │          │ (updater.ts)    │
    └────────┬────────┘          └────────┬────────┘
             │                            │
             └──────────┬─────────────────┘
                        │
                        ▼
              ┌─────────────────┐
              │ generateTest()  │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │ Managed Blocks  │
              │ (blocks.ts)     │
              └─────────────────┘
```

---

## Risk Analysis

| Feature | Risk | Mitigation |
|---------|------|------------|
| Frontmatter Update | Could corrupt Journey file | Backup before write, validate YAML after |
| Config Migration | Could lose user settings | Preserve unknown fields, create backup |
| Completion Signals | Complex selector parsing | Fallback to CSS for unparseable |
| Managed Blocks | Could lose user code | Strict marker validation, backup |
| Install/Upgrade | Platform-specific issues | Use Node.js fs APIs, test on all platforms |

---

## Summary

This plan provides complete implementations for all 5 remaining features:

1. **Journey Frontmatter Update** - Enables bi-directional traceability
2. **Config Version Field** - Future-proofs the config schema
3. **Completion Signals Parsing** - Auto-generates final assertions
4. **Managed Blocks Strategy** - Simpler alternative to AST editing
5. **Install/Upgrade Instance APIs** - Easy project bootstrapping

**Total new files:** 10
**Total modified files:** 6
**Estimated lines of code:** ~1,500
**Estimated tests:** ~60

After implementing these features, @artk/core-autogen will be at **100% spec compliance**.
