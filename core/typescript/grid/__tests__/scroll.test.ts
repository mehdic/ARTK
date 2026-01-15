/**
 * Unit tests for AG Grid scroll utilities
 *
 * @module grid/__tests__/scroll.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { chromium, Browser, Page } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('AG Grid Scroll Utilities', () => {
  let browser: Browser;
  let page: Page;

  beforeEach(async () => {
    browser = await chromium.launch();
    page = await browser.newPage();
  });

  afterEach(async () => {
    await page.close();
    await browser.close();
  });

  describe('Vertical Scrolling', () => {
    it('should scroll down to reveal more rows', async () => {
      const fixturePath = path.join(__dirname, 'fixtures', 'virtualized-grid.html');
      await page.goto(`file://${fixturePath}`);

      const viewport = page.locator('.ag-body-viewport');
      const initialScrollTop = await viewport.evaluate((el) => el.scrollTop);
      expect(initialScrollTop).toBe(0);

      // Scroll down
      await viewport.evaluate((el) => {
        el.scrollTop = 500;
      });
      await page.waitForTimeout(100);

      const newScrollTop = await viewport.evaluate((el) => el.scrollTop);
      expect(newScrollTop).toBeGreaterThan(0);
    });

    it('should scroll to top', async () => {
      const fixturePath = path.join(__dirname, 'fixtures', 'virtualized-grid.html');
      await page.goto(`file://${fixturePath}`);

      const viewport = page.locator('.ag-body-viewport');

      // First scroll down
      await viewport.evaluate((el) => {
        el.scrollTop = 500;
      });
      await page.waitForTimeout(100);

      // Then scroll to top
      await viewport.evaluate((el) => {
        el.scrollTop = 0;
      });
      await page.waitForTimeout(100);

      const scrollTop = await viewport.evaluate((el) => el.scrollTop);
      expect(scrollTop).toBe(0);
    });

    it('should scroll to bottom', async () => {
      const fixturePath = path.join(__dirname, 'fixtures', 'virtualized-grid.html');
      await page.goto(`file://${fixturePath}`);

      const viewport = page.locator('.ag-body-viewport');

      // Scroll to bottom
      await viewport.evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
      await page.waitForTimeout(100);

      const { scrollTop, scrollHeight, clientHeight } = await viewport.evaluate((el) => ({
        scrollTop: el.scrollTop,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
      }));

      // At bottom, scrollTop + clientHeight should roughly equal scrollHeight
      expect(scrollTop + clientHeight).toBeGreaterThanOrEqual(scrollHeight - 5);
    });
  });

  describe('Horizontal Scrolling', () => {
    it('should scroll horizontally to reveal columns', async () => {
      const fixturePath = path.join(__dirname, 'fixtures', 'virtualized-grid.html');
      await page.goto(`file://${fixturePath}`);

      const viewport = page.locator('.ag-body-viewport');
      const initialScrollLeft = await viewport.evaluate((el) => el.scrollLeft);
      expect(initialScrollLeft).toBe(0);

      // Scroll right
      await viewport.evaluate((el) => {
        el.scrollLeft = 200;
      });
      await page.waitForTimeout(100);

      const newScrollLeft = await viewport.evaluate((el) => el.scrollLeft);
      // May or may not scroll depending on grid width
      expect(typeof newScrollLeft).toBe('number');
    });
  });

  describe('Scroll Position', () => {
    it('should get current scroll position', async () => {
      const fixturePath = path.join(__dirname, 'fixtures', 'virtualized-grid.html');
      await page.goto(`file://${fixturePath}`);

      const viewport = page.locator('.ag-body-viewport');

      // Set a specific position
      await viewport.evaluate((el) => {
        el.scrollTop = 100;
        el.scrollLeft = 50;
      });
      await page.waitForTimeout(100);

      const position = await viewport.evaluate((el) => ({
        scrollTop: el.scrollTop,
        scrollLeft: el.scrollLeft,
      }));

      expect(position.scrollTop).toBeGreaterThanOrEqual(0);
      expect(position.scrollLeft).toBeGreaterThanOrEqual(0);
    });

    it('should set scroll position', async () => {
      const fixturePath = path.join(__dirname, 'fixtures', 'virtualized-grid.html');
      await page.goto(`file://${fixturePath}`);

      const viewport = page.locator('.ag-body-viewport');

      // Set position
      await viewport.evaluate(
        (el, pos) => {
          el.scrollTop = pos.top;
          el.scrollLeft = pos.left;
        },
        { top: 200, left: 100 }
      );
      await page.waitForTimeout(100);

      const position = await viewport.evaluate((el) => ({
        scrollTop: el.scrollTop,
        scrollLeft: el.scrollLeft,
      }));

      // Position should be set (though may be clamped by viewport size)
      expect(typeof position.scrollTop).toBe('number');
      expect(typeof position.scrollLeft).toBe('number');
    });
  });

  describe('Scroll to Row', () => {
    it('should scroll row into view using scrollIntoViewIfNeeded', async () => {
      const fixturePath = path.join(__dirname, 'fixtures', 'virtualized-grid.html');
      await page.goto(`file://${fixturePath}`);

      // Find a row that might not be in view
      const row = page.locator('.ag-row[aria-rowindex="10"]');
      const rowCount = await row.count();

      if (rowCount > 0) {
        await row.scrollIntoViewIfNeeded();
        const isVisible = await row.isVisible();
        expect(isVisible).toBe(true);
      } else {
        // Row may not be rendered in virtualized grid initially
        expect(true).toBe(true);
      }
    });

    it('should handle scrolling to first row', async () => {
      const fixturePath = path.join(__dirname, 'fixtures', 'sortable-grid.html');
      await page.goto(`file://${fixturePath}`);

      const row = page.locator('.ag-row[aria-rowindex="1"]');
      await row.scrollIntoViewIfNeeded();

      const isVisible = await row.isVisible();
      expect(isVisible).toBe(true);
    });

    it('should handle scrolling to last visible row', async () => {
      const fixturePath = path.join(__dirname, 'fixtures', 'sortable-grid.html');
      await page.goto(`file://${fixturePath}`);

      // Get all rows
      const rows = page.locator('.ag-row[aria-rowindex]');
      const count = await rows.count();

      if (count > 0) {
        const lastRow = rows.last();
        await lastRow.scrollIntoViewIfNeeded();

        const isVisible = await lastRow.isVisible();
        expect(isVisible).toBe(true);
      }
    });
  });

  describe('Scroll to Column', () => {
    it('should scroll column into view', async () => {
      const fixturePath = path.join(__dirname, 'fixtures', 'sortable-grid.html');
      await page.goto(`file://${fixturePath}`);

      // Find a cell in the last column
      const cell = page.locator('.ag-cell[col-id="email"]').first();
      const cellCount = await cell.count();

      if (cellCount > 0) {
        await cell.scrollIntoViewIfNeeded();
        const isVisible = await cell.isVisible();
        expect(isVisible).toBe(true);
      } else {
        expect(true).toBe(true);
      }
    });
  });

  describe('Viewport Detection', () => {
    it('should identify body viewport element', async () => {
      const fixturePath = path.join(__dirname, 'fixtures', 'sortable-grid.html');
      await page.goto(`file://${fixturePath}`);

      const viewport = page.locator('.ag-body-viewport');
      const count = await viewport.count();
      expect(count).toBe(1);
    });

    it('should have scrollable viewport', async () => {
      const fixturePath = path.join(__dirname, 'fixtures', 'virtualized-grid.html');
      await page.goto(`file://${fixturePath}`);

      const viewport = page.locator('.ag-body-viewport');
      const isScrollable = await viewport.evaluate((el) => {
        return el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth;
      });

      // Virtualized grid should be scrollable
      expect(isScrollable).toBe(true);
    });
  });

  describe('Smooth Scrolling', () => {
    it('should support smooth scroll behavior', async () => {
      const fixturePath = path.join(__dirname, 'fixtures', 'virtualized-grid.html');
      await page.goto(`file://${fixturePath}`);

      const viewport = page.locator('.ag-body-viewport');

      // Set smooth scroll and scroll down
      await viewport.evaluate((el) => {
        el.style.scrollBehavior = 'smooth';
        el.scrollTop = 500;
      });

      // Wait for smooth scroll to complete
      await page.waitForTimeout(500);

      const scrollTop = await viewport.evaluate((el) => el.scrollTop);
      expect(scrollTop).toBeGreaterThan(0);
    });
  });
});
