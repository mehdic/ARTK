'use strict';

var test = require('@playwright/test');

// grid/types.ts
var DEFAULT_TIMEOUTS = {
  gridReady: 3e4,
  rowLoad: 1e4,
  cellEdit: 5e3,
  scroll: 50
};

// grid/ag-grid/config.ts
function normalizeConfig(config) {
  if (typeof config === "string") {
    return {
      selector: config,
      timeouts: { ...DEFAULT_TIMEOUTS }
    };
  }
  return {
    ...config,
    timeouts: mergeTimeouts(config.timeouts)
  };
}
function mergeTimeouts(custom) {
  return {
    ...DEFAULT_TIMEOUTS,
    ...custom
  };
}
function validateConfig(config) {
  if (!config.selector || typeof config.selector !== "string") {
    throw new Error("AG Grid config requires a valid selector string");
  }
  if (config.selector.trim() === "") {
    throw new Error("AG Grid config selector cannot be empty");
  }
  if (config.columns) {
    for (const col of config.columns) {
      if (!col.colId || typeof col.colId !== "string") {
        throw new Error(`AG Grid column definition requires a valid colId`);
      }
    }
  }
  if (config.timeouts) {
    const timeoutKeys = ["gridReady", "rowLoad", "cellEdit", "scroll"];
    for (const key of timeoutKeys) {
      const value = config.timeouts[key];
      if (value !== void 0 && (typeof value !== "number" || value < 0)) {
        throw new Error(`AG Grid timeout "${key}" must be a positive number`);
      }
    }
  }
}
function getColumnDisplayName(config, colId) {
  const column = config.columns?.find((c) => c.colId === colId);
  return column?.displayName ?? colId;
}
function getColumnPinnedPosition(config, colId) {
  const column = config.columns?.find((c) => c.colId === colId);
  return column?.pinned ?? null;
}

// grid/ag-grid/selectors.ts
var AG_GRID_SELECTORS = {
  // Grid structure
  ROOT_WRAPPER: ".ag-root-wrapper",
  HEADER: ".ag-header",
  HEADER_CELL: ".ag-header-cell",
  PINNED_LEFT_CONTAINER: ".ag-pinned-left-cols-container",
  PINNED_RIGHT_CONTAINER: ".ag-pinned-right-cols-container",
  // Row and cell
  ROW: ".ag-row",
  CELL: ".ag-cell",
  ROW_SELECTED: ".ag-row-selected",
  // Overlays
  LOADING_OVERLAY: ".ag-overlay-loading-center",
  NO_ROWS_OVERLAY: ".ag-overlay-no-rows-center",
  // Floating filter
  FLOATING_FILTER: ".ag-floating-filter",
  // Attributes
  ATTR_COL_ID: "col-id",
  ATTR_ROW_INDEX: "row-index",
  ATTR_ROW_ID: "row-id",
  ATTR_ARIA_ROW_INDEX: "aria-rowindex",
  ATTR_ARIA_SORT: "aria-sort"};
