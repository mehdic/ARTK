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

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { ZodError, ZodIssue } from 'zod';

import { ARTKConfigError } from '../errors/config-error.js';
import { createLogger } from '../utils/logger.js';
import {
  createMissingEnvVarsError,
  getMissingEnvVars,
  resolveEnvVars,
  resolveEnvVarsInObject,
  type ResolveOptions,
} from './env.js';
import { ARTKConfigSchema } from './schema.js';
import type {
  AppConfig,
  ArtifactsConfig,
  ARTKConfig,
  AssertionsConfig,
  AuthConfig,
  BrowsersConfig,
  DataConfig,
  EnvironmentConfig,
  FixturesConfig,
  JourneysConfig,
  ReportersConfig,
  SelectorsConfig,
  TierConfig,
} from './types.js';

const logger = createLogger('config', 'loader');

// =============================================================================
// Configuration State
// =============================================================================

/**
 * Cached configuration instance
 */
let cachedConfig: ARTKConfig | null = null;

/**
 * Path to the loaded configuration file
 */
let configFilePath: string | null = null;

// =============================================================================
// Configuration Loading
// =============================================================================

/**
 * Default configuration file path relative to project root
 */
export const DEFAULT_CONFIG_PATH = 'artk/artk.config.yml';

/**
 * Alternative configuration file names
 */
export const CONFIG_FILE_NAMES = [
  'artk.config.yml',
  'artk.config.yaml',
  'artk.config.json',
] as const;

/**
 * Options for loading configuration
 */
export interface LoadConfigOptions {
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
}

/**
 * Result of configuration loading
 */
