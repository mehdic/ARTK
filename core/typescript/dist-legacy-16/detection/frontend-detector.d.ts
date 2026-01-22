/**
 * @module detection/frontend-detector
 * @description Main frontend detector that combines all detection signals.
 *
 * Orchestrates package scanning, entry file detection, and directory
 * heuristics to identify frontend applications in a project.
 *
 * @example
 * ```typescript
 * import { FrontendDetector, detectFrontends } from '@artk/core/detection';
 *
 * const detector = new FrontendDetector();
 * const results = await detector.detectAll('/path/to/monorepo');
 *
 * for (const result of results) {
 *   console.log(`Found ${result.type} at ${result.path} (${result.confidence})`);
 * }
 * ```
 */
import type { DetectionResult, ArtkConfidenceLevel } from '../types/detection.js';
/**
 * Options for frontend detection.
 */
export interface FrontendDetectorOptions {
    /** Maximum depth to scan for frontends (default: 3) */
    maxDepth?: number;
    /** Minimum score required to consider a detection valid (default: 10) */
    minScore?: number;
    /** Maximum number of results to return (default: 5) */
    maxResults?: number;
    /** Whether to include low confidence results (default: true) */
    includeLowConfidence?: boolean;
    /** Base path for calculating relative paths (default: process.cwd()) */
    relativeTo?: string;
}
/**
 * Main frontend detector class.
 */
export declare class FrontendDetector {
    private packageScanner;
    private entryDetector;
    private directoryAnalyzer;
    constructor();
    /**
     * Detects all potential frontend applications in a directory tree.
     *
     * @param rootPath - Root directory to start scanning from
     * @param options - Detection options
     * @returns Array of detection results, sorted by score (highest first)
     */
    detectAll(rootPath: string, options?: FrontendDetectorOptions): Promise<DetectionResult[]>;
    /**
     * Detects a single frontend at a specific path.
     *
     * @param dirPath - Directory to analyze
     * @param relativeTo - Base path for relative path calculation
     * @returns Detection result or null if not a frontend
     */
    detectSingle(dirPath: string, relativeTo?: string): Promise<DetectionResult | null>;
    /**
     * Recursively scans directories for frontends.
     */
    private scanDirectory;
    /**
     * Scans subdirectories of a path.
     */
    private scanSubdirectories;
    /**
     * Checks if a directory should be skipped during scanning.
     */
    private shouldSkipDirectory;
    /**
     * Analyzes a single directory for frontend signals.
     */
    private analyzeDirectory;
    /**
     * Checks for index.html files.
     */
    private checkIndexHtml;
    /**
     * Determines the frontend type from all detection results.
     */
    private determineType;
}
/**
 * Convenience function to detect all frontends in a directory.
 *
 * @param rootPath - Root directory to scan
 * @param options - Detection options
 * @returns Array of detection results
 */
export declare function detectFrontends(rootPath: string, options?: FrontendDetectorOptions): Promise<DetectionResult[]>;
/**
 * Convenience function to detect a single frontend.
 *
 * @param dirPath - Directory to analyze
 * @param relativeTo - Base path for relative path calculation
 * @returns Detection result or null
 */
export declare function detectSingleFrontend(dirPath: string, relativeTo?: string): Promise<DetectionResult | null>;
/**
 * Filters detection results by minimum confidence level.
 *
 * @param results - Detection results to filter
 * @param minConfidence - Minimum confidence level ('low', 'medium', or 'high')
 * @returns Filtered results
 */
export declare function filterByConfidence(results: DetectionResult[], minConfidence: ArtkConfidenceLevel): DetectionResult[];
/**
 * Converts detection results to ArtkTarget format.
 *
 * @param results - Detection results
 * @returns Array of ArtkTarget objects
 */
export declare function detectionResultsToTargets(results: DetectionResult[]): import('../types/target.js').ArtkTarget[];
//# sourceMappingURL=frontend-detector.d.ts.map