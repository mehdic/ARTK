/**
 * Navigation Wait Fix - Add waitForURL/toHaveURL assertions
 * @see T063 - Implement navigation wait fix
 */
/**
 * Navigation fix context
 */
export interface NavigationFixContext {
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
export interface NavigationFixResult {
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
export declare function hasNavigationWait(code: string): boolean;
/**
 * Extract URL pattern from error message
 */
export declare function extractUrlFromError(errorMessage: string): string | null;
/**
 * Extract URL from goto call
 */
export declare function extractUrlFromGoto(code: string): string | null;
/**
 * Infer expected URL pattern from navigation action
 */
export declare function inferUrlPattern(code: string, errorMessage: string): string | null;
/**
 * Generate waitForURL statement
 */
export declare function generateWaitForURL(urlPattern: string, options?: {
    timeout?: number;
}): string;
/**
 * Generate toHaveURL assertion
 */
export declare function generateToHaveURL(urlPattern: string): string;
/**
 * Insert navigation wait after an action
 */
export declare function insertNavigationWait(code: string, lineNumber: number, urlPattern: string): NavigationFixResult;
/**
 * Apply navigation wait fix to code
 */
export declare function applyNavigationFix(context: NavigationFixContext): NavigationFixResult;
/**
 * Fix missing await on goto
 */
export declare function fixMissingGotoAwait(code: string): NavigationFixResult;
/**
 * Add navigation wait after click that likely navigates
 */
export declare function addNavigationWaitAfterClick(code: string, clickLineNumber: number, expectedUrl?: string): NavigationFixResult;
//# sourceMappingURL=navigation.d.ts.map