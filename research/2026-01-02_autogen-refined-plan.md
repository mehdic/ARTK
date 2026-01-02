# ARTK AutoGen Refined Plan (Post-Review)

**Date:** 2026-01-02
**Status:** READY FOR IMPLEMENTATION APPROVAL
**Constraint:** NO MCP (Model Context Protocol)

---

## Executive Summary

This refined plan incorporates OpenAI's review feedback into a concrete implementation roadmap for ARTK's autonomous test generation system.

**Core Principle:** Prompts orchestrate; deterministic code generates.

---

## Part 1: Architecture

### 1.1 New Package: `@artk/core-autogen`

Located at `core/typescript/autogen/` alongside existing `core/typescript/` modules.

```
core/typescript/
  src/                    # Existing @artk/core
    config/
    fixtures/
    auth/
    ...
  autogen/                # NEW: @artk/core-autogen
    src/
      journey/
        parseJourney.ts       # Parse YAML frontmatter + body
        schema.ts             # Zod schema for clarified Journey
        normalize.ts          # Normalize steps to IR
      ir/
        types.ts              # IR primitive types
        builder.ts            # Fluent IR builder
        serialize.ts          # IR → JSON for debugging
      mapping/
        stepMapper.ts         # Natural language → IR
        patterns.ts           # Regex patterns for step parsing
        glossary.ts           # Synonym resolution
      selectors/
        catalog.ts            # Load/query selector catalog
        infer.ts              # Infer selector from step text
        priority.ts           # Role > Label > TestId > CSS
      codegen/
        generateTest.ts       # IR → Playwright test code
        generateModule.ts     # IR → Module functions
        astEdit.ts            # ts-morph for idempotent edits
        templates/
          test.ejs            # Test file template
          module.ejs          # Module file template
      validate/
        journey.ts            # Validate Journey schema
        code.ts               # Validate generated code
        lint.ts               # ESLint integration
      verify/
        runner.ts             # Run Playwright via CLI
        parser.ts             # Parse JSON report
        classifier.ts         # Classify failure type
        evidence.ts           # Capture ARIA snapshot + traces
      heal/
        loop.ts               # Bounded healing loop
        rules.ts              # Allowed/forbidden rules
        fixes/
          selector.ts         # Fix selector issues
          timing.ts           # Fix async issues
          navigation.ts       # Fix nav issues
          data.ts             # Fix data isolation
    package.json
    tsconfig.json
```

### 1.2 Intermediate Representation (IR)

All code generation goes through IR. Prompts never generate Playwright code directly.

```typescript
// ir/types.ts
export type IRPrimitive =
  | { type: 'goto'; url: string; waitForLoad?: boolean }
  | { type: 'click'; locator: LocatorSpec }
  | { type: 'fill'; locator: LocatorSpec; value: ValueSpec }
  | { type: 'select'; locator: LocatorSpec; option: string }
  | { type: 'check'; locator: LocatorSpec }
  | { type: 'uncheck'; locator: LocatorSpec }
  | { type: 'upload'; locator: LocatorSpec; files: string[] }
  | { type: 'press'; key: string }
  | { type: 'hover'; locator: LocatorSpec }
  | { type: 'expectVisible'; locator: LocatorSpec; timeout?: number }
  | { type: 'expectNotVisible'; locator: LocatorSpec }
  | { type: 'expectText'; locator: LocatorSpec; text: string | RegExp }
  | { type: 'expectValue'; locator: LocatorSpec; value: string }
  | { type: 'expectURL'; pattern: string | RegExp }
  | { type: 'expectTitle'; title: string }
  | { type: 'waitForURL'; pattern: string | RegExp }
  | { type: 'waitForResponse'; urlPattern: string }
  | { type: 'waitForToast'; type: 'success' | 'error' | 'info' }
  | { type: 'waitForLoading'; timeout?: number }
  | { type: 'callModule'; module: string; method: string; args?: any[] }
  | { type: 'blocked'; reason: string };

export interface LocatorSpec {
  strategy: 'role' | 'label' | 'text' | 'testid' | 'css';
  value: string;
  options?: {
    name?: string;
    exact?: boolean;
    level?: number;
  };
}

export interface ValueSpec {
  type: 'literal' | 'actor' | 'runId' | 'generated';
  value: string;
}

export interface IRStep {
  id: string;           // AC-1, AC-2, etc.
  description: string;  // Human-readable
  actions: IRPrimitive[];
  assertions: IRPrimitive[];
}

export interface IRJourney {
  id: string;
  title: string;
  tier: 'smoke' | 'release' | 'regression';
  scope: string;
  actor: string;
  tags: string[];
  setup?: IRPrimitive[];
  steps: IRStep[];
  cleanup?: IRPrimitive[];
  moduleDependencies: {
    foundation: string[];
    feature: string[];
  };
}
```

