# AG Grid Helper Module Plan

**Date:** 2026-01-14
**Topic:** Comprehensive plan for a generalized AG Grid helper module in @artk/core

---

## Executive Summary

AG Grid is one of the most complex UI components to test with Playwright. Unlike standard HTML tables, AG Grid uses a virtualized, div-based DOM structure with dynamic rendering, enterprise features, and countless configuration options.

This plan outlines a **generalized, adaptable AG Grid helper module** that:
- Works with ANY AG Grid implementation (Community or Enterprise)
- Handles all edge cases (virtualization, custom renderers, grouping, pivoting)
- Auto-detects AG Grid in client projects during discovery
- Integrates seamlessly with existing ARTK prompts and workflows

---

## Part 1: AG Grid Architecture Deep Dive

### 1.1 DOM Structure Variants

AG Grid renders differently based on configuration. The helper must handle ALL variants:

**Basic Grid (Community)**
```html
<div class="ag-root-wrapper">
  <div class="ag-root ag-layout-normal">
    <div class="ag-header">
      <div class="ag-header-viewport">
        <div class="ag-header-container">
          <div class="ag-header-row">
            <div class="ag-header-cell" col-id="name">Name</div>
            <div class="ag-header-cell" col-id="status">Status</div>
          </div>
        </div>
      </div>
    </div>
    <div class="ag-body-viewport">
      <div class="ag-center-cols-viewport">
        <div class="ag-center-cols-container">
          <div class="ag-row" row-index="0" row-id="0">
            <div class="ag-cell" col-id="name">John Doe</div>
            <div class="ag-cell" col-id="status">Active</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```

**Pinned Columns (Left/Right)**
```html
<div class="ag-pinned-left-cols-container">
  <div class="ag-row"><div class="ag-cell">Pinned Left</div></div>
</div>
<div class="ag-center-cols-container">
  <div class="ag-row"><div class="ag-cell">Center</div></div>
</div>
<div class="ag-pinned-right-cols-container">
  <div class="ag-row"><div class="ag-cell">Pinned Right</div></div>
</div>
```

**Row Grouping (Enterprise)**
```html
<div class="ag-row ag-row-group" row-index="0">
  <div class="ag-cell ag-cell-expandable">
    <span class="ag-group-expanded">▼</span>
    <span class="ag-group-value">Group: USA</span>
    <span class="ag-group-child-count">(15)</span>
  </div>
</div>
<div class="ag-row ag-row-group-leaf-indent" row-index="1">
  <!-- Child row -->
</div>
```

**Tree Data (Enterprise)**
```html
<div class="ag-row" row-index="0">
  <div class="ag-cell ag-cell-expandable">
    <span class="ag-group-contracted">▶</span>
    <span class="ag-cell-value">Parent Node</span>
  </div>
</div>
```

**Master/Detail (Enterprise)**
```html
<div class="ag-row ag-row-master" row-index="0">
  <div class="ag-cell ag-cell-expandable">▼ Master Row</div>
</div>
<div class="ag-details-row" row-index="0">
  <div class="ag-details-grid">
    <!-- Nested grid -->
  </div>
</div>
```

### 1.2 Key Attributes for Locating Elements

| Attribute | Element | Purpose |
|-----------|---------|---------|
| `col-id` | Header cells, body cells | Identify column |
| `row-index` | Row divs | Position in viewport (changes on scroll!) |
| `row-id` | Row divs | Stable row identifier (if `getRowId` configured) |
| `aria-rowindex` | Row divs | Absolute row position |
| `aria-colindex` | Cells | Column position |
| `data-*` | Custom | User-defined attributes |

### 1.3 Critical Edge Cases

| Edge Case | Challenge | Solution Strategy |
|-----------|-----------|-------------------|
| **Virtualization** | Only visible rows in DOM | Scroll to row before accessing |
| **Async loading** | Data loads after render | Wait for `ag-overlay-loading-center` to disappear |
| **Custom cell renderers** | Non-standard cell content | Support custom selectors |
| **Infinite scroll** | Rows load on scroll | Handle partial data states |
| **Server-side model** | Data fetched on demand | Wait for loading states |
| **Column virtualization** | Horizontal scroll hides columns | Scroll horizontally |
| **Floating filters** | Filter inputs in header | Separate locator strategy |
| **Row selection** | Checkbox column | Handle selection state |
| **Editable cells** | Input appears on edit | Handle edit mode transitions |
| **Pinned rows** | Top/bottom pinned rows | Separate containers |
| **Full-width rows** | Rows spanning all columns | Different DOM structure |
| **Row animation** | Rows animate in/out | Wait for animation completion |

---

## Part 2: Module Architecture

