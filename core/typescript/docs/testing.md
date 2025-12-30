# Test File Organization

This document describes the conventions for organizing and naming test files in ARTK Core.

## Directory Structure

### Unit Tests

**Location:** `<module>/__tests__/*.test.ts`

Unit tests are co-located with the module they test, inside a `__tests__` directory.

**Examples:**
```
config/__tests__/loader.test.ts
config/__tests__/validator.test.ts
auth/__tests__/oidc-provider.test.ts
fixtures/__tests__/loader.test.ts
```

**Benefits:**
- Easy to find tests related to specific modules
- Clear module ownership
- Supports focused testing during development

### Integration Tests

**Location:** `tests/integration/*.test.ts`

Integration tests live in a top-level `tests/integration` directory, separate from the source code.

**Examples:**
```
tests/integration/config-to-harness.test.ts
tests/integration/oidc-totp-flow.test.ts
tests/integration/auth-session-persistence.test.ts
```

**Benefits:**
- Clear separation from unit tests
- Tests cross-module workflows
- Easier to run integration tests separately

## Naming Conventions

### Unit Tests

**Pattern:** `<subject>.test.ts`

Where `<subject>` is the name of the class, function, or module being tested.

**Examples:**
- `loader.test.ts` - Tests for `loader.ts`
- `oidc-provider.test.ts` - Tests for `OIDCAuthProvider` class
- `validator.test.ts` - Tests for validation functions
- `logger.test.ts` - Tests for logger utility

**Guidelines:**
- Use kebab-case for filenames
- Match the source file name when possible
- One test file per source file (in most cases)

### Integration Tests

**Pattern:** `<flow-name>.test.ts`

Where `<flow-name>` describes the workflow or scenario being tested.

**Examples:**
- `config-to-harness.test.ts` - Tests configuration loading into test harness
- `oidc-totp-flow.test.ts` - Tests complete OIDC login with TOTP MFA
- `auth-session-persistence.test.ts` - Tests auth session across page reloads
- `data-cleanup-lifecycle.test.ts` - Tests full data cleanup lifecycle

**Guidelines:**
- Use kebab-case for filenames
- Name describes the user journey or system flow
- Focus on end-to-end scenarios
- Can span multiple modules

## Running Tests

### Run All Tests
```bash
npm run test
```

### Run Unit Tests Only
```bash
npm run test -- --testPathPattern="__tests__"
```

### Run Integration Tests Only
```bash
npm run test -- --testPathPattern="tests/integration"
```

### Run Specific Test File
```bash
npm run test -- <path-to-test-file>
```

## Test Organization Best Practices

1. **Keep unit tests focused** - Test one thing per test case
2. **Name tests descriptively** - Test names should read like requirements
3. **Use setup/teardown** - Leverage `beforeEach`/`afterEach` for common setup
4. **Mock external dependencies** - Unit tests should be isolated
5. **Integration tests should be realistic** - Use real configurations when possible
6. **Avoid test interdependencies** - Each test should run independently

## Examples

### Good Unit Test Structure
```typescript
// config/__tests__/loader.test.ts
import { describe, it, expect } from 'vitest';
import { loadConfig } from '../loader.js';

describe('loadConfig', () => {
  it('should load valid config file', () => {
    const config = loadConfig({ configPath: 'fixtures/valid.yml' });
    expect(config.app.name).toBe('Test App');
  });

  it('should throw on invalid schema', () => {
    expect(() => loadConfig({ configPath: 'fixtures/invalid.yml' }))
      .toThrow('Config validation failed');
  });
});
```

### Good Integration Test Structure
```typescript
// tests/integration/oidc-totp-flow.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { test } from '@playwright/test';
import { OIDCAuthProvider } from '../../auth/index.js';

describe('OIDC + TOTP Flow', () => {
  it('should complete full OIDC login with TOTP MFA', async () => {
    // Test the complete flow from login page to authenticated state
    // Including OIDC redirect, TOTP entry, and callback handling
  });
});
```

## Coverage Requirements

- **Unit tests:** Aim for 80%+ code coverage
- **Integration tests:** Cover critical user flows and error scenarios
- **Edge cases:** Both unit and integration tests should cover error conditions

## Further Reading

- [Custom Auth Providers](./custom-auth-providers.md) - How to implement custom authentication
- [Data Cleanup](./data-cleanup.md) - Test data cleanup patterns
- [Playwright Testing Guide](https://playwright.dev/docs/intro)
- [Vitest Documentation](https://vitest.dev/)
