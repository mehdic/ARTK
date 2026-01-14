/**
 * AG Grid Row Data Extraction
 *
 * Provides utilities for extracting and finding row data.
 *
 * @module grid/ag-grid/row-data
 */

import type { Locator } from '@playwright/test';
import type { AgGridRowData, NormalizedAgGridConfig, RowMatcher, ClosestMatchResult } from '../types.js';
import { AG_GRID_SELECTORS, getAriaRowIndex, getRowIndex, getRowId, isGroupRow, isRowExpanded } from './selectors.js';
import { getAllCellValues } from './cell-renderers.js';

/**
 * Extract data from a row element
 *
 * @param rowLocator - The row locator
 * @param config - Normalized grid configuration
 * @returns Extracted row data
 */
export async function getRowData(
  rowLocator: Locator,
  config: NormalizedAgGridConfig
): Promise<AgGridRowData> {
  const [ariaRowIndex, rowIndex, rowId, isGroup, isExpanded, cells] = await Promise.all([
    getAriaRowIndex(rowLocator),
    getRowIndex(rowLocator),
    getRowId(rowLocator),
    isGroupRow(rowLocator),
    isRowExpanded(rowLocator),
    getAllCellValues(rowLocator, config),
  ]);

  const rowData: AgGridRowData = {
    rowIndex,
    ariaRowIndex,
    cells,
  };

  if (rowId) {
    rowData.rowId = rowId;
  }

  if (isGroup) {
    rowData.isGroup = true;
    rowData.isExpanded = isExpanded;

    // Try to get group level from aria attribute or class
    const level = await rowLocator.getAttribute('aria-level');
    if (level) {
      rowData.groupLevel = parseInt(level, 10);
    }
  }

  return rowData;
}

/**
 * Extract data from all visible rows
 *
 * @param gridLocator - The grid root locator
 * @param config - Normalized grid configuration
 * @returns Array of row data
 */
export async function getAllVisibleRowData(
  gridLocator: Locator,
  config: NormalizedAgGridConfig
): Promise<AgGridRowData[]> {
  const rows = gridLocator.locator(AG_GRID_SELECTORS.ROW);
  const rowCount = await rows.count();
  const results: AgGridRowData[] = [];

  for (let i = 0; i < rowCount; i++) {
    const rowLocator = rows.nth(i);
    const rowData = await getRowData(rowLocator, config);
    results.push(rowData);
  }

  return results;
}

/**
 * Find a row by matching criteria
 *
 * @param gridLocator - The grid root locator
 * @param matcher - Row matching criteria
 * @param config - Normalized grid configuration
 * @returns Locator for the matching row, or null if not found
 */
export async function findRowByMatcher(
  gridLocator: Locator,
  matcher: RowMatcher,
  config: NormalizedAgGridConfig
): Promise<{ row: Locator; data: AgGridRowData } | null> {
  // Direct matchers (fast path)
  if (matcher.ariaRowIndex !== undefined) {
    const row = gridLocator.locator(
      `${AG_GRID_SELECTORS.ROW}[${AG_GRID_SELECTORS.ATTR_ARIA_ROW_INDEX}="${matcher.ariaRowIndex}"]`
    );
    const count = await row.count();
    if (count > 0) {
      return { row: row.first(), data: await getRowData(row.first(), config) };
    }
    return null;
  }

  if (matcher.rowId !== undefined) {
    const row = gridLocator.locator(
      `${AG_GRID_SELECTORS.ROW}[${AG_GRID_SELECTORS.ATTR_ROW_ID}="${matcher.rowId}"]`
    );
    const count = await row.count();
    if (count > 0) {
      return { row: row.first(), data: await getRowData(row.first(), config) };
    }
    return null;
  }

  if (matcher.rowIndex !== undefined) {
    const row = gridLocator.locator(
      `${AG_GRID_SELECTORS.ROW}[${AG_GRID_SELECTORS.ATTR_ROW_INDEX}="${matcher.rowIndex}"]`
    );
    const count = await row.count();
    if (count > 0) {
      return { row: row.first(), data: await getRowData(row.first(), config) };
    }
    return null;
  }

  // Cell values matcher (requires iterating through rows)
  if (matcher.cellValues) {
    const allRows = await getAllVisibleRowData(gridLocator, config);

    for (let i = 0; i < allRows.length; i++) {
      const rowData = allRows[i];
      if (matchesCellValues(rowData, matcher.cellValues)) {
        const row = gridLocator.locator(AG_GRID_SELECTORS.ROW).nth(i);
        return { row, data: rowData };
      }
    }
    return null;
  }

  // Predicate matcher
  if (matcher.predicate) {
    const allRows = await getAllVisibleRowData(gridLocator, config);

    for (let i = 0; i < allRows.length; i++) {
      const rowData = allRows[i];
      if (matcher.predicate(rowData)) {
        const row = gridLocator.locator(AG_GRID_SELECTORS.ROW).nth(i);
        return { row, data: rowData };
      }
    }
    return null;
  }

  return null;
}

