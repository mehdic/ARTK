"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DirectoryAnalyzer = exports.NON_FRONTEND_PATTERNS = exports.DIRECTORY_PATTERNS = void 0;
exports.analyzeDirectoryName = analyzeDirectoryName;
exports.isFrontendDirectory = isFrontendDirectory;
exports.isNonFrontendDirectory = isNonFrontendDirectory;
exports.scanForFrontendDirectories = scanForFrontendDirectories;
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const signals_js_1 = require("./signals.js");
/**
 * Patterns that indicate a frontend directory.
 * Weighted by specificity.
 */
exports.DIRECTORY_PATTERNS = {
    // High confidence patterns
    high: ['frontend', 'client', 'webapp', 'web-app', 'web-client'],
    // Medium confidence patterns
    medium: ['web', 'app', 'ui'],
    // Low confidence (too generic, needs other signals)
    low: ['src', 'public', 'assets'],
};
/**
 * Patterns that suggest a directory is NOT a frontend project.
 */
exports.NON_FRONTEND_PATTERNS = [
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
];
/**
 * Analyzer for directory names and structure.
 */
class DirectoryAnalyzer {
    /**
     * Analyzes a directory name for frontend indicators.
     *
     * @param dirPath - Path to the directory (uses basename for analysis)
     * @returns Analysis result
     */
    analyze(dirPath) {
        const dirName = node_path_1.default.basename(dirPath).toLowerCase();
        const signals = [];
        const detailedSignals = [];
        // Check if it matches non-frontend patterns
        const isNonFrontend = exports.NON_FRONTEND_PATTERNS.some((pattern) => dirName === pattern || dirName.startsWith(`${pattern}-`));
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
        for (const pattern of exports.DIRECTORY_PATTERNS.high) {
            if (this.matchesPattern(dirName, pattern)) {
                const signal = (0, signals_js_1.createSignal)('directory-name', pattern);
                const weight = (0, signals_js_1.getSignalWeight)(signal);
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
        for (const pattern of exports.DIRECTORY_PATTERNS.medium) {
            if (this.matchesPattern(dirName, pattern)) {
                const signal = (0, signals_js_1.createSignal)('directory-name', pattern);
                const weight = (0, signals_js_1.getSignalWeight)(signal);
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
        let confidence = 'none';
        if (exports.DIRECTORY_PATTERNS.high.some((p) => this.matchesPattern(dirName, p))) {
            confidence = 'high';
        }
        else if (exports.DIRECTORY_PATTERNS.medium.some((p) => this.matchesPattern(dirName, p))) {
            confidence = 'medium';
        }
        else if (signals.length > 0) {
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
    async scanForFrontends(rootPath, maxDepth = 2) {
        const results = [];
        await this.scanRecursive(rootPath, rootPath, 0, maxDepth, results);
        return results.filter((r) => r.isFrontend);
    }
    /**
     * Recursive directory scanning.
     */
    async scanRecursive(currentPath, rootPath, depth, maxDepth, results) {
        if (depth > maxDepth)
            return;
        try {
            const entries = await (0, promises_1.readdir)(currentPath, { withFileTypes: true });
            for (const entry of entries) {
                if (!entry.isDirectory())
                    continue;
                const entryPath = node_path_1.default.join(currentPath, entry.name);
                const analysis = this.analyze(entryPath);
                // Skip non-frontend directories completely
                if (analysis.isNonFrontend)
                    continue;
                // Add to results if it looks like a frontend
                if (analysis.isFrontend) {
                    results.push(analysis);
                }
                // Continue scanning subdirectories
                await this.scanRecursive(entryPath, rootPath, depth + 1, maxDepth, results);
            }
        }
        catch {
            // Directory not readable, skip
        }
    }
    /**
     * Checks if a directory name matches a pattern.
     * Supports exact match and prefix/suffix matching.
     */
    matchesPattern(dirName, pattern) {
        // Exact match
        if (dirName === pattern)
            return true;
        // Suffix match (e.g., 'iss-frontend' matches 'frontend')
        if (dirName.endsWith(`-${pattern}`))
            return true;
        // Prefix match (e.g., 'frontend-app' matches 'frontend')
        if (dirName.startsWith(`${pattern}-`))
            return true;
        return false;
    }
}
exports.DirectoryAnalyzer = DirectoryAnalyzer;
/**
 * Convenience function to analyze a directory name.
 *
 * @param dirPath - Path to the directory
 * @returns Analysis result
 */
function analyzeDirectoryName(dirPath) {
    const analyzer = new DirectoryAnalyzer();
    return analyzer.analyze(dirPath);
}
/**
 * Checks if a directory name suggests a frontend project.
 *
 * @param dirPath - Path to the directory
 * @returns True if the directory name suggests a frontend project
 */
function isFrontendDirectory(dirPath) {
    const result = analyzeDirectoryName(dirPath);
    return result.isFrontend;
}
/**
 * Checks if a directory name suggests it's NOT a frontend project.
 *
 * @param dirPath - Path to the directory
 * @returns True if the directory is clearly not a frontend
 */
function isNonFrontendDirectory(dirPath) {
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
async function scanForFrontendDirectories(rootPath, maxDepth = 2) {
    const analyzer = new DirectoryAnalyzer();
    return analyzer.scanForFrontends(rootPath, maxDepth);
}
//# sourceMappingURL=directory-heuristics.js.map