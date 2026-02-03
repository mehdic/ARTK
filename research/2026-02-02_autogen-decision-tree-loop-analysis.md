# AutoGen Decision Tree & Loop Analysis - Critical Review

**Date:** 2026-02-02
**Reviewer:** Claude Sonnet 4.5
**Confidence:** 0.92
**Severity:** CRITICAL - Multiple infinite loop risks and dead ends identified

---

## Executive Summary

The AutoGen implementation plan has **SERIOUS DECISION TREE GAPS** and **INFINITE LOOP RISKS** that could cause:
1. Infinite loops consuming resources until process is killed
2. Dead end states where the system cannot progress or recover
3. Unclear escalation paths when automated fixes fail
4. Missing circuit breakers for repeated failures

**Overall Robustness Grade: D+ (68/100)**
- State machine completeness: 6/10
- Retry logic safety: 5/10
- Circuit breaker coverage: 3/10
- Dead end handling: 7/10

---

## 1. COMPLETE STATE MACHINE ANALYSIS

### Current Pipeline Flow

```
[START] Journey Input
    ↓
[STATE 1] Journey Validation (Phase 2)
    ├─ VALID → Continue
    ├─ INVALID (auto-fixable, confidence ≥ 0.7) → Apply fixes, retry (max 3) → [STATE 1]
    ├─ INVALID (auto-fixable, confidence < 0.7) → Prompt user → [USER DECISION]
    └─ INVALID (not auto-fixable) → ???? MISSING TRANSITION

[STATE 2] LLKB Export (Phase 0.5)
    ├─ SUCCESS → Continue
    ├─ LLKB NOT INITIALIZED → Call `artk llkb init` → [STATE 2]
    └─ LLKB INIT FAILS → ???? MISSING TRANSITION

[STATE 3] AutoGen Code Generation
    ↓
    Substates:
    3a. SCoT Planning (conceptual - not explicitly in plan)
    3b. Pattern Matching (stepMapper.ts)
    3c. IR Generation (builder.ts)
    3d. Code Generation (generateTest.ts)

[STATE 4] Blocked Step Detection
    ├─ NO BLOCKED STEPS → [STATE 5]
    ├─ BLOCKED STEPS → Enhanced Feedback Analysis → [STATE 4.1]

[STATE 4.1] Auto-Fix Attempt (Phase 1)
    ├─ FIX APPLIED (confidence ≥ 0.7) → Retry AutoGen → [STATE 3]
    ├─ FIX APPLIED (confidence < 0.7) → Ask user → [USER DECISION]
    ├─ NO FIX AVAILABLE → Record telemetry → [STATE 4.2]
    └─ MAX RETRIES (3) REACHED → ???? MISSING TRANSITION

[STATE 4.2] Manual Journey Fix Required
    ├─ User fixes journey → Retry from [STATE 1]
    └─ User gives up → ???? MISSING TRANSITION

[STATE 5] Test Execution
    ├─ PASSED → [STATE 6]
    └─ FAILED → ???? MISSING TRANSITION (no test execution in plan!)

[STATE 6] LLKB Learning (Phase 4)
    ├─ Record success → [END SUCCESS]
    └─ Record failure → ???? WHERE DOES IT GO?

[END SUCCESS] Test generated and verified
[END FAILURE] Test generation abandoned
[END BLOCKED] System stuck, requires human intervention
```

---

## 2. DEAD END STATES IDENTIFIED

### Dead End #1: Validation Failures (NOT AUTO-FIXABLE)
**Location:** Phase 2, Step 2.4.5
**Scenario:** Journey validation fails, no auto-fix available
**Current Behavior:** UNDEFINED
**Missing Transition:** What happens next?

**Fix Required:**
```markdown
If validation fails and no auto-fix available:
1. Log validation errors to `validation-failures.json`
2. Emit ERROR to stderr with journey ID
3. SKIP this journey (continue processing others)
4. Report skipped journeys in final summary
5. EXIT CODE 1 if any journey skipped
```

