---
name: foundation-build
description: "Phase 7: Scaffold the Playwright baseline harness + ARTK foundation modules (config/env loader, auth setup project w/ storageState + project dependencies, navigation helpers, selector utilities, data harness scaffolding, module registry)."
argument-hint: "mode=standard|quick|max artkRoot=<path> harnessRoot=e2e installMode=auto|isolated|integrated lang=auto|ts|js packageManager=auto|npm|pnpm|yarn browsers=chromium,firefox,webkit retriesLocal=0 retriesCI=2 timeoutMs=30000 expectTimeoutMs=5000 testIdAttribute=data-testid envNames=intg,ctlq baseUrl=<url> authMode=ui|api|external authActors=standard-user,admin storageStateStrategy=per-env|shared reportOpen=on-failure|never dryRun=true|false"
agent: agent
---

# ARTK /foundation-build — Foundation Harness + Playwright Baseline (Phase 7)

You are running **ARTK Phase 7**.

ARTK plugs into GitHub Copilot to help teams build and maintain complete automated regression suites for existing applications. Phase 7 creates the **global prerequisites** once so everything built later (feature modules + tests) stays consistent and boringly reliable.

## Research-backed defaults (don’t fight these without a reason)
- Use Playwright’s **project dependencies** for global setup (auth), because it integrates into reports/traces/fixtures.  
- Reuse auth with **storageState**, and **do not commit** auth state to the repo (it can contain sensitive cookies/headers).  
- Configure test output dirs so **HTML report output** is **not the same folder** as intermediate test results (avoid ownership conflicts).  
- Prefer resilient locators (role/name/test id) over brittle CSS/XPath.

(These are in official Playwright guidance. In case someone argues, you can cite them.)

---

# Non‑Negotiables
- **Do not break existing test tooling.** If Playwright already exists, integrate carefully.
- **Do not overwrite human code** unless explicitly asked. Use managed markers for generated sections.
- **No secrets.** Never ask for passwords/tokens. Store auth state in ignored files.
- **No hardcoded URLs.** Base URL and env must come from the config loader.
- **Deterministic structure.** Stable folder layout, stable file naming.
- **Local-first defaults.** Retries should be low locally; CI can raise them later.

---

# Inputs (optional)
Parse `key=value` args after `/foundation-build`.

Key args (all optional):
- `mode`: quick | standard | max (default: standard)
- `artkRoot`: ARTK root (default: infer from artk.config.yml)
- `harnessRoot`: default `e2e`
- `installMode`: auto | isolated | integrated
  - auto: if repo has package.json -> integrated, else isolated under harnessRoot
- `lang`: auto | ts | js
- `packageManager`: auto | npm | pnpm | yarn
- `browsers`: comma list, default `chromium,firefox,webkit`
- `timeoutMs`: default 30000
- `expectTimeoutMs`: default 5000
- `retriesLocal`: default 0
- `retriesCI`: default 2 (CI wiring later, but config should be ready)
- `testIdAttribute`: default data-testid (or app’s convention)
- `envNames`: comma list, default `intg,ctlq`
- `baseUrl`: optional (if provided, write as an example in env config)
- `authMode`: ui | api | external (default: ui)
- `authActors`: comma list, default `standard-user,admin`
- `storageStateStrategy`: per-env | shared (default: per-env)
- `reportOpen`: on-failure | never (default: on-failure)
- `dryRun`: true|false (default false)

---

# What this command must produce

## A) Baseline Playwright harness
A consistent harness under `<ARTK_ROOT>/<harnessRoot>/` containing:
- Playwright config
- Setup project for auth (project dependencies)
- Test directory structure (tiers + setup)
- Reporter + artifact directories
- Config/env loader (no hardcoded URLs)
- Foundation modules (auth/navigation/selectors/data)
- README for running locally

## B) ARTK Foundation modules
Foundation modules are reusable primitives used by all feature modules and tests:
- auth harness (login helper + storage state file policy)
- navigation helpers
- selectors utilities (role-first + testid support)
- data harness scaffolding (builders + run-id namespacing + placeholders)
- module registry (foundation list present; feature list empty)

---

# Output directory structure (default)

Create this structure unless it already exists:

```
<ARTK_ROOT>/
  <harnessRoot>/
    playwright.config.(ts|js)
    README.md
    config/
      env.schema.ts
      env.ts
      environments.example.json
    playwright/
      .auth/            # ignored
    tests/
      setup/
        auth.setup.(ts|js)
      smoke/
      release/
      regression/
    fixtures/
      test.ts           # base test w/ shared fixtures
    modules/
      registry.json
      foundation/
        auth/
          login.(ts|js)
          storage-state.(ts|js)
        navigation/
          nav.(ts|js)
        selectors/
          locators.(ts|js)
        data/
          run-id.(ts|js)
          builders.(ts|js)
          cleanup.(ts|js)
    utils/
      logger.(ts|js)
      paths.(ts|js)
```

Also ensure `.gitignore` includes:
- `<harnessRoot>/playwright/.auth/`
- `<harnessRoot>/test-results/`
- `<harnessRoot>/playwright-report/`

---

# Procedure / Algorithm (do this in order)

## Step 0 — Locate ARTK_ROOT + detect environment
1) Find ARTK_ROOT:
   - `artkRoot=` argument, else nearest `artk.config.yml` upward.
2) Detect if Playwright already exists:
   - playwright config present?
   - `@playwright/test` dependency present?
   - existing e2e folder?
3) Detect repo type:
   - monorepo vs single app (best effort)
4) Choose `installMode`:
   - integrated if package.json exists at ARTK_ROOT and installMode=auto
   - otherwise isolated under `<harnessRoot>/package.json`

If the repo already has Playwright:
- do not replace config. Instead, create ARTK harness alongside or integrate with clear, minimal diffs.

## Step 1 — Establish package/dependency plan (no installs, just repo edits)
If **integrated**:
- update root package.json scripts (add, don’t replace):
  - `test:e2e` -> run Playwright with the ARTK config path
  - `test:e2e:ui`, `test:e2e:report`
If **isolated**:
- create `<harnessRoot>/package.json` with devDependencies:
  - `@playwright/test`
  - `dotenv` (optional but recommended for env files)
- add scripts for running Playwright from that subproject.

Do not run installation. Just prepare the repo.

## Step 2 — Create the env/config loader (no hardcoded URLs)
Create:
- `config/environments.example.json` with shape:
  - envName -> baseUrl + optional region/zone placeholders
- `config/env.ts` which loads:
  - env name from `ARTK_ENV` (or `PLAYWRIGHT_ENV`, fallback “local”)
  - baseUrl from `ARTK_BASE_URL` override OR environments.json mapping
  - optional zone/region placeholders for later phases

Rules:
- If baseUrl is missing, fail with a clear error message showing how to set it.
- Print resolved config at runtime (safe values only).

## Step 3 — Build Playwright config baseline

**CRITICAL: Use ARTK Core Framework**

Import and use `createPlaywrightConfig` from `@artk/core/harness`:

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

The core framework's `createPlaywrightConfig` automatically handles:
- `testDir` pointing to `tests/`
- `timeout`, `expect.timeout`, `retries` from tier configuration
- Reporter configuration (html, json, line) from `config.reporters`
- `outputDir` separation from HTML report
- `use` options from `config.artifacts` (trace, screenshot, video modes)
- `baseURL` from active environment
- `testIdAttribute` from `config.selectors.testIdAttribute`
- Auth setup projects and browser projects with proper dependencies
- Storage state paths from `config.auth.storageState`

**Do NOT manually create Playwright config from scratch.** Always use the core framework factory.

If custom overrides are needed, merge them:
```typescript
import { createPlaywrightConfig } from '@artk/core/harness';
import type { PlaywrightTestConfig } from '@playwright/test';

const baseConfig = createPlaywrightConfig({ config, activeEnvironment, tier: 'regression' });

export default {
  ...baseConfig,
  // Custom overrides only if absolutely necessary
  workers: process.env.CI ? 4 : 1,
} satisfies PlaywrightTestConfig;
```

## Step 4 — Auth harness using project dependencies + storageState

**CRITICAL: ARTK Core handles auth setup projects automatically**

The `createPlaywrightConfig` from `@artk/core/harness` automatically creates:
- Auth setup projects for each role in `config.auth.roles`
- Browser projects with proper dependencies on setup projects
- Storage state paths following convention: `<ARTK_ROOT>/.auth-states/<env>/<role>.json`

**Do NOT manually create setup projects.** The core framework does this based on config.

If you need custom auth logic, create an auth setup file that uses core auth providers:

```typescript
// tests/setup/auth.setup.ts
import { test } from '@artk/core/fixtures';
import { performOIDCLogin, performFormLogin } from '@artk/core/auth';

// Core framework automatically calls this for each role
test('authenticate', async ({ page, context, config }, testInfo) => {
  const role = testInfo.project.name.replace('-setup', '');

  if (config.auth.provider === 'oidc') {
    await performOIDCLogin(page, context, { role, config });
  } else if (config.auth.provider === 'form') {
    await performFormLogin(page, context, { role, config });
  }

  // Storage state automatically saved by core framework
});
```

