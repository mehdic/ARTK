# AutoGen Critical Fixes & Feature Enhancement Plan

**Date:** 2026-01-04
**Topic:** Implementation plan for AutoGen bug fixes and feature enhancements
**Status:** REVISED after deep analysis (v2)

---

## Executive Summary

After testing the AutoGen CLI (`artk-autogen generate|validate|verify`), three critical bugs were identified. Deep analysis of the codebase revealed that the architecture is more complete than initially thought, but has specific integration gaps.

**Key Finding:** The step parsing infrastructure EXISTS (`normalize.ts`, `stepMapper.ts`, `patterns.ts`) but:
1. The main flow uses `normalize.ts`'s inline parser, NOT the sophisticated `patterns.ts`
2. The structured step format (`**Action**:`, `**Wait for**:`) is not supported
3. Two separate `escapeRegex()` functions exist - BOTH have the same bug!

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

**Fix - Complete audit of test.ejs:**

| Line | Current | Fix | Reason |
|------|---------|-----|--------|
| 2-9 | `<%= %>` | Keep | JSDoc comments - OK |
| 14 | `<%= imp.members %>` | `<%- %>` | Could contain special chars |
| 29 | `<%= journey.id %>` | Keep | IDs are safe alphanumeric |
| 32 | `<%= escapeString(...) %>` | `<%- escapeString(...) %>` | Double-escaping bug |
| 35-36 | `<%= action.reason %>` | `<%- %>` | Could contain quotes |
| 53 | `<%= escapeRegex(...) %>` | `<%- escapeRegex(...) %>` | **Critical** |
| 55 | `<%= escapeString(...) %>` | `<%- escapeString(...) %>` | **Critical** |
| 57 | `<%= escapeString(...) %>` | `<%- escapeString(...) %>` | **Critical** |
| 59 | `<%= escapeString(...) %>` | `<%- escapeString(...) %>` | **Critical** |

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
**TWO separate `escapeRegex()` functions exist with the SAME bug:**

1. `src/codegen/generateTest.ts` (line 84-86):
```typescript
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

2. `src/journey/normalize.ts` (line 552-554):
```typescript
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

Neither escapes `/` (forward slash), causing `/dashboard` to become `//dashboard/` in regex literals.

**Fix - BOTH files need update:**
```typescript
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}
```

**Recommendation:** Create a shared utility to avoid duplication:
```typescript
// src/utils/escaping.ts
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

export function escapeString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}
```

**Files to Modify:**
- `src/codegen/generateTest.ts` (line 84-86)
- `src/journey/normalize.ts` (line 552-554)
- Consider creating `src/utils/escaping.ts` to DRY up

---

### Bug 3: Steps Not Parsed - Structured Format Unsupported

**Severity:** P1 (High - missing functionality)

**REVISED Analysis:** The step parsing infrastructure EXISTS but has gaps.

**Current Architecture:**
```
Journey.md
    ↓
parseJourney() → ParsedJourney
    ↓                  ├── acceptanceCriteria[]
    │                  └── proceduralSteps[]
    ↓
normalizeJourney() → IRJourney
    │     ↓
    │  parseStepText() [inline in normalize.ts - BASIC patterns only]
    │
    ├── stepMapper.ts [NOT USED - has mapStepText(), mapProceduralStep()]
    └── patterns.ts [NOT USED - has 50+ sophisticated patterns]
```

**The Problem:**
1. `normalize.ts:parseStepText()` is a basic inline parser (lines 231-380)
2. The sophisticated `patterns.ts` with 50+ patterns is NOT connected
3. The `stepMapper.ts` with `mapStepText()` is NOT used in the main flow
4. **Structured step format is NOT supported anywhere:**
   ```markdown
   ### Step 1: Title
   - **Action**: Go to `/login`
   - **Wait for**: `[data-testid="form"]` to be visible
   - **Assert**: URL matches `/login`
   ```

**Three Distinct Issues:**

**Issue 3a: Disconnect between parsers**
- `normalize.ts` uses its own inline `parseStepText()`
- `stepMapper.ts` has `mapStepText()` that uses `patterns.ts`
- They're not connected!

