/**
 * AG Grid Keyboard Navigation Support
 *
 * Provides comprehensive keyboard navigation utilities for testing grids,
 * including arrow key navigation, Tab navigation, edit mode, and shortcuts.
 *
 * @module grid/ag-grid/enterprise/keyboard-navigation
 */

import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import type {
  NormalizedAgGridConfig,
  CellPosition,
  NavigationDirection,
  KeyboardAction,
  KeyboardNavigationState,
  KeyboardNavigationOptions,
} from '../../types.js';
import { AG_GRID_SELECTORS, buildRowSelectorFromMatcher } from '../selectors.js';

/**
 * AG Grid keyboard navigation CSS selectors
 */
export const KEYBOARD_NAV_SELECTORS = {
  /** Focused cell */
  CELL_FOCUS: '.ag-cell-focus',

  /** Cell being edited */
  CELL_EDITING: '.ag-cell-editing',

  /** Cell editor input */
  CELL_EDITOR: '.ag-cell-editor',

  /** Cell editor input element */
  CELL_EDITOR_INPUT: '.ag-cell-editor input, .ag-cell-editor textarea, .ag-cell-edit-input',

  /** Focused row */
  ROW_FOCUS: '.ag-row-focus',

  /** Header cell focus */
  HEADER_CELL_FOCUS: '.ag-header-cell-focus',

  /** Popup editor */
  POPUP_EDITOR: '.ag-popup-editor',

  /** Rich select editor */
  RICH_SELECT_EDITOR: '.ag-rich-select',

  /** Large text editor */
  LARGE_TEXT_EDITOR: '.ag-large-textarea',

  /** Select editor */
  SELECT_EDITOR: '.ag-cell-editor select',

  /** Tab guard elements */
  TAB_GUARD: '.ag-tab-guard',
} as const;

/**
 * Platform-aware modifier key
 */
function getPlatformModifier(): 'Meta' | 'Control' {
  return process.platform === 'darwin' ? 'Meta' : 'Control';
}

/**
 * Default timeout for focus operations
 */
const FOCUS_TIMEOUT = 2000;

/**
 * Wait for a cell to gain focus after a navigation action
 *
 * @param gridLocator - The grid root locator
 * @param previousPosition - The position before navigation (optional, to verify change)
 * @param timeout - Maximum time to wait
 */
async function waitForFocusSettled(
  gridLocator: Locator,
  previousPosition: CellPosition | null = null,
  timeout: number = FOCUS_TIMEOUT
): Promise<void> {
  await expect(async () => {
    const focusedCell = gridLocator.locator(KEYBOARD_NAV_SELECTORS.CELL_FOCUS);
    const count = await focusedCell.count();
    expect(count).toBeGreaterThan(0);

    // If we have a previous position, verify focus actually moved
    if (previousPosition) {
      const cell = focusedCell.first();
      const colId = await cell.getAttribute('col-id');
      const row = cell.locator('..');
      const ariaRowIndex = await row.getAttribute('aria-rowindex');

      // Focus should have changed (either row or column)
      const prevRow = previousPosition.rowMatcher.ariaRowIndex;
      const currentRow = ariaRowIndex ? parseInt(ariaRowIndex, 10) : null;
      const focusChanged =
        colId !== previousPosition.colId || currentRow !== prevRow;
      expect(focusChanged).toBe(true);
    }
  }).toPass({ timeout });
}

/**
 * Wait for edit mode to be active on the focused cell
 *
 * @param gridLocator - The grid root locator
 * @param timeout - Maximum time to wait
 */
export async function waitForEditMode(
  gridLocator: Locator,
  timeout: number = FOCUS_TIMEOUT
): Promise<void> {
  const editingCell = gridLocator.locator(KEYBOARD_NAV_SELECTORS.CELL_EDITING);
  await expect(editingCell.first()).toBeVisible({ timeout });
}

/**
 * Wait for edit mode to be exited
 *
 * @param gridLocator - The grid root locator
 * @param timeout - Maximum time to wait
 */
