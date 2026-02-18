---
name: artk.journey-implement-core
mode: agent
description: "Core implementation steps (0-7.5) — LLKB loading, AutoGen execution, manual fallback, LLKB recording. Part of the journey-implement workflow; orchestrator handles gates, validation, and handoffs."
---

# ARTK /journey-implement-core — LLKB + AutoGen + Implementation

> **DO NOT RUN DIRECTLY.** This is a sub-agent of `/artk.journey-implement`. It requires the orchestrator for quality gates (validate/verify), finalization, and handoffs. If you are running this directly, stop and run `/artk.journey-implement` instead.

This handles **Steps 0–7.5** of the journey-implement workflow:
1. **Locate ARTK root and detect harness** (Step 0)
2. **Load journey and validate readiness** (Step 1)
3. **Load LLKB context** (Step 2–2.5)
4. **Generate tests with AutoGen CLI** (Step 3 — PRIMARY)
5. **Pull discovery signals** (Step 4)
6. **Manual implementation fallback** (Step 5 — only if AutoGen fails)
7. **LLKB component recording and summary** (Steps 6–7.5)

The orchestrator handles Steps 8–15 (quality gates, finalization, learning).

---

# Non-Negotiables (repeated from orchestrator — high-priority rules)

1. **DO NOT OVERWRITE AUTOGEN OUTPUT.** When AutoGen succeeds with 0 blocked steps, the generated code IS the implementation. Do NOT rewrite it.
2. **DO NOT MODIFY FOUNDATION FILES.** Foundation files (auth.setup.ts, env.ts, playwright.config.ts, fixtures/) are created by /artk.discover-foundation. Journey-implement MUST NOT modify them.
3. **AutoGen is PRIMARY.** Must be attempted before any manual implementation. Manual is FALLBACK only.
4. **LLKB is MANDATORY.** Load and use LLKB context before ANY code generation.
5. **No secrets, no hardcoded URLs, no sleeps.** Always use foundation env/config loader + baseURL.
6. **Traceability:** Every test includes `@JRN-####`. Journey `tests[]` links to test paths.
7. **Status rule:** You may create test code, but you may NOT set Journey `status: implemented` — the orchestrator handles that after gates pass.
8. **EMPTY TESTS = INVALID.** A test with no `await`, no assertions, or an empty body is a stub that silently passes — NOT an implementation. Every test MUST contain: at least one `await` call, at least one `expect()`, at least one `test.step()` mapping to an acceptance criterion. If you produce empty stubs, you have FAILED.

---

# Research-backed design principles (do not violate)

- **Use Playwright locators + auto-wait**. Prefer user-facing attributes (role/name/label/test id).
- **Use web-first assertions** that wait and retry; for complex async, use `expect.poll` or `expect.toPass`.
- **Keep tests isolated**. Each test independently runnable.
- **Auth must reuse storageState** from setup project; never commit auth state.
- **Use tags** (`@JRN-####`, `@smoke/@release/@regression`, `@scope-*`).
- **Collect traces on failure** (not always).

---

# Step 0 — Locate ARTK_ROOT and detect harness language

- Find `ARTK_ROOT` from `artk.config.yml` or `artkRoot=`.
- Determine harness root (`harnessRoot`).
- **Set LLKB root path** (`LLKB_ROOT = ${harnessRoot}/.artk/llkb`).
- Detect TS vs JS from existing config and fixtures.
- Detect existing module registry and existing tests.
- Initialize session state:
  ```
  sessionState = {
    journeysRequested: parseJourneyList(userInput),
    journeysCompleted: [],
    predictiveExtractionCount: 0,
    startTime: now(),
    llkbRoot: `${harnessRoot}/.artk/llkb`
  }
  ```

---

# Step 1 — Load Journey(s) and validate readiness

## 1.1 Parse Journey List, Validate Batch Mode, Detect Environment

Parse journey list from user input. Validate `batchMode` parameter (serial | subagent).

**If `batchMode=subagent`:** Detect environment. `#runSubagent` ONLY works in VS Code local sessions.
- If NOT VS Code local → auto-fallback to serial mode with explanation.

