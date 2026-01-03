/**
 * Timing/Async Fix - Handle timeout and async issues
 * @see T064 - Implement timing/async fix
 */
/**
 * Timing fix context
 */
export interface TimingFixContext {
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
export interface TimingFixResult {
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
export declare function extractTimeoutFromError(errorMessage: string): number | null;
/**
 * Calculate suggested timeout increase
 */
export declare function suggestTimeoutIncrease(currentTimeout: number, maxTimeout?: number): number;
/**
 * Fix missing await statements
 */
export declare function fixMissingAwait(code: string): TimingFixResult;
/**
 * Convert to web-first assertion
 */
export declare function convertToWebFirstAssertion(code: string): TimingFixResult;
/**
 * Add explicit timeout to action
 */
export declare function addTimeout(code: string, lineNumber: number, timeout: number): TimingFixResult;
/**
 * Apply timing fix to code
 */
export declare function applyTimingFix(context: TimingFixContext): TimingFixResult;
/**
 * Wrap with expect.toPass for complex conditions
 */
export declare function wrapWithExpectToPass(code: string, lineStart: number, lineEnd: number, options?: {
    timeout?: number;
    intervals?: number[];
}): TimingFixResult;
/**
 * Wrap with expect.poll for dynamic values
 */
export declare function wrapWithExpectPoll(_code: string, _lineNumber: number, getter: string, expected: string, options?: {
    timeout?: number;
    intervals?: number[];
}): string;
//# sourceMappingURL=timing.d.ts.map