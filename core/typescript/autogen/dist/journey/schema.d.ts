/**
 * Journey Frontmatter Zod Schema
 * @see research/2026-01-02_autogen-refined-plan.md Section 8
 */
import { z } from 'zod';
/**
 * Journey status enum
 */
export declare const JourneyStatusSchema: z.ZodEnum<["proposed", "defined", "clarified", "implemented", "quarantined", "deprecated"]>;
/**
 * Journey tier enum
 */
export declare const JourneyTierSchema: z.ZodEnum<["smoke", "release", "regression"]>;
/**
 * Data strategy enum
 */
export declare const DataStrategySchema: z.ZodEnum<["seed", "create", "reuse"]>;
/**
 * Cleanup strategy enum
 */
export declare const CleanupStrategySchema: z.ZodEnum<["required", "best-effort", "none"]>;
/**
 * Completion signal type enum
 */
export declare const CompletionTypeSchema: z.ZodEnum<["url", "toast", "element", "title", "api"]>;
/**
 * Element state enum for completion signals
 */
export declare const ElementStateSchema: z.ZodEnum<["visible", "hidden", "attached", "detached"]>;
/**
 * Completion signal schema
 */
export declare const CompletionSignalSchema: z.ZodObject<{
    type: z.ZodEnum<["url", "toast", "element", "title", "api"]>;
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
    type: "url" | "toast" | "element" | "title" | "api";
    options?: {
        exact?: boolean | undefined;
        status?: number | undefined;
        timeout?: number | undefined;
        state?: "visible" | "hidden" | "attached" | "detached" | undefined;
        method?: string | undefined;
    } | undefined;
}, {
    value: string;
    type: "url" | "toast" | "element" | "title" | "api";
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
export declare const DataConfigSchema: z.ZodObject<{
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
export declare const ModulesSchema: z.ZodObject<{
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
export declare const TestRefSchema: z.ZodObject<{
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
export declare const LinksSchema: z.ZodObject<{
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
export declare const NegativePathSchema: z.ZodObject<{
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
export declare const VisualRegressionSchema: z.ZodObject<{
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
 * Accessibility configuration schema
 */
export declare const AccessibilitySchema: z.ZodObject<{
    enabled: z.ZodBoolean;
    rules: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    exclude: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    enabled: boolean;
    exclude?: string[] | undefined;
    rules?: string[] | undefined;
}, {
    enabled: boolean;
    exclude?: string[] | undefined;
    rules?: string[] | undefined;
}>;
/**
 * Performance budgets schema
 */
export declare const PerformanceSchema: z.ZodObject<{
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
}, "strip", z.ZodTypeAny, {
    enabled: boolean;
    budgets?: {
        lcp?: number | undefined;
        fid?: number | undefined;
        cls?: number | undefined;
        ttfb?: number | undefined;
    } | undefined;
}, {
    enabled: boolean;
    budgets?: {
        lcp?: number | undefined;
        fid?: number | undefined;
        cls?: number | undefined;
        ttfb?: number | undefined;
    } | undefined;
}>;
/**
 * Test data set schema for parameterized/data-driven tests
 */
export declare const TestDataSetSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    data: z.ZodRecord<z.ZodString, z.ZodAny>;
}, "strip", z.ZodTypeAny, {
    name: string;
    data: Record<string, any>;
    description?: string | undefined;
}, {
    name: string;
    data: Record<string, any>;
    description?: string | undefined;
}>;
/**
 * Complete Journey frontmatter schema
 */
export declare const JourneyFrontmatterSchema: z.ZodObject<{
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
        type: z.ZodEnum<["url", "toast", "element", "title", "api"]>;
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
        type: "url" | "toast" | "element" | "title" | "api";
        options?: {
            exact?: boolean | undefined;
            status?: number | undefined;
            timeout?: number | undefined;
            state?: "visible" | "hidden" | "attached" | "detached" | undefined;
            method?: string | undefined;
        } | undefined;
    }, {
        value: string;
        type: "url" | "toast" | "element" | "title" | "api";
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
        name: string;
        data: Record<string, any>;
        description?: string | undefined;
    }, {
        name: string;
        data: Record<string, any>;
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
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        exclude?: string[] | undefined;
        rules?: string[] | undefined;
    }, {
        enabled: boolean;
        exclude?: string[] | undefined;
        rules?: string[] | undefined;
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
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        budgets?: {
            lcp?: number | undefined;
            fid?: number | undefined;
            cls?: number | undefined;
            ttfb?: number | undefined;
        } | undefined;
    }, {
        enabled: boolean;
        budgets?: {
            lcp?: number | undefined;
            fid?: number | undefined;
            cls?: number | undefined;
            ttfb?: number | undefined;
        } | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    actor: string;
    title: string;
    id: string;
    tier: "smoke" | "release" | "regression";
    scope: string;
    revision: number;
    modules: {
        foundation: string[];
        features: string[];
    };
    tests: (string | {
        file: string;
        line?: number | undefined;
    })[];
    status: "proposed" | "defined" | "clarified" | "implemented" | "quarantined" | "deprecated";
    testData?: {
        name: string;
        data: Record<string, any>;
        description?: string | undefined;
    }[] | undefined;
    tags?: string[] | undefined;
    data?: {
        strategy: "seed" | "create" | "reuse";
        cleanup: "required" | "best-effort" | "none";
    } | undefined;
    completion?: {
        value: string;
        type: "url" | "toast" | "element" | "title" | "api";
        options?: {
            exact?: boolean | undefined;
            status?: number | undefined;
            timeout?: number | undefined;
            state?: "visible" | "hidden" | "attached" | "detached" | undefined;
            method?: string | undefined;
        } | undefined;
    }[] | undefined;
    prerequisites?: string[] | undefined;
    negativePaths?: {
        name: string;
        input: Record<string, any>;
        expectedError: string;
        expectedElement?: string | undefined;
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
    } | undefined;
    performance?: {
        enabled: boolean;
        budgets?: {
            lcp?: number | undefined;
            fid?: number | undefined;
            cls?: number | undefined;
            ttfb?: number | undefined;
        } | undefined;
    } | undefined;
    owner?: string | undefined;
    statusReason?: string | undefined;
    links?: {
        issues?: string[] | undefined;
        prs?: string[] | undefined;
        docs?: string[] | undefined;
    } | undefined;
    flags?: {
        required?: string[] | undefined;
        forbidden?: string[] | undefined;
    } | undefined;
}, {
    actor: string;
    title: string;
    id: string;
    tier: "smoke" | "release" | "regression";
    scope: string;
    status: "proposed" | "defined" | "clarified" | "implemented" | "quarantined" | "deprecated";
    testData?: {
        name: string;
        data: Record<string, any>;
        description?: string | undefined;
    }[] | undefined;
    tags?: string[] | undefined;
    data?: {
        strategy?: "seed" | "create" | "reuse" | undefined;
        cleanup?: "required" | "best-effort" | "none" | undefined;
    } | undefined;
    completion?: {
        value: string;
        type: "url" | "toast" | "element" | "title" | "api";
        options?: {
            exact?: boolean | undefined;
            status?: number | undefined;
            timeout?: number | undefined;
            state?: "visible" | "hidden" | "attached" | "detached" | undefined;
            method?: string | undefined;
        } | undefined;
    }[] | undefined;
    revision?: number | undefined;
    prerequisites?: string[] | undefined;
    negativePaths?: {
        name: string;
        input: Record<string, any>;
        expectedError: string;
        expectedElement?: string | undefined;
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
    } | undefined;
    performance?: {
        enabled: boolean;
        budgets?: {
            lcp?: number | undefined;
            fid?: number | undefined;
            cls?: number | undefined;
            ttfb?: number | undefined;
        } | undefined;
    } | undefined;
    modules?: {
        foundation?: string[] | undefined;
        features?: string[] | undefined;
    } | undefined;
    tests?: (string | {
        file: string;
        line?: number | undefined;
    })[] | undefined;
    owner?: string | undefined;
    statusReason?: string | undefined;
    links?: {
        issues?: string[] | undefined;
        prs?: string[] | undefined;
        docs?: string[] | undefined;
    } | undefined;
    flags?: {
        required?: string[] | undefined;
        forbidden?: string[] | undefined;
    } | undefined;
}>;
/**
 * Schema specifically for clarified journeys (required for AutoGen)
 */
export declare const ClarifiedJourneyFrontmatterSchema: z.ZodEffects<z.ZodObject<{
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
        type: z.ZodEnum<["url", "toast", "element", "title", "api"]>;
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
        type: "url" | "toast" | "element" | "title" | "api";
        options?: {
            exact?: boolean | undefined;
            status?: number | undefined;
            timeout?: number | undefined;
            state?: "visible" | "hidden" | "attached" | "detached" | undefined;
            method?: string | undefined;
        } | undefined;
    }, {
        value: string;
        type: "url" | "toast" | "element" | "title" | "api";
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
        name: string;
        data: Record<string, any>;
        description?: string | undefined;
    }, {
        name: string;
        data: Record<string, any>;
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
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        exclude?: string[] | undefined;
        rules?: string[] | undefined;
    }, {
        enabled: boolean;
        exclude?: string[] | undefined;
        rules?: string[] | undefined;
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
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        budgets?: {
            lcp?: number | undefined;
            fid?: number | undefined;
            cls?: number | undefined;
            ttfb?: number | undefined;
        } | undefined;
    }, {
        enabled: boolean;
        budgets?: {
            lcp?: number | undefined;
            fid?: number | undefined;
            cls?: number | undefined;
            ttfb?: number | undefined;
        } | undefined;
    }>>;
} & {
    status: z.ZodLiteral<"clarified">;
}, "strip", z.ZodTypeAny, {
    actor: string;
    title: string;
    id: string;
    tier: "smoke" | "release" | "regression";
    scope: string;
    revision: number;
    modules: {
        foundation: string[];
        features: string[];
    };
    tests: (string | {
        file: string;
        line?: number | undefined;
    })[];
    status: "clarified";
    testData?: {
        name: string;
        data: Record<string, any>;
        description?: string | undefined;
    }[] | undefined;
    tags?: string[] | undefined;
    data?: {
        strategy: "seed" | "create" | "reuse";
        cleanup: "required" | "best-effort" | "none";
    } | undefined;
    completion?: {
        value: string;
        type: "url" | "toast" | "element" | "title" | "api";
        options?: {
            exact?: boolean | undefined;
            status?: number | undefined;
            timeout?: number | undefined;
            state?: "visible" | "hidden" | "attached" | "detached" | undefined;
            method?: string | undefined;
        } | undefined;
    }[] | undefined;
    prerequisites?: string[] | undefined;
    negativePaths?: {
        name: string;
        input: Record<string, any>;
        expectedError: string;
        expectedElement?: string | undefined;
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
    } | undefined;
    performance?: {
        enabled: boolean;
        budgets?: {
            lcp?: number | undefined;
            fid?: number | undefined;
            cls?: number | undefined;
            ttfb?: number | undefined;
        } | undefined;
    } | undefined;
    owner?: string | undefined;
    statusReason?: string | undefined;
    links?: {
        issues?: string[] | undefined;
        prs?: string[] | undefined;
        docs?: string[] | undefined;
    } | undefined;
    flags?: {
        required?: string[] | undefined;
        forbidden?: string[] | undefined;
    } | undefined;
}, {
    actor: string;
    title: string;
    id: string;
    tier: "smoke" | "release" | "regression";
    scope: string;
    status: "clarified";
    testData?: {
        name: string;
        data: Record<string, any>;
        description?: string | undefined;
    }[] | undefined;
    tags?: string[] | undefined;
    data?: {
        strategy?: "seed" | "create" | "reuse" | undefined;
        cleanup?: "required" | "best-effort" | "none" | undefined;
    } | undefined;
    completion?: {
        value: string;
        type: "url" | "toast" | "element" | "title" | "api";
        options?: {
            exact?: boolean | undefined;
            status?: number | undefined;
            timeout?: number | undefined;
            state?: "visible" | "hidden" | "attached" | "detached" | undefined;
            method?: string | undefined;
        } | undefined;
    }[] | undefined;
    revision?: number | undefined;
    prerequisites?: string[] | undefined;
    negativePaths?: {
        name: string;
        input: Record<string, any>;
        expectedError: string;
        expectedElement?: string | undefined;
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
    } | undefined;
    performance?: {
        enabled: boolean;
        budgets?: {
            lcp?: number | undefined;
            fid?: number | undefined;
            cls?: number | undefined;
            ttfb?: number | undefined;
        } | undefined;
    } | undefined;
    modules?: {
        foundation?: string[] | undefined;
        features?: string[] | undefined;
    } | undefined;
    tests?: (string | {
        file: string;
        line?: number | undefined;
    })[] | undefined;
    owner?: string | undefined;
    statusReason?: string | undefined;
    links?: {
        issues?: string[] | undefined;
        prs?: string[] | undefined;
        docs?: string[] | undefined;
    } | undefined;
    flags?: {
        required?: string[] | undefined;
        forbidden?: string[] | undefined;
    } | undefined;
}>, {
    actor: string;
    title: string;
    id: string;
    tier: "smoke" | "release" | "regression";
    scope: string;
    revision: number;
    modules: {
        foundation: string[];
        features: string[];
    };
    tests: (string | {
        file: string;
        line?: number | undefined;
    })[];
    status: "clarified";
    testData?: {
        name: string;
        data: Record<string, any>;
        description?: string | undefined;
    }[] | undefined;
    tags?: string[] | undefined;
    data?: {
        strategy: "seed" | "create" | "reuse";
        cleanup: "required" | "best-effort" | "none";
    } | undefined;
    completion?: {
        value: string;
        type: "url" | "toast" | "element" | "title" | "api";
        options?: {
            exact?: boolean | undefined;
            status?: number | undefined;
            timeout?: number | undefined;
            state?: "visible" | "hidden" | "attached" | "detached" | undefined;
            method?: string | undefined;
        } | undefined;
    }[] | undefined;
    prerequisites?: string[] | undefined;
    negativePaths?: {
        name: string;
        input: Record<string, any>;
        expectedError: string;
        expectedElement?: string | undefined;
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
    } | undefined;
    performance?: {
        enabled: boolean;
        budgets?: {
            lcp?: number | undefined;
            fid?: number | undefined;
            cls?: number | undefined;
            ttfb?: number | undefined;
        } | undefined;
    } | undefined;
    owner?: string | undefined;
    statusReason?: string | undefined;
    links?: {
        issues?: string[] | undefined;
        prs?: string[] | undefined;
        docs?: string[] | undefined;
    } | undefined;
    flags?: {
        required?: string[] | undefined;
        forbidden?: string[] | undefined;
    } | undefined;
}, {
    actor: string;
    title: string;
    id: string;
    tier: "smoke" | "release" | "regression";
    scope: string;
    status: "clarified";
    testData?: {
        name: string;
        data: Record<string, any>;
        description?: string | undefined;
    }[] | undefined;
    tags?: string[] | undefined;
    data?: {
        strategy?: "seed" | "create" | "reuse" | undefined;
        cleanup?: "required" | "best-effort" | "none" | undefined;
    } | undefined;
    completion?: {
        value: string;
        type: "url" | "toast" | "element" | "title" | "api";
        options?: {
            exact?: boolean | undefined;
            status?: number | undefined;
            timeout?: number | undefined;
            state?: "visible" | "hidden" | "attached" | "detached" | undefined;
            method?: string | undefined;
        } | undefined;
    }[] | undefined;
    revision?: number | undefined;
    prerequisites?: string[] | undefined;
    negativePaths?: {
        name: string;
        input: Record<string, any>;
        expectedError: string;
        expectedElement?: string | undefined;
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
    } | undefined;
    performance?: {
        enabled: boolean;
        budgets?: {
            lcp?: number | undefined;
            fid?: number | undefined;
            cls?: number | undefined;
            ttfb?: number | undefined;
        } | undefined;
    } | undefined;
    modules?: {
        foundation?: string[] | undefined;
        features?: string[] | undefined;
    } | undefined;
    tests?: (string | {
        file: string;
        line?: number | undefined;
    })[] | undefined;
    owner?: string | undefined;
    statusReason?: string | undefined;
    links?: {
        issues?: string[] | undefined;
        prs?: string[] | undefined;
        docs?: string[] | undefined;
    } | undefined;
    flags?: {
        required?: string[] | undefined;
        forbidden?: string[] | undefined;
    } | undefined;
}>;
/**
 * Schema for implemented journeys (must have tests)
 */
export declare const ImplementedJourneyFrontmatterSchema: z.ZodEffects<z.ZodObject<{
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
        type: z.ZodEnum<["url", "toast", "element", "title", "api"]>;
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
        type: "url" | "toast" | "element" | "title" | "api";
        options?: {
            exact?: boolean | undefined;
            status?: number | undefined;
            timeout?: number | undefined;
            state?: "visible" | "hidden" | "attached" | "detached" | undefined;
            method?: string | undefined;
        } | undefined;
    }, {
        value: string;
        type: "url" | "toast" | "element" | "title" | "api";
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
        name: string;
        data: Record<string, any>;
        description?: string | undefined;
    }, {
        name: string;
        data: Record<string, any>;
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
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        exclude?: string[] | undefined;
        rules?: string[] | undefined;
    }, {
        enabled: boolean;
        exclude?: string[] | undefined;
        rules?: string[] | undefined;
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
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        budgets?: {
            lcp?: number | undefined;
            fid?: number | undefined;
            cls?: number | undefined;
            ttfb?: number | undefined;
        } | undefined;
    }, {
        enabled: boolean;
        budgets?: {
            lcp?: number | undefined;
            fid?: number | undefined;
            cls?: number | undefined;
            ttfb?: number | undefined;
        } | undefined;
    }>>;
} & {
    status: z.ZodLiteral<"implemented">;
}, "strip", z.ZodTypeAny, {
    actor: string;
    title: string;
    id: string;
    tier: "smoke" | "release" | "regression";
    scope: string;
    revision: number;
    modules: {
        foundation: string[];
        features: string[];
    };
    tests: (string | {
        file: string;
        line?: number | undefined;
    })[];
    status: "implemented";
    testData?: {
        name: string;
        data: Record<string, any>;
        description?: string | undefined;
    }[] | undefined;
    tags?: string[] | undefined;
    data?: {
        strategy: "seed" | "create" | "reuse";
        cleanup: "required" | "best-effort" | "none";
    } | undefined;
    completion?: {
        value: string;
        type: "url" | "toast" | "element" | "title" | "api";
        options?: {
            exact?: boolean | undefined;
            status?: number | undefined;
            timeout?: number | undefined;
            state?: "visible" | "hidden" | "attached" | "detached" | undefined;
            method?: string | undefined;
        } | undefined;
    }[] | undefined;
    prerequisites?: string[] | undefined;
    negativePaths?: {
        name: string;
        input: Record<string, any>;
        expectedError: string;
        expectedElement?: string | undefined;
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
    } | undefined;
    performance?: {
        enabled: boolean;
        budgets?: {
            lcp?: number | undefined;
            fid?: number | undefined;
            cls?: number | undefined;
            ttfb?: number | undefined;
        } | undefined;
    } | undefined;
    owner?: string | undefined;
    statusReason?: string | undefined;
    links?: {
        issues?: string[] | undefined;
        prs?: string[] | undefined;
        docs?: string[] | undefined;
    } | undefined;
    flags?: {
        required?: string[] | undefined;
        forbidden?: string[] | undefined;
    } | undefined;
}, {
    actor: string;
    title: string;
    id: string;
    tier: "smoke" | "release" | "regression";
    scope: string;
    status: "implemented";
    testData?: {
        name: string;
        data: Record<string, any>;
        description?: string | undefined;
    }[] | undefined;
    tags?: string[] | undefined;
    data?: {
        strategy?: "seed" | "create" | "reuse" | undefined;
        cleanup?: "required" | "best-effort" | "none" | undefined;
    } | undefined;
    completion?: {
        value: string;
        type: "url" | "toast" | "element" | "title" | "api";
        options?: {
            exact?: boolean | undefined;
            status?: number | undefined;
            timeout?: number | undefined;
            state?: "visible" | "hidden" | "attached" | "detached" | undefined;
            method?: string | undefined;
        } | undefined;
    }[] | undefined;
    revision?: number | undefined;
    prerequisites?: string[] | undefined;
    negativePaths?: {
        name: string;
        input: Record<string, any>;
        expectedError: string;
        expectedElement?: string | undefined;
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
    } | undefined;
    performance?: {
        enabled: boolean;
        budgets?: {
            lcp?: number | undefined;
            fid?: number | undefined;
            cls?: number | undefined;
            ttfb?: number | undefined;
        } | undefined;
    } | undefined;
    modules?: {
        foundation?: string[] | undefined;
        features?: string[] | undefined;
    } | undefined;
    tests?: (string | {
        file: string;
        line?: number | undefined;
    })[] | undefined;
    owner?: string | undefined;
    statusReason?: string | undefined;
    links?: {
        issues?: string[] | undefined;
        prs?: string[] | undefined;
        docs?: string[] | undefined;
    } | undefined;
    flags?: {
        required?: string[] | undefined;
        forbidden?: string[] | undefined;
    } | undefined;
}>, {
    actor: string;
    title: string;
    id: string;
    tier: "smoke" | "release" | "regression";
    scope: string;
    revision: number;
    modules: {
        foundation: string[];
        features: string[];
    };
    tests: (string | {
        file: string;
        line?: number | undefined;
    })[];
    status: "implemented";
    testData?: {
        name: string;
        data: Record<string, any>;
        description?: string | undefined;
    }[] | undefined;
    tags?: string[] | undefined;
    data?: {
        strategy: "seed" | "create" | "reuse";
        cleanup: "required" | "best-effort" | "none";
    } | undefined;
    completion?: {
        value: string;
        type: "url" | "toast" | "element" | "title" | "api";
        options?: {
            exact?: boolean | undefined;
            status?: number | undefined;
            timeout?: number | undefined;
            state?: "visible" | "hidden" | "attached" | "detached" | undefined;
            method?: string | undefined;
        } | undefined;
    }[] | undefined;
    prerequisites?: string[] | undefined;
    negativePaths?: {
        name: string;
        input: Record<string, any>;
        expectedError: string;
        expectedElement?: string | undefined;
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
    } | undefined;
    performance?: {
        enabled: boolean;
        budgets?: {
            lcp?: number | undefined;
            fid?: number | undefined;
            cls?: number | undefined;
            ttfb?: number | undefined;
        } | undefined;
    } | undefined;
    owner?: string | undefined;
    statusReason?: string | undefined;
    links?: {
        issues?: string[] | undefined;
        prs?: string[] | undefined;
        docs?: string[] | undefined;
    } | undefined;
    flags?: {
        required?: string[] | undefined;
        forbidden?: string[] | undefined;
    } | undefined;
}, {
    actor: string;
    title: string;
    id: string;
    tier: "smoke" | "release" | "regression";
    scope: string;
    status: "implemented";
    testData?: {
        name: string;
        data: Record<string, any>;
        description?: string | undefined;
    }[] | undefined;
    tags?: string[] | undefined;
    data?: {
        strategy?: "seed" | "create" | "reuse" | undefined;
        cleanup?: "required" | "best-effort" | "none" | undefined;
    } | undefined;
    completion?: {
        value: string;
        type: "url" | "toast" | "element" | "title" | "api";
        options?: {
            exact?: boolean | undefined;
            status?: number | undefined;
            timeout?: number | undefined;
            state?: "visible" | "hidden" | "attached" | "detached" | undefined;
            method?: string | undefined;
        } | undefined;
    }[] | undefined;
    revision?: number | undefined;
    prerequisites?: string[] | undefined;
    negativePaths?: {
        name: string;
        input: Record<string, any>;
        expectedError: string;
        expectedElement?: string | undefined;
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
    } | undefined;
    performance?: {
        enabled: boolean;
        budgets?: {
            lcp?: number | undefined;
            fid?: number | undefined;
            cls?: number | undefined;
            ttfb?: number | undefined;
        } | undefined;
    } | undefined;
    modules?: {
        foundation?: string[] | undefined;
        features?: string[] | undefined;
    } | undefined;
    tests?: (string | {
        file: string;
        line?: number | undefined;
    })[] | undefined;
    owner?: string | undefined;
    statusReason?: string | undefined;
    links?: {
        issues?: string[] | undefined;
        prs?: string[] | undefined;
        docs?: string[] | undefined;
    } | undefined;
    flags?: {
        required?: string[] | undefined;
        forbidden?: string[] | undefined;
    } | undefined;
}>;
/**
 * Schema for quarantined journeys (must have owner and reason)
 */
export declare const QuarantinedJourneyFrontmatterSchema: z.ZodEffects<z.ZodObject<{
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
        type: z.ZodEnum<["url", "toast", "element", "title", "api"]>;
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
        type: "url" | "toast" | "element" | "title" | "api";
        options?: {
            exact?: boolean | undefined;
            status?: number | undefined;
            timeout?: number | undefined;
            state?: "visible" | "hidden" | "attached" | "detached" | undefined;
            method?: string | undefined;
        } | undefined;
    }, {
        value: string;
        type: "url" | "toast" | "element" | "title" | "api";
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
        name: string;
        data: Record<string, any>;
        description?: string | undefined;
    }, {
        name: string;
        data: Record<string, any>;
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
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        exclude?: string[] | undefined;
        rules?: string[] | undefined;
    }, {
        enabled: boolean;
        exclude?: string[] | undefined;
        rules?: string[] | undefined;
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
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        budgets?: {
            lcp?: number | undefined;
            fid?: number | undefined;
            cls?: number | undefined;
            ttfb?: number | undefined;
        } | undefined;
    }, {
        enabled: boolean;
        budgets?: {
            lcp?: number | undefined;
            fid?: number | undefined;
            cls?: number | undefined;
            ttfb?: number | undefined;
        } | undefined;
    }>>;
} & {
    status: z.ZodLiteral<"quarantined">;
    owner: z.ZodString;
    statusReason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    actor: string;
    title: string;
    id: string;
    tier: "smoke" | "release" | "regression";
    scope: string;
    revision: number;
    modules: {
        foundation: string[];
        features: string[];
    };
    tests: (string | {
        file: string;
        line?: number | undefined;
    })[];
    status: "quarantined";
    owner: string;
    statusReason: string;
    testData?: {
        name: string;
        data: Record<string, any>;
        description?: string | undefined;
    }[] | undefined;
    tags?: string[] | undefined;
    data?: {
        strategy: "seed" | "create" | "reuse";
        cleanup: "required" | "best-effort" | "none";
    } | undefined;
    completion?: {
        value: string;
        type: "url" | "toast" | "element" | "title" | "api";
        options?: {
            exact?: boolean | undefined;
            status?: number | undefined;
            timeout?: number | undefined;
            state?: "visible" | "hidden" | "attached" | "detached" | undefined;
            method?: string | undefined;
        } | undefined;
    }[] | undefined;
    prerequisites?: string[] | undefined;
    negativePaths?: {
        name: string;
        input: Record<string, any>;
        expectedError: string;
        expectedElement?: string | undefined;
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
    } | undefined;
    performance?: {
        enabled: boolean;
        budgets?: {
            lcp?: number | undefined;
            fid?: number | undefined;
            cls?: number | undefined;
            ttfb?: number | undefined;
        } | undefined;
    } | undefined;
    links?: {
        issues?: string[] | undefined;
        prs?: string[] | undefined;
        docs?: string[] | undefined;
    } | undefined;
    flags?: {
        required?: string[] | undefined;
        forbidden?: string[] | undefined;
    } | undefined;
}, {
    actor: string;
    title: string;
    id: string;
    tier: "smoke" | "release" | "regression";
    scope: string;
    status: "quarantined";
    owner: string;
    statusReason: string;
    testData?: {
        name: string;
        data: Record<string, any>;
        description?: string | undefined;
    }[] | undefined;
    tags?: string[] | undefined;
    data?: {
        strategy?: "seed" | "create" | "reuse" | undefined;
        cleanup?: "required" | "best-effort" | "none" | undefined;
    } | undefined;
    completion?: {
        value: string;
        type: "url" | "toast" | "element" | "title" | "api";
        options?: {
            exact?: boolean | undefined;
            status?: number | undefined;
            timeout?: number | undefined;
            state?: "visible" | "hidden" | "attached" | "detached" | undefined;
            method?: string | undefined;
        } | undefined;
    }[] | undefined;
    revision?: number | undefined;
    prerequisites?: string[] | undefined;
    negativePaths?: {
        name: string;
        input: Record<string, any>;
        expectedError: string;
        expectedElement?: string | undefined;
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
    } | undefined;
    performance?: {
        enabled: boolean;
        budgets?: {
            lcp?: number | undefined;
            fid?: number | undefined;
            cls?: number | undefined;
            ttfb?: number | undefined;
        } | undefined;
    } | undefined;
    modules?: {
        foundation?: string[] | undefined;
        features?: string[] | undefined;
    } | undefined;
    tests?: (string | {
        file: string;
        line?: number | undefined;
    })[] | undefined;
    links?: {
        issues?: string[] | undefined;
        prs?: string[] | undefined;
        docs?: string[] | undefined;
    } | undefined;
    flags?: {
        required?: string[] | undefined;
        forbidden?: string[] | undefined;
    } | undefined;
}>, {
    actor: string;
    title: string;
    id: string;
    tier: "smoke" | "release" | "regression";
    scope: string;
    revision: number;
    modules: {
        foundation: string[];
        features: string[];
    };
    tests: (string | {
        file: string;
        line?: number | undefined;
    })[];
    status: "quarantined";
    owner: string;
    statusReason: string;
    testData?: {
        name: string;
        data: Record<string, any>;
        description?: string | undefined;
    }[] | undefined;
    tags?: string[] | undefined;
    data?: {
        strategy: "seed" | "create" | "reuse";
        cleanup: "required" | "best-effort" | "none";
    } | undefined;
    completion?: {
        value: string;
        type: "url" | "toast" | "element" | "title" | "api";
        options?: {
            exact?: boolean | undefined;
            status?: number | undefined;
            timeout?: number | undefined;
            state?: "visible" | "hidden" | "attached" | "detached" | undefined;
            method?: string | undefined;
        } | undefined;
    }[] | undefined;
    prerequisites?: string[] | undefined;
    negativePaths?: {
        name: string;
        input: Record<string, any>;
        expectedError: string;
        expectedElement?: string | undefined;
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
    } | undefined;
    performance?: {
        enabled: boolean;
        budgets?: {
            lcp?: number | undefined;
            fid?: number | undefined;
            cls?: number | undefined;
            ttfb?: number | undefined;
        } | undefined;
    } | undefined;
    links?: {
        issues?: string[] | undefined;
        prs?: string[] | undefined;
        docs?: string[] | undefined;
    } | undefined;
    flags?: {
        required?: string[] | undefined;
        forbidden?: string[] | undefined;
    } | undefined;
}, {
    actor: string;
    title: string;
    id: string;
    tier: "smoke" | "release" | "regression";
    scope: string;
    status: "quarantined";
    owner: string;
    statusReason: string;
    testData?: {
        name: string;
        data: Record<string, any>;
        description?: string | undefined;
    }[] | undefined;
    tags?: string[] | undefined;
    data?: {
        strategy?: "seed" | "create" | "reuse" | undefined;
        cleanup?: "required" | "best-effort" | "none" | undefined;
    } | undefined;
    completion?: {
        value: string;
        type: "url" | "toast" | "element" | "title" | "api";
        options?: {
            exact?: boolean | undefined;
            status?: number | undefined;
            timeout?: number | undefined;
            state?: "visible" | "hidden" | "attached" | "detached" | undefined;
            method?: string | undefined;
        } | undefined;
    }[] | undefined;
    revision?: number | undefined;
    prerequisites?: string[] | undefined;
    negativePaths?: {
        name: string;
        input: Record<string, any>;
        expectedError: string;
        expectedElement?: string | undefined;
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
    } | undefined;
    performance?: {
        enabled: boolean;
        budgets?: {
            lcp?: number | undefined;
            fid?: number | undefined;
            cls?: number | undefined;
            ttfb?: number | undefined;
        } | undefined;
    } | undefined;
    modules?: {
        foundation?: string[] | undefined;
        features?: string[] | undefined;
    } | undefined;
    tests?: (string | {
        file: string;
        line?: number | undefined;
    })[] | undefined;
    links?: {
        issues?: string[] | undefined;
        prs?: string[] | undefined;
        docs?: string[] | undefined;
    } | undefined;
    flags?: {
        required?: string[] | undefined;
        forbidden?: string[] | undefined;
    } | undefined;
}>;
/**
 * TypeScript types
 */
export type JourneyStatus = z.infer<typeof JourneyStatusSchema>;
export type JourneyTier = z.infer<typeof JourneyTierSchema>;
export type DataStrategy = z.infer<typeof DataStrategySchema>;
export type CleanupStrategy = z.infer<typeof CleanupStrategySchema>;
export type CompletionType = z.infer<typeof CompletionTypeSchema>;
export type CompletionSignal = z.infer<typeof CompletionSignalSchema>;
export type DataConfig = z.infer<typeof DataConfigSchema>;
export type Modules = z.infer<typeof ModulesSchema>;
export type TestRef = z.infer<typeof TestRefSchema>;
export type Links = z.infer<typeof LinksSchema>;
export type NegativePath = z.infer<typeof NegativePathSchema>;
export type TestDataSet = z.infer<typeof TestDataSetSchema>;
export type VisualRegression = z.infer<typeof VisualRegressionSchema>;
export type Accessibility = z.infer<typeof AccessibilitySchema>;
export type Performance = z.infer<typeof PerformanceSchema>;
export type JourneyFrontmatter = z.infer<typeof JourneyFrontmatterSchema>;
/**
 * Validate that a journey is ready for AutoGen (must be clarified)
 */
export declare function validateForAutoGen(frontmatter: JourneyFrontmatter): {
    valid: boolean;
    errors: string[];
};
//# sourceMappingURL=schema.d.ts.map