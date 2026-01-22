import { type SelectorCatalog, type SelectorEntry } from './catalogSchema.js';
/**
 * Load selector catalog from file
 * @param path - Path to catalog JSON file
 */
export declare function loadCatalog(path?: string): SelectorCatalog;
/**
 * Save catalog to file
 * @param catalog - Catalog to save
 * @param path - Path to save to
 */
export declare function saveCatalog(catalog: SelectorCatalog, path?: string): void;
/**
 * Get the current catalog (loads if not cached)
 */
export declare function getCatalog(): SelectorCatalog;
/**
 * Reset catalog cache (for testing)
 */
export declare function resetCatalogCache(): void;
/**
 * Find a selector by ID
 */
export declare function findSelectorById(id: string): SelectorEntry | null;
/**
 * Find selectors by testid
 */
export declare function findByTestId(testId: string): SelectorEntry | null;
/**
 * Find selectors by component name
 */
export declare function findByComponent(componentName: string): SelectorEntry[];
/**
 * Find selectors by page name
 */
export declare function findByPage(pageName: string): SelectorEntry[];
/**
 * Search selectors by text (searches description, value, tags)
 */
export declare function searchSelectors(query: string): SelectorEntry[];
/**
 * Get all testids in the catalog
 */
export declare function getAllTestIds(): string[];
/**
 * Check if a testid exists in the catalog
 */
export declare function hasTestId(testId: string): boolean;
/**
 * Add a selector to the catalog
 */
export declare function addSelector(selector: SelectorEntry): void;
/**
 * Remove a selector from the catalog
 */
export declare function removeSelector(id: string): boolean;
/**
 * Get selectors that need migration (CSS debt)
 */
export declare function getCSSDebt(): SelectorCatalog['cssDebt'];
/**
 * Get stable selectors for a given element description
 * Useful for test generation to find the best available selector
 */
export declare function suggestSelector(description: string): SelectorEntry | null;
//# sourceMappingURL=catalog.d.ts.map