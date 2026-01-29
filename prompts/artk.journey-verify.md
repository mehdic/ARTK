---
name: artk.journey-verify
description: "Phase 10: Run the Playwright tests for a Journey (by @JRN tag), collect evidence (report/trace/video), detect flakiness, and optionally auto-heal common failures in a bounded loop. Updates Journey verification block and (optionally) status."
argument-hint: "mode=standard|quick|max id=<JRN-0001> file=<path> harnessRoot=e2e artkRoot=<path> env=auto|<name> baseURL=auto|<url> project=auto|<pw-project> workers=1|auto retries=0|1|2 trace=auto|retain-on-first-failure|retain-on-failure|on-first-retry|off repeat=0|2|3 failOnFlaky=auto|true|false maxFailures=1|auto heal=auto|off healAttempts=2 timeoutMs=auto report=auto|html|line|list|json artifacts=standard|minimal|max redactPII=auto|true|false updateJourney=true|false dryRun=true|false"
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

# ARTK /journey-verify — Run + Stabilize a Journey’s Tests (Phase 10)

You are running **ARTK Phase 10**.

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

## Edit safety
If `updateJourney=true`, MUST read and follow `.github/prompts/common/GENERAL_RULES.md` before making any edits.

## Research-backed capabilities we rely on (don’t fight them)
- **Targeted runs**: `--grep`, `--workers`, `--max-failures`, `--repeat-each`, `--last-failed`.  
- **Flake detection**: `--fail-on-flaky-tests` + retries, plus optional repeat runs.  
- **Tracing**: `--trace` modes including `retain-on-failure`, and newer `retain-on-first-failure` where supported.  
- **Reports**: HTML for humans, JSON optional for machines.

(All of the above are native Playwright Test features.)

---

## Preconditions (verify before running)

### Core Framework Requirements (CRITICAL)

Before running any tests, verify ARTK Core v1 is properly integrated:

1. **ARTK Core framework installed:**
   - ✅ `<ARTK_ROOT>/.core/` directory exists
   - ✅ `<ARTK_ROOT>/.core/dist/` contains compiled modules:
     - `dist/config/`, `dist/fixtures/`, `dist/harness/`
     - `dist/locators/`, `dist/assertions/`, `dist/data/`
     - `dist/auth/`, `dist/reporters/`
   - ✅ `<ARTK_ROOT>/.core/package.json` exists with correct version
   - ❌ If missing: Run `/artk.init-playbook` to install core framework

2. **artk.config.yml valid:**
   - ✅ Valid ARTK Core v1 schema (validated by `@artk/core/config`)
   - ✅ `version: "1.0"` field present
   - ✅ Required sections: `app`, `environments`, `auth`, `selectors`, `tiers`
   - ❌ If invalid: Fix config or run `/artk.init-playbook` to regenerate

3. **Playwright config uses core harness:**
   - ✅ `playwright.config.ts` imports from `@artk/core/harness`
   - ✅ Uses `createPlaywrightConfig()` factory
   - ✅ Config loads via `loadConfig()` from `@artk/core/config`
   - ❌ If manual config: Run `/artk.discover-foundation` to regenerate

4. **Tests use core fixtures:**
   - ✅ Test files import from `@artk/core/fixtures`
   - ✅ NO custom fixture files in `<harnessRoot>/fixtures/`
   - ✅ NO direct imports from `@playwright/test`
   - ❌ If invalid: Run `/artk.journey-validate` to detect violations

5. **Auth setup configured:**
   - ✅ Auth setup projects auto-generated by core harness
   - ✅ Storage state directory exists at `<ARTK_ROOT>/.auth-states/`
   - ✅ `.gitignore` excludes `.auth-states/`
   - ❌ If missing: Check `artk.config.yml` auth section

6. **Journey and tests exist:**
   - ✅ Journey file exists (`id=` or `file=` provided)
   - ✅ At least one test tagged with `@JRN-####` exists
   - ❌ If no tests: Run `/artk.journey-implement id=...`

7. **Environment reachable:**
   - ✅ `baseURL` from config is accessible from test runner
   - ✅ VPN/network connectivity verified
   - ❌ If unreachable: STOP - do not pretend

**Precondition failure actions:**

| Failed Check | Command to Run | Description |
|--------------|----------------|-------------|
| Core missing | `/artk.init-playbook` | Install ARTK Core framework |
| Config invalid | Fix `artk.config.yml` | Update to Core v1 schema |
| Config uses manual Playwright | `/artk.discover-foundation` | Regenerate using core harness |
| Tests use custom fixtures | `/artk.journey-implement id=... --fix-imports` | Re-implement with core imports |
| No auth setup | Check config + run `/artk.discover-foundation` | Configure auth in config |
| No tests | `/artk.journey-implement id=...` | Implement the Journey |
| Environment unreachable | Fix network/VPN | Cannot verify without access |

**If ANY precondition fails, STOP and provide the exact command(s) to run. Do NOT attempt to run tests.**

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
2) Determine harness root (`harnessRoot`).
3) **Set LLKB root path** (`LLKB_ROOT = ${harnessRoot}/.artk/llkb`).
4) Load Journey file:
   - If `id=`: locate in `journeys/**/JRN-####*.md` and parse frontmatter.
   - If `file=`: open and parse.
5) Determine the canonical tag: `@JRN-####`.
6) Determine test set:
   - Prefer Journey frontmatter `tests[]` if non-empty.
   - Else search under `<harnessRoot>/tests/` for files containing `@JRN-####`.

If no tests found: stop and instruct `/artk.journey-implement id=...`.

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

## Step 3.5 — Use AutoGen Core Verification API (Recommended)

**PREFERRED: Use `@artk/core-autogen` for structured verification and healing**

Instead of manual test execution and healing, use the AutoGen Core verification engine:

```typescript
import { verifyJourney } from '@artk/core-autogen';

const result = await verifyJourney({
  journeyPath: 'journeys/JRN-0001-user-login.md',
  harnessRoot: 'e2e',
  options: {
    // Environment settings
    env: 'local',

    // Healing configuration
    heal: true,
    maxHealAttempts: 3,

    // Stability checks
    repeatCount: 2,
    failOnFlaky: true,

    // Evidence collection
    captureAria: true,
    traceMode: 'retain-on-first-failure',
  },
});

console.log('Verification result:', result.status);
console.log('Healing attempts:', result.healingAttempts);
console.log('ARIA snapshots:', result.ariaSnapshots);
```

**AutoGen Core Verification Features:**

