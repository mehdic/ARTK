/**
 * Detection Confidence Scoring
 *
 * Calculates confidence level based on consistency of detection signals.
 *
 * @module @artk/core/detection/env/confidence
 */

import type { ModuleSystem, DetectionConfidence } from '../../types/environment-context.js';

/**
 * Signals used for confidence calculation
 */
export interface DetectionSignals {
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
export interface ConfidenceResult {
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
 * TypeScript module values that indicate ESM
 */
const ESM_TS_MODULES = new Set([
  'es6',
  'es2015',
  'es2020',
  'es2022',
  'esnext',
  'nodenext',
  'node16',
  'node18',
]);

/**
 * Determines if a tsconfig module setting indicates ESM
 */
function isTsModuleESM(tsModule: string | null): boolean | null {
  if (!tsModule) return null;
  return ESM_TS_MODULES.has(tsModule.toLowerCase());
}

/**
 * Determines if package.json type indicates ESM
 */
function isPackageTypeESM(packageType: string | undefined): boolean {
  return packageType === 'module';
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
export function calculateConfidence(signals: DetectionSignals): ConfidenceResult {
  const warnings: string[] = [];

  // Low confidence: fallback or timeout
  if (signals.usedFallback || signals.timedOut) {
    const reason = signals.timedOut ? 'detection timed out' : 'fallback was used';
    warnings.push(`Low confidence: ${reason}`);

    return {
      confidence: 'low',
      recommendedModuleSystem: 'commonjs', // Safe default
      warnings,
    };
  }

  const packageIsESM = isPackageTypeESM(signals.packageJsonType);
  const tsIsESM = isTsModuleESM(signals.tsconfigModule);

  // Case 1: Only package.json signal available
  if (tsIsESM === null) {
    return {
      confidence: 'high',
      recommendedModuleSystem: packageIsESM ? 'esm' : 'commonjs',
      warnings,
    };
  }

  // Case 2: Only tsconfig signal available (package.json has no type field)
  if (signals.packageJsonType === undefined) {
    // No explicit package type, tsconfig determines
    return {
      confidence: 'high',
      recommendedModuleSystem: tsIsESM ? 'esm' : 'commonjs',
      warnings,
    };
  }

  // Case 3: Both signals available - check for agreement
  const packageModuleSystem: ModuleSystem = packageIsESM ? 'esm' : 'commonjs';
  const tsModuleSystem: ModuleSystem = tsIsESM ? 'esm' : 'commonjs';

  if (packageModuleSystem === tsModuleSystem) {
    // Agreement
    return {
      confidence: 'high',
      recommendedModuleSystem: packageModuleSystem,
      warnings,
    };
  }

  // Case 4: Conflict - package.json and tsconfig disagree
  warnings.push(
    `Conflicting module system settings: package.json indicates "${packageModuleSystem}", ` +
    `tsconfig.json indicates "${tsModuleSystem}".`
  );
  warnings.push(
    'TypeScript configuration is prioritized for .ts files (recommended for foundation modules).'
  );

  return {
    confidence: 'medium',
    recommendedModuleSystem: tsModuleSystem, // Prioritize TypeScript config
    warnings,
  };
}
