/**
 * AG Grid Column Groups Support
 *
 * Provides utilities for testing grids with column grouping,
 * including expand/collapse and visibility management.
 *
 * @module grid/ag-grid/enterprise/column-groups
 */

import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import type { NormalizedAgGridConfig, ColumnGroupState } from '../../types.js';

/**
 * AG Grid column group CSS selectors
 */
export const COLUMN_GROUP_SELECTORS = {
  /** Column group header container */
  COLUMN_GROUP_HEADER: '.ag-header-group-cell',

  /** Column group expand icon */
  GROUP_EXPAND_ICON: '.ag-header-expand-icon, .ag-column-group-icons',

  /** Expanded group indicator */
  GROUP_EXPANDED: '.ag-header-group-cell-with-group[aria-expanded="true"]',

  /** Collapsed group indicator */
  GROUP_COLLAPSED: '.ag-header-group-cell-with-group[aria-expanded="false"]',

  /** Group label text */
  GROUP_LABEL: '.ag-header-group-text',

  /** Child header cells within a group */
  GROUP_CHILD_CELLS: '.ag-header-cell',

  /** Group ID attribute */
  ATTR_COL_GROUP_ID: 'col-id',

  /** Aria expanded attribute */
  ATTR_ARIA_EXPANDED: 'aria-expanded',

  /** Header row for groups (typically first header row) */
  HEADER_GROUP_ROW: '.ag-header-row-column-group',

  /** Header row for columns (typically second header row) */
  HEADER_COLUMN_ROW: '.ag-header-row-column',

  /** Open group icon */
  ICON_EXPANDED: '.ag-icon-expanded',

  /** Closed group icon */
  ICON_CONTRACTED: '.ag-icon-contracted',
} as const;

/**
 * Get the locator for a column group header
 *
 * @param gridLocator - The grid root locator
 * @param groupId - The group ID
 * @returns Locator for the column group header
 */
export function getColumnGroupHeader(gridLocator: Locator, groupId: string): Locator {
  return gridLocator.locator(
    `${COLUMN_GROUP_SELECTORS.COLUMN_GROUP_HEADER}[${COLUMN_GROUP_SELECTORS.ATTR_COL_GROUP_ID}="${groupId}"]`
  );
}

/**
 * Expand a column group to show all child columns
 *
 * @param gridLocator - The grid root locator
 * @param groupId - The group ID to expand
 * @param config - Normalized grid configuration
 */
export async function expandColumnGroup(
  gridLocator: Locator,
  groupId: string,
  _config: NormalizedAgGridConfig
): Promise<void> {
  const groupHeader = getColumnGroupHeader(gridLocator, groupId);
  const count = await groupHeader.count();

  if (count === 0) {
    throw new Error(`Column group "${groupId}" not found in grid`);
  }

  // Check if already expanded
  const isExpanded = await isColumnGroupExpanded(gridLocator, groupId);

  if (isExpanded) {
    return; // Already expanded
  }

  // Find and click the expand icon
  const expandIcon = groupHeader.locator(
    `${COLUMN_GROUP_SELECTORS.GROUP_EXPAND_ICON}, ${COLUMN_GROUP_SELECTORS.ICON_CONTRACTED}`
  );

  const iconCount = await expandIcon.count();

  if (iconCount > 0) {
    await expandIcon.first().click();
  } else {
    // Try clicking the header itself
    await groupHeader.click();
  }

  // Wait for expansion to complete
  await expect(async () => {
    const expanded = await isColumnGroupExpanded(gridLocator, groupId);
    expect(expanded).toBe(true);
  }).toPass({ timeout: 5000 });
}

/**
 * Collapse a column group to hide child columns
 *
 * @param gridLocator - The grid root locator
 * @param groupId - The group ID to collapse
 * @param config - Normalized grid configuration
 */
export async function collapseColumnGroup(
  gridLocator: Locator,
  groupId: string,
  _config: NormalizedAgGridConfig
): Promise<void> {
  const groupHeader = getColumnGroupHeader(gridLocator, groupId);
  const count = await groupHeader.count();

  if (count === 0) {
    throw new Error(`Column group "${groupId}" not found in grid`);
  }

  // Check if already collapsed
  const isExpanded = await isColumnGroupExpanded(gridLocator, groupId);

  if (!isExpanded) {
    return; // Already collapsed
  }

  // Find and click the collapse icon
  const collapseIcon = groupHeader.locator(
    `${COLUMN_GROUP_SELECTORS.GROUP_EXPAND_ICON}, ${COLUMN_GROUP_SELECTORS.ICON_EXPANDED}`
  );

  const iconCount = await collapseIcon.count();

  if (iconCount > 0) {
    await collapseIcon.first().click();
  } else {
    // Try clicking the header itself
    await groupHeader.click();
  }

  // Wait for collapse to complete
  await expect(async () => {
    const expanded = await isColumnGroupExpanded(gridLocator, groupId);
    expect(expanded).toBe(false);
  }).toPass({ timeout: 5000 });
}