export async function waitForEditModeExit(
  gridLocator: Locator,
  timeout: number = FOCUS_TIMEOUT
): Promise<void> {
  const editingCell = gridLocator.locator(KEYBOARD_NAV_SELECTORS.CELL_EDITING);
  await expect(editingCell).toHaveCount(0, { timeout });
}

/**
 * Get the currently focused cell position
 *
 * @param gridLocator - The grid root locator
 * @returns Current cell position or null if no cell is focused
 */
export async function getFocusedCellPosition(
  gridLocator: Locator
): Promise<CellPosition | null> {
  const focusedCell = gridLocator.locator(KEYBOARD_NAV_SELECTORS.CELL_FOCUS);
  const count = await focusedCell.count();

  if (count === 0) {
    return null;
  }

  const cell = focusedCell.first();
  const colId = await cell.getAttribute('col-id');
  const row = cell.locator('..');
  const ariaRowIndex = await row.getAttribute('aria-rowindex');

  if (!colId || !ariaRowIndex) {
    return null;
  }

  return {
    rowMatcher: { ariaRowIndex: parseInt(ariaRowIndex, 10) },
    colId,
  };
}

/**
 * Focus a specific cell in the grid
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @param position - Cell position to focus
 * @param config - Normalized grid configuration
 */
export async function focusCell(
  gridLocator: Locator,
  _page: Page,
  position: CellPosition,
  _config: NormalizedAgGridConfig
): Promise<void> {
  const rowSelector = buildRowSelectorFromMatcher(position.rowMatcher);
  let cell: Locator;

  if (rowSelector) {
    cell = gridLocator.locator(rowSelector).locator(
      `${AG_GRID_SELECTORS.CELL}[col-id="${position.colId}"]`
    );
  } else {
    cell = gridLocator.locator(
      `${AG_GRID_SELECTORS.ROW} ${AG_GRID_SELECTORS.CELL}[col-id="${position.colId}"]`
    );
  }

  await expect(cell.first()).toBeVisible({ timeout: 5000 });
  await cell.first().click();

  // Verify focus was established
  await expect(cell.first()).toHaveClass(/ag-cell-focus/, { timeout: 2000 });
}

/**
 * Navigate using arrow keys
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @param direction - Navigation direction
 * @param options - Navigation options
 */
export async function navigateArrow(
  gridLocator: Locator,
  page: Page,
  direction: NavigationDirection,
  options?: KeyboardNavigationOptions
): Promise<void> {
  const keyMap: Record<NavigationDirection, string> = {
    up: 'ArrowUp',
    down: 'ArrowDown',
    left: 'ArrowLeft',
    right: 'ArrowRight',
  };

  const key = keyMap[direction];
  const modifiers: string[] = [];

  if (options?.ctrlKey) {
    modifiers.push(getPlatformModifier());
  }
  if (options?.shiftKey) {
    modifiers.push('Shift');
  }
  if (options?.altKey) {
    modifiers.push('Alt');
  }

  // Ensure grid has focus
  const focusedCell = gridLocator.locator(KEYBOARD_NAV_SELECTORS.CELL_FOCUS);
  if ((await focusedCell.count()) === 0) {
    // Focus the first visible cell
    const firstCell = gridLocator.locator(`${AG_GRID_SELECTORS.ROW} ${AG_GRID_SELECTORS.CELL}`).first();
    await firstCell.click();
  }

  // Perform navigation
  const fullKey = modifiers.length > 0 ? `${modifiers.join('+')}+${key}` : key;
  await page.keyboard.press(fullKey);

  // Wait for focus to settle (don't require position change as we might be at boundary)
  await waitForFocusSettled(gridLocator, null);
}

/**
 * Navigate multiple steps in a direction
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @param direction - Navigation direction
 * @param steps - Number of steps to navigate
 * @param options - Navigation options
 */
