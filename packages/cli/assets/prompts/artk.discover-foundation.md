---
mode: agent
description: "Discover app + Build foundation harness - analyzes routes/features/auth, generates DISCOVERY.md, creates Playwright harness with auth, fixtures, modules"
handoffs:
  - label: "MANDATORY - /artk.init-playbook: bootstrap ARTK, playbook, journey system"
    agent: artk.init-playbook
    prompt: "Bootstrap ARTK in this repo"
  - label: "MANDATORY - /artk.discover-foundation: analyze app and build harness"
    agent: artk.discover-foundation
    prompt: "Analyze app and build foundation harness"
  - label: "OPTIONAL - /artk.journey-propose: propose journeys from discovery"
    agent: artk.journey-propose
    prompt: "Propose journeys from discovery outputs"
  - label: "MANDATORY - /artk.journey-define: create journey file"
    agent: artk.journey-define
    prompt: 'id=JRN-#### title="<title>"'
  - label: "MANDATORY - /artk.journey-clarify: add machine hints"
    agent: artk.journey-clarify
    prompt: "id=JRN-####"
  - label: "RECOMMENDED - /artk.testid-audit: audit selectors and add test hooks"
    agent: artk.testid-audit
    prompt: "mode=report"
  - label: "MANDATORY - /artk.journey-implement: generate tests"
    agent: artk.journey-implement
    prompt: "id=JRN-####"
  - label: "MANDATORY - /artk.journey-validate: static validation gate"
    agent: artk.journey-validate
    prompt: "id=JRN-####"
  - label: "MANDATORY - /artk.journey-verify: run tests and verify"
    agent: artk.journey-verify
    prompt: "id=JRN-####"
---

# ARTK /discover-foundation — Discovery + Foundation Harness (Combined)

You are running **ARTK Discovery + Foundation Build** as a single combined phase.

ARTK is a standardized kit that plugs into GitHub Copilot to help teams build and continuously maintain **complete automated regression testing suites** for existing applications using Playwright.

This combined command does TWO things:
1. **DISCOVER**: Analyze the application (routes, features, auth, testability) and generate documentation
2. **FOUNDATION BUILD**: Create the Playwright harness with auth, fixtures, and foundation modules

By combining these, discovery findings directly inform foundation build decisions (auth type, selectors, data strategy).

---

# Non‑Negotiables

1. **Be honest about uncertainty.** If you can't infer something reliably, mark it `unknown` and explain why.
2. **Be deterministic.** Stable ordering and repeatable outputs.
3. **Do not require running the app.** Runtime scan is optional.
4. **No secrets.** Never ask for passwords/tokens. If auth is needed, request a test account *process*, not credentials.
5. **No destructive edits.** Only create/update docs with managed markers.
6. **Do not break existing test tooling.** If Playwright already exists, integrate carefully.
7. **No hardcoded URLs.** Base URL and env must come from the config loader.
8. **Local-first defaults.** Retries should be low locally; CI can raise them later.

---

# Inputs (optional)

Parse `key=value` arguments:

**Discovery args:**
- `mode`: `quick | standard | max` (default: `standard`)
- `artkRoot`: ARTK root folder path (default: infer from `artk.config.yml`)
- `appScope`: `auto | all | <appName>` (default: `auto`)
- `runtimeScan`: `true | false` (default: `false`)
- `baseUrl`: optional URL for runtime scan
- `maxDepth`: crawl depth (default: `2` if runtimeScan)
- `includePaths` / `excludePaths`: optional route filters
- `generateJourneyShortlist`: `true | false` (default: `true`)
- `generateJourneyStubs`: `true | false` (default: `false`)

**Foundation args:**
- `harnessRoot`: default `e2e`
- `installMode`: `auto | isolated | integrated`
- `lang`: `auto | ts | js`
- `packageManager`: `auto | npm | pnpm | yarn`
- `browsers`: comma list, default `chromium`
- `timeoutMs`: default 30000
- `expectTimeoutMs`: default 5000
- `retriesLocal`: default 0
- `retriesCI`: default 2
- `testIdAttribute`: default `data-testid`
- `authMode`: `ui | api | external` (default: `ui`)
- `authActors`: comma list, default `standard-user,admin`
- `storageStateStrategy`: `per-env | shared` (default: `per-env`)

**Common:**
- `dryRun`: `true | false` (default: `false`)

