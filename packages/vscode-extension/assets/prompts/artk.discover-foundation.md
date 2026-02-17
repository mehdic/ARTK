---
name: artk.discover-foundation
mode: agent
description: "Discover app + Build foundation harness - analyzes routes/features/auth, generates DISCOVERY.md, creates Playwright harness with auth, fixtures, modules"
handoffs:
  - label: "1. RECOMMENDED - /artk.testid-audit: audit testid coverage"
    agent: artk.testid-audit
    prompt: "mode=report"
  - label: "2. OPTIONAL - /artk.journey-propose: propose journeys from discovery"
    agent: artk.journey-propose
    prompt: "Propose journeys from discovery outputs"
  - label: "3. OPTIONAL - /artk.journey-define: create a specific journey manually"
    agent: artk.journey-define
    prompt: 'id=JRN-0001 title="<your title>"'
---

# ARTK /discover-foundation — Orchestrator

You are running **ARTK Discovery + Foundation Build** as a single combined phase.

This is the **orchestrator** prompt. It delegates work to two sub-agents and runs deterministic CLI commands for LLKB initialization. You MUST execute ALL five phases below in order.

---

# Non-Negotiables

1. **Be honest about uncertainty.** If you can't infer something reliably, mark it `unknown` and explain why.
2. **Be deterministic.** Stable ordering and repeatable outputs.
3. **Do not require running the app.** Runtime scan is optional.
4. **No secrets.** Never ask for passwords/tokens. If auth is needed, request a test account *process*, not credentials.
5. **No destructive edits.** Only create/update docs with managed markers.
6. **Do not break existing test tooling.** If Playwright already exists, integrate carefully.
7. **No hardcoded URLs.** Base URL and env must come from the config loader.
8. **Local-first defaults.** Retries should be low locally; CI can raise them later.
9. **Edit safety.** MUST read and follow `.github/prompts/common/GENERAL_RULES.md` before any file edits.
10. **Final output is mandatory.** Before ending, MUST READ and display the "Next Commands" file from `.github/prompts/next-commands/`. Do not generate your own version.
11. **Environment detection is mandatory.** MUST search codebase for environments (Step D1.5) and ASK user to confirm. Never assume defaults are correct.
12. **Auth bypass detection is mandatory.** MUST search codebase for auth bypass mechanisms (Step D6) and ASK user about auth strategy. Never skip this step.

---

# Inputs (optional)

Parse `key=value` arguments:

**Discovery args:**
- `mode`: `quick | standard | max` (default: `standard`)
- `artkRoot`: ARTK root folder path (default: infer from `artk.config.yml`)
- `appScope`: `auto | all | <appName>` (default: `auto`)
- `runtimeScan`: `true | false` (default: `false`)
- `baseUrl`: optional URL for runtime scan
- `maxDepth`: crawl depth (default: `2` if runtimeScan)
- `includePaths` / `excludePaths`: optional route filters
- `generateJourneyShortlist`: `true | false` (default: `true`)
- `generateJourneyStubs`: `true | false` (default: `false`)

**Foundation args:**
- `harnessRoot`: default `e2e`
- `installMode`: `auto | isolated | integrated`
- `lang`: `auto | ts | js`
- `packageManager`: `auto | npm | pnpm | yarn`
- `browsers`: comma list, default `chromium`
- `timeoutMs`: default 30000
- `expectTimeoutMs`: default 5000
- `retriesLocal`: default 0
- `retriesCI`: default 2
- `testIdAttribute`: default `data-testid`
- `authMode`: `ui | api | external` (default: `ui`)
- `authActors`: comma list, default `standard-user,admin`
- `storageStateStrategy`: `per-env | shared` (default: `per-env`)

**Common:**
- `dryRun`: `true | false` (default: `false`)

---

# ╔═══════════════════════════════════════════════════════════════════╗
# ║  MANDATORY EXECUTION PLAN — YOU MUST COMPLETE ALL 5 PHASES       ║
# ╠═══════════════════════════════════════════════════════════════════╣
# ║                                                                   ║
# ║  PHASE 1: Read and execute artk.discover-foundation-core agent    ║
# ║    → Discovery (D0-D10) + Foundation Build (F0-F10)               ║
# ║                                                                   ║
# ║  PHASE 2: Read and execute artk.discover-foundation-core (cont.)  ║
# ║    → Questions + Finalization from the core agent                 ║
# ║                                                                   ║
# ║  PHASE 3: LLKB INITIALIZATION (deterministic CLI commands)        ║
# ║    → F11: bootstrap-llkb.cjs (seed patterns)                     ║
# ║    → F12: artk-autogen llkb-patterns discover (app patterns)     ║
# ║    → Verify: verify-llkb-artifacts.cjs (hard gate)               ║
# ║    These are BASH COMMANDS, not LLM instructions.                 ║
# ║    SKIPPING = journey-implement generates blind.                  ║
# ║                                                                   ║
# ║  PHASE 4: Read and execute artk.discover-foundation-validate      ║
# ║    → Validation (V0-V6) + Self-Check + Final Output              ║
# ║                                                                   ║
# ║  PHASE 5: Display "Next Commands" from file                      ║
# ║                                                                   ║
# ╚═══════════════════════════════════════════════════════════════════╝

---

# PHASE 1+2: Discovery + Foundation Build

**Read the sub-agent file and execute ALL steps within it.**

Read the file: `.github/agents/artk.discover-foundation-core.agent.md`

