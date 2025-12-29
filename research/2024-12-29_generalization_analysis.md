# ARTK Generalization Analysis

**Date:** 2024-12-29
**Topic:** How to generalize ARTK for maximum reusability across projects

---

## The Core Insight

Right now, ARTK is a **specification-driven kit** where Copilot regenerates everything from prompts each time. To make it truly reusable, we need to flip the model:

**Current:** Prompts → Copilot generates code → Project-specific result
**Target:** Pre-built packages + Config → Thin project-specific layer

---

## What Can Be Generalized (By Reusability Potential)

### Tier 1: 90-100% Reusable (Build Once, Use Everywhere)

| Component | Description |
|-----------|-------------|
| **Config System** | Environment loader, `artk.config.yml` schema, safe logging |
| **Playwright Harness** | Base `playwright.config.ts` with env-driven baseURL, reporters, artifacts |
| **Fixture System** | Base `test` export extending Playwright, authenticated page fixture |
| **Selector Utilities** | Locator factory (role → label → testid → css), testIdAttribute config |
| **Journey System** | Already built: schema, backlog generator, validator |
| **Reporter/Artifacts** | Screenshot masking, trace management, HTML reports |

### Tier 2: 70-85% Reusable (Patterns with Adapters)

| Component | Description |
|-----------|-------------|
| **Auth Harness** | Abstract `AuthProvider` + concrete implementations (form, SSO, token) |
| **Assertion Helpers** | Toast assertions, table/list checks, loading states, URL assertions |
| **Navigation Helpers** | Wait utilities, route interception, URL assertions |
| **Data Harness Base** | Run-ID namespacing, cleanup hooks, builder pattern scaffold |

### Tier 3: Project-Specific (Cannot Generalize)

- Feature modules (Page Objects, Flows)
- Domain-specific test data models
- Actual Journey content
- App-specific API endpoints

---

## Proposed Architecture

```
@artk/
├── cli/                    # npx @artk/cli init | generate | validate
├── config/                 # Config loader, schema, environment handling
├── harness/                # Playwright config generator, base setup
├── fixtures/               # Reusable test fixtures (auth, api, data)
├── auth/                   # Auth providers (form, sso, token, custom)
├── locators/               # Selector strategy utilities
├── assertions/             # Common assertion helpers
├── data/                   # Test data harness (builders, cleanup, namespacing)
├── reporters/              # Custom reporters, artifact management
└── journeys/               # Existing journey system (schema, generator)
```

---

## How It Would Work

### 1. Installation
```bash
npx @artk/cli init
```

Detects stack, asks minimal questions, generates:
- `artk.config.yml` (project configuration)
- `playwright.config.ts` (imports from `@artk/harness`)
- Thin wrappers that compose the packages
- `.github/prompts/` with ARTK prompts

### 2. Configuration-Driven
```yaml
# artk.config.yml
version: 1
app:
  name: my-app
  baseUrl: ${ARTK_BASE_URL:-http://localhost:3000}

auth:
  provider: form  # form | sso | token | custom
  form:
    loginUrl: /login
    usernameField: '[data-testid="username"]'
    passwordField: '[data-testid="password"]'
    submitButton: '[data-testid="login-submit"]'
    successIndicator: /dashboard

selectors:
  testIdAttribute: data-testid
  strategy: [role, label, testid, css]

artifacts:
  screenshots: on-failure
  video: off
  trace: retain-on-failure
  maskPii: true

tiers:
  smoke: { retries: 0, workers: 1 }
  release: { retries: 2, workers: 4 }
```

### 3. Usage in Tests
```typescript
import { test, expect } from '@artk/fixtures';
import { byRole, byTestId } from '@artk/locators';

test.describe('@JRN-0001 User Login', () => {
  test('user reaches dashboard after login', async ({ authenticatedPage }) => {
    // Already logged in via fixture
    await expect(authenticatedPage).toHaveURL(/dashboard/);
  });
});
```

---

## Implementation Strategy

### Phase 1: Core Infrastructure
1. `@artk/config` — Config loading, validation, environment resolution
2. `@artk/harness` — Base Playwright config generator
3. `@artk/fixtures` — Base test fixture extending Playwright

### Phase 2: Auth System
1. `@artk/auth` — Provider interface + implementations
2. Form login (most common)
3. Token injection (API-based)
4. SSO scaffolding (complex, needs per-project adaptation)

### Phase 3: Utilities
1. `@artk/locators` — Selector factory, accessibility-first
2. `@artk/assertions` — Toast, table, form, loading assertions
3. `@artk/data` — Namespacing, cleanup hooks, builder base

### Phase 4: CLI & Integration
1. `@artk/cli` — `init`, `generate`, `validate`, `scaffold`
2. Integrate existing Journey system
3. Update Copilot prompts to leverage packages

---

## Key Questions for Discussion

1. **Distribution model**:
   - npm packages (publishable, versioned)?
   - Single repo that gets copied/vendored?
   - Hybrid (core on npm, templates vendored)?

2. **Language scope**:
   - TypeScript only (simpler, faster)?
   - Also support Python/Java Playwright harnesses?

3. **Auth complexity**:
   - Start with form login only?
   - Build SSO/OAuth patterns now or later?

4. **CLI vs Copilot balance**:
   - More automated CLI (deterministic)?
   - Keep Copilot-heavy for flexibility?

5. **Monorepo tooling**:
   - pnpm workspaces?
   - Nx/Turborepo for builds?

---

## Recommendation

Start with a **single-package approach** (`@artk/core`) containing all modules, then split later if needed. This avoids premature complexity while proving the patterns.

**Immediate next steps:**
1. Create the package structure with pnpm workspaces
2. Build `config` + `harness` + `fixtures` first (the foundation)
3. Build `auth` with form login provider
4. Create `cli init` command that scaffolds a working setup
5. Test on a real project to validate
