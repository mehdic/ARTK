# Implementing Custom Authentication Providers

ARTK Core supports custom authentication providers for scenarios not covered by the built-in OIDC, Form, or Token providers. This guide shows you how to implement your own authentication provider.

## When to Use Custom Providers

Consider implementing a custom provider when:
- Your application uses a proprietary authentication mechanism
- You need SAML authentication
- You have complex multi-step authentication flows
- Your auth flow includes custom challenges (captcha, security questions, etc.)

Built-in providers cover most common cases:
- **OIDCAuthProvider**: OpenID Connect (Keycloak, Azure AD, Okta)
- **FormAuthProvider**: Traditional username/password forms
- **TokenAuthProvider**: API token authentication

## AuthProvider Interface

All authentication providers must implement the `AuthProvider` interface:

```typescript
import type { Page } from '@playwright/test';
import type { Credentials } from '@artk/core/auth';

interface AuthProvider {
  /**
   * Perform full login flow
   *
   * @param page - Playwright Page object
   * @param credentials - Username and password from environment variables
   * @throws ARTKAuthError on login failure
   */
  login(page: Page, credentials: Credentials): Promise<void>;

  /**
   * Check if current session is still valid
   *
   * Used to determine if storage state can be reused.
   *
   * @param page - Playwright Page object
   * @returns true if session is valid and usable
   */
  isSessionValid(page: Page): Promise<boolean>;

  /**
   * Attempt to refresh the session (optional)
   *
   * Not all providers support session refresh.
   *
   * @param page - Playwright Page object
   * @returns true if refresh succeeded, false if login required
   */
  refreshSession?(page: Page): Promise<boolean>;

  /**
   * Perform logout
   *
   * @param page - Playwright Page object
   */
  logout(page: Page): Promise<void>;
}
```

## Using CustomAuthProvider Base Class

ARTK provides `CustomAuthProvider` as an abstract base class that handles:
- Automatic retry logic (configurable)
- Structured logging
- Error handling
- Common helper methods

### Abstract Methods to Implement

When extending `CustomAuthProvider`, you must implement three protected methods:

```typescript
import { CustomAuthProvider } from '@artk/core/auth';
import type { Page, Credentials } from '@artk/core/auth';

export class MyAuthProvider extends CustomAuthProvider {
  /**
   * Perform the actual login implementation
   *
   * This method is called by login() which handles retries.
   */
  protected async performLogin(page: Page, credentials: Credentials): Promise<void> {
    // Your login logic here
  }

  /**
   * Check if the session is currently valid
   */
  protected async checkSessionValidity(page: Page): Promise<boolean> {
    // Your session check logic here
  }

  /**
   * Perform the actual logout implementation
   */
  protected async performLogout(page: Page): Promise<void> {
    // Your logout logic here
  }
}
```

## Example: SAML Authentication Provider

Here's a complete example implementing SAML authentication:

```typescript
/**
 * SAML Authentication Provider
 *
 * Implements SAML 2.0 authentication flow with IdP-initiated login.
 * This example assumes:
 * - SAML IdP is configured with your application
 * - Login requires username/password at IdP
 * - SAML assertion redirects back to application
 */
import type { Page } from '@playwright/test';
import { CustomAuthProvider, type Credentials, type AuthRetryOptions } from '@artk/core/auth';

export interface SAMLConfig {
  /**
   * SAML Identity Provider URL
   */
  readonly idpUrl: string;

  /**
   * Expected URL after successful authentication
   */
  readonly successUrl: string;

  /**
   * CSS selector for username input at IdP
   * @default 'input[name="username"]'
   */
  readonly usernameSelector?: string;

  /**
   * CSS selector for password input at IdP
   * @default 'input[name="password"]'
   */
  readonly passwordSelector?: string;

  /**
   * CSS selector for submit button at IdP
   * @default 'button[type="submit"]'
   */
  readonly submitSelector?: string;

  /**
   * Maximum time to wait for SAML assertion redirect (ms)
   * @default 10000
   */
  readonly assertionTimeoutMs?: number;

  /**
   * Retry options for login attempts
   */
  readonly retry?: AuthRetryOptions;
}

export class SAMLAuthProvider extends CustomAuthProvider {
  private readonly config: Required<SAMLConfig>;

  constructor(config: SAMLConfig) {
    // Call parent with provider name and retry options
    super('saml', config.retry);

    // Set defaults for optional fields
    this.config = {
      idpUrl: config.idpUrl,
      successUrl: config.successUrl,
      usernameSelector: config.usernameSelector ?? 'input[name="username"]',
      passwordSelector: config.passwordSelector ?? 'input[name="password"]',
      submitSelector: config.submitSelector ?? 'button[type="submit"]',
      assertionTimeoutMs: config.assertionTimeoutMs ?? 10000,
      retry: config.retry ?? {},
    };
  }

  /**
   * Perform SAML login flow
   */
  protected async performLogin(page: Page, credentials: Credentials): Promise<void> {
    this.logger.info('Starting SAML authentication', {
      idpUrl: this.config.idpUrl,
    });

    // Step 1: Navigate to SAML IdP
    await page.goto(this.config.idpUrl, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // Step 2: Fill credentials at IdP login page
    await page.fill(this.config.usernameSelector, credentials.username);
    await page.fill(this.config.passwordSelector, credentials.password);

    this.logger.debug('Filled SAML IdP credentials');

    // Step 3: Submit and wait for SAML assertion redirect
    await Promise.all([
      // Wait for navigation to success URL
      page.waitForURL(this.config.successUrl, {
        timeout: this.config.assertionTimeoutMs,
      }),
      // Click submit button
      page.click(this.config.submitSelector),
    ]);

    this.logger.info('SAML authentication successful', {
      currentUrl: page.url(),
    });

    // Step 4: Verify we're on the expected success page
    const currentUrl = page.url();
    if (!currentUrl.includes(this.config.successUrl)) {
      throw new Error(
        `SAML login did not reach success URL. Expected: ${this.config.successUrl}, Got: ${currentUrl}`
      );
    }
  }

  /**
   * Check if SAML session is still valid
   *
   * Validates session by checking if we're not redirected to IdP
   */
  protected async checkSessionValidity(page: Page): Promise<boolean> {
    try {
      // Navigate to a protected page in the app
      const testUrl = new URL(this.config.successUrl).origin;
      await page.goto(testUrl, { timeout: 5000 });

      // If we're redirected to IdP, session is invalid
      const currentUrl = page.url();
      const isOnIdp = currentUrl.includes(new URL(this.config.idpUrl).hostname);

      if (isOnIdp) {
        this.logger.debug('Session invalid: redirected to IdP');
        return false;
      }

      this.logger.debug('Session valid: not redirected to IdP');
      return true;
    } catch (error) {
      this.logger.warn('Session validation failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Perform SAML logout
   *
   * Initiates SAML Single Logout (SLO) if available
   */
  protected async performLogout(page: Page): Promise<void> {
    try {
      // Navigate to logout endpoint
      const logoutUrl = `${new URL(this.config.successUrl).origin}/logout`;

      this.logger.debug('Initiating SAML logout', { logoutUrl });

      await page.goto(logoutUrl, {
        waitUntil: 'networkidle',
        timeout: 5000,
      });

      // Clear browser state as additional cleanup
      await page.context().clearCookies();

      this.logger.info('SAML logout completed');
    } catch (error) {
      this.logger.warn('SAML logout error, clearing cookies as fallback', {
        error: error instanceof Error ? error.message : String(error),
      });
      // Fallback: clear cookies
      await page.context().clearCookies();
    }
  }

  /**
   * Get the configured IdP URL for reference
   */
  getIdpUrl(): string {
    return this.config.idpUrl;
  }

  /**
   * Get the configured success URL for reference
   */
  getSuccessUrl(): string {
    return this.config.successUrl;
  }
}
```

## Configuration in artk.config.yml

Custom providers are not directly configured in `artk.config.yml`. Instead, they are instantiated in your test setup code. However, you can reference environment variables:

```yaml
# artk.config.yml
auth:
  # Roles still defined here for credentials
  roles:
    user:
      name: Regular User
      credentialsEnv:
        username: SAML_USER_USERNAME
        password: SAML_USER_PASSWORD

    admin:
      name: Administrator
      credentialsEnv:
        username: SAML_ADMIN_USERNAME
        password: SAML_ADMIN_PASSWORD

  # Storage state configuration
  storageState:
    directory: .auth-states
    maxAge: 3600000  # 1 hour
```

## Using Custom Provider in Tests

### Option 1: Direct Instantiation in Playwright Config

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';
import { SAMLAuthProvider } from './auth/saml-provider';
import { getCredentials, saveStorageState } from '@artk/core/auth';
import { loadConfig } from '@artk/core/config';

const artkConfig = loadConfig();

// Create SAML provider instance
const samlProvider = new SAMLAuthProvider({
  idpUrl: process.env.SAML_IDP_URL!,
  successUrl: '/dashboard',
  assertionTimeoutMs: 15000,
  retry: {
    maxRetries: 2,
    initialDelayMs: 2000,
  },
});

