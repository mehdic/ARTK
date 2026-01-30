---
name: artk.discover-foundation
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
9. **Edit safety.** MUST read and follow `.github/prompts/common/GENERAL_RULES.md` before any file edits.
10. **Final output is mandatory.** Before ending, MUST READ and display the "Next Commands" file from `.github/prompts/next-commands/`. Do not generate your own version.

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

**Follow Output File Standards from `.github/prompts/common/GENERAL_RULES.md`.**

### Human-readable documentation (`docs/`):
1) `docs/DISCOVERY.md` - Route inventory, feature areas, auth entry points
2) `docs/TESTABILITY.md` - Locator readiness, data feasibility, async risks

`docs/DISCOVERY.md` must include an **Environment Matrix** section (see Step D0), managed by:
```
<!-- ARTK:BEGIN environment-matrix -->
...managed content...
<!-- ARTK:END environment-matrix -->
```

### Machine-readable reports (`reports/discovery/`):
Create `reports/discovery/` directory and generate:
- `reports/discovery/routes.json`
- `reports/discovery/features.json`
- `reports/discovery/apis.json`
- `reports/discovery/risk.json`
- `reports/discovery/summary.json`

All generated sections MUST include:
```
<!-- ARTK:BEGIN <section> -->
...managed content...
<!-- ARTK:END <section> -->
```

---

## Step D0 — Check Application Running Status

**Before proceeding with auth detection, check if the application is running.**

Ask the user:
```
Is your application currently running locally?
(Required for auth flow detection; can be skipped for static-only discovery)

1. Yes - app is running at [baseUrl from config or ask user]
2. No - skip auth detection (I'll run it later)
3. Skip auth detection entirely
```

**If user selects "No" or "Skip":**
- Set `skipAuthDetection=true` internally
- Proceed with static discovery only
- Auth setup tests will be created but marked with TODO for credentials
- Document in output: "Auth detection skipped - run with app running for full detection"

**If user selects "Yes":**
- Proceed with full discovery including runtime auth detection
- Validate baseUrl is accessible before starting

---

## Step D1 — Locate ARTK_ROOT and Load Context

Determine `ARTK_ROOT` in this order:
1) `artkRoot=` argument
2) nearest `artk.config.yml` (search upward from CWD)
3) if still unknown, stop and instruct the user to run `/artk.init-playbook` first

Load context from `.artk/context.json`:
- `targets[]` - detected frontend targets from /artk.init-playbook
- `detectedTargets[]` - targets with confidence scores
- `project.name` - project identifier
- `uiLibraries[]` - detected UI component libraries (AG Grid, etc.)
- `uiLibraries[].name` - library name (e.g., "ag-grid")
- `uiLibraries[].packages` - detected package names
- `uiLibraries[].hasEnterprise` - whether enterprise features are available
- `uiLibraries[].artkModule` - recommended ARTK module (e.g., "@artk/core/grid")

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

## Step D2 — Identify app candidates (monorepo-aware)

Detect app roots using common patterns:
- `apps/*`, `packages/*`, `services/*`, `src/*`
- presence of `package.json`, `pom.xml`, `build.gradle`, `.csproj`

For each candidate, detect whether it is **frontend-capable** (HTML routes, SPA, SSR) vs backend-only.

Choose scope:
- `appScope=all`: include all frontends
- `appScope=<name>`: focus on that app
- `auto`: if exactly 1 frontend exists, use it; otherwise ask

## Step D3 — Detect framework(s) and routing style

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

## Step D3.5 — Detect UI component libraries

Detect UI component libraries that require specialized testing helpers:

**AG Grid** (data grid):
- Dependencies: `ag-grid-community`, `ag-grid-enterprise`, `ag-grid-react`, `ag-grid-vue`, `ag-grid-vue3`, `ag-grid-angular`, `@ag-grid-community/core`, `@ag-grid-enterprise/core`
- If detected: Flag for `@artk/core/grid` usage in test implementation
- Enterprise features: If `ag-grid-enterprise` or `@ag-grid-enterprise/core` detected, note that grouping/tree/master-detail helpers are available

**Other data grids** (future):
- DevExtreme, Handsontable, TanStack Table, etc.

Output:
- List of detected UI libraries with versions
- Recommended ARTK modules for testing
- Special testing considerations (virtualization, enterprise features)

## Step D4 — Build route/page inventory (static scan)

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

## Step D5 — Group routes into feature areas

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

## Step D6 — Identify auth entry points + role/permission hints

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

## Step D7 — Testability assessment

### A) Locator readiness
- accessible roles/names (labels, headings, button names)
- presence and consistency of `data-testid` / `data-test` / `data-qa` attributes
- patterns that will be brittle (CSS class selectors, deep DOM)
- **AG Grid/Data grids**: Note virtualization (only visible rows in DOM), recommend `@artk/core/grid` for ARIA-based targeting (`aria-rowindex`, `col-id`)

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

## Step D7.5 — Test Data Setup Discovery

**Goal:** Discover HOW to create and clean up test data for each entity type, enabling journey-clarify to auto-fill data strategy without asking users.

### A) API Discovery Sources (in priority order)

