/**
 * AG Grid Row Grouping Helpers (Enterprise)
 *
 * Provides utilities for testing row grouping functionality.
 *
 * @module grid/ag-grid/enterprise/grouping
 */

import type { Locator } from '@playwright/test';
import type { RowMatcher } from '../../types.js';
import { AG_GRID_SELECTORS } from '../selectors.js';
import { getRow, type GridLocatorContext } from '../locators.js';

/**
 * Check if a row is a group row
 *
 * @param rowLocator - The row locator
 * @returns True if the row is a group row
 */
export async function isGroupRow(rowLocator: Locator): Promise<boolean> {
  const classAttr = await rowLocator.getAttribute('class');
  return classAttr?.includes('ag-row-group') ?? false;
}

/**
 * Check if a group row is expanded
 *
 * @param rowLocator - The row locator
 * @returns True if the group is expanded
 */
export async function isGroupExpanded(rowLocator: Locator): Promise<boolean> {
  // Check for expanded icon
  const expandedIcon = rowLocator.locator(AG_GRID_SELECTORS.GROUP_EXPANDED);
  const expandedCount = await expandedIcon.count();
  if (expandedCount > 0) {
    return true;
  }

  // Also check aria-expanded attribute
  const ariaExpanded = await rowLocator.getAttribute('aria-expanded');
  return ariaExpanded === 'true';
}

/**
 * Expand a group row
 *
 * @param ctx - Grid locator context
 * @param matcher - Row matching criteria for the group row
 */
export async function expandGroup(
  ctx: GridLocatorContext,
  matcher: RowMatcher
): Promise<void> {
  const row = getRow(ctx, matcher);

  // Check if already expanded
  const isExpanded = await isGroupExpanded(row);
  if (isExpanded) {
    return; // Already expanded
  }

  // Click the expand icon
  const expandIcon = row.locator(
    `${AG_GRID_SELECTORS.GROUP_CONTRACTED}, .ag-group-component`
  ).first();

  await expandIcon.click();
  await ctx.page.waitForTimeout(100); // Allow expansion animation
}

/**
 * Collapse a group row
 *
 * @param ctx - Grid locator context
 * @param matcher - Row matching criteria for the group row
 */
export async function collapseGroup(
  ctx: GridLocatorContext,
  matcher: RowMatcher
): Promise<void> {
  const row = getRow(ctx, matcher);

  // Check if already collapsed
  const isExpanded = await isGroupExpanded(row);
  if (!isExpanded) {
    return; // Already collapsed
  }

  // Click the collapse icon
  const collapseIcon = row.locator(
    `${AG_GRID_SELECTORS.GROUP_EXPANDED}, .ag-group-component`
  ).first();

  await collapseIcon.click();
  await ctx.page.waitForTimeout(100); // Allow collapse animation
}

/**
 * Expand all group rows in the grid
 *
 * @param ctx - Grid locator context
 */
export async function expandAllGroups(ctx: GridLocatorContext): Promise<void> {
  // Keep expanding until no more contracted groups exist
  let contractedCount = await ctx.gridLocator.locator(AG_GRID_SELECTORS.GROUP_CONTRACTED).count();

  while (contractedCount > 0) {
    // Click the first contracted group
    await ctx.gridLocator.locator(AG_GRID_SELECTORS.GROUP_CONTRACTED).first().click();
    await ctx.page.waitForTimeout(50);

    // Recount contracted groups
    contractedCount = await ctx.gridLocator.locator(AG_GRID_SELECTORS.GROUP_CONTRACTED).count();
  }
}

/**
 * Collapse all group rows in the grid
 *
 * @param ctx - Grid locator context
 */
export async function collapseAllGroups(ctx: GridLocatorContext): Promise<void> {
  // Keep collapsing until no more expanded groups exist
  let expandedCount = await ctx.gridLocator.locator(AG_GRID_SELECTORS.GROUP_EXPANDED).count();

  while (expandedCount > 0) {
    // Click the first expanded group
    await ctx.gridLocator.locator(AG_GRID_SELECTORS.GROUP_EXPANDED).first().click();
    await ctx.page.waitForTimeout(50);

    // Recount expanded groups
    expandedCount = await ctx.gridLocator.locator(AG_GRID_SELECTORS.GROUP_EXPANDED).count();
  }
}

/**
 * Get the child count for a group row
 *
 * @param ctx - Grid locator context
 * @param matcher - Row matching criteria for the group row
 * @returns Number of children in the group
 */
export async function getGroupChildCount(
  ctx: GridLocatorContext,
  matcher: RowMatcher
): Promise<number> {
  const row = getRow(ctx, matcher);

  // AG Grid shows child count in a span with class .ag-group-child-count
  const childCountEl = row.locator('.ag-group-child-count');
  const count = await childCountEl.count();

  if (count > 0) {
    const text = await childCountEl.textContent();
    // Extract number from text like "(10)" or "10"
    const match = text?.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  // If no child count element, count visible children
  // This requires knowing the group level structure
  return 0;
}

/**
 * Get the group level (nesting depth) of a row
 *
 * @param rowLocator - The row locator
 * @returns Group level (0 for top level, 1 for first nested level, etc.)
 */
export async function getGroupLevel(rowLocator: Locator): Promise<number> {
  // Check aria-level attribute
  const ariaLevel = await rowLocator.getAttribute('aria-level');
  if (ariaLevel) {
    return parseInt(ariaLevel, 10) - 1; // aria-level is 1-based
  }

  // Check for level class like .ag-row-level-0
  const classAttr = await rowLocator.getAttribute('class');
  const match = classAttr?.match(/ag-row-level-(\d+)/);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }

  return 0;
}

/**
 * Get all group rows in the grid
 *
 * @param ctx - Grid locator context
 * @returns Array of group row locators
 */
export async function getAllGroupRows(ctx: GridLocatorContext): Promise<Locator[]> {
  const groupRows = ctx.gridLocator.locator(AG_GRID_SELECTORS.ROW_GROUP);
  const count = await groupRows.count();
  const rows: Locator[] = [];

  for (let i = 0; i < count; i++) {
    rows.push(groupRows.nth(i));
  }

  return rows;
}

/**
 * Get the group value (the text shown for the group)
 *
 * @param rowLocator - The group row locator
 * @returns Group value text
 */
export async function getGroupValue(rowLocator: Locator): Promise<string> {
  // The group value is typically in the first cell or a special group cell
  const groupCell = rowLocator.locator('.ag-group-value').first();
  const count = await groupCell.count();

  if (count > 0) {
    return (await groupCell.textContent())?.trim() ?? '';
  }

  // Fallback to first cell
  const firstCell = rowLocator.locator('.ag-cell').first();
  return (await firstCell.textContent())?.trim() ?? '';
}
