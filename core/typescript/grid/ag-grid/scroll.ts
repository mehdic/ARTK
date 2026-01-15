/**
 * AG Grid Scroll Utilities
 *
 * Provides functions for handling virtualized grids with row and column scrolling.
 *
 * @module grid/ag-grid/scroll
 */

import type { Locator } from '@playwright/test';
import type { NormalizedAgGridConfig, RowMatcher } from '../types.js';
import { AG_GRID_SELECTORS, getAriaRowIndex } from './selectors.js';
import { getBodyViewport, type GridLocatorContext } from './locators.js';

/**
 * Maximum number of scroll attempts before giving up
 */
const MAX_SCROLL_ATTEMPTS = 100;

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
export async function scrollToRow(
  ctx: GridLocatorContext,
  matcher: RowMatcher
): Promise<Locator> {
  const { gridLocator, config } = ctx;
  const viewport = getBodyViewport(ctx);
  const scrollInterval = config.timeouts.scroll;

  // If we have a specific aria-rowindex target, use scroll strategy
  if (matcher.ariaRowIndex !== undefined) {
    return scrollToAriaRowIndex(gridLocator, viewport, matcher.ariaRowIndex, scrollInterval);
  }

  // For rowId, try to find it first, then scroll
  if (matcher.rowId !== undefined) {
    const row = gridLocator.locator(
      `${AG_GRID_SELECTORS.ROW}[${AG_GRID_SELECTORS.ATTR_ROW_ID}="${matcher.rowId}"]`
    );
    const count = await row.count();
    if (count > 0) {
      await row.first().scrollIntoViewIfNeeded();
      return row.first();
    }

    // Row not visible - may need to scroll to find it
    // This is more complex as we don't know the aria-rowindex
    throw new Error(
      `Row with id "${matcher.rowId}" not found in visible rows. ` +
      `For virtualized grids, use ariaRowIndex for more reliable scrolling.`
    );
  }

  // For rowIndex, it's the viewport index (0-based)
  if (matcher.rowIndex !== undefined) {
    const row = gridLocator.locator(
      `${AG_GRID_SELECTORS.ROW}[${AG_GRID_SELECTORS.ATTR_ROW_INDEX}="${matcher.rowIndex}"]`
    );
    const count = await row.count();
    if (count > 0) {
      await row.first().scrollIntoViewIfNeeded();
      return row.first();
    }

    throw new Error(`Row at index ${matcher.rowIndex} not found`);
  }

  throw new Error('scrollToRow requires ariaRowIndex, rowId, or rowIndex in the matcher');
}

/**
 * Scroll to a specific aria-rowindex in a virtualized grid
 *
 * @param gridLocator - The grid root locator
 * @param viewport - The body viewport locator
 * @param targetAriaIndex - Target aria-rowindex (1-based)
 * @param scrollInterval - Delay between scroll operations
 * @returns Locator for the found row
 */
async function scrollToAriaRowIndex(
  gridLocator: Locator,
  viewport: Locator,
  targetAriaIndex: number,
  scrollInterval: number
): Promise<Locator> {
  let attempts = 0;

  while (attempts < MAX_SCROLL_ATTEMPTS) {
    // Check if target row is visible
    const targetRow = gridLocator.locator(
      `${AG_GRID_SELECTORS.ROW}[${AG_GRID_SELECTORS.ATTR_ARIA_ROW_INDEX}="${targetAriaIndex}"]`
    );
    const count = await targetRow.count();

    if (count > 0) {
      // Found it - ensure it's scrolled into view
      await targetRow.first().scrollIntoViewIfNeeded();
      return targetRow.first();
    }

    // Get the range of currently visible rows
    const visibleRows = await gridLocator.locator(`${AG_GRID_SELECTORS.ROW}[${AG_GRID_SELECTORS.ATTR_ARIA_ROW_INDEX}]`).all();

    if (visibleRows.length === 0) {
      throw new Error('No rows visible in the grid');
    }

    const firstVisibleIndex = await getAriaRowIndex(visibleRows[0]);
    const lastVisibleIndex = await getAriaRowIndex(visibleRows[visibleRows.length - 1]);

    // Determine scroll direction
    if (targetAriaIndex < firstVisibleIndex) {
      // Scroll up
      await scrollViewport(viewport, 'up');
    } else if (targetAriaIndex > lastVisibleIndex) {
      // Scroll down
      await scrollViewport(viewport, 'down');
    } else {
      // Target should be visible but wasn't found - this is unexpected
      throw new Error(
        `Row at aria-rowindex ${targetAriaIndex} should be visible ` +
        `(range: ${firstVisibleIndex}-${lastVisibleIndex}) but was not found`
      );
    }

    // Wait for DOM to update
    await gridLocator.page().waitForTimeout(scrollInterval);
    attempts++;
  }

  throw new Error(
    `Could not find row at aria-rowindex ${targetAriaIndex} after ${MAX_SCROLL_ATTEMPTS} scroll attempts`
  );
}

