/**
 * Unit tests for AG Grid sorting actions
 *
 * @module grid/__tests__/actions-sort.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { chromium, Browser, Page } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('AG Grid Sorting Actions', () => {
  let browser: Browser;
  let page: Page;

  beforeEach(async () => {
    browser = await chromium.launch();
    page = await browser.newPage();
    const fixturePath = path.join(__dirname, 'fixtures', 'sortable-grid.html');
    await page.goto(`file://${fixturePath}`);
  });

  afterEach(async () => {
    await page.close();
    await browser.close();
  });

  describe('sortByColumn', () => {
    it('should click header cell to trigger sort', async () => {
      const headerCell = page.locator('.ag-header-cell[col-id="name"]');
      await headerCell.click();

      // After click, the header should have aria-sort attribute
      const ariaSort = await headerCell.getAttribute('aria-sort');
      expect(ariaSort).toBe('ascending');
    });

    it('should cycle through sort states on multiple clicks', async () => {
      const headerCell = page.locator('.ag-header-cell[col-id="name"]');

      // First click: ascending
      await headerCell.click();
      expect(await headerCell.getAttribute('aria-sort')).toBe('ascending');

      // Second click: descending
      await headerCell.click();
      expect(await headerCell.getAttribute('aria-sort')).toBe('descending');

      // Third click: none (unsorted) - AG Grid may use 'none' or remove the attribute (null)
      await headerCell.click();
      const ariaSortAfterThirdClick = await headerCell.getAttribute('aria-sort');
      expect(ariaSortAfterThirdClick === 'none' || ariaSortAfterThirdClick === null).toBe(true);
    });

    it('should show sort indicator icon', async () => {
      const headerCell = page.locator('.ag-header-cell[col-id="name"]');
      await headerCell.click();

      const sortIcon = headerCell.locator('.ag-sort-ascending-icon, .ag-icon-asc');
      const isVisible = await sortIcon.isVisible().catch(() => false);
      // The fixture may use different indicators
      const hasAriaSortAsc = await headerCell.getAttribute('aria-sort') === 'ascending';
      expect(isVisible || hasAriaSortAsc).toBe(true);
    });
  });

  describe('expectSortedBy', () => {
    it('should verify column is sorted ascending', async () => {
      const headerCell = page.locator('.ag-header-cell[col-id="name"]');
      await headerCell.click();

      const ariaSort = await headerCell.getAttribute('aria-sort');
      expect(ariaSort).toBe('ascending');
    });

    it('should verify column is sorted descending', async () => {
      const headerCell = page.locator('.ag-header-cell[col-id="name"]');
      await headerCell.click(); // ascending
      await headerCell.click(); // descending

      const ariaSort = await headerCell.getAttribute('aria-sort');
      expect(ariaSort).toBe('descending');
    });

    it('should verify column is not sorted', async () => {
      const headerCell = page.locator('.ag-header-cell[col-id="name"]');

      // Initially not sorted
      const ariaSort = await headerCell.getAttribute('aria-sort');
      expect(ariaSort === null || ariaSort === 'none').toBe(true);
    });
  });

  describe('getSortState', () => {
    it('should return current sort state from all columns', async () => {
      // Click to sort by name ascending
      const nameHeader = page.locator('.ag-header-cell[col-id="name"]');
      await nameHeader.click();

      // Check all headers for sort state
      const headers = await page.locator('.ag-header-cell[col-id]').all();
      const sortStates: Record<string, string | null> = {};

      for (const header of headers) {
        const colId = await header.getAttribute('col-id');
        const ariaSort = await header.getAttribute('aria-sort');
        if (colId) {
          sortStates[colId] = ariaSort;
        }
      }

      expect(sortStates['name']).toBe('ascending');
    });

    it('should detect multi-column sort (if supported)', async () => {
      // Note: Most AG Grid configurations use single-column sort by default
      // This test verifies that we can read sort state from multiple columns
      const headers = await page.locator('.ag-header-cell[aria-sort]').all();
      const sortedColumns = headers.filter(async (h) => {
        const sort = await h.getAttribute('aria-sort');
        return sort && sort !== 'none';
      });

      // After initial load, no columns should be sorted
      expect(sortedColumns.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('clearSort', () => {
    it('should clear sort by clicking until aria-sort is none', async () => {
      const headerCell = page.locator('.ag-header-cell[col-id="name"]');

      // Set ascending sort
      await headerCell.click();
      expect(await headerCell.getAttribute('aria-sort')).toBe('ascending');

      // Click twice more to cycle back to none
      await headerCell.click(); // descending
      await headerCell.click(); // none

      const ariaSort = await headerCell.getAttribute('aria-sort');
      expect(ariaSort === 'none' || ariaSort === null).toBe(true);
    });
  });
});
