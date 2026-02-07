# Specification: LLKB Pattern Discovery for discover-foundation

**Feature ID:** LLKB-PATTERN-DISCOVERY
**Version:** 1.0.0
**Date:** 2026-02-05
**Authors:** Claude Opus 4.5, OpenAI Codex 0.94.0, Gemini 3 Pro Preview

---

## 1. Feature Overview

### 1.1 Problem Statement

ARTK's discover-foundation initializes LLKB (Step F11) with a generic seed set of 79 patterns, but does not analyze the target application to generate app-specific patterns. This leads to:

- **~18% TODO rate** during test generation (blocked steps)
- **Cold start problem** - new projects get only generic patterns
- **Missed optimization** - framework/library-specific patterns not utilized
- **Auth pattern loss** - detected auth flows not captured in LLKB

### 1.2 Proposed Solution

Add a new **Step F12: LLKB Pattern Discovery** to discover-foundation that:

1. **Detects frameworks and UI libraries** from package.json and source code
2. **Analyzes selector conventions** (data-testid, aria-label, role patterns)
3. **Extracts auth patterns** from detected login flows
4. **Generates app-specific patterns** with confidence scores

### 1.3 Success Metrics

| Metric | Current | Target (MVP) | Target (Full) |
|--------|---------|--------------|---------------|
| TODO rate in generated tests | ~18% | <10% | <5% |
| Patterns after discovery | 79 | 200 | 300-400 |
| Average pattern confidence | 0.50 | 0.70 | 0.75 |
| First-run test success rate | TBD | >60% | >75% |

**Pattern Count Breakdown (Target: 360 patterns):**

| Source | Count | Examples |
|--------|-------|----------|
| Universal seed | 79 | click, fill, navigate |
| F12 app-specific | 25 | app login, app navigation |
| Routes/navigation | 40 | navigate to {route} |
| Forms/schema | 60 | fill {field}, validate {field} |
| Tables/lists | 25 | sort by {column}, filter |
| Modals/dialogs | 25 | open {modal}, confirm |
| Auth/RBAC | 20 | access as {role} |
| Notifications | 20 | expect toast |
| i18n anchors | 25 | verify {label} text |
| Analytics events | 15 | track {event} |
| Feature flags | 26 | ensure {feature} visible |
| **Total** | **360** | |

---

## 2. Acceptance Criteria

### 2.1 Functional Requirements

- [ ] **AC1**: After discover-foundation runs, `.artk/llkb/discovered-patterns.json` exists and contains app-specific patterns
- [ ] **AC2**: `.artk/llkb/app-profile.json` is created with detected frameworks, auth hints, and selector metrics
- [ ] **AC3**: LLKB export includes discovered patterns with confidence ≥0.7
- [ ] **AC4**: If no patterns discovered, discovery continues without error (graceful degradation)
- [ ] **AC5**: Discovery findings are logged in discover-foundation output summary

### 2.2 Non-Functional Requirements

- [ ] **NFR1**: Static analysis completes in <30 seconds for typical projects
- [ ] **NFR2**: Runtime validation (if enabled) completes in <60 seconds
- [ ] **NFR3**: No breaking changes to existing LLKB structure
- [ ] **NFR4**: Patterns are non-destructively merged (never overwrites seed patterns)

---

## 3. Technical Design

### 3.1 Architecture: Layered Pattern Model

```
┌─────────────────────────────────────┐
│ Layer 3: App-Specific Patterns      │  ← F12 generates
│ Confidence: 0.85-0.95               │
├─────────────────────────────────────┤
│ Layer 2: Framework Patterns         │  ← Library packs (future)
│ Confidence: 0.70                    │
├─────────────────────────────────────┤
│ Layer 1: Universal Patterns (79)    │  ← Seed patterns (existing)
│ Confidence: 0.50                    │
└─────────────────────────────────────┘
```

### 3.2 New File Structures

#### 3.2.1 `app-profile.json` Schema

