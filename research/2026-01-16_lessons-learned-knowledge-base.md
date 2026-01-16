# ARTK Lessons Learned Knowledge Base (LLKB)

**Date:** 2026-01-16
**Version:** 2.0
**Status:** Complete Specification
**Topic:** Unified system for capturing lessons, patterns, and reusable components across all ARTK projects

---

## Executive Summary

The LLKB is a **learning system** that makes ARTK smarter over time. It captures:

1. **Lessons** - Issues discovered and fixes applied (timing, selectors, quirks)
2. **Components** - Reusable test patterns extracted into modules
3. **App Profile** - Application-specific knowledge (framework, UI library, auth)

Every ARTK prompt that modifies tests contributes to and consumes from the LLKB, creating a continuous learning loop.

---

## Core Principles

### 1. Hybrid Approach (Proactive + Reactive)

```
┌─────────────────────────────────────────────────────────────────────┐
│  PROACTIVE (Before Writing)                                          │
│  journey-implement checks LLKB → uses existing patterns/modules      │
├─────────────────────────────────────────────────────────────────────┤
│  REACTIVE (After Verification)                                       │
│  journey-verify analyzes code → extracts patterns → updates LLKB     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2. Both Prompts Write to LLKB

| Prompt | Reads from LLKB | Writes to LLKB |
|--------|-----------------|----------------|
| journey-implement | ✅ Components, Lessons, Patterns | ✅ New component candidates |
| journey-verify | ✅ Lessons for fix guidance | ✅ Lessons, Components, Quirks |
| journey-clarify | ✅ Known quirks for scope | ❌ (read-only) |
| discover-foundation | ❌ | ✅ Initial app profile |

### 3. Module + LLKB Entry (Always Both)

When a reusable pattern is identified:
1. **Create actual module file** in `modules/foundation/` or `modules/feature/`
2. **Register in LLKB** `components.json` with metadata
3. **Update module registry** `modules/registry.json`

### 4. Aggressive Reuse Strategy

- **2+ occurrences**: Automatic extraction
- **1 occurrence**: Extract if LLM predicts reuse (checks other journeys, common UI patterns)

### 5. Track All Pattern Scopes

| Scope | Location | Example |
|-------|----------|---------|
| **Universal** | `@artk/core/*` | Toast verification, loading states |
| **Framework-specific** | `@artk/core/<framework>` | AG Grid helpers, Angular patterns |
| **App-specific** | `modules/foundation/*` or `modules/feature/*` | Sidebar nav, custom forms |

---

## Complete File Structure

```
<ARTK_ROOT>/
├── .artk/
│   ├── context.json                    # Project detection cache
│   └── llkb/                           # Lessons Learned Knowledge Base
│       ├── config.yml                  # LLKB configuration
│       ├── app-profile.json            # Application DNA
│       ├── lessons.json                # Fixes, quirks, timing patterns
│       ├── components.json             # Reusable test components catalog
│       ├── patterns/                   # Categorized pattern details
│       │   ├── selectors.json          # Selector strategies
│       │   ├── timing.json             # Async/timing patterns
│       │   ├── data.json               # Test data patterns
│       │   ├── auth.json               # Authentication patterns
│       │   └── assertions.json         # Common assertion patterns
│       ├── history/                    # Learning event log
│       │   └── YYYY-MM-DD.jsonl        # Daily events (append-only)
│       └── analytics.json              # Effectiveness metrics
│
├── <harnessRoot>/                      # e.g., artk-e2e/
│   └── src/modules/
│       ├── foundation/                 # App-wide reusable modules
│       │   ├── auth/
│       │   │   └── login.ts
│       │   ├── navigation/
│       │   │   └── nav.ts
│       │   ├── selectors/
│       │   │   └── locators.ts
│       │   ├── data/
│       │   │   └── run-id.ts
│       │   └── assertions/             # Common assertion helpers
│       │       └── common.ts
│       ├── feature/                    # Scope-specific modules
│       │   ├── catalog/
│       │   │   └── catalog.page.ts
│       │   ├── orders/
│       │   │   └── orders.page.ts
│       │   └── <scope>/
│       │       └── <scope>.page.ts
│       └── registry.json               # Module catalog with exports
```

---

## Schema Definitions

### 1. LLKB Configuration (`config.yml`)

```yaml
version: "1.0.0"
enabled: true

# Learning thresholds
extraction:
  minOccurrences: 2              # Extract after N uses
  predictiveExtraction: true     # Extract on first use if predicted reusable
  confidenceThreshold: 0.7       # Min confidence to auto-apply pattern

# Retention policies
retention:
  maxLessonAge: 90               # Days before lesson marked stale
  minSuccessRate: 0.6            # Demote lessons below this rate
  archiveUnused: 30              # Archive components unused for N days

# Context injection
injection:
  maxLessonsPerPrompt: 15        # Limit injected lessons
  maxComponentsPerPrompt: 10     # Limit injected components
  prioritizeByConfidence: true   # Sort by confidence score

# Scopes tracked
scopes:
  universal: true                # Track @artk/core patterns
  frameworkSpecific: true        # Track framework patterns
  appSpecific: true              # Track app-specific patterns
```

### 2. App Profile (`app-profile.json`)

```json
{
  "version": "1.0.0",
  "createdBy": "discover-foundation",
  "lastUpdated": "2026-01-16T10:00:00Z",

  "application": {
    "name": "string - detected app name",
    "framework": "angular | react | vue | nextjs | other",
    "uiLibrary": "material | antd | primeng | bootstrap | custom",
    "dataGrid": "ag-grid | tanstack-table | custom | none",
    "authProvider": "azure-ad | okta | auth0 | cognito | custom | none",
    "stateManagement": "ngrx | redux | zustand | none"
  },

  "testability": {
    "testIdAttribute": "data-testid | data-test | data-cy | custom",
    "testIdCoverage": "high | medium | low",
    "ariaCoverage": "high | medium | low",
    "asyncComplexity": "high | medium | low"
  },

  "environment": {
    "baseUrls": {
      "dev": "string",
      "staging": "string",
      "prod": "string (if applicable)"
    },
    "authBypass": {
      "available": true,
      "method": "storage-state | api-token | mock-user | none"
    }
  }
}
```

### 3. Lessons Database (`lessons.json`)

```json
{
  "version": "1.0.0",
  "lastUpdated": "2026-01-16T10:00:00Z",

  "lessons": [
    {
      "id": "L001",
      "category": "selector | timing | data | auth | quirk | assertion",
      "severity": "critical | high | medium | low",
      "scope": "universal | framework:<name> | app-specific",

      "title": "Short descriptive title",
      "problem": "What went wrong",
      "solution": "How to fix it",
      "rationale": "Why this solution works",

      "codePattern": {
        "bad": "Code that causes the problem",
        "good": "Code that solves it",
        "context": "When to apply this pattern"
      },

      "applicableTo": ["component-name", "selector-pattern", "scope-name"],
      "tags": ["ag-grid", "async", "navigation"],

      "metrics": {
        "occurrences": 12,
        "successRate": 0.95,
        "confidence": 0.92,
        "firstSeen": "2026-01-10T14:22:00Z",
        "lastApplied": "2026-01-16T09:15:00Z",
        "lastSuccess": "2026-01-16T09:15:00Z"
      },

      "source": {
        "discoveredBy": "journey-verify",
        "journey": "JRN-0003",
        "file": "tests/smoke/jrn-0003.spec.ts",
        "line": 42
      },

      "validation": {
        "autoValidated": true,
        "humanReviewed": false,
        "reviewedBy": null,
        "reviewedAt": null
      }
    }
  ],

  "globalRules": [
    {
      "id": "GR001",
      "rule": "Description of rule that always applies",
      "reason": "Why this rule exists",
      "enforcement": "error | warning | suggestion",
      "autoApply": true
    }
  ],

  "appQuirks": [
    {
      "id": "AQ001",
      "component": "Component name",
      "location": "/route or selector",
      "quirk": "Description of unexpected behavior",
      "impact": "How it affects tests",
      "workaround": "Code or approach to handle it",
      "permanent": false,
      "issueLink": "URL to bug tracker if exists",
      "affectsJourneys": ["JRN-0001", "JRN-0005"]
    }
  ]
}
```

### 4. Components Catalog (`components.json`)

```json
{
  "version": "1.0.0",
  "lastUpdated": "2026-01-16T10:00:00Z",

  "components": [
    {
      "id": "COMP001",
      "name": "verifySidebarReady",
      "category": "navigation | auth | assertion | data | ui-interaction",
      "scope": "universal | framework:<name> | app-specific",

      "description": "What this component does",
      "purpose": "When/why to use it",

      "module": {
        "path": "foundation/navigation/nav.ts",
        "importPath": "@modules/foundation/navigation",
        "exportName": "verifySidebarReady"
      },

      "signature": {
        "typescript": "verifySidebarReady(page: Page, options?: VerifySidebarOptions): Promise<void>",
        "params": [
          { "name": "page", "type": "Page", "required": true },
          { "name": "options", "type": "VerifySidebarOptions", "required": false }
        ],
        "returns": "Promise<void>"
      },

      "implementation": {
        "selectors": ["[data-testid^='sidebar-item-']", "[data-testid='sidebar-nav']"],
        "assertions": ["visibility", "count", "attached"],
        "waits": ["auto-wait on visibility"],
        "complexity": "simple | moderate | complex"
      },

      "usageContext": [
        "After page load, before navigation actions",
        "After login completes",
        "When testing any page that has sidebar"
      ],

      "usageExample": {
        "code": "await verifySidebarReady(page);",
        "fullExample": "import { verifySidebarReady } from '@modules/foundation/navigation';\n\nawait test.step('Verify navigation ready', async () => {\n  await verifySidebarReady(page);\n});"
      },

      "metrics": {
        "usedInJourneys": ["JRN-0002", "JRN-0003", "JRN-0005"],
        "totalUses": 15,
        "successRate": 0.98,
        "confidence": 0.95,
        "createdAt": "2026-01-10T14:22:00Z",
        "lastUsed": "2026-01-16T09:15:00Z"
      },

      "source": {
        "extractedFrom": "JRN-0002",
        "extractedBy": "journey-verify",
        "originalCode": "// The inline code that was extracted"
      },

      "relatedComponents": ["COMP002", "COMP003"],
      "relatedLessons": ["L001", "L015"]
    }
  ],

  "componentsByCategory": {
    "navigation": ["COMP001", "COMP002", "COMP003"],
    "auth": ["COMP010", "COMP011"],
    "assertion": ["COMP020", "COMP021", "COMP022"],
    "data": ["COMP030"],
    "ui-interaction": ["COMP040", "COMP041"]
  },

  "componentsByScope": {
    "universal": ["COMP020", "COMP021"],
    "framework:angular": ["COMP040"],
    "framework:ag-grid": ["COMP041", "COMP042"],
    "app-specific": ["COMP001", "COMP002", "COMP003"]
  }
}
```

### 5. Pattern Details (`patterns/*.json`)

#### Selectors (`patterns/selectors.json`)

```json
{
  "version": "1.0.0",

  "selectorPriority": {
    "comment": "App-specific selector priority based on learnings",
    "order": [
      { "type": "data-testid", "reliability": 0.98, "note": "Primary strategy" },
      { "type": "role+name", "reliability": 0.95 },
      { "type": "aria-label", "reliability": 0.90 },
      { "type": "text-content", "reliability": 0.75 },
      { "type": "css-class", "reliability": 0.40, "note": "Avoid if possible" }
    ]
  },

  "selectorPatterns": [
    {
      "id": "SEL001",
      "name": "AG Grid Cell Selection",
      "context": "When selecting cells in AG Grid",
      "problem": "CSS class selectors are dynamic",
      "solution": "Use aria-based selectors",
      "template": "page.getByRole('gridcell', { name: expectedValue })",
      "applicableTo": ["ag-grid", "data-grid"],
      "confidence": 0.95
    }
  ],

  "avoidSelectors": [
    { "pattern": ".ag-cell-*", "reason": "Dynamic AG Grid classes" },
    { "pattern": "[class*='_']", "reason": "CSS module hashed classes" },
    { "pattern": ".ng-*", "reason": "Angular internal classes" },
    { "pattern": "[class*='sc-']", "reason": "Styled-components hashes" }
  ],

  "preferredSelectors": [
    { "pattern": "[data-testid='*']", "priority": 1, "reason": "Stable, explicit" },
    { "pattern": "getByRole('*')", "priority": 2, "reason": "Accessible, semantic" },
    { "pattern": "getByLabel('*')", "priority": 3, "reason": "User-visible" }
  ]
}
```

#### Timing (`patterns/timing.json`)

```json
{
  "version": "1.0.0",

  "asyncPatterns": [
    {
      "id": "ASYNC001",
      "name": "Toast notification timing",
      "context": "Success/error toasts after actions",
      "pattern": "await expectToast(page, { message: /success/i, timeout: 5000 })",
      "observedDelays": { "min": 100, "avg": 250, "max": 800, "p95": 500 },
      "recommendation": "Use 5000ms timeout for toasts"
    }
  ],

  "loadingIndicators": [
    {
      "component": "DataGrid",
      "indicator": "[data-loading='true']",
      "avgLoadTime": 1200,
      "maxObservedTime": 5000,
      "waitStrategy": "await grid.waitForDataLoaded()"
    }
  ],

  "networkPatterns": [
    {
      "endpoint": "/api/*",
      "avgResponseTime": 450,
      "p95ResponseTime": 1200,
      "retryRecommended": true,
      "maxRetries": 3
    }
  ],

  "forbiddenPatterns": [
    {
      "pattern": "page.waitForTimeout(*)",
      "severity": "error",
      "alternative": "Use web-first assertions or expect.poll()"
    },
    {
      "pattern": "waitForLoadState('networkidle')",
      "severity": "warning",
      "alternative": "Use 'domcontentloaded' or explicit element waits"
    }
  ]
}
```

#### Assertions (`patterns/assertions.json`)

```json
{
  "version": "1.0.0",

  "commonAssertions": [
    {
      "id": "ASSERT001",
      "name": "Page loaded successfully",
      "pattern": "await expect(page.locator('body')).toBeVisible();\nawait expect(page).not.toHaveTitle(/error|500|404/i);",
      "usageContext": "After navigation to any page",
      "componentRef": "COMP050"
    },
    {
      "id": "ASSERT002",
      "name": "Form validation error visible",
      "pattern": "await expect(page.getByRole('alert')).toBeVisible();\nawait expect(page.getByRole('alert')).toContainText(expectedError);",
      "usageContext": "After form submission with invalid data"
    }
  ],

  "assertionHelpers": [
    {
      "name": "expectToast",
      "module": "@artk/core/assertions",
      "signature": "expectToast(page, { message, type?, timeout? })",
      "scope": "universal"
    },
    {
      "name": "expectLoading",
      "module": "@artk/core/assertions",
      "signature": "expectLoading(page, { indicator?, timeout? })",
      "scope": "universal"
    }
  ]
}
```

### 6. History Log (`history/YYYY-MM-DD.jsonl`)

```jsonl
{"timestamp":"2026-01-16T10:30:00Z","event":"lesson_created","id":"L042","journey":"JRN-0005","prompt":"journey-verify","summary":"Discovered AG Grid cell selector pattern"}
{"timestamp":"2026-01-16T10:35:00Z","event":"component_extracted","id":"COMP015","journey":"JRN-0005","prompt":"journey-verify","summary":"Extracted verifyCatalogGrid from JRN-0005"}
{"timestamp":"2026-01-16T11:00:00Z","event":"component_used","id":"COMP001","journey":"JRN-0010","prompt":"journey-implement","summary":"Reused verifySidebarReady in JRN-0010"}
{"timestamp":"2026-01-16T11:05:00Z","event":"lesson_applied","id":"L001","journey":"JRN-0010","prompt":"journey-implement","success":true}
{"timestamp":"2026-01-16T11:10:00Z","event":"component_created","id":"COMP016","journey":"JRN-0010","prompt":"journey-implement","summary":"Predicted reuse for verifyBreadcrumb, created module"}
```

### 7. Analytics (`analytics.json`)

```json
{
  "version": "1.0.0",
  "lastUpdated": "2026-01-16T12:00:00Z",

  "overview": {
    "totalLessons": 42,
    "activeLessons": 38,
    "archivedLessons": 4,
    "totalComponents": 25,
    "activeComponents": 23,
    "archivedComponents": 2
  },

  "lessonStats": {
    "byCategory": {
      "selector": 18,
      "timing": 12,
      "quirk": 7,
      "auth": 3,
      "data": 2
    },
    "avgConfidence": 0.82,
    "avgSuccessRate": 0.89
  },

  "componentStats": {
    "byCategory": {
      "navigation": 5,
      "auth": 3,
      "assertion": 8,
      "ui-interaction": 6,
      "data": 3
    },
    "byScope": {
      "universal": 8,
      "framework-specific": 5,
      "app-specific": 12
    },
    "totalReuses": 156,
    "avgReusesPerComponent": 6.2
  },

  "impact": {
    "verifyIterationsSaved": 89,
    "avgIterationsBeforeLLKB": 3.2,
    "avgIterationsAfterLLKB": 1.4,
    "codeDeduplicationRate": 0.35,
    "estimatedHoursSaved": 45
  },

  "topPerformers": {
    "lessons": [
      { "id": "L001", "applications": 89, "successRate": 0.96 },
      { "id": "L015", "applications": 67, "successRate": 0.94 }
    ],
    "components": [
      { "id": "COMP001", "uses": 45, "successRate": 0.98 },
      { "id": "COMP020", "uses": 38, "successRate": 0.97 }
    ]
  },

  "needsReview": {
    "lowConfidenceLessons": ["L038", "L041"],
    "lowUsageComponents": ["COMP022"],
    "decliningSuccessRate": ["L035"]
  }
}
```

---

## Prompt Integration Specifications

### discover-foundation Responsibilities

**Writes to LLKB:**
- Creates `app-profile.json` with detected application characteristics
- Initializes empty `lessons.json`, `components.json`, `patterns/*.json`
- Sets up `config.yml` with default thresholds

**Does NOT:**
- Create any lessons or components (no test code exists yet)

```markdown
## Step NEW — Initialize LLKB

After foundation build completes:

1. Create `.artk/llkb/` directory structure
2. Generate `app-profile.json` from discovery data:
   - Framework detected
   - UI library detected
   - Auth provider detected
   - testIdAttribute used
3. Initialize empty `lessons.json` and `components.json`
4. Create `config.yml` with defaults
5. Initialize `patterns/*.json` with app-appropriate defaults
```

---

### journey-implement Responsibilities

**Reads from LLKB:**
- `components.json` - Find reusable components for this journey's scope
- `lessons.json` - Get relevant lessons for the scope/features
- `patterns/*.json` - Get selector strategies, timing patterns
- `app-profile.json` - Understand app characteristics

**Writes to LLKB:**
- New component candidates (when predicting reuse)
- History events (component used, lesson applied)

**Algorithm:**

```markdown
## Step 9.8 — LLKB Integration: Check for Reusable Components

Before writing any test code:

### 9.8.1 Load LLKB Context

1. Read `.artk/llkb/components.json`
2. Read `.artk/llkb/lessons.json`
3. Read `.artk/llkb/patterns/` relevant to Journey scope

### 9.8.2 Match Journey Steps to Existing Components

For each step in the Journey:

1. **Keyword extraction**: Extract action keywords (verify, navigate, click, fill, etc.)
2. **Scope matching**: Filter components by Journey scope
3. **Similarity scoring**: Compare step description to component usageContext
4. **Confidence threshold**: If score > 0.7, use component

```
MATCH ALGORITHM:
  keywords = extractKeywords(journeyStep)
  candidates = components.filter(c =>
    c.category matches stepType AND
    c.scope in ['universal', 'framework:' + appFramework, 'app-specific']
  )
  for each candidate:
    score = similarity(journeyStep.description, candidate.usageContext)
    if score > 0.7:
      USE candidate (import and call)
    elif score > 0.4:
      SUGGEST candidate (show to user, let them decide)
```

### 9.8.3 Apply Relevant Lessons

For each Journey step:

1. Check lessons that match the scope/selectors/components
2. Apply high-confidence lessons automatically
3. Add comments for medium-confidence lessons
4. Skip low-confidence lessons

### 9.8.4 Predict Reuse for New Patterns

When writing NEW inline code (no existing component):

1. **Analyze the pattern**: Is this a common UI interaction?
   - Navigation (sidebar, menu, breadcrumb)
   - Forms (validation, submission, clearing)
   - Tables/Grids (sorting, filtering, row selection)
   - Modals/Dialogs (open, close, confirm)
   - Notifications (toast, alert, banner)

2. **Check other journeys**: Does this pattern appear in other proposed/implemented journeys?
   - Read `journeys/index.json` for all journeys
   - Scan journey steps for similar keywords
   - If 1+ other journey has similar step → EXTRACT NOW

3. **Decision**:
   - If likely reusable → Create module + component entry IMMEDIATELY
   - If uncertain → Write inline, mark as "extraction candidate"
   - If unique → Write inline, no marking

### 9.8.5 Create Module for Predicted Reuse

When creating a new component:

1. Determine module location:
   - Universal patterns → Suggest PR to `@artk/core`
   - Framework patterns → `modules/foundation/<category>/`
   - App-specific → `modules/foundation/<category>/` or `modules/feature/<scope>/`

2. Create module file with:
   - Clear JSDoc documentation
   - Type-safe signature
   - Error handling
   - Configurable options where appropriate

3. Add entry to `components.json`:
   - Full metadata
   - metrics.usedInJourneys = [currentJourney]
   - source.extractedFrom = currentJourney
   - source.extractedBy = "journey-implement"

4. Update `modules/registry.json`:
   - Add export entry

5. Log to `history/`:
   - event: "component_created"
   - prompt: "journey-implement"
   - summary: "Predicted reuse for {componentName}"

### 9.8.6 Generate Test Code

For each Journey step:

1. If component exists → Import and use:
   ```typescript
   import { verifySidebarReady } from '@modules/foundation/navigation';

   await test.step('Step 3: Verify navigation', async () => {
     await verifySidebarReady(page);
   });
   ```

2. If new component created → Import and use (same as above)

3. If inline code → Write with lesson patterns applied:
   ```typescript
   await test.step('Step 5: Custom action', async () => {
     // LLKB: Applied L001 - use aria selectors for buttons
     await page.getByRole('button', { name: 'Submit' }).click();
   });
   ```

### 9.8.7 Record Usage

After generating all test code:

1. For each component used:
   - Update `components.json`: add journey to usedInJourneys, increment totalUses
   - Log to history: event "component_used"

2. For each lesson applied:
   - Log to history: event "lesson_applied"
```

---

### journey-verify Responsibilities

**Reads from LLKB:**
- `lessons.json` - Guide fix strategies
- `components.json` - Check if fix creates reusable pattern
- `patterns/*.json` - Understand expected patterns

**Writes to LLKB:**
- New lessons (when fixing issues)
- New components (when extracting patterns)
- Updated metrics (success/failure tracking)
- App quirks (when discovering unexpected behavior)
- History events

**Algorithm:**

```markdown
## Step 17 — LLKB Integration: Learn and Extract

After tests pass (or after fixing and re-running):

### 17.1 Record Lessons from Fixes

For each fix applied during verification:

1. **Analyze the fix**:
   - What selector/timing/pattern was wrong?
   - What made it work?
   - Is this generalizable or one-off?

2. **Create lesson if generalizable**:
   ```json
   {
     "id": "L###",
     "category": "selector|timing|quirk|etc",
     "title": "Short description",
     "problem": "What went wrong",
     "solution": "How to fix it",
     "codePattern": { "bad": "...", "good": "..." },
     "applicableTo": ["component", "selector-pattern"],
     "source": { "journey": "JRN-####", "discoveredBy": "journey-verify" }
   }
   ```

3. **Update existing lesson if similar exists**:
   - Increment occurrences
   - Update lastApplied
   - Adjust confidence based on success

### 17.2 Detect Extraction Opportunities

After all tests pass, analyze test code for duplication:

1. **Cross-journey comparison**:
   ```
   FOR each test file in project:
     Extract all test.step blocks
     Hash the assertion patterns (normalized)
     Group by similarity

   FOR each group with 2+ members:
     IF not already a component:
       EXTRACT as new component
   ```

2. **Single-journey analysis**:
   ```
   FOR each test.step in current journey:
     IF step matches common pattern (navigation, form, grid, etc.):
       IF no component exists:
         CREATE component
   ```

### 17.3 Extract New Components

When extracting a component:

1. **Determine best location**:
   - If used across scopes → `modules/foundation/<category>/`
   - If scope-specific → `modules/feature/<scope>/`

2. **Generate module code**:
   ```typescript
   /**
    * <Description>
    * @component COMP###
    * @extractedFrom JRN-####
    */
   export async function componentName(
     page: Page,
     options?: ComponentOptions
   ): Promise<void> {
     // Extracted and generalized code
   }
   ```

3. **Update all tests that use this pattern**:
   - Replace inline code with import + function call
   - Ensure tests still pass after refactor

4. **Register component**:
   - Add to `components.json`
   - Add to `modules/registry.json`
   - Log to history

### 17.4 Discover App Quirks

When a fix reveals unexpected app behavior:

1. **Classify as quirk if**:
   - Behavior is undocumented
   - Behavior differs from standard/expected
   - Workaround is required

2. **Add to appQuirks in lessons.json**:
   ```json
   {
     "id": "AQ###",
     "component": "Component name",
     "location": "/route or selector",
     "quirk": "Description",
     "impact": "How it affects tests",
     "workaround": "Code to handle it",
     "permanent": false,
     "issueLink": "URL if bug filed"
   }
   ```

### 17.5 Update Metrics

After verification complete:

1. **For each lesson applied**:
   - If test passed: increment successRate
   - If test failed: decrement successRate
   - Recalculate confidence

2. **For each component used**:
   - If test passed: mark success
   - If test failed: investigate (component issue or test issue?)

3. **Update analytics.json**:
   - Recalculate averages
   - Update impact metrics
   - Flag items needing review

### 17.6 Log Everything

Append to `history/YYYY-MM-DD.jsonl`:
- All lessons created/updated
- All components extracted/used
- All quirks discovered
- Success/failure outcomes
```

