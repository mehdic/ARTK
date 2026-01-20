import { ZodError } from 'zod';
import { A as ARTKConfigError } from './config-error-CJ71r7TC.js';
import { A as ARTKConfig, E as EnvironmentConfig, a as AppConfig, b as AuthConfig, S as SelectorsConfig, c as AssertionsConfig, D as DataConfig, F as FixturesConfig, T as TierConfig, R as ReportersConfig, d as ArtifactsConfig, B as BrowsersConfig, J as JourneysConfig } from './types-BBdYxuqU.js';

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

/**
 * Default configuration file path relative to project root
 */
declare const DEFAULT_CONFIG_PATH = "artk/artk.config.yml";
/**
 * Alternative configuration file names
 */
declare const CONFIG_FILE_NAMES: readonly ["artk.config.yml", "artk.config.yaml", "artk.config.json"];
/**
 * Options for loading configuration
 */
interface LoadConfigOptions {
    /**
     * Path to the configuration file
     * @default 'artk/artk.config.yml'
     */
    configPath?: string;
    /**
     * Base directory for resolving relative paths
     * @default process.cwd()
     */
    baseDir?: string;
    /**
     * Custom environment object for variable resolution
     * @default process.env
     */
    env?: Record<string, string | undefined>;
    /**
     * Force reload even if configuration is cached
     * @default false
     */
    forceReload?: boolean;
    /**
     * Active environment name override (defaults to ARTK_ENV or config value)
     */
    activeEnvironment?: string;
    /**
     * Skip credentials validation
     * Useful for dry-run scenarios or when credentials are not yet set
     * @default false
     */
    skipCredentialsValidation?: boolean;
}
/**
 * Result of configuration loading
 */
interface LoadConfigResult {
    /** Loaded and validated configuration */
    config: ARTKConfig;
    /** Path to the configuration file */
    configPath: string;
    /** Active environment name */
    activeEnvironment: string;
    /** Environment configuration (if applicable) */
    environmentConfig?: EnvironmentConfig;
}
/**
 * Find the configuration file in standard locations
 *
 * @param baseDir - Base directory to search from
 * @returns Path to the configuration file or undefined if not found
 */
declare function findConfigFile(baseDir?: string): string | undefined;
/**
 * Load raw YAML content from a file
 *
 * @param filePath - Path to the YAML file
 * @returns Parsed YAML content as unknown
 * @throws ARTKConfigError if file cannot be read or parsed
 */
declare function loadYamlFile(filePath: string): unknown;
/**
 * Format Zod validation errors into a readable message
 *
 * @param error - Zod validation error
 * @returns Formatted error message with all issues
 */
declare function formatZodError(error: ZodError): string;
/**
 * Convert Zod errors to ARTKConfigError
 *
 * @param error - Zod validation error
 * @returns ARTKConfigError with details
 */
declare function zodErrorToConfigError(error: ZodError): ARTKConfigError;
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
declare function loadConfig(options?: LoadConfigOptions): LoadConfigResult;
/**
 * Clear the cached configuration
 *
 * Useful for testing or when the configuration file has changed.
 */
declare function clearConfigCache(): void;
/**
 * Get the current configuration or throw if not loaded
 *
 * @returns Loaded configuration
 * @throws ARTKConfigError if configuration is not loaded
 */
declare function getConfig(): ARTKConfig;
/**
 * Check if configuration is loaded
 *
 * @returns True if configuration is loaded
 */
declare function isConfigLoaded(): boolean;
/**
 * Get application configuration
 *
 * @returns App configuration
 * @throws ARTKConfigError if configuration is not loaded
 */
declare function getAppConfig(): AppConfig;
/**
 * Get authentication configuration
 *
 * @returns Auth configuration
 * @throws ARTKConfigError if configuration is not loaded
 */
declare function getAuthConfig(): AuthConfig;
/**
 * Get selectors configuration
 *
 * @returns Selectors configuration
 * @throws ARTKConfigError if configuration is not loaded
 */
declare function getSelectorsConfig(): SelectorsConfig;
/**
 * Get assertions configuration
 *
 * @returns Assertions configuration
 * @throws ARTKConfigError if configuration is not loaded
 */
