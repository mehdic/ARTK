/**
 * AG Grid Assertions
 *
 * Provides assertion functions for grid state verification.
 *
 * @module grid/ag-grid/assertions
 */

import { expect } from '@playwright/test';
import type { Locator } from '@playwright/test';
import type {
  NormalizedAgGridConfig,
  RowMatcher,
  AssertionOptions,
  RowCountOptions,
} from '../types.js';
import { AG_GRID_SELECTORS } from './selectors.js';
import { getColumnDisplayName } from './config.js';
import {
  findRowByMatcher,
  findClosestMatch,
  matchesCellValues,
  getAllVisibleRowData,
  countVisibleRows,
} from './row-data.js';
import { getSortState, isNoRowsOverlayVisible } from './state.js';
import { isRowSelected } from './selectors.js';

/**
 * Assert that the grid has the expected row count
 *
 * @param gridLocator - The grid root locator
 * @param count - Expected row count
 * @param config - Normalized grid configuration
 * @param options - Assertion options
 */
export async function expectRowCount(
  gridLocator: Locator,
  count: number,
  config: NormalizedAgGridConfig,
  options?: RowCountOptions
): Promise<void> {
  const timeout = options?.timeout ?? 5000;
  const rows = gridLocator.locator(AG_GRID_SELECTORS.ROW);

  // Handle range assertions
  if (options?.min !== undefined || options?.max !== undefined) {
    const actualCount = await rows.count();

    if (options.min !== undefined && actualCount < options.min) {
      throw new Error(
        `Grid "${config.selector}" has ${actualCount} rows, expected at least ${options.min}`
      );
    }

    if (options.max !== undefined && actualCount > options.max) {
      throw new Error(
        `Grid "${config.selector}" has ${actualCount} rows, expected at most ${options.max}`
      );
    }

    return;
  }

  // Exact count assertion
  await expect(rows).toHaveCount(count, { timeout });
}

/**
 * Assert that the grid contains a row matching the given cell values
 *
 * @param gridLocator - The grid root locator
 * @param cellValues - Expected cell values
 * @param config - Normalized grid configuration
 * @param options - Assertion options
 */
export async function expectRowContains(
  gridLocator: Locator,
  cellValues: Record<string, unknown>,
  config: NormalizedAgGridConfig,
  options?: AssertionOptions
): Promise<void> {
  const timeout = options?.timeout ?? 5000;
  const startTime = Date.now();

  // Poll until timeout
  while (Date.now() - startTime < timeout) {
    const match = await findRowByMatcher(gridLocator, { cellValues }, config);

    if (match) {
      return; // Found a matching row
    }

    // Small delay before retry
    await gridLocator.page().waitForTimeout(100);
  }

  // No match found - build detailed error message
  const visibleRowCount = await countVisibleRows(gridLocator);
  const closestMatch = await findClosestMatch(gridLocator, cellValues, config);

  let errorMessage = `Grid "${config.selector}" does not contain a row matching:\n`;
  errorMessage += `   Expected: ${formatCellValues(cellValues, config)}\n\n`;
  errorMessage += `   Visible rows checked: ${visibleRowCount}\n`;

  if (closestMatch && closestMatch.matchedFields > 0) {
    errorMessage += `   Closest match: ${formatCellValues(closestMatch.row.cells, config)}\n`;
    errorMessage += `   Mismatched fields:\n`;
    for (const mismatch of closestMatch.mismatches) {
      const displayName = getColumnDisplayName(config, mismatch.field);
      errorMessage += `     - ${displayName}: expected "${mismatch.expected}", got "${mismatch.actual}"\n`;
    }
  } else {
    errorMessage += `   No similar rows found\n`;
  }

  errorMessage += `\n   Tip: If the row exists but isn't visible, it may require scrolling.\n`;
  errorMessage += `   The helper automatically scrolls for you - check if the data exists.`;

  throw new Error(errorMessage);
}

/**
 * Assert that the grid does NOT contain a row matching the given cell values
 *
 * @param gridLocator - The grid root locator
 * @param cellValues - Cell values that should NOT match any row
 * @param config - Normalized grid configuration
 * @param options - Assertion options
 */
export async function expectRowNotContains(
  gridLocator: Locator,
  cellValues: Record<string, unknown>,
  config: NormalizedAgGridConfig,
  options?: AssertionOptions
): Promise<void> {
  const timeout = options?.timeout ?? 5000;
  const startTime = Date.now();

  // Poll until timeout to ensure row doesn't appear
  while (Date.now() - startTime < timeout) {
    const allRows = await getAllVisibleRowData(gridLocator, config);

    let foundMatch = false;
    for (const rowData of allRows) {
      if (matchesCellValues(rowData, cellValues)) {
        foundMatch = true;
        break;
      }
    }

    if (foundMatch) {
      // Found a match - this is a failure, wait a bit and check again
      // (the row might be about to be removed)
      await gridLocator.page().waitForTimeout(100);
    } else {
      // No match - success
      return;
    }
  }

  // Timeout reached and row still exists
  throw new Error(
    `Grid "${config.selector}" contains a row matching:\n` +
      `   ${formatCellValues(cellValues, config)}\n\n` +
      `   Expected this row to NOT exist.`
  );
}

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
export async function expectCellValue(
  gridLocator: Locator,
  rowMatcher: RowMatcher,
  colId: string,
  expectedValue: unknown,
  config: NormalizedAgGridConfig,
  options?: AssertionOptions
): Promise<void> {
  const timeout = options?.timeout ?? 5000;
  const exact = options?.exact ?? false;

  const match = await findRowByMatcher(gridLocator, rowMatcher, config);

  if (!match) {
    throw new Error(
      `Grid "${config.selector}": Could not find row matching ${formatMatcher(rowMatcher)}`
    );
  }

  const actualValue = match.data.cells[colId];
  const displayName = getColumnDisplayName(config, colId);

  if (exact) {
    // Exact match
    if (actualValue !== expectedValue) {
      throw new Error(
        `Grid "${config.selector}": Cell "${displayName}" has value "${actualValue}", expected exactly "${expectedValue}"`
      );
    }
  } else {
    // Normalized comparison
    const normalizedExpected = normalizeForComparison(expectedValue);
    const normalizedActual = normalizeForComparison(actualValue);

    if (normalizedExpected !== normalizedActual) {
      throw new Error(
        `Grid "${config.selector}": Cell "${displayName}" has value "${actualValue}", expected "${expectedValue}"`
      );
    }
  }
}

