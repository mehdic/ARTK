# AutoGen Critical Fixes & Feature Enhancement Plan

**Date:** 2026-01-04
**Topic:** Implementation plan for AutoGen bug fixes and feature enhancements

---

## Executive Summary

After testing the AutoGen CLI (`artk-autogen generate|validate|verify`), three critical bugs were identified and additional feature opportunities were discovered. This document provides a comprehensive implementation plan.

---

## Part 1: Critical Bug Fixes

### Bug 1: HTML Entity Escaping in Generated Code

**Severity:** P0 (Critical - breaks generated tests)

**Symptom:**
```typescript
// Generated code (broken)
await expect(page.locator('[data-testid=\&#39;welcome-message\&#39;]')).toBeVisible();

// Expected
await expect(page.locator('[data-testid=\'welcome-message\']')).toBeVisible();
```

**Root Cause:**
In `src/codegen/templates/test.ejs`, lines 53-60 use `<%= %>` EJS tags which HTML-escape output:

```ejs
// Line 53 - PROBLEM: <%= does HTML escaping
await expect(page).toHaveURL(/<%= escapeRegex(signal.value) %>/<%- timeoutOpt %>);
// Line 57 - PROBLEM: <%= does HTML escaping
await expect(page.locator('<%= escapeString(signal.value) %>')).toBeVisible(<%- timeoutOpt %>);
```

EJS tag behavior:
- `<%= value %>` - HTML-escapes output (converts `'` to `&#39;`)
- `<%- value %>` - Raw output (no escaping)

Since `escapeString()` already handles JavaScript string escaping, the EJS tags should be `<%- %>` (unescaped).

**Fix:**
```ejs
// Line 53 - Fixed
await expect(page).toHaveURL(/<%- escapeRegex(signal.value) %>/<%- timeoutOpt %>);
// Line 55
await expect(page.getByRole('alert').getByText('<%- escapeString(signal.value) %>')).toBeVisible(<%- timeoutOpt %>);
// Line 57
await expect(page.locator('<%- escapeString(signal.value) %>')).toBeVisible(<%- timeoutOpt %>);
// Line 59
await expect(page.getByText('<%- escapeString(signal.value) %>')).toBeVisible(<%- timeoutOpt %>);
```

**Also audit these lines for same issue:**
- Line 6: `@tags <%= journey.tags.join(', ') %>` → `<%- %>`
- Line 18: `<%- journey.title %>` (already correct)
- Line 19: `<%- journey.tags.map(...) %>` (already correct)
- Line 29: `<%= journey.id %>` and `<%= journey.title %>` → should be `<%-`
- Line 32: `<%= escapeString(step.description) %>` → `<%- escapeString(...) %>`

**Files to Modify:**
- `src/codegen/templates/test.ejs`

---

### Bug 2: Invalid Regex Syntax for URL Patterns

**Severity:** P0 (Critical - syntax error in generated code)

**Symptom:**
```typescript
// Generated code (broken - syntax error)
await expect(page).toHaveURL(//dashboard/);

// Expected
await expect(page).toHaveURL(/\/dashboard/);
```

**Root Cause:**
The `escapeRegex()` function in `src/codegen/generateTest.ts` (line 84-86) escapes special regex characters but NOT the forward slash `/` when it appears at the start of a URL path.

When the pattern `/dashboard` is inserted into a regex literal `/${pattern}/`, it becomes `//dashboard/` which JavaScript interprets as:
1. Empty regex `//`
2. Followed by identifier `dashboard/` (comment or error)