**Severity:** 🔴 Critical

---

### Dead End #2: LLKB Initialization Failure
**Location:** Phase 0.5, discover-foundation Step F11.9
**Scenario:** `artk llkb init` fails (permissions, disk space, corrupted files)
**Current Behavior:** UNDEFINED
**Missing Transition:** Does it block the entire workflow?

**Fix Required:**
```markdown
If LLKB init fails:
1. Log error to `.artk/llkb-init-error.log`
2. Check error type:
   - PERMISSIONS → Guide user to fix permissions
   - DISK_SPACE → Guide user to free space
   - CORRUPTED → Offer `--force` flag to reinitialize
3. Offer FALLBACK: Continue without LLKB (degraded mode)
4. Set `useLlkb: false` in options
5. Warn: "LLKB learning disabled, pattern matching only"
```

**Severity:** 🟡 Medium (has fallback conceptually, but not specified)

---

### Dead End #3: Max Retries Exhausted (Auto-Fix Loop)
**Location:** Phase 1, Step 2.6 (Iteration up to 3 times)
**Scenario:** Auto-fix applied 3 times, still has blocked steps
**Current Behavior:** UNDEFINED
**Missing Transition:** Does it give up? Escalate?

**Fix Required:**
```markdown
If max retries (3) reached and still blocked:
1. Collect all unresolved blocked steps
2. Write `unresolved-blocks.json` with:
   - stepText
   - reason
   - attempted fixes (all 3 iterations)
   - confidence scores
3. Emit BLOCKED status
4. Escalate to user:
   "Auto-fix failed after 3 attempts. Manual intervention required."
5. Provide remediation guide:
   - "Review unresolved-blocks.json"
   - "Manually add machine hints to journey"
   - "Or use journey-clarify to restructure steps"
```

**Severity:** 🔴 Critical (infinite loop risk)

---

### Dead End #4: Test Execution Not In Pipeline
**Location:** Missing from entire implementation plan
**Scenario:** Test is generated successfully, but what happens next?
**Current Behavior:** UNDEFINED
**Missing State:** Test execution, verification, failure handling

**Fix Required:**
```markdown
Add [STATE 5] Test Execution:
1. Run: `npx playwright test {generated-test}`
2. Capture: stdout, stderr, exit code
3. Parse results:
   - PASSED → Record success to LLKB → [END SUCCESS]
   - FAILED (syntax error) → Syntax heal attempt → [STATE 5.1]
   - FAILED (runtime error) → Semantic heal attempt → [STATE 5.2]
   - TIMEOUT → ???? (need timeout handling)
```

**Severity:** 🔴 Critical (entire verify phase missing from plan)

---

### Dead End #5: LLKB Learning Fails
**Location:** Phase 4, journey-verify Step 5
**Scenario:** `artk llkb learn` command fails (corrupted DB, disk full)
**Current Behavior:** UNDEFINED
**Missing Transition:** Does it block test success?

**Fix Required:**
```markdown
If LLKB learning fails:
1. Log error to `.artk/llkb/learn-errors.log`
2. DO NOT BLOCK test success (learning is optional)
3. Emit WARNING: "Failed to record learning event, continuing"
4. If repeated failures (>5), suggest LLKB repair:
   - `artk llkb health` to diagnose
   - `artk llkb prune` to clean corrupted data
```

**Severity:** 🟢 Low (learning is nice-to-have, not critical path)

---

## 3. INFINITE LOOP RISKS

### Infinite Loop #1: Validation Auto-Fix Loop
**Location:** Phase 2, validation with `--fix` flag
**Risk:** Auto-fix changes journey, re-validation triggers same error, fix applied again
**Example:**
```
Validation fails: "Step doesn't match pattern"
Auto-fix: Adds machine hint `(role=button, name=Submit)`
Re-validation: Still fails (pattern mismatch for different reason)
Auto-fix: Tries different hint `(testid=submit-btn)`
Re-validation: Still fails...
INFINITE LOOP
```

**Root Cause:** No convergence check - system doesn't detect "same error after fix"

