/**
 * AG Grid Locators
 *
 * Provides locator factories for AG Grid elements.
 *
 * @module grid/ag-grid/locators
 */
import type { Locator, Page } from '@playwright/test';
import type { NormalizedAgGridConfig, RowMatcher } from '../types.js';
/**
 * Locator context for a grid instance
 */
export interface GridLocatorContext {
    page: Page;
    config: NormalizedAgGridConfig;
    gridLocator: Locator;
}
/**
 * Create the grid locator context
 *
 * @param page - Playwright page
 * @param config - Normalized grid configuration
 * @returns Grid locator context
 */
export declare function createLocatorContext(page: Page, config: NormalizedAgGridConfig): GridLocatorContext;
/**
 * Get the root grid container locator
 *
 * @param ctx - Grid locator context
 * @returns Grid root locator
 */
export declare function getGrid(ctx: GridLocatorContext): Locator;
/**
 * Get a specific row by matcher criteria
 *
 * @param ctx - Grid locator context
 * @param matcher - Row matching criteria
 * @returns Row locator
 */
export declare function getRow(ctx: GridLocatorContext, matcher: RowMatcher): Locator;
/**
 * Get all visible rows in the grid
 *
 * @param ctx - Grid locator context
 * @returns Locator for all visible rows
 */
export declare function getVisibleRows(ctx: GridLocatorContext): Locator;
/**
 * Get a specific cell by row matcher and column ID
 *
 * @param ctx - Grid locator context
 * @param rowMatcher - Row matching criteria
 * @param colId - Column ID
 * @returns Cell locator
 */
export declare function getCell(ctx: GridLocatorContext, rowMatcher: RowMatcher, colId: string): Locator;
/**
 * Get a header cell by column ID
 *
 * @param ctx - Grid locator context
 * @param colId - Column ID
 * @returns Header cell locator
 */
export declare function getHeaderCell(ctx: GridLocatorContext, colId: string): Locator;
/**
 * Get the floating filter input for a column
 *
 * @param ctx - Grid locator context
 * @param colId - Column ID
 * @returns Filter input locator
 */
export declare function getFilterInput(ctx: GridLocatorContext, colId: string): Locator;
/**
 * Get the loading overlay locator
 *
 * @param ctx - Grid locator context
 * @returns Loading overlay locator
 */
export declare function getLoadingOverlay(ctx: GridLocatorContext): Locator;
/**
 * Get the "no rows" overlay locator
 *
 * @param ctx - Grid locator context
 * @returns No rows overlay locator
 */
export declare function getNoRowsOverlay(ctx: GridLocatorContext): Locator;
/**
 * Get the header select-all checkbox
 *
 * @param ctx - Grid locator context
 * @returns Select-all checkbox locator
 */
export declare function getSelectAllCheckbox(ctx: GridLocatorContext): Locator;
/**
 * Get the selection checkbox for a row
 *
 * @param ctx - Grid locator context
 * @param rowMatcher - Row matching criteria
 * @returns Row selection checkbox locator
 */
export declare function getRowSelectionCheckbox(ctx: GridLocatorContext, rowMatcher: RowMatcher): Locator;
/**
 * Get the group expand/collapse icon for a row
 *
 * @param ctx - Grid locator context
 * @param rowMatcher - Row matching criteria
 * @returns Group icon locator
 */
export declare function getGroupIcon(ctx: GridLocatorContext, rowMatcher: RowMatcher): Locator;
/**
 * Get the body viewport (scrollable container)
 *
 * @param ctx - Grid locator context
 * @returns Body viewport locator
 */
export declare function getBodyViewport(ctx: GridLocatorContext): Locator;
/**
 * Get the detail row for a master row (enterprise)
 *
 * @param ctx - Grid locator context
 * @param masterRowMatcher - Master row matching criteria
 * @returns Detail row locator
 */
export declare function getDetailRow(ctx: GridLocatorContext, masterRowMatcher: RowMatcher): Locator;
//# sourceMappingURL=locators.d.ts.map