# Critical Review: Regression Tier Implementation

**Date:** 2026-01-15
**Topic:** Brutally honest review of the coverage/regression tier implementation

---

## Executive Summary

The implementation adds regression tier support with `coverage=small|large` presets. While functional, it has **7 critical issues**, **5 inconsistencies**, and **6 missing features** that should be addressed before considering it production-ready.

**Overall Grade: C+** — Works for happy path, but edge cases and decision conflicts are unhandled.

---

## Critical Issues (Must Fix)

### Issue 1: Decision Tree Conflict — `coverage` vs `includeRegression`

**Problem:** What happens when user sets `coverage=large` but also `includeRegression=false`?

```
coverage=large → implies regressionCount=20, includeRegression=true
includeRegression=false → disables regression tier
```

**Current state:** Ambiguous. The prompt doesn't specify which wins.

**Expected behavior:** Explicit flags should override presets.

**Fix:** Add this rule to the prompt:
```markdown
**Parameter priority (explicit overrides implicit):**
1. Explicit `smokeCount`, `releaseCount`, `regressionCount` override `coverage` presets
2. `includeRegression=false` disables regression tier regardless of `coverage`
3. `maxJourneys` caps total across all tiers (see Issue 2)
```

---

### Issue 2: `maxJourneys` vs Tier Counts Conflict

**Problem:** If user sets:
```
smokeCount=10, releaseCount=20, regressionCount=20, maxJourneys=30
```

Total tier counts = 50, but maxJourneys = 30. What happens?

**Current state:** Not specified. The prompt says "Never exceed `maxJourneys`" but doesn't say how to reduce.

**Expected behavior:** Fill tiers in priority order until maxJourneys is hit.

**Fix:** Add this algorithm:
```markdown
**maxJourneys enforcement (priority-based):**
1. Fill smoke tier first (up to smokeCount)
2. Fill release tier next (up to releaseCount)
3. Fill regression tier last (up to regressionCount)
4. Stop when total reaches maxJourneys

Example: smokeCount=10, releaseCount=20, regressionCount=20, maxJourneys=30
→ Smoke: 10, Release: 20, Regression: 0 (maxJourneys hit)
```

---

### Issue 3: No Tier Assignment Criteria

**Problem:** Step 9.4 says:
- Smoke: "Highest-risk, highest-feasibility"
- Release: "Next highest-risk candidates not already selected for smoke"
- Regression: "Remaining high-risk candidates"

But this is just sequential filling by risk score. It doesn't define what makes something "smoke-worthy" vs "release-worthy".

**Example failure:** An edge case negative path might have highest risk score (many incidents), but it's not appropriate for smoke tier. Current logic would put it in smoke.

**Expected behavior:** Tier assignment should consider journey characteristics, not just risk score.

**Fix:** Add tier criteria:
```markdown
**Tier assignment criteria (in addition to risk score):**

**Smoke tier candidates MUST:**
- Be happy-path (no negative/edge cases)
- Complete in < 2 minutes
- Have high feasibility (no blockers)
- Cover critical business functionality (auth, core workflow)
- Be stable (low flakiness risk)

**Release tier candidates SHOULD:**
- Be happy-path or common alternative paths
- Cover breadth of features
- Be feasible (medium+ feasibility)

**Regression tier candidates MAY:**
- Include edge cases and negative paths
- Include complex multi-step workflows
- Include lower-feasibility candidates (with remediation noted)

**Demotion rule:** If a high-risk candidate doesn't meet smoke criteria, demote to release. If it doesn't meet release criteria, demote to regression.
```

---

### Issue 4: Backward Compatibility Breaking Change

**Problem:** `includeRegression` default changed from `false` to `true`.

**Impact:** Users who previously ran `/journey-propose` and expected no regression proposals will now get them unexpectedly.

**Mitigation:** This is probably acceptable (more coverage is better), but should be documented.

**Fix:** Add migration note:
```markdown
**Breaking change (v2.0):** `includeRegression` now defaults to `true`.
Previous default was `false`. To restore old behavior, use `includeRegression=false`.
```

