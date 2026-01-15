/**
 * AG Grid Server-Side Row Model Support
 *
 * Provides utilities for testing grids with server-side data loading,
 * infinite scrolling, and lazy loading patterns.
 *
 * @module grid/ag-grid/enterprise/server-side
 */

import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import type {
  NormalizedAgGridConfig,
  ServerSideState,
  ServerSideOptions,
} from '../../types.js';
import { AG_GRID_SELECTORS } from '../selectors.js';

/**
 * Default server-side configuration values
 */
const SERVER_SIDE_DEFAULTS = {
  blockSize: 100,
  maxBlocksInCache: 10,
  blockLoadTimeout: 30000,
};

/**
 * AG Grid server-side row model CSS selectors
 */
export const SERVER_SIDE_SELECTORS = {
  /** Loading cell indicator */
  LOADING_CELL: '.ag-loading',

  /** Skeleton row during load */
  SKELETON_ROW: '.ag-skeleton-row',

  /** Infinite scroll viewport */
  INFINITE_VIEWPORT: '.ag-body-viewport',

  /** Block loading indicator */
  BLOCK_LOADING: '[data-block-loading="true"]',

  /** Row with data loaded */
  LOADED_ROW: '.ag-row:not(.ag-loading):not(.ag-skeleton-row)',

  /** Pagination panel for row count */
  PAGINATION_PANEL: '.ag-paging-panel',

  /** Status bar with row count */
  STATUS_BAR: '.ag-status-bar',

  /** Total row count indicator */
  ROW_COUNT_INDICATOR: '.ag-paging-row-summary-panel, [data-total-rows]',
} as const;

/**
 * Wait for a specific block of rows to be loaded
 *
 * @param gridLocator - The grid root locator
 * @param rowIndex - Target row index to wait for
 * @param config - Normalized grid configuration
 * @param options - Server-side options
 */
export async function waitForBlockLoad(
  gridLocator: Locator,
  rowIndex: number,
  _config: NormalizedAgGridConfig,
  options?: ServerSideOptions
): Promise<void> {
  const timeout = options?.timeout ?? SERVER_SIDE_DEFAULTS.blockLoadTimeout;

  // First, scroll to the approximate position to trigger block load
  const viewport = gridLocator.locator(SERVER_SIDE_SELECTORS.INFINITE_VIEWPORT);
  const rowHeight = await estimateRowHeight(gridLocator);
  const scrollPosition = rowIndex * rowHeight;

  await viewport.evaluate(
    (el, pos) => {
      el.scrollTop = pos;
    },
    scrollPosition
  );

  // Wait for loading indicators to appear and disappear
  const loadingIndicator = gridLocator.locator(
    `${SERVER_SIDE_SELECTORS.LOADING_CELL}, ${SERVER_SIDE_SELECTORS.SKELETON_ROW}`
  );

  // Wait for loading to start (may already be complete)
  try {
    await loadingIndicator.first().waitFor({ state: 'visible', timeout: 1000 });
  } catch {
    // Loading may have completed before we could observe it
  }

  // Wait for loading to complete
  await expect(loadingIndicator).toHaveCount(0, { timeout });

  // Verify the target row is now available
  const targetRow = gridLocator.locator(
    `${AG_GRID_SELECTORS.ROW}[aria-rowindex="${rowIndex + 1}"]`
  );

  await expect(targetRow).toBeVisible({ timeout: 5000 });
}

/**
 * Get the current server-side loading state
 *
 * @param gridLocator - The grid root locator
 * @param config - Normalized grid configuration
 * @returns Server-side state information
 */
export async function getServerSideState(
  gridLocator: Locator,
  config: NormalizedAgGridConfig
): Promise<ServerSideState> {
  // Check if currently loading
  const loadingCells = gridLocator.locator(SERVER_SIDE_SELECTORS.LOADING_CELL);
  const skeletonRows = gridLocator.locator(SERVER_SIDE_SELECTORS.SKELETON_ROW);
  const loadingCount = (await loadingCells.count()) + (await skeletonRows.count());
  const isLoading = loadingCount > 0;

  // Get loaded row range
  const loadedRange = await getLoadedRowRange(gridLocator);

  // Get total row count from server
  const totalServerRows = await getTotalServerRowCount(gridLocator);

  // Estimate cached blocks
  const cachedBlocks = await estimateCachedBlocks(gridLocator, config);

  return {
    isLoading,
    loadedRange,
    totalServerRows,
    cachedBlocks,
  };
}

/**
 * Refresh server-side data by triggering a reload
 *
 * @param gridLocator - The grid root locator
 * @param config - Normalized grid configuration
 * @param options - Server-side options
 */
