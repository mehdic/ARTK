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

import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import type { ArtkTargetType } from '../types/target.js';
import type { DetectionSignal } from '../types/detection.js';
import { createSignal, getSignalWeight } from './signals.js';

/**
 * Entry file patterns to check, organized by framework.
 */
export const ENTRY_FILE_PATTERNS = {
  // React/Generic SPA
  react: [
    'src/App.tsx',
    'src/App.jsx',
    'src/app.tsx',
    'src/app.jsx',
    'src/main.tsx',
    'src/main.jsx',
    'src/index.tsx',
    'src/index.jsx',
  ],

  // Vue (vue.config.js is definitive indicator for Vue 2 CLI projects)
  vue: ['src/App.vue', 'src/main.ts', 'src/main.js', 'vue.config.js'],

  // Next.js (App Router)
  'next-app': ['app/page.tsx', 'app/page.jsx', 'app/layout.tsx', 'app/layout.jsx'],

  // Next.js (Pages Router)
  'next-pages': [
    'pages/index.tsx',
    'pages/index.jsx',
    'pages/_app.tsx',
    'pages/_app.jsx',
    'pages/_document.tsx',
    'pages/_document.jsx',
  ],

  // Nuxt
  nuxt: [
    'pages/index.vue',
    'app.vue',
    'nuxt.config.ts',
    'nuxt.config.js',
  ],

  // Angular (angular.json is definitive, app.module.ts is legacy but still common)
  angular: [
    'src/app/app.component.ts',
    'src/app/app.module.ts',
    'src/main.ts',
    'angular.json',
  ],

  // Config files (secondary indicators)
  config: [
    'vite.config.ts',
    'vite.config.js',
    'webpack.config.js',
    'webpack.config.ts',
    'next.config.js',
    'next.config.mjs',
    'next.config.ts',
    'svelte.config.js',
    'astro.config.mjs',
  ],
} as const;

/**
 * Result of entry file detection.
 */
export interface EntryFileResult {
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
export class EntryFileDetector {
  /**
   * Detects entry files in a directory.
   *
   * @param dirPath - Directory to scan for entry files
   * @returns Detection result with signals and type
   */
  async detect(dirPath: string): Promise<EntryFileResult> {
    const foundFiles: string[] = [];
    const signals: string[] = [];
    const detailedSignals: DetectionSignal[] = [];

    // Check all entry file patterns
    for (const [category, patterns] of Object.entries(ENTRY_FILE_PATTERNS)) {
      for (const pattern of patterns) {
        const fullPath = path.join(dirPath, pattern);

        if (existsSync(fullPath) && this.isFile(fullPath)) {
          foundFiles.push(pattern);

          // Determine signal category
          const signalCategory = pattern.includes('config')
            ? 'config-file'
            : 'entry-file';
          const signal = createSignal(signalCategory, pattern);
          const weight = getSignalWeight(signal);

          if (weight > 0) {
            signals.push(signal);
            detailedSignals.push({
              type: signalCategory,
              source: signal,
              weight,
              description: `Found ${category} entry file: ${pattern}`,
            });
          }
        }
      }
    }

    // Calculate total score
    const score = detailedSignals.reduce((sum, s) => sum + s.weight, 0);

    // Detect framework type from entry files
    const detectedType = this.detectTypeFromFiles(foundFiles);

    return {
      foundFiles,
      signals,
      detailedSignals,
      score,
      detectedType,
    };
  }

  /**
   * Checks if a path is a file (not a directory).
   */
  private isFile(filePath: string): boolean {
    try {
      return statSync(filePath).isFile();
    } catch {
      return false;
    }
  }

  /**
   * Detects the framework type from found entry files.
   */
  private detectTypeFromFiles(files: string[]): ArtkTargetType | null {
    // Priority 1: Next.js (either router)
    const hasNextApp = files.some((f) =>
      ENTRY_FILE_PATTERNS['next-app'].includes(f as any)
    );
    const hasNextPages = files.some((f) =>
      ENTRY_FILE_PATTERNS['next-pages'].includes(f as any)
    );
    const hasNextConfig = files.some(
      (f) => f.startsWith('next.config')
    );

    if (hasNextApp || hasNextPages || hasNextConfig) {
      return 'next';
    }

    // Priority 2: Nuxt
    const hasNuxt = files.some(
      (f) =>
        ENTRY_FILE_PATTERNS.nuxt.includes(f as any) ||
        f.startsWith('nuxt.config')
    );
    if (hasNuxt) {
      return 'nuxt';
    }

    // Priority 3: Angular
    const hasAngular = files.some((f) =>
      ENTRY_FILE_PATTERNS.angular.includes(f as any)
    );
    if (hasAngular) {
      return 'angular';
    }

    // Priority 4: Vue
    const hasVue = files.some((f) =>
      ENTRY_FILE_PATTERNS.vue.includes(f as any)
    );
    if (hasVue) {
      return 'vue-spa';
    }

    // Priority 5: React (most generic)
    const hasReact = files.some((f) =>
      ENTRY_FILE_PATTERNS.react.includes(f as any)
    );
    if (hasReact) {
      return 'react-spa';
    }

    // No clear type detected
    return null;
  }
}

/**
 * Convenience function to detect entry files.
 *
 * @param dirPath - Directory to scan
 * @returns Detection result
 */
export async function detectEntryFiles(
  dirPath: string
): Promise<EntryFileResult> {
  const detector = new EntryFileDetector();
  return detector.detect(dirPath);
}

/**
 * Checks if a directory has any common frontend entry files.
 *
 * @param dirPath - Directory to check
 * @returns True if any entry files are found
 */
export async function hasEntryFiles(dirPath: string): Promise<boolean> {
  const result = await detectEntryFiles(dirPath);
  return result.foundFiles.length > 0;
}

/**
 * Gets the list of all entry file patterns to check.
 *
 * @returns Flat list of all entry file patterns
 */
export function getAllEntryPatterns(): string[] {
  return Object.values(ENTRY_FILE_PATTERNS).flat();
}
