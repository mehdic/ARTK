---
name: journey-validate
description: "Phase 8.4: Validate Journey implementation quality (static gates). Checks traceability, schema, tags, module registry, and Playwright best-practice violations (ESLint plugin when available, fallback greps otherwise). Produces a validation report."
argument-hint: "mode=standard|quick|max id=<JRN-0001> file=<path> harnessRoot=e2e artkRoot=<path> strict=true|false autofix=auto|true|false lint=auto|eslint|grep contract=auto|strict|basic updateJourney=true|false reportPath=auto|docs/JOURNEY_VALIDATION_<id>.md dryRun=true|false"
agent: agent
---

# ARTK /journey-validate — Quality Gates for a Journey Implementation (Phase 8.4)

You are running **ARTK Phase 8.4**.

The goal is simple: make sure the Journey implementation is **real**, **traceable**, and **doesn’t violate the rules that keep E2E suites from turning into a dumpster fire**.

This command is primarily **static validation**:
- fast checks
- deterministic outcomes
- clear actionable errors

It should be run:
- automatically at the end of `/journey-implement`, and
- any time someone “just tweaks one small thing” in tests (famous last words).

---

## What this command validates

### 1) Journey system integrity
- Journey frontmatter schema is valid.
- Journey lifecycle status is coherent (ex: `implemented` requires non-empty `tests[]`).
- Backlog/index can be regenerated deterministically.

### 2) Traceability
- Every implemented test includes the `@JRN-####` tag.
- Journey `tests[]` points to real files that contain `@JRN-####`.
- Module registry references are consistent (if registry exists).

### 3) Technical best practices (anti-flake gates)
Prefer ESLint + eslint-plugin-playwright when available. Fallback to grep-based checks otherwise.

Examples of violations to catch:
- `test.only` / focused tests
- `page.pause()`
- `page.waitForTimeout()` / time-based sleeps
- `force: true`
- `networkidle`
- missing awaits on Playwright APIs
- invalid tags format

### 4) Contract coverage
Ensures the test structure respects the Journey contract:
- acceptance criteria are represented as explicit `test.step()` sections (recommended)
- procedural steps are reflected in test flow
- no extra “creative” assertions that change the contract without updating the Journey

(You can’t perfectly prove semantic correctness statically, but you can catch 90% of the ways humans accidentally lie.)

---

## Inputs and defaults
- `mode`:
  - `quick`: minimal pass/fail gates. Low noise.
  - `standard` (default): recommended gates + report.
  - `max`: extra checks, deeper scanning, more strict.
- `strict` (default true):
  - true: failing any gate fails validation
  - false: warnings only (useful early on)
- `autofix` (default auto):
  - auto: only safe mechanical fixes (formatting, missing tags, import path)
  - true: apply safe fixes
  - false: report only
- `lint`:
  - auto: ESLint if configured, else grep
  - eslint: force ESLint (fail if unavailable)
  - grep: force grep checks
- `contract`:
  - basic: only tag/link/structure checks
  - strict: require explicit mapping structure (see below)
  - auto: strict if Journey has AC IDs, else basic

---

## Outputs (must produce)
- A validation report markdown file (default):
  - `docs/JOURNEY_VALIDATION_<JRN-ID>.md`
- Optional Journey update:
  - managed validation block including last validation time and result

---

# Required assistant output structure
1) **Detected Context**
2) **Validation Plan**
3) **Validation Results**
4) **Fixes Applied (if any)**
5) **Report Location**
6) **Next Actions**

If `dryRun=true`, output sections 1–2 only.

---

# Validation algorithm (do in order)

## Step 0 — Locate Journey and tests
1) Resolve `ARTK_ROOT`.
2) Load Journey file from `id=` or `file=`.
3) Determine tag `@JRN-####`.
4) Determine test files:
   - from Journey frontmatter `tests[]` if present
   - else search `<harnessRoot>/tests/**` for the tag

Fail (strict) if no tests found and Journey claims implemented.

## Step 1 — Validate Journey schema + lifecycle coherence
- Required frontmatter fields must exist for implemented Journeys:
  - `id`, `title`, `status`, `tier`, `scope`, `actor`, `tests[]`
- Lifecycle rules (default):
  - If `status: implemented` then `tests[]` must be non-empty.
  - If `status: quarantined` then `owner` + `issue` must exist.
  - If `status: deprecated` then `replacedBy` or rationale must exist.

