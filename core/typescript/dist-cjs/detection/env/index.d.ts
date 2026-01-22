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
import type { DetectionOptions as BaseDetectionOptions, DetectionResult } from '../../types/environment-context.js';
export * from './node-version.js';
export * from './module-system.js';
export * from './typescript-config.js';
export * from './confidence.js';
/**
 * Extended detection options
 */
export interface DetectionOptions extends BaseDetectionOptions {
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
export declare function detectEnvironment(options: DetectionOptions): DetectionResult;
//# sourceMappingURL=index.d.ts.map