**Current escapeRegex:**
```typescript
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

**Fix - Option A (escape forward slashes):**
```typescript
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}
```

This adds `/` to the character class, so `/dashboard` becomes `\/dashboard`.

**Fix - Option B (special handling for leading slash):**
```typescript
function escapeRegex(str: string): string {
  let escaped = str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Escape forward slashes for regex literals
  escaped = escaped.replace(/\//g, '\\/');
  return escaped;
}
```

**Recommendation:** Option A is cleaner and handles all slashes consistently.

**Files to Modify:**
- `src/codegen/generateTest.ts` (line 84-86)

---

### Bug 3: Steps Not Parsed - Only Completion Signals

**Severity:** P1 (High - missing functionality)

**Symptom:**
Generated tests only contain completion signal assertions. The markdown steps from the Journey body are not converted to Playwright actions.

**Current Generated Test (partial):**
```typescript
test('JRN-0001: User Login', async ({ page }) => {
  // Verify completion signals
  await test.step('Verify completion', async () => {
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('[data-testid=\'welcome-message\']')).toBeVisible();
  });
});
```

**Expected (with steps parsed):**
```typescript
test('JRN-0001: User Login', async ({ page }) => {
  await test.step('Step 1: Navigate to login page', async () => {
    await page.goto('/login');
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
  });

  await test.step('Step 2: Enter credentials', async () => {
    await page.getByLabel('Username').fill(actor.username);
    await page.getByLabel('Password').fill(actor.password);
  });

  await test.step('Step 3: Submit form', async () => {
    await page.getByRole('button', { name: 'Login' }).click();
  });

  // Verify completion signals
  await test.step('Verify completion', async () => {
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('[data-testid=\'welcome-message\']')).toBeVisible();
  });
});
```

**Root Cause Analysis:**

The architecture has all the pieces but they're not connected:

1. **parseJourney.ts** - Parses Journey markdown into:
   - `acceptanceCriteria[]` - AC sections with bullet points
   - `proceduralSteps[]` - Numbered steps from "## Steps" section

2. **stepMapper.ts** - Has `mapAcceptanceCriterion()` and `mapProceduralStep()` functions

3. **patterns.ts** - Has patterns for common step text

4. **Missing Link:** No `journeyToIR.ts` that orchestrates:
   - `parseJourney()` → `ParsedJourney`
   - Loop through `proceduralSteps` → `mapProceduralStep()` → `IRStep[]`
   - Loop through `acceptanceCriteria` → `mapAcceptanceCriterion()` → `IRStep[]`
   - Build `IRJourney` with populated `steps[]`

**Current Flow:**
```
Journey.md → parseJourney() → ParsedJourney
                                ↓
                    generateTest() directly uses frontmatter
                    (steps[] is empty, only completion signals used)
```

**Required Flow:**
```
Journey.md → parseJourney() → ParsedJourney
                                ↓
             journeyToIR() → IRJourney (with mapped steps[])
                                ↓
                    generateTest() → Playwright code
```

---

## Part 2: Implementation Plan for Step Parsing

### Phase 1: Create journeyToIR Converter

**File:** `src/ir/journeyToIR.ts`

**Purpose:** Convert `ParsedJourney` to `IRJourney` by:
1. Mapping frontmatter to IR metadata
2. Parsing procedural steps into `IRStep[]`
3. Parsing acceptance criteria into assertions
4. Handling completion signals

**Implementation:**

```typescript
// src/ir/journeyToIR.ts
import type { IRJourney, IRStep, CompletionSignal, IRMappingResult } from './types.js';
import type { ParsedJourney, ProceduralStep } from '../journey/parseJourney.js';
import { mapProceduralStep, getMappingStats } from '../mapping/stepMapper.js';

export interface JourneyToIROptions {
  /** Include blocked steps as TODO comments */
  includeBlocked?: boolean;
  /** Normalize step text before matching */
  normalizeText?: boolean;
}

