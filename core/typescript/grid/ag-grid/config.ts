/**
 * AG Grid Configuration Utilities
 *
 * Handles normalization and merging of grid configuration options.
 *
 * @module grid/ag-grid/config
 */

import type {
  AgGridConfig,
  NormalizedAgGridConfig,
  TimeoutConfig,
  EnterpriseConfig,
} from '../types.js';
import { DEFAULT_TIMEOUTS } from '../types.js';

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
export function normalizeConfig(config: string | AgGridConfig): NormalizedAgGridConfig {
  // Handle string shorthand
  if (typeof config === 'string') {
    return {
      selector: config,
      timeouts: { ...DEFAULT_TIMEOUTS },
    };
  }

  // Merge timeouts with defaults
  return {
    ...config,
    timeouts: mergeTimeouts(config.timeouts),
  };
}

/**
 * Merge custom timeouts with default values
 *
 * @param custom - Custom timeout values (partial)
 * @returns Complete timeout configuration
 */
export function mergeTimeouts(custom?: TimeoutConfig): Required<TimeoutConfig> {
  return {
    ...DEFAULT_TIMEOUTS,
    ...custom,
  };
}

/**
 * Validate that a configuration is valid
 *
 * @param config - Configuration to validate
 * @throws Error if configuration is invalid
 */
export function validateConfig(config: AgGridConfig): void {
  if (!config.selector || typeof config.selector !== 'string') {
    throw new Error('AG Grid config requires a valid selector string');
  }

  if (config.selector.trim() === '') {
    throw new Error('AG Grid config selector cannot be empty');
  }

  // Validate column definitions if provided
  if (config.columns) {
    for (const col of config.columns) {
      if (!col.colId || typeof col.colId !== 'string') {
        throw new Error(`AG Grid column definition requires a valid colId`);
      }
    }
  }

  // Validate timeouts if provided
  if (config.timeouts) {
    const timeoutKeys: (keyof TimeoutConfig)[] = ['gridReady', 'rowLoad', 'cellEdit', 'scroll'];
    for (const key of timeoutKeys) {
      const value = config.timeouts[key];
      if (value !== undefined && (typeof value !== 'number' || value < 0)) {
        throw new Error(`AG Grid timeout "${key}" must be a positive number`);
      }
    }
  }
}

/**
 * Get the display name for a column
 *
 * @param config - Grid configuration
 * @param colId - Column ID to look up
 * @returns Display name or column ID if not found
 */
export function getColumnDisplayName(config: NormalizedAgGridConfig, colId: string): string {
  const column = config.columns?.find((c) => c.colId === colId);
  return column?.displayName ?? colId;
}

/**
 * Check if enterprise features are enabled
 *
 * @param config - Grid configuration
 * @returns Object indicating which enterprise features are enabled
 */
export function getEnterpriseFeatures(config: NormalizedAgGridConfig): Required<EnterpriseConfig> {
  return {
    rowGrouping: config.enterprise?.rowGrouping ?? false,
    treeData: config.enterprise?.treeData ?? false,
    masterDetail: config.enterprise?.masterDetail ?? false,
    serverSide: config.enterprise?.serverSide ?? false,
  };
}

/**
 * Check if any enterprise features are enabled
 *
 * @param config - Grid configuration
 * @returns True if any enterprise feature is enabled
 */
export function hasEnterpriseFeatures(config: NormalizedAgGridConfig): boolean {
  const features = getEnterpriseFeatures(config);
  return features.rowGrouping || features.treeData || features.masterDetail || features.serverSide;
}

/**
 * Get the pinned position for a column
 *
 * @param config - Grid configuration
 * @param colId - Column ID to look up
 * @returns Pinned position ('left', 'right') or null if not pinned
 */
export function getColumnPinnedPosition(
  config: NormalizedAgGridConfig,
  colId: string
): 'left' | 'right' | null {
  const column = config.columns?.find((c) => c.colId === colId);
  return column?.pinned ?? null;
}

/**
 * Create a config with updated values
 *
 * @param config - Original configuration
 * @param updates - Partial updates to apply
 * @returns New configuration with updates applied
 */
export function updateConfig(
  config: NormalizedAgGridConfig,
  updates: Partial<AgGridConfig>
): NormalizedAgGridConfig {
  return {
    ...config,
    ...updates,
    timeouts: updates.timeouts ? mergeTimeouts(updates.timeouts) : config.timeouts,
  };
}
