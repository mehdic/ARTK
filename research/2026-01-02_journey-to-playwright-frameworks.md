# Journey-to-Playwright Test Generation Frameworks

**Date:** 2026-01-02
**Topic:** Research on frameworks that can convert ARTK Journeys into executable Playwright tests

---

## Executive Summary

This research analyzes existing frameworks and approaches for converting structured test specifications (like ARTK Journeys) into executable Playwright tests. The goal is to enhance `/journey-implement`, `/journey-validate`, and `/journey-verify` prompts with automated test generation capabilities.

**Key Finding:** The most promising approach is a **hybrid strategy** combining:
1. **Playwright Test Agents** (official AI-powered solution) for dynamic test generation/healing
2. **playwright-bdd** for structured Gherkin-to-Playwright conversion
3. **Custom ARTK generator** that leverages the existing journey schema

---

## 1. Playwright Test Agents (Official AI Solution)

### Overview
Released with Playwright 1.56, Test Agents are AI-powered tools that interact directly with live browsers to generate, plan, and fix tests.

### Components

#### 1.1 Planner Agent
- **Purpose:** Explores the application and creates a test plan in Markdown
- **Input:** Application URL + high-level test scenario
- **Output:** Structured Markdown test plan with steps
- **ARTK Fit:** Could convert Journey acceptance criteria → detailed test plan

```typescript
import { planner } from '@playwright/test';

const plan = await planner.generatePlan({
  url: 'https://myapp.com/dashboard',
  scenario: 'User can view and filter dashboard metrics'
});
// Output: Markdown test plan with steps
```

#### 1.2 Generator Agent
- **Purpose:** Converts Markdown test plan into executable Playwright TypeScript
- **Input:** Markdown plan (from Planner or manually written)
- **Output:** Complete `.spec.ts` file
- **ARTK Fit:** Perfect for Journey procedural steps → Playwright code

```typescript
import { generator } from '@playwright/test';

const testCode = await generator.generateTest({
  plan: journeyPlan,
  outputPath: 'tests/JRN-0001__user-dashboard.spec.ts'
});
```

#### 1.3 Healer Agent
- **Purpose:** Auto-fixes broken tests by analyzing failures and updating selectors
- **Input:** Failed test + trace/error context
- **Output:** Fixed test code
- **ARTK Fit:** Ideal for `/journey-verify` healing loop

```typescript
import { healer } from '@playwright/test';

const fixedCode = await healer.fixTest({
  testPath: 'tests/JRN-0001.spec.ts',
  error: failureContext,
  trace: traceZip
});
```

### Strengths for ARTK
- Official Playwright integration - guaranteed compatibility
- AI understands application context from live interaction
- Healer reduces flakiness maintenance burden
- Plans are Markdown-based - compatible with Journey format

### Limitations
- Requires running browser (not purely static)
- AI can hallucinate selectors if app is complex
- Limited control over generated code structure
- New (2025) - still maturing

### Integration Strategy for ARTK
```
Journey (clarified)
    → Extract acceptance criteria + procedural steps
    → Feed to Planner Agent (optional - for enhancement)
    → Feed to Generator Agent (core conversion)
    → Output: Playwright test with @artk/core imports
    → Validate with /journey-validate
    → Run with /journey-verify + Healer for stabilization
```

---

## 2. playwright-bdd (Gherkin → Playwright)

### Overview
A mature library that converts BDD/Gherkin feature files into Playwright tests. Maintained by Vitalets with active development.

**GitHub:** https://github.com/vitalets/playwright-bdd
**npm:** `playwright-bdd`

### How It Works

#### Step 1: Write Gherkin Features
```gherkin
# features/dashboard.feature
Feature: User Dashboard

  @smoke @JRN-0001
  Scenario: User can view dashboard metrics
    Given I am logged in as "standard_user"
    When I navigate to "/dashboard"
    Then I should see the welcome message
    And I should see the metrics panel
```

