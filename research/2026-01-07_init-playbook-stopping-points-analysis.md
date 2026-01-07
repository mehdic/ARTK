# Init-Playbook Stopping Points Analysis

**Date:** 2026-01-07
**Topic:** Comprehensive analysis of all decision paths and stopping points in artk.init-playbook prompt

---

## Executive Summary

The `artk.init-playbook` prompt has **5 explicit stopping points** where it asks for user confirmation, causing the agent to halt execution. Additionally, there are **3 implicit stopping points** where ambiguous instructions may cause the agent to wait for clarification.

**Total stopping points: 8**

This analysis identifies all stopping points, categorizes them by severity, and provides recommendations to make the prompt execute end-to-end without interruption.

---

## Explicit Stopping Points (User Confirmation Required)

### 🔴 CRITICAL: Step 4 — Questionnaire (Lines 114-158)

**Location:** Step 4 — Ask minimum questions (one-shot)

**Current behavior:**
- Presents 15 questions in standard mode
- Waits for user to provide answers in specific format
- No default values specified
- No instruction to proceed with inferred values if user doesn't respond

**Problem:**
Agent stops and waits for user input. If user doesn't respond immediately, workflow halts.

**Evidence from prompt:**
```
### Standard mode questionnaire (at most 15 questions combining init + playbook + journey system)

**Init questions:**
1) **Target app** (if multiple UIs): Which app/path first?
2) **ARTK root path**: Confirm or override
...
```

**Recommendation:**
```markdown
## Step 4 — Ask minimum questions (one-shot)

**IMPORTANT: Always proceed with inferred defaults. Only wait for user input if critical information is truly missing.**

### Inference-first approach:
1. Scan the repo and infer ALL answers (Step 1-3)
2. Present your inferred configuration to the user
3. Ask: "I've inferred this configuration. Press Enter to accept, or provide corrections:"
4. Wait maximum 10 seconds for user response
5. If no response: **proceed automatically with inferred values**

### Standard mode questionnaire (at most 15 questions combining init + playbook + journey system)
...
```

---

### 🟡 MEDIUM: Step 7A — Orphan instruction files (Lines 332-359)

**Location:** Step 7A) Detect and cleanup orphan instruction files

**Current behavior:**
- Detects orphaned `.github/instructions/*.instructions.md` files
- Asks: "Migrate content and remove? [yes/no/review]"
- Waits for user response
- No default action specified

**Problem:**
Agent stops and presents a yes/no/review question without a default path.

**Evidence from prompt:**
```
3. Ask: "These orphan instruction files were found. They're no longer used since ARTK now uses a single `.github/copilot-instructions.md` file. Should I migrate their ARTK content and remove them? (yes/no/review)"
4. If yes: extract any ARTK-specific sections, merge into `.github/copilot-instructions.md`, delete orphan files
5. If no: leave them alone and note in completion checklist
6. If review: show full content for user review before proceeding
```

**Recommendation:**
```markdown
### 7A) Detect and cleanup orphan instruction files

**Auto-migrate by default. Only stop if user explicitly set `mode=deep`.**

**If orphan files found:**
1. List detected orphan files
2. In `quick` or `standard` mode: **automatically migrate and remove** (with note in completion checklist)
3. In `deep` mode: Ask "Migrate content and remove? [yes/no/review]" (default: yes after 10 seconds)
4. Proceed with migration

**Migration actions:**
- Extract ARTK-specific sections
- Merge into `.github/copilot-instructions.md`
- Rename orphan files to `.backup` (safer than delete)
- Note in completion checklist: "Migrated orphan instruction files: [list]"
```

---

### 🟡 MEDIUM: Step 8A — Migration guidance (Lines 504-568)

**Location:** Step 8A) Detect old Journey System installations (migration guidance)

**Current behavior:**
- Detects old Journey System installations
- Shows migration guidance
- Asks: "Proceed with migration? [yes/no/review]"
- Waits for user response

