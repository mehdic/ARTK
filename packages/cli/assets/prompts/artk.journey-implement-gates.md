---
name: artk.journey-implement-gates
mode: agent
description: "Quality gates and finalization (Steps 8-15) — pre-compilation, validate, verify, learning recording, journey status update. Part of the journey-implement workflow; requires core steps (0-7.5) to be complete."
---

# ARTK /journey-implement-gates — Quality Gates + Finalization

> **DO NOT RUN DIRECTLY.** This is a sub-agent of `/artk.journey-implement`. It requires the core steps (0-7.5) to be complete before running. If you are running this directly, stop and run `/artk.journey-implement` instead.

This handles **Steps 8–15** of the journey-implement workflow:
1. **Pre-Compilation Validation** (Step 8)
2. **Update Journey draft links** (Step 9)
3. **Update module registry** (Step 10)
4. **Run /artk.journey-validate** (Step 11)
5. **Run /artk.journey-verify** (Step 12)
6. **Record Learning** (Step 12.5 — MANDATORY)
7. **Finalize Journey** (Step 13)
8. **Loop / Run instructions** (Steps 14-15)

---

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  CRITICAL REMINDER — READ BEFORE ANYTHING ELSE                           ║
# ╠═══════════════════════════════════════════════════════════════════════════╣
# ║                                                                           ║
# ║  1. ALL gates MUST pass before status=implemented                        ║
# ║     - /artk.journey-validate MUST pass                                   ║
# ║     - /artk.journey-verify MUST pass                                     ║
# ║     - tests[] MUST be non-empty                                          ║
# ║                                                                           ║
# ║  2. DO NOT skip Step 12.5 (Learning Recording)                           ║
# ║     - This step was being skipped in production → LLKB never improved   ║
# ║     - It is MANDATORY after successful verification                      ║
# ║                                                                           ║
# ║  3. DO NOT set status=implemented if ANY gate fails                      ║
# ║     - Keep status as clarified/defined                                   ║
# ║     - Capture failure reasons                                            ║
# ║                                                                           ║
# ║  4. DO NOT MODIFY FOUNDATION FILES                                       ║
# ║     - auth.setup.ts, env.ts, playwright.config.ts, fixtures/             ║
# ║     - If issues → tell user to re-run /artk.discover-foundation          ║
# ║                                                                           ║
# ║  5. EMPTY TESTS = INVALID (check BEFORE any gate)                       ║
# ║     - A test with no `await`, no `expect()`, or empty body is a stub    ║
# ║     - Stubs silently pass → false confidence                            ║
# ║     - Step 8.0 MUST catch these before proceeding                       ║
# ║                                                                           ║
# ║  6. SCENARIO COVERAGE AUDIT before finalization (Step 12.9)             ║
# ║     - Re-read the journey file AND the test file                        ║
# ║     - Verify EVERY acceptance criterion has a matching assertion         ║
# ║     - Verify EVERY procedural step is reflected in the test code        ║
# ║     - A test with code that doesn't match the journey is INVALID        ║
# ║                                                                           ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

---

# Step 8 — Pre-Compilation Validation (MANDATORY)

**BEFORE proceeding to validation gates, complete ALL checks on generated test files and modules.**

## 8.0 Empty-Stub Detection (MUST RUN FIRST)

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  CRITICAL: Check for empty test stubs BEFORE anything else              ║
# ║  Empty tests silently pass and give false confidence.                    ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

For EACH generated `.spec.ts` file, verify ALL of these:
- [ ] File contains at least one `await` statement (not just imports)
- [ ] File contains at least one `expect(` assertion
- [ ] File contains at least one `test.step(` block mapping to an acceptance criterion
- [ ] No test function has an empty body (`async ({ page }) => {}` or body with only comments)

**How to check:**
```bash
# Run in harnessRoot — flags any test file missing real code
for f in tests/{tier}/*.spec.ts; do
  has_await=$(grep -c "await " "$f" 2>/dev/null || echo 0)
  has_expect=$(grep -c "expect(" "$f" 2>/dev/null || echo 0)
  if [ "$has_await" -lt 1 ] || [ "$has_expect" -lt 1 ]; then
    echo "EMPTY STUB: $f (await=$has_await, expect=$has_expect)"
  fi
done
```