**Batch size validation:**
- Hard limit: 50 journeys (STOP if exceeded)
- Soft limit: 10 journeys (warn but proceed)

**Output execution plan** showing mode, batch sizes, and journey order.

## 1.2a Execute Batch (Subagent Mode)

When `batchMode=subagent` and multiple journeys:
- Chunk journeys into batches of `batchSize` (default 3)
- For each batch, spawn subagents explicitly (write each `#runSubagent` call separately)
- Each subagent: Load LLKB → Load journey → Run AutoGen → Update frontmatter
- Subagents return: `{journeyId, status, testFiles[], newComponents[], errors[]}`
- Subagents do NOT write to LLKB files directly (prevents race conditions)
- After batch: merge LLKB updates with deduplication
  - Merge components: check ID match, then semantic similarity (>0.8 = merge usage)
  - Merge lessons: check ID match, update success rates
  - Persist merged LLKB to disk once per batch
- Output batch summary with success/failure counts
- After all batches: regenerate backlog/index once

## 1.2b For Each Journey (Serial Mode)

When `batchMode=serial` or single journey:
- Process journeys one at a time (Steps 1.3 through 14)
- LLKB persisted after each journey (next journey sees updates)

## 1.3 Load Single Journey

Parse Journey YAML frontmatter (must include): `id`, `title`, `status`, `tier`, `actor`, `scope`, `modules`, `tests[]`.

Extract from body: acceptance criteria, procedural steps, data strategy, async signals, compliance constraints.

**If not clarified:**
- If `allowNonClarified=false`: STOP, instruct `/artk.journey-clarify id=...`
- If `allowNonClarified=true`: generate skeleton, mark tests skipped, do NOT mark implemented.

---

# Step 2 — Load LLKB Context (MANDATORY — BEFORE ANY CODE GENERATION)

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  STOP: LLKB loading is MANDATORY — cannot be skipped                     ║
# ╠═══════════════════════════════════════════════════════════════════════════╣
# ║  You MUST complete this step BEFORE Step 3 (AutoGen) or any manual code. ║
# ║  You MUST output "LLKB Context Loaded" section as PROOF you did this.   ║
# ║  If this section is missing from your output → implementation INVALID.   ║
# ║  Without LLKB: no pattern reuse, no component matching, no learning.    ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

## 2.1 Check LLKB Availability (MANDATORY)

Validate LLKB structure — ALL of these files must exist:
- `${LLKB_ROOT}/config.yml`
- `${LLKB_ROOT}/components.json`
- `${LLKB_ROOT}/lessons.json`
- `${LLKB_ROOT}/learned-patterns.json`

If any missing → STOP with "LLKB STRUCTURE INVALID". Tell user to run `/artk.discover-foundation`.

If `config.yml` has `enabled: false` → STOP with "LLKB IS DISABLED".

**Seed pre-flight:** If `learned-patterns.json` has 0 patterns, run reseed:
```bash
cd <ARTK_ROOT>/<harnessRoot>
npx artk-autogen llkb-patterns reseed --llkb-root ${LLKB_ROOT}
```
If reseed fails → warn but continue (AutoGen still has 84 core patterns).

## 2.2 Load LLKB Data Files

```
components = loadJSON("${LLKB_ROOT}/components.json") OR { components: [] }
lessons = loadJSON("${LLKB_ROOT}/lessons.json") OR { lessons: [], globalRules: [], appQuirks: [] }
appProfile = loadJSON("${LLKB_ROOT}/app-profile.json") OR {}
learnedPatterns = loadJSON("${LLKB_ROOT}/learned-patterns.json") OR { patterns: [] }
discoveredPatterns = loadJSON("${LLKB_ROOT}/discovered-patterns.json") OR null

# Load discovery reports (critical for selectors)
discoveryReportsDir = "${HARNESS_ROOT}/reports/discovery"
discoveryData = {
  summary: loadJSON("${discoveryReportsDir}/summary.json") OR null,
  routes: loadJSON("${discoveryReportsDir}/routes.json") OR null,
  apis: loadJSON("${discoveryReportsDir}/apis.json") OR null
}
```

