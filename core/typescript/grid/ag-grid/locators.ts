/**
 * AG Grid Locators
 *
 * Provides locator factories for AG Grid elements.
 *
 * @module grid/ag-grid/locators
 */

import type { Locator, Page } from '@playwright/test';
import type { NormalizedAgGridConfig, RowMatcher } from '../types.js';
import {
  AG_GRID_SELECTORS,
  buildCellSelector,
  buildRowSelector,
  buildHeaderCellSelector,
  buildFilterInputSelector,
  getGridRoot,
} from './selectors.js';

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
export function createLocatorContext(
  page: Page,
  config: NormalizedAgGridConfig
): GridLocatorContext {
  return {
    page,
    config,
    gridLocator: getGridRoot(page, config.selector),
  };
}

/**
 * Get the root grid container locator
 *
 * @param ctx - Grid locator context
 * @returns Grid root locator
 */
export function getGrid(ctx: GridLocatorContext): Locator {
  return ctx.gridLocator;
}

/**
 * Get a specific row by matcher criteria
 *
 * @param ctx - Grid locator context
 * @param matcher - Row matching criteria
 * @returns Row locator
 */
export function getRow(ctx: GridLocatorContext, matcher: RowMatcher): Locator {
  const { gridLocator } = ctx;

  // Priority order: ariaRowIndex > rowId > rowIndex > cellValues
  if (matcher.ariaRowIndex !== undefined) {
    return gridLocator.locator(buildRowSelector({ ariaRowIndex: matcher.ariaRowIndex }));
  }

  if (matcher.rowId !== undefined) {
    return gridLocator.locator(buildRowSelector({ rowId: matcher.rowId }));
  }

  if (matcher.rowIndex !== undefined) {
    return gridLocator.locator(buildRowSelector({ rowIndex: matcher.rowIndex }));
  }

  // For cellValues, return all rows (filtering will be done in assertions)
  // The actual filtering requires async evaluation
  return gridLocator.locator(AG_GRID_SELECTORS.ROW);
}

/**
 * Get all visible rows in the grid
 *
 * @param ctx - Grid locator context
 * @returns Locator for all visible rows
 */
export function getVisibleRows(ctx: GridLocatorContext): Locator {
  return ctx.gridLocator.locator(AG_GRID_SELECTORS.ROW);
}

/**
 * Get a specific cell by row matcher and column ID
 *
 * @param ctx - Grid locator context
 * @param rowMatcher - Row matching criteria
 * @param colId - Column ID
 * @returns Cell locator
 */
export function getCell(
  ctx: GridLocatorContext,
  rowMatcher: RowMatcher,
  colId: string
): Locator {
  const rowLocator = getRow(ctx, rowMatcher);
  return rowLocator.locator(buildCellSelector(colId));
}

/**
 * Get a header cell by column ID
 *
 * @param ctx - Grid locator context
 * @param colId - Column ID
 * @returns Header cell locator
 */
export function getHeaderCell(ctx: GridLocatorContext, colId: string): Locator {
  return ctx.gridLocator.locator(buildHeaderCellSelector(colId));
}

/**
 * Get the floating filter input for a column
 *
 * @param ctx - Grid locator context
 * @param colId - Column ID
 * @returns Filter input locator
 */
export function getFilterInput(ctx: GridLocatorContext, colId: string): Locator {
  return ctx.gridLocator.locator(buildFilterInputSelector(colId));
}

/**
 * Get the loading overlay locator
 *
 * @param ctx - Grid locator context
 * @returns Loading overlay locator
 */
export function getLoadingOverlay(ctx: GridLocatorContext): Locator {
  return ctx.gridLocator.locator(AG_GRID_SELECTORS.LOADING_OVERLAY);
}

/**
 * Get the "no rows" overlay locator
 *
 * @param ctx - Grid locator context
 * @returns No rows overlay locator
 */
export function getNoRowsOverlay(ctx: GridLocatorContext): Locator {
  return ctx.gridLocator.locator(AG_GRID_SELECTORS.NO_ROWS_OVERLAY);
}

/**
 * Get the header select-all checkbox
 *
 * @param ctx - Grid locator context
 * @returns Select-all checkbox locator
 */
export function getSelectAllCheckbox(ctx: GridLocatorContext): Locator {
  return ctx.gridLocator.locator(AG_GRID_SELECTORS.HEADER_SELECT_ALL);
}

/**
 * Get the selection checkbox for a row
 *
 * @param ctx - Grid locator context
 * @param rowMatcher - Row matching criteria
 * @returns Row selection checkbox locator
 */
export function getRowSelectionCheckbox(
  ctx: GridLocatorContext,
  rowMatcher: RowMatcher
): Locator {
  const rowLocator = getRow(ctx, rowMatcher);
  return rowLocator.locator(AG_GRID_SELECTORS.SELECTION_CHECKBOX);
}

/**
 * Get the group expand/collapse icon for a row
 *
 * @param ctx - Grid locator context
 * @param rowMatcher - Row matching criteria
 * @returns Group icon locator
 */
export function getGroupIcon(ctx: GridLocatorContext, rowMatcher: RowMatcher): Locator {
  const rowLocator = getRow(ctx, rowMatcher);
  return rowLocator.locator(
    `${AG_GRID_SELECTORS.GROUP_EXPANDED}, ${AG_GRID_SELECTORS.GROUP_CONTRACTED}`
  );
}

/**
 * Get the body viewport (scrollable container)
 *
 * @param ctx - Grid locator context
 * @returns Body viewport locator
 */
export function getBodyViewport(ctx: GridLocatorContext): Locator {
  return ctx.gridLocator.locator(AG_GRID_SELECTORS.BODY_VIEWPORT);
}

/**
 * Get the detail row for a master row (enterprise)
 *
 * @param ctx - Grid locator context
 * @param masterRowMatcher - Master row matching criteria
 * @returns Detail row locator
 */
export function getDetailRow(
  ctx: GridLocatorContext,
  masterRowMatcher: RowMatcher
): Locator {
  const masterRow = getRow(ctx, masterRowMatcher);

  // Detail row is typically a sibling or following row with .ag-details-row class
  // In AG Grid, detail rows follow their master row
  if (masterRowMatcher.ariaRowIndex !== undefined) {
    // Detail row has aria-rowindex = master + 1 for detail
    return ctx.gridLocator.locator(
      `${AG_GRID_SELECTORS.DETAILS_ROW}, ${AG_GRID_SELECTORS.FULL_WIDTH_ROW}`
    ).filter({
      has: masterRow.page().locator(`[aria-rowindex="${masterRowMatcher.ariaRowIndex + 1}"]`),
    });
  }

  // Fallback: find detail row near the master row
  return ctx.gridLocator.locator(AG_GRID_SELECTORS.DETAILS_ROW);
}
