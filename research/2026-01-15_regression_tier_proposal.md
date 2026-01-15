# Regression Tier in Journey Proposals

**Date:** 2026-01-15
**Topic:** Analysis of why `/journey-propose` excludes regression tests by default and whether this should change

---

## Current State

The `/artk.journey-propose` prompt has these default parameters:

```yaml
smokeCount: 6          # Propose up to 6 smoke journeys
releaseCount: 14       # Propose up to 14 release journeys
includeRegression: false  # Do NOT propose regression journeys
maxJourneys: 20        # Total cap
```

**Result:** Users get 20 proposed journeys (6 smoke + 14 release), but zero regression tier proposals.

---

## Why Was It Designed This Way?

### Hypothesis 1: Progressive Complexity Model

The ARTK workflow is designed to be iterative:

```
Phase 1: Smoke (minimal viable coverage)
    ↓
Phase 2: Release (comprehensive happy-path)
    ↓
Phase 3: Regression (everything else)
```

The thinking was: don't overwhelm teams with 50+ proposals. Start small, prove value, then expand.

**Problem:** This creates a false sense of completeness. Users think "I've proposed all my journeys" when they've only proposed 2/3 of the tiers.

### Hypothesis 2: Regression Is "Derived, Not Proposed"

The implicit assumption was that regression tests come from:
- Demoted smoke/release tests (became less critical over time)
- Bug fixes that need regression coverage
- Feature-specific tests added by feature teams
- Edge cases discovered during development

**Problem:** This is a valid pattern for *maintaining* a test suite, but not for *bootstrapping* one. When starting fresh, you want comprehensive proposals.

### Hypothesis 3: Quantity Explosion Fear

Regression tier can be massive. If you have 50 features, you might have:
- 5 smoke tests (critical paths)
- 15 release tests (happy paths)
- 100+ regression tests (edge cases, negative paths, variants)

Proposing all 120 at once would be overwhelming.

**Problem:** This is a capacity concern, not a tier concern. You can cap `regressionCount` like you cap the others.

### Hypothesis 4: Different Ownership Model

```
Smoke/Release: Platform/QA team owns
Regression: Feature teams own
```

The proposal phase focuses on centrally-owned tests.

**Problem:** This assumes a specific org structure that may not apply. Many teams have unified ownership.

---

## Analysis: The Real Issue

The current design has a **philosophical inconsistency**:

| Tier | Purpose | Default Proposal |
|------|---------|------------------|
| Smoke | Critical paths, run on every commit | Yes (6) |
| Release | Happy paths, run before release | Yes (14) |
| Regression | Comprehensive coverage, run nightly | **No (0)** |

**Why is this inconsistent?**

1. **Risk signal applies to all tiers.** If a feature has high churn + incident history, it needs regression coverage too.

2. **The proposal algorithm already identifies candidates.** It scores by risk, feasibility, and reuse potential. These scores apply equally to regression-tier journeys.

3. **Users must manually remember to add `includeRegression=true`.** Most won't. They'll end up with incomplete proposals.

4. **The 6+14=20 math is arbitrary.** Why not 5+10+5=20? Or 4+8+8=20?

---

## What Regression Tests Actually Cover

Understanding what regression tier is *for* helps clarify the issue:

### Smoke Tier (Critical Path)
- Login/auth works
- Core workflow completes
- App doesn't crash on load
- **Run:** Every commit/PR

### Release Tier (Happy Path)
- All major features work end-to-end
- Key user journeys complete successfully
- No obvious regressions in shipped features
- **Run:** Before release, after merge to main

### Regression Tier (Comprehensive)
- Edge cases and negative paths
- Less common but still important flows
- Feature variants (different user types, data states)
- Previously-fixed bugs (prevent reintroduction)
- **Run:** Nightly, weekly, or on-demand

**The key insight:** Regression tier is not "less important" than release tier. It's "less frequently run" but equally important for comprehensive coverage.

---

## Proposed Solution

### Option A: Add Regression with Default Count (Recommended)

Change the defaults to:

```yaml
smokeCount: 5
releaseCount: 10
regressionCount: 5      # NEW
includeRegression: true  # CHANGED
maxJourneys: 20
```

**Rationale:**
- Balanced distribution across tiers
- Users get a taste of regression proposals
- Still respects the 20-journey cap
- No breaking change (users can still set `includeRegression=false`)

### Option B: Add Proposal Scope Mode

Add a new parameter:

```yaml
proposalScope: core | full | comprehensive
```

| Scope | Smoke | Release | Regression | Total |
|-------|-------|---------|------------|-------|
| `core` | 6 | 14 | 0 | 20 |
| `full` | 5 | 10 | 5 | 20 |
| `comprehensive` | 8 | 16 | 16 | 40 |

**Rationale:**
- Preserves current behavior as `core`
- Adds flexibility for different adoption stages
- `comprehensive` is for mature teams who want everything

### Option C: Tier-Proportional Proposal

Instead of fixed counts per tier, use proportions:

```yaml
tierDistribution:
  smoke: 0.25      # 25% of proposals
  release: 0.50    # 50% of proposals
  regression: 0.25 # 25% of proposals
```

With `maxJourneys: 20`, this gives 5/10/5.

**Rationale:**
- More intuitive than absolute counts
- Scales automatically with `maxJourneys`
- Easy to adjust balance

---

## Recommendation

**Implement Option A (simplest) with elements of Option C (proportional):**

1. **Change defaults:**
   ```yaml
   smokeCount: 5
   releaseCount: 10
   regressionCount: 5
   includeRegression: true  # Now defaults to true
   ```

2. **Add proportional mode (optional, for v2):**
   ```yaml
   tierDistribution: balanced | smoke-heavy | release-heavy | custom
   ```

3. **Update the prompt's scoring algorithm:**
   - Currently: select top N for smoke, then top M for release
   - Change: select proportionally across all tiers based on risk score

4. **Document the change:**
   - Add explanation of tier purposes in the prompt
   - Clarify that regression proposals are for "high-risk comprehensive coverage"

---

## Implementation Checklist

If we proceed with this change:

- [ ] Update `prompts/artk.journey-propose.md`:
  - Change `includeRegression` default to `true`
  - Add `regressionCount` parameter (default: 5)
  - Adjust `smokeCount` to 5, `releaseCount` to 10
  - Update Step 9.4 selection algorithm to include regression
  - Update completion checklist to mention regression tier

- [ ] Update `prompts/common/GENERAL_RULES.md`:
  - Document tier purposes if not already covered

- [ ] Update any examples that show proposal output:
  - Show smoke + release + regression in tables

- [ ] Consider backward compatibility:
  - Users who relied on `includeRegression=false` default will now get regression proposals
  - This is probably fine (more proposals = more value)

---

## Conclusion

The current design excludes regression tests by default based on assumptions about progressive adoption and capacity concerns. However, this creates an incomplete proposal experience and forces users to remember an opt-in flag.

**Recommendation:** Change `includeRegression` to `true` by default, add `regressionCount: 5`, and adjust the other counts to maintain the 20-journey cap. This gives users a balanced proposal across all tiers without overwhelming them.

The change is low-risk (just adds more proposals) and high-value (complete tier coverage from the start).
