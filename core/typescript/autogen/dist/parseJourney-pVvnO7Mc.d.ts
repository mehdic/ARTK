import { z } from 'zod';

/**
 * Journey Frontmatter Zod Schema
 * @see research/2026-01-02_autogen-refined-plan.md Section 8
 */

/**
 * Journey status enum
 */
declare const JourneyStatusSchema: z.ZodEnum<["proposed", "defined", "clarified", "implemented", "quarantined", "deprecated"]>;
/**
 * Journey tier enum
 */
declare const JourneyTierSchema: z.ZodEnum<["smoke", "release", "regression"]>;
/**
 * Data strategy enum
 */
declare const DataStrategySchema: z.ZodEnum<["seed", "create", "reuse"]>;
/**
 * Cleanup strategy enum
 */
declare const CleanupStrategySchema: z.ZodEnum<["required", "best-effort", "none"]>;
/**
 * Completion signal type enum
 */
declare const CompletionTypeSchema: z.ZodEnum<["url", "toast", "element", "text", "title", "api"]>;
/**
 * Element state enum for completion signals
 */
declare const ElementStateSchema: z.ZodEnum<["visible", "hidden", "attached", "detached"]>;
/**
 * Completion signal schema
 */
declare const CompletionSignalSchema: z.ZodObject<{
    type: z.ZodEnum<["url", "toast", "element", "text", "title", "api"]>;
    value: z.ZodString;
    options: z.ZodOptional<z.ZodObject<{
        timeout: z.ZodOptional<z.ZodNumber>;
        exact: z.ZodOptional<z.ZodBoolean>;
        state: z.ZodOptional<z.ZodEnum<["visible", "hidden", "attached", "detached"]>>;
        method: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        exact?: boolean | undefined;
        status?: number | undefined;
        timeout?: number | undefined;
        state?: "visible" | "hidden" | "attached" | "detached" | undefined;
        method?: string | undefined;
    }, {
        exact?: boolean | undefined;
        status?: number | undefined;
        timeout?: number | undefined;
        state?: "visible" | "hidden" | "attached" | "detached" | undefined;
        method?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    value: string;
    type: "text" | "title" | "url" | "toast" | "element" | "api";
    options?: {
        exact?: boolean | undefined;
        status?: number | undefined;
        timeout?: number | undefined;
        state?: "visible" | "hidden" | "attached" | "detached" | undefined;
        method?: string | undefined;
    } | undefined;
}, {
    value: string;
    type: "text" | "title" | "url" | "toast" | "element" | "api";
    options?: {
        exact?: boolean | undefined;
        status?: number | undefined;
        timeout?: number | undefined;
        state?: "visible" | "hidden" | "attached" | "detached" | undefined;
        method?: string | undefined;
    } | undefined;
}>;
/**
 * Data configuration schema
 */
declare const DataConfigSchema: z.ZodObject<{
    strategy: z.ZodDefault<z.ZodEnum<["seed", "create", "reuse"]>>;
    cleanup: z.ZodDefault<z.ZodEnum<["required", "best-effort", "none"]>>;
}, "strip", z.ZodTypeAny, {
    strategy: "seed" | "create" | "reuse";
    cleanup: "required" | "best-effort" | "none";
}, {
    strategy?: "seed" | "create" | "reuse" | undefined;
    cleanup?: "required" | "best-effort" | "none" | undefined;
}>;
/**
 * Module dependencies schema
 */
declare const ModulesSchema: z.ZodObject<{
    foundation: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    features: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    foundation: string[];
    features: string[];
}, {
    foundation?: string[] | undefined;
    features?: string[] | undefined;
}>;
/**
 * Test reference schema
 */
declare const TestRefSchema: z.ZodObject<{
    file: z.ZodString;
    line: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    file: string;
    line?: number | undefined;
}, {
    file: string;
    line?: number | undefined;
}>;
/**
 * Link schema
 */
declare const LinksSchema: z.ZodObject<{
    issues: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    prs: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    docs: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    issues?: string[] | undefined;
    prs?: string[] | undefined;
    docs?: string[] | undefined;
}, {
    issues?: string[] | undefined;
    prs?: string[] | undefined;
    docs?: string[] | undefined;
}>;
/**
 * Negative path schema for error scenario testing
 */
declare const NegativePathSchema: z.ZodObject<{
    name: z.ZodString;
    input: z.ZodRecord<z.ZodString, z.ZodAny>;
    expectedError: z.ZodString;
    expectedElement: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    input: Record<string, any>;
    expectedError: string;
    expectedElement?: string | undefined;
}, {
    name: string;
    input: Record<string, any>;
    expectedError: string;
    expectedElement?: string | undefined;
}>;
/**
 * Visual regression configuration schema
 */
declare const VisualRegressionSchema: z.ZodObject<{
    enabled: z.ZodBoolean;
    snapshots: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    threshold: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    enabled: boolean;
    snapshots?: string[] | undefined;
    threshold?: number | undefined;
}, {
    enabled: boolean;
    snapshots?: string[] | undefined;
    threshold?: number | undefined;
}>;
/**
 * Accessibility timing mode enum
 */
declare const AccessibilityTimingSchema: z.ZodEnum<["afterEach", "inTest"]>;
/**
 * Accessibility configuration schema
 */
declare const AccessibilitySchema: z.ZodObject<{
    enabled: z.ZodBoolean;
    rules: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    exclude: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    /**
     * When to run accessibility checks:
     * - 'afterEach': Run after each test (default, catches issues but doesn't fail individual tests)
     * - 'inTest': Run within test steps (fails immediately, better for CI)
     */
    timing: z.ZodDefault<z.ZodEnum<["afterEach", "inTest"]>>;
}, "strip", z.ZodTypeAny, {
    enabled: boolean;
    timing: "afterEach" | "inTest";
    exclude?: string[] | undefined;
    rules?: string[] | undefined;
}, {
    enabled: boolean;
    exclude?: string[] | undefined;
    rules?: string[] | undefined;
    timing?: "afterEach" | "inTest" | undefined;
}>;
/**
 * Performance budgets schema
 */
declare const PerformanceSchema: z.ZodObject<{
    enabled: z.ZodBoolean;
    budgets: z.ZodOptional<z.ZodObject<{
        lcp: z.ZodOptional<z.ZodNumber>;
        fid: z.ZodOptional<z.ZodNumber>;
        cls: z.ZodOptional<z.ZodNumber>;
        ttfb: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        lcp?: number | undefined;
        fid?: number | undefined;
        cls?: number | undefined;
        ttfb?: number | undefined;
    }, {
        lcp?: number | undefined;
        fid?: number | undefined;
        cls?: number | undefined;
        ttfb?: number | undefined;
    }>>;
    /** Timeout for collecting performance metrics in ms (default: 3000) */
    collectTimeout: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    enabled: boolean;
    budgets?: {
        lcp?: number | undefined;
        fid?: number | undefined;
        cls?: number | undefined;
        ttfb?: number | undefined;
    } | undefined;
    collectTimeout?: number | undefined;
}, {
    enabled: boolean;
    budgets?: {
        lcp?: number | undefined;
        fid?: number | undefined;
        cls?: number | undefined;
        ttfb?: number | undefined;
    } | undefined;
    collectTimeout?: number | undefined;
}>;
/**
 * Test data set schema for parameterized/data-driven tests
 */
declare const TestDataSetSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    data: z.ZodRecord<z.ZodString, z.ZodAny>;
}, "strip", z.ZodTypeAny, {
    data: Record<string, any>;
    name: string;
    description?: string | undefined;
}, {
    data: Record<string, any>;
    name: string;
    description?: string | undefined;
}>;
/**
 * Complete Journey frontmatter schema
 */
