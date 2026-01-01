# Data Model: ARTK Pilot Launch

**Date**: 2026-01-01
**Spec**: [spec.md](./spec.md)
**Research**: [research.md](./research.md)

---

## Overview

This document defines the data structures for the ARTK Pilot Launch on ITSS. Most types are already defined in @artk/core (001 spec); this document focuses on pilot-specific extensions and ITSS configuration.

---

## 1. Configuration Schema

### artk.config.yml (ITSS-specific)

```yaml
# Schema version: 2.0 (per @artk/core)
schema: "2.0"

# Project metadata
project:
  name: "ITSS"
  description: "IT Service Shop E2E Tests"

# Single target for ITSS pilot
targets:
  - name: "iss-frontend"
    path: "iss-frontend"
    type: "react-spa"
    environments:
      local:
        baseUrl: "http://localhost:5173"
      dev:
        baseUrl: "https://iss-dev.example.com"
      staging:
        baseUrl: "https://iss-staging.example.com"

# Auth configuration
auth:
  type: "oidc"
  provider: "keycloak"
  keycloak:
    realm: "REQ"
    clientId: "iss-frontend"
    authServerUrl: "http://localhost:8080"  # or env-specific
  roles:
    - id: "admin"
      username: "${ARTK_ADMIN_USER}"
      password: "${ARTK_ADMIN_PASS}"
      keycloakRole: "00007A3H"
    - id: "hr_manager"
      username: "${ARTK_HR_USER}"
      password: "${ARTK_HR_PASS}"
      keycloakRole: "00007A3I"
    - id: "product_manager"
      username: "${ARTK_PM_USER}"
      password: "${ARTK_PM_PASS}"
      keycloakRole: "00007A3J"

# Test settings
test:
  tier: "release"  # Default tier
  stabilityPasses: 3  # Per CLR-002
  authRetryOnce: true  # Per CLR-001
```

### Type Definition (from @artk/core)

```typescript
// Already defined in core/typescript/types/config.ts
interface ARTKConfig {
  schema: "2.0";
  project: {
    name: string;
    description?: string;
  };
  targets: ARTKConfigTarget[];
  auth: ARTKAuthConfig;
  test?: ARTKTestConfig;
}

// Extension for ITSS pilot
interface ARTKTestConfig {
  tier?: "smoke" | "release" | "regression";
  stabilityPasses?: number;  // Default: 3 (per CLR-002)
  authRetryOnce?: boolean;   // Default: true (per CLR-001)
}
```

---

## 2. Context Persistence

### .artk/context.json

State persisted between ARTK commands. Extends existing @artk/core context.

```typescript
interface ARTKContext {
  // From @artk/core
  version: string;
  createdAt: string;
  lastModifiedAt: string;

  // Pilot-specific extensions
  pilot: {
    project: "itss";
    phase: "discovery" | "propose" | "define" | "implement" | "validate" | "verify";
    lastCommand: string;
    lastCommandAt: string;
  };

  // Detected targets (from /init)
  detectedTargets: Array<{
    name: string;
    path: string;
    type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
    confidence: "high" | "medium" | "low";
    signals: string[];  // e.g., ["package-dependency:react", "entry-file:src/App.tsx"]
  }>;

  // Discovery results (from /discover)
  discovery?: {
    routes: Array<{
      path: string;
      name: string;
      authRequired: boolean;
      roles?: string[];
    }>;
    components: Array<{
      name: string;
      path: string;
      type: "page" | "layout" | "form" | "table" | "modal";
    }>;
  };

  // Journey tracking
  journeys?: {
    proposed: number;
    defined: number;
    implemented: number;
    verified: number;
  };
}
```

---

## 3. Journey Schema (ITSS Extension)

### Frontmatter Extension

```yaml
# Existing schema from core/artk-core-journeys
id: JRN-ITSS-001
title: "Login as Admin"
status: "implemented"
tier: "smoke"
actor: "admin"
scope: "auth"

# ITSS-specific fields
target: "iss-frontend"  # Multi-target support (US5 from 002)
keycloakRole: "00007A3H"  # Direct role reference

# Test linkage
tests:
  - path: "tests/auth/login-admin.spec.ts"
    lastRun: "2026-01-01T12:00:00Z"
    status: "passing"
    stabilityScore: 3  # Consecutive passes
```

### State Transitions

