/**
 * Step Mapping Patterns - Regex patterns for parsing step text into IR primitives
 * @see research/2026-01-02_autogen-refined-plan.md Section 10
 */
import type { IRPrimitive, LocatorSpec, ValueSpec, LocatorStrategy } from '../ir/types.js';
/**
 * Pattern result with match groups
 */
export interface PatternMatch {
    type: IRPrimitive['type'];
    groups: Record<string, string>;
}
/**
 * Pattern definition
 */
export interface StepPattern {
    /** Pattern name for debugging */
    name: string;
    /** Regex pattern with named groups */
    regex: RegExp;
    /** IR primitive type this pattern produces */
    primitiveType: IRPrimitive['type'];
    /** Extract IR primitive from match (prefix with _ if unused) */
    extract: (_match: RegExpMatchArray) => IRPrimitive | null;
}
/**
 * Create a locator spec from pattern match
 */
export declare function createLocatorFromMatch(strategy: LocatorStrategy, value: string, name?: string): LocatorSpec;
/**
 * Create a value spec from text
 */
export declare function createValueFromText(text: string): ValueSpec;
/**
 * Navigation patterns
 */
export declare const navigationPatterns: StepPattern[];
/**
 * Click patterns
 */
export declare const clickPatterns: StepPattern[];
/**
 * Fill/Input patterns
 */
export declare const fillPatterns: StepPattern[];
/**
 * Select patterns
 */
export declare const selectPatterns: StepPattern[];
/**
 * Check/Uncheck patterns
 */
export declare const checkPatterns: StepPattern[];
/**
 * Visibility assertion patterns
 */
export declare const visibilityPatterns: StepPattern[];
/**
 * Toast/notification patterns
 */
export declare const toastPatterns: StepPattern[];
/**
 * URL assertion patterns
 */
export declare const urlPatterns: StepPattern[];
/**
 * Module call patterns (authentication)
 */
export declare const authPatterns: StepPattern[];
/**
 * Wait patterns
 */
export declare const waitPatterns: StepPattern[];
/**
 * Helper function to convert natural language selectors to Playwright locator strategies
 */
export declare function parseSelectorToLocator(selector: string): {
    strategy: LocatorStrategy;
    value: string;
    name?: string;
};
/**
 * Structured step patterns for Journey markdown format
 * Matches patterns like:
 * - **Action**: Click the login button
 * - **Wait for**: Dashboard to load
 * - **Assert**: User name is visible
 */
export declare const structuredPatterns: StepPattern[];
/**
 * All patterns in priority order (more specific patterns first)
 * Structured patterns come first to prioritize the Journey markdown format
 */
export declare const allPatterns: StepPattern[];
/**
 * Match text against all patterns and return the first matching primitive
 */
export declare function matchPattern(text: string): IRPrimitive | null;
/**
 * Get all pattern matches for debugging
 */
export declare function getPatternMatches(text: string): Array<{
    pattern: string;
    match: IRPrimitive;
}>;
//# sourceMappingURL=patterns.d.ts.map