---

### journey-clarify Responsibilities

**Reads from LLKB:**
- `appQuirks` - Surface known quirks for the Journey's scope
- `lessons.json` - Warn about known issues
- `components.json` - Inform about available components

**Writes to LLKB:**
- Nothing (read-only during clarification)

**Algorithm:**

```markdown
## Step NEW — Surface LLKB Knowledge

When clarifying a Journey:

1. **Load relevant LLKB data**:
   - Filter lessons by Journey scope
   - Filter quirks by Journey routes/components
   - Filter components by Journey scope

2. **Surface to user**:
   ```
   **LLKB Insights for this Journey:**

   ⚠️ Known Quirks:
   - DatePicker: Requires blur before validation (AQ003)
   - OrderForm: Submit button double-click creates duplicates (AQ007)

   📦 Available Components:
   - verifySidebarReady (COMP001) - Use for navigation checks
   - verifyToast (COMP020) - Use for success/error messages

   💡 Relevant Lessons:
   - L015: AG Grid cells need aria-based selectors
   - L022: Toast timing is 100-800ms, use 5s timeout
   ```

3. **Add to Journey clarification block**:
   - List applicable components
   - Note known quirks
   - Include relevant lessons as hints
```

---

## Complete Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ARTK LLKB WORKFLOW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────┐                                                   │
│  │  discover-foundation │                                                   │
│  │  ────────────────────│                                                   │
│  │  • Creates app-profile│                                                   │
│  │  • Initializes LLKB   │                                                   │
│  │  • Sets up patterns   │                                                   │
│  └──────────┬───────────┘                                                   │
│             │                                                                │
│             ▼                                                                │
│  ┌──────────────────────┐      ┌─────────────────────────────┐              │
│  │  journey-clarify     │──────│  READS: quirks, lessons,    │              │
│  │  ────────────────────│      │  components for scope       │              │
│  │  • Surfaces LLKB     │      │  WRITES: nothing            │              │
│  │    knowledge         │      └─────────────────────────────┘              │
│  └──────────┬───────────┘                                                   │
│             │                                                                │
│             ▼                                                                │
│  ┌──────────────────────┐      ┌─────────────────────────────┐              │
│  │  journey-implement   │──────│  READS: components, lessons,│              │
│  │  ────────────────────│      │  patterns, app-profile      │              │
│  │  • Checks LLKB first │      │                             │              │
│  │  • Reuses components │      │  WRITES: new components     │              │
│  │  • Applies lessons   │      │  (predictive), history      │              │
│  │  • Predicts reuse    │      └─────────────────────────────┘              │
│  │  • Creates modules   │                                                   │
│  └──────────┬───────────┘                                                   │
│             │                                                                │
│             ▼                                                                │
│  ┌──────────────────────┐      ┌─────────────────────────────┐              │
│  │  journey-verify      │──────│  READS: lessons, patterns   │              │
│  │  ────────────────────│      │                             │              │
│  │  • Fixes issues      │      │  WRITES: lessons, components│              │
│  │  • Records lessons   │      │  quirks, metrics, history   │              │
│  │  • Extracts patterns │      └─────────────────────────────┘              │
│  │  • Creates modules   │                                                   │
│  │  • Updates metrics   │                                                   │
│  └──────────┬───────────┘                                                   │
│             │                                                                │
│             ▼                                                                │
│  ┌──────────────────────┐                                                   │
│  │  LLKB KNOWLEDGE BASE │                                                   │
│  │  ════════════════════│                                                   │
│  │  • app-profile.json  │◄──── Application DNA                              │
│  │  • lessons.json      │◄──── Fixes, quirks, patterns                      │
│  │  • components.json   │◄──── Reusable test components                     │
│  │  • patterns/*.json   │◄──── Selector, timing, assertion patterns         │
│  │  • history/*.jsonl   │◄──── Learning event log                           │
│  │  • analytics.json    │◄──── Effectiveness metrics                        │
│  └──────────────────────┘                                                   │
│             │                                                                │
│             │ Feeds into next journey...                                    │
│             ▼                                                                │
│  ┌──────────────────────┐                                                   │
│  │  NEXT JOURNEY        │                                                   │
│  │  ════════════════════│                                                   │
│  │  • Reuses components │                                                   │
│  │  • Avoids past issues│                                                   │
│  │  • Applies lessons   │                                                   │
│  │  • Adds new learnings│                                                   │
│  └──────────────────────┘                                                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Module Creation Specification

When creating a new reusable module:

### Module File Structure

```typescript
/**
 * <Module Description>
 *
 * @module foundation/<category>
 * @since 1.0.0
 */
