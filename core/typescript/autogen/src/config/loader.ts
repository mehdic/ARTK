/**
 * Config loader for artk/autogen.config.yml
 * @see research/2026-01-02_autogen-refined-plan.md Section 7
 * @see research/2026-01-23_llkb-autogen-integration-specification.md (LLKB integration)
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { AutogenConfigSchema, type AutogenConfig } from './schema.js';

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
  constructor(
    message: string,
    public readonly cause?: unknown // Preserved for error chaining, used by callers
  ) {
    super(message);
    this.name = 'ConfigLoadError';
    // Store cause in standard Error.cause property if supported
    if (cause !== undefined) {
      (this as { cause?: unknown }).cause = cause;
    }
  }
}

/**
 * Find the config file in the project
 */
export function findConfigFile(rootDir: string): string | null {
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
export function loadConfig(configPath?: string): AutogenConfig {
  const rootDir = process.cwd();
  let resolvedPath: string;

  if (configPath) {
    resolvedPath = resolve(rootDir, configPath);
  } else {
    const found = findConfigFile(rootDir);
    if (!found) {
      // Return default config if no file found
      console.warn(
        'No autogen config file found, using defaults. Create artk/autogen.config.yml to customize.'
      );
      return AutogenConfigSchema.parse({});
    }
    resolvedPath = found;
  }

  if (!existsSync(resolvedPath)) {
    throw new ConfigLoadError(`Config file not found: ${resolvedPath}`);
  }

  let rawContent: string;
  try {
    rawContent = readFileSync(resolvedPath, 'utf-8');
  } catch (err) {
    throw new ConfigLoadError(`Failed to read config file: ${resolvedPath}`, err);
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(rawContent);
  } catch (err) {
    throw new ConfigLoadError(`Invalid YAML in config file: ${resolvedPath}`, err);
  }

  // Validate with Zod schema
  const result = AutogenConfigSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new ConfigLoadError(
      `Invalid config in ${resolvedPath}:\n${issues}`,
      result.error
    );
  }

  return result.data;
}

/**
 * Get the default config without loading from file
 */
export function getDefaultConfig(): AutogenConfig {
  return AutogenConfigSchema.parse({});
}

/**
 * Resolve a path from config relative to project root
 */
export function resolveConfigPath(
  config: AutogenConfig,
  pathKey: keyof AutogenConfig['paths'],
  rootDir?: string
): string {
  const base = rootDir || process.cwd();
  return resolve(base, config.paths[pathKey]);
}

/**
 * Load a single config file without validation error handling
 * Used internally by loadConfigs for multi-config merging
 */
function loadSingleConfig(configPath: string): AutogenConfig {
  const resolvedPath = resolve(process.cwd(), configPath);

  if (!existsSync(resolvedPath)) {
    throw new ConfigLoadError(`Config file not found: ${resolvedPath}`);
  }

  let rawContent: string;
  try {
    rawContent = readFileSync(resolvedPath, 'utf-8');
  } catch (err) {
    throw new ConfigLoadError(`Failed to read config file: ${resolvedPath}`, err);
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(rawContent);
  } catch (err) {
    throw new ConfigLoadError(`Invalid YAML in config file: ${resolvedPath}`, err);
  }

  const result = AutogenConfigSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new ConfigLoadError(
      `Invalid config in ${resolvedPath}:\n${issues}`,
      result.error
    );
  }

  return result.data;
}

/**
 * Deep merge helper for nested objects
 * Only merges properties that are explicitly defined (not undefined)
 */
function deepMerge<T extends Record<string, unknown>>(base: T, override: Partial<T>): T {
  const result = { ...base };

  for (const key of Object.keys(override) as Array<keyof T>) {
    const overrideValue = override[key];
    if (overrideValue !== undefined) {
      result[key] = overrideValue as T[keyof T];
    }
  }

  return result;
}

/**
 * Merge multiple configs with later configs taking precedence
 * Arrays are merged additively for forbiddenPatterns, but overwritten for others
 * @see research/2026-01-23_llkb-autogen-integration-specification.md Round 2
 */