**If ANY empty stub found:**
```
╔════════════════════════════════════════════════════════════════════════════╗
║  EMPTY TEST STUB DETECTED — IMPLEMENTATION INVALID                        ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                            ║
║  File: {filename}                                                          ║
║  Problem: Test has no await/assertions — it passes without testing.        ║
║                                                                            ║
║  This is NOT a valid implementation. Go back to Phase 1 and either:        ║
║  1. Re-run AutoGen for this journey                                        ║
║  2. Implement manually if AutoGen cannot handle this journey               ║
║                                                                            ║
║  DO NOT proceed to validation gates with empty stubs.                      ║
╚════════════════════════════════════════════════════════════════════════════╝
```

**STOP and go back to Phase 1 for any empty stubs. Do NOT proceed.**

## 8.1 Pre-Compilation Checklist

After confirming no empty stubs, run the Pre-Compilation Validation Checklist from `.github/prompts/common/GENERAL_RULES.md`:

1. **Duplicate Function Check** — No function defined in multiple files
2. **ESM Import Path Check** — Directory imports include `/index`
3. **Import Usage Check** — No unused imports, unused params prefixed with `_`
4. **Path Alias Check** — Consistent import patterns
5. **Syntax Quick Check** — Template literals use backticks, no unclosed brackets

**Only proceed to Step 9 after ALL checks pass (including 8.0 empty-stub check).**

---

# Step 9 — Update Journey draft links (pre-gate)

Before running gates:
- Add new test path(s) to Journey `tests[]` (so verify can find them)
- Add a managed "implementation draft" block

**Do NOT set `status: implemented` yet.**

---

# Step 10 — Update module registry draft (optional)

If `updateModulesRegistry=true`, update `<harnessRoot>/modules/registry.json`:
- Add any new feature modules
- Update `journeyDependencies[JRN-####] = { foundation:[...], feature:[...] }`

---

# Step 11 — Run /artk.journey-validate (static gates)

If `postValidate=auto|true`:
- Execute: `/artk.journey-validate id=<JRN-####> harnessRoot=<harnessRoot> mode=<validateMode> strict=true`
- If it fails:
  - Fix violations (tags/imports/forbidden patterns)
  - Re-run validate
- If you cannot execute commands:
  - Output the exact `/artk.journey-validate ...` invocation as next step and stop before claiming success.

---

# Step 12 — Run /artk.journey-verify (run + stabilize)

If `postVerify=auto|true`:
- Execute: `/artk.journey-verify id=<JRN-####> harnessRoot=<harnessRoot> mode=<verifyMode> heal=<heal> healAttempts=<healAttempts> repeat=<repeatGate> failOnFlaky=<failOnFlaky>`
- If it fails:
  - Apply bounded fixes based on evidence (selectors/data/async)
  - Re-run verify until attempts exhausted or blocked

If verification cannot be executed (environment unreachable):
- Keep Journey status at clarified/defined
- Add a blocker note and print the required next step

---

# Step 12.5 — Record Learning (MANDATORY after successful verification)

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  MANDATORY: LLKB Learning Recording — DO NOT SKIP                       ║
# ╠═══════════════════════════════════════════════════════════════════════════╣
# ║  When verification PASSES, you MUST record successful patterns to LLKB. ║
# ║  This is how the system improves over time.                              ║
# ║                                                                          ║
# ║  WITHOUT this step:                                                      ║
# ║  - LLKB never learns which patterns work                                ║
# ║  - Future implementations repeat the same mistakes                      ║
# ║  - AutoGen confidence scores never improve                              ║
# ║  - Pattern promotion to core never happens                              ║
# ║                                                                          ║
# ║  You MUST output "LLKB LEARNING RECORDED" section as PROOF.             ║
# ║  If this section is missing → implementation is INCOMPLETE.             ║
# ║                                                                          ║
# ║  Skip ONLY if verification FAILED (don't record failed patterns).       ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

**If verification passed, run these commands to record learning:**