Use discovery data for test generation: prefer data-testid selectors, discovered routes, API endpoints, entity/form selectors.

## 2.3 Filter by Journey Scope (Heuristic)

Filter LLKB data for the current journey:

1. **Filter by scope:** Include `universal`, `framework:<detected>`, and `app-specific` items. Also include items whose `usageContext` matches journey step keywords.
2. **Filter by confidence:** Use `confidenceThreshold` from config (default 0.7). Keep items at or above threshold.
3. **Prioritize by relevance:** Score items by keyword match + confidence + recency + success rate. Sort by score descending.
4. **Include global rules and quirks** that match journey scope or routes.

## 2.4 Output LLKB Context Loaded Section (MANDATORY)

Output a box showing: statistics (components/lessons available vs relevant), available components for reuse, applicable lessons, known quirks, discovery report counts.

If LLKB is empty → output status and proceed.

---

# Step 2.5 — LLKB Pattern Summary (Informational)

AutoGen reads LLKB pattern files **internally** during code generation:
- `learned-patterns.json` — Seed patterns + recorded successes (Phase 1 matching)
- `discovered-patterns.json` — Framework packs + discovery pipeline output (Phase 2 matching)

No manual export step needed. AutoGen loads these files automatically.

**Output pattern statistics (MANDATORY):** Show learned pattern count, seed count, high-confidence count, discovered pattern count/sources.

**Discovery Pipeline (Optional):** If `discovered-patterns.json` doesn't exist, optionally run:
```bash
cd <ARTK_ROOT>/<harnessRoot>
npx artk-autogen llkb-patterns discover --project-root .. --llkb-root .artk/llkb
```
Skip if `/artk.discover-foundation` already ran the pipeline.

**Legacy Export (Optional):** If `autogen-llkb.config.yml` or `llkb-glossary.ts` exist from manual setup, pass them to AutoGen in Step 3.3.

---

# Step 3 — Generate Tests with AutoGen CLI (PRIMARY — MANDATORY)

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  AutoGen is PRIMARY — NOT optional.                                      ║
# ║  You MUST attempt AutoGen BEFORE any manual code generation.             ║
# ║  Manual implementation (Step 5) is a FALLBACK only.                      ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

## 3.1 Check AutoGen Settings from Frontmatter

Read `autogen` section from journey frontmatter:
- If `autogen.enabled === false` → skip to Step 5 (manual), output reason
- If `autogen.blockedSteps` present → note which steps need manual work after AutoGen
- If `autogen.machineHints === false` → warn about lower accuracy, suggest `/artk.journey-clarify`

## 3.2 Validate Modules Format

AutoGen requires `modules` as object with `foundation` and `features` arrays. If journey has array format, fix it before running AutoGen.

## 3.3 Run AutoGen CLI

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  YOU MUST ACTUALLY EXECUTE THIS COMMAND in terminal/bash.                ║
# ║  Do NOT assume AutoGen will fail. Do NOT skip to manual without trying.  ║
# ║  If you skip without execution → INVALID implementation.                 ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

From `<harnessRoot>/` directory:

```bash
# Dry run first
cd <ARTK_ROOT>/<harnessRoot>
npx artk-autogen generate "../journeys/{status}/{journey.file}" \
  -o tests/{tier}/ -m --dry-run

# If dry-run succeeds, actual generation
npx artk-autogen generate "../journeys/{status}/{journey.file}" \
  -o tests/{tier}/ -m
```

If optional LLKB config/glossary files exist, add `--llkb-config` and `--llkb-glossary` flags.

**How AutoGen uses LLKB (automatic):**
- Reads `learned-patterns.json` via `matchLlkbPattern()` Phase 1
- Reads `discovered-patterns.json` via Phase 2
- Records successful matches via `recordPatternSuccess()`
- 84 core patterns handle ~82% of steps; LLKB patterns supplement the rest

**Pipeline Commands (Advanced):** For complex journeys needing iteration, use: `analyze → plan → generate → run → refine`. Artifacts stored in `<harnessRoot>/.artk/autogen/`.

