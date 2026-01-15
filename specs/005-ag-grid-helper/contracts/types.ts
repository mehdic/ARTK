/**
 * AG Grid Helper Module - TypeScript Contracts
 *
 * This file defines the public API types for the AG Grid helper module.
 * These interfaces will be implemented in core/typescript/grid/types.ts
 *
 * @module grid/types
 */

import type { Locator, Page } from '@playwright/test';

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * AG Grid locator configuration
 */
export interface AgGridConfig {
  /** Grid container selector (testid, CSS, or Locator string) */
  selector: string;

  /** Column definitions for smart cell location */
  columns?: AgGridColumnDef[];

  /** Custom cell renderer mappings */
  cellRenderers?: Record<string, CellRendererConfig>;

  /** Field name used for stable row IDs (maps to getRowId in AG Grid) */
  rowIdField?: string;

  /** Enterprise feature configuration */
  enterprise?: EnterpriseConfig;

  /** Custom timeout overrides */
  timeouts?: TimeoutConfig;
}

/**
 * Column definition for type-safe cell access
 */
export interface AgGridColumnDef {
  /** Column ID (matches AG Grid col-id attribute) */
  colId: string;

  /** Human-readable name for error messages */
  displayName?: string;

  /** Cell value type for smart assertions */
  type?: ColumnType;

  /** Custom value extraction function for complex cells */
  valueExtractor?: (cell: Locator) => Promise<string>;

  /** Column pinned position */
  pinned?: 'left' | 'right' | null;
}

/**
 * Cell value types
 */
export type ColumnType = 'text' | 'number' | 'date' | 'boolean' | 'custom';

/**
 * Custom cell renderer configuration
 */
export interface CellRendererConfig {
  /** CSS selector for the value element within cell */
  valueSelector: string;

  /** Custom extraction function (defaults to textContent) */
  extractValue?: (element: Locator) => Promise<string>;
}

/**
 * AG Grid Enterprise feature configuration
 */
export interface EnterpriseConfig {
  /** Enable row grouping support */
  rowGrouping?: boolean;

  /** Enable tree data support */
  treeData?: boolean;

  /** Enable master/detail support */
  masterDetail?: boolean;

  /** Enable server-side row model handling */
  serverSide?: boolean;
}

/**
 * Custom timeout configuration
 */
export interface TimeoutConfig {
  /** Timeout for grid ready state (ms). Default: 30000 */
  gridReady?: number;

  /** Timeout for row to appear (ms). Default: 10000 */
  rowLoad?: number;

  /** Timeout for cell edit mode (ms). Default: 5000 */
  cellEdit?: number;

  /** Interval between scroll operations (ms). Default: 50 */
  scroll?: number;
}

// ============================================================================
// Row Matching Types
// ============================================================================

/**
 * Criteria for finding a specific row in the grid
 */
export interface RowMatcher {
  /** Match by viewport row index (0-based) */
  rowIndex?: number;

  /** Match by stable row ID (requires rowIdField in config) */
  rowId?: string;

  /** Match by absolute aria-rowindex (1-based) */
  ariaRowIndex?: number;

  /** Match by cell value combinations */
  cellValues?: Record<string, unknown>;

  /** Custom match predicate */
  predicate?: (row: AgGridRowData) => boolean;
}

// ============================================================================
// Data Extraction Types
// ============================================================================

/**
 * Extracted data from a grid row
 */
export interface AgGridRowData {
  /** Viewport row index (0-based) */
  rowIndex: number;

  /** Stable row ID if available */
  rowId?: string;

  /** Absolute row position (1-based, from aria-rowindex) */
  ariaRowIndex: number;

  /** Cell values keyed by colId */
  cells: Record<string, unknown>;

  /** True if this is a group row */
  isGroup?: boolean;

  /** True if group/tree node is expanded */
  isExpanded?: boolean;

  /** Nesting level for tree/group rows */
  groupLevel?: number;
}

/**
 * Current state of the grid
 */
export interface AgGridState {
  /** Total row count (from pagination info or DOM) */
  totalRows: number;

  /** Currently visible row count in viewport */
  visibleRows: number;

  /** Selected row count */
  selectedRows: number;

  /** Current sort state */
  sortedBy?: SortModel[];

  /** Current filter state */
  filteredBy?: Record<string, unknown>;

  /** Columns used for grouping */
  groupedBy?: string[];

  /** True if loading overlay is visible */
  isLoading: boolean;
}

/**
 * Sort state for a column
 */
export interface SortModel {
  /** Column being sorted */
  colId: string;

  /** Sort direction */
  direction: 'asc' | 'desc';
}

// ============================================================================
// Assertion Options
// ============================================================================

/**
 * Common options for grid assertions
 */
export interface AssertionOptions {
  /** Assertion timeout in ms. Default: 5000 */
  timeout?: number;

  /** Require exact match vs contains. Default: false */
  exact?: boolean;
}

/**
 * Options for row count assertions
 */
export interface RowCountOptions extends AssertionOptions {
  /** Minimum row count (for range assertions) */
  min?: number;

  /** Maximum row count (for range assertions) */
  max?: number;
}

// ============================================================================
// Helper Interface
// ============================================================================

/**
 * AG Grid Helper - Main interface for grid interactions
 */
export interface AgGridHelper {
  // ─────────────────────────────────────────────────────────────────────────
  // Locators
  // ─────────────────────────────────────────────────────────────────────────

  /** Get the root grid container */
  getGrid(): Locator;

