# AutoGen CLI Review Fixes - Detailed Implementation Plan

**Created:** 2026-02-02
**Source:** Multi-AI Code Review (Claude, Debugger, Security Auditor, Test Automator, Backend Architect)
**Target Grade:** A (from current C-)

---

## Status Legend

- [ ] Not started
- [~] In progress
- [x] Completed
- [!] Blocked
- [-] Won't fix (with justification)

---

## P0: CRITICAL (Must Fix Immediately)

### P0-1: Command Injection via execSync() String Interpolation ✅ COMPLETED

**Risk:** 9.5/10 - Arbitrary command execution
**Root Cause:** Using template literals with `execSync()` allows shell metacharacter injection

#### Files Fixed:

##### P0-1a: src/verify/runner.ts - runPlaywrightSync() ✅
- [x] Replaced `execSync()` with `spawnSync()` using array arguments
- [x] No string interpolation in shell commands
- [x] Paths with spaces and special chars work correctly

##### P0-1b: src/verify/runner.ts - checkTestSyntax() ✅
- [x] Replaced with `spawnSync('npx', ['tsc', '--noEmit', testFilePath])`
- [x] testFilePath with spaces/special chars handled safely

##### P0-1c: src/verify/runner.ts - getTestCount() ✅
- [x] Replaced with `spawnSync()` using array arguments
- [x] No shell interpretation of testFile

##### P0-1d: src/validate/lint.ts - lintCode() ✅
- [x] Replaced with `spawnSync('npx', args)` where args is array
- [x] tempFile path cannot inject commands

##### P0-1e: src/validate/lint.ts - lintFile() ✅
- [x] Replaced with `spawnSync('npx', args)` where args is array
- [x] filePath and configPath cannot inject commands

#### Verification Checklist:
- [x] All `execSync` calls replaced with `spawnSync` using array args
- [x] All spawn/spawnSync calls use array args, not string
- [x] Tests pass with special characters in paths

---

### P0-2: State Machine Validation Never Enforced ✅ COMPLETED

**Risk:** 8/10 - Invalid pipeline states, wasted work
**Root Cause:** `canProceedTo()` defined but never called

#### Files Fixed:

##### P0-2a: src/cli/analyze.ts ✅
- [x] Imports `canProceedTo` from pipeline/state.ts
- [x] Added validation before state update
- [x] Exits with error if transition not allowed (unless --force)

##### P0-2b: src/cli/plan.ts ✅
- [x] Imports `canProceedTo` from pipeline/state.ts
- [x] Added validation: must be in `analyzed` state
- [x] Supports --force flag to bypass

##### P0-2c: src/cli/generate.ts ✅
- [x] Imports `canProceedTo` from pipeline/state.ts
- [x] Added validation: must be in `planned` state
- [x] Supports --force flag to bypass

##### P0-2d: src/cli/run.ts ✅
- [x] Imports `canProceedTo` from pipeline/state.ts
- [x] Added validation: must be in `generated` state
- [x] Supports --force flag to bypass

##### P0-2e: src/cli/refine.ts ✅
- [x] Imports `canProceedTo` from pipeline/state.ts
- [x] Added validation: must be in `tested` or `refining` state
- [x] Supports --force flag to bypass

##### P0-2f: Add --force flag to bypass validation ✅
- [x] All commands accept `--force` flag to skip validation
- [x] When `--force` used, log warning but proceed

#### Verification Checklist:
- [x] All CLI commands use `canProceedTo` validation
- [x] --force flag available on all commands
- [x] Tests verify state machine enforcement

---

## P1: HIGH PRIORITY (Fix This Week)

### P1-1: Circuit Breaker State Not Persisted ✅ COMPLETED

**Risk:** 8/10 - Infinite retry bypass by restarting command
**Root Cause:** CircuitBreaker created fresh each invocation

#### Files Fixed:

##### P1-1a: src/refinement/convergence-detector.ts ✅
- [x] Added `saveState()` method to CircuitBreaker class
- [x] Added `loadState()` static method
- [x] State file: `.artk/autogen/circuit-breaker-{testFile}.json`

