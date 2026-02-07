# Research: Current State of discover-foundation and LLKB

**Date:** 2026-02-05
**Purpose:** Research summary to inform specification and task creation

---

## Current Implementation Analysis

### 1. discover-foundation Prompt (`prompts/artk.discover-foundation.md`)

**Size:** 2288 lines
**Current Steps:**
- **D0-D10**: Discovery phase (routes, features, auth, testability, risk ranking)
- **F0-F10**: Foundation build phase (Playwright config, auth harness, fixtures, modules)
- **F11**: LLKB initialization (directory structure, config, empty databases)
- **V0-V6**: Validation phase

**What F11 Currently Does:**
- Creates `.artk/llkb/` directory structure
- Initializes `config.yml`, `lessons.json`, `components.json`, `analytics.json`
- Creates `patterns/` subdirectories with empty templates
- Creates LLKB CLI utility script
- Seeds with 79 universal patterns via `bootstrap-llkb.cjs`

**What F11 Does NOT Do (Gap):**
- Does not analyze the target app for patterns
- Does not detect framework/component libraries for library packs
- Does not extract selector conventions from codebase
- Does not generate app-specific patterns from auth flows
- Does not create `discovered-patterns.json` or `app-profile.json`

### 2. LLKB Library (`core/typescript/llkb/`)

**Exports:** 100+ functions across 20+ modules

**Key Capabilities:**
| Module | Functions | Purpose |
|--------|-----------|---------|
| `types.ts` | Types | Lesson, Component, Analytics, Config interfaces |
| `loaders.ts` | loadLessons, loadComponents, loadLLKBData | Load LLKB data from files |
| `matching.ts` | matchStepsToComponents, findExtractionCandidates | Pattern matching |
| `learning.ts` | recordPatternLearned, recordComponentUsed | Learning loop |
| `adapter.ts` | exportForAutogen | AutoGen integration |
| `migration.ts` | initializeLLKB, migrateLLKB | LLKB initialization |
| `versioning.ts` | extractVersionFromTest, checkUpdates | Version tracking |

**LLKB Structure:**
```
.artk/llkb/
├── config.yml              # Configuration (thresholds, retention, scopes)
├── lessons.json            # Captured patterns and fixes
├── components.json         # Extracted reusable components
├── analytics.json          # Effectiveness metrics
├── patterns/               # Categorized pattern details
│   ├── selectors.json
│   ├── timing.json
│   ├── data.json
│   ├── auth.json
│   └── assertions.json
└── history/                # Learning event log
```

### 3. AutoGen Pattern System (`core/typescript/autogen/`)

**Pattern Matching (`patternExtension.ts`):**
- 79 seed patterns in `learned-patterns.json`
- Two-phase matching: exact → fuzzy (Levenshtein similarity ≥0.7)
- Confidence scoring via Wilson score interval
- Pattern recording via `recordPatternSuccess()`

**Glossary System (`mapping/glossary.ts`):**
- Synonym resolution (click → press, tap, select)
- Label aliases (email → email-input testid)
- Module method mapping (log in → auth.login())

**Current Pattern Coverage:**
- ~82% of steps handled by 84 core patterns
- ~18% become TODO comments due to missing patterns

### 4. Bootstrap LLKB (`scripts/helpers/bootstrap-llkb.cjs`)

**What it does:**
1. Ensures LLKB directory exists
2. Calls `initializeLLKB()` from @artk/core
3. Installs 79 seed patterns from ARTK source
4. Falls back to empty patterns file if seeds not found

---

## Gap Analysis: What's Missing

### Gap 1: No App-Specific Pattern Generation

**Current:** LLKB starts with generic seed patterns only.
**Needed:** Analyze target app during discover-foundation to generate app-specific patterns.

**Proposed Files:**
- `app-profile.json` - Application DNA (framework, libraries, auth type)
- `discovered-patterns.json` - App-specific patterns from discovery

### Gap 2: No Framework Library Packs

**Current:** All apps get the same 79 universal patterns.
**Needed:** Pre-built pattern packs for detected frameworks.

**Proposed:**
```
.artk/llkb/library-packs/
├── react-mui.json
├── react-antd.json
├── ag-grid.json
└── angular-material.json
```

### Gap 3: No Selector Convention Detection

**Current:** Discovery finds testid attributes but doesn't catalog patterns.
**Needed:** Systematic extraction of selector patterns for LLKB.

**What to Extract:**
- Primary selector attribute (`data-testid`, `data-cy`, `aria-label`)
- Naming convention (kebab-case, camelCase, prefix patterns)
- Coverage stats (% of elements with stable selectors)

### Gap 4: No Auth Pattern Integration

**Current:** Auth bypass detection exists (Step D6) but results not stored in LLKB.
**Needed:** Capture auth patterns as learnable LLKB entries.

**What to Capture:**
- Login form selectors
- Auth type (form, SSO, OAuth)
- Bypass mechanism (if available)
- Post-login landing page

---

## Previous Debate Consensus (2026-02-04)

**Participants:** Claude Opus 4.5, Gemini 3 Pro Preview, OpenAI Codex 0.94.0

**Agreed Architecture:**
```
Layer 3: App-Specific Patterns (0.85-0.95 confidence)
Layer 2: Framework Patterns (0.70 confidence)
Layer 1: Universal Patterns (0.50 confidence)
```

**Agreed Steps (F12):**
1. F12.1: Framework Detection (static)
2. F12.2: Selector Convention Analysis (static + runtime)
3. F12.3: Auth Pattern Extraction (runtime)
4. F12.4: Generate Initial LLKB Patterns

**MVP Scope:** 2-3 days effort
**Success Metric:** Reduce TODO rate from ~18% to ~8-10%

---

## Technical Constraints

1. **No breaking changes** to existing LLKB structure
2. **Non-destructive merge** - discovery adds patterns, never overwrites
3. **Optional runtime analysis** - static analysis must work without running app
4. **Bootstrap compatibility** - new features must work with existing bootstrap
5. **Prompt size limit** - discover-foundation already 2288 lines, must be modular

---

## Files to Modify/Create

### Modify:
1. `prompts/artk.discover-foundation.md` - Add F12 steps
2. `scripts/helpers/bootstrap-llkb.cjs` - Support library packs
3. `core/typescript/llkb/loaders.ts` - Load discovered patterns

### Create:
1. `core/typescript/llkb/discovery.ts` - Discovery functions
2. `core/typescript/llkb/library-packs.ts` - Library pack loader
3. `.artk/llkb/library-packs/*.json` - Pre-built framework patterns
4. JSON schemas for `app-profile.json` and `discovered-patterns.json`

---

## Success Criteria

1. **Cold Start Improvement:** New projects get 100-120 patterns (up from 79)
2. **TODO Reduction:** <10% blocked steps on first journey-implement
3. **Framework Detection:** Correctly identify React/Vue/Angular + libraries
4. **Selector Cataloging:** Extract naming conventions and coverage stats
5. **Auth Integration:** Login patterns stored in LLKB for reuse