Storage state is managed by core:
- Path: resolved via `getStorageStatePath(role, env)` from `@artk/core/config`
- Validation: core framework checks validity before reuse
- `.gitignore` entry: added automatically during init

## Step 5 — Create baseline fixtures

**CRITICAL: Import fixtures from ARTK Core**

Tests should import from `@artk/core/fixtures`, NOT create custom fixtures:

```typescript
// tests/example.spec.ts
import { test, expect } from '@artk/core/fixtures';

test('user can access dashboard', async ({ authenticatedPage, config, runId }) => {
  // authenticatedPage: Pre-authenticated with default role
  // config: Full ARTK configuration
  // runId: Unique test run identifier

  await authenticatedPage.goto('/dashboard');
  await expect(authenticatedPage.locator('h1')).toContainText(config.app.name);
});

test('admin can manage users', async ({ adminPage, testData }) => {
  // adminPage: Pre-authenticated with admin role
  // testData: Cleanup manager for test isolation

  await adminPage.goto('/admin/users');

  const userName = `Test User ${testData.runId}`;
  // ... create user ...

  testData.cleanup(async () => {
    // Cleanup runs automatically after test
  });
});
```

Available core fixtures (no custom setup needed):
- `config`: ARTK configuration
- `authenticatedPage`: Page with default role
- `adminPage`, `userPage`: Role-specific pages (auto-generated from config.auth.roles)
- `apiContext`: Authenticated API request context
- `testData`: Cleanup registration with unique run ID
- `runId`: Unique identifier for test isolation

**Do NOT create custom fixture files.** Use core fixtures directly.

## Step 6 — Navigation helpers foundation module
Create `modules/foundation/navigation/nav.*`:
- Provide minimal primitives:
  - `gotoBase(page)`
  - `gotoPath(page, path)`
  - `openPrimaryNav(page)` (placeholder)
  - `selectNavItem(page, label)` (placeholder)
No selectors should be hardcoded yet; add TODOs and “expected contracts” for future phases.

## Step 7 — Selector utilities foundation module
Create `modules/foundation/selectors/locators.*`:
- Provide wrappers for:
  - role-first locator usage
  - `byTestId(page, id)` helper
  - conventions docstring: prefer role/label/name; use testid only when necessary
- Also document the chosen test id attribute and how to request new hooks.

## Step 8 — Data harness scaffolding
Create `modules/foundation/data/*`:
- `run-id.*`: run-level unique ID (timestamp + random) for namespacing resources
- `builders.*`: DTO/UI model builders (empty but structured)
- `cleanup.*`: placeholder cleanup strategy (UI/API based, TODO)

Rules:
- never assume DB access
- assume API helpers may exist later
- always namespace created objects by runId when possible

## Step 9 — Module registry (foundation present, feature empty)
Create `modules/registry.json`:
- `foundation`: list of created foundation modules with descriptions
- `feature`: empty list
- `generatedAt`
- reserved fields for future dependency mapping from journeys:
  - `journeyDependencies: {}`

## Step 10 — Create baseline test folders + placeholder README
Create folders:
- `tests/smoke`, `tests/release`, `tests/regression`
Create `README.md` under harnessRoot with:
- how to set env (`ARTK_ENV`, `ARTK_BASE_URL`)
- how to run setup + tests
- how storageState works and why it’s ignored
- where reports/artifacts live

---

# Mode-based question policy (don’t annoy the user)

## QUICK (≤ 3 questions, only if necessary)
1) Which env names should exist (defaults ok)?
2) What is the baseUrl for at least one env?
3) Auth mode (ui/api/external)?

## STANDARD (≤ 7, default)
Quick +:
4) test id attribute convention (data-testid/data-test-id/data-qa)?
5) main actor list (standard-user/admin ok)?
6) browsers to run locally?
7) where to install harness (integrated vs isolated) if detection is ambiguous

## MAX
Ask only if there are multiple apps or existing Playwright configs that could conflict.

---

# Completion checklist (print at end)
- [ ] Playwright config created/updated (no hardcoded URLs)
- [ ] setup project + browser projects defined with dependencies
- [ ] storageState path policy implemented and ignored by git
- [ ] env/config loader created
- [ ] foundation modules scaffolded (auth/nav/selectors/data)
- [ ] module registry created
- [ ] harness README created with run instructions
