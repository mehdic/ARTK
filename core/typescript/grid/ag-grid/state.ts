/**
 * AG Grid State Extraction
 *
 * Provides utilities for extracting the current grid state.
 *
 * @module grid/ag-grid/state
 */

import type { Locator } from '@playwright/test';
import type { AgGridState, SortModel, NormalizedAgGridConfig } from '../types.js';
import { AG_GRID_SELECTORS, getSortDirection } from './selectors.js';
import { countVisibleRows, countSelectedRows } from './row-data.js';

/**
 * Extract the current state of the grid
 *
 * @param gridLocator - The grid root locator
 * @param config - Normalized grid configuration
 * @returns Current grid state
 */
export async function getGridState(
  gridLocator: Locator,
  config: NormalizedAgGridConfig
): Promise<AgGridState> {
  const [visibleRows, selectedRows, sortedBy, isLoading, totalRows] = await Promise.all([
    countVisibleRows(gridLocator),
    countSelectedRows(gridLocator),
    getSortState(gridLocator),
    checkIsLoading(gridLocator),
    getTotalRowCount(gridLocator),
  ]);

  const state: AgGridState = {
    totalRows,
    visibleRows,
    selectedRows,
    isLoading,
  };

  if (sortedBy.length > 0) {
    state.sortedBy = sortedBy;
  }

  // TODO: Extract filter state (more complex, depends on filter type)
  // TODO: Extract groupedBy (enterprise feature)

  return state;
}

/**
 * Get the current sort state from header cells
 *
 * @param gridLocator - The grid root locator
 * @returns Array of sort models
 */
export async function getSortState(gridLocator: Locator): Promise<SortModel[]> {
  const headerCells = gridLocator.locator(AG_GRID_SELECTORS.HEADER_CELL);
  const cellCount = await headerCells.count();
  const sortedColumns: SortModel[] = [];

  for (let i = 0; i < cellCount; i++) {
    const cell = headerCells.nth(i);
    const colId = await cell.getAttribute(AG_GRID_SELECTORS.ATTR_COL_ID);
    const direction = await getSortDirection(cell);

    if (colId && direction) {
      sortedColumns.push({ colId, direction });
    }
  }

  return sortedColumns;
}

/**
 * Check if the grid is in a loading state
 *
 * @param gridLocator - The grid root locator
 * @returns True if loading overlay is visible
 */
export async function checkIsLoading(gridLocator: Locator): Promise<boolean> {
  const loadingOverlay = gridLocator.locator(AG_GRID_SELECTORS.LOADING_OVERLAY);
  const count = await loadingOverlay.count();

  if (count === 0) {
    return false;
  }

  // Check if the overlay has the .visible class
  const visibleOverlay = loadingOverlay.locator('.visible');
  const visibleCount = await visibleOverlay.count();

  if (visibleCount > 0) {
    return true;
  }

  // Check if it's actually visible (not display: none)
  try {
    const isVisible = await loadingOverlay.first().isVisible({ timeout: 100 });
    return isVisible;
  } catch {
    return false;
  }
}

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
export async function getTotalRowCount(gridLocator: Locator): Promise<number> {
  // Strategy 1: Check for pagination info
  // AG Grid typically has pagination info like "1 to 10 of 100"
  const paginationPanel = gridLocator.locator('.ag-paging-panel');
  const paginationCount = await paginationPanel.count();

  if (paginationCount > 0) {
    const paginationText = await paginationPanel.textContent();
    if (paginationText) {
      // Try to extract "of X" pattern
      const match = paginationText.match(/of\s*(\d+)/i);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
  }

  // Strategy 2: Check for row count in status bar
  const statusBar = gridLocator.locator('.ag-status-bar');
  const statusBarCount = await statusBar.count();

  if (statusBarCount > 0) {
    const statusText = await statusBar.textContent();
    if (statusText) {
      const match = statusText.match(/(\d+)\s*(rows?|records?|items?)/i);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
  }

  // Strategy 3: Count visible rows (fallback)
  return countVisibleRows(gridLocator);
}

/**
 * Check if the "no rows" overlay is visible
 *
 * @param gridLocator - The grid root locator
 * @returns True if no rows overlay is visible
 */
export async function isNoRowsOverlayVisible(gridLocator: Locator): Promise<boolean> {
  const noRowsOverlay = gridLocator.locator(AG_GRID_SELECTORS.NO_ROWS_OVERLAY);
  const count = await noRowsOverlay.count();

  if (count === 0) {
    return false;
  }

  // Check if the overlay has the .visible class
  const visibleOverlay = noRowsOverlay.locator('.visible');
  const visibleCount = await visibleOverlay.count();

  if (visibleCount > 0) {
    return true;
  }

  // Check if it's actually visible
  try {
    const isVisible = await noRowsOverlay.first().isVisible({ timeout: 100 });
    return isVisible;
  } catch {
    return false;
  }
}

/**
 * Get the columns that are currently grouped (enterprise feature)
 *
 * @param gridLocator - The grid root locator
 * @returns Array of column IDs used for grouping
 */
export async function getGroupedColumns(gridLocator: Locator): Promise<string[]> {
  // AG Grid shows grouped columns in a row group panel
  const rowGroupPanel = gridLocator.locator('.ag-column-drop-row-group');
  const count = await rowGroupPanel.count();

  if (count === 0) {
    return [];
  }

  // Extract column IDs from the chips in the panel
  const chips = rowGroupPanel.locator('.ag-column-drop-cell');
  const chipCount = await chips.count();
  const groupedColumns: string[] = [];

  for (let i = 0; i < chipCount; i++) {
    const chip = chips.nth(i);
    const colId = await chip.getAttribute('col-id');
    if (colId) {
      groupedColumns.push(colId);
    }
  }

  return groupedColumns;
}
