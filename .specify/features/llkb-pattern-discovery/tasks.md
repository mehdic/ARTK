# Tasks: LLKB Pattern Discovery for discover-foundation

**Feature:** LLKB-PATTERN-DISCOVERY
**Spec:** spec.md
**Created:** 2026-02-05
**Updated:** 2026-02-05 (Pattern Scaling to 300-400)
**Total Tasks:** 28
**Estimated Effort:** 3-4 weeks (Full Implementation)

**Pattern Targets by Phase:**
| Phase | Tasks | Target Patterns | Effort |
|-------|-------|-----------------|--------|
| Phase 1: Core Infrastructure | 1-5 | - | 12 hours |
| Phase 2: Pattern Generation | 6-9 | 200 | 8 hours |
| Phase 3: Integration | 10-12 | - | 5 hours |
| Phase 4: Testing | 13-15 | - | 6 hours |
| Phase 5: Template Generators | 16-20 | 280 | 16 hours |
| Phase 6: Framework Packs | 21-24 | 350 | 20 hours |
| Phase 7: i18n & Analytics | 25-28 | 400 | 12 hours |

---

## Phase 1: Core Infrastructure (Day 1)

### Task 1: Create discovery.ts module
**Priority:** P0 (Critical)
**Effort:** 2 hours
**Dependencies:** None

**Description:**
Create the core discovery module with type definitions and function stubs.

**Files:**
- CREATE: `core/typescript/llkb/discovery.ts`

**Acceptance Criteria:**
- [X] FrameworkSignal, UiLibrarySignal, SelectorSignals, AuthHints types exported
- [X] Function stubs for detectFrameworks, detectUiLibraries, analyzeSelectorSignals, extractAuthHints
- [X] Module exports added to `core/typescript/llkb/index.ts`

**Code Snippet:**
```typescript
// core/typescript/llkb/discovery.ts
export interface FrameworkSignal {
  name: string;
  version?: string;
  confidence: number;
  evidence: string[];
}

export async function detectFrameworks(projectRoot: string): Promise<FrameworkSignal[]> {
  // Implementation in Task 2
}
```

---

### Task 2: Implement framework detection
**Priority:** P0 (Critical)
**Effort:** 3 hours
**Dependencies:** Task 1

**Description:**
Implement framework detection by parsing package.json and scanning for framework-specific files.

**Files:**
- MODIFY: `core/typescript/llkb/discovery.ts`

**Acceptance Criteria:**
- [X] Detects React (package.json: react, react-dom)
- [X] Detects Angular (package.json: @angular/core, angular.json)
- [X] Detects Vue (package.json: vue)
- [X] Detects Next.js (package.json: next, next.config.*)
- [X] Returns confidence scores based on evidence count
- [X] Unit tests pass

**Detection Logic:**
```typescript
const FRAMEWORK_PATTERNS = {
  react: {
    packages: ['react', 'react-dom'],
    files: ['src/App.tsx', 'src/App.jsx'],
    confidence: 0.95
  },
  angular: {
    packages: ['@angular/core'],
    files: ['angular.json', 'src/app/app.module.ts'],
    confidence: 0.95
  },
  vue: {
    packages: ['vue'],
    files: ['src/App.vue', 'vite.config.ts'],
    confidence: 0.90
  },
  nextjs: {
    packages: ['next'],
    files: ['next.config.js', 'next.config.mjs', 'src/app/'],
    confidence: 0.95
  }
};
```

---

### Task 3: Implement UI library detection
**Priority:** P0 (Critical)
**Effort:** 2 hours
**Dependencies:** Task 1

**Description:**
Implement UI library detection from package.json dependencies.

**Files:**
- MODIFY: `core/typescript/llkb/discovery.ts`

**Acceptance Criteria:**
- [X] Detects MUI (@mui/material, @emotion/react)
- [X] Detects Ant Design (antd)
- [X] Detects Chakra UI (@chakra-ui/react)
- [X] Detects AG Grid (ag-grid-community, ag-grid-react)
- [X] Detects enterprise versions where applicable
- [X] Unit tests pass

---

### Task 4: Implement selector analysis
**Priority:** P0 (Critical)
**Effort:** 3 hours
**Dependencies:** Task 1

**Description:**
Scan source files for selector attribute patterns and naming conventions.

**Files:**
- MODIFY: `core/typescript/llkb/discovery.ts`

