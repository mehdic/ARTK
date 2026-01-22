/**
 * AG Grid State Extraction
 *
 * Provides utilities for extracting the current grid state.
 *
 * @module grid/ag-grid/state
 */
import type { Locator } from '@playwright/test';
import type { AgGridState, NormalizedAgGridConfig, SortModel } from '../types.js';
/**
 * Extract the current state of the grid
 *
 * @param gridLocator - The grid root locator
 * @param config - Normalized grid configuration
 * @returns Current grid state
 */
export declare function getGridState(gridLocator: Locator, _config: NormalizedAgGridConfig): Promise<AgGridState>;
/**
 * Get the current sort state from header cells
 *
 * @param gridLocator - The grid root locator
 * @returns Array of sort models
 */
export declare function getSortState(gridLocator: Locator): Promise<SortModel[]>;
/**
 * Check if the grid is in a loading state
 *
 * @param gridLocator - The grid root locator
 * @returns True if loading overlay is visible
 */
export declare function checkIsLoading(gridLocator: Locator): Promise<boolean>;
/**
 * Get the total row count
 *
 * This tries multiple strategies:
 * 1. Read from pagination info if available
 * 2. Count visible rows if no pagination
 *
 * @param gridLocator - The grid root locator
 * @returns Total row count
 */
export declare function getTotalRowCount(gridLocator: Locator): Promise<number>;
/**
 * Check if the "no rows" overlay is visible
 *
 * @param gridLocator - The grid root locator
 * @returns True if no rows overlay is visible
 */
export declare function isNoRowsOverlayVisible(gridLocator: Locator): Promise<boolean>;
/**
 * Get the columns that are currently grouped (enterprise feature)
 *
 * @param gridLocator - The grid root locator
 * @returns Array of column IDs used for grouping
 */
export declare function getGroupedColumns(gridLocator: Locator): Promise<string[]>;
//# sourceMappingURL=state.d.ts.map