**Problem:**
Agent stops and waits for migration confirmation. No default path specified.

**Evidence from prompt:**
```
Proceed with migration? [yes/no/review]:
```

**Recommendation:**
```markdown
### 8A) Detect old Journey System installations (migration guidance)

**Auto-migrate by default. Journey files are preserved, so migration is safe.**

**If old Journey System detected:**
1. Show migration summary
2. In `quick` or `standard` mode: **automatically proceed with migration** (backup config first)
3. In `deep` mode: Ask "Proceed with migration? [yes/no/review]" (default: yes after 10 seconds)
4. Execute migration steps

**Migration actions (always safe, automatic):**
1. Back up existing `journeys.config.yml` to `journeys.config.yml.backup-<timestamp>`
2. Proceed with normal Core installation (Steps 9-11)
3. Merge custom settings from backup into new config
4. Run validation and report issues (non-blocking)
5. Note in completion checklist: "Migrated from old Journey System"
```

---

### 🟢 LOW: Step 10 — Core source not found (Lines 579-596)

**Location:** Step 10 — Find Core source (for install/upgrade)

**Current behavior:**
- Auto-detects Core source from known paths
- If not found: "Ask the user for a path to the Core source"
- No fallback specified

**Problem:**
If Core source isn't found in standard locations, agent stops and asks for path. No automatic recovery.

**Evidence from prompt:**
```
If no Core source is found:
- Ask the user for a path to the Core source in the workspace (recommended).
- If the user insists on remote install: provide instructions for adding Core as a subtree/submodule, but DO NOT perform network operations unless the environment supports it.
```

**Recommendation:**
```markdown
## Step 10 — Find Core source (for install/upgrade)

**Fail gracefully with actionable error, but don't stop the workflow.**

### Auto-detect (in order)
Try these paths (first match wins):
1) `coreSource=` argument (if provided)
2) `<repoRoot>/.artk/core/` (pre-bundled Core location)
3) `<repoRoot>/artk-core-journeys`
4) `<repoRoot>/.artk/core-src/artk-core-journeys`
5) `<repoRoot>/tools/artk-core-journeys`
6) `<repoRoot>/vendor/artk-core-journeys`

**If no Core source is found:**
- **Skip Journey System installation** (set `journeySystem=false` internally)
- Note in completion checklist: "⚠️ Journey System skipped: Core source not found"
- Provide instructions in final report:
      ```text
      To install Journey System later:
      Run: /Users/.../ARTK/scripts/bootstrap.sh .
      Re-run: /artk.init-playbook journeySystem=true
      ```
- **Continue with Parts 1, 2, and 4** (Init + Playbook + Finalize)
```

---

### 🟢 LOW: Step 11 — Core version older (Lines 597-621)

**Location:** Step 11 — Install or upgrade ARTK Core (Journeys)

**Current behavior:**
- Compares installed Core version with source version
- "If Core is installed and source version is older: refuse by default (unless user explicitly requests downgrade)"
- Ambiguous what "refuse by default" means (does it stop?)

**Problem:**
Unclear if agent stops or proceeds. Could cause halt if source version is older.

**Evidence from prompt:**
```
Rules:
- If Core is not installed: install it.
- If Core is installed and source version is newer: upgrade it.
- If Core is installed and source version is the same: do nothing.
- If Core is installed and source version is older: refuse by default (unless user explicitly requests downgrade).
```

**Recommendation:**
```markdown
## Step 11 — Install or upgrade ARTK Core (Journeys)

**Auto-handle all version scenarios. Never stop for version conflicts.**

Rules:
- If Core is not installed: install it
- If Core is installed and source version is newer: upgrade it
- If Core is installed and source version is the same: skip (note in checklist)
- If Core is installed and source version is older: **keep installed version** (note in checklist)

**Version downgrade scenario:**
- **Do not downgrade automatically**
- **Do not stop the workflow**
- Note in completion checklist: "⚠️ Core not downgraded: installed v1.2.0 > source v1.1.0"
- Provide instructions in final report if downgrade is truly needed
```

