---
name: artk.journey-implement
description: "Phase 8: Turn a clarified Journey into stable Playwright tests + modules using the foundation harness. Includes post-implementation quality gates: /artk.journey-validate (static) and /artk.journey-verify (run + stabilize). Updates Journey status/tests links, module registry, backlog/index."
argument-hint: "mode=standard|quick|max artkRoot=<path> id=<JRN-0001> file=<path> harnessRoot=e2e tier=auto|smoke|release|regression testFileStrategy=per-journey|groupedByScope splitStrategy=auto|single|multi createFeatureModules=auto|true|false updateModulesRegistry=true|false useDiscovery=auto|true|false strictGates=true|false allowNonClarified=false|true allowBlocked=false|true authActor=auto|<role> multiActor=auto|true|false artifacts=inherit|minimal|standard|max redactPII=auto|true|false flakyBudget=low|medium|high postValidate=auto|true|false validateMode=quick|standard|max postVerify=auto|true|false verifyMode=quick|standard|max heal=auto|off healAttempts=2 repeatGate=auto|0|2|3 failOnFlaky=auto|true|false dryRun=true|false batchMode=subagent|serial batchSize=2|3|4|5 subagentTimeout=60000-600000 autogenMode=direct|pipeline multiSampling=auto|true|false"
agent: agent
tools: ['edit', 'search', 'runSubagent']
handoffs:
  - label: "1. IF VALIDATE FAILED - /artk.journey-validate: fix issues and re-validate"
    agent: artk.journey-validate
    prompt: "id=<JRN-ID>"
  - label: "2. IF VERIFY FAILED - /artk.journey-verify: run verification again after fixes"
    agent: artk.journey-verify
    prompt: "id=<JRN-ID>"
  - label: "3. OPTIONAL - /artk.journey-implement: implement another journey"
    agent: artk.journey-implement
    prompt: "id=JRN-####"
---

# ARTK /journey-implement — Implement Journey as Playwright Tests (Phase 8)

You are running **ARTK Phase 8**.

ARTK plugs into GitHub Copilot to help teams build and maintain **complete automated regression testing suites** for existing applications. Phase 8 turns a Journey contract into real Playwright tests that are stable, traceable, and consistent with the harness.

---

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  🛑 MANDATORY PRE-IMPLEMENTATION GATES — DO NOT SKIP                      ║
# ╠═══════════════════════════════════════════════════════════════════════════╣
# ║                                                                           ║
# ║  Before writing ANY test code, you MUST complete these gates IN ORDER:    ║
# ║                                                                           ║
# ║  GATE 1: Verify LLKB Exists (Step 2)                                      ║
# ║    □ Check `${LLKB_ROOT}/` directory exists                               ║
# ║    □ If missing → STOP and tell user to run /artk.discover-foundation     ║
# ║    □ Check `${LLKB_ROOT}/config.yml` has `enabled: true`                  ║
# ║    □ If disabled → STOP and tell user to enable LLKB                      ║
# ║                                                                           ║
# ║  GATE 2: Load LLKB Context (WHERE depends on mode)                        ║
# ║    Serial mode: Orchestrator loads LLKB and uses it directly              ║
# ║    Subagent mode: Each SUBAGENT loads LLKB in their own context           ║
# ║    □ Read `${LLKB_ROOT}/config.yml`                                       ║
# ║    □ Read `${LLKB_ROOT}/components.json`                                  ║
# ║    □ Read `${LLKB_ROOT}/lessons.json`                                     ║
# ║    □ Output "LLKB Context Loaded" section showing findings                ║
# ║                                                                           ║
# ║  GATE 2.5: Export LLKB for AutoGen (Step 2.5)                             ║
# ║    □ Run `artk llkb export --for-autogen --llkb-root ${LLKB_ROOT}`        ║
# ║    □ Generates autogen-llkb.config.yml and llkb-glossary.ts               ║
# ║    □ Output export statistics                                             ║
# ║    □ In subagent mode: Orchestrator runs export ONCE (not per subagent)   ║
# ║                                                                           ║
# ║  GATE 3: Use AutoGen CLI (Step 3)                                         ║
# ║    □ Run `npx artk-autogen generate` with --llkb-config and --llkb-glossary ║
# ║    □ Alternative: Use pipeline commands (analyze → plan → generate → run)  ║
# ║    □ Only use manual implementation if AutoGen fails or has blocked steps ║
# ║    □ In subagent mode, subagents run AutoGen (main agent does NOT)         ║
# ║                                                                           ║
# ║  Failure to complete these gates = INVALID implementation                 ║
# ║  LLKB is MANDATORY - cannot proceed if it doesn't exist.                  ║
# ║                                                                           ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

---

## ✅ AutoGen-First Gate (MANDATORY)

AutoGen is **always first**. Who runs it depends on batch mode:
- **batchMode=subagent (default):** each subagent runs AutoGen for its journey.
- **batchMode=serial:** the main agent runs AutoGen for each journey.

**AutoGen command must use a journey FILE PATH (not `--journey`):**
- `npx artk-autogen generate ../journeys/<status>/<JRN-ID>__*.md -o <testsDir> -m`

Only if AutoGen fails or reports blocked steps may you proceed to manual implementation.
Skipping AutoGen is INVALID.

---

## ⚠️ Terminal Access REQUIRED (STOP if unavailable)

**AutoGen requires terminal/bash access to run `npx` commands.**

**BEFORE proceeding, verify terminal access is available:**
1. Check if you can execute shell commands (e.g., `ls`, `pwd`, `npx --version`)
2. If terminal access is NOT enabled/available:

```
╔════════════════════════════════════════════════════════════════════════════╗
║  ⛔ TERMINAL ACCESS REQUIRED                                               ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                            ║
║  This command requires terminal/bash access to run AutoGen CLI.            ║
║                                                                            ║
║  Please enable terminal tools in your Copilot settings:                    ║
║  1. Open VS Code Settings (Ctrl+,)                                         ║
║  2. Search for "github.copilot.chat.terminalAccess"                        ║
║  3. Set to "enabled"                                                       ║
║  4. Re-run this command                                                    ║
║                                                                            ║
║  ❌ DO NOT proceed with manual implementation.                              ║
║  ❌ "Terminal not available" is NOT the same as "AutoGen failed".           ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
```

**STOP HERE if terminal is unavailable. Do NOT fall back to manual implementation.**

Manual implementation is ONLY allowed when:
- AutoGen command **runs** but exits with an error
- AutoGen reports specific blocked steps that cannot be resolved

"Terminal not available" ≠ "AutoGen failed". You must have terminal access.

---

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  🔄 BATCH EXECUTION POLICY — MULTIPLE JOURNEYS                            ║
# ╠═══════════════════════════════════════════════════════════════════════════╣
# ║                                                                           ║
# ║  When implementing MULTIPLE journeys (batch execution):                   ║
# ║                                                                           ║
# ║  DEFAULT MODE (batchMode=subagent): PARALLEL SUBAGENT EXECUTION           ║
# ║  ✅ Faster for large batches (processes N journeys in parallel)           ║
# ║  ✅ LLKB loaded by each subagent (better isolation)                       ║
# ║  ✅ LLKB export runs ONCE at orchestrator level (not per subagent)        ║
# ║  ⚠️  Auto-fallbacks to serial in non-VS Code environments                 ║
# ║                                                                           ║
# ║  FALLBACK MODE (batchMode=serial): SERIAL EXECUTION                       ║
# ║  ✅ Process journeys one at a time                                        ║
# ║  ✅ Works in ALL environments (VS Code, GitHub.com, CLI)                  ║
# ║  ⚠️  Slower for large batches                                             ║
# ║                                                                           ║
# ║  ENVIRONMENT DETECTION (MANDATORY for subagent mode):                     ║
# ║  Before using subagent mode, detect environment:                          ║
# ║  - VS Code local session: #runSubagent supported ✓                        ║
# ║  - GitHub.com Copilot Chat: #runSubagent NOT supported ✗                  ║
# ║  - CLI (Codex, Claude): #runSubagent NOT supported ✗                      ║
# ║  If NOT VS Code local → auto-fallback to serial mode                      ║
# ║                                                                           ║
# ║  If context was compacted: Re-read this section. Subagent is default.     ║
# ║                                                                           ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

---

This command must:
1) Convert a Journey (preferably `status: clarified`) into Playwright tests that follow the foundation harness conventions.
2) **Load LLKB context FIRST** to reuse existing components and apply learned patterns.
3) **Use AutoGen CLI as the PRIMARY approach** for test generation.
   - In subagent mode, subagents run AutoGen for their journey.
   - In serial mode, the main agent runs AutoGen for each journey.
   - Manual implementation is allowed only if AutoGen fails or reports blocked steps.
4) Create/extend **feature modules** only when needed (foundation modules are reused).
5) Run **quality gates**:
   - `/artk.journey-validate` (static rules + traceability)
   - `/artk.journey-verify` (actually run + stabilize tests)
6) Only then: update the Journey system of record (status + tests links), update module registry, regenerate backlog/index.

---

## Research-backed design principles (do not violate)
These are not "style preferences". They are how you avoid flaky, unreadable E2E suites:

- **Use Playwright locators + auto-wait**. Prefer user-facing attributes and explicit contracts (role/name/label/test id).
- **Use web-first assertions** that wait and retry; for complex async, use `expect.poll` or `expect.toPass` instead of sleeps.
- **Keep tests isolated**. Each test should be independently runnable and not depend on previous tests.
- **Auth must reuse storageState** created by the setup project and stored in an ignored directory; never commit it.
- **Local auth bypass**: do not add per-test conditionals. Use tags/projects so `@auth/@rbac` can be skipped or run per environment.
- **Use tags** (`@JRN-####`, `@smoke/@release/@regression`, `@scope-*`) so teams can filter runs via `--grep`.
- **Collect traces smartly**. Prefer traces retained on failure (and first-failure tracing where supported) rather than capturing everything always.

(These align with official Playwright capabilities: CLI filtering, retries, tracing, and tags.)

---

# Non‑Negotiables
- **No secrets**: never embed passwords/tokens. Ask for provisioning process only.
- **No hardcoded URLs**: always rely on foundation env/config loader + baseURL.
- **Idempotent**: reruns should update managed blocks and avoid duplicates.
- **Traceability is mandatory**:
  - every test includes `@JRN-####`
  - Journey `tests[]` links to test paths
- **No "flakiness fixes" using sleeps**. `page.waitForTimeout()` is forbidden except as last resort with justification + TODO.
- **Respect strict gates** by default (`strictGates=true`):
  - if selectors/data/env are blocked, do not "pretend-implement" the Journey.
- **LLKB is mandatory**: Load and use LLKB context before ANY code generation.
- **AutoGen is primary**: Use the AutoGen CLI; manual implementation is a fallback only.
- **Batch execution modes**:
  - `subagent` (default): Process in parallel batches using `#runSubagent` (auto-fallback to serial in non-VS Code environments)
  - `serial`: Process journeys one at a time (fallback mode for non-VS Code environments)
- **Status rule (important)**:
  - You may create test code before verification,
  - but you may set Journey `status: implemented` **only after**:
    1) `/artk.journey-validate` passes, and
    2) `/artk.journey-verify` passes (tests run green + stability gate),
    3) `tests[]` is non-empty and points to real files.

---

# Inputs
User must identify a Journey by:
- `id=JRN-####` (preferred) OR
- `file=journeys/.../*.md`
- **Multiple journeys**: `id=JRN-0001,JRN-0002,JRN-0003` OR `file=journeys/clarified/*.md`

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
- `batchMode`: subagent|serial (default: subagent)
  - `subagent`: Process journeys in parallel batches using `#runSubagent` (default, faster)
  - `serial`: Process journeys one at a time (fallback for non-VS Code environments)
- `batchSize`: 2|3|4|5 (default: 3) — journeys per parallel batch (only applies when batchMode=subagent)
- `subagentTimeout`: 60000-600000 (default: 300000 = 5 minutes) — max time per subagent before timeout
- `autogenMode`: direct|pipeline (default: direct)
  - `direct`: Single `generate` command (simple, recommended for most cases)
  - `pipeline`: Granular commands (analyze → plan → generate → run → refine) for complex journeys
- `multiSampling`: auto|true|false (default: auto)
  - When enabled, generates multiple code samples at different temperatures to improve quality
  - `auto`: Enable for complex journeys (many steps, conditionals, loops)

---

# Preconditions (must validate before writing code)
1) ARTK Journey system exists (`journeys/`, config, backlog/index).
2) Foundation harness exists:
   - `<ARTK_ROOT>/<harnessRoot>/playwright.config.*`
   - `<harnessRoot>/fixtures/test.*` (or equivalent base test)
   - `<harnessRoot>/modules/foundation/*`
3) Journey should be `status: clarified` unless `allowNonClarified=true`.
4) If Journey has blockers and `allowBlocked=false`: STOP and explain remediation (selectors/data/env).
5) **LLKB context MUST be loaded before any code generation** (Step 2).
6) **AutoGen CLI must be attempted before manual implementation** (Step 3).

If any prerequisite is missing, print the exact command to run next and stop.

---

# Outputs (must produce)

## A) Test implementation
- Create/modify test file(s) under:
  - `<harnessRoot>/tests/<tier>/`
- **Edit safety**: MUST read and follow `.github/prompts/common/GENERAL_RULES.md` before making any file edits.

Default naming:
- per-journey: `<harnessRoot>/tests/<tier>/<JRN-ID>__<slug>.spec.(ts|js)`
- groupedByScope: `<harnessRoot>/tests/<tier>/<scope>.journeys.spec.(ts|js)` (append new describe block)

## B) Feature modules (if needed)
- Under `<harnessRoot>/modules/feature/<scope>/`
- Only create if required by Journey dependencies and missing (or `createFeatureModules=true`).

## C) Quality gates (post steps)
- Run (or instruct the user to run) `/artk.journey-validate`
- Run (or instruct) `/artk.journey-verify` with bounded healing loop

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
2) **LLKB Context Loaded** ← MANDATORY: Show components/lessons found
3) **Implementation Plan**
4) **Questions (if needed)**
5) **AutoGen Execution** ← MANDATORY: Show AutoGen CLI output
6) **Changes Applied** (if manual steps needed)
7) **LLKB Summary** ← MANDATORY: Components reused/created, lessons applied
8) **Validation + Verification**
9) **How to Run + Debug**
10) **Blockers / Follow-ups**

If `dryRun=true`, output sections 1–4 only.

---

# Implementation Algorithm (extended, do in order)