1. **Structured Test Execution**
   - Runs tests filtered by `@JRN-####` tag
   - Single worker for deterministic debugging
   - Configurable trace collection

2. **Failure Classification** (`result.classification`)
   - `selector` - Locator issues (strict mode, missing elements)
   - `timing` - Async/wait issues
   - `navigation` - Route/URL issues
   - `data` - Test data collisions
   - `auth` - Authentication failures
   - `env` - Environment unreachable

3. **Bounded Healing Loop** (`heal: true`)
   - Attempts up to `maxHealAttempts`
   - Applies targeted fixes based on classification
   - Logs all attempts to `heal-log.json`
   - Respects allowed/forbidden fix rules:
     - ✅ Allowed: `selector-refine`, `navigation-wait`, `missing-await`, `web-first-assertion`
     - ❌ Forbidden: `add-sleep`, `force-click`, `weaken-assertion`, `remove-assertion`

4. **ARIA Snapshot Capture** (`captureAria: true`)
   - Captures accessibility tree on failure
   - Provides baseline for selector improvements
   - Stores snapshots in `.artk/aria-snapshots/`

```typescript
// ARIA snapshot structure
interface AriaSnapshot {
  testName: string;
  timestamp: string;
  url: string;
  tree: {
    role: string;
    name: string;
    children: AriaNode[];
  };
}
```

5. **Stability Gate** (automatic after healing)
   - Runs `--repeat-each=2` to detect flakiness
   - Runs `--fail-on-flaky-tests` to classify
   - Result: `stable`, `flaky`, `failed`

**Verification Output:**

```typescript
interface VerifyResult {
  status: 'passed' | 'failed' | 'healed' | 'blocked';
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  classification?: FailureClassification;
  healingAttempts: HealingAttempt[];
  ariaSnapshots: AriaSnapshot[];
  reportPath: string;
  tracePaths: string[];
  reproCommand: string;
}
```

**When AutoGen Core cannot heal:**
- ENV/AUTH issues (require manual intervention)
- APP BUG (genuine product issue - file bug report)
- Exhausted attempts (quarantine the test)

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
- you have explicit rule in playbook that "implemented requires verified".

## Step 17 — LLKB Integration: Learn and Extract

**After tests pass (or after fixing and re-running), capture learnings and extract reusable patterns into the LLKB.**

Check if `${LLKB_ROOT}/` exists and `config.yml` has `enabled: true`. If disabled or missing, skip this step.

### LLKB Library Reference (@artk/core/llkb)

**Use the `@artk/core/llkb` library for all LLKB operations. This provides atomic writes, file locking, and all utility functions.**

```typescript
import {
  // File operations (atomic writes, locking)
  saveJSONAtomic, saveJSONAtomicSync, updateJSONWithLock, updateJSONWithLockSync, loadJSON, ensureDir,
  // History logging
  appendToHistory, readTodayHistory, countTodayEvents, cleanupOldHistoryFiles,
  // Confidence calculations
  calculateConfidence, detectDecliningConfidence, needsConfidenceReview, updateConfidenceHistory,
  // Analytics
  updateAnalytics, updateAnalyticsWithData, createEmptyAnalytics,
  // Similarity detection
  calculateSimilarity, findSimilarPatterns, findNearDuplicates,
  // Category inference
  inferCategory, inferCategoryWithConfidence,
  // Types
  type Lesson, type Component, type HistoryEvent, type AnalyticsFile,
} from '@artk/core/llkb';
```

**Key functions for journey-verify:**

| Function | Usage |
|----------|-------|
| `saveJSONAtomic(path, data)` | Write files atomically (prevents corruption) |
| `updateJSONWithLock(path, fn)` | Concurrent-safe read-modify-write |
| `appendToHistory(event, llkbRoot)` | Log lesson_created, component_extracted events |
| `calculateConfidence(metrics)` | Calculate lesson confidence score (0-1) |
| `detectDecliningConfidence(lesson)` | Check if lesson confidence is dropping |
| `updateAnalytics(llkbRoot)` | Recalculate analytics.json from lessons/components |
| `findSimilarPatterns(code, patterns)` | Detect duplication for extraction |
| `cleanupOldHistoryFiles(config, llkbRoot)` | Remove old history files per retention policy |

### 17.0 File Safety Utilities (Concurrent Write Protection)

**All LLKB JSON operations MUST use atomic writes to prevent data corruption during parallel runs. Use the library functions above instead of manual implementations.**

```
# ═══════════════════════════════════════════════════════════════
# ATOMIC WRITE: Prevents partial writes and race conditions
# ═══════════════════════════════════════════════════════════════
FUNCTION saveJSONAtomic(path: string, data: object) -> SaveResult:
  TRY:
    tempPath = path + ".tmp." + generateRandomId()

    # Write to temp file first
    writeFile(tempPath, JSON.stringify(data, null, 2))

    # Atomic rename (overwrites destination)
    rename(tempPath, path)

    RETURN { success: true }
  CATCH error:
    # Clean up temp file if it exists
    IF exists(tempPath):
      deleteFile(tempPath)
    RETURN { success: false, error: error.message }

# ═══════════════════════════════════════════════════════════════
# LOCKED READ-MODIFY-WRITE: For concurrent updates to same file
# ═══════════════════════════════════════════════════════════════
FUNCTION updateJSONWithLock(path: string, updateFn: Function) -> UpdateResult:
  lockPath = path + ".lock"
  maxWaitMs = 5000
  startTime = now()

  # Acquire lock with timeout
  WHILE exists(lockPath):
    IF (now() - startTime) > maxWaitMs:
      # Check if lock is stale (> 30 seconds old)
      IF fileAge(lockPath) > 30000:
        deleteFile(lockPath)  # Force release stale lock
        logWarning("Released stale lock on " + path)
      ELSE:
        RETURN { success: false, error: "Lock timeout on " + path }
    sleep(100)  # Wait 100ms before retry

  TRY:
    # Create lock file
    writeFile(lockPath, now().toISO8601())

    # Read current data
    currentData = loadJSON(path)

    # Apply update function
    updatedData = updateFn(currentData)

    # Write atomically
    result = saveJSONAtomic(path, updatedData)

    RETURN result
  FINALLY:
    # Always release lock
    IF exists(lockPath):
      deleteFile(lockPath)

# ═══════════════════════════════════════════════════════════════
# USAGE EXAMPLES
# ═══════════════════════════════════════════════════════════════

# Simple save (no concurrent risk):
saveJSONAtomic("${LLKB_ROOT}/app-profile.json", profileData)

# Concurrent update (lessons, components, analytics):
updateJSONWithLock("${LLKB_ROOT}/lessons.json", (lessons) => {
  lessons.lessons.push(newLesson)
  RETURN lessons
})
```

