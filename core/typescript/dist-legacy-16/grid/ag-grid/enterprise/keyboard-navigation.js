"use strict";
/**
 * AG Grid Keyboard Navigation Support
 *
 * Provides comprehensive keyboard navigation utilities for testing grids,
 * including arrow key navigation, Tab navigation, edit mode, and shortcuts.
 *
 * @module grid/ag-grid/enterprise/keyboard-navigation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.KEYBOARD_NAV_SELECTORS = void 0;
exports.waitForEditMode = waitForEditMode;
exports.waitForEditModeExit = waitForEditModeExit;
exports.getFocusedCellPosition = getFocusedCellPosition;
exports.focusCell = focusCell;
exports.navigateArrow = navigateArrow;
exports.navigateSteps = navigateSteps;
exports.navigateTab = navigateTab;
exports.tabToNextCell = tabToNextCell;
exports.tabToPreviousCell = tabToPreviousCell;
exports.navigateToFirstCell = navigateToFirstCell;
exports.navigateToLastCell = navigateToLastCell;
exports.navigateToRowStart = navigateToRowStart;
exports.navigateToRowEnd = navigateToRowEnd;
exports.navigatePageUp = navigatePageUp;
exports.navigatePageDown = navigatePageDown;
exports.enterEditMode = enterEditMode;
exports.exitEditMode = exitEditMode;
exports.typeInCell = typeInCell;
exports.performKeyboardAction = performKeyboardAction;
exports.isInEditMode = isInEditMode;
exports.getKeyboardNavigationState = getKeyboardNavigationState;
exports.navigateToHeader = navigateToHeader;
exports.selectAllCells = selectAllCells;
exports.copyWithKeyboard = copyWithKeyboard;
exports.pasteWithKeyboard = pasteWithKeyboard;
exports.cutWithKeyboard = cutWithKeyboard;
exports.undoWithKeyboard = undoWithKeyboard;
exports.redoWithKeyboard = redoWithKeyboard;
exports.deleteWithKeyboard = deleteWithKeyboard;
exports.toggleRowSelectionWithKeyboard = toggleRowSelectionWithKeyboard;
exports.extendSelection = extendSelection;
exports.expectFocusedCell = expectFocusedCell;
exports.expectInEditMode = expectInEditMode;
exports.expectNotInEditMode = expectNotInEditMode;
exports.startQuickEdit = startQuickEdit;
exports.navigateToCellByIndex = navigateToCellByIndex;
exports.openFilterWithKeyboard = openFilterWithKeyboard;
exports.openContextMenuWithKeyboard = openContextMenuWithKeyboard;
const test_1 = require("@playwright/test");
const selectors_js_1 = require("../selectors.js");
/**
 * AG Grid keyboard navigation CSS selectors
 */
exports.KEYBOARD_NAV_SELECTORS = {
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
};
/**
 * Platform-aware modifier key
 */
