/**
 * AG Grid Tree Data Helpers (Enterprise)
 *
 * Provides utilities for testing tree data functionality.
 *
 * @module grid/ag-grid/enterprise/tree-data
 */

import type { Locator } from '@playwright/test';
import type { RowMatcher } from '../../types.js';
import { getRow, type GridLocatorContext } from '../locators.js';
import {
  isGroupExpanded,
  expandGroup,
  collapseGroup,
  getGroupLevel,
} from './grouping.js';

/**
 * Check if a row is a tree node (has children)
 *
 * @param rowLocator - The row locator
 * @returns True if the row is a tree node
 */
export async function isTreeNode(rowLocator: Locator): Promise<boolean> {
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
export async function isTreeNodeExpanded(rowLocator: Locator): Promise<boolean> {
  return isGroupExpanded(rowLocator);
}

/**
 * Expand a tree node
 *
 * @param ctx - Grid locator context
 * @param matcher - Row matching criteria for the tree node
 */
export async function expandTreeNode(
  ctx: GridLocatorContext,
  matcher: RowMatcher
): Promise<void> {
  return expandGroup(ctx, matcher);
}

/**
 * Collapse a tree node
 *
 * @param ctx - Grid locator context
 * @param matcher - Row matching criteria for the tree node
 */
export async function collapseTreeNode(
  ctx: GridLocatorContext,
  matcher: RowMatcher
): Promise<void> {
  return collapseGroup(ctx, matcher);
}

/**
 * Get the tree level (depth) of a row
 *
 * @param rowLocator - The row locator
 * @returns Tree level (0 for root, 1 for first level children, etc.)
 */
export async function getTreeLevel(rowLocator: Locator): Promise<number> {
  // Check tree-level attribute (some AG Grid configurations use this)
  const treeLevel = await rowLocator.getAttribute('tree-level');
  if (treeLevel) {
    return parseInt(treeLevel, 10);
  }

  // Fall back to group level detection
  return getGroupLevel(rowLocator);
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
export async function getParentNode(
  ctx: GridLocatorContext,
  matcher: RowMatcher
): Promise<Locator | null> {
  const row = getRow(ctx, matcher);
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
    const candidateRow = ctx.gridLocator.locator(
      `.ag-row[aria-rowindex="${i}"]`
    );
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
export async function expandPathTo(
  ctx: GridLocatorContext,
  matcher: RowMatcher
): Promise<void> {
  const row = getRow(ctx, matcher);
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
    if (!parentIndex) break;

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
export async function getChildNodes(
  ctx: GridLocatorContext,
  matcher: RowMatcher
): Promise<Locator[]> {
  const parentRow = getRow(ctx, matcher);
  const parentAriaIndex = await parentRow.getAttribute('aria-rowindex');

  if (!parentAriaIndex) {
    return [];
  }

  const parentLevel = await getTreeLevel(parentRow);
  const parentIndex = parseInt(parentAriaIndex, 10);
  const children: Locator[] = [];

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
