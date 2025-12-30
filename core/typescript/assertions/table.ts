/**
 * Table assertion helpers
 *
 * Provides assertions for verifying table content and row data.
 * Implements FR-022: Table row assertions with column matching
 *
 * @module assertions/table
 */

import { expect, type Locator, type Page } from '@playwright/test';
import type { TableAssertionOptions, TableRowData } from './types.js';

/**
 * Assert that a table contains a row matching the given data
 *
 * Searches for a table row where all specified column values match.
 * Column names should correspond to data-testid attributes or visible headers.
 *
 * @param page - Playwright page object
 * @param tableSelector - Selector for the table element (testid, role, or CSS)
 * @param rowData - Expected row data as column-value pairs
 * @param options - Table assertion options
 *
 * @example
 * ```typescript
 * // Match row by ID and status
 * await expectTableToContainRow(page, 'orders-table', {
 *   id: '12345',
 *   status: 'Active',
 *   amount: 99.99
 * });
 *
 * // Exact match
 * await expectTableToContainRow(page, 'users-table', {
 *   email: 'user@example.com'
 * }, { exact: true });
 *
 * // With custom timeout
 * await expectTableToContainRow(page, 'results-table', {
 *   name: 'Test Result'
 * }, { timeout: 10000 });
 * ```
 */
export async function expectTableToContainRow(
  page: Page,
  tableSelector: string,
  rowData: TableRowData,
  options: TableAssertionOptions = {}
): Promise<void> {
  const { timeout = 5000, exact = false } = options;

  // Locate the table
  const table = getTableLocator(page, tableSelector);

  // Get all rows in the table body
  const rows = table.locator('tbody tr, tr').filter({ has: page.locator('td') });

  // First check if table exists and get row count
  await expect(table).toBeAttached({ timeout });
  const rowCount = await rows.count();

  if (rowCount === 0) {
    throw new Error(`Table "${tableSelector}" has no data rows`);
  }

  // Now verify table is visible (only after we know it has rows)
  await expect(table).toBeVisible({ timeout });

  // Search for matching row
  let foundMatch = false;

  for (let i = 0; i < rowCount; i++) {
    const row = rows.nth(i);
    const matches = await rowMatchesData(row, rowData, exact);

    if (matches) {
      foundMatch = true;
      break;
    }
  }

  if (!foundMatch) {
    const rowDataStr = JSON.stringify(rowData);
    throw new Error(
      `Table "${tableSelector}" does not contain a row matching: ${rowDataStr}`
    );
  }
}

/**
 * Assert that a table has the expected number of rows
 *
 * @param page - Playwright page object
 * @param tableSelector - Selector for the table element
 * @param expectedCount - Expected number of rows
 * @param options - Table assertion options
 *
 * @example
 * ```typescript
 * // Assert table has exactly 10 rows
 * await expectTableRowCount(page, 'results-table', 10);
 *
 * // With custom timeout
 * await expectTableRowCount(page, 'orders-table', 5, { timeout: 10000 });
 * ```
 */
export async function expectTableRowCount(
  page: Page,
  tableSelector: string,
  expectedCount: number,
  options: TableAssertionOptions = {}
): Promise<void> {
  const { timeout = 5000 } = options;

  // Locate the table
  const table = getTableLocator(page, tableSelector);

  // For empty tables, we don't need to check visibility
  // (they might be hidden/collapsed when empty)
  if (expectedCount > 0) {
    await expect(table).toBeVisible({ timeout });
  } else {
    // Just wait for table to exist in DOM
    await expect(table).toBeAttached({ timeout });
  }

  // Get all rows in the table body
  const rows = table.locator('tbody tr, tr').filter({ has: page.locator('td') });

  // Assert count
  await expect(rows).toHaveCount(expectedCount, { timeout });
}

/**
 * Get table locator using common strategies
 *
 * Tries data-testid, role, and CSS selector in that order.
 *
 * @param page - Playwright page object
 * @param tableSelector - Table selector
 * @returns Table locator
 */
function getTableLocator(page: Page, tableSelector: string): Locator {
  // Try data-testid first
  if (!tableSelector.includes('[') && !tableSelector.includes('.') && !tableSelector.includes('#')) {
    return page.getByTestId(tableSelector);
  }

  // Try role if it looks like a role selector
  if (tableSelector === 'table') {
    return page.getByRole('table');
  }

  // Fall back to CSS selector
  return page.locator(tableSelector);
}

/**
 * Check if a row matches the expected data
 *
 * @param row - Table row locator
 * @param expectedData - Expected column-value pairs
 * @param exact - Whether to match exactly
 * @returns True if row matches, false otherwise
 */
async function rowMatchesData(
  row: Locator,
  expectedData: TableRowData,
  exact: boolean
): Promise<boolean> {
  for (const [column, expectedValue] of Object.entries(expectedData)) {
    // Try to find cell by data-testid first
    const cell = row.locator(`[data-testid="${column}"], [data-column="${column}"]`);

    // If not found, try finding by column index (assuming header order)
    if ((await cell.count()) === 0) {
      // Fall back to all cells - this is less precise but works for simple tables
      const cells = row.locator('td');
      const cellCount = await cells.count();

      // Try to match by cell content
      let foundCell = false;
      for (let i = 0; i < cellCount; i++) {
        const cellText = await cells.nth(i).textContent();
        const expectedStr = String(expectedValue);

        if (exact ? cellText?.trim() === expectedStr : cellText?.includes(expectedStr)) {
          foundCell = true;
          break;
        }
      }

      if (!foundCell) {
        return false;
      }
    } else {
      // Found cell by testid/column attribute
      const cellText = await cell.textContent();
      const expectedStr = String(expectedValue);

      const matches = exact
        ? cellText?.trim() === expectedStr
        : cellText?.includes(expectedStr);

      if (!matches) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Assert that a table is empty (has no data rows)
 *
 * @param page - Playwright page object
 * @param tableSelector - Selector for the table element
 * @param options - Table assertion options
 *
 * @example
 * ```typescript
 * // Assert table is empty
 * await expectTableEmpty(page, 'results-table');
 * ```
 */
export async function expectTableEmpty(
  page: Page,
  tableSelector: string,
  options: TableAssertionOptions = {}
): Promise<void> {
  await expectTableRowCount(page, tableSelector, 0, options);
}
