# LLKB-AutoGen Integration: Task Breakdown

**Date:** 2026-01-23
**Prerequisites:**
- `research/2026-01-23_llkb-autogen-integration-debate.md`
- `research/2026-01-23_llkb-autogen-integration-specification.md`

---

## Overview

This document provides a step-by-step task breakdown for implementing the LLKB-AutoGen integration. Tasks are organized by phase, with dependencies clearly marked.

**Total Phases:** 5
**Estimated Total Tasks:** 47
**Estimated Total Lines of Code:** ~690

---

## Phase 1: LLKB Adapter Module

**Goal:** Create the adapter that exports LLKB knowledge to AutoGen-compatible files.
**Dependencies:** None (starting point)
**Estimated Lines:** ~150

### Task 1.1: Create Adapter Types

**File:** `core/typescript/llkb/adapter-types.ts` (NEW)
**Lines:** ~60

- [ ] 1.1.1 Define `LLKBAdapterConfig` interface
  - `llkbRoot?: string`
  - `outputDir: string`
  - `minConfidence?: number` (default: 0.7)
  - `includeCategories?: LLKBCategory[]`
  - `includeScopes?: LLKBScope[]`
  - `generateGlossary?: boolean` (default: true)
  - `generateConfig?: boolean` (default: true)
  - `configFormat?: 'yaml' | 'json'`

- [ ] 1.1.2 Define `LLKBAdapterResult` interface
  - `configPath: string | null`
  - `glossaryPath: string | null`
  - `stats: ExportStats`
  - `warnings: string[]`
  - `exportedAt: string`

- [ ] 1.1.3 Define `ExportStats` interface
  - `patternsExported: number`
  - `selectorsExported: number`
  - `timingHintsExported: number`
  - `modulesExported: number`
  - `glossaryEntriesExported: number`
  - `lessonsSkipped: number`
  - `componentsSkipped: number`

- [ ] 1.1.4 Define `AdditionalPattern` interface for config export
  - `name: string`
  - `regex: string`
  - `primitiveType: string`
  - `module?: string`
  - `method?: string`
  - `argMapping?: string[]`
  - `source: { lessonId: string; confidence: number; occurrences: number }`

- [ ] 1.1.5 Define `SelectorOverride` interface
  - `pattern: string`
  - `override: { strategy: string; value: string }`
  - `source: { lessonId: string; confidence: number }`

- [ ] 1.1.6 Define `TimingHint` interface
  - `trigger: string`
  - `waitMs: number`
  - `source: { lessonId: string; confidence: number }`

- [ ] 1.1.7 Define `ModuleMapping` interface
  - `name: string`
  - `trigger: string`
  - `componentId: string`
  - `importPath: string`
  - `confidence: number`

- [ ] 1.1.8 Define `AutogenLLKBConfig` interface (full config structure)

### Task 1.2: Implement Transformation Functions

**File:** `core/typescript/llkb/adapter-transforms.ts` (NEW)
**Lines:** ~50

- [ ] 1.2.1 Implement `lessonToPattern(lesson: Lesson): AdditionalPattern | null`
  - Filter by category (selector, timing, navigation, ui-interaction)
  - Convert trigger to regex pattern
  - Map category to primitive type
  - Return null if confidence below threshold

- [ ] 1.2.2 Implement `lessonToSelectorOverride(lesson: Lesson): SelectorOverride | null`
  - Filter by category (selector only)
  - Extract pattern and override from lesson.pattern
  - Parse strategy and value

- [ ] 1.2.3 Implement `lessonToTimingHint(lesson: Lesson): TimingHint | null`
  - Filter by category (timing only)
  - Extract trigger and wait time from lesson

- [ ] 1.2.4 Implement `componentToModule(component: Component): ModuleMapping`
  - Generate trigger regex from component name
  - Map to module import path

- [ ] 1.2.5 Implement `componentToGlossaryEntries(component: Component): [string, IRPrimitive][]`
  - Generate natural language variations of component name
  - Create callModule primitives for each variation

