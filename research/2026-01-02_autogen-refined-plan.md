# ARTK AutoGen Refined Plan (Post-Review)

**Date:** 2026-01-02
**Status:** READY FOR IMPLEMENTATION APPROVAL
**Constraint:** NO MCP (Model Context Protocol)

---

## Executive Summary

This refined plan incorporates OpenAI's review feedback into a concrete implementation roadmap for ARTK's autonomous test generation system.

**Core Principle:** Prompts orchestrate; deterministic code generates.

---

# ARTK AutoGen Core — Solution Specification (Non-MCP)

Version: **v0.1**
Date: **2026-01-02**
Status: **Draft spec for implementation**
Constraint: **No MCP (Model Context Protocol)**

> This document specifies **ARTK AutoGen Core**: the reusable engine that turns **clarified Journeys** into **maintainable Playwright E2E regression tests + modules**, and then **validates, verifies, and (safely) heals** them.
>
> It is written so an engineering team (or Claude) can implement it with minimal ambiguity.

---

## 1) Context and Problem Statement

You have many in-house apps, complex environments, and no dedicated QA. Every change risks regressions because there's no reliable, repeatable pre-prod behavioral check.

ARTK solves this by layering a consistent regression system **on top of GitHub Copilot** (models like GPT-5/Sonnet) and Playwright, using:

- **Journeys**: versioned behavior contracts (human-readable + machine-parseable).
- **Modules**: reusable "page object style" building blocks.
- **Commands/prompts**: slash-command workflows used by developers (Copilot chat) to create, validate, run, and maintain tests.

**AutoGen Core** is the missing engine that makes ARTK scalable: it ensures test generation and maintenance are **deterministic, validated, and resilient**.

---

## 2) Goals and Non-Goals

### 2.1 Goals (what AutoGen Core MUST do)

1. **Generate tests from clarified Journeys**
   - Convert Journey steps + acceptance criteria into Playwright tests using deterministic mapping rules.
   - Create or extend Modules (foundation + feature) as needed.

2. **Enforce guardrails automatically**
   - Validate generated code against ARTK rules (no sleeps, no brittle selectors, correct tagging, correct imports, etc.) using static checks and lint rules.

3. **Verify tests actually work**
   - Run the generated tests for the target Journey(s), collect artifacts, and produce a structured result (pass/fail + evidence).

4. **Heal safely (within strict bounds)**
   - If verification fails, attempt bounded, deterministic fixes (selector fixes, wait strategy fixes, missing awaits).
   - Never "heal" by changing the Journey contract or weakening assertions.

5. **Be installable/upgradable**
   - ARTK Core is versioned once.
   - Each repo installs an instance and can upgrade deterministically.

6. **Be adaptable across repo structures**
   - Detect existing Playwright setups (if present) or attach cleanly to ARTK's foundation harness.
   - Avoid assumptions about frontend framework.

### 2.2 Non-Goals (explicit exclusions to prevent scope creep)

- **MCP-based automation** (explicitly excluded by company policy).
  Example: Playwright "Agents" that depend on MCP are out-of-scope.
- **CI/CD integration** (handled later by separate prompts/phase).
- **Visual regression testing** (screenshots diff, pixel comparisons).
- **API-only testing utilities** (AutoGen may *use* APIs for setup/seed, but it does not become a standalone API test framework).
- **Mobile/native app testing**.

---

## 3) Core Concepts

### 3.1 Journey vs Test (why both exist)
- **Journey** = the **contract** (what the user should be able to do + what "success" means).
  Includes acceptance criteria *and* procedural UI steps.
- **Test** = the **implementation** (Playwright code that proves the Journey contract).

A Journey can change (requirements evolve). Tests must follow. The Journey remains the source of truth.

### 3.2 Modules
- **Foundation Modules**: reusable building blocks across the whole app (auth, navigation, common components, selectors utilities).
- **Feature Modules**: area-specific actions and locators (Invoices, Users, Approvals…).
- Tests call modules; modules own selectors. This mirrors Playwright's page-object guidance: selectors centralized, reuse encouraged.

Playwright explicitly notes page objects simplify maintenance by capturing selectors in one place and creating reusable code.
(Source: Playwright "Page object models" docs.)

### 3.3 "Non-MCP automation" meaning (practically)
AutoGen Core is not an LLM tool-chain. It is deterministic code + templates + validation + bounded healing.

Copilot (LLMs) are used **via prompts** to:
- answer ambiguous mapping questions,
- fill in TODOs,
- extend feature modules,
- interpret local project code conventions,
- reason about business behavior changes.

AutoGen Core provides the rails so Copilot can't "creatively" destroy the framework.

---

## 4) Research Anchors (what this spec is based on)

AutoGen Core aligns with Playwright's official guidance on:

- **Locator strategy**: recommended locators include `getByRole`, `getByText`, `getByLabel`, `getByPlaceholder`, `getByAltText`, `getByTitle`, `getByTestId` (and `getByTestId` can be configured).
- **Web-first assertions**: prefer auto-retrying assertions; for complex retry logic use `expect.poll` / `expect.toPass`.
- **Tracing**: recommended `trace: 'on-first-retry'` in config for CI debugging.
- **Auth setup**: authenticate once in a setup project, reuse storage state (recommended approach for many suites).
- **Tags + grep**: tags must start with `@`, can be in title or `tag:` details, and `--grep` filters by tag.
- **Aria snapshots**: `toMatchAriaSnapshot` and programmatic `locator.ariaSnapshot()` are available for structural validation and debugging.
- **CLI capabilities**: `--grep`, `--repeat-each`, `--fail-on-flaky-tests`, `--last-failed`, `--only-changed`, `--test-list`, and trace modes (including `retain-on-failure` / `on-first-retry`).
- **Artifacts/attachments**: `testInfo.attach()` copies attached files to a reporter-accessible location.
- **Reporting**: multiple reporters at once, including JSON with `outputFile`.

