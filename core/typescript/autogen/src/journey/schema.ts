/**
 * Journey Frontmatter Zod Schema
 * @see research/2026-01-02_autogen-refined-plan.md Section 8
 */
import { z } from 'zod';

/**
 * Journey status enum
 */
export const JourneyStatusSchema = z.enum([
  'proposed',
  'defined',
  'clarified',
  'implemented',
  'quarantined',
  'deprecated',
]);

/**
 * Journey tier enum
 */
export const JourneyTierSchema = z.enum(['smoke', 'release', 'regression']);

/**
 * Data strategy enum
 */
export const DataStrategySchema = z.enum(['seed', 'create', 'reuse']);

/**
 * Cleanup strategy enum
 */
export const CleanupStrategySchema = z.enum(['required', 'best-effort', 'none']);

/**
 * Completion signal type enum
 */
export const CompletionTypeSchema = z.enum(['url', 'toast', 'element', 'text', 'title', 'api']);

/**
 * Element state enum for completion signals
 */
export const ElementStateSchema = z.enum(['visible', 'hidden', 'attached', 'detached']);

/**
 * Completion signal schema
 */
export const CompletionSignalSchema = z.object({
  type: CompletionTypeSchema,
  value: z.string().min(1, 'Completion signal value is required'),
  options: z.object({
    timeout: z.number().positive().optional(),
    exact: z.boolean().optional(),
    state: ElementStateSchema.optional(),
    method: z.string().optional(),
    status: z.number().int().positive().optional(),
  }).optional(),
});

/**
 * Data configuration schema
 */
export const DataConfigSchema = z.object({
  strategy: DataStrategySchema.default('create'),
  cleanup: CleanupStrategySchema.default('best-effort'),
});

/**
 * Module dependencies schema
 */
export const ModulesSchema = z.object({
  foundation: z.array(z.string()).default([]),
  features: z.array(z.string()).default([]),
});

/**
 * Test reference schema
 */
export const TestRefSchema = z.object({
  file: z.string(),
  line: z.number().optional(),
});

/**
 * Link schema
 */
export const LinksSchema = z.object({
  issues: z.array(z.string()).optional(),
  prs: z.array(z.string()).optional(),
  docs: z.array(z.string()).optional(),
});

/**
 * Negative path schema for error scenario testing
 */
export const NegativePathSchema = z.object({
  name: z.string().min(1, 'Negative path name is required'),
  input: z.record(z.any()),
  expectedError: z.string().min(1, 'Expected error message is required'),
  expectedElement: z.string().optional(),
});

/**
 * Visual regression configuration schema
 */
export const VisualRegressionSchema = z.object({
  enabled: z.boolean(),
  snapshots: z.array(z.string()).optional(),
  threshold: z.number().min(0).max(1).optional(),
});

/**
 * Accessibility timing mode enum
 */
export const AccessibilityTimingSchema = z.enum(['afterEach', 'inTest']);

/**
 * Accessibility configuration schema
 */
export const AccessibilitySchema = z.object({
  enabled: z.boolean(),
  rules: z.array(z.string()).optional(),
  exclude: z.array(z.string()).optional(),
  /**
   * When to run accessibility checks:
   * - 'afterEach': Run after each test (default, catches issues but doesn't fail individual tests)
   * - 'inTest': Run within test steps (fails immediately, better for CI)
   */
  timing: AccessibilityTimingSchema.default('afterEach').optional(),
});

/**
 * Performance budgets schema
 */
export const PerformanceSchema = z.object({
  enabled: z.boolean(),
  budgets: z
    .object({
      lcp: z.number().positive().optional(),
      fid: z.number().positive().optional(),
      cls: z.number().min(0).optional(),
      ttfb: z.number().positive().optional(),
    })
    .optional(),
  /** Timeout for collecting performance metrics in ms (default: 3000) */
  collectTimeout: z.number().positive().default(3000).optional(),
});

/**
 * Test data set schema for parameterized/data-driven tests
 */
export const TestDataSetSchema = z.object({
  name: z.string().min(1, 'Test data set name is required'),
  description: z.string().optional(),
  data: z.record(z.string(), z.any()),
});

/**
 * Complete Journey frontmatter schema
 */
export const JourneyFrontmatterSchema = z.object({
  id: z
    .string()
    .regex(/^JRN-\d{4}$/, 'Journey ID must be in format JRN-XXXX'),
  title: z.string().min(1, 'Title is required'),
  status: JourneyStatusSchema,
  tier: JourneyTierSchema,
  scope: z.string().min(1, 'Scope is required'),
  actor: z.string().min(1, 'Actor is required'),
  revision: z.number().int().positive().default(1),
  owner: z.string().optional(),
  statusReason: z.string().optional(),
  modules: ModulesSchema.default({ foundation: [], features: [] }),
  tests: z.array(z.union([z.string(), TestRefSchema])).default([]),
  data: DataConfigSchema.optional(),
  completion: z.array(CompletionSignalSchema).optional(),
  links: LinksSchema.optional(),
  tags: z.array(z.string()).optional(),
  flags: z
    .object({
      required: z.array(z.string()).optional(),
      forbidden: z.array(z.string()).optional(),
    })
    .optional(),
  prerequisites: z
    .array(z.string())
    .optional()
    .describe('Array of Journey IDs that must run first'),
  negativePaths: z
    .array(NegativePathSchema)
    .optional()
    .describe('Error scenarios to test'),
  testData: z
    .array(TestDataSetSchema)
    .optional()
    .describe('Parameterized test data sets for data-driven testing'),
  visualRegression: VisualRegressionSchema.optional(),
  accessibility: AccessibilitySchema.optional(),
  performance: PerformanceSchema.optional(),
});

/**
 * Schema specifically for clarified journeys (required for AutoGen)
 */
export const ClarifiedJourneyFrontmatterSchema = JourneyFrontmatterSchema.extend({
  status: z.literal('clarified'),
}).refine(
  (data) => {
    // Clarified journeys should have completion signals
    return data.completion && data.completion.length > 0;
  },
  {
    message: 'Clarified journeys must have at least one completion signal',
    path: ['completion'],
  }
);

/**
 * Schema for implemented journeys (must have tests)
 */
export const ImplementedJourneyFrontmatterSchema = JourneyFrontmatterSchema.extend({
  status: z.literal('implemented'),
}).refine(
  (data) => {
    return data.tests && data.tests.length > 0;
  },
  {
    message: 'Implemented journeys must have at least one test reference',
    path: ['tests'],
  }
);

/**
 * Schema for quarantined journeys (must have owner and reason)
 */
export const QuarantinedJourneyFrontmatterSchema = JourneyFrontmatterSchema.extend({
  status: z.literal('quarantined'),
  owner: z.string().min(1, 'Quarantined journeys require an owner'),
  statusReason: z.string().min(1, 'Quarantined journeys require a status reason'),
}).refine(
  (data) => {
    return data.links?.issues && data.links.issues.length > 0;
  },
  {
    message: 'Quarantined journeys must have at least one linked issue',
    path: ['links', 'issues'],
  }
);

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
export function validateForAutoGen(
  frontmatter: JourneyFrontmatter
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (frontmatter.status !== 'clarified') {
    errors.push(
      `Journey status must be "clarified" for AutoGen, got "${frontmatter.status}"`
    );
  }

  if (!frontmatter.completion || frontmatter.completion.length === 0) {
    errors.push('Journey must have completion signals defined');
  }

  if (!frontmatter.actor) {
    errors.push('Journey must have an actor defined');
  }

  if (!frontmatter.scope) {
    errors.push('Journey must have a scope defined');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