- [ ] 1.2.6 Implement helper: `triggerToRegex(trigger: string): string | null`
  - Convert natural language trigger to regex pattern
  - Handle common patterns (click, fill, wait, etc.)

- [ ] 1.2.7 Implement helper: `generateNameVariations(name: string): string[]`
  - camelCase → "camel case"
  - Add common synonyms
  - Handle prefixes (wait, handle, etc.)

### Task 1.3: Implement Main Adapter Function

**File:** `core/typescript/llkb/adapter.ts` (NEW)
**Lines:** ~80

- [ ] 1.3.1 Implement `exportForAutogen(config: LLKBAdapterConfig): Promise<LLKBAdapterResult>`
  - Load LLKB data (lessons, components, config)
  - Filter by confidence, category, scope
  - Transform lessons → patterns, selectors, timing
  - Transform components → modules, glossary
  - Generate config YAML
  - Generate glossary TypeScript
  - Return stats and paths

- [ ] 1.3.2 Implement config file generation
  - Create `autogen-llkb.config.yml` structure
  - Add header comment with export metadata
  - Use yaml stringify

- [ ] 1.3.3 Implement glossary file generation
  - Create TypeScript Map export
  - Add header comment with metadata
  - Export `llkbGlossary` Map
  - Export `llkbGlossaryMeta` object

- [ ] 1.3.4 Add validation checks
  - LLKB directory exists
  - LLKB is enabled
  - Output directory exists or can be created

- [ ] 1.3.5 Add error handling
  - Wrap in try-catch
  - Return meaningful error messages
  - Collect warnings for non-fatal issues

### Task 1.4: Add CLI Export Command

**File:** `core/typescript/llkb/cli.ts` (MODIFY)
**Lines:** ~40

- [ ] 1.4.1 Add `export` subcommand to CLI
  - Parse `--for-autogen` flag
  - Parse `--output <dir>` option
  - Parse `--min-confidence <number>` option
  - Parse `--categories <list>` option
  - Parse `--scopes <list>` option
  - Parse `--dry-run` flag
  - Parse `--glossary-only` flag
  - Parse `--config-only` flag

- [ ] 1.4.2 Implement `runExportCommand(args)` function
  - Call `exportForAutogen()` with parsed args
  - Display stats to console
  - Handle dry-run (preview only)
  - Exit with appropriate code

- [ ] 1.4.3 Add help text for export command

### Task 1.5: Update LLKB Index

**File:** `core/typescript/llkb/index.ts` (MODIFY)
**Lines:** ~10

- [ ] 1.5.1 Export adapter types
- [ ] 1.5.2 Export `exportForAutogen` function
- [ ] 1.5.3 Export transformation functions (for testing)

### Task 1.6: Write Unit Tests

**File:** `core/typescript/llkb/__tests__/adapter.test.ts` (NEW)
**Lines:** ~100

- [ ] 1.6.1 Test `lessonToPattern` transformation
- [ ] 1.6.2 Test `componentToModule` transformation
- [ ] 1.6.3 Test `componentToGlossaryEntries` variations
- [ ] 1.6.4 Test `exportForAutogen` full flow
- [ ] 1.6.5 Test confidence filtering
- [ ] 1.6.6 Test category filtering
- [ ] 1.6.7 Test scope filtering
- [ ] 1.6.8 Test error handling (missing LLKB, disabled, etc.)

---

## Phase 2: AutoGen Config Extensions

**Goal:** Enable AutoGen to consume LLKB-exported files.
**Dependencies:** Phase 1 (adapter must generate valid files)
**Estimated Lines:** ~110

### Task 2.1: Extend Config Schema

**File:** `core/typescript/autogen/src/config/schema.ts` (MODIFY)
**Lines:** ~30

- [ ] 2.1.1 Add `LLKBIntegrationSchema` Zod schema
  - `enabled: z.boolean().default(false)`
  - `configPath: z.string().optional()`
  - `glossaryPath: z.string().optional()`
  - `level: z.enum(['minimal', 'enhance', 'aggressive']).default('enhance')`

