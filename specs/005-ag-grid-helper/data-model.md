# Data Model: AG Grid Helper Module

**Date**: 2026-01-14
**Spec**: [spec.md](./spec.md)
**Plan**: [plan.md](./plan.md)

---

## Entities

### AgGridConfig

Configuration for locating and interacting with a specific grid.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `selector` | `string` | Yes | Grid container selector (testid, CSS, or Locator string) |
| `columns` | `AgGridColumnDef[]` | No | Column definitions for smart cell location |
| `cellRenderers` | `Record<string, CellRendererConfig>` | No | Custom cell renderer mappings |
| `rowIdField` | `string` | No | Field name used for stable row IDs |
| `enterprise` | `EnterpriseConfig` | No | Enterprise feature configuration |
| `timeouts` | `TimeoutConfig` | No | Custom timeout overrides |

**Validation Rules**:
- `selector` must be non-empty string
- If `columns` provided, each must have valid `colId`
- `timeouts` values must be positive integers

---

### AgGridColumnDef

Metadata about a grid column.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `colId` | `string` | Yes | Column ID (matches AG Grid col-id attribute) |
| `displayName` | `string` | No | Human-readable name for error messages |
| `type` | `ColumnType` | No | Cell value type: 'text' \| 'number' \| 'date' \| 'boolean' \| 'custom' |
| `valueExtractor` | `(cell: Locator) => Promise<string>` | No | Custom value extraction function |
| `pinned` | `'left' \| 'right' \| null` | No | Column pinned position |

**Validation Rules**:
- `colId` must be non-empty string
- `type` defaults to 'text' if not specified

---

### RowMatcher

Criteria for finding a specific row in the grid.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `rowIndex` | `number` | No | Match by viewport row index (0-based) |
| `rowId` | `string` | No | Match by stable row ID |
| `ariaRowIndex` | `number` | No | Match by absolute aria-rowindex (1-based) |
| `cellValues` | `Record<string, unknown>` | No | Match by cell value combinations |
| `predicate` | `(row: AgGridRowData) => boolean` | No | Custom match predicate |

**Validation Rules**:
- At least one matching criterion must be provided
- `rowIndex` and `ariaRowIndex` must be non-negative
- If multiple criteria provided, all must match (AND logic)

---

### CellRendererConfig

Configuration for extracting values from custom cell renderers.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `valueSelector` | `string` | Yes | CSS selector for the value element within cell |
| `extractValue` | `(element: Locator) => Promise<string>` | No | Custom extraction function |

**Validation Rules**:
- `valueSelector` must be valid CSS selector
- If `extractValue` not provided, uses `.textContent()`

---

### EnterpriseConfig

Configuration for AG Grid Enterprise features.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `rowGrouping` | `boolean` | No | Enable row grouping support |
| `treeData` | `boolean` | No | Enable tree data support |
| `masterDetail` | `boolean` | No | Enable master/detail support |
| `serverSide` | `boolean` | No | Enable server-side row model handling |

**Validation Rules**:
- All fields default to `false`
- Features auto-detected at runtime if not explicitly configured

---

### TimeoutConfig

Custom timeout configuration.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `gridReady` | `number` | No | Timeout for grid ready state (ms) |
| `rowLoad` | `number` | No | Timeout for row to appear (ms) |
| `cellEdit` | `number` | No | Timeout for cell edit mode (ms) |
| `scroll` | `number` | No | Interval between scroll operations (ms) |

**Default Values**:
- `gridReady`: 30000 (Playwright default)
- `rowLoad`: 10000
- `cellEdit`: 5000
- `scroll`: 50

---

### AgGridRowData

Extracted data from a grid row.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `rowIndex` | `number` | Yes | Viewport row index |
| `rowId` | `string` | No | Stable row ID if available |
| `ariaRowIndex` | `number` | Yes | Absolute row position (1-based) |
| `cells` | `Record<string, unknown>` | Yes | Cell values keyed by colId |
| `isGroup` | `boolean` | No | True if this is a group row |
| `isExpanded` | `boolean` | No | True if group/tree node is expanded |
| `groupLevel` | `number` | No | Nesting level for tree/group rows |

---

### AgGridState

Current state of the grid.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `totalRows` | `number` | Yes | Total row count (from pagination info) |
| `visibleRows` | `number` | Yes | Currently visible row count |
| `selectedRows` | `number` | Yes | Selected row count |
| `sortedBy` | `SortModel[]` | No | Current sort state |
| `filteredBy` | `Record<string, unknown>` | No | Current filter state |
| `groupedBy` | `string[]` | No | Columns used for grouping |
| `isLoading` | `boolean` | Yes | True if loading overlay visible |

---

### SortModel

Sort state for a column.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `colId` | `string` | Yes | Column being sorted |
| `direction` | `'asc' \| 'desc'` | Yes | Sort direction |

---

### AssertionOptions

Common options for grid assertions.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `timeout` | `number` | No | Assertion timeout in ms |
| `exact` | `boolean` | No | Require exact match vs contains |

**Default Values**:
- `timeout`: 5000
- `exact`: false

---

## Entity Relationships

```
AgGridConfig
├── columns[] ─────────────► AgGridColumnDef
├── cellRenderers{} ───────► CellRendererConfig
├── enterprise ────────────► EnterpriseConfig
└── timeouts ──────────────► TimeoutConfig

AgGridHelper (runtime)
├── config ────────────────► AgGridConfig
├── getRow() ──────────────► uses RowMatcher
├── getRowData() ──────────► returns AgGridRowData
└── getGridState() ────────► returns AgGridState
```

---

## State Transitions

### Grid Lifecycle States

```
                ┌──────────────┐
                │   Loading    │
                └──────────────┘
                       │
              waitForReady()
                       ▼
                ┌──────────────┐
                │    Ready     │◄────────────────────┐
                └──────────────┘                     │
                       │                             │
         ┌─────────────┼─────────────┐               │
         ▼             ▼             ▼               │
   ┌──────────┐ ┌──────────┐ ┌──────────┐           │
   │  Filter  │ │   Sort   │ │  Group   │           │
   └──────────┘ └──────────┘ └──────────┘           │
         │             │             │               │
         └─────────────┼─────────────┘               │
                       ▼                             │
                ┌──────────────┐                     │
                │   Updating   │─────────────────────┘
                └──────────────┘
```

### Row Visibility States (Virtualization)

```
┌─────────────────┐
│  Not Rendered   │ (row outside viewport)
└─────────────────┘
         │
    scrollToRow()
         ▼
┌─────────────────┐
│    Rendered     │ (row in DOM, visible)
└─────────────────┘
         │
  user scrolls away
         ▼
┌─────────────────┐
│  Not Rendered   │ (row removed from DOM)
└─────────────────┘
```

---

*Data model complete. See contracts/ for TypeScript interfaces.*
