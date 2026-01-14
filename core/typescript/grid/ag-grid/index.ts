/**
 * AG Grid Helper - Main Export
 *
 * @module grid/ag-grid
 */

export { agGrid } from './factory.js';

// Re-export internal utilities for advanced usage
export { normalizeConfig, mergeTimeouts, validateConfig } from './config.js';
export {
  getGridRoot,
  buildCellSelector,
  buildRowSelector,
  buildHeaderCellSelector,
  buildFilterInputSelector,
  AG_GRID_SELECTORS,
} from './selectors.js';

// Re-export helper class for extension
export { AgGridHelperImpl } from './helper.js';

// Re-export enterprise feature utilities
export * from './enterprise/index.js';