### 2.1 File Structure

```
core/typescript/
├── grid/
│   ├── index.ts                 # Public exports
│   ├── types.ts                 # TypeScript interfaces
│   ├── ag-grid/
│   │   ├── index.ts             # AG Grid main export
│   │   ├── locators.ts          # Element location strategies
│   │   ├── assertions.ts        # Grid assertions
│   │   ├── actions.ts           # Grid interactions
│   │   ├── wait.ts              # Wait utilities
│   │   ├── scroll.ts            # Virtualization handling
│   │   ├── cell-renderers.ts    # Custom renderer support
│   │   └── enterprise/
│   │       ├── grouping.ts      # Row grouping helpers
│   │       ├── tree-data.ts     # Tree data helpers
│   │       ├── master-detail.ts # Master/detail helpers
│   │       └── pivot.ts         # Pivot mode helpers
│   └── __tests__/
│       ├── ag-grid.test.ts
│       ├── locators.test.ts
│       ├── assertions.test.ts
│       └── fixtures/            # Test HTML fixtures
```

### 2.2 Core Types

```typescript
// grid/types.ts

/**
 * AG Grid locator configuration
 */
export interface AgGridConfig {
  /** Grid container selector (testid, CSS, or locator) */
  selector: string;

  /** Column definitions for smart cell location */
  columns?: AgGridColumnDef[];

  /** Custom cell renderer mappings */
  cellRenderers?: Record<string, CellRendererConfig>;

  /** Row identification strategy */
  rowIdField?: string;

  /** Enterprise features enabled */
  enterprise?: {
    rowGrouping?: boolean;
    treeData?: boolean;
    masterDetail?: boolean;
    serverSide?: boolean;
  };

  /** Timeouts */
  timeouts?: {
    gridReady?: number;
    rowLoad?: number;
    cellEdit?: number;
  };
}

/**
 * Column definition for type-safe cell access
 */
export interface AgGridColumnDef {
  /** Column ID (matches col-id attribute) */
  colId: string;

  /** Human-readable name for errors */
  displayName?: string;

  /** Cell value type for smart assertions */
  type?: 'text' | 'number' | 'date' | 'boolean' | 'custom';

  /** Custom value extractor for complex cells */
  valueExtractor?: (cell: Locator) => Promise<string>;

  /** Is column pinned */
  pinned?: 'left' | 'right' | null;
}

/**
 * Custom cell renderer configuration
 */
export interface CellRendererConfig {
  /** Selector for the actual value within the cell */
  valueSelector: string;

  /** How to extract the value */
  extractValue?: (element: Locator) => Promise<string>;
}

/**
 * Row matching criteria
 */
export interface AgGridRowMatcher {
  /** Match by row index (viewport position) */
  rowIndex?: number;

  /** Match by row ID (stable identifier) */
  rowId?: string;

  /** Match by aria-rowindex (absolute position) */
  ariaRowIndex?: number;

  /** Match by cell values */
  cellValues?: Record<string, unknown>;

  /** Match by custom predicate */
  predicate?: (row: AgGridRowData) => boolean;
}

/**
 * Row data extracted from grid
 */
export interface AgGridRowData {
  rowIndex: number;
  rowId?: string;
  ariaRowIndex?: number;
  cells: Record<string, unknown>;
  isGroup?: boolean;
  isExpanded?: boolean;
  groupLevel?: number;
}

/**
 * Grid state information
 */
export interface AgGridState {
  totalRows: number;
  visibleRows: number;
  selectedRows: number;
  sortedBy?: { colId: string; direction: 'asc' | 'desc' }[];
  filteredBy?: Record<string, unknown>;
  groupedBy?: string[];
  isLoading: boolean;
}
```

### 2.3 Core API Design

