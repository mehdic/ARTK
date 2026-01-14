# Init-Playbook Auth Bypass Analysis

**Date:** 2026-01-14
**Topic:** Why init-playbook didn't ask about auth bypass and left it as "unknown"

---

## Executive Summary

**The prompt is working as designed.** The confusion stems from a misunderstanding of the execution modes.

| Mode | Questions Asked? | Auth Discovery? |
|------|-----------------|-----------------|
| Mode A (Fresh) | Yes, if can't infer | Basic inference only |
| Mode B (Upgrade) | **No** - preserves existing | **No** - merges, doesn't rediscover |
| Mode C (Re-run) | No - validation only | No |

The init-playbook ran in **Mode B (Upgrade)** because ARTK was already partially installed. In Mode B, the prompt explicitly says to **preserve existing values and add missing keys** - it does NOT re-analyze or re-question.

Auth pattern discovery is the job of **`/artk.discover-foundation`**, not `/artk.init-playbook`.

---

## What Actually Happened

### Trace Analysis

```
ARTK detected at artk-e2e - Mode B (Upgrade) needed
  • Current version: "1.0" (missing PATCH component, should be "1.0.0")
  • Runtime Core: ✓ installed
  • AutoGen Core: ✓ installed
  • Journey Core: ✗ NOT installed

✓ Proceeding with upgrade...
```

Copilot correctly:
1. Detected existing ARTK installation
2. Identified it needed upgrade (version 1.0 → 1.0.0, missing Journey Core)
3. Ran Mode B (Upgrade) workflow
4. Preserved existing `artk.config.yml` values including `auth.bypass.mode: unknown`
5. Added missing files (Journey system, docs)
6. Completed without asking questions

### Why No Questions Were Asked

From the prompt, Step 4 explicitly defines Mode B behavior:

```markdown
**Mode B (Upgrade):** ARTK exists but needs updates.

📋 ARTK detected at demo/ - upgrade needed
  • Current version: 0.9.0
  • Core: not installed (will install)
  • Journeys: 3 found (will preserve)

✓ Proceeding with upgrade...

Then continue to Step 5 with MERGE behavior (preserve existing, add missing).
```

**Key line:** "Then continue to Step 5 with MERGE behavior" - there's no question-asking step for Mode B.

### The Questionnaire Is Only For Mode A

The questionnaire section (Step 4) explicitly says:

```markdown
### For Mode A only: Decide whether to ask questions
```

Questions about auth approach and auth bypass:

```markdown
5) **Auth approach**: `form-login`, `SSO/OIDC`, `token/session`, `none`
6) **Local auth bypass mode**: `no | identityless | mock-identity` + toggle/flag
```

...are **only asked in Mode A (Fresh Install)** when the agent cannot infer them.

---

## What Was Supposed to Happen

### The Designed Workflow

1. **`/artk.init-playbook`** - Scaffolds structure, config, dependencies
   - Mode A: May ask questions if can't infer
   - Mode B: Preserves existing, adds missing
   - Mode C: Validation only

2. **`/artk.discover-foundation`** - Analyzes app and builds harness
   - **THIS is where auth patterns should be discovered**
   - Analyzes login pages, OIDC configs, environment files
   - Updates `artk.config.yml` with discovered auth approach
   - Creates auth foundation modules

3. **`/artk.journey-*`** - Journey workflow

### Proof from the Prompt

The handoffs section:

```yaml
handoffs:
  - label: "MANDATORY - /artk.discover-foundation: analyze app and build harness"
    agent: artk.discover-foundation
    prompt: "Analyze app and build foundation harness"
```

And the "Next Commands" section:

```markdown
1. **`/artk.discover-foundation`** — Discover auth patterns, navigation, and shared selectors
```

The word "discover" is key - **discovery happens in discover-foundation, not init-playbook**.

---

## The Gap: What's Missing

The current design has a gap:

### Problem 1: Mode B Never Discovers Auth

If ARTK was previously installed with `auth.bypass.mode: unknown`, Mode B will preserve that value forever. There's no trigger to re-analyze auth patterns.

### Problem 2: Bootstrap Script Doesn't Analyze

The bootstrap script (`scripts/bootstrap.ps1` / `bootstrap.sh`) creates `artk.config.yml` with default values but doesn't analyze the project for auth patterns.

### Problem 3: User Expectation Mismatch

Users expect init-playbook to be "smart" about analyzing their project. But in Mode B, it's designed to be conservative and preserve their existing config.

---

## Recommended Fixes

### Option A: Add Auth Discovery to Mode B (Recommended)

Modify Step 4 Mode B behavior:

```markdown
**Mode B (Upgrade):** ARTK exists but needs updates.

1. Preserve existing config values
2. Add missing keys
3. **NEW: If `auth.bypass.mode` is "unknown", analyze project for auth patterns:**
   - Check for OIDC/OAuth configs (`.env`, `auth.config.*`)
   - Look for login pages (`login.tsx`, `Login.vue`)
   - Check for auth bypass env vars (`BYPASS_AUTH`, `MOCK_USER`, etc.)
   - If patterns found: propose auth config
   - If no patterns found: keep as "unknown" with warning
4. Continue with upgrade
```

### Option B: Make discover-foundation Mandatory Before Journey Work

Add a gate in journey commands:

```markdown
## Pre-requisite Check

Before running journey commands, verify:
- [ ] `auth.bypass.mode` is NOT "unknown"
- [ ] If "unknown": Suggest running `/artk.discover-foundation` first
```

### Option C: Add "Smart Upgrade" Mode

Add a `mode=smart` option to init-playbook:

```markdown
mode=smart:
- Runs Mode B upgrade behavior
- BUT also runs auth discovery analysis
- Asks about any "unknown" values before completing
```

---

## Immediate Action for Your Case

Since you already ran init-playbook in Mode B, you have two options:

### Option 1: Run discover-foundation (Correct Workflow)

```
/artk.discover-foundation
```

This will analyze the project and update auth configuration.

### Option 2: Manually Configure (Quick Fix)

Edit `artk-e2e/artk.config.yml`:

```yaml
auth:
  provider: oidc  # or form-login
  bypass:
    mode: mock-identity  # or none, identityless
    toggle: DEV_BYPASS_AUTH  # env var or config key
    environments: [local, intg]
```

---

## Conclusion

**The prompt is working correctly.** The behavior is:

- Mode A (Fresh): Asks questions if can't infer → You didn't get this
- Mode B (Upgrade): Preserves + merges without asking → **This is what ran**
- Mode C (Re-run): Validation only

The warning about "unknown" auth bypass is **expected behavior** - it's telling you to either:
1. Configure manually in `artk.config.yml`
2. Run `/artk.discover-foundation` which will analyze and configure auth

**The prompt did NOT "screw up" or lose the question section.** The question section exists but only applies to Mode A fresh installs.

---

## Changes Implemented

**Status: FIXED ✓**

The prompt has been updated to address the gap. Here's what changed:

### Before (Old Behavior)

| Mode | Questions Asked? | Auth Discovery? |
|------|-----------------|-----------------|
| Mode A (Fresh) | Yes, if can't infer | Basic inference |
| Mode B (Upgrade) | **No** | **No** |
| Mode C (Re-run) | No | No |

### After (New Behavior)

| Mode | Questions Asked? | Auth Discovery? |
|------|-----------------|-----------------|
| Mode A (Fresh) | **Always** (with smart defaults) | **Yes - Step 4A** |
| Mode B (Upgrade) | **Always** (with "keep previous" option) | **Yes - Step 4A** |
| Mode C (Re-run) | No | No |

### Key Changes Made

1. **Step 4A: Analyze the project (NEW)**
   - REQUIRED before asking questions
   - Scans for auth patterns: OIDC configs, login components, auth libraries, bypass flags
   - Identifies app structure, framework, dev URL
   - Results shown in questionnaire

2. **Step 4B: Present questionnaire with analysis**
   - Mode A: Shows analysis + questions with smart defaults
   - Mode B: Shows current settings + analysis + questions with "keep previous" option
   - Pre-fills answers based on analysis
   - Marks recommended answers with `[x]`

3. **"Keep Previous" Option for Mode B**
   - Each question shows current value from `artk.config.yml`
   - User can type "keep" to preserve that setting
   - User can type "keep all" to preserve all settings
   - Warning shown for "unknown" values: `unknown ⚠️ (not recommended)`

4. **Smart Defaults**
   - User can press Enter to accept recommendations
   - Recommendations based on project analysis, not static defaults
   - Analysis-inferred values override generic defaults

### Example: What the user now sees in Mode B

```
📋 Configuration review (Mode B: Upgrade from v0.9.0)

📂 Current settings in artk.config.yml:
  • Auth approach: oidc
  • Auth bypass: unknown ⚠️
  • MFA/captcha: unknown
  • Test data: create_api

🔍 Analysis results:
  • Auth bypass: Found VITE_BYPASS_AUTH in .env.development
  • Login page: src/pages/Login.tsx (OIDC flow)

Questions:

2) **Local auth bypass?** (currently: unknown ⚠️)
   - [ ] keep previous: unknown ⚠️ (not recommended)
   - [ ] no (require full auth locally)
   - [x] mock-identity (recommended - found VITE_BYPASS_AUTH)
   ...
```

The user now has:
- Clear visibility into current settings
- Analysis-driven recommendations
- Option to keep previous or update
- Warning for problematic values like "unknown"
