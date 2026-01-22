/**
 * Code Validator - Aggregate all validation checks for generated code
 * @see T044 - Generated code validator (aggregates all checks)
 */
import type { ValidationIssue, JourneyValidationResult } from './journey.js';
import { type LintResult } from './lint.js';
import { type TagValidationResult } from './tags.js';
import { type CoverageResult } from './coverage.js';
import type { IRJourney } from '../ir/types.js';
import type { JourneyFrontmatter } from '../journey/parseJourney.js';
/**
 * Full validation result for generated code
 */
export interface CodeValidationResult {
    /** Overall pass/fail status */
    valid: boolean;
    /** Journey ID being validated */
    journeyId: string;
    /** All validation issues */
    issues: ValidationIssue[];
    /** Issue counts by severity */
    counts: {
        errors: number;
        warnings: number;
        info: number;
    };
    /** Individual validation results */
    details: {
        frontmatter?: JourneyValidationResult;
        patterns: {
            valid: boolean;
            violationCount: number;
        };
        lint?: LintResult;
        tags?: TagValidationResult;
        coverage?: CoverageResult;
    };
    /** Validation timestamp */
    timestamp: string;
}
/**
 * Options for code validation
 */
export interface CodeValidationOptions {
    /** Whether to run ESLint */
    runLint?: boolean;
    /** Whether to validate tags */
    validateTags?: boolean;
    /** Whether to validate coverage */
    validateCoverage?: boolean;
    /** Whether to validate frontmatter */
    validateFrontmatter?: boolean;
    /** Custom forbidden patterns to check */
    customPatterns?: RegExp[];
    /** Minimum coverage percentage */
    minCoverage?: number;
    /** Allow drafts for generation */
    allowDrafts?: boolean;
}
/**
 * Validate generated test code
 */
export declare function validateCode(code: string, journey: IRJourney, frontmatter?: JourneyFrontmatter, options?: CodeValidationOptions): Promise<CodeValidationResult>;
/**
 * Synchronous validation (without ESLint)
 */
export declare function validateCodeSync(code: string, journey: IRJourney, frontmatter?: JourneyFrontmatter, options?: Omit<CodeValidationOptions, 'runLint'>): CodeValidationResult;
/**
 * Quick pass/fail check
 */
export declare function isCodeValid(code: string, journey: IRJourney, frontmatter?: JourneyFrontmatter): boolean;
/**
 * Generate validation report as markdown
 */
export declare function generateValidationReport(result: CodeValidationResult): string;
//# sourceMappingURL=code.d.ts.map