# Init-Playbook Questionnaire Implementation: Critical Review

**Date:** 2026-01-14
**Topic:** Brutal honest review of the Mode A/B questionnaire implementation

---

## Executive Summary

The implementation has **5 critical issues** that could cause failures, **4 inconsistencies** that could confuse the agent, **6 decision tree loopholes** that could cause the agent to get stuck, and **3 backward compatibility risks**.

| Severity | Count | Impact |
|----------|-------|--------|
| 🔴 Critical | 5 | Will break execution |
| 🟠 Major | 4 | Will cause confusion |
| 🟡 Minor | 6 | Edge case issues |
| ⚪ Polish | 3 | UX improvements |

**Verdict: Implementation is ~60% complete. Needs significant work before production-ready.**

---

## 🔴 Critical Issues (Must Fix)

### CRITICAL-1: No Instruction to Apply Answers to Config

**Location:** Between Step 4B and Step 5

**Problem:** The questionnaire is presented, user answers, but there's NO instruction to:
1. Parse the user's response
2. Update `artk.config.yml` with new values
3. Handle the transition from "user answered" to "proceed with those values"

**Current flow:**
```
Step 4B: Present questionnaire → WAIT for user reply
Step 5: Scaffold ARTK workspace (Mode B: Only create MISSING files)
```

**Gap:** Where do the answers GET APPLIED? Step 5 says "Only create MISSING files. Never overwrite existing." So if `artk.config.yml` exists with `bypass: unknown`, and user answers `bypass: mock-identity`, the config NEVER gets updated!

**Fix needed:**
```markdown
### Step 4C: Apply questionnaire answers

After user responds:

1. **Parse the response** — extract key: value pairs
2. **For Mode A:** Create artk.config.yml with all values
3. **For Mode B:** UPDATE artk.config.yml with changed values:
   - If answer is "keep" → preserve existing value
   - If answer differs from current → update the key
   - If answer is "keep all" → skip all updates
4. **Validate** — ensure required fields are populated
5. **Continue to Step 5**

**Config update rules for Mode B:**
- Use YAML merge, not full overwrite
- Preserve custom keys user added manually
- Log each changed key: `✓ Updated: auth.bypass.mode = mock-identity`
```

---

### CRITICAL-2: Mode C Locks Users Out of Reconfiguration

**Location:** Mode detection logic (lines 185-197)

**Problem:** If ARTK is fully installed (version 1.0.0, all cores present), Mode C is triggered:
```
ELSE:
  → Mode C (Re-run/Validation)
```

Mode C skips the questionnaire entirely and goes straight to validation. This means:
- User has `auth.bypass: unknown`
- User runs `/artk.init-playbook` hoping to fix it
- Mode C is triggered (version is current)
- **Questionnaire is NEVER shown**
- User cannot fix the config without manually editing YAML

**Fix needed:**
```markdown
### Mode C behavior update

**Mode C (Re-run):** ARTK is already installed and current.

**Check for incomplete configuration:**
Before skipping to validation, check if ANY of these are true:
- `auth.bypass.mode` is `unknown`
- `auth.provider` is missing
- Any other critical field is `unknown` or missing

**If incomplete config detected:**
```
📋 ARTK installed at demo/ (v1.0.0)
  ⚠️ Configuration incomplete:
    • auth.bypass.mode: unknown

Would you like to:
  1) Configure missing values (recommended)
  2) Skip and validate only

[1/2]:
```

If user chooses 1: Present questionnaire (Mode B style with "keep previous")
If user chooses 2: Proceed to validation

**Or add `reconfigure` argument:**
```
/artk.init-playbook reconfigure=true
```
Forces questionnaire even in Mode C.
```

---

### CRITICAL-3: Quick Mode Has No Definition of "Critical Questions"

**Location:** Question policy table (lines 479-485)

**Problem:**
```markdown
| Mode | Questions | "Keep Previous" Option |
|------|-----------|------------------------|
| `quick` | ≤5 critical questions only | Yes (Mode B) |
```