export function mergeConfigs(configs: AutogenConfig[]): AutogenConfig {
  if (configs.length === 0) {
    return getDefaultConfig();
  }

  // Start with first config, then merge subsequent configs into it
  return configs.reduce((merged, config, index) => {
    if (index === 0) {
      return config;
    }

    return {
      ...merged,
      version: config.version ?? merged.version,
      regenerationStrategy: config.regenerationStrategy ?? merged.regenerationStrategy,
      paths: deepMerge(merged.paths, config.paths),
      selectorPolicy: {
        ...merged.selectorPolicy,
        ...config.selectorPolicy,
        // Merge arrays additively for forbiddenPatterns
        forbiddenPatterns: [
          ...new Set([
            ...(merged.selectorPolicy?.forbiddenPatterns ?? []),
            ...(config.selectorPolicy?.forbiddenPatterns ?? []),
          ]),
        ],
        // Priority is overwritten if provided, not merged
        priority: config.selectorPolicy?.priority?.length
          ? config.selectorPolicy.priority
          : merged.selectorPolicy?.priority,
      },
      validation: {
        ...merged.validation,
        ...config.validation,
        eslintRules: {
          ...merged.validation?.eslintRules,
          ...config.validation?.eslintRules,
        },
        customRules: [
          ...new Set([
            ...(merged.validation?.customRules ?? []),
            ...(config.validation?.customRules ?? []),
          ]),
        ],
      },
      heal: deepMerge(merged.heal, config.heal),
      llkb: deepMerge(merged.llkb, config.llkb),
    };
  });
}

/**
 * Load and merge multiple config files
 * Later configs take precedence over earlier ones
 * @param configPaths - Array of config file paths to load and merge
 * @returns Merged config
 */
export function loadConfigs(configPaths: string[]): AutogenConfig {
  const existingPaths = configPaths.filter((p) => {
    const resolved = resolve(process.cwd(), p);
    return existsSync(resolved);
  });

  if (existingPaths.length === 0) {
    return getDefaultConfig();
  }

  const configs = existingPaths.map((p) => loadSingleConfig(p));
  return mergeConfigs(configs);
}

/**
 * Load LLKB extension config if present
 * @param basePath - Base path to search for LLKB config
 * @returns Partial config or null if not found
 */
export function loadLLKBConfig(basePath: string): AutogenConfig | null {
  const llkbConfigPaths = [
    join(basePath, 'autogen-llkb.config.yml'),
    join(basePath, 'autogen-llkb.config.yaml'),
  ];

  for (const llkbConfigPath of llkbConfigPaths) {
    if (existsSync(llkbConfigPath)) {
      try {
        return loadSingleConfig(llkbConfigPath);
      } catch {
        // If LLKB config is invalid, return null rather than failing
        console.warn(`Warning: Invalid LLKB config at ${llkbConfigPath}, skipping`);
        return null;
      }
    }
  }

  return null;
}

/**
 * Load config with automatic migration for backward compatibility (T009)
 *
 * This function ensures backward compatibility when the llkb field was added
 * to the AutogenConfig schema. Old configs without the llkb field will be
 * migrated to include it with default values.
 *
 * @param configPath - Path to config file, or project root to auto-detect
 * @returns Parsed config with llkb field guaranteed to exist
 *
 * @example
 * ```typescript
 * // Load config with automatic migration
 * const config = loadConfigWithMigration();
 * // config.llkb is guaranteed to exist (even for old configs)
 * ```
 */
export function loadConfigWithMigration(configPath?: string): AutogenConfig {
  const config = loadConfig(configPath);

  // Migration: Ensure llkb field exists
  // The schema already has .default({}) but we add explicit migration
  // for clarity and to handle edge cases where partial configs are loaded
  if (config.llkb === undefined) {
    config.llkb = {
      enabled: true,  // LLKB should always be on by default
      level: 'enhance',  // Match schema default
    };
  }

  return config;
}

/**
 * Check if a config needs migration
 *
 * @param config - Config to check
 * @returns True if migration is needed
 */
export function needsConfigMigration(config: unknown): boolean {
  if (typeof config !== 'object' || config === null) {
    return false;
  }

  const obj = config as Record<string, unknown>;

  // Check if llkb field is missing or undefined
  return obj.llkb === undefined;
}

/**
 * Get schema version from config
 *
 * This helps track which version of the schema a config file was created with.
 * Future schema changes can use this for more sophisticated migrations.
 *
 * @param config - Config object
 * @returns Schema version number
 */
export function getSchemaVersion(config: AutogenConfig): number {
  return config.version;
}