declare const JourneyFrontmatterSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    status: z.ZodEnum<["proposed", "defined", "clarified", "implemented", "quarantined", "deprecated"]>;
    tier: z.ZodEnum<["smoke", "release", "regression"]>;
    scope: z.ZodString;
    actor: z.ZodString;
    revision: z.ZodDefault<z.ZodNumber>;
    owner: z.ZodOptional<z.ZodString>;
    statusReason: z.ZodOptional<z.ZodString>;
    modules: z.ZodDefault<z.ZodObject<{
        foundation: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        features: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        foundation: string[];
        features: string[];
    }, {
        foundation?: string[] | undefined;
        features?: string[] | undefined;
    }>>;
    tests: z.ZodDefault<z.ZodArray<z.ZodUnion<[z.ZodString, z.ZodObject<{
        file: z.ZodString;
        line: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        file: string;
        line?: number | undefined;
    }, {
        file: string;
        line?: number | undefined;
    }>]>, "many">>;
    data: z.ZodOptional<z.ZodObject<{
        strategy: z.ZodDefault<z.ZodEnum<["seed", "create", "reuse"]>>;
        cleanup: z.ZodDefault<z.ZodEnum<["required", "best-effort", "none"]>>;
    }, "strip", z.ZodTypeAny, {
        strategy: "seed" | "create" | "reuse";
        cleanup: "required" | "best-effort" | "none";
    }, {
        strategy?: "seed" | "create" | "reuse" | undefined;
        cleanup?: "required" | "best-effort" | "none" | undefined;
    }>>;
    completion: z.ZodOptional<z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["url", "toast", "element", "text", "title", "api"]>;
        value: z.ZodString;
        options: z.ZodOptional<z.ZodObject<{
            timeout: z.ZodOptional<z.ZodNumber>;
            exact: z.ZodOptional<z.ZodBoolean>;
            state: z.ZodOptional<z.ZodEnum<["visible", "hidden", "attached", "detached"]>>;
            method: z.ZodOptional<z.ZodString>;
            status: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            exact?: boolean | undefined;
            status?: number | undefined;
            timeout?: number | undefined;
            state?: "visible" | "hidden" | "attached" | "detached" | undefined;
            method?: string | undefined;
        }, {
            exact?: boolean | undefined;
            status?: number | undefined;
            timeout?: number | undefined;
            state?: "visible" | "hidden" | "attached" | "detached" | undefined;
            method?: string | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        value: string;
        type: "text" | "title" | "url" | "toast" | "element" | "api";
        options?: {
            exact?: boolean | undefined;
            status?: number | undefined;
            timeout?: number | undefined;
            state?: "visible" | "hidden" | "attached" | "detached" | undefined;
            method?: string | undefined;
        } | undefined;
    }, {
        value: string;
        type: "text" | "title" | "url" | "toast" | "element" | "api";
        options?: {
            exact?: boolean | undefined;
            status?: number | undefined;
            timeout?: number | undefined;
            state?: "visible" | "hidden" | "attached" | "detached" | undefined;
            method?: string | undefined;
        } | undefined;
    }>, "many">>;
    links: z.ZodOptional<z.ZodObject<{
        issues: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        prs: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        docs: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        issues?: string[] | undefined;
        prs?: string[] | undefined;
        docs?: string[] | undefined;
    }, {
        issues?: string[] | undefined;
        prs?: string[] | undefined;
        docs?: string[] | undefined;
    }>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    flags: z.ZodOptional<z.ZodObject<{
        required: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        forbidden: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        required?: string[] | undefined;
        forbidden?: string[] | undefined;
    }, {
        required?: string[] | undefined;
        forbidden?: string[] | undefined;
    }>>;
    prerequisites: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    negativePaths: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        input: z.ZodRecord<z.ZodString, z.ZodAny>;
        expectedError: z.ZodString;
        expectedElement: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        input: Record<string, any>;
        expectedError: string;
        expectedElement?: string | undefined;
    }, {
        name: string;
        input: Record<string, any>;
        expectedError: string;
        expectedElement?: string | undefined;
    }>, "many">>;
    testData: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        data: z.ZodRecord<z.ZodString, z.ZodAny>;
    }, "strip", z.ZodTypeAny, {
        data: Record<string, any>;
        name: string;
        description?: string | undefined;
    }, {
        data: Record<string, any>;
        name: string;
        description?: string | undefined;
    }>, "many">>;
    visualRegression: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodBoolean;
        snapshots: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        threshold: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        snapshots?: string[] | undefined;
        threshold?: number | undefined;
    }, {
        enabled: boolean;
        snapshots?: string[] | undefined;
        threshold?: number | undefined;
    }>>;
    accessibility: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodBoolean;
        rules: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        exclude: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /**
         * When to run accessibility checks:
         * - 'afterEach': Run after each test (default, catches issues but doesn't fail individual tests)
         * - 'inTest': Run within test steps (fails immediately, better for CI)
         */
        timing: z.ZodDefault<z.ZodEnum<["afterEach", "inTest"]>>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        timing: "afterEach" | "inTest";
        exclude?: string[] | undefined;
        rules?: string[] | undefined;
    }, {
        enabled: boolean;
        exclude?: string[] | undefined;
        rules?: string[] | undefined;
        timing?: "afterEach" | "inTest" | undefined;
    }>>;
    performance: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodBoolean;
        budgets: z.ZodOptional<z.ZodObject<{
            lcp: z.ZodOptional<z.ZodNumber>;
            fid: z.ZodOptional<z.ZodNumber>;
            cls: z.ZodOptional<z.ZodNumber>;
            ttfb: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            lcp?: number | undefined;
            fid?: number | undefined;
            cls?: number | undefined;
            ttfb?: number | undefined;
        }, {
            lcp?: number | undefined;
            fid?: number | undefined;
            cls?: number | undefined;
            ttfb?: number | undefined;
        }>>;
        /** Timeout for collecting performance metrics in ms (default: 3000) */
        collectTimeout: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        budgets?: {
            lcp?: number | undefined;
            fid?: number | undefined;
            cls?: number | undefined;
            ttfb?: number | undefined;
        } | undefined;
        collectTimeout?: number | undefined;
    }, {
        enabled: boolean;
        budgets?: {
            lcp?: number | undefined;
            fid?: number | undefined;
            cls?: number | undefined;
            ttfb?: number | undefined;
        } | undefined;
        collectTimeout?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    modules: {
        foundation: string[];
        features: string[];
    };
    tests: (string | {
        file: string;
        line?: number | undefined;
    })[];
    status: "proposed" | "defined" | "clarified" | "implemented" | "quarantined" | "deprecated";
    id: string;
    title: string;
    tier: "smoke" | "release" | "regression";
    scope: string;
    actor: string;
    revision: number;
    owner?: string | undefined;
    statusReason?: string | undefined;
    data?: {
        strategy: "seed" | "create" | "reuse";
        cleanup: "required" | "best-effort" | "none";
    } | undefined;
    completion?: {
        value: string;
        type: "text" | "title" | "url" | "toast" | "element" | "api";
        options?: {
            exact?: boolean | undefined;
            status?: number | undefined;
            timeout?: number | undefined;
            state?: "visible" | "hidden" | "attached" | "detached" | undefined;
            method?: string | undefined;
        } | undefined;
    }[] | undefined;
    links?: {
        issues?: string[] | undefined;
        prs?: string[] | undefined;
        docs?: string[] | undefined;
    } | undefined;
    tags?: string[] | undefined;
    flags?: {
        required?: string[] | undefined;
        forbidden?: string[] | undefined;
    } | undefined;
    prerequisites?: string[] | undefined;
    negativePaths?: {
        name: string;
        input: Record<string, any>;
        expectedError: string;
        expectedElement?: string | undefined;
    }[] | undefined;
    testData?: {
        data: Record<string, any>;
        name: string;
        description?: string | undefined;
    }[] | undefined;
    visualRegression?: {
        enabled: boolean;
        snapshots?: string[] | undefined;
        threshold?: number | undefined;
    } | undefined;
    accessibility?: {
        enabled: boolean;
        timing: "afterEach" | "inTest";
        exclude?: string[] | undefined;
        rules?: string[] | undefined;
    } | undefined;
    performance?: {
        enabled: boolean;
        budgets?: {
            lcp?: number | undefined;
            fid?: number | undefined;
            cls?: number | undefined;
            ttfb?: number | undefined;
        } | undefined;
        collectTimeout?: number | undefined;
    } | undefined;
}, {
    status: "proposed" | "defined" | "clarified" | "implemented" | "quarantined" | "deprecated";
    id: string;
    title: string;
    tier: "smoke" | "release" | "regression";
    scope: string;
    actor: string;
    modules?: {
        foundation?: string[] | undefined;
        features?: string[] | undefined;
    } | undefined;
    tests?: (string | {
        file: string;
        line?: number | undefined;
    })[] | undefined;
    revision?: number | undefined;
    owner?: string | undefined;
    statusReason?: string | undefined;
    data?: {
        strategy?: "seed" | "create" | "reuse" | undefined;
        cleanup?: "required" | "best-effort" | "none" | undefined;
    } | undefined;
    completion?: {
        value: string;
        type: "text" | "title" | "url" | "toast" | "element" | "api";
        options?: {
            exact?: boolean | undefined;
            status?: number | undefined;
            timeout?: number | undefined;
            state?: "visible" | "hidden" | "attached" | "detached" | undefined;
            method?: string | undefined;
        } | undefined;
    }[] | undefined;
    links?: {
        issues?: string[] | undefined;
        prs?: string[] | undefined;
        docs?: string[] | undefined;
    } | undefined;
    tags?: string[] | undefined;
    flags?: {
        required?: string[] | undefined;
        forbidden?: string[] | undefined;
    } | undefined;
    prerequisites?: string[] | undefined;
    negativePaths?: {
        name: string;
        input: Record<string, any>;
        expectedError: string;
        expectedElement?: string | undefined;
    }[] | undefined;
    testData?: {
        data: Record<string, any>;
        name: string;
        description?: string | undefined;
    }[] | undefined;
    visualRegression?: {
        enabled: boolean;
        snapshots?: string[] | undefined;
        threshold?: number | undefined;
    } | undefined;
    accessibility?: {
        enabled: boolean;
        exclude?: string[] | undefined;
        rules?: string[] | undefined;
        timing?: "afterEach" | "inTest" | undefined;
    } | undefined;
    performance?: {
        enabled: boolean;
        budgets?: {
            lcp?: number | undefined;
            fid?: number | undefined;
            cls?: number | undefined;
            ttfb?: number | undefined;
        } | undefined;
        collectTimeout?: number | undefined;
    } | undefined;
}>;
/**
 * Schema specifically for clarified journeys (required for AutoGen)
 */
