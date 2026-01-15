/**
 * Journey test entry with generation metadata
 */
export interface JourneyTestEntry {
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
export interface JourneyUpdateOptions {
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
export interface JourneyUpdateResult {
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
export declare function updateJourneyFrontmatter(options: JourneyUpdateOptions): JourneyUpdateResult;
/**
 * Check if a Journey's test is up-to-date based on content hash
 *
 * @param journeyPath - Path to the journey file
 * @param testPath - Path to the test file to check
 * @param testContent - Current content of the test file
 * @returns True if the test hash matches the recorded hash
 */
export declare function isJourneyTestCurrent(journeyPath: string, testPath: string, testContent: string): boolean;
//# sourceMappingURL=updater.d.ts.map