**1. OpenAPI/Swagger files (highest priority)**
```
Look for:
- openapi.json, openapi.yaml, openapi.yml
- swagger.json, swagger.yaml, swagger.yml
- **/api-docs/**, **/docs/api/**
- package.json scripts containing "swagger" or "openapi"
```
Extract:
- paths with POST/PUT/DELETE methods
- requestBody schemas (required/optional fields)
- response schemas (id field location)
- Entity names from path segments (e.g., `/api/requests` → Request)

**2. Backend Controllers (if no OpenAPI)**

*Java/Spring:*
```
Pattern: src/**/controller/**/*.java, src/**/api/**/*.java, src/**/rest/**/*.java
Look for: @RestController, @PostMapping, @PutMapping, @DeleteMapping, @RequestMapping
Extract: path from annotation, HTTP method, @RequestBody DTO class
```

*Node.js/Express:*
```
Pattern: src/**/routes/**/*.ts, src/**/api/**/*.ts, **/router.ts
Look for: router.post(), router.put(), router.delete(), app.post()
Extract: path string, handler function, request validation schemas
```

*NestJS:*
```
Pattern: src/**/*.controller.ts
Look for: @Controller(), @Post(), @Put(), @Delete()
Extract: path decorators, DTO classes from @Body()
```

**3. GraphQL Schemas**
```
Pattern: schema.graphql, *.gql, **/graphql/**
Look for: type Mutation { createEntity, updateEntity, deleteEntity }
Extract: mutation names, input types, return types
```

### B) UI Form Discovery (for UI-first data entry)

**1. Create/Edit Routes**
```
Find routes matching patterns:
- /[entity]/new, /[entity]/create
- /[entity]/:id/edit, /[entity]/edit/:id
- /new-[entity], /create-[entity]
Map to entities: /requests/new → Request entity
```

**2. Form Components**
```
Look for form patterns:
- <form> elements with action/onSubmit
- formik, react-hook-form, vee-validate usage
- Form field definitions (yup, zod schemas)
Extract: field names, types, validation rules, selectors
```

**3. Form Field Mapping**
For each form, extract:
- Route path
- Field selectors (prefer data-testid > aria-label > name > id)
- Required vs optional fields
- Field types (text, select, date, file, etc.)
- Submit button selector
- Success indicator (redirect URL, toast, etc.)

### C) Test Factory/Helper Discovery

```
Search patterns:
- **/test/**/*factory*, **/test/**/*builder*
- **/fixtures/**, **/testdata/**
- **/helpers/**/*create*, **/utils/**/*test*

Extract:
- File path
- Export names containing "create", "build", "make" + entity name
- Function signatures (parameters, return type)
- Cleanup methods if paired (createX/deleteX)
```

### D) Mock Server Discovery

```
Detect mock server frameworks:
- MSW: msw.config.*, **/mocks/handlers.*
- WireMock: **/wiremock/**, mappings/*.json
- JSON Server: db.json, json-server.json
- Mirage: mirage/*, **/mirage/**

Extract:
- Mock handler definitions
- Response fixtures (usable as creation templates)
- Endpoint patterns
```

### E) Seed/Fixture Script Discovery

```
Search patterns:
- **/seeds/**, **/seed.*, **/db/seed*
- **/fixtures/**/*.json, **/testdata/**/*.json
- package.json scripts: "seed", "db:seed"

Note: Flag these as requiring DB access (may not be suitable for E2E)
```

### F) Entity Dependency Analysis

For each discovered entity:
1. Identify foreign key relationships (e.g., Request.categoryId → Category)
2. Build dependency graph (parent must exist before child)
3. Determine creation order for test setup

### G) Output: `reports/discovery/apis.json`

Generate structured output following `apis.schema.json`:

```json
{
  "version": 1,
  "discoveredAt": "2026-01-22T10:00:00Z",
  "sources": [
    { "type": "openapi", "path": "api/openapi.yaml", "coverage": "full", "entitiesFound": 5 },
    { "type": "ui-forms", "path": "src/pages/**/new.tsx", "coverage": "partial", "entitiesFound": 3 }
  ],
  "entities": [
    {
      "name": "Request",
      "pluralName": "requests",
      "source": "openapi",
      "dependencies": [
        { "entity": "Category", "relationship": "belongsTo", "foreignKey": "categoryId" }
      ],
      "operations": {
        "create": {
          "available": true,
          "method": "POST",
          "path": "/api/requests",
          "requiredFields": ["title", "categoryId", "description"],
          "examplePayload": {
            "title": "Test Request {{timestamp}}",
            "categoryId": "{{Category.id}}",
            "description": "Auto-generated test data"
          }
        },
        "delete": {
          "available": true,
          "method": "DELETE",
          "path": "/api/requests/{id}"
        }
      },
      "uiForms": [
        {
          "route": "/requests/new",
          "action": "create",
          "fields": [
            { "name": "title", "type": "text", "required": true, "selector": "[data-testid='title-input']" },
            { "name": "category", "type": "select", "required": true, "selector": "[data-testid='category-select']" }
          ],
          "submitSelector": "[data-testid='submit-btn']",
          "successIndicator": { "type": "redirect", "value": "/requests/*" }
        }
      ],
      "testDataStrategy": {
        "recommended": "api",
        "fallback": "ui",
        "cleanupMethod": "api-delete"
      }
    }
  ],
  "testFactories": [
    {
      "file": "tests/helpers/request-factory.ts",
      "entity": "Request",
      "method": "createRequest",
      "async": true,
      "cleanup": "deleteRequest"
    }
  ],
  "authContext": {
    "required": true,
    "method": "bearer-token",
    "storageStateCompatible": true
  },
  "limitations": [
    {
      "type": "no-delete",
      "entity": "AuditLog",
      "reason": "Audit logs are immutable",
      "workaround": "Use test-specific prefix for filtering"
    }
  ]
}
```

