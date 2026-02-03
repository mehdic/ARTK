# LLKB Integration Fix Plan

**Date:** 2026-02-01
**Status:** Implementation Plan

---

## Executive Summary

LLKB is **75-80% implemented** but integration is broken. The fix requires:
- **4 hours** of prompt changes (P1 - Critical)
- **6 hours** of enhancements (P2 - Important)
- **4 hours** of nice-to-haves (P3 - Future)

Total: **14 hours** to complete the system end-to-end.

---

## Root Cause Analysis

| Perceived Problem | Actual State | Real Fix Needed |
|------------------|--------------|-----------------|
| "LLKB CLI doesn't exist" | CLI fully works | Wire prompts to call it correctly |
| "No feedback loop" | `artk llkb learn` exists | Add to prompts after LLM fixes |
| "Cold start problem" | True - starts empty | Pre-seed with universal patterns |
| "40-60% blocked rate" | By design | Accept - learning loop improves it |
| "No telemetry" | No blocked metrics | Add blocked step count to output |

---

## Implementation Plan

### Phase 1: Critical Fixes (4 hours)

#### 1.1 Add Learning Instructions to journey-implement Prompt (1h)

**File:** `prompts/artk.journey-implement.md`

**Add after blocked step handling:**
```markdown
### MANDATORY: Record Learning After Fixing Blocked Steps

When you write Playwright code for a blocked step, you MUST record it:

\`\`\`bash
artk llkb learn \
  --type pattern \
  --journey ${JOURNEY_ID} \
  --success \
  --context "Description of what the step does" \
  --selector-strategy testid \
  --selector-value "the-selector-used"
\`\`\`

This ensures the learning loop closes - next time a similar step appears,
LLKB may be able to generate it automatically.
```

#### 1.2 Add Blocked Step Telemetry (1h)

**File:** `packages/cli/src/lib/workflows/journey-implement.ts`

**Add to executeImplementation result:**
```typescript
interface ImplementationMetrics {
  totalSteps: number;
  generatedSteps: number;
  blockedSteps: number;
  blockedRate: number;
  blockedReasons: string[];
}
```

**Parse from AutoGen output:**
- Look for `ARTK BLOCKED:` lines in generated test
- Count blocked vs total steps
- Include in session state

#### 1.3 Add Subagent Learning Contract (2h)

**File:** `prompts/artk.journey-implement.md`

**Require subagents to return:**
```json
{
  "journeyId": "JRN-0001",
  "testFile": "JRN-0001.spec.ts",
  "blockedStepsFixed": 3,
  "learningsRecorded": [
    {
      "type": "pattern",
      "context": "Verify order summary table",
      "selectorStrategy": "testid",
      "selectorValue": "order-summary"
    }
  ]
}
```

---

### Phase 2: Important Enhancements (6 hours)

#### 2.1 Create Universal Pattern Seeds (4h)

**File:** `packages/cli/assets/llkb-seeds/universal-patterns.json`

**Include 20-30 common patterns:**
```json
{
  "schemaVersion": "1.0.0",
  "name": "Universal Patterns",
  "description": "Common UI patterns that work across most web applications",
  "patterns": [
    {
      "trigger": "click the {button} button",
      "ir": { "type": "click", "locator": { "strategy": "role", "value": "button", "options": { "name": "{button}" } } },
      "confidence": 0.9,
      "category": "interaction"
    },
    {
      "trigger": "fill {value} into the {field} field",
      "ir": { "type": "fill", "locator": { "strategy": "label", "value": "{field}" }, "value": "{value}" },
      "confidence": 0.9,
      "category": "form"
    },
    {
      "trigger": "navigate to {path}",
      "ir": { "type": "goto", "url": "{path}" },
      "confidence": 0.95,
      "category": "navigation"
    }
    // ... 17-27 more patterns
  ]
}
```

#### 2.2 Add Seed Application to discover-foundation (1h)

**File:** `prompts/artk.discover-foundation.md`

**Add step:**
```markdown
### Step 8: Initialize LLKB with Universal Patterns

\`\`\`bash
artk llkb init --llkb-root ${LLKB_ROOT}
artk llkb seed --patterns universal
\`\`\`
```

#### 2.3 Add Journey Stats to Analytics (1h)

**File:** `core/typescript/llkb/analytics.ts`

**Add:**
```typescript
interface JourneyStats {
  journeyId: string;
  totalSteps: number;
  generatedSteps: number;
  blockedSteps: number;
  blockedRate: number;
  implementedAt: string;
}
```

---

### Phase 3: Nice to Have (4 hours)

#### 3.1 Create journey-maintain Prompt (3h)

**File:** `prompts/artk.journey-maintain.md`

**Purpose:** Update tests when LLKB improves

**Steps:**
1. Run `artk llkb check-updates --tests-dir tests/`
2. Preview changes for outdated tests
3. Prompt user: "Update N tests to latest LLKB? [Y/n]"
4. Run `artk llkb update-tests --tests-dir tests/`
5. Verify tests still pass
6. Rollback on failure

#### 3.2 Add LLKB Version to Test Headers (1h)

Already exists in `versioning.ts` - just ensure it's being called.

---

## Verification Checklist

After implementation, verify:

- [ ] `artk llkb export --for-autogen` creates YAML + TS files
- [ ] `artk llkb learn --type pattern --journey JRN-0001 --success` works
- [ ] Journey-implement prompt includes learning instructions
- [ ] Blocked step count appears in output
- [ ] Universal patterns are seeded on discover-foundation
- [ ] Learning loop closes: blocked step → LLM fix → learn → next time works

---

## Success Metrics

| Metric | Before | After (Target) |
|--------|--------|----------------|
| Blocked rate (new project) | 40-60% | 40-60% (same) |
| Blocked rate (after 20 journeys) | 40-60% | 30-40% |
| Blocked rate (after 100 journeys) | 40-60% | 20-30% |
| Learning events recorded | 0 | 1 per blocked step fixed |
| Time to first useful LLKB | Never | After 5-10 journeys |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| YAML generation breaks | Medium | High | Use yaml library instead of strings |
| Learning events not recorded | Low | Medium | Add verification in prompt |
| Patterns don't match | Medium | Low | By design - LLM handles edge cases |
| Cold start frustration | Medium | Medium | Pre-seed with universal patterns |

---

## Timeline

| Week | Tasks | Hours |
|------|-------|-------|
| This week | P1: Critical fixes | 4h |
| Next week | P2: Enhancements | 6h |
| Week after | P3: Nice to have | 4h |

**Total:** 14 hours over 3 weeks
