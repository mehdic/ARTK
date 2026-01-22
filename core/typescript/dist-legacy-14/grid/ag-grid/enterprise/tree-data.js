"use strict";
/**
 * AG Grid Tree Data Helpers (Enterprise)
 *
 * Provides utilities for testing tree data functionality.
 *
 * @module grid/ag-grid/enterprise/tree-data
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTreeNode = isTreeNode;
exports.isTreeNodeExpanded = isTreeNodeExpanded;
exports.expandTreeNode = expandTreeNode;
exports.collapseTreeNode = collapseTreeNode;
exports.getTreeLevel = getTreeLevel;
exports.getParentNode = getParentNode;
exports.expandPathTo = expandPathTo;
exports.getChildNodes = getChildNodes;
const locators_js_1 = require("../locators.js");
const grouping_js_1 = require("./grouping.js");
/**
 * Check if a row is a tree node (has children)
 *
 * @param rowLocator - The row locator
 * @returns True if the row is a tree node
 */
async function isTreeNode(rowLocator) {
    // Check for tree expand/collapse icons
    const hasExpandIcon = await rowLocator.locator('.ag-group-contracted, .ag-group-expanded').count() > 0;
    if (hasExpandIcon) {
        return true;
    }
    // Check for tree level attribute
    const treeLevel = await rowLocator.getAttribute('tree-level');
    return treeLevel !== null;
}
/**
 * Check if a tree node is expanded
 *
 * @param rowLocator - The row locator
 * @returns True if the tree node is expanded
 */
async function isTreeNodeExpanded(rowLocator) {
    return (0, grouping_js_1.isGroupExpanded)(rowLocator);
}
/**
 * Expand a tree node
 *
 * @param ctx - Grid locator context
 * @param matcher - Row matching criteria for the tree node
 */
async function expandTreeNode(ctx, matcher) {
    return (0, grouping_js_1.expandGroup)(ctx, matcher);
}
/**
 * Collapse a tree node
 *
 * @param ctx - Grid locator context
 * @param matcher - Row matching criteria for the tree node
 */
async function collapseTreeNode(ctx, matcher) {
    return (0, grouping_js_1.collapseGroup)(ctx, matcher);
}
/**
 * Get the tree level (depth) of a row
 *
 * @param rowLocator - The row locator
 * @returns Tree level (0 for root, 1 for first level children, etc.)
 */
async function getTreeLevel(rowLocator) {
    // Check tree-level attribute (some AG Grid configurations use this)
    const treeLevel = await rowLocator.getAttribute('tree-level');
    if (treeLevel) {
        return parseInt(treeLevel, 10);
    }
    // Fall back to group level detection
    return (0, grouping_js_1.getGroupLevel)(rowLocator);
}
/**
 * Get the parent node of a tree node
 *
 * This is a heuristic approach based on tree levels.
 *
 * @param ctx - Grid locator context
 * @param matcher - Row matching criteria for the child node
 * @returns Locator for the parent node, or null if at root level
 */
async function getParentNode(ctx, matcher) {
    const row = (0, locators_js_1.getRow)(ctx, matcher);
    const currentLevel = await getTreeLevel(row);
    if (currentLevel === 0) {
        return null; // Already at root
    }
    // Walk backwards to find a row with level - 1
    const ariaRowIndex = await row.getAttribute('aria-rowindex');
    if (!ariaRowIndex) {
        return null;
    }
    const currentIndex = parseInt(ariaRowIndex, 10);
    for (let i = currentIndex - 1; i >= 1; i--) {
        const candidateRow = ctx.gridLocator.locator(`.ag-row[aria-rowindex="${i}"]`);
        const count = await candidateRow.count();
        if (count > 0) {
            const candidateLevel = await getTreeLevel(candidateRow);
            if (candidateLevel === currentLevel - 1) {
                return candidateRow;
            }
        }
    }
    return null;
}
/**
 * Expand all nodes along a path to a specific node
 *
 * @param ctx - Grid locator context
 * @param matcher - Row matching criteria for the target node
 */
async function expandPathTo(ctx, matcher) {
    const row = (0, locators_js_1.getRow)(ctx, matcher);
    const count = await row.count();
    if (count === 0) {
        throw new Error('Target node not found. It may be hidden under collapsed parents.');
    }
    // Find and expand all parent nodes
    const rowIndex = parseInt(await row.getAttribute('aria-rowindex') || '1', 10);
    let parentRow = await getParentNode(ctx, { ariaRowIndex: rowIndex });
    while (parentRow) {
        const isExpanded = await isTreeNodeExpanded(parentRow);
        if (!isExpanded) {
            await parentRow.locator('.ag-group-contracted').first().click();
            await ctx.page.waitForTimeout(50);
        }
        const parentIndex = await parentRow.getAttribute('aria-rowindex');
        if (!parentIndex)
            break;
        parentRow = await getParentNode(ctx, { ariaRowIndex: parseInt(parentIndex, 10) });
    }
}
/**
 * Get all child nodes of a tree node
 *
 * @param ctx - Grid locator context
 * @param matcher - Row matching criteria for the parent node
 * @returns Array of child row locators
 */
async function getChildNodes(ctx, matcher) {
    const parentRow = (0, locators_js_1.getRow)(ctx, matcher);
    const parentAriaIndex = await parentRow.getAttribute('aria-rowindex');
    if (!parentAriaIndex) {
        return [];
    }
    const parentLevel = await getTreeLevel(parentRow);
    const parentIndex = parseInt(parentAriaIndex, 10);
    const children = [];
    // Scan following rows for direct children
    let i = parentIndex + 1;
    while (true) {
        const row = ctx.gridLocator.locator(`.ag-row[aria-rowindex="${i}"]`);
        const count = await row.count();
        if (count === 0) {
            break; // No more rows
        }
        const level = await getTreeLevel(row);
        if (level <= parentLevel) {
            break; // Back to same or higher level, stop
        }
        if (level === parentLevel + 1) {
            children.push(row); // Direct child
        }
        i++;
    }
    return children;
}
//# sourceMappingURL=tree-data.js.map