# Reusable Test Components: Extraction and Reuse Strategy

**Date:** 2026-01-16
**Topic:** How to automatically detect, extract, and reuse common test patterns across journeys

---

## Problem Statement

Looking at the JRN-0002 test file, Step 3 ("Verify sidebar navigation presence") contains inline code that:
1. Locates sidebar menu items using `[data-testid^="sidebar-item-"]`
2. Verifies the sidebar has >3 items
3. Confirms the sidebar-nav container exists

**This exact pattern will be needed in 80%+ of all tests** because most journeys need to verify navigation is working before proceeding.

### Current State (Bad)

```typescript
// JRN-0002 - inline code
await test.step('Step 3: Verify sidebar navigation presence', async () => {
  const menuItems = page.locator('[data-testid^="sidebar-item-"]');
  await expect(menuItems.first()).toBeVisible({ timeout: 10000 });
  const count = await menuItems.count();
  expect(count).toBeGreaterThan(3);
  const sidebar = page.getByTestId('sidebar-nav');
  await expect(sidebar).toBeAttached();
});

// JRN-0003 - same code duplicated
await test.step('Step 2: Verify navigation is ready', async () => {
  const menuItems = page.locator('[data-testid^="sidebar-item-"]');
  await expect(menuItems.first()).toBeVisible({ timeout: 10000 });
  // ... same code again
});
```

### Desired State (Good)

```typescript
// JRN-0002 - uses shared module
import { verifySidebarReady, navigateTo } from '@modules/foundation/navigation';

await test.step('Step 3: Verify sidebar navigation presence', async () => {
  await verifySidebarReady(page);
});

// JRN-0003 - reuses same module
await test.step('Step 2: Verify navigation is ready', async () => {
  await verifySidebarReady(page);
});
```

---

## Research Findings

### Industry Best Practices

#### 1. Page Object Model (POM) with Shared Components

