/**
 * AG Grid Cell Value Extraction
 *
 * Provides utilities for extracting values from cells, including
 * support for custom cell renderers.
 *
 * @module grid/ag-grid/cell-renderers
 */
import type { Locator } from '@playwright/test';
import type { CellRendererConfig, NormalizedAgGridConfig } from '../types.js';
/**
 * Built-in cell renderer extractors for common patterns
 */
export declare const BUILT_IN_EXTRACTORS: Record<string, CellRendererConfig>;
/**
 * Extract the value from a cell, handling custom renderers
 *
 * @param cellLocator - The cell locator
 * @param config - Normalized grid configuration
 * @param colId - Column ID (for column-specific extractors)
 * @returns The extracted cell value
 */
export declare function extractCellValue(cellLocator: Locator, config: NormalizedAgGridConfig, colId?: string): Promise<string>;
/**
 * Normalize text content by trimming and collapsing whitespace
 *
 * @param text - Raw text content
 * @returns Normalized text
 */
export declare function normalizeText(text: string | null): string;
/**
 * Get a cell value by column ID from a row
 *
 * @param rowLocator - The row locator
 * @param colId - Column ID
 * @param config - Normalized grid configuration
 * @returns The cell value
 */
export declare function getCellValueByColId(rowLocator: Locator, colId: string, config: NormalizedAgGridConfig): Promise<string>;
/**
 * Get all cell values for a row
 *
 * @param rowLocator - The row locator
 * @param config - Normalized grid configuration
 * @returns Object mapping column IDs to values
 */
export declare function getAllCellValues(rowLocator: Locator, config: NormalizedAgGridConfig): Promise<Record<string, unknown>>;
/**
 * Parse a cell value based on column type
 *
 * @param value - The string value
 * @param type - The column type
 * @returns Parsed value
 */
export declare function parseValueByType(value: string, type?: 'text' | 'number' | 'date' | 'boolean' | 'custom'): unknown;
//# sourceMappingURL=cell-renderers.d.ts.map