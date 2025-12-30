# ARTK Core v1 - Implementation Fixes Plan

**Created:** 2025-12-30
**Source:** Critical Review (`research/2025-12-30_artk_core_v1_critical_review.md`)
**Status:** Ready for Implementation

---

## Overview

This document contains all identified issues from the ARTK Core v1 critical review, organized by priority with detailed implementation steps.

**Total Issues:** 15
- P0 (Critical): 2
- P1 (High): 2
- P2 (Medium): 4
- P3 (Minor): 7

---

## P0 - CRITICAL (Must Fix Before Release)

### P0-1: Fix Sample Config Schema Mismatch

**File:** `core/typescript/__fixtures__/artk.config.yml`

**Priority:** P0 | **Effort:** Low | **Impact:** High

**Problem:** The sample config file contains values that fail Zod validation, breaking the user's first experience.

**Specific Fixes Required:**

#### Fix 1: Invalid `app.type` value (Line 9)
```yaml
# CURRENT (INVALID)
app:
  name: Sample Application
  type: web-app  # ❌ Not in schema

# FIXED
app:
  name: Sample Application
  type: spa  # ✅ Valid: 'spa' | 'ssr' | 'hybrid'
  baseUrl: ${APP_BASE_URL:-http://localhost:3000}
```

#### Fix 2: Invalid `assertions` structure (Lines 75-83)
```yaml
# CURRENT (INVALID)
assertions:
  toast:
    timeout: 5000
    dismissTimeout: 10000  # ❌ Not in schema
  loading:
    timeout: 30000  # ❌ Missing required 'selectors' array
  form:
    timeout: 5000  # ❌ Missing required fields

# FIXED
assertions:
  toast:
    containerSelector: '[role="alert"]'
    messageSelector: '.toast-message'
    typeAttribute: 'data-toast-type'
    timeout: 5000
  loading:
    selectors:
      - '[data-loading="true"]'
      - '.loading-spinner'
      - '[aria-busy="true"]'
    timeout: 30000
  form:
    errorSelector: '.field-error'
    formErrorSelector: '.form-error'
```

#### Fix 3: Invalid `data.cleanup` structure (Lines 90-93)
```yaml
# CURRENT (INVALID)
data:
  namespace:
    prefix: artk
    suffix: runId
  cleanup:
    onFailure: keep  # ❌ Should be boolean
    maxRetries: 3    # ❌ Not in schema

# FIXED
data:
  namespace:
    prefix: artk
    suffix: runId
  cleanup:
    enabled: true
    onFailure: false  # ✅ Boolean: skip cleanup on test failure
    parallel: true
```

#### Fix 4: Invalid `browsers` structure (Lines 152-166)
```yaml
# CURRENT (INVALID - nested browser configs)
browsers:
  chromium:
    enabled: true
    viewport:
      width: 1280
      height: 720
  firefox:
    enabled: false
    ...

# FIXED (flat structure per schema)
browsers:
  enabled:
    - chromium
  viewport:
    width: 1280
    height: 720
  headless: true
```

#### Fix 5: Invalid `journeys` structure (Lines 169-176)
```yaml
# CURRENT (INVALID)
journeys:
  directory: journeys
  idPrefix: JRN
  idWidth: 4
  backlog:
    path: journeys/BACKLOG.md
    groupBy: tier
    layout: checklist  # ❌ Not in schema

# FIXED
journeys:
  id:
    prefix: JRN
    width: 4
  layout: flat  # ✅ Valid: 'flat' | 'staged'
  backlog:
    groupBy: tier  # ✅ Valid: 'tier' | 'status' | 'scope'
```

**Verification:**
```bash
cd core/typescript
npm run test -- --grep "config.*validation"
```

**Acceptance Criteria:**
- [ ] Sample config passes Zod validation
- [ ] All unit tests still pass
- [ ] `loadConfig()` successfully loads sample config

---

### P0-2: Unify TestDataManager Type Collision

**Files:**
- `core/typescript/fixtures/index.ts`
- `core/typescript/data/index.ts`
- `core/typescript/index.ts`

**Priority:** P0 | **Effort:** Low | **Impact:** Medium

**Problem:** Two different types named `TestDataManager` exist, exported with confusing aliases:
```typescript
// index.ts:77
export { type TestDataManager as FixtureTestDataManager } from './fixtures/index.js';

// index.ts:105
export { type TestDataManager as DataTestDataManager } from './data/index.js';
```

**Solution:** Rename at source to avoid confusion.

**Implementation Steps:**

1. **Identify the actual interfaces:**
   ```bash
   grep -n "interface TestDataManager" core/typescript/*/index.ts
   grep -n "type TestDataManager" core/typescript/*/index.ts
   ```

