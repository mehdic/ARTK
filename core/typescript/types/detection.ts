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
 *   source: 'package-dependency:react',
 *   weight: 30,
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
   * Source identifier - the full signal string
   * (e.g., 'package-dependency:react', 'entry-file:src/App.tsx').
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
 *   signals: ['package-dependency:react', 'entry-file:src/App.tsx'],
 *   score: 50,
 *   detailedSignals: [
 *     { type: 'package-dependency', source: 'package-dependency:react', weight: 30 },
 *     { type: 'entry-file', source: 'entry-file:src/App.tsx', weight: 20 }
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
   * @example ['package-dependency:react', 'entry-file:src/App.tsx', 'directory-name:frontend']
   */
  signals: string[];

  /**
   * Combined score from weighted signals.
   */
  score: number;

  /**
   * Detailed signal information for debugging and analysis.
   */
  detailedSignals: DetectionSignal[];
}

// Note: Signal weights and confidence thresholds are defined in detection/signals.ts
// Import SIGNAL_WEIGHTS, CONFIDENCE_THRESHOLDS, and getConfidenceFromScore from there.
// This file only contains type definitions to avoid duplication.

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

  // Check detailedSignals (required array of DetectionSignal objects)
  if (!Array.isArray(obj.detailedSignals)) return false;
  if (
    !obj.detailedSignals.every(
      (s) =>
        typeof s === 'object' &&
        s !== null &&
        typeof (s as Record<string, unknown>).type === 'string' &&
        typeof (s as Record<string, unknown>).source === 'string' &&
        typeof (s as Record<string, unknown>).weight === 'number'
    )
  ) {
    return false;
  }

  return true;
}