function getGridRoot(page, selector) {
  const byTestId = page.locator(`[data-testid="${selector}"]`);
  if (selector.startsWith("#") || selector.startsWith(".") || selector.startsWith("[")) {
    return page.locator(selector).locator(AG_GRID_SELECTORS.ROOT_WRAPPER).or(page.locator(selector));
  }
  return byTestId.locator(AG_GRID_SELECTORS.ROOT_WRAPPER).or(byTestId);
}
function buildCellSelector(colId) {
  return `${AG_GRID_SELECTORS.CELL}[${AG_GRID_SELECTORS.ATTR_COL_ID}="${colId}"]`;
}
function buildHeaderCellSelector(colId) {
  return `${AG_GRID_SELECTORS.HEADER_CELL}[${AG_GRID_SELECTORS.ATTR_COL_ID}="${colId}"]`;
}
function buildFilterInputSelector(colId) {
  return `${AG_GRID_SELECTORS.FLOATING_FILTER}[${AG_GRID_SELECTORS.ATTR_COL_ID}="${colId}"] input`;
}
async function isGroupRow(rowLocator) {
  const classAttr = await rowLocator.getAttribute("class");
  return classAttr?.includes("ag-row-group") ?? false;
}
async function isRowExpanded(rowLocator) {
  const ariaExpanded = await rowLocator.getAttribute("aria-expanded");
  return ariaExpanded === "true";
}
async function isRowSelected(rowLocator) {
  const classAttr = await rowLocator.getAttribute("class");
  const ariaSelected = await rowLocator.getAttribute("aria-selected");
  return classAttr?.includes("ag-row-selected") || ariaSelected === "true";
}
async function getAriaRowIndex(rowLocator) {
  const ariaRowIndex = await rowLocator.getAttribute(AG_GRID_SELECTORS.ATTR_ARIA_ROW_INDEX);
  return ariaRowIndex ? parseInt(ariaRowIndex, 10) : -1;
}
async function getRowIndex(rowLocator) {
  const rowIndex = await rowLocator.getAttribute(AG_GRID_SELECTORS.ATTR_ROW_INDEX);
  return rowIndex ? parseInt(rowIndex, 10) : -1;
}
async function getRowId(rowLocator) {
  return rowLocator.getAttribute(AG_GRID_SELECTORS.ATTR_ROW_ID);
}
async function getSortDirection(headerCellLocator) {
  const ariaSort = await headerCellLocator.getAttribute(AG_GRID_SELECTORS.ATTR_ARIA_SORT);
  if (ariaSort === "ascending") return "asc";
  if (ariaSort === "descending") return "desc";
  return void 0;
}
function buildRowSelectorFromMatcher(matcher) {
  if (matcher.ariaRowIndex !== void 0) {
    return `${AG_GRID_SELECTORS.ROW}[${AG_GRID_SELECTORS.ATTR_ARIA_ROW_INDEX}="${matcher.ariaRowIndex}"]`;
  }
  if (matcher.rowId !== void 0) {
    return `${AG_GRID_SELECTORS.ROW}[${AG_GRID_SELECTORS.ATTR_ROW_ID}="${matcher.rowId}"]`;
  }
  if (matcher.rowIndex !== void 0) {
    return `${AG_GRID_SELECTORS.ROW}[${AG_GRID_SELECTORS.ATTR_ROW_INDEX}="${matcher.rowIndex}"]`;
  }
  if (matcher.cellValues || matcher.predicate) {
    return null;
  }
  return AG_GRID_SELECTORS.ROW;
}
function isDirectMatcher(matcher) {
  return matcher.ariaRowIndex !== void 0 || matcher.rowId !== void 0 || matcher.rowIndex !== void 0;
}
function formatRowMatcher(matcher) {
  const parts = [];
  if (matcher.ariaRowIndex !== void 0) {
    parts.push(`ariaRowIndex=${matcher.ariaRowIndex}`);
  }
  if (matcher.rowId !== void 0) {
    parts.push(`rowId="${matcher.rowId}"`);
  }
  if (matcher.rowIndex !== void 0) {
    parts.push(`rowIndex=${matcher.rowIndex}`);
  }
  if (matcher.cellValues) {
    const cellParts = Object.entries(matcher.cellValues).map(([key, val]) => `${key}="${val}"`).join(", ");
    parts.push(`cellValues={${cellParts}}`);
  }
  if (matcher.predicate) {
    parts.push("predicate=[function]");
  }
  if (parts.length === 0) {
    return "(empty matcher)";
  }
  return parts.join(", ");
}