export async function refreshServerSideData(
  gridLocator: Locator,
  _config: NormalizedAgGridConfig,
  options?: ServerSideOptions
): Promise<void> {
  const timeout = options?.timeout ?? SERVER_SIDE_DEFAULTS.blockLoadTimeout;

  // Try to find and click a refresh button if available
  const refreshButton = gridLocator.locator(
    '[data-action="refresh"], .ag-tool-panel-button[title*="Refresh"], button:has-text("Refresh")'
  );

  const hasRefreshButton = (await refreshButton.count()) > 0;

  if (hasRefreshButton) {
    await refreshButton.first().click();
  } else {
    // Trigger refresh via keyboard shortcut or scroll reset
    const viewport = gridLocator.locator(SERVER_SIDE_SELECTORS.INFINITE_VIEWPORT);

    // Scroll to top to trigger fresh load
    await viewport.evaluate((el) => {
      el.scrollTop = 0;
    });

    // Force a small scroll to trigger refresh
    await viewport.evaluate((el) => {
      el.scrollTop = 1;
      el.scrollTop = 0;
    });
  }

  // Wait for loading to complete
  const loadingOverlay = gridLocator.locator(AG_GRID_SELECTORS.LOADING_OVERLAY);
  const loadingCells = gridLocator.locator(SERVER_SIDE_SELECTORS.LOADING_CELL);

  // Wait for any loading indicator to appear
  try {
    await Promise.race([
      loadingOverlay.waitFor({ state: 'visible', timeout: 2000 }),
      loadingCells.first().waitFor({ state: 'visible', timeout: 2000 }),
    ]);
  } catch {
    // Loading may be instant
  }

  // Wait for loading to complete
  await expect(loadingOverlay).not.toBeVisible({ timeout });
  await expect(loadingCells).toHaveCount(0, { timeout });
}

/**
 * Scroll to a specific row with server-side loading support
 *
 * @param gridLocator - The grid root locator
 * @param rowIndex - Target row index (0-based)
 * @param config - Normalized grid configuration
 * @param options - Server-side options
 */
export async function scrollToServerSideRow(
  gridLocator: Locator,
  rowIndex: number,
  config: NormalizedAgGridConfig,
  options?: ServerSideOptions
): Promise<void> {
  const timeout = options?.timeout ?? SERVER_SIDE_DEFAULTS.blockLoadTimeout;
  const viewport = gridLocator.locator(SERVER_SIDE_SELECTORS.INFINITE_VIEWPORT);

  // Estimate row height
  const rowHeight = await estimateRowHeight(gridLocator);

  // Calculate target scroll position (center the row in viewport)
  const viewportHeight = await viewport.evaluate((el) => el.clientHeight);
  const targetScroll = Math.max(0, rowIndex * rowHeight - viewportHeight / 2);

  // Scroll incrementally to allow blocks to load
  const currentScroll = await viewport.evaluate((el) => el.scrollTop);
  const scrollDirection = targetScroll > currentScroll ? 1 : -1;

  // Scroll in chunks to trigger block loading
  const chunkSize = viewportHeight * 2; // Two viewport heights at a time
  let currentPosition = currentScroll;

  while (Math.abs(currentPosition - targetScroll) > chunkSize) {
    currentPosition += scrollDirection * chunkSize;

    await viewport.evaluate(
      (el, pos) => {
        el.scrollTop = pos;
      },
      currentPosition
    );

    // Wait for any loading to complete
    await waitForLoadingComplete(gridLocator, Math.min(timeout / 5, 5000));
  }

  // Final scroll to exact position
  await viewport.evaluate(
    (el, pos) => {
      el.scrollTop = pos;
    },
    targetScroll
  );

  // Wait for target row to be loaded
  await waitForBlockLoad(gridLocator, rowIndex, config, options);
}

/**
 * Check if a specific row index is loaded (not a skeleton/loading row)
 *
 * @param gridLocator - The grid root locator
 * @param rowIndex - Row index to check (0-based)
 * @returns True if row is loaded
 */
export async function isRowLoaded(
  gridLocator: Locator,
  rowIndex: number
): Promise<boolean> {
  // aria-rowindex is 1-based
  const ariaRowIndex = rowIndex + 1;

  // Check for row with data (not loading)
  const loadedRow = gridLocator.locator(
    `${AG_GRID_SELECTORS.ROW}[aria-rowindex="${ariaRowIndex}"]:not(.ag-loading):not(.ag-skeleton-row)`
  );

  const count = await loadedRow.count();
  if (count === 0) {
    return false;
  }

  // Verify it has actual cell content (not just a placeholder)
  const cells = loadedRow.locator(AG_GRID_SELECTORS.CELL);
  const cellCount = await cells.count();

  if (cellCount === 0) {
    return false;
  }

  // Check first cell has content
  const firstCell = cells.first();
  const hasLoading = await firstCell.locator(SERVER_SIDE_SELECTORS.LOADING_CELL).count();

  return hasLoading === 0;
}

