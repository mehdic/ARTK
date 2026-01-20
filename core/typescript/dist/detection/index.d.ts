import { a as ArtkTargetType, A as ArtkTarget } from '../target-BGR8NLDg.js';
import { A as ArtkConfidenceLevel, d as ArtkDetectionSignalCategory, e as DetectionSignal, f as DetectionResult, g as SubmoduleStatus, h as SubmoduleScanResult, N as NodeVersionParsed, M as ModuleSystem, a as DetectionMethod, D as DetectionConfidence, b as DetectionOptions$1, c as DetectionResult$1 } from '../environment-context-BrLc0RJ2.js';

/**
 * Signal weight definitions for frontend detection.
 *
 * Weights are based on the research.md specification:
 * - Package dependencies (30-35): Most reliable indicator
 * - Entry files (15-20): Strong secondary indicator
 * - Directory names (15): Medium confidence
 * - index.html presence (10): Low confidence
 */
declare const SIGNAL_WEIGHTS: {
    readonly 'package-dependency:react': 30;
    readonly 'package-dependency:vue': 30;
    readonly 'package-dependency:@angular/core': 30;
    readonly 'package-dependency:svelte': 30;
    readonly 'package-dependency:next': 35;
    readonly 'package-dependency:nuxt': 35;
    readonly 'package-dependency:gatsby': 35;
    readonly 'package-dependency:remix': 35;
    readonly 'package-dependency:astro': 35;
    readonly 'package-dependency:vite': 20;
    readonly 'package-dependency:webpack': 20;
    readonly 'package-dependency:parcel': 20;
    readonly 'package-dependency:rollup': 15;
    readonly 'package-dependency:esbuild': 15;
    readonly 'entry-file:src/App.tsx': 20;
    readonly 'entry-file:src/App.jsx': 20;
    readonly 'entry-file:src/app.tsx': 20;
    readonly 'entry-file:src/app.jsx': 20;
    readonly 'entry-file:src/main.tsx': 15;
    readonly 'entry-file:src/main.jsx': 15;
    readonly 'entry-file:src/index.tsx': 15;
    readonly 'entry-file:src/index.jsx': 15;
    readonly 'entry-file:src/App.vue': 20;
    readonly 'entry-file:vue.config.js': 20;
    readonly 'entry-file:src/main.ts': 15;
    readonly 'entry-file:src/main.js': 15;
    readonly 'entry-file:app/page.tsx': 20;
    readonly 'entry-file:app/page.jsx': 20;
    readonly 'entry-file:app/layout.tsx': 15;
    readonly 'entry-file:pages/index.tsx': 15;
    readonly 'entry-file:pages/index.jsx': 15;
    readonly 'entry-file:pages/_app.tsx': 15;
    readonly 'entry-file:pages/_app.jsx': 15;
    readonly 'entry-file:pages/index.vue': 15;
    readonly 'entry-file:app.vue': 15;
    readonly 'entry-file:nuxt.config.ts': 20;
    readonly 'entry-file:nuxt.config.js': 20;
    readonly 'entry-file:src/app/app.component.ts': 20;
    readonly 'entry-file:angular.json': 25;
    readonly 'entry-file:src/app/app.module.ts': 15;
    readonly 'directory-name:frontend': 15;
    readonly 'directory-name:client': 15;
    readonly 'directory-name:web': 10;
    readonly 'directory-name:app': 10;
    readonly 'directory-name:ui': 10;
    readonly 'directory-name:webapp': 15;
    readonly 'directory-name:web-app': 15;
    readonly 'directory-name:web-client': 15;
    readonly 'index-html:public/index.html': 10;
    readonly 'index-html:index.html': 10;
    readonly 'index-html:src/index.html': 10;
    readonly 'config-file:vite.config.ts': 20;
    readonly 'config-file:vite.config.js': 20;
    readonly 'config-file:webpack.config.js': 15;
    readonly 'config-file:next.config.js': 25;
    readonly 'config-file:next.config.mjs': 25;
    readonly 'config-file:nuxt.config.ts': 25;
    readonly 'config-file:angular.json': 25;
    readonly 'config-file:svelte.config.js': 20;
    readonly 'config-file:astro.config.mjs': 20;
    readonly 'package-dependency:ag-grid-community': 25;
    readonly 'package-dependency:ag-grid-enterprise': 30;
    readonly 'package-dependency:ag-grid-react': 25;
    readonly 'package-dependency:ag-grid-vue': 25;
    readonly 'package-dependency:ag-grid-vue3': 25;
    readonly 'package-dependency:ag-grid-angular': 25;
    readonly 'package-dependency:@ag-grid-community/core': 25;
    readonly 'package-dependency:@ag-grid-enterprise/core': 30;
};
/**
 * Type for valid signal keys.
 */