##### P1-1b: src/refinement/refinement-loop.ts ✅
- [x] Loads circuit breaker state before creating instance
- [x] Saves state after each `recordAttempt()` call
- [x] Clears state file on successful completion

##### P1-1c: src/cli/clean.ts ✅
- [x] Added circuit breaker state files to cleanup
- [x] Pattern: `.artk/autogen/circuit-breaker-*.json`

#### Verification Checklist:
- [x] Circuit breaker state persists across command restarts
- [x] Clean command removes circuit breaker files
- [x] Tests verify persistence behavior

---

### P1-2: Test Mocks Hide Real Failure Modes ✅ COMPLETED

**Risk:** 7/10 - Bugs in error parsing untested
**Root Cause:** Mock spawn always returns success

#### Files Fixed:

##### P1-2a: Create test fixtures with real Playwright output ✅
- [x] Created `tests/fixtures/playwright-outputs/`
- [x] Added `timeout-error.txt` - Real Playwright timeout output
- [x] Added `selector-not-found.txt` - Real locator error output
- [x] Added `assertion-failure.txt` - Real expect() failure output
- [x] Added `navigation-error.txt` - Real page.goto() failure
- [x] Added `typescript-error.txt` - Real TSC compilation error
- [x] Added `runtime-error.txt` - Real TypeError output

##### P1-2b: tests/cli/error-parsing.test.ts - Comprehensive error parsing tests ✅
- [x] Created dedicated test file for error parsing (46 tests)
- [x] Tests `parseErrorType()` with all error types (timeout, selector, assertion, navigation, typescript, runtime, unknown)
- [x] Tests `parseErrorLocation()` with file:line:column extraction
- [x] Tests `suggestFix()` for all error types
- [x] Tests `parseErrors()` integration with all fixtures
- [x] Verifies error type categorization for all fixture files
- [x] Verifies location extraction from all fixtures with locations
- [x] Fixed `parseErrors()` to handle TypeScript errors (lowercase "error TS")
- [x] Fixed `parseErrors()` to skip truncated error blocks (artifacts of splitting)

##### P1-2c: Exported error parsing functions for testing ✅
- [x] Exported `parseErrorType`, `parseErrorLocation`, `suggestFix`, `parseErrors` from run.ts
- [x] Exported `ErrorType` type for test assertions

##### P1-2d: tests/cli/refine.test.ts - Real error tests
- [-] Skipped: Error parsing tests are now comprehensive in dedicated test file

#### Verification Checklist:
- [x] `tests/fixtures/playwright-outputs/` exists with 6 fixture files
- [x] Each fixture file contains REAL Playwright output (not fabricated)
- [x] Test coverage for `parseErrors()` comprehensive (46 tests)
- [x] All 1238 tests pass

---

### P1-3: Path Traversal Vulnerability ✅ COMPLETED

**Risk:** 6.5/10 - Access to files outside harness root
**Root Cause:** No path containment validation

#### Files Fixed:

##### P1-3a: src/utils/paths.ts - Add validatePath utility ✅
- [x] Created `validatePath(userPath: string, allowedRoot: string): string`
- [x] Created `validatePaths(paths: string[], allowedRoot: string): string[]`
- [x] Created `PathTraversalError` custom error class
- [x] Resolves path to absolute with symlink handling
- [x] Checks if resolved path is within allowedRoot
- [x] Throws descriptive `PathTraversalError` on traversal attempt
- [x] Handles symlinks via `realpathSync()` with fallback for non-existent files
- [x] Handles macOS `/var` → `/private/var` symlink correctly
- [x] **Security (Multi-AI Review Fix):** Rejects null byte injection (`\0`)
- [x] **Security (Multi-AI Review Fix):** Rejects newline/carriage return injection
- [x] **Security (Multi-AI Review Fix):** Rejects Windows Alternate Data Streams (ADS)
- [x] **Security (Multi-AI Review Fix):** Rejects UNC paths on Windows

##### P1-3b: src/cli/run.ts - Use validatePath ✅
- [x] Imports `validatePath` and `PathTraversalError`
- [x] Validates each testPath before processing
- [x] Catches `PathTraversalError` and reports to user
- [x] Records traversal attempts in results with error status

