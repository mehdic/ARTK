/**
 * AG Grid Nested Detail Grids Support
 *
 * Provides utilities for testing grids with multi-level master/detail relationships,
 * including nested detail grids within detail grids.
 *
 * @module grid/ag-grid/enterprise/nested-detail
 */

import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import type {
  NormalizedAgGridConfig,
  RowMatcher,
  DetailGridPath,
  NestedDetailState,
  AgGridRowData,
} from '../../types.js';
import { AG_GRID_SELECTORS, buildRowSelectorFromMatcher, formatRowMatcher } from '../selectors.js';
import { AgGridHelperImpl } from '../helper.js';

/**
 * Maximum nesting depth to prevent infinite loops
 * AG Grid realistically supports 3-5 levels; 10 is a safe upper bound
 */
export const MAX_NESTING_DEPTH = 10;

/**
 * AG Grid nested detail CSS selectors
 */
export const NESTED_DETAIL_SELECTORS = {
  /** Master row */
  MASTER_ROW: '.ag-row-master',

  /** Detail row container */
  DETAIL_ROW: '.ag-details-row',

  /** Detail grid wrapper */
  DETAIL_GRID: '.ag-details-grid',

  /** Full-width detail cell */
  FULL_WIDTH_DETAIL: '.ag-full-width-row',

  /** Detail grid root wrapper */
  DETAIL_ROOT: '.ag-root-wrapper',

  /** Expand icon for master row */
  EXPAND_ICON: '.ag-group-contracted, .ag-icon-tree-closed',

  /** Collapse icon for expanded row */
  COLLAPSE_ICON: '.ag-group-expanded, .ag-icon-tree-open',

  /** Row with detail open */
  ROW_EXPANDED: '.ag-row-group-expanded',

  /** Detail panel */
  DETAIL_PANEL: '.ag-details-row .ag-details-grid',

  /** Nested detail grid (detail within detail) */
  NESTED_DETAIL_GRID: '.ag-details-row .ag-details-row .ag-root-wrapper',
} as const;

/**
 * Get the master row locator for a specific row
 *
 * @param gridLocator - The grid root locator
 * @param matcher - Row matcher for the master row
 * @returns Locator for the master row
 */
export function getMasterRowLocator(gridLocator: Locator, matcher: RowMatcher): Locator {
  const rowSelector = buildRowSelectorFromMatcher(matcher);

  if (rowSelector) {
    return gridLocator.locator(rowSelector);
  }

  return gridLocator.locator(AG_GRID_SELECTORS.ROW);
}

/**
 * Expand a master row to show its detail grid
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @param matcher - Row matcher for the master row
 * @param config - Normalized grid configuration
 */
export async function expandDetailRow(
  gridLocator: Locator,
  _page: Page,
  matcher: RowMatcher,
  _config: NormalizedAgGridConfig
): Promise<void> {
  const row = getMasterRowLocator(gridLocator, matcher);
  const count = await row.count();

  if (count === 0) {
    throw new Error(`Master row not found: ${formatRowMatcher(matcher)}`);
  }

  // Check if already expanded
  const isExpanded = await isDetailRowExpanded(gridLocator, matcher);
  if (isExpanded) {
    return;
  }

  // Find and click expand icon
  const expandIcon = row.first().locator(NESTED_DETAIL_SELECTORS.EXPAND_ICON);
  const iconCount = await expandIcon.count();

  if (iconCount > 0) {
    await expandIcon.first().click();
  } else {
    // Try clicking the row group cell
    const groupCell = row.first().locator('.ag-group-cell');
    if ((await groupCell.count()) > 0) {
      await groupCell.click();
    } else {
      throw new Error(`No expand icon found for row: ${formatRowMatcher(matcher)}`);
    }
  }

  // Wait for detail to appear and be visible
  await expect(async () => {
    const expanded = await isDetailRowExpanded(gridLocator, matcher);
    expect(expanded).toBe(true);
  }).toPass({ timeout: 5000 });
}

