/**
 * Intermediate Representation (IR) Types
 * @see research/2026-01-02_autogen-refined-plan.md Section 9
 *
 * All code generation goes through IR. Prompts never generate Playwright code directly.
 */
/**
 * Locator strategy following Playwright priority
 * role > label > text > testid > css
 */
export type LocatorStrategy = 'role' | 'label' | 'placeholder' | 'text' | 'testid' | 'css';
/**
 * Specification for how to locate an element
 */
export interface LocatorSpec {
    /** Locator strategy to use */
    strategy: LocatorStrategy;
    /** Primary value for the strategy (e.g., role name, label text) */
    value: string;
    /** Additional options for the locator */
    options?: {
        /** Accessible name for role locators */
        name?: string;
        /** Exact match flag */
        exact?: boolean;
        /** Heading level for heading role */
        level?: number;
        /** Whether to use strict mode (fail if multiple matches) */
        strict?: boolean;
    };
}
/**
 * Value specification for inputs and assertions
 */
export interface ValueSpec {
    /** Type of value */
    type: 'literal' | 'actor' | 'runId' | 'generated' | 'testData';
    /** Value content or path */
    value: string;
    /** Optional transform to apply */
    transform?: 'uppercase' | 'lowercase' | 'trim';
}
/**
 * IR Primitive - atomic actions that map to Playwright calls
 */
export type IRPrimitive = {
    type: 'goto';
    url: string;
    waitForLoad?: boolean;
} | {
    type: 'waitForURL';
    pattern: string | RegExp;
} | {
    type: 'waitForResponse';
    urlPattern: string;
} | {
    type: 'waitForLoadingComplete';
    timeout?: number;
} | {
    type: 'click';
    locator: LocatorSpec;
} | {
    type: 'fill';
    locator: LocatorSpec;
    value: ValueSpec;
} | {
    type: 'select';
    locator: LocatorSpec;
    option: string;
} | {
    type: 'check';
    locator: LocatorSpec;
} | {
    type: 'uncheck';
    locator: LocatorSpec;
} | {
    type: 'upload';
    locator: LocatorSpec;
    files: string[];
} | {
    type: 'press';
    key: string;
    locator?: LocatorSpec;
} | {
    type: 'hover';
    locator: LocatorSpec;
} | {
    type: 'focus';
    locator: LocatorSpec;
} | {
    type: 'clear';
    locator: LocatorSpec;
} | {
    type: 'expectVisible';
    locator: LocatorSpec;
    timeout?: number;
} | {
    type: 'expectNotVisible';
    locator: LocatorSpec;
    timeout?: number;
} | {
    type: 'expectHidden';
    locator: LocatorSpec;
    timeout?: number;
} | {
    type: 'expectText';
    locator: LocatorSpec;
    text: string | RegExp;
    timeout?: number;
} | {
    type: 'expectValue';
    locator: LocatorSpec;
    value: string;
    timeout?: number;
} | {
    type: 'expectChecked';
    locator: LocatorSpec;
    checked?: boolean;
} | {
    type: 'expectEnabled';
    locator: LocatorSpec;
} | {
    type: 'expectDisabled';
    locator: LocatorSpec;
} | {
    type: 'expectURL';
    pattern: string | RegExp;
} | {
    type: 'expectTitle';
    title: string | RegExp;
} | {
    type: 'expectCount';
    locator: LocatorSpec;
    count: number;
} | {
    type: 'expectContainsText';
    locator: LocatorSpec;
    text: string;
} | {
    type: 'expectToast';
    toastType: 'success' | 'error' | 'info' | 'warning';
    message?: string;
} | {
    type: 'dismissModal';
} | {
    type: 'acceptAlert';
} | {
    type: 'dismissAlert';
} | {
    type: 'callModule';
    module: string;
    method: string;
    args?: unknown[];
} | {
    type: 'blocked';
    reason: string;
    sourceText: string;
};
/**
 * A single step in the IR Journey
 * Maps to a test.step() in generated code
 */
export interface IRStep {
    /** Step identifier (e.g., 'AC-1', 'AC-2') */
    id: string;
    /** Human-readable description */
    description: string;
    /** Actions to perform (clicks, fills, navigations) */
    actions: IRPrimitive[];
    /** Assertions to verify (expects) */
    assertions: IRPrimitive[];
    /** Original source text from Journey */
    sourceText?: string;
    /** Notes for debugging or TODOs */
    notes?: string[];
}
/**
 * Journey tier classification
 */