---

# ═══════════════════════════════════════════════════════════════════
# PART 1: DISCOVERY
# ═══════════════════════════════════════════════════════════════════

## Discovery Outputs

Write outputs under `<ARTK_ROOT>/docs/`:

1) `docs/DISCOVERY.md` - Route inventory, feature areas, auth entry points
2) `docs/TESTABILITY.md` - Locator readiness, data feasibility, async risks
3) `docs/DISCOVERY.md` must include an **Environment Matrix** section (see Step D0), managed by:
```
<!-- ARTK:BEGIN environment-matrix -->
...managed content...
<!-- ARTK:END environment-matrix -->
```

Optional machine outputs under `docs/discovery/`:
- `docs/discovery/routes.json`
- `docs/discovery/features.json`
- `docs/discovery/apis.json`
- `docs/discovery/risk.json`
- `docs/discovery/summary.json`

All generated sections MUST include:
```
<!-- ARTK:BEGIN <section> -->
...managed content...
<!-- ARTK:END <section> -->
```

---

## Step D0 — Locate ARTK_ROOT and Load Context

Determine `ARTK_ROOT` in this order:
1) `artkRoot=` argument
2) nearest `artk.config.yml` (search upward from CWD)
3) if still unknown, stop and instruct the user to run `/init-playbook` first

Load context from `.artk/context.json`:
- `targets[]` - detected frontend targets from /init-playbook
- `detectedTargets[]` - targets with confidence scores
- `project.name` - project identifier

If context has `interactive_fallback_needed: true`:
- Prompt user to confirm/correct detected targets before proceeding
- Update context.json with confirmed values

Also load `artk.config.yml` (if present) and enumerate configured environments.
Produce an **Environment Matrix** in `docs/DISCOVERY.md` and regenerate it on every run.
If `artk.config.yml` has no `environments`, create a single `local` row and mark unknowns.

The Environment Matrix must include, per environment:
- base URL
- auth mode classification: `required | bypassed-identityless | bypassed-mock-identity | unknown`
- role fidelity: `real | none | unknown`
- test policy (what tags/projects should run here)
- credential requirements (real secrets vs none)

Classification rules (be conservative):
- `required`: login/SSO routes present OR protected routes redirect/401 in this env.
- `bypassed-identityless`: no login flow, no user identity visible, protected routes accessible, RBAC appears off.
- `bypassed-mock-identity`: a user identity is injected locally and RBAC still enforced; roles are switchable via toggle/flag.
- `unknown`: conflicting or insufficient signals.

## Step D1 — Identify app candidates (monorepo-aware)

Detect app roots using common patterns:
- `apps/*`, `packages/*`, `services/*`, `src/*`
- presence of `package.json`, `pom.xml`, `build.gradle`, `.csproj`

For each candidate, detect whether it is **frontend-capable** (HTML routes, SPA, SSR) vs backend-only.

Choose scope:
- `appScope=all`: include all frontends
- `appScope=<name>`: focus on that app
- `auto`: if exactly 1 frontend exists, use it; otherwise ask

## Step D2 — Detect framework(s) and routing style

Use file and dependency heuristics:
- **Next.js**: `next.config.*`, `pages/`, `app/` directories
- **React Router**: `react-router` deps, `<Routes>`, `createBrowserRouter`
- **Angular**: `@angular/router`, `app.routes.ts`, `Routes` arrays
- **Vue**: `vue-router` config
- **SvelteKit**: `src/routes`
- **Nuxt**: `pages/` / `nuxt.config.*`

Also detect API patterns:
- OpenAPI/Swagger files (`openapi.*`, `swagger.*`)
- GraphQL schemas (`schema.graphql`, `.gql`)
- REST clients (`axios`, `fetch`, `ky`, `graphql-request`)

## Step D3 — Build route/page inventory (static scan)

Output should include:
- route path pattern
- source (router config file OR file-system path)
- route type (public/protected/unknown)
- dynamic segments (e.g., `:id`, `[id]`)
- feature flag/permission hints if detectable
- UI complexity hints (forms, tables, wizards, uploads)
- primary API dependencies (best-effort)

### Routing extraction rules
- **Next.js Pages Router**: routes from `pages/**` file paths
- **Next.js App Router**: routes from `app/**/page.*` and route segments
- **React Router**: parse route objects or `<Route path>` definitions
- **Angular**: parse `Routes` arrays for `path`, `children`, `canActivate`