/**
 * Toggle a column group expand/collapse state
 *
 * @param gridLocator - The grid root locator
 * @param groupId - The group ID to toggle
 * @param config - Normalized grid configuration
 */
export async function toggleColumnGroup(
  gridLocator: Locator,
  groupId: string,
  _config: NormalizedAgGridConfig
): Promise<void> {
  const isExpanded = await isColumnGroupExpanded(gridLocator, groupId);

  if (isExpanded) {
    await collapseColumnGroup(gridLocator, groupId, _config);
  } else {
    await expandColumnGroup(gridLocator, groupId, _config);
  }
}

/**
 * Check if a column group is expanded
 *
 * @param gridLocator - The grid root locator
 * @param groupId - The group ID to check
 * @returns True if the group is expanded
 */
export async function isColumnGroupExpanded(
  gridLocator: Locator,
  groupId: string
): Promise<boolean> {
  const groupHeader = getColumnGroupHeader(gridLocator, groupId);
  const count = await groupHeader.count();

  if (count === 0) {
    throw new Error(`Column group "${groupId}" not found in grid`);
  }

  // Check aria-expanded attribute
  const ariaExpanded = await groupHeader.getAttribute(
    COLUMN_GROUP_SELECTORS.ATTR_ARIA_EXPANDED
  );

  if (ariaExpanded !== null) {
    return ariaExpanded === 'true';
  }

  // Check for expanded icon
  const expandedIcon = groupHeader.locator(COLUMN_GROUP_SELECTORS.ICON_EXPANDED);
  const hasExpandedIcon = (await expandedIcon.count()) > 0;

  if (hasExpandedIcon) {
    return true;
  }

  // Check for expanded class
  const classAttr = await groupHeader.getAttribute('class');
  return classAttr?.includes('expanded') ?? false;
}

/**
 * Get all column group states
 *
 * @param gridLocator - The grid root locator
 * @param config - Normalized grid configuration
 * @returns Array of column group states
 */
export async function getColumnGroupStates(
  gridLocator: Locator,
  _config: NormalizedAgGridConfig
): Promise<ColumnGroupState[]> {
  const groupHeaders = gridLocator.locator(COLUMN_GROUP_SELECTORS.COLUMN_GROUP_HEADER);
  const count = await groupHeaders.count();
  const states: ColumnGroupState[] = [];

  for (let i = 0; i < count; i++) {
    const header = groupHeaders.nth(i);
    const groupId = await header.getAttribute(COLUMN_GROUP_SELECTORS.ATTR_COL_GROUP_ID);

    if (!groupId) {
      continue;
    }

    // Get expansion state
    const ariaExpanded = await header.getAttribute(
      COLUMN_GROUP_SELECTORS.ATTR_ARIA_EXPANDED
    );
    const isExpanded = ariaExpanded === 'true';

    // Get visible children
    const visibleChildren = await getGroupVisibleColumns(gridLocator, groupId);

    states.push({
      groupId,
      isExpanded,
      visibleChildren,
    });
  }

  return states;
}

/**
 * Get visible columns within a column group
 *
 * @param gridLocator - The grid root locator
 * @param groupId - The group ID
 * @returns Array of visible column IDs
 */
export async function getGroupVisibleColumns(
  gridLocator: Locator,
  groupId: string
): Promise<string[]> {
  // Find the group header
  const groupHeader = getColumnGroupHeader(gridLocator, groupId);
  const count = await groupHeader.count();

  if (count === 0) {
    return [];
  }

  // Get the column span to determine which columns belong to this group
  const colSpan = await groupHeader.evaluate((el) => {
    const colspan = el.getAttribute('colspan');
    return colspan ? parseInt(colspan, 10) : 1;
  });

  // Get the starting column index
  const startIndex = await groupHeader.evaluate((el) => {
    const prevSiblings = [];
    let sibling = el.previousElementSibling;
    while (sibling) {
      const colspan = sibling.getAttribute('colspan');
      prevSiblings.push(colspan ? parseInt(colspan, 10) : 1);
      sibling = sibling.previousElementSibling;
    }
    return prevSiblings.reduce((sum, span) => sum + span, 0);
  });

  // Get column headers from the column row
  const columnRow = gridLocator.locator(COLUMN_GROUP_SELECTORS.HEADER_COLUMN_ROW);
  const columnHeaders = columnRow.locator(COLUMN_GROUP_SELECTORS.GROUP_CHILD_CELLS);

  const visibleColumns: string[] = [];
  const totalColumns = await columnHeaders.count();

  // Extract column IDs for the columns in this group's span
  for (let i = startIndex; i < Math.min(startIndex + colSpan, totalColumns); i++) {
    const column = columnHeaders.nth(i);
    const isVisible = await column.isVisible();

    if (isVisible) {
      const colId = await column.getAttribute('col-id');
      if (colId) {
        visibleColumns.push(colId);
      }
    }
  }

  return visibleColumns;
}

