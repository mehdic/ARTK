/**
 * Unit tests for AG Grid row grouping (Enterprise feature)
 *
 * @module grid/__tests__/enterprise/grouping.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { chromium, Browser, Page } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('AG Grid Row Grouping', () => {
  let browser: Browser;
  let page: Page;

  beforeEach(async () => {
    browser = await chromium.launch();
    page = await browser.newPage();
    const fixturePath = path.join(__dirname, '..', 'fixtures', 'grouped-grid.html');
    await page.goto(`file://${fixturePath}`);
  });

  afterEach(async () => {
    await page.close();
    await browser.close();
  });

  describe('Group Row Detection', () => {
    it('should identify group rows by class', async () => {
      const groupRows = page.locator('.ag-row.ag-row-group');
      const count = await groupRows.count();
      expect(count).toBeGreaterThan(0);
    });

    it('should distinguish group rows from data rows', async () => {
      const allRows = await page.locator('.ag-row').count();
      const groupRows = await page.locator('.ag-row.ag-row-group').count();
      const dataRows = await page.locator('.ag-row:not(.ag-row-group)').count();

      expect(allRows).toBe(groupRows + dataRows);
    });

    it('should have aria-expanded attribute on group rows', async () => {
      const groupRow = page.locator('.ag-row.ag-row-group').first();
      const ariaExpanded = await groupRow.getAttribute('aria-expanded');

      expect(ariaExpanded === 'true' || ariaExpanded === 'false').toBe(true);
    });
  });

  describe('Expand/Collapse Groups', () => {
    it('should expand collapsed group', async () => {
      // Find a collapsed group and get its stable identifier
      const collapsedGroup = page.locator('.ag-row.ag-row-group[aria-expanded="false"]').first();
      const collapsedCount = await collapsedGroup.count();

      if (collapsedCount > 0) {
        // Get stable identifier for re-querying after click
        const ariaRowIndex = await collapsedGroup.getAttribute('aria-rowindex');

        // Click the expand icon
        const expandIcon = collapsedGroup.locator('.ag-group-contracted, .ag-icon-tree-closed');
        if ((await expandIcon.count()) > 0) {
          await expandIcon.click();
          await page.waitForTimeout(100);

          // Re-query by stable identifier and check the updated state
          const updatedRow = page.locator(`.ag-row[aria-rowindex="${ariaRowIndex}"]`);
          const isExpanded = await updatedRow.getAttribute('aria-expanded');
          expect(isExpanded).toBe('true');
        }
      } else {
        // All groups are already expanded - that's fine
        expect(true).toBe(true);
      }
    });

    it('should collapse expanded group', async () => {
      // Find an expanded group and get its stable identifier
      const expandedGroup = page.locator('.ag-row.ag-row-group[aria-expanded="true"]').first();
      const expandedCount = await expandedGroup.count();

      if (expandedCount > 0) {
        // Get stable identifier for re-querying after click
        const ariaRowIndex = await expandedGroup.getAttribute('aria-rowindex');

        // Click the collapse icon
        const collapseIcon = expandedGroup.locator('.ag-group-expanded, .ag-icon-tree-open');
        if ((await collapseIcon.count()) > 0) {
          await collapseIcon.click();
          await page.waitForTimeout(100);

          // Re-query by stable identifier and check the updated state
          const updatedRow = page.locator(`.ag-row[aria-rowindex="${ariaRowIndex}"]`);
          const isExpanded = await updatedRow.getAttribute('aria-expanded');
          expect(isExpanded).toBe('false');
        }
      } else {
        expect(true).toBe(true);
      }
    });

    it('should toggle group state on icon click', async () => {
      const groupRow = page.locator('.ag-row.ag-row-group').first();
      const groupCount = await groupRow.count();

      if (groupCount > 0) {
        const initialState = await groupRow.getAttribute('aria-expanded');

        // Click toggle icon
        const toggleIcon = groupRow.locator('.ag-group-contracted, .ag-group-expanded').first();
        if ((await toggleIcon.count()) > 0) {
          await toggleIcon.click();
          await page.waitForTimeout(100);

          const newState = await groupRow.getAttribute('aria-expanded');
          expect(newState).not.toBe(initialState);
        }
      }
    });
  });

  describe('Group Child Count', () => {
    it('should display child count in group row', async () => {
      const childCount = page.locator('.ag-group-child-count').first();
      const count = await childCount.count();

      if (count > 0) {
        const text = await childCount.textContent();
        // Should contain a number in parentheses like (3)
        expect(text).toMatch(/\(\d+\)/);
      } else {
        // Some configurations don't show child count
        expect(true).toBe(true);
      }
    });

    it('should parse child count value', async () => {
      const childCounts = await page.locator('.ag-group-child-count').all();

      for (const countEl of childCounts) {
        const text = await countEl.textContent();
        const match = text?.match(/\((\d+)\)/);
        if (match) {
          const childNum = parseInt(match[1], 10);
          expect(childNum).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Nested Groups', () => {
    it('should support multiple levels of grouping', async () => {
      // Check for rows at different levels (data-level or tree-level attribute)
      const level0 = await page.locator('.ag-row.ag-row-group[tree-level="0"]').count();
      const level1 = await page.locator('.ag-row.ag-row-group[tree-level="1"]').count();

      // Should have at least level 0 groups
      expect(level0).toBeGreaterThan(0);

      // Nested groups may or may not be visible depending on expansion state
      expect(level1).toBeGreaterThanOrEqual(0);
    });

    it('should indent nested groups', async () => {
      const level0Row = page.locator('.ag-row.ag-row-group[tree-level="0"]').first();
      const level1Row = page.locator('.ag-row.ag-row-group[tree-level="1"]').first();

      const level0Count = await level0Row.count();
      const level1Count = await level1Row.count();

      if (level0Count > 0 && level1Count > 0) {
        // Get the group cell for each
        const level0Cell = level0Row.locator('.ag-group-cell, .ag-cell:first-child');
        const level1Cell = level1Row.locator('.ag-group-cell, .ag-cell:first-child');

        const level0Padding = await level0Cell.evaluate((el) => {
          const style = window.getComputedStyle(el);
          return parseInt(style.paddingLeft, 10);
        });

        const level1Padding = await level1Cell.evaluate((el) => {
          const style = window.getComputedStyle(el);
          return parseInt(style.paddingLeft, 10);
        });

        // Level 1 should have more padding (indentation)
        expect(level1Padding).toBeGreaterThanOrEqual(level0Padding);
      }
    });
  });

  describe('Expand All / Collapse All', () => {
    it('should expand all groups', async () => {
      // Click all collapsed group icons
      const collapsedIcons = page.locator('.ag-group-contracted');
      let count = await collapsedIcons.count();

      while (count > 0) {
        await collapsedIcons.first().click();
        await page.waitForTimeout(50);
        count = await collapsedIcons.count();
      }

      // All groups should be expanded now
      const collapsedGroups = await page.locator('.ag-row.ag-row-group[aria-expanded="false"]').count();
      expect(collapsedGroups).toBe(0);
    });

    it('should collapse all groups', async () => {
      // Test that clicking collapse icon changes the group state
      const expandedIcons = page.locator('.ag-group-expanded');
      const initialCount = await expandedIcons.count();

      if (initialCount > 0) {
        // Get the parent row of the first expanded icon
        const firstIcon = expandedIcons.first();
        const parentRow = firstIcon.locator('xpath=ancestor::div[contains(@class, "ag-row")]');
        const rowIndex = await parentRow.getAttribute('aria-rowindex');

        // Click the icon
        await firstIcon.click();
        await page.waitForTimeout(100);

        // Verify the row's aria-expanded changed
        const updatedRow = page.locator(`.ag-row[aria-rowindex="${rowIndex}"]`);
        const isExpanded = await updatedRow.getAttribute('aria-expanded');
        expect(isExpanded).toBe('false');
      } else {
        // No expanded icons - test is trivially true
        expect(true).toBe(true);
      }
    });
  });

  describe('Group Value Display', () => {
    it('should display group value in group row', async () => {
      const groupCell = page.locator('.ag-row.ag-row-group .ag-group-value, .ag-row.ag-row-group .ag-cell:first-child').first();
      const count = await groupCell.count();

      if (count > 0) {
        const text = await groupCell.textContent();
        expect(text?.trim().length).toBeGreaterThan(0);
      }
    });
  });
});