| Option | Description |
|--------|-------------|
| `-o, --output <dir>` | Output directory |
| `-m, --modules` | Also generate feature module files |
| `--dry-run` | Preview without writing |
| `--llkb-config <file>` | Optional custom LLKB config |
| `--llkb-glossary <file>` | Optional custom LLKB glossary |
| `--no-llkb` | Disable ALL LLKB pattern matching |
| `-q, --quiet` | Suppress output except errors |

## 3.4 Output AutoGen Results (MANDATORY)

Output a box showing: command run, result (SUCCESS/PARTIAL/FAILED), generated files, blocked steps, warnings.

### 3.4.1 Execution Verification (MANDATORY)

Your response MUST include VERBATIM terminal output showing: the exact command, complete output, evidence of execution.

**INVALID claims** (rejected): "AutoGen failed" without actual error, "vendored package may not work" (speculation), "I'll skip to manual" without evidence.

### 3.4.2 Error Diagnosis (Top 3)

**Error 1: Command Not Found** → Check vendor dir, re-run bootstrap, try direct node execution. Fallback only after ALL steps tried.

**Error 2: Journey/YAML errors** → Fix path or YAML syntax. NEVER fallback — always fixable.

**Error 3: Dependencies/Network** → Run npm install or retry with direct node execution.

**CRITICAL:** You MUST show attempted resolution steps BEFORE claiming "AutoGen failed".

## 3.5 Handle AutoGen Results

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  TRUST AUTOGEN OUTPUT — DO NOT OVERWRITE                                 ║
# ║  When AutoGen reports 0 blocked steps and generates complete tests:      ║
# ║  - The generated code IS the implementation                              ║
# ║  - Do NOT rewrite AutoGen output with manual code                        ║
# ║  - Proceed directly to Step 6 (Component Matching)                       ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

**If AutoGen succeeds (0 blocked steps):** Review code, verify selectors, confirm AC mapping → Run empty-stub check → Skip to Step 6.

**If AutoGen reports blocked steps:**
- **Option A (preferred):** Add machine hints to Journey, re-run AutoGen
- **Option B:** Manual implementation for blocked steps only (preserve AutoGen structure)

**If AutoGen fails entirely:** Output MANDATORY error box with actual error, troubleshooting attempted, reason for fallback → Then proceed to Step 5.

### 3.5.1 Empty-Stub Detection (MANDATORY after any code generation)

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  ANTI-STUB CHECK: Every generated test MUST have real code              ║
# ╠═══════════════════════════════════════════════════════════════════════════╣
# ║  After AutoGen generates files OR after manual implementation:          ║
# ║                                                                          ║
# ║  For EACH generated .spec.ts file, verify:                              ║
# ║  1. File contains at least one `await` statement                        ║
# ║  2. File contains at least one `expect(` assertion                      ║
# ║  3. File contains at least one `test.step(` block                       ║
# ║  4. No test function has an empty body (just `async ({ page }) => {}`)  ║
# ║                                                                          ║
# ║  CHECK METHOD: Read the generated file and search for these patterns.   ║
# ║  A test like this is INVALID:                                           ║
# ║    test('JRN-0006: Create Request', async ({ page }) => {});            ║
# ║    test('JRN-0006: Create Request', async ({ page }) => {              ║
# ║      // TODO                                                            ║
# ║    });                                                                   ║
# ║                                                                          ║
# ║  If ANY test is an empty stub:                                          ║
# ║  → DO NOT proceed to Step 6                                             ║
# ║  → Re-run AutoGen or implement manually                                 ║
# ║  → Output: "EMPTY STUB DETECTED — <filename> has no test logic"        ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

**Quick check command (run in terminal):**
```bash
# Check for empty test bodies — if this finds matches, tests are stubs
grep -l "async.*=>.*{" tests/{tier}/*.spec.ts | while read f; do
  if ! grep -q "await " "$f"; then
    echo "EMPTY STUB: $f (no await statements)"
  fi
  if ! grep -q "expect(" "$f"; then
    echo "EMPTY STUB: $f (no assertions)"
  fi
done
```