```json
{
  "version": "1.0",
  "generatedAt": "2026-02-05T12:00:00Z",
  "projectRoot": "/path/to/project",

  "frameworks": [
    {
      "name": "react",
      "version": "18.x",
      "confidence": 0.95,
      "evidence": ["package.json:react", "src/App.tsx"]
    }
  ],

  "uiLibraries": [
    {
      "name": "mui",
      "confidence": 0.85,
      "evidence": ["@mui/material in package.json"]
    }
  ],

  "selectorSignals": {
    "primaryAttribute": "data-testid",
    "namingConvention": "kebab-case",
    "coverage": {
      "dataTestId": 0.63,
      "ariaLabel": 0.41,
      "role": 0.55,
      "id": 0.12
    }
  },

  "auth": {
    "detected": true,
    "type": "oidc",
    "loginRoute": "/login",
    "selectors": {
      "usernameField": "[data-testid='email-input']",
      "passwordField": "[data-testid='password-input']",
      "submitButton": "[data-testid='login-button']"
    },
    "bypassAvailable": true,
    "bypassMethod": "oauthEnabled=false"
  },

  "runtime": {
    "validated": false,
    "scanUrl": null,
    "domSampleCount": 0
  }
}
```

#### 3.2.2 `discovered-patterns.json` Schema

```json
{
  "version": "1.0",
  "generatedAt": "2026-02-05T12:00:00Z",
  "source": "discover-foundation:F12",

  "patterns": [
    {
      "id": "DP001",
      "normalizedText": "click login button",
      "originalText": "clicks the login button",
      "mappedPrimitive": "click",
      "selectorHints": [
        { "strategy": "data-testid", "value": "login-button" },
        { "strategy": "role", "value": "button", "name": "Sign in" }
      ],
      "confidence": 0.85,
      "layer": "app-specific",
      "sourceJourneys": [],
      "successCount": 0,
      "failCount": 0
    }
  ],

  "metadata": {
    "frameworks": ["react"],
    "uiLibraries": ["mui"],
    "totalPatterns": 25,
    "byCategory": {
      "auth": 5,
      "navigation": 8,
      "ui-interaction": 12
    }
  }
}
```

### 3.3 New Functions

#### 3.3.1 Detection Functions (core/typescript/llkb/discovery.ts)

```typescript
// Framework detection
export interface FrameworkSignal {
  name: string;
  version?: string;
  confidence: number;
  evidence: string[];
}

export async function detectFrameworks(
  projectRoot: string
): Promise<FrameworkSignal[]>;

// UI Library detection
export interface UiLibrarySignal {
  name: string;
  confidence: number;
  evidence: string[];
  hasEnterprise?: boolean;
}

export async function detectUiLibraries(
  projectRoot: string
): Promise<UiLibrarySignal[]>;

// Selector analysis
export interface SelectorSignals {
  primaryAttribute: string;
  namingConvention: 'kebab-case' | 'camelCase' | 'snake_case' | 'mixed';
  coverage: Record<string, number>;
}

export async function analyzeSelectorSignals(
  projectRoot: string
): Promise<SelectorSignals>;

// Auth extraction
export interface AuthHints {
  detected: boolean;
  type?: 'form' | 'oidc' | 'oauth' | 'sso';
  loginRoute?: string;
  selectors?: Record<string, string>;
  bypassAvailable?: boolean;
  bypassMethod?: string;
}

export async function extractAuthHints(
  projectRoot: string
): Promise<AuthHints>;
```

#### 3.3.2 Pattern Generation Functions

```typescript
// Generate patterns from profile
export interface DiscoveredPattern {
  id: string;
  normalizedText: string;
  originalText: string;
  mappedPrimitive: string;
  selectorHints: SelectorHint[];
  confidence: number;
  layer: 'app-specific' | 'framework' | 'universal';
}

export function generatePatterns(
  profile: AppProfile,
  signals: SelectorSignals
): DiscoveredPattern[];

// Merge discovered with existing
export function mergeDiscoveredPatterns(
  existing: LearnedPattern[],
  discovered: DiscoveredPattern[]
): LearnedPattern[];
```

### 3.4 Template-Based Pattern Generators

To achieve 300-400 patterns, F12 uses template generators that multiply patterns based on discovered entities.

#### 3.4.1 CRUD Template (per entity)
**Source:** Schema + Routes
**Patterns per entity:** 6

```
create {entity}
edit {entity}
delete {entity}
view {entity} details
search {entity}
list {entity}
```

#### 3.4.2 Form Template (per form)
**Source:** Form schemas (Zod, Yup, JSON Schema)
**Patterns per form:** 5