## Step 0 — Locate ARTK_ROOT and detect harness language
- Find `ARTK_ROOT` from `artk.config.yml` or `artkRoot=`.
- Determine harness root (`harnessRoot`).
- **Set LLKB root path** (`LLKB_ROOT = ${harnessRoot}/.artk/llkb`).
- Detect TS vs JS from existing config and fixtures.
- Detect existing module registry and existing tests.
- **Initialize session state for batch tracking:**
  ```
  sessionState = {
    journeysRequested: parseJourneyList(userInput),
    journeysCompleted: [],
    predictiveExtractionCount: 0,
    startTime: now(),
    llkbRoot: `${harnessRoot}/.artk/llkb`
  }
  ```

## Step 1 — Load Journey(s) and validate readiness

### 1.1 Parse Journey List, Validate Batch Mode, Detect Environment

```
journeyList = parseJourneyList(userInput)  // e.g., ["JRN-0001", "JRN-0002", ...]
totalJourneys = journeyList.length
batchMode = parseBatchMode(args) || "subagent"  // default: subagent (faster, auto-fallbacks to serial in non-VS Code)
batchSize = parseBatchSize(args) || 3         // default: 3 journeys per batch
subagentTimeout = parseSubagentTimeout(args) || 300000  // default: 5 minutes

# ═══════════════════════════════════════════════════════════════
# STEP 1: Validate batchMode parameter
# ═══════════════════════════════════════════════════════════════
VALID_BATCH_MODES = ["serial", "subagent"]
IF batchMode NOT IN VALID_BATCH_MODES:
  OUTPUT:
  ╔════════════════════════════════════════════════════════════════════╗
  ║  ❌ INVALID BATCH MODE: "{batchMode}"                              ║
  ╠════════════════════════════════════════════════════════════════════╣
  ║  Valid values: subagent | serial                                   ║
  ║                                                                    ║
  ║  subagent (default): Parallel batches (auto-fallback to serial)    ║
  ║  serial: Process journeys one at a time (fallback mode)            ║
  ╚════════════════════════════════════════════════════════════════════╝
  STOP

# ═══════════════════════════════════════════════════════════════
# STEP 2: Environment detection for subagent mode (MANDATORY)
# ═══════════════════════════════════════════════════════════════
IF batchMode == "subagent":
  # Detect environment - #runSubagent ONLY works in VS Code local sessions
  #
  # Detection heuristics:
  # - VS Code local: Has access to #runSubagent tool, workspace context
  # - GitHub.com: URL contains github.com, no local file access
  # - CLI (Codex, Claude Code): Terminal environment, no VS Code APIs
  #
  # If you cannot determine the environment, assume NOT VS Code and fallback.

  isVSCodeLocal = detectVSCodeLocalEnvironment()
  fallbackReason = null

  # ═══════════════════════════════════════════════════════════════
  # FALLBACK DETECTION: Check why subagent mode cannot be used
  # ═══════════════════════════════════════════════════════════════
  IF NOT isVSCodeLocal:
    # Determine specific reason for fallback
    IF environmentType == "github.com":
      fallbackReason = "GitHub web interface does not support #runSubagent"
    ELSE IF environmentType == "cli-codex":
      fallbackReason = "Codex CLI does not support #runSubagent (VS Code feature only)"
    ELSE IF environmentType == "cli-claude":
      fallbackReason = "Claude Code CLI does not support #runSubagent (VS Code feature only)"
    ELSE IF environmentType == "terminal":
      fallbackReason = "Terminal environment does not support #runSubagent"
    ELSE:
      fallbackReason = "Unknown environment - #runSubagent availability uncertain"

    OUTPUT:
    ╔════════════════════════════════════════════════════════════════════╗
    ║  ⚠️  SUBAGENT MODE NOT AVAILABLE — FALLING BACK TO SERIAL          ║
    ╠════════════════════════════════════════════════════════════════════╣
    ║  Requested mode: subagent (parallel batches)                       ║
    ║  Fallback mode:  serial (one at a time)                            ║
    ║                                                                    ║
    ║  Detected environment: {environmentType}                           ║
    ║  Reason: {fallbackReason}                                          ║
    ║                                                                    ║
    ║  Impact:                                                           ║
    ║  - Journeys will be processed sequentially instead of in parallel  ║
    ║  - Total time may be longer for large batches                      ║
    ║  - LLKB updates will still work correctly                          ║
    ║                                                                    ║
    ║  To use parallel mode:                                             ║
    ║  - Open this project in VS Code                                    ║
    ║  - Run this command from VS Code Copilot Chat                      ║
    ╚════════════════════════════════════════════════════════════════════╝

    # Log the fallback decision for debugging
    LOG INFO: "Subagent mode fallback: {fallbackReason} | Environment: {environmentType}"

    batchMode = "serial"  # Auto-fallback

# ═══════════════════════════════════════════════════════════════
# STEP 3: Validate batch size limits
# ═══════════════════════════════════════════════════════════════
SOFT_LIMIT = 10   # Warning threshold
HARD_LIMIT = 50   # Maximum allowed

IF totalJourneys > HARD_LIMIT:
  OUTPUT:
  ╔════════════════════════════════════════════════════════════════════╗
  ║  ❌ BATCH TOO LARGE: {totalJourneys} journeys exceeds limit of 50  ║
  ╠════════════════════════════════════════════════════════════════════╣
  ║  Processing too many journeys in one session:                      ║
  ║  - Risks context compaction losing execution rules                 ║
  ║  - May exceed conversation context limits                          ║
  ║  - Reduces quality of LLKB integration per journey                 ║
  ║                                                                    ║
  ║  Please split into smaller batches of 10-20 journeys each.         ║
  ╚════════════════════════════════════════════════════════════════════╝
  STOP

IF totalJourneys > SOFT_LIMIT:
  OUTPUT:
  ╔════════════════════════════════════════════════════════════════════╗
  ║  ⚠️  LARGE BATCH: {totalJourneys} journeys (recommended max: 10)   ║
  ╠════════════════════════════════════════════════════════════════════╣
  ║  Consider splitting into smaller batches for better quality.       ║
  ║  Proceeding anyway, but quality may degrade for later journeys.    ║
  ╚════════════════════════════════════════════════════════════════════╝

# ═══════════════════════════════════════════════════════════════
# STEP 4: Output execution plan
# ═══════════════════════════════════════════════════════════════
IF totalJourneys == 1:
  OUTPUT:
  ╔════════════════════════════════════════════════════════════════════╗
  ║  SINGLE JOURNEY: {journeyList[0]}                                  ║
  ╚════════════════════════════════════════════════════════════════════╝
  # Proceed directly to Step 1.3 (Load Single Journey)

ELSE IF batchMode == "serial":
  OUTPUT:
  ╔════════════════════════════════════════════════════════════════════╗
  ║  SERIAL BATCH EXECUTION: {totalJourneys} journeys                  ║
  ╠════════════════════════════════════════════════════════════════════╣
  ║  Mode: SERIAL (one at a time)                                      ║
  ║  Best LLKB knowledge transfer between journeys.                    ║
  ║                                                                    ║
  ║  Order: {journeyList.join(" → ")}                                  ║
  ╚════════════════════════════════════════════════════════════════════╝
  # Proceed to Step 1.2b (Serial Mode)

ELSE IF batchMode == "subagent":
  batches = chunk(journeyList, batchSize)
  OUTPUT:
  ╔════════════════════════════════════════════════════════════════════╗
  ║  PARALLEL BATCH EXECUTION: {totalJourneys} journeys                ║
  ╠════════════════════════════════════════════════════════════════════╣
  ║  Mode: SUBAGENT (parallel batches of {batchSize})                  ║
  ║  Total batches: {batches.length}                                   ║
  ║  Timeout per subagent: {subagentTimeout/1000}s                     ║
  ║                                                                    ║
  ║  Batch 1: {batches[0].join(", ")}                                  ║
  ║  Batch 2: {batches[1]?.join(", ") || "N/A"}                        ║
  ║  ...                                                               ║
  ║                                                                    ║
  ║  Each batch spawns {batchSize} subagents using #runSubagent.       ║
  ║  LLKB updates are merged between batches.                          ║
  ╚════════════════════════════════════════════════════════════════════╝
  # Proceed to Step 1.2a (Subagent Mode)
```

### 1.2a Execute Batch (Subagent Mode - DEFAULT)

**⚠️ IMPORTANT: Auto-fallbacks to serial mode in non-VS Code environments.**

**When `batchMode=subagent`, you MUST output multiple `#runSubagent` calls explicitly in a SINGLE message.**

The LLM cannot programmatically spawn subagents in a loop. Instead, you must write out each `#runSubagent` invocation explicitly.

**🔑 KEY ARCHITECTURE: Each subagent loads LLKB themselves.**
- Orchestrator ONLY verifies LLKB exists (Step 2.1)
- Subagents load and use LLKB in their own context
- This ensures full LLKB data is available to each subagent