declare const ClarifiedJourneyFrontmatterSchema: z.ZodEffects<z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    tier: z.ZodEnum<["smoke", "release", "regression"]>;
    scope: z.ZodString;
    actor: z.ZodString;
    revision: z.ZodDefault<z.ZodNumber>;
    owner: z.ZodOptional<z.ZodString>;
    statusReason: z.ZodOptional<z.ZodString>;
    modules: z.ZodDefault<z.ZodObject<{
        foundation: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        features: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        foundation: string[];
        features: string[];
    }, {
        foundation?: string[] | undefined;
        features?: string[] | undefined;
    }>>;
    tests: z.ZodDefault<z.ZodArray<z.ZodUnion<[z.ZodString, z.ZodObject<{
        file: z.ZodString;
        line: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        file: string;
        line?: number | undefined;
    }, {
        file: string;
        line?: number | undefined;
    }>]>, "many">>;
    data: z.ZodOptional<z.ZodObject<{
        strategy: z.ZodDefault<z.ZodEnum<["seed", "create", "reuse"]>>;
        cleanup: z.ZodDefault<z.ZodEnum<["required", "best-effort", "none"]>>;
    }, "strip", z.ZodTypeAny, {
        strategy: "seed" | "create" | "reuse";
        cleanup: "required" | "best-effort" | "none";
    }, {
        strategy?: "seed" | "create" | "reuse" | undefined;
        cleanup?: "required" | "best-effort" | "none" | undefined;
    }>>;
    completion: z.ZodOptional<z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["url", "toast", "element", "text", "title", "api"]>;
        value: z.ZodString;
        options: z.ZodOptional<z.ZodObject<{
            timeout: z.ZodOptional<z.ZodNumber>;
            exact: z.ZodOptional<z.ZodBoolean>;
            state: z.ZodOptional<z.ZodEnum<["visible", "hidden", "attached", "detached"]>>;
            method: z.ZodOptional<z.ZodString>;
            status: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            exact?: boolean | undefined;
            status?: number | undefined;
            timeout?: number | undefined;
            state?: "visible" | "hidden" | "attached" | "detached" | undefined;
            method?: string | undefined;
        }, {
            exact?: boolean | undefined;
            status?: number | undefined;
            timeout?: number | undefined;
            state?: "visible" | "hidden" | "attached" | "detached" | undefined;
            method?: string | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        value: string;
        type: "text" | "title" | "url" | "toast" | "element" | "api";
        options?: {
            exact?: boolean | undefined;
            status?: number | undefined;
            timeout?: number | undefined;
            state?: "visible" | "hidden" | "attached" | "detached" | undefined;
            method?: string | undefined;
        } | undefined;
    }, {
        value: string;
        type: "text" | "title" | "url" | "toast" | "element" | "api";
        options?: {
            exact?: boolean | undefined;
            status?: number | undefined;
            timeout?: number | undefined;
            state?: "visible" | "hidden" | "attached" | "detached" | undefined;
            method?: string | undefined;
        } | undefined;
    }>, "many">>;
    links: z.ZodOptional<z.ZodObject<{
        issues: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        prs: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        docs: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        issues?: string[] | undefined;
        prs?: string[] | undefined;
        docs?: string[] | undefined;
    }, {
        issues?: string[] | undefined;
        prs?: string[] | undefined;
        docs?: string[] | undefined;
    }>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    flags: z.ZodOptional<z.ZodObject<{
        required: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        forbidden: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        required?: string[] | undefined;
        forbidden?: string[] | undefined;
    }, {
        required?: string[] | undefined;
        forbidden?: string[] | undefined;
    }>>;
    prerequisites: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    negativePaths: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        input: z.ZodRecord<z.ZodString, z.ZodAny>;
        expectedError: z.ZodString;
        expectedElement: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        input: Record<string, any>;
        expectedError: string;
        expectedElement?: string | undefined;
    }, {
        name: string;
        input: Record<string, any>;
        expectedError: string;
        expectedElement?: string | undefined;
    }>, "many">>;
    testData: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        data: z.ZodRecord<z.ZodString, z.ZodAny>;
    }, "strip", z.ZodTypeAny, {
        data: Record<string, any>;
        name: string;
        description?: string | undefined;
    }, {
        data: Record<string, any>;
        name: string;
        description?: string | undefined;
    }>, "many">>;
    visualRegression: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodBoolean;
        snapshots: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        threshold: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        snapshots?: string[] | undefined;
        threshold?: number | undefined;
    }, {
        enabled: boolean;
        snapshots?: string[] | undefined;
        threshold?: number | undefined;
    }>>;
    accessibility: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodBoolean;
        rules: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        exclude: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /**
         * When to run accessibility checks:
         * - 'afterEach': Run after each test (default, catches issues but doesn't fail individual tests)
         * - 'inTest': Run within test steps (fails immediately, better for CI)
         */
        timing: z.ZodDefault<z.ZodEnum<["afterEach", "inTest"]>>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        timing: "afterEach" | "inTest";
        exclude?: string[] | undefined;
        rules?: string[] | undefined;
    }, {
        enabled: boolean;
        exclude?: string[] | undefined;
        rules?: string[] | undefined;
        timing?: "afterEach" | "inTest" | undefined;
    }>>;
    performance: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodBoolean;
        budgets: z.ZodOptional<z.ZodObject<{
            lcp: z.ZodOptional<z.ZodNumber>;
            fid: z.ZodOptional<z.ZodNumber>;
            cls: z.ZodOptional<z.ZodNumber>;
            ttfb: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            lcp?: number | undefined;
            fid?: number | undefined;
            cls?: number | undefined;
            ttfb?: number | undefined;
        }, {
            lcp?: number | undefined;
            fid?: number | undefined;
            cls?: number | undefined;
            ttfb?: number | undefined;
        }>>;
        /** Timeout for collecting performance metrics in ms (default: 3000) */
        collectTimeout: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        budgets?: {
            lcp?: number | undefined;
            fid?: number | undefined;
            cls?: number | undefined;
            ttfb?: number | undefined;
        } | undefined;
        collectTimeout?: number | undefined;
    }, {
        enabled: boolean;
        budgets?: {
            lcp?: number | undefined;
            fid?: number | undefined;
            cls?: number | undefined;
            ttfb?: number | undefined;
        } | undefined;
        collectTimeout?: number | undefined;
    }>>;
} & {
    status: z.ZodLiteral<"clarified">;
}, "strip", z.ZodTypeAny, {
    modules: {
        foundation: string[];
        features: string[];
    };
    tests: (string | {
        file: string;
        line?: number | undefined;
    })[];
    status: "clarified";
    id: string;
    title: string;
    tier: "smoke" | "release" | "regression";
    scope: string;
    actor: string;
    revision: number;
    owner?: string | undefined;
    statusReason?: string | undefined;
    data?: {
        strategy: "seed" | "create" | "reuse";
        cleanup: "required" | "best-effort" | "none";
    } | undefined;
    completion?: {
        value: string;
        type: "text" | "title" | "url" | "toast" | "element" | "api";
        options?: {
            exact?: boolean | undefined;
            status?: number | undefined;
            timeout?: number | undefined;
            state?: "visible" | "hidden" | "attached" | "detached" | undefined;
            method?: string | undefined;
        } | undefined;
    }[] | undefined;
    links?: {
        issues?: string[] | undefined;
        prs?: string[] | undefined;
        docs?: string[] | undefined;
    } | undefined;
    tags?: string[] | undefined;
    flags?: {
        required?: string[] | undefined;
        forbidden?: string[] | undefined;
    } | undefined;
    prerequisites?: string[] | undefined;
    negativePaths?: {
        name: string;
        input: Record<string, any>;
        expectedError: string;
        expectedElement?: string | undefined;
    }[] | undefined;
    testData?: {
        data: Record<string, any>;
        name: string;
        description?: string | undefined;
    }[] | undefined;
    visualRegression?: {
        enabled: boolean;
        snapshots?: string[] | undefined;
        threshold?: number | undefined;
    } | undefined;
    accessibility?: {
        enabled: boolean;
        timing: "afterEach" | "inTest";
        exclude?: string[] | undefined;
        rules?: string[] | undefined;
    } | undefined;
    performance?: {
        enabled: boolean;
        budgets?: {
            lcp?: number | undefined;
            fid?: number | undefined;
            cls?: number | undefined;
            ttfb?: number | undefined;
        } | undefined;
        collectTimeout?: number | undefined;
    } | undefined;
}, {
    status: "clarified";
    id: string;
    title: string;
    tier: "smoke" | "release" | "regression";
    scope: string;
    actor: string;
    modules?: {
        foundation?: string[] | undefined;
        features?: string[] | undefined;
    } | undefined;
    tests?: (string | {
        file: string;
        line?: number | undefined;
    })[] | undefined;
    revision?: number | undefined;
    owner?: string | undefined;
    statusReason?: string | undefined;
    data?: {
        strategy?: "seed" | "create" | "reuse" | undefined;
        cleanup?: "required" | "best-effort" | "none" | undefined;
    } | undefined;
    completion?: {
        value: string;
        type: "text" | "title" | "url" | "toast" | "element" | "api";
        options?: {
            exact?: boolean | undefined;
            status?: number | undefined;
            timeout?: number | undefined;
            state?: "visible" | "hidden" | "attached" | "detached" | undefined;
            method?: string | undefined;
        } | undefined;
    }[] | undefined;
    links?: {
        issues?: string[] | undefined;
        prs?: string[] | undefined;
        docs?: string[] | undefined;
    } | undefined;
    tags?: string[] | undefined;
    flags?: {
        required?: string[] | undefined;
        forbidden?: string[] | undefined;
    } | undefined;
    prerequisites?: string[] | undefined;
    negativePaths?: {
        name: string;
        input: Record<string, any>;
        expectedError: string;
        expectedElement?: string | undefined;
    }[] | undefined;
    testData?: {
        data: Record<string, any>;
        name: string;
        description?: string | undefined;
    }[] | undefined;
    visualRegression?: {
        enabled: boolean;
        snapshots?: string[] | undefined;
        threshold?: number | undefined;
    } | undefined;
    accessibility?: {
        enabled: boolean;
        exclude?: string[] | undefined;
        rules?: string[] | undefined;
        timing?: "afterEach" | "inTest" | undefined;
    } | undefined;
    performance?: {
        enabled: boolean;
        budgets?: {
            lcp?: number | undefined;
            fid?: number | undefined;
            cls?: number | undefined;
            ttfb?: number | undefined;
        } | undefined;
        collectTimeout?: number | undefined;
    } | undefined;
}>, {
    modules: {
        foundation: string[];
        features: string[];
    };
    tests: (string | {
        file: string;
        line?: number | undefined;
    })[];
    status: "clarified";
    id: string;
    title: string;
    tier: "smoke" | "release" | "regression";
    scope: string;
    actor: string;
    revision: number;
    owner?: string | undefined;
    statusReason?: string | undefined;
    data?: {
        strategy: "seed" | "create" | "reuse";
        cleanup: "required" | "best-effort" | "none";
    } | undefined;
    completion?: {
        value: string;
        type: "text" | "title" | "url" | "toast" | "element" | "api";
        options?: {
            exact?: boolean | undefined;
            status?: number | undefined;
            timeout?: number | undefined;
            state?: "visible" | "hidden" | "attached" | "detached" | undefined;
            method?: string | undefined;
        } | undefined;
    }[] | undefined;
    links?: {
        issues?: string[] | undefined;
        prs?: string[] | undefined;
        docs?: string[] | undefined;
    } | undefined;
    tags?: string[] | undefined;
    flags?: {
        required?: string[] | undefined;
        forbidden?: string[] | undefined;
    } | undefined;
    prerequisites?: string[] | undefined;
    negativePaths?: {
        name: string;
        input: Record<string, any>;
        expectedError: string;
        expectedElement?: string | undefined;
    }[] | undefined;
    testData?: {
        data: Record<string, any>;
        name: string;
        description?: string | undefined;
    }[] | undefined;
    visualRegression?: {
        enabled: boolean;
        snapshots?: string[] | undefined;
        threshold?: number | undefined;
    } | undefined;
    accessibility?: {
        enabled: boolean;
        timing: "afterEach" | "inTest";
        exclude?: string[] | undefined;
        rules?: string[] | undefined;
    } | undefined;
    performance?: {
        enabled: boolean;
        budgets?: {
            lcp?: number | undefined;
            fid?: number | undefined;
            cls?: number | undefined;
            ttfb?: number | undefined;
        } | undefined;
        collectTimeout?: number | undefined;
    } | undefined;
}, {
    status: "clarified";
    id: string;
    title: string;
    tier: "smoke" | "release" | "regression";
    scope: string;
    actor: string;
    modules?: {
        foundation?: string[] | undefined;
        features?: string[] | undefined;
    } | undefined;
    tests?: (string | {
        file: string;
        line?: number | undefined;
    })[] | undefined;
    revision?: number | undefined;
    owner?: string | undefined;
    statusReason?: string | undefined;
    data?: {
        strategy?: "seed" | "create" | "reuse" | undefined;
        cleanup?: "required" | "best-effort" | "none" | undefined;
    } | undefined;
    completion?: {
        value: string;
        type: "text" | "title" | "url" | "toast" | "element" | "api";
        options?: {
            exact?: boolean | undefined;
            status?: number | undefined;
            timeout?: number | undefined;
            state?: "visible" | "hidden" | "attached" | "detached" | undefined;
            method?: string | undefined;
        } | undefined;
    }[] | undefined;
    links?: {
        issues?: string[] | undefined;
        prs?: string[] | undefined;
        docs?: string[] | undefined;
    } | undefined;
    tags?: string[] | undefined;
    flags?: {
        required?: string[] | undefined;
        forbidden?: string[] | undefined;
    } | undefined;
    prerequisites?: string[] | undefined;
    negativePaths?: {
        name: string;
        input: Record<string, any>;
        expectedError: string;
        expectedElement?: string | undefined;
    }[] | undefined;
    testData?: {
        data: Record<string, any>;
        name: string;
        description?: string | undefined;
    }[] | undefined;
    visualRegression?: {
        enabled: boolean;
        snapshots?: string[] | undefined;
        threshold?: number | undefined;
    } | undefined;
    accessibility?: {
        enabled: boolean;
        exclude?: string[] | undefined;
        rules?: string[] | undefined;
        timing?: "afterEach" | "inTest" | undefined;
    } | undefined;
    performance?: {
        enabled: boolean;
        budgets?: {
            lcp?: number | undefined;
            fid?: number | undefined;
            cls?: number | undefined;
            ttfb?: number | undefined;
        } | undefined;
        collectTimeout?: number | undefined;
    } | undefined;
}>;
/**
 * Schema for implemented journeys (must have tests)
 */
