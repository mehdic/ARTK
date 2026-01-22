/**
 * Configuration migration system
 *
 * Provides automatic migration of configuration files from older versions
 * to the current version. Each migration transforms the config object to
 * match the expected schema for the next version.
 *
 * @module config/migrate
 */
export { CURRENT_CONFIG_VERSION } from './schema.js';
/**
 * Function that transforms config from one version to the next
 */
export type MigrationFn = (config: Record<string, unknown>) => Record<string, unknown>;
/**
 * Migration definition
 */
export interface Migration {
    /** Starting version (config must be exactly this version) */
    fromVersion: number;
    /** Target version (result will be this version) */
    toVersion: number;
    /** Human-readable description of what changed */
    description: string;
    /** Migration function */
    migrate: MigrationFn;
}
/**
 * Result of config migration
 */
export interface MigrationResult {
    /** Final migrated configuration */
    config: Record<string, unknown>;
    /** Starting version number */
    fromVersion: number;
    /** Final version number */
    toVersion: number;
    /** List of migration descriptions that were applied */
    migrationsApplied: string[];
}
/**
 * Register a migration
 *
 * @param migration - Migration to register
 * @throws Error if migration with same from/to version already exists
 */
export declare function registerMigration(migration: Migration): void;
/**
 * Get migration for a specific version transition
 *
 * @param fromVersion - Starting version
 * @param toVersion - Target version
 * @returns Migration or undefined if not found
 */
export declare function getMigration(fromVersion: number, toVersion: number): Migration | undefined;
/**
 * Get all registered migrations
 *
 * @returns Array of migrations in registration order
 */
export declare function getAllMigrations(): Migration[];
/**
 * Clear all registered migrations
 *
 * Useful for testing. Should not be used in production code.
 */
export declare function clearMigrations(): void;
/**
 * Check if a config needs migration
 *
 * @param config - Raw config object
 * @returns True if config version is less than current version
 */
export declare function needsMigration(config: Record<string, unknown>): boolean;
/**
 * Check if a version is supported
 *
 * @param version - Version number to check
 * @returns True if version can be migrated to current version
 */
export declare function isVersionSupported(version: number): boolean;
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
export declare function migrateConfig(config: Record<string, unknown>): MigrationResult;
//# sourceMappingURL=migrate.d.ts.map