export async function navigateSteps(
  gridLocator: Locator,
  page: Page,
  direction: NavigationDirection,
  steps: number,
  options?: KeyboardNavigationOptions
): Promise<void> {
  for (let i = 0; i < steps; i++) {
    await navigateArrow(gridLocator, page, direction, options);
  }
}

/**
 * Navigate using Tab key
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @param reverse - Whether to use Shift+Tab (reverse navigation)
 */
export async function navigateTab(
  gridLocator: Locator,
  page: Page,
  reverse: boolean = false
): Promise<void> {
  const key = reverse ? 'Shift+Tab' : 'Tab';
  await page.keyboard.press(key);

  // Wait for focus to settle - Tab might move focus outside grid
  // so we just wait for any focus change to complete
  try {
    await waitForFocusSettled(gridLocator, null, 1000);
  } catch {
    // Focus may have moved outside the grid, which is acceptable
  }
}

/**
 * Tab to the next cell in the grid
 * Wraps to the first cell of the next row when at end of row
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @returns The new cell position, or null if focus left the grid
 */
export async function tabToNextCell(
  gridLocator: Locator,
  page: Page
): Promise<CellPosition | null> {
  const previousPosition = await getFocusedCellPosition(gridLocator);

  await page.keyboard.press('Tab');

  // Wait for focus to settle
  try {
    await waitForFocusSettled(gridLocator, previousPosition, 1000);
  } catch {
    // Focus may have moved outside the grid
  }

  return await getFocusedCellPosition(gridLocator);
}

/**
 * Tab to the previous cell in the grid
 * Wraps to the last cell of the previous row when at start of row
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @returns The new cell position, or null if focus left the grid
 */
export async function tabToPreviousCell(
  gridLocator: Locator,
  page: Page
): Promise<CellPosition | null> {
  const previousPosition = await getFocusedCellPosition(gridLocator);

  await page.keyboard.press('Shift+Tab');

  // Wait for focus to settle
  try {
    await waitForFocusSettled(gridLocator, previousPosition, 1000);
  } catch {
    // Focus may have moved outside the grid
  }

  return await getFocusedCellPosition(gridLocator);
}

/**
 * Navigate to the first cell in the grid (Ctrl+Home)
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 */
export async function navigateToFirstCell(
  gridLocator: Locator,
  page: Page
): Promise<void> {
  // Ensure grid has focus
  const focusedCell = gridLocator.locator(KEYBOARD_NAV_SELECTORS.CELL_FOCUS);
  if ((await focusedCell.count()) === 0) {
    const firstCell = gridLocator.locator(`${AG_GRID_SELECTORS.ROW} ${AG_GRID_SELECTORS.CELL}`).first();
    await firstCell.click();
  }

  const modifier = getPlatformModifier();
  await page.keyboard.press(`${modifier}+Home`);

  // Wait for focus to settle on first cell
  await waitForFocusSettled(gridLocator);
}

/**
 * Navigate to the last cell in the grid (Ctrl+End)
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 */
export async function navigateToLastCell(
  gridLocator: Locator,
  page: Page
): Promise<void> {
  // Ensure grid has focus
  const focusedCell = gridLocator.locator(KEYBOARD_NAV_SELECTORS.CELL_FOCUS);
  if ((await focusedCell.count()) === 0) {
    const firstCell = gridLocator.locator(`${AG_GRID_SELECTORS.ROW} ${AG_GRID_SELECTORS.CELL}`).first();
    await firstCell.click();
  }

  const modifier = getPlatformModifier();
  await page.keyboard.press(`${modifier}+End`);

  // Wait for focus to settle on last cell
  await waitForFocusSettled(gridLocator);
}

/**
 * Navigate to the first cell in the current row (Home)
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 */
export async function navigateToRowStart(
  gridLocator: Locator,
  page: Page
): Promise<void> {
  await page.keyboard.press('Home');
  await waitForFocusSettled(gridLocator);
}

/**
 * Navigate to the last cell in the current row (End)
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 */
export async function navigateToRowEnd(
  gridLocator: Locator,
  page: Page
): Promise<void> {
  await page.keyboard.press('End');
  await waitForFocusSettled(gridLocator);
}

