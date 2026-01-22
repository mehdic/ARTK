/**
 * AG Grid Assertions
 *
 * Provides assertion functions for grid state verification.
 *
 * @module grid/ag-grid/assertions
 */
import { type Locator } from '@playwright/test';
import type { AssertionOptions, NormalizedAgGridConfig, RowCountOptions, RowMatcher } from '../types.js';
/**
 * Assert that the grid has the expected row count
 *
 * @param gridLocator - The grid root locator
 * @param count - Expected row count
 * @param config - Normalized grid configuration
 * @param options - Assertion options
 */
export declare function expectRowCount(gridLocator: Locator, count: number, config: NormalizedAgGridConfig, options?: RowCountOptions): Promise<void>;
/**
 * Assert that the grid contains a row matching the given cell values
 *
 * @param gridLocator - The grid root locator
 * @param cellValues - Expected cell values
 * @param config - Normalized grid configuration
 * @param options - Assertion options
 */
export declare function expectRowContains(gridLocator: Locator, cellValues: Record<string, unknown>, config: NormalizedAgGridConfig, options?: AssertionOptions): Promise<void>;
/**
 * Assert that the grid does NOT contain a row matching the given cell values
 *
 * @param gridLocator - The grid root locator
 * @param cellValues - Cell values that should NOT match any row
 * @param config - Normalized grid configuration
 * @param options - Assertion options
 */
export declare function expectRowNotContains(gridLocator: Locator, cellValues: Record<string, unknown>, config: NormalizedAgGridConfig, options?: AssertionOptions): Promise<void>;
/**
 * Assert that a specific cell has the expected value
 *
 * @param gridLocator - The grid root locator
 * @param rowMatcher - Row matching criteria
 * @param colId - Column ID
 * @param expectedValue - Expected cell value
 * @param config - Normalized grid configuration
 * @param options - Assertion options
 */
export declare function expectCellValue(gridLocator: Locator, rowMatcher: RowMatcher, colId: string, expectedValue: unknown, config: NormalizedAgGridConfig, options?: AssertionOptions): Promise<void>;
/**
 * Assert that the grid is sorted by a specific column
 *
 * @param gridLocator - The grid root locator
 * @param colId - Column ID
 * @param direction - Expected sort direction
 * @param config - Normalized grid configuration
 * @param options - Assertion options
 */
export declare function expectSortedBy(gridLocator: Locator, colId: string, direction: 'asc' | 'desc', config: NormalizedAgGridConfig, _options?: AssertionOptions): Promise<void>;
/**
 * Assert that the grid is empty (no data rows)
 *
 * @param gridLocator - The grid root locator
 * @param config - Normalized grid configuration
 * @param options - Assertion options
 */
export declare function expectEmpty(gridLocator: Locator, _config: NormalizedAgGridConfig, options?: AssertionOptions): Promise<void>;
/**
 * Assert that the "no rows" overlay is visible
 *
 * @param gridLocator - The grid root locator
 * @param config - Normalized grid configuration
 * @param options - Assertion options
 */
export declare function expectNoRowsOverlay(gridLocator: Locator, config: NormalizedAgGridConfig, _options?: AssertionOptions): Promise<void>;
/**
 * Assert that a row is selected
 *
 * @param gridLocator - The grid root locator
 * @param matcher - Row matching criteria
 * @param config - Normalized grid configuration
 * @param options - Assertion options
 */
export declare function expectRowSelected(gridLocator: Locator, matcher: RowMatcher, config: NormalizedAgGridConfig, _options?: AssertionOptions): Promise<void>;
//# sourceMappingURL=assertions.d.ts.map