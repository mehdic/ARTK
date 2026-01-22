/**
 * AG Grid Wait Utilities
 *
 * Provides wait functions for grid ready states and data loading.
 *
 * @module grid/ag-grid/wait
 */
import type { Locator } from '@playwright/test';
import type { NormalizedAgGridConfig, RowMatcher } from '../types.js';
/**
 * Wait for the grid to be fully rendered and ready for interaction
 *
 * @param gridLocator - The grid root locator
 * @param config - Normalized grid configuration
 * @param options - Wait options
 */
export declare function waitForReady(gridLocator: Locator, config: NormalizedAgGridConfig, options?: {
    timeout?: number;
}): Promise<void>;
/**
 * Wait for the loading overlay to disappear
 *
 * @param gridLocator - The grid root locator
 * @param config - Normalized grid configuration
 * @param options - Wait options
 */
export declare function waitForDataLoaded(gridLocator: Locator, config: NormalizedAgGridConfig, options?: {
    timeout?: number;
}): Promise<void>;
/**
 * Wait for a specific number of rows to be visible
 *
 * @param gridLocator - The grid root locator
 * @param count - Expected row count
 * @param config - Normalized grid configuration
 * @param options - Wait options
 */
export declare function waitForRowCount(gridLocator: Locator, count: number, config: NormalizedAgGridConfig, options?: {
    timeout?: number;
}): Promise<void>;
/**
 * Wait for at least one row to be visible
 *
 * @param gridLocator - The grid root locator
 * @param config - Normalized grid configuration
 * @param options - Wait options
 */
export declare function waitForAnyRows(gridLocator: Locator, config: NormalizedAgGridConfig, options?: {
    timeout?: number;
}): Promise<void>;
/**
 * Wait for a specific row to appear in the DOM
 *
 * @param gridLocator - The grid root locator
 * @param matcher - Row matching criteria
 * @param config - Normalized grid configuration
 * @param options - Wait options
 * @returns Locator for the found row
 */
export declare function waitForRow(gridLocator: Locator, matcher: RowMatcher, config: NormalizedAgGridConfig, options?: {
    timeout?: number;
}): Promise<Locator>;
/**
 * Wait for the grid to show the "no rows" overlay
 *
 * @param gridLocator - The grid root locator
 * @param config - Normalized grid configuration
 * @param options - Wait options
 */
export declare function waitForNoRowsOverlay(gridLocator: Locator, config: NormalizedAgGridConfig, options?: {
    timeout?: number;
}): Promise<void>;
/**
 * Wait for a cell to be in edit mode
 *
 * @param cellLocator - The cell locator
 * @param config - Normalized grid configuration
 * @param options - Wait options
 */
export declare function waitForCellEditing(cellLocator: Locator, config: NormalizedAgGridConfig, options?: {
    timeout?: number;
}): Promise<void>;
//# sourceMappingURL=wait.d.ts.map