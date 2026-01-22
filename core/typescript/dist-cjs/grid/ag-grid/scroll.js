"use strict";
/**
 * AG Grid Scroll Utilities
 *
 * Provides functions for handling virtualized grids with row and column scrolling.
 *
 * @module grid/ag-grid/scroll
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrollToRow = scrollToRow;
exports.scrollToColumn = scrollToColumn;
exports.scrollToTop = scrollToTop;
exports.scrollToBottom = scrollToBottom;
exports.getScrollPosition = getScrollPosition;
exports.setScrollPosition = setScrollPosition;
const selectors_js_1 = require("./selectors.js");
const locators_js_1 = require("./locators.js");
/**
 * Maximum number of scroll attempts before giving up
 */
const MAX_SCROLL_ATTEMPTS = 100;
/**
 * Scroll to bring a specific row into view
 *
 * Uses incremental scrolling with ARIA-based targeting to handle virtualized grids.
 *
 * @param ctx - Grid locator context
 * @param matcher - Row matching criteria (must have ariaRowIndex for virtualized grids)
 * @returns Locator for the found row
 * @throws Error if row cannot be found after maximum attempts
 */
async function scrollToRow(ctx, matcher) {
    const { gridLocator, config } = ctx;
    const viewport = (0, locators_js_1.getBodyViewport)(ctx);
    const scrollInterval = config.timeouts.scroll;
    // If we have a specific aria-rowindex target, use scroll strategy
    if (matcher.ariaRowIndex !== undefined) {
        return scrollToAriaRowIndex(gridLocator, viewport, matcher.ariaRowIndex, scrollInterval);
    }
    // For rowId, try to find it first, then scroll
    if (matcher.rowId !== undefined) {
        const row = gridLocator.locator(`${selectors_js_1.AG_GRID_SELECTORS.ROW}[${selectors_js_1.AG_GRID_SELECTORS.ATTR_ROW_ID}="${matcher.rowId}"]`);
        const count = await row.count();
        if (count > 0) {
            await row.first().scrollIntoViewIfNeeded();
            return row.first();
        }
        // Row not visible - may need to scroll to find it
        // This is more complex as we don't know the aria-rowindex
        throw new Error(`Row with id "${matcher.rowId}" not found in visible rows. ` +
            `For virtualized grids, use ariaRowIndex for more reliable scrolling.`);
    }
    // For rowIndex, it's the viewport index (0-based)
    if (matcher.rowIndex !== undefined) {
        const row = gridLocator.locator(`${selectors_js_1.AG_GRID_SELECTORS.ROW}[${selectors_js_1.AG_GRID_SELECTORS.ATTR_ROW_INDEX}="${matcher.rowIndex}"]`);
        const count = await row.count();
        if (count > 0) {
            await row.first().scrollIntoViewIfNeeded();
            return row.first();
        }
        throw new Error(`Row at index ${matcher.rowIndex} not found`);
    }
    throw new Error('scrollToRow requires ariaRowIndex, rowId, or rowIndex in the matcher');
}
/**
 * Scroll to a specific aria-rowindex in a virtualized grid
 *
 * @param gridLocator - The grid root locator
 * @param viewport - The body viewport locator
 * @param targetAriaIndex - Target aria-rowindex (1-based)
 * @param scrollInterval - Delay between scroll operations
 * @returns Locator for the found row
 */
async function scrollToAriaRowIndex(gridLocator, viewport, targetAriaIndex, scrollInterval) {
    let attempts = 0;
    while (attempts < MAX_SCROLL_ATTEMPTS) {
        // Check if target row is visible
        const targetRow = gridLocator.locator(`${selectors_js_1.AG_GRID_SELECTORS.ROW}[${selectors_js_1.AG_GRID_SELECTORS.ATTR_ARIA_ROW_INDEX}="${targetAriaIndex}"]`);
        const count = await targetRow.count();
        if (count > 0) {
            // Found it - ensure it's scrolled into view
            await targetRow.first().scrollIntoViewIfNeeded();
            return targetRow.first();
        }
        // Get the range of currently visible rows
        const visibleRows = await gridLocator.locator(`${selectors_js_1.AG_GRID_SELECTORS.ROW}[${selectors_js_1.AG_GRID_SELECTORS.ATTR_ARIA_ROW_INDEX}]`).all();
        if (visibleRows.length === 0) {
            throw new Error('No rows visible in the grid');
        }
        const firstRow = visibleRows[0];
        const lastRow = visibleRows[visibleRows.length - 1];
        if (!firstRow || !lastRow) {
            throw new Error('No rows visible in the grid');
        }
        const firstVisibleIndex = await (0, selectors_js_1.getAriaRowIndex)(firstRow);
        const lastVisibleIndex = await (0, selectors_js_1.getAriaRowIndex)(lastRow);
        // Determine scroll direction
        if (targetAriaIndex < firstVisibleIndex) {
            // Scroll up
            await scrollViewport(viewport, 'up');
        }
        else if (targetAriaIndex > lastVisibleIndex) {
            // Scroll down
            await scrollViewport(viewport, 'down');
        }
        else {
            // Target should be visible but wasn't found - this is unexpected
            throw new Error(`Row at aria-rowindex ${targetAriaIndex} should be visible ` +
                `(range: ${firstVisibleIndex}-${lastVisibleIndex}) but was not found`);
        }
        // Wait for DOM to update
        await gridLocator.page().waitForTimeout(scrollInterval);
        attempts++;
    }
    throw new Error(`Could not find row at aria-rowindex ${targetAriaIndex} after ${MAX_SCROLL_ATTEMPTS} scroll attempts`);
}
/** Scroll viewport ratio for incremental scrolling */
const SCROLL_VIEWPORT_RATIO = 0.8;
/** Horizontal scroll ratio for column scrolling */
const HORIZONTAL_SCROLL_RATIO = 0.5;
/**
 * Scroll the viewport in a specific direction
 *
 * @param viewport - The body viewport locator
 * @param direction - 'up' or 'down'
 */