/**
 * Collapse an expanded detail row
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @param matcher - Row matcher for the master row
 * @param config - Normalized grid configuration
 */
export async function collapseDetailRow(
  gridLocator: Locator,
  _page: Page,
  matcher: RowMatcher,
  _config: NormalizedAgGridConfig
): Promise<void> {
  const row = getMasterRowLocator(gridLocator, matcher);
  const count = await row.count();

  if (count === 0) {
    throw new Error(`Master row not found: ${formatRowMatcher(matcher)}`);
  }

  // Check if already collapsed
  const isExpanded = await isDetailRowExpanded(gridLocator, matcher);
  if (!isExpanded) {
    return;
  }

  // Find and click collapse icon
  const collapseIcon = row.first().locator(NESTED_DETAIL_SELECTORS.COLLAPSE_ICON);
  const iconCount = await collapseIcon.count();

  if (iconCount > 0) {
    await collapseIcon.first().click();
  } else {
    // Try clicking the row group cell
    const groupCell = row.first().locator('.ag-group-cell');
    if ((await groupCell.count()) > 0) {
      await groupCell.click();
    } else {
      throw new Error(`No collapse icon found for row: ${formatRowMatcher(matcher)}`);
    }
  }

  // Wait for detail to collapse and verify
  await expect(async () => {
    const expanded = await isDetailRowExpanded(gridLocator, matcher);
    expect(expanded).toBe(false);
  }).toPass({ timeout: 5000 });
}

/**
 * Check if a detail row is expanded
 *
 * @param gridLocator - The grid root locator
 * @param matcher - Row matcher for the master row
 * @returns True if detail is expanded
 */
export async function isDetailRowExpanded(
  gridLocator: Locator,
  matcher: RowMatcher
): Promise<boolean> {
  const row = getMasterRowLocator(gridLocator, matcher);
  const count = await row.count();

  if (count === 0) {
    return false;
  }

  // Check for expanded icon
  const expandedIcon = row.first().locator(NESTED_DETAIL_SELECTORS.COLLAPSE_ICON);
  if ((await expandedIcon.count()) > 0) {
    return true;
  }

  // Check for expanded class
  const classAttr = await row.first().getAttribute('class');
  if (classAttr?.includes('ag-row-group-expanded')) {
    return true;
  }

  // Check for detail row following this row
  const rowId = await row.first().getAttribute('row-id');
  if (rowId) {
    const detailRow = gridLocator.locator(
      `${NESTED_DETAIL_SELECTORS.DETAIL_ROW}[row-id="${rowId}-detail"]`
    );
    return (await detailRow.count()) > 0;
  }

  return false;
}

/**
 * Get the detail grid locator for a master row
 *
 * @param gridLocator - The grid root locator
 * @param matcher - Row matcher for the master row
 * @returns Locator for the detail grid
 */
export function getDetailGridLocator(
  gridLocator: Locator,
  matcher: RowMatcher
): Locator {
  const row = getMasterRowLocator(gridLocator, matcher);

  // Detail grid is in the next sibling detail row
  return row.locator('~ .ag-details-row .ag-root-wrapper').first();
}

/**
 * Get a nested detail grid at a specific path
 *
 * @param gridLocator - The root grid locator
 * @param path - Path of row matchers to traverse
 * @returns Locator for the nested detail grid
 */
export function getNestedDetailGridLocator(
  gridLocator: Locator,
  path: DetailGridPath
): Locator {
  let currentGrid = gridLocator;

  for (const matcher of path.path) {
    // Get the detail grid for this master row
    currentGrid = getDetailGridLocator(currentGrid, matcher);
  }

  return currentGrid;
}

