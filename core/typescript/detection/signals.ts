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
import { createLogger } from '../utils/logger.js';

const logger = createLogger('detection', 'signals');

/**
 * Track unknown signals to avoid spamming warnings.
 * Only warn once per unique signal per process lifecycle.
 * Limited to MAX_WARNED_SIGNALS to prevent memory leaks in long-running processes.
 */
const MAX_WARNED_SIGNALS = 1000;
const warnedSignals = new Set<string>();

/**
 * Signal weight definitions for frontend detection.
 *
 * Weights are based on the research.md specification:
 * - Package dependencies (30-35): Most reliable indicator
 * - Entry files (15-20): Strong secondary indicator
 * - Directory names (15): Medium confidence
 * - index.html presence (10): Low confidence
 */
export const SIGNAL_WEIGHTS = {
  // Package.json framework dependencies (highest weight)
  'package-dependency:react': 30,
  'package-dependency:vue': 30,
  'package-dependency:@angular/core': 30,
  'package-dependency:svelte': 30,

  // Package.json meta-framework dependencies (highest weight)
  'package-dependency:next': 35,
  'package-dependency:nuxt': 35,
  'package-dependency:gatsby': 35,
  'package-dependency:remix': 35,
  'package-dependency:astro': 35,

  // Package.json build tool dependencies (medium weight)
  'package-dependency:vite': 20,
  'package-dependency:webpack': 20,
  'package-dependency:parcel': 20,
  'package-dependency:rollup': 15,
  'package-dependency:esbuild': 15,

  // Entry files - React/TypeScript (medium-high weight)
  'entry-file:src/App.tsx': 20,
  'entry-file:src/App.jsx': 20,
  'entry-file:src/app.tsx': 20,
  'entry-file:src/app.jsx': 20,
  'entry-file:src/main.tsx': 15,
  'entry-file:src/main.jsx': 15,
  'entry-file:src/index.tsx': 15,
  'entry-file:src/index.jsx': 15,

  // Entry files - Vue (vue.config.js or vite.config.ts for disambiguation)
  'entry-file:src/App.vue': 20,
  'entry-file:vue.config.js': 20,
  // Shared entry files (Vue/Angular both use these - disambiguation via config files)
  'entry-file:src/main.ts': 15,
  'entry-file:src/main.js': 15,

  // Entry files - Next.js
  'entry-file:app/page.tsx': 20,
  'entry-file:app/page.jsx': 20,
  'entry-file:app/layout.tsx': 15,
  'entry-file:pages/index.tsx': 15,
  'entry-file:pages/index.jsx': 15,
  'entry-file:pages/_app.tsx': 15,
  'entry-file:pages/_app.jsx': 15,

  // Entry files - Nuxt
  'entry-file:pages/index.vue': 15,
  'entry-file:app.vue': 15,
  'entry-file:nuxt.config.ts': 20,
  'entry-file:nuxt.config.js': 20,

  // Entry files - Angular (angular.json is the definitive indicator)
  'entry-file:src/app/app.component.ts': 20,
  'entry-file:angular.json': 25,
  'entry-file:src/app/app.module.ts': 15,

  // Directory names (medium weight)
  'directory-name:frontend': 15,
  'directory-name:client': 15,
  'directory-name:web': 10,
  'directory-name:app': 10,
  'directory-name:ui': 10,
  'directory-name:webapp': 15,
  'directory-name:web-app': 15,
  'directory-name:web-client': 15,

  // index.html presence (low weight)
  'index-html:public/index.html': 10,
  'index-html:index.html': 10,
  'index-html:src/index.html': 10,

  // Config files (various weights)
  'config-file:vite.config.ts': 20,
  'config-file:vite.config.js': 20,
  'config-file:webpack.config.js': 15,
  'config-file:next.config.js': 25,
  'config-file:next.config.mjs': 25,
  'config-file:nuxt.config.ts': 25,
  'config-file:angular.json': 25,
  'config-file:svelte.config.js': 20,
  'config-file:astro.config.mjs': 20,

  // AG Grid dependencies (indicates data-heavy frontend)
  'package-dependency:ag-grid-community': 25,
  'package-dependency:ag-grid-enterprise': 30,
  'package-dependency:ag-grid-react': 25,
  'package-dependency:ag-grid-vue': 25,
  'package-dependency:ag-grid-vue3': 25,
  'package-dependency:ag-grid-angular': 25,
  'package-dependency:@ag-grid-community/core': 25,
  'package-dependency:@ag-grid-enterprise/core': 30,
} as const;

/**
 * Type for valid signal keys.
 */
export type SignalKey = keyof typeof SIGNAL_WEIGHTS;

/**
 * Confidence level thresholds.
 * Score ≥40 = high, 20-39 = medium, <20 = low
 */
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 40,
  MEDIUM: 20,
} as const;

/**
 * Framework detection mappings.
 * Maps primary package dependencies to their target types.
 */
export const FRAMEWORK_DETECTION_MAP: Record<string, import('../types/target.js').ArtkTargetType> = {
  'react': 'react-spa',
  'react-dom': 'react-spa',
  'vue': 'vue-spa',
  '@angular/core': 'angular',
  '@angular/platform-browser': 'angular',
  'next': 'next',
  'nuxt': 'nuxt',
  'nuxt3': 'nuxt',
  'gatsby': 'react-spa', // Gatsby uses React
  'svelte': 'other',
  'astro': 'other',
  'remix': 'react-spa', // Remix uses React
};