declare const ImplementedJourneyFrontmatterSchema: z.ZodEffects<z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    tier: z.ZodEnum<["smoke", "release", "regression"]>;
    scope: z.ZodString;
    actor: z.ZodString;
    revision: z.ZodDefault<z.ZodNumber>;
    owner: z.ZodOptional<z.ZodString>;
    statusReason: z.ZodOptional<z.ZodString>;
    modules: z.ZodDefault<z.ZodObject<{
        foundation: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        features: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        foundation: string[];
        features: string[];
    }, {
        foundation?: string[] | undefined;
        features?: string[] | undefined;
    }>>;
    tests: z.ZodDefault<z.ZodArray<z.ZodUnion<[z.ZodString, z.ZodObject<{
        file: z.ZodString;
        line: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        file: string;
        line?: number | undefined;
    }, {
        file: string;
        line?: number | undefined;
    }>]>, "many">>;
    data: z.ZodOptional<z.ZodObject<{
        strategy: z.ZodDefault<z.ZodEnum<["seed", "create", "reuse"]>>;
        cleanup: z.ZodDefault<z.ZodEnum<["required", "best-effort", "none"]>>;
    }, "strip", z.ZodTypeAny, {
        strategy: "seed" | "create" | "reuse";
        cleanup: "required" | "best-effort" | "none";
    }, {
        strategy?: "seed" | "create" | "reuse" | undefined;
        cleanup?: "required" | "best-effort" | "none" | undefined;
    }>>;
    completion: z.ZodOptional<z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["url", "toast", "element", "text", "title", "api"]>;
        value: z.ZodString;
        options: z.ZodOptional<z.ZodObject<{
            timeout: z.ZodOptional<z.ZodNumber>;
            exact: z.ZodOptional<z.ZodBoolean>;
            state: z.ZodOptional<z.ZodEnum<["visible", "hidden", "attached", "detached"]>>;
            method: z.ZodOptional<z.ZodString>;
            status: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            exact?: boolean | undefined;
            status?: number | undefined;
            timeout?: number | undefined;
            state?: "visible" | "hidden" | "attached" | "detached" | undefined;
            method?: string | undefined;
        }, {
            exact?: boolean | undefined;
            status?: number | undefined;
            timeout?: number | undefined;
            state?: "visible" | "hidden" | "attached" | "detached" | undefined;
            method?: string | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        value: string;
        type: "text" | "title" | "url" | "toast" | "element" | "api";
        options?: {
            exact?: boolean | undefined;
            status?: number | undefined;
            timeout?: number | undefined;
            state?: "visible" | "hidden" | "attached" | "detached" | undefined;
            method?: string | undefined;
        } | undefined;
    }, {
        value: string;
        type: "text" | "title" | "url" | "toast" | "element" | "api";
        options?: {
            exact?: boolean | undefined;
            status?: number | undefined;
            timeout?: number | undefined;
            state?: "visible" | "hidden" | "attached" | "detached" | undefined;
            method?: string | undefined;
        } | undefined;
    }>, "many">>;
    links: z.ZodOptional<z.ZodObject<{
        issues: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        prs: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        docs: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        issues?: string[] | undefined;
        prs?: string[] | undefined;
        docs?: string[] | undefined;
    }, {
        issues?: string[] | undefined;
        prs?: string[] | undefined;
        docs?: string[] | undefined;
    }>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    flags: z.ZodOptional<z.ZodObject<{
        required: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        forbidden: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        required?: string[] | undefined;
        forbidden?: string[] | undefined;
    }, {
        required?: string[] | undefined;
        forbidden?: string[] | undefined;
    }>>;
    prerequisites: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    negativePaths: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        input: z.ZodRecord<z.ZodString, z.ZodAny>;
        expectedError: z.ZodString;
        expectedElement: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        input: Record<string, any>;
        expectedError: string;
        expectedElement?: string | undefined;
    }, {
        name: string;
        input: Record<string, any>;
        expectedError: string;
        expectedElement?: string | undefined;
    }>, "many">>;
    testData: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        data: z.ZodRecord<z.ZodString, z.ZodAny>;
    }, "strip", z.ZodTypeAny, {
        data: Record<string, any>;
        name: string;
        description?: string | undefined;
    }, {
        data: Record<string, any>;
        name: string;
        description?: string | undefined;
    }>, "many">>;
    visualRegression: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodBoolean;
        snapshots: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        threshold: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        snapshots?: string[] | undefined;
        threshold?: number | undefined;
    }, {
        enabled: boolean;
        snapshots?: string[] | undefined;
        threshold?: number | undefined;
    }>>;
    accessibility: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodBoolean;
        rules: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        exclude: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /**
         * When to run accessibility checks:
         * - 'afterEach': Run after each test (default, catches issues but doesn't fail individual tests)
         * - 'inTest': Run within test steps (fails immediately, better for CI)
         */
        timing: z.ZodDefault<z.ZodEnum<["afterEach", "inTest"]>>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        timing: "afterEach" | "inTest";
        exclude?: string[] | undefined;
        rules?: string[] | undefined;
    }, {
        enabled: boolean;
        exclude?: string[] | undefined;
        rules?: string[] | undefined;
        timing?: "afterEach" | "inTest" | undefined;
    }>>;
    performance: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodBoolean;
        budgets: z.ZodOptional<z.ZodObject<{
            lcp: z.ZodOptional<z.ZodNumber>;
            fid: z.ZodOptional<z.ZodNumber>;
            cls: z.ZodOptional<z.ZodNumber>;
            ttfb: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            lcp?: number | undefined;
            fid?: number | undefined;
            cls?: number | undefined;
            ttfb?: number | undefined;
        }, {
            lcp?: number | undefined;
            fid?: number | undefined;
            cls?: number | undefined;
            ttfb?: number | undefined;
        }>>;
        /** Timeout for collecting performance metrics in ms (default: 3000) */
        collectTimeout: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        budgets?: {
            lcp?: number | undefined;
            fid?: number | undefined;
            cls?: number | undefined;
            ttfb?: number | undefined;
        } | undefined;
        collectTimeout?: number | undefined;
    }, {
        enabled: boolean;
        budgets?: {
            lcp?: number | undefined;
            fid?: number | undefined;
            cls?: number | undefined;
            ttfb?: number | undefined;
        } | undefined;
        collectTimeout?: number | undefined;
    }>>;
} & {
    status: z.ZodLiteral<"implemented">;
}, "strip", z.ZodTypeAny, {
    modules: {
        foundation: string[];
        features: string[];
    };
    tests: (string | {
        file: string;
        line?: number | undefined;
    })[];
    status: "implemented";
    id: string;
    title: string;
    tier: "smoke" | "release" | "regression";
    scope: string;
    actor: string;
    revision: number;
    owner?: string | undefined;
    statusReason?: string | undefined;
    data?: {
        strategy: "seed" | "create" | "reuse";
        cleanup: "required" | "best-effort" | "none";
    } | undefined;
    completion?: {
        value: string;
        type: "text" | "title" | "url" | "toast" | "element" | "api";
        options?: {
            exact?: boolean | undefined;
            status?: number | undefined;
            timeout?: number | undefined;
            state?: "visible" | "hidden" | "attached" | "detached" | undefined;
            method?: string | undefined;
        } | undefined;
    }[] | undefined;
    links?: {
        issues?: string[] | undefined;
        prs?: string[] | undefined;
        docs?: string[] | undefined;
    } | undefined;
    tags?: string[] | undefined;
    flags?: {
        required?: string[] | undefined;
        forbidden?: string[] | undefined;
    } | undefined;
    prerequisites?: string[] | undefined;
    negativePaths?: {
        name: string;
        input: Record<string, any>;
        expectedError: string;
        expectedElement?: string | undefined;
    }[] | undefined;
    testData?: {
        data: Record<string, any>;
        name: string;
        description?: string | undefined;
    }[] | undefined;
    visualRegression?: {
        enabled: boolean;
        snapshots?: string[] | undefined;
        threshold?: number | undefined;
    } | undefined;
    accessibility?: {
        enabled: boolean;
        timing: "afterEach" | "inTest";
        exclude?: string[] | undefined;
        rules?: string[] | undefined;
    } | undefined;
    performance?: {
        enabled: boolean;
        budgets?: {
            lcp?: number | undefined;
            fid?: number | undefined;
            cls?: number | undefined;
            ttfb?: number | undefined;
        } | undefined;
        collectTimeout?: number | undefined;
    } | undefined;
}, {
    status: "implemented";
    id: string;
    title: string;
    tier: "smoke" | "release" | "regression";
    scope: string;
    actor: string;
    modules?: {
        foundation?: string[] | undefined;
        features?: string[] | undefined;
    } | undefined;
    tests?: (string | {
        file: string;
        line?: number | undefined;
    })[] | undefined;
    revision?: number | undefined;
    owner?: string | undefined;
    statusReason?: string | undefined;
    data?: {
        strategy?: "seed" | "create" | "reuse" | undefined;
        cleanup?: "required" | "best-effort" | "none" | undefined;
    } | undefined;
    completion?: {
        value: string;
        type: "text" | "title" | "url" | "toast" | "element" | "api";
        options?: {
            exact?: boolean | undefined;
            status?: number | undefined;
            timeout?: number | undefined;
            state?: "visible" | "hidden" | "attached" | "detached" | undefined;
            method?: string | undefined;
        } | undefined;
    }[] | undefined;
    links?: {
        issues?: string[] | undefined;
        prs?: string[] | undefined;
        docs?: string[] | undefined;
    } | undefined;
    tags?: string[] | undefined;
    flags?: {
        required?: string[] | undefined;
        forbidden?: string[] | undefined;
    } | undefined;
    prerequisites?: string[] | undefined;
    negativePaths?: {
        name: string;
        input: Record<string, any>;
        expectedError: string;
        expectedElement?: string | undefined;
    }[] | undefined;
    testData?: {
        data: Record<string, any>;
        name: string;
        description?: string | undefined;
    }[] | undefined;
    visualRegression?: {
        enabled: boolean;
        snapshots?: string[] | undefined;
        threshold?: number | undefined;
    } | undefined;
    accessibility?: {
        enabled: boolean;
        exclude?: string[] | undefined;
        rules?: string[] | undefined;
        timing?: "afterEach" | "inTest" | undefined;
    } | undefined;
    performance?: {
        enabled: boolean;
        budgets?: {
            lcp?: number | undefined;
            fid?: number | undefined;
            cls?: number | undefined;
            ttfb?: number | undefined;
        } | undefined;
        collectTimeout?: number | undefined;
    } | undefined;
}>, {
    modules: {
        foundation: string[];
        features: string[];
    };
    tests: (string | {
        file: string;
        line?: number | undefined;
    })[];
    status: "implemented";
    id: string;
    title: string;
    tier: "smoke" | "release" | "regression";
    scope: string;
    actor: string;
    revision: number;
    owner?: string | undefined;
    statusReason?: string | undefined;
    data?: {
        strategy: "seed" | "create" | "reuse";
        cleanup: "required" | "best-effort" | "none";
    } | undefined;
    completion?: {
        value: string;
        type: "text" | "title" | "url" | "toast" | "element" | "api";
        options?: {
            exact?: boolean | undefined;
            status?: number | undefined;
            timeout?: number | undefined;
            state?: "visible" | "hidden" | "attached" | "detached" | undefined;
            method?: string | undefined;
        } | undefined;
    }[] | undefined;
    links?: {
        issues?: string[] | undefined;
        prs?: string[] | undefined;
        docs?: string[] | undefined;
    } | undefined;
    tags?: string[] | undefined;
    flags?: {
        required?: string[] | undefined;
        forbidden?: string[] | undefined;
    } | undefined;
    prerequisites?: string[] | undefined;
    negativePaths?: {
        name: string;
        input: Record<string, any>;
        expectedError: string;
        expectedElement?: string | undefined;
    }[] | undefined;
    testData?: {
        data: Record<string, any>;
        name: string;
        description?: string | undefined;
    }[] | undefined;
    visualRegression?: {
        enabled: boolean;
        snapshots?: string[] | undefined;
        threshold?: number | undefined;
    } | undefined;
    accessibility?: {
        enabled: boolean;
        timing: "afterEach" | "inTest";
        exclude?: string[] | undefined;
        rules?: string[] | undefined;
    } | undefined;
    performance?: {
        enabled: boolean;
        budgets?: {
            lcp?: number | undefined;
            fid?: number | undefined;
            cls?: number | undefined;
            ttfb?: number | undefined;
        } | undefined;
        collectTimeout?: number | undefined;
    } | undefined;
}, {
    status: "implemented";
    id: string;
    title: string;
    tier: "smoke" | "release" | "regression";
    scope: string;
    actor: string;
    modules?: {
        foundation?: string[] | undefined;
        features?: string[] | undefined;
    } | undefined;
    tests?: (string | {
        file: string;
        line?: number | undefined;
    })[] | undefined;
    revision?: number | undefined;
    owner?: string | undefined;
    statusReason?: string | undefined;
    data?: {
        strategy?: "seed" | "create" | "reuse" | undefined;
        cleanup?: "required" | "best-effort" | "none" | undefined;
    } | undefined;
    completion?: {
        value: string;
        type: "text" | "title" | "url" | "toast" | "element" | "api";
        options?: {
            exact?: boolean | undefined;
            status?: number | undefined;
            timeout?: number | undefined;
            state?: "visible" | "hidden" | "attached" | "detached" | undefined;
            method?: string | undefined;
        } | undefined;
    }[] | undefined;
    links?: {
        issues?: string[] | undefined;
        prs?: string[] | undefined;
        docs?: string[] | undefined;
    } | undefined;
    tags?: string[] | undefined;
    flags?: {
        required?: string[] | undefined;
        forbidden?: string[] | undefined;
    } | undefined;
    prerequisites?: string[] | undefined;
    negativePaths?: {
        name: string;
        input: Record<string, any>;
        expectedError: string;
        expectedElement?: string | undefined;
    }[] | undefined;
    testData?: {
        data: Record<string, any>;
        name: string;
        description?: string | undefined;
    }[] | undefined;
    visualRegression?: {
        enabled: boolean;
        snapshots?: string[] | undefined;
        threshold?: number | undefined;
    } | undefined;
    accessibility?: {
        enabled: boolean;
        exclude?: string[] | undefined;
        rules?: string[] | undefined;
        timing?: "afterEach" | "inTest" | undefined;
    } | undefined;
    performance?: {
        enabled: boolean;
        budgets?: {
            lcp?: number | undefined;
            fid?: number | undefined;
            cls?: number | undefined;
            ttfb?: number | undefined;
        } | undefined;
        collectTimeout?: number | undefined;
    } | undefined;
}>;
/**
 * Schema for quarantined journeys (must have owner and reason)
 */