**Acceptance Criteria:**
- [X] Scans .tsx, .jsx, .vue, .html files
- [X] Counts data-testid, data-cy, data-test, aria-label, role occurrences
- [X] Identifies primary selector attribute
- [X] Detects naming convention (kebab-case, camelCase)
- [X] Calculates coverage percentages
- [X] Unit tests pass

**Search Patterns:**
```typescript
const SELECTOR_PATTERNS = {
  'data-testid': /data-testid=['"]([^'"]+)['"]/g,
  'data-cy': /data-cy=['"]([^'"]+)['"]/g,
  'data-test': /data-test=['"]([^'"]+)['"]/g,
  'aria-label': /aria-label=['"]([^'"]+)['"]/g,
  'role': /role=['"]([^'"]+)['"]/g
};
```

---

### Task 5: Implement auth hint extraction
**Priority:** P1 (High)
**Effort:** 2 hours
**Dependencies:** Task 1

**Description:**
Extract authentication hints from discovered auth routes and patterns.

**Files:**
- MODIFY: `core/typescript/llkb/discovery.ts`

**Acceptance Criteria:**
- [X] Reads auth detection from Step D6 output (if available)
- [X] Extracts login form selectors from source
- [X] Detects auth bypass mechanisms
- [X] Returns structured AuthHints object
- [X] Unit tests pass

---

## Phase 2: Pattern Generation (Day 1-2)

### Task 6: Create app-profile.json schema
**Priority:** P0 (Critical)
**Effort:** 1 hour
**Dependencies:** Tasks 2-5

**Description:**
Define and validate the app-profile.json schema.

**Files:**
- CREATE: `core/typescript/llkb/schemas/app-profile.schema.json`
- MODIFY: `core/typescript/llkb/types.ts` (add AppProfile type)

**Acceptance Criteria:**
- [X] JSON schema created with all fields
- [X] TypeScript type matches schema
- [X] Validation function exported

---

### Task 7: Create discovered-patterns.json schema
**Priority:** P0 (Critical)
**Effort:** 1 hour
**Dependencies:** Task 6

**Description:**
Define and validate the discovered-patterns.json schema.

**Files:**
- CREATE: `core/typescript/llkb/schemas/discovered-patterns.schema.json`
- MODIFY: `core/typescript/llkb/types.ts` (add DiscoveredPattern type)

**Acceptance Criteria:**
- [X] JSON schema created with all fields
- [X] Schema compatible with existing LearnedPattern
- [X] TypeScript type matches schema

---

### Task 8: Implement pattern generation
**Priority:** P0 (Critical)
**Effort:** 4 hours
**Dependencies:** Tasks 6, 7

**Description:**
Generate LLKB patterns from app profile and selector signals.

**Files:**
- CREATE: `core/typescript/llkb/pattern-generation.ts`

**Acceptance Criteria:**
- [X] generatePatterns() creates patterns from profile
- [X] Patterns include selector hints
- [X] Confidence assigned based on evidence strength
- [X] Categories inferred (auth, navigation, ui-interaction)
- [X] Unit tests pass (55/55)

**Pattern Templates:**
```typescript
const AUTH_PATTERN_TEMPLATES = [
  { text: 'click login button', primitive: 'click' },
  { text: 'enter username', primitive: 'fill' },
  { text: 'enter password', primitive: 'fill' },
  { text: 'submit login form', primitive: 'click' }
];

const NAVIGATION_PATTERN_TEMPLATES = [
  { text: 'navigate to {route}', primitive: 'navigate' },
  { text: 'go to {route}', primitive: 'navigate' },
  { text: 'click {item} in navigation', primitive: 'click' }
];
```

---

### Task 9: Implement pattern merging
**Priority:** P1 (High)
**Effort:** 2 hours
**Dependencies:** Task 8

**Description:**
Merge discovered patterns with existing seed patterns without overwriting.

**Files:**
- MODIFY: `core/typescript/llkb/pattern-generation.ts`

**Acceptance Criteria:**
- [X] mergeDiscoveredPatterns() combines pattern sets
- [X] Existing patterns preserved (non-destructive)
- [X] Duplicate detection via normalized text comparison
- [X] Higher confidence patterns prioritized
- [X] Unit tests pass (55/55 in pattern-generation.test.ts)

---

## Phase 3: Integration (Day 2-3)

