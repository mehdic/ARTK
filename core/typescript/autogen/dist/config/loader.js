/**
 * Config loader for artk/autogen.config.yml
 * @see research/2026-01-02_autogen-refined-plan.md Section 7
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { AutogenConfigSchema } from './schema.js';
/**
 * Default config file locations to search
 */
const CONFIG_PATHS = [
    'artk/autogen.config.yml',
    'artk/autogen.config.yaml',
    '.artk/autogen.config.yml',
    '.artk/autogen.config.yaml',
];
/**
 * Error thrown when config loading fails
 */
export class ConfigLoadError extends Error {
    cause;
    constructor(message, cause) {
        super(message);
        this.cause = cause;
        this.name = 'ConfigLoadError';
    }
}
/**
 * Find the config file in the project
 */
export function findConfigFile(rootDir) {
    for (const configPath of CONFIG_PATHS) {
        const fullPath = join(rootDir, configPath);
        if (existsSync(fullPath)) {
            return fullPath;
        }
    }
    return null;
}
/**
 * Load and parse the autogen config file
 * @param configPath - Path to config file, or project root to auto-detect
 * @returns Parsed and validated config
 * @throws ConfigLoadError if config cannot be loaded or is invalid
 */
export function loadConfig(configPath) {
    const rootDir = process.cwd();
    let resolvedPath;
    if (configPath) {
        resolvedPath = resolve(rootDir, configPath);
    }
    else {
        const found = findConfigFile(rootDir);
        if (!found) {
            // Return default config if no file found
            console.warn('No autogen config file found, using defaults. Create artk/autogen.config.yml to customize.');
            return AutogenConfigSchema.parse({});
        }
        resolvedPath = found;
    }
    if (!existsSync(resolvedPath)) {
        throw new ConfigLoadError(`Config file not found: ${resolvedPath}`);
    }
    let rawContent;
    try {
        rawContent = readFileSync(resolvedPath, 'utf-8');
    }
    catch (err) {
        throw new ConfigLoadError(`Failed to read config file: ${resolvedPath}`, err);
    }
    let parsed;
    try {
        parsed = parseYaml(rawContent);
    }
    catch (err) {
        throw new ConfigLoadError(`Invalid YAML in config file: ${resolvedPath}`, err);
    }
    // Validate with Zod schema
    const result = AutogenConfigSchema.safeParse(parsed);
    if (!result.success) {
        const issues = result.error.issues
            .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
            .join('\n');
        throw new ConfigLoadError(`Invalid config in ${resolvedPath}:\n${issues}`, result.error);
    }
    return result.data;
}
/**
 * Get the default config without loading from file
 */
export function getDefaultConfig() {
    return AutogenConfigSchema.parse({});
}
/**
 * Resolve a path from config relative to project root
 */
export function resolveConfigPath(config, pathKey, rootDir) {
    const base = rootDir || process.cwd();
    return resolve(base, config.paths[pathKey]);
}
//# sourceMappingURL=loader.js.map