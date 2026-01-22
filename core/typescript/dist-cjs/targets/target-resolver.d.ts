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
import type { ArtkConfig, ArtkConfigTarget, ArtkEnvironmentUrls } from '../types/config.js';
import type { ArtkTarget, ArtkTargetType } from '../types/target.js';
/**
 * Error thrown when a target cannot be resolved.
 */
export declare class TargetNotFoundError extends Error {
    readonly targetName: string;
    readonly availableTargets: string[];
    constructor(targetName: string, availableTargets: string[]);
}
/**
 * Error thrown when an environment is not configured for a target.
 */
export declare class EnvironmentNotFoundError extends Error {
    readonly targetName: string;
    readonly environment: string;
    readonly availableEnvironments: string[];
    constructor(targetName: string, environment: string, availableEnvironments: string[]);
}
/**
 * Options for target resolution.
 */
export interface TargetResolverOptions {
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
export interface ResolvedTarget {
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
export declare class TargetResolver {
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
export declare function createTargetResolver(config: ArtkConfig, options?: TargetResolverOptions): TargetResolver;
/**
 * Resolves a target by name from a config.
 *
 * @param config - ARTK configuration
 * @param targetName - Target name (or undefined for default)
 * @returns Resolved target or null
 */
export declare function resolveTarget(config: ArtkConfig, targetName?: string): ResolvedTarget | null;
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
export declare function getTargetUrl(config: ArtkConfig, targetName: string, environment?: string): string;
/**
 * Gets all target names from a config.
 *
 * @param config - ARTK configuration
 * @returns Array of target names
 */
export declare function getTargetNames(config: ArtkConfig): string[];
/**
 * Validates that all targets have the required environments.
 *
 * @param config - ARTK configuration
 * @param requiredEnvironments - List of required environment names
 * @returns Validation result
 */
export declare function validateTargetEnvironments(config: ArtkConfig, requiredEnvironments: string[]): {
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
export declare function configTargetToArtkTarget(configTarget: ArtkConfigTarget, detectedBy?: string[]): ArtkTarget;
/**
 * Filters targets by type.
 */
export declare function filterTargetsByType(config: ArtkConfig, type: ArtkTargetType): ArtkConfigTarget[];
/**
 * Gets the storage state path for a target.
 */
export declare function getTargetStorageStatePath(config: ArtkConfig, targetName: string, role?: string): string;
//# sourceMappingURL=target-resolver.d.ts.map