---

## Implicit Stopping Points (Ambiguous Instructions)

### 🟡 MEDIUM: Step 3 — Generate proposal (Lines 106-113)

**Location:** Step 3 — Generate proposal

**Current behavior:**
- "Output proposed configuration"
- No instruction on whether to wait for user confirmation or proceed

**Problem:**
Agent might interpret "output" as "show and wait for approval" rather than "show and proceed".

**Evidence from prompt:**
```
## Step 3 — Generate proposal
Output proposed configuration:
- `ARTK_ROOT`: computed path
- `HARNESS_LANG`: `ts` preferred
- `PACKAGE_MANAGER`: inferred
- `TARGET_APP`: inferred
- `FILES`: list of files/folders to create
```

**Recommendation:**
```markdown
## Step 3 — Generate proposal and proceed

**Show inferred configuration and immediately proceed to Step 4.**

Output proposed configuration:
- `ARTK_ROOT`: computed path
- `HARNESS_LANG`: `ts` preferred
- `PACKAGE_MANAGER`: inferred
- `TARGET_APP`: inferred
- `FILES`: list of files/folders to create

**Do not wait for confirmation. Proceed immediately to Step 4 questionnaire.**
```

---

### 🔴 CRITICAL: Step 16 — Tool execution ambiguity (Lines 673-684)

**Location:** Step 16 — Generate or stub outputs

**Current behavior:**
- "you may do this by invoking the generator logic conceptually; if tool execution is unavailable, generate content by reading/parsing Journeys yourself"
- This gives agent an "out" to not actually execute anything

**Problem:**
Agent might just conceptually describe what would be generated without actually creating files.

**Evidence from prompt:**
```
## Step 16 — Generate or stub outputs
If Journey files exist:
- Generate BACKLOG.md and index.json content deterministically (you may do this by invoking the generator logic conceptually; if tool execution is unavailable, generate content by reading/parsing Journeys yourself).
```

**Recommendation:**
```markdown
## Step 16 — Generate or stub outputs

**Always create actual files. Never just "conceptually" generate.**

**If Journey files exist:**
1. **Option A (preferred):** Execute the wrapper script:
   ```bash
   cd <ARTK_ROOT>
   node tools/journeys/generate.js
   ```
2. **Option B (fallback):** If tool execution fails, manually parse Journey files and write BACKLOG.md + index.json yourself
3. **Never skip this step** - files MUST be created

**If no Journey files exist yet:**
- Create stub files with proper headers and zero counts

Generated outputs (MUST exist after this step):
- `<ARTK_ROOT>/journeys/BACKLOG.md`
- `<ARTK_ROOT>/journeys/index.json`

Both MUST include "Generated. Do not edit by hand."
```

---

### 🟢 LOW: Step 18 — Validate and report (Lines 702-712)

**Location:** Step 18 — Validate and report

**Current behavior:**
- "Print: [checklist and next commands]"
- No explicit "END OF WORKFLOW" marker
- Agent might think there's more to do

**Problem:**
Agent might not recognize this as the final step and could stop waiting for more instructions.

**Recommendation:**
```markdown
## Step 18 — Validate and report

**This is the FINAL step. Print completion report and END WORKFLOW.**

Print completion report:
- Created/Updated files checklist (use checklist from lines 792-808)
- Key guardrails summary (locator policy, flake policy, ownership)
- Journey System status (installed/skipped)
- Next commands in order:
  - `/artk.discover-foundation` (analyze app + build Playwright harness)
  - `/artk.journey-propose` (auto-identify high-signal Journeys)
  - `/artk.journey-define` (create Journey files)

**Print completion banner:**
```
╔════════════════════════════════════════════╗
║    ARTK INIT-PLAYBOOK COMPLETE ✓           ║
╚════════════════════════════════════════════╝