type SignalKey = keyof typeof SIGNAL_WEIGHTS;
/**
 * Confidence level thresholds.
 * Score ≥40 = high, 20-39 = medium, <20 = low
 */
declare const CONFIDENCE_THRESHOLDS: {
    readonly HIGH: 40;
    readonly MEDIUM: 20;
};
/**
 * Framework detection mappings.
 * Maps primary package dependencies to their target types.
 */
declare const FRAMEWORK_DETECTION_MAP: Record<string, ArtkTargetType>;
/**
 * Directory patterns that suggest frontend applications.
 */
declare const FRONTEND_DIRECTORY_PATTERNS: readonly ["frontend", "client", "web", "webapp", "web-app", "web-client", "app", "ui"];
/**
 * Package.json dependencies that indicate a frontend project.
 */
declare const FRONTEND_PACKAGE_INDICATORS: readonly ["react", "react-dom", "vue", "@angular/core", "svelte", "solid-js", "next", "nuxt", "gatsby", "astro", "remix", "@remix-run/react", "vite", "webpack", "parcel", "@vitejs/plugin-react", "@vitejs/plugin-vue", "ag-grid-community", "ag-grid-enterprise", "ag-grid-react", "ag-grid-vue", "ag-grid-vue3", "ag-grid-angular", "@ag-grid-community/core", "@ag-grid-enterprise/core"];
/**
 * Calculates the total score from a list of signal identifiers.
 *
 * @param signals - Array of signal identifiers (e.g., 'package.json:react')
 * @returns Combined score from all matched signals
 *
 * @example
 * ```typescript
 * const score = calculateScore(['package-dependency:react', 'entry-file:src/App.tsx']);
 * console.log(score); // 50
 * ```
 */
declare function calculateScore(signals: string[]): number;
/**
 * Determines the confidence level from a score.
 *
 * @param score - The total detection score
 * @returns Confidence level: 'high', 'medium', or 'low'
 *
 * @example
 * ```typescript
 * getConfidenceFromScore(55); // 'high'
 * getConfidenceFromScore(25); // 'medium'
 * getConfidenceFromScore(10); // 'low'
 * ```
 */
declare function getConfidenceFromScore(score: number): ArtkConfidenceLevel;
/**
 * Gets the signal category from a signal identifier.
 *
 * @param signal - Signal identifier (e.g., 'package-dependency:react')
 * @returns Signal category or undefined if invalid format
 *
 * @example
 * ```typescript
 * getSignalCategory('package-dependency:react'); // 'package-dependency'
 * getSignalCategory('entry-file:src/App.tsx'); // 'entry-file'
 * ```
 */
declare function getSignalCategory(signal: string): ArtkDetectionSignalCategory | undefined;
/**
 * Creates a signal identifier from category and source.
 *
 * @param category - Signal category
 * @param source - Signal source (e.g., 'react', 'src/App.tsx')
 * @returns Formatted signal identifier
 *
 * @example
 * ```typescript
 * createSignal('package-dependency', 'react'); // 'package-dependency:react'
 * createSignal('entry-file', 'src/App.tsx'); // 'entry-file:src/App.tsx'
 * ```
 */
declare function createSignal(category: ArtkDetectionSignalCategory, source: string): string;
/**
 * Gets the weight for a specific signal.
 *
 * @param signal - Signal identifier
 * @returns Weight value or 0 if signal not recognized
 */
declare function getSignalWeight(signal: string): number;
/**
 * Clears the cache of warned signals.
 * Useful for testing or when you want to re-enable warnings.
 */
declare function clearWarnedSignalsCache(): void;
/**
 * Checks if a package name indicates a frontend project.
 *
 * @param packageName - Name of the package dependency
 * @returns True if the package suggests a frontend project
 */
declare function isFrontendPackage(packageName: string): boolean;
/**
 * Checks if a directory name matches known frontend directory patterns.
 * Simple string matching - for full directory analysis use DirectoryAnalyzer.
 *
 * @param dirName - Name of the directory
 * @returns True if the directory name suggests a frontend project
 */
declare function matchesFrontendDirectoryPattern(dirName: string): boolean;
/**
 * AG Grid package indicators for detection.
 * Used by the grid module to determine if AG Grid helpers should be available.
 */
