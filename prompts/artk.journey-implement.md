---
name: journey-implement
description: "Phase 8: Turn a clarified Journey into stable Playwright tests + modules using the Phase 7 harness. Includes post-implementation quality gates: /journey-validate (static) and /journey-verify (run + stabilize). Updates Journey status/tests links, module registry, backlog/index."
argument-hint: "mode=standard|quick|max artkRoot=<path> id=<JRN-0001> file=<path> harnessRoot=e2e tier=auto|smoke|release|regression testFileStrategy=per-journey|groupedByScope splitStrategy=auto|single|multi createFeatureModules=auto|true|false updateModulesRegistry=true|false useDiscovery=auto|true|false strictGates=true|false allowNonClarified=false|true allowBlocked=false|true authActor=auto|<role> multiActor=auto|true|false artifacts=inherit|minimal|standard|max redactPII=auto|true|false flakyBudget=low|medium|high postValidate=auto|true|false validateMode=quick|standard|max postVerify=auto|true|false verifyMode=quick|standard|max heal=auto|off healAttempts=2 repeatGate=auto|0|2|3 failOnFlaky=auto|true|false dryRun=true|false"
agent: agent
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

# ARTK /journey-implement — Implement Journey as Playwright Tests (Phase 8)

You are running **ARTK Phase 8**.

ARTK plugs into GitHub Copilot to help teams build and maintain **complete automated regression testing suites** for existing applications. Phase 8 turns a Journey contract into real Playwright tests that are stable, traceable, and consistent with the harness.

This command must:
1) Convert a Journey (preferably `status: clarified`) into Playwright tests that follow the Phase 7 harness conventions.
2) Create/extend **feature modules** only when needed (foundation modules are reused).
3) Run **quality gates**:
   - `/journey-validate` (static rules + traceability)
   - `/journey-verify` (actually run + stabilize tests)
4) Only then: update the Journey system of record (status + tests links), update module registry, regenerate backlog/index.

---

## Research-backed design principles (do not violate)
These are not “style preferences”. They are how you avoid flaky, unreadable E2E suites:

- **Use Playwright locators + auto-wait**. Prefer user-facing attributes and explicit contracts (role/name/label/test id).
- **Use web-first assertions** that wait and retry; for complex async, use `expect.poll` or `expect.toPass` instead of sleeps.
- **Keep tests isolated**. Each test should be independently runnable and not depend on previous tests.
- **Auth must reuse storageState** created by the setup project and stored in an ignored directory; never commit it.
- **Use tags** (`@JRN-####`, `@smoke/@release/@regression`, `@scope-*`) so teams can filter runs via `--grep`.
- **Collect traces smartly**. Prefer traces retained on failure (and first-failure tracing where supported) rather than capturing everything always.

(These align with official Playwright capabilities: CLI filtering, retries, tracing, and tags.)

---

# Non‑Negotiables
- **No secrets**: never embed passwords/tokens. Ask for provisioning process only.
- **No hardcoded URLs**: always rely on Phase 7 env/config loader + baseURL.
- **Idempotent**: reruns should update managed blocks and avoid duplicates.
- **Traceability is mandatory**:
  - every test includes `@JRN-####`
  - Journey `tests[]` links to test paths
- **No “flakiness fixes” using sleeps**. `page.waitForTimeout()` is forbidden except as last resort with justification + TODO.
- **Respect strict gates** by default (`strictGates=true`):
  - if selectors/data/env are blocked, do not “pretend-implement” the Journey.
- **Status rule (important)**:
  - You may create test code before verification,
  - but you may set Journey `status: implemented` **only after**:
    1) `/journey-validate` passes, and
    2) `/journey-verify` passes (tests run green + stability gate),
    3) `tests[]` is non-empty and points to real files.

---

# Inputs
User must identify a Journey by:
- `id=JRN-####` (preferred) OR
- `file=journeys/.../*.md`

Key args:
- `mode`: quick | standard | max (default: standard)
- `harnessRoot`: default `e2e`
- `tier`: auto | smoke | release | regression (default auto = Journey tier)
- `testFileStrategy`: per-journey | groupedByScope (default per-journey)
- `splitStrategy`: auto | single | multi
- `useDiscovery`: auto|true|false (default auto)
- `strictGates`: true|false (default true)
- `allowNonClarified`: default false
- `allowBlocked`: default false
- `postValidate`: auto|true|false (default auto)
- `validateMode`: quick|standard|max (default standard)
- `postVerify`: auto|true|false (default auto)
- `verifyMode`: quick|standard|max (default standard)
- `heal`: auto|off (default auto)
- `healAttempts`: default 2 (standard)
- `repeatGate`: auto|0|2|3 (default auto = 2 in standard, 0 in quick, 3 in max)
- `failOnFlaky`: auto|true|false (default auto = true in standard/max, false in quick)
- `dryRun`: true|false (default false)