```
proposed → defined → clarified → implemented → verified
                                      ↓
                                 quarantined (on flaky)
                                      ↓
                                  deprecated (on obsolete)
```

---

## 4. Auth Storage State

### .auth-states/{role}.json

Playwright storage state for session reuse.

```typescript
interface StorageState {
  cookies: Cookie[];
  origins: Array<{
    origin: string;
    localStorage: Array<{
      name: string;
      value: string;
    }>;
  }>;
}

// ITSS-specific: Keycloak tokens in localStorage
interface KeycloakTokenStorage {
  "kc-access": string;   // Access token (JWT)
  "kc-refresh": string;  // Refresh token
  "kc-expiry": string;   // Expiry timestamp
}
```

### Lifecycle

```
1. /init → creates .auth-states/ directory (gitignored)
2. First test run → authenticates, saves state
3. Subsequent runs → reuses state if valid
4. Token expiry → re-authenticates, updates state
5. Auth failure → retry once (CLR-001), then fail
```

---

## 5. Discovery Output

### docs/discovery/itss.md

Generated by `/discover` command.

```markdown
# ITSS Discovery Report

## Routes

| Route | Auth | Roles | Testability |
|-------|------|-------|-------------|
| /dashboard | Yes | all | High |
| /requests | Yes | all | High |
| /admin | Yes | admin | Medium |

## Components

| Component | Type | Selectors |
|-----------|------|-----------|
| RequestTable | table | data-testid="request-table" |
| CreateRequestForm | form | data-testid="create-request-form" |

## Auth Patterns

- Type: OIDC with Keycloak
- Provider: react-oauth2-code-pkce
- Session: localStorage tokens

## Testability Assessment

- Overall: **High**
- Issues: None detected
- Recommendations: Add data-testid to modal actions
```

---

## 6. Error Types

### Auth Errors (per CLR-001)

```typescript
interface AuthError {
  code: "AUTH_EXPIRED" | "AUTH_INVALID" | "AUTH_CONNECTION" | "AUTH_UNKNOWN";
  message: string;
  retryable: boolean;
  remediation: string;
}

// Examples
const AUTH_ERRORS = {
  AUTH_EXPIRED: {
    message: "Access token has expired",
    retryable: true,
    remediation: "Storage state will be refreshed automatically"
  },
  AUTH_INVALID: {
    message: "Invalid credentials",
    retryable: false,
    remediation: "Check test account credentials in artk.config.yml"
  },
  AUTH_CONNECTION: {
    message: "Cannot connect to Keycloak",
    retryable: true,
    remediation: "Ensure Keycloak is running at configured URL"
  }
};
```

---

## 7. Test Result Schema

### Journey Test Results

```typescript
interface JourneyTestResult {
  journeyId: string;
  testPath: string;
  status: "passed" | "failed" | "skipped" | "flaky";

  // Timing
  startedAt: string;
  completedAt: string;
  durationMs: number;

  // Stability tracking (CLR-002)
  stability: {
    passes: number;     // Consecutive passes
    required: number;   // From config (default: 3)
    verified: boolean;  // passes >= required
    lastResults: Array<"pass" | "fail">;  // Last N results
  };

  // Error details (if failed)
  error?: {
    message: string;
    stack?: string;
    screenshot?: string;
    trace?: string;
  };
}
```

---

## 8. CI/CD Configuration

### GitHub Actions Workflow

```yaml
# .github/workflows/artk-e2e.yml
name: ARTK E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  ARTK_ENV: staging
  ARTK_ADMIN_USER: ${{ secrets.ARTK_ADMIN_USER }}
  ARTK_ADMIN_PASS: ${{ secrets.ARTK_ADMIN_PASS }}

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Install dependencies
        run: npm ci
        working-directory: artk-e2e
      - name: Run E2E tests
        run: npx playwright test --project=chromium
        working-directory: artk-e2e
      - name: Upload report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: artk-e2e/playwright-report/
```

---

## Validation Rules

| Field | Rule | Error |
|-------|------|-------|
| `schema` | Must be "2.0" | Invalid schema version |
| `targets[].name` | Unique, kebab-case | Duplicate or invalid target name |
| `auth.roles[].id` | Unique identifier | Duplicate role ID |
| `test.stabilityPasses` | Integer 1-10 | Invalid stability pass count |
| `journey.tier` | smoke\|release\|regression | Invalid tier |

---

*Data model complete. Proceed to contracts/ for API schemas.*