**When to use each:**
| Operation | Function | Reason |
|-----------|----------|--------|
| Initial creation | `saveJSONAtomic` | No concurrent risk |
| Update lessons.json | `updateJSONWithLock` | Multiple journeys may run in parallel |
| Update components.json | `updateJSONWithLock` | Multiple journeys may run in parallel |
| Update analytics.json | `updateJSONWithLock` | Updated after every verification |
| Append to history | `appendToHistory` | JSONL append is inherently safe |

### 17.1 Record Lessons from Fixes

For each fix applied during verification:

1. **Analyze the fix**:
   - What selector/timing/pattern was wrong?
   - What made it work?
   - Is this generalizable or one-off?
   - What category: `selector`, `timing`, `data`, `auth`, `quirk`, `assertion`, `navigation`

2. **Classify as lesson if generalizable**:
   - NOT one-off: If the pattern applies to multiple components or selectors
   - NOT app bug: If the fix is in test code, not product code
   - Has clear "bad → good" transformation

3. **Check if similar lesson exists**:
   ```
   existingLesson = lessons.find(l =>
     l.category === category AND
     l.problem matches currentProblem AND
     similarity(l.solution, currentSolution) > 0.7
   )
   ```

4. **If similar lesson exists** → Update metrics:
   ```json
   {
     "metrics": {
       "occurrences": <increment by 1>,
       "successRate": <recalculate based on this attempt>,
       "confidence": <recalculate>,
       "lastApplied": "<ISO8601>",
       "lastSuccess": "<ISO8601 if this attempt succeeded>"
     }
   }
   ```

5. **If new lesson** → Create entry in `lessons.json`:
   ```json
   {
     "id": "L###",
     "category": "selector|timing|data|auth|quirk|assertion|navigation",
     "severity": "critical|high|medium|low",
     "scope": "universal|framework:<name>|app-specific",

     "title": "Short descriptive title",
     "problem": "What went wrong (detailed)",
     "solution": "How to fix it (detailed)",
     "rationale": "Why this solution works",

     "codePattern": {
       "bad": "Code that causes the problem",
       "good": "Code that solves it",
       "context": "When to apply this pattern"
     },

     "applicableTo": ["component-name", "selector-pattern", "scope-name"],
     "tags": ["ag-grid", "async", "navigation", "etc"],

     "metrics": {
       "occurrences": 1,
       "successRate": 1.0,
       "confidence": 0.7,
       "confidenceHistory": [],
       "firstSeen": "<ISO8601>",
       "lastApplied": "<ISO8601>",
       "lastSuccess": "<ISO8601>"
     },

     "source": {
       "discoveredBy": "journey-verify",
       "journey": "JRN-####",
       "file": "tests/<tier>/<file>.spec.ts",
       "line": <line_number>
     },

     "validation": {
       "autoValidated": true,
       "humanReviewed": false,
       "reviewedBy": null,
       "reviewedAt": null
     }
   }
   ```

6. **Log to history**:
   ```jsonl
   {"timestamp":"<ISO8601>","event":"lesson_created","id":"L###","journey":"JRN-####","prompt":"journey-verify","summary":"Discovered <title>"}
   ```

**Example lesson creation:**
```json
{
  "id": "L042",
  "category": "selector",
  "severity": "high",
  "scope": "framework:ag-grid",
  "title": "AG Grid cell selection requires aria-based targeting",
  "problem": "CSS class selectors (.ag-cell-value) are dynamic and break when AG Grid updates",
  "solution": "Use getByRole('gridcell', { name: expectedValue }) for stable targeting",
  "rationale": "ARIA roles are stable across AG Grid versions and align with accessibility best practices",
  "codePattern": {
    "bad": "const cell = page.locator('.ag-cell-value').first();",
    "good": "const cell = page.getByRole('gridcell', { name: 'Order ID' });",
    "context": "When selecting cells in AG Grid data tables"
  },
  "applicableTo": ["ag-grid", "data-grid", "table-cell-selection"],
  "tags": ["ag-grid", "selector", "aria"],
  "metrics": {
    "occurrences": 1,
    "successRate": 1.0,
    "confidence": 0.75,
    "firstSeen": "2026-01-16T10:30:00Z",
    "lastApplied": "2026-01-16T10:30:00Z",
    "lastSuccess": "2026-01-16T10:30:00Z"
  },
  "source": {
    "discoveredBy": "journey-verify",
    "journey": "JRN-0005",
    "file": "tests/smoke/jrn-0005__view-orders.spec.ts",
    "line": 42
  }
}
```

### 17.2 Detect Extraction Opportunities

After all tests pass, analyze test code for duplication and common patterns:

#### 17.2.1 Cross-Journey Comparison Algorithm (MANDATORY)

**Scan ALL test files in the project to find duplicate patterns:**