  /** Get a specific row by matcher */
  getRow(matcher: RowMatcher): Locator;

  /** Get all visible rows */
  getVisibleRows(): Locator;

  /** Get a specific cell */
  getCell(rowMatcher: RowMatcher, colId: string): Locator;

  /** Get header cell by column ID */
  getHeaderCell(colId: string): Locator;

  /** Get filter input for a column (floating filters) */
  getFilterInput(colId: string): Locator;

  // ─────────────────────────────────────────────────────────────────────────
  // Wait Utilities
  // ─────────────────────────────────────────────────────────────────────────

  /** Wait for grid to be fully rendered and ready */
  waitForReady(options?: { timeout?: number }): Promise<void>;

  /** Wait for loading overlay to disappear */
  waitForDataLoaded(options?: { timeout?: number }): Promise<void>;

  /** Wait for a specific row count */
  waitForRowCount(count: number, options?: { timeout?: number }): Promise<void>;

  /** Wait for row to appear (handles virtualization) */
  waitForRow(matcher: RowMatcher, options?: { timeout?: number }): Promise<Locator>;

  // ─────────────────────────────────────────────────────────────────────────
  // Assertions
  // ─────────────────────────────────────────────────────────────────────────

  /** Assert grid has expected row count */
  expectRowCount(count: number, options?: RowCountOptions): Promise<void>;

  /** Assert grid contains a row matching criteria */
  expectRowContains(
    cellValues: Record<string, unknown>,
    options?: AssertionOptions
  ): Promise<void>;

  /** Assert grid does NOT contain a row matching criteria */
  expectRowNotContains(
    cellValues: Record<string, unknown>,
    options?: AssertionOptions
  ): Promise<void>;

  /** Assert cell has expected value */
  expectCellValue(
    rowMatcher: RowMatcher,
    colId: string,
    expectedValue: unknown,
    options?: AssertionOptions
  ): Promise<void>;

  /** Assert grid is sorted by column */
  expectSortedBy(
    colId: string,
    direction: 'asc' | 'desc',
    options?: AssertionOptions
  ): Promise<void>;

  /** Assert grid is empty (no data rows) */
  expectEmpty(options?: AssertionOptions): Promise<void>;

  /** Assert row is selected */
  expectRowSelected(matcher: RowMatcher, options?: AssertionOptions): Promise<void>;

  /** Assert grid shows "no rows" overlay */
  expectNoRowsOverlay(options?: AssertionOptions): Promise<void>;

  // ─────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────

  /** Click on a cell */
  clickCell(rowMatcher: RowMatcher, colId: string): Promise<void>;

  /** Double-click to edit a cell */
  editCell(
    rowMatcher: RowMatcher,
    colId: string,
    newValue: string
  ): Promise<void>;

  /** Sort by column (click header) */
  sortByColumn(colId: string, direction?: 'asc' | 'desc'): Promise<void>;

  /** Filter column using floating filter */
  filterColumn(colId: string, filterValue: string): Promise<void>;

  /** Clear filter for column */
  clearFilter(colId: string): Promise<void>;

  /** Clear all filters */
  clearAllFilters(): Promise<void>;

  /** Select a row (click checkbox or row) */
  selectRow(matcher: RowMatcher): Promise<void>;

  /** Deselect a row */
  deselectRow(matcher: RowMatcher): Promise<void>;

  /** Select all rows */
  selectAllRows(): Promise<void>;

  /** Deselect all rows */
  deselectAllRows(): Promise<void>;

  /** Scroll to bring row into view */
  scrollToRow(matcher: RowMatcher): Promise<void>;

  /** Scroll to bring column into view */
  scrollToColumn(colId: string): Promise<void>;

  // ─────────────────────────────────────────────────────────────────────────
  // Enterprise Features
  // ─────────────────────────────────────────────────────────────────────────

  /** Expand a group row */
  expandGroup(matcher: RowMatcher): Promise<void>;

  /** Collapse a group row */
  collapseGroup(matcher: RowMatcher): Promise<void>;

  /** Expand all groups */
  expandAllGroups(): Promise<void>;

  /** Collapse all groups */
  collapseAllGroups(): Promise<void>;

  /** Get group children count */
  getGroupChildCount(matcher: RowMatcher): Promise<number>;

  /** Expand master row to show detail */
  expandMasterRow(matcher: RowMatcher): Promise<void>;

  /** Get detail grid for master row */
  getDetailGrid(masterRowMatcher: RowMatcher): AgGridHelper;

  // ─────────────────────────────────────────────────────────────────────────
  // Data Extraction
  // ─────────────────────────────────────────────────────────────────────────

  /** Get cell value */
  getCellValue(rowMatcher: RowMatcher, colId: string): Promise<unknown>;

  /** Get all cell values for a row */
  getRowData(matcher: RowMatcher): Promise<AgGridRowData>;

  /** Get all visible row data */
  getAllVisibleRowData(): Promise<AgGridRowData[]>;

  /** Get current grid state */
  getGridState(): Promise<AgGridState>;

  /** Get selected row IDs */
  getSelectedRowIds(): Promise<string[]>;
}

// ============================================================================
// Factory Function
// ============================================================================

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
 *     { colId: 'orderId', type: 'text' },
 *     { colId: 'amount', type: 'number' },
 *   ],
 *   enterprise: { rowGrouping: true }
 * });
 * ```
 */
export type AgGridFactory = (
  page: Page,
  config: string | AgGridConfig
) => AgGridHelper;