```
fill {field}
clear {field}
validate {field}
submit {form}
reset {form}
```

#### 3.4.3 Table Template (per table)
**Source:** Table/grid components
**Patterns per table:** 6

```
sort by {column}
filter by {field}
select row {n}
paginate next
paginate previous
expand row
```

#### 3.4.4 Modal Template (per modal)
**Source:** Component registry
**Patterns per modal:** 4

```
open {modal}
close {modal}
confirm {modal}
cancel {modal}
```

#### 3.4.5 Navigation Template (per route)
**Source:** Router config
**Patterns per route:** 3

```
navigate to {route}
open {route} page
go to {section}
```

#### 3.4.6 Pattern Multiplication Example

For a typical enterprise app with:
- 10 entities → 60 CRUD patterns
- 15 forms → 75 form patterns
- 8 tables → 48 table patterns
- 12 modals → 48 modal patterns
- 20 routes → 60 navigation patterns

**Total from templates:** ~291 patterns + 79 seed = **370 patterns**

### 3.5 Quality Controls

| Control | Implementation |
|---------|----------------|
| Confidence threshold | ≥0.5 for all patterns |
| Deduplication | Normalized text + IR primitive hash |
| Executable mapping | Must map to AutoGen primitive |
| Cross-source validation | Promote confidence if found in 2+ sources |
| Pruning | Remove unused patterns after N test runs |
| Signal weighting | Strong (routes, schemas) > Medium (i18n) > Weak (literals) |

### 3.6 Integration Point: Step F12

Insert after F11 in discover-foundation prompt:

```markdown
## Step F12: LLKB Pattern Discovery

**Execute AFTER F11 (LLKB initialization). Generates app-specific patterns.**

### F12.1: Framework Detection (Static)
- Read package.json dependencies
- Detect: React, Angular, Vue, Svelte, Next.js
- Detect UI libraries: MUI, Ant Design, Chakra, AG Grid
- Output to app-profile.json

### F12.2: Selector Convention Analysis (Static)
- Scan src/ for data-testid, aria-label, role patterns
- Identify naming conventions (kebab-case, camelCase)
- Calculate coverage percentages
- Configure selector strategy in LLKB

### F12.3: Auth Pattern Extraction (Static + Runtime Optional)
- Use auth detection from Step D6
- Extract login form selectors if available
- Detect bypass mechanisms
- Generate auth-related patterns

### F12.4: Generate LLKB Patterns
- Create patterns from discoveries
- Assign confidence based on source:
  - Static only: 0.70
  - Runtime validated: 0.85
  - Both: 0.95
- Merge with seed patterns (non-destructive)
- Output to discovered-patterns.json
```

---

## 4. Implementation Phases

### Phase 1: Core Templates (MVP - 2-3 days)
**Target:** 200 patterns

**Scope:**
1. Parse package.json for frameworks and libraries
2. Scan source files for selector patterns
3. Generate app-profile.json
4. CRUD templates from discovered entities
5. Form templates from schema files (Zod, Yup, JSON Schema)
6. Navigation templates from routes

**Files to Create/Modify:**
- `core/typescript/llkb/discovery.ts` (new)
- `core/typescript/llkb/template-generators.ts` (new)
- `prompts/artk.discover-foundation.md` (add F12 section)
- `scripts/helpers/bootstrap-llkb.cjs` (load discovered patterns)

### Phase 2: Component Mining (3-4 days)
**Target:** 280 patterns

**Scope:**
1. Modal/dialog templates from component registry
2. Table/grid templates from data table components
3. Notification patterns from toast/alert components
4. Feature flag patterns from config files

**Files to Create/Modify:**
- `core/typescript/llkb/component-mining.ts` (new)
- `core/typescript/llkb/schemas/component-registry.schema.json` (new)

### Phase 3: Framework Packs (1 week)
**Target:** 350 patterns

**Scope:**
1. React-specific patterns (hooks, context, portals)
2. Angular-specific patterns (directives, pipes, services)
3. MUI/Antd/Chakra component patterns
4. AG Grid enterprise patterns

**Files to Create/Modify:**
- `core/typescript/llkb/packs/react.ts` (new)
- `core/typescript/llkb/packs/angular.ts` (new)
- `core/typescript/llkb/packs/mui.ts` (new)
- `core/typescript/llkb/packs/antd.ts` (new)