### H) Fallback Behavior

If discovery finds nothing:
1. Log warning: "No API/form patterns discovered for test data setup"
2. Create minimal `apis.json` with `sources: []` and `entities: []`
3. Journey-clarify will fall back to asking focused questions

### I) Integration with TESTABILITY.md

Add to `docs/TESTABILITY.md` a new section:

```markdown
## Test Data Setup Patterns

### Discovered API Endpoints
| Entity | Create | Delete | Notes |
|--------|--------|--------|-------|
| Request | POST /api/requests | DELETE /api/requests/{id} | Requires auth |
| Category | - | - | Read-only, use existing |

### UI Form Alternatives
| Entity | Form Route | Fields | Submit |
|--------|-----------|--------|--------|
| Request | /requests/new | title, category, description | [data-testid='submit'] |

### Recommended Strategy
- **Primary:** API-first for speed and reliability
- **Fallback:** UI forms for entities without API
- **Cleanup:** API delete after each test

### Entity Creation Order
1. Category (if needed - may already exist)
2. User (if needed - may use existing test user)
3. Request (depends on Category)
```

## Step D8 — Risk ranking model + scoring

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

## Step D9 — Recommend initial Journeys (shortlist)

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

## Step D10 — Optional runtime scan

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

**IMPORTANT:** Before generating any code, review the Code Quality Rules in `.github/prompts/common/GENERAL_RULES.md`.

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

**IMPORTANT: Always include a proper file header comment block at the top of generated files.**

```typescript
/**
 * Playwright Configuration for ARTK E2E Tests
 *
 * Generated by /artk.discover-foundation
 * @see https://playwright.dev/docs/test-configuration
 */
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

## Step F9 — Module registry (with LLKB Integration)

Create `src/modules/registry.json`:
```json
{
  "version": "1.0.0",
  "generatedAt": "<ISO8601>",
  "foundation": [
    { "name": "auth", "path": "foundation/auth", "description": "Authentication harness" },
    { "name": "navigation", "path": "foundation/navigation", "description": "Navigation helpers" },
    { "name": "selectors", "path": "foundation/selectors", "description": "Locator utilities" },
    { "name": "data", "path": "foundation/data", "description": "Data harness" }
  ],
  "feature": [],
  "journeyDependencies": {},
  "llkbComponents": {}
}
```

**LLKB Component Registry Integration:**

When LLKB extracts a new component (Step 17.3 in journey-verify), it must also register in `modules/registry.json`:

```
FUNCTION registerComponentInRegistry(component: Component):
  registry = loadJSON("src/modules/registry.json")

  # Add to llkbComponents map
  registry.llkbComponents[component.id] = {
    name: component.name,
    path: component.module.path,
    importPath: component.module.importPath,
    category: component.category,
    scope: component.scope,
    createdAt: component.metrics.createdAt,
    usedInJourneys: component.metrics.usedInJourneys
  }

  # Update generatedAt
  registry.generatedAt = now().toISO8601()

  saveJSON("src/modules/registry.json", registry)

  # Log to LLKB history
  appendToHistory({
    event: "registry_updated",
    id: component.id,
    summary: "Added " + component.name + " to module registry"
  })
```

**Example registry with LLKB components:**
```json
{
  "version": "1.0.0",
  "generatedAt": "2026-01-16T12:30:00Z",
  "foundation": [
    { "name": "auth", "path": "foundation/auth", "description": "Authentication harness" },
    { "name": "navigation", "path": "foundation/navigation", "description": "Navigation helpers" }
  ],
  "feature": [
    { "name": "orders", "path": "feature/orders", "description": "Order management flows" }
  ],
  "journeyDependencies": {
    "JRN-0001": { "foundation": ["auth", "navigation"], "feature": [] },
    "JRN-0005": { "foundation": ["navigation"], "feature": ["orders"] }
  },
  "llkbComponents": {
    "COMP001": {
      "name": "verifySidebarReady",
      "path": "foundation/navigation/nav.ts",
      "importPath": "@modules/foundation/navigation",
      "category": "navigation",
      "scope": "app-specific",
      "createdAt": "2026-01-16T10:00:00Z",
      "usedInJourneys": ["JRN-0001", "JRN-0002", "JRN-0005"]
    },
    "COMP015": {
      "name": "verifyGridReady",
      "path": "foundation/data-grid/grid-helpers.ts",
      "importPath": "@modules/foundation/data-grid",
      "category": "assertion",
      "scope": "framework:ag-grid",
      "createdAt": "2026-01-16T10:30:00Z",
      "usedInJourneys": ["JRN-0003", "JRN-0005"]
    }
  }
}
```

**Sync between components.json and registry.json:**
- `components.json` (in ${HARNESS_ROOT}/.artk/llkb/) is the source of truth for LLKB metadata
- `registry.json` (in src/modules/) links LLKB components to actual module files
- When journey-implement needs a component, it queries registry for import path
- When journey-verify extracts a component, it updates both files

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

## Step F11 — Initialize LLKB (Lessons Learned Knowledge Base)

**After foundation build completes, initialize the LLKB structure.**

### 11.0a Quick Check — Ensure LLKB Exists (Fallback)

**Bootstrap should have already created LLKB. If not, initialize it now:**

```bash
# Check if LLKB exists
if [ ! -f "${HARNESS_ROOT}/.artk/llkb/config.yml" ]; then
  echo "LLKB not found - initializing..."

  # Call initializeLLKB from @artk/core
  node -e "
    const { initializeLLKB } = require('./vendor/artk-core/dist/llkb');
    initializeLLKB('.artk/llkb').then(r => {
      if (r.success) {
        console.log('✅ LLKB initialized successfully');
      } else {
        console.error('❌ LLKB init failed:', r.error);
        process.exit(1);
      }
    });
  "
