/**
 * AG Grid Helper Module - TypeScript Types
 *
 * This file defines the public API types for the AG Grid helper module.
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

/**
 * Default timeout values
 */
export const DEFAULT_TIMEOUTS: Required<TimeoutConfig> = {
  gridReady: 30000,
  rowLoad: 10000,
  cellEdit: 5000,
  scroll: 50,
};

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
  expectRowContains(cellValues: Record<string, unknown>, options?: AssertionOptions): Promise<void>;

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
  expectSortedBy(colId: string, direction: 'asc' | 'desc', options?: AssertionOptions): Promise<void>;

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
  editCell(rowMatcher: RowMatcher, colId: string, newValue: string): Promise<void>;

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
// Factory Function Type
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
export type AgGridFactory = (page: Page, config: string | AgGridConfig) => AgGridHelper;

// ============================================================================
// Internal Types (used by implementation)
// ============================================================================

/**
 * Normalized configuration with all defaults applied
 * @internal
 */
export interface NormalizedAgGridConfig extends AgGridConfig {
  timeouts: Required<TimeoutConfig>;
}

/**
 * Result of finding the closest matching row
 * @internal
 */
export interface ClosestMatchResult {
  /** The row data of the closest match */
  row: AgGridRowData;
  /** Number of fields that matched */
  matchedFields: number;
  /** Total fields being compared */
  totalFields: number;
  /** Fields that didn't match with expected vs actual */
  mismatches: Array<{
    field: string;
    expected: unknown;
    actual: unknown;
  }>;
}

// ============================================================================
// Server-Side Row Model Types
// ============================================================================

/**
 * Server-side row model configuration
 */
export interface ServerSideConfig {
  /** Block size for infinite scrolling. Default: 100 */
  blockSize?: number;

  /** Maximum blocks to keep in cache. Default: 10 */
  maxBlocksInCache?: number;

  /** Timeout for waiting for block to load (ms). Default: 30000 */
  blockLoadTimeout?: number;
}

/**
 * Server-side loading state
 */
export interface ServerSideState {
  /** True if currently loading a block */
  isLoading: boolean;

  /** Range of loaded row indices */
  loadedRange: { start: number; end: number } | null;

  /** Total row count from server (-1 if unknown) */
  totalServerRows: number;

  /** Number of blocks currently cached */
  cachedBlocks: number;
}

/**
 * Options for server-side operations
 */
export interface ServerSideOptions {
  /** Timeout for block load (ms) */
  timeout?: number;

  /** Whether to force refresh cached data */
  forceRefresh?: boolean;

  /** Block size for server-side loading (default: 100) */
  blockSize?: number;

  /** Maximum blocks to keep in cache (default: 10) */
  maxBlocksInCache?: number;
}

// ============================================================================
// Column Group Types
// ============================================================================

/**
 * Column group definition
 */
export interface ColumnGroupDef {
  /** Group ID */
  groupId: string;

  /** Human-readable group name */
  displayName?: string;

  /** Child column IDs in this group */
  children: string[];

  /** Whether group is initially expanded */
  openByDefault?: boolean;
}

/**
 * Column group state
 */
export interface ColumnGroupState {
  /** Group ID */
  groupId: string;

  /** Whether the group is expanded */
  isExpanded: boolean;

  /** Visible child column IDs */
  visibleChildren: string[];
}

// ============================================================================
// Range Selection Types
// ============================================================================

/**
 * Cell position in grid
 */
export interface CellPosition {
  /** Row matcher to identify the row */
  rowMatcher: RowMatcher;

  /** Column ID */
  colId: string;
}

/**
 * Cell range for selection
 */
export interface CellRange {
  /** Starting cell (top-left of range) */
  start: CellPosition;

  /** Ending cell (bottom-right of range) */
  end: CellPosition;
}

/**
 * Range selection state
 */
export interface RangeSelectionState {
  /** Currently selected ranges */
  ranges: CellRange[];

  /** Number of cells selected */
  cellCount: number;

  /** Number of rows spanned */
  rowCount: number;

  /** Number of columns spanned */
  columnCount: number;
}

/**
 * Options for range selection
 */
