# Data Model: ARTK Core v1 Infrastructure Library

**Date**: 2025-12-29
**Feature**: 001-artk-core-v1
**Status**: Complete

## Overview

This document defines the core data structures, entities, and their relationships for ARTK Core v1. All types are designed for TypeScript with Zod runtime validation where applicable.

---

## 1. Configuration Entities

### 1.1 ARTKConfig (Root)

The root configuration object loaded from `artk.config.yml`.

```typescript
interface ARTKConfig {
  version: number;                              // Schema version (1)
  app: AppConfig;                               // Application settings
  environments: Record<string, EnvironmentConfig>; // Named environments
  activeEnvironment: string;                    // Current environment key
  auth: AuthConfig;                             // Authentication settings
  selectors: SelectorsConfig;                   // Locator configuration
  assertions: AssertionsConfig;                 // Assertion selectors
  data: DataConfig;                             // Data harness settings
  fixtures: FixturesConfig;                     // Fixture configuration
  tiers: Record<string, TierConfig>;            // Test tier settings
  reporters: ReportersConfig;                   // Reporter configuration
  artifacts: ArtifactsConfig;                   // Artifact settings
  browsers: BrowsersConfig;                     // Browser configuration
  journeys: JourneysConfig;                     // Journey system settings
}
```

**Validation Rules**:
- `version` must equal 1
- `app.baseUrl` must be valid URL or env var template
- `auth.roles` must have at least one role
- `activeEnvironment` must match a key in `environments` or be env var

---

### 1.2 AppConfig

Application metadata and base URL.

```typescript
interface AppConfig {
  name: string;                    // Application name (e.g., "ITSS")
  baseUrl: string;                 // Base URL with env var support: ${VAR:-default}
  type: 'spa' | 'ssr' | 'hybrid';  // Application type (default: 'spa')
}
```

---

### 1.3 EnvironmentConfig

Environment-specific URL overrides.

```typescript
interface EnvironmentConfig {
  baseUrl: string;   // Environment base URL
  apiUrl?: string;   // Optional API URL override
}
```

---

### 1.4 AuthConfig

Authentication provider and role definitions.

```typescript
interface AuthConfig {
  provider: 'oidc' | 'form' | 'token' | 'custom';
  storageState: StorageStateConfig;
  roles: Record<string, RoleConfig>;
  oidc?: OIDCConfig;      // Required when provider: 'oidc'
  form?: FormAuthConfig;  // Required when provider: 'form'
}

interface StorageStateConfig {
  directory: string;       // Relative to artk/ (default: '.auth-states')
  maxAgeMinutes: number;   // Session validity (default: 60)
  filePattern: string;     // Naming pattern: '{role}.json' or '{role}-{env}.json'
}

interface RoleConfig {
  credentialsEnv: {
    username: string;      // Env var name for username
    password: string;      // Env var name for password
  };
  description?: string;    // Human-readable description
  oidcOverrides?: Partial<OIDCConfig>;  // Role-specific OIDC settings
}
```

---

### 1.5 OIDCConfig

OIDC-specific authentication configuration.

```typescript
interface OIDCConfig {
  idpType: 'keycloak' | 'azure-ad' | 'okta' | 'auth0' | 'generic';
  loginUrl: string;                  // App's login initiation URL
  idpLoginUrl?: string;              // Direct IdP URL (alternative)
  success: {
    url?: string;                    // URL to wait for after login
    selector?: string;               // Element to wait for
    timeout?: number;                // Success detection timeout (ms)
  };
  idpSelectors?: {
    username?: string;               // Username input selector
    password?: string;               // Password input selector
    submit?: string;                 // Submit button selector
    staySignedInNo?: string;         // "No" to stay signed in prompt
  };
  mfa?: MFAConfig;
  timeouts?: {
    loginFlowMs?: number;            // Total flow timeout (default: 30000)
    idpRedirectMs?: number;          // IdP redirect wait (default: 10000)
    callbackMs?: number;             // App callback wait (default: 10000)
  };
  logout?: {
    url?: string;                    // App's logout URL
    idpLogout?: boolean;             // Also logout from IdP
  };
}

interface MFAConfig {
  enabled: boolean;                  // Whether MFA is active
  type: 'totp' | 'push' | 'sms' | 'none';
  totpSecretEnv?: string;            // Env var for TOTP secret
  pushTimeoutMs?: number;            // Push approval timeout (default: 30000)
}
```

