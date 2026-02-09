#!/usr/bin/env node
import { z } from 'zod';
import { existsSync, readFileSync, mkdirSync, writeFileSync, realpathSync, renameSync, unlinkSync, rmSync, appendFileSync, statSync, readdirSync, mkdtempSync } from 'fs';
import { dirname, join, resolve, relative, isAbsolute, basename } from 'path';
import yaml, { stringify, parse } from 'yaml';
import { fileURLToPath, pathToFileURL } from 'url';
import fg2 from 'fast-glob';
import { randomBytes, createHash } from 'crypto';
import ejs from 'ejs';
import 'ts-morph';
import { spawn, spawnSync, execSync } from 'child_process';
import { tmpdir } from 'os';
import { parseArgs } from 'util';
import { createInterface } from 'readline';

var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/ir/types.ts
var init_types = __esm({
  "src/ir/types.ts"() {
  }
});

// src/ir/builder.ts
var LocatorBuilder, ValueBuilder, StepBuilder, JourneyBuilder;
var init_builder = __esm({
  "src/ir/builder.ts"() {
    LocatorBuilder = class _LocatorBuilder {
      spec = {};
      static role(role, name) {
        const builder = new _LocatorBuilder();
        builder.spec.strategy = "role";
        builder.spec.value = role;
        if (name) {
          builder.spec.options = { ...builder.spec.options, name };
        }
        return builder;
      }
      static label(label) {
        const builder = new _LocatorBuilder();
        builder.spec.strategy = "label";
        builder.spec.value = label;
        return builder;
      }
      static placeholder(placeholder) {
        const builder = new _LocatorBuilder();
        builder.spec.strategy = "placeholder";
        builder.spec.value = placeholder;
        return builder;
      }
      static text(text) {
        const builder = new _LocatorBuilder();
        builder.spec.strategy = "text";
        builder.spec.value = text;
        return builder;
      }
      static testId(testId) {
        const builder = new _LocatorBuilder();
        builder.spec.strategy = "testid";
        builder.spec.value = testId;
        return builder;
      }
      static css(selector) {
        const builder = new _LocatorBuilder();
        builder.spec.strategy = "css";
        builder.spec.value = selector;
        return builder;
      }
      static fromSpec(strategy, value) {
        const builder = new _LocatorBuilder();
        builder.spec.strategy = strategy;
        builder.spec.value = value;
        return builder;
      }
      exact(exact = true) {
        this.spec.options = { ...this.spec.options, exact };
        return this;
      }
      level(level) {
        this.spec.options = { ...this.spec.options, level };
        return this;
      }
      strict(strict = true) {
        this.spec.options = { ...this.spec.options, strict };
        return this;
      }
      name(name) {
        this.spec.options = { ...this.spec.options, name };
        return this;
      }
      build() {
        if (!this.spec.strategy || !this.spec.value) {
          throw new Error("LocatorSpec requires strategy and value");
        }
        return this.spec;
      }
    };
    ValueBuilder = class {
      static literal(value) {
        return { type: "literal", value };
      }
      static actor(path) {
        return { type: "actor", value: path };
      }
      static runId() {
        return { type: "runId", value: "runId" };
      }
      static generated(template) {
        return { type: "generated", value: template };
      }
      static testData(path) {
        return { type: "testData", value: path };
      }
    };
    StepBuilder = class {
      step = {
        actions: [],
        assertions: [],
        notes: []
      };
      constructor(id, description) {
        this.step.id = id;
        this.step.description = description;
      }
      sourceText(text) {
        this.step.sourceText = text;
        return this;
      }
      note(note) {
        this.step.notes.push(note);
        return this;
      }
      // Navigation actions
      goto(url, waitForLoad = true) {
        this.step.actions.push({ type: "goto", url, waitForLoad });
        return this;
      }
      waitForURL(pattern) {
        this.step.actions.push({ type: "waitForURL", pattern });
        return this;
      }
      // Interaction actions
      click(locator) {
        const spec = locator instanceof LocatorBuilder ? locator.build() : locator;
        this.step.actions.push({ type: "click", locator: spec });
        return this;
      }
      fill(locator, value) {
        const spec = locator instanceof LocatorBuilder ? locator.build() : locator;
        const valueSpec = typeof value === "string" ? ValueBuilder.literal(value) : value;
        this.step.actions.push({ type: "fill", locator: spec, value: valueSpec });
        return this;
      }
      select(locator, option) {
        const spec = locator instanceof LocatorBuilder ? locator.build() : locator;
        this.step.actions.push({ type: "select", locator: spec, option });
        return this;
      }
      check(locator) {
        const spec = locator instanceof LocatorBuilder ? locator.build() : locator;
        this.step.actions.push({ type: "check", locator: spec });
        return this;
      }
      press(key, locator) {
        const spec = locator ? locator instanceof LocatorBuilder ? locator.build() : locator : void 0;
        this.step.actions.push({ type: "press", key, locator: spec });
        return this;
      }
      // Assertions
      expectVisible(locator, timeout) {
        const spec = locator instanceof LocatorBuilder ? locator.build() : locator;
        this.step.assertions.push({ type: "expectVisible", locator: spec, timeout });
        return this;
      }
      expectNotVisible(locator, timeout) {
        const spec = locator instanceof LocatorBuilder ? locator.build() : locator;
        this.step.assertions.push({ type: "expectNotVisible", locator: spec, timeout });
        return this;
      }
      expectText(locator, text, timeout) {
        const spec = locator instanceof LocatorBuilder ? locator.build() : locator;
        this.step.assertions.push({ type: "expectText", locator: spec, text, timeout });
        return this;
      }
      expectURL(pattern) {
        this.step.assertions.push({ type: "expectURL", pattern });
        return this;
      }
      expectTitle(title) {
        this.step.assertions.push({ type: "expectTitle", title });
        return this;
      }
      expectToast(toastType, message) {
        this.step.assertions.push({ type: "expectToast", toastType, message });
        return this;
      }
      // Module calls
      callModule(module, method, args) {
        this.step.actions.push({ type: "callModule", module, method, args });
        return this;
      }
      // Blocked step
      blocked(reason, sourceText) {
        this.step.actions.push({ type: "blocked", reason, sourceText });
        return this;
      }
      // Raw primitive
      action(primitive) {
        this.step.actions.push(primitive);
        return this;
      }
      assertion(primitive) {
        this.step.assertions.push(primitive);
        return this;
      }
      build() {
        if (!this.step.id || !this.step.description) {
          throw new Error("IRStep requires id and description");
        }
        return this.step;
      }
    };
    JourneyBuilder = class {
      journey = {
        tags: [],
        steps: [],
        moduleDependencies: { foundation: [], feature: [] }
      };
      constructor(id, title) {
        this.journey.id = id;
        this.journey.title = title;
      }
      tier(tier) {
        this.journey.tier = tier;
        return this;
      }
      scope(scope) {
        this.journey.scope = scope;
        return this;
      }
      actor(actor) {
        this.journey.actor = actor;
        return this;
      }
      tag(tag) {
        this.journey.tags.push(tag);
        return this;
      }
      tags(tags) {
        this.journey.tags.push(...tags);
        return this;
      }
      foundationModule(module) {
        this.journey.moduleDependencies.foundation.push(module);
        return this;
      }
      featureModule(module) {
        this.journey.moduleDependencies.feature.push(module);
        return this;
      }
      modules(deps) {
        this.journey.moduleDependencies = deps;
        return this;
      }
      data(config) {
        this.journey.data = config;
        return this;
      }
      completion(signals) {
        this.journey.completion = signals;
        return this;
      }
      setup(primitives) {
        this.journey.setup = primitives;
        return this;
      }
      step(step) {
        const builtStep = step instanceof StepBuilder ? step.build() : step;
        this.journey.steps.push(builtStep);
        return this;
      }
      cleanup(primitives) {
        this.journey.cleanup = primitives;
        return this;
      }
      revision(rev) {
        this.journey.revision = rev;
        return this;
      }
      sourcePath(path) {
        this.journey.sourcePath = path;
        return this;
      }
      build() {
        if (!this.journey.id || !this.journey.title || !this.journey.tier || !this.journey.scope || !this.journey.actor) {
          throw new Error("IRJourney requires id, title, tier, scope, and actor");
        }
        const standardTags = [
          "@artk",
          "@journey",
          `@${this.journey.id}`,
          `@tier-${this.journey.tier}`,
          `@scope-${this.journey.scope}`
        ];
        const allTags = [.../* @__PURE__ */ new Set([...standardTags, ...this.journey.tags])];
        this.journey.tags = allTags;
        return this.journey;
      }
    };
    ({
      journey: (id, title) => new JourneyBuilder(id, title),
      step: (id, description) => new StepBuilder(id, description),
      locator: {
        role: LocatorBuilder.role,
        label: LocatorBuilder.label,
        placeholder: LocatorBuilder.placeholder,
        text: LocatorBuilder.text,
        testId: LocatorBuilder.testId,
        css: LocatorBuilder.css
      },
      value: ValueBuilder
    });
  }
});

// src/ir/serialize.ts
var init_serialize = __esm({
  "src/ir/serialize.ts"() {
  }
});
var SelectorStrategySchema, PathsSchema, EslintSeveritySchema, EslintRulesSchema, SelectorPolicySchema, ValidationSchema, HealSchema, RegenerationStrategySchema, LLKBIntegrationLevelSchema, LLKBIntegrationSchema, AutogenConfigSchema;
var init_schema = __esm({
  "src/config/schema.ts"() {
    SelectorStrategySchema = z.enum([
      "role",
      "label",
      "placeholder",
      "text",
      "testid",
      "css"
    ]);
    PathsSchema = z.object({
      journeys: z.string().default("journeys"),
      modules: z.string().default("e2e/modules"),
      tests: z.string().default("e2e/tests"),
      templates: z.string().default("artk/templates"),
      catalog: z.string().default("artk/selectors")
    });
    EslintSeveritySchema = z.enum(["error", "warn", "off"]);
    EslintRulesSchema = z.record(z.string(), EslintSeveritySchema).default({
      "no-wait-for-timeout": "error",
      "no-force-option": "error",
      "prefer-web-first-assertions": "error"
    });
    SelectorPolicySchema = z.object({
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
    ValidationSchema = z.object({
      eslintRules: EslintRulesSchema.default({
        "no-wait-for-timeout": "error",
        "no-force-option": "error",
        "prefer-web-first-assertions": "error"
      }),
      customRules: z.array(z.string()).default([])
    });
    HealSchema = z.object({
      enabled: z.boolean().default(true),
      maxSuggestions: z.number().min(1).max(10).default(5),
      skipPatterns: z.array(z.string()).default([])
    });
    RegenerationStrategySchema = z.enum(["ast", "blocks"]).default("ast");
    LLKBIntegrationLevelSchema = z.enum(["minimal", "enhance", "aggressive"]).default("enhance");
    LLKBIntegrationSchema = z.object({
      /** Enable LLKB integration (default: true - LLKB enhances test generation) */
      enabled: z.boolean().default(true),
      /** Path to LLKB-generated config file */
      configPath: z.string().optional(),
      /** Path to LLKB-generated glossary file */
      glossaryPath: z.string().optional(),
      /** Integration level */
      level: LLKBIntegrationLevelSchema
    }).default({});
    AutogenConfigSchema = z.object({
      version: z.literal(1).default(1),
      paths: PathsSchema.default({}),
      selectorPolicy: SelectorPolicySchema.default({}),
      validation: ValidationSchema.default({}),
      heal: HealSchema.default({}),
      regenerationStrategy: RegenerationStrategySchema,
      llkb: LLKBIntegrationSchema
    });
  }
});
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
  } catch (err3) {
    throw new ConfigLoadError(`Failed to read config file: ${resolvedPath}`, err3);
  }
  let parsed;
  try {
    parsed = parse(rawContent);
  } catch (err3) {
    throw new ConfigLoadError(`Invalid YAML in config file: ${resolvedPath}`, err3);
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
function loadSingleConfig(configPath) {
  const resolvedPath = resolve(process.cwd(), configPath);
  if (!existsSync(resolvedPath)) {
    throw new ConfigLoadError(`Config file not found: ${resolvedPath}`);
  }
  let rawContent;
  try {
    rawContent = readFileSync(resolvedPath, "utf-8");
  } catch (err3) {
    throw new ConfigLoadError(`Failed to read config file: ${resolvedPath}`, err3);
  }
  let parsed;
  try {
    parsed = parse(rawContent);
  } catch (err3) {
    throw new ConfigLoadError(`Invalid YAML in config file: ${resolvedPath}`, err3);
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
var CONFIG_PATHS, ConfigLoadError;
var init_loader = __esm({
  "src/config/loader.ts"() {
    init_schema();
    CONFIG_PATHS = [
      "artk/autogen.config.yml",
      "artk/autogen.config.yaml",
      ".artk/autogen.config.yml",
      ".artk/autogen.config.yaml"
    ];
    ConfigLoadError = class extends Error {
      constructor(message, cause) {
        super(message);
        this.cause = cause;
        this.name = "ConfigLoadError";
        if (cause !== void 0) {
          this.cause = cause;
        }
      }
    };
  }
});
var JourneyStatusSchema, JourneyTierSchema, DataStrategySchema, CleanupStrategySchema, CompletionTypeSchema, ElementStateSchema, CompletionSignalSchema, DataConfigSchema, ModulesSchema, TestRefSchema, LinksSchema, NegativePathSchema, VisualRegressionSchema, AccessibilityTimingSchema, AccessibilitySchema, PerformanceSchema, TestDataSetSchema, JourneyFrontmatterSchema;
var init_schema2 = __esm({
  "src/journey/schema.ts"() {
    JourneyStatusSchema = z.enum([
      "proposed",
      "defined",
      "clarified",
      "implemented",
      "quarantined",
      "deprecated"
    ]);
    JourneyTierSchema = z.enum(["smoke", "release", "regression"]);
    DataStrategySchema = z.enum(["seed", "create", "reuse"]);
    CleanupStrategySchema = z.enum(["required", "best-effort", "none"]);
    CompletionTypeSchema = z.enum(["url", "toast", "element", "text", "title", "api"]);
    ElementStateSchema = z.enum(["visible", "hidden", "attached", "detached"]);
    CompletionSignalSchema = z.object({
      type: CompletionTypeSchema,
      value: z.string().min(1, "Completion signal value is required"),
      options: z.object({
        timeout: z.number().positive().optional(),
        exact: z.boolean().optional(),
        state: ElementStateSchema.optional(),
        method: z.string().optional(),
        status: z.number().int().positive().optional()
      }).optional()
    });
    DataConfigSchema = z.object({
      strategy: DataStrategySchema.default("create"),
      cleanup: CleanupStrategySchema.default("best-effort")
    });
    ModulesSchema = z.object({
      foundation: z.array(z.string()).default([]),
      features: z.array(z.string()).default([])
    });
    TestRefSchema = z.object({
      file: z.string(),
      line: z.number().optional()
    });
    LinksSchema = z.object({
      issues: z.array(z.string()).optional(),
      prs: z.array(z.string()).optional(),
      docs: z.array(z.string()).optional()
    });
    NegativePathSchema = z.object({
      name: z.string().min(1, "Negative path name is required"),
      input: z.record(z.any()),
      expectedError: z.string().min(1, "Expected error message is required"),
      expectedElement: z.string().optional()
    });
    VisualRegressionSchema = z.object({
      enabled: z.boolean(),
      snapshots: z.array(z.string()).optional(),
      threshold: z.number().min(0).max(1).optional()
    });
    AccessibilityTimingSchema = z.enum(["afterEach", "inTest"]);
    AccessibilitySchema = z.object({
      enabled: z.boolean(),
      rules: z.array(z.string()).optional(),
      exclude: z.array(z.string()).optional(),
      /**
       * When to run accessibility checks:
       * - 'afterEach': Run after each test (default, catches issues but doesn't fail individual tests)
       * - 'inTest': Run within test steps (fails immediately, better for CI)
       */
      timing: AccessibilityTimingSchema.default("afterEach")
    });
    PerformanceSchema = z.object({
      enabled: z.boolean(),
      budgets: z.object({
        lcp: z.number().positive().optional(),
        fid: z.number().positive().optional(),
        cls: z.number().min(0).optional(),
        ttfb: z.number().positive().optional()
      }).optional(),
      /** Timeout for collecting performance metrics in ms (default: 3000) */
      collectTimeout: z.number().positive().optional()
    });
    TestDataSetSchema = z.object({
      name: z.string().min(1, "Test data set name is required"),
      description: z.string().optional(),
      data: z.record(z.string(), z.any())
    });
    JourneyFrontmatterSchema = z.object({
      id: z.string().regex(/^JRN-\d{4}$/, "Journey ID must be in format JRN-XXXX"),
      title: z.string().min(1, "Title is required"),
      status: JourneyStatusSchema,
      tier: JourneyTierSchema,
      scope: z.string().min(1, "Scope is required"),
      actor: z.string().min(1, "Actor is required"),
      revision: z.number().int().positive().default(1),
      owner: z.string().optional(),
      statusReason: z.string().optional(),
      modules: ModulesSchema.default({ foundation: [], features: [] }),
      tests: z.array(z.union([z.string(), TestRefSchema])).default([]),
      data: DataConfigSchema.optional(),
      completion: z.array(CompletionSignalSchema).optional(),
      links: LinksSchema.optional(),
      tags: z.array(z.string()).optional(),
      flags: z.object({
        required: z.array(z.string()).optional(),
        forbidden: z.array(z.string()).optional()
      }).optional(),
      prerequisites: z.array(z.string()).optional().describe("Array of Journey IDs that must run first"),
      negativePaths: z.array(NegativePathSchema).optional().describe("Error scenarios to test"),
      testData: z.array(TestDataSetSchema).optional().describe("Parameterized test data sets for data-driven testing"),
      visualRegression: VisualRegressionSchema.optional(),
      accessibility: AccessibilitySchema.optional(),
      performance: PerformanceSchema.optional()
    });
    JourneyFrontmatterSchema.extend({
      status: z.literal("clarified")
    }).refine(
      (data) => {
        return data.completion && data.completion.length > 0;
      },
      {
        message: "Clarified journeys must have at least one completion signal",
        path: ["completion"]
      }
    );
    JourneyFrontmatterSchema.extend({
      status: z.literal("implemented")
    }).refine(
      (data) => {
        return data.tests && data.tests.length > 0;
      },
      {
        message: "Implemented journeys must have at least one test reference",
        path: ["tests"]
      }
    );
    JourneyFrontmatterSchema.extend({
      status: z.literal("quarantined"),
      owner: z.string().min(1, "Quarantined journeys require an owner"),
      statusReason: z.string().min(1, "Quarantined journeys require a status reason")
    }).refine(
      (data) => {
        return data.links?.issues && data.links.issues.length > 0;
      },
      {
        message: "Quarantined journeys must have at least one linked issue",
        path: ["links", "issues"]
      }
    );
  }
});

// src/mapping/patterns.ts
function createLocatorFromMatch(strategy, value, name) {
  const locator = { strategy, value };
  if (name) {
    locator.options = { name };
  }
  return locator;
}
function createValueFromText(text) {
  if (/^\{\{.+\}\}$/.test(text)) {
    const path = text.slice(2, -2).trim();
    return { type: "actor", value: path };
  }
  if (/^\$.+/.test(text)) {
    return { type: "testData", value: text.slice(1) };
  }
  if (/\$\{.+\}/.test(text)) {
    return { type: "generated", value: text };
  }
  return { type: "literal", value: text };
}
function parseSelectorToLocator(selector) {
  const cleanSelector = selector.replace(/^the\s+/i, "").trim();
  if (/button$/i.test(cleanSelector)) {
    const buttonName = cleanSelector.replace(/\s*button$/i, "").trim();
    return { strategy: "role", value: "button", name: buttonName };
  }
  if (/link$/i.test(cleanSelector)) {
    const linkName = cleanSelector.replace(/\s*link$/i, "").trim();
    return { strategy: "role", value: "link", name: linkName };
  }
  if (/(?:input|field)$/i.test(cleanSelector)) {
    const labelName = cleanSelector.replace(/\s*(?:input|field)$/i, "").trim();
    return { strategy: "label", value: labelName };
  }
  return { strategy: "text", value: cleanSelector };
}
function matchPattern(text) {
  const trimmedText = text.trim();
  for (const pattern of allPatterns) {
    const match = trimmedText.match(pattern.regex);
    if (match) {
      const primitive = pattern.extract(match);
      if (primitive) {
        return primitive;
      }
    }
  }
  return null;
}
function getAllPatternNames() {
  return allPatterns.map((p) => p.name);
}
var PATTERN_VERSION, navigationPatterns, clickPatterns, fillPatterns, selectPatterns, checkPatterns, visibilityPatterns, toastPatterns, urlPatterns, authPatterns, waitPatterns, structuredPatterns, extendedClickPatterns, extendedFillPatterns, extendedAssertionPatterns, extendedWaitPatterns, extendedNavigationPatterns, extendedSelectPatterns, hoverPatterns, focusPatterns, modalAlertPatterns, allPatterns;
var init_patterns = __esm({
  "src/mapping/patterns.ts"() {
    PATTERN_VERSION = "1.1.0";
    navigationPatterns = [
      {
        name: "navigate-to-url",
        regex: /^(?:user\s+)?(?:navigates?|go(?:es)?|opens?)\s+(?:to\s+)?(?:the\s+)?["']?([^"'\s]+)["']?$/i,
        primitiveType: "goto",
        extract: (match) => ({
          type: "goto",
          url: match[1],
          waitForLoad: true
        })
      },
      {
        name: "navigate-to-page",
        regex: /^(?:user\s+)?(?:navigates?|go(?:es)?|opens?)\s+(?:to\s+)?(?:the\s+)?(.+?)\s+page$/i,
        primitiveType: "goto",
        extract: (match) => ({
          type: "goto",
          url: `/${match[1].toLowerCase().replace(/\s+/g, "-")}`,
          waitForLoad: true
        })
      },
      {
        name: "wait-for-url-change",
        // "Wait for URL to change to '/dashboard'" or "Wait until URL contains '/settings'"
        regex: /^(?:user\s+)?waits?\s+(?:for\s+)?(?:the\s+)?url\s+(?:to\s+)?(?:change\s+to|contain|include)\s+["']?([^"']+)["']?$/i,
        primitiveType: "waitForURL",
        extract: (match) => ({
          type: "waitForURL",
          pattern: match[1]
        })
      }
    ];
    clickPatterns = [
      {
        name: "click-button-quoted",
        regex: /^(?:user\s+)?(?:clicks?|presses?|taps?|selects?)\s+(?:on\s+)?(?:the\s+)?["']([^"']+)["']\s+button$/i,
        primitiveType: "click",
        extract: (match) => ({
          type: "click",
          locator: createLocatorFromMatch("role", "button", match[1])
        })
      },
      {
        name: "click-link-quoted",
        regex: /^(?:user\s+)?(?:clicks?|presses?|taps?|selects?)\s+(?:on\s+)?(?:the\s+)?["']([^"']+)["']\s+link$/i,
        primitiveType: "click",
        extract: (match) => ({
          type: "click",
          locator: createLocatorFromMatch("role", "link", match[1])
        })
      },
      {
        name: "click-menuitem-quoted",
        // "Click the 'Settings' menu item" or "Click on 'Edit' menuitem"
        regex: /^(?:user\s+)?(?:clicks?|selects?)\s+(?:on\s+)?(?:the\s+)?["']([^"']+)["']\s+menu\s*item$/i,
        primitiveType: "click",
        extract: (match) => ({
          type: "click",
          locator: createLocatorFromMatch("role", "menuitem", match[1])
        })
      },
      {
        name: "click-tab-quoted",
        // "Click the 'Details' tab" or "Select the 'Overview' tab"
        regex: /^(?:user\s+)?(?:clicks?|selects?)\s+(?:on\s+)?(?:the\s+)?["']([^"']+)["']\s+tab$/i,
        primitiveType: "click",
        extract: (match) => ({
          type: "click",
          locator: createLocatorFromMatch("role", "tab", match[1])
        })
      },
      {
        name: "click-element-quoted",
        regex: /^(?:user\s+)?(?:clicks?|presses?|taps?|selects?)\s+(?:on\s+)?(?:the\s+)?["']([^"']+)["']$/i,
        primitiveType: "click",
        extract: (match) => ({
          type: "click",
          locator: createLocatorFromMatch("text", match[1])
        })
      },
      {
        name: "click-element-generic",
        regex: /^(?:user\s+)?(?:clicks?|presses?|taps?|selects?)\s+(?:on\s+)?(?:the\s+)?(.+?)\s+(?:button|link|icon|menu|tab)$/i,
        primitiveType: "click",
        extract: (match) => ({
          type: "click",
          locator: createLocatorFromMatch("text", match[1])
        })
      }
    ];
    fillPatterns = [
      {
        name: "fill-field-quoted-value",
        regex: /^(?:user\s+)?(?:enters?|types?|fills?\s+in?|inputs?)\s+["']([^"']+)["']\s+(?:in|into)\s+(?:the\s+)?["']([^"']+)["']\s*(?:field|input)?$/i,
        primitiveType: "fill",
        extract: (match) => ({
          type: "fill",
          locator: createLocatorFromMatch("label", match[2]),
          value: createValueFromText(match[1])
        })
      },
      {
        name: "fill-field-actor-value",
        regex: /^(?:user\s+)?(?:enters?|types?|fills?\s+in?|inputs?)\s+(\{\{[^}]+\}\})\s+(?:in|into)\s+(?:the\s+)?["']([^"']+)["']\s*(?:field|input)?$/i,
        primitiveType: "fill",
        extract: (match) => ({
          type: "fill",
          locator: createLocatorFromMatch("label", match[2]),
          value: createValueFromText(match[1])
        })
      },
      {
        name: "fill-placeholder-field",
        // "Fill 'test@example.com' in the field with placeholder 'Enter email'"
        // or "Type 'value' into input with placeholder 'Search'"
        regex: /^(?:user\s+)?(?:enters?|types?|fills?)\s+["']([^"']+)["']\s+(?:in|into)\s+(?:the\s+)?(?:field|input)\s+with\s+placeholder\s+["']([^"']+)["']$/i,
        primitiveType: "fill",
        extract: (match) => ({
          type: "fill",
          locator: createLocatorFromMatch("placeholder", match[2]),
          value: createValueFromText(match[1])
        })
      },
      {
        name: "fill-field-generic",
        regex: /^(?:user\s+)?(?:enters?|types?|fills?\s+in?|inputs?)\s+(.+?)\s+(?:in|into)\s+(?:the\s+)?(.+?)\s*(?:field|input)?$/i,
        primitiveType: "fill",
        extract: (match) => ({
          type: "fill",
          locator: createLocatorFromMatch("label", match[2].replace(/["']/g, "")),
          value: createValueFromText(match[1].replace(/["']/g, ""))
        })
      }
    ];
    selectPatterns = [
      {
        name: "select-option",
        regex: /^(?:user\s+)?(?:selects?|chooses?)\s+["']([^"']+)["']\s+(?:from|in)\s+(?:the\s+)?["']([^"']+)["']\s*(?:dropdown|select|menu)?$/i,
        primitiveType: "select",
        extract: (match) => ({
          type: "select",
          locator: createLocatorFromMatch("label", match[2]),
          option: match[1]
        })
      }
    ];
    checkPatterns = [
      {
        name: "check-checkbox",
        regex: /^(?:user\s+)?(?:checks?|enables?|ticks?)\s+(?:the\s+)?["']([^"']+)["']\s*(?:checkbox|option)?$/i,
        primitiveType: "check",
        extract: (match) => ({
          type: "check",
          locator: createLocatorFromMatch("label", match[1])
        })
      },
      {
        // "Check the terms checkbox" - unquoted checkbox name
        name: "check-checkbox-unquoted",
        regex: /^(?:user\s+)?(?:checks?|enables?|ticks?)\s+(?:the\s+)?(\w+(?:\s+\w+)*)\s+checkbox$/i,
        primitiveType: "check",
        extract: (match) => ({
          type: "check",
          locator: createLocatorFromMatch("label", match[1])
        })
      },
      {
        name: "uncheck-checkbox",
        regex: /^(?:user\s+)?(?:unchecks?|disables?|unticks?)\s+(?:the\s+)?["']([^"']+)["']\s*(?:checkbox|option)?$/i,
        primitiveType: "uncheck",
        extract: (match) => ({
          type: "uncheck",
          locator: createLocatorFromMatch("label", match[1])
        })
      },
      {
        // "Uncheck the newsletter checkbox" - unquoted checkbox name
        name: "uncheck-checkbox-unquoted",
        regex: /^(?:user\s+)?(?:unchecks?|disables?|unticks?)\s+(?:the\s+)?(\w+(?:\s+\w+)*)\s+checkbox$/i,
        primitiveType: "uncheck",
        extract: (match) => ({
          type: "uncheck",
          locator: createLocatorFromMatch("label", match[1])
        })
      }
    ];
    visibilityPatterns = [
      {
        name: "should-see-text",
        regex: /^(?:user\s+)?(?:should\s+)?(?:sees?|views?)\s+(?:the\s+)?["']([^"']+)["']$/i,
        primitiveType: "expectVisible",
        extract: (match) => ({
          type: "expectVisible",
          locator: createLocatorFromMatch("text", match[1])
        })
      },
      {
        name: "is-visible",
        regex: /^["']?([^"']+)["']?\s+(?:is\s+)?(?:visible|displayed|shown)$/i,
        primitiveType: "expectVisible",
        extract: (match) => ({
          type: "expectVisible",
          locator: createLocatorFromMatch("text", match[1])
        })
      },
      {
        name: "should-see-element",
        regex: /^(?:user\s+)?(?:should\s+)?(?:sees?|views?)\s+(?:the\s+)?(.+?)\s+(?:heading|button|link|form|page|element)$/i,
        primitiveType: "expectVisible",
        extract: (match) => ({
          type: "expectVisible",
          locator: createLocatorFromMatch("text", match[1])
        })
      },
      {
        name: "page-displayed",
        regex: /^(?:the\s+)?(.+?)\s+(?:page|screen|view)\s+(?:is\s+)?(?:displayed|shown|visible)$/i,
        primitiveType: "expectVisible",
        extract: (match) => ({
          type: "expectVisible",
          locator: createLocatorFromMatch("text", match[1])
        })
      }
    ];
    toastPatterns = [
      {
        name: "success-toast-message",
        // "A success toast with 'Account created' appears" (pre-verb, quoted)
        regex: /^(?:a\s+)?success\s+toast\s+(?:with\s+)?["']([^"']+)["']\s*(?:message\s+)?(?:appears?|is\s+shown|displays?)$/i,
        primitiveType: "expectToast",
        extract: (match) => ({
          type: "expectToast",
          toastType: "success",
          message: match[1]
        })
      },
      {
        name: "success-toast-appears-with",
        // "A success toast appears with Account created" (post-verb, unquoted)
        regex: /^(?:a\s+)?success\s+toast\s+(?:appears?|is\s+shown|displays?)\s+(?:with\s+)?(?:(?:message|text)\s+)?["']?(.+?)["']?$/i,
        primitiveType: "expectToast",
        extract: (match) => ({
          type: "expectToast",
          toastType: "success",
          message: match[1]
        })
      },
      {
        name: "error-toast-message",
        // "An error toast with 'Invalid email' appears" (pre-verb, quoted)
        regex: /^(?:an?\s+)?error\s+toast\s+(?:with\s+)?["']([^"']+)["']\s*(?:message\s+)?(?:appears?|is\s+shown|displays?)$/i,
        primitiveType: "expectToast",
        extract: (match) => ({
          type: "expectToast",
          toastType: "error",
          message: match[1]
        })
      },
      {
        name: "error-toast-appears-with",
        // "An error toast appears with Invalid email" (post-verb, unquoted)
        regex: /^(?:an?\s+)?error\s+toast\s+(?:appears?|is\s+shown|displays?)\s+(?:with\s+)?(?:(?:message|text)\s+)?["']?(.+?)["']?$/i,
        primitiveType: "expectToast",
        extract: (match) => ({
          type: "expectToast",
          toastType: "error",
          message: match[1]
        })
      },
      {
        name: "toast-appears",
        // "A success toast appears" or "A toast notification appears"
        regex: /^(?:a\s+)?(?:(success|error|info|warning)\s+)?toast\s+(?:notification\s+)?(?:appears?|is\s+shown|displays?)$/i,
        primitiveType: "expectToast",
        extract: (match) => ({
          type: "expectToast",
          toastType: match[1]?.toLowerCase() ?? "info"
        })
      },
      {
        name: "toast-with-text",
        // "Toast with text 'Hello' appears" (quoted) or "Toast with text Hello appears" (unquoted)
        regex: /^(?:a\s+)?(?:toast|notification)\s+(?:with\s+)?(?:(?:text|message)\s+)?["']?(.+?)["']?\s+(?:appears?|is\s+shown|displays?)$/i,
        primitiveType: "expectToast",
        extract: (match) => ({
          type: "expectToast",
          toastType: "info",
          message: match[1]
        })
      },
      {
        name: "status-message-visible",
        // "A status message 'Processing...' is visible" or "The status shows 'Loading'"
        regex: /^(?:a\s+)?status\s+(?:message\s+)?["']([^"']+)["']\s+(?:is\s+)?(?:visible|shown|displayed)$/i,
        primitiveType: "expectVisible",
        extract: (match) => ({
          type: "expectVisible",
          locator: createLocatorFromMatch("role", "status", match[1])
        })
      },
      {
        name: "verify-status-message",
        // "Verify the status message shows 'Complete'"
        regex: /^(?:verify|check)\s+(?:that\s+)?(?:the\s+)?status\s+(?:message\s+)?(?:shows?|displays?|contains?)\s+["']([^"']+)["']$/i,
        primitiveType: "expectVisible",
        extract: (match) => ({
          type: "expectVisible",
          locator: createLocatorFromMatch("role", "status", match[1])
        })
      }
    ];
    urlPatterns = [
      {
        name: "url-contains",
        regex: /^(?:the\s+)?url\s+(?:should\s+)?(?:contains?|includes?)\s+["']?([^"'\s]+)["']?$/i,
        primitiveType: "expectURL",
        extract: (match) => ({
          type: "expectURL",
          pattern: match[1]
        })
      },
      {
        name: "url-is",
        regex: /^(?:the\s+)?url\s+(?:should\s+)?(?:is|equals?|be)\s+["']?([^"'\s]+)["']?$/i,
        primitiveType: "expectURL",
        extract: (match) => ({
          type: "expectURL",
          pattern: match[1]
        })
      },
      {
        name: "redirected-to",
        regex: /^(?:user\s+)?(?:is\s+)?redirected\s+to\s+["']?([^"'\s]+)["']?$/i,
        primitiveType: "expectURL",
        extract: (match) => ({
          type: "expectURL",
          pattern: match[1]
        })
      }
    ];
    authPatterns = [
      {
        name: "user-login",
        regex: /^(?:user\s+)?(?:logs?\s*in|login\s+is\s+performed|authenticates?)$/i,
        primitiveType: "callModule",
        extract: (_match) => ({
          type: "callModule",
          module: "auth",
          method: "login"
        })
      },
      {
        name: "user-logout",
        regex: /^(?:user\s+)?(?:logs?\s*out|logout\s+is\s+performed|signs?\s*out)$/i,
        primitiveType: "callModule",
        extract: (_match) => ({
          type: "callModule",
          module: "auth",
          method: "logout"
        })
      },
      {
        name: "login-as-role",
        regex: /^(?:user\s+)?logs?\s*in\s+as\s+(?:an?\s+)?(.+?)(?:\s+user)?$/i,
        primitiveType: "callModule",
        extract: (match) => ({
          type: "callModule",
          module: "auth",
          method: "loginAs",
          args: [match[1].toLowerCase()]
        })
      }
    ];
    waitPatterns = [
      {
        name: "wait-for-navigation",
        regex: /^(?:user\s+)?(?:waits?\s+)?(?:for\s+)?navigation\s+to\s+["']?([^"'\s]+)["']?$/i,
        primitiveType: "waitForURL",
        extract: (match) => ({
          type: "waitForURL",
          pattern: match[1]
        })
      },
      {
        name: "wait-for-page",
        regex: /^(?:user\s+)?(?:waits?\s+)?(?:for\s+)?(?:the\s+)?(.+?)\s+(?:page|screen)\s+to\s+load$/i,
        primitiveType: "waitForLoadingComplete",
        extract: (_match) => ({
          type: "waitForLoadingComplete"
        })
      }
    ];
    structuredPatterns = [
      // Action patterns
      {
        name: "structured-action-click",
        regex: /^\*\*Action\*\*:\s*[Cc]lick\s+(?:the\s+)?['"]?(.+?)['"]?\s*(?:button|link)?$/i,
        primitiveType: "click",
        extract: (match) => {
          const target = match[1];
          const locatorInfo = parseSelectorToLocator(target + " button");
          return {
            type: "click",
            locator: locatorInfo.name ? createLocatorFromMatch(locatorInfo.strategy, locatorInfo.value, locatorInfo.name) : { strategy: locatorInfo.strategy, value: locatorInfo.value }
          };
        }
      },
      {
        name: "structured-action-fill",
        regex: /^\*\*Action\*\*:\s*[Ff]ill\s+(?:in\s+)?['"]?(.+?)['"]?\s+with\s+['"]?(.+?)['"]?$/i,
        primitiveType: "fill",
        extract: (match) => {
          const target = match[1];
          const value = match[2];
          const locatorInfo = parseSelectorToLocator(target);
          return {
            type: "fill",
            locator: locatorInfo.name ? createLocatorFromMatch(locatorInfo.strategy, locatorInfo.value, locatorInfo.name) : { strategy: locatorInfo.strategy, value: locatorInfo.value },
            value: createValueFromText(value)
          };
        }
      },
      {
        name: "structured-action-navigate",
        regex: /^\*\*Action\*\*:\s*[Nn]avigate\s+to\s+['"]?(.+?)['"]?$/i,
        primitiveType: "goto",
        extract: (match) => ({
          type: "goto",
          url: match[1],
          waitForLoad: true
        })
      },
      // Wait patterns
      {
        name: "structured-wait-for-visible",
        regex: /^\*\*Wait for\*\*:\s*(.+?)\s+(?:to\s+)?(?:be\s+)?(?:visible|appear|load)/i,
        primitiveType: "expectVisible",
        extract: (match) => {
          const target = match[1];
          const locatorInfo = parseSelectorToLocator(target);
          return {
            type: "expectVisible",
            locator: locatorInfo.name ? createLocatorFromMatch(locatorInfo.strategy, locatorInfo.value, locatorInfo.name) : { strategy: locatorInfo.strategy, value: locatorInfo.value }
          };
        }
      },
      // Assert patterns
      {
        name: "structured-assert-visible",
        regex: /^\*\*Assert\*\*:\s*(.+?)\s+(?:is\s+)?visible$/i,
        primitiveType: "expectVisible",
        extract: (match) => {
          const target = match[1];
          const locatorInfo = parseSelectorToLocator(target);
          return {
            type: "expectVisible",
            locator: locatorInfo.name ? createLocatorFromMatch(locatorInfo.strategy, locatorInfo.value, locatorInfo.name) : { strategy: locatorInfo.strategy, value: locatorInfo.value }
          };
        }
      },
      {
        name: "structured-assert-text",
        regex: /^\*\*Assert\*\*:\s*(.+?)\s+(?:contains|has text)\s+['"]?(.+?)['"]?$/i,
        primitiveType: "expectText",
        extract: (match) => {
          const target = match[1];
          const text = match[2];
          const locatorInfo = parseSelectorToLocator(target);
          return {
            type: "expectText",
            locator: locatorInfo.name ? createLocatorFromMatch(locatorInfo.strategy, locatorInfo.value, locatorInfo.name) : { strategy: locatorInfo.strategy, value: locatorInfo.value },
            text
          };
        }
      }
    ];
    extendedClickPatterns = [
      {
        name: "click-on-element",
        // "Click on Submit" or "Click on the Submit button" or "Select on the item"
        regex: /^(?:user\s+)?(?:clicks?|selects?)\s+on\s+(?:the\s+)?(.+?)(?:\s+button|\s+link)?$/i,
        primitiveType: "click",
        extract: (match) => ({
          type: "click",
          locator: createLocatorFromMatch("text", match[1].replace(/["']/g, ""))
        })
      },
      {
        name: "press-enter-key",
        // "Press Enter" or "Press the Enter key" or "Hit Enter"
        regex: /^(?:user\s+)?(?:press(?:es)?|hits?)\s+(?:the\s+)?(?:enter|return)(?:\s+key)?$/i,
        primitiveType: "press",
        extract: () => ({
          type: "press",
          key: "Enter"
        })
      },
      {
        name: "press-tab-key",
        // "Press Tab" or "Press the Tab key"
        regex: /^(?:user\s+)?(?:press(?:es)?|hits?)\s+(?:the\s+)?tab(?:\s+key)?$/i,
        primitiveType: "press",
        extract: () => ({
          type: "press",
          key: "Tab"
        })
      },
      {
        name: "press-escape-key",
        // "Press Escape" or "Press Esc"
        regex: /^(?:user\s+)?(?:press(?:es)?|hits?)\s+(?:the\s+)?(?:escape|esc)(?:\s+key)?$/i,
        primitiveType: "press",
        extract: () => ({
          type: "press",
          key: "Escape"
        })
      },
      {
        name: "double-click",
        // "Double click on" or "Double-click the"
        regex: /^(?:user\s+)?double[-\s]?clicks?\s+(?:on\s+)?(?:the\s+)?["']?(.+?)["']?$/i,
        primitiveType: "dblclick",
        extract: (match) => ({
          type: "dblclick",
          locator: createLocatorFromMatch("text", match[1].replace(/["']/g, ""))
        })
      },
      {
        name: "right-click",
        // "Right click on" or "Right-click the"
        regex: /^(?:user\s+)?right[-\s]?clicks?\s+(?:on\s+)?(?:the\s+)?["']?(.+?)["']?$/i,
        primitiveType: "rightClick",
        extract: (match) => ({
          type: "rightClick",
          locator: createLocatorFromMatch("text", match[1].replace(/["']/g, ""))
        })
      },
      {
        name: "submit-form",
        // "Submit the form" or "Submits form"
        regex: /^(?:user\s+)?submits?\s+(?:the\s+)?form$/i,
        primitiveType: "click",
        extract: () => ({
          type: "click",
          locator: createLocatorFromMatch("role", "button", "Submit")
        })
      }
    ];
    extendedFillPatterns = [
      {
        name: "fill-field-with-value",
        // "Fill the username field with john" or "Fill the 'description' field with 'the value'"
        regex: /^(?:user\s+)?(?:fills?|enters?|types?|inputs?)(?:\s+in)?\s+(?:the\s+)?["']?(.+?)["']?\s+(?:field|input)\s+with\s+["']?(.+?)["']?$/i,
        primitiveType: "fill",
        extract: (match) => ({
          type: "fill",
          locator: createLocatorFromMatch("label", match[1].replace(/["']/g, "")),
          value: createValueFromText(match[2].replace(/["']/g, ""))
        })
      },
      {
        name: "type-into-field",
        // "Type 'password' into the Password field"
        regex: /^(?:user\s+)?types?\s+['"](.+?)['"]\s+into\s+(?:the\s+)?["']?(.+?)["']?\s*(?:field|input)?$/i,
        primitiveType: "fill",
        extract: (match) => ({
          type: "fill",
          locator: createLocatorFromMatch("label", match[2]),
          value: createValueFromText(match[1])
        })
      },
      {
        name: "fill-in-field-no-value",
        // "Fill in the email address" (without explicit value - uses actor data)
        regex: /^(?:user\s+)?fills?\s+in\s+(?:the\s+)?["']?(.+?)["']?\s*(?:field|input)?$/i,
        primitiveType: "fill",
        extract: (match) => {
          const fieldName = match[1].replace(/["']/g, "");
          return {
            type: "fill",
            locator: createLocatorFromMatch("label", fieldName),
            value: { type: "actor", value: fieldName.toLowerCase().replace(/\s+/g, "_") }
          };
        }
      },
      {
        name: "clear-field",
        // "Clear the email field" or "Clears the input"
        regex: /^(?:user\s+)?clears?\s+(?:the\s+)?["']?(.+?)["']?\s*(?:field|input)?$/i,
        primitiveType: "clear",
        extract: (match) => ({
          type: "clear",
          locator: createLocatorFromMatch("label", match[1].replace(/["']/g, ""))
        })
      },
      {
        name: "set-value",
        // "Set the value to 'test'" or "Sets field to 'value'"
        regex: /^(?:user\s+)?sets?\s+(?:the\s+)?(?:value\s+)?(?:of\s+)?["']?(.+?)["']?\s+to\s+['"](.+?)['"]$/i,
        primitiveType: "fill",
        extract: (match) => ({
          type: "fill",
          locator: createLocatorFromMatch("label", match[1]),
          value: createValueFromText(match[2])
        })
      }
    ];
    extendedAssertionPatterns = [
      // ═══════════════════════════════════════════════════════════════════════════
      // MOST SPECIFIC: Negative assertions (must come before positive counterparts)
      // ═══════════════════════════════════════════════════════════════════════════
      {
        name: "verify-not-visible",
        // "Verify the error container is not visible"
        regex: /^(?:verify|confirm|check)\s+(?:that\s+)?(?:the\s+)?["']?(.+?)["']?\s+is\s+not\s+visible$/i,
        primitiveType: "expectHidden",
        extract: (match) => ({
          type: "expectHidden",
          locator: createLocatorFromMatch("text", match[1])
        })
      },
      {
        name: "element-should-not-be-visible",
        // "The error should not be visible" or "Error message is not displayed"
        regex: /^(?:the\s+)?["']?(.+?)["']?\s+(?:should\s+)?(?:not\s+be|is\s+not)\s+(?:visible|displayed|shown)$/i,
        primitiveType: "expectHidden",
        extract: (match) => ({
          type: "expectHidden",
          locator: createLocatorFromMatch("text", match[1])
        })
      },
      // ═══════════════════════════════════════════════════════════════════════════
      // URL AND TITLE: Specific patterns that match "URL" or "title" keywords
      // ═══════════════════════════════════════════════════════════════════════════
      {
        name: "verify-url-contains",
        // "Verify the URL contains '/dashboard'"
        regex: /^(?:verify|confirm|check)\s+(?:that\s+)?(?:the\s+)?url\s+contains?\s+["']([^"']+)["']$/i,
        primitiveType: "expectURL",
        extract: (match) => ({
          type: "expectURL",
          pattern: match[1]
        })
      },
      {
        name: "verify-title-is",
        // "Verify the page title is 'Settings'"
        regex: /^(?:verify|confirm|check)\s+(?:that\s+)?(?:the\s+)?(?:page\s+)?title\s+(?:is|equals?)\s+["']([^"']+)["']$/i,
        primitiveType: "expectTitle",
        extract: (match) => ({
          type: "expectTitle",
          title: match[1]
        })
      },
      // ═══════════════════════════════════════════════════════════════════════════
      // SPECIFIC STATE ASSERTIONS: enabled, disabled, checked, value, count
      // ═══════════════════════════════════════════════════════════════════════════
      {
        name: "verify-field-value",
        // "Verify the username field has value 'testuser'"
        regex: /^(?:verify|confirm|check)\s+(?:that\s+)?(?:the\s+)?["']?(\w+)["']?\s+(?:field\s+)?has\s+value\s+["']([^"']+)["']$/i,
        primitiveType: "expectValue",
        extract: (match) => ({
          type: "expectValue",
          locator: createLocatorFromMatch("label", match[1]),
          value: match[2]
        })
      },
      {
        name: "verify-element-enabled",
        // "Verify the submit button is enabled"
        regex: /^(?:verify|confirm|check)\s+(?:that\s+)?(?:the\s+)?["']?(.+?)["']?\s+(?:button\s+)?is\s+enabled$/i,
        primitiveType: "expectEnabled",
        extract: (match) => ({
          type: "expectEnabled",
          locator: createLocatorFromMatch("label", match[1])
        })
      },
      {
        name: "verify-element-disabled",
        // "Verify the disabled input is disabled"
        regex: /^(?:verify|confirm|check)\s+(?:that\s+)?(?:the\s+)?["']?(.+?)["']?\s+(?:input\s+)?is\s+disabled$/i,
        primitiveType: "expectDisabled",
        extract: (match) => ({
          type: "expectDisabled",
          locator: createLocatorFromMatch("label", match[1])
        })
      },
      {
        name: "verify-checkbox-checked",
        // "Verify the checkbox is checked"
        regex: /^(?:verify|confirm|check)\s+(?:that\s+)?(?:the\s+)?["']?(.+?)["']?\s+(?:checkbox\s+)?is\s+checked$/i,
        primitiveType: "expectChecked",
        extract: (match) => ({
          type: "expectChecked",
          locator: createLocatorFromMatch("label", match[1])
        })
      },
      {
        name: "verify-count",
        // "Verify 5 items are shown" or "Verify 3 elements exist"
        regex: /^(?:verify|confirm|check)\s+(?:that\s+)?(\d+)\s+(?:items?|elements?|rows?)\s+(?:are\s+)?(?:shown|displayed|exist|visible)$/i,
        primitiveType: "expectCount",
        extract: (match) => ({
          type: "expectCount",
          locator: { strategy: "text", value: "item" },
          count: parseInt(match[1], 10)
        })
      },
      // ═══════════════════════════════════════════════════════════════════════════
      // GENERIC VISIBILITY: Catch-all patterns for "is visible/displayed/showing"
      // These must come AFTER specific patterns to avoid over-matching
      // ═══════════════════════════════════════════════════════════════════════════
      {
        name: "verify-element-showing",
        // "Verify the dashboard is showing/displayed"
        regex: /^(?:verify|confirm|ensure)\s+(?:that\s+)?(?:the\s+)?["']?(.+?)["']?\s+(?:is\s+)?(?:showing|displayed|visible)$/i,
        primitiveType: "expectVisible",
        extract: (match) => ({
          type: "expectVisible",
          locator: createLocatorFromMatch("text", match[1])
        })
      },
      {
        name: "page-should-show",
        // "The page should show 'Welcome'" or "Page should display 'text'"
        regex: /^(?:the\s+)?page\s+should\s+(?:show|display|contain)\s+['"](.+?)['"]$/i,
        primitiveType: "expectText",
        extract: (match) => ({
          type: "expectText",
          locator: { strategy: "role", value: "main" },
          text: match[1]
        })
      },
      {
        name: "make-sure-assertion",
        // "Make sure the button is visible" or "Make sure user sees 'text'"
        regex: /^make\s+sure\s+(?:that\s+)?(?:the\s+)?(.+?)\s+(?:is\s+)?(?:visible|displayed|shown)$/i,
        primitiveType: "expectVisible",
        extract: (match) => ({
          type: "expectVisible",
          locator: createLocatorFromMatch("text", match[1])
        })
      },
      {
        name: "confirm-that-assertion",
        // "Confirm that the message appears", "Verify success message appears", or "Confirm the error is shown"
        regex: /^(?:verify|confirm)\s+(?:that\s+)?(?:the\s+)?["']?(.+?)["']?\s+(?:appears?|is\s+shown|displays?)$/i,
        primitiveType: "expectVisible",
        extract: (match) => ({
          type: "expectVisible",
          locator: createLocatorFromMatch("text", match[1])
        })
      },
      {
        name: "check-element-exists",
        // "Check that the element exists" or "Check the button is present"
        regex: /^check\s+(?:that\s+)?(?:the\s+)?["']?(.+?)["']?\s+(?:exists?|is\s+present)$/i,
        primitiveType: "expectVisible",
        extract: (match) => ({
          type: "expectVisible",
          locator: createLocatorFromMatch("text", match[1])
        })
      },
      // ═══════════════════════════════════════════════════════════════════════════
      // GENERIC TEXT ASSERTIONS: "contains" patterns (must be last to avoid conflicts)
      // ═══════════════════════════════════════════════════════════════════════════
      {
        name: "element-contains-text",
        // "The header contains 'Welcome'" or "Element should contain 'text'"
        regex: /^(?:the\s+)?["']?(.+?)["']?\s+(?:should\s+)?contains?\s+['"](.+?)['"]$/i,
        primitiveType: "expectText",
        extract: (match) => ({
          type: "expectText",
          locator: createLocatorFromMatch("text", match[1]),
          text: match[2]
        })
      }
    ];
    extendedWaitPatterns = [
      {
        name: "wait-for-element-visible",
        // "Wait for the loading spinner to disappear"
        regex: /^(?:user\s+)?waits?\s+(?:for\s+)?(?:the\s+)?["']?(.+?)["']?\s+to\s+(?:disappear|be\s+hidden)$/i,
        primitiveType: "waitForHidden",
        extract: (match) => ({
          type: "waitForHidden",
          locator: createLocatorFromMatch("text", match[1])
        })
      },
      {
        name: "wait-for-element-appear",
        // "Wait for the modal to appear" or "Wait for dialog to show"
        regex: /^(?:user\s+)?waits?\s+(?:for\s+)?(?:the\s+)?["']?(.+?)["']?\s+to\s+(?:appear|show|be\s+visible)$/i,
        primitiveType: "waitForVisible",
        extract: (match) => ({
          type: "waitForVisible",
          locator: createLocatorFromMatch("text", match[1])
        })
      },
      {
        name: "wait-until-loaded",
        // "Wait until the page is loaded" or "Wait until content loads"
        regex: /^(?:user\s+)?waits?\s+until\s+(?:the\s+)?(?:page|content|data)\s+(?:is\s+)?loaded$/i,
        primitiveType: "waitForLoadingComplete",
        extract: () => ({
          type: "waitForLoadingComplete"
        })
      },
      {
        name: "wait-seconds",
        // "Wait for 2 seconds" or "Wait 3 seconds"
        regex: /^(?:user\s+)?waits?\s+(?:for\s+)?(\d+)\s+seconds?$/i,
        primitiveType: "waitForTimeout",
        extract: (match) => ({
          type: "waitForTimeout",
          ms: parseInt(match[1], 10) * 1e3
        })
      },
      {
        name: "wait-for-network",
        // "Wait for network to be idle" or "Wait for network idle"
        regex: /^(?:user\s+)?waits?\s+(?:for\s+)?(?:the\s+)?network\s+(?:to\s+be\s+)?idle$/i,
        primitiveType: "waitForNetworkIdle",
        extract: () => ({
          type: "waitForNetworkIdle"
        })
      }
    ];
    extendedNavigationPatterns = [
      {
        name: "refresh-page",
        // "Refresh the page" or "Reload the page"
        regex: /^(?:user\s+)?(?:refresh(?:es)?|reloads?)\s+(?:the\s+)?page$/i,
        primitiveType: "reload",
        extract: () => ({
          type: "reload"
        })
      },
      {
        name: "go-back",
        // "Go back" or "Navigate back" or "User goes back"
        regex: /^(?:user\s+)?(?:go(?:es)?|navigates?)\s+back$/i,
        primitiveType: "goBack",
        extract: () => ({
          type: "goBack"
        })
      },
      {
        name: "go-forward",
        // "Go forward" or "Navigate forward"
        regex: /^(?:user\s+)?(?:go(?:es)?|navigates?)\s+forward$/i,
        primitiveType: "goForward",
        extract: () => ({
          type: "goForward"
        })
      }
    ];
    extendedSelectPatterns = [
      {
        name: "select-from-named-dropdown",
        // "Select 'USA' from the country dropdown" or "Select 'Large' from the size selector"
        regex: /^(?:user\s+)?(?:selects?|chooses?)\s+["'](.+?)["']\s+from\s+(?:the\s+)?(.+?)\s*(?:dropdown|select|selector|menu|list)$/i,
        primitiveType: "select",
        extract: (match) => ({
          type: "select",
          locator: createLocatorFromMatch("label", match[2].trim()),
          option: match[1]
        })
      },
      {
        name: "select-from-dropdown",
        // "Select 'Option' from dropdown" or "Choose 'Value' from the dropdown"
        regex: /^(?:user\s+)?(?:selects?|chooses?)\s+['"](.+?)['"]\s+from\s+(?:the\s+)?dropdown$/i,
        primitiveType: "select",
        extract: (match) => ({
          type: "select",
          locator: { strategy: "role", value: "combobox" },
          option: match[1]
        })
      },
      {
        name: "select-option-named",
        // "Select option 'Value'" or "Select option named 'Premium'" or "Choose the 'Option' option"
        regex: /^(?:user\s+)?(?:selects?|chooses?)\s+(?:the\s+)?(?:option\s+)?(?:named\s+)?["'](.+?)["'](?:\s+option)?$/i,
        primitiveType: "select",
        extract: (match) => ({
          type: "select",
          locator: { strategy: "role", value: "combobox" },
          option: match[1]
        })
      }
    ];
    hoverPatterns = [
      {
        name: "hover-over-element",
        // "Hover over the menu" or "User hovers on button"
        regex: /^(?:user\s+)?hovers?\s+(?:over|on)\s+(?:the\s+)?["']?(.+?)["']?$/i,
        primitiveType: "hover",
        extract: (match) => ({
          type: "hover",
          locator: createLocatorFromMatch("text", match[1].replace(/["']/g, ""))
        })
      },
      {
        name: "mouse-over",
        // "Mouse over the element" or "Mouseover the button"
        regex: /^(?:user\s+)?mouse\s*over\s+(?:the\s+)?["']?(.+?)["']?$/i,
        primitiveType: "hover",
        extract: (match) => ({
          type: "hover",
          locator: createLocatorFromMatch("text", match[1].replace(/["']/g, ""))
        })
      }
    ];
    focusPatterns = [
      {
        name: "focus-on-element",
        // "Focus on the input" or "User focuses the field"
        regex: /^(?:user\s+)?focus(?:es)?\s+(?:on\s+)?(?:the\s+)?["']?(.+?)["']?$/i,
        primitiveType: "focus",
        extract: (match) => ({
          type: "focus",
          locator: createLocatorFromMatch("label", match[1].replace(/["']/g, ""))
        })
      }
    ];
    modalAlertPatterns = [
      {
        name: "dismiss-modal",
        // "Dismiss the modal" or "Close the modal dialog"
        regex: /^(?:dismiss|close)\s+(?:the\s+)?(?:modal|dialog)(?:\s+dialog)?$/i,
        primitiveType: "dismissModal",
        extract: () => ({
          type: "dismissModal"
        })
      },
      {
        name: "accept-alert",
        // "Accept the alert" or "Click OK on alert"
        regex: /^(?:accept|confirm|ok)\s+(?:the\s+)?alert$/i,
        primitiveType: "acceptAlert",
        extract: () => ({
          type: "acceptAlert"
        })
      },
      {
        name: "dismiss-alert",
        // "Dismiss the alert" or "Cancel the alert"
        regex: /^(?:dismiss|cancel|close)\s+(?:the\s+)?alert$/i,
        primitiveType: "dismissAlert",
        extract: () => ({
          type: "dismissAlert"
        })
      }
    ];
    allPatterns = [
      ...structuredPatterns,
      ...authPatterns,
      ...toastPatterns,
      ...modalAlertPatterns,
      // Modal/alert patterns for dialog handling
      // Extended patterns come BEFORE base patterns to match more specific cases first
      ...extendedNavigationPatterns,
      // Must be before navigationPatterns (e.g., "Go back" vs "Go to")
      ...navigationPatterns,
      ...extendedClickPatterns,
      // Must be before clickPatterns (e.g., "Click on" vs "Click")
      ...clickPatterns,
      ...extendedFillPatterns,
      ...fillPatterns,
      ...extendedSelectPatterns,
      ...selectPatterns,
      ...checkPatterns,
      ...extendedAssertionPatterns,
      // Must be before visibilityPatterns (e.g., "not be visible")
      ...visibilityPatterns,
      ...urlPatterns,
      ...extendedWaitPatterns,
      ...waitPatterns,
      ...hoverPatterns,
      ...focusPatterns
    ];
  }
});

// src/utils/result.ts
var init_result = __esm({
  "src/utils/result.ts"() {
  }
});
function extractFrontmatter(content) {
  const match = FRONTMATTER_REGEX.exec(content);
  if (!match) {
    throw new Error("No YAML frontmatter found (content should start with ---)");
  }
  return {
    frontmatter: match[1],
    body: content.slice(match[0].length).trim()
  };
}
function parseAcceptanceCriteria(body) {
  const criteria = [];
  const acSectionMatch = body.match(/##\s*Acceptance\s*Criteria\s*\n([\s\S]*?)(?=\n##\s[^#]|$)/i);
  if (!acSectionMatch) {
    return criteria;
  }
  const acSection = acSectionMatch[1];
  const acPattern = /^###?\s*(AC-\d+)[:\s]*(.*?)$/gim;
  const parts = [];
  let match;
  while ((match = acPattern.exec(acSection)) !== null) {
    parts.push({
      id: match[1].toUpperCase(),
      title: match[2].trim(),
      startIndex: match.index + match[0].length
    });
  }
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const contentStart = part.startIndex;
    const contentEnd = i + 1 < parts.length ? acSection.lastIndexOf("###", parts[i + 1].startIndex) : acSection.length;
    const content = acSection.slice(contentStart, contentEnd > contentStart ? contentEnd : acSection.length);
    const steps = [];
    const bulletPattern = /^[-*]\s+(.+)$/gm;
    let bulletMatch;
    while ((bulletMatch = bulletPattern.exec(content)) !== null) {
      steps.push(bulletMatch[1].trim());
    }
    const headerMatch = acSection.match(new RegExp(`###?\\s*${part.id}[:\\s]*${part.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i"));
    const rawContent = headerMatch ? headerMatch[0] + content.slice(0, content.indexOf("\n###") > 0 ? content.indexOf("\n###") : content.length) : content;
    criteria.push({
      id: part.id,
      title: part.title,
      steps,
      rawContent: rawContent.trim()
    });
  }
  return criteria;
}
function parseProceduralSteps(body) {
  const steps = [];
  const psMatch = body.match(
    /##\s*Procedural\s*Steps?\s*\n([\s\S]*?)(?=\n##\s[^#]|$)/i
  );
  if (!psMatch) {
    return steps;
  }
  const psSection = psMatch[1];
  const numberedPattern = /^\d+\.\s+(.+)$/gm;
  let match;
  let stepNumber = 1;
  while ((match = numberedPattern.exec(psSection)) !== null) {
    const text = match[1].trim();
    const acRef = text.match(/\(AC-(\d+)\)/i);
    steps.push({
      number: stepNumber++,
      text: text.replace(/\s*\(AC-\d+\)\s*/gi, "").trim(),
      linkedAC: acRef ? `AC-${acRef[1]}` : void 0
    });
  }
  if (steps.length === 0) {
    const bulletPattern = /^[-*]\s+(.+)$/gm;
    while ((match = bulletPattern.exec(psSection)) !== null) {
      const text = match[1].trim();
      const acRef = text.match(/\(AC-(\d+)\)/i);
      steps.push({
        number: stepNumber++,
        text: text.replace(/\s*\(AC-\d+\)\s*/gi, "").trim(),
        linkedAC: acRef ? `AC-${acRef[1]}` : void 0
      });
    }
  }
  return steps;
}
function parseDataNotes(body) {
  const notes = [];
  const dataMatch = body.match(
    /##\s*(Data|Environment|Data\/Environment)\s*(Notes?)?\s*\n([\s\S]*?)(?=\n##\s[^#]|$)/i
  );
  if (!dataMatch) {
    return notes;
  }
  const dataSection = dataMatch[3];
  const bulletPattern = /^[-*]\s+(.+)$/gm;
  let match;
  while ((match = bulletPattern.exec(dataSection)) !== null) {
    notes.push(match[1].trim());
  }
  return notes;
}
function parseJourney(filePath) {
  const resolvedPath = resolve(filePath);
  if (!existsSync(resolvedPath)) {
    throw new JourneyParseError(
      `Journey file not found: ${resolvedPath}`,
      resolvedPath
    );
  }
  let content;
  try {
    content = readFileSync(resolvedPath, "utf-8");
  } catch (err3) {
    throw new JourneyParseError(
      `Failed to read journey file: ${resolvedPath}`,
      resolvedPath,
      err3
    );
  }
  let frontmatterStr;
  let body;
  try {
    const extracted = extractFrontmatter(content);
    frontmatterStr = extracted.frontmatter;
    body = extracted.body;
  } catch (err3) {
    throw new JourneyParseError(
      `Invalid frontmatter in journey file: ${resolvedPath}`,
      resolvedPath,
      err3
    );
  }
  let rawFrontmatter;
  try {
    rawFrontmatter = parse(frontmatterStr);
  } catch (err3) {
    throw new JourneyParseError(
      `Invalid YAML in journey frontmatter: ${resolvedPath}`,
      resolvedPath,
      err3
    );
  }
  const result = JourneyFrontmatterSchema.safeParse(rawFrontmatter);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new JourneyParseError(
      `Invalid journey frontmatter in ${resolvedPath}:
${issues}`,
      resolvedPath,
      result.error
    );
  }
  const acceptanceCriteria = parseAcceptanceCriteria(body);
  const proceduralSteps = parseProceduralSteps(body);
  const dataNotes = parseDataNotes(body);
  return {
    frontmatter: result.data,
    body,
    acceptanceCriteria,
    proceduralSteps,
    dataNotes,
    sourcePath: resolvedPath
  };
}
function parseJourneyContent(content, virtualPath = "virtual.journey.md") {
  const { frontmatter: frontmatterStr, body } = extractFrontmatter(content);
  const rawFrontmatter = parse(frontmatterStr);
  const result = JourneyFrontmatterSchema.safeParse(rawFrontmatter);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new JourneyParseError(
      `Invalid journey frontmatter:
${issues}`,
      virtualPath,
      result.error
    );
  }
  const acceptanceCriteria = parseAcceptanceCriteria(body);
  const proceduralSteps = parseProceduralSteps(body);
  const dataNotes = parseDataNotes(body);
  return {
    frontmatter: result.data,
    body,
    acceptanceCriteria,
    proceduralSteps,
    dataNotes,
    sourcePath: virtualPath
  };
}
var JourneyParseError, FRONTMATTER_REGEX;
var init_parseJourney = __esm({
  "src/journey/parseJourney.ts"() {
    init_schema2();
    init_patterns();
    init_result();
    JourneyParseError = class extends Error {
      filePath;
      cause;
      constructor(message, filePath, cause) {
        super(message);
        this.name = "JourneyParseError";
        this.filePath = filePath;
        this.cause = cause;
      }
    };
    FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---/;
  }
});
function buildSynonymMap(glossary) {
  const map = /* @__PURE__ */ new Map();
  for (const entry of glossary.entries) {
    map.set(entry.canonical.toLowerCase(), entry.canonical);
    for (const synonym of entry.synonyms) {
      map.set(synonym.toLowerCase(), entry.canonical);
    }
  }
  return map;
}
function initGlossary(glossaryPath) {
  {
    glossaryCache = defaultGlossary;
  }
  synonymMap = buildSynonymMap(glossaryCache);
}
function normalizeStepText(text) {
  if (!synonymMap) {
    initGlossary();
  }
  const parts = [];
  const regex = /(['"][^'"]+['"])|(\S+)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const part = match[0];
    if (part.startsWith('"') || part.startsWith("'")) {
      parts.push(part);
    } else {
      const lowerPart = part.toLowerCase();
      const canonical = synonymMap.get(lowerPart);
      parts.push(canonical ?? lowerPart);
    }
  }
  return parts.join(" ");
}
async function loadExtendedGlossary(glossaryPath) {
  try {
    const resolvedPath = resolve(glossaryPath);
    if (!existsSync(resolvedPath)) {
      return {
        loaded: false,
        entryCount: 0,
        exportedAt: null,
        error: `Glossary file not found: ${resolvedPath}`
      };
    }
    const fileUrl = pathToFileURL(resolvedPath).href;
    const module = await import(fileUrl);
    if (module.llkbGlossary instanceof Map) {
      const glossaryMap = module.llkbGlossary;
      extendedGlossary = glossaryMap;
      extendedGlossaryMeta = module.llkbGlossaryMeta ?? null;
      return {
        loaded: true,
        entryCount: glossaryMap.size,
        exportedAt: extendedGlossaryMeta?.exportedAt ?? null
      };
    }
    if (module.llkbGlossary && typeof module.llkbGlossary === "object") {
      const glossaryMap = new Map(
        Object.entries(module.llkbGlossary)
      );
      extendedGlossary = glossaryMap;
      extendedGlossaryMeta = module.llkbGlossaryMeta ?? null;
      return {
        loaded: true,
        entryCount: glossaryMap.size,
        exportedAt: extendedGlossaryMeta?.exportedAt ?? null
      };
    }
    return {
      loaded: false,
      entryCount: 0,
      exportedAt: null,
      error: "Invalid glossary format: llkbGlossary not found or not a Map/object"
    };
  } catch (err3) {
    return {
      loaded: false,
      entryCount: 0,
      exportedAt: null,
      error: `Failed to load glossary: ${err3 instanceof Error ? err3.message : String(err3)}`
    };
  }
}
function getGlossaryStats() {
  if (!glossaryCache) {
    initGlossary();
  }
  return {
    coreEntries: glossaryCache.moduleMethods?.length ?? 0,
    extendedEntries: extendedGlossary?.size ?? 0,
    extendedExportedAt: extendedGlossaryMeta?.exportedAt ?? null,
    extendedMeta: extendedGlossaryMeta
  };
}
var GlossaryEntrySchema, LabelAliasSchema, ModuleMethodMappingSchema, defaultGlossary, glossaryCache, synonymMap, extendedGlossary, extendedGlossaryMeta;
var init_glossary = __esm({
  "src/mapping/glossary.ts"() {
    GlossaryEntrySchema = z.object({
      canonical: z.string(),
      synonyms: z.array(z.string())
    });
    LabelAliasSchema = z.object({
      label: z.string(),
      testid: z.string().optional(),
      role: z.string().optional(),
      selector: z.string().optional()
    });
    ModuleMethodMappingSchema = z.object({
      phrase: z.string(),
      module: z.string(),
      method: z.string(),
      params: z.record(z.string()).optional()
    });
    z.object({
      version: z.number().default(1),
      entries: z.array(GlossaryEntrySchema),
      labelAliases: z.array(LabelAliasSchema).default([]),
      moduleMethods: z.array(ModuleMethodMappingSchema).default([])
    });
    defaultGlossary = {
      version: 1,
      labelAliases: [
        // Common label-to-selector mappings
        { label: "email", testid: "email-input", role: "textbox" },
        { label: "password", testid: "password-input", role: "textbox" },
        { label: "username", testid: "username-input", role: "textbox" },
        { label: "search", testid: "search-input", role: "searchbox" },
        { label: "submit", testid: "submit-button", role: "button" },
        { label: "cancel", testid: "cancel-button", role: "button" },
        { label: "close", testid: "close-button", role: "button" }
      ],
      moduleMethods: [
        // Common phrase-to-module mappings
        { phrase: "log in", module: "auth", method: "login" },
        { phrase: "login", module: "auth", method: "login" },
        { phrase: "sign in", module: "auth", method: "login" },
        { phrase: "log out", module: "auth", method: "logout" },
        { phrase: "logout", module: "auth", method: "logout" },
        { phrase: "sign out", module: "auth", method: "logout" },
        { phrase: "navigate to", module: "navigation", method: "goToPath" },
        { phrase: "go to", module: "navigation", method: "goToPath" },
        { phrase: "open", module: "navigation", method: "goToPath" },
        { phrase: "fill form", module: "forms", method: "fillForm" },
        { phrase: "submit form", module: "forms", method: "submitForm" },
        { phrase: "wait for", module: "waits", method: "waitForSignal" }
      ],
      entries: [
        {
          canonical: "click",
          synonyms: ["press", "tap", "hit"]
        },
        {
          canonical: "enter",
          synonyms: ["type", "fill", "input", "write"]
        },
        {
          canonical: "navigate",
          synonyms: ["go", "open", "visit", "browse"]
        },
        {
          canonical: "see",
          synonyms: ["view", "observe", "notice", "find"]
        },
        {
          canonical: "visible",
          synonyms: ["displayed", "shown", "present"]
        },
        {
          canonical: "button",
          synonyms: ["btn", "action", "cta"]
        },
        {
          canonical: "field",
          synonyms: ["input", "textbox", "text field", "text input"]
        },
        {
          canonical: "dropdown",
          synonyms: ["combo", "combobox", "picker"]
        },
        {
          canonical: "checkbox",
          synonyms: ["check", "tick", "toggle"]
        },
        {
          canonical: "login",
          synonyms: ["log in", "sign in", "authenticate"]
        },
        {
          canonical: "logout",
          synonyms: ["log out", "sign out", "exit"]
        },
        {
          canonical: "submit",
          synonyms: ["send", "save", "confirm", "ok"]
        },
        {
          canonical: "cancel",
          synonyms: ["close", "dismiss", "abort", "back"]
        },
        {
          canonical: "success",
          synonyms: ["passed", "completed", "done", "finished"]
        },
        {
          canonical: "error",
          synonyms: ["failure", "failed", "problem", "issue"]
        },
        {
          canonical: "toast",
          synonyms: ["notification", "message", "alert", "snackbar"]
        },
        {
          canonical: "modal",
          synonyms: ["dialog", "popup", "overlay", "lightbox"]
        },
        {
          canonical: "user",
          synonyms: ["customer", "visitor", "member", "client"]
        },
        {
          canonical: "page",
          synonyms: ["screen", "view", "section"]
        },
        {
          canonical: "form",
          synonyms: ["questionnaire", "survey", "wizard"]
        }
      ]
    };
    glossaryCache = null;
    synonymMap = null;
    extendedGlossary = null;
    extendedGlossaryMeta = null;
  }
});

// src/journey/hintPatterns.ts
function isValidRole(role) {
  return VALID_ROLES.includes(role.toLowerCase());
}
function containsHints(text) {
  HINTS_SECTION_PATTERN.lastIndex = 0;
  return HINTS_SECTION_PATTERN.test(text);
}
function removeHints(text) {
  return text.replace(HINTS_SECTION_PATTERN, "").trim();
}
var HINT_BLOCK_PATTERN, HINTS_SECTION_PATTERN, HINT_PATTERNS, VALID_ROLES;
var init_hintPatterns = __esm({
  "src/journey/hintPatterns.ts"() {
    HINT_BLOCK_PATTERN = /\(([a-z]+)=(?:"([^"]+)"|'([^']+)'|([^,)\s]+))\)/gi;
    HINTS_SECTION_PATTERN = /\((?:[a-z]+=(?:"[^"]+"|'[^']+'|[^,)\s]+)(?:,\s*)?)+\)/gi;
    HINT_PATTERNS = {
      role: /role=(?:"([^"]+)"|'([^']+)'|([a-z]+))/i,
      testid: /testid=(?:"([^"]+)"|'([^']+)'|([a-z0-9_-]+))/i,
      label: /label=(?:"([^"]+)"|'([^']+)')/i,
      text: /text=(?:"([^"]+)"|'([^']+)')/i,
      exact: /exact=(true|false)/i,
      level: /level=([1-6])/i,
      signal: /signal=(?:"([^"]+)"|'([^']+)'|([a-z0-9_-]+))/i,
      module: /module=(?:"([^"]+)"|'([^']+)'|([a-z0-9_.]+))/i,
      wait: /wait=(networkidle|domcontentloaded|load|commit)/i,
      timeout: /timeout=(\d+)/i
    };
    VALID_ROLES = [
      "alert",
      "alertdialog",
      "application",
      "article",
      "banner",
      "button",
      "cell",
      "checkbox",
      "columnheader",
      "combobox",
      "complementary",
      "contentinfo",
      "definition",
      "dialog",
      "directory",
      "document",
      "feed",
      "figure",
      "form",
      "grid",
      "gridcell",
      "group",
      "heading",
      "img",
      "link",
      "list",
      "listbox",
      "listitem",
      "log",
      "main",
      "marquee",
      "math",
      "menu",
      "menubar",
      "menuitem",
      "menuitemcheckbox",
      "menuitemradio",
      "navigation",
      "none",
      "note",
      "option",
      "presentation",
      "progressbar",
      "radio",
      "radiogroup",
      "region",
      "row",
      "rowgroup",
      "rowheader",
      "scrollbar",
      "search",
      "searchbox",
      "separator",
      "slider",
      "spinbutton",
      "status",
      "switch",
      "tab",
      "table",
      "tablist",
      "tabpanel",
      "term",
      "textbox",
      "timer",
      "toolbar",
      "tooltip",
      "tree",
      "treegrid",
      "treeitem"
    ];
  }
});

// src/journey/parseHints.ts
function parseHints(text) {
  const hints = [];
  const warnings = [];
  if (!containsHints(text)) {
    return {
      hints: [],
      cleanText: text,
      originalText: text,
      warnings: []
    };
  }
  HINT_BLOCK_PATTERN.lastIndex = 0;
  let match;
  while ((match = HINT_BLOCK_PATTERN.exec(text)) !== null) {
    const key = match[1].toLowerCase();
    const value = match[2] || match[3] || match[4];
    if (!value) {
      warnings.push(`Empty value for hint: ${key}`);
      continue;
    }
    if (!(key in HINT_PATTERNS)) {
      warnings.push(`Unknown hint type: ${key}`);
      continue;
    }
    if (key === "role" && !isValidRole(value)) {
      warnings.push(`Invalid ARIA role: ${value}`);
    }
    hints.push({
      type: key,
      value,
      raw: match[0]
    });
  }
  return {
    hints,
    cleanText: removeHints(text),
    originalText: text,
    warnings
  };
}
function extractHints(text) {
  const parsed = parseHints(text);
  const locator = {};
  const behavior = {};
  for (const hint of parsed.hints) {
    switch (hint.type) {
      case "role":
        locator.role = hint.value;
        break;
      case "testid":
        locator.testid = hint.value;
        break;
      case "label":
        locator.label = hint.value;
        break;
      case "text":
        locator.text = hint.value;
        break;
      case "exact":
        locator.exact = hint.value.toLowerCase() === "true";
        break;
      case "level":
        locator.level = parseInt(hint.value, 10);
        break;
      case "signal":
        behavior.signal = hint.value;
        break;
      case "module":
        behavior.module = hint.value;
        break;
      case "wait":
        behavior.wait = hint.value;
        break;
      case "timeout":
        behavior.timeout = parseInt(hint.value, 10);
        break;
    }
  }
  return {
    locator,
    behavior,
    hasHints: parsed.hints.length > 0,
    cleanText: parsed.cleanText,
    warnings: parsed.warnings
  };
}
function hasLocatorHints(hints) {
  const { locator } = hints;
  return !!(locator.role || locator.testid || locator.label || locator.text);
}
function hasBehaviorHints(hints) {
  const { behavior } = hints;
  return !!(behavior.signal || behavior.module || behavior.wait || behavior.timeout);
}
function parseModuleHint(moduleHint) {
  const parts = moduleHint.split(".");
  if (parts.length !== 2) {
    return null;
  }
  return {
    module: parts[0],
    method: parts[1]
  };
}
var init_parseHints = __esm({
  "src/journey/parseHints.ts"() {
    init_hintPatterns();
  }
});

// src/utils/paths.ts
var paths_exports = {};
__export(paths_exports, {
  PathTraversalError: () => PathTraversalError,
  cleanAutogenArtifacts: () => cleanAutogenArtifacts,
  clearPathCache: () => clearPathCache,
  ensureAutogenDir: () => ensureAutogenDir,
  getArtkDir: () => getArtkDir,
  getAutogenArtifact: () => getAutogenArtifact,
  getAutogenDir: () => getAutogenDir,
  getHarnessRoot: () => getHarnessRoot,
  getLlkbRoot: () => getLlkbRoot,
  getPackageRoot: () => getPackageRoot,
  getTemplatePath: () => getTemplatePath,
  getTemplatesDir: () => getTemplatesDir,
  hasAutogenArtifacts: () => hasAutogenArtifacts,
  validatePath: () => validatePath,
  validatePaths: () => validatePaths
});
function getModuleDir() {
  if (cachedModuleDir) {
    return cachedModuleDir;
  }
  if (typeof __dirname === "string" && __dirname.length > 0) {
    cachedModuleDir = __dirname;
    return cachedModuleDir;
  }
  try {
    const metaUrl = import.meta.url;
    if (metaUrl) {
      cachedModuleDir = dirname(fileURLToPath(metaUrl));
      return cachedModuleDir;
    }
  } catch {
  }
  try {
    if (typeof __require !== "undefined" && __require?.resolve) {
      const resolved = __require.resolve("@artk/core-autogen/package.json");
      cachedModuleDir = dirname(resolved);
      return cachedModuleDir;
    }
  } catch {
  }
  cachedModuleDir = process.cwd();
  return cachedModuleDir;
}
function getPackageRoot() {
  if (cachedPackageRoot) {
    return cachedPackageRoot;
  }
  const envRoot = process.env["ARTK_AUTOGEN_ROOT"];
  if (envRoot && existsSync(join(envRoot, "package.json"))) {
    cachedPackageRoot = envRoot;
    return cachedPackageRoot;
  }
  const moduleDir = getModuleDir();
  const possibleRoots = [
    join(moduleDir, "..", ".."),
    // from dist/utils/ or dist-cjs/utils/
    join(moduleDir, ".."),
    // from dist/ directly
    moduleDir
    // if already at root
  ];
  for (const root of possibleRoots) {
    const pkgPath = join(root, "package.json");
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
        if (pkg.name === "@artk/core-autogen") {
          cachedPackageRoot = root;
          return cachedPackageRoot;
        }
      } catch {
      }
    }
  }
  const cwdPaths = [
    join(process.cwd(), "node_modules", "@artk", "core-autogen"),
    join(process.cwd(), "artk-e2e", "vendor", "artk-core-autogen"),
    process.cwd()
  ];
  for (const searchPath of cwdPaths) {
    const pkgPath = join(searchPath, "package.json");
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
        if (pkg.name === "@artk/core-autogen") {
          cachedPackageRoot = searchPath;
          return cachedPackageRoot;
        }
      } catch {
      }
    }
  }
  cachedPackageRoot = join(moduleDir, "..", "..");
  return cachedPackageRoot;
}
function getTemplatesDir() {
  const root = getPackageRoot();
  const moduleDir = getModuleDir();
  const relativeToModule = join(moduleDir, "..", "codegen", "templates");
  if (existsSync(relativeToModule)) {
    return relativeToModule;
  }
  const possiblePaths = [
    join(root, "dist", "codegen", "templates"),
    join(root, "dist-cjs", "codegen", "templates"),
    join(root, "dist-legacy-16", "codegen", "templates"),
    join(root, "dist-legacy-14", "codegen", "templates")
  ];
  for (const templatesPath of possiblePaths) {
    if (existsSync(templatesPath)) {
      return templatesPath;
    }
  }
  return possiblePaths[0] ?? join(root, "dist", "codegen", "templates");
}
function getTemplatePath(templateName) {
  return join(getTemplatesDir(), templateName);
}
function clearPathCache() {
  cachedPackageRoot = void 0;
  cachedModuleDir = void 0;
  cachedHarnessRoot = void 0;
}
function getHarnessRoot() {
  if (cachedHarnessRoot) {
    return cachedHarnessRoot;
  }
  const envRoot = process.env["ARTK_HARNESS_ROOT"];
  if (envRoot && existsSync(envRoot)) {
    cachedHarnessRoot = envRoot;
    return cachedHarnessRoot;
  }
  const artkE2eFromCwd = join(process.cwd(), "artk-e2e");
  if (existsSync(artkE2eFromCwd)) {
    cachedHarnessRoot = artkE2eFromCwd;
    return cachedHarnessRoot;
  }
  const configInCwd = join(process.cwd(), "artk.config.yml");
  if (existsSync(configInCwd)) {
    cachedHarnessRoot = process.cwd();
    return cachedHarnessRoot;
  }
  let searchDir = process.cwd();
  const root = dirname(searchDir);
  while (searchDir !== root) {
    if (existsSync(join(searchDir, "artk.config.yml"))) {
      cachedHarnessRoot = searchDir;
      return cachedHarnessRoot;
    }
    const sibling = join(searchDir, "artk-e2e");
    if (existsSync(sibling)) {
      cachedHarnessRoot = sibling;
      return cachedHarnessRoot;
    }
    searchDir = dirname(searchDir);
  }
  cachedHarnessRoot = process.cwd();
  return cachedHarnessRoot;
}
function getLlkbRoot(explicitRoot) {
  if (explicitRoot) {
    return explicitRoot;
  }
  return join(getHarnessRoot(), ".artk", "llkb");
}
function getArtkDir(explicitBaseDir) {
  if (explicitBaseDir) {
    return join(explicitBaseDir, ".artk");
  }
  return join(getHarnessRoot(), ".artk");
}
function getAutogenDir(explicitBaseDir) {
  return join(getArtkDir(explicitBaseDir), "autogen");
}
function getAutogenArtifact(artifact, explicitBaseDir) {
  const dir = getAutogenDir(explicitBaseDir);
  switch (artifact) {
    case "analysis":
      return join(dir, "analysis.json");
    case "plan":
      return join(dir, "plan.json");
    case "state":
      return join(dir, "pipeline-state.json");
    case "results":
      return join(dir, "results.json");
    case "samples":
      return join(dir, "samples");
    case "agreement":
      return join(dir, "samples", "agreement.json");
    case "telemetry":
      return join(dir, "telemetry.json");
  }
}
async function ensureAutogenDir(explicitBaseDir) {
  const { mkdir } = await import('fs/promises');
  const dir = getAutogenDir(explicitBaseDir);
  await mkdir(dir, { recursive: true });
  await mkdir(join(dir, "samples"), { recursive: true });
}
async function cleanAutogenArtifacts(explicitBaseDir) {
  const { rm } = await import('fs/promises');
  const dir = getAutogenDir(explicitBaseDir);
  if (existsSync(dir)) {
    await rm(dir, { recursive: true });
  }
  await ensureAutogenDir(explicitBaseDir);
}
function hasAutogenArtifacts(explicitBaseDir) {
  const dir = getAutogenDir(explicitBaseDir);
  if (!existsSync(dir)) {
    return false;
  }
  const artifactTypes = ["analysis", "plan", "state", "results"];
  return artifactTypes.some((artifact) => existsSync(getAutogenArtifact(artifact, explicitBaseDir)));
}
function validatePath(userPath, allowedRoot) {
  if (!userPath || userPath.trim() === "") {
    throw new PathTraversalError(userPath, allowedRoot, "");
  }
  if (userPath.includes("\0") || userPath.includes("\n") || userPath.includes("\r")) {
    throw new PathTraversalError(userPath, allowedRoot, "invalid-characters");
  }
  if (process.platform === "win32") {
    const colonIndex = userPath.indexOf(":");
    if (colonIndex !== -1 && colonIndex !== 1) {
      throw new PathTraversalError(userPath, allowedRoot, "alternate-data-stream");
    }
    if (userPath.startsWith("\\\\") || userPath.startsWith("//")) {
      throw new PathTraversalError(userPath, allowedRoot, "unc-path");
    }
    const pathParts = userPath.split(/[/\\]/);
    const baseName = pathParts[pathParts.length - 1] || "";
    const nameWithoutExt = baseName.split(".")[0] || "";
    const upperName = nameWithoutExt.toUpperCase();
    const reservedNames = ["CON", "PRN", "AUX", "NUL"];
    const reservedPrefixes = ["COM", "LPT"];
    if (reservedNames.includes(upperName)) {
      throw new PathTraversalError(userPath, allowedRoot, "reserved-device-name");
    }
    for (const prefix of reservedPrefixes) {
      if (upperName.startsWith(prefix) && /^(COM|LPT)[1-9]$/.test(upperName)) {
        throw new PathTraversalError(userPath, allowedRoot, "reserved-device-name");
      }
    }
  }
  const resolved = resolve(allowedRoot, userPath);
  let realResolved;
  let realRoot;
  try {
    realRoot = realpathSync(allowedRoot);
  } catch {
    realRoot = resolve(allowedRoot);
  }
  try {
    realResolved = realpathSync(resolved);
  } catch {
    let current = resolved;
    let parentResolved = resolved;
    while (current !== dirname(current)) {
      const parent = dirname(current);
      try {
        const realParent = realpathSync(parent);
        const relativePart = relative(parent, resolved);
        parentResolved = join(realParent, relativePart);
        break;
      } catch {
        current = parent;
      }
    }
    realResolved = parentResolved;
  }
  const rel = relative(realRoot, realResolved);
  if (rel.startsWith("..") || isAbsolute(rel) && !rel.startsWith(realRoot)) {
    throw new PathTraversalError(userPath, allowedRoot, realResolved);
  }
  return realResolved;
}
function validatePaths(paths, allowedRoot, onInvalid) {
  const validPaths = [];
  for (const userPath of paths) {
    try {
      const validated = validatePath(userPath, allowedRoot);
      validPaths.push(validated);
    } catch (e) {
      if (e instanceof PathTraversalError && onInvalid) {
        onInvalid(userPath);
      }
    }
  }
  return validPaths;
}
var cachedPackageRoot, cachedModuleDir, cachedHarnessRoot, PathTraversalError;
var init_paths = __esm({
  "src/utils/paths.ts"() {
    PathTraversalError = class extends Error {
      constructor(userPath, allowedRoot, resolvedPath) {
        super(`Path traversal detected: "${userPath}" resolves outside allowed root "${allowedRoot}"`);
        this.userPath = userPath;
        this.allowedRoot = allowedRoot;
        this.name = "PathTraversalError";
        this.resolvedPath = resolvedPath;
      }
      resolvedPath;
    };
  }
});

// src/mapping/patternDistance.ts
function levenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          // substitution
          matrix[i][j - 1] + 1,
          // insertion
          matrix[i - 1][j] + 1
          // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}
function calculateSimilarity(a, b) {
  const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase());
  const maxLength = Math.max(a.length, b.length);
  if (maxLength === 0) return 1;
  return 1 - distance / maxLength;
}
var init_patternDistance = __esm({
  "src/mapping/patternDistance.ts"() {
  }
});

// src/llkb/patternExtension.ts
var patternExtension_exports = {};
__export(patternExtension_exports, {
  calculateConfidence: () => calculateConfidence,
  clearLearnedPatterns: () => clearLearnedPatterns,
  exportPatternsToConfig: () => exportPatternsToConfig,
  generatePatternId: () => generatePatternId,
  generateRegexFromText: () => generateRegexFromText,
  getPatternStats: () => getPatternStats,
  getPatternsFilePath: () => getPatternsFilePath,
  getPromotablePatterns: () => getPromotablePatterns,
  invalidateDiscoveredPatternCache: () => invalidateDiscoveredPatternCache,
  invalidatePatternCache: () => invalidatePatternCache,
  loadLearnedPatterns: () => loadLearnedPatterns,
  markPatternsPromoted: () => markPatternsPromoted,
  matchLlkbPattern: () => matchLlkbPattern,
  prunePatterns: () => prunePatterns,
  recordPatternFailure: () => recordPatternFailure,
  recordPatternSuccess: () => recordPatternSuccess,
  saveLearnedPatterns: () => saveLearnedPatterns
});
function createIRPrimitiveFromDiscovered(typeName, selectorHints) {
  const locator = buildLocatorFromHints(selectorHints);
  switch (typeName) {
    // Interactions
    case "click":
      return { type: "click", locator };
    case "dblclick":
      return { type: "dblclick", locator };
    case "fill":
      return { type: "fill", locator, value: { type: "literal", value: "{{input}}" } };
    case "check":
      return { type: "check", locator };
    case "uncheck":
      return { type: "uncheck", locator };
    case "select":
      return { type: "select", locator, option: "{{option}}" };
    case "hover":
      return { type: "hover", locator };
    case "clear":
      return { type: "clear", locator };
    case "press":
      return { type: "press", key: "Enter", locator };
    // Navigation
    case "navigate":
    case "goto":
      return { type: "goto", url: "{{url}}" };
    case "goBack":
      return { type: "goBack" };
    case "reload":
      return { type: "reload" };
    // Assertions
    case "assert":
    case "expectVisible":
      return { type: "expectVisible", locator };
    case "expectText":
      return { type: "expectText", locator, text: "{{text}}" };
    case "expectURL":
      return { type: "expectURL", pattern: "{{pattern}}" };
    // Wait
    case "waitForVisible":
      return { type: "waitForVisible", locator };
    // File upload
    case "upload":
      return { type: "upload", locator, files: ["{{file}}"] };
    // Keyboard shortcut (template-generators uses 'keyboard' for modal Escape etc.)
    case "keyboard":
      return { type: "press", key: "Escape", locator };
    // Drag has no IR type — patterns using 'drag' (e.g., column resize) cannot
    // be mapped to code generation yet. Return null so they are skipped gracefully.
    case "drag":
      return null;
    default:
      return null;
  }
}
function buildLocatorFromHints(hints) {
  if (!hints || hints.length === 0) {
    return { strategy: "testid", value: "{{locator}}" };
  }
  const sorted = [...hints].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
  const best = sorted[0];
  const strategy = SELECTOR_STRATEGY_MAP[best.strategy] ?? "testid";
  return { strategy, value: best.value };
}
function acquireFileLock(filePath) {
  const lockPath = `${filePath}.lock`;
  try {
    const dir = dirname(lockPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    if (existsSync(lockPath)) {
      const lockAge = Date.now() - statSync(lockPath).mtimeMs;
      if (lockAge > STALE_LOCK_THRESHOLD_MS) {
        unlinkSync(lockPath);
      } else {
        return false;
      }
    }
    writeFileSync(lockPath, String(Date.now()), { flag: "wx" });
    return true;
  } catch (error) {
    if (error.code === "EEXIST") return false;
    throw error;
  }
}
function releaseFileLock(filePath) {
  const lockPath = `${filePath}.lock`;
  try {
    if (existsSync(lockPath)) unlinkSync(lockPath);
  } catch {
  }
}
function withFileLockSync(filePath, fn) {
  const start = Date.now();
  while (Date.now() - start < LOCK_MAX_WAIT_MS) {
    if (acquireFileLock(filePath)) {
      try {
        return fn();
      } finally {
        releaseFileLock(filePath);
      }
    }
  }
  console.warn(`[LLKB] Could not acquire lock on ${filePath} within ${LOCK_MAX_WAIT_MS}ms, proceeding without lock`);
  return fn();
}
function isIRPrimitiveObject(value) {
  return typeof value === "object" && value !== null && "type" in value && typeof value.type === "string";
}
function loadDiscoveredPatternsForMatching(llkbRoot) {
  const now = Date.now();
  if (discoveredPatternCache && discoveredPatternCache.llkbRoot === llkbRoot && now - discoveredPatternCache.loadedAt < DISCOVERED_CACHE_TTL_MS) {
    return discoveredPatternCache.patterns;
  }
  const filePath = join(llkbRoot, "discovered-patterns.json");
  if (!existsSync(filePath)) {
    discoveredPatternCache = { patterns: [], llkbRoot, loadedAt: now };
    return [];
  }
  try {
    const content = readFileSync(filePath, "utf-8");
    const data = JSON.parse(content);
    if (typeof data !== "object" || data === null) {
      console.warn(`[LLKB] Invalid discovered patterns shape in ${filePath}`);
      discoveredPatternCache = { patterns: [], llkbRoot, loadedAt: now };
      return [];
    }
    const patterns = Array.isArray(data.patterns) ? data.patterns : [];
    discoveredPatternCache = { patterns, llkbRoot, loadedAt: now };
    return patterns;
  } catch (err3) {
    console.warn(`[LLKB] Failed to load discovered patterns from ${filePath}: ${err3 instanceof Error ? err3.message : String(err3)}`);
    discoveredPatternCache = { patterns: [], llkbRoot, loadedAt: now };
    return [];
  }
}
function invalidateDiscoveredPatternCache() {
  discoveredPatternCache = null;
}
function invalidatePatternCache() {
  patternCache = null;
}
function getPatternsFilePath(llkbRoot) {
  const root = getLlkbRoot(llkbRoot);
  return join(root, PATTERNS_FILE);
}
function generatePatternId() {
  return `LP${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
}
function loadLearnedPatterns(options = {}) {
  const llkbRoot = getLlkbRoot(options.llkbRoot);
  const now = Date.now();
  if (!options.bypassCache && patternCache && patternCache.llkbRoot === llkbRoot && now - patternCache.loadedAt < CACHE_TTL_MS) {
    return patternCache.patterns;
  }
  const filePath = getPatternsFilePath(options.llkbRoot);
  if (!existsSync(filePath)) {
    patternCache = { patterns: [], llkbRoot, loadedAt: now };
    return [];
  }
  try {
    const content = readFileSync(filePath, "utf-8");
    const data = JSON.parse(content);
    if (typeof data !== "object" || data === null) {
      console.warn(`[LLKB] Invalid learned patterns shape in ${filePath}`);
      patternCache = { patterns: [], llkbRoot, loadedAt: now };
      return [];
    }
    const patterns = Array.isArray(data.patterns) ? data.patterns : [];
    patternCache = { patterns, llkbRoot, loadedAt: now };
    return patterns;
  } catch (err3) {
    console.warn(`[LLKB] Failed to load learned patterns from ${filePath}: ${err3 instanceof Error ? err3.message : String(err3)}`);
    patternCache = { patterns: [], llkbRoot, loadedAt: now };
    return [];
  }
}
function saveLearnedPatterns(patterns, options = {}) {
  const filePath = getPatternsFilePath(options.llkbRoot);
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const data = {
    version: "1.0.0",
    lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
    patterns
  };
  const content = JSON.stringify(data, null, 2);
  const tempPath = `${filePath}.tmp.${Date.now()}`;
  try {
    writeFileSync(tempPath, content, "utf-8");
    renameSync(tempPath, filePath);
  } catch (err3) {
    try {
      if (existsSync(tempPath)) unlinkSync(tempPath);
    } catch {
    }
    throw err3;
  }
  invalidatePatternCache();
}
function calculateConfidence(successCount, failCount) {
  const total = successCount + failCount;
  if (total === 0) return 0.5;
  const p = successCount / total;
  const z9 = 1.96;
  const n = total;
  const denominator = 1 + z9 * z9 / n;
  const center = p + z9 * z9 / (2 * n);
  const spread = z9 * Math.sqrt((p * (1 - p) + z9 * z9 / (4 * n)) / n);
  return Math.max(0, Math.min(1, (center - spread) / denominator));
}
function recordPatternSuccess(originalText, primitive, journeyId, options = {}) {
  const filePath = getPatternsFilePath(options.llkbRoot);
  return withFileLockSync(filePath, () => {
    const patterns = loadLearnedPatterns({ ...options, bypassCache: true });
    const normalizedText = normalizeStepText(originalText);
    let pattern = patterns.find((p) => p.normalizedText === normalizedText);
    if (pattern) {
      pattern.successCount++;
      pattern.confidence = calculateConfidence(pattern.successCount, pattern.failCount);
      pattern.lastUsed = (/* @__PURE__ */ new Date()).toISOString();
      if (!pattern.sourceJourneys.includes(journeyId)) {
        pattern.sourceJourneys.push(journeyId);
      }
    } else {
      pattern = {
        id: generatePatternId(),
        originalText,
        normalizedText,
        mappedPrimitive: primitive,
        confidence: 0.5,
        sourceJourneys: [journeyId],
        successCount: 1,
        failCount: 0,
        lastUsed: (/* @__PURE__ */ new Date()).toISOString(),
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        promotedToCore: false
      };
      patterns.push(pattern);
    }
    saveLearnedPatterns(patterns, options);
    return pattern;
  });
}
function recordPatternFailure(originalText, _journeyId, options = {}) {
  const filePath = getPatternsFilePath(options.llkbRoot);
  return withFileLockSync(filePath, () => {
    const patterns = loadLearnedPatterns({ ...options, bypassCache: true });
    const normalizedText = normalizeStepText(originalText);
    const pattern = patterns.find((p) => p.normalizedText === normalizedText);
    if (pattern) {
      pattern.failCount++;
      pattern.confidence = calculateConfidence(pattern.successCount, pattern.failCount);
      pattern.lastUsed = (/* @__PURE__ */ new Date()).toISOString();
      saveLearnedPatterns(patterns, options);
      return pattern;
    }
    return null;
  });
}
function matchLlkbPattern(text, options = {}) {
  const normalizedText = normalizeStepText(text);
  const minConfidence = options.minConfidence ?? 0.5;
  const minSimilarity = options.minSimilarity ?? 0.7;
  const useFuzzyMatch = options.useFuzzyMatch ?? true;
  const learnedMatch = matchLearnedPatterns(normalizedText, minConfidence, minSimilarity, useFuzzyMatch, options);
  const discoveredMatch = matchDiscoveredPatterns(normalizedText, minConfidence, minSimilarity, useFuzzyMatch, options);
  if (!learnedMatch && !discoveredMatch) {
    return null;
  }
  if (!discoveredMatch) return learnedMatch;
  if (!learnedMatch) return discoveredMatch;
  if (discoveredMatch.confidence >= learnedMatch.confidence) {
    return discoveredMatch;
  }
  return learnedMatch;
}
function matchLearnedPatterns(normalizedText, minConfidence, minSimilarity, useFuzzyMatch, options) {
  const patterns = loadLearnedPatterns(options);
  const exactMatch = patterns.find(
    (p) => p.normalizedText === normalizedText && p.confidence >= minConfidence && !p.promotedToCore
  );
  if (exactMatch) {
    return {
      patternId: exactMatch.id,
      primitive: exactMatch.mappedPrimitive,
      confidence: exactMatch.confidence
    };
  }
  if (useFuzzyMatch) {
    let bestMatch = null;
    let bestSimilarity = 0;
    for (const pattern of patterns) {
      if (pattern.promotedToCore || pattern.confidence < minConfidence) {
        continue;
      }
      const similarity = calculateSimilarity(normalizedText, pattern.normalizedText);
      if (similarity >= minSimilarity && similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = pattern;
      }
    }
    if (bestMatch) {
      return {
        patternId: bestMatch.id,
        primitive: bestMatch.mappedPrimitive,
        confidence: bestMatch.confidence * bestSimilarity
      };
    }
  }
  return null;
}
function matchDiscoveredPatterns(normalizedText, minConfidence, minSimilarity, useFuzzyMatch, options) {
  const llkbRoot = getLlkbRoot(options.llkbRoot);
  const patterns = loadDiscoveredPatternsForMatching(llkbRoot);
  if (patterns.length === 0) return null;
  const exactMatches = patterns.filter(
    (p) => p.normalizedText === normalizedText && p.confidence >= minConfidence
  );
  if (exactMatches.length > 0) {
    exactMatches.sort((a, b) => {
      const layerDiff = (LAYER_PRIORITY[b.layer] ?? 0) - (LAYER_PRIORITY[a.layer] ?? 0);
      return layerDiff !== 0 ? layerDiff : b.confidence - a.confidence;
    });
    const best = exactMatches[0];
    let primitive;
    if (isIRPrimitiveObject(best.mappedPrimitive)) {
      primitive = best.mappedPrimitive;
    } else {
      primitive = createIRPrimitiveFromDiscovered(
        best.mappedPrimitive,
        best.selectorHints
      );
    }
    if (!primitive) return null;
    return {
      patternId: best.id,
      primitive,
      confidence: best.confidence
    };
  }
  if (useFuzzyMatch) {
    let bestMatch = null;
    let bestSimilarity = 0;
    let bestLayerPriority = 0;
    for (const pattern of patterns) {
      if (pattern.confidence < minConfidence) continue;
      const similarity = calculateSimilarity(normalizedText, pattern.normalizedText);
      if (similarity < minSimilarity) continue;
      const layerPriority = LAYER_PRIORITY[pattern.layer] ?? 0;
      if (layerPriority > bestLayerPriority || layerPriority === bestLayerPriority && similarity > bestSimilarity) {
        bestMatch = pattern;
        bestSimilarity = similarity;
        bestLayerPriority = layerPriority;
      }
    }
    if (bestMatch) {
      let primitive;
      if (isIRPrimitiveObject(bestMatch.mappedPrimitive)) {
        primitive = bestMatch.mappedPrimitive;
      } else {
        primitive = createIRPrimitiveFromDiscovered(
          bestMatch.mappedPrimitive,
          bestMatch.selectorHints
        );
      }
      if (!primitive) return null;
      return {
        patternId: bestMatch.id,
        primitive,
        confidence: bestMatch.confidence * bestSimilarity
      };
    }
  }
  return null;
}
function generateRegexFromText(text) {
  const pattern = text.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/"[^"]+"/g, '"([^"]+)"').replace(/'[^']+'/g, "'([^']+)'").replace(/\b(the|a|an)\b/g, "(?:$1\\s+)?").replace(/^user\s+/, "(?:user\\s+)?").replace(/\bclicks?\b/g, "clicks?").replace(/\bfills?\b/g, "fills?").replace(/\bselects?\b/g, "selects?").replace(/\btypes?\b/g, "types?").replace(/\bsees?\b/g, "sees?").replace(/\bwaits?\b/g, "waits?");
  return `^${pattern}$`;
}
function getPromotablePatterns(options = {}) {
  const patterns = loadLearnedPatterns(options);
  const promotable = patterns.filter(
    (p) => p.confidence >= 0.9 && p.successCount >= 5 && p.sourceJourneys.length >= 2 && !p.promotedToCore
  );
  return promotable.map((pattern) => ({
    pattern,
    generatedRegex: generateRegexFromText(pattern.originalText),
    priority: pattern.successCount * pattern.confidence
  }));
}
function markPatternsPromoted(patternIds, options = {}) {
  const patterns = loadLearnedPatterns(options);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  for (const pattern of patterns) {
    if (patternIds.includes(pattern.id)) {
      pattern.promotedToCore = true;
      pattern.promotedAt = now;
    }
  }
  saveLearnedPatterns(patterns, options);
}
function prunePatterns(options = {}) {
  const patterns = loadLearnedPatterns(options);
  const now = Date.now();
  const maxAge = (options.maxAgeDays ?? 90) * 24 * 60 * 60 * 1e3;
  const minConfidence = options.minConfidence ?? 0.3;
  const minSuccess = options.minSuccess ?? 1;
  const filtered = patterns.filter((p) => {
    if (p.promotedToCore) return true;
    if (p.confidence < minConfidence) return false;
    if (minSuccess > 0 && p.successCount < minSuccess) return false;
    const age = now - new Date(p.createdAt).getTime();
    if (age > maxAge && p.successCount === 0) return false;
    return true;
  });
  const removed = patterns.length - filtered.length;
  if (removed > 0) {
    saveLearnedPatterns(filtered, options);
  }
  return {
    removed,
    remaining: filtered.length
  };
}
function getPatternStats(options = {}) {
  const patterns = loadLearnedPatterns(options);
  if (patterns.length === 0) {
    return {
      total: 0,
      promoted: 0,
      highConfidence: 0,
      lowConfidence: 0,
      avgConfidence: 0,
      totalSuccesses: 0,
      totalFailures: 0
    };
  }
  const promoted = patterns.filter((p) => p.promotedToCore).length;
  const highConfidence = patterns.filter((p) => p.confidence >= 0.7).length;
  const lowConfidence = patterns.filter((p) => p.confidence < 0.3).length;
  const totalConfidence = patterns.reduce((sum, p) => sum + p.confidence, 0);
  const totalSuccesses = patterns.reduce((sum, p) => sum + p.successCount, 0);
  const totalFailures = patterns.reduce((sum, p) => sum + p.failCount, 0);
  return {
    total: patterns.length,
    promoted,
    highConfidence,
    lowConfidence,
    avgConfidence: totalConfidence / patterns.length,
    totalSuccesses,
    totalFailures
  };
}
function exportPatternsToConfig(options) {
  const patterns = loadLearnedPatterns(options);
  const minConfidence = options.minConfidence ?? 0.7;
  const exportable = patterns.filter((p) => p.confidence >= minConfidence && !p.promotedToCore);
  const config = {
    version: "1.0.0",
    exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
    patterns: exportable.map((p) => ({
      id: p.id,
      trigger: generateRegexFromText(p.originalText),
      primitive: p.mappedPrimitive,
      confidence: p.confidence,
      sourceCount: p.sourceJourneys.length
    }))
  };
  const outputPath = options.outputPath || join(dirname(getPatternsFilePath(options.llkbRoot)), "autogen-patterns.json");
  writeFileSync(outputPath, JSON.stringify(config, null, 2), "utf-8");
  return {
    exported: exportable.length,
    path: outputPath
  };
}
function clearLearnedPatterns(options = {}) {
  const filePath = getPatternsFilePath(options.llkbRoot);
  if (existsSync(filePath)) {
    unlinkSync(filePath);
  }
  invalidatePatternCache();
}
var LAYER_PRIORITY, SELECTOR_STRATEGY_MAP, LOCK_MAX_WAIT_MS, STALE_LOCK_THRESHOLD_MS, discoveredPatternCache, DISCOVERED_CACHE_TTL_MS, PATTERNS_FILE, patternCache, CACHE_TTL_MS;
var init_patternExtension = __esm({
  "src/llkb/patternExtension.ts"() {
    init_glossary();
    init_paths();
    init_patternDistance();
    LAYER_PRIORITY = {
      "app-specific": 3,
      "framework": 2,
      "universal": 1
    };
    SELECTOR_STRATEGY_MAP = {
      "data-testid": "testid",
      "data-cy": "testid",
      "data-test": "testid",
      "role": "role",
      "aria-label": "label",
      "css": "css",
      "text": "text",
      "xpath": "css"
      // fallback — xpath not directly supported in LocatorStrategy
    };
    LOCK_MAX_WAIT_MS = 5e3;
    STALE_LOCK_THRESHOLD_MS = 3e4;
    discoveredPatternCache = null;
    DISCOVERED_CACHE_TTL_MS = 1e4;
    PATTERNS_FILE = "learned-patterns.json";
    patternCache = null;
    CACHE_TTL_MS = 5e3;
  }
});

// src/mapping/stepMapper.ts
async function loadLlkbModule() {
  if (llkbLoadAttempted) return llkbModule;
  llkbLoadAttempted = true;
  try {
    const mod = await Promise.resolve().then(() => (init_patternExtension(), patternExtension_exports));
    llkbModule = {
      matchLlkbPattern: mod.matchLlkbPattern,
      recordPatternSuccess: mod.recordPatternSuccess
    };
  } catch {
    llkbModule = null;
  }
  return llkbModule;
}
function tryLlkbMatch(text, options) {
  if (!llkbModule) {
    if (!llkbLoadAttempted) {
      void loadLlkbModule();
    }
    return null;
  }
  return llkbModule.matchLlkbPattern(text, options);
}
function isAssertion(primitive) {
  return primitive.type.startsWith("expect");
}
function mapStepText(text, options = {}) {
  const {
    normalizeText = true,
    useLlkb = true,
    llkbRoot,
    llkbMinConfidence = 0.7
  } = options;
  const hints = extractHints(text);
  const cleanText = hints.hasHints ? hints.cleanText : text;
  const processedText = normalizeText ? normalizeStepText(cleanText) : cleanText;
  let primitive = matchPattern(processedText);
  let matchSource = primitive ? "pattern" : "none";
  if (primitive && hints.hasHints) {
    primitive = applyHintsToPrimitive(primitive, hints);
  }
  let llkbPatternId;
  let llkbConfidence;
  if (!primitive && useLlkb) {
    const llkbMatch = tryLlkbMatch(processedText, {
      llkbRoot,
      minConfidence: llkbMinConfidence
    });
    if (llkbMatch) {
      primitive = llkbMatch.primitive;
      matchSource = "llkb";
      llkbPatternId = llkbMatch.patternId;
      llkbConfidence = llkbMatch.confidence;
      if (llkbModule && options.journeyId) {
        try {
          llkbModule.recordPatternSuccess(
            text,
            // Original text, not processed
            llkbMatch.primitive,
            options.journeyId,
            { llkbRoot }
          );
        } catch {
        }
      }
      if (hints.hasHints) {
        primitive = applyHintsToPrimitive(primitive, hints);
      }
    }
  }
  if (!primitive && hasLocatorHints(hints)) {
    primitive = createPrimitiveFromHints(processedText, hints);
    if (primitive) {
      matchSource = "hints";
    }
  }
  if (primitive) {
    return {
      primitive,
      sourceText: text,
      isAssertion: isAssertion(primitive),
      matchSource,
      llkbPatternId,
      llkbConfidence
    };
  }
  return {
    primitive: null,
    sourceText: text,
    isAssertion: false,
    message: getBlockedReason(processedText, text),
    matchSource: "none"
  };
}
function applyHintsToPrimitive(primitive, hints) {
  const enhanced = { ...primitive };
  if (hasLocatorHints(hints)) {
    const locatorSpec = buildLocatorFromHints2(hints);
    if (locatorSpec && "locator" in enhanced) {
      enhanced.locator = locatorSpec;
    }
  }
  if (hasBehaviorHints(hints)) {
    if (hints.behavior.timeout !== void 0 && "timeout" in enhanced) {
      enhanced.timeout = hints.behavior.timeout;
    }
    if (hints.behavior.signal && "signal" in enhanced) {
      enhanced.signal = hints.behavior.signal;
    }
    if (hints.behavior.module) {
      const parsed = parseModuleHint(hints.behavior.module);
      if (parsed) {
        enhanced.module = parsed.module;
        enhanced.method = parsed.method;
      }
    }
  }
  return enhanced;
}
function buildLocatorFromHints2(hints) {
  const { locator } = hints;
  if (locator.testid) {
    return { strategy: "testid", value: locator.testid };
  }
  if (locator.role) {
    const options = {};
    if (locator.label) options.name = locator.label;
    if (locator.exact) options.exact = true;
    if (locator.level) options.level = locator.level;
    return {
      strategy: "role",
      value: locator.role,
      options: Object.keys(options).length > 0 ? options : void 0
    };
  }
  if (locator.label) {
    return {
      strategy: "label",
      value: locator.label,
      options: locator.exact ? { exact: true } : void 0
    };
  }
  if (locator.text) {
    return {
      strategy: "text",
      value: locator.text,
      options: locator.exact ? { exact: true } : void 0
    };
  }
  return null;
}
function createPrimitiveFromHints(text, hints) {
  const locator = buildLocatorFromHints2(hints);
  if (!locator) return null;
  const lowerText = text.toLowerCase();
  if (lowerText.includes("click") || lowerText.includes("press")) {
    return { type: "click", locator };
  }
  if (lowerText.includes("enter") || lowerText.includes("type") || lowerText.includes("fill")) {
    const valueMatch = text.match(/['"]([^'"]+)['"]/);
    return {
      type: "fill",
      locator,
      value: { type: "literal", value: valueMatch ? valueMatch[1] : "" }
    };
  }
  if (lowerText.includes("see") || lowerText.includes("visible") || lowerText.includes("display")) {
    return { type: "expectVisible", locator };
  }
  if (lowerText.includes("check") || lowerText.includes("select")) {
    return { type: "check", locator };
  }
  return { type: "click", locator };
}
async function initializeLlkb() {
  const mod = await loadLlkbModule();
  return mod !== null;
}
function getBlockedReason(normalizedText, originalText) {
  const text = normalizedText.toLowerCase();
  const hasQuotedText = /["']/.test(originalText);
  const hasRole = /button|link|heading|checkbox|radio|textbox|combobox/.test(text);
  if ((text.includes("click") || text.includes("press") || text.includes("tap")) && !hasQuotedText && !hasRole) {
    return `Could not map step: "${originalText}" | Reason: No identifiable UI anchor (role, label, testid, or text content) | Suggestion: Rewrite as "Click the 'Label' button" or "Click the button with text 'Label'"`;
  }
  if ((text.includes("see") || text.includes("visible") || text.includes("shown") || text.includes("displayed")) && !hasQuotedText) {
    return `Could not map step: "${originalText}" | Reason: No specific element text or label to locate | Suggestion: Rewrite as "User should see 'Specific Text'" or "'Element Name' is visible"`;
  }
  if (text.includes("fill") || text.includes("enter") || text.includes("type") || text.includes("input")) {
    return `Could not map step: "${originalText}" | Reason: Could not parse field name and value | Suggestion: Rewrite as "Fill 'value' in 'Field Name' field" or "Fill the 'Field Name' field with 'value'"`;
  }
  if (text.includes("toast") || text.includes("notification") || text.includes("snackbar")) {
    return `Could not map step: "${originalText}" | Reason: Could not parse toast type or message | Suggestion: Rewrite as "A success toast appears with 'Message'" or "Toast with text 'Message' appears"`;
  }
  if (text.includes("select") || text.includes("choose") || text.includes("dropdown")) {
    return `Could not map step: "${originalText}" | Reason: Could not parse option and dropdown | Suggestion: Rewrite as "Select 'Option' from 'Dropdown Name'" or "Select 'Option' from dropdown"`;
  }
  if (text.includes("go") || text.includes("open") || text.includes("navigate") || text.includes("visit")) {
    return `Could not map step: "${originalText}" | Reason: Could not parse navigation target | Suggestion: Rewrite as "User navigates to '/path'" or "User opens '/url'"`;
  }
  return `Could not map step: "${originalText}" | Reason: No matching pattern found | Suggestion: Check supported patterns with 'artk-autogen patterns list'`;
}
var llkbModule, llkbLoadAttempted;
var init_stepMapper = __esm({
  "src/mapping/stepMapper.ts"() {
    init_patterns();
    init_glossary();
    init_parseHints();
    llkbModule = null;
    llkbLoadAttempted = false;
  }
});

// src/utils/escaping.ts
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&");
}
var init_escaping = __esm({
  "src/utils/escaping.ts"() {
  }
});

// src/journey/normalize.ts
function normalizeJourney(parsed, options = {}) {
  const { includeBlocked = true, strict = false } = options;
  const blockedSteps = [];
  const warnings = [];
  const steps = [];
  for (const ac of parsed.acceptanceCriteria) {
    const step = mapAcceptanceCriterionToStep(ac, parsed.proceduralSteps, warnings);
    const blockedPrimitives = [
      ...step.actions.filter((a) => a.type === "blocked"),
      ...step.assertions.filter((a) => a.type === "blocked")
    ];
    if (blockedPrimitives.length > 0) {
      for (const blocked of blockedPrimitives) {
        blockedSteps.push({
          stepId: step.id,
          sourceText: blocked.sourceText,
          reason: blocked.reason
        });
      }
      if (strict) {
        continue;
      }
    }
    if (includeBlocked || blockedPrimitives.length === 0) {
      steps.push(step);
    }
  }
  if (steps.length === 0 && parsed.proceduralSteps.length > 0) {
    for (const ps of parsed.proceduralSteps) {
      const step = mapProceduralStepToIRStep(ps, warnings);
      steps.push(step);
    }
  }
  const moduleDependencies = {
    foundation: parsed.frontmatter.modules?.foundation ?? [],
    feature: parsed.frontmatter.modules?.features ?? []
  };
  const completion = parsed.frontmatter.completion?.map((c) => ({
    type: c.type,
    value: c.value,
    options: c.options
  }));
  const data = parsed.frontmatter.data ? {
    strategy: parsed.frontmatter.data.strategy,
    cleanup: parsed.frontmatter.data.cleanup
  } : void 0;
  const journey = {
    id: parsed.frontmatter.id,
    title: parsed.frontmatter.title,
    tier: parsed.frontmatter.tier,
    scope: parsed.frontmatter.scope,
    actor: parsed.frontmatter.actor,
    tags: buildTags(parsed),
    moduleDependencies,
    data,
    completion,
    steps,
    revision: parsed.frontmatter.revision,
    prerequisites: parsed.frontmatter.prerequisites,
    negativePaths: parsed.frontmatter.negativePaths,
    sourcePath: parsed.sourcePath,
    // P3 Feature fields - pass through from frontmatter
    testData: parsed.frontmatter.testData,
    visualRegression: parsed.frontmatter.visualRegression,
    accessibility: parsed.frontmatter.accessibility,
    performance: parsed.frontmatter.performance
  };
  const stats = {
    totalSteps: parsed.acceptanceCriteria.length || parsed.proceduralSteps.length,
    mappedSteps: steps.length,
    blockedSteps: blockedSteps.length,
    totalActions: steps.reduce((sum, s) => sum + s.actions.length, 0),
    totalAssertions: steps.reduce((sum, s) => sum + s.assertions.length, 0)
  };
  return {
    journey,
    blockedSteps,
    warnings,
    stats
  };
}
function mapAcceptanceCriterionToStep(ac, proceduralSteps, warnings) {
  const actions = [];
  const assertions = [];
  const notes = [];
  const relatedProcedural = proceduralSteps.filter((ps) => ps.linkedAC === ac.id);
  for (const stepText of ac.steps) {
    const result = mapStepText(stepText, { normalizeText: false });
    if (result.primitive) {
      if (isAssertion2(result.primitive)) {
        assertions.push(result.primitive);
      } else {
        actions.push(result.primitive);
      }
    } else {
      actions.push({
        type: "blocked",
        reason: result.message || "Could not parse step into primitive",
        sourceText: stepText
      });
      if (result.message) {
        warnings.push(result.message);
      }
    }
  }
  for (const ps of relatedProcedural) {
    const result = mapStepText(ps.text, { normalizeText: false });
    if (result.primitive) {
      if (isAssertion2(result.primitive)) {
        assertions.push(result.primitive);
      } else {
        actions.push(result.primitive);
      }
    } else if (result.message) {
      warnings.push(result.message);
    }
  }
  if (assertions.length === 0 && ac.title) {
    notes.push(`TODO: Add assertion for: ${ac.title}`);
  }
  return {
    id: ac.id,
    description: ac.title || `Step ${ac.id}`,
    actions,
    assertions,
    sourceText: ac.rawContent,
    notes: notes.length > 0 ? notes : void 0
  };
}
function mapProceduralStepToIRStep(ps, warnings) {
  const actions = [];
  const assertions = [];
  const result = mapStepText(ps.text, { normalizeText: false });
  if (result.primitive) {
    if (isAssertion2(result.primitive)) {
      assertions.push(result.primitive);
    } else {
      actions.push(result.primitive);
    }
  } else {
    actions.push({
      type: "blocked",
      reason: result.message || "Could not parse procedural step",
      sourceText: ps.text
    });
    if (result.message) {
      warnings.push(result.message);
    }
  }
  return {
    id: `PS-${ps.number}`,
    description: ps.text,
    actions,
    assertions
  };
}
function isAssertion2(primitive) {
  return primitive.type.startsWith("expect");
}
function buildTags(parsed) {
  const tags = /* @__PURE__ */ new Set();
  tags.add("@artk");
  tags.add("@journey");
  tags.add(`@${parsed.frontmatter.id}`);
  tags.add(`@tier-${parsed.frontmatter.tier}`);
  tags.add(`@scope-${parsed.frontmatter.scope}`);
  tags.add(`@actor-${parsed.frontmatter.actor}`);
  if (parsed.frontmatter.tags) {
    for (const tag of parsed.frontmatter.tags) {
      tags.add(tag.startsWith("@") ? tag : `@${tag}`);
    }
  }
  return Array.from(tags);
}
var init_normalize = __esm({
  "src/journey/normalize.ts"() {
    init_stepMapper();
    init_escaping();
  }
});

// src/selectors/priority.ts
function toPlaywrightLocator(locator) {
  switch (locator.strategy) {
    case "role": {
      const opts = [];
      if (locator.options?.name) {
        opts.push(`name: '${escapeString(locator.options.name)}'`);
      }
      if (locator.options?.exact) {
        opts.push("exact: true");
      }
      if (locator.options?.level) {
        opts.push(`level: ${locator.options.level}`);
      }
      const optsStr = opts.length > 0 ? `, { ${opts.join(", ")} }` : "";
      return `getByRole('${locator.value}'${optsStr})`;
    }
    case "label": {
      const exact = locator.options?.exact ? ", { exact: true }" : "";
      return `getByLabel('${escapeString(locator.value)}'${exact})`;
    }
    case "placeholder": {
      const exact = locator.options?.exact ? ", { exact: true }" : "";
      return `getByPlaceholder('${escapeString(locator.value)}'${exact})`;
    }
    case "text": {
      const exact = locator.options?.exact ? ", { exact: true }" : "";
      return `getByText('${escapeString(locator.value)}'${exact})`;
    }
    case "testid":
      return `getByTestId('${escapeString(locator.value)}')`;
    case "css":
      return `locator('${escapeString(locator.value)}')`;
    default:
      return `locator('${escapeString(locator.value)}')`;
  }
}
function escapeString(str) {
  return str.replace(/'/g, "\\'").replace(/\n/g, "\\n");
}
var init_priority = __esm({
  "src/selectors/priority.ts"() {
  }
});
var SelectorEntrySchema, ComponentEntrySchema, PageEntrySchema, CSSDebtEntrySchema;
var init_catalogSchema = __esm({
  "src/selectors/catalogSchema.ts"() {
    SelectorEntrySchema = z.object({
      /** Unique identifier for this selector */
      id: z.string(),
      /** Human-readable description */
      description: z.string().optional(),
      /** The selector strategy */
      strategy: z.enum(["testid", "role", "label", "text", "css", "xpath"]),
      /** The selector value */
      value: z.string(),
      /** Additional options for the locator */
      options: z.object({
        name: z.string().optional(),
        exact: z.boolean().optional(),
        level: z.number().optional()
      }).optional(),
      /** Component or page this selector belongs to */
      component: z.string().optional(),
      /** File where this selector was discovered */
      sourceFile: z.string().optional(),
      /** Line number in source file */
      sourceLine: z.number().optional(),
      /** Tags for categorization */
      tags: z.array(z.string()).optional(),
      /** Whether this is a stable selector (not likely to change) */
      stable: z.boolean().default(true),
      /** Last verified timestamp */
      lastVerified: z.string().optional()
    });
    ComponentEntrySchema = z.object({
      /** Component name */
      name: z.string(),
      /** Component file path */
      path: z.string().optional(),
      /** Selectors within this component */
      selectors: z.array(z.string()),
      // References to selector IDs
      /** Child components */
      children: z.array(z.string()).optional()
    });
    PageEntrySchema = z.object({
      /** Page name */
      name: z.string(),
      /** Route pattern */
      route: z.string().optional(),
      /** Page file path */
      path: z.string().optional(),
      /** Components on this page */
      components: z.array(z.string()).optional(),
      /** Direct selectors on this page */
      selectors: z.array(z.string()).optional()
    });
    CSSDebtEntrySchema = z.object({
      /** The CSS selector being used */
      selector: z.string(),
      /** Files using this selector */
      usages: z.array(
        z.object({
          file: z.string(),
          line: z.number()
        })
      ),
      /** Suggested replacement */
      suggestedReplacement: z.object({
        strategy: z.string(),
        value: z.string()
      }).optional(),
      /** Priority for migration (higher = more urgent) */
      priority: z.enum(["low", "medium", "high"]).default("medium"),
      /** Reason this is considered debt */
      reason: z.string().optional()
    });
    z.object({
      /** Schema version */
      version: z.string().default("1.0.0"),
      /** Generation timestamp */
      generatedAt: z.string(),
      /** Source directory that was scanned */
      sourceDir: z.string().optional(),
      /** All selectors indexed by ID */
      selectors: z.record(SelectorEntrySchema),
      /** Components indexed by name */
      components: z.record(ComponentEntrySchema).default({}),
      /** Pages indexed by name */
      pages: z.record(PageEntrySchema).default({}),
      /** TestIDs found in the codebase */
      testIds: z.array(z.string()).default([]),
      /** CSS debt entries */
      cssDebt: z.array(CSSDebtEntrySchema).default([]),
      /** Statistics */
      stats: z.object({
        totalSelectors: z.number(),
        byStrategy: z.record(z.number()),
        stableCount: z.number(),
        unstableCount: z.number(),
        cssDebtCount: z.number()
      }).optional()
    });
  }
});
var init_catalog = __esm({
  "src/selectors/catalog.ts"() {
    init_catalogSchema();
  }
});

// src/selectors/infer.ts
var init_infer = __esm({
  "src/selectors/infer.ts"() {
    init_priority();
    init_catalog();
  }
});
var init_scanner = __esm({
  "src/selectors/scanner.ts"() {
    init_catalogSchema();
  }
});

// src/selectors/debt.ts
var init_debt = __esm({
  "src/selectors/debt.ts"() {
    init_catalog();
  }
});

// src/codegen/blocks.ts
function extractManagedBlocks(code) {
  const lines = code.split("\n");
  const blocks = [];
  const preservedCode = [];
  const warnings = [];
  let inBlock = false;
  let currentBlock = null;
  let blockContent = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes(BLOCK_START)) {
      if (inBlock) {
        warnings.push({
          type: "nested",
          line: i + 1,
          message: `Nested managed block detected at line ${i + 1}. Previous block starting at line ${(currentBlock?.startLine ?? 0) + 1} will be closed.`
        });
        if (currentBlock) {
          blocks.push({
            ...currentBlock,
            endLine: i - 1,
            content: blockContent.join("\n")
          });
        }
      }
      inBlock = true;
      const match = line.match(BLOCK_ID_PATTERN);
      currentBlock = {
        id: match?.[1],
        startLine: i
      };
      blockContent = [];
      continue;
    }
    if (line.includes(BLOCK_END) && inBlock) {
      inBlock = false;
      if (currentBlock) {
        blocks.push({
          ...currentBlock,
          endLine: i,
          content: blockContent.join("\n")
        });
      }
      currentBlock = null;
      blockContent = [];
      continue;
    }
    if (inBlock) {
      blockContent.push(line);
    } else {
      preservedCode.push(line);
    }
  }
  if (inBlock && currentBlock) {
    warnings.push({
      type: "unclosed",
      line: (currentBlock.startLine ?? 0) + 1,
      message: `Unclosed managed block starting at line ${(currentBlock.startLine ?? 0) + 1} - block will be ignored`
    });
  }
  return {
    blocks,
    preservedCode,
    hasBlocks: blocks.length > 0,
    warnings
  };
}
function wrapInBlock(content, id) {
  const startMarker = id ? `${BLOCK_START} id=${id}` : BLOCK_START;
  return `${startMarker}
${content}
${BLOCK_END}`;
}
function injectManagedBlocks(options) {
  const { existingCode, newBlocks } = options;
  if (!existingCode.trim()) {
    return newBlocks.map((block) => wrapInBlock(block.content, block.id)).join("\n\n");
  }
  const { preservedCode, hasBlocks } = extractManagedBlocks(existingCode);
  if (!hasBlocks) {
    const preserved = preservedCode.join("\n").trim();
    const newContent = newBlocks.map((block) => wrapInBlock(block.content, block.id)).join("\n\n");
    return preserved ? `${preserved}

${newContent}` : newContent;
  }
  const result = [];
  const processedIds = /* @__PURE__ */ new Set();
  let idLessBlockIndex = 0;
  const idLessNewBlocks = newBlocks.filter((b) => !b.id);
  const processedIdLessIndices = /* @__PURE__ */ new Set();
  const lines = existingCode.split("\n");
  let inBlock = false;
  let currentBlockId;
  let skipUntilEnd = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes(BLOCK_START)) {
      inBlock = true;
      const match = line.match(BLOCK_ID_PATTERN);
      currentBlockId = match?.[1];
      let replacement;
      if (currentBlockId) {
        replacement = newBlocks.find((b) => b.id === currentBlockId);
        if (replacement) {
          processedIds.add(currentBlockId);
        }
      } else {
        if (idLessBlockIndex < idLessNewBlocks.length) {
          replacement = idLessNewBlocks[idLessBlockIndex];
          processedIdLessIndices.add(idLessBlockIndex);
        }
        idLessBlockIndex++;
      }
      if (replacement) {
        result.push(wrapInBlock(replacement.content, replacement.id));
        skipUntilEnd = true;
      } else {
        result.push(line);
        skipUntilEnd = false;
      }
      continue;
    }
    if (line.includes(BLOCK_END) && inBlock) {
      inBlock = false;
      if (!skipUntilEnd) {
        result.push(line);
      }
      currentBlockId = void 0;
      skipUntilEnd = false;
      continue;
    }
    if (!inBlock) {
      result.push(line);
    } else if (!skipUntilEnd) {
      result.push(line);
    }
  }
  for (let i = 0; i < newBlocks.length; i++) {
    const block = newBlocks[i];
    if (block.id) {
      if (!processedIds.has(block.id)) {
        result.push("");
        result.push(wrapInBlock(block.content, block.id));
      }
    } else {
      const idLessIndex = idLessNewBlocks.indexOf(block);
      if (!processedIdLessIndices.has(idLessIndex)) {
        result.push("");
        result.push(wrapInBlock(block.content, block.id));
      }
    }
  }
  return result.join("\n");
}
var BLOCK_START, BLOCK_END, BLOCK_ID_PATTERN;
var init_blocks = __esm({
  "src/codegen/blocks.ts"() {
    BLOCK_START = "// ARTK:BEGIN GENERATED";
    BLOCK_END = "// ARTK:END GENERATED";
    BLOCK_ID_PATTERN = /ARTK:BEGIN GENERATED(?:\s+id=([a-zA-Z0-9_-]+))?/;
  }
});
function splitJourneyContent(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    throw new Error(
      "Invalid Journey format: missing frontmatter delimiters (content should be wrapped in --- ... ---)"
    );
  }
  return {
    frontmatter: match[1],
    body: match[2]
  };
}
function calculateContentHash(content) {
  return createHash("sha256").update(content).digest("hex").substring(0, 8);
}
function updateJourneyFrontmatter(options) {
  const {
    journeyPath,
    testPath,
    testContent,
    modules = { foundation: [], features: [] }
  } = options;
  const content = readFileSync(journeyPath, "utf-8");
  const { frontmatter, body } = splitJourneyContent(content);
  const parsed = parse(frontmatter);
  const previousTests = Array.isArray(parsed.tests) ? parsed.tests.map(
    (t) => typeof t === "string" ? { path: t, generated: "", hash: "" } : { ...t }
  ) : [];
  const hash = calculateContentHash(testContent);
  const testEntry = {
    path: testPath,
    generated: (/* @__PURE__ */ new Date()).toISOString(),
    hash
  };
  if (!Array.isArray(parsed.tests)) {
    parsed.tests = [];
  }
  const existingIndex = parsed.tests.findIndex(
    (t) => typeof t === "string" ? t === testPath : t.path === testPath
  );
  if (existingIndex >= 0) {
    parsed.tests[existingIndex] = testEntry;
  } else {
    parsed.tests.push(testEntry);
  }
  const modulesAdded = {
    foundation: [],
    features: []
  };
  if (!parsed.modules || typeof parsed.modules !== "object") {
    parsed.modules = { foundation: [], features: [] };
  }
  const parsedModules = parsed.modules;
  if (!Array.isArray(parsedModules.foundation)) {
    parsedModules.foundation = [];
  }
  if (!Array.isArray(parsedModules.features)) {
    parsedModules.features = [];
  }
  if (modules.foundation) {
    const existingFoundation = new Set(parsedModules.foundation);
    for (const mod of modules.foundation) {
      if (!existingFoundation.has(mod)) {
        modulesAdded.foundation.push(mod);
        parsedModules.foundation.push(mod);
      }
    }
    parsedModules.foundation.sort();
  }
  if (modules.features) {
    const existingFeatures = new Set(parsedModules.features);
    for (const mod of modules.features) {
      if (!existingFeatures.has(mod)) {
        modulesAdded.features.push(mod);
        parsedModules.features.push(mod);
      }
    }
    parsedModules.features.sort();
  }
  const newFrontmatter = stringify(parsed, {
    lineWidth: 0,
    // Prevent line wrapping
    defaultKeyType: "PLAIN",
    defaultStringType: "QUOTE_DOUBLE"
  });
  const newContent = `---
${newFrontmatter}---
${body}`;
  writeFileSync(journeyPath, newContent, "utf-8");
  return {
    success: true,
    previousTests,
    updatedTests: parsed.tests,
    modulesAdded
  };
}
var init_updater = __esm({
  "src/journey/updater.ts"() {
  }
});
function getPackageVersion() {
  if (cachedVersion) {
    return cachedVersion;
  }
  try {
    if (typeof __ARTK_VERSION__ !== "undefined" && __ARTK_VERSION__) {
      cachedVersion = __ARTK_VERSION__;
      return cachedVersion;
    }
  } catch {
  }
  const envVersion = process.env["ARTK_VERSION"];
  if (envVersion) {
    cachedVersion = envVersion;
    return cachedVersion;
  }
  try {
    const packageRoot = getPackageRoot();
    const pkgPath = join(packageRoot, "package.json");
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      if (pkg.version) {
        cachedVersion = pkg.version;
        return cachedVersion;
      }
    }
  } catch {
  }
  cachedVersion = "unknown";
  return cachedVersion;
}
function getGeneratedTimestamp() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
var cachedVersion;
var init_version = __esm({
  "src/utils/version.ts"() {
    init_paths();
  }
});

// src/variants/index.ts
function detectVariant() {
  const nodeVersionStr = process.version.slice(1);
  const nodeVersion = parseInt(nodeVersionStr.split(".")[0] ?? "18", 10);
  const isESM = typeof import.meta !== "undefined";
  if (nodeVersion >= 18) {
    return {
      id: isESM ? "modern-esm" : "modern-cjs",
      nodeVersion,
      moduleSystem: isESM ? "esm" : "cjs",
      playwrightVersion: "1.57.x",
      features: {
        ariaSnapshots: true,
        clockApi: true,
        topLevelAwait: true,
        promiseAny: true
      }
    };
  } else if (nodeVersion >= 16) {
    return {
      id: "legacy-16",
      nodeVersion,
      moduleSystem: "cjs",
      playwrightVersion: "1.49.x",
      features: {
        ariaSnapshots: true,
        clockApi: true,
        topLevelAwait: true,
        promiseAny: true
      }
    };
  } else {
    return {
      id: "legacy-14",
      nodeVersion,
      moduleSystem: "cjs",
      playwrightVersion: "1.33.x",
      features: {
        ariaSnapshots: false,
        clockApi: false,
        topLevelAwait: false,
        promiseAny: false
      }
    };
  }
}
var init_variants = __esm({
  "src/variants/index.ts"() {
  }
});
function escapeString2(str) {
  return str.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r");
}
function renderValue(value) {
  switch (value.type) {
    case "literal":
      return `'${escapeString2(value.value)}'`;
    case "actor":
      return `actor.${value.value}`;
    case "runId":
      return "runId";
    case "generated":
      return `\`${value.value}\``;
    case "testData":
      return `testData.${value.value}`;
    default:
      return `'${escapeString2(value.value)}'`;
  }
}
function renderPrimitive(primitive, indent = "", _ctx) {
  switch (primitive.type) {
    // Navigation
    case "goto":
      return `${indent}await page.goto('${escapeString2(primitive.url)}');`;
    case "waitForURL":
      const urlPattern = typeof primitive.pattern === "string" ? `/${escapeRegex(primitive.pattern)}/` : primitive.pattern.toString();
      return `${indent}await page.waitForURL(${urlPattern});`;
    case "waitForResponse":
      return `${indent}await page.waitForResponse(resp => resp.url().includes('${escapeString2(primitive.urlPattern)}'));`;
    case "waitForLoadingComplete":
      return `${indent}await page.waitForLoadState('networkidle');`;
    case "reload":
      return `${indent}await page.reload();`;
    case "goBack":
      return `${indent}await page.goBack();`;
    case "goForward":
      return `${indent}await page.goForward();`;
    // Wait primitives
    case "waitForVisible":
      const waitVisibleTimeout = primitive.timeout ? `, timeout: ${primitive.timeout}` : "";
      return `${indent}await page.${toPlaywrightLocator(primitive.locator)}.waitFor({ state: 'visible'${waitVisibleTimeout} });`;
    case "waitForHidden":
      const waitHiddenTimeout = primitive.timeout ? `, timeout: ${primitive.timeout}` : "";
      return `${indent}await page.${toPlaywrightLocator(primitive.locator)}.waitFor({ state: 'hidden'${waitHiddenTimeout} });`;
    case "waitForTimeout":
      return `${indent}await page.waitForTimeout(${primitive.ms});`;
    case "waitForNetworkIdle":
      const networkIdleOptions = primitive.timeout ? `, { timeout: ${primitive.timeout} }` : "";
      return `${indent}await page.waitForLoadState('networkidle'${networkIdleOptions});`;
    // Interactions
    case "click":
      return `${indent}await page.${toPlaywrightLocator(primitive.locator)}.click();`;
    case "dblclick":
      return `${indent}await page.${toPlaywrightLocator(primitive.locator)}.dblclick();`;
    case "rightClick":
      return `${indent}await page.${toPlaywrightLocator(primitive.locator)}.click({ button: 'right' });`;
    case "fill":
      return `${indent}await page.${toPlaywrightLocator(primitive.locator)}.fill(${renderValue(primitive.value)});`;
    case "select":
      return `${indent}await page.${toPlaywrightLocator(primitive.locator)}.selectOption('${escapeString2(primitive.option)}');`;
    case "check":
      return `${indent}await page.${toPlaywrightLocator(primitive.locator)}.check();`;
    case "uncheck":
      return `${indent}await page.${toPlaywrightLocator(primitive.locator)}.uncheck();`;
    case "press":
      if (primitive.locator) {
        return `${indent}await page.${toPlaywrightLocator(primitive.locator)}.press('${primitive.key}');`;
      }
      return `${indent}await page.keyboard.press('${primitive.key}');`;
    case "hover":
      return `${indent}await page.${toPlaywrightLocator(primitive.locator)}.hover();`;
    case "focus":
      return `${indent}await page.${toPlaywrightLocator(primitive.locator)}.focus();`;
    case "clear":
      return `${indent}await page.${toPlaywrightLocator(primitive.locator)}.clear();`;
    case "upload":
      return `${indent}await page.${toPlaywrightLocator(primitive.locator)}.setInputFiles([${primitive.files.map((f) => `'${escapeString2(f)}'`).join(", ")}]);`;
    // Assertions
    case "expectVisible":
      const visibleOptions = primitive.timeout ? `{ timeout: ${primitive.timeout} }` : "";
      return `${indent}await expect(page.${toPlaywrightLocator(primitive.locator)}).toBeVisible(${visibleOptions});`;
    case "expectNotVisible":
      return `${indent}await expect(page.${toPlaywrightLocator(primitive.locator)}).not.toBeVisible();`;
    case "expectHidden":
      return `${indent}await expect(page.${toPlaywrightLocator(primitive.locator)}).toBeHidden();`;
    case "expectText":
      const textPattern = typeof primitive.text === "string" ? `'${escapeString2(primitive.text)}'` : primitive.text.toString();
      return `${indent}await expect(page.${toPlaywrightLocator(primitive.locator)}).toHaveText(${textPattern});`;
    case "expectValue":
      return `${indent}await expect(page.${toPlaywrightLocator(primitive.locator)}).toHaveValue('${escapeString2(primitive.value)}');`;
    case "expectChecked":
      if (primitive.checked === false) {
        return `${indent}await expect(page.${toPlaywrightLocator(primitive.locator)}).not.toBeChecked();`;
      }
      return `${indent}await expect(page.${toPlaywrightLocator(primitive.locator)}).toBeChecked();`;
    case "expectEnabled":
      return `${indent}await expect(page.${toPlaywrightLocator(primitive.locator)}).toBeEnabled();`;
    case "expectDisabled":
      return `${indent}await expect(page.${toPlaywrightLocator(primitive.locator)}).toBeDisabled();`;
    case "expectURL":
      const urlExpectPattern = typeof primitive.pattern === "string" ? `/${escapeRegex(primitive.pattern)}/` : primitive.pattern.toString();
      return `${indent}await expect(page).toHaveURL(${urlExpectPattern});`;
    case "expectTitle":
      const titlePattern = typeof primitive.title === "string" ? `'${escapeString2(primitive.title)}'` : primitive.title.toString();
      return `${indent}await expect(page).toHaveTitle(${titlePattern});`;
    case "expectCount":
      return `${indent}await expect(page.${toPlaywrightLocator(primitive.locator)}).toHaveCount(${primitive.count});`;
    case "expectContainsText":
      return `${indent}await expect(page.${toPlaywrightLocator(primitive.locator)}).toContainText('${escapeString2(primitive.text)}');`;
    // Signals
    case "expectToast":
      const toastSelector = primitive.message ? `getByText('${escapeString2(primitive.message)}')` : `getByRole('alert')`;
      return `${indent}await expect(page.${toastSelector}).toBeVisible();`;
    case "dismissModal":
      return `${indent}await page.getByRole('dialog').getByRole('button', { name: /close|cancel|dismiss/i }).click();`;
    case "acceptAlert":
      return `${indent}page.on('dialog', dialog => dialog.accept());`;
    case "dismissAlert":
      return `${indent}page.on('dialog', dialog => dialog.dismiss());`;
    // Module calls - use factory function to create instance
    case "callModule":
      const factoryName = `create${primitive.module}`;
      const args = primitive.args ? primitive.args.map((a) => JSON.stringify(a)).join(", ") : "";
      return `${indent}await ${factoryName}(page).${primitive.method}(${args});`;
    // Blocked - must throw to fail the test
    case "blocked": {
      const parts = primitive.reason.split(" | ");
      const mainReason = parts[0] ?? primitive.reason;
      const reasonDetail = parts.find((p) => p.startsWith("Reason:")) ?? "";
      const suggestion = parts.find((p) => p.startsWith("Suggestion:")) ?? "";
      const lines = [`${indent}// TODO: ${mainReason}`];
      if (reasonDetail) lines.push(`${indent}// ${reasonDetail}`);
      if (suggestion) lines.push(`${indent}// ${suggestion}`);
      lines.push(`${indent}throw new Error('ARTK BLOCKED: ${escapeString2(mainReason)}');`);
      return lines.join("\n");
    }
    default:
      return `${indent}// Unknown primitive type: ${primitive.type}`;
  }
}
function createVariantAwareRenderer(ctx) {
  return (primitive, indent = "") => renderPrimitive(primitive, indent);
}
function loadDefaultTemplate() {
  const templatePath = getTemplatePath("test.ejs");
  return readFileSync(templatePath, "utf-8");
}
function collectImports(journey) {
  const imports = [];
  const usedModules = /* @__PURE__ */ new Set();
  for (const step of journey.steps) {
    for (const action of step.actions) {
      if (action.type === "callModule") {
        usedModules.add(action.module);
      }
    }
  }
  for (const module of usedModules) {
    const modulePath = module.charAt(0).toLowerCase() + module.slice(1);
    const factoryName = `create${module}`;
    imports.push({
      members: [factoryName],
      from: `@modules/${modulePath}`
    });
  }
  return imports;
}
function getLlkbInfo(llkbRoot) {
  const analyticsPath = join(llkbRoot, "analytics.json");
  if (!existsSync(analyticsPath)) {
    return { llkbVersion: null, llkbEntries: null };
  }
  try {
    const content = readFileSync(analyticsPath, "utf-8");
    const analytics = JSON.parse(content);
    const llkbVersion = analytics.lastUpdated || (/* @__PURE__ */ new Date()).toISOString();
    const totalLessons = analytics.overview?.totalLessons || 0;
    const totalComponents = analytics.overview?.totalComponents || 0;
    const llkbEntries = totalLessons + totalComponents;
    return { llkbVersion, llkbEntries };
  } catch {
    return { llkbVersion: null, llkbEntries: null };
  }
}
function generateTest(journey, options = {}) {
  const {
    templatePath,
    imports: additionalImports = [],
    strategy = "full",
    existingCode,
    llkbRoot = ".artk/llkb",
    includeLlkbVersion = true,
    targetVariant,
    warnOnIncompatible = true
  } = options;
  const variant = targetVariant || detectVariant();
  const variantCtx = {
    warnings: []};
  const template = templatePath ? readFileSync(templatePath, "utf-8") : loadDefaultTemplate();
  const imports = [...collectImports(journey), ...additionalImports];
  let llkbVersion = null;
  let llkbEntries = null;
  if (includeLlkbVersion) {
    const llkbInfo = getLlkbInfo(llkbRoot);
    llkbVersion = llkbInfo.llkbVersion;
    llkbEntries = llkbInfo.llkbEntries;
  }
  const variantAwareRenderPrimitive = createVariantAwareRenderer();
  let code = ejs.render(template, {
    journey,
    imports,
    renderPrimitive: variantAwareRenderPrimitive,
    escapeString: escapeString2,
    escapeRegex,
    version: getPackageVersion(),
    timestamp: getGeneratedTimestamp(),
    llkbVersion,
    llkbEntries,
    variant: variant.id,
    playwrightVersion: variant.playwrightVersion
  });
  if (strategy === "blocks" && existingCode) {
    const testBlock = {
      id: `test-${journey.id}`,
      content: code.trim()
    };
    code = injectManagedBlocks({
      existingCode,
      newBlocks: [testBlock]
    });
  } else if (strategy === "ast" && existingCode) {
    console.warn("AST strategy not yet implemented for blocks integration, using full generation");
  }
  const filename = `${journey.id.toLowerCase()}.spec.ts`;
  if (options.updateJourney && options.journeyPath) {
    try {
      const testPath = options.outputPath || filename;
      const modules = {
        foundation: journey.moduleDependencies?.foundation || [],
        features: journey.moduleDependencies?.feature || []
        // Note: IR uses 'feature' (singular)
      };
      updateJourneyFrontmatter({
        journeyPath: options.journeyPath,
        testPath,
        testContent: code,
        modules
      });
    } catch (error) {
      console.error(
        `Warning: Failed to update journey frontmatter: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  return {
    code,
    journeyId: journey.id,
    filename,
    imports,
    variant,
    variantWarnings: variantCtx.warnings.length > 0 ? variantCtx.warnings : void 0
  };
}
var init_generateTest = __esm({
  "src/codegen/generateTest.ts"() {
    init_priority();
    init_blocks();
    init_updater();
    init_escaping();
    init_version();
    init_paths();
    init_variants();
  }
});
function toPascalCase(str) {
  return str.split(/[-_\s]+/).map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join("");
}
function toCamelCase(str) {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}
function generateLocatorName(spec, existingNames) {
  let baseName;
  switch (spec.strategy) {
    case "role":
      baseName = spec.options?.name ? `${toCamelCase(spec.options.name)}${toPascalCase(spec.value)}` : `${toCamelCase(spec.value)}Element`;
      break;
    case "label":
    case "placeholder":
    case "text":
      baseName = `${toCamelCase(spec.value)}Field`;
      break;
    case "testid":
      baseName = toCamelCase(spec.value);
      break;
    case "css":
      const match = spec.value.match(/[#.]?([a-zA-Z][a-zA-Z0-9_-]*)/);
      baseName = match ? toCamelCase(match[1]) : "element";
      break;
    default:
      baseName = "element";
  }
  let name = baseName;
  let counter = 1;
  while (existingNames.has(name)) {
    name = `${baseName}${counter}`;
    counter++;
  }
  existingNames.add(name);
  return name;
}
function extractLocators(journey) {
  const locators = [];
  const existingNames = /* @__PURE__ */ new Set();
  const seenSpecs = /* @__PURE__ */ new Map();
  const processPrimitive = (primitive) => {
    const locatorSpec = primitive.locator;
    if (!locatorSpec) return;
    const specKey = JSON.stringify(locatorSpec);
    if (seenSpecs.has(specKey)) return;
    const name = generateLocatorName(locatorSpec, existingNames);
    const playwrightLocator = toPlaywrightLocator(locatorSpec);
    const locator = {
      name,
      playwright: playwrightLocator,
      spec: locatorSpec,
      description: `Locator for ${locatorSpec.strategy}: ${locatorSpec.value}`
    };
    locators.push(locator);
    seenSpecs.set(specKey, locator);
  };
  if (journey.setup) {
    for (const primitive of journey.setup) {
      processPrimitive(primitive);
    }
  }
  for (const step of journey.steps) {
    for (const action of step.actions) {
      processPrimitive(action);
    }
    for (const assertion of step.assertions) {
      processPrimitive(assertion);
    }
  }
  if (journey.cleanup) {
    for (const primitive of journey.cleanup) {
      processPrimitive(primitive);
    }
  }
  return locators;
}
function generateMethods(journey, locators) {
  const methods = [];
  const locatorMap = /* @__PURE__ */ new Map();
  for (const locator of locators) {
    const specKey = JSON.stringify(locator.spec);
    locatorMap.set(specKey, locator.name);
  }
  const getLocatorRef = (spec) => {
    const specKey = JSON.stringify(spec);
    const locatorName = locatorMap.get(specKey);
    return locatorName ? `this.${locatorName}` : `this.page.${toPlaywrightLocator(spec)}`;
  };
  for (const step of journey.steps) {
    const methodName = toCamelCase(step.id.replace(/[^a-zA-Z0-9]/g, "_"));
    const body = [];
    for (const action of step.actions) {
      const line = primitiveToMethodLine(action, getLocatorRef);
      if (line) {
        body.push(line);
      }
    }
    for (const assertion of step.assertions) {
      const line = primitiveToMethodLine(assertion, getLocatorRef);
      if (line) {
        body.push(line);
      }
    }
    if (body.length > 0) {
      methods.push({
        name: methodName,
        description: step.description,
        params: [],
        returnType: "void",
        body
      });
    }
  }
  return methods;
}
function primitiveToMethodLine(primitive, getLocatorRef) {
  switch (primitive.type) {
    // Navigation
    case "goto":
      return `await this.page.goto('${escapeString3(primitive.url)}');`;
    case "waitForURL":
      const urlPattern = typeof primitive.pattern === "string" ? `'${escapeString3(primitive.pattern)}'` : primitive.pattern.toString();
      return `await this.page.waitForURL(${urlPattern});`;
    case "waitForLoadingComplete":
      return `await this.page.waitForLoadState('networkidle');`;
    // Interactions
    case "click":
      return `await ${getLocatorRef(primitive.locator)}.click();`;
    case "fill":
      const value = primitive.value.type === "literal" ? `'${escapeString3(primitive.value.value)}'` : primitive.value.value;
      return `await ${getLocatorRef(primitive.locator)}.fill(${value});`;
    case "select":
      return `await ${getLocatorRef(primitive.locator)}.selectOption('${escapeString3(primitive.option)}');`;
    case "check":
      return `await ${getLocatorRef(primitive.locator)}.check();`;
    case "uncheck":
      return `await ${getLocatorRef(primitive.locator)}.uncheck();`;
    case "press":
      if (primitive.locator) {
        return `await ${getLocatorRef(primitive.locator)}.press('${primitive.key}');`;
      }
      return `await this.page.keyboard.press('${primitive.key}');`;
    case "hover":
      return `await ${getLocatorRef(primitive.locator)}.hover();`;
    case "focus":
      return `await ${getLocatorRef(primitive.locator)}.focus();`;
    case "clear":
      return `await ${getLocatorRef(primitive.locator)}.clear();`;
    // Assertions (using expect)
    case "expectVisible":
      return `await expect(${getLocatorRef(primitive.locator)}).toBeVisible();`;
    case "expectNotVisible":
      return `await expect(${getLocatorRef(primitive.locator)}).not.toBeVisible();`;
    case "expectText":
      const textPattern = typeof primitive.text === "string" ? `'${escapeString3(primitive.text)}'` : primitive.text.toString();
      return `await expect(${getLocatorRef(primitive.locator)}).toHaveText(${textPattern});`;
    case "expectValue":
      return `await expect(${getLocatorRef(primitive.locator)}).toHaveValue('${escapeString3(primitive.value)}');`;
    case "expectEnabled":
      return `await expect(${getLocatorRef(primitive.locator)}).toBeEnabled();`;
    case "expectDisabled":
      return `await expect(${getLocatorRef(primitive.locator)}).toBeDisabled();`;
    // Blocked - must throw to fail the test
    case "blocked": {
      const parts = primitive.reason.split(" | ");
      const mainReason = parts[0] ?? primitive.reason;
      const reasonDetail = parts.find((p) => p.startsWith("Reason:")) ?? "";
      const suggestion = parts.find((p) => p.startsWith("Suggestion:")) ?? "";
      const lines = [`// TODO: ${mainReason}`];
      if (reasonDetail) lines.push(`    // ${reasonDetail}`);
      if (suggestion) lines.push(`    // ${suggestion}`);
      lines.push(`    throw new Error('ARTK BLOCKED: ${escapeString3(mainReason)}');`);
      return lines.join("\n");
    }
    default:
      return null;
  }
}
function escapeString3(str) {
  return str.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r");
}
function loadDefaultTemplate2() {
  const templatePath = getTemplatePath("module.ejs");
  return readFileSync(templatePath, "utf-8");
}
function generateModule(journey, options = {}) {
  const { templatePath, suffix = "Page" } = options;
  const template = templatePath ? readFileSync(templatePath, "utf-8") : loadDefaultTemplate2();
  const moduleName = toPascalCase(journey.scope);
  const className = `${moduleName}${suffix}`;
  const locators = extractLocators(journey);
  const methods = generateMethods(journey, locators);
  const moduleDef = {
    moduleName,
    className,
    scope: journey.scope,
    locators,
    methods
  };
  const code = ejs.render(template, {
    ...moduleDef,
    version: getPackageVersion(),
    timestamp: getGeneratedTimestamp()
  });
  const filename = `${journey.scope.toLowerCase()}.page.ts`;
  return {
    code,
    moduleName,
    filename,
    locators,
    methods
  };
}
var init_generateModule = __esm({
  "src/codegen/generateModule.ts"() {
    init_priority();
    init_version();
    init_paths();
  }
});
var init_astEdit = __esm({
  "src/codegen/astEdit.ts"() {
  }
});
var init_registry = __esm({
  "src/codegen/registry.ts"() {
  }
});

// src/utils/parsing.ts
function parseIntSafe(value, name, defaultValue) {
  if (value === void 0) {
    return defaultValue;
  }
  const trimmed = value.trim();
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || trimmed === "") {
    console.warn(
      `Warning: Invalid value '${value}' for --${name}, using default: ${defaultValue}`
    );
    return defaultValue;
  }
  if (parsed < 0) {
    console.warn(
      `Warning: Negative value '${value}' for --${name}, using default: ${defaultValue}`
    );
    return defaultValue;
  }
  return parsed;
}
var init_parsing = __esm({
  "src/utils/parsing.ts"() {
  }
});

// src/validate/journey.ts
function validateJourneySchema(frontmatter) {
  const result = JourneyFrontmatterSchema.safeParse(frontmatter);
  const issues = [];
  if (!result.success) {
    for (const error of result.error.errors) {
      issues.push({
        code: "SCHEMA_INVALID",
        message: `${error.path.join(".")}: ${error.message}`,
        severity: "error",
        field: error.path.join(".")
      });
    }
  }
  return { valid: result.success, issues };
}
function validateJourneyStatus(status, options = {}) {
  const { allowDrafts = false } = options;
  const issues = [];
  const validStatuses = ["clarified", "implemented"];
  if (!validStatuses.includes(status)) {
    if (allowDrafts) {
      issues.push({
        code: "STATUS_NOT_READY",
        message: `Journey status is '${status}', ideally should be 'clarified' for code generation`,
        severity: "warning",
        field: "status",
        suggestion: "Run /journey-clarify to add execution details"
      });
    } else {
      issues.push({
        code: "STATUS_NOT_CLARIFIED",
        message: `Journey status is '${status}', must be 'clarified' for code generation`,
        severity: "error",
        field: "status",
        suggestion: "Run /journey-clarify to add execution details"
      });
    }
  }
  if (status === "quarantined") {
    issues.push({
      code: "STATUS_QUARANTINED",
      message: "Journey is quarantined - tests are disabled",
      severity: "warning",
      field: "status"
    });
  }
  if (status === "deprecated") {
    issues.push({
      code: "STATUS_DEPRECATED",
      message: "Journey is deprecated - consider removing",
      severity: "warning",
      field: "status"
    });
  }
  return issues;
}
function validateJourneyTier(tier, options = {}) {
  const { validTiers = ["smoke", "release", "regression"] } = options;
  const issues = [];
  if (!validTiers.includes(tier)) {
    issues.push({
      code: "TIER_INVALID",
      message: `Invalid tier '${tier}', expected one of: ${validTiers.join(", ")}`,
      severity: "error",
      field: "tier"
    });
  }
  return issues;
}
function validateJourneyTags(tags, journeyId, options = {}) {
  const { requiredTags = [] } = options;
  const issues = [];
  const idTag = `@${journeyId}`;
  if (!tags.includes(idTag)) {
    issues.push({
      code: "TAG_MISSING_ID",
      message: `Journey should have ID tag '${idTag}'`,
      severity: "warning",
      field: "tags",
      suggestion: `Add '${idTag}' to tags array`
    });
  }
  for (const requiredTag of requiredTags) {
    if (!tags.includes(requiredTag)) {
      issues.push({
        code: "TAG_MISSING_REQUIRED",
        message: `Missing required tag '${requiredTag}'`,
        severity: "error",
        field: "tags",
        suggestion: `Add '${requiredTag}' to tags array`
      });
    }
  }
  return issues;
}
function validateJourneyFrontmatter(frontmatter, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const issues = [];
  const schemaResult = validateJourneySchema(frontmatter);
  issues.push(...schemaResult.issues);
  issues.push(...validateJourneyStatus(frontmatter.status, opts));
  issues.push(...validateJourneyTier(frontmatter.tier, opts));
  issues.push(...validateJourneyTags(frontmatter.tags || [], frontmatter.id, opts));
  if (!frontmatter.actor) {
    issues.push({
      code: "ACTOR_MISSING",
      message: "Journey should specify an actor (user role)",
      severity: "warning",
      field: "actor"
    });
  }
  if (!frontmatter.scope) {
    issues.push({
      code: "SCOPE_MISSING",
      message: "Journey should specify a scope (feature area)",
      severity: "warning",
      field: "scope"
    });
  }
  const counts = {
    errors: issues.filter((i) => i.severity === "error").length,
    warnings: issues.filter((i) => i.severity === "warning").length,
    info: issues.filter((i) => i.severity === "info").length
  };
  return {
    valid: counts.errors === 0,
    journeyId: frontmatter.id,
    issues,
    counts
  };
}
var DEFAULT_OPTIONS;
var init_journey = __esm({
  "src/validate/journey.ts"() {
    init_parseJourney();
    DEFAULT_OPTIONS = {
      allowDrafts: false,
      requiredTags: [],
      validTiers: ["smoke", "release", "regression"],
      warnEmptyAC: true
    };
  }
});

// src/validate/patterns.ts
function scanForbiddenPatterns(code, patterns = FORBIDDEN_PATTERNS) {
  const results = [];
  const lines = code.split("\n");
  for (const pattern of patterns) {
    pattern.regex.lastIndex = 0;
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      let match;
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      while ((match = regex.exec(line)) !== null) {
        results.push({
          line: lineIndex + 1,
          column: match.index + 1,
          match: match[0],
          lineContent: line.trim(),
          pattern
        });
        if (match.index === regex.lastIndex) {
          regex.lastIndex++;
        }
      }
    }
  }
  results.sort((a, b) => a.line - b.line || a.column - b.column);
  return results;
}
function scanResultsToIssues(results) {
  return results.map((result) => ({
    code: result.pattern.id,
    message: `Line ${result.line}: ${result.pattern.name} - ${result.pattern.reason}`,
    severity: result.pattern.severity,
    suggestion: result.pattern.suggestion
  }));
}
function getPatternStats2(results) {
  const stats = {};
  for (const result of results) {
    stats[result.pattern.id] = (stats[result.pattern.id] || 0) + 1;
  }
  return stats;
}
function filterBySeverity(results, severity) {
  return results.filter((r) => r.pattern.severity === severity);
}
function getViolationSummary(results) {
  return {
    total: results.length,
    errors: filterBySeverity(results, "error").length,
    warnings: filterBySeverity(results, "warning").length,
    info: filterBySeverity(results, "info").length,
    byPattern: getPatternStats2(results)
  };
}
var FORBIDDEN_PATTERNS;
var init_patterns2 = __esm({
  "src/validate/patterns.ts"() {
    FORBIDDEN_PATTERNS = [
      {
        id: "WAIT_TIMEOUT",
        name: "waitForTimeout",
        regex: /\bpage\.waitForTimeout\s*\(\s*\d+\s*\)/g,
        severity: "error",
        reason: "Hard-coded waits cause flakiness and slow down tests",
        suggestion: "Use waitForSelector, waitForLoadState, or assertion auto-wait"
      },
      {
        id: "WAIT_ARBITRARY",
        name: "arbitrary-wait",
        regex: /\bawait\s+new\s+Promise\s*\(\s*(?:resolve|r)\s*=>\s*setTimeout/g,
        severity: "error",
        reason: "Custom setTimeout-based waits cause flakiness",
        suggestion: "Use Playwright auto-wait assertions instead"
      },
      {
        id: "FORCE_CLICK",
        name: "force-click",
        regex: /\.click\s*\([^)]*\{\s*force\s*:\s*true/g,
        severity: "warning",
        reason: "Force clicking bypasses visibility checks and masks issues",
        suggestion: "Ensure element is visible and actionable, or use scrollIntoView"
      },
      {
        id: "FORCE_FILL",
        name: "force-fill",
        regex: /\.fill\s*\(\s*[^,]+,\s*\{\s*force\s*:\s*true/g,
        severity: "warning",
        reason: "Force filling bypasses visibility checks",
        suggestion: "Ensure input is visible and enabled"
      },
      {
        id: "CSS_SELECTOR_CLASS",
        name: "css-class-selector",
        regex: /(?:page|locator)\s*\.\s*(?:locator|querySelector)\s*\(\s*['"][^'"]*\.[a-z][a-z0-9_-]*(?:\s|['">\[])/gi,
        severity: "warning",
        reason: "CSS class selectors are fragile and may change",
        suggestion: "Use role, label, placeholder, text, or testid locators"
      },
      {
        id: "CSS_SELECTOR_TAG",
        name: "css-tag-selector",
        regex: /(?:page|locator)\s*\.\s*locator\s*\(\s*['"](?:div|span|p|h[1-6]|section|header|footer|main|nav|aside|article)(?:\s*>|\s*\[|['"])/gi,
        severity: "warning",
        reason: "Generic tag selectors are too broad and fragile",
        suggestion: "Use more specific selectors like role, label, or testid"
      },
      {
        id: "XPATH_SELECTOR",
        name: "xpath-selector",
        regex: /(?:page|locator)\s*\.\s*locator\s*\(\s*['"]\/\/[^'"]+['"]/g,
        severity: "warning",
        reason: "XPath selectors are verbose and often fragile",
        suggestion: "Use role, label, or testid locators instead"
      },
      {
        id: "NTH_CHILD",
        name: "nth-child-selector",
        regex: /:nth-child\s*\(\s*\d+\s*\)/g,
        severity: "warning",
        reason: "nth-child selectors break when DOM order changes",
        suggestion: "Use unique identifiers like testid or text content"
      },
      {
        id: "INDEX_LOCATOR",
        name: "index-based-locator",
        regex: /\.(?:first|last|nth)\s*\(\s*(?:\d+)?\s*\)/g,
        severity: "info",
        reason: "Index-based locators may break when list order changes",
        suggestion: "Consider filtering by unique content or attributes"
      },
      {
        id: "HARDCODED_URL",
        name: "hardcoded-url",
        regex: /\bpage\.goto\s*\(\s*['"]https?:\/\/[^'"]+['"]/g,
        severity: "warning",
        reason: "Hardcoded URLs make tests environment-specific",
        suggestion: "Use baseURL from config or relative paths"
      },
      {
        id: "HARDCODED_CREDENTIALS",
        name: "hardcoded-credentials",
        regex: /(?:password|secret|apikey|api_key|token)\s*[=:]\s*['"][^'"]+['"]/gi,
        severity: "error",
        reason: "Credentials should not be hardcoded in test files",
        suggestion: "Use environment variables or secure config"
      },
      {
        id: "CONSOLE_LOG",
        name: "console-log",
        regex: /\bconsole\.(log|info|warn|error)\s*\(/g,
        severity: "info",
        reason: "Console statements should be removed from production tests",
        suggestion: "Use test reporter or remove debug statements"
      },
      {
        id: "MISSING_AWAIT",
        name: "missing-await-locator",
        regex: /(?<!await\s+)page\.(?:click|fill|type|check|uncheck|selectOption|press|hover|focus)\s*\(/g,
        severity: "error",
        reason: "Playwright actions must be awaited",
        suggestion: "Add await before the action"
      },
      {
        id: "SKIP_TEST",
        name: "test-skip",
        regex: /\btest\.skip\s*\(/g,
        severity: "info",
        reason: "Skipped tests may be forgotten",
        suggestion: "Remove skip or convert to fixme with issue link"
      },
      {
        id: "TEST_ONLY",
        name: "test-only",
        regex: /\btest\.only\s*\(/g,
        severity: "error",
        reason: "test.only excludes all other tests",
        suggestion: "Remove .only before committing"
      },
      {
        id: "ELEMENT_HANDLE",
        name: "element-handle",
        regex: /\.\$\s*\(|\.\$\$\s*\(/g,
        severity: "warning",
        reason: "ElementHandle is deprecated, use locators instead",
        suggestion: "Use page.locator() instead of page.$() or page.$$()"
      },
      {
        id: "EVAL_SELECTOR",
        name: "eval-selector",
        regex: /\.\$eval\s*\(|\.\$\$eval\s*\(/g,
        severity: "warning",
        reason: "eval methods are fragile and hard to debug",
        suggestion: "Use locator methods like textContent(), getAttribute()"
      },
      {
        id: "SLEEP_IMPORT",
        name: "sleep-import",
        regex: /import\s*\{[^}]*sleep[^}]*\}|require\s*\(['"'][^'"]*sleep/gi,
        severity: "warning",
        reason: "Sleep utilities encourage flaky tests",
        suggestion: "Use Playwright auto-wait mechanisms"
      }
    ];
  }
});
function isESLintAvailable(cwd) {
  const result = spawnSync("npx", ["eslint", "--version"], {
    cwd,
    stdio: "pipe",
    encoding: "utf-8"
  });
  return result.status === 0;
}
function convertSeverity(eslintSeverity) {
  return eslintSeverity === 2 ? "error" : "warning";
}
function parseESLintOutput(output) {
  try {
    const results = JSON.parse(output);
    const issues = [];
    for (const file of results) {
      for (const msg of file.messages) {
        issues.push({
          code: msg.ruleId || "ESLINT_ERROR",
          message: `Line ${msg.line}:${msg.column} - ${msg.message}`,
          severity: convertSeverity(msg.severity),
          suggestion: msg.fix ? "Auto-fixable with --fix" : void 0
        });
      }
    }
    return issues;
  } catch {
    return [
      {
        code: "ESLINT_PARSE_ERROR",
        message: "Failed to parse ESLint output",
        severity: "error"
      }
    ];
  }
}
async function lintCode(code, filename = "test.spec.ts", options = {}) {
  const { cwd = process.cwd(), fix = false, configPath } = options;
  if (!isESLintAvailable(cwd)) {
    return {
      passed: true,
      output: "ESLint not available - skipping lint check",
      issues: [
        {
          code: "ESLINT_NOT_AVAILABLE",
          message: "ESLint is not installed",
          severity: "info",
          suggestion: "Run npm install eslint eslint-plugin-playwright"
        }
      ],
      errorCount: 0,
      warningCount: 0
    };
  }
  const tempDir = join(tmpdir(), "autogen-lint");
  mkdirSync(tempDir, { recursive: true });
  const tempFile = join(tempDir, filename);
  try {
    writeFileSync(tempFile, code, "utf-8");
    const args = ["eslint", "--format", "json"];
    if (fix) {
      args.push("--fix");
    }
    if (configPath && existsSync(configPath)) {
      args.push("--config", configPath);
    }
    args.push(tempFile);
    const result = spawnSync("npx", args, {
      cwd,
      stdio: "pipe",
      encoding: "utf-8"
    });
    const output = result.stdout || "";
    if (result.status === 0) {
      return {
        passed: true,
        output,
        issues: parseESLintOutput(output),
        errorCount: 0,
        warningCount: 0
      };
    }
    try {
      const results = JSON.parse(output);
      const issues = parseESLintOutput(output);
      let errorCount = 0;
      let warningCount = 0;
      for (const file of results) {
        errorCount += file.errorCount;
        warningCount += file.warningCount;
      }
      return {
        passed: errorCount === 0,
        output,
        issues,
        errorCount,
        warningCount
      };
    } catch {
      return {
        passed: false,
        output: output || "ESLint execution failed",
        issues: [
          {
            code: "ESLINT_EXECUTION_ERROR",
            message: "ESLint execution failed",
            severity: "error"
          }
        ],
        errorCount: 1,
        warningCount: 0
      };
    }
  } finally {
    try {
      unlinkSync(tempFile);
    } catch {
    }
  }
}
var init_lint = __esm({
  "src/validate/lint.ts"() {
  }
});

// src/validate/tags.ts
function parseTagsFromCode(code) {
  const tagArrayMatch = code.match(/tag:\s*\[([^\]]*)\]/);
  if (!tagArrayMatch) {
    return [];
  }
  const tagArrayContent = tagArrayMatch[1];
  const tagMatches = tagArrayContent.match(/'[^']+'/g) || [];
  return tagMatches.map((t) => t.replace(/'/g, ""));
}
function categorizeTags(tags) {
  const result = { custom: [] };
  for (const tag of tags) {
    if (TAG_PATTERNS.journeyId.test(tag)) {
      result.journeyId = tag;
    } else if (TAG_PATTERNS.tier.test(tag)) {
      result.tier = tag;
    } else if (TAG_PATTERNS.scope.test(tag)) {
      result.scope = tag;
    } else if (TAG_PATTERNS.actor.test(tag)) {
      result.actor = tag;
    } else if (TAG_PATTERNS.custom.test(tag)) {
      result.custom.push(tag);
    }
  }
  return result;
}
function validateTags(tags, journeyId, tier, scope, options = {}) {
  const opts = { ...DEFAULT_OPTIONS2, ...options };
  const issues = [];
  const parsedTags = categorizeTags(tags);
  if (opts.requireJourneyId) {
    const expectedIdTag = `@${journeyId}`;
    if (!tags.includes(expectedIdTag) && parsedTags.journeyId !== expectedIdTag) {
      issues.push({
        code: "TAG_MISSING_JOURNEY_ID",
        message: `Missing journey ID tag '${expectedIdTag}'`,
        severity: "error",
        field: "tags",
        suggestion: `Add '${expectedIdTag}' to the tags array`
      });
    }
  }
  if (opts.requireTier) {
    const expectedTierTag = `@tier-${tier}`;
    if (!tags.includes(expectedTierTag) && parsedTags.tier !== expectedTierTag) {
      if (!parsedTags.tier) {
        issues.push({
          code: "TAG_MISSING_TIER",
          message: `Missing tier tag, expected '${expectedTierTag}'`,
          severity: "warning",
          field: "tags",
          suggestion: `Add '${expectedTierTag}' to the tags array`
        });
      } else if (parsedTags.tier !== expectedTierTag) {
        issues.push({
          code: "TAG_TIER_MISMATCH",
          message: `Tier tag '${parsedTags.tier}' does not match journey tier '${tier}'`,
          severity: "warning",
          field: "tags",
          suggestion: `Change to '${expectedTierTag}' or update journey tier`
        });
      }
    }
  }
  if (opts.requireScope) {
    const expectedScopeTag = `@scope-${scope}`;
    if (!tags.includes(expectedScopeTag) && parsedTags.scope !== expectedScopeTag) {
      if (!parsedTags.scope) {
        issues.push({
          code: "TAG_MISSING_SCOPE",
          message: `Missing scope tag, expected '${expectedScopeTag}'`,
          severity: "warning",
          field: "tags",
          suggestion: `Add '${expectedScopeTag}' to the tags array`
        });
      } else if (parsedTags.scope !== expectedScopeTag) {
        issues.push({
          code: "TAG_SCOPE_MISMATCH",
          message: `Scope tag '${parsedTags.scope}' does not match journey scope '${scope}'`,
          severity: "warning",
          field: "tags",
          suggestion: `Change to '${expectedScopeTag}' or update journey scope`
        });
      }
    }
  }
  for (const requiredTag of opts.requiredTags || []) {
    if (!tags.includes(requiredTag)) {
      issues.push({
        code: "TAG_MISSING_REQUIRED",
        message: `Missing required tag '${requiredTag}'`,
        severity: "error",
        field: "tags",
        suggestion: `Add '${requiredTag}' to the tags array`
      });
    }
  }
  for (const forbiddenTag of opts.forbiddenTags || []) {
    if (tags.includes(forbiddenTag)) {
      issues.push({
        code: "TAG_FORBIDDEN",
        message: `Forbidden tag '${forbiddenTag}' should not be used`,
        severity: "error",
        field: "tags",
        suggestion: `Remove '${forbiddenTag}' from the tags array`
      });
    }
  }
  if (opts.maxTags && tags.length > opts.maxTags) {
    issues.push({
      code: "TAG_TOO_MANY",
      message: `Too many tags (${tags.length}), maximum is ${opts.maxTags}`,
      severity: "warning",
      field: "tags",
      suggestion: "Remove unnecessary tags"
    });
  }
  for (const tag of tags) {
    if (!TAG_PATTERNS.custom.test(tag)) {
      issues.push({
        code: "TAG_INVALID_FORMAT",
        message: `Invalid tag format '${tag}', tags should start with @ followed by lowercase letters`,
        severity: "warning",
        field: "tags",
        suggestion: `Rename to a valid format like '@${tag.replace(/[^a-z0-9-]/gi, "-").toLowerCase()}'`
      });
    }
  }
  const duplicates = tags.filter((tag, index) => tags.indexOf(tag) !== index);
  for (const duplicate of new Set(duplicates)) {
    issues.push({
      code: "TAG_DUPLICATE",
      message: `Duplicate tag '${duplicate}'`,
      severity: "warning",
      field: "tags",
      suggestion: "Remove duplicate tags"
    });
  }
  return {
    valid: issues.filter((i) => i.severity === "error").length === 0,
    issues,
    parsedTags
  };
}
function validateTagsInCode(code, journeyId, tier, scope, options = {}) {
  const tags = parseTagsFromCode(code);
  return validateTags(tags, journeyId, tier, scope, options);
}
var TAG_PATTERNS, DEFAULT_OPTIONS2;
var init_tags = __esm({
  "src/validate/tags.ts"() {
    TAG_PATTERNS = {
      journeyId: /^@JRN-\d{4}$/,
      tier: /^@tier-(smoke|release|regression)$/,
      scope: /^@scope-[a-z][a-z0-9-]*$/,
      actor: /^@actor-[a-z][a-z0-9-]*$/,
      custom: /^@[a-z][a-z0-9-]*$/
    };
    DEFAULT_OPTIONS2 = {
      requireJourneyId: true,
      requireTier: true,
      requireScope: true,
      requireActor: false,
      requiredTags: [],
      forbiddenTags: [],
      maxTags: 10
    };
  }
});

// src/validate/coverage.ts
function calculateStepCoverage(step) {
  const totalSteps = step.actions.length + step.assertions.length;
  const blockedSteps = step.actions.filter((a) => a.type === "blocked").length;
  const mappedSteps = totalSteps - blockedSteps;
  const unmappedSteps = [];
  for (const action of step.actions) {
    if (action.type === "blocked" && action.sourceText) {
      unmappedSteps.push(action.sourceText);
    }
  }
  return {
    acId: step.id,
    acTitle: step.description,
    hasCoverage: mappedSteps > 0,
    mappedSteps,
    blockedSteps,
    coveragePercent: totalSteps > 0 ? mappedSteps / totalSteps * 100 : 100,
    unmappedSteps
  };
}
function validateIRCoverage(journey, options = {}) {
  const opts = { ...DEFAULT_OPTIONS3, ...options };
  const issues = [];
  const perAC = [];
  for (const step of journey.steps) {
    const coverage = calculateStepCoverage(step);
    perAC.push(coverage);
    if (!coverage.hasCoverage) {
      issues.push({
        code: "AC_NO_COVERAGE",
        message: `${step.id} has no mapped test steps`,
        severity: "error",
        field: step.id,
        suggestion: "Clarify the AC steps or add supported patterns"
      });
    } else if (coverage.coveragePercent < (opts.minCoverage || 80)) {
      if (opts.warnPartialCoverage) {
        issues.push({
          code: "AC_PARTIAL_COVERAGE",
          message: `${step.id} has only ${Math.round(coverage.coveragePercent)}% coverage (${coverage.mappedSteps}/${coverage.mappedSteps + coverage.blockedSteps} steps)`,
          severity: "warning",
          field: step.id,
          suggestion: `Unmapped steps: ${coverage.unmappedSteps.join(", ")}`
        });
      }
    }
    if (opts.maxBlockedSteps && coverage.blockedSteps > opts.maxBlockedSteps) {
      issues.push({
        code: "AC_TOO_MANY_BLOCKED",
        message: `${step.id} has ${coverage.blockedSteps} blocked steps (max: ${opts.maxBlockedSteps})`,
        severity: "warning",
        field: step.id,
        suggestion: "Consider clarifying these steps or marking the journey as needing manual implementation"
      });
    }
  }
  const totalACs = perAC.length;
  const coveredACs = perAC.filter((ac) => ac.hasCoverage).length;
  const overallCoverage = totalACs > 0 ? coveredACs / totalACs * 100 : 100;
  if (totalACs > 0 && overallCoverage < (opts.minCoverage || 80)) {
    issues.push({
      code: "JOURNEY_LOW_COVERAGE",
      message: `Journey has only ${Math.round(overallCoverage)}% AC coverage (${coveredACs}/${totalACs} ACs)`,
      severity: overallCoverage < 50 ? "error" : "warning",
      suggestion: "Review and clarify uncovered acceptance criteria"
    });
  }
  return {
    fullCoverage: coveredACs === totalACs && issues.filter((i) => i.severity === "error").length === 0,
    totalACs,
    coveredACs,
    overallCoverage,
    perAC,
    issues
  };
}
var DEFAULT_OPTIONS3;
var init_coverage = __esm({
  "src/validate/coverage.ts"() {
    DEFAULT_OPTIONS3 = {
      minCoverage: 80,
      warnPartialCoverage: true,
      maxBlockedSteps: 2
    };
  }
});

// src/validate/code.ts
async function validateCode(code, journey, frontmatter, options = {}) {
  const opts = { ...DEFAULT_OPTIONS4, ...options };
  const allIssues = [];
  const details = {
    patterns: { valid: true, violationCount: 0 }
  };
  if (opts.validateFrontmatter && frontmatter) {
    const frontmatterResult = validateJourneyFrontmatter(frontmatter, {
      allowDrafts: opts.allowDrafts
    });
    details.frontmatter = frontmatterResult;
    allIssues.push(...frontmatterResult.issues);
  }
  const patternResults = scanForbiddenPatterns(code);
  const patternIssues = scanResultsToIssues(patternResults);
  allIssues.push(...patternIssues);
  const patternSummary = getViolationSummary(patternResults);
  details.patterns = {
    valid: patternSummary.errors === 0,
    violationCount: patternSummary.total
  };
  if (opts.runLint) {
    const lintResult = await lintCode(code, `${journey.id.toLowerCase()}.spec.ts`);
    details.lint = lintResult;
    allIssues.push(...lintResult.issues);
  }
  if (opts.validateTags) {
    const tagResult = validateTagsInCode(code, journey.id, journey.tier, journey.scope);
    details.tags = tagResult;
    allIssues.push(...tagResult.issues);
  }
  if (opts.validateCoverage) {
    const coverageResult = validateIRCoverage(journey, {
      minCoverage: opts.minCoverage,
      warnPartialCoverage: true
    });
    details.coverage = coverageResult;
    allIssues.push(...coverageResult.issues);
  }
  const counts = {
    errors: allIssues.filter((i) => i.severity === "error").length,
    warnings: allIssues.filter((i) => i.severity === "warning").length,
    info: allIssues.filter((i) => i.severity === "info").length
  };
  return {
    valid: counts.errors === 0,
    journeyId: journey.id,
    issues: allIssues,
    counts,
    details,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function validateCodeSync(code, journey, frontmatter, options = {}) {
  const opts = { ...DEFAULT_OPTIONS4, ...options};
  const allIssues = [];
  const details = {
    patterns: { valid: true, violationCount: 0 }
  };
  if (opts.validateFrontmatter && frontmatter) {
    const frontmatterResult = validateJourneyFrontmatter(frontmatter, {
      allowDrafts: opts.allowDrafts
    });
    details.frontmatter = frontmatterResult;
    allIssues.push(...frontmatterResult.issues);
  }
  const patternResults = scanForbiddenPatterns(code);
  const patternIssues = scanResultsToIssues(patternResults);
  allIssues.push(...patternIssues);
  const patternSummary = getViolationSummary(patternResults);
  details.patterns = {
    valid: patternSummary.errors === 0,
    violationCount: patternSummary.total
  };
  if (opts.validateTags) {
    const tagResult = validateTagsInCode(code, journey.id, journey.tier, journey.scope);
    details.tags = tagResult;
    allIssues.push(...tagResult.issues);
  }
  if (opts.validateCoverage) {
    const coverageResult = validateIRCoverage(journey, {
      minCoverage: opts.minCoverage,
      warnPartialCoverage: true
    });
    details.coverage = coverageResult;
    allIssues.push(...coverageResult.issues);
  }
  const counts = {
    errors: allIssues.filter((i) => i.severity === "error").length,
    warnings: allIssues.filter((i) => i.severity === "warning").length,
    info: allIssues.filter((i) => i.severity === "info").length
  };
  return {
    valid: counts.errors === 0,
    journeyId: journey.id,
    issues: allIssues,
    counts,
    details,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
}
var DEFAULT_OPTIONS4;
var init_code = __esm({
  "src/validate/code.ts"() {
    init_journey();
    init_patterns2();
    init_lint();
    init_tags();
    init_coverage();
    DEFAULT_OPTIONS4 = {
      runLint: false,
      // ESLint requires setup, disabled by default
      validateTags: true,
      validateCoverage: true,
      validateFrontmatter: true,
      minCoverage: 80,
      allowDrafts: false
    };
  }
});

// src/validate/index.ts
var init_validate = __esm({
  "src/validate/index.ts"() {
    init_journey();
    init_patterns2();
    init_lint();
    init_tags();
    init_coverage();
    init_code();
  }
});
function isPlaywrightAvailable(cwd) {
  try {
    execSync("npx playwright --version", {
      cwd,
      stdio: "pipe",
      encoding: "utf-8"
    });
    return true;
  } catch {
    return false;
  }
}
function buildPlaywrightArgs(options) {
  const args = ["test"];
  if (options.testFile) {
    args.push(options.testFile);
  }
  if (options.grep) {
    args.push("--grep", options.grep);
  }
  if (options.project) {
    args.push("--project", options.project);
  }
  if (options.workers !== void 0) {
    args.push("--workers", String(options.workers));
  }
  if (options.retries !== void 0) {
    args.push("--retries", String(options.retries));
  }
  if (options.repeatEach !== void 0) {
    args.push("--repeat-each", String(options.repeatEach));
  }
  if (options.failOnFlaky) {
    args.push("--fail-on-flaky-tests");
  }
  if (options.timeout !== void 0) {
    args.push("--timeout", String(options.timeout));
  }
  if (options.reporter) {
    args.push("--reporter", options.reporter);
  }
  if (options.outputDir) {
    args.push("--output", options.outputDir);
  }
  if (options.headed) {
    args.push("--headed");
  }
  if (options.debug) {
    args.push("--debug");
  }
  if (options.updateSnapshots) {
    args.push("--update-snapshots");
  }
  return args;
}
function runPlaywrightSync(options = {}) {
  const { cwd = process.cwd(), env = {} } = options;
  if (!isPlaywrightAvailable(cwd)) {
    return {
      success: false,
      exitCode: 1,
      stdout: "",
      stderr: "Playwright is not installed",
      duration: 0,
      command: "npx playwright test"
    };
  }
  const tempDir = mkdtempSync(join(tmpdir(), "autogen-verify-"));
  const reportPath = join(tempDir, "results.json");
  const args = buildPlaywrightArgs({
    ...options,
    reporter: `json,line`
  });
  const command = `npx playwright ${args.join(" ")}`;
  const startTime = Date.now();
  try {
    const result = spawnSync("npx", ["playwright", ...args], {
      cwd,
      stdio: "pipe",
      encoding: "utf-8",
      env: {
        ...process.env,
        ...env,
        PLAYWRIGHT_JSON_OUTPUT_NAME: reportPath
      },
      timeout: options.timeout ? options.timeout * 10 : 6e5
      // 10x test timeout or 10 min
    });
    const success = result.status === 0;
    return {
      success,
      exitCode: result.status ?? 1,
      stdout: result.stdout || "",
      stderr: result.stderr || "",
      reportPath: existsSync(reportPath) ? reportPath : void 0,
      duration: Date.now() - startTime,
      command
    };
  } finally {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
    }
  }
}
var init_runner = __esm({
  "src/verify/runner.ts"() {
  }
});
function parseReportFile(filePath) {
  if (!existsSync(filePath)) {
    return null;
  }
  try {
    const content = readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}
function extractTestResults(report) {
  const results = [];
  function extractFromSuite(suite, titlePath = []) {
    const currentPath = [...titlePath, suite.title].filter(Boolean);
    for (const spec of suite.specs) {
      for (const test of spec.tests) {
        for (const result of test.results) {
          results.push({
            ...result,
            titlePath: [...currentPath, spec.title]
          });
        }
      }
    }
    for (const childSuite of suite.suites) {
      extractFromSuite(childSuite, currentPath);
    }
  }
  for (const suite of report.suites) {
    extractFromSuite(suite);
  }
  return results;
}
function getSummary(report) {
  const allResults = extractTestResults(report);
  const failedTests = allResults.filter((r) => r.status === "failed");
  const passedTests = allResults.filter((r) => r.status === "passed");
  const skippedTests = allResults.filter((r) => r.status === "skipped");
  const flakyTests = allResults.filter((r) => r.status === "passed" && r.retry > 0);
  const files = [...new Set(allResults.map((r) => r.location.file))];
  return {
    total: allResults.length,
    passed: passedTests.length,
    failed: failedTests.length,
    skipped: skippedTests.length,
    flaky: flakyTests.length,
    duration: report.stats.duration,
    startTime: new Date(report.stats.startTime),
    files,
    failedTests,
    flakyTests
  };
}
function getFailedTests(report) {
  return extractTestResults(report).filter((r) => r.status === "failed");
}
var init_parser = __esm({
  "src/verify/parser.ts"() {
  }
});

// src/verify/classifier.ts
function classifyError(error) {
  const errorText = `${error.message} ${error.stack || ""}`;
  const matchedKeywords = [];
  let bestMatch = null;
  let maxMatches = 0;
  for (const pattern of CLASSIFICATION_PATTERNS) {
    let matches = 0;
    const patternMatches = [];
    for (const keyword of pattern.keywords) {
      if (keyword.test(errorText)) {
        matches++;
        patternMatches.push(keyword.source);
      }
    }
    if (matches > maxMatches) {
      maxMatches = matches;
      bestMatch = pattern;
      matchedKeywords.length = 0;
      matchedKeywords.push(...patternMatches);
    }
  }
  if (bestMatch && maxMatches > 0) {
    return {
      category: bestMatch.category,
      confidence: Math.min(maxMatches / 3, 1),
      // Normalize to 0-1
      explanation: bestMatch.explanation,
      suggestion: bestMatch.suggestion,
      isTestIssue: bestMatch.isTestIssue,
      matchedKeywords
    };
  }
  return {
    category: "unknown",
    confidence: 0,
    explanation: "Unable to classify failure",
    suggestion: "Review error details manually",
    isTestIssue: false,
    matchedKeywords: []
  };
}
function classifyTestResult(result) {
  if (result.status !== "failed" || result.errors.length === 0) {
    return {
      category: "unknown",
      confidence: 0,
      explanation: "Test did not fail or has no errors",
      suggestion: "N/A",
      isTestIssue: false,
      matchedKeywords: []
    };
  }
  const classifications = result.errors.map(classifyError);
  const best = classifications.reduce(
    (prev, curr) => curr.confidence > prev.confidence ? curr : prev
  );
  return best;
}
function classifyTestResults(results) {
  const classified = /* @__PURE__ */ new Map();
  for (const result of results) {
    if (result.status === "failed") {
      const key = result.titlePath.join(" > ");
      classified.set(key, classifyTestResult(result));
    }
  }
  return classified;
}
function getFailureStats(classifications) {
  const stats = {
    selector: 0,
    timing: 0,
    navigation: 0,
    data: 0,
    auth: 0,
    env: 0,
    script: 0,
    unknown: 0
  };
  for (const classification of classifications.values()) {
    stats[classification.category]++;
  }
  return stats;
}
var CLASSIFICATION_PATTERNS;
var init_classifier = __esm({
  "src/verify/classifier.ts"() {
    CLASSIFICATION_PATTERNS = [
      // Selector issues
      {
        category: "selector",
        keywords: [
          /locator\s+resolved\s+to\s+\d+\s+elements/i,
          /locator\.click:\s+Error/i,
          /waiting\s+for\s+locator/i,
          /element\s+is\s+not\s+visible/i,
          /element\s+is\s+not\s+attached/i,
          /element\s+is\s+not\s+enabled/i,
          /getBy\w+\s*\([^)]+\)/i,
          /strict\s+mode\s+violation/i,
          /No\s+element\s+matches\s+selector/i,
          /Target\s+closed/i,
          /element\s+is\s+outside\s+of\s+the\s+viewport/i
        ],
        explanation: "Element locator failed to find or interact with element",
        suggestion: "Update selector to use more stable locator strategy (role, label, testid)",
        isTestIssue: true
      },
      // Timing issues
      {
        category: "timing",
        keywords: [
          /timeout\s+\d+ms\s+exceeded/i,
          /exceeded\s+while\s+waiting/i,
          /timed?\s*out/i,
          /waiting\s+for\s+navigation/i,
          /waiting\s+for\s+load\s+state/i,
          /response\s+took\s+too\s+long/i,
          /expect\.\w+:\s+Timeout/i,
          /navigation\s+was\s+interrupted/i
        ],
        explanation: "Operation timed out waiting for element or network",
        suggestion: "Increase timeout or add explicit wait for expected state",
        isTestIssue: true
      },
      // Navigation issues
      {
        category: "navigation",
        keywords: [
          /expected\s+url.*to.*match/i,
          /expected.*toHaveURL/i,
          /page\s+has\s+been\s+closed/i,
          /navigation\s+failed/i,
          /net::ERR_/i,
          /ERR_CONNECTION/i,
          /ERR_NAME_NOT_RESOLVED/i,
          /redirect/i,
          /page\.goto:\s+Error/i,
          /URL\s+is\s+not\s+valid/i
        ],
        explanation: "Navigation to URL failed or URL mismatch",
        suggestion: "Check URL configuration and network connectivity",
        isTestIssue: false
      },
      // Data/assertion issues
      {
        category: "data",
        keywords: [
          /expected.*to\s+(?:be|equal|match|contain|have)/i,
          /received.*but\s+expected/i,
          /toEqual/i,
          /toBe\(/i,
          /toContain/i,
          /toHaveText/i,
          /toHaveValue/i,
          /assertion\s+failed/i,
          /expected\s+value/i,
          /does\s+not\s+match/i
        ],
        explanation: "Assertion failed due to unexpected data",
        suggestion: "Verify test data matches expected application state",
        isTestIssue: false
      },
      // Auth issues
      {
        category: "auth",
        keywords: [
          /401\s+Unauthorized/i,
          /403\s+Forbidden/i,
          /authentication\s+failed/i,
          /login\s+failed/i,
          /session\s+expired/i,
          /token\s+invalid/i,
          /access\s+denied/i,
          /not\s+authenticated/i,
          /sign\s*in\s+required/i,
          /invalid\s+credentials/i
        ],
        explanation: "Authentication or authorization failed",
        suggestion: "Check authentication state and credentials",
        isTestIssue: false
      },
      // Environment issues
      {
        category: "env",
        keywords: [
          /ECONNREFUSED/i,
          /ENOTFOUND/i,
          /ETIMEDOUT/i,
          /connection\s+refused/i,
          /network\s+error/i,
          /502\s+Bad\s+Gateway/i,
          /503\s+Service\s+Unavailable/i,
          /504\s+Gateway\s+Timeout/i,
          /server\s+error/i,
          /browser\s+has\s+been\s+closed/i,
          /browser\s+crash/i,
          /context\s+closed/i
        ],
        explanation: "Environment or infrastructure issue",
        suggestion: "Check application availability and environment configuration",
        isTestIssue: false
      },
      // Script errors
      {
        category: "script",
        keywords: [
          /SyntaxError/i,
          /TypeError/i,
          /ReferenceError/i,
          /undefined\s+is\s+not/i,
          /is\s+not\s+a\s+function/i,
          /Cannot\s+read\s+propert/i,
          /null\s+is\s+not/i,
          /is\s+not\s+defined/i,
          /Unexpected\s+token/i
        ],
        explanation: "Test script has a code error",
        suggestion: "Fix the JavaScript/TypeScript error in the test",
        isTestIssue: true
      }
    ];
  }
});

// src/verify/stability.ts
var init_stability = __esm({
  "src/verify/stability.ts"() {
    init_runner();
    init_parser();
  }
});
var init_evidence = __esm({
  "src/verify/evidence.ts"() {
  }
});
function generateVerifySummary(runnerResult, options = {}) {
  const summary = {
    status: "error",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    duration: runnerResult.duration,
    counts: {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      flaky: 0
    },
    failures: {
      tests: [],
      classifications: {},
      stats: {}
    },
    runner: {
      exitCode: runnerResult.exitCode,
      command: runnerResult.command
    },
    reportPath: runnerResult.reportPath
  };
  if (options.journeyId) {
    summary.journeyId = options.journeyId;
  }
  if (options.metadata) {
    summary.metadata = options.metadata;
  }
  if (runnerResult.reportPath) {
    const report = parseReportFile(runnerResult.reportPath);
    if (report) {
      const parsed = getSummary(report);
      summary.counts = {
        total: parsed.total,
        passed: parsed.passed,
        failed: parsed.failed,
        skipped: parsed.skipped,
        flaky: parsed.flaky
      };
      const failedTests = getFailedTests(report);
      summary.failures.tests = failedTests.map((t) => t.titlePath.join(" > "));
      const classifications = classifyTestResults(failedTests);
      summary.failures.classifications = Object.fromEntries(classifications);
      summary.failures.stats = getFailureStats(classifications);
      if (parsed.failed === 0) {
        summary.status = parsed.flaky > 0 ? "flaky" : "passed";
      } else {
        summary.status = "failed";
      }
    }
  } else {
    summary.status = runnerResult.success ? "passed" : "failed";
  }
  if (options.stabilityResult) {
    summary.stability = {
      stable: options.stabilityResult.stable,
      flakyTests: options.stabilityResult.flakyTests,
      flakyRate: options.stabilityResult.flakyRate
    };
    if (!options.stabilityResult.stable && summary.status === "passed") {
      summary.status = "flaky";
    }
  }
  return summary;
}
var init_summary = __esm({
  "src/verify/summary.ts"() {
    init_parser();
    init_classifier();
  }
});

// src/verify/index.ts
var init_verify = __esm({
  "src/verify/index.ts"() {
    init_runner();
    init_parser();
    init_classifier();
    init_stability();
    init_evidence();
    init_summary();
  }
});

// src/heal/rules.ts
function isCategoryHealable(category) {
  return !UNHEALABLE_CATEGORIES.includes(category);
}
function getApplicableRules(classification, config = DEFAULT_HEALING_CONFIG) {
  if (!config.enabled) {
    return [];
  }
  if (!isCategoryHealable(classification.category)) {
    return [];
  }
  return DEFAULT_HEALING_RULES.filter((rule) => {
    if (!rule.appliesTo.includes(classification.category)) {
      return false;
    }
    if (!config.allowedFixes.includes(rule.fixType)) {
      return false;
    }
    return true;
  }).sort((a, b) => a.priority - b.priority);
}
function evaluateHealing(classification, config = DEFAULT_HEALING_CONFIG) {
  if (!config.enabled) {
    return {
      canHeal: false,
      applicableFixes: [],
      reason: "Healing is disabled"
    };
  }
  if (!isCategoryHealable(classification.category)) {
    return {
      canHeal: false,
      applicableFixes: [],
      reason: `Category '${classification.category}' cannot be healed automatically`
    };
  }
  const applicableRules = getApplicableRules(classification, config);
  if (applicableRules.length === 0) {
    return {
      canHeal: false,
      applicableFixes: [],
      reason: "No applicable healing rules for this failure"
    };
  }
  return {
    canHeal: true,
    applicableFixes: applicableRules.map((r) => r.fixType)
  };
}
function getNextFix(classification, attemptedFixes, config = DEFAULT_HEALING_CONFIG) {
  const evaluation = evaluateHealing(classification, config);
  if (!evaluation.canHeal) {
    return null;
  }
  for (const fix of evaluation.applicableFixes) {
    if (!attemptedFixes.includes(fix)) {
      return fix;
    }
  }
  return null;
}
function isFixAllowed(fixType, config = DEFAULT_HEALING_CONFIG) {
  return config.enabled && config.allowedFixes.includes(fixType);
}
function isFixForbidden(fixType) {
  const forbidden = [
    "add-sleep",
    "remove-assertion",
    "weaken-assertion",
    "force-click",
    "bypass-auth"
  ];
  return forbidden.includes(fixType);
}
function getHealingRecommendation(classification) {
  switch (classification.category) {
    case "selector":
      return "Refine selector to use role, label, or testid locator strategy";
    case "timing":
      return "Add explicit wait for expected state or use web-first assertion";
    case "navigation":
      return "Add waitForURL or toHaveURL assertion after navigation";
    case "data":
      return "Verify test data and consider using expect.poll for dynamic values";
    case "auth":
      return "Check authentication state; may need to refresh session";
    case "env":
      return "Verify environment connectivity and application availability";
    case "script":
      return "Fix the JavaScript/TypeScript error in the test code";
    default:
      return "Review error details manually to determine appropriate fix";
  }
}
function getPostHealingRecommendation(classification, attemptCount) {
  const baseMsg = `Healing exhausted after ${attemptCount} attempts.`;
  switch (classification.category) {
    case "selector":
      return `${baseMsg} Consider adding data-testid to the target element or quarantining the test.`;
    case "timing":
      return `${baseMsg} The application may have a genuine performance issue. Consider quarantining.`;
    case "navigation":
      return `${baseMsg} The navigation flow may have changed. Review Journey steps.`;
    default:
      return `${baseMsg} Consider quarantining the test and filing a bug report.`;
  }
}
var DEFAULT_HEALING_RULES, DEFAULT_HEALING_CONFIG, UNHEALABLE_CATEGORIES;
var init_rules = __esm({
  "src/heal/rules.ts"() {
    DEFAULT_HEALING_RULES = [
      {
        fixType: "missing-await",
        appliesTo: ["selector", "timing", "script"],
        priority: 1,
        description: "Add missing await to async operations",
        enabledByDefault: true
      },
      {
        fixType: "selector-refine",
        appliesTo: ["selector"],
        priority: 2,
        description: "Replace CSS selector with role/label/testid",
        enabledByDefault: true
      },
      {
        fixType: "add-exact",
        appliesTo: ["selector"],
        priority: 3,
        description: "Add exact: true to resolve ambiguous locators",
        enabledByDefault: true
      },
      {
        fixType: "navigation-wait",
        appliesTo: ["navigation", "timing"],
        priority: 4,
        description: "Add waitForURL or toHaveURL assertion",
        enabledByDefault: true
      },
      {
        fixType: "web-first-assertion",
        appliesTo: ["timing", "data"],
        priority: 5,
        description: "Convert to auto-retrying web-first assertion",
        enabledByDefault: true
      },
      {
        fixType: "timeout-increase",
        appliesTo: ["timing"],
        priority: 6,
        description: "Increase operation timeout (bounded)",
        enabledByDefault: false
        // Disabled by default as it can mask real issues
      }
    ];
    DEFAULT_HEALING_CONFIG = {
      enabled: true,
      maxAttempts: 3,
      allowedFixes: [
        "selector-refine",
        "add-exact",
        "missing-await",
        "navigation-wait",
        "web-first-assertion"
      ],
      forbiddenFixes: [
        "add-sleep",
        "remove-assertion",
        "weaken-assertion",
        "force-click",
        "bypass-auth"
      ],
      maxTimeoutIncrease: 3e4
      // Max 30 seconds
    };
    UNHEALABLE_CATEGORIES = [
      "auth",
      // Requires credential/session fix
      "env",
      // Requires environment fix
      "unknown"
      // Cannot determine appropriate fix
    ];
  }
});
function loadHealingLog(filePath) {
  if (!existsSync(filePath)) {
    return null;
  }
  try {
    const content = readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}
function formatHealingLog(log) {
  const lines = [];
  lines.push(`# Healing Log: ${log.journeyId}`);
  lines.push("");
  lines.push(`Status: ${log.status.toUpperCase()}`);
  lines.push(`Started: ${log.sessionStart}`);
  if (log.sessionEnd) {
    lines.push(`Ended: ${log.sessionEnd}`);
  }
  lines.push("");
  lines.push("## Attempts");
  lines.push("");
  for (const attempt of log.attempts) {
    const icon = attempt.result === "pass" ? "\u2705" : "\u274C";
    lines.push(`### Attempt ${attempt.attempt} ${icon}`);
    lines.push("");
    lines.push(`- **Fix Type**: ${attempt.fixType}`);
    lines.push(`- **Failure Type**: ${attempt.failureType}`);
    lines.push(`- **File**: ${attempt.file}`);
    lines.push(`- **Duration**: ${attempt.duration}ms`);
    lines.push(`- **Result**: ${attempt.result}`);
    if (attempt.errorMessage) {
      lines.push(`- **Error**: ${attempt.errorMessage}`);
    }
    if (attempt.change) {
      lines.push(`- **Change**: ${attempt.change}`);
    }
    if (attempt.evidence.length > 0) {
      lines.push(`- **Evidence**: ${attempt.evidence.join(", ")}`);
    }
    lines.push("");
  }
  if (log.summary) {
    lines.push("## Summary");
    lines.push("");
    lines.push(`- Total Attempts: ${log.summary.totalAttempts}`);
    lines.push(`- Successful Fixes: ${log.summary.successfulFixes}`);
    lines.push(`- Failed Attempts: ${log.summary.failedAttempts}`);
    lines.push(`- Total Duration: ${log.summary.totalDuration}ms`);
    lines.push(`- Fix Types Tried: ${log.summary.fixTypesAttempted.join(", ")}`);
    if (log.summary.recommendation) {
      lines.push("");
      lines.push(`**Recommendation**: ${log.summary.recommendation}`);
    }
  }
  return lines.join("\n");
}
function createHealingReport(log) {
  const lastSuccessfulAttempt = log.attempts.find((a) => a.result === "pass");
  return {
    success: log.status === "healed",
    attemptCount: log.attempts.length,
    fixApplied: lastSuccessfulAttempt?.fixType,
    recommendation: log.summary?.recommendation
  };
}
function aggregateHealingLogs(logs) {
  const fixCounts = /* @__PURE__ */ new Map();
  const failureCounts = /* @__PURE__ */ new Map();
  let totalAttempts = 0;
  for (const log of logs) {
    for (const attempt of log.attempts) {
      totalAttempts++;
      fixCounts.set(attempt.fixType, (fixCounts.get(attempt.fixType) || 0) + 1);
      failureCounts.set(attempt.failureType, (failureCounts.get(attempt.failureType) || 0) + 1);
    }
  }
  const mostCommonFixes = [...fixCounts.entries()].sort((a, b) => b[1] - a[1]).map(([fix, count]) => ({ fix, count }));
  const mostCommonFailures = [...failureCounts.entries()].sort((a, b) => b[1] - a[1]).map(([failure, count]) => ({ failure, count }));
  return {
    totalJourneys: logs.length,
    healed: logs.filter((l) => l.status === "healed").length,
    failed: logs.filter((l) => l.status === "failed").length,
    exhausted: logs.filter((l) => l.status === "exhausted").length,
    totalAttempts,
    mostCommonFixes,
    mostCommonFailures
  };
}
var HealingLogger;
var init_logger = __esm({
  "src/heal/logger.ts"() {
    HealingLogger = class {
      log;
      outputPath;
      constructor(journeyId, outputDir, maxAttempts = 3) {
        this.outputPath = join(outputDir, `${journeyId}.heal-log.json`);
        this.log = {
          journeyId,
          sessionStart: (/* @__PURE__ */ new Date()).toISOString(),
          maxAttempts,
          status: "in_progress",
          attempts: []
        };
      }
      /**
       * Log a healing attempt
       */
      logAttempt(attempt) {
        this.log.attempts.push({
          ...attempt,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
        this.save();
      }
      /**
       * Mark healing as complete (success)
       */
      markHealed() {
        this.log.status = "healed";
        this.log.sessionEnd = (/* @__PURE__ */ new Date()).toISOString();
        this.calculateSummary();
        this.save();
      }
      /**
       * Mark healing as failed (gave up)
       */
      markFailed(recommendation) {
        this.log.status = "failed";
        this.log.sessionEnd = (/* @__PURE__ */ new Date()).toISOString();
        this.calculateSummary();
        if (recommendation && this.log.summary) {
          this.log.summary.recommendation = recommendation;
        }
        this.save();
      }
      /**
       * Mark healing as exhausted (all attempts used)
       */
      markExhausted(recommendation) {
        this.log.status = "exhausted";
        this.log.sessionEnd = (/* @__PURE__ */ new Date()).toISOString();
        this.calculateSummary();
        if (recommendation && this.log.summary) {
          this.log.summary.recommendation = recommendation;
        }
        this.save();
      }
      /**
       * Get current log
       */
      getLog() {
        return { ...this.log };
      }
      /**
       * Get last attempt
       */
      getLastAttempt() {
        return this.log.attempts[this.log.attempts.length - 1] || null;
      }
      /**
       * Get attempt count
       */
      getAttemptCount() {
        return this.log.attempts.length;
      }
      /**
       * Check if max attempts reached
       */
      isMaxAttemptsReached() {
        return this.log.attempts.length >= this.log.maxAttempts;
      }
      /**
       * Calculate summary statistics
       */
      calculateSummary() {
        const attempts = this.log.attempts;
        this.log.summary = {
          totalAttempts: attempts.length,
          successfulFixes: attempts.filter((a) => a.result === "pass").length,
          failedAttempts: attempts.filter((a) => a.result === "fail" || a.result === "error").length,
          totalDuration: attempts.reduce((sum, a) => sum + a.duration, 0),
          fixTypesAttempted: [...new Set(attempts.map((a) => a.fixType))]
        };
      }
      /**
       * Save log to file
       */
      save() {
        const dir = dirname(this.outputPath);
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }
        writeFileSync(this.outputPath, JSON.stringify(this.log, null, 2), "utf-8");
      }
      /**
       * Get output path
       */
      getOutputPath() {
        return this.outputPath;
      }
    };
  }
});

// src/heal/fixes/selector.ts
function extractCSSSelector(code) {
  for (const pattern of CSS_SELECTOR_PATTERNS) {
    pattern.lastIndex = 0;
    const match = pattern.exec(code);
    if (match) {
      return match[1] ?? null;
    }
  }
  return null;
}
function containsCSSSelector(code) {
  return CSS_SELECTOR_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(code);
  });
}
function inferRoleFromSelector(selector) {
  const lowerSelector = selector.toLowerCase();
  for (const [pattern, roleInfo] of Object.entries(UI_PATTERN_TO_ROLE)) {
    if (lowerSelector.includes(pattern)) {
      return roleInfo;
    }
  }
  return null;
}
function extractNameFromSelector(selector) {
  const attrMatch = selector.match(/\[(?:aria-label|title|alt|name)=['"]([^'"]+)['"]\]/);
  if (attrMatch) {
    return attrMatch[1] ?? null;
  }
  const classMatch = selector.match(/\.([a-zA-Z][-a-zA-Z0-9_]*)/);
  if (classMatch) {
    const className = classMatch[1];
    const words = className.split(/[-_]/).filter(Boolean);
    if (words.length > 0 && words[0].length > 2) {
      return words.join(" ");
    }
  }
  return null;
}
function generateRoleLocator(role, name, options) {
  const parts = [];
  if (name) {
    if (options?.exact) {
      parts.push(`{ name: '${name}', exact: true }`);
    } else {
      parts.push(`{ name: '${name}' }`);
    }
  }
  if (options?.level !== void 0 && role === "heading") {
    if (parts.length > 0) {
      const existing = parts[0].slice(0, -2);
      parts[0] = `${existing}, level: ${options.level} }`;
    } else {
      parts.push(`{ level: ${options.level} }`);
    }
  }
  if (parts.length > 0) {
    return `page.getByRole('${role}', ${parts[0]})`;
  }
  return `page.getByRole('${role}')`;
}
function generateLabelLocator(label, exact) {
  if (exact) {
    return `page.getByLabel('${label}', { exact: true })`;
  }
  return `page.getByLabel('${label}')`;
}
function generateTextLocator(text, exact) {
  if (exact) {
    return `page.getByText('${text}', { exact: true })`;
  }
  return `page.getByText('${text}')`;
}
function generateTestIdLocator(testId) {
  return `page.getByTestId('${testId}')`;
}
function applySelectorFix(context) {
  const { code, ariaInfo } = context;
  if (ariaInfo) {
    return applySelectorFixWithARIA(code, ariaInfo);
  }
  const cssSelector = extractCSSSelector(code);
  if (!cssSelector) {
    return {
      applied: false,
      code,
      description: "No CSS selector found to refine",
      confidence: 0
    };
  }
  return applySelectorFixFromCSS(code, cssSelector);
}
function applySelectorFixWithARIA(code, ariaInfo) {
  let newLocator = null;
  let confidence = 0;
  if (ariaInfo.testId) {
    newLocator = generateTestIdLocator(ariaInfo.testId);
    confidence = 1;
  } else if (ariaInfo.role && ariaInfo.name) {
    newLocator = generateRoleLocator(ariaInfo.role, ariaInfo.name, {
      exact: true,
      level: ariaInfo.level
    });
    confidence = 0.9;
  } else if (ariaInfo.label) {
    newLocator = generateLabelLocator(ariaInfo.label, true);
    confidence = 0.85;
  } else if (ariaInfo.role) {
    newLocator = generateRoleLocator(ariaInfo.role);
    confidence = 0.6;
  }
  if (!newLocator) {
    return {
      applied: false,
      code,
      description: "Unable to generate locator from ARIA info",
      confidence: 0
    };
  }
  let modifiedCode = code;
  for (const pattern of CSS_SELECTOR_PATTERNS) {
    modifiedCode = modifiedCode.replace(pattern, newLocator);
  }
  return {
    applied: modifiedCode !== code,
    code: modifiedCode,
    description: `Replaced CSS selector with ${newLocator.split("(")[0]}`,
    newLocator,
    confidence
  };
}
function applySelectorFixFromCSS(code, cssSelector) {
  const roleInfo = inferRoleFromSelector(cssSelector);
  const extractedName = extractNameFromSelector(cssSelector);
  let newLocator = null;
  let confidence = 0;
  if (roleInfo) {
    const name = extractedName;
    if (name) {
      newLocator = generateRoleLocator(roleInfo.role, name);
      confidence = 0.6;
    } else {
      newLocator = generateRoleLocator(roleInfo.role);
      confidence = 0.4;
    }
  } else if (extractedName) {
    newLocator = generateTextLocator(extractedName);
    confidence = 0.3;
  }
  if (!newLocator) {
    return {
      applied: false,
      code,
      description: "Unable to infer semantic locator from CSS selector",
      confidence: 0
    };
  }
  let modifiedCode = code;
  for (const pattern of CSS_SELECTOR_PATTERNS) {
    modifiedCode = modifiedCode.replace(pattern, newLocator);
  }
  return {
    applied: modifiedCode !== code,
    code: modifiedCode,
    description: `Inferred ${newLocator.split("(")[0]} from CSS selector pattern`,
    newLocator,
    confidence
  };
}
function addExactToLocator(code) {
  let modifiedCode = code;
  let applied = false;
  modifiedCode = modifiedCode.replace(
    /page\.getByRole\s*\(\s*['"](\w+)['"]\s*,\s*\{\s*name:\s*['"]([^'"]+)['"]\s*\}\s*\)/g,
    (_, role, name) => {
      applied = true;
      return `page.getByRole('${role}', { name: '${name}', exact: true })`;
    }
  );
  modifiedCode = modifiedCode.replace(
    /page\.getByLabel\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    (_, label) => {
      applied = true;
      return `page.getByLabel('${label}', { exact: true })`;
    }
  );
  modifiedCode = modifiedCode.replace(
    /page\.getByText\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    (_, text) => {
      applied = true;
      return `page.getByText('${text}', { exact: true })`;
    }
  );
  return {
    applied,
    code: modifiedCode,
    description: applied ? "Added exact: true to locator" : "No locator found to add exact option",
    confidence: applied ? 0.8 : 0
  };
}
var CSS_SELECTOR_PATTERNS, UI_PATTERN_TO_ROLE;
var init_selector = __esm({
  "src/heal/fixes/selector.ts"() {
    CSS_SELECTOR_PATTERNS = [
      // page.locator('.class') or page.locator('#id')
      /page\.locator\s*\(\s*['"`]([.#][^'"`]+)['"`]\s*\)/g,
      // page.locator('[attribute]')
      /page\.locator\s*\(\s*['"`](\[[^\]]+\])['"`]\s*\)/g,
      // page.locator('tag.class')
      /page\.locator\s*\(\s*['"`]([a-z]+[.#][^'"`]+)['"`]\s*\)/g
    ];
    UI_PATTERN_TO_ROLE = {
      "button": { role: "button" },
      "btn": { role: "button" },
      "submit": { role: "button", nameHint: "submit" },
      "input": { role: "textbox" },
      "textbox": { role: "textbox" },
      "checkbox": { role: "checkbox" },
      "radio": { role: "radio" },
      "select": { role: "combobox" },
      "dropdown": { role: "combobox" },
      "link": { role: "link" },
      "heading": { role: "heading" },
      "h1": { role: "heading" },
      "h2": { role: "heading" },
      "h3": { role: "heading" },
      "dialog": { role: "dialog" },
      "modal": { role: "dialog" },
      "alert": { role: "alert" },
      "tab": { role: "tab" },
      "menu": { role: "menu" },
      "menuitem": { role: "menuitem" },
      "table": { role: "table" },
      "row": { role: "row" },
      "cell": { role: "cell" },
      "grid": { role: "grid" },
      "list": { role: "list" },
      "listitem": { role: "listitem" },
      "img": { role: "img" },
      "image": { role: "img" },
      "nav": { role: "navigation" },
      "navigation": { role: "navigation" },
      "search": { role: "search" },
      "main": { role: "main" },
      "banner": { role: "banner" },
      "footer": { role: "contentinfo" }
    };
  }
});

// src/heal/fixes/navigation.ts
function hasNavigationWait(code) {
  return EXISTING_WAIT_PATTERNS.some((pattern) => pattern.test(code));
}
function extractUrlFromError(errorMessage) {
  const matchPattern2 = errorMessage.match(/Expected\s+URL\s+to\s+match\s+['"]([^'"]+)['"]/i);
  if (matchPattern2) {
    return matchPattern2[1] ?? null;
  }
  const matchUrl = errorMessage.match(/expected\s+['"]([^'"]+)['"]\s+to\s+match/i);
  if (matchUrl) {
    return matchUrl[1] ?? null;
  }
  const waitingPattern = errorMessage.match(/waiting\s+for\s+URL\s+['"]([^'"]+)['"]/i);
  if (waitingPattern) {
    return waitingPattern[1] ?? null;
  }
  return null;
}
function extractUrlFromGoto(code) {
  const match = code.match(/page\.goto\s*\(\s*['"`]([^'"`]+)['"`]/);
  return match ? match[1] ?? null : null;
}
function inferUrlPattern(code, errorMessage) {
  const errorUrl = extractUrlFromError(errorMessage);
  if (errorUrl) {
    return errorUrl;
  }
  const gotoUrl = extractUrlFromGoto(code);
  if (gotoUrl) {
    return gotoUrl;
  }
  return null;
}
function generateWaitForURL(urlPattern, options) {
  const opts = options?.timeout ? `, { timeout: ${options.timeout} }` : "";
  if (urlPattern.includes("*") || urlPattern.includes("\\")) {
    return `await page.waitForURL(/${urlPattern}/${opts})`;
  }
  return `await page.waitForURL('${urlPattern}'${opts})`;
}
function generateToHaveURL(urlPattern) {
  if (urlPattern.includes("*") || urlPattern.includes("\\")) {
    return `await expect(page).toHaveURL(/${urlPattern}/)`;
  }
  return `await expect(page).toHaveURL('${urlPattern}')`;
}
function insertNavigationWait(code, lineNumber, urlPattern) {
  const lines = code.split("\n");
  if (lineNumber < 1 || lineNumber > lines.length) {
    return {
      applied: false,
      code,
      description: "Invalid line number",
      confidence: 0
    };
  }
  const contextStart = Math.max(0, lineNumber - 2);
  const contextEnd = Math.min(lines.length, lineNumber + 2);
  const context = lines.slice(contextStart, contextEnd).join("\n");
  if (hasNavigationWait(context)) {
    return {
      applied: false,
      code,
      description: "Navigation wait already exists in context",
      confidence: 0
    };
  }
  const actionLine = lines[lineNumber - 1];
  const indentation = actionLine.match(/^(\s*)/)?.[1] || "";
  const waitStatement = `${indentation}${generateToHaveURL(urlPattern)}`;
  lines.splice(lineNumber, 0, waitStatement);
  return {
    applied: true,
    code: lines.join("\n"),
    description: `Added toHaveURL assertion for '${urlPattern}'`,
    confidence: 0.7
  };
}
function applyNavigationFix(context) {
  const { code, lineNumber, expectedUrl, errorMessage } = context;
  const urlPattern = expectedUrl || inferUrlPattern(code, errorMessage);
  if (!urlPattern) {
    return applyLoadStateWait(code, lineNumber);
  }
  if (hasNavigationWait(code)) {
    return {
      applied: false,
      code,
      description: "Navigation wait already exists",
      confidence: 0
    };
  }
  return insertNavigationWait(code, lineNumber, urlPattern);
}
function applyLoadStateWait(code, lineNumber) {
  const lines = code.split("\n");
  if (lineNumber < 1 || lineNumber > lines.length) {
    return {
      applied: false,
      code,
      description: "Invalid line number",
      confidence: 0
    };
  }
  const actionLine = lines[lineNumber - 1];
  const indentation = actionLine.match(/^(\s*)/)?.[1] || "";
  const waitStatement = `${indentation}await page.waitForLoadState('networkidle')`;
  lines.splice(lineNumber, 0, waitStatement);
  return {
    applied: true,
    code: lines.join("\n"),
    description: "Added waitForLoadState as fallback",
    confidence: 0.5
  };
}
function fixMissingGotoAwait(code) {
  const pattern = /(?<!\bawait\s+)(\bpage\.goto\s*\()/g;
  if (!pattern.test(code)) {
    return {
      applied: false,
      code,
      description: "No missing await on goto found",
      confidence: 0
    };
  }
  const modifiedCode = code.replace(
    /(?<!\bawait\s+)(\bpage\.goto\s*\()/g,
    "await $1"
  );
  return {
    applied: modifiedCode !== code,
    code: modifiedCode,
    description: "Added missing await to page.goto",
    confidence: 0.9
  };
}
function addNavigationWaitAfterClick(code, clickLineNumber, expectedUrl) {
  const urlPattern = expectedUrl || ".*";
  return insertNavigationWait(code, clickLineNumber, urlPattern);
}
var EXISTING_WAIT_PATTERNS;
var init_navigation = __esm({
  "src/heal/fixes/navigation.ts"() {
    EXISTING_WAIT_PATTERNS = [
      /await\s+page\.waitForURL/,
      /await\s+expect\s*\(\s*page\s*\)\.toHaveURL/,
      /await\s+page\.waitForNavigation/,
      /await\s+page\.waitForLoadState/
    ];
  }
});

// src/heal/fixes/timing.ts
function extractTimeoutFromError(errorMessage) {
  const match = errorMessage.match(/timeout\s+(\d+)ms/i);
  return match ? parseInt(match[1], 10) : null;
}
function suggestTimeoutIncrease(currentTimeout, maxTimeout = 3e4) {
  const suggested = Math.min(Math.round(currentTimeout * 1.5), maxTimeout);
  return suggested;
}
function fixMissingAwait(code) {
  let modifiedCode = code;
  let fixCount = 0;
  for (const pattern of MISSING_AWAIT_PATTERNS) {
    pattern.lastIndex = 0;
    modifiedCode = modifiedCode.replace(pattern, (_match, p1) => {
      fixCount++;
      return `await ${p1}`;
    });
  }
  return {
    applied: fixCount > 0,
    code: modifiedCode,
    description: fixCount > 0 ? `Added ${fixCount} missing await statement(s)` : "No missing await found",
    confidence: fixCount > 0 ? 0.9 : 0
  };
}
function convertToWebFirstAssertion(code) {
  let modifiedCode = code;
  let applied = false;
  modifiedCode = modifiedCode.replace(
    /const\s+(\w+)\s*=\s*await\s+(\w+)\.textContent\s*\(\s*\)\s*;?\s*\n(\s*)expect\s*\(\s*\1\s*\)\.toBe\s*\(\s*(['"][^'"]+['"])\s*\)/g,
    (_, _varName, locator, indent, expected) => {
      applied = true;
      return `${indent}await expect(${locator}).toHaveText(${expected})`;
    }
  );
  modifiedCode = modifiedCode.replace(
    /const\s+(\w+)\s*=\s*await\s+(\w+)\.innerText\s*\(\s*\)\s*;?\s*\n(\s*)expect\s*\(\s*\1\s*\)\.toBe\s*\(\s*(['"][^'"]+['"])\s*\)/g,
    (_, _varName, locator, indent, expected) => {
      applied = true;
      return `${indent}await expect(${locator}).toHaveText(${expected})`;
    }
  );
  modifiedCode = modifiedCode.replace(
    /const\s+(\w+)\s*=\s*await\s+(\w+)\.isVisible\s*\(\s*\)\s*;?\s*\n(\s*)expect\s*\(\s*\1\s*\)\.toBe\s*\(\s*true\s*\)/g,
    (_, _varName, locator, indent) => {
      applied = true;
      return `${indent}await expect(${locator}).toBeVisible()`;
    }
  );
  modifiedCode = modifiedCode.replace(
    /const\s+(\w+)\s*=\s*await\s+(\w+)\.isHidden\s*\(\s*\)\s*;?\s*\n(\s*)expect\s*\(\s*\1\s*\)\.toBe\s*\(\s*true\s*\)/g,
    (_, _varName, locator, indent) => {
      applied = true;
      return `${indent}await expect(${locator}).toBeHidden()`;
    }
  );
  return {
    applied,
    code: modifiedCode,
    description: applied ? "Converted to web-first assertion" : "No conversion needed",
    confidence: applied ? 0.85 : 0
  };
}
function addTimeout(code, lineNumber, timeout) {
  const lines = code.split("\n");
  if (lineNumber < 1 || lineNumber > lines.length) {
    return {
      applied: false,
      code,
      description: "Invalid line number",
      confidence: 0
    };
  }
  const line = lines[lineNumber - 1];
  if (/\btimeout\s*:/i.test(line)) {
    return {
      applied: false,
      code,
      description: "Timeout already specified",
      confidence: 0
    };
  }
  let modifiedLine = line;
  modifiedLine = modifiedLine.replace(
    /\.(click|fill|press|type|hover|focus|check|uncheck)\s*\(\s*\)/g,
    `.$1({ timeout: ${timeout} })`
  );
  modifiedLine = modifiedLine.replace(
    /\.(click|fill|press|type|hover|focus|check|uncheck)\s*\(\s*(['"][^'"]*['"])\s*\)/g,
    `.$1($2, { timeout: ${timeout} })`
  );
  modifiedLine = modifiedLine.replace(
    /\.(click|fill|press|type|hover|focus|check|uncheck)\s*\(\s*\{([^}]*)\}\s*\)/g,
    (_, action, options) => {
      if (options.includes("timeout")) {
        return _;
      }
      return `.${action}({ ${options.trim()}, timeout: ${timeout} })`;
    }
  );
  modifiedLine = modifiedLine.replace(
    /\.(toBeVisible|toBeHidden|toHaveText|toContainText|toHaveValue)\s*\(\s*\)/g,
    `.$1({ timeout: ${timeout} })`
  );
  const applied = modifiedLine !== line;
  lines[lineNumber - 1] = modifiedLine;
  return {
    applied,
    code: lines.join("\n"),
    description: applied ? `Added timeout: ${timeout}ms` : "Unable to add timeout",
    confidence: applied ? 0.6 : 0
  };
}
function applyTimingFix(context) {
  const { code, lineNumber, currentTimeout, errorMessage } = context;
  const awaitFix = fixMissingAwait(code);
  if (awaitFix.applied) {
    return awaitFix;
  }
  const webFirstFix = convertToWebFirstAssertion(code);
  if (webFirstFix.applied) {
    return webFirstFix;
  }
  const timeout = currentTimeout || extractTimeoutFromError(errorMessage) || 5e3;
  const newTimeout = suggestTimeoutIncrease(timeout);
  return addTimeout(code, lineNumber, newTimeout);
}
function wrapWithExpectToPass(code, lineStart, lineEnd, options) {
  const lines = code.split("\n");
  if (lineStart < 1 || lineEnd > lines.length || lineStart > lineEnd) {
    return {
      applied: false,
      code,
      description: "Invalid line range",
      confidence: 0
    };
  }
  const blockLines = lines.slice(lineStart - 1, lineEnd);
  const indentation = blockLines[0].match(/^(\s*)/)?.[1] || "";
  const optParts = [];
  if (options?.timeout) {
    optParts.push(`timeout: ${options.timeout}`);
  }
  if (options?.intervals) {
    optParts.push(`intervals: [${options.intervals.join(", ")}]`);
  }
  const optString = optParts.length > 0 ? `, { ${optParts.join(", ")} }` : "";
  const wrapped = [
    `${indentation}await expect(async () => {`,
    ...blockLines.map((line) => `  ${line}`),
    `${indentation}}).toPass(${optString.slice(2)})`
  ];
  lines.splice(lineStart - 1, lineEnd - lineStart + 1, ...wrapped);
  return {
    applied: true,
    code: lines.join("\n"),
    description: "Wrapped with expect.toPass for retry behavior",
    confidence: 0.7
  };
}
function wrapWithExpectPoll(_code, _lineNumber, getter, expected, options) {
  const optParts = [];
  if (options?.timeout) {
    optParts.push(`timeout: ${options.timeout}`);
  }
  if (options?.intervals) {
    optParts.push(`intervals: [${options.intervals.join(", ")}]`);
  }
  const optString = optParts.length > 0 ? `, { ${optParts.join(", ")} }` : "";
  return `await expect.poll(async () => ${getter}${optString}).toBe(${expected})`;
}
var MISSING_AWAIT_PATTERNS;
var init_timing = __esm({
  "src/heal/fixes/timing.ts"() {
    MISSING_AWAIT_PATTERNS = [
      // Playwright actions without await
      /(?<!\bawait\s+)(page\.(?:click|fill|type|check|uncheck|selectOption|hover|focus|press|dblclick|dragTo)\s*\()/g,
      // Expectations without await
      /(?<!\bawait\s+)(expect\s*\([^)]+\)\.(?:toBeVisible|toBeHidden|toHaveText|toContainText|toHaveValue|toHaveURL|toHaveTitle)\s*\()/g,
      // Locator actions without await
      /(?<!\bawait\s+)([a-zA-Z_$][a-zA-Z0-9_$]*\.(?:click|fill|type|check|hover|press)\s*\()/g
    ];
  }
});
function applyFix(code, fixType, context) {
  const { lineNumber, errorMessage, ariaInfo } = context;
  switch (fixType) {
    case "selector-refine":
      return applySelectorFix({
        code,
        ariaInfo
      });
    case "add-exact":
      return addExactToLocator(code);
    case "missing-await":
      return fixMissingAwait(code);
    case "navigation-wait":
      return applyNavigationFix({
        code,
        lineNumber,
        errorMessage
      });
    case "web-first-assertion":
      return convertToWebFirstAssertion(code);
    case "timeout-increase":
      return applyTimingFix({
        code,
        lineNumber,
        errorMessage
      });
    default:
      return {
        applied: false,
        code,
        description: `Unknown fix type: ${fixType}`
      };
  }
}
function extractLineNumber(summary) {
  const firstTest = summary.failures.tests[0];
  if (firstTest) {
    const lineMatch = firstTest.match(/:(\d+)(?::\d+)?(?:\)|$)/);
    if (lineMatch) {
      return parseInt(lineMatch[1], 10);
    }
    const atLineMatch = firstTest.match(/at line (\d+)/i);
    if (atLineMatch) {
      return parseInt(atLineMatch[1], 10);
    }
  }
  for (const [, classification] of Object.entries(summary.failures.classifications)) {
    if (classification && typeof classification === "object" && "explanation" in classification) {
      const explanation = classification.explanation;
      const lineMatch = explanation.match(/:(\d+)(?::\d+)?/);
      if (lineMatch) {
        return parseInt(lineMatch[1], 10);
      }
    }
  }
  return 1;
}
function extractClassification(summary) {
  const classifications = summary.failures.classifications;
  const firstKey = Object.keys(classifications)[0];
  if (firstKey && classifications[firstKey]) {
    return classifications[firstKey];
  }
  return null;
}
async function runHealingLoop(options) {
  const {
    journeyId,
    testFile,
    outputDir,
    config = DEFAULT_HEALING_CONFIG,
    verifyFn,
    ariaInfo
  } = options;
  const logger = new HealingLogger(journeyId, outputDir, config.maxAttempts);
  const attemptedFixes = [];
  if (!existsSync(testFile)) {
    logger.markFailed("Test file not found");
    return {
      success: false,
      status: "failed",
      attempts: 0,
      logPath: logger.getOutputPath(),
      recommendation: "Test file not found"
    };
  }
  let currentCode = readFileSync(testFile, "utf-8");
  let lastSummary = null;
  try {
    lastSummary = await verifyFn();
    if (lastSummary.status === "passed") {
      logger.markHealed();
      return {
        success: true,
        status: "healed",
        attempts: 0,
        logPath: logger.getOutputPath()
      };
    }
  } catch (error) {
    logger.markFailed(`Initial verification failed: ${error}`);
    return {
      success: false,
      status: "failed",
      attempts: 0,
      logPath: logger.getOutputPath(),
      recommendation: "Initial verification failed"
    };
  }
  const classification = extractClassification(lastSummary);
  if (!classification) {
    logger.markFailed("Unable to classify failure");
    return {
      success: false,
      status: "failed",
      attempts: 0,
      logPath: logger.getOutputPath(),
      recommendation: "Unable to classify failure for healing"
    };
  }
  const evaluation = evaluateHealing(classification, config);
  if (!evaluation.canHeal) {
    logger.markFailed(evaluation.reason);
    return {
      success: false,
      status: "not_healable",
      attempts: 0,
      logPath: logger.getOutputPath(),
      recommendation: evaluation.reason
    };
  }
  while (!logger.isMaxAttemptsReached()) {
    const attemptNumber = logger.getAttemptCount() + 1;
    const startTime = Date.now();
    const nextFix = getNextFix(classification, attemptedFixes, config);
    if (!nextFix) {
      logger.markExhausted(getPostHealingRecommendation(classification, attemptNumber));
      return {
        success: false,
        status: "exhausted",
        attempts: attemptNumber - 1,
        logPath: logger.getOutputPath(),
        recommendation: getPostHealingRecommendation(classification, attemptNumber)
      };
    }
    attemptedFixes.push(nextFix);
    const fixResult = applyFix(currentCode, nextFix, {
      lineNumber: extractLineNumber(lastSummary),
      errorMessage: lastSummary.failures.tests[0] || "",
      ariaInfo
    });
    if (!fixResult.applied) {
      logger.logAttempt({
        attempt: attemptNumber,
        failureType: classification.category,
        fixType: nextFix,
        file: testFile,
        change: fixResult.description,
        evidence: [],
        result: "fail",
        errorMessage: "Fix not applied",
        duration: Date.now() - startTime
      });
      continue;
    }
    writeFileSync(testFile, fixResult.code, "utf-8");
    currentCode = fixResult.code;
    try {
      lastSummary = await verifyFn();
      const attempt = {
        attempt: attemptNumber,
        failureType: classification.category,
        fixType: nextFix,
        file: testFile,
        change: fixResult.description,
        evidence: lastSummary.reportPath ? [lastSummary.reportPath] : [],
        result: lastSummary.status === "passed" ? "pass" : "fail",
        duration: Date.now() - startTime
      };
      if (lastSummary.status !== "passed") {
        attempt.errorMessage = lastSummary.failures.tests[0] || "Unknown error";
        const newClassification = extractClassification(lastSummary);
        if (newClassification && newClassification.category !== classification.category) {
          Object.assign(classification, newClassification);
        }
      }
      logger.logAttempt(attempt);
      if (lastSummary.status === "passed") {
        logger.markHealed();
        return {
          success: true,
          status: "healed",
          attempts: attemptNumber,
          appliedFix: nextFix,
          logPath: logger.getOutputPath(),
          modifiedCode: currentCode
        };
      }
    } catch (error) {
      logger.logAttempt({
        attempt: attemptNumber,
        failureType: classification.category,
        fixType: nextFix,
        file: testFile,
        change: fixResult.description,
        evidence: [],
        result: "error",
        errorMessage: String(error),
        duration: Date.now() - startTime
      });
    }
  }
  logger.markExhausted(getPostHealingRecommendation(classification, config.maxAttempts));
  return {
    success: false,
    status: "exhausted",
    attempts: config.maxAttempts,
    logPath: logger.getOutputPath(),
    recommendation: getPostHealingRecommendation(classification, config.maxAttempts)
  };
}
function previewHealingFixes(code, classification, config = DEFAULT_HEALING_CONFIG) {
  const previews = [];
  const evaluation = evaluateHealing(classification, config);
  if (!evaluation.canHeal) {
    return previews;
  }
  for (const fixType of evaluation.applicableFixes) {
    const result = applyFix(code, fixType, {
      lineNumber: 1,
      errorMessage: ""});
    if (result.applied) {
      previews.push({
        fixType,
        preview: result.description,
        confidence: 0.5
        // Could be enhanced with actual confidence scores
      });
    }
  }
  return previews;
}
function wouldFixApply(code, fixType, classification) {
  const result = applyFix(code, fixType, {
    lineNumber: 1,
    errorMessage: ""});
  return result.applied;
}
var init_loop = __esm({
  "src/heal/loop.ts"() {
    init_rules();
    init_logger();
    init_selector();
    init_navigation();
    init_timing();
  }
});
function generateRunId() {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(4).toString("hex");
  return `${timestamp}-${random}`;
}
function hasDataIsolation(code) {
  if (/\brunId\b/i.test(code)) {
    return true;
  }
  if (/testInfo\.testId/i.test(code)) {
    return true;
  }
  if (/Date\.now\(\)|Math\.random\(\)|crypto|uuid/i.test(code)) {
    return true;
  }
  return false;
}
function addRunIdVariable(code) {
  if (/\bconst\s+runId\b/.test(code)) {
    return {
      applied: false,
      code,
      description: "runId already defined",
      confidence: 0
    };
  }
  const testMatch = code.match(/test\s*\(\s*['"`][^'"`]+['"`]\s*,\s*async\s*\(\s*\{[^}]*\}\s*\)\s*=>\s*\{/);
  if (!testMatch) {
    return {
      applied: false,
      code,
      description: "Unable to find test function",
      confidence: 0
    };
  }
  const insertIndex = testMatch.index + testMatch[0].length;
  const indentation = "    ";
  const runIdDeclaration = `
${indentation}const runId = \`\${Date.now()}-\${Math.random().toString(36).slice(2, 8)}\`;`;
  const modifiedCode = code.slice(0, insertIndex) + runIdDeclaration + code.slice(insertIndex);
  return {
    applied: true,
    code: modifiedCode,
    description: "Added runId variable for data isolation",
    confidence: 0.8
  };
}
function namespaceEmail(email, runId) {
  const [local, domain] = email.split("@");
  if (!domain) return `${email}-${runId}`;
  return `${local}+${runId}@${domain}`;
}
function namespaceName(name, runId) {
  return `${name} ${runId}`;
}
function replaceHardcodedEmail(code) {
  const emailPattern = /(['"`])([\w.+-]+@[\w.-]+\.[\w]{2,})(['"`])/g;
  let applied = false;
  const modifiedCode = code.replace(emailPattern, (match, _q1, email, _q2) => {
    if (code.includes("`") && code.includes("${runId}")) {
      return match;
    }
    const before = code.slice(Math.max(0, code.indexOf(match) - 50), code.indexOf(match));
    if (/\.fill\s*\([^,]*$/.test(before)) {
      applied = true;
      const [local, domain] = email.split("@");
      return `\`${local}+\${runId}@${domain}\``;
    }
    return match;
  });
  return {
    applied,
    code: modifiedCode,
    description: applied ? "Namespaced email with runId" : "No hardcoded email to namespace",
    confidence: applied ? 0.7 : 0
  };
}
function replaceHardcodedTestData(code) {
  let modifiedCode = code;
  let applied = false;
  modifiedCode = modifiedCode.replace(
    /(['"`])(Test\s*(?:User|Name|Account|Client|Customer))\s*(['"`])/gi,
    (_match, _q1, name, _q2) => {
      applied = true;
      return `\`${name} \${runId}\``;
    }
  );
  modifiedCode = modifiedCode.replace(
    /\.fill\s*\([^,]+,\s*['"`](test[-_]?\w+)['"`]\s*\)/gi,
    (match, value) => {
      applied = true;
      return match.replace(`'${value}'`, `\`${value}-\${runId}\``).replace(`"${value}"`, `\`${value}-\${runId}\``);
    }
  );
  return {
    applied,
    code: modifiedCode,
    description: applied ? "Namespaced test data with runId" : "No hardcoded test data found",
    confidence: applied ? 0.6 : 0
  };
}
function applyDataFix(context) {
  const { code } = context;
  if (hasDataIsolation(code)) {
    return {
      applied: false,
      code,
      description: "Data isolation already present",
      confidence: 0
    };
  }
  let result = addRunIdVariable(code);
  if (!result.applied) {
    return result;
  }
  let modifiedCode = result.code;
  let fixCount = 1;
  const emailResult = replaceHardcodedEmail(modifiedCode);
  if (emailResult.applied) {
    modifiedCode = emailResult.code;
    fixCount++;
  }
  const dataResult = replaceHardcodedTestData(modifiedCode);
  if (dataResult.applied) {
    modifiedCode = dataResult.code;
    fixCount++;
  }
  return {
    applied: true,
    code: modifiedCode,
    description: `Applied ${fixCount} data isolation fix(es)`,
    confidence: 0.7
  };
}
function addCleanupHook(code, cleanupCode) {
  if (/test\.afterEach\s*\(/.test(code)) {
    return {
      applied: false,
      code,
      description: "afterEach hook already exists",
      confidence: 0
    };
  }
  const describeMatch = code.match(/test\.describe\s*\(\s*['"`][^'"`]+['"`]\s*,\s*\(\s*\)\s*=>\s*\{/);
  if (describeMatch) {
    const insertIndex = describeMatch.index + describeMatch[0].length;
    const indentation = "  ";
    const hookCode = `
${indentation}test.afterEach(async () => {
${indentation}  ${cleanupCode}
${indentation}});
`;
    const modifiedCode = code.slice(0, insertIndex) + hookCode + code.slice(insertIndex);
    return {
      applied: true,
      code: modifiedCode,
      description: "Added afterEach cleanup hook",
      confidence: 0.7
    };
  }
  return {
    applied: false,
    code,
    description: "Unable to find suitable location for cleanup hook",
    confidence: 0
  };
}
function extractTestDataPatterns(code) {
  const patterns = [];
  const fillMatches = code.matchAll(/\.fill\s*\([^,]+,\s*['"`]([^'"`]+)['"`]\s*\)/g);
  for (const match of fillMatches) {
    patterns.push(match[1]);
  }
  const emailMatches = code.matchAll(/['"`]([\w.+-]+@[\w.-]+\.[\w]{2,})['"`]/g);
  for (const match of emailMatches) {
    patterns.push(match[1]);
  }
  return patterns;
}
var init_data = __esm({
  "src/heal/fixes/data.ts"() {
  }
});

// src/heal/index.ts
var heal_exports = {};
__export(heal_exports, {
  DEFAULT_HEALING_CONFIG: () => DEFAULT_HEALING_CONFIG,
  DEFAULT_HEALING_RULES: () => DEFAULT_HEALING_RULES,
  HealingLogger: () => HealingLogger,
  UNHEALABLE_CATEGORIES: () => UNHEALABLE_CATEGORIES,
  addCleanupHook: () => addCleanupHook,
  addExactToLocator: () => addExactToLocator,
  addNavigationWaitAfterClick: () => addNavigationWaitAfterClick,
  addRunIdVariable: () => addRunIdVariable,
  addTimeout: () => addTimeout,
  aggregateHealingLogs: () => aggregateHealingLogs,
  applyDataFix: () => applyDataFix,
  applyNavigationFix: () => applyNavigationFix,
  applySelectorFix: () => applySelectorFix,
  applyTimingFix: () => applyTimingFix,
  containsCSSSelector: () => containsCSSSelector,
  convertToWebFirstAssertion: () => convertToWebFirstAssertion,
  createHealingReport: () => createHealingReport,
  evaluateHealing: () => evaluateHealing,
  extractCSSSelector: () => extractCSSSelector,
  extractNameFromSelector: () => extractNameFromSelector,
  extractTestDataPatterns: () => extractTestDataPatterns,
  extractTimeoutFromError: () => extractTimeoutFromError,
  extractUrlFromError: () => extractUrlFromError,
  extractUrlFromGoto: () => extractUrlFromGoto,
  fixMissingAwait: () => fixMissingAwait,
  fixMissingGotoAwait: () => fixMissingGotoAwait,
  formatHealingLog: () => formatHealingLog,
  generateLabelLocator: () => generateLabelLocator,
  generateRoleLocator: () => generateRoleLocator,
  generateRunId: () => generateRunId,
  generateTestIdLocator: () => generateTestIdLocator,
  generateTextLocator: () => generateTextLocator,
  generateToHaveURL: () => generateToHaveURL,
  generateWaitForURL: () => generateWaitForURL,
  getApplicableRules: () => getApplicableRules,
  getHealingRecommendation: () => getHealingRecommendation,
  getNextFix: () => getNextFix,
  getPostHealingRecommendation: () => getPostHealingRecommendation,
  hasDataIsolation: () => hasDataIsolation,
  hasNavigationWait: () => hasNavigationWait,
  inferRoleFromSelector: () => inferRoleFromSelector,
  inferUrlPattern: () => inferUrlPattern,
  insertNavigationWait: () => insertNavigationWait,
  isCategoryHealable: () => isCategoryHealable,
  isFixAllowed: () => isFixAllowed,
  isFixForbidden: () => isFixForbidden,
  loadHealingLog: () => loadHealingLog,
  namespaceEmail: () => namespaceEmail,
  namespaceName: () => namespaceName,
  previewHealingFixes: () => previewHealingFixes,
  replaceHardcodedEmail: () => replaceHardcodedEmail,
  replaceHardcodedTestData: () => replaceHardcodedTestData,
  runHealingLoop: () => runHealingLoop,
  suggestTimeoutIncrease: () => suggestTimeoutIncrease,
  wouldFixApply: () => wouldFixApply,
  wrapWithExpectPoll: () => wrapWithExpectPoll,
  wrapWithExpectToPass: () => wrapWithExpectToPass
});
var init_heal = __esm({
  "src/heal/index.ts"() {
    init_rules();
    init_logger();
    init_loop();
    init_selector();
    init_navigation();
    init_timing();
    init_data();
  }
});
async function installAutogenInstance(options) {
  const {
    rootDir,
    projectName = "my-project",
    baseUrl = "http://localhost:3000",
    testIdAttribute = "data-testid",
    skipIfExists = false,
    includeExample = true,
    force = false
  } = options;
  const result = {
    success: true,
    created: [],
    skipped: [],
    errors: []
  };
  try {
    const directories = [
      "journeys",
      "tests/journeys",
      "tests/modules",
      ".artk"
    ];
    for (const dir of directories) {
      const fullPath = join(rootDir, dir);
      if (existsSync(fullPath)) {
        if (skipIfExists && !force) {
          result.skipped.push(dir);
          continue;
        }
      } else {
        mkdirSync(fullPath, { recursive: true });
        result.created.push(dir);
      }
    }
    const configPath = join(rootDir, "autogen.config.yml");
    if (!existsSync(configPath) || force) {
      const config = {
        version: CURRENT_CONFIG_VERSION,
        project: projectName,
        baseUrl,
        testIdAttribute,
        paths: {
          journeys: "journeys",
          tests: "tests/journeys",
          modules: "tests/modules"
        },
        healing: {
          enabled: true,
          maxAttempts: 3
        },
        validation: {
          requireClarified: true,
          forbiddenPatterns: [
            "page\\.waitForTimeout",
            "force:\\s*true"
          ]
        }
      };
      writeFileSync(configPath, stringify(config));
      result.created.push("autogen.config.yml");
    } else if (skipIfExists) {
      result.skipped.push("autogen.config.yml");
    }
    const gitignorePath = join(rootDir, ".artk/.gitignore");
    if (!existsSync(gitignorePath) || force) {
      writeFileSync(gitignorePath, [
        "# ARTK temporary files",
        "heal-logs/",
        "*.heal.json",
        "selector-catalog.local.json"
      ].join("\n"));
      result.created.push(".artk/.gitignore");
    } else if (skipIfExists) {
      result.skipped.push(".artk/.gitignore");
    }
    const glossaryPath = join(rootDir, ".artk/glossary.yml");
    if (!existsSync(glossaryPath) || force) {
      const glossary = {
        terms: [],
        aliases: {}
      };
      writeFileSync(glossaryPath, stringify(glossary));
      result.created.push(".artk/glossary.yml");
    } else if (skipIfExists) {
      result.skipped.push(".artk/glossary.yml");
    }
    if (includeExample) {
      const examplePath = join(rootDir, "journeys/EXAMPLE-001.md");
      if (!existsSync(examplePath) || force) {
        const exampleJourney = `---
id: EXAMPLE-001
title: Example Journey
status: proposed
tier: smoke
scope: example
actor: user
tags:
  - example
  - smoke
tests: []
modules: []
---

# Example Journey

## Overview
This is an example Journey to demonstrate the format.

## Preconditions
- User is on the home page

## Acceptance Criteria
- [ ] AC1: User can see the welcome message

## Steps
1. Navigate to the home page
2. Verify the welcome message is visible
`;
        writeFileSync(examplePath, exampleJourney);
        result.created.push("journeys/EXAMPLE-001.md");
      } else if (skipIfExists) {
        result.skipped.push("journeys/EXAMPLE-001.md");
      }
    }
    const vscodePath = join(rootDir, ".vscode");
    if (!existsSync(vscodePath)) {
      mkdirSync(vscodePath, { recursive: true });
    }
    const settingsPath = join(vscodePath, "settings.json");
    if (!existsSync(settingsPath) || force) {
      const settings = {
        "files.associations": {
          "*.journey.md": "markdown"
        },
        "editor.quickSuggestions": {
          strings: true
        },
        "chat.promptFilesRecommendations": {
          "artk.init-playbook": true,
          "artk.discover-foundation": true,
          "artk.journey-propose": true,
          "artk.journey-define": true,
          "artk.journey-clarify": true,
          "artk.testid-audit": true,
          "artk.journey-implement": true,
          "artk.journey-validate": true,
          "artk.journey-verify": true
        }
      };
      writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
      result.created.push(".vscode/settings.json");
    } else if (skipIfExists) {
      result.skipped.push(".vscode/settings.json");
    }
  } catch (error) {
    result.success = false;
    result.errors.push(String(error));
  }
  return result;
}
var CURRENT_CONFIG_VERSION;
var init_install = __esm({
  "src/instance/install.ts"() {
    CURRENT_CONFIG_VERSION = 1;
  }
});
async function upgradeAutogenInstance(options) {
  const {
    rootDir,
    toVersion = CURRENT_CONFIG_VERSION2,
    backup = true,
    dryRun = false
  } = options;
  const result = {
    success: true,
    fromVersion: 0,
    toVersion,
    changes: [],
    errors: []
  };
  try {
    const configPath = join(rootDir, "autogen.config.yml");
    if (!existsSync(configPath)) {
      throw new Error("No autogen.config.yml found. Run install first.");
    }
    const configContent = readFileSync(configPath, "utf-8");
    const config = parse(configContent);
    result.fromVersion = config.version || 0;
    if (result.fromVersion >= toVersion) {
      result.changes.push({
        type: "config",
        path: configPath,
        description: `Already at version ${result.fromVersion}, no upgrade needed`
      });
      return result;
    }
    if (backup && !dryRun) {
      const backupPath = `${configPath}.backup-v${result.fromVersion}`;
      writeFileSync(backupPath, configContent);
      result.backupPath = backupPath;
      result.changes.push({
        type: "file",
        path: backupPath,
        description: "Created config backup"
      });
    }
    const migrationResult = migrateConfig(config, toVersion);
    for (const migration of migrationResult.migrationsApplied) {
      result.changes.push({
        type: "config",
        path: configPath,
        description: migration
      });
    }
    if (!dryRun) {
      writeFileSync(configPath, stringify(migrationResult.config));
    }
    result.changes.push({
      type: "config",
      path: configPath,
      description: `Upgraded config from v${result.fromVersion} to v${toVersion}`
    });
    const versionUpgrades = getVersionUpgrades(result.fromVersion, toVersion);
    for (const upgrade of versionUpgrades) {
      if (!dryRun) {
        await upgrade.apply(rootDir);
      }
      result.changes.push({
        type: upgrade.type,
        path: upgrade.path,
        description: upgrade.description
      });
    }
  } catch (error) {
    result.success = false;
    result.errors.push(String(error));
  }
  return result;
}
function migrateConfig(config, toVersion = CURRENT_CONFIG_VERSION2) {
  const fromVersion = config.version || 0;
  let currentConfig = { ...config };
  const migrationsApplied = [];
  if (fromVersion === toVersion) {
    return {
      migrated: false,
      fromVersion,
      toVersion: fromVersion,
      migrationsApplied: [],
      config: currentConfig
    };
  }
  for (const migration of MIGRATIONS) {
    if (migration.fromVersion >= fromVersion && migration.toVersion <= toVersion) {
      currentConfig = migration.migrate(currentConfig);
      migrationsApplied.push(migration.description);
    }
  }
  currentConfig.version = toVersion;
  return {
    migrated: true,
    fromVersion,
    toVersion,
    migrationsApplied,
    config: currentConfig
  };
}
function getVersionUpgrades(_fromVersion, _toVersion) {
  const upgrades = [];
  return upgrades;
}
var CURRENT_CONFIG_VERSION2, MIGRATIONS;
var init_upgrade = __esm({
  "src/instance/upgrade.ts"() {
    CURRENT_CONFIG_VERSION2 = 1;
    MIGRATIONS = [
      // Future migrations go here
      // {
      //   fromVersion: 1,
      //   toVersion: 2,
      //   description: 'Rename selectorPolicy to locatorPolicy',
      //   migrate: (config) => {
      //     if (config.selectorPolicy) {
      //       config.locatorPolicy = config.selectorPolicy;
      //       delete config.selectorPolicy;
      //     }
      //     return config;
      //   },
      // },
    ];
  }
});
var LLMProviderSchema, LLMConfigSchema, CostLimitsSchema;
var init_types2 = __esm({
  "src/shared/types.ts"() {
    LLMProviderSchema = z.enum([
      "openai",
      "anthropic",
      "azure",
      "bedrock",
      "ollama",
      "local",
      "none"
    ]);
    LLMConfigSchema = z.object({
      provider: LLMProviderSchema.default("none"),
      model: z.string().default(""),
      temperature: z.number().min(0).max(2).default(0.2),
      maxTokens: z.number().min(100).max(32e3).default(2e3),
      timeoutMs: z.number().min(1e3).max(3e5).default(3e4),
      maxRetries: z.number().min(0).max(5).default(2),
      retryDelayMs: z.number().min(100).max(1e4).default(1e3)
    });
    CostLimitsSchema = z.object({
      perTestUsd: z.number().min(0.01).max(10).default(0.1),
      perSessionUsd: z.number().min(0.1).max(100).default(5),
      enabled: z.boolean().default(true)
    });
    z.object({
      promptTokens: z.number().default(0),
      completionTokens: z.number().default(0),
      totalTokens: z.number().default(0),
      estimatedCostUsd: z.number().default(0)
    });
  }
});
var SCoTAtomicStepSchema, SCoTConditionSchema, SCoTIteratorSchema, SCoTStructureSchema, SuggestedApproachSchema, CodeChangeSchema;
var init_llm_response_parser = __esm({
  "src/shared/llm-response-parser.ts"() {
    init_types2();
    SCoTAtomicStepSchema = z.object({
      action: z.string(),
      target: z.string().optional(),
      value: z.string().optional(),
      assertion: z.string().optional()
    });
    SCoTConditionSchema = z.object({
      element: z.string().optional(),
      state: z.enum(["visible", "hidden", "enabled", "disabled", "exists", "checked", "unchecked"]),
      negate: z.boolean().optional()
    });
    SCoTIteratorSchema = z.object({
      variable: z.string(),
      collection: z.string(),
      maxIterations: z.number().optional()
    });
    SCoTStructureSchema = z.object({
      type: z.enum(["sequential", "branch", "loop"]),
      description: z.string(),
      steps: z.array(SCoTAtomicStepSchema).optional(),
      condition: SCoTConditionSchema.optional(),
      thenBranch: z.array(SCoTAtomicStepSchema).optional(),
      elseBranch: z.array(SCoTAtomicStepSchema).optional(),
      iterator: SCoTIteratorSchema.optional(),
      body: z.array(SCoTAtomicStepSchema).optional()
    });
    z.object({
      reasoning: z.string().min(1),
      confidence: z.number().min(0).max(1),
      plan: z.array(SCoTStructureSchema),
      warnings: z.array(z.string()).default([])
    });
    SuggestedApproachSchema = z.object({
      name: z.string(),
      description: z.string(),
      confidence: z.number().min(0).max(1),
      complexity: z.enum(["simple", "moderate", "complex"]),
      requiredChanges: z.array(z.string())
    });
    z.object({
      rootCause: z.string().min(1),
      confidence: z.number().min(0).max(1),
      suggestedApproaches: z.array(SuggestedApproachSchema).min(1)
    });
    CodeChangeSchema = z.object({
      type: z.enum(["replace", "insert", "delete"]),
      lineStart: z.number(),
      lineEnd: z.number().optional(),
      explanation: z.string()
    });
    z.object({
      fixedCode: z.string().min(1),
      changes: z.array(CodeChangeSchema),
      explanation: z.string()
    });
  }
});
var SCoTConfigSchema, CircuitBreakerConfigSchema, RefinementConfigSchema, UncertaintyConfigSchema;
var init_config_validator = __esm({
  "src/shared/config-validator.ts"() {
    init_types2();
    SCoTConfigSchema = z.object({
      enabled: z.boolean().default(false),
      minConfidence: z.number().min(0).max(1).default(0.7),
      maxStructures: z.number().min(1).max(100).default(20),
      includeReasoningComments: z.boolean().default(true),
      llm: LLMConfigSchema.default({}),
      fallback: z.enum(["pattern-only", "error"]).default("pattern-only")
    }).default({});
    CircuitBreakerConfigSchema = z.object({
      sameErrorThreshold: z.number().min(1).max(5).default(2),
      errorHistorySize: z.number().min(5).max(50).default(10),
      degradationThreshold: z.number().min(0.1).max(1).default(0.5),
      cooldownMs: z.number().min(1e3).max(3e5).default(6e4)
    }).default({});
    RefinementConfigSchema = z.object({
      enabled: z.boolean().default(false),
      maxAttempts: z.number().min(1).max(5).default(3),
      timeouts: z.object({
        session: z.number().min(6e4).max(6e5).default(3e5),
        execution: z.number().min(1e4).max(12e4).default(6e4),
        delayBetweenAttempts: z.number().min(500).max(1e4).default(1e3)
      }).default({}),
      circuitBreaker: CircuitBreakerConfigSchema,
      errorHandling: z.object({
        categories: z.array(z.string()).default([]),
        skip: z.array(z.string()).default(["FIXTURE", "PAGE_ERROR"])
      }).default({}),
      learning: z.object({
        enabled: z.boolean().default(true),
        minGeneralizability: z.number().min(0).max(1).default(0.6)
      }).default({}),
      llm: LLMConfigSchema.default({}),
      advanced: z.object({
        minAutoFixConfidence: z.number().min(0).max(1).default(0.7),
        includeScreenshots: z.boolean().default(true),
        includeTraces: z.boolean().default(false),
        verbose: z.boolean().default(false),
        dryRun: z.boolean().default(false)
      }).default({})
    }).default({});
    UncertaintyConfigSchema = z.object({
      enabled: z.boolean().default(false),
      thresholds: z.object({
        autoAccept: z.number().min(0.5).max(1).default(0.85),
        block: z.number().min(0).max(0.8).default(0.5),
        minimumPerDimension: z.number().min(0).max(0.8).default(0.4)
      }).default({}),
      weights: z.object({
        syntax: z.number().min(0).max(1).default(0.2),
        pattern: z.number().min(0).max(1).default(0.3),
        selector: z.number().min(0).max(1).default(0.3),
        agreement: z.number().min(0).max(1).default(0.2)
      }).default({}),
      sampling: z.object({
        enabled: z.boolean().default(false),
        sampleCount: z.number().min(2).max(5).default(3),
        temperatures: z.array(z.number()).default([0.2, 0.5, 0.7])
      }).default({}),
      reporting: z.object({
        includeInTestComments: z.boolean().default(true),
        generateMarkdownReport: z.boolean().default(false)
      }).default({})
    }).default({});
    z.object({
      scot: SCoTConfigSchema,
      refinement: RefinementConfigSchema,
      uncertainty: UncertaintyConfigSchema,
      costLimits: CostLimitsSchema.default({})
    });
  }
});

// src/shared/cost-tracker.ts
function estimateCost(usage, model) {
  const pricing = MODEL_PRICING[model] ?? MODEL_PRICING["default"];
  if (!pricing) {
    throw new Error("Default pricing not found in MODEL_PRICING");
  }
  const inputCost = usage.promptTokens / 1e6 * pricing.input;
  const outputCost = usage.completionTokens / 1e6 * pricing.output;
  return inputCost + outputCost;
}
var MODEL_PRICING;
var init_cost_tracker = __esm({
  "src/shared/cost-tracker.ts"() {
    MODEL_PRICING = {
      // OpenAI
      "gpt-4o": { input: 2.5, output: 10 },
      "gpt-4o-mini": { input: 0.15, output: 0.6 },
      "gpt-4-turbo": { input: 10, output: 30 },
      "gpt-3.5-turbo": { input: 0.5, output: 1.5 },
      // Anthropic
      "claude-opus-4-20250514": { input: 15, output: 75 },
      "claude-sonnet-4-20250514": { input: 3, output: 15 },
      "claude-3-5-sonnet-20241022": { input: 3, output: 15 },
      "claude-3-haiku-20240307": { input: 0.25, output: 1.25 },
      // Default for unknown models
      "default": { input: 1, output: 3 }
    };
  }
});
function createEmptyTelemetryData(sessionId) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  return {
    version: 1,
    sessionId,
    createdAt: now,
    updatedAt: now,
    totalTokens: 0,
    totalCostUsd: 0,
    commandStats: {},
    recentEvents: [],
    errorCounts: {}
  };
}
function getTelemetry(config) {
  if (!globalTelemetry) {
    globalTelemetry = new Telemetry(config);
  }
  return globalTelemetry;
}
var DEFAULT_CONFIG, Telemetry, globalTelemetry;
var init_telemetry = __esm({
  "src/shared/telemetry.ts"() {
    init_paths();
    init_cost_tracker();
    DEFAULT_CONFIG = {
      enabled: true,
      maxEvents: 100,
      defaultModel: "gpt-4o-mini"
    };
    Telemetry = class {
      data;
      config;
      sessionId;
      pendingCommands;
      constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.sessionId = this.generateSessionId();
        this.data = createEmptyTelemetryData(this.sessionId);
        this.pendingCommands = /* @__PURE__ */ new Map();
      }
      generateSessionId() {
        return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      }
      /**
       * Load existing telemetry data or create new
       */
      async load(baseDir) {
        if (!this.config.enabled) return;
        try {
          const telemetryPath = getAutogenArtifact("telemetry", baseDir);
          if (existsSync(telemetryPath)) {
            const content = readFileSync(telemetryPath, "utf-8");
            const loaded = JSON.parse(content);
            this.data = {
              ...loaded,
              sessionId: this.sessionId,
              updatedAt: (/* @__PURE__ */ new Date()).toISOString()
            };
          }
        } catch {
          this.data = createEmptyTelemetryData(this.sessionId);
        }
      }
      /**
       * Save telemetry data to disk
       */
      async save(baseDir) {
        if (!this.config.enabled) return;
        try {
          await ensureAutogenDir(baseDir);
          const telemetryPath = getAutogenArtifact("telemetry", baseDir);
          this.data.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
          writeFileSync(telemetryPath, JSON.stringify(this.data, null, 2), "utf-8");
        } catch {
        }
      }
      /**
       * Track command start
       */
      trackCommandStart(command) {
        if (!this.config.enabled) return "";
        const eventId = `${command}-${Date.now()}`;
        this.pendingCommands.set(eventId, {
          startTime: Date.now(),
          command
        });
        this.addEvent({
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          type: "command_start",
          command,
          data: { eventId }
        });
        return eventId;
      }
      /**
       * Track command end
       */
      trackCommandEnd(eventId, success, data = {}) {
        if (!this.config.enabled) return;
        const pending = this.pendingCommands.get(eventId);
        if (!pending) return;
        const durationMs = Date.now() - pending.startTime;
        const { command } = pending;
        if (!this.data.commandStats[command]) {
          this.data.commandStats[command] = {
            count: 0,
            successCount: 0,
            errorCount: 0,
            avgDurationMs: 0,
            totalDurationMs: 0,
            lastRun: null
          };
        }
        const stats = this.data.commandStats[command];
        stats.count++;
        if (success) {
          stats.successCount++;
        } else {
          stats.errorCount++;
        }
        stats.totalDurationMs += durationMs;
        stats.avgDurationMs = stats.totalDurationMs / stats.count;
        stats.lastRun = (/* @__PURE__ */ new Date()).toISOString();
        this.addEvent({
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          type: "command_end",
          command,
          data: { eventId, success, durationMs, ...data }
        });
        this.pendingCommands.delete(eventId);
      }
      /**
       * Track LLM usage
       */
      trackLLMUsage(command, usage, model = this.config.defaultModel) {
        if (!this.config.enabled) return;
        const cost = usage.estimatedCostUsd > 0 ? usage.estimatedCostUsd : estimateCost(usage, model);
        this.data.totalTokens += usage.totalTokens;
        this.data.totalCostUsd += cost;
        this.addEvent({
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          type: "llm_call",
          command,
          data: {
            model,
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
            totalTokens: usage.totalTokens,
            costUsd: cost
          }
        });
      }
      /**
       * Track error
       */
      trackError(command, errorType, message) {
        if (!this.config.enabled) return;
        this.data.errorCounts[errorType] = (this.data.errorCounts[errorType] || 0) + 1;
        this.addEvent({
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          type: "error",
          command,
          data: { errorType, message }
        });
      }
      /**
       * Track pipeline state transition
       */
      trackPipelineTransition(command, fromStage, toStage, data = {}) {
        if (!this.config.enabled) return;
        this.addEvent({
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          type: "pipeline_transition",
          command,
          data: { fromStage, toStage, ...data }
        });
      }
      addEvent(event) {
        this.data.recentEvents.push(event);
        if (this.data.recentEvents.length > this.config.maxEvents) {
          this.data.recentEvents = this.data.recentEvents.slice(-this.config.maxEvents);
        }
      }
      /**
       * Get telemetry summary
       */
      getSummary() {
        return {
          sessionId: this.sessionId,
          totalTokens: this.data.totalTokens,
          totalCostUsd: this.data.totalCostUsd,
          commandStats: { ...this.data.commandStats },
          topErrors: Object.entries(this.data.errorCounts).sort(([, a], [, b]) => b - a).slice(0, 5).map(([type, count]) => ({ type, count })),
          eventCount: this.data.recentEvents.length
        };
      }
      /**
       * Get raw data (for debugging)
       */
      getData() {
        return { ...this.data };
      }
      /**
       * Reset telemetry (for testing)
       */
      reset() {
        this.sessionId = this.generateSessionId();
        this.data = createEmptyTelemetryData(this.sessionId);
        this.pendingCommands.clear();
      }
    };
    globalTelemetry = null;
  }
});

// src/shared/index.ts
var init_shared = __esm({
  "src/shared/index.ts"() {
    init_types2();
    init_llm_response_parser();
    init_config_validator();
    init_cost_tracker();
    init_telemetry();
  }
});

// src/scot/types.ts
var init_types3 = __esm({
  "src/scot/types.ts"() {
  }
});

// src/scot/parser.ts
var init_parser2 = __esm({
  "src/scot/parser.ts"() {
    init_types2();
    init_llm_response_parser();
  }
});

// src/scot/validator.ts
var init_validator = __esm({
  "src/scot/validator.ts"() {
    init_types3();
  }
});

// src/scot/prompts.ts
var init_prompts = __esm({
  "src/scot/prompts.ts"() {
  }
});

// src/scot/planner.ts
var init_planner = __esm({
  "src/scot/planner.ts"() {
    init_parser2();
    init_validator();
    init_prompts();
  }
});

// src/scot/index.ts
var init_scot = __esm({
  "src/scot/index.ts"() {
    init_types3();
    init_parser2();
    init_validator();
    init_planner();
    init_prompts();
  }
});

// src/refinement/types.ts
var init_types4 = __esm({
  "src/refinement/types.ts"() {
  }
});

// src/refinement/error-parser.ts
var init_error_parser = __esm({
  "src/refinement/error-parser.ts"() {
  }
});

// src/refinement/convergence-detector.ts
function analyzeRefinementProgress(_attempts, circuitBreaker, convergenceDetector) {
  const cbState = circuitBreaker.getState();
  const convergenceInfo = convergenceDetector.getInfo();
  if (cbState.isOpen) {
    return {
      shouldContinue: false,
      reason: `Circuit breaker open: ${cbState.openReason}`,
      circuitBreaker: cbState,
      convergence: convergenceInfo,
      recommendation: "stop"
    };
  }
  if (convergenceInfo.converged) {
    return {
      shouldContinue: false,
      reason: "All errors resolved",
      circuitBreaker: cbState,
      convergence: convergenceInfo,
      recommendation: "stop"
    };
  }
  if (convergenceInfo.trend === "degrading") {
    return {
      shouldContinue: false,
      reason: "Error count increasing - fixes are making things worse",
      circuitBreaker: cbState,
      convergence: convergenceInfo,
      recommendation: "escalate"
    };
  }
  if (convergenceInfo.trend === "oscillating") {
    return {
      shouldContinue: false,
      reason: "Error counts oscillating - cannot converge",
      circuitBreaker: cbState,
      convergence: convergenceInfo,
      recommendation: "escalate"
    };
  }
  if (convergenceInfo.stagnationCount >= 2) {
    return {
      shouldContinue: false,
      reason: "No improvement in last 2 attempts - stagnating",
      circuitBreaker: cbState,
      convergence: convergenceInfo,
      recommendation: "escalate"
    };
  }
  return {
    shouldContinue: true,
    reason: "Progress being made",
    circuitBreaker: cbState,
    convergence: convergenceInfo,
    recommendation: "continue"
  };
}
var DEFAULT_CIRCUIT_BREAKER_CONFIG, CircuitBreaker, ConvergenceDetector;
var init_convergence_detector = __esm({
  "src/refinement/convergence-detector.ts"() {
    DEFAULT_CIRCUIT_BREAKER_CONFIG = {
      maxAttempts: 3,
      sameErrorThreshold: 2,
      oscillationDetection: true,
      oscillationWindowSize: 4,
      totalTimeoutMs: 3e5,
      // 5 minutes
      cooldownMs: 1e3,
      maxTokenBudget: 5e4
    };
    CircuitBreaker = class {
      config;
      state;
      constructor(options = {}) {
        const { initialState, ...config } = options;
        this.config = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config };
        if (initialState) {
          this.state = this.restoreState(initialState);
        } else {
          this.state = this.createInitialState();
        }
      }
      createInitialState() {
        return {
          isOpen: false,
          attemptCount: 0,
          errorHistory: [],
          startTime: /* @__PURE__ */ new Date(),
          tokensUsed: 0,
          maxAttempts: this.config.maxAttempts
        };
      }
      /**
       * Restore state from a saved CircuitBreakerState
       * This allows the circuit breaker to continue from a previous session
       * without double-counting attempts
       */
      restoreState(saved) {
        return {
          isOpen: saved.isOpen,
          openReason: saved.openReason,
          attemptCount: saved.attemptCount,
          errorHistory: [...saved.errorHistory || []],
          // Restore startTime or use now if not saved
          startTime: saved.startTime ? new Date(saved.startTime) : /* @__PURE__ */ new Date(),
          tokensUsed: saved.tokensUsed || 0,
          maxAttempts: this.config.maxAttempts
        };
      }
      /**
       * Reset the circuit breaker to initial state
       */
      reset() {
        this.state = this.createInitialState();
      }
      /**
       * Get current state
       */
      getState() {
        return { ...this.state };
      }
      /**
       * Record an attempt and check if circuit should open
       */
      recordAttempt(errors, tokenUsage) {
        if (this.state.isOpen) {
          return this.state;
        }
        this.state.attemptCount++;
        const fingerprints = errors.map((e) => e.fingerprint);
        this.state.errorHistory.push(...fingerprints);
        if (tokenUsage) {
          this.state.tokensUsed += tokenUsage.totalTokens;
        }
        this.checkMaxAttempts();
        this.checkSameError();
        this.checkOscillation();
        this.checkTimeout();
        this.checkBudget();
        return this.state;
      }
      /**
       * Check if we can make another attempt
       */
      canAttempt() {
        if (this.state.isOpen) {
          return false;
        }
        this.checkTimeout();
        return !this.state.isOpen;
      }
      /**
       * Get remaining attempts
       */
      remainingAttempts() {
        if (this.state.isOpen) return 0;
        return Math.max(0, this.config.maxAttempts - this.state.attemptCount);
      }
      /**
       * Get remaining token budget
       */
      remainingTokenBudget() {
        return Math.max(0, this.config.maxTokenBudget - this.state.tokensUsed);
      }
      /**
       * Estimate if operation would exceed budget
       */
      wouldExceedBudget(estimatedTokens) {
        return this.state.tokensUsed + estimatedTokens > this.config.maxTokenBudget;
      }
      // ─────────────────────────────────────────────────────────────────────────
      // PRIVATE CHECKS
      // ─────────────────────────────────────────────────────────────────────────
      checkMaxAttempts() {
        if (this.state.attemptCount >= this.config.maxAttempts) {
          this.openCircuit("MAX_ATTEMPTS");
        }
      }
      checkSameError() {
        if (this.state.errorHistory.length < this.config.sameErrorThreshold) {
          return;
        }
        const counts = /* @__PURE__ */ new Map();
        for (const fp of this.state.errorHistory) {
          counts.set(fp, (counts.get(fp) || 0) + 1);
        }
        for (const count of counts.values()) {
          if (count >= this.config.sameErrorThreshold) {
            this.openCircuit("SAME_ERROR");
            return;
          }
        }
      }
      checkOscillation() {
        if (!this.config.oscillationDetection) {
          return;
        }
        const history = this.state.errorHistory;
        const windowSize = this.config.oscillationWindowSize;
        if (history.length < windowSize) {
          return;
        }
        const recentHistory = history.slice(-windowSize);
        const unique = new Set(recentHistory);
        if (unique.size === 2) {
          let isAlternating = true;
          for (let i = 2; i < recentHistory.length; i++) {
            const currentItem = recentHistory[i];
            const previousItem = recentHistory[i - 2];
            if (currentItem !== void 0 && previousItem !== void 0 && currentItem !== previousItem) {
              isAlternating = false;
              break;
            }
          }
          if (isAlternating) {
            this.openCircuit("OSCILLATION");
          }
        }
      }
      checkTimeout() {
        if (!this.state.startTime) return;
        const elapsed = Date.now() - this.state.startTime.getTime();
        if (elapsed >= this.config.totalTimeoutMs) {
          this.openCircuit("TIMEOUT");
        }
      }
      checkBudget() {
        if (this.state.tokensUsed >= this.config.maxTokenBudget) {
          this.openCircuit("BUDGET_EXCEEDED");
        }
      }
      openCircuit(reason) {
        this.state.isOpen = true;
        this.state.openReason = reason;
      }
    };
    ConvergenceDetector = class {
      errorCountHistory = [];
      uniqueErrorsHistory = [];
      lastImprovement;
      stagnationCount = 0;
      /**
       * Record errors from an attempt
       */
      recordAttempt(errors) {
        const count = errors.length;
        const uniqueFingerprints = new Set(errors.map((e) => e.fingerprint));
        this.errorCountHistory.push(count);
        this.uniqueErrorsHistory.push(uniqueFingerprints);
        if (this.errorCountHistory.length >= 2) {
          const prev = this.errorCountHistory[this.errorCountHistory.length - 2] ?? 0;
          const curr = this.errorCountHistory[this.errorCountHistory.length - 1] ?? 0;
          if (curr < prev) {
            this.lastImprovement = this.errorCountHistory.length - 1;
            this.stagnationCount = 0;
          } else {
            this.stagnationCount++;
          }
        }
      }
      /**
       * Get convergence information
       */
      getInfo() {
        const converged = this.isConverged();
        const trend = this.detectTrend();
        return {
          converged,
          attempts: this.errorCountHistory.length,
          errorCountHistory: [...this.errorCountHistory],
          uniqueErrorsHistory: this.uniqueErrorsHistory.map((s) => new Set(s)),
          lastImprovement: this.lastImprovement,
          stagnationCount: this.stagnationCount,
          trend
        };
      }
      /**
       * Check if we've converged (no errors)
       */
      isConverged() {
        if (this.errorCountHistory.length === 0) return false;
        return this.errorCountHistory[this.errorCountHistory.length - 1] === 0;
      }
      /**
       * Detect the trend in error counts
       */
      detectTrend() {
        if (this.errorCountHistory.length < 2) {
          return "stagnating";
        }
        const recent = this.errorCountHistory.slice(-3);
        if (this.isOscillating()) {
          return "oscillating";
        }
        const decreasing = recent.every(
          (val, i, arr) => i === 0 || val <= (arr[i - 1] ?? val)
        );
        const increasing = recent.every(
          (val, i, arr) => i === 0 || val >= (arr[i - 1] ?? val)
        );
        const allSame = recent.every((val, _, arr) => val === arr[0]);
        if (allSame || this.stagnationCount >= 2) {
          return "stagnating";
        }
        if (decreasing) {
          return "improving";
        }
        if (increasing) {
          return "degrading";
        }
        return "stagnating";
      }
      /**
       * Check if error counts are oscillating
       */
      isOscillating() {
        if (this.errorCountHistory.length < 4) {
          return false;
        }
        const recent = this.errorCountHistory.slice(-4);
        const diff01 = (recent[1] || 0) - (recent[0] || 0);
        const diff12 = (recent[2] || 0) - (recent[1] || 0);
        const diff23 = (recent[3] || 0) - (recent[2] || 0);
        const signsAlternate = Math.sign(diff01) !== 0 && Math.sign(diff01) === -Math.sign(diff12) && Math.sign(diff12) === -Math.sign(diff23);
        return signsAlternate;
      }
      /**
       * Calculate improvement percentage
       */
      getImprovementPercentage() {
        if (this.errorCountHistory.length < 2) {
          return 0;
        }
        const first = this.errorCountHistory[0] || 0;
        const last = this.errorCountHistory[this.errorCountHistory.length - 1] || 0;
        if (first === 0) {
          return last === 0 ? 100 : 0;
        }
        return Math.round((first - last) / first * 100);
      }
      /**
       * Get new errors introduced in last attempt (not in previous)
       */
      getNewErrors() {
        if (this.uniqueErrorsHistory.length < 2) {
          const firstEntry = this.uniqueErrorsHistory[0];
          return firstEntry ? firstEntry : /* @__PURE__ */ new Set();
        }
        const prev = this.uniqueErrorsHistory[this.uniqueErrorsHistory.length - 2];
        const curr = this.uniqueErrorsHistory[this.uniqueErrorsHistory.length - 1];
        if (!prev || !curr) {
          return /* @__PURE__ */ new Set();
        }
        const newErrors = /* @__PURE__ */ new Set();
        for (const fp of curr) {
          if (!prev.has(fp)) {
            newErrors.add(fp);
          }
        }
        return newErrors;
      }
      /**
       * Get errors fixed in last attempt (in previous but not current)
       */
      getFixedErrors() {
        if (this.uniqueErrorsHistory.length < 2) {
          return /* @__PURE__ */ new Set();
        }
        const prev = this.uniqueErrorsHistory[this.uniqueErrorsHistory.length - 2];
        const curr = this.uniqueErrorsHistory[this.uniqueErrorsHistory.length - 1];
        if (!prev || !curr) {
          return /* @__PURE__ */ new Set();
        }
        const fixedErrors = /* @__PURE__ */ new Set();
        for (const fp of prev) {
          if (!curr.has(fp)) {
            fixedErrors.add(fp);
          }
        }
        return fixedErrors;
      }
      /**
       * Reset the detector
       */
      reset() {
        this.errorCountHistory = [];
        this.uniqueErrorsHistory = [];
        this.lastImprovement = void 0;
        this.stagnationCount = 0;
      }
      /**
       * Restore detector state from saved error count history
       * This allows the detector to continue from a previous session
       * without losing context about convergence trends
       */
      restoreFromHistory(savedErrorCounts) {
        if (!savedErrorCounts || savedErrorCounts.length === 0) {
          return;
        }
        this.errorCountHistory = [...savedErrorCounts];
        this.uniqueErrorsHistory = savedErrorCounts.map(() => /* @__PURE__ */ new Set());
        this.lastImprovement = void 0;
        this.stagnationCount = 0;
        for (let i = 1; i < savedErrorCounts.length; i++) {
          const prev = savedErrorCounts[i - 1];
          const curr = savedErrorCounts[i];
          if (prev !== void 0 && curr !== void 0 && curr < prev) {
            this.lastImprovement = i;
            this.stagnationCount = 0;
          } else {
            this.stagnationCount++;
          }
        }
      }
      /**
       * Get the error count history for serialization
       */
      getErrorCountHistory() {
        return [...this.errorCountHistory];
      }
    };
  }
});

// src/refinement/refinement-loop.ts
var init_refinement_loop = __esm({
  "src/refinement/refinement-loop.ts"() {
    init_types2();
    init_error_parser();
    init_convergence_detector();
  }
});

// src/refinement/llkb-learning.ts
function extractLessonsFromSession(session, options = {}) {
  const opts = { ...DEFAULT_EXTRACTION_OPTIONS, ...options };
  const lessons = [];
  for (const attempt of session.attempts) {
    if (attempt.outcome !== "success" && attempt.outcome !== "partial") {
      continue;
    }
    if (!attempt.appliedFix) {
      continue;
    }
    const fix = attempt.appliedFix;
    if (fix.confidence < opts.minConfidence) {
      continue;
    }
    const lesson = createLessonFromFix(
      session.journeyId,
      fix,
      attempt.error,
      attempt.outcome === "success"
      // verified only if full success
    );
    if (lesson && (lesson.verified || opts.includeUnverified)) {
      lessons.push(lesson);
    }
    if (lessons.length >= opts.maxLessonsPerSession) {
      break;
    }
  }
  return lessons;
}
function createLessonFromFix(journeyId, fix, error, verified) {
  const type = mapFixTypeToLessonType(fix.type);
  if (!type) {
    return void 0;
  }
  return {
    id: generateLessonId(journeyId, fix, error),
    type,
    context: {
      journeyId,
      errorCategory: error.category,
      originalSelector: error.selector,
      element: extractElementDescription(fix, error)
    },
    solution: {
      pattern: extractPattern(fix),
      code: fix.fixedCode,
      explanation: fix.reasoning || fix.description
    },
    confidence: fix.confidence,
    createdAt: /* @__PURE__ */ new Date(),
    verified
  };
}
function mapFixTypeToLessonType(fixType) {
  switch (fixType) {
    case "SELECTOR_CHANGE":
    case "LOCATOR_STRATEGY_CHANGED":
    case "FRAME_CONTEXT_ADDED":
      return "selector_pattern";
    case "WAIT_ADDED":
    case "TIMEOUT_INCREASED":
    case "RETRY_ADDED":
      return "wait_strategy";
    case "FLOW_REORDERED":
      return "flow_pattern";
    case "ASSERTION_MODIFIED":
    case "ERROR_HANDLING_ADDED":
    case "OTHER":
      return "error_fix";
    default:
      return void 0;
  }
}
function generateLessonId(journeyId, fix, error) {
  const timestamp = Date.now();
  const fixHash = hashString(fix.fixedCode.substring(0, 50));
  return `lesson-${journeyId}-${error.category}-${fixHash}-${timestamp}`;
}
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}
function extractElementDescription(fix, error) {
  if (fix.location.stepDescription) {
    return fix.location.stepDescription;
  }
  if (error.selector) {
    return extractElementFromSelector(error.selector);
  }
  const locatorMatch = fix.fixedCode.match(/getBy\w+\(['"]([^'"]+)['"]\)/);
  if (locatorMatch && locatorMatch[1]) {
    return locatorMatch[1];
  }
  return "unknown element";
}
function extractElementFromSelector(selector) {
  const testIdMatch = selector.match(/data-testid[=~*^$]*["']?([^"'\]]+)/);
  if (testIdMatch && testIdMatch[1]) {
    return testIdMatch[1];
  }
  const roleMatch = selector.match(/role=["']?([^"'\]]+)/);
  if (roleMatch && roleMatch[1]) {
    return roleMatch[1];
  }
  const classMatch = selector.match(/\.([a-zA-Z0-9_-]+)/);
  if (classMatch && classMatch[1]) {
    return classMatch[1];
  }
  return selector.substring(0, 30);
}
function extractPattern(fix) {
  switch (fix.type) {
    case "SELECTOR_CHANGE":
      return extractSelectorPattern(fix.fixedCode);
    case "WAIT_ADDED":
      return extractWaitPattern(fix.fixedCode);
    case "ASSERTION_MODIFIED":
      return extractAssertionPattern(fix.fixedCode);
    default:
      return fix.type;
  }
}
function extractSelectorPattern(code) {
  if (code.includes("getByTestId")) return "testid";
  if (code.includes("getByRole")) return "role";
  if (code.includes("getByText")) return "text";
  if (code.includes("getByLabel")) return "label";
  if (code.includes("getByPlaceholder")) return "placeholder";
  if (code.includes("locator")) return "css";
  return "unknown";
}
function extractWaitPattern(code) {
  if (code.includes("waitForSelector")) return "waitForSelector";
  if (code.includes("waitForLoadState")) return "waitForLoadState";
  if (code.includes("waitForResponse")) return "waitForResponse";
  if (code.includes("waitForTimeout")) return "waitForTimeout";
  if (code.includes("toBeVisible")) return "expectVisible";
  return "unknown";
}
function extractAssertionPattern(code) {
  if (code.includes("toHaveText")) return "toHaveText";
  if (code.includes("toHaveValue")) return "toHaveValue";
  if (code.includes("toBeVisible")) return "toBeVisible";
  if (code.includes("toBeEnabled")) return "toBeEnabled";
  if (code.includes("toHaveCount")) return "toHaveCount";
  return "unknown";
}
var DEFAULT_EXTRACTION_OPTIONS;
var init_llkb_learning = __esm({
  "src/refinement/llkb-learning.ts"() {
    DEFAULT_EXTRACTION_OPTIONS = {
      minConfidence: 0.7,
      includeUnverified: false,
      maxLessonsPerSession: 10
    };
  }
});
var init_llkb_storage = __esm({
  "src/refinement/llkb-storage.ts"() {
    init_paths();
  }
});
async function checkPlaywrightInstalled(cwd) {
  return new Promise((resolve8) => {
    const proc = spawn("npx", ["playwright", "--version"], {
      cwd: getHarnessRoot(),
      env: process.env
    });
    let stdout = "";
    let stderr = "";
    proc.stdout?.on("data", (data) => {
      stdout += data.toString();
    });
    proc.stderr?.on("data", (data) => {
      stderr += data.toString();
    });
    proc.on("close", (code) => {
      if (code === 0) {
        const versionMatch = stdout.match(/(\d+\.\d+\.\d+)/);
        resolve8({
          installed: true,
          version: versionMatch && versionMatch[1] ? versionMatch[1] : void 0
        });
      } else {
        resolve8({
          installed: false,
          error: stderr || "Playwright not found. Run: npx playwright install"
        });
      }
    });
    proc.on("error", (err3) => {
      resolve8({
        installed: false,
        error: `Failed to check Playwright: ${err3.message}`
      });
    });
    setTimeout(() => {
      proc.kill();
      resolve8({
        installed: false,
        error: "Playwright check timed out"
      });
    }, 1e4);
  });
}
var init_playwright_runner = __esm({
  "src/refinement/playwright-runner.ts"() {
    init_paths();
  }
});

// src/refinement/index.ts
var init_refinement = __esm({
  "src/refinement/index.ts"() {
    init_types4();
    init_error_parser();
    init_convergence_detector();
    init_refinement_loop();
    init_llkb_learning();
    init_llkb_storage();
    init_playwright_runner();
  }
});

// src/uncertainty/types.ts
var init_types5 = __esm({
  "src/uncertainty/types.ts"() {
  }
});

// src/uncertainty/syntax-validator.ts
var init_syntax_validator = __esm({
  "src/uncertainty/syntax-validator.ts"() {
  }
});

// src/uncertainty/pattern-matcher.ts
var init_pattern_matcher = __esm({
  "src/uncertainty/pattern-matcher.ts"() {
  }
});

// src/uncertainty/selector-analyzer.ts
var init_selector_analyzer = __esm({
  "src/uncertainty/selector-analyzer.ts"() {
  }
});

// src/uncertainty/confidence-scorer.ts
var init_confidence_scorer = __esm({
  "src/uncertainty/confidence-scorer.ts"() {
    init_types5();
    init_syntax_validator();
    init_pattern_matcher();
    init_selector_analyzer();
  }
});
function createOrchestratorSampleRequest(prompt, journeyId, config = DEFAULT_MULTI_SAMPLER_CONFIG) {
  return {
    prompt,
    journeyId,
    temperatures: config.temperatures,
    instructions: `
Generate ${config.sampleCount} different versions of the Playwright test code.
For each version, use a different "creative temperature":
${config.temperatures.map((t, i) => `- Version ${i + 1}: Temperature ${t} (${t < 0.3 ? "conservative" : t < 0.6 ? "balanced" : "creative"})`).join("\n")}

Save each version as a separate code block labeled with the version number.
The goal is to explore different approaches and identify areas of agreement/disagreement.

After generating all versions, provide a brief analysis:
1. What elements are consistent across all versions (high agreement)
2. What elements differ between versions (disagreement areas)
3. Which version you recommend as the best consensus

Minimum agreement score threshold: ${config.minAgreementScore}
`
  };
}
var DEFAULT_MULTI_SAMPLER_CONFIG;
var init_multi_sampler = __esm({
  "src/uncertainty/multi-sampler.ts"() {
    init_paths();
    DEFAULT_MULTI_SAMPLER_CONFIG = {
      sampleCount: 3,
      temperatures: [0.2, 0.5, 0.8],
      minAgreementScore: 0.7,
      persistSamples: true
    };
  }
});

// src/uncertainty/index.ts
var init_uncertainty = __esm({
  "src/uncertainty/index.ts"() {
    init_types5();
    init_syntax_validator();
    init_pattern_matcher();
    init_selector_analyzer();
    init_confidence_scorer();
    init_multi_sampler();
  }
});
async function generateJourneyTests(options) {
  const {
    journeys,
    isFilePaths = true,
    config,
    generateModules = false,
    testOptions = {},
    moduleOptions = {},
    useLlkb = true
  } = options;
  const result = {
    tests: [],
    modules: [],
    warnings: [],
    errors: []
  };
  if (useLlkb) {
    const llkbLoaded = await initializeLlkb();
    if (llkbLoaded) {
      result.llkbEnabled = true;
    }
  }
  let resolvedConfig;
  if (config) {
    if (typeof config === "string") {
      try {
        resolvedConfig = loadConfig(config);
      } catch (err3) {
        result.errors.push(`Failed to load config: ${err3 instanceof Error ? err3.message : String(err3)}`);
      }
    } else {
      resolvedConfig = config;
    }
  }
  for (const journey of journeys) {
    try {
      const parsed = isFilePaths ? parseJourney(journey) : parseJourneyContent(journey, "inline");
      const normalized = normalizeJourney(parsed);
      result.warnings.push(...normalized.warnings);
      const testResult = generateTest(normalized.journey, testOptions);
      result.tests.push({
        journeyId: testResult.journeyId,
        filename: testResult.filename,
        code: testResult.code
      });
      if (generateModules) {
        const moduleResult = generateModule(normalized.journey, moduleOptions);
        result.modules.push({
          moduleName: moduleResult.moduleName,
          filename: moduleResult.filename,
          code: moduleResult.code
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(`Failed to process journey ${journey}: ${errorMessage}`);
    }
  }
  return result;
}
async function validateJourney(journeyInput, options = {}) {
  const { isFilePath = true, runLint = false, ...validationOptions } = options;
  try {
    const parsed = isFilePath ? parseJourney(journeyInput) : parseJourneyContent(journeyInput, "inline");
    const normalized = normalizeJourney(parsed);
    const testResult = generateTest(normalized.journey);
    const validationResult = runLint ? await validateCode(testResult.code, normalized.journey, parsed.frontmatter, validationOptions) : validateCodeSync(testResult.code, normalized.journey, parsed.frontmatter, validationOptions);
    return {
      ...validationResult,
      generatedCode: testResult.code
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      valid: false,
      journeyId: options.journeyId || "unknown",
      issues: [
        {
          code: "JOURNEY_PARSE_ERROR",
          message: `Failed to parse or generate: ${errorMessage}`,
          severity: "error"
        }
      ],
      counts: { errors: 1, warnings: 0, info: 0 },
      details: {
        patterns: { valid: false, violationCount: 0 }
      },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
}
async function validateJourneys(journeys, options = {}) {
  const results = /* @__PURE__ */ new Map();
  for (const journey of journeys) {
    const result = await validateJourney(journey, options);
    results.set(result.journeyId, result);
  }
  return results;
}
async function verifyJourney(journeyInput, options = {}) {
  const {
    isFilePath = true,
    outputDir,
    checkStability: checkStability2 = false,
    stabilityRuns = 3,
    heal = false,
    maxHealAttempts = 3,
    ...runnerOptions
  } = options;
  try {
    const parsed = isFilePath ? parseJourney(journeyInput) : parseJourneyContent(journeyInput, "inline");
    const journeyId = parsed.frontmatter.id;
    const normalized = normalizeJourney(parsed);
    const testResult = generateTest(normalized.journey);
    const testDir = outputDir || join(tmpdir(), `autogen-verify-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    const testFilePath = join(testDir, testResult.filename);
    writeFileSync(testFilePath, testResult.code, "utf-8");
    const runResult = runPlaywrightSync({
      ...runnerOptions,
      testFile: testFilePath,
      cwd: testDir,
      repeatEach: checkStability2 ? stabilityRuns : void 0,
      failOnFlaky: checkStability2
    });
    let summary = generateVerifySummary(runResult, {
      journeyId
    });
    let healingResult;
    if (heal && summary.status === "failed") {
      const { runHealingLoop: runHealingLoop2, DEFAULT_HEALING_CONFIG: DEFAULT_HEALING_CONFIG2 } = await Promise.resolve().then(() => (init_heal(), heal_exports));
      const healResult = await runHealingLoop2({
        journeyId,
        testFile: testFilePath,
        outputDir: testDir,
        config: {
          ...DEFAULT_HEALING_CONFIG2,
          maxAttempts: maxHealAttempts
        },
        verifyFn: async () => {
          const rerunResult = runPlaywrightSync({
            ...runnerOptions,
            testFile: testFilePath,
            cwd: testDir
          });
          return generateVerifySummary(rerunResult, { journeyId });
        }
      });
      healingResult = {
        attempted: true,
        success: healResult.success,
        attempts: healResult.attempts,
        appliedFix: healResult.appliedFix,
        logPath: healResult.logPath
      };
      if (healResult.success) {
        const finalResult = runPlaywrightSync({
          ...runnerOptions,
          testFile: testFilePath,
          cwd: testDir
        });
        summary = generateVerifySummary(finalResult, { journeyId });
      }
    }
    return {
      ...summary,
      generatedCode: testResult.code,
      testFilePath,
      healing: healingResult
    };
  } catch {
    return {
      status: "error",
      journeyId: options.journeyId,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      duration: 0,
      counts: { total: 0, passed: 0, failed: 0, skipped: 0, flaky: 0 },
      failures: {
        tests: [],
        classifications: {},
        stats: {}
      },
      runner: { exitCode: 1, command: "" }
    };
  }
}
async function verifyJourneys(journeys, options = {}) {
  const results = /* @__PURE__ */ new Map();
  for (const journey of journeys) {
    const result = await verifyJourney(journey, options);
    results.set(result.journeyId || journey, result);
  }
  return results;
}
var VERSION;
var init_index = __esm({
  "src/index.ts"() {
    init_types();
    init_builder();
    init_serialize();
    init_schema();
    init_loader();
    init_parseJourney();
    init_normalize();
    init_hintPatterns();
    init_parseHints();
    init_patterns();
    init_glossary();
    init_stepMapper();
    init_priority();
    init_infer();
    init_catalogSchema();
    init_catalog();
    init_scanner();
    init_debt();
    init_generateTest();
    init_generateModule();
    init_astEdit();
    init_registry();
    init_blocks();
    init_escaping();
    init_version();
    init_parsing();
    init_result();
    init_paths();
    init_validate();
    init_verify();
    init_heal();
    init_install();
    init_upgrade();
    init_shared();
    init_scot();
    init_refinement();
    init_uncertainty();
    init_parseJourney();
    init_normalize();
    init_generateTest();
    init_generateModule();
    init_loader();
    init_stepMapper();
    init_code();
    init_runner();
    init_summary();
    VERSION = "1.0.0";
  }
});
function createEmptyState() {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  return {
    version: "1.0",
    stage: "initial",
    lastCommand: "init",
    lastCommandAt: now,
    journeyIds: [],
    testPaths: [],
    refinementAttempts: 0,
    isBlocked: false,
    history: [],
    createdAt: now,
    updatedAt: now
  };
}
function backupCorruptedFile(statePath) {
  const backupPath = `${statePath}.corrupted.${Date.now()}`;
  try {
    renameSync(statePath, backupPath);
    return backupPath;
  } catch {
    return void 0;
  }
}
function loadPipelineState(baseDir) {
  const statePath = getAutogenArtifact("state", baseDir);
  if (!existsSync(statePath)) {
    return createEmptyState();
  }
  let content;
  let parsed;
  try {
    content = readFileSync(statePath, "utf-8");
  } catch (error) {
    console.warn(`Warning: Cannot read pipeline state file: ${statePath}`);
    console.warn(`  Error: ${error instanceof Error ? error.message : "Unknown"}`);
    return createEmptyState();
  }
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    console.warn(`Warning: Pipeline state file contains invalid JSON, creating backup and resetting.`);
    console.warn(`  Error: ${error instanceof Error ? error.message : "Unknown"}`);
    const backupPath = backupCorruptedFile(statePath);
    if (backupPath) {
      console.warn(`  Backup saved to: ${backupPath}`);
    }
    return createEmptyState();
  }
  const validation = PipelineStateSchema.safeParse(parsed);
  if (!validation.success) {
    console.warn(`Warning: Pipeline state file has invalid structure, creating backup and resetting.`);
    const errors = validation.error.errors.slice(0, 3);
    for (const err3 of errors) {
      console.warn(`  - ${err3.path.join(".")}: ${err3.message}`);
    }
    if (validation.error.errors.length > 3) {
      console.warn(`  ... and ${validation.error.errors.length - 3} more errors`);
    }
    const backupPath = backupCorruptedFile(statePath);
    if (backupPath) {
      console.warn(`  Backup saved to: ${backupPath}`);
    }
    return createEmptyState();
  }
  const state = validation.data;
  const knownFields = /* @__PURE__ */ new Set([
    "version",
    "stage",
    "lastCommand",
    "lastCommandAt",
    "journeyIds",
    "testPaths",
    "refinementAttempts",
    "isBlocked",
    "blockedReason",
    "history",
    "createdAt",
    "updatedAt"
  ]);
  const unknownFields = Object.keys(parsed).filter((k) => !knownFields.has(k));
  if (unknownFields.length > 0) {
    console.warn(`Warning: Pipeline state has unknown fields (may be from newer version): ${unknownFields.join(", ")}`);
  }
  if (!VALID_STAGES.includes(state.stage)) {
    console.warn(`Warning: Invalid pipeline stage "${state.stage}", resetting to "initial"`);
    state.stage = "initial";
  }
  return state;
}
async function savePipelineState(state, baseDir) {
  await ensureAutogenDir(baseDir);
  const statePath = getAutogenArtifact("state", baseDir);
  state.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  const content = JSON.stringify(state, null, 2);
  const tempPath = join(dirname(statePath), `.state-${process.pid}-${Date.now()}.tmp`);
  try {
    writeFileSync(tempPath, content, "utf-8");
    renameSync(tempPath, statePath);
  } catch (err3) {
    try {
      if (existsSync(tempPath)) {
        unlinkSync(tempPath);
      }
    } catch {
    }
    throw err3;
  }
}
async function updatePipelineState(command, stage, success, details, baseDir) {
  const state = loadPipelineState(baseDir);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  state.stage = stage;
  state.lastCommand = command;
  state.lastCommandAt = now;
  state.history.push({
    command,
    stage,
    timestamp: now,
    success,
    details
  });
  const HISTORY_MAX_ENTRIES = 100;
  if (state.history.length > HISTORY_MAX_ENTRIES) {
    state.history = state.history.slice(-HISTORY_MAX_ENTRIES);
  }
  if (details?.journeyIds) {
    state.journeyIds = details.journeyIds;
  }
  if (details?.testPaths) {
    state.testPaths = details.testPaths;
  }
  if (details?.refinementAttempts !== void 0) {
    state.refinementAttempts = details.refinementAttempts;
  }
  if (details?.isBlocked !== void 0) {
    state.isBlocked = details.isBlocked;
    state.blockedReason = details.blockedReason;
  }
  await savePipelineState(state, baseDir);
  return state;
}
async function resetPipelineState(baseDir) {
  await savePipelineState(createEmptyState(), baseDir);
}
function canProceedTo(currentState, targetStage) {
  const validTransitions = {
    initial: ["analyzed"],
    analyzed: ["planned", "initial"],
    // Can go back via clean
    planned: ["generated", "analyzed", "initial"],
    generated: ["tested", "planned", "initial"],
    tested: ["refining", "completed", "generated", "initial"],
    refining: ["tested", "completed", "blocked", "initial"],
    completed: ["initial", "analyzed"],
    // Can restart
    blocked: ["initial", "analyzed"]
    // Can only restart or re-analyze
  };
  const allowed = validTransitions[currentState.stage]?.includes(targetStage) ?? false;
  if (!allowed) {
    return {
      allowed: false,
      reason: `Cannot transition from '${currentState.stage}' to '${targetStage}'. Valid transitions: ${validTransitions[currentState.stage]?.join(", ") || "none"}`
    };
  }
  if (currentState.isBlocked && !["initial", "analyzed"].includes(targetStage)) {
    return {
      allowed: false,
      reason: `Pipeline is blocked: ${currentState.blockedReason}. Clean or re-analyze to continue.`
    };
  }
  return { allowed: true };
}
function getPipelineStateSummary(state) {
  const lines = [
    `Stage: ${state.stage}`,
    `Last command: ${state.lastCommand} at ${state.lastCommandAt}`
  ];
  if (state.journeyIds.length > 0) {
    lines.push(`Journeys: ${state.journeyIds.length}`);
  }
  if (state.testPaths.length > 0) {
    lines.push(`Tests: ${state.testPaths.length}`);
  }
  if (state.refinementAttempts > 0) {
    lines.push(`Refinement attempts: ${state.refinementAttempts}`);
  }
  if (state.isBlocked) {
    lines.push(`BLOCKED: ${state.blockedReason}`);
  }
  return lines.join("\n");
}
var VALID_STAGES, PipelineHistoryEntrySchema, PipelineStateSchema;
var init_state = __esm({
  "src/pipeline/state.ts"() {
    init_paths();
    VALID_STAGES = [
      "initial",
      "analyzed",
      "planned",
      "generated",
      "tested",
      "refining",
      "completed",
      "blocked"
    ];
    PipelineHistoryEntrySchema = z.object({
      command: z.string(),
      stage: z.enum(["initial", "analyzed", "planned", "generated", "tested", "refining", "completed", "blocked"]),
      timestamp: z.string(),
      success: z.boolean(),
      details: z.record(z.unknown()).optional()
    });
    PipelineStateSchema = z.object({
      version: z.literal("1.0"),
      stage: z.enum(["initial", "analyzed", "planned", "generated", "tested", "refining", "completed", "blocked"]),
      lastCommand: z.string(),
      lastCommandAt: z.string(),
      journeyIds: z.array(z.string()),
      testPaths: z.array(z.string()),
      refinementAttempts: z.number(),
      isBlocked: z.boolean(),
      blockedReason: z.string().optional(),
      history: z.array(PipelineHistoryEntrySchema),
      createdAt: z.string(),
      updatedAt: z.string()
    }).passthrough();
  }
});

// src/cli/analyze.ts
var analyze_exports = {};
__export(analyze_exports, {
  runAnalyze: () => runAnalyze
});
function classifyStep(stepText) {
  for (const [type, patterns] of Object.entries(STEP_PATTERNS)) {
    if (patterns.some((p) => p.test(stepText))) {
      return type;
    }
  }
  return "unknown";
}
function extractKeywords(stepText) {
  const uiKeywords = [
    "button",
    "link",
    "input",
    "field",
    "form",
    "modal",
    "dialog",
    "dropdown",
    "menu",
    "tab",
    "panel",
    "table",
    "row",
    "cell",
    "checkbox",
    "radio",
    "toggle",
    "switch",
    "slider",
    "spinner",
    "toast",
    "alert",
    "notification",
    "message",
    "error",
    "success",
    "header",
    "footer",
    "sidebar",
    "nav",
    "navigation",
    "search",
    "filter",
    "sort",
    "pagination",
    "page",
    "screen",
    "view"
  ];
  const words = stepText.toLowerCase().split(/\s+/);
  return words.filter((w) => uiKeywords.includes(w) || w.length > 3);
}
function hasSelector(stepText) {
  return /["'].*["']/.test(stepText) || /data-testid/i.test(stepText) || /\[.*\]/.test(stepText) || /#\w+/.test(stepText) || /\.\w+/.test(stepText);
}
function hasAssertion(stepText) {
  return STEP_PATTERNS.assertion.some((p) => p.test(stepText));
}
function estimateComplexity(stepText, type) {
  const text = stepText.toLowerCase();
  if (text.includes("table") || text.includes("grid") || text.includes("ag-grid")) {
    return "high";
  }
  if (text.includes("drag") || text.includes("drop")) {
    return "high";
  }
  if (text.includes("upload") || text.includes("file")) {
    return "high";
  }
  if (text.includes("iframe") || text.includes("frame")) {
    return "high";
  }
  if (type === "form" || type === "wait") {
    return "medium";
  }
  if (text.includes("modal") || text.includes("dialog")) {
    return "medium";
  }
  return "low";
}
function analyzeStep(stepText, index) {
  const type = classifyStep(stepText);
  return {
    index,
    text: stepText,
    type,
    hasSelector: hasSelector(stepText),
    hasAssertion: hasAssertion(stepText),
    estimatedComplexity: estimateComplexity(stepText, type),
    keywords: extractKeywords(stepText)
  };
}
function parseJourneyFile(filePath) {
  const content = readFileSync(filePath, "utf-8");
  const warnings = [];
  let frontmatter = {};
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (fmMatch && fmMatch[1]) {
    try {
      frontmatter = yaml.parse(fmMatch[1]) || {};
    } catch (e) {
      warnings.push(`Failed to parse frontmatter: ${e}`);
    }
  }
  const acceptanceCriteria = [];
  const acMatch = content.match(/##\s*Acceptance Criteria\s*\n([\s\S]*?)(?=\n##|\n---|$)/i);
  if (acMatch && acMatch[1]) {
    const lines = acMatch[1].split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || /^\d+\./.test(trimmed)) {
        acceptanceCriteria.push(trimmed.replace(/^[-*\d.]+\s*/, ""));
      }
    }
  }
  const steps = [];
  const stepsMatch = content.match(/##\s*(?:Steps|Procedure|Test Steps)\s*\n([\s\S]*?)(?=\n##|\n---|$)/i);
  if (stepsMatch && stepsMatch[1]) {
    const lines = stepsMatch[1].split("\n");
    let stepIndex = 0;
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || /^\d+\./.test(trimmed)) {
        const stepText = trimmed.replace(/^[-*\d.]+\s*/, "");
        if (stepText) {
          steps.push(analyzeStep(stepText, stepIndex++));
        }
      }
    }
  }
  const stepCount = steps.length;
  const assertionCount = steps.filter((s) => s.hasAssertion).length;
  const interactionCount = steps.filter((s) => s.type === "interaction").length;
  const formSteps = steps.filter((s) => s.type === "form").length;
  const navigationSteps = steps.filter((s) => s.type === "navigation").length;
  let overall = "simple";
  if (stepCount > 15 || steps.some((s) => s.estimatedComplexity === "high")) {
    overall = "complex";
  } else if (stepCount > 8 || formSteps > 3) {
    overall = "moderate";
  }
  const estimatedLOC = 20 + stepCount * 5 + assertionCount * 3 + formSteps * 8;
  const journeyId = frontmatter.id || basename(filePath, ".md");
  return {
    journeyId,
    journeyPath: filePath,
    title: frontmatter.title || journeyId,
    tier: frontmatter.tier || "regression",
    status: frontmatter.status || "proposed",
    actor: frontmatter.actor || "user",
    scope: frontmatter.scope || [],
    acceptanceCriteria,
    steps,
    dependencies: frontmatter.dependencies || [],
    complexity: {
      overall,
      stepCount,
      assertionCount,
      interactionCount,
      formSteps,
      navigationSteps,
      estimatedLOC
    },
    warnings,
    analyzedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function runAnalyze(args) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      output: { type: "string", short: "o" },
      json: { type: "boolean", default: false },
      quiet: { type: "boolean", short: "q", default: false },
      force: { type: "boolean", short: "f", default: false },
      help: { type: "boolean", short: "h", default: false }
    },
    allowPositionals: true
  });
  if (values.help) {
    console.log(USAGE);
    return;
  }
  if (positionals.length === 0) {
    console.error("Error: No journey files specified");
    console.log(USAGE);
    process.exit(1);
  }
  const quiet = values.quiet;
  const outputJson = values.json;
  const force = values.force;
  if (!force) {
    const currentState = await loadPipelineState();
    const transition = canProceedTo(currentState, "analyzed");
    if (!transition.allowed) {
      console.error(`Error: ${transition.reason}`);
      console.error("Use --force to bypass state validation.");
      process.exit(1);
    }
  } else if (!quiet && !outputJson) {
    console.log("Warning: Bypassing pipeline state validation (--force)");
  }
  const telemetry = getTelemetry();
  await telemetry.load();
  const eventId = telemetry.trackCommandStart("analyze");
  const harnessRoot = getHarnessRoot();
  const journeyFiles = await fg2(positionals, {
    absolute: true,
    cwd: harnessRoot
  });
  if (journeyFiles.length === 0) {
    console.error("Error: No journey files found matching the patterns");
    process.exit(1);
  }
  const validatedFiles = [];
  for (const file of journeyFiles) {
    try {
      const validated = validatePath(file, harnessRoot);
      validatedFiles.push(validated);
    } catch (error) {
      if (error instanceof PathTraversalError) {
        console.error(`Warning: Skipping file outside harness root: ${file}`);
        continue;
      }
      throw error;
    }
  }
  if (validatedFiles.length === 0) {
    console.error("Error: No valid journey files within harness root");
    process.exit(1);
  }
  if (!quiet && !outputJson) {
    console.log(`Analyzing ${validatedFiles.length} journey file(s)...`);
  }
  const journeys = [];
  const allKeywords = [];
  for (const file of validatedFiles) {
    if (!existsSync(file)) {
      console.error(`Warning: File not found: ${file}`);
      continue;
    }
    const analysis = parseJourneyFile(file);
    journeys.push(analysis);
    for (const step of analysis.steps) {
      allKeywords.push(...step.keywords);
    }
  }
  const complexityDistribution = {
    simple: 0,
    moderate: 0,
    complex: 0
  };
  for (const j of journeys) {
    const level = j.complexity.overall;
    if (complexityDistribution[level] !== void 0) {
      complexityDistribution[level]++;
    }
  }
  const keywordCounts = /* @__PURE__ */ new Map();
  for (const kw of allKeywords) {
    keywordCounts.set(kw, (keywordCounts.get(kw) || 0) + 1);
  }
  const commonKeywords = [...keywordCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([kw]) => kw);
  const output = {
    version: "1.0",
    harnessRoot,
    journeys,
    summary: {
      totalJourneys: journeys.length,
      totalSteps: journeys.reduce((sum, j) => sum + j.steps.length, 0),
      complexityDistribution,
      commonKeywords
    },
    analyzedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (outputJson) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    const outputPath = values.output || getAutogenArtifact("analysis");
    await ensureAutogenDir();
    writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf-8");
    if (!quiet) {
      console.log(`
Analysis complete:`);
      console.log(`  Journeys: ${output.summary.totalJourneys}`);
      console.log(`  Steps: ${output.summary.totalSteps}`);
      console.log(`  Complexity: ${JSON.stringify(complexityDistribution)}`);
      console.log(`
Output: ${outputPath}`);
    }
  }
  await updatePipelineState("analyze", "analyzed", true, {
    journeyIds: journeys.map((j) => j.journeyId)
  });
  telemetry.trackCommandEnd(eventId, true, {
    journeyCount: journeys.length,
    stepCount: output.summary.totalSteps
  });
  await telemetry.save();
}
var USAGE, STEP_PATTERNS;
var init_analyze = __esm({
  "src/cli/analyze.ts"() {
    init_paths();
    init_state();
    init_telemetry();
    USAGE = `
Usage: artk-autogen analyze [options] <journey-files...>

Analyze journey files and output structured analysis for the orchestrating LLM.

Arguments:
  journey-files    Journey file paths or glob patterns

Options:
  -o, --output <path>    Output path for analysis.json (default: .artk/autogen/analysis.json)
  --json                 Output JSON to stdout instead of file
  -q, --quiet            Suppress output except errors
  -f, --force            Skip pipeline state validation
  -h, --help             Show this help message

Examples:
  artk-autogen analyze journeys/login.md
  artk-autogen analyze "journeys/*.md"
  artk-autogen analyze journeys/*.md --json
  artk-autogen analyze journeys/*.md -o custom/analysis.json
`;
    STEP_PATTERNS = {
      navigation: [
        /navigate/i,
        /go to/i,
        /open/i,
        /visit/i,
        /load/i,
        /url/i
      ],
      interaction: [
        /click/i,
        /tap/i,
        /press/i,
        /select/i,
        /choose/i,
        /toggle/i,
        /expand/i,
        /collapse/i,
        /hover/i,
        /drag/i,
        /drop/i
      ],
      assertion: [
        /see/i,
        /verify/i,
        /should/i,
        /expect/i,
        /confirm/i,
        /check/i,
        /visible/i,
        /displayed/i,
        /appears/i,
        /shows/i,
        /contains/i
      ],
      wait: [
        /wait/i,
        /until/i,
        /loading/i,
        /spinner/i,
        /timeout/i
      ],
      form: [
        /enter/i,
        /type/i,
        /fill/i,
        /input/i,
        /submit/i,
        /form/i,
        /field/i,
        /text/i,
        /password/i,
        /email/i,
        /upload/i
      ]
    };
  }
});

// src/mapping/normalize.ts
function stemWord(word) {
  const lower = word.toLowerCase();
  return VERB_STEMS[lower] ?? lower;
}
function expandAbbreviations(text) {
  let result = text.toLowerCase();
  const sorted = Object.entries(ABBREVIATION_EXPANSIONS).sort(([a], [b]) => b.length - a.length);
  for (const [abbr, expansion] of sorted) {
    const regex = new RegExp(`\\b${escapeRegex2(abbr)}\\b`, "gi");
    result = result.replace(regex, expansion);
  }
  return result;
}
function escapeRegex2(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function removeActorPrefixes(text) {
  let result = text;
  for (const pattern of ACTOR_PREFIXES) {
    result = result.replace(pattern, "");
  }
  return result.trim();
}
function removeStopWords(text) {
  const words = text.split(/\s+/);
  const filtered = words.filter((word) => !STOP_WORDS.has(word.toLowerCase()));
  return filtered.join(" ");
}
function extractQuotedStrings(text) {
  const quotes = /* @__PURE__ */ new Map();
  let placeholderIndex = 0;
  const processedText = text.replace(/(['"])([^'"]*)\1/g, (_match, quote, content) => {
    const placeholder = `__QUOTED_${placeholderIndex}__`;
    quotes.set(placeholder, `${quote}${content}${quote}`);
    placeholderIndex++;
    return placeholder;
  });
  return { text: processedText, quotes };
}
function restoreQuotedStrings(text, quotes) {
  let result = text;
  for (const [placeholder, original] of quotes) {
    result = result.replace(placeholder, original);
  }
  return result;
}
function normalizeStepTextEnhanced(text, options = {}) {
  const opts = { ...DEFAULT_OPTIONS5, ...options };
  let result = text.trim();
  let quotesMap = /* @__PURE__ */ new Map();
  if (opts.preserveQuoted) {
    const extracted = extractQuotedStrings(result);
    result = extracted.text;
    quotesMap = extracted.quotes;
  }
  if (opts.removeActorPrefixes) {
    result = removeActorPrefixes(result);
  }
  if (opts.lowercase) {
    result = result.toLowerCase();
  }
  if (opts.expandAbbreviations) {
    result = expandAbbreviations(result);
  }
  if (opts.stemVerbs) {
    const words = result.split(/\s+/);
    result = words.map((word) => {
      if (word.startsWith("__QUOTED_") || /[^a-z]/.test(word)) {
        return word;
      }
      return stemWord(word);
    }).join(" ");
  }
  if (opts.removeStopWords) {
    result = removeStopWords(result);
  }
  result = result.replace(/\s+/g, " ").trim();
  if (opts.preserveQuoted) {
    result = restoreQuotedStrings(result, quotesMap);
  }
  return result;
}
function getCanonicalForm(text) {
  return normalizeStepTextEnhanced(text, {
    stemVerbs: true,
    expandAbbreviations: true,
    removeStopWords: true,
    removeActorPrefixes: true,
    lowercase: true,
    preserveQuoted: true
  });
}
var VERB_STEMS, ABBREVIATION_EXPANSIONS, STOP_WORDS, ACTOR_PREFIXES, DEFAULT_OPTIONS5;
var init_normalize2 = __esm({
  "src/mapping/normalize.ts"() {
    VERB_STEMS = {
      // Click variants
      clicking: "click",
      clicked: "click",
      clicks: "click",
      // Fill variants
      filling: "fill",
      filled: "fill",
      fills: "fill",
      entering: "fill",
      entered: "fill",
      enters: "fill",
      typing: "fill",
      typed: "fill",
      types: "fill",
      // Select variants
      selecting: "select",
      selected: "select",
      selects: "select",
      choosing: "select",
      chose: "select",
      chosen: "select",
      chooses: "select",
      // Check variants
      checking: "check",
      checked: "check",
      checks: "check",
      // Uncheck variants
      unchecking: "uncheck",
      unchecked: "uncheck",
      unchecks: "uncheck",
      // Navigate variants
      navigating: "navigate",
      navigated: "navigate",
      navigates: "navigate",
      going: "navigate",
      went: "navigate",
      goes: "navigate",
      visiting: "navigate",
      visited: "navigate",
      visits: "navigate",
      opening: "navigate",
      opened: "navigate",
      opens: "navigate",
      // See/Verify variants
      seeing: "see",
      saw: "see",
      seen: "see",
      sees: "see",
      verifying: "verify",
      verified: "verify",
      verifies: "verify",
      confirming: "verify",
      confirmed: "verify",
      confirms: "verify",
      ensuring: "verify",
      ensured: "verify",
      ensures: "verify",
      // Wait variants
      waiting: "wait",
      waited: "wait",
      waits: "wait",
      // Submit variants
      submitting: "submit",
      submitted: "submit",
      submits: "submit",
      // Press variants
      pressing: "press",
      pressed: "press",
      presses: "press",
      // Hover variants
      hovering: "hover",
      hovered: "hover",
      hovers: "hover",
      // Scroll variants
      scrolling: "scroll",
      scrolled: "scroll",
      scrolls: "scroll",
      // Focus variants
      focusing: "focus",
      focused: "focus",
      focuses: "focus",
      // Drag variants
      dragging: "drag",
      dragged: "drag",
      drags: "drag",
      // Drop variants
      dropping: "drop",
      dropped: "drop",
      drops: "drop",
      // Clear variants
      clearing: "clear",
      cleared: "clear",
      clears: "clear",
      // Upload variants
      uploading: "upload",
      uploaded: "upload",
      uploads: "upload",
      // Download variants
      downloading: "download",
      downloaded: "download",
      downloads: "download",
      // Assert/Expect variants
      asserting: "assert",
      asserted: "assert",
      asserts: "assert",
      expecting: "expect",
      expected: "expect",
      expects: "expect",
      // Show/Display variants
      showing: "show",
      showed: "show",
      shown: "show",
      shows: "show",
      displaying: "display",
      displayed: "display",
      displays: "display",
      // Hide variants
      hiding: "hide",
      hid: "hide",
      hidden: "hide",
      hides: "hide",
      // Enable/Disable variants
      enabling: "enable",
      enabled: "enable",
      enables: "enable",
      disabling: "disable",
      disabled: "disable",
      disables: "disable",
      // Compound verb forms (hyphenated and spaced)
      "double-click": "dblclick",
      "double click": "dblclick",
      "double-clicking": "dblclick",
      "double clicking": "dblclick",
      "double-clicked": "dblclick",
      "double clicked": "dblclick",
      doubleclick: "dblclick",
      doubleclicking: "dblclick",
      doubleclicked: "dblclick",
      "right-click": "rightclick",
      "right click": "rightclick",
      "right-clicking": "rightclick",
      "right clicking": "rightclick",
      "right-clicked": "rightclick",
      "right clicked": "rightclick",
      rightclick: "rightclick",
      rightclicking: "rightclick",
      rightclicked: "rightclick",
      "drag-and-drop": "dragdrop",
      "drag and drop": "dragdrop",
      "drag-n-drop": "dragdrop",
      "sign-in": "login",
      "sign in": "login",
      "signing-in": "login",
      "signing in": "login",
      "signed-in": "login",
      "signed in": "login",
      signin: "login",
      "log-in": "login",
      "log in": "login",
      "logging-in": "login",
      "logging in": "login",
      "logged-in": "login",
      "logged in": "login",
      "sign-out": "logout",
      "sign out": "logout",
      "signing-out": "logout",
      "signing out": "logout",
      "signed-out": "logout",
      "signed out": "logout",
      signout: "logout",
      "log-out": "logout",
      "log out": "logout",
      "logging-out": "logout",
      "logging out": "logout",
      "logged-out": "logout",
      "logged out": "logout",
      "sign-up": "register",
      "sign up": "register",
      "signing-up": "register",
      "signing up": "register",
      "signed-up": "register",
      "signed up": "register",
      signup: "register"
    };
    ABBREVIATION_EXPANSIONS = {
      // Common abbreviations
      btn: "button",
      msg: "message",
      err: "error",
      pwd: "password",
      usr: "user",
      nav: "navigation",
      pg: "page",
      txt: "text",
      num: "number",
      val: "value",
      img: "image",
      pic: "picture",
      lbl: "label",
      chk: "checkbox",
      chkbox: "checkbox",
      cb: "checkbox",
      rb: "radio",
      dd: "dropdown",
      sel: "select",
      dlg: "dialog",
      mdl: "modal",
      lnk: "link",
      tbl: "table",
      col: "column",
      hdr: "header",
      ftr: "footer",
      sec: "section",
      // UI element synonyms
      textbox: "field",
      "text field": "field",
      "text input": "field",
      "input field": "field",
      inputbox: "field",
      combobox: "dropdown",
      "combo box": "dropdown",
      selectbox: "dropdown",
      "select box": "dropdown",
      picker: "dropdown",
      listbox: "dropdown",
      "list box": "dropdown",
      // Action synonyms
      "sign in": "login",
      "log in": "login",
      signin: "login",
      "sign out": "logout",
      "log out": "logout",
      signout: "logout",
      // Common element names
      "submit button": "submit",
      "cancel button": "cancel",
      "ok button": "ok",
      "close button": "close",
      "save button": "save",
      "delete button": "delete",
      "edit button": "edit",
      "add button": "add",
      "remove button": "remove",
      "search button": "search",
      "search box": "search field",
      "search bar": "search field"
    };
    STOP_WORDS = /* @__PURE__ */ new Set([
      "the",
      "a",
      "an",
      "is",
      "are",
      "was",
      "were",
      "be",
      "been",
      "being",
      "have",
      "has",
      "had",
      "do",
      "does",
      "did",
      "will",
      "would",
      "could",
      "should",
      "may",
      "might",
      "must",
      "shall",
      "can",
      "need",
      "dare",
      "ought",
      "used",
      "to",
      "of",
      "in",
      "for",
      "on",
      "with",
      "at",
      "by",
      "from",
      "up",
      "about",
      "into",
      "through",
      "during",
      "before",
      "after",
      "above",
      "below",
      "between",
      "under",
      "again",
      "further",
      "then",
      "once",
      "here",
      "there",
      "when",
      "where",
      "why",
      "how",
      "all",
      "each",
      "few",
      "more",
      "most",
      "other",
      "some",
      "such",
      "no",
      "nor",
      "not",
      "only",
      "own",
      "same",
      "so",
      "than",
      "too",
      "very",
      "just",
      "and"
    ]);
    ACTOR_PREFIXES = [
      /^user\s+/i,
      /^the user\s+/i,
      /^i\s+/i,
      /^we\s+/i,
      /^they\s+/i,
      /^customer\s+/i,
      /^visitor\s+/i,
      /^admin\s+/i,
      /^administrator\s+/i
    ];
    DEFAULT_OPTIONS5 = {
      stemVerbs: true,
      expandAbbreviations: true,
      removeStopWords: false,
      // Keep stop words by default for better pattern matching
      removeActorPrefixes: true,
      lowercase: true,
      preserveQuoted: true
    };
  }
});

// src/mapping/fuzzyMatcher.ts
function getPatternExamples(pattern) {
  const examples = [];
  const name = pattern.name.toLowerCase();
  if (name.includes("navigate") || name.includes("goto")) {
    examples.push(
      "navigate to /home",
      "go to /login",
      "open /dashboard",
      "visit the homepage",
      "navigate to the settings page"
    );
  }
  if (name.includes("click")) {
    examples.push(
      "click the submit button",
      "click on save",
      "click cancel button",
      "press the login button",
      "tap the menu icon"
    );
  }
  if (name.includes("fill") || name.includes("enter") || name.includes("type")) {
    examples.push(
      "enter username in the username field",
      "fill password in password field",
      "type hello in the search box",
      "input test@example.com in email field",
      "enter value into the input"
    );
  }
  if (name.includes("see") || name.includes("visible") || name.includes("verify")) {
    examples.push(
      "see the welcome message",
      "verify the success message is displayed",
      "confirm the error appears",
      "should see login button",
      "expect the form to be visible"
    );
  }
  if (name.includes("wait")) {
    examples.push(
      "wait for network idle",
      "wait for page to load",
      "wait 3 seconds",
      "wait for the spinner to disappear",
      "wait until the modal closes"
    );
  }
  if (name.includes("select")) {
    examples.push(
      "select option 1 from dropdown",
      "choose value from the list",
      "pick an item from menu",
      "select country from country dropdown"
    );
  }
  if (name.includes("check")) {
    examples.push(
      "check the checkbox",
      "tick the agreement box",
      "check remember me",
      "uncheck the newsletter option"
    );
  }
  if (name.includes("upload")) {
    examples.push(
      "upload file.pdf",
      "attach document.docx",
      "upload image to the form"
    );
  }
  if (name.includes("hover")) {
    examples.push(
      "hover over the menu",
      "mouse over the dropdown",
      "hover on the button"
    );
  }
  if (name.includes("scroll")) {
    examples.push(
      "scroll down",
      "scroll to the bottom",
      "scroll to element"
    );
  }
  if (name.includes("press")) {
    examples.push(
      "press enter",
      "press tab",
      "press escape key",
      "hit the enter key"
    );
  }
  if (name.includes("table") || name.includes("grid")) {
    examples.push(
      "see 5 rows in the table",
      "verify table has data",
      "check grid contains value"
    );
  }
  if (name.includes("text") || name.includes("contain")) {
    examples.push(
      "see text welcome back",
      "page contains login form",
      "element has text submit"
    );
  }
  return examples;
}
function buildPatternExamplesCache() {
  return allPatterns.map((pattern) => ({
    pattern,
    examples: getPatternExamples(pattern)
  }));
}
function getPatternExamples_cached() {
  if (!patternExamplesCache) {
    patternExamplesCache = buildPatternExamplesCache();
  }
  return patternExamplesCache;
}
function fuzzyMatch(text, config = {}) {
  const {
    minSimilarity = 0.85,
    useNormalization = true,
    maxCandidates = 10,
    debug = false
  } = config;
  const trimmedText = text.trim();
  const normalizedText = useNormalization ? getCanonicalForm(trimmedText) : trimmedText.toLowerCase();
  const patternsWithExamples = getPatternExamples_cached();
  const candidates = [];
  outer: for (const { pattern, examples } of patternsWithExamples) {
    for (const example of examples) {
      const normalizedExample = useNormalization ? getCanonicalForm(example) : example.toLowerCase();
      const similarity = calculateSimilarity(normalizedText, normalizedExample);
      if (similarity >= minSimilarity) {
        candidates.push({ pattern, example, similarity });
        if (similarity >= 0.98) {
          break outer;
        }
      }
    }
  }
  candidates.sort((a, b) => b.similarity - a.similarity);
  const topCandidates = candidates.slice(0, maxCandidates);
  if (debug && topCandidates.length > 0) {
    console.log(
      `[FuzzyMatcher] Top ${topCandidates.length} candidates for "${trimmedText}":`
    );
    for (const c of topCandidates) {
      console.log(`  ${c.pattern.name}: ${(c.similarity * 100).toFixed(1)}% (vs "${c.example}")`);
    }
  }
  if (topCandidates.length > 0) {
    const best = topCandidates[0];
    const match = trimmedText.match(best.pattern.regex);
    if (match) {
      const primitive = best.pattern.extract(match);
      if (primitive) {
        return {
          primitive,
          patternName: best.pattern.name,
          similarity: best.similarity,
          matchedExample: best.example,
          originalText: trimmedText,
          normalizedText
        };
      }
    }
    if (best.similarity >= 0.9) {
      const genericPrimitive = createGenericPrimitive(best.pattern, trimmedText);
      if (genericPrimitive) {
        if (debug) {
          console.log(
            `[FuzzyMatcher] Created generic primitive for ${best.pattern.name}`
          );
        }
        return {
          primitive: genericPrimitive,
          patternName: `${best.pattern.name}:fuzzy`,
          similarity: best.similarity,
          matchedExample: best.example,
          originalText: trimmedText,
          normalizedText
        };
      }
    }
  }
  if (debug) {
    console.log(`[FuzzyMatcher] No match above ${minSimilarity * 100}% for "${trimmedText}"`);
  }
  return null;
}
function createGenericPrimitive(pattern, text) {
  const type = pattern.primitiveType;
  const quotedStrings = text.match(/["']([^"']+)["']/g)?.map((s) => s.slice(1, -1)) || [];
  const targetStr = quotedStrings[0] || extractTarget(text) || "element";
  const valueStr = quotedStrings[1] || quotedStrings[0] || "";
  const makeLocator = (value) => ({
    strategy: "text",
    value
  });
  switch (type) {
    case "click":
    case "dblclick":
    case "rightClick":
      return { type, locator: makeLocator(targetStr) };
    case "fill":
      return {
        type: "fill",
        locator: makeLocator(targetStr),
        value: { type: "literal", value: valueStr }
      };
    case "goto": {
      const urlMatch = text.match(/(?:to|\/)\s*([\/\w.-]+)/i);
      return {
        type: "goto",
        url: urlMatch?.[1] || "/"
      };
    }
    case "waitForTimeout": {
      const timeMatch = text.match(/(\d+)\s*(?:second|sec|ms|millisecond)/i);
      if (timeMatch) {
        const amount = parseInt(timeMatch[1], 10);
        const unit = text.toLowerCase().includes("ms") ? "ms" : "s";
        return {
          type: "waitForTimeout",
          ms: unit === "ms" ? amount : amount * 1e3
        };
      }
      return { type: "waitForTimeout", ms: 1e3 };
    }
    case "waitForNetworkIdle":
      return { type: "waitForNetworkIdle" };
    case "waitForVisible":
      return { type: "waitForVisible", locator: makeLocator(targetStr) };
    case "waitForHidden":
      return { type: "waitForHidden", locator: makeLocator(targetStr) };
    case "expectVisible":
    case "expectNotVisible":
    case "expectHidden":
      return { type, locator: makeLocator(targetStr) };
    case "expectText":
      return {
        type: "expectText",
        locator: makeLocator(targetStr),
        text: valueStr
      };
    case "select":
      return {
        type: "select",
        locator: makeLocator(targetStr),
        option: valueStr
      };
    case "hover":
    case "focus":
    case "clear":
    case "check":
    case "uncheck":
      return { type, locator: makeLocator(targetStr) };
    case "press": {
      const keyMatch = text.match(/(?:press|hit|key)\s+(\w+)/i);
      return {
        type: "press",
        key: keyMatch?.[1] || "Enter"
      };
    }
    default:
      return null;
  }
}
function extractTarget(text) {
  const patterns = [
    /(?:the|a)\s+["']?(\w+(?:\s+\w+)?)["']?\s+(?:button|field|input|link|element)/i,
    /(?:on|click|tap|press)\s+(?:the\s+)?["']?(\w+(?:\s+\w+)?)["']?/i,
    /(?:in|into)\s+(?:the\s+)?["']?(\w+(?:\s+\w+)?)["']?\s+(?:field|input)/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }
  return null;
}
var patternExamplesCache;
var init_fuzzyMatcher = __esm({
  "src/mapping/fuzzyMatcher.ts"() {
    init_patternDistance();
    init_normalize2();
    init_patterns();
    patternExamplesCache = null;
  }
});

// src/mapping/unifiedMatcher.ts
function unifiedMatch(text, options = {}) {
  const {
    useLlkb = true,
    llkbRoot,
    minLlkbConfidence = 0.7,
    useFuzzy = true,
    minFuzzySimilarity = 0.85,
    debug = false
  } = options;
  const trimmedText = text.trim();
  for (const pattern of allPatterns) {
    const match = trimmedText.match(pattern.regex);
    if (match) {
      const primitive = pattern.extract(match);
      if (primitive) {
        if (debug) {
          console.log(`[UnifiedMatcher] Core match: ${pattern.name} for "${trimmedText}"`);
        }
        return {
          primitive,
          source: "core",
          patternName: pattern.name
        };
      }
    }
  }
  if (useLlkb) {
    try {
      const llkbMatch = matchLlkbPattern(trimmedText, {
        llkbRoot,
        minConfidence: minLlkbConfidence
      });
      if (llkbMatch) {
        if (debug) {
          console.log(
            `[UnifiedMatcher] LLKB match: ${llkbMatch.patternId} (confidence: ${llkbMatch.confidence}) for "${trimmedText}"`
          );
        }
        return {
          primitive: llkbMatch.primitive,
          source: "llkb",
          llkbPatternId: llkbMatch.patternId,
          llkbConfidence: llkbMatch.confidence
        };
      }
    } catch (err3) {
      if (debug) {
        console.log(`[UnifiedMatcher] LLKB lookup failed: ${err3}`);
      }
    }
  }
  if (useFuzzy) {
    try {
      const fuzzyResult = fuzzyMatch(trimmedText, {
        minSimilarity: minFuzzySimilarity,
        useNormalization: true,
        debug
      });
      if (fuzzyResult) {
        if (debug) {
          console.log(
            `[UnifiedMatcher] Fuzzy match: ${fuzzyResult.patternName} (similarity: ${(fuzzyResult.similarity * 100).toFixed(1)}%) for "${trimmedText}"`
          );
        }
        return {
          primitive: fuzzyResult.primitive,
          source: "fuzzy",
          patternName: fuzzyResult.patternName,
          fuzzySimilarity: fuzzyResult.similarity,
          fuzzyMatchedExample: fuzzyResult.matchedExample
        };
      }
    } catch (err3) {
      if (debug) {
        console.log(`[UnifiedMatcher] Fuzzy matching failed: ${err3}`);
      }
    }
  }
  if (debug) {
    console.log(`[UnifiedMatcher] No match for: "${trimmedText}"`);
  }
  return {
    primitive: null,
    source: "none"
  };
}
var init_unifiedMatcher = __esm({
  "src/mapping/unifiedMatcher.ts"() {
    init_patterns();
    init_patternExtension();
    init_fuzzyMatcher();
  }
});

// src/mapping/plannedActionAdapter.ts
function irPrimitiveToPlannedAction(primitive) {
  switch (primitive.type) {
    // ═══════════════════════════════════════════════════════════════════════════
    // NAVIGATION
    // ═══════════════════════════════════════════════════════════════════════════
    case "goto":
      return { type: "navigate", target: primitive.url };
    case "reload":
      return { type: "reload" };
    case "goBack":
      return { type: "goBack" };
    case "goForward":
      return { type: "goForward" };
    case "waitForURL":
      return {
        type: "waitForURL",
        target: typeof primitive.pattern === "string" ? primitive.pattern : primitive.pattern.source
      };
    case "waitForResponse":
      return { type: "waitForNetwork", target: primitive.urlPattern };
    case "waitForLoadingComplete":
      return { type: "wait", options: { timeout: primitive.timeout ?? 5e3 } };
    // ═══════════════════════════════════════════════════════════════════════════
    // WAIT PRIMITIVES
    // ═══════════════════════════════════════════════════════════════════════════
    case "waitForVisible":
      return { type: "waitForVisible", target: locatorToTarget(primitive.locator) };
    case "waitForHidden":
      return { type: "waitForHidden", target: locatorToTarget(primitive.locator) };
    case "waitForTimeout":
      return { type: "wait", options: { timeout: primitive.ms } };
    case "waitForNetworkIdle":
      return { type: "waitForNetwork" };
    // ═══════════════════════════════════════════════════════════════════════════
    // CLICK INTERACTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    case "click":
      return { type: "click", target: locatorToTarget(primitive.locator) };
    case "dblclick":
      return { type: "dblclick", target: locatorToTarget(primitive.locator) };
    case "rightClick":
      return { type: "rightClick", target: locatorToTarget(primitive.locator) };
    // ═══════════════════════════════════════════════════════════════════════════
    // FORM INTERACTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    case "fill":
      return {
        type: "fill",
        target: locatorToTarget(primitive.locator),
        value: valueToString(primitive.value)
      };
    case "select":
      return {
        type: "select",
        target: locatorToTarget(primitive.locator),
        value: primitive.option
      };
    case "check":
      return { type: "check", target: locatorToTarget(primitive.locator) };
    case "uncheck":
      return { type: "uncheck", target: locatorToTarget(primitive.locator) };
    case "clear":
      return { type: "clear", target: locatorToTarget(primitive.locator) };
    case "upload":
      return {
        type: "upload",
        target: locatorToTarget(primitive.locator),
        files: primitive.files
      };
    // ═══════════════════════════════════════════════════════════════════════════
    // OTHER INTERACTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    case "press":
      return { type: "press", key: primitive.key };
    case "hover":
      return { type: "hover", target: locatorToTarget(primitive.locator) };
    case "focus":
      return { type: "focus", target: locatorToTarget(primitive.locator) };
    // ═══════════════════════════════════════════════════════════════════════════
    // ASSERTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    case "expectVisible":
      return { type: "assert", target: locatorToTarget(primitive.locator) };
    case "expectNotVisible":
    case "expectHidden":
      return { type: "assertHidden", target: locatorToTarget(primitive.locator) };
    case "expectText":
      return {
        type: "assertText",
        target: locatorToTarget(primitive.locator),
        value: typeof primitive.text === "string" ? primitive.text : primitive.text.source
      };
    case "expectContainsText":
      return {
        type: "assertText",
        target: locatorToTarget(primitive.locator),
        value: primitive.text
      };
    case "expectValue":
      return {
        type: "assertValue",
        target: locatorToTarget(primitive.locator),
        value: primitive.value
      };
    case "expectChecked":
      return { type: "assertChecked", target: locatorToTarget(primitive.locator) };
    case "expectEnabled":
      return { type: "assertEnabled", target: locatorToTarget(primitive.locator) };
    case "expectDisabled":
      return { type: "assertDisabled", target: locatorToTarget(primitive.locator) };
    case "expectURL":
      return {
        type: "assertURL",
        target: typeof primitive.pattern === "string" ? primitive.pattern : primitive.pattern.source
      };
    case "expectTitle":
      return {
        type: "assertTitle",
        target: typeof primitive.title === "string" ? primitive.title : primitive.title.source
      };
    case "expectCount":
      return {
        type: "assertCount",
        target: locatorToTarget(primitive.locator),
        count: primitive.count
      };
    // ═══════════════════════════════════════════════════════════════════════════
    // SIGNALS (TOASTS, MODALS, ALERTS)
    // ═══════════════════════════════════════════════════════════════════════════
    case "expectToast":
      return {
        type: "assertToast",
        toastType: primitive.toastType,
        value: primitive.message
      };
    case "dismissModal":
      return { type: "dismissModal" };
    case "acceptAlert":
      return { type: "acceptAlert" };
    case "dismissAlert":
      return { type: "dismissAlert" };
    // ═══════════════════════════════════════════════════════════════════════════
    // MODULE CALLS
    // ═══════════════════════════════════════════════════════════════════════════
    case "callModule":
      return {
        type: "callModule",
        module: primitive.module,
        method: primitive.method
      };
    // ═══════════════════════════════════════════════════════════════════════════
    // BLOCKED/TODO
    // ═══════════════════════════════════════════════════════════════════════════
    case "blocked":
      return { type: "custom", target: primitive.sourceText };
    default:
      const _exhaustive = primitive;
      return { type: "custom", target: String(_exhaustive.type) };
  }
}
function locatorToTarget(locator) {
  switch (locator.strategy) {
    case "role":
      if (locator.options?.name) {
        return `${locator.value}:${locator.options.name}`;
      }
      return locator.value;
    case "placeholder":
      return `placeholder:${locator.value}`;
    case "label":
    case "text":
    case "testid":
      return locator.value;
    case "css":
      return locator.value;
    default:
      return locator.value;
  }
}
function valueToString(value) {
  switch (value.type) {
    case "literal":
      return value.value;
    case "actor":
      return `{{${value.value}}}`;
    case "testData":
      return `$${value.value}`;
    case "generated":
      return value.value;
    case "runId":
      return "${runId}";
    default:
      return value.value || "";
  }
}
function plannedActionToIRPrimitive(action) {
  switch (action.type) {
    case "navigate":
      return { type: "goto", url: action.target || "/" };
    case "reload":
      return { type: "reload" };
    case "goBack":
      return { type: "goBack" };
    case "goForward":
      return { type: "goForward" };
    case "click":
      return { type: "click", locator: targetToLocator(action.target || "") };
    case "dblclick":
      return { type: "dblclick", locator: targetToLocator(action.target || "") };
    case "rightClick":
      return { type: "rightClick", locator: targetToLocator(action.target || "") };
    case "fill":
      return {
        type: "fill",
        locator: targetToLocator(action.target || ""),
        value: stringToValue(action.value || "")
      };
    case "select":
      return {
        type: "select",
        locator: targetToLocator(action.target || ""),
        option: action.value || ""
      };
    case "check":
      return { type: "check", locator: targetToLocator(action.target || "") };
    case "uncheck":
      return { type: "uncheck", locator: targetToLocator(action.target || "") };
    case "press":
      return { type: "press", key: action.key || "Enter" };
    case "hover":
      return { type: "hover", locator: targetToLocator(action.target || "") };
    case "focus":
      return { type: "focus", locator: targetToLocator(action.target || "") };
    case "clear":
      return { type: "clear", locator: targetToLocator(action.target || "") };
    case "assert":
      return { type: "expectVisible", locator: targetToLocator(action.target || "") };
    case "assertHidden":
      return { type: "expectHidden", locator: targetToLocator(action.target || "") };
    case "assertText":
      return {
        type: "expectText",
        locator: targetToLocator(action.target || ""),
        text: action.value || ""
      };
    case "assertURL":
      return { type: "expectURL", pattern: action.target || "/" };
    case "assertTitle":
      return { type: "expectTitle", title: action.target || "" };
    case "assertToast":
      return {
        type: "expectToast",
        toastType: action.toastType || "info",
        message: action.value
      };
    case "waitForVisible":
      return { type: "waitForVisible", locator: targetToLocator(action.target || "") };
    case "waitForHidden":
      return { type: "waitForHidden", locator: targetToLocator(action.target || "") };
    case "waitForNetwork":
      return { type: "waitForNetworkIdle" };
    case "wait":
      return { type: "waitForTimeout", ms: action.options?.timeout || 5e3 };
    case "dismissModal":
      return { type: "dismissModal" };
    case "acceptAlert":
      return { type: "acceptAlert" };
    case "dismissAlert":
      return { type: "dismissAlert" };
    case "callModule":
      return {
        type: "callModule",
        module: action.module || "unknown",
        method: action.method || "unknown"
      };
    case "custom":
      return { type: "blocked", reason: "custom action", sourceText: action.target || "" };
    default:
      return null;
  }
}
function targetToLocator(target) {
  const roleMatch = target.match(/^(\w+):(.+)$/);
  if (roleMatch) {
    return {
      strategy: "role",
      value: roleMatch[1],
      options: { name: roleMatch[2] }
    };
  }
  return { strategy: "text", value: target };
}
function stringToValue(str) {
  if (/^\{\{.+\}\}$/.test(str)) {
    return { type: "actor", value: str.slice(2, -2) };
  }
  if (/^\$.+/.test(str)) {
    return { type: "testData", value: str.slice(1) };
  }
  if (/\$\{.+\}/.test(str)) {
    return { type: "generated", value: str };
  }
  return { type: "literal", value: str };
}
var init_plannedActionAdapter = __esm({
  "src/mapping/plannedActionAdapter.ts"() {
  }
});

// src/cli/plan.ts
var plan_exports = {};
__export(plan_exports, {
  runPlan: () => runPlan
});
function convertStepToAction(step, options) {
  const result = unifiedMatch(step.text, {
    useLlkb: true,
    llkbRoot: options?.llkbRoot
  });
  if (result.primitive) {
    return irPrimitiveToPlannedAction(result.primitive);
  }
  return { type: "custom", target: step.text };
}
function inferSelectors(step) {
  const selectors = [];
  const text = step.text.toLowerCase();
  const testIdMatch = text.match(/data-testid\s*[=:]\s*["']?([^"'\s]+)/i);
  if (testIdMatch && testIdMatch[1]) {
    selectors.push({
      strategy: "testId",
      value: testIdMatch[1],
      confidence: 0.95
    });
  }
  const buttonMatch = text.match(/(?:click|press)\s+(?:the\s+)?["']?(\w+)["']?\s*button/i);
  if (buttonMatch && buttonMatch[1]) {
    selectors.push({
      strategy: "role",
      value: `button[name="${buttonMatch[1]}"]`,
      confidence: 0.7
    });
  }
  const linkMatch = text.match(/(?:click|press)\s+(?:the\s+)?["']?([^"']+)["']?\s*link/i);
  if (linkMatch && linkMatch[1]) {
    selectors.push({
      strategy: "role",
      value: `link[name="${linkMatch[1]}"]`,
      confidence: 0.7
    });
  }
  const textMatch = text.match(/(?:with|containing|text)\s+["']([^"']+)["']/i);
  if (textMatch && textMatch[1]) {
    selectors.push({
      strategy: "text",
      value: textMatch[1],
      confidence: 0.6
    });
  }
  return selectors;
}
function inferAssertions(step) {
  const assertions = [];
  const text = step.text.toLowerCase();
  if (text.includes("visible") || text.includes("see") || text.includes("displayed")) {
    assertions.push({ type: "visible" });
  }
  if (text.includes("text") || text.includes("message") || text.includes("shows")) {
    const textMatch = text.match(/["']([^"']+)["']/);
    assertions.push({
      type: "text",
      expected: textMatch?.[1]
    });
  }
  if (text.includes("url") || text.includes("navigate")) {
    const urlMatch = text.match(/url\s+(?:is|contains)?\s*["']?([^"'\s]+)/i);
    assertions.push({
      type: "url",
      expected: urlMatch?.[1]
    });
  }
  return assertions;
}
function createPlanFromJourney(journey, strategy) {
  const steps = journey.steps.map((step, idx) => ({
    index: idx,
    description: step.text,
    action: convertStepToAction(step),
    selectors: inferSelectors(step),
    assertions: step.hasAssertion ? inferAssertions(step) : void 0,
    waitCondition: step.type === "wait" ? "networkidle" : void 0
  }));
  const modules = [];
  if (journey.scope.includes("auth") || journey.steps.some((s) => s.text.toLowerCase().includes("login"))) {
    modules.push({
      name: "auth",
      type: "flow",
      methods: ["login", "logout"]
    });
  }
  const hasNavigation = journey.steps.some((s) => s.type === "navigation");
  if (hasNavigation) {
    modules.push({
      name: "navigation",
      type: "flow",
      methods: ["navigateTo"]
    });
  }
  const hasForms = journey.steps.some((s) => s.type === "form");
  if (hasForms) {
    modules.push({
      name: "forms",
      type: "component",
      methods: ["fillForm", "submitForm"]
    });
  }
  const imports = ["test", "expect"];
  const fixtures = [];
  if (modules.some((m) => m.name === "auth")) {
    fixtures.push("authenticatedPage");
  }
  const config = { ...DEFAULT_CONFIG2 };
  if (journey.complexity.overall === "complex") {
    config.timeout = 6e4;
    config.retries = 3;
    config.trace = "on";
  }
  const plan = {
    version: "1.0",
    journeyId: journey.journeyId,
    journeyPath: journey.journeyPath,
    strategy,
    steps,
    modules,
    imports,
    fixtures,
    configuration: config,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    createdBy: "cli"
  };
  if (strategy === "multi-sample") {
    const prompt = createMultiSamplePrompt(journey, steps);
    plan.multiSampleRequest = createOrchestratorSampleRequest(
      prompt,
      journey.journeyId,
      DEFAULT_MULTI_SAMPLER_CONFIG
    );
  }
  return plan;
}
function createMultiSamplePrompt(journey, steps) {
  const stepDescriptions = steps.map(
    (s, i) => `${i + 1}. ${s.description} (${s.action.type})`
  ).join("\n");
  return `Generate a Playwright test for the following journey:

Journey ID: ${journey.journeyId}
Title: ${journey.title}
Tier: ${journey.tier}
Complexity: ${journey.complexity.overall}

Steps:
${stepDescriptions}

Acceptance Criteria:
${journey.acceptanceCriteria.map((ac) => `- ${ac}`).join("\n")}

Requirements:
- Use Playwright Test syntax with TypeScript
- Use data-testid selectors where possible
- Include proper assertions for each acceptance criterion
- Add appropriate wait conditions for async operations
- Follow Playwright best practices for reliability`;
}
async function runPlan(args) {
  const { values } = parseArgs({
    args,
    options: {
      analysis: { type: "string", short: "a" },
      journey: { type: "string", short: "j" },
      strategy: { type: "string", short: "s", default: "direct" },
      output: { type: "string", short: "o" },
      json: { type: "boolean", default: false },
      quiet: { type: "boolean", short: "q", default: false },
      force: { type: "boolean", short: "f", default: false },
      help: { type: "boolean", short: "h", default: false }
    },
    allowPositionals: true
  });
  if (values.help) {
    console.log(USAGE2);
    return;
  }
  const quiet = values.quiet;
  const outputJson = values.json;
  const force = values.force;
  const strategyInput = values.strategy?.toLowerCase().trim() || "direct";
  const validStrategies = ["direct", "scot", "multi-sample"];
  if (!validStrategies.includes(strategyInput)) {
    console.error(`Error: Invalid strategy "${strategyInput}". Use: ${validStrategies.join(", ")}`);
    process.exit(1);
  }
  const strategy = strategyInput;
  const telemetry = getTelemetry();
  await telemetry.load();
  const eventId = telemetry.trackCommandStart("plan");
  const pipelineState = await loadPipelineState();
  if (!force) {
    const transition = canProceedTo(pipelineState, "planned");
    if (!transition.allowed) {
      console.error(`Error: ${transition.reason}`);
      console.error("Use --force to bypass state validation.");
      process.exit(1);
    }
  } else if (!quiet && !outputJson) {
    console.log("Warning: Bypassing pipeline state validation (--force)");
  }
  const analysisPath = values.analysis || getAutogenArtifact("analysis");
  if (!existsSync(analysisPath)) {
    console.error(`Error: Analysis file not found: ${analysisPath}`);
    console.error('Run "artk-autogen analyze" first.');
    process.exit(1);
  }
  let analysis;
  try {
    analysis = JSON.parse(readFileSync(analysisPath, "utf-8"));
  } catch (e) {
    console.error(`Error: Failed to parse analysis file: ${e}`);
    process.exit(1);
  }
  let journeys = analysis.journeys;
  if (values.journey) {
    journeys = journeys.filter((j) => j.journeyId === values.journey);
    if (journeys.length === 0) {
      console.error(`Error: Journey "${values.journey}" not found in analysis`);
      process.exit(1);
    }
  }
  if (!quiet && !outputJson) {
    console.log(`Creating plan for ${journeys.length} journey(s) with strategy: ${strategy}`);
  }
  const plans = journeys.map((j) => createPlanFromJourney(j, strategy));
  const strategyCount = {
    direct: 0,
    scot: 0,
    "multi-sample": 0
  };
  for (const p of plans) {
    strategyCount[p.strategy]++;
  }
  const totalSteps = plans.reduce((sum, p) => sum + p.steps.length, 0);
  const estimatedTestTime = totalSteps * 2;
  const output = {
    version: "1.0",
    plans,
    summary: {
      totalPlans: plans.length,
      totalSteps,
      strategies: strategyCount,
      estimatedTestTime
    },
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (outputJson) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    const outputPath = values.output || getAutogenArtifact("plan");
    await ensureAutogenDir();
    writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf-8");
    if (!quiet) {
      console.log(`
Plan created:`);
      console.log(`  Plans: ${output.summary.totalPlans}`);
      console.log(`  Steps: ${output.summary.totalSteps}`);
      console.log(`  Strategy: ${strategy}`);
      console.log(`  Est. time: ${Math.ceil(estimatedTestTime / 60)} min`);
      const multiSamplePlans = plans.filter((p) => p.multiSampleRequest);
      if (multiSamplePlans.length > 0) {
        console.log(`  Multi-sample enabled: ${multiSamplePlans.length} plan(s)`);
      }
      console.log(`
Output: ${outputPath}`);
    }
  }
  await updatePipelineState("plan", "planned", true, {
    journeyIds: plans.map((p) => p.journeyId)
  });
  telemetry.trackCommandEnd(eventId, true, {
    planCount: plans.length,
    stepCount: totalSteps,
    strategy
  });
  await telemetry.save();
}
var USAGE2, DEFAULT_CONFIG2;
var init_plan = __esm({
  "src/cli/plan.ts"() {
    init_paths();
    init_state();
    init_telemetry();
    init_multi_sampler();
    init_unifiedMatcher();
    init_plannedActionAdapter();
    USAGE2 = `
Usage: artk-autogen plan [options]

Create test generation plan from analysis or direct input.

Options:
  -a, --analysis <path>  Path to analysis.json (default: .artk/autogen/analysis.json)
  -j, --journey <id>     Plan for specific journey ID only
  -s, --strategy <type>  Generation strategy: direct, scot, multi-sample (default: direct)
  -o, --output <path>    Output path for plan.json (default: .artk/autogen/plan.json)
  --json                 Output JSON to stdout instead of file
  -q, --quiet            Suppress output except errors
  -f, --force            Skip pipeline state validation
  -h, --help             Show this help message

Examples:
  artk-autogen plan
  artk-autogen plan --analysis custom/analysis.json
  artk-autogen plan --journey JRN-0001 --strategy scot
  artk-autogen plan --json
`;
    DEFAULT_CONFIG2 = {
      timeout: 3e4,
      retries: 2,
      parallel: false,
      screenshot: "only-on-failure",
      video: "retain-on-failure",
      trace: "retain-on-failure"
    };
  }
});
function getTelemetryPath(baseDir) {
  const artkDir = getArtkDir(baseDir);
  return join(artkDir, TELEMETRY_FILE);
}
function ensureTelemetryDir(telemetryPath) {
  const dir = dirname(telemetryPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}
function normalizeStepTextForTelemetry(text) {
  return text.toLowerCase().trim().replace(/\b(the|a|an)\b/g, "").replace(/\s+/g, " ").replace(/"[^"]*"/g, '""').replace(/'[^']*'/g, "''").trim();
}
function categorizeStepText(text) {
  const lower = text.toLowerCase();
  if (lower.includes("navigate") || lower.includes("go to") || lower.includes("open") || lower.includes("visit")) {
    return "navigation";
  }
  if (lower.includes("click") || lower.includes("fill") || lower.includes("enter") || lower.includes("type") || lower.includes("select") || lower.includes("check") || lower.includes("press") || lower.includes("submit") || lower.includes("input")) {
    return "interaction";
  }
  if (lower.includes("see") || lower.includes("visible") || lower.includes("verify") || lower.includes("assert") || lower.includes("confirm") || lower.includes("should") || lower.includes("ensure") || lower.includes("expect") || lower.includes("display")) {
    return "assertion";
  }
  if (lower.includes("wait") || lower.includes("load") || lower.includes("until")) {
    return "wait";
  }
  return "unknown";
}
function recordBlockedStep(record, options = {}) {
  const telemetryPath = getTelemetryPath(options.baseDir);
  ensureTelemetryDir(telemetryPath);
  const fullRecord = {
    ...record,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    normalizedText: normalizeStepTextForTelemetry(record.stepText),
    category: record.category || categorizeStepText(record.stepText)
  };
  appendFileSync(telemetryPath, JSON.stringify(fullRecord) + "\n");
}
function readBlockedStepRecords(options = {}) {
  const telemetryPath = getTelemetryPath(options.baseDir);
  if (!existsSync(telemetryPath)) {
    return [];
  }
  try {
    const content = readFileSync(telemetryPath, "utf-8");
    return content.split("\n").filter(Boolean).map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter((record) => record !== null);
  } catch {
    return [];
  }
}
function calculateTokenSimilarity(a, b) {
  const tokensA = new Set(a.split(" ").filter(Boolean));
  const tokensB = new Set(b.split(" ").filter(Boolean));
  if (tokensA.size === 0 && tokensB.size === 0) return 1;
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  const intersection = new Set([...tokensA].filter((x) => tokensB.has(x)));
  const union = /* @__PURE__ */ new Set([...tokensA, ...tokensB]);
  return intersection.size / union.size;
}
function groupBySimilarity(records, threshold = 0.7) {
  const groups = /* @__PURE__ */ new Map();
  const processed = /* @__PURE__ */ new Set();
  for (let i = 0; i < records.length; i++) {
    if (processed.has(i)) continue;
    const record = records[i];
    const normalized = record.normalizedText;
    const group = [record];
    processed.add(i);
    for (let j = i + 1; j < records.length; j++) {
      if (processed.has(j)) continue;
      const other = records[j];
      const similarity = calculateTokenSimilarity(normalized, other.normalizedText);
      if (similarity >= threshold) {
        group.push(other);
        processed.add(j);
      }
    }
    groups.set(normalized, group);
  }
  return groups;
}
function analyzeBlockedPatterns(options = {}) {
  const records = readBlockedStepRecords(options);
  if (records.length === 0) {
    return [];
  }
  const groups = groupBySimilarity(records);
  const gaps = [];
  for (const [normalizedText, groupRecords] of groups) {
    const timestamps = groupRecords.map((r) => r.timestamp).sort();
    const variants = [...new Set(groupRecords.map((r) => r.stepText))];
    gaps.push({
      exampleText: groupRecords[0].stepText,
      normalizedText,
      count: groupRecords.length,
      category: groupRecords[0].category,
      variants,
      suggestedPattern: generateSuggestedPattern(variants),
      firstSeen: timestamps[0],
      lastSeen: timestamps[timestamps.length - 1]
    });
  }
  gaps.sort((a, b) => b.count - a.count);
  return options.limit ? gaps.slice(0, options.limit) : gaps;
}
function generateSuggestedPattern(variants) {
  if (variants.length === 0) return void 0;
  const example = variants[0].toLowerCase();
  const pattern = example.replace(/"[^"]+"/g, '"([^"]+)"').replace(/'[^']+'/g, "'([^']+)'").replace(/[.*+?^${}()|[\]\\]/g, (char) => {
    if (char === "(" || char === ")" || char === "[" || char === "]" || char === "+") {
      return char;
    }
    return "\\" + char;
  });
  return `^(?:user\\s+)?${pattern}$`;
}
function getTelemetryStats(options = {}) {
  const records = readBlockedStepRecords(options);
  if (records.length === 0) {
    return {
      totalRecords: 0,
      uniquePatterns: 0,
      byCategory: {},
      dateRange: {
        earliest: "",
        latest: ""
      }
    };
  }
  const byCategory = {};
  const normalizedSet = /* @__PURE__ */ new Set();
  const timestamps = records.map((r) => r.timestamp).sort();
  for (const record of records) {
    byCategory[record.category] = (byCategory[record.category] || 0) + 1;
    normalizedSet.add(record.normalizedText);
  }
  return {
    totalRecords: records.length,
    uniquePatterns: normalizedSet.size,
    byCategory,
    dateRange: {
      earliest: timestamps[0],
      latest: timestamps[timestamps.length - 1]
    }
  };
}
function clearTelemetry(options = {}) {
  const telemetryPath = getTelemetryPath(options.baseDir);
  if (existsSync(telemetryPath)) {
    unlinkSync(telemetryPath);
  }
}
var TELEMETRY_FILE;
var init_telemetry2 = __esm({
  "src/mapping/telemetry.ts"() {
    init_paths();
    TELEMETRY_FILE = "blocked-steps-telemetry.jsonl";
  }
});

// src/mapping/blockedStepAnalysis.ts
function categorizeStep(text) {
  const lowerText = text.toLowerCase();
  if (lowerText.includes("navigate") || lowerText.includes("go to") || lowerText.includes("open") || lowerText.includes("visit")) {
    return "navigation";
  }
  if (lowerText.includes("click") || lowerText.includes("fill") || lowerText.includes("enter") || lowerText.includes("type") || lowerText.includes("select") || lowerText.includes("check") || lowerText.includes("press")) {
    return "interaction";
  }
  if (lowerText.includes("see") || lowerText.includes("visible") || lowerText.includes("verify") || lowerText.includes("assert") || lowerText.includes("confirm") || lowerText.includes("should") || lowerText.includes("expect")) {
    return "assertion";
  }
  if (lowerText.includes("wait") || lowerText.includes("load") || lowerText.includes("until") || lowerText.includes("appear")) {
    return "wait";
  }
  return "unknown";
}
function inferMachineHint(text) {
  const lowerText = text.toLowerCase();
  const quotedMatch = text.match(/['"]([^'"]+)['"]/);
  const elementName = quotedMatch?.[1];
  if (!elementName) return void 0;
  if (lowerText.includes("link")) {
    return `(role=link, name=${elementName})`;
  }
  if (lowerText.includes("button") || lowerText.includes("click")) {
    return `(role=button, name=${elementName})`;
  }
  if (lowerText.includes("field") || lowerText.includes("input") || lowerText.includes("enter") || lowerText.includes("type")) {
    return `(role=textbox, name=${elementName})`;
  }
  if (lowerText.includes("heading")) {
    return `(role=heading, name=${elementName})`;
  }
  if (lowerText.includes("checkbox")) {
    return `(role=checkbox, name=${elementName})`;
  }
  return `(text=${elementName})`;
}
function getNavigationSuggestions(text) {
  const suggestions = [];
  const urlMatch = text.match(/\/[a-zA-Z0-9/_-]+/);
  if (urlMatch) {
    suggestions.push({
      priority: 1,
      text: `User navigates to ${urlMatch[0]}`,
      explanation: "Standard navigation pattern",
      confidence: 0.9
    });
  } else {
    suggestions.push({
      priority: 1,
      text: "User navigates to /[path]",
      explanation: "Add explicit URL path",
      confidence: 0.5
    });
  }
  return suggestions;
}
function getInteractionSuggestions(text) {
  const suggestions = [];
  const quotedMatch = text.match(/['"]([^'"]+)['"]/);
  const elementName = quotedMatch?.[1] || "[element]";
  const lowerText = text.toLowerCase();
  if (lowerText.includes("click")) {
    suggestions.push({
      priority: 1,
      text: `User clicks '${elementName}' button \`(role=button, name=${elementName})\``,
      explanation: "Add role=button locator hint",
      confidence: 0.85
    });
  }
  if (lowerText.includes("fill") || lowerText.includes("enter") || lowerText.includes("type")) {
    const valueMatch = text.match(/['"]([^'"]+)['"]/);
    const value = valueMatch?.[1] || "value";
    suggestions.push({
      priority: 1,
      text: `User enters '${value}' in '${elementName}' field \`(role=textbox, name=${elementName})\``,
      explanation: "Add role=textbox locator hint",
      confidence: 0.85
    });
  }
  return suggestions;
}
function getAssertionSuggestions(text) {
  const suggestions = [];
  const quotedMatch = text.match(/['"]([^'"]+)['"]/);
  const content = quotedMatch?.[1] || "[content]";
  suggestions.push({
    priority: 1,
    text: `User should see '${content}' \`(text=${content})\``,
    explanation: "Standard visibility assertion",
    confidence: 0.8
  });
  suggestions.push({
    priority: 2,
    text: `**Assert**: '${content}' is visible \`(role=heading, name=${content})\``,
    explanation: "Structured assertion format with heading role",
    confidence: 0.7
  });
  return suggestions;
}
function getWaitSuggestions(_text) {
  const suggestions = [];
  suggestions.push({
    priority: 1,
    text: "Wait for network idle `(signal=networkidle)`",
    explanation: "Standard network wait pattern",
    confidence: 0.8
  });
  suggestions.push({
    priority: 2,
    text: "Wait for page to load `(signal=load)`",
    explanation: "Wait for load event",
    confidence: 0.7
  });
  return suggestions;
}
function getGenericSuggestions(text) {
  return [{
    priority: 1,
    text: `**Action**: ${text}`,
    explanation: "Use structured format with Action prefix",
    confidence: 0.5
  }];
}
function analyzeBlockedStep(step, reason, patterns) {
  const category = categorizeStep(step);
  const analysis = {
    step,
    reason,
    suggestions: [],
    category
  };
  switch (category) {
    case "navigation":
      analysis.suggestions = getNavigationSuggestions(step);
      break;
    case "interaction":
      analysis.suggestions = getInteractionSuggestions(step);
      analysis.machineHintSuggestion = inferMachineHint(step);
      break;
    case "assertion":
      analysis.suggestions = getAssertionSuggestions(step);
      break;
    case "wait":
      analysis.suggestions = getWaitSuggestions();
      break;
    default:
      analysis.suggestions = getGenericSuggestions(step);
  }
  return analysis;
}
function formatBlockedStepAnalysis(analysis) {
  const lines = [];
  lines.push(`
  Step: "${analysis.step}"`);
  lines.push(`  Category: ${analysis.category}`);
  lines.push(`  Reason: ${analysis.reason}`);
  if (analysis.nearestPattern) {
    lines.push(`  Nearest pattern: ${analysis.nearestPattern.name}`);
    lines.push(`  Example that works: "${analysis.nearestPattern.exampleMatch}"`);
    lines.push(`  Why it didn't match: ${analysis.nearestPattern.mismatchReason}`);
  }
  lines.push("  Suggestions:");
  for (const suggestion of analysis.suggestions) {
    lines.push(`    ${suggestion.priority}. ${suggestion.text}`);
    lines.push(`       (${suggestion.explanation}, confidence: ${(suggestion.confidence * 100).toFixed(0)}%)`);
  }
  if (analysis.machineHintSuggestion) {
    lines.push(`  Suggested hint: ${analysis.machineHintSuggestion}`);
  }
  return lines.join("\n");
}
var init_blockedStepAnalysis = __esm({
  "src/mapping/blockedStepAnalysis.ts"() {
    init_patternDistance();
  }
});

// src/cli/generate.ts
var generate_exports = {};
__export(generate_exports, {
  runGenerate: () => runGenerate
});
async function runGenerateFromPlan(planPath, journeyFilter, options) {
  const quiet = options.quiet;
  const dryRun = options["dry-run"];
  const outputDir = options.output || "./tests/generated";
  let planOutput;
  try {
    planOutput = JSON.parse(readFileSync(planPath, "utf-8"));
  } catch (e) {
    console.error(`Error: Failed to parse plan file: ${e}`);
    process.exit(1);
  }
  let plans = planOutput.plans || [];
  if (journeyFilter) {
    plans = plans.filter((p) => p.journeyId === journeyFilter);
    if (plans.length === 0) {
      console.error(`Error: No plans found for journey "${journeyFilter}"`);
      process.exit(1);
    }
  }
  if (!quiet) {
    console.log(`Generating tests from plan: ${plans.length} journey(s)`);
  }
  await loadLlkbResources(options, quiet);
  const allTests = [];
  const allModules = [];
  const allWarnings = [];
  const allErrors = [];
  let totalLlkbRecorded = 0;
  let totalLlkbSkipped = 0;
  const useLlkb = !options["no-llkb"];
  for (const plan of plans) {
    if (!quiet) {
      console.log(`  Processing: ${plan.journeyId}`);
    }
    if (plan.steps && plan.steps.length > 0 && plan.steps.some((s) => s.action)) {
      const code = generateCodeFromPlan(plan);
      allTests.push({
        filename: `${plan.journeyId.toLowerCase()}.spec.ts`,
        code
      });
      if (useLlkb && !dryRun) {
        const llkbResult = recordLlkbLearning(plan, { quiet });
        totalLlkbRecorded += llkbResult.recorded;
        totalLlkbSkipped += llkbResult.skipped;
      }
    } else if (plan.journeyPath && existsSync(plan.journeyPath)) {
      const genOptions = {
        journeys: [plan.journeyPath],
        isFilePaths: true,
        generateModules: options.modules
      };
      if (options.config) {
        genOptions.config = options.config;
      }
      const result = await generateJourneyTests(genOptions);
      allTests.push(...result.tests);
      allModules.push(...result.modules);
      allWarnings.push(...result.warnings);
      allErrors.push(...result.errors);
    } else {
      const code = generateCodeFromPlan(plan);
      allTests.push({
        filename: `${plan.journeyId.toLowerCase()}.spec.ts`,
        code
      });
    }
  }
  if (!dryRun) {
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
    for (const test of allTests) {
      const filePath = validateOutputPath(outputDir, test.filename);
      mkdirSync(dirname(filePath), { recursive: true });
      writeFileSync(filePath, test.code, "utf-8");
      if (!quiet) {
        console.log(`Generated: ${filePath}`);
      }
    }
    for (const mod of allModules) {
      const filePath = validateOutputPath(outputDir, join("modules", mod.filename));
      mkdirSync(dirname(filePath), { recursive: true });
      writeFileSync(filePath, mod.code, "utf-8");
      if (!quiet) {
        console.log(`Generated: ${filePath}`);
      }
    }
  } else {
    if (!quiet) {
      console.log("\n[Dry run] Would generate:");
      for (const test of allTests) {
        console.log(`  - ${join(outputDir, test.filename)}`);
      }
      for (const mod of allModules) {
        console.log(`  - ${join(outputDir, "modules", mod.filename)}`);
      }
    }
  }
  if (!quiet) {
    console.log(`
Summary:`);
    console.log(`  Tests: ${allTests.length}`);
    console.log(`  Modules: ${allModules.length}`);
    console.log(`  Errors: ${allErrors.length}`);
    console.log(`  Warnings: ${allWarnings.length}`);
    if (useLlkb && (totalLlkbRecorded > 0 || totalLlkbSkipped > 0)) {
      console.log(`  LLKB patterns learned: ${totalLlkbRecorded} (${totalLlkbSkipped} skipped)`);
    }
  }
  if (allErrors.length > 0) {
    console.error("\nErrors:");
    for (const error of allErrors) {
      console.error(`  - ${error}`);
    }
    process.exit(1);
  }
}
function recordLlkbLearning(plan, options = {}) {
  let recorded = 0;
  let skipped = 0;
  for (const step of plan.steps) {
    if (step.action.type === "custom") {
      skipped++;
      continue;
    }
    const primitive = plannedActionToIRPrimitive(step.action);
    if (!primitive) {
      skipped++;
      continue;
    }
    try {
      recordPatternSuccess(
        step.description,
        primitive,
        plan.journeyId,
        { llkbRoot: options.llkbRoot }
      );
      recorded++;
    } catch (err3) {
      if (!options.quiet) {
        console.warn(`  Warning: Failed to record LLKB pattern: ${err3}`);
      }
      skipped++;
    }
  }
  return { recorded, skipped };
}
function generateCodeFromPlan(plan) {
  const imports = plan.imports.join(", ");
  const fixtureSet = new Set(plan.fixtures);
  if (fixtureSet.size > 0 && !fixtureSet.has("page")) {
    fixtureSet.add("page");
  }
  const fixtureList = fixtureSet.size > 0 ? Array.from(fixtureSet) : ["page"];
  const fixtures = `{ ${fixtureList.join(", ")} }`;
  const steps = plan.steps.map((step, idx) => {
    const code = generateActionCode(step.action, step.waitCondition);
    return `    // Step ${idx + 1}: ${step.description}
${code}`;
  }).join("\n\n");
  return `/**
 * @journey ${plan.journeyId}
 * @generated ${plan.createdAt}
 * @strategy ${plan.strategy}
 */
import { ${imports} } from '@playwright/test';

test.describe('${plan.journeyId}', () => {
  test('should complete journey', async (${fixtures}) => {
${steps}
  });
});
`;
}
function escapeStringForCode(str) {
  return str.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/`/g, "\\`").replace(/\$/g, "\\$").replace(/\n/g, "\\n").replace(/\r/g, "\\r");
}
function validateOutputPath(outputDir, filename) {
  const resolvedOutput = resolve(outputDir);
  const resolvedFile = resolve(outputDir, filename);
  const relativePath = relative(resolvedOutput, resolvedFile);
  if (relativePath.startsWith("..") || resolve(relativePath) === relativePath) {
    throw new Error(`Security: Path traversal detected in filename "${filename}"`);
  }
  return resolvedFile;
}
function sanitizeNavigationUrl(url) {
  const trimmedUrl = url.trim().toLowerCase();
  for (const scheme of DANGEROUS_URL_SCHEMES) {
    if (trimmedUrl.startsWith(scheme)) {
      console.warn(`Security: Blocked dangerous URL scheme "${scheme}" - using "/" instead`);
      return "/";
    }
  }
  return url;
}
function generateActionCode(action, waitCondition) {
  const target = action.target || "";
  const value = action.value || "";
  switch (action.type) {
    // Navigation
    case "navigate":
      return `    await page.goto('${escapeStringForCode(sanitizeNavigationUrl(target || "/"))}');`;
    case "reload":
      return `    await page.reload();`;
    case "goBack":
      return `    await page.goBack();`;
    case "goForward":
      return `    await page.goForward();`;
    // Click interactions
    case "click":
      return generateClickCode(target);
    case "dblclick":
      return generateClickCode(target).replace(".click()", ".dblclick()");
    case "rightClick":
      return generateClickCode(target).replace(".click()", ".click({ button: 'right' })");
    // Form interactions
    case "fill":
      return generateFillCode(target, value);
    case "select":
      return `    await page.getByLabel('${escapeStringForCode(target)}').selectOption('${escapeStringForCode(value)}');`;
    case "check":
      return `    await page.getByLabel('${escapeStringForCode(target)}').check();`;
    case "uncheck":
      return `    await page.getByLabel('${escapeStringForCode(target)}').uncheck();`;
    case "clear":
      return `    await page.getByLabel('${escapeStringForCode(target)}').clear();`;
    case "upload":
      const files = action.files?.map((f) => `'${escapeStringForCode(f)}'`).join(", ") || "";
      return `    await page.getByLabel('${escapeStringForCode(target)}').setInputFiles([${files}]);`;
    // Other interactions
    case "press":
      const key = action.key || "Enter";
      return `    await page.keyboard.press('${key}');`;
    case "hover":
      return generateClickCode(target).replace(".click()", ".hover()");
    case "focus":
      return `    await page.getByLabel('${escapeStringForCode(target)}').focus();`;
    // Visibility assertions
    case "assert":
      return generateAssertCode(target);
    case "assertHidden":
      return `    await expect(page.getByText('${escapeStringForCode(target)}')).toBeHidden();`;
    // Text/value assertions
    case "assertText":
      return `    await expect(page.getByText('${escapeStringForCode(target)}')).toContainText('${escapeStringForCode(value)}');`;
    case "assertValue":
      return `    await expect(page.getByLabel('${escapeStringForCode(target)}')).toHaveValue('${escapeStringForCode(value)}');`;
    // State assertions
    case "assertChecked":
      return `    await expect(page.getByLabel('${escapeStringForCode(target)}')).toBeChecked();`;
    case "assertEnabled":
      return `    await expect(page.getByLabel('${escapeStringForCode(target)}')).toBeEnabled();`;
    case "assertDisabled":
      return `    await expect(page.getByLabel('${escapeStringForCode(target)}')).toBeDisabled();`;
    case "assertCount":
      const count = action.count ?? 1;
      return `    await expect(page.getByText('${escapeStringForCode(target)}')).toHaveCount(${count});`;
    // Page assertions
    case "assertURL":
      return `    await expect(page).toHaveURL(/${escapeStringForCode(target).replace(/\//g, "\\/")}/);`;
    case "assertTitle":
      return `    await expect(page).toHaveTitle('${escapeStringForCode(target)}');`;
    // Toast/notification assertions
    case "assertToast":
      const toastType = action.toastType || "info";
      const message = value ? `.getByText('${escapeStringForCode(value)}')` : "";
      return `    await expect(page.getByRole('alert')${message}).toBeVisible(); // ${toastType} toast`;
    // Modal/alert handling
    case "dismissModal":
      return `    await page.getByRole('dialog').getByRole('button', { name: /close|cancel|dismiss/i }).click();`;
    case "acceptAlert":
      return `    page.once('dialog', dialog => dialog.accept());`;
    case "dismissAlert":
      return `    page.once('dialog', dialog => dialog.dismiss());`;
    // Wait actions
    case "wait":
      return `    await page.waitForLoadState('${waitCondition || "networkidle"}');`;
    case "waitForVisible":
      return `    await page.getByText('${escapeStringForCode(target)}').waitFor({ state: 'visible' });`;
    case "waitForHidden":
      return `    await page.getByText('${escapeStringForCode(target)}').waitFor({ state: 'hidden' });`;
    case "waitForURL":
      return `    await page.waitForURL(/${escapeStringForCode(target).replace(/\//g, "\\/")}/);`;
    case "waitForNetwork":
      return `    await page.waitForLoadState('networkidle');`;
    // Module calls
    case "callModule":
      const module = action.module || "unknown";
      const method = action.method || "run";
      return `    // Module call: ${module}.${method}()
    // TODO: Implement module call or use fixture`;
    // Custom/fallback
    case "custom":
    default:
      return `    // TODO: ${target}`;
  }
}
function generateClickCode(target) {
  if (target.startsWith("button:")) {
    const name = target.slice(7);
    return `    await page.getByRole('button', { name: '${escapeStringForCode(name)}' }).click();`;
  }
  if (target.startsWith("link:")) {
    const name = target.slice(5);
    return `    await page.getByRole('link', { name: '${escapeStringForCode(name)}' }).click();`;
  }
  if (target.startsWith("checkbox:")) {
    const name = target.slice(9);
    return `    await page.getByLabel('${escapeStringForCode(name)}').click();`;
  }
  if (target.startsWith("menu:")) {
    const name = target.slice(5);
    return `    await page.getByRole('menuitem', { name: '${escapeStringForCode(name)}' }).click();`;
  }
  if (target.startsWith("tab:")) {
    const name = target.slice(4);
    return `    await page.getByRole('tab', { name: '${escapeStringForCode(name)}' }).click();`;
  }
  if (target.startsWith("menuitem:")) {
    const name = target.slice(9);
    return `    await page.getByRole('menuitem', { name: '${escapeStringForCode(name)}' }).click();`;
  }
  return `    await page.getByText('${escapeStringForCode(target)}').click();`;
}
function generateFillCode(target, value) {
  if (target.startsWith("placeholder:")) {
    const placeholder = target.slice(12);
    return `    await page.getByPlaceholder('${escapeStringForCode(placeholder)}').fill('${escapeStringForCode(value)}');`;
  }
  return `    await page.getByLabel('${escapeStringForCode(target)}').fill('${escapeStringForCode(value)}');`;
}
function generateAssertCode(target) {
  if (target.startsWith("status:")) {
    const name = target.slice(7);
    return `    await expect(page.getByRole('status', { name: '${escapeStringForCode(name)}' })).toBeVisible();`;
  }
  const lowerTarget = target.toLowerCase();
  if (lowerTarget.includes("page") || lowerTarget.includes("dashboard") || lowerTarget.includes("home")) {
    return `    await expect(page.getByRole('heading', { level: 1 })).toContainText('${escapeStringForCode(target)}');`;
  }
  return `    await expect(page.getByText('${escapeStringForCode(target)}')).toBeVisible();`;
}
async function loadLlkbResources(options, quiet) {
  const configPaths = [];
  if (options.config) {
    configPaths.push(options.config);
  }
  if (options["llkb-config"] && !options["no-llkb"]) {
    configPaths.push(options["llkb-config"]);
  }
  if (configPaths.length > 1) {
    loadConfigs(configPaths);
    if (!quiet) {
      console.log(`Loaded ${configPaths.length} config file(s)`);
    }
  }
  if (options["llkb-glossary"] && !options["no-llkb"]) {
    const glossaryResult = await loadExtendedGlossary(options["llkb-glossary"]);
    if (glossaryResult.loaded) {
      if (!quiet) {
        console.log(
          `Loaded LLKB glossary: ${glossaryResult.entryCount} entries` + (glossaryResult.exportedAt ? ` (exported: ${glossaryResult.exportedAt})` : "")
        );
      }
    } else if (!quiet) {
      console.warn(`Warning: Failed to load LLKB glossary: ${glossaryResult.error}`);
    }
  }
}
async function runGenerate(args) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      output: { type: "string", short: "o" },
      modules: { type: "boolean", short: "m", default: false },
      config: { type: "string", short: "c" },
      plan: { type: "string" },
      journey: { type: "string" },
      "dry-run": { type: "boolean", default: false },
      quiet: { type: "boolean", short: "q", default: false },
      force: { type: "boolean", short: "f", default: false },
      help: { type: "boolean", short: "h", default: false },
      // LLKB integration options
      "llkb-config": { type: "string" },
      "llkb-glossary": { type: "string" },
      "no-llkb": { type: "boolean", default: false }
    },
    allowPositionals: true
  });
  if (values.help) {
    console.log(USAGE3);
    return;
  }
  const quiet = values.quiet;
  const force = values.force;
  if (!force) {
    const currentState = loadPipelineState();
    const transition = canProceedTo(currentState, "generated");
    if (!transition.allowed) {
      console.error(`Error: ${transition.reason}`);
      console.error("Use --force to bypass state validation.");
      process.exit(1);
    }
  } else if (!quiet) {
    console.log("Warning: Bypassing pipeline state validation (--force)");
  }
  const telemetry = getTelemetry();
  await telemetry.load();
  const eventId = telemetry.trackCommandStart("generate");
  const planPath = values.plan;
  const journeyFilter = values.journey;
  if (positionals.length === 0 && !planPath) {
    const { getAutogenArtifact: getAutogenArtifact2 } = await Promise.resolve().then(() => (init_paths(), paths_exports));
    const defaultPlanPath = getAutogenArtifact2("plan");
    if (existsSync(defaultPlanPath)) {
      await runGenerateFromPlan(defaultPlanPath, journeyFilter, values);
      await updatePipelineState("generate", "generated", true, { mode: "plan" });
      telemetry.trackCommandEnd(eventId, true, { mode: "plan-based-default" });
      await telemetry.save();
      return;
    }
    console.error("Error: No journey files specified and no plan found");
    console.log('Run "artk-autogen analyze" and "artk-autogen plan" first, or provide journey files.');
    console.log(USAGE3);
    telemetry.trackCommandEnd(eventId, false, { error: "no_input" });
    await telemetry.save();
    process.exit(1);
  }
  if (planPath) {
    if (!existsSync(planPath)) {
      console.error(`Error: Plan file not found: ${planPath}`);
      telemetry.trackCommandEnd(eventId, false, { error: "plan_not_found" });
      await telemetry.save();
      process.exit(1);
    }
    await runGenerateFromPlan(planPath, journeyFilter, values);
    await updatePipelineState("generate", "generated", true, { mode: "plan", planPath });
    telemetry.trackCommandEnd(eventId, true, { mode: "plan-based-explicit" });
    await telemetry.save();
    return;
  }
  const outputDir = values.output || "./tests/generated";
  const dryRun = values["dry-run"];
  const configPaths = [];
  if (values.config) {
    configPaths.push(values.config);
  }
  if (values["llkb-config"] && !values["no-llkb"]) {
    configPaths.push(values["llkb-config"]);
  }
  const configPath = values.config;
  if (configPaths.length > 1) {
    loadConfigs(configPaths);
    if (!quiet) {
      console.log(`Loaded ${configPaths.length} config file(s)`);
    }
  }
  if (values["llkb-glossary"] && !values["no-llkb"]) {
    const glossaryResult = await loadExtendedGlossary(values["llkb-glossary"]);
    if (glossaryResult.loaded) {
      if (!quiet) {
        console.log(
          `Loaded LLKB glossary: ${glossaryResult.entryCount} entries` + (glossaryResult.exportedAt ? ` (exported: ${glossaryResult.exportedAt})` : "")
        );
      }
    } else if (!quiet) {
      console.warn(`Warning: Failed to load LLKB glossary: ${glossaryResult.error}`);
    }
  }
  const journeyFiles = await fg2(positionals, {
    absolute: true
  });
  if (journeyFiles.length === 0) {
    console.error("Error: No journey files found matching the patterns");
    telemetry.trackCommandEnd(eventId, false, { error: "no_matching_files" });
    await telemetry.save();
    process.exit(1);
  }
  if (!quiet) {
    console.log(`Found ${journeyFiles.length} journey file(s)`);
    const stats = getGlossaryStats();
    if (stats.extendedEntries > 0) {
      console.log(`LLKB glossary active: ${stats.extendedEntries} extended entries`);
    }
  }
  const options = {
    journeys: journeyFiles,
    isFilePaths: true,
    generateModules: values.modules
  };
  if (configPath) {
    options.config = configPath;
  }
  const result = await generateJourneyTests(options);
  const blockedStepWarnings = result.warnings.filter((w) => w.includes("BLOCKED:"));
  const blockedStepAnalyses = [];
  if (blockedStepWarnings.length > 0) {
    if (!quiet) {
      console.log(`
\u{1F527} Blocked Step Analysis (${blockedStepWarnings.length} blocked steps):
`);
    }
    for (const warning of blockedStepWarnings) {
      const match = warning.match(/BLOCKED:\s*(.+?)(?:\s*-\s*(.+))?$/);
      if (match) {
        const stepText = match[1] || warning;
        const reason = match[2] || "Unknown reason";
        const analysis = analyzeBlockedStep(stepText, reason);
        blockedStepAnalyses.push(analysis);
        const journeyId = journeyFiles.length === 1 ? basename(journeyFiles[0], ".md") : "multiple";
        recordBlockedStep({
          journeyId,
          stepText,
          reason,
          suggestedFix: analysis.suggestions[0]?.text,
          nearestPattern: analysis.nearestPattern?.name,
          nearestDistance: analysis.nearestPattern?.distance
        });
        if (!quiet) {
          console.log(formatBlockedStepAnalysis(analysis));
          console.log();
        }
      }
    }
    if (process.env.ARTK_JSON_OUTPUT || !dryRun) {
      const analysisPath = join(outputDir, "blocked-steps-analysis.json");
      mkdirSync(dirname(analysisPath), { recursive: true });
      writeFileSync(analysisPath, JSON.stringify(blockedStepAnalyses, null, 2), "utf-8");
      if (!quiet) {
        console.log(`
\u{1F4A1} Blocked step analysis saved to: ${analysisPath}`);
        console.log("   Use this file to auto-fix journey steps.\n");
      }
    }
  }
  if (result.errors.length > 0) {
    console.error("\nErrors:");
    for (const error of result.errors) {
      console.error(`  - ${error}`);
    }
  }
  const otherWarnings = result.warnings.filter((w) => !w.includes("BLOCKED:"));
  if (otherWarnings.length > 0 && !quiet) {
    console.warn("\nWarnings:");
    for (const warning of otherWarnings) {
      console.warn(`  - ${warning}`);
    }
  }
  if (!dryRun) {
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
    for (const test of result.tests) {
      const filePath = validateOutputPath(outputDir, test.filename);
      mkdirSync(dirname(filePath), { recursive: true });
      writeFileSync(filePath, test.code, "utf-8");
      if (!quiet) {
        console.log(`Generated: ${filePath}`);
      }
    }
    for (const mod of result.modules) {
      const filePath = validateOutputPath(outputDir, join("modules", mod.filename));
      mkdirSync(dirname(filePath), { recursive: true });
      writeFileSync(filePath, mod.code, "utf-8");
      if (!quiet) {
        console.log(`Generated: ${filePath}`);
      }
    }
  } else {
    if (!quiet) {
      console.log("\n[Dry run] Would generate:");
      for (const test of result.tests) {
        console.log(`  - ${join(outputDir, test.filename)}`);
      }
      for (const mod of result.modules) {
        console.log(`  - ${join(outputDir, "modules", mod.filename)}`);
      }
    }
  }
  if (!quiet) {
    console.log(`
Summary:`);
    console.log(`  Tests: ${result.tests.length}`);
    console.log(`  Modules: ${result.modules.length}`);
    console.log(`  Blocked steps: ${blockedStepAnalyses.length}`);
    console.log(`  Errors: ${result.errors.length}`);
    console.log(`  Warnings: ${otherWarnings.length}`);
    if (blockedStepAnalyses.length > 0) {
      console.log(`
\u{1F4A1} Run 'artk-autogen patterns gaps' to see pattern improvement suggestions.`);
    }
  }
  const success = result.errors.length === 0;
  await updatePipelineState("generate", "generated", success, {
    testsGenerated: result.tests.length,
    modulesGenerated: result.modules.length,
    blockedSteps: blockedStepAnalyses.length
  });
  telemetry.trackCommandEnd(eventId, success, {
    tests: result.tests.length,
    modules: result.modules.length,
    blockedSteps: blockedStepAnalyses.length,
    errors: result.errors.length,
    warnings: otherWarnings.length,
    dryRun
  });
  await telemetry.save();
  if (result.errors.length > 0) {
    process.exit(1);
  }
}
var DANGEROUS_URL_SCHEMES, USAGE3;
var init_generate = __esm({
  "src/cli/generate.ts"() {
    init_index();
    init_loader();
    init_glossary();
    init_telemetry2();
    init_blockedStepAnalysis();
    init_state();
    init_telemetry();
    init_patternExtension();
    init_plannedActionAdapter();
    DANGEROUS_URL_SCHEMES = [
      "javascript:",
      "data:",
      "vbscript:",
      "file:"
    ];
    USAGE3 = `
Usage: artk-autogen generate [options] [journey-files...]

Generate Playwright tests from plan or Journey markdown files.

This command supports two modes:
1. Plan-based (recommended): Use --plan to generate from a prepared plan
2. Direct (legacy): Pass journey files directly for backwards compatibility

Arguments:
  journey-files    Journey file paths or glob patterns (legacy mode)

Options:
  -o, --output <dir>       Output directory for generated files (default: ./tests/generated)
  -m, --modules            Also generate module files
  -c, --config <file>      Path to autogen config file
  --plan <file>            Path to plan.json (default: .artk/autogen/plan.json if exists)
  --journey <id>           Generate only for specific journey ID from plan
  --dry-run                Preview generation without writing files
  -q, --quiet              Suppress output except errors
  -f, --force              Skip pipeline state validation
  -h, --help               Show this help message

LLKB Integration Options:
  --llkb-config <file>     Path to LLKB-generated config file
  --llkb-glossary <file>   Path to LLKB-generated glossary file
  --no-llkb                Disable LLKB integration even if config enables it

Examples:
  # Plan-based generation (recommended)
  artk-autogen generate --plan .artk/autogen/plan.json
  artk-autogen generate --plan plan.json --journey JRN-0001

  # Direct generation (legacy, still supported)
  artk-autogen generate journeys/login.md
  artk-autogen generate "journeys/*.md" -o tests/e2e -m
  artk-autogen generate journeys/*.md --llkb-config autogen-llkb.config.yml
`;
  }
});
function getBlockedStepsFilePath() {
  const autogenDir = getAutogenDir();
  return join(autogenDir, BLOCKED_STEPS_FILE);
}
function loadBlockedSteps() {
  const filePath = getBlockedStepsFilePath();
  if (!existsSync(filePath)) {
    return [];
  }
  try {
    const content = readFileSync(filePath, "utf-8");
    const data = JSON.parse(content);
    return Array.isArray(data.records) ? data.records : [];
  } catch {
    return [];
  }
}
function saveBlockedSteps(records) {
  const filePath = getBlockedStepsFilePath();
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const trimmedRecords = records.slice(-MAX_RECORDS);
  const data = {
    version: "1.0.0",
    lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
    recordCount: trimmedRecords.length,
    records: trimmedRecords
  };
  writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}
function flushPendingRecords() {
  if (pendingRecords.length === 0) return;
  const existing = loadBlockedSteps();
  const combined = [...existing, ...pendingRecords];
  saveBlockedSteps(combined);
  pendingRecords = [];
  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }
}
function trackBlockedStep(record) {
  pendingRecords.push({
    ...record,
    timestamp: record.timestamp || (/* @__PURE__ */ new Date()).toISOString()
  });
  if (!flushTimeout) {
    flushTimeout = setTimeout(flushPendingRecords, FLUSH_INTERVAL_MS);
  }
  if (pendingRecords.length >= 100) {
    flushPendingRecords();
  }
}
function flushBlockedStepTelemetry() {
  flushPendingRecords();
}
function normalizeForGrouping(text) {
  return text.toLowerCase().trim().replace(/"[^"]+"/g, '"VALUE"').replace(/'[^']+'/g, "'VALUE'").replace(/\d+/g, "N").replace(/\s+/g, " ");
}
function analyzePatternGaps() {
  flushPendingRecords();
  const records = loadBlockedSteps();
  const byErrorType = {};
  for (const record of records) {
    const errorType = record.errorType || "unknown";
    byErrorType[errorType] = (byErrorType[errorType] || 0) + 1;
  }
  const byJourney = {};
  for (const record of records) {
    byJourney[record.journeyId] = (byJourney[record.journeyId] || 0) + 1;
  }
  const patternGroups = /* @__PURE__ */ new Map();
  for (const record of records) {
    const normalizedPattern = normalizeForGrouping(record.stepText);
    const existing = patternGroups.get(normalizedPattern);
    if (existing) {
      existing.count++;
      if (record.errorType) {
        existing.errorTypes.add(record.errorType);
      }
      if (existing.originalTexts.length < 3) {
        existing.originalTexts.push(record.stepText);
      }
    } else {
      patternGroups.set(normalizedPattern, {
        count: 1,
        errorTypes: new Set(record.errorType ? [record.errorType] : []),
        originalTexts: [record.stepText]
      });
    }
  }
  const topPatterns = Array.from(patternGroups.entries()).map(([pattern, data]) => ({
    pattern,
    count: data.count,
    errorTypes: Array.from(data.errorTypes),
    examples: data.originalTexts
  })).sort((a, b) => b.count - a.count).slice(0, 20);
  return {
    totalBlocked: records.length,
    byErrorType,
    byJourney,
    topPatterns,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function suggestNewPatterns() {
  const stats = analyzePatternGaps();
  const suggestions = [];
  for (const pattern of stats.topPatterns) {
    if (pattern.count < 3) continue;
    const regex = pattern.pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/"VALUE"/g, '"([^"]+)"').replace(/'VALUE'/g, "'([^']+)'").replace(/N/g, "\\d+");
    const confidence = Math.min(0.9, 0.5 + pattern.count / 50);
    suggestions.push({
      suggestedRegex: `^${regex}$`,
      coveredCount: pattern.count,
      examples: pattern.examples || [],
      confidence
    });
  }
  return suggestions.slice(0, 10);
}
function registerExitHandlers() {
  let registered = false;
  const handleExit = () => {
    if (!registered) {
      registered = true;
      flushBlockedStepTelemetry();
    }
  };
  process.on("beforeExit", handleExit);
  process.on("SIGINT", () => {
    handleExit();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    handleExit();
    process.exit(0);
  });
}
var BLOCKED_STEPS_FILE, MAX_RECORDS, pendingRecords, flushTimeout, FLUSH_INTERVAL_MS;
var init_blocked_step_telemetry = __esm({
  "src/shared/blocked-step-telemetry.ts"() {
    init_paths();
    BLOCKED_STEPS_FILE = "blocked-steps-telemetry.json";
    MAX_RECORDS = 1e4;
    pendingRecords = [];
    flushTimeout = null;
    FLUSH_INTERVAL_MS = 5e3;
    registerExitHandlers();
  }
});

// src/cli/run.ts
var run_exports = {};
__export(run_exports, {
  parseErrorLocation: () => parseErrorLocation,
  parseErrorType: () => parseErrorType,
  parseErrors: () => parseErrors2,
  runRun: () => runRun,
  suggestFix: () => suggestFix
});
function parseErrorType(message) {
  const lower = message.toLowerCase();
  if (lower.includes("ts(") || lower.includes("error ts") || /\berror\s+ts\d+\b/.test(lower)) {
    return "typescript";
  }
  if (lower.includes("syntaxerror:") || lower.includes("syntax error")) {
    return "typescript";
  }
  if (lower.includes("expect(") || lower.includes("tohave") || lower.includes("tocontain") || lower.includes("tobe") || lower.includes("assertion") || lower.includes("expected string:") || lower.includes("received string:")) {
    return "assertion";
  }
  if (/timeout\s+\d+ms/i.test(message) || lower.includes("timeout exceeded") || lower.includes("exceeded time")) {
    return "timeout";
  }
  if (lower.includes("page.goto") || lower.includes("net::err") || lower.includes("navigation") || lower.includes("err_name_not_resolved") || lower.includes("err_connection")) {
    return "navigation";
  }
  if (lower.includes("strict mode violation") || lower.includes("resolved to 0 elements") || lower.includes("locator.click:") || lower.includes("locator.fill:") || lower.includes("locator") && !lower.includes("expect")) {
    return "selector";
  }
  if (lower.includes("typeerror:") || lower.includes("referenceerror:")) {
    return "runtime";
  }
  if (lower.includes("error:") || lower.includes("exception")) {
    return "runtime";
  }
  return "unknown";
}
function parseErrorLocation(message) {
  const match = message.match(/([^\s:]+\.(ts|js)):(\d+):?(\d+)?/);
  if (match && match[1] && match[3]) {
    return {
      file: match[1],
      line: parseInt(match[3], 10),
      column: match[4] ? parseInt(match[4], 10) : void 0
    };
  }
  return void 0;
}
function suggestFix(errorType, message) {
  switch (errorType) {
    case "selector":
      if (message.includes("locator")) {
        return "Check selector - element may not exist, have different selector, or need explicit wait";
      }
      return "Element not found - verify selector or add explicit wait";
    case "timeout":
      return "Increase timeout or check if element/action is correct";
    case "assertion":
      return "Check expected vs actual value - may need to adjust assertion or fix test data";
    case "navigation":
      return "Check URL is correct and accessible - may need auth or network configuration";
    case "typescript":
      return "Fix TypeScript syntax error before re-running";
    case "runtime":
      return "Check test logic and error stack trace for root cause";
    default:
      return void 0;
  }
}
function parseErrors2(stdout, stderr) {
  const errors = [];
  const combined = `${stdout}
${stderr}`;
  const errorBlocks = combined.split(/(?=Error:|✘|FAILED|AssertionError|\berror TS\d+)/);
  for (const block of errorBlocks) {
    if (!block.trim() || block.length < 20) continue;
    const lowerBlock = block.toLowerCase();
    if (!lowerBlock.includes("error") && !block.includes("\u2718") && !lowerBlock.includes("failed")) {
      continue;
    }
    const lines = block.split("\n");
    const message = lines.slice(0, 5).join(" ").trim().substring(0, 500);
    if (!message) continue;
    const errorType = parseErrorType(message);
    const location = parseErrorLocation(block);
    const snippetMatch = block.match(/>\s*\d+\s*\|(.+)/);
    const snippet = snippetMatch?.[1]?.trim();
    if (!location && !snippet) {
      const trimmedMsg = message.trim();
      if (trimmedMsg.endsWith(":") && trimmedMsg.length < TRUNCATED_MESSAGE_MAX_LENGTH) {
        continue;
      }
    }
    errors.push({
      message,
      type: errorType,
      location,
      snippet,
      suggestion: suggestFix(errorType, message)
    });
  }
  return errors;
}
async function runPlaywrightTest(testPath, options) {
  const harnessRoot = getHarnessRoot();
  const startTime = Date.now();
  const args = [
    "playwright",
    "test",
    testPath,
    "--reporter=list",
    `--timeout=${options.timeout}`,
    `--retries=${options.retries}`
  ];
  if (options.headed) {
    args.push("--headed");
  }
  if (options.debug) {
    args.push("--debug");
  }
  return new Promise((resolve8) => {
    let stdout = "";
    let stderr = "";
    const proc = spawn("npx", args, {
      cwd: harnessRoot,
      env: {
        ...process.env,
        // Force color output for better error parsing
        FORCE_COLOR: "1"
      }
    });
    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    proc.on("close", (code) => {
      const duration = Date.now() - startTime;
      const exitCode = code ?? 1;
      let status = "passed";
      if (exitCode !== 0) {
        if (stdout.includes("timeout") || stderr.includes("timeout")) {
          status = "timeout";
        } else if (stderr.includes("Error:") || stdout.includes("FAILED")) {
          status = "failed";
        } else {
          status = "error";
        }
      }
      const errors = status !== "passed" ? parseErrors2(stdout, stderr) : [];
      const artifacts = {};
      const testResultsDir = join(harnessRoot, "test-results");
      const testName = basename(testPath, ".spec.ts");
      const possibleScreenshot = join(testResultsDir, testName, "test-failed-1.png");
      if (existsSync(possibleScreenshot)) {
        artifacts.screenshot = possibleScreenshot;
      }
      const possibleTrace = join(testResultsDir, testName, "trace.zip");
      if (existsSync(possibleTrace)) {
        artifacts.trace = possibleTrace;
      }
      let journeyId;
      try {
        const testContent = readFileSync(testPath, "utf-8");
        const journeyMatch = testContent.match(/@journey\s+(\S+)/);
        if (journeyMatch) {
          journeyId = journeyMatch[1];
        }
      } catch {
      }
      const MAX_OUTPUT_SIZE = 1e4;
      const truncateWithIndicator = (text, name) => {
        if (text.length <= MAX_OUTPUT_SIZE) return text;
        let truncateAt = MAX_OUTPUT_SIZE;
        const code2 = text.charCodeAt(truncateAt - 1);
        if (code2 >= 55296 && code2 <= 56319) {
          truncateAt--;
        }
        const truncated = text.slice(0, truncateAt);
        return `${truncated}

[${name} TRUNCATED - ${text.length - truncateAt} more characters]`;
      };
      resolve8({
        version: "1.0",
        testPath,
        journeyId,
        status,
        duration,
        errors,
        output: {
          stdout: truncateWithIndicator(stdout, "STDOUT"),
          stderr: truncateWithIndicator(stderr, "STDERR"),
          exitCode
        },
        artifacts,
        executedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    });
    proc.on("error", (err3) => {
      resolve8({
        version: "1.0",
        testPath,
        status: "error",
        duration: Date.now() - startTime,
        errors: [{
          message: `Failed to spawn playwright: ${err3.message}`,
          type: "runtime"
        }],
        output: {
          stdout,
          stderr,
          exitCode: 1
        },
        artifacts: {},
        executedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    });
  });
}
async function runRun(args) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      output: { type: "string", short: "o" },
      timeout: { type: "string", default: "30000" },
      retries: { type: "string", default: "0" },
      headed: { type: "boolean", default: false },
      debug: { type: "boolean", default: false },
      json: { type: "boolean", default: false },
      quiet: { type: "boolean", short: "q", default: false },
      force: { type: "boolean", short: "f", default: false },
      help: { type: "boolean", short: "h", default: false }
    },
    allowPositionals: true
  });
  if (values.help) {
    console.log(USAGE4);
    return;
  }
  if (positionals.length === 0) {
    console.error("Error: No test files specified");
    console.log(USAGE4);
    process.exit(1);
  }
  const quiet = values.quiet;
  const outputJson = values.json;
  const force = values.force;
  if (!force) {
    const currentState = await loadPipelineState();
    const transition = canProceedTo(currentState, "tested");
    if (!transition.allowed) {
      console.error(`Error: ${transition.reason}`);
      console.error("Use --force to bypass state validation.");
      process.exit(1);
    }
  } else if (!quiet && !outputJson) {
    console.log("Warning: Bypassing pipeline state validation (--force)");
  }
  const timeout = parseInt(values.timeout, 10);
  const retries = parseInt(values.retries, 10);
  if (isNaN(timeout) || timeout <= 0) {
    console.error(`Error: Invalid timeout value "${values.timeout}". Must be a positive number.`);
    process.exit(1);
  }
  if (isNaN(retries) || retries < 0) {
    console.error(`Error: Invalid retries value "${values.retries}". Must be a non-negative number.`);
    process.exit(1);
  }
  const telemetry = getTelemetry();
  await telemetry.load();
  const eventId = telemetry.trackCommandStart("run");
  if (!quiet && !outputJson) {
    console.log("Checking Playwright installation...");
  }
  const playwrightCheck = await checkPlaywrightInstalled();
  if (!playwrightCheck.installed) {
    console.error(`Error: Playwright is not installed or not accessible.`);
    console.error(`  ${playwrightCheck.error}`);
    console.error("\nTo install Playwright, run:");
    console.error("  npx playwright install");
    telemetry.trackError("run", "playwright_not_installed", playwrightCheck.error || "Unknown");
    telemetry.trackCommandEnd(eventId, false, { error: "playwright_not_installed" });
    await telemetry.save();
    process.exit(1);
  }
  if (!quiet && !outputJson) {
    console.log(`Running ${positionals.length} test file(s) with Playwright ${playwrightCheck.version || "unknown"}...`);
  }
  const harnessRoot = getHarnessRoot();
  const results = [];
  for (const testPath of positionals) {
    let fullPath;
    try {
      fullPath = validatePath(testPath, harnessRoot);
    } catch (error) {
      if (error instanceof PathTraversalError) {
        console.error(`Error: Path traversal detected: "${testPath}"`);
        console.error(`  Paths must be within harness root: ${harnessRoot}`);
        results.push({
          version: "1.0",
          testPath,
          status: "error",
          duration: 0,
          errors: [{ message: `Path traversal blocked: ${testPath}`, type: "runtime" }],
          output: { stdout: "", stderr: "", exitCode: 1 },
          artifacts: {},
          executedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
        continue;
      }
      throw error;
    }
    if (!existsSync(fullPath)) {
      console.error(`Warning: Test file not found: ${fullPath}`);
      results.push({
        version: "1.0",
        testPath: fullPath,
        status: "error",
        duration: 0,
        errors: [{ message: `File not found: ${fullPath}`, type: "runtime" }],
        output: { stdout: "", stderr: "", exitCode: 1 },
        artifacts: {},
        executedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      continue;
    }
    if (!quiet && !outputJson) {
      console.log(`
Running: ${basename(fullPath)}`);
    }
    const result = await runPlaywrightTest(fullPath, {
      timeout,
      retries,
      headed: values.headed,
      debug: values.debug
    });
    results.push(result);
    if (!quiet && !outputJson) {
      const icon = result.status === "passed" ? "\u2713" : "\u2717";
      console.log(`  ${icon} ${result.status} (${result.duration}ms)`);
      if (result.errors.length > 0) {
        console.log(`    Errors: ${result.errors.length}`);
        for (const err3 of result.errors.slice(0, 3)) {
          console.log(`    - [${err3.type}] ${err3.message.substring(0, 100)}`);
        }
      }
    }
  }
  const summary = {
    total: results.length,
    passed: results.filter((r) => r.status === "passed").length,
    failed: results.filter((r) => r.status === "failed").length,
    timeout: results.filter((r) => r.status === "timeout").length,
    error: results.filter((r) => r.status === "error").length,
    totalDuration: results.reduce((sum, r) => sum + r.duration, 0)
  };
  const output = {
    version: "1.0",
    results,
    summary,
    harnessRoot,
    executedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (outputJson) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    const outputPath = values.output || getAutogenArtifact("results");
    await ensureAutogenDir();
    writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf-8");
    if (!quiet) {
      console.log(`
Results:`);
      console.log(`  Passed: ${summary.passed}`);
      console.log(`  Failed: ${summary.failed}`);
      console.log(`  Timeout: ${summary.timeout}`);
      console.log(`  Error: ${summary.error}`);
      console.log(`  Duration: ${Math.round(summary.totalDuration / 1e3)}s`);
      console.log(`
Output: ${outputPath}`);
    }
  }
  const allPassed = summary.failed === 0 && summary.error === 0 && summary.timeout === 0;
  const pipelineStage = allPassed ? "completed" : "tested";
  if (!allPassed) {
    for (const result of results) {
      if (result.status !== "passed" && result.journeyId) {
        for (const error of result.errors) {
          Promise.resolve().then(() => {
            try {
              recordPatternFailure(
                error.message.substring(0, 500),
                // Truncate for pattern matching
                result.journeyId
              );
              trackBlockedStep({
                stepText: error.message.substring(0, 500),
                journeyId: result.journeyId,
                errorType: error.type,
                timestamp: (/* @__PURE__ */ new Date()).toISOString()
              });
            } catch (e) {
              if (!quiet) {
                console.warn(`LLKB recording skipped: ${e instanceof Error ? e.message : "unknown error"}`);
              }
            }
          });
        }
      }
    }
  }
  await updatePipelineState("run", pipelineStage, allPassed, {
    testPaths: positionals
  });
  telemetry.trackCommandEnd(eventId, allPassed, {
    passed: summary.passed,
    failed: summary.failed,
    timeout: summary.timeout,
    error: summary.error,
    duration: summary.totalDuration
  });
  await telemetry.save();
  if (!allPassed) {
    process.exit(1);
  }
}
var USAGE4, TRUNCATED_MESSAGE_MAX_LENGTH;
var init_run = __esm({
  "src/cli/run.ts"() {
    init_paths();
    init_state();
    init_telemetry();
    init_playwright_runner();
    init_patternExtension();
    init_blocked_step_telemetry();
    USAGE4 = `
Usage: artk-autogen run [options] <test-files...>

Execute Playwright tests and output structured results.

Arguments:
  test-files       Test file paths or glob patterns

Options:
  -o, --output <path>    Output path for results.json (default: .artk/autogen/results.json)
  --timeout <ms>         Test timeout in milliseconds (default: 30000)
  --retries <n>          Number of retries for failed tests (default: 0)
  --headed               Run in headed mode
  --debug                Run with debug mode (pause on failure)
  --json                 Output JSON to stdout instead of file
  -q, --quiet            Suppress output except errors
  -f, --force            Skip pipeline state validation
  -h, --help             Show this help message

Examples:
  artk-autogen run tests/login.spec.ts
  artk-autogen run "tests/*.spec.ts"
  artk-autogen run tests/login.spec.ts --headed --debug
  artk-autogen run tests/login.spec.ts --json
`;
    TRUNCATED_MESSAGE_MAX_LENGTH = 80;
  }
});

// src/cli/refine.ts
var refine_exports = {};
__export(refine_exports, {
  runRefine: () => runRefine
});
function mapErrorTypeToCategory(errorType) {
  switch (errorType) {
    case "selector":
      return "SELECTOR_NOT_FOUND";
    case "timeout":
      return "TIMEOUT";
    case "assertion":
      return "ASSERTION_FAILED";
    case "navigation":
      return "NAVIGATION_ERROR";
    case "typescript":
      return "SYNTAX_ERROR";
    case "runtime":
      return "RUNTIME_ERROR";
    default:
      return "UNKNOWN";
  }
}
function generateRefinement(error) {
  const message = error.message.toLowerCase();
  let suggestion = error.suggestion || "Review the error and fix manually";
  let confidence = 0.5;
  if (error.type === "selector") {
    for (const [pattern, sug] of Object.entries(SELECTOR_REFINEMENTS)) {
      if (message.includes(pattern)) {
        suggestion = sug;
        confidence = 0.8;
        break;
      }
    }
  } else if (error.type === "assertion") {
    for (const [pattern, sug] of Object.entries(ASSERTION_REFINEMENTS)) {
      if (message.includes(pattern)) {
        suggestion = sug;
        confidence = 0.75;
        break;
      }
    }
  } else if (error.type === "timeout") {
    for (const [pattern, sug] of Object.entries(TIMEOUT_REFINEMENTS)) {
      if (message.includes(pattern)) {
        suggestion = sug;
        confidence = 0.7;
        break;
      }
    }
  }
  let codeChange;
  if (error.location && error.snippet) {
    codeChange = suggestCodeChange(error);
  }
  return {
    errorType: error.type,
    errorMessage: error.message.substring(0, 300),
    location: error.location,
    suggestion,
    confidence,
    codeChange
  };
}
function suggestCodeChange(error) {
  if (!error.location || !error.snippet) return void 0;
  const { file, line } = error.location;
  const snippet = error.snippet;
  if (error.type === "timeout" && snippet.includes("locator")) {
    return {
      type: "replace",
      file,
      line,
      oldCode: snippet,
      newCode: `await page.waitForSelector('${extractSelector(snippet)}', { state: 'visible' });
  ${snippet}`,
      explanation: "Add explicit waitForSelector before the action"
    };
  }
  if (error.type === "selector" && error.message.includes("intercept")) {
    return {
      type: "replace",
      file,
      line,
      oldCode: snippet,
      newCode: snippet.replace(".click()", ".scrollIntoViewIfNeeded();\n  await " + snippet.trim()),
      explanation: "Scroll element into view before clicking"
    };
  }
  if (error.type === "selector" && error.message.includes("strict")) {
    return {
      type: "replace",
      file,
      line,
      oldCode: snippet,
      newCode: snippet.replace(".click()", ".first().click()"),
      explanation: "Use .first() to select single element from multiple matches"
    };
  }
  return void 0;
}
function extractSelector(snippet) {
  const match = snippet.match(/(?:locator|getBy\w+)\(['"]([^'"]+)['"]\)/);
  return match?.[1] || "unknown";
}
function loadRefineState(testPath, maxAttempts) {
  const stateDir = getAutogenDir();
  const statePath = join(stateDir, `refine-state-${basename(testPath, ".spec.ts")}.json`);
  if (existsSync(statePath)) {
    try {
      const loaded = JSON.parse(readFileSync(statePath, "utf-8"));
      if (!loaded.circuitBreakerState) {
        const oldState = loaded;
        loaded.circuitBreakerState = {
          isOpen: oldState.circuitBreaker?.isOpen ?? false,
          openReason: oldState.circuitBreaker?.openReason,
          attemptCount: oldState.circuitBreaker?.attemptCount ?? loaded.attempts.length,
          errorHistory: oldState.circuitBreaker?.errorHistory ?? [],
          tokensUsed: oldState.circuitBreaker?.tokensUsed ?? 0,
          maxAttempts
        };
      }
      if (!loaded.errorCountHistory) {
        loaded.errorCountHistory = loaded.attempts.map((a) => a.errors.length);
      }
      return loaded;
    } catch {
    }
  }
  return {
    testPath,
    attempts: [],
    circuitBreakerState: {
      isOpen: false,
      attemptCount: 0,
      errorHistory: [],
      tokensUsed: 0,
      maxAttempts
    },
    errorCountHistory: []
  };
}
function saveRefineState(state) {
  const stateDir = getAutogenDir();
  const statePath = join(stateDir, `refine-state-${basename(state.testPath, ".spec.ts")}.json`);
  writeFileSync(statePath, JSON.stringify(state, null, 2), "utf-8");
}
async function runRefine(args) {
  const { values } = parseArgs({
    args,
    options: {
      results: { type: "string", short: "r" },
      test: { type: "string", short: "t" },
      "max-attempts": { type: "string", default: "3" },
      json: { type: "boolean", default: false },
      quiet: { type: "boolean", short: "q", default: false },
      force: { type: "boolean", short: "f", default: false },
      help: { type: "boolean", short: "h", default: false }
    },
    allowPositionals: true
  });
  if (values.help) {
    console.log(USAGE5);
    return;
  }
  const quiet = values.quiet;
  const outputJson = values.json;
  const force = values.force;
  if (!force) {
    const currentState = loadPipelineState();
    const transition = canProceedTo(currentState, "refining");
    if (!transition.allowed) {
      console.error(`Error: ${transition.reason}`);
      console.error("Use --force to bypass state validation.");
      process.exit(1);
    }
  } else if (!quiet && !outputJson) {
    console.log("Warning: Bypassing pipeline state validation (--force)");
  }
  const maxAttempts = parseInt(values["max-attempts"], 10);
  if (isNaN(maxAttempts) || maxAttempts <= 0) {
    console.error(`Error: Invalid max-attempts value "${values["max-attempts"]}". Must be a positive number.`);
    process.exit(1);
  }
  const telemetry = getTelemetry();
  await telemetry.load();
  const eventId = telemetry.trackCommandStart("refine");
  const resultsPath = values.results || getAutogenArtifact("results");
  if (!existsSync(resultsPath)) {
    console.error(`Error: Results file not found: ${resultsPath}`);
    console.error('Run "artk-autogen run" first.');
    process.exit(1);
  }
  let runOutput;
  try {
    runOutput = JSON.parse(readFileSync(resultsPath, "utf-8"));
  } catch (e) {
    console.error(`Error: Failed to parse results file: ${e}`);
    process.exit(1);
  }
  let results = runOutput.results;
  if (values.test) {
    results = results.filter((r) => r.testPath.includes(values.test));
    if (results.length === 0) {
      console.error(`Error: No results found for test "${values.test}"`);
      process.exit(1);
    }
  }
  const failedResults = results.filter((r) => r.status !== "passed");
  if (failedResults.length === 0) {
    if (!quiet && !outputJson) {
      console.log("All tests passed - no refinement needed");
    }
    if (outputJson) {
      console.log(JSON.stringify({ status: "converged", message: "All tests passed" }, null, 2));
    }
    return;
  }
  await ensureAutogenDir();
  const outputs = [];
  for (const result of failedResults) {
    const state = loadRefineState(result.testPath, maxAttempts);
    const circuitBreaker = new CircuitBreaker({
      maxAttempts,
      initialState: state.circuitBreakerState
    });
    const convergenceDetector = new ConvergenceDetector();
    convergenceDetector.restoreFromHistory(state.errorCountHistory);
    const currentErrors = result.errors.map((e) => ({
      fingerprint: `${e.type}:${e.message.substring(0, 50)}`,
      category: mapErrorTypeToCategory(e.type),
      message: e.message,
      originalError: e.message,
      severity: "major",
      timestamp: /* @__PURE__ */ new Date()
    }));
    circuitBreaker.recordAttempt(currentErrors);
    convergenceDetector.recordAttempt(currentErrors);
    const analysis = analyzeRefinementProgress(
      [],
      // Fix attempts not used directly
      circuitBreaker,
      convergenceDetector
    );
    const suggestions = result.errors.map((e) => generateRefinement(e));
    let status = "needs_refinement";
    let recommendation = "Apply suggested refinements and re-run the test";
    if (result.errors.length === 0) {
      status = "converged";
      recommendation = "Test is now passing";
      if (result.journeyId && state.attempts.length > 0) {
        Promise.resolve().then(() => {
          try {
            const session = {
              sessionId: `refine-${Date.now()}`,
              journeyId: result.journeyId,
              testFile: result.testPath,
              startTime: new Date(state.attempts[0]?.timestamp ?? Date.now()),
              originalCode: "",
              currentCode: "",
              attempts: state.attempts.map((attempt, idx) => ({
                attemptNumber: attempt.attemptNumber,
                timestamp: new Date(attempt.timestamp),
                error: {
                  fingerprint: `attempt-${idx}`,
                  category: attempt.errors[0]?.type === "selector" ? "SELECTOR_NOT_FOUND" : attempt.errors[0]?.type === "timeout" ? "TIMEOUT" : attempt.errors[0]?.type === "assertion" ? "ASSERTION_FAILED" : "UNKNOWN",
                  message: attempt.errors[0]?.message ?? "Unknown error",
                  originalError: attempt.errors[0]?.message ?? "",
                  severity: "major",
                  timestamp: new Date(attempt.timestamp)
                },
                proposedFixes: [],
                appliedFix: attempt.suggestions[0] ? {
                  type: "OTHER",
                  description: attempt.suggestions[0].suggestion,
                  location: attempt.suggestions[0].location ? {
                    file: attempt.suggestions[0].location.file,
                    line: attempt.suggestions[0].location.line
                  } : { file: result.testPath, line: 0 },
                  originalCode: "",
                  fixedCode: attempt.suggestions[0].codeChange?.newCode ?? "",
                  confidence: attempt.suggestions[0].confidence
                } : void 0,
                outcome: idx === state.attempts.length - 1 ? "success" : "partial"
              })),
              circuitBreakerState: {
                isOpen: false,
                attemptCount: state.attempts.length,
                errorHistory: [],
                tokensUsed: 0
              },
              convergenceInfo: {
                converged: true,
                attempts: state.attempts.length,
                errorCountHistory: [],
                uniqueErrorsHistory: [],
                stagnationCount: 0,
                trend: "improving"
              },
              finalStatus: "SUCCESS",
              totalTokenUsage: {
                promptTokens: 0,
                completionTokens: 0,
                totalTokens: 0,
                estimatedCostUsd: 0
              }
            };
            const lessons = extractLessonsFromSession(session);
            if (lessons.length > 0 && !quiet) {
              console.log(`  LLKB: Extracted ${lessons.length} lesson(s) from successful refinement`);
            }
            for (const suggestion of suggestions) {
              if (suggestion.confidence >= 0.7) {
                recordPatternSuccess(
                  suggestion.suggestion.substring(0, 100),
                  { type: "blocked", reason: "learned", sourceText: suggestion.suggestion },
                  result.journeyId
                );
              }
            }
          } catch (e) {
            if (!quiet) {
              console.warn(`LLKB lesson extraction skipped: ${e instanceof Error ? e.message : "unknown error"}`);
            }
          }
        });
      }
    } else if (analysis.recommendation === "stop" || !analysis.shouldContinue) {
      status = "blocked";
      recommendation = `Refinement blocked: ${analysis.reason}. Manual intervention required.`;
    }
    const output = {
      version: "1.0",
      testPath: result.testPath,
      journeyId: result.journeyId,
      status,
      errors: result.errors,
      suggestions,
      convergence: {
        attempts: state.attempts.length + 1,
        trend: analysis.convergence.trend,
        errorCountHistory: analysis.convergence.errorCountHistory,
        improvementPercent: convergenceDetector.getImprovementPercentage()
      },
      circuitBreaker: {
        isOpen: analysis.circuitBreaker.isOpen,
        reason: analysis.circuitBreaker.openReason,
        remainingAttempts: circuitBreaker.remainingAttempts()
      },
      recommendation,
      refinedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    outputs.push(output);
    state.attempts.push({
      attemptNumber: state.attempts.length + 1,
      errors: result.errors,
      suggestions,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    state.circuitBreakerState = {
      isOpen: analysis.circuitBreaker.isOpen,
      openReason: analysis.circuitBreaker.openReason,
      attemptCount: analysis.circuitBreaker.attemptCount,
      errorHistory: analysis.circuitBreaker.errorHistory,
      tokensUsed: analysis.circuitBreaker.tokensUsed,
      maxAttempts
    };
    state.errorCountHistory.push(result.errors.length);
    saveRefineState(state);
    if (!quiet && !outputJson) {
      console.log(`
Test: ${basename(result.testPath)}`);
      console.log(`  Status: ${status}`);
      console.log(`  Errors: ${result.errors.length}`);
      console.log(`  Attempt: ${state.attempts.length}/${maxAttempts}`);
      console.log(`  Trend: ${analysis.convergence.trend}`);
      if (suggestions.length > 0) {
        console.log(`  Suggestions:`);
        for (const s of suggestions.slice(0, 3)) {
          console.log(`    - [${s.errorType}] ${s.suggestion.substring(0, 60)}`);
        }
      }
    }
  }
  if (outputJson) {
    console.log(JSON.stringify(outputs.length === 1 ? outputs[0] : outputs, null, 2));
  } else if (!quiet) {
    console.log(`
Refinement analysis complete:`);
    console.log(`  Total: ${outputs.length}`);
    console.log(`  Needs refinement: ${outputs.filter((o) => o.status === "needs_refinement").length}`);
    console.log(`  Blocked: ${outputs.filter((o) => o.status === "blocked").length}`);
    console.log(`  Converged: ${outputs.filter((o) => o.status === "converged").length}`);
  }
  const hasBlocked = outputs.some((o) => o.status === "blocked");
  const allConverged = outputs.every((o) => o.status === "converged");
  const pipelineStage = hasBlocked ? "blocked" : allConverged ? "completed" : "refining";
  const totalAttempts = outputs.reduce((sum, o) => sum + o.convergence.attempts, 0);
  await updatePipelineState("refine", pipelineStage, !hasBlocked, {
    refinementAttempts: totalAttempts,
    isBlocked: hasBlocked,
    blockedReason: hasBlocked ? outputs.find((o) => o.status === "blocked")?.recommendation : void 0
  });
  telemetry.trackCommandEnd(eventId, !hasBlocked, {
    totalTests: outputs.length,
    needsRefinement: outputs.filter((o) => o.status === "needs_refinement").length,
    blocked: outputs.filter((o) => o.status === "blocked").length,
    converged: outputs.filter((o) => o.status === "converged").length,
    totalAttempts
  });
  await telemetry.save();
}
var USAGE5, SELECTOR_REFINEMENTS, ASSERTION_REFINEMENTS, TIMEOUT_REFINEMENTS;
var init_refine = __esm({
  "src/cli/refine.ts"() {
    init_paths();
    init_state();
    init_telemetry();
    init_convergence_detector();
    init_llkb_learning();
    init_patternExtension();
    USAGE5 = `
Usage: artk-autogen refine [options]

Analyze test results and generate refinement suggestions.

Options:
  -r, --results <path>   Path to results.json (default: .artk/autogen/results.json)
  -t, --test <path>      Analyze specific test file only
  --max-attempts <n>     Max refinement attempts before stopping (default: 3)
  --json                 Output JSON to stdout instead of file
  -q, --quiet            Suppress output except errors
  -f, --force            Skip pipeline state validation
  -h, --help             Show this help message

Examples:
  artk-autogen refine
  artk-autogen refine --test tests/login.spec.ts
  artk-autogen refine --max-attempts 5
  artk-autogen refine --json
`;
    SELECTOR_REFINEMENTS = {
      "strict mode": "Locator found multiple elements. Add more specific selector or use .first() / .nth(0)",
      "timeout": "Element not found within timeout. Check if element exists, is visible, or needs explicit wait",
      "not found": "Element does not exist. Verify selector is correct and element is rendered",
      "detached": "Element was removed from DOM. Add waitFor or re-query the element"
    };
    ASSERTION_REFINEMENTS = {
      "expected": "Assertion value mismatch. Check expected vs actual value - may be timing issue",
      "tobehave": "Element state assertion failed. Add explicit wait before assertion",
      "visibility": "Element visibility check failed. Ensure element is in viewport and not hidden"
    };
    TIMEOUT_REFINEMENTS = {
      "page.goto": "Page navigation timeout. Check URL, network conditions, or increase timeout",
      "waitfor": "WaitFor timeout. Element may not appear - check selector or use different wait condition",
      "click": "Click timeout. Element may be overlapped, disabled, or not interactable"
    };
  }
});

// src/cli/status.ts
var status_exports = {};
__export(status_exports, {
  runStatus: () => runStatus
});
function getArtifactStatus(artifact) {
  const path = getAutogenArtifact(artifact);
  const exists = existsSync(path);
  const status = {
    name: artifact,
    path,
    exists
  };
  if (exists) {
    const stat = statSync(path);
    status.size = stat.size;
    status.modifiedAt = stat.mtime.toISOString();
    try {
      if (artifact === "analysis") {
        const data = JSON.parse(readFileSync(path, "utf-8"));
        status.summary = `${data.journeys?.length || 0} journeys, ${data.summary?.totalSteps || 0} steps`;
      } else if (artifact === "plan") {
        const data = JSON.parse(readFileSync(path, "utf-8"));
        status.summary = `${data.plans?.length || 0} plans, ${data.summary?.totalSteps || 0} steps`;
      } else if (artifact === "results") {
        const data = JSON.parse(readFileSync(path, "utf-8"));
        status.summary = `${data.summary?.passed || 0}/${data.summary?.total || 0} passed`;
      }
    } catch {
      status.summary = "Error reading file";
    }
  }
  return status;
}
function loadRefinementStates() {
  const autogenDir = getAutogenDir();
  if (!existsSync(autogenDir)) return [];
  const states = [];
  try {
    const files = readdirSync(autogenDir);
    for (const file of files) {
      if (file.startsWith("refine-state-") && file.endsWith(".json")) {
        const path = join(autogenDir, file);
        try {
          const data = JSON.parse(readFileSync(path, "utf-8"));
          const lastAttempt = data.attempts?.[data.attempts.length - 1];
          states.push({
            testPath: data.testPath,
            attempts: data.attempts?.length || 0,
            lastStatus: lastAttempt?.errors?.length > 0 ? "failed" : "passed",
            trend: "unknown",
            // Would need convergence detector
            isBlocked: data.circuitBreakerState?.isOpen ?? false
            // Fixed: was incorrectly reading circuitBreaker
          });
        } catch {
        }
      }
    }
  } catch {
  }
  return states;
}
function determinePipelineStage(artifacts, persistedState) {
  const hasAnalysis = artifacts.find((a) => a.name === "analysis")?.exists;
  const hasPlan = artifacts.find((a) => a.name === "plan")?.exists;
  const hasResults = artifacts.find((a) => a.name === "results")?.exists;
  let allTestsPassed = false;
  let hasFailures2 = false;
  if (hasResults) {
    const resultsPath = getAutogenArtifact("results");
    try {
      const data = JSON.parse(readFileSync(resultsPath, "utf-8"));
      allTestsPassed = data.summary?.failed === 0 && data.summary?.error === 0;
      hasFailures2 = (data.summary?.failed || 0) > 0 || (data.summary?.error || 0) > 0;
    } catch {
    }
  }
  const refinementStates = loadRefinementStates();
  const hasBlockedRefinements = refinementStates.some((s) => s.isBlocked);
  if (persistedState && persistedState.isBlocked) {
    return {
      stage: "blocked",
      canProceed: false,
      nextAction: "Review blocked state and fix manually",
      blockedReason: persistedState.blockedReason || "Pipeline is blocked"
    };
  }
  if (hasBlockedRefinements) {
    return {
      stage: "blocked",
      canProceed: false,
      nextAction: "Review blocked refinements and fix manually",
      blockedReason: "Circuit breaker triggered on one or more tests"
    };
  }
  if (allTestsPassed) {
    return {
      stage: "completed",
      canProceed: false,
      nextAction: "Pipeline complete - all tests passing"
    };
  }
  if (hasFailures2 && refinementStates.length > 0) {
    return {
      stage: "refining",
      canProceed: true,
      nextAction: 'Run "artk-autogen refine" to get refinement suggestions'
    };
  }
  if (hasResults) {
    return {
      stage: "tested",
      canProceed: true,
      nextAction: hasFailures2 ? 'Run "artk-autogen refine" to analyze failures' : "Pipeline complete - all tests passing"
    };
  }
  const testsGenerated = persistedState?.stage === "generated" || persistedState?.testPaths && persistedState.testPaths.length > 0;
  if (testsGenerated && hasPlan) {
    return {
      stage: "generated",
      canProceed: true,
      nextAction: 'Run "artk-autogen run" to execute generated tests'
    };
  }
  if (hasPlan) {
    return {
      stage: "planned",
      canProceed: true,
      nextAction: 'Run "artk-autogen generate" to generate tests from plan'
    };
  }
  if (hasAnalysis) {
    return {
      stage: "analyzed",
      canProceed: true,
      nextAction: 'Run "artk-autogen plan" to create test plan'
    };
  }
  return {
    stage: "initial",
    canProceed: true,
    nextAction: 'Run "artk-autogen analyze <journey-files>" to start'
  };
}
async function runStatus(args) {
  const { values } = parseArgs({
    args,
    options: {
      json: { type: "boolean", default: false },
      quiet: { type: "boolean", short: "q", default: false },
      help: { type: "boolean", short: "h", default: false }
    },
    allowPositionals: true
  });
  if (values.help) {
    console.log(USAGE6);
    return;
  }
  const outputJson = values.json;
  const quiet = values.quiet;
  const telemetry = getTelemetry();
  await telemetry.load();
  const eventId = telemetry.trackCommandStart("status");
  const harnessRoot = getHarnessRoot();
  const autogenDir = getAutogenDir();
  const persistedState = loadPipelineState();
  const artifactTypes = [
    "analysis",
    "plan",
    "state",
    "results",
    "telemetry"
  ];
  const artifacts = artifactTypes.map((a) => getArtifactStatus(a));
  const refinementStates = loadRefinementStates();
  const pipeline = determinePipelineStage(artifacts, persistedState);
  const summary = {
    refinementAttempts: refinementStates.reduce((sum, s) => sum + s.attempts, 0)
  };
  const analysisArtifact = artifacts.find((a) => a.name === "analysis");
  if (analysisArtifact?.exists) {
    try {
      const data = JSON.parse(readFileSync(analysisArtifact.path, "utf-8"));
      summary.totalJourneys = data.journeys?.length;
    } catch {
    }
  }
  const planArtifact = artifacts.find((a) => a.name === "plan");
  if (planArtifact?.exists) {
    try {
      const data = JSON.parse(readFileSync(planArtifact.path, "utf-8"));
      summary.totalPlans = data.plans?.length;
    } catch {
    }
  }
  const resultsArtifact = artifacts.find((a) => a.name === "results");
  if (resultsArtifact?.exists) {
    try {
      const data = JSON.parse(readFileSync(resultsArtifact.path, "utf-8"));
      summary.testsRun = data.summary?.total;
      summary.testsPassed = data.summary?.passed;
      summary.testsFailed = data.summary?.failed;
    } catch {
    }
  }
  const status = {
    version: "1.0",
    harnessRoot,
    autogenDir,
    hasArtifacts: hasAutogenArtifacts(),
    artifacts,
    pipeline,
    persistedState,
    refinementStates,
    summary,
    checkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (outputJson) {
    console.log(JSON.stringify(status, null, 2));
  } else if (!quiet) {
    console.log("AutoGen Pipeline Status");
    console.log("\u2550".repeat(50));
    console.log(`Harness: ${harnessRoot}`);
    console.log(`Stage: ${pipeline.stage}`);
    console.log(`Can proceed: ${pipeline.canProceed ? "Yes" : "No"}`);
    console.log(`Next action: ${pipeline.nextAction}`);
    if (pipeline.blockedReason) {
      console.log(`Blocked: ${pipeline.blockedReason}`);
    }
    console.log("\nArtifacts:");
    for (const artifact of artifacts) {
      const icon = artifact.exists ? "\u2713" : "\u2717";
      const summary2 = artifact.summary ? ` (${artifact.summary})` : "";
      console.log(`  ${icon} ${artifact.name}${summary2}`);
    }
    if (refinementStates.length > 0) {
      console.log("\nRefinement States:");
      for (const state of refinementStates) {
        const icon = state.isBlocked ? "\u26A0" : "\u25CB";
        console.log(`  ${icon} ${basename(state.testPath)}: ${state.attempts} attempts, ${state.lastStatus}`);
      }
    }
    if (summary.testsRun !== void 0) {
      console.log("\nSummary:");
      console.log(`  Journeys: ${summary.totalJourneys || "N/A"}`);
      console.log(`  Plans: ${summary.totalPlans || "N/A"}`);
      console.log(`  Tests: ${summary.testsPassed}/${summary.testsRun} passed`);
      console.log(`  Refinement attempts: ${summary.refinementAttempts}`);
    }
    if (persistedState && persistedState.stage !== "initial") {
      console.log("\nPersisted State:");
      console.log(`  ${getPipelineStateSummary(persistedState)}`);
    }
  }
  telemetry.trackCommandEnd(eventId, true, {
    stage: pipeline.stage,
    hasArtifacts: status.hasArtifacts,
    refinementStates: refinementStates.length
  });
  await telemetry.save();
}
var USAGE6;
var init_status = __esm({
  "src/cli/status.ts"() {
    init_paths();
    init_state();
    init_telemetry();
    USAGE6 = `
Usage: artk-autogen status [options]

Show the current state of the autogen pipeline.

Options:
  --json                 Output JSON to stdout
  -q, --quiet            Suppress output except errors
  -h, --help             Show this help message

Examples:
  artk-autogen status
  artk-autogen status --json
`;
  }
});

// src/cli/clean.ts
var clean_exports = {};
__export(clean_exports, {
  runClean: () => runClean
});
function listArtifacts() {
  const autogenDir = getAutogenDir();
  if (!existsSync(autogenDir)) return [];
  const items = [];
  try {
    const entries = readdirSync(autogenDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(autogenDir, entry.name);
      const stat = statSync(fullPath);
      items.push({
        path: fullPath,
        size: entry.isDirectory() ? getDirSize(fullPath) : stat.size,
        isDir: entry.isDirectory()
      });
    }
  } catch {
  }
  return items;
}
function getDirSize(dirPath) {
  let size = 0;
  try {
    const entries = readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);
      if (entry.isDirectory()) {
        size += getDirSize(fullPath);
      } else {
        size += statSync(fullPath).size;
      }
    }
  } catch {
  }
  return size;
}
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
async function runClean(args) {
  const { values } = parseArgs({
    args,
    options: {
      "dry-run": { type: "boolean", default: false },
      "keep-analysis": { type: "boolean", default: false },
      "keep-plan": { type: "boolean", default: false },
      force: { type: "boolean", short: "f", default: false },
      quiet: { type: "boolean", short: "q", default: false },
      help: { type: "boolean", short: "h", default: false }
    },
    allowPositionals: true
  });
  if (values.help) {
    console.log(USAGE7);
    return;
  }
  const dryRun = values["dry-run"];
  const keepAnalysis = values["keep-analysis"];
  const keepPlan = values["keep-plan"];
  const force = values.force;
  const quiet = values.quiet;
  const telemetry = getTelemetry();
  await telemetry.load();
  const eventId = telemetry.trackCommandStart("clean");
  if (!hasAutogenArtifacts()) {
    if (!quiet) {
      console.log("No autogen artifacts to clean.");
    }
    telemetry.trackCommandEnd(eventId, true, { skipped: true, reason: "no_artifacts" });
    await telemetry.save();
    return;
  }
  const artifacts = listArtifacts();
  const toDelete = [];
  const toKeep = [];
  for (const artifact of artifacts) {
    const name = artifact.path.split("/").pop() || "";
    if (keepAnalysis && name === "analysis.json") {
      toKeep.push(artifact);
    } else if (keepPlan && name === "plan.json") {
      toKeep.push(artifact);
    } else {
      toDelete.push(artifact);
    }
  }
  if (toDelete.length === 0) {
    if (!quiet) {
      console.log("Nothing to delete (all artifacts are marked to keep).");
    }
    telemetry.trackCommandEnd(eventId, true, { skipped: true, reason: "nothing_to_delete" });
    await telemetry.save();
    return;
  }
  const totalSize = toDelete.reduce((sum, a) => sum + a.size, 0);
  if (!quiet || dryRun) {
    console.log(dryRun ? "Would delete:" : "Will delete:");
    for (const artifact of toDelete) {
      const name = artifact.path.split("/").pop();
      const type = artifact.isDir ? "(dir)" : "";
      console.log(`  - ${name} ${type} [${formatSize(artifact.size)}]`);
    }
    console.log(`
Total: ${formatSize(totalSize)}`);
    if (toKeep.length > 0) {
      console.log("\nKeeping:");
      for (const artifact of toKeep) {
        const name = artifact.path.split("/").pop();
        console.log(`  - ${name}`);
      }
    }
  }
  if (dryRun) {
    telemetry.trackCommandEnd(eventId, true, { dryRun: true, wouldDelete: toDelete.length });
    await telemetry.save();
    return;
  }
  if (!force && !quiet) {
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    const answer = await new Promise((resolve8) => {
      rl.question("\nProceed with deletion? [y/N] ", (ans) => {
        rl.close();
        resolve8(ans);
      });
    });
    if (answer.toLowerCase() !== "y" && answer.toLowerCase() !== "yes") {
      console.log("Aborted.");
      telemetry.trackCommandEnd(eventId, true, { aborted: true });
      await telemetry.save();
      return;
    }
  }
  const deleted = [];
  const errors = [];
  for (const artifact of toDelete) {
    try {
      rmSync(artifact.path, { recursive: true });
      deleted.push(artifact.path);
    } catch (e) {
      errors.push(`Failed to delete ${artifact.path}: ${e}`);
    }
  }
  if (!quiet) {
    console.log(`
Deleted ${deleted.length} item(s)`);
    if (errors.length > 0) {
      console.error("\nErrors:");
      for (const err3 of errors) {
        console.error(`  ${err3}`);
      }
    }
  }
  if (toKeep.length === 0) {
    await cleanAutogenArtifacts();
    await resetPipelineState();
    if (!quiet) {
      console.log("Recreated empty autogen directory.");
      console.log("Reset pipeline state to initial.");
    }
  }
  telemetry.trackCommandEnd(eventId, errors.length === 0, {
    deleted: deleted.length,
    kept: toKeep.length,
    errors: errors.length,
    totalSize,
    dryRun
  });
  await telemetry.save();
}
var USAGE7;
var init_clean = __esm({
  "src/cli/clean.ts"() {
    init_paths();
    init_state();
    init_telemetry();
    USAGE7 = `
Usage: artk-autogen clean [options]

Clean autogen artifacts for a fresh start.

Options:
  --dry-run              Show what would be deleted without deleting
  --keep-analysis        Keep analysis.json (only clean generated files)
  --keep-plan            Keep plan.json
  -f, --force            Skip confirmation
  -q, --quiet            Suppress output except errors
  -h, --help             Show this help message

Examples:
  artk-autogen clean
  artk-autogen clean --dry-run
  artk-autogen clean --keep-analysis
  artk-autogen clean --force
`;
  }
});

// src/cli/validate.ts
var validate_exports = {};
__export(validate_exports, {
  runValidate: () => runValidate
});
async function runValidate(args) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      lint: { type: "boolean", default: false },
      format: { type: "string", default: "text" },
      strict: { type: "boolean", default: false },
      quiet: { type: "boolean", short: "q", default: false },
      help: { type: "boolean", short: "h", default: false }
    },
    allowPositionals: true
  });
  if (values.help) {
    console.log(USAGE8);
    return;
  }
  if (positionals.length === 0) {
    console.error("Error: No files specified");
    console.log(USAGE8);
    process.exit(1);
  }
  const files = await fg2(positionals, {
    absolute: true
  });
  if (files.length === 0) {
    console.error("Error: No files found matching the patterns");
    process.exit(1);
  }
  if (!values.quiet && values.format === "text") {
    console.log(`Validating ${files.length} file(s)...`);
  }
  const results = await validateJourneys(files, {
    runLint: values.lint
  });
  if (values.format === "json") {
    const output = {};
    for (const [id, result] of results) {
      output[id] = result;
    }
    console.log(JSON.stringify(output, null, 2));
  } else if (values.format === "summary") {
    let totalErrors = 0;
    let totalWarnings = 0;
    let passed = 0;
    let failed = 0;
    for (const [, result] of results) {
      totalErrors += result.counts.errors;
      totalWarnings += result.counts.warnings;
      if (result.valid) {
        passed++;
      } else {
        failed++;
      }
    }
    console.log(`
Validation Summary:`);
    console.log(`  Passed: ${passed}`);
    console.log(`  Failed: ${failed}`);
    console.log(`  Total Errors: ${totalErrors}`);
    console.log(`  Total Warnings: ${totalWarnings}`);
  } else {
    for (const [journeyId, result] of results) {
      const status = result.valid ? "\u2713" : "\u2717";
      if (!values.quiet || !result.valid) {
        console.log(`
${status} ${journeyId}`);
      }
      if (!result.valid || result.counts.warnings > 0 && !values.quiet) {
        for (const issue of result.issues) {
          const icon = issue.severity === "error" ? "  \u2717" : issue.severity === "warning" ? "  \u26A0" : "  \u2139";
          if (!values.quiet || issue.severity === "error") {
            console.log(`${icon} [${issue.code}] ${issue.message}`);
            if (issue.field) {
              console.log(`    field: ${issue.field}`);
            }
            if (issue.suggestion) {
              console.log(`    \u2192 ${issue.suggestion}`);
            }
          }
        }
      }
    }
    if (!values.quiet) {
      let passed = 0;
      let failed = 0;
      for (const [, result] of results) {
        if (result.valid) {
          passed++;
        } else {
          failed++;
        }
      }
      console.log(`
${passed} passed, ${failed} failed`);
    }
  }
  let hasErrors = false;
  let hasWarnings = false;
  for (const [, result] of results) {
    if (!result.valid) {
      hasErrors = true;
    }
    if (result.counts.warnings > 0) {
      hasWarnings = true;
    }
  }
  if (hasErrors) {
    process.exit(1);
  }
  if (values.strict && hasWarnings) {
    process.exit(1);
  }
}
var USAGE8;
var init_validate2 = __esm({
  "src/cli/validate.ts"() {
    init_index();
    USAGE8 = `
Usage: artk-autogen validate [options] <files...>

Validate journey files or generated test code.

Arguments:
  files    Journey files or test files to validate

Options:
  --lint             Run ESLint checks (slower but more thorough)
  --format <type>    Output format: text, json, or summary (default: text)
  --strict           Fail on warnings too
  -q, --quiet        Only show errors
  -h, --help         Show this help message

Examples:
  artk-autogen validate journeys/login.md
  artk-autogen validate "journeys/*.md" --lint
  artk-autogen validate journeys/*.md --format json
`;
  }
});

// src/cli/verify.ts
var verify_exports = {};
__export(verify_exports, {
  runVerify: () => runVerify
});
async function runVerify(args) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      output: { type: "string", short: "o" },
      heal: { type: "boolean", default: false },
      "max-heal": { type: "string", default: "3" },
      stability: { type: "boolean", default: false },
      "stability-runs": { type: "string", default: "3" },
      format: { type: "string", default: "text" },
      reporter: { type: "string", default: "list" },
      timeout: { type: "string" },
      quiet: { type: "boolean", short: "q", default: false },
      help: { type: "boolean", short: "h", default: false }
    },
    allowPositionals: true
  });
  if (values.help) {
    console.log(USAGE9);
    return;
  }
  if (positionals.length === 0) {
    console.error("Error: No journey files specified");
    console.log(USAGE9);
    process.exit(1);
  }
  const journeyFiles = await fg2(positionals, {
    absolute: true
  });
  if (journeyFiles.length === 0) {
    console.error("Error: No journey files found matching the patterns");
    process.exit(1);
  }
  if (!values.quiet && values.format === "text") {
    console.log(`Verifying ${journeyFiles.length} journey(s)...`);
  }
  const results = await verifyJourneys(journeyFiles, {
    outputDir: values.output,
    heal: values.heal,
    maxHealAttempts: parseIntSafe(values["max-heal"], "max-heal", 3),
    checkStability: values.stability,
    stabilityRuns: parseIntSafe(values["stability-runs"], "stability-runs", 3),
    reporter: values.reporter,
    timeout: values.timeout ? parseIntSafe(values.timeout, "timeout", 3e4) : void 0
  });
  if (values.format === "json") {
    const output = {};
    for (const [id, result] of results) {
      output[id] = result;
    }
    console.log(JSON.stringify(output, null, 2));
  } else {
    for (const [journeyId, result] of results) {
      const statusIcon = result.status === "passed" ? "\u2713" : result.status === "failed" ? "\u2717" : "\u26A0";
      if (!values.quiet || result.status !== "passed") {
        console.log(`
${statusIcon} ${journeyId}`);
        console.log(`  Status: ${result.status}`);
        console.log(`  Duration: ${result.duration}ms`);
        console.log(`  Tests: ${result.counts.passed}/${result.counts.total} passed`);
        if (result.counts.flaky > 0) {
          console.log(`  Flaky: ${result.counts.flaky}`);
        }
        if (result.healing) {
          console.log(`  Healing:`);
          console.log(`    Attempted: ${result.healing.attempted}`);
          console.log(`    Success: ${result.healing.success}`);
          console.log(`    Attempts: ${result.healing.attempts}`);
          if (result.healing.appliedFix) {
            console.log(`    Applied: ${result.healing.appliedFix}`);
          }
        }
        if (result.failures.tests.length > 0) {
          console.log(`  Failures:`);
          for (const testName of result.failures.tests.slice(0, 5)) {
            const classification = result.failures.classifications[testName];
            console.log(`    - ${testName}`);
            if (classification) {
              console.log(`      ${classification.category}: ${classification.explanation.substring(0, 100)}`);
            }
          }
          if (result.failures.tests.length > 5) {
            console.log(`    ... and ${result.failures.tests.length - 5} more`);
          }
        }
        if (result.testFilePath && !values.quiet) {
          console.log(`  Test file: ${result.testFilePath}`);
        }
      }
    }
    if (!values.quiet) {
      let passed = 0;
      let failed = 0;
      let healed = 0;
      for (const [, result] of results) {
        if (result.status === "passed") {
          passed++;
        } else {
          failed++;
        }
        if (result.healing?.success) {
          healed++;
        }
      }
      console.log(`
Summary:`);
      console.log(`  Passed: ${passed}`);
      console.log(`  Failed: ${failed}`);
      if (healed > 0) {
        console.log(`  Healed: ${healed}`);
      }
    }
  }
  let hasFailures2 = false;
  for (const [, result] of results) {
    if (result.status === "failed" || result.status === "error") {
      hasFailures2 = true;
      break;
    }
  }
  if (hasFailures2) {
    process.exit(1);
  }
}
var USAGE9;
var init_verify2 = __esm({
  "src/cli/verify.ts"() {
    init_index();
    init_parsing();
    USAGE9 = `
Usage: artk-autogen verify [options] <journey-files...>

Generate and run Playwright tests from Journey files to verify they work.

Arguments:
  journey-files    Journey file paths or glob patterns

Options:
  -o, --output <dir>       Output directory for generated tests
  --heal                   Attempt to heal failing tests
  --max-heal <n>           Maximum healing attempts (default: 3)
  --stability              Run stability checks (repeat tests)
  --stability-runs <n>     Number of stability runs (default: 3)
  --format <type>          Output format: text, json (default: text)
  --reporter <name>        Playwright reporter (default: list)
  --timeout <ms>           Test timeout in milliseconds
  -q, --quiet              Suppress output except errors
  -h, --help               Show this help message

Examples:
  artk-autogen verify journeys/login.md
  artk-autogen verify "journeys/*.md" --heal
  artk-autogen verify journeys/login.md --stability --stability-runs 5
`;
  }
});

// src/cli/install.ts
var install_exports = {};
__export(install_exports, {
  runInstall: () => runInstall
});
async function runInstall(args) {
  const { values } = parseArgs({
    args,
    options: {
      dir: { type: "string", short: "d", default: "." },
      name: { type: "string", short: "n" },
      "base-url": { type: "string" },
      "skip-existing": { type: "boolean", default: false },
      "no-example": { type: "boolean", default: false },
      force: { type: "boolean", short: "f", default: false }
    },
    allowPositionals: true
  });
  console.log("Installing ARTK autogen...\n");
  const result = await installAutogenInstance({
    rootDir: values.dir,
    projectName: values.name,
    baseUrl: values["base-url"],
    skipIfExists: values["skip-existing"],
    includeExample: !values["no-example"],
    force: values.force
  });
  if (result.success) {
    console.log("\u2713 Installation complete\n");
    if (result.created.length > 0) {
      console.log("Created:");
      for (const path of result.created) {
        console.log(`  + ${path}`);
      }
    }
    if (result.skipped.length > 0) {
      console.log("\nSkipped (already exists):");
      for (const path of result.skipped) {
        console.log(`  - ${path}`);
      }
    }
    console.log("\nNext steps:");
    console.log("  1. Edit autogen.config.yml with your project settings");
    console.log("  2. Create Journeys in journeys/ directory");
    console.log("  3. Run: npx artk-autogen generate <journey.md>");
  } else {
    console.error("\u2717 Installation failed:\n");
    for (const error of result.errors) {
      console.error(`  ${error}`);
    }
    process.exit(1);
  }
}
var init_install2 = __esm({
  "src/cli/install.ts"() {
    init_install();
  }
});

// src/cli/upgrade.ts
var upgrade_exports = {};
__export(upgrade_exports, {
  runUpgrade: () => runUpgrade
});
async function runUpgrade(args) {
  const { values } = parseArgs({
    args,
    options: {
      dir: { type: "string", short: "d", default: "." },
      "dry-run": { type: "boolean", default: false },
      "no-backup": { type: "boolean", default: false }
    },
    allowPositionals: true
  });
  console.log("Upgrading ARTK autogen...\n");
  const result = await upgradeAutogenInstance({
    rootDir: values.dir,
    dryRun: values["dry-run"],
    backup: !values["no-backup"]
  });
  if (values["dry-run"]) {
    console.log("[DRY RUN] No changes written\n");
  }
  console.log(`Version: ${result.fromVersion} \u2192 ${result.toVersion}
`);
  if (result.changes.length > 0) {
    console.log("Changes:");
    for (const change of result.changes) {
      console.log(`  ${change.description}`);
      console.log(`    \u2192 ${change.path}`);
    }
  }
  if (result.backupPath) {
    console.log(`
Backup: ${result.backupPath}`);
  }
  if (!result.success) {
    console.error("\n\u2717 Upgrade failed:");
    for (const error of result.errors) {
      console.error(`  ${error}`);
    }
    process.exit(1);
  }
  console.log("\n\u2713 Upgrade complete");
}
var init_upgrade2 = __esm({
  "src/cli/upgrade.ts"() {
    init_upgrade();
  }
});
function generatePatternName(text, primitiveType) {
  const words = text.toLowerCase().replace(/["']/g, "").split(/\s+/).filter((w) => w.length > 2).slice(0, 4);
  const baseName = words.map((w, i) => i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)).join("");
  return `llkb-${primitiveType}-${baseName}`;
}
function generateExtractionLogic(primitive) {
  const type = primitive.type;
  switch (type) {
    case "click":
    case "dblclick":
    case "rightClick":
    case "hover":
    case "focus":
    case "clear":
    case "check":
    case "uncheck":
      return `Extract locator from match groups, return { type: '${type}', locator: { strategy, value } }`;
    case "fill":
      return `Extract locator and value from match groups, return { type: 'fill', locator, value: { type: 'literal', value } }`;
    case "goto":
      return `Extract URL/path from match groups, return { type: 'goto', url }`;
    case "expectVisible":
    case "expectNotVisible":
    case "expectHidden":
    case "expectEnabled":
    case "expectDisabled":
      return `Extract locator from match groups, return { type: '${type}', locator }`;
    case "expectText":
    case "expectContainsText":
      return `Extract locator and text from match groups, return { type: '${type}', locator, text }`;
    case "waitForTimeout":
      return `Extract milliseconds from match groups, return { type: 'waitForTimeout', ms }`;
    case "waitForNetworkIdle":
      return `Return { type: 'waitForNetworkIdle' }`;
    case "waitForVisible":
    case "waitForHidden":
      return `Extract locator from match groups, return { type: '${type}', locator }`;
    case "select":
      return `Extract locator and option from match groups, return { type: 'select', locator, option }`;
    case "press":
      return `Extract key from match groups, return { type: 'press', key }`;
    default:
      return `Extract parameters from match groups, return primitive`;
  }
}
function meetsPromotionCriteria(pattern, criteria = DEFAULT_PROMOTION_CRITERIA) {
  const missingCriteria = [];
  if (pattern.confidence < criteria.minConfidence) {
    missingCriteria.push(`confidence: ${(pattern.confidence * 100).toFixed(1)}% < ${(criteria.minConfidence * 100).toFixed(1)}%`);
  }
  if (pattern.successCount < criteria.minSuccessCount) {
    missingCriteria.push(`successCount: ${pattern.successCount} < ${criteria.minSuccessCount}`);
  }
  if (pattern.sourceJourneys.length < criteria.minSourceJourneys) {
    missingCriteria.push(`sourceJourneys: ${pattern.sourceJourneys.length} < ${criteria.minSourceJourneys}`);
  }
  if (pattern.failCount > criteria.maxFailCount) {
    missingCriteria.push(`failCount: ${pattern.failCount} > ${criteria.maxFailCount}`);
  }
  const successRate = pattern.successCount / (pattern.successCount + pattern.failCount || 1);
  if (successRate < criteria.minSuccessRate) {
    missingCriteria.push(`successRate: ${(successRate * 100).toFixed(1)}% < ${(criteria.minSuccessRate * 100).toFixed(1)}%`);
  }
  return {
    meets: missingCriteria.length === 0,
    missingCriteria
  };
}
function estimateUsesNeeded(pattern, criteria) {
  const needed = [];
  if (pattern.successCount < criteria.minSuccessCount) {
    needed.push(criteria.minSuccessCount - pattern.successCount);
  }
  if (pattern.confidence < criteria.minConfidence) {
    const targetSuccesses = Math.ceil(
      criteria.minSuccessCount * (1 + pattern.failCount / 5)
    );
    needed.push(Math.max(0, targetSuccesses - pattern.successCount));
  }
  return Math.max(...needed, 1);
}
function analyzeForPromotion(options) {
  const criteria = {
    ...DEFAULT_PROMOTION_CRITERIA,
    ...options.criteria
  };
  const patterns = loadLearnedPatterns({ llkbRoot: options.llkbRoot });
  const promotablePatterns = [];
  const nearPromotionPatterns = [];
  let alreadyPromoted = 0;
  let needsMoreData = 0;
  for (const pattern of patterns) {
    if (pattern.promotedToCore) {
      alreadyPromoted++;
      continue;
    }
    const { meets, missingCriteria } = meetsPromotionCriteria(pattern, criteria);
    if (meets) {
      promotablePatterns.push({
        name: generatePatternName(pattern.originalText, pattern.mappedPrimitive.type),
        regex: generateRegexFromText(pattern.originalText),
        primitiveType: pattern.mappedPrimitive.type,
        example: pattern.originalText,
        extractionLogic: generateExtractionLogic(pattern.mappedPrimitive),
        llkbPatternId: pattern.id,
        confidenceAtPromotion: pattern.confidence,
        sourceJourneysCount: pattern.sourceJourneys.length,
        promotedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    } else if (missingCriteria.length <= 2 && pattern.successCount >= 2) {
      nearPromotionPatterns.push({
        pattern,
        missingCriteria,
        estimatedUsesNeeded: estimateUsesNeeded(pattern, criteria)
      });
    } else {
      needsMoreData++;
    }
  }
  return {
    analyzedAt: (/* @__PURE__ */ new Date()).toISOString(),
    totalPatterns: patterns.length,
    promotablePatterns,
    nearPromotionPatterns,
    stats: {
      alreadyPromoted,
      eligibleForPromotion: promotablePatterns.length,
      nearPromotion: nearPromotionPatterns.length,
      needsMoreData
    }
  };
}
function generatePromotedPatternsCode(patterns) {
  if (patterns.length === 0) {
    return "// No patterns ready for promotion\n";
  }
  const lines = [
    "/**",
    " * LLKB-Promoted Patterns",
    ` * Generated at: ${(/* @__PURE__ */ new Date()).toISOString()}`,
    " * Review and merge into patterns.ts after validation",
    " */",
    "",
    "import type { StepPattern } from './patterns.js';",
    "",
    "export const llkbPromotedPatterns: StepPattern[] = ["
  ];
  for (const pattern of patterns) {
    lines.push("  {");
    lines.push(`    name: '${pattern.name}',`);
    lines.push(`    regex: /${pattern.regex}/i,`);
    lines.push(`    primitiveType: '${pattern.primitiveType}',`);
    lines.push("    extract: (match: RegExpMatchArray) => {");
    lines.push(`      // ${pattern.extractionLogic}`);
    lines.push(`      // Example: "${pattern.example}"`);
    lines.push(`      // LLKB Pattern ID: ${pattern.llkbPatternId}`);
    lines.push(`      // Confidence at promotion: ${(pattern.confidenceAtPromotion * 100).toFixed(1)}%`);
    lines.push(`      ${generateExtractorCode(pattern.primitiveType)}`);
    lines.push("    },");
    lines.push("  },");
  }
  lines.push("];");
  lines.push("");
  return lines.join("\n");
}
function generateExtractorCode(type) {
  switch (type) {
    case "click":
    case "dblclick":
    case "rightClick":
    case "hover":
    case "focus":
    case "clear":
    case "check":
    case "uncheck":
      return `return { type: '${type}', locator: { strategy: 'text', value: match[1] || 'element' } };`;
    case "fill":
      return `return { type: 'fill', locator: { strategy: 'text', value: match[1] || 'field' }, value: { type: 'literal', value: match[2] || '' } };`;
    case "goto":
      return `return { type: 'goto', url: match[1] || '/' };`;
    case "expectVisible":
    case "expectNotVisible":
    case "expectHidden":
    case "expectEnabled":
    case "expectDisabled":
    case "waitForVisible":
    case "waitForHidden":
      return `return { type: '${type}', locator: { strategy: 'text', value: match[1] || 'element' } };`;
    case "expectText":
    case "expectContainsText":
      return `return { type: '${type}', locator: { strategy: 'text', value: match[1] || 'element' }, text: match[2] || '' };`;
    case "waitForTimeout":
      return `return { type: 'waitForTimeout', ms: parseInt(match[1], 10) || 1000 };`;
    case "waitForNetworkIdle":
      return `return { type: 'waitForNetworkIdle' };`;
    case "select":
      return `return { type: 'select', locator: { strategy: 'text', value: match[1] || 'dropdown' }, option: match[2] || '' };`;
    case "press":
      return `return { type: 'press', key: match[1] || 'Enter' };`;
    default:
      return `return { type: 'blocked', reason: 'Unknown type: ${type}', sourceText: match[0] || '' };`;
  }
}
function exportPromotionReport(report, options) {
  const outputDir = options.outputDir || dirname(getLlkbRoot(options.llkbRoot));
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
  const reportPath = join(outputDir, `promotion-report-${timestamp}.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");
  let codePath;
  if (report.promotablePatterns.length > 0) {
    codePath = join(outputDir, `llkb-promoted-patterns-${timestamp}.ts`);
    const code = generatePromotedPatternsCode(report.promotablePatterns);
    writeFileSync(codePath, code, "utf-8");
  }
  return { reportPath, codePath };
}
function getPromotionStats(options) {
  const report = analyzeForPromotion(options);
  return {
    total: report.totalPatterns,
    promoted: report.stats.alreadyPromoted,
    promotable: report.stats.eligibleForPromotion,
    nearPromotion: report.stats.nearPromotion,
    needsWork: report.stats.needsMoreData,
    promotionRate: report.totalPatterns > 0 ? (report.stats.alreadyPromoted + report.stats.eligibleForPromotion) / report.totalPatterns : 0
  };
}
var DEFAULT_PROMOTION_CRITERIA;
var init_patternPromotion = __esm({
  "src/llkb/patternPromotion.ts"() {
    init_patternExtension();
    init_paths();
    DEFAULT_PROMOTION_CRITERIA = {
      minConfidence: 0.9,
      minSuccessCount: 5,
      minSourceJourneys: 2,
      maxFailCount: 2,
      minSuccessRate: 0.85
    };
  }
});

// src/cli/patterns.ts
var patterns_exports = {};
__export(patterns_exports, {
  runPatterns: () => runPatterns
});
function formatPatternGap(gap, index) {
  const lines = [];
  lines.push(`  ${index + 1}. [${gap.count}x] "${gap.exampleText}"`);
  lines.push(`     Category: ${gap.category}`);
  lines.push(`     First seen: ${new Date(gap.firstSeen).toLocaleDateString()}`);
  if (gap.variants.length > 1) {
    lines.push(`     Variants: ${gap.variants.length} unique phrasings`);
    for (const variant of gap.variants.slice(0, 3)) {
      if (variant !== gap.exampleText) {
        lines.push(`       - "${variant}"`);
      }
    }
    if (gap.variants.length > 3) {
      lines.push(`       ... and ${gap.variants.length - 3} more`);
    }
  }
  if (gap.suggestedPattern) {
    lines.push(`     Suggested pattern: ${gap.suggestedPattern}`);
  }
  return lines.join("\n");
}
function formatStats(stats) {
  const lines = [];
  lines.push("\n\u{1F4CA} Blocked Steps Telemetry Statistics\n");
  lines.push(`  Total Records: ${stats.totalRecords}`);
  lines.push(`  Unique Patterns: ${stats.uniquePatterns}`);
  if (stats.totalRecords > 0) {
    lines.push("\n  By Category:");
    for (const [category, count] of Object.entries(stats.byCategory)) {
      const percentage = (count / stats.totalRecords * 100).toFixed(1);
      lines.push(`    ${category}: ${count} (${percentage}%)`);
    }
    lines.push("\n  Date Range:");
    lines.push(`    Earliest: ${new Date(stats.dateRange.earliest).toLocaleString()}`);
    lines.push(`    Latest: ${new Date(stats.dateRange.latest).toLocaleString()}`);
  }
  return lines.join("\n");
}
async function runGaps(options) {
  let gaps = analyzeBlockedPatterns({
    baseDir: options.baseDir,
    limit: options.category ? void 0 : options.limit
    // Don't limit before filtering
  });
  if (options.category) {
    gaps = gaps.filter((g) => g.category.toLowerCase().includes(options.category.toLowerCase()));
    gaps = gaps.slice(0, options.limit);
  }
  if (gaps.length === 0) {
    console.log("\n\u2705 No blocked step gaps found. Either no blocked steps have been recorded,");
    console.log("   or all steps have been successfully matched to patterns.\n");
    return;
  }
  if (options.json) {
    console.log(JSON.stringify(gaps, null, 2));
    return;
  }
  console.log(`
\u{1F50D} Top ${gaps.length} Pattern Gaps (from blocked steps)
`);
  console.log(`Pattern Version: ${PATTERN_VERSION}
`);
  for (let i = 0; i < gaps.length; i++) {
    console.log(formatPatternGap(gaps[i], i));
    console.log();
  }
  console.log("\u{1F4A1} To add these patterns, edit: autogen/src/mapping/patterns.ts");
  console.log("   Use the suggested patterns as starting points.\n");
}
async function runList(options) {
  const patternNames = getAllPatternNames();
  if (options.json) {
    console.log(
      JSON.stringify(
        {
          version: PATTERN_VERSION,
          count: patternNames.length,
          patterns: patternNames
        },
        null,
        2
      )
    );
    return;
  }
  console.log(`
\u{1F4CB} Available Patterns (v${PATTERN_VERSION})
`);
  console.log(`Total: ${patternNames.length} patterns
`);
  const groups = {};
  for (const name of patternNames) {
    const category = name.split("-")[0] || "other";
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(name);
  }
  for (const [category, names] of Object.entries(groups).sort()) {
    console.log(`  ${category}:`);
    for (const name of names) {
      console.log(`    - ${name}`);
    }
    console.log();
  }
}
async function runExport(options) {
  const gaps = analyzeBlockedPatterns({ baseDir: options.baseDir });
  const stats = getTelemetryStats({ baseDir: options.baseDir });
  const records = readBlockedStepRecords({ baseDir: options.baseDir });
  const exportData = {
    exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
    patternVersion: PATTERN_VERSION,
    statistics: stats,
    gaps,
    rawRecords: records
  };
  console.log(JSON.stringify(exportData, null, 2));
}
async function confirmAction(message) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve8) => {
    rl.question(`${message} (y/N): `, (answer) => {
      rl.close();
      resolve8(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });
}
async function runClear(options) {
  const stats = getTelemetryStats({ baseDir: options.baseDir });
  if (stats.totalRecords === 0) {
    console.log("\n\u2705 No telemetry data to clear.\n");
    return;
  }
  console.log(`
\u26A0\uFE0F  This will delete ${stats.totalRecords} blocked step records.`);
  console.log("   This action cannot be undone.\n");
  if (!options.force) {
    const confirmed = await confirmAction("Are you sure you want to proceed?");
    if (!confirmed) {
      console.log("Operation cancelled.\n");
      return;
    }
  }
  clearTelemetry({ baseDir: options.baseDir });
  console.log("\u2705 Telemetry data cleared.\n");
}
async function runSuggest(options) {
  const suggestions = suggestNewPatterns();
  if (suggestions.length === 0) {
    console.log("\n\u2705 No pattern suggestions available.");
    console.log("   Record more blocked steps to generate suggestions.\n");
    return;
  }
  const limitedSuggestions = suggestions.slice(0, options.limit);
  if (options.json) {
    console.log(JSON.stringify(limitedSuggestions, null, 2));
    return;
  }
  console.log(`
\u{1F4A1} Suggested New Patterns (${limitedSuggestions.length} of ${suggestions.length})
`);
  console.log("These patterns are generated from frequently blocked steps:\n");
  for (let i = 0; i < limitedSuggestions.length; i++) {
    const suggestion = limitedSuggestions[i];
    console.log(`  ${i + 1}. Pattern (${suggestion.coveredCount}x blocked)`);
    console.log(`     Regex: ${suggestion.suggestedRegex}`);
    console.log(`     Confidence: ${(suggestion.confidence * 100).toFixed(0)}%`);
    if (suggestion.examples.length > 0) {
      console.log("     Examples:");
      for (const example of suggestion.examples.slice(0, 3)) {
        console.log(`       - "${example}"`);
      }
    }
    console.log();
  }
  console.log("\u{1F4A1} Review these patterns and add validated ones to patterns.ts\n");
}
async function runPromotion(options) {
  let llkbStats;
  try {
    llkbStats = getPatternStats({ llkbRoot: options.baseDir });
  } catch {
    llkbStats = null;
  }
  let report;
  try {
    report = analyzeForPromotion({ llkbRoot: options.baseDir });
  } catch {
    report = null;
  }
  if (options.json) {
    console.log(JSON.stringify({
      llkbStats,
      promotionReport: report
    }, null, 2));
    return;
  }
  console.log("\n\u{1F4C8} LLKB Pattern Promotion Status\n");
  if (!llkbStats || llkbStats.total === 0) {
    console.log("  No LLKB patterns recorded yet.");
    console.log("  Patterns are learned as tests are run and refined.\n");
    return;
  }
  console.log("  LLKB Statistics:");
  console.log(`    Total learned patterns: ${llkbStats.total}`);
  console.log(`    Already promoted: ${llkbStats.promoted}`);
  console.log(`    High confidence (\u22650.7): ${llkbStats.highConfidence}`);
  console.log(`    Low confidence (<0.3): ${llkbStats.lowConfidence}`);
  console.log(`    Average confidence: ${(llkbStats.avgConfidence * 100).toFixed(1)}%`);
  console.log(`    Total successes: ${llkbStats.totalSuccesses}`);
  console.log(`    Total failures: ${llkbStats.totalFailures}
`);
  if (report) {
    const stats = getPromotionStats({ llkbRoot: options.baseDir });
    console.log("  Promotion Analysis:");
    console.log(`    Eligible for promotion: ${stats.promotable}`);
    console.log(`    Near promotion (need more data): ${stats.nearPromotion}`);
    console.log(`    Need more work: ${stats.needsWork}`);
    console.log(`    Overall promotion rate: ${(stats.promotionRate * 100).toFixed(1)}%
`);
    if (report.promotablePatterns.length > 0) {
      console.log("  \u{1F3AF} Patterns Ready for Promotion:\n");
      for (const pattern of report.promotablePatterns.slice(0, 5)) {
        console.log(`    - ${pattern.name}`);
        console.log(`      Regex: ${pattern.regex}`);
        console.log(`      Type: ${pattern.primitiveType}`);
        console.log(`      Confidence: ${(pattern.confidenceAtPromotion * 100).toFixed(1)}%`);
        console.log(`      Example: "${pattern.example}"
`);
      }
      if (report.promotablePatterns.length > 5) {
        console.log(`    ... and ${report.promotablePatterns.length - 5} more patterns
`);
      }
      if (options.outputDir) {
        const { reportPath, codePath } = exportPromotionReport(report, { outputDir: options.outputDir });
        console.log(`  \u{1F4C4} Exported promotion report to: ${reportPath}`);
        if (codePath) {
          console.log(`  \u{1F4C4} Exported TypeScript code to: ${codePath}`);
        }
        console.log();
      }
    }
    if (report.nearPromotionPatterns.length > 0) {
      console.log("  \u{1F4CA} Patterns Near Promotion:\n");
      for (const near of report.nearPromotionPatterns.slice(0, 3)) {
        console.log(`    - "${near.pattern.originalText}"`);
        console.log(`      Missing: ${near.missingCriteria.join(", ")}`);
        console.log(`      Est. uses needed: ${near.estimatedUsesNeeded}
`);
      }
    }
  }
  console.log('\u{1F4A1} Use "artk-autogen patterns promotion --json -o ./reports" to export detailed report\n');
}
async function runEnhancedStats(options) {
  const telemetryStats = getTelemetryStats({ baseDir: options.baseDir });
  let sharedStats;
  try {
    sharedStats = analyzePatternGaps();
  } catch {
    sharedStats = null;
  }
  let llkbStats;
  try {
    llkbStats = getPatternStats({ llkbRoot: options.baseDir });
  } catch {
    llkbStats = null;
  }
  if (options.json) {
    console.log(JSON.stringify({
      telemetry: telemetryStats,
      sharedTelemetry: sharedStats,
      llkb: llkbStats
    }, null, 2));
    return;
  }
  console.log(formatStats(telemetryStats));
  if (sharedStats && sharedStats.totalBlocked > 0) {
    console.log("\n\u{1F4CA} Shared Blocked Step Telemetry:\n");
    console.log(`  Total blocked steps: ${sharedStats.totalBlocked}`);
    console.log(`  Unique patterns: ${sharedStats.topPatterns.length}`);
    console.log("\n  Top blocked patterns:");
    for (const pattern of sharedStats.topPatterns.slice(0, 5)) {
      console.log(`    [${pattern.count}x] ${pattern.pattern.substring(0, 60)}...`);
    }
  }
  if (llkbStats && llkbStats.total > 0) {
    console.log("\n\u{1F4DA} LLKB Pattern Statistics:\n");
    console.log(`  Total learned: ${llkbStats.total}`);
    console.log(`  Promoted: ${llkbStats.promoted}`);
    console.log(`  High confidence: ${llkbStats.highConfidence}`);
    console.log(`  Avg confidence: ${(llkbStats.avgConfidence * 100).toFixed(1)}%`);
  }
  console.log();
}
async function runPatterns(args) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      dir: { type: "string", short: "d" },
      limit: { type: "string", short: "n", default: "20" },
      json: { type: "boolean", default: false },
      category: { type: "string", short: "c" },
      force: { type: "boolean", short: "f", default: false },
      output: { type: "string", short: "o" },
      help: { type: "boolean", short: "h" }
    },
    allowPositionals: true
  });
  if (values.help || positionals.length === 0) {
    console.log(PATTERNS_USAGE);
    return;
  }
  const subcommand = positionals[0];
  const options = {
    baseDir: values.dir,
    limit: parseInt(values.limit, 10) || 20,
    json: values.json,
    category: values.category,
    outputDir: values.output
  };
  switch (subcommand) {
    case "gaps":
      await runGaps(options);
      break;
    case "suggest":
      await runSuggest({ json: options.json, limit: options.limit });
      break;
    case "stats":
      await runEnhancedStats(options);
      break;
    case "list":
      await runList(options);
      break;
    case "promotion":
      await runPromotion(options);
      break;
    case "export":
      await runExport(options);
      break;
    case "clear":
      await runClear({ baseDir: options.baseDir, force: values.force });
      break;
    default:
      console.error(`Unknown subcommand: ${subcommand}`);
      console.log(PATTERNS_USAGE);
      process.exit(1);
  }
}
var PATTERNS_USAGE;
var init_patterns3 = __esm({
  "src/cli/patterns.ts"() {
    init_telemetry2();
    init_patterns();
    init_blocked_step_telemetry();
    init_patternPromotion();
    init_patternExtension();
    PATTERNS_USAGE = `
Usage: artk-autogen patterns <subcommand> [options]

Subcommands:
  gaps        Analyze blocked steps and show pattern gaps
  suggest     Generate suggested patterns from telemetry (with regex)
  stats       Show telemetry statistics (combined: telemetry + LLKB)
  list        List all available patterns
  promotion   Show LLKB pattern promotion status and candidates
  export      Export gaps as JSON for pattern development
  clear       Clear telemetry data (use with caution)

Options:
  --dir, -d <path>    Base directory (default: current directory)
  --limit, -n <num>   Limit number of results (default: 20)
  --json              Output as JSON
  --category, -c      Filter by category (navigation|interaction|assertion|wait|unknown)
  --force, -f         Skip confirmation prompts (for clear command)
  --output, -o        Output directory for promotion reports
  -h, --help          Show this help message

Examples:
  artk-autogen patterns gaps                    # Show top 20 pattern gaps
  artk-autogen patterns gaps --limit 50         # Show top 50 pattern gaps
  artk-autogen patterns suggest                 # Get suggested patterns with regex
  artk-autogen patterns suggest --json          # Get suggestions as JSON
  artk-autogen patterns stats                   # Show combined statistics
  artk-autogen patterns promotion               # Show LLKB promotion candidates
  artk-autogen patterns promotion --json        # Export promotion report
  artk-autogen patterns list                    # List all patterns
  artk-autogen patterns export --json           # Export gaps as JSON
  artk-autogen patterns clear                   # Clear telemetry (with confirmation)
`;
  }
});

// src/cli/llkb-patterns.ts
var llkb_patterns_exports = {};
__export(llkb_patterns_exports, {
  runLlkbPatterns: () => runLlkbPatterns
});
function formatPattern(pattern, index) {
  const lines = [];
  const confidenceStr = (pattern.confidence * 100).toFixed(0);
  const status = pattern.promotedToCore ? "[PROMOTED]" : "";
  lines.push(`  ${index + 1}. [${confidenceStr}%] "${pattern.originalText}" ${status}`);
  lines.push(`     ID: ${pattern.id}`);
  lines.push(`     Type: ${pattern.mappedPrimitive.type}`);
  lines.push(`     Success: ${pattern.successCount}, Fail: ${pattern.failCount}`);
  lines.push(`     Sources: ${pattern.sourceJourneys.length} journey(s)`);
  lines.push(`     Last used: ${new Date(pattern.lastUsed).toLocaleDateString()}`);
  return lines.join("\n");
}
function formatPromotablePattern(promoted, index) {
  const lines = [];
  const { pattern } = promoted;
  lines.push(`  ${index + 1}. "${pattern.originalText}"`);
  lines.push(`     ID: ${pattern.id}`);
  lines.push(`     Confidence: ${(pattern.confidence * 100).toFixed(0)}%`);
  lines.push(`     Priority: ${promoted.priority.toFixed(1)}`);
  lines.push(`     Generated regex: ${promoted.generatedRegex}`);
  lines.push(`     Primitive: ${JSON.stringify(pattern.mappedPrimitive)}`);
  return lines.join("\n");
}
async function runList2(options) {
  const patterns = loadLearnedPatterns({ llkbRoot: options.llkbRoot });
  if (patterns.length === 0) {
    console.log("\n\u{1F4DA} No learned patterns found.");
    console.log("   Patterns are learned when tests pass after manual fixes.\n");
    return;
  }
  const sorted = patterns.sort((a, b) => b.confidence - a.confidence).slice(0, options.limit);
  if (options.json) {
    console.log(JSON.stringify(sorted, null, 2));
    return;
  }
  console.log(`
\u{1F4DA} Learned Patterns (${sorted.length} of ${patterns.length})
`);
  for (let i = 0; i < sorted.length; i++) {
    console.log(formatPattern(sorted[i], i));
    console.log();
  }
}
async function runStats(options) {
  const stats = getPatternStats({ llkbRoot: options.llkbRoot });
  if (options.json) {
    console.log(JSON.stringify(stats, null, 2));
    return;
  }
  console.log("\n\u{1F4CA} LLKB Pattern Statistics\n");
  console.log(`  Total patterns: ${stats.total}`);
  console.log(`  Promoted to core: ${stats.promoted}`);
  console.log(`  High confidence (\u226570%): ${stats.highConfidence}`);
  console.log(`  Low confidence (<30%): ${stats.lowConfidence}`);
  console.log(`  Average confidence: ${(stats.avgConfidence * 100).toFixed(1)}%`);
  console.log(`  Total successes: ${stats.totalSuccesses}`);
  console.log(`  Total failures: ${stats.totalFailures}`);
  console.log();
}
async function runPromote(options) {
  const promotable = getPromotablePatterns({ llkbRoot: options.llkbRoot });
  if (promotable.length === 0) {
    console.log("\n\u2705 No patterns ready for promotion.");
    console.log("   Patterns need \u226590% confidence, \u22655 successes, and \u22652 source journeys.\n");
    return;
  }
  if (options.json) {
    console.log(JSON.stringify(promotable, null, 2));
    return;
  }
  console.log(`
\u{1F680} Patterns Ready for Promotion (${promotable.length})
`);
  for (let i = 0; i < promotable.length; i++) {
    console.log(formatPromotablePattern(promotable[i], i));
    console.log();
  }
  if (options.apply) {
    const ids = promotable.map((p) => p.pattern.id);
    markPatternsPromoted(ids, { llkbRoot: options.llkbRoot });
    console.log(`
\u2705 Marked ${ids.length} patterns as promoted.
`);
  } else {
    console.log("\u{1F4A1} Run with --apply to mark these patterns as promoted.\n");
  }
}
async function runExport2(options) {
  const result = exportPatternsToConfig({
    llkbRoot: options.llkbRoot,
    outputPath: options.outputPath,
    minConfidence: options.minConfidence
  });
  console.log(`
\u2705 Exported ${result.exported} patterns to: ${result.path}
`);
}
async function runPrune(options) {
  const result = prunePatterns({
    llkbRoot: options.llkbRoot,
    minConfidence: options.minConfidence,
    minSuccess: options.minSuccess,
    maxAgeDays: options.maxAgeDays
  });
  console.log(`
\u{1F9F9} Pruned ${result.removed} low-quality patterns.`);
  console.log(`   Remaining: ${result.remaining} patterns.
`);
}
async function confirmAction2(message) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve8) => {
    rl.question(`${message} (y/N): `, (answer) => {
      rl.close();
      resolve8(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });
}
async function runClear2(options) {
  const stats = getPatternStats({ llkbRoot: options.llkbRoot });
  if (stats.total === 0) {
    console.log("\n\u2705 No patterns to clear.\n");
    return;
  }
  console.log(`
\u26A0\uFE0F  This will delete ${stats.total} learned patterns.`);
  console.log("   This action cannot be undone.\n");
  if (!options.force) {
    const confirmed = await confirmAction2("Are you sure you want to proceed?");
    if (!confirmed) {
      console.log("Operation cancelled.\n");
      return;
    }
  }
  clearLearnedPatterns({ llkbRoot: options.llkbRoot });
  console.log("\u2705 All learned patterns cleared.\n");
}
async function runLlkbPatterns(args) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      "llkb-root": { type: "string", short: "r" },
      limit: { type: "string", short: "n", default: "20" },
      "min-confidence": { type: "string", default: "0.7" },
      "min-success": { type: "string", default: "1" },
      "max-age-days": { type: "string", default: "90" },
      output: { type: "string", short: "o" },
      json: { type: "boolean", default: false },
      apply: { type: "boolean", default: false },
      force: { type: "boolean", short: "f", default: false },
      help: { type: "boolean", short: "h" }
    },
    allowPositionals: true
  });
  if (values.help || positionals.length === 0) {
    console.log(LLKB_PATTERNS_USAGE);
    return;
  }
  const subcommand = positionals[0];
  const baseOptions = {
    llkbRoot: values["llkb-root"],
    json: values.json
  };
  switch (subcommand) {
    case "list":
      await runList2({
        ...baseOptions,
        limit: parseInt(values.limit, 10) || 20
      });
      break;
    case "stats":
      await runStats(baseOptions);
      break;
    case "promote":
      await runPromote({
        ...baseOptions,
        apply: values.apply
      });
      break;
    case "export":
      await runExport2({
        llkbRoot: baseOptions.llkbRoot,
        outputPath: values.output,
        minConfidence: parseFloat(values["min-confidence"]) || 0.7
      });
      break;
    case "prune":
      await runPrune({
        llkbRoot: baseOptions.llkbRoot,
        minConfidence: parseFloat(values["min-confidence"]) || 0.3,
        minSuccess: parseInt(values["min-success"], 10) || 1,
        maxAgeDays: parseInt(values["max-age-days"], 10) || 90
      });
      break;
    case "clear":
      await runClear2({ llkbRoot: baseOptions.llkbRoot, force: values.force });
      break;
    default:
      console.error(`Unknown subcommand: ${subcommand}`);
      console.log(LLKB_PATTERNS_USAGE);
      process.exit(1);
  }
}
var LLKB_PATTERNS_USAGE;
var init_llkb_patterns = __esm({
  "src/cli/llkb-patterns.ts"() {
    init_patternExtension();
    LLKB_PATTERNS_USAGE = `
Usage: artk-autogen llkb-patterns <subcommand> [options]

Subcommands:
  list        List all learned patterns
  stats       Show pattern statistics
  promote     Check and display patterns ready for promotion
  export      Export patterns to LLKB config format
  prune       Remove low-quality patterns
  clear       Clear all learned patterns (use with caution)

Options:
  --llkb-root, -r <path>    LLKB root directory (default: .artk/llkb)
  --limit, -n <num>         Limit number of results (default: 20)
  --min-confidence <num>    Minimum confidence threshold (default: varies by command)
  --json                    Output as JSON
  --force, -f               Skip confirmation prompts (for clear command)
  -h, --help                Show this help message

Examples:
  artk-autogen llkb-patterns list                    # List top 20 learned patterns
  artk-autogen llkb-patterns list --limit 50         # List top 50 patterns
  artk-autogen llkb-patterns stats                   # Show statistics
  artk-autogen llkb-patterns promote                 # Show promotable patterns
  artk-autogen llkb-patterns export                  # Export to config file
  artk-autogen llkb-patterns prune --min-confidence 0.3  # Remove low-confidence patterns
  artk-autogen llkb-patterns clear                   # Clear all patterns (with confirmation)
  artk-autogen llkb-patterns clear --force           # Clear all patterns (no confirmation)
`;
  }
});

// src/cli/index.ts
init_index();
var USAGE10 = `
Usage: artk-autogen <command> [options]

Pipeline Commands (Hybrid Agentic Architecture):
  analyze        Analyze journey files and output structured analysis
  plan           Create test generation plan from analysis
  generate       Generate Playwright tests from plan (or journey files)
  run            Execute tests via Playwright
  refine         Analyze failures and generate refinement suggestions
  status         Show pipeline state
  clean          Clean autogen artifacts

Validation Commands:
  validate       Validate generated test code
  verify         Run and verify generated tests

Management Commands:
  install        Install ARTK autogen instance in a project
  upgrade        Upgrade ARTK autogen instance to new version
  patterns       Analyze blocked step telemetry and pattern gaps
  llkb-patterns  Manage learned patterns from LLKB integration

Options:
  -h, --help      Show this help message
  -v, --version   Show version

Examples:
  # Pipeline workflow
  artk-autogen analyze "journeys/*.md"
  artk-autogen plan --strategy scot
  artk-autogen generate --output tests/
  artk-autogen run tests/*.spec.ts
  artk-autogen refine
  artk-autogen status

  # Legacy workflow (still supported)
  artk-autogen generate journeys/login.md -o tests/ -m

  # Management
  artk-autogen install --dir ./my-project
  artk-autogen patterns gaps --limit 20
`;
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log(USAGE10);
    process.exit(0);
  }
  const command = args[0];
  if (command === "-h" || command === "--help") {
    console.log(USAGE10);
    process.exit(0);
  }
  if (command === "-v" || command === "--version") {
    console.log(`@artk/core-autogen v${VERSION}`);
    process.exit(0);
  }
  const subArgs = args.slice(1);
  try {
    switch (command) {
      // ─────────────────────────────────────────────────────────────────────
      // PIPELINE COMMANDS (Hybrid Agentic Architecture)
      // ─────────────────────────────────────────────────────────────────────
      case "analyze": {
        const { runAnalyze: runAnalyze2 } = await Promise.resolve().then(() => (init_analyze(), analyze_exports));
        await runAnalyze2(subArgs);
        break;
      }
      case "plan": {
        const { runPlan: runPlan2 } = await Promise.resolve().then(() => (init_plan(), plan_exports));
        await runPlan2(subArgs);
        break;
      }
      case "generate": {
        const { runGenerate: runGenerate2 } = await Promise.resolve().then(() => (init_generate(), generate_exports));
        await runGenerate2(subArgs);
        break;
      }
      case "run": {
        const { runRun: runRun2 } = await Promise.resolve().then(() => (init_run(), run_exports));
        await runRun2(subArgs);
        break;
      }
      case "refine": {
        const { runRefine: runRefine2 } = await Promise.resolve().then(() => (init_refine(), refine_exports));
        await runRefine2(subArgs);
        break;
      }
      case "status": {
        const { runStatus: runStatus2 } = await Promise.resolve().then(() => (init_status(), status_exports));
        await runStatus2(subArgs);
        break;
      }
      case "clean": {
        const { runClean: runClean2 } = await Promise.resolve().then(() => (init_clean(), clean_exports));
        await runClean2(subArgs);
        break;
      }
      // ─────────────────────────────────────────────────────────────────────
      // VALIDATION COMMANDS
      // ─────────────────────────────────────────────────────────────────────
      case "validate": {
        const { runValidate: runValidate2 } = await Promise.resolve().then(() => (init_validate2(), validate_exports));
        await runValidate2(subArgs);
        break;
      }
      case "verify": {
        const { runVerify: runVerify2 } = await Promise.resolve().then(() => (init_verify2(), verify_exports));
        await runVerify2(subArgs);
        break;
      }
      // ─────────────────────────────────────────────────────────────────────
      // MANAGEMENT COMMANDS
      // ─────────────────────────────────────────────────────────────────────
      case "install": {
        const { runInstall: runInstall2 } = await Promise.resolve().then(() => (init_install2(), install_exports));
        await runInstall2(subArgs);
        break;
      }
      case "upgrade": {
        const { runUpgrade: runUpgrade2 } = await Promise.resolve().then(() => (init_upgrade2(), upgrade_exports));
        await runUpgrade2(subArgs);
        break;
      }
      case "patterns": {
        const { runPatterns: runPatterns2 } = await Promise.resolve().then(() => (init_patterns3(), patterns_exports));
        await runPatterns2(subArgs);
        break;
      }
      case "llkb-patterns": {
        const { runLlkbPatterns: runLlkbPatterns2 } = await Promise.resolve().then(() => (init_llkb_patterns(), llkb_patterns_exports));
        await runLlkbPatterns2(subArgs);
        break;
      }
      default:
        console.error(`Unknown command: ${command}`);
        console.log(USAGE10);
        process.exit(1);
    }
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
main();
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map