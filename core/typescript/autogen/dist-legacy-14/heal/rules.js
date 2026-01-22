"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UNHEALABLE_CATEGORIES = exports.DEFAULT_HEALING_CONFIG = exports.DEFAULT_HEALING_RULES = void 0;
exports.isCategoryHealable = isCategoryHealable;
exports.getApplicableRules = getApplicableRules;
exports.evaluateHealing = evaluateHealing;
exports.getNextFix = getNextFix;
exports.isFixAllowed = isFixAllowed;
exports.isFixForbidden = isFixForbidden;
exports.getHealingRecommendation = getHealingRecommendation;
exports.getPostHealingRecommendation = getPostHealingRecommendation;
/**
 * Default healing rules
 */
exports.DEFAULT_HEALING_RULES = [
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
exports.DEFAULT_HEALING_CONFIG = {
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
exports.UNHEALABLE_CATEGORIES = [
    'auth', // Requires credential/session fix
    'env', // Requires environment fix
    'unknown', // Cannot determine appropriate fix
];
/**
 * Check if a failure category is healable
 */
function isCategoryHealable(category) {
    return !exports.UNHEALABLE_CATEGORIES.includes(category);
}
/**
 * Get applicable healing rules for a failure classification
 */
function getApplicableRules(classification, config = exports.DEFAULT_HEALING_CONFIG) {
    if (!config.enabled) {
        return [];
    }
    if (!isCategoryHealable(classification.category)) {
        return [];
    }
    return exports.DEFAULT_HEALING_RULES
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
function evaluateHealing(classification, config = exports.DEFAULT_HEALING_CONFIG) {
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
function getNextFix(classification, attemptedFixes, config = exports.DEFAULT_HEALING_CONFIG) {
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
function isFixAllowed(fixType, config = exports.DEFAULT_HEALING_CONFIG) {
    return config.enabled && config.allowedFixes.includes(fixType);
}
/**
 * Validate that a fix is not forbidden
 */
function isFixForbidden(fixType) {
    const forbidden = [
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
function getHealingRecommendation(classification) {
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
function getPostHealingRecommendation(classification, attemptCount) {
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
//# sourceMappingURL=rules.js.map