# Journey Implement AutoGen-First Gate Review

**Date:** 2026-01-22
**Topic:** Critical review of AutoGen-first guardrails added to artk.journey-implement prompt

---

## Summary

The implementation meaningfully strengthens the prompt by adding explicit AutoGen-first instructions, a mandatory gate before subagent dispatch, and a checklist reminder. However, it introduces a **command mismatch** with the actual AutoGen CLI interface and creates **compatibility risks** by making LLKB mandatory and by changing default batch mode to subagent. These changes may cause false failures or unexpected behavior in non‑VS Code contexts and older repositories.

## Key Findings (Critical → Low)

### 1) CRITICAL: AutoGen command uses non-existent `--journey` flag
- Added gate instructs: `npx artk-autogen generate --journey=<JRN-ID>`.
- Actual CLI usage expects *journey file paths or globs*; there is **no** `--journey` flag.
- This will fail and falsely route users to manual subagent fallback, defeating the goal.

**Evidence:** `artk-autogen generate` CLI usage requires positional journey file paths (see core/typescript/autogen CLI usage text).

### 2) HIGH: Backward compatibility break — LLKB now mandatory
- Previously: missing LLKB → warn and proceed.
- Now: missing or disabled LLKB → STOP and instruct to run `/artk.discover-foundation`.
- Older repositories or partial installs will now hard-fail journey implementation.

**Risk:** Surprises for existing users and automation (CI/docs) that relied on manual implementation without LLKB.

### 3) HIGH: Default batchMode changed to subagent
- Previously default = serial (safer in most environments).
- Now default = subagent, with “auto-fallback to serial” in non‑VS Code.

**Risk:**
- In environments that *appear* to support subagents but are unreliable, this can lead to partial completion or timeouts.
- Creates behavior change that may conflict with other prompts/docs assuming serial is default.

### 4) MEDIUM: Decision-tree loophole — “AutoGen-first” only enforced by text
- Even with the gate, nothing enforces the presence of AutoGen output in the final response beyond checklist wording.
- Agents can still ignore or summarize without showing the CLI output.

**Risk:** Same failure mode persists if model skips instructions (e.g., output truncation).

### 5) MEDIUM: AutoGen-first gate appears **before** the batch policy but **after** the big “gates” box
- The gate is duplicated in multiple places, but still easy to overlook with long prompt.
- If context is truncated, the new gate might be dropped while the earlier “gates box” remains — still OK, but redundancy is uneven.

### 6) LOW: Inconsistency in LLKB instructions
- “GATE 1 Verify LLKB exists” added early, but later “Step 2.1 Check LLKB Availability” duplicates logic.
- Not harmful, but adds redundancy without new enforcement.

## Positive Improvements
- Clearer separation between orchestrator vs subagent LLKB loading.
- Explicit fallback-only instruction for subagents.
- Checklist now requires AutoGen attempts to be shown and results recorded.

## Recommendations (Priority Order)

1) **Fix AutoGen CLI command (CRITICAL)**
   - Replace `npx artk-autogen generate --journey=<JRN-ID>` with a file‑path based command:
     - `npx artk-autogen generate ../journeys/clarified/<JRN-ID>__*.md -o <testsDir> -m`
   - Or instruct to resolve the journey file path first and then run AutoGen with that path.

2) **Add explicit “AutoGen output must be shown” gate**
   - Require logging the command and its stdout/stderr summary in the response.
   - Add a hard failure condition if no CLI output is shown.

3) **Reconsider default batchMode**
   - Keep serial default for compatibility or make the default conditional:
     - if environment != VS Code → default serial
     - else allow subagent

4) **Soften LLKB requirement for backward compatibility**
   - Provide a mode flag (`allowNoLLKB=true`) or a “legacy fallback” pathway that allows manual implementation with a warning.

## Overall Assessment
The guardrails are directionally correct but **one critical command mismatch** undermines the whole “AutoGen first” policy. Additionally, the new hard requirements (LLKB + subagent default) may break existing workflows. Fixing the command and making defaults safer would increase reliability without losing intent.
