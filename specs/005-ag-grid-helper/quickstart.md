# Quickstart: AG Grid Helper Module

**Date**: 2026-01-14
**Spec**: [spec.md](./spec.md)

---

## Installation

The AG Grid helper is included in `@artk/core`. No additional installation required.

```typescript
import { agGrid } from '@artk/core';
```

---

## Basic Usage

### Simple Grid Assertions

```typescript
import { test, expect } from '@playwright/test';
import { agGrid } from '@artk/core';

test('verify order appears in grid', async ({ page }) => {
  await page.goto('/orders');

  // Create grid helper (uses data-testid by default)
  const grid = agGrid(page, 'orders-grid');

  // Wait for grid to load
  await grid.waitForReady();

  // Assert row count
  await grid.expectRowCount(10);

  // Assert specific row exists
  await grid.expectRowContains({
    orderId: '12345',
    status: 'Active',
  });
});
```

### Grid Interactions

```typescript
test('sort and filter orders', async ({ page }) => {
  const grid = agGrid(page, 'orders-grid');
  await grid.waitForReady();

  // Sort by date descending
  await grid.sortByColumn('createdAt', 'desc');

  // Filter by status
  await grid.filterColumn('status', 'Pending');

  // Verify filtered results
  await grid.expectRowCount(5);

  // Clear filter
  await grid.clearFilter('status');
});
```

### Cell Editing

```typescript
test('edit order quantity', async ({ page }) => {
  const grid = agGrid(page, 'orders-grid');
  await grid.waitForReady();

  // Edit cell by row values
  await grid.editCell(
    { cellValues: { orderId: '12345' } },
    'quantity',
    '100'
  );

  // Verify update
  await grid.expectCellValue(
    { cellValues: { orderId: '12345' } },
    'quantity',
    '100'
  );
});
```

---

## Advanced Configuration

### Column Definitions

```typescript
const grid = agGrid(page, {
  selector: 'orders-grid',
  columns: [
    { colId: 'orderId', type: 'text', displayName: 'Order ID' },
    { colId: 'amount', type: 'number', displayName: 'Amount' },
    { colId: 'createdAt', type: 'date', displayName: 'Created' },
    { colId: 'active', type: 'boolean', displayName: 'Active' },
    { colId: 'actions', pinned: 'right', displayName: 'Actions' },
  ],
});
```

### Custom Cell Renderers

```typescript
const grid = agGrid(page, {
  selector: 'orders-grid',
  cellRenderers: {
    // Extract value from badge component
    status: {
      valueSelector: '.status-badge',
      extractValue: async (el) => await el.textContent() || '',
    },
    // Handle checkbox cells
    selected: {
      valueSelector: 'input[type="checkbox"]',
      extractValue: async (el) => String(await el.isChecked()),
    },
  },
});
```

### Custom Timeouts

```typescript
const grid = agGrid(page, {
  selector: 'slow-loading-grid',
  timeouts: {
    gridReady: 60000,  // 60s for initial load
    rowLoad: 30000,    // 30s for row scroll
    cellEdit: 10000,   // 10s for edit mode
  },
});
```

---

## Working with Large Datasets (Virtualization)

The helper automatically handles virtualized grids:

```typescript
test('find row in large dataset', async ({ page }) => {
  const grid = agGrid(page, 'large-grid');
  await grid.waitForReady();

  // Helper automatically scrolls to find row
  await grid.expectRowContains({
    id: 'row-5000',  // Row not initially visible
    name: 'Test Item',
  });

  // Or explicitly scroll to row
  await grid.scrollToRow({ ariaRowIndex: 5000 });
  const row = grid.getRow({ ariaRowIndex: 5000 });
  await expect(row).toBeVisible();
});
```

---

## Enterprise Features

### Row Grouping