export type JourneyTier = 'smoke' | 'release' | 'regression';
/**
 * Data strategy for test data management
 */
export type DataStrategy = 'seed' | 'create' | 'reuse';
/**
 * Cleanup strategy for test data
 */
export type CleanupStrategy = 'required' | 'best-effort' | 'none';
/**
 * Module dependencies for a Journey
 */
export interface ModuleDependencies {
    /** Foundation modules (auth, nav, etc.) */
    foundation: string[];
    /** Feature modules specific to this journey */
    feature: string[];
}
/**
 * Completion signal types
 */
export type CompletionSignalType = 'url' | 'toast' | 'element' | 'text' | 'title' | 'api';
/**
 * Completion signal for journey success
 */
export interface CompletionSignal {
    type: CompletionSignalType;
    value: string;
    options?: {
        timeout?: number;
        exact?: boolean;
        state?: 'visible' | 'hidden' | 'attached' | 'detached';
        method?: string;
        status?: number;
    };
}
/**
 * Data configuration for a journey
 */
export interface JourneyDataConfig {
    strategy: DataStrategy;
    cleanup: CleanupStrategy;
    /** Seed data requirements */
    seeds?: string[];
    /** Test data factory references */
    factories?: string[];
}
/**
 * Negative path definition for error scenario testing
 */
export interface NegativePath {
    /** Name of the negative path scenario */
    name: string;
    /** Input values to trigger the error */
    input: Record<string, unknown>;
    /** Expected error message */
    expectedError: string;
    /** Optional element selector where error should appear */
    expectedElement?: string;
}
/**
 * Visual regression configuration
 */
export interface VisualRegressionConfig {
    enabled: boolean;
    snapshots?: string[];
    threshold?: number;
}
/**
 * Accessibility configuration
 */
export interface AccessibilityConfig {
    enabled: boolean;
    rules?: string[];
    exclude?: string[];
}
/**
 * Performance budgets configuration
 */
export interface PerformanceConfig {
    enabled: boolean;
    budgets?: {
        lcp?: number;
        fid?: number;
        cls?: number;
        ttfb?: number;
    };
}
/**
 * Test data set for parameterized testing
 */
export interface TestDataSet {
    /** Name of the test data set */
    name: string;
    /** Optional description */
    description?: string;
    /** Test data key-value pairs */
    data: Record<string, unknown>;
}
/**
 * Complete IR representation of a Journey
 * This is the canonical format before code generation
 */
export interface IRJourney {
    /** Journey ID (e.g., 'JRN-0001') */
    id: string;
    /** Human-readable title */
    title: string;
    /** Tier classification */
    tier: JourneyTier;
    /** Scope/area (e.g., 'billing', 'auth') */
    scope: string;
    /** Actor performing the journey */
    actor: string;
    /** Tags for filtering and organization */
    tags: string[];
    /** Module dependencies */
    moduleDependencies: ModuleDependencies;
    /** Data configuration */
    data?: JourneyDataConfig;
    /** Completion signals */
    completion?: CompletionSignal[];
    /** Setup steps (before main journey) */
    setup?: IRPrimitive[];
    /** Main journey steps */
    steps: IRStep[];
    /** Cleanup steps (after main journey) */
    cleanup?: IRPrimitive[];
    /** Journey revision number */
    revision?: number;
    /** Source file path */
    sourcePath?: string;
    /** Prerequisites - Journey IDs that must run first */
    prerequisites?: string[];
    /** Negative paths - Error scenarios to test */
    negativePaths?: NegativePath[];
    /** Test data sets for parameterized testing */
    testData?: TestDataSet[];
    /** Visual regression configuration */
    visualRegression?: VisualRegressionConfig;
    /** Accessibility configuration */
    accessibility?: AccessibilityConfig;
    /** Performance configuration */
    performance?: PerformanceConfig;
}
/**
 * Result of mapping a journey to IR
 */
export interface IRMappingResult {
    /** The mapped IR Journey */
    journey: IRJourney;
    /** Steps that could not be fully mapped */
    blockedSteps: Array<{
        stepId: string;
        sourceText: string;
        reason: string;
    }>;
    /** Warnings during mapping */
    warnings: string[];
    /** Mapping statistics */
    stats: {
        totalSteps: number;
        mappedSteps: number;
        blockedSteps: number;
        totalActions: number;
        totalAssertions: number;
    };
}
//# sourceMappingURL=types.d.ts.map