// grid/ag-grid/locators.ts
function createLocatorContext(page, config) {
  return {
    page,
    config,
    gridLocator: getGridRoot(page, config.selector)
  };
}
function getGrid(ctx) {
  return ctx.gridLocator;
}
function getRow(ctx, matcher) {
  const { gridLocator } = ctx;
  const selector = buildRowSelectorFromMatcher(matcher);
  if (selector) {
    return gridLocator.locator(selector);
  }
  return gridLocator.locator(AG_GRID_SELECTORS.ROW);
}
function getVisibleRows(ctx) {
  return ctx.gridLocator.locator(AG_GRID_SELECTORS.ROW);
}
function getCell(ctx, rowMatcher, colId) {
  const { gridLocator, config } = ctx;
  const pinnedPosition = getColumnPinnedPosition(config, colId);
  if (pinnedPosition) {
    const containerSelector = pinnedPosition === "left" ? AG_GRID_SELECTORS.PINNED_LEFT_CONTAINER : AG_GRID_SELECTORS.PINNED_RIGHT_CONTAINER;
    const rowSelector = buildRowSelectorFromMatcher(rowMatcher) ?? AG_GRID_SELECTORS.ROW;
    return gridLocator.locator(containerSelector).locator(rowSelector).locator(buildCellSelector(colId));
  }
  const rowLocator = getRow(ctx, rowMatcher);
  return rowLocator.locator(buildCellSelector(colId));
}
function getHeaderCell(ctx, colId) {
  return ctx.gridLocator.locator(buildHeaderCellSelector(colId));
}
function getFilterInput(ctx, colId) {
  return ctx.gridLocator.locator(buildFilterInputSelector(colId));
}
async function waitForReady(gridLocator, config, options) {
  const timeout = options?.timeout ?? config.timeouts.gridReady;
  await test.expect(gridLocator.locator(AG_GRID_SELECTORS.ROOT_WRAPPER).or(gridLocator)).toBeVisible({ timeout });
  await test.expect(gridLocator.locator(AG_GRID_SELECTORS.HEADER)).toBeVisible({ timeout });
  await waitForDataLoaded(gridLocator, config, { timeout });
}
async function waitForDataLoaded(gridLocator, config, options) {
  const timeout = options?.timeout ?? config.timeouts.gridReady;
  const loadingOverlay = gridLocator.locator(AG_GRID_SELECTORS.LOADING_OVERLAY);
  const overlayCount = await loadingOverlay.count();
  if (overlayCount > 0) {
    const visibleOverlay = loadingOverlay.locator(".visible");
    const visibleCount = await visibleOverlay.count();
    if (visibleCount > 0) {
      await test.expect(visibleOverlay).toHaveCount(0, { timeout });
    }
  }
}
async function waitForRowCount(gridLocator, count, config, options) {
  const timeout = options?.timeout ?? config.timeouts.rowLoad;
  const rows = gridLocator.locator(AG_GRID_SELECTORS.ROW);
  await test.expect(rows).toHaveCount(count, { timeout });
}
async function waitForRow(gridLocator, matcher, config, options) {
  const timeout = options?.timeout ?? config.timeouts.rowLoad;
  let rowLocator;
  if (matcher.ariaRowIndex !== void 0) {
    rowLocator = gridLocator.locator(
      `${AG_GRID_SELECTORS.ROW}[${AG_GRID_SELECTORS.ATTR_ARIA_ROW_INDEX}="${matcher.ariaRowIndex}"]`
    );
  } else if (matcher.rowId !== void 0) {
    rowLocator = gridLocator.locator(
      `${AG_GRID_SELECTORS.ROW}[${AG_GRID_SELECTORS.ATTR_ROW_ID}="${matcher.rowId}"]`
    );
  } else if (matcher.rowIndex !== void 0) {
    rowLocator = gridLocator.locator(
      `${AG_GRID_SELECTORS.ROW}[${AG_GRID_SELECTORS.ATTR_ROW_INDEX}="${matcher.rowIndex}"]`
    );
  } else {
    rowLocator = gridLocator.locator(AG_GRID_SELECTORS.ROW).first();
  }
  await test.expect(rowLocator).toBeVisible({ timeout });
  return rowLocator;
}

// grid/ag-grid/cell-renderers.ts
var BUILT_IN_EXTRACTORS = {
  // Checkbox cell
  checkbox: {
    valueSelector: 'input[type="checkbox"]',
    extractValue: async (el) => String(await el.isChecked())
  },
  // Link/anchor cell
  link: {
    valueSelector: "a",
    extractValue: async (el) => (await el.textContent())?.trim() ?? ""
  },
  // Input cell (for inline editing)
  input: {
    valueSelector: 'input:not([type="checkbox"])',
    extractValue: async (el) => await el.inputValue()
  },
  // Select/dropdown cell
  select: {
    valueSelector: "select",
    extractValue: async (el) => await el.inputValue()
  },
  // Badge/tag cell
  badge: {
    valueSelector: ".badge, .tag, .chip, .label",
    extractValue: async (el) => (await el.textContent())?.trim() ?? ""
  },
  // Button cell
  button: {
    valueSelector: "button",
    extractValue: async (el) => (await el.textContent())?.trim() ?? ""
  }
};
async function extractCellValue(cellLocator, config, colId) {
  if (colId && config.cellRenderers?.[colId]) {
    const renderer = config.cellRenderers[colId];
    return extractWithRenderer(cellLocator, renderer);
  }
  if (colId && config.columns) {
    const column = config.columns.find((c) => c.colId === colId);
    if (column?.valueExtractor) {
      return column.valueExtractor(cellLocator);
    }
  }
  for (const [, extractor] of Object.entries(BUILT_IN_EXTRACTORS)) {
    const element = cellLocator.locator(extractor.valueSelector);
    const count = await element.count();
    if (count > 0 && extractor.extractValue) {
      return extractor.extractValue(element.first());
    }
  }
  return normalizeText(await cellLocator.textContent());
}
async function extractWithRenderer(cellLocator, renderer) {
  const element = cellLocator.locator(renderer.valueSelector);
  if (renderer.extractValue) {
    return renderer.extractValue(element.first());
  }
  return normalizeText(await element.first().textContent());
}
function normalizeText(text) {
  if (!text) return "";
  return text.replace(/\s+/g, " ").trim();
}
async function getAllCellValues(rowLocator, config) {
  const cells = rowLocator.locator(".ag-cell");
  const cellCount = await cells.count();
  const values = {};
  for (let i = 0; i < cellCount; i++) {
    const cell = cells.nth(i);
    const colId = await cell.getAttribute("col-id");
    if (colId) {
      values[colId] = await extractCellValue(cell, config, colId);
    }
  }
  return values;
}