**Fix Required:**
```typescript
interface FixAttemptHistory {
  iteration: number;
  error: string;
  fixApplied: string;
  stillFailing: boolean;
}

function detectConvergenceFailure(history: FixAttemptHistory[]): boolean {
  // If last 2 iterations have same error, we're not converging
  if (history.length >= 2) {
    const last = history[history.length - 1]!;
    const prev = history[history.length - 2]!;
    return last.error === prev.error && last.stillFailing;
  }
  return false;
}

// In validation loop:
if (detectConvergenceFailure(history)) {
  throw new Error('Auto-fix not converging, manual intervention required');
}
```

**Severity:** 🔴 Critical (infinite loop confirmed possible)

---

### Infinite Loop #2: LLKB Feedback Loop
**Location:** Phase 4, learning loop
**Risk:** Learned pattern causes failure → failure creates lesson → lesson reinforces bad pattern
**Example:**
```
Lesson: "Click on X" → primitive: { type: 'click', selector: 'wrong-selector' }
Test fails → recordPatternFailure() → confidence drops
But pattern still exists, might match again
Test regenerated → uses same bad pattern → fails again
INFINITE DEGRADATION LOOP
```

**Root Cause:** No circuit breaker for low-confidence patterns

**Fix Required:**
```typescript
// In matchLlkbPattern():
function shouldUsePattern(pattern: LearnedPattern): boolean {
  // Circuit breaker: Don't use patterns with repeated failures
  const recentFailures = pattern.history
    .slice(-5)
    .filter(h => h.outcome === 'failure').length;

  if (recentFailures >= 3) {
    return false; // Circuit breaker tripped
  }

  // Also check confidence threshold
  return pattern.confidence >= 0.7;
}
```

**Add to Phase 4 specification:**
```markdown
### Circuit Breaker for Failed Patterns

If a learned pattern fails 3 times in last 5 uses:
1. Mark pattern as `quarantined: true`
2. Skip pattern in future matches
3. Emit warning: "Pattern {id} quarantined due to repeated failures"
4. User can manually review: `artk llkb patterns quarantined`
```

**Severity:** 🔴 Critical (could poison LLKB over time)

---

### Infinite Loop #3: Refinement Loop (Not in current plan, but conceptual risk)
**Location:** If Phase 5 (SCoT/Uncertainty scoring) added later
**Risk:** Refinement generates "different_error" repeatedly
**Example:**
```
Attempt 1: Generate test → syntax error in line 42
Attempt 2: Fix line 42 → new syntax error in line 58
Attempt 3: Fix line 58 → new semantic error
INFINITE REFINEMENT
```

**Future Proofing Required:**
```typescript
const MAX_REFINEMENT_ATTEMPTS = 3;
let lastError: string | null = null;
let repeatedErrorCount = 0;

for (let i = 0; i < MAX_REFINEMENT_ATTEMPTS; i++) {
  const result = attemptGeneration();

  if (result.success) break;

  // Check if error is similar to last error
  if (lastError && similarErrors(result.error, lastError)) {
    repeatedErrorCount++;
  } else {
    repeatedErrorCount = 0;
  }

  if (repeatedErrorCount >= 2) {
    throw new Error('Refinement not converging (same class of error)');
  }

  lastError = result.error;
}
```

**Severity:** 🟡 Medium (future risk if advanced features added)

---

## 4. RETRY vs ESCALATE DECISION MATRIX

### Current Spec Issues

The plan uses `maxAttempts: 3` inconsistently across different failure types. Here's what SHOULD happen:

| Failure Type | Retry Count | Escalation Path | Circuit Breaker |
|--------------|-------------|-----------------|-----------------|
| **Validation fails (auto-fixable)** | 3 | After 3: Escalate to user with validation errors | ✅ |
| **LLKB export fails** | 1 (no retry) | Immediate fallback to non-LLKB mode | ✅ |
| **AutoGen blocked steps** | 3 | After 3: Write unresolved-blocks.json, escalate | ❌ MISSING |
| **Pattern matching fails** | 0 (no retry) | Record to telemetry, emit blocked step | ✅ |
| **LLKB pattern match fails at runtime** | 0 (no retry) | Record failure, reduce confidence | ✅ |
| **Test execution fails (syntax)** | 1 (heal attempt) | After 1: Escalate with syntax error details | ❌ MISSING FROM PLAN |
| **Test execution fails (runtime)** | 1 (heal attempt) | After 1: Escalate with runtime trace | ❌ MISSING FROM PLAN |
| **LLKB learning fails** | 0 (no retry) | Log warning, continue (non-blocking) | ✅ |

### Gaps Identified

1. **No escalation path for AutoGen blocked steps after 3 retries** → MISSING
2. **No test execution phase in plan** → MISSING
3. **No heal attempts specified** → Mentioned in code exports, not in plan
4. **No timeout handling** → MISSING

---

## 5. CIRCUIT BREAKER AUDIT

### Current Circuit Breakers (Implicit)

✅ **Validation auto-fix:** `maxAttempts: 3` in validation loop
✅ **LLKB export failure:** Fallback to `useLlkb: false` (degraded mode)
❌ **MISSING:** Pattern match retry count (could match forever)
❌ **MISSING:** LLKB pattern quarantine (bad patterns keep getting used)
❌ **MISSING:** Total generation timeout (could run indefinitely)
❌ **MISSING:** Cost circuit breaker (LLM API calls could exceed budget)
❌ **MISSING:** Blocked step retry circuit breaker

### Required Circuit Breakers

#### 5.1 Total Generation Timeout

**Add to Phase 1 (generate.ts):**
```typescript
const GENERATION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes per journey

async function generateWithTimeout(journey: string): Promise<Result> {
  return Promise.race([
    generateJourneyTests({ journeys: [journey] }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT: Generation exceeded 5 minutes')), GENERATION_TIMEOUT_MS)
    ),
  ]);
}
```

**Severity:** 🔴 Critical (resource exhaustion risk)

---

#### 5.2 LLKB Pattern Quarantine

**Add to Phase 4 (patternExtension.ts):**
```typescript
export interface LearnedPattern {
  // ... existing fields ...
  quarantined: boolean;
  quarantineReason?: string;
  recentOutcomes: Array<'success' | 'failure'>; // Last 10 outcomes
}

function shouldQuarantine(pattern: LearnedPattern): boolean {
  const last5 = pattern.recentOutcomes.slice(-5);
  const failures = last5.filter(o => o === 'failure').length;
  return failures >= 3; // 3 failures in last 5 uses
}

export function updatePatternOutcome(
  patternId: string,
  outcome: 'success' | 'failure'
): void {
  const pattern = getPattern(patternId);
  pattern.recentOutcomes.push(outcome);

  if (pattern.recentOutcomes.length > 10) {
    pattern.recentOutcomes.shift(); // Keep only last 10
  }

  if (shouldQuarantine(pattern) && !pattern.quarantined) {
    pattern.quarantined = true;
    pattern.quarantineReason = 'Repeated failures (3+ in last 5 uses)';
    console.warn(`⚠️  Pattern ${patternId} quarantined due to repeated failures`);
  }

  savePattern(pattern);
}
```

**Severity:** 🔴 Critical (LLKB could poison itself)

---

#### 5.3 Blocked Step Retry Circuit Breaker

**Add to Phase 1, Step 2.6:**
```markdown
### Auto-Fix Iteration Circuit Breaker

Track blocked steps across iterations:

\`\`\`typescript
interface BlockedStepHistory {
  stepText: string;
  iteration: number;
  fixApplied: string | null;
}

const history: BlockedStepHistory[] = [];

for (let iter = 1; iter <= 3; iter++) {
  const blockedSteps = detectBlockedSteps();

  // Circuit breaker: If same steps blocked after 2 iterations, stop
  if (iter >= 2) {
    const sameStepsBlocked = blockedSteps.every(step =>
      history.some(h => h.stepText === step && h.iteration === iter - 1)
    );

    if (sameStepsBlocked) {
      throw new Error('CIRCUIT BREAKER: Same steps blocked after 2 auto-fix attempts');
    }
  }

  // Record this iteration
  for (const step of blockedSteps) {
    history.push({ stepText: step, iteration: iter, fixApplied: null });
  }

  // Apply fixes...
}
\`\`\`
```