### 1.3 Module-First Generation

**Rule:** Tests do NOT own locators. Modules do.

```typescript
// Generated test (calls modules)
import { test, expect } from '@artk/core/fixtures';
import { dashboard } from '../modules/feature/dashboard';

test('JRN-0001: User views dashboard @JRN-0001 @smoke', async ({
  authenticatedPage,
  runId,
}) => {
  await test.step('AC-1: Navigate to dashboard', async () => {
    await dashboard.navigateTo(authenticatedPage);
    await dashboard.expectLoaded(authenticatedPage);
  });

  await test.step('AC-2: See welcome message', async () => {
    await dashboard.expectWelcomeMessage(authenticatedPage);
  });
});

// Generated module (owns locators)
// modules/feature/dashboard/index.ts
import { Page, expect } from '@playwright/test';

export const dashboard = {
  // Locators (encapsulated)
  locators: {
    heading: (page: Page) => page.getByRole('heading', { name: 'Dashboard', level: 1 }),
    welcome: (page: Page) => page.getByRole('heading', { name: /welcome/i }),
    nav: (page: Page) => page.getByRole('navigation'),
  },

  // Actions
  async navigateTo(page: Page) {
    await page.goto('/dashboard');
  },

  // Assertions
  async expectLoaded(page: Page) {
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(this.locators.heading(page)).toBeVisible();
  },

  async expectWelcomeMessage(page: Page) {
    await expect(this.locators.welcome(page)).toBeVisible();
  },
};
```

---

## Part 2: Selector Catalog

### 2.1 Catalog Structure

```json
// artifacts/selectors.catalog.json
{
  "version": "1.0",
  "generatedAt": "2026-01-02T10:00:00Z",
  "sources": ["testid-scan", "component-library", "existing-tests"],
  "entries": {
    "dashboard": {
      "heading": { "strategy": "role", "role": "heading", "name": "Dashboard", "level": 1 },
      "welcome": { "strategy": "role", "role": "heading", "name": "/welcome/i" },
      "nav": { "strategy": "role", "role": "navigation" },
      "settingsLink": { "strategy": "role", "role": "link", "name": "Settings" }
    },
    "forms": {
      "submitButton": { "strategy": "role", "role": "button", "name": "Submit" },
      "emailField": { "strategy": "label", "label": "Email" },
      "passwordField": { "strategy": "label", "label": "Password" }
    },
    "common": {
      "loadingSpinner": { "strategy": "testid", "testid": "loading-spinner" },
      "toast": { "strategy": "role", "role": "alert" }
    }
  }
}
```

### 2.2 Catalog Generation

Run during `/discover-foundation`:

```bash
npx artk catalog generate --scan-testid --scan-routes --output artifacts/selectors.catalog.json
```

---

## Part 3: Evidence Capture (Non-MCP "Eyes")

### 3.1 ARIA Snapshot Helper

```typescript
// core/autogen/src/verify/evidence.ts
import { Page, TestInfo } from '@playwright/test';

export async function captureEvidence(page: Page, testInfo: TestInfo) {
  // ARIA snapshot - textual representation of UI
  const ariaSnapshot = await page.locator('body').ariaSnapshot();
  await testInfo.attach('aria-snapshot', {
    body: ariaSnapshot,
    contentType: 'text/plain',
  });

  // URL
  await testInfo.attach('url', {
    body: page.url(),
    contentType: 'text/plain',
  });

  // Console errors
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  if (consoleErrors.length > 0) {
    await testInfo.attach('console-errors', {
      body: consoleErrors.join('\n'),
      contentType: 'text/plain',
    });
  }
}
```

### 3.2 Trace Configuration

