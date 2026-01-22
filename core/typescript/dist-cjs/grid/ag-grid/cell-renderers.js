"use strict";
/**
 * AG Grid Cell Value Extraction
 *
 * Provides utilities for extracting values from cells, including
 * support for custom cell renderers.
 *
 * @module grid/ag-grid/cell-renderers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BUILT_IN_EXTRACTORS = void 0;
exports.extractCellValue = extractCellValue;
exports.normalizeText = normalizeText;
exports.getCellValueByColId = getCellValueByColId;
exports.getAllCellValues = getAllCellValues;
exports.parseValueByType = parseValueByType;
/**
 * Built-in cell renderer extractors for common patterns
 */
exports.BUILT_IN_EXTRACTORS = {
    // Checkbox cell
    checkbox: {
        valueSelector: 'input[type="checkbox"]',
        extractValue: async (el) => String(await el.isChecked()),
    },
    // Link/anchor cell
    link: {
        valueSelector: 'a',
        extractValue: async (el) => (await el.textContent())?.trim() ?? '',
    },
    // Input cell (for inline editing)
    input: {
        valueSelector: 'input:not([type="checkbox"])',
        extractValue: async (el) => await el.inputValue(),
    },
    // Select/dropdown cell
    select: {
        valueSelector: 'select',
        extractValue: async (el) => await el.inputValue(),
    },
    // Badge/tag cell
    badge: {
        valueSelector: '.badge, .tag, .chip, .label',
        extractValue: async (el) => (await el.textContent())?.trim() ?? '',
    },
    // Button cell
    button: {
        valueSelector: 'button',
        extractValue: async (el) => (await el.textContent())?.trim() ?? '',
    },
};
/**
 * Extract the value from a cell, handling custom renderers
 *
 * @param cellLocator - The cell locator
 * @param config - Normalized grid configuration
 * @param colId - Column ID (for column-specific extractors)
 * @returns The extracted cell value
 */
async function extractCellValue(cellLocator, config, colId) {
    // Check for column-specific custom renderer
    if (colId && config.cellRenderers?.[colId]) {
        const renderer = config.cellRenderers[colId];
        return extractWithRenderer(cellLocator, renderer);
    }
    // Check for column definition with valueExtractor
    if (colId && config.columns) {
        const column = config.columns.find((c) => c.colId === colId);
        if (column?.valueExtractor) {
            return column.valueExtractor(cellLocator);
        }
    }
    // Try built-in extractors based on cell content
    for (const [, extractor] of Object.entries(exports.BUILT_IN_EXTRACTORS)) {
        const element = cellLocator.locator(extractor.valueSelector);
        const count = await element.count();
        if (count > 0 && extractor.extractValue) {
            return extractor.extractValue(element.first());
        }
    }
    // Fall back to text content with whitespace normalization
    return normalizeText(await cellLocator.textContent());
}
/**
 * Extract value using a specific renderer configuration
 *
 * @param cellLocator - The cell locator
 * @param renderer - The renderer configuration
 * @returns The extracted value
 */
async function extractWithRenderer(cellLocator, renderer) {
    const element = cellLocator.locator(renderer.valueSelector);
    if (renderer.extractValue) {
        return renderer.extractValue(element.first());
    }
    // Default to text content
    return normalizeText(await element.first().textContent());
}
/**
 * Normalize text content by trimming and collapsing whitespace
 *
 * @param text - Raw text content
 * @returns Normalized text
 */
function normalizeText(text) {
    if (!text)
        return '';
    return text.replace(/\s+/g, ' ').trim();
}
/**
 * Get a cell value by column ID from a row
 *
 * @param rowLocator - The row locator
 * @param colId - Column ID
 * @param config - Normalized grid configuration
 * @returns The cell value
 */
async function getCellValueByColId(rowLocator, colId, config) {
    const cellLocator = rowLocator.locator(`.ag-cell[col-id="${colId}"]`);
    return extractCellValue(cellLocator, config, colId);
}
/**
 * Get all cell values for a row
 *
 * @param rowLocator - The row locator
 * @param config - Normalized grid configuration
 * @returns Object mapping column IDs to values
 */
async function getAllCellValues(rowLocator, config) {
    const cells = rowLocator.locator('.ag-cell');
    const cellCount = await cells.count();
    const values = {};
    for (let i = 0; i < cellCount; i++) {
        const cell = cells.nth(i);
        const colId = await cell.getAttribute('col-id');
        if (colId) {
            values[colId] = await extractCellValue(cell, config, colId);
        }
    }
    return values;
}
/**
 * Parse a cell value based on column type
 *
 * @param value - The string value
 * @param type - The column type
 * @returns Parsed value
 */
function parseValueByType(value, type) {
    if (!type || type === 'text' || type === 'custom') {
        return value;
    }
    if (type === 'number') {
        // Handle formatted numbers (remove currency symbols, commas)
        const numStr = value.replace(/[^0-9.-]/g, '');
        const parsed = parseFloat(numStr);
        return isNaN(parsed) ? value : parsed;
    }
    if (type === 'boolean') {
        const lower = value.toLowerCase();
        if (lower === 'true' || lower === 'yes' || lower === '1')
            return true;
        if (lower === 'false' || lower === 'no' || lower === '0')
            return false;
        return value;
    }
    if (type === 'date') {
        const date = new Date(value);
        return isNaN(date.getTime()) ? value : date;
    }
    return value;
}
//# sourceMappingURL=cell-renderers.js.map