export interface LoadConfigResult {
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
export function findConfigFile(baseDir: string = process.cwd()): string | undefined {
  // First, check the default location
  const defaultPath = join(baseDir, DEFAULT_CONFIG_PATH);
  if (existsSync(defaultPath)) {
    return defaultPath;
  }

  // Check alternative names in artk/ directory
  const artkDir = join(baseDir, 'artk');
  if (existsSync(artkDir)) {
    for (const fileName of CONFIG_FILE_NAMES) {
      const filePath = join(artkDir, fileName);
      if (existsSync(filePath)) {
        return filePath;
      }
    }
  }

  // Check alternative names in root directory
  for (const fileName of CONFIG_FILE_NAMES) {
    const filePath = join(baseDir, fileName);
    if (existsSync(filePath)) {
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
export function loadYamlFile(filePath: string): unknown {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return parseYaml(content);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new ARTKConfigError(
        `Configuration file not found: ${filePath}`,
        'configPath',
        `Create the file at ${filePath} or specify a different path`
      );
    }

    if (error instanceof Error) {
      throw new ARTKConfigError(
        `Failed to parse configuration file: ${error.message}`,
        'configPath',
        'Check the YAML syntax in your configuration file'
      );
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
export function formatZodError(error: ZodError): string {
  const issues = error.issues.map((issue: ZodIssue) => {
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
export function zodErrorToConfigError(error: ZodError): ARTKConfigError {
  const firstIssue = error.issues[0];
  const path = firstIssue ? firstIssue.path.join('.') : 'unknown';
  const message = formatZodError(error);

  let suggestion: string | undefined;
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

  return new ARTKConfigError(message, path, suggestion);
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
export function loadConfig(options: LoadConfigOptions = {}): LoadConfigResult {
  const {
    baseDir = process.cwd(),
    env = process.env,
    forceReload = false,
    activeEnvironment: overrideEnv,
  } = options;

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
  let resolvedPath: string;
  if (options.configPath) {
    resolvedPath = resolve(baseDir, options.configPath);
  } else {
    const foundPath = findConfigFile(baseDir);
    if (!foundPath) {
      throw new ARTKConfigError(
        `Configuration file not found in ${baseDir}`,
        'configPath',
        `Create ${DEFAULT_CONFIG_PATH} or specify a custom path`
      );
    }
    resolvedPath = foundPath;
  }

  logger.info('Loading configuration', { path: resolvedPath });

  // Load raw YAML
  const rawConfig = loadYamlFile(resolvedPath);

  if (typeof rawConfig !== 'object' || rawConfig === null) {
    throw new ARTKConfigError(
      'Configuration file must contain a YAML object',
      'root',
      'Ensure your configuration file starts with valid YAML'
    );
  }

  // Check for missing environment variables before resolution
  const resolveOptions: ResolveOptions = { env, throwOnMissing: false };
  const missingVars = getMissingEnvVars(rawConfig, env);

  if (missingVars.length > 0) {
    throw createMissingEnvVarsError(missingVars);
  }

  // Resolve environment variables
  const resolvedConfig = resolveEnvVarsInObject(rawConfig, resolveOptions);

  // Validate against schema
  const parseResult = ARTKConfigSchema.safeParse(resolvedConfig);

  if (!parseResult.success) {
    throw zodErrorToConfigError(parseResult.error);
  }

  const config = parseResult.data as ARTKConfig;

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
 * Options for determining active environment
 */
interface DetermineEnvOptions {
  /** Custom environment object */
  env?: Record<string, string | undefined>;

  /** Override value (takes precedence) */
  override?: string;
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
function determineActiveEnvironment(
  config: ARTKConfig,
  options: DetermineEnvOptions = {}
): string {
  const { env = process.env, override } = options;

  // 1. Override takes highest precedence
  if (override) {
    return resolveEnvVars(override, { env });
  }

  // 2. ARTK_ENV environment variable
  const artkEnv = env['ARTK_ENV'];
  if (artkEnv) {
    return artkEnv;
  }

  // 3. Config's activeEnvironment field (may contain env var reference)
  return resolveEnvVars(config.activeEnvironment, { env, throwOnMissing: false });
}

// =============================================================================
// Configuration Clearing
// =============================================================================

/**
 * Clear the cached configuration
 *
 * Useful for testing or when the configuration file has changed.
 */
export function clearConfigCache(): void {
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
export function getConfig(): ARTKConfig {
  if (cachedConfig === null) {
    throw new ARTKConfigError(
      'Configuration not loaded. Call loadConfig() first.',
      'config',
      'Ensure loadConfig() is called before accessing configuration'
    );
  }
  return cachedConfig;
}

/**
 * Check if configuration is loaded
 *
 * @returns True if configuration is loaded
 */
export function isConfigLoaded(): boolean {
  return cachedConfig !== null;
}

/**
 * Get application configuration
 *
 * @returns App configuration
 * @throws ARTKConfigError if configuration is not loaded
 */
export function getAppConfig(): AppConfig {
  return getConfig().app;
}

/**
 * Get authentication configuration
 *
 * @returns Auth configuration
 * @throws ARTKConfigError if configuration is not loaded
 */
export function getAuthConfig(): AuthConfig {
  return getConfig().auth;
}

/**
 * Get selectors configuration
 *
 * @returns Selectors configuration
 * @throws ARTKConfigError if configuration is not loaded
 */
export function getSelectorsConfig(): SelectorsConfig {
  return getConfig().selectors;
}

/**
 * Get assertions configuration
 *
 * @returns Assertions configuration
 * @throws ARTKConfigError if configuration is not loaded
 */
export function getAssertionsConfig(): AssertionsConfig {
  return getConfig().assertions;
}

/**
 * Get data configuration
 *
 * @returns Data configuration
 * @throws ARTKConfigError if configuration is not loaded
 */
export function getDataConfig(): DataConfig {
  return getConfig().data;
}

/**
 * Get fixtures configuration
 *
 * @returns Fixtures configuration
 * @throws ARTKConfigError if configuration is not loaded
 */
export function getFixturesConfig(): FixturesConfig {
  return getConfig().fixtures;
}

/**
 * Get tier configuration by name
 *
 * @param tierName - Tier name (e.g., 'smoke', 'release', 'regression')
 * @returns Tier configuration or undefined if not found
 * @throws ARTKConfigError if configuration is not loaded
 */
export function getTierConfig(tierName: string): TierConfig | undefined {
  return getConfig().tiers[tierName];
}

/**
 * Get all tier configurations
 *
 * @returns Record of tier configurations
 * @throws ARTKConfigError if configuration is not loaded
 */
export function getTiersConfig(): Readonly<Record<string, TierConfig>> {
  return getConfig().tiers;
}

/**
 * Get reporters configuration
 *
 * @returns Reporters configuration
 * @throws ARTKConfigError if configuration is not loaded
 */
export function getReportersConfig(): ReportersConfig {
  return getConfig().reporters;
}

/**
 * Get artifacts configuration
 *
 * @returns Artifacts configuration
 * @throws ARTKConfigError if configuration is not loaded
 */
export function getArtifactsConfig(): ArtifactsConfig {
  return getConfig().artifacts;
}

/**
 * Get browsers configuration
 *
 * @returns Browsers configuration
 * @throws ARTKConfigError if configuration is not loaded
 */
export function getBrowsersConfig(): BrowsersConfig {
  return getConfig().browsers;
}

/**
 * Get journeys configuration
 *
 * @returns Journeys configuration
 * @throws ARTKConfigError if configuration is not loaded
 */
export function getJourneysConfig(): JourneysConfig {
  return getConfig().journeys;
}

/**
 * Get environment configuration by name
 *
 * @param envName - Environment name
 * @returns Environment configuration or undefined if not found
 * @throws ARTKConfigError if configuration is not loaded
 */
export function getEnvironmentConfig(envName: string): EnvironmentConfig | undefined {
  return getConfig().environments[envName];
}

/**
 * Get all environment configurations
 *
 * @returns Record of environment configurations
 * @throws ARTKConfigError if configuration is not loaded
 */
export function getEnvironmentsConfig(): Readonly<Record<string, EnvironmentConfig>> {
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
export function getBaseUrl(activeEnvironment?: string): string {
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
export function getApiUrl(activeEnvironment?: string): string | undefined {
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
export function getStorageStateDir(baseDir?: string): string {
  const config = getConfig();
  const storageDir = config.auth.storageState.directory;

  // If baseDir not provided, use config file directory
  const resolvedBaseDir = baseDir ?? (configFilePath ? dirname(configFilePath) : process.cwd());

  return resolve(resolvedBaseDir, storageDir);
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
export function getStorageStatePath(
  role: string,
  env?: string,
  baseDir?: string
): string {
  const config = getConfig();
  const pattern = config.auth.storageState.filePattern;
  const envName = env ?? config.activeEnvironment;

  // Replace pattern placeholders
  const fileName = pattern
    .replace('{role}', role)
    .replace('{env}', envName);

  return join(getStorageStateDir(baseDir), fileName);
}