If exact extraction is hard, fall back to:
- navigation definitions (menus/sidebars)
- `Link`/`routerLink` usage
- sitemap-like lists if they exist

## Step D4 — Group routes into feature areas

Group using heuristic layers:
1) explicit feature/module folders (`src/features/*`, `modules/*`, `domain/*`)
2) top-level route segment grouping (`/billing/*`, `/users/*`)
3) component folder clustering (shared layouts vs leaf pages)
4) naming hints (files, components, API namespaces)

Produce a feature map:
- Feature area name
- Routes included
- Cross-cutting shared components used
- Primary APIs used
- Auth/role hints

## Step D5 — Identify auth entry points + role/permission hints

Collect:
- login/logout URLs or components
- SSO/OIDC hints (`oidc`, `saml`, `msal`, `auth0`, `keycloak`)
- route guards/middleware (Angular guards, Next middleware, React auth wrappers)
- role checks and permission gates
- local bypass signals (env flags, host checks, dev-only auth modules, mock user injection)

Output:
- "Auth entry points" table
- "Role/permission hints" list
- "Local auth bypass signals" list with inferred mode (identityless vs mock-identity) if possible

Do NOT request credentials.

## Step D6 — Testability assessment

### A) Locator readiness
- accessible roles/names (labels, headings, button names)
- presence and consistency of `data-testid` / `data-test` / `data-qa` attributes
- patterns that will be brittle (CSS class selectors, deep DOM)

### B) Data feasibility
- seeded data scripts
- fixture support
- API helpers
- admin endpoints for setup/teardown
- multi-tenant constraints

### C) Async / eventual consistency risk zones
- websockets, polling, background jobs
- multi-step flows with server-side processing
- delayed UI updates, optimistic updates, caching

### D) Environment constraints
- environment access limitations
- base URLs and config files
- dependencies on external services (payments, mail, LDAP)
- local auth bypass impact on coverage (what cannot be validated in that env)

### E) Observability hooks
- correlation IDs, logging, debug panels, test-mode flags

Each finding must include:
- severity (`blocker | high | medium | low`)
- where it was observed (file path / module)
- recommended remediation

## Step D7 — Risk ranking model + scoring

Create a risk model:
- Risk = **impact** × **likelihood**
- Scoring: 1–5 scales, combined score 0–100

Signals:
- **Impact**: business critical routes (auth, billing, admin), compliance areas
- **Likelihood**: complexity, async behavior, dependency count, code churn

Produce:
- Top 10 highest-risk flows
- Risk rationale for each
- Suggested test tier: `smoke` vs `release` vs `regression`

## Step D8 — Recommend initial Journeys (shortlist)

If `generateJourneyShortlist=true`:
- Propose 5–10 **Smoke Journeys** (auth + global nav + one critical flow)
- Propose 8–20 **Release Journeys** (broader but high ROI)

For each Journey suggestion include:
- Title
- Actor
- Scope/feature area
- Tier (smoke/release)
- Routes touched
- Risk rationale
- Testability notes
- Module dependencies

If `generateJourneyStubs=true` and Journey system is installed:
- Create `journeys/` markdown files with `status: proposed`
- Update backlog/index

## Step D9 — Optional runtime scan

If `runtimeScan=true`:
- Require `baseUrl=`
- Perform shallow crawl up to `maxDepth`
- Never crawl logout/admin destructive actions
- Never submit forms
- Never follow external domains
- Gather discovered routes, page titles, stable locators
- Reconcile with static inventory

---

# ═══════════════════════════════════════════════════════════════════
# PART 2: FOUNDATION BUILD
# ═══════════════════════════════════════════════════════════════════

## Foundation Outputs

Create under `<ARTK_ROOT>`:

```
<ARTK_ROOT>/
  playwright.config.ts          # Uses @artk/core/harness
  tests/
    setup/
      auth.setup.ts             # Auth setup using @artk/core/auth
    smoke/
    release/
    regression/
  src/
    modules/
      registry.json
      foundation/
        auth/
          login.ts
          storage-state.ts
        navigation/
          nav.ts
        selectors/
          locators.ts
        data/
          run-id.ts
          builders.ts
          cleanup.ts
    fixtures/
      test.ts                   # Re-exports @artk/core/fixtures
    utils/
      logger.ts
      paths.ts
  config/
    env.schema.ts
    env.ts
    environments.example.json
```

