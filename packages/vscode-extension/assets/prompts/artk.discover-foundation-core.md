---
name: artk.discover-foundation-core
mode: agent
description: "Discovery + Foundation Build (Steps D0-F10) — analyzes routes/features/auth, generates DISCOVERY.md, creates Playwright harness with auth, fixtures, and modules. Part of the discover-foundation workflow; orchestrator handles LLKB, validation, and handoffs."
---

# ARTK /discover-foundation-core — Discovery + Foundation Harness

> **DO NOT RUN DIRECTLY.** This is a sub-agent of `/artk.discover-foundation`. It requires the orchestrator to handle LLKB initialization (F11-F12), validation, and final output. If you are running this directly, stop and run `/artk.discover-foundation` instead.

This is **PART** of the discover-foundation workflow, handling:
1. **PART 1: DISCOVERY** (Steps D0–D10) — Analyze the application (routes, features, auth, testability) and generate documentation
2. **PART 2: FOUNDATION BUILD** (Steps F0–F10) — Create the Playwright harness with auth, fixtures, and foundation modules
3. **PART 3: QUESTIONS + FINALIZATION** — Mode-based question policy and edge cases

The orchestrator handles LLKB initialization (F11–F12), validation (V0–V6), final output, and handoffs.

By combining discovery and foundation build, discovery findings directly inform foundation build decisions (auth type, selectors, data strategy).

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
10. **🛑 Environment detection is mandatory.** MUST search codebase for environments (Step D1.5) and ASK user to confirm. Never assume defaults are correct.
11. **🛑 Auth bypass detection is mandatory.** MUST search codebase for auth bypass mechanisms (Step D6) and ASK user about auth strategy. Never skip this step.

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

**Auto-detect the application URL before asking the user.**

### D0.1 — Extract candidate URLs

Gather potential base URLs from these sources (check in this order, stop collecting after 5 candidates):

1. `baseUrl=` argument (if passed by user)
2. `artk.config.yml` → `environments.local.baseUrl` (or any `environments.*.baseUrl`)
3. Environment files (`.env.local`, `.env`, `.env.development`): extract variables matching `*_BASE_URL`, `*_APP_URL`, `*_API_URL`, `BASE_URL`, `APP_URL` that contain `localhost` or `127.0.0.1`
4. Build tool configs (`vite.config.ts`, `webpack.config.js`, `angular.json`): extract `server.port`, `devServer.port`, or proxy target URLs
5. `package.json` scripts: extract port numbers from `"dev"`, `"start"`, `"serve"` commands (e.g., `--port 5173`)
6. Framework defaults (only if framework was detected in D1): `localhost:5173` (Vite), `localhost:3000` (CRA/Next), `localhost:4200` (Angular), `localhost:8080` (Vue CLI/Spring Boot)

### D0.2 — Probe candidate URLs

For each candidate URL (up to 5), run a quick connectivity check:

```bash
curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 --max-time 5 <url>
```

A URL is **reachable** if the HTTP status code is:
- 2xx (success), 3xx (redirect), or 401/403 (auth-protected but server is running)

### D0.3 — Decide

- **One URL reachable:** Use it automatically. Print:
  `✓ Auto-detected running app at <url>. Proceeding with full discovery.`
  Set `skipAuthDetection=false` and use this as `baseUrl`.

- **Multiple URLs reachable:** Ask user to pick:
  ```
  I detected multiple running services:
  1. http://localhost:5173 (from vite.config.ts)
  2. http://localhost:8085 (from .env.local)
  Which is the main frontend URL for testing? (default: 1)
  ```

- **No URL reachable:** Ask user:
  ```
  Could not reach the application at these URLs:
  - http://localhost:5173 (from vite.config.ts) — not responding
  - http://localhost:8085 (from .env.local) — not responding

  Options:
  1. Provide the correct URL (app is running elsewhere)
  2. Skip runtime detection (static-only discovery)
  3. Skip auth detection entirely
  ```

