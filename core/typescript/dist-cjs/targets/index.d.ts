import { a as ArtkEnvironmentUrls, b as ArtkConfigTarget, e as ArtkConfig } from '../config-DBfXL5iJ.js';
import { a as ArtkTargetType, A as ArtkTarget } from '../target-BGR8NLDg.js';
import { a0 as BrowserChannel, a1 as BrowserStrategy } from '../types-BBdYxuqU.js';

/**
 * @module targets/target-resolver
 * @description Target resolution for ARTK E2E multi-target architecture.
 *
 * Resolves targets by name, validates target configurations, and provides
 * environment-aware URL resolution.
 *
 * @example
 * ```typescript
 * import { resolveTarget, getTargetUrl, TargetResolver } from '@artk/core/targets';
 *
 * const resolver = new TargetResolver(config);
 *
 * // Resolve a target by name
 * const target = resolver.resolve('user-portal');
 *
 * // Get URL for a specific environment
 * const url = resolver.getUrl('user-portal', 'staging');
 * ```
 */

/**
 * Error thrown when a target cannot be resolved.
 */
declare class TargetNotFoundError extends Error {
    readonly targetName: string;
    readonly availableTargets: string[];
    constructor(targetName: string, availableTargets: string[]);
}
/**
 * Error thrown when an environment is not configured for a target.
 */
declare class EnvironmentNotFoundError extends Error {
    readonly targetName: string;
    readonly environment: string;
    readonly availableEnvironments: string[];
    constructor(targetName: string, environment: string, availableEnvironments: string[]);
}
/**
 * Options for target resolution.
 */
interface TargetResolverOptions {
    /**
     * Default target to use if none specified.
     */
    defaultTarget?: string;
    /**
     * Default environment to use if none specified.
     * @default 'local'
     */
    defaultEnvironment?: string;
    /**
     * Whether to throw on missing target.
     * @default true
     */
    throwOnMissing?: boolean;
}
/**
 * Resolved target with additional metadata.
 */
interface ResolvedTarget {
    /**
     * Target name.
     */
    name: string;
    /**
     * Relative path to frontend directory.
     */
    path: string;
    /**
     * Application type.
     */
    type: ArtkTargetType;
    /**
     * Optional description.
     */
    description?: string;
    /**
     * Whether this is the default target.
     */
    isDefault: boolean;
    /**
     * Available environments for this target.
     */
    availableEnvironments: string[];
    /**
     * Environment URLs mapping.
     */
    environments: Record<string, ArtkEnvironmentUrls>;
    /**
     * The original config target.
     */
    configTarget: ArtkConfigTarget;
}
/**
 * Target resolver class for ARTK E2E multi-target architecture.
 */
declare class TargetResolver {
    private readonly options;
    private readonly targetMap;
    constructor(config: ArtkConfig, options?: TargetResolverOptions);
    /**
     * Resolves a target by name.
     *
     * @param targetName - Name of the target to resolve (or undefined for default)
     * @returns Resolved target
     * @throws TargetNotFoundError if target not found and throwOnMissing is true
     */
    resolve(targetName?: string): ResolvedTarget | null;
    /**
     * Gets the URL for a target and environment.
     *
     * @param targetName - Target name (or undefined for default)
     * @param environment - Environment name (or undefined for default)
     * @returns Base URL for the target/environment
     * @throws TargetNotFoundError if target not found
     * @throws EnvironmentNotFoundError if environment not found
     */
    getUrl(targetName?: string, environment?: string): string;
    /**
     * Gets all target names.
     */
    getTargetNames(): string[];
    /**
     * Gets all resolved targets.
     */
    getAllTargets(): ResolvedTarget[];
    /**
     * Gets the default target.
     */
    getDefaultTarget(): ResolvedTarget | null;
    /**
     * Checks if a target exists.
     */
    hasTarget(targetName: string): boolean;
    /**
     * Checks if an environment exists for a target.
     */
    hasEnvironment(targetName: string, environment: string): boolean;
    /**
     * Gets all environments for a target.
     */
    getEnvironments(targetName: string): string[];
    /**
     * Converts a config target to a resolved target.
     */
    private toResolvedTarget;
}
/**
 * Creates a target resolver from a config.
 *
 * @param config - ARTK configuration
 * @param options - Resolver options
 * @returns Target resolver instance
 */
