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

import { readdir } from 'node:fs/promises';
import path from 'node:path';
import type { DetectionSignal } from '../types/detection.js';
import { createSignal, getSignalWeight } from './signals.js';

/**
 * Patterns that indicate a frontend directory.
 * Weighted by specificity.
 */
export const DIRECTORY_PATTERNS = {
  // High confidence patterns
  high: ['frontend', 'client', 'webapp', 'web-app', 'web-client'],

  // Medium confidence patterns
  medium: ['web', 'app', 'ui'],

  // Low confidence (too generic, needs other signals)
  low: ['src', 'public', 'assets'],
} as const;

/**
 * Patterns that suggest a directory is NOT a frontend project.
 */
export const NON_FRONTEND_PATTERNS = [
  'backend',
  'server',
  'api',
  'service',
  'services',
  'lib',
  'libs',
  'packages',
  'tools',
  'scripts',
  'docs',
  'documentation',
  'test',
  'tests',
  '__tests__',
  'e2e',
  'spec',
  'specs',
  'node_modules',
  '.git',
  '.github',
  'dist',
  'build',
  'out',
  'coverage',
] as const;

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
export class DirectoryAnalyzer {
  /**
   * Analyzes a directory name for frontend indicators.
   *
   * @param dirPath - Path to the directory (uses basename for analysis)
   * @returns Analysis result
   */
  analyze(dirPath: string): DirectoryAnalysisResult {
    const dirName = path.basename(dirPath).toLowerCase();
    const signals: string[] = [];
    const detailedSignals: DetectionSignal[] = [];

    // Check if it matches non-frontend patterns
    const isNonFrontend = NON_FRONTEND_PATTERNS.some(
      (pattern) => dirName === pattern || dirName.startsWith(`${pattern}-`)
    );

    if (isNonFrontend) {
      return {
        dirName,
        isFrontend: false,
        isNonFrontend: true,
        confidence: 'none',
        signals: [],
        detailedSignals: [],
        score: 0,
      };
    }

    // Check high confidence patterns
    for (const pattern of DIRECTORY_PATTERNS.high) {
      if (this.matchesPattern(dirName, pattern)) {
        const signal = createSignal('directory-name', pattern);
        const weight = getSignalWeight(signal);

        signals.push(signal);
        detailedSignals.push({
          type: 'directory-name',
          source: signal,
          weight,
          description: `Directory name matches frontend pattern: ${pattern}`,
        });
      }
    }

    // Check medium confidence patterns
    for (const pattern of DIRECTORY_PATTERNS.medium) {
      if (this.matchesPattern(dirName, pattern)) {
        const signal = createSignal('directory-name', pattern);
        const weight = getSignalWeight(signal);

        if (weight > 0) {
          signals.push(signal);
          detailedSignals.push({
            type: 'directory-name',
            source: signal,
            weight,
            description: `Directory name matches frontend pattern: ${pattern}`,
          });
        }
      }
    }

    // Calculate total score
    const score = detailedSignals.reduce((sum, s) => sum + s.weight, 0);

    // Determine confidence level
    let confidence: DirectoryAnalysisResult['confidence'] = 'none';
    if (DIRECTORY_PATTERNS.high.some((p) => this.matchesPattern(dirName, p))) {
      confidence = 'high';
    } else if (
      DIRECTORY_PATTERNS.medium.some((p) => this.matchesPattern(dirName, p))
    ) {
      confidence = 'medium';
    } else if (signals.length > 0) {
      confidence = 'low';
    }

    return {
      dirName,
      isFrontend: signals.length > 0,
      isNonFrontend: false,
      confidence,
      signals,
      detailedSignals,
      score,
    };
  }

  /**
   * Scans a directory for subdirectories that might be frontends.
   *
   * @param rootPath - Root directory to scan
   * @param maxDepth - Maximum depth to scan (default: 2)
   * @returns List of potential frontend directories with analysis
   */
  async scanForFrontends(
    rootPath: string,
    maxDepth = 2
  ): Promise<DirectoryAnalysisResult[]> {
    const results: DirectoryAnalysisResult[] = [];
    await this.scanRecursive(rootPath, rootPath, 0, maxDepth, results);
    return results.filter((r) => r.isFrontend);
  }

  /**
   * Recursive directory scanning.
   */
  private async scanRecursive(
    currentPath: string,
    rootPath: string,
    depth: number,
    maxDepth: number,
    results: DirectoryAnalysisResult[]
  ): Promise<void> {
    if (depth > maxDepth) return;

    try {
      const entries = await readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const entryPath = path.join(currentPath, entry.name);
        const analysis = this.analyze(entryPath);

        // Skip non-frontend directories completely
        if (analysis.isNonFrontend) continue;

        // Add to results if it looks like a frontend
        if (analysis.isFrontend) {
          results.push(analysis);
        }

        // Continue scanning subdirectories
        await this.scanRecursive(
          entryPath,
          rootPath,
          depth + 1,
          maxDepth,
          results
        );
      }
    } catch {
      // Directory not readable, skip
    }
  }

  /**
   * Checks if a directory name matches a pattern.
   * Supports exact match and prefix/suffix matching.
   */
  private matchesPattern(dirName: string, pattern: string): boolean {
    // Exact match
    if (dirName === pattern) return true;

    // Suffix match (e.g., 'iss-frontend' matches 'frontend')
    if (dirName.endsWith(`-${pattern}`)) return true;

    // Prefix match (e.g., 'frontend-app' matches 'frontend')
    if (dirName.startsWith(`${pattern}-`)) return true;

    return false;
  }
}

/**
 * Convenience function to analyze a directory name.
 *
 * @param dirPath - Path to the directory
 * @returns Analysis result
 */
export function analyzeDirectoryName(
  dirPath: string
): DirectoryAnalysisResult {
  const analyzer = new DirectoryAnalyzer();
  return analyzer.analyze(dirPath);
}

/**
 * Checks if a directory name suggests a frontend project.
 *
 * @param dirPath - Path to the directory
 * @returns True if the directory name suggests a frontend project
 */
export function isFrontendDirectory(dirPath: string): boolean {
  const result = analyzeDirectoryName(dirPath);
  return result.isFrontend;
}

/**
 * Checks if a directory name suggests it's NOT a frontend project.
 *
 * @param dirPath - Path to the directory
 * @returns True if the directory is clearly not a frontend
 */
export function isNonFrontendDirectory(dirPath: string): boolean {
  const result = analyzeDirectoryName(dirPath);
  return result.isNonFrontend;
}

/**
 * Scans for potential frontend directories in a root path.
 *
 * @param rootPath - Root directory to scan
 * @param maxDepth - Maximum depth to scan
 * @returns List of potential frontend directories
 */
export async function scanForFrontendDirectories(
  rootPath: string,
  maxDepth = 2
): Promise<DirectoryAnalysisResult[]> {
  const analyzer = new DirectoryAnalyzer();
  return analyzer.scanForFrontends(rootPath, maxDepth);
}