```typescript
// grid/ag-grid/index.ts

import { Page, Locator } from '@playwright/test';

/**
 * AG Grid Helper - Generalized helper for any AG Grid implementation
 *
 * @example
 * ```typescript
 * import { agGrid } from '@artk/core';
 *
 * // Simple usage
 * const grid = agGrid(page, 'my-grid');
 * await grid.waitForReady();
 * await grid.expectRowCount(10);
 *
 * // With configuration
 * const grid = agGrid(page, {
 *   selector: 'orders-grid',
 *   columns: [
 *     { colId: 'orderId', type: 'text' },
 *     { colId: 'amount', type: 'number' },
 *   ],
 *   enterprise: { rowGrouping: true }
 * });
 * ```
 */
export function agGrid(page: Page, config: string | AgGridConfig): AgGridHelper {
  const normalizedConfig = typeof config === 'string'
    ? { selector: config }
    : config;

  return new AgGridHelper(page, normalizedConfig);
}

/**
 * Main AG Grid helper class
 */
export class AgGridHelper {
  constructor(
    private page: Page,
    private config: AgGridConfig
  ) {}

  // ═══════════════════════════════════════════════════════════
  // LOCATORS - Find grid elements
  // ═══════════════════════════════════════════════════════════

  /** Get the root grid container */
  getGrid(): Locator;

  /** Get a specific row by matcher */
  getRow(matcher: AgGridRowMatcher): Locator;

  /** Get all visible rows */
  getVisibleRows(): Locator;

  /** Get a specific cell */
  getCell(rowMatcher: AgGridRowMatcher, colId: string): Locator;

  /** Get header cell by column ID */
  getHeaderCell(colId: string): Locator;

  /** Get the filter input for a column (if floating filters enabled) */
  getFilterInput(colId: string): Locator;

  // ═══════════════════════════════════════════════════════════
  // WAIT UTILITIES - Handle async states
  // ═══════════════════════════════════════════════════════════

  /** Wait for grid to be fully rendered and ready */
  waitForReady(options?: { timeout?: number }): Promise<void>;

  /** Wait for loading overlay to disappear */
  waitForDataLoaded(options?: { timeout?: number }): Promise<void>;

  /** Wait for a specific row count */
  waitForRowCount(count: number, options?: { timeout?: number }): Promise<void>;

  /** Wait for row to appear (handles virtualization) */
  waitForRow(matcher: AgGridRowMatcher, options?: { timeout?: number }): Promise<Locator>;

  // ═══════════════════════════════════════════════════════════
  // ASSERTIONS - Verify grid state
  // ═══════════════════════════════════════════════════════════

  /** Assert grid has expected row count */
  expectRowCount(count: number, options?: { timeout?: number }): Promise<void>;

  /** Assert grid contains a row matching criteria */
  expectRowContains(
    cellValues: Record<string, unknown>,
    options?: { timeout?: number; exact?: boolean }
  ): Promise<void>;

  /** Assert grid does NOT contain a row matching criteria */
  expectRowNotContains(
    cellValues: Record<string, unknown>,
    options?: { timeout?: number }
  ): Promise<void>;

  /** Assert cell has expected value */
  expectCellValue(
    rowMatcher: AgGridRowMatcher,
    colId: string,
    expectedValue: unknown,
    options?: { timeout?: number; exact?: boolean }
  ): Promise<void>;

  /** Assert grid is sorted by column */
  expectSortedBy(
    colId: string,
    direction: 'asc' | 'desc',
    options?: { timeout?: number }
  ): Promise<void>;

  /** Assert grid is empty (no data rows) */
  expectEmpty(options?: { timeout?: number }): Promise<void>;

  /** Assert row is selected */
  expectRowSelected(matcher: AgGridRowMatcher): Promise<void>;

  /** Assert grid shows "no rows" overlay */
  expectNoRowsOverlay(options?: { timeout?: number }): Promise<void>;

  // ═══════════════════════════════════════════════════════════
  // ACTIONS - Interact with grid
  // ═══════════════════════════════════════════════════════════

  /** Click on a cell */
  clickCell(rowMatcher: AgGridRowMatcher, colId: string): Promise<void>;

  /** Double-click to edit a cell */
  editCell(
    rowMatcher: AgGridRowMatcher,
    colId: string,
    newValue: string
  ): Promise<void>;

  /** Sort by column (click header) */
  sortByColumn(colId: string, direction?: 'asc' | 'desc'): Promise<void>;

  /** Filter column using floating filter */
  filterColumn(colId: string, filterValue: string): Promise<void>;

  /** Clear filter for column */
  clearFilter(colId: string): Promise<void>;

  /** Clear all filters */
  clearAllFilters(): Promise<void>;

  /** Select a row (click checkbox or row) */
  selectRow(matcher: AgGridRowMatcher): Promise<void>;

  /** Deselect a row */
  deselectRow(matcher: AgGridRowMatcher): Promise<void>;

  /** Select all rows */
  selectAllRows(): Promise<void>;

  /** Deselect all rows */
  deselectAllRows(): Promise<void>;

  /** Scroll to bring row into view (handles virtualization) */
  scrollToRow(matcher: AgGridRowMatcher): Promise<void>;

  /** Scroll to bring column into view (handles column virtualization) */
  scrollToColumn(colId: string): Promise<void>;

  /** Resize column */
  resizeColumn(colId: string, width: number): Promise<void>;

  // ═══════════════════════════════════════════════════════════
  // ENTERPRISE FEATURES - Row grouping, tree data, etc.
  // ═══════════════════════════════════════════════════════════

  /** Expand a group row */
  expandGroup(matcher: AgGridRowMatcher): Promise<void>;

  /** Collapse a group row */
  collapseGroup(matcher: AgGridRowMatcher): Promise<void>;

  /** Expand all groups */
  expandAllGroups(): Promise<void>;

  /** Collapse all groups */
  collapseAllGroups(): Promise<void>;

  /** Get group children count */
  getGroupChildCount(matcher: AgGridRowMatcher): Promise<number>;

  /** Expand master row to show detail */
  expandMasterRow(matcher: AgGridRowMatcher): Promise<void>;

  /** Get detail grid for master row */
  getDetailGrid(masterRowMatcher: AgGridRowMatcher): AgGridHelper;

  // ═══════════════════════════════════════════════════════════
  // DATA EXTRACTION - Get data from grid
  // ═══════════════════════════════════════════════════════════

  /** Get cell value */
  getCellValue(rowMatcher: AgGridRowMatcher, colId: string): Promise<unknown>;

  /** Get all cell values for a row */
  getRowData(matcher: AgGridRowMatcher): Promise<AgGridRowData>;

  /** Get all visible row data */
  getAllVisibleRowData(): Promise<AgGridRowData[]>;

  /** Get current grid state */
  getGridState(): Promise<AgGridState>;

  /** Get selected row IDs */
  getSelectedRowIds(): Promise<string[]>;
}
```

