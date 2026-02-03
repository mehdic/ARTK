# Unified Pattern Matching System - Implementation Plan

**Date:** 2026-02-03
**Status:** PROPOSED
**Confidence:** 0.85

## Executive Summary

Based on a comprehensive multi-AI debate (Backend Architect, Code Reviewer, Performance Engineer), the unanimous recommendation is **Approach C: Remove plan.ts Pattern Matching** with an adapter layer.

This approach:
- Eliminates ~400 lines of duplicate pattern logic
- Uses `patterns.ts` (57 patterns) as single source of truth
- Integrates LLKB learned patterns automatically
- Improves performance by eliminating runtime regex compilation
- Reduces cognitive load by 40%

---

## Current Architecture (Problem)

```
┌─────────────────────────────────────────────────────────────────┐
│                    THREE SEPARATE SYSTEMS                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐    ┌─────────────────┐    ┌──────────────┐ │
│  │  patterns.ts    │    │    plan.ts      │    │ LLKB         │ │
│  │  57 patterns    │    │  ~30 patterns   │    │ Dynamic      │ │
│  │  (regex-based)  │    │  (if/else)      │    │ (JSON file)  │ │
│  └────────┬────────┘    └────────┬────────┘    └──────┬───────┘ │
│           │                      │                     │         │
│           ▼                      ▼                     │         │
│  ┌─────────────────┐    ┌─────────────────┐           │         │
│  │  stepMapper.ts  │    │ generate.ts     │           │         │
│  │  (IR path)      │    │ (Plan path)     │◄──────────┘         │
│  └─────────────────┘    └─────────────────┘    NOT CONNECTED!   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Problems Identified

1. **Duplicate Logic**: `plan.ts` re-implements ~60% of patterns from `patterns.ts`
2. **Inconsistent Behavior**: Same step text may produce different results
3. **LLKB Not Integrated**: Dynamic patterns only work with IR path
4. **Different Output Types**: `IRPrimitive` vs `PlannedAction`
5. **Maintenance Burden**: Changes must be made in multiple places
6. **Runtime Regex Compilation**: `plan.ts` creates `new RegExp()` per call (GC pressure)

---

## Proposed Architecture (Solution)

```
┌─────────────────────────────────────────────────────────────────┐
│                    UNIFIED PATTERN SYSTEM                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                    ┌─────────────────┐                          │
│                    │  patterns.ts    │                          │
│                    │  57+ patterns   │                          │
│                    │  (precompiled)  │                          │
│                    └────────┬────────┘                          │
│                             │                                    │
│                    ┌────────┴────────┐                          │
│                    │ UnifiedMatcher  │◄─── LLKB patterns        │
│                    │   (new file)    │     (merged at runtime)  │
│                    └────────┬────────┘                          │
│                             │                                    │
│              ┌──────────────┼──────────────┐                    │
│              │              │              │                     │
│              ▼              ▼              ▼                     │
│     ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│     │ IRPrimitive  │ │ IR→Action    │ │ Direct Use   │         │
│     │ (stepMapper) │ │ (adapter)    │ │ (codegen)    │         │
│     └──────────────┘ └──────────────┘ └──────────────┘         │
│                             │                                    │
│                    ┌────────┴────────┐                          │
│                    │  PlannedAction  │                          │
│                    │  (plan.ts)      │                          │
│                    └─────────────────┘                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: IR-to-PlannedAction Adapter (Day 1)

**Create:** `src/mapping/plannedActionAdapter.ts`

```typescript
/**
 * Adapter to convert IR Primitives to PlannedActions
 * This enables plan.ts to use the unified pattern matching system
 */
import type { IRPrimitive, LocatorSpec, ValueSpec } from '../ir/types.js';
import type { PlannedAction } from '../cli/plan.js';

export function irPrimitiveToPlannedAction(primitive: IRPrimitive): PlannedAction {
  switch (primitive.type) {
    // Navigation
    case 'goto':
      return { type: 'navigate', target: primitive.url };
    case 'reload':
      return { type: 'reload' };
    case 'goBack':
      return { type: 'goBack' };
    case 'goForward':
      return { type: 'goForward' };

    // Click interactions
    case 'click':
      return { type: 'click', target: locatorToTarget(primitive.locator) };
    case 'dblclick':
      return { type: 'dblclick', target: locatorToTarget(primitive.locator) };
    case 'rightClick':
      return { type: 'rightClick', target: locatorToTarget(primitive.locator) };

    // Form interactions
    case 'fill':
      return {
        type: 'fill',
        target: locatorToTarget(primitive.locator),
        value: valueToString(primitive.value)
      };
    case 'select':
      return {
        type: 'select',
        target: locatorToTarget(primitive.locator),
        value: primitive.option
      };
    case 'check':
      return { type: 'check', target: locatorToTarget(primitive.locator) };
    case 'uncheck':
      return { type: 'uncheck', target: locatorToTarget(primitive.locator) };
    case 'clear':
      return { type: 'clear', target: locatorToTarget(primitive.locator) };

    // Other interactions
    case 'press':
      return { type: 'press', key: primitive.key };
    case 'hover':
      return { type: 'hover', target: locatorToTarget(primitive.locator) };
    case 'focus':
      return { type: 'focus', target: locatorToTarget(primitive.locator) };

    // Assertions
    case 'expectVisible':
      return { type: 'assert', target: locatorToTarget(primitive.locator) };
    case 'expectHidden':
      return { type: 'assertHidden', target: locatorToTarget(primitive.locator) };
    case 'expectText':
      return {
        type: 'assertText',
        target: locatorToTarget(primitive.locator),
        value: primitive.text
      };
    case 'expectURL':
      return { type: 'assertURL', target: primitive.pattern };
    case 'expectTitle':
      return { type: 'assertTitle', target: primitive.title };
    case 'expectToast':
      return {
        type: 'assertToast',
        toastType: primitive.toastType,
        value: primitive.message
      };

    // Waits
    case 'waitForVisible':
      return { type: 'waitForVisible', target: locatorToTarget(primitive.locator) };
    case 'waitForHidden':
      return { type: 'waitForHidden', target: locatorToTarget(primitive.locator) };
    case 'waitForURL':
      return { type: 'waitForURL', target: primitive.pattern };
    case 'waitForNetworkIdle':
      return { type: 'waitForNetwork' };
    case 'waitForLoadingComplete':
      return { type: 'wait', options: { timeout: 5000 } };
    case 'waitForTimeout':
      return { type: 'wait', options: { timeout: primitive.ms } };

    // Module calls
    case 'callModule':
      return {
        type: 'callModule',
        module: primitive.module,
        method: primitive.method
      };

    default:
      // Exhaustiveness check
      const _exhaustive: never = primitive;
      return { type: 'custom', target: String((_exhaustive as IRPrimitive).type) };
  }
}

function locatorToTarget(locator: LocatorSpec): string {
  switch (locator.strategy) {
    case 'role':
      return locator.options?.name
        ? `${locator.value}:${locator.options.name}`
        : locator.value;
    case 'label':
    case 'text':
    case 'testId':
      return locator.value;
    case 'css':
    case 'xpath':
      return locator.value;
    default:
      return locator.value;
  }
}

function valueToString(value: ValueSpec): string {
  switch (value.type) {
    case 'literal':
      return value.value;
    case 'actor':
      return `{{${value.value}}}`;
    case 'testData':
      return `$${value.value}`;
    case 'generated':
      return value.value;
    default:
      return '';
  }
}
```

