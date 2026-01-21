'use strict';

var zod = require('zod');
var fs = require('fs');
var path = require('path');
var yaml = require('yaml');

// src/config/schema.ts
var SelectorStrategySchema = zod.z.enum([
  "role",
  "label",
  "placeholder",
  "text",
  "testid",
  "css"
]);
var PathsSchema = zod.z.object({
  journeys: zod.z.string().default("journeys"),
  modules: zod.z.string().default("e2e/modules"),
  tests: zod.z.string().default("e2e/tests"),
  templates: zod.z.string().default("artk/templates"),
  catalog: zod.z.string().default("artk/selectors")
});
var EslintSeveritySchema = zod.z.enum(["error", "warn", "off"]);
var EslintRulesSchema = zod.z.record(zod.z.string(), EslintSeveritySchema).default({
  "no-wait-for-timeout": "error",
  "no-force-option": "error",
  "prefer-web-first-assertions": "error"
});
var SelectorPolicySchema = zod.z.object({
  priority: zod.z.array(SelectorStrategySchema).default([
    "role",
    "label",
    "placeholder",
    "text",
    "testid",
    "css"
  ]),
  forbiddenPatterns: zod.z.array(zod.z.string()).default([])
});
var ValidationSchema = zod.z.object({
  eslintRules: EslintRulesSchema.default({
    "no-wait-for-timeout": "error",
    "no-force-option": "error",
    "prefer-web-first-assertions": "error"
  }),
  customRules: zod.z.array(zod.z.string()).default([])
});
var HealSchema = zod.z.object({
  enabled: zod.z.boolean().default(true),
  maxSuggestions: zod.z.number().min(1).max(10).default(5),
  skipPatterns: zod.z.array(zod.z.string()).default([])
});
var RegenerationStrategySchema = zod.z.enum(["ast", "blocks"]).default("ast");
var AutogenConfigSchema = zod.z.object({
  version: zod.z.literal(1).default(1),
  paths: PathsSchema.default({}),
  selectorPolicy: SelectorPolicySchema.default({}),
  validation: ValidationSchema.default({}),
  heal: HealSchema.default({}),
  regenerationStrategy: RegenerationStrategySchema
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
  }
};
function findConfigFile(rootDir) {
  for (const configPath of CONFIG_PATHS) {
    const fullPath = path.join(rootDir, configPath);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }
  return null;
}
function loadConfig(configPath) {
  const rootDir = process.cwd();
  let resolvedPath;
  if (configPath) {
    resolvedPath = path.resolve(rootDir, configPath);
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
  if (!fs.existsSync(resolvedPath)) {
    throw new ConfigLoadError(`Config file not found: ${resolvedPath}`);
  }
  let rawContent;
  try {
    rawContent = fs.readFileSync(resolvedPath, "utf-8");
  } catch (err) {
    throw new ConfigLoadError(`Failed to read config file: ${resolvedPath}`, err);
  }
  let parsed;
  try {
    parsed = yaml.parse(rawContent);
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
  return path.resolve(base, config.paths[pathKey]);
}

exports.AutogenConfigSchema = AutogenConfigSchema;
exports.ConfigLoadError = ConfigLoadError;
exports.EslintRulesSchema = EslintRulesSchema;
exports.EslintSeveritySchema = EslintSeveritySchema;
exports.HealSchema = HealSchema;
exports.PathsSchema = PathsSchema;
exports.RegenerationStrategySchema = RegenerationStrategySchema;
exports.SelectorPolicySchema = SelectorPolicySchema;
exports.SelectorStrategySchema = SelectorStrategySchema;
exports.ValidationSchema = ValidationSchema;
exports.findConfigFile = findConfigFile;
exports.getDefaultConfig = getDefaultConfig;
exports.loadConfig = loadConfig;
exports.resolveConfigPath = resolveConfigPath;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map