```
FUNCTION scanForExtractionCandidates(harnessRoot: string) -> ExtractionCandidate[]:
  allTestSteps = []
  existingComponents = loadComponents("${LLKB_ROOT}/components.json")

  # ═══════════════════════════════════════════════════════════════
  # STEP 1: Extract all test.step() blocks from all test files
  # ═══════════════════════════════════════════════════════════════
  FOR each testFile in glob(harnessRoot + "/tests/**/*.spec.ts"):
    fileContent = readFile(testFile)
    journeyId = extractJourneyTag(fileContent)  # @JRN-#### from tags

    # Extract test.step() blocks using AST or regex
    stepBlocks = extractTestSteps(fileContent)

    FOR each step in stepBlocks:
      allTestSteps.push({
        file: testFile,
        journey: journeyId,
        stepName: step.name,
        code: step.code,
        normalizedCode: normalizeCode(step.code),
        hash: hashCode(normalizeCode(step.code)),
        lineStart: step.lineStart,
        lineEnd: step.lineEnd
      })

  # ═══════════════════════════════════════════════════════════════
  # STEP 2: Normalize code for comparison
  # ═══════════════════════════════════════════════════════════════
  FUNCTION normalizeCode(code: string) -> string:
    normalized = code
    # Remove string literals (replace with <STRING>)
    normalized = normalized.replace(/'[^']*'/g, '<STRING>')
    normalized = normalized.replace(/"[^"]*"/g, '<STRING>')
    # Remove numbers (replace with <NUMBER>)
    normalized = normalized.replace(/\d+/g, '<NUMBER>')
    # Remove variable names (replace with <VAR>)
    normalized = normalized.replace(/const \w+/g, 'const <VAR>')
    normalized = normalized.replace(/let \w+/g, 'let <VAR>')
    # Normalize whitespace
    normalized = normalized.replace(/\s+/g, ' ').trim()
    RETURN normalized

  # ═══════════════════════════════════════════════════════════════
  # STEP 2.5: Infer category from code patterns
  # ═══════════════════════════════════════════════════════════════
  # Valid categories: selector, timing, quirk, auth, data, assertion, navigation, ui-interaction
  # Note: "quirk" is lesson-only (app quirks don't become components)
  FUNCTION inferCategory(code: string) -> string:
    codeLower = code.toLowerCase()

    # Navigation patterns
    IF codeLower.includes("goto") OR codeLower.includes("navigate") OR codeLower.includes("route"):
      RETURN "navigation"
    IF codeLower.includes("sidebar") OR codeLower.includes("menu") OR codeLower.includes("breadcrumb"):
      RETURN "navigation"

    # Auth patterns
    IF codeLower.includes("login") OR codeLower.includes("auth") OR codeLower.includes("password"):
      RETURN "auth"
    IF codeLower.includes("logout") OR codeLower.includes("session") OR codeLower.includes("token"):
      RETURN "auth"

    # Assertion patterns
    IF codeLower.includes("expect") OR codeLower.includes("assert") OR codeLower.includes("verify"):
      RETURN "assertion"
    IF codeLower.includes("tobevisible") OR codeLower.includes("tohavetext") OR codeLower.includes("tobehidden"):
      RETURN "assertion"

    # Data patterns
    IF codeLower.includes("api") OR codeLower.includes("fetch") OR codeLower.includes("response"):
      RETURN "data"
    IF codeLower.includes("request") OR codeLower.includes("json") OR codeLower.includes("payload"):
      RETURN "data"

    # Selector patterns
    IF codeLower.includes("locator") OR codeLower.includes("getby") OR codeLower.includes("selector"):
      RETURN "selector"
    IF codeLower.includes("testid") OR codeLower.includes("data-testid") OR codeLower.includes("queryselector"):
      RETURN "selector"

    # Timing patterns
    IF codeLower.includes("wait") OR codeLower.includes("timeout") OR codeLower.includes("delay"):
      RETURN "timing"
    IF codeLower.includes("sleep") OR codeLower.includes("settimeout") OR codeLower.includes("poll"):
      RETURN "timing"

    # UI interaction (default for common UI operations)
    IF codeLower.includes("click") OR codeLower.includes("fill") OR codeLower.includes("type"):
      RETURN "ui-interaction"
    IF codeLower.includes("select") OR codeLower.includes("check") OR codeLower.includes("upload"):
      RETURN "ui-interaction"

    # Default fallback
    RETURN "ui-interaction"

  # ═══════════════════════════════════════════════════════════════
  # STEP 3: Group by hash and find duplicates
  # ═══════════════════════════════════════════════════════════════
  groupedByHash = groupBy(allTestSteps, 'hash')
  candidates = []

  FOR each hash, group in groupedByHash:
    IF group.length >= 2:  # Found duplicate pattern
      # Check if already a component
      existingMatch = existingComponents.find(c =>
        hashCode(normalizeCode(c.source.originalCode)) == hash
      )

      IF existingMatch IS NULL:
        # Calculate extraction score
        score = calculateExtractionScore(group)

        candidates.push({
          pattern: group[0].normalizedCode,
          originalCode: group[0].code,
          occurrences: group.length,
          journeys: unique(group.map(s => s.journey)),
          files: unique(group.map(s => s.file)),
          category: inferCategory(group[0].code),
          score: score,
          recommendation: score >= 15 ? "EXTRACT_NOW" : "CONSIDER"
        })

  # Sort by score descending
  candidates.sort((a, b) => b.score - a.score)

  RETURN candidates
```

**Extraction scoring algorithm:**
```
FUNCTION calculateExtractionScore(group: TestStep[]) -> number:
  score = 0

  # Occurrence bonus (more uses = more valuable)
  IF group.length >= 5: score += 20
  ELIF group.length >= 3: score += 15
  ELIF group.length >= 2: score += 10

  # Category bonus (some patterns are more reusable)
  # Valid categories: selector, timing, auth, data, assertion, navigation, ui-interaction
  # Note: quirk is lesson-only, not applicable for component extraction
  category = inferCategory(group[0].code)
  IF category in ["navigation", "ui-interaction"]: score += 5  # High reuse potential
  ELIF category in ["auth", "assertion", "data"]: score += 4   # Medium reuse potential
  ELIF category in ["selector", "timing"]: score += 3          # Lower reuse potential

  # Code complexity bonus (longer code = more value in extraction)
  avgLines = average(group.map(s => s.lineEnd - s.lineStart))
  IF avgLines > 10: score += 5
  ELIF avgLines > 5: score += 3
  ELIF avgLines > 3: score += 1

  # Selector stability bonus
  IF group[0].code.includes("getByRole"): score += 3
  IF group[0].code.includes("getByTestId"): score += 2
  IF group[0].code.includes("getByLabel"): score += 2

  # Cross-journey bonus (used in multiple journeys = more valuable)
  uniqueJourneys = unique(group.map(s => s.journey)).length
  IF uniqueJourneys >= 3: score += 5
  ELIF uniqueJourneys >= 2: score += 3

  RETURN score

# Thresholds:
# score >= 15: EXTRACT_NOW (auto-extract)
# score >= 10: CONSIDER (show to user)
# score < 10: SKIP (inline is fine)
```

2. **Single-journey analysis** (checks current journey only):
   ```
   FOR each test.step in current journey:
     IF step matches common pattern:
       - Navigation (gotoBase, selectNavItem, verifyRoute)
       - Forms (fillForm, submitForm, verifyValidation)
       - Grids (sortGrid, filterGrid, expectRowCount)
       - Modals (openModal, closeModal, confirmDialog)
       - Notifications (expectToast, expectAlert, verifyMessage)

     IF no component exists for this pattern:
       candidates.push({
         pattern: step.code,
         category: matchedCategory,
         journey: currentJourney,
         reason: 'Common UI pattern'
       })
   ```

3. **Prioritize extraction candidates**:
   ```
   FOR each candidate:
     score = 0
     IF candidate.occurrences >= 2: score += 10
     IF candidate.category in ['navigation', 'ui-interaction']: score += 5
     ELIF candidate.category in ['auth', 'assertion', 'data']: score += 4
     IF candidate.code.length > 5 lines: score += 3
     IF candidate.uses stable selectors (testid/role): score += 2

     IF score >= 15:
       EXTRACT NOW
     ELIF score >= 10:
       LOG as extraction candidate for review
   ```

