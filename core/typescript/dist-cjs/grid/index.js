"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.agGrid = exports.DEFAULT_TIMEOUTS = void 0;
// Export default timeout constants
var types_js_1 = require("./types.js");
Object.defineProperty(exports, "DEFAULT_TIMEOUTS", { enumerable: true, get: function () { return types_js_1.DEFAULT_TIMEOUTS; } });
// Export AG Grid factory and helper
var index_js_1 = require("./ag-grid/index.js");
Object.defineProperty(exports, "agGrid", { enumerable: true, get: function () { return index_js_1.agGrid; } });
//# sourceMappingURL=index.js.map