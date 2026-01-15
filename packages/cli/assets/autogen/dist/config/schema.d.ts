/**
 * Zod schema for autogen.config.yml
 * @see research/2026-01-02_autogen-refined-plan.md Section 7
 */
import { z } from 'zod';
/**
 * Selector strategy types following Playwright priority
 */
export declare const SelectorStrategySchema: z.ZodEnum<["role", "label", "placeholder", "text", "testid", "css"]>;
/**
 * Path configuration for generated artifacts
 */
export declare const PathsSchema: z.ZodObject<{
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
export declare const EslintSeveritySchema: z.ZodEnum<["error", "warn", "off"]>;
/**
 * ESLint rules configuration
 */
export declare const EslintRulesSchema: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodEnum<["error", "warn", "off"]>>>;
/**
 * Selector policy configuration
 */
export declare const SelectorPolicySchema: z.ZodObject<{
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
export declare const ValidationSchema: z.ZodObject<{
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
export declare const HealSchema: z.ZodObject<{
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
export declare const RegenerationStrategySchema: z.ZodDefault<z.ZodEnum<["ast", "blocks"]>>;
/**
 * Complete AutoGen configuration schema
 */
export declare const AutogenConfigSchema: z.ZodObject<{
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
    validation: {
        eslintRules: Record<string, "error" | "warn" | "off">;
        customRules: string[];
    };
    version: 1;
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
    validation?: {
        eslintRules?: Record<string, "error" | "warn" | "off"> | undefined;
        customRules?: string[] | undefined;
    } | undefined;
    version?: 1 | undefined;
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
export type SelectorStrategy = z.infer<typeof SelectorStrategySchema>;
export type Paths = z.infer<typeof PathsSchema>;
export type EslintSeverity = z.infer<typeof EslintSeveritySchema>;
export type SelectorPolicy = z.infer<typeof SelectorPolicySchema>;
export type Validation = z.infer<typeof ValidationSchema>;
export type Heal = z.infer<typeof HealSchema>;
export type RegenerationStrategy = z.infer<typeof RegenerationStrategySchema>;
export type AutogenConfig = z.infer<typeof AutogenConfigSchema>;
//# sourceMappingURL=schema.d.ts.map