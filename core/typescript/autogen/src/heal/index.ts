/**
 * Healing Module Exports
 * @see Phase 6 - User Story 4: Developer Heals Failing Tests Safely
 */

// Rules
export {
  type HealFixType,
  type ForbiddenFixType,
  type HealingRule,
  type HealingConfig,
  type HealingRuleResult,
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
} from './rules.js';

// Logger
export {
  type HealingAttempt,
  type HealingLog,
  type HealingSummary,
  HealingLogger,
  loadHealingLog,
  formatHealingLog,
  createHealingReport,
  aggregateHealingLogs,
} from './logger.js';

// Loop Controller
export {
  type HealingLoopOptions,
  type HealingLoopResult,
  runHealingLoop,
  previewHealingFixes,
  wouldFixApply,
} from './loop.js';

// Fix Strategies
export {
  type SelectorFixContext,
  type SelectorFixResult,
  type ARIANodeInfo,
  extractCSSSelector,
  containsCSSSelector,
  inferRoleFromSelector,
  extractNameFromSelector,
  generateRoleLocator,
  generateLabelLocator,
  generateTextLocator,
  generateTestIdLocator,
  applySelectorFix,
  addExactToLocator,
} from './fixes/selector.js';

export {
  type NavigationFixContext,
  type NavigationFixResult,
  hasNavigationWait,
  extractUrlFromError,
  extractUrlFromGoto,
  inferUrlPattern,
  generateWaitForURL,
  generateToHaveURL,
  insertNavigationWait,
  applyNavigationFix,
  fixMissingGotoAwait,
  addNavigationWaitAfterClick,
} from './fixes/navigation.js';

export {
  type TimingFixContext,
  type TimingFixResult,
  extractTimeoutFromError,
  suggestTimeoutIncrease,
  fixMissingAwait,
  convertToWebFirstAssertion,
  addTimeout,
  applyTimingFix,
  wrapWithExpectToPass,
  wrapWithExpectPoll,
} from './fixes/timing.js';

export {
  type DataFixContext,
  type DataFixResult,
  generateRunId,
  hasDataIsolation,
  addRunIdVariable,
  namespaceEmail,
  namespaceName,
  replaceHardcodedEmail,
  replaceHardcodedTestData,
  applyDataFix,
  addCleanupHook,
  extractTestDataPatterns,
} from './fixes/data.js';
