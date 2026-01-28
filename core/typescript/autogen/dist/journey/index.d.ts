export { A as AcceptanceCriterion, a as Accessibility, b as AccessibilitySchema, c as AccessibilityTimingSchema, C as ClarifiedJourneyFrontmatterSchema, d as CleanupStrategy, e as CleanupStrategySchema, f as CompletionSignal, g as CompletionSignalSchema, h as CompletionType, i as CompletionTypeSchema, D as DataConfig, j as DataConfigSchema, k as DataStrategy, l as DataStrategySchema, E as ElementStateSchema, I as ImplementedJourneyFrontmatterSchema, J as JourneyFrontmatter, m as JourneyFrontmatterSchema, n as JourneyParseError, o as JourneyStatus, p as JourneyStatusSchema, q as JourneyTier, r as JourneyTierSchema, L as Links, s as LinksSchema, M as Modules, t as ModulesSchema, N as NegativePath, u as NegativePathSchema, P as ParsedJourney, v as Performance, w as PerformanceSchema, x as ProceduralStep, Q as QuarantinedJourneyFrontmatterSchema, S as StructuredStep, y as StructuredStepAction, T as TestDataSet, z as TestDataSetSchema, B as TestRef, F as TestRefSchema, V as VisualRegression, G as VisualRegressionSchema, H as parseJourney, K as parseJourneyContent, O as parseJourneyForAutoGen, R as parseStructuredSteps, U as tryParseJourneyContent, W as validateForAutoGen } from '../parseJourney-pVvnO7Mc.js';
export { N as NormalizeOptions, c as completionSignalsToAssertions, n as normalizeJourney, v as validateJourneyForCodeGen } from '../normalize-CTo3B0Th.js';
import 'zod';
import '../types-CBcw78BQ.js';

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