---

### Issue 5: Empty Tier Handling Not Specified

**Problem:** What if discovery finds:
- 15 smoke-worthy candidates
- 0 release-worthy candidates
- 10 regression-worthy candidates

Should regression candidates be promoted to release? Or leave release empty?

**Current state:** Not specified.

**Fix:** Add rule:
```markdown
**Empty tier handling:**
- Empty tiers are allowed (e.g., 10 smoke, 0 release, 5 regression is valid)
- Do NOT promote lower-tier candidates to fill empty higher tiers
- Instead, note in output: "Release tier: 0 (no candidates met release criteria)"
- The completion output should explain why each tier has fewer than maximum
```

---

### Issue 6: Insufficient Data Distribution

**Problem:** What if discovery only finds 5 high-quality candidates but user requests `coverage=large` (50)?

Current text says "propose as many as data supports" but doesn't specify distribution.

**Example:** 5 candidates available. Should output be:
- A) 5 smoke, 0 release, 0 regression?
- B) 2 smoke, 2 release, 1 regression?
- C) Fill by tier criteria regardless of counts?

**Fix:** Add rule:
```markdown
**Insufficient data distribution:**
When fewer candidates exist than requested:
1. Apply tier criteria to all candidates first
2. Assign each candidate to appropriate tier based on criteria (not counts)
3. Report actual counts vs requested counts
4. Do NOT spread thin just to fill tiers

Example: 5 candidates, all meet smoke criteria
→ Smoke: 5, Release: 0, Regression: 0
→ Output: "Only 5 smoke-quality candidates found. Consider running
   /discover-foundation with deeper analysis."
```

---

### Issue 7: Rerun Behavior with New Tier

**Problem:** User ran `/journey-propose` before (without regression). Now runs again with new defaults.

What happens to existing proposed journeys? Does it:
- A) Add new regression proposals alongside existing?
- B) Re-evaluate all and potentially re-tier existing?
- C) Only add regression if missing?

**Current state:** Step 10 says "On rerun: if an equivalent proposal exists (fingerprint match), reuse that file/ID" but doesn't address tier changes.

**Fix:** Add rerun behavior:
```markdown
**Rerun behavior with existing proposals:**
1. Existing proposals with fingerprint match: keep as-is, do not re-tier
2. New candidates not in existing proposals: assign tier and propose
3. If `includeRegression` was false before and is now true:
   - Existing smoke/release proposals unchanged
   - New regression proposals added for candidates not already proposed
4. Never demote an existing proposal to a lower tier
```

---

## Inconsistencies (Should Fix)

### Inconsistency 1: Table Column Names

Step 9.4 has "Max Total" column:
```
| Coverage | Smoke | Release | Regression | Max Total |
```

Inputs section has "Total" column:
```
| Coverage | Smoke | Release | Regression | Total |
```

**Fix:** Use "Total" consistently.

---

### Inconsistency 2: `mode` vs `coverage` Overlap

Both control "how much" but at different levels:
- `mode`: quick/standard/max → controls question depth
- `coverage`: small/large → controls proposal quantity

This is fine but could confuse users.

**Fix:** Clarify relationship:
```markdown
**Note:** `mode` controls question depth (how much to ask).
`coverage` controls proposal quantity (how many journeys).
They are independent settings.
```

---

### Inconsistency 3: JOURNEY_PROPOSALS.md Missing Tier Column

Step 13 describes the output table but doesn't explicitly include "tier":
```
- ID, title, tier, scope, actor  ← tier is listed
```

But the table format example isn't shown. Should be explicit.

**Fix:** Add example table format to Step 13.

---

### Inconsistency 4: Questionnaire Doesn't Match New Options

The STANDARD questionnaire (question 6) asks about coverage but uses old phrasing:
```
6) Confirm coverage scope:
   - `large` (recommended): 50 journeys (10 smoke, 20 release, 20 regression)
   - `small`: 20 journeys (5 smoke, 10 release, 5 regression)
```

This is good, but should follow the one-question-at-a-time format from GENERAL_RULES.md.