import { Page, expect, Locator } from '@playwright/test';

// ============================================================================
// Types
// ============================================================================

export interface ComponentOptions {
  timeout?: number;
  // ... other options
}

// ============================================================================
// Components
// ============================================================================

/**
 * <Component description>
 *
 * @component COMP###
 * @category <category>
 * @scope <universal|framework:xxx|app-specific>
 * @extractedFrom JRN-####
 *
 * @example
 * ```typescript
 * await componentName(page, { timeout: 5000 });
 * ```
 */
export async function componentName(
  page: Page,
  options: ComponentOptions = {}
): Promise<void> {
  const { timeout = 10000 } = options;

  // Implementation
}

/**
 * <Another component>
 * @component COMP###
 */
export async function anotherComponent(
  page: Page
): Promise<ReturnType> {
  // Implementation
}

// ============================================================================
// Internal Helpers (not exported as components)
// ============================================================================

function internalHelper(): void {
  // Not a component, just a helper
}
```

### Module Registry Entry

```json
{
  "name": "navigation",
  "path": "foundation/navigation",
  "description": "Navigation and sidebar utilities",
  "exports": [
    {
      "name": "verifySidebarReady",
      "type": "async function",
      "componentId": "COMP001",
      "signature": "verifySidebarReady(page: Page, options?: VerifyOptions): Promise<void>",
      "description": "Verify sidebar navigation is loaded and interactive"
    },
    {
      "name": "navigateTo",
      "type": "async function",
      "componentId": "COMP002",
      "signature": "navigateTo(page: Page, route: string): Promise<void>",
      "description": "Navigate to a route via sidebar"
    }
  ],
  "dependencies": [],
  "peerDependencies": ["@playwright/test"]
}
```

---

## Confidence and Scoring System

### Lesson Confidence Calculation

```
confidence = baseScore * recencyFactor * successFactor * validationBoost

