/**
 * Unit tests for AG Grid selector utilities
 */

import { describe, it, expect } from 'vitest';
import {
  AG_GRID_SELECTORS,
  buildCellSelector,
  buildRowSelector,
  buildHeaderCellSelector,
  buildFilterInputSelector,
} from '../ag-grid/selectors.js';

describe('AG_GRID_SELECTORS', () => {
  it('should have all required selectors defined', () => {
    expect(AG_GRID_SELECTORS.ROOT_WRAPPER).toBe('.ag-root-wrapper');
    expect(AG_GRID_SELECTORS.HEADER).toBe('.ag-header');
    expect(AG_GRID_SELECTORS.ROW).toBe('.ag-row');
    expect(AG_GRID_SELECTORS.CELL).toBe('.ag-cell');
    expect(AG_GRID_SELECTORS.LOADING_OVERLAY).toBe('.ag-overlay-loading-center');
    expect(AG_GRID_SELECTORS.NO_ROWS_OVERLAY).toBe('.ag-overlay-no-rows-center');
  });

  it('should have correct attribute names', () => {
    expect(AG_GRID_SELECTORS.ATTR_COL_ID).toBe('col-id');
    expect(AG_GRID_SELECTORS.ATTR_ROW_INDEX).toBe('row-index');
    expect(AG_GRID_SELECTORS.ATTR_ROW_ID).toBe('row-id');
    expect(AG_GRID_SELECTORS.ATTR_ARIA_ROW_INDEX).toBe('aria-rowindex');
  });
});

describe('buildCellSelector', () => {
  it('should build selector with col-id attribute', () => {
    const selector = buildCellSelector('orderId');
    expect(selector).toBe('.ag-cell[col-id="orderId"]');
  });

  it('should handle column IDs with special characters', () => {
    const selector = buildCellSelector('order-id');
    expect(selector).toBe('.ag-cell[col-id="order-id"]');
  });

  it('should handle column IDs with underscores', () => {
    const selector = buildCellSelector('order_id');
    expect(selector).toBe('.ag-cell[col-id="order_id"]');
  });
});

describe('buildHeaderCellSelector', () => {
  it('should build selector for header cell with col-id', () => {
    const selector = buildHeaderCellSelector('amount');
    expect(selector).toBe('.ag-header-cell[col-id="amount"]');
  });
});

describe('buildRowSelector', () => {
  it('should build selector with aria-rowindex when provided', () => {
    const selector = buildRowSelector({ ariaRowIndex: 5 });
    expect(selector).toBe('.ag-row[aria-rowindex="5"]');
  });

  it('should build selector with row-id when provided', () => {
    const selector = buildRowSelector({ rowId: 'row-123' });
    expect(selector).toBe('.ag-row[row-id="row-123"]');
  });

  it('should build selector with row-index when provided', () => {
    const selector = buildRowSelector({ rowIndex: 3 });
    expect(selector).toBe('.ag-row[row-index="3"]');
  });

  it('should prioritize aria-rowindex over row-id', () => {
    const selector = buildRowSelector({ ariaRowIndex: 5, rowId: 'row-123' });
    expect(selector).toBe('.ag-row[aria-rowindex="5"]');
  });

  it('should prioritize row-id over row-index', () => {
    const selector = buildRowSelector({ rowId: 'row-123', rowIndex: 3 });
    expect(selector).toBe('.ag-row[row-id="row-123"]');
  });

  it('should return generic row selector when no options provided', () => {
    const selector = buildRowSelector({});
    expect(selector).toBe('.ag-row');
  });

  it('should handle rowIndex of 0', () => {
    const selector = buildRowSelector({ rowIndex: 0 });
    expect(selector).toBe('.ag-row[row-index="0"]');
  });

  it('should handle ariaRowIndex of 1 (first row)', () => {
    const selector = buildRowSelector({ ariaRowIndex: 1 });
    expect(selector).toBe('.ag-row[aria-rowindex="1"]');
  });
});

describe('buildFilterInputSelector', () => {
  it('should build selector for floating filter input', () => {
    const selector = buildFilterInputSelector('status');
    expect(selector).toBe('.ag-floating-filter[col-id="status"] input');
  });
});
