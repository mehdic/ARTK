import { type AutogenConfig } from './schema.js';
/**
 * Error thrown when config loading fails
 */
export declare class ConfigLoadError extends Error {
    readonly cause?: unknown | undefined;
    constructor(message: string, cause?: unknown | undefined);
}
/**
 * Find the config file in the project
 */
export declare function findConfigFile(rootDir: string): string | null;
/**
 * Load and parse the autogen config file
 * @param configPath - Path to config file, or project root to auto-detect
 * @returns Parsed and validated config
 * @throws ConfigLoadError if config cannot be loaded or is invalid
 */
export declare function loadConfig(configPath?: string): AutogenConfig;
/**
 * Get the default config without loading from file
 */
export declare function getDefaultConfig(): AutogenConfig;
/**
 * Resolve a path from config relative to project root
 */
export declare function resolveConfigPath(config: AutogenConfig, pathKey: keyof AutogenConfig['paths'], rootDir?: string): string;
//# sourceMappingURL=loader.d.ts.map