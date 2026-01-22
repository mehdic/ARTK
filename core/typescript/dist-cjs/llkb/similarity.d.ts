/**
 * Code Similarity Calculation for LLKB
 *
 * Provides functions to calculate similarity between code patterns
 * using a combination of Jaccard similarity and structural analysis.
 *
 * @module llkb/similarity
 */
/**
 * Calculate similarity between two code strings
 *
 * Uses a weighted combination of:
 * - Jaccard similarity on tokens (80%)
 * - Line count similarity (20%)
 *
 * @param codeA - First code string
 * @param codeB - Second code string
 * @returns Similarity score between 0.0 and 1.0
 *
 * @example
 * ```typescript
 * const similar = calculateSimilarity(
 *   `await page.click('#submit');`,
 *   `await page.click('#cancel');`
 * );
 * // Returns ~0.9 (very similar structure, different selector)
 * ```
 */
export declare function calculateSimilarity(codeA: string, codeB: string): number;
/**
 * Calculate Jaccard similarity between two sets
 *
 * Jaccard index = |A ∩ B| / |A ∪ B|
 *
 * @param setA - First set
 * @param setB - Second set
 * @returns Jaccard similarity (0.0 - 1.0)
 */
export declare function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number;
/**
 * Calculate similarity based on line counts
 *
 * Uses the formula: 1 - |diff| / max(a, b)
 *
 * @param linesA - Line count of first code
 * @param linesB - Line count of second code
 * @returns Line similarity (0.0 - 1.0)
 */
export declare function lineCountSimilarity(linesA: number, linesB: number): number;
/**
 * Check if two code strings are near-duplicates
 *
 * Uses the configured similarity threshold (default 0.8)
 *
 * @param codeA - First code string
 * @param codeB - Second code string
 * @param threshold - Similarity threshold (default 0.8)
 * @returns true if similarity >= threshold
 */
export declare function isNearDuplicate(codeA: string, codeB: string, threshold?: number): boolean;
/**
 * Find all near-duplicates of a pattern in a collection
 *
 * @param pattern - The pattern to find duplicates of
 * @param candidates - Array of candidate code strings
 * @param threshold - Similarity threshold (default 0.8)
 * @returns Array of indices of near-duplicate candidates
 */
export declare function findNearDuplicates(pattern: string, candidates: string[], threshold?: number): number[];
/**
 * Result of a pattern similarity search
 */
export interface SimilarPatternResult {
    /** The matched pattern */
    pattern: string;
    /** Similarity score (0.0 - 1.0) */
    similarity: number;
    /** Index in the original patterns array */
    index: number;
}
/**
 * Find similar patterns in a collection with similarity scores
 *
 * Returns all patterns that meet the threshold, sorted by similarity (highest first).
 *
 * @param target - The target code to find similar patterns for
 * @param patterns - Array of patterns to search
 * @param threshold - Minimum similarity threshold (default 0.8)
 * @returns Array of similar patterns with scores, sorted by similarity descending
 *
 * @example
 * ```typescript
 * const results = findSimilarPatterns(
 *   `await page.click('.submit')`,
 *   [`await page.click('.button')`, `await page.goto('/home')`],
 *   0.7
 * );
 * // Returns: [{ pattern: "await page.click('.button')", similarity: 0.95, index: 0 }]
 * ```
 */
export declare function findSimilarPatterns(target: string, patterns: string[], threshold?: number): SimilarPatternResult[];
//# sourceMappingURL=similarity.d.ts.map