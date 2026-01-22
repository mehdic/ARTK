/**
 * AG Grid Scroll Utilities
 *
 * Provides functions for handling virtualized grids with row and column scrolling.
 *
 * @module grid/ag-grid/scroll
 */
import type { Locator } from '@playwright/test';
import type { RowMatcher } from '../types.js';
import { type GridLocatorContext } from './locators.js';
/**
 * Scroll to bring a specific row into view
 *
 * Uses incremental scrolling with ARIA-based targeting to handle virtualized grids.
 *
 * @param ctx - Grid locator context
 * @param matcher - Row matching criteria (must have ariaRowIndex for virtualized grids)
 * @returns Locator for the found row
 * @throws Error if row cannot be found after maximum attempts
 */
export declare function scrollToRow(ctx: GridLocatorContext, matcher: RowMatcher): Promise<Locator>;
/**
 * Scroll to bring a specific column into view (horizontal scrolling)
 *
 * @param ctx - Grid locator context
 * @param colId - Column ID to scroll to
 */
export declare function scrollToColumn(ctx: GridLocatorContext, colId: string): Promise<void>;
/**
 * Scroll to the top of the grid
 *
 * @param ctx - Grid locator context
 */
export declare function scrollToTop(ctx: GridLocatorContext): Promise<void>;
/**
 * Scroll to the bottom of the grid
 *
 * @param ctx - Grid locator context
 */
export declare function scrollToBottom(ctx: GridLocatorContext): Promise<void>;
/**
 * Get the current scroll position of the grid
 *
 * @param ctx - Grid locator context
 * @returns Object with scrollTop and scrollLeft values
 */
export declare function getScrollPosition(ctx: GridLocatorContext): Promise<{
    scrollTop: number;
    scrollLeft: number;
}>;
/**
 * Set the scroll position of the grid
 *
 * @param ctx - Grid locator context
 * @param scrollTop - Vertical scroll position
 * @param scrollLeft - Horizontal scroll position
 */
export declare function setScrollPosition(ctx: GridLocatorContext, scrollTop: number, scrollLeft: number): Promise<void>;
//# sourceMappingURL=scroll.d.ts.map