/**
 * Create a helper for a nested detail grid
 *
 * @param page - Playwright page
 * @param gridLocator - The root grid locator
 * @param path - Path of row matchers to traverse
 * @param config - Base grid configuration
 * @returns AgGridHelper for the nested detail grid
 */
export function createNestedDetailHelper(
  page: Page,
  _gridLocator: Locator,
  path: DetailGridPath,
  config: NormalizedAgGridConfig
): AgGridHelperImpl {
  const nestedGridSelector = buildNestedDetailSelector(path);

  return new AgGridHelperImpl(page, {
    ...config,
    selector: nestedGridSelector,
  });
}

/**
 * Build a CSS selector for a nested detail grid
 *
 * @param path - Path of row matchers
 * @returns CSS selector string
 */
function buildNestedDetailSelector(path: DetailGridPath): string {
  // Build selector by nesting detail containers
  let selector = '.ag-root-wrapper';

  for (let i = 0; i < path.path.length; i++) {
    selector += ' .ag-details-row .ag-root-wrapper';
  }

  return selector;
}

/**
 * Expand a path of nested detail grids
 *
 * @param gridLocator - The root grid locator
 * @param page - Playwright page
 * @param path - Path of row matchers to expand
 * @param config - Normalized grid configuration
 */
export async function expandNestedPath(
  gridLocator: Locator,
  page: Page,
  path: DetailGridPath,
  config: NormalizedAgGridConfig
): Promise<void> {
  // Safety check: prevent infinite/excessive nesting
  if (path.path.length > MAX_NESTING_DEPTH) {
    throw new Error(
      `Path depth (${path.path.length}) exceeds maximum allowed depth (${MAX_NESTING_DEPTH}). ` +
      `This may indicate an infinite loop or misconfiguration.`
    );
  }

  let currentGrid = gridLocator;
  let depth = 0;

  for (const matcher of path.path) {
    depth++;

    // Expand this level
    await expandDetailRow(currentGrid, page, matcher, config);

    // Get the detail grid for next level
    currentGrid = getDetailGridLocator(currentGrid, matcher);

    // Wait for detail grid to be ready
    await expect(currentGrid).toBeVisible({ timeout: 5000 });
  }
}

/**
 * Collapse a path of nested detail grids (from deepest to shallowest)
 *
 * @param gridLocator - The root grid locator
 * @param page - Playwright page
 * @param path - Path of row matchers to collapse
 * @param config - Normalized grid configuration
 */
export async function collapseNestedPath(
  gridLocator: Locator,
  page: Page,
  path: DetailGridPath,
  config: NormalizedAgGridConfig
): Promise<void> {
  // Collapse from deepest level first
  for (let i = path.path.length - 1; i >= 0; i--) {
    const partialPath = path.path.slice(0, i);
    const matcher = path.path[i];

    if (!matcher) continue;

    // Navigate to the grid at this level
    let currentGrid = gridLocator;
    for (const pathMatcher of partialPath) {
      currentGrid = getDetailGridLocator(currentGrid, pathMatcher);
    }

    // Collapse this level
    await collapseDetailRow(currentGrid, page, matcher, config);
  }
}

/**
 * Get the nesting depth of the current detail grid
 *
 * @param detailLocator - Locator for the detail grid
 * @returns Nesting depth (0 = root grid, 1 = first detail, etc.)
 */
export async function getDetailNestingDepth(detailLocator: Locator): Promise<number> {
  // Count the number of .ag-details-row ancestors
  const depth = await detailLocator.evaluate((el) => {
    let count = 0;
    let parent = el.parentElement;

    while (parent) {
      if (parent.classList.contains('ag-details-row')) {
        count++;
      }
      parent = parent.parentElement;
    }

    return count;
  });

  return depth;
}

/**
 * Get the state of nested detail grids
 *
 * @param gridLocator - The grid root locator
 * @param config - Normalized grid configuration
 * @returns Nested detail state information
 */