**Fix:** This was added earlier, should be verified it follows the new format.

---

### Inconsistency 5: Evidence JSON Missing Coverage Info

The evidence files don't capture which coverage preset was used:
- `evidence.scoring.json` — should include coverage setting

**Fix:** Add to Step 9.4:
```markdown
Write scoring evidence including:
- Coverage preset used (small/large/custom)
- Effective counts per tier
- Actual vs requested counts
```

---

## Missing Features (Nice to Have)

### Missing 1: `coverage=custom` Option

Currently users must specify all counts manually to get custom distribution.

**Add:**
```markdown
- `coverage`: `small | large | custom` (default: `large`)
  - `custom`: uses explicit `smokeCount`, `releaseCount`, `regressionCount`
```

---

### Missing 2: `--clean` / `--reset` Option

No way to clear existing proposals and start fresh.

**Add:**
```markdown
- `clean`: `true | false` (default: `false`)
  - If true, remove all existing proposed journeys before generating new ones
  - WARNING: This deletes files. Use with caution.
```

---

### Missing 3: Progress Reporting for Large Coverage

50 journeys is a lot. No progress feedback during generation.

**Add to Step 11:**
```markdown
For large coverage (>20 journeys), print progress:
```
Generating proposals...
  • Smoke tier: 10/10 ✓
  • Release tier: 15/20...
```
```

---

### Missing 4: Tier Balance Guidance

No guidance on what a "balanced" proposal set looks like.

**Add:**
```markdown
**Tier balance recommendations:**
- Smoke should be 15-25% of total (critical paths)
- Release should be 40-50% of total (happy paths)
- Regression should be 30-40% of total (edge cases)

The `large` preset (10/20/20 = 20%/40%/40%) follows this guidance.
```

---

### Missing 5: Dry Run Tier Preview

When `dryRun=true`, it should show what tiers would be assigned.

**Add:**
```markdown
**dryRun output includes:**
- Tier assignment for each candidate
- Expected counts per tier
- Candidates that would be excluded and why
```

---

### Missing 6: Tier Override per Journey

No way to force a specific journey into a specific tier.

**Add (future):**
```markdown
- `forceTier`: `<JRN-ID>:<tier>` — override tier assignment for specific journey
  Example: `forceTier=JRN-0001:smoke` ensures that journey is smoke tier
```

---

## Implementation Checklist (Prioritized)

### Must Fix (Before Using in Production)

- [ ] **Issue 1:** Add parameter priority rule (explicit overrides implicit)
- [ ] **Issue 2:** Add maxJourneys enforcement algorithm (priority-based filling)
- [ ] **Issue 3:** Add tier assignment criteria (not just sequential by risk)
- [ ] **Issue 4:** Add backward compatibility note (includeRegression default change)
- [ ] **Issue 5:** Add empty tier handling rule
- [ ] **Issue 6:** Add insufficient data distribution rule
- [ ] **Issue 7:** Add rerun behavior with existing proposals

### Should Fix (Before Next Release)

- [ ] **Inconsistency 1:** Standardize table column names
- [ ] **Inconsistency 2:** Clarify mode vs coverage relationship
- [ ] **Inconsistency 3:** Add explicit table format to Step 13
- [ ] **Inconsistency 5:** Add coverage info to evidence JSON

### Nice to Have (Future)

- [ ] **Missing 1:** Add `coverage=custom` option
- [ ] **Missing 2:** Add `clean=true` option
- [ ] **Missing 3:** Add progress reporting
- [ ] **Missing 4:** Add tier balance guidance
- [ ] **Missing 5:** Add dry run tier preview
- [ ] **Missing 6:** Add tier override per journey

---

## Conclusion

The implementation is a **good start** but has significant decision tree gaps. The main risk is **ambiguous behavior** when parameters conflict or when data is insufficient.

**Recommendation:** Fix Issues 1-3 and 5-7 before using this in a real project. Issue 4 (backward compatibility) is acceptable with documentation.

The implementation will work for the "happy path" (user accepts defaults, has enough data), but will produce confusing results in edge cases.
