import { H as FailureCategory, I as FailureClassification, V as VerifySummary } from '../summary-7GlyMXkF.js';

/**
 * Healing Rules - Define allowed and forbidden healing operations
 * @see T061 - Define healing rules (allowed/forbidden fixes) per detailed spec Section 16
 */

/**
 * Types of healing fixes
 */
type HealFixType = 'selector-refine' | 'add-exact' | 'missing-await' | 'navigation-wait' | 'timeout-increase' | 'web-first-assertion';
/**
 * Forbidden fix types that must never be applied
 */
type ForbiddenFixType = 'add-sleep' | 'remove-assertion' | 'weaken-assertion' | 'force-click' | 'bypass-auth';
/**
 * Healing rule definition
 */
interface HealingRule {
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
interface HealingConfig {
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
interface HealingRuleResult {
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
declare const DEFAULT_HEALING_RULES: HealingRule[];
/**
 * Default healing configuration
 */
declare const DEFAULT_HEALING_CONFIG: HealingConfig;
/**
 * Categories that cannot be healed automatically
 */
declare const UNHEALABLE_CATEGORIES: FailureCategory[];
/**
 * Check if a failure category is healable
 */
declare function isCategoryHealable(category: FailureCategory): boolean;
/**
 * Get applicable healing rules for a failure classification
 */
declare function getApplicableRules(classification: FailureClassification, config?: HealingConfig): HealingRule[];
/**
 * Evaluate healing possibilities for a failure
 */
declare function evaluateHealing(classification: FailureClassification, config?: HealingConfig): HealingRuleResult;
/**
 * Get the next fix to try for a failure
 */
declare function getNextFix(classification: FailureClassification, attemptedFixes: HealFixType[], config?: HealingConfig): HealFixType | null;
/**
 * Validate that a proposed fix is allowed
 */
declare function isFixAllowed(fixType: HealFixType, config?: HealingConfig): boolean;
/**
 * Validate that a fix is not forbidden
 */
declare function isFixForbidden(fixType: string): fixType is ForbiddenFixType;
/**
 * Get healing recommendation based on failure
 */
declare function getHealingRecommendation(classification: FailureClassification): string;
/**
 * Get next steps after healing exhausted
 */
declare function getPostHealingRecommendation(classification: FailureClassification, attemptCount: number): string;

/**
 * Single healing attempt record
 */
interface HealingAttempt {
    /** Attempt number (1-based) */
    attempt: number;
    /** Timestamp of the attempt */
    timestamp: string;
    /** Type of failure being healed */
    failureType: FailureCategory;
    /** Fix type applied */
    fixType: HealFixType;
    /** File that was modified */
    file: string;
    /** Diff or description of the change */
    change: string;
    /** Evidence files (traces, screenshots) */
    evidence: string[];
    /** Result of the attempt */
    result: 'pass' | 'fail' | 'error';
    /** Error message if failed */
    errorMessage?: string;
    /** Duration in ms */
    duration: number;
}
/**
 * Complete healing log for a journey
 */
interface HealingLog {
    /** Journey ID */
    journeyId: string;
    /** Session start time */
    sessionStart: string;
    /** Session end time */
    sessionEnd?: string;
    /** Maximum attempts allowed */
    maxAttempts: number;
    /** Final status */
    status: 'in_progress' | 'healed' | 'failed' | 'exhausted';
    /** All healing attempts */
    attempts: HealingAttempt[];
    /** Summary statistics */
    summary?: HealingSummary;
}
/**
 * Summary statistics
 */
interface HealingSummary {
    /** Total attempts made */
    totalAttempts: number;
    /** Successful fixes */
    successfulFixes: number;
    /** Failed attempts */
    failedAttempts: number;
    /** Total healing duration in ms */
    totalDuration: number;
    /** Fix types attempted */
    fixTypesAttempted: HealFixType[];
    /** Final recommendation if not healed */
    recommendation?: string;
}
/**
 * Healing logger class
 */
declare class HealingLogger {
    private log;
    private outputPath;
    constructor(journeyId: string, outputDir: string, maxAttempts?: number);
    /**
     * Log a healing attempt
     */
    logAttempt(attempt: Omit<HealingAttempt, 'timestamp'>): void;
    /**
     * Mark healing as complete (success)
     */
    markHealed(): void;
    /**
     * Mark healing as failed (gave up)
     */
    markFailed(recommendation?: string): void;
    /**
     * Mark healing as exhausted (all attempts used)
     */
    markExhausted(recommendation?: string): void;
    /**
     * Get current log
     */
    getLog(): HealingLog;
    /**
     * Get last attempt
     */
    getLastAttempt(): HealingAttempt | null;
    /**
     * Get attempt count
     */
    getAttemptCount(): number;
    /**
     * Check if max attempts reached
     */
    isMaxAttemptsReached(): boolean;
    /**
     * Calculate summary statistics
     */
    private calculateSummary;
    /**
     * Save log to file
     */
    private save;
    /**
     * Get output path
     */
    getOutputPath(): string;
}
/**
 * Load existing healing log
 */
declare function loadHealingLog(filePath: string): HealingLog | null;
/**
 * Format healing log for display
 */
declare function formatHealingLog(log: HealingLog): string;
/**
 * Create healing report summary
 */
declare function createHealingReport(log: HealingLog): {
    success: boolean;
    attemptCount: number;
    fixApplied?: HealFixType;
    recommendation?: string;
};
/**
 * Aggregate healing logs from multiple journeys
 */
declare function aggregateHealingLogs(logs: HealingLog[]): {
    totalJourneys: number;
    healed: number;
    failed: number;
    exhausted: number;
    totalAttempts: number;
    mostCommonFixes: Array<{
        fix: HealFixType;
        count: number;
    }>;
    mostCommonFailures: Array<{
        failure: FailureCategory;
        count: number;
    }>;
};

/**
 * Healing loop options
 */
interface HealingLoopOptions {
    /** Journey ID */
    journeyId: string;
    /** Path to test file */
    testFile: string;
    /** Output directory for logs */
    outputDir: string;
    /** Healing configuration */
    config?: HealingConfig;
    /** Function to verify the test */
    verifyFn: () => Promise<VerifySummary>;
    /** Optional ARIA info for selector fixes */
    ariaInfo?: Record<string, unknown>;
}
/**
 * Healing loop result
 */
interface HealingLoopResult {
    /** Whether healing succeeded */
    success: boolean;
    /** Final status */
    status: 'healed' | 'failed' | 'exhausted' | 'not_healable';
    /** Number of attempts made */
    attempts: number;
    /** Fix that worked (if any) */
    appliedFix?: HealFixType;
    /** Path to heal log */
    logPath: string;
    /** Recommendation if not healed */
    recommendation?: string;
    /** Modified code (if any changes) */
    modifiedCode?: string;
}
/**
 * Run the bounded healing loop
 */
declare function runHealingLoop(options: HealingLoopOptions): Promise<HealingLoopResult>;
/**
 * Dry run healing to preview fixes without applying
 */
declare function previewHealingFixes(code: string, classification: FailureClassification, config?: HealingConfig): Array<{
    fixType: HealFixType;
    preview: string;
    confidence: number;
}>;
/**
 * Check if a specific fix type would apply to code
 */
declare function wouldFixApply(code: string, fixType: HealFixType, classification: FailureClassification): boolean;

/**
 * Selector Fix Strategy - Refine CSS selectors to role/label/testid
 * @see T062 - Implement selector refinement fix (CSS → role/label/testid)
 */
/**
 * Selector fix context
 */
interface SelectorFixContext {
    /** Original code containing the selector */
    code: string;
    /** Line number where selector appears */
    lineNumber: number;
    /** The failing selector expression */
    selector: string;
    /** Error message from Playwright */
    errorMessage: string;
    /** Available ARIA information (if captured) */
    ariaInfo?: ARIANodeInfo;
}
/**
 * ARIA node information for selector inference
 */
interface ARIANodeInfo {
    role?: string;
    name?: string;
    level?: number;
    hasTestId?: boolean;
    testId?: string;
    label?: string;
    placeholder?: string;
}
/**
 * Selector fix result
 */
interface SelectorFixResult {
    /** Whether a fix was applied */
    applied: boolean;
    /** The modified code */
    code: string;
    /** Description of the fix */
    description: string;
    /** The new locator expression */
    newLocator?: string;
    /** Confidence in the fix (0-1) */
    confidence: number;
}
/**
 * Extract CSS selector from code
 */
declare function extractCSSSelector(code: string): string | null;
/**
 * Check if code contains a CSS selector
 */
declare function containsCSSSelector(code: string): boolean;
/**
 * Infer role from CSS selector class/id names
 */
declare function inferRoleFromSelector(selector: string): {
    role: string;
    name?: string;
} | null;
/**
 * Extract potential name from selector
 */
declare function extractNameFromSelector(selector: string): string | null;
/**
 * Generate role-based locator from inferred information
 */
declare function generateRoleLocator(role: string, name?: string, options?: {
    exact?: boolean;
    level?: number;
}): string;
/**
 * Generate label-based locator
 */
declare function generateLabelLocator(label: string, exact?: boolean): string;
/**
 * Generate text-based locator
 */
declare function generateTextLocator(text: string, exact?: boolean): string;
/**
 * Generate testid-based locator
 */
declare function generateTestIdLocator(testId: string): string;
/**
 * Apply selector fix to code
 */
declare function applySelectorFix(context: SelectorFixContext): SelectorFixResult;
/**
 * Add exact: true to existing locator
 */
declare function addExactToLocator(code: string): SelectorFixResult;

/**
 * Navigation Wait Fix - Add waitForURL/toHaveURL assertions
 * @see T063 - Implement navigation wait fix
 */
/**
 * Navigation fix context
 */
interface NavigationFixContext {
    /** Original code */
    code: string;
    /** Line number where navigation issue occurs */
    lineNumber: number;
    /** Expected URL pattern (if known) */
    expectedUrl?: string;
    /** Error message from Playwright */
    errorMessage: string;
}
/**
 * Navigation fix result
 */
interface NavigationFixResult {
    /** Whether a fix was applied */
    applied: boolean;
    /** The modified code */
    code: string;
    /** Description of the fix */
    description: string;
    /** Confidence in the fix (0-1) */
    confidence: number;
}
/**
 * Check if code already has navigation wait
 */
declare function hasNavigationWait(code: string): boolean;
/**
 * Extract URL pattern from error message
 */
declare function extractUrlFromError(errorMessage: string): string | null;
/**
 * Extract URL from goto call
 */
declare function extractUrlFromGoto(code: string): string | null;
/**
 * Infer expected URL pattern from navigation action
 */
declare function inferUrlPattern(code: string, errorMessage: string): string | null;
/**
 * Generate waitForURL statement
 */
declare function generateWaitForURL(urlPattern: string, options?: {
    timeout?: number;
}): string;
/**
 * Generate toHaveURL assertion
 */
declare function generateToHaveURL(urlPattern: string): string;
/**
 * Insert navigation wait after an action
 */
declare function insertNavigationWait(code: string, lineNumber: number, urlPattern: string): NavigationFixResult;
/**
 * Apply navigation wait fix to code
 */
declare function applyNavigationFix(context: NavigationFixContext): NavigationFixResult;
/**
 * Fix missing await on goto
 */
declare function fixMissingGotoAwait(code: string): NavigationFixResult;
/**
 * Add navigation wait after click that likely navigates
 */
declare function addNavigationWaitAfterClick(code: string, clickLineNumber: number, expectedUrl?: string): NavigationFixResult;

/**
 * Timing/Async Fix - Handle timeout and async issues
 * @see T064 - Implement timing/async fix
 */
/**
 * Timing fix context
 */
interface TimingFixContext {
    /** Original code */
    code: string;
    /** Line number where timing issue occurs */
    lineNumber: number;
    /** Current timeout (if known) */
    currentTimeout?: number;
    /** Error message from Playwright */
    errorMessage: string;
}
/**
 * Timing fix result
 */
interface TimingFixResult {
    /** Whether a fix was applied */
    applied: boolean;
    /** The modified code */
    code: string;
    /** Description of the fix */
    description: string;
    /** Confidence in the fix (0-1) */
    confidence: number;
}
/**
 * Extract timeout from error message
 */
declare function extractTimeoutFromError(errorMessage: string): number | null;
/**
 * Calculate suggested timeout increase
 */
declare function suggestTimeoutIncrease(currentTimeout: number, maxTimeout?: number): number;
/**
 * Fix missing await statements
 */
declare function fixMissingAwait(code: string): TimingFixResult;
/**
 * Convert to web-first assertion
 */
declare function convertToWebFirstAssertion(code: string): TimingFixResult;
/**
 * Add explicit timeout to action
 */
declare function addTimeout(code: string, lineNumber: number, timeout: number): TimingFixResult;
/**
 * Apply timing fix to code
 */
declare function applyTimingFix(context: TimingFixContext): TimingFixResult;
/**
 * Wrap with expect.toPass for complex conditions
 */
declare function wrapWithExpectToPass(code: string, lineStart: number, lineEnd: number, options?: {
    timeout?: number;
    intervals?: number[];
}): TimingFixResult;
/**
 * Wrap with expect.poll for dynamic values
 */
declare function wrapWithExpectPoll(_code: string, _lineNumber: number, getter: string, expected: string, options?: {
    timeout?: number;
    intervals?: number[];
}): string;

/**
 * Data fix context
 */
interface DataFixContext {
    /** Original code */
    code: string;
    /** Test file path */
    testFile: string;
    /** Journey ID */
    journeyId: string;
}
/**
 * Data fix result
 */
interface DataFixResult {
    /** Whether a fix was applied */
    applied: boolean;
    /** The modified code */
    code: string;
    /** Description of the fix */
    description: string;
    /** Confidence in the fix (0-1) */
    confidence: number;
}
/**
 * Generate unique run ID
 */
declare function generateRunId(): string;
/**
 * Check if code has data isolation
 */
declare function hasDataIsolation(code: string): boolean;
/**
 * Add runId variable to test
 */
declare function addRunIdVariable(code: string): DataFixResult;
/**
 * Namespace email with runId
 */
declare function namespaceEmail(email: string, runId: string): string;
/**
 * Namespace name with runId
 */
declare function namespaceName(name: string, runId: string): string;
/**
 * Replace hardcoded email with namespaced version
 */
declare function replaceHardcodedEmail(code: string): DataFixResult;
/**
 * Replace hardcoded test data with namespaced version
 */
declare function replaceHardcodedTestData(code: string): DataFixResult;
/**
 * Apply data isolation fix
 */
declare function applyDataFix(context: DataFixContext): DataFixResult;
/**
 * Add cleanup hook for test data
 */
declare function addCleanupHook(code: string, cleanupCode: string): DataFixResult;
/**
 * Extract test data patterns from code
 */
declare function extractTestDataPatterns(code: string): string[];

export { type ARIANodeInfo, DEFAULT_HEALING_CONFIG, DEFAULT_HEALING_RULES, type DataFixContext, type DataFixResult, type ForbiddenFixType, type HealFixType, type HealingAttempt, type HealingConfig, type HealingLog, HealingLogger, type HealingLoopOptions, type HealingLoopResult, type HealingRule, type HealingRuleResult, type HealingSummary, type NavigationFixContext, type NavigationFixResult, type SelectorFixContext, type SelectorFixResult, type TimingFixContext, type TimingFixResult, UNHEALABLE_CATEGORIES, addCleanupHook, addExactToLocator, addNavigationWaitAfterClick, addRunIdVariable, addTimeout, aggregateHealingLogs, applyDataFix, applyNavigationFix, applySelectorFix, applyTimingFix, containsCSSSelector, convertToWebFirstAssertion, createHealingReport, evaluateHealing, extractCSSSelector, extractNameFromSelector, extractTestDataPatterns, extractTimeoutFromError, extractUrlFromError, extractUrlFromGoto, fixMissingAwait, fixMissingGotoAwait, formatHealingLog, generateLabelLocator, generateRoleLocator, generateRunId, generateTestIdLocator, generateTextLocator, generateToHaveURL, generateWaitForURL, getApplicableRules, getHealingRecommendation, getNextFix, getPostHealingRecommendation, hasDataIsolation, hasNavigationWait, inferRoleFromSelector, inferUrlPattern, insertNavigationWait, isCategoryHealable, isFixAllowed, isFixForbidden, loadHealingLog, namespaceEmail, namespaceName, previewHealingFixes, replaceHardcodedEmail, replaceHardcodedTestData, runHealingLoop, suggestTimeoutIncrease, wouldFixApply, wrapWithExpectPoll, wrapWithExpectToPass };