where:
  baseScore = min(occurrences / 10, 1.0)  // Caps at 10 occurrences
  recencyFactor = 1.0 - (daysSinceLastSuccess / 90) * 0.3  // Decays over 90 days
  successFactor = successRate ^ 0.5  // Square root to be forgiving
  validationBoost = 1.2 if humanReviewed else 1.0
```

### Component Confidence Calculation

```
confidence = usageFactor * successFactor * diversityBonus

where:
  usageFactor = min(totalUses / 20, 1.0)  // Caps at 20 uses
  successFactor = successRate
  diversityBonus = 1.0 + (uniqueJourneys / 10) * 0.2  // Bonus for cross-journey use
```

### Confidence Thresholds

| Score | Level | Auto-Apply | Action |
|-------|-------|------------|--------|
| 0.0 - 0.3 | Low | ❌ | Suggest only, show alternatives |
| 0.3 - 0.5 | Medium-Low | ❌ | Suggest with warning |
| 0.5 - 0.7 | Medium | ⚠️ | Auto-apply with comment |
| 0.7 - 0.9 | High | ✅ | Auto-apply silently |
| 0.9 - 1.0 | Very High | ✅ | Enforce as rule |

---

## Context Injection Strategy

### Problem: Limited Context Window

LLM context is finite. We can't inject all LLKB data every time.

### Solution: Relevance-Based Filtering

```typescript
interface InjectionContext {
  journey: Journey;
  llkb: LLKB;
  maxLessons: number;
  maxComponents: number;
}

