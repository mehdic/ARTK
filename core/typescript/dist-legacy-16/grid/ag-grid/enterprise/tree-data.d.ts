/**
 * AG Grid Tree Data Helpers (Enterprise)
 *
 * Provides utilities for testing tree data functionality.
 *
 * @module grid/ag-grid/enterprise/tree-data
 */
import type { Locator } from '@playwright/test';
import type { RowMatcher } from '../../types.js';
import { type GridLocatorContext } from '../locators.js';
/**
 * Check if a row is a tree node (has children)
 *
 * @param rowLocator - The row locator
 * @returns True if the row is a tree node
 */
export declare function isTreeNode(rowLocator: Locator): Promise<boolean>;
/**
 * Check if a tree node is expanded
 *
 * @param rowLocator - The row locator
 * @returns True if the tree node is expanded
 */
export declare function isTreeNodeExpanded(rowLocator: Locator): Promise<boolean>;
/**
 * Expand a tree node
 *
 * @param ctx - Grid locator context
 * @param matcher - Row matching criteria for the tree node
 */
export declare function expandTreeNode(ctx: GridLocatorContext, matcher: RowMatcher): Promise<void>;
/**
 * Collapse a tree node
 *
 * @param ctx - Grid locator context
 * @param matcher - Row matching criteria for the tree node
 */
export declare function collapseTreeNode(ctx: GridLocatorContext, matcher: RowMatcher): Promise<void>;
/**
 * Get the tree level (depth) of a row
 *
 * @param rowLocator - The row locator
 * @returns Tree level (0 for root, 1 for first level children, etc.)
 */
export declare function getTreeLevel(rowLocator: Locator): Promise<number>;
/**
 * Get the parent node of a tree node
 *
 * This is a heuristic approach based on tree levels.
 *
 * @param ctx - Grid locator context
 * @param matcher - Row matching criteria for the child node
 * @returns Locator for the parent node, or null if at root level
 */
export declare function getParentNode(ctx: GridLocatorContext, matcher: RowMatcher): Promise<Locator | null>;
/**
 * Expand all nodes along a path to a specific node
 *
 * @param ctx - Grid locator context
 * @param matcher - Row matching criteria for the target node
 */
export declare function expandPathTo(ctx: GridLocatorContext, matcher: RowMatcher): Promise<void>;
/**
 * Get all child nodes of a tree node
 *
 * @param ctx - Grid locator context
 * @param matcher - Row matching criteria for the parent node
 * @returns Array of child row locators
 */
export declare function getChildNodes(ctx: GridLocatorContext, matcher: RowMatcher): Promise<Locator[]>;
//# sourceMappingURL=tree-data.d.ts.map