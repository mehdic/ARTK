/**
 * ARTK Core v1 - Grid Helper Module
 *
 * Comprehensive helpers for testing AG Grid components with Playwright.
 * Handles virtualization, enterprise features, custom cell renderers,
 * and provides robust assertions with actionable error messages.
 *
 * @module grid
 *
 * @example
 * ```typescript
 * import { agGrid } from '@artk/core/grid';
 *
 * test('verify order grid', async ({ page }) => {
 *   const grid = agGrid(page, 'orders-grid');
 *   await grid.waitForReady();
 *   await grid.expectRowCount(10);
 *   await grid.expectRowContains({ orderId: '12345', status: 'Active' });
 * });
 * ```
 */

// Export all types
export type {
  AgGridConfig,
  AgGridColumnDef,
  ColumnType,
  CellRendererConfig,
  EnterpriseConfig,
  TimeoutConfig,
  RowMatcher,
  AgGridRowData,
  AgGridState,
  SortModel,
  AssertionOptions,
  RowCountOptions,
  AgGridHelper,
  AgGridFactory,
} from './types.js';

// Export default timeout constants
export { DEFAULT_TIMEOUTS } from './types.js';

// Export AG Grid factory and helper
export { agGrid } from './ag-grid/index.js';