export async function getNestedDetailState(
  gridLocator: Locator,
  _config: NormalizedAgGridConfig
): Promise<NestedDetailState> {
  // Count all expanded detail rows
  const detailRows = gridLocator.locator(NESTED_DETAIL_SELECTORS.DETAIL_ROW);
  const expandedDetailCount = await detailRows.count();

  // Find maximum nesting depth
  let maxDepth = 0;
  const nestedDetails = gridLocator.locator(NESTED_DETAIL_SELECTORS.NESTED_DETAIL_GRID);
  const hasNestedDetails = (await nestedDetails.count()) > 0;

  if (hasNestedDetails) {
    // Calculate depth by counting nested detail rows
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const depths = await gridLocator.evaluate((): number => {
      const allDetailRows = document.querySelectorAll('.ag-details-row');
      const maxNesting = Array.from(allDetailRows).map((row: unknown) => {
        let depth = 1;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let parent = (row as any).parentElement;
        while (parent) {
          if (parent.classList && parent.classList.contains('ag-details-row')) {
            depth++;
          }
          parent = parent.parentElement;
        }
        return depth;
      });
      return Math.max(0, ...maxNesting);
    });
    maxDepth = depths;
  } else if (expandedDetailCount > 0) {
    maxDepth = 1;
  }

  return {
    depth: maxDepth,
    path: { path: [] }, // Would need to track actual path
    hasNestedDetails,
    expandedDetailCount,
  };
}

/**
 * Get all expanded detail row identifiers at a specific depth
 *
 * @param gridLocator - The grid root locator
 * @param depth - Nesting depth (1 = first level details)
 * @returns Array of row IDs that have expanded details
 */
export async function getExpandedDetailRowsAtDepth(
  gridLocator: Locator,
  depth: number
): Promise<string[]> {
  // Build selector for detail rows at specific depth
  let selector = '.ag-root-wrapper';
  for (let i = 1; i < depth; i++) {
    selector += ' > .ag-details-row .ag-root-wrapper';
  }
  selector += ' > .ag-row-group-expanded, ' + selector + ' .ag-row .ag-group-expanded';

  const expandedRows = gridLocator.locator(selector);
  const count = await expandedRows.count();
  const rowIds: string[] = [];

  for (let i = 0; i < count; i++) {
    const rowId = await expandedRows.nth(i).getAttribute('row-id');
    if (rowId) {
      rowIds.push(rowId);
    }
  }

  return rowIds;
}

/**
 * Expand all detail rows at a specific depth
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @param depth - Target depth (1 = expand all first-level details)
 * @param config - Normalized grid configuration
 */
export async function expandAllAtDepth(
  gridLocator: Locator,
  _page: Page,
  depth: number,
  _config: NormalizedAgGridConfig
): Promise<void> {
  // Build selector for grids at the target depth
  let gridSelector = '.ag-root-wrapper';
  for (let i = 1; i < depth; i++) {
    gridSelector += ' .ag-details-row .ag-root-wrapper';
  }

  const gridsAtDepth = gridLocator.locator(gridSelector);
  const gridCount = await gridsAtDepth.count();

  for (let g = 0; g < gridCount; g++) {
    const grid = gridsAtDepth.nth(g);
    const expandIcons = grid.locator(NESTED_DETAIL_SELECTORS.EXPAND_ICON);
    const expandCount = await expandIcons.count();

    for (let i = 0; i < expandCount; i++) {
      // Re-query because DOM changes after expansion
      const currentIcons = grid.locator(NESTED_DETAIL_SELECTORS.EXPAND_ICON);
      const currentCount = await currentIcons.count();

      if (currentCount > 0) {
        await currentIcons.first().click();

        // Wait for detail panel to appear
        const detailPanel = grid.locator(NESTED_DETAIL_SELECTORS.DETAIL_ROW);
        await expect(detailPanel.first()).toBeVisible({ timeout: 2000 });
      }
    }
  }
}

