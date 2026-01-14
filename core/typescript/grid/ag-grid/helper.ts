/**
 * AG Grid Helper Class
 *
 * Main class implementing the AgGridHelper interface.
 *
 * @module grid/ag-grid/helper
 */

import type { Locator, Page } from '@playwright/test';
import type {
  AgGridHelper as IAgGridHelper,
  AgGridConfig,
  NormalizedAgGridConfig,
  RowMatcher,
  AgGridRowData,
  AgGridState,
  AssertionOptions,
  RowCountOptions,
} from '../types.js';
import { normalizeConfig } from './config.js';
import {
  createLocatorContext,
  getGrid as getGridLocator,
  getRow as getRowLocator,
  getVisibleRows as getVisibleRowsLocator,
  getCell as getCellLocator,
  getHeaderCell as getHeaderCellLocator,
  getFilterInput as getFilterInputLocator,
  type GridLocatorContext,
} from './locators.js';
import {
  waitForReady as waitForReadyFn,
  waitForDataLoaded as waitForDataLoadedFn,
  waitForRowCount as waitForRowCountFn,
  waitForRow as waitForRowFn,
} from './wait.js';
import {
  expectRowCount as expectRowCountFn,
  expectRowContains as expectRowContainsFn,
  expectRowNotContains as expectRowNotContainsFn,
  expectCellValue as expectCellValueFn,
  expectSortedBy as expectSortedByFn,
  expectEmpty as expectEmptyFn,
  expectRowSelected as expectRowSelectedFn,
  expectNoRowsOverlay as expectNoRowsOverlayFn,
} from './assertions.js';
import {
  getAllVisibleRowData as getAllVisibleRowDataFn,
  findRowByMatcher,
} from './row-data.js';
import { getGridState as getGridStateFn } from './state.js';

/**
 * AG Grid Helper implementation
 */
export class AgGridHelperImpl implements IAgGridHelper {
  private page: Page;
  private config: NormalizedAgGridConfig;
  private ctx: GridLocatorContext;