---

# Preconditions (must validate before writing code)
1) ARTK Journey system exists (`journeys/`, config, backlog/index).
2) Phase 7 harness exists:
   - `<ARTK_ROOT>/<harnessRoot>/playwright.config.*`
   - `<harnessRoot>/fixtures/test.*` (or equivalent base test)
   - `<harnessRoot>/modules/foundation/*`
3) Journey should be `status: clarified` unless `allowNonClarified=true`.
4) If Journey has blockers and `allowBlocked=false`: STOP and explain remediation (selectors/data/env).

If any prerequisite is missing, print the exact command to run next and stop.

---

# Outputs (must produce)

## A) Test implementation
- Create/modify test file(s) under:
  - `<harnessRoot>/tests/<tier>/`

Default naming:
- per-journey: `<harnessRoot>/tests/<tier>/<JRN-ID>__<slug>.spec.(ts|js)`
- groupedByScope: `<harnessRoot>/tests/<tier>/<scope>.journeys.spec.(ts|js)` (append new describe block)

## B) Feature modules (if needed)
- Under `<harnessRoot>/modules/feature/<scope>/`
- Only create if required by Journey dependencies and missing (or `createFeatureModules=true`).

## C) Quality gates (post steps)
- Run (or instruct the user to run) `/journey-validate`
- Run (or instruct) `/journey-verify` with bounded healing loop

## D) Update Journey + system of record (only after gates pass)
- Add test links to Journey frontmatter `tests[]`
- Set `status: implemented` ONLY when valid and verified
- Add/update managed implementation + verification blocks
- Regenerate:
  - `journeys/BACKLOG.md`
  - `journeys/index.json`

## E) Update module registry (recommended)
- Update `<harnessRoot>/modules/registry.json`:
  - add any new feature modules
  - update `journeyDependencies[JRN-####] = { foundation:[...], feature:[...] }`

---

# Required assistant output structure (always follow)
When executing this command, structure your response like this:

1) **Detected Context**
2) **Implementation Plan**
3) **Questions (if needed)**
4) **Changes Applied**
5) **Validation + Verification**
6) **How to Run + Debug**
7) **Blockers / Follow-ups**

If `dryRun=true`, output sections 1–3 only.

---

# Implementation Algorithm (extended, do in order)

## Step 0 — Locate ARTK_ROOT and detect harness language
- Find `ARTK_ROOT` from `artk.config.yml` or `artkRoot=`.
- Determine harness root (`harnessRoot`).
- Detect TS vs JS from existing config and fixtures.
- Detect existing module registry and existing tests.

## Step 1 — Load Journey and validate readiness
Parse Journey YAML frontmatter (must minimally include):
- `id`, `title`, `status`, `tier`, `actor`, `scope`
- `modules.foundation[]`, `modules.feature[]` (best effort)
- `tests[]` (may be empty)

Extract from body (best effort):
- acceptance criteria (declarative)
- procedural steps (UI walkthrough)
- data strategy + cleanup expectations
- async completion signals
- compliance constraints (PII/artifacts)

If the Journey is not clarified:
- If `allowNonClarified=false`: stop and instruct `/journey-clarify id=...`
- If `allowNonClarified=true`: generate a **skeleton implementation** but mark tests skipped until clarification is complete. Do not mark Journey implemented.

## Step 2 — Pull discovery/testability signals (recommended)
If `useDiscovery=auto` and Phase 4 outputs exist, load:
- `docs/TESTABILITY.md` and/or `docs/DISCOVERY.md`
Use them to:
- confirm selectors strategy availability (roles/test ids)
- identify known async “risk zones”
- identify environment constraints
- map scope/routes to modules

Do not invent facts.

## Step 3 — Strict gates and blocker resolution
If `strictGates=true`, enforce these gates:
- **Selector gate**: critical controls must be reliably locatable.
- **Data gate**: deterministic data setup must be feasible.
- **Environment gate**: baseURL/env must be reachable.

If any gate fails:
- If `allowBlocked=false`: stop, add a blocker note to the Journey (managed block), and print remediation steps.
- If `allowBlocked=true`: create skipped tests with clear reasons, but do NOT set Journey implemented.

## Step 4 — Determine test plan (single vs split)
Decide test shape based on `splitStrategy` and `flakyBudget`.

Default:
- one Journey = one main test unless splitting improves reliability.

Splitting is allowed when:
- multiple independent outcomes exist, OR
- long flows have multiple hard boundaries, OR
- multi-actor workflows require clarity, OR
- `flakyBudget=low` (be conservative).