Static enforcement is strengthened by **eslint-plugin-playwright**, which provides rules like `no-wait-for-timeout`, `no-force-option`, `prefer-web-first-assertions`, and `valid-test-tags`.

Repo instruction delivery is aligned with GitHub Copilot's documented support for:
- `.github/copilot-instructions.md` (repo-wide instructions)
- `.github/instructions/*.instructions.md` with `applyTo` frontmatter (path-scoped instructions)

---

## 5) Architecture Overview

### 5.1 High-level component diagram

```mermaid
flowchart LR
  J[Journey markdown<br/>status=clarified] --> P[Parser + Schema Validator]
  P --> IR[Journey IR / Execution Plan]
  IR --> M[Module Planner]
  M --> MG[Module Generator/Updater]
  IR --> TG[Test Generator/Updater]
  TG --> V1[Static Validation<br/>(schema + lint + rules)]
  V1 -->|pass| R[Runtime Verify Runner]
  V1 -->|fail| FIX[Auto-fix (safe)]
  R -->|pass| DONE[Mark implemented<br/>+ update links/index]
  R -->|fail| HEAL[Healing Engine<br/>(bounded)]
  HEAL -->|healed| R
  HEAL -->|blocked| Q[Recommend quarantine/rework]
```

### 5.2 Packaging (Core vs Instance)

**ARTK AutoGen Core (shared, versioned):**
- `@artk/autogen-core` (internal NPM package or vendored core folder)
- generator engine, validators, heal engine, templates, schemas
- reference docs + upgrade notes

**ARTK Instance (repo-local):**
- config files (env, selector policies, module layout)
- wrapper scripts for local execution (no CI yet)
- generated tests/modules
- Copilot instruction files that reference the instance + core rules

---

## 6) Inputs, Outputs, and Contracts

### 6.1 Required Inputs

1. **Journey file (Markdown)**
   - must be `status: clarified`
   - must include: actor, tier, acceptance criteria, procedural steps, completion signals

2. **Repo instance config**
   - `journeys/journeys.config.yml` (Journey ID scheme, tiers, etc.)
   - `artk/autogen.config.yml` (AutoGen-specific settings; defined below)

3. **Foundation harness present** (from Phase 7)
   - `playwright.config.ts`
   - `@artk/core` fixtures/helpers OR equivalent local foundation modules

> AutoGen Core can *detect* if Playwright already exists and adapt, but it still needs a consistent harness to generate tests against.

### 6.2 Outputs (must be deterministic)

For a Journey `JRN-0123`, AutoGen Core generates/updates:

- `tests/journeys/JRN-0123.spec.ts` (or repo-specific testDir)
- `modules/foundation/*` and `modules/features/<scope>/*` as needed
- `modules/registry.json` updated with dependencies
- Journey frontmatter updated:
  - add/update `tests[]` entries
  - add/update `modules[]` dependencies
  - optionally add `verification.lastRun`, `verification.status`

Artifacts after verify/heal:
- `test-results/` (Playwright output dir, configurable)
- `artk/reports/JRN-0123.verify.json` (structured summary)
- `artk/reports/JRN-0123.heal-log.json` (attempt log, if healing occurred)

---

## 7) AutoGen Instance Configuration (repo-local)

File: `artk/autogen.config.yml`

```yaml
version: 1

paths:
  testDir: "tests"
  journeyTestDir: "tests/journeys"
  modulesDir: "tests/modules"
  registryFile: "tests/modules/registry.json"
  reportsDir: "artk/reports"

naming:
  journeyTestFile: "{id}.spec.ts"
  moduleFile: "{scope}.{module}.ts"

selectorPolicy:
  testIdAttribute: "data-testid" # must match Playwright config if customized
  prefer:
    - role
    - label
    - placeholder
    - text
    - testId
    - cssLastResort

generation:
  format: "playwright" # or "bdd" (optional)
  useTestSteps: true
  tagStyle: "detailsObject" # detailsObject | titleTokens
  includeAriaSnapshotsOnFailure: true

validation:
  eslint:
    enabled: true
    configPath: "eslint.config.js"
  forbiddenPatterns:
    - "waitForTimeout"
    - "force: true"
    - "page.click("
  requireTags:
    - "@artk"
    - "@journey"

verify:
  retries: 0
  traceMode: "retain-on-failure" # default local; CI later can use on-first-retry
  repeatEach: 1
  failOnFlaky: true
  workers: 1

heal:
  enabled: true
  maxAttempts: 3
  allowedFixes:
    - "selector-refine"
    - "missing-await"
    - "navigation-wait"
    - "assertion-webfirst"
  forbiddenFixes:
    - "add-sleep"
    - "remove-assertion"
    - "weaken-assertion"
```

---

## 8) Journey Parsing + Canonical Schema (AutoGen-facing)

AutoGen Core consumes the Journey schema from ARTK Core Journeys (Phase 3), but it needs a **strict subset** for generation.

### 8.1 Required frontmatter fields (minimum)

```yaml
id: JRN-0123
title: "User creates an invoice"
status: clarified
tier: release
scope: billing
actor: finance_user
revision: 3
modules:
  foundation: ["auth", "nav"]
  features: ["billing.invoices"]
tests: []
data:
  strategy: seed|create|reuse
  cleanup: required|best-effort|none
completion:
  - type: url
    value: "/invoices"
  - type: toast
    value: "Invoice created"
```

### 8.2 Required body sections (minimum)
- **Acceptance Criteria** (authoritative)
- **Procedural Steps** (implementation guidance)
- **Assertions** (explicit, step-linked if possible)
- **Data/Environment Notes** (what data is required, what assumptions exist)

---

## 9) Intermediate Representation (IR)

AutoGen Core MUST convert Journeys into an IR before generating code.