### Task 10: Add F12 section to discover-foundation prompt
**Priority:** P0 (Critical)
**Effort:** 2 hours
**Dependencies:** Tasks 1-9

**Description:**
Add Step F12: LLKB Pattern Discovery to the discover-foundation prompt.

**Files:**
- MODIFY: `prompts/artk.discover-foundation.md`

**Acceptance Criteria:**
- [X] F12.1: Framework Detection step added
- [X] F12.2: Selector Convention Analysis step added
- [X] F12.3: Auth Pattern Extraction step added
- [X] F12.4: Generate LLKB Patterns step added
- [X] Integration with existing F11 output
- [X] Error handling documented

---

### Task 11: Update bootstrap-llkb.cjs to load discovered patterns
**Priority:** P1 (High)
**Effort:** 1 hour
**Dependencies:** Task 10

**Description:**
Update bootstrap script to recognize and load discovered-patterns.json.

**Files:**
- MODIFY: `scripts/helpers/bootstrap-llkb.cjs`

**Acceptance Criteria:**
- [X] Loads discovered-patterns.json if exists
- [X] Merges with seed patterns
- [X] Maintains backward compatibility
- [X] Logs discovery status

---

### Task 12: Update LLKB loaders for discovered patterns
**Priority:** P1 (High)
**Effort:** 2 hours
**Dependencies:** Task 7

**Description:**
Update LLKB loaders to include discovered patterns in pattern matching.

**Files:**
- MODIFY: `core/typescript/llkb/loaders.ts`
- MODIFY: `core/typescript/autogen/src/llkb/patternExtension.ts`

**Acceptance Criteria:**
- [X] loadLLKBData() includes discovered patterns
- [X] matchLlkbPattern() searches discovered patterns
- [X] Layer priority: app-specific > framework > universal
- [X] Unit tests pass (33/33 patternExtension + 55/55 pattern-generation)

---

## Phase 4: Testing & Validation (Day 3)

### Task 13: Create unit tests for discovery module
**Priority:** P0 (Critical)
**Effort:** 3 hours
**Dependencies:** Tasks 1-5

**Description:**
Create comprehensive unit tests for all discovery functions.

**Files:**
- CREATE: `core/typescript/llkb/__tests__/discovery.test.ts`

**Acceptance Criteria:**
- [X] Tests for detectFrameworks() with React, Angular, Vue fixtures
- [X] Tests for detectUiLibraries() with MUI, Antd fixtures
- [X] Tests for analyzeSelectorSignals() with various patterns
- [X] Tests for extractAuthHints()
- [X] All tests pass (34/34)
- [X] Coverage >80%

---

### Task 14: Create integration tests
**Priority:** P1 (High)
**Effort:** 2 hours
**Dependencies:** Tasks 10-12

**Description:**
Create integration tests for the full F12 discovery flow.

**Files:**
- CREATE: `core/typescript/llkb/__tests__/discovery-integration.test.ts`

**Acceptance Criteria:**
- [X] Test discovery on sample React+MUI project (9 tests)
- [X] Verify framework/UI library detection via runDiscovery
- [X] Verify discovered-patterns.json round-trip (save/load integrity)
- [X] Verify full pipeline: generatePatterns → generateAllPatterns → QC → persist

---

### Task 15: Update E2E test to include F12 validation
**Priority:** P2 (Medium)
**Effort:** 1 hour
**Dependencies:** Task 14

**Description:**
Update the E2E test script to validate F12 outputs.

**Files:**
- MODIFY: `core/typescript/autogen/tests/e2e/run-full-e2e.sh`

**Acceptance Criteria:**
- [ ] E2E test checks for app-profile.json
- [ ] E2E test checks for discovered-patterns.json
- [ ] Test logs pattern count and confidence
- [ ] All E2E tests pass

---

## Phase 5: Template Generators (Target: 280 patterns)

### Task 16: Create template-generators.ts module
**Priority:** P1 (High)
**Effort:** 3 hours
**Dependencies:** Task 8

**Description:**
Create the template generator infrastructure for multiplying patterns based on discovered entities.

**Files:**
- CREATE: `core/typescript/llkb/template-generators.ts`

