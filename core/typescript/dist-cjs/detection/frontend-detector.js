"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FrontendDetector = void 0;
exports.detectFrontends = detectFrontends;
exports.detectSingleFrontend = detectSingleFrontend;
exports.filterByConfidence = filterByConfidence;
exports.detectionResultsToTargets = detectionResultsToTargets;
const node_fs_1 = require("node:fs");
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const signals_js_1 = require("./signals.js");
const package_scanner_js_1 = require("./package-scanner.js");
const entry_detector_js_1 = require("./entry-detector.js");
const directory_heuristics_js_1 = require("./directory-heuristics.js");
/**
 * Default detection options.
 */
const DEFAULT_OPTIONS = {
    maxDepth: 3,
    minScore: 10,
    maxResults: 5,
    includeLowConfidence: true,
    relativeTo: process.cwd(),
};
/**
 * Main frontend detector class.
 */
class FrontendDetector {
    packageScanner;
    entryDetector;
    directoryAnalyzer;
    constructor() {
        this.packageScanner = new package_scanner_js_1.PackageScanner();
        this.entryDetector = new entry_detector_js_1.EntryFileDetector();
        this.directoryAnalyzer = new directory_heuristics_js_1.DirectoryAnalyzer();
    }
    /**
     * Detects all potential frontend applications in a directory tree.
     *
     * @param rootPath - Root directory to start scanning from
     * @param options - Detection options
     * @returns Array of detection results, sorted by score (highest first)
     */
    async detectAll(rootPath, options) {
        const opts = {
            ...DEFAULT_OPTIONS,
            ...options,
        };
        const results = [];
        const visited = new Set();
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
    async detectSingle(dirPath, relativeTo) {
        const result = await this.analyzeDirectory(dirPath, relativeTo ?? process.cwd());
        // Return null if score is too low
        if (result.score < DEFAULT_OPTIONS.minScore) {
            return null;
        }
        return result;
    }
    /**
     * Recursively scans directories for frontends.
     */
    async scanDirectory(currentPath, depth, options, results, visited) {
        if (depth > options.maxDepth)
            return;
        // Normalize and check if already visited
        const normalizedPath = node_path_1.default.resolve(currentPath);
        if (visited.has(normalizedPath))
            return;
        visited.add(normalizedPath);
        // Skip non-existent directories
        if (!(0, node_fs_1.existsSync)(currentPath))
            return;
        // Analyze current directory
        const result = await this.analyzeDirectory(currentPath, options.relativeTo);
        // Add to results if score meets threshold
        if (result.score >= options.minScore) {
            results.push(result);
        }
        // Scan subdirectories (but skip if current dir is a high-confidence frontend)
        // This prevents detecting nested node_modules, etc.
        if (result.confidence !== 'high' || result.score < signals_js_1.CONFIDENCE_THRESHOLDS.HIGH) {
            await this.scanSubdirectories(currentPath, depth, options, results, visited);
        }
    }
    /**
     * Scans subdirectories of a path.
     */
    async scanSubdirectories(currentPath, depth, options, results, visited) {
        try {
            const entries = await (0, promises_1.readdir)(currentPath, { withFileTypes: true });
            for (const entry of entries) {
                if (!entry.isDirectory())
                    continue;
                // Skip common non-frontend directories
                const lowerName = entry.name.toLowerCase();
                if (this.shouldSkipDirectory(lowerName))
                    continue;
                const subPath = node_path_1.default.join(currentPath, entry.name);
                await this.scanDirectory(subPath, depth + 1, options, results, visited);
            }
        }
        catch {
            // Directory not readable, skip
        }
    }
    /**
     * Checks if a directory should be skipped during scanning.
     */
    shouldSkipDirectory(dirName) {
        // Skip hidden directories
        if (dirName.startsWith('.'))
            return true;
        // Skip known non-frontend directories
        return directory_heuristics_js_1.NON_FRONTEND_PATTERNS.some((pattern) => dirName === pattern);
    }
    /**
     * Analyzes a single directory for frontend signals.
     */
    async analyzeDirectory(dirPath, relativeTo) {
        // Collect all signals
        const allSignals = [];
        const allDetailedSignals = [];
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
        const score = (0, signals_js_1.calculateScore)(allSignals);
        const confidence = (0, signals_js_1.getConfidenceFromScore)(score);
        // Determine type (priority: package > entry > directory)
        const detectedType = this.determineType(packageResult, entryResult, dirResult);
        // Calculate relative path
        const relativePath = node_path_1.default.relative(relativeTo, dirPath);
        return {
            path: node_path_1.default.resolve(dirPath),
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
    async checkIndexHtml(dirPath) {
        const signals = [];
        const detailedSignals = [];
        const locations = [
            'public/index.html',
            'index.html',
            'src/index.html',
        ];
        for (const location of locations) {
            const fullPath = node_path_1.default.join(dirPath, location);
            if ((0, node_fs_1.existsSync)(fullPath)) {
                const signal = `index-html:${location}`;
                const weight = (0, signals_js_1.getSignalWeight)(signal);
                signals.push(signal);
                detailedSignals.push({
                    type: 'index-html',
                    source: signal,
                    weight,
                    description: `Found index.html at ${location}`,
                });
            }
        }
        return { signals, detailedSignals };
    }
    /**
     * Determines the frontend type from all detection results.
     */
    determineType(packageResult, entryResult, _dirResult) {
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
exports.FrontendDetector = FrontendDetector;
/**
 * Convenience function to detect all frontends in a directory.
 *
 * @param rootPath - Root directory to scan
 * @param options - Detection options
 * @returns Array of detection results
 */
async function detectFrontends(rootPath, options) {
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
async function detectSingleFrontend(dirPath, relativeTo) {
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
function filterByConfidence(results, minConfidence) {
    const confidenceOrder = ['low', 'medium', 'high'];
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
function detectionResultsToTargets(results) {
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
function generateTargetName(result, index) {
    // Try to use directory name
    const dirName = node_path_1.default.basename(result.path).toLowerCase();
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
//# sourceMappingURL=frontend-detector.js.map