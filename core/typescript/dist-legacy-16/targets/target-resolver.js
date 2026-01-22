"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TargetResolver = exports.EnvironmentNotFoundError = exports.TargetNotFoundError = void 0;
exports.createTargetResolver = createTargetResolver;
exports.resolveTarget = resolveTarget;
exports.getTargetUrl = getTargetUrl;
exports.getTargetNames = getTargetNames;
exports.validateTargetEnvironments = validateTargetEnvironments;
exports.configTargetToArtkTarget = configTargetToArtkTarget;
exports.filterTargetsByType = filterTargetsByType;
exports.getTargetStorageStatePath = getTargetStorageStatePath;
/**
 * Error thrown when a target cannot be resolved.
 */
class TargetNotFoundError extends Error {
    constructor(targetName, availableTargets) {
        super(`Target "${targetName}" not found. Available targets: ${availableTargets.length > 0 ? availableTargets.join(', ') : '(none)'}`);
        this.targetName = targetName;
        this.availableTargets = availableTargets;
        this.name = 'TargetNotFoundError';
    }
}
exports.TargetNotFoundError = TargetNotFoundError;
/**
 * Error thrown when an environment is not configured for a target.
 */
class EnvironmentNotFoundError extends Error {
    constructor(targetName, environment, availableEnvironments) {
        super(`Environment "${environment}" not found for target "${targetName}". ` +
            `Available environments: ${availableEnvironments.length > 0
                ? availableEnvironments.join(', ')
                : '(none)'}`);
        this.targetName = targetName;
        this.environment = environment;
        this.availableEnvironments = availableEnvironments;
        this.name = 'EnvironmentNotFoundError';
    }
}
exports.EnvironmentNotFoundError = EnvironmentNotFoundError;
/**
 * Target resolver class for ARTK E2E multi-target architecture.
 */
class TargetResolver {
    constructor(config, options) {
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
    resolve(targetName) {
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
    getUrl(targetName, environment) {
        const resolved = this.resolve(targetName);
        if (!resolved) {
            throw new TargetNotFoundError(targetName ?? '(default)', this.getTargetNames());
        }
        const env = environment ?? this.options.defaultEnvironment;
        const envConfig = resolved.configTarget.environments[env];
        if (!envConfig) {
            throw new EnvironmentNotFoundError(resolved.name, env, resolved.availableEnvironments);
        }
        return envConfig.baseUrl;
    }
    /**
     * Gets all target names.
     */
    getTargetNames() {
        return Array.from(this.targetMap.keys());
    }
    /**
     * Gets all resolved targets.
     */
    getAllTargets() {
        return Array.from(this.targetMap.values()).map((t) => this.toResolvedTarget(t));
    }
    /**
     * Gets the default target.
     */
    getDefaultTarget() {
        if (!this.options.defaultTarget) {
            return null;
        }
        return this.resolve(this.options.defaultTarget);
    }
    /**
     * Checks if a target exists.
     */
    hasTarget(targetName) {
        return this.targetMap.has(targetName);
    }
    /**
     * Checks if an environment exists for a target.
     */
    hasEnvironment(targetName, environment) {
        const target = this.targetMap.get(targetName);
        if (!target) {
            return false;
        }
        return environment in target.environments;
    }
    /**
     * Gets all environments for a target.
     */
    getEnvironments(targetName) {
        const target = this.targetMap.get(targetName);
        if (!target) {
            return [];
        }
        return Object.keys(target.environments);
    }
    /**
     * Converts a config target to a resolved target.
     */
    toResolvedTarget(configTarget) {
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
exports.TargetResolver = TargetResolver;
/**
 * Creates a target resolver from a config.
 *
 * @param config - ARTK configuration
 * @param options - Resolver options
 * @returns Target resolver instance
 */
function createTargetResolver(config, options) {
    return new TargetResolver(config, options);
}
/**
 * Resolves a target by name from a config.
 *
 * @param config - ARTK configuration
 * @param targetName - Target name (or undefined for default)
 * @returns Resolved target or null
 */
function resolveTarget(config, targetName) {
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
function getTargetUrl(config, targetName, environment) {
    const resolver = new TargetResolver(config);
    return resolver.getUrl(targetName, environment);
}
/**
 * Gets all target names from a config.
 *
 * @param config - ARTK configuration
 * @returns Array of target names
 */
function getTargetNames(config) {
    return config.targets.map((t) => t.name);
}
/**
 * Validates that all targets have the required environments.
 *
 * @param config - ARTK configuration
 * @param requiredEnvironments - List of required environment names
 * @returns Validation result
 */
function validateTargetEnvironments(config, requiredEnvironments) {
    const errors = [];
    for (const target of config.targets) {
        const available = Object.keys(target.environments);
        const missing = requiredEnvironments.filter((env) => !available.includes(env));
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
function configTargetToArtkTarget(configTarget, detectedBy = []) {
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
function filterTargetsByType(config, type) {
    return config.targets.filter((t) => t.type === type);
}
/**
 * Gets the storage state path for a target.
 */
function getTargetStorageStatePath(config, targetName, role = 'default') {
    const storageStateDir = config.auth?.storageStateDir ?? '.auth-states';
    return `${storageStateDir}/${targetName}/${role}.json`;
}
//# sourceMappingURL=target-resolver.js.map