declare const QuarantinedJourneyFrontmatterSchema: z.ZodEffects<z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    tier: z.ZodEnum<["smoke", "release", "regression"]>;
    scope: z.ZodString;
    actor: z.ZodString;
    revision: z.ZodDefault<z.ZodNumber>;
    modules: z.ZodDefault<z.ZodObject<{
        foundation: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        features: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        foundation: string[];
        features: string[];
    }, {
        foundation?: string[] | undefined;
        features?: string[] | undefined;
    }>>;
    tests: z.ZodDefault<z.ZodArray<z.ZodUnion<[z.ZodString, z.ZodObject<{
        file: z.ZodString;
        line: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        file: string;
        line?: number | undefined;
    }, {
        file: string;
        line?: number | undefined;
    }>]>, "many">>;
    data: z.ZodOptional<z.ZodObject<{
        strategy: z.ZodDefault<z.ZodEnum<["seed", "create", "reuse"]>>;
        cleanup: z.ZodDefault<z.ZodEnum<["required", "best-effort", "none"]>>;
    }, "strip", z.ZodTypeAny, {
        strategy: "seed" | "create" | "reuse";
        cleanup: "required" | "best-effort" | "none";
    }, {
        strategy?: "seed" | "create" | "reuse" | undefined;
        cleanup?: "required" | "best-effort" | "none" | undefined;
    }>>;
    completion: z.ZodOptional<z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["url", "toast", "element", "text", "title", "api"]>;
        value: z.ZodString;
        options: z.ZodOptional<z.ZodObject<{
            timeout: z.ZodOptional<z.ZodNumber>;
            exact: z.ZodOptional<z.ZodBoolean>;
            state: z.ZodOptional<z.ZodEnum<["visible", "hidden", "attached", "detached"]>>;
            method: z.ZodOptional<z.ZodString>;
            status: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            exact?: boolean | undefined;
            status?: number | undefined;
            timeout?: number | undefined;
            state?: "visible" | "hidden" | "attached" | "detached" | undefined;
            method?: string | undefined;
        }, {
            exact?: boolean | undefined;
            status?: number | undefined;
            timeout?: number | undefined;
            state?: "visible" | "hidden" | "attached" | "detached" | undefined;
            method?: string | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        value: string;
        type: "text" | "title" | "url" | "toast" | "element" | "api";
        options?: {
            exact?: boolean | undefined;
            status?: number | undefined;
            timeout?: number | undefined;
            state?: "visible" | "hidden" | "attached" | "detached" | undefined;
            method?: string | undefined;
        } | undefined;
    }, {
        value: string;
        type: "text" | "title" | "url" | "toast" | "element" | "api";
        options?: {
            exact?: boolean | undefined;
            status?: number | undefined;
            timeout?: number | undefined;
            state?: "visible" | "hidden" | "attached" | "detached" | undefined;
            method?: string | undefined;
        } | undefined;
    }>, "many">>;
    links: z.ZodOptional<z.ZodObject<{
        issues: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        prs: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        docs: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        issues?: string[] | undefined;
        prs?: string[] | undefined;
        docs?: string[] | undefined;
    }, {
        issues?: string[] | undefined;
        prs?: string[] | undefined;
        docs?: string[] | undefined;
    }>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    flags: z.ZodOptional<z.ZodObject<{
        required: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        forbidden: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        required?: string[] | undefined;
        forbidden?: string[] | undefined;
    }, {
        required?: string[] | undefined;
        forbidden?: string[] | undefined;
    }>>;
    prerequisites: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    negativePaths: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        input: z.ZodRecord<z.ZodString, z.ZodAny>;
        expectedError: z.ZodString;
        expectedElement: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        input: Record<string, any>;
        expectedError: string;
        expectedElement?: string | undefined;
    }, {
        name: string;
        input: Record<string, any>;
        expectedError: string;
        expectedElement?: string | undefined;
    }>, "many">>;
    testData: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        data: z.ZodRecord<z.ZodString, z.ZodAny>;
    }, "strip", z.ZodTypeAny, {
        data: Record<string, any>;
        name: string;
        description?: string | undefined;
    }, {
        data: Record<string, any>;
        name: string;
        description?: string | undefined;
    }>, "many">>;
    visualRegression: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodBoolean;
        snapshots: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        threshold: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        snapshots?: string[] | undefined;
        threshold?: number | undefined;
    }, {
        enabled: boolean;
        snapshots?: string[] | undefined;
        threshold?: number | undefined;
    }>>;
    accessibility: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodBoolean;
        rules: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        exclude: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /**
         * When to run accessibility checks:
         * - 'afterEach': Run after each test (default, catches issues but doesn't fail individual tests)
         * - 'inTest': Run within test steps (fails immediately, better for CI)
         */
        timing: z.ZodDefault<z.ZodEnum<["afterEach", "inTest"]>>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        timing: "afterEach" | "inTest";
        exclude?: string[] | undefined;
        rules?: string[] | undefined;
    }, {
        enabled: boolean;
        exclude?: string[] | undefined;
        rules?: string[] | undefined;
        timing?: "afterEach" | "inTest" | undefined;
    }>>;
    performance: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodBoolean;
        budgets: z.ZodOptional<z.ZodObject<{
            lcp: z.ZodOptional<z.ZodNumber>;
            fid: z.ZodOptional<z.ZodNumber>;
            cls: z.ZodOptional<z.ZodNumber>;
            ttfb: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            lcp?: number | undefined;
            fid?: number | undefined;
            cls?: number | undefined;
            ttfb?: number | undefined;
        }, {
            lcp?: number | undefined;
            fid?: number | undefined;
            cls?: number | undefined;
            ttfb?: number | undefined;
        }>>;
        /** Timeout for collecting performance metrics in ms (default: 3000) */
        collectTimeout: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        budgets?: {
            lcp?: number | undefined;
            fid?: number | undefined;
            cls?: number | undefined;
            ttfb?: number | undefined;
        } | undefined;
        collectTimeout?: number | undefined;
    }, {
        enabled: boolean;
        budgets?: {
            lcp?: number | undefined;
            fid?: number | undefined;
            cls?: number | undefined;
            ttfb?: number | undefined;
        } | undefined;
        collectTimeout?: number | undefined;
    }>>;
} & {
    status: z.ZodLiteral<"quarantined">;
    owner: z.ZodString;
    statusReason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    modules: {
        foundation: string[];
        features: string[];
    };
    tests: (string | {
        file: string;
        line?: number | undefined;
    })[];
    status: "quarantined";
    id: string;
    title: string;
    tier: "smoke" | "release" | "regression";
    scope: string;
    actor: string;
    revision: number;
    owner: string;
    statusReason: string;
    data?: {
        strategy: "seed" | "create" | "reuse";
        cleanup: "required" | "best-effort" | "none";
    } | undefined;
    completion?: {
        value: string;
        type: "text" | "title" | "url" | "toast" | "element" | "api";
        options?: {
            exact?: boolean | undefined;
            status?: number | undefined;
            timeout?: number | undefined;
            state?: "visible" | "hidden" | "attached" | "detached" | undefined;
            method?: string | undefined;
        } | undefined;
    }[] | undefined;
    links?: {
        issues?: string[] | undefined;
        prs?: string[] | undefined;
        docs?: string[] | undefined;
    } | undefined;
    tags?: string[] | undefined;
    flags?: {
        required?: string[] | undefined;
        forbidden?: string[] | undefined;
    } | undefined;
    prerequisites?: string[] | undefined;
    negativePaths?: {
        name: string;
        input: Record<string, any>;
        expectedError: string;
        expectedElement?: string | undefined;
    }[] | undefined;
    testData?: {
        data: Record<string, any>;
        name: string;
        description?: string | undefined;
    }[] | undefined;
    visualRegression?: {
        enabled: boolean;
        snapshots?: string[] | undefined;
        threshold?: number | undefined;
    } | undefined;
    accessibility?: {
        enabled: boolean;
        timing: "afterEach" | "inTest";
        exclude?: string[] | undefined;
        rules?: string[] | undefined;
    } | undefined;
    performance?: {
        enabled: boolean;
        budgets?: {
            lcp?: number | undefined;
            fid?: number | undefined;
            cls?: number | undefined;
            ttfb?: number | undefined;
        } | undefined;
        collectTimeout?: number | undefined;
    } | undefined;
}, {
    status: "quarantined";
    id: string;
    title: string;
    tier: "smoke" | "release" | "regression";
    scope: string;
    actor: string;
    owner: string;
    statusReason: string;
    modules?: {
        foundation?: string[] | undefined;
        features?: string[] | undefined;
    } | undefined;
    tests?: (string | {
        file: string;
        line?: number | undefined;
    })[] | undefined;
    revision?: number | undefined;
    data?: {
        strategy?: "seed" | "create" | "reuse" | undefined;
        cleanup?: "required" | "best-effort" | "none" | undefined;
    } | undefined;
    completion?: {
        value: string;
        type: "text" | "title" | "url" | "toast" | "element" | "api";
        options?: {
            exact?: boolean | undefined;
            status?: number | undefined;
            timeout?: number | undefined;
            state?: "visible" | "hidden" | "attached" | "detached" | undefined;
            method?: string | undefined;
        } | undefined;
    }[] | undefined;
    links?: {
        issues?: string[] | undefined;
        prs?: string[] | undefined;
        docs?: string[] | undefined;
    } | undefined;
    tags?: string[] | undefined;
    flags?: {
        required?: string[] | undefined;
        forbidden?: string[] | undefined;
    } | undefined;
    prerequisites?: string[] | undefined;
    negativePaths?: {
        name: string;
        input: Record<string, any>;
        expectedError: string;
        expectedElement?: string | undefined;
    }[] | undefined;
    testData?: {
        data: Record<string, any>;
        name: string;
        description?: string | undefined;
    }[] | undefined;
    visualRegression?: {
        enabled: boolean;
        snapshots?: string[] | undefined;
        threshold?: number | undefined;
    } | undefined;
    accessibility?: {
        enabled: boolean;
        exclude?: string[] | undefined;
        rules?: string[] | undefined;
        timing?: "afterEach" | "inTest" | undefined;
    } | undefined;
    performance?: {
        enabled: boolean;
        budgets?: {
            lcp?: number | undefined;
            fid?: number | undefined;
            cls?: number | undefined;
            ttfb?: number | undefined;
        } | undefined;
        collectTimeout?: number | undefined;
    } | undefined;
}>, {
    modules: {
        foundation: string[];
        features: string[];
    };
    tests: (string | {
        file: string;
        line?: number | undefined;
    })[];
    status: "quarantined";
    id: string;
    title: string;
    tier: "smoke" | "release" | "regression";
    scope: string;
    actor: string;
    revision: number;
    owner: string;
    statusReason: string;
    data?: {
        strategy: "seed" | "create" | "reuse";
        cleanup: "required" | "best-effort" | "none";
    } | undefined;
    completion?: {
        value: string;
        type: "text" | "title" | "url" | "toast" | "element" | "api";
        options?: {
            exact?: boolean | undefined;
            status?: number | undefined;
            timeout?: number | undefined;
            state?: "visible" | "hidden" | "attached" | "detached" | undefined;
            method?: string | undefined;
        } | undefined;
    }[] | undefined;
    links?: {
        issues?: string[] | undefined;
        prs?: string[] | undefined;
        docs?: string[] | undefined;
    } | undefined;
    tags?: string[] | undefined;
    flags?: {
        required?: string[] | undefined;
        forbidden?: string[] | undefined;
    } | undefined;
    prerequisites?: string[] | undefined;
    negativePaths?: {
        name: string;
        input: Record<string, any>;
        expectedError: string;
        expectedElement?: string | undefined;
    }[] | undefined;
    testData?: {
        data: Record<string, any>;
        name: string;
        description?: string | undefined;
    }[] | undefined;
    visualRegression?: {
        enabled: boolean;
        snapshots?: string[] | undefined;
        threshold?: number | undefined;
    } | undefined;
    accessibility?: {
        enabled: boolean;
        timing: "afterEach" | "inTest";
        exclude?: string[] | undefined;
        rules?: string[] | undefined;
    } | undefined;
    performance?: {
        enabled: boolean;
        budgets?: {
            lcp?: number | undefined;
            fid?: number | undefined;
            cls?: number | undefined;
            ttfb?: number | undefined;
        } | undefined;
        collectTimeout?: number | undefined;
    } | undefined;
}, {
    status: "quarantined";
    id: string;
    title: string;
    tier: "smoke" | "release" | "regression";
    scope: string;
    actor: string;
    owner: string;
    statusReason: string;
    modules?: {
        foundation?: string[] | undefined;
        features?: string[] | undefined;
    } | undefined;
    tests?: (string | {
        file: string;
        line?: number | undefined;
    })[] | undefined;
    revision?: number | undefined;
    data?: {
        strategy?: "seed" | "create" | "reuse" | undefined;
        cleanup?: "required" | "best-effort" | "none" | undefined;
    } | undefined;
    completion?: {
        value: string;
        type: "text" | "title" | "url" | "toast" | "element" | "api";
        options?: {
            exact?: boolean | undefined;
            status?: number | undefined;
            timeout?: number | undefined;
            state?: "visible" | "hidden" | "attached" | "detached" | undefined;
            method?: string | undefined;
        } | undefined;
    }[] | undefined;
    links?: {
        issues?: string[] | undefined;
        prs?: string[] | undefined;
        docs?: string[] | undefined;
    } | undefined;
    tags?: string[] | undefined;
    flags?: {
        required?: string[] | undefined;
        forbidden?: string[] | undefined;
    } | undefined;
    prerequisites?: string[] | undefined;
    negativePaths?: {
        name: string;
        input: Record<string, any>;
        expectedError: string;
        expectedElement?: string | undefined;
    }[] | undefined;
    testData?: {
        data: Record<string, any>;
        name: string;
        description?: string | undefined;
    }[] | undefined;
    visualRegression?: {
        enabled: boolean;
        snapshots?: string[] | undefined;
        threshold?: number | undefined;
    } | undefined;
    accessibility?: {
        enabled: boolean;
        exclude?: string[] | undefined;
        rules?: string[] | undefined;
        timing?: "afterEach" | "inTest" | undefined;
    } | undefined;
    performance?: {
        enabled: boolean;
        budgets?: {
            lcp?: number | undefined;
            fid?: number | undefined;
            cls?: number | undefined;
            ttfb?: number | undefined;
        } | undefined;
        collectTimeout?: number | undefined;
    } | undefined;
}>;
/**
 * TypeScript types
 */