```bash
cd <ARTK_ROOT>/<harnessRoot>

# Record successful patterns discovered in this journey
# For each new selector pattern that worked:
artk llkb learn --type pattern --journey <JRN-ID> --success \
  --context "<element description>" \
  --selector-strategy testid \
  --selector-value "<selector value>"

# For each component that was reused successfully:
artk llkb learn --type component --id <COMP-ID> --journey <JRN-ID> --success

# For each lesson that was applied successfully:
artk llkb learn --type lesson --id <L-ID> --journey <JRN-ID> --success
```

**Example for a login journey:**
```bash
artk llkb learn --type pattern --journey JRN-0001 --success \
  --context "Login submit button" \
  --selector-strategy testid \
  --selector-value "login-button"

artk llkb learn --type component --id COMP-AUTH-001 --journey JRN-0001 --success
artk llkb learn --type lesson --id L-NAV-001 --journey JRN-0001 --success
```

**Output LLKB Learning Summary:**
```
╔════════════════════════════════════════════════════════════════════╗
║  LLKB LEARNING RECORDED                                            ║
╠════════════════════════════════════════════════════════════════════╣
║  Journey: {JRN-ID}                                                 ║
║  Verification: PASSED                                              ║
║                                                                    ║
║  Patterns recorded: {count}                                        ║
║  Components confirmed: {count}                                     ║
║  Lessons confirmed: {count}                                        ║
║                                                                    ║
║  LLKB confidence scores updated.                                   ║
║  Next journey will benefit from these learnings.                   ║
╚════════════════════════════════════════════════════════════════════╝
```

**If verification failed:**
```
╔════════════════════════════════════════════════════════════════════╗
║  LLKB LEARNING SKIPPED                                             ║
╠════════════════════════════════════════════════════════════════════╣
║  Journey: {JRN-ID}                                                 ║
║  Verification: FAILED                                              ║
║                                                                    ║
║  Only record patterns that pass verification.                      ║
║  Fix verification issues, then record learning.                    ║
╚════════════════════════════════════════════════════════════════════╝
```

---

# Step 12.9 — Scenario Coverage Audit (MANDATORY before finalization)

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  FINAL GATE: Does the test ACTUALLY implement the journey scenario?      ║
# ╠═══════════════════════════════════════════════════════════════════════════╣
# ║  Empty-stub detection (Step 8.0) catches tests with no code.            ║
# ║  This step catches tests that HAVE code but implement the WRONG thing   ║
# ║  or skip critical parts of the journey.                                  ║
# ║                                                                          ║
# ║  You MUST re-read the journey file and compare it against the test.     ║
# ║  Do NOT rely on memory — actually READ both files.                      ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

**Procedure (do this for EACH journey implemented in this session):**

1. **Re-read the Journey file** — open and read the full journey markdown.
2. **Re-read the generated test file** — open and read the full .spec.ts.
3. **Walk through the audit checklist below**, checking each item.
4. **Output the audit table** (mandatory).

## Audit Checklist

### A. Acceptance Criteria Coverage

For EACH acceptance criterion (AC) listed in the journey:

| AC | Journey Text | Covered in Test? | How (test.step / assertion) |
|----|-------------|-------------------|----------------------------|
| AC-1 | _copy from journey_ | YES / NO / PARTIAL | _line or step name_ |
| AC-2 | ... | ... | ... |

**Rule:** Every AC MUST map to at least one `expect()` assertion. If any AC is missing → STOP, go back and implement it.

### B. Procedural Step Coverage

For EACH numbered procedural step in the journey:

| Step | Journey Text | Covered in Test? | How |
|------|-------------|-------------------|-----|
| 1 | _copy from journey_ | YES / NO / PARTIAL | _line or step name_ |
| 2 | ... | ... | ... |

**Rule:** Every navigation, click, fill, and verification step MUST be present. If a step is intentionally skipped (e.g., blocked, out of scope), document WHY.

### C. Structural Checks