```
IF batchMode == "subagent" AND totalJourneys > 1:

  batches = chunk(journeyList, batchSize)

  FOR batchIndex, batch IN enumerate(batches):

    # ═══════════════════════════════════════════════════════════════
    # STEP 1: Output batch header
    # ═══════════════════════════════════════════════════════════════
    OUTPUT:
    ═══════════════════════════════════════════════════════════════════
    BATCH {batchIndex + 1} of {batches.length}: {batch.join(", ")}
    ═══════════════════════════════════════════════════════════════════

    # ═══════════════════════════════════════════════════════════════
    # STEP 2: Spawn subagents EXPLICITLY (NOT in a loop)
    #
    # NOTE: LLKB loading happens INSIDE each subagent, not here.
    # Each subagent will read ${HARNESS_ROOT}/.artk/llkb/ files in their own context.
    #
    # YOU MUST OUTPUT EACH #runSubagent CALL SEPARATELY IN YOUR RESPONSE.
    # The LLM cannot loop - write each one explicitly.
    # ═══════════════════════════════════════════════════════════════

    OUTPUT (EXACT FORMAT - copy this pattern for each journey in batch):
    ```
    Spawning {batch.length} subagents for batch {batchIndex + 1}:

    **Subagent 1: {batch[0]}**
    Use #runSubagent to implement journey {batch[0]}:
    - ARTK_ROOT: {artkRoot}
    - harnessRoot: {harnessRoot}
    - Journey ID: {batch[0]}
    - LLKB_ROOT: ${HARNESS_ROOT}/.artk/llkb/ (subagent MUST load LLKB first)
    - LLKB_EXPORT: {harnessRoot}/autogen-llkb.config.yml, {harnessRoot}/llkb-glossary.ts
    - Timeout: {subagentTimeout}ms
    Task: Load LLKB → Load journey → Run AutoGen with --llkb-config --llkb-glossary → Update frontmatter (tests[], status)
    Return: {journeyId, status, testFiles[], newComponents[], errors[]}
    DO NOT regenerate backlog/index (main agent will do this).

    **Subagent 2: {batch[1]}** (if batch.length >= 2)
    Use #runSubagent to implement journey {batch[1]}:
    - ARTK_ROOT: {artkRoot}
    - harnessRoot: {harnessRoot}
    - Journey ID: {batch[1]}
    - LLKB_ROOT: ${HARNESS_ROOT}/.artk/llkb/ (subagent MUST load LLKB first)
    - LLKB_EXPORT: {harnessRoot}/autogen-llkb.config.yml, {harnessRoot}/llkb-glossary.ts
    - Timeout: {subagentTimeout}ms
    Task: Load LLKB → Load journey → Run AutoGen with --llkb-config --llkb-glossary → Update frontmatter (tests[], status)
    Return: {journeyId, status, testFiles[], newComponents[], errors[]}
    DO NOT regenerate backlog/index (main agent will do this).

    **Subagent 3: {batch[2]}** (if batch.length >= 3)
    Use #runSubagent to implement journey {batch[2]}:
    - ARTK_ROOT: {artkRoot}
    - harnessRoot: {harnessRoot}
    - Journey ID: {batch[2]}
    - LLKB_ROOT: ${HARNESS_ROOT}/.artk/llkb/ (subagent MUST load LLKB first)
    - LLKB_EXPORT: {harnessRoot}/autogen-llkb.config.yml, {harnessRoot}/llkb-glossary.ts
    - Timeout: {subagentTimeout}ms
    Task: Load LLKB → Load journey → Run AutoGen with --llkb-config --llkb-glossary → Update frontmatter (tests[], status)
    Return: {journeyId, status, testFiles[], newComponents[], errors[]}
    DO NOT regenerate backlog/index (main agent will do this).

    Awaiting subagent results (timeout: {subagentTimeout}ms each)...
    ```

    # ═══════════════════════════════════════════════════════════════
    # STEP 4: Process subagent results with error handling
    # ═══════════════════════════════════════════════════════════════
    subagentResults = []

    FOR each subagent result received:
      IF result.status == "timeout":
        # Subagent did not complete within timeout
        LOG ERROR: "⏱️ Subagent for {result.journeyId} TIMED OUT after {subagentTimeout}ms"
        subagentResults.push({
          journeyId: result.journeyId,
          status: "timeout",
          testFiles: [],
          newComponents: [],
          errors: ["Subagent timeout - journey not implemented"]
        })
        CONTINUE

      IF result.status == "error" OR result.errors.length > 0:
        # Subagent crashed or encountered errors
        LOG ERROR: "❌ Subagent for {result.journeyId} FAILED: {result.errors.join(', ')}"
        subagentResults.push({
          journeyId: result.journeyId,
          status: "failed",
          testFiles: [],
          newComponents: [],
          errors: result.errors
        })
        CONTINUE

      IF result.status == "blocked":
        # Journey has blockers that prevented implementation
        LOG WARNING: "🚫 Journey {result.journeyId} BLOCKED: {result.errors.join(', ')}"
        subagentResults.push(result)
        CONTINUE

      # Success case
      subagentResults.push(result)

    # ═══════════════════════════════════════════════════════════════
    # STEP 5: Merge LLKB updates with deduplication and persistence
    # ═══════════════════════════════════════════════════════════════
    #
    # ARCHITECTURE: In subagent mode, each subagent may create components
    # and apply lessons independently. This step merges all updates into
    # the main LLKB files with conflict resolution.
    #
    # ═══════════════════════════════════════════════════════════════

    newComponentsAdded = 0
    newLessonsAdded = 0
    mergedUsageUpdates = 0
    historyEvents = []

    FOR result IN subagentResults:
      IF result.status != "implemented":
        CONTINUE  # Skip failed/timeout/blocked journeys

      # ─────────────────────────────────────────────────────────────
      # 5.1: Merge new components with semantic deduplication
      # ─────────────────────────────────────────────────────────────
      FOR newComponent IN result.newComponents:
        # Check for exact ID match
        IF newComponent.id IN llkbComponentIds:
          LOG: "Component {newComponent.id} already exists, skipping"
          CONTINUE

        # Check for semantic similarity (prevent near-duplicates)
        existingSimilar = findSimilarComponent(newComponent, llkbSnapshot.components, threshold=0.8)
        IF existingSimilar:
          LOG: "Component similar to {existingSimilar.id}, merging usage"
          existingSimilar.usedInJourneys.push(result.journeyId)
          existingSimilar.totalUses += 1
          existingSimilar.lastUsed = now().toISO8601()
          mergedUsageUpdates++
          CONTINUE

        # Add as new component
        addComponentToLLKB(newComponent)
        llkbComponentIds.push(newComponent.id)
        newComponentsAdded++
        LOG: "✓ Added component {newComponent.id} from {result.journeyId}"

        # Queue history event
        historyEvents.push({
          timestamp: now().toISO8601(),
          event: "component_created",
          id: newComponent.id,
          journey: result.journeyId,
          prompt: "journey-implement",
          mode: "subagent"
        })

      # ─────────────────────────────────────────────────────────────
      # 5.2: Merge component usage from subagent
      # ─────────────────────────────────────────────────────────────
      FOR usedComponent IN result.usedComponents:
        existing = findComponentById(usedComponent.id)
        IF existing:
          IF result.journeyId NOT IN existing.usedInJourneys:
            existing.usedInJourneys.push(result.journeyId)
            existing.totalUses += 1
            existing.lastUsed = now().toISO8601()
            mergedUsageUpdates++

          historyEvents.push({
            timestamp: now().toISO8601(),
            event: "component_used",
            id: usedComponent.id,
            journey: result.journeyId,
            prompt: "journey-implement",
            mode: "subagent"
          })

      # ─────────────────────────────────────────────────────────────
      # 5.3: Merge lesson applications
      # ─────────────────────────────────────────────────────────────
      FOR appliedLesson IN result.appliedLessons:
        lesson = findLessonById(appliedLesson.id)
        IF lesson:
          lesson.metrics.lastApplied = now().toISO8601()
          # Recalculate success rate based on subagent outcome
          IF appliedLesson.success:
            lesson.metrics.successRate = recalculateSuccessRate(lesson, true)
          ELSE:
            lesson.metrics.successRate = recalculateSuccessRate(lesson, false)

          historyEvents.push({
            timestamp: now().toISO8601(),
            event: "lesson_applied",
            id: appliedLesson.id,
            journey: result.journeyId,
            prompt: "journey-implement",
            mode: "subagent",
            success: appliedLesson.success
          })

      # Merge new lessons
      FOR newLesson IN result.newLessons:
        IF newLesson.id NOT IN llkbLessonIds:
          addLessonToLLKB(newLesson)
          llkbLessonIds.push(newLesson.id)
          newLessonsAdded++

          historyEvents.push({
            timestamp: now().toISO8601(),
            event: "lesson_created",
            id: newLesson.id,
            journey: result.journeyId,
            prompt: "journey-implement",
            mode: "subagent"
          })

    # ═══════════════════════════════════════════════════════════════
    # STEP 5.5: Persist merged LLKB updates to disk (MANDATORY)
    # ═══════════════════════════════════════════════════════════════
    # In subagent mode, the orchestrator persists LLKB after merging
    # all subagent results. This ensures atomic updates and prevents
    # race conditions from parallel subagents writing to the same files.
    # ═══════════════════════════════════════════════════════════════

    IF newComponentsAdded > 0 OR mergedUsageUpdates > 0:
      # Persist components.json
      writeJSON("${LLKB_ROOT}/components.json", {
        version: "1.0",
        components: llkbSnapshot.components
      })
      LOG: "✓ Persisted components.json ({newComponentsAdded} new, {mergedUsageUpdates} updated)"

    IF newLessonsAdded > 0:
      # Persist lessons.json
      writeJSON("${LLKB_ROOT}/lessons.json", {
        version: "1.0",
        lessons: llkbSnapshot.lessons
      })
      LOG: "✓ Persisted lessons.json ({newLessonsAdded} new)"

    IF historyEvents.length > 0:
      # Append all history events
      historyPath = "${LLKB_ROOT}/history/{YYYY-MM-DD}.jsonl"
      FOR event IN historyEvents:
        appendLine(historyPath, JSON.stringify(event))
      LOG: "✓ Persisted {historyEvents.length} history events"

    # ═══════════════════════════════════════════════════════════════
    # STEP 6: Output batch summary with error details
    # ═══════════════════════════════════════════════════════════════
    successCount = subagentResults.filter(r => r.status == "implemented").length
    failedCount = subagentResults.filter(r => r.status == "failed").length
    timeoutCount = subagentResults.filter(r => r.status == "timeout").length
    blockedCount = subagentResults.filter(r => r.status == "blocked").length

    OUTPUT:
    ╔════════════════════════════════════════════════════════════════════╗
    ║  BATCH {batchIndex + 1} COMPLETE                                   ║
    ╠════════════════════════════════════════════════════════════════════╣
    ║  ✅ Implemented: {successCount}                                    ║
    ║  ❌ Failed: {failedCount}                                          ║
    ║  ⏱️  Timeout: {timeoutCount}                                       ║
    ║  🚫 Blocked: {blockedCount}                                        ║
    ║                                                                    ║
    ║  LLKB updates (merged from subagents):                             ║
    ║    New components: {newComponentsAdded}                            ║
    ║    Usage updates: {mergedUsageUpdates}                             ║
    ║    New lessons: {newLessonsAdded}                                  ║
    ║    History events: {historyEvents.length}                          ║
    ║                                                                    ║
    ║  LLKB persisted: ✓ components.json, lessons.json, history/         ║
    ╚════════════════════════════════════════════════════════════════════╝

    IF failedCount > 0 OR timeoutCount > 0:
      OUTPUT:
      ⚠️  ERRORS IN BATCH {batchIndex + 1}:
      {FOR result IN subagentResults WHERE result.status IN ["failed", "timeout"]:
        "  - {result.journeyId}: {result.status} - {result.errors.join(', ')}"
      }

    # Loop to next batch (LLKB now includes merged updates)

  # ═══════════════════════════════════════════════════════════════
  # After all batches complete: Regenerate backlog/index ONCE
  # ═══════════════════════════════════════════════════════════════
  regenerateBacklogAndIndex()

  totalImplemented = sum(batches.map(b => b.successCount))
  totalFailed = sum(batches.map(b => b.failedCount + b.timeoutCount))
  totalBlocked = sum(batches.map(b => b.blockedCount))

  OUTPUT:
  ═══════════════════════════════════════════════════════════════════
  🎉 ALL BATCHES COMPLETE

  Total journeys requested: {totalJourneys}
  ✅ Implemented: {totalImplemented}
  ❌ Failed/Timeout: {totalFailed}
  🚫 Blocked: {totalBlocked}

  Backlog and index regenerated.
  ═══════════════════════════════════════════════════════════════════

  # DONE - skip to Step 15 (Print run/debug instructions)
```

### 1.2b For Each Journey (Serial Mode - DEFAULT)

**Serial mode is the DEFAULT and works in ALL environments.**

```
IF batchMode == "serial" OR totalJourneys == 1:
  FOR journeyIndex, journeyId IN enumerate(journeyList):
    IF totalJourneys > 1:
      OUTPUT:
      ═══════════════════════════════════════════════════════════════════
      JOURNEY {journeyIndex + 1} of {totalJourneys}: {journeyId}
      ═══════════════════════════════════════════════════════════════════

    # Continue with Steps 1.3 through Step 14 for this journey
    # Then loop to next journey
    # Serial mode processes one journey completely before starting the next
```

### 1.3 Load Single Journey
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
- If `allowNonClarified=false`: stop and instruct `/artk.journey-clarify id=...`
- If `allowNonClarified=true`: generate a **skeleton implementation** but mark tests skipped until clarification is complete. Do not mark Journey implemented.

---

## Step 2 — Load LLKB Context (MANDATORY — BEFORE ANY CODE GENERATION)

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  🛑 STOP: This step is MANDATORY and cannot be skipped                    ║
# ╠═══════════════════════════════════════════════════════════════════════════╣
# ║  You MUST complete this step BEFORE Step 3 (AutoGen) or any manual code.  ║
# ║  Failure to load LLKB = wasted extraction opportunities and duplicate     ║
# ║  components that could have been reused.                                  ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

### 2.1 Check LLKB Availability (MANDATORY)
```
# ═══════════════════════════════════════════════════════════════
# LLKB STRUCTURE VALIDATION (not just directory existence)
# ═══════════════════════════════════════════════════════════════
# Required files for valid LLKB:
#   - ${LLKB_ROOT}/config.yml (configuration)
#   - ${LLKB_ROOT}/components.json (component registry)
#   - ${LLKB_ROOT}/lessons.json (lessons learned)
#
# The directory alone is NOT sufficient - all core files must exist.
# ═══════════════════════════════════════════════════════════════

REQUIRED_LLKB_FILES = [
  "${LLKB_ROOT}/config.yml",
  "${LLKB_ROOT}/components.json",
  "${LLKB_ROOT}/lessons.json"
]

missingFiles = []
FOR file IN REQUIRED_LLKB_FILES:
  IF NOT exists(file):
    missingFiles.push(file)

IF NOT exists("${LLKB_ROOT}/") OR missingFiles.length > 0:
  # LLKB MUST exist with valid structure
  OUTPUT:
  ╔════════════════════════════════════════════════════════════════════╗
  ║  ❌ LLKB STRUCTURE INVALID                                         ║
  ╠════════════════════════════════════════════════════════════════════╣
  ║  The LLKB directory is missing or incomplete.                      ║
  ║                                                                    ║
  ║  Directory exists: {exists("${LLKB_ROOT}/") ? "Yes" : "No"}        ║
  ║  Missing files:                                                    ║
  {FOR file IN missingFiles:
  ║    - {file}                                                        ║
  }
  ║                                                                    ║
  ║  LLKB should have been created by /artk.discover-foundation.       ║
  ║                                                                    ║
  ║  To fix this issue, run:                                           ║
  ║    /artk.discover-foundation                                       ║
  ║                                                                    ║
  ║  This will:                                                        ║
  ║  - Analyze your application structure                              ║
  ║  - Initialize the LLKB directory with:                             ║
  ║    - config.yml (LLKB configuration)                               ║
  ║    - app-profile.json (application DNA)                            ║
  ║    - lessons.json (empty, ready for learnings)                     ║
  ║    - components.json (empty, ready for components)                 ║
  ║                                                                    ║
  ║  Cannot proceed without valid LLKB structure.                      ║
  ╚════════════════════════════════════════════════════════════════════╝
  STOP

config = loadYAML("${LLKB_ROOT}/config.yml")
IF NOT config.enabled:
  OUTPUT:
  ╔════════════════════════════════════════════════════════════════════╗
  ║  ⚠️  LLKB IS DISABLED                                              ║
  ╠════════════════════════════════════════════════════════════════════╣
  ║  LLKB is disabled in ${LLKB_ROOT}/config.yml.                      ║
  ║                                                                    ║
  ║  To enable LLKB, set `enabled: true` in config.yml.                ║
  ║  Or re-run: /artk.discover-foundation                              ║
  ║                                                                    ║
  ║  Cannot proceed without LLKB enabled.                              ║
  ╚════════════════════════════════════════════════════════════════════╝
  STOP
```

### 2.2 Load LLKB Data Files
```
components = loadJSON("${LLKB_ROOT}/components.json") OR { components: [] }
lessons = loadJSON("${LLKB_ROOT}/lessons.json") OR { lessons: [], globalRules: [], appQuirks: [] }
appProfile = loadJSON("${LLKB_ROOT}/app-profile.json") OR {}
```

### 2.3 Filter by Journey Scope (Context Injection Algorithm)

**Filter and prioritize LLKB data for the current journey:**

```
FUNCTION loadAndFilterLLKBContext(journeyScope: string, journeySteps: Step[]) -> LLKBContext:
  # ═══════════════════════════════════════════════════════════════
  # STEP 1: Filter by scope (relevance-based)
  # ═══════════════════════════════════════════════════════════════
  relevantScopes = [
    "universal",                          # Always included
    "framework:" + appProfile.framework,  # Framework-specific
    "app-specific"                        # App-specific
  ]

  filteredComponents = components.filter(c =>
    relevantScopes.includes(c.scope) OR
    c.usageContext.some(ctx => matchesJourneySteps(ctx, journeySteps))
  )

  filteredLessons = lessons.lessons.filter(l =>
    relevantScopes.includes(l.scope) OR
    l.applicableTo.some(pattern => matchesJourneyScope(pattern, journeyScope))
  )

  # ═══════════════════════════════════════════════════════════════
  # STEP 2: Filter by confidence (quality-based)
  # ═══════════════════════════════════════════════════════════════
  confidenceThreshold = config.extraction.confidenceThreshold  # default 0.7

  highConfidenceComponents = filteredComponents.filter(c =>
    c.metrics.confidence >= confidenceThreshold
  )

  highConfidenceLessons = filteredLessons.filter(l =>
    l.metrics.confidence >= confidenceThreshold AND
    l.metrics.successRate >= config.retention.minSuccessRate  # default 0.6
  )

  # ═══════════════════════════════════════════════════════════════
  # HELPER: Extract keywords from journey steps for matching
  # ═══════════════════════════════════════════════════════════════
  FUNCTION extractKeywords(journeySteps: Step[]) -> string[]:
    keywords = []

    FOR each step in journeySteps:
      # Extract action verbs and map to categories
      IF step.description.includes("verify"): keywords.push("verify", "assertion")
      IF step.description.includes("navigate"): keywords.push("navigate", "navigation")
      IF step.description.includes("click"): keywords.push("click", "ui-interaction")
      IF step.description.includes("fill"): keywords.push("fill", "form", "data")
      IF step.description.includes("submit"): keywords.push("submit", "form")
      IF step.description.includes("login"): keywords.push("login", "auth")
      IF step.description.includes("logout"): keywords.push("logout", "auth")
      IF step.description.includes("grid"): keywords.push("grid", "table", "data-grid")
      IF step.description.includes("toast"): keywords.push("toast", "notification")
      IF step.description.includes("modal"): keywords.push("modal", "dialog")
      IF step.description.includes("sidebar"): keywords.push("sidebar", "navigation")
      IF step.description.includes("menu"): keywords.push("menu", "navigation")
      IF step.description.includes("loading"): keywords.push("loading", "async")
      IF step.description.includes("wait"): keywords.push("wait", "async")

      # Extract component names (nouns)
      keywords.push(...extractNouns(step.description))

    RETURN unique(keywords)

  # ═══════════════════════════════════════════════════════════════
  # STEP 3: Prioritize by relevance score
  # ═══════════════════════════════════════════════════════════════
  FUNCTION calculateRelevanceScore(item, journeySteps) -> float:
    score = 0.0
    keywords = extractKeywords(journeySteps)
    matchCount = countMatches(keywords, item.usageContext || item.applicableTo)
    score += matchCount * 0.2
    score += item.metrics.confidence * 0.3
    daysSinceUsed = daysBetween(now(), item.metrics.lastUsed || item.metrics.lastApplied)
    IF daysSinceUsed < 7: score += 0.2
    ELIF daysSinceUsed < 30: score += 0.1
    score += (item.metrics.successRate || 0) * 0.2
    RETURN min(score, 1.0)

  # Score and sort
  scoredComponents = highConfidenceComponents.map(c => ({
    ...c,
    relevanceScore: calculateRelevanceScore(c, journeySteps)
  })).sort((a, b) => b.relevanceScore - a.relevanceScore)

  scoredLessons = highConfidenceLessons.map(l => ({
    ...l,
    relevanceScore: calculateRelevanceScore(l, journeySteps)
  })).sort((a, b) => b.relevanceScore - a.relevanceScore)

  # ═══════════════════════════════════════════════════════════════
  # STEP 4: Include global rules and quirks (always)
  # ═══════════════════════════════════════════════════════════════
  globalRules = lessons.globalRules || []
  appQuirks = lessons.appQuirks.filter(q =>
    q.affectsJourneys.includes(journeyScope) OR
    q.location matches any journeyStep.route
  )

  RETURN {
    enabled: true,
    components: scoredComponents,
    lessons: scoredLessons,
    globalRules: globalRules,
    appQuirks: appQuirks,
    appProfile: appProfile,
    stats: {
      totalComponentsAvailable: components.length,
      totalLessonsAvailable: lessons.lessons.length,
      componentsInjected: scoredComponents.length,
      lessonsInjected: scoredLessons.length,
      quirksInjected: appQuirks.length
    }
  }
```

