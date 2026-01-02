---
mode: agent
description: "Discover app + Build foundation harness - analyzes routes/features/auth, generates DISCOVERY.md, creates Playwright harness with auth, fixtures, modules"
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

Output:
- "Auth entry points" table
- "Role/permission hints" list

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

### Next Commands
- `/journey-system` (install Journey schema + templates)
- `/journey-propose` (auto-identify high-signal Journeys)
