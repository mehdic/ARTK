'use strict';

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/ir/builder.ts
var LocatorBuilder = class _LocatorBuilder {
  constructor() {
    __publicField(this, "spec", {});
  }
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
var ValueBuilder = class {
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
var StepBuilder = class {
  constructor(id, description) {
    __publicField(this, "step", {
      actions: [],
      assertions: [],
      notes: []
    });
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
var JourneyBuilder = class {
  constructor(id, title) {
    __publicField(this, "journey", {
      tags: [],
      steps: [],
      moduleDependencies: { foundation: [], feature: [] }
    });
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
var IR = {
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
};

// src/ir/serialize.ts
function serializeJourney(journey, options = {}) {
  const { pretty = true, indent = 2 } = options;
  const cleaned = cleanObject(journey, options.includeEmpty ?? false);
  return pretty ? JSON.stringify(cleaned, null, indent) : JSON.stringify(cleaned);
}
function serializeStep(step, options = {}) {
  const { pretty = true, indent = 2 } = options;
  const cleaned = cleanObject(step, options.includeEmpty ?? false);
  return pretty ? JSON.stringify(cleaned, null, indent) : JSON.stringify(cleaned);
}
function serializePrimitive(primitive, options = {}) {
  const { pretty = true, indent = 2 } = options;
  const cleaned = cleanObject(primitive, options.includeEmpty ?? false);
  return pretty ? JSON.stringify(cleaned, null, indent) : JSON.stringify(cleaned);
}
function describeLocator(locator) {
  const { strategy, value, options } = locator;
  switch (strategy) {
    case "role": {
      let desc = `getByRole('${value}'`;
      if (options?.name) {
        desc += `, { name: '${options.name}'`;
        if (options.exact) desc += ", exact: true";
        if (options.level) desc += `, level: ${options.level}`;
        desc += " }";
      }
      desc += ")";
      return desc;
    }
    case "label":
      return `getByLabel('${value}'${options?.exact ? ", { exact: true }" : ""})`;
    case "placeholder":
      return `getByPlaceholder('${value}'${options?.exact ? ", { exact: true }" : ""})`;
    case "text":
      return `getByText('${value}'${options?.exact ? ", { exact: true }" : ""})`;
    case "testid":
      return `getByTestId('${value}')`;
    case "css":
      return `locator('${value}')`;
    default:
      return `unknown('${value}')`;
  }
}
function describePrimitive(primitive) {
  switch (primitive.type) {
    case "goto":
      return `Navigate to ${primitive.url}`;
    case "click":
      return `Click ${describeLocator(primitive.locator)}`;
    case "fill":
      return `Fill ${describeLocator(primitive.locator)} with "${primitive.value.value}"`;
    case "select":
      return `Select "${primitive.option}" in ${describeLocator(primitive.locator)}`;
    case "check":
      return `Check ${describeLocator(primitive.locator)}`;
    case "uncheck":
      return `Uncheck ${describeLocator(primitive.locator)}`;
    case "press":
      return `Press "${primitive.key}"`;
    case "hover":
      return `Hover ${describeLocator(primitive.locator)}`;
    case "expectVisible":
      return `Expect ${describeLocator(primitive.locator)} to be visible`;
    case "expectNotVisible":
      return `Expect ${describeLocator(primitive.locator)} to be hidden`;
    case "expectText":
      return `Expect ${describeLocator(primitive.locator)} to have text "${primitive.text}"`;
    case "expectURL":
      return `Expect URL to match ${primitive.pattern}`;
    case "expectTitle":
      return `Expect title to be "${primitive.title}"`;
    case "expectToast":
      return `Expect ${primitive.toastType} toast${primitive.message ? `: "${primitive.message}"` : ""}`;
    case "callModule":
      return `Call ${primitive.module}.${primitive.method}()`;
    case "blocked":
      return `BLOCKED: ${primitive.reason}`;
    case "waitForURL":
      return `Wait for URL to match ${primitive.pattern}`;
    case "waitForResponse":
      return `Wait for response matching ${primitive.urlPattern}`;
    case "waitForLoadingComplete":
      return `Wait for loading to complete`;
    default:
      return `Unknown primitive: ${primitive.type}`;
  }
}
function summarizeJourney(journey) {
  const lines = [
    `Journey: ${journey.id} - ${journey.title}`,
    `  Tier: ${journey.tier}`,
    `  Scope: ${journey.scope}`,
    `  Actor: ${journey.actor}`,
    `  Tags: ${journey.tags.join(", ")}`,
    "",
    `  Steps (${journey.steps.length}):`
  ];
  for (const step of journey.steps) {
    lines.push(`    ${step.id}: ${step.description}`);
    lines.push(`      Actions: ${step.actions.length}`);
    lines.push(`      Assertions: ${step.assertions.length}`);
  }
  if (journey.moduleDependencies.foundation.length > 0) {
    lines.push("");
    lines.push(`  Foundation Modules: ${journey.moduleDependencies.foundation.join(", ")}`);
  }
  if (journey.moduleDependencies.feature.length > 0) {
    lines.push(`  Feature Modules: ${journey.moduleDependencies.feature.join(", ")}`);
  }
  return lines.join("\n");
}
function cleanObject(obj, includeEmpty) {
  if (obj === null || obj === void 0) {
    return includeEmpty ? obj : void 0;
  }
  if (Array.isArray(obj)) {
    const cleaned = obj.map((item) => cleanObject(item, includeEmpty)).filter((item) => includeEmpty || item !== void 0);
    return cleaned.length > 0 || includeEmpty ? cleaned : void 0;
  }
  if (typeof obj === "object") {
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      const cleanedValue = cleanObject(value, includeEmpty);
      if (includeEmpty || cleanedValue !== void 0) {
        cleaned[key] = cleanedValue;
      }
    }
    return Object.keys(cleaned).length > 0 || includeEmpty ? cleaned : void 0;
  }
  return obj;
}

exports.IR = IR;
exports.JourneyBuilder = JourneyBuilder;
exports.LocatorBuilder = LocatorBuilder;
exports.StepBuilder = StepBuilder;
exports.ValueBuilder = ValueBuilder;
exports.describeLocator = describeLocator;
exports.describePrimitive = describePrimitive;
exports.serializeJourney = serializeJourney;
exports.serializePrimitive = serializePrimitive;
exports.serializeStep = serializeStep;
exports.summarizeJourney = summarizeJourney;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map