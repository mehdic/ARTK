"use strict";
/**
 * YAML configuration loader with validation
 *
 * Implements:
 * - FR-001: Load configuration from artk/artk.config.yml file
 * - FR-002: Validate configuration against defined schema and report all validation errors with field paths
 * - FR-003: Resolve environment variables (via env.ts)
 * - FR-004: Support named environment profiles switchable via ARTK_ENV
 * - FR-005: Provide typed access to all configuration sections
 *
 * @module config/loader
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONFIG_FILE_NAMES = exports.DEFAULT_CONFIG_PATH = void 0;
exports.findConfigFile = findConfigFile;
exports.loadYamlFile = loadYamlFile;
exports.formatZodError = formatZodError;
exports.zodErrorToConfigError = zodErrorToConfigError;
exports.loadConfig = loadConfig;
exports.clearConfigCache = clearConfigCache;
exports.getConfig = getConfig;
exports.isConfigLoaded = isConfigLoaded;
exports.getAppConfig = getAppConfig;
exports.getAuthConfig = getAuthConfig;
exports.getSelectorsConfig = getSelectorsConfig;
exports.getAssertionsConfig = getAssertionsConfig;
exports.getDataConfig = getDataConfig;
exports.getFixturesConfig = getFixturesConfig;
exports.getTierConfig = getTierConfig;
exports.getTiersConfig = getTiersConfig;
exports.getReportersConfig = getReportersConfig;
exports.getArtifactsConfig = getArtifactsConfig;
exports.getBrowsersConfig = getBrowsersConfig;
exports.getJourneysConfig = getJourneysConfig;
exports.getEnvironmentConfig = getEnvironmentConfig;
exports.getEnvironmentsConfig = getEnvironmentsConfig;
exports.getBaseUrl = getBaseUrl;
exports.getApiUrl = getApiUrl;
exports.getStorageStateDir = getStorageStateDir;
exports.getStorageStatePath = getStorageStatePath;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const yaml_1 = require("yaml");
const config_error_js_1 = require("../errors/config-error.js");
const logger_js_1 = require("../utils/logger.js");
const credentials_js_1 = require("../auth/credentials.js");
const env_js_1 = require("./env.js");
const migrate_js_1 = require("./migrate.js");
const schema_js_1 = require("./schema.js");
const logger = (0, logger_js_1.createLogger)('config', 'loader');
// =============================================================================
// Configuration State
// =============================================================================
/**
 * Cached configuration instance
 */
let cachedConfig = null;
/**
 * Path to the loaded configuration file
 */
let configFilePath = null;
// =============================================================================
// Configuration Loading
// =============================================================================
/**
 * Default configuration file path relative to project root
 */
exports.DEFAULT_CONFIG_PATH = 'artk/artk.config.yml';
/**
 * Alternative configuration file names
 */
exports.CONFIG_FILE_NAMES = [
    'artk.config.yml',
    'artk.config.yaml',
    'artk.config.json',
];
/**
 * Find the configuration file in standard locations
 *
 * @param baseDir - Base directory to search from
 * @returns Path to the configuration file or undefined if not found
 */
function findConfigFile(baseDir = process.cwd()) {
    // First, check the default location
    const defaultPath = (0, node_path_1.join)(baseDir, exports.DEFAULT_CONFIG_PATH);
    if ((0, node_fs_1.existsSync)(defaultPath)) {
        return defaultPath;
    }
    // Check alternative names in artk/ directory
    const artkDir = (0, node_path_1.join)(baseDir, 'artk');
    if ((0, node_fs_1.existsSync)(artkDir)) {
        for (const fileName of exports.CONFIG_FILE_NAMES) {
            const filePath = (0, node_path_1.join)(artkDir, fileName);
            if ((0, node_fs_1.existsSync)(filePath)) {
                return filePath;
            }
        }
    }
    // Check alternative names in root directory
    for (const fileName of exports.CONFIG_FILE_NAMES) {
        const filePath = (0, node_path_1.join)(baseDir, fileName);
        if ((0, node_fs_1.existsSync)(filePath)) {
            return filePath;
        }
    }
    return undefined;
}
/**
 * Load raw YAML content from a file
 *
 * @param filePath - Path to the YAML file
 * @returns Parsed YAML content as unknown
 * @throws ARTKConfigError if file cannot be read or parsed
 */
