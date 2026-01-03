/**
 * Healing Rules - Define allowed and forbidden healing operations
 * @see T061 - Define healing rules (allowed/forbidden fixes) per detailed spec Section 16
 */
import type { FailureCategory, FailureClassification } from '../verify/classifier.js';
/**
 * Types of healing fixes
 */
export type HealFixType = 'selector-refine' | 'add-exact' | 'missing-await' | 'navigation-wait' | 'timeout-increase' | 'web-first-assertion';
/**
 * Forbidden fix types that must never be applied
 */
export type ForbiddenFixType = 'add-sleep' | 'remove-assertion' | 'weaken-assertion' | 'force-click' | 'bypass-auth';
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
export declare const DEFAULT_HEALING_RULES: HealingRule[];
/**
 * Default healing configuration
 */
export declare const DEFAULT_HEALING_CONFIG: HealingConfig;
/**
 * Categories that cannot be healed automatically
 */
export declare const UNHEALABLE_CATEGORIES: FailureCategory[];
/**
 * Check if a failure category is healable
 */
export declare function isCategoryHealable(category: FailureCategory): boolean;
/**
 * Get applicable healing rules for a failure classification
 */
export declare function getApplicableRules(classification: FailureClassification, config?: HealingConfig): HealingRule[];
/**
 * Evaluate healing possibilities for a failure
 */
export declare function evaluateHealing(classification: FailureClassification, config?: HealingConfig): HealingRuleResult;
/**
 * Get the next fix to try for a failure
 */
export declare function getNextFix(classification: FailureClassification, attemptedFixes: HealFixType[], config?: HealingConfig): HealFixType | null;
/**
 * Validate that a proposed fix is allowed
 */
export declare function isFixAllowed(fixType: HealFixType, config?: HealingConfig): boolean;
/**
 * Validate that a fix is not forbidden
 */
export declare function isFixForbidden(fixType: string): fixType is ForbiddenFixType;
/**
 * Get healing recommendation based on failure
 */
export declare function getHealingRecommendation(classification: FailureClassification): string;
/**
 * Get next steps after healing exhausted
 */
export declare function getPostHealingRecommendation(classification: FailureClassification, attemptCount: number): string;
//# sourceMappingURL=rules.d.ts.map