### 9.1 Why IR exists
- deterministic transformation
- easier validation (every step must map)
- supports multi-format output (Playwright code or BDD)
- supports healing (fix IR mapping, regenerate)

### 9.2 IR shape (example)

```ts
type JourneyPlan = {
  id: string;
  title: string;
  tier: "smoke" | "release" | "regression";
  scope: string;
  actor: string;
  modules: {
    foundation: string[];
    features: string[];
  };
  steps: PlanStep[];
};

type PlanStep = {
  stepId: string;         // e.g. "AC-1.S1"
  type: "navigate" | "click" | "fill" | "assert" | "wait" | "custom";
  target?: LocatorHint;
  value?: string;
  assertion?: AssertionHint;
  notes?: string[];
  sourceText: string;     // original step sentence
};

type LocatorHint = {
  preferred: ("role"|"label"|"text"|"testId"|"css")[];
  role?: string;
  name?: string;
  label?: string;
  text?: string;
  testId?: string;
  css?: string;
  strict?: boolean;
};
```

---

## 10) Step Mapping Engine

### 10.1 Deterministic mapping rules
Mapping rules MUST prioritize Playwright's recommended locators (`getByRole`, `getByText`, `getByLabel`, etc.) and avoid brittle selectors. (See Playwright Locators docs.)

**Examples:**
- "Click button Save" → `page.getByRole('button', { name: 'Save' }).click()`
- "Fill Email with …" → `page.getByLabel('Email').fill(value)`
- "Wait for redirect to /dashboard" → `page.waitForURL(/\/dashboard/)`
- "See text …" → `expect(page.getByText('…')).toBeVisible()`

### 10.2 Handling unknown steps
If a step cannot be deterministically mapped:
- Mark step as `custom` with `TODO` placeholder
- Add a "blocking reason" to the Journey (managed note)
- Still generate code with explicit `throw new Error("ARTK BLOCKED: ...")` behind a config flag
- Or skip test generation until clarified further (configurable)

### 10.3 No sleeps policy
AutoGen Core MUST never generate or "heal" with `page.waitForTimeout()`.
Enforced by:
- eslint-plugin-playwright rule `no-wait-for-timeout`
- explicit forbidden pattern scan

---

## 11) Selector Inference Engine

### 11.1 Priority order (default)
1. `getByRole()` with accessible name
2. `getByLabel()` for form controls
3. `getByPlaceholder()`
4. `getByText()`
5. `getByTestId()` (with configured attribute)
6. `locator(css)` only as last resort, **encapsulated in a module** with "selector debt" marker

This follows Playwright's recommended built-in locators and general locator best practices.

### 11.2 "Selector Debt" recording
When forced to use CSS:
- write locator only inside the **module**, never in test file
- add comment:
  - `// ARTK-SELECTOR-DEBT: request data-testid for <component>`
- also append to `docs/TESTABILITY.md` (if present) or `artk/selector-debt.md`

### 11.3 Aria snapshot assisted inference (optional, during healing)
If a locator fails:
- capture `await locator.ariaSnapshot()` on relevant scope (e.g., `main` or `dialog`)
- use snapshot YAML to infer role/name options
- replace brittle locator with role-based locator when possible

Playwright explicitly supports programmatic aria snapshots via `locator.ariaSnapshot()`, and `toMatchAriaSnapshot()` for snapshot matching.

---

## 12) Test Generation Engine

### 12.1 Output structure
Default:
- One test file per Journey.
- Each acceptance criterion becomes a `test.step()` group (if enabled).

Example skeleton:

```ts
import { test, expect } from "@artk/core/fixtures";
import { nav } from "../modules/foundation/nav";
import { invoices } from "../modules/features/billing/invoices";

test.describe("JRN-0123 User creates an invoice", { tag: ["@artk", "@journey", "@JRN-0123", "@tier-release"] }, () => {
  test("creates an invoice @JRN-0123", async ({ page, runId, testData }) => {
    await test.step("AC-1: User can reach invoice creation", async () => {
      await nav.gotoBilling(page);
      await invoices.openCreate(page);
      await expect(page.getByRole("heading", { name: "Create Invoice" })).toBeVisible();
    });

    await test.step("AC-2: User can submit invoice and see confirmation", async () => {
      const inv = testData.invoice.build({ runId });
      await invoices.fillForm(page, inv);
      await invoices.submit(page);
      await invoices.expectCreatedToast(page);
    });
  });
});
```

### 12.2 Tagging rules
AutoGen Core MUST tag tests using Playwright tag support:
- tags must start with `@`
- can be applied via test details `{ tag: ... }` or title tokens
- tests must include `@JRN-####`, `@tier-*`, and `@scope-*` tags

Playwright supports tags and shows them in reports; `--grep` can filter by them.

### 12.3 Managed sections for idempotent regeneration
Tests and modules will evolve. AutoGen Core MUST be able to re-run generation without destroying human edits.

**Two supported strategies:**

**Strategy A (preferred): AST-based updates**
- Use `ts-morph` to parse TS, modify structures safely, preserve formatting/comments.
- Recommended because you can update imports, blocks, and function bodies without brittle regex.

`ts-morph` recommends calling `project.save()` after manipulation to avoid half-written states.

**Strategy B: "Managed blocks" markers**
- Insert special markers:
  - `// ARTK:BEGIN GENERATED`
  - `// ARTK:END GENERATED`
- AutoGen overwrites only inside these blocks.
- Human custom code must live outside (or inside explicitly "user blocks").

AutoGen Core MUST implement at least one of these; implementing both is ideal.

### 12.4 Formatting
- Always format output (Prettier or equivalent) after generation.
- Lint (eslint-plugin-playwright) to guarantee conformance.

---

## 13) Module Generation and Registry