**Issue 3b: parseProceduralSteps() doesn't parse structured format**
- Only handles: `1. Step text` or `- Step text`
- Doesn't parse: `### Step N: Title` with `**Action**:` bullets

**Issue 3c: No patterns for structured step format**
- Neither parser handles `**Action**:`, `**Wait for**:`, `**Assert**:`

---

## Part 2: REVISED Implementation Plan for Step Parsing

### Architectural Decision: Connect vs Rewrite

**Option A: Connect existing infrastructure (RECOMMENDED)**
- Use `patterns.ts` patterns via `stepMapper.ts:mapStepText()` in `normalize.ts`
- Add structured step patterns to `patterns.ts`
- Minimal changes, leverages existing 50+ patterns

**Option B: Rewrite normalize.ts**
- Replace inline `parseStepText()` entirely
- Higher risk, more work

**Recommendation: Option A** - Connect the existing sophisticated infrastructure.

---

### Phase 1: Connect stepMapper to normalize.ts

**File:** `src/journey/normalize.ts`

**Change:** Replace inline `parseStepText()` with call to `stepMapper.ts:mapStepText()`

```typescript
// BEFORE (normalize.ts:151-167)
for (const stepText of ac.steps) {
  const primitive = parseStepText(stepText, warnings);  // inline parser
  // ...
}

// AFTER
import { mapStepText } from '../mapping/stepMapper.js';

for (const stepText of ac.steps) {
  const result = mapStepText(stepText, { normalizeText: true });
  if (result.primitive) {
    if (result.isAssertion) {
      assertions.push(result.primitive);
    } else {
      actions.push(result.primitive);
    }
  } else {
    actions.push({
      type: 'blocked',
      reason: result.message || 'Could not parse step',
      sourceText: stepText,
    });
  }
}
```

**Benefit:** Immediately gains access to 50+ patterns in `patterns.ts`.

---

### Phase 2: Add Structured Step Patterns to patterns.ts

**File:** `src/mapping/patterns.ts`

**Add these patterns for structured step format:**

```typescript
/**
 * Structured step patterns for markdown format:
 * - **Action**: action text
 * - **Wait for**: wait condition
 * - **Assert**: assertion text
 */
export const structuredPatterns: StepPattern[] = [
  // **Action**: Go to /path
  {
    name: 'structured-action-goto',
    regex: /^-?\s*\*\*Action\*\*:\s*(?:Go to|Navigate to)\s+`?([^`\s]+)`?$/i,
    primitiveType: 'goto',
    extract: (match) => ({
      type: 'goto',
      url: match[1].trim(),
      waitForLoad: true,
    }),
  },

  // **Action**: Click `selector`
  {
    name: 'structured-action-click',
    regex: /^-?\s*\*\*Action\*\*:\s*Click\s+`([^`]+)`$/i,
    primitiveType: 'click',
    extract: (match) => ({
      type: 'click',
      locator: parseSelectorToLocator(match[1]),
    }),
  },

  // **Wait for**: `selector` to be visible
  {
    name: 'structured-wait-visible',
    regex: /^-?\s*\*\*Wait for\*\*:\s*`([^`]+)`\s+to\s+be\s+visible$/i,
    primitiveType: 'expectVisible',
    extract: (match) => ({
      type: 'expectVisible',
      locator: parseSelectorToLocator(match[1]),
    }),
  },

  // **Wait for**: Navigation to complete
  {
    name: 'structured-wait-nav',
    regex: /^-?\s*\*\*Wait for\*\*:\s*Navigation\s+to\s+complete$/i,
    primitiveType: 'waitForLoadingComplete',
    extract: () => ({
      type: 'waitForLoadingComplete',
    }),
  },

  // **Assert**: `selector` is visible
  {
    name: 'structured-assert-visible',
    regex: /^-?\s*\*\*Assert\*\*:\s*`([^`]+)`\s+is\s+visible$/i,
    primitiveType: 'expectVisible',
    extract: (match) => ({
      type: 'expectVisible',
      locator: parseSelectorToLocator(match[1]),
    }),
  },

  // **Assert**: `selector` count is N
  {
    name: 'structured-assert-count',
    regex: /^-?\s*\*\*Assert\*\*:\s*`([^`]+)`\s+count\s+is\s+(\d+)$/i,
    primitiveType: 'expectCount',
    extract: (match) => ({
      type: 'expectCount',
      locator: parseSelectorToLocator(match[1]),
      count: parseInt(match[2], 10),
    }),
  },

  // **Assert**: `selector` contains text "X"
  {
    name: 'structured-assert-text',
    regex: /^-?\s*\*\*Assert\*\*:\s*`([^`]+)`\s+contains\s+text\s+["']([^"']+)["']$/i,
    primitiveType: 'expectContainsText',
    extract: (match) => ({
      type: 'expectContainsText',
      locator: parseSelectorToLocator(match[1]),
      text: match[2],
    }),
  },

  // **Assert**: URL matches `/path`
  {
    name: 'structured-assert-url',
    regex: /^-?\s*\*\*Assert\*\*:\s*URL\s+matches\s+`([^`]+)`$/i,
    primitiveType: 'expectURL',
    extract: (match) => ({
      type: 'expectURL',
      pattern: match[1],
    }),
  },
];