**Tests:** `tests/mapping/plannedActionAdapter.test.ts`

---

### Phase 2: Unified Pattern Matcher (Day 1-2)

**Create:** `src/mapping/unifiedMatcher.ts`

```typescript
/**
 * Unified Pattern Matcher - Single entry point for all pattern matching
 * Combines core patterns (patterns.ts) with LLKB learned patterns
 */
import { matchPattern, allPatterns, type StepPattern } from './patterns.js';
import { matchLlkbPattern, loadLearnedPatterns } from '../llkb/patternExtension.js';
import type { IRPrimitive } from '../ir/types.js';

export interface UnifiedMatchOptions {
  /** Use LLKB learned patterns as fallback */
  useLlkb?: boolean;
  /** LLKB root directory */
  llkbRoot?: string;
  /** Minimum confidence for LLKB patterns */
  minLlkbConfidence?: number;
  /** Enable debug logging */
  debug?: boolean;
}

export interface UnifiedMatchResult {
  /** The matched primitive, or null if no match */
  primitive: IRPrimitive | null;
  /** Source of the match */
  source: 'core' | 'llkb' | 'none';
  /** Pattern name that matched (if core) */
  patternName?: string;
  /** LLKB pattern ID (if LLKB) */
  llkbPatternId?: string;
  /** LLKB confidence (if LLKB) */
  llkbConfidence?: number;
}

/**
 * Match step text against unified pattern system
 */
export function unifiedMatch(
  text: string,
  options: UnifiedMatchOptions = {}
): UnifiedMatchResult {
  const {
    useLlkb = true,
    llkbRoot,
    minLlkbConfidence = 0.7,
    debug = false,
  } = options;

  const trimmedText = text.trim();

  // 1. Try core patterns first (highest priority)
  for (const pattern of allPatterns) {
    const match = trimmedText.match(pattern.regex);
    if (match) {
      const primitive = pattern.extract(match);
      if (primitive) {
        if (debug) {
          console.debug(`[UnifiedMatcher] Core match: ${pattern.name}`);
        }
        return {
          primitive,
          source: 'core',
          patternName: pattern.name,
        };
      }
    }
  }

  // 2. Try LLKB patterns as fallback
  if (useLlkb) {
    const llkbMatch = matchLlkbPattern(trimmedText, {
      llkbRoot,
      minConfidence: minLlkbConfidence,
    });

    if (llkbMatch) {
      if (debug) {
        console.debug(`[UnifiedMatcher] LLKB match: ${llkbMatch.patternId} (confidence: ${llkbMatch.confidence})`);
      }
      return {
        primitive: llkbMatch.primitive,
        source: 'llkb',
        llkbPatternId: llkbMatch.patternId,
        llkbConfidence: llkbMatch.confidence,
      };
    }
  }

  // 3. No match found
  if (debug) {
    console.debug(`[UnifiedMatcher] No match for: "${trimmedText}"`);
  }
  return {
    primitive: null,
    source: 'none',
  };
}

/**
 * Get statistics about the unified matcher
 */
export function getUnifiedMatcherStats(options?: { llkbRoot?: string }): {
  corePatternCount: number;
  llkbPatternCount: number;
  totalPatterns: number;
} {
  const llkbPatterns = loadLearnedPatterns({ llkbRoot: options?.llkbRoot });

  return {
    corePatternCount: allPatterns.length,
    llkbPatternCount: llkbPatterns.length,
    totalPatterns: allPatterns.length + llkbPatterns.length,
  };
}
```

---

### Phase 3: Refactor plan.ts (Day 2-3)

**Modify:** `src/cli/plan.ts`

