# @artk/core-autogen

Deterministic test generation engine for transforming clarified Journey markdown files into Playwright E2E tests.

## Overview

`@artk/core-autogen` is part of the ARTK (Automatic Regression Testing Kit) ecosystem. It provides:

- **Deterministic Generation**: Same input always produces same output
- **Journey-to-Test Pipeline**: Parse Journey markdown → Normalize to IR → Generate Playwright tests
- **Validation**: Static code analysis with forbidden pattern detection and ESLint integration
- **Verification**: Run generated tests and classify failures
- **Healing**: Automatically fix common test failures with bounded retry loops

## Installation

```bash
npm install @artk/core-autogen
```

### Peer Dependencies

```bash
npm install @playwright/test @artk/core
```

## Node.js Version Support

@artk/core-autogen ships **4 build variants** to support different Node.js versions and module systems:

| Variant | Node.js | Playwright | Module System | ES Target |
|---------|---------|------------|---------------|-----------|
| **modern-esm** | 18, 20, 22 (LTS) | 1.57.x | ESM | ES2022 |
| **modern-cjs** | 18, 20, 22 (LTS) | 1.57.x | CommonJS | ES2022 |
| **legacy-16** | 16, 18, 20 (LTS) | 1.49.x | CommonJS | ES2021 |
| **legacy-14** | 14.18+, 16, 18 (LTS) | 1.33.x | CommonJS | ES2020 |

### Important Notes

**CLI Requirements**:
- The `artk-autogen` CLI requires **Node.js 18+** (uses `node:util.parseArgs`)
- Legacy Node users should use pre-built artifacts via ARTK bootstrap, not the CLI directly

**Node 14 Support**:
- Requires Node **14.18.0+** (not 14.0.0-14.17.x)
- Earlier versions lack support for `node:` prefixed imports
- This is a minor limitation as most Node 14 users are on 14.18+

**Variant Selection**:
- ARTK bootstrap automatically detects your Node version and installs the correct variant
- Manual override: `artk init --variant legacy-16`
- Context stored in `.artk/context.json`

### Feature Availability by Variant

Some Playwright features are not available in legacy variants:

| Feature | modern-* | legacy-16 | legacy-14 |
|---------|----------|-----------|-----------|
| `page.clock` API | Yes | Yes | No (use `page.evaluate`) |
| `locator.or()` | Yes | Yes | No (use CSS `:is()`) |
| `locator.and()` | Yes | Yes | No (use `filter()`) |
| `expect.soft()` | Yes | Yes | No (collect manually) |
| ARIA snapshots | Yes | Yes | No (query manually) |

When generating tests for legacy variants, the system automatically uses compatible alternatives.

## Quick Start

### Generate Tests from Journey Files

```typescript
import { generateJourneyTests } from '@artk/core-autogen';

const result = await generateJourneyTests({
  journeys: ['journeys/login.md', 'journeys/checkout.md'],
  isFilePaths: true,
  generateModules: true,
});

for (const test of result.tests) {
  console.log(`Generated: ${test.filename}`);
}
```

### Validate Generated Code

```typescript
import { validateJourney } from '@artk/core-autogen';

const result = await validateJourney('journeys/login.md', {
  runLint: true,
});

if (result.valid) {
  console.log('Validation passed!');
} else {
  console.log('Issues:', result.issues);
}
```

### Verify Tests by Running Them

```typescript
import { verifyJourney } from '@artk/core-autogen';

const result = await verifyJourney('journeys/login.md', {
  heal: true,          // Enable automatic healing
  checkStability: true, // Run multiple times to detect flaky tests
});

console.log(`Status: ${result.status}`);
console.log(`Passed: ${result.counts.passed}/${result.counts.total}`);
```

## CLI Usage

```bash
# Generate tests
npx artk-autogen generate journeys/*.md -o tests/e2e --modules

# Validate
npx artk-autogen validate journeys/*.md --lint

# Verify (run tests)
npx artk-autogen verify journeys/login.md --heal
```

## Journey Format

Journeys are markdown files with YAML frontmatter:

```markdown
---
id: JRN-0001
title: User Login Flow
status: clarified
tier: smoke
scope: login
actor: registered-user
---

## Acceptance Criteria

- AC1: User can enter credentials
- AC2: User is redirected to dashboard on success

## Steps

1. Navigate to the login page
2. Enter "test@example.com" in the email field
3. Enter "password123" in the password field
4. Click the "Sign In" button
5. Verify the dashboard is displayed
```

### Machine Hints

Enhance step mapping with inline hints:

```markdown
3. Click the submit button (role=button, name="Submit")
4. Enter email in the input (testid=email-input)
5. Wait for the page to load (wait=networkidle)
```

Supported hints:
- `(role=button)` - ARIA role
- `(testid=id)` - data-testid attribute
- `(label="Text")` - Accessible label
- `(exact=true)` - Exact text matching
- `(level=N)` - Heading level
- `(timeout=ms)` - Custom timeout
- `(wait=strategy)` - Wait strategy: `idle`, `visible`, `networkidle`
- `(module=name.method)` - Use module method

## Architecture

```
Journey.md → Parse → IR → Generate → Test.spec.ts
                              ↓
                         Validate → ESLint/Patterns
                              ↓
                         Verify → Run Playwright
                              ↓
                         Heal → Fix & Retry
```

### Selector Priority

Generated tests use selectors in this priority order:

1. `testid` - `page.getByTestId('id')`
2. `role` - `page.getByRole('button', { name: 'Submit' })`
3. `label` - `page.getByLabel('Email')`
4. `text` - `page.getByText('Welcome')`
5. `css` - Last resort, tracked as technical debt

### Forbidden Patterns

The validator rejects tests using:
- `waitForTimeout` - Use assertions instead
- `force: true` - Fix underlying accessibility issues
- `page.pause()` - Not allowed in automated tests
- `.only()` - Prevents test suite isolation
- XPath selectors - Use semantic locators

## API Reference

### Main Functions

| Function | Description |
|----------|-------------|
| `generateJourneyTests()` | Generate tests from Journey files |
| `validateJourney()` | Validate generated test code |
| `verifyJourney()` | Run and verify generated tests |
| `parseAndNormalize()` | Parse Journey and normalize to IR |

### Types

```typescript
import type {
  IRJourney,
  IRStep,
  LocatorSpec,
  AutogenConfig,
  GenerateTestResult,
  ValidateJourneyResult,
  VerifyJourneyResult,
} from '@artk/core-autogen';
```

### Selector Catalog

Manage reusable selectors:

```typescript
import {
  scanForTestIds,
  loadCatalog,
  suggestSelector,
  generateDebtReport
} from '@artk/core-autogen';

// Scan source files for testids
const result = await scanForTestIds({ sourceDir: './src' });

// Suggest best selector for an element
const selector = suggestSelector('login button');

// Generate CSS debt report
const report = generateDebtReport();
```

## Configuration

Create `autogen.config.yml`:

```yaml
# AutoGen configuration
outputDir: tests/generated
modulesDir: tests/modules

# Glossary for domain-specific terms
glossary:
  synonyms:
    - terms: [login, sign in, log in]
      canonical: login
    - terms: [homepage, home page, landing]
      canonical: homepage

  labelAliases:
    - label: Username
      testid: username-input
    - label: Password
      role: textbox
      selector: '[name="password"]'

# Selector catalog
catalog:
  testIdAttribute: data-testid
  sourceDir: ./src
```

## Error Codes

| Code | Description |
|------|-------------|
| `JOURNEY_PARSE_ERROR` | Failed to parse Journey markdown |
| `FORBIDDEN_PATTERN` | Code uses forbidden pattern |
| `MISSING_AC_COVERAGE` | Acceptance criteria not covered |
| `SELECTOR_UNSTABLE` | Using unstable CSS selector |
| `LINT_ERROR` | ESLint rule violation |

See [docs/errors.md](./docs/errors.md) for full error reference.

## Contributing

1. Clone the repository
2. Install dependencies: `npm install`
3. Run tests: `npm test`
4. Build: `npm run build`

## License

MIT
