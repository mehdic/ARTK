---
name: journey-verify
description: "Phase 8.5: Run the Playwright tests for a Journey (by @JRN tag), collect evidence (report/trace/video), detect flakiness, and optionally auto-heal common failures in a bounded loop. Updates Journey verification block and (optionally) status."
argument-hint: "mode=standard|quick|max id=<JRN-0001> file=<path> harnessRoot=e2e artkRoot=<path> env=auto|<name> baseURL=auto|<url> project=auto|<pw-project> workers=1|auto retries=0|1|2 trace=auto|retain-on-first-failure|retain-on-failure|on-first-retry|off repeat=0|2|3 failOnFlaky=auto|true|false maxFailures=1|auto heal=auto|off healAttempts=2 timeoutMs=auto report=auto|html|line|list|json artifacts=standard|minimal|max redactPII=auto|true|false updateJourney=true|false dryRun=true|false"
agent: agent
---

# ARTK /journey-verify — Run + Stabilize a Journey’s Tests (Phase 8.5)

You are running **ARTK Phase 8.5**.

Humans love regressions. ARTK exists to stop you from shipping them by accident.

This command verifies that a Journey’s Playwright tests:
- **actually run**
- **actually pass**
- and are **stable enough** to be worth trusting.

If the tests fail, you will attempt to **fix test code (not product code)** in a **bounded healing loop**, using traces and deterministic diagnostics.

---

## What this command does

1) Finds the Journey and its linked tests (or discovers them via the `@JRN-####` tag).
2) Runs only those tests using Playwright CLI filtering (`--grep`) and sane defaults.
3) Collects artifacts (HTML report, traces, screenshots, optional videos).
4) If failures occur, classifies them and attempts targeted fixes (selectors, waits, data, navigation).
5) Re-runs until either:
   - tests pass + stability gate passes, or
   - the attempt budget is exhausted, or
   - the failure is blocked by environment/app/permissions constraints.

6) Writes a managed verification summary back to the Journey (optional).

---

## Research-backed capabilities we rely on (don’t fight them)
- **Targeted runs**: `--grep`, `--workers`, `--max-failures`, `--repeat-each`, `--last-failed`.  
- **Flake detection**: `--fail-on-flaky-tests` + retries, plus optional repeat runs.  
- **Tracing**: `--trace` modes including `retain-on-failure`, and newer `retain-on-first-failure` where supported.  
- **Reports**: HTML for humans, JSON optional for machines.

(All of the above are native Playwright Test features.)

---

## Preconditions (verify before running)
- **ARTK Core framework exists** at `<ARTK_ROOT>/.core/`
- **Playwright config uses core harness**: Created via `createPlaywrightConfig` from `@artk/core/harness`
- **Tests use core fixtures**: Import from `@artk/core/fixtures`, not custom fixture files
- **artk.config.yml exists**: Valid ARTK Core v1 configuration
- The Journey exists (`id=` or `file=`) and has at least one test, OR tests exist containing `@JRN-####`.
- The environment is reachable from where you run tests. If it isn't, stop. Do not pretend.

If preconditions fail, stop with a short "Next command(s) to run" list.

**Verify Core Integration:**
Before running tests, check:
1. `<ARTK_ROOT>/.core/dist/` contains compiled core modules
2. `playwright.config.ts` imports from `@artk/core/harness`
3. Test files import from `@artk/core/fixtures`
4. Auth setup projects exist (auto-created by core harness)
5. Storage state directory exists at `<ARTK_ROOT>/.auth-states/`

---

## Inputs and defaults (simple, not fragile)
- `mode`:
  - `quick`: one run, fail fast, minimal healing.
  - `standard` (default): run + bounded healing + 1 stability check.
  - `max`: deeper stability checks, more aggressive evidence collection.
- Journey selector: `id=JRN-####` preferred. `file=` allowed.
- `harnessRoot`: default `e2e`.
- `env/baseURL`: `auto` means “use harness env loader defaults”. Never hardcode URLs.
- `trace` default `auto`:
  - Prefer `retain-on-first-failure` when Playwright supports it.
  - Else use `retain-on-failure` (works broadly).
- `repeat` default:
  - quick: 0
  - standard: 2 (light stability gate)
  - max: 3
- `heal` default `auto` with `healAttempts=2` (standard), `1` (quick), `3` (max).

---

## Outputs (must produce)
- A **single command line** that reproduces the run locally.
- A verification summary:
  - pass/fail
  - number of attempts
  - failure categories (if any)
  - artifact locations (report/traces)
- If `updateJourney=true`:
  - Update Journey with a managed block:
    - lastVerifiedAt, verifiedBy, env, baseURL (redacted if needed)
    - command used
    - attempts
    - result (pass/fail/blocked)
    - notes (what was fixed, what is blocked)

---

# Required assistant response structure
1) **Detected Context**
2) **Run Command**
3) **Results**
4) **Fixes Applied (if any)**
5) **Stability Gate Result**
6) **Artifacts + How to Debug**
7) **Blockers / Next Actions**

If `dryRun=true`, output sections 1–2 only.

---

# Execution algorithm (do in order)

## Step 0 — Locate Journey and tests
1) Resolve `ARTK_ROOT` (from `artkRoot=` or repo root heuristics).
2) Load Journey file:
   - If `id=`: locate in `journeys/**/JRN-####*.md` and parse frontmatter.
   - If `file=`: open and parse.
3) Determine the canonical tag: `@JRN-####`.
4) Determine test set:
   - Prefer Journey frontmatter `tests[]` if non-empty.
   - Else search under `<harnessRoot>/tests/` for files containing `@JRN-####`.

