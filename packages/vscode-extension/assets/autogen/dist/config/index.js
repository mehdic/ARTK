import { z } from 'zod';
import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { parse } from 'yaml';

// src/config/schema.ts
var SelectorStrategySchema = z.enum([
  "role",
  "label",
  "placeholder",
  "text",
  "testid",
  "css"
]);
var PathsSchema = z.object({
  journeys: z.string().default("journeys"),
  modules: z.string().default("e2e/modules"),
  tests: z.string().default("e2e/tests"),
  templates: z.string().default("artk/templates"),
  catalog: z.string().default("artk/selectors")
});
var EslintSeveritySchema = z.enum(["error", "warn", "off"]);
var EslintRulesSchema = z.record(z.string(), EslintSeveritySchema).default({
  "no-wait-for-timeout": "error",
  "no-force-option": "error",
  "prefer-web-first-assertions": "error"
});
var SelectorPolicySchema = z.object({
  priority: z.array(SelectorStrategySchema).default([
    "role",
    "label",
    "placeholder",
    "text",
    "testid",
    "css"
  ]),
  forbiddenPatterns: z.array(z.string()).default([])
});
var ValidationSchema = z.object({
  eslintRules: EslintRulesSchema.default({
    "no-wait-for-timeout": "error",
    "no-force-option": "error",
    "prefer-web-first-assertions": "error"
  }),
  customRules: z.array(z.string()).default([])
});
var HealSchema = z.object({
  enabled: z.boolean().default(true),
  maxSuggestions: z.number().min(1).max(10).default(5),
  skipPatterns: z.array(z.string()).default([])
});
var RegenerationStrategySchema = z.enum(["ast", "blocks"]).default("ast");
var LLKBIntegrationLevelSchema = z.enum(["minimal", "enhance", "aggressive"]).default("enhance");
var LLKBIntegrationSchema = z.object({
  /** Enable LLKB integration (default: true - LLKB enhances test generation) */
  enabled: z.boolean().default(true),
  /** Path to LLKB-generated config file */
  configPath: z.string().optional(),
  /** Path to LLKB-generated glossary file */
  glossaryPath: z.string().optional(),
  /** Integration level */
  level: LLKBIntegrationLevelSchema
}).default({});
var AutogenConfigSchema = z.object({
  version: z.literal(1).default(1),
  paths: PathsSchema.default({}),
  selectorPolicy: SelectorPolicySchema.default({}),
  validation: ValidationSchema.default({}),
  heal: HealSchema.default({}),
  regenerationStrategy: RegenerationStrategySchema,
  llkb: LLKBIntegrationSchema
});
var CONFIG_PATHS = [
  "artk/autogen.config.yml",
  "artk/autogen.config.yaml",
  ".artk/autogen.config.yml",
  ".artk/autogen.config.yaml"
];
var ConfigLoadError = class extends Error {
  constructor(message, cause) {
    super(message);
    this.cause = cause;
    this.name = "ConfigLoadError";
    if (cause !== void 0) {
      this.cause = cause;
    }
  }
};
function findConfigFile(rootDir) {
  for (const configPath of CONFIG_PATHS) {
    const fullPath = join(rootDir, configPath);
    if (existsSync(fullPath)) {
      return fullPath;
    }
  }
  return null;
}
function loadConfig(configPath) {
  const rootDir = process.cwd();
  let resolvedPath;
  if (configPath) {
    resolvedPath = resolve(rootDir, configPath);
  } else {
    const found = findConfigFile(rootDir);
    if (!found) {
      console.warn(
        "No autogen config file found, using defaults. Create artk/autogen.config.yml to customize."
      );
      return AutogenConfigSchema.parse({});
    }
    resolvedPath = found;
  }
  if (!existsSync(resolvedPath)) {
    throw new ConfigLoadError(`Config file not found: ${resolvedPath}`);
  }
  let rawContent;
  try {
    rawContent = readFileSync(resolvedPath, "utf-8");
  } catch (err) {
    throw new ConfigLoadError(`Failed to read config file: ${resolvedPath}`, err);
  }
  let parsed;
  try {
    parsed = parse(rawContent);
  } catch (err) {
    throw new ConfigLoadError(`Invalid YAML in config file: ${resolvedPath}`, err);
  }
  const result = AutogenConfigSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new ConfigLoadError(
      `Invalid config in ${resolvedPath}:
${issues}`,
      result.error
    );
  }
  return result.data;
}
function getDefaultConfig() {
  return AutogenConfigSchema.parse({});
}
function resolveConfigPath(config, pathKey, rootDir) {
  const base = rootDir || process.cwd();
  return resolve(base, config.paths[pathKey]);
}
function loadSingleConfig(configPath) {
  const resolvedPath = resolve(process.cwd(), configPath);
  if (!existsSync(resolvedPath)) {
    throw new ConfigLoadError(`Config file not found: ${resolvedPath}`);
  }
  let rawContent;
  try {
    rawContent = readFileSync(resolvedPath, "utf-8");
  } catch (err) {
    throw new ConfigLoadError(`Failed to read config file: ${resolvedPath}`, err);
  }
  let parsed;
  try {
    parsed = parse(rawContent);
  } catch (err) {
    throw new ConfigLoadError(`Invalid YAML in config file: ${resolvedPath}`, err);
  }
  const result = AutogenConfigSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new ConfigLoadError(
      `Invalid config in ${resolvedPath}:
${issues}`,
      result.error
    );
  }
  return result.data;
}
function deepMerge(base, override) {
  const result = { ...base };
  for (const key of Object.keys(override)) {
    const overrideValue = override[key];
    if (overrideValue !== void 0) {
      result[key] = overrideValue;
    }
  }
  return result;
}
function mergeConfigs(configs) {
  if (configs.length === 0) {
    return getDefaultConfig();
  }
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
          .../* @__PURE__ */ new Set([
            ...merged.selectorPolicy?.forbiddenPatterns ?? [],
            ...config.selectorPolicy?.forbiddenPatterns ?? []
          ])
        ],
        // Priority is overwritten if provided, not merged
        priority: config.selectorPolicy?.priority?.length ? config.selectorPolicy.priority : merged.selectorPolicy?.priority
      },
      validation: {
        ...merged.validation,
        ...config.validation,
        eslintRules: {
          ...merged.validation?.eslintRules,
          ...config.validation?.eslintRules
        },
        customRules: [
          .../* @__PURE__ */ new Set([
            ...merged.validation?.customRules ?? [],
            ...config.validation?.customRules ?? []
          ])
        ]
      },
      heal: deepMerge(merged.heal, config.heal),
      llkb: deepMerge(merged.llkb, config.llkb)
    };
  });
}
function loadConfigs(configPaths) {
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
function loadLLKBConfig(basePath) {
  const llkbConfigPaths = [
    join(basePath, "autogen-llkb.config.yml"),
    join(basePath, "autogen-llkb.config.yaml")
  ];
  for (const llkbConfigPath of llkbConfigPaths) {
    if (existsSync(llkbConfigPath)) {
      try {
        return loadSingleConfig(llkbConfigPath);
      } catch {
        console.warn(`Warning: Invalid LLKB config at ${llkbConfigPath}, skipping`);
        return null;
      }
    }
  }
  return null;
}
function loadConfigWithMigration(configPath) {
  const config = loadConfig(configPath);
  if (config.llkb === void 0 || config.llkb === null) {
    config.llkb = {
      enabled: true,
      // LLKB should always be on by default
      level: "enhance"
      // Match schema default
    };
  } else {
    config.llkb = {
      enabled: config.llkb.enabled ?? true,
      // Default to true if not specified
      level: config.llkb.level ?? "enhance",
      // Default to enhance if not specified
      // Preserve any other user-specified fields
      ...config.llkb.configPath !== void 0 && { configPath: config.llkb.configPath },
      ...config.llkb.glossaryPath !== void 0 && { glossaryPath: config.llkb.glossaryPath }
    };
  }
  return config;
}
function needsConfigMigration(config) {
  if (typeof config !== "object" || config === null) {
    return false;
  }
  const obj = config;
  return obj.llkb === void 0;
}
function getSchemaVersion(config) {
  return config.version;
}

export { AutogenConfigSchema, ConfigLoadError, EslintRulesSchema, EslintSeveritySchema, HealSchema, LLKBIntegrationLevelSchema, LLKBIntegrationSchema, PathsSchema, RegenerationStrategySchema, SelectorPolicySchema, SelectorStrategySchema, ValidationSchema, findConfigFile, getDefaultConfig, getSchemaVersion, loadConfig, loadConfigWithMigration, loadConfigs, loadLLKBConfig, mergeConfigs, needsConfigMigration, resolveConfigPath };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map