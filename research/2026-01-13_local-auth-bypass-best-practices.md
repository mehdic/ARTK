# Handling “Local Auth Bypass” in ARTK (Best Practices)

## Context
Some target applications implement a **development-only mode** where authentication is **skipped on local machines** (e.g., `localhost`, `NODE_ENV=development`, `AUTH_DISABLED=true`). This can speed up local development, but it can also create **false confidence** in E2E results if the ARTK suite silently stops exercising:

- login/session establishment
- authorization boundaries (protected routes)
- role-based access control (RBAC)
- token/cookie/session expiry behavior

The goal is to support fast local runs **without** losing production-relevant coverage in CI.

---

## Recommended Policy (High Level)

### 1) Do not rely on bypass for “quality gates”
Treat local-auth-bypass as a *developer convenience*, not a correctness signal.

- ✅ OK: use bypass for local smoke runs and rapid iteration
- ❌ Not OK: use bypass as the only environment for regression/CI acceptance

### 2) Make auth requirements **explicit per environment**
Avoid “auto-detect whether login is needed” as a default because it can mask misconfiguration (e.g., auth accidentally disabled in staging).

Recommended model:
- `local`: auth may be bypassed (explicitly documented)
- `staging`/`prod-like`: auth required (real IdP / real roles)

### 3) Split auth concerns from business-flow concerns
Best practice is **not** “login inside every test”.

Instead:
- **Auth setup** runs once per role (storageState provisioning)
- Most journeys start from an **already-authenticated page**
- A small, explicit set of tests cover:
  - login works
  - logout works
  - unauthenticated users are blocked (redirect/401)
  - role-based access boundaries (admin vs user)

### 4) If bypass exists, prefer “dev auth with roles” over “no auth”
If the application team can change the dev mode, the best long-term design is:
- Dev mode uses a **mock identity** (or local token issuer) that still enforces **authorization**
- You can switch roles deterministically (e.g., `DEV_USER_ROLE=admin|user`)

This preserves the ability to validate RBAC locally while still avoiding the external IdP.

---

## What This Means for ARTK Test Suites

### A) Test taxonomy (practical)
Adopt a simple tagging scheme (Playwright `@tags`):
- `@public`: no auth expected (landing, marketing pages, help pages)
- `@auth`: login/logout/redirect behavior (should run only where auth is enabled)
- `@rbac`: role boundary tests (should run only where role simulation is real)
- `@journey`: business flows (mostly uses `authenticatedPage`)

Then define a policy per environment:
- `local (bypass, identityless)`: run `@public` + `@journey`, skip `@auth` + `@rbac`
- `local (bypass, mock identity)`: run `@public` + `@journey` + `@rbac` (if roles are real and switchable), usually still skip `@auth`
- `staging (real auth)`: run everything

### B) One-switch control (what “enable/disable in all tests at once” should mean)
Use a **single “auth policy” switch** at the runner level, not scattered `if`s in every test.

Two common patterns:
1) **Project selection**: run only the unauthenticated Playwright project locally.
2) **Tag-based selection**: run `--grep` / `--grep-invert` by environment.

ARTK already leans toward (1) because the harness creates:
- a base browser project with no storageState (good for bypass)
- role projects that depend on auth setup + storageState (good for real auth)

### C) Two bypass cases (must handle both)

#### Case 1 — “Auth bypass” with **no identity / no role**
Typical symptoms:
- there is no login UI at all locally, or it’s inert
- the UI does not show a user identity (no username/avatar/claims)
- protected routes are simply accessible (no redirect/401)
- admin-only areas are accessible to everyone (RBAC effectively off)

ARTK implications:
- You can still validate **business-flow correctness** (navigation, forms, tables, CRUD flows).
- You cannot validate **authn/authz correctness** (login, redirect, session expiry, RBAC).
- Treat any “access succeeded” in local as *not evidence* that RBAC is correct.

Recommended approach:
- Local: run `@public` + `@journey` only (fast iteration).
- Staging/CI: run `@auth` + `@rbac` (this becomes your gate).
- Add one explicit staging-only “sentinel” test: unauthenticated access to a known-protected route must redirect/401.

#### Case 2 — “Auth bypass” with a **mock identity / role simulation**
Typical symptoms:
- local dev mode injects a user (e.g., a dev JWT, a fixed cookie, a mock IdP)
- the app still enforces RBAC (admin pages actually block non-admin)
- you can switch identity/role deterministically (env var, query param, header, toggle UI)

ARTK implications:
- You can test `@rbac` locally **if** role switching is deterministic and RBAC is genuinely enforced.
- You still usually should not test the real login redirect flow locally (that belongs to staging where the real IdP exists), unless the app also provides a local login form.

Recommended approach:
- Local: run `@journey` + `@rbac` using the mock-role mechanism.
- Staging/CI: still run `@auth` + `@rbac` against the real auth system (to avoid “works only in mock mode”).

Practical runner patterns for role simulation:
- One role per run: `DEV_USER_ROLE=admin npx playwright test --grep @rbac`
- One suite per role: run the suite twice with different role env vars
- If roles are encoded in storageState (cookie/localStorage), provision one storageState per role via a tiny setup step that just “selects role” and saves state (no real credentials).