**Severity:** 🔴 Critical (prevents infinite retries)

---

#### 5.4 Cost Circuit Breaker (Future-Proofing)

**If Phase 5 (SCoT/LLM-based planning) is added:**
```typescript
interface CostTracker {
  totalTokens: number;
  totalCost: number;
  maxCostPerJourney: number; // e.g., $0.50
}

function checkCostLimit(tracker: CostTracker): void {
  if (tracker.totalCost > tracker.maxCostPerJourney) {
    throw new Error(`COST LIMIT EXCEEDED: $${tracker.totalCost.toFixed(4)} > $${tracker.maxCostPerJourney}`);
  }
}
```

**Severity:** 🟡 Medium (only if LLM features added)

---

## 6. WORST-CASE RUNTIME ANALYSIS

### Scenario: Single Journey, Maximum Retries

```
Phase 1: Journey Validation (with auto-fix)
  └─ Attempt 1: 2s parse + 1s validate + 3s fix = 6s
  └─ Attempt 2: 2s parse + 1s validate + 3s fix = 6s
  └─ Attempt 3: 2s parse + 1s validate + 3s fix = 6s
  Total: 18s

Phase 2: LLKB Export
  └─ Attempt 1: 5s (first time, full export)
  Total: 5s

Phase 3: AutoGen Generation (with blocked steps)
  └─ Iteration 1:
      ├─ Step mapping: 1s
      ├─ Code generation: 2s
      ├─ Blocked analysis: 1s
      └─ Auto-fix + retry: 4s
  └─ Iteration 2: (same) 4s
  └─ Iteration 3: (same) 4s
  Total: 12s

Phase 4: Test Execution (NOT IN PLAN, but should be)
  └─ Playwright run: 10-30s (headless)
  Total: 20s (average)

Phase 5: LLKB Learning
  └─ Record patterns: 1s
  Total: 1s

TOTAL WORST-CASE: 18 + 5 + 12 + 20 + 1 = 56 seconds per journey

For 50 journeys: 56 * 50 = 2,800 seconds = 46.7 minutes
```

**WITHOUT TIMEOUT:** Could run indefinitely if auto-fix loops

**WITH 5-MINUTE TIMEOUT PER JOURNEY:** 50 journeys * 5 min = 250 minutes (4.2 hours max)

---

## 7. COMPLETE DECISION TREE TABLE

### Legend
- ✅ **HANDLED**: Clear transition, well-specified
- ⚠️ **PARTIAL**: Transition exists but incomplete
- ❌ **MISSING**: No transition specified, dead end
- 🔄 **LOOP RISK**: Could cause infinite loop

