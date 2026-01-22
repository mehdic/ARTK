/**
 * AG Grid Row Data Extraction
 *
 * Provides utilities for extracting and finding row data.
 *
 * @module grid/ag-grid/row-data
 */
import type { Locator } from '@playwright/test';
import type { AgGridRowData, ClosestMatchResult, NormalizedAgGridConfig, RowMatcher } from '../types.js';
/**
 * Extract data from a row element
 *
 * @param rowLocator - The row locator
 * @param config - Normalized grid configuration
 * @returns Extracted row data
 */
export declare function getRowData(rowLocator: Locator, config: NormalizedAgGridConfig): Promise<AgGridRowData>;
/**
 * Extract data from all visible rows
 *
 * @param gridLocator - The grid root locator
 * @param config - Normalized grid configuration
 * @returns Array of row data
 */
export declare function getAllVisibleRowData(gridLocator: Locator, config: NormalizedAgGridConfig): Promise<AgGridRowData[]>;
/**
 * Find a row by matching criteria
 *
 * @param gridLocator - The grid root locator
 * @param matcher - Row matching criteria
 * @param config - Normalized grid configuration
 * @returns Locator for the matching row, or null if not found
 */
export declare function findRowByMatcher(gridLocator: Locator, matcher: RowMatcher, config: NormalizedAgGridConfig): Promise<{
    row: Locator;
    data: AgGridRowData;
} | null>;
/**
 * Check if a row's cell values match the expected values
 *
 * @param rowData - Row data to check
 * @param expectedValues - Expected cell values
 * @returns True if all expected values match
 */
export declare function matchesCellValues(rowData: AgGridRowData, expectedValues: Record<string, unknown>): boolean;
/**
 * Find the closest matching row for error messages
 *
 * @param gridLocator - The grid root locator
 * @param expectedValues - Expected cell values
 * @param config - Normalized grid configuration
 * @returns Closest match result
 */
export declare function findClosestMatch(gridLocator: Locator, expectedValues: Record<string, unknown>, config: NormalizedAgGridConfig): Promise<ClosestMatchResult | null>;
/**
 * Count visible rows in the grid
 *
 * @param gridLocator - The grid root locator
 * @returns Number of visible rows
 */
export declare function countVisibleRows(gridLocator: Locator): Promise<number>;
/**
 * Count selected rows in the grid
 *
 * @param gridLocator - The grid root locator
 * @returns Number of selected rows
 */
export declare function countSelectedRows(gridLocator: Locator): Promise<number>;
//# sourceMappingURL=row-data.d.ts.map