/**
 * Assert that the grid is sorted by a specific column
 *
 * @param gridLocator - The grid root locator
 * @param colId - Column ID
 * @param direction - Expected sort direction
 * @param config - Normalized grid configuration
 * @param options - Assertion options
 */
export async function expectSortedBy(
  gridLocator: Locator,
  colId: string,
  direction: 'asc' | 'desc',
  config: NormalizedAgGridConfig,
  options?: AssertionOptions
): Promise<void> {
  const sortState = await getSortState(gridLocator);
  const columnSort = sortState.find((s) => s.colId === colId);
  const displayName = getColumnDisplayName(config, colId);

  if (!columnSort) {
    const sortedCols = sortState.map((s) => `${s.colId} (${s.direction})`).join(', ') || 'none';
    throw new Error(
      `Grid "${config.selector}": Column "${displayName}" is not sorted. Currently sorted: ${sortedCols}`
    );
  }

  if (columnSort.direction !== direction) {
    throw new Error(
      `Grid "${config.selector}": Column "${displayName}" is sorted "${columnSort.direction}", expected "${direction}"`
    );
  }
}

/**
 * Assert that the grid is empty (no data rows)
 *
 * @param gridLocator - The grid root locator
 * @param config - Normalized grid configuration
 * @param options - Assertion options
 */
export async function expectEmpty(
  gridLocator: Locator,
  config: NormalizedAgGridConfig,
  options?: AssertionOptions
): Promise<void> {
  const timeout = options?.timeout ?? 5000;
  const rows = gridLocator.locator(AG_GRID_SELECTORS.ROW);

  await expect(rows).toHaveCount(0, { timeout });
}

/**
 * Assert that the "no rows" overlay is visible
 *
 * @param gridLocator - The grid root locator
 * @param config - Normalized grid configuration
 * @param options - Assertion options
 */
export async function expectNoRowsOverlay(
  gridLocator: Locator,
  config: NormalizedAgGridConfig,
  options?: AssertionOptions
): Promise<void> {
  const isVisible = await isNoRowsOverlayVisible(gridLocator);

  if (!isVisible) {
    const rowCount = await countVisibleRows(gridLocator);
    throw new Error(
      `Grid "${config.selector}": "No rows" overlay is not visible. Grid has ${rowCount} rows.`
    );
  }
}

/**
 * Assert that a row is selected
 *
 * @param gridLocator - The grid root locator
 * @param matcher - Row matching criteria
 * @param config - Normalized grid configuration
 * @param options - Assertion options
 */
export async function expectRowSelected(
  gridLocator: Locator,
  matcher: RowMatcher,
  config: NormalizedAgGridConfig,
  options?: AssertionOptions
): Promise<void> {
  const match = await findRowByMatcher(gridLocator, matcher, config);

  if (!match) {
    throw new Error(
      `Grid "${config.selector}": Could not find row matching ${formatMatcher(matcher)}`
    );
  }

  const selected = await isRowSelected(match.row);

  if (!selected) {
    throw new Error(
      `Grid "${config.selector}": Row matching ${formatMatcher(matcher)} is not selected`
    );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format cell values for error messages
 */
function formatCellValues(
  values: Record<string, unknown>,
  config: NormalizedAgGridConfig
): string {
  const parts: string[] = [];
  for (const [colId, value] of Object.entries(values)) {
    const displayName = getColumnDisplayName(config, colId);
    parts.push(`${displayName}: "${value}"`);
  }
  return `{ ${parts.join(', ')} }`;
}

/**
 * Format a row matcher for error messages
 */
function formatMatcher(matcher: RowMatcher): string {
  if (matcher.ariaRowIndex !== undefined) {
    return `aria-rowindex=${matcher.ariaRowIndex}`;
  }
  if (matcher.rowId !== undefined) {
    return `row-id="${matcher.rowId}"`;
  }
  if (matcher.rowIndex !== undefined) {
    return `row-index=${matcher.rowIndex}`;
  }
  if (matcher.cellValues) {
    return JSON.stringify(matcher.cellValues);
  }
  return '<custom predicate>';
}

/**
 * Normalize a value for comparison
 */
function normalizeForComparison(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value.trim().toLowerCase();
  }
  return String(value).trim().toLowerCase();
}