// Helper function
function parseSelectorToLocator(selector: string): LocatorSpec {
  // data-testid pattern: [data-testid="value"] or [data-testid='value']
  const testidMatch = selector.match(/\[data-testid=['"]([^'"]+)['"]\]/);
  if (testidMatch) {
    return { strategy: 'testid', value: testidMatch[1] };
  }

  // CSS selector fallback
  return { strategy: 'css', value: selector };
}
```

**Update allPatterns to include structured patterns (at the START for priority):**

```typescript
export const allPatterns: StepPattern[] = [
  ...structuredPatterns,  // NEW - check structured format first
  ...authPatterns,
  ...toastPatterns,
  ...navigationPatterns,
  ...clickPatterns,
  ...fillPatterns,
  ...selectPatterns,
  ...checkPatterns,
  ...visibilityPatterns,
  ...urlPatterns,
  ...waitPatterns,
];
```

---

### Phase 3: Enhance parseProceduralSteps for Structured Format

**File:** `src/journey/parseJourney.ts`

**Problem:** Current parser only handles `1. Step text` or `- Step text`

**Solution:** Add detection for `### Step N:` format and parse nested bullets

```typescript
/**
 * Parse procedural steps - supports both simple and structured formats
 */
function parseProceduralSteps(body: string): ProceduralStep[] {
  const steps: ProceduralStep[] = [];

  // Find the Steps section
  const psMatch = body.match(
    /##\s*Steps?\s*\n([\s\S]*?)(?=\n##\s[^#]|$)/i
  );
  if (!psMatch) return steps;

  const psSection = psMatch[1];

  // Check for structured format (### Step N:)
  if (/###\s+Step\s+\d+:/i.test(psSection)) {
    return parseStructuredSteps(psSection);
  }

  // Fallback to original simple format parsing
  // ... existing code ...
}

/**
 * Parse structured step format:
 * ### Step 1: Title
 * - **Action**: ...
 * - **Wait for**: ...
 * - **Assert**: ...
 */
function parseStructuredSteps(section: string): ProceduralStep[] {
  const steps: ProceduralStep[] = [];

  // Split by ### Step N: headers
  const stepBlocks = section.split(/(?=###\s+Step\s+\d+:)/i).filter(Boolean);

  for (const block of stepBlocks) {
    // Extract step number and title
    const headerMatch = block.match(/###\s+Step\s+(\d+):\s*(.+)/i);
    if (!headerMatch) continue;

    const number = parseInt(headerMatch[1], 10);
    const title = headerMatch[2].trim();

    // Extract all bullet points (actions, waits, asserts)
    const bulletPattern = /^-\s+(.+)$/gm;
    let match;
    while ((match = bulletPattern.exec(block)) !== null) {
      const bulletText = match[1].trim();

      // Each bullet becomes a separate ProceduralStep
      // This allows patterns.ts to match them individually
      steps.push({
        number: steps.length + 1,
        text: bulletText,
        linkedAC: undefined,
      });
    }
  }

  return steps;
}
```

---

### Phase 4: Create Shared Escaping Utility (DRY)

**File:** `src/utils/escaping.ts` (NEW)

