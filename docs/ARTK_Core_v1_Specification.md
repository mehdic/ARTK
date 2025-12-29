# ARTK Core v1.0 — Complete Specification

**Date:** 2024-12-29
**Version:** 1.0.0-spec
**Status:** DRAFT — Awaiting Approval
**Target:** ITSS Project (Company Internal)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Distribution Model](#3-distribution-model)
4. [Core Module Specifications](#4-core-module-specifications)
   - 4.1 Config System
   - 4.2 Playwright Harness
   - 4.3 Auth System (OIDC Focus)
   - 4.4 Fixtures
   - 4.5 Locators
   - 4.6 Assertions
   - 4.7 Data Harness
   - 4.8 Reporters
5. [Configuration Schema](#5-configuration-schema)
6. [Multi-Language Support](#6-multi-language-support)
7. [Journey System Integration](#7-journey-system-integration)
8. [Prompt Updates](#8-prompt-updates)
9. [Testing Strategy](#9-testing-strategy)
10. [Implementation Order](#10-implementation-order)
11. [File Structure](#11-file-structure)
12. [API Reference](#12-api-reference)

---

## 1. Executive Summary

### 1.1 What We're Building

ARTK Core v1.0 is a **vendorable Playwright infrastructure library** that provides:

- **Config-driven setup** — One YAML file configures everything
- **OIDC authentication** — Enterprise SSO out of the box
- **Reusable fixtures** — Pre-built test fixtures for common patterns
- **Selector utilities** — Accessibility-first locator strategies
- **Common assertions** — Toast, table, form, loading state assertions
- **Data management** — Test isolation, namespacing, cleanup
- **Multi-language support** — TypeScript first, architecture supports Python/Java/.NET

### 1.2 Design Principles

1. **Config over code** — Most customization via `artk.config.yml`, not TypeScript
2. **Prompts are primary** — AI generates project-specific code using core as building blocks
3. **Escape hatches everywhere** — Every pattern has a custom override option
4. **Zero magic** — Generated code is readable and debuggable
5. **Enterprise-ready** — OIDC, multi-role, compliance-aware from day one

### 1.3 Success Criteria

- [ ] ITSS project can run OIDC-authenticated E2E tests
- [ ] New journey implementation requires <50 lines of project-specific code
- [ ] Team members can understand and modify generated tests
- [ ] Core updates can be pulled without breaking existing tests

---

## 2. Architecture Overview

### 2.1 Layer Model

```
┌─────────────────────────────────────────────────────────────────┐
│                    Target Project (ITSS)                        │
├─────────────────────────────────────────────────────────────────┤
│ Layer 4: Tests                                                  │
│ - Journey implementations (AI-generated)                        │
│ - spec files under tests/journeys/                              │
├─────────────────────────────────────────────────────────────────┤
│ Layer 3: Feature Modules                                        │
│ - Page objects (AI-generated)                                   │
│ - Flows (AI-generated)                                          │
│ - Project-specific assertions                                   │
├─────────────────────────────────────────────────────────────────┤
│ Layer 2: Configuration                                          │
│ - artk.config.yml                                               │
│ - Environment variables                                         │
│ - Role/credential definitions                                   │
├─────────────────────────────────────────────────────────────────┤
│ Layer 1: ARTK Core (Vendored)                                   │
│ - Config loader, Harness, Auth, Fixtures, Utilities             │
│ - Copied to artk/.core/                                         │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
artk.config.yml
       │
       ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Config       │────▶│ Auth         │────▶│ Fixtures     │
│ Loader       │     │ Provider     │     │ (test, page) │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │
       │                    ▼                    │
       │             ┌──────────────┐            │
       │             │ Storage      │            │
       │             │ State        │            │
       │             └──────────────┘            │
       │                                         │
       ▼                                         ▼
┌──────────────┐                         ┌──────────────┐
│ Playwright   │                         │ Test Spec    │
│ Config       │                         │ Files        │
└──────────────┘                         └──────────────┘
```

### 2.3 Module Dependencies

```
                    ┌─────────┐
                    │ config  │
                    └────┬────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
     ┌─────────┐   ┌─────────┐   ┌─────────┐
     │ harness │   │  auth   │   │  data   │
     └────┬────┘   └────┬────┘   └────┬────┘
          │             │             │
          └──────────┬──┴─────────────┘
                     │
                     ▼
               ┌──────────┐
               │ fixtures │
               └────┬─────┘
                    │
          ┌─────────┼─────────┐
          │         │         │
          ▼         ▼         ▼
     ┌─────────┐ ┌─────────┐ ┌─────────┐
     │locators │ │assertions│ │reporters│
     └─────────┘ └─────────┘ └─────────┘
```

---

## 3. Distribution Model

### 3.1 Vendor/Copy Approach

ARTK Core is **copied** into target projects, not installed via npm.

**Rationale:**
- No npm publishing infrastructure needed
- Target project has full control
- Easier to customize if needed
- Works in air-gapped environments

### 3.2 Directory Structure in Target Project

```
itss-project/
├── artk/                          # ARTK root (configurable)
│   ├── .core/                     # Vendored ARTK Core (DO NOT EDIT)
│   │   ├── config/
│   │   ├── harness/
│   │   ├── auth/
│   │   ├── fixtures/
│   │   ├── locators/
│   │   ├── assertions/
│   │   ├── data/
│   │   ├── reporters/
│   │   ├── journeys/              # Journey system (existing)
│   │   └── index.ts
│   │
│   ├── artk.config.yml            # Project configuration
│   ├── playwright.config.ts       # Generated, imports from .core
│   │
│   ├── src/                       # Project-specific code
│   │   ├── fixtures/              # Extended fixtures
│   │   ├── pages/                 # Page objects
│   │   ├── flows/                 # Business flows
│   │   └── support/               # Utilities
│   │
│   ├── tests/                     # Test specs
│   │   └── journeys/
│   │       ├── smoke/
│   │       ├── release/
│   │       └── regression/
│   │
│   └── journeys/                  # Journey definitions
│       ├── BACKLOG.md
│       ├── proposed/
│       ├── defined/
│       └── clarified/
│
└── .github/
    └── prompts/                   # ARTK prompts
```

### 3.3 Core Update Process

When ARTK Core updates:

1. AI (via prompt) or manual copy replaces `artk/.core/`
2. Project-specific code in `artk/src/` is preserved
3. `artk.config.yml` may need migration (documented in CHANGELOG)
4. Prompts reference updated core APIs

### 3.4 Version Tracking

```yaml
# artk/.core/version.json
{
  "version": "1.0.0",
  "updated": "2024-12-29T10:00:00Z",
  "compatibility": {
    "playwright": ">=1.40.0",
    "node": ">=18.0.0"
  }
}
```

---

## 4. Core Module Specifications

### 4.1 Config System (`core/config/`)

#### Purpose
Load, validate, and provide typed access to `artk.config.yml`.

#### Files
```
config/
├── index.ts           # Main exports
├── loader.ts          # YAML loading and validation
├── schema.ts          # Zod schema definitions
├── types.ts           # TypeScript interfaces
├── env.ts             # Environment variable handling
└── defaults.ts        # Default values
```

#### Key APIs

```typescript
// Load and validate config
function loadConfig(configPath?: string): ARTKConfig;

// Get typed config sections
function getAuthConfig(): AuthConfig;
function getEnvironment(): EnvironmentConfig;
function getSelectorsConfig(): SelectorsConfig;

// Environment variable resolution
function resolveEnvVar(template: string): string;
// Example: resolveEnvVar('${ARTK_BASE_URL}') → 'https://itss.company.com'

// Runtime environment detection
function getCurrentEnvironment(): 'local' | 'ci' | string;
```

#### Validation Rules
- Config file must exist at `artk/artk.config.yml`
- All required fields must be present
- Auth provider must be valid type
- URLs must be valid format
- Selector strategies must be valid

#### Error Handling
```typescript
class ARTKConfigError extends Error {
  constructor(
    message: string,
    public field: string,
    public suggestion?: string
  ) {}
}

// Example error:
// ARTKConfigError: Invalid auth provider 'oauth'
//   Field: auth.provider
//   Suggestion: Use one of: oidc, form, token, custom
```

---

### 4.2 Playwright Harness (`core/harness/`)

#### Purpose
Provide base Playwright configuration that reads from `artk.config.yml`.

#### Files
```
harness/
├── index.ts                  # Main exports
├── playwright.config.base.ts # Base config factory
├── projects.ts               # Project definitions (setup, browsers)
├── reporters.ts              # Reporter configuration
└── webServer.ts              # Dev server configuration (optional)
```

#### Key APIs

```typescript
// Generate Playwright config from ARTK config
function createPlaywrightConfig(options?: {
  extend?: PlaywrightTestConfig;
}): PlaywrightTestConfig;

// Create auth setup project
function createAuthSetupProject(role: string): Project;

// Create browser projects with auth dependencies
function createBrowserProjects(options: {
  browsers: ('chromium' | 'firefox' | 'webkit')[];
  authRoles: string[];
}): Project[];
```

#### Generated playwright.config.ts

```typescript
// artk/playwright.config.ts (generated)
import { createPlaywrightConfig } from './.core/harness';

export default createPlaywrightConfig({
  extend: {
    // Project-specific overrides if needed
  }
});
```

#### Base Config Features
- `baseURL` from config (with env var support)
- Tier-based settings (smoke/release/regression have different timeouts, retries)
- Auth setup projects per role
- Standard artifact directories
- HTML + JSON reporters by default
- Trace on first retry

---

### 4.3 Auth System (`core/auth/`) — OIDC Focus

#### Purpose
Provide OIDC authentication with storage state management.

#### Files
```
auth/
├── index.ts                    # Main exports
├── types.ts                    # Interfaces
├── storage-state.ts            # Save/load/validate state
├── credentials.ts              # Credential management from env
├── setup-factory.ts            # Setup project generator
├── providers/
│   ├── base.ts                 # Abstract AuthProvider
│   ├── oidc.ts                 # OIDCAuthProvider ★ PRIMARY
│   ├── form.ts                 # FormAuthProvider (backup)
│   ├── token.ts                # TokenAuthProvider (API-based)
│   └── custom.ts               # CustomAuthProvider (escape hatch)
└── oidc/
    ├── flow.ts                 # OIDC flow handlers
    ├── token-refresh.ts        # Token refresh logic
    ├── providers/              # IdP-specific helpers
    │   ├── generic.ts          # Generic OIDC
    │   ├── azure-ad.ts         # Azure AD / Entra ID
    │   ├── okta.ts             # Okta
    │   ├── keycloak.ts         # Keycloak
    │   └── auth0.ts            # Auth0
    └── discovery.ts            # OIDC discovery document handling
```

#### OIDC Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    OIDC Auth Flow in Playwright                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Check if valid storage state exists                         │
│     ├── Yes → Load state, skip login                            │
│     └── No → Continue to step 2                                 │
│                                                                 │
│  2. Navigate to app login URL                                   │
│     └── App redirects to IdP                                    │
│                                                                 │
│  3. Detect IdP and handle login                                 │
│     ├── Azure AD → Fill Microsoft login form                    │
│     ├── Okta → Fill Okta login form                             │
│     ├── Keycloak → Fill Keycloak form                           │
│     └── Generic → Fill generic OIDC form                        │
│                                                                 │
│  4. Handle MFA if required (config-driven)                      │
│     ├── TOTP → Enter code from env var or skip in non-prod      │
│     └── Push → Wait for approval (with timeout)                 │
│                                                                 │
│  5. Wait for redirect back to app                               │
│     └── Verify success indicator (URL or element)               │
│                                                                 │
│  6. Save storage state for reuse                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Key APIs

```typescript
// Main OIDC provider
class OIDCAuthProvider implements AuthProvider {
  constructor(config: OIDCAuthConfig);

  // Perform full login flow
  async login(page: Page, credentials: Credentials): Promise<void>;

  // Check if current session is valid
  async isSessionValid(page: Page): Promise<boolean>;

  // Refresh tokens if supported
  async refreshSession(page: Page): Promise<boolean>;

  // Clear session
  async logout(page: Page): Promise<void>;
}

// Storage state management
async function saveStorageState(
  context: BrowserContext,
  role: string
): Promise<string>; // Returns path

async function loadStorageState(role: string): Promise<string | undefined>;

async function isStorageStateValid(
  role: string,
  maxAgeMs?: number
): Promise<boolean>;

async function clearStorageState(role?: string): Promise<void>;

// Credential management
function getCredentials(role: string): Credentials;
// Reads from env vars defined in config

// Setup project factory
function createAuthSetup(role: string): {
  name: string;
  testMatch: string;
  setup: string;
};
```

#### OIDC Config Structure

```yaml
auth:
  provider: oidc

  # Storage state settings
  storageState:
    directory: .auth-states      # Relative to artk/
    maxAgeMinutes: 60            # Re-authenticate after this

  # Role definitions
  roles:
    admin:
      credentialsEnv:
        username: ITSS_ADMIN_USER
        password: ITSS_ADMIN_PASS
      # Optional: role-specific OIDC overrides

    standardUser:
      credentialsEnv:
        username: ITSS_USER_EMAIL
        password: ITSS_USER_PASS

  # OIDC configuration
  oidc:
    # IdP type for optimized handling
    idpType: azure-ad  # azure-ad | okta | keycloak | auth0 | generic

    # App's login initiation URL
    loginUrl: /auth/login

    # Alternative: direct IdP URL (skips app redirect)
    # idpLoginUrl: https://login.microsoftonline.com/...

    # Success indicators (at least one required)
    success:
      url: /dashboard            # Wait for this URL
      # selector: '[data-testid="user-menu"]'  # Or wait for element

    # IdP-specific selectors (optional - has smart defaults per idpType)
    idpSelectors:
      username: 'input[name="loginfmt"]'  # Azure AD default
      password: 'input[name="passwd"]'
      submit: 'input[type="submit"]'

    # MFA handling (optional)
    mfa:
      enabled: false             # Set true if MFA in test env
      type: totp                 # totp | push | sms
      totpSecretEnv: ITSS_TOTP_SECRET  # For TOTP
      pushTimeoutMs: 30000       # For push notifications

    # Timeout settings
    timeouts:
      loginFlowMs: 30000         # Total login flow timeout
      idpRedirectMs: 10000       # Wait for IdP redirect
      callbackMs: 10000          # Wait for app callback
```

#### IdP-Specific Handlers

Each IdP has quirks. Core provides optimized handlers:

**Keycloak (PRIMARY - ITSS uses this):**
- Handles standard Keycloak login form (#username, #password, #kc-login)
- Handles themed login pages
- Handles realm selection
- Handles TOTP MFA input (#otp, #kc-login)
- Handles "Update password" prompts

**Azure AD / Entra ID:**
- Handles "Stay signed in?" prompt
- Handles "More information required" prompts
- Knows Microsoft's DOM structure

**Okta:**
- Handles Okta widget variations
- Handles MFA enrollment prompts

**Generic OIDC:**
- Config-driven selectors
- Works with any OIDC provider
- Requires explicit selector config

#### Auth Setup Project Template

```typescript
// Generated: artk/src/auth/setup.auth.ts
import { test as setup } from '@playwright/test';
import { OIDCAuthProvider, saveStorageState, getCredentials } from '../.core/auth';
import { loadConfig } from '../.core/config';

const config = loadConfig();

setup('authenticate as admin', async ({ page }) => {
  const provider = new OIDCAuthProvider(config.auth.oidc);
  const credentials = getCredentials('admin');

  await provider.login(page, credentials);
  await saveStorageState(page.context(), 'admin');
});

setup('authenticate as standardUser', async ({ page }) => {
  const provider = new OIDCAuthProvider(config.auth.oidc);
  const credentials = getCredentials('standardUser');

  await provider.login(page, credentials);
  await saveStorageState(page.context(), 'standardUser');
});
```

---

### 4.4 Fixtures (`core/fixtures/`)

#### Purpose
Provide pre-configured Playwright test fixtures.

#### Files
```
fixtures/
├── index.ts              # Main test export
├── base.ts               # Base fixture definitions
├── auth.ts               # Authenticated page fixtures
├── api.ts                # API context fixtures
├── data.ts               # Test data fixtures
└── types.ts              # Fixture type definitions
```

#### Available Fixtures

| Fixture | Type | Description |
|---------|------|-------------|
| `config` | `ARTKConfig` | Loaded ARTK configuration |
| `authenticatedPage` | `Page` | Page with auth for default role |
| `adminPage` | `Page` | Page authenticated as admin |
| `userPage` | `Page` | Page authenticated as standardUser |
| `apiContext` | `APIRequestContext` | API context with auth headers |
| `testData` | `TestDataManager` | Test data creation/cleanup |
| `runId` | `string` | Unique ID for test isolation |

#### Key APIs

```typescript
// Main test export (use this instead of @playwright/test)
import { test, expect } from 'artk/.core/fixtures';

// Test with authenticated page
test('user can see dashboard', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/dashboard');
  await expect(authenticatedPage.locator('h1')).toHaveText('Dashboard');
});

// Test with specific role
test('admin can access settings', async ({ adminPage }) => {
  await adminPage.goto('/admin/settings');
  // ...
});

// Test with API context
test('can fetch user data', async ({ apiContext }) => {
  const response = await apiContext.get('/api/users/me');
  expect(response.ok()).toBeTruthy();
});

// Test with data isolation
test('create and verify order', async ({ authenticatedPage, testData, runId }) => {
  const orderName = `Test Order ${runId}`;
  await testData.cleanup(() => deleteOrder(orderName)); // Runs after test
  // ...
});
```

#### Fixture Configuration

```yaml
# artk.config.yml
fixtures:
  # Default role for authenticatedPage
  defaultRole: standardUser

  # Available role fixtures (generates adminPage, userPage, etc.)
  roleFixtures:
    - admin
    - standardUser

  # API context settings
  api:
    baseURL: ${ITSS_API_URL:-http://localhost:3001}
    extraHTTPHeaders:
      X-Test-Run: '${runId}'
```

---

### 4.5 Locators (`core/locators/`)

#### Purpose
Provide accessibility-first locator strategies.

#### Files
```
locators/
├── index.ts              # Main exports
├── factory.ts            # Locator factory
├── strategies.ts         # Strategy implementations
├── testid.ts             # Test ID helpers
└── aria.ts               # ARIA/accessibility helpers
```

#### Key APIs

```typescript
// Locator factory - tries strategies in order until one matches
function locate(page: Page, description: string, hints?: LocatorHints): Locator;

// Strategy-specific locators
function byRole(page: Page, role: string, options?: ByRoleOptions): Locator;
function byLabel(page: Page, text: string): Locator;
function byTestId(page: Page, testId: string): Locator;
function byText(page: Page, text: string): Locator;
function byPlaceholder(page: Page, text: string): Locator;

// Composite locators
function withinSection(page: Page, sectionName: string): ScopedLocators;
function withinForm(page: Page, formName: string): FormLocators;
function withinTable(page: Page, tableName: string): TableLocators;

// Test ID attribute helper
function setTestIdAttribute(attribute: string): void;
// Configures Playwright's testIdAttribute globally
```

#### Locator Strategy Order

Configured in `artk.config.yml`:

```yaml
selectors:
  testIdAttribute: data-testid

  # Order of strategies to try
  strategy:
    - role           # getByRole()
    - label          # getByLabel()
    - placeholder    # getByPlaceholder()
    - testid         # getByTestId()
    - text           # getByText()
    - css            # locator() - last resort

  # Custom test ID patterns (for apps with non-standard attributes)
  customTestIds:
    - data-qa
    - data-test
```

#### Usage Examples

```typescript
import { byRole, byTestId, withinForm } from 'artk/.core/locators';

test('fill login form', async ({ page }) => {
  // Preferred: role-based
  await byRole(page, 'textbox', { name: 'Email' }).fill('user@example.com');
  await byRole(page, 'textbox', { name: 'Password' }).fill('secret');
  await byRole(page, 'button', { name: 'Sign in' }).click();

  // Alternative: test ID based
  await byTestId(page, 'email-input').fill('user@example.com');

  // Scoped to form
  const form = withinForm(page, 'login-form');
  await form.field('email').fill('user@example.com');
  await form.submit();
});
```

---

### 4.6 Assertions (`core/assertions/`)

#### Purpose
Provide common assertion helpers beyond Playwright's built-in matchers.

#### Files
```
assertions/
├── index.ts              # Main exports
├── toast.ts              # Toast/notification assertions
├── table.ts              # Table content assertions
├── form.ts               # Form state assertions
├── loading.ts            # Loading state assertions
├── url.ts                # URL/routing assertions
├── api.ts                # API response assertions
└── accessibility.ts      # a11y assertions
```

#### Key APIs

```typescript
// Toast/Notification assertions
async function expectToast(
  page: Page,
  message: string | RegExp,
  options?: { type?: 'success' | 'error' | 'warning' | 'info'; timeout?: number }
): Promise<void>;

async function expectNoToast(page: Page): Promise<void>;

// Table assertions
async function expectTableToContainRow(
  page: Page,
  tableSelector: string,
  rowData: Record<string, string | RegExp>
): Promise<void>;

async function expectTableRowCount(
  page: Page,
  tableSelector: string,
  count: number
): Promise<void>;

// Form assertions
async function expectFormFieldError(
  page: Page,
  fieldName: string,
  errorMessage: string | RegExp
): Promise<void>;

async function expectFormValid(page: Page, formSelector: string): Promise<void>;

// Loading assertions
async function expectLoading(page: Page): Promise<void>;
async function expectNotLoading(page: Page, timeout?: number): Promise<void>;
async function waitForLoadingComplete(page: Page): Promise<void>;

// URL assertions
async function expectUrlContains(page: Page, substring: string): Promise<void>;
async function expectUrlMatches(page: Page, pattern: RegExp): Promise<void>;
async function expectQueryParam(page: Page, param: string, value: string): Promise<void>;

// API response assertions (for route interception)
async function expectApiSuccess(response: APIResponse): Promise<void>;
async function expectApiError(response: APIResponse, status: number): Promise<void>;
async function expectApiResponseContains(
  response: APIResponse,
  data: Record<string, unknown>
): Promise<void>;
```

#### Assertion Configuration

```yaml
# artk.config.yml
assertions:
  # Toast/notification selectors
  toast:
    containerSelector: '[data-testid="toast-container"]'
    messageSelector: '[data-testid="toast-message"]'
    typeAttribute: data-toast-type  # For success/error detection

  # Loading indicators
  loading:
    selector: '[data-testid="loading-spinner"]'
    # Or multiple selectors
    selectors:
      - '[data-testid="loading-spinner"]'
      - '[aria-busy="true"]'
      - '.loading-overlay'

  # Default timeouts
  timeouts:
    toast: 5000
    loading: 10000
```

---

### 4.7 Data Harness (`core/data/`)

#### Purpose
Provide test data isolation, namespacing, and cleanup utilities.

#### Files
```
data/
├── index.ts              # Main exports
├── namespace.ts          # Run ID and namespacing
├── cleanup.ts            # Cleanup registration and execution
├── builders.ts           # Data builder base classes
├── api-client.ts         # Base API client for data operations
└── factories.ts          # Factory pattern utilities
```

#### Key APIs

```typescript
// Run ID generation
function generateRunId(): string;  // e.g., "run-abc123-1703850000"

// Namespacing
function namespace(value: string, runId: string): string;
// Example: namespace('Test Order', 'run-abc123') → 'Test Order [run-abc123]'

function parseNamespace(value: string): { original: string; runId: string | null };

// Cleanup registration
class CleanupManager {
  register(fn: () => Promise<void>): void;
  registerApi(method: string, url: string, matcher?: object): void;
  async runAll(): Promise<void>;
}

// Data builder base
abstract class DataBuilder<T> {
  abstract build(): T;
  abstract buildForApi(): Record<string, unknown>;
  withNamespace(runId: string): this;
}

// API client base
class DataApiClient {
  constructor(baseUrl: string, authToken?: string);
  async create<T>(endpoint: string, data: T): Promise<T & { id: string }>;
  async delete(endpoint: string, id: string): Promise<void>;
  async deleteWhere(endpoint: string, filter: object): Promise<number>;
}
```

#### Usage Example

```typescript
import { test } from 'artk/.core/fixtures';
import { namespace, DataBuilder } from 'artk/.core/data';

class OrderBuilder extends DataBuilder<Order> {
  private name = 'Test Order';

  withName(name: string) {
    this.name = name;
    return this;
  }

  build(): Order {
    return { name: this.namespacedValue(this.name) };
  }
}

test('create order', async ({ authenticatedPage, testData, runId }) => {
  const order = new OrderBuilder()
    .withName('My Order')
    .withNamespace(runId)
    .build();

  // Register cleanup
  testData.cleanup(async () => {
    await api.deleteWhere('/orders', { nameContains: runId });
  });

  // Test continues...
});
```

#### Data Configuration

```yaml
# artk.config.yml
data:
  # Namespacing
  namespace:
    prefix: '[artk-'
    suffix: ']'

  # Cleanup settings
  cleanup:
    enabled: true
    onFailure: true        # Clean up even if test fails
    parallel: false        # Run cleanup sequentially

  # API client for data operations
  api:
    baseUrl: ${ITSS_API_URL}/api
    # Auth inherited from main auth config or specify separately
```

---

### 4.8 Reporters (`core/reporters/`)

#### Purpose
Provide ARTK-aware reporters and artifact management.

#### Files
```
reporters/
├── index.ts              # Main exports
├── artk-reporter.ts      # Custom ARTK reporter
├── journey-reporter.ts   # Journey-aware reporting
├── artifacts.ts          # Artifact management
└── masking.ts            # PII masking utilities
```

#### Key APIs

```typescript
// ARTK Reporter (use in playwright.config.ts)
class ARTKReporter implements Reporter {
  // Generates ARTK-formatted reports with journey mapping
}

// Artifact management
async function saveScreenshot(
  page: Page,
  name: string,
  options?: { mask?: boolean; piiSelectors?: string[] }
): Promise<string>;

async function maskPiiInScreenshot(
  screenshotPath: string,
  selectors: string[]
): Promise<void>;

// Journey result mapping
function mapTestToJourney(testTitle: string): string | null;
// Extracts @JRN-0001 from test title
```

#### Reporter Configuration

```yaml
# artk.config.yml
reporters:
  # Built-in reporters
  html: true
  json: true
  junit: false        # Enable for CI

  # ARTK custom reporter
  artk:
    enabled: true
    outputFile: reports/artk-report.json
    includeJourneyMapping: true

  # Artifact settings
  artifacts:
    screenshots:
      onFailure: true
      maskPii: true
      piiSelectors:
        - '[data-sensitive]'
        - '.user-email'
        - '.ssn-field'

    video:
      mode: retain-on-failure  # off | on | retain-on-failure

    trace:
      mode: retain-on-failure
```

---

## 5. Configuration Schema

### 5.1 Complete `artk.config.yml` Schema

```yaml
# ARTK Configuration Schema v1.0
# Location: artk/artk.config.yml

#===============================================================================
# METADATA
#===============================================================================
version: 1                    # Schema version (required)

#===============================================================================
# APPLICATION
#===============================================================================
app:
  # Application name (used in reports and namespacing)
  # Type: string
  # Required: yes
  name: ITSS

  # Base URL for tests
  # Type: string (supports ${ENV_VAR} and ${ENV_VAR:-default} syntax)
  # Required: yes
  baseUrl: ${ITSS_BASE_URL:-http://localhost:3000}

  # Application type (affects default behaviors)
  # Type: enum
  # Values: spa | ssr | hybrid
  # Default: spa
  type: spa

#===============================================================================
# ENVIRONMENTS
#===============================================================================
environments:
  # Define named environments for easy switching
  # Type: map of environment configs

  local:
    baseUrl: http://localhost:3000
    apiUrl: http://localhost:3001

  dev:
    baseUrl: https://itss-dev.company.com
    apiUrl: https://api-dev.company.com

  staging:
    baseUrl: https://itss-staging.company.com
    apiUrl: https://api-staging.company.com

# Active environment (can be overridden by ARTK_ENV)
# Type: string
# Default: local
activeEnvironment: ${ARTK_ENV:-local}

#===============================================================================
# AUTHENTICATION
#===============================================================================
auth:
  # Authentication provider type
  # Type: enum
  # Values: oidc | form | token | custom
  # Required: yes
  provider: oidc

  # Storage state configuration
  storageState:
    # Directory for storage state files (relative to artk/)
    # Type: string
    # Default: .auth-states
    directory: .auth-states

    # Maximum age before re-authentication (minutes)
    # Type: number
    # Default: 60
    maxAgeMinutes: 60

    # Storage state file naming pattern
    # Type: string
    # Placeholders: {role}, {env}
    # Default: '{role}.json'
    filePattern: '{role}-{env}.json'

  # Role definitions
  # Type: map
  # Required: yes (at least one role)
  roles:
    admin:
      # Environment variable names for credentials
      # Type: object with username/password keys
      # Required: yes
      credentialsEnv:
        username: ITSS_ADMIN_USER
        password: ITSS_ADMIN_PASS

      # Optional: description for documentation
      description: Administrator with full access

      # Optional: role-specific OIDC overrides
      # oidcOverrides:
      #   idpType: okta

    standardUser:
      credentialsEnv:
        username: ITSS_USER_EMAIL
        password: ITSS_USER_PASS
      description: Standard user with limited access

  # OIDC-specific configuration (when provider: oidc)
  oidc:
    # Identity Provider type (enables optimized handling)
    # Type: enum
    # Values: azure-ad | okta | keycloak | auth0 | generic
    # Default: generic
    idpType: azure-ad

    # URL to initiate login (app's login page)
    # Type: string
    # Required: yes (unless idpLoginUrl is set)
    loginUrl: /auth/login

    # Alternative: Direct IdP login URL (skips app redirect)
    # Type: string
    # idpLoginUrl: https://login.microsoftonline.com/tenant/oauth2/authorize?...

    # Success indicators (at least one required)
    success:
      # URL to wait for after successful login
      # Type: string | regex pattern
      url: /dashboard

      # Alternative: element to wait for
      # Type: string (CSS selector)
      # selector: '[data-testid="user-menu"]'

      # Timeout for success detection (ms)
      # Type: number
      # Default: 5000
      timeout: 5000

    # IdP page selectors (has smart defaults per idpType)
    # Override only if IdP has custom theming
    idpSelectors:
      # Username/email input
      # Type: string (CSS selector)
      username: 'input[name="loginfmt"]'

      # Password input
      # Type: string (CSS selector)
      password: 'input[name="passwd"]'

      # Submit button
      # Type: string (CSS selector)
      submit: 'input[type="submit"]'

      # "Stay signed in" prompt (Azure AD specific)
      # Type: string (CSS selector)
      staySignedInNo: '#idBtn_Back'

    # MFA configuration (optional)
    mfa:
      # Whether MFA is enabled in test environment
      # Type: boolean
      # Default: false
      enabled: false

      # MFA type
      # Type: enum
      # Values: totp | push | sms | none
      type: totp

      # Environment variable for TOTP secret (for totp type)
      # Type: string
      totpSecretEnv: ITSS_TOTP_SECRET

      # Timeout for push MFA approval (ms)
      # Type: number
      # Default: 30000
      pushTimeoutMs: 30000

      # SMS code input (if using SMS)
      # smsCodeSelector: 'input[name="code"]'

    # Timeout configuration
    timeouts:
      # Total login flow timeout (ms)
      # Type: number
      # Default: 30000
      loginFlowMs: 30000

      # Wait for IdP redirect (ms)
      # Type: number
      # Default: 10000
      idpRedirectMs: 10000

      # Wait for app callback (ms)
      # Type: number
      # Default: 10000
      callbackMs: 10000

    # Logout configuration (optional)
    logout:
      # App's logout URL
      # Type: string
      url: /auth/logout

      # Whether to also logout from IdP
      # Type: boolean
      # Default: false
      idpLogout: false

#===============================================================================
# SELECTORS
#===============================================================================
selectors:
  # Custom test ID attribute
  # Type: string
  # Default: data-testid
  testIdAttribute: data-testid

  # Locator strategy order (first match wins)
  # Type: array of enum
  # Values: role | label | placeholder | testid | text | css
  # Default: [role, label, testid, text]
  strategy:
    - role
    - label
    - placeholder
    - testid
    - text
    - css

  # Additional test ID attributes to check
  # Type: array of strings
  customTestIds:
    - data-qa
    - data-test

#===============================================================================
# ASSERTIONS
#===============================================================================
assertions:
  # Toast/notification configuration
  toast:
    # Container element selector
    # Type: string (CSS selector)
    containerSelector: '[data-testid="toast-container"]'

    # Individual message selector (within container)
    # Type: string (CSS selector)
    messageSelector: '[data-testid="toast-message"]'

    # Attribute that indicates toast type
    # Type: string
    typeAttribute: data-toast-type

    # Default timeout for toast assertions (ms)
    # Type: number
    # Default: 5000
    timeout: 5000

  # Loading indicator configuration
  loading:
    # Loading indicator selectors (any match = loading)
    # Type: array of strings (CSS selectors)
    selectors:
      - '[data-testid="loading-spinner"]'
      - '[aria-busy="true"]'
      - '.loading-overlay'

    # Default timeout for "not loading" assertions (ms)
    # Type: number
    # Default: 10000
    timeout: 10000

  # Form validation
  form:
    # Selector for field error messages
    # Type: string (CSS selector with {field} placeholder)
    errorSelector: '[data-testid="{field}-error"]'

    # Selector for form-level errors
    # Type: string (CSS selector)
    formErrorSelector: '[data-testid="form-error"]'

#===============================================================================
# DATA
#===============================================================================
data:
  # Namespacing for test data isolation
  namespace:
    # Prefix for namespaced values
    # Type: string
    # Default: '[artk-'
    prefix: '[artk-'

    # Suffix for namespaced values
    # Type: string
    # Default: ']'
    suffix: ']'

  # Cleanup configuration
  cleanup:
    # Enable automatic cleanup
    # Type: boolean
    # Default: true
    enabled: true

    # Run cleanup even on test failure
    # Type: boolean
    # Default: true
    onFailure: true

    # Run cleanup functions in parallel
    # Type: boolean
    # Default: false
    parallel: false

  # API client for data operations
  api:
    # Base URL for data API
    # Type: string
    # Default: uses app.baseUrl
    baseUrl: ${ITSS_API_URL:-http://localhost:3001}/api

    # Whether to use auth from main auth config
    # Type: boolean
    # Default: true
    useMainAuth: true

#===============================================================================
# FIXTURES
#===============================================================================
fixtures:
  # Default role for authenticatedPage fixture
  # Type: string (must match a role in auth.roles)
  # Default: first role defined
  defaultRole: standardUser

  # Which roles get dedicated fixtures (e.g., adminPage)
  # Type: array of strings
  roleFixtures:
    - admin
    - standardUser

  # API context configuration
  api:
    # Base URL for API fixture
    # Type: string
    baseURL: ${ITSS_API_URL:-http://localhost:3001}

    # Extra headers for API requests
    # Type: map
    extraHTTPHeaders:
      X-Test-Run: '${runId}'
      Accept: application/json

#===============================================================================
# TEST TIERS
#===============================================================================
tiers:
  # Smoke tests - quick health checks
  smoke:
    # Retry count
    # Type: number
    retries: 0

    # Parallel workers
    # Type: number
    workers: 1

    # Global timeout (ms)
    # Type: number
    timeout: 30000

    # Tag for filtering
    # Type: string
    tag: '@smoke'

  # Release tests - core functionality
  release:
    retries: 2
    workers: 4
    timeout: 60000
    tag: '@release'

  # Regression tests - comprehensive
  regression:
    retries: 2
    workers: 8
    timeout: 120000
    tag: '@regression'

#===============================================================================
# REPORTERS
#===============================================================================
reporters:
  # HTML reporter
  html:
    # Enable HTML reporter
    # Type: boolean
    enabled: true

    # Output directory (relative to artk/)
    # Type: string
    outputFolder: reports/html

    # Open automatically after run
    # Type: enum
    # Values: always | never | on-failure
    open: never

  # JSON reporter
  json:
    enabled: true
    outputFile: reports/results.json

  # JUnit reporter (for CI)
  junit:
    enabled: false
    outputFile: reports/junit.xml

  # ARTK custom reporter
  artk:
    enabled: true
    outputFile: reports/artk-report.json
    includeJourneyMapping: true

#===============================================================================
# ARTIFACTS
#===============================================================================
artifacts:
  # Base directory for all artifacts
  # Type: string
  outputDir: test-results

  # Screenshots
  screenshots:
    # When to capture
    # Type: enum
    # Values: off | on | only-on-failure
    mode: only-on-failure

    # Full page screenshots
    # Type: boolean
    fullPage: true

    # PII masking
    maskPii: true

    # Selectors to mask in screenshots
    # Type: array of strings
    piiSelectors:
      - '[data-sensitive]'
      - '[data-testid*="email"]'
      - '[data-testid*="ssn"]'
      - '[data-testid*="phone"]'

  # Video recording
  video:
    # When to record
    # Type: enum
    # Values: off | on | retain-on-failure | on-first-retry
    mode: retain-on-failure

    # Video size
    # Type: object
    size:
      width: 1280
      height: 720

  # Trace recording
  trace:
    # When to record
    # Type: enum
    # Values: off | on | retain-on-failure | on-first-retry
    mode: retain-on-failure

    # Include screenshots in trace
    # Type: boolean
    screenshots: true

    # Include snapshots in trace
    # Type: boolean
    snapshots: true

#===============================================================================
# BROWSER CONFIGURATION
#===============================================================================
browsers:
  # Which browsers to test
  # Type: array of enum
  # Values: chromium | firefox | webkit
  # Default: [chromium]
  enabled:
    - chromium

  # Default viewport
  # Type: object
  viewport:
    width: 1280
    height: 720

  # Headless mode
  # Type: boolean
  # Default: true (false in CI auto-detected)
  headless: true

  # Slow motion (ms) - useful for debugging
  # Type: number
  # Default: 0
  slowMo: 0

#===============================================================================
# JOURNEY SYSTEM
#===============================================================================
journeys:
  # Journey ID configuration
  id:
    # ID prefix
    # Type: string
    prefix: JRN

    # ID number width (zero-padded)
    # Type: number
    width: 4

  # Directory layout
  # Type: enum
  # Values: flat | staged
  layout: staged

  # Backlog grouping
  backlog:
    # Primary grouping
    # Type: enum
    # Values: tier | status | scope
    groupBy: tier

    # Secondary grouping
    # Type: enum
    thenBy: status
```

### 5.2 Configuration Reference

See separate document: `docs/CONFIG_REFERENCE.md` (to be generated)

---

## 6. Multi-Language Support

### 6.1 Architecture for Multi-Language

While v1 focuses on TypeScript, the architecture supports future language ports:

```
core/
├── typescript/           # TypeScript implementation (v1)
│   ├── config/
│   ├── auth/
│   └── ...
├── python/               # Python implementation (future)
│   ├── config/
│   └── ...
├── java/                 # Java implementation (future)
└── dotnet/               # .NET implementation (future)
```

### 6.2 Language-Agnostic Components

These work across languages:
- `artk.config.yml` schema (YAML is universal)
- Journey markdown files
- Backlog/index JSON format
- Storage state format (Playwright standard)

### 6.3 TypeScript First Strategy

For v1:
1. Build complete TypeScript implementation
2. Document patterns for each module
3. Python port would follow same patterns

---

## 7. Journey System Integration

### 7.1 Existing Journey System

The journey system already exists in `core/artk-core-journeys/`. It includes:
- Schema validation
- Backlog generation
- Index generation

### 7.2 Integration Points

```typescript
// Fixtures can access journey info
test('@JRN-0001 User login', async ({ journeyContext }) => {
  console.log(journeyContext.id);        // 'JRN-0001'
  console.log(journeyContext.tier);      // 'smoke'
  console.log(journeyContext.status);    // 'implemented'
});

// Reporter maps results to journeys
// ARTK reporter outputs journey-aware report
```

### 7.3 Journey-Test Linking

Tests reference journeys via:
1. Test title: `@JRN-0001` prefix
2. Test tag: `test.use({ tag: '@JRN-0001' })`
3. Journey frontmatter: `tests: [path/to/spec.ts]`

---

## 8. Prompt Updates

### 8.1 Prompts That Need Updates

| Prompt | Update Required |
|--------|-----------------|
| `/init` | Install core to `artk/.core/`, generate config |
| `/foundation-build` | Configure core, don't regenerate it |
| `/journey-implement` | Import from core, generate only feature modules |
| `/journey-validate` | Validate against core APIs |
| `/journey-verify` | Use core fixtures for test execution |

### 8.2 Prompt-Core Reference Pattern

```markdown
<!-- Updated /foundation-build prompt excerpt -->

## Foundation Build Process

### Step 1: Verify Core Installation

Check that `artk/.core/` exists and is valid:
- Read `artk/.core/version.json`
- Verify compatibility with project Node version

If core is missing, instruct user to run `/init` first.

### Step 2: Configure Authentication

Based on `artk.config.yml`:

1. If `auth.provider: oidc`:
   - Import `OIDCAuthProvider` from `artk/.core/auth`
   - Generate `artk/src/auth/setup.auth.ts` using core's setup factory
   - Configure IdP selectors based on `auth.oidc.idpType`

2. If `auth.provider: form`:
   - Import `FormAuthProvider` from `artk/.core/auth`
   - Generate setup using form config

### Step 3: Generate Fixtures Export

Create `artk/src/fixtures/index.ts`:

```typescript
// Re-export core fixtures with project config
export { test, expect } from '../.core/fixtures';
export * from '../.core/assertions';
export * from '../.core/locators';
```

### Step 4: Generate playwright.config.ts

```typescript
import { createPlaywrightConfig } from './.core/harness';

export default createPlaywrightConfig();
```
```

---

## 9. Testing Strategy

### 9.1 Unit Tests

Test each core module in isolation:

```
core/
├── config/
│   └── __tests__/
│       ├── loader.test.ts
│       ├── schema.test.ts
│       └── env.test.ts
├── auth/
│   └── __tests__/
│       ├── oidc.test.ts
│       ├── storage-state.test.ts
│       └── credentials.test.ts
└── ...
```

**Coverage target:** 80%+

### 9.2 Integration Tests

Test module interactions with mock app:

```
core/
└── __integration__/
    ├── auth-flow.test.ts      # Full OIDC flow with mock IdP
    ├── fixtures.test.ts        # Fixture composition
    └── config-to-harness.test.ts
```

### 9.3 E2E Tests (Real Project)

Test on ITSS:

```
core/
└── __e2e__/
    └── itss/
        ├── smoke.test.ts
        └── auth.test.ts
```

### 9.4 Test Infrastructure

```yaml
# core/package.json scripts
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run --dir __tests__",
    "test:integration": "vitest run --dir __integration__",
    "test:e2e": "playwright test --config=__e2e__/playwright.config.ts",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## 10. Implementation Order

### Phase 1: Foundation (Week 1)

```
Day 1-2: Config System
├── [ ] Create core/config/ structure
├── [ ] Implement schema with Zod
├── [ ] Implement loader with env var resolution
├── [ ] Write unit tests
└── [ ] Document CONFIG_REFERENCE.md

Day 3-4: Playwright Harness
├── [ ] Create core/harness/ structure
├── [ ] Implement createPlaywrightConfig()
├── [ ] Implement project factories
├── [ ] Write unit tests
└── [ ] Test with minimal playwright.config.ts

Day 5: Integration
├── [ ] Integrate config → harness
├── [ ] Create example target project structure
└── [ ] Validate config-driven harness works
```

### Phase 2: Authentication (Week 2)

```
Day 1-2: Auth Infrastructure
├── [ ] Create core/auth/ structure
├── [ ] Implement AuthProvider interface
├── [ ] Implement storage state management
├── [ ] Implement credential management
└── [ ] Write unit tests

Day 3-4: OIDC Provider
├── [ ] Implement OIDCAuthProvider base
├── [ ] Implement Azure AD handler
├── [ ] Implement generic OIDC handler
├── [ ] Write integration tests with mock IdP
└── [ ] Test on ITSS (real OIDC)

Day 5: Auth Setup
├── [ ] Implement setup project factory
├── [ ] Generate auth setup template
├── [ ] Validate full auth flow
└── [ ] Document auth patterns
```

### Phase 3: Fixtures & Utilities (Week 3)

```
Day 1-2: Fixtures
├── [ ] Create core/fixtures/ structure
├── [ ] Implement base test fixture
├── [ ] Implement auth fixtures (authenticatedPage, etc.)
├── [ ] Implement data fixtures
└── [ ] Write unit tests

Day 3: Locators
├── [ ] Create core/locators/ structure
├── [ ] Implement locator factory
├── [ ] Implement strategy chain
└── [ ] Write unit tests

Day 4: Assertions
├── [ ] Create core/assertions/ structure
├── [ ] Implement toast assertions
├── [ ] Implement table assertions
├── [ ] Implement loading assertions
└── [ ] Write unit tests

Day 5: Data Harness
├── [ ] Create core/data/ structure
├── [ ] Implement namespacing
├── [ ] Implement cleanup manager
└── [ ] Write unit tests
```

### Phase 4: Polish & Integration (Week 4)

```
Day 1-2: Reporters
├── [ ] Create core/reporters/ structure
├── [ ] Implement ARTK reporter
├── [ ] Implement PII masking
└── [ ] Write unit tests

Day 3: Journey Integration
├── [ ] Move existing journey system to core
├── [ ] Integrate with fixtures
├── [ ] Update generator/validator
└── [ ] Test journey-to-test mapping

Day 4: Prompt Updates
├── [ ] Update /init prompt
├── [ ] Update /foundation-build prompt
├── [ ] Update /journey-implement prompt
└── [ ] Test prompt → core flow

Day 5: Documentation & Release
├── [ ] Complete all documentation
├── [ ] Create ITSS integration guide
├── [ ] Package core for vendoring
└── [ ] Final testing on ITSS
```

---

## 11. File Structure

### 11.1 Core Repository Structure

```
ARTK/
├── core/
│   ├── typescript/                    # TypeScript implementation
│   │   ├── config/
│   │   │   ├── index.ts
│   │   │   ├── loader.ts
│   │   │   ├── schema.ts
│   │   │   ├── types.ts
│   │   │   ├── env.ts
│   │   │   ├── defaults.ts
│   │   │   └── __tests__/
│   │   │
│   │   ├── harness/
│   │   │   ├── index.ts
│   │   │   ├── playwright.config.base.ts
│   │   │   ├── projects.ts
│   │   │   ├── reporters.ts
│   │   │   └── __tests__/
│   │   │
│   │   ├── auth/
│   │   │   ├── index.ts
│   │   │   ├── types.ts
│   │   │   ├── storage-state.ts
│   │   │   ├── credentials.ts
│   │   │   ├── setup-factory.ts
│   │   │   ├── providers/
│   │   │   │   ├── base.ts
│   │   │   │   ├── oidc.ts
│   │   │   │   ├── form.ts
│   │   │   │   ├── token.ts
│   │   │   │   └── custom.ts
│   │   │   ├── oidc/
│   │   │   │   ├── flow.ts
│   │   │   │   ├── token-refresh.ts
│   │   │   │   ├── discovery.ts
│   │   │   │   └── providers/
│   │   │   │       ├── generic.ts
│   │   │   │       ├── azure-ad.ts
│   │   │   │       ├── okta.ts
│   │   │   │       └── keycloak.ts
│   │   │   └── __tests__/
│   │   │
│   │   ├── fixtures/
│   │   │   ├── index.ts
│   │   │   ├── base.ts
│   │   │   ├── auth.ts
│   │   │   ├── api.ts
│   │   │   ├── data.ts
│   │   │   ├── types.ts
│   │   │   └── __tests__/
│   │   │
│   │   ├── locators/
│   │   │   ├── index.ts
│   │   │   ├── factory.ts
│   │   │   ├── strategies.ts
│   │   │   ├── testid.ts
│   │   │   ├── aria.ts
│   │   │   └── __tests__/
│   │   │
│   │   ├── assertions/
│   │   │   ├── index.ts
│   │   │   ├── toast.ts
│   │   │   ├── table.ts
│   │   │   ├── form.ts
│   │   │   ├── loading.ts
│   │   │   ├── url.ts
│   │   │   ├── api.ts
│   │   │   └── __tests__/
│   │   │
│   │   ├── data/
│   │   │   ├── index.ts
│   │   │   ├── namespace.ts
│   │   │   ├── cleanup.ts
│   │   │   ├── builders.ts
│   │   │   ├── api-client.ts
│   │   │   └── __tests__/
│   │   │
│   │   ├── reporters/
│   │   │   ├── index.ts
│   │   │   ├── artk-reporter.ts
│   │   │   ├── journey-reporter.ts
│   │   │   ├── artifacts.ts
│   │   │   ├── masking.ts
│   │   │   └── __tests__/
│   │   │
│   │   ├── journeys/                  # Moved from existing location
│   │   │   ├── schema/
│   │   │   ├── templates/
│   │   │   ├── tools/
│   │   │   └── docs/
│   │   │
│   │   ├── index.ts                   # Main entry point
│   │   ├── version.json
│   │   └── package.json
│   │
│   └── __integration__/               # Integration tests
│
├── prompts/                           # Updated prompts
├── docs/
│   ├── ARTK_Master_Launch_Document_v0.6.md
│   ├── CONFIG_REFERENCE.md            # New
│   └── ITSS_INTEGRATION_GUIDE.md      # New
│
├── research/                          # Research documents
├── CLAUDE.md
└── README.md
```

### 11.2 Target Project Structure (ITSS)

```
itss/
├── artk/
│   ├── .core/                         # Vendored (copied from ARTK/core/typescript/)
│   │   └── ... (all core modules)
│   │
│   ├── artk.config.yml                # Project configuration
│   ├── playwright.config.ts           # Generated
│   │
│   ├── src/
│   │   ├── fixtures/
│   │   │   └── index.ts               # Re-exports + extensions
│   │   ├── auth/
│   │   │   └── setup.auth.ts          # Generated auth setup
│   │   ├── pages/                     # AI-generated page objects
│   │   │   ├── dashboard.page.ts
│   │   │   └── settings.page.ts
│   │   ├── flows/                     # AI-generated flows
│   │   │   └── order.flow.ts
│   │   └── support/                   # Project utilities
│   │
│   ├── tests/
│   │   └── journeys/
│   │       ├── smoke/
│   │       │   └── login.spec.ts
│   │       └── release/
│   │           └── create-order.spec.ts
│   │
│   ├── journeys/
│   │   ├── BACKLOG.md
│   │   ├── proposed/
│   │   ├── defined/
│   │   └── clarified/
│   │
│   └── reports/                       # Generated reports
│
└── .github/
    └── prompts/                       # ARTK prompts
```

---

## 12. API Reference

### 12.1 Config Module

```typescript
// artk/.core/config

// Types
interface ARTKConfig {
  version: number;
  app: AppConfig;
  environments: Record<string, EnvironmentConfig>;
  activeEnvironment: string;
  auth: AuthConfig;
  selectors: SelectorsConfig;
  assertions: AssertionsConfig;
  data: DataConfig;
  fixtures: FixturesConfig;
  tiers: Record<string, TierConfig>;
  reporters: ReportersConfig;
  artifacts: ArtifactsConfig;
  browsers: BrowsersConfig;
  journeys: JourneysConfig;
}

// Functions
function loadConfig(configPath?: string): ARTKConfig;
function getConfig(): ARTKConfig;  // Cached
function resolveEnvVar(template: string): string;
function getCurrentEnvironment(): EnvironmentConfig;
```

### 12.2 Auth Module

```typescript
// artk/.core/auth

// Types
interface AuthProvider {
  login(page: Page, credentials: Credentials): Promise<void>;
  isSessionValid(page: Page): Promise<boolean>;
  logout(page: Page): Promise<void>;
}

interface Credentials {
  username: string;
  password: string;
}

// Classes
class OIDCAuthProvider implements AuthProvider { ... }
class FormAuthProvider implements AuthProvider { ... }
class TokenAuthProvider implements AuthProvider { ... }
abstract class CustomAuthProvider implements AuthProvider { ... }

// Functions
function getCredentials(role: string): Credentials;
function saveStorageState(context: BrowserContext, role: string): Promise<string>;
function loadStorageState(role: string): Promise<string | undefined>;
function isStorageStateValid(role: string, maxAgeMs?: number): Promise<boolean>;
function clearStorageState(role?: string): Promise<void>;
function createAuthSetup(role: string): SetupProject;
```

### 12.3 Fixtures Module

```typescript
// artk/.core/fixtures

// Main exports
export { test, expect } from './base';

// Fixture types (available in tests)
interface ARTKFixtures {
  config: ARTKConfig;
  authenticatedPage: Page;
  adminPage: Page;
  userPage: Page;
  apiContext: APIRequestContext;
  testData: TestDataManager;
  runId: string;
}
```

### 12.4 Locators Module

```typescript
// artk/.core/locators

function byRole(page: Page, role: string, options?: ByRoleOptions): Locator;
function byLabel(page: Page, text: string | RegExp): Locator;
function byTestId(page: Page, testId: string): Locator;
function byText(page: Page, text: string | RegExp): Locator;
function byPlaceholder(page: Page, text: string | RegExp): Locator;

function withinSection(page: Page, name: string): ScopedLocators;
function withinForm(page: Page, name: string): FormLocators;
function withinTable(page: Page, name: string): TableLocators;
```

### 12.5 Assertions Module

```typescript
// artk/.core/assertions

function expectToast(page: Page, message: string | RegExp, options?: ToastOptions): Promise<void>;
function expectNoToast(page: Page): Promise<void>;

function expectTableToContainRow(page: Page, table: string, row: RowMatcher): Promise<void>;
function expectTableRowCount(page: Page, table: string, count: number): Promise<void>;

function expectFormFieldError(page: Page, field: string, error: string | RegExp): Promise<void>;
function expectFormValid(page: Page, form: string): Promise<void>;

function expectLoading(page: Page): Promise<void>;
function expectNotLoading(page: Page, timeout?: number): Promise<void>;
function waitForLoadingComplete(page: Page): Promise<void>;

function expectUrlContains(page: Page, substring: string): Promise<void>;
function expectUrlMatches(page: Page, pattern: RegExp): Promise<void>;
```

### 12.6 Data Module

```typescript
// artk/.core/data

function generateRunId(): string;
function namespace(value: string, runId: string): string;
function parseNamespace(value: string): { original: string; runId: string | null };

class CleanupManager {
  register(fn: () => Promise<void>): void;
  registerApi(method: string, url: string, matcher?: object): void;
  runAll(): Promise<void>;
}

abstract class DataBuilder<T> {
  abstract build(): T;
  withNamespace(runId: string): this;
}

class DataApiClient {
  constructor(baseUrl: string, authToken?: string);
  create<T>(endpoint: string, data: T): Promise<T & { id: string }>;
  delete(endpoint: string, id: string): Promise<void>;
  deleteWhere(endpoint: string, filter: object): Promise<number>;
}
```

---

## Appendix A: ITSS-Specific Notes

### A.1 Known ITSS Configuration

```yaml
# ITSS artk.config.yml
app:
  name: ITSS
  baseUrl: ${ITSS_BASE_URL:-http://localhost:5173}
  type: spa

auth:
  provider: oidc

  roles:
    admin:
      credentialsEnv:
        username: ITSS_ADMIN_USER
        password: ITSS_ADMIN_PASS
      description: Full admin access (jadmin)

    productManager:
      credentialsEnv:
        username: ITSS_PM_USER
        password: ITSS_PM_PASS
      description: Product manager (jpm)

    hrManager:
      credentialsEnv:
        username: ITSS_HR_USER
        password: ITSS_HR_PASS
      description: HR manager (jhr)

  oidc:
    idpType: keycloak  # KEYCLOAK (not Azure AD)
    loginUrl: /        # App auto-redirects to Keycloak

    success:
      url: /
      # Alternative: selector: '[data-testid="user-menu"]'

    idpSelectors:
      username: '#username'
      password: '#password'
      submit: '#kc-login'

    mfa:
      enabled: true    # MFA IS ENABLED
      type: totp
      totpSecretEnv: ITSS_TOTP_SECRET

    timeouts:
      loginFlowMs: 45000  # Extra time for MFA
```

### A.2 ITSS Roles (Confirmed)

| Role | Test User | Description |
|------|-----------|-------------|
| ROLE_ADMIN | jadmin | Full admin access |
| ROLE_PRODUCT_MANAGER | jpm | Manage products/templates |
| ROLE_TECHNICAL_PM | jtpm | Technical PM |
| ROLE_IT_SUPPORT | jexit | IT Support |
| ROLE_HR_MANAGER | jhr | HR movements |
| ROLE_HR_ADMIN | npatel | Full HR admin |
| ROLE_LOGISTIC | mmartinez | Logistics |
| ROLE_PARTNERS_SECRETARIES | jcoffey | Partner secretaries |

### A.3 ITSS Tech Stack

- **Frontend:** React 18.3.1 + Vite + TypeScript + Ant Design
- **Backend:** Spring Boot 3.2.4 + Java 17 + PostgreSQL
- **Auth:** Keycloak OIDC with PKCE + MFA (TOTP)
- **Auth Library:** react-oauth2-code-pkce

### A.4 ITSS Environment Variables Needed

```bash
# .env.local (never commit)
ITSS_BASE_URL=http://localhost:5173
ITSS_API_URL=http://localhost:8085

# Admin role
ITSS_ADMIN_USER=jadmin
ITSS_ADMIN_PASS=password

# Product Manager
ITSS_PM_USER=jpm
ITSS_PM_PASS=password

# HR Manager
ITSS_HR_USER=jhr
ITSS_HR_PASS=password

# MFA TOTP secret (base32 encoded)
ITSS_TOTP_SECRET=<totp-secret-from-keycloak>
```

### A.5 ITSS Routes for Testing

| Route | Role Required | Feature Toggle |
|-------|---------------|----------------|
| `/` | Any | - |
| `/catalog` | Any | - |
| `/request` | Any | REQUEST_FEATURE |
| `/myproduct` | PRODUCT_MANAGER | - |
| `/hr-movement` | HR roles | HR_MOVEMENT_FEATURE |
| `/admin` | ADMIN | - |

### A.6 Dual Auth Mode

ITSS supports basic auth for development:
```yaml
pictet.security.basicAuthActivated: true
```

Consider adding `FormAuthProvider` support for faster local dev testing (bypasses Keycloak).

---

## Appendix B: Decision Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Distribution | Vendor/copy | No npm infra needed, works offline |
| Package structure | Monolith → split later | Ship fast, refactor when needed |
| Auth focus | OIDC (Keycloak) | Enterprise requirement (ITSS uses Keycloak with MFA) |
| Language | TypeScript first | Most common, best tooling |
| CLI | Prompts only | AI-driven is the differentiator |
| Testing | Comprehensive | Quality reflects on you |
| Primary IdP | Keycloak | ITSS uses Keycloak; also support Azure AD, Okta, generic |
| MFA Support | TOTP | ITSS has MFA enabled; implement TOTP handling |

---

## Appendix C: Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| OIDC complexity | High | Start with Azure AD (ITSS uses it), add others |
| IdP variations | Medium | Config-driven selectors, escape hatch |
| Breaking changes | Medium | Version file, migration docs |
| Prompt/core sync | Medium | Explicit core version in prompts |

---

**End of Specification**

*Document version: 1.0.0-spec*
*Last updated: 2024-12-29*
*Status: Awaiting approval*