function loadYamlFile(filePath) {
    try {
        const content = (0, node_fs_1.readFileSync)(filePath, 'utf-8');
        return (0, yaml_1.parse)(content);
    }
    catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
            throw new config_error_js_1.ARTKConfigError(`Configuration file not found: ${filePath}`, 'configPath', `Create the file at ${filePath} or specify a different path`);
        }
        if (error instanceof Error) {
            throw new config_error_js_1.ARTKConfigError(`Failed to parse configuration file: ${error.message}`, 'configPath', 'Check the YAML syntax in your configuration file');
        }
        throw error;
    }
}
/**
 * Format Zod validation errors into a readable message
 *
 * @param error - Zod validation error
 * @returns Formatted error message with all issues
 */
function formatZodError(error) {
    const issues = error.issues.map((issue) => {
        const path = issue.path.join('.');
        return `  - ${path || 'root'}: ${issue.message}`;
    });
    return `Configuration validation failed:\n${issues.join('\n')}`;
}
/**
 * Convert Zod errors to ARTKConfigError
 *
 * @param error - Zod validation error
 * @returns ARTKConfigError with details
 */
function zodErrorToConfigError(error) {
    const firstIssue = error.issues[0];
    const path = firstIssue ? firstIssue.path.join('.') : 'unknown';
    const message = formatZodError(error);
    let suggestion;
    if (firstIssue) {
        switch (firstIssue.code) {
            case 'invalid_type':
                suggestion = `Expected ${firstIssue.expected}, received ${firstIssue.received}`;
                break;
            case 'invalid_enum_value':
                suggestion = `Valid values: ${firstIssue.options.join(', ')}`;
                break;
            case 'too_small':
                suggestion =
                    firstIssue.type === 'string'
                        ? 'Value cannot be empty'
                        : `Minimum value is ${firstIssue.minimum}`;
                break;
            case 'custom':
                suggestion = firstIssue.message;
                break;
        }
    }
    return new config_error_js_1.ARTKConfigError(message, path, suggestion);
}
/**
 * Load and validate configuration from a YAML file
 *
 * @param options - Loading options
 * @returns Loaded configuration result
 * @throws ARTKConfigError if configuration is invalid or cannot be loaded
 *
 * @example
 * ```typescript
 * // Load from default location
 * const { config, activeEnvironment } = await loadConfig();
 *
 * // Load from custom path
 * const { config } = await loadConfig({ configPath: './custom-config.yml' });
 *
 * // Load with custom environment
 * const { config } = await loadConfig({ activeEnvironment: 'staging' });
 * ```
 */
function loadConfig(options = {}) {
    const { baseDir = process.cwd(), env = process.env, forceReload = false, activeEnvironment: overrideEnv, skipCredentialsValidation = false, } = options;
    // Return cached config if available and not forcing reload
    if (!forceReload && cachedConfig !== null && configFilePath !== null) {
        const envName = determineActiveEnvironment(cachedConfig, { env, override: overrideEnv });
        const envConfig = cachedConfig.environments[envName];
        logger.debug('Returning cached configuration', { path: configFilePath });
        return {
            config: cachedConfig,
            configPath: configFilePath,
            activeEnvironment: envName,
            environmentConfig: envConfig,
        };
    }
    // Find or use specified config path
    let resolvedPath;
    if (options.configPath) {
        resolvedPath = (0, node_path_1.resolve)(baseDir, options.configPath);
    }
    else {
        const foundPath = findConfigFile(baseDir);
        if (!foundPath) {
            throw new config_error_js_1.ARTKConfigError(`Configuration file not found in ${baseDir}`, 'configPath', `Create ${exports.DEFAULT_CONFIG_PATH} or specify a custom path`);
        }
        resolvedPath = foundPath;
    }
    logger.info('Loading configuration', { path: resolvedPath });
    // Load raw YAML
    const rawConfig = loadYamlFile(resolvedPath);
    if (typeof rawConfig !== 'object' || rawConfig === null) {
        throw new config_error_js_1.ARTKConfigError('Configuration file must contain a YAML object', 'root', 'Ensure your configuration file starts with valid YAML');
    }
    // Check for missing environment variables before resolution
    const resolveOptions = { env, throwOnMissing: false };
    const missingVars = (0, env_js_1.getMissingEnvVars)(rawConfig, env);
    if (missingVars.length > 0) {
        throw (0, env_js_1.createMissingEnvVarsError)(missingVars);
    }
    // Resolve environment variables
    let resolvedConfig = (0, env_js_1.resolveEnvVarsInObject)(rawConfig, resolveOptions);
    // Validate version is supported (reject future versions)
    const configVersion = resolvedConfig.version ?? 0;
    if (configVersion > migrate_js_1.CURRENT_CONFIG_VERSION) {
        throw new config_error_js_1.ARTKConfigError(`Configuration version ${configVersion} is not supported. Current version is ${migrate_js_1.CURRENT_CONFIG_VERSION}.`, 'version', `Downgrade your configuration to version ${migrate_js_1.CURRENT_CONFIG_VERSION} or upgrade @artk/core`);
    }
    // Check for migration
    if ((0, migrate_js_1.needsMigration)(resolvedConfig)) {
        const migrationResult = (0, migrate_js_1.migrateConfig)(resolvedConfig);
        if (migrationResult.migrationsApplied.length > 0) {
            logger.warn(`Config migrated from v${migrationResult.fromVersion} to v${migrationResult.toVersion}:\n` +
                migrationResult.migrationsApplied.map(m => `  - ${m}`).join('\n'));
        }
        else {
            logger.info(`Config version updated from v${migrationResult.fromVersion} to v${migrationResult.toVersion} (no schema changes)`);
        }
        resolvedConfig = migrationResult.config;
    }
    // Validate against schema
    const parseResult = schema_js_1.ARTKConfigSchema.safeParse(resolvedConfig);
    if (!parseResult.success) {
        throw zodErrorToConfigError(parseResult.error);
    }
    const config = parseResult.data;
    // Validate credentials at config load time (unless explicitly skipped)
    if (!skipCredentialsValidation) {
        logger.debug('Validating credentials configuration');
        (0, credentials_js_1.validateCredentialsConfig)(config.auth.roles, env);
    }
    else {
        logger.debug('Skipping credentials validation (skipCredentialsValidation = true)');
    }
    // Determine active environment
    const envName = determineActiveEnvironment(config, { env, override: overrideEnv });
    const envConfig = config.environments[envName];
    // Cache the loaded configuration
    cachedConfig = config;
    configFilePath = resolvedPath;
    logger.info('Configuration loaded successfully', {
        path: resolvedPath,
        activeEnvironment: envName,
        roles: Object.keys(config.auth.roles),
    });
    return {
        config,
        configPath: resolvedPath,
        activeEnvironment: envName,
        environmentConfig: envConfig,
    };
}
/**
 * Determine the active environment name
 *
 * Priority:
 * 1. Override parameter
 * 2. ARTK_ENV environment variable
 * 3. Config's activeEnvironment field
 *
 * @param config - Loaded configuration
 * @param options - Options
 * @returns Active environment name
 */