2. **Rename in `data/index.ts`:**
   ```typescript
   // BEFORE
   export interface TestDataManager { ... }

   // AFTER
   export interface CleanupContext { ... }
   ```

3. **Update `fixtures/index.ts`** to keep `TestDataManager` (more commonly used):
   ```typescript
   // Keep as-is - this is the primary TestDataManager
   export interface TestDataManager { ... }
   ```

4. **Update main barrel export:**
   ```typescript
   // index.ts - BEFORE
   export { type TestDataManager as FixtureTestDataManager } from './fixtures/index.js';
   export { type TestDataManager as DataTestDataManager } from './data/index.js';

   // index.ts - AFTER
   export { type TestDataManager } from './fixtures/index.js';
   export { type CleanupContext } from './data/index.js';
   ```

5. **Update all internal usages** of the renamed type.

**Verification:**
```bash
npm run typecheck
npm run test
```

**Acceptance Criteria:**
- [ ] No duplicate type names in exports
- [ ] TypeScript compilation passes
- [ ] All tests pass
- [ ] JSDoc updated with clear descriptions

---

## P1 - HIGH PRIORITY (Should Fix Soon)

### P1-1: Add OIDC + TOTP Integration Test

**Location:** `core/typescript/tests/integration/`

**Priority:** P1 | **Effort:** Medium | **Impact:** Medium

**Problem:** No integration test validates the complete OIDC flow with TOTP MFA (FR-009, FR-010).

**Implementation Steps:**

1. **Create test file:**
   ```
   core/typescript/tests/integration/oidc-totp-flow.test.ts
   ```

2. **Test structure:**
   ```typescript
   import { describe, it, expect, vi } from 'vitest';
   import { OIDCAuthProvider } from '../../auth/index.js';
   import { authenticator } from 'otplib';

   describe('OIDC + TOTP Integration', () => {
     it('should complete OIDC flow with TOTP MFA', async () => {
       // Setup: Mock page and TOTP secret
       const mockPage = createMockPage();
       const totpSecret = 'JBSWY3DPEHPK3PXP'; // Test secret

       // Configure provider with MFA
       const provider = new OIDCAuthProvider({
         idpType: 'keycloak',
         loginUrl: '/auth/login',
         success: { url: '/dashboard' },
         mfa: {
           enabled: true,
           type: 'totp',
           totpSecretEnv: 'TEST_TOTP_SECRET',
         },
       });

       // Set env var for test
       process.env.TEST_TOTP_SECRET = totpSecret;

       // Execute login
       await provider.login(mockPage, {
         username: 'test@example.com',
         password: 'password123',
       });

       // Verify TOTP was generated and submitted
       expect(mockPage.fill).toHaveBeenCalledWith(
         expect.any(String),
         expect.stringMatching(/^\d{6}$/) // 6-digit TOTP
       );
     });

     it('should respect MFA timeout configuration (FR-010)', async () => {
       const provider = new OIDCAuthProvider({
         // ... config with custom timeout
         mfa: {
           enabled: true,
           type: 'totp',
           pushTimeoutMs: 30000, // Custom timeout
         },
       });

       // Verify timeout is applied
       expect(provider.getConfig().mfa?.pushTimeoutMs).toBe(30000);
     });

     it('should handle TOTP entry failure gracefully', async () => {
       // Test retry logic when TOTP fails
     });
   });
   ```

3. **Add mock helpers** for Playwright Page if not exists.

**Verification:**
```bash
npm run test -- tests/integration/oidc-totp-flow.test.ts
```

**Acceptance Criteria:**
- [ ] Integration test for OIDC + TOTP flow exists
- [ ] Test covers FR-009 (TOTP generation)
- [ ] Test covers FR-010 (timeout configuration)
- [ ] Test passes consistently

---

### P1-2: Document Custom Auth Provider Implementation

**Location:** `core/typescript/README.md` or new `docs/custom-auth.md`

**Priority:** P1 | **Effort:** Low | **Impact:** Medium

**Problem:** FR-006 mentions "Custom auth provider support" but there's no documentation.

**Implementation Steps:**

1. **Create documentation file:**
   ```
   core/typescript/docs/custom-auth-providers.md
   ```