### 2.4 Smart Locator Strategy

```typescript
// grid/ag-grid/locators.ts

/**
 * Multi-strategy locator that handles all AG Grid variants
 */
export class AgGridLocatorStrategy {

  /**
   * Find grid container using multiple strategies
   */
  static findGrid(page: Page, selector: string): Locator {
    // Strategy 1: data-testid
    if (!selector.includes('[') && !selector.includes('.')) {
      const byTestId = page.getByTestId(selector);
      // Wrap in ag-root-wrapper check
      return byTestId.locator('.ag-root-wrapper').or(
        byTestId.filter({ has: page.locator('.ag-root-wrapper') })
      ).or(byTestId);
    }

    // Strategy 2: CSS selector
    const byCss = page.locator(selector);
    return byCss.locator('.ag-root-wrapper').or(byCss);
  }

  /**
   * Find row handling all container types (pinned, center)
   */
  static findRow(
    grid: Locator,
    matcher: AgGridRowMatcher
  ): Locator {
    // Build row selector based on matcher
    let rowSelector = '.ag-row';

    if (matcher.rowIndex !== undefined) {
      rowSelector += `[row-index="${matcher.rowIndex}"]`;
    }

    if (matcher.rowId !== undefined) {
      rowSelector += `[row-id="${matcher.rowId}"]`;
    }

    if (matcher.ariaRowIndex !== undefined) {
      rowSelector += `[aria-rowindex="${matcher.ariaRowIndex}"]`;
    }

    // Search in ALL row containers (pinned left, center, pinned right)
    const containers = [
      '.ag-pinned-left-cols-container',
      '.ag-center-cols-container',
      '.ag-pinned-right-cols-container',
      '.ag-body-viewport' // Fallback
    ];

    // Return first match across containers
    return grid.locator(containers.map(c => `${c} ${rowSelector}`).join(', ')).first();
  }

  /**
   * Find cell handling pinned columns
   */
  static findCell(
    grid: Locator,
    rowMatcher: AgGridRowMatcher,
    colId: string,
    columnDef?: AgGridColumnDef
  ): Locator {
    const row = this.findRow(grid, rowMatcher);

    // Determine which container based on pinned status
    if (columnDef?.pinned === 'left') {
      return grid.locator('.ag-pinned-left-cols-container')
        .locator(`.ag-row[row-index="${rowMatcher.rowIndex}"]`)
        .locator(`.ag-cell[col-id="${colId}"]`);
    }

    if (columnDef?.pinned === 'right') {
      return grid.locator('.ag-pinned-right-cols-container')
        .locator(`.ag-row[row-index="${rowMatcher.rowIndex}"]`)
        .locator(`.ag-cell[col-id="${colId}"]`);
    }

    // Default: search all containers
    return row.locator(`.ag-cell[col-id="${colId}"]`);
  }
}
```

### 2.5 Virtualization Handler