/**
 * Navigate page up
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 */
export async function navigatePageUp(
  gridLocator: Locator,
  page: Page
): Promise<void> {
  await page.keyboard.press('PageUp');
  await waitForFocusSettled(gridLocator);
}

/**
 * Navigate page down
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 */
export async function navigatePageDown(
  gridLocator: Locator,
  page: Page
): Promise<void> {
  await page.keyboard.press('PageDown');
  await waitForFocusSettled(gridLocator);
}

/**
 * Enter edit mode on the focused cell
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @param useF2 - Whether to use F2 key (preserves selection) instead of Enter
 */
export async function enterEditMode(
  gridLocator: Locator,
  page: Page,
  useF2: boolean = false
): Promise<void> {
  const key = useF2 ? 'F2' : 'Enter';
  await page.keyboard.press(key);

  // Wait for edit mode to be active
  const editingCell = gridLocator.locator(KEYBOARD_NAV_SELECTORS.CELL_EDITING);
  await expect(editingCell).toBeVisible({ timeout: 2000 });
}

/**
 * Exit edit mode
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @param save - Whether to save changes (Enter) or cancel (Escape)
 */
export async function exitEditMode(
  gridLocator: Locator,
  page: Page,
  save: boolean = true
): Promise<void> {
  const key = save ? 'Enter' : 'Escape';
  await page.keyboard.press(key);

  // Wait for edit mode to end
  const editingCell = gridLocator.locator(KEYBOARD_NAV_SELECTORS.CELL_EDITING);
  await expect(editingCell).not.toBeVisible({ timeout: 2000 });
}

/**
 * Type text in the current edit cell
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @param text - Text to type
 * @param clearFirst - Whether to clear existing content first
 */
export async function typeInCell(
  gridLocator: Locator,
  page: Page,
  text: string,
  clearFirst: boolean = true
): Promise<void> {
  const editorInput = gridLocator.locator(KEYBOARD_NAV_SELECTORS.CELL_EDITOR_INPUT);
  const count = await editorInput.count();

  if (count === 0) {
    // Not in edit mode, enter it
    await enterEditMode(gridLocator, page);
  }

  if (clearFirst) {
    // Select all and replace
    const modifier = getPlatformModifier();
    await page.keyboard.press(`${modifier}+a`);
  }

  await page.keyboard.type(text);
}

/**
 * Perform keyboard action
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @param action - Keyboard action to perform
 */
export async function performKeyboardAction(
  gridLocator: Locator,
  page: Page,
  action: KeyboardAction
): Promise<void> {
  const modifier = getPlatformModifier();

  const actionMap: Record<KeyboardAction, string> = {
    enter: 'Enter',
    escape: 'Escape',
    tab: 'Tab',
    shiftTab: 'Shift+Tab',
    space: 'Space',
    delete: 'Delete',
    copy: `${modifier}+c`,
    paste: `${modifier}+v`,
    selectAll: `${modifier}+a`,
    home: 'Home',
    end: 'End',
    ctrlHome: `${modifier}+Home`,
    ctrlEnd: `${modifier}+End`,
    pageUp: 'PageUp',
    pageDown: 'PageDown',
  };

  const key = actionMap[action];
  await page.keyboard.press(key);

  // Wait for action to complete
  try {
    await waitForFocusSettled(gridLocator, null, 1000);
  } catch {
    // Some actions don't affect focus, which is acceptable
  }
}

/**
 * Check if a cell is currently in edit mode
 *
 * @param gridLocator - The grid root locator
 * @returns True if a cell is being edited
 */
export async function isInEditMode(gridLocator: Locator): Promise<boolean> {
  const editingCell = gridLocator.locator(KEYBOARD_NAV_SELECTORS.CELL_EDITING);
  return (await editingCell.count()) > 0;
}

/**
 * Get the current keyboard navigation state
 *
 * @param gridLocator - The grid root locator
 * @returns Keyboard navigation state
 */