/**
 * Wait for infinite scroll to load more rows
 *
 * @param gridLocator - The grid root locator
 * @param expectedMinRows - Minimum expected rows after load
 * @param config - Normalized grid configuration
 * @param options - Server-side options
 */
export async function waitForInfiniteScrollLoad(
  gridLocator: Locator,
  expectedMinRows: number,
  _config: NormalizedAgGridConfig,
  options?: ServerSideOptions
): Promise<void> {
  const timeout = options?.timeout ?? SERVER_SIDE_DEFAULTS.blockLoadTimeout;

  await expect(async () => {
    const loadedRows = gridLocator.locator(SERVER_SIDE_SELECTORS.LOADED_ROW);
    const count = await loadedRows.count();
    expect(count).toBeGreaterThanOrEqual(expectedMinRows);
  }).toPass({ timeout });
}

/**
 * Get the range of currently loaded row indices
 */
async function getLoadedRowRange(
  gridLocator: Locator
): Promise<{ start: number; end: number } | null> {
  const loadedRows = gridLocator.locator(SERVER_SIDE_SELECTORS.LOADED_ROW);
  const count = await loadedRows.count();

  if (count === 0) {
    return null;
  }

  const indices: number[] = [];

  for (let i = 0; i < count; i++) {
    const row = loadedRows.nth(i);
    const ariaRowIndex = await row.getAttribute('aria-rowindex');
    if (ariaRowIndex) {
      indices.push(parseInt(ariaRowIndex, 10) - 1); // Convert to 0-based
    }
  }

  if (indices.length === 0) {
    return null;
  }

  return {
    start: Math.min(...indices),
    end: Math.max(...indices),
  };
}

/**
 * Get total row count from server (from pagination/status bar)
 */
async function getTotalServerRowCount(gridLocator: Locator): Promise<number> {
  // Try pagination panel first
  const paginationPanel = gridLocator.locator(SERVER_SIDE_SELECTORS.PAGINATION_PANEL);
  if ((await paginationPanel.count()) > 0) {
    const text = await paginationPanel.textContent();
    if (text) {
      // Match patterns like "1 to 100 of 5,000" or "Total: 5000"
      const match = text.match(/of\s*([\d,]+)|total[:\s]*([\d,]+)/i);
      if (match) {
        const numStr = match[1] ?? match[2];
        if (numStr) {
          return parseInt(numStr.replace(/,/g, ''), 10);
        }
      }
    }
  }

  // Try status bar
  const statusBar = gridLocator.locator(SERVER_SIDE_SELECTORS.STATUS_BAR);
  if ((await statusBar.count()) > 0) {
    const text = await statusBar.textContent();
    if (text) {
      const match = text.match(/([\d,]+)\s*(rows?|records?|items?|total)/i);
      if (match && match[1]) {
        return parseInt(match[1].replace(/,/g, ''), 10);
      }
    }
  }

  // Try data attribute
  const rowCountIndicator = gridLocator.locator('[data-total-rows]');
  if ((await rowCountIndicator.count()) > 0) {
    const totalRows = await rowCountIndicator.getAttribute('data-total-rows');
    if (totalRows) {
      return parseInt(totalRows, 10);
    }
  }

  // Unknown
  return -1;
}

/**
 * Estimate the number of cached blocks
 *
 * @param gridLocator - The grid root locator
 * @param _config - Normalized grid configuration (reserved for future use)
 * @param blockSize - Optional custom block size (defaults to 100)
 */
async function estimateCachedBlocks(
  gridLocator: Locator,
  _config: NormalizedAgGridConfig,
  blockSize: number = SERVER_SIDE_DEFAULTS.blockSize
): Promise<number> {
  const range = await getLoadedRowRange(gridLocator);

  if (!range) {
    return 0;
  }

  const loadedRows = range.end - range.start + 1;
  return Math.ceil(loadedRows / blockSize);
}

/**
 * Estimate row height from visible rows
 */
async function estimateRowHeight(gridLocator: Locator): Promise<number> {
  const rows = gridLocator.locator(AG_GRID_SELECTORS.ROW);
  const count = await rows.count();

  if (count === 0) {
    return 42; // Default AG Grid row height
  }

  // Get height from first row
  const firstRow = rows.first();
  const box = await firstRow.boundingBox();

  return box?.height ?? 42;
}

/**
 * Wait for loading indicators to clear
 */
async function waitForLoadingComplete(
  gridLocator: Locator,
  timeout: number
): Promise<void> {
  const loadingIndicators = gridLocator.locator(
    `${SERVER_SIDE_SELECTORS.LOADING_CELL}, ${SERVER_SIDE_SELECTORS.SKELETON_ROW}`
  );

  try {
    await expect(loadingIndicators).toHaveCount(0, { timeout });
  } catch {
    // May timeout if constantly loading - that's ok
  }
}