export default defineConfig({
  projects: [
    // Auth setup project for 'user' role
    {
      name: 'auth-setup-user',
      testMatch: /auth\.setup\.ts/,
      use: {
        // Custom context options if needed
      },
    },

    // Tests using authenticated 'user' role
    {
      name: 'user-tests',
      dependencies: ['auth-setup-user'],
      use: {
        storageState: '.auth-states/user.json',
      },
    },
  ],
});
```

### Option 2: Auth Setup File

```typescript
// tests/auth.setup.ts
import { test as setup } from '@playwright/test';
import { SAMLAuthProvider } from './auth/saml-provider';
import { getCredentials, saveStorageState } from '@artk/core/auth';
import { loadConfig } from '@artk/core/config';

const artkConfig = loadConfig();

// Create provider
const samlProvider = new SAMLAuthProvider({
  idpUrl: process.env.SAML_IDP_URL!,
  successUrl: '/dashboard',
});

setup('authenticate as user', async ({ page, context }) => {
  // Get credentials from environment variables
  const credentials = getCredentials('user', artkConfig.auth);

  // Perform login
  await samlProvider.login(page, credentials);

  // Verify session is valid
  const isValid = await samlProvider.isSessionValid(page);
  if (!isValid) {
    throw new Error('SAML authentication failed - session not valid');
  }

  // Save storage state for reuse
  await saveStorageState(context, 'user', {
    directory: artkConfig.auth.storageState.directory,
  });
});

setup('authenticate as admin', async ({ page, context }) => {
  const credentials = getCredentials('admin', artkConfig.auth);

  await samlProvider.login(page, credentials);

  // Verify session
  const isValid = await samlProvider.isSessionValid(page);
  if (!isValid) {
    throw new Error('SAML authentication failed - session not valid');
  }

  await saveStorageState(context, 'admin', {
    directory: artkConfig.auth.storageState.directory,
  });
});
```

### Option 3: Using with ARTK Auth Setup Factory

For more advanced integration, you can create a factory function:

```typescript
// auth/saml-factory.ts
import type { AuthProvider } from '@artk/core/auth';
import type { ARTKAuthConfig } from '@artk/core/config';
import { SAMLAuthProvider } from './saml-provider';

export function createSAMLProvider(config: ARTKAuthConfig): AuthProvider {
  return new SAMLAuthProvider({
    idpUrl: process.env.SAML_IDP_URL!,
    successUrl: process.env.SAML_SUCCESS_URL ?? '/dashboard',
    assertionTimeoutMs: 15000,
  });
}
```

Then use in auth setup:

```typescript
// tests/auth.setup.ts
import { createAuthSetup } from '@artk/core/auth';
import { loadConfig } from '@artk/core/config';
import { createSAMLProvider } from './auth/saml-factory';

const artkConfig = loadConfig();
const samlProvider = createSAMLProvider(artkConfig.auth);

// Create auth setup for each role
const userSetup = createAuthSetup('user', samlProvider, artkConfig.auth);
const adminSetup = createAuthSetup('admin', samlProvider, artkConfig.auth);

// Use in Playwright tests
export { userSetup, adminSetup };
```

## Best Practices

### 1. Type Safety

Always use explicit types, avoid `any`:

```typescript
// ✅ Good - Explicit types
export interface MyAuthConfig {
  readonly loginUrl: string;
  readonly timeout: number;
}

export class MyAuthProvider extends CustomAuthProvider {
  private readonly config: Required<MyAuthConfig>;

  constructor(config: MyAuthConfig) {
    super('my-auth');
    this.config = {
      loginUrl: config.loginUrl,
      timeout: config.timeout ?? 5000,
    };
  }
}

// ❌ Bad - Using any
export class MyAuthProvider extends CustomAuthProvider {
  private config: any; // Don't do this!
}
```

### 2. Error Handling

Provide clear error messages:

```typescript
protected async performLogin(page: Page, credentials: Credentials): Promise<void> {
  // Check for error indicators
  const errorMessage = await page.locator('.error-message').textContent();
  if (errorMessage) {
    throw new Error(`Login failed: ${errorMessage}`);
  }

  // Verify expected state
  if (!page.url().includes(this.successUrl)) {
    throw new Error(
      `Login did not reach success URL. Expected: ${this.successUrl}, Got: ${page.url()}`
    );
  }
}
```

### 3. Logging

Use the built-in logger for debugging:

```typescript
protected async performLogin(page: Page, credentials: Credentials): Promise<void> {
  this.logger.info('Starting login', { url: this.loginUrl });

  await page.goto(this.loginUrl);
  this.logger.debug('Navigated to login page');

  await page.fill('#username', credentials.username);
  this.logger.debug('Filled credentials');

  await page.click('#submit');
  this.logger.info('Login complete', { currentUrl: page.url() });
}
```

### 4. Timeouts

Make timeouts configurable:

```typescript
export interface MyAuthConfig {
  readonly navigationTimeoutMs?: number;
  readonly assertionTimeoutMs?: number;
}