export function journeyToIR(
  parsed: ParsedJourney,
  options: JourneyToIROptions = {}
): IRMappingResult {
  const { includeBlocked = true, normalizeText = true } = options;

  const warnings: string[] = [];
  const blockedSteps: IRMappingResult['blockedSteps'] = [];
  const steps: IRStep[] = [];

  // Convert procedural steps to IR steps
  for (const ps of parsed.proceduralSteps) {
    const result = mapProceduralStep(ps, { includeBlocked, normalizeText });
    steps.push(result.step);

    // Track blocked steps
    for (const mapping of result.mappings) {
      if (!mapping.primitive) {
        blockedSteps.push({
          stepId: result.step.id,
          sourceText: mapping.sourceText,
          reason: mapping.message || 'Could not map step',
        });
      }
    }
  }

  // Map completion signals
  const completion: CompletionSignal[] = [];
  if (parsed.frontmatter.completion) {
    for (const signal of parsed.frontmatter.completion) {
      completion.push({
        type: signal.type as CompletionSignal['type'],
        value: signal.value,
        options: signal.options,
      });
    }
  }

  // Build IR Journey
  const journey: IRJourney = {
    id: parsed.frontmatter.id,
    title: parsed.frontmatter.title,
    tier: parsed.frontmatter.tier,
    scope: parsed.frontmatter.scope,
    actor: parsed.frontmatter.actor,
    tags: buildTags(parsed.frontmatter),
    moduleDependencies: {
      foundation: parsed.frontmatter.modules?.foundation || [],
      feature: parsed.frontmatter.modules?.features || [],
    },
    completion,
    steps,
    sourcePath: parsed.sourcePath,
  };

  // Calculate stats
  const allMappings = steps.flatMap(s =>
    [...s.actions, ...s.assertions].map(p => ({
      primitive: p.type !== 'blocked' ? p : null,
      sourceText: '',
      isAssertion: p.type.startsWith('expect'),
    }))
  );
  const stats = getMappingStats(allMappings);

  return {
    journey,
    blockedSteps,
    warnings,
    stats: {
      totalSteps: steps.length,
      mappedSteps: steps.filter(s => s.actions.length > 0 || s.assertions.length > 0).length,
      blockedSteps: blockedSteps.length,
      totalActions: stats.actions,
      totalAssertions: stats.assertions,
    },
  };
}

function buildTags(frontmatter: ParsedJourney['frontmatter']): string[] {
  return [
    '@artk',
    '@journey',
    `@${frontmatter.id}`,
    `@tier-${frontmatter.tier}`,
    `@scope-${frontmatter.scope}`,
    `@actor-${frontmatter.actor}`,
  ];
}
```

### Phase 2: Enhance Step Parsing Patterns

**Current Patterns in `patterns.ts`:**
- Navigation: `navigates to`, `goes to`, `opens`
- Clicks: `clicks 'X' button`, `presses`, `taps`
- Fill: `enters 'X' in 'Y' field`, `types`, `fills`
- Select: `selects 'X' from 'Y'`
- Check: `checks 'X' checkbox`, `unchecks`
- Visibility: `should see 'X'`, `is visible`
- Toast: `success toast appears`
- URL: `url contains`, `redirected to`
- Auth: `user logs in`, `user logs out`
- Wait: `waits for navigation`

**Additional Patterns Needed:**

```typescript
// New patterns for structured step format
// Format: ### Step N: Title
//         - **Action**: action text
//         - **Wait for**: wait condition
//         - **Assert**: assertion text

export const structuredStepPatterns: StepPattern[] = [
  // Action: Go to /path
  {
    name: 'action-goto',
    regex: /^\*\*Action\*\*:\s*(?:Go to|Navigate to)\s+`?([^`]+)`?$/i,
    primitiveType: 'goto',
    extract: (match) => ({
      type: 'goto',
      url: match[1].trim(),
      waitForLoad: true,
    }),
  },

  // Action: Click selector
  {
    name: 'action-click-selector',
    regex: /^\*\*Action\*\*:\s*Click\s+`([^`]+)`$/i,
    primitiveType: 'click',
    extract: (match) => ({
      type: 'click',
      locator: parseSelector(match[1]),
    }),
  },

  // Wait for: selector to be visible
  {
    name: 'wait-for-visible',
    regex: /^\*\*Wait for\*\*:\s*`([^`]+)`\s+to\s+be\s+visible$/i,
    primitiveType: 'expectVisible',
    extract: (match) => ({
      type: 'expectVisible',
      locator: parseSelector(match[1]),
    }),
  },

  // Assert: selector count is N
  {
    name: 'assert-count',
    regex: /^\*\*Assert\*\*:\s*`([^`]+)`\s+count\s+is\s+(\d+)$/i,
    primitiveType: 'expectCount',
    extract: (match) => ({
      type: 'expectCount',
      locator: parseSelector(match[1]),
      count: parseInt(match[2], 10),
    }),
  },

  // Assert: selector contains text "X"
  {
    name: 'assert-contains-text',
    regex: /^\*\*Assert\*\*:\s*`([^`]+)`\s+contains\s+text\s+["']([^"']+)["']$/i,
    primitiveType: 'expectContainsText',
    extract: (match) => ({
      type: 'expectContainsText',
      locator: parseSelector(match[1]),
      text: match[2],
    }),
  },

  // Assert: URL matches /path
  {
    name: 'assert-url-matches',
    regex: /^\*\*Assert\*\*:\s*URL\s+matches\s+`([^`]+)`$/i,
    primitiveType: 'expectURL',
    extract: (match) => ({
      type: 'expectURL',
      pattern: match[1],
    }),
  },
];