export async function getKeyboardNavigationState(
  gridLocator: Locator
): Promise<KeyboardNavigationState> {
  const focusedCellLocator = gridLocator.locator(KEYBOARD_NAV_SELECTORS.CELL_FOCUS);
  const editingCellLocator = gridLocator.locator(KEYBOARD_NAV_SELECTORS.CELL_EDITING);

  const hasFocusedCell = (await focusedCellLocator.count()) > 0;
  const isEditing = (await editingCellLocator.count()) > 0;

  let focusedCell: CellPosition | null = null;
  let editingCell: CellPosition | null = null;

  if (hasFocusedCell) {
    const cell = focusedCellLocator.first();
    const colId = await cell.getAttribute('col-id');
    const row = cell.locator('..');
    const ariaRowIndex = await row.getAttribute('aria-rowindex');

    if (colId && ariaRowIndex) {
      focusedCell = {
        rowMatcher: { ariaRowIndex: parseInt(ariaRowIndex, 10) },
        colId,
      };
    }
  }

  if (isEditing) {
    const cell = editingCellLocator.first();
    const colId = await cell.getAttribute('col-id');
    const row = cell.locator('..');
    const ariaRowIndex = await row.getAttribute('aria-rowindex');

    if (colId && ariaRowIndex) {
      editingCell = {
        rowMatcher: { ariaRowIndex: parseInt(ariaRowIndex, 10) },
        colId,
      };
    }
  }

  // Check header focus
  const headerFocusLocator = gridLocator.locator(KEYBOARD_NAV_SELECTORS.HEADER_CELL_FOCUS);
  const isHeaderFocused = (await headerFocusLocator.count()) > 0;

  return {
    focusedCell,
    isEditing,
    editingCell,
    isHeaderFocused,
  };
}

/**
 * Navigate to header row
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 */
export async function navigateToHeader(
  gridLocator: Locator,
  page: Page
): Promise<void> {
  // First, ensure we're at the first row
  const focusedCell = gridLocator.locator(KEYBOARD_NAV_SELECTORS.CELL_FOCUS);
  if ((await focusedCell.count()) === 0) {
    const firstCell = gridLocator.locator(`${AG_GRID_SELECTORS.ROW} ${AG_GRID_SELECTORS.CELL}`).first();
    await firstCell.click();
  }

  // Navigate up until we reach the header
  await navigateToFirstCell(gridLocator, page);

  // One more up to reach header
  await navigateArrow(gridLocator, page, 'up');

  // Wait for header focus to settle
  const headerCell = gridLocator.locator(KEYBOARD_NAV_SELECTORS.HEADER_CELL_FOCUS);
  await expect(headerCell.first()).toBeVisible({ timeout: FOCUS_TIMEOUT });
}

/**
 * Select all cells (Ctrl+A)
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 */
export async function selectAllCells(
  gridLocator: Locator,
  page: Page
): Promise<void> {
  // Ensure grid has focus
  const focusedCell = gridLocator.locator(KEYBOARD_NAV_SELECTORS.CELL_FOCUS);
  if ((await focusedCell.count()) === 0) {
    const firstCell = gridLocator.locator(`${AG_GRID_SELECTORS.ROW} ${AG_GRID_SELECTORS.CELL}`).first();
    await firstCell.click();
  }

  const modifier = getPlatformModifier();
  await page.keyboard.press(`${modifier}+a`);

  // Wait for selection state to be applied
  const selectedCell = gridLocator.locator('.ag-cell-range-selected, .ag-row-selected');
  await expect(selectedCell.first()).toBeVisible({ timeout: FOCUS_TIMEOUT });
}

/**
 * Copy focused/selected cells (Ctrl+C)
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 */
export async function copyWithKeyboard(
  _gridLocator: Locator,
  page: Page
): Promise<void> {
  const modifier = getPlatformModifier();
  await page.keyboard.press(`${modifier}+c`);
  // Copy is synchronous - no DOM changes to wait for
}

