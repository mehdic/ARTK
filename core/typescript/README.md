# ARTK Core v1 - TypeScript Implementation

**Version**: 1.0.0
**Release Date**: 2025-12-29

## Overview

ARTK Core v1 is a vendorable Playwright infrastructure library that provides config-driven test setup, OIDC authentication with storage state management, pre-built fixtures, accessibility-first locators, common assertions, test data management, and journey-aware reporting.

## Architecture

This library is organized into 8 core modules:

- **config/** - Config System (YAML loading, validation, environment variable resolution)
- **auth/** - Auth System (OIDC providers, storage state management, MFA support)
- **fixtures/** - Test Fixtures (authenticatedPage, apiContext, testData, runId)
- **locators/** - Locator Utilities (accessibility-first element location strategies)
- **assertions/** - Assertion Helpers (toast, table, form, loading state assertions)
- **data/** - Data Harness (namespacing, cleanup, test isolation)
- **reporters/** - Reporters (journey mapping, PII masking, ARTK-specific formats)
- **harness/** - Playwright Harness (config factory, project setup)

## Requirements

- **Node.js**: 18.0.0 or higher
- **Playwright**: 1.40.0 or higher
- **TypeScript**: 5.3 or higher

## Dependencies

### Core Dependencies
- `@playwright/test` - Playwright testing framework
- `zod` - Schema validation
- `yaml` - YAML config parsing
- `otplib` - TOTP generation for MFA

### Dev Dependencies
- `typescript` - TypeScript compiler
- `vitest` - Unit testing framework
- `tsup` - Build tool
- `eslint` - Code linting
- `prettier` - Code formatting

## Development

### Install Dependencies

```bash
npm install
```

### Run Tests

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:unit
```

### Build

```bash
# Build the library for distribution
npm run build
```

### Linting and Formatting

```bash
# Lint code
npm run lint

# Fix lint issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check

# Type check
npm run typecheck
```

## Project Structure

```
core/typescript/
├── config/              # Config System module
├── harness/             # Playwright Harness module
├── auth/                # Auth System module
├── fixtures/            # Fixtures module
├── locators/            # Locators module
├── assertions/          # Assertions module
├── data/                # Data Harness module
├── reporters/           # Reporters module
├── types/               # Shared types
├── errors/              # Error classes
├── utils/               # Utilities
├── index.ts             # Main entry point
├── version.json         # Version tracking
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript config
├── vitest.config.ts     # Vitest config
├── tsup.config.ts       # tsup build config
├── .eslintrc.js         # ESLint config
└── .prettierrc          # Prettier config
```

## Installation

### Option 1: Git-based Installation (Recommended)

Install directly from the Git repository:

```bash
# Using npm
npm install git+https://github.com/mehdic/ARTK.git#main --save-dev

# Using yarn
yarn add git+https://github.com/mehdic/ARTK.git#main --dev

# Using pnpm
pnpm add git+https://github.com/mehdic/ARTK.git#main --save-dev
```

**Note:** The package is located at `core/typescript/` in the repo. If your package manager doesn't support subdirectory installs, use Option 2 or 3.

### Option 2: Local Path Installation

If you have the ARTK repository cloned locally:

```bash
# Navigate to your project
cd your-playwright-project

# Install from local path
npm install ../path/to/ARTK/core/typescript --save-dev
```

### Option 3: Vendoring (Full Control)

Copy the built library into your project for offline operation:

```bash
# Build the library
cd ARTK/core/typescript
npm install
npm run build

# Copy dist to your project
cp -r dist/ ../your-project/vendor/artk-core/
cp package.json ../your-project/vendor/artk-core/
cp version.json ../your-project/vendor/artk-core/
```

Then add to your project's `package.json`:
```json
{
  "dependencies": {
    "@artk/core": "file:./vendor/artk-core"
  }
}
```

## Quick Start

### 1. Create Configuration File

Create `artk.config.yml` in your project root:

```yaml
app:
  name: My Application
  type: spa
  baseUrl: ${APP_BASE_URL:-http://localhost:3000}

auth:
  provider: oidc
  idpType: keycloak
  loginUrl: /auth/realms/my-realm/protocol/openid-connect/auth
  roles:
    standard-user:
      credentialsEnv:
        username: APP_USER
        password: APP_PASSWORD

browsers:
  enabled:
    - chromium
  headless: true
```

### 2. Configure Playwright

Update your `playwright.config.ts`:

```typescript
import { loadConfig } from '@artk/core/config';
import { createPlaywrightConfig } from '@artk/core/harness';

const artkConfig = loadConfig();
export default createPlaywrightConfig(artkConfig);
```

### 3. Write Tests

```typescript
import { test, expect } from '@artk/core/fixtures';
import { expectToast } from '@artk/core/assertions';

test.describe('User Dashboard @JRN-0001 @smoke', () => {
  test('should display welcome message', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');

    const heading = authenticatedPage.getByRole('heading', { name: /welcome/i });
    await expect(heading).toBeVisible();
  });

  test('should show success notification', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');
    await authenticatedPage.getByRole('button', { name: 'Save' }).click();

    await expectToast(authenticatedPage, {
      message: 'Saved successfully',
      type: 'success'
    });
  });
});
```

### 4. Set Environment Variables

```bash
export APP_BASE_URL=https://my-app.example.com
export APP_USER=testuser
export APP_PASSWORD=testpass
```

### 5. Run Tests

```bash
npx playwright test
```

## Module Imports

ARTK Core uses module-specific imports to keep bundle sizes small and avoid type conflicts:

```typescript
// Configuration
import { loadConfig, getConfig } from '@artk/core/config';

// Fixtures (Playwright test + expect with ARTK enhancements)
import { test, expect } from '@artk/core/fixtures';

// Authentication
import { OIDCAuthProvider, saveStorageState } from '@artk/core/auth';

// Locators (accessibility-first)
import { locate, byRole, byLabel, byTestId } from '@artk/core/locators';

// Assertions (UI helpers)
import { expectToast, expectTableToContainRow, expectLoading } from '@artk/core/assertions';

// Data management
import { namespace, generateRunId, CleanupManager } from '@artk/core/data';

// Reporters
import { ARTKReporter, extractJourneyId } from '@artk/core/reporters';

// Harness (Playwright config)
import { createPlaywrightConfig, getTierSettings } from '@artk/core/harness';

// Errors
import { ARTKConfigError, ARTKAuthError } from '@artk/core/errors';

// Utilities
import { createLogger, withRetry } from '@artk/core/utils';
```

## Available Fixtures

When using `import { test } from '@artk/core/fixtures'`, these fixtures are available:

| Fixture | Description |
|---------|-------------|
| `authenticatedPage` | Pre-authenticated Playwright Page (default role) |
| `adminPage` | Page authenticated as admin role |
| `userPage` | Page authenticated as standard-user role |
| `config` | Loaded ARTK configuration |
| `runId` | Unique test run identifier for data namespacing |
| `testData` | Cleanup manager for test data |
| `apiContext` | Authenticated API request context |

## License

MIT

## Documentation

### Core Documentation
For complete documentation, see:
- `/specs/001-artk-core-v1/spec.md` - Feature specification
- `/specs/001-artk-core-v1/plan.md` - Implementation plan
- `/specs/001-artk-core-v1/tasks.md` - Task breakdown

### Guides
- [Custom Authentication Providers](docs/custom-auth-providers.md) - Implement custom auth flows (SAML, proprietary systems, etc.)
