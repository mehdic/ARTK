/**
 * Healing Rules - Define allowed and forbidden healing operations
 * @see T061 - Define healing rules (allowed/forbidden fixes) per detailed spec Section 16
 */
import type { FailureCategory, FailureClassification } from '../verify/classifier.js';

/**
 * Types of healing fixes
 */
export type HealFixType =
  | 'selector-refine'      // Replace CSS with role/label/testid
  | 'add-exact'            // Add exact: true to locator
  | 'missing-await'        // Add missing await
  | 'navigation-wait'      // Add waitForURL/toHaveURL
  | 'timeout-increase'     // Increase timeout (bounded)
  | 'web-first-assertion'; // Convert to web-first assertion

/**
 * Forbidden fix types that must never be applied
 */
export type ForbiddenFixType =
  | 'add-sleep'            // Never add waitForTimeout
  | 'remove-assertion'     // Never remove assertions
  | 'weaken-assertion'     // Never change toBe to toContain
  | 'force-click'          // Never add force: true
  | 'bypass-auth';         // Never skip authentication

/**
 * Healing rule definition
 */
export interface HealingRule {
  /** Fix type identifier */
  fixType: HealFixType;
  /** Categories this fix applies to */
  appliesTo: FailureCategory[];
  /** Priority (lower = try first) */
  priority: number;
  /** Human-readable description */
  description: string;
  /** Whether enabled by default */
  enabledByDefault: boolean;
}

/**
 * Healing configuration
 */
export interface HealingConfig {
  /** Whether healing is enabled */
  enabled: boolean;
  /** Maximum healing attempts */
  maxAttempts: number;
  /** Allowed fix types */
  allowedFixes: HealFixType[];
  /** Forbidden fix types (always blocked) */
  forbiddenFixes: ForbiddenFixType[];
  /** Timeout increase limit in ms */
  maxTimeoutIncrease: number;
}

/**
 * Healing rule result
 */
export interface HealingRuleResult {
  /** Whether healing is allowed for this failure */
  canHeal: boolean;
  /** Applicable fix types in priority order */
  applicableFixes: HealFixType[];
  /** Reason if healing not allowed */
  reason?: string;
}

/**
 * Default healing rules
 */
export const DEFAULT_HEALING_RULES: HealingRule[] = [
  {
    fixType: 'missing-await',
    appliesTo: ['selector', 'timing', 'script'],
    priority: 1,
    description: 'Add missing await to async operations',
    enabledByDefault: true,
  },
  {
    fixType: 'selector-refine',
    appliesTo: ['selector'],
    priority: 2,
    description: 'Replace CSS selector with role/label/testid',
    enabledByDefault: true,
  },
  {
    fixType: 'add-exact',
    appliesTo: ['selector'],
    priority: 3,
    description: 'Add exact: true to resolve ambiguous locators',
    enabledByDefault: true,
  },
  {
    fixType: 'navigation-wait',
    appliesTo: ['navigation', 'timing'],
    priority: 4,
    description: 'Add waitForURL or toHaveURL assertion',
    enabledByDefault: true,
  },
  {
    fixType: 'web-first-assertion',
    appliesTo: ['timing', 'data'],
    priority: 5,
    description: 'Convert to auto-retrying web-first assertion',
    enabledByDefault: true,
  },
  {
    fixType: 'timeout-increase',
    appliesTo: ['timing'],
    priority: 6,
    description: 'Increase operation timeout (bounded)',
    enabledByDefault: false, // Disabled by default as it can mask real issues
  },
];

/**
 * Default healing configuration
 */
export const DEFAULT_HEALING_CONFIG: HealingConfig = {
  enabled: true,
  maxAttempts: 3,
  allowedFixes: [
    'selector-refine',
    'add-exact',
    'missing-await',
    'navigation-wait',
    'web-first-assertion',
  ],
  forbiddenFixes: [
    'add-sleep',
    'remove-assertion',
    'weaken-assertion',
    'force-click',
    'bypass-auth',
  ],
  maxTimeoutIncrease: 30000, // Max 30 seconds
};

/**
 * Categories that cannot be healed automatically
 */
export const UNHEALABLE_CATEGORIES: FailureCategory[] = [
  'auth',     // Requires credential/session fix
  'env',      // Requires environment fix
  'unknown',  // Cannot determine appropriate fix
];

