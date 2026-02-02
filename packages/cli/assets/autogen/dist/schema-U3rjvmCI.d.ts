import { z } from 'zod';

/**
 * Zod schema for autogen.config.yml
 * @see research/2026-01-02_autogen-refined-plan.md Section 7
 */

/**
 * Selector strategy types following Playwright priority
 */
declare const SelectorStrategySchema: z.ZodEnum<["role", "label", "placeholder", "text", "testid", "css"]>;
/**
 * Path configuration for generated artifacts
 */
declare const PathsSchema: z.ZodObject<{
    journeys: z.ZodDefault<z.ZodString>;
    modules: z.ZodDefault<z.ZodString>;
    tests: z.ZodDefault<z.ZodString>;
    templates: z.ZodDefault<z.ZodString>;
    catalog: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    journeys: string;
    modules: string;
    tests: string;
    templates: string;
    catalog: string;
}, {
    journeys?: string | undefined;
    modules?: string | undefined;
    tests?: string | undefined;
    templates?: string | undefined;
    catalog?: string | undefined;
}>;
/**
 * ESLint rule severity
 */
declare const EslintSeveritySchema: z.ZodEnum<["error", "warn", "off"]>;
/**
 * ESLint rules configuration
 */
declare const EslintRulesSchema: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodEnum<["error", "warn", "off"]>>>;
/**
 * Selector policy configuration
 */
declare const SelectorPolicySchema: z.ZodObject<{
    priority: z.ZodDefault<z.ZodArray<z.ZodEnum<["role", "label", "placeholder", "text", "testid", "css"]>, "many">>;
    forbiddenPatterns: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    priority: ("role" | "label" | "placeholder" | "text" | "testid" | "css")[];
    forbiddenPatterns: string[];
}, {
    priority?: ("role" | "label" | "placeholder" | "text" | "testid" | "css")[] | undefined;
    forbiddenPatterns?: string[] | undefined;
}>;
/**
 * Validation configuration
 */
declare const ValidationSchema: z.ZodObject<{
    eslintRules: z.ZodDefault<z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodEnum<["error", "warn", "off"]>>>>;
    customRules: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    eslintRules: Record<string, "error" | "warn" | "off">;
    customRules: string[];
}, {
    eslintRules?: Record<string, "error" | "warn" | "off"> | undefined;
    customRules?: string[] | undefined;
}>;
/**
 * Healing configuration
 */
declare const HealSchema: z.ZodObject<{
    enabled: z.ZodDefault<z.ZodBoolean>;
    maxSuggestions: z.ZodDefault<z.ZodNumber>;
    skipPatterns: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    enabled: boolean;
    maxSuggestions: number;
    skipPatterns: string[];
}, {
    enabled?: boolean | undefined;
    maxSuggestions?: number | undefined;
    skipPatterns?: string[] | undefined;
}>;
/**
 * Code regeneration strategy
 */
declare const RegenerationStrategySchema: z.ZodDefault<z.ZodEnum<["ast", "blocks"]>>;
/**
 * LLKB integration level
 * - minimal: Only load patterns, no glossary extension
 * - enhance: Load patterns and extend glossary (default)
 * - aggressive: Full LLKB integration with selector overrides
 */
declare const LLKBIntegrationLevelSchema: z.ZodDefault<z.ZodEnum<["minimal", "enhance", "aggressive"]>>;
/**
 * LLKB integration configuration (optional)
 * @see research/2026-01-23_llkb-autogen-integration-specification.md
 */
declare const LLKBIntegrationSchema: z.ZodDefault<z.ZodObject<{
    /** Enable LLKB integration (default: true - LLKB enhances test generation) */
    enabled: z.ZodDefault<z.ZodBoolean>;
    /** Path to LLKB-generated config file */
    configPath: z.ZodOptional<z.ZodString>;
    /** Path to LLKB-generated glossary file */
    glossaryPath: z.ZodOptional<z.ZodString>;
    /** Integration level */
    level: z.ZodDefault<z.ZodEnum<["minimal", "enhance", "aggressive"]>>;
}, "strip", z.ZodTypeAny, {
    enabled: boolean;
    level: "minimal" | "enhance" | "aggressive";
    configPath?: string | undefined;
    glossaryPath?: string | undefined;
}, {
    enabled?: boolean | undefined;
    configPath?: string | undefined;
    glossaryPath?: string | undefined;
    level?: "minimal" | "enhance" | "aggressive" | undefined;
}>>;
/**
 * Complete AutoGen configuration schema
 */