/**
 * Check if a row's cell values match the expected values
 *
 * @param rowData - Row data to check
 * @param expectedValues - Expected cell values
 * @returns True if all expected values match
 */
export function matchesCellValues(
  rowData: AgGridRowData,
  expectedValues: Record<string, unknown>
): boolean {
  for (const [colId, expectedValue] of Object.entries(expectedValues)) {
    const actualValue = rowData.cells[colId];

    // Normalize both values for comparison
    const normalizedExpected = normalizeForComparison(expectedValue);
    const normalizedActual = normalizeForComparison(actualValue);

    if (normalizedExpected !== normalizedActual) {
      return false;
    }
  }
  return true;
}

/**
 * Find the closest matching row for error messages
 *
 * @param gridLocator - The grid root locator
 * @param expectedValues - Expected cell values
 * @param config - Normalized grid configuration
 * @returns Closest match result
 */
export async function findClosestMatch(
  gridLocator: Locator,
  expectedValues: Record<string, unknown>,
  config: NormalizedAgGridConfig
): Promise<ClosestMatchResult | null> {
  const allRows = await getAllVisibleRowData(gridLocator, config);

  if (allRows.length === 0) {
    return null;
  }

  let bestMatch: ClosestMatchResult | null = null;
  let bestMatchCount = -1;

  const expectedKeys = Object.keys(expectedValues);
  const totalFields = expectedKeys.length;

  for (const rowData of allRows) {
    let matchedFields = 0;
    const mismatches: ClosestMatchResult['mismatches'] = [];

    for (const colId of expectedKeys) {
      const expectedValue = expectedValues[colId];
      const actualValue = rowData.cells[colId];

      const normalizedExpected = normalizeForComparison(expectedValue);
      const normalizedActual = normalizeForComparison(actualValue);

      if (normalizedExpected === normalizedActual) {
        matchedFields++;
      } else {
        mismatches.push({
          field: colId,
          expected: expectedValue,
          actual: actualValue,
        });
      }
    }

    if (matchedFields > bestMatchCount) {
      bestMatchCount = matchedFields;
      bestMatch = {
        row: rowData,
        matchedFields,
        totalFields,
        mismatches,
      };
    }
  }

  return bestMatch;
}

/**
 * Normalize a value for comparison
 *
 * @param value - Value to normalize
 * @returns Normalized string value
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

/**
 * Count visible rows in the grid
 *
 * @param gridLocator - The grid root locator
 * @returns Number of visible rows
 */
export async function countVisibleRows(gridLocator: Locator): Promise<number> {
  return gridLocator.locator(AG_GRID_SELECTORS.ROW).count();
}

/**
 * Count selected rows in the grid
 *
 * @param gridLocator - The grid root locator
 * @returns Number of selected rows
 */
export async function countSelectedRows(gridLocator: Locator): Promise<number> {
  return gridLocator.locator(AG_GRID_SELECTORS.ROW_SELECTED).count();
}
