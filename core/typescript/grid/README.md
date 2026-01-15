# AG Grid Helper Module

Comprehensive helpers for testing AG Grid components with Playwright. Handles virtualization, enterprise features, custom cell renderers, and provides robust assertions with actionable error messages.

## Quick Start

```typescript
import { agGrid } from '@artk/core/grid';

test('verify order grid', async ({ page }) => {
  const grid = agGrid(page, 'orders-grid');
  await grid.waitForReady();
  await grid.expectRowCount(10);
  await grid.expectRowContains({ orderId: '12345', status: 'Active' });
});
```

## Installation

The grid module is included in `@artk/core`. Import directly:

```typescript
import { agGrid } from '@artk/core/grid';
```

## API Reference

### Factory Function

#### `agGrid(page, gridIdOrConfig)`

Creates an AG Grid helper instance.

```typescript
// With grid ID
const grid = agGrid(page, 'my-grid');

// With full configuration
const grid = agGrid(page, {
  gridId: 'my-grid',
  selector: '.custom-selector',
  columns: [
    { colId: 'name', type: 'text' },
    { colId: 'amount', type: 'number' },
  ],
});
```

### Wait Utilities

```typescript
// Wait for grid to be ready
await grid.waitForReady();

// Wait for data to load
await grid.waitForDataLoaded();

// Wait for specific row count
await grid.waitForRowCount(10);

// Wait for specific row to appear
await grid.waitForRow({ ariaRowIndex: 5 });
```

### Assertions

```typescript
// Assert row count
await grid.expectRowCount(10);
await grid.expectRowCount(10, { comparator: 'gte' });

// Assert row contains values
await grid.expectRowContains({ orderId: '12345', status: 'Active' });

// Assert row does not contain values
await grid.expectRowNotContains({ status: 'Deleted' });

// Assert cell value
await grid.expectCellValue({ ariaRowIndex: 1 }, 'status', 'Active');

// Assert sorted by column
await grid.expectSortedBy('name', 'asc');

// Assert grid is empty
await grid.expectEmpty();

// Assert row is selected
await grid.expectRowSelected({ ariaRowIndex: 1 });

// Assert no-rows overlay is visible
await grid.expectNoRowsOverlay();
```

### Actions

```typescript
// Click a cell
await grid.clickCell({ ariaRowIndex: 1 }, 'name');

// Edit a cell
await grid.editCell({ ariaRowIndex: 1 }, 'name', 'New Value');

// Sort by column
await grid.sortByColumn('name', 'asc');

// Filter column
await grid.filterColumn('name', 'John');
await grid.clearFilter('name');
await grid.clearAllFilters();

// Row selection
await grid.selectRow({ ariaRowIndex: 1 });
await grid.deselectRow({ ariaRowIndex: 1 });
await grid.selectAllRows();
await grid.deselectAllRows();

// Scrolling
await grid.scrollToRow({ ariaRowIndex: 100 });
await grid.scrollToColumn('email');
```

### Enterprise Features

```typescript
// Row Grouping
await grid.expandGroup({ ariaRowIndex: 1 });
await grid.collapseGroup({ ariaRowIndex: 1 });
await grid.expandAllGroups();
await grid.collapseAllGroups();
const childCount = await grid.getGroupChildCount({ ariaRowIndex: 1 });

// Master/Detail
await grid.expandMasterRow({ ariaRowIndex: 1 });
const detailGrid = grid.getDetailGrid({ ariaRowIndex: 1 });
await detailGrid.expectRowCount(5);
```

### Data Extraction

```typescript
// Get cell value
const value = await grid.getCellValue({ ariaRowIndex: 1 }, 'name');

// Get row data
const rowData = await grid.getRowData({ ariaRowIndex: 1 });

// Get all visible row data
const allData = await grid.getAllVisibleRowData();

// Get grid state
const state = await grid.getGridState();

// Get selected row IDs
const selectedIds = await grid.getSelectedRowIds();
```

### Locators

```typescript
// Get grid locator
const gridLocator = grid.getGrid();

// Get row locator
const rowLocator = grid.getRow({ ariaRowIndex: 1 });

// Get visible rows
const visibleRows = grid.getVisibleRows();

// Get cell locator
const cellLocator = grid.getCell({ ariaRowIndex: 1 }, 'name');

// Get header cell locator
const headerLocator = grid.getHeaderCell('name');

// Get filter input locator
const filterLocator = grid.getFilterInput('name');
```

## Row Matching

Rows can be matched using different strategies:

```typescript
// By aria-rowindex (1-based, best for virtualized grids)
{ ariaRowIndex: 1 }

// By row-id attribute
{ rowId: 'row-123' }

// By row-index (0-based viewport index)
{ rowIndex: 0 }
```

## Configuration Options

```typescript
interface AgGridConfig {
  // Grid identifier (id attribute)
  gridId?: string;

  // Custom CSS selector for the grid
  selector?: string;

  // Column definitions
  columns?: AgGridColumnDef[];

  // Enterprise feature configuration
  enterprise?: {
    rowGrouping?: boolean;
    treeData?: boolean;
    masterDetail?: boolean;
  };

  // Timeout configuration
  timeouts?: {
    ready?: number;     // Grid ready timeout (default: 10000)
    data?: number;      // Data load timeout (default: 30000)
    scroll?: number;    // Scroll operation timeout (default: 100)
    assertion?: number; // Assertion timeout (default: 5000)
  };
}
```

## Handling Virtualization

AG Grid virtualizes large datasets by only rendering visible rows. The helper handles this automatically:

```typescript
// Scroll to a specific row before interacting
await grid.scrollToRow({ ariaRowIndex: 500 });
const rowData = await grid.getRowData({ ariaRowIndex: 500 });

// For enterprise grids with grouping
await grid.expandGroup({ ariaRowIndex: 1 });
await grid.scrollToRow({ ariaRowIndex: 100 });
```

## Custom Cell Renderers

Configure how cell values are extracted from custom renderers:

```typescript
const grid = agGrid(page, {
  gridId: 'orders-grid',
  columns: [
    {
      colId: 'status',
      type: 'badge',
      cellRenderer: {
        valueSelector: '.badge-text',
        extractValue: (cell) => cell.textContent?.trim(),
      },
    },
    {
      colId: 'actions',
      type: 'custom',
      cellRenderer: {
        valueSelector: 'button[data-action]',
        extractValue: (cell) => cell.getAttribute('data-action'),
      },
    },
  ],
});
```

## Error Messages

The helper provides actionable error messages:

```
Expected grid to have 10 rows but found 5 rows.
  Grid selector: [data-grid-id="orders-grid"]
  Current state: { rowCount: 5, isLoading: false, hasOverlay: false }
```

## Best Practices

1. **Always wait for ready**: Call `waitForReady()` before any interactions.

2. **Use aria-rowindex for virtualized grids**: The `ariaRowIndex` is stable across scroll operations.

3. **Handle loading states**: Use `waitForDataLoaded()` after filter/sort operations.

4. **Prefer assertions over manual checks**: Use `expectRowCount()` instead of `getVisibleRows().count()`.

5. **Configure timeouts appropriately**: Increase timeouts for slow data sources.

## Testing

Run the grid module tests:

```bash
cd core/typescript
npm test -- grid
```

## License

MIT