async function scrollViewport(viewport, direction) {
    await viewport.evaluate((el, dir) => {
        const element = el;
        const scrollAmount = element.clientHeight * SCROLL_VIEWPORT_RATIO;
        if (dir === 'up') {
            element.scrollTop -= scrollAmount;
        }
        else {
            element.scrollTop += scrollAmount;
        }
    }, direction);
}
/**
 * Scroll to bring a specific column into view (horizontal scrolling)
 *
 * @param ctx - Grid locator context
 * @param colId - Column ID to scroll to
 */
async function scrollToColumn(ctx, colId) {
    const { gridLocator, config } = ctx;
    // Find a cell with the target column ID
    const cell = gridLocator.locator(`.ag-cell[col-id="${colId}"]`).first();
    const count = await cell.count();
    if (count > 0) {
        await cell.scrollIntoViewIfNeeded();
        return;
    }
    // If cell not found, try scrolling horizontally
    const viewport = (0, locators_js_1.getBodyViewport)(ctx);
    const scrollInterval = config.timeouts.scroll;
    for (let attempts = 0; attempts < MAX_SCROLL_ATTEMPTS; attempts++) {
        // Check if column is now visible
        const targetCell = gridLocator.locator(`.ag-cell[col-id="${colId}"]`).first();
        const cellCount = await targetCell.count();
        if (cellCount > 0) {
            await targetCell.scrollIntoViewIfNeeded();
            return;
        }
        // Scroll right
        await viewport.evaluate((el) => {
            const element = el;
            element.scrollLeft += element.clientWidth * HORIZONTAL_SCROLL_RATIO;
        });
        await gridLocator.page().waitForTimeout(scrollInterval);
    }
    throw new Error(`Could not find column "${colId}" after ${MAX_SCROLL_ATTEMPTS} scroll attempts`);
}
/**
 * Scroll to the top of the grid
 *
 * @param ctx - Grid locator context
 */
async function scrollToTop(ctx) {
    const viewport = (0, locators_js_1.getBodyViewport)(ctx);
    await viewport.evaluate((el) => {
        el.scrollTop = 0;
    });
    await ctx.page.waitForTimeout(ctx.config.timeouts.scroll);
}
/**
 * Scroll to the bottom of the grid
 *
 * @param ctx - Grid locator context
 */
async function scrollToBottom(ctx) {
    const viewport = (0, locators_js_1.getBodyViewport)(ctx);
    await viewport.evaluate((el) => {
        const element = el;
        element.scrollTop = element.scrollHeight;
    });
    await ctx.page.waitForTimeout(ctx.config.timeouts.scroll);
}
/**
 * Get the current scroll position of the grid
 *
 * @param ctx - Grid locator context
 * @returns Object with scrollTop and scrollLeft values
 */
async function getScrollPosition(ctx) {
    const viewport = (0, locators_js_1.getBodyViewport)(ctx);
    return viewport.evaluate((el) => {
        const element = el;
        return {
            scrollTop: element.scrollTop,
            scrollLeft: element.scrollLeft,
        };
    });
}
/**
 * Set the scroll position of the grid
 *
 * @param ctx - Grid locator context
 * @param scrollTop - Vertical scroll position
 * @param scrollLeft - Horizontal scroll position
 */
async function setScrollPosition(ctx, scrollTop, scrollLeft) {
    const viewport = (0, locators_js_1.getBodyViewport)(ctx);
    await viewport.evaluate((el, pos) => {
        const element = el;
        element.scrollTop = pos.scrollTop;
        element.scrollLeft = pos.scrollLeft;
    }, { scrollTop, scrollLeft });
    await ctx.page.waitForTimeout(ctx.config.timeouts.scroll);
}
//# sourceMappingURL=scroll.js.map