- **No candidate URLs found at all:** Ask user:
  ```
  I could not find any local URLs in your config files.

  Options:
  1. Provide the URL where the app is running
  2. Skip runtime detection (static-only discovery)
  3. Skip auth detection entirely
  ```

**If skip or no URL confirmed:**
- Set `skipAuthDetection=true`
- Proceed with static discovery only
- Document: "Auth detection skipped — run with app running for full detection"

**If URL confirmed (auto or user-provided):**
- Set `skipAuthDetection=false`
- Use as `baseUrl` for auth detection and runtime scan

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

Also load `artk.config.yml` (if present) for initial environment hints.

## Step D1.5 — Detect and Confirm Environments (MANDATORY)

**🛑 THIS STEP IS MANDATORY — DO NOT SKIP**

You MUST search the codebase for environment configurations and ALWAYS ask the user to confirm.

### A) Search for Environment Indicators

Search these locations for base URLs and environment names:

**1. Environment files:**
```
.env, .env.local, .env.development, .env.staging, .env.production
.env.test, .env.intg, .env.ctlq, .env.example
```
Extract: `VITE_*_URL`, `REACT_APP_*_URL`, `NEXT_PUBLIC_*_URL`, `API_URL`, `BASE_URL`, `APP_URL`

**2. Build tool configs:**
```
vite.config.ts, vite.config.js, webpack.config.js, next.config.js, angular.json
```
Extract: `proxy` settings, `define` constants, environment-specific configurations

**3. Package.json scripts:**
```json
"scripts": {
  "start:local": "...",
  "start:intg": "...",
  "dev": "..."
}
```
Extract: Environment names from script names (local, dev, intg, ctlq, staging, prod)

**4. Config directories:**
```
config/, environments/, env/, src/environments/
```
Extract: Environment-specific config files with base URLs

**5. API client configurations:**
```
src/api/*, src/services/*, src/config/*
```
Extract: Base URL constants, API endpoint configurations

### B) Compile Detected Environments

Create a list of detected environments with:
| Environment | Source | Base URL | Confidence |
|-------------|--------|----------|------------|
| local | .env.local | http://localhost:3000 | high |
| intg | package.json script | unknown | medium |
| prod | vite.config.ts proxy | https://prod.example.com | high |

### C) MANDATORY: Ask User to Confirm Environments

**You MUST ask this question — do not assume the defaults are correct:**

```
I detected the following environments in your codebase:

1. local: http://localhost:3000 (from .env.local)
2. intg: [not detected] (from package.json script name)
3. prod: https://prod.example.com (from vite.config.ts)

Please confirm or modify these environments:

1. Keep detected environments as-is
2. Add missing base URLs (I'll ask for each)
3. Add/remove environments
4. Skip environment configuration (use defaults)

Which option? (default: 2 - I'll ask for missing URLs)
```

**If user selects option 2, ask for each missing URL:**
```
What is the base URL for the 'intg' environment?
(Enter URL or 'skip' to remove this environment)
```

### D) Update artk.config.yml

After confirmation, update `artk.config.yml` with the confirmed environments:
```yaml
environments:
  local:
    baseUrl: http://localhost:3000
  intg:
    baseUrl: https://intg.example.com
  prod:
    baseUrl: https://prod.example.com
```

---

## Step D1.6 — Generate Environment Matrix

Produce an **Environment Matrix** in `docs/DISCOVERY.md` and regenerate it on every run.
If no environments were confirmed, create a single `local` row and mark unknowns.

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

**🛑 THIS STEP IS MANDATORY — DO NOT SKIP**

Collect:
- login/logout URLs or components
- SSO/OIDC hints (`oidc`, `saml`, `msal`, `auth0`, `keycloak`)
- route guards/middleware (Angular guards, Next middleware, React auth wrappers)
- role checks and permission gates
- local bypass signals

