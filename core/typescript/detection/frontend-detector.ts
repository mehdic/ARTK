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

import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import type { ArtkTargetType } from '../types/target.js';
import type {
  DetectionResult,
  DetectionSignal,
  ArtkConfidenceLevel,
} from '../types/detection.js';
import {
  calculateScore,
  getConfidenceFromScore,
  CONFIDENCE_THRESHOLDS,
} from './signals.js';
import { PackageScanner, type PackageScanResult } from './package-scanner.js';
import { EntryFileDetector, type EntryFileResult } from './entry-detector.js';
import {
  DirectoryAnalyzer,
  type DirectoryAnalysisResult,
  NON_FRONTEND_PATTERNS,
} from './directory-heuristics.js';

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
 * Default detection options.
 */
const DEFAULT_OPTIONS: Required<FrontendDetectorOptions> = {
  maxDepth: 3,
  minScore: 10,
  maxResults: 5,
  includeLowConfidence: true,
  relativeTo: process.cwd(),
};

/**
 * Main frontend detector class.
 */
export class FrontendDetector {
  private packageScanner: PackageScanner;
  private entryDetector: EntryFileDetector;
  private directoryAnalyzer: DirectoryAnalyzer;

  constructor() {
    this.packageScanner = new PackageScanner();
    this.entryDetector = new EntryFileDetector();
    this.directoryAnalyzer = new DirectoryAnalyzer();
  }

  /**
   * Detects all potential frontend applications in a directory tree.
   *
   * @param rootPath - Root directory to start scanning from
   * @param options - Detection options
   * @returns Array of detection results, sorted by score (highest first)
   */
  async detectAll(
    rootPath: string,
    options?: FrontendDetectorOptions
  ): Promise<DetectionResult[]> {
    const opts: Required<FrontendDetectorOptions> = {
      ...DEFAULT_OPTIONS,
      ...options,
    };

    const results: DetectionResult[] = [];
    const visited = new Set<string>();

    await this.scanDirectory(rootPath, 0, opts, results, visited);

    // Sort by score (highest first)
    results.sort((a, b) => b.score - a.score);

    // Filter by confidence if needed
    let filtered = results;
    if (!opts.includeLowConfidence) {
      filtered = results.filter((r) => r.confidence !== 'low');
    }

    // Limit results
    return filtered.slice(0, opts.maxResults);
  }

  /**
   * Detects a single frontend at a specific path.
   *
   * @param dirPath - Directory to analyze
   * @param relativeTo - Base path for relative path calculation
   * @returns Detection result or null if not a frontend
   */
  async detectSingle(
    dirPath: string,
    relativeTo?: string
  ): Promise<DetectionResult | null> {
    const result = await this.analyzeDirectory(
      dirPath,
      relativeTo ?? process.cwd()
    );

    // Return null if score is too low
    if (result.score < DEFAULT_OPTIONS.minScore) {
      return null;
    }

    return result;
  }

  /**
   * Recursively scans directories for frontends.
   */
  private async scanDirectory(
    currentPath: string,
    depth: number,
    options: Required<FrontendDetectorOptions>,
    results: DetectionResult[],
    visited: Set<string>
  ): Promise<void> {
    if (depth > options.maxDepth) return;

    // Normalize and check if already visited
    const normalizedPath = path.resolve(currentPath);
    if (visited.has(normalizedPath)) return;
    visited.add(normalizedPath);

    // Skip non-existent directories
    if (!existsSync(currentPath)) return;

    // Analyze current directory
    const result = await this.analyzeDirectory(currentPath, options.relativeTo);

    // Add to results if score meets threshold
    if (result.score >= options.minScore) {
      results.push(result);
    }

    // Scan subdirectories (but skip if current dir is a high-confidence frontend)
    // This prevents detecting nested node_modules, etc.
    if (result.confidence !== 'high' || result.score < CONFIDENCE_THRESHOLDS.HIGH) {
      await this.scanSubdirectories(
        currentPath,
        depth,
        options,
        results,
        visited
      );
    }
  }