// grid/ag-grid/row-data.ts
async function getRowData(rowLocator, config) {
  const [ariaRowIndex, rowIndex, rowId, isGroup, isExpanded, cells] = await Promise.all([
    getAriaRowIndex(rowLocator),
    getRowIndex(rowLocator),
    getRowId(rowLocator),
    isGroupRow(rowLocator),
    isRowExpanded(rowLocator),
    getAllCellValues(rowLocator, config)
  ]);
  const rowData = {
    rowIndex,
    ariaRowIndex,
    cells
  };
  if (rowId) {
    rowData.rowId = rowId;
  }
  if (isGroup) {
    rowData.isGroup = true;
    rowData.isExpanded = isExpanded;
    const level = await rowLocator.getAttribute("aria-level");
    if (level) {
      rowData.groupLevel = parseInt(level, 10);
    }
  }
  return rowData;
}
async function getAllVisibleRowData(gridLocator, config) {
  const rows = gridLocator.locator(AG_GRID_SELECTORS.ROW);
  const rowCount = await rows.count();
  const results = [];
  for (let i = 0; i < rowCount; i++) {
    const rowLocator = rows.nth(i);
    const rowData = await getRowData(rowLocator, config);
    results.push(rowData);
  }
  return results;
}
async function findRowByMatcher(gridLocator, matcher, config) {
  if (isDirectMatcher(matcher)) {
    const selector = buildRowSelectorFromMatcher(matcher);
    if (selector) {
      const row = gridLocator.locator(selector);
      const count = await row.count();
      if (count > 0) {
        return { row: row.first(), data: await getRowData(row.first(), config) };
      }
    }
    return null;
  }
  if (matcher.cellValues || matcher.predicate) {
    const allRows = await getAllVisibleRowData(gridLocator, config);
    for (let i = 0; i < allRows.length; i++) {
      const rowData = allRows[i];
      if (!rowData) {
        continue;
      }
      const matches = matcher.cellValues ? matchesCellValues(rowData, matcher.cellValues) : matcher.predicate?.(rowData);
      if (matches) {
        const row = gridLocator.locator(AG_GRID_SELECTORS.ROW).nth(i);
        return { row, data: rowData };
      }
    }
    return null;
  }
  return null;
}
function matchesCellValues(rowData, expectedValues) {
  for (const [colId, expectedValue] of Object.entries(expectedValues)) {
    const actualValue = rowData.cells[colId];
    const normalizedExpected = normalizeForComparison(expectedValue);
    const normalizedActual = normalizeForComparison(actualValue);
    if (normalizedExpected !== normalizedActual) {
      return false;
    }
  }
  return true;
}
async function findClosestMatch(gridLocator, expectedValues, config) {
  const allRows = await getAllVisibleRowData(gridLocator, config);
  if (allRows.length === 0) {
    return null;
  }
  let bestMatch = null;
  let bestMatchCount = -1;
  const expectedKeys = Object.keys(expectedValues);
  const totalFields = expectedKeys.length;
  for (const rowData of allRows) {
    let matchedFields = 0;
    const mismatches = [];
    for (const colId of expectedKeys) {
      const expectedValue = expectedValues[colId];
      const actualValue = rowData.cells[colId];
      const normalizedExpected = normalizeForComparison(expectedValue);
      const normalizedActual = normalizeForComparison(actualValue);
      if (normalizedExpected === normalizedActual) {
        matchedFields++;
      } else {
        mismatches.push({
          field: colId,
          expected: expectedValue,
          actual: actualValue
        });
      }
    }
    if (matchedFields > bestMatchCount) {
      bestMatchCount = matchedFields;
      bestMatch = {
        row: rowData,
        matchedFields,
        totalFields,
        mismatches
      };
    }
  }
  return bestMatch;
}
function normalizeForComparison(value) {
  if (value === null || value === void 0) {
    return "";
  }
  if (typeof value === "string") {
    return value.trim().toLowerCase();
  }
  return String(value).trim().toLowerCase();
}
async function countVisibleRows(gridLocator) {
  return gridLocator.locator(AG_GRID_SELECTORS.ROW).count();
}
async function countSelectedRows(gridLocator) {
  return gridLocator.locator(AG_GRID_SELECTORS.ROW_SELECTED).count();
}