else
  echo "✓ LLKB already exists"
fi
```

**If the above command fails**, report to user and suggest running bootstrap again:
```
⚠️ LLKB initialization failed. Please run bootstrap again:
   artk init . --force
   OR
   /path/to/ARTK/scripts/bootstrap.sh .
```

### 11.0 Migration Detection (MANDATORY FOR EXISTING PROJECTS)

**Before creating new LLKB files, check for existing installations:**

```
FUNCTION detectLLKBMigration() -> MigrationResult:
  # ═══════════════════════════════════════════════════════════════
  # CHECK 1: Does LLKB already exist?
  # ═══════════════════════════════════════════════════════════════
  IF exists("${HARNESS_ROOT}/${HARNESS_ROOT}/.artk/llkb/config.yml"):
    existingConfig = loadYAML("${HARNESS_ROOT}/${HARNESS_ROOT}/.artk/llkb/config.yml")
    existingVersion = existingConfig.version || "0.0.0"

    CURRENT_VERSION = "1.0.0"  # Current schema version

    IF existingVersion == CURRENT_VERSION:
      RETURN {
        action: "SKIP",
        reason: "LLKB already exists at version " + existingVersion,
        recommendation: "Run LLKB health check instead: artk llkb health"
      }
    ELSE:
      RETURN {
        action: "MIGRATE",
        fromVersion: existingVersion,
        toVersion: CURRENT_VERSION,
        recommendation: "Backup existing data before migration"
      }

  # ═══════════════════════════════════════════════════════════════
  # CHECK 2: Legacy format detection (pre-LLKB learnings)
  # ═══════════════════════════════════════════════════════════════
  legacyPaths = [
    ".artk/learnings.json",           # Old learning format
    ".artk/patterns.json",             # Old patterns format
    "artk-e2e/learnings/",            # Alternative location
    "docs/TEST-PATTERNS.md"            # Manual patterns doc
  ]

  legacyFound = []
  FOR path in legacyPaths:
    IF exists(path):
      legacyFound.push(path)

  IF legacyFound.length > 0:
    RETURN {
      action: "IMPORT_LEGACY",
      legacyFiles: legacyFound,
      recommendation: "Import existing patterns into new LLKB format"
    }

  # ═══════════════════════════════════════════════════════════════
  # CHECK 3: Existing test patterns (mine from existing tests)
  # ═══════════════════════════════════════════════════════════════
  existingTests = glob("<harnessRoot>/tests/**/*.spec.ts")
  IF existingTests.length > 0:
    RETURN {
      action: "SEED_FROM_TESTS",
      testCount: existingTests.length,
      recommendation: "Analyze existing tests to seed initial LLKB patterns"
    }

  # Fresh install
  RETURN { action: "FRESH_INSTALL" }
```

**Migration actions:**

| Action | What to Do |
|--------|------------|
| `SKIP` | LLKB exists, skip initialization. Run health check instead. |
| `MIGRATE` | Backup `${HARNESS_ROOT}/${HARNESS_ROOT}/.artk/llkb/`, run schema migration, preserve data. |
| `IMPORT_LEGACY` | Read legacy files, convert to new schema, create LLKB. |
| `SEED_FROM_TESTS` | Analyze existing tests, extract patterns, seed LLKB. |
| `FRESH_INSTALL` | Create new LLKB from scratch (Steps 11.1-11.7). |

**Migration procedure (when `action == MIGRATE`):**

```
FUNCTION migrateLLKB(fromVersion: string, toVersion: string):
  # Step 1: Backup
  backupPath = ".artk/llkb-backup-" + formatDate(now(), "YYYY-MM-DD-HHmmss")
  copyDir("${HARNESS_ROOT}/${HARNESS_ROOT}/.artk/llkb/", backupPath)
  logInfo("Backed up LLKB to " + backupPath)

  # Step 2: Apply migrations
  migrations = [
    { from: "0.9.0", to: "1.0.0", fn: migrate_0_9_to_1_0 }
    # Future migrations added here
  ]

  currentVersion = fromVersion
  FOR migration in migrations:
    IF versionCompare(currentVersion, migration.from) <= 0:
      migration.fn()
      currentVersion = migration.to
      logInfo("Migrated from " + migration.from + " to " + migration.to)

  # Step 3: Update version
  config = loadYAML("${HARNESS_ROOT}/${HARNESS_ROOT}/.artk/llkb/config.yml")
  config.version = toVersion
  saveYAML("${HARNESS_ROOT}/${HARNESS_ROOT}/.artk/llkb/config.yml", config)

  RETURN { success: true, backupPath: backupPath }