### 13.1 Module planner behavior
Given a JourneyPlan:
- ensure foundation modules exist (auth, nav, selectors, waits, data)
- ensure feature modules exist per `scope`
- decide whether to scaffold new feature modules or extend existing ones

### 13.2 Module template (feature)
Modules are "page object style" wrappers that:
- provide semantic methods (not raw selectors)
- encapsulate selectors + waits
- return Locators when appropriate

Example:

```ts
export const invoices = {
  openCreate: async (page: Page) => {
    await page.getByRole("button", { name: "Create invoice" }).click();
  },
  fillForm: async (page: Page, inv: InvoiceModel) => {
    await page.getByLabel("Customer").fill(inv.customerName);
    await page.getByLabel("Amount").fill(String(inv.amount));
  },
  submit: async (page: Page) => {
    await page.getByRole("button", { name: "Submit" }).click();
  },
  expectCreatedToast: async (page: Page) => {
    await expect(page.getByText("Invoice created")).toBeVisible();
  },
};
```

### 13.3 Module registry (`modules/registry.json`)
Registry stores:
- all modules (foundation + feature)
- exported methods per module (optional)
- Journey → modules dependency mapping

This powers impact-based retesting later.

---

## 14) Static Validation Engine (AutoGen Gate #1)

### 14.1 Goals
- Ensure generated code follows Playwright + ARTK best practices
- Prevent "green but garbage" tests

### 14.2 Validation layers

**Layer 1: Schema checks**
- Journey is clarified
- required fields exist
- modules referenced exist
- `tests[]` links point to real files

**Layer 2: Forbidden pattern scan**
- `waitForTimeout`
- `{ force: true }`
- raw CSS click patterns
- hardcoded base URLs

**Layer 3: ESLint checks (recommended)**
Use eslint-plugin-playwright rules to enforce:
- `no-wait-for-timeout`
- `no-force-option`
- `prefer-web-first-assertions`
- `valid-test-tags`
- `missing-playwright-await`
…and more.

**Layer 4: Import and structure checks**
- Tests import only from `@artk/core/*` and local modules
- Tests contain tag for Journey ID
- No `test.only`
- No nested `test.step` (eslint rule exists)

### 14.3 Auto-fix behavior
AutoGen Core MAY auto-fix:
- import ordering
- missing `await` (where safe)
- tag formatting (where safe)
- converting non-retrying assertions to web-first equivalents (limited cases)

---

## 15) Runtime Verification Engine (AutoGen Gate #2)

### 15.1 Goals
- Run the generated tests for a Journey, collect evidence, and produce an objective pass/fail.

### 15.2 How verification runs tests
Verification uses Playwright's CLI features:
- `--grep @JRN-0123` or `--test-list`
- `--repeat-each` to detect flakes (optional)
- `--fail-on-flaky-tests` if enabled
- `--trace retain-on-failure` locally; CI later can use `on-first-retry`

Playwright's CLI supports these options and trace modes.

### 15.3 Report outputs
- configure multiple reporters (e.g., `list` + `json` with `outputFile`) for structured results.
- store ARTK's own `verify.json` summary:
  - journeyId
  - pass/fail
  - run metadata
  - artifact paths
  - failure classification (if fail)

### 15.4 Evidence capture
AutoGen Core should:
- rely on Playwright artifacts directory (`--output`)
- attach extra evidence via `testInfo.attach()` where needed (downloads, logs)

Playwright's `testInfo.attach()` copies attachments into reporter-accessible locations.

---

## 16) Healing Engine (bounded, deterministic)

### 16.1 Why healing exists (and its hard limits)
Healing is for:
- selector breakages due to UI refactors
- missing awaits / minor timing mismatches
- navigation/wait strategy issues

Healing must **never**:
- remove assertions
- weaken assertions
- change Journey behavior contract
- introduce sleeps

### 16.2 Failure taxonomy
AutoGen Core should classify failures into:
- **Selector failure** (element not found, strict mode violation, detached)
- **Timing failure** (timeouts waiting for UI state)
- **Navigation failure** (URL mismatch, redirect not complete)
- **Data failure** (seed missing, cleanup conflict)
- **Auth/session failure** (expired state, forbidden)
- **Environment failure** (network zone restriction, server down)

### 16.3 Fix strategies (allowed)
In order:

1. **Missing await**
   - run eslint rule `missing-playwright-await`
   - auto-fix safe cases

2. **Selector refine**
   - replace CSS locator with role/label/testid
   - add `exact: true` when name ambiguity exists
   - use aria snapshot YAML to infer available roles/names if enabled

3. **Navigation wait**
   - add `await page.waitForURL(...)` or `await expect(page).toHaveURL(...)`
   - never use `waitForNavigation()` (eslint discourages it)

4. **Web-first assertion conversion**
   - replace non-retrying assertions where they cause flake
   - Playwright recommends auto-retrying assertions; use `expect.poll` / `expect.toPass` for complex conditions.

### 16.4 Healing loop control
- `maxAttempts` default 3
- each attempt:
  1. apply one fix category
  2. re-run verify for the Journey only
  3. stop on pass
- if fail persists:
  - emit "blocked" summary with recommended action:
    - quarantine (flake)
    - rework journey (intended change)
    - file bug (regression)

### 16.5 Healing attempt log
Write `artk/reports/<journey>.heal-log.json`:

```json
{
  "journeyId": "JRN-0123",
  "attempts": [
    {
      "attempt": 1,
      "failureType": "selector",
      "change": { "file": "tests/modules/features/billing/invoices.ts", "diff": "..." },
      "evidence": ["trace.zip", "ariaSnapshot.yml"],
      "result": "fail"
    }
  ]
}
```

---

## 17) Optional: BDD Output Mode (secondary format)

AutoGen Core MAY support generating:
- `.feature` file(s)
- step definitions
- Playwright-BDD config integration

This is useful if teams want business-readable features. Use `playwright-bdd` as a build-time generator (not MCP-based).

