---
mode: agent
description: "Static validation gate - checks tags, no hardcoded URLs, proper fixtures, module registry consistency"
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

Also check reverse links:
- Find all files containing `@JRN-####`
- Ensure they are listed in `tests[]` (or recommend updating).

### Step 2A — Core API Import Validation (CRITICAL)

**MANDATORY:** All tests MUST import from ARTK Core v1 modules, NOT from Playwright Test directly or custom fixture files.

**Validation checks:**

1. **Test and expect imports:**
   - ✅ MUST: `import { test, expect } from '@artk/core/fixtures';`
   - ❌ FORBIDDEN: `import { test } from '@playwright/test';`
   - ❌ FORBIDDEN: `import { test } from './fixtures/test';`
   - ❌ FORBIDDEN: Custom fixture file extensions

2. **Locator utilities (if used):**
   - ✅ RECOMMENDED: `import { locate, byRole, byTestId } from '@artk/core/locators';`
   - ❌ AVOID: Custom locator helpers without good reason

3. **Assertion helpers (if used):**
   - ✅ RECOMMENDED: `import { expectToast, expectLoading } from '@artk/core/assertions';`
   - ⚠️ WARN: Manual polling loops (suggest using core assertions)

4. **Data isolation (if used):**
   - ✅ RECOMMENDED: `import { namespace } from '@artk/core/data';`
   - ⚠️ WARN: Hard-coded test data without namespacing

5. **Config access (if used):**
   - ✅ MUST: Access config via fixture: `async ({ config }) => { ... }`
   - ❌ FORBIDDEN: Importing config directly in test files

**Detailed validation examples:**

✅ **VALID test structure:**
```typescript
import { test, expect } from '@artk/core/fixtures';
import { expectToast, expectLoading } from '@artk/core/assertions';
import { byTestId } from '@artk/core/locators';
import { namespace } from '@artk/core/data';

test('example @JRN-0001', async ({ authenticatedPage, config, runId }) => {
  // Uses core fixtures and helpers
  const userName = namespace('user', runId);
  await authenticatedPage.goto('/dashboard');
  await expectLoading(authenticatedPage, { timeout: 5000 });
});
```

❌ **INVALID patterns to reject:**
```typescript
// ❌ Direct Playwright import
import { test } from '@playwright/test';

// ❌ Custom fixture file
import { test } from './fixtures/test';

// ❌ Custom expect extensions
import { expect } from '../support/custom-expect';

// ❌ Manual config loading
import { loadConfig } from '@artk/core/config';
const config = loadConfig(); // Should use fixture instead

// ❌ Custom locator without encapsulation
const myCustomLocator = page.locator('.some-brittle-class');
```

**Automated validation approach:**

1. **Grep-based checks (always available):**
   ```bash
   # Must find this import
   grep -l "from '@artk/core/fixtures'" <test-files>

   # Must NOT find these
   grep "from '@playwright/test'" <test-files>
   grep "from './fixtures/" <test-files>
   grep "from '../fixtures/" <test-files>
   ```

2. **ESLint rules (if available):**
   - Custom rule: `artk/use-core-fixtures`
   - Custom rule: `artk/no-direct-config-import`

**Failure handling:**
- If strict: FAIL validation with file/line pointers
- If warnings: WARN but suggest `/journey-implement` re-run with `--fix-imports` flag

## Step 3 — Module registry coherence (if present)
If `<harnessRoot>/modules/registry.json` exists:
- Ensure referenced modules exist.
- Ensure `journeyDependencies[JRN-####]` exists for implemented Journeys (recommend).
- Ensure any feature modules referenced are under `modules/feature/**`.

If registry missing, do not fail by default (warn).

## Step 4 — Technical lint gates

### 4A) Step Pattern Validation (Deterministic Code Quality)

Verify generated tests follow the step mapping rules from `/journey-implement`:

#### Required Patterns (must find in test files)
```bash
# Must find role-based or label-based locators
grep -E "getByRole|getByLabel|getByText|getByTestId" <test-files>

# Must find web-first assertions
grep -E "await expect\(" <test-files>

# Should find test.step for AC mapping
grep -E "test\.step\(" <test-files>
```

#### Forbidden Patterns (must NOT find)
```bash
# Sleeps - NEVER allowed
grep -E "waitForTimeout\(|\.pause\(\)" <test-files>

# Force clicks - fix underlying issue instead
grep -E "force:\s*true" <test-files>

# Network idle - unreliable
grep -E "networkidle" <test-files>

# Direct Playwright imports - must use @artk/core
grep -E "from '@playwright/test'" <test-files>

# Custom fixture imports - must use @artk/core
grep -E "from '\./fixtures/|from '\.\./fixtures/" <test-files>

# Hardcoded URLs
grep -E "goto\(['\"]https?://" <test-files>

# CSS-only selectors without role/label
grep -E "\.click\('\." <test-files>
```

#### Selector Quality Validation
| Pattern Found | Severity | Action |
|--------------|----------|--------|
| `getByRole()` | Good | No action |
| `getByLabel()` | Good | No action |
| `getByText()` | Acceptable | No action |
| `getByTestId()` | Acceptable | Warn if overused |
| `locator('.class')` | Warning | Suggest role/label alternative |
| `locator('#id')` | Warning | Suggest role/label alternative |
| `nth()` / `first()` / `last()` | Warning | Verify necessity |
| `xpath=` | Error (strict) | Must encapsulate in module |

#### Async Pattern Validation
| Pattern Found | Severity | Action |
|--------------|----------|--------|
| `waitForTimeout()` | Error | Replace with explicit signal |
| `expect().toBeVisible()` | Good | No action |
| `waitForURL()` | Good | No action |
| `waitForResponse()` | Good | No action |
| `expectToast()` | Good | No action |
| `waitForLoadingComplete()` | Good | No action |
| `sleep()` / `delay()` | Error | Replace with explicit signal |

### 4B) Prefer ESLint plugin when possible
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