## Step 5 — Decide file placement and naming (idempotent)
- Determine test file path based on strategy.
- Search existing tests for `@JRN-####`:
  - If found, update instead of creating a new one.
- If duplicates exist, pick the most canonical and flag others for cleanup.

## Step 6 — Module plan (foundation + feature)
### 6.1 Verify foundation modules exist
Ensure equivalents exist for:
- auth
- navigation
- selectors/locators
- data/run-id/builders

If missing: stop and instruct `/foundation-build`.

### 6.2 Feature modules
Create missing feature modules only when needed.
Keep modules small and composable. No mega-POMs.

## Step 7 — Implement selector strategy (resilience rules)
1) Prefer `getByRole` with name.
2) Else `getByLabel`, `getByPlaceholder`.
3) Else `byTestId` helper.
4) CSS/XPath only as last resort with justification and encapsulation.

Never:
- rely on auto-generated class names
- use brittle `nth()` without strong reason

## Step 8 — Implement waiting/async strategy (no sleeps)
- Use Playwright auto-wait.
- For navigation, assert completion with URL/title/heading.
- For background jobs: `expect.poll` / `expect.toPass` with bounded timeouts.
- Avoid `networkidle` unless you know it helps.
- `page.waitForTimeout()` is forbidden except as last resort with TODO.

## Step 9 — Implement data strategy (setup + cleanup)
- Prefer API seed helpers if available.
- Namespace all created data using `runId`.
- Cleanup if feasible; otherwise ensure namespacing and document.

## Step 9.5 — Use AutoGen Core for Test Generation (Recommended)

**PREFERRED: Use `@artk/core-autogen` for deterministic test generation**

Instead of manually writing tests, use the AutoGen Core engine to generate tests from the clarified Journey:

```typescript
import { generateJourneyTests } from '@artk/core-autogen';

// Generate tests from a clarified Journey
const result = await generateJourneyTests({
  journeyPath: 'journeys/JRN-0001-user-login.md',
  outputDir: 'e2e/tests/smoke/',
  options: {
    // Use machine hints from Journey if present
    respectHints: true,
    // Generate feature modules if needed
    generateModules: true,
    // Use selector catalog for stable selectors
    useCatalog: true,
  },
});

console.log('Generated files:', result.files);
console.log('Mapping stats:', result.stats);
```

**AutoGen Core Benefits:**
- Deterministic mapping from Journey steps to Playwright primitives
- Automatic selector priority (role > label > testid > CSS)
- Machine hint support for explicit locator overrides
- Blocked step tracking with improvement suggestions
- Module generation for shared flows

**When to use manual implementation:**
- AutoGen cannot map a step (blocked)
- Complex async flows need custom polling
- Multi-actor coordination requires custom setup
- Journey has domain-specific logic not in glossary

If AutoGen generates blocked steps, either:
1. Add machine hints to the Journey: `(role=button, testid=submit-btn)`
2. Update the glossary with new synonyms
3. Implement manually as fallback

## Step 10 — Write the test(s)

**CRITICAL: Import from ARTK Core Fixtures**

```typescript
// tests/<tier>/<JRN-ID>__<slug>.spec.ts
import { test, expect } from '@artk/core/fixtures';

test.describe('JRN-0001: User can view dashboard @JRN-0001 @smoke @scope-dashboard', () => {
  test('should display user dashboard with navigation @JRN-0001', async ({
    authenticatedPage,
    config,
    runId,
    testData,
  }) => {
    // Use core fixtures - NO custom fixture setup needed
    // authenticatedPage: Already authenticated as default role
    // config: ARTK configuration
    // runId: Unique test run ID
    // testData: Cleanup manager

    await test.step('Navigate to dashboard', async () => {
      await authenticatedPage.goto('/dashboard');
      await expect(authenticatedPage.locator('h1')).toContainText('Dashboard');
    });

    await test.step('AC-1: User sees welcome message', async () => {
      const welcome = authenticatedPage.getByRole('heading', { name: /welcome/i });
      await expect(welcome).toBeVisible();
    });

    await test.step('AC-2: Navigation menu is available', async () => {
      const nav = authenticatedPage.getByRole('navigation');
      await expect(nav).toBeVisible();
    });
  });
});
```

**Core Fixture Usage:**
- `authenticatedPage`: Pre-authenticated page (default role from config)
- `adminPage`, `userPage`: Role-specific authenticated pages
- `config`: Full ARTK configuration
- `runId`: Unique test run identifier (for data namespacing)
- `testData`: Cleanup manager (register cleanup callbacks)
- `apiContext`: Authenticated API request context

