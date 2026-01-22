/**
 * AG Grid Configuration Utilities
 *
 * Handles normalization and merging of grid configuration options.
 *
 * @module grid/ag-grid/config
 */
import type { AgGridConfig, NormalizedAgGridConfig, TimeoutConfig, EnterpriseConfig } from '../types.js';
/**
 * Normalize a grid configuration, converting string selector to full config
 * and applying default values.
 *
 * @param config - String selector or full configuration object
 * @returns Normalized configuration with all defaults applied
 *
 * @example
 * ```typescript
 * // String selector
 * const config = normalizeConfig('orders-grid');
 * // Result: { selector: 'orders-grid', timeouts: { gridReady: 30000, ... } }
 *
 * // Full config with overrides
 * const config = normalizeConfig({
 *   selector: 'orders-grid',
 *   timeouts: { gridReady: 60000 }
 * });
 * // Result: { selector: 'orders-grid', timeouts: { gridReady: 60000, rowLoad: 10000, ... } }
 * ```
 */
export declare function normalizeConfig(config: string | AgGridConfig): NormalizedAgGridConfig;
/**
 * Merge custom timeouts with default values
 *
 * @param custom - Custom timeout values (partial)
 * @returns Complete timeout configuration
 */
export declare function mergeTimeouts(custom?: TimeoutConfig): Required<TimeoutConfig>;
/**
 * Validate that a configuration is valid
 *
 * @param config - Configuration to validate
 * @throws Error if configuration is invalid
 */
export declare function validateConfig(config: AgGridConfig): void;
/**
 * Get the display name for a column
 *
 * @param config - Grid configuration
 * @param colId - Column ID to look up
 * @returns Display name or column ID if not found
 */
export declare function getColumnDisplayName(config: NormalizedAgGridConfig, colId: string): string;
/**
 * Check if enterprise features are enabled
 *
 * @param config - Grid configuration
 * @returns Object indicating which enterprise features are enabled
 */
export declare function getEnterpriseFeatures(config: NormalizedAgGridConfig): Required<EnterpriseConfig>;
/**
 * Check if any enterprise features are enabled
 *
 * @param config - Grid configuration
 * @returns True if any enterprise feature is enabled
 */
export declare function hasEnterpriseFeatures(config: NormalizedAgGridConfig): boolean;
/**
 * Get the pinned position for a column
 *
 * @param config - Grid configuration
 * @param colId - Column ID to look up
 * @returns Pinned position ('left', 'right') or null if not pinned
 */
export declare function getColumnPinnedPosition(config: NormalizedAgGridConfig, colId: string): 'left' | 'right' | null;
/**
 * Create a config with updated values
 *
 * @param config - Original configuration
 * @param updates - Partial updates to apply
 * @returns New configuration with updates applied
 */
export declare function updateConfig(config: NormalizedAgGridConfig, updates: Partial<AgGridConfig>): NormalizedAgGridConfig;
//# sourceMappingURL=config.d.ts.map