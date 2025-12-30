---
name: discover
description: "Phase 4: Discover the application (routes, features, auth, testability, risk) and generate DISCOVERY.md + TESTABILITY.md."
argument-hint: "mode=standard|quick|max artkRoot=<path> appScope=auto|all|<appName> runtimeScan=true|false baseUrl=<url> maxDepth=<n> includePaths=<glob> excludePaths=<glob> generateJourneyShortlist=true|false generateJourneyStubs=true|false outDir=<path> dryRun=true|false"
agent: agent
---

# ARTK /discover — Discovery Capability (Phase 4)

You are running **ARTK Phase 4**.

ARTK is a standardized kit that plugs into GitHub Copilot (repository instructions + prompt files + structured artifacts) to help teams build and continuously maintain **complete automated regression testing suites** for existing applications. These suites cover end-to-end **Journeys**, detect regressions early, and keep behavior stable across releases.

This `/discover` command creates a consistent, semi-automated understanding of the application so subsequent ARTK commands can propose Journeys and plan modules with fewer surprises.

## Non‑Negotiables
- **Be honest about uncertainty.** If you can’t infer something reliably, mark it `unknown` and explain why.
- **Be deterministic.** Stable ordering and repeatable outputs.
- **Do not require running the app.** Runtime scan is optional and must degrade gracefully.
- **No secrets.** Do not ask for passwords or tokens. If auth is needed, request a test account *process*, not credentials.
- **No destructive edits.** Only create/update discovery docs with managed markers.

---

# Outputs (must produce these)
Unless overridden by args, write outputs under `<ARTK_ROOT>/docs/`:

1) `docs/DISCOVERY.md`
2) `docs/TESTABILITY.md` (may be a separate file; do not merge unless requested)

Optional (recommended) machine outputs under `docs/discovery/`:
- `docs/discovery/routes.json`
- `docs/discovery/features.json`
- `docs/discovery/apis.json`
- `docs/discovery/risk.json`
- `docs/discovery/summary.json`

All generated sections MUST include:
- `<!-- ARTK:BEGIN <section> -->` and `<!-- ARTK:END <section> -->`
so you can update them on re-run without overwriting human notes.

---

# Inputs (optional)
Parse `key=value` arguments after `/discover`:
- `mode`: `quick | standard | max` (default: `standard`)
- `artkRoot`: ARTK root folder path (default: infer from `artk.config.yml`)
- `appScope`: `auto | all | <appName>` (default: `auto`)
- `runtimeScan`: `true | false` (default: `false`)
- `baseUrl`: optional URL for runtime scan
- `maxDepth`: crawl depth (default: `2` if runtimeScan)
- `includePaths` / `excludePaths`: optional route filters
- `generateJourneyShortlist`: `true | false` (default: `true`)
- `generateJourneyStubs`: `true | false` (default: `false`, safe default)
- `outDir`: override docs output root (default: `<ARTK_ROOT>/docs`)
- `dryRun`: `true | false` (default: `false`)

---

# What this command does
You must produce:
- Route/page inventory (best-effort)
- Feature-area grouping
- Auth entry points and role/permission hints
- Testability findings (locators/selectors, data feasibility, async risk zones)
- Risk ranking model and ranked “Top risk flows” list
- Recommended initial Journeys shortlist (smoke + release), if enabled

# What this command does NOT do
- Does not write Playwright tests (later phases)
- Does not configure CI/CD
- Does not require deployment access

---

# Required Output Format (always follow)

## 1) Detected context (short)
- ARTK_ROOT and repo type: monorepo vs single-app
- Candidate apps (if monorepo) + chosen scope
- Detected stacks/frameworks (frontend + backend)
- Existing artifacts: journeys/backlog/index, existing E2E tests, router config presence

## 2) Discovery plan (short)
- What you will scan and why (router, nav, API clients, flags, auth)
- Whether runtime scan will run (and constraints)

## 3) Questions (only if required)
Ask a compact questionnaire for a single reply, based on `mode`.

## 4) Generated deliverables
Write `DISCOVERY.md` and `TESTABILITY.md` (and optional JSON outputs).
At the end, print a “How to use these outputs” section.

---

# Procedure / Algorithm

