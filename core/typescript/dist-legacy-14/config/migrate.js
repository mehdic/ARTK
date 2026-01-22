"use strict";
/**
 * Configuration migration system
 *
 * Provides automatic migration of configuration files from older versions
 * to the current version. Each migration transforms the config object to
 * match the expected schema for the next version.
 *
 * @module config/migrate
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CURRENT_CONFIG_VERSION = void 0;
exports.registerMigration = registerMigration;
exports.getMigration = getMigration;
exports.getAllMigrations = getAllMigrations;
exports.clearMigrations = clearMigrations;
exports.needsMigration = needsMigration;
exports.isVersionSupported = isVersionSupported;
exports.migrateConfig = migrateConfig;
const logger_js_1 = require("../utils/logger.js");
const schema_js_1 = require("./schema.js");
const logger = (0, logger_js_1.createLogger)('config', 'migrate');
// Re-export CURRENT_CONFIG_VERSION for use by loader.ts
var schema_js_2 = require("./schema.js");
Object.defineProperty(exports, "CURRENT_CONFIG_VERSION", { enumerable: true, get: function () { return schema_js_2.CURRENT_CONFIG_VERSION; } });
// =============================================================================
// Migration Registry
// =============================================================================
/**
 * Registry of all available migrations
 *
 * Migrations must be registered in sequential order (1→2, 2→3, etc.)
 * Each migration should be idempotent and defensive about missing fields.
 */
const MIGRATIONS = new Map();
/**
 * Register a migration
 *
 * @param migration - Migration to register
 * @throws Error if migration with same from/to version already exists
 */
function registerMigration(migration) {
    const key = `${migration.fromVersion}-${migration.toVersion}`;
    if (MIGRATIONS.has(key)) {
        throw new Error(`Migration from v${migration.fromVersion} to v${migration.toVersion} already registered`);
    }
    // Validate sequential versions
    if (migration.toVersion !== migration.fromVersion + 1) {
        throw new Error(`Migration must increment version by 1 (got ${migration.fromVersion} → ${migration.toVersion})`);
    }
    MIGRATIONS.set(key, migration);
    logger.debug(`Registered migration: ${migration.description}`, {
        fromVersion: migration.fromVersion,
        toVersion: migration.toVersion,
    });
}
/**
 * Get migration for a specific version transition
 *
 * @param fromVersion - Starting version
 * @param toVersion - Target version
 * @returns Migration or undefined if not found
 */
function getMigration(fromVersion, toVersion) {
    const key = `${fromVersion}-${toVersion}`;
    return MIGRATIONS.get(key);
}
/**
 * Get all registered migrations
 *
 * @returns Array of migrations in registration order
 */
function getAllMigrations() {
    return Array.from(MIGRATIONS.values());
}
/**
 * Clear all registered migrations
 *
 * Useful for testing. Should not be used in production code.
 */
function clearMigrations() {
    MIGRATIONS.clear();
}
// =============================================================================
// Migration Execution
// =============================================================================
/**
 * Check if a config needs migration
 *
 * @param config - Raw config object
 * @returns True if config version is less than current version
 */
function needsMigration(config) {
    const version = config.version ?? 0;
    return version < schema_js_1.CURRENT_CONFIG_VERSION;
}
/**
 * Check if a version is supported
 *
 * @param version - Version number to check
 * @returns True if version can be migrated to current version
 */
function isVersionSupported(version) {
    // Version 0 is allowed (legacy configs without version field)
    return version >= 0 && version <= schema_js_1.CURRENT_CONFIG_VERSION;
}
/**
 * Migrate configuration to current version
 *
 * Applies all necessary migrations in sequence to bring the config from
 * its current version to CURRENT_CONFIG_VERSION.
 *
 * @param config - Raw configuration object
 * @returns Migration result with final config and applied migrations
 * @throws Error if migration path is incomplete or version is unsupported
 *
 * @example
 * ```typescript
 * const rawConfig = { version: 0, ...oldSchema };
 * const result = migrateConfig(rawConfig);
 * console.log(`Migrated from v${result.fromVersion} to v${result.toVersion}`);
 * // Use result.config for validation
 * ```
 */
function migrateConfig(config) {
    const fromVersion = config.version ?? 0;
    let currentConfig = { ...config };
    const migrationsApplied = [];
    logger.debug('Starting migration', {
        fromVersion,
        targetVersion: schema_js_1.CURRENT_CONFIG_VERSION,
    });
    // Validate version is supported
    if (!isVersionSupported(fromVersion)) {
        throw new Error(`Config version ${fromVersion} is not supported. ` +
            `Supported versions: 0-${schema_js_1.CURRENT_CONFIG_VERSION}`);
    }
    // No migration needed if already at current version
    if (fromVersion === schema_js_1.CURRENT_CONFIG_VERSION) {
        logger.debug('Config already at current version, no migration needed');
        return {
            config: currentConfig,
            fromVersion,
            toVersion: schema_js_1.CURRENT_CONFIG_VERSION,
            migrationsApplied: [],
        };
    }
    // Apply migrations sequentially
    let currentVersion = fromVersion;
    while (currentVersion < schema_js_1.CURRENT_CONFIG_VERSION) {
        const nextVersion = currentVersion + 1;
        const migration = getMigration(currentVersion, nextVersion);
        if (!migration) {
            throw new Error(`No migration found from v${currentVersion} to v${nextVersion}. ` +
                `Migration path is incomplete.`);
        }
        logger.debug(`Applying migration: ${migration.description}`, {
            fromVersion: currentVersion,
            toVersion: nextVersion,
        });
        // Apply migration
        currentConfig = migration.migrate(currentConfig);
        migrationsApplied.push(migration.description);
        currentVersion = nextVersion;
    }
    // Update version field to current version
    currentConfig.version = schema_js_1.CURRENT_CONFIG_VERSION;
    logger.info('Migration completed', {
        fromVersion,
        toVersion: schema_js_1.CURRENT_CONFIG_VERSION,
        migrationsApplied: migrationsApplied.length,
    });
    return {
        config: currentConfig,
        fromVersion,
        toVersion: schema_js_1.CURRENT_CONFIG_VERSION,
        migrationsApplied,
    };
}
// =============================================================================
// Built-in Migrations
// =============================================================================
/**
 * Migration from v0 (no version field) to v1 (first versioned config)
 *
 * This is a no-op migration that simply adds the version field.
 * All v0 configs are assumed to be compatible with v1 schema.
 */
registerMigration({
    fromVersion: 0,
    toVersion: 1,
    description: 'Add version field to legacy config',
    migrate: (config) => {
        // Version 0 configs have no version field
        // Version 1 schema is compatible with legacy configs
        // Just return the config as-is (version will be set by migrateConfig)
        return { ...config };
    },
});
// Future migrations will be added here as the schema evolves
// Example:
//
// registerMigration({
//   fromVersion: 1,
//   toVersion: 2,
//   description: 'Rename selectorPolicy to locatorPolicy',
//   migrate: (config) => {
//     const updated = { ...config };
//     if ('selectorPolicy' in updated) {
//       updated.locatorPolicy = updated.selectorPolicy;
//       delete updated.selectorPolicy;
//     }
//     return updated;
//   },
// });
//# sourceMappingURL=migrate.js.map