2. **Content to include:**
   ```markdown
   # Implementing Custom Auth Providers

   ARTK Core supports custom authentication providers for scenarios
   not covered by the built-in OIDC, Form, or Token providers.

   ## AuthProvider Interface

   Your custom provider must implement this interface:

   ```typescript
   import type { Page } from '@playwright/test';

   interface AuthProvider {
     login(page: Page, credentials: Credentials): Promise<void>;
     logout(page: Page): Promise<void>;
     isSessionValid(page: Page): Promise<boolean>;
   }
   ```

   ## Example: SAML Provider

   ```typescript
   import { BaseAuthProvider } from '@artk/core/auth';

   export class SAMLAuthProvider extends BaseAuthProvider {
     constructor(config: SAMLConfig) {
       super('saml');
       this.config = config;
     }

     async login(page: Page, credentials: Credentials): Promise<void> {
       // Navigate to SAML IdP
       await page.goto(this.config.idpUrl);

       // Fill credentials
       await page.fill('#username', credentials.username);
       await page.fill('#password', credentials.password);
       await page.click('#submit');

       // Wait for SAML assertion redirect
       await page.waitForURL(this.config.successUrl);
     }

     // ... implement other methods
   }
   ```

   ## Configuration

   ```yaml
   # artk.config.yml
   auth:
     provider: custom
     # Custom providers are instantiated in your test setup
   ```

   ## Using Custom Provider

   ```typescript
   // playwright.config.ts
   import { SAMLAuthProvider } from './auth/saml-provider';

   const customProvider = new SAMLAuthProvider({
     idpUrl: process.env.SAML_IDP_URL,
     successUrl: '/dashboard',
   });

   // Use in setup project...
   ```
   ```

3. **Update main README** to reference this doc.

**Acceptance Criteria:**
- [ ] Documentation exists for custom auth providers
- [ ] Example code is complete and working
- [ ] Referenced from main README

---

## P2 - MEDIUM PRIORITY (Nice to Have)

### P2-1: Add Default PII Selectors

**File:** `core/typescript/config/defaults.ts`

**Priority:** P2 | **Effort:** Low | **Impact:** Medium

**Problem:** `piiSelectors` defaults to empty array, making PII masking effectively disabled.

**Implementation:**
```typescript
// defaults.ts - BEFORE
export const DEFAULT_ARTIFACTS = {
  screenshots: {
    maskPii: true,
    piiSelectors: [],  // Empty!
  },
  // ...
};

// defaults.ts - AFTER
export const DEFAULT_ARTIFACTS = {
  screenshots: {
    maskPii: true,
    piiSelectors: [
      // Common PII input patterns
      'input[type="password"]',
      'input[name*="ssn"]',
      'input[name*="social"]',
      'input[name*="credit"]',
      'input[name*="card"]',
      'input[name*="cvv"]',
      'input[name*="account"]',
      'input[autocomplete="cc-number"]',
      'input[autocomplete="cc-csc"]',
      // Data attribute markers
      '[data-pii]',
      '[data-sensitive]',
      '[data-mask]',
      // Common class patterns
      '.pii-field',
      '.sensitive-data',
    ],
  },
  // ...
};
```

**Acceptance Criteria:**
- [ ] Default PII selectors cover common cases
- [ ] Users can override with their own selectors
- [ ] Documentation updated

---

### P2-2: Validate Credentials at Config Load Time

**File:** `core/typescript/auth/credentials.ts`

**Priority:** P2 | **Effort:** Medium | **Impact:** Medium

**Problem:** Missing env vars cause cryptic errors at auth time, not config load time.

**Implementation:**
```typescript
// Add to config validation
export function validateCredentialsConfig(
  roles: Record<string, RoleConfig>
): void {
  const missingVars: string[] = [];

  for (const [roleName, roleConfig] of Object.entries(roles)) {
    const { username, password } = roleConfig.credentialsEnv;

    if (!process.env[username]) {
      missingVars.push(`${username} (for role '${roleName}')`);
    }
    if (!process.env[password]) {
      missingVars.push(`${password} (for role '${roleName}')`);
    }
  }

  if (missingVars.length > 0) {
    throw new ARTKConfigError(
      `Missing required environment variables:\n` +
      missingVars.map(v => `  - ${v}`).join('\n') +
      `\n\nSet these variables before running tests.`,
      'credentials'
    );
  }
}
```

**Call from `loadConfig()`:**
```typescript
export function loadConfig(options?: LoadConfigOptions): ARTKConfig {
  const config = loadAndValidateYaml();

  // Early validation of credentials
  if (!options?.skipCredentialsValidation) {
    validateCredentialsConfig(config.auth.roles);
  }

  return config;
}
```

**Acceptance Criteria:**
- [ ] Missing env vars detected at config load
- [ ] Clear error message with all missing vars listed
- [ ] Option to skip for dry-run scenarios

---

### P2-3: Document Cleanup Order with Parallel Mode

