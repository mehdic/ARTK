/**
 * Integration tests for AG Grid Helper
 *
 * Tests the full flow of creating a helper and using it with fixtures.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { chromium, type Browser, type Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { agGrid } from '../ag-grid/index.js';

describe('AgGridHelper Integration', () => {
  let browser: Browser;
  let page: Page;
  const fixturesDir = path.join(__dirname, 'fixtures');

  beforeAll(async () => {
    browser = await chromium.launch();
    page = await browser.newPage();
  });

  afterAll(async () => {
    await browser.close();
  });

  describe('with basic-grid.html fixture', () => {
    beforeAll(async () => {
      const filePath = path.join(fixturesDir, 'basic-grid.html');
      await page.goto(`file://${filePath}`);
    });

    it('should create a grid helper with string selector', () => {
      const grid = agGrid(page, 'orders-grid');
      expect(grid).toBeDefined();
      expect(grid.getGrid).toBeDefined();
    });

    it('should locate the grid root', async () => {
      const grid = agGrid(page, 'orders-grid');
      const gridLocator = grid.getGrid();
      const isVisible = await gridLocator.isVisible();
      expect(isVisible).toBe(true);
    });

    it('should wait for grid ready', async () => {
      const grid = agGrid(page, 'orders-grid');
      await grid.waitForReady({ timeout: 5000 });
      // If no error, grid is ready
    });

    it('should count rows correctly', async () => {
      const grid = agGrid(page, 'orders-grid');
      await grid.expectRowCount(10);
    });

    it('should find row by cell values', async () => {
      const grid = agGrid(page, 'orders-grid');
      await grid.expectRowContains({ orderId: 'ORD-001', customer: 'Acme Corp' });
    });

    it('should verify cell value', async () => {
      const grid = agGrid(page, 'orders-grid');
      await grid.expectCellValue({ rowIndex: 0 }, 'orderId', 'ORD-001');
    });

    it('should get all visible row data', async () => {
      const grid = agGrid(page, 'orders-grid');
      const allData = await grid.getAllVisibleRowData();

      expect(allData).toHaveLength(10);
      expect(allData[0].cells.orderId).toBe('ORD-001');
      expect(allData[0].ariaRowIndex).toBe(1);
    });

    it('should get grid state', async () => {
      const grid = agGrid(page, 'orders-grid');
      const state = await grid.getGridState();

      expect(state.visibleRows).toBe(10);
      expect(state.selectedRows).toBe(0);
      expect(state.isLoading).toBe(false);
    });

    it('should locate specific cells', async () => {
      const grid = agGrid(page, 'orders-grid');
      const cell = grid.getCell({ rowIndex: 0 }, 'status');
      const text = await cell.textContent();
      expect(text).toBe('Active');
    });

    it('should locate header cells', async () => {
      const grid = agGrid(page, 'orders-grid');
      const header = grid.getHeaderCell('customer');
      const text = await header.textContent();
      expect(text).toBe('Customer');
    });

    it('should fail with actionable error when row not found', async () => {
      const grid = agGrid(page, 'orders-grid');

      await expect(
        grid.expectRowContains({ orderId: 'NONEXISTENT' }, { timeout: 500 })
      ).rejects.toThrow(/does not contain a row matching/);
    });

    it('should support config with column definitions', () => {
      const grid = agGrid(page, {
        selector: 'orders-grid',
        columns: [
          { colId: 'orderId', displayName: 'Order ID', type: 'text' },
          { colId: 'amount', displayName: 'Amount', type: 'number' },
        ],
      });

      expect(grid).toBeDefined();
    });
  });

  describe('with empty-grid.html fixture', () => {
    beforeAll(async () => {
      const filePath = path.join(fixturesDir, 'empty-grid.html');
      await page.goto(`file://${filePath}`);
    });

    it('should detect empty grid', async () => {
      const grid = agGrid(page, 'empty-grid');
      await grid.expectEmpty();
    });

    it('should have zero row count', async () => {
      const grid = agGrid(page, 'empty-grid');
      await grid.expectRowCount(0);
    });

    it('should detect no rows overlay', async () => {
      const grid = agGrid(page, 'empty-grid');
      await grid.expectNoRowsOverlay();
    });
  });
});