export interface RangeSelectionOptions {
  /** Whether to add to existing selection (Ctrl+click behavior) */
  addToSelection?: boolean;

  /** Whether to extend existing selection (Shift+click behavior) */
  extendSelection?: boolean;
}

// ============================================================================
// Keyboard Navigation Types
// ============================================================================

/**
 * Navigation direction
 */
export type NavigationDirection = 'up' | 'down' | 'left' | 'right';

/**
 * Keyboard navigation options
 */
export interface KeyboardNavigationOptions {
  /** Number of cells to move. Default: 1 */
  count?: number;

  /** Whether to hold Shift (for range selection) */
  shiftKey?: boolean;

  /** Whether to hold Ctrl/Cmd (for jump navigation) */
  ctrlKey?: boolean;

  /** Whether to hold Alt (for special navigation) */
  altKey?: boolean;
}

/**
 * Keyboard action type
 */
export type KeyboardAction =
  | 'enter'        // Enter edit mode or confirm
  | 'escape'       // Exit edit mode or cancel
  | 'tab'          // Move to next cell
  | 'shiftTab'     // Move to previous cell
  | 'space'        // Toggle selection
  | 'delete'       // Clear cell content
  | 'copy'         // Copy selected cells
  | 'paste'        // Paste clipboard content
  | 'selectAll'    // Select all cells (Ctrl+A)
  | 'home'         // Jump to first cell in row
  | 'end'          // Jump to last cell in row
  | 'ctrlHome'     // Jump to first cell in grid
  | 'ctrlEnd'      // Jump to last cell in grid
  | 'pageUp'       // Scroll up one page
  | 'pageDown';    // Scroll down one page

/**
 * Keyboard navigation state
 */
export interface KeyboardNavigationState {
  /** Currently focused cell position */
  focusedCell: CellPosition | null;

  /** Whether a cell is currently in edit mode */
  isEditing: boolean;

  /** Cell currently being edited (if any) */
  editingCell: CellPosition | null;

  /** Whether header row is focused */
  isHeaderFocused: boolean;
}

// ============================================================================
// Nested Detail Grid Types
// ============================================================================

/**
 * Detail grid path for nested navigation
 */
export interface DetailGridPath {
  /** Sequence of master row matchers from root to target */
  path: RowMatcher[];
}

/**
 * Nested detail grid state
 */
export interface NestedDetailState {
  /** Depth level (0 = root grid, 1 = first detail, etc.) */
  depth: number;

  /** Path from root to this grid */
  path: DetailGridPath;

  /** Whether this detail grid has its own details */
  hasNestedDetails: boolean;

  /** Number of expanded detail rows in this grid */
  expandedDetailCount: number;
}

/**
 * Options for nested detail operations
 */
export interface NestedDetailOptions {
  /** Maximum depth to traverse. Default: 5 */
  maxDepth?: number;

  /** Timeout for each level expansion (ms). Default: 5000 */
  timeout?: number;

  /** Whether to auto-expand intermediate levels */
  autoExpand?: boolean;
}

// ============================================================================
// Extended Helper Interface
// ============================================================================

/**
 * Extended AG Grid helper with advanced features
 */
export interface AgGridHelperExtended extends AgGridHelper {
  // ─────────────────────────────────────────────────────────────────────────
  // Server-Side Row Model
  // ─────────────────────────────────────────────────────────────────────────

  /** Wait for server-side block to load */
  waitForBlockLoad(rowIndex: number, options?: ServerSideOptions): Promise<void>;

  /** Get server-side loading state */
  getServerSideState(): Promise<ServerSideState>;

  /** Refresh server-side data */
  refreshServerSideData(options?: ServerSideOptions): Promise<void>;

  /** Scroll to row with server-side loading */
  scrollToServerSideRow(rowIndex: number, options?: ServerSideOptions): Promise<void>;

  /** Check if row index is loaded */
  isRowLoaded(rowIndex: number): Promise<boolean>;

  // ─────────────────────────────────────────────────────────────────────────
  // Column Groups
  // ─────────────────────────────────────────────────────────────────────────

  /** Get column group header locator */
  getColumnGroupHeader(groupId: string): Locator;

  /** Expand a column group */
  expandColumnGroup(groupId: string): Promise<void>;

