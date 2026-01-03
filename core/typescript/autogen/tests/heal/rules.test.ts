/**
 * Healing Rules Tests
 * @see T057 - Unit test for healing rules (allowed/forbidden)
 */
import { describe, it, expect } from 'vitest';
import {
  DEFAULT_HEALING_RULES,
  DEFAULT_HEALING_CONFIG,
  UNHEALABLE_CATEGORIES,
  isCategoryHealable,
  getApplicableRules,
  evaluateHealing,
  getNextFix,
  isFixAllowed,
  isFixForbidden,
  getHealingRecommendation,
  getPostHealingRecommendation,
  type HealFixType,
} from '../../src/heal/rules.js';
import type { FailureClassification } from '../../src/verify/classifier.js';

// Helper to create classification
function createClassification(
  category: FailureClassification['category'],
  confidence: number = 0.8
): FailureClassification {
  return {
    category,
    confidence,
    explanation: 'Test classification',
    suggestion: 'Test suggestion',
    isTestIssue: true,
    matchedKeywords: [],
  };
}

describe('DEFAULT_HEALING_RULES', () => {
  it('should have rules for each healable category', () => {
    expect(DEFAULT_HEALING_RULES.length).toBeGreaterThan(0);
    expect(DEFAULT_HEALING_RULES.some((r) => r.fixType === 'selector-refine')).toBe(true);
    expect(DEFAULT_HEALING_RULES.some((r) => r.fixType === 'navigation-wait')).toBe(true);
    expect(DEFAULT_HEALING_RULES.some((r) => r.fixType === 'missing-await')).toBe(true);
  });

  it('should have priority ordering', () => {
    const sortedByPriority = [...DEFAULT_HEALING_RULES].sort((a, b) => a.priority - b.priority);
    expect(sortedByPriority[0].priority).toBe(1);
  });
});

describe('DEFAULT_HEALING_CONFIG', () => {
  it('should have enabled true by default', () => {
    expect(DEFAULT_HEALING_CONFIG.enabled).toBe(true);
  });

  it('should have maxAttempts', () => {
    expect(DEFAULT_HEALING_CONFIG.maxAttempts).toBe(3);
  });

  it('should have allowed fixes', () => {
    expect(DEFAULT_HEALING_CONFIG.allowedFixes).toContain('selector-refine');
    expect(DEFAULT_HEALING_CONFIG.allowedFixes).toContain('navigation-wait');
  });

  it('should have forbidden fixes', () => {
    expect(DEFAULT_HEALING_CONFIG.forbiddenFixes).toContain('add-sleep');
    expect(DEFAULT_HEALING_CONFIG.forbiddenFixes).toContain('remove-assertion');
    expect(DEFAULT_HEALING_CONFIG.forbiddenFixes).toContain('weaken-assertion');
  });
});

describe('UNHEALABLE_CATEGORIES', () => {
  it('should include auth', () => {
    expect(UNHEALABLE_CATEGORIES).toContain('auth');
  });

  it('should include env', () => {
    expect(UNHEALABLE_CATEGORIES).toContain('env');
  });

  it('should include unknown', () => {
    expect(UNHEALABLE_CATEGORIES).toContain('unknown');
  });
});

describe('isCategoryHealable', () => {
  it('should return true for selector', () => {
    expect(isCategoryHealable('selector')).toBe(true);
  });

  it('should return true for timing', () => {
    expect(isCategoryHealable('timing')).toBe(true);
  });

  it('should return true for navigation', () => {
    expect(isCategoryHealable('navigation')).toBe(true);
  });

  it('should return false for auth', () => {
    expect(isCategoryHealable('auth')).toBe(false);
  });

  it('should return false for env', () => {
    expect(isCategoryHealable('env')).toBe(false);
  });

  it('should return false for unknown', () => {
    expect(isCategoryHealable('unknown')).toBe(false);
  });
});

describe('getApplicableRules', () => {
  it('should return rules for selector failures', () => {
    const classification = createClassification('selector');
    const rules = getApplicableRules(classification);

    expect(rules.length).toBeGreaterThan(0);
    expect(rules.some((r) => r.fixType === 'selector-refine')).toBe(true);
  });

  it('should return rules for timing failures', () => {
    const classification = createClassification('timing');
    const rules = getApplicableRules(classification);

    expect(rules.length).toBeGreaterThan(0);
    expect(rules.some((r) => r.fixType === 'navigation-wait' || r.fixType === 'web-first-assertion')).toBe(true);
  });

  it('should return empty for unhealable categories', () => {
    const classification = createClassification('auth');
    const rules = getApplicableRules(classification);

    expect(rules.length).toBe(0);
  });

  it('should respect disabled config', () => {
    const classification = createClassification('selector');
    const rules = getApplicableRules(classification, { ...DEFAULT_HEALING_CONFIG, enabled: false });

    expect(rules.length).toBe(0);
  });

  it('should filter by allowed fixes', () => {
    const classification = createClassification('selector');
    const rules = getApplicableRules(classification, {
      ...DEFAULT_HEALING_CONFIG,
      allowedFixes: ['add-exact'],
    });

    expect(rules.every((r) => r.fixType === 'add-exact')).toBe(true);
  });
});