**Use Core Locator Utilities:**
```typescript
import { byTestId } from '@artk/core/locators';

// Prefer role/label locators from Playwright
const button = page.getByRole('button', { name: 'Submit' });

// Use core helpers when needed
const customElement = byTestId(page, 'custom-widget');
await expect(customElement).toBeVisible({ timeout: 5000 });
```

**Use Core Assertions:**
```typescript
import {
  expectToast,
  waitForLoadingComplete,
  expectFormValid,
} from '@artk/core/assertions';

await test.step('AC-3: Success toast appears', async () => {
  await expectToast(authenticatedPage, {
    message: 'Saved successfully',
    type: 'success',
  });
});

await test.step('Wait for data to load', async () => {
  await waitForLoadingComplete(authenticatedPage, {
    indicator: '[data-loading]',
    timeout: 10000,
  });
});
```

Tagging (mandatory):
- `@JRN-####`
- `@smoke` / `@release` / `@regression`
- `@scope-<scope>`

Assertions mapping:
- Map each acceptance criterion to at least one assertion.
- Prefer user-visible assertions.
- No sleeps - use core assertions for async completion.

## Step 11 — Update Journey draft links (pre-gate)
Before running gates, you may:
- add the new test path(s) to Journey `tests[]` (so verify can find them)
- add a managed “implementation draft” block

Do NOT set `status: implemented` yet.

## Step 12 — Update module registry draft (optional)
If `updateModulesRegistry=true`, update registry with new modules and journeyDependencies.

## Step 13 — Run /journey-validate (static gates)
If `postValidate=auto|true`:
- Execute `/journey-validate id=<JRN-####> harnessRoot=<harnessRoot> mode=<validateMode> strict=true`
- If it fails:
  - fix violations (tags/imports/forbidden patterns)
  - re-run validate
If you cannot execute commands here:
- output the exact `/journey-validate ...` invocation as the next step and stop before claiming success.

## Step 14 — Run /journey-verify (run + stabilize)
If `postVerify=auto|true`:
- Execute `/journey-verify id=<JRN-####> harnessRoot=<harnessRoot> mode=<verifyMode> heal=<heal> healAttempts=<healAttempts> repeat=<repeatGate> failOnFlaky=<failOnFlaky>`
- If it fails:
  - apply bounded fixes based on evidence (selectors/data/async)
  - re-run verify until attempts exhausted or blocked

If verification cannot be executed (environment unreachable):
- keep Journey status at clarified/defined
- add a blocker note and print the required next step (run verify in the correct region).

## Step 15 — Finalize Journey as implemented (only after gates pass)
If validate and verify both pass:
- Set Journey `status: implemented`
- Ensure `tests[]` is non-empty and deduped
- Add/update:
  - `<!-- ARTK:IMPLEMENT:BEGIN --> ... <!-- ARTK:IMPLEMENT:END -->`
  - `<!-- ARTK:VERIFY:BEGIN --> ... <!-- ARTK:VERIFY:END -->`
- Regenerate backlog/index.

If either gate fails:
- Do NOT set implemented.
- Keep status clarified/defined and capture reasons.

## Step 16 — Print run/debug instructions
Include:
- run by tag: `npx playwright test --grep @JRN-####`
- run by file path
- debug: `--ui`, `--headed`
- where to find report and traces (per Phase 7)

---

# Mode-based question policy (don’t be annoying)

## QUICK (≤ 3 questions, blockers only)
- env/baseURL reachable?
- auth actor?
- deterministic data approach?

## STANDARD (default, ≤ 8 questions)
Quick +:
- async completion signals
- compliance constraints (PII/artifacts)
- whether to split tests if ambiguous
- module naming if ambiguous

## MAX
Ask only when necessary:
- variants/negative flows
- multi-actor correlation
- feature flags/permissions matrix
- parallelism constraints

---

# Edge cases you MUST handle
- **SSO/MFA**: if UI login impossible, use external storageState provisioning and document.
- **Region-restricted env**: stop and propose runner-in-region (later phase) rather than guessing.
- **Existing tests present**: update/link rather than duplicate.
- **Downloads/new tabs/iframes**: use Playwright events and frame locators.
- **Flaky env**: do not “fix” with timing. Use explicit completion signals or quarantine later.

---

# Completion checklist (print at end)
- [ ] Test file(s) created/updated with `@JRN-####` and tier tag
- [ ] Tests use harness fixtures and foundation modules
- [ ] No hardcoded URLs; env loader used
- [ ] Web-first assertions used; no timing sleeps
- [ ] Feature modules created only if needed and kept small
- [ ] module registry updated (if enabled)
- [ ] `/journey-validate` passed
- [ ] `/journey-verify` passed (including stability gate)
- [ ] Journey updated: tests[] linked, status implemented only when valid+verified
- [ ] backlog/index regenerated