### 17.3 Extract New Components

When extracting a component:

1. **Determine best location**:
   - **Used across scopes** → `modules/foundation/<category>/`
   - **Scope-specific** → `modules/feature/<scope>/`
   - **Framework-specific** (e.g., AG Grid) → `modules/foundation/<category>/`
   - **Universal** (toast, loading) → Suggest PR to `@artk/core` (note in output)

2. **Generate module code**:
   ```typescript
   /**
    * <Description of what the component does>
    *
    * @component COMP###
    * @category <navigation|auth|assertion|data|ui-interaction>
    * @scope <universal|framework:xxx|app-specific>
    * @extractedFrom JRN-####
    * @createdBy journey-verify
    *
    * @example
    * ```typescript
    * await componentName(page, { option: value });
    * ```
    */
   export async function componentName(
     page: Page,
     options?: ComponentOptions
   ): Promise<void> {
     // Extracted and generalized code
     // Remove Journey-specific literals, add options/params
     // Preserve stable selectors and patterns
   }
   ```

3. **Update all tests that use this pattern**:
   - Replace inline code with import + function call
   - Ensure tests still pass after refactor
   - Run quick verification: `npx playwright test --grep @JRN-#### --workers=1`

4. **Register component in `components.json`**:
   - Full metadata (see structure in spec)
   - `metrics.usedInJourneys` = list of journeys using this pattern
   - `source.extractedFrom` = current journey or "multiple" if cross-journey
   - `source.extractedBy` = "journey-verify"

5. **Update `modules/registry.json`**:
   - Add export entry with component metadata

6. **Log to history**:
   ```jsonl
   {"timestamp":"<ISO8601>","event":"component_extracted","id":"COMP###","journey":"JRN-####","prompt":"journey-verify","summary":"Extracted <componentName> from JRN-#### (used in N journeys)"}
   ```

**Example component extraction:**
```typescript
/**
 * Verify sidebar navigation is ready and interactive
 *
 * @component COMP015
 * @category navigation
 * @scope app-specific
 * @extractedFrom JRN-0002, JRN-0005, JRN-0010
 * @createdBy journey-verify
 *
 * @example
 * ```typescript
 * await verifySidebarReady(page);
 * await verifySidebarReady(page, { minItems: 5 });
 * ```
 */
export async function verifySidebarReady(
  page: Page,
  options: VerifySidebarOptions = {}
): Promise<void> {
  const { timeout = 10000, minItems = 1 } = options;

  // Verify sidebar container is visible
  const sidebar = page.locator('[data-testid="sidebar-nav"]');
  await expect(sidebar).toBeVisible({ timeout });

  // Verify navigation items are present
  const navItems = page.locator('[data-testid^="sidebar-item-"]');
  const count = await navItems.count();
  expect(count).toBeGreaterThanOrEqual(minItems);
}

export interface VerifySidebarOptions {
  timeout?: number;
  minItems?: number;
}
```

### 17.4 Discover App Quirks

When a fix reveals unexpected app behavior:

1. **Classify as quirk if**:
   - Behavior is undocumented or differs from standard/expected
   - Workaround is required for tests to pass
   - Behavior is reproducible and deterministic (not a flaky env issue)

2. **Add to `appQuirks` in `lessons.json`**:
   ```json
   {
     "id": "AQ###",
     "component": "Component name or UI area",
     "location": "/route or selector",
     "quirk": "Description of unexpected behavior",
     "impact": "How it affects tests",
     "workaround": "Code or approach to handle it",
     "permanent": false,
     "issueLink": "URL to bug tracker if bug filed",
     "affectsJourneys": ["JRN-####", "JRN-####"]
   }
   ```

**Example quirk:**
```json
{
  "id": "AQ007",
  "component": "Order submission form",
  "location": "/orders/create",
  "quirk": "Submit button can be double-clicked, creating duplicate orders",
  "impact": "Tests must prevent double-click or clean up duplicates",
  "workaround": "await submitButton.click(); await submitButton.waitFor({ state: 'disabled' });",
  "permanent": false,
  "issueLink": "https://jira.company.com/BUG-1234",
  "affectsJourneys": ["JRN-0003", "JRN-0012"]
}
```

### 17.5 Update Metrics

After verification complete:

1. **For each lesson applied**:
   ```
   IF test passed:
     lesson.metrics.successRate = (successCount + 1) / (totalCount + 1)
     lesson.metrics.lastSuccess = <ISO8601>
   ELSE:
     lesson.metrics.successRate = successCount / (totalCount + 1)

   lesson.metrics.occurrences += 1
   lesson.metrics.lastApplied = <ISO8601>

   # Recalculate confidence
   lesson.metrics.confidence = calculateConfidence(lesson)

   # ═══════════════════════════════════════════════════════════════
   # Update confidence history (for declining detection)
   # ═══════════════════════════════════════════════════════════════
   IF lesson.metrics.confidenceHistory IS NULL:
     lesson.metrics.confidenceHistory = []

   # Add current confidence to history
   lesson.metrics.confidenceHistory.push({
     "date": now().toISO8601(),
     "value": lesson.metrics.confidence
   })

   # Keep only last 90 days OR max 100 entries, whichever is smaller
   # This prevents unbounded growth while preserving useful history
   MAX_HISTORY_ENTRIES = 100
   lesson.metrics.confidenceHistory = lesson.metrics.confidenceHistory
     .filter(h => daysBetween(now(), h.date) <= 90)
     .slice(-MAX_HISTORY_ENTRIES)
   ```

2. **For each component used**:
   ```
   IF test passed:
     component.metrics.successRate = (successCount + 1) / (totalCount + 1)
   ELSE:
     # Investigate: Is it component issue or test issue?
     # If component issue, decrement successRate and add note

   component.metrics.lastUsed = <ISO8601>
   ```

3. **Update `analytics.json`**:
   - Recalculate `overview` totals
   - Recalculate `lessonStats.avgConfidence` and `avgSuccessRate`
   - Recalculate `componentStats.avgReusesPerComponent`
   - Update `impact.verifyIterationsSaved` if healing was used
   - Update `impact.avgIterationsAfterLLKB` running average
   - Identify `topPerformers` (sort by applications/uses and successRate)
   - Flag `needsReview` items:
     - Lessons with `confidence < 0.5`
     - Components with `totalUses < 2` and `age > 30 days`
     - Lessons with `successRate` declining over time