---

## Environment Inventory + Planning (What to Identify First)

### 1) Enumerate environments from ARTK config
ARTK already has a first-class environment concept (`ARTK_ENV` + `config.environments`).

For each configured environment key (e.g., `local`, `dev`, `staging`, `prod`), record:
- base URL (and whether it’s reachable from the runner region)
- auth mode classification:
  - `required` (real IdP / real login)
  - `bypassed-identityless`
  - `bypassed-mock-identity`
  - `unknown` (needs confirmation)
- role fidelity:
  - `real` (RBAC enforced)
  - `none` (everything accessible)
  - `unknown`
- test policy:
  - which tags/projects run here (`@auth`, `@rbac`, etc.)
  - which credentials are required here (real secrets vs none)

### 2) Find the “toggle” for bypass/role simulation (static scan first)
Common places to detect this without running the app:
- `.env*` files, `docker-compose.yml`, Helm values, Spring `application-*.yml`
- frontend build-time flags (`VITE_*`, `NEXT_PUBLIC_*`, `REACT_APP_*`)
- auth middleware/guards (`if (isLocalhost) return next()`)
- dev-only auth modules (`mockAuth`, `devAuth`, `authDisabled`)

If static scan can’t confirm, do a minimal runtime probe (optional):
- hit a known protected route and observe redirect vs success
- check whether a “current user” endpoint returns claims/roles

### 3) Plan a per-environment test matrix
Example matrix:
- `local`: bypassed-mock-identity → run `@journey` + `@rbac`, skip `@auth`
- `staging`: required → run `@journey` + `@rbac` + `@auth`

This matrix is what you want ARTK prompts to output into docs (so teams don’t guess).

---

## ARTK-Specific Hooks (Current Repo Reality)

### Existing behavior that matters
- The harness builds auth setup projects and role projects in `core/typescript/harness/playwright.config.base.ts`.
- Auth pages are provided via fixtures in `core/typescript/fixtures/auth.ts` (they will warn if storage state is missing).
- Config loading validates that credential env vars exist unless you opt out via `skipCredentialsValidation` in `core/typescript/config/loader.ts`.

### What breaks first in “local bypass” mode
- If you run *all* Playwright projects, the role projects may trigger auth setup (and require credentials) even though the app bypasses auth.
- If credentials aren’t set, config loading can fail early due to credential validation.

### Lowest-effort operational workaround (no code changes)
- Local: run only the unauthenticated browser project (no auth setup).
- CI/staging: run the full matrix (setup + role projects) with real credentials.

---

## “Which prompt should we modify?”

If you want ARTK to *recognize and document* local-auth-bypass, the main prompt is:
- `prompts/artk.discover-foundation.md`:
  - **Step D0** should enumerate `config.environments` (or other env sources) and output an explicit env matrix to plan test policy.
  - **Step D5** (Identify auth entry points) should also detect “dev bypass” signals (env flags, host checks).
  - **Step D6.D** (Environment constraints) should explicitly record “local bypass” as a constraint + coverage impact.
  - **Step F4** (Auth harness) should emit guidance for running locally without auth (e.g., project/tag selection).

If you want ARTK to *capture it early* during installation/config scaffolding, also adjust:
- `prompts/artk.init-playbook.md`:
  - Extend the auth questionnaire beyond `none` to include:
    - “auth required in staging/prod but bypassed in local?” (yes/no)
    - “what’s the toggle?” (env var / config key / hostname rule)

If you want generated tests to remain stable across environments, consider aligning:
- `prompts/artk.journey-implement.md`:
  - Ensure journeys use `authenticatedPage` for semantics, but document how it behaves when auth is bypassed (so authors don’t hand-roll login steps).

---

## Best Interaction Model (How ARTK should behave)

### 1) Document a capability matrix
In discovery/playbook docs, record per environment:
- baseUrl
- auth required? (`required | bypassed | unknown`)
- how roles are represented (real RBAC vs “everyone is admin”)
- how to run tests (projects/tags)

### 2) Enforce “don’t accidentally ship bypass”
Add at least one CI-only check (policy, not necessarily code-level):
- unauthenticated access to a protected route must redirect/401 in staging/prod-like env

### 3) Keep test code clean
Avoid sprinkling `if (local) skip login` inside every test.
Prefer a single centralized mechanism:
- Playwright project selection and/or
- a single auth-mode flag read by the harness/fixtures

---

## Recommendation (Answering the Original Questions)

- **Include auth in all tests?** No. Use storageState + fixtures so most journeys start authenticated, and keep a small set of explicit `@auth/@rbac` tests.
- **Skip auth completely?** Only for local convenience runs, and only if you also run auth-required suites in staging/CI.
- **One flag to enable/disable?** Yes. Prefer runner-level control (Playwright project selection + tags) rather than per-test conditionals.
- **Which prompt to change?** Primarily `prompts/artk.discover-foundation.md` (D5/D6/F4); secondarily `prompts/artk.init-playbook.md` (capture the bypass explicitly); optionally `prompts/artk.journey-implement.md` (keep generated tests consistent).