declare const AG_GRID_PACKAGE_INDICATORS: readonly ["ag-grid-community", "ag-grid-enterprise", "ag-grid-react", "ag-grid-vue", "ag-grid-vue3", "ag-grid-angular", "@ag-grid-community/core", "@ag-grid-enterprise/core"];
/**
 * Checks if a package name indicates AG Grid usage.
 *
 * @param packageName - Name of the package dependency
 * @returns True if the package indicates AG Grid is used
 *
 * @example
 * ```typescript
 * isAgGridPackage('ag-grid-react'); // true
 * isAgGridPackage('react'); // false
 * ```
 */
declare function isAgGridPackage(packageName: string): boolean;
/**
 * Checks if a package name indicates AG Grid Enterprise usage.
 *
 * @param packageName - Name of the package dependency
 * @returns True if the package indicates AG Grid Enterprise is used
 */
declare function isAgGridEnterprisePackage(packageName: string): boolean;

/**
 * @module detection/package-scanner
 * @description Package.json dependency scanner for frontend detection.
 *
 * Scans package.json files for framework and build tool dependencies
 * to detect frontend applications.
 *
 * @example
 * ```typescript
 * import { scanPackageJson, PackageScanner } from '@artk/core/detection';
 *
 * const result = await scanPackageJson('/path/to/project');
 * console.log(result.signals); // ['package-dependency:react', 'package-dependency:vite']
 * console.log(result.detectedType); // 'react-spa'
 * ```
 */

/**
 * Result of scanning a package.json file.
 */
interface PackageScanResult {
    /** Whether a package.json was found */
    found: boolean;
    /** Absolute path to the package.json file */
    packageJsonPath: string | null;
    /** Package name from package.json */
    packageName: string | null;
    /** Detection signals from package dependencies */
    signals: string[];
    /** Detailed signal information */
    detailedSignals: DetectionSignal[];
    /** Combined score from all signals */
    score: number;
    /** Detected frontend type based on dependencies */
    detectedType: ArtkTargetType | null;
    /** All dependencies found (for debugging) */
    allDependencies: string[];
}
/**
 * Scanner for package.json files.
 */
declare class PackageScanner {
    /**
     * Scans a package.json file for frontend dependencies.
     *
     * @param dirPath - Directory containing package.json
     * @returns Scan result with signals and detected type
     */
    scan(dirPath: string): Promise<PackageScanResult>;
    /**
     * Analyzes a parsed package.json for frontend indicators.
     */
    private analyzePackage;
    /**
     * Gets all dependencies from package.json (deps + devDeps + peerDeps).
     */
    private getAllDependencies;
    /**
     * Checks if a dependency indicates a frontend project.
     */
    private isFrontendDependency;
    /**
     * Detects the primary framework type from dependencies.
     * Priority: meta-frameworks > frameworks > build tools
     */
    private detectFrameworkType;
}
/**
 * Convenience function to scan a package.json file.
 *
 * @param dirPath - Directory containing package.json
 * @returns Scan result
 */
declare function scanPackageJson(dirPath: string): Promise<PackageScanResult>;
/**
 * Checks if a directory has a package.json file.
 *
 * @param dirPath - Directory to check
 * @returns True if package.json exists
 */
declare function hasPackageJson(dirPath: string): boolean;

/**
 * @module detection/entry-detector
 * @description Entry file detector for frontend applications.
 *
 * Scans directories for common frontend entry files like App.tsx,
 * main.ts, pages/index.tsx, etc.
 *
 * @example
 * ```typescript
 * import { detectEntryFiles, EntryFileDetector } from '@artk/core/detection';
 *
 * const result = await detectEntryFiles('/path/to/project');
 * console.log(result.signals); // ['entry-file:src/App.tsx', 'entry-file:src/main.tsx']
 * console.log(result.detectedType); // 'react-spa'
 * ```
 */

/**
 * Entry file patterns to check, organized by framework.
 */
declare const ENTRY_FILE_PATTERNS: {
    readonly react: readonly ["src/App.tsx", "src/App.jsx", "src/app.tsx", "src/app.jsx", "src/main.tsx", "src/main.jsx", "src/index.tsx", "src/index.jsx"];
    readonly vue: readonly ["src/App.vue", "vue.config.js"];
    readonly 'next-app': readonly ["app/page.tsx", "app/page.jsx", "app/layout.tsx", "app/layout.jsx"];
    readonly 'next-pages': readonly ["pages/index.tsx", "pages/index.jsx", "pages/_app.tsx", "pages/_app.jsx", "pages/_document.tsx", "pages/_document.jsx"];
    readonly nuxt: readonly ["pages/index.vue", "app.vue", "nuxt.config.ts", "nuxt.config.js"];
    readonly angular: readonly ["src/app/app.component.ts", "src/app/app.module.ts", "src/main.ts", "angular.json"];
    readonly config: readonly ["vite.config.ts", "vite.config.js", "webpack.config.js", "webpack.config.ts", "next.config.js", "next.config.mjs", "next.config.ts", "svelte.config.js", "astro.config.mjs"];
};
/**
 * Result of entry file detection.
 */