/**
 * Directory patterns that suggest frontend applications.
 */
export const FRONTEND_DIRECTORY_PATTERNS = [
  'frontend',
  'client',
  'web',
  'webapp',
  'web-app',
  'web-client',
  'app',
  'ui',
] as const;

/**
 * Package.json dependencies that indicate a frontend project.
 */
export const FRONTEND_PACKAGE_INDICATORS = [
  // Frameworks
  'react',
  'react-dom',
  'vue',
  '@angular/core',
  'svelte',
  'solid-js',

  // Meta-frameworks
  'next',
  'nuxt',
  'gatsby',
  'astro',
  'remix',
  '@remix-run/react',

  // Build tools (secondary indicators)
  'vite',
  'webpack',
  'parcel',
  '@vitejs/plugin-react',
  '@vitejs/plugin-vue',

  // Data grid libraries (indicates data-heavy frontend)
  'ag-grid-community',
  'ag-grid-enterprise',
  'ag-grid-react',
  'ag-grid-vue',
  'ag-grid-vue3',
  'ag-grid-angular',
  '@ag-grid-community/core',
  '@ag-grid-enterprise/core',
] as const;

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
export function calculateScore(signals: string[]): number {
  return signals.reduce((score, signal) => {
    // Use getSignalWeight for consistent behavior (logging unknown signals)
    return score + getSignalWeight(signal);
  }, 0);
}

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
export function getConfidenceFromScore(score: number): ArtkConfidenceLevel {
  if (score >= CONFIDENCE_THRESHOLDS.HIGH) return 'high';
  if (score >= CONFIDENCE_THRESHOLDS.MEDIUM) return 'medium';
  return 'low';
}

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
export function getSignalCategory(
  signal: string
): ArtkDetectionSignalCategory | undefined {
  const [category] = signal.split(':');
  const validCategories: ArtkDetectionSignalCategory[] = [
    'package-dependency',
    'entry-file',
    'directory-name',
    'index-html',
    'config-file',
  ];

  return validCategories.includes(category as ArtkDetectionSignalCategory)
    ? (category as ArtkDetectionSignalCategory)
    : undefined;
}

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
export function createSignal(
  category: ArtkDetectionSignalCategory,
  source: string
): string {
  return `${category}:${source}`;
}

/**
 * Gets the weight for a specific signal.
 *
 * @param signal - Signal identifier
 * @returns Weight value or 0 if signal not recognized
 */
export function getSignalWeight(signal: string): number {
  const weight = SIGNAL_WEIGHTS[signal as SignalKey];
  if (weight === undefined) {
    // Rate limit warnings - only warn once per unique signal
    if (!warnedSignals.has(signal)) {
      // Prevent memory leak by clearing when threshold reached
      if (warnedSignals.size >= MAX_WARNED_SIGNALS) {
        warnedSignals.clear();
      }
      warnedSignals.add(signal);
      logger.warn('Unknown detection signal (returning weight 0)', {
        signal,
        hint: 'Check for typos or add the signal to SIGNAL_WEIGHTS',
      });
    }
    return 0;
  }
  return weight;
}

/**
 * Clears the cache of warned signals.
 * Useful for testing or when you want to re-enable warnings.
 */
export function clearWarnedSignalsCache(): void {
  warnedSignals.clear();
}

/**
 * Checks if a package name indicates a frontend project.
 *
 * @param packageName - Name of the package dependency
 * @returns True if the package suggests a frontend project
 */
export function isFrontendPackage(packageName: string): boolean {
  return FRONTEND_PACKAGE_INDICATORS.includes(
    packageName as (typeof FRONTEND_PACKAGE_INDICATORS)[number]
  );
}

/**
 * Checks if a directory name matches known frontend directory patterns.
 * Simple string matching - for full directory analysis use DirectoryAnalyzer.
 *
 * @param dirName - Name of the directory
 * @returns True if the directory name suggests a frontend project
 */
export function matchesFrontendDirectoryPattern(dirName: string): boolean {
  const normalized = dirName.toLowerCase();
  return FRONTEND_DIRECTORY_PATTERNS.some((pattern) =>
    normalized.includes(pattern)
  );
}

/**
 * AG Grid package indicators for detection.
 * Used by the grid module to determine if AG Grid helpers should be available.
 */
export const AG_GRID_PACKAGE_INDICATORS = [
  'ag-grid-community',
  'ag-grid-enterprise',
  'ag-grid-react',
  'ag-grid-vue',
  'ag-grid-vue3',
  'ag-grid-angular',
  '@ag-grid-community/core',
  '@ag-grid-enterprise/core',
] as const;

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
export function isAgGridPackage(packageName: string): boolean {
  return AG_GRID_PACKAGE_INDICATORS.includes(
    packageName as (typeof AG_GRID_PACKAGE_INDICATORS)[number]
  );
}

/**
 * Checks if a package name indicates AG Grid Enterprise usage.
 *
 * @param packageName - Name of the package dependency
 * @returns True if the package indicates AG Grid Enterprise is used
 */
export function isAgGridEnterprisePackage(packageName: string): boolean {
  return (
    packageName === 'ag-grid-enterprise' ||
    packageName === '@ag-grid-enterprise/core'
  );
}
