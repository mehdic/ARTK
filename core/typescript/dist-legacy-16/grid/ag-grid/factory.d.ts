/**
 * AG Grid Factory Function
 *
 * Creates AG Grid helper instances.
 *
 * @module grid/ag-grid/factory
 */
import type { AgGridFactory } from '../types.js';
/**
 * Create an AG Grid helper instance
 *
 * @param page - Playwright page object
 * @param config - Grid configuration (string selector or full config)
 * @returns AG Grid helper instance
 *
 * @example
 * ```typescript
 * // Simple usage with test ID
 * const grid = agGrid(page, 'orders-grid');
 *
 * // Full configuration
 * const grid = agGrid(page, {
 *   selector: 'orders-grid',
 *   columns: [
 *     { colId: 'orderId', type: 'text', displayName: 'Order ID' },
 *     { colId: 'amount', type: 'number', displayName: 'Amount' },
 *   ],
 *   enterprise: { rowGrouping: true }
 * });
 *
 * // Usage in tests
 * await grid.waitForReady();
 * await grid.expectRowCount(10);
 * await grid.expectRowContains({ orderId: 'ORD-001', status: 'Active' });
 * ```
 */
export declare const agGrid: AgGridFactory;
//# sourceMappingURL=factory.d.ts.map