### 2.4 Output LLKB Context Loaded Section (MANDATORY)

**You MUST output this section before proceeding to Step 3:**

```
╔════════════════════════════════════════════════════════════════════╗
║  LLKB CONTEXT LOADED                                               ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  📊 Statistics:                                                    ║
║    Total components available: {stats.totalComponentsAvailable}    ║
║    Components relevant to this journey: {stats.componentsInjected} ║
║    Total lessons available: {stats.totalLessonsAvailable}          ║
║    Lessons relevant to this journey: {stats.lessonsInjected}       ║
║    App quirks for this scope: {stats.quirksInjected}               ║
║                                                                    ║
║  📦 Available Components for Reuse:                                ║
║    {for each component: "- {id}: {name} ({category}, {confidence}%)"}
║                                                                    ║
║  💡 Applicable Lessons:                                            ║
║    {for each lesson: "- {id}: {title} ({confidence}%)"}            ║
║                                                                    ║
║  ⚠️  Known Quirks:                                                 ║
║    {for each quirk: "- {id}: {description}"}                       ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
```

**If LLKB is empty or disabled, output:**
```
╔════════════════════════════════════════════════════════════════════╗
║  LLKB CONTEXT LOADED                                               ║
╠════════════════════════════════════════════════════════════════════╣
║  Status: {disabled | empty | not initialized}                      ║
║  Proceeding without LLKB integration.                              ║
║  New patterns discovered will be candidates for extraction.        ║
╚════════════════════════════════════════════════════════════════════╝
```

---

## Step 2.5 — Export LLKB for AutoGen (MANDATORY)

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  🛑 STOP: This step is MANDATORY after Step 2                             ║
# ╠═══════════════════════════════════════════════════════════════════════════╣
# ║  You MUST export LLKB to AutoGen-compatible format BEFORE Step 3.         ║
# ║  This step generates files that AutoGen CLI will consume.                 ║
# ║                                                                           ║
# ║  In subagent mode: Orchestrator runs this ONCE (not per subagent).        ║
# ║  Subagents will use the exported files generated by the orchestrator.     ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

### 2.5.1 Run LLKB Export Command

Before running AutoGen, export LLKB knowledge to AutoGen-compatible format:

```bash
# From harness root directory
cd <ARTK_ROOT>/<harnessRoot>

# Export LLKB for AutoGen
artk llkb export --for-autogen --llkb-root ${LLKB_ROOT} \
  --output ./ \
  --min-confidence 0.7
```

**Command options:**
- `--output ./` — Output directory (harness root)
- `--min-confidence 0.7` — Minimum confidence threshold for exported entries
- `--dry-run` — Preview export without writing files (optional)

### 2.5.2 Expected Output Files

The export command generates two files in the harness root:

1. **`autogen-llkb.config.yml`** — AutoGen config extension with:
   - Additional patterns from LLKB lessons
   - Selector overrides from lessons
   - Timing hints from lessons
   - Module mappings from components

2. **`llkb-glossary.ts`** — TypeScript glossary file with:
   - Natural language term mappings to IR primitives
   - Component name variations
   - Metadata about export (timestamp, confidence, sources)

### 2.5.3 Output Export Statistics (MANDATORY)

**You MUST output this section showing export results:**

```
╔════════════════════════════════════════════════════════════════════╗
║  LLKB EXPORTED FOR AUTOGEN                                         ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  📊 Export Statistics:                                             ║
║    Patterns exported: {patternsExported}                           ║
║    Selector overrides exported: {selectorsExported}                ║
║    Timing hints exported: {timingHintsExported}                    ║
║    Modules exported: {modulesExported}                             ║
║    Glossary entries generated: {glossaryEntriesExported}           ║
║                                                                    ║
║  📦 Output Files:                                                  ║
║    - {harnessRoot}/autogen-llkb.config.yml                         ║
║    - {harnessRoot}/llkb-glossary.ts                                ║
║                                                                    ║
║  ⏰ Export completed at: {exportedAt}                              ║
║  🎯 Min confidence threshold: {minConfidence}                      ║
║                                                                    ║
║  Warnings: {warnings.length} {warnings.length > 0 ? "⚠️" : "✓"}    ║
{FOR warning IN warnings:
║    - {warning}                                                     ║
}
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
```

### 2.5.4 Error Handling

**If export fails:**

```
╔════════════════════════════════════════════════════════════════════╗
║  ⚠️  LLKB EXPORT FAILED                                            ║
╠════════════════════════════════════════════════════════════════════╣
║  Error: {errorMessage}                                             ║
║                                                                    ║
║  Possible causes:                                                  ║
║  - LLKB not properly initialized                                   ║
║  - Invalid LLKB data format                                        ║
║  - No high-confidence entries to export                            ║
║                                                                    ║
║  Action: Continuing without LLKB export (AutoGen uses core only)   ║
║  Impact: AutoGen will not benefit from learned patterns            ║
║                                                                    ║
║  To fix: Run /artk.discover-foundation to rebuild LLKB             ║
╚════════════════════════════════════════════════════════════════════╝
```

**If no high-confidence entries:**

This is a WARNING, not an error. Continue with empty export:

```
╔════════════════════════════════════════════════════════════════════╗
║  ⚠️  NO HIGH-CONFIDENCE LLKB ENTRIES                               ║
╠════════════════════════════════════════════════════════════════════╣
║  No lessons or components meet the confidence threshold (0.7).     ║
║                                                                    ║
║  Generated empty export files for AutoGen.                         ║
║  AutoGen will use core patterns only.                              ║
║                                                                    ║
║  This is normal for new projects with limited learning history.    ║
╚════════════════════════════════════════════════════════════════════╝
```

### 2.5.5 Batch Mode Considerations

**In subagent mode (batchMode=subagent):**

The LLKB export happens ONCE at the orchestrator level, NOT per subagent:

```
IF batchMode == "subagent":
  # Orchestrator runs export BEFORE spawning subagents
  OUTPUT: "Running LLKB export (once for all subagents)..."
  RUN: artk llkb export --for-autogen --llkb-root ${LLKB_ROOT} --output {harnessRoot}/

  # Then spawn subagents
  # Subagents will find and use the exported files
  FOR batch IN batches:
    spawnSubagents(batch)
```

**In serial mode (batchMode=serial):**

The LLKB export happens ONCE before processing journeys:

```
IF batchMode == "serial":
  # Orchestrator runs export ONCE
  OUTPUT: "Running LLKB export (once for all journeys)..."
  RUN: artk llkb export --for-autogen --llkb-root ${LLKB_ROOT} --output {harnessRoot}/

  # Then process journeys serially
  FOR journey IN journeyList:
    implementJourney(journey)
```

**Why once, not per journey/subagent:**
- LLKB data is project-wide, not journey-specific
- Export is idempotent and deterministic
- Running once reduces overhead (5-10s per export)
- All subagents/journeys use the same exported files

---

## Step 3 — Generate Tests with AutoGen CLI (PRIMARY APPROACH — MANDATORY)

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  🛑 STOP: AutoGen is the PRIMARY approach — NOT optional                  ║
# ╠═══════════════════════════════════════════════════════════════════════════╣
# ║  You MUST attempt AutoGen BEFORE any manual code generation.              ║
# ║  Manual implementation (Step 5) is a FALLBACK only.                       ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

### 3.1 Check AutoGen Settings from Frontmatter

**Read the `autogen` section from journey frontmatter:**

```yaml
# Expected autogen section in journey frontmatter:
autogen:
  enabled: true           # true = use AutoGen, false = skip to manual
  blockedSteps: []        # Steps requiring manual implementation
  machineHints: true      # true = hints added by journey-clarify
```

**Decision tree based on autogen settings:**

```
IF journey.autogen is missing OR journey.autogen.enabled is undefined:
  # Default to AutoGen enabled (backward compatibility)
  PROCEED with AutoGen

IF journey.autogen.enabled === false:
  OUTPUT:
  ╔════════════════════════════════════════════════════════════════════╗
  ║  AUTOGEN DISABLED FOR THIS JOURNEY                                  ║
  ╠════════════════════════════════════════════════════════════════════╣
  ║                                                                     ║
  ║  Journey <ID> has autogen.enabled: false                            ║
  ║                                                                     ║
  ║  Skipping AutoGen CLI. Using manual implementation.                 ║
  ║                                                                     ║
  ║  Reason: {journey.autogen.disabledReason OR "User preference"}      ║
  ║                                                                     ║
  ╚════════════════════════════════════════════════════════════════════╝

  SKIP to Step 5 (Manual Implementation)
  DO NOT run AutoGen CLI

IF journey.autogen.enabled === true:
  # Check for blocked steps
  IF journey.autogen.blockedSteps.length > 0:
    OUTPUT: "AutoGen will skip steps: {blockedSteps.map(s => s.step).join(', ')}"
    OUTPUT: "These steps will need manual implementation after AutoGen"

  # Check for machine hints
  IF journey.autogen.machineHints === false:
    OUTPUT: "⚠️  Warning: machineHints is false - AutoGen may have lower accuracy"
    OUTPUT: "Consider running /artk.journey-clarify first to add hints"

  PROCEED with AutoGen (Step 3.2)
```

### 3.2 Validate Modules Format for AutoGen

**AutoGen requires `modules` to be an object with `foundation` and `features` arrays:**
```yaml
# REQUIRED format for AutoGen:
modules:
  foundation: [auth, navigation]
  features: [orders, catalog]
```

**If Journey has wrong format (array instead of object):**
```
IF journey.modules is Array:
  # Fix the format before running AutoGen
  fixedModules = {
    foundation: journey.modules.filter(m => isFoundationModule(m)),
    features: journey.modules.filter(m => !isFoundationModule(m))
  }
  # Update journey frontmatter
  updateJourneyFrontmatter(journey.file, { modules: fixedModules })
  OUTPUT: "Fixed journey modules format for AutoGen compatibility"
```

### 3.3 Run AutoGen CLI

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  🛑 CRITICAL: YOU MUST ACTUALLY EXECUTE THIS COMMAND                      ║
# ╠═══════════════════════════════════════════════════════════════════════════╣
# ║                                                                           ║
# ║  Do NOT assume AutoGen will fail.                                         ║
# ║  Do NOT skip to manual implementation without trying.                     ║
# ║  Do NOT make excuses like "vendored package may not work".                ║
# ║                                                                           ║
# ║  YOU MUST:                                                                ║
# ║  1. Actually run `npx artk-autogen generate ...` using Bash/terminal      ║
# ║  2. Capture the actual output (success OR error)                          ║
# ║  3. Show the output in your response                                      ║
# ║  4. ONLY THEN decide if fallback is needed based on REAL results          ║
# ║                                                                           ║
# ║  If you skip this step without execution → INVALID implementation         ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

From the `<harnessRoot>/` directory (typically `artk-e2e/`):

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  🛑 PREREQUISITE: Did you run Step 2.5 (LLKB Export)?                     ║
# ╠═══════════════════════════════════════════════════════════════════════════╣
# ║  Before running AutoGen, you MUST have:                                   ║
# ║  1. Run: artk llkb export --for-autogen --llkb-root .artk/llkb -o .       ║
# ║  2. Verified these files exist:                                           ║
# ║     - autogen-llkb.config.yml                                             ║
# ║     - llkb-glossary.ts                                                    ║
# ║                                                                           ║
# ║  If you skip LLKB export:                                                 ║
# ║  - AutoGen will generate SKELETON tests (empty test bodies)               ║
# ║  - You'll have to manually implement all test steps                       ║
# ║  - No learning will occur from existing patterns                          ║
# ║                                                                           ║
# ║  The --llkb-config and --llkb-glossary flags are MANDATORY when files     ║
# ║  exist. Only omit them if LLKB export failed or LLKB is empty.            ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

```bash
# Navigate to harness root
cd <ARTK_ROOT>/<harnessRoot>

# Verify LLKB export files exist (from Step 2.5)
ls -la autogen-llkb.config.yml llkb-glossary.ts

# Generate tests from the Journey (with LLKB integration)
npx artk-autogen generate "../journeys/{status}/{journey.file}" \
  -o tests/{tier}/ \
  -m \
  --llkb-config ./autogen-llkb.config.yml \
  --llkb-glossary ./llkb-glossary.ts \
  --dry-run  # First do a dry run to check for issues
```

**If dry-run succeeds:**
```bash
# Run actual generation (with LLKB integration)
npx artk-autogen generate "../journeys/{status}/{journey.file}" \
  -o tests/{tier}/ \
  -m \
  --llkb-config ./autogen-llkb.config.yml \
  --llkb-glossary ./llkb-glossary.ts
```