### MANDATORY: Auth Bypass Detection

**🛑 STOP — You MUST execute these searches before proceeding:**

**First, read the patterns file:**
Read `.github/prompts/common/AUTH_BYPASS_PATTERNS.md` for the complete list of patterns.

**Then execute these searches (ALL are required):**

```bash
# Group 1: Skip/Bypass flags in code
grep -rn "skipAuth\|bypassAuth\|mockAuth\|noAuth\|skipOidc\|skipAuthentication\|skip-auth\|skipLogin" src/

# Group 2: Environment variables
grep -rn "SKIP_AUTH\|NO_AUTH\|AUTH_DISABLED\|DISABLE_AUTH\|BYPASS_AUTH\|MOCK_AUTH" .env* src/

# Group 3: Config flags (check for false/disabled values)
grep -rn "oauthEnabled\|authEnabled\|enableAuth\|requireAuth\|authRequired\|useAuth" src/ config/

# Group 4: Mock/Dev user patterns
grep -rn "mockUser\|devUser\|testUser\|fakeUser\|DEV_USER\|MOCK_USER\|TEST_USER" src/

# Group 5: Conditional auth rendering
grep -rn "if.*auth.*enabled\|config\.auth\|config\.oauth\|AuthProvider.*\?\|canActivate" src/
```

**For EACH pattern found, document:**
| Flag/Mechanism | Location | How to Enable | Mode |
|----------------|----------|---------------|------|
| `oauthEnabled` | `src/main.tsx:64` | Set to `false` in backend config | identityless |

**If auth bypass IS detected:**
```
✓ Auth bypass detected: [mechanism name]
  Location: [file:line]
  Enable with: [how to enable]
  Mode: [identityless | mock-identity]

  This means you can run tests locally WITHOUT real authentication.
  Tests tagged @auth or @rbac should be skipped in local env.
```

**If NO auth bypass is detected:**
```
✗ No auth bypass mechanism detected.
  Tests will require real authentication credentials.
  Consider requesting a test account or adding a local bypass mechanism.
```

### MANDATORY: Ask User About Auth Strategy

**After detecting auth mechanisms, you MUST ask:**

```
I detected the following authentication setup:

Auth Provider: [OIDC/Form/SSO/None]
Auth Bypass Available: [Yes - oauthEnabled=false / No]
Login URL: [detected URL or 'not found']

How would you like to handle authentication for testing?

1. Use auth bypass locally (oauthEnabled=false) - fastest for development
2. Use real OIDC authentication - requires test credentials
3. Use storage state from manual login - I'll guide you through setup
4. Multiple modes (bypass locally, real auth in CI/staging)
5. Skip auth configuration for now

Which option?
```

Output:
- "Auth entry points" table
- "Role/permission hints" list
- "Local auth bypass signals" table (format specified in AUTH_BYPASS_PATTERNS.md)
- User's chosen auth strategy

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

### 🛑 MANDATORY Questions (ALL MODES)

**These questions are embedded in discovery steps and MUST be asked:**

1. **Environment Confirmation** (Step D1.5) — Detect environments from codebase, ask user to confirm/modify
2. **Auth Strategy** (Step D6) — Detect auth bypass, ask user how to handle authentication

**DO NOT skip these questions regardless of mode setting.**

### QUICK (≤ 3 additional questions)
1) Which app scope (if multiple frontends)?
2) Any top 3 business-critical flows to prioritize?
3) test id attribute convention?

### STANDARD (≤ 7 additional questions, default)
Quick +:
4) Test data approach: seeded env / API setup / manual only?
5) Any areas to exclude from testing?
6) Main actor list (standard-user/admin ok)?
7) Browsers to run locally?

### MAX (add up to 5 more)
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
auth: SSO (or bypass:oauthEnabled=false)
envs: [local, intg, prod]
testId: data-testid
data: create_api
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
