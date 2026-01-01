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
export class TargetNotFoundError extends Error {
  constructor(
    public readonly targetName: string,
    public readonly availableTargets: string[]
  ) {
    super(
      `Target "${targetName}" not found. Available targets: ${
        availableTargets.length > 0 ? availableTargets.join(', ') : '(none)'
      }`
    );
    this.name = 'TargetNotFoundError';
  }
}

/**
 * Error thrown when an environment is not configured for a target.
 */
export class EnvironmentNotFoundError extends Error {
  constructor(
    public readonly targetName: string,
    public readonly environment: string,
    public readonly availableEnvironments: string[]
  ) {
    super(
      `Environment "${environment}" not found for target "${targetName}". ` +
        `Available environments: ${
          availableEnvironments.length > 0
            ? availableEnvironments.join(', ')
            : '(none)'
        }`
    );
    this.name = 'EnvironmentNotFoundError';
  }
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
export class TargetResolver {
  private readonly options: Required<TargetResolverOptions>;
  private readonly targetMap: Map<string, ArtkConfigTarget>;

  constructor(config: ArtkConfig, options?: TargetResolverOptions) {
    this.options = {
      defaultTarget: options?.defaultTarget ?? config.defaults.target,
      defaultEnvironment: options?.defaultEnvironment ?? config.defaults.environment ?? 'local',
      throwOnMissing: options?.throwOnMissing ?? true,
    };

    // Build target lookup map
    this.targetMap = new Map();
    for (const target of config.targets) {
      this.targetMap.set(target.name, target);
    }
  }

  /**
   * Resolves a target by name.
   *
   * @param targetName - Name of the target to resolve (or undefined for default)
   * @returns Resolved target
   * @throws TargetNotFoundError if target not found and throwOnMissing is true
   */
  resolve(targetName?: string): ResolvedTarget | null {
    const name = targetName ?? this.options.defaultTarget;

    if (!name) {
      if (this.options.throwOnMissing) {
        throw new TargetNotFoundError('(default)', this.getTargetNames());
      }
      return null;
    }

    const configTarget = this.targetMap.get(name);

    if (!configTarget) {
      if (this.options.throwOnMissing) {
        throw new TargetNotFoundError(name, this.getTargetNames());
      }
      return null;
    }

    return this.toResolvedTarget(configTarget);
  }

  /**
   * Gets the URL for a target and environment.
   *
   * @param targetName - Target name (or undefined for default)
   * @param environment - Environment name (or undefined for default)
   * @returns Base URL for the target/environment
   * @throws TargetNotFoundError if target not found
   * @throws EnvironmentNotFoundError if environment not found
   */
  getUrl(targetName?: string, environment?: string): string {
    const resolved = this.resolve(targetName);
    if (!resolved) {
      throw new TargetNotFoundError(
        targetName ?? '(default)',
        this.getTargetNames()
      );
    }

    const env = environment ?? this.options.defaultEnvironment;
    const envConfig = resolved.configTarget.environments[env];

    if (!envConfig) {
      throw new EnvironmentNotFoundError(
        resolved.name,
        env,
        resolved.availableEnvironments
      );
    }

    return envConfig.baseUrl;
  }

  /**
   * Gets all target names.
   */
  getTargetNames(): string[] {
    return Array.from(this.targetMap.keys());
  }

  /**
   * Gets all resolved targets.
   */
  getAllTargets(): ResolvedTarget[] {
    return Array.from(this.targetMap.values()).map((t) =>
      this.toResolvedTarget(t)
    );
  }

  /**
   * Gets the default target.
   */
  getDefaultTarget(): ResolvedTarget | null {
    if (!this.options.defaultTarget) {
      return null;
    }
    return this.resolve(this.options.defaultTarget);
  }

  /**
   * Checks if a target exists.
   */
  hasTarget(targetName: string): boolean {
    return this.targetMap.has(targetName);
  }

