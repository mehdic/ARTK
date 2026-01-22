/**
 * AG Grid Column Groups Support
 *
 * Provides utilities for testing grids with column grouping,
 * including expand/collapse and visibility management.
 *
 * @module grid/ag-grid/enterprise/column-groups
 */
import type { Locator } from '@playwright/test';
import type { NormalizedAgGridConfig, ColumnGroupState } from '../../types.js';
/**
 * AG Grid column group CSS selectors
 */
export declare const COLUMN_GROUP_SELECTORS: {
    /** Column group header container */
    readonly COLUMN_GROUP_HEADER: ".ag-header-group-cell";
    /** Column group expand icon */
    readonly GROUP_EXPAND_ICON: ".ag-header-expand-icon, .ag-column-group-icons";
    /** Expanded group indicator */
    readonly GROUP_EXPANDED: ".ag-header-group-cell-with-group[aria-expanded=\"true\"]";
    /** Collapsed group indicator */
    readonly GROUP_COLLAPSED: ".ag-header-group-cell-with-group[aria-expanded=\"false\"]";
    /** Group label text */
    readonly GROUP_LABEL: ".ag-header-group-text";
    /** Child header cells within a group */
    readonly GROUP_CHILD_CELLS: ".ag-header-cell";
    /** Group ID attribute */
    readonly ATTR_COL_GROUP_ID: "col-id";
    /** Aria expanded attribute */
    readonly ATTR_ARIA_EXPANDED: "aria-expanded";
    /** Header row for groups (typically first header row) */
    readonly HEADER_GROUP_ROW: ".ag-header-row-column-group";
    /** Header row for columns (typically second header row) */
    readonly HEADER_COLUMN_ROW: ".ag-header-row-column";
    /** Open group icon */
    readonly ICON_EXPANDED: ".ag-icon-expanded";
    /** Closed group icon */
    readonly ICON_CONTRACTED: ".ag-icon-contracted";
};
/**
 * Get the locator for a column group header
 *
 * @param gridLocator - The grid root locator
 * @param groupId - The group ID
 * @returns Locator for the column group header
 */
export declare function getColumnGroupHeader(gridLocator: Locator, groupId: string): Locator;
/**
 * Expand a column group to show all child columns
 *
 * @param gridLocator - The grid root locator
 * @param groupId - The group ID to expand
 * @param config - Normalized grid configuration
 */
export declare function expandColumnGroup(gridLocator: Locator, groupId: string, _config: NormalizedAgGridConfig): Promise<void>;
/**
 * Collapse a column group to hide child columns
 *
 * @param gridLocator - The grid root locator
 * @param groupId - The group ID to collapse
 * @param config - Normalized grid configuration
 */
export declare function collapseColumnGroup(gridLocator: Locator, groupId: string, _config: NormalizedAgGridConfig): Promise<void>;
/**
 * Toggle a column group expand/collapse state
 *
 * @param gridLocator - The grid root locator
 * @param groupId - The group ID to toggle
 * @param config - Normalized grid configuration
 */
export declare function toggleColumnGroup(gridLocator: Locator, groupId: string, _config: NormalizedAgGridConfig): Promise<void>;
/**
 * Check if a column group is expanded
 *
 * @param gridLocator - The grid root locator
 * @param groupId - The group ID to check
 * @returns True if the group is expanded
 */
export declare function isColumnGroupExpanded(gridLocator: Locator, groupId: string): Promise<boolean>;
/**
 * Get all column group states
 *
 * @param gridLocator - The grid root locator
 * @param config - Normalized grid configuration
 * @returns Array of column group states
 */
export declare function getColumnGroupStates(gridLocator: Locator, _config: NormalizedAgGridConfig): Promise<ColumnGroupState[]>;
/**
 * Get visible columns within a column group
 *
 * @param gridLocator - The grid root locator
 * @param groupId - The group ID
 * @returns Array of visible column IDs
 */
export declare function getGroupVisibleColumns(gridLocator: Locator, groupId: string): Promise<string[]>;
/**
 * Get all column groups in the grid
 *
 * @param gridLocator - The grid root locator
 * @returns Array of group IDs
 */
export declare function getAllColumnGroupIds(gridLocator: Locator): Promise<string[]>;
/**
 * Expand all column groups
 *
 * @param gridLocator - The grid root locator
 * @param config - Normalized grid configuration
 */
export declare function expandAllColumnGroups(gridLocator: Locator, _config: NormalizedAgGridConfig): Promise<void>;
/**
 * Collapse all column groups
 *
 * @param gridLocator - The grid root locator
 * @param config - Normalized grid configuration
 */
export declare function collapseAllColumnGroups(gridLocator: Locator, _config: NormalizedAgGridConfig): Promise<void>;
/**
 * Get column group display name
 *
 * @param gridLocator - The grid root locator
 * @param groupId - The group ID
 * @returns Display name of the group
 */
export declare function getColumnGroupDisplayName(gridLocator: Locator, groupId: string): Promise<string>;
/**
 * Assert column group is expanded
 *
 * @param gridLocator - The grid root locator
 * @param groupId - The group ID to check
 */
export declare function expectColumnGroupExpanded(gridLocator: Locator, groupId: string): Promise<void>;
/**
 * Assert column group is collapsed
 *
 * @param gridLocator - The grid root locator
 * @param groupId - The group ID to check
 */
export declare function expectColumnGroupCollapsed(gridLocator: Locator, groupId: string): Promise<void>;
//# sourceMappingURL=column-groups.d.ts.map