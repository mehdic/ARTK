# LLKB-AutoGen Integration Architecture Debate

**Date:** 2026-01-23
**Topic:** How can we integrate LLKB with AutoGen so that AutoGen benefits from LLKB's growing knowledge while maintaining determinism and not breaking existing tests?

---

## Executive Summary

This document captures a multi-AI debate exploring architectural solutions for integrating the LLKB (Lessons Learned Knowledge Base) with the AutoGen deterministic test generation engine. The goal is to enable AutoGen to evolve and improve as LLKB grows richer, while maintaining backwards compatibility and determinism.

**Final Solution:** The LLKB Adapter Pattern - a minimal-change approach that exports LLKB knowledge to configuration files that AutoGen reads, preserving determinism through snapshot-based exports.

---

## Context & Current State

### AutoGen Architecture

AutoGen is a deterministic test generation engine that transforms Journey markdown files into Playwright E2E tests:

```
Journey.md → Parse → IR (Intermediate Representation) → Generate → Test.spec.ts
```

**Key Files:**
- `core/typescript/autogen/src/index.ts` - Main API
- `core/typescript/autogen/src/ir/types.ts` - IR type definitions
- `core/typescript/autogen/src/mapping/patterns.ts` - Hard-coded regex patterns
- `core/typescript/autogen/src/mapping/glossary.ts` - Term-to-primitive mapping

**Current Limitations:**
- Patterns are hard-coded in TypeScript
- No awareness of LLKB
- Cannot learn from test execution outcomes

### LLKB Architecture

LLKB is a knowledge base containing lessons, components, and patterns learned during test development:

**Key Files:**
- `.artk/llkb/lessons.json` - Captured patterns and fixes
- `.artk/llkb/components.json` - Reusable code modules
- `.artk/llkb/patterns/*.json` - Category-specific patterns
- `.artk/llkb/config.yml` - Configuration
- `core/typescript/llkb/` - TypeScript library

**LLKB Types:**

```typescript
// Categories
type LLKBCategory =
  | 'selector' | 'timing' | 'quirk' | 'auth'
  | 'data' | 'assertion' | 'navigation' | 'ui-interaction';

// Lesson structure
interface Lesson {
  id: string;
  title: string;
  pattern: string;
  trigger: string;
  category: LLKBCategory;
  scope: LLKBScope;
  journeyIds: string[];
  metrics: LessonMetrics;
  validation: LessonValidation;
}

// Component structure
interface Component {
  id: string;
  name: string;
  description: string;
  category: ComponentCategory;
  scope: LLKBScope;
  filePath: string;
  metrics: ComponentMetrics;
  source: ComponentSource;
}
```

### Current Integration (Prompt-Level Only)

Currently, LLKB is loaded by prompts BEFORE AutoGen runs, but AutoGen has no awareness of LLKB:

```
journey-implement.prompt.md:
├─ Step 2: Load LLKB context → Display to user
├─ Step 3: Run AutoGen CLI   → npx artk-autogen generate <journey.md>
└─ Step 5: Merge LLKB updates → After test generation

AutoGen CLI:
├─ Input:  Journey markdown file only
├─ Output: Playwright test code
└─ LLKB:   No access, no parameters, no awareness
```

---

## Problem Statement

| Aspect | Current State | Desired State |
|--------|--------------|---------------|
| **Pattern matching** | Hard-coded regex only | Extensible from LLKB |
| **Selector strategies** | Fixed priority | App-specific overrides |
| **Module calls** | Manual configuration | Auto-discovered from LLKB |
| **Evolution** | Manual code changes | Self-improving from learnings |

**Constraints (Non-Negotiable):**
1. Must NOT break existing tests
2. Must maintain determinism (same input → same output)
3. Must support parallel execution
4. Minimal structural changes to AutoGen

---

## Multi-AI Debate

**Debate Style:** Thorough (5 rounds)
**Participants:** Claude (Architect), Gemini (Challenger), Codex (Pragmatist)

### Round 1: Problem Framing

#### Claude (Architect)

The core tension is between **determinism** (same input → same output) and **evolution** (better output as LLKB grows). These seem mutually exclusive but aren't if we think about it differently.

**Key insight**: AutoGen's determinism is about *consistent behavior for a given configuration*, not about *never changing*. If we version the configuration, we can evolve while maintaining reproducibility.

**Proposal: Configuration-Driven Evolution**