FUNCTION migrate_0_9_to_1_0():
  # Example migration: Add new required fields
  lessons = loadJSON("${HARNESS_ROOT}/${HARNESS_ROOT}/.artk/llkb/lessons.json")
  IF NOT lessons.globalRules:
    lessons.globalRules = []
  IF NOT lessons.appQuirks:
    lessons.appQuirks = []
  saveJSON("${HARNESS_ROOT}/${HARNESS_ROOT}/.artk/llkb/lessons.json", lessons)

  components = loadJSON("${HARNESS_ROOT}/${HARNESS_ROOT}/.artk/llkb/components.json")
  IF NOT components.componentsByScope:
    components.componentsByScope = {
      "universal": [],
      "framework:angular": [],
      "framework:react": [],
      "app-specific": []
    }
  saveJSON("${HARNESS_ROOT}/${HARNESS_ROOT}/.artk/llkb/components.json", components)
```

**Output migration status:**
```
LLKB Migration Check:
────────────────────────────────────────────────────
Status: MIGRATE
From Version: 0.9.0
To Version: 1.0.0

Migration Steps:
1. ✓ Backup created: .artk/llkb-backup-2026-01-16-120000/
2. ✓ Schema migration 0.9.0 → 1.0.0 applied
3. ✓ Version updated to 1.0.0

Preserved:
- 15 lessons
- 8 components
- 3 app quirks

New features available:
- Global rules support
- App quirks tracking
- Enhanced analytics
────────────────────────────────────────────────────
```

### 11.1 Create LLKB Directory Structure

```
${HARNESS_ROOT}/.artk/llkb/
├── config.yml                  # LLKB configuration
├── app-profile.json            # Application DNA
├── lessons.json                # Fixes, quirks, timing patterns
├── components.json             # Reusable test components catalog
├── patterns/                   # Categorized pattern details
│   ├── selectors.json          # Selector strategies
│   ├── timing.json             # Async/timing patterns
│   ├── data.json               # Test data patterns
│   ├── auth.json               # Authentication patterns
│   └── assertions.json         # Common assertion patterns
├── history/                    # Learning event log
└── analytics.json              # Effectiveness metrics
```

### 11.2 Generate app-profile.json from Discovery Data

Use discovery outputs to populate the app profile:

```json
{
  "version": "1.0.0",
  "createdBy": "discover-foundation",
  "lastUpdated": "<ISO8601 timestamp>",

  "application": {
    "name": "<detected app name from discovery>",
    "framework": "<angular|react|vue|nextjs|other from Step D3>",
    "uiLibrary": "<material|antd|primeng|bootstrap|custom|none from discovery>",
    "dataGrid": "<ag-grid|tanstack-table|custom|none from Step D3.5>",
    "authProvider": "<azure-ad|okta|auth0|cognito|custom|none from Step D6>",
    "stateManagement": "<ngrx|redux|zustand|none from discovery>"
  },

  "testability": {
    "testIdAttribute": "<data-testid|data-test|data-cy from discovery or config>",
    "testIdCoverage": "<high|medium|low from Step D7.A>",
    "ariaCoverage": "<high|medium|low from Step D7.A>",
    "asyncComplexity": "<high|medium|low from Step D7.C>"
  },

  "environment": {
    "baseUrls": {
      "<env_name>": "<baseUrl from artk.config.yml>",
      "...": "..."
    },
    "authBypass": {
      "available": <true|false from Step D6>,
      "method": "<storage-state|api-token|mock-user|none>"
    }
  }
}
```

### 11.3 Initialize Empty LLKB Databases

**lessons.json** (empty template):
```json
{
  "version": "1.0.0",
  "lastUpdated": "<ISO8601>",
  "lessons": [],
  "globalRules": [],
  "appQuirks": []
}
```

**components.json** (empty template):
```json
{
  "version": "1.0.0",
  "lastUpdated": "<ISO8601>",
  "components": [],
  "componentsByCategory": {
    "navigation": [],
    "auth": [],
    "assertion": [],
    "data": [],
    "ui-interaction": []
  },
  "componentsByScope": {
    "universal": [],
    "framework:<name>": [],
    "app-specific": []
  }
}
```

### 11.4 Create config.yml with Defaults

```yaml
version: "1.0.0"
enabled: true

# Learning thresholds
extraction:
  minOccurrences: 2              # Extract after N uses
  predictiveExtraction: true     # Extract on first use if predicted reusable
  confidenceThreshold: 0.7       # Min confidence to auto-apply pattern

# Retention policies
retention:
  maxLessonAge: 90               # Days before lesson marked stale
  minSuccessRate: 0.6            # Demote lessons below this rate
  archiveUnused: 30              # Archive components unused for N days

# Context injection
injection:
  # No artificial limits - all relevant content is injected
  # Model's context window is the only natural constraint
  prioritizeByConfidence: true   # Sort by confidence score (highest first)

# Scopes tracked
scopes:
  universal: true                # Track @artk/core patterns
  frameworkSpecific: true        # Track framework patterns
  appSpecific: true              # Track app-specific patterns