---

### 1.6 SelectorsConfig

Locator strategy configuration.

```typescript
interface SelectorsConfig {
  testIdAttribute: string;           // Test ID attribute (default: 'data-testid')
  strategy: LocatorStrategy[];       // Strategy order (first match wins)
  customTestIds?: string[];          // Additional test ID attributes
}

type LocatorStrategy = 'role' | 'label' | 'placeholder' | 'testid' | 'text' | 'css';
```

---

### 1.7 AssertionsConfig

Assertion helper selectors.

```typescript
interface AssertionsConfig {
  toast: {
    containerSelector: string;       // Toast container
    messageSelector: string;         // Message within toast
    typeAttribute: string;           // Attribute for toast type
    timeout?: number;                // Default timeout (ms)
  };
  loading: {
    selectors: string[];             // Loading indicator selectors
    timeout?: number;                // Default timeout (ms)
  };
  form: {
    errorSelector: string;           // Field error (with {field} placeholder)
    formErrorSelector: string;       // Form-level error
  };
}
```

---

### 1.8 DataConfig

Data harness configuration.

```typescript
interface DataConfig {
  namespace: {
    prefix: string;                  // Namespace prefix (default: '[artk-')
    suffix: string;                  // Namespace suffix (default: ']')
  };
  cleanup: {
    enabled: boolean;                // Enable auto-cleanup
    onFailure: boolean;              // Cleanup even on test failure
    parallel: boolean;               // Run cleanup in parallel
  };
  api?: {
    baseUrl: string;                 // Data API base URL
    useMainAuth: boolean;            // Use main auth for API calls
  };
}
```

---

### 1.9 FixturesConfig

Fixture configuration.

```typescript
interface FixturesConfig {
  defaultRole: string;               // Default role for authenticatedPage
  roleFixtures: string[];            // Roles that get dedicated fixtures
  api?: {
    baseURL: string;                 // API context base URL
    extraHTTPHeaders?: Record<string, string>;
  };
}
```

---

### 1.10 TierConfig

Test tier-specific settings.

```typescript
interface TierConfig {
  retries: number;                   // Retry count
  workers: number;                   // Parallel workers
  timeout: number;                   // Global timeout (ms)
  tag: string;                       // Filter tag (e.g., '@smoke')
}
```

---

### 1.11 ReportersConfig

Reporter configuration.

```typescript
interface ReportersConfig {
  html?: {
    enabled: boolean;
    outputFolder: string;
    open: 'always' | 'never' | 'on-failure';
  };
  json?: {
    enabled: boolean;
    outputFile: string;
  };
  junit?: {
    enabled: boolean;
    outputFile: string;
  };
  artk?: {
    enabled: boolean;
    outputFile: string;
    includeJourneyMapping: boolean;
  };
}
```

---

### 1.12 ArtifactsConfig

Test artifact settings.

```typescript
interface ArtifactsConfig {
  outputDir: string;                 // Base output directory
  screenshots: {
    mode: 'off' | 'on' | 'only-on-failure';
    fullPage: boolean;
    maskPii: boolean;
    piiSelectors: string[];          // Selectors to mask
  };
  video: {
    mode: 'off' | 'on' | 'retain-on-failure' | 'on-first-retry';
    size?: { width: number; height: number };
  };
  trace: {
    mode: 'off' | 'on' | 'retain-on-failure' | 'on-first-retry';
    screenshots?: boolean;
    snapshots?: boolean;
  };
}
```

---

### 1.13 BrowsersConfig

Browser configuration.

```typescript
interface BrowsersConfig {
  enabled: ('chromium' | 'firefox' | 'webkit')[];
  viewport: { width: number; height: number };
  headless: boolean;
  slowMo?: number;                   // Slowdown for debugging (ms)
}
```

---

### 1.14 JourneysConfig

Journey system configuration.

