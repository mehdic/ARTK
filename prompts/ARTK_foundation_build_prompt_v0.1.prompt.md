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
Create `playwright.config.(ts|js)` with:
- `testDir` pointing to `tests/`
- `timeout` = timeoutMs
- `expect.timeout` = expectTimeoutMs
- `retries` = CI ? retriesCI : retriesLocal
- `reporter` includes:
  - list/line for console
  - html report to `<harnessRoot>/playwright-report` with `open` controlled by reportOpen
- `outputDir` set to `<harnessRoot>/test-results` (intermediate artifacts)

Important: keep HTML report folder separate from outputDir.

Set `use` defaults:
- baseURL from env loader
- trace: `on-first-retry`
- screenshot: `only-on-failure`
- video: `retain-on-failure`
- `testIdAttribute` from arg/env (default data-testid)

## Step 4 — Auth harness using project dependencies + storageState
Implement Playwright projects as:
- `setup` project:
  - runs `tests/setup/auth.setup.*`
- test projects (chromium/firefox/webkit as requested):
  - depend on `setup`
  - reuse storage state file

Storage state policy:
- write to `<harnessRoot>/playwright/.auth/<env>/<actor>.json`
- NEVER commit this directory (gitignore it)
- if authMode=external:
  - setup project should validate that the storage state file exists and fail with actionable instructions if missing
- if authMode=api:
  - use APIRequestContext to authenticate and write storage state (placeholder; leave TODOs)

Also create `modules/foundation/auth/login.*` that contains a `performLogin(page, actor, env)` placeholder, with TODOs for SSO/login specifics.

## Step 5 — Create baseline fixtures
Create `fixtures/test.ts` using `test.extend()`:
- include fixture that exposes:
  - `artkEnv` (resolved config)
  - `runId` (namespacing)
  - helper `app` wrapper (optional placeholder)
- ensure fixtures do not store secrets in logs.

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
