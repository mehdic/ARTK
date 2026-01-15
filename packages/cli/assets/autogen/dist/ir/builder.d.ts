/**
 * IR Builder - Fluent API for constructing IR structures
 * @see research/2026-01-02_autogen-refined-plan.md Section 9
 */
import type { IRJourney, IRStep, IRPrimitive, LocatorSpec, ValueSpec, JourneyTier, ModuleDependencies, CompletionSignal, JourneyDataConfig, LocatorStrategy } from './types.js';
/**
 * Builder for constructing LocatorSpec
 */
export declare class LocatorBuilder {
    private spec;
    static role(role: string, name?: string): LocatorBuilder;
    static label(label: string): LocatorBuilder;
    static placeholder(placeholder: string): LocatorBuilder;
    static text(text: string): LocatorBuilder;
    static testId(testId: string): LocatorBuilder;
    static css(selector: string): LocatorBuilder;
    static fromSpec(strategy: LocatorStrategy, value: string): LocatorBuilder;
    exact(exact?: boolean): LocatorBuilder;
    level(level: number): LocatorBuilder;
    strict(strict?: boolean): LocatorBuilder;
    name(name: string): LocatorBuilder;
    build(): LocatorSpec;
}
/**
 * Builder for constructing ValueSpec
 */
export declare class ValueBuilder {
    static literal(value: string): ValueSpec;
    static actor(path: string): ValueSpec;
    static runId(): ValueSpec;
    static generated(template: string): ValueSpec;
    static testData(path: string): ValueSpec;
}
/**
 * Builder for constructing IRStep
 */
export declare class StepBuilder {
    private step;
    constructor(id: string, description: string);
    sourceText(text: string): StepBuilder;
    note(note: string): StepBuilder;
    goto(url: string, waitForLoad?: boolean): StepBuilder;
    waitForURL(pattern: string | RegExp): StepBuilder;
    click(locator: LocatorSpec | LocatorBuilder): StepBuilder;
    fill(locator: LocatorSpec | LocatorBuilder, value: ValueSpec | string): StepBuilder;
    select(locator: LocatorSpec | LocatorBuilder, option: string): StepBuilder;
    check(locator: LocatorSpec | LocatorBuilder): StepBuilder;
    press(key: string, locator?: LocatorSpec | LocatorBuilder): StepBuilder;
    expectVisible(locator: LocatorSpec | LocatorBuilder, timeout?: number): StepBuilder;
    expectNotVisible(locator: LocatorSpec | LocatorBuilder, timeout?: number): StepBuilder;
    expectText(locator: LocatorSpec | LocatorBuilder, text: string | RegExp, timeout?: number): StepBuilder;
    expectURL(pattern: string | RegExp): StepBuilder;
    expectTitle(title: string | RegExp): StepBuilder;
    expectToast(toastType: 'success' | 'error' | 'info' | 'warning', message?: string): StepBuilder;
    callModule(module: string, method: string, args?: unknown[]): StepBuilder;
    blocked(reason: string, sourceText: string): StepBuilder;
    action(primitive: IRPrimitive): StepBuilder;
    assertion(primitive: IRPrimitive): StepBuilder;
    build(): IRStep;
}
/**
 * Builder for constructing IRJourney
 */
export declare class JourneyBuilder {
    private journey;
    constructor(id: string, title: string);
    tier(tier: JourneyTier): JourneyBuilder;
    scope(scope: string): JourneyBuilder;
    actor(actor: string): JourneyBuilder;
    tag(tag: string): JourneyBuilder;
    tags(tags: string[]): JourneyBuilder;
    foundationModule(module: string): JourneyBuilder;
    featureModule(module: string): JourneyBuilder;
    modules(deps: ModuleDependencies): JourneyBuilder;
    data(config: JourneyDataConfig): JourneyBuilder;
    completion(signals: CompletionSignal[]): JourneyBuilder;
    setup(primitives: IRPrimitive[]): JourneyBuilder;
    step(step: IRStep | StepBuilder): JourneyBuilder;
    cleanup(primitives: IRPrimitive[]): JourneyBuilder;
    revision(rev: number): JourneyBuilder;
    sourcePath(path: string): JourneyBuilder;
    build(): IRJourney;
}
/**
 * Convenience factory functions
 */
export declare const IR: {
    journey: (id: string, title: string) => JourneyBuilder;
    step: (id: string, description: string) => StepBuilder;
    locator: {
        role: typeof LocatorBuilder.role;
        label: typeof LocatorBuilder.label;
        placeholder: typeof LocatorBuilder.placeholder;
        text: typeof LocatorBuilder.text;
        testId: typeof LocatorBuilder.testId;
        css: typeof LocatorBuilder.css;
    };
    value: typeof ValueBuilder;
};
//# sourceMappingURL=builder.d.ts.map