- [ ] **Correct actor/role:** Test uses the auth fixture matching the journey's `actor` field (e.g., `authenticatedPage` for standard-user, `adminPage` for admin)
- [ ] **Correct route:** Test navigates to the URL(s) specified in the journey
- [ ] **Correct scope:** Test tags include `@scope-{journey.scope}`
- [ ] **Correct tier:** Test is in the right directory (`tests/smoke/`, `tests/release/`, `tests/regression/`)
- [ ] **Correct JRN tag:** Test has `@JRN-{id}` matching the journey ID
- [ ] **Data setup/cleanup:** If the journey mentions creating data, the test handles setup and cleanup

### D. Anti-Pattern Detection

- [ ] **No placeholder TODOs that skip real assertions** (e.g., `// TODO: verify` with no expect)
- [ ] **No commented-out test steps** that should be active
- [ ] **No hardcoded test data** that should come from fixtures/config
- [ ] **No `test.skip()` without documented reason**

## Output Format (MANDATORY)

```
╔════════════════════════════════════════════════════════════════════╗
║  SCENARIO COVERAGE AUDIT                                           ║
╠════════════════════════════════════════════════════════════════════╣
║  Journey: {JRN-ID} — {title}                                      ║
║  Test file: {path}                                                 ║
║                                                                    ║
║  Acceptance Criteria:  {covered}/{total} ({percentage}%)           ║
║  Procedural Steps:     {covered}/{total} ({percentage}%)           ║
║  Structural Checks:    {passed}/{total}                            ║
║  Anti-patterns found:  {count}                                     ║
║                                                                    ║
║  Verdict: {PASS | FAIL | PARTIAL}                                  ║
║                                                                    ║
║  {If FAIL or PARTIAL:}                                             ║
║  Missing:                                                          ║
║    - AC-{n}: {description}                                         ║
║    - Step {n}: {description}                                       ║
║    - {structural issue}                                            ║
╚════════════════════════════════════════════════════════════════════╝
```

**If verdict is FAIL:** STOP. Go back to Phase 1 and implement the missing parts. Do NOT finalize.

**If verdict is PARTIAL (>80% coverage):** Proceed to Step 13 but document what's missing and why. Add TODO comments in the test file for missing items.

**If verdict is PASS:** Proceed to Step 13.

---

# Step 13 — Finalize Journey as implemented (only after gates pass)

**If validate AND verify both pass:**
- Set Journey `status: implemented`
- Ensure `tests[]` is non-empty and deduped
- Add/update managed blocks:
  - `<!-- ARTK:IMPLEMENT:BEGIN --> ... <!-- ARTK:IMPLEMENT:END -->`
  - `<!-- ARTK:VERIFY:BEGIN --> ... <!-- ARTK:VERIFY:END -->`
- Regenerate backlog/index:
  - Preferred: `node <ARTK_ROOT>/tools/journeys/generate.js --artkRoot <ARTK_ROOT>`
  - Or: `npm run journeys:generate`

**If either gate fails:**
- Do NOT set implemented
- Keep status clarified/defined and capture reasons

---

# Step 14 — Loop to Next Journey (Batch Execution — Serial Mode Only)

For subagent mode, batch looping is handled by the orchestrator.

**For serial mode:**
1. Verify LLKB was persisted (Step 7.5) — if not, go back and persist
2. Reset per-journey counters (`predictiveExtractionCount = 0`)
3. Output journey completion summary
4. Loop back to Step 1.2b for next journey

After all journeys complete:
```
═══════════════════════════════════════════════════════════════════
SERIAL BATCH EXECUTION COMPLETE

Journeys implemented: {count}/{total}
Total components created: {count}
Total components reused: {count}
═══════════════════════════════════════════════════════════════════
```

---

# Step 15 — Print run/debug instructions

Include:
- Run by tag: `npx playwright test --grep @JRN-####`
- Run by file path
- Debug: `--ui`, `--headed`
- Where to find report and traces

---

# Mode-based question policy

## QUICK (max 3 questions, blockers only)
- env/baseURL reachable?
- auth actor?
- deterministic data approach?

## STANDARD (default, max 8 questions)
Quick + async completion signals, compliance constraints, test splitting, module naming.

## MAX
Ask only when necessary: variants/negative flows, multi-actor correlation, feature flags, parallelism.

---

# Edge cases you MUST handle