// grid/ag-grid/state.ts
async function getGridState(gridLocator, _config) {
  const [visibleRows, selectedRows, sortedBy, isLoading, totalRows] = await Promise.all([
    countVisibleRows(gridLocator),
    countSelectedRows(gridLocator),
    getSortState(gridLocator),
    checkIsLoading(gridLocator),
    getTotalRowCount(gridLocator)
  ]);
  const state = {
    totalRows,
    visibleRows,
    selectedRows,
    isLoading
  };
  if (sortedBy.length > 0) {
    state.sortedBy = sortedBy;
  }
  return state;
}
async function getSortState(gridLocator) {
  const headerCells = gridLocator.locator(AG_GRID_SELECTORS.HEADER_CELL);
  const cellCount = await headerCells.count();
  const sortedColumns = [];
  for (let i = 0; i < cellCount; i++) {
    const cell = headerCells.nth(i);
    const colId = await cell.getAttribute(AG_GRID_SELECTORS.ATTR_COL_ID);
    const direction = await getSortDirection(cell);
    if (colId && direction) {
      sortedColumns.push({ colId, direction });
    }
  }
  return sortedColumns;
}
async function isOverlayVisible(overlayLocator) {
  const count = await overlayLocator.count();
  if (count === 0) {
    return false;
  }
  const visibleOverlay = overlayLocator.locator(".visible");
  const visibleCount = await visibleOverlay.count();
  if (visibleCount > 0) {
    return true;
  }
  try {
    const isVisible = await overlayLocator.first().isVisible({ timeout: 100 });
    return isVisible;
  } catch {
    return false;
  }
}
async function checkIsLoading(gridLocator) {
  const loadingOverlay = gridLocator.locator(AG_GRID_SELECTORS.LOADING_OVERLAY);
  return isOverlayVisible(loadingOverlay);
}
async function getTotalRowCount(gridLocator) {
  const paginationPanel = gridLocator.locator(".ag-paging-panel");
  const paginationCount = await paginationPanel.count();
  if (paginationCount > 0) {
    const paginationText = await paginationPanel.textContent();
    if (paginationText) {
      const match = paginationText.match(/of\s*(\d+)/i);
      const matchedValue = match?.[1];
      if (matchedValue) {
        return parseInt(matchedValue, 10);
      }
    }
  }
  const statusBar = gridLocator.locator(".ag-status-bar");
  const statusBarCount = await statusBar.count();
  if (statusBarCount > 0) {
    const statusText = await statusBar.textContent();
    if (statusText) {
      const match = statusText.match(/(\d+)\s*(rows?|records?|items?)/i);
      const matchedValue = match?.[1];
      if (matchedValue) {
        return parseInt(matchedValue, 10);
      }
    }
  }
  return countVisibleRows(gridLocator);
}
async function isNoRowsOverlayVisible(gridLocator) {
  const noRowsOverlay = gridLocator.locator(AG_GRID_SELECTORS.NO_ROWS_OVERLAY);
  return isOverlayVisible(noRowsOverlay);
}