From [Playwright POM Guide](https://playwright.dev/docs/pom) and [BrowserStack](https://www.browserstack.com/guide/page-object-model-with-playwright):

- **Keep actions and assertions separate**: Page objects handle UI interactions, tests handle assertions
- **Design for reusability**: Create modular, self-contained page objects as building blocks
- **Use base page classes**: Common functionality in base class, extend for specific pages

#### 2. DRY vs DAMP Principle

From [arhohuttunen.com](https://www.arhohuttunen.com/dry-damp-tests/) and [Enterprise Craftsmanship](https://enterprisecraftsmanship.com/posts/dry-damp-unit-tests/):

- **DRY (Don't Repeat Yourself)**: Extract the "how-to" details into reusable functions
- **DAMP (Descriptive And Meaningful Phrases)**: Keep the "what" expressive in tests
- **Balance**: Tests should read clearly while implementation details are reused

> "We want to be expressive about the 'what' and remove duplication around the 'how.'"

#### 3. Layered Test Architecture

From [MuukTest Design Patterns](https://muuktest.com/blog/test-design-pattern):

```
┌─────────────────────────────────┐
│  Test Layer (Journeys/Specs)    │  ← What we're testing
├─────────────────────────────────┤
│  Flow Layer (User Flows)        │  ← Multi-step interactions
├─────────────────────────────────┤
│  Component Layer (POM/Modules)  │  ← Reusable UI interactions
├─────────────────────────────────┤
│  Utility Layer (Helpers)        │  ← Low-level utilities
└─────────────────────────────────┘
```

---

## What ARTK Already Has

### Existing Module Structure

```
artk-e2e/
├── src/modules/
│   ├── foundation/           # Created by discover-foundation
│   │   ├── auth/
│   │   │   └── login.ts     # Auth helpers
│   │   ├── navigation/
│   │   │   └── nav.ts       # Navigation helpers (skeleton)
│   │   ├── selectors/
│   │   │   └── locators.ts  # Selector utilities
│   │   └── data/
│   │       └── run-id.ts    # Data isolation
│   └── feature/              # Created as needed
│       └── <scope>/          # Feature-specific modules
├── modules/
│   └── registry.json         # Module catalog
```

### What's Missing

1. **Navigation module is a skeleton** - only has placeholders, not real implementations
2. **No pattern detection** - journey-implement doesn't check for reusable patterns
3. **No extraction step** - common code isn't automatically extracted
4. **No pattern library** - no catalog of verified, reusable test patterns
5. **Module registry lacks method-level detail** - only tracks modules, not individual functions

---

## Proposed Solution: Three-Layer Approach

### Layer 1: Pattern Library (New - Lives in LLKB)

Add a new category to LLKB: `patterns/components.json`

```json
{
  "version": "1.0.0",
  "components": [
    {
      "id": "COMP001",
      "name": "verifySidebarReady",
      "category": "navigation",
      "description": "Verify sidebar navigation is loaded and interactive",
      "module": "@modules/foundation/navigation",
      "signature": "verifySidebarReady(page: Page, options?: { timeout?: number }): Promise<void>",
      "implementation": {
        "selectors": ["[data-testid^='sidebar-item-']", "[data-testid='sidebar-nav']"],
        "assertions": ["visibility", "count > 3", "attached"]
      },
      "usageContext": [
        "After login, before any navigation",
        "After page refresh",
        "At start of any journey requiring navigation"
      ],
      "usedInJourneys": ["JRN-0002", "JRN-0003", "JRN-0005"],
      "confidence": 0.95,
      "createdFrom": "JRN-0002",
      "lastUpdated": "2026-01-16"
    }
  ],
  "componentsByScope": {
    "foundation": ["COMP001", "COMP002", "COMP003"],
    "catalog": ["COMP010", "COMP011"],
    "orders": ["COMP020"]
  }
}
```

### Layer 2: Enhanced Module Registry

Extend `modules/registry.json` to track individual methods:

```json
{
  "modules": [
    {
      "name": "navigation",
      "path": "foundation/navigation",
      "exports": [
        {
          "name": "verifySidebarReady",
          "type": "async function",
          "componentId": "COMP001",
          "description": "Verify sidebar is loaded and interactive"
        },
        {
          "name": "navigateTo",
          "type": "async function",
          "componentId": "COMP002",
          "description": "Navigate to a route via sidebar"
        },
        {
          "name": "getCurrentRoute",
          "type": "function",
          "description": "Get current route from URL"
        }
      ]
    }
  ],
  "journeyDependencies": {
    "JRN-0001": { "foundation": ["auth"], "feature": [] },
    "JRN-0002": { "foundation": ["navigation"], "feature": [] },
    "JRN-0003": { "foundation": ["navigation", "auth"], "feature": ["catalog"] }
  }
}
```

### Layer 3: Component Extraction Workflow

#### Step A: Detection (During journey-implement)

Before writing test code, scan for reusable patterns:

```markdown
## Step 9.8 — Check for Reusable Components (NEW)

Before writing test steps, check if similar patterns exist:

1. **Load Pattern Library**: Read `.artk/llkb/patterns/components.json`
2. **Match Journey Steps**: For each step in the Journey, check if a component exists
3. **Suggest Reuse**: If match found, use existing component
4. **Flag Extraction Candidates**: If similar pattern but no component, mark for extraction

**Pattern Matching Algorithm:**
\`\`\`
For each Journey step:
  1. Extract keywords (sidebar, verify, navigate, login, etc.)
  2. Match against component usageContext and description
  3. If confidence > 0.7, suggest using the component
  4. If 0.4 < confidence < 0.7, show as "possible match"
\`\`\`
```

#### Step B: Extraction (Post-Implementation)

After verify passes, extract common patterns:

```markdown
## Step 17 — Extract Reusable Components (NEW in journey-verify)

After tests pass verification, analyze for extraction opportunities:

1. **Scan Test Code**: Look for patterns that appear in 2+ journeys
2. **Identify Candidates**: Steps with similar selectors + assertions
3. **Generate Module Code**: Create function in appropriate module
4. **Update Tests**: Replace inline code with module import
5. **Register Component**: Add to pattern library and module registry

**Extraction Criteria:**
- Pattern appears in 2+ journeys
- Pattern has clear, single responsibility
- Pattern is app-specific (not generic Playwright)
- Pattern has stable selectors (testid or role-based)
```

#### Step C: Learning Loop (LLKB Integration)

```markdown
## LLKB Learning: Component Patterns

When a component is extracted:
1. Add to patterns/components.json
2. Track which journeys use it
3. Track success rate (did tests pass after using component?)
4. Update confidence based on usage

When implementing new journeys:
1. Check components.json for matching patterns
2. Inject relevant components into context
3. Suggest imports in generated code
```

---

## Implementation Plan

### Phase 1: Foundation Module Enhancement (Immediate)

**Goal:** Make navigation module actually useful

```typescript
// src/modules/foundation/navigation/nav.ts

import { Page, expect } from '@playwright/test';

/**
 * Verify sidebar navigation is loaded and interactive
 * @pattern COMP001
 */
export async function verifySidebarReady(
  page: Page,
  options: { timeout?: number } = {}
): Promise<void> {
  const timeout = options.timeout ?? 10000;

  // Wait for menu items to be visible
  const menuItems = page.locator('[data-testid^="sidebar-item-"]');
  await expect(menuItems.first()).toBeVisible({ timeout });

  // Verify minimum expected items
  const count = await menuItems.count();
  expect(count).toBeGreaterThan(3);

  // Verify sidebar container is attached
  const sidebar = page.getByTestId('sidebar-nav');
  await expect(sidebar).toBeAttached();
}

/**
 * Navigate to a route via sidebar
 * @pattern COMP002
 */
export async function navigateTo(
  page: Page,
  route: 'home' | 'catalog' | 'request' | 'learn' | 'admin'
): Promise<void> {
  await page.getByTestId(`sidebar-item-${route}`).click();
  await page.waitForLoadState('domcontentloaded');
}

/**
 * Verify a specific menu item exists and is clickable
 * @pattern COMP003
 */
export async function verifyMenuItemExists(
  page: Page,
  itemId: string
): Promise<void> {
  await expect(page.getByTestId(`sidebar-item-${itemId}`)).toBeVisible();
}
```

### Phase 2: Pattern Library Schema (Week 1)

Add to LLKB structure:

```
.artk/llkb/
├── patterns/
│   ├── components.json    # NEW: Reusable test components
│   ├── selectors.json
│   ├── timing.json
│   └── ...
```

### Phase 3: Detection in journey-implement (Week 2)

Add Step 9.8 to journey-implement.md:

```markdown
## Step 9.8 — Check for Reusable Components

Before writing test steps:

1. Load pattern library from `.artk/llkb/patterns/components.json`
2. For each Journey step, find matching components
3. If match found with confidence > 0.7:
   - Import the component module
   - Use the component function instead of inline code
4. If no match but step looks common (navigation, auth, etc.):
   - Write inline code
   - Flag as "extraction candidate" in report
```

### Phase 4: Extraction in journey-verify (Week 3)

Add Step 17 to journey-verify.md:

```markdown
## Step 17 — Identify Extraction Opportunities

After verification passes:

1. Compare test code against existing tests
2. Identify duplicate patterns (same selectors + assertions)
3. If duplicate found:
   - Suggest extraction to module
   - Show diff of what would change
   - Require user approval before extracting
4. Update LLKB with new component entry
```

### Phase 5: AutoGen Integration (Week 4)

Enhance AutoGen to:
1. Read components.json when generating tests
2. Prefer component imports over inline code
3. Generate component suggestions when patterns detected

---

## Comparison: Where Should Reusable Code Live?

| Location | Purpose | Scope | Example |
|----------|---------|-------|---------|
| **LLKB/patterns/components.json** | Catalog of what exists | Metadata only | "verifySidebarReady exists in navigation module" |
| **modules/foundation/** | Actual reusable code | App-wide patterns | Login, navigation, common assertions |
| **modules/feature/** | Feature-specific reuse | Domain-specific | Order flow helpers, catalog search |
| **Test file inline** | Journey-specific logic | Single test | Unique assertions, custom flows |

---

## Decision Matrix: When to Extract

| Criteria | Inline | Foundation Module | Feature Module |
|----------|--------|-------------------|----------------|
| Used in 1 journey | ✅ | ❌ | ❌ |
| Used in 2-3 journeys same scope | ⚠️ | ❌ | ✅ |
| Used in 3+ journeys any scope | ❌ | ✅ | ❌ |
| App-wide utility (auth, nav) | ❌ | ✅ | ❌ |
| Complex but unique | ✅ | ❌ | ❌ |

---

## Example: Refactoring JRN-0002

### Before (Current)

```typescript
await test.step('Step 3: Verify sidebar navigation presence', async () => {
  const menuItems = page.locator('[data-testid^="sidebar-item-"]');
  await expect(menuItems.first()).toBeVisible({ timeout: 10000 });
  const count = await menuItems.count();
  expect(count).toBeGreaterThan(3);
  const sidebar = page.getByTestId('sidebar-nav');
  await expect(sidebar).toBeAttached();
});

await test.step('Step 5: Navigate to Catalog via sidebar', async () => {
  await page.getByTestId('sidebar-item-catalog').click();
  await page.waitForLoadState('domcontentloaded');
  await expect(page).toHaveURL(/\/catalog/);
  // ...
});
```

### After (With Modules)

```typescript
import { verifySidebarReady, navigateTo } from '@modules/foundation/navigation';

await test.step('Step 3: Verify sidebar navigation presence', async () => {
  await verifySidebarReady(page);
});

await test.step('Step 5: Navigate to Catalog via sidebar', async () => {
  await navigateTo(page, 'catalog');
  await expect(page).toHaveURL(/\/catalog/);
  // Catalog-specific assertions remain inline
});
```

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Over-extraction (too DRY) | Require 3+ usages before extraction |
| Stale components | Track usage, flag unused for 30+ days |
| Breaking changes | Version components, run regression on changes |
| Complex APIs | Keep component signatures simple, max 2 params |
| Discovery lag | Scan all journeys weekly for extraction opportunities |

---

## Success Metrics

1. **Code reduction**: 30%+ less duplicated assertion code
2. **Implementation speed**: 20%+ faster journey implementation (reuse vs write)
3. **Maintenance cost**: 50%+ fewer files to update for selector changes
4. **Consistency**: 100% of navigation tests use same component

---

## Recommendation

**Implement in this order:**

1. **Immediate**: Populate `modules/foundation/navigation/nav.ts` with real implementations extracted from JRN-0002
2. **Week 1**: Add `patterns/components.json` to LLKB schema
3. **Week 2**: Add Step 9.8 (component check) to journey-implement
4. **Week 3**: Add Step 17 (extraction) to journey-verify
5. **Week 4**: Integrate with AutoGen

**Key insight**: The infrastructure for modules already exists in ARTK. The gap is:
1. Modules are skeletons, not real implementations
2. No detection/matching of reusable patterns
3. No extraction workflow

This proposal fills those gaps while leveraging existing architecture.

---

## References

- [Playwright Page Object Model](https://playwright.dev/docs/pom)
- [DRY and DAMP in Tests - arhohuttunen.com](https://www.arhohuttunen.com/dry-damp-tests/)
- [Test Automation Design Patterns - MuukTest](https://muuktest.com/blog/test-design-pattern)
- [Page Object Model Guide - Skyvern](https://www.skyvern.com/blog/page-object-model-guide/)