- [ ] 2.1.2 Add `llkb` field to `AutogenConfigSchema`
  - `llkb: LLKBIntegrationSchema`

- [ ] 2.1.3 Export `LLKBIntegration` TypeScript type

### Task 2.2: Extend Config Loader

**File:** `core/typescript/autogen/src/config/loader.ts` (MODIFY)
**Lines:** ~50

- [ ] 2.2.1 Add `loadConfigs(configPaths: string[]): AutogenConfig` function
  - Load each config file
  - Call `mergeConfigs()` to combine

- [ ] 2.2.2 Implement `mergeConfigs(configs: AutogenConfig[]): AutogenConfig`
  - Merge objects with later configs taking precedence
  - Arrays merge additively (forbiddenPatterns, etc.)
  - Handle nested objects (paths, selectorPolicy, validation)

- [ ] 2.2.3 Add `loadLLKBConfig(basePath: string): Partial<AutogenConfig> | null`
  - Check for `autogen-llkb.config.yml`
  - Return null if not found
  - Parse and validate if found

- [ ] 2.2.4 Update `loadConfig()` to accept `string | string[]`
  - Maintain backwards compatibility
  - Call `loadConfigs()` if array

### Task 2.3: Extend Glossary Module

**File:** `core/typescript/autogen/src/mapping/glossary.ts` (MODIFY)
**Lines:** ~60

- [ ] 2.3.1 Add private `extendedGlossary` variable
  - `let extendedGlossary: Map<string, IRPrimitive> | null = null`

- [ ] 2.3.2 Add private `extendedGlossaryMeta` variable
  - `let extendedGlossaryMeta: { exportedAt: string; entryCount: number } | null = null`

- [ ] 2.3.3 Implement `loadExtendedGlossary(glossaryPath: string): Promise<LoadResult>`
  - Dynamic import of glossary file
  - Validate it exports `llkbGlossary` Map
  - Store in private variables
  - Return load status

- [ ] 2.3.4 Implement `clearExtendedGlossary(): void`
  - Reset private variables to null
  - For testing purposes

- [ ] 2.3.5 Update `lookupGlossary(term: string): IRPrimitive | undefined`
  - Check core glossary first (priority)
  - Fall back to extended glossary
  - Normalize term before lookup

- [ ] 2.3.6 Implement `getGlossaryStats(): GlossaryStats`
  - Return core entries count
  - Return extended entries count
  - Return extended export timestamp

### Task 2.4: Update CLI Generate Command

**File:** `core/typescript/autogen/src/cli/commands/generate.ts` (MODIFY)
**Lines:** ~30

- [ ] 2.4.1 Add `--llkb-config <path>` option
  - Path to LLKB-generated config file

- [ ] 2.4.2 Add `--llkb-glossary <path>` option
  - Path to LLKB-generated glossary file

- [ ] 2.4.3 Add `--no-llkb` flag
  - Disable LLKB integration even if files exist

- [ ] 2.4.4 Update `runGenerate()` to use LLKB options
  - Build config paths array
  - Call `loadConfigs()` if multiple
  - Call `loadExtendedGlossary()` if path provided
  - Log LLKB status if not quiet

### Task 2.5: Write Unit Tests

**File:** `core/typescript/autogen/__tests__/llkb-integration.test.ts` (NEW)
**Lines:** ~80

- [ ] 2.5.1 Test config merging
- [ ] 2.5.2 Test LLKB config loading
- [ ] 2.5.3 Test extended glossary loading
- [ ] 2.5.4 Test glossary lookup priority (core > extended)
- [ ] 2.5.5 Test CLI with LLKB options

---

## Phase 3: Prompt Integration

**Goal:** Update journey-implement to use the LLKB adapter before AutoGen.
**Dependencies:** Phase 1, Phase 2
**Estimated Lines:** ~80

### Task 3.1: Update journey-implement Prompt