/**
 * Get all column groups in the grid
 *
 * @param gridLocator - The grid root locator
 * @returns Array of group IDs
 */
export async function getAllColumnGroupIds(gridLocator: Locator): Promise<string[]> {
  const groupHeaders = gridLocator.locator(COLUMN_GROUP_SELECTORS.COLUMN_GROUP_HEADER);
  const count = await groupHeaders.count();
  const groupIds: string[] = [];

  for (let i = 0; i < count; i++) {
    const header = groupHeaders.nth(i);
    const groupId = await header.getAttribute(COLUMN_GROUP_SELECTORS.ATTR_COL_GROUP_ID);

    if (groupId && !groupIds.includes(groupId)) {
      groupIds.push(groupId);
    }
  }

  return groupIds;
}

/**
 * Expand all column groups
 *
 * @param gridLocator - The grid root locator
 * @param config - Normalized grid configuration
 */
export async function expandAllColumnGroups(
  gridLocator: Locator,
  _config: NormalizedAgGridConfig
): Promise<void> {
  const groupIds = await getAllColumnGroupIds(gridLocator);

  for (const groupId of groupIds) {
    const isExpanded = await isColumnGroupExpanded(gridLocator, groupId);
    if (!isExpanded) {
      await expandColumnGroup(gridLocator, groupId, _config);
    }
  }
}

/**
 * Collapse all column groups
 *
 * @param gridLocator - The grid root locator
 * @param config - Normalized grid configuration
 */
export async function collapseAllColumnGroups(
  gridLocator: Locator,
  _config: NormalizedAgGridConfig
): Promise<void> {
  const groupIds = await getAllColumnGroupIds(gridLocator);

  for (const groupId of groupIds) {
    const isExpanded = await isColumnGroupExpanded(gridLocator, groupId);
    if (isExpanded) {
      await collapseColumnGroup(gridLocator, groupId, _config);
    }
  }
}

/**
 * Get column group display name
 *
 * @param gridLocator - The grid root locator
 * @param groupId - The group ID
 * @returns Display name of the group
 */
export async function getColumnGroupDisplayName(
  gridLocator: Locator,
  groupId: string
): Promise<string> {
  const groupHeader = getColumnGroupHeader(gridLocator, groupId);
  const labelElement = groupHeader.locator(COLUMN_GROUP_SELECTORS.GROUP_LABEL);

  const count = await labelElement.count();
  if (count === 0) {
    return groupId; // Fallback to group ID
  }

  const text = await labelElement.textContent();
  return text?.trim() ?? groupId;
}

/**
 * Assert column group is expanded
 *
 * @param gridLocator - The grid root locator
 * @param groupId - The group ID to check
 */
export async function expectColumnGroupExpanded(
  gridLocator: Locator,
  groupId: string
): Promise<void> {
  const isExpanded = await isColumnGroupExpanded(gridLocator, groupId);

  if (!isExpanded) {
    const displayName = await getColumnGroupDisplayName(gridLocator, groupId);
    throw new Error(
      `Expected column group "${displayName}" (${groupId}) to be expanded, but it is collapsed`
    );
  }
}

/**
 * Assert column group is collapsed
 *
 * @param gridLocator - The grid root locator
 * @param groupId - The group ID to check
 */
export async function expectColumnGroupCollapsed(
  gridLocator: Locator,
  groupId: string
): Promise<void> {
  const isExpanded = await isColumnGroupExpanded(gridLocator, groupId);

  if (isExpanded) {
    const displayName = await getColumnGroupDisplayName(gridLocator, groupId);
    throw new Error(
      `Expected column group "${displayName}" (${groupId}) to be collapsed, but it is expanded`
    );
  }
}
