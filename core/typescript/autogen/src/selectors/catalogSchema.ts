/**
 * Selector Catalog Schema - Define structure for repo-local selector catalog
 * @see T088 - Define selector catalog JSON schema
 */
import { z } from 'zod';

/**
 * Selector entry in the catalog
 */
export const SelectorEntrySchema = z.object({
  /** Unique identifier for this selector */
  id: z.string(),
  /** Human-readable description */
  description: z.string().optional(),
  /** The selector strategy */
  strategy: z.enum(['testid', 'role', 'label', 'text', 'css', 'xpath']),
  /** The selector value */
  value: z.string(),
  /** Additional options for the locator */
  options: z
    .object({
      name: z.string().optional(),
      exact: z.boolean().optional(),
      level: z.number().optional(),
    })
    .optional(),
  /** Component or page this selector belongs to */
  component: z.string().optional(),
  /** File where this selector was discovered */
  sourceFile: z.string().optional(),
  /** Line number in source file */
  sourceLine: z.number().optional(),
  /** Tags for categorization */
  tags: z.array(z.string()).optional(),
  /** Whether this is a stable selector (not likely to change) */
  stable: z.boolean().default(true),
  /** Last verified timestamp */
  lastVerified: z.string().optional(),
});

/**
 * Component entry in the catalog
 */
export const ComponentEntrySchema = z.object({
  /** Component name */
  name: z.string(),
  /** Component file path */
  path: z.string().optional(),
  /** Selectors within this component */
  selectors: z.array(z.string()), // References to selector IDs
  /** Child components */
  children: z.array(z.string()).optional(),
});

/**
 * Page entry in the catalog
 */
export const PageEntrySchema = z.object({
  /** Page name */
  name: z.string(),
  /** Route pattern */
  route: z.string().optional(),
  /** Page file path */
  path: z.string().optional(),
  /** Components on this page */
  components: z.array(z.string()).optional(),
  /** Direct selectors on this page */
  selectors: z.array(z.string()).optional(),
});

/**
 * CSS debt entry - tracks CSS selectors that should be migrated
 */
export const CSSDebtEntrySchema = z.object({
  /** The CSS selector being used */
  selector: z.string(),
  /** Files using this selector */
  usages: z.array(
    z.object({
      file: z.string(),
      line: z.number(),
    })
  ),
  /** Suggested replacement */
  suggestedReplacement: z
    .object({
      strategy: z.string(),
      value: z.string(),
    })
    .optional(),
  /** Priority for migration (higher = more urgent) */
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  /** Reason this is considered debt */
  reason: z.string().optional(),
});

/**
 * Complete selector catalog schema
 */
export const SelectorCatalogSchema = z.object({
  /** Schema version */
  version: z.string().default('1.0.0'),
  /** Generation timestamp */
  generatedAt: z.string(),
  /** Source directory that was scanned */
  sourceDir: z.string().optional(),
  /** All selectors indexed by ID */
  selectors: z.record(SelectorEntrySchema),
  /** Components indexed by name */
  components: z.record(ComponentEntrySchema).default({}),
  /** Pages indexed by name */
  pages: z.record(PageEntrySchema).default({}),
  /** TestIDs found in the codebase */
  testIds: z.array(z.string()).default([]),
  /** CSS debt entries */
  cssDebt: z.array(CSSDebtEntrySchema).default([]),
  /** Statistics */
  stats: z
    .object({
      totalSelectors: z.number(),
      byStrategy: z.record(z.number()),
      stableCount: z.number(),
      unstableCount: z.number(),
      cssDebtCount: z.number(),
    })
    .optional(),
});

export type SelectorEntry = z.infer<typeof SelectorEntrySchema>;
export type ComponentEntry = z.infer<typeof ComponentEntrySchema>;
export type PageEntry = z.infer<typeof PageEntrySchema>;
export type CSSDebtEntry = z.infer<typeof CSSDebtEntrySchema>;
export type SelectorCatalog = z.infer<typeof SelectorCatalogSchema>;

/**
 * Create an empty catalog
 */
export function createEmptyCatalog(): SelectorCatalog {
  return {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    selectors: {},
    components: {},
    pages: {},
    testIds: [],
    cssDebt: [],
  };
}

/**
 * Validate a catalog object
 */
export function validateCatalog(catalog: unknown): {
  valid: boolean;
  errors: string[];
  catalog?: SelectorCatalog;
} {
  const result = SelectorCatalogSchema.safeParse(catalog);

  if (result.success) {
    return { valid: true, errors: [], catalog: result.data };
  }

  return {
    valid: false,
    errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
  };
}