```typescript
// grid/ag-grid/scroll.ts

/**
 * Handles AG Grid virtualization - scrolling to bring rows/columns into view
 */
export class AgGridScrollHandler {

  /**
   * Scroll to row by absolute index (aria-rowindex)
   *
   * AG Grid only renders visible rows. This method scrolls the viewport
   * until the target row is rendered in the DOM.
   */
  static async scrollToRow(
    grid: Locator,
    targetRowIndex: number,
    options: { timeout?: number; maxAttempts?: number } = {}
  ): Promise<Locator> {
    const { timeout = 10000, maxAttempts = 50 } = options;
    const startTime = Date.now();

    const viewport = grid.locator('.ag-body-viewport');
    let attempts = 0;

    while (Date.now() - startTime < timeout && attempts < maxAttempts) {
      // Check if row is already visible
      const row = grid.locator(`.ag-row[aria-rowindex="${targetRowIndex}"]`);
      if (await row.count() > 0) {
        return row;
      }

      // Get current scroll position and visible rows
      const visibleRows = await grid.locator('.ag-row').all();
      if (visibleRows.length === 0) {
        throw new Error('No rows visible in grid');
      }

      const firstVisibleIndex = await this.getRowAriaIndex(visibleRows[0]);
      const lastVisibleIndex = await this.getRowAriaIndex(visibleRows[visibleRows.length - 1]);

      // Determine scroll direction
      if (targetRowIndex < firstVisibleIndex) {
        // Scroll up
        await viewport.evaluate((el) => {
          el.scrollTop = Math.max(0, el.scrollTop - el.clientHeight);
        });
      } else if (targetRowIndex > lastVisibleIndex) {
        // Scroll down
        await viewport.evaluate((el) => {
          el.scrollTop += el.clientHeight;
        });
      }

      // Wait for render
      await grid.page().waitForTimeout(50);
      attempts++;
    }

    throw new Error(
      `Could not scroll to row ${targetRowIndex} after ${attempts} attempts`
    );
  }

  /**
   * Scroll to column by col-id
   */
  static async scrollToColumn(
    grid: Locator,
    colId: string,
    options: { timeout?: number } = {}
  ): Promise<Locator> {
    const { timeout = 5000 } = options;
    const startTime = Date.now();

    const viewport = grid.locator('.ag-center-cols-viewport');

    while (Date.now() - startTime < timeout) {
      // Check if column is visible
      const cell = grid.locator(`.ag-header-cell[col-id="${colId}"]`);
      if (await cell.count() > 0) {
        return cell;
      }

      // Scroll right
      await viewport.evaluate((el) => {
        el.scrollLeft += el.clientWidth / 2;
      });

      await grid.page().waitForTimeout(50);
    }

    throw new Error(`Could not scroll to column ${colId}`);
  }

  private static async getRowAriaIndex(row: Locator): Promise<number> {
    const attr = await row.getAttribute('aria-rowindex');
    return parseInt(attr || '0', 10);
  }
}
```

### 2.6 Custom Cell Renderer Support

```typescript
// grid/ag-grid/cell-renderers.ts

/**
 * Handles custom cell renderers - extracting values from complex cells
 */
export class AgGridCellRendererHandler {

  /** Built-in renderer extractors */
  private static builtInRenderers: Record<string, CellRendererConfig> = {
    // Checkbox renderer
    'agCheckboxCellRenderer': {
      valueSelector: 'input[type="checkbox"]',
      extractValue: async (el) => {
        const checked = await el.isChecked();
        return String(checked);
      }
    },

    // Link renderer (common pattern)
    'linkRenderer': {
      valueSelector: 'a',
      extractValue: async (el) => await el.textContent() || ''
    },

    // Badge/tag renderer (common pattern)
    'badgeRenderer': {
      valueSelector: '.badge, .tag, .ant-tag, [class*="badge"], [class*="tag"]',
      extractValue: async (el) => await el.textContent() || ''
    },

    // Button renderer
    'buttonRenderer': {
      valueSelector: 'button',
      extractValue: async (el) => await el.textContent() || ''
    },

    // Icon + text renderer
    'iconTextRenderer': {
      valueSelector: 'span:not([class*="icon"])',
      extractValue: async (el) => await el.textContent() || ''
    }
  };

  /**
   * Extract value from cell, handling custom renderers
   */
  static async extractCellValue(
    cell: Locator,
    customRenderers?: Record<string, CellRendererConfig>
  ): Promise<string> {
    const allRenderers = { ...this.builtInRenderers, ...customRenderers };

    // Try each renderer
    for (const [name, config] of Object.entries(allRenderers)) {
      const element = cell.locator(config.valueSelector);
      if (await element.count() > 0) {
        if (config.extractValue) {
          return await config.extractValue(element.first());
        }
        return await element.first().textContent() || '';
      }
    }

    // Default: get cell text content
    return await cell.textContent() || '';
  }
}
```

---

## Part 3: Detection Integration

### 3.1 AG Grid Detection in Discovery