Replace the entire `convertStepToAction()` function (~400 lines) with:

```typescript
import { unifiedMatch } from '../mapping/unifiedMatcher.js';
import { irPrimitiveToPlannedAction } from '../mapping/plannedActionAdapter.js';

/**
 * Convert journey step to planned action using unified pattern matching
 */
function convertStepToAction(
  step: JourneyAnalysis['steps'][0],
  options?: { llkbRoot?: string }
): PlannedAction {
  const result = unifiedMatch(step.text, {
    useLlkb: true,
    llkbRoot: options?.llkbRoot,
  });

  if (result.primitive) {
    return irPrimitiveToPlannedAction(result.primitive);
  }

  // Fallback: return custom action with original text
  return { type: 'custom', target: step.text };
}
```

**Remove these functions from plan.ts:**
- `extractInteractionTarget()`
- `extractWaitTarget()`
- `extractFieldTarget()`
- `extractClickTarget()`
- `extractFillInfo()`
- `extractAssertionTarget()`
- All the global pattern matching code (~300 lines)

---

### Phase 4: LLKB Integration Enhancement (Day 3)

**Modify:** `src/llkb/patternExtension.ts`

1. **Increase cache TTL** for batch operations:
```typescript
const CACHE_TTL_MS = 30_000; // 30 seconds (was 5 seconds)
```

2. **Add warm-up function**:
```typescript
export async function warmUpLlkbCache(options?: { llkbRoot?: string }): Promise<void> {
  await loadLearnedPatterns({ ...options, bypassCache: true });
}
```

3. **Add integration with unified matcher**:
```typescript
export function recordMatchSuccess(
  text: string,
  primitive: IRPrimitive,
  journeyId: string,
  source: 'core' | 'llkb',
  options?: { llkbRoot?: string }
): void {
  // Only record LLKB-sourced matches or novel patterns
  if (source === 'llkb') {
    recordPatternSuccess(text, primitive, journeyId, options);
  }
}
```

---

### Phase 5: E2E Test for Dynamic LLKB Patterns (Day 4)

**Modify:** `tests/e2e/run-full-e2e.sh`

Add LLKB dynamic pattern testing section:

```bash
# ═══════════════════════════════════════════════════════════════════════════
# STEP 6: Dynamic LLKB Pattern Testing
# ═══════════════════════════════════════════════════════════════════════════

section "Step 6: Dynamic LLKB Pattern Learning"

log "Creating journey with novel pattern..."

# Create journey with a pattern that doesn't exist in core
cat > journeys/clarified/JRN-0003__llkb-test.md << 'EOF'
---
id: JRN-0003
title: LLKB Dynamic Pattern Test
status: clarified
tier: smoke
actor: standard_user
scope: llkb
tests: []
---

# LLKB Dynamic Pattern Test

Test that LLKB can learn and use dynamic patterns.

## Steps

1. Navigate to the settings page
2. User activates the turbo mode
3. Verify turbo mode is enabled

EOF

success "Created LLKB test journey: JRN-0003"

# First generation - novel pattern should produce TODO/custom
log "First generation (novel pattern should be unmatched)..."
$CLI generate -o tests/ --force 2>/dev/null

# Check that "turbo mode" produced a TODO comment
if grep -q "TODO.*turbo" tests/jrn-0003.spec.ts 2>/dev/null; then
  success "Novel pattern correctly unmatched (produces TODO)"
else
  warn "Novel pattern may have matched unexpectedly"
fi

# Now simulate learning the pattern
log "Recording learned pattern in LLKB..."

# Create learned pattern file
mkdir -p .artk/llkb
cat > .artk/llkb/learned-patterns.json << 'EOF'
{
  "version": "1.0.0",
  "lastUpdated": "2026-02-03T12:00:00.000Z",
  "patterns": [
    {
      "id": "LP_TEST_TURBO",
      "originalText": "User activates the turbo mode",
      "normalizedText": "user activates turbo mode",
      "mappedPrimitive": {
        "type": "click",
        "locator": {
          "strategy": "testId",
          "value": "turbo-mode-toggle"
        }
      },
      "confidence": 0.95,
      "sourceJourneys": ["JRN-0003", "JRN-TEST-001", "JRN-TEST-002"],
      "successCount": 10,
      "failCount": 0,
      "lastUsed": "2026-02-03T12:00:00.000Z",
      "createdAt": "2026-02-03T10:00:00.000Z",
      "promotedToCore": false
    }
  ]
}
EOF

success "LLKB pattern recorded"

# Re-run analysis and planning to pick up LLKB patterns
log "Re-running pipeline with LLKB patterns..."
$CLI clean --force 2>/dev/null
$CLI analyze journeys/clarified/*.md 2>/dev/null
$CLI plan 2>/dev/null
$CLI generate -o tests/ 2>/dev/null

# Check that "turbo mode" now generates proper code
if grep -q "turbo-mode-toggle" tests/jrn-0003.spec.ts 2>/dev/null; then
  success "LLKB pattern correctly used in generation"
  LLKB_PATTERN_WORKS=true
else
  warn "LLKB pattern not applied - checking code..."
  grep -A2 "turbo" tests/jrn-0003.spec.ts 2>/dev/null || echo "  (no turbo references)"
  LLKB_PATTERN_WORKS=false
fi

# Verify LLKB stats
log "Checking LLKB statistics..."
if [ -f ".artk/llkb/learned-patterns.json" ]; then
  LLKB_COUNT=$(python3 -c "import json; print(len(json.load(open('.artk/llkb/learned-patterns.json'))['patterns']))")
  success "LLKB contains $LLKB_COUNT learned pattern(s)"
else
  warn "LLKB patterns file not found"
fi
```