#### Step 2: Implement Step Definitions
```typescript
// steps/dashboard.steps.ts
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

Given('I am logged in as {string}', async function(role: string) {
  await this.page.goto('/login');
  await this.page.fill('[name="username"]', role);
  // ...
});

When('I navigate to {string}', async function(path: string) {
  await this.page.goto(path);
});

Then('I should see the welcome message', async function() {
  await expect(this.page.getByRole('heading', { name: /welcome/i })).toBeVisible();
});
```

#### Step 3: Generate Playwright Tests
```bash
npx bddgen
```

Output: `tests/dashboard.spec.ts` - pure Playwright tests

### Strengths for ARTK
- **Structured approach:** Gherkin maps well to Journey acceptance criteria
- **Step reusability:** Same steps across multiple Journeys
- **Tagging support:** `@JRN-####`, `@smoke`, `@scope-*` work natively
- **Mature ecosystem:** Cucumber ecosystem, VS Code extensions
- **Deterministic:** Same input → same output (no AI randomness)

### Limitations
- Requires maintaining step definitions manually
- Gherkin can be verbose for complex flows
- Less dynamic than AI-based approaches
- Step definition sprawl in large test suites

### ARTK Integration Strategy

#### Option A: Journey → Gherkin → Playwright
```
Journey (clarified)
    → Convert acceptance criteria to Gherkin scenarios
    → Generate step definitions from procedural steps
    → Run bddgen to produce Playwright tests
    → Inject @artk/core imports
```

#### Option B: Journey + Gherkin Hybrid
```
Journey frontmatter: references Gherkin feature file
Gherkin feature: detailed scenarios
Step definitions: use @artk/core fixtures
```

### Example ARTK Converter Pseudocode
```typescript
// Convert Journey AC to Gherkin
function journeyToGherkin(journey: Journey): string {
  const scenarios = journey.acceptanceCriteria.map(ac => `
  @${journey.id}
  Scenario: ${ac.title}
    Given I am logged in as "${journey.actor}"
    ${ac.steps.map(s => `    ${gherkinStep(s)}`).join('\n')}
    Then ${ac.assertion}
  `);

  return `Feature: ${journey.title}\n${scenarios.join('\n')}`;
}
```

---

## 3. Playwright MCP (Model Context Protocol)

### Overview
MCP enables AI assistants (Claude, GPT, etc.) to interact with live Playwright browser sessions. This creates a feedback loop where AI can:
1. See the actual page
2. Write test code
3. Run and verify it
4. Fix issues iteratively

**Documentation:** https://modelcontextprotocol.io/
**Playwright MCP Server:** https://github.com/anthropics/mcp-servers/tree/main/playwright

### How It Works
```
AI Assistant ←→ MCP Protocol ←→ Playwright Browser
     ↓
"Navigate to /dashboard and verify the welcome message"
     ↓
AI sees screenshot, writes test code, executes, validates
```

### Strengths for ARTK
- **Context-aware:** AI sees actual application state
- **Iterative refinement:** Can fix issues in real-time
- **Natural language input:** Journey descriptions work directly
- **Handles dynamic content:** AI adapts to what it sees

### Limitations
- Requires active Claude/MCP session
- Non-deterministic outputs
- Slower than static generation
- Resource intensive (browser + AI)

### ARTK Integration Strategy
Best suited for **assist mode** during `/journey-implement`:
```
User runs: /journey-implement id=JRN-0001
    → Load Journey specification
    → If MCP available: spawn browser session
    → AI navigates through Journey steps
    → AI generates test code based on actual selectors
    → Static post-processing adds @artk/core imports
```

---

## 4. Custom ARTK Generator (Recommended Primary Approach)