**File:** `core/typescript/docs/data-cleanup.md` (new)

**Priority:** P2 | **Effort:** Low | **Impact:** Low

**Problem:** FR-027 states "Cleanup runs in reverse registration order" but `cleanup.parallel: true` config option may conflict.

**Documentation to add:**
```markdown
# Test Data Cleanup

## Cleanup Order

By default, cleanup callbacks run in **reverse registration order**
(last registered = first to run). This ensures proper teardown of
dependent resources.

## Parallel Cleanup

When `data.cleanup.parallel: true` is set:
- Cleanup callbacks run concurrently for speed
- **Order is NOT guaranteed** in parallel mode
- Use parallel only when cleanups are independent

## Best Practices

1. **Independent cleanups** → Use `parallel: true`
2. **Dependent cleanups** → Use `parallel: false` (default)
3. **Mixed** → Register order-sensitive cleanups together,
   independent ones can still benefit from concurrency
```

**Acceptance Criteria:**
- [ ] Documentation explains parallel vs sequential cleanup
- [ ] Warnings about order guarantees are clear

---

### P2-4: Add Quickstart User Validation Evidence (SC-009)

**Priority:** P2 | **Effort:** Low | **Impact:** Low

**Problem:** SC-009 requires quickstart.md validation with new users.

**Action Items:**
1. Share quickstart.md with 2-3 developers unfamiliar with ARTK
2. Ask them to follow the guide and report issues
3. Document feedback in `docs/quickstart-feedback.md`
4. Address any confusion points

**Acceptance Criteria:**
- [ ] At least 2 developers tested quickstart
- [ ] Feedback documented
- [ ] Confusion points addressed in quickstart.md

---

## P3 - MINOR (Low Priority)

### P3-1: Add Git SHA to Version File

**File:** `core/typescript/version.json`

**Priority:** P3 | **Effort:** Low | **Impact:** Low

**Implementation:**

Add build script to `package.json`:
```json
{
  "scripts": {
    "version:update": "node -e \"const v=require('./version.json'); v.gitSha=require('child_process').execSync('git rev-parse --short HEAD').toString().trim(); require('fs').writeFileSync('./version.json', JSON.stringify(v,null,2));\""
  }
}
```

Or create `scripts/update-version.js`:
```javascript
const fs = require('fs');
const { execSync } = require('child_process');

const version = require('../version.json');
version.gitSha = execSync('git rev-parse --short HEAD').toString().trim();
version.buildTime = new Date().toISOString();

fs.writeFileSync(
  './version.json',
  JSON.stringify(version, null, 2)
);
```

**Acceptance Criteria:**
- [ ] Version file includes git SHA after build
- [ ] Build script integrated into CI

---

### P3-2: Centralize Timeout Defaults

**Files:**
- `core/typescript/config/defaults.ts`
- `core/typescript/config/timeouts.ts` (new)

**Priority:** P3 | **Effort:** Low | **Impact:** Low

**Implementation:**

Create `core/typescript/config/timeouts.ts`:
```typescript
/**
 * Centralized timeout defaults for easy auditing
 */
export const TIMEOUTS = {
  // Auth timeouts
  AUTH_NAVIGATION_MS: 30000,
  AUTH_SUBMIT_MS: 10000,
  AUTH_SUCCESS_MS: 5000,
  AUTH_MFA_PUSH_MS: 60000,
  AUTH_LOGIN_FLOW_MS: 30000,
  AUTH_IDP_REDIRECT_MS: 10000,
  AUTH_CALLBACK_MS: 5000,

  // Assertion timeouts
  TOAST_DEFAULT_MS: 5000,
  LOADING_DEFAULT_MS: 30000,
  FORM_VALIDATION_MS: 5000,

  // OIDC timeouts
  OIDC_SUCCESS_MS: 5000,

  // API timeouts
  API_REQUEST_MS: 30000,
  TOKEN_ACQUIRE_MS: 10000,
} as const;
```

Then import in defaults.ts and other files.

**Acceptance Criteria:**
- [ ] All timeout constants in one file
- [ ] Easy to audit and adjust globally

---

### P3-3: Add Logger Format Option

**File:** `core/typescript/utils/logger.ts`

**Priority:** P3 | **Effort:** Low | **Impact:** Low

