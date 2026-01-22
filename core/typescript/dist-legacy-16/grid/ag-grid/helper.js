"use strict";
/**
 * AG Grid Helper Class
 *
 * Main class implementing the AgGridHelper interface.
 *
 * @module grid/ag-grid/helper
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgGridHelperImpl = void 0;
const config_js_1 = require("./config.js");
const locators_js_1 = require("./locators.js");
const selectors_js_1 = require("./selectors.js");
const wait_js_1 = require("./wait.js");
const assertions_js_1 = require("./assertions.js");
const row_data_js_1 = require("./row-data.js");
const state_js_1 = require("./state.js");
/**
 * AG Grid Helper implementation
 */
class AgGridHelperImpl {
    constructor(page, config) {
        this.page = page;
        // Validate config before normalizing (skip validation for string selectors)
        if (typeof config !== 'string') {
            (0, config_js_1.validateConfig)(config);
        }
        this.config = (0, config_js_1.normalizeConfig)(config);
        this.ctx = (0, locators_js_1.createLocatorContext)(page, this.config);
    }
    // ─────────────────────────────────────────────────────────────────────────
    // Locators
    // ─────────────────────────────────────────────────────────────────────────
    getGrid() {
        return (0, locators_js_1.getGrid)(this.ctx);
    }
    getRow(matcher) {
        return (0, locators_js_1.getRow)(this.ctx, matcher);
    }
    getVisibleRows() {
        return (0, locators_js_1.getVisibleRows)(this.ctx);
    }
    getCell(rowMatcher, colId) {
        return (0, locators_js_1.getCell)(this.ctx, rowMatcher, colId);
    }
    getHeaderCell(colId) {
        return (0, locators_js_1.getHeaderCell)(this.ctx, colId);
    }
    getFilterInput(colId) {
        return (0, locators_js_1.getFilterInput)(this.ctx, colId);
    }
    // ─────────────────────────────────────────────────────────────────────────
    // Wait Utilities
    // ─────────────────────────────────────────────────────────────────────────
    async waitForReady(options) {
        await (0, wait_js_1.waitForReady)(this.getGrid(), this.config, options);
    }
    async waitForDataLoaded(options) {
        await (0, wait_js_1.waitForDataLoaded)(this.getGrid(), this.config, options);
    }
    async waitForRowCount(count, options) {
        await (0, wait_js_1.waitForRowCount)(this.getGrid(), count, this.config, options);
    }
    async waitForRow(matcher, options) {
        return (0, wait_js_1.waitForRow)(this.getGrid(), matcher, this.config, options);
    }
    // ─────────────────────────────────────────────────────────────────────────
    // Assertions
    // ─────────────────────────────────────────────────────────────────────────
    async expectRowCount(count, options) {
        await (0, assertions_js_1.expectRowCount)(this.getGrid(), count, this.config, options);
    }
    async expectRowContains(cellValues, options) {
        await (0, assertions_js_1.expectRowContains)(this.getGrid(), cellValues, this.config, options);
    }
    async expectRowNotContains(cellValues, options) {
        await (0, assertions_js_1.expectRowNotContains)(this.getGrid(), cellValues, this.config, options);
    }
    async expectCellValue(rowMatcher, colId, expectedValue, options) {
        await (0, assertions_js_1.expectCellValue)(this.getGrid(), rowMatcher, colId, expectedValue, this.config, options);
    }
    async expectSortedBy(colId, direction, options) {
        await (0, assertions_js_1.expectSortedBy)(this.getGrid(), colId, direction, this.config, options);
    }
    async expectEmpty(options) {
        await (0, assertions_js_1.expectEmpty)(this.getGrid(), this.config, options);
    }
    async expectRowSelected(matcher, options) {
        await (0, assertions_js_1.expectRowSelected)(this.getGrid(), matcher, this.config, options);
    }
    async expectNoRowsOverlay(options) {
        await (0, assertions_js_1.expectNoRowsOverlay)(this.getGrid(), this.config, options);
    }
    // ─────────────────────────────────────────────────────────────────────────
    // Actions (stubs - implemented in Phase 4)
    // ─────────────────────────────────────────────────────────────────────────
    async clickCell(rowMatcher, colId) {
        const cell = this.getCell(rowMatcher, colId);
        await cell.click();
    }
    async editCell(rowMatcher, colId, newValue) {
        const cell = this.getCell(rowMatcher, colId);
        await cell.dblclick();
        await cell.locator('input, textarea').fill(newValue);
        await cell.press('Enter');
    }
    async sortByColumn(colId, direction) {
        const header = this.getHeaderCell(colId);
        // Click until desired direction is reached
        if (!direction) {
            await header.click();
            return;
        }
        // Click up to 3 times to cycle through sort states
        for (let i = 0; i < 3; i++) {
            const currentSort = await header.getAttribute('aria-sort');
            if ((direction === 'asc' && currentSort === 'ascending') ||
                (direction === 'desc' && currentSort === 'descending')) {
                return;
            }
            await header.click();
            await this.page.waitForTimeout(100);
        }
    }
    async filterColumn(colId, filterValue) {
        const filterInput = this.getFilterInput(colId);
        await filterInput.fill(filterValue);
    }
    async clearFilter(colId) {
        const filterInput = this.getFilterInput(colId);
        await filterInput.clear();
    }
    async clearAllFilters() {
        // Find all filter inputs and clear them
        const filterInputs = this.getGrid().locator('.ag-floating-filter input');
        const count = await filterInputs.count();
        for (let i = 0; i < count; i++) {
            await filterInputs.nth(i).clear();
        }
    }
    async selectRow(matcher) {
        const row = this.getRow(matcher);
        const checkbox = row.locator('.ag-selection-checkbox input');
        const checkboxCount = await checkbox.count();
        if (checkboxCount > 0) {
            await checkbox.check();
        }
        else {
            await row.click();
        }
        // Wait briefly for selection state to update
        await this.page.waitForTimeout(50);
        // Verify selection succeeded (post-action verification)
        // Note: Only fails if row exists but selection didn't register
        // Some grids may not support selection or may have custom selection handlers
        const rowCount = await row.count();
        if (rowCount > 0) {
            const selected = await (0, selectors_js_1.isRowSelected)(row.first());
            // Log warning but don't fail - fixture may not have JS selection support
            if (!selected && checkboxCount > 0) {
                // Only throw if we explicitly used checkbox (indicates broken selection)
                throw new Error(`Failed to select row matching: ${(0, selectors_js_1.formatRowMatcher)(matcher)}. ` +
                    `Checkbox was checked but selection state did not change.`);
            }
        }
    }
    async deselectRow(matcher) {
        const row = this.getRow(matcher);
        const checkbox = row.locator('.ag-selection-checkbox input');
        const checkboxCount = await checkbox.count();
        if (checkboxCount > 0) {
            await checkbox.uncheck();
        }
    }
    async selectAllRows() {
        const selectAll = this.getGrid().locator('.ag-header-select-all input');
        await selectAll.check();
    }
    async deselectAllRows() {
        const selectAll = this.getGrid().locator('.ag-header-select-all input');
        await selectAll.uncheck();
    }
    async scrollToRow(matcher) {
        // Basic scroll - will be enhanced in Phase 5
        const row = this.getRow(matcher);
        await row.scrollIntoViewIfNeeded();
    }
    async scrollToColumn(colId) {
        const cell = this.getGrid().locator(`.ag-cell[col-id="${colId}"]`).first();
        await cell.scrollIntoViewIfNeeded();
    }
    // ─────────────────────────────────────────────────────────────────────────
    // Enterprise Features (stubs - implemented in Phase 6)
    // ─────────────────────────────────────────────────────────────────────────
    async expandGroup(matcher) {
        const row = this.getRow(matcher);
        const expandIcon = row.locator('.ag-group-contracted');
        await expandIcon.click();
    }
    async collapseGroup(matcher) {
        const row = this.getRow(matcher);
        const collapseIcon = row.locator('.ag-group-expanded');
        await collapseIcon.click();
    }
    async expandAllGroups() {
        // Optimized: Keep expanding until no more contracted groups exist
        // This handles dynamically appearing nested groups
        const maxIterations = 100; // Safety limit
        let iterations = 0;
        while (iterations < maxIterations) {
            const contractedGroup = this.getGrid().locator('.ag-group-contracted').first();
            const count = await contractedGroup.count();
            if (count === 0) {
                break; // No more contracted groups
            }
            await contractedGroup.click();
            await this.page.waitForTimeout(50);
            iterations++;
        }
    }
    async collapseAllGroups() {
        // Optimized: Keep collapsing until no more expanded groups exist
        // Process from deepest level first by collapsing outermost first
        const maxIterations = 100; // Safety limit
        let iterations = 0;
        while (iterations < maxIterations) {
            const expandedGroup = this.getGrid().locator('.ag-group-expanded').first();
            const count = await expandedGroup.count();
            if (count === 0) {
                break; // No more expanded groups
            }
            await expandedGroup.click();
            await this.page.waitForTimeout(50);
            iterations++;
        }
    }
    async getGroupChildCount(matcher) {
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
    async expandMasterRow(matcher) {
        const row = this.getRow(matcher);
        const expandIcon = row.locator('.ag-group-contracted, .ag-row-group-expand');
        await expandIcon.click();
    }
    getDetailGrid(_masterRowMatcher) {
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
    async getCellValue(rowMatcher, colId) {
        const match = await (0, row_data_js_1.findRowByMatcher)(this.getGrid(), rowMatcher, this.config);
        if (!match) {
            const visibleCount = await this.getVisibleRows().count();
            throw new Error(`Could not find row matching: ${(0, selectors_js_1.formatRowMatcher)(rowMatcher)}. ` +
                `Grid has ${visibleCount} visible row(s).`);
        }
        return match.data.cells[colId];
    }
    async getRowData(matcher) {
        const match = await (0, row_data_js_1.findRowByMatcher)(this.getGrid(), matcher, this.config);
        if (!match) {
            const visibleCount = await this.getVisibleRows().count();
            throw new Error(`Could not find row matching: ${(0, selectors_js_1.formatRowMatcher)(matcher)}. ` +
                `Grid has ${visibleCount} visible row(s).`);
        }
        return match.data;
    }
    async getAllVisibleRowData() {
        return (0, row_data_js_1.getAllVisibleRowData)(this.getGrid(), this.config);
    }
    async getGridState() {
        return (0, state_js_1.getGridState)(this.getGrid(), this.config);
    }
    async getSelectedRowIds() {
        const selectedRows = this.getGrid().locator('.ag-row-selected');
        const count = await selectedRows.count();
        const ids = [];
        for (let i = 0; i < count; i++) {
            const rowId = await selectedRows.nth(i).getAttribute('row-id');
            if (rowId) {
                ids.push(rowId);
            }
        }
        return ids;
    }
}
exports.AgGridHelperImpl = AgGridHelperImpl;
//# sourceMappingURL=helper.js.map