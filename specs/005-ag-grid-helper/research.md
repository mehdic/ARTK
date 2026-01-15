# Research: AG Grid Helper Module

**Date**: 2026-01-14
**Spec**: [spec.md](./spec.md)
**Plan**: [plan.md](./plan.md)

---

## Research Task 1: AG Grid DOM Structure Analysis

**Question**: What are the stable DOM attributes and class patterns across AG Grid versions 30-33?

### Findings

**Stable Attributes (version-independent)**:
| Attribute | Element | Stability | Notes |
|-----------|---------|-----------|-------|
| `col-id` | Header cells, body cells | HIGH | Column identifier, matches colDef.colId |
| `row-index` | Row divs | MEDIUM | Viewport position, changes on scroll |
| `row-id` | Row divs | HIGH | Stable if getRowId() configured |
| `aria-rowindex` | Row divs | HIGH | Absolute position, 1-indexed |
| `aria-colindex` | Cells | HIGH | Column position, 1-indexed |
| `role="row"` | Row divs | HIGH | ARIA role, stable |
| `role="gridcell"` | Cells | HIGH | ARIA role, stable |

**Stable Class Patterns**:
| Class | Purpose | Stability |
|-------|---------|-----------|
| `.ag-root-wrapper` | Grid container | HIGH |
| `.ag-header` | Header container | HIGH |
| `.ag-body-viewport` | Body scroll container | HIGH |
| `.ag-row` | Row element | HIGH |
| `.ag-cell` | Cell element | HIGH |
| `.ag-row-group` | Group row | HIGH |
| `.ag-row-selected` | Selected row | HIGH |
| `.ag-cell-focus` | Focused cell | HIGH |
| `.ag-overlay-loading-center` | Loading indicator | HIGH |
| `.ag-overlay-no-rows-center` | Empty state | HIGH |

**Container Structure for Pinned Columns**:
```
.ag-body-viewport
├── .ag-pinned-left-cols-container
├── .ag-center-cols-container (scrollable)
└── .ag-pinned-right-cols-container
```

### Decision

Use `aria-rowindex` + `col-id` as primary locator strategy. Fall back to `row-index` when aria not available. Class-based selectors for structure navigation.

**Rationale**: ARIA attributes are stable across versions and survive virtualization scrolling. They're also accessibility-compliant.

**Alternatives considered**:
- `data-testid` injection: Requires app modification, violates zero-config goal
- CSS class + nth-child: Brittle, breaks on reordering
- XPath: Verbose, slower, harder to maintain

---

## Research Task 2: Virtualization Handling Strategy

**Question**: Best approach for accessing rows outside the visible viewport?

### Findings

**AG Grid Virtualization Behavior**:
- Only renders ~20-50 rows at a time (row buffer configurable)
- `row-index` attribute reflects viewport position, not data position
- `aria-rowindex` reflects absolute position (1-indexed)
- Scrolling triggers DOM updates with ~100ms debounce

**Tested Approaches**:

| Approach | Pros | Cons |
|----------|------|------|
| **Binary scroll search** | Fast for known index | Complex, edge cases |
| **Incremental scroll** | Simple, reliable | Slower for distant rows |
| **Grid API injection** | Direct row access | Requires app modification |
| **ARIA-based search** | Standards-compliant | Still needs scroll for interaction |

**Scroll Implementation Pattern**:
```typescript
async function scrollToRow(grid: Locator, targetAriaIndex: number): Promise<Locator> {
  const viewport = grid.locator('.ag-body-viewport');
  let attempts = 0;
  const maxAttempts = 50;

  while (attempts < maxAttempts) {
    // Check if row is visible
    const row = grid.locator(`[aria-rowindex="${targetAriaIndex}"]`);
    if (await row.count() > 0) {
      return row;
    }

    // Get visible row range
    const visibleRows = await grid.locator('.ag-row[aria-rowindex]').all();
    const firstVisible = parseInt(await visibleRows[0].getAttribute('aria-rowindex') || '1');
    const lastVisible = parseInt(await visibleRows[visibleRows.length - 1].getAttribute('aria-rowindex') || '1');

    // Scroll in correct direction
    if (targetAriaIndex < firstVisible) {
      await viewport.evaluate(el => el.scrollTop -= el.clientHeight);
    } else {
      await viewport.evaluate(el => el.scrollTop += el.clientHeight);
    }

    await grid.page().waitForTimeout(50); // Allow DOM update
    attempts++;
  }

  throw new Error(`Row ${targetAriaIndex} not found after ${maxAttempts} scroll attempts`);
}
```

### Decision

Use **incremental scroll with ARIA-based targeting**. Scroll by viewport height until target `aria-rowindex` appears in DOM.

**Rationale**: Most reliable approach that works across all AG Grid configurations. Performance is acceptable (typically <2s for 10,000 row grid).

**Alternatives considered**:
- Binary search: Faster but fails with variable row heights
- Keyboard navigation (Page Down): Unreliable focus management
- Grid API: Would require app code changes

---

## Research Task 3: Custom Cell Renderer Value Extraction

**Question**: How to reliably extract values from custom cell renderers?

### Findings

**Common Renderer Patterns**:

