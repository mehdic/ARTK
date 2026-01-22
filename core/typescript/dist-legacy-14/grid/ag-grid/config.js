"use strict";
/**
 * AG Grid Configuration Utilities
 *
 * Handles normalization and merging of grid configuration options.
 *
 * @module grid/ag-grid/config
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeConfig = normalizeConfig;
exports.mergeTimeouts = mergeTimeouts;
exports.validateConfig = validateConfig;
exports.getColumnDisplayName = getColumnDisplayName;
exports.getEnterpriseFeatures = getEnterpriseFeatures;
exports.hasEnterpriseFeatures = hasEnterpriseFeatures;
exports.getColumnPinnedPosition = getColumnPinnedPosition;
exports.updateConfig = updateConfig;
const types_js_1 = require("../types.js");
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
function normalizeConfig(config) {
    // Handle string shorthand
    if (typeof config === 'string') {
        return {
            selector: config,
            timeouts: { ...types_js_1.DEFAULT_TIMEOUTS },
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
function mergeTimeouts(custom) {
    return {
        ...types_js_1.DEFAULT_TIMEOUTS,
        ...custom,
    };
}
/**
 * Validate that a configuration is valid
 *
 * @param config - Configuration to validate
 * @throws Error if configuration is invalid
 */
function validateConfig(config) {
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
        const timeoutKeys = ['gridReady', 'rowLoad', 'cellEdit', 'scroll'];
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
function getColumnDisplayName(config, colId) {
    const column = config.columns?.find((c) => c.colId === colId);
    return column?.displayName ?? colId;
}
/**
 * Check if enterprise features are enabled
 *
 * @param config - Grid configuration
 * @returns Object indicating which enterprise features are enabled
 */
function getEnterpriseFeatures(config) {
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
function hasEnterpriseFeatures(config) {
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
function getColumnPinnedPosition(config, colId) {
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
function updateConfig(config, updates) {
    return {
        ...config,
        ...updates,
        timeouts: updates.timeouts ? mergeTimeouts(updates.timeouts) : config.timeouts,
    };
}
//# sourceMappingURL=config.js.map