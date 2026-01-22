/**
 * LLKB Cross-Journey Detection Module
 *
 * This module provides functions to detect duplicate patterns across
 * multiple journey test files and identify extraction opportunities.
 *
 * @module llkb/detection
 */
import type { TestStep, ExtractionCandidate, Component } from './types.js';
/**
 * Result of duplicate detection across files
 */
export interface DuplicateDetectionResult {
    /** All test steps extracted from files */
    totalSteps: number;
    /** Number of unique patterns found */
    uniquePatterns: number;
    /** Number of duplicate patterns found */
    duplicatePatterns: number;
    /** Duplicate groups with their occurrences */
    duplicateGroups: DuplicateGroup[];
    /** Extraction candidates (sorted by priority) */
    extractionCandidates: ExtractionCandidate[];
    /** Files analyzed */
    filesAnalyzed: string[];
}
/**
 * A group of duplicate patterns
 */
export interface DuplicateGroup {
    /** Hash of the normalized pattern */
    patternHash: string;
    /** Normalized pattern code */
    normalizedCode: string;
    /** Original code samples */
    originalSamples: string[];
    /** All occurrences */
    occurrences: TestStep[];
    /** Number of unique journeys */
    uniqueJourneys: number;
    /** Number of unique files */
    uniqueFiles: number;
    /** Inferred category */
    category: string;
    /** Similarity score between occurrences */
    internalSimilarity: number;
}
/**
 * Options for duplicate detection
 */
export interface DetectionOptions {
    /** Minimum similarity threshold (default: 0.8) */
    similarityThreshold?: number;
    /** Minimum occurrences to report (default: 2) */
    minOccurrences?: number;
    /** Minimum lines for a pattern (default: 3) */
    minLines?: number;
    /** Include archived patterns */
    includeArchived?: boolean;
    /** File extensions to scan (default: ['.ts', '.js']) */
    extensions?: string[];
    /** Directories to exclude */
    excludeDirs?: string[];
}
/**
 * Detect duplicate patterns across multiple test files
 *
 * Scans test files for test.step blocks, normalizes the code,
 * and groups similar patterns to identify extraction opportunities.
 *
 * @param testDir - Directory containing test files
 * @param options - Detection options
 * @returns Duplicate detection result with groups and candidates
 *
 * @example
 * ```typescript
 * const result = detectDuplicatesAcrossFiles(
 *   'artk-e2e/tests',
 *   { similarityThreshold: 0.8, minOccurrences: 2 }
 * );
 * console.log(`Found ${result.duplicatePatterns} duplicate patterns`);
 * ```
 */
export declare function detectDuplicatesAcrossFiles(testDir: string, options?: DetectionOptions): DuplicateDetectionResult;
/**
 * Detect duplicates within a single file
 *
 * @param filePath - Path to the test file
 * @param options - Detection options
 * @returns Duplicate detection result
 */
export declare function detectDuplicatesInFile(filePath: string, options?: DetectionOptions): DuplicateDetectionResult;
/**
 * Find patterns in test files that match existing components
 *
 * Useful for identifying code that should be refactored to use components.
 *
 * @param testDir - Directory containing test files
 * @param components - Existing components to match against
 * @param options - Detection options
 * @returns Array of matches with component and location
 */
export declare function findUnusedComponentOpportunities(testDir: string, components: Component[], options?: DetectionOptions): Array<{
    component: Component;
    matches: Array<{
        file: string;
        stepName: string;
        similarity: number;
        lineStart: number;
        lineEnd: number;
    }>;
}>;
//# sourceMappingURL=detection.d.ts.map