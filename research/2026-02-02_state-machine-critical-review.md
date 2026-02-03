# Critical Review: Pipeline State Machine and Recovery Mechanisms

**Date:** 2026-02-02
**Reviewer:** Claude
**Confidence:** 0.95

---

## Executive Summary

**CRITICAL FINDING: The state machine is DECORATIVE, not ENFORCED.**

The pipeline state machine (`canProceedTo`) is defined but **NEVER CALLED** by any CLI command. Commands update state freely without validation. This means:

- Users can run commands out of order without warnings
- State transitions are tracked but not validated
- The entire state machine infrastructure is dormant code
- Recovery from crashes relies on partial state, not checkpoints

---

## 1. STATE MACHINE CORRECTNESS

### 1.1 Definition vs Enforcement

**State Machine Definition (state.ts:206-236):**
```typescript
export function canProceedTo(
  currentState: PipelineState,
  targetStage: PipelineStage
): { allowed: boolean; reason?: string } {
  const validTransitions: Record<PipelineStage, PipelineStage[]> = {
    initial: ['analyzed'],
    analyzed: ['planned', 'initial'],
    planned: ['generated', 'analyzed', 'initial'],
    generated: ['tested', 'planned', 'initial'],
    tested: ['refining', 'completed', 'generated', 'initial'],
    refining: ['tested', 'completed', 'blocked', 'initial'],
    completed: ['initial', 'analyzed'],
    blocked: ['initial', 'analyzed'],
  };
  // ... validation logic
}
```

**Analysis:**
- Well-defined state machine with clear transition rules
- Exported in `pipeline/index.ts` for public use
- **Has unit tests** (state.test.ts:178-241)

**CRITICAL FLAW:**
```bash
# Search for usage in CLI commands:
grep -r "canProceedTo" core/typescript/autogen/src/cli/*.ts
# Result: NO MATCHES (only in pipeline/index.ts export)
```

**Commands that update state WITHOUT validation:**
1. `analyze.ts:437` → `updatePipelineState('analyze', 'analyzed', true, ...)`
2. `plan.ts:535` → `updatePipelineState('plan', 'planned', true, ...)`
3. `generate.ts:338/361/565` → `updatePipelineState('generate', 'generated', ...)`
4. `run.ts:553` → `updatePipelineState('run', pipelineStage, ...)`
5. `refine.ts:544` → `updatePipelineState('refine', pipelineStage, ...)`

**All commands call `updatePipelineState` DIRECTLY**, bypassing `canProceedTo`.

### 1.2 Can the System Get Stuck?

**Yes, in the `blocked` state.**

From `state.ts:228-233`:
```typescript
if (currentState.isBlocked && !['initial', 'analyzed'].includes(targetStage)) {
  return {
    allowed: false,
    reason: `Pipeline is blocked: ${currentState.blockedReason}. Clean or re-analyze to continue.`,
  };
}
```

**But this check is NEVER ENFORCED** because commands don't call `canProceedTo`.

**Scenario:**
```bash
# User runs commands in sequence:
artk-autogen analyze journeys/*.md    # stage: analyzed
artk-autogen plan                     # stage: planned
artk-autogen generate                 # stage: generated
artk-autogen run tests/*.spec.ts      # stage: tested
artk-autogen refine                   # MAX_ATTEMPTS → blocked

# Now pipeline is blocked, but user can STILL run:
artk-autogen generate                 # NO ERROR, overwrites blocked state
artk-autogen run                      # NO ERROR, continues anyway
```

**Impact:** Users can bypass the `blocked` state and create inconsistent state.

### 1.3 Missing Validations

**Commands that should validate but don't:**

| Command | Should Check | Current Behavior |
|---------|-------------|------------------|
| `plan` | `stage === 'analyzed'` | Warns if `initial`, proceeds anyway |
| `generate` | `stage === 'planned'` | No check, accepts any stage |
| `run` | `stage === 'generated'` | No check, runs any test |
| `refine` | `stage === 'tested'` | No check, analyzes any results |

**Example: `plan.ts:444-447`**
```typescript
const pipelineState = loadPipelineState();
if (pipelineState.stage === 'initial') {
  console.warn('Warning: No analysis found. Consider running "artk-autogen analyze" first.');
}
// CONTINUES ANYWAY - no process.exit(1)
```

---

## 2. RECOVERY MECHANISMS

### 2.1 Crash Recovery

**What happens if CLI crashes mid-operation?**

