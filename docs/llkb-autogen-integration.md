# LLKB-AutoGen Integration Guide

**Last Updated:** 2026-01-23
**Version:** 1.0.0

## Overview

This guide explains how LLKB (Lessons Learned Knowledge Base) integrates with AutoGen to create a self-improving test generation system in ARTK.

## Table of Contents

- [Architecture](#architecture)
- [How It Works](#how-it-works)
- [Integration Points](#integration-points)
- [Workflow Examples](#workflow-examples)
- [CLI Reference](#cli-reference)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Architecture

### The Adapter Pattern

LLKB and AutoGen integration follows the **Adapter Pattern**:

```
┌─────────────────────────────────────────────────────────┐
│                  LLKB Knowledge Base                     │
│  (artk-e2e/llkb/)                                       │
│  ├─ lessons.json       (patterns, selectors, timing)   │
│  ├─ components.json    (reusable page objects)         │
│  └─ analytics.json     (confidence scores, stats)      │
└─────────────────────────────────────────────────────────┘
                          ↓
              ┌──────────────────────┐
              │  LLKB Adapter        │
              │  (export command)    │
              └──────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              AutoGen-Compatible Files                    │
│  (artk-e2e/)                                            │
│  ├─ autogen-llkb.config.yml  (patterns, overrides)     │
│  └─ llkb-glossary.ts          (term mappings)          │
└─────────────────────────────────────────────────────────┘
                          ↓
              ┌──────────────────────┐
              │  AutoGen Engine      │
              │  (generate command)  │
              └──────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              Generated Test Files                        │
│  (artk-e2e/tests/)                                      │
│  └─ *.spec.ts (with @llkb-version metadata)            │
└─────────────────────────────────────────────────────────┘
                          ↓
              ┌──────────────────────┐
              │  Learning Loop       │
              │  (verify + learn)    │
              └──────────────────────┘
                          ↓
                (feedback to LLKB)
```

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| **LLKB Adapter** | `core/typescript/llkb/adapter.ts` | Exports LLKB knowledge to AutoGen format |
| **Learning Module** | `core/typescript/llkb/learning.ts` | Records outcomes back to LLKB |
| **Versioning Module** | `core/typescript/llkb/versioning.ts` | Tracks LLKB versions in test files |
| **AutoGen Extensions** | `core/typescript/autogen/src/` | Config/glossary loaders |

## How It Works

### 1. Knowledge Accumulation

LLKB accumulates knowledge from multiple sources:

- **Manual lessons**: Created by developers during `/artk.discover-foundation`
- **Component definitions**: Reusable page objects and flows
- **Learning events**: Recorded during test verification
- **Pattern discovery**: Identified from successful test executions

Example lesson:
```json
{
  "id": "L042",
  "category": "ui-interaction",
  "trigger": "edit ag-grid cell at row {row} column {column}",
  "pattern": "editCell\\(row: (\\d+), column: '([^']+)', value: '([^']+)'\\)",
  "solution": "Use ag-grid helper editCell method",
  "metrics": {
    "confidence": 0.92,
    "occurrences": 15,
    "successRate": 0.94
  }
}
```

### 2. Pre-Generation Export

Before running AutoGen, export LLKB knowledge:

```bash
npx artk-llkb export --for-autogen --output artk-e2e/ --min-confidence 0.7
```

This generates:

**autogen-llkb.config.yml:**
```yaml
version: 1
exportedAt: "2026-01-23T10:00:00Z"
minConfidence: 0.7

additionalPatterns:
  - name: "llkb-ag-grid-edit-cell"
    regex: "^(?:user\\s+)?edits?\\s+cell\\s+..."
    primitiveType: "callModule"
    module: "ag-grid"
    method: "editCell"
    source:
      lessonId: "L042"
      confidence: 0.92
```

**llkb-glossary.ts:**
```typescript
export const llkbGlossary = new Map<string, IRPrimitive>([
  ["wait for grid to load", {
    type: "callModule",
    module: "ag-grid",
    method: "waitForLoad"
  }],
  // ... more entries
]);
```

### 3. Enhanced Generation

AutoGen loads LLKB extensions during generation:

```bash
npx artk-autogen generate \
  --config artk-e2e/autogen.config.yml \
  --llkb-config artk-e2e/autogen-llkb.config.yml \
  --llkb-glossary artk-e2e/llkb-glossary.ts \
  -o artk-e2e/tests/ -m artk-e2e/journeys/JRN-0001.md
```

**Priority rules:**
- Core glossary > LLKB glossary (LLKB extends, never overrides)
- Higher confidence patterns win
- More recent lessons win (equal confidence)

### 4. Learning Loop

After test verification, outcomes feed back to LLKB:

```bash
# Automatic (within journey-verify prompt)
# Record successful component usage
npx artk-llkb learn --type component --id COMP012 --journey JRN-0001 --success

# Manual (after fixing flaky test)
# Record new selector pattern
npx artk-llkb learn --type pattern --journey JRN-0001 --success \
  --context "Save button" \
  --selector-strategy testid \
  --selector-value btn-save
```

## Integration Points

### Journey-Implement (Step 2.5)

**Location:** `.github/prompts/artk.journey-implement.prompt.md`

```markdown
## Step 2.5: Export LLKB for AutoGen (MANDATORY)

Before running AutoGen, export LLKB knowledge:

```bash
npx artk-llkb export --for-autogen \
  --output <harnessRoot>/ \
  --min-confidence 0.7
```

Expected output:
```
LLKB Export for AutoGen
========================
Exported patterns: 12
Exported modules: 8
Generated glossary entries: 24

Output files:
  - artk-e2e/autogen-llkb.config.yml
  - artk-e2e/llkb-glossary.ts
```

If export fails:
- Check LLKB exists: `.artk/llkb/`
- Check enabled: `config.yml` has `enabled: true`
- If no high-confidence entries: Continue without LLKB (warning only)
```

### Journey-Verify (Learning Hooks)

**Location:** `.github/prompts/artk.journey-verify.prompt.md`

After successful verification:
```typescript
// Auto-record component usage
if (componentUsed) {
  await recordComponentUsed({
    journeyId: 'JRN-0001',
    componentId: 'COMP012',
    success: true,
  });
}

// Auto-record lesson application
if (lessonApplied) {
  await recordLessonApplied({
    journeyId: 'JRN-0001',
    lessonId: 'L042',
    success: true,
  });
}
```

### Journey-Maintain (Future)

**Status:** Not yet implemented (see CLAUDE.md for specification)

Will handle:
- Version checking (`@llkb-version` in test headers)
- Batch updates of outdated tests
- Rollback on verification failure
- LLKB health maintenance

## Workflow Examples

### Example 1: First-Time Setup

```bash
# 1. Initialize ARTK
artk init /path/to/project

# 2. Discover foundation and create LLKB
cd artk-e2e
# (Use GitHub Copilot)
/artk.discover-foundation

# 3. Generate first Journey
/artk.journey-propose
/artk.journey-define

# 4. Implement with LLKB (minimal knowledge at this point)
/artk.journey-implement
# → Exports LLKB (may have 0-5 entries initially)
# → Generates test using AutoGen + LLKB

# 5. Verify and learn
/artk.journey-verify
# → Records component usages
# → Boosts confidence scores
```

### Example 2: Mature Project with Rich LLKB

```bash
# After 20+ Journeys implemented

# 1. Check LLKB health
npx artk-llkb stats
# Output:
# Lessons: 45 active, avg confidence 0.85
# Components: 23 active, 156 total reuses

# 2. Implement new Journey
/artk.journey-implement
# → Exports 45 lessons as patterns
# → Generates 24 glossary entries
# → AutoGen uses these for smarter generation

# 3. Result: Better test on first try
# - Correct selectors from LLKB lessons
# - Reused components for common flows
# - Timing hints prevent flakiness
```

### Example 3: Updating Outdated Tests

```bash
# Check for outdated tests
npx artk-llkb check-updates --tests-dir artk-e2e/tests/

# Output:
# Tests needing LLKB update:
#   - login.spec.ts (LLKB: 2026-01-15, current: 2026-01-23, +8 patterns)
#   - checkout.spec.ts (LLKB: 2026-01-10, current: 2026-01-23, +12 patterns)

# Dry run to preview
npx artk-llkb update-test --test artk-e2e/tests/login.spec.ts --dry-run

# Update for real
npx artk-llkb update-test --test artk-e2e/tests/login.spec.ts

# Or batch update all
npx artk-llkb update-tests --tests-dir artk-e2e/tests/
```

## CLI Reference

### Export Command

```bash
npx artk-llkb export --for-autogen --output <dir> [options]
```

**Options:**
- `--min-confidence <n>` - Minimum confidence (default: 0.7)
- `--categories <list>` - Filter by categories (comma-separated)
- `--scopes <list>` - Filter by scopes (comma-separated)
- `--dry-run` - Preview without writing files
- `--glossary-only` - Generate only glossary file
- `--config-only` - Generate only config file
- `--format <yaml|json>` - Output format (default: yaml)

**Output files:**
- `<dir>/autogen-llkb.config.yml` (or `.json`)
- `<dir>/llkb-glossary.ts`

### Version Management

```bash
# Check updates
npx artk-llkb check-updates --tests-dir <dir> [--pattern <glob>]

# Update single test (singular form - alias for updating one file)
npx artk-llkb update-test --test <file> [--dry-run]

# Batch update (plural form - update multiple files)
npx artk-llkb update-tests --tests-dir <dir> [--dry-run] [--pattern <glob>]
```

**Note:** `update-test` (singular) is an alias for updating a single test file.
Both forms are available for clarity: use `update-test` for single files,
`update-tests` for batch operations.

### Learning Commands

```bash
# Record component usage
npx artk-llkb learn \
  --type component \
  --id <component-id> \
  --journey <journey-id> \
  --success

# Record lesson application
npx artk-llkb learn \
  --type lesson \
  --id <lesson-id> \
  --journey <journey-id> \
  --success \
  --context "<description>"

# Record pattern
npx artk-llkb learn \
  --type pattern \
  --journey <journey-id> \
  --success \
  --context "<step-text>" \
  --selector-strategy <strategy> \
  --selector-value <value>
```

### Health Commands

```bash
# Health check
npx artk-llkb health

# Statistics
npx artk-llkb stats

# Prune old data
npx artk-llkb prune \
  --history-retention-days <days> \
  --archive-inactive-components \
  --inactive-days <days>
```

## Best Practices

### 1. Export Before Every Generation

Always export LLKB before running AutoGen:

```bash
# ✅ GOOD
npx artk-llkb export --for-autogen --output artk-e2e/
npx artk-autogen generate --llkb-config ... --llkb-glossary ...

# ❌ BAD (misses latest LLKB knowledge)
npx artk-autogen generate ...
```

### 2. Maintain High Confidence Threshold

Use `--min-confidence 0.7` (default) or higher:

```bash
# ✅ GOOD (only export proven patterns)
npx artk-llkb export --for-autogen --output artk-e2e/ --min-confidence 0.7

# ❌ BAD (exports untested patterns)
npx artk-llkb export --for-autogen --output artk-e2e/ --min-confidence 0.3
```

### 3. Review Before Batch Updates

Always dry-run before batch updates:

```bash
# ✅ GOOD
npx artk-llkb update-tests --tests-dir artk-e2e/tests/ --dry-run
# Review output, then:
npx artk-llkb update-tests --tests-dir artk-e2e/tests/

# ❌ BAD (no preview)
npx artk-llkb update-tests --tests-dir artk-e2e/tests/
```

### 4. Record Learning Events Promptly

Record outcomes immediately after verification:

```bash
# ✅ GOOD (within journey-verify)
# Test passed → Record component usage
npx artk-llkb learn --type component --id COMP012 --journey JRN-0001 --success

# ❌ BAD (delayed recording loses context)
# Several days later... what component was that?
```

### 5. Regular Health Checks

Monitor LLKB health weekly:

```bash
npx artk-llkb health
npx artk-llkb stats

# Prune monthly
npx artk-llkb prune --history-retention-days 90
```

## Troubleshooting

### Export Fails: "LLKB directory not found"

**Cause:** LLKB not initialized

**Fix:**
```bash
# Run discover-foundation to create LLKB
cd artk-e2e
# Use GitHub Copilot Chat
/artk.discover-foundation
```

**Note:** As of version 1.0, LLKB files are generated in `artk-e2e/llkb/` by default
(changed from the legacy `.artk/llkb/` location). The `--llkb-root` flag can be used
to specify an alternative location if needed.

### Export Succeeds but 0 Entries

**Cause:** No high-confidence lessons yet (new project)

**Fix:** This is normal for new projects. As you:
1. Implement more Journeys
2. Record learning events
3. Verify tests successfully

LLKB will grow and future exports will have more entries.

### AutoGen Ignores LLKB Patterns

**Cause:** Core patterns take precedence

**Fix:** LLKB extends but never overrides core. If a core pattern matches, it wins. This is by design to maintain stability.

### Test Update Fails Verification

**Cause:** New LLKB pattern changed test behavior

**Fix:** The update command automatically rolls back. Review the diff:

```bash
# Compare test versions
diff artk-e2e/tests/login.spec.ts artk-e2e/tests/login.spec.ts.llkb-backup-*

# Manually review what changed
# If pattern is incorrect, archive the lesson:
# Edit artk-e2e/llkb/lessons.json, set "archived": true
```

### Glossary Import Fails

**Cause:** TypeScript syntax error in generated glossary

**Fix:**
```bash
# Validate the glossary file
npx tsc --noEmit artk-e2e/llkb-glossary.ts

# If errors, re-export with fewer entries
npx artk-llkb export --for-autogen --output artk-e2e/ --min-confidence 0.9
```

### Performance: Export Takes Too Long

**Cause:** Large LLKB with many lessons

**Fix:**
```bash
# Prune old/inactive lessons first
npx artk-llkb prune --archive-inactive-components --inactive-days 180

# Or filter by scope
npx artk-llkb export --for-autogen --output artk-e2e/ \
  --scopes universal,framework:angular
```

## References

- **[Full Technical Specification](../research/2026-01-23_llkb-autogen-integration-specification.md)**
- **[Architecture Debate](../research/2026-01-23_llkb-autogen-integration-debate.md)**
- **[CLAUDE.md](../CLAUDE.md)** - LLKB-AutoGen Integration section
- **[CLI README](../packages/cli/README.md)** - LLKB Commands section
- **Source Code:**
  - `core/typescript/llkb/adapter.ts` - Export implementation
  - `core/typescript/llkb/learning.ts` - Learning loop
  - `core/typescript/llkb/versioning.ts` - Version management
  - `core/typescript/llkb/cli.ts` - CLI commands

---

**Questions or Issues?** See `CLAUDE.md` for contributing guidelines or file an issue with details about your LLKB integration challenge.