### Rationale
Given ARTK's structured journey schema, a **custom template-based generator** offers the most control and determinism while optionally integrating AI assistance.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ARTK Test Generator                       │
├─────────────────────────────────────────────────────────────┤
│  Input: Journey (clarified)                                  │
│    - YAML frontmatter (id, tier, scope, actor, modules)     │
│    - Acceptance criteria (AC-1, AC-2, ...)                   │
│    - Procedural steps (1. Navigate to..., 2. Click...)      │
│    - Data strategy (seed, create_api, etc.)                 │
│    - Async signals (toast, loading, redirect)               │
├─────────────────────────────────────────────────────────────┤
│  Processing Pipeline:                                        │
│    1. Parse Journey YAML + body                              │
│    2. Map AC → test.step() blocks                            │
│    3. Map procedural steps → Playwright actions              │
│    4. Infer selectors from testability docs                  │
│    5. Generate data setup/cleanup                            │
│    6. Apply template with @artk/core imports                 │
├─────────────────────────────────────────────────────────────┤
│  Output: tests/<tier>/JRN-####__slug.spec.ts                │
│    - Proper tags (@JRN-####, @smoke, @scope-*)               │
│    - Core fixture imports                                    │
│    - Structured test.step() for each AC                      │
│    - Web-first assertions (no sleeps)                        │
└─────────────────────────────────────────────────────────────┘
```

### Template Example

```typescript
// Template: journey-test.template.ts
import { test, expect } from '@artk/core/fixtures';
{{#if useLocators}}
import { byTestId } from '@artk/core/locators';
{{/if}}
{{#if useAssertions}}
import { {{assertions}} } from '@artk/core/assertions';
{{/if}}

test.describe('{{journey.id}}: {{journey.title}} @{{journey.id}} @{{journey.tier}} @scope-{{journey.scope}}', () => {
  {{#if hasSetup}}
  test.beforeEach(async ({ testData, runId }) => {
    // Data setup for: {{journey.dataStrategy}}
    {{setupCode}}
  });
  {{/if}}

  test('{{journey.title}} @{{journey.id}}', async ({
    authenticatedPage,
    config,
    runId,
    {{#if needsApi}}apiContext,{{/if}}
  }) => {
    {{#each acceptanceCriteria}}
    await test.step('{{this.id}}: {{this.title}}', async () => {
      {{#each this.steps}}
      {{this.code}}
      {{/each}}
      {{#each this.assertions}}
      await expect({{this.locator}}).{{this.matcher}};
      {{/each}}
    });
    {{/each}}
  });

  {{#if hasCleanup}}
  test.afterEach(async ({ testData }) => {
    await testData.cleanup();
  });
  {{/if}}
});
```

### Step Mapping Rules

| Journey Step Pattern | Playwright Code |
|---------------------|-----------------|
| Navigate to /path | `await page.goto('/path');` |
| Click on "Button" | `await page.getByRole('button', { name: 'Button' }).click();` |
| Fill "Field" with value | `await page.getByLabel('Field').fill('value');` |
| Select "Option" from dropdown | `await page.getByRole('combobox').selectOption('Option');` |
| See "text" | `await expect(page.getByText('text')).toBeVisible();` |
| See success toast | `await expectToast(page, { type: 'success' });` |
| Wait for loading | `await waitForLoadingComplete(page);` |
| Download file | `const download = await page.waitForEvent('download');` |

### Selector Inference

1. **Prefer role-based** (from Journey step wording):
   - "button" → `getByRole('button')`
   - "link" → `getByRole('link')`
   - "heading" → `getByRole('heading')`

2. **Fallback to label** (from field names):
   - "Email field" → `getByLabel('Email')`

3. **Use testability hints** (from TESTABILITY.md):
   - Known `data-testid` patterns
   - App-specific selector conventions

4. **Last resort: AI assistance** (optional):
   - If MCP available, verify selector on live page
   - If Playwright Agents available, use Healer

---

## 5. Comparison Matrix

| Criteria | Playwright Agents | playwright-bdd | Playwright MCP | Custom Generator |
|----------|------------------|----------------|----------------|------------------|
| **Determinism** | Low (AI) | High | Low (AI) | High |
| **Setup Complexity** | Medium | Low | High | Low |
| **ARTK Integration** | Manual wrapping | Gherkin transform | MCP protocol | Native |
| **Selector Quality** | Good (sees app) | Manual | Good (sees app) | Template-based |
| **Maintenance** | Low (self-heal) | Medium | Low | Medium |
| **Speed** | Slow (browser) | Fast | Slow | Fast |
| **Offline Support** | No | Yes | No | Yes |
| **Code Control** | Limited | Full | Limited | Full |

---

## 6. Recommended ARTK Strategy

### Primary: Custom Generator + Structured Templates
- Deterministic, fast, full control
- Maps Journey schema directly to test structure
- Guarantees @artk/core imports and tagging
- Easy to maintain and extend

### Enhancement: Playwright Agents for Stabilization
- Use Healer Agent in `/journey-verify` healing loop
- Auto-fix selector issues during stabilization
- Reduces manual maintenance burden

### Optional: playwright-bdd for Teams Preferring BDD
- Offer as alternative format for Journeys
- Journey frontmatter can reference `.feature` file
- Step definitions reuse @artk/core

### Architecture Diagram

```
                        /journey-implement
                              │
                    ┌─────────┴─────────┐
                    │ Journey (clarified)│
                    └─────────┬─────────┘
                              │
           ┌──────────────────┼──────────────────┐
           │                  │                  │
    ┌──────▼──────┐   ┌──────▼──────┐   ┌───────▼──────┐
    │   Custom    │   │ Playwright  │   │ playwright-  │
    │  Generator  │   │   Agents    │   │     bdd      │
    │ (Primary)   │   │ (Optional)  │   │ (Optional)   │
    └──────┬──────┘   └──────┬──────┘   └───────┬──────┘
           │                  │                  │
           └──────────────────┼──────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  Playwright Test  │
                    │  (uses @artk/core)│
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │ /journey-validate │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │  /journey-verify  │
                    │  + Healer Agent   │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │ status: implemented│
                    └───────────────────┘
```

---

## 7. Implementation Roadmap

### Phase 1: Custom Generator Core (Immediate)
1. Create `core/generator/journey-to-test.ts`
2. Implement step mapping rules
3. Implement template engine
4. Integrate into `/journey-implement` prompt

### Phase 2: Healing Integration (Short-term)
1. Detect Playwright Agent availability (v1.56+)
2. Add Healer Agent to `/journey-verify` healing loop
3. Track healed selectors for learning

### Phase 3: AI Enhancement (Medium-term)
1. Optional MCP integration for selector verification
2. Generator Agent as fallback for complex flows
3. Planner Agent for Journey refinement suggestions

### Phase 4: BDD Support (Optional)
1. Journey ↔ Gherkin bidirectional conversion
2. Step definition generator
3. Shared step library management

---

## 8. Conclusion

The optimal approach for ARTK is a **layered strategy**:

1. **Deterministic core** (custom generator) ensures reliable, controllable test generation
2. **AI healing layer** (Playwright Agents) handles maintenance and stabilization
3. **Alternative formats** (BDD) accommodate team preferences

This approach maximizes the value of the structured Journey format while leveraging modern AI capabilities where they add value without sacrificing reliability.

---

## References

- [Playwright Test Agents Documentation](https://playwright.dev/docs/test-agents)
- [playwright-bdd GitHub](https://github.com/vitalets/playwright-bdd)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Checkly: Generate E2E Tests with AI](https://www.checklyhq.com/blog/generate-end-to-end-tests-with-ai-and-playwright/)
- [Your Code as a Crime Scene (Code Churn Analysis)](https://pragprog.com/titles/atcrime/your-code-as-a-crime-scene/)