export class MyAuthProvider extends CustomAuthProvider {
  private readonly config: Required<MyAuthConfig>;

  constructor(config: MyAuthConfig) {
    super('my-auth');
    this.config = {
      navigationTimeoutMs: config.navigationTimeoutMs ?? 30000,
      assertionTimeoutMs: config.assertionTimeoutMs ?? 10000,
    };
  }

  protected async performLogin(page: Page, credentials: Credentials): Promise<void> {
    await page.goto(this.loginUrl, {
      timeout: this.config.navigationTimeoutMs,
    });
  }
}
```

### 5. Readonly Configuration

Use `readonly` to prevent accidental modifications:

```typescript
export interface SAMLConfig {
  readonly idpUrl: string;
  readonly successUrl: string;
  readonly selectors?: {
    readonly username: string;
    readonly password: string;
  };
}
```

## Testing Your Custom Provider

Create unit tests for your provider:

```typescript
// auth/__tests__/saml-provider.test.ts
import { describe, it, expect, vi } from 'vitest';
import { SAMLAuthProvider } from '../saml-provider';

describe('SAMLAuthProvider', () => {
  const mockPage = {
    goto: vi.fn(),
    fill: vi.fn(),
    click: vi.fn(),
    waitForURL: vi.fn(),
    url: vi.fn(() => 'https://app.example.com/dashboard'),
    context: () => ({
      clearCookies: vi.fn(),
    }),
  };

  it('should perform SAML login flow', async () => {
    const provider = new SAMLAuthProvider({
      idpUrl: 'https://idp.example.com/saml',
      successUrl: '/dashboard',
    });

    await provider.login(mockPage as any, {
      username: 'test@example.com',
      password: 'password123',
    });

    expect(mockPage.goto).toHaveBeenCalledWith(
      'https://idp.example.com/saml',
      expect.any(Object)
    );
    expect(mockPage.fill).toHaveBeenCalledTimes(2);
    expect(mockPage.click).toHaveBeenCalled();
  });

  it('should check session validity', async () => {
    const provider = new SAMLAuthProvider({
      idpUrl: 'https://idp.example.com/saml',
      successUrl: '/dashboard',
    });

    const isValid = await provider.isSessionValid(mockPage as any);
    expect(isValid).toBe(true);
  });

  it('should handle logout', async () => {
    const provider = new SAMLAuthProvider({
      idpUrl: 'https://idp.example.com/saml',
      successUrl: '/dashboard',
    });

    await provider.logout(mockPage as any);

    expect(mockPage.goto).toHaveBeenCalledWith(
      expect.stringContaining('/logout'),
      expect.any(Object)
    );
  });
});
```

## Additional Resources

- [AuthProvider Interface](../auth/types.ts) - Core interface definition
- [BaseAuthProvider](../auth/providers/base.ts) - Base class implementation
- [CustomAuthProvider](../auth/providers/custom.ts) - Abstract custom provider
- [OIDC Provider Example](../auth/providers/oidc.ts) - Reference implementation
- [ARTK Core Specification](../../../specs/001-artk-core-v1/spec.md) - Full feature spec

## Troubleshooting

### Login Fails Immediately

Check that:
- Environment variables are set correctly
- Selectors match your IdP's login page
- Timeouts are sufficient for your network

Enable debug logging:
```typescript
import { configureLogger } from '@artk/core/utils';

configureLogger({ minLevel: 'debug' });
```

### Session Validation Always Returns False

Ensure your `checkSessionValidity` logic correctly identifies authenticated state:
```typescript
protected async checkSessionValidity(page: Page): Promise<boolean> {
  // Don't just check URL - verify an authenticated element exists
  const userProfile = await page.locator('.user-profile').isVisible();
  return userProfile;
}
```

### Storage State Not Persisting

Verify:
- Directory exists and is writable
- Storage state is saved after successful login
- `maxAge` in config is not too short

```typescript
await saveStorageState(context, 'role', {
  directory: artkConfig.auth.storageState.directory,
  validate: true,  // Verify storage state is valid
});
```