Add AG Grid detection to the existing detection module:

```typescript
// detection/signals.ts - ADD to existing signals

export const AG_GRID_SIGNALS: Signal[] = [
  // npm dependencies
  {
    type: 'dependency',
    pattern: 'ag-grid-community',
    weight: 50,
    metadata: { gridType: 'ag-grid', edition: 'community' }
  },
  {
    type: 'dependency',
    pattern: 'ag-grid-enterprise',
    weight: 50,
    metadata: { gridType: 'ag-grid', edition: 'enterprise' }
  },
  {
    type: 'dependency',
    pattern: 'ag-grid-react',
    weight: 30,
    metadata: { gridType: 'ag-grid', framework: 'react' }
  },
  {
    type: 'dependency',
    pattern: 'ag-grid-angular',
    weight: 30,
    metadata: { gridType: 'ag-grid', framework: 'angular' }
  },
  {
    type: 'dependency',
    pattern: 'ag-grid-vue',
    weight: 30,
    metadata: { gridType: 'ag-grid', framework: 'vue' }
  },

  // Import patterns in source
  {
    type: 'import',
    pattern: /from ['"]ag-grid/,
    weight: 40,
    metadata: { gridType: 'ag-grid' }
  },
  {
    type: 'import',
    pattern: /from ['"]@ag-grid/,
    weight: 40,
    metadata: { gridType: 'ag-grid' }
  },

  // Component usage patterns
  {
    type: 'jsx',
    pattern: /<AgGridReact/,
    weight: 60,
    metadata: { gridType: 'ag-grid', framework: 'react' }
  },
  {
    type: 'template',
    pattern: /<ag-grid-angular/,
    weight: 60,
    metadata: { gridType: 'ag-grid', framework: 'angular' }
  },
];
```

### 3.2 Context Storage

Store detected grid information in context:

```typescript
// types/context.ts - ADD to ArtkContext

export interface ArtkContext {
  // ... existing fields ...

  /** Detected UI component libraries */
  uiComponents?: {
    /** Data grid components detected */
    grids?: {
      type: 'ag-grid' | 'react-table' | 'tanstack-table' | 'mui-datagrid' | 'other';
      edition?: 'community' | 'enterprise';
      framework?: 'react' | 'angular' | 'vue' | 'vanilla';
      version?: string;
      locations?: string[]; // Files where grid is used
    }[];

    // Future: other component types
    forms?: unknown;
    charts?: unknown;
  };
}
```

### 3.3 Discovery Output

Update discover-foundation to report grid detection:

```yaml
# In discovery output (artk-e2e/docs/foundation/discovery-report.md)

## UI Components Detected

### Data Grids

| Type | Edition | Framework | Files |
|------|---------|-----------|-------|
| AG Grid | Enterprise | React | `src/components/OrdersTable.tsx`, `src/pages/Admin/UsersGrid.tsx` |

**Recommended:** Import `agGrid` helper from `@artk/core` for grid assertions:

```typescript
import { agGrid } from '@artk/core';

const grid = agGrid(page, 'orders-grid');
await grid.waitForReady();
await grid.expectRowContains({ orderId: '12345', status: 'Active' });
```
```

---

## Part 4: Prompt Integration

### 4.1 Update discover-foundation Prompt

Add grid detection to the discovery output:

```markdown
<!-- In prompts/artk.discover-foundation.md - ADD to discovery output section -->

### UI Components Analysis

If data grids are detected (AG Grid, React Table, etc.), document:

1. **Grid library and version** from package.json
2. **Files using grids** (search for import statements)
3. **Grid features used** (enterprise features, custom renderers)
4. **Recommended helper module** for testing

Output in discovery report:

```markdown
## Data Grids

**Detected:** AG Grid Enterprise 33.x (React)

**Usage locations:**
- `src/components/OrdersTable.tsx` - Order management grid
- `src/pages/Admin/UsersGrid.tsx` - User administration
- `src/features/inventory/ProductGrid.tsx` - Product catalog

**Enterprise features detected:**
- Row grouping (UsersGrid)
- Master/detail (OrdersTable)
- Server-side row model (ProductGrid)

**Testing recommendation:**
Use `@artk/core` AG Grid helper for reliable grid testing:

\`\`\`typescript
import { agGrid } from '@artk/core';
\`\`\`
```
```

### 4.2 Update journey-implement Prompt

Add grid helper usage guidance:

```markdown
<!-- In prompts/artk.journey-implement.md - ADD to implementation patterns section -->

### Data Grid Testing Patterns

If the journey involves AG Grid interactions, use the `agGrid` helper:

**DO:**
```typescript
import { agGrid } from '@artk/core';

test('verify order appears in grid', async ({ page }) => {
  const grid = agGrid(page, 'orders-grid');

  // Wait for grid to load
  await grid.waitForReady();

  // Assert row exists
  await grid.expectRowContains({
    orderId: '12345',
    customerName: 'John Doe',
    status: 'Pending'
  });
});
```

**DON'T:**
```typescript
// ❌ Brittle - AG Grid uses div, not table
await expect(page.locator('table')).toContainText('12345');

// ❌ Fragile - row-index changes on scroll
await page.click('.ag-row[row-index="0"]');

// ❌ Missing wait - grid may not be ready
const cell = page.locator('.ag-cell');
```

**Grid Action Patterns:**
```typescript
// Sort by column
await grid.sortByColumn('createdAt', 'desc');

// Filter
await grid.filterColumn('status', 'Active');

// Click cell (handles virtualization)
await grid.clickCell({ cellValues: { orderId: '12345' } }, 'actions');

// Edit cell
await grid.editCell({ rowIndex: 0 }, 'quantity', '10');
```
```

### 4.3 Foundation Module Template

When AG Grid is detected, scaffold a grid helper module:

```typescript
// Template: src/modules/foundation/grid/index.ts

/**
 * Grid Helper Module
 *
 * Pre-configured AG Grid helper for this project.
 * Auto-generated by /artk.discover-foundation
 */

import { agGrid, AgGridConfig } from '@artk/core';
import { Page } from '@playwright/test';

/**
 * Grid configurations for this project
 */
export const GRID_CONFIGS = {
  orders: {
    selector: 'orders-grid',
    columns: [
      { colId: 'orderId', type: 'text' },
      { colId: 'customerName', type: 'text' },
      { colId: 'status', type: 'text' },
      { colId: 'amount', type: 'number' },
      { colId: 'createdAt', type: 'date' },
    ],
    enterprise: {
      masterDetail: true,
    }
  },

  users: {
    selector: 'users-grid',
    columns: [
      { colId: 'username', type: 'text' },
      { colId: 'email', type: 'text' },
      { colId: 'role', type: 'text' },
      { colId: 'active', type: 'boolean' },
    ],
    enterprise: {
      rowGrouping: true,
    }
  },
} as const satisfies Record<string, AgGridConfig>;

/**
 * Get pre-configured grid helper
 */
export function getGrid(page: Page, gridName: keyof typeof GRID_CONFIGS) {
  return agGrid(page, GRID_CONFIGS[gridName]);
}

/**
 * Common grid assertions for this project
 */
export const gridAssertions = {
  async expectOrderInGrid(page: Page, orderId: string) {
    const grid = getGrid(page, 'orders');
    await grid.waitForReady();
    await grid.expectRowContains({ orderId });
  },

  async expectUserInGrid(page: Page, email: string) {
    const grid = getGrid(page, 'users');
    await grid.waitForReady();
    await grid.expectRowContains({ email });
  },
};
```

---

## Part 5: Implementation Plan

### Phase 1: Core Module (Week 1)

| Task | Description | Priority |
|------|-------------|----------|
| T1.1 | Create `grid/types.ts` with all interfaces | High |
| T1.2 | Implement `grid/ag-grid/locators.ts` | High |
| T1.3 | Implement `grid/ag-grid/wait.ts` | High |
| T1.4 | Implement `grid/ag-grid/scroll.ts` (virtualization) | High |
| T1.5 | Implement basic assertions in `grid/ag-grid/assertions.ts` | High |
| T1.6 | Implement basic actions in `grid/ag-grid/actions.ts` | High |
| T1.7 | Create `grid/ag-grid/index.ts` main export | High |
| T1.8 | Export from `grid/index.ts` and main `index.ts` | High |

### Phase 2: Enterprise Features (Week 2)

| Task | Description | Priority |
|------|-------------|----------|
| T2.1 | Implement `enterprise/grouping.ts` | Medium |
| T2.2 | Implement `enterprise/tree-data.ts` | Medium |
| T2.3 | Implement `enterprise/master-detail.ts` | Medium |
| T2.4 | Add enterprise feature detection | Medium |
| T2.5 | Add tests for enterprise features | Medium |

### Phase 3: Custom Renderers & Edge Cases (Week 2)

| Task | Description | Priority |
|------|-------------|----------|
| T3.1 | Implement `cell-renderers.ts` with built-in extractors | Medium |
| T3.2 | Add configurable renderer support | Medium |
| T3.3 | Handle pinned columns correctly | Medium |
| T3.4 | Handle pinned rows (top/bottom) | Low |
| T3.5 | Handle full-width rows | Low |

### Phase 4: Detection Integration (Week 3)

| Task | Description | Priority |
|------|-------------|----------|
| T4.1 | Add AG Grid signals to detection module | High |
| T4.2 | Update ArtkContext type with grid info | High |
| T4.3 | Update discover-foundation prompt | High |
| T4.4 | Create foundation grid module template | Medium |

### Phase 5: Testing & Documentation (Week 3)

| Task | Description | Priority |
|------|-------------|----------|
| T5.1 | Create comprehensive test suite | High |
| T5.2 | Create test fixtures (mock AG Grid HTML) | High |
| T5.3 | Update journey-implement prompt | Medium |
| T5.4 | Write API documentation | Medium |
| T5.5 | Add examples to README | Low |

---

## Part 6: Test Strategy

### 6.1 Test Fixtures

Create realistic AG Grid HTML fixtures for testing:

```typescript
// grid/__tests__/fixtures/basic-grid.html
// grid/__tests__/fixtures/grouped-grid.html
// grid/__tests__/fixtures/master-detail-grid.html
// grid/__tests__/fixtures/virtualized-grid.html
// grid/__tests__/fixtures/pinned-columns-grid.html
```

### 6.2 Test Categories

| Category | Tests | Coverage |
|----------|-------|----------|
| Locators | Find grid, rows, cells, headers | 100% of selectors |
| Assertions | Row count, contains, cell value, sorted, empty | All assertion methods |
| Actions | Click, edit, sort, filter, select | All action methods |
| Wait | Grid ready, data loaded, row appears | All wait methods |
| Scroll | Scroll to row, scroll to column | Virtualization handling |
| Enterprise | Grouping, tree, master-detail | Enterprise features |
| Edge cases | Empty grid, loading state, errors | Error handling |

### 6.3 Integration Tests

Test against real AG Grid instances:

```typescript
// grid/__tests__/integration/ag-grid-real.test.ts