**CRITICAL:** The `--llkb-config` and `--llkb-glossary` flags are MANDATORY when export files exist.
- Without these flags → skeleton tests with empty bodies
- With these flags → fully implemented tests using learned patterns
If the exported files don't exist (export failed or skipped), AutoGen will ignore these flags
and proceed with core patterns only.

**CLI Options:**

| Option | Description |
|--------|-------------|
| `-o, --output <dir>` | Output directory for generated tests (default: `./tests/generated`) |
| `-m, --modules` | Also generate feature module files |
| `--dry-run` | Preview what would be generated without writing |
| `-c, --config <file>` | Custom autogen config file |
| `--llkb-config <file>` | **NEW:** LLKB-generated config (from Step 2.5) |
| `--llkb-glossary <file>` | **NEW:** LLKB-generated glossary (from Step 2.5) |
| `--no-llkb` | Disable LLKB integration (use core patterns only) |
| `-q, --quiet` | Suppress output except errors |

### 3.3.2 Pipeline Commands (Advanced - Hybrid Agentic Architecture)

The AutoGen CLI now supports a **Pipeline Architecture** where the CLI provides granular,
stateless tools and the orchestrating LLM (Copilot/Claude Code) serves as the "brain"
making all decisions. This is useful for complex journeys that need iterative refinement.

**Pipeline Commands:**

| Command | Description | Usage |
|---------|-------------|-------|
| `analyze` | Analyze journey and output structured JSON | `npx artk-autogen analyze --journey <path>` |
| `plan` | Create test generation plan from analysis | `npx artk-autogen plan --analysis <path>` |
| `generate` | Generate tests (from plan or journey directly) | `npx artk-autogen generate --plan <path>` |
| `run` | Execute Playwright tests and output results | `npx artk-autogen run --tests <path>` |
| `refine` | Analyze failures and suggest refinements | `npx artk-autogen refine --results <path>` |
| `status` | Show current pipeline state | `npx artk-autogen status` |
| `clean` | Clean autogen artifacts for fresh start | `npx artk-autogen clean` |

**Artifacts location:** All pipeline artifacts are stored in `<harnessRoot>/.artk/autogen/`:
- `analysis.json` - Journey analysis output
- `plan.json` - Test generation plan
- `pipeline-state.json` - Current pipeline state
- `results.json` - Test execution results
- `samples/` - Multi-sample code generation artifacts
- `telemetry.json` - Cost and performance tracking

**When to use Pipeline vs Direct:**

| Scenario | Approach | Command |
|----------|----------|---------|
| Simple journey, first-time generation | Direct | `npx artk-autogen generate <journey>` |
| Complex journey needing iteration | Pipeline | `analyze → plan → generate → run → refine` |
| Debugging flaky tests | Pipeline | Use `run` + `refine` for targeted fixes |
| Multiple journeys in batch | Direct | `npx artk-autogen generate *.md` |
| Understanding generation decisions | Pipeline | `analyze` shows structured reasoning |

**Pipeline Flow Example (orchestrator-driven):**

```bash
# Step 1: Analyze the journey
npx artk-autogen analyze --journey ../journeys/clarified/JRN-0001__user-login.md
# Outputs: .artk/autogen/analysis.json

# Step 2: Create test plan (orchestrator reviews plan.json before proceeding)
npx artk-autogen plan --analysis .artk/autogen/analysis.json
# Outputs: .artk/autogen/plan.json

# Step 3: Generate tests from plan
npx artk-autogen generate --plan .artk/autogen/plan.json -o tests/smoke/
# Outputs: tests/smoke/jrn-0001__user-login.spec.ts

# Step 4: Run generated tests
npx artk-autogen run --tests tests/smoke/jrn-0001__user-login.spec.ts
# Outputs: .artk/autogen/results.json

# Step 5: If tests fail, get refinement suggestions
npx artk-autogen refine --results .artk/autogen/results.json
# Outputs: Structured refinement suggestions for the orchestrator to apply

# Step 6: Check pipeline status anytime
npx artk-autogen status
# Shows: current stage, last command, artifacts present

# Step 7: Start fresh
npx artk-autogen clean
```

**SCoT Planning (Structured Chain-of-Thought):**

The `plan` command uses SCoT to generate a structured test plan that includes:
- Reasoning about test structure (sequential, branch, loop)
- Step-to-action mappings
- Confidence scores
- Selector strategies

This plan can be reviewed by the orchestrator before proceeding to generation.

**Multi-Sampling for Uncertainty Quantification:**

The `generate` command can use multi-sampling to improve code quality:
```bash
npx artk-autogen generate --plan .artk/autogen/plan.json -o tests/smoke/ --samples 3
```

This generates multiple code samples at different temperatures and analyzes agreement
to select the best one, stored in `.artk/autogen/samples/agreement.json`.

**Example CLI output:**
```
Found 1 journey file(s)
Generated: tests/smoke/jrn-0001__user-login.spec.ts
Generated: tests/smoke/modules/authentication.page.ts

Summary:
  Tests: 1
  Modules: 1
  Errors: 0
  Warnings: 0
```

### 3.3.1 Programmatic API (for CI/CD Pipelines)

For advanced automation (CI pipelines, custom tooling):

```typescript
import { generateJourneyTests } from '@artk/core-autogen';

const result = await generateJourneyTests({
  journeys: ['journeys/clarified/JRN-0001.md'],
  isFilePaths: true,
  outputDir: 'artk-e2e/tests/smoke/',
  generateModules: true,
});

// Result contains:
// - generatedTests: string[]  (file paths)
// - generatedModules: string[]  (file paths)
// - blockedSteps: { step: number, reason: string }[]
// - warnings: string[]
```

### 3.4 Output AutoGen Results (MANDATORY)

**You MUST output the AutoGen execution results:**

```
╔════════════════════════════════════════════════════════════════════╗
║  AUTOGEN EXECUTION                                                 ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  Command: npx artk-autogen generate {journey.file} -o {output} -m  ║
║                                                                    ║
║  Result: {SUCCESS | PARTIAL | FAILED}                              ║
║                                                                    ║
║  Generated Files:                                                  ║
║    - tests/{tier}/{JRN-ID}__{slug}.spec.ts                        ║
║    - modules/feature/{scope}/{module}.page.ts (if -m used)         ║
║                                                                    ║
║  Blocked Steps: {count} (see below for resolution)                 ║
║    {for each blocked: "- Step {n}: {reason}"}                      ║
║                                                                    ║
║  Warnings: {count}                                                 ║
║    {for each warning: "- {description}"}                           ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
```

### 3.4.1 Execution Verification (MANDATORY)

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  🛑 PROOF REQUIRED: You must show actual terminal output                  ║
# ╠═══════════════════════════════════════════════════════════════════════════╣
# ║                                                                           ║
# ║  Your response MUST include VERBATIM terminal output showing:             ║
# ║  1. The exact command you ran                                             ║
# ║  2. The complete output (success OR error messages)                       ║
# ║  3. Evidence the command was actually executed                            ║
# ║                                                                           ║
# ║  INVALID CLAIMS (will be rejected):                                       ║
# ║  - "AutoGen failed" without showing actual error                          ║
# ║  - "The vendored package may not work" (speculation)                      ║
# ║  - "I'll skip to manual" without execution evidence                       ║
# ║                                                                           ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

**Example of valid execution evidence:**

```
$ cd artk-e2e

# STEP 1: Export LLKB first (MANDATORY)
$ artk llkb export --for-autogen --llkb-root .artk/llkb -o .
LLKB Export Complete
  Patterns exported: 12
  Components exported: 8
  Glossary entries: 45
  Output: autogen-llkb.config.yml, llkb-glossary.ts

# STEP 2: Run AutoGen WITH LLKB options (MANDATORY)
$ npx artk-autogen generate ../journeys/clarified/JRN-0001__user-login.md \
    -o tests/smoke/ -m \
    --llkb-config ./autogen-llkb.config.yml \
    --llkb-glossary ./llkb-glossary.ts
Found 1 journey file(s)
Loaded LLKB glossary: 45 entries
Processing: JRN-0001 - User Login and Dashboard Access

Generated:
  tests/smoke/jrn-0001__user-login-dashboard-access.spec.ts

Summary:
  Tests: 1
  Modules: 0
  Errors: 0
  Warnings: 0
```

**Example of valid failure evidence:**

```
$ npx artk-autogen generate ../journeys/clarified/JRN-0001.md -o tests/smoke/ -m
Error: Cannot find module '../journeys/clarified/JRN-0001.md'
    at resolveJourneyPath (/path/to/artk-autogen/dist/cli/index.cjs:123:15)
```

**If and only if** you show actual error output like the above, you may proceed to manual implementation.

### 3.4.2 Error Diagnosis and Decision Tree (MANDATORY)

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  ERROR HANDLING DECISION TREE                                             ║
# ╠═══════════════════════════════════════════════════════════════════════════╣
# ║                                                                           ║
# ║  Use this decision tree to handle AutoGen execution errors correctly.     ║
# ║  NEVER skip directly to manual implementation without following this.     ║
# ║                                                                           ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

**Error Type 1: Command Not Found**

```
$ npx artk-autogen generate ...
npm ERR! could not determine executable to run
```

**Diagnosis:** AutoGen CLI is not installed or not accessible.

**Resolution Steps (MANDATORY - try in order):**
1. Check if vendor directory exists: `ls artk-e2e/vendor/artk-core-autogen/`
2. If missing: Re-run bootstrap: `./scripts/bootstrap.sh <target-dir>`
3. If exists but CLI fails: Check bin path: `cat artk-e2e/vendor/artk-core-autogen/package.json | grep bin`
4. Try direct execution: `node artk-e2e/vendor/artk-core-autogen/dist/cli/index.cjs --help`

**When to fallback:** Only after trying ALL resolution steps above AND showing their output.

---

**Error Type 2: Module Not Found / ESM Error**

```
Error [ERR_REQUIRE_ESM]: require() of ES Module ... not supported
```
OR
```
Error: Cannot find module '@artk/core-autogen'
```

**Diagnosis:** Module system mismatch (ESM vs CJS) or missing dependency.

**Resolution Steps (MANDATORY - try in order):**
1. Check package.json for "type": `cat artk-e2e/vendor/artk-core-autogen/package.json | grep type`
2. If "type": "module" exists but .cjs files are used, package.json variant is wrong
3. Check if dist folder has correct files: `ls artk-e2e/vendor/artk-core-autogen/dist/cli/`
4. Verify Node version: `node --version` (must be >=18 for modern variant)

**When to fallback:** Only after confirming this is a build/installation issue that cannot be fixed in session.

---

**Error Type 3: Dependencies Not Installed**

```
Error: Cannot find module 'yaml'
```
OR
```
npm WARN exec The following package was not found
```

**Diagnosis:** npm dependencies not installed in vendor or harness directory.

**Resolution Steps (MANDATORY - try in order):**
1. Check node_modules: `ls artk-e2e/node_modules/ | head -10`
2. If missing: Run `cd artk-e2e && npm install`
3. Check vendor node_modules: `ls artk-e2e/vendor/artk-core-autogen/node_modules/ | head -10`
4. If missing: Run `cd artk-e2e/vendor/artk-core-autogen && npm install`

**When to fallback:** Only after npm install completes and still fails.

---

**Error Type 4: Journey File Not Found**

```
Error: Cannot find module '../journeys/clarified/JRN-0001.md'
```
OR
```
Error: Journey file not found: ...
```

**Diagnosis:** Wrong path to journey file.

**Resolution Steps (MANDATORY - try in order):**
1. Verify journey exists: `ls journeys/*/JRN-0001*.md`
2. Check current directory: `pwd` (should be in harness root)
3. Try absolute path: `npx artk-autogen generate $(pwd)/../journeys/clarified/JRN-0001.md ...`
4. Check journey status in frontmatter: might be in different status folder

**When to fallback:** NEVER - this is always a fixable path issue.

---

**Error Type 5: YAML/Frontmatter Parse Error**

```
YAMLException: bad indentation
```
OR
```
Error: Invalid journey frontmatter
```

**Diagnosis:** Journey frontmatter has YAML syntax errors.

**Resolution Steps (MANDATORY - try in order):**
1. Validate YAML: `head -50 journeys/clarified/JRN-0001.md` (check frontmatter)
2. Common issues: mixed tabs/spaces, missing quotes, incorrect list format
3. Fix the journey file YAML before retrying AutoGen
4. Use YAML linter: `npx yaml-lint journeys/clarified/JRN-0001.md`

**When to fallback:** NEVER - this is always a fixable YAML issue.

---

**Error Type 6: Timeout / Network Error**

```
ETIMEDOUT
```
OR
```
npm ERR! network request to ... failed
```

**Diagnosis:** Network issue during npx execution.

**Resolution Steps (MANDATORY - try in order):**
1. Retry the command (network issues are often transient)
2. Try direct node execution instead of npx: `node artk-e2e/vendor/artk-core-autogen/dist/cli/index.cjs generate ...`
3. Check if you're behind a proxy: `echo $HTTP_PROXY`

**When to fallback:** Only after 3 retry attempts with direct node execution.

---

**Error Type 7: Permission Denied**

```
EACCES: permission denied
```
OR
```
Error: EPERM: operation not permitted
```

**Diagnosis:** File system permission issue.

**Resolution Steps (MANDATORY - try in order):**
1. Check file permissions: `ls -la artk-e2e/tests/`
2. Check directory ownership: `ls -la artk-e2e/`
3. Try creating output directory first: `mkdir -p artk-e2e/tests/smoke/`

**When to fallback:** Only if permissions cannot be fixed (rare in development).

---

**DECISION SUMMARY:**

| Error Type | Fixable? | Fallback Allowed? |
|------------|----------|-------------------|
| Command Not Found | Yes | After ALL resolution steps tried |
| ESM/CJS Mismatch | Depends | After confirming build issue |
| Dependencies Missing | Yes | After npm install |
| Journey Not Found | Yes | NEVER - fix the path |
| YAML Parse Error | Yes | NEVER - fix the YAML |
| Network/Timeout | Often | After 3 retries with direct exec |
| Permission Denied | Usually | After attempting fixes |

**⚠️ CRITICAL RULE:** You MUST show attempted resolution steps in your output BEFORE claiming "AutoGen failed". Simply showing an error message is NOT sufficient to justify fallback.

### 3.5 Handle AutoGen Results

**If AutoGen succeeds (no errors, no blocked steps):**
1. Review generated test code for correctness
2. Verify selector strategies match Journey intent
3. Confirm acceptance criteria are mapped to assertions
4. **Skip to Step 6** (LLKB Component Matching and Usage Recording)

**If AutoGen reports blocked steps:**

**Option A: Add machine hints to Journey (preferred)**