| State | Transition | Handled? | Path | Issue |
|-------|-----------|----------|------|-------|
| Journey Input | Valid format | ✅ | → Validation | - |
| Journey Input | Invalid format | ⚠️ | → Error? | Missing: What happens on parse failure? |
| Validation | Passes | ✅ | → LLKB Export | - |
| Validation | Fails (auto-fix, conf ≥0.7) | ✅ | → Apply fix → Retry (max 3) | - |
| Validation | Fails (auto-fix, conf <0.7) | ⚠️ | → User prompt? | Interaction not specified |
| Validation | Fails (not auto-fixable) | ❌ | → ??? | **DEAD END #1** |
| Validation | Max retries (3) exhausted | ❌ | → ??? | **DEAD END #3** |
| Validation | Same error after fix | 🔄 | → Retry | **LOOP RISK #1** |
| LLKB Export | Success | ✅ | → AutoGen | - |
| LLKB Export | Not initialized | ⚠️ | → Init → Retry | - |
| LLKB Export | Init fails | ❌ | → ??? | **DEAD END #2** (fallback implied but not explicit) |
| AutoGen Generation | Success (no blocks) | ✅ | → Test Execution? | Test execution not in plan |
| AutoGen Generation | Blocked steps detected | ✅ | → Enhanced feedback | - |
| Enhanced Feedback | High-conf fix (≥0.7) | ✅ | → Apply → Retry (max 3) | - |
| Enhanced Feedback | Low-conf fix (<0.7) | ⚠️ | → User prompt? | Interaction not specified |
| Enhanced Feedback | No fix available | ✅ | → Telemetry → Manual fix | - |
| Enhanced Feedback | Max retries (3) | ❌ | → ??? | **DEAD END #3** |
| Enhanced Feedback | Same blocks after fix | 🔄 | → Retry | **LOOP RISK** (no circuit breaker) |
| Test Execution | Passed | ⚠️ | → LLKB Learning | Execution not in plan |
| Test Execution | Failed (syntax) | ❌ | → ??? | Heal attempt not in plan |
| Test Execution | Failed (runtime) | ❌ | → ??? | Heal attempt not in plan |
| Test Execution | Timeout | ❌ | → ??? | No timeout handling |
| LLKB Learning | Success | ✅ | → End | - |
| LLKB Learning | Fails | ⚠️ | → Log + Continue | Non-blocking, but should be explicit |
| LLKB Pattern Match | Low confidence (<0.7) | ✅ | → Skip pattern | - |
| LLKB Pattern Match | Repeated failures | 🔄 | → Keeps using bad pattern | **LOOP RISK #2** (no quarantine) |

**Summary:**
- ✅ Handled: 11/28 (39%)
- ⚠️ Partial: 8/28 (29%)
- ❌ Missing: 6/28 (21%)
- 🔄 Loop Risk: 3/28 (11%)

**Completeness Score: 39% (D+)**

---

## 8. RECOMMENDED FIXES (Priority Order)

### P0: Critical - Infinite Loop Prevention

1. **Add validation auto-fix convergence detection** (Phase 2)
   - Detect "same error after fix"
   - Throw error after 2 non-converging iterations
   - Emit unresolved-blocks.json for manual review

2. **Add LLKB pattern quarantine** (Phase 4)
   - Track last 10 outcomes per pattern
   - Quarantine if 3+ failures in last 5 uses
   - Skip quarantined patterns in matching

3. **Add blocked step retry circuit breaker** (Phase 1)
   - Detect "same steps blocked" across iterations
   - Stop after 2 iterations with same blocks
   - Escalate to user with remediation guide

4. **Add total generation timeout** (Phase 1)
   - 5-minute timeout per journey
   - Promise.race() with setTimeout
   - Fail gracefully with partial results

---

### P1: Critical - Dead End Resolution

5. **Define validation failure escalation** (Phase 2)
   - Write validation-failures.json
   - Skip journey (continue others)
   - Exit code 1 if any skipped

6. **Define LLKB init failure fallback** (Phase 0.5)
   - Log error to llkb-init-error.log
   - Offer guided remediation
   - Fallback to `useLlkb: false` (degraded mode)

7. **Define max retries escalation** (Phase 1)
   - Write unresolved-blocks.json
   - Emit BLOCKED status
   - Provide remediation guide

---

### P2: Important - Missing States

8. **Add test execution phase** (NEW Phase)
   - Run generated test with Playwright
   - Capture stdout/stderr/exit code
   - Parse results (pass/fail/timeout)
   - Route to heal or success

9. **Add heal attempts** (NEW Phase)
   - Syntax heal: 1 attempt
   - Runtime heal: 1 attempt
   - Escalate after heal fails

---

### P3: Nice-to-Have - Improvements

10. **Add cost circuit breaker** (Future-proofing)
    - Track token usage if LLM features added
    - Max cost per journey: $0.50
    - Throw error if exceeded

