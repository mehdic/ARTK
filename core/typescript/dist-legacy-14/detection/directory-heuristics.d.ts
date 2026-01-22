/**
 * @module detection/directory-heuristics
 * @description Directory name heuristics for frontend detection.
 *
 * Analyzes directory names to identify likely frontend projects
 * based on common naming conventions.
 *
 * @example
 * ```typescript
 * import { analyzeDirectoryName, DirectoryAnalyzer } from '@artk/core/detection';
 *
 * const result = analyzeDirectoryName('frontend');
 * console.log(result.isFrontend); // true
 * console.log(result.score); // 15
 * ```
 */
import type { DetectionSignal } from '../types/detection.js';
/**
 * Patterns that indicate a frontend directory.
 * Weighted by specificity.
 */
export declare const DIRECTORY_PATTERNS: {
    readonly high: readonly ["frontend", "client", "webapp", "web-app", "web-client"];
    readonly medium: readonly ["web", "app", "ui"];
    readonly low: readonly ["src", "public", "assets"];
};
/**
 * Patterns that suggest a directory is NOT a frontend project.
 */
export declare const NON_FRONTEND_PATTERNS: readonly ["backend", "server", "api", "service", "services", "lib", "libs", "packages", "tools", "scripts", "docs", "documentation", "test", "tests", "__tests__", "e2e", "spec", "specs", "node_modules", ".git", ".github", "dist", "build", "out", "coverage"];
/**
 * Result of directory name analysis.
 */
export interface DirectoryAnalysisResult {
    /** The analyzed directory name */
    dirName: string;
    /** Whether the directory name suggests a frontend project */
    isFrontend: boolean;
    /** Whether the directory name suggests it's NOT a frontend project */
    isNonFrontend: boolean;
    /** Confidence level of the analysis */
    confidence: 'high' | 'medium' | 'low' | 'none';
    /** Detection signals from directory name */
    signals: string[];
    /** Detailed signal information */
    detailedSignals: DetectionSignal[];
    /** Combined score from all signals */
    score: number;
}
/**
 * Analyzer for directory names and structure.
 */
export declare class DirectoryAnalyzer {
    /**
     * Analyzes a directory name for frontend indicators.
     *
     * @param dirPath - Path to the directory (uses basename for analysis)
     * @returns Analysis result
     */
    analyze(dirPath: string): DirectoryAnalysisResult;
    /**
     * Scans a directory for subdirectories that might be frontends.
     *
     * @param rootPath - Root directory to scan
     * @param maxDepth - Maximum depth to scan (default: 2)
     * @returns List of potential frontend directories with analysis
     */
    scanForFrontends(rootPath: string, maxDepth?: number): Promise<DirectoryAnalysisResult[]>;
    /**
     * Recursive directory scanning.
     */
    private scanRecursive;
    /**
     * Checks if a directory name matches a pattern.
     * Supports exact match and prefix/suffix matching.
     */
    private matchesPattern;
}
/**
 * Convenience function to analyze a directory name.
 *
 * @param dirPath - Path to the directory
 * @returns Analysis result
 */
export declare function analyzeDirectoryName(dirPath: string): DirectoryAnalysisResult;
/**
 * Checks if a directory name suggests a frontend project.
 *
 * @param dirPath - Path to the directory
 * @returns True if the directory name suggests a frontend project
 */
export declare function isFrontendDirectory(dirPath: string): boolean;
/**
 * Checks if a directory name suggests it's NOT a frontend project.
 *
 * @param dirPath - Path to the directory
 * @returns True if the directory is clearly not a frontend
 */
export declare function isNonFrontendDirectory(dirPath: string): boolean;
/**
 * Scans for potential frontend directories in a root path.
 *
 * @param rootPath - Root directory to scan
 * @param maxDepth - Maximum depth to scan
 * @returns List of potential frontend directories
 */
export declare function scanForFrontendDirectories(rootPath: string, maxDepth?: number): Promise<DirectoryAnalysisResult[]>;
//# sourceMappingURL=directory-heuristics.d.ts.map