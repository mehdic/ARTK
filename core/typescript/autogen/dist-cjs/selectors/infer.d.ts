/**
 * Selector Inference - Infer selectors from step text
 * @see research/2026-01-02_autogen-refined-plan.md Section 11
 * @see T092 - Integrate catalog querying into selector inference
 */
import type { LocatorSpec, LocatorStrategy } from '../ir/types.js';
/**
 * Infer the element type from text
 */
export declare function inferElementType(text: string): string | null;
/**
 * Infer the ARIA role from element type
 */
export declare function inferRole(elementType: string): string | null;
/**
 * Extract a name/label from text
 */
export declare function extractName(text: string): string | null;
/**
 * Infer selector alternatives from step text
 */
export declare function inferSelectors(text: string): LocatorSpec[];
/**
 * Infer the best selector from step text
 */
export declare function inferBestSelector(text: string): LocatorSpec | null;
/**
 * Infer selector for a button element
 */
export declare function inferButtonSelector(name: string): LocatorSpec;
/**
 * Infer selector for a link element
 */
export declare function inferLinkSelector(name: string): LocatorSpec;
/**
 * Infer selector for an input field
 */
export declare function inferInputSelector(labelOrPlaceholder: string): LocatorSpec;
/**
 * Infer selector for a checkbox
 */
export declare function inferCheckboxSelector(label: string): LocatorSpec;
/**
 * Infer selector for a heading
 */
export declare function inferHeadingSelector(text: string, level?: number): LocatorSpec;
/**
 * Infer selector for a tab
 */
export declare function inferTabSelector(name: string): LocatorSpec;
/**
 * Infer selector for generic text content
 */
export declare function inferTextSelector(text: string): LocatorSpec;
/**
 * Infer selector from a test ID
 */
export declare function inferTestIdSelector(testId: string): LocatorSpec;
/**
 * Create a CSS selector (last resort)
 */
export declare function createCssSelector(selector: string): LocatorSpec;
/**
 * Analyze text and suggest the best selector approach
 */
export declare function suggestSelectorApproach(text: string): {
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
export declare function inferSelectorWithCatalog(text: string, options?: {
    useCatalog?: boolean;
}): LocatorSpec | null;
/**
 * Infer selectors with catalog augmentation (T092)
 * Returns catalog-based selectors first, then inferred alternatives
 */
export declare function inferSelectorsWithCatalog(text: string, options?: {
    useCatalog?: boolean;
}): LocatorSpec[];
//# sourceMappingURL=infer.d.ts.map