If that file does not exist, try: `.github/prompts/artk.discover-foundation-core.md`

**Execute ALL steps D0 through F10 from that file, plus the Questions and Edge Cases sections.**

Pass along ALL input arguments parsed above. The sub-agent handles:
- Discovery (Steps D0-D10): app detection, routes, features, auth, testability, risk ranking
- Foundation Build (Steps F0-F10): Playwright config, auth, fixtures, modules, registry
- Questions + Finalization: mode-based question policy, edge case handling

**Do NOT skip any steps. Do NOT proceed to Phase 3 until all D0-F10 steps are complete.**

After completing the core agent, note the `HARNESS_ROOT` value determined in Steps D1/F1.

---

# PHASE 3: LLKB Initialization + Pattern Discovery (CLI Commands)

**These are deterministic CLI commands. Execute them as bash commands, not as LLM reasoning.**

**IMPORTANT:** Before running these commands, you MUST substitute `${HARNESS_ROOT}` with the actual harness root path determined in Step D1/F1 of Phase 1. If the user provided `harnessRoot=my-tests`, use that value. If no value was provided, use the default `artk-e2e` relative to the project root.

## Step F11 — Initialize LLKB Structure + Seed Patterns

```bash
# SUBSTITUTE THIS with the actual harnessRoot path from Phase 1
# Examples: "artk-e2e", "my-tests", or an absolute path
HARNESS_ROOT="${HARNESS_ROOT:-$(pwd)/artk-e2e}"

# Ensure LLKB helper exists
LLKB_HELPER="${HARNESS_ROOT}/vendor/artk-core/bootstrap-llkb.cjs"

if [ ! -f "$LLKB_HELPER" ]; then
  echo "FATAL: bootstrap-llkb.cjs not found at $LLKB_HELPER"
  echo "Please re-run bootstrap: artk init . --force"
  exit 1
fi

# Initialize LLKB (creates structure + installs 39 seed patterns)
node "$LLKB_HELPER" "${HARNESS_ROOT}" --verbose
```

**If this command fails**, stop and report to user:
```
LLKB initialization failed. Please run bootstrap again:
  artk init . --force
```

## Step F12 — Run LLKB Pattern Discovery Pipeline

```bash
cd "${HARNESS_ROOT}"
npx artk-autogen llkb-patterns discover \
  --project-root "$(dirname "${HARNESS_ROOT}")" \
  --llkb-root "${HARNESS_ROOT}/.artk/llkb"
```

This generates:
- `discovered-patterns.json` — 200-400 app-specific patterns
- `discovered-profile.json` — Framework/selector profile

**If this command fails**, log the error and attempt remediation:
1. Re-run the command once
2. If it still fails, **continue to verification** — discovered-patterns.json is valuable but not a hard blocker (learned-patterns.json from F11 IS the hard blocker)

## Verify LLKB Artifacts (Mandatory Check)

```bash
VERIFY_HELPER="${HARNESS_ROOT}/vendor/artk-core/verify-llkb-artifacts.cjs"

if [ ! -f "$VERIFY_HELPER" ]; then
  echo "ERROR: verify-llkb-artifacts.cjs not found at $VERIFY_HELPER"
  echo "Please re-run bootstrap: artk init . --force"
  # Fallback: manually check the minimum required artifact
  if [ ! -f "${HARNESS_ROOT}/.artk/llkb/learned-patterns.json" ]; then
    echo "FATAL: learned-patterns.json is missing. Cannot proceed."
    exit 1
  fi
fi

node "$VERIFY_HELPER" "${HARNESS_ROOT}/.artk/llkb" --verbose
```

**Display the verification results.** Interpret results as follows:

**HARD BLOCKERS (must fix before Phase 4):**
- Missing/empty `learned-patterns.json` → Re-run `node bootstrap-llkb.cjs ${HARNESS_ROOT} --force`
- Missing `config.yml` → Re-run `node bootstrap-llkb.cjs ${HARNESS_ROOT} --force`

**SOFT WARNINGS (log and continue to Phase 4):**
- Missing `discovered-patterns.json` → F12 failed, but journey-implement can still work with seed patterns only
- Missing `discovered-profile.json` → Same as above

**DO NOT proceed to Phase 4 if learned-patterns.json is missing or empty.** This is the minimum requirement for journey-implement to function.

---

# PHASE 4: Validation

**Read the sub-agent file and execute ALL steps within it.**

Read the file: `.github/agents/artk.discover-foundation-validate.agent.md`

If that file does not exist, try: `.github/prompts/artk.discover-foundation-validate.md`

**Execute ALL steps V0 through V6 from that file, plus the Self-Validation Gate and Final Output.**

The validation agent handles:
- LLKB artifact status check (learned-patterns = hard block, discovered-patterns = soft warning)
- TypeScript compilation (V1)
- Foundation validation tests (V2-V3)
- @artk/core integration check (V4)
- Optional auth flow smoke test (V5)
- Validation summary (V6)
- Self-validation gate (execution plan self-check)
- Completion checklist
- Final output with Next Commands

---

# PHASE 5: Final Output

**The validation sub-agent should display the final output. If it did not, do it now:**

1. Display the Self-Validation Gate checklist (all phases)
2. Display the Data-Testid Warning if applicable
3. Read and display `.github/prompts/next-commands/artk.discover-foundation.txt`

**DO NOT add anything after the Next Commands box. END your response there.**