Next step: /artk.discover-foundation
```

**END OF WORKFLOW. Do not wait for user input.**
```

---

## Summary of Recommendations

### Critical Changes (Must Fix)

1. **Step 4 - Questionnaire:**
   - Add inference-first approach
   - Proceed with defaults if user doesn't respond within 10 seconds
   - Only stop if critical info is truly missing

2. **Step 16 - Tool Execution:**
   - Remove "conceptually" loophole
   - Force actual file generation
   - Clear fallback path if tool execution fails

### Important Changes (Should Fix)

3. **Step 7A - Orphan Files:**
   - Auto-migrate in quick/standard mode
   - Only ask in deep mode
   - Default action: migrate

4. **Step 8A - Migration:**
   - Auto-migrate (safe operation)
   - Only ask in deep mode
   - Default action: proceed with migration

### Nice to Have (Consider Fixing)

5. **Step 3 - Proposal:**
   - Add "proceed immediately" instruction

6. **Step 10 - Core Not Found:**
   - Fail gracefully
   - Skip Journey System
   - Continue with rest of workflow

7. **Step 11 - Version Conflict:**
   - Auto-handle all scenarios
   - Never stop for version issues

8. **Step 18 - Final Step:**
   - Add explicit "END OF WORKFLOW" marker
   - Completion banner

---

## Proposed Changes Priority

### Phase 1: Critical Fixes (Do Now)
- [ ] Step 4: Add inference-first with auto-proceed
- [ ] Step 16: Remove "conceptually" ambiguity
- [ ] Step 18: Add completion banner and END marker

### Phase 2: Important Fixes (Do Soon)
- [ ] Step 7A: Auto-migrate orphan files
- [ ] Step 8A: Auto-migrate old Journey System

### Phase 3: Polish (Nice to Have)
- [ ] Step 3: Add "proceed immediately"
- [ ] Step 10: Graceful failure for missing Core
- [ ] Step 11: Auto-handle version conflicts

---

## Testing Checklist

After implementing fixes, test these scenarios:

### Scenario 1: Clean Installation (No Existing Files)
- [ ] Runs start to finish without stopping
- [ ] All 18 steps execute
- [ ] Files created successfully
- [ ] npm install runs automatically
- [ ] Completion banner shown

### Scenario 2: Existing Playwright Project
- [ ] Detects existing structure
- [ ] Doesn't overwrite existing files
- [ ] Appends to copilot-instructions
- [ ] Runs to completion

### Scenario 3: Old Journey System Migration
- [ ] Detects old Journey System
- [ ] Auto-migrates without stopping
- [ ] Preserves existing Journey files
- [ ] Creates backup of config

### Scenario 4: Missing Core Source
- [ ] Detects missing Core
- [ ] Skips Journey System gracefully
- [ ] Continues with Init + Playbook
- [ ] Provides clear instructions for later

### Scenario 5: User Provides No Input (Timeout Test)
- [ ] Shows questionnaire
- [ ] Waits 10 seconds
- [ ] Proceeds with inferred defaults
- [ ] Completes successfully

---

## Conclusion

The `artk.init-playbook` prompt has **8 stopping points** that cause it to halt mid-execution:

**Critical (must fix):**
- Step 4: Questionnaire (no auto-proceed)
- Step 16: Tool execution ambiguity

**Important (should fix):**
- Step 7A: Orphan file migration asks for confirmation
- Step 8A: Journey System migration asks for confirmation

**Nice to have:**
- Step 3, 10, 11, 18: Ambiguous instructions

**Recommended approach:**
1. Implement Phase 1 (Critical) fixes immediately
2. Implement Phase 2 (Important) fixes before next release
3. Consider Phase 3 (Polish) as time permits

The key insight: **The prompt should operate in "inference-first, ask-if-critical" mode, not "ask-then-proceed" mode.** This aligns with the stated goal: "Don't drag the user through 40 questions."