- **SSO/MFA**: use external storageState provisioning, document.
- **Region-restricted env**: stop, propose runner-in-region.
- **Existing tests**: update/link, don't duplicate.
- **Downloads/new tabs/iframes**: use Playwright events and frame locators.
- **Flaky env**: use explicit completion signals or quarantine. No timing fixes.
- **AG Grid**: use `@artk/core/grid` helpers. Handle virtualization with `scrollToRow()`.
- **Subagent nesting**: subagents cannot spawn other subagents. Gates must run inline.

---

# LLKB Library Reference (@artk/core/llkb)

```typescript
import {
  loadJSON, saveJSONAtomic, updateJSONWithLock,
  calculateSimilarity, jaccardSimilarity, findSimilarPatterns, isNearDuplicate,
  inferCategory, inferCategoryWithConfidence, isComponentCategory,
  isDailyRateLimitReached, isJourneyRateLimitReached,
  appendToHistory, countTodayEvents, countPredictiveExtractionsToday,
  type LLKBConfig, type Lesson, type Component, type HistoryEvent,
} from '@artk/core/llkb';
```

| Function | Usage |
|----------|-------|
| `calculateSimilarity(code1, code2)` | Compare code patterns (returns 0-1) |
| `findSimilarPatterns(code, patterns)` | Find matching components |
| `inferCategory(code)` | Categorize code |
| `isDailyRateLimitReached(config, llkbRoot)` | Check extraction limit |
| `appendToHistory(event, llkbRoot)` | Log events |
| `updateJSONWithLock(path, updater)` | Safe concurrent updates |

---

# Completion checklist (print at end)

## MANDATORY OUTPUT SECTIONS (implementation invalid without these)
- [ ] **"LLKB Context Loaded"** section present (from Phase 1 / core sub-agent)
- [ ] **"AutoGen Execution"** section present with terminal output proof
- [ ] **"LLKB LEARNING RECORDED"** section present (from Step 12.5)
- [ ] **"SCENARIO COVERAGE AUDIT"** section present with AC/step coverage table (from Step 12.9)
- [ ] **No empty test stubs** — every .spec.ts has await + expect + test.step

## Quality gates
- [ ] **Pre-compilation** (Step 8) — all checks passed, no empty stubs
- [ ] **Journey draft links** updated (Step 9)
- [ ] **Module registry** updated (Step 10, if enabled)
- [ ] **/artk.journey-validate** passed (Step 11)
- [ ] **/artk.journey-verify** passed (Step 12)
- [ ] **LLKB learning recorded** (Step 12.5) — patterns, components, lessons
- [ ] **Scenario coverage audit** (Step 12.9) — all ACs covered, all steps present, verdict PASS
- [ ] **Journey finalized** (Step 13) — status=implemented only if gates passed
- [ ] **Backlog/index regenerated**

## Code quality
- [ ] Test files have `@JRN-####` and tier tags
- [ ] `@auth`/`@rbac` tags present when access control is asserted
- [ ] Tests use harness fixtures and foundation modules
- [ ] No hardcoded URLs; env loader used
- [ ] Web-first assertions; no sleeps

---

# Final Output (MANDATORY)

Read and display: `.github/prompts/next-commands/artk.journey-implement-gates.txt`

If that file doesn't exist, display:
```
╔════════════════════════════════════════════════════════════════════╗
║  NEXT COMMANDS                                                      ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                     ║
║  1. (IF VALIDATE FAILED) Fix issues and re-validate:               ║
║     /artk.journey-validate id=<JRN-ID>                             ║
║                                                                     ║
║  2. (IF VERIFY FAILED) Run verification again after fixes:          ║
║     /artk.journey-verify id=<JRN-ID>                               ║
║                                                                     ║
║  3. (OPTIONAL) Implement another journey:                           ║
║     /artk.journey-implement id=JRN-####                            ║
║                                                                     ║
║  4. (OPTIONAL) Run all tests for the tier:                          ║
║     npm run test:smoke   (or test:release, test:regression)        ║
║                                                                     ║
╚════════════════════════════════════════════════════════════════════╝
```

**Replace `<JRN-ID>` with the actual journey ID that was just implemented.**