Ensure `.gitignore` includes:
- `.auth-states/`
- `test-results/`
- `playwright-report/`

---

## Step F0 — Use Discovery findings to inform Foundation

Before building foundation, use discovery outputs:
- **Auth type detected** → Configure auth harness accordingly
- **Selector patterns found** → Set `testIdAttribute` appropriately
- **Roles identified** → Create matching auth actors
- **Async risks found** → Document in harness README

## Step F1 — Establish package/dependency plan

If **integrated** (repo has package.json):
- Update root package.json scripts:
  - `test:e2e` → run Playwright
  - `test:e2e:ui`, `test:e2e:report`

If **isolated**:
- Ensure `<ARTK_ROOT>/package.json` has:
  - `@artk/core` (from vendor)
  - `@playwright/test`
  - TypeScript

## Step F2 — Create env/config loader

Create `config/env.ts`:
- Load env name from `ARTK_ENV` (fallback "local")
- Load baseUrl from `ARTK_BASE_URL` or environments.json
- Print resolved config at runtime (safe values only)

Create `config/environments.example.json`:
```json
{
  "local": { "baseUrl": "http://localhost:3000" },
  "intg": { "baseUrl": "https://intg.example.com" },
  "ctlq": { "baseUrl": "https://ctlq.example.com" },
  "prod": { "baseUrl": "https://prod.example.com" }
}
```

## Step F3 — Build Playwright config using ARTK Core

**CRITICAL: Use `@artk/core/harness` - DO NOT create config manually**

```typescript
// playwright.config.ts
import { loadConfig } from '@artk/core/config';
import { createPlaywrightConfig } from '@artk/core/harness';

const { config, activeEnvironment } = loadConfig();

export default createPlaywrightConfig({
  config,
  activeEnvironment,
  tier: process.env.ARTK_TIER || 'regression',
});
```

The core framework handles:
- ✅ `testDir`, `timeout`, `expect.timeout`, `retries`
- ✅ Reporter configuration (html, json, line)
- ✅ `outputDir` for test results
- ✅ `use` options (trace, screenshot, video)
- ✅ `baseURL` from active environment
- ✅ `testIdAttribute` from config
- ✅ Auth setup projects for each role
- ✅ Browser projects with dependencies
- ✅ Storage state paths

**DO NOT reimplement these manually.**

## Step F4 — Auth harness using project dependencies + storageState

**ARTK Core handles auth setup projects automatically.**

For custom auth flows, use core providers:

```typescript
// tests/setup/auth.setup.ts
import { test } from '@artk/core/fixtures';
import { OIDCAuthProvider, FormAuthProvider, saveStorageState } from '@artk/core/auth';
import { loadConfig } from '@artk/core/config';

test('authenticate', async ({ page, context }, testInfo) => {
  const { config } = loadConfig();
  const role = testInfo.project.name.replace('-setup', '');

  if (config.auth.provider === 'oidc') {
    const authProvider = new OIDCAuthProvider(config.auth.oidc);
    await authProvider.authenticate(page, context, { role });
  } else if (config.auth.provider === 'form') {
    const authProvider = new FormAuthProvider(config.auth.form);
    await authProvider.authenticate(page, context, { role });
  }

  await saveStorageState(context, { role, env: config.activeEnv });
});
```

**DO NOT implement custom storage state logic.** Use core providers.

If the app supports **local auth bypass**, document how to run tests safely:
- **Identityless bypass** (no role/identity): run only unauthenticated project(s) and skip `@auth/@rbac` tests locally.
- **Mock identity bypass** (roles enforced): you may run `@rbac` locally using the role toggle; still run `@auth` in staging/CI with real IdP.
- Prefer a single runner-level switch (project selection or tag filters), not per-test conditionals.

## Step F5 — Create baseline fixtures

Tests should import from `@artk/core/fixtures`:

```typescript
// tests/example.spec.ts
import { test, expect } from '@artk/core/fixtures';

test('user can access dashboard', async ({ authenticatedPage, config, runId }) => {
  await authenticatedPage.goto('/dashboard');
  await expect(authenticatedPage.locator('h1')).toContainText(config.app.name);
});

test('admin can manage users', async ({ adminPage, testData }) => {
  await adminPage.goto('/admin/users');

  const userName = `Test User ${testData.runId}`;
  // ... create user ...

  testData.cleanup(async () => {
    // Cleanup runs automatically after test
  });
});
```