| Stage | Persistent Artifacts | Recovery Possible? |
|-------|---------------------|-------------------|
| `analyzing` | None | ❌ Must re-run from scratch |
| `planning` | `.artk/autogen/analysis.json` exists | ✅ Can load analysis |
| `generating` | `.artk/autogen/plan.json` exists | ✅ Can resume |
| `testing` | Tests written to disk | ✅ Can re-run |
| `refining` | `.artk/autogen/refine-state-*.json` | ✅ Circuit breaker restores |

**Checkpointing Analysis:**

**Good:**
- `refine.ts:272-325` loads/saves refinement state with circuit breaker restoration
- Atomic writes in `state.ts:111-139` (write-to-temp + rename)
- Analysis/plan/results written as JSON artifacts

**Bad:**
- **No checkpointing during generation** (long-running operation)
- If generation crashes after 20 journeys, user must restart all 20
- No progress indicators or resume capability

### 2.2 Corrupted State Files

**Handling in `state.ts:84-102`:**
```typescript
export function loadPipelineState(baseDir?: string): PipelineState {
  const statePath = getAutogenArtifact('state', baseDir);

  if (!existsSync(statePath)) {
    return createEmptyState();
  }

  try {
    const content = readFileSync(statePath, 'utf-8');
    const state = JSON.parse(content) as PipelineState;

    if (state.version !== '1.0') {
      console.warn(`Pipeline state version mismatch: expected 1.0, got ${state.version}`);
    }

    return state;
  } catch {
    // Return empty state on parse error
    return createEmptyState();
  }
}
```

**Analysis:**
- ✅ Silently creates empty state on corruption (no crash)
- ⚠️ Logs warning on version mismatch but proceeds
- ❌ **No backup/recovery** if corruption happens
- ❌ User loses all history on corruption (50 entries max)

**Recommendation:** Keep last 3 state backups:
```
.artk/autogen/pipeline-state.json
.artk/autogen/pipeline-state.json.bak1
.artk/autogen/pipeline-state.json.bak2
```

### 2.3 Intermediate Results Persistence

**Analysis:**

| Command | Input | Output | Persisted? | Resumable? |
|---------|-------|--------|-----------|-----------|
| `analyze` | Journey files | `analysis.json` | ✅ Yes | ✅ Yes |
| `plan` | `analysis.json` | `plan.json` | ✅ Yes | ✅ Yes |
| `generate` | `plan.json` | Test files | ✅ Yes (to disk) | ❌ No resume |
| `run` | Test files | `results.json` | ✅ Yes | ✅ Yes |
| `refine` | `results.json` | `refine-state-*.json` | ✅ Yes | ✅ Yes |

**Critical Gap: `generate` command**

Generation is the **longest-running operation** (LLM calls for each journey) but has **NO incremental checkpointing**.

**Scenario:**
```bash
artk-autogen generate --plan plan.json
# Contains 50 journeys, each takes ~30s = 25 minutes total
# Crash after 40 journeys (20 minutes in)
# Result: ALL 40 generated tests LOST, must restart from 0
```

**Why?** `generate.ts:117-134` writes files ONLY at the end:
```typescript
// Write files
if (!dryRun) {
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  for (const test of allTests) {
    const filePath = join(outputDir, test.filename);
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, test.code, 'utf-8');
    // ...
  }
}
```

**Fix:** Write each test immediately after generation, track progress in state.

---

## 3. CIRCUIT BREAKER ANALYSIS

### 3.1 Does It Prevent Infinite Loops?

**Yes, when used correctly.**

**Design (convergence-detector.ts:38-244):**
```typescript
export class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private state: CircuitBreakerState;

  recordAttempt(errors: ErrorAnalysis[], tokenUsage?: TokenUsage): CircuitBreakerState {
    if (this.state.isOpen) {
      return this.state;
    }

    this.state.attemptCount++;

    // Check all conditions
    this.checkMaxAttempts();
    this.checkSameError();
    this.checkOscillation();
    this.checkTimeout();
    this.checkBudget();

    return this.state;
  }
}
```

**Conditions that trip circuit breaker:**
1. `MAX_ATTEMPTS` - Hard limit (default: 3)
2. `SAME_ERROR` - Same error fingerprint repeated N times (default: 2)
3. `OSCILLATION` - A-B-A-B error pattern detected
4. `TIMEOUT` - Total time exceeded (default: 5 minutes)
5. `BUDGET_EXCEEDED` - Token budget exhausted (default: 50k)

**Analysis:**
- ✅ Multiple safety nets
- ✅ Cannot be bypassed from within refinement loop
- ✅ Persisted across CLI invocations (`refine.ts:417-421`)

### 3.2 Can Circuit Breaker Be Bypassed?

**Yes, accidentally.**

