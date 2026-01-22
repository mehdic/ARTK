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
export declare function calculateConfidence(signals: DetectionSignals): ConfidenceResult;
//# sourceMappingURL=confidence.d.ts.map