```typescript
/**
 * Shared escaping utilities
 */

/**
 * Escape special regex characters including forward slash
 * Used when embedding strings in regex literals: /pattern/
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

/**
 * Escape string for JavaScript string literals
 * Handles quotes, backslashes, and newlines
 */
export function escapeString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}
```

**Update imports in:**
- `src/codegen/generateTest.ts` - import from `../utils/escaping.js`
- `src/journey/normalize.ts` - import from `../utils/escaping.js`
- Delete local implementations

---

### Phase 5: Integration Verification

**No CLI changes needed!** The flow already works:

```typescript
// src/index.ts:166-177 (ALREADY CORRECT)
const parsed = isFilePaths
  ? parseJourney(journey)
  : parseJourneyContent(journey, 'inline');

// Normalize to IR
const normalized = normalizeJourney(parsed);  // This uses parseStepText()

// Generate test
const testResult = generateTest(normalized.journey, testOptions);
```

The fix is internal to `normalizeJourney()` - no API changes needed.

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

## Part 4: REVISED Implementation Priority

### Immediate (P0) - Must Fix Before Release

| Task | File(s) | Effort | Description |
|------|---------|--------|-------------|
| **1. Fix EJS escaping** | `test.ejs` | 15 min | Change `<%= escapeX(...) %>` to `<%- escapeX(...) %>` in lines 32, 35-36, 53, 55, 57, 59 |
| **2. Fix escapeRegex** | `generateTest.ts`, `normalize.ts` | 15 min | Add `/` to character class: `[.*+?^${}()\|[\]\\/]` |

**Total P0 effort: ~30 minutes**

### Short Term (P1) - Same Day/Next Day

| Task | File(s) | Effort | Description |
|------|---------|--------|-------------|
| **3. Create escaping utility** | `utils/escaping.ts` (new) | 30 min | DRY up escapeRegex and escapeString, update imports |
| **4. Connect stepMapper** | `normalize.ts` | 1 hr | Replace inline parseStepText() with mapStepText() call |
| **5. Add structured patterns** | `patterns.ts` | 1 hr | Add 8 patterns for `**Action**:`, `**Wait for**:`, `**Assert**:` |
| **6. Parse structured steps** | `parseJourney.ts` | 1 hr | Add parseStructuredSteps() for `### Step N:` format |

**Total P1 effort: ~3.5 hours**

### Medium Term (P2) - This Week

| Task | File(s) | Effort | Description |
|------|---------|--------|-------------|
| **7. Unit tests for escaping** | `__tests__/escaping.test.ts` | 1 hr | Test escapeRegex with `/`, `\`, special chars |
| **8. Integration tests** | `__tests__/generate.test.ts` | 2 hr | End-to-end: Journey → IR → Test code |
| **9. Update test fixtures** | `test-fixtures/` | 1 hr | Add structured step examples |

### Future (P3) - Backlog

| Feature | Effort | Description |
|---------|--------|-------------|
| Data-Driven Tests | 1-2 days | Parameterized test data sets |
| Prerequisites | 1 day | Chain dependent journeys |
| Negative Paths | 1 day | Error scenario testing |
| Visual Regression | 2 days | Screenshot comparisons |
| API Mocking | 2 days | Declare mock responses |
| Accessibility | 1-2 days | Auto-inject a11y audits |
| Performance | 1 day | Assert on LCP/FID metrics |

---

## Part 5: REVISED Test Plan

### Unit Tests for Bug Fixes

```typescript
// src/__tests__/utils/escaping.test.ts
import { escapeRegex, escapeString } from '../../utils/escaping.js';

describe('escapeRegex', () => {
  it('escapes forward slashes', () => {
    expect(escapeRegex('/dashboard')).toBe('\\/dashboard');
    expect(escapeRegex('/user/profile')).toBe('\\/user\\/profile');
  });

  it('escapes multiple slashes in URL paths', () => {
    expect(escapeRegex('/api/v1/users')).toBe('\\/api\\/v1\\/users');
  });

  it('escapes regex special characters', () => {
    expect(escapeRegex('test.html')).toBe('test\\.html');
    expect(escapeRegex('[test]')).toBe('\\[test\\]');
    expect(escapeRegex('foo(bar)')).toBe('foo\\(bar\\)');
    expect(escapeRegex('a+b*c?')).toBe('a\\+b\\*c\\?');
  });

  it('handles mixed slashes and special chars', () => {
    expect(escapeRegex('/user/[id]')).toBe('\\/user\\/\\[id\\]');
  });
});