```typescript
interface JourneysConfig {
  id: {
    prefix: string;                  // ID prefix (default: 'JRN')
    width: number;                   // Zero-padded width (default: 4)
  };
  layout: 'flat' | 'staged';         // Directory layout
  backlog: {
    groupBy: 'tier' | 'status' | 'scope';
    thenBy?: 'tier' | 'status' | 'scope';
  };
}
```

---

## 2. Runtime Entities

### 2.1 AuthProvider (Interface)

Abstract interface for authentication providers.

```typescript
interface AuthProvider {
  login(page: Page, credentials: Credentials): Promise<void>;
  isSessionValid(page: Page): Promise<boolean>;
  refreshSession?(page: Page): Promise<boolean>;
  logout(page: Page): Promise<void>;
}

interface Credentials {
  username: string;
  password: string;
}
```

**Implementations**:
- `OIDCAuthProvider`: OIDC flow with IdP-specific handlers
- `FormAuthProvider`: Direct form-based login
- `TokenAuthProvider`: API-based token auth
- `CustomAuthProvider`: User-defined (abstract base)

---

### 2.2 StorageState

Persisted browser state for session reuse.

```typescript
interface StorageState {
  cookies: Cookie[];
  origins: {
    origin: string;
    localStorage: { name: string; value: string }[];
  }[];
}

// File metadata (not in state file itself)
interface StorageStateMetadata {
  role: string;
  createdAt: Date;
  path: string;
  isValid: boolean;     // Based on maxAge
}
```

---

### 2.3 TestDataManager

Fixture for managing test data lifecycle.

```typescript
interface TestDataManager {
  runId: string;

  // Register cleanup function
  cleanup(fn: () => Promise<void>): void;

  // Register API-based cleanup
  cleanupApi(method: string, url: string, matcher?: object): void;

  // Execute all registered cleanups (called by fixture teardown)
  runCleanup(): Promise<void>;
}
```

---

### 2.4 CleanupManager

Internal manager for cleanup operations.

```typescript
interface CleanupEntry {
  fn: () => Promise<void>;
  priority: number;     // Lower runs first
  label?: string;       // For logging
}

class CleanupManager {
  private entries: CleanupEntry[];

  register(fn: () => Promise<void>, options?: { priority?: number; label?: string }): void;
  runAll(): Promise<void>;  // Runs in priority order, continues on error
}
```

---

### 2.5 DataBuilder (Abstract)

Base class for test data builders.

```typescript
abstract class DataBuilder<T> {
  protected runId?: string;

  withNamespace(runId: string): this;

  protected namespacedValue(value: string): string;

  abstract build(): T;
  abstract buildForApi?(): Record<string, unknown>;
}
```

---

### 2.6 ScopedLocators

Scoped locator helpers for forms, tables, sections.

```typescript
interface FormLocators {
  field(name: string): Locator;
  fieldByLabel(label: string): Locator;
  submit(): Locator;
  cancel(): Locator;
  error(field: string): Locator;
}

interface TableLocators {
  row(index: number): Locator;
  rowContaining(text: string): Locator;
  cell(row: number, column: number | string): Locator;
  header(column: number | string): Locator;
}

interface SectionLocators {
  locator(selector: string): Locator;
  byTestId(testId: string): Locator;
  byRole(role: string, options?: ByRoleOptions): Locator;
}
```

---

### 2.7 ARTKReportResult

ARTK reporter output format.

```typescript
interface ARTKReportResult {
  timestamp: string;
  duration: number;
  config: {
    app: string;
    environment: string;
    tier: string;
  };
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    flaky: number;
  };
  journeys: JourneyResult[];
  tests: TestResult[];
}

interface JourneyResult {
  id: string;           // JRN-0001
  status: 'pass' | 'fail' | 'partial' | 'skipped';
  tests: string[];      // Test file paths
}

interface TestResult {
  title: string;
  file: string;
  journeyId?: string;   // Extracted from @JRN-#### tag
  status: 'pass' | 'fail' | 'skip' | 'flaky';
  duration: number;
  error?: string;
  retry?: number;
}
```

---

### 2.8 LogEntry

Structured log entry format.