declare function getAssertionsConfig(): AssertionsConfig;
/**
 * Get data configuration
 *
 * @returns Data configuration
 * @throws ARTKConfigError if configuration is not loaded
 */
declare function getDataConfig(): DataConfig;
/**
 * Get fixtures configuration
 *
 * @returns Fixtures configuration
 * @throws ARTKConfigError if configuration is not loaded
 */
declare function getFixturesConfig(): FixturesConfig;
/**
 * Get tier configuration by name
 *
 * @param tierName - Tier name (e.g., 'smoke', 'release', 'regression')
 * @returns Tier configuration or undefined if not found
 * @throws ARTKConfigError if configuration is not loaded
 */
declare function getTierConfig(tierName: string): TierConfig | undefined;
/**
 * Get all tier configurations
 *
 * @returns Record of tier configurations
 * @throws ARTKConfigError if configuration is not loaded
 */
declare function getTiersConfig(): Readonly<Record<string, TierConfig>>;
/**
 * Get reporters configuration
 *
 * @returns Reporters configuration
 * @throws ARTKConfigError if configuration is not loaded
 */
declare function getReportersConfig(): ReportersConfig;
/**
 * Get artifacts configuration
 *
 * @returns Artifacts configuration
 * @throws ARTKConfigError if configuration is not loaded
 */
declare function getArtifactsConfig(): ArtifactsConfig;
/**
 * Get browsers configuration
 *
 * @returns Browsers configuration
 * @throws ARTKConfigError if configuration is not loaded
 */
declare function getBrowsersConfig(): BrowsersConfig;
/**
 * Get journeys configuration
 *
 * @returns Journeys configuration
 * @throws ARTKConfigError if configuration is not loaded
 */
declare function getJourneysConfig(): JourneysConfig;
/**
 * Get environment configuration by name
 *
 * @param envName - Environment name
 * @returns Environment configuration or undefined if not found
 * @throws ARTKConfigError if configuration is not loaded
 */
declare function getEnvironmentConfig(envName: string): EnvironmentConfig | undefined;
/**
 * Get all environment configurations
 *
 * @returns Record of environment configurations
 * @throws ARTKConfigError if configuration is not loaded
 */
declare function getEnvironmentsConfig(): Readonly<Record<string, EnvironmentConfig>>;
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
declare function getBaseUrl(activeEnvironment?: string): string;
/**
 * Get the API URL for the current environment
 *
 * @param activeEnvironment - Active environment name
 * @returns API URL or undefined if not configured
 * @throws ARTKConfigError if configuration is not loaded
 */
declare function getApiUrl(activeEnvironment?: string): string | undefined;
/**
 * Get the storage state directory path
 *
 * @param baseDir - Base directory (defaults to config file directory)
 * @returns Absolute path to storage state directory
 * @throws ARTKConfigError if configuration is not loaded
 */
declare function getStorageStateDir(baseDir?: string): string;
/**
 * Get the storage state file path for a role
 *
 * @param role - Role name
 * @param env - Environment name (for pattern replacement)
 * @param baseDir - Base directory
 * @returns Absolute path to storage state file
 * @throws ARTKConfigError if configuration is not loaded
 */
declare function getStorageStatePath(role: string, env?: string, baseDir?: string): string;

export { type LoadConfigResult as A, CONFIG_FILE_NAMES as C, DEFAULT_CONFIG_PATH as D, type LoadConfigOptions as L, loadYamlFile as a, formatZodError as b, clearConfigCache as c, getAppConfig as d, getAuthConfig as e, findConfigFile as f, getConfig as g, getSelectorsConfig as h, isConfigLoaded as i, getAssertionsConfig as j, getDataConfig as k, loadConfig as l, getFixturesConfig as m, getTierConfig as n, getTiersConfig as o, getReportersConfig as p, getArtifactsConfig as q, getBrowsersConfig as r, getJourneysConfig as s, getEnvironmentConfig as t, getEnvironmentsConfig as u, getBaseUrl as v, getApiUrl as w, getStorageStateDir as x, getStorageStatePath as y, zodErrorToConfigError as z };
