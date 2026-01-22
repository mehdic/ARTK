"use strict";
/**
 * AG Grid Factory Function
 *
 * Creates AG Grid helper instances.
 *
 * @module grid/ag-grid/factory
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.agGrid = void 0;
const helper_js_1 = require("./helper.js");
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
const agGrid = (page, config) => {
    return new helper_js_1.AgGridHelperImpl(page, config);
};
exports.agGrid = agGrid;
//# sourceMappingURL=factory.js.map