Available core fixtures:
- `config`: ARTK configuration
- `authenticatedPage`: Page with default role
- `adminPage`, `userPage`: Role-specific pages
- `apiContext`: Authenticated API request context
- `testData`: Cleanup registration with unique run ID
- `runId`: Unique identifier for test isolation

**Do NOT create custom fixture files.** Use core fixtures directly.

## Step F6 — Navigation helpers foundation module

Create `src/modules/foundation/navigation/nav.ts`:
- `gotoBase(page)`
- `gotoPath(page, path)`
- `openPrimaryNav(page)` (placeholder)
- `selectNavItem(page, label)` (placeholder)

No selectors hardcoded; add TODOs for future phases.

## Step F7 — Selector utilities foundation module

Create `src/modules/foundation/selectors/locators.ts`:
- Role-first locator wrappers
- `byTestId(page, id)` helper
- Document chosen test id attribute
- How to request new hooks

Use `testIdAttribute` detected from discovery if available.

## Step F7.5 — AutoGen Core Integration (ESLint + Selector Catalog)

**Configure ESLint with playwright plugin:**

Add to `eslint.config.js`:
```javascript
import playwright from 'eslint-plugin-playwright';

export default [
  ...playwright.configs['flat/recommended'],
  {
    rules: {
      'playwright/no-wait-for-timeout': 'error',
      'playwright/no-force-option': 'error',
      'playwright/prefer-web-first-assertions': 'warn',
      'playwright/no-raw-locators': 'warn',
      'playwright/no-get-by-title': 'warn',
    },
  },
];
```

**Generate initial selector catalog:**

Create `config/selector-catalog.json`:
```json
{
  "version": "1.0.0",
  "generatedAt": "<ISO8601>",
  "components": {},
  "pages": {},
  "testIds": []
}
```

Run testid scanner from AutoGen Core:
```bash
npx artk-autogen catalog-generate --scan-source src/
```

This creates a selector catalog that:
- Maps `data-testid` attributes to components
- Provides stable selectors for test generation
- Tracks CSS selector debt for migration planning

**ARIA snapshot helper:**

Install as devDependency and configure ARIA snapshots for baseline:
```typescript
// tests/setup/aria-baseline.ts
import { test } from '@playwright/test';
import { captureAriaSnapshot } from '@artk/core-autogen';

test('capture aria baseline', async ({ page }) => {
  await page.goto('/');
  const snapshot = await captureAriaSnapshot(page);
  // Save to .artk/aria-snapshots/baseline.json
});
```

## Step F8 — Data harness scaffolding

Create `src/modules/foundation/data/*`:
- `run-id.ts`: run-level unique ID for namespacing
- `builders.ts`: DTO/UI model builders (empty but structured)
- `cleanup.ts`: placeholder cleanup strategy

Rules:
- Never assume DB access
- Assume API helpers may exist later
- Always namespace by runId

## Step F9 — Module registry

Create `src/modules/registry.json`:
```json
{
  "foundation": [
    { "name": "auth", "path": "foundation/auth", "description": "Authentication harness" },
    { "name": "navigation", "path": "foundation/navigation", "description": "Navigation helpers" },
    { "name": "selectors", "path": "foundation/selectors", "description": "Locator utilities" },
    { "name": "data", "path": "foundation/data", "description": "Data harness" }
  ],
  "feature": [],
  "generatedAt": "<ISO8601>",
  "journeyDependencies": {}
}
```

## Step F10 — Create test folders + README

Create folders:
- `tests/smoke/`
- `tests/release/`
- `tests/regression/`

Create `README.md` with:
- How to set env (`ARTK_ENV`, `ARTK_BASE_URL`)
- How to run setup + tests
- How storageState works
- Where reports/artifacts live

---

# ═══════════════════════════════════════════════════════════════════
# PART 3: QUESTIONS + FINALIZATION
# ═══════════════════════════════════════════════════════════════════

## Mode-based Question Policy

### QUICK (≤ 5 questions)
1) Which app scope (if multiple frontends)?
2) Any top 3 business-critical flows to prioritize?
3) Auth type: login form vs SSO redirect?
4) What is the baseUrl for at least one env?
5) test id attribute convention?