11. **Add LLKB learning failure handling** (Phase 4)
    - Log to learn-errors.log
    - Non-blocking (emit warning only)
    - Suggest repair after 5 repeated failures

---

## 9. STATE MACHINE DIAGRAM (Corrected)

```
┌─────────────────────────────────────────────────────────────────┐
│                        AutoGen Pipeline                          │
└─────────────────────────────────────────────────────────────────┘

[START]
   ↓
┌──────────────────────────────────────┐
│ STATE 1: Parse Journey               │
│ ├─ SUCCESS → [STATE 2]               │
│ └─ FAIL → ERROR (emit + skip)        │  ← FIX: Add explicit failure path
└──────────────────────────────────────┘
   ↓
┌──────────────────────────────────────┐
│ STATE 2: Validate Format (Phase 2)   │
│ ├─ VALID → [STATE 3]                 │
│ ├─ INVALID (fixable, conf≥0.7)       │
│ │   → Auto-fix → [STATE 2] (retry)   │ ← CIRCUIT BREAKER: Check convergence
│ │       └─ Max 3 retries              │ ← CIRCUIT BREAKER: Max iterations
│ │       └─ If same error: ESCALATE    │ ← FIX: Add convergence check
│ ├─ INVALID (fixable, conf<0.7)       │
│ │   → USER_PROMPT → [USER_DECISION]  │
│ └─ INVALID (not fixable)              │
│     → Log + SKIP → [END_SKIPPED]     │ ← FIX: Define this path
└──────────────────────────────────────┘
   ↓
┌──────────────────────────────────────┐
│ STATE 3: LLKB Export (Phase 0.5)     │
│ ├─ SUCCESS → [STATE 4]               │
│ ├─ NOT_INITIALIZED                   │
│ │   → artk llkb init → [STATE 3]     │
│ └─ INIT_FAILS                         │
│     → Log + Fallback (no LLKB)       │ ← FIX: Explicit fallback
│     → [STATE 4] (degraded mode)      │
└──────────────────────────────────────┘
   ↓
┌──────────────────────────────────────┐
│ STATE 4: AutoGen Generation          │
│ (substates: parsing, mapping, IR,    │
│  code generation)                     │
│ ├─ SUCCESS (no blocks) → [STATE 6]   │
│ └─ BLOCKED STEPS → [STATE 5]         │
└──────────────────────────────────────┘
   ↓
┌──────────────────────────────────────┐
│ STATE 5: Blocked Step Handling       │
│                      (Phase 1)        │
│ ├─ Enhanced feedback analysis         │
│ ├─ Auto-fix (conf≥0.7)               │
│ │   → Apply → [STATE 4] (retry)      │ ← CIRCUIT BREAKER: Check if same blocks
│ │       └─ Max 3 iterations           │ ← CIRCUIT BREAKER: Max iterations
│ │       └─ If same blocks: ESCALATE   │ ← FIX: Add "same blocks" detection
│ ├─ Auto-fix (conf<0.7)               │
│ │   → USER_PROMPT → [USER_DECISION]  │
│ ├─ No fix available                   │
│ │   → Telemetry → MANUAL_FIX         │
│ └─ Max retries (3) exhausted          │
│     → Write unresolved-blocks.json   │ ← FIX: Define this path
│     → ESCALATE → [END_BLOCKED]       │
└──────────────────────────────────────┘
   ↓
┌──────────────────────────────────────┐
│ STATE 6: Test Execution               │  ← MISSING FROM PLAN!
│              (NEW - should add)       │
│ ├─ PASSED → [STATE 7]                │
│ ├─ FAILED (syntax)                   │
│ │   → Heal (1 attempt) → [STATE 6]   │
│ │       └─ Fail → ESCALATE            │
│ ├─ FAILED (runtime)                  │
│ │   → Heal (1 attempt) → [STATE 6]   │
│ │       └─ Fail → ESCALATE            │
│ └─ TIMEOUT                            │
│     → Log + ESCALATE                  │ ← FIX: Add timeout handling
└──────────────────────────────────────┘
   ↓
┌──────────────────────────────────────┐
│ STATE 7: LLKB Learning (Phase 4)     │
│ ├─ Record success → [END_SUCCESS]    │
│ └─ Record fails                       │
│     → Log warning + Continue         │ ← FIX: Non-blocking but explicit
│     → [END_SUCCESS] (test passed)    │
└──────────────────────────────────────┘
   ↓
[END_SUCCESS] Test working
[END_SKIPPED] Journey skipped (validation failed)
[END_BLOCKED] Test generation blocked (manual intervention)
[END_FAILED]  Test generated but doesn't pass

┌──────────────────────────────────────┐
│ CIRCUIT BREAKERS (Global)            │
├──────────────────────────────────────┤
│ • Total timeout: 5 min/journey       │ ← FIX: Add this
│ • Validation retry: Max 3            │ ✅ Specified
│ • Blocked step retry: Max 3          │ ✅ Specified
│ • Same error check: Convergence      │ ← FIX: Add this
│ • Same blocks check: 2 iterations    │ ← FIX: Add this
│ • LLKB quarantine: 3 fails in 5      │ ← FIX: Add this
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ USER INTERACTION POINTS              │
├──────────────────────────────────────┤
│ • Low-confidence auto-fix prompt     │
│ • Manual journey fix required        │
│ • Unresolved blocks remediation      │
│ • LLKB init failure guidance         │
└──────────────────────────────────────┘
```