```

### 11.5 Initialize patterns/*.json with App-Appropriate Defaults

**patterns/selectors.json**:
```json
{
  "version": "1.0.0",
  "selectorPriority": {
    "comment": "App-specific selector priority based on discovery",
    "order": [
      { "type": "data-testid", "reliability": 0.98, "note": "Primary strategy" },
      { "type": "role+name", "reliability": 0.95 },
      { "type": "aria-label", "reliability": 0.90 },
      { "type": "text-content", "reliability": 0.75 },
      { "type": "css-class", "reliability": 0.40, "note": "Avoid if possible" }
    ]
  },
  "selectorPatterns": [],
  "avoidSelectors": [
    { "pattern": "[class*='_']", "reason": "CSS module hashed classes" },
    { "pattern": ".ng-*", "reason": "Angular internal classes" },
    { "pattern": "[class*='sc-']", "reason": "Styled-components hashes" }
  ],
  "preferredSelectors": [
    { "pattern": "[data-testid='*']", "priority": 1, "reason": "Stable, explicit" },
    { "pattern": "getByRole('*')", "priority": 2, "reason": "Accessible, semantic" },
    { "pattern": "getByLabel('*')", "priority": 3, "reason": "User-visible" }
  ]
}
```

**If AG Grid detected** in Step D3.5, add to avoidSelectors:
```json
{ "pattern": ".ag-cell-*", "reason": "Dynamic AG Grid classes" }
```

**patterns/timing.json**:
```json
{
  "version": "1.0.0",
  "asyncPatterns": [],
  "loadingIndicators": [],
  "networkPatterns": [],
  "forbiddenPatterns": [
    {
      "pattern": "page.waitForTimeout(*)",
      "severity": "error",
      "alternative": "Use web-first assertions or expect.poll()"
    },
    {
      "pattern": "waitForLoadState('networkidle')",
      "severity": "warning",
      "alternative": "Use 'domcontentloaded' or explicit element waits"
    }
  ]
}
```

**patterns/assertions.json**:
```json
{
  "version": "1.0.0",
  "commonAssertions": [],
  "assertionHelpers": [
    {
      "name": "expectToast",
      "module": "@artk/core/assertions",
      "signature": "expectToast(page, { message, type?, timeout? })",
      "scope": "universal"
    },
    {
      "name": "expectLoading",
      "module": "@artk/core/assertions",
      "signature": "expectLoading(page, { indicator?, timeout? })",
      "scope": "universal"
    }
  ]
}
```

**patterns/data.json**, **patterns/auth.json**: Initialize as empty:
```json
{
  "version": "1.0.0"
}
```

### 11.6 Create Empty History and Analytics

**history/<YYYY-MM-DD>.jsonl** (empty, will be populated by journey-verify):
- Create directory only

**analytics.json** (empty template):
```json
{
  "version": "1.0.0",
  "lastUpdated": "<ISO8601>",
  "overview": {
    "totalLessons": 0,
    "activeLessons": 0,
    "archivedLessons": 0,
    "totalComponents": 0,
    "activeComponents": 0,
    "archivedComponents": 0
  },
  "lessonStats": {
    "byCategory": {},
    "avgConfidence": 0,
    "avgSuccessRate": 0
  },
  "componentStats": {
    "byCategory": {},
    "byScope": {},
    "totalReuses": 0,
    "avgReusesPerComponent": 0
  },
  "impact": {
    "verifyIterationsSaved": 0,
    "avgIterationsBeforeLLKB": 0,
    "avgIterationsAfterLLKB": 0,
    "codeDeduplicationRate": 0,
    "estimatedHoursSaved": 0
  },
  "topPerformers": {
    "lessons": [],
    "components": []
  },
  "needsReview": {
    "lowConfidenceLessons": [],
    "lowUsageComponents": [],
    "decliningSuccessRate": []
  }
}
```

### 11.7 LLKB Library Reference (@artk/core/llkb)

**The LLKB library is available as part of @artk/core. Use these functions instead of manual implementations.**

**Installation:**
```bash
# Already included with @artk/core - no separate install needed
```

**Key exports from `@artk/core/llkb`:**

| Category | Functions | Description |
|----------|-----------|-------------|
| **File Operations** | `saveJSONAtomic`, `updateJSONWithLock`, `loadJSON`, `ensureDir` | Atomic writes, file locking for concurrent access |
| **History Logging** | `appendToHistory`, `readHistoryFile`, `countTodayEvents`, `getHistoryDir` | Event logging, rate limit checking |
| **Rate Limiting** | `isDailyRateLimitReached`, `isJourneyRateLimitReached`, `countPredictiveExtractionsToday` | Prevent LLKB bloat |
| **Similarity** | `calculateSimilarity`, `jaccardSimilarity`, `findSimilarPatterns`, `isNearDuplicate` | Pattern detection |
| **Inference** | `inferCategory`, `inferCategoryWithConfidence`, `isComponentCategory` | Categorize code patterns |
| **Confidence** | `calculateConfidence`, `detectDecliningConfidence`, `needsConfidenceReview` | Lesson health tracking |
| **Normalization** | `normalizeCode`, `hashCode`, `tokenize` | Code comparison |
| **Analytics** | `updateAnalytics`, `createEmptyAnalytics`, `getAnalyticsSummary` | Metrics updates |
| **CLI Functions** | `runHealthCheck`, `getStats`, `prune`, `formatHealthCheck` | CLI operations |

**Example usage in prompts:**

```typescript
import {
  saveJSONAtomic,
  updateJSONWithLock,
  appendToHistory,
  calculateSimilarity,
  inferCategory,
  isDailyRateLimitReached,
  runHealthCheck,
  formatHealthCheck,
} from '@artk/core/llkb';

