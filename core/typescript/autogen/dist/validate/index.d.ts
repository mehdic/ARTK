import { i as JourneyStatus, x as JourneyFrontmatter, F as AcceptanceCriterion } from '../parseJourney-BY3R1Dwj.js';
import { d as IRJourney } from '../types-DJnqAI1V.js';
import 'zod';

/**
 * Journey Schema Validation - Validate Journey frontmatter before code generation
 * @see T039 - Journey schema validation (status=clarified check)
 */

/**
 * Validation issue severity
 */
type ValidationSeverity = 'error' | 'warning' | 'info';
/**
 * A single validation issue
 */
interface ValidationIssue {
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
interface JourneyValidationResult {
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
interface JourneyValidationOptions {
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
declare function validateJourneySchema(frontmatter: unknown): {
    valid: boolean;
    issues: ValidationIssue[];
};
/**
 * Validate journey status is appropriate for code generation
 */
declare function validateJourneyStatus(status: JourneyStatus, options?: JourneyValidationOptions): ValidationIssue[];
/**
 * Validate journey tier is valid
 */
declare function validateJourneyTier(tier: string, options?: JourneyValidationOptions): ValidationIssue[];
/**
 * Validate journey has required tags
 */
declare function validateJourneyTags(tags: string[], journeyId: string, options?: JourneyValidationOptions): ValidationIssue[];
/**
 * Validate journey frontmatter for code generation
 */
declare function validateJourneyFrontmatter(frontmatter: JourneyFrontmatter, options?: JourneyValidationOptions): JourneyValidationResult;
/**
 * Quick check if journey is ready for code generation
 */
declare function isJourneyReady(frontmatter: JourneyFrontmatter): boolean;

/**
 * Forbidden Pattern Scanner - Detect anti-patterns in generated test code
 * @see T040 - Forbidden pattern scanner (waitForTimeout, force:true, etc.)
 */

/**
 * A forbidden pattern definition
 */
interface ForbiddenPattern {
    /** Unique identifier */
    id: string;
    /** Pattern name */
    name: string;
    /** Regex to match the pattern */
    regex: RegExp;
    /** Severity of the issue */
    severity: ValidationSeverity;
    /** Why this pattern is forbidden */
    reason: string;
    /** Suggested alternative */
    suggestion: string;
    /** Whether to allow in specific contexts (e.g., setup/cleanup) */
    allowedContexts?: string[];
}
/**
 * Result of pattern scanning
 */
interface PatternScanResult {
    /** Line number (1-based) */
    line: number;
    /** Column number (1-based) */
    column: number;
    /** The matched text */
    match: string;
    /** The full line content */
    lineContent: string;
    /** The pattern that was violated */
    pattern: ForbiddenPattern;
}
/**
 * Forbidden patterns that indicate flaky or brittle tests
 */
declare const FORBIDDEN_PATTERNS: ForbiddenPattern[];
/**
 * Scan code for forbidden patterns
 */
declare function scanForbiddenPatterns(code: string, patterns?: ForbiddenPattern[]): PatternScanResult[];
/**
 * Convert scan results to validation issues
 */
declare function scanResultsToIssues(results: PatternScanResult[]): ValidationIssue[];
/**
 * Get pattern statistics
 */
declare function getPatternStats(results: PatternScanResult[]): Record<string, number>;
/**
 * Check if code has any error-level violations
 */
declare function hasErrorViolations(results: PatternScanResult[]): boolean;
/**
 * Filter results by severity
 */
declare function filterBySeverity(results: PatternScanResult[], severity: ValidationSeverity): PatternScanResult[];
/**
 * Get a summary of violations by category
 */
declare function getViolationSummary(results: PatternScanResult[]): {
    total: number;
    errors: number;
    warnings: number;
    info: number;
    byPattern: Record<string, number>;
};

/**
 * Result of linting code
 */
interface LintResult {
    /** Whether linting passed (no errors) */
    passed: boolean;
    /** ESLint output */
    output: string;
    /** Parsed issues */
    issues: ValidationIssue[];
    /** Error count */
    errorCount: number;
    /** Warning count */
    warningCount: number;
}
/**
 * Options for ESLint
 */
interface LintOptions {
    /** Additional ESLint rules to enable */
    rules?: Record<string, unknown>;
    /** Whether to fix auto-fixable issues */
    fix?: boolean;
    /** Custom ESLint config path */
    configPath?: string;
    /** Working directory */
    cwd?: string;
}
/**
 * Default Playwright ESLint rules
 */
declare const PLAYWRIGHT_LINT_RULES: Record<string, unknown>;
/**
 * Generate ESLint flat config for Playwright tests
 */
declare function generateESLintConfig(rules?: Record<string, unknown>): string;
/**
 * Check if ESLint and Playwright plugin are available
 */
declare function isESLintAvailable(cwd?: string): boolean;
/**
 * Check if eslint-plugin-playwright is installed
 */
declare function isPlaywrightPluginAvailable(cwd?: string): boolean;
/**
 * Parse ESLint JSON output to validation issues
 */
declare function parseESLintOutput(output: string): ValidationIssue[];
/**
 * Run ESLint on code string
 * Note: This creates a temporary file for linting
 */
declare function lintCode(code: string, filename?: string, options?: LintOptions): Promise<LintResult>;
/**
 * Lint a file directly
 */
declare function lintFile(filePath: string, options?: LintOptions): Promise<LintResult>;
/**
 * Quick check if code has lint errors (without full details)
 */
declare function hasLintErrors(code: string): boolean;

/**
 * Tag Validation - Ensure generated tests have correct Playwright tags
 * @see T042 - Tag validation (required @JRN-####, @tier-*, @scope-*)
 */

/**
 * Tag pattern matchers
 */
declare const TAG_PATTERNS: {
    journeyId: RegExp;
    tier: RegExp;
    scope: RegExp;
    actor: RegExp;
    custom: RegExp;
};
/**
 * Tag validation options
 */
interface TagValidationOptions {
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
interface TagValidationResult {
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
declare function parseTagsFromCode(code: string): string[];
/**
 * Parse tags from frontmatter tags array
 */
declare function parseTagsFromFrontmatter(tags: string[]): string[];
/**
 * Categorize tags by type
 */
declare function categorizeTags(tags: string[]): {
    journeyId?: string;
    tier?: string;
    scope?: string;
    actor?: string;
    custom: string[];
};
/**
 * Validate tags against requirements
 */
declare function validateTags(tags: string[], journeyId: string, tier: string, scope: string, options?: TagValidationOptions): TagValidationResult;
/**
 * Generate expected tags for a journey
 */
declare function generateExpectedTags(journeyId: string, tier: string, scope: string, additionalTags?: string[]): string[];
/**
 * Validate tags in generated test code
 */
declare function validateTagsInCode(code: string, journeyId: string, tier: string, scope: string, options?: TagValidationOptions): TagValidationResult;

/**
 * AC Coverage Validation - Check that all acceptance criteria have test steps
 * @see T043 - AC→test.step mapping completeness check
 */

/**
 * Coverage result for a single AC
 */
interface ACCoverageResult {
    /** AC identifier */
    acId: string;
    /** AC title */
    acTitle: string;
    /** Whether the AC has a corresponding test.step */
    hasCoverage: boolean;
    /** Number of mapped steps */
    mappedSteps: number;
    /** Number of blocked/unmapped steps */
    blockedSteps: number;
    /** Coverage percentage (mapped / total) */
    coveragePercent: number;
    /** List of unmapped step texts */
    unmappedSteps: string[];
}
/**
 * Overall coverage result
 */
interface CoverageResult {
    /** Whether all ACs are covered */
    fullCoverage: boolean;
    /** Total number of ACs */
    totalACs: number;
    /** Number of covered ACs */
    coveredACs: number;
    /** Overall coverage percentage */
    overallCoverage: number;
    /** Coverage details per AC */
    perAC: ACCoverageResult[];
    /** Validation issues */
    issues: ValidationIssue[];
}
/**
 * Coverage validation options
 */
interface CoverageOptions {
    /** Minimum coverage percentage required */
    minCoverage?: number;
    /** Warn on partial coverage */
    warnPartialCoverage?: boolean;
    /** Maximum allowed blocked steps per AC */
    maxBlockedSteps?: number;
}
/**
 * Find test.step calls in generated code
 */
declare function findTestSteps(code: string): Array<{
    id: string;
    description: string;
}>;
/**
 * Find AC IDs mentioned in code comments
 */
declare function findACReferences(code: string): string[];
/**
 * Validate AC coverage in IR journey
 */
declare function validateIRCoverage(journey: IRJourney, options?: CoverageOptions): CoverageResult;
/**
 * Validate coverage in generated test code
 */
declare function validateCodeCoverage(code: string, acceptanceCriteria: AcceptanceCriterion[], _options?: CoverageOptions): CoverageResult;
/**
 * Generate coverage report as markdown
 */
declare function generateCoverageReport(result: CoverageResult): string;

/**
 * Code Validator - Aggregate all validation checks for generated code
 * @see T044 - Generated code validator (aggregates all checks)
 */

/**
 * Full validation result for generated code
 */
interface CodeValidationResult {
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
interface CodeValidationOptions {
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
declare function validateCode(code: string, journey: IRJourney, frontmatter?: JourneyFrontmatter, options?: CodeValidationOptions): Promise<CodeValidationResult>;
/**
 * Synchronous validation (without ESLint)
 */
declare function validateCodeSync(code: string, journey: IRJourney, frontmatter?: JourneyFrontmatter, options?: Omit<CodeValidationOptions, 'runLint'>): CodeValidationResult;
/**
 * Quick pass/fail check
 */
declare function isCodeValid(code: string, journey: IRJourney, frontmatter?: JourneyFrontmatter): boolean;
/**
 * Generate validation report as markdown
 */
declare function generateValidationReport(result: CodeValidationResult): string;

export { type ACCoverageResult, type CodeValidationOptions, type CodeValidationResult, type CoverageOptions, type CoverageResult, FORBIDDEN_PATTERNS, type ForbiddenPattern, type JourneyValidationOptions, type JourneyValidationResult, type LintOptions, type LintResult, PLAYWRIGHT_LINT_RULES, type PatternScanResult, TAG_PATTERNS, type TagValidationOptions, type TagValidationResult, type ValidationIssue, type ValidationSeverity, categorizeTags, filterBySeverity, findACReferences, findTestSteps, generateCoverageReport, generateESLintConfig, generateExpectedTags, generateValidationReport, getPatternStats, getViolationSummary, hasErrorViolations, hasLintErrors, isCodeValid, isESLintAvailable, isJourneyReady, isPlaywrightPluginAvailable, lintCode, lintFile, parseESLintOutput, parseTagsFromCode, parseTagsFromFrontmatter, scanForbiddenPatterns, scanResultsToIssues, validateCode, validateCodeCoverage, validateCodeSync, validateIRCoverage, validateJourneyFrontmatter, validateJourneySchema, validateJourneyStatus, validateJourneyTags, validateJourneyTier, validateTags, validateTagsInCode };