declare function createTargetResolver(config: ArtkConfig, options?: TargetResolverOptions): TargetResolver;
/**
 * Resolves a target by name from a config.
 *
 * @param config - ARTK configuration
 * @param targetName - Target name (or undefined for default)
 * @returns Resolved target or null
 */
declare function resolveTarget(config: ArtkConfig, targetName?: string): ResolvedTarget | null;
/**
 * Gets the URL for a target and environment.
 *
 * @param config - ARTK configuration
 * @param targetName - Target name
 * @param environment - Environment name
 * @returns Base URL
 * @throws TargetNotFoundError if target not found
 * @throws EnvironmentNotFoundError if environment not found
 */
declare function getTargetUrl(config: ArtkConfig, targetName: string, environment?: string): string;
/**
 * Gets all target names from a config.
 *
 * @param config - ARTK configuration
 * @returns Array of target names
 */
declare function getTargetNames(config: ArtkConfig): string[];
/**
 * Validates that all targets have the required environments.
 *
 * @param config - ARTK configuration
 * @param requiredEnvironments - List of required environment names
 * @returns Validation result
 */
declare function validateTargetEnvironments(config: ArtkConfig, requiredEnvironments: string[]): {
    valid: boolean;
    errors: Array<{
        target: string;
        missing: string[];
    }>;
};
/**
 * Creates an ArtkTarget from an ArtkConfigTarget.
 * Strips config-specific fields like environments.
 *
 * @param configTarget - The config target to convert
 * @param detectedBy - Detection signals (required for ArtkTarget, defaults to empty)
 */
declare function configTargetToArtkTarget(configTarget: ArtkConfigTarget, detectedBy?: string[]): ArtkTarget;
/**
 * Filters targets by type.
 */
declare function filterTargetsByType(config: ArtkConfig, type: ArtkTargetType): ArtkConfigTarget[];
/**
 * Gets the storage state path for a target.
 */
declare function getTargetStorageStatePath(config: ArtkConfig, targetName: string, role?: string): string;

/**
 * @module targets/config-generator
 * @description ARTK configuration file generator for multi-target architecture.
 *
 * Generates artk.config.yml files with target definitions and environment URLs.
 *
 * @example
 * ```typescript
 * import { generateArtkConfig, ConfigGeneratorOptions } from '@artk/core/targets';
 *
 * const config = generateArtkConfig({
 *   projectName: 'my-project',
 *   targets: [
 *     {
 *       name: 'user-portal',
 *       path: '../frontend',
 *       type: 'react-spa',
 *       environments: {
 *         local: { baseUrl: 'http://localhost:3000' },
 *         staging: { baseUrl: 'https://staging.example.com' },
 *       },
 *     },
 *   ],
 * });
 *
 * await fs.writeFile('artk-e2e/artk.config.yml', config);
 * ```
 */

/**
 * Target input for config generation.
 */
interface ConfigTargetInput {
    /**
     * Target name (lowercase-kebab-case).
     */
    name: string;
    /**
     * Relative path from artk-e2e/ to frontend directory.
     */
    path: string;
    /**
     * Application type.
     */
    type: ArtkTargetType;
    /**
     * Optional description.
     */
    description?: string;
    /**
     * Environment URLs.
     */
    environments: Record<string, ArtkEnvironmentUrls>;
}
/**
 * Options for generating artk.config.yml.
 */