// grid/ag-grid/assertions.ts
async function expectRowCount(gridLocator, count, config, options) {
  const timeout = options?.timeout ?? 5e3;
  const rows = gridLocator.locator(AG_GRID_SELECTORS.ROW);
  if (options?.min !== void 0 || options?.max !== void 0) {
    const actualCount = await rows.count();
    if (options.min !== void 0 && actualCount < options.min) {
      throw new Error(
        `Grid "${config.selector}" has ${actualCount} rows, expected at least ${options.min}`
      );
    }
    if (options.max !== void 0 && actualCount > options.max) {
      throw new Error(
        `Grid "${config.selector}" has ${actualCount} rows, expected at most ${options.max}`
      );
    }
    return;
  }
  await test.expect(rows).toHaveCount(count, { timeout });
}
async function expectRowContains(gridLocator, cellValues, config, options) {
  const timeout = options?.timeout ?? 5e3;
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const match = await findRowByMatcher(gridLocator, { cellValues }, config);
    if (match) {
      return;
    }
    await gridLocator.page().waitForTimeout(100);
  }
  const visibleRowCount = await countVisibleRows(gridLocator);
  const closestMatch = await findClosestMatch(gridLocator, cellValues, config);
  let errorMessage = `Grid "${config.selector}" does not contain a row matching:
`;
  errorMessage += `   Expected: ${formatCellValues(cellValues, config)}

`;
  errorMessage += `   Visible rows checked: ${visibleRowCount}
`;
  if (closestMatch && closestMatch.matchedFields > 0) {
    errorMessage += `   Closest match: ${formatCellValues(closestMatch.row.cells, config)}
`;
    errorMessage += `   Mismatched fields:
`;
    for (const mismatch of closestMatch.mismatches) {
      const displayName = getColumnDisplayName(config, mismatch.field);
      errorMessage += `     - ${displayName}: expected "${String(mismatch.expected)}", got "${String(mismatch.actual)}"
`;
    }
  } else {
    errorMessage += `   No similar rows found
`;
  }
  errorMessage += `
   Tip: If the row exists but isn't visible, it may require scrolling.
`;
  errorMessage += `   The helper automatically scrolls for you - check if the data exists.`;
  throw new Error(errorMessage);
}
async function expectRowNotContains(gridLocator, cellValues, config, options) {
  const timeout = options?.timeout ?? 5e3;
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const allRows = await getAllVisibleRowData(gridLocator, config);
    let foundMatch = false;
    for (const rowData of allRows) {
      if (matchesCellValues(rowData, cellValues)) {
        foundMatch = true;
        break;
      }
    }
    if (foundMatch) {
      await gridLocator.page().waitForTimeout(100);
    } else {
      return;
    }
  }
  throw new Error(
    `Grid "${config.selector}" contains a row matching:
   ${formatCellValues(cellValues, config)}

   Expected this row to NOT exist.`
  );
}
async function expectCellValue(gridLocator, rowMatcher, colId, expectedValue, config, options) {
  options?.timeout ?? 5e3;
  const exact = options?.exact ?? false;
  const match = await findRowByMatcher(gridLocator, rowMatcher, config);
  if (!match) {
    throw new Error(
      `Grid "${config.selector}": Could not find row matching ${formatMatcher(rowMatcher)}`
    );
  }
  const actualValue = match.data.cells[colId];
  const displayName = getColumnDisplayName(config, colId);
  if (exact) {
    if (actualValue !== expectedValue) {
      throw new Error(
        `Grid "${config.selector}": Cell "${displayName}" has value "${String(actualValue)}", expected exactly "${String(expectedValue)}"`
      );
    }
  } else {
    const normalizedExpected = normalizeForComparison2(expectedValue);
    const normalizedActual = normalizeForComparison2(actualValue);
    if (normalizedExpected !== normalizedActual) {
      throw new Error(
        `Grid "${config.selector}": Cell "${displayName}" has value "${String(actualValue)}", expected "${String(expectedValue)}"`
      );
    }
  }
}
async function expectSortedBy(gridLocator, colId, direction, config, _options) {
  const sortState = await getSortState(gridLocator);
  const columnSort = sortState.find((s) => s.colId === colId);
  const displayName = getColumnDisplayName(config, colId);
  if (!columnSort) {
    const sortedCols = sortState.map((s) => `${s.colId} (${s.direction})`).join(", ") || "none";
    throw new Error(
      `Grid "${config.selector}": Column "${displayName}" is not sorted. Currently sorted: ${sortedCols}`
    );
  }
  if (columnSort.direction !== direction) {
    throw new Error(
      `Grid "${config.selector}": Column "${displayName}" is sorted "${columnSort.direction}", expected "${direction}"`
    );
  }
}
async function expectEmpty(gridLocator, _config, options) {
  const timeout = options?.timeout ?? 5e3;
  const rows = gridLocator.locator(AG_GRID_SELECTORS.ROW);
  await test.expect(rows).toHaveCount(0, { timeout });
}
async function expectNoRowsOverlay(gridLocator, config, _options) {
  const isVisible = await isNoRowsOverlayVisible(gridLocator);
  if (!isVisible) {
    const rowCount = await countVisibleRows(gridLocator);
    throw new Error(
      `Grid "${config.selector}": "No rows" overlay is not visible. Grid has ${rowCount} rows.`
    );
  }
}
async function expectRowSelected(gridLocator, matcher, config, _options) {
  const match = await findRowByMatcher(gridLocator, matcher, config);
  if (!match) {
    throw new Error(
      `Grid "${config.selector}": Could not find row matching ${formatMatcher(matcher)}`
    );
  }
  const selected = await isRowSelected(match.row);
  if (!selected) {
    throw new Error(
      `Grid "${config.selector}": Row matching ${formatMatcher(matcher)} is not selected`
    );
  }
}
function formatCellValues(values, config) {
  const parts = [];
  for (const [colId, value] of Object.entries(values)) {
    const displayName = getColumnDisplayName(config, colId);
    parts.push(`${displayName}: "${String(value)}"`);
  }
  return `{ ${parts.join(", ")} }`;
}
function formatMatcher(matcher) {
  if (matcher.ariaRowIndex !== void 0) {
    return `aria-rowindex=${matcher.ariaRowIndex}`;
  }
  if (matcher.rowId !== void 0) {
    return `row-id="${matcher.rowId}"`;
  }
  if (matcher.rowIndex !== void 0) {
    return `row-index=${matcher.rowIndex}`;
  }
  if (matcher.cellValues) {
    return JSON.stringify(matcher.cellValues);
  }
  return "<custom predicate>";
}
function normalizeForComparison2(value) {
  if (value === null || value === void 0) {
    return "";
  }
  if (typeof value === "string") {
    return value.trim().toLowerCase();
  }
  return String(value).trim().toLowerCase();
}