interface EntryFileResult {
    /** All entry files found */
    foundFiles: string[];
    /** Detection signals from found files */
    signals: string[];
    /** Detailed signal information */
    detailedSignals: DetectionSignal[];
    /** Combined score from all signals */
    score: number;
    /** Detected framework type based on entry files */
    detectedType: ArtkTargetType | null;
}
/**
 * Entry file detector for frontend applications.
 */
declare class EntryFileDetector {
    /**
     * Detects entry files in a directory.
     *
     * @param dirPath - Directory to scan for entry files
     * @returns Detection result with signals and type
     */
    detect(dirPath: string): Promise<EntryFileResult>;
    /**
     * Checks if a path is a file (not a directory).
     */
    private isFile;
    /**
     * Detects the framework type from found entry files.
     */
    private detectTypeFromFiles;
}
/**
 * Convenience function to detect entry files.
 *
 * @param dirPath - Directory to scan
 * @returns Detection result
 */
declare function detectEntryFiles(dirPath: string): Promise<EntryFileResult>;
/**
 * Checks if a directory has any common frontend entry files.
 *
 * @param dirPath - Directory to check
 * @returns True if any entry files are found
 */
declare function hasEntryFiles(dirPath: string): Promise<boolean>;
/**
 * Gets the list of all entry file patterns to check.
 *
 * @returns Flat list of all entry file patterns
 */
declare function getAllEntryPatterns(): string[];

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

/**
 * Patterns that indicate a frontend directory.
 * Weighted by specificity.
 */
declare const DIRECTORY_PATTERNS: {
    readonly high: readonly ["frontend", "client", "webapp", "web-app", "web-client"];
    readonly medium: readonly ["web", "app", "ui"];
    readonly low: readonly ["src", "public", "assets"];
};
/**
 * Patterns that suggest a directory is NOT a frontend project.
 */
declare const NON_FRONTEND_PATTERNS: readonly ["backend", "server", "api", "service", "services", "lib", "libs", "packages", "tools", "scripts", "docs", "documentation", "test", "tests", "__tests__", "e2e", "spec", "specs", "node_modules", ".git", ".github", "dist", "build", "out", "coverage"];
/**
 * Result of directory name analysis.
 */