/**
 * Paste from clipboard (Ctrl+V)
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 */
export async function pasteWithKeyboard(
  gridLocator: Locator,
  page: Page
): Promise<void> {
  const modifier = getPlatformModifier();
  await page.keyboard.press(`${modifier}+v`);

  // Wait for any flash animation that indicates paste completion
  // If the grid shows a flash animation on paste, wait for it
  try {
    const flashCell = gridLocator.locator('.ag-cell-data-changed, .ag-cell-flash');
    await expect(flashCell.first()).toBeVisible({ timeout: 500 });
    await expect(flashCell).toHaveCount(0, { timeout: 1000 });
  } catch {
    // No flash animation, paste completed
  }
}

/**
 * Cut focused/selected cells (Ctrl+X)
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 */
export async function cutWithKeyboard(
  gridLocator: Locator,
  page: Page
): Promise<void> {
  const modifier = getPlatformModifier();
  await page.keyboard.press(`${modifier}+x`);

  // Wait for any visual feedback indicating cut
  try {
    const flashCell = gridLocator.locator('.ag-cell-data-changed, .ag-cell-flash');
    await expect(flashCell.first()).toBeVisible({ timeout: 500 });
    await expect(flashCell).toHaveCount(0, { timeout: 1000 });
  } catch {
    // No flash animation, cut completed
  }
}

/**
 * Undo last action (Ctrl+Z)
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 */
export async function undoWithKeyboard(
  gridLocator: Locator,
  page: Page
): Promise<void> {
  const modifier = getPlatformModifier();
  await page.keyboard.press(`${modifier}+z`);

  // Wait for any visual feedback indicating undo
  try {
    const flashCell = gridLocator.locator('.ag-cell-data-changed, .ag-cell-flash');
    await expect(flashCell.first()).toBeVisible({ timeout: 500 });
    await expect(flashCell).toHaveCount(0, { timeout: 1000 });
  } catch {
    // No flash animation, undo completed
  }
}

/**
 * Redo last undone action (Ctrl+Y or Ctrl+Shift+Z)
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 */
export async function redoWithKeyboard(
  gridLocator: Locator,
  page: Page
): Promise<void> {
  const modifier = getPlatformModifier();
  // Use Ctrl+Y on Windows, Cmd+Shift+Z on Mac
  const key = process.platform === 'darwin' ? `${modifier}+Shift+z` : `${modifier}+y`;
  await page.keyboard.press(key);

  // Wait for any visual feedback indicating redo
  try {
    const flashCell = gridLocator.locator('.ag-cell-data-changed, .ag-cell-flash');
    await expect(flashCell.first()).toBeVisible({ timeout: 500 });
    await expect(flashCell).toHaveCount(0, { timeout: 1000 });
  } catch {
    // No flash animation, redo completed
  }
}

/**
 * Delete content of focused cell
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 */
export async function deleteWithKeyboard(
  gridLocator: Locator,
  page: Page
): Promise<void> {
  await page.keyboard.press('Delete');

  // Wait for any visual feedback indicating delete
  try {
    const flashCell = gridLocator.locator('.ag-cell-data-changed, .ag-cell-flash');
    await expect(flashCell.first()).toBeVisible({ timeout: 500 });
    await expect(flashCell).toHaveCount(0, { timeout: 1000 });
  } catch {
    // No flash animation, delete completed
  }
}

/**
 * Toggle row selection with Space key
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 */
export async function toggleRowSelectionWithKeyboard(
  gridLocator: Locator,
  page: Page
): Promise<void> {
  // Get current selection state before toggle
  const selectedRows = await gridLocator.locator('.ag-row-selected').count();

  await page.keyboard.press('Space');

  // Wait for selection state to change
  await expect(async () => {
    const newSelectedRows = await gridLocator.locator('.ag-row-selected').count();
    // Selection count should have changed (either increased or decreased)
    expect(newSelectedRows).not.toBe(selectedRows);
  }).toPass({ timeout: FOCUS_TIMEOUT });
}