---

## 18) Edge Cases and "Enterprise Pain" Handling

### 18.1 Auth complexity (SSO/MFA)
- Prefer storageState reuse via setup project.
- If MFA cannot be automated, allow "pre-authenticated state file" to be provided by humans securely.
- Core must never embed credentials in generated code.

### 18.2 Region/network restrictions
- Verify runner should detect unreachable baseURL quickly and classify as environment failure, not flaky.
- Do not auto-quarantine for network segmentation; escalate to operator.

### 18.3 Highly dynamic UI
- Encourage stable test hooks (`data-testid`) via selector debt reporting.
- Use aria snapshots for broad structural checks where text changes but structure stable.

### 18.4 Multi-tab, downloads, iframes
- Provide module helpers:
  - `withNewPage`, `expectDownload`, `frameByTitle`, etc.
- Attach downloads via testInfo.attach.

### 18.5 Feature flags / gradual rollout
- Allow Journey frontmatter fields:
  - `flags.required`, `flags.forbidden`
- Verify runner can skip or mark "not applicable" based on flags config.

---

## 19) Interfaces Exposed by AutoGen Core (Implementation Spec)

### 19.1 Library API (recommended)
Expose functions:

```ts
generateJourneyTests(opts: { journeyId: string; configPath?: string }): Promise<GenerateResult>
validateJourney(opts: { journeyId: string }): Promise<ValidateResult>
verifyJourney(opts: { journeyId: string; heal?: boolean }): Promise<VerifyResult>
installAutogenInstance(opts: { rootDir: string }): Promise<void>
upgradeAutogenInstance(opts: { rootDir: string; toVersion: string }): Promise<void>
```

### 19.2 Script entrypoints (repo wrappers)
Repo can define package scripts:

```json
{
  "scripts": {
    "artk:gen": "node ./node_modules/@artk/autogen-core/bin/gen.js",
    "artk:validate": "node ./node_modules/@artk/autogen-core/bin/validate.js",
    "artk:verify": "node ./node_modules/@artk/autogen-core/bin/verify.js"
  }
}
```

### 19.3 CLI wrapper (optional)
If desired:
- `npx artk-autogen gen --journey JRN-0123`
- `npx artk-autogen verify --journey JRN-0123 --heal`

---

## 20) Error Handling and UX Requirements

### 20.1 Principles
- Errors must be actionable and specific.
- "Blocked" must explain:
  - which step could not be mapped
  - what info is missing
  - what to do next (clarify vs request test hooks)

### 20.2 Standard error codes
- `ARTK_E_JOURNEY_SCHEMA_INVALID`
- `ARTK_E_JOURNEY_NOT_CLARIFIED`
- `ARTK_E_MAPPING_BLOCKED`
- `ARTK_E_LINT_FAILED`
- `ARTK_E_VERIFY_FAILED`
- `ARTK_E_ENV_UNREACHABLE`
- `ARTK_E_HEAL_EXHAUSTED`

---

## 21) Versioning, Upgrades, and Compatibility

### 21.1 Versioning model
- Semver for AutoGen Core:
  - Patch: bug fixes, mapping expansions
  - Minor: new mapping types, new validators
  - Major: schema changes, breaking layout changes

### 21.2 Upgrade behavior
- Installer/upgrader must:
  - preserve repo-local config
  - update core scripts/templates safely
  - run a post-upgrade validation

---

## 22) Acceptance Criteria (Definition of Done for v1)

AutoGen Core v1 is "done" when:

1. Given a clarified Journey, AutoGen generates a runnable test + required modules.
2. `/journey-validate` equivalent passes with:
   - zero forbidden patterns
   - eslint-plugin-playwright clean
   - correct tags
3. `/journey-verify` runs the Journey-only test successfully and produces:
   - JSON result file
   - Playwright artifacts on failure
4. Healing can fix common selector breakages without adding sleeps and without changing Journey contracts.
5. Output is deterministic (same inputs, same generated code).
6. Works in repos with:
   - no Playwright yet (foundation harness present)
   - existing Playwright tests (does not break them)

---

## 23) Implementation Roadmap (Engineering)

### Milestone A: Core skeleton
- config loader
- Journey parser + schema validation
- IR definition + step mapper v1
- template-based generation for test + modules
- basic registry updates

### Milestone B: Validation gate
- forbidden pattern scan
- eslint integration with eslint-plugin-playwright
- structured validation report

### Milestone C: Verification gate
- runner wrapper around `npx playwright test`
- JSON reporter parsing + ARTK verify summary output
- evidence capture conventions

### Milestone D: Healing v1
- failure taxonomy
- selector refinement fixes
- navigation wait fixes
- attempt logging
- bounded loop

### Milestone E: Upgrade + docs
- installer/upgrader behavior
- versioned migration notes
- reference docs for mapping rules

---

## 24) Reference Links (primary sources)

> These links are intentionally the "source of truth" for key behaviors used in this spec.

- Playwright Docs: Locators
  https://playwright.dev/docs/locators
- Playwright Docs: Assertions (web-first, expect.poll, expect.toPass)
  https://playwright.dev/docs/test-assertions
- Playwright Docs: Trace viewer (`trace: 'on-first-retry'`)
  https://playwright.dev/docs/trace-viewer
- Playwright Docs: Authentication (setup project + storage state)
  https://playwright.dev/docs/auth
- Playwright Docs: Tags + annotations
  https://playwright.dev/docs/test-annotations
- Playwright Docs: CLI options (`--grep`, `--repeat-each`, `--fail-on-flaky-tests`, trace modes, etc.)
  https://playwright.dev/docs/test-cli
- Playwright Docs: Reporters (multiple reporters + JSON `outputFile`)
  https://playwright.dev/docs/test-reporters
- Playwright Docs: testInfo.attach()
  https://playwright.dev/docs/api/class-testinfo