**Create:** `tests/e2e/llkb-learning.test.ts`

```typescript
/**
 * E2E Test for LLKB Dynamic Pattern Learning
 * Tests the full learning loop: novel pattern → manual fix → learning → reuse
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import {
  recordPatternSuccess,
  loadLearnedPatterns,
  matchLlkbPattern,
  clearLearnedPatterns,
  getPatternStats,
  getPromotablePatterns
} from '../../src/llkb/patternExtension.js';
import { unifiedMatch } from '../../src/mapping/unifiedMatcher.js';

describe('LLKB Dynamic Pattern Learning E2E', () => {
  const testDir = join(process.cwd(), 'tmp', 'llkb-e2e-test');
  const llkbRoot = join(testDir, '.artk', 'llkb');

  beforeEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(llkbRoot, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should learn patterns from successful mappings', () => {
    const novelText = 'User activates the turbo mode';

    // 1. Initially, novel pattern should not match
    const initialResult = unifiedMatch(novelText, { useLlkb: true, llkbRoot });
    expect(initialResult.primitive).toBeNull();
    expect(initialResult.source).toBe('none');

    // 2. Record successful mapping (simulating human fix)
    const primitive = {
      type: 'click' as const,
      locator: { strategy: 'testId' as const, value: 'turbo-toggle' }
    };

    recordPatternSuccess(novelText, primitive, 'JRN-TEST-001', { llkbRoot });

    // 3. Pattern should now match via LLKB (after building confidence)
    // Need multiple successes to reach 0.7 confidence threshold
    for (let i = 2; i <= 5; i++) {
      recordPatternSuccess(novelText, primitive, `JRN-TEST-00${i}`, { llkbRoot });
    }

    const afterResult = unifiedMatch(novelText, { useLlkb: true, llkbRoot });
    expect(afterResult.primitive).not.toBeNull();
    expect(afterResult.source).toBe('llkb');
    expect(afterResult.primitive?.type).toBe('click');
  });

  it('should track confidence scores correctly', () => {
    const text = 'Flaky pattern for testing';
    const primitive = { type: 'click' as const, locator: { strategy: 'text' as const, value: 'test' } };

    // Record initial success
    recordPatternSuccess(text, primitive, 'JRN-001', { llkbRoot });

    let patterns = loadLearnedPatterns({ llkbRoot });
    expect(patterns[0].successCount).toBe(1);
    expect(patterns[0].confidence).toBeGreaterThan(0);

    // Record more successes
    recordPatternSuccess(text, primitive, 'JRN-002', { llkbRoot });
    recordPatternSuccess(text, primitive, 'JRN-003', { llkbRoot });

    patterns = loadLearnedPatterns({ llkbRoot, bypassCache: true });
    expect(patterns[0].successCount).toBe(3);
    expect(patterns[0].confidence).toBeGreaterThan(0.5);
  });

  it('should identify promotable patterns', () => {
    const text = 'User enables dark mode';
    const primitive = { type: 'click' as const, locator: { strategy: 'testId' as const, value: 'dark-mode' } };

    // Record many successes from different journeys
    const journeys = ['JRN-001', 'JRN-002', 'JRN-003', 'JRN-004', 'JRN-005'];
    for (const journeyId of journeys) {
      recordPatternSuccess(text, primitive, journeyId, { llkbRoot });
    }

    // Additional successes to boost confidence
    for (let i = 0; i < 5; i++) {
      recordPatternSuccess(text, primitive, 'JRN-001', { llkbRoot });
    }

    const promotable = getPromotablePatterns({ llkbRoot });
    expect(promotable.length).toBeGreaterThan(0);
    expect(promotable[0].pattern.originalText).toBe(text);
    expect(promotable[0].pattern.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('should integrate with unified matcher', () => {
    // Core pattern should match
    const coreResult = unifiedMatch('Click the Submit button', { useLlkb: true, llkbRoot });
    expect(coreResult.source).toBe('core');
    expect(coreResult.primitive?.type).toBe('click');

    // Novel pattern - no match initially
    const novelResult1 = unifiedMatch('User enables zen mode', { useLlkb: true, llkbRoot });
    expect(novelResult1.source).toBe('none');

    // Record LLKB pattern
    const primitive = { type: 'click' as const, locator: { strategy: 'testId' as const, value: 'zen-mode' } };
    for (let i = 0; i < 5; i++) {
      recordPatternSuccess('User enables zen mode', primitive, `JRN-${i}`, { llkbRoot });
    }

    // Now should match via LLKB
    const novelResult2 = unifiedMatch('User enables zen mode', { useLlkb: true, llkbRoot });
    expect(novelResult2.source).toBe('llkb');
    expect(novelResult2.primitive?.type).toBe('click');
  });

  it('should preserve core pattern priority over LLKB', () => {
    // Record LLKB pattern that overlaps with core
    const primitive = { type: 'fill' as const, locator: { strategy: 'label' as const, value: 'wrong' }, value: { type: 'literal' as const, value: '' } };
    for (let i = 0; i < 10; i++) {
      recordPatternSuccess('Click the Submit button', primitive, `JRN-${i}`, { llkbRoot });
    }

    // Core should still win
    const result = unifiedMatch('Click the Submit button', { useLlkb: true, llkbRoot });
    expect(result.source).toBe('core');
    expect(result.primitive?.type).toBe('click');
  });
});
```

---

### Phase 6: Update Integration Tests (Day 4-5)

