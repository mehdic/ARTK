/**
 * AG Grid Row Grouping Helpers (Enterprise)
 *
 * Provides utilities for testing row grouping functionality.
 *
 * @module grid/ag-grid/enterprise/grouping
 */
import type { Locator } from '@playwright/test';
import type { RowMatcher } from '../../types.js';
import { type GridLocatorContext } from '../locators.js';
/**
 * Check if a row is a group row
 *
 * @param rowLocator - The row locator
 * @returns True if the row is a group row
 */
export declare function isGroupRow(rowLocator: Locator): Promise<boolean>;
/**
 * Check if a group row is expanded
 *
 * @param rowLocator - The row locator
 * @returns True if the group is expanded
 */
export declare function isGroupExpanded(rowLocator: Locator): Promise<boolean>;
/**
 * Expand a group row
 *
 * @param ctx - Grid locator context
 * @param matcher - Row matching criteria for the group row
 */
export declare function expandGroup(ctx: GridLocatorContext, matcher: RowMatcher): Promise<void>;
/**
 * Collapse a group row
 *
 * @param ctx - Grid locator context
 * @param matcher - Row matching criteria for the group row
 */
export declare function collapseGroup(ctx: GridLocatorContext, matcher: RowMatcher): Promise<void>;
/**
 * Expand all group rows in the grid
 *
 * @param ctx - Grid locator context
 */
export declare function expandAllGroups(ctx: GridLocatorContext): Promise<void>;
/**
 * Collapse all group rows in the grid
 *
 * @param ctx - Grid locator context
 */
export declare function collapseAllGroups(ctx: GridLocatorContext): Promise<void>;
/**
 * Get the child count for a group row
 *
 * @param ctx - Grid locator context
 * @param matcher - Row matching criteria for the group row
 * @returns Number of children in the group
 */
export declare function getGroupChildCount(ctx: GridLocatorContext, matcher: RowMatcher): Promise<number>;
/**
 * Get the group level (nesting depth) of a row
 *
 * @param rowLocator - The row locator
 * @returns Group level (0 for top level, 1 for first nested level, etc.)
 */
export declare function getGroupLevel(rowLocator: Locator): Promise<number>;
/**
 * Get all group rows in the grid
 *
 * @param ctx - Grid locator context
 * @returns Array of group row locators
 */
export declare function getAllGroupRows(ctx: GridLocatorContext): Promise<Locator[]>;
/**
 * Get the group value (the text shown for the group)
 *
 * @param rowLocator - The group row locator
 * @returns Group value text
 */
export declare function getGroupValue(rowLocator: Locator): Promise<string>;
//# sourceMappingURL=grouping.d.ts.map