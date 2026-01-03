# GitHub Copilot Instructions for ARTK Projects

These instructions guide GitHub Copilot when suggesting code in ARTK-enabled Playwright test projects. Following these rules ensures generated code is stable, maintainable, and follows ARTK conventions.

## Selector Priority (MUST follow)

When suggesting locators for Playwright, use this priority order:

1. **Role-based** (preferred): `page.getByRole('button', { name: 'Submit' })`
2. **Label-based**: `page.getByLabel('Email Address')`
3. **Placeholder-based**: `page.getByPlaceholder('Enter email')`
4. **Test ID**: `page.getByTestId('submit-button')`
5. **Text content**: `page.getByText('Welcome')` (with caution)
6. **CSS/XPath** (last resort): Only when no semantic selector exists

**Good examples:**
```typescript
// ✅ Role-based with accessible name
await page.getByRole('button', { name: 'Submit' }).click();
await page.getByRole('textbox', { name: 'Email' }).fill('user@test.com');
await page.getByRole('heading', { level: 1 }).toContainText('Dashboard');

// ✅ Label-based for form fields
await page.getByLabel('Password').fill('secret123');

// ✅ TestId when semantic locators aren't available
await page.getByTestId('custom-widget').click();
```

**Bad examples (avoid):**
```typescript
// ❌ CSS class selectors
await page.locator('.submit-btn').click();

// ❌ XPath
await page.locator('//button[@class="primary"]').click();

// ❌ Nth selectors without context
await page.locator('button').nth(2).click();

// ❌ Text matching that's too fragile
await page.locator('text=Click here').click();
```

## Forbidden Patterns (NEVER suggest)

These patterns cause flaky tests and MUST NOT be suggested:

```typescript
// ❌ NEVER: Time-based waits
await page.waitForTimeout(1000);

// ❌ NEVER: Force click (hides real issues)
await button.click({ force: true });

// ❌ NEVER: Debug pauses in production code
await page.pause();

// ❌ NEVER: Focused tests
test.only('my test', async () => { ... });

// ❌ NEVER: Hardcoded URLs
await page.goto('http://localhost:3000/login');

// ❌ NEVER: NetworkIdle (unreliable)
await page.goto('/path', { waitUntil: 'networkidle' });

// ❌ NEVER: Deprecated navigation waits
await page.waitForNavigation();
await page.waitForSelector('.loaded');
```

## Required Patterns (ALWAYS use)

### Import from ARTK Core
```typescript
// ✅ MUST: Use ARTK Core fixtures
import { test, expect } from '@artk/core/fixtures';

// ❌ FORBIDDEN: Direct Playwright imports
import { test } from '@playwright/test';  // DON'T DO THIS
```

### Web-First Assertions
```typescript
// ✅ Auto-waiting assertions
await expect(page.getByRole('heading')).toBeVisible();
await expect(page.getByText('Success')).toContainText('saved');

// ❌ Manual waiting
const heading = await page.locator('h1');
if (await heading.isVisible()) { ... }
```

### Async Completion Signals
```typescript
// ✅ Poll for async operations
await expect.poll(async () => {
  return page.getByTestId('status').textContent();
}, { timeout: 10000 }).toBe('Complete');

// ✅ Use toPass for retrying assertions
await expect(async () => {
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByText('Success')).toBeVisible();
}).toPass({ timeout: 15000 });
```

### Data Isolation
```typescript
// ✅ Use runId for unique test data
test('create user', async ({ authenticatedPage, runId }) => {
  const email = `test-${runId}@example.com`;
  await authenticatedPage.getByLabel('Email').fill(email);
});

// ❌ Hardcoded test data (causes collisions)
const email = 'test@example.com';  // DON'T DO THIS
```

## Module-First Rules

### Use Core Fixtures
```typescript
// ✅ Use provided fixtures
test('user flow', async ({ authenticatedPage, config, runId, testData }) => {
  // authenticatedPage: Already logged in
  // config: ARTK configuration
  // runId: Unique test run ID
  // testData: Cleanup manager
});
```

### Reuse Modules
```typescript
// ✅ Import from foundation/feature modules
import { auth } from '@/modules/foundation/auth';
import { navigation } from '@/modules/foundation/navigation';

// ✅ Call module methods
await auth.login(page, { role: 'admin' });
await navigation.goToPath(page, '/dashboard');
```

### Test Structure
```typescript
// ✅ Always use test.step for traceability
test('JRN-0001: User login @JRN-0001 @smoke @scope-auth', async ({ page }) => {
  await test.step('Navigate to login page', async () => {
    await page.goto('/login');
  });

  await test.step('AC-1: Enter credentials', async () => {
    await page.getByLabel('Email').fill('user@test.com');
    await page.getByLabel('Password').fill('password');
  });

  await test.step('AC-2: Submit and verify', async () => {
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });
});
```

## Tagging Requirements

All tests MUST include these tags:

```typescript
// ✅ Required tags
test('JRN-0001: Description @JRN-0001 @smoke @scope-auth', ...);
//                          ^^^^^^^^^ ^^^^^^ ^^^^^^^^^^^
//                          Journey   Tier   Scope
```

- `@JRN-####`: Links to Journey ID (required)
- `@smoke`/`@release`/`@regression`: Test tier (required)
- `@scope-<name>`: Feature scope (required)

## URL and Environment

```typescript
// ✅ Use relative paths - baseURL comes from config
await page.goto('/dashboard');
await page.goto('/users/123');

// ✅ Access config via fixture
test('example', async ({ authenticatedPage, config }) => {
  console.log('Testing against:', config.app.name);
});

// ❌ NEVER hardcode URLs
await page.goto('http://localhost:3000/dashboard');
await page.goto('https://staging.example.com/users');
```

## Error Handling

```typescript
// ✅ Let assertions fail naturally with good messages
await expect(page.getByRole('alert'))
  .toHaveText('Operation successful', { timeout: 5000 });

// ✅ Use soft assertions for non-blocking checks
await expect.soft(page.getByText('Optional')).toBeVisible();

// ❌ Don't catch and suppress errors
try {
  await button.click();
} catch (e) {
  console.log('Ignored');  // DON'T DO THIS
}
```

## Machine Hints (Optional Enhancement)

When writing Journey steps, support machine hints for explicit locators:

```markdown
- User clicks "Submit" button (role=button) (testid=submit-btn)
- User enters email (label="Email Address") (exact=true)
- User sees heading (role=heading) (level=1)
```

Hint types:
- `(role=button)` - ARIA role
- `(testid=my-id)` - Test ID
- `(label="Field")` - Form label
- `(text="Content")` - Text content
- `(exact=true)` - Exact matching
- `(level=1)` - Heading level
- `(wait=networkidle)` - Wait strategy
- `(timeout=5000)` - Custom timeout