type JourneyStatus = z.infer<typeof JourneyStatusSchema>;
type JourneyTier = z.infer<typeof JourneyTierSchema>;
type DataStrategy = z.infer<typeof DataStrategySchema>;
type CleanupStrategy = z.infer<typeof CleanupStrategySchema>;
type CompletionType = z.infer<typeof CompletionTypeSchema>;
type CompletionSignal = z.infer<typeof CompletionSignalSchema>;
type DataConfig = z.infer<typeof DataConfigSchema>;
type Modules = z.infer<typeof ModulesSchema>;
type TestRef = z.infer<typeof TestRefSchema>;
type Links = z.infer<typeof LinksSchema>;
type NegativePath = z.infer<typeof NegativePathSchema>;
type TestDataSet = z.infer<typeof TestDataSetSchema>;
type VisualRegression = z.infer<typeof VisualRegressionSchema>;
type Accessibility = z.infer<typeof AccessibilitySchema>;
type Performance = z.infer<typeof PerformanceSchema>;
type JourneyFrontmatter = z.infer<typeof JourneyFrontmatterSchema>;
/**
 * Validate that a journey is ready for AutoGen (must be clarified)
 */
declare function validateForAutoGen(frontmatter: JourneyFrontmatter): {
    valid: boolean;
    errors: string[];
};