describe('escapeString', () => {
  it('escapes single quotes', () => {
    expect(escapeString("it's")).toBe("it\\'s");
  });

  it('escapes double quotes', () => {
    expect(escapeString('say "hello"')).toBe('say \\"hello\\"');
  });

  it('escapes backslashes', () => {
    expect(escapeString('path\\to')).toBe('path\\\\to');
  });

  it('escapes newlines and tabs', () => {
    expect(escapeString('line1\nline2')).toBe('line1\\nline2');
    expect(escapeString('col1\tcol2')).toBe('col1\\tcol2');
  });

  it('handles data-testid selectors', () => {
    expect(escapeString("[data-testid='login-form']"))
      .toBe("[data-testid=\\'login-form\\']");
  });
});
```

### Integration Tests for Step Parsing

```typescript
// src/__tests__/integration/structuredSteps.test.ts
import { parseJourneyContent } from '../../journey/parseJourney.js';
import { normalizeJourney } from '../../journey/normalize.js';
import { generateTest } from '../../codegen/generateTest.js';

describe('Structured Step Parsing', () => {
  it('parses structured step format to IR', () => {
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

### Step 1: Navigate to login
- **Action**: Go to \`/login\`
- **Wait for**: \`[data-testid="login-form"]\` to be visible

### Step 2: Submit form
- **Action**: Click \`[data-testid="submit-btn"]\`
- **Assert**: URL matches \`/dashboard\`
`);

    const { journey, stats } = normalizeJourney(parsed);

    // Should have steps from procedural parsing
    expect(journey.steps.length).toBeGreaterThan(0);

    // Check that actions were parsed
    const allActions = journey.steps.flatMap(s => s.actions);
    const gotoAction = allActions.find(a => a.type === 'goto');
    expect(gotoAction).toBeDefined();
    expect((gotoAction as any).url).toBe('/login');
  });

  it('generates valid test code without HTML entities', () => {
    const parsed = parseJourneyContent(`---
id: JRN-0001
title: Login Test
status: clarified
tier: smoke
actor: user
scope: auth
completion:
  - type: element
    value: "[data-testid='welcome']"
---
## Steps
- User sees the welcome message
`);

    const { journey } = normalizeJourney(parsed);
    const { code } = generateTest(journey);

    // Should NOT contain HTML entities
    expect(code).not.toContain('&#39;');
    expect(code).not.toContain('&quot;');

    // Should contain properly escaped quotes
    expect(code).toContain("data-testid=\\'welcome\\'");
  });

  it('generates valid regex for URL patterns', () => {
    const parsed = parseJourneyContent(`---
id: JRN-0002
title: URL Test
status: clarified
tier: smoke
actor: user
scope: nav
completion:
  - type: url
    value: /dashboard
---
## Steps
- User is redirected to dashboard
`);

    const { journey } = normalizeJourney(parsed);
    const { code } = generateTest(journey);

    // Should have escaped forward slash
    expect(code).toContain('/\\/dashboard/');

    // Should NOT have double slash (invalid regex)
    expect(code).not.toContain('//dashboard/');
  });
});
```

### Pattern Matching Tests

```typescript
// src/__tests__/mapping/structuredPatterns.test.ts
import { matchPattern } from '../../mapping/patterns.js';