Edit the Journey to add explicit locator hints using inline syntax:
```markdown
## Steps
3. Click the submit button `(role=button, name=Submit Order)`
4. Verify the confirmation dialog appears `(testid=order-confirmation)`
5. Check the status indicator shows success `(role=status, name=/success/i)`
```

Then re-run AutoGen:
```bash
npx artk-autogen generate ../journeys/clarified/JRN-0001.md -o tests/smoke/ -m
```

**Option B: Manual implementation for blocked steps only**

If machine hints can't resolve the issue (complex async, multi-actor, domain logic):
1. Use AutoGen output as a starting point
2. **Proceed to Step 5** (Manual Implementation) for blocked steps ONLY
3. Preserve AutoGen structure, tagging, and imports
4. Document why manual implementation was needed

**If AutoGen fails entirely:**

**MANDATORY: You MUST output the error before proceeding to manual implementation:**
```
╔════════════════════════════════════════════════════════════════════╗
║  AUTOGEN FAILED — FALLING BACK TO MANUAL IMPLEMENTATION            ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  Error: {actual error message from AutoGen}                        ║
║                                                                    ║
║  Troubleshooting attempted:                                        ║
║    □ Journey status: {clarified | other}                           ║
║    □ Frontmatter YAML: {valid | invalid}                           ║
║    □ Modules format: {object | array (needs fix)}                  ║
║                                                                    ║
║  Reason for fallback: {specific reason AutoGen cannot be used}     ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
```

**Then proceed to Step 5** (Manual Implementation) as fallback.

**⚠️ LOOPHOLE PREVENTION:** You cannot claim "AutoGen failed" without showing the actual error. The output above is MANDATORY before any manual code generation.

---

## Step 4 — Pull discovery/testability signals (recommended)
If `useDiscovery=auto` and discovery outputs exist (from /artk.discover-foundation), load:
- `docs/TESTABILITY.md` and/or `docs/DISCOVERY.md`
Use them to:
- confirm selectors strategy availability (roles/test ids)
- identify known async "risk zones"
- identify environment constraints
- map scope/routes to modules

Do not invent facts.

---

## Step 5 — Manual Test Implementation (FALLBACK ONLY)

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  ⚠️  FALLBACK: Only use this step when AutoGen cannot generate tests      ║
# ╠═══════════════════════════════════════════════════════════════════════════╣
# ║  Valid reasons to use manual implementation:                              ║
# ║  - AutoGen failed entirely                                                ║
# ║  - AutoGen has blocked steps that machine hints can't resolve             ║
# ║  - Complex async flows need custom polling logic                          ║
# ║  - Multi-actor coordination requires custom setup                         ║
# ║  - Domain-specific assertions not covered by AutoGen                      ║
# ║  - Journey is not clarified (`allowNonClarified=true`)                    ║
# ║                                                                           ║
# ║  If AutoGen succeeded with no blocked steps, SKIP this step entirely.     ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

### 5.1 Strict gates and blocker resolution
If `strictGates=true`, enforce these gates:
- **Selector gate**: critical controls must be reliably locatable.
- **Data gate**: deterministic data setup must be feasible.
- **Environment gate**: baseURL/env must be reachable.

If any gate fails:
- If `allowBlocked=false`: stop, add a blocker note to the Journey (managed block), and print remediation steps.
- If `allowBlocked=true`: create skipped tests with clear reasons, but do NOT set Journey implemented.

### 5.2 Determine test plan (single vs split)
Decide test shape based on `splitStrategy` and `flakyBudget`.

Default:
- one Journey = one main test unless splitting improves reliability.

Splitting is allowed when:
- multiple independent outcomes exist, OR
- long flows have multiple hard boundaries, OR
- multi-actor workflows require clarity, OR
- `flakyBudget=low` (be conservative).

### 5.3 Decide file placement and naming (idempotent)
- Determine test file path based on strategy.
- Search existing tests for `@JRN-####`:
  - If found, update instead of creating a new one.
- If duplicates exist, pick the most canonical and flag others for cleanup.

### 5.4 Module plan (foundation + feature)

#### 5.4.1 Verify foundation modules exist
Ensure equivalents exist for:
- auth
- navigation
- selectors/locators
- data/run-id/builders

If missing: stop and instruct `/artk.discover-foundation`.

#### 5.4.2 Feature modules
Create missing feature modules only when needed.
Keep modules small and composable. No mega-POMs.

### 5.5 Implement selector strategy (resilience rules)
1) Prefer `getByRole` with name.
2) Else `getByLabel`, `getByPlaceholder`.
3) Else `byTestId` helper.
4) CSS/XPath only as last resort with justification and encapsulation.

Never:
- rely on auto-generated class names
- use brittle `nth()` without strong reason

### 5.6 Implement waiting/async strategy (no sleeps)
- Use Playwright auto-wait.
- For navigation, assert completion with URL/title/heading.
- For background jobs: `expect.poll` / `expect.toPass` with bounded timeouts.
- Avoid `networkidle` unless you know it helps.
- `page.waitForTimeout()` is forbidden except as last resort with TODO.

### 5.7 Implement data strategy (setup + cleanup)
- Prefer API seed helpers if available.
- Namespace all created data using `runId`.
- Cleanup if feasible; otherwise ensure namespacing and document.

### 5.8 Manual Test Writing Guidelines

**CRITICAL: Import from ARTK Core Fixtures**

**Auth/RBAC tagging rules (mandatory when applicable):**
- Add `@auth` if the Journey validates login, logout, redirects to IdP, or unauthenticated access behavior.
- Add `@rbac` if the Journey validates role-based access (admin vs user, permission gates).
- Do **not** add `@auth`/`@rbac` for pure public pages or generic business flows unless access control is being asserted.

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

**Use Grid Helpers for AG Grid Testing:**
```typescript
import { agGrid } from '@artk/core/grid';

await test.step('Verify orders grid data', async () => {
  const grid = agGrid(authenticatedPage, 'orders-grid');

  // Wait for grid to be ready
  await grid.waitForReady();
  await grid.waitForDataLoaded();

  // Verify data
  await grid.expectRowCount(10);
  await grid.expectRowContains({ orderId: '12345', status: 'Active' });

  // Sort and filter
  await grid.sortByColumn('date', 'desc');
  await grid.filterByColumn('status', 'Pending');

  // Handle virtualized grids (scrolls to find row)
  await grid.scrollToRow({ ariaRowIndex: 500 });

  // Enterprise features (if ag-grid-enterprise is used)
  await grid.expandGroup({ ariaRowIndex: 1 });
  await grid.expandMasterRow({ ariaRowIndex: 2 });
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

### 5.9 MANDATORY: Record Blocked Step Patterns (Learning Loop)

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  📚 BLOCKED STEP LEARNING: Close the Learning Loop                        ║
# ╠═══════════════════════════════════════════════════════════════════════════╣
# ║  When you manually implement code for a BLOCKED step from AutoGen,        ║
# ║  you MUST record the pattern so LLKB can learn from it.                   ║
# ║                                                                           ║
# ║  This is how the system improves over time:                               ║
# ║  1. AutoGen blocks on complex step                                        ║
# ║  2. You (LLM) write the Playwright code                                   ║
# ║  3. You record the pattern to LLKB                                        ║
# ║  4. Next time, AutoGen may be able to generate it                         ║
# ║                                                                           ║
# ║  WITHOUT this step, LLKB never learns and blocked rates stay high.        ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

**For EACH blocked step you implemented manually, run:**

```bash
cd <ARTK_ROOT>/<harnessRoot>

artk llkb learn --type pattern --journey <JRN-ID> --success \
  --context "<original step text from journey>" \
  --selector-strategy <testid|role|label|css> \
  --selector-value "<the selector you used>"
```

**Example: If AutoGen blocked on "Verify the order summary shows correct total":**

```bash
# You wrote this code:
#   await expect(page.getByTestId('order-total')).toHaveText(expectedTotal);

# Record it to LLKB:
artk llkb learn --type pattern --journey JRN-0042 --success \
  --context "Verify the order summary shows correct total" \
  --selector-strategy testid \
  --selector-value "order-total"
```

**Blocked Step Learning Checklist:**
- [ ] Identified all blocked steps from AutoGen output
- [ ] Wrote Playwright code for each blocked step
- [ ] Recorded pattern to LLKB for each blocked step
- [ ] Verified command succeeded (no errors)

**Output after recording blocked step patterns:**
```
╔════════════════════════════════════════════════════════════════════╗
║  BLOCKED STEPS → LLKB PATTERNS RECORDED                            ║
╠════════════════════════════════════════════════════════════════════╣
║  Journey: {JRN-ID}                                                 ║
║  Blocked steps fixed: {count}                                      ║
║  Patterns recorded: {count}                                        ║
║                                                                    ║
║  These patterns will improve AutoGen for future journeys.          ║
╚════════════════════════════════════════════════════════════════════╝
```

---

## Step 6 — LLKB Component Matching and Usage Recording

### 6.1 Match Generated Code to Existing Components

For each step in the generated test code (from AutoGen or manual):

**Component Matching Algorithm with Confidence Thresholds:**

```
FOR each testStep in generatedTest.steps:
  keywords = extractKeywords([testStep])

  # Find candidate components
  candidates = llkbContext.components.filter(c =>
    c.category matches stepType AND
    (c.scope === 'universal' OR
     c.scope === `framework:${appProfile.framework}` OR
     c.scope === 'app-specific') AND
    c.usageContext.some(ctx => ctx matches keywords)
  )

  # Score each candidate
  FOR each candidate in candidates:
    score = calculateSimilarity(testStep.description, candidate.usageContext)

    # ═══════════════════════════════════════════════════════════════
    # CONFIDENCE THRESHOLDS (MANDATORY)
    # ═══════════════════════════════════════════════════════════════
    IF score > 0.7:
      # AUTO-USE: Import and call the component
      USE candidate
      recordComponentUsage(candidate, journey.id)
      LOG: "Component matched - {candidate.id} for step {stepNumber} (score: {score})"

    ELIF score > 0.4:
      # SUGGEST: Show to user in output, let them decide
      SUGGEST candidate
      LOG: "Component suggested - {candidate.id} for step {stepNumber} (score: {score})"

    ELSE:
      # NO MATCH: Write inline code
      PASS
```

**Example Match:**
```
Journey step: "Verify that the sidebar navigation is visible"

Component: COMP001 - verifySidebarReady
  usageContext: ["After page load, before navigation actions", "When testing any page that has sidebar"]
  category: navigation
  scope: app-specific

Match score: 0.85 → AUTO-USE

Generated code:
  import { verifySidebarReady } from '@modules/foundation/navigation';
  await verifySidebarReady(page);
```

**Lesson Application with Confidence Levels:**

```
FOR each lesson in llkbContext.lessons:
  IF testCode.matches(lesson.applicableTo):
    confidence = lesson.metrics.confidence

    # ═══════════════════════════════════════════════════════════════
    # LESSON CONFIDENCE THRESHOLDS
    # ═══════════════════════════════════════════════════════════════
    IF confidence > 0.7:
      # HIGH: Auto-apply pattern, add comment
      APPLY lesson.pattern
      ADD COMMENT: "// LLKB {lesson.id}: {lesson.title} (confidence: {confidence})"
      recordLessonApplication(lesson, journey.id, success=true)

    ELIF confidence >= 0.5:
      # MEDIUM: Add comment with suggestion only
      ADD COMMENT: "// LLKB suggests {lesson.id}: {lesson.title} - consider applying"
      recordLessonApplication(lesson, journey.id, success=null)  # pending validation

    ELSE:
      # LOW (< 0.5): Skip entirely
      PASS