/**
 * Check if a failure category is healable
 */
export function isCategoryHealable(category: FailureCategory): boolean {
  return !UNHEALABLE_CATEGORIES.includes(category);
}

/**
 * Get applicable healing rules for a failure classification
 */
export function getApplicableRules(
  classification: FailureClassification,
  config: HealingConfig = DEFAULT_HEALING_CONFIG
): HealingRule[] {
  if (!config.enabled) {
    return [];
  }

  if (!isCategoryHealable(classification.category)) {
    return [];
  }

  return DEFAULT_HEALING_RULES
    .filter((rule) => {
      // Must apply to this failure category
      if (!rule.appliesTo.includes(classification.category)) {
        return false;
      }
      // Must be in allowed list
      if (!config.allowedFixes.includes(rule.fixType)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => a.priority - b.priority);
}

/**
 * Evaluate healing possibilities for a failure
 */
export function evaluateHealing(
  classification: FailureClassification,
  config: HealingConfig = DEFAULT_HEALING_CONFIG
): HealingRuleResult {
  if (!config.enabled) {
    return {
      canHeal: false,
      applicableFixes: [],
      reason: 'Healing is disabled',
    };
  }

  if (!isCategoryHealable(classification.category)) {
    return {
      canHeal: false,
      applicableFixes: [],
      reason: `Category '${classification.category}' cannot be healed automatically`,
    };
  }

  const applicableRules = getApplicableRules(classification, config);

  if (applicableRules.length === 0) {
    return {
      canHeal: false,
      applicableFixes: [],
      reason: 'No applicable healing rules for this failure',
    };
  }

  return {
    canHeal: true,
    applicableFixes: applicableRules.map((r) => r.fixType),
  };
}

/**
 * Get the next fix to try for a failure
 */
export function getNextFix(
  classification: FailureClassification,
  attemptedFixes: HealFixType[],
  config: HealingConfig = DEFAULT_HEALING_CONFIG
): HealFixType | null {
  const evaluation = evaluateHealing(classification, config);

  if (!evaluation.canHeal) {
    return null;
  }

  // Find first fix that hasn't been tried
  for (const fix of evaluation.applicableFixes) {
    if (!attemptedFixes.includes(fix)) {
      return fix;
    }
  }

  return null; // All fixes exhausted
}

/**
 * Validate that a proposed fix is allowed
 */
export function isFixAllowed(
  fixType: HealFixType,
  config: HealingConfig = DEFAULT_HEALING_CONFIG
): boolean {
  return config.enabled && config.allowedFixes.includes(fixType);
}

/**
 * Validate that a fix is not forbidden
 */
export function isFixForbidden(
  fixType: string
): fixType is ForbiddenFixType {
  const forbidden: string[] = [
    'add-sleep',
    'remove-assertion',
    'weaken-assertion',
    'force-click',
    'bypass-auth',
  ];
  return forbidden.includes(fixType);
}

/**
 * Get healing recommendation based on failure
 */
export function getHealingRecommendation(
  classification: FailureClassification
): string {
  switch (classification.category) {
    case 'selector':
      return 'Refine selector to use role, label, or testid locator strategy';
    case 'timing':
      return 'Add explicit wait for expected state or use web-first assertion';
    case 'navigation':
      return 'Add waitForURL or toHaveURL assertion after navigation';
    case 'data':
      return 'Verify test data and consider using expect.poll for dynamic values';
    case 'auth':
      return 'Check authentication state; may need to refresh session';
    case 'env':
      return 'Verify environment connectivity and application availability';
    case 'script':
      return 'Fix the JavaScript/TypeScript error in the test code';
    default:
      return 'Review error details manually to determine appropriate fix';
  }
}

/**
 * Get next steps after healing exhausted
 */
export function getPostHealingRecommendation(
  classification: FailureClassification,
  attemptCount: number
): string {
  const baseMsg = `Healing exhausted after ${attemptCount} attempts.`;

  switch (classification.category) {
    case 'selector':
      return `${baseMsg} Consider adding data-testid to the target element or quarantining the test.`;
    case 'timing':
      return `${baseMsg} The application may have a genuine performance issue. Consider quarantining.`;
    case 'navigation':
      return `${baseMsg} The navigation flow may have changed. Review Journey steps.`;
    default:
      return `${baseMsg} Consider quarantining the test and filing a bug report.`;
  }
}
