import { L as LocatorStrategy, b as LocatorSpec } from '../types-DJnqAI1V.js';
import { A as AutogenConfig } from '../schema-BfEL3Qw5.js';
import 'zod';

/**
 * Selector Priority - Playwright best practices for selector selection
 * @see research/2026-01-02_autogen-refined-plan.md Section 11
 *
 * Priority order (per Playwright docs):
 * 1. role - ARIA roles (most stable, semantic)
 * 2. label - Form labels (accessible)
 * 3. placeholder - Input placeholders
 * 4. text - Visible text content
 * 5. testid - data-testid attributes
 * 6. css - CSS selectors (last resort)
 */

/**
 * Default selector priority
 */
declare const DEFAULT_SELECTOR_PRIORITY: LocatorStrategy[];
/**
 * Map from element type to preferred selector strategies
 */
declare const ELEMENT_TYPE_STRATEGIES: Record<string, LocatorStrategy[]>;
/**
 * ARIA roles that can have accessible names
 */
declare const NAMEABLE_ROLES: string[];
/**
 * Get selector priority from config or use defaults
 */
declare function getSelectorPriority(config?: AutogenConfig): LocatorStrategy[];
/**
 * Check if a selector strategy is forbidden by config
 */
declare function isForbiddenSelector(locator: LocatorSpec, config?: AutogenConfig): boolean;
/**
 * Score a locator based on priority (lower is better)
 */
declare function scoreLocator(locator: LocatorSpec, priority?: LocatorStrategy[]): number;
/**
 * Compare two locators and return the better one
 */
declare function compareLocators(a: LocatorSpec, b: LocatorSpec, priority?: LocatorStrategy[]): LocatorSpec;
/**
 * Select the best locator from alternatives
 */
declare function selectBestLocator(alternatives: LocatorSpec[], config?: AutogenConfig): LocatorSpec | null;
/**
 * Check if a locator is a role locator
 */
declare function isRoleLocator(locator: LocatorSpec): boolean;
/**
 * Check if a locator uses semantic selectors (role, label, text)
 */
declare function isSemanticLocator(locator: LocatorSpec): boolean;
/**
 * Check if a locator is a test ID locator
 */
declare function isTestIdLocator(locator: LocatorSpec): boolean;
/**
 * Check if a locator is a CSS locator (last resort)
 */
declare function isCssLocator(locator: LocatorSpec): boolean;
/**
 * Get recommended strategies for an element type
 */
declare function getRecommendedStrategies(elementType: string): LocatorStrategy[];
/**
 * Validate a locator against best practices
 */
declare function validateLocator(locator: LocatorSpec, config?: AutogenConfig): {
    valid: boolean;
    warnings: string[];
};
/**
 * Generate Playwright locator code from LocatorSpec
 */
declare function toPlaywrightLocator(locator: LocatorSpec): string;

/**
 * Selector Inference - Infer selectors from step text
 * @see research/2026-01-02_autogen-refined-plan.md Section 11
 * @see T092 - Integrate catalog querying into selector inference
 */

/**
 * Infer the element type from text
 */
declare function inferElementType(text: string): string | null;
/**
 * Infer the ARIA role from element type
 */
declare function inferRole(elementType: string): string | null;
/**
 * Extract a name/label from text
 */
declare function extractName(text: string): string | null;
/**
 * Infer selector alternatives from step text
 */
declare function inferSelectors(text: string): LocatorSpec[];
/**
 * Infer the best selector from step text
 */
declare function inferBestSelector(text: string): LocatorSpec | null;
/**
 * Infer selector for a button element
 */
declare function inferButtonSelector(name: string): LocatorSpec;
/**
 * Infer selector for a link element
 */
declare function inferLinkSelector(name: string): LocatorSpec;
/**
 * Infer selector for an input field
 */
declare function inferInputSelector(labelOrPlaceholder: string): LocatorSpec;
/**
 * Infer selector for a checkbox
 */
declare function inferCheckboxSelector(label: string): LocatorSpec;
/**
 * Infer selector for a heading
 */
declare function inferHeadingSelector(text: string, level?: number): LocatorSpec;
/**
 * Infer selector for a tab
 */
declare function inferTabSelector(name: string): LocatorSpec;
/**
 * Infer selector for generic text content
 */
declare function inferTextSelector(text: string): LocatorSpec;
/**
 * Infer selector from a test ID
 */
declare function inferTestIdSelector(testId: string): LocatorSpec;
/**
 * Create a CSS selector (last resort)
 */
declare function createCssSelector(selector: string): LocatorSpec;
/**
 * Analyze text and suggest the best selector approach
 */
declare function suggestSelectorApproach(text: string): {
    elementType: string | null;
    role: string | null;
    name: string | null;
    recommendedStrategy: LocatorStrategy;
    alternatives: LocatorSpec[];
};
/**
 * Infer selector with catalog lookup (T092)
 * First checks the catalog for a known selector, then falls back to inference
 */
declare function inferSelectorWithCatalog(text: string, options?: {
    useCatalog?: boolean;
}): LocatorSpec | null;
/**
 * Infer selectors with catalog augmentation (T092)
 * Returns catalog-based selectors first, then inferred alternatives
 */
declare function inferSelectorsWithCatalog(text: string, options?: {
    useCatalog?: boolean;
}): LocatorSpec[];

export { DEFAULT_SELECTOR_PRIORITY, ELEMENT_TYPE_STRATEGIES, NAMEABLE_ROLES, compareLocators, createCssSelector, extractName, getRecommendedStrategies, getSelectorPriority, inferBestSelector, inferButtonSelector, inferCheckboxSelector, inferElementType, inferHeadingSelector, inferInputSelector, inferLinkSelector, inferRole, inferSelectorWithCatalog, inferSelectors, inferSelectorsWithCatalog, inferTabSelector, inferTestIdSelector, inferTextSelector, isCssLocator, isForbiddenSelector, isRoleLocator, isSemanticLocator, isTestIdLocator, scoreLocator, selectBestLocator, suggestSelectorApproach, toPlaywrightLocator, validateLocator };