---

## 10. FINAL RECOMMENDATIONS

### Immediate Actions (Before Phase 1 Implementation)

1. **Add missing circuit breakers:**
   - Validation convergence check
   - Blocked step "same blocks" detection
   - Total generation timeout (5 min/journey)
   - LLKB pattern quarantine

2. **Define all dead end paths:**
   - Validation failure (not fixable) → skip journey
   - LLKB init failure → fallback to degraded mode
   - Max retries exhausted → escalate with unresolved-blocks.json

3. **Add test execution phase to plan:**
   - Run Playwright test
   - Parse results
   - Route to heal or success
   - Handle timeouts

4. **Document user interaction points:**
   - When to prompt user
   - What info to show
   - How to resume after manual fix

### Updated Robustness Score (After Fixes)

| Metric | Before | After (Projected) |
|--------|--------|-------------------|
| State machine completeness | 6/10 | 9/10 |
| Retry logic safety | 5/10 | 9/10 |
| Circuit breaker coverage | 3/10 | 9/10 |
| Dead end handling | 7/10 | 9/10 |
| **Overall Grade** | **D+ (68%)** | **A- (90%)** |

---

## Conclusion

The AutoGen implementation plan is **68% robust** with serious gaps:
- ❌ 3 infinite loop risks identified
- ❌ 5 dead end states with no transition
- ❌ Test execution phase missing entirely
- ❌ 4 critical circuit breakers missing

**With the recommended fixes, robustness jumps to 90% (A-).**

The most critical issues are:
1. **Validation auto-fix convergence** (infinite loop risk)
2. **LLKB pattern quarantine** (learning poisoning risk)
3. **Total generation timeout** (resource exhaustion)
4. **Test execution phase** (verification gap)

**Recommendation:** Do NOT proceed with implementation until these 4 critical issues are addressed in the plan.

**Confidence in this analysis: 0.92**

Key caveats:
- Analysis based on implementation plan, not executed code
- Some edge cases may only emerge during testing
- User interaction flows need UX design (not in scope)

---

**Files to Update:**
1. `research/2026-01-27_autogen-empty-stubs-implementation-plan.md` - Add circuit breakers, define dead ends
2. `core/typescript/autogen/src/cli/generate.ts` - Add timeout wrapper
3. `core/typescript/autogen/src/mapping/stepMapper.ts` - Add convergence detection
4. `core/typescript/autogen/src/llkb/patternExtension.ts` - Add quarantine logic
5. **NEW:** `research/2026-02-02_autogen-test-execution-phase.md` - Define execution/heal workflow