**File:** `prompts/artk.journey-implement.md` (MODIFY)
**Lines:** ~50

- [ ] 3.1.1 Add Step 2.5 after LLKB context loading
  - Title: "Export LLKB for AutoGen (MANDATORY)"
  - Command: `npx artk-llkb export --for-autogen --output <harnessRoot>/ --min-confidence 0.7`
  - Expected output format
  - Error handling guidance

- [ ] 3.1.2 Update Step 3 (AutoGen command) to include LLKB flags
  - Add `--llkb-config <harnessRoot>/autogen-llkb.config.yml`
  - Add `--llkb-glossary <harnessRoot>/llkb-glossary.ts`

- [ ] 3.1.3 Update mandatory gates box
  - Add Gate 2.5: Export LLKB for AutoGen

- [ ] 3.1.4 Update batch execution policy
  - Serial mode: Export once, use for all journeys
  - Subagent mode: Each subagent uses same export (no re-export)

- [ ] 3.1.5 Add LLKB export statistics output template

### Task 3.2: Update journey-implement (packages/cli)

**File:** `packages/cli/assets/prompts/artk.journey-implement.md` (MODIFY)
**Lines:** ~50

- [ ] 3.2.1 Apply same changes as Task 3.1 to packaged version
  - Keep in sync with main prompts/

### Task 3.3: Update Subagent Instructions

**File:** `prompts/artk.journey-implement.md` (MODIFY - subagent section)
**Lines:** ~20

- [ ] 3.3.1 Update subagent spawn instructions
  - Subagents should NOT re-export LLKB
  - Subagents should use pre-exported files
  - Pass export paths to subagent context

---

## Phase 4: Learning Loop

**Goal:** Enable LLKB to learn from test execution outcomes.
**Dependencies:** Phase 1, Phase 2, Phase 3
**Estimated Lines:** ~180

### Task 4.1: Create Learning Module

**File:** `core/typescript/llkb/learning.ts` (NEW)
**Lines:** ~100

- [ ] 4.1.1 Define learning input interfaces
  - `LearningInput` (base)
  - `PatternLearnedInput`
  - `ComponentUsedInput`
  - `LessonAppliedInput`

- [ ] 4.1.2 Implement `recordPatternLearned(input: PatternLearnedInput): Promise<void>`
  - Find matching lesson
  - Update metrics (occurrences, successRate, lastSuccess)
  - Recalculate confidence
  - Add journey to journeyIds
  - Log to history

- [ ] 4.1.3 Implement `recordComponentUsed(input: ComponentUsedInput): Promise<void>`
  - Find component by ID
  - Update metrics (totalUses, lastUsed, successRate)
  - Log to history

- [ ] 4.1.4 Implement `recordLessonApplied(input: LessonAppliedInput): Promise<void>`
  - Find lesson by ID
  - Update metrics
  - Log to history

- [ ] 4.1.5 Add helper: `calculateNewSuccessRate(metrics, success)`
- [ ] 4.1.6 Add helper: `calculateNewComponentSuccessRate(metrics, success)`

### Task 4.2: Add Learning CLI Commands

**File:** `core/typescript/llkb/cli.ts` (MODIFY)
**Lines:** ~40

- [ ] 4.2.1 Add `learn` subcommand
  - `--type <pattern|component|lesson>`
  - `--id <ID>` (for component/lesson)
  - `--journey <JRN-ID>`
  - `--prompt <journey-implement|journey-verify>`
  - `--success` flag
  - `--context <text>` (optional)

- [ ] 4.2.2 Implement `runLearnCommand(args)` function
  - Dispatch to appropriate record function
  - Display confirmation
  - Handle errors

### Task 4.3: Update journey-verify Prompt

**File:** `prompts/artk.journey-verify.md` (MODIFY)
**Lines:** ~30

- [ ] 4.3.1 Add learning hooks after successful verification
  - Record component usage
  - Record lesson applications
  - Update confidence metrics

