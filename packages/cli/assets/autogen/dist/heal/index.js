/**
 * Healing Module Exports
 * @see Phase 6 - User Story 4: Developer Heals Failing Tests Safely
 */
// Rules
export { DEFAULT_HEALING_RULES, DEFAULT_HEALING_CONFIG, UNHEALABLE_CATEGORIES, isCategoryHealable, getApplicableRules, evaluateHealing, getNextFix, isFixAllowed, isFixForbidden, getHealingRecommendation, getPostHealingRecommendation, } from './rules.js';
// Logger
export { HealingLogger, loadHealingLog, formatHealingLog, createHealingReport, aggregateHealingLogs, } from './logger.js';
// Loop Controller
export { runHealingLoop, previewHealingFixes, wouldFixApply, } from './loop.js';
// Fix Strategies
export { extractCSSSelector, containsCSSSelector, inferRoleFromSelector, extractNameFromSelector, generateRoleLocator, generateLabelLocator, generateTextLocator, generateTestIdLocator, applySelectorFix, addExactToLocator, } from './fixes/selector.js';
export { hasNavigationWait, extractUrlFromError, extractUrlFromGoto, inferUrlPattern, generateWaitForURL, generateToHaveURL, insertNavigationWait, applyNavigationFix, fixMissingGotoAwait, addNavigationWaitAfterClick, } from './fixes/navigation.js';
export { extractTimeoutFromError, suggestTimeoutIncrease, fixMissingAwait, convertToWebFirstAssertion, addTimeout, applyTimingFix, wrapWithExpectToPass, wrapWithExpectPoll, } from './fixes/timing.js';
export { generateRunId, hasDataIsolation, addRunIdVariable, namespaceEmail, namespaceName, replaceHardcodedEmail, replaceHardcodedTestData, applyDataFix, addCleanupHook, extractTestDataPatterns, } from './fixes/data.js';
//# sourceMappingURL=index.js.map