// Helper to parse CSS/testid selectors
function parseSelector(selector: string): LocatorSpec {
  // data-testid selector
  if (selector.includes('data-testid=')) {
    const match = selector.match(/data-testid=['"]?([^'"]+)['"]?/);
    return { strategy: 'testid', value: match?.[1] || selector };
  }
  // CSS selector
  return { strategy: 'css', value: selector };
}
```

### Phase 3: Update parseJourney to Handle Structured Steps

**Enhance `parseProceduralSteps()` in `parseJourney.ts`:**

```typescript
interface StructuredStep {
  number: number;
  title: string;
  action?: string;
  waitFor?: string;
  assertions: string[];
}

function parseStructuredSteps(body: string): StructuredStep[] {
  const steps: StructuredStep[] = [];

  // Find ## Steps section
  const stepsSection = body.match(/##\s*Steps?\s*\n([\s\S]*?)(?=\n##\s[^#]|$)/i)?.[1];
  if (!stepsSection) return steps;

  // Split by ### Step N headers
  const stepHeaders = stepsSection.split(/\n###\s+Step\s+(\d+):\s*/i);

  for (let i = 1; i < stepHeaders.length; i += 2) {
    const number = parseInt(stepHeaders[i], 10);
    const content = stepHeaders[i + 1] || '';

    // Parse title (first line)
    const lines = content.split('\n');
    const title = lines[0]?.trim() || `Step ${number}`;

    // Parse action
    const actionMatch = content.match(/\*\*Action\*\*:\s*(.+)/i);
    const action = actionMatch?.[1]?.trim();

    // Parse wait for
    const waitMatch = content.match(/\*\*Wait for\*\*:\s*(.+)/i);
    const waitFor = waitMatch?.[1]?.trim();

    // Parse assertions
    const assertions: string[] = [];
    const assertMatches = content.matchAll(/\*\*Assert\*\*:\s*(.+)/gi);
    for (const match of assertMatches) {
      assertions.push(match[1].trim());
    }

    steps.push({ number, title, action, waitFor, assertions });
  }

  return steps;
}
```

### Phase 4: Integration

**Update CLI command to use full pipeline:**

```typescript
// In generate.ts CLI command
async function generateFromJourney(journeyPath: string): Promise<void> {
  // 1. Parse journey markdown
  const parsed = parseJourneyForAutoGen(journeyPath);

  // 2. Convert to IR (NEW STEP)
  const { journey: irJourney, blockedSteps, warnings, stats } = journeyToIR(parsed);

  // 3. Generate test code
  const result = generateTest(irJourney, {
    updateJourney: true,
    journeyPath,
    outputPath: outputPath,
  });

  // 4. Report stats
  console.log(`Mapped ${stats.mappedSteps}/${stats.totalSteps} steps`);
  console.log(`Actions: ${stats.totalActions}, Assertions: ${stats.totalAssertions}`);

  if (blockedSteps.length > 0) {
    console.warn(`Warning: ${blockedSteps.length} steps could not be mapped`);
    for (const blocked of blockedSteps) {
      console.warn(`  - ${blocked.stepId}: ${blocked.reason}`);
    }
  }

  // 5. Write output
  await writeFile(outputPath, result.code);
}
```

---

## Part 3: Additional Feature Opportunities

Based on research into similar tools (Cucumber, Gherkin, CodeceptJS, TestCafe, Karate DSL), here are additional features to consider:

### Feature 1: Machine Hints in Steps (Already Designed)

The system already has `parseHints.ts` with support for:
- `@testid(login-button)` - Explicit test ID
- `@role(button, Login)` - ARIA role + name
- `@label(Username)` - Form label
- `@text(Submit)` - Visible text
- `@module(auth.login)` - Module call
- `@timeout(5000)` - Custom timeout

**Example Usage:**
```markdown
### Step 1: Login
- Click the login button @testid(login-btn)
- Enter username @label(Username) @timeout(3000)
```

### Feature 2: Data-Driven Tests (Parameterized)

**Concept:** Run same journey with different data sets.

**Journey Frontmatter Extension:**
```yaml
data:
  strategy: parameterized
  sets:
    - name: valid_user
      username: testuser@example.com
      password: SecurePass123
    - name: admin_user
      username: admin@example.com
      password: AdminPass456
```

**Generated Test:**
```typescript
const testData = [
  { name: 'valid_user', username: 'testuser@example.com', password: 'SecurePass123' },
  { name: 'admin_user', username: 'admin@example.com', password: 'AdminPass456' },
];

for (const data of testData) {
  test(`JRN-0001: User Login (${data.name})`, async ({ page }) => {
    await page.getByLabel('Username').fill(data.username);
    await page.getByLabel('Password').fill(data.password);
    // ...
  });
}
```

### Feature 3: Negative/Error Path Journeys

**Concept:** Test error handling scenarios.

**Journey Frontmatter Extension:**
```yaml
type: negative  # or 'error-path', 'boundary'
expectedOutcome: error
errorMessage: "Invalid credentials"
```

**Generated Test:**
```typescript
test('JRN-0005: Login with Invalid Password (negative)', async ({ page }) => {
  // ... actions ...

  // Verify error outcome
  await expect(page.getByRole('alert')).toContainText('Invalid credentials');
  await expect(page).not.toHaveURL(/dashboard/);
});
```

### Feature 4: Prerequisite Journeys (Dependencies)

**Concept:** Chain journeys that depend on each other.

**Journey Frontmatter Extension:**
```yaml
prerequisites:
  - JRN-0001  # Must complete login first
```

**Generated Test:**
```typescript
test.describe('Add to Cart', () => {
  test.beforeEach(async ({ page }) => {
    // Run prerequisite journey
    await auth.loginAsUser(page);
  });

  test('JRN-0003: Add Item to Cart', async ({ page }) => {
    // ...
  });
});
```

### Feature 5: Visual Regression Integration

**Concept:** Add screenshot comparison points.

**Journey Step Extension:**
```markdown
### Step 4: Verify dashboard layout
- **Screenshot**: dashboard-loaded @fullPage @threshold(0.1)
```

**Generated Test:**
```typescript
await test.step('Step 4: Verify dashboard layout', async () => {
  await expect(page).toHaveScreenshot('dashboard-loaded.png', {
    fullPage: true,
    threshold: 0.1,
  });
});
```

### Feature 6: API Mocking Declarations

**Concept:** Declare API mocks needed for journey.

**Journey Frontmatter Extension:**
```yaml
mocks:
  - endpoint: /api/user/profile
    method: GET
    response:
      status: 200
      body: { name: "Test User", role: "admin" }
```

**Generated Test:**
```typescript
test.beforeEach(async ({ page }) => {
  await page.route('/api/user/profile', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ name: "Test User", role: "admin" }),
    });
  });
});
```

### Feature 7: Accessibility Checks

**Concept:** Auto-inject a11y checks at key points.

**Config Extension:**
```yaml
accessibility:
  enabled: true
  checkOn: ['navigation', 'formSubmit']
  rules: ['wcag2a', 'wcag2aa']
