# Quickstart: ARTK Core v1 Infrastructure Library

**Date**: 2025-12-29
**Feature**: 001-artk-core-v1

## Overview

ARTK Core v1 is a vendorable Playwright infrastructure library that provides config-driven setup, OIDC authentication, pre-built fixtures, accessibility-first locators, and common assertion helpers.

## Prerequisites

- Node.js 18.0.0 or higher
- Playwright 1.57.0 or higher
- Access to OIDC Identity Provider (if using OIDC auth)
- Test user accounts with credentials available as environment variables

## Installation

ARTK Core is **vendored** (copied) into your project, not installed via npm.

```bash
# Copy ARTK Core to your project
cp -r /path/to/ARTK/core/typescript/ your-project/artk/.core/
```

Target directory structure:
```
your-project/
├── artk/
│   ├── .core/                 # Vendored ARTK Core (DO NOT EDIT)
│   ├── artk.config.yml        # Your project configuration
│   ├── playwright.config.ts   # Generated config
│   └── src/                   # Project-specific code
└── ...
```

## Configuration

Create `artk/artk.config.yml`:

```yaml
version: 1

app:
  name: MyApp
  baseUrl: ${APP_BASE_URL:-http://localhost:3000}

auth:
  provider: oidc

  storageState:
    directory: .auth-states
    maxAgeMinutes: 60

  roles:
    admin:
      credentialsEnv:
        username: APP_ADMIN_USER
        password: APP_ADMIN_PASS
    standardUser:
      credentialsEnv:
        username: APP_USER_EMAIL
        password: APP_USER_PASS

  oidc:
    idpType: keycloak  # or azure-ad, okta, auth0, generic
    loginUrl: /auth/login
    success:
      url: /dashboard
    mfa:
      enabled: false

selectors:
  testIdAttribute: data-testid
  strategy:
    - role
    - label
    - testid
    - text

fixtures:
  defaultRole: standardUser
  roleFixtures:
    - admin
    - standardUser

tiers:
  smoke:
    retries: 0
    workers: 1
    timeout: 30000
  release:
    retries: 2
    workers: 4
    timeout: 60000
  regression:
    retries: 2
    workers: 8
    timeout: 120000
```

## Playwright Config

Create `artk/playwright.config.ts`:

```typescript
import { createPlaywrightConfig } from './.core/harness';

export default createPlaywrightConfig();
```

## Environment Variables

Create `.env.local` (never commit):

```bash
# Base URL
APP_BASE_URL=http://localhost:3000

# Admin credentials
APP_ADMIN_USER=admin@example.com
APP_ADMIN_PASS=secret

# User credentials
APP_USER_EMAIL=user@example.com
APP_USER_PASS=secret

# MFA (if enabled)
APP_TOTP_SECRET=BASE32SECRET
```

## Writing Tests

### Basic Authenticated Test

```typescript
// artk/tests/journeys/smoke/dashboard.spec.ts
import { test, expect } from '../../.core/fixtures';

test('@JRN-0001 User can view dashboard', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/dashboard');
  await expect(authenticatedPage.locator('h1')).toHaveText('Dashboard');
});
```

### Role-Specific Test

```typescript
import { test, expect } from '../../.core/fixtures';

test('Admin can access settings', async ({ adminPage }) => {
  await adminPage.goto('/admin/settings');
  await expect(adminPage.locator('[data-testid="settings-panel"]')).toBeVisible();
});
```

### Using Locators

```typescript
import { test, expect } from '../../.core/fixtures';
import { byRole, byLabel, byTestId, withinForm } from '../../.core/locators';

test('User can submit form', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/orders/new');

  // Accessibility-first locators
  await byRole(authenticatedPage, 'textbox', { name: 'Order Name' }).fill('Test Order');
  await byLabel(authenticatedPage, 'Priority').selectOption('high');
  await byRole(authenticatedPage, 'button', { name: 'Submit' }).click();

  // Or using scoped locators
  const form = withinForm(authenticatedPage, 'order-form');
  await form.field('name').fill('Test Order');
  await form.submit().click();
});
```