// grid/ag-grid/helper.ts
var AgGridHelperImpl = class _AgGridHelperImpl {
  page;
  config;
  ctx;
  constructor(page, config) {
    this.page = page;
    if (typeof config !== "string") {
      validateConfig(config);
    }
    this.config = normalizeConfig(config);
    this.ctx = createLocatorContext(page, this.config);
  }
  // ─────────────────────────────────────────────────────────────────────────
  // Locators
  // ─────────────────────────────────────────────────────────────────────────
  getGrid() {
    return getGrid(this.ctx);
  }
  getRow(matcher) {
    return getRow(this.ctx, matcher);
  }
  getVisibleRows() {
    return getVisibleRows(this.ctx);
  }
  getCell(rowMatcher, colId) {
    return getCell(this.ctx, rowMatcher, colId);
  }
  getHeaderCell(colId) {
    return getHeaderCell(this.ctx, colId);
  }
  getFilterInput(colId) {
    return getFilterInput(this.ctx, colId);
  }
  // ─────────────────────────────────────────────────────────────────────────
  // Wait Utilities
  // ─────────────────────────────────────────────────────────────────────────
  async waitForReady(options) {
    await waitForReady(this.getGrid(), this.config, options);
  }
  async waitForDataLoaded(options) {
    await waitForDataLoaded(this.getGrid(), this.config, options);
  }
  async waitForRowCount(count, options) {
    await waitForRowCount(this.getGrid(), count, this.config, options);
  }
  async waitForRow(matcher, options) {
    return waitForRow(this.getGrid(), matcher, this.config, options);
  }
  // ─────────────────────────────────────────────────────────────────────────
  // Assertions
  // ─────────────────────────────────────────────────────────────────────────
  async expectRowCount(count, options) {
    await expectRowCount(this.getGrid(), count, this.config, options);
  }
  async expectRowContains(cellValues, options) {
    await expectRowContains(this.getGrid(), cellValues, this.config, options);
  }
  async expectRowNotContains(cellValues, options) {
    await expectRowNotContains(this.getGrid(), cellValues, this.config, options);
  }
  async expectCellValue(rowMatcher, colId, expectedValue, options) {
    await expectCellValue(this.getGrid(), rowMatcher, colId, expectedValue, this.config, options);
  }
  async expectSortedBy(colId, direction, options) {
    await expectSortedBy(this.getGrid(), colId, direction, this.config);
  }
  async expectEmpty(options) {
    await expectEmpty(this.getGrid(), this.config, options);
  }
  async expectRowSelected(matcher, options) {
    await expectRowSelected(this.getGrid(), matcher, this.config);
  }
  async expectNoRowsOverlay(options) {
    await expectNoRowsOverlay(this.getGrid(), this.config);
  }
  // ─────────────────────────────────────────────────────────────────────────
  // Actions (stubs - implemented in Phase 4)
  // ─────────────────────────────────────────────────────────────────────────
  async clickCell(rowMatcher, colId) {
    const cell = this.getCell(rowMatcher, colId);
    await cell.click();
  }
  async editCell(rowMatcher, colId, newValue) {
    const cell = this.getCell(rowMatcher, colId);
    await cell.dblclick();
    await cell.locator("input, textarea").fill(newValue);
    await cell.press("Enter");
  }
  async sortByColumn(colId, direction) {
    const header = this.getHeaderCell(colId);
    if (!direction) {
      await header.click();
      return;
    }
    for (let i = 0; i < 3; i++) {
      const currentSort = await header.getAttribute("aria-sort");
      if (direction === "asc" && currentSort === "ascending" || direction === "desc" && currentSort === "descending") {
        return;
      }
      await header.click();
      await this.page.waitForTimeout(100);
    }
  }
  async filterColumn(colId, filterValue) {
    const filterInput = this.getFilterInput(colId);
    await filterInput.fill(filterValue);
  }
  async clearFilter(colId) {
    const filterInput = this.getFilterInput(colId);
    await filterInput.clear();
  }
  async clearAllFilters() {
    const filterInputs = this.getGrid().locator(".ag-floating-filter input");
    const count = await filterInputs.count();
    for (let i = 0; i < count; i++) {
      await filterInputs.nth(i).clear();
    }
  }
  async selectRow(matcher) {
    const row = this.getRow(matcher);
    const checkbox = row.locator(".ag-selection-checkbox input");
    const checkboxCount = await checkbox.count();
    if (checkboxCount > 0) {
      await checkbox.check();
    } else {
      await row.click();
    }
    await this.page.waitForTimeout(50);
    const rowCount = await row.count();
    if (rowCount > 0) {
      const selected = await isRowSelected(row.first());
      if (!selected && checkboxCount > 0) {
        throw new Error(
          `Failed to select row matching: ${formatRowMatcher(matcher)}. Checkbox was checked but selection state did not change.`
        );
      }
    }
  }
  async deselectRow(matcher) {
    const row = this.getRow(matcher);
    const checkbox = row.locator(".ag-selection-checkbox input");
    const checkboxCount = await checkbox.count();
    if (checkboxCount > 0) {
      await checkbox.uncheck();
    }
  }
  async selectAllRows() {
    const selectAll = this.getGrid().locator(".ag-header-select-all input");
    await selectAll.check();
  }
  async deselectAllRows() {
    const selectAll = this.getGrid().locator(".ag-header-select-all input");
    await selectAll.uncheck();
  }
  async scrollToRow(matcher) {
    const row = this.getRow(matcher);
    await row.scrollIntoViewIfNeeded();
  }
  async scrollToColumn(colId) {
    const cell = this.getGrid().locator(`.ag-cell[col-id="${colId}"]`).first();
    await cell.scrollIntoViewIfNeeded();
  }
  // ─────────────────────────────────────────────────────────────────────────
  // Enterprise Features (stubs - implemented in Phase 6)
  // ─────────────────────────────────────────────────────────────────────────
  async expandGroup(matcher) {
    const row = this.getRow(matcher);
    const expandIcon = row.locator(".ag-group-contracted");
    await expandIcon.click();
  }
  async collapseGroup(matcher) {
    const row = this.getRow(matcher);
    const collapseIcon = row.locator(".ag-group-expanded");
    await collapseIcon.click();
  }
  async expandAllGroups() {
    const maxIterations = 100;
    let iterations = 0;
    while (iterations < maxIterations) {
      const contractedGroup = this.getGrid().locator(".ag-group-contracted").first();
      const count = await contractedGroup.count();
      if (count === 0) {
        break;
      }
      await contractedGroup.click();
      await this.page.waitForTimeout(50);
      iterations++;
    }
  }
  async collapseAllGroups() {
    const maxIterations = 100;
    let iterations = 0;
    while (iterations < maxIterations) {
      const expandedGroup = this.getGrid().locator(".ag-group-expanded").first();
      const count = await expandedGroup.count();
      if (count === 0) {
        break;
      }
      await expandedGroup.click();
      await this.page.waitForTimeout(50);
      iterations++;
    }
  }
  async getGroupChildCount(matcher) {
    const row = this.getRow(matcher);
    const childCountEl = row.locator(".ag-group-child-count");
    const count = await childCountEl.count();
    if (count > 0) {
      const text = await childCountEl.textContent();
      const match = text?.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    }
    return 0;
  }
  async expandMasterRow(matcher) {
    const row = this.getRow(matcher);
    const expandIcon = row.locator(".ag-group-contracted, .ag-row-group-expand");
    await expandIcon.click();
  }
  getDetailGrid(_masterRowMatcher) {
    const detailSelector = ".ag-details-row .ag-root-wrapper";
    return new _AgGridHelperImpl(this.page, {
      ...this.config,
      selector: detailSelector
    });
  }
  // ─────────────────────────────────────────────────────────────────────────
  // Data Extraction
  // ─────────────────────────────────────────────────────────────────────────
  async getCellValue(rowMatcher, colId) {
    const match = await findRowByMatcher(this.getGrid(), rowMatcher, this.config);
    if (!match) {
      const visibleCount = await this.getVisibleRows().count();
      throw new Error(
        `Could not find row matching: ${formatRowMatcher(rowMatcher)}. Grid has ${visibleCount} visible row(s).`
      );
    }
    return match.data.cells[colId];
  }
  async getRowData(matcher) {
    const match = await findRowByMatcher(this.getGrid(), matcher, this.config);
    if (!match) {
      const visibleCount = await this.getVisibleRows().count();
      throw new Error(
        `Could not find row matching: ${formatRowMatcher(matcher)}. Grid has ${visibleCount} visible row(s).`
      );
    }
    return match.data;
  }
  async getAllVisibleRowData() {
    return getAllVisibleRowData(this.getGrid(), this.config);
  }
  async getGridState() {
    return getGridState(this.getGrid(), this.config);
  }
  async getSelectedRowIds() {
    const selectedRows = this.getGrid().locator(".ag-row-selected");
    const count = await selectedRows.count();
    const ids = [];
    for (let i = 0; i < count; i++) {
      const rowId = await selectedRows.nth(i).getAttribute("row-id");
      if (rowId) {
        ids.push(rowId);
      }
    }
    return ids;
  }
};

// grid/ag-grid/factory.ts
var agGrid = (page, config) => {
  return new AgGridHelperImpl(page, config);
};

exports.DEFAULT_TIMEOUTS = DEFAULT_TIMEOUTS;
exports.agGrid = agGrid;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map