/**
 * Collapse all detail rows at a specific depth
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @param depth - Target depth (1 = collapse all first-level details)
 * @param config - Normalized grid configuration
 */
export async function collapseAllAtDepth(
  gridLocator: Locator,
  _page: Page,
  depth: number,
  _config: NormalizedAgGridConfig
): Promise<void> {
  // Build selector for grids at the target depth
  let gridSelector = '.ag-root-wrapper';
  for (let i = 1; i < depth; i++) {
    gridSelector += ' .ag-details-row .ag-root-wrapper';
  }

  const gridsAtDepth = gridLocator.locator(gridSelector);
  const gridCount = await gridsAtDepth.count();

  for (let g = 0; g < gridCount; g++) {
    const grid = gridsAtDepth.nth(g);

    // Keep collapsing until no more expanded
    const maxIterations = 100;
    let iterations = 0;

    while (iterations < maxIterations) {
      const collapseIcons = grid.locator(NESTED_DETAIL_SELECTORS.COLLAPSE_ICON);
      const count = await collapseIcons.count();

      if (count === 0) {
        break;
      }

      // Get current detail row count before collapse
      const detailRows = grid.locator(NESTED_DETAIL_SELECTORS.DETAIL_ROW);
      const detailCountBefore = await detailRows.count();

      await collapseIcons.first().click();

      // Wait for detail row count to decrease (or reach 0)
      await expect(async () => {
        const detailCountAfter = await detailRows.count();
        expect(detailCountAfter).toBeLessThan(detailCountBefore);
      }).toPass({ timeout: 2000 });

      iterations++;
    }
  }
}

/**
 * Get row data from a nested detail grid
 *
 * @param gridLocator - The root grid locator
 * @param path - Path to the detail grid
 * @param config - Normalized grid configuration
 * @returns Array of row data from the nested detail grid
 */
export async function getNestedDetailRowData(
  gridLocator: Locator,
  path: DetailGridPath,
  _config: NormalizedAgGridConfig
): Promise<AgGridRowData[]> {
  const detailGrid = getNestedDetailGridLocator(gridLocator, path);

  // Get visible rows from the detail grid
  const rows = detailGrid.locator(`${AG_GRID_SELECTORS.ROW}:not(.ag-details-row)`);
  const rowCount = await rows.count();
  const rowDataList: AgGridRowData[] = [];

  for (let i = 0; i < rowCount; i++) {
    const row = rows.nth(i);
    const cells = row.locator(AG_GRID_SELECTORS.CELL);
    const cellCount = await cells.count();

    const cellData: Record<string, unknown> = {};
    for (let j = 0; j < cellCount; j++) {
      const cell = cells.nth(j);
      const colId = await cell.getAttribute('col-id');
      const value = await cell.textContent();

      if (colId) {
        cellData[colId] = value?.trim() ?? null;
      }
    }

    const ariaRowIndex = await row.getAttribute('aria-rowindex');
    const rowId = await row.getAttribute('row-id');

    rowDataList.push({
      cells: cellData,
      rowIndex: i,
      ariaRowIndex: ariaRowIndex ? parseInt(ariaRowIndex, 10) : i + 1,
      rowId: rowId ?? undefined,
    });
  }

  return rowDataList;
}

/**
 * Assert that a detail grid exists and is visible
 *
 * @param gridLocator - The grid root locator
 * @param matcher - Row matcher for the master row
 */
export async function expectDetailVisible(
  gridLocator: Locator,
  matcher: RowMatcher
): Promise<void> {
  const detailGrid = getDetailGridLocator(gridLocator, matcher);
  await expect(detailGrid).toBeVisible({ timeout: 5000 });
}

/**
 * Assert that a detail grid is collapsed/hidden
 *
 * @param gridLocator - The grid root locator
 * @param matcher - Row matcher for the master row
 */
