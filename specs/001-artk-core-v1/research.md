# Research Document: ARTK Core v1 Infrastructure Library

**Date**: 2025-12-29
**Feature**: 001-artk-core-v1
**Status**: Complete (no NEEDS CLARIFICATION remaining)

## Executive Summary

This research document captures technical decisions, dependency analysis, and architectural patterns for ARTK Core v1. All clarification questions have been resolved during the specification phase; this document consolidates those decisions and provides implementation guidance.

## 1. Technology Stack Analysis

### 1.1 Runtime Environment

| Component | Version | Rationale |
|-----------|---------|-----------|
| Node.js | 18.0.0+ | LTS with native fetch, stable ESM support |
| TypeScript | 5.x | Latest features, strict mode for type safety |
| Playwright | 1.40.0+ | Browser automation, storage state API, fixtures |

### 1.2 Core Dependencies

| Dependency | Purpose | Version |
|------------|---------|---------|
| `zod` | Runtime schema validation for config | ^3.22.0 |
| `yaml` | YAML parsing for `artk.config.yml` | ^2.3.0 |
| `otplib` | TOTP code generation for MFA | ^12.0.0 |

### 1.3 Development Dependencies

| Dependency | Purpose | Version |
|------------|---------|---------|
| `vitest` | Unit testing | ^1.0.0 |
| `@playwright/test` | Integration/E2E testing | ^1.40.0 |
| `typescript` | TypeScript compiler | ^5.3.0 |
| `tsup` | Build/bundling | ^8.0.0 |

## 2. Architecture Decisions

### 2.1 Distribution Model: Vendoring vs npm

**Decision**: Vendor/copy approach (not npm)

**Rationale**:
- No npm publishing infrastructure required
- Works in air-gapped enterprise environments
- Target project has full control over core code
- Easier customization when needed
- Clear separation: `artk/.core/` (vendored, do not edit) vs `artk/src/` (project-specific)

**Trade-offs**:
- Manual update process (copy new version)
- No automatic dependency resolution
- Larger target project footprint

### 2.2 Module Architecture

**Decision**: 8 distinct modules with clear dependency graph

```
           ┌─────────┐
           │ config  │  (foundation - no dependencies)
           └────┬────┘
                │
    ┌───────────┼───────────┐
    │           │           │
    ▼           ▼           ▼
┌─────────┐ ┌─────────┐ ┌─────────┐
│ harness │ │  auth   │ │  data   │
└────┬────┘ └────┬────┘ └────┬────┘
     │           │           │
     └───────┬───┴───────────┘
             │
             ▼
       ┌──────────┐
       │ fixtures │  (composition layer)
       └────┬─────┘
            │
  ┌─────────┼─────────┐
  │         │         │
  ▼         ▼         ▼
┌─────────┐┌─────────┐┌─────────┐
│locators ││assertions││reporters│
└─────────┘└─────────┘└─────────┘
```

**Rationale**:
- Clear boundaries enable independent testing
- Modules can be imported selectively
- Dependency injection via config
- Fixtures compose other modules into test-facing API

### 2.3 Configuration Schema Validation

**Decision**: Zod for runtime schema validation

**Rationale**:
- TypeScript-first with excellent type inference
- Runtime validation (not just compile-time)
- Rich error messages with field paths
- Supports environment variable transformation

**Alternative Considered**: JSON Schema + ajv
- Rejected: Less TypeScript integration, verbose schema definitions

### 2.4 OIDC Provider Strategy

**Decision**: Plugin-based IdP handlers with generic fallback

| IdP | Status | Selector Strategy |
|-----|--------|-------------------|
| Keycloak | Primary (ITSS uses) | Native selectors: `#username`, `#password`, `#kc-login` |
| Azure AD | Supported | Microsoft DOM structure, "Stay signed in" handling |
| Okta | Supported | Okta widget variations |
| Auth0 | Supported | Auth0 Universal Login |
| Generic | Fallback | Config-driven selectors |

**Rationale**:
- Each IdP has unique quirks requiring specialized handling
- Keycloak is primary because ITSS uses it with MFA
- Generic fallback ensures any OIDC provider can work with explicit config

### 2.5 Storage State Management

**Decision**: File-based storage with age-based invalidation

**Implementation**:
```
artk/.auth-states/
├── admin.json           # Storage state for admin role
├── standardUser.json    # Storage state for standardUser role
└── ...
```

**Policies** (from clarification):
- Max age: Configurable (default 60 minutes)
- Auto-cleanup: Delete files older than 24 hours on test run start (NFR-007)
- Cleanup runs before auth setup (NFR-008)

### 2.6 Parallel Execution Strategy

**Decision**: Independent storage state per role, up to 16 workers

**Rationale** (from clarification):
- NFR-004: Support up to 16 parallel test workers
- NFR-005/006: Independent storage state files per role prevents auth conflicts
- Workers can share storage state for same role (read-only during tests)
- Auth setup project runs first (single worker), then browser projects in parallel

### 2.7 Error Handling and Retry

**Decision**: Exponential backoff with actionable errors

**Auth Retry Policy** (from clarification):
- NFR-010: Retry up to 2 times
- NFR-011: On exhaustion, fail with: failure reason, IdP response, remediation steps
- NFR-012: Log each retry at warn level with attempt number

**Config Error Policy**:
- Fail fast with field path and suggestion
- Example: `ARTKConfigError: Invalid auth provider 'oauth' at auth.provider. Did you mean: oidc, form, token, custom?`

### 2.8 Logging Strategy

**Decision**: Structured JSON logs with verbosity levels

**Rationale** (from clarification):
- NFR-001: JSON format to stdout/stderr
- NFR-002: Levels: debug, info, warn, error
- NFR-003: Context includes: module, operation, timestamp