  /**
   * Checks if an environment exists for a target.
   */
  hasEnvironment(targetName: string, environment: string): boolean {
    const target = this.targetMap.get(targetName);
    if (!target) {
      return false;
    }
    return environment in target.environments;
  }

  /**
   * Gets all environments for a target.
   */
  getEnvironments(targetName: string): string[] {
    const target = this.targetMap.get(targetName);
    if (!target) {
      return [];
    }
    return Object.keys(target.environments);
  }

  /**
   * Converts a config target to a resolved target.
   */
  private toResolvedTarget(configTarget: ArtkConfigTarget): ResolvedTarget {
    return {
      name: configTarget.name,
      path: configTarget.path,
      type: configTarget.type,
      description: configTarget.description,
      isDefault: configTarget.name === this.options.defaultTarget,
      availableEnvironments: Object.keys(configTarget.environments),
      environments: configTarget.environments,
      configTarget,
    };
  }
}

/**
 * Creates a target resolver from a config.
 *
 * @param config - ARTK configuration
 * @param options - Resolver options
 * @returns Target resolver instance
 */
export function createTargetResolver(
  config: ArtkConfig,
  options?: TargetResolverOptions
): TargetResolver {
  return new TargetResolver(config, options);
}

/**
 * Resolves a target by name from a config.
 *
 * @param config - ARTK configuration
 * @param targetName - Target name (or undefined for default)
 * @returns Resolved target or null
 */
export function resolveTarget(
  config: ArtkConfig,
  targetName?: string
): ResolvedTarget | null {
  const resolver = new TargetResolver(config, { throwOnMissing: false });
  return resolver.resolve(targetName);
}

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
export function getTargetUrl(
  config: ArtkConfig,
  targetName: string,
  environment?: string
): string {
  const resolver = new TargetResolver(config);
  return resolver.getUrl(targetName, environment);
}

/**
 * Gets all target names from a config.
 *
 * @param config - ARTK configuration
 * @returns Array of target names
 */
export function getTargetNames(config: ArtkConfig): string[] {
  return config.targets.map((t) => t.name);
}

/**
 * Validates that all targets have the required environments.
 *
 * @param config - ARTK configuration
 * @param requiredEnvironments - List of required environment names
 * @returns Validation result
 */
export function validateTargetEnvironments(
  config: ArtkConfig,
  requiredEnvironments: string[]
): {
  valid: boolean;
  errors: Array<{
    target: string;
    missing: string[];
  }>;
} {
  const errors: Array<{ target: string; missing: string[] }> = [];

  for (const target of config.targets) {
    const available = Object.keys(target.environments);
    const missing = requiredEnvironments.filter(
      (env) => !available.includes(env)
    );

    if (missing.length > 0) {
      errors.push({ target: target.name, missing });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Creates an ArtkTarget from an ArtkConfigTarget.
 * Strips config-specific fields like environments.
 *
 * @param configTarget - The config target to convert
 * @param detectedBy - Detection signals (required for ArtkTarget, defaults to empty)
 */
export function configTargetToArtkTarget(
  configTarget: ArtkConfigTarget,
  detectedBy: string[] = []
): ArtkTarget {
  return {
    name: configTarget.name,
    path: configTarget.path,
    type: configTarget.type,
    detected_by: detectedBy,
    description: configTarget.description,
  };
}

/**
 * Filters targets by type.
 */
export function filterTargetsByType(
  config: ArtkConfig,
  type: ArtkTargetType
): ArtkConfigTarget[] {
  return config.targets.filter((t) => t.type === type);
}

/**
 * Gets the storage state path for a target.
 */
export function getTargetStorageStatePath(
  config: ArtkConfig,
  targetName: string,
  role: string = 'default'
): string {
  const storageStateDir = config.auth?.storageStateDir ?? '.auth-states';
  return `${storageStateDir}/${targetName}/${role}.json`;
}
