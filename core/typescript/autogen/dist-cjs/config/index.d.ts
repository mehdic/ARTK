import { A as AutogenConfig } from '../schema-Jooze9KU.js';
export { c as AutogenConfigSchema, a as EslintRulesSchema, f as EslintSeverity, E as EslintSeveritySchema, i as Heal, H as HealSchema, e as Paths, P as PathsSchema, j as RegenerationStrategy, R as RegenerationStrategySchema, g as SelectorPolicy, b as SelectorPolicySchema, d as SelectorStrategy, S as SelectorStrategySchema, h as Validation, V as ValidationSchema } from '../schema-Jooze9KU.js';
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

export { AutogenConfig, ConfigLoadError, findConfigFile, getDefaultConfig, loadConfig, resolveConfigPath };