```typescript
// playwright.config.ts (generated by discover-foundation)
export default defineConfig({
  use: {
    trace: 'on-first-retry',  // Preferred
    // OR: 'retain-on-failure' for local debugging
  },
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/report.json' }],  // For verify/heal loop
  ],
});
```

---

## Part 4: Healing System

### 4.1 Healing Rules

```typescript
// core/autogen/src/heal/rules.ts
export const HEALING_RULES = {
  allowed: [
    'upgrade-selector-to-role',      // CSS → getByRole
    'upgrade-selector-to-label',     // CSS → getByLabel
    'upgrade-selector-to-testid',    // CSS → getByTestId
    'add-explicit-wait',             // Add waitForURL, waitForResponse
    'add-loading-wait',              // Add waitForLoadingComplete
    'add-toast-wait',                // Add expectToast
    'increase-timeout',              // Increase assertion timeout
    'add-url-assertion',             // Add URL check before interaction
    'add-runid-namespace',           // Add data isolation
    'fix-strict-mode',               // Narrow selector for strict mode
  ],
  forbidden: [
    'add-sleep',                     // waitForTimeout NEVER allowed
    'add-force-click',               // force: true NEVER allowed
    'delete-assertion',              // Cannot remove assertions
    'weaken-assertion',              // Cannot make assertions less strict
    'change-journey-text',           // Cannot modify contract
    'use-network-idle',              // networkidle is unreliable
  ],
};
```

### 4.2 Healing Loop

```typescript
// core/autogen/src/heal/loop.ts
export interface HealResult {
  success: boolean;
  attemptsUsed: number;
  fixes: HealFix[];
  finalStatus: 'pass' | 'fail' | 'blocked' | 'flaky';
  evidence?: {
    traces: string[];
    ariaSnapshots: string[];
    report: string;
  };
}

export async function healLoop(
  journeyId: string,
  options: {
    maxAttempts: number;  // 1=quick, 2=standard, 3=max
    mode: 'quick' | 'standard' | 'max';
  }
): Promise<HealResult> {
  const fixes: HealFix[] = [];
  let attempts = 0;

  while (attempts < options.maxAttempts) {
    attempts++;

    // 1. Run tests
    const result = await runPlaywright(journeyId);

    if (result.status === 'pass') {
      // 2. Stability gate (except quick mode)
      if (options.mode !== 'quick') {
        const stable = await runStabilityGate(journeyId);
        if (!stable) {
          return { success: false, attemptsUsed: attempts, fixes, finalStatus: 'flaky' };
        }
      }
      return { success: true, attemptsUsed: attempts, fixes, finalStatus: 'pass' };
    }

    // 3. Classify failure
    const failure = await classifyFailure(result);

    // 4. Check if blocked
    if (failure.category === 'ENV' || failure.category === 'APP_BUG') {
      return {
        success: false,
        attemptsUsed: attempts,
        fixes,
        finalStatus: 'blocked',
        evidence: result.evidence,
      };
    }

    // 5. Attempt heal
    const fix = await attemptFix(failure);
    if (!fix) {
      return { success: false, attemptsUsed: attempts, fixes, finalStatus: 'blocked' };
    }

    fixes.push(fix);
    await applyFix(fix);
  }

  return { success: false, attemptsUsed: attempts, fixes, finalStatus: 'fail' };
}
```

---

## Part 5: Journey Format Extension

### 5.1 Machine Hints in Clarified Journeys

```yaml
---
id: JRN-0001
title: User can view dashboard
status: clarified
tier: smoke
scope: dashboard
actor: standard_user
modules:
  foundation: [auth, navigation]
  feature: [dashboard]
---

## Acceptance Criteria

### AC-1: User navigates to dashboard
- Navigate to /dashboard
- See heading "Dashboard" (role=heading, level=1)
- URL contains "/dashboard"

### AC-2: User sees welcome message
- See "Welcome" heading (role=heading, name=/welcome/i)

### AC-3: Navigation is available
- See navigation menu (role=navigation)
- See "Settings" link (role=link)
```

### 5.2 Glossary Configuration

```yaml
# journeys/journeys.config.yml
glossary:
  synonyms:
    "log in": auth.login
    "sign in": auth.login
    "logout": auth.logout
    "sign out": auth.logout
  labelAliases:
    "Submit": ["Submit", "Save", "Continue", "Confirm"]
    "Cancel": ["Cancel", "Close", "Dismiss"]
  defaultLocatorPreference: role  # role | testid | label
  testIdAttribute: data-testid    # or data-qa, data-test, etc.
```