### STANDARD (≤ 10 questions, default)
Quick +:
6) Test data approach: seeded env / API setup / manual only?
7) Which environments are accessible from your location?
8) Any areas to exclude from testing?
9) Main actor list (standard-user/admin ok)?
10) Browsers to run locally?

### MAX (add up to 5)
Standard +:
- Roles/actors to cover first
- Feature flag system
- Multi-tenant rules
- Known async flows
- Risk appetite for smoke tier

Provide a reply template:
```text
app: <name>
critical_flows: [login, checkout, dashboard]
auth: SSO
baseUrl: http://localhost:5173
testId: data-testid
data: create_api
envs: [local, intg]
exclude: [payments]
actors: [user, admin]
browsers: [chromium]
```

---

## Edge Cases

- **No obvious frontend**: produce short report, suggest API-focused plan
- **Monorepo with multiple frontends**: generate multi-app sections or ask scope
- **Dynamic router**: use nav/link heuristics, document limitations
- **Existing Cypress/Selenium**: mine for route hints and selectors
- **Existing Playwright**: integrate carefully, don't replace config
- **Highly restricted environments**: focus on static discovery

# ═══════════════════════════════════════════════════════════════════
# PART 4: FOUNDATION VALIDATION
# ═══════════════════════════════════════════════════════════════════

**This step validates that all foundation modules compile and work correctly.**

## Step V1 — TypeScript Compilation Check

Run TypeScript compiler to catch type errors:

```bash
cd <ARTK_ROOT>
npx tsc --noEmit
```

**Expected outcome:** No compilation errors.

**If errors found:**
- Fix each error before proceeding
- Common issues:
  - Missing type imports
  - Incorrect @artk/core import paths
  - Config type mismatches

## Step V2 — Create Foundation Validation Tests

Create `tests/foundation/foundation.validation.spec.ts`:

```typescript
/**
 * Foundation Validation Tests
 *
 * These tests verify that all foundation modules:
 * 1. Import correctly
 * 2. Compile without errors
 * 3. Basic functionality works
 *
 * Run with: npx playwright test tests/foundation/
 */
import { test, expect } from '@playwright/test';

// ═══════════════════════════════════════════════════════════════════
// Module Import Validation
// ═══════════════════════════════════════════════════════════════════

test.describe('Foundation Module Imports', () => {
  test('config loader imports and loads', async () => {
    const { loadConfig } = await import('../../config/env');
    const config = loadConfig();

    expect(config).toBeDefined();
    expect(config.baseUrl).toBeDefined();
  });

  test('navigation module imports', async () => {
    const nav = await import('../../src/modules/foundation/navigation/nav');

    expect(nav.gotoBase).toBeDefined();
    expect(nav.gotoPath).toBeDefined();
  });

  test('selector utilities import', async () => {
    const selectors = await import('../../src/modules/foundation/selectors/locators');

    expect(selectors.byTestId).toBeDefined();
  });

  test('data harness imports', async () => {
    const runId = await import('../../src/modules/foundation/data/run-id');

    expect(runId.generateRunId).toBeDefined();
  });

  test('auth module imports', async () => {
    const auth = await import('../../src/modules/foundation/auth/login');

    // Auth module should export login helper
    expect(auth).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════
// Config Validation
// ═══════════════════════════════════════════════════════════════════

test.describe('Config Validation', () => {
  test('environment config has required fields', async () => {
    const { loadConfig } = await import('../../config/env');
    const config = loadConfig();

    // Required fields
    expect(config.baseUrl).toBeTruthy();
    expect(typeof config.baseUrl).toBe('string');

    // URL should be valid
    expect(() => new URL(config.baseUrl)).not.toThrow();
  });

  test('environments.json exists and is valid', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const { dirname } = await import('path');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    const envPath = path.join(__dirname, '../../config/environments.json');
    const envExamplePath = path.join(__dirname, '../../config/environments.example.json');

    // Either environments.json or environments.example.json should exist
    const exists = fs.existsSync(envPath) || fs.existsSync(envExamplePath);
    expect(exists).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Playwright Config Validation
// ═══════════════════════════════════════════════════════════════════

test.describe('Playwright Config Validation', () => {
  test('playwright.config.ts is valid', async () => {
    // This test passes if it runs at all - config was loaded by Playwright
    expect(true).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Module Registry Validation
// ═══════════════════════════════════════════════════════════════════

test.describe('Module Registry', () => {
  test('registry.json exists and is valid', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const { dirname } = await import('path');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    const registryPath = path.join(__dirname, '../../src/modules/registry.json');
    expect(fs.existsSync(registryPath)).toBe(true);

    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
    expect(registry.foundation).toBeDefined();
    expect(Array.isArray(registry.foundation)).toBe(true);
    expect(registry.foundation.length).toBeGreaterThan(0);
  });

  test('all registered modules exist', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const { dirname } = await import('path');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    const registryPath = path.join(__dirname, '../../src/modules/registry.json');
    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));

    for (const mod of registry.foundation) {
      const modPath = path.join(__dirname, '../../src/modules', mod.path);
      expect(fs.existsSync(modPath)).toBe(true);
    }
  });
});
```