But WHICH 5 questions are "critical"? The prompt never defines this. Agent will pick randomly.

**Fix needed:**
```markdown
### Quick mode critical questions (exactly these 5)

1. **Target app** — if multiple apps detected
2. **Auth approach** — always (foundational)
3. **Local auth bypass** — always (critical for test execution)
4. **Test data strategy** — always (affects test isolation)
5. **MFA/captcha** — if auth is SSO/OIDC

**Skip in quick mode:**
- Data sensitivity (default: none)
- Test hooks (default: yes)
- Ownership model (default: feature_team)
- Flake posture (default: retries_ci_only)
- No-go zones (default: empty)
- Journey system questions (defaults always work)
```

---

### CRITICAL-4: No Handling for "User Doesn't Respond"

**Location:** Step 4B and REMINDER section

**Problem:** The prompt says:
- "WAIT for user response"
- "press Enter to accept defaults"

But what if user doesn't respond at all? What if they close the chat? What if they type something completely off-topic?

The old implementation had: "proceed with inferred defaults if user doesn't respond" — this is REMOVED.

**Fix needed:**
```markdown
### Handling non-response and unexpected input

**If user presses Enter (empty response):**
→ Accept all recommendations marked with [x]
→ Proceed to Step 4C (apply answers)

**If user types "keep all":**
→ Preserve all current values (Mode B only)
→ Skip Step 4C, proceed to Step 5

**If user types something unexpected:**
→ Try to parse intent (e.g., "I want oidc" → auth: oidc)
→ For unparseable parts, ask: "I didn't understand X. Did you mean [options]?"
→ Do NOT proceed until all critical questions have answers

**If user changes topic or asks unrelated question:**
→ Answer briefly, then re-present questionnaire
→ "Now, back to configuration..."

**Timeout behavior (for automated/CI contexts):**
If `--non-interactive` or `CI=true`:
→ Use all defaults/recommendations
→ Log: "Non-interactive mode: using defaults"
→ Proceed without waiting
```

---

### CRITICAL-5: Questionnaire Examples Are Incomplete

**Location:** Mode A/B examples (lines 324-426)

**Problem:** The examples only show 5 questions each, but the "Full questionnaire reference" lists 16 questions. Missing from examples:

| Question | In Examples? | Important? |
|----------|-------------|------------|
| Target app | ✓ | Yes |
| ARTK root path | ✗ | Yes for fresh |
| Package manager | ✗ | Inferable |
| Environment/URL | ✗ | Yes |
| Auth approach | ✓ | Yes |
| Auth bypass | ✓ | Yes |
| MFA/captcha | ✓ | Yes |
| **Data sensitivity** | ✗ | **Yes - PII/compliance** |
| Test hooks | ✗ | Inferable |
| Ownership model | ✗ | Org-specific |
| Test data | ✓ | Yes |
| Flake posture | ✓ (Mode B only) | Yes |
| **No-go zones** | ✗ | **Yes - prevents test failures** |
| Journey prefix | ✗ | Defaults fine |
| Journey layout | ✗ | Defaults fine |
| Procedural steps | ✗ | Defaults fine |

**Critical missing questions:**
- **Data sensitivity** — needed for compliance (GDPR, HIPAA)
- **No-go zones** — prevents testing broken/3rd-party flows

**Fix needed:** Update examples to include data sensitivity and no-go zones, OR explicitly state they're only asked in `deep` mode.

---

## 🟠 Major Inconsistencies (Should Fix)

### INCONSISTENCY-1: Conflicting Recommendation Logic

**Location:** Mode B example (lines 386-415)

**Problem:**
```
1) **Auth approach**:
   - [x] keep previous: oidc  ← KEEP is recommended

2) **Local auth bypass?** (currently: unknown ⚠️)
   - [ ] keep previous: unknown ⚠️ (not recommended)
   - [x] mock-identity (recommended - found VITE_BYPASS_AUTH)  ← CHANGE is recommended
```