- [ ] 4.3.2 Add learning hooks after failed verification
  - Record pattern failures
  - Flag for review

- [ ] 4.3.3 Add CLI commands to verification flow
  - `npx artk-llkb learn --type component --id COMP012 --journey JRN-0001 --success`

### Task 4.4: Update journey-verify (packages/cli)

**File:** `packages/cli/assets/prompts/artk.journey-verify.md` (MODIFY)
**Lines:** ~30

- [ ] 4.4.1 Apply same changes as Task 4.3 to packaged version

### Task 4.5: Update LLKB Index

**File:** `core/typescript/llkb/index.ts` (MODIFY)
**Lines:** ~5

- [ ] 4.5.1 Export learning module functions

### Task 4.6: Write Unit Tests

**File:** `core/typescript/llkb/__tests__/learning.test.ts` (NEW)
**Lines:** ~60

- [ ] 4.6.1 Test `recordPatternLearned` updates lesson metrics
- [ ] 4.6.2 Test `recordComponentUsed` updates component metrics
- [ ] 4.6.3 Test `recordLessonApplied` updates lesson metrics
- [ ] 4.6.4 Test history logging
- [ ] 4.6.5 Test error handling for missing lessons/components

---

## Phase 5: Version Tracking & Journey-Maintain Support

**Goal:** Enable tracking LLKB versions in tests and support for future journey-maintain.
**Dependencies:** All previous phases
**Estimated Lines:** ~120

### Task 5.1: Create Versioning Module

**File:** `core/typescript/llkb/versioning.ts` (NEW)
**Lines:** ~80

- [ ] 5.1.1 Define `VersionComparison` interface
  - `testLlkbVersion: string | null`
  - `currentLlkbVersion: string`
  - `isOutdated: boolean`
  - `daysSinceUpdate: number`
  - `newPatternsAvailable: number`
  - `newComponentsAvailable: number`
  - `recommendation: 'update' | 'skip' | 'review'`

- [ ] 5.1.2 Implement `compareVersions(testFilePath, llkbRoot?): Promise<VersionComparison>`
  - Read test file header for `@llkb-version`
  - Get current LLKB version from analytics.json
  - Calculate differences
  - Determine recommendation

- [ ] 5.1.3 Implement `countNewEntriesSince(version, type): number`
  - Count lessons/components added since version date

- [ ] 5.1.4 Implement `extractLlkbVersionFromTest(testContent): string | null`
  - Parse `@llkb-version` from header comment

- [ ] 5.1.5 Implement `updateTestLlkbVersion(testPath, version): void`
  - Update `@llkb-version` in test file header

### Task 5.2: Update AutoGen Code Generation

**File:** `core/typescript/autogen/src/codegen/generateTest.ts` (MODIFY)
**Lines:** ~20

- [ ] 5.2.1 Add LLKB version to generated test header
  - `@llkb-version <timestamp>`
  - `@llkb-entries <count>`

- [ ] 5.2.2 Pass LLKB metadata through generation options

### Task 5.3: Add Version Check CLI Commands

**File:** `core/typescript/llkb/cli.ts` (MODIFY)
**Lines:** ~30

- [ ] 5.3.1 Add `check-updates` subcommand
  - `--tests-dir <path>`
  - List tests needing updates
  - Show statistics

- [ ] 5.3.2 Add `update-test` subcommand
  - `--test <path>`
  - `--dry-run` flag
  - Re-export and regenerate single test

- [ ] 5.3.3 Add `update-tests` subcommand
  - `--tests-dir <path>`
  - `--confirm` flag
  - Batch update all outdated tests

### Task 5.4: Update LLKB Index

**File:** `core/typescript/llkb/index.ts` (MODIFY)
**Lines:** ~5

- [ ] 5.4.1 Export versioning module functions

### Task 5.5: Write Unit Tests

**File:** `core/typescript/llkb/__tests__/versioning.test.ts` (NEW)
**Lines:** ~50

