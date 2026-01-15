/**
 * Zod schema for autogen.config.yml
 * @see research/2026-01-02_autogen-refined-plan.md Section 7
 */
import { z } from 'zod';
/**
 * Selector strategy types following Playwright priority
 */
export const SelectorStrategySchema = z.enum([
    'role',
    'label',
    'placeholder',
    'text',
    'testid',
    'css',
]);
/**
 * Path configuration for generated artifacts
 */
export const PathsSchema = z.object({
    journeys: z.string().default('journeys'),
    modules: z.string().default('e2e/modules'),
    tests: z.string().default('e2e/tests'),
    templates: z.string().default('artk/templates'),
    catalog: z.string().default('artk/selectors'),
});
/**
 * ESLint rule severity
 */
export const EslintSeveritySchema = z.enum(['error', 'warn', 'off']);
/**
 * ESLint rules configuration
 */
export const EslintRulesSchema = z.record(z.string(), EslintSeveritySchema).default({
    'no-wait-for-timeout': 'error',
    'no-force-option': 'error',
    'prefer-web-first-assertions': 'error',
});
/**
 * Selector policy configuration
 */
export const SelectorPolicySchema = z.object({
    priority: z.array(SelectorStrategySchema).default([
        'role',
        'label',
        'placeholder',
        'text',
        'testid',
        'css',
    ]),
    forbiddenPatterns: z.array(z.string()).default([]),
});
/**
 * Validation configuration
 */
export const ValidationSchema = z.object({
    eslintRules: EslintRulesSchema.default({
        'no-wait-for-timeout': 'error',
        'no-force-option': 'error',
        'prefer-web-first-assertions': 'error',
    }),
    customRules: z.array(z.string()).default([]),
});
/**
 * Healing configuration
 */
export const HealSchema = z.object({
    enabled: z.boolean().default(true),
    maxSuggestions: z.number().min(1).max(10).default(5),
    skipPatterns: z.array(z.string()).default([]),
});
/**
 * Code regeneration strategy
 */
export const RegenerationStrategySchema = z.enum(['ast', 'blocks']).default('ast');
/**
 * Complete AutoGen configuration schema
 */
export const AutogenConfigSchema = z.object({
    version: z.literal(1).default(1),
    paths: PathsSchema.default({}),
    selectorPolicy: SelectorPolicySchema.default({}),
    validation: ValidationSchema.default({}),
    heal: HealSchema.default({}),
    regenerationStrategy: RegenerationStrategySchema,
});
//# sourceMappingURL=schema.js.map