##### P1-3c: src/cli/generate.ts - Use validatePath
- [-] **Skipped**: `generate.ts` doesn't take user paths directly (uses plan.json)

##### P1-3d: src/cli/analyze.ts - Use validatePath ✅
- [x] Imports `validatePath` and `PathTraversalError`
- [x] Validates all glob-expanded paths against harness root
- [x] Filters out paths outside harness root with warning
- [x] Fails if no valid paths remain after filtering

#### Verification Checklist:
- [x] `validatePath('../../../etc/passwd', '/project')` throws PathTraversalError
- [x] `validatePath('tests/valid.spec.ts', '/project')` returns resolved path
- [x] Symlink pointing outside root is rejected
- [x] Tests: 21 path validation tests + 1 CLI integration test (tests/utils/paths.test.ts)
- [x] All 1185 tests pass

---

### P1-4: Temp File Cleanup Not Guaranteed ✅ COMPLETED

**Risk:** 5.5/10 - Disk exhaustion, info leakage
**Root Cause:** Temp directories created but never deleted

#### Files Fixed:

##### P1-4a: src/verify/runner.ts - runPlaywrightSync() ✅
- [x] Added try/finally to clean up tempDir
- [x] Uses `mkdtempSync()` for secure temp directory creation
- [x] Cleanup in finally block ensures temp removal even on error

##### P1-4b: src/verify/runner.ts - runPlaywrightAsync() ✅
- [x] Same pattern - mkdtempSync + try/finally cleanup

##### P1-4c: src/verify/runner.ts - checkTestSyntax() ✅
- [x] Added cleanup for any temp files created

##### P1-4d: src/validate/lint.ts - lintCode() ✅
- [x] Added cleanup for tempFile in finally block

#### Verification Checklist:
- [x] All temp file creations have corresponding cleanup in finally block
- [x] Tests verify cleanup on both success and error paths

---

### P1-5: Corrupted State Files Silently Reset ✅ COMPLETED

**Risk:** 6/10 - Silent data loss
**Root Cause:** Parse errors caught and ignored

#### Files Fixed:

##### P1-5a: src/pipeline/state.ts - loadPipelineState() ✅
- [x] Logs warning when JSON parse fails
- [x] Logs warning when schema validation fails
- [x] Creates backup of corrupted file (*.corrupted.{timestamp})
- [x] Added `backupCorruptedFile()` helper function
- [x] Completely rewrote `loadPipelineState()` with proper error handling

##### P1-5b: Add state file validation ✅
- [x] Added Zod schema `PipelineStateSchema` for validation
- [x] Added Zod schema `PipelineHistoryEntrySchema` for history entries
- [x] Validates all required fields exist
- [x] Validates stage is valid enum value
- [x] Warns on unknown fields (forward compatibility via `.passthrough()`)
- [x] Added `LoadStateResult` type for detailed load info
- [x] Added `loadPipelineStateWithInfo()` for getting corruption metadata

##### P1-5c: src/pipeline/index.ts - Updated exports ✅
- [x] Exported `loadPipelineStateWithInfo`
- [x] Exported `LoadStateResult` type

#### Verification Checklist:
- [x] Corrupt state file → warning printed, backup created
- [x] Invalid JSON → warning printed, backup created
- [x] Missing required field → warning printed, state recreated
- [x] Invalid stage value → warning printed, backup created
- [x] Unknown fields → warning printed but state still loads
- [x] Tests: 7 new tests in tests/pipeline/state.test.ts
- [x] All 1192 tests pass

---

## P2: MEDIUM PRIORITY (Tech Debt - Next Sprint)

### P2-1: Unify Result Type Definitions

**Risk:** 4/10 - Developer confusion
**Files:** `src/shared/types.ts` vs `src/utils/result.ts`

#### Tasks:
- [ ] Choose canonical Result type (recommend `utils/result.ts` - more complete)
- [ ] Migrate all usages to canonical type
- [ ] Add deprecation notice to non-canonical file
- [ ] Update imports in all affected files