// Atomic file writes (safe for concurrent access)
await saveJSONAtomic('${HARNESS_ROOT}/.artk/llkb/lessons.json', lessonsData);

// Locked updates (prevents race conditions)
await updateJSONWithLock('${HARNESS_ROOT}/.artk/llkb/components.json', (data) => {
  data.components.push(newComponent);
  return data;
});

// Check rate limits before extraction
const config = loadConfig();
if (isDailyRateLimitReached(config, llkbRoot)) {
  console.log('Daily extraction limit reached');
}

// Log history event
appendToHistory({
  event: 'lesson_created',
  timestamp: new Date().toISOString(),
  lessonId: 'L042',
  journeyId: 'JRN-0005',
}, llkbRoot);

// Run health check
const result = runHealthCheck(llkbRoot);
console.log(formatHealthCheck(result));
```

### 11.8 Create LLKB CLI Utility Script

**Create a utility script for common LLKB operations (uses @artk/core/llkb library):**

Create `${HARNESS_ROOT}/.artk/llkb/scripts/llkb-cli.ts`:

```typescript
#!/usr/bin/env npx ts-node
/**
 * LLKB CLI Utility
 *
 * Uses @artk/core/llkb library for all operations.
 *
 * Commands:
 *   health    - Check LLKB health and integrity
 *   stats     - Display LLKB statistics
 *   prune     - Archive stale lessons/components
 *
 * Usage:
 *   npx ts-node ${HARNESS_ROOT}/.artk/llkb/scripts/llkb-cli.ts <command> [options]
 */

import * as path from 'path';
import {
  runHealthCheck,
  getStats,
  prune,
  formatHealthCheck,
  formatStats,
  formatPruneResult,
} from '@artk/core/llkb';

const LLKB_ROOT = path.join(process.cwd(), '.artk', 'llkb');

// ═══════════════════════════════════════════════════════════════
// CLI COMMANDS (using @artk/core/llkb library)
// ═══════════════════════════════════════════════════════════════

const command = process.argv[2];
const args = process.argv.slice(3);

switch (command) {
  case 'health': {
    const result = runHealthCheck(LLKB_ROOT);
    console.log(formatHealthCheck(result));
    process.exit(result.overall === 'fail' ? 1 : 0);
    break;
  }
  case 'stats': {
    const result = getStats(LLKB_ROOT);
    console.log(formatStats(result));
    break;
  }
  case 'prune': {
    const dryRun = !args.includes('--force');
    const result = prune(LLKB_ROOT, { dryRun });
    console.log(formatPruneResult(result));
    break;
  }
  default:
    console.log('LLKB CLI - Usage:');
    console.log('  npx ts-node ${HARNESS_ROOT}/.artk/llkb/scripts/llkb-cli.ts health');
    console.log('  npx ts-node ${HARNESS_ROOT}/.artk/llkb/scripts/llkb-cli.ts stats');
    console.log('  npx ts-node ${HARNESS_ROOT}/.artk/llkb/scripts/llkb-cli.ts prune [--force]');
}
```

**Add to package.json (scripts and yaml dependency):**
```json
{
  "scripts": {
    "llkb:health": "npx ts-node ${HARNESS_ROOT}/.artk/llkb/scripts/llkb-cli.ts health",
    "llkb:stats": "npx ts-node ${HARNESS_ROOT}/.artk/llkb/scripts/llkb-cli.ts stats",
    "llkb:prune": "npx ts-node ${HARNESS_ROOT}/.artk/llkb/scripts/llkb-cli.ts prune"
  },
  "devDependencies": {
    "yaml": "^2.0.0",
    "ts-node": "^10.9.0",
    "typescript": "^5.0.0"
  }
}
```

**Install dependencies:**
```bash
npm install --save-dev yaml ts-node typescript
```

### 11.9 Execute LLKB Initialization

Run the LLKB initialization command:

```bash
artk llkb init --llkb-root ${HARNESS_ROOT}/.artk/llkb
```

**Expected output:**
```
✅ LLKB initialized successfully
   Created: ${HARNESS_ROOT}/.artk/llkb/config.yml
   Created: ${HARNESS_ROOT}/.artk/llkb/lessons.json
   Created: ${HARNESS_ROOT}/.artk/llkb/components.json
   Created: ${HARNESS_ROOT}/.artk/llkb/analytics.json
   Created: ${HARNESS_ROOT}/.artk/llkb/patterns/
   Created: ${HARNESS_ROOT}/.artk/llkb/history/