import { test, expect } from '@playwright/test';
import { agGrid } from '../../ag-grid';

test.describe('AG Grid Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Use AG Grid official demo page for integration tests
    await page.goto('https://www.ag-grid.com/example/');
  });

  test('should find and interact with real AG Grid', async ({ page }) => {
    const grid = agGrid(page, '.ag-root-wrapper');
    await grid.waitForReady();

    // Verify rows exist
    const rowCount = await grid.getVisibleRows().count();
    expect(rowCount).toBeGreaterThan(0);
  });
});
```

---

## Part 7: Future Extensibility

### 7.1 Other Grid Libraries

The architecture supports adding other grid libraries:

```typescript
// grid/index.ts

export { agGrid, AgGridHelper } from './ag-grid';

// Future additions:
// export { reactTable, ReactTableHelper } from './react-table';
// export { muiDataGrid, MuiDataGridHelper } from './mui-datagrid';
// export { tanstackTable, TanstackTableHelper } from './tanstack-table';
```

### 7.2 Generic Grid Interface

```typescript
// grid/types.ts

/**
 * Generic grid helper interface - all grid helpers implement this
 */
export interface GridHelper<TConfig = unknown> {
  getGrid(): Locator;
  getRow(matcher: RowMatcher): Locator;
  getCell(rowMatcher: RowMatcher, colId: string): Locator;

  waitForReady(options?: WaitOptions): Promise<void>;
  waitForDataLoaded(options?: WaitOptions): Promise<void>;

  expectRowCount(count: number, options?: AssertOptions): Promise<void>;
  expectRowContains(values: Record<string, unknown>, options?: AssertOptions): Promise<void>;

  clickCell(rowMatcher: RowMatcher, colId: string): Promise<void>;
  sortByColumn(colId: string, direction?: SortDirection): Promise<void>;
}
```

---

## Part 8: Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| AG Grid DOM changes between versions | High | Version-specific locator strategies |
| Enterprise features vary by license | Medium | Feature detection, graceful fallback |
| Virtualization edge cases | Medium | Thorough scroll handling, timeouts |
| Custom renderers break value extraction | Medium | Configurable extractors, fallback to textContent |
| Performance with large grids | Low | Efficient scrolling, pagination support |

---

## Summary

This plan provides a **comprehensive, production-ready AG Grid helper module** that:

1. **Works with any AG Grid** - Community or Enterprise, any framework
2. **Handles all edge cases** - Virtualization, custom renderers, enterprise features
3. **Integrates seamlessly** - Detection, discovery, journey implementation
4. **Is extensible** - Architecture supports adding other grid libraries
5. **Is well-tested** - Comprehensive test strategy with fixtures

**Estimated effort:** 2-3 weeks for full implementation

**Next step:** Review and approve plan, then proceed with Phase 1 implementation.
