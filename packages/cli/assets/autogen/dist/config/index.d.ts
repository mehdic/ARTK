import { A as AutogenConfig } from '../schema-BocNY0qp.js';
export { d as AutogenConfigSchema, a as EslintRulesSchema, g as EslintSeverity, E as EslintSeveritySchema, j as Heal, H as HealSchema, m as LLKBIntegration, l as LLKBIntegrationLevel, L as LLKBIntegrationLevelSchema, c as LLKBIntegrationSchema, f as Paths, P as PathsSchema, k as RegenerationStrategy, R as RegenerationStrategySchema, h as SelectorPolicy, b as SelectorPolicySchema, e as SelectorStrategy, S as SelectorStrategySchema, i as Validation, V as ValidationSchema } from '../schema-BocNY0qp.js';
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

export { AutogenConfig, ConfigLoadError, findConfigFile, getDefaultConfig, loadConfig, loadConfigs, loadLLKBConfig, mergeConfigs, resolveConfigPath };