**Implementation:**
```typescript
export interface LoggerConfig {
  minLevel: LogLevel;
  format: 'json' | 'pretty';  // Add this
  output: (entry: LogEntry) => void;
}

// Update global config
let globalConfig: LoggerConfig = {
  minLevel: 'info',
  format: 'json',
  output: (entry: LogEntry): void => {
    const target = entry.level === 'error' ? console.error : console.log;

    if (globalConfig.format === 'pretty') {
      const timestamp = entry.timestamp.split('T')[1].split('.')[0];
      const level = entry.level.toUpperCase().padEnd(5);
      const context = entry.context
        ? ` ${JSON.stringify(entry.context)}`
        : '';
      target(`[${timestamp}] ${level} [${entry.module}] ${entry.message}${context}`);
    } else {
      target(JSON.stringify(entry));
    }
  },
};
```

**Acceptance Criteria:**
- [ ] Logger supports 'pretty' format for local dev
- [ ] Default remains 'json' for production

---

### P3-4: Document Test File Naming Convention

**File:** `core/typescript/CONTRIBUTING.md` or `docs/testing.md`

**Priority:** P3 | **Effort:** Low | **Impact:** Low

**Content:**
```markdown
## Test File Organization

### Unit Tests
Location: `<module>/__tests__/*.test.ts`
Example: `config/__tests__/loader.test.ts`

### Integration Tests
Location: `tests/integration/*.test.ts`
Example: `tests/integration/config-to-harness.test.ts`

### Naming Convention
- Unit tests: `<subject>.test.ts`
- Integration tests: `<flow-name>.test.ts`
```

**Acceptance Criteria:**
- [ ] Convention documented
- [ ] All existing tests follow convention

---

### P3-5: Add MFA Disclaimer to Form Auth

**File:** `core/typescript/auth/providers/form.ts`

**Priority:** P3 | **Effort:** Low | **Impact:** Low

**Implementation:**
```typescript
/**
 * Form-based Authentication Provider
 *
 * Implements the AuthProvider interface for direct form login (no OIDC redirect).
 * Useful for local development environments with basic auth.
 *
 * **Note:** This provider does NOT support MFA. For applications with
 * multi-factor authentication, use the OIDCAuthProvider instead.
 *
 * @module auth/providers/form
 */
```

**Acceptance Criteria:**
- [ ] JSDoc clearly states MFA not supported
- [ ] Points users to OIDC provider for MFA

---

### P3-6: Add Form Auth Provider Tests

**File:** `core/typescript/auth/__tests__/form-provider.test.ts` (new)

**Priority:** P3 | **Effort:** Medium | **Impact:** Low

**Test cases:**
```typescript
describe('FormAuthProvider', () => {
  it('should navigate to login page');
  it('should fill username and password');
  it('should submit form');
  it('should wait for success URL');
  it('should detect login errors');
  it('should retry on transient failures');
  it('should throw ARTKAuthError on permanent failure');
  it('should handle logout');
  it('should check session validity');
});
```

**Acceptance Criteria:**
- [ ] Form provider has unit tests
- [ ] Coverage matches other providers

---

### P3-7: Add Token Auth Provider Tests

**File:** `core/typescript/auth/__tests__/token-provider.test.ts` (new)

**Priority:** P3 | **Effort:** Medium | **Impact:** Low

**Test cases:**
```typescript
describe('TokenAuthProvider', () => {
  it('should POST credentials to token endpoint');
  it('should extract token from response');
  it('should store token in localStorage');
  it('should handle missing token in response');
  it('should retry on network failures');
  it('should throw ARTKAuthError on auth failure');
  it('should clear token on logout');
  it('should check token presence for validity');
  it('should build correct auth header');
});
```

**Acceptance Criteria:**
- [ ] Token provider has unit tests
- [ ] Coverage matches other providers

---

## Implementation Checklist

### Phase 1: Critical Fixes (P0)
- [ ] P0-1: Fix sample config schema
- [ ] P0-2: Unify TestDataManager types

### Phase 2: High Priority (P1)
- [ ] P1-1: Add OIDC+TOTP integration test
- [ ] P1-2: Document custom auth providers

### Phase 3: Medium Priority (P2)
- [ ] P2-1: Add default PII selectors
- [ ] P2-2: Validate credentials at config load
- [ ] P2-3: Document cleanup order
- [ ] P2-4: User-validate quickstart.md

### Phase 4: Minor (P3) - As Time Permits
- [ ] P3-1: Git SHA in version file
- [ ] P3-2: Centralize timeouts
- [ ] P3-3: Logger pretty format
- [ ] P3-4: Document test conventions
- [ ] P3-5: Form auth MFA disclaimer
- [ ] P3-6: Form provider tests
- [ ] P3-7: Token provider tests

---

## Notes

- P0 issues should block v1.0.0 release
- P1 issues should be addressed in v1.0.x patches
- P2/P3 can be addressed in v1.1.0
- Run full test suite after each fix: `npm run test`