```
AutoGen today:
  Journey.md + [hardcoded patterns] → IR → Test

AutoGen with LLKB:
  Journey.md + [patterns.json @ version X] → IR → Test
```

Where `patterns.json` is periodically synced from LLKB's learned patterns. The key is:
1. Patterns file is versioned
2. Existing tests pin to their pattern version
3. New tests use latest patterns

#### Gemini (Challenger)

I disagree with the versioning approach. It creates a maintenance nightmare:
- Which version do I use for which test?
- What happens when patterns conflict?
- How do you handle parallel execution with different versions?

**Counter-proposal: Extension Points, Not Replacement**

AutoGen should have **plugin architecture**:

```typescript
interface AutoGenPlugin {
  // Called before pattern matching
  preMatch?(step: string): IRPrimitive | undefined;
  // Called after pattern matching fails
  postMatch?(step: string): IRPrimitive | undefined;
  // Called to enhance selectors
  enhanceSelector?(locator: LocatorSpec): LocatorSpec;
}
```

LLKB becomes a plugin that:
- Provides fallback patterns for unmatched steps
- Enhances selectors with learned app-specific knowledge
- Never replaces core patterns, only extends

This preserves determinism because:
- Core patterns are unchanged
- Plugin output is deterministic given LLKB state
- No versioning needed—just snapshot LLKB at test generation time

#### Codex (Pragmatist)

Both approaches are over-engineered for the actual problem. Let me reframe:

**What does LLKB actually contain that would help AutoGen?**
1. **Lessons** - Patterns/fixes for common problems
2. **Components** - Reusable code snippets
3. **App quirks** - Timing issues, selector workarounds

**What can AutoGen actually use?**
- More regex patterns for step matching
- Better selector strategies
- Timing hints

**Simplest solution: LLKB exports to AutoGen's config**

```yaml
# autogen.config.yml (generated from LLKB)
additionalPatterns:
  - name: "ag-grid-cell-edit"
    regex: "edit cell .+ in .+ grid"
    template: "agGridHelper.editCell({{row}}, {{col}}, {{value}})"

selectorOverrides:
  "Save button": { strategy: "testid", value: "btn-save" }

timingHints:
  afterAgGridEdit: 500
```

AutoGen reads this config. Period.
- No plugin architecture
- No versioning complexity
- LLKB updates config → AutoGen uses it

---

### Round 2: Parallel Execution Challenge

#### Gemini

Codex's config approach fails for parallel execution. Consider:

```
Time T1: Journey A starts, loads autogen.config.yml v1
Time T2: Journey B starts, loads autogen.config.yml v1
Time T3: Journey A discovers new pattern, updates LLKB
Time T4: LLKB sync runs, updates autogen.config.yml to v2
Time T5: Journey B finishes—was it using v1 or v2?
```

This is a race condition. Either:
1. Config is stale (misses new knowledge)
2. Config changes mid-execution (non-deterministic)

**My plugin approach handles this**: Each AutoGen execution loads LLKB state at start and keeps it immutable for the duration.

#### Claude

Gemini raises a valid concern but the solution is simpler: **Read-only LLKB during generation, write-only LLKB during verification**.

```
Generation phase (parallel-safe):
  AutoGen reads LLKB snapshot (immutable)
  Multiple journeys can run in parallel
  All read same snapshot

Verification phase (sequential updates):
  Tests run → Failures detected → Lessons learned
  LLKB updated atomically
  Next generation batch uses new knowledge
```

This is like a database with read-committed isolation. You don't need plugins or complex versioning.

#### Codex

Exactly my point, Claude. The config file approach naturally supports this:

1. **Generation time**: Read `autogen.config.yml` once, use for entire batch
2. **Post-verification**: Prompt updates LLKB → regenerates config
3. **Next batch**: Uses new config

**No code changes to AutoGen required**. It already reads config files. We just need:
1. A script to generate `autogen.config.yml` from LLKB
2. The prompt calls this script before running AutoGen

```bash
# Before AutoGen
npx artk-llkb export-config --output autogen.config.yml

# Run AutoGen (unchanged)
npx artk-autogen generate journey.md
```

---

### Round 3: The Evolution Mechanism

#### Claude

We've solved parallel execution but not evolution. How does LLKB knowledge actually improve AutoGen over time?

**I propose three evolution channels:**

1. **Pattern Learning** (auto):
   - LLKB tracks which step texts fail pattern matching
   - After N failures with same structure, prompts propose new pattern
   - Human approves → Pattern added to export

