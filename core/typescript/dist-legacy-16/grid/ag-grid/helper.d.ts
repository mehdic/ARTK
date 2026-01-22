/**
 * AG Grid Helper Class
 *
 * Main class implementing the AgGridHelper interface.
 *
 * @module grid/ag-grid/helper
 */
import type { Locator, Page } from '@playwright/test';
import type { AgGridHelper as IAgGridHelper, AgGridConfig, RowMatcher, AgGridRowData, AgGridState, AssertionOptions, RowCountOptions } from '../types.js';
/**
 * AG Grid Helper implementation
 */
export declare class AgGridHelperImpl implements IAgGridHelper {
    private page;
    private config;
    private ctx;
    constructor(page: Page, config: string | AgGridConfig);
    getGrid(): Locator;
    getRow(matcher: RowMatcher): Locator;
    getVisibleRows(): Locator;
    getCell(rowMatcher: RowMatcher, colId: string): Locator;
    getHeaderCell(colId: string): Locator;
    getFilterInput(colId: string): Locator;
    waitForReady(options?: {
        timeout?: number;
    }): Promise<void>;
    waitForDataLoaded(options?: {
        timeout?: number;
    }): Promise<void>;
    waitForRowCount(count: number, options?: {
        timeout?: number;
    }): Promise<void>;
    waitForRow(matcher: RowMatcher, options?: {
        timeout?: number;
    }): Promise<Locator>;
    expectRowCount(count: number, options?: RowCountOptions): Promise<void>;
    expectRowContains(cellValues: Record<string, unknown>, options?: AssertionOptions): Promise<void>;
    expectRowNotContains(cellValues: Record<string, unknown>, options?: AssertionOptions): Promise<void>;
    expectCellValue(rowMatcher: RowMatcher, colId: string, expectedValue: unknown, options?: AssertionOptions): Promise<void>;
    expectSortedBy(colId: string, direction: 'asc' | 'desc', options?: AssertionOptions): Promise<void>;
    expectEmpty(options?: AssertionOptions): Promise<void>;
    expectRowSelected(matcher: RowMatcher, options?: AssertionOptions): Promise<void>;
    expectNoRowsOverlay(options?: AssertionOptions): Promise<void>;
    clickCell(rowMatcher: RowMatcher, colId: string): Promise<void>;
    editCell(rowMatcher: RowMatcher, colId: string, newValue: string): Promise<void>;
    sortByColumn(colId: string, direction?: 'asc' | 'desc'): Promise<void>;
    filterColumn(colId: string, filterValue: string): Promise<void>;
    clearFilter(colId: string): Promise<void>;
    clearAllFilters(): Promise<void>;
    selectRow(matcher: RowMatcher): Promise<void>;
    deselectRow(matcher: RowMatcher): Promise<void>;
    selectAllRows(): Promise<void>;
    deselectAllRows(): Promise<void>;
    scrollToRow(matcher: RowMatcher): Promise<void>;
    scrollToColumn(colId: string): Promise<void>;
    expandGroup(matcher: RowMatcher): Promise<void>;
    collapseGroup(matcher: RowMatcher): Promise<void>;
    expandAllGroups(): Promise<void>;
    collapseAllGroups(): Promise<void>;
    getGroupChildCount(matcher: RowMatcher): Promise<number>;
    expandMasterRow(matcher: RowMatcher): Promise<void>;
    getDetailGrid(_masterRowMatcher: RowMatcher): IAgGridHelper;
    getCellValue(rowMatcher: RowMatcher, colId: string): Promise<unknown>;
    getRowData(matcher: RowMatcher): Promise<AgGridRowData>;
    getAllVisibleRowData(): Promise<AgGridRowData[]>;
    getGridState(): Promise<AgGridState>;
    getSelectedRowIds(): Promise<string[]>;
}
//# sourceMappingURL=helper.d.ts.map