function getPlatformModifier() {
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
async function waitForFocusSettled(gridLocator, previousPosition = null, timeout = FOCUS_TIMEOUT) {
    await (0, test_1.expect)(async () => {
        const focusedCell = gridLocator.locator(exports.KEYBOARD_NAV_SELECTORS.CELL_FOCUS);
        const count = await focusedCell.count();
        (0, test_1.expect)(count).toBeGreaterThan(0);
        // If we have a previous position, verify focus actually moved
        if (previousPosition) {
            const cell = focusedCell.first();
            const colId = await cell.getAttribute('col-id');
            const row = cell.locator('..');
            const ariaRowIndex = await row.getAttribute('aria-rowindex');
            // Focus should have changed (either row or column)
            const prevRow = previousPosition.rowMatcher.ariaRowIndex;
            const currentRow = ariaRowIndex ? parseInt(ariaRowIndex, 10) : null;
            const focusChanged = colId !== previousPosition.colId || currentRow !== prevRow;
            (0, test_1.expect)(focusChanged).toBe(true);
        }
    }).toPass({ timeout });
}
/**
 * Wait for edit mode to be active on the focused cell
 *
 * @param gridLocator - The grid root locator
 * @param timeout - Maximum time to wait
 */
async function waitForEditMode(gridLocator, timeout = FOCUS_TIMEOUT) {
    const editingCell = gridLocator.locator(exports.KEYBOARD_NAV_SELECTORS.CELL_EDITING);
    await (0, test_1.expect)(editingCell.first()).toBeVisible({ timeout });
}
/**
 * Wait for edit mode to be exited
 *
 * @param gridLocator - The grid root locator
 * @param timeout - Maximum time to wait
 */
async function waitForEditModeExit(gridLocator, timeout = FOCUS_TIMEOUT) {
    const editingCell = gridLocator.locator(exports.KEYBOARD_NAV_SELECTORS.CELL_EDITING);
    await (0, test_1.expect)(editingCell).toHaveCount(0, { timeout });
}
/**
 * Get the currently focused cell position
 *
 * @param gridLocator - The grid root locator
 * @returns Current cell position or null if no cell is focused
 */
async function getFocusedCellPosition(gridLocator) {
    const focusedCell = gridLocator.locator(exports.KEYBOARD_NAV_SELECTORS.CELL_FOCUS);
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
async function focusCell(gridLocator, _page, position, _config) {
    const rowSelector = (0, selectors_js_1.buildRowSelectorFromMatcher)(position.rowMatcher);
    let cell;
    if (rowSelector) {
        cell = gridLocator.locator(rowSelector).locator(`${selectors_js_1.AG_GRID_SELECTORS.CELL}[col-id="${position.colId}"]`);
    }
    else {
        cell = gridLocator.locator(`${selectors_js_1.AG_GRID_SELECTORS.ROW} ${selectors_js_1.AG_GRID_SELECTORS.CELL}[col-id="${position.colId}"]`);
    }
    await (0, test_1.expect)(cell.first()).toBeVisible({ timeout: 5000 });
    await cell.first().click();
    // Verify focus was established
    await (0, test_1.expect)(cell.first()).toHaveClass(/ag-cell-focus/, { timeout: 2000 });
}
/**
 * Navigate using arrow keys
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @param direction - Navigation direction
 * @param options - Navigation options
 */
async function navigateArrow(gridLocator, page, direction, options) {
    const keyMap = {
        up: 'ArrowUp',
        down: 'ArrowDown',
        left: 'ArrowLeft',
        right: 'ArrowRight',
    };
    const key = keyMap[direction];
    const modifiers = [];
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
    const focusedCell = gridLocator.locator(exports.KEYBOARD_NAV_SELECTORS.CELL_FOCUS);
    if ((await focusedCell.count()) === 0) {
        // Focus the first visible cell
        const firstCell = gridLocator.locator(`${selectors_js_1.AG_GRID_SELECTORS.ROW} ${selectors_js_1.AG_GRID_SELECTORS.CELL}`).first();
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
async function navigateSteps(gridLocator, page, direction, steps, options) {
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
async function navigateTab(gridLocator, page, reverse = false) {
    const key = reverse ? 'Shift+Tab' : 'Tab';
    await page.keyboard.press(key);
    // Wait for focus to settle - Tab might move focus outside grid
    // so we just wait for any focus change to complete
    try {
        await waitForFocusSettled(gridLocator, null, 1000);
    }
    catch {
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
async function tabToNextCell(gridLocator, page) {
    const previousPosition = await getFocusedCellPosition(gridLocator);
    await page.keyboard.press('Tab');
    // Wait for focus to settle
    try {
        await waitForFocusSettled(gridLocator, previousPosition, 1000);
    }
    catch {
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
async function tabToPreviousCell(gridLocator, page) {
    const previousPosition = await getFocusedCellPosition(gridLocator);
    await page.keyboard.press('Shift+Tab');
    // Wait for focus to settle
    try {
        await waitForFocusSettled(gridLocator, previousPosition, 1000);
    }
    catch {
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
async function navigateToFirstCell(gridLocator, page) {
    // Ensure grid has focus
    const focusedCell = gridLocator.locator(exports.KEYBOARD_NAV_SELECTORS.CELL_FOCUS);
    if ((await focusedCell.count()) === 0) {
        const firstCell = gridLocator.locator(`${selectors_js_1.AG_GRID_SELECTORS.ROW} ${selectors_js_1.AG_GRID_SELECTORS.CELL}`).first();
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
async function navigateToLastCell(gridLocator, page) {
    // Ensure grid has focus
    const focusedCell = gridLocator.locator(exports.KEYBOARD_NAV_SELECTORS.CELL_FOCUS);
    if ((await focusedCell.count()) === 0) {
        const firstCell = gridLocator.locator(`${selectors_js_1.AG_GRID_SELECTORS.ROW} ${selectors_js_1.AG_GRID_SELECTORS.CELL}`).first();
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
async function navigateToRowStart(gridLocator, page) {
    await page.keyboard.press('Home');
    await waitForFocusSettled(gridLocator);
}
/**
 * Navigate to the last cell in the current row (End)
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 */
async function navigateToRowEnd(gridLocator, page) {
    await page.keyboard.press('End');
    await waitForFocusSettled(gridLocator);
}
/**
 * Navigate page up
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 */
async function navigatePageUp(gridLocator, page) {
    await page.keyboard.press('PageUp');
    await waitForFocusSettled(gridLocator);
}
/**
 * Navigate page down
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 */
async function navigatePageDown(gridLocator, page) {
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
async function enterEditMode(gridLocator, page, useF2 = false) {
    const key = useF2 ? 'F2' : 'Enter';
    await page.keyboard.press(key);
    // Wait for edit mode to be active
    const editingCell = gridLocator.locator(exports.KEYBOARD_NAV_SELECTORS.CELL_EDITING);
    await (0, test_1.expect)(editingCell).toBeVisible({ timeout: 2000 });
}
/**
 * Exit edit mode
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @param save - Whether to save changes (Enter) or cancel (Escape)
 */
async function exitEditMode(gridLocator, page, save = true) {
    const key = save ? 'Enter' : 'Escape';
    await page.keyboard.press(key);
    // Wait for edit mode to end
    const editingCell = gridLocator.locator(exports.KEYBOARD_NAV_SELECTORS.CELL_EDITING);
    await (0, test_1.expect)(editingCell).not.toBeVisible({ timeout: 2000 });
}
/**
 * Type text in the current edit cell
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @param text - Text to type
 * @param clearFirst - Whether to clear existing content first
 */
async function typeInCell(gridLocator, page, text, clearFirst = true) {
    const editorInput = gridLocator.locator(exports.KEYBOARD_NAV_SELECTORS.CELL_EDITOR_INPUT);
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
async function performKeyboardAction(gridLocator, page, action) {
    const modifier = getPlatformModifier();
    const actionMap = {
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
    }
    catch {
        // Some actions don't affect focus, which is acceptable
    }
}
/**
 * Check if a cell is currently in edit mode
 *
 * @param gridLocator - The grid root locator
 * @returns True if a cell is being edited
 */
async function isInEditMode(gridLocator) {
    const editingCell = gridLocator.locator(exports.KEYBOARD_NAV_SELECTORS.CELL_EDITING);
    return (await editingCell.count()) > 0;
}
/**
 * Get the current keyboard navigation state
 *
 * @param gridLocator - The grid root locator
 * @returns Keyboard navigation state
 */
async function getKeyboardNavigationState(gridLocator) {
    const focusedCellLocator = gridLocator.locator(exports.KEYBOARD_NAV_SELECTORS.CELL_FOCUS);
    const editingCellLocator = gridLocator.locator(exports.KEYBOARD_NAV_SELECTORS.CELL_EDITING);
    const hasFocusedCell = (await focusedCellLocator.count()) > 0;
    const isEditing = (await editingCellLocator.count()) > 0;
    let focusedCell = null;
    let editingCell = null;
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
    const headerFocusLocator = gridLocator.locator(exports.KEYBOARD_NAV_SELECTORS.HEADER_CELL_FOCUS);
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
async function navigateToHeader(gridLocator, page) {
    // First, ensure we're at the first row
    const focusedCell = gridLocator.locator(exports.KEYBOARD_NAV_SELECTORS.CELL_FOCUS);
    if ((await focusedCell.count()) === 0) {
        const firstCell = gridLocator.locator(`${selectors_js_1.AG_GRID_SELECTORS.ROW} ${selectors_js_1.AG_GRID_SELECTORS.CELL}`).first();
        await firstCell.click();
    }
    // Navigate up until we reach the header
    await navigateToFirstCell(gridLocator, page);
    // One more up to reach header
    await navigateArrow(gridLocator, page, 'up');
    // Wait for header focus to settle
    const headerCell = gridLocator.locator(exports.KEYBOARD_NAV_SELECTORS.HEADER_CELL_FOCUS);
    await (0, test_1.expect)(headerCell.first()).toBeVisible({ timeout: FOCUS_TIMEOUT });
}
/**
 * Select all cells (Ctrl+A)
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 */
async function selectAllCells(gridLocator, page) {
    // Ensure grid has focus
    const focusedCell = gridLocator.locator(exports.KEYBOARD_NAV_SELECTORS.CELL_FOCUS);
    if ((await focusedCell.count()) === 0) {
        const firstCell = gridLocator.locator(`${selectors_js_1.AG_GRID_SELECTORS.ROW} ${selectors_js_1.AG_GRID_SELECTORS.CELL}`).first();
        await firstCell.click();
    }
    const modifier = getPlatformModifier();
    await page.keyboard.press(`${modifier}+a`);
    // Wait for selection state to be applied
    const selectedCell = gridLocator.locator('.ag-cell-range-selected, .ag-row-selected');
    await (0, test_1.expect)(selectedCell.first()).toBeVisible({ timeout: FOCUS_TIMEOUT });
}
/**
 * Copy focused/selected cells (Ctrl+C)
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 */
async function copyWithKeyboard(_gridLocator, page) {
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
async function pasteWithKeyboard(gridLocator, page) {
    const modifier = getPlatformModifier();
    await page.keyboard.press(`${modifier}+v`);
    // Wait for any flash animation that indicates paste completion
    // If the grid shows a flash animation on paste, wait for it
    try {
        const flashCell = gridLocator.locator('.ag-cell-data-changed, .ag-cell-flash');
        await (0, test_1.expect)(flashCell.first()).toBeVisible({ timeout: 500 });
        await (0, test_1.expect)(flashCell).toHaveCount(0, { timeout: 1000 });
    }
    catch {
        // No flash animation, paste completed
    }
}
/**
 * Cut focused/selected cells (Ctrl+X)
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 */
async function cutWithKeyboard(gridLocator, page) {
    const modifier = getPlatformModifier();
    await page.keyboard.press(`${modifier}+x`);
    // Wait for any visual feedback indicating cut
    try {
        const flashCell = gridLocator.locator('.ag-cell-data-changed, .ag-cell-flash');
        await (0, test_1.expect)(flashCell.first()).toBeVisible({ timeout: 500 });
        await (0, test_1.expect)(flashCell).toHaveCount(0, { timeout: 1000 });
    }
    catch {
        // No flash animation, cut completed
    }
}
/**
 * Undo last action (Ctrl+Z)
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 */
async function undoWithKeyboard(gridLocator, page) {
    const modifier = getPlatformModifier();
    await page.keyboard.press(`${modifier}+z`);
    // Wait for any visual feedback indicating undo
    try {
        const flashCell = gridLocator.locator('.ag-cell-data-changed, .ag-cell-flash');
        await (0, test_1.expect)(flashCell.first()).toBeVisible({ timeout: 500 });
        await (0, test_1.expect)(flashCell).toHaveCount(0, { timeout: 1000 });
    }
    catch {
        // No flash animation, undo completed
    }
}
/**
 * Redo last undone action (Ctrl+Y or Ctrl+Shift+Z)
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 */
async function redoWithKeyboard(gridLocator, page) {
    const modifier = getPlatformModifier();
    // Use Ctrl+Y on Windows, Cmd+Shift+Z on Mac
    const key = process.platform === 'darwin' ? `${modifier}+Shift+z` : `${modifier}+y`;
    await page.keyboard.press(key);
    // Wait for any visual feedback indicating redo
    try {
        const flashCell = gridLocator.locator('.ag-cell-data-changed, .ag-cell-flash');
        await (0, test_1.expect)(flashCell.first()).toBeVisible({ timeout: 500 });
        await (0, test_1.expect)(flashCell).toHaveCount(0, { timeout: 1000 });
    }
    catch {
        // No flash animation, redo completed
    }
}
/**
 * Delete content of focused cell
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 */
async function deleteWithKeyboard(gridLocator, page) {
    await page.keyboard.press('Delete');
    // Wait for any visual feedback indicating delete
    try {
        const flashCell = gridLocator.locator('.ag-cell-data-changed, .ag-cell-flash');
        await (0, test_1.expect)(flashCell.first()).toBeVisible({ timeout: 500 });
        await (0, test_1.expect)(flashCell).toHaveCount(0, { timeout: 1000 });
    }
    catch {
        // No flash animation, delete completed
    }
}
/**
 * Toggle row selection with Space key
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 */
async function toggleRowSelectionWithKeyboard(gridLocator, page) {
    // Get current selection state before toggle
    const selectedRows = await gridLocator.locator('.ag-row-selected').count();
    await page.keyboard.press('Space');
    // Wait for selection state to change
    await (0, test_1.expect)(async () => {
        const newSelectedRows = await gridLocator.locator('.ag-row-selected').count();
        // Selection count should have changed (either increased or decreased)
        (0, test_1.expect)(newSelectedRows).not.toBe(selectedRows);
    }).toPass({ timeout: FOCUS_TIMEOUT });
}
/**
 * Extend selection with Shift+Arrow keys
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @param direction - Direction to extend selection
 */
async function extendSelection(gridLocator, page, direction) {
    await navigateArrow(gridLocator, page, direction, { shiftKey: true });
}
/**
 * Assert focused cell position
 *
 * @param gridLocator - The grid root locator
 * @param expectedPosition - Expected cell position
 */
async function expectFocusedCell(gridLocator, expectedPosition) {
    const currentPosition = await getFocusedCellPosition(gridLocator);
    if (!currentPosition) {
        throw new Error('No cell is currently focused');
    }
    const expectedRowIndex = expectedPosition.rowMatcher.ariaRowIndex;
    const actualRowIndex = currentPosition.rowMatcher.ariaRowIndex;
    if (actualRowIndex !== expectedRowIndex) {
        throw new Error(`Expected focused cell at row ${expectedRowIndex}, but found row ${actualRowIndex}`);
    }
    if (currentPosition.colId !== expectedPosition.colId) {
        throw new Error(`Expected focused cell at column "${expectedPosition.colId}", but found column "${currentPosition.colId}"`);
    }
}
/**
 * Assert cell is in edit mode
 *
 * @param gridLocator - The grid root locator
 */
async function expectInEditMode(gridLocator) {
    const editingCell = gridLocator.locator(exports.KEYBOARD_NAV_SELECTORS.CELL_EDITING);
    await (0, test_1.expect)(editingCell).toBeVisible({ timeout: 2000 });
}
/**
 * Assert cell is not in edit mode
 *
 * @param gridLocator - The grid root locator
 */
async function expectNotInEditMode(gridLocator) {
    const editingCell = gridLocator.locator(exports.KEYBOARD_NAV_SELECTORS.CELL_EDITING);
    await (0, test_1.expect)(editingCell).not.toBeVisible({ timeout: 2000 });
}
/**
 * Start typing to enter quick edit mode (single character entry)
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @param char - Initial character to type
 */
async function startQuickEdit(gridLocator, page, char) {
    // Just type the character - AG Grid will enter edit mode and replace content
    await page.keyboard.type(char);
    await page.waitForTimeout(50);
    // Verify we're now in edit mode
    const editingCell = gridLocator.locator(exports.KEYBOARD_NAV_SELECTORS.CELL_EDITING);
    await (0, test_1.expect)(editingCell).toBeVisible({ timeout: 2000 });
}
/**
 * Navigate to a specific cell by row and column index
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @param rowIndex - Target row index (0-based)
 * @param colIndex - Target column index (0-based)
 */
async function navigateToCellByIndex(gridLocator, page, rowIndex, colIndex) {
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
async function openFilterWithKeyboard(_gridLocator, page) {
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
async function openContextMenuWithKeyboard(_gridLocator, page) {
    await page.keyboard.press('Shift+F10');
    await page.waitForTimeout(100);
}
//# sourceMappingURL=keyboard-navigation.js.map