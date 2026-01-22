/**
 * AG Grid Nested Detail Grids Support
 *
 * Provides utilities for testing grids with multi-level master/detail relationships,
 * including nested detail grids within detail grids.
 *
 * @module grid/ag-grid/enterprise/nested-detail
 */
import type { Locator, Page } from '@playwright/test';
import type { NormalizedAgGridConfig, RowMatcher, DetailGridPath, NestedDetailState, AgGridRowData } from '../../types.js';
import { AgGridHelperImpl } from '../helper.js';
/**
 * Maximum nesting depth to prevent infinite loops
 * AG Grid realistically supports 3-5 levels; 10 is a safe upper bound
 */
export declare const MAX_NESTING_DEPTH = 10;
/**
 * AG Grid nested detail CSS selectors
 */
export declare const NESTED_DETAIL_SELECTORS: {
    /** Master row */
    readonly MASTER_ROW: ".ag-row-master";
    /** Detail row container */
    readonly DETAIL_ROW: ".ag-details-row";
    /** Detail grid wrapper */
    readonly DETAIL_GRID: ".ag-details-grid";
    /** Full-width detail cell */
    readonly FULL_WIDTH_DETAIL: ".ag-full-width-row";
    /** Detail grid root wrapper */
    readonly DETAIL_ROOT: ".ag-root-wrapper";
    /** Expand icon for master row */
    readonly EXPAND_ICON: ".ag-group-contracted, .ag-icon-tree-closed";
    /** Collapse icon for expanded row */
    readonly COLLAPSE_ICON: ".ag-group-expanded, .ag-icon-tree-open";
    /** Row with detail open */
    readonly ROW_EXPANDED: ".ag-row-group-expanded";
    /** Detail panel */
    readonly DETAIL_PANEL: ".ag-details-row .ag-details-grid";
    /** Nested detail grid (detail within detail) */
    readonly NESTED_DETAIL_GRID: ".ag-details-row .ag-details-row .ag-root-wrapper";
};
/**
 * Get the master row locator for a specific row
 *
 * @param gridLocator - The grid root locator
 * @param matcher - Row matcher for the master row
 * @returns Locator for the master row
 */
export declare function getMasterRowLocator(gridLocator: Locator, matcher: RowMatcher): Locator;
/**
 * Expand a master row to show its detail grid
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @param matcher - Row matcher for the master row
 * @param config - Normalized grid configuration
 */
export declare function expandDetailRow(gridLocator: Locator, _page: Page, matcher: RowMatcher, _config: NormalizedAgGridConfig): Promise<void>;
/**
 * Collapse an expanded detail row
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @param matcher - Row matcher for the master row
 * @param config - Normalized grid configuration
 */
export declare function collapseDetailRow(gridLocator: Locator, _page: Page, matcher: RowMatcher, _config: NormalizedAgGridConfig): Promise<void>;
/**
 * Check if a detail row is expanded
 *
 * @param gridLocator - The grid root locator
 * @param matcher - Row matcher for the master row
 * @returns True if detail is expanded
 */
export declare function isDetailRowExpanded(gridLocator: Locator, matcher: RowMatcher): Promise<boolean>;
/**
 * Get the detail grid locator for a master row
 *
 * @param gridLocator - The grid root locator
 * @param matcher - Row matcher for the master row
 * @returns Locator for the detail grid
 */
export declare function getDetailGridLocator(gridLocator: Locator, matcher: RowMatcher): Locator;
/**
 * Get a nested detail grid at a specific path
 *
 * @param gridLocator - The root grid locator
 * @param path - Path of row matchers to traverse
 * @returns Locator for the nested detail grid
 */
export declare function getNestedDetailGridLocator(gridLocator: Locator, path: DetailGridPath): Locator;
/**
 * Create a helper for a nested detail grid
 *
 * @param page - Playwright page
 * @param gridLocator - The root grid locator
 * @param path - Path of row matchers to traverse
 * @param config - Base grid configuration
 * @returns AgGridHelper for the nested detail grid
 */
export declare function createNestedDetailHelper(page: Page, _gridLocator: Locator, path: DetailGridPath, config: NormalizedAgGridConfig): AgGridHelperImpl;
/**
 * Expand a path of nested detail grids
 *
 * @param gridLocator - The root grid locator
 * @param page - Playwright page
 * @param path - Path of row matchers to expand
 * @param config - Normalized grid configuration
 */
