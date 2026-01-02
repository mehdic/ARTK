# ARTK Test Generation Integration Plan

**Date:** 2026-01-02
**Status:** APPROVED FOR IMPLEMENTATION
**Constraint:** NO MCP (Model Context Protocol) - company policy

---

## Executive Summary

This plan details how to integrate automated test generation capabilities into ARTK's `/journey-implement`, `/journey-validate`, and `/journey-verify` prompts WITHOUT using MCP.

**Primary Approach:** Custom ARTK Generator with template-based code generation
**Secondary Approach:** playwright-bdd integration for BDD-preferring teams
**Enhancement:** Structured step mapping rules for GitHub Copilot assistance

---

## 1. Research Findings

### 1.1 Playwright Test Agents (EXCLUDED)

Playwright v1.56 introduced Test Agents (Planner, Generator, Healer) which are powerful AI-driven tools. However, they **run on MCP** (Model Context Protocol) under the hood.

> "Playwright Test Agents run on MCP, the Model Context Protocol, which connects AI models to developer tools safely."
> — [Playwright Documentation](https://playwright.dev/docs/test-agents)

**Decision: EXCLUDED** due to company MCP policy.

### 1.2 playwright-bdd (INCLUDED)

A mature library that converts Gherkin feature files to Playwright tests without MCP dependency.

- **GitHub:** [vitalets/playwright-bdd](https://github.com/vitalets/playwright-bdd)
- **npm:** `playwright-bdd`
- **Integration:** Native Playwright runner, full fixture support
- **Maturity:** Production-ready, actively maintained

**Decision: INCLUDED** as secondary option for BDD teams.

### 1.3 Playwright Codegen (LIMITED USE)

The `npx playwright codegen` tool generates tests interactively but has no programmatic API for automated generation.

**Decision: REFERENCE ONLY** - mention in prompts for manual assistance, not automated integration.

### 1.4 LangChain/Stagehand Alternatives (EXCLUDED)

These require external LLM connections which add complexity and potential compliance issues.

**Decision: EXCLUDED** - unnecessary complexity for ARTK's structured approach.

---

## 2. Recommended Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     ARTK Test Generation                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐                                           │
│  │ Journey (clarified)│                                          │
│  │  - YAML frontmatter│                                          │
│  │  - Acceptance criteria│                                       │
│  │  - Procedural steps│                                          │
│  │  - Data strategy  │                                           │
│  └────────┬─────────┘                                           │
│           │                                                      │
│           ▼                                                      │
│  ┌────────────────────────────────────────────┐                 │
│  │         ARTK Generator Engine               │                 │
│  │  ┌─────────────┐  ┌──────────────────┐    │                 │
│  │  │ Step Mapper │  │ Template Engine  │    │                 │
│  │  │             │  │                  │    │                 │
│  │  │ AC → Steps  │  │ Handlebars/EJS   │    │                 │
│  │  │ Steps → PW  │  │ templates        │    │                 │
│  │  └─────────────┘  └──────────────────┘    │                 │
│  │                                            │                 │
│  │  ┌─────────────┐  ┌──────────────────┐    │                 │
│  │  │ Selector    │  │ Assertion        │    │                 │
│  │  │ Inferencer  │  │ Generator        │    │                 │
│  │  │             │  │                  │    │                 │
│  │  │ Role/Label/ │  │ toBeVisible/     │    │                 │
│  │  │ TestId      │  │ toContainText    │    │                 │
│  │  └─────────────┘  └──────────────────┘    │                 │
│  └────────────────────────────────────────────┘                 │
│           │                                                      │
│           ▼                                                      │
│  ┌──────────────────┐     ┌──────────────────┐                 │
│  │ Primary Output   │     │ Alt: BDD Output  │                 │
│  │                  │     │                  │                 │
│  │ .spec.ts with    │     │ .feature +       │                 │
│  │ @artk/core       │     │ step defs        │                 │
│  └──────────────────┘     └──────────────────┘                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Step Mapping Rules (Core of Generator)

### 3.1 Navigation Patterns

| Journey Step Pattern | Playwright Code |
|---------------------|-----------------|
| `Navigate to /path` | `await page.goto('/path');` |
| `Go to the dashboard` | `await page.goto('/dashboard');` |
| `Open /settings page` | `await page.goto('/settings');` |
| `Return to home` | `await page.goto('/');` |

### 3.2 Interaction Patterns

| Journey Step Pattern | Playwright Code |
|---------------------|-----------------|
| `Click on "Button"` | `await page.getByRole('button', { name: 'Button' }).click();` |
| `Click the "Link" link` | `await page.getByRole('link', { name: 'Link' }).click();` |
| `Fill "Field" with "value"` | `await page.getByLabel('Field').fill('value');` |
| `Enter "value" in "Field"` | `await page.getByLabel('Field').fill('value');` |
| `Select "Option" from dropdown` | `await page.getByRole('combobox').selectOption('Option');` |
| `Check "Checkbox"` | `await page.getByLabel('Checkbox').check();` |
| `Uncheck "Checkbox"` | `await page.getByLabel('Checkbox').uncheck();` |
| `Upload file to "Input"` | `await page.getByLabel('Input').setInputFiles('path/to/file');` |
| `Press Enter` | `await page.keyboard.press('Enter');` |
| `Hover over "Element"` | `await page.getByText('Element').hover();` |

### 3.3 Assertion Patterns

| Journey Assertion Pattern | Playwright Code |
|--------------------------|-----------------|
| `See "text"` | `await expect(page.getByText('text')).toBeVisible();` |
| `See heading "Title"` | `await expect(page.getByRole('heading', { name: 'Title' })).toBeVisible();` |
| `See button "Name"` | `await expect(page.getByRole('button', { name: 'Name' })).toBeVisible();` |
| `Not see "text"` | `await expect(page.getByText('text')).not.toBeVisible();` |
| `Field contains "value"` | `await expect(page.getByLabel('Field')).toHaveValue('value');` |
| `URL contains "/path"` | `await expect(page).toHaveURL(/\/path/);` |
| `Title is "Page Title"` | `await expect(page).toHaveTitle('Page Title');` |
| `"Element" is disabled` | `await expect(page.getByRole('button', { name: 'Element' })).toBeDisabled();` |
| `Table has N rows` | `await expect(page.getByRole('row')).toHaveCount(N);` |

### 3.4 Async/Wait Patterns (NO SLEEPS)

| Journey Pattern | Playwright Code |
|----------------|-----------------|
| `Wait for success toast` | `await expectToast(page, { type: 'success' });` |
| `Wait for loading to complete` | `await waitForLoadingComplete(page);` |
| `Wait for redirect to /path` | `await page.waitForURL(/\/path/);` |
| `Wait for modal to close` | `await expect(page.getByRole('dialog')).not.toBeVisible();` |
| `Wait for API response` | `await page.waitForResponse(resp => resp.url().includes('/api/'));` |
| `Eventually see "text"` | `await expect(page.getByText('text')).toBeVisible({ timeout: 10000 });` |

### 3.5 Data Patterns

| Journey Data Pattern | Playwright Code |
|---------------------|-----------------|
| `Create unique user` | `const userName = namespace('user', runId);` |
| `Use run-specific data` | `const data = { name: \`Test-\${runId}\` };` |
| `Cleanup created data` | `testData.register(async () => { /* cleanup */ });` |

---

## 4. Selector Inference Rules

### 4.1 Priority Order (Playwright Best Practices)

1. **Role-based** (highest priority):
   ```typescript
   page.getByRole('button', { name: 'Submit' })
   page.getByRole('link', { name: 'Home' })
   page.getByRole('textbox', { name: 'Email' })
   page.getByRole('heading', { level: 1 })
   ```

2. **Label-based** (forms):
   ```typescript
   page.getByLabel('Email address')
   page.getByPlaceholder('Enter your email')
   ```

3. **Text-based** (content):
   ```typescript
   page.getByText('Welcome back')
   page.getByText(/total.*\$\d+/)
   ```

4. **Test ID** (when needed):
   ```typescript
   page.getByTestId('submit-button')
   byTestId(page, 'custom-widget')  // @artk/core helper
   ```

5. **CSS/XPath** (LAST RESORT - encapsulate in module):
   ```typescript
   // Only in feature modules, with comment
   // TODO: Request data-testid for this element
   page.locator('.legacy-widget > div:first-child')
   ```

### 4.2 Inference from Journey Step Wording

| Step Contains | Inferred Locator |
|--------------|------------------|
| "button" | `getByRole('button', ...)` |
| "link" | `getByRole('link', ...)` |
| "heading" / "title" | `getByRole('heading', ...)` |
| "field" / "input" | `getByLabel(...)` |
| "dropdown" / "select" | `getByRole('combobox', ...)` |
| "checkbox" | `getByLabel(...).check()` or `getByRole('checkbox')` |
| "table" | `getByRole('table')` |
| "row" | `getByRole('row')` |
| "menu" | `getByRole('menu')` or `getByRole('navigation')` |
| "dialog" / "modal" | `getByRole('dialog')` |
| "tab" | `getByRole('tab', ...)` |

---

## 5. Template System

### 5.1 Main Test Template

```typescript
// templates/journey-test.template.ts
import { test, expect } from '@artk/core/fixtures';
{{#if imports.locators}}
import { {{imports.locators}} } from '@artk/core/locators';
{{/if}}
{{#if imports.assertions}}
import { {{imports.assertions}} } from '@artk/core/assertions';
{{/if}}
{{#if imports.data}}
import { {{imports.data}} } from '@artk/core/data';
{{/if}}

test.describe('{{journey.id}}: {{journey.title}} @{{journey.id}} @{{journey.tier}} @scope-{{journey.scope}}', () => {
{{#if setup}}
  test.beforeEach(async ({ testData, runId, apiContext }) => {
{{setup}}
  });

{{/if}}
  test('{{journey.title}} @{{journey.id}}', async ({
    {{#if auth}}authenticatedPage{{else}}page{{/if}},
    config,
    runId,
{{#if needsApi}}
    apiContext,
{{/if}}
{{#if needsTestData}}
    testData,
{{/if}}
  }) => {
{{#if auth}}
    const page = authenticatedPage;
{{/if}}

{{#each acceptanceCriteria}}
    await test.step('{{this.id}}: {{this.description}}', async () => {
{{#each this.actions}}
      {{this}}
{{/each}}
{{#each this.assertions}}
      {{this}}
{{/each}}
    });

{{/each}}
  });
{{#if cleanup}}

  test.afterEach(async ({ testData }) => {
    await testData.cleanup();
  });
{{/if}}
});
```

### 5.2 Step Definition Template (for BDD mode)

```typescript
// templates/step-definitions.template.ts
import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';
{{#if imports.assertions}}
import { {{imports.assertions}} } from '@artk/core/assertions';
{{/if}}

const { Given, When, Then } = createBdd();

// Authentication
Given('I am logged in as {string}', async ({ authenticatedPage }, role: string) => {
  // Role handled by fixture based on config
});

Given('I am on the {string} page', async ({ page }, path: string) => {
  await page.goto(path);
});

// Navigation
When('I navigate to {string}', async ({ page }, path: string) => {
  await page.goto(path);
});

When('I click on {string}', async ({ page }, name: string) => {
  await page.getByRole('button', { name }).or(page.getByRole('link', { name })).click();
});

When('I fill {string} with {string}', async ({ page }, label: string, value: string) => {
  await page.getByLabel(label).fill(value);
});

// Assertions
Then('I should see {string}', async ({ page }, text: string) => {
  await expect(page.getByText(text)).toBeVisible();
});

Then('I should see a success toast', async ({ page }) => {
  await expectToast(page, { type: 'success' });
});

Then('the URL should contain {string}', async ({ page }, path: string) => {
  await expect(page).toHaveURL(new RegExp(path));
});
```

---

## 6. Prompt Integration Changes

### 6.1 `/journey-implement` Updates

Add to **Step 10 — Write the test(s)**:

```markdown
## Step 10A — Apply Step Mapping Rules

Before writing test code, apply these deterministic mapping rules:

### Navigation
- "Navigate to X" → `await page.goto('X');`
- "Go to X" → `await page.goto('X');`

### Interactions
- "Click on 'X'" → `await page.getByRole('button', { name: 'X' }).click();`
- "Fill 'X' with Y" → `await page.getByLabel('X').fill('Y');`
- "Select 'X' from dropdown" → `await page.getByRole('combobox').selectOption('X');`

### Assertions
- "See 'X'" → `await expect(page.getByText('X')).toBeVisible();`
- "See heading 'X'" → `await expect(page.getByRole('heading', { name: 'X' })).toBeVisible();`

### Async (NO SLEEPS)
- "Wait for toast" → `await expectToast(page, { type: 'success' });`
- "Wait for loading" → `await waitForLoadingComplete(page);`

## Step 10B — Selector Priority

Always use this priority order:
1. `getByRole()` with name
2. `getByLabel()` for form fields
3. `getByText()` for content
4. `getByTestId()` when role/label not available
5. CSS/XPath ONLY as last resort, encapsulated in module

## Step 10C — Alternative BDD Mode (optional)

If `format=bdd` is specified:
1. Generate `.feature` file from Journey acceptance criteria
2. Generate step definitions using @artk/core fixtures
3. Configure playwright-bdd in playwright.config.ts
```

### 6.2 `/journey-validate` Updates

Add to **Step 2A — Core API Import Validation**:

```markdown
## Step 2B — Step Pattern Validation

Verify generated tests follow step mapping rules:

### Required Patterns
- [ ] Navigation uses `page.goto()` with config-based URLs
- [ ] Interactions use role/label locators, not CSS
- [ ] Assertions use `expect()` with web-first matchers
- [ ] Async uses `expect().toBeVisible()` or core helpers, NOT `waitForTimeout`

### Forbidden Patterns
- [ ] `page.waitForTimeout()` - use explicit signals
- [ ] `page.click('.css-selector')` - use role/label
- [ ] `expect(await page.isVisible())` - use web-first
- [ ] Hardcoded URLs - use config baseURL
- [ ] `force: true` - fix the underlying issue

### Pattern Linting (grep-based)
```bash
# Must NOT find these
grep -E "waitForTimeout|\.click\('\.|force:\s*true" <test-files>

# Should find role-based locators
grep -E "getByRole|getByLabel|getByText" <test-files>
```
```

### 6.3 `/journey-verify` Updates

Add to **Step 4 — Healing loop**:

```markdown
## Step 4A — Deterministic Healing Rules

When tests fail, apply these fixes in order:

### Selector Failures
1. Check if element has role → use `getByRole()`
2. Check if element has label → use `getByLabel()`
3. Check if element has test-id → use `getByTestId()`
4. Check TESTABILITY.md for app conventions
5. If no good selector exists, add blocker note

### Timing Failures
1. Never add `waitForTimeout()`
2. For navigation: add URL assertion before next action
3. For loading: use `waitForLoadingComplete()` from core
4. For toasts: use `expectToast()` from core
5. For API: use `page.waitForResponse()`

### Data Failures
1. Ensure `runId` namespacing is used
2. Check cleanup is registered with `testData`
3. Verify test isolation (no shared state)

## Step 4B — Healing Attempt Log

Track each healing attempt:
```json
{
  "attempt": 1,
  "failureType": "selector",
  "originalLocator": ".submit-btn",
  "fixedLocator": "getByRole('button', { name: 'Submit' })",
  "evidence": "Button has role and accessible name",
  "result": "pass"
}
```
```

---

## 7. playwright-bdd Integration (Optional)

### 7.1 When to Use BDD Mode

- Teams with existing Cucumber/Gherkin experience
- QA teams preferring natural language specs
- Projects requiring business-readable test documentation

### 7.2 Configuration

```typescript
// playwright.config.ts (BDD mode)
import { defineConfig } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

const testDir = defineBddConfig({
  paths: ['features/**/*.feature'],
  steps: ['features/steps/**/*.ts'],
});

export default defineConfig({
  testDir,
  use: {
    baseURL: process.env.BASE_URL,
  },
});
```

### 7.3 Journey → Feature File Conversion

```markdown
# Journey: JRN-0001
title: User can view dashboard
actor: standard_user
tier: smoke
scope: dashboard

## Acceptance Criteria
- AC-1: User sees welcome message after login
- AC-2: Dashboard displays metrics panel
- AC-3: User can navigate to settings
```

Converts to:

```gherkin
# features/JRN-0001__user-dashboard.feature
@JRN-0001 @smoke @scope-dashboard
Feature: JRN-0001: User can view dashboard

  Background:
    Given I am logged in as "standard_user"

  @JRN-0001
  Scenario: User sees welcome message and metrics
    When I navigate to "/dashboard"
    Then I should see heading "Welcome"
    And I should see the metrics panel

  @JRN-0001
  Scenario: User can navigate to settings
    Given I am on the "/dashboard" page
    When I click on "Settings"
    Then the URL should contain "/settings"
```

---

## 8. Implementation Roadmap

### Phase 1: Documentation & Rules (Week 1)
- [x] Create step mapping rules reference
- [x] Create selector inference rules
- [x] Create test template
- [ ] Add rules to `/journey-implement` prompt
- [ ] Add validation rules to `/journey-validate` prompt
- [ ] Add healing rules to `/journey-verify` prompt

### Phase 2: Template Engine (Week 2)
- [ ] Create `core/generator/step-mapper.ts`
- [ ] Create `core/generator/selector-inferrer.ts`
- [ ] Create `core/generator/template-engine.ts`
- [ ] Create `core/generator/journey-to-test.ts`
- [ ] Add CLI: `npx artk generate --journey=JRN-0001`

### Phase 3: BDD Support (Week 3)
- [ ] Create `core/generator/journey-to-gherkin.ts`
- [ ] Create base step definitions library
- [ ] Add `format=bdd` option to `/journey-implement`
- [ ] Document BDD workflow in PLAYBOOK.md

### Phase 4: Validation & Healing (Week 4)
- [ ] Add pattern linting to `/journey-validate`
- [ ] Add deterministic healing to `/journey-verify`
- [ ] Create healing attempt logging
- [ ] Test end-to-end workflow

---

## 9. Success Criteria

### For `/journey-implement`
- [ ] 80%+ of Journey steps map to valid Playwright code automatically
- [ ] Generated tests pass `/journey-validate` on first run
- [ ] Generated tests use only @artk/core imports
- [ ] No `waitForTimeout()` in generated code

### For `/journey-validate`
- [ ] Catches all forbidden patterns (sleeps, force, etc.)
- [ ] Validates selector quality (role > label > testid > css)
- [ ] Reports specific line numbers for violations
- [ ] Auto-fixes simple issues (import paths, tag format)

### For `/journey-verify`
- [ ] Healing loop fixes 70%+ of selector issues automatically
- [ ] Never introduces `waitForTimeout()` as a fix
- [ ] Logs all healing attempts with evidence
- [ ] Marks blocked issues clearly

---

## 10. References

- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright Codegen](https://playwright.dev/docs/codegen)
- [playwright-bdd Documentation](https://vitalets.github.io/playwright-bdd/)
- [playwright-bdd GitHub](https://github.com/vitalets/playwright-bdd)
- [Evaluating GitHub Copilot for Playwright](https://www.checklyhq.com/blog/playwright-codegen-with-github-copilot/)
- [DEV: Playwright Agents Overview](https://dev.to/playwright/playwright-agents-planner-generator-and-healer-in-action-5ajh)