If no tests found: stop and instruct `/journey-implement id=...`.

## Step 1 — Detect Playwright + package manager
- Detect package manager (pnpm/yarn/npm) from lockfiles.
- Detect Playwright version from package.json/lock.
- Detect configured projects (from `playwright.config.*`).

If Playwright isn’t installed or browsers missing:
- Provide exact install commands (do not guess).

## Step 2 — Build the run command (reproducible)
Always build a command that:
- filters to the Journey tag (`--grep @JRN-####`)
- runs with **1 worker** for determinism while stabilizing
- stops early (`--max-failures=1`) during heal loop
- enables trace collection on failure (auto)

Base template:
- `npx playwright test --grep @JRN-#### --workers=1 --max-failures=1`

Trace mode selection:
- If Playwright supports `retain-on-first-failure`, use:
  - `--trace=retain-on-first-failure`
- Else:
  - `--trace=retain-on-failure`

Retries:
- For stabilization runs, default to `--retries=0` to avoid masking issues.
- For flake classification, run a later gate with `--retries=1 --fail-on-flaky-tests`.

Repeat:
- Stability gate may run with `--repeat-each=2` (or 3 in max).

If `project` is provided or auto-detected:
- include `--project=<name>`.

If env vars are needed and the harness provides a loader:
- run via `npm run e2e` wrapper if the repo defines it, otherwise use direct `npx`.

## Step 3 — Run (or request user run)
If you can execute commands in this environment, run them.
If you cannot:
- print the exact command(s)
- ask the user to paste:
  - the failing test output
  - the location of the Playwright report folder

Do not continue “fixing” without evidence.

## Step 4 — Healing loop (bounded, test code only)
If `heal=off`: skip to Step 6.

Else, loop up to `healAttempts`:
1) Run the stabilization command (Step 2) and capture:
   - stdout/stderr
   - which step failed (if available)
   - the failing locator/action (from stacktrace)
   - trace/report paths
2) Classify failure (pick one primary category):
   - **ENV**: DNS/VPN/baseURL unreachable, TLS, proxy, region restriction.
   - **AUTH**: login redirect loops, expired storageState, MFA/SSO blocking.
   - **SELECTOR**: strict mode violations, missing roles/labels/testids, dynamic text locators.
   - **DATA**: collisions, stale shared accounts, missing seed, cleanup not happening.
   - **ASYNC**: eventual consistency, background jobs, delayed toasts, websockets.
   - **NAV**: wrong route, SPA navigation race, new tabs/iframes.
   - **APP BUG**: deterministic product bug surfaced by the test.
3) Fix strategy by category (minimal change that increases determinism):
   - ENV: stop and mark blocked. Do not hack around unreachable environments.
   - AUTH: refresh storageState strategy, ensure setup project runs, avoid UI login if impossible.
   - SELECTOR:
     - prefer role/label/testid locators
     - remove brittle `nth()` and dynamic text targeting
     - encapsulate locator changes in the right module
   - DATA:
     - introduce/strengthen `runId` namespacing
     - ensure cleanup or create unique records per run
     - avoid assuming pre-existing data unless Journey explicitly says so
   - ASYNC:
     - replace implicit timing with explicit completion signals
     - use web-first assertions, `expect.poll`, or `expect.toPass` with bounded timeouts
     - never “fix” by adding `waitForTimeout`
   - NAV:
     - assert on stable route markers (heading, breadcrumb, URL)
     - handle new tabs with `context.waitForEvent('page')`
     - handle iframes with frame locators
   - APP BUG:
     - stop healing the test into lying
     - capture evidence and propose an issue link (do not set Journey verified)
4) Re-run the stabilization command.
5) If pass, break. If fail and category is blocked or app bug, stop early.

Hard rule: **never introduce sleeps** as a “stability fix” unless explicitly allowed by the playbook and only with a TODO and justification.

## Step 5 — Stability gate (don’t trust a single green run)
If the tests pass once:
- Run a light stability gate:
  - `--repeat-each=2 --workers=1 --retries=0`
- Then run a flake classification gate:
  - `--retries=1 --fail-on-flaky-tests`
If either gate fails:
- treat as flaky and continue healing (if attempts remain), else stop and mark as flaky/quarantine candidate.

## Step 6 — Update Journey (optional)
If `updateJourney=true`:
- Add/update:
  `<!-- ARTK:VERIFY:BEGIN --> ... <!-- ARTK:VERIFY:END -->`
Include:
- verifiedAt (ISO)
- result: pass | fail | blocked | flaky
- attemptsUsed
- primaryFailureCategory (if not pass)
- commands used (stabilization + gates)
- artifact pointers (relative paths only)
- notes (what changed)

Do NOT silently change Journey `status` unless:
- it is already `implemented` and verification passes (fine), OR
- you have explicit rule in playbook that “implemented requires verified”.

## Step 7 — Print final summary
Always end with:
- the single best repro command
- where to open the report:
  - `npx playwright show-report`
- where to open a trace:
  - `npx playwright show-trace <trace.zip>`

---

# Edge cases you must handle
- **SSO/MFA** blocks UI login: verification must rely on storageState provisioning. Mark blocked if not available.
- **Region-restricted environments**: stop, don’t “assume” connectivity.
- **Shared accounts**: avoid parallel runs until data isolation is proven.
- **Flaky backends**: stabilize with explicit completion checks, not retries forever.
- **Retry side effects**: prefer tracing that captures the *first failure* when supported.
- **Non-deterministic UI** (feature flags/permissions): require actor/role clarification or mark blocked.