export declare function expandNestedPath(gridLocator: Locator, page: Page, path: DetailGridPath, config: NormalizedAgGridConfig): Promise<void>;
/**
 * Collapse a path of nested detail grids (from deepest to shallowest)
 *
 * @param gridLocator - The root grid locator
 * @param page - Playwright page
 * @param path - Path of row matchers to collapse
 * @param config - Normalized grid configuration
 */
export declare function collapseNestedPath(gridLocator: Locator, page: Page, path: DetailGridPath, config: NormalizedAgGridConfig): Promise<void>;
/**
 * Get the nesting depth of the current detail grid
 *
 * @param detailLocator - Locator for the detail grid
 * @returns Nesting depth (0 = root grid, 1 = first detail, etc.)
 */
export declare function getDetailNestingDepth(detailLocator: Locator): Promise<number>;
/**
 * Get the state of nested detail grids
 *
 * @param gridLocator - The grid root locator
 * @param config - Normalized grid configuration
 * @returns Nested detail state information
 */
export declare function getNestedDetailState(gridLocator: Locator, _config: NormalizedAgGridConfig): Promise<NestedDetailState>;
/**
 * Get all expanded detail row identifiers at a specific depth
 *
 * @param gridLocator - The grid root locator
 * @param depth - Nesting depth (1 = first level details)
 * @returns Array of row IDs that have expanded details
 */
export declare function getExpandedDetailRowsAtDepth(gridLocator: Locator, depth: number): Promise<string[]>;
/**
 * Expand all detail rows at a specific depth
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @param depth - Target depth (1 = expand all first-level details)
 * @param config - Normalized grid configuration
 */
export declare function expandAllAtDepth(gridLocator: Locator, _page: Page, depth: number, _config: NormalizedAgGridConfig): Promise<void>;
/**
 * Collapse all detail rows at a specific depth
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @param depth - Target depth (1 = collapse all first-level details)
 * @param config - Normalized grid configuration
 */
export declare function collapseAllAtDepth(gridLocator: Locator, _page: Page, depth: number, _config: NormalizedAgGridConfig): Promise<void>;
/**
 * Get row data from a nested detail grid
 *
 * @param gridLocator - The root grid locator
 * @param path - Path to the detail grid
 * @param config - Normalized grid configuration
 * @returns Array of row data from the nested detail grid
 */
export declare function getNestedDetailRowData(gridLocator: Locator, path: DetailGridPath, _config: NormalizedAgGridConfig): Promise<AgGridRowData[]>;
/**
 * Assert that a detail grid exists and is visible
 *
 * @param gridLocator - The grid root locator
 * @param matcher - Row matcher for the master row
 */
export declare function expectDetailVisible(gridLocator: Locator, matcher: RowMatcher): Promise<void>;
/**
 * Assert that a detail grid is collapsed/hidden
 *
 * @param gridLocator - The grid root locator
 * @param matcher - Row matcher for the master row
 */
export declare function expectDetailHidden(gridLocator: Locator, matcher: RowMatcher): Promise<void>;
/**
 * Assert nested detail grid at path exists
 *
 * @param gridLocator - The grid root locator
 * @param path - Path to the nested detail grid
 */
export declare function expectNestedDetailVisible(gridLocator: Locator, path: DetailGridPath): Promise<void>;
/**
 * Get the count of visible rows in a nested detail grid
 *
 * @param gridLocator - The root grid locator
 * @param path - Path to the detail grid
 * @returns Number of visible rows
 */
export declare function getNestedDetailRowCount(gridLocator: Locator, path: DetailGridPath): Promise<number>;
/**
 * Click a cell in a nested detail grid
 *
 * @param gridLocator - The root grid locator
 * @param path - Path to the detail grid
 * @param rowMatcher - Row matcher within the detail grid
 * @param colId - Column ID
 */
export declare function clickNestedDetailCell(gridLocator: Locator, path: DetailGridPath, rowMatcher: RowMatcher, colId: string): Promise<void>;
/**
 * Recursively expand all detail grids in the entire grid hierarchy
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @param config - Normalized grid configuration
 * @param maxDepth - Maximum depth to expand (default: 10)
 */
export declare function expandAllNestedDetails(gridLocator: Locator, page: Page, config: NormalizedAgGridConfig, maxDepth?: number): Promise<void>;
/**
 * Recursively collapse all detail grids in the entire grid hierarchy
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @param config - Normalized grid configuration
 */
export declare function collapseAllNestedDetails(gridLocator: Locator, page: Page, config: NormalizedAgGridConfig): Promise<void>;
//# sourceMappingURL=nested-detail.d.ts.map