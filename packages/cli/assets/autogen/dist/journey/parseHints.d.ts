/**
 * Machine Hint Parser - Extract hints from Journey step text
 * @see T072 - Implement machine hint parser
 */
import { type MachineHint } from './hintPatterns.js';
/**
 * Parsed hints result
 */
export interface ParsedHints {
    /** All parsed hints */
    hints: MachineHint[];
    /** Step text with hints removed */
    cleanText: string;
    /** Original text */
    originalText: string;
    /** Validation warnings */
    warnings: string[];
}
/**
 * Locator hints extracted for code generation
 */
export interface LocatorHints {
    /** ARIA role */
    role?: string;
    /** Test ID */
    testid?: string;
    /** Label text */
    label?: string;
    /** Text content */
    text?: string;
    /** Exact matching */
    exact?: boolean;
    /** Heading level (for role=heading) */
    level?: number;
}
/**
 * Behavioral hints extracted for code generation
 */
export interface BehaviorHints {
    /** Signal to wait for */
    signal?: string;
    /** Module method to call */
    module?: string;
    /** Wait strategy */
    wait?: 'networkidle' | 'domcontentloaded' | 'load' | 'commit';
    /** Timeout in ms */
    timeout?: number;
}
/**
 * Complete hint extraction result
 */
export interface ExtractedHints {
    /** Locator-related hints */
    locator: LocatorHints;
    /** Behavior-related hints */
    behavior: BehaviorHints;
    /** Whether any hints were found */
    hasHints: boolean;
    /** Clean step text */
    cleanText: string;
    /** Warnings */
    warnings: string[];
}
/**
 * Parse machine hints from step text
 */
export declare function parseHints(text: string): ParsedHints;
/**
 * Extract structured hints for code generation
 */
export declare function extractHints(text: string): ExtractedHints;
/**
 * Check if hints specify a locator strategy
 */
export declare function hasLocatorHints(hints: ExtractedHints): boolean;
/**
 * Check if hints specify behavioral modifications
 */
export declare function hasBehaviorHints(hints: ExtractedHints): boolean;
/**
 * Generate locator code from hints
 */
export declare function generateLocatorFromHints(hints: LocatorHints): string | null;
/**
 * Parse module hint into module name and method
 */
export declare function parseModuleHint(moduleHint: string): {
    module: string;
    method: string;
} | null;
/**
 * Validate hints for consistency
 */
export declare function validateHints(hints: ExtractedHints): string[];
/**
 * Merge hints with inferred locator (hints take priority)
 */
export declare function mergeWithInferred(hints: LocatorHints, inferred: {
    strategy: string;
    value: string;
}): {
    strategy: string;
    value: string;
    options?: Record<string, unknown>;
};
//# sourceMappingURL=parseHints.d.ts.map