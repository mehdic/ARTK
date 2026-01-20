#!/usr/bin/env node
'use strict';

var zod = require('zod');
var fs = require('fs');
var path = require('path');
var yaml = require('yaml');
var fg2 = require('fast-glob');
var crypto = require('crypto');
var url = require('url');
var ejs = require('ejs');
require('ts-morph');
var child_process = require('child_process');
var os = require('os');
var util = require('util');

var _documentCurrentScript = typeof document !== 'undefined' ? document.currentScript : null;
function _interopDefault (e) { return e && e.__esModule ? e : { default: e }; }

var fg2__default = /*#__PURE__*/_interopDefault(fg2);
var ejs__default = /*#__PURE__*/_interopDefault(ejs);

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
var SelectorStrategySchema, PathsSchema, EslintSeveritySchema, EslintRulesSchema, SelectorPolicySchema, ValidationSchema, HealSchema, RegenerationStrategySchema, AutogenConfigSchema;
var init_schema = __esm({
  "src/config/schema.ts"() {
    SelectorStrategySchema = zod.z.enum([
      "role",
      "label",
      "placeholder",
      "text",
      "testid",
      "css"
    ]);
    PathsSchema = zod.z.object({
      journeys: zod.z.string().default("journeys"),
      modules: zod.z.string().default("e2e/modules"),
      tests: zod.z.string().default("e2e/tests"),
      templates: zod.z.string().default("artk/templates"),
      catalog: zod.z.string().default("artk/selectors")
    });
    EslintSeveritySchema = zod.z.enum(["error", "warn", "off"]);
    EslintRulesSchema = zod.z.record(zod.z.string(), EslintSeveritySchema).default({
      "no-wait-for-timeout": "error",
      "no-force-option": "error",
      "prefer-web-first-assertions": "error"
    });
    SelectorPolicySchema = zod.z.object({
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
    ValidationSchema = zod.z.object({
      eslintRules: EslintRulesSchema.default({
        "no-wait-for-timeout": "error",
        "no-force-option": "error",
        "prefer-web-first-assertions": "error"
      }),
      customRules: zod.z.array(zod.z.string()).default([])
    });
    HealSchema = zod.z.object({
      enabled: zod.z.boolean().default(true),
      maxSuggestions: zod.z.number().min(1).max(10).default(5),
      skipPatterns: zod.z.array(zod.z.string()).default([])
    });
    RegenerationStrategySchema = zod.z.enum(["ast", "blocks"]).default("ast");
    AutogenConfigSchema = zod.z.object({
      version: zod.z.literal(1).default(1),
      paths: PathsSchema.default({}),
      selectorPolicy: SelectorPolicySchema.default({}),
      validation: ValidationSchema.default({}),
      heal: HealSchema.default({}),
      regenerationStrategy: RegenerationStrategySchema
    });
  }
});
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
  } catch (err2) {
    throw new ConfigLoadError(`Failed to read config file: ${resolvedPath}`, err2);
  }
  let parsed;
  try {
    parsed = yaml.parse(rawContent);
  } catch (err2) {
    throw new ConfigLoadError(`Invalid YAML in config file: ${resolvedPath}`, err2);
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
      }
    };
  }
});
var JourneyStatusSchema, JourneyTierSchema, DataStrategySchema, CleanupStrategySchema, CompletionTypeSchema, ElementStateSchema, CompletionSignalSchema, DataConfigSchema, ModulesSchema, TestRefSchema, LinksSchema, NegativePathSchema, VisualRegressionSchema, AccessibilityTimingSchema, AccessibilitySchema, PerformanceSchema, TestDataSetSchema, JourneyFrontmatterSchema;
var init_schema2 = __esm({
  "src/journey/schema.ts"() {
    JourneyStatusSchema = zod.z.enum([
      "proposed",
      "defined",
      "clarified",
      "implemented",
      "quarantined",
      "deprecated"
    ]);
    JourneyTierSchema = zod.z.enum(["smoke", "release", "regression"]);
    DataStrategySchema = zod.z.enum(["seed", "create", "reuse"]);
    CleanupStrategySchema = zod.z.enum(["required", "best-effort", "none"]);
    CompletionTypeSchema = zod.z.enum(["url", "toast", "element", "text", "title", "api"]);
    ElementStateSchema = zod.z.enum(["visible", "hidden", "attached", "detached"]);
    CompletionSignalSchema = zod.z.object({
      type: CompletionTypeSchema,
      value: zod.z.string().min(1, "Completion signal value is required"),
      options: zod.z.object({
        timeout: zod.z.number().positive().optional(),
        exact: zod.z.boolean().optional(),
        state: ElementStateSchema.optional(),
        method: zod.z.string().optional(),
        status: zod.z.number().int().positive().optional()
      }).optional()
    });
    DataConfigSchema = zod.z.object({
      strategy: DataStrategySchema.default("create"),
      cleanup: CleanupStrategySchema.default("best-effort")
    });
    ModulesSchema = zod.z.object({
      foundation: zod.z.array(zod.z.string()).default([]),
      features: zod.z.array(zod.z.string()).default([])
    });
    TestRefSchema = zod.z.object({
      file: zod.z.string(),
      line: zod.z.number().optional()
    });
    LinksSchema = zod.z.object({
      issues: zod.z.array(zod.z.string()).optional(),
      prs: zod.z.array(zod.z.string()).optional(),
      docs: zod.z.array(zod.z.string()).optional()
    });
    NegativePathSchema = zod.z.object({
      name: zod.z.string().min(1, "Negative path name is required"),
      input: zod.z.record(zod.z.any()),
      expectedError: zod.z.string().min(1, "Expected error message is required"),
      expectedElement: zod.z.string().optional()
    });
    VisualRegressionSchema = zod.z.object({
      enabled: zod.z.boolean(),
      snapshots: zod.z.array(zod.z.string()).optional(),
      threshold: zod.z.number().min(0).max(1).optional()
    });
    AccessibilityTimingSchema = zod.z.enum(["afterEach", "inTest"]);
    AccessibilitySchema = zod.z.object({
      enabled: zod.z.boolean(),
      rules: zod.z.array(zod.z.string()).optional(),
      exclude: zod.z.array(zod.z.string()).optional(),
      /**
       * When to run accessibility checks:
       * - 'afterEach': Run after each test (default, catches issues but doesn't fail individual tests)
       * - 'inTest': Run within test steps (fails immediately, better for CI)
       */
      timing: AccessibilityTimingSchema.default("afterEach")
    });
    PerformanceSchema = zod.z.object({
      enabled: zod.z.boolean(),
      budgets: zod.z.object({
        lcp: zod.z.number().positive().optional(),
        fid: zod.z.number().positive().optional(),
        cls: zod.z.number().min(0).optional(),
        ttfb: zod.z.number().positive().optional()
      }).optional(),
      /** Timeout for collecting performance metrics in ms (default: 3000) */
      collectTimeout: zod.z.number().positive().optional()
    });
    TestDataSetSchema = zod.z.object({
      name: zod.z.string().min(1, "Test data set name is required"),
      description: zod.z.string().optional(),
      data: zod.z.record(zod.z.string(), zod.z.any())
    });
    JourneyFrontmatterSchema = zod.z.object({
      id: zod.z.string().regex(/^JRN-\d{4}$/, "Journey ID must be in format JRN-XXXX"),
      title: zod.z.string().min(1, "Title is required"),
      status: JourneyStatusSchema,
      tier: JourneyTierSchema,
      scope: zod.z.string().min(1, "Scope is required"),
      actor: zod.z.string().min(1, "Actor is required"),
      revision: zod.z.number().int().positive().default(1),
      owner: zod.z.string().optional(),
      statusReason: zod.z.string().optional(),
      modules: ModulesSchema.default({ foundation: [], features: [] }),
      tests: zod.z.array(zod.z.union([zod.z.string(), TestRefSchema])).default([]),
      data: DataConfigSchema.optional(),
      completion: zod.z.array(CompletionSignalSchema).optional(),
      links: LinksSchema.optional(),
      tags: zod.z.array(zod.z.string()).optional(),
      flags: zod.z.object({
        required: zod.z.array(zod.z.string()).optional(),
        forbidden: zod.z.array(zod.z.string()).optional()
      }).optional(),
      prerequisites: zod.z.array(zod.z.string()).optional().describe("Array of Journey IDs that must run first"),
      negativePaths: zod.z.array(NegativePathSchema).optional().describe("Error scenarios to test"),
      testData: zod.z.array(TestDataSetSchema).optional().describe("Parameterized test data sets for data-driven testing"),
      visualRegression: VisualRegressionSchema.optional(),
      accessibility: AccessibilitySchema.optional(),
      performance: PerformanceSchema.optional()
    });
    JourneyFrontmatterSchema.extend({
      status: zod.z.literal("clarified")
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
      status: zod.z.literal("implemented")
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
      status: zod.z.literal("quarantined"),
      owner: zod.z.string().min(1, "Quarantined journeys require an owner"),
      statusReason: zod.z.string().min(1, "Quarantined journeys require a status reason")
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
  let cleanSelector = selector.replace(/^the\s+/i, "").trim();
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
var navigationPatterns, clickPatterns, fillPatterns, selectPatterns, checkPatterns, visibilityPatterns, toastPatterns, urlPatterns, authPatterns, waitPatterns, structuredPatterns, allPatterns;
var init_patterns = __esm({
  "src/mapping/patterns.ts"() {
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
      }
    ];
    clickPatterns = [
      {
        name: "click-button-quoted",
        regex: /^(?:user\s+)?(?:clicks?|presses?|taps?)\s+(?:on\s+)?(?:the\s+)?["']([^"']+)["']\s+button$/i,
        primitiveType: "click",
        extract: (match) => ({
          type: "click",
          locator: createLocatorFromMatch("role", "button", match[1])
        })
      },
      {
        name: "click-link-quoted",
        regex: /^(?:user\s+)?(?:clicks?|presses?|taps?)\s+(?:on\s+)?(?:the\s+)?["']([^"']+)["']\s+link$/i,
        primitiveType: "click",
        extract: (match) => ({
          type: "click",
          locator: createLocatorFromMatch("role", "link", match[1])
        })
      },
      {
        name: "click-element-quoted",
        regex: /^(?:user\s+)?(?:clicks?|presses?|taps?)\s+(?:on\s+)?(?:the\s+)?["']([^"']+)["']$/i,
        primitiveType: "click",
        extract: (match) => ({
          type: "click",
          locator: createLocatorFromMatch("text", match[1])
        })
      },
      {
        name: "click-element-generic",
        regex: /^(?:user\s+)?(?:clicks?|presses?|taps?)\s+(?:on\s+)?(?:the\s+)?(.+?)\s+(?:button|link|icon|menu|tab)$/i,
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
        name: "uncheck-checkbox",
        regex: /^(?:user\s+)?(?:unchecks?|disables?|unticks?)\s+(?:the\s+)?["']([^"']+)["']\s*(?:checkbox|option)?$/i,
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
        regex: /^(?:a\s+)?success\s+toast\s+(?:with\s+)?["']([^"']+)["']\s*(?:message\s+)?(?:appears?|is\s+shown|displays?)$/i,
        primitiveType: "expectToast",
        extract: (match) => ({
          type: "expectToast",
          toastType: "success",
          message: match[1]
        })
      },
      {
        name: "error-toast-message",
        regex: /^(?:an?\s+)?error\s+toast\s+(?:with\s+)?["']([^"']+)["']\s*(?:message\s+)?(?:appears?|is\s+shown|displays?)$/i,
        primitiveType: "expectToast",
        extract: (match) => ({
          type: "expectToast",
          toastType: "error",
          message: match[1]
        })
      },
      {
        name: "toast-appears",
        regex: /^(?:a\s+)?(success|error|info|warning)\s+toast\s+(?:appears?|is\s+shown|displays?)$/i,
        primitiveType: "expectToast",
        extract: (match) => ({
          type: "expectToast",
          toastType: match[1].toLowerCase()
        })
      },
      {
        name: "toast-with-text",
        regex: /^(?:toast|notification)\s+(?:with\s+)?["']([^"']+)["']\s+(?:appears?|is\s+shown|displays?)$/i,
        primitiveType: "expectToast",
        extract: (match) => ({
          type: "expectToast",
          toastType: "info",
          message: match[1]
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
    allPatterns = [
      ...structuredPatterns,
      ...authPatterns,
      ...toastPatterns,
      ...navigationPatterns,
      ...clickPatterns,
      ...fillPatterns,
      ...selectPatterns,
      ...checkPatterns,
      ...visibilityPatterns,
      ...urlPatterns,
      ...waitPatterns
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
  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    throw new JourneyParseError(
      `Journey file not found: ${resolvedPath}`,
      resolvedPath
    );
  }
  let content;
  try {
    content = fs.readFileSync(resolvedPath, "utf-8");
  } catch (err2) {
    throw new JourneyParseError(
      `Failed to read journey file: ${resolvedPath}`,
      resolvedPath,
      err2
    );
  }
  let frontmatterStr;
  let body;
  try {
    const extracted = extractFrontmatter(content);
    frontmatterStr = extracted.frontmatter;
    body = extracted.body;
  } catch (err2) {
    throw new JourneyParseError(
      `Invalid frontmatter in journey file: ${resolvedPath}`,
      resolvedPath,
      err2
    );
  }
  let rawFrontmatter;
  try {
    rawFrontmatter = yaml.parse(frontmatterStr);
  } catch (err2) {
    throw new JourneyParseError(
      `Invalid YAML in journey frontmatter: ${resolvedPath}`,
      resolvedPath,
      err2
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
  const rawFrontmatter = yaml.parse(frontmatterStr);
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
      const canonical = synonymMap.get(part.toLowerCase());
      parts.push(canonical ?? part);
    }
  }
  return parts.join(" ");
}
var GlossaryEntrySchema, LabelAliasSchema, ModuleMethodMappingSchema, defaultGlossary, glossaryCache, synonymMap;
var init_glossary = __esm({
  "src/mapping/glossary.ts"() {
    GlossaryEntrySchema = zod.z.object({
      canonical: zod.z.string(),
      synonyms: zod.z.array(zod.z.string())
    });
    LabelAliasSchema = zod.z.object({
      label: zod.z.string(),
      testid: zod.z.string().optional(),
      role: zod.z.string().optional(),
      selector: zod.z.string().optional()
    });
    ModuleMethodMappingSchema = zod.z.object({
      phrase: zod.z.string(),
      module: zod.z.string(),
      method: zod.z.string(),
      params: zod.z.record(zod.z.string()).optional()
    });
    zod.z.object({
      version: zod.z.number().default(1),
      entries: zod.z.array(GlossaryEntrySchema),
      labelAliases: zod.z.array(LabelAliasSchema).default([]),
      moduleMethods: zod.z.array(ModuleMethodMappingSchema).default([])
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
          synonyms: ["press", "tap", "select", "hit"]
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
          synonyms: ["select", "combo", "combobox", "selector", "picker"]
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

// src/mapping/stepMapper.ts
function isAssertion(primitive) {
  return primitive.type.startsWith("expect");
}
function mapStepText(text, options = {}) {
  const { normalizeText = true } = options;
  const hints = extractHints(text);
  const cleanText = hints.hasHints ? hints.cleanText : text;
  const processedText = normalizeText ? normalizeStepText(cleanText) : cleanText;
  let primitive = matchPattern(processedText);
  if (primitive && hints.hasHints) {
    primitive = applyHintsToPrimitive(primitive, hints);
  } else if (!primitive && hasLocatorHints(hints)) {
    primitive = createPrimitiveFromHints(processedText, hints);
  }
  if (primitive) {
    return {
      primitive,
      sourceText: text,
      isAssertion: isAssertion(primitive)
    };
  }
  return {
    primitive: null,
    sourceText: text,
    isAssertion: false,
    message: `Could not map step: "${text}"`
  };
}
function applyHintsToPrimitive(primitive, hints) {
  const enhanced = { ...primitive };
  if (hasLocatorHints(hints)) {
    const locatorSpec = buildLocatorFromHints(hints);
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
function buildLocatorFromHints(hints) {
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
  const locator = buildLocatorFromHints(hints);
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
var init_stepMapper = __esm({
  "src/mapping/stepMapper.ts"() {
    init_patterns();
    init_glossary();
    init_parseHints();
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
    SelectorEntrySchema = zod.z.object({
      /** Unique identifier for this selector */
      id: zod.z.string(),
      /** Human-readable description */
      description: zod.z.string().optional(),
      /** The selector strategy */
      strategy: zod.z.enum(["testid", "role", "label", "text", "css", "xpath"]),
      /** The selector value */
      value: zod.z.string(),
      /** Additional options for the locator */
      options: zod.z.object({
        name: zod.z.string().optional(),
        exact: zod.z.boolean().optional(),
        level: zod.z.number().optional()
      }).optional(),
      /** Component or page this selector belongs to */
      component: zod.z.string().optional(),
      /** File where this selector was discovered */
      sourceFile: zod.z.string().optional(),
      /** Line number in source file */
      sourceLine: zod.z.number().optional(),
      /** Tags for categorization */
      tags: zod.z.array(zod.z.string()).optional(),
      /** Whether this is a stable selector (not likely to change) */
      stable: zod.z.boolean().default(true),
      /** Last verified timestamp */
      lastVerified: zod.z.string().optional()
    });
    ComponentEntrySchema = zod.z.object({
      /** Component name */
      name: zod.z.string(),
      /** Component file path */
      path: zod.z.string().optional(),
      /** Selectors within this component */
      selectors: zod.z.array(zod.z.string()),
      // References to selector IDs
      /** Child components */
      children: zod.z.array(zod.z.string()).optional()
    });
    PageEntrySchema = zod.z.object({
      /** Page name */
      name: zod.z.string(),
      /** Route pattern */
      route: zod.z.string().optional(),
      /** Page file path */
      path: zod.z.string().optional(),
      /** Components on this page */
      components: zod.z.array(zod.z.string()).optional(),
      /** Direct selectors on this page */
      selectors: zod.z.array(zod.z.string()).optional()
    });
    CSSDebtEntrySchema = zod.z.object({
      /** The CSS selector being used */
      selector: zod.z.string(),
      /** Files using this selector */
      usages: zod.z.array(
        zod.z.object({
          file: zod.z.string(),
          line: zod.z.number()
        })
      ),
      /** Suggested replacement */
      suggestedReplacement: zod.z.object({
        strategy: zod.z.string(),
        value: zod.z.string()
      }).optional(),
      /** Priority for migration (higher = more urgent) */
      priority: zod.z.enum(["low", "medium", "high"]).default("medium"),
      /** Reason this is considered debt */
      reason: zod.z.string().optional()
    });
    zod.z.object({
      /** Schema version */
      version: zod.z.string().default("1.0.0"),
      /** Generation timestamp */
      generatedAt: zod.z.string(),
      /** Source directory that was scanned */
      sourceDir: zod.z.string().optional(),
      /** All selectors indexed by ID */
      selectors: zod.z.record(SelectorEntrySchema),
      /** Components indexed by name */
      components: zod.z.record(ComponentEntrySchema).default({}),
      /** Pages indexed by name */
      pages: zod.z.record(PageEntrySchema).default({}),
      /** TestIDs found in the codebase */
      testIds: zod.z.array(zod.z.string()).default([]),
      /** CSS debt entries */
      cssDebt: zod.z.array(CSSDebtEntrySchema).default([]),
      /** Statistics */
      stats: zod.z.object({
        totalSelectors: zod.z.number(),
        byStrategy: zod.z.record(zod.z.number()),
        stableCount: zod.z.number(),
        unstableCount: zod.z.number(),
        cssDebtCount: zod.z.number()
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
  return crypto.createHash("sha256").update(content).digest("hex").substring(0, 8);
}
function updateJourneyFrontmatter(options) {
  const {
    journeyPath,
    testPath,
    testContent,
    modules = { foundation: [], features: [] }
  } = options;
  const content = fs.readFileSync(journeyPath, "utf-8");
  const { frontmatter, body } = splitJourneyContent(content);
  const parsed = yaml.parse(frontmatter);
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
  const newFrontmatter = yaml.stringify(parsed, {
    lineWidth: 0,
    // Prevent line wrapping
    defaultKeyType: "PLAIN",
    defaultStringType: "QUOTE_DOUBLE"
  });
  const newContent = `---
${newFrontmatter}---
${body}`;
  fs.writeFileSync(journeyPath, newContent, "utf-8");
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
function getModuleDir() {
  if (cachedModuleDir) {
    return cachedModuleDir;
  }
  if (typeof __dirname === "string" && __dirname.length > 0) {
    cachedModuleDir = __dirname;
    return cachedModuleDir;
  }
  try {
    const metaUrl = (typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('index.cjs', document.baseURI).href));
    if (metaUrl) {
      cachedModuleDir = path.dirname(url.fileURLToPath(metaUrl));
      return cachedModuleDir;
    }
  } catch {
  }
  try {
    if (typeof __require !== "undefined" && __require?.resolve) {
      const resolved = __require.resolve("@artk/core-autogen/package.json");
      cachedModuleDir = path.dirname(resolved);
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
  if (envRoot && fs.existsSync(path.join(envRoot, "package.json"))) {
    cachedPackageRoot = envRoot;
    return cachedPackageRoot;
  }
  const moduleDir = getModuleDir();
  const possibleRoots = [
    path.join(moduleDir, "..", ".."),
    // from dist/utils/ or dist-cjs/utils/
    path.join(moduleDir, ".."),
    // from dist/ directly
    moduleDir
    // if already at root
  ];
  for (const root of possibleRoots) {
    const pkgPath = path.join(root, "package.json");
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
        if (pkg.name === "@artk/core-autogen") {
          cachedPackageRoot = root;
          return cachedPackageRoot;
        }
      } catch {
      }
    }
  }
  const cwdPaths = [
    path.join(process.cwd(), "node_modules", "@artk", "core-autogen"),
    path.join(process.cwd(), "artk-e2e", "vendor", "artk-core-autogen"),
    process.cwd()
  ];
  for (const searchPath of cwdPaths) {
    const pkgPath = path.join(searchPath, "package.json");
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
        if (pkg.name === "@artk/core-autogen") {
          cachedPackageRoot = searchPath;
          return cachedPackageRoot;
        }
      } catch {
      }
    }
  }
  cachedPackageRoot = path.join(moduleDir, "..", "..");
  return cachedPackageRoot;
}
function getTemplatesDir() {
  const root = getPackageRoot();
  const moduleDir = getModuleDir();
  const relativeToModule = path.join(moduleDir, "..", "codegen", "templates");
  if (fs.existsSync(relativeToModule)) {
    return relativeToModule;
  }
  const possiblePaths = [
    path.join(root, "dist", "codegen", "templates"),
    path.join(root, "dist-cjs", "codegen", "templates"),
    path.join(root, "dist-legacy-16", "codegen", "templates"),
    path.join(root, "dist-legacy-14", "codegen", "templates")
  ];
  for (const templatesPath of possiblePaths) {
    if (fs.existsSync(templatesPath)) {
      return templatesPath;
    }
  }
  return possiblePaths[0] ?? path.join(root, "dist", "codegen", "templates");
}
function getTemplatePath(templateName) {
  return path.join(getTemplatesDir(), templateName);
}
var cachedPackageRoot, cachedModuleDir;
var init_paths = __esm({
  "src/utils/paths.ts"() {
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
    const pkgPath = path.join(packageRoot, "package.json");
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
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
function renderPrimitive(primitive, indent = "") {
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
    // Interactions
    case "click":
      return `${indent}await page.${toPlaywrightLocator(primitive.locator)}.click();`;
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
    case "blocked":
      return `${indent}// ARTK BLOCKED: ${primitive.reason}
${indent}// Source: ${escapeString2(primitive.sourceText)}
${indent}throw new Error('ARTK BLOCKED: ${escapeString2(primitive.reason)}');`;
    default:
      return `${indent}// Unknown primitive type: ${primitive.type}`;
  }
}
function loadDefaultTemplate() {
  const templatePath = getTemplatePath("test.ejs");
  return fs.readFileSync(templatePath, "utf-8");
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
function generateTest(journey, options = {}) {
  const { templatePath, imports: additionalImports = [], strategy = "full", existingCode } = options;
  const template = templatePath ? fs.readFileSync(templatePath, "utf-8") : loadDefaultTemplate();
  const imports = [...collectImports(journey), ...additionalImports];
  let code = ejs__default.default.render(template, {
    journey,
    imports,
    renderPrimitive,
    escapeString: escapeString2,
    escapeRegex,
    version: getPackageVersion(),
    timestamp: getGeneratedTimestamp()
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
    imports
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
    case "blocked":
      return `// ARTK BLOCKED: ${primitive.reason}
    throw new Error('ARTK BLOCKED: ${primitive.reason}');`;
    default:
      return null;
  }
}
function escapeString3(str) {
  return str.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r");
}
function loadDefaultTemplate2() {
  const templatePath = getTemplatePath("module.ejs");
  return fs.readFileSync(templatePath, "utf-8");
}
function generateModule(journey, options = {}) {
  const { templatePath, suffix = "Page" } = options;
  const template = templatePath ? fs.readFileSync(templatePath, "utf-8") : loadDefaultTemplate2();
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
  const code = ejs__default.default.render(template, {
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
function getPatternStats(results) {
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
    byPattern: getPatternStats(results)
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
  try {
    child_process.execSync("npx eslint --version", {
      cwd,
      stdio: "pipe",
      encoding: "utf-8"
    });
    return true;
  } catch {
    return false;
  }
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
  const tempDir = path.join(os.tmpdir(), "autogen-lint");
  fs.mkdirSync(tempDir, { recursive: true });
  const tempFile = path.join(tempDir, filename);
  try {
    fs.writeFileSync(tempFile, code, "utf-8");
    const args = ["eslint", "--format", "json"];
    if (fix) {
      args.push("--fix");
    }
    if (configPath && fs.existsSync(configPath)) {
      args.push("--config", configPath);
    }
    args.push(tempFile);
    const result = child_process.execSync(`npx ${args.join(" ")}`, {
      cwd,
      stdio: "pipe",
      encoding: "utf-8"
    });
    return {
      passed: true,
      output: result,
      issues: parseESLintOutput(result),
      errorCount: 0,
      warningCount: 0
    };
  } catch (err2) {
    const error = err2;
    const output = error.stdout || "";
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
      fs.unlinkSync(tempFile);
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
    child_process.execSync("npx playwright --version", {
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
  const tempDir = path.join(os.tmpdir(), `autogen-verify-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });
  const reportPath = path.join(tempDir, "results.json");
  const args = buildPlaywrightArgs({
    ...options,
    reporter: `json,line`
  });
  const command = `npx playwright ${args.join(" ")}`;
  const startTime = Date.now();
  try {
    const result = child_process.execSync(command, {
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
    return {
      success: true,
      exitCode: 0,
      stdout: result,
      stderr: "",
      reportPath: fs.existsSync(reportPath) ? reportPath : void 0,
      duration: Date.now() - startTime,
      command
    };
  } catch (error) {
    const execError = error;
    return {
      success: false,
      exitCode: execError.status || 1,
      stdout: execError.stdout || "",
      stderr: execError.stderr || String(error),
      reportPath: fs.existsSync(reportPath) ? reportPath : void 0,
      duration: Date.now() - startTime,
      command
    };
  }
}
var init_runner = __esm({
  "src/verify/runner.ts"() {
  }
});
function parseReportFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    const content = fs.readFileSync(filePath, "utf-8");
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

// src/verify/summary.ts
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
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    const content = fs.readFileSync(filePath, "utf-8");
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
        this.outputPath = path.join(outputDir, `${journeyId}.heal-log.json`);
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
        const dir = path.dirname(this.outputPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(this.outputPath, JSON.stringify(this.log, null, 2), "utf-8");
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
  if (!fs.existsSync(testFile)) {
    logger.markFailed("Test file not found");
    return {
      success: false,
      status: "failed",
      attempts: 0,
      logPath: logger.getOutputPath(),
      recommendation: "Test file not found"
    };
  }
  let currentCode = fs.readFileSync(testFile, "utf-8");
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
    fs.writeFileSync(testFile, fixResult.code, "utf-8");
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
  const random = crypto.randomBytes(4).toString("hex");
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
      const fullPath = path.join(rootDir, dir);
      if (fs.existsSync(fullPath)) {
        if (skipIfExists && !force) {
          result.skipped.push(dir);
          continue;
        }
      } else {
        fs.mkdirSync(fullPath, { recursive: true });
        result.created.push(dir);
      }
    }
    const configPath = path.join(rootDir, "autogen.config.yml");
    if (!fs.existsSync(configPath) || force) {
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
      fs.writeFileSync(configPath, yaml.stringify(config));
      result.created.push("autogen.config.yml");
    } else if (skipIfExists) {
      result.skipped.push("autogen.config.yml");
    }
    const gitignorePath = path.join(rootDir, ".artk/.gitignore");
    if (!fs.existsSync(gitignorePath) || force) {
      fs.writeFileSync(gitignorePath, [
        "# ARTK temporary files",
        "heal-logs/",
        "*.heal.json",
        "selector-catalog.local.json"
      ].join("\n"));
      result.created.push(".artk/.gitignore");
    } else if (skipIfExists) {
      result.skipped.push(".artk/.gitignore");
    }
    const glossaryPath = path.join(rootDir, ".artk/glossary.yml");
    if (!fs.existsSync(glossaryPath) || force) {
      const glossary = {
        terms: [],
        aliases: {}
      };
      fs.writeFileSync(glossaryPath, yaml.stringify(glossary));
      result.created.push(".artk/glossary.yml");
    } else if (skipIfExists) {
      result.skipped.push(".artk/glossary.yml");
    }
    if (includeExample) {
      const examplePath = path.join(rootDir, "journeys/EXAMPLE-001.md");
      if (!fs.existsSync(examplePath) || force) {
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
        fs.writeFileSync(examplePath, exampleJourney);
        result.created.push("journeys/EXAMPLE-001.md");
      } else if (skipIfExists) {
        result.skipped.push("journeys/EXAMPLE-001.md");
      }
    }
    const vscodePath = path.join(rootDir, ".vscode");
    if (!fs.existsSync(vscodePath)) {
      fs.mkdirSync(vscodePath, { recursive: true });
    }
    const settingsPath = path.join(vscodePath, "settings.json");
    if (!fs.existsSync(settingsPath) || force) {
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
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
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
    const configPath = path.join(rootDir, "autogen.config.yml");
    if (!fs.existsSync(configPath)) {
      throw new Error("No autogen.config.yml found. Run install first.");
    }
    const configContent = fs.readFileSync(configPath, "utf-8");
    const config = yaml.parse(configContent);
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
      fs.writeFileSync(backupPath, configContent);
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
      fs.writeFileSync(configPath, yaml.stringify(migrationResult.config));
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
async function generateJourneyTests(options) {
  const {
    journeys,
    isFilePaths = true,
    config,
    generateModules = false,
    testOptions = {},
    moduleOptions = {}
  } = options;
  const result = {
    tests: [],
    modules: [],
    warnings: [],
    errors: []
  };
  let resolvedConfig;
  if (config) {
    if (typeof config === "string") {
      try {
        resolvedConfig = loadConfig(config);
      } catch (err2) {
        result.errors.push(`Failed to load config: ${err2 instanceof Error ? err2.message : String(err2)}`);
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
    const testDir = outputDir || path.join(os.tmpdir(), `autogen-verify-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });
    const testFilePath = path.join(testDir, testResult.filename);
    fs.writeFileSync(testFilePath, testResult.code, "utf-8");
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
    init_validate();
    init_verify();
    init_heal();
    init_install();
    init_upgrade();
    init_parseJourney();
    init_normalize();
    init_generateTest();
    init_generateModule();
    init_loader();
    init_code();
    init_runner();
    init_summary();
    VERSION = "1.0.0";
  }
});

// src/cli/install.ts
var install_exports = {};
__export(install_exports, {
  runInstall: () => runInstall
});
async function runInstall(args) {
  const { values } = util.parseArgs({
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
  const { values } = util.parseArgs({
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

// src/cli/generate.ts
var generate_exports = {};
__export(generate_exports, {
  runGenerate: () => runGenerate
});
async function runGenerate(args) {
  const { values, positionals } = util.parseArgs({
    args,
    options: {
      output: { type: "string", short: "o" },
      modules: { type: "boolean", short: "m", default: false },
      config: { type: "string", short: "c" },
      "dry-run": { type: "boolean", default: false },
      quiet: { type: "boolean", short: "q", default: false },
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
  const outputDir = values.output || "./tests/generated";
  const dryRun = values["dry-run"];
  const quiet = values.quiet;
  const journeyFiles = await fg2__default.default(positionals, {
    absolute: true
  });
  if (journeyFiles.length === 0) {
    console.error("Error: No journey files found matching the patterns");
    process.exit(1);
  }
  if (!quiet) {
    console.log(`Found ${journeyFiles.length} journey file(s)`);
  }
  const options = {
    journeys: journeyFiles,
    isFilePaths: true,
    generateModules: values.modules
  };
  if (values.config) {
    options.config = values.config;
  }
  const result = await generateJourneyTests(options);
  if (result.errors.length > 0) {
    console.error("\nErrors:");
    for (const error of result.errors) {
      console.error(`  - ${error}`);
    }
  }
  if (result.warnings.length > 0 && !quiet) {
    console.warn("\nWarnings:");
    for (const warning of result.warnings) {
      console.warn(`  - ${warning}`);
    }
  }
  if (!dryRun) {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    for (const test of result.tests) {
      const filePath = path.join(outputDir, test.filename);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, test.code, "utf-8");
      if (!quiet) {
        console.log(`Generated: ${filePath}`);
      }
    }
    for (const mod of result.modules) {
      const filePath = path.join(outputDir, "modules", mod.filename);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, mod.code, "utf-8");
      if (!quiet) {
        console.log(`Generated: ${filePath}`);
      }
    }
  } else {
    if (!quiet) {
      console.log("\n[Dry run] Would generate:");
      for (const test of result.tests) {
        console.log(`  - ${path.join(outputDir, test.filename)}`);
      }
      for (const mod of result.modules) {
        console.log(`  - ${path.join(outputDir, "modules", mod.filename)}`);
      }
    }
  }
  if (!quiet) {
    console.log(`
Summary:`);
    console.log(`  Tests: ${result.tests.length}`);
    console.log(`  Modules: ${result.modules.length}`);
    console.log(`  Errors: ${result.errors.length}`);
    console.log(`  Warnings: ${result.warnings.length}`);
  }
  if (result.errors.length > 0) {
    process.exit(1);
  }
}
var USAGE;
var init_generate = __esm({
  "src/cli/generate.ts"() {
    init_index();
    USAGE = `
Usage: artk-autogen generate [options] <journey-files...>

Generate Playwright tests from Journey markdown files.

Arguments:
  journey-files    Journey file paths or glob patterns

Options:
  -o, --output <dir>     Output directory for generated files (default: ./tests/generated)
  -m, --modules          Also generate module files
  -c, --config <file>    Path to autogen config file
  --dry-run              Preview generation without writing files
  -q, --quiet            Suppress output except errors
  -h, --help             Show this help message

Examples:
  artk-autogen generate journeys/login.md
  artk-autogen generate "journeys/*.md" -o tests/e2e -m
  artk-autogen generate journeys/*.md --dry-run
`;
  }
});

// src/cli/validate.ts
var validate_exports = {};
__export(validate_exports, {
  runValidate: () => runValidate
});
async function runValidate(args) {
  const { values, positionals } = util.parseArgs({
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
    console.log(USAGE2);
    return;
  }
  if (positionals.length === 0) {
    console.error("Error: No files specified");
    console.log(USAGE2);
    process.exit(1);
  }
  const files = await fg2__default.default(positionals, {
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
var USAGE2;
var init_validate2 = __esm({
  "src/cli/validate.ts"() {
    init_index();
    USAGE2 = `
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
  const { values, positionals } = util.parseArgs({
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
    console.log(USAGE3);
    return;
  }
  if (positionals.length === 0) {
    console.error("Error: No journey files specified");
    console.log(USAGE3);
    process.exit(1);
  }
  const journeyFiles = await fg2__default.default(positionals, {
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
var USAGE3;
var init_verify2 = __esm({
  "src/cli/verify.ts"() {
    init_index();
    init_parsing();
    USAGE3 = `
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

// src/cli/index.ts
init_index();
var USAGE4 = `
Usage: artk-autogen <command> [options]

Commands:
  install     Install ARTK autogen instance in a project
  upgrade     Upgrade ARTK autogen instance to new version
  generate    Generate Playwright tests from Journey files
  validate    Validate generated test code
  verify      Run and verify generated tests

Options:
  -h, --help      Show this help message
  -v, --version   Show version

Examples:
  artk-autogen install --dir ./my-project
  artk-autogen upgrade --dir ./my-project
  artk-autogen generate journeys/login.md
  artk-autogen validate tests/login.spec.ts
  artk-autogen verify journeys/login.md --heal
`;
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log(USAGE4);
    process.exit(0);
  }
  const command = args[0];
  if (command === "-h" || command === "--help") {
    console.log(USAGE4);
    process.exit(0);
  }
  if (command === "-v" || command === "--version") {
    console.log(`@artk/core-autogen v${VERSION}`);
    process.exit(0);
  }
  const subArgs = args.slice(1);
  try {
    switch (command) {
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
      case "generate": {
        const { runGenerate: runGenerate2 } = await Promise.resolve().then(() => (init_generate(), generate_exports));
        await runGenerate2(subArgs);
        break;
      }
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
      default:
        console.error(`Unknown command: ${command}`);
        console.log(USAGE4);
        process.exit(1);
    }
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
main();
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map