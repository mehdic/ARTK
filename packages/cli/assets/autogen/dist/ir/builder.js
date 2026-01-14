/**
 * Builder for constructing LocatorSpec
 */
export class LocatorBuilder {
    spec = {};
    static role(role, name) {
        const builder = new LocatorBuilder();
        builder.spec.strategy = 'role';
        builder.spec.value = role;
        if (name) {
            builder.spec.options = { ...builder.spec.options, name };
        }
        return builder;
    }
    static label(label) {
        const builder = new LocatorBuilder();
        builder.spec.strategy = 'label';
        builder.spec.value = label;
        return builder;
    }
    static placeholder(placeholder) {
        const builder = new LocatorBuilder();
        builder.spec.strategy = 'placeholder';
        builder.spec.value = placeholder;
        return builder;
    }
    static text(text) {
        const builder = new LocatorBuilder();
        builder.spec.strategy = 'text';
        builder.spec.value = text;
        return builder;
    }
    static testId(testId) {
        const builder = new LocatorBuilder();
        builder.spec.strategy = 'testid';
        builder.spec.value = testId;
        return builder;
    }
    static css(selector) {
        const builder = new LocatorBuilder();
        builder.spec.strategy = 'css';
        builder.spec.value = selector;
        return builder;
    }
    static fromSpec(strategy, value) {
        const builder = new LocatorBuilder();
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
            throw new Error('LocatorSpec requires strategy and value');
        }
        return this.spec;
    }
}
/**
 * Builder for constructing ValueSpec
 */
export class ValueBuilder {
    static literal(value) {
        return { type: 'literal', value };
    }
    static actor(path) {
        return { type: 'actor', value: path };
    }
    static runId() {
        return { type: 'runId', value: 'runId' };
    }
    static generated(template) {
        return { type: 'generated', value: template };
    }
    static testData(path) {
        return { type: 'testData', value: path };
    }
}
/**
 * Builder for constructing IRStep
 */
export class StepBuilder {
    step = {
        actions: [],
        assertions: [],
        notes: [],
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
        this.step.actions.push({ type: 'goto', url, waitForLoad });
        return this;
    }
    waitForURL(pattern) {
        this.step.actions.push({ type: 'waitForURL', pattern });
        return this;
    }
    // Interaction actions
    click(locator) {
        const spec = locator instanceof LocatorBuilder ? locator.build() : locator;
        this.step.actions.push({ type: 'click', locator: spec });
        return this;
    }
    fill(locator, value) {
        const spec = locator instanceof LocatorBuilder ? locator.build() : locator;
        const valueSpec = typeof value === 'string' ? ValueBuilder.literal(value) : value;
        this.step.actions.push({ type: 'fill', locator: spec, value: valueSpec });
        return this;
    }
    select(locator, option) {
        const spec = locator instanceof LocatorBuilder ? locator.build() : locator;
        this.step.actions.push({ type: 'select', locator: spec, option });
        return this;
    }
    check(locator) {
        const spec = locator instanceof LocatorBuilder ? locator.build() : locator;
        this.step.actions.push({ type: 'check', locator: spec });
        return this;
    }
    press(key, locator) {
        const spec = locator
            ? locator instanceof LocatorBuilder
                ? locator.build()
                : locator
            : undefined;
        this.step.actions.push({ type: 'press', key, locator: spec });
        return this;
    }
    // Assertions
    expectVisible(locator, timeout) {
        const spec = locator instanceof LocatorBuilder ? locator.build() : locator;
        this.step.assertions.push({ type: 'expectVisible', locator: spec, timeout });
        return this;
    }
    expectNotVisible(locator, timeout) {
        const spec = locator instanceof LocatorBuilder ? locator.build() : locator;
        this.step.assertions.push({ type: 'expectNotVisible', locator: spec, timeout });
        return this;
    }
    expectText(locator, text, timeout) {
        const spec = locator instanceof LocatorBuilder ? locator.build() : locator;
        this.step.assertions.push({ type: 'expectText', locator: spec, text, timeout });
        return this;
    }
    expectURL(pattern) {
        this.step.assertions.push({ type: 'expectURL', pattern });
        return this;
    }
    expectTitle(title) {
        this.step.assertions.push({ type: 'expectTitle', title });
        return this;
    }
    expectToast(toastType, message) {
        this.step.assertions.push({ type: 'expectToast', toastType, message });
        return this;
    }
    // Module calls
    callModule(module, method, args) {
        this.step.actions.push({ type: 'callModule', module, method, args });
        return this;
    }
    // Blocked step
    blocked(reason, sourceText) {
        this.step.actions.push({ type: 'blocked', reason, sourceText });
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
            throw new Error('IRStep requires id and description');
        }
        return this.step;
    }
}
/**
 * Builder for constructing IRJourney
 */
export class JourneyBuilder {
    journey = {
        tags: [],
        steps: [],
        moduleDependencies: { foundation: [], feature: [] },
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
        if (!this.journey.id ||
            !this.journey.title ||
            !this.journey.tier ||
            !this.journey.scope ||
            !this.journey.actor) {
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
        const allTags = [...new Set([...standardTags, ...this.journey.tags])];
        this.journey.tags = allTags;
        return this.journey;
    }
}
/**
 * Convenience factory functions
 */
export const IR = {
    journey: (id, title) => new JourneyBuilder(id, title),
    step: (id, description) => new StepBuilder(id, description),
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
//# sourceMappingURL=builder.js.map