```

**Generated Test:**
```typescript
import AxeBuilder from '@axe-core/playwright';

await test.step('Accessibility check', async () => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});
```

### Feature 8: Performance Budgets

**Concept:** Assert on timing metrics.

**Journey Frontmatter Extension:**
```yaml
performance:
  budgets:
    - metric: LCP
      threshold: 2500
    - metric: FID
      threshold: 100
```

**Generated Test:**
```typescript
await test.step('Performance check', async () => {
  const metrics = await page.evaluate(() => ({
    lcp: performance.getEntriesByType('largest-contentful-paint')[0]?.startTime,
    fid: performance.getEntriesByType('first-input')[0]?.processingStart,
  }));
  expect(metrics.lcp).toBeLessThan(2500);
});
```

---

## Part 4: Implementation Priority

### Immediate (P0) - Must Fix Before Release

1. **Bug 1: HTML Entity Escaping** - 30 min
   - Change `<%= %>` to `<%- %>` in test.ejs
   - Add tests for escaping scenarios

2. **Bug 2: Regex Syntax** - 15 min
   - Add `/` to escapeRegex character class
   - Add tests for URL patterns

### Short Term (P1) - Next Sprint

3. **Bug 3: Step Parsing** - 2-3 days
   - Create `journeyToIR.ts`
   - Enhance patterns for structured steps
   - Update CLI to use full pipeline
   - Add tests for step mapping

### Medium Term (P2) - Future Sprints

4. **Feature: Data-Driven Tests** - 1-2 days
5. **Feature: Prerequisites** - 1 day
6. **Feature: Negative Paths** - 1 day

### Long Term (P3) - Backlog

7. **Feature: Visual Regression** - 2 days
8. **Feature: API Mocking** - 2 days
9. **Feature: Accessibility** - 1-2 days
10. **Feature: Performance** - 1 day

---

## Part 5: Test Plan

### Unit Tests for Bug Fixes

```typescript
// test/codegen/escaping.test.ts
describe('escapeRegex', () => {
  it('escapes forward slashes', () => {
    expect(escapeRegex('/dashboard')).toBe('\\/dashboard');
    expect(escapeRegex('/user/profile')).toBe('\\/user\\/profile');
  });

  it('escapes regex special characters', () => {
    expect(escapeRegex('test.html')).toBe('test\\.html');
    expect(escapeRegex('[test]')).toBe('\\[test\\]');
  });
});

