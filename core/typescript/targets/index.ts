/**
 * @module targets
 * @description Multi-target support for ARTK E2E architecture.
 * Resolves targets by name and manages target-specific configurations.
 *
 * @example
 * ```typescript
 * import { resolveTarget, getTargetBaseUrl } from '@artk/core/targets';
 *
 * const target = resolveTarget(config, 'user-portal');
 * const baseUrl = getTargetBaseUrl(config, 'user-portal', 'staging');
 * ```
 */

export * from './target-resolver.js';
export * from './config-generator.js';

/**
 * Targets module version.
 */
export const TARGETS_MODULE_VERSION = '1.0.0';