/**
 * Scroll the viewport in a specific direction
 *
 * @param viewport - The body viewport locator
 * @param direction - 'up' or 'down'
 */
async function scrollViewport(
  viewport: Locator,
  direction: 'up' | 'down'
): Promise<void> {
  await viewport.evaluate((el, dir) => {
    const scrollAmount = el.clientHeight * 0.8; // Scroll by 80% of viewport height
    if (dir === 'up') {
      el.scrollTop -= scrollAmount;
    } else {
      el.scrollTop += scrollAmount;
    }
  }, direction);
}

/**
 * Scroll to bring a specific column into view (horizontal scrolling)
 *
 * @param ctx - Grid locator context
 * @param colId - Column ID to scroll to
 */
export async function scrollToColumn(
  ctx: GridLocatorContext,
  colId: string
): Promise<void> {
  const { gridLocator, config } = ctx;

  // Find a cell with the target column ID
  const cell = gridLocator.locator(`.ag-cell[col-id="${colId}"]`).first();
  const count = await cell.count();

  if (count > 0) {
    await cell.scrollIntoViewIfNeeded();
    return;
  }

  // If cell not found, try scrolling horizontally
  const viewport = getBodyViewport(ctx);
  const scrollInterval = config.timeouts.scroll;

  for (let attempts = 0; attempts < MAX_SCROLL_ATTEMPTS; attempts++) {
    // Check if column is now visible
    const targetCell = gridLocator.locator(`.ag-cell[col-id="${colId}"]`).first();
    const cellCount = await targetCell.count();

    if (cellCount > 0) {
      await targetCell.scrollIntoViewIfNeeded();
      return;
    }

    // Scroll right
    await viewport.evaluate((el) => {
      el.scrollLeft += el.clientWidth * 0.5;
    });

    await gridLocator.page().waitForTimeout(scrollInterval);
  }

  throw new Error(
    `Could not find column "${colId}" after ${MAX_SCROLL_ATTEMPTS} scroll attempts`
  );
}

/**
 * Scroll to the top of the grid
 *
 * @param ctx - Grid locator context
 */
export async function scrollToTop(ctx: GridLocatorContext): Promise<void> {
  const viewport = getBodyViewport(ctx);
  await viewport.evaluate((el) => {
    el.scrollTop = 0;
  });
  await ctx.page.waitForTimeout(ctx.config.timeouts.scroll);
}

/**
 * Scroll to the bottom of the grid
 *
 * @param ctx - Grid locator context
 */
export async function scrollToBottom(ctx: GridLocatorContext): Promise<void> {
  const viewport = getBodyViewport(ctx);
  await viewport.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await ctx.page.waitForTimeout(ctx.config.timeouts.scroll);
}

/**
 * Get the current scroll position of the grid
 *
 * @param ctx - Grid locator context
 * @returns Object with scrollTop and scrollLeft values
 */
export async function getScrollPosition(
  ctx: GridLocatorContext
): Promise<{ scrollTop: number; scrollLeft: number }> {
  const viewport = getBodyViewport(ctx);
  return viewport.evaluate((el) => ({
    scrollTop: el.scrollTop,
    scrollLeft: el.scrollLeft,
  }));
}

/**
 * Set the scroll position of the grid
 *
 * @param ctx - Grid locator context
 * @param scrollTop - Vertical scroll position
 * @param scrollLeft - Horizontal scroll position
 */
export async function setScrollPosition(
  ctx: GridLocatorContext,
  scrollTop: number,
  scrollLeft: number
): Promise<void> {
  const viewport = getBodyViewport(ctx);
  await viewport.evaluate(
    (el, pos) => {
      el.scrollTop = pos.scrollTop;
      el.scrollLeft = pos.scrollLeft;
    },
    { scrollTop, scrollLeft }
  );
  await ctx.page.waitForTimeout(ctx.config.timeouts.scroll);
}