---

## Part 6: Prompt Updates

### 6.1 New Instruction File

Create `.github/instructions/artk-autogen.instructions.md`:

```markdown
---
applyTo: "artk-e2e/**/*.ts"
---

# ARTK AutoGen Rules

## Code Generation
- ALL code generation goes through IR (Intermediate Representation)
- Prompts NEVER write Playwright code directly
- Tests call modules; modules own locators

## Selector Priority
1. getByRole() - highest priority
2. getByLabel() - for form fields
3. getByText() - for content
4. getByTestId() - when role/label unavailable
5. CSS/XPath - LAST RESORT, must be in module with TODO

## Forbidden Patterns
- waitForTimeout() - NEVER
- force: true - NEVER
- networkidle - NEVER
- Direct @playwright/test imports in tests

## Healing Rules
- Can: upgrade selectors, add waits, add data isolation
- Cannot: delete assertions, weaken AC, add sleeps
```

### 6.2 Prompt Updates Summary

| Prompt | Updates |
|--------|---------|
| `/discover-foundation` | Add catalog generation, eslint setup, ARIA helper |
| `/journey-implement` | Orchestrate: generate → validate → verify → heal |
| `/journey-validate` | Add lint checks, AC→step mapping, module registry |
| `/journey-verify` | Add ARIA capture, JSON parsing, heal loop integration |

---

## Part 7: Implementation Phases

### Phase 1: IR + Step Mapping (Week 1)
- [ ] Create `core/typescript/autogen/` structure
- [ ] Implement IR types and builder
- [ ] Implement step mapper (text → IR)
- [ ] Implement glossary loader
- [ ] Add tests for mapping

### Phase 2: Codegen + Modules (Week 2)
- [ ] Implement module generator
- [ ] Implement test generator (IR → code)
- [ ] Implement AST-based editing (ts-morph)
- [ ] Add templates
- [ ] Add tests for codegen

### Phase 3: Selector Catalog (Week 3)
- [ ] Implement catalog schema
- [ ] Implement testid scanner
- [ ] Implement catalog querying
- [ ] Add catalog generation to `/discover-foundation`

### Phase 4: Verify + Heal (Week 4)
- [ ] Implement Playwright runner wrapper
- [ ] Implement JSON report parser
- [ ] Implement failure classifier
- [ ] Implement ARIA snapshot capture
- [ ] Implement healing loop with rules
- [ ] Add tests for verify/heal

### Phase 5: Prompt Integration (Week 5)
- [ ] Update `/discover-foundation` prompt
- [ ] Update `/journey-implement` prompt
- [ ] Update `/journey-validate` prompt
- [ ] Update `/journey-verify` prompt
- [ ] Create `.github/instructions/artk-autogen.instructions.md`

### Phase 6: Testing + Documentation (Week 6)
- [ ] End-to-end testing on ITSS project
- [ ] Update PLAYBOOK.md with autogen section
- [ ] Update CLAUDE.md with autogen commands
- [ ] Create migration guide for existing tests

---

## Success Criteria

### Generation Quality
- [ ] 90%+ of clarified Journey steps map to valid IR
- [ ] Generated tests pass `/journey-validate` on first run
- [ ] Selectors use role/label in 80%+ of cases
- [ ] Zero `waitForTimeout()` in generated code

### Healing Effectiveness
- [ ] Healing loop fixes 70%+ of selector issues
- [ ] Healing never introduces forbidden patterns
- [ ] All healing attempts logged with evidence
- [ ] Blocked issues have clear remediation steps

### Stability
- [ ] Generated tests pass stability gate (repeat-each=2)
- [ ] Flaky tests detected and quarantined
- [ ] No regression in existing test suites

---

## References

- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [ARIA Snapshots](https://playwright.dev/docs/aria-snapshots)
- [eslint-plugin-playwright](https://github.com/playwright-community/eslint-plugin-playwright)
- [ts-morph](https://ts-morph.com/) - TypeScript AST manipulation
- OpenAI Review: `research/2026-01-02_openai-review-autogen-plan.md`
