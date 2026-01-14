/**
 * Journey Schema Validation - Validate Journey frontmatter before code generation
 * @see T039 - Journey schema validation (status=clarified check)
 */
import type { JourneyFrontmatter } from '../journey/parseJourney.js';
import { JourneyStatus } from '../journey/parseJourney.js';
/**
 * Validation issue severity
 */
export type ValidationSeverity = 'error' | 'warning' | 'info';
/**
 * A single validation issue
 */
export interface ValidationIssue {
    /** Unique code for the issue */
    code: string;
    /** Human-readable message */
    message: string;
    /** Severity level */
    severity: ValidationSeverity;
    /** Field that has the issue, if applicable */
    field?: string;
    /** Suggested fix, if available */
    suggestion?: string;
}
/**
 * Result of journey validation
 */
export interface JourneyValidationResult {
    /** Whether the journey is valid for code generation */
    valid: boolean;
    /** Journey ID from frontmatter */
    journeyId: string;
    /** List of validation issues */
    issues: ValidationIssue[];
    /** Counts by severity */
    counts: {
        errors: number;
        warnings: number;
        info: number;
    };
}
/**
 * Options for journey validation
 */
export interface JourneyValidationOptions {
    /** Whether to allow draft journeys (status other than clarified) */
    allowDrafts?: boolean;
    /** Required tags that must be present */
    requiredTags?: string[];
    /** Valid tiers */
    validTiers?: string[];
    /** Warn if journey has no acceptance criteria */
    warnEmptyAC?: boolean;
}
/**
 * Validate journey frontmatter schema
 */
export declare function validateJourneySchema(frontmatter: unknown): {
    valid: boolean;
    issues: ValidationIssue[];
};
/**
 * Validate journey status is appropriate for code generation
 */
export declare function validateJourneyStatus(status: JourneyStatus, options?: JourneyValidationOptions): ValidationIssue[];
/**
 * Validate journey tier is valid
 */
export declare function validateJourneyTier(tier: string, options?: JourneyValidationOptions): ValidationIssue[];
/**
 * Validate journey has required tags
 */
export declare function validateJourneyTags(tags: string[], journeyId: string, options?: JourneyValidationOptions): ValidationIssue[];
/**
 * Validate journey frontmatter for code generation
 */
export declare function validateJourneyFrontmatter(frontmatter: JourneyFrontmatter, options?: JourneyValidationOptions): JourneyValidationResult;
/**
 * Quick check if journey is ready for code generation
 */
export declare function isJourneyReady(frontmatter: JourneyFrontmatter): boolean;
//# sourceMappingURL=journey.d.ts.map