"use strict";
/**
 * Code Similarity Calculation for LLKB
 *
 * Provides functions to calculate similarity between code patterns
 * using a combination of Jaccard similarity and structural analysis.
 *
 * @module llkb/similarity
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateSimilarity = calculateSimilarity;
exports.jaccardSimilarity = jaccardSimilarity;
exports.lineCountSimilarity = lineCountSimilarity;
exports.isNearDuplicate = isNearDuplicate;
exports.findNearDuplicates = findNearDuplicates;
exports.findSimilarPatterns = findSimilarPatterns;
const normalize_js_1 = require("./normalize.js");
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
function calculateSimilarity(codeA, codeB) {
    // Normalize both code strings
    const normA = (0, normalize_js_1.normalizeCode)(codeA);
    const normB = (0, normalize_js_1.normalizeCode)(codeB);
    // Exact match after normalization
    if (normA === normB) {
        return 1.0;
    }
    // Calculate Jaccard similarity on tokens
    const tokensA = (0, normalize_js_1.tokenize)(normA);
    const tokensB = (0, normalize_js_1.tokenize)(normB);
    const jaccardScore = jaccardSimilarity(tokensA, tokensB);
    // Calculate line count similarity
    const linesA = (0, normalize_js_1.countLines)(codeA);
    const linesB = (0, normalize_js_1.countLines)(codeB);
    const lineSimilarity = lineCountSimilarity(linesA, linesB);
    // Weighted combination: 80% Jaccard, 20% line similarity
    const similarity = jaccardScore * 0.8 + lineSimilarity * 0.2;
    return Math.round(similarity * 100) / 100;
}
/**
 * Calculate Jaccard similarity between two sets
 *
 * Jaccard index = |A ∩ B| / |A ∪ B|
 *
 * @param setA - First set
 * @param setB - Second set
 * @returns Jaccard similarity (0.0 - 1.0)
 */
function jaccardSimilarity(setA, setB) {
    if (setA.size === 0 && setB.size === 0) {
        return 1.0; // Both empty = identical
    }
    if (setA.size === 0 || setB.size === 0) {
        return 0.0; // One empty, one not = no similarity
    }
    // Calculate intersection
    const intersection = new Set();
    for (const item of setA) {
        if (setB.has(item)) {
            intersection.add(item);
        }
    }
    // Calculate union
    const union = new Set([...setA, ...setB]);
    return intersection.size / union.size;
}
/**
 * Calculate similarity based on line counts
 *
 * Uses the formula: 1 - |diff| / max(a, b)
 *
 * @param linesA - Line count of first code
 * @param linesB - Line count of second code
 * @returns Line similarity (0.0 - 1.0)
 */
function lineCountSimilarity(linesA, linesB) {
    if (linesA === 0 && linesB === 0) {
        return 1.0;
    }
    const maxLines = Math.max(linesA, linesB);
    const diff = Math.abs(linesA - linesB);
    return 1 - diff / maxLines;
}
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
function isNearDuplicate(codeA, codeB, threshold = 0.8) {
    return calculateSimilarity(codeA, codeB) >= threshold;
}
/**
 * Find all near-duplicates of a pattern in a collection
 *
 * @param pattern - The pattern to find duplicates of
 * @param candidates - Array of candidate code strings
 * @param threshold - Similarity threshold (default 0.8)
 * @returns Array of indices of near-duplicate candidates
 */
function findNearDuplicates(pattern, candidates, threshold = 0.8) {
    const duplicates = [];
    for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];
        if (candidate !== undefined && isNearDuplicate(pattern, candidate, threshold)) {
            duplicates.push(i);
        }
    }
    return duplicates;
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
function findSimilarPatterns(target, patterns, threshold = 0.8) {
    const results = [];
    for (let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i];
        if (pattern !== undefined) {
            const similarity = calculateSimilarity(target, pattern);
            if (similarity >= threshold) {
                results.push({ pattern, similarity, index: i });
            }
        }
    }
    // Sort by similarity descending
    results.sort((a, b) => b.similarity - a.similarity);
    return results;
}
//# sourceMappingURL=similarity.js.map