/**
 * AG Grid Keyboard Navigation Support
 *
 * Provides comprehensive keyboard navigation utilities for testing grids,
 * including arrow key navigation, Tab navigation, edit mode, and shortcuts.
 *
 * @module grid/ag-grid/enterprise/keyboard-navigation
 */
import type { Locator, Page } from '@playwright/test';
import type { NormalizedAgGridConfig, CellPosition, NavigationDirection, KeyboardAction, KeyboardNavigationState, KeyboardNavigationOptions } from '../../types.js';
/**
 * AG Grid keyboard navigation CSS selectors
 */
export declare const KEYBOARD_NAV_SELECTORS: {
    /** Focused cell */
    readonly CELL_FOCUS: ".ag-cell-focus";
    /** Cell being edited */
    readonly CELL_EDITING: ".ag-cell-editing";
    /** Cell editor input */
    readonly CELL_EDITOR: ".ag-cell-editor";
    /** Cell editor input element */
    readonly CELL_EDITOR_INPUT: ".ag-cell-editor input, .ag-cell-editor textarea, .ag-cell-edit-input";
    /** Focused row */
    readonly ROW_FOCUS: ".ag-row-focus";
    /** Header cell focus */
    readonly HEADER_CELL_FOCUS: ".ag-header-cell-focus";
    /** Popup editor */
    readonly POPUP_EDITOR: ".ag-popup-editor";
    /** Rich select editor */
    readonly RICH_SELECT_EDITOR: ".ag-rich-select";
    /** Large text editor */
    readonly LARGE_TEXT_EDITOR: ".ag-large-textarea";
    /** Select editor */
    readonly SELECT_EDITOR: ".ag-cell-editor select";
    /** Tab guard elements */
    readonly TAB_GUARD: ".ag-tab-guard";
};
/**
 * Wait for edit mode to be active on the focused cell
 *
 * @param gridLocator - The grid root locator
 * @param timeout - Maximum time to wait
 */
export declare function waitForEditMode(gridLocator: Locator, timeout?: number): Promise<void>;
/**
 * Wait for edit mode to be exited
 *
 * @param gridLocator - The grid root locator
 * @param timeout - Maximum time to wait
 */
export declare function waitForEditModeExit(gridLocator: Locator, timeout?: number): Promise<void>;
/**
 * Get the currently focused cell position
 *
 * @param gridLocator - The grid root locator
 * @returns Current cell position or null if no cell is focused
 */
export declare function getFocusedCellPosition(gridLocator: Locator): Promise<CellPosition | null>;
/**
 * Focus a specific cell in the grid
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @param position - Cell position to focus
 * @param config - Normalized grid configuration
 */
export declare function focusCell(gridLocator: Locator, _page: Page, position: CellPosition, _config: NormalizedAgGridConfig): Promise<void>;
/**
 * Navigate using arrow keys
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @param direction - Navigation direction
 * @param options - Navigation options
 */
export declare function navigateArrow(gridLocator: Locator, page: Page, direction: NavigationDirection, options?: KeyboardNavigationOptions): Promise<void>;
/**
 * Navigate multiple steps in a direction
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @param direction - Navigation direction
 * @param steps - Number of steps to navigate
 * @param options - Navigation options
 */
export declare function navigateSteps(gridLocator: Locator, page: Page, direction: NavigationDirection, steps: number, options?: KeyboardNavigationOptions): Promise<void>;
/**
 * Navigate using Tab key
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @param reverse - Whether to use Shift+Tab (reverse navigation)
 */
export declare function navigateTab(gridLocator: Locator, page: Page, reverse?: boolean): Promise<void>;
/**
 * Tab to the next cell in the grid
 * Wraps to the first cell of the next row when at end of row
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @returns The new cell position, or null if focus left the grid
 */
export declare function tabToNextCell(gridLocator: Locator, page: Page): Promise<CellPosition | null>;
/**
 * Tab to the previous cell in the grid
 * Wraps to the last cell of the previous row when at start of row
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @returns The new cell position, or null if focus left the grid
 */
export declare function tabToPreviousCell(gridLocator: Locator, page: Page): Promise<CellPosition | null>;
/**
 * Navigate to the first cell in the grid (Ctrl+Home)
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 */
export declare function navigateToFirstCell(gridLocator: Locator, page: Page): Promise<void>;
/**
 * Navigate to the last cell in the grid (Ctrl+End)
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 */
export declare function navigateToLastCell(gridLocator: Locator, page: Page): Promise<void>;
/**
 * Navigate to the first cell in the current row (Home)
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 */
export declare function navigateToRowStart(gridLocator: Locator, page: Page): Promise<void>;
/**
 * Navigate to the last cell in the current row (End)
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 */
export declare function navigateToRowEnd(gridLocator: Locator, page: Page): Promise<void>;
/**
 * Navigate page up
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 */
export declare function navigatePageUp(gridLocator: Locator, page: Page): Promise<void>;
/**
 * Navigate page down
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 */
export declare function navigatePageDown(gridLocator: Locator, page: Page): Promise<void>;
/**
 * Enter edit mode on the focused cell
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @param useF2 - Whether to use F2 key (preserves selection) instead of Enter
 */