describe('escapeString', () => {
  it('escapes single quotes', () => {
    expect(escapeString("it's")).toBe("it\\'s");
  });

  it('escapes backslashes', () => {
    expect(escapeString('path\\to')).toBe('path\\\\to');
  });
});
```

### Integration Tests for Step Parsing

```typescript
// test/ir/journeyToIR.test.ts
describe('journeyToIR', () => {
  it('maps procedural steps to IR steps', () => {
    const parsed = parseJourneyContent(`---
id: JRN-TEST
title: Test Journey
status: clarified
tier: smoke
actor: user
scope: test
completion:
  - type: url
    value: /success
---
## Steps
### Step 1: Navigate
- **Action**: Go to /login
### Step 2: Fill form
- **Action**: Enter 'user@test.com' in 'Email'
`);

    const { journey, stats } = journeyToIR(parsed);

    expect(journey.steps).toHaveLength(2);
    expect(journey.steps[0].actions[0]).toMatchObject({
      type: 'goto',
      url: '/login',
    });
    expect(stats.mappedSteps).toBe(2);
  });
});
```

---

## Appendix: File Locations

| File | Purpose |
|------|---------|
| `src/codegen/templates/test.ejs` | EJS template for test generation |
| `src/codegen/generateTest.ts` | Test generator with escapeRegex/escapeString |
| `src/mapping/patterns.ts` | Step text → IR primitive patterns |
| `src/mapping/stepMapper.ts` | Step mapping orchestration |
| `src/journey/parseJourney.ts` | Markdown → ParsedJourney |
| `src/journey/parseHints.ts` | Machine hint extraction (@testid, @role) |
| `src/ir/types.ts` | IR type definitions |
| `src/ir/journeyToIR.ts` | **NEW** - ParsedJourney → IRJourney |
| `src/selectors/priority.ts` | Locator → Playwright code |

---

## References

- [Playwright Test Locators](https://playwright.dev/docs/locators)
- [Playwright Assertions](https://playwright.dev/docs/test-assertions)
- [EJS Documentation](https://ejs.co/#docs)
- [Cucumber/Gherkin](https://cucumber.io/docs/gherkin/)
- [CodeceptJS](https://codecept.io/)
- [Karate DSL](https://github.com/karatelabs/karate)