**Confidence calculation (MANDATORY ALGORITHM):**

```
FUNCTION calculateConfidence(lesson: Lesson) -> float:
  # ═══════════════════════════════════════════════════════════════
  # STEP 1: Calculate base score (occurrence-based)
  # ═══════════════════════════════════════════════════════════════
  # More occurrences = higher base confidence
  # Caps at 1.0 after 10 occurrences
  occurrences = lesson.metrics.occurrences
  baseScore = min(occurrences / 10.0, 1.0)

  # ═══════════════════════════════════════════════════════════════
  # STEP 2: Calculate recency factor (time decay)
  # ═══════════════════════════════════════════════════════════════
  # Lessons not used recently lose confidence
  # Decays by 30% over 90 days, floors at 0.7
  IF lesson.metrics.lastSuccess IS NOT NULL:
    daysSinceLastSuccess = daysBetween(now(), lesson.metrics.lastSuccess)
    recencyFactor = max(1.0 - (daysSinceLastSuccess / 90.0) * 0.3, 0.7)
  ELSE:
    # Never succeeded yet - use creation date
    daysSinceCreation = daysBetween(now(), lesson.metrics.firstSeen)
    recencyFactor = max(1.0 - (daysSinceCreation / 30.0) * 0.5, 0.5)

  # ═══════════════════════════════════════════════════════════════
  # STEP 3: Calculate success factor (effectiveness)
  # ═══════════════════════════════════════════════════════════════
  # Square root dampens the impact of low success rates
  # e.g., 0.64 success rate → 0.8 factor
  successRate = lesson.metrics.successRate
  successFactor = sqrt(successRate)

  # ═══════════════════════════════════════════════════════════════
  # STEP 4: Apply validation boost (human review)
  # ═══════════════════════════════════════════════════════════════
  # Human-reviewed lessons get 20% confidence boost
  IF lesson.validation.humanReviewed == true:
    validationBoost = 1.2
  ELSE:
    validationBoost = 1.0

  # ═══════════════════════════════════════════════════════════════
  # STEP 5: Calculate final confidence
  # ═══════════════════════════════════════════════════════════════
  rawConfidence = baseScore * recencyFactor * successFactor * validationBoost

  # Clamp to valid range [0.0, 1.0]
  confidence = min(max(rawConfidence, 0.0), 1.0)

  RETURN round(confidence, 2)
```

**Example calculations:**

| Scenario | occurrences | daysSince | successRate | humanReviewed | confidence |
|----------|-------------|-----------|-------------|---------------|------------|
| New lesson, first success | 1 | 0 | 1.0 | false | 0.10 |
| Used 5 times, recent, good | 5 | 7 | 0.80 | false | 0.44 |
| Used 10+ times, recent, great | 15 | 3 | 0.95 | false | 0.97 |
| Old lesson, not used recently | 8 | 60 | 0.75 | false | 0.55 |
| Human-reviewed, moderate use | 6 | 14 | 0.85 | true | 0.63 |

**Confidence thresholds (from config.yml):**
- **Auto-apply**: confidence ≥ `config.extraction.confidenceThreshold` (default 0.7)
- **Suggest only**: 0.4 ≤ confidence < 0.7
- **Needs review**: confidence < 0.4 → add to `analytics.needsReview.lowConfidenceLessons`

**Declining confidence detection:**
```
FUNCTION detectDecliningConfidence(lesson: Lesson) -> bool:
  # Compare current confidence to 30-day rolling average
  IF lesson.metrics.confidenceHistory IS NOT NULL:
    recent = lesson.metrics.confidence
    historical = average(lesson.metrics.confidenceHistory[-30:])
    IF recent < historical * 0.8:  # 20% decline
      RETURN true
  RETURN false
```

**Analytics update algorithm (MANDATORY):**

Call this function after modifying lessons or components to keep analytics.json in sync:

```
FUNCTION updateAnalytics(lessons: LessonsFile, components: ComponentsFile):
  analytics = loadJSON("${LLKB_ROOT}/analytics.json")

  # ═══════════════════════════════════════════════════════════════
  # STEP 1: Update overview totals
  # ═══════════════════════════════════════════════════════════════
  analytics.overview.totalLessons = lessons.lessons.length
  analytics.overview.activeLessons = lessons.lessons.filter(l => !l.archived).length
  analytics.overview.archivedLessons = (lessons.archived || []).length
  analytics.overview.totalComponents = components.components.length
  analytics.overview.activeComponents = components.components.filter(c => !c.archived).length
  analytics.overview.archivedComponents = components.components.filter(c => c.archived).length

  # ═══════════════════════════════════════════════════════════════
  # STEP 2: Update lesson statistics
  # ═══════════════════════════════════════════════════════════════
  activeLessons = lessons.lessons.filter(l => !l.archived)

  IF activeLessons.length > 0:
    # Calculate averages
    analytics.lessonStats.avgConfidence = round(
      average(activeLessons.map(l => l.metrics.confidence)), 2
    )
    analytics.lessonStats.avgSuccessRate = round(
      average(activeLessons.map(l => l.metrics.successRate)), 2
    )

    # Count by category
    # Valid categories: selector, timing, quirk, auth, data, assertion, navigation, ui-interaction
    FOR category in Object.keys(analytics.lessonStats.byCategory):
      analytics.lessonStats.byCategory[category] = activeLessons.filter(
        l => l.category === category
      ).length
  ELSE:
    analytics.lessonStats.avgConfidence = 0.0
    analytics.lessonStats.avgSuccessRate = 0.0

  # ═══════════════════════════════════════════════════════════════
  # STEP 3: Update component statistics
  # ═══════════════════════════════════════════════════════════════
  activeComponents = components.components.filter(c => !c.archived)

  # Count by category
  FOR category in Object.keys(analytics.componentStats.byCategory):
    analytics.componentStats.byCategory[category] = activeComponents.filter(
      c => c.category === category
    ).length

  # Count by scope
  FOR scope in Object.keys(analytics.componentStats.byScope):
    analytics.componentStats.byScope[scope] = activeComponents.filter(
      c => c.scope === scope
    ).length

  # Calculate reuse metrics
  IF activeComponents.length > 0:
    analytics.componentStats.totalReuses = sum(activeComponents.map(c => c.metrics.totalUses || 0))
    analytics.componentStats.avgReusesPerComponent = round(
      analytics.componentStats.totalReuses / activeComponents.length, 2
    )
  ELSE:
    analytics.componentStats.totalReuses = 0
    analytics.componentStats.avgReusesPerComponent = 0.0

  # ═══════════════════════════════════════════════════════════════
  # STEP 4: Identify top performers
  # ═══════════════════════════════════════════════════════════════
  # Top lessons: sort by (successRate * occurrences) - rewards both reliability and usage
  analytics.topPerformers.lessons = activeLessons
    .map(l => ({
      id: l.id,
      title: l.title,
      score: round(l.metrics.successRate * l.metrics.occurrences, 2)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  # Top components: sort by totalUses
  analytics.topPerformers.components = activeComponents
    .map(c => ({
      id: c.id,
      name: c.name,
      uses: c.metrics.totalUses || 0
    }))
    .sort((a, b) => b.uses - a.uses)
    .slice(0, 5)

  # ═══════════════════════════════════════════════════════════════
  # STEP 5: Flag items needing review
  # ═══════════════════════════════════════════════════════════════
  # Low confidence lessons (< 0.4)
  analytics.needsReview.lowConfidenceLessons = activeLessons
    .filter(l => l.metrics.confidence < 0.4)
    .map(l => l.id)

  # Lessons with declining success rate
  analytics.needsReview.decliningSuccessRate = activeLessons
    .filter(l => detectDecliningConfidence(l))
    .map(l => l.id)

  # Low usage components (< 2 uses and age > 30 days)
  analytics.needsReview.lowUsageComponents = activeComponents
    .filter(c => {
      uses = c.metrics.totalUses || 0
      age = daysBetween(now(), c.source.extractedAt)
      RETURN uses < 2 AND age > 30
    })
    .map(c => c.id)

  # ═══════════════════════════════════════════════════════════════
  # STEP 6: Save updated analytics
  # ═══════════════════════════════════════════════════════════════
  analytics.lastUpdated = now().toISO8601()
  saveJSONAtomic("${LLKB_ROOT}/analytics.json", analytics)
```