function determineActiveEnvironment(config, options = {}) {
    const { env = process.env, override } = options;
    // 1. Override takes highest precedence
    if (override) {
        return (0, env_js_1.resolveEnvVars)(override, { env });
    }
    // 2. ARTK_ENV environment variable
    const artkEnv = env['ARTK_ENV'];
    if (artkEnv) {
        return artkEnv;
    }
    // 3. Config's activeEnvironment field (may contain env var reference)
    return (0, env_js_1.resolveEnvVars)(config.activeEnvironment, { env, throwOnMissing: false });
}
// =============================================================================
// Configuration Clearing
// =============================================================================
/**
 * Clear the cached configuration
 *
 * Useful for testing or when the configuration file has changed.
 */
function clearConfigCache() {
    cachedConfig = null;
    configFilePath = null;
    logger.debug('Configuration cache cleared');
}
// =============================================================================
// Configuration Accessors (FR-005)
// =============================================================================
/**
 * Get the current configuration or throw if not loaded
 *
 * @returns Loaded configuration
 * @throws ARTKConfigError if configuration is not loaded
 */
function getConfig() {
    if (cachedConfig === null) {
        throw new config_error_js_1.ARTKConfigError('Configuration not loaded. Call loadConfig() first.', 'config', 'Ensure loadConfig() is called before accessing configuration');
    }
    return cachedConfig;
}
/**
 * Check if configuration is loaded
 *
 * @returns True if configuration is loaded
 */
function isConfigLoaded() {
    return cachedConfig !== null;
}
/**
 * Get application configuration
 *
 * @returns App configuration
 * @throws ARTKConfigError if configuration is not loaded
 */
function getAppConfig() {
    return getConfig().app;
}
/**
 * Get authentication configuration
 *
 * @returns Auth configuration
 * @throws ARTKConfigError if configuration is not loaded
 */
function getAuthConfig() {
    return getConfig().auth;
}
/**
 * Get selectors configuration
 *
 * @returns Selectors configuration
 * @throws ARTKConfigError if configuration is not loaded
 */
function getSelectorsConfig() {
    return getConfig().selectors;
}
/**
 * Get assertions configuration
 *
 * @returns Assertions configuration
 * @throws ARTKConfigError if configuration is not loaded
 */
function getAssertionsConfig() {
    return getConfig().assertions;
}
/**
 * Get data configuration
 *
 * @returns Data configuration
 * @throws ARTKConfigError if configuration is not loaded
 */