- Playwright Docs: Page object models
  https://playwright.dev/docs/pom
- Playwright Docs: Aria snapshots (`toMatchAriaSnapshot`, `locator.ariaSnapshot()`)
  https://playwright.dev/docs/aria-snapshots
- eslint-plugin-playwright (rules like no-wait-for-timeout, valid-test-tags, prefer-web-first-assertions)
  https://github.com/mskelton/eslint-plugin-playwright
- GitHub Docs: Repository + path-specific Copilot instructions
  https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions
- ts-morph manipulation docs (AST-based safe updates)
  https://ts-morph.com/manipulation/

---

## 25) Appendix: Suggested default rule-set

### Forbidden in ARTK generated code
- `page.waitForTimeout`
- `{ force: true }`
- raw CSS clicks in test files
- hardcoded baseURL strings (must come from config)

### Required patterns
- role/label/testid locators
- web-first expect assertions
- tags: `@JRN-####`, `@tier-*`, `@scope-*`
- deterministic data namespacing using runId

---

**End of Solution Specification.**

---

## Part 1: Architecture (Detailed Implementation)

### 1.1 New Package: `@artk/core-autogen`

Located at `core/typescript/autogen/` alongside existing `core/typescript/` modules.

```
core/typescript/
  src/                    # Existing @artk/core
    config/
    fixtures/
    auth/
    ...
  autogen/                # NEW: @artk/core-autogen
    src/
      journey/
        parseJourney.ts       # Parse YAML frontmatter + body
        schema.ts             # Zod schema for clarified Journey
        normalize.ts          # Normalize steps to IR
      ir/
        types.ts              # IR primitive types
        builder.ts            # Fluent IR builder
        serialize.ts          # IR → JSON for debugging
      mapping/
        stepMapper.ts         # Natural language → IR
        patterns.ts           # Regex patterns for step parsing
        glossary.ts           # Synonym resolution
      selectors/
        catalog.ts            # Load/query selector catalog
        infer.ts              # Infer selector from step text
        priority.ts           # Role > Label > TestId > CSS
      codegen/
        generateTest.ts       # IR → Playwright test code
        generateModule.ts     # IR → Module functions
        astEdit.ts            # ts-morph for idempotent edits
        templates/
          test.ejs            # Test file template
          module.ejs          # Module file template
      validate/
        journey.ts            # Validate Journey schema
        code.ts               # Validate generated code
        lint.ts               # ESLint integration
      verify/
        runner.ts             # Run Playwright via CLI
        parser.ts             # Parse JSON report
        classifier.ts         # Classify failure type
        evidence.ts           # Capture ARIA snapshot + traces
      heal/
        loop.ts               # Bounded healing loop
        rules.ts              # Allowed/forbidden rules
        fixes/
          selector.ts         # Fix selector issues
          timing.ts           # Fix async issues
          navigation.ts       # Fix nav issues
          data.ts             # Fix data isolation
    package.json
    tsconfig.json
```

### 1.2 Intermediate Representation (IR)

All code generation goes through IR. Prompts never generate Playwright code directly.

```typescript
// ir/types.ts
export type IRPrimitive =
  | { type: 'goto'; url: string; waitForLoad?: boolean }
  | { type: 'click'; locator: LocatorSpec }
  | { type: 'fill'; locator: LocatorSpec; value: ValueSpec }
  | { type: 'select'; locator: LocatorSpec; option: string }
  | { type: 'check'; locator: LocatorSpec }
  | { type: 'uncheck'; locator: LocatorSpec }
  | { type: 'upload'; locator: LocatorSpec; files: string[] }
  | { type: 'press'; key: string }
  | { type: 'hover'; locator: LocatorSpec }
  | { type: 'expectVisible'; locator: LocatorSpec; timeout?: number }
  | { type: 'expectNotVisible'; locator: LocatorSpec }
  | { type: 'expectText'; locator: LocatorSpec; text: string | RegExp }
  | { type: 'expectValue'; locator: LocatorSpec; value: string }
  | { type: 'expectURL'; pattern: string | RegExp }
  | { type: 'expectTitle'; title: string }
  | { type: 'waitForURL'; pattern: string | RegExp }
  | { type: 'waitForResponse'; urlPattern: string }
  | { type: 'waitForToast'; type: 'success' | 'error' | 'info' }
  | { type: 'waitForLoading'; timeout?: number }
  | { type: 'callModule'; module: string; method: string; args?: any[] }
  | { type: 'blocked'; reason: string };

export interface LocatorSpec {
  strategy: 'role' | 'label' | 'text' | 'testid' | 'css';
  value: string;
  options?: {
    name?: string;
    exact?: boolean;
    level?: number;
  };
}

export interface ValueSpec {
  type: 'literal' | 'actor' | 'runId' | 'generated';
  value: string;
}

export interface IRStep {
  id: string;           // AC-1, AC-2, etc.
  description: string;  // Human-readable
  actions: IRPrimitive[];
  assertions: IRPrimitive[];
}

export interface IRJourney {
  id: string;
  title: string;
  tier: 'smoke' | 'release' | 'regression';
  scope: string;
  actor: string;
  tags: string[];
  setup?: IRPrimitive[];
  steps: IRStep[];
  cleanup?: IRPrimitive[];
  moduleDependencies: {
    foundation: string[];
    feature: string[];
  };
}
```

### 1.3 Module-First Generation

**Rule:** Tests do NOT own locators. Modules do.