**Scenario 1: User runs refine command repeatedly**
```bash
# Circuit breaker trips after 3 attempts
artk-autogen refine
# Output: "Refinement blocked: MAX_ATTEMPTS. Clean or re-analyze to continue."

# User ignores warning and runs again:
artk-autogen refine
# Circuit breaker RESTORED from saved state, still blocked
# ✅ CORRECT: Cannot bypass
```

**But...**

**Scenario 2: User runs different command**
```bash
artk-autogen refine
# Circuit breaker trips

# User runs clean:
artk-autogen clean
# State reset to 'initial'

# User regenerates:
artk-autogen generate
artk-autogen run
# ❌ NEW refinement session starts with fresh circuit breaker
```

**Is this a bug?** **No.** This is intentional - `clean` is the "escape hatch" for blocked state.

**But:** No warning that previous refinement was blocked. User might not realize they're repeating a failed attempt.

### 3.3 Interaction with Convergence Detector

**Good integration (refinement-loop.ts:156-199):**
```typescript
const circuitBreaker = new CircuitBreaker({
  ...DEFAULT_CIRCUIT_BREAKER_CONFIG,
  maxAttempts: config.maxAttempts,
  ...circuitBreakerConfig,
});
const convergenceDetector = new ConvergenceDetector();

// Track initial errors
convergenceDetector.recordAttempt(initialErrors);

// Main loop
while (true) {
  const analysis = analyzeRefinementProgress(
    session.attempts,
    circuitBreaker,
    convergenceDetector
  );

  if (!analysis.shouldContinue) {
    session.finalStatus = mapAnalysisToStatus(analysis.reason, currentErrors.length === 0);
    break;
  }
  // ...
}
```

**Combined Analysis Function (convergence-detector.ts:504-574):**
```typescript
export function analyzeRefinementProgress(
  _attempts: FixAttempt[],
  circuitBreaker: CircuitBreaker,
  convergenceDetector: ConvergenceDetector
): RefinementAnalysis {
  const cbState = circuitBreaker.getState();
  const convergenceInfo = convergenceDetector.getInfo();

  // Check circuit breaker first
  if (cbState.isOpen) {
    return {
      shouldContinue: false,
      reason: `Circuit breaker open: ${cbState.openReason}`,
      // ...
    };
  }

  // Check convergence trends
  if (convergenceInfo.trend === 'degrading') {
    return {
      shouldContinue: false,
      reason: 'Error count increasing - fixes are making things worse',
      recommendation: 'escalate',
    };
  }
  // ...
}
```

**Analysis:**
- ✅ Circuit breaker checked BEFORE convergence
- ✅ Convergence detector provides early stop signals (degrading/oscillating/stagnating)
- ✅ Both states persisted in `refine.ts:495-506`
- ✅ Both restored on CLI restart (`refine.ts:417-438`)

---

## 4. RACE CONDITIONS

### 4.1 Async Operations Without Proper Awaiting

**Checked all async functions for missing awaits:**

**✅ SAFE - All async operations properly awaited:**

1. `analyze.ts:437` - `await updatePipelineState(...)`
2. `plan.ts:535` - `await updatePipelineState(...)`
3. `generate.ts:338/361/565` - `await updatePipelineState(...)`
4. `run.ts:553` - `await updatePipelineState(...)`
5. `refine.ts:544` - `await updatePipelineState(...)`

**No floating promises detected.**

### 4.2 File Operations That Could Conflict

**Atomic State Writes (state.ts:111-139):**
```typescript
export async function savePipelineState(
  state: PipelineState,
  baseDir?: string
): Promise<void> {
  await ensureAutogenDir(baseDir);
  const statePath = getAutogenArtifact('state', baseDir);

  state.updatedAt = new Date().toISOString();
  const content = JSON.stringify(state, null, 2);

  // Atomic write: write to temp file in same directory, then rename
  // Rename is atomic on most filesystems (POSIX guarantees it)
  const tempPath = join(dirname(statePath), `.state-${process.pid}-${Date.now()}.tmp`);

  try {
    writeFileSync(tempPath, content, 'utf-8');
    renameSync(tempPath, statePath);
  } catch (err) {
    // Clean up temp file on error
    try {
      if (existsSync(tempPath)) {
        unlinkSync(tempPath);
      }
    } catch {
      // Ignore cleanup errors
    }
    throw err;
  }
}
```

**Analysis:**
- ✅ Uses write-to-temp + atomic rename pattern
- ✅ Temp file includes PID and timestamp (unique per process)
- ✅ Cleanup on error
- ✅ Rename is atomic on POSIX (Linux/Mac)

**BUT:**

