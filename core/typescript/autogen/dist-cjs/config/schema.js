"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutogenConfigSchema = exports.RegenerationStrategySchema = exports.HealSchema = exports.ValidationSchema = exports.SelectorPolicySchema = exports.EslintRulesSchema = exports.EslintSeveritySchema = exports.PathsSchema = exports.SelectorStrategySchema = void 0;
/**
 * Zod schema for autogen.config.yml
 * @see research/2026-01-02_autogen-refined-plan.md Section 7
 */
const zod_1 = require("zod");
/**
 * Selector strategy types following Playwright priority
 */
exports.SelectorStrategySchema = zod_1.z.enum([
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
exports.PathsSchema = zod_1.z.object({
    journeys: zod_1.z.string().default('journeys'),
    modules: zod_1.z.string().default('e2e/modules'),
    tests: zod_1.z.string().default('e2e/tests'),
    templates: zod_1.z.string().default('artk/templates'),
    catalog: zod_1.z.string().default('artk/selectors'),
});
/**
 * ESLint rule severity
 */
exports.EslintSeveritySchema = zod_1.z.enum(['error', 'warn', 'off']);
/**
 * ESLint rules configuration
 */
exports.EslintRulesSchema = zod_1.z.record(zod_1.z.string(), exports.EslintSeveritySchema).default({
    'no-wait-for-timeout': 'error',
    'no-force-option': 'error',
    'prefer-web-first-assertions': 'error',
});
/**
 * Selector policy configuration
 */
exports.SelectorPolicySchema = zod_1.z.object({
    priority: zod_1.z.array(exports.SelectorStrategySchema).default([
        'role',
        'label',
        'placeholder',
        'text',
        'testid',
        'css',
    ]),
    forbiddenPatterns: zod_1.z.array(zod_1.z.string()).default([]),
});
/**
 * Validation configuration
 */
exports.ValidationSchema = zod_1.z.object({
    eslintRules: exports.EslintRulesSchema.default({
        'no-wait-for-timeout': 'error',
        'no-force-option': 'error',
        'prefer-web-first-assertions': 'error',
    }),
    customRules: zod_1.z.array(zod_1.z.string()).default([]),
});
/**
 * Healing configuration
 */
exports.HealSchema = zod_1.z.object({
    enabled: zod_1.z.boolean().default(true),
    maxSuggestions: zod_1.z.number().min(1).max(10).default(5),
    skipPatterns: zod_1.z.array(zod_1.z.string()).default([]),
});
/**
 * Code regeneration strategy
 */
exports.RegenerationStrategySchema = zod_1.z.enum(['ast', 'blocks']).default('ast');
/**
 * Complete AutoGen configuration schema
 */
exports.AutogenConfigSchema = zod_1.z.object({
    version: zod_1.z.literal(1).default(1),
    paths: exports.PathsSchema.default({}),
    selectorPolicy: exports.SelectorPolicySchema.default({}),
    validation: exports.ValidationSchema.default({}),
    heal: exports.HealSchema.default({}),
    regenerationStrategy: exports.RegenerationStrategySchema,
});
//# sourceMappingURL=schema.js.map