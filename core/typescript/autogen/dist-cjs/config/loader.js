"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigLoadError = void 0;
exports.findConfigFile = findConfigFile;
exports.loadConfig = loadConfig;
exports.getDefaultConfig = getDefaultConfig;
exports.resolveConfigPath = resolveConfigPath;
/**
 * Config loader for artk/autogen.config.yml
 * @see research/2026-01-02_autogen-refined-plan.md Section 7
 */
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const yaml_1 = require("yaml");
const schema_js_1 = require("./schema.js");
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
class ConfigLoadError extends Error {
    cause;
    constructor(message, cause) {
        super(message);
        this.cause = cause;
        this.name = 'ConfigLoadError';
    }
}
exports.ConfigLoadError = ConfigLoadError;
/**
 * Find the config file in the project
 */
function findConfigFile(rootDir) {
    for (const configPath of CONFIG_PATHS) {
        const fullPath = (0, node_path_1.join)(rootDir, configPath);
        if ((0, node_fs_1.existsSync)(fullPath)) {
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
function loadConfig(configPath) {
    const rootDir = process.cwd();
    let resolvedPath;
    if (configPath) {
        resolvedPath = (0, node_path_1.resolve)(rootDir, configPath);
    }
    else {
        const found = findConfigFile(rootDir);
        if (!found) {
            // Return default config if no file found
            console.warn('No autogen config file found, using defaults. Create artk/autogen.config.yml to customize.');
            return schema_js_1.AutogenConfigSchema.parse({});
        }
        resolvedPath = found;
    }
    if (!(0, node_fs_1.existsSync)(resolvedPath)) {
        throw new ConfigLoadError(`Config file not found: ${resolvedPath}`);
    }
    let rawContent;
    try {
        rawContent = (0, node_fs_1.readFileSync)(resolvedPath, 'utf-8');
    }
    catch (err) {
        throw new ConfigLoadError(`Failed to read config file: ${resolvedPath}`, err);
    }
    let parsed;
    try {
        parsed = (0, yaml_1.parse)(rawContent);
    }
    catch (err) {
        throw new ConfigLoadError(`Invalid YAML in config file: ${resolvedPath}`, err);
    }
    // Validate with Zod schema
    const result = schema_js_1.AutogenConfigSchema.safeParse(parsed);
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
function getDefaultConfig() {
    return schema_js_1.AutogenConfigSchema.parse({});
}
/**
 * Resolve a path from config relative to project root
 */
function resolveConfigPath(config, pathKey, rootDir) {
    const base = rootDir || process.cwd();
    return (0, node_path_1.resolve)(base, config.paths[pathKey]);
}
//# sourceMappingURL=loader.js.map