interface ConfigGeneratorOptions {
    /**
     * Project name.
     */
    projectName: string;
    /**
     * Optional project description.
     */
    projectDescription?: string;
    /**
     * Target configurations.
     */
    targets: ConfigTargetInput[];
    /**
     * Default target name.
     * If not specified, uses the first target.
     */
    defaultTarget?: string;
    /**
     * Default environment name.
     * @default 'local'
     */
    defaultEnvironment?: string;
    /**
     * Whether to include auth configuration section.
     * @default false
     */
    includeAuth?: boolean;
    /**
     * Storage state directory for auth.
     * @default '.auth-states'
     */
    storageStateDir?: string;
    /**
     * Whether to include browser configuration.
     * @default true
     */
    includeBrowserConfig?: boolean;
    /**
     * Enabled browsers.
     * @default ['chromium']
     */
    browsers?: ('chromium' | 'firefox' | 'webkit')[];
    /**
     * Browser channel selection.
     * @default 'bundled'
     */
    browserChannel?: BrowserChannel;
    /**
     * Browser strategy preference.
     * @default 'auto'
     */
    browserStrategy?: BrowserStrategy;
    /**
     * Whether to include timeout configuration.
     * @default true
     */
    includeTimeouts?: boolean;
    /**
     * Whether to include comments in output.
     * @default true
     */
    includeComments?: boolean;
}
/**
 * Generates YAML content for artk.config.yml.
 *
 * @param options - Configuration options
 * @returns YAML configuration file content
 */
declare function generateArtkConfig(options: ConfigGeneratorOptions): string;
/**
 * Generates a minimal artk.config.yml for quick setup.
 *
 * @param projectName - Project name
 * @param targetPath - Path to the frontend directory
 * @param targetType - Application type
 * @returns Minimal YAML configuration
 */
declare function generateMinimalArtkConfig(projectName: string, targetPath: string, targetType?: ArtkTargetType): string;
/**
 * Generates artk.config.yml from detected targets.
 *
 * @param projectName - Project name
 * @param detectedTargets - Targets detected by frontend detector
 * @returns YAML configuration
 */
declare function generateConfigFromDetection(projectName: string, detectedTargets: Array<{
    name: string;
    path: string;
    type: ArtkTargetType;
    description?: string;
}>): string;
/**
 * Validates a target name follows the lowercase-kebab-case pattern.
 */
declare function isValidTargetName(name: string): boolean;
/**
 * Normalizes a directory name to a valid target name.
 *
 * @param dirName - Directory name to normalize
 * @returns Valid target name
 */
declare function normalizeTargetName(dirName: string): string;
/**
 * Parses environment URLs from common patterns.
 *
 * @param baseUrl - Base URL for local environment
 * @param targetName - Target name for generating other URLs
 * @returns Environment URLs map
 */
declare function generateEnvironmentUrls(baseUrl: string, targetName: string): Record<string, ArtkEnvironmentUrls>;
/**
 * Config generator result with metadata.
 */
interface ConfigGeneratorResult {
    /**
     * Generated YAML content.
     */
    content: string;
    /**
     * Number of targets in config.
     */
    targetCount: number;
    /**
     * Default target name.
     */
    defaultTarget: string;
    /**
     * List of all target names.
     */
    targetNames: string[];
    /**
     * Warnings from generation (e.g., normalized target names).
     */
    warnings: string[];
}
/**
 * Generates artk.config.yml with detailed result.
 *
 * @param options - Configuration options
 * @returns Generation result with metadata
 */
declare function generateArtkConfigWithResult(options: ConfigGeneratorOptions): ConfigGeneratorResult;

/**
 * @module targets
 * @description Multi-target support for ARTK E2E architecture.
 * Resolves targets by name and manages target-specific configurations.
 *
 * @example
 * ```typescript
 * import { resolveTarget, getTargetBaseUrl } from '@artk/core/targets';
 *
 * const target = resolveTarget(config, 'user-portal');
 * const baseUrl = getTargetBaseUrl(config, 'user-portal', 'staging');
 * ```
 */

/**
 * Targets module version.
 */
declare const TARGETS_MODULE_VERSION = "1.0.0";

export { type ConfigGeneratorOptions, type ConfigGeneratorResult, type ConfigTargetInput, EnvironmentNotFoundError, type ResolvedTarget, TARGETS_MODULE_VERSION, TargetNotFoundError, TargetResolver, type TargetResolverOptions, configTargetToArtkTarget, createTargetResolver, filterTargetsByType, generateArtkConfig, generateArtkConfigWithResult, generateConfigFromDetection, generateEnvironmentUrls, generateMinimalArtkConfig, getTargetNames, getTargetStorageStatePath, getTargetUrl, isValidTargetName, normalizeTargetName, resolveTarget, validateTargetEnvironments };
