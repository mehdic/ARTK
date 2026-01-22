/**
 * AG Grid Master/Detail Helpers (Enterprise)
 *
 * Provides utilities for testing master/detail grids.
 *
 * @module grid/ag-grid/enterprise/master-detail
 */
import type { Locator } from '@playwright/test';
import type { RowMatcher, AgGridHelper } from '../../types.js';
import { type GridLocatorContext } from '../locators.js';
/**
 * Check if a row has a detail view
 *
 * @param rowLocator - The row locator
 * @returns True if the row can show detail
 */
export declare function hasDetailView(rowLocator: Locator): Promise<boolean>;
/**
 * Check if a master row's detail is currently visible
 *
 * @param ctx - Grid locator context
 * @param masterMatcher - Row matching criteria for the master row
 * @returns True if the detail row is visible
 */
export declare function isDetailRowVisible(ctx: GridLocatorContext, masterMatcher: RowMatcher): Promise<boolean>;
/**
 * Expand a master row to show its detail
 *
 * @param ctx - Grid locator context
 * @param masterMatcher - Row matching criteria for the master row
 */
export declare function expandMasterRow(ctx: GridLocatorContext, masterMatcher: RowMatcher): Promise<void>;
/**
 * Collapse a master row to hide its detail
 *
 * @param ctx - Grid locator context
 * @param masterMatcher - Row matching criteria for the master row
 */
export declare function collapseMasterRow(ctx: GridLocatorContext, masterMatcher: RowMatcher): Promise<void>;
/**
 * Get the detail grid helper for a master row
 *
 * @param ctx - Grid locator context
 * @param masterMatcher - Row matching criteria for the master row
 * @returns AG Grid helper for the detail grid
 */
export declare function getDetailGrid(ctx: GridLocatorContext, _masterMatcher: RowMatcher): AgGridHelper;
/**
 * Get the detail row element for a master row
 *
 * @param ctx - Grid locator context
 * @param masterMatcher - Row matching criteria for the master row
 * @returns Locator for the detail row
 */
export declare function getDetailRow(ctx: GridLocatorContext, _masterMatcher: RowMatcher): Locator;
/**
 * Wait for the detail grid to be ready
 *
 * @param ctx - Grid locator context
 * @param masterMatcher - Row matching criteria for the master row
 * @param options - Wait options
 */
export declare function waitForDetailReady(ctx: GridLocatorContext, _masterMatcher: RowMatcher, options?: {
    timeout?: number;
}): Promise<void>;
/**
 * Get all master rows that have detail views
 *
 * @param ctx - Grid locator context
 * @returns Array of master row locators
 */
export declare function getAllMasterRows(ctx: GridLocatorContext): Promise<Locator[]>;
//# sourceMappingURL=master-detail.d.ts.map