2. **Selector Refinement** (semi-auto):
   - LLKB tracks selector failures per element
   - When confidence drops, flags for review
   - Human provides better selector → Export updated

3. **Component Injection** (manual):
   - High-confidence components in LLKB become module calls
   - AutoGen's `callModule` primitive references them
   - `autogen.config.yml` maps component → module path

#### Gemini

Channel 3 is the key insight! Let me expand:

**Components ARE modules**. LLKB's `components.json` already has:
- `name`: Function name
- `filePath`: Where it lives
- `category`: auth, selector, timing, etc.

AutoGen's IR already has `callModule`:

```typescript
{ type: 'callModule'; module: string; method: string; args?: unknown[] }
```

**Bridge**: AutoGen config lists available modules from LLKB:

```yaml
modules:
  - name: "waitForAgGridLoad"
    source: "llkb"  # from LLKB components
    path: "artk-e2e/components/ag-grid/waitForLoad"
  - name: "handleStickyHeader"
    source: "llkb"
    path: "artk-e2e/components/ui/handleStickyHeader"
```

When AutoGen sees step "wait for grid to load", it checks config for matching module before trying regex patterns.

#### Codex

This is getting complex again. Let me propose the **Glossary Bridge**:

AutoGen already has `glossary.ts` that maps terms to IR primitives:

```typescript
// core/typescript/autogen/src/mapping/glossary.ts
export const glossary = new Map<string, IRPrimitive>();
```

**Solution**: LLKB exports to glossary format:

```typescript
// Generated: artk-e2e/autogen-llkb-glossary.ts
export const llkbGlossary = new Map([
  ["edit ag-grid cell", { type: 'callModule', module: 'ag-grid', method: 'editCell' }],
  ["wait for sticky header", { type: 'callModule', module: 'ui', method: 'waitForStickyHeader' }],
]);
```

AutoGen loads both glossaries. Core glossary is read-only, LLKB glossary evolves.

**This is ONE file to generate. No complex config. No plugins.**

---

### Round 4: Backwards Compatibility Deep Dive

#### Gemini

Let's stress-test backwards compatibility. Scenario:

1. Test generated 6 months ago with LLKB v1
2. LLKB now at v15 with many new patterns
3. Regenerate test with updated Journey
4. Does the test change?

**Risk 1**: New pattern matches step that old pattern also matched
- Old: `click "Save"` → `click role:button "Save"`
- New: `click "Save"` → `click testid:btn-save` (learned selector)
- Test changes even though behavior is same

**Risk 2**: New module replaces inline code
- Old: 3 lines of grid interaction code
- New: `callModule('ag-grid', 'editCell', [...])`
- Test structure changes

Are these "breaking"? Functionally no, but diff yes.

#### Claude

Gemini identified the core compatibility question: **What does "not breaking" mean?**

I propose we define it precisely:

| Type | Definition | Acceptable? |
|------|------------|-------------|
| **Behavioral break** | Test fails after regen | Never |
| **Structural change** | Test code differs but passes | With notice |
| **Enhancement** | New assertions/checks added | Yes |

**Solution: Managed Blocks + Change Detection**

AutoGen already has `blocks.ts` for partial regeneration:

```typescript
// ARTK:BEGIN GENERATED
... code that AutoGen can change ...
// ARTK:END GENERATED
```

Add LLKB version tracking:

```typescript
// ARTK:LLKB_VERSION: 2026-01-23T10:00:00Z
// ARTK:BEGIN GENERATED
...
// ARTK:END GENERATED
```

When regenerating:
1. Compare LLKB version in file vs current
2. If different, run **dry-run** first
3. Show diff to user
4. User approves structural changes

#### Codex

Claude's approach is good but adds complexity. Simpler:

**LLKB-Enhanced Mode is Opt-In**

```yaml
# autogen.config.yml
llkb:
  enabled: true  # default: false
  level: "enhance"  # minimal | enhance | aggressive
  pinVersion: null  # or "2026-01-23" to pin
```

- **minimal**: Only use LLKB for unmatched steps
- **enhance**: Use LLKB selectors and modules
- **aggressive**: Full LLKB integration

Existing tests don't have this config → no LLKB → no change.
New tests opt-in → get LLKB benefits.
Migration path: Add config to existing tests one by one.

**Zero risk to existing tests because they don't enable it.**

---

### Round 5: The Elegant Solution Synthesis

#### Claude

Combining all insights, here's my synthesis:

**The LLKB Adapter Pattern**

```
┌─────────────────────────────────────────────────────────────┐
│                        LLKB                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ lessons  │  │components│  │ patterns │  │ config   │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   LLKB Adapter (NEW)                         │
│                                                              │
│  exportToAutogenConfig()  →  autogen-llkb.config.yml        │
│  generateGlossary()       →  llkb-glossary.ts               │
│  listModules()            →  module registry                 │
│                                                              │
│  (Runs BEFORE AutoGen, generates files AutoGen reads)        │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      AutoGen (UNCHANGED)                     │
│                                                              │
│  Reads: autogen.config.yml + autogen-llkb.config.yml        │
│  Merges: core glossary + llkb-glossary                      │
│  Uses: existing pattern matching + extended patterns        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Key Changes (Minimal):**

1. **New adapter module** (`@artk/llkb-adapter`):
   - Single export function
   - Generates deterministic config files

2. **AutoGen config loader change** (minor):
   - Accept array of config files
   - Merge additively

3. **AutoGen glossary loader change** (minor):
   - Accept additional glossary file path
   - Load and merge at startup

**Total AutoGen changes**: ~50 lines. No structural changes to IR, patterns, or codegen.

#### Gemini

I endorse Claude's architecture with one critical addition: **The Learning Loop**.

```
┌─────────────────── GENERATION ───────────────────┐
│                                                   │
│  LLKB → Adapter → Config → AutoGen → Tests       │
│                                                   │
└─────────────────────────────────────────────────┘
                        │
                        ▼ (tests run)
┌─────────────────── LEARNING ─────────────────────┐
│                                                   │
│  Test Results → Analyzer → LLKB Updates          │
│                                                   │
│  - New selector worked → Record                  │
│  - Pattern match failed → Log gap                │
│  - Module call succeeded → Boost confidence      │
│                                                   │
└─────────────────────────────────────────────────┘
                        │
                        ▼ (periodic)
┌─────────────────── EVOLUTION ────────────────────┐
│                                                   │
│  High-confidence patterns → Adapter exports      │
│  Failing patterns → Removed from export          │
│  New components → Added to module list           │
│                                                   │
└─────────────────────────────────────────────────┘
```

The system becomes **self-improving**:
1. Generate tests with current knowledge
2. Run tests, collect outcomes
3. Update LLKB with learnings
4. Export improved config for next generation

#### Codex

Let me turn this into concrete implementation:

**Implementation Plan (Minimal Changes)**

```
Phase 1: Adapter Module (NEW CODE)
─────────────────────────────────
File: core/typescript/llkb/adapter.ts

export interface AdapterConfig {
  llkbRoot: string;
  outputDir: string;
  minConfidence?: number;  // default 0.7
}

export async function exportForAutogen(config: AdapterConfig): Promise<{
  configPath: string;
  glossaryPath: string;
}>;
```

**Phase 2: AutoGen Config Extension (MINIMAL CHANGE)**

```diff
// core/typescript/autogen/src/config/loader.ts

