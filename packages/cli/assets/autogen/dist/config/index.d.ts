import { A as AutogenConfig } from '../schema-BfEL3Qw5.js';
export { d as AutogenConfigSchema, a as EslintRulesSchema, g as EslintSeverity, E as EslintSeveritySchema, j as Heal, H as HealSchema, m as LLKBIntegration, l as LLKBIntegrationLevel, L as LLKBIntegrationLevelSchema, c as LLKBIntegrationSchema, f as Paths, P as PathsSchema, k as RegenerationStrategy, R as RegenerationStrategySchema, h as SelectorPolicy, b as SelectorPolicySchema, e as SelectorStrategy, S as SelectorStrategySchema, i as Validation, V as ValidationSchema } from '../schema-BfEL3Qw5.js';
import 'zod';

/**
 * Error thrown when config loading fails
 */
declare class ConfigLoadError extends Error {
    readonly cause?: unknown | undefined;
    constructor(message: string, cause?: unknown | undefined);
}
/**
 * Find the config file in the project
 */
declare function findConfigFile(rootDir: string): string | null;
/**
 * Load and parse the autogen config file
 * @param configPath - Path to config file, or project root to auto-detect
 * @returns Parsed and validated config
 * @throws ConfigLoadError if config cannot be loaded or is invalid
 */
declare function loadConfig(configPath?: string): AutogenConfig;
/**
 * Get the default config without loading from file
 */
declare function getDefaultConfig(): AutogenConfig;
/**
 * Resolve a path from config relative to project root
 */
declare function resolveConfigPath(config: AutogenConfig, pathKey: keyof AutogenConfig['paths'], rootDir?: string): string;
/**
 * Merge multiple configs with later configs taking precedence
 * Arrays are merged additively for forbiddenPatterns, but overwritten for others
 * @see research/2026-01-23_llkb-autogen-integration-specification.md Round 2
 */
declare function mergeConfigs(configs: AutogenConfig[]): AutogenConfig;
/**
 * Load and merge multiple config files
 * Later configs take precedence over earlier ones
 * @param configPaths - Array of config file paths to load and merge
 * @returns Merged config
 */
declare function loadConfigs(configPaths: string[]): AutogenConfig;
/**
 * Load LLKB extension config if present
 * @param basePath - Base path to search for LLKB config
 * @returns Partial config or null if not found
 */
declare function loadLLKBConfig(basePath: string): AutogenConfig | null;
/**
 * Load config with automatic migration for backward compatibility (T009)
 *
 * This function ensures backward compatibility when the llkb field was added
 * to the AutogenConfig schema. Old configs without the llkb field will be
 * migrated to include it with default values.
 *
 * @param configPath - Path to config file, or project root to auto-detect
 * @returns Parsed config with llkb field guaranteed to exist
 *
 * @example
 * ```typescript
 * // Load config with automatic migration
 * const config = loadConfigWithMigration();
 * // config.llkb is guaranteed to exist (even for old configs)
 * ```
 */
declare function loadConfigWithMigration(configPath?: string): AutogenConfig;
/**
 * Check if a config needs migration
 *
 * @param config - Config to check
 * @returns True if migration is needed
 */
declare function needsConfigMigration(config: unknown): boolean;
/**
 * Get schema version from config
 *
 * This helps track which version of the schema a config file was created with.
 * Future schema changes can use this for more sophisticated migrations.
 *
 * @param config - Config object
 * @returns Schema version number
 */
declare function getSchemaVersion(config: AutogenConfig): number;

export { AutogenConfig, ConfigLoadError, findConfigFile, getDefaultConfig, getSchemaVersion, loadConfig, loadConfigWithMigration, loadConfigs, loadLLKBConfig, mergeConfigs, needsConfigMigration, resolveConfigPath };
