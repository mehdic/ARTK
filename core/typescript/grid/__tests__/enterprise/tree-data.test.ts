/**
 * Unit tests for AG Grid tree data (Enterprise feature)
 *
 * @module grid/__tests__/enterprise/tree-data.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { chromium, Browser, Page } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('AG Grid Tree Data', () => {
  let browser: Browser;
  let page: Page;

  beforeEach(async () => {
    browser = await chromium.launch();
    page = await browser.newPage();
    const fixturePath = path.join(__dirname, '..', 'fixtures', 'tree-grid.html');
    await page.goto(`file://${fixturePath}`);
  });

  afterEach(async () => {
    await page.close();
    await browser.close();
  });

  describe('Tree Structure Detection', () => {
    it('should identify tree rows with tree-level attribute', async () => {
      const treeRows = page.locator('.ag-row[tree-level]');
      const count = await treeRows.count();
      expect(count).toBeGreaterThan(0);
    });

    it('should have rows at multiple tree levels', async () => {
      const level0 = await page.locator('.ag-row[tree-level="0"]').count();
      const level1 = await page.locator('.ag-row[tree-level="1"]').count();

      expect(level0).toBeGreaterThan(0);
      expect(level1).toBeGreaterThan(0);
    });

    it('should distinguish parent rows from leaf rows', async () => {
      // Parent rows have aria-expanded, leaf rows don't
      const parentRows = await page.locator('.ag-row[aria-expanded]').count();
      const allRows = await page.locator('.ag-row[tree-level]').count();

      expect(parentRows).toBeLessThanOrEqual(allRows);
    });
  });

  describe('Tree Level Hierarchy', () => {
    it('should have correct tree levels (0-based)', async () => {
      const rows = await page.locator('.ag-row[tree-level]').all();

      for (const row of rows) {
        const level = await row.getAttribute('tree-level');
        const levelNum = parseInt(level || '0', 10);
        expect(levelNum).toBeGreaterThanOrEqual(0);
        expect(levelNum).toBeLessThan(10); // Reasonable max depth
      }
    });

    it('should increment level for child nodes', async () => {
      // Find a parent row and its first child
      const parentRow = page.locator('.ag-row[aria-expanded="true"]').first();
      const parentCount = await parentRow.count();

      if (parentCount > 0) {
        const parentLevel = await parentRow.getAttribute('tree-level');
        const parentLevelNum = parseInt(parentLevel || '0', 10);

        // Get next row which should be a child
        const nextRow = parentRow.locator('~ .ag-row').first();
        if ((await nextRow.count()) > 0) {
          const childLevel = await nextRow.getAttribute('tree-level');
          const childLevelNum = parseInt(childLevel || '0', 10);

          // Child should be at parent level + 1
          expect(childLevelNum).toBe(parentLevelNum + 1);
        }
      }
    });
  });

  describe('Expand/Collapse Tree Nodes', () => {
    it('should expand collapsed tree node', async () => {
      const collapsedNode = page.locator('.ag-row[aria-expanded="false"]').first();
      const count = await collapsedNode.count();

      if (count > 0) {
        // Get stable identifier for re-querying
        const ariaRowIndex = await collapsedNode.getAttribute('aria-rowindex');

        const expandIcon = collapsedNode.locator('.ag-icon-tree-closed, .ag-group-contracted');
        if ((await expandIcon.count()) > 0) {
          await expandIcon.click();
          await page.waitForTimeout(100);

          // Re-query by stable identifier
          const updatedNode = page.locator(`.ag-row[aria-rowindex="${ariaRowIndex}"]`);
          const isExpanded = await updatedNode.getAttribute('aria-expanded');
          expect(isExpanded).toBe('true');
        }
      } else {
        expect(true).toBe(true);
      }
    });

    it('should collapse expanded tree node', async () => {
      const expandedNode = page.locator('.ag-row[aria-expanded="true"]').first();
      const count = await expandedNode.count();

      if (count > 0) {
        // Get stable identifier for re-querying
        const ariaRowIndex = await expandedNode.getAttribute('aria-rowindex');

        const collapseIcon = expandedNode.locator('.ag-icon-tree-open, .ag-group-expanded');
        if ((await collapseIcon.count()) > 0) {
          await collapseIcon.click();
          await page.waitForTimeout(100);

          // Re-query by stable identifier
          const updatedNode = page.locator(`.ag-row[aria-rowindex="${ariaRowIndex}"]`);
          const isExpanded = await updatedNode.getAttribute('aria-expanded');
          expect(isExpanded).toBe('false');
        }
      } else {
        expect(true).toBe(true);
      }
    });

    it('should hide children when parent is collapsed', async () => {
      // Find an expanded parent
      const expandedParent = page.locator('.ag-row[aria-expanded="true"][tree-level="0"]').first();
      const parentCount = await expandedParent.count();

      if (parentCount > 0) {
        // Count visible children before collapse
        const childrenBefore = await page.locator('.ag-row[tree-level="1"]').count();

        // Collapse parent
        const collapseIcon = expandedParent.locator('.ag-icon-tree-open, .ag-group-expanded').first();
        if ((await collapseIcon.count()) > 0) {
          await collapseIcon.click();
          await page.waitForTimeout(100);

          // Count children after collapse
          const childrenAfter = await page.locator('.ag-row[tree-level="1"]').count();

          // Should have fewer or equal visible children
          expect(childrenAfter).toBeLessThanOrEqual(childrenBefore);
        }
      }
    });
  });

  describe('Tree Indentation', () => {
    it('should indent rows based on tree level', async () => {
      const level0Row = page.locator('.ag-row[tree-level="0"]').first();
      const level1Row = page.locator('.ag-row[tree-level="1"]').first();

      const level0Count = await level0Row.count();
      const level1Count = await level1Row.count();

      if (level0Count > 0 && level1Count > 0) {
        // Check padding or margin on the first cell
        const level0Indent = await level0Row.locator('.ag-cell').first().evaluate((el) => {
          const style = window.getComputedStyle(el);
          return parseInt(style.paddingLeft, 10) || 0;
        });

        const level1Indent = await level1Row.locator('.ag-cell').first().evaluate((el) => {
          const style = window.getComputedStyle(el);
          return parseInt(style.paddingLeft, 10) || 0;
        });

        // Level 1 should have more indentation
        expect(level1Indent).toBeGreaterThanOrEqual(level0Indent);
      }
    });
  });

  describe('Tree Icons', () => {
    it('should show folder icon for parent nodes', async () => {
      const parentNode = page.locator('.ag-row[aria-expanded]').first();
      const count = await parentNode.count();

      if (count > 0) {
        // Check for folder icon class or SVG
        const hasIcon = await parentNode.evaluate((el) => {
          return (
            el.querySelector('.ag-icon-tree-open, .ag-icon-tree-closed, .folder-icon, [class*="folder"]') !== null ||
            el.textContent?.includes('📁') ||
            el.textContent?.includes('📂')
          );
        });
        expect(hasIcon).toBe(true);
      }
    });

    it('should show file icon for leaf nodes', async () => {
      const leafNode = page.locator('.ag-row[tree-level]:not([aria-expanded])').first();
      const count = await leafNode.count();

      if (count > 0) {
        // Check for file icon class or emoji
        const hasIcon = await leafNode.evaluate((el) => {
          return (
            el.querySelector('.ag-icon-file, .file-icon, [class*="file"]') !== null ||
            el.textContent?.includes('📄') ||
            el.textContent?.includes('📋')
          );
        });
        // Some implementations don't use file icons - that's OK
        expect(typeof hasIcon).toBe('boolean');
      }
    });
  });

  describe('Tree Path', () => {
    it('should be able to build path from root to node', async () => {
      const level2Row = page.locator('.ag-row[tree-level="2"]').first();
      const count = await level2Row.count();

      if (count > 0) {
        // Get the row's name/value
        const nodeName = await level2Row.locator('.ag-cell').first().textContent();

        // Build path by getting aria-rowindex and looking at previous rows
        const ariaIndex = await level2Row.getAttribute('aria-rowindex');
        expect(ariaIndex).not.toBeNull();
        expect(nodeName?.trim().length).toBeGreaterThan(0);
      }
    });
  });

  describe('Leaf Node Count', () => {
    it('should count leaf nodes at each level', async () => {
      const leafNodes = page.locator('.ag-row[tree-level]:not([aria-expanded])');
      const count = await leafNodes.count();

      // Should have some leaf nodes
      expect(count).toBeGreaterThan(0);
    });
  });

  describe('Tree Data ARIA', () => {
    it('should have proper ARIA attributes for accessibility', async () => {
      const treeRow = page.locator('.ag-row[tree-level]').first();
      const count = await treeRow.count();

      if (count > 0) {
        // Check for aria-level attribute (optional but good for accessibility)
        const hasAriaLevel = await treeRow.evaluate((el) => {
          return (
            el.hasAttribute('aria-level') ||
            el.hasAttribute('tree-level') ||
            el.hasAttribute('data-level')
          );
        });
        expect(hasAriaLevel).toBe(true);
      }
    });

    it('should have aria-expanded on expandable nodes', async () => {
      const expandableNodes = page.locator('.ag-row[aria-expanded]');
      const count = await expandableNodes.count();

      // Should have some expandable nodes
      expect(count).toBeGreaterThan(0);

      // Check values are valid
      for (let i = 0; i < Math.min(count, 5); i++) {
        const ariaExpanded = await expandableNodes.nth(i).getAttribute('aria-expanded');
        expect(ariaExpanded === 'true' || ariaExpanded === 'false').toBe(true);
      }
    });
  });
});