**⚠️ Windows Caveats:**
- `renameSync` is NOT atomic on Windows if target exists
- Node.js will throw `EPERM` if another process has file open
- This is addressed by retry logic in `scripts/bootstrap.ps1` but NOT in CLI

**Potential Race Condition:**
```bash
# Terminal 1:
artk-autogen run tests/*.spec.ts &

# Terminal 2 (starts 1ms later):
artk-autogen refine &

# Both try to write pipeline-state.json
# On Windows: One wins, one gets EPERM
# On POSIX: Both succeed, last-write-wins (data loss)
```

**Current Protection:** None. Multiple concurrent CLI invocations can corrupt state.

**Fix:** Use file locking:
```typescript
import { open } from 'node:fs/promises';

async function savePipelineStateWithLock(state: PipelineState): Promise<void> {
  const lockPath = `${statePath}.lock`;
  let fd: FileHandle | undefined;

  try {
    // Acquire exclusive lock
    fd = await open(lockPath, 'wx');  // Fails if exists

    // Write state atomically
    await savePipelineState(state);

  } finally {
    // Release lock
    if (fd) await fd.close();
    await unlink(lockPath).catch(() => {});
  }
}
```

### 4.3 State Mutations During Async Operations

**Checked for mutations during async operations:**

**SAFE Pattern:**
```typescript
// refine.ts:413-438
const state = loadRefineState(result.testPath, maxAttempts);  // Load

const circuitBreaker = new CircuitBreaker({
  maxAttempts,
  initialState: state.circuitBreakerState,  // Immutable copy
});

// ... async operations ...

state.attempts.push({...});  // Mutate
saveRefineState(state);       // Save
```

**Analysis:**
- ✅ Load → Clone → Work → Mutate → Save pattern
- ✅ No shared mutable state across async boundaries
- ✅ Each CLI invocation has isolated state

**BUT:**

**⚠️ Lost Update Problem:**
```bash
# Terminal 1:
state = load()  # attempt: 1
# ... async work ...
state.attempts++  # attempt: 2
save(state)

# Terminal 2 (started during Terminal 1's async work):
state = load()  # attempt: 1 (doesn't see Terminal 1's update yet)
# ... async work ...
state.attempts++  # attempt: 2
save(state)  # OVERWRITES Terminal 1's save
```

**Current Protection:** None. Concurrent invocations can lose updates.

**Fix:** Optimistic locking:
```typescript
interface PipelineState {
  version: '1.0';
  revision: number;  // Add this
  // ...
}

async function savePipelineState(state: PipelineState): Promise<void> {
  const currentState = loadPipelineState();
  if (currentState.revision !== state.revision) {
    throw new Error('State was modified by another process. Reload and retry.');
  }
  state.revision++;
  // ... atomic write ...
}
```

---

## 5. SUMMARY OF BUGS FOUND

### Critical (System Broken)

1. **State machine not enforced** - `canProceedTo` is never called, all validation is bypassed
2. **Generate command not resumable** - Long-running operation with no checkpointing
3. **Concurrent CLI invocations corrupt state** - No file locking, lost updates possible

### Major (Degrades Experience)

4. **Blocked state can be accidentally bypassed** - User can `clean` and retry without warning
5. **No state backup on corruption** - Parse error destroys all 50 history entries
6. **Windows atomic write not guaranteed** - `renameSync` not atomic if target exists

### Minor (Edge Cases)

7. **Version mismatch only warns** - Should fail or migrate automatically
8. **Circuit breaker restoration not logged** - User doesn't know if previous session was blocked

---

## 6. RECOMMENDATIONS

### Immediate Fixes (P0)

**A. Enforce State Machine in Commands**

Add validation in `updatePipelineState`:
```typescript
export async function updatePipelineState(
  command: string,
  stage: PipelineStage,
  success: boolean,
  details?: Record<string, unknown>,
  baseDir?: string
): Promise<PipelineState> {
  const state = loadPipelineState(baseDir);

  // VALIDATE TRANSITION
  const validation = canProceedTo(state, stage);
  if (!validation.allowed) {
    throw new Error(
      `Invalid pipeline transition: ${validation.reason}\n` +
      `Run 'artk-autogen clean' to reset pipeline state.`
    );
  }

  // ... rest of function
}
```

**B. Add File Locking**

Use Node.js `fs.promises.open()` with exclusive flags:
```typescript
import { open } from 'node:fs/promises';

async function withLock<T>(
  lockPath: string,
  fn: () => Promise<T>
): Promise<T> {
  let fd;
  try {
    fd = await open(lockPath, 'wx');  // Exclusive create
    return await fn();
  } finally {
    if (fd) await fd.close();
    await unlink(lockPath).catch(() => {});
  }
}

export async function savePipelineState(state: PipelineState): Promise<void> {
  const lockPath = `${getAutogenArtifact('state')}.lock`;
  return withLock(lockPath, async () => {
    // ... atomic write logic ...
  });
}
```