**If empty stubs detected:** Re-run AutoGen for that journey, or implement manually. Do NOT proceed with empty stubs.

---

# Step 4 — Pull discovery/testability signals (recommended)

If `useDiscovery=auto` and discovery outputs exist, load `docs/TESTABILITY.md` and/or `docs/DISCOVERY.md`.
Use to confirm: selector strategy, async risk zones, environment constraints, scope/route mapping.
Do not invent facts.

---

# Step 5 — Manual Test Implementation (FALLBACK ONLY)

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  FALLBACK: Only when AutoGen cannot generate tests.                      ║
# ║  Valid reasons: AutoGen failed, blocked steps, complex async,            ║
# ║  multi-actor coordination, domain-specific assertions.                   ║
# ║  If AutoGen succeeded with no blocked steps → SKIP THIS STEP.           ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

## 5.1 Strict gates and blocker resolution

If `strictGates=true`: enforce selector gate, data gate, environment gate.
If gate fails + `allowBlocked=false` → stop, add blocker note, print remediation.
If gate fails + `allowBlocked=true` → create skipped tests, do NOT set implemented.

## 5.2 Determine test plan

Default: one Journey = one main test. Split when: multiple independent outcomes, long flows with boundaries, multi-actor workflows, or `flakyBudget=low`.

## 5.3 File placement and naming (idempotent)

- Determine path based on strategy (per-journey or groupedByScope)
- Search existing tests for `@JRN-####` — update instead of duplicate
- If duplicates exist, pick most canonical, flag others

## 5.4 Module plan

- Verify foundation modules exist (auth, navigation, selectors, data). If missing → instruct `/artk.discover-foundation`.
- Create feature modules only when needed. Keep small and composable.

## 5.5 Selector strategy (resilience rules)

1. Prefer `getByRole` with name
2. Else `getByLabel`, `getByPlaceholder`
3. Else `byTestId` helper
4. CSS/XPath only as last resort with justification

Never rely on auto-generated class names or brittle `nth()`.

## 5.6 Waiting/async strategy (no sleeps)

- Use Playwright auto-wait
- Navigation: assert URL/title/heading
- Background jobs: `expect.poll` / `expect.toPass` with bounded timeouts
- `page.waitForTimeout()` is forbidden except as last resort with TODO

## 5.7 Data strategy

- Prefer API seed helpers. Namespace with `runId`. Cleanup if feasible.

## 5.8 Manual Test Writing Guidelines

**Import from ARTK Core Fixtures:**

```typescript
import { test, expect } from '@artk/core/fixtures';

test.describe('JRN-0001: User can view dashboard @JRN-0001 @smoke @scope-dashboard', () => {
  test('should display dashboard @JRN-0001', async ({
    authenticatedPage, config, runId, testData,
  }) => {
    await test.step('Navigate to dashboard', async () => {
      await authenticatedPage.goto('/dashboard');
      await expect(authenticatedPage.locator('h1')).toContainText('Dashboard');
    });
    await test.step('AC-1: Welcome message visible', async () => {
      await expect(authenticatedPage.getByRole('heading', { name: /welcome/i })).toBeVisible();
    });
  });
});
```

**Core Fixtures:** `authenticatedPage`, `adminPage`, `userPage`, `config`, `runId`, `testData`, `apiContext`

**Core utilities:** `byTestId` from `@artk/core/locators`, `expectToast`, `waitForLoadingComplete` from `@artk/core/assertions`, `agGrid` from `@artk/core/grid`

**Auth/RBAC tagging:** Add `@auth` if testing login/logout/redirects. Add `@rbac` if testing role-based access. Do NOT add for pure public pages.

**Mandatory tags:** `@JRN-####`, `@smoke`/`@release`/`@regression`, `@scope-<scope>`

Map each acceptance criterion to at least one assertion. No sleeps.

## 5.9 Record Blocked Step Patterns (Learning Loop)

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  When you manually implement a BLOCKED step from AutoGen, RECORD the     ║
# ║  pattern so LLKB can learn from it. Without this, blocked rates stay.    ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