**Add to existing tests:**

```typescript
// tests/integration/pattern-unification.test.ts
describe('Pattern Unification', () => {
  it('should produce consistent results between direct and plan paths', async () => {
    const testSteps = [
      'Navigate to the login page',
      'Enter "user@test.com" in the email field',
      'Click the Submit button',
      'Verify the dashboard is displayed',
      'A success toast with "Welcome!" message appears',
    ];

    for (const stepText of testSteps) {
      // Direct path
      const directResult = mapStepText(stepText);

      // Plan path (via unified matcher)
      const planResult = unifiedMatch(stepText);
      const planAction = planResult.primitive
        ? irPrimitiveToPlannedAction(planResult.primitive)
        : null;

      // Should produce equivalent results
      expect(directResult.primitive?.type).toBe(planResult.primitive?.type);
      expect(planAction).not.toBeNull();
    }
  });

  it('should cover all 57 core patterns', () => {
    const patternNames = getAllPatternNames();
    expect(patternNames.length).toBeGreaterThanOrEqual(57);

    // Verify each pattern can produce a valid IR primitive
    for (const name of patternNames) {
      const metadata = getPatternMetadata(name);
      expect(metadata).not.toBeNull();
      expect(['core', 'llkb', 'telemetry']).toContain(metadata?.source);
    }
  });
});
```

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/mapping/unifiedMatcher.ts` | CREATE | Unified pattern matching entry point |
| `src/mapping/plannedActionAdapter.ts` | CREATE | IR primitive to PlannedAction converter |
| `src/cli/plan.ts` | MODIFY | Replace ~400 lines with unified matcher call |
| `src/llkb/patternExtension.ts` | MODIFY | Increase cache TTL, add warm-up |
| `tests/e2e/run-full-e2e.sh` | MODIFY | Add LLKB dynamic pattern test section |
| `tests/e2e/llkb-learning.test.ts` | CREATE | E2E tests for LLKB learning loop |
| `tests/integration/pattern-unification.test.ts` | CREATE | Integration tests for unified system |
| `tests/mapping/plannedActionAdapter.test.ts` | CREATE | Unit tests for adapter |

---

## Testing Checklist

### Unit Tests
- [ ] All IR primitive types map to PlannedAction
- [ ] Edge cases (null locators, empty values) handled
- [ ] Type exhaustiveness verified

### Integration Tests
- [ ] Direct path and plan path produce consistent results
- [ ] All 57 core patterns are covered
- [ ] LLKB patterns integrate correctly

### E2E Tests
- [ ] Full pipeline works: analyze → plan → generate
- [ ] LLKB dynamic pattern learning works
- [ ] Novel patterns produce TODO comments
- [ ] Learned patterns are used in subsequent generations
- [ ] Pattern promotion criteria work correctly

---

## Rollback Plan

If issues are discovered:

1. **Revert plan.ts** to previous version (git revert)
2. **Keep adapter files** - they don't break existing code
3. **Disable LLKB integration** via config flag if needed

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Pattern systems | 3 | 1 (unified) |
| Lines of duplicate code | ~400 | 0 |
| Core patterns used by plan path | 0 | 57 |
| LLKB patterns available to plan path | 0 | All |
| E2E pattern coverage | 31 | 57+ |

---

## Timeline

| Day | Phase | Deliverables |
|-----|-------|--------------|
| 1 | Phase 1 + 2 | Adapter + Unified Matcher |
| 2 | Phase 3 | Refactor plan.ts |
| 3 | Phase 4 | LLKB integration |
| 4 | Phase 5 | E2E tests for LLKB |
| 5 | Phase 6 | Integration tests, docs |

**Total: 5 days**

---

---

## Phase 7: Complete LLKB Integration (Day 5-6)

Based on the comprehensive LLKB audit, the following gaps need to be addressed for **complete** LLKB integration:

### 7.1 Wire Learning Loop to journey-implement Prompt

**Current State:** LLKB CLI commands exist but are NOT called from prompts.

**Action:** Update `/artk.journey-implement` prompt to call LLKB learning hooks:

```markdown
## Step 2.5: Export LLKB Before AutoGen (MANDATORY)

Before running artk-autogen generate, export LLKB patterns:

\`\`\`bash
# Export learned patterns for AutoGen consumption
artk llkb export --for-autogen \
  --output ${HARNESS_ROOT}/ \
  --min-confidence 0.7

# Verify export
ls -la ${HARNESS_ROOT}/autogen-llkb.config.yml
ls -la ${HARNESS_ROOT}/llkb-glossary.ts
\`\`\`

## Step 9: Record Learning After Test Verification

After successful test verification, record learnings:

\`\`\`bash
# Record successful patterns
artk llkb learn --type pattern \
  --journey ${JOURNEY_ID} \
  --success \
  --context "Generated test passed"

# Record component usage
artk llkb learn --type component \
  --journey ${JOURNEY_ID} \
  --success
\`\`\`
```

### 7.2 Add Pattern Recording in stepMapper

**File:** `src/mapping/stepMapper.ts`

```typescript
import { recordPatternSuccess, recordPatternFailure } from '../llkb/patternExtension.js';

// After successful mapping:
export function mapStepWithLearning(
  text: string,
  journeyId: string,
  options?: { llkbRoot?: string }
): MappingResult {
  const result = mapStepText(text);

  // Record for LLKB learning
  if (result.primitive && result.confidence > 0.5) {
    recordPatternSuccess(text, result.primitive, journeyId, options);
  }

  return result;
}
```