```

### 6.2 Predict Reuse for New Patterns (with Rate Limiting)

When writing NEW inline code (no existing component matches):

1. **Analyze the pattern**: Is this a common UI interaction?
   - Navigation (sidebar, menu, breadcrumb, tabs)
   - Forms (validation, submission, clearing, field interaction)
   - Tables/Grids (sorting, filtering, row selection, pagination)
   - Modals/Dialogs (open, close, confirm, cancel)
   - Notifications (toast, alert, banner, snackbar)
   - Loading states (spinners, skeletons, progress bars)

2. **Check other journeys**: Does this pattern appear in other proposed/implemented journeys?
   - Read `journeys/index.json` for all journeys
   - Scan journey steps for similar keywords
   - **If 1+ other journey has similar step** → Consider extraction
   - **If 0 other journeys but common pattern** → Mark as candidate

3. **Rate Limiting (MANDATORY)**:

   ```
   FUNCTION shouldExtractPredictively(pattern, config) -> ExtractDecision:
     # ═══════════════════════════════════════════════════════════════
     # CHECK 1: Is predictive extraction enabled?
     # ═══════════════════════════════════════════════════════════════
     IF NOT config.extraction.predictiveExtraction:
       RETURN { extract: false, reason: "Predictive extraction disabled in config" }

     # ═══════════════════════════════════════════════════════════════
     # CHECK 2: Session rate limit (max extractions per journey)
     # ═══════════════════════════════════════════════════════════════
     MAX_PREDICTIVE_PER_JOURNEY = 3  # Hard cap

     IF sessionState.predictiveExtractionCount >= MAX_PREDICTIVE_PER_JOURNEY:
       RETURN {
         extract: false,
         reason: "Session limit reached (" + MAX_PREDICTIVE_PER_JOURNEY + " per journey)",
         fallback: "Mark as extraction candidate for journey-verify"
       }

     # ═══════════════════════════════════════════════════════════════
     # CHECK 3: Daily rate limit (prevent LLKB bloat)
     # ═══════════════════════════════════════════════════════════════
     MAX_PREDICTIVE_PER_DAY = 10  # Hard cap

     todayExtractions = countPredictiveExtractionsToday()
     IF todayExtractions >= MAX_PREDICTIVE_PER_DAY:
       RETURN {
         extract: false,
         reason: "Daily limit reached (" + MAX_PREDICTIVE_PER_DAY + " per day)",
         fallback: "Mark as extraction candidate, will be reviewed tomorrow"
       }

     # ═══════════════════════════════════════════════════════════════
     # CHECK 4: Component count limit (prevent registry bloat)
     # ═══════════════════════════════════════════════════════════════
     MAX_TOTAL_COMPONENTS = 100  # Soft cap with warning

     totalComponents = loadJSON(".artk/llkb/components.json").components.length
     IF totalComponents >= MAX_TOTAL_COMPONENTS:
       # Still allow, but with warning
       LOG WARNING: "Component count high (" + totalComponents + "). Consider running LLKB prune."

     # ═══════════════════════════════════════════════════════════════
     # CHECK 5: Pattern uniqueness (prevent near-duplicates)
     # ═══════════════════════════════════════════════════════════════
     existingComponents = loadJSON(".artk/llkb/components.json").components

     FOR each existing in existingComponents:
       similarity = calculateSimilarity(pattern.normalizedCode, existing.source.originalCode)
       IF similarity > 0.8:  # 80% similar
         RETURN {
           extract: false,
           reason: "Near-duplicate of existing component " + existing.id,
           suggestion: "Use existing component: " + existing.name
         }

     # ═══════════════════════════════════════════════════════════════
     # CHECK 6: Minimum complexity threshold
     # ═══════════════════════════════════════════════════════════════
     MIN_LINES_FOR_EXTRACTION = 3

     IF pattern.lineCount < MIN_LINES_FOR_EXTRACTION:
       RETURN {
         extract: false,
         reason: "Pattern too simple (" + pattern.lineCount + " lines < " + MIN_LINES_FOR_EXTRACTION + " minimum)"
       }

     # All checks passed - allow extraction
     RETURN { extract: true }
   ```

   **Rate limit configuration (in config.yml):**
   ```yaml
   extraction:
     predictiveExtraction: true
     maxPredictivePerJourney: 3    # Max predictive extractions per journey run
     maxPredictivePerDay: 10       # Max predictive extractions per day
     minLinesForExtraction: 3      # Minimum code lines to extract
     similarityThreshold: 0.8      # Near-duplicate detection threshold
   ```

   **Rate Limit Helper Functions (MANDATORY IMPLEMENTATIONS):**

   ```
   # ═══════════════════════════════════════════════════════════════
   # COUNT DAILY EXTRACTIONS: Query history for today's extractions
   # ═══════════════════════════════════════════════════════════════
   FUNCTION countPredictiveExtractionsToday() -> number:
     today = formatDate(now(), "YYYY-MM-DD")
     historyPath = ".artk/llkb/history/" + today + ".jsonl"

     IF NOT exists(historyPath):
       RETURN 0

     count = 0
     FOR line in readLines(historyPath):
       TRY:
         event = JSON.parse(line)
         # Count predictive extractions from journey-implement
         IF event.event == "component_extracted" AND event.prompt == "journey-implement":
           count += 1
       CATCH:
         # Skip malformed lines
         CONTINUE

     RETURN count

   # ═══════════════════════════════════════════════════════════════
   # SIMILARITY CALCULATION: Detect near-duplicate patterns
   # ═══════════════════════════════════════════════════════════════
   FUNCTION calculateSimilarity(codeA: string, codeB: string) -> float:
     # Normalize both code snippets
     normA = normalizeCode(codeA)
     normB = normalizeCode(codeB)

     # Exact match after normalization
     IF normA == normB:
       RETURN 1.0

     # Empty check
     IF normA.length == 0 OR normB.length == 0:
       RETURN 0.0

     # Jaccard similarity on tokens (word-level)
     tokensA = new Set(normA.split(/\s+/))
     tokensB = new Set(normB.split(/\s+/))

     intersection = tokensA.intersection(tokensB)
     union = tokensA.union(tokensB)

     IF union.size == 0:
       RETURN 0.0

     jaccardScore = intersection.size / union.size

     # Bonus for same structure (same number of lines, similar length)
     linesA = codeA.split('\n').length
     linesB = codeB.split('\n').length
     lineSimilarity = 1.0 - abs(linesA - linesB) / max(linesA, linesB)

     # Weighted average (Jaccard is primary, structure is secondary)
     similarity = (jaccardScore * 0.8) + (lineSimilarity * 0.2)

     RETURN round(similarity, 2)

   # ═══════════════════════════════════════════════════════════════
   # NORMALIZE CODE: Prepare code for similarity comparison
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
   ```

   **When rate limit is hit:**
   - Mark the pattern with `// LLKB: extraction candidate (rate limit)` comment
   - Log to history: `{"event":"extraction_deferred","reason":"rate_limit",...}`
   - journey-verify will re-evaluate during its cross-journey analysis

4. **Decision**:
   - **Likely reusable + passes rate limits** → Extract and create component
   - **Likely reusable + rate limit hit** → Mark as `// LLKB: extraction candidate`
   - **Uncertain** → Mark as `// LLKB: extraction candidate`
   - **Unique/one-off** → Write inline, no marking

### 6.3 Create Component for Extracted Patterns

When creating a new component:

1. **Generate module file** with clear documentation:
   ```typescript
   /**
    * Verify sidebar navigation is ready
    *
    * @component COMP###
    * @category navigation
    * @scope app-specific
    * @extractedFrom JRN-####
    * @createdBy journey-implement (predictive)
    */
   export async function verifySidebarReady(
     page: Page,
     options: VerifyOptions = {}
   ): Promise<void> {
     const { timeout = 10000 } = options;
     // LLKB: Applied L001 - use data-testid for sidebar container
     const sidebar = page.locator('[data-testid="sidebar-nav"]');
     await expect(sidebar).toBeVisible({ timeout });
   }
   ```

2. **Add entry to `components.json`**

3. **Log to `history/<YYYY-MM-DD>.jsonl`**:
   ```jsonl
   {"timestamp":"<ISO8601>","event":"component_created","id":"COMP###","journey":"JRN-####","prompt":"journey-implement"}
   ```

4. **Increment session counter**:
   ```
   sessionState.predictiveExtractionCount += 1
   ```

### 6.4 Record All Usage

After generating all test code:

1. **For each component used**:
   - Update `components.json`:
     - Add journey to `usedInJourneys` array
     - Increment `totalUses`
     - Update `lastUsed` timestamp
   - Log to `history/<YYYY-MM-DD>.jsonl`:
     ```jsonl
     {"timestamp":"<ISO8601>","event":"component_used","id":"COMP###","journey":"JRN-####","prompt":"journey-implement"}
     ```

2. **For each lesson applied**:
   - Log to `history/<YYYY-MM-DD>.jsonl`:
     ```jsonl
     {"timestamp":"<ISO8601>","event":"lesson_applied","id":"L###","journey":"JRN-####","prompt":"journey-implement","success":true}
     ```

### 6.5 Decision Tree Safeguards (Edge Case Handling)

**Handle edge cases that can break the LLKB workflow:**

#### 6.5.1 LLKB vs User Disagreement (Override Mechanism)

**When LLKB suggests a pattern but user/test indicates it's wrong:**

```
FUNCTION handleLLKBConflict(suggestion: Suggestion, userChoice: UserChoice) -> Resolution:
  config = loadYAML(".artk/llkb/config.yml")

  # ═══════════════════════════════════════════════════════════════
  # CASE 1: User explicitly overrides LLKB suggestion
  # ═══════════════════════════════════════════════════════════════
  IF userChoice.action == "OVERRIDE":
    IF config.overrides.allowUserOverride:
      # Log the override for future review
      appendToHistory({
        event: "user_override",
        lessonId: suggestion.lessonId,
        componentId: suggestion.componentId,
        userReason: userChoice.reason,
        journey: currentJourney.id
      })

      # Track override count for this pattern
      item = getLessonOrComponent(suggestion.id)
      item.overrideCount = (item.overrideCount || 0) + 1

      IF item.overrideCount >= config.overrides.flagAfterOverrides:
        # Flag for human review
        addToNeedsReview(item, "Multiple user overrides - may be wrong pattern")

      RETURN { action: "USE_USER_CHOICE", reason: "User override accepted" }
    ELSE:
      RETURN { action: "WARN", reason: "User overrides disabled in config" }

  # ═══════════════════════════════════════════════════════════════
  # CASE 2: Test failure indicates LLKB pattern is wrong
  # ═══════════════════════════════════════════════════════════════
  IF userChoice.action == "TEST_FAILED":
    item = getLessonOrComponent(suggestion.id)

    # Decrement success rate
    item.metrics.successRate = recalculateSuccessRate(item, false)
    item.metrics.lastFailure = now().toISO8601()

    # Recalculate confidence
    item.metrics.confidence = calculateConfidence(item)

    IF item.metrics.confidence < 0.4:
      # Demote to low confidence
      addToNeedsReview(item, "Confidence dropped below threshold after failure")

    RETURN { action: "LOG_FAILURE", reason: "Pattern failure recorded" }

  # ═══════════════════════════════════════════════════════════════
  # CASE 3: LLKB and user both have valid but different approaches
  # ═══════════════════════════════════════════════════════════════
  IF userChoice.action == "ALTERNATIVE_VALID":
    # Both are valid - add user's approach as new lesson with lower confidence
    createLesson({
      ...userChoice.pattern,
      source: { discoveredBy: "user-override", journey: currentJourney.id },
      metrics: { confidence: 0.5, occurrences: 1 },  # Start with medium confidence
      validation: { autoValidated: false, humanReviewed: true }
    })

    RETURN {
      action: "BOTH_VALID",
      reason: "Added user pattern as alternative. LLKB pattern retained."
    }
```

**User notification when override is logged:**
```
⚠️  LLKB Override Recorded
────────────────────────────────────────────────────
Pattern: L001 - Use role-based selectors for buttons
Your choice: CSS selector with explicit wait
Reason: [user provided reason]

This override has been logged. After 3 overrides for this pattern,
it will be flagged for human review.

To always use your preferred pattern, add to config.yml:
  overrides:
    suppressLesson: ["L001"]
────────────────────────────────────────────────────
```

#### 6.5.2 Circular Component References

**Detect and prevent components that depend on each other:**

```
FUNCTION detectCircularReferences(componentId: string) -> CircularRefResult:
  visited = Set()
  path = []

  FUNCTION dfs(compId: string) -> bool:
    IF compId in visited:
      # Found a cycle
      cycleStart = path.indexOf(compId)
      cycle = path.slice(cycleStart).concat([compId])
      RETURN { hasCycle: true, cycle: cycle }

    visited.add(compId)
    path.push(compId)

    component = getComponent(compId)
    FOR depId in component.dependencies || []:
      result = dfs(depId)
      IF result.hasCycle:
        RETURN result

    path.pop()
    RETURN { hasCycle: false }

  RETURN dfs(componentId)

# Usage during component creation
FUNCTION validateComponentDependencies(newComponent: Component) -> ValidationResult:
  # Check if adding this component creates a cycle
  FOR depId in newComponent.dependencies || []:
    depComponent = getComponent(depId)
    IF depComponent.dependencies?.includes(newComponent.id):
      RETURN {
        valid: false,
        error: "Circular dependency: " + newComponent.id + " <-> " + depId,
        suggestion: "Merge these components or refactor shared logic"
      }

    # Deep check
    circularCheck = detectCircularReferences(depId)
    IF circularCheck.hasCycle AND circularCheck.cycle.includes(newComponent.id):
      RETURN {
        valid: false,
        error: "Circular dependency chain detected: " + circularCheck.cycle.join(" -> "),
        suggestion: "Break cycle by extracting shared logic to new component"
      }

  RETURN { valid: true }
```

**When circular reference detected:**
```
❌ Circular Component Reference Detected
────────────────────────────────────────────────────
COMP015 (verifyGridReady) depends on COMP020 (expectLoadingComplete)
COMP020 (expectLoadingComplete) depends on COMP015 (verifyGridReady)

This creates a circular dependency that cannot be resolved.

Resolution options:
1. Merge components: Combine shared logic into single component
2. Extract common: Create COMP021 for shared logic both depend on
3. Inline: Remove dependency, duplicate the code (last resort)

Choose an option or modify your implementation.
────────────────────────────────────────────────────
```

#### 6.5.3 Stale Pattern Detection

**Warn when using patterns that haven't been validated recently:**

```
FUNCTION checkPatternStaleness(item: Lesson | Component) -> StalenessResult:
  config = loadYAML(".artk/llkb/config.yml")
  maxAge = config.retention.maxLessonAge  # default 90 days

  daysSinceLastSuccess = daysBetween(now(), item.metrics.lastSuccess || item.metrics.firstSeen)

  IF daysSinceLastSuccess > maxAge:
    RETURN {
      isStale: true,
      daysSinceSuccess: daysSinceLastSuccess,
      warning: "Pattern hasn't been validated in " + daysSinceLastSuccess + " days",
      suggestion: "Use with caution. Consider re-validating or archiving."
    }

  IF daysSinceLastSuccess > maxAge * 0.7:  # 70% of max age
    RETURN {
      isStale: false,
      warning: "Pattern approaching stale threshold (" + daysSinceLastSuccess + "/" + maxAge + " days)",
      suggestion: "Consider re-using in a journey to refresh validation"
    }

  RETURN { isStale: false }
```

**When stale pattern is used:**
```
⚠️  STALE PATTERN WARNING
────────────────────────────────────────────────────
Pattern: L022 - Toast timing patterns
Last validated: 95 days ago (threshold: 90 days)

This pattern may be outdated. The application may have changed.

Options:
1. Use anyway (pattern will be revalidated if tests pass)
2. Skip pattern and write inline code
3. Archive pattern (marks as deprecated)

Proceeding with caution...
────────────────────────────────────────────────────
```

---

## Step 7 — Output LLKB Summary (MANDATORY)

**You MUST output this section after code generation:**

```
╔════════════════════════════════════════════════════════════════════╗
║  LLKB INTEGRATION SUMMARY                                          ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  Components Reused: {count}                                        ║
║    {for each: "- {id}: {name} ({category})"}                       ║
║                                                                    ║
║  Components Created: {count}                                       ║
║    {for each: "- {id}: {name} ({category}, {scope})"}              ║
║                                                                    ║
║  Lessons Applied: {count}                                          ║
║    {for each: "- {id}: {title} (confidence: {confidence}%)"}       ║
║                                                                    ║
║  Extraction Candidates: {count}                                    ║
║    {for each: "- Step {n}: {description} (reason: {reason})"}      ║
║                                                                    ║
║  Rate Limits:                                                      ║
║    Session extractions: {sessionState.predictiveExtractionCount}/3 ║
║    Daily extractions: {todayCount}/10                              ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
```

---

## Step 7.5 — Persist LLKB Updates to Disk (MANDATORY)

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  🛑 CRITICAL: LLKB MUST BE SAVED BEFORE MOVING TO NEXT JOURNEY            ║
# ╠═══════════════════════════════════════════════════════════════════════════╣
# ║                                                                           ║
# ║  After each journey implementation, you MUST write LLKB updates to disk.  ║
# ║  This ensures the next journey benefits from lessons learned.             ║
# ║                                                                           ║
# ║  DO NOT proceed to Step 8 or the next journey without saving LLKB.        ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

### Mode-Specific Behavior

