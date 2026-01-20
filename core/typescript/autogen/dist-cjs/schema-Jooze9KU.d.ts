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
type AutogenConfig = z.infer<typeof AutogenConfigSchema>;

export { type AutogenConfig as A, EslintSeveritySchema as E, HealSchema as H, PathsSchema as P, RegenerationStrategySchema as R, SelectorStrategySchema as S, ValidationSchema as V, EslintRulesSchema as a, SelectorPolicySchema as b, AutogenConfigSchema as c, type SelectorStrategy as d, type Paths as e, type EslintSeverity as f, type SelectorPolicy as g, type Validation as h, type Heal as i, type RegenerationStrategy as j };