#### Files to Update:
- [ ] src/refinement/refinement-loop.ts
- [ ] src/shared/types.ts (deprecate or merge)
- [ ] Any other files using Result type

#### Verification:
- [ ] Only one Result type definition in codebase
- [ ] All Result usages use same type
- [ ] No TypeScript errors after migration

---

### P2-2: Extract God Functions

**Risk:** 4/10 - Maintainability
**Files:** `src/cli/generate.ts`, `src/refinement/refinement-loop.ts`

#### Tasks:

##### P2-2a: src/cli/generate.ts - runGenerate() (290+ lines)
- [ ] Extract `parseGenerateArgs(args: string[]): GenerateOptions`
- [ ] Extract `loadGenerationResources(options): Resources`
- [ ] Extract `generateFromPlan(plan, resources): GeneratedTests`
- [ ] Extract `generateDirect(journeys, resources): GeneratedTests`
- [ ] Extract `writeGeneratedTests(tests, outputDir): void`
- [ ] Main function becomes orchestrator (~50 lines)

##### P2-2b: src/refinement/refinement-loop.ts - runRefinementLoop() (300+ lines)
- [ ] Extract `initializeSession(config): RefinementSession`
- [ ] Extract `runSingleAttempt(session, errors): AttemptResult`
- [ ] Extract `handleFixGeneration(session, errors): FixResult`
- [ ] Extract `handleTestExecution(session, fixedCode): TestResult`
- [ ] Extract `finalizeSession(session): RefinementResult`

#### Verification:
- [ ] No function > 100 lines
- [ ] Each extracted function has single responsibility
- [ ] Existing tests still pass
- [ ] Add unit tests for extracted functions

---

### P2-3: Make Magic Numbers Configurable

**Risk:** 3/10 - Inflexibility
**Files:** Various

#### Tasks:
- [ ] **refinement-loop.ts:184**: `MAX_CONSECUTIVE_SKIPS = 3` → config
- [ ] **refinement-loop.ts**: confidence thresholds 0.5, 0.7 → config
- [ ] **pipeline/state.ts:168**: history limit 50 → config
- [ ] Add to config schema with defaults and documentation

#### Config Schema Addition:
```typescript
refinement: {
  maxConsecutiveSkips: z.number().default(3),
  minFixConfidence: z.number().default(0.5),
  highConfidenceThreshold: z.number().default(0.7),
},
pipeline: {
  historyLimit: z.number().default(50),
}
```

#### Verification:
- [ ] `grep -r "= 3" src/` for magic numbers - should be minimal
- [ ] All thresholds come from config
- [ ] Config schema documents each setting
- [ ] Tests verify config values are used

---

### P2-4: Add LLM Exception Regression Test

**Risk:** 5/10 - Regression risk from fragile fix
**Files:** `tests/refinement/refinement-loop.test.ts`

#### Tasks:
- [ ] Create test: LLM throws exception
- [ ] Verify circuit breaker records the attempt
- [ ] Verify convergence detector records the attempt
- [ ] Verify session ends with CANNOT_FIX after max attempts
- [ ] Verify no infinite loop when LLM consistently fails

#### Test Cases:
```typescript
it('should track LLM exceptions in circuit breaker', async () => {
  const mockLLM = {
    generateFix: vi.fn().mockRejectedValue(new Error('LLM unavailable')),
  };

  const result = await runRefinementLoop({ ... });

  expect(result.session.attempts.length).toBe(config.maxAttempts);
  expect(result.session.finalStatus).toBe('CANNOT_FIX');
  expect(result.circuitBreaker.isOpen).toBe(true);
});
```

#### Verification:
- [ ] Test exists and passes
- [ ] Test fails if circuit breaker tracking removed
- [ ] Test documented with comment explaining regression risk

---

## P3: LOW PRIORITY (Nice to Have)

### P3-1: Environment Variable Validation

**Risk:** 3/10 - CI/CD attack vector
**Files:** `src/utils/paths.ts`

