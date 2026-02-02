export { F as AcceptanceCriterion, v as Accessibility, e as AccessibilitySchema, A as AccessibilityTimingSchema, h as ClarifiedJourneyFrontmatterSchema, l as CleanupStrategy, C as CleanupStrategySchema, n as CompletionSignal, c as CompletionSignalSchema, m as CompletionType, b as CompletionTypeSchema, o as DataConfig, d as DataConfigSchema, k as DataStrategy, D as DataStrategySchema, E as ElementStateSchema, I as ImplementedJourneyFrontmatterSchema, x as JourneyFrontmatter, g as JourneyFrontmatterSchema, z as JourneyParseError, i as JourneyStatus, J as JourneyStatusSchema, j as JourneyTier, a as JourneyTierSchema, r as Links, L as LinksSchema, p as Modules, M as ModulesSchema, s as NegativePath, N as NegativePathSchema, B as ParsedJourney, w as Performance, P as PerformanceSchema, G as ProceduralStep, Q as QuarantinedJourneyFrontmatterSchema, H as StructuredStep, S as StructuredStepAction, t as TestDataSet, f as TestDataSetSchema, q as TestRef, T as TestRefSchema, u as VisualRegression, V as VisualRegressionSchema, O as parseJourney, U as parseJourneyContent, R as parseJourneyForAutoGen, K as parseStructuredSteps, W as tryParseJourneyContent, y as validateForAutoGen } from '../parseJourney-kHery1o3.js';
export { N as NormalizeOptions, c as completionSignalsToAssertions, n as normalizeJourney, v as validateJourneyForCodeGen } from '../normalize-Cp73lEh5.js';
import 'zod';
import '../types-DJnqAI1V.js';

/**
 * Journey test entry with generation metadata
 */
interface JourneyTestEntry {
    /** Path to generated test file (relative to project root) */
    path: string;
    /** Timestamp when test was generated */
    generated: string;
    /** Content hash for change detection (first 8 chars of SHA-256) */
    hash: string;
}
/**
 * Options for updating journey frontmatter
 */
interface JourneyUpdateOptions {
    /** Path to the journey markdown file */
    journeyPath: string;
    /** Path to the generated test file */
    testPath: string;
    /** Content of the generated test (for hash calculation) */
    testContent: string;
    /** Module dependencies to add (foundation or feature module names) */
    modules?: {
        foundation?: string[];
        features?: string[];
    };
}
/**
 * Result of journey frontmatter update
 */
interface JourneyUpdateResult {
    /** Whether update succeeded */
    success: boolean;
    /** Previous tests array before update */
    previousTests: JourneyTestEntry[];
    /** Updated tests array after update */
    updatedTests: JourneyTestEntry[];
    /** Modules added (not previously in the list) */
    modulesAdded: {
        foundation: string[];
        features: string[];
    };
}
/**
 * Update Journey frontmatter with generated test info
 *
 * This enables bi-directional traceability by:
 * 1. Recording which tests were generated from this Journey
 * 2. Tracking when tests were generated
 * 3. Detecting test changes via content hash
 * 4. Linking module dependencies
 *
 * @param options - Update options
 * @returns Update result with previous and new state
 * @throws Error if journey file is invalid or cannot be written
 */
declare function updateJourneyFrontmatter(options: JourneyUpdateOptions): JourneyUpdateResult;
/**
 * Check if a Journey's test is up-to-date based on content hash
 *
 * @param journeyPath - Path to the journey file
 * @param testPath - Path to the test file to check
 * @param testContent - Current content of the test file
 * @returns True if the test hash matches the recorded hash
 */
declare function isJourneyTestCurrent(journeyPath: string, testPath: string, testContent: string): boolean;

export { type JourneyTestEntry, type JourneyUpdateOptions, type JourneyUpdateResult, isJourneyTestCurrent, updateJourneyFrontmatter };