- [ ] 5.5.1 Test `compareVersions` with outdated test
- [ ] 5.5.2 Test `compareVersions` with up-to-date test
- [ ] 5.5.3 Test `extractLlkbVersionFromTest`
- [ ] 5.5.4 Test `countNewEntriesSince`
- [ ] 5.5.5 Test recommendation logic

---

## Phase 6: Documentation & CLAUDE.md Update

**Goal:** Document the integration and add journey-maintain note.
**Dependencies:** All previous phases
**Estimated Lines:** ~50

### Task 6.1: Update CLAUDE.md

**File:** `CLAUDE.md` (MODIFY)
**Lines:** ~20

- [ ] 6.1.1 Add section: "LLKB-AutoGen Integration"
  - Brief explanation of how they work together
  - Reference to research documents

- [ ] 6.1.2 Add note about journey-maintain
  ```markdown
  ## Journey-Maintain and LLKB Updates

  **NOTE:** When `/artk.journey-maintain` is implemented, it must:
  1. Check each test's `@llkb-version` against current LLKB state
  2. Prompt user before updating older tests to latest LLKB version
  3. Show diff preview of changes
  4. Support batch updates with confirmation
  5. Rollback on test failure after update

  This ensures tests benefit from LLKB improvements while maintaining user control.
  ```

### Task 6.2: Update packages/cli CLAUDE.md (if exists)

**File:** `packages/cli/README.md` or similar (MODIFY if applicable)
**Lines:** ~10

- [ ] 6.2.1 Document new CLI commands
  - `artk-llkb export --for-autogen`
  - `artk-llkb learn`
  - `artk-llkb check-updates`

### Task 6.3: Create Integration Guide

**File:** `docs/llkb-autogen-integration.md` (NEW - optional)
**Lines:** ~100

- [ ] 6.3.1 Overview of integration
- [ ] 6.3.2 How to enable LLKB-AutoGen integration
- [ ] 6.3.3 CLI commands reference
- [ ] 6.3.4 Troubleshooting guide

---

## Task Summary by File

| File | Phase | New/Modify | Tasks |
|------|-------|------------|-------|
| `llkb/adapter-types.ts` | 1 | NEW | 1.1.1-1.1.8 |
| `llkb/adapter-transforms.ts` | 1 | NEW | 1.2.1-1.2.7 |
| `llkb/adapter.ts` | 1 | NEW | 1.3.1-1.3.5 |
| `llkb/cli.ts` | 1,4,5 | MODIFY | 1.4.1-1.4.3, 4.2.1-4.2.2, 5.3.1-5.3.3 |
| `llkb/index.ts` | 1,4,5 | MODIFY | 1.5.1-1.5.3, 4.5.1, 5.4.1 |
| `llkb/__tests__/adapter.test.ts` | 1 | NEW | 1.6.1-1.6.8 |
| `autogen/config/schema.ts` | 2 | MODIFY | 2.1.1-2.1.3 |
| `autogen/config/loader.ts` | 2 | MODIFY | 2.2.1-2.2.4 |
| `autogen/mapping/glossary.ts` | 2 | MODIFY | 2.3.1-2.3.6 |
| `autogen/cli/commands/generate.ts` | 2 | MODIFY | 2.4.1-2.4.4 |
| `autogen/__tests__/llkb-integration.test.ts` | 2 | NEW | 2.5.1-2.5.5 |
| `prompts/artk.journey-implement.md` | 3 | MODIFY | 3.1.1-3.1.5, 3.3.1 |
| `packages/.../journey-implement.md` | 3 | MODIFY | 3.2.1 |
| `llkb/learning.ts` | 4 | NEW | 4.1.1-4.1.6 |
| `prompts/artk.journey-verify.md` | 4 | MODIFY | 4.3.1-4.3.3 |
| `packages/.../journey-verify.md` | 4 | MODIFY | 4.4.1 |
| `llkb/__tests__/learning.test.ts` | 4 | NEW | 4.6.1-4.6.5 |
| `llkb/versioning.ts` | 5 | NEW | 5.1.1-5.1.5 |
| `autogen/codegen/generateTest.ts` | 5 | MODIFY | 5.2.1-5.2.2 |
| `llkb/__tests__/versioning.test.ts` | 5 | NEW | 5.5.1-5.5.5 |
| `CLAUDE.md` | 6 | MODIFY | 6.1.1-6.1.2 |