## Step 0 — Locate ARTK_ROOT
Determine `ARTK_ROOT` in this order:
1) `artkRoot=` argument
2) nearest `artk.config.yml` (search upward from CWD)
3) if still unknown, stop and instruct the user to run `/init` first

## Step 1 — Identify app candidates (monorepo-aware)
Detect app roots using common patterns:
- `apps/*`, `packages/*`, `services/*`, `src/*`
- presence of `package.json`, `pom.xml`, `build.gradle`, `.csproj`, etc.
For each candidate, detect whether it is **frontend-capable** (HTML routes, SPA, SSR) vs backend-only.

Choose scope:
- `appScope=all`: include all frontends
- `appScope=<name>`: focus on that app
- `auto`: if exactly 1 frontend exists, use it; otherwise ask the user to choose (STANDARD/MAX only)

## Step 2 — Detect framework(s) and routing style
Use file and dependency heuristics:
- Next.js: `next.config.*`, `pages/`, `app/` directories
- React Router: `react-router` deps, `<Routes>`, `createBrowserRouter`, `route config`
- Angular: `@angular/router`, `app.routes.ts`, `Routes` arrays
- Vue: `vue-router` config
- SvelteKit: `src/routes`
- Nuxt: `pages/` / `nuxt.config.*`
Also detect API patterns:
- OpenAPI/Swagger files (`openapi.*`, `swagger.*`)
- GraphQL schemas (`schema.graphql`, `.gql`)
- REST clients (`axios`, `fetch`, `ky`, `graphql-request`)

If multiple routing systems exist, prefer the one actively used by the selected app scope.

## Step 3 — Build a route/page inventory (static scan)
Output should include:
- route path pattern
- source (router config file OR file-system path)
- route type (public/protected/unknown)
- dynamic segments (e.g., `:id`, `[id]`)
- feature flag/permission hints if detectable
- UI complexity hints (forms, tables, wizards, uploads)
- primary API dependencies (best-effort)

### Routing extraction rules (examples)
- Next.js Pages Router: routes from `pages/**` file paths.
- Next.js App Router: routes from `app/**/page.*` and route segments.
- React Router: parse route objects or `<Route path>` definitions (best-effort; do not build a full AST parser unless necessary).
- Angular: parse `Routes` arrays for `path`, `children`, `canActivate`, `loadChildren` references (best-effort).

If exact extraction is hard, fall back to:
- navigation definitions (menus/sidebars)
- `Link`/`routerLink` usage
- sitemap-like lists if they exist

## Step 4 — Group routes into feature areas
Group using heuristic layers (in order):
1) explicit feature/module folders (`src/features/*`, `modules/*`, `domain/*`)
2) top-level route segment grouping (`/billing/*`, `/users/*`, etc.)
3) component folder clustering (shared layouts vs leaf pages)
4) naming hints (files, components, API namespaces)

Produce a feature map:
- Feature area name
- Routes included
- Cross-cutting shared components used (header/nav/forms)
- Primary APIs used
- Auth/role hints

## Step 5 — Identify auth entry points + role/permission hints
Collect:
- login/logout URLs or components
- SSO/OIDC hints (e.g., `oidc`, `saml`, `msal`, `auth0`, `keycloak`)
- route guards/middleware (Angular guards, Next middleware, React auth wrappers)
- role checks and permission gates

Output:
- “Auth entry points” table
- “Role/permission hints” list (unknown allowed)

Do NOT request credentials. If runtimeScan is requested, ask for a safe test account provisioning approach (not secrets).

## Step 6 — Testability assessment (static-first)
Produce findings under these categories:

### A) Locator readiness
Assess whether the UI provides stable hooks for automation:
- accessible roles/names (labels, headings, button names)
- presence and consistency of `data-testid` / `data-test` / `data-qa` attributes
- patterns that will be brittle (CSS class selectors, deep DOM)

### B) Data feasibility
Assess ability to create deterministic data:
- seeded data scripts
- fixture support
- API helpers
- admin endpoints for setup/teardown
- multi-tenant constraints

### C) Async / eventual consistency risk zones
Identify:
- websockets, polling, background jobs
- multi-step flows with server-side processing
- delayed UI updates, optimistic updates, caching

### D) Environment constraints
Capture:
- environment access limitations (e.g., branch network restrictions)
- base URLs and config files
- dependencies on external services (payments, mail, LDAP)