function getRelevantContext(ctx: InjectionContext): InjectedContext {
  const { journey, llkb, maxLessons, maxComponents } = ctx;

  // 1. Filter by scope
  const scopeMatches = (item: any) =>
    item.scope === 'universal' ||
    item.scope === `framework:${llkb.appProfile.framework}` ||
    item.applicableTo?.some(a => journey.scope.includes(a));

  // 2. Filter by category/keywords
  const keywordMatches = (item: any) => {
    const journeyKeywords = extractKeywords(journey);
    const itemKeywords = [
      ...(item.tags || []),
      ...(item.applicableTo || []),
      item.category
    ];
    return itemKeywords.some(k => journeyKeywords.includes(k));
  };

  // 3. Score and sort
  const scoredLessons = llkb.lessons
    .filter(l => scopeMatches(l) && keywordMatches(l))
    .map(l => ({ ...l, relevanceScore: calculateRelevance(l, journey) }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, maxLessons);

  const scoredComponents = llkb.components
    .filter(c => scopeMatches(c) && keywordMatches(c))
    .map(c => ({ ...c, relevanceScore: calculateRelevance(c, journey) }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, maxComponents);

  return { lessons: scoredLessons, components: scoredComponents };
}
```

### Injected Context Format

```markdown
## LLKB Context (Auto-Injected for JRN-####)

### Available Components (Top 5 for this scope)

| Component | Module | Confidence | Use When |
|-----------|--------|------------|----------|
| verifySidebarReady | @modules/foundation/navigation | 95% | After page load |
| navigateTo | @modules/foundation/navigation | 92% | Navigation actions |
| expectToast | @artk/core/assertions | 98% | After form submit |

**Import Example:**
\`\`\`typescript
import { verifySidebarReady, navigateTo } from '@modules/foundation/navigation';
import { expectToast } from '@artk/core/assertions';
\`\`\`

### Relevant Lessons (Top 5)

1. **[HIGH] L001: AG Grid Selectors**
   - Use: `page.getByRole('gridcell', { name: value })`
   - Avoid: `.ag-cell-value` CSS selectors

2. **[MEDIUM] L015: Toast Timing**
   - Observed: 100-800ms delay
   - Use: `timeout: 5000` for toasts

### Known Quirks for This Scope

- **AQ003 (DatePicker)**: Requires blur before validation check
- **AQ007 (OrderForm)**: Double-click prevention needed

---
```

---

## Implementation Phases

### Phase 1: Foundation (Days 1-3)

- [ ] Create LLKB directory structure specification
- [ ] Define all JSON schemas (app-profile, lessons, components, patterns)
- [ ] Create config.yml schema with defaults
- [ ] Write schema validation utilities

### Phase 2: discover-foundation Integration (Days 4-5)

- [ ] Add Step: Initialize LLKB after foundation build
- [ ] Generate app-profile.json from discovery data
- [ ] Initialize empty lessons.json and components.json
- [ ] Create default patterns/*.json based on detected framework

### Phase 3: journey-implement Integration (Days 6-10)

- [ ] Add Step 9.8: LLKB Integration
- [ ] Implement component matching algorithm
- [ ] Implement lesson application logic
- [ ] Implement predictive reuse detection
- [ ] Implement module creation workflow
- [ ] Add history logging

### Phase 4: journey-verify Integration (Days 11-15)

- [ ] Add Step 17: LLKB Learning
- [ ] Implement lesson recording from fixes
- [ ] Implement cross-journey pattern detection
- [ ] Implement component extraction workflow
- [ ] Implement quirk discovery
- [ ] Add metrics tracking

### Phase 5: journey-clarify Integration (Days 16-17)

- [ ] Add LLKB context surfacing
- [ ] Display relevant quirks, lessons, components
- [ ] Add to clarification blocks

### Phase 6: Analytics and Tooling (Days 18-20)

- [ ] Create analytics calculation utilities
- [ ] Create LLKB health report generator
- [ ] Add confidence decay cron job (or on-access calculation)
- [ ] Create manual review interface (CLI commands)

### Phase 7: Testing and Refinement (Days 21-25)

- [ ] Test full workflow on sample project
- [ ] Tune confidence thresholds
- [ ] Tune extraction criteria
- [ ] Document edge cases

---

## Success Metrics

### Quantitative

| Metric | Target | Measurement |
|--------|--------|-------------|
| Code duplication reduction | 40%+ | Lines of duplicated assertion code |
| Verify iterations reduction | 50%+ | Avg iterations before/after LLKB |
| Implementation speed increase | 30%+ | Time to implement journey |
| Flaky test reduction | 60%+ | Tests requiring re-runs |
| Component reuse rate | 70%+ | % of common patterns using components |

### Qualitative

| Metric | Target |
|--------|--------|
| Test consistency | Same patterns used across all journeys |
| Knowledge retention | Learnings survive sessions and team changes |
| Onboarding speed | New team members productive faster |
| Maintenance cost | Single point of change for pattern updates |

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Over-extraction (too DRY) | Hard to read tests | Min 2 occurrences, predictive only for common patterns |
| Stale components | Wrong code applied | Confidence decay, archive unused after 30 days |
| Breaking changes to components | All tests break | Version components, run full regression on changes |
| Complex component APIs | Hard to use | Max 2 required params, sensible defaults |
| LLKB bloat | Slow context loading | Relevance filtering, pagination, archival |
| False lessons | Wrong fixes applied | Require 70% success rate, demote on failures |
| Cross-project conflicts | Wrong patterns applied | Scope isolation (app-specific vs universal) |

---

## References

### Research Sources

- [Playwright Page Object Model](https://playwright.dev/docs/pom)
- [Self-Healing Test Automation - Functionize](https://www.functionize.com/automated-testing/self-healing-test-automation)
- [DRY and DAMP in Tests - arhohuttunen.com](https://www.arhohuttunen.com/dry-damp-tests/)
- [LLM Powered Autonomous Agents - Lilian Weng](https://lilianweng.github.io/posts/2023-06-23-agent/)
- [Agent Memory Systems - Letta](https://www.letta.com/blog/agent-memory)
- [Context Engineering - Weaviate](https://weaviate.io/blog/context-engineering)
- [Test Automation Design Patterns - MuukTest](https://muuktest.com/blog/test-design-pattern)
- [Lessons Learned Database - PMP Classes](https://pmp-classes.com/editorial/creating-a-lessons-learned-database-for-capturing-valuable-insights/)

### Frameworks Referenced

- **Reflexion**: Self-reflection framework for LLM agents
- **Page Object Model**: UI interaction encapsulation
- **DRY/DAMP**: Code reuse principles for tests

---

## Conclusion

The LLKB transforms ARTK from a stateless test generator into a **continuously learning system**. By:

1. **Recording lessons** from every verification cycle
2. **Extracting components** from repeated patterns
3. **Injecting knowledge** into future implementations
4. **Tracking effectiveness** and evolving confidence

We create a system that:
- Gets smarter with every journey implemented
- Ensures consistent, high-quality test code
- Reduces maintenance burden through reuse
- Builds institutional knowledge that survives team changes

This is the foundation for **autonomous test automation** - where the system learns the application's quirks, patterns, and best practices, and applies them automatically.