declare const AutogenConfigSchema: z.ZodObject<{
    version: z.ZodDefault<z.ZodLiteral<1>>;
    paths: z.ZodDefault<z.ZodObject<{
        journeys: z.ZodDefault<z.ZodString>;
        modules: z.ZodDefault<z.ZodString>;
        tests: z.ZodDefault<z.ZodString>;
        templates: z.ZodDefault<z.ZodString>;
        catalog: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        journeys: string;
        modules: string;
        tests: string;
        templates: string;
        catalog: string;
    }, {
        journeys?: string | undefined;
        modules?: string | undefined;
        tests?: string | undefined;
        templates?: string | undefined;
        catalog?: string | undefined;
    }>>;
    selectorPolicy: z.ZodDefault<z.ZodObject<{
        priority: z.ZodDefault<z.ZodArray<z.ZodEnum<["role", "label", "placeholder", "text", "testid", "css"]>, "many">>;
        forbiddenPatterns: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        priority: ("role" | "label" | "placeholder" | "text" | "testid" | "css")[];
        forbiddenPatterns: string[];
    }, {
        priority?: ("role" | "label" | "placeholder" | "text" | "testid" | "css")[] | undefined;
        forbiddenPatterns?: string[] | undefined;
    }>>;
    validation: z.ZodDefault<z.ZodObject<{
        eslintRules: z.ZodDefault<z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodEnum<["error", "warn", "off"]>>>>;
        customRules: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        eslintRules: Record<string, "error" | "warn" | "off">;
        customRules: string[];
    }, {
        eslintRules?: Record<string, "error" | "warn" | "off"> | undefined;
        customRules?: string[] | undefined;
    }>>;
    heal: z.ZodDefault<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        maxSuggestions: z.ZodDefault<z.ZodNumber>;
        skipPatterns: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        maxSuggestions: number;
        skipPatterns: string[];
    }, {
        enabled?: boolean | undefined;
        maxSuggestions?: number | undefined;
        skipPatterns?: string[] | undefined;
    }>>;
    regenerationStrategy: z.ZodDefault<z.ZodEnum<["ast", "blocks"]>>;
    llkb: z.ZodDefault<z.ZodObject<{
        /** Enable LLKB integration (default: true - LLKB enhances test generation) */
        enabled: z.ZodDefault<z.ZodBoolean>;
        /** Path to LLKB-generated config file */
        configPath: z.ZodOptional<z.ZodString>;
        /** Path to LLKB-generated glossary file */
        glossaryPath: z.ZodOptional<z.ZodString>;
        /** Integration level */
        level: z.ZodDefault<z.ZodEnum<["minimal", "enhance", "aggressive"]>>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        level: "minimal" | "enhance" | "aggressive";
        configPath?: string | undefined;
        glossaryPath?: string | undefined;
    }, {
        enabled?: boolean | undefined;
        configPath?: string | undefined;
        glossaryPath?: string | undefined;
        level?: "minimal" | "enhance" | "aggressive" | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    version: 1;
    validation: {
        eslintRules: Record<string, "error" | "warn" | "off">;
        customRules: string[];
    };
    paths: {
        journeys: string;
        modules: string;
        tests: string;
        templates: string;
        catalog: string;
    };
    selectorPolicy: {
        priority: ("role" | "label" | "placeholder" | "text" | "testid" | "css")[];
        forbiddenPatterns: string[];
    };
    heal: {
        enabled: boolean;
        maxSuggestions: number;
        skipPatterns: string[];
    };
    regenerationStrategy: "ast" | "blocks";
    llkb: {
        enabled: boolean;
        level: "minimal" | "enhance" | "aggressive";
        configPath?: string | undefined;
        glossaryPath?: string | undefined;
    };
}, {
    version?: 1 | undefined;
    validation?: {
        eslintRules?: Record<string, "error" | "warn" | "off"> | undefined;
        customRules?: string[] | undefined;
    } | undefined;
    paths?: {
        journeys?: string | undefined;
        modules?: string | undefined;
        tests?: string | undefined;
        templates?: string | undefined;
        catalog?: string | undefined;
    } | undefined;
    selectorPolicy?: {
        priority?: ("role" | "label" | "placeholder" | "text" | "testid" | "css")[] | undefined;
        forbiddenPatterns?: string[] | undefined;
    } | undefined;
    heal?: {
        enabled?: boolean | undefined;
        maxSuggestions?: number | undefined;
        skipPatterns?: string[] | undefined;
    } | undefined;
    regenerationStrategy?: "ast" | "blocks" | undefined;
    llkb?: {
        enabled?: boolean | undefined;
        configPath?: string | undefined;
        glossaryPath?: string | undefined;
        level?: "minimal" | "enhance" | "aggressive" | undefined;
    } | undefined;
}>;
/**
 * TypeScript types derived from schemas
 */
type SelectorStrategy = z.infer<typeof SelectorStrategySchema>;
type Paths = z.infer<typeof PathsSchema>;
type EslintSeverity = z.infer<typeof EslintSeveritySchema>;
type SelectorPolicy = z.infer<typeof SelectorPolicySchema>;
type Validation = z.infer<typeof ValidationSchema>;
type Heal = z.infer<typeof HealSchema>;
type RegenerationStrategy = z.infer<typeof RegenerationStrategySchema>;
type LLKBIntegrationLevel = z.infer<typeof LLKBIntegrationLevelSchema>;
type LLKBIntegration = z.infer<typeof LLKBIntegrationSchema>;
type AutogenConfig = z.infer<typeof AutogenConfigSchema>;

export { type AutogenConfig as A, EslintSeveritySchema as E, HealSchema as H, LLKBIntegrationLevelSchema as L, PathsSchema as P, RegenerationStrategySchema as R, SelectorStrategySchema as S, ValidationSchema as V, EslintRulesSchema as a, SelectorPolicySchema as b, LLKBIntegrationSchema as c, AutogenConfigSchema as d, type SelectorStrategy as e, type Paths as f, type EslintSeverity as g, type SelectorPolicy as h, type Validation as i, type Heal as j, type RegenerationStrategy as k, type LLKBIntegrationLevel as l, type LLKBIntegration as m };