```

### 11.10 Output Summary

After LLKB initialization, output:

```
LLKB (Lessons Learned Knowledge Base) initialized:
✓ Created ${HARNESS_ROOT}/.artk/llkb/ directory structure
✓ Generated app-profile.json from discovery data
✓ Initialized empty lessons.json and components.json
✓ Created patterns/*.json with app-specific defaults
✓ Set up config.yml with default thresholds
✓ Created history/ and analytics.json
✓ Created LLKB CLI utility script

The LLKB is now ready to:
- Capture lessons from journey-verify (test failures/fixes)
- Suggest reusable components during journey-implement
- Track pattern effectiveness over time

CLI Commands Available:
- npm run llkb:health   - Check LLKB integrity
- npm run llkb:stats    - View statistics
- npm run llkb:prune    - Archive stale patterns
```

---

# ═══════════════════════════════════════════════════════════════════
# PART 3: QUESTIONS + FINALIZATION
# ═══════════════════════════════════════════════════════════════════

## Mode-based Question Policy

**IMPORTANT: When asking questions, follow the User Question Standards in `.github/prompts/common/GENERAL_RULES.md`:**
- Ask ONE question at a time
- Use numbered options (NOT checkboxes)
- Show progress (Question X of Y)
- Provide recommended defaults
- Wait for user response before asking the next question

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

## Step V0 — Pre-Compilation Validation (MANDATORY)

**BEFORE running TypeScript compilation, you MUST complete the Pre-Compilation Validation Checklist from `.github/prompts/common/GENERAL_RULES.md`.**

Run through each check:
1. **Duplicate Function Check** — No function defined in multiple files
2. **ESM Import Path Check** — Directory imports include `/index`
3. **Import Usage Check** — No unused imports, unused params prefixed with `_`
4. **Path Alias Check** — Consistent import patterns, aliases defined in tsconfig
5. **Syntax Quick Check** — Template literals use backticks, no unclosed brackets

**Only proceed to Step V1 after ALL checks pass.**

---

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
import * as path from 'path';
import * as fs from 'fs';

// Module-system agnostic __dirname (works in both CommonJS and ESM)
const __testDir = typeof __dirname !== 'undefined'
  ? __dirname
  : path.dirname(new URL(import.meta.url).pathname);

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
    const envPath = path.join(__testDir, '../../config/environments.json');
    const envExamplePath = path.join(__testDir, '../../config/environments.example.json');

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
    const registryPath = path.join(__testDir, '../../src/modules/registry.json');
    expect(fs.existsSync(registryPath)).toBe(true);

    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
    expect(registry.foundation).toBeDefined();
    expect(Array.isArray(registry.foundation)).toBe(true);
    expect(registry.foundation.length).toBeGreaterThan(0);
  });

  test('all registered modules exist', async () => {
    const registryPath = path.join(__testDir, '../../src/modules/registry.json');
    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));

    for (const mod of registry.foundation) {
      const modPath = path.join(__testDir, '../../src/modules', mod.path);
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

Test that core library integration works.

**For CommonJS projects:**
```bash
# Test core imports work (CommonJS require)
node -e "
const config = require('./vendor/artk-core/dist/config/index.js');
const harness = require('./vendor/artk-core/dist/harness/index.js');
console.log('✓ @artk/core imports successful');
"
```

**For ESM projects (package.json has "type": "module"):**
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

**Detect module system:**
Check `package.json` for `"type": "module"`. If absent or `"type": "commonjs"`, use the CommonJS version.

**If import fails:**
- Check that vendor/artk-core exists
- Check that dist/ folder is populated
- For CommonJS: Ensure dist contains .js files (not just .mjs)
- Re-run `/artk.init-playbook` to re-copy core

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
- If READY: Proceed to /artk.testid-audit (strongly recommended) then /artk.journey-propose
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

### LLKB (Lessons Learned Knowledge Base)
- [ ] LLKB migration check performed (Step F11)
- [ ] LLKB directory structure created (`${HARNESS_ROOT}/.artk/llkb/`)
- [ ] `config.yml` initialized with default settings
- [ ] `lessons.json` initialized (empty array)
- [ ] `components.json` initialized (empty array)
- [ ] `analytics.json` initialized with baseline metrics
- [ ] LLKB CLI utility created or verified

### Validation
- [ ] TypeScript compilation passes (`tsc --noEmit`)
- [ ] Foundation validation tests created
- [ ] All validation tests pass
- [ ] @artk/core integration verified
- [ ] Validation summary output

### Final Output (MANDATORY)
- [ ] Data-Testid Warning displayed (if applicable)
- [ ] "Next Commands" box displayed from file (READ, don't generate)

---

## MANDATORY: Final Output Section

**You MUST display this section at the end of your output, exactly as formatted.**

### Data-Testid Warning (if applicable)

**If NO `data-testid` or `data-test` attributes were detected during discovery, display this warning:**

```
⚠️  WARNING: No data-testid attributes detected in the codebase!
    This will make tests brittle and hard to maintain.

    STRONGLY RECOMMENDED: Run the testid audit before implementing journeys:

    /artk.testid-audit mode=report

    This will identify critical elements that need test hooks.
```

### Next Commands

**🛑 STOP - READ THE FILE, DON'T GENERATE**

You MUST read and display the contents of this file EXACTLY:

**File to read:** `.github/prompts/next-commands/artk.discover-foundation.txt`

**Instructions:**
1. Use your file reading capability to read the file above
2. Display the ENTIRE contents of that file as a code block
3. Do NOT modify, summarize, or add to the file contents
4. Do NOT generate your own version - READ THE FILE

**If you cannot read the file**, display this fallback EXACTLY:
```
╔════════════════════════════════════════════════════════════════════╗
║                         NEXT COMMANDS                              ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  1. (RECOMMENDED) Audit testid coverage:                           ║
║     /artk.testid-audit mode=report                                 ║
║                                                                    ║
║  2. (OPTIONAL) Propose journeys from discovery:                    ║
║     /artk.journey-propose                                          ║
║                                                                    ║
║  3. (OPTIONAL) Create a specific journey manually:                 ║
║     /artk.journey-define id=JRN-0001 title="<your title>"          ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
```

**DO NOT add anything after this box. END your response here.**