### Phase 4: i18n & Analytics Mining (3-4 days)
**Target:** 400 patterns

**Scope:**
1. i18n key patterns for text verification
2. Analytics event patterns for tracking assertions
3. Runtime validation using Playwright
4. Cross-source confidence boosting

**Files to Create/Modify:**
- `core/typescript/llkb/i18n-mining.ts` (new)
- `core/typescript/llkb/analytics-mining.ts` (new)
- `core/typescript/llkb/runtime-validation.ts` (new)

---

## 5. Error Handling

| Scenario | Behavior |
|----------|----------|
| No package.json | Log warning, set frameworks: [], continue |
| Framework detection fails | Log warning, use generic patterns only |
| Auth extraction fails | Set auth.detected=false, skip auth patterns |
| Runtime scan fails | Set runtime.validated=false, use static only |
| No patterns generated | Keep seed patterns, log reason |

**All failures must:**
1. Be logged with explicit causes
2. Not block discover-foundation completion
3. Appear in final summary output

---

## 6. Testing Strategy

### 6.1 Unit Tests

```typescript
describe('Framework Detection', () => {
  it('detects React from package.json', async () => {
    const signals = await detectFrameworks('/fixture/react-app');
    expect(signals).toContainEqual(
      expect.objectContaining({ name: 'react', confidence: expect.any(Number) })
    );
  });

  it('detects MUI from dependencies', async () => {
    const signals = await detectUiLibraries('/fixture/mui-app');
    expect(signals).toContainEqual(
      expect.objectContaining({ name: 'mui' })
    );
  });
});

describe('Selector Analysis', () => {
  it('identifies data-testid as primary attribute', async () => {
    const signals = await analyzeSelectorSignals('/fixture/testid-app');
    expect(signals.primaryAttribute).toBe('data-testid');
  });
});

describe('Pattern Generation', () => {
  it('generates patterns with correct confidence', () => {
    const patterns = generatePatterns(mockProfile, mockSignals);
    expect(patterns.every(p => p.confidence >= 0.7)).toBe(true);
  });
});
```

### 6.2 Integration Tests

```typescript
describe('Discover-Foundation F12', () => {
  it('creates app-profile.json after discovery', async () => {
    await runDiscoverFoundation('/test-project');
    expect(fs.existsSync('/test-project/.artk/llkb/app-profile.json')).toBe(true);
  });

  it('creates discovered-patterns.json with patterns', async () => {
    await runDiscoverFoundation('/test-project');
    const patterns = JSON.parse(
      fs.readFileSync('/test-project/.artk/llkb/discovered-patterns.json', 'utf-8')
    );
    expect(patterns.patterns.length).toBeGreaterThan(0);
  });
});
```

### 6.3 Regression Metrics

- Run journey-implement on 2+ sample apps before/after F12
- Measure TODO rate reduction
- Target: <10% TODOs with F12 enabled

---

## 7. Dependencies

### 7.1 Internal Dependencies

- `core/typescript/llkb/` - LLKB library
- `core/typescript/autogen/` - AutoGen pattern system
- `prompts/artk.discover-foundation.md` - Discovery prompt

### 7.2 External Dependencies

- None (static analysis only for MVP)
- Playwright (for Phase 2 runtime validation)

---

## 8. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| False positives in framework detection | Medium | Low | Require confidence ≥0.7 |
| Selector patterns not generalizable | Medium | Medium | Use fuzzy matching, decay confidence |
| Discovery adds too much time | Low | Medium | Cache results, limit scope |
| Breaking changes to LLKB | Low | High | Non-destructive merge only |

---

## 9. Future Enhancements

1. **Library Packs** - Pre-built patterns for MUI, Ant Design, AG Grid
2. **Interactive Discovery** - User performs sample flow, AI extracts patterns
3. **Cross-Project Learning** - Share high-confidence patterns between projects
4. **Continuous Learning** - Automatically update patterns based on test results

---

## Appendix: Participants

**Multi-AI Debate Participants:**
- Claude Opus 4.5 - Integration Architect, Moderator
- OpenAI Codex 0.94.0 - Systematic Engineer
- Gemini 3 Pro Preview - Pragmatic Architect (rate limited)

**Consensus Confidence:** 0.86