**Acceptance Criteria:**
- [X] TemplateGenerator interface defined
- [X] CRUDTemplateGenerator class implemented
- [X] FormTemplateGenerator class implemented
- [X] TableTemplateGenerator class implemented
- [X] ModalTemplateGenerator class implemented
- [X] NavigationTemplateGenerator class implemented
- [X] Unit tests pass (68/68)

**Template Interface:**
```typescript
interface TemplateGenerator {
  name: string;
  patternsPerEntity: number;
  generate(entity: DiscoveredEntity): DiscoveredPattern[];
}
```

---

### Task 17: Implement schema mining (Zod/Yup/JSON Schema)
**Priority:** P1 (High)
**Effort:** 4 hours
**Dependencies:** Task 16

**Description:**
Extract entities and fields from form validation schemas.

**Files:**
- CREATE: `core/typescript/llkb/mining/schema-mining.ts`

**Acceptance Criteria:**
- [X] Detects Zod schemas in source files (via mining.ts mineEntities)
- [X] Detects Yup schemas in source files (via mining.ts mineEntities)
- [X] Detects JSON Schema files (via mining.ts mineEntities)
- [X] Extracts field names and types
- [X] Returns structured EntitySchema objects
- [X] Unit tests with fixtures (27/27 mining.test.ts)

**Detection Patterns:**
```typescript
const SCHEMA_PATTERNS = {
  zod: /z\.object\(\{([^}]+)\}\)/g,
  yup: /yup\.object\(\{([^}]+)\}\)/g,
  jsonSchema: /\*\.schema\.json$/
};
```

---

### Task 18: Implement route mining
**Priority:** P1 (High)
**Effort:** 3 hours
**Dependencies:** Task 16

**Description:**
Extract routes from router configuration files.

**Files:**
- CREATE: `core/typescript/llkb/mining/route-mining.ts`

**Acceptance Criteria:**
- [X] Detects React Router routes (via mining.ts mineRoutes)
- [X] Detects Next.js app/pages routes
- [X] Detects Angular router config
- [X] Detects Vue Router routes
- [X] Extracts route paths and params
- [X] Unit tests with fixtures (27/27 mining.test.ts)

---

### Task 19: Implement component registry mining
**Priority:** P1 (High)
**Effort:** 3 hours
**Dependencies:** Task 16

**Description:**
Extract modal, dialog, and table components from component directories.

**Files:**
- CREATE: `core/typescript/llkb/mining/component-mining.ts`

**Acceptance Criteria:**
- [X] Scans component directories for modal/dialog patterns (via mining.ts mineModals)
- [X] Scans for table/grid components (via mining.ts mineTables)
- [X] Scans for form components (via mining.ts mineForms)
- [X] Extracts component names and props
- [X] Generates patterns from discovered components
- [X] Unit tests pass (27/27 mining.test.ts)

---

### Task 20: Integrate template generators with F12
**Priority:** P1 (High)
**Effort:** 3 hours
**Dependencies:** Tasks 16-19

**Description:**
Wire template generators into the F12 discovery flow.

**Files:**
- MODIFY: `core/typescript/llkb/discovery.ts`
- MODIFY: `prompts/artk.discover-foundation.md`

**Acceptance Criteria:**
- [X] Template generators called after entity discovery (F12.3 in prompt)
- [X] Generated patterns merged with discovered patterns (F12.4 in prompt)
- [X] Pattern count logged in discovery output (F12.7 in prompt)
- [X] Deduplication applied across all sources (F12.5 quality controls)
- [X] Integration tests pass

---

## Phase 6: Framework Packs (Target: 350 patterns)

### Task 21: Create framework pack infrastructure
**Priority:** P2 (Medium)
**Effort:** 2 hours
**Dependencies:** Task 20

**Description:**
Create the framework pack loading and registration system.

**Files:**
- CREATE: `core/typescript/llkb/packs/index.ts`
- CREATE: `core/typescript/llkb/packs/types.ts`

**Acceptance Criteria:**
- [X] FrameworkPack interface defined (packs/types.ts)
- [X] Pack registry with lazy loading (packs/index.ts)
- [X] Pack selection based on detected frameworks
- [X] Pack version compatibility checking

**Pack Interface:**
```typescript
interface FrameworkPack {
  name: string;
  framework: string;
  version: string;
  patterns: PackPattern[];
  selectors?: Record<string, string>;
}
```

---

### Task 22: Implement React pack
**Priority:** P2 (Medium)
**Effort:** 4 hours
**Dependencies:** Task 21