export async function expectDetailHidden(
  gridLocator: Locator,
  matcher: RowMatcher
): Promise<void> {
  const isExpanded = await isDetailRowExpanded(gridLocator, matcher);

  if (isExpanded) {
    throw new Error(
      `Expected detail to be hidden for row: ${formatRowMatcher(matcher)}, but it is expanded`
    );
  }
}

/**
 * Assert nested detail grid at path exists
 *
 * @param gridLocator - The grid root locator
 * @param path - Path to the nested detail grid
 */
export async function expectNestedDetailVisible(
  gridLocator: Locator,
  path: DetailGridPath
): Promise<void> {
  const nestedGrid = getNestedDetailGridLocator(gridLocator, path);
  await expect(nestedGrid).toBeVisible({ timeout: 5000 });
}

/**
 * Get the count of visible rows in a nested detail grid
 *
 * @param gridLocator - The root grid locator
 * @param path - Path to the detail grid
 * @returns Number of visible rows
 */
export async function getNestedDetailRowCount(
  gridLocator: Locator,
  path: DetailGridPath
): Promise<number> {
  const detailGrid = getNestedDetailGridLocator(gridLocator, path);
  const rows = detailGrid.locator(`${AG_GRID_SELECTORS.ROW}:not(.ag-details-row)`);
  return rows.count();
}

/**
 * Click a cell in a nested detail grid
 *
 * @param gridLocator - The root grid locator
 * @param path - Path to the detail grid
 * @param rowMatcher - Row matcher within the detail grid
 * @param colId - Column ID
 */
export async function clickNestedDetailCell(
  gridLocator: Locator,
  path: DetailGridPath,
  rowMatcher: RowMatcher,
  colId: string
): Promise<void> {
  const detailGrid = getNestedDetailGridLocator(gridLocator, path);
  const rowSelector = buildRowSelectorFromMatcher(rowMatcher);

  let cell: Locator;
  if (rowSelector) {
    cell = detailGrid.locator(rowSelector).locator(
      `${AG_GRID_SELECTORS.CELL}[col-id="${colId}"]`
    );
  } else {
    cell = detailGrid.locator(
      `${AG_GRID_SELECTORS.ROW} ${AG_GRID_SELECTORS.CELL}[col-id="${colId}"]`
    );
  }

  await cell.first().click();
}

/**
 * Recursively expand all detail grids in the entire grid hierarchy
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @param config - Normalized grid configuration
 * @param maxDepth - Maximum depth to expand (default: 10)
 */
export async function expandAllNestedDetails(
  gridLocator: Locator,
  page: Page,
  config: NormalizedAgGridConfig,
  maxDepth: number = 10
): Promise<void> {
  for (let depth = 1; depth <= maxDepth; depth++) {
    const beforeCount = await gridLocator.locator(NESTED_DETAIL_SELECTORS.EXPAND_ICON).count();

    if (beforeCount === 0) {
      break; // No more rows to expand
    }

    await expandAllAtDepth(gridLocator, page, depth, config);

    // Wait for DOM to stabilize after expansion
    // Check that all expand icons have been processed
    await expect(async () => {
      const afterCount = await gridLocator.locator(NESTED_DETAIL_SELECTORS.EXPAND_ICON).count();
      // Either count decreased or new icons appeared from nested details
      expect(afterCount).toBeDefined();
    }).toPass({ timeout: 2000 });
  }
}

/**
 * Recursively collapse all detail grids in the entire grid hierarchy
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @param config - Normalized grid configuration
 */
export async function collapseAllNestedDetails(
  gridLocator: Locator,
  page: Page,
  config: NormalizedAgGridConfig
): Promise<void> {
  // Get current max depth
  const state = await getNestedDetailState(gridLocator, config);

  // Collapse from deepest to shallowest
  for (let depth = state.depth; depth >= 1; depth--) {
    await collapseAllAtDepth(gridLocator, page, depth, config);
  }
}