-export function loadConfig(configPath: string): AutogenConfig {
+export function loadConfig(configPaths: string | string[]): AutogenConfig {
+  const paths = Array.isArray(configPaths) ? configPaths : [configPaths];
+  return mergeConfigs(paths.map(p => loadSingleConfig(p)));
}
```

**Phase 3: Glossary Extension (MINIMAL CHANGE)**

```diff
// core/typescript/autogen/src/mapping/glossary.ts

+let extendedGlossary: Map<string, IRPrimitive> | null = null;
+
+export function loadExtendedGlossary(path: string): void {
+  extendedGlossary = loadGlossaryFile(path);
+}

export function lookupGlossary(term: string): IRPrimitive | undefined {
- return glossary.get(term.toLowerCase());
+ return glossary.get(term.toLowerCase())
+     ?? extendedGlossary?.get(term.toLowerCase());
}
```

**Phase 4: Prompt Integration**

```markdown
## Step 2.5: Export LLKB to AutoGen Config

npx artk-llkb export --for-autogen --min-confidence 0.7

This generates:
- artk-e2e/autogen-llkb.config.yml
- artk-e2e/llkb-glossary.ts

## Step 3: Run AutoGen

npx artk-autogen generate \
  --config autogen.config.yml,autogen-llkb.config.yml \
  --glossary llkb-glossary.ts \
  journey.md
```

**Total: ~100-150 lines of new/changed code.**

---

## Consensus & Final Architecture

### Agreed Solution: LLKB Adapter Pattern

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **Integration point** | Config files, not code | Minimal AutoGen changes |
| **Determinism** | Export is snapshot-based | Same LLKB → Same config |
| **Parallelism** | Export once, use many | Config files are immutable during batch |
| **Evolution** | Learning loop feeds LLKB | Prompts update LLKB, adapter exports |
| **Backwards compat** | Opt-in via config presence | No config = no LLKB = unchanged |

### Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         LLKB LAYER                                │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                │
│  │lessons  │ │comps    │ │patterns │ │quirks   │                │
│  │.json    │ │.json    │ │/*.json  │ │.json    │                │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘                │
│       └──────────┴──────────┴──────────┴─────────┐              │
│                                                   ▼              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              LLKB ADAPTER (NEW)                          │    │
│  │                                                          │    │
│  │  • exportForAutogen(minConfidence: 0.7)                 │    │
│  │  • Filters by confidence, category, scope               │    │
│  │  • Generates deterministic output files                 │    │
│  │                                                          │    │
│  └────────────────────┬───────────────────────────────────┘    │
└───────────────────────┼──────────────────────────────────────────┘
                        │
      ┌─────────────────┼─────────────────┐
      ▼                 ▼                 ▼
┌───────────┐    ┌───────────┐    ┌───────────┐
│autogen-   │    │llkb-      │    │modules/   │
│llkb.yml   │    │glossary.ts│    │index.ts   │
│           │    │           │    │           │
│patterns:  │    │Map([      │    │export {   │
│selectors: │    │ ["term",  │    │  waitFor, │
│timing:    │    │   prim],  │    │  handleX, │
│           │    │ ...])     │    │}          │
└─────┬─────┘    └─────┬─────┘    └─────┬─────┘
      │                │                │
      └────────────────┼────────────────┘
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                      AUTOGEN LAYER                                │
│                                                                   │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐            │
│  │Config Loader│──▶│Pattern Match│──▶│IR Builder   │            │
│  │(+merge)     │   │(+glossary)  │   │(unchanged)  │            │
│  └─────────────┘   └─────────────┘   └─────────────┘            │
│         │                │                   │                   │
│         ▼                ▼                   ▼                   │
│  ┌───────────────────────────────────────────────────────┐      │
│  │                   CODE GENERATOR                       │      │
│  │                   (unchanged)                          │      │
│  └───────────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────────┘
```

### Files Changed/Added Summary

| File | Change Type | Lines |
|------|-------------|-------|
| `core/typescript/llkb/adapter.ts` | **NEW** | ~80 |
| `core/typescript/llkb/index.ts` | Export adapter | ~5 |
| `core/typescript/autogen/src/config/loader.ts` | Merge multiple configs | ~20 |
| `core/typescript/autogen/src/mapping/glossary.ts` | Load extended glossary | ~15 |
| `core/typescript/autogen/src/cli/commands/generate.ts` | Accept --glossary flag | ~10 |
| Prompts | Call adapter before AutoGen | ~20 |

**Total: ~150 lines of code changes**

### Benefits

1. **Minimal AutoGen changes**: Core logic untouched
2. **Deterministic**: Same LLKB state → Same output files → Same tests
3. **Parallel-safe**: Export once, all parallel jobs read same files
4. **Backwards compatible**: No LLKB config = no change
5. **Self-improving**: Learning loop continuously enriches LLKB
6. **No breaking tests**: Existing tests don't use LLKB config

---

## Debate Summary

| Participant | Key Contribution |
|-------------|------------------|
| **Claude** | Architecture pattern, versioning insights, managed blocks |
| **Gemini** | Parallel execution analysis, learning loop, plugin alternative |
| **Codex** | Implementation simplicity, config-driven approach, concrete code |

**Confidence in Solution: 0.92**

**Key Caveats:**
1. First implementation should be minimal (config + glossary only)
2. Module injection is Phase 2 (more complex)
3. Learning loop requires prompt changes, not just code

---

## Next Steps

1. Create detailed specification for ARTK integration
2. Create step-by-step task breakdown
3. Implement adapter module
4. Update AutoGen config loader
5. Update prompts to use adapter

---

## Related Documents

- `research/2026-01-19_llkb-implementation-review-v4.md`
- `research/2026-01-16_llkb-critical-review-v3.md`
- `core/typescript/llkb/types.ts`
- `core/typescript/autogen/src/ir/types.ts`