**Description:**
Create React-specific patterns for hooks, context, and portals.

**Files:**
- CREATE: `core/typescript/llkb/packs/react.ts`

**Acceptance Criteria:**
- [X] 33 React patterns (hooks, effects, context)
- [X] useState/useEffect interaction patterns
- [X] Portal/modal patterns
- [X] Suspense/lazy loading patterns
- [X] Unit tests pass (32/32 packs.test.ts)

---

### Task 23: Implement Angular pack
**Priority:** P2 (Medium)
**Effort:** 4 hours
**Dependencies:** Task 21

**Description:**
Create Angular-specific patterns for directives, pipes, and services.

**Files:**
- CREATE: `core/typescript/llkb/packs/angular.ts`

**Acceptance Criteria:**
- [X] 35 Angular patterns
- [X] Directive patterns (ngIf, ngFor, custom)
- [X] Pipe patterns (async, date, currency)
- [X] Service injection patterns
- [X] Unit tests pass (32/32 packs.test.ts)

---

### Task 24: Implement UI library packs (MUI, Antd, Chakra)
**Priority:** P2 (Medium)
**Effort:** 6 hours
**Dependencies:** Task 21

**Description:**
Create UI library-specific patterns for common component libraries.

**Files:**
- CREATE: `core/typescript/llkb/packs/mui.ts`
- CREATE: `core/typescript/llkb/packs/antd.ts`
- CREATE: `core/typescript/llkb/packs/chakra.ts`

**Acceptance Criteria:**
- [X] MUI: DataGrid, Dialog, Snackbar, Autocomplete patterns (26)
- [X] Antd: Table, Modal, Message, Select patterns (25)
- [X] Chakra: Modal, Toast, Menu patterns (21)
- [X] Selector hints for each library
- [X] Unit tests pass (32/32 packs.test.ts)

---

## Phase 7: i18n & Analytics Mining (Target: 400 patterns)

### Task 25: Implement i18n key mining
**Priority:** P2 (Medium)
**Effort:** 3 hours
**Dependencies:** Task 20

**Description:**
Extract i18n keys for text verification patterns.

**Files:**
- CREATE: `core/typescript/llkb/mining/i18n-mining.ts`

**Acceptance Criteria:**
- [X] Detects react-i18next usage
- [X] Detects angular-translate usage
- [X] Detects vue-i18n usage
- [X] Extracts translation keys from JSON/YAML
- [X] Generates "verify {label} text" patterns
- [X] Unit tests pass (14/14 mining-modules.test.ts)

---

### Task 26: Implement analytics event mining
**Priority:** P2 (Medium)
**Effort:** 3 hours
**Dependencies:** Task 20

**Description:**
Extract analytics events for tracking assertion patterns.

**Files:**
- CREATE: `core/typescript/llkb/mining/analytics-mining.ts`

**Acceptance Criteria:**
- [X] Detects GA4/gtag events
- [X] Detects Mixpanel track calls
- [X] Detects Segment analytics
- [X] Extracts event names and properties
- [X] Generates "track {event}" patterns
- [X] Unit tests pass (14/14 mining-modules.test.ts)

---

### Task 27: Implement feature flag mining
**Priority:** P2 (Medium)
**Effort:** 3 hours
**Dependencies:** Task 20

**Description:**
Extract feature flags for conditional visibility patterns.

**Files:**
- CREATE: `core/typescript/llkb/mining/feature-flag-mining.ts`

**Acceptance Criteria:**
- [X] Detects LaunchDarkly flags
- [X] Detects Split.io flags
- [X] Detects custom feature flag patterns
- [X] Generates "ensure {feature} visible" patterns
- [X] Unit tests pass (14/14 mining-modules.test.ts)

---

### Task 28: Implement quality controls and deduplication
**Priority:** P1 (High)
**Effort:** 3 hours
**Dependencies:** Tasks 16-27

**Description:**
Implement pattern quality controls including deduplication, confidence thresholds, and cross-source validation.

**Files:**
- CREATE: `core/typescript/llkb/quality-controls.ts`

**Acceptance Criteria:**
- [X] Deduplication by normalized text + IR primitive
- [X] Confidence threshold enforcement (≥0.5)
- [X] Cross-source validation (boost if found in 2+ sources)
- [X] Signal weighting (Strong > Medium > Weak)
- [X] Pruning mechanism for unused patterns
- [X] Unit tests pass (38/38 quality-controls.test.ts)