### 17.6 Learning Loop Integration (LLKB Learning API)

**Use the `@artk/core/llkb` learning API to record test outcomes back to LLKB for continuous improvement.**

```typescript
import {
  recordPatternLearned,
  recordComponentUsed,
  recordLessonApplied,
  recordLearning,
  formatLearningResult,
} from '@artk/core/llkb';
```

#### 17.6.1 Record Pattern Learned (After Selector Success/Failure)

When a selector pattern is validated during test execution:

```typescript
// After test step passes with a specific selector
const result = recordPatternLearned({
  journeyId: 'JRN-0001',
  testFile: 'tests/smoke/jrn-0001__user-login.spec.ts',
  prompt: 'journey-verify',
  stepText: 'Click the Save button',
  selectorUsed: {
    strategy: 'testid',
    value: 'btn-save',
  },
  success: true,
});

console.log(formatLearningResult(result));
// Learning recorded successfully
//   Entity: L015 (if matched existing lesson)
//   Updated metrics:
//     - Confidence: 0.85
//     - Success Rate: 0.92
//     - Occurrences: 15
```

#### 17.6.2 Record Component Used (After Module Reuse)

When a reusable component is applied during test generation:

```typescript
// After using an extracted component
const result = recordComponentUsed({
  journeyId: 'JRN-0001',
  testFile: 'tests/smoke/jrn-0001__user-login.spec.ts',
  prompt: 'journey-verify',
  componentId: 'COMP012',
  success: true,
});

console.log(formatLearningResult(result));
// Learning recorded successfully
//   Entity: COMP012
//   Updated metrics:
//     - Total Uses: 24
//     - Success Rate: 0.96
```

#### 17.6.3 Record Lesson Applied (After Fix Applied)

When a lesson from LLKB is explicitly applied during healing:

```typescript
// After applying a lesson fix during healing loop
const result = recordLessonApplied({
  journeyId: 'JRN-0001',
  testFile: 'tests/smoke/jrn-0001__user-login.spec.ts',
  prompt: 'journey-verify',
  lessonId: 'L042',
  success: true,
  context: 'Applied AG Grid wait pattern to fix timing issue',
});

console.log(formatLearningResult(result));
```

#### 17.6.4 CLI Integration

The learning API is also available via CLI:

```bash
# Record component usage
artk llkb learn --type component --id COMP012 --journey JRN-0001 --success

# Record lesson application
artk llkb learn --type lesson --id L042 --journey JRN-0001 --success --context "grid edit fix"

# Record pattern learned
artk llkb learn --type pattern --journey JRN-0001 --step "Click Save" \
  --selector-strategy testid --selector-value btn-save --success
```

#### 17.6.5 When to Call Learning Functions

| Event | Function | When |
|-------|----------|------|
| Test step passes | `recordPatternLearned` | After each successful locator interaction |
| Component imported and used | `recordComponentUsed` | When test uses `@artk/core` component |
| Healing fix applied | `recordLessonApplied` | After applying lesson from LLKB |
| Test passes after fix | `recordPatternLearned` | Validates the fix worked |

**The learning loop enables continuous improvement by:**
- Increasing confidence of successful patterns
- Tracking component usage for extraction prioritization
- Validating lessons with real test outcomes
- Detecting declining patterns that need review

### 17.7 Log Everything (History Event Logging)

**MANDATORY: All LLKB operations must be logged to history files for audit trail and analytics.**

#### 17.7.1 History File Location and Format

History files are append-only JSONL (JSON Lines) format:
- **Location**: `.artk/llkb/history/YYYY-MM-DD.jsonl`
- **Naming**: Based on current date (e.g., `2026-01-16.jsonl`)
- **Format**: One JSON object per line, no trailing commas

#### 17.7.2 Event Types and Schemas

**Event Schema (all events):**
```json
{
  "timestamp": "<ISO8601>",
  "event": "<event_type>",
  "id": "<entity_id>",
  "journey": "<JRN-####>",
  "prompt": "<originating_prompt>",
  "summary": "<human-readable summary>",
  "metadata": { /* optional additional data */ }
}
```

**Supported event types:**
| Event Type | When Logged | Required Fields |
|------------|-------------|-----------------|
| `lesson_created` | New lesson added to lessons.json | id, journey, summary |
| `lesson_updated` | Existing lesson metrics updated | id, journey, changes |
| `lesson_applied` | Lesson pattern used in test | id, journey, success |
| `component_extracted` | New component extracted | id, journey, summary |
| `component_used` | Existing component reused | id, journey, success |
| `quirk_discovered` | New app quirk found | id, journey, summary |
| `metrics_updated` | Analytics recalculated | summary |
| `config_changed` | LLKB config modified | changes |

#### 17.7.3 Implementation (Pseudocode)