```typescript
interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  module: string;       // e.g., 'config', 'auth', 'fixtures'
  operation: string;    // e.g., 'loadConfig', 'saveStorageState'
  timestamp: string;    // ISO 8601
  message: string;
  context?: Record<string, unknown>;  // Additional data
}
```

---

## 3. Error Types

### 3.1 ARTKConfigError

Configuration validation error.

```typescript
class ARTKConfigError extends Error {
  constructor(
    message: string,
    public field: string,           // JSON path: 'auth.oidc.idpType'
    public suggestion?: string      // 'Did you mean: keycloak, azure-ad, okta?'
  );
}
```

### 3.2 ARTKAuthError

Authentication failure error.

```typescript
class ARTKAuthError extends Error {
  constructor(
    message: string,
    public role: string,
    public phase: 'navigation' | 'credentials' | 'mfa' | 'callback',
    public idpResponse?: string,
    public remediation?: string
  );
}
```

### 3.3 ARTKStorageStateError

Storage state error.

```typescript
class ARTKStorageStateError extends Error {
  constructor(
    message: string,
    public role: string,
    public path: string,
    public cause: 'missing' | 'expired' | 'corrupted' | 'invalid'
  );
}
```

---

## 4. Entity Relationships

```
┌─────────────────────────────────────────────────────────────────────┐
│                          ARTKConfig                                  │
│  (root configuration object)                                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐      │
│  │  AuthConfig  │───▶│  RoleConfig  │───▶│  Credentials     │      │
│  └──────────────┘    └──────────────┘    │  (from env vars) │      │
│         │                   │             └──────────────────┘      │
│         ▼                   │                                       │
│  ┌──────────────┐           │                                       │
│  │  OIDCConfig  │───────────┼───▶ AuthProvider ───▶ StorageState   │
│  └──────────────┘           │                                       │
│                             │                                       │
│  ┌──────────────┐           │                                       │
│  │ FixturesConfig│───────────┘                                       │
│  └──────────────┘                                                   │
│         │                                                           │
│         ▼                                                           │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                      Playwright Fixtures                       │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌───────────────┐  │ │
│  │  │authenticatedPage│  │   apiContext    │  │   testData    │  │ │
│  │  └─────────────────┘  └─────────────────┘  └───────────────┘  │ │
│  │           │                    │                   │          │ │
│  │           ▼                    ▼                   ▼          │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌───────────────┐  │ │
│  │  │    Locators     │  │   Assertions    │  │CleanupManager │  │ │
│  │  └─────────────────┘  └─────────────────┘  └───────────────┘  │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐                              │
│  │ReportersConfig│───▶│ ARTKReporter │───▶ ARTKReportResult        │
│  └──────────────┘    └──────────────┘                              │
│                             │                                       │
│                             ▼                                       │
│                      JourneyResult                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Validation Schema (Zod)

Key validation schemas for runtime type checking:

```typescript
// Example Zod schemas (full implementation in core/config/schema.ts)

const AppConfigSchema = z.object({
  name: z.string().min(1),
  baseUrl: z.string(),  // Validated after env var resolution
  type: z.enum(['spa', 'ssr', 'hybrid']).default('spa'),
});

const RoleConfigSchema = z.object({
  credentialsEnv: z.object({
    username: z.string().min(1),
    password: z.string().min(1),
  }),
  description: z.string().optional(),
});

const OIDCConfigSchema = z.object({
  idpType: z.enum(['keycloak', 'azure-ad', 'okta', 'auth0', 'generic']),
  loginUrl: z.string(),
  success: z.object({
    url: z.string().optional(),
    selector: z.string().optional(),
    timeout: z.number().default(5000),
  }).refine(
    data => data.url || data.selector,
    { message: 'Either success.url or success.selector is required' }
  ),
  mfa: z.object({
    enabled: z.boolean().default(false),
    type: z.enum(['totp', 'push', 'sms', 'none']).default('none'),
    totpSecretEnv: z.string().optional(),
  }).optional(),
});
```

---

## References

- [Feature Specification](spec.md)
- [Research Document](research.md)
- [ARTK Core v1 Detailed Specification](../../docs/ARTK_Core_v1_Specification.md)