/**
 * Result type pattern for structured error handling
 *
 * Replaces boolean returns with structured results that include:
 * - Success/failure status
 * - Value on success
 * - Error information on failure
 * - Optional warnings for partial success cases
 *
 * @see research/2026-01-15_code_quality_standards.md Category 2 (Silent Failures)
 */
/**
 * A Result type representing either success with a value or failure with an error
 *
 * @example
 * ```typescript
 * function parseConfig(path: string): Result<Config, ConfigError> {
 *   if (!fileExists(path)) {
 *     return { success: false, error: { code: 'NOT_FOUND', message: 'Config file not found' } };
 *   }
 *   const config = JSON.parse(readFile(path));
 *   return { success: true, value: config };
 * }
 *
 * const result = parseConfig('config.json');
 * if (result.success) {
 *   console.log(result.value); // Config object
 * } else {
 *   console.error(result.error); // ConfigError
 * }
 * ```
 */
type Result<T, E = string> = {
    success: true;
    value: T;
    warnings?: string[];
} | {
    success: false;
    error: E;
};
/**
 * Create a successful result
 *
 * @param value - The success value
 * @param warnings - Optional warnings to include
 * @returns A success Result
 *
 * @example
 * ```typescript
 * return ok({ name: 'test', count: 5 });
 * return ok(true, ['Some warning about the operation']);
 * ```
 */
declare function ok<T>(value: T, warnings?: string[]): Result<T, never>;
/**
 * Create a failed result
 *
 * @param error - The error information
 * @returns A failure Result
 *
 * @example
 * ```typescript
 * return err('File not found');
 * return err({ code: 'NOT_FOUND', path: '/missing.txt' });
 * ```
 */
declare function err<E>(error: E): Result<never, E>;
/**
 * Check if a result is successful
 *
 * @param result - The result to check
 * @returns True if the result is successful
 */
declare function isOk<T, E>(result: Result<T, E>): result is {
    success: true;
    value: T;
    warnings?: string[];
};
/**
 * Check if a result is a failure
 *
 * @param result - The result to check
 * @returns True if the result is a failure
 */
declare function isErr<T, E>(result: Result<T, E>): result is {
    success: false;
    error: E;
};
/**
 * Unwrap a result, throwing if it's a failure
 *
 * @param result - The result to unwrap
 * @param errorMessage - Optional custom error message
 * @returns The success value
 * @throws Error if the result is a failure
 *
 * @example
 * ```typescript
 * const config = unwrap(parseConfig('config.json'));
 * // Throws if parsing failed
 * ```
 */
declare function unwrap<T, E>(result: Result<T, E>, errorMessage?: string): T;
/**
 * Unwrap a result or return a default value
 *
 * @param result - The result to unwrap
 * @param defaultValue - The default value to return on failure
 * @returns The success value or default
 *
 * @example
 * ```typescript
 * const config = unwrapOr(parseConfig('config.json'), defaultConfig);
 * ```
 */
declare function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T;
/**
 * Map a successful result to a new value
 *
 * @param result - The result to map
 * @param fn - The mapping function
 * @returns A new result with the mapped value
 *
 * @example
 * ```typescript
 * const nameResult = map(parseConfig('config.json'), config => config.name);
 * ```
 */
