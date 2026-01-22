/**
 * Selector Fix Strategy - Refine CSS selectors to role/label/testid
 * @see T062 - Implement selector refinement fix (CSS → role/label/testid)
 */
/**
 * Selector fix context
 */
export interface SelectorFixContext {
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
export interface ARIANodeInfo {
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
export interface SelectorFixResult {
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
export declare function extractCSSSelector(code: string): string | null;
/**
 * Check if code contains a CSS selector
 */
export declare function containsCSSSelector(code: string): boolean;
/**
 * Infer role from CSS selector class/id names
 */
export declare function inferRoleFromSelector(selector: string): {
    role: string;
    name?: string;
} | null;
/**
 * Extract potential name from selector
 */
export declare function extractNameFromSelector(selector: string): string | null;
/**
 * Generate role-based locator from inferred information
 */
export declare function generateRoleLocator(role: string, name?: string, options?: {
    exact?: boolean;
    level?: number;
}): string;
/**
 * Generate label-based locator
 */
export declare function generateLabelLocator(label: string, exact?: boolean): string;
/**
 * Generate text-based locator
 */
export declare function generateTextLocator(text: string, exact?: boolean): string;
/**
 * Generate testid-based locator
 */
export declare function generateTestIdLocator(testId: string): string;
/**
 * Apply selector fix to code
 */
export declare function applySelectorFix(context: SelectorFixContext): SelectorFixResult;
/**
 * Add exact: true to existing locator
 */
export declare function addExactToLocator(code: string): SelectorFixResult;
//# sourceMappingURL=selector.d.ts.map