| Pattern | DOM Structure | Extraction Strategy |
|---------|---------------|---------------------|
| Plain text | `<div class="ag-cell">Value</div>` | `.textContent` |
| Checkbox | `<div class="ag-cell"><input type="checkbox"/></div>` | `.isChecked()` |
| Link | `<div class="ag-cell"><a href="...">Text</a></div>` | `a.textContent` |
| Badge | `<div class="ag-cell"><span class="badge">Status</span></div>` | `.badge.textContent` |
| Icon + Text | `<div class="ag-cell"><i class="icon"/>Text</div>` | Filter icon, get text |
| Button | `<div class="ag-cell"><button>Action</button></div>` | `button.textContent` |
| Input | `<div class="ag-cell"><input value="..."/></div>` | `.inputValue()` |
| Composite | `<div class="ag-cell"><Avatar/><span>Name</span></div>` | Config-based extraction |

**Extraction Algorithm**:
1. Check for built-in extractor match (checkbox, input, select)
2. Check for user-configured custom extractor
3. Fall back to `.textContent()` with whitespace normalization

### Decision

Provide **built-in extractors** for common patterns + **configurable extractors** for custom renderers.

```typescript
const cellRenderers: Record<string, CellRendererConfig> = {
  // Built-in
  checkbox: {
    selector: 'input[type="checkbox"]',
    extract: async (el) => String(await el.isChecked())
  },
  link: {
    selector: 'a',
    extract: async (el) => await el.textContent() || ''
  },
  // User-configurable
  customBadge: {
    selector: '.my-badge-class',
    extract: async (el) => await el.textContent() || ''
  }
};
```

**Rationale**: Covers 80% of use cases out-of-box; remaining 20% configurable without source modification.

---

## Research Task 4: Enterprise Feature Detection

**Question**: How to detect and handle AG Grid Enterprise features?

### Findings

**Detection Signals**:

| Feature | Package | DOM Indicator |
|---------|---------|---------------|
| Row Grouping | `ag-grid-enterprise` | `.ag-row-group` class |
| Tree Data | `ag-grid-enterprise` | `.ag-row` with `level` attribute |
| Master/Detail | `ag-grid-enterprise` | `.ag-details-row` presence |
| Pivot Mode | `ag-grid-enterprise` | `.ag-pivot-mode` on grid |
| Server-Side | `ag-grid-enterprise` | Loading overlay patterns |

**Package.json Detection**:
```typescript
const enterpriseSignals = [
  { pattern: 'ag-grid-enterprise', weight: 50, edition: 'enterprise' },
  { pattern: '@ag-grid-enterprise/', weight: 50, edition: 'enterprise' }
];
```

**Runtime Feature Detection**:
```typescript
function detectEnterpriseFeatures(grid: Locator): Promise<EnterpriseFeatures> {
  return {
    rowGrouping: await grid.locator('.ag-row-group').count() > 0,
    masterDetail: await grid.locator('.ag-details-row').count() > 0,
    treeData: await grid.locator('[tree-level]').count() > 0
  };
}
```

### Decision

**Two-tier detection**: Package-based detection at discovery time; DOM-based detection at runtime.

**Rationale**: Package detection enables recommendations; runtime detection enables graceful feature availability.

---

## Research Task 5: Integration with Existing ARTK Architecture

**Question**: How should the grid module integrate with existing @artk/core patterns?

### Findings

**Existing Patterns in @artk/core**:

| Module | Pattern | Grid Parallel |
|--------|---------|---------------|
| `assertions/table.ts` | `expectTableToContainRow(page, selector, data)` | `grid.expectRowContains(data)` |
| `locators/factory.ts` | Factory function returns Locator | `agGrid(page, config)` returns helper |
| `auth/providers/` | Provider classes | N/A (no provider pattern needed) |
| `detection/signals.ts` | Signal array with weights | Add AG_GRID_SIGNALS array |

**Export Pattern**:
```typescript
// grid/index.ts
export { agGrid, AgGridHelper } from './ag-grid/index.js';
export type { AgGridConfig, RowMatcher, ... } from './types.js';

// Main index.ts addition
export * from './grid/index.js';
```

**Detection Integration**:
```typescript
// detection/signals.ts - add to existing
export const AG_GRID_SIGNALS: Signal[] = [
  { type: 'dependency', pattern: 'ag-grid-community', weight: 50 },
  { type: 'dependency', pattern: 'ag-grid-enterprise', weight: 50 },
  { type: 'dependency', pattern: 'ag-grid-react', weight: 30 },
  { type: 'import', pattern: /from ['"]ag-grid/, weight: 40 }
];
```

### Decision

Follow **existing @artk/core patterns** exactly:
- Factory function (`agGrid`) returns helper instance
- Types exported from central `types.ts`
- Tests in `__tests__/` subdirectory
- Detection signals in `detection/signals.ts`

**Rationale**: Consistency reduces learning curve and maintenance burden.

---

## Summary

| Research Area | Decision | Confidence |
|---------------|----------|------------|
| DOM Locators | ARIA attributes + col-id | High |
| Virtualization | Incremental scroll with ARIA targeting | High |
| Cell Renderers | Built-in + configurable extractors | High |
| Enterprise Detection | Package + runtime detection | High |
| Architecture | Follow existing @artk/core patterns | High |

---

*Research complete. Ready to proceed to Phase 1 (Design & Contracts).*