/**
 * Extend selection with Shift+Arrow keys
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @param direction - Direction to extend selection
 */
export async function extendSelection(
  gridLocator: Locator,
  page: Page,
  direction: NavigationDirection
): Promise<void> {
  await navigateArrow(gridLocator, page, direction, { shiftKey: true });
}

/**
 * Assert focused cell position
 *
 * @param gridLocator - The grid root locator
 * @param expectedPosition - Expected cell position
 */
export async function expectFocusedCell(
  gridLocator: Locator,
  expectedPosition: CellPosition
): Promise<void> {
  const currentPosition = await getFocusedCellPosition(gridLocator);

  if (!currentPosition) {
    throw new Error('No cell is currently focused');
  }

  const expectedRowIndex = (expectedPosition.rowMatcher as { ariaRowIndex: number }).ariaRowIndex;
  const actualRowIndex = (currentPosition.rowMatcher as { ariaRowIndex: number }).ariaRowIndex;

  if (actualRowIndex !== expectedRowIndex) {
    throw new Error(
      `Expected focused cell at row ${expectedRowIndex}, but found row ${actualRowIndex}`
    );
  }

  if (currentPosition.colId !== expectedPosition.colId) {
    throw new Error(
      `Expected focused cell at column "${expectedPosition.colId}", but found column "${currentPosition.colId}"`
    );
  }
}

/**
 * Assert cell is in edit mode
 *
 * @param gridLocator - The grid root locator
 */
export async function expectInEditMode(gridLocator: Locator): Promise<void> {
  const editingCell = gridLocator.locator(KEYBOARD_NAV_SELECTORS.CELL_EDITING);
  await expect(editingCell).toBeVisible({ timeout: 2000 });
}

/**
 * Assert cell is not in edit mode
 *
 * @param gridLocator - The grid root locator
 */
export async function expectNotInEditMode(gridLocator: Locator): Promise<void> {
  const editingCell = gridLocator.locator(KEYBOARD_NAV_SELECTORS.CELL_EDITING);
  await expect(editingCell).not.toBeVisible({ timeout: 2000 });
}

/**
 * Start typing to enter quick edit mode (single character entry)
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @param char - Initial character to type
 */
export async function startQuickEdit(
  gridLocator: Locator,
  page: Page,
  char: string
): Promise<void> {
  // Just type the character - AG Grid will enter edit mode and replace content
  await page.keyboard.type(char);
  await page.waitForTimeout(50);

  // Verify we're now in edit mode
  const editingCell = gridLocator.locator(KEYBOARD_NAV_SELECTORS.CELL_EDITING);
  await expect(editingCell).toBeVisible({ timeout: 2000 });
}

/**
 * Navigate to a specific cell by row and column index
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @param rowIndex - Target row index (0-based)
 * @param colIndex - Target column index (0-based)
 */
export async function navigateToCellByIndex(
  gridLocator: Locator,
  page: Page,
  rowIndex: number,
  colIndex: number
): Promise<void> {
  // Start from the first cell
  await navigateToFirstCell(gridLocator, page);

  // Navigate down to the target row
  if (rowIndex > 0) {
    await navigateSteps(gridLocator, page, 'down', rowIndex);
  }

  // Navigate right to the target column
  if (colIndex > 0) {
    await navigateSteps(gridLocator, page, 'right', colIndex);
  }
}

/**
 * Open column filter via keyboard (Ctrl+Shift+F or custom shortcut)
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 */
export async function openFilterWithKeyboard(
  _gridLocator: Locator,
  page: Page
): Promise<void> {
  const modifier = getPlatformModifier();
  await page.keyboard.press(`${modifier}+Shift+f`);
  await page.waitForTimeout(100);
}

/**
 * Open context menu via keyboard (Shift+F10 or context menu key)
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 */
export async function openContextMenuWithKeyboard(
  _gridLocator: Locator,
  page: Page
): Promise<void> {
  await page.keyboard.press('Shift+F10');
  await page.waitForTimeout(100);
}