### Using Assertions

```typescript
import { test, expect } from '../../.core/fixtures';
import {
  expectToast,
  expectTableToContainRow,
  waitForLoadingComplete,
} from '../../.core/assertions';

test('User can create order', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/orders/new');

  // Fill form and submit
  await authenticatedPage.fill('[data-testid="name"]', 'Test Order');
  await authenticatedPage.click('[data-testid="submit"]');

  // Wait for loading
  await waitForLoadingComplete(authenticatedPage);

  // Check toast
  await expectToast(authenticatedPage, 'Order created', { type: 'success' });

  // Verify table
  await authenticatedPage.goto('/orders');
  await expectTableToContainRow(authenticatedPage, 'orders-table', {
    name: 'Test Order',
    status: 'Active',
  });
});
```

### Test Data Isolation

```typescript
import { test } from '../../.core/fixtures';
import { namespace } from '../../.core/data';

test('Create isolated test data', async ({ authenticatedPage, testData, runId }) => {
  const orderName = namespace('Test Order', runId);
  // orderName = 'Test Order [artk-abc123]'

  // Register cleanup
  testData.cleanup(async () => {
    // Cleanup runs after test (even on failure)
    await api.deleteOrderByName(orderName);
  });

  // Create order with namespaced name
  await authenticatedPage.goto('/orders/new');
  await authenticatedPage.fill('[data-testid="name"]', orderName);
  await authenticatedPage.click('[data-testid="submit"]');
});
```

## Running Tests

```bash
# Run all tests
npx playwright test --config=artk/playwright.config.ts

# Run smoke tests
ARTK_TIER=smoke npx playwright test --config=artk/playwright.config.ts

# Run specific browser
npx playwright test --config=artk/playwright.config.ts --project=chromium

# Run with specific environment
ARTK_ENV=staging npx playwright test --config=artk/playwright.config.ts
```

## Auth Setup

The first run will trigger authentication setup. Storage states are saved to `artk/.auth-states/`:

```
artk/.auth-states/
├── admin.json
└── standardUser.json
```

Subsequent runs reuse storage states until they expire (default: 60 minutes).

To force re-authentication:
```bash
rm -rf artk/.auth-states/
npx playwright test --config=artk/playwright.config.ts
```

## Module Reference

| Module | Import | Purpose |
|--------|--------|---------|
| fixtures | `from '../../.core/fixtures'` | `test`, `expect`, authenticated pages |
| locators | `from '../../.core/locators'` | `byRole`, `byLabel`, `byTestId`, scoped locators |
| assertions | `from '../../.core/assertions'` | `expectToast`, `expectTableToContainRow`, etc. |
| data | `from '../../.core/data'` | `namespace`, `DataBuilder`, cleanup |
| config | `from '../../.core/config'` | `loadConfig`, `getConfig` |

## Troubleshooting

### Auth Fails

1. Check credentials in environment variables
2. Verify IdP selectors match your login page
3. Check MFA configuration if MFA is enabled
4. Review `artk.config.yml` OIDC settings

### Storage State Expired

Storage states auto-expire after `maxAgeMinutes`. Re-run tests to trigger fresh auth.

### Locator Not Found

1. Check selector strategy order in config
2. Use `byRole` first (most stable)
3. Add `data-testid` attributes to elements
4. Check element visibility with Playwright Inspector

## Next Steps

1. Create Journey definitions in `artk/journeys/`
2. Run `/journey-implement` to generate tests from Journeys
3. Configure CI/CD to run tests (see documentation)
4. Set up multi-environment testing

## References

- [Feature Specification](spec.md)
- [Research Document](research.md)
- [Data Model](data-model.md)
- [API Contracts](contracts/)