  /**
   * Scans subdirectories of a path.
   */
  private async scanSubdirectories(
    currentPath: string,
    depth: number,
    options: Required<FrontendDetectorOptions>,
    results: DetectionResult[],
    visited: Set<string>
  ): Promise<void> {
    try {
      const entries = await readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        // Skip common non-frontend directories
        const lowerName = entry.name.toLowerCase();
        if (this.shouldSkipDirectory(lowerName)) continue;

        const subPath = path.join(currentPath, entry.name);
        await this.scanDirectory(subPath, depth + 1, options, results, visited);
      }
    } catch {
      // Directory not readable, skip
    }
  }

  /**
   * Checks if a directory should be skipped during scanning.
   */
  private shouldSkipDirectory(dirName: string): boolean {
    // Skip hidden directories
    if (dirName.startsWith('.')) return true;

    // Skip known non-frontend directories
    return NON_FRONTEND_PATTERNS.some((pattern) => dirName === pattern);
  }

  /**
   * Analyzes a single directory for frontend signals.
   */
  private async analyzeDirectory(
    dirPath: string,
    relativeTo: string
  ): Promise<DetectionResult> {
    // Collect all signals
    const allSignals: string[] = [];
    const allDetailedSignals: DetectionSignal[] = [];

    // 1. Package.json analysis
    const packageResult = await this.packageScanner.scan(dirPath);
    if (packageResult.found) {
      allSignals.push(...packageResult.signals);
      allDetailedSignals.push(...packageResult.detailedSignals);
    }

    // 2. Entry file analysis
    const entryResult = await this.entryDetector.detect(dirPath);
    allSignals.push(...entryResult.signals);
    allDetailedSignals.push(...entryResult.detailedSignals);

    // 3. Directory name analysis
    const dirResult = this.directoryAnalyzer.analyze(dirPath);
    allSignals.push(...dirResult.signals);
    allDetailedSignals.push(...dirResult.detailedSignals);

    // 4. Check for index.html
    const indexHtmlSignals = await this.checkIndexHtml(dirPath);
    allSignals.push(...indexHtmlSignals.signals);
    allDetailedSignals.push(...indexHtmlSignals.detailedSignals);

    // Calculate combined score
    const score = calculateScore(allSignals);
    const confidence = getConfidenceFromScore(score);

    // Determine type (priority: package > entry > directory)
    const detectedType = this.determineType(packageResult, entryResult, dirResult);

    // Calculate relative path
    const relativePath = path.relative(relativeTo, dirPath);

    return {
      path: path.resolve(dirPath),
      relativePath: relativePath || '.',
      confidence,
      type: detectedType,
      signals: allSignals,
      score,
      detailedSignals: allDetailedSignals,
    };
  }

  /**
   * Checks for index.html files.
   */
  private async checkIndexHtml(
    dirPath: string
  ): Promise<{ signals: string[]; detailedSignals: DetectionSignal[] }> {
    const signals: string[] = [];
    const detailedSignals: DetectionSignal[] = [];

    const locations = [
      'public/index.html',
      'index.html',
      'src/index.html',
    ];

    for (const location of locations) {
      const fullPath = path.join(dirPath, location);
      if (existsSync(fullPath)) {
        const signal = `index-html:${location}`;
        signals.push(signal);
        detailedSignals.push({
          type: 'index-html',
          source: signal,
          weight: 10,
          description: `Found index.html at ${location}`,
        });
      }
    }

    return { signals, detailedSignals };
  }

  /**
   * Determines the frontend type from all detection results.
   */
  private determineType(
    packageResult: PackageScanResult,
    entryResult: EntryFileResult,
    _dirResult: DirectoryAnalysisResult
  ): ArtkTargetType {
    // Priority 1: Package.json type detection (most reliable)
    if (packageResult.detectedType) {
      return packageResult.detectedType;
    }

    // Priority 2: Entry file type detection
    if (entryResult.detectedType) {
      return entryResult.detectedType;
    }

    // Note: _dirResult is available for future directory-based type detection
    // Default to 'other' if we have any signals but no specific type
    return 'other';
  }
}

/**
 * Convenience function to detect all frontends in a directory.
 *
 * @param rootPath - Root directory to scan
 * @param options - Detection options
 * @returns Array of detection results
 */
export async function detectFrontends(
  rootPath: string,
  options?: FrontendDetectorOptions
): Promise<DetectionResult[]> {
  const detector = new FrontendDetector();
  return detector.detectAll(rootPath, options);
}

/**
 * Convenience function to detect a single frontend.
 *
 * @param dirPath - Directory to analyze
 * @param relativeTo - Base path for relative path calculation
 * @returns Detection result or null
 */
export async function detectSingleFrontend(
  dirPath: string,
  relativeTo?: string
): Promise<DetectionResult | null> {
  const detector = new FrontendDetector();
  return detector.detectSingle(dirPath, relativeTo);
}

/**
 * Filters detection results by minimum confidence level.
 *
 * @param results - Detection results to filter
 * @param minConfidence - Minimum confidence level ('low', 'medium', or 'high')
 * @returns Filtered results
 */
export function filterByConfidence(
  results: DetectionResult[],
  minConfidence: ArtkConfidenceLevel
): DetectionResult[] {
  const confidenceOrder: ArtkConfidenceLevel[] = ['low', 'medium', 'high'];
  const minIndex = confidenceOrder.indexOf(minConfidence);

  return results.filter((r) => {
    const resultIndex = confidenceOrder.indexOf(r.confidence);
    return resultIndex >= minIndex;
  });
}

/**
 * Converts detection results to ArtkTarget format.
 *
 * @param results - Detection results
 * @returns Array of ArtkTarget objects
 */
export function detectionResultsToTargets(
  results: DetectionResult[]
): import('../types/target.js').ArtkTarget[] {
  return results.map((result, index) => ({
    name: generateTargetName(result, index),
    path: result.relativePath,
    type: result.type,
    detected_by: result.signals,
    description: `Detected ${result.type} frontend (${result.confidence} confidence, score: ${result.score})`,
  }));
}

/**
 * Generates a kebab-case target name from a detection result.
 */
function generateTargetName(result: DetectionResult, index: number): string {
  // Try to use directory name
  const dirName = path.basename(result.path).toLowerCase();

  // Clean up to kebab-case
  const cleaned = dirName
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  // If cleaned name is valid, use it
  if (cleaned && /^[a-z][a-z0-9-]*$/.test(cleaned)) {
    return cleaned;
  }

  // Fall back to generic name
  return index === 0 ? 'frontend' : `frontend-${index + 1}`;
}