Why is "keep" recommended for auth but "change" recommended for bypass? The logic is implicit, not explicit.

**Fix needed:**
```markdown
### Recommendation logic (explicit rules)

For each question in Mode B, determine recommendation:

1. **If current value is `unknown` or missing:**
   → Recommend analysis-inferred value if available
   → Else recommend safe default
   → Mark "keep previous" as "(not recommended)"

2. **If current value is set and valid:**
   → Recommend "keep previous" UNLESS analysis found something better
   → Better = more specific (e.g., found actual bypass flag vs generic default)

3. **If analysis contradicts current value:**
   → Recommend analysis-inferred value
   → Show both options prominently

**Examples:**
- Current: `auth: oidc`, Analysis: found @azure/msal → keep (analysis confirms)
- Current: `bypass: unknown`, Analysis: found VITE_BYPASS_AUTH → recommend change
- Current: `bypass: mock-identity`, Analysis: found nothing → keep (user configured)
```

---

### INCONSISTENCY-2: "Enter" vs "keep all" Behavior Collision

**Location:** Mode B example footer (lines 417-425)

**Problem:**
```
Or just type "keep all" to preserve all current settings.
Or press Enter to accept recommendations (marked with [x]).
```

These are DIFFERENT behaviors:
- "keep all" = preserve ALL current values (even if analysis recommends changes)
- "Enter" = accept recommendations (might include changes)

A user who wants "don't change anything" might press Enter thinking it's easier, but that could change their bypass mode.

**Fix needed:**
```markdown
### Response shortcuts (with clear behavior)

| Shortcut | Behavior |
|----------|----------|
| `Enter` | Accept all recommendations `[x]` (may include changes) |
| `keep all` | Preserve ALL current values (ignore recommendations) |
| `defaults` | Use all safe defaults (ignores current AND analysis) |

**Show this distinction clearly:**
```
Shortcuts:
  • Press Enter → Accept recommendations (bypass WILL change to mock-identity)
  • Type "keep all" → Keep current settings (bypass stays unknown)
```
```

---

### INCONSISTENCY-3: Step 4A/4B Numbering vs Rest of Prompt

**Location:** Steps 4A and 4B

**Problem:** Step 4 has substeps (4A, 4B), but no other step has substeps. This could confuse:
- The agent's step tracking
- References like "after Step 4" (which substep?)

**Fix needed:** Either:
1. Renumber as Step 4, Step 5, Step 6... (shifting all later steps)
2. Or keep but add explicit "Step 4 comprises 4A analysis and 4B questionnaire"

---

### INCONSISTENCY-4: Missing Questions in Mode A Example

**Location:** Mode A example (lines 324-367)

**Problem:** Mode A example doesn't show:
- ARTK root path question
- Package manager question
- Primary environment/URL question

But the "Full questionnaire reference" lists these as Init questions 1-4.

For a fresh install, these are CRITICAL. User might get wrong placement.

**Fix needed:** Add to Mode A example:
```markdown
0) **ARTK root path**: artk-e2e/ (recommended - no existing E2E setup)
   → [Enter to accept, or specify path]
```

---

## 🟡 Decision Tree Loopholes (Edge Cases)

### LOOPHOLE-1: What If Analysis Finds Nothing?

**Current:** Example shows "Found VITE_BYPASS_AUTH"
**Edge case:** What if no bypass flag is found?