declare function map<T, U, E>(result: Result<T, E>, fn: (_value: T) => U): Result<U, E>;
/**
 * Map a failed result to a new error
 *
 * @param result - The result to map
 * @param fn - The error mapping function
 * @returns A new result with the mapped error
 */
declare function mapErr<T, E, F>(result: Result<T, E>, fn: (_error: E) => F): Result<T, F>;
/**
 * Chain result operations (flatMap)
 *
 * @param result - The result to chain from
 * @param fn - The function returning a new result
 * @returns The chained result
 *
 * @example
 * ```typescript
 * const result = andThen(
 *   parseConfig('config.json'),
 *   config => validateConfig(config)
 * );
 * ```
 */
declare function andThen<T, U, E>(result: Result<T, E>, fn: (_value: T) => Result<U, E>): Result<U, E>;
/**
 * Collect an array of results into a result of an array
 *
 * @param results - Array of results to collect
 * @returns A single result containing all values or the first error
 *
 * @example
 * ```typescript
 * const configs = collect([
 *   parseConfig('a.json'),
 *   parseConfig('b.json'),
 *   parseConfig('c.json'),
 * ]);
 * // Either Result<Config[], E> with all configs or first error
 * ```
 */
declare function collect<T, E>(results: Result<T, E>[]): Result<T[], E>;
/**
 * Partition an array of results into successes and failures
 *
 * @param results - Array of results to partition
 * @returns Object with values and errors arrays
 *
 * @example
 * ```typescript
 * const { values, errors } = partition([
 *   parseConfig('a.json'),
 *   parseConfig('b.json'),
 *   parseConfig('c.json'),
 * ]);
 * console.log(`${values.length} succeeded, ${errors.length} failed`);
 * ```
 */
declare function partition<T, E>(results: Result<T, E>[]): {
    values: T[];
    errors: E[];
    warnings: string[];
};
/**
 * Try to execute a function and wrap the result
 *
 * @param fn - Function to execute
 * @returns Result with the return value or caught error
 *
 * @example
 * ```typescript
 * const result = tryCatch(() => JSON.parse(jsonString));
 * if (result.success) {
 *   console.log(result.value);
 * } else {
 *   console.error('Parse failed:', result.error);
 * }
 * ```
 */
declare function tryCatch<T>(fn: () => T): Result<T, Error>;
/**
 * Try to execute an async function and wrap the result
 *
 * @param fn - Async function to execute
 * @returns Promise of Result with the return value or caught error
 *
 * @example
 * ```typescript
 * const result = await tryCatchAsync(() => fetch('/api/data').then(r => r.json()));
 * ```
 */
declare function tryCatchAsync<T>(fn: () => Promise<T>): Promise<Result<T, Error>>;
/**
 * Error class with code, message, and optional details.
 *
 * Can be used both with Result type and thrown directly.
 * Extends Error to provide proper stack traces and instanceof checks.
 *
 * @example
 * ```typescript
 * // With Result type
 * return err(new CodedError('NOT_FOUND', 'File not found', { path: '/missing.txt' }));
 *
 * // Thrown directly
 * throw new CodedError('VALIDATION_ERROR', 'Invalid input');
 *
 * // Caught with instanceof
 * try {
 *   riskyOperation();
 * } catch (error) {
 *   if (error instanceof CodedError) {
 *     console.error(`[${error.code}] ${error.message}`);
 *   }
 * }
 * ```
 */
declare class CodedError extends Error {
    readonly code: string;
    readonly details?: Record<string, unknown>;
    constructor(code: string, message: string, details?: Record<string, unknown>);
    /**
     * Create a CodedError (convenience factory, same as constructor)
     */
    static create(code: string, message: string, details?: Record<string, unknown>): CodedError;
    /**
     * Convert to plain object (for serialization/logging)
     */
    toJSON(): {
        code: string;
        message: string;
        details?: Record<string, unknown>;
        stack?: string;
    };
    /**
     * Format error for display
     */
    toString(): string;
}
/**
 * Create a coded error (convenience factory function)
 *
 * @param code - Error code (e.g., 'NOT_FOUND', 'VALIDATION_ERROR')
 * @param message - Human-readable error message
 * @param details - Optional additional details
 * @returns A CodedError instance
 *
 * @example
 * ```typescript
 * return err(codedError('PARSE_ERROR', 'Invalid JSON', { line: 42 }));
 * ```
 */
declare function codedError(code: string, message: string, details?: Record<string, unknown>): CodedError;

/**
 * Error thrown when journey parsing fails
 */
declare class JourneyParseError extends Error {
    readonly filePath: string;
    readonly cause?: unknown;
    constructor(message: string, filePath: string, cause?: unknown);
}
/**
 * Parsed journey structure
 */
interface ParsedJourney {
    /** Journey frontmatter (validated) */
    frontmatter: JourneyFrontmatter;
    /** Raw markdown body (everything after frontmatter) */
    body: string;
    /** Acceptance Criteria section */
    acceptanceCriteria: AcceptanceCriterion[];
    /** Procedural Steps section */
    proceduralSteps: ProceduralStep[];
    /** Data/Environment notes */
    dataNotes: string[];
    /** Source file path */
    sourcePath: string;
}
/**
 * Acceptance criterion from journey body
 */
interface AcceptanceCriterion {
    /** Criterion ID (e.g., 'AC-1') */
    id: string;
    /** Title/description */
    title: string;
    /** Bullet points under this criterion */
    steps: string[];
    /** Raw markdown content */
    rawContent: string;
}
/**
 * Procedural step from journey body
 */
interface ProceduralStep {
    /** Step number */
    number: number;
    /** Step text */
    text: string;
    /** Associated AC (if any) */
    linkedAC?: string;
}
/**
 * Structured step action from journey body
 */
interface StructuredStepAction {
    /** Action type: 'action', 'wait', or 'assert' */
    type: 'action' | 'wait' | 'assert';
    /** The parsed action string */
    action: string;
    /** Target element or condition */
    target: string;
    /** Optional value for the action */
    value?: string;
}
/**
 * Structured step from journey body
 */
interface StructuredStep {
    /** Step number */
    stepNumber: number;
    /** Step name/title */
    stepName: string;
    /** Array of parsed actions */
    actions: StructuredStepAction[];
}
/**
 * Parse structured steps from markdown content
 * Parses the new structured format with Action/Wait for/Assert bullets
 * @param content - The markdown content containing structured steps
 * @returns Array of parsed structured steps
 */
declare function parseStructuredSteps(content: string): StructuredStep[];
/**
 * Parse a journey markdown file
 * @param filePath - Path to the journey file
 * @returns Parsed journey structure
 * @throws JourneyParseError if parsing fails
 */
declare function parseJourney(filePath: string): ParsedJourney;
/**
 * Parse and validate a journey for AutoGen (must be clarified)
 */
declare function parseJourneyForAutoGen(filePath: string): ParsedJourney;
/**
 * Parse journey from string content (for testing)
 */
declare function parseJourneyContent(content: string, virtualPath?: string): ParsedJourney;
/**
 * Parse journey from string content with Result type (no exceptions)
 *
 * This is the recommended way to parse journey content as it returns
 * structured errors via Result type instead of throwing exceptions.
 *
 * @param content - Raw markdown content to parse
 * @param virtualPath - Virtual path for error reporting (default: 'virtual.journey.md')
 * @returns Result with ParsedJourney on success or CodedError on failure
 *
 * @example
 * ```typescript
 * const result = tryParseJourneyContent(markdownContent);
 * if (result.success) {
 *   console.log('Parsed:', result.value.frontmatter.id);
 * } else {
 *   console.error(`[${result.error.code}] ${result.error.message}`);
 * }
 * ```
 */
declare function tryParseJourneyContent(content: string, virtualPath?: string): Result<ParsedJourney, CodedError>;

export { collect as $, type AcceptanceCriterion as A, type TestRef as B, ClarifiedJourneyFrontmatterSchema as C, type DataConfig as D, ElementStateSchema as E, TestRefSchema as F, VisualRegressionSchema as G, parseJourney as H, ImplementedJourneyFrontmatterSchema as I, type JourneyFrontmatter as J, parseJourneyContent as K, type Links as L, type Modules as M, type NegativePath as N, parseJourneyForAutoGen as O, type ParsedJourney as P, QuarantinedJourneyFrontmatterSchema as Q, parseStructuredSteps as R, type StructuredStep as S, type TestDataSet as T, tryParseJourneyContent as U, type VisualRegression as V, validateForAutoGen as W, CodedError as X, type Result as Y, andThen as Z, codedError as _, type Accessibility as a, err as a0, isErr as a1, isOk as a2, map as a3, mapErr as a4, ok as a5, partition as a6, tryCatch as a7, tryCatchAsync as a8, unwrap as a9, unwrapOr as aa, AccessibilitySchema as b, AccessibilityTimingSchema as c, type CleanupStrategy as d, CleanupStrategySchema as e, type CompletionSignal as f, CompletionSignalSchema as g, type CompletionType as h, CompletionTypeSchema as i, DataConfigSchema as j, type DataStrategy as k, DataStrategySchema as l, JourneyFrontmatterSchema as m, JourneyParseError as n, type JourneyStatus as o, JourneyStatusSchema as p, type JourneyTier as q, JourneyTierSchema as r, LinksSchema as s, ModulesSchema as t, NegativePathSchema as u, type Performance as v, PerformanceSchema as w, type ProceduralStep as x, type StructuredStepAction as y, TestDataSetSchema as z };
