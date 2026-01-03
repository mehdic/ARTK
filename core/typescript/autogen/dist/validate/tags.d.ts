/**
 * Tag Validation - Ensure generated tests have correct Playwright tags
 * @see T042 - Tag validation (required @JRN-####, @tier-*, @scope-*)
 */
import type { ValidationIssue } from './journey.js';
/**
 * Tag pattern matchers
 */
export declare const TAG_PATTERNS: {
    journeyId: RegExp;
    tier: RegExp;
    scope: RegExp;
    actor: RegExp;
    custom: RegExp;
};
/**
 * Tag validation options
 */
export interface TagValidationOptions {
    /** Whether journey ID tag is required */
    requireJourneyId?: boolean;
    /** Whether tier tag is required */
    requireTier?: boolean;
    /** Whether scope tag is required */
    requireScope?: boolean;
    /** Whether actor tag is required */
    requireActor?: boolean;
    /** Additional required tags */
    requiredTags?: string[];
    /** Forbidden tags */
    forbiddenTags?: string[];
    /** Maximum number of tags */
    maxTags?: number;
}
/**
 * Tag validation result
 */
export interface TagValidationResult {
    /** Whether tags are valid */
    valid: boolean;
    /** Validation issues */
    issues: ValidationIssue[];
    /** Parsed tags */
    parsedTags: {
        journeyId?: string;
        tier?: string;
        scope?: string;
        actor?: string;
        custom: string[];
    };
}
/**
 * Parse tags from generated test code
 */
export declare function parseTagsFromCode(code: string): string[];
/**
 * Parse tags from frontmatter tags array
 */
export declare function parseTagsFromFrontmatter(tags: string[]): string[];
/**
 * Categorize tags by type
 */
export declare function categorizeTags(tags: string[]): {
    journeyId?: string;
    tier?: string;
    scope?: string;
    actor?: string;
    custom: string[];
};
/**
 * Validate tags against requirements
 */
export declare function validateTags(tags: string[], journeyId: string, tier: string, scope: string, options?: TagValidationOptions): TagValidationResult;
/**
 * Generate expected tags for a journey
 */
export declare function generateExpectedTags(journeyId: string, tier: string, scope: string, additionalTags?: string[]): string[];
/**
 * Validate tags in generated test code
 */
export declare function validateTagsInCode(code: string, journeyId: string, tier: string, scope: string, options?: TagValidationOptions): TagValidationResult;
//# sourceMappingURL=tags.d.ts.map