```typescript
const grid = agGrid(page, {
  selector: 'grouped-grid',
  enterprise: { rowGrouping: true },
});

test('expand and collapse groups', async ({ page }) => {
  await grid.waitForReady();

  // Expand group
  await grid.expandGroup({ cellValues: { country: 'USA' } });

  // Assert children visible
  await grid.expectRowContains({ state: 'California' });

  // Get child count
  const count = await grid.getGroupChildCount({ cellValues: { country: 'USA' } });
  expect(count).toBe(50);

  // Collapse group
  await grid.collapseGroup({ cellValues: { country: 'USA' } });
});
```

### Tree Data

```typescript
const grid = agGrid(page, {
  selector: 'tree-grid',
  enterprise: { treeData: true },
});

test('navigate tree structure', async ({ page }) => {
  await grid.waitForReady();

  // Expand parent node
  await grid.expandGroup({ cellValues: { name: 'Parent Folder' } });

  // Assert child visible
  await grid.expectRowContains({ name: 'Child Document' });
});
```

### Master-Detail

```typescript
const grid = agGrid(page, {
  selector: 'master-grid',
  enterprise: { masterDetail: true },
});

test('access detail grid', async ({ page }) => {
  await grid.waitForReady();

  // Expand master row
  await grid.expandMasterRow({ cellValues: { orderId: '12345' } });

  // Get detail grid helper
  const detailGrid = await grid.getDetailGrid({ cellValues: { orderId: '12345' } });

  // Assert detail grid content
  await detailGrid.expectRowCount(3);
  await detailGrid.expectRowContains({ lineItem: 'Widget A' });
});
```

---

## Row Selection

```typescript
test('select multiple rows', async ({ page }) => {
  const grid = agGrid(page, 'selectable-grid');
  await grid.waitForReady();

  // Select individual rows
  await grid.selectRow({ cellValues: { id: '001' } });
  await grid.selectRow({ cellValues: { id: '002' } });

  // Assert selection
  await grid.expectRowSelected({ cellValues: { id: '001' } });
  const selectedIds = await grid.getSelectedRowIds();
  expect(selectedIds).toEqual(['001', '002']);

  // Select all
  await grid.selectAllRows();

  // Deselect all
  await grid.deselectAllRows();
});
```

---

## Data Extraction

```typescript
test('extract grid data for validation', async ({ page }) => {
  const grid = agGrid(page, 'data-grid');
  await grid.waitForReady();

  // Get single cell value
  const amount = await grid.getCellValue({ rowIndex: 0 }, 'amount');
  expect(amount).toBe('$100.00');

  // Get full row data
  const row = await grid.getRowData({ cellValues: { id: '001' } });
  expect(row.cells).toMatchObject({
    id: '001',
    name: 'Test Item',
    amount: '$100.00',
  });

  // Get all visible rows
  const allRows = await grid.getAllVisibleRowData();
  expect(allRows.length).toBe(20);

  // Get grid state
  const state = await grid.getGridState();
  expect(state.totalRows).toBe(1000);
  expect(state.isLoading).toBe(false);
});
```

---

## Error Messages

The helper provides actionable error messages:

```text
❌ Grid "orders-grid" does not contain a row matching:
   Expected: { orderId: "12345", status: "Active" }

   Visible rows checked: 20
   Closest match: { orderId: "12345", status: "Pending" }

   Tip: If the row exists but isn't visible, it may require scrolling.
   The helper automatically scrolls for you - check if the data exists.
```

---

## Best Practices

1. **Always wait for grid ready** before assertions:
   ```typescript
   await grid.waitForReady();
   ```

2. **Use cell values for stable row matching** instead of indexes:
   ```typescript
   // Good - survives sorting/filtering
   await grid.clickCell({ cellValues: { id: '123' } }, 'actions');

   // Avoid - breaks if order changes
   await grid.clickCell({ rowIndex: 0 }, 'actions');
   ```

3. **Configure columns for better error messages**:
   ```typescript
   const grid = agGrid(page, {
     selector: 'grid',
     columns: [
       { colId: 'id', displayName: 'Customer ID' },
     ],
   });
   ```

4. **Use timeouts for slow-loading data**:
   ```typescript
   await grid.waitForReady({ timeout: 60000 });
   ```

---

*For full API reference, see [contracts/types.ts](./contracts/types.ts)*