**C. Add Generation Checkpointing**

Write tests incrementally:
```typescript
// generate.ts:79-110
for (const plan of plans) {
  const result = await generateJourneyTests(genOptions);
  allTests.push(...result.tests);

  // CHECKPOINT: Write immediately after each journey
  if (!dryRun) {
    for (const test of result.tests) {
      const filePath = join(outputDir, test.filename);
      mkdirSync(dirname(filePath), { recursive: true });
      writeFileSync(filePath, test.code, 'utf-8');
    }
  }

  // Update progress
  await updatePipelineState('generate', 'generated', true, {
    testsGenerated: allTests.length,
    inProgress: true,
  });
}
```

### Short-Term Fixes (P1)

**D. Add State Backups**

Rotate last 3 states:
```typescript
function rotateBackups(statePath: string): void {
  const bak2 = `${statePath}.bak2`;
  const bak1 = `${statePath}.bak1`;

  if (existsSync(bak1)) renameSync(bak1, bak2);
  if (existsSync(statePath)) renameSync(statePath, bak1);
}

export async function savePipelineState(state: PipelineState): Promise<void> {
  rotateBackups(statePath);
  // ... atomic write ...
}
```

**E. Add Blocked State Warning**

When user runs `clean` after blocked:
```typescript
// clean.ts
export async function runClean(args: string[]): Promise<void> {
  const state = loadPipelineState();

  if (state.isBlocked) {
    console.warn(`\n⚠️  WARNING: Pipeline was blocked: ${state.blockedReason}`);
    console.warn(`    Cleaning will reset this state. Consider fixing the root cause first.\n`);

    // Optional: require confirmation
    const { confirm } = await prompts({
      type: 'confirm',
      name: 'confirm',
      message: 'Continue with clean?',
      initial: false
    });

    if (!confirm) {
      console.log('Clean cancelled.');
      return;
    }
  }

  // ... rest of clean logic ...
}
```

### Long-Term Improvements (P2)

**F. Add Optimistic Locking**

Track state revision:
```typescript
interface PipelineState {
  version: '1.0';
  revision: number;  // New field
  // ...
}

export async function savePipelineState(state: PipelineState): Promise<void> {
  return withLock(lockPath, async () => {
    const current = loadPipelineState();

    if (current.revision !== state.revision) {
      throw new Error(
        'Pipeline state was modified by another process.\n' +
        'Reload state and retry the operation.'
      );
    }

    state.revision++;
    // ... atomic write ...
  });
}
```

**G. Add State Machine Visualization**

Help users understand valid transitions:
```typescript
export function getPipelineStateDiagram(): string {
  return `
Pipeline State Machine:

  initial ──analyze──> analyzed ──plan──> planned ──generate──> generated
                         │                   │                      │
                         │                   └──────────┐           │
                         └──────────┐                   │           │
                                    │                   │           │
                         ┌──────────┘                   └───────────┘
                         │                                          │
                         │                                        run
                         │                                          │
                         │                                          v
  blocked <──refine──> refining <──┐                            tested
     │                    │         │                              │
     │                    v         │                              │
     │                completed ────┘                              │
     │                    │                                        │
     └─────clean──────────┴──────────────────────────────────refine──>

Current stage: ${state.stage}
Valid next commands: ${getValidCommands(state.stage).join(', ')}
  `;
}
```

---

## 7. CONCLUSION

**Self-Stress Score: 7/10**

This review uncovered **fundamental architectural issues**. The state machine exists but is **not used**, creating a false sense of safety. The system is **not crash-resistant** for generation, and **not safe for concurrent use**.

**Key Takeaways:**
1. State machine is decorative, not enforced
2. Generation lacks checkpointing (critical for long operations)
3. No file locking (concurrent invocations corrupt state)
4. Circuit breaker works but can be bypassed via clean

**Priority:** Fix P0 issues (state validation, locking, checkpointing) before production use.

**Confidence Assessment:**
- **State Machine Analysis:** 1.0 (definitive proof of no enforcement)
- **Race Conditions:** 0.9 (covered async/file ops, minor edge cases possible)
- **Circuit Breaker:** 0.95 (thoroughly analyzed, one bypass scenario)
- **Recovery:** 0.9 (covered most scenarios, Windows edge cases remain)

**Overall Confidence:** 0.95

This review is complete and brutally honest as requested.
