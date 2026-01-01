/**
 * @module types/detection
 * @description Detection type definitions for ARTK E2E independent architecture.
 * Defines types for frontend detection heuristics during /init.
 */

import type { ArtkTargetType } from './target.js';

/**
 * Confidence levels for detection results.
 * Based on weighted scoring: ≥40=high, 20-39=medium, <20=low
 */
export type ArtkConfidenceLevel = 'high' | 'medium' | 'low';

/**
 * Detection signal categories.
 */
export type ArtkDetectionSignalCategory =
  | 'package-dependency'
  | 'entry-file'
  | 'directory-name'
  | 'index-html'
  | 'config-file';

/**
 * A single detection signal with its weight and source.
 *
 * @example
 * ```typescript
 * const signal: DetectionSignal = {
 *   type: 'package-dependency',
 *   source: 'package.json:react',
 *   weight: 35,
 *   description: 'Found react in dependencies'
 * };
 * ```
 */
export interface DetectionSignal {
  /**
   * Category of the signal.
   */
  type: ArtkDetectionSignalCategory;

  /**
   * Source identifier (e.g., 'package.json:react', 'file:src/App.tsx').
   */
  source: string;

  /**
   * Weight contribution to the overall score.
   */
  weight: number;

  /**
   * Human-readable description of what was detected.
   */
  description?: string;
}

/**
 * Result of frontend detection heuristics during /init.
 * Transient - not persisted, used only during detection.
 *
 * @example
 * ```typescript
 * const result: DetectionResult = {
 *   path: '/absolute/path/to/frontend',
 *   relativePath: '../frontend',
 *   confidence: 'high',
 *   type: 'react-spa',
 *   signals: ['package.json:react', 'file:src/App.tsx'],
 *   score: 55,
 *   detailedSignals: [
 *     { type: 'package-dependency', source: 'package.json:react', weight: 35 },
 *     { type: 'entry-file', source: 'file:src/App.tsx', weight: 20 }
 *   ]
 * };
 * ```
 */
export interface DetectionResult {
  /**
   * Absolute path to detected frontend.
   */
  path: string;

  /**
   * Relative path from artk-e2e/ to the frontend.
   */
  relativePath: string;

  /**
   * Detection confidence level.
   * Based on weighted scoring: ≥40=high, 20-39=medium, <20=low
   */
  confidence: ArtkConfidenceLevel;

  /**
   * Detected application type.
   */
  type: ArtkTargetType;

  /**
   * Detection signal identifiers that matched.
   * @example ['package.json:react', 'file:src/App.tsx', 'dirname:frontend']
   */
  signals: string[];

  /**
   * Combined score from weighted signals.
   */
  score: number;

  /**
   * Detailed signal information (optional, for debugging).
   */
  detailedSignals?: DetectionSignal[];
}

/**
 * Score thresholds for confidence levels.
 */
export const CONFIDENCE_THRESHOLDS = {
  high: 40,
  medium: 20,
  // low: < 20
} as const;

/**
 * Default signal weights for detection.
 */
export const DEFAULT_SIGNAL_WEIGHTS = {
  // Package.json dependencies (highest weight)
  'package-dependency:react': 35,
  'package-dependency:vue': 35,
  'package-dependency:@angular/core': 35,
  'package-dependency:next': 30,
  'package-dependency:nuxt': 30,

  // Entry files
  'entry-file:src/App.tsx': 20,
  'entry-file:src/App.jsx': 20,
  'entry-file:src/App.vue': 20,
  'entry-file:src/main.ts': 15,
  'entry-file:src/main.tsx': 15,
  'entry-file:app/page.tsx': 20, // Next.js App Router
  'entry-file:pages/index.tsx': 15, // Next.js Pages Router
  'entry-file:pages/index.vue': 15, // Nuxt

  // Directory names
  'directory-name:frontend': 15,
  'directory-name:client': 15,
  'directory-name:web': 10,
  'directory-name:app': 10,

  // Index.html presence
  'index-html:public/index.html': 10,
  'index-html:index.html': 10,
} as const;

/**
 * Determines confidence level from a score.
 */
export function getConfidenceLevel(score: number): ArtkConfidenceLevel {
  if (score >= CONFIDENCE_THRESHOLDS.high) return 'high';
  if (score >= CONFIDENCE_THRESHOLDS.medium) return 'medium';
  return 'low';
}

/**
 * Type guard to check if a value is a valid DetectionResult.
 */
export function isDetectionResult(value: unknown): value is DetectionResult {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;

  // Check path
  if (typeof obj.path !== 'string') return false;

  // Check relativePath
  if (typeof obj.relativePath !== 'string') return false;

  // Check confidence
  if (!['high', 'medium', 'low'].includes(obj.confidence as string)) {
    return false;
  }

  // Check type
  if (
    !['react-spa', 'vue-spa', 'angular', 'next', 'nuxt', 'other'].includes(
      obj.type as string
    )
  ) {
    return false;
  }

  // Check signals
  if (!Array.isArray(obj.signals)) return false;
  if (!obj.signals.every((s) => typeof s === 'string')) return false;

  // Check score
  if (typeof obj.score !== 'number') return false;

  return true;
}