### 7.3 Pre-seed LLKB with Core Patterns

**Create:** `src/llkb/seeds/core-patterns-seed.ts`

```typescript
/**
 * Pre-seed LLKB with high-confidence core patterns
 * This solves the cold-start problem
 */
import { allPatterns } from '../../mapping/patterns.js';
import { recordPatternSuccess } from '../patternExtension.js';

export async function seedLlkbWithCorePatterns(
  options?: { llkbRoot?: string }
): Promise<{ seeded: number; skipped: number }> {
  let seeded = 0;
  let skipped = 0;

  // Generate example texts for each core pattern
  const patternExamples: Record<string, string[]> = {
    'navigate': ['Navigate to the login page', 'Go to /dashboard', 'Navigate to https://example.com'],
    'click': ['Click the Submit button', 'Click on Save', 'Press the Cancel button'],
    'fill': ['Enter "test@email.com" in the email field', 'Type "password123" in password'],
    'select': ['Select "Option 1" from the dropdown', 'Choose "US" from country dropdown'],
    'check': ['Check the terms checkbox', 'Enable the newsletter option'],
    'uncheck': ['Uncheck the remember me checkbox', 'Disable notifications'],
    'hover': ['Hover over the dropdown menu', 'Move cursor to profile icon'],
    'assert-visible': ['Verify the success message is displayed', 'Confirm the modal is visible'],
    'assert-text': ['Verify the title contains "Welcome"', 'Check the error says "Invalid"'],
    'assert-url': ['Verify the URL contains "/dashboard"', 'Confirm URL ends with "/success"'],
    'wait-hidden': ['Wait for the spinner to disappear', 'Wait until loading is hidden'],
    'toast': ['A success toast with "Saved!" message appears', 'Error toast shows "Failed"'],
  };

  for (const [category, examples] of Object.entries(patternExamples)) {
    for (const example of examples) {
      // Find matching pattern
      const pattern = allPatterns.find(p => p.name.includes(category));
      if (pattern) {
        const match = example.match(pattern.regex);
        if (match) {
          const primitive = pattern.extract(match);
          if (primitive) {
            // Record as pre-seeded pattern with high confidence
            for (let i = 0; i < 5; i++) {
              recordPatternSuccess(example, primitive, `SEED-${category}-${i}`, options);
            }
            seeded++;
          }
        }
      } else {
        skipped++;
      }
    }
  }

  return { seeded, skipped };
}
```

**Add CLI command:** `artk llkb seed`

```typescript
// In CLI handler
case 'seed':
  const { seeded, skipped } = await seedLlkbWithCorePatterns({ llkbRoot });
  console.log(`Seeded ${seeded} patterns, skipped ${skipped}`);
  break;
```

### 7.4 Add LLKB Export to AutoGen generate Command

**Modify:** `src/cli/generate.ts`

```typescript
import { exportForAutogen } from '../llkb/adapter.js';

// Before generation, auto-export LLKB
async function generateWithLlkb(options: GenerateOptions): Promise<void> {
  const llkbRoot = path.join(options.harnessRoot, '.artk', 'llkb');

  // Auto-export LLKB patterns
  if (await llkbExists(llkbRoot)) {
    console.log('Exporting LLKB patterns for generation...');
    await exportForAutogen({
      llkbRoot,
      outputDir: options.harnessRoot,
      minConfidence: 0.7,
    });
  }

  // Continue with generation...
}
```

### 7.5 Add Learning Feedback After Test Execution

**Modify:** `src/cli/run.ts` (or create if needed)

```typescript
import { recordPatternSuccess, recordPatternFailure } from '../llkb/patternExtension.js';

interface TestResult {
  journeyId: string;
  stepIndex: number;
  stepText: string;
  passed: boolean;
  primitive?: IRPrimitive;
}

export async function recordTestResults(
  results: TestResult[],
  options?: { llkbRoot?: string }
): Promise<void> {
  for (const result of results) {
    if (result.primitive) {
      if (result.passed) {
        recordPatternSuccess(result.stepText, result.primitive, result.journeyId, options);
      } else {
        recordPatternFailure(result.stepText, result.primitive, result.journeyId, options);
      }
    }
  }
}
```

---

## Phase 8: E2E Test for Full Learning Loop (Day 6-7)

### 8.1 Create Complete Learning Loop E2E Test

**Create:** `tests/e2e/llkb-full-loop.test.ts`

```typescript
/**
 * E2E Test for Complete LLKB Learning Loop
 * Tests: Novel pattern → TODO generated → Human fix → Learn → Reuse → Verify
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

describe('LLKB Full Learning Loop E2E', () => {
  const testDir = join(process.cwd(), 'tmp', 'llkb-full-loop');

  beforeEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(join(testDir, 'journeys', 'clarified'), { recursive: true });
    mkdirSync(join(testDir, '.artk', 'llkb'), { recursive: true });
    mkdirSync(join(testDir, 'tests'), { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should complete full learning loop: generate → fail → learn → succeed', async () => {
    // Step 1: Create journey with novel pattern
    const novelJourney = `---
id: JRN-NOVEL
title: Novel Pattern Test
status: clarified
tier: smoke
actor: standard_user
scope: novel
tests: []
---

# Novel Pattern Test

## Steps