For EACH blocked step implemented manually:
```bash
cd <ARTK_ROOT>/<harnessRoot>
artk llkb learn --type pattern --journey <JRN-ID> --success \
  --context "<original step text>" \
  --selector-strategy <testid|role|label|css> \
  --selector-value "<selector used>"
```

Output a summary box showing blocked steps fixed and patterns recorded.

---

# Step 6 — LLKB Component Matching and Usage Recording

## 6.1 Match Generated Code to Existing Components

For each step in generated test code, check LLKB components:

- **Score > 0.7:** AUTO-USE — import and call the component, record usage
- **Score > 0.4:** SUGGEST — show to user, let them decide
- **Score <= 0.4:** NO MATCH — write inline code

Apply lessons by confidence:
- **> 0.7:** Auto-apply pattern, add LLKB comment
- **>= 0.5:** Add suggestion comment only
- **< 0.5:** Skip

## 6.2 Predictive Reuse for New Patterns

When writing NEW inline code (no component match):
1. Is it a common UI pattern? (navigation, forms, tables, modals, notifications, loading)
2. Do other journeys have similar steps? (check `journeys/index.json`)
3. **Rate limits (MANDATORY):** Max 3 predictive extractions per journey, max 10 per day, min 3 lines, no near-duplicates (>0.8 similarity).
4. **Decision:** Likely reusable + passes limits → extract. Rate limit hit → mark `// LLKB: extraction candidate`. Unique → write inline.

## 6.3 Create Component for Extracted Patterns

Generate module file with `@component`, `@category`, `@scope`, `@extractedFrom` annotations. Add entry to `components.json`. Log to `history/<YYYY-MM-DD>.jsonl`. Increment session counter.

## 6.4 Record All Usage

- For each component used: update `usedInJourneys`, increment `totalUses`, update `lastUsed`, log to history.
- For each lesson applied: log to history with success status.

**Edge cases:** If LLKB suggests a wrong pattern (user overrides or test fails), log the override. After 3 overrides, flag for review. If circular component references detected, warn and suggest merge/extract. If pattern is stale (>90 days since validation), warn and proceed with caution.

---

# Step 7 — Output LLKB Summary (MANDATORY)

Output a box showing:
- Components reused (count + list)
- Components created (count + list)
- Lessons applied (count + list)
- Extraction candidates (count + list)
- AutoGen pattern matching stats (learned + discovered counts)
- Rate limits (session extractions / daily extractions)

---

# Step 7.5 — Persist LLKB Updates to Disk (MANDATORY)

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  LLKB MUST BE SAVED BEFORE MOVING TO NEXT JOURNEY OR GATES.             ║
# ║  DO NOT proceed to Step 8 or next journey without saving LLKB.           ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

**Mode-specific behavior:**
- **Subagent mode:** Orchestrator handles persistence after batch merge. Subagents do NOT write LLKB files directly.
- **Serial mode:** Persist after each journey.

**Required updates (serial mode):**

1. **Update `components.json`** — add new components, update usage stats for reused ones.
2. **Append to `history/<YYYY-MM-DD>.jsonl`** — component_created, component_used, lesson_applied events.
3. **Update `lessons.json`** — update success rates and lastApplied timestamps.

**Verification checklist before proceeding:**
- [ ] `components.json` written to disk
- [ ] `history/{YYYY-MM-DD}.jsonl` updated
- [ ] `lessons.json` updated if lessons applied
- [ ] LLKB Summary output includes accurate counts

---

# Final Output (MANDATORY)

Read and display the contents of: `.github/prompts/next-commands/artk.journey-implement-core.txt`

If that file doesn't exist, display:
```
╔════════════════════════════════════════════════════════════════════╗
║  CORE PHASE COMPLETE                                              ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  Steps 0-7.5 complete. Return to orchestrator for:                ║
║  - Step 8: Pre-Compilation Validation                             ║
║  - Steps 11-12: Validate + Verify gates                          ║
║  - Step 12.5: Learning Recording                                  ║
║  - Step 13: Finalize Journey status                               ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
```