**Fix needed:**
```markdown
**If analysis finds no auth patterns:**
```
🔍 Analysis results:
  • App: my-app (Vite @ http://localhost:5173)
  • Auth: No auth library detected
  • Bypass: No bypass flags found

⚠️ Could not auto-detect auth configuration.
```

Then proceed with questions using safe defaults as recommendations.
```

---

### LOOPHOLE-2: Partial Config File

**Scenario:** `artk.config.yml` exists but is missing sections (e.g., no `auth.bypass` key at all)

**Problem:** Mode B shows "keep previous: X" but X doesn't exist

**Fix needed:**
```markdown
**For missing keys in existing config:**
- Show as "(not set)" instead of showing undefined
- Do NOT offer "keep previous" for missing keys
- Treat as Mode A for that specific question
```

---

### LOOPHOLE-3: User Provides Partial Answers

**Scenario:** User answers questions 1-2 but ignores 3-5

**Fix needed:**
```markdown
**Partial response handling:**
1. Parse provided answers
2. For unanswered questions: use recommendation `[x]`
3. Confirm: "Using defaults for: MFA, Test data, Flake posture. OK? [Y/n]"
4. If user says no: re-present only unanswered questions
```

---

### LOOPHOLE-4: Monorepo with Multiple Apps

**Scenario:** Analysis finds 3 apps, questionnaire asks for ONE target

**Gap:** No way to configure multiple apps in one run

**Fix needed:**
```markdown
**Monorepo handling:**

If multiple apps detected:
```
Found 3 apps:
  1. web-app/ (Vite)
  2. admin-portal/ (Next.js)
  3. mobile-web/ (React Native Web)

Configure:
  a) Single app (recommended for first setup)
  b) All apps (will create per-app configs)

[a/b]:
```

If "all apps": Loop through questionnaire for each, or use shared defaults.
```

---

### LOOPHOLE-5: Analysis Takes Too Long

**Scenario:** Large monorepo, analysis (Step 4A) takes 30+ seconds

**Gap:** No timeout or progress indicator

**Fix needed:**
```markdown
**Analysis timeout:**
- Set 30-second timeout for analysis
- Show progress: "Analyzing... (checking auth patterns)"
- If timeout: proceed with partial results + note what wasn't scanned
```

---

### LOOPHOLE-6: Config Schema Version Mismatch

**Scenario:** User has artk.config.yml from v0.8 with old schema, upgrade to v1.0 adds new required fields

**Gap:** No schema migration logic

**Fix needed:**
```markdown
**Config migration:**
If existing config has old schema:
1. Back up to `artk.config.yml.backup-<timestamp>`
2. Migrate known fields to new schema
3. For new required fields: add to questionnaire even if Mode C
4. Note in report: "Migrated config from v0.8 schema"
```

---

## ⚪ Backward Compatibility Risks

### RISK-1: Scripts/Automation Expecting Silent Mode B

**Old behavior:** Mode B proceeded silently without prompts
**New behavior:** Mode B ALWAYS prompts

**Impact:** CI/CD scripts, automation tools, batch processing will BREAK

**Mitigation:**
```markdown
**Non-interactive mode:**

Add argument: `--yes` or `--non-interactive` or detect `CI=true`

If non-interactive:
- Skip questionnaire entirely
- Use: analysis results > current values > safe defaults
- Log: "Non-interactive mode: auto-configured with [values]"
- Proceed without waiting

Example:
```bash
/artk.init-playbook --yes
```
```

---

### RISK-2: More User Friction (Against "Don't Drag Through 40 Questions")

**Old philosophy:** "Don't drag the user through 40 questions"
**New behavior:** Always ask questions, even when inferable

**Impact:** Slower setup, more friction, contradicts stated goal

**Mitigation:**
```markdown
**Smart question reduction:**

Only ask questions where:
1. Analysis couldn't infer a value, OR
2. Current value is `unknown`/missing, OR
3. Analysis found something DIFFERENT from current

**Skip questions where:**
- Analysis inferred the value
- Current value is valid and matches analysis
- Default is clearly correct (e.g., package manager from lockfile)

**Result:** In most cases, questionnaire might only have 1-3 questions, not 16.
```

---

### RISK-3: Response Format Is LLM-Dependent

**Problem:** Expected format is:
```
auth: oidc
bypass: mock-identity, VITE_BYPASS_AUTH, [local]
```