export declare function enterEditMode(gridLocator: Locator, page: Page, useF2?: boolean): Promise<void>;
/**
 * Exit edit mode
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @param save - Whether to save changes (Enter) or cancel (Escape)
 */
export declare function exitEditMode(gridLocator: Locator, page: Page, save?: boolean): Promise<void>;
/**
 * Type text in the current edit cell
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @param text - Text to type
 * @param clearFirst - Whether to clear existing content first
 */
export declare function typeInCell(gridLocator: Locator, page: Page, text: string, clearFirst?: boolean): Promise<void>;
/**
 * Perform keyboard action
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @param action - Keyboard action to perform
 */
export declare function performKeyboardAction(gridLocator: Locator, page: Page, action: KeyboardAction): Promise<void>;
/**
 * Check if a cell is currently in edit mode
 *
 * @param gridLocator - The grid root locator
 * @returns True if a cell is being edited
 */
export declare function isInEditMode(gridLocator: Locator): Promise<boolean>;
/**
 * Get the current keyboard navigation state
 *
 * @param gridLocator - The grid root locator
 * @returns Keyboard navigation state
 */
export declare function getKeyboardNavigationState(gridLocator: Locator): Promise<KeyboardNavigationState>;
/**
 * Navigate to header row
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 */
export declare function navigateToHeader(gridLocator: Locator, page: Page): Promise<void>;
/**
 * Select all cells (Ctrl+A)
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 */
export declare function selectAllCells(gridLocator: Locator, page: Page): Promise<void>;
/**
 * Copy focused/selected cells (Ctrl+C)
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 */
export declare function copyWithKeyboard(_gridLocator: Locator, page: Page): Promise<void>;
/**
 * Paste from clipboard (Ctrl+V)
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 */
export declare function pasteWithKeyboard(gridLocator: Locator, page: Page): Promise<void>;
/**
 * Cut focused/selected cells (Ctrl+X)
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 */
export declare function cutWithKeyboard(gridLocator: Locator, page: Page): Promise<void>;
/**
 * Undo last action (Ctrl+Z)
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 */
export declare function undoWithKeyboard(gridLocator: Locator, page: Page): Promise<void>;
/**
 * Redo last undone action (Ctrl+Y or Ctrl+Shift+Z)
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 */
export declare function redoWithKeyboard(gridLocator: Locator, page: Page): Promise<void>;
/**
 * Delete content of focused cell
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 */
export declare function deleteWithKeyboard(gridLocator: Locator, page: Page): Promise<void>;
/**
 * Toggle row selection with Space key
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 */
export declare function toggleRowSelectionWithKeyboard(gridLocator: Locator, page: Page): Promise<void>;
/**
 * Extend selection with Shift+Arrow keys
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @param direction - Direction to extend selection
 */
export declare function extendSelection(gridLocator: Locator, page: Page, direction: NavigationDirection): Promise<void>;
/**
 * Assert focused cell position
 *
 * @param gridLocator - The grid root locator
 * @param expectedPosition - Expected cell position
 */
export declare function expectFocusedCell(gridLocator: Locator, expectedPosition: CellPosition): Promise<void>;
/**
 * Assert cell is in edit mode
 *
 * @param gridLocator - The grid root locator
 */
export declare function expectInEditMode(gridLocator: Locator): Promise<void>;
/**
 * Assert cell is not in edit mode
 *
 * @param gridLocator - The grid root locator
 */
export declare function expectNotInEditMode(gridLocator: Locator): Promise<void>;
/**
 * Start typing to enter quick edit mode (single character entry)
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @param char - Initial character to type
 */
export declare function startQuickEdit(gridLocator: Locator, page: Page, char: string): Promise<void>;
/**
 * Navigate to a specific cell by row and column index
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 * @param rowIndex - Target row index (0-based)
 * @param colIndex - Target column index (0-based)
 */
export declare function navigateToCellByIndex(gridLocator: Locator, page: Page, rowIndex: number, colIndex: number): Promise<void>;
/**
 * Open column filter via keyboard (Ctrl+Shift+F or custom shortcut)
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 */
export declare function openFilterWithKeyboard(_gridLocator: Locator, page: Page): Promise<void>;
/**
 * Open context menu via keyboard (Shift+F10 or context menu key)
 *
 * @param gridLocator - The grid root locator
 * @param page - Playwright page
 */
export declare function openContextMenuWithKeyboard(_gridLocator: Locator, page: Page): Promise<void>;
//# sourceMappingURL=keyboard-navigation.d.ts.map