**Example**:
```json
{
  "level": "info",
  "module": "auth",
  "operation": "saveStorageState",
  "role": "admin",
  "timestamp": "2025-12-29T10:00:00Z",
  "message": "Storage state saved successfully"
}
```

## 3. API Design Decisions

### 3.1 Fixture API

**Decision**: Extend Playwright's test fixture system

```typescript
// Usage in target project
import { test, expect } from 'artk/.core/fixtures';

test('user can see dashboard', async ({ authenticatedPage, runId }) => {
  await authenticatedPage.goto('/dashboard');
  // ...
});
```

**Available Fixtures**:
| Fixture | Type | Description |
|---------|------|-------------|
| `config` | `ARTKConfig` | Loaded configuration |
| `authenticatedPage` | `Page` | Page logged in as default role |
| `adminPage` | `Page` | Page logged in as admin |
| `apiContext` | `APIRequestContext` | API context with auth headers |
| `testData` | `TestDataManager` | Cleanup registration |
| `runId` | `string` | Unique identifier for isolation |

### 3.2 Locator API

**Decision**: Accessibility-first with configurable strategy order

```typescript
// Strategy order from config: role → label → placeholder → testid → text → css
function byRole(page: Page, role: string, options?: ByRoleOptions): Locator;
function byLabel(page: Page, text: string): Locator;
function byTestId(page: Page, testId: string): Locator;
```

**Scoped Locators**:
```typescript
const form = withinForm(page, 'login-form');
await form.field('email').fill('user@example.com');
await form.submit();
```

### 3.3 Assertion API

**Decision**: Domain-specific assertions beyond Playwright's matchers

```typescript
// Toast assertions
await expectToast(page, 'Order created', { type: 'success' });
await expectNoToast(page);

// Table assertions
await expectTableToContainRow(page, 'orders-table', { id: '123', status: 'Active' });

// Form assertions
await expectFormFieldError(page, 'email', 'Email is required');

// Loading assertions
await waitForLoadingComplete(page);
```

### 3.4 Data Namespacing

**Decision**: Run ID suffix for test isolation

```typescript
const runId = 'artk-abc123';
namespace('Test Order', runId);  // → 'Test Order [artk-abc123]'
```

**Pattern**: `[artk-{shortId}]` suffix
- Configurable prefix/suffix
- Easy cleanup via pattern matching

## 4. Scope Boundaries

### 4.1 In Scope (v1)

- Config-driven setup via single YAML file
- OIDC authentication (Keycloak, Azure AD, Okta, Auth0, generic)
- Storage state management with auto-cleanup
- Pre-built Playwright fixtures
- Accessibility-first locator utilities
- Common assertion helpers (toast, table, form, loading)
- Test data namespacing and cleanup
- Journey-aware reporting with @JRN-#### mapping
- Vendorable distribution model
- Structured JSON logging

### 4.2 Out of Scope (v1)

From clarification session:

| Exclusion | Rationale |
|-----------|-----------|
| CI/CD pipeline integration | Pipeline setup via documentation/prompts |
| Visual regression testing | Screenshot comparison is separate concern |
| API-only testing utilities | API calls allowed only as data helpers for E2E |
| Mobile/native app support | Browser-based testing only |

## 5. Risk Analysis

### 5.1 Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| IdP login page changes | High | Medium | Config-driven selectors, version-specific handlers |
| Storage state corruption | Medium | Low | Validation on load, automatic regeneration |
| MFA flow variations | Medium | Medium | TOTP primary, document push/SMS limitations |
| Parallel auth conflicts | High | Low | Role-based isolation, setup project dependency |

### 5.2 Integration Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Breaking changes in core | High | Medium | Version file, migration docs, semantic versioning |
| Prompt/core API drift | Medium | Medium | Version pinning in prompts |
| Target project conflicts | Low | Low | Isolated `artk/.core/` directory |

## 6. Testing Strategy

### 6.1 Unit Tests (per module)

- Config: Schema validation, env var resolution
- Auth: Credential loading, storage state I/O
- Fixtures: Fixture composition, type checking
- Locators: Strategy chain, scoped locators
- Assertions: Matcher logic (mocked DOM)
- Data: Namespace generation, cleanup ordering

**Target Coverage**: 80%+

### 6.2 Integration Tests

- Config → Harness: Playwright config generation
- Auth → Fixtures: Authenticated page setup
- Full auth flow with mock IdP

### 6.3 E2E Tests (ITSS)

- Real OIDC flow with Keycloak + MFA
- Multi-role authentication
- Storage state reuse

## 7. Implementation Phases

Based on dependencies and priorities:

### Phase 1: Foundation
1. Config System (schema, loader, env resolution)
2. Playwright Harness (config factory, projects)

### Phase 2: Authentication
3. Auth infrastructure (providers, storage state)
4. OIDC provider (Keycloak primary)

### Phase 3: Fixtures & Utilities
5. Fixtures (authenticated pages, data context)
6. Locators (strategy chain, scoped)
7. Assertions (toast, table, form, loading)
8. Data Harness (namespace, cleanup)

### Phase 4: Reporting & Polish
9. Reporters (ARTK reporter, journey mapping)
10. Journey system integration
11. Documentation

## 8. Open Items

None - all clarification questions resolved:
- Observability: Structured JSON logs with verbosity levels
- Scalability: Up to 16 workers, role-based storage isolation
- Maintenance: 24-hour auto-cleanup on test run start
- Scope: CI/CD, visual, API-only, mobile excluded
- Reliability: 2 retries with exponential backoff

## References

- [Feature Specification](spec.md)
- [ARTK Core v1 Detailed Specification](../../docs/ARTK_Core_v1_Specification.md)
- [ARTK Constitution](../../.specify/memory/constitution.md)