### E) Observability hooks (bonus)
Any correlation IDs, logging, debug panels, or test-mode flags that would help diagnose failures.

Each finding must include:
- severity (`blocker | high | medium | low`)
- where it was observed (file path / module)
- recommended remediation (specific and actionable)

## Step 7 — Risk ranking model + scoring
Create a risk model aligned to risk-based testing principles:
- Risk is driven by **impact** and **likelihood**.
- Provide a simple scoring method (1–5 scales) and a combined score (e.g., `impact * likelihood` mapped to 0–100).

Signals (use what you can infer):
- Impact: business critical routes (auth, billing, admin), compliance areas, user-facing core flows
- Likelihood: complexity (wizards, dynamic routes), async behavior, dependency count, feature flags, code churn (if git info available), historically flaky areas (if tests exist)
- Shared components: layout/header/navigation/forms reused across many pages

Produce:
- top 10 highest-risk flows (route or feature)
- risk rationale for each
- suggested test tier: `smoke` vs `release` vs `regression`

## Step 8 — Recommend initial smoke/release Journeys (shortlist)
If `generateJourneyShortlist=true`:
- propose 5–10 Smoke Journeys (must cover auth + global navigation + one critical flow)
- propose 8–20 Release Journeys (broader but still high ROI)
For each Journey suggestion include:
- Title
- Actor
- Scope/feature area
- Tier (smoke/release)
- Routes touched (if known)
- Risk rationale
- Testability notes (data setup, selector readiness)
- Module dependencies (foundation + feature, best-effort)

If Journey system is present (Phase 3 installed) AND `generateJourneyStubs=true`:
- create `journeys/` markdown files using the Core templates with `status: proposed`
- do not mark `implemented` and do not add tests[]
- update generated backlog/index afterwards (if generator wrappers exist)

Default is `generateJourneyStubs=false`.

## Step 9 — Optional runtime scan (if requested AND safe)
If `runtimeScan=true`:
- require `baseUrl=` (or ask once)
- perform a shallow crawl up to `maxDepth` with strict allow/deny lists:
  - never crawl logout/admin destructive actions
  - never submit forms unless explicitly allowed
  - never follow external domains
- gather:
  - discovered routes/links
  - basic page titles/headings
  - presence of stable locators (role/name/testid snapshot)
- reconcile runtime findings with static inventory and mark discrepancies.

If runtime scan is not possible due to environment/network constraints, document that clearly and proceed with static-only discovery.

---

# Mode-based Question Policy (medium by default)

Only ask questions you truly need. Ask them in one compact message.

## QUICK (≤ 3 questions)
1) Which app scope (if multiple frontends)?
2) Any top 3 business-critical flows to prioritize?
3) Any hard blockers already known (auth/data/env)?

## STANDARD (≤ 7 questions)
Quick +:
4) Auth type: login form vs SSO redirect vs both?
5) Test data approach: seeded env / API setup / manual only?
6) Which environments are realistically accessible from your location/network?
7) Any areas to exclude from automated discovery/testing?

## MAX (add up to 8)
Standard +:
- Roles/actors list (admin, standard user, etc.)
- Feature flag system and default states
- Multi-tenant rules and tenant switching method
- Known async/eventual-consistency flows
- Existing monitoring/logging that helps triage failures
- Risk appetite: what “smoke” must cover to gate releases

Provide a reply template in the questions section.

---

# Edge Cases (must handle)
- Repo with **no obvious frontend**: produce a short report explaining why, and suggest next step (API-focused plan).
- Monorepo with **multiple frontends**: generate multi-app sections or ask user to pick scope.
- Router is dynamic or built at runtime: use nav/link heuristics and document limitations.
- Existing E2E tests in Cypress/Selenium: mine them for route hints and selector patterns.
- Highly restricted environments: document constraints and focus on static discovery.

---

# Completion Checklist (print at end)
- [ ] `docs/DISCOVERY.md` created/updated (managed markers)
- [ ] `docs/TESTABILITY.md` created/updated (managed markers)
- [ ] Optional machine outputs created (if enabled)
- [ ] Risk-ranked “Top risk flows” list present
- [ ] Smoke/Release Journey shortlist present (if enabled)
- [ ] Any blockers captured early with remediation actions