  constructor(page: Page, config: string | AgGridConfig) {
    this.page = page;
    this.config = normalizeConfig(config);
    this.ctx = createLocatorContext(page, this.config);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Locators
  // ─────────────────────────────────────────────────────────────────────────

  getGrid(): Locator {
    return getGridLocator(this.ctx);
  }

  getRow(matcher: RowMatcher): Locator {
    return getRowLocator(this.ctx, matcher);
  }

  getVisibleRows(): Locator {
    return getVisibleRowsLocator(this.ctx);
  }

  getCell(rowMatcher: RowMatcher, colId: string): Locator {
    return getCellLocator(this.ctx, rowMatcher, colId);
  }

  getHeaderCell(colId: string): Locator {
    return getHeaderCellLocator(this.ctx, colId);
  }

  getFilterInput(colId: string): Locator {
    return getFilterInputLocator(this.ctx, colId);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Wait Utilities
  // ─────────────────────────────────────────────────────────────────────────

  async waitForReady(options?: { timeout?: number }): Promise<void> {
    await waitForReadyFn(this.getGrid(), this.config, options);
  }

  async waitForDataLoaded(options?: { timeout?: number }): Promise<void> {
    await waitForDataLoadedFn(this.getGrid(), this.config, options);
  }

  async waitForRowCount(count: number, options?: { timeout?: number }): Promise<void> {
    await waitForRowCountFn(this.getGrid(), count, this.config, options);
  }

  async waitForRow(matcher: RowMatcher, options?: { timeout?: number }): Promise<Locator> {
    return waitForRowFn(this.getGrid(), matcher, this.config, options);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Assertions
  // ─────────────────────────────────────────────────────────────────────────

  async expectRowCount(count: number, options?: RowCountOptions): Promise<void> {
    await expectRowCountFn(this.getGrid(), count, this.config, options);
  }

  async expectRowContains(
    cellValues: Record<string, unknown>,
    options?: AssertionOptions
  ): Promise<void> {
    await expectRowContainsFn(this.getGrid(), cellValues, this.config, options);
  }

  async expectRowNotContains(
    cellValues: Record<string, unknown>,
    options?: AssertionOptions
  ): Promise<void> {
    await expectRowNotContainsFn(this.getGrid(), cellValues, this.config, options);
  }

  async expectCellValue(
    rowMatcher: RowMatcher,
    colId: string,
    expectedValue: unknown,
    options?: AssertionOptions
  ): Promise<void> {
    await expectCellValueFn(this.getGrid(), rowMatcher, colId, expectedValue, this.config, options);
  }

  async expectSortedBy(
    colId: string,
    direction: 'asc' | 'desc',
    options?: AssertionOptions
  ): Promise<void> {
    await expectSortedByFn(this.getGrid(), colId, direction, this.config, options);
  }

  async expectEmpty(options?: AssertionOptions): Promise<void> {
    await expectEmptyFn(this.getGrid(), this.config, options);
  }

  async expectRowSelected(matcher: RowMatcher, options?: AssertionOptions): Promise<void> {
    await expectRowSelectedFn(this.getGrid(), matcher, this.config, options);
  }

  async expectNoRowsOverlay(options?: AssertionOptions): Promise<void> {
    await expectNoRowsOverlayFn(this.getGrid(), this.config, options);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Actions (stubs - implemented in Phase 4)
  // ─────────────────────────────────────────────────────────────────────────

  async clickCell(rowMatcher: RowMatcher, colId: string): Promise<void> {
    const cell = this.getCell(rowMatcher, colId);
    await cell.click();
  }

  async editCell(rowMatcher: RowMatcher, colId: string, newValue: string): Promise<void> {
    const cell = this.getCell(rowMatcher, colId);
    await cell.dblclick();
    await cell.locator('input, textarea').fill(newValue);
    await cell.press('Enter');
  }

  async sortByColumn(colId: string, direction?: 'asc' | 'desc'): Promise<void> {
    const header = this.getHeaderCell(colId);
    // Click until desired direction is reached
    if (!direction) {
      await header.click();
      return;
    }

    // Click up to 3 times to cycle through sort states
    for (let i = 0; i < 3; i++) {
      const currentSort = await header.getAttribute('aria-sort');
      if (
        (direction === 'asc' && currentSort === 'ascending') ||
        (direction === 'desc' && currentSort === 'descending')
      ) {
        return;
      }
      await header.click();
      await this.page.waitForTimeout(100);
    }
  }

  async filterColumn(colId: string, filterValue: string): Promise<void> {
    const filterInput = this.getFilterInput(colId);
    await filterInput.fill(filterValue);
  }

  async clearFilter(colId: string): Promise<void> {
    const filterInput = this.getFilterInput(colId);
    await filterInput.clear();
  }

  async clearAllFilters(): Promise<void> {
    // Find all filter inputs and clear them
    const filterInputs = this.getGrid().locator('.ag-floating-filter input');
    const count = await filterInputs.count();
    for (let i = 0; i < count; i++) {
      await filterInputs.nth(i).clear();
    }
  }

  async selectRow(matcher: RowMatcher): Promise<void> {
    const row = this.getRow(matcher);
    const checkbox = row.locator('.ag-selection-checkbox input');
    const checkboxCount = await checkbox.count();

    if (checkboxCount > 0) {
      await checkbox.check();
    } else {
      await row.click();
    }
  }

  async deselectRow(matcher: RowMatcher): Promise<void> {
    const row = this.getRow(matcher);
    const checkbox = row.locator('.ag-selection-checkbox input');
    const checkboxCount = await checkbox.count();

    if (checkboxCount > 0) {
      await checkbox.uncheck();
    }
  }

  async selectAllRows(): Promise<void> {
    const selectAll = this.getGrid().locator('.ag-header-select-all input');
    await selectAll.check();
  }

  async deselectAllRows(): Promise<void> {
    const selectAll = this.getGrid().locator('.ag-header-select-all input');
    await selectAll.uncheck();
  }

  async scrollToRow(matcher: RowMatcher): Promise<void> {
    // Basic scroll - will be enhanced in Phase 5
    const row = this.getRow(matcher);
    await row.scrollIntoViewIfNeeded();
  }

  async scrollToColumn(colId: string): Promise<void> {
    const cell = this.getGrid().locator(`.ag-cell[col-id="${colId}"]`).first();
    await cell.scrollIntoViewIfNeeded();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Enterprise Features (stubs - implemented in Phase 6)
  // ─────────────────────────────────────────────────────────────────────────

  async expandGroup(matcher: RowMatcher): Promise<void> {
    const row = this.getRow(matcher);
    const expandIcon = row.locator('.ag-group-contracted');
    await expandIcon.click();
  }

  async collapseGroup(matcher: RowMatcher): Promise<void> {
    const row = this.getRow(matcher);
    const collapseIcon = row.locator('.ag-group-expanded');
    await collapseIcon.click();
  }

  async expandAllGroups(): Promise<void> {
    // Click all contracted groups
    const contractedGroups = this.getGrid().locator('.ag-group-contracted');
    const count = await contractedGroups.count();
    for (let i = 0; i < count; i++) {
      await contractedGroups.first().click();
      await this.page.waitForTimeout(50);
    }
  }

  async collapseAllGroups(): Promise<void> {
    // Click all expanded groups
    const expandedGroups = this.getGrid().locator('.ag-group-expanded');
    const count = await expandedGroups.count();
    for (let i = 0; i < count; i++) {
      await expandedGroups.first().click();
      await this.page.waitForTimeout(50);
    }
  }

  async getGroupChildCount(matcher: RowMatcher): Promise<number> {
    const row = this.getRow(matcher);
    const childCountEl = row.locator('.ag-group-child-count');
    const count = await childCountEl.count();

    if (count > 0) {
      const text = await childCountEl.textContent();
      const match = text?.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    }

    return 0;
  }

  async expandMasterRow(matcher: RowMatcher): Promise<void> {
    const row = this.getRow(matcher);
    const expandIcon = row.locator('.ag-group-contracted, .ag-row-group-expand');
    await expandIcon.click();
  }

  getDetailGrid(_masterRowMatcher: RowMatcher): IAgGridHelper {
    // Find the detail grid for this master row
    // TODO: Use masterRowMatcher to find the specific detail grid when needed
    const detailSelector = '.ag-details-row .ag-root-wrapper';
    return new AgGridHelperImpl(this.page, {
      ...this.config,
      selector: detailSelector,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Data Extraction
  // ─────────────────────────────────────────────────────────────────────────

  async getCellValue(rowMatcher: RowMatcher, colId: string): Promise<unknown> {
    const match = await findRowByMatcher(this.getGrid(), rowMatcher, this.config);
    if (!match) {
      throw new Error(`Could not find row matching criteria`);
    }
    return match.data.cells[colId];
  }

  async getRowData(matcher: RowMatcher): Promise<AgGridRowData> {
    const match = await findRowByMatcher(this.getGrid(), matcher, this.config);
    if (!match) {
      throw new Error(`Could not find row matching criteria`);
    }
    return match.data;
  }

  async getAllVisibleRowData(): Promise<AgGridRowData[]> {
    return getAllVisibleRowDataFn(this.getGrid(), this.config);
  }

  async getGridState(): Promise<AgGridState> {
    return getGridStateFn(this.getGrid(), this.config);
  }

  async getSelectedRowIds(): Promise<string[]> {
    const selectedRows = this.getGrid().locator('.ag-row-selected');
    const count = await selectedRows.count();
    const ids: string[] = [];

    for (let i = 0; i < count; i++) {
      const rowId = await selectedRows.nth(i).getAttribute('row-id');
      if (rowId) {
        ids.push(rowId);
      }
    }

    return ids;
  }
}