interface DirectoryAnalysisResult {
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
declare class DirectoryAnalyzer {
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
declare function analyzeDirectoryName(dirPath: string): DirectoryAnalysisResult;
/**
 * Checks if a directory name suggests a frontend project.
 *
 * @param dirPath - Path to the directory
 * @returns True if the directory name suggests a frontend project
 */
declare function isFrontendDirectory(dirPath: string): boolean;
/**
 * Checks if a directory name suggests it's NOT a frontend project.
 *
 * @param dirPath - Path to the directory
 * @returns True if the directory is clearly not a frontend
 */
declare function isNonFrontendDirectory(dirPath: string): boolean;
/**
 * Scans for potential frontend directories in a root path.
 *
 * @param rootPath - Root directory to scan
 * @param maxDepth - Maximum depth to scan
 * @returns List of potential frontend directories
 */
declare function scanForFrontendDirectories(rootPath: string, maxDepth?: number): Promise<DirectoryAnalysisResult[]>;

/**
 * Options for frontend detection.
 */
interface FrontendDetectorOptions {
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
declare class FrontendDetector {
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
declare function detectFrontends(rootPath: string, options?: FrontendDetectorOptions): Promise<DetectionResult[]>;
/**
 * Convenience function to detect a single frontend.
 *
 * @param dirPath - Directory to analyze
 * @param relativeTo - Base path for relative path calculation
 * @returns Detection result or null
 */
declare function detectSingleFrontend(dirPath: string, relativeTo?: string): Promise<DetectionResult | null>;
/**
 * Filters detection results by minimum confidence level.
 *
 * @param results - Detection results to filter
 * @param minConfidence - Minimum confidence level ('low', 'medium', or 'high')
 * @returns Filtered results
 */
declare function filterByConfidence(results: DetectionResult[], minConfidence: ArtkConfidenceLevel): DetectionResult[];
/**
 * Converts detection results to ArtkTarget format.
 *
 * @param results - Detection results
 * @returns Array of ArtkTarget objects
 */
declare function detectionResultsToTargets(results: DetectionResult[]): ArtkTarget[];

/**
 * @module detection/submodule-checker
 * @description Git submodule detection and status checker.
 *
 * Parses .gitmodules files and checks submodule initialization status
 * to identify submodule boundaries during frontend detection.
 *
 * @example
 * ```typescript
 * import { SubmoduleChecker, checkSubmodules } from '@artk/core/detection';
 *
 * const checker = new SubmoduleChecker();
 * const status = await checker.checkAll('/path/to/repo');
 *
 * for (const sub of status) {
 *   console.log(`${sub.path}: ${sub.initialized ? 'initialized' : 'not initialized'}`);
 * }
 * ```
 */

/**
 * Options for submodule checking.
 */
interface SubmoduleCheckerOptions {
    /** Whether to check initialization status via git command (default: true) */
    checkInitStatus?: boolean;
    /** Whether to include remote URL information (default: false) */
    includeUrls?: boolean;
}
/**
 * Checker for git submodule status.
 */
declare class SubmoduleChecker {
    /**
     * Checks all submodules in a repository.
     *
     * @param repoRoot - Root directory of the git repository
     * @param options - Checker options
     * @returns Array of submodule statuses
     */
    checkAll(repoRoot: string, options?: SubmoduleCheckerOptions): Promise<SubmoduleStatus[]>;
    /**
     * Scans a directory to determine if it's a submodule.
     *
     * @param dirPath - Directory to check
     * @param repoRoot - Root of the parent repository
     * @returns Scan result with submodule information
     */
    scan(dirPath: string, repoRoot: string): Promise<SubmoduleScanResult>;
    /**
     * Checks if a path is within a submodule.
     *
     * @param checkPath - Path to check
     * @param repoRoot - Root of the parent repository
     * @returns True if path is inside a submodule
     */
    isInSubmodule(checkPath: string, repoRoot: string): Promise<boolean>;
    /**
     * Parses a .gitmodules file.
     *
     * @param gitmodulesPath - Path to .gitmodules file
     * @returns Array of parsed submodule entries
     */
    private parseGitmodules;
    /**
     * Parses the content of a .gitmodules file.
     *
     * .gitmodules format:
     * [submodule "name"]
     *     path = some/path
     *     url = https://github.com/...
     *     branch = main
     */
    private parseGitmodulesContent;
    /**
     * Checks initialization status of a submodule via git command.
     */
    private checkInitialization;
}
/**
 * Convenience function to check all submodules in a repository.
 *
 * @param repoRoot - Root directory of the git repository
 * @param options - Checker options
 * @returns Array of submodule statuses
 */
declare function checkSubmodules(repoRoot: string, options?: SubmoduleCheckerOptions): Promise<SubmoduleStatus[]>;
/**
 * Checks if a directory is a git submodule.
 *
 * @param dirPath - Directory to check
 * @param repoRoot - Root of the parent repository
 * @returns Scan result with submodule information
 */
declare function scanSubmodule(dirPath: string, repoRoot: string): Promise<SubmoduleScanResult>;
/**
 * Checks if a path is within a git submodule.
 *
 * @param checkPath - Path to check
 * @param repoRoot - Root of the parent repository
 * @returns True if path is inside a submodule
 */
declare function isPathInSubmodule(checkPath: string, repoRoot: string): Promise<boolean>;
/**
 * Parses a .gitmodules file directly.
 *
 * @param gitmodulesPath - Path to .gitmodules file
 * @returns Array of submodule paths
 */
declare function parseGitmodulesFile(gitmodulesPath: string): Promise<string[]>;

/**
 * Node.js Version Detection
 *
 * Detects and validates Node.js version for ESM compatibility determination.
 *
 * @module @artk/core/detection/env/node-version
 */

/**
 * Parsed Node version with raw string
 */
interface ParsedNodeVersion extends NodeVersionParsed {
    /**
     * Raw version string (e.g., "18.12.1")
     */
    raw: string;
}
/**
 * ESM compatibility flags
 */
interface ESMCompatibility {
    /**
     * Basic ESM support (Node 18+)
     */
    supportsESM: boolean;
    /**
     * Full ESM support including all features (Node 20+)
     */
    supportsFullESM: boolean;
    /**
     * Supports import.meta.url (Node 18+ in ESM mode)
     */
    supportsImportMeta: boolean;
    /**
     * Supports import.meta.dirname (Node 20.11.0+)
     */
    supportsBuiltinDirname: boolean;
}
/**
 * Parses a Node.js version string into components
 *
 * @param version - Version string (e.g., "v18.12.1" or "18.12.1")
 * @returns Parsed version components
 * @throws Error if version format is invalid
 *
 * @example
 * ```typescript
 * parseNodeVersion('v18.12.1');
 * // { major: 18, minor: 12, patch: 1 }
 * ```
 */
declare function parseNodeVersion(version: string): ParsedNodeVersion;
/**
 * Gets the current Node.js version
 *
 * @returns Parsed version of the running Node.js process
 *
 * @example
 * ```typescript
 * const version = getNodeVersion();
 * console.log(`Running Node ${version.major}.${version.minor}.${version.patch}`);
 * ```
 */
declare function getNodeVersion(): ParsedNodeVersion;
/**
 * Validates that Node.js version meets minimum requirements (FR-009)
 *
 * @param version - Parsed Node version
 * @throws Error if Node version is below minimum supported
 *
 * @example
 * ```typescript
 * validateNodeVersion({ major: 18, minor: 0, patch: 0, raw: '18.0.0' });
 * // No error
 *
 * validateNodeVersion({ major: 16, minor: 20, patch: 0, raw: '16.20.0' });
 * // Throws: Node.js version must be >= 18.0.0
 * ```
 */
declare function validateNodeVersion(version: ParsedNodeVersion): void;
/**
 * Determines ESM compatibility based on Node version (FR-004)
 *
 * @param version - Parsed Node version
 * @returns ESM compatibility flags
 *
 * @example
 * ```typescript
 * determineESMCompatibility({ major: 18, minor: 12, patch: 1, raw: '18.12.1' });
 * // { supportsESM: true, supportsFullESM: false, supportsImportMeta: true, supportsBuiltinDirname: false }
 *
 * determineESMCompatibility({ major: 20, minor: 11, patch: 0, raw: '20.11.0' });
 * // { supportsESM: true, supportsFullESM: true, supportsImportMeta: true, supportsBuiltinDirname: true }
 * ```
 */
declare function determineESMCompatibility(version: ParsedNodeVersion): ESMCompatibility;
/**
 * Checks if version A is greater than or equal to version B
 *
 * @internal
 */
declare function isVersionGte(a: {
    major: number;
    minor: number;
    patch: number;
}, b: {
    major: number;
    minor: number;
    patch: number;
}): boolean;

/**
 * Module System Detection
 *
 * Detects whether a project uses CommonJS or ESM based on package.json.
 *
 * @module @artk/core/detection/env/module-system
 */

/**
 * Minimal package.json type for detection
 */
interface PackageJsonMinimal {
    name?: string;
    version?: string;
    type?: string;
    [key: string]: unknown;
}
/**
 * Result of module system detection from package.json
 */
interface ModuleSystemDetectionResult {
    /**
     * Detected module system
     */
    moduleSystem: ModuleSystem;
    /**
     * How detection was performed
     */
    detectionMethod: DetectionMethod;
    /**
     * Confidence in the detection
     */
    confidence: DetectionConfidence;
    /**
     * Warnings encountered during detection
     */
    warnings: string[];
    /**
     * Raw type field value from package.json
     */
    rawType?: string;
}
/**
 * Gets module system from package.json "type" field (FR-002)
 *
 * Per Node.js specification:
 * - "module" = ESM
 * - "commonjs" or absent = CommonJS
 *
 * @param typeField - Value of "type" field from package.json
 * @returns Module system ('commonjs' or 'esm')
 *
 * @example
 * ```typescript
 * getModuleSystemFromType('module');   // 'esm'
 * getModuleSystemFromType('commonjs'); // 'commonjs'
 * getModuleSystemFromType(undefined);  // 'commonjs'
 * ```
 */
declare function getModuleSystemFromType(typeField: string | undefined): ModuleSystem;
/**
 * Parses package.json content string
 *
 * @param content - Raw package.json content
 * @returns Parsed package.json object
 * @throws Error if content is invalid JSON
 *
 * @example
 * ```typescript
 * const pkg = parsePackageJson('{"name": "test", "type": "module"}');
 * // { name: 'test', type: 'module' }
 * ```
 */
declare function parsePackageJson(content: string): PackageJsonMinimal;
/**
 * Detects module system from package.json in the project root (FR-002)
 *
 * @param projectRoot - Path to project root directory
 * @returns Detection result with module system, method, and warnings
 *
 * @example
 * ```typescript
 * const result = detectModuleSystem('/path/to/project');
 * if (result.moduleSystem === 'esm') {
 *   console.log('Project uses ES Modules');
 * }
 * ```
 */
declare function detectModuleSystem(projectRoot: string): ModuleSystemDetectionResult;

/**
 * TypeScript Configuration Detection
 *
 * Detects TypeScript module settings from tsconfig.json.
 * Uses strip-json-comments to handle JSON with comments.
 *
 * @module @artk/core/detection/env/typescript-config
 */

/**
 * Minimal tsconfig.json structure for detection
 */
interface TsConfigMinimal {
    compilerOptions?: {
        module?: string;
        target?: string;
        moduleResolution?: string;
        [key: string]: unknown;
    };
    extends?: string;
    [key: string]: unknown;
}
/**
 * Result of TypeScript config detection
 */
interface TypeScriptDetectionResult {
    /**
     * TypeScript module setting (e.g., "commonjs", "esnext", "nodenext")
     */
    tsModule: string | null;
    /**
     * Inferred module system based on tsconfig module setting
     */
    inferredModuleSystem: ModuleSystem | null;
    /**
     * Warnings encountered during detection
     */
    warnings: string[];
    /**
     * Whether tsconfig.json was found
     */
    found: boolean;
}
/**
 * Parses tsconfig.json content, handling JSON with comments
 *
 * Uses strip-json-comments to remove single-line and block style comments.
 *
 * @param content - Raw tsconfig.json content (may contain comments)
 * @returns Parsed config object, or null if parsing fails
 *
 * @example
 * ```typescript
 * const config = parseTsConfig(`{
 *   // TypeScript configuration
 *   "compilerOptions": {
 *     "module": "esnext"
 *   }
 * }`);
 * // { compilerOptions: { module: 'esnext' } }
 * ```
 */
declare function parseTsConfig(content: string): TsConfigMinimal | null;
/**
 * Extracts module setting from tsconfig
 *
 * @param config - Parsed tsconfig object
 * @returns Module setting or null if not found
 *
 * @example
 * ```typescript
 * getTsModuleFromConfig({ compilerOptions: { module: 'esnext' } });
 * // 'esnext'
 *
 * getTsModuleFromConfig({});
 * // null
 * ```
 */
declare function getTsModuleFromConfig(config: TsConfigMinimal | null): string | null;
/**
 * Infers module system from TypeScript module setting
 *
 * @param tsModule - TypeScript module setting
 * @returns Inferred module system or null if cannot determine
 *
 * @example
 * ```typescript
 * inferModuleSystemFromTsModule('esnext');   // 'esm'
 * inferModuleSystemFromTsModule('commonjs'); // 'commonjs'
 * inferModuleSystemFromTsModule('unknown');  // null
 * ```
 */
declare function inferModuleSystemFromTsModule(tsModule: string | null): ModuleSystem | null;
/**
 * Detects TypeScript module setting from tsconfig.json (FR-003)
 *
 * @param projectRoot - Path to project root directory
 * @returns Detection result with module setting and inferred system
 *
 * @example
 * ```typescript
 * const result = detectTypeScriptModule('/path/to/project');
 * if (result.tsModule === 'esnext') {
 *   console.log('TypeScript configured for ESM');
 * }
 * ```
 */
declare function detectTypeScriptModule(projectRoot: string): TypeScriptDetectionResult;

/**
 * Detection Confidence Scoring
 *
 * Calculates confidence level based on consistency of detection signals.
 *
 * @module @artk/core/detection/env/confidence
 */

/**
 * Signals used for confidence calculation
 */
interface DetectionSignals {
    /**
     * Value of package.json "type" field
     * undefined = no type field (CommonJS default)
     */
    packageJsonType: string | undefined;
    /**
     * Value of tsconfig.json compilerOptions.module
     * null = no tsconfig or no module field
     */
    tsconfigModule: string | null;
    /**
     * Whether fallback was used (no package.json found)
     */
    usedFallback?: boolean;
    /**
     * Whether detection timed out
     */
    timedOut?: boolean;
}
/**
 * Result of confidence calculation
 */
interface ConfidenceResult {
    /**
     * Confidence level
     */
    confidence: DetectionConfidence;
    /**
     * Recommended module system (prioritizing TypeScript for .ts files)
     */
    recommendedModuleSystem: ModuleSystem;
    /**
     * Warnings about detection
     */
    warnings: string[];
}
/**
 * Calculates detection confidence based on signal consistency (FR-008)
 *
 * Confidence levels:
 * - 'high': package.json and tsconfig agree, or only one present
 * - 'medium': package.json and tsconfig conflict but clear precedence
 * - 'low': fallback used or timeout occurred
 *
 * When there's a conflict, TypeScript config is prioritized for .ts files.
 *
 * @param signals - Detection signals to evaluate
 * @returns Confidence result with recommended module system
 *
 * @example
 * ```typescript
 * // High confidence - both agree
 * calculateConfidence({ packageJsonType: 'module', tsconfigModule: 'esnext' });
 * // { confidence: 'high', recommendedModuleSystem: 'esm', warnings: [] }
 *
 * // Medium confidence - conflict
 * calculateConfidence({ packageJsonType: 'module', tsconfigModule: 'commonjs' });
 * // { confidence: 'medium', recommendedModuleSystem: 'commonjs', warnings: [...] }
 * ```
 */
declare function calculateConfidence(signals: DetectionSignals): ConfidenceResult;

/**
 * Environment Detection Module
 *
 * Automatically detects project environment (CommonJS/ESM, Node version, TypeScript config)
 * for foundation module generation.
 *
 * @module @artk/core/detection/env
 *
 * @example
 * ```typescript
 * import { detectEnvironment } from '@artk/core/detection';
 *
 * const result = detectEnvironment({ projectRoot: '/path/to/project' });
 * console.log(`Module system: ${result.context.moduleSystem}`);
 * console.log(`Template variant: ${result.context.templateVariant}`);
 * ```
 */

/**
 * Extended detection options
 */
interface DetectionOptions extends DetectionOptions$1 {
    /**
     * Project root directory to detect environment for
     */
    projectRoot: string;
    /**
     * Force re-detection even if cached results exist
     * @default false
     */
    forceDetect?: boolean;
    /**
     * Timeout in milliseconds for detection
     * @default 5000
     */
    timeout?: number;
}
/**
 * Detects project environment (FR-001 through FR-010)
 *
 * Performs automatic detection of:
 * - Node.js version (FR-001)
 * - Module system from package.json (FR-002)
 * - TypeScript module setting (FR-003)
 * - ESM compatibility (FR-004)
 *
 * Results are cached to .artk/context.json (FR-005, FR-006).
 *
 * @param options - Detection options
 * @returns Detection result with environment context
 * @throws Error if projectRoot doesn't exist or Node version is unsupported
 *
 * @example
 * ```typescript
 * // Basic detection
 * const result = detectEnvironment({ projectRoot: '/path/to/project' });
 *
 * // Force re-detection (bypass cache)
 * const fresh = detectEnvironment({
 *   projectRoot: '/path/to/project',
 *   forceDetect: true
 * });
 * ```
 */
declare function detectEnvironment(options: DetectionOptions): DetectionResult$1;

export { AG_GRID_PACKAGE_INDICATORS, CONFIDENCE_THRESHOLDS, type ConfidenceResult, DIRECTORY_PATTERNS, type DetectionOptions, type DetectionSignals, type DirectoryAnalysisResult, DirectoryAnalyzer, ENTRY_FILE_PATTERNS, type ESMCompatibility, EntryFileDetector, type EntryFileResult, FRAMEWORK_DETECTION_MAP, FRONTEND_DIRECTORY_PATTERNS, FRONTEND_PACKAGE_INDICATORS, FrontendDetector, type FrontendDetectorOptions, type ModuleSystemDetectionResult, NON_FRONTEND_PATTERNS, type PackageJsonMinimal, type PackageScanResult, PackageScanner, type ParsedNodeVersion, SIGNAL_WEIGHTS, type SignalKey, SubmoduleChecker, type SubmoduleCheckerOptions, type TsConfigMinimal, type TypeScriptDetectionResult, analyzeDirectoryName, calculateConfidence, calculateScore, checkSubmodules, clearWarnedSignalsCache, createSignal, detectEntryFiles, detectEnvironment, detectFrontends, detectModuleSystem, detectSingleFrontend, detectTypeScriptModule, detectionResultsToTargets, determineESMCompatibility, filterByConfidence, getAllEntryPatterns, getConfidenceFromScore, getModuleSystemFromType, getNodeVersion, getSignalCategory, getSignalWeight, getTsModuleFromConfig, hasEntryFiles, hasPackageJson, inferModuleSystemFromTsModule, isAgGridEnterprisePackage, isAgGridPackage, isFrontendDirectory, isFrontendPackage, isNonFrontendDirectory, isPathInSubmodule, isVersionGte, matchesFrontendDirectoryPattern, parseGitmodulesFile, parseNodeVersion, parsePackageJson, parseTsConfig, scanForFrontendDirectories, scanPackageJson, scanSubmodule, validateNodeVersion };