  /** Collapse a column group */
  collapseColumnGroup(groupId: string): Promise<void>;

  /** Toggle column group expand/collapse */
  toggleColumnGroup(groupId: string): Promise<void>;

  /** Check if column group is expanded */
  isColumnGroupExpanded(groupId: string): Promise<boolean>;

  /** Get all column group states */
  getColumnGroupStates(): Promise<ColumnGroupState[]>;

  /** Get visible columns in a group */
  getGroupVisibleColumns(groupId: string): Promise<string[]>;

  // ─────────────────────────────────────────────────────────────────────────
  // Range Selection
  // ─────────────────────────────────────────────────────────────────────────

  /** Select a range of cells */
  selectCellRange(range: CellRange, options?: RangeSelectionOptions): Promise<void>;

  /** Select cells by dragging */
  selectCellsByDrag(start: CellPosition, end: CellPosition): Promise<void>;

  /** Add cell to selection */
  addCellToSelection(position: CellPosition): Promise<void>;

  /** Clear all range selections */
  clearRangeSelection(): Promise<void>;

  /** Get current range selection state */
  getRangeSelectionState(): Promise<RangeSelectionState>;

  /** Get values from selected range */
  getSelectedRangeValues(): Promise<unknown[][]>;

  /** Assert cells in range are selected */
  expectRangeSelected(range: CellRange): Promise<void>;

  /** Copy selected cells to clipboard */
  copySelectedCells(): Promise<void>;

  /** Paste from clipboard to selected cells */
  pasteToSelectedCells(): Promise<void>;

  // ─────────────────────────────────────────────────────────────────────────
  // Keyboard Navigation
  // ─────────────────────────────────────────────────────────────────────────

  /** Navigate using arrow keys */
  navigateCell(direction: NavigationDirection, options?: KeyboardNavigationOptions): Promise<void>;

  /** Perform keyboard action */
  performKeyboardAction(action: KeyboardAction): Promise<void>;

  /** Navigate to first cell in grid */
  navigateToFirstCell(): Promise<void>;

  /** Navigate to last cell in grid */
  navigateToLastCell(): Promise<void>;

  /** Navigate to first cell in current row */
  navigateToRowStart(): Promise<void>;

  /** Navigate to last cell in current row */
  navigateToRowEnd(): Promise<void>;

  /** Navigate to specific cell and focus it */
  focusCell(position: CellPosition): Promise<void>;

  /** Get currently focused cell position */
  getFocusedCell(): Promise<CellPosition | null>;

  /** Assert cell is focused */
  expectCellFocused(position: CellPosition): Promise<void>;

  /** Enter edit mode on focused cell */
  enterEditMode(): Promise<void>;

  /** Exit edit mode */
  exitEditMode(confirm?: boolean): Promise<void>;

  /** Tab to next editable cell */
  tabToNextCell(): Promise<void>;

  /** Tab to previous editable cell */
  tabToPreviousCell(): Promise<void>;

  // ─────────────────────────────────────────────────────────────────────────
  // Nested Detail Grids
  // ─────────────────────────────────────────────────────────────────────────

  /** Get detail grid by path */
  getDetailGridByPath(path: DetailGridPath): AgGridHelperExtended;

  /** Get nested detail state */
  getNestedDetailState(): Promise<NestedDetailState>;

  /** Expand nested detail row at path */
  expandNestedDetail(path: DetailGridPath, options?: NestedDetailOptions): Promise<void>;

  /** Collapse nested detail row at path */
  collapseNestedDetail(path: DetailGridPath): Promise<void>;

  /** Get all expanded detail paths */
  getExpandedDetailPaths(): Promise<DetailGridPath[]>;

  /** Find detail grid containing specific data */
  findDetailGridWithData(
    cellValues: Record<string, unknown>,
    options?: NestedDetailOptions
  ): Promise<AgGridHelperExtended | null>;

  /** Get depth of current grid (0 = root) */
  getGridDepth(): number;

  /** Get parent grid (null if root) */
  getParentGrid(): AgGridHelperExtended | null;

  /** Get root grid */
  getRootGrid(): AgGridHelperExtended;
}