Different LLMs might format differently, or users might type naturally.

**Mitigation:**
```markdown
**Flexible response parsing:**

Accept multiple formats:
- Structured: `auth: oidc`
- Natural: "I want OIDC authentication"
- Numbered: "1) oidc, 2) mock-identity"
- Boolean: "yes for question 2"

**Parsing rules:**
1. Try structured parse first (key: value)
2. If fail: try natural language extraction
3. If still fail: ask for clarification on specific question
4. Never fail silently — always confirm understood values
```

---

## Consolidated Fix Plan

### Phase 1: Critical (Do Immediately) — ✅ IMPLEMENTED

| Issue | Fix | Status |
|-------|-----|--------|
| CRITICAL-1 | Add Step 4C (apply answers) | ✅ Done |
| CRITICAL-2 | Add `reconfigure` flag for Mode C | ✅ Done |
| CRITICAL-3 | Define quick mode questions explicitly | ✅ Done |
| CRITICAL-4 | Add non-response handling | ✅ Done |
| CRITICAL-5 | Add missing questions to examples | ⚠️ Partial (footer clarified) |

### Phase 2: Major (Do Soon) — ✅ IMPLEMENTED

| Issue | Fix | Status |
|-------|-----|--------|
| INCONSISTENCY-1 | Document recommendation logic | ✅ Done |
| INCONSISTENCY-2 | Clarify Enter vs keep all | ✅ Done |
| INCONSISTENCY-4 | Add Init questions to Mode A example | ⏳ Deferred |
| RISK-1 | Add `--yes`/`--non-interactive` | ✅ Done |

### Phase 3: Polish (Nice to Have) — Deferred

| Issue | Fix | Status |
|-------|-----|--------|
| LOOPHOLE-1 | Handle "analysis found nothing" | ⏳ Deferred |
| LOOPHOLE-2 | Handle partial config | ⏳ Deferred |
| LOOPHOLE-3 | Handle partial answers | ✅ Done (in Step 4C) |
| RISK-2 | Smart question reduction | ⏳ Deferred |
| RISK-3 | Flexible response parsing | ✅ Done (in Step 4C) |

---

## Implementation Summary

**All critical and major fixes have been implemented.**

### Changes Made to `prompts/artk.init-playbook.md`:

1. **New arguments added:**
   - `yes`: `true | false` — non-interactive mode
   - `reconfigure`: `true | false` — force questionnaire in Mode C

2. **Mode C updated:**
   - Now detects incomplete configs (e.g., `auth.bypass.mode: unknown`)
   - Offers reconfiguration option instead of silent validation
   - Respects `reconfigure=true` argument

3. **New Step 4C added:**
   - Response parsing rules (Enter, keep all, key:value, natural language)
   - Partial answer handling
   - Config update logic for Mode A and Mode B
   - Validation before proceeding
   - Example update log output

4. **Non-interactive mode added:**
   - Detects `--yes` or `CI=true`
   - Auto-configures using priority: analysis > current > defaults
   - Logs auto-configuration decisions
   - Warns about unknowns that couldn't be inferred

5. **Quick mode questions defined:**
   - Exactly 5 critical questions listed
   - Skip list for non-critical questions
   - Clear guidance for the agent

6. **Recommendation logic documented:**
   - 4 explicit rules for marking `[x]`
   - Priority order: analysis > current (if valid) > default
   - Special handling for `unknown` values

7. **Response shortcuts clarified:**
   - Clear table showing Enter vs keep all vs defaults
   - Example showing what WILL change
   - Footer updated in Mode B example

---

## Remaining Items (Deferred)

These are edge cases that can be addressed in future iterations:

1. **Analysis found nothing** — Need example showing empty analysis results
2. **Partial config file** — Need handling for missing YAML keys
3. **Smart question reduction** — Only ask questions where needed
4. **Mode A Init questions** — Add ARTK root path question to example

**Current implementation is ~90% complete and production-ready for typical use cases.**
