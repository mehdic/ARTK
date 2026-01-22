/**
 * Table assertion helpers
 *
 * Provides assertions for verifying table content and row data.
 * Implements FR-022: Table row assertions with column matching
 *
 * @module assertions/table
 */
import { type Page } from '@playwright/test';
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
export declare function expectTableToContainRow(page: Page, tableSelector: string, rowData: TableRowData, options?: TableAssertionOptions): Promise<void>;
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
export declare function expectTableRowCount(page: Page, tableSelector: string, expectedCount: number, options?: TableAssertionOptions): Promise<void>;
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
export declare function expectTableEmpty(page: Page, tableSelector: string, options?: TableAssertionOptions): Promise<void>;
//# sourceMappingURL=table.d.ts.map