/**
 * IR Builder - Fluent API for constructing IR structures
 * @see research/2026-01-02_autogen-refined-plan.md Section 9
 */
import type {
  IRJourney,
  IRStep,
  IRPrimitive,
  LocatorSpec,
  ValueSpec,
  JourneyTier,
  ModuleDependencies,
  CompletionSignal,
  JourneyDataConfig,
  LocatorStrategy,
} from './types.js';

/**
 * Builder for constructing LocatorSpec
 */
export class LocatorBuilder {
  private spec: Partial<LocatorSpec> = {};

  static role(role: string, name?: string): LocatorBuilder {
    const builder = new LocatorBuilder();
    builder.spec.strategy = 'role';
    builder.spec.value = role;
    if (name) {
      builder.spec.options = { ...builder.spec.options, name };
    }
    return builder;
  }

  static label(label: string): LocatorBuilder {
    const builder = new LocatorBuilder();
    builder.spec.strategy = 'label';
    builder.spec.value = label;
    return builder;
  }

  static placeholder(placeholder: string): LocatorBuilder {
    const builder = new LocatorBuilder();
    builder.spec.strategy = 'placeholder';
    builder.spec.value = placeholder;
    return builder;
  }

  static text(text: string): LocatorBuilder {
    const builder = new LocatorBuilder();
    builder.spec.strategy = 'text';
    builder.spec.value = text;
    return builder;
  }

  static testId(testId: string): LocatorBuilder {
    const builder = new LocatorBuilder();
    builder.spec.strategy = 'testid';
    builder.spec.value = testId;
    return builder;
  }

  static css(selector: string): LocatorBuilder {
    const builder = new LocatorBuilder();
    builder.spec.strategy = 'css';
    builder.spec.value = selector;
    return builder;
  }

  static fromSpec(strategy: LocatorStrategy, value: string): LocatorBuilder {
    const builder = new LocatorBuilder();
    builder.spec.strategy = strategy;
    builder.spec.value = value;
    return builder;
  }

  exact(exact = true): LocatorBuilder {
    this.spec.options = { ...this.spec.options, exact };
    return this;
  }

  level(level: number): LocatorBuilder {
    this.spec.options = { ...this.spec.options, level };
    return this;
  }

  strict(strict = true): LocatorBuilder {
    this.spec.options = { ...this.spec.options, strict };
    return this;
  }

  name(name: string): LocatorBuilder {
    this.spec.options = { ...this.spec.options, name };
    return this;
  }

  build(): LocatorSpec {
    if (!this.spec.strategy || !this.spec.value) {
      throw new Error('LocatorSpec requires strategy and value');
    }
    return this.spec as LocatorSpec;
  }
}

/**
 * Builder for constructing ValueSpec
 */
export class ValueBuilder {
  static literal(value: string): ValueSpec {
    return { type: 'literal', value };
  }

  static actor(path: string): ValueSpec {
    return { type: 'actor', value: path };
  }

  static runId(): ValueSpec {
    return { type: 'runId', value: 'runId' };
  }

  static generated(template: string): ValueSpec {
    return { type: 'generated', value: template };
  }

  static testData(path: string): ValueSpec {
    return { type: 'testData', value: path };
  }
}

/**
 * Builder for constructing IRStep
 */
export class StepBuilder {
  private step: Partial<IRStep> = {
    actions: [],
    assertions: [],
    notes: [],
  };

  constructor(id: string, description: string) {
    this.step.id = id;
    this.step.description = description;
  }

  sourceText(text: string): StepBuilder {
    this.step.sourceText = text;
    return this;
  }

  note(note: string): StepBuilder {
    this.step.notes!.push(note);
    return this;
  }

  // Navigation actions
  goto(url: string, waitForLoad = true): StepBuilder {
    this.step.actions!.push({ type: 'goto', url, waitForLoad });
    return this;
  }

  waitForURL(pattern: string | RegExp): StepBuilder {
    this.step.actions!.push({ type: 'waitForURL', pattern });
    return this;
  }

  // Interaction actions
  click(locator: LocatorSpec | LocatorBuilder): StepBuilder {
    const spec = locator instanceof LocatorBuilder ? locator.build() : locator;
    this.step.actions!.push({ type: 'click', locator: spec });
    return this;
  }

  fill(locator: LocatorSpec | LocatorBuilder, value: ValueSpec | string): StepBuilder {
    const spec = locator instanceof LocatorBuilder ? locator.build() : locator;
    const valueSpec = typeof value === 'string' ? ValueBuilder.literal(value) : value;
    this.step.actions!.push({ type: 'fill', locator: spec, value: valueSpec });
    return this;
  }

  select(locator: LocatorSpec | LocatorBuilder, option: string): StepBuilder {
    const spec = locator instanceof LocatorBuilder ? locator.build() : locator;
    this.step.actions!.push({ type: 'select', locator: spec, option });
    return this;
  }

  check(locator: LocatorSpec | LocatorBuilder): StepBuilder {
    const spec = locator instanceof LocatorBuilder ? locator.build() : locator;
    this.step.actions!.push({ type: 'check', locator: spec });
    return this;
  }

  press(key: string, locator?: LocatorSpec | LocatorBuilder): StepBuilder {
    const spec = locator
      ? locator instanceof LocatorBuilder
        ? locator.build()
        : locator
      : undefined;
    this.step.actions!.push({ type: 'press', key, locator: spec });
    return this;
  }