**Quality Control Logic:**
```typescript
interface QualityControls {
  deduplicatePatterns(patterns: DiscoveredPattern[]): DiscoveredPattern[];
  applyConfidenceThreshold(patterns: DiscoveredPattern[], threshold: number): DiscoveredPattern[];
  boostCrossSourcePatterns(patterns: DiscoveredPattern[]): DiscoveredPattern[];
  pruneUnusedPatterns(patterns: DiscoveredPattern[], usageStats: UsageStats): DiscoveredPattern[];
}
```

---

## Task Dependency Graph

```
Phase 1-4: Core Infrastructure (MVP: 200 patterns)
═══════════════════════════════════════════════════

Task 1 (discovery.ts)
    ├── Task 2 (framework detection)
    ├── Task 3 (UI library detection)
    ├── Task 4 (selector analysis)
    └── Task 5 (auth hints)
            │
            v
    Task 6 (app-profile schema)
            │
            v
    Task 7 (discovered-patterns schema)
            │
            v
    Task 8 (pattern generation)
            │
            v
    Task 9 (pattern merging)
            │
            v
    Task 10 (F12 prompt section)
        ├── Task 11 (bootstrap update)
        └── Task 12 (loader update)
                │
                v
        Task 13 (unit tests)
                │
                v
        Task 14 (integration tests)
                │
                v
        Task 15 (E2E validation)


Phase 5: Template Generators (Target: 280 patterns)
═══════════════════════════════════════════════════

    Task 8 (pattern generation)
            │
            v
    Task 16 (template-generators.ts)
        ├── Task 17 (schema mining)
        ├── Task 18 (route mining)
        └── Task 19 (component mining)
                │
                v
        Task 20 (integrate with F12)


Phase 6: Framework Packs (Target: 350 patterns)
═══════════════════════════════════════════════

    Task 20 (integrate with F12)
            │
            v
    Task 21 (pack infrastructure)
        ├── Task 22 (React pack)
        ├── Task 23 (Angular pack)
        └── Task 24 (UI library packs)


Phase 7: i18n & Analytics (Target: 400 patterns)
════════════════════════════════════════════════

    Task 20 (integrate with F12)
        ├── Task 25 (i18n mining)
        ├── Task 26 (analytics mining)
        └── Task 27 (feature flag mining)
                │
                v
        Task 28 (quality controls)
```

---

## Summary

| Phase | Tasks | Target Patterns | Effort |
|-------|-------|-----------------|--------|
| Phase 1: Core Infrastructure | 1-5 | - | 12 hours |
| Phase 2: Pattern Generation | 6-9 | 100 | 8 hours |
| Phase 3: Integration | 10-12 | - | 5 hours |
| Phase 4: Testing | 13-15 | - | 6 hours |
| **MVP Total** | **15** | **~100-150** | **~31 hours (2-3 days)** |
| Phase 5: Template Generators | 16-20 | 200→280 | 16 hours |
| Phase 6: Framework Packs | 21-24 | 280→350 | 16 hours |
| Phase 7: i18n & Analytics | 25-28 | 350→400 | 12 hours |
| **Full Total** | **28** | **~360-400** | **~75 hours (3-4 weeks)** |

**Note:** Pattern counts depend on project size and metadata quality:
- Small projects: 200-250 patterns
- Medium projects: 300-350 patterns
- Large enterprise apps: 400+ patterns

---

## Definition of Done

### MVP (Phases 1-4)
- [ ] All 15 tasks completed
- [ ] Unit tests pass with >80% coverage
- [ ] Integration tests pass
- [x] E2E test validates F12 outputs
- [ ] Pattern count ≥100 on sample app
- [ ] TODO rate measured <10% on sample app
- [ ] Documentation updated (CLAUDE.md if needed)
- [ ] No breaking changes to existing LLKB

### Full Implementation (Phases 5-7)
- [ ] All 28 tasks completed
- [ ] Pattern count ≥300 on medium-sized app
- [ ] Pattern count ≥400 on enterprise app
- [ ] TODO rate measured <5% on sample apps
- [ ] Framework packs validated for React, Angular
- [ ] UI library packs validated for MUI, Antd
- [ ] Quality controls (dedup, confidence, pruning) verified
- [ ] Cross-source validation working