```
FUNCTION appendToHistory(event: HistoryEvent) -> HistoryResult:
  TRY:
    # Determine file path
    today = formatDate(now(), "YYYY-MM-DD")
    historyPath = "${LLKB_ROOT}/history/" + today + ".jsonl"

    # Ensure history directory exists
    IF NOT exists("${LLKB_ROOT}/history/"):
      TRY:
        mkdir("${LLKB_ROOT}/history/")
      CATCH mkdirError:
        RETURN { success: false, error: "Cannot create history directory: " + mkdirError.message }

    # Build event JSON
    eventJson = {
      "timestamp": now().toISO8601(),
      "event": event.type,
      "id": event.id,
      "journey": event.journey,
      "prompt": "journey-verify",
      "summary": event.summary
    }

    # Append to file (atomic write)
    appendLine(historyPath, JSON.stringify(eventJson))

    RETURN { success: true, path: historyPath }

  CATCH error:
    # Graceful degradation - log warning but don't block workflow
    logWarning("LLKB history logging failed: " + error.message)
    RETURN { success: false, error: error.message }

# Usage: Always check result but don't block on failure
result = appendToHistory(event)
IF NOT result.success:
  # Log warning but continue with main workflow
  output("⚠️ History logging failed: " + result.error + " (non-blocking)")
```

#### 17.7.4 Required Logging Points

**After each LLKB operation, append to history:**

1. **After creating/updating a lesson (Step 17.1):**
   ```jsonl
   {"timestamp":"2026-01-16T10:30:00Z","event":"lesson_created","id":"L042","journey":"JRN-0005","prompt":"journey-verify","summary":"AG Grid cell selection requires aria-based targeting"}
   ```

2. **After extracting a component (Step 17.3):**
   ```jsonl
   {"timestamp":"2026-01-16T10:31:00Z","event":"component_extracted","id":"COMP015","journey":"JRN-0005","prompt":"journey-verify","summary":"Extracted verifySidebarReady from JRN-0002, JRN-0005, JRN-0010"}
   ```

3. **After discovering a quirk (Step 17.4):**
   ```jsonl
   {"timestamp":"2026-01-16T10:32:00Z","event":"quirk_discovered","id":"AQ007","journey":"JRN-0005","prompt":"journey-verify","summary":"Order form double-click creates duplicates"}
   ```

4. **After applying a lesson pattern:**
   ```jsonl
   {"timestamp":"2026-01-16T10:33:00Z","event":"lesson_applied","id":"L001","journey":"JRN-0005","prompt":"journey-verify","success":true}
   ```

5. **After reusing a component:**
   ```jsonl
   {"timestamp":"2026-01-16T10:34:00Z","event":"component_used","id":"COMP020","journey":"JRN-0005","prompt":"journey-verify","success":true}
   ```

6. **After updating analytics (Step 17.5):**
   ```jsonl
   {"timestamp":"2026-01-16T10:35:00Z","event":"metrics_updated","id":"analytics","journey":"JRN-0005","prompt":"journey-verify","summary":"Updated stats: 43 lessons, 26 components, 0.83 avg confidence"}
   ```

#### 17.7.5 History Query Examples

**Find all lessons created for a journey:**
```bash
grep '"event":"lesson_created"' .artk/llkb/history/*.jsonl | grep '"journey":"JRN-0005"'
```

**Count events by type (last 7 days):**
```bash
cat .artk/llkb/history/2026-01-*.jsonl | jq -r '.event' | sort | uniq -c
```

**Find low-success lesson applications:**
```bash
grep '"event":"lesson_applied"' .artk/llkb/history/*.jsonl | grep '"success":false'
```

### 17.8 Output LLKB Learning Summary

Include in verification output:

```
LLKB Learning Summary:
─────────────────────────────────────────────────────────────────
Lessons Recorded:          2
  - L042: AG Grid cell selection (selector, high)
  - L043: Toast timing pattern (timing, medium)

Components Extracted:      1
  - COMP015: verifySidebarReady (navigation, app-specific)
    Replaces code in: JRN-0002, JRN-0005, JRN-0010

App Quirks Discovered:     1
  - AQ007: Order form double-click issue (workaround applied)

Metrics Updated:
  - Lessons total: 43 (+2)
  - Components total: 26 (+1)
  - Avg confidence: 0.83
  - Verify iterations saved (session): 2
─────────────────────────────────────────────────────────────────
```

---

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
- **Region-restricted environments**: stop, don't "assume" connectivity.
- **Shared accounts**: avoid parallel runs until data isolation is proven.
- **Flaky backends**: stabilize with explicit completion checks, not retries forever.
- **Retry side effects**: prefer tracing that captures the *first failure* when supported.
- **Non-deterministic UI** (feature flags/permissions): require actor/role clarification or mark blocked.

---

### Final Output (MANDATORY)
- [ ] "Next Commands" box displayed from file (READ, don't generate)

# MANDATORY: Final Output Section

**🛑 STOP - READ THE FILE, DON'T GENERATE**

You MUST read and display the contents of this file EXACTLY:

**File to read:** `.github/prompts/next-commands/artk.journey-verify.txt`

**Alternative path (if above not found):** `prompts/next-commands/artk.journey-verify.txt`

**Instructions:**
1. Use your file reading capability to read the file above
2. Display the ENTIRE contents of that file as a code block
3. Do NOT modify, summarize, or add to the file contents
4. Do NOT generate your own version - READ THE FILE

**If you cannot read the file**, display this fallback EXACTLY:
```
╔════════════════════════════════════════════════════════════════════╗
║  NEXT COMMANDS                                                      ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                     ║
║  1. (IF TESTS PASSED) Journey is complete! Implement another:       ║
║     /artk.journey-implement id=JRN-####                            ║
║                                                                     ║
║  2. (IF TESTS FAILED) Fix issues and re-run verification:           ║
║     /artk.journey-verify id=<JRN-ID>                               ║
║                                                                     ║
║  3. (IF FLAKY) Stabilize tests and re-verify:                       ║
║     /artk.journey-verify id=<JRN-ID> heal=auto                     ║
║                                                                     ║
║  4. (OPTIONAL) Run all tests for the tier:                          ║
║     npm run test:smoke   (or test:release, test:regression)        ║
║                                                                     ║
╚════════════════════════════════════════════════════════════════════╝
```

**Replace `<JRN-ID>` with the actual journey ID that was just verified (e.g., JRN-0001).**

**IMPORTANT:**
- Do NOT invent commands that don't exist.
- Only use commands from the handoffs section of this prompt.