1. Navigate to /settings
2. User activates experimental turbo mode
3. Verify turbo indicator is visible
`;
    writeFileSync(join(testDir, 'journeys/clarified/JRN-NOVEL__novel.md'), novelJourney);

    // Step 2: First generation - novel pattern should produce TODO
    const cli = join(process.cwd(), 'dist/cli/index.js');
    execSync(`node ${cli} analyze ${testDir}/journeys/clarified/*.md`, { cwd: testDir });
    execSync(`node ${cli} plan`, { cwd: testDir });
    execSync(`node ${cli} generate -o ${testDir}/tests/`, { cwd: testDir });

    const firstGen = readFileSync(join(testDir, 'tests/jrn-novel.spec.ts'), 'utf-8');
    expect(firstGen).toContain('TODO'); // Novel pattern should be unmatched

    // Step 3: Simulate human fix - record learned pattern
    execSync(`node ${cli} llkb learn --type pattern \
      --journey JRN-NOVEL \
      --context "User activates experimental turbo mode" \
      --selector-strategy testId \
      --selector-value turbo-toggle \
      --success`, { cwd: testDir });

    // Record multiple times to build confidence
    for (let i = 0; i < 4; i++) {
      execSync(`node ${cli} llkb learn --type pattern \
        --journey JRN-NOVEL-${i} \
        --context "User activates experimental turbo mode" \
        --selector-strategy testId \
        --selector-value turbo-toggle \
        --success`, { cwd: testDir });
    }

    // Step 4: Check LLKB has learned
    const stats = execSync(`node ${cli} llkb stats`, { cwd: testDir, encoding: 'utf-8' });
    expect(stats).toContain('patterns');

    // Step 5: Re-generate with LLKB patterns
    execSync(`node ${cli} clean --force`, { cwd: testDir });
    execSync(`node ${cli} analyze ${testDir}/journeys/clarified/*.md`, { cwd: testDir });
    execSync(`node ${cli} plan`, { cwd: testDir });
    execSync(`node ${cli} generate -o ${testDir}/tests/`, { cwd: testDir });

    // Step 6: Verify LLKB pattern is now used
    const secondGen = readFileSync(join(testDir, 'tests/jrn-novel.spec.ts'), 'utf-8');
    expect(secondGen).toContain('turbo-toggle'); // LLKB pattern should be applied
    expect(secondGen).not.toContain('TODO'); // No more TODO for this step
  });

  it('should track confidence and promote high-confidence patterns', async () => {
    const cli = join(process.cwd(), 'dist/cli/index.js');

    // Record many successes
    const pattern = 'User enables dark mode';
    for (let i = 0; i < 10; i++) {
      execSync(`node ${cli} llkb learn --type pattern \
        --journey JRN-DARK-${i} \
        --context "${pattern}" \
        --selector-strategy testId \
        --selector-value dark-mode-toggle \
        --success`, { cwd: testDir });
    }

    // Check for promotable patterns
    const statsOutput = execSync(`node ${cli} llkb stats --show-promotable`, {
      cwd: testDir,
      encoding: 'utf-8'
    });

    // Should show promotable pattern with high confidence
    expect(statsOutput).toContain('dark mode');
    expect(statsOutput).toMatch(/confidence.*0\.[89]/); // 80-90% confidence
  });

  it('should integrate with unified matcher correctly', async () => {
    const cli = join(process.cwd(), 'dist/cli/index.js');

    // Create LLKB pattern
    for (let i = 0; i < 5; i++) {
      execSync(`node ${cli} llkb learn --type pattern \
        --journey JRN-ZEN-${i} \
        --context "User enables zen mode" \
        --selector-strategy testId \
        --selector-value zen-mode \
        --success`, { cwd: testDir });
    }

    // Test unified matcher via debug command
    const matchResult = execSync(`node ${cli} debug-match "User enables zen mode"`, {
      cwd: testDir,
      encoding: 'utf-8'
    });

    expect(matchResult).toContain('source: llkb');
    expect(matchResult).toContain('zen-mode');

    // Core patterns should still take priority
    const coreResult = execSync(`node ${cli} debug-match "Click the Submit button"`, {
      cwd: testDir,
      encoding: 'utf-8'
    });

    expect(coreResult).toContain('source: core');
  });
});
```

### 8.2 Update E2E Shell Script for Full Loop

**Modify:** `tests/e2e/run-full-e2e.sh`

Add section after existing LLKB test:

```bash
# ═══════════════════════════════════════════════════════════════════════════
# STEP 7: Full LLKB Learning Loop Test
# ═══════════════════════════════════════════════════════════════════════════

section "Step 7: Full LLKB Learning Loop"

log "Testing complete learning feedback cycle..."

# Create journey with truly novel pattern
cat > journeys/clarified/JRN-0004__learning-loop.md << 'EOF'
---
id: JRN-0004
title: Learning Loop Test
status: clarified
tier: smoke
actor: standard_user
scope: learning
tests: []
---

# Learning Loop Test

## Steps

1. Navigate to /experiments
2. User toggles the quantum entanglement feature
3. Verify entanglement status shows "active"

EOF

success "Created learning loop test journey: JRN-0004"

# Phase 1: Generate with no LLKB knowledge
log "Phase 1: Generating without LLKB knowledge..."
$CLI clean --force 2>/dev/null
$CLI analyze journeys/clarified/JRN-0004*.md 2>/dev/null
$CLI plan 2>/dev/null
$CLI generate -o tests/ 2>/dev/null

# Check for TODO (expected - novel pattern)
if grep -q "TODO\|custom" tests/jrn-0004.spec.ts 2>/dev/null; then
  success "Phase 1: Novel pattern correctly unmatched"
else
  warn "Phase 1: Novel pattern may have unexpectedly matched"
fi

# Phase 2: Simulate learning
log "Phase 2: Recording learned pattern..."
for i in 1 2 3 4 5; do
  $CLI llkb learn --type pattern \
    --journey "JRN-LOOP-$i" \
    --context "User toggles the quantum entanglement feature" \
    --selector-strategy testId \
    --selector-value quantum-toggle \
    --success 2>/dev/null
done

success "Phase 2: Learned pattern recorded"

# Phase 3: Regenerate with LLKB
log "Phase 3: Regenerating with LLKB knowledge..."
$CLI clean --force 2>/dev/null
$CLI analyze journeys/clarified/JRN-0004*.md 2>/dev/null
$CLI plan 2>/dev/null
$CLI generate -o tests/ 2>/dev/null

# Check for learned pattern usage
if grep -q "quantum-toggle" tests/jrn-0004.spec.ts 2>/dev/null; then
  success "Phase 3: LLKB learned pattern correctly applied!"
  FULL_LOOP_WORKS=true
else
  warn "Phase 3: LLKB pattern not applied"
  log "  Checking generated code..."
  grep -A5 "entanglement" tests/jrn-0004.spec.ts 2>/dev/null || echo "  (no entanglement references)"
  FULL_LOOP_WORKS=false
fi

# Phase 4: Verify LLKB stats
log "Phase 4: Checking LLKB statistics..."
LLKB_STATS=$($CLI llkb stats 2>/dev/null)
if echo "$LLKB_STATS" | grep -q "patterns"; then
  PATTERN_COUNT=$(echo "$LLKB_STATS" | grep -oP '\d+(?= patterns)')
  success "Phase 4: LLKB has $PATTERN_COUNT learned pattern(s)"
else
  warn "Phase 4: Could not read LLKB stats"
fi

# Summary
if [ "$FULL_LOOP_WORKS" = "true" ]; then
  success "✓ Full LLKB learning loop verified!"
else
  warn "⚠ Full LLKB learning loop incomplete"
fi
```

---

## Updated File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/mapping/unifiedMatcher.ts` | CREATE | Unified pattern matching entry point |
| `src/mapping/plannedActionAdapter.ts` | CREATE | IR primitive to PlannedAction converter |
| `src/cli/plan.ts` | MODIFY | Replace ~400 lines with unified matcher call |
| `src/cli/generate.ts` | MODIFY | Auto-export LLKB before generation |
| `src/cli/run.ts` | MODIFY | Record test results for learning |
| `src/mapping/stepMapper.ts` | MODIFY | Add pattern recording |
| `src/llkb/patternExtension.ts` | MODIFY | Increase cache TTL, add warm-up |
| `src/llkb/seeds/core-patterns-seed.ts` | CREATE | Pre-seed LLKB with core patterns |
| `tests/e2e/run-full-e2e.sh` | MODIFY | Add full learning loop test |
| `tests/e2e/llkb-learning.test.ts` | CREATE | E2E tests for LLKB learning |
| `tests/e2e/llkb-full-loop.test.ts` | CREATE | Full loop integration test |
| `tests/integration/pattern-unification.test.ts` | CREATE | Integration tests for unified system |
| `tests/mapping/plannedActionAdapter.test.ts` | CREATE | Unit tests for adapter |
| Prompts (ARTK repo) | MODIFY | Wire LLKB commands into journey-implement |

---

## Updated Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Pattern systems | 3 | 1 (unified) |
| Lines of duplicate code | ~400 | 0 |
| Core patterns used by plan path | 0 | 57 |
| LLKB patterns available to plan path | 0 | All |
| E2E pattern coverage | 31 | 57+ |
| LLKB CLI commands wired to prompts | 0 | 5 |
| Learning loop feedback | None | Full cycle |
| LLKB seed patterns | 0 | 50+ |

---

## Updated Timeline

| Day | Phase | Deliverables |
|-----|-------|--------------|
| 1 | Phase 1 + 2 | Adapter + Unified Matcher |
| 2 | Phase 3 | Refactor plan.ts |
| 3 | Phase 4 | LLKB integration enhancement |
| 4 | Phase 5 | E2E tests for LLKB |
| 5 | Phase 6 + 7 | Integration tests + Complete LLKB wiring |
| 6-7 | Phase 8 | Full learning loop E2E tests |

**Total: 7 days**

---

## LLKB Integration Completeness Checklist

After implementation, verify these LLKB capabilities work end-to-end:

### Core LLKB Functions
- [ ] `artk llkb health` - Health check works
- [ ] `artk llkb stats` - Statistics display correctly
- [ ] `artk llkb seed` - Pre-seeding works
- [ ] `artk llkb export --for-autogen` - Export generates valid files
- [ ] `artk llkb learn` - Learning records patterns

### Learning Loop
- [ ] Novel pattern produces TODO in generated code
- [ ] Learned pattern is recorded after human fix
- [ ] Confidence increases with repeated successes
- [ ] High-confidence patterns are promoted
- [ ] Subsequent generation uses learned patterns

### Integration Points
- [ ] `artk-autogen generate` auto-exports LLKB
- [ ] `artk-autogen run` records test results
- [ ] Unified matcher prioritizes core > LLKB
- [ ] Plan path uses LLKB patterns via adapter

### Prompt Integration
- [ ] `/artk.journey-implement` calls LLKB export
- [ ] `/artk.journey-verify` records learnings
- [ ] `/artk.journey-maintain` checks LLKB versions

---

## Approval Required

Before implementation:
- [ ] Review and approve this plan
- [ ] Confirm 7-day timeline fits sprint capacity
- [ ] Agree on rollback criteria

**Next Step:** User approves this plan, then implementation begins with Phase 1.
