/**
 * AG Grid Server-Side Row Model Support
 *
 * Provides utilities for testing grids with server-side data loading,
 * infinite scrolling, and lazy loading patterns.
 *
 * @module grid/ag-grid/enterprise/server-side
 */
import type { Locator } from '@playwright/test';
import type { NormalizedAgGridConfig, ServerSideState, ServerSideOptions } from '../../types.js';
/**
 * AG Grid server-side row model CSS selectors
 */
export declare const SERVER_SIDE_SELECTORS: {
    /** Loading cell indicator */
    readonly LOADING_CELL: ".ag-loading";
    /** Skeleton row during load */
    readonly SKELETON_ROW: ".ag-skeleton-row";
    /** Infinite scroll viewport */
    readonly INFINITE_VIEWPORT: ".ag-body-viewport";
    /** Block loading indicator */
    readonly BLOCK_LOADING: "[data-block-loading=\"true\"]";
    /** Row with data loaded */
    readonly LOADED_ROW: ".ag-row:not(.ag-loading):not(.ag-skeleton-row)";
    /** Pagination panel for row count */
    readonly PAGINATION_PANEL: ".ag-paging-panel";
    /** Status bar with row count */
    readonly STATUS_BAR: ".ag-status-bar";
    /** Total row count indicator */
    readonly ROW_COUNT_INDICATOR: ".ag-paging-row-summary-panel, [data-total-rows]";
};
/**
 * Wait for a specific block of rows to be loaded
 *
 * @param gridLocator - The grid root locator
 * @param rowIndex - Target row index to wait for
 * @param config - Normalized grid configuration
 * @param options - Server-side options
 */
export declare function waitForBlockLoad(gridLocator: Locator, rowIndex: number, _config: NormalizedAgGridConfig, options?: ServerSideOptions): Promise<void>;
/**
 * Get the current server-side loading state
 *
 * @param gridLocator - The grid root locator
 * @param config - Normalized grid configuration
 * @returns Server-side state information
 */
export declare function getServerSideState(gridLocator: Locator, config: NormalizedAgGridConfig): Promise<ServerSideState>;
/**
 * Refresh server-side data by triggering a reload
 *
 * @param gridLocator - The grid root locator
 * @param config - Normalized grid configuration
 * @param options - Server-side options
 */
export declare function refreshServerSideData(gridLocator: Locator, _config: NormalizedAgGridConfig, options?: ServerSideOptions): Promise<void>;
/**
 * Scroll to a specific row with server-side loading support
 *
 * @param gridLocator - The grid root locator
 * @param rowIndex - Target row index (0-based)
 * @param config - Normalized grid configuration
 * @param options - Server-side options
 */
export declare function scrollToServerSideRow(gridLocator: Locator, rowIndex: number, config: NormalizedAgGridConfig, options?: ServerSideOptions): Promise<void>;
/**
 * Check if a specific row index is loaded (not a skeleton/loading row)
 *
 * @param gridLocator - The grid root locator
 * @param rowIndex - Row index to check (0-based)
 * @returns True if row is loaded
 */
export declare function isRowLoaded(gridLocator: Locator, rowIndex: number): Promise<boolean>;
/**
 * Wait for infinite scroll to load more rows
 *
 * @param gridLocator - The grid root locator
 * @param expectedMinRows - Minimum expected rows after load
 * @param config - Normalized grid configuration
 * @param options - Server-side options
 */
export declare function waitForInfiniteScrollLoad(gridLocator: Locator, expectedMinRows: number, _config: NormalizedAgGridConfig, options?: ServerSideOptions): Promise<void>;
//# sourceMappingURL=server-side.d.ts.map