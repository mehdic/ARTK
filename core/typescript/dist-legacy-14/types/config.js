"use strict";
/**
 * @module types/config
 * @description Configuration type definitions for ARTK E2E independent architecture.
 * Defines the main configuration file schema (artk.config.yml).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_TIMEOUT_CONFIG = exports.DEFAULT_BROWSER_CONFIG = exports.CONFIG_SCHEMA_VERSION = void 0;
exports.isArtkConfig = isArtkConfig;
/**
 * Config schema version.
 * Update this when making breaking changes to the config schema.
 */
exports.CONFIG_SCHEMA_VERSION = '2.0';
/**
 * Type guard to check if a value is a valid ArtkConfig.
 */
function isArtkConfig(value) {
    if (typeof value !== 'object' || value === null)
        return false;
    const obj = value;
    // Check schemaVersion
    if (obj.schemaVersion !== exports.CONFIG_SCHEMA_VERSION)
        return false;
    // Check project
    if (typeof obj.project !== 'object' || obj.project === null)
        return false;
    const project = obj.project;
    if (typeof project.name !== 'string')
        return false;
    // Check targets
    if (!Array.isArray(obj.targets))
        return false;
    if (obj.targets.length < 1 || obj.targets.length > 5)
        return false;
    // Check defaults
    if (typeof obj.defaults !== 'object' || obj.defaults === null)
        return false;
    const defaults = obj.defaults;
    if (typeof defaults.target !== 'string')
        return false;
    if (typeof defaults.environment !== 'string')
        return false;
    return true;
}
/**
 * Default browser configuration.
 */
exports.DEFAULT_BROWSER_CONFIG = {
    enabled: ['chromium'],
    headless: true,
};
/**
 * Default timeout configuration.
 */
exports.DEFAULT_TIMEOUT_CONFIG = {
    default: 30000,
    navigation: 60000,
    auth: 120000,
};
//# sourceMappingURL=config.js.map