describe('Structured Step Patterns', () => {
  it('matches **Action**: Go to pattern', () => {
    const result = matchPattern('**Action**: Go to `/login`');
    expect(result).toMatchObject({
      type: 'goto',
      url: '/login',
    });
  });

  it('matches **Action**: Click pattern', () => {
    const result = matchPattern('**Action**: Click `[data-testid="submit"]`');
    expect(result).toMatchObject({
      type: 'click',
      locator: { strategy: 'testid', value: 'submit' },
    });
  });

  it('matches **Wait for**: visible pattern', () => {
    const result = matchPattern('**Wait for**: `[data-testid="form"]` to be visible');
    expect(result).toMatchObject({
      type: 'expectVisible',
      locator: { strategy: 'testid', value: 'form' },
    });
  });

  it('matches **Assert**: URL pattern', () => {
    const result = matchPattern('**Assert**: URL matches `/dashboard`');
    expect(result).toMatchObject({
      type: 'expectURL',
      pattern: '/dashboard',
    });
  });

  it('matches **Assert**: count pattern', () => {
    const result = matchPattern('**Assert**: `[data-testid="item"]` count is 3');
    expect(result).toMatchObject({
      type: 'expectCount',
      locator: { strategy: 'testid', value: 'item' },
      count: 3,
    });
  });
});
```

---

## Appendix: REVISED File Locations

### Files to MODIFY (Bug Fixes)

| File | Lines | Fix |
|------|-------|-----|
| `src/codegen/templates/test.ejs` | 32, 35-36, 53, 55, 57, 59 | Change `<%= escapeX %>` to `<%- escapeX %>` |
| `src/codegen/generateTest.ts` | 84-86 | Add `/` to escapeRegex char class |
| `src/journey/normalize.ts` | 552-554 | Add `/` to escapeRegex char class |

### Files to MODIFY (Step Parsing)

| File | Change |
|------|--------|
| `src/journey/normalize.ts` | Replace inline parseStepText() with mapStepText() import |
| `src/mapping/patterns.ts` | Add structuredPatterns array + parseSelectorToLocator helper |
| `src/journey/parseJourney.ts` | Add parseStructuredSteps() function |

### Files to CREATE

| File | Purpose |
|------|---------|
| `src/utils/escaping.ts` | **NEW** - Shared escapeRegex + escapeString utilities |
| `src/__tests__/utils/escaping.test.ts` | **NEW** - Unit tests for escaping |
| `src/__tests__/integration/structuredSteps.test.ts` | **NEW** - Integration tests |
| `src/__tests__/mapping/structuredPatterns.test.ts` | **NEW** - Pattern matching tests |

### Existing Architecture (Reference)

| File | Purpose | Status |
|------|---------|--------|
| `src/codegen/generateTest.ts` | Test generator, EJS rendering | Has bug in escapeRegex |
| `src/mapping/patterns.ts` | 50+ step patterns | Missing structured patterns |
| `src/mapping/stepMapper.ts` | Pattern matching via mapStepText() | **NOT CONNECTED** |
| `src/journey/parseJourney.ts` | Markdown → ParsedJourney | Missing structured step parsing |
| `src/journey/normalize.ts` | ParsedJourney → IRJourney | Uses inline parser, not patterns.ts |
| `src/journey/parseHints.ts` | Machine hints (@testid, @role) | Working correctly |
| `src/ir/types.ts` | IRPrimitive, IRStep, IRJourney | Complete |
| `src/ir/builder.ts` | Fluent API for IR construction | Complete |
| `src/selectors/priority.ts` | LocatorSpec → Playwright code | Has escapeString (OK) |
| `src/index.ts` | Main entry, generateJourneyTests() | Correctly wired |

---

## Summary of Issues Found During Review

1. **Original plan incorrectly stated `journeyToIR.ts` was missing**
   - `normalize.ts` already has `normalizeJourney()` that converts ParsedJourney → IRJourney
   - The issue is the inline parser, not a missing file

2. **TWO identical buggy `escapeRegex()` functions found**
   - Both in `generateTest.ts` and `normalize.ts`
   - Both missing `/` in the character class

3. **Sophisticated pattern infrastructure EXISTS but is DISCONNECTED**
   - `patterns.ts` has 50+ patterns
   - `stepMapper.ts` has `mapStepText()` that uses them
   - But `normalize.ts` uses its own inline `parseStepText()` instead!

4. **Structured step format unsupported anywhere**
   - `### Step N:` with `**Action**:`, `**Wait for**:`, `**Assert**:` bullets
   - Need to add patterns AND parsing support

---

## References

- [Playwright Test Locators](https://playwright.dev/docs/locators)
- [Playwright Assertions](https://playwright.dev/docs/test-assertions)
- [EJS Documentation](https://ejs.co/#docs)
- [Cucumber/Gherkin](https://cucumber.io/docs/gherkin/)
- [CodeceptJS](https://codecept.io/)
- [Karate DSL](https://github.com/karatelabs/karate)
