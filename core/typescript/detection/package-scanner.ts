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

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { ArtkTargetType } from '../types/target.js';
import type { DetectionSignal } from '../types/detection.js';
import {
  createSignal,
  FRAMEWORK_DETECTION_MAP,
  FRONTEND_PACKAGE_INDICATORS,
  getSignalWeight,
} from './signals.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('detection', 'package-scanner');

/**
 * Result of scanning a package.json file.
 */
export interface PackageScanResult {
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
 * Package.json structure (partial).
 */
interface PackageJson {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

/**
 * Scanner for package.json files.
 */
export class PackageScanner {
  /**
   * Scans a package.json file for frontend dependencies.
   *
   * @param dirPath - Directory containing package.json
   * @returns Scan result with signals and detected type
   */
  async scan(dirPath: string): Promise<PackageScanResult> {
    const packageJsonPath = path.join(dirPath, 'package.json');

    const emptyResult: PackageScanResult = {
      found: false,
      packageJsonPath: null,
      packageName: null,
      signals: [],
      detailedSignals: [],
      score: 0,
      detectedType: null,
      allDependencies: [],
    };

    if (!existsSync(packageJsonPath)) {
      return emptyResult;
    }

    try {
      const content = await readFile(packageJsonPath, 'utf-8');
      const pkg: PackageJson = JSON.parse(content);

      return this.analyzePackage(pkg, packageJsonPath);
    } catch (error) {
      // Log error for debugging but continue gracefully
      logger.warn('Failed to parse package.json (treating as empty)', {
        path: packageJsonPath,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        ...emptyResult,
        packageJsonPath,
      };
    }
  }

  /**
   * Analyzes a parsed package.json for frontend indicators.
   */
  private analyzePackage(
    pkg: PackageJson,
    packageJsonPath: string
  ): PackageScanResult {
    const allDeps = this.getAllDependencies(pkg);
    const signals: string[] = [];
    const detailedSignals: DetectionSignal[] = [];

    // Check for frontend framework/tool dependencies
    for (const dep of allDeps) {
      if (this.isFrontendDependency(dep)) {
        const signal = createSignal('package-dependency', dep);
        const weight = getSignalWeight(signal);

        if (weight > 0) {
          signals.push(signal);
          detailedSignals.push({
            type: 'package-dependency',
            source: signal,
            weight,
            description: `Found ${dep} in package.json dependencies`,
          });
        }
      }
    }

    // Calculate total score
    const score = detailedSignals.reduce((sum, s) => sum + s.weight, 0);

    // Detect primary framework type
    const detectedType = this.detectFrameworkType(allDeps);

    return {
      found: true,
      packageJsonPath,
      packageName: pkg.name ?? null,
      signals,
      detailedSignals,
      score,
      detectedType,
      allDependencies: allDeps,
    };
  }

  /**
   * Gets all dependencies from package.json (deps + devDeps + peerDeps).
   */
  private getAllDependencies(pkg: PackageJson): string[] {
    const deps = new Set<string>();

    if (pkg.dependencies) {
      Object.keys(pkg.dependencies).forEach((d) => deps.add(d));
    }
    if (pkg.devDependencies) {
      Object.keys(pkg.devDependencies).forEach((d) => deps.add(d));
    }
    if (pkg.peerDependencies) {
      Object.keys(pkg.peerDependencies).forEach((d) => deps.add(d));
    }

    return Array.from(deps);
  }

  /**
   * Checks if a dependency indicates a frontend project.
   */
  private isFrontendDependency(dep: string): boolean {
    // Direct match
    if (
      FRONTEND_PACKAGE_INDICATORS.includes(
        dep as (typeof FRONTEND_PACKAGE_INDICATORS)[number]
      )
    ) {
      return true;
    }

    // Check framework detection map
    if (dep in FRAMEWORK_DETECTION_MAP) {
      return true;
    }

    // Check for scoped packages that indicate frontend
    const scopedPatterns = [
      /^@angular\//,
      /^@vue\//,
      /^@vitejs\//,
      /^@remix-run\//,
      /^@sveltejs\//,
      /^@astrojs\//,
      /^@nuxt\//,
      /^@next\//,
    ];

    return scopedPatterns.some((pattern) => pattern.test(dep));
  }

  /**
   * Detects the primary framework type from dependencies.
   * Priority: meta-frameworks > frameworks > build tools
   */
  private detectFrameworkType(deps: string[]): ArtkTargetType | null {
    // Priority 1: Meta-frameworks (Next, Nuxt, etc.)
    if (deps.includes('next')) return 'next';
    if (deps.includes('nuxt') || deps.includes('nuxt3')) return 'nuxt';

    // Priority 2: Core frameworks
    if (deps.includes('react') || deps.includes('react-dom')) return 'react-spa';
    if (deps.includes('vue')) return 'vue-spa';
    if (
      deps.includes('@angular/core') ||
      deps.includes('@angular/platform-browser')
    ) {
      return 'angular';
    }

    // Priority 3: Other frameworks
    if (deps.includes('svelte')) return 'other';
    if (deps.includes('astro')) return 'other';
    if (deps.includes('solid-js')) return 'other';

    // Priority 4: Check for framework plugins in build tools
    const hasReactVitePlugin = deps.includes('@vitejs/plugin-react');
    const hasVueVitePlugin = deps.includes('@vitejs/plugin-vue');
    const hasReactWebpackPlugin =
      deps.includes('babel-preset-react-app') ||
      deps.includes('@babel/preset-react');

    if (hasReactVitePlugin || hasReactWebpackPlugin) return 'react-spa';
    if (hasVueVitePlugin) return 'vue-spa';

    // No clear framework detected
    return null;
  }
}

/**
 * Convenience function to scan a package.json file.
 *
 * @param dirPath - Directory containing package.json
 * @returns Scan result
 */
export async function scanPackageJson(
  dirPath: string
): Promise<PackageScanResult> {
  const scanner = new PackageScanner();
  return scanner.scan(dirPath);
}

/**
 * Checks if a directory has a package.json file.
 *
 * @param dirPath - Directory to check
 * @returns True if package.json exists
 */
export function hasPackageJson(dirPath: string): boolean {
  return existsSync(path.join(dirPath, 'package.json'));
}