describe('evaluateHealing', () => {
  it('should return canHeal true for selector failures', () => {
    const classification = createClassification('selector');
    const result = evaluateHealing(classification);

    expect(result.canHeal).toBe(true);
    expect(result.applicableFixes.length).toBeGreaterThan(0);
  });

  it('should return canHeal false for auth failures', () => {
    const classification = createClassification('auth');
    const result = evaluateHealing(classification);

    expect(result.canHeal).toBe(false);
    expect(result.reason).toContain('auth');
  });

  it('should return canHeal false when disabled', () => {
    const classification = createClassification('selector');
    const result = evaluateHealing(classification, { ...DEFAULT_HEALING_CONFIG, enabled: false });

    expect(result.canHeal).toBe(false);
    expect(result.reason).toContain('disabled');
  });
});

describe('getNextFix', () => {
  it('should return first applicable fix', () => {
    const classification = createClassification('selector');
    const fix = getNextFix(classification, []);

    expect(fix).not.toBeNull();
  });

  it('should skip already attempted fixes', () => {
    const classification = createClassification('selector');
    const attemptedFixes: HealFixType[] = ['missing-await'];
    const fix = getNextFix(classification, attemptedFixes);

    expect(fix).not.toBe('missing-await');
  });

  it('should return null when all fixes exhausted', () => {
    const classification = createClassification('selector');
    const attemptedFixes: HealFixType[] = [
      'selector-refine',
      'add-exact',
      'missing-await',
      'navigation-wait',
      'web-first-assertion',
      'timeout-increase',
    ];
    const fix = getNextFix(classification, attemptedFixes);

    expect(fix).toBeNull();
  });

  it('should return null for unhealable category', () => {
    const classification = createClassification('auth');
    const fix = getNextFix(classification, []);

    expect(fix).toBeNull();
  });
});

describe('isFixAllowed', () => {
  it('should return true for allowed fixes', () => {
    expect(isFixAllowed('selector-refine')).toBe(true);
    expect(isFixAllowed('navigation-wait')).toBe(true);
    expect(isFixAllowed('missing-await')).toBe(true);
  });

  it('should return false for non-allowed fixes', () => {
    expect(isFixAllowed('timeout-increase')).toBe(false);
  });

  it('should return false when disabled', () => {
    expect(isFixAllowed('selector-refine', { ...DEFAULT_HEALING_CONFIG, enabled: false })).toBe(false);
  });
});

describe('isFixForbidden', () => {
  it('should return true for forbidden fixes', () => {
    expect(isFixForbidden('add-sleep')).toBe(true);
    expect(isFixForbidden('remove-assertion')).toBe(true);
    expect(isFixForbidden('weaken-assertion')).toBe(true);
    expect(isFixForbidden('force-click')).toBe(true);
  });

  it('should return false for allowed fixes', () => {
    expect(isFixForbidden('selector-refine')).toBe(false);
    expect(isFixForbidden('navigation-wait')).toBe(false);
  });
});

describe('getHealingRecommendation', () => {
  it('should return recommendation for selector failures', () => {
    const classification = createClassification('selector');
    const rec = getHealingRecommendation(classification);

    expect(rec).toContain('selector');
  });

  it('should return recommendation for timing failures', () => {
    const classification = createClassification('timing');
    const rec = getHealingRecommendation(classification);

    expect(rec).toContain('wait');
  });

  it('should return recommendation for auth failures', () => {
    const classification = createClassification('auth');
    const rec = getHealingRecommendation(classification);

    expect(rec).toContain('authentication');
  });
});

describe('getPostHealingRecommendation', () => {
  it('should include attempt count', () => {
    const classification = createClassification('selector');
    const rec = getPostHealingRecommendation(classification, 3);

    expect(rec).toContain('3');
    expect(rec).toContain('exhausted');
  });

  it('should suggest quarantine for timing', () => {
    const classification = createClassification('timing');
    const rec = getPostHealingRecommendation(classification, 3);

    expect(rec.toLowerCase()).toContain('quarantin');
  });
});