---

## Implementation Order

### Critical Path (Must be sequential)

```
Phase 1: Adapter Module
    ↓
Phase 2: AutoGen Extensions
    ↓
Phase 3: Prompt Integration
    ↓
Phase 4: Learning Loop
    ↓
Phase 5: Version Tracking
    ↓
Phase 6: Documentation
```

### Parallelizable Tasks

Within each phase, some tasks can be parallelized:

**Phase 1:**
- Tasks 1.1 and 1.2 can be done in parallel (types and transforms)
- Task 1.3 depends on 1.1 and 1.2
- Tasks 1.4 and 1.5 can be done in parallel after 1.3
- Task 1.6 (tests) should be done last

**Phase 2:**
- Tasks 2.1 and 2.3 can be done in parallel (schema and glossary)
- Task 2.2 depends on 2.1
- Task 2.4 depends on 2.2 and 2.3
- Task 2.5 (tests) should be done last

---

## Testing Strategy

### Unit Tests (Per Phase)

| Phase | Test File | Coverage |
|-------|-----------|----------|
| 1 | `adapter.test.ts` | Transformations, export function |
| 2 | `llkb-integration.test.ts` | Config merge, glossary loading |
| 4 | `learning.test.ts` | Metric updates, history logging |
| 5 | `versioning.test.ts` | Version comparison, recommendations |

### Integration Tests

After all phases:
- [ ] Full flow test: LLKB → Export → AutoGen → Test
- [ ] Parallel execution test with multiple journeys
- [ ] Learning loop test: Generate → Verify → Learn → Regenerate

### Manual Testing Checklist

- [ ] Export command works: `npx artk-llkb export --for-autogen`
- [ ] AutoGen accepts LLKB flags: `npx artk-autogen generate --llkb-config ...`
- [ ] journey-implement prompt uses new flow
- [ ] Learning commands work: `npx artk-llkb learn ...`
- [ ] Version check works: `npx artk-llkb check-updates`

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking existing tests | LLKB integration is opt-in (disabled by default) |
| Non-deterministic generation | Export creates immutable snapshot |
| Parallel execution conflicts | Export once, read-only during generation |
| Learning feedback loops | Confidence thresholds prevent low-quality data |
| Pattern conflicts | Core patterns always take priority |

---

## Success Criteria

1. **Functional:**
   - [ ] LLKB export generates valid config and glossary files
   - [ ] AutoGen consumes LLKB exports without errors
   - [ ] Generated tests use LLKB-learned patterns
   - [ ] Learning loop updates LLKB metrics

2. **Non-Functional:**
   - [ ] No regression in existing tests (zero breaking changes)
   - [ ] Export completes in < 5 seconds for typical LLKB
   - [ ] All new code has > 80% test coverage

3. **Documentation:**
   - [ ] CLAUDE.md updated with journey-maintain note
   - [ ] Research documents capture design decisions

---

## Estimated Timeline

| Phase | Effort | Dependencies |
|-------|--------|--------------|
| Phase 1 | 1-2 days | None |
| Phase 2 | 1-2 days | Phase 1 |
| Phase 3 | 0.5 days | Phase 1, 2 |
| Phase 4 | 1-2 days | Phase 1, 2, 3 |
| Phase 5 | 1 day | Phase 1-4 |
| Phase 6 | 0.5 days | Phase 1-5 |

**Total:** 5-8 days of implementation work

---

## Related Documents

- `research/2026-01-23_llkb-autogen-integration-debate.md` - Architecture debate
- `research/2026-01-23_llkb-autogen-integration-specification.md` - Technical specification