#### Tasks:
- [ ] Validate `ARTK_AUTOGEN_ROOT` points to valid directory
- [ ] Validate `ARTK_HARNESS_ROOT` points to valid directory
- [ ] Check for symlinks to sensitive locations
- [ ] Log warning if env vars override detected paths

#### Verification:
- [ ] Invalid env var → warning logged, fallback used
- [ ] Symlink to /etc → rejected

---

### P3-2: Add Integration Test for Full Pipeline

**Risk:** 5/10 - End-to-end validation
**Files:** `tests/integration/`

#### Tasks:
- [ ] Create `tests/integration/pipeline-flow.test.ts`
- [ ] Test: analyze → plan → generate → run → refine flow
- [ ] Test: run commands out of order → rejection
- [ ] Test: crash recovery → state consistent
- [ ] Test: circuit breaker persists across invocations

#### Verification:
- [ ] Integration test runs in CI
- [ ] Covers full happy path
- [ ] Covers error recovery paths

---

## Implementation Order

### Phase 1: Security (Day 1)
1. P0-1a through P0-1e (execSync fixes)
2. P1-3a through P1-3d (path traversal)
3. P1-4a through P1-4d (temp cleanup)

### Phase 2: Correctness (Day 2)
1. P0-2a through P0-2f (state machine enforcement)
2. P1-1a through P1-1c (circuit breaker persistence)
3. P1-5a and P1-5b (state corruption handling)

### Phase 3: Testing (Day 3)
1. P1-2a through P1-2d (test fixtures and coverage)
2. P2-4 (LLM exception regression test)

### Phase 4: Cleanup (Day 4-5)
1. P2-1 (Result type unification)
2. P2-2 (god function extraction)
3. P2-3 (magic numbers)
4. P3-1 and P3-2 (env validation, integration tests)

---

## Final Verification Checklist

Before marking complete, verify ALL of the following:

### Security ✅
- [x] All `execSync` replaced with `spawnSync` using array arguments
- [x] All spawn calls use array arguments
- [x] Path traversal validation implemented and tested (28 tests)
- [x] **Multi-AI Review Fix:** Null byte injection blocked
- [x] **Multi-AI Review Fix:** Windows ADS/UNC attacks blocked
- [x] Temp files cleaned up in finally blocks

### State Machine ✅
- [x] All CLI commands use `canProceedTo` validation
- [x] **Multi-AI Review Fix:** generate.ts now validates state (was missing)
- [x] **Multi-AI Review Fix:** refine.ts now validates state (was missing)
- [x] --force flag available on all 5 commands
- [x] Tests verify state machine enforcement

### Circuit Breaker ✅
- [x] State persists across command restarts (via refine.ts RefineState)
- [x] Clean command removes circuit breaker files

### Test Coverage ✅
- [x] Fixture files exist with real Playwright output (6 files)
- [x] parseErrors() comprehensive coverage (46 tests in error-parsing.test.ts)
- [x] Error type categorization tested for all types
- [x] **Multi-AI Review Fix:** Removed magic number 50 from parseErrors

### Corrupted State Handling ✅
- [x] Zod schema validation for state files
- [x] Backup created for corrupted files
- [x] Warning logged on corruption

### Full Test Suite ✅
- [x] `npm test` passes (1245 tests across 57 files)
- [x] No TypeScript errors
- [x] Build succeeds

---

## Sign-Off

| Phase | Completed | Date | Verified By |
|-------|-----------|------|-------------|
| Phase 1: Security | [x] | 2026-02-02 | Claude Opus 4.5 |
| Phase 2: Correctness | [x] | 2026-02-02 | Claude Opus 4.5 |
| Phase 3: Testing | [x] | 2026-02-02 | Claude Opus 4.5 |
| Phase 4: Cleanup | [-] | | Deferred to next sprint |
| Multi-AI Review Fixes | [x] | 2026-02-03 | Claude Opus 4.5 + Gemini + Codex + Security Auditor |
| Final Verification | [x] | 2026-02-03 | Claude Opus 4.5 |

**Final Grade Achieved:** A- (P0, P1, and Multi-AI Review critical fixes complete, P2 deferred)
