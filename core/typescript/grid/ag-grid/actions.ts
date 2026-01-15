/**
 * AG Grid Actions
 *
 * Provides action functions for interacting with grid elements.
 *
 * @module grid/ag-grid/actions
 */

import type { RowMatcher } from '../types.js';
import { AG_GRID_SELECTORS, getSortDirection } from './selectors.js';
import {
  getCell,
  getFilterInput,
  getHeaderCell,
  getRow,
  type GridLocatorContext,
} from './locators.js';
import { waitForCellEditing } from './wait.js';

// ============================================================================
// Sorting Actions
// ============================================================================

/**
 * Sort by a column by clicking its header
 *
 * @param ctx - Grid locator context
 * @param colId - Column ID to sort by
 * @param direction - Optional target sort direction ('asc' or 'desc')
 */
export async function sortByColumn(
  ctx: GridLocatorContext,
  colId: string,
  direction?: 'asc' | 'desc'
): Promise<void> {
  const header = getHeaderCell(ctx, colId);

  if (!direction) {
    // Just click once to toggle sort
    await header.click();
    return;
  }

  // Click until desired direction is reached (max 3 clicks: none -> asc -> desc -> none)
  for (let i = 0; i < 3; i++) {
    const currentDirection = await getSortDirection(header);

    if (currentDirection === direction) {
      return; // Already at desired direction
    }

    await header.click();
    await ctx.page.waitForTimeout(100); // Allow sort to apply
  }

  throw new Error(
    `Could not sort column "${colId}" to "${direction}" after 3 attempts`
  );
}

// ============================================================================
// Filtering Actions
// ============================================================================

/**
 * Filter a column using the floating filter input
 *
 * @param ctx - Grid locator context
 * @param colId - Column ID to filter
 * @param filterValue - Value to filter by
 */
export async function filterColumn(
  ctx: GridLocatorContext,
  colId: string,
  filterValue: string
): Promise<void> {
  const filterInput = getFilterInput(ctx, colId);
  await filterInput.fill(filterValue);
  await ctx.page.waitForTimeout(100); // Allow filter to apply
}

/**
 * Clear the filter for a specific column
 *
 * @param ctx - Grid locator context
 * @param colId - Column ID to clear filter
 */
export async function clearFilter(
  ctx: GridLocatorContext,
  colId: string
): Promise<void> {
  const filterInput = getFilterInput(ctx, colId);
  await filterInput.clear();
  await ctx.page.waitForTimeout(100); // Allow filter to clear
}

/**
 * Clear all filters in the grid
 *
 * @param ctx - Grid locator context
 */
export async function clearAllFilters(ctx: GridLocatorContext): Promise<void> {
  const filterInputs = ctx.gridLocator.locator(`${AG_GRID_SELECTORS.FLOATING_FILTER} input`);
  const count = await filterInputs.count();

  for (let i = 0; i < count; i++) {
    const input = filterInputs.nth(i);
    const value = await input.inputValue();
    if (value) {
      await input.clear();
    }
  }

  await ctx.page.waitForTimeout(100); // Allow filters to clear
}

// ============================================================================
// Cell Interaction Actions
// ============================================================================

/**
 * Click on a specific cell
 *
 * @param ctx - Grid locator context
 * @param rowMatcher - Row matching criteria
 * @param colId - Column ID
 */
export async function clickCell(
  ctx: GridLocatorContext,
  rowMatcher: RowMatcher,
  colId: string
): Promise<void> {
  const cell = getCell(ctx, rowMatcher, colId);
  await cell.click();
}

/**
 * Double-click to edit a cell and enter a new value
 *
 * @param ctx - Grid locator context
 * @param rowMatcher - Row matching criteria
 * @param colId - Column ID
 * @param newValue - New value to enter
 */
export async function editCell(
  ctx: GridLocatorContext,
  rowMatcher: RowMatcher,
  colId: string,
  newValue: string
): Promise<void> {
  const cell = getCell(ctx, rowMatcher, colId);

  // Double-click to enter edit mode
  await cell.dblclick();

  // Wait for edit mode to activate
  await waitForCellEditing(cell, ctx.config);

  // Find the input element and fill it
  const input = cell.locator('input, textarea').first();
  await input.fill(newValue);

  // Press Enter to confirm
  await input.press('Enter');

  // Wait for edit mode to close
  await ctx.page.waitForTimeout(100);
}

/**
 * Press a key while focused on a cell
 *
 * @param ctx - Grid locator context
 * @param rowMatcher - Row matching criteria
 * @param colId - Column ID
 * @param key - Key to press (e.g., 'Enter', 'Escape', 'Delete')
 */
export async function pressCellKey(
  ctx: GridLocatorContext,
  rowMatcher: RowMatcher,
  colId: string,
  key: string
): Promise<void> {
  const cell = getCell(ctx, rowMatcher, colId);
  await cell.click();
  await cell.press(key);
}