```typescript
// Generated test (calls modules)
import { test, expect } from '@artk/core/fixtures';
import { dashboard } from '../modules/feature/dashboard';

test('JRN-0001: User views dashboard @JRN-0001 @smoke', async ({
  authenticatedPage,
  runId,
}) => {
  await test.step('AC-1: Navigate to dashboard', async () => {
    await dashboard.navigateTo(authenticatedPage);
    await dashboard.expectLoaded(authenticatedPage);
  });

  await test.step('AC-2: See welcome message', async () => {
    await dashboard.expectWelcomeMessage(authenticatedPage);
  });
});

// Generated module (owns locators)
// modules/feature/dashboard/index.ts
import { Page, expect } from '@playwright/test';

export const dashboard = {
  // Locators (encapsulated)
  locators: {
    heading: (page: Page) => page.getByRole('heading', { name: 'Dashboard', level: 1 }),
    welcome: (page: Page) => page.getByRole('heading', { name: /welcome/i }),
    nav: (page: Page) => page.getByRole('navigation'),
  },

  // Actions
  async navigateTo(page: Page) {
    await page.goto('/dashboard');
  },

  // Assertions
  async expectLoaded(page: Page) {
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(this.locators.heading(page)).toBeVisible();
  },

  async expectWelcomeMessage(page: Page) {
    await expect(this.locators.welcome(page)).toBeVisible();
  },
};
```

---

## Part 2: Selector Catalog

### 2.1 Catalog Structure

```json
// artifacts/selectors.catalog.json
{
  "version": "1.0",
  "generatedAt": "2026-01-02T10:00:00Z",
  "sources": ["testid-scan", "component-library", "existing-tests"],
  "entries": {
    "dashboard": {
      "heading": { "strategy": "role", "role": "heading", "name": "Dashboard", "level": 1 },
      "welcome": { "strategy": "role", "role": "heading", "name": "/welcome/i" },
      "nav": { "strategy": "role", "role": "navigation" },
      "settingsLink": { "strategy": "role", "role": "link", "name": "Settings" }
    },
    "forms": {
      "submitButton": { "strategy": "role", "role": "button", "name": "Submit" },
      "emailField": { "strategy": "label", "label": "Email" },
      "passwordField": { "strategy": "label", "label": "Password" }
    },
    "common": {
      "loadingSpinner": { "strategy": "testid", "testid": "loading-spinner" },
      "toast": { "strategy": "role", "role": "alert" }
    }
  }
}
```

### 2.2 Catalog Generation

Run during `/discover-foundation`:

```bash
npx artk catalog generate --scan-testid --scan-routes --output artifacts/selectors.catalog.json
```

---

## Part 3: Evidence Capture (Non-MCP "Eyes")

### 3.1 ARIA Snapshot Helper

```typescript
// core/autogen/src/verify/evidence.ts
import { Page, TestInfo } from '@playwright/test';

export async function captureEvidence(page: Page, testInfo: TestInfo) {
  // ARIA snapshot - textual representation of UI
  const ariaSnapshot = await page.locator('body').ariaSnapshot();
  await testInfo.attach('aria-snapshot', {
    body: ariaSnapshot,
    contentType: 'text/plain',
  });

  // URL
  await testInfo.attach('url', {
    body: page.url(),
    contentType: 'text/plain',
  });

  // Console errors
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  if (consoleErrors.length > 0) {
    await testInfo.attach('console-errors', {
      body: consoleErrors.join('\n'),
      contentType: 'text/plain',
    });
  }
}
```

### 3.2 Trace Configuration

```typescript
// playwright.config.ts (generated by discover-foundation)
export default defineConfig({
  use: {
    trace: 'on-first-retry',  // Preferred
    // OR: 'retain-on-failure' for local debugging
  },
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/report.json' }],  // For verify/heal loop
  ],
});
```

---

## Part 4: Healing System

### 4.1 Healing Rules

```typescript
// core/autogen/src/heal/rules.ts
export const HEALING_RULES = {
  allowed: [
    'upgrade-selector-to-role',      // CSS → getByRole
    'upgrade-selector-to-label',     // CSS → getByLabel
    'upgrade-selector-to-testid',    // CSS → getByTestId
    'add-explicit-wait',             // Add waitForURL, waitForResponse
    'add-loading-wait',              // Add waitForLoadingComplete
    'add-toast-wait',                // Add expectToast
    'increase-timeout',              // Increase assertion timeout
    'add-url-assertion',             // Add URL check before interaction
    'add-runid-namespace',           // Add data isolation
    'fix-strict-mode',               // Narrow selector for strict mode
  ],
  forbidden: [
    'add-sleep',                     // waitForTimeout NEVER allowed
    'add-force-click',               // force: true NEVER allowed
    'delete-assertion',              // Cannot remove assertions
    'weaken-assertion',              // Cannot make assertions less strict
    'change-journey-text',           // Cannot modify contract
    'use-network-idle',              // networkidle is unreliable
  ],
};
```

### 4.2 Healing Loop

```typescript
// core/autogen/src/heal/loop.ts
export interface HealResult {
  success: boolean;
  attemptsUsed: number;
  fixes: HealFix[];
  finalStatus: 'pass' | 'fail' | 'blocked' | 'flaky';
  evidence?: {
    traces: string[];
    ariaSnapshots: string[];
    report: string;
  };
}

export async function healLoop(
  journeyId: string,
  options: {
    maxAttempts: number;  // 1=quick, 2=standard, 3=max
    mode: 'quick' | 'standard' | 'max';
  }
): Promise<HealResult> {
  const fixes: HealFix[] = [];
  let attempts = 0;

  while (attempts < options.maxAttempts) {
    attempts++;

    // 1. Run tests
    const result = await runPlaywright(journeyId);

    if (result.status === 'pass') {
      // 2. Stability gate (except quick mode)
      if (options.mode !== 'quick') {
        const stable = await runStabilityGate(journeyId);
        if (!stable) {
          return { success: false, attemptsUsed: attempts, fixes, finalStatus: 'flaky' };
        }
      }
      return { success: true, attemptsUsed: attempts, fixes, finalStatus: 'pass' };
    }

    // 3. Classify failure
    const failure = await classifyFailure(result);

    // 4. Check if blocked
    if (failure.category === 'ENV' || failure.category === 'APP_BUG') {
      return {
        success: false,
        attemptsUsed: attempts,
        fixes,
        finalStatus: 'blocked',
        evidence: result.evidence,
      };
    }

    // 5. Attempt heal
    const fix = await attemptFix(failure);
    if (!fix) {
      return { success: false, attemptsUsed: attempts, fixes, finalStatus: 'blocked' };
    }

    fixes.push(fix);
    await applyFix(fix);
  }

  return { success: false, attemptsUsed: attempts, fixes, finalStatus: 'fail' };
}
```

