/**
 * Selector Catalog Loader - Load and query the selector catalog
 * @see T089 - Implement catalog loader
 */
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { mkdirSync } from 'node:fs';
import { createEmptyCatalog, validateCatalog, } from './catalogSchema.js';
/**
 * Default catalog file path
 */
const DEFAULT_CATALOG_PATH = 'config/selector-catalog.json';
/**
 * Catalog cache
 */
let catalogCache = null;
let catalogPath = null;
/**
 * Load selector catalog from file
 * @param path - Path to catalog JSON file
 */
export function loadCatalog(path) {
    const resolvedPath = resolve(path ?? DEFAULT_CATALOG_PATH);
    if (!existsSync(resolvedPath)) {
        console.warn(`Selector catalog not found at ${resolvedPath}, using empty catalog`);
        return createEmptyCatalog();
    }
    try {
        const content = readFileSync(resolvedPath, 'utf-8');
        const parsed = JSON.parse(content);
        const result = validateCatalog(parsed);
        if (!result.valid) {
            console.warn(`Invalid selector catalog at ${resolvedPath}: ${result.errors.join(', ')}`);
            return createEmptyCatalog();
        }
        catalogCache = result.catalog;
        catalogPath = resolvedPath;
        return catalogCache;
    }
    catch (_err) {
        console.warn(`Failed to load selector catalog from ${resolvedPath}`);
        return createEmptyCatalog();
    }
}
/**
 * Save catalog to file
 * @param catalog - Catalog to save
 * @param path - Path to save to
 */
export function saveCatalog(catalog, path) {
    const resolvedPath = resolve(path ?? catalogPath ?? DEFAULT_CATALOG_PATH);
    // Ensure directory exists
    const dir = dirname(resolvedPath);
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
    // Update generation timestamp
    catalog.generatedAt = new Date().toISOString();
    // Calculate stats
    catalog.stats = calculateStats(catalog);
    writeFileSync(resolvedPath, JSON.stringify(catalog, null, 2));
    catalogCache = catalog;
    catalogPath = resolvedPath;
}
/**
 * Calculate catalog statistics
 */
function calculateStats(catalog) {
    const selectors = Object.values(catalog.selectors);
    const byStrategy = {};
    let stableCount = 0;
    let unstableCount = 0;
    for (const selector of selectors) {
        byStrategy[selector.strategy] = (byStrategy[selector.strategy] ?? 0) + 1;
        if (selector.stable) {
            stableCount++;
        }
        else {
            unstableCount++;
        }
    }
    return {
        totalSelectors: selectors.length,
        byStrategy,
        stableCount,
        unstableCount,
        cssDebtCount: catalog.cssDebt?.length ?? 0,
    };
}
/**
 * Get the current catalog (loads if not cached)
 */
export function getCatalog() {
    if (!catalogCache) {
        catalogCache = loadCatalog();
    }
    return catalogCache;
}
/**
 * Reset catalog cache (for testing)
 */
export function resetCatalogCache() {
    catalogCache = null;
    catalogPath = null;
}
/**
 * Find a selector by ID
 */
export function findSelectorById(id) {
    const catalog = getCatalog();
    return catalog.selectors[id] ?? null;
}
/**
 * Find selectors by testid
 */
export function findByTestId(testId) {
    const catalog = getCatalog();
    for (const selector of Object.values(catalog.selectors)) {
        if (selector.strategy === 'testid' && selector.value === testId) {
            return selector;
        }
    }
    return null;
}
/**
 * Find selectors by component name
 */
export function findByComponent(componentName) {
    const catalog = getCatalog();
    const component = catalog.components[componentName];
    if (!component) {
        return [];
    }
    return component.selectors
        .map((id) => catalog.selectors[id])
        .filter((s) => s !== undefined);
}
/**
 * Find selectors by page name
 */
export function findByPage(pageName) {
    const catalog = getCatalog();
    const page = catalog.pages[pageName];
    if (!page) {
        return [];
    }
    const selectorIds = new Set();
    // Add direct page selectors
    for (const id of page.selectors ?? []) {
        selectorIds.add(id);
    }
    // Add component selectors
    for (const componentName of page.components ?? []) {
        const component = catalog.components[componentName];
        if (component) {
            for (const id of component.selectors) {
                selectorIds.add(id);
            }
        }
    }
    return Array.from(selectorIds)
        .map((id) => catalog.selectors[id])
        .filter((s) => s !== undefined);
}
/**
 * Search selectors by text (searches description, value, tags)
 */
export function searchSelectors(query) {
    const catalog = getCatalog();
    const lowerQuery = query.toLowerCase();
    return Object.values(catalog.selectors).filter((selector) => {
        if (selector.value.toLowerCase().includes(lowerQuery))
            return true;
        if (selector.description?.toLowerCase().includes(lowerQuery))
            return true;
        if (selector.component?.toLowerCase().includes(lowerQuery))
            return true;
        if (selector.tags?.some((t) => t.toLowerCase().includes(lowerQuery)))
            return true;
        return false;
    });
}
/**
 * Get all testids in the catalog
 */
export function getAllTestIds() {
    const catalog = getCatalog();
    return catalog.testIds;
}
/**
 * Check if a testid exists in the catalog
 */
export function hasTestId(testId) {
    const catalog = getCatalog();
    return catalog.testIds.includes(testId);
}
/**
 * Add a selector to the catalog
 */
export function addSelector(selector) {
    const catalog = getCatalog();
    catalog.selectors[selector.id] = selector;
    // Track testids
    if (selector.strategy === 'testid' && !catalog.testIds.includes(selector.value)) {
        catalog.testIds.push(selector.value);
    }
}
/**
 * Remove a selector from the catalog
 */
export function removeSelector(id) {
    const catalog = getCatalog();
    if (catalog.selectors[id]) {
        delete catalog.selectors[id];
        return true;
    }
    return false;
}
/**
 * Get selectors that need migration (CSS debt)
 */
export function getCSSDebt() {
    return getCatalog().cssDebt ?? [];
}
/**
 * Get stable selectors for a given element description
 * Useful for test generation to find the best available selector
 */
export function suggestSelector(description) {
    const results = searchSelectors(description);
    if (results.length === 0) {
        return null;
    }
    // Prefer stable selectors, then by strategy priority
    const strategyPriority = {
        testid: 1,
        role: 2,
        label: 3,
        text: 4,
        css: 5,
        xpath: 6,
    };
    return results.sort((a, b) => {
        // Stable first
        if (a.stable && !b.stable)
            return -1;
        if (!a.stable && b.stable)
            return 1;
        // Then by strategy priority
        return (strategyPriority[a.strategy] ?? 99) - (strategyPriority[b.strategy] ?? 99);
    })[0] ?? null;
}
//# sourceMappingURL=catalog.js.map