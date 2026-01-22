/**
 * Reporter Configuration Helper (T104)
 *
 * Generates Playwright reporter configurations from ARTK config.
 *
 * @module harness/reporters
 */
import type { ARTKConfig } from '../config/types.js';
import type { ReporterArray, ReporterConfigOptions } from './types.js';
/**
 * Generate Playwright reporter configuration from ARTK config
 *
 * Creates an array of reporter descriptions based on the reporters
 * section in artk.config.yml.
 *
 * @param config - ARTK configuration
 * @returns Array of Playwright reporter descriptions
 *
 * @example
 * ```typescript
 * import { loadConfig } from '@artk/core/config';
 * import { getReporterConfig } from '@artk/core/harness';
 *
 * const { config } = loadConfig();
 * const reporters = getReporterConfig(config);
 * // [['html', {...}], ['json', {...}], ...]
 * ```
 */
export declare function getReporterConfig(config: ARTKConfig): ReporterArray;
/**
 * Generate reporter configuration from options object
 *
 * Alternative to using ARTK config, useful for testing or custom setups.
 *
 * @param options - Reporter configuration options
 * @returns Array of Playwright reporter descriptions
 */
export declare function getReporterConfigFromOptions(options?: Partial<ReporterConfigOptions>): ReporterArray;
/**
 * Create minimal reporter configuration
 *
 * Returns just the list reporter for quick local development.
 *
 * @returns Minimal reporter array
 */
export declare function getMinimalReporterConfig(): ReporterArray;
/**
 * Create CI-optimized reporter configuration
 *
 * Includes JUnit for CI integration and JSON for processing.
 *
 * @param junitPath - Path for JUnit output
 * @param jsonPath - Path for JSON output
 * @returns CI-optimized reporter array
 */
export declare function getCIReporterConfig(junitPath?: string, jsonPath?: string): ReporterArray;
/**
 * Merge reporter configurations
 *
 * Combines multiple reporter arrays, deduplicating by reporter type.
 *
 * @param configs - Reporter arrays to merge
 * @returns Merged reporter array
 */
export declare function mergeReporterConfigs(...configs: ReporterArray[]): ReporterArray;
/**
 * Check if a reporter type is enabled in the configuration
 *
 * @param reporters - Reporter array to check
 * @param type - Reporter type (e.g., 'html', 'json')
 * @returns True if the reporter type is in the array
 */
export declare function hasReporter(reporters: ReporterArray, type: string): boolean;
//# sourceMappingURL=reporters.d.ts.map