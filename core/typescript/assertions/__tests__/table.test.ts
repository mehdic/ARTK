/**
 * Unit tests for table assertion helpers
 *
 * Tests FR-022: Table row assertions with column matching
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { type Browser, chromium, type Page } from '@playwright/test';
import {
  expectTableEmpty,
  expectTableRowCount,
  expectTableToContainRow,
} from '../table.js';

describe('Table Assertions', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await chromium.launch();
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
  });

  afterEach(async () => {
    await page.close();
  });

  describe('expectTableToContainRow', () => {
    it('should find row with matching data using data-testid', async () => {
      await page.setContent(`
        <table data-testid="orders-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Status</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td data-testid="id">12345</td>
              <td data-testid="status">Active</td>
              <td data-testid="amount">99.99</td>
            </tr>
            <tr>
              <td data-testid="id">67890</td>
              <td data-testid="status">Pending</td>
              <td data-testid="amount">49.99</td>
            </tr>
          </tbody>
        </table>
      `);

      await expectTableToContainRow(page, 'orders-table', {
        id: '12345',
        status: 'Active',
      });
    });

    it('should find row with matching data using data-column', async () => {
      await page.setContent(`
        <table data-testid="users-table">
          <tbody>
            <tr>
              <td data-column="name">John Doe</td>
              <td data-column="email">john@example.com</td>
            </tr>
            <tr>
              <td data-column="name">Jane Smith</td>
              <td data-column="email">jane@example.com</td>
            </tr>
          </tbody>
        </table>
      `);

      await expectTableToContainRow(page, 'users-table', {
        name: 'Jane Smith',
        email: 'jane@example.com',
      });
    });

    it('should support partial match by default', async () => {
      await page.setContent(`
        <table data-testid="results-table">
          <tbody>
            <tr>
              <td data-testid="description">Test Result #12345</td>
            </tr>
          </tbody>
        </table>
      `);

      await expectTableToContainRow(page, 'results-table', {
        description: 'Result #12345',
      });
    });

    it('should support exact match when exact option is true', async () => {
      await page.setContent(`
        <table data-testid="products-table">
          <tbody>
            <tr>
              <td data-testid="name">Product A</td>
            </tr>
          </tbody>
        </table>
      `);

      await expectTableToContainRow(
        page,
        'products-table',
        { name: 'Product A' },
        { exact: true }
      );
    });

    it('should throw when exact match fails', async () => {
      await page.setContent(`
        <table data-testid="products-table">
          <tbody>
            <tr>
              <td data-testid="name">Product A (Special Edition)</td>
            </tr>
          </tbody>
        </table>
      `);

      await expect(async () => {
        await expectTableToContainRow(
          page,
          'products-table',
          { name: 'Product A' },
          { exact: true, timeout: 1000 }
        );
      }).rejects.toThrow();
    });

    it('should throw when no matching row is found', async () => {
      await page.setContent(`
        <table data-testid="orders-table">
          <tbody>
            <tr>
              <td data-testid="id">12345</td>
              <td data-testid="status">Active</td>
            </tr>
          </tbody>
        </table>
      `);

      await expect(async () => {
        await expectTableToContainRow(
          page,
          'orders-table',
          { id: '99999', status: 'Pending' },
          { timeout: 1000 }
        );
      }).rejects.toThrow('does not contain a row matching');
    });

    it('should throw when table has no rows', async () => {
      await page.setContent(`
        <table data-testid="empty-table" style="display: table;">
          <tbody></tbody>
        </table>
      `);

      await expect(async () => {
        await expectTableToContainRow(
          page,
          'empty-table',
          { id: '123' },
          { timeout: 1000 }
        );
      }).rejects.toThrow('has no data rows');
    });

    it('should work with CSS selector', async () => {
      await page.setContent(`
        <table class="data-table">
          <tbody>
            <tr>
              <td data-testid="value">Test Value</td>
            </tr>
          </tbody>
        </table>
      `);

      await expectTableToContainRow(page, '.data-table', { value: 'Test Value' });
    });

    it('should fallback to cell content matching when no data-testid', async () => {
      await page.setContent(`
        <table data-testid="simple-table">
          <tbody>
            <tr>
              <td>Row 1 Cell 1</td>
              <td>Row 1 Cell 2</td>
            </tr>
            <tr>
              <td>Row 2 Cell 1</td>
              <td>Row 2 Cell 2</td>
            </tr>
          </tbody>
        </table>
      `);

      await expectTableToContainRow(page, 'simple-table', {
        column1: 'Row 2 Cell 1',
      });
    });
  });

  describe('expectTableRowCount', () => {
    it('should pass when table has expected number of rows', async () => {
      await page.setContent(`
        <table data-testid="results-table">
          <tbody>
            <tr><td>Row 1</td></tr>
            <tr><td>Row 2</td></tr>
            <tr><td>Row 3</td></tr>
          </tbody>
        </table>
      `);

      await expectTableRowCount(page, 'results-table', 3);
    });

    it('should count only data rows (with td)', async () => {
      await page.setContent(`
        <table data-testid="complex-table">
          <thead>
            <tr><th>Header 1</th><th>Header 2</th></tr>
          </thead>
          <tbody>
            <tr><td>Data 1</td><td>Data 2</td></tr>
            <tr><td>Data 3</td><td>Data 4</td></tr>
          </tbody>
        </table>
      `);

      await expectTableRowCount(page, 'complex-table', 2);
    });

    it('should throw when row count does not match', async () => {
      await page.setContent(`
        <table data-testid="orders-table">
          <tbody>
            <tr><td>Order 1</td></tr>
            <tr><td>Order 2</td></tr>
          </tbody>
        </table>
      `);

      await expect(async () => {
        await expectTableRowCount(page, 'orders-table', 5, { timeout: 1000 });
      }).rejects.toThrow();
    });

    it('should pass when table is empty and expected count is 0', async () => {
      await page.setContent(`
        <table data-testid="empty-table" style="display: table;">
          <tbody></tbody>
        </table>
      `);

      await expectTableRowCount(page, 'empty-table', 0);
    });
  });

  describe('expectTableEmpty', () => {
    it('should pass when table has no rows', async () => {
      await page.setContent(`
        <table data-testid="empty-table" style="display: table;">
          <tbody></tbody>
        </table>
      `);

      await expectTableEmpty(page, 'empty-table');
    });

    it('should pass when table has only header rows', async () => {
      await page.setContent(`
        <table data-testid="header-only-table" style="display: table;">
          <thead>
            <tr><th>Header 1</th><th>Header 2</th></tr>
          </thead>
          <tbody></tbody>
        </table>
      `);

      await expectTableEmpty(page, 'header-only-table');
    });

    it('should throw when table has rows', async () => {
      await page.setContent(`
        <table data-testid="populated-table">
          <tbody>
            <tr><td>Data</td></tr>
          </tbody>
        </table>
      `);

      await expect(async () => {
        await expectTableEmpty(page, 'populated-table', { timeout: 1000 });
      }).rejects.toThrow();
    });
  });
});
