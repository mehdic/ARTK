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
import type { LocatorSpec, LocatorStrategy } from '../ir/types.js';
import type { AutogenConfig } from '../config/schema.js';
/**
 * Default selector priority
 */
export declare const DEFAULT_SELECTOR_PRIORITY: LocatorStrategy[];
/**
 * Map from element type to preferred selector strategies
 */
export declare const ELEMENT_TYPE_STRATEGIES: Record<string, LocatorStrategy[]>;
/**
 * ARIA roles that can have accessible names
 */
export declare const NAMEABLE_ROLES: string[];
/**
 * Get selector priority from config or use defaults
 */
export declare function getSelectorPriority(config?: AutogenConfig): LocatorStrategy[];
/**
 * Check if a selector strategy is forbidden by config
 */
export declare function isForbiddenSelector(locator: LocatorSpec, config?: AutogenConfig): boolean;
/**
 * Score a locator based on priority (lower is better)
 */
export declare function scoreLocator(locator: LocatorSpec, priority?: LocatorStrategy[]): number;
/**
 * Compare two locators and return the better one
 */
export declare function compareLocators(a: LocatorSpec, b: LocatorSpec, priority?: LocatorStrategy[]): LocatorSpec;
/**
 * Select the best locator from alternatives
 */
export declare function selectBestLocator(alternatives: LocatorSpec[], config?: AutogenConfig): LocatorSpec | null;
/**
 * Check if a locator is a role locator
 */
export declare function isRoleLocator(locator: LocatorSpec): boolean;
/**
 * Check if a locator uses semantic selectors (role, label, text)
 */
export declare function isSemanticLocator(locator: LocatorSpec): boolean;
/**
 * Check if a locator is a test ID locator
 */
export declare function isTestIdLocator(locator: LocatorSpec): boolean;
/**
 * Check if a locator is a CSS locator (last resort)
 */
export declare function isCssLocator(locator: LocatorSpec): boolean;
/**
 * Get recommended strategies for an element type
 */
export declare function getRecommendedStrategies(elementType: string): LocatorStrategy[];
/**
 * Validate a locator against best practices
 */
export declare function validateLocator(locator: LocatorSpec, config?: AutogenConfig): {
    valid: boolean;
    warnings: string[];
};
/**
 * Generate Playwright locator code from LocatorSpec
 */
export declare function toPlaywrightLocator(locator: LocatorSpec): string;
//# sourceMappingURL=priority.d.ts.map