```
# ═══════════════════════════════════════════════════════════════
# WHO PERSISTS LLKB DEPENDS ON THE EXECUTION MODE
# ═══════════════════════════════════════════════════════════════

IF batchMode == "subagent":
  # ─────────────────────────────────────────────────────────────
  # SUBAGENT MODE: Orchestrator handles LLKB persistence
  # ─────────────────────────────────────────────────────────────
  # - Subagents collect their LLKB updates in memory
  # - Subagents return updates in their result payload:
  #     { newComponents[], usedComponents[], appliedLessons[] }
  # - Orchestrator MERGES all updates in Step 5.5 (after subagent collection)
  # - Orchestrator PERSISTS to disk once per batch (not per journey)
  #
  # ⚠️  SUBAGENTS DO NOT WRITE TO LLKB FILES DIRECTLY
  #     This prevents race conditions from parallel writes
  #
  # This step (7.5) is SKIPPED for individual journeys in subagent mode.
  # LLKB persistence happens in Step 5.5 after batch collection.
  #
  IF currentlyInSubagent:
    RETURN  # Skip - orchestrator handles persistence after batch

ELSE IF batchMode == "serial":
  # ─────────────────────────────────────────────────────────────
  # SERIAL MODE: Persist after each journey
  # ─────────────────────────────────────────────────────────────
  # - Each journey is processed completely before the next
  # - LLKB must be persisted before looping to next journey
  # - This ensures Journey N+1 sees updates from Journey N
  #
  # Continue with the persistence steps below...
  PASS
```

**Required LLKB file updates (write to disk NOW — SERIAL MODE ONLY):**

1. **Update `components.json`** if any components were created or used:
   ```
   # Read current file
   components = loadJSON("${LLKB_ROOT}/components.json")

   # Add new components created during this journey
   FOR each newComponent:
     components.components.push(newComponent)

   # Update usage stats for reused components
   FOR each usedComponent:
     component = findById(usedComponent.id)
     component.usedInJourneys.push(currentJourney.id)
     component.totalUses += 1
     component.lastUsed = now().toISO8601()

   # Write back to disk
   writeJSON("${LLKB_ROOT}/components.json", components)
   ```

2. **Append to history log** (creates file if missing):
   ```
   historyPath = "${LLKB_ROOT}/history/{YYYY-MM-DD}.jsonl"

   FOR each event (component_created, component_used, lesson_applied):
     appendLine(historyPath, JSON.stringify({
       timestamp: now().toISO8601(),
       event: eventType,
       id: itemId,
       journey: currentJourney.id,
       prompt: "journey-implement"
     }))
   ```

3. **Update `lessons.json`** if lessons were applied:
   ```
   lessons = loadJSON("${LLKB_ROOT}/lessons.json")

   FOR each lessonApplied:
     lesson = findById(lessonApplied.id)
     lesson.metrics.successRate = recalculateSuccessRate(lesson)
     lesson.metrics.lastApplied = now().toISO8601()

   writeJSON("${LLKB_ROOT}/lessons.json", lessons)
   ```

**Verification checklist (before proceeding):**
- [ ] `components.json` written to disk (check file modification time)
- [ ] `history/{YYYY-MM-DD}.jsonl` updated with events
- [ ] `lessons.json` updated if lessons were applied
- [ ] LLKB Summary output includes accurate counts

**If LLKB files don't exist:** Create them with initial structure:
```json
// components.json
{ "version": "1.0", "components": [] }

// lessons.json
{ "version": "1.0", "lessons": [] }
```

---

## Step 8 — Pre-Compilation Validation (MANDATORY)

**BEFORE proceeding to validation gates, you MUST complete the Pre-Compilation Validation Checklist from `.github/prompts/common/GENERAL_RULES.md`.**

Run through each check on ALL generated test files and modules:
1. **Duplicate Function Check** — No function defined in multiple files
2. **ESM Import Path Check** — Directory imports include `/index`
3. **Import Usage Check** — No unused imports, unused params prefixed with `_`
4. **Path Alias Check** — Consistent import patterns
5. **Syntax Quick Check** — Template literals use backticks, no unclosed brackets

**Only proceed to Step 9 after ALL checks pass.**

---

## Step 9 — Update Journey draft links (pre-gate)
Before running gates, you may:
- add the new test path(s) to Journey `tests[]` (so verify can find them)
- add a managed "implementation draft" block

Do NOT set `status: implemented` yet.

## Step 10 — Update module registry draft (optional)
If `updateModulesRegistry=true`, update registry with new modules and journeyDependencies.

## Step 11 — Run /artk.journey-validate (static gates)
If `postValidate=auto|true`:
- Execute `/artk.journey-validate id=<JRN-####> harnessRoot=<harnessRoot> mode=<validateMode> strict=true`
- If it fails:
  - fix violations (tags/imports/forbidden patterns)
  - re-run validate
If you cannot execute commands here:
- output the exact `/artk.journey-validate ...` invocation as the next step and stop before claiming success.

## Step 12 — Run /artk.journey-verify (run + stabilize)
If `postVerify=auto|true`:
- Execute `/artk.journey-verify id=<JRN-####> harnessRoot=<harnessRoot> mode=<verifyMode> heal=<heal> healAttempts=<healAttempts> repeat=<repeatGate> failOnFlaky=<failOnFlaky>`
- If it fails:
  - apply bounded fixes based on evidence (selectors/data/async)
  - re-run verify until attempts exhausted or blocked

If verification cannot be executed (environment unreachable):
- keep Journey status at clarified/defined
- add a blocker note and print the required next step (run verify in the correct region).

## Step 12.5 — Record Learning (MANDATORY after successful verification)

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  📚 LEARNING LOOP: Improve LLKB for Future Journeys                       ║
# ╠═══════════════════════════════════════════════════════════════════════════╣
# ║  When verification PASSES, record successful patterns to LLKB.            ║
# ║  This improves AutoGen's output for future journey implementations.       ║
# ║                                                                           ║
# ║  Skip this step if verification FAILED (don't record failed patterns).   ║
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

**Example learning commands for a login journey:**
```bash
# Record successful login button selector
artk llkb learn --type pattern --journey JRN-0001 --success \
  --context "Login submit button" \
  --selector-strategy testid \
  --selector-value "login-button"

# Record successful use of auth component
artk llkb learn --type component --id COMP-AUTH-001 --journey JRN-0001 --success

# Record that "wait for navigation" lesson worked
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
║  Components used: {count}                                          ║
║  Lessons applied: {count}                                          ║
║                                                                    ║
║  LLKB confidence scores updated.                                   ║
║  Next journey will benefit from these learnings.                   ║
╚════════════════════════════════════════════════════════════════════╝
```

**If verification failed, output:**
```
╔════════════════════════════════════════════════════════════════════╗
║  LLKB LEARNING SKIPPED                                             ║
╠════════════════════════════════════════════════════════════════════╣
║  Journey: {JRN-ID}                                                 ║
║  Verification: FAILED                                              ║
║                                                                    ║
║  Reason: Only record patterns that pass verification.              ║
║  Action: Fix verification issues, then record learning.            ║
╚════════════════════════════════════════════════════════════════════╝
```

---

## Step 13 — Finalize Journey as implemented (only after gates pass)
If validate and verify both pass:
- Set Journey `status: implemented`
- Ensure `tests[]` is non-empty and deduped
- Add/update:
  - `<!-- ARTK:IMPLEMENT:BEGIN --> ... <!-- ARTK:IMPLEMENT:END -->`
  - `<!-- ARTK:VERIFY:BEGIN --> ... <!-- ARTK:VERIFY:END -->`
- Regenerate backlog/index:
  - Preferred: `node <ARTK_ROOT>/tools/journeys/generate.js --artkRoot <ARTK_ROOT>`
  - Or run the npm script if configured: `npm run journeys:generate`

If either gate fails:
- Do NOT set implemented.
- Keep status clarified/defined and capture reasons.

## Step 14 — Loop to Next Journey (Batch Execution)

**This step applies only for SERIAL mode (`batchMode=serial`).**

**For SUBAGENT mode, batch looping is handled in Step 1.2 where subagent results are merged.**

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  🛑 PREREQUISITE: Verify LLKB was persisted (Step 7.5)                    ║
# ╠═══════════════════════════════════════════════════════════════════════════╣
# ║                                                                           ║
# ║  BEFORE looping to the next journey, confirm:                             ║
# ║  ✓ components.json was updated and written to disk                        ║
# ║  ✓ history/{YYYY-MM-DD}.jsonl was appended with events                    ║
# ║  ✓ lessons.json was updated if lessons were applied                       ║
# ║                                                                           ║
# ║  If LLKB was NOT persisted, go back to Step 7.5 and complete it.          ║
# ║  The next journey MUST see the updated LLKB to benefit from it.           ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

**If processing multiple journeys in SERIAL mode:**
```
IF batchMode == "serial":
  # ═══════════════════════════════════════════════════════════════
  # VERIFY: LLKB was persisted before proceeding
  # ═══════════════════════════════════════════════════════════════
  IF NOT llkbWasPersistedThisJourney:
    ERROR: "LLKB not persisted. Go back to Step 7.5."
    STOP

  sessionState.journeysCompleted.push(currentJourney.id)
  newComponentsThisJourney = sessionState.predictiveExtractionCount  # Track before reset

  IF journeyIndex < totalJourneys - 1:
    # ═══════════════════════════════════════════════════════════════
    # CRITICAL: Reset per-journey counters for next journey
    # ═══════════════════════════════════════════════════════════════
    # The predictiveExtractionCount is PER-JOURNEY, not cumulative.
    # Without this reset, Journey 2+ cannot extract any components
    # if Journey 1 hit the session limit.
    sessionState.predictiveExtractionCount = 0

    OUTPUT:
    ═══════════════════════════════════════════════════════════════════
    ✅ Journey {currentJourney.id} complete.
    LLKB persisted: components.json, lessons.json, history/{date}.jsonl
    Components created this journey: {newComponentsThisJourney}
    Session extraction count reset: 0/{MAX_PREDICTIVE_PER_JOURNEY}

    Proceeding to next journey ({journeyIndex + 2}/{totalJourneys})...
    ═══════════════════════════════════════════════════════════════════

    # Loop back to Step 1.2b for next journey
    # LLKB context will now include components created in this journey
    # Session extraction counter is reset for fresh limit per journey
  ELSE:
    OUTPUT:
    ═══════════════════════════════════════════════════════════════════
    🎉 SERIAL BATCH EXECUTION COMPLETE

    Journeys implemented: {sessionState.journeysCompleted.length}/{totalJourneys}
    Total components created: {totalNewComponents}
    Total components reused: {totalReusedComponents}
    ═══════════════════════════════════════════════════════════════════
```

## Step 15 — Print run/debug instructions
Include:
- run by tag: `npx playwright test --grep @JRN-####`
- run by file path
- debug: `--ui`, `--headed`
- where to find report and traces (per foundation config)

---

# Mode-based question policy (don't be annoying)

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
- **Flaky env**: do not "fix" with timing. Use explicit completion signals or quarantine later.
- **AG Grid / Data grids**: Use `@artk/core/grid` helpers instead of raw selectors. Handle virtualization with `scrollToRow()`. For enterprise features (grouping, tree data, master-detail), use the specialized enterprise helpers.
- **Large datasets in grids**: Use ARIA-based row targeting (`ariaRowIndex`) for virtualized grids that only render visible rows.
- **Batch execution (subagent mode - DEFAULT)**: Journeys are processed in parallel batches. Faster for large batches. Auto-fallbacks to serial in non-VS Code environments.
- **Batch execution (serial mode - FALLBACK)**: Use `batchMode=serial` if parallel fails or for step-by-step debugging. Works in ALL environments.
- **Subagent timeout handling**: If a subagent doesn't complete within `subagentTimeout` (default 5 minutes), it's marked as timeout and the journey is NOT implemented.
- **Subagent nesting limitation**: Subagents CANNOT spawn other subagents. If using subagent mode, validate/verify gates must run inline within the subagent, not as agent handoffs.

---

# LLKB Library Reference (@artk/core/llkb)

**Use the `@artk/core/llkb` library for all LLKB operations:**

```typescript
import {
  // File operations (atomic writes, locking)
  loadJSON, saveJSONAtomic, updateJSONWithLock,
  // Similarity detection
  calculateSimilarity, jaccardSimilarity, findSimilarPatterns, isNearDuplicate,
  // Category inference
  inferCategory, inferCategoryWithConfidence, isComponentCategory,
  // Rate limiting
  isDailyRateLimitReached, isJourneyRateLimitReached,
  // History logging
  appendToHistory, countTodayEvents, countPredictiveExtractionsToday,
  // Types
  type LLKBConfig, type Lesson, type Component, type HistoryEvent,
} from '@artk/core/llkb';
```

**Key functions for journey-implement:**

| Function | Usage |
|----------|-------|
| `calculateSimilarity(code1, code2)` | Compare code patterns (returns 0-1) |
| `findSimilarPatterns(code, patterns)` | Find matching components for a step |
| `inferCategory(code)` | Categorize code (navigation, auth, data, etc.) |
| `isDailyRateLimitReached(config, llkbRoot)` | Check if extraction limit hit |
| `appendToHistory(event, llkbRoot)` | Log component_used, lesson_applied events |
| `updateJSONWithLock(path, updater)` | Safe concurrent updates to components.json |

---

# Completion checklist (print at end)
- [ ] **LLKB context loaded** before any code generation
- [ ] **AutoGen attempted** as primary approach (command shown + result recorded)
- [ ] Test file(s) created/updated with `@JRN-####` and tier tag
- [ ] `@auth` / `@rbac` tags present when access control is asserted
- [ ] Tests use harness fixtures and foundation modules
- [ ] No hardcoded URLs; env loader used
- [ ] Web-first assertions used; no timing sleeps
- [ ] Feature modules created only if needed and kept small
- [ ] module registry updated (if enabled)
- [ ] **LLKB usage recorded** (components used/created, lessons applied)
- [ ] `/artk.journey-validate` passed
- [ ] `/artk.journey-verify` passed (including stability gate)
- [ ] Journey updated: tests[] linked, status implemented only when valid+verified
- [ ] backlog/index regenerated
- [ ] **Batch complete** (serial mode): all journeys processed sequentially
- [ ] **Batch complete** (subagent mode): all batches processed, LLKB merged, errors handled

---

### Final Output (MANDATORY)
- [ ] "Next Commands" box displayed from file (READ, don't generate)

# MANDATORY: Final Output Section

**🛑 STOP - READ THE FILE, DON'T GENERATE**

You MUST read and display the contents of this file EXACTLY:

**File to read:** `.github/prompts/next-commands/artk.journey-implement.txt`

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

**Replace `<JRN-ID>` with the actual journey ID that was just implemented (e.g., JRN-0001).**

**IMPORTANT:**
- Do NOT invent commands that don't exist.
- Only use commands from the handoffs section of this prompt.