---

## Part 5: Journey Format Extension

### 5.1 Machine Hints in Clarified Journeys

```yaml
---
id: JRN-0001
title: User can view dashboard
status: clarified
tier: smoke
scope: dashboard
actor: standard_user
modules:
  foundation: [auth, navigation]
  feature: [dashboard]
---

## Acceptance Criteria

### AC-1: User navigates to dashboard
- Navigate to /dashboard
- See heading "Dashboard" (role=heading, level=1)
- URL contains "/dashboard"

### AC-2: User sees welcome message
- See "Welcome" heading (role=heading, name=/welcome/i)

### AC-3: Navigation is available
- See navigation menu (role=navigation)
- See "Settings" link (role=link)
```

### 5.2 Glossary Configuration

```yaml
# journeys/journeys.config.yml
glossary:
  synonyms:
    "log in": auth.login
    "sign in": auth.login
    "logout": auth.logout
    "sign out": auth.logout
  labelAliases:
    "Submit": ["Submit", "Save", "Continue", "Confirm"]
    "Cancel": ["Cancel", "Close", "Dismiss"]
  defaultLocatorPreference: role  # role | testid | label
  testIdAttribute: data-testid    # or data-qa, data-test, etc.
```

---

## Part 6: Prompt Updates

### 6.1 New Instruction File

Create `.github/instructions/artk-autogen.instructions.md`:

```markdown
---
applyTo: "artk-e2e/**/*.ts"
---

# ARTK AutoGen Rules

## Code Generation
- ALL code generation goes through IR (Intermediate Representation)
- Prompts NEVER write Playwright code directly
- Tests call modules; modules own locators

## Selector Priority
1. getByRole() - highest priority
2. getByLabel() - for form fields
3. getByText() - for content
4. getByTestId() - when role/label unavailable
5. CSS/XPath - LAST RESORT, must be in module with TODO

## Forbidden Patterns
- waitForTimeout() - NEVER
- force: true - NEVER
- networkidle - NEVER
- Direct @playwright/test imports in tests

## Healing Rules
- Can: upgrade selectors, add waits, add data isolation
- Cannot: delete assertions, weaken AC, add sleeps
```

### 6.2 Prompt Updates Summary

| Prompt | Updates |
|--------|---------|
| `/discover-foundation` | Add catalog generation, eslint setup, ARIA helper |
| `/journey-implement` | Orchestrate: generate → validate → verify → heal |
| `/journey-validate` | Add lint checks, AC→step mapping, module registry |
| `/journey-verify` | Add ARIA capture, JSON parsing, heal loop integration |

---

## Part 7: Implementation Phases

### Phase 1: IR + Step Mapping (Week 1)
- [ ] Create `core/typescript/autogen/` structure
- [ ] Implement IR types and builder
- [ ] Implement step mapper (text → IR)
- [ ] Implement glossary loader
- [ ] Add tests for mapping

### Phase 2: Codegen + Modules (Week 2)
- [ ] Implement module generator
- [ ] Implement test generator (IR → code)
- [ ] Implement AST-based editing (ts-morph)
- [ ] Add templates
- [ ] Add tests for codegen

### Phase 3: Selector Catalog (Week 3)
- [ ] Implement catalog schema
- [ ] Implement testid scanner
- [ ] Implement catalog querying
- [ ] Add catalog generation to `/discover-foundation`

### Phase 4: Verify + Heal (Week 4)
- [ ] Implement Playwright runner wrapper
- [ ] Implement JSON report parser
- [ ] Implement failure classifier
- [ ] Implement ARIA snapshot capture
- [ ] Implement healing loop with rules
- [ ] Add tests for verify/heal

### Phase 5: Prompt Integration (Week 5)
- [ ] Update `/discover-foundation` prompt
- [ ] Update `/journey-implement` prompt
- [ ] Update `/journey-validate` prompt
- [ ] Update `/journey-verify` prompt
- [ ] Create `.github/instructions/artk-autogen.instructions.md`

### Phase 6: Testing + Documentation (Week 6)
- [ ] End-to-end testing on ITSS project
- [ ] Update PLAYBOOK.md with autogen section
- [ ] Update CLAUDE.md with autogen commands
- [ ] Create migration guide for existing tests

---

## Success Criteria

### Generation Quality
- [ ] 90%+ of clarified Journey steps map to valid IR
- [ ] Generated tests pass `/journey-validate` on first run
- [ ] Selectors use role/label in 80%+ of cases
- [ ] Zero `waitForTimeout()` in generated code

### Healing Effectiveness
- [ ] Healing loop fixes 70%+ of selector issues
- [ ] Healing never introduces forbidden patterns
- [ ] All healing attempts logged with evidence
- [ ] Blocked issues have clear remediation steps

### Stability
- [ ] Generated tests pass stability gate (repeat-each=2)
- [ ] Flaky tests detected and quarantined
- [ ] No regression in existing test suites

---

## References

- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [ARIA Snapshots](https://playwright.dev/docs/aria-snapshots)
- [eslint-plugin-playwright](https://github.com/playwright-community/eslint-plugin-playwright)
- [ts-morph](https://ts-morph.com/) - TypeScript AST manipulation
- OpenAI Review: `research/2026-01-02_openai-review-autogen-plan.md`