If schema/lifecycle is invalid:
- If strict: fail with actionable message
- Else: warn

## Step 2 — Traceability checks (hard gate in standard/max)
For each test file in scope:
- Confirm file exists.
- Confirm it includes `@JRN-####`.
- Confirm tags are valid Playwright tags (start with `@`).
- **CRITICAL: Confirm test imports use ARTK Core:**
  - MUST import `test` and `expect` from `'@artk/core/fixtures'`
  - MUST NOT create custom fixture files or extend test manually
  - MUST NOT import from local `fixtures/` directory

Also check reverse links:
- Find all files containing `@JRN-####`
- Ensure they are listed in `tests[]` (or recommend updating).

**Core API Import Validation:**

Check each test file for correct core usage:

✅ **VALID:**
```typescript
import { test, expect } from '@artk/core/fixtures';
import { assertToastMessage } from '@artk/core/assertions';
import { getByTestId } from '@artk/core/locators';
import { namespace } from '@artk/core/data';
```

❌ **INVALID:**
```typescript
import { test } from '@playwright/test'; // Should use @artk/core/fixtures
import { test } from './fixtures/test'; // No custom fixtures
import { expect } from '../support/expect'; // Use core expect
```

## Step 3 — Module registry coherence (if present)
If `<harnessRoot>/modules/registry.json` exists:
- Ensure referenced modules exist.
- Ensure `journeyDependencies[JRN-####]` exists for implemented Journeys (recommend).
- Ensure any feature modules referenced are under `modules/feature/**`.

If registry missing, do not fail by default (warn).

## Step 4 — Technical lint gates

### 4A) Prefer ESLint plugin when possible
If `lint=auto|eslint`:
- Detect ESLint config:
  - `eslint.config.*` or `.eslintrc*`
- Detect eslint-plugin-playwright installed (package.json).
- If available, run:
  - `npx eslint <harnessRoot>/tests/**/*.{ts,js} --max-warnings=0`
  - scope the run to files containing `@JRN-####` when possible.

If ESLint is not available:
- If `lint=eslint`: fail
- If `lint=auto`: fallback to grep checks

### 4B) Grep-based fallback gates (always available)
Scan the Journey’s test files and fail (strict) on:
- `.only(` occurrences
- `page.pause(`
- `waitForTimeout(`
- `force: true`
- `networkidle`
- `page.waitForNavigation(`
- `page.waitForSelector(`
- `locator.nth(` / `.first()` / `.last()` (warn by default unless strict max)
- hardcoded URLs:
  - `page.goto('http` / `page.goto("http` / `https://`
  - exceptions allowed only for known 3rd party auth domains if documented in Journey

## Step 5 — Contract mapping checks
Recommended convention (strict mode):
- Journey acceptance criteria lines should be enumerated with IDs:
  - `AC-1: ...`
  - `AC-2: ...`
- Tests must contain corresponding `test.step('AC-1 ...')` sections.

If Journey has AC IDs and `contract=strict|auto`:
- Validate that every AC ID appears in at least one `test.step` title.
- Validate that each such step contains at least one `expect(...)` call (best-effort heuristic).
If Journey lacks AC IDs:
- Do not fail; recommend adding IDs via `/journey-clarify`.

## Step 6 — Emit report and optionally update Journey
Write `docs/JOURNEY_VALIDATION_<id>.md` including:
- summary table of gates (pass/fail/warn)
- list of issues with file/line pointers (best effort)
- recommended remediation steps

If `updateJourney=true`:
- add/update:
  `<!-- ARTK:VALIDATE:BEGIN --> ... <!-- ARTK:VALIDATE:END -->`
with:
- validatedAt
- result: pass | fail
- strict/lint/contract settings
- link to report file

---

# Autofix policy (if enabled)
Only do safe mechanical fixes:
- add missing `@JRN-####` tag (when obviously missing)
- normalize tag format
- fix import path to harness base `test`
- remove accidental `.only` (only if it’s clearly unintended; otherwise warn)
Do NOT “fix” timing/logic automatically here. That belongs in `/journey-verify`.

---

# Completion checklist (print at end)
- [ ] Journey schema/lifecycle valid
- [ ] tests[] links are correct and files contain @JRN tag
- [ ] No forbidden patterns (pause, sleeps, focused tests, force, networkidle)
- [ ] Lint gates pass (ESLint if available, else grep)
- [ ] Contract mapping checks pass or are explicitly deferred
- [ ] Validation report written