// ============================================================================
// Row Selection Actions
// ============================================================================

/**
 * Select a row by clicking its checkbox or the row itself
 *
 * @param ctx - Grid locator context
 * @param matcher - Row matching criteria
 */
export async function selectRow(
  ctx: GridLocatorContext,
  matcher: RowMatcher
): Promise<void> {
  const row = getRow(ctx, matcher);
  const checkbox = row.locator(`${AG_GRID_SELECTORS.SELECTION_CHECKBOX} input`);
  const checkboxCount = await checkbox.count();

  if (checkboxCount > 0) {
    // Use checkbox if available
    const isChecked = await checkbox.isChecked();
    if (!isChecked) {
      await checkbox.check();
    }
  } else {
    // Click the row to select (assumes row selection mode)
    await row.click();
  }
}

/**
 * Deselect a row by unchecking its checkbox or clicking it again
 *
 * @param ctx - Grid locator context
 * @param matcher - Row matching criteria
 */
export async function deselectRow(
  ctx: GridLocatorContext,
  matcher: RowMatcher
): Promise<void> {
  const row = getRow(ctx, matcher);
  const checkbox = row.locator(`${AG_GRID_SELECTORS.SELECTION_CHECKBOX} input`);
  const checkboxCount = await checkbox.count();

  if (checkboxCount > 0) {
    const isChecked = await checkbox.isChecked();
    if (isChecked) {
      await checkbox.uncheck();
    }
  } else {
    // For toggle selection, clicking again deselects
    // Check if currently selected
    const classAttr = await row.getAttribute('class');
    if (classAttr?.includes('ag-row-selected')) {
      await row.click();
    }
  }
}

/**
 * Select all rows using the header checkbox
 *
 * @param ctx - Grid locator context
 */
export async function selectAllRows(ctx: GridLocatorContext): Promise<void> {
  const selectAll = ctx.gridLocator.locator(`${AG_GRID_SELECTORS.HEADER_SELECT_ALL} input`);
  const count = await selectAll.count();

  if (count > 0) {
    await selectAll.check();
  } else {
    throw new Error('Select all checkbox not found. Grid may not have row selection enabled.');
  }
}

/**
 * Deselect all rows using the header checkbox
 *
 * @param ctx - Grid locator context
 */
export async function deselectAllRows(ctx: GridLocatorContext): Promise<void> {
  const selectAll = ctx.gridLocator.locator(`${AG_GRID_SELECTORS.HEADER_SELECT_ALL} input`);
  const count = await selectAll.count();

  if (count > 0) {
    await selectAll.uncheck();
  } else {
    throw new Error('Select all checkbox not found. Grid may not have row selection enabled.');
  }
}

/**
 * Get IDs of all currently selected rows
 *
 * @param ctx - Grid locator context
 * @returns Array of selected row IDs
 */
export async function getSelectedRowIds(ctx: GridLocatorContext): Promise<string[]> {
  const selectedRows = ctx.gridLocator.locator(AG_GRID_SELECTORS.ROW_SELECTED);
  const count = await selectedRows.count();
  const ids: string[] = [];

  for (let i = 0; i < count; i++) {
    const rowId = await selectedRows.nth(i).getAttribute(AG_GRID_SELECTORS.ATTR_ROW_ID);
    if (rowId) {
      ids.push(rowId);
    }
  }

  return ids;
}

// ============================================================================
// Context Menu Actions
// ============================================================================

/**
 * Right-click on a cell to open context menu
 *
 * @param ctx - Grid locator context
 * @param rowMatcher - Row matching criteria
 * @param colId - Column ID
 */
export async function rightClickCell(
  ctx: GridLocatorContext,
  rowMatcher: RowMatcher,
  colId: string
): Promise<void> {
  const cell = getCell(ctx, rowMatcher, colId);
  await cell.click({ button: 'right' });
}

// ============================================================================
// Drag and Drop Actions
// ============================================================================

/**
 * Drag a row to a new position (for row reordering)
 *
 * @param ctx - Grid locator context
 * @param sourceMatcher - Source row matching criteria
 * @param targetMatcher - Target row matching criteria
 */
export async function dragRowTo(
  ctx: GridLocatorContext,
  sourceMatcher: RowMatcher,
  targetMatcher: RowMatcher
): Promise<void> {
  const sourceRow = getRow(ctx, sourceMatcher);
  const targetRow = getRow(ctx, targetMatcher);

  // Find the drag handle if it exists
  const dragHandle = sourceRow.locator('.ag-drag-handle').first();
  const handleCount = await dragHandle.count();

  const dragSource = handleCount > 0 ? dragHandle : sourceRow;

  await dragSource.dragTo(targetRow);
}
