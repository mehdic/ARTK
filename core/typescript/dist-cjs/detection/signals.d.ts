/**
 * @module detection/signals
 * @description Signal scoring constants and utilities for frontend detection.
 *
 * Implements the multi-signal detection approach with confidence scoring
 * as defined in the architecture specification.
 *
 * @example
 * ```typescript
 * import { SIGNAL_WEIGHTS, calculateScore, getConfidenceFromScore } from '@artk/core/detection';
 *
 * const score = calculateScore(['package-dependency:react', 'entry-file:src/App.tsx']);
 * const confidence = getConfidenceFromScore(score); // 'high'
 * ```
 */
import type { ArtkConfidenceLevel, ArtkDetectionSignalCategory } from '../types/detection.js';
/**
 * Signal weight definitions for frontend detection.
 *
 * Weights are based on the research.md specification:
 * - Package dependencies (30-35): Most reliable indicator
 * - Entry files (15-20): Strong secondary indicator
 * - Directory names (15): Medium confidence
 * - index.html presence (10): Low confidence
 */
export declare const SIGNAL_WEIGHTS: {
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
export type SignalKey = keyof typeof SIGNAL_WEIGHTS;
/**
 * Confidence level thresholds.
 * Score ≥40 = high, 20-39 = medium, <20 = low
 */
export declare const CONFIDENCE_THRESHOLDS: {
    readonly HIGH: 40;
    readonly MEDIUM: 20;
};
/**
 * Framework detection mappings.
 * Maps primary package dependencies to their target types.
 */
export declare const FRAMEWORK_DETECTION_MAP: Record<string, import('../types/target.js').ArtkTargetType>;
/**
 * Directory patterns that suggest frontend applications.
 */
export declare const FRONTEND_DIRECTORY_PATTERNS: readonly ["frontend", "client", "web", "webapp", "web-app", "web-client", "app", "ui"];
/**
 * Package.json dependencies that indicate a frontend project.
 */
export declare const FRONTEND_PACKAGE_INDICATORS: readonly ["react", "react-dom", "vue", "@angular/core", "svelte", "solid-js", "next", "nuxt", "gatsby", "astro", "remix", "@remix-run/react", "vite", "webpack", "parcel", "@vitejs/plugin-react", "@vitejs/plugin-vue", "ag-grid-community", "ag-grid-enterprise", "ag-grid-react", "ag-grid-vue", "ag-grid-vue3", "ag-grid-angular", "@ag-grid-community/core", "@ag-grid-enterprise/core"];
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
export declare function calculateScore(signals: string[]): number;
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
export declare function getConfidenceFromScore(score: number): ArtkConfidenceLevel;
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
export declare function getSignalCategory(signal: string): ArtkDetectionSignalCategory | undefined;
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
export declare function createSignal(category: ArtkDetectionSignalCategory, source: string): string;
/**
 * Gets the weight for a specific signal.
 *
 * @param signal - Signal identifier
 * @returns Weight value or 0 if signal not recognized
 */
export declare function getSignalWeight(signal: string): number;
/**
 * Clears the cache of warned signals.
 * Useful for testing or when you want to re-enable warnings.
 */
export declare function clearWarnedSignalsCache(): void;
/**
 * Checks if a package name indicates a frontend project.
 *
 * @param packageName - Name of the package dependency
 * @returns True if the package suggests a frontend project
 */
export declare function isFrontendPackage(packageName: string): boolean;
/**
 * Checks if a directory name matches known frontend directory patterns.
 * Simple string matching - for full directory analysis use DirectoryAnalyzer.
 *
 * @param dirName - Name of the directory
 * @returns True if the directory name suggests a frontend project
 */
export declare function matchesFrontendDirectoryPattern(dirName: string): boolean;
/**
 * AG Grid package indicators for detection.
 * Used by the grid module to determine if AG Grid helpers should be available.
 */
export declare const AG_GRID_PACKAGE_INDICATORS: readonly ["ag-grid-community", "ag-grid-enterprise", "ag-grid-react", "ag-grid-vue", "ag-grid-vue3", "ag-grid-angular", "@ag-grid-community/core", "@ag-grid-enterprise/core"];
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
export declare function isAgGridPackage(packageName: string): boolean;
/**
 * Checks if a package name indicates AG Grid Enterprise usage.
 *
 * @param packageName - Name of the package dependency
 * @returns True if the package indicates AG Grid Enterprise is used
 */
export declare function isAgGridEnterprisePackage(packageName: string): boolean;
//# sourceMappingURL=signals.d.ts.map