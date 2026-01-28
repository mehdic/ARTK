import { h as JourneyTier, M as ModuleDependencies, J as JourneyDataConfig, C as CompletionSignal, I as IRPrimitive, c as IRStep, b as LocatorSpec, L as LocatorStrategy, V as ValueSpec, d as IRJourney } from '../types-CBcw78BQ.js';
export { A as AccessibilityConfig, e as AccessibilityTiming, f as CleanupStrategy, g as CompletionSignalType, D as DataStrategy, a as IRMappingResult, N as NegativePath, P as PerformanceConfig, T as TestDataSet, i as VisualRegressionConfig } from '../types-CBcw78BQ.js';

/**
 * IR Builder - Fluent API for constructing IR structures
 * @see research/2026-01-02_autogen-refined-plan.md Section 9
 */

/**
 * Builder for constructing LocatorSpec
 */
declare class LocatorBuilder {
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
declare class ValueBuilder {
    static literal(value: string): ValueSpec;
    static actor(path: string): ValueSpec;
    static runId(): ValueSpec;
    static generated(template: string): ValueSpec;
    static testData(path: string): ValueSpec;
}
/**
 * Builder for constructing IRStep
 */
declare class StepBuilder {
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
declare class JourneyBuilder {
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
declare const IR: {
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

/**
 * IR Serializer - Convert IR to JSON for debugging and analysis
 * @see research/2026-01-02_autogen-refined-plan.md Section 9
 */

/**
 * Options for IR serialization
 */
interface SerializeOptions {
    /** Include null/undefined values */
    includeEmpty?: boolean;
    /** Pretty print with indentation */
    pretty?: boolean;
    /** Indent size for pretty printing */
    indent?: number;
}
/**
 * Serialize an IR Journey to JSON string
 */
declare function serializeJourney(journey: IRJourney, options?: SerializeOptions): string;
/**
 * Serialize an IR Step to JSON string
 */
declare function serializeStep(step: IRStep, options?: SerializeOptions): string;
/**
 * Serialize an IR Primitive to JSON string
 */
declare function serializePrimitive(primitive: IRPrimitive, options?: SerializeOptions): string;
/**
 * Convert a LocatorSpec to a human-readable description
 */
declare function describeLocator(locator: LocatorSpec): string;
/**
 * Convert an IR Primitive to a human-readable description
 */
declare function describePrimitive(primitive: IRPrimitive): string;
/**
 * Generate a summary of an IR Journey
 */
declare function summarizeJourney(journey: IRJourney): string;

export { CompletionSignal, IR, IRJourney, IRPrimitive, IRStep, JourneyBuilder, JourneyDataConfig, JourneyTier, LocatorBuilder, LocatorSpec, LocatorStrategy, ModuleDependencies, type SerializeOptions, StepBuilder, ValueBuilder, ValueSpec, describeLocator, describePrimitive, serializeJourney, serializePrimitive, serializeStep, summarizeJourney };