## Step V3 — Run Validation Tests

Execute the validation tests:

```bash
cd <ARTK_ROOT>
npx playwright test tests/foundation/ --reporter=list
```

**Expected outcome:** All validation tests pass.

**If tests fail:**
1. Check the error message for the specific failure
2. Fix the underlying module/config issue
3. Re-run validation
4. Do NOT proceed until all validation tests pass

## Step V4 — Verify @artk/core Integration

Test that core library integration works:

```bash
# Test core imports work (ESM dynamic import)
node --input-type=module -e "
import('./vendor/artk-core/dist/config/index.js').then(config => {
  return import('./vendor/artk-core/dist/harness/index.js');
}).then(harness => {
  console.log('✓ @artk/core imports successful');
}).catch(err => {
  console.error('✗ Import failed:', err.message);
  process.exit(1);
});
"
```

**If import fails:**
- Check that vendor/artk-core exists
- Check that dist/ folder is populated
- Re-run `/init-playbook` to re-copy core

## Step V5 — Optional: Auth Flow Smoke Test

If auth modules were created, validate the auth setup:

```bash
# Run auth setup project only
npx playwright test --project="*-setup" --reporter=list
```

**Note:** This requires valid test credentials configured in environment.

If no credentials available yet:
- Skip this step
- Document in README that auth validation is pending
- Add TODO comment in auth.setup.ts

## Step V6 — Validation Summary

After validation completes, output summary:

```
═══════════════════════════════════════════════════════════════════
FOUNDATION VALIDATION SUMMARY
═══════════════════════════════════════════════════════════════════

TypeScript Compilation:  ✓ PASS / ✗ FAIL
Module Imports:          ✓ PASS / ✗ FAIL
Config Validation:       ✓ PASS / ✗ FAIL
Registry Validation:     ✓ PASS / ✗ FAIL
Core Integration:        ✓ PASS / ✗ FAIL
Auth Flow (optional):    ✓ PASS / ⏭ SKIPPED / ✗ FAIL

Overall: READY / NEEDS FIXES

Next steps:
- If READY: Proceed to /artk.testid-audit (strongly recommended) then /journey-propose
- If NEEDS FIXES: Address errors above before continuing
═══════════════════════════════════════════════════════════════════
```

---

## Completion Checklist

### Discovery
- [ ] `docs/DISCOVERY.md` created/updated (managed markers)
- [ ] `docs/TESTABILITY.md` created/updated (managed markers)
- [ ] Optional machine outputs created (if enabled)
- [ ] Risk-ranked "Top risk flows" list present
- [ ] Smoke/Release Journey shortlist present (if enabled)
- [ ] Blockers captured with remediation actions

### Foundation
- [ ] Playwright config created (uses @artk/core/harness)
- [ ] Auth setup project defined
- [ ] storageState path policy implemented and gitignored
- [ ] env/config loader created
- [ ] Foundation modules scaffolded (auth/nav/selectors/data)
- [ ] Module registry created
- [ ] Harness README created

### Validation
- [ ] TypeScript compilation passes (`tsc --noEmit`)
- [ ] Foundation validation tests created
- [ ] All validation tests pass
- [ ] @artk/core integration verified
- [ ] Validation summary output

### Next Commands
- `/artk.testid-audit` (strongly recommended before generating tests)
- `/journey-propose` (auto-identify high-signal Journeys)