  // Assertions
  expectVisible(
    locator: LocatorSpec | LocatorBuilder,
    timeout?: number
  ): StepBuilder {
    const spec = locator instanceof LocatorBuilder ? locator.build() : locator;
    this.step.assertions!.push({ type: 'expectVisible', locator: spec, timeout });
    return this;
  }

  expectNotVisible(
    locator: LocatorSpec | LocatorBuilder,
    timeout?: number
  ): StepBuilder {
    const spec = locator instanceof LocatorBuilder ? locator.build() : locator;
    this.step.assertions!.push({ type: 'expectNotVisible', locator: spec, timeout });
    return this;
  }

  expectText(
    locator: LocatorSpec | LocatorBuilder,
    text: string | RegExp,
    timeout?: number
  ): StepBuilder {
    const spec = locator instanceof LocatorBuilder ? locator.build() : locator;
    this.step.assertions!.push({ type: 'expectText', locator: spec, text, timeout });
    return this;
  }

  expectURL(pattern: string | RegExp): StepBuilder {
    this.step.assertions!.push({ type: 'expectURL', pattern });
    return this;
  }

  expectTitle(title: string | RegExp): StepBuilder {
    this.step.assertions!.push({ type: 'expectTitle', title });
    return this;
  }

  expectToast(
    toastType: 'success' | 'error' | 'info' | 'warning',
    message?: string
  ): StepBuilder {
    this.step.assertions!.push({ type: 'expectToast', toastType, message });
    return this;
  }

  // Module calls
  callModule(module: string, method: string, args?: unknown[]): StepBuilder {
    this.step.actions!.push({ type: 'callModule', module, method, args });
    return this;
  }

  // Blocked step
  blocked(reason: string, sourceText: string): StepBuilder {
    this.step.actions!.push({ type: 'blocked', reason, sourceText });
    return this;
  }

  // Raw primitive
  action(primitive: IRPrimitive): StepBuilder {
    this.step.actions!.push(primitive);
    return this;
  }

  assertion(primitive: IRPrimitive): StepBuilder {
    this.step.assertions!.push(primitive);
    return this;
  }

  build(): IRStep {
    if (!this.step.id || !this.step.description) {
      throw new Error('IRStep requires id and description');
    }
    return this.step as IRStep;
  }
}

/**
 * Builder for constructing IRJourney
 */
export class JourneyBuilder {
  private journey: Partial<IRJourney> = {
    tags: [],
    steps: [],
    moduleDependencies: { foundation: [], feature: [] },
  };

  constructor(id: string, title: string) {
    this.journey.id = id;
    this.journey.title = title;
  }

  tier(tier: JourneyTier): JourneyBuilder {
    this.journey.tier = tier;
    return this;
  }

  scope(scope: string): JourneyBuilder {
    this.journey.scope = scope;
    return this;
  }

  actor(actor: string): JourneyBuilder {
    this.journey.actor = actor;
    return this;
  }

  tag(tag: string): JourneyBuilder {
    this.journey.tags!.push(tag);
    return this;
  }

  tags(tags: string[]): JourneyBuilder {
    this.journey.tags!.push(...tags);
    return this;
  }

  foundationModule(module: string): JourneyBuilder {
    this.journey.moduleDependencies!.foundation.push(module);
    return this;
  }

  featureModule(module: string): JourneyBuilder {
    this.journey.moduleDependencies!.feature.push(module);
    return this;
  }

  modules(deps: ModuleDependencies): JourneyBuilder {
    this.journey.moduleDependencies = deps;
    return this;
  }

  data(config: JourneyDataConfig): JourneyBuilder {
    this.journey.data = config;
    return this;
  }

  completion(signals: CompletionSignal[]): JourneyBuilder {
    this.journey.completion = signals;
    return this;
  }

  setup(primitives: IRPrimitive[]): JourneyBuilder {
    this.journey.setup = primitives;
    return this;
  }

  step(step: IRStep | StepBuilder): JourneyBuilder {
    const builtStep = step instanceof StepBuilder ? step.build() : step;
    this.journey.steps!.push(builtStep);
    return this;
  }

  cleanup(primitives: IRPrimitive[]): JourneyBuilder {
    this.journey.cleanup = primitives;
    return this;
  }

  revision(rev: number): JourneyBuilder {
    this.journey.revision = rev;
    return this;
  }

  sourcePath(path: string): JourneyBuilder {
    this.journey.sourcePath = path;
    return this;
  }

  build(): IRJourney {
    if (
      !this.journey.id ||
      !this.journey.title ||
      !this.journey.tier ||
      !this.journey.scope ||
      !this.journey.actor
    ) {
      throw new Error('IRJourney requires id, title, tier, scope, and actor');
    }

    // Add standard tags
    const standardTags = [
      '@artk',
      '@journey',
      `@${this.journey.id}`,
      `@tier-${this.journey.tier}`,
      `@scope-${this.journey.scope}`,
    ];

    const allTags = [...new Set([...standardTags, ...this.journey.tags!])];
    this.journey.tags = allTags;

    return this.journey as IRJourney;
  }
}

/**
 * Convenience factory functions
 */
export const IR = {
  journey: (id: string, title: string) => new JourneyBuilder(id, title),
  step: (id: string, description: string) => new StepBuilder(id, description),
  locator: {
    role: LocatorBuilder.role,
    label: LocatorBuilder.label,
    placeholder: LocatorBuilder.placeholder,
    text: LocatorBuilder.text,
    testId: LocatorBuilder.testId,
    css: LocatorBuilder.css,
  },
  value: ValueBuilder,
};