function getDataConfig() {
    return getConfig().data;
}
/**
 * Get fixtures configuration
 *
 * @returns Fixtures configuration
 * @throws ARTKConfigError if configuration is not loaded
 */
function getFixturesConfig() {
    return getConfig().fixtures;
}
/**
 * Get tier configuration by name
 *
 * @param tierName - Tier name (e.g., 'smoke', 'release', 'regression')
 * @returns Tier configuration or undefined if not found
 * @throws ARTKConfigError if configuration is not loaded
 */
function getTierConfig(tierName) {
    return getConfig().tiers[tierName];
}
/**
 * Get all tier configurations
 *
 * @returns Record of tier configurations
 * @throws ARTKConfigError if configuration is not loaded
 */
function getTiersConfig() {
    return getConfig().tiers;
}
/**
 * Get reporters configuration
 *
 * @returns Reporters configuration
 * @throws ARTKConfigError if configuration is not loaded
 */
function getReportersConfig() {
    return getConfig().reporters;
}
/**
 * Get artifacts configuration
 *
 * @returns Artifacts configuration
 * @throws ARTKConfigError if configuration is not loaded
 */
function getArtifactsConfig() {
    return getConfig().artifacts;
}
/**
 * Get browsers configuration
 *
 * @returns Browsers configuration
 * @throws ARTKConfigError if configuration is not loaded
 */
function getBrowsersConfig() {
    return getConfig().browsers;
}
/**
 * Get journeys configuration
 *
 * @returns Journeys configuration
 * @throws ARTKConfigError if configuration is not loaded
 */
function getJourneysConfig() {
    return getConfig().journeys;
}
/**
 * Get environment configuration by name
 *
 * @param envName - Environment name
 * @returns Environment configuration or undefined if not found
 * @throws ARTKConfigError if configuration is not loaded
 */
function getEnvironmentConfig(envName) {
    return getConfig().environments[envName];
}
/**
 * Get all environment configurations
 *
 * @returns Record of environment configurations
 * @throws ARTKConfigError if configuration is not loaded
 */
function getEnvironmentsConfig() {
    return getConfig().environments;
}
/**
 * Get the base URL for the current environment
 *
 * Resolves the base URL from:
 * 1. Active environment's baseUrl (if defined)
 * 2. App's baseUrl (fallback)
 *
 * @param activeEnvironment - Active environment name
 * @returns Base URL
 * @throws ARTKConfigError if configuration is not loaded
 */
function getBaseUrl(activeEnvironment) {
    const config = getConfig();
    const envName = activeEnvironment ?? config.activeEnvironment;
    const envConfig = config.environments[envName];
    if (envConfig?.baseUrl) {
        return envConfig.baseUrl;
    }
    return config.app.baseUrl;
}
/**
 * Get the API URL for the current environment
 *
 * @param activeEnvironment - Active environment name
 * @returns API URL or undefined if not configured
 * @throws ARTKConfigError if configuration is not loaded
 */
function getApiUrl(activeEnvironment) {
    const config = getConfig();
    const envName = activeEnvironment ?? config.activeEnvironment;
    const envConfig = config.environments[envName];
    if (envConfig?.apiUrl) {
        return envConfig.apiUrl;
    }
    // Fallback to data.api.baseUrl if configured
    return config.data.api?.baseUrl;
}
/**
 * Get the storage state directory path
 *
 * @param baseDir - Base directory (defaults to config file directory)
 * @returns Absolute path to storage state directory
 * @throws ARTKConfigError if configuration is not loaded
 */
function getStorageStateDir(baseDir) {
    const config = getConfig();
    const storageDir = config.auth.storageState.directory;
    // If baseDir not provided, use config file directory
    const resolvedBaseDir = baseDir ?? (configFilePath ? (0, node_path_1.dirname)(configFilePath) : process.cwd());
    return (0, node_path_1.resolve)(resolvedBaseDir, storageDir);
}
/**
 * Get the storage state file path for a role
 *
 * @param role - Role name
 * @param env - Environment name (for pattern replacement)
 * @param baseDir - Base directory
 * @returns Absolute path to storage state file
 * @throws ARTKConfigError if configuration is not loaded
 */
function getStorageStatePath(role, env, baseDir) {
    const config = getConfig();
    const pattern = config.auth.storageState.filePattern;
    const envName = env ?? config.activeEnvironment;
    // Replace pattern placeholders
    const fileName = pattern
        .replace('{role}', role)
        .replace('{env}', envName);
    return (0, node_path_1.join)(getStorageStateDir(baseDir), fileName);
}
//# sourceMappingURL=loader.js.map