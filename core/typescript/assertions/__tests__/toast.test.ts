/**
 * Unit tests for toast assertion helpers
 *
 * Tests FR-021: Toast/notification assertions with type detection
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { type Browser, chromium, type Page } from '@playwright/test';
import { expectNoToast, expectToast, waitForToastDismiss } from '../toast.js';
import type { ARTKConfig } from '../../config/types.js';

describe('Toast Assertions', () => {
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

  describe('expectToast', () => {
    it('should pass when toast with message is visible', async () => {
      // Set up page with toast
      await page.setContent(`
        <div role="alert" data-type="success">
          <div class="toast-message">Order created successfully</div>
        </div>
      `);

      // Should not throw
      await expectToast(page, 'Order created successfully');
    });

    it('should pass with partial message match by default', async () => {
      await page.setContent(`
        <div role="alert">
          <div class="toast-message">Order #12345 created successfully</div>
        </div>
      `);

      await expectToast(page, 'created successfully');
    });

    it('should pass with exact message when exact option is true', async () => {
      await page.setContent(`
        <div role="alert">
          <div class="toast-message">Success</div>
        </div>
      `);

      await expectToast(page, 'Success', { exact: true });
    });

    it('should verify toast type when type option is provided', async () => {
      await page.setContent(`
        <div role="alert" data-type="success">
          <div class="toast-message">Success message</div>
        </div>
      `);

      await expectToast(page, 'Success message', { type: 'success' });
    });

    it('should throw when toast type does not match', async () => {
      await page.setContent(`
        <div role="alert" data-type="error">
          <div class="toast-message">Error message</div>
        </div>
      `);

      await expect(async () => {
        await expectToast(page, 'Error message', { type: 'success' });
      }).rejects.toThrow('Expected toast type "success" but got "error"');
    });

    it('should throw when toast is not visible', async () => {
      await page.setContent(`
        <div role="alert" style="display: none;">
          <div class="toast-message">Hidden toast</div>
        </div>
      `);

      await expect(async () => {
        await expectToast(page, 'Hidden toast', { timeout: 1000 });
      }).rejects.toThrow();
    });

    it('should throw when message does not match with exact option', async () => {
      await page.setContent(`
        <div role="alert">
          <div class="toast-message">Order created successfully</div>
        </div>
      `);

      await expect(async () => {
        await expectToast(page, 'Success', { exact: true, timeout: 1000 });
      }).rejects.toThrow();
    });

    it('should use custom config when provided', async () => {
      const customConfig: Partial<ARTKConfig> = {
        assertions: {
          toast: {
            containerSelector: '.custom-toast',
            messageSelector: '.custom-message',
            typeAttribute: 'data-toast-type',
          },
          loading: { selectors: [] },
          form: { errorSelector: '', formErrorSelector: '' },
        },
      };

      await page.setContent(`
        <div class="custom-toast" data-toast-type="info">
          <div class="custom-message">Custom toast</div>
        </div>
      `);

      await expectToast(page, 'Custom toast', { type: 'info' }, customConfig as ARTKConfig);
    });
  });

  describe('expectNoToast', () => {
    it('should pass when no toast is visible', async () => {
      await page.setContent('<div>No toasts here</div>');

      await expectNoToast(page);
    });

    it('should pass when toast exists but is hidden', async () => {
      await page.setContent(`
        <div role="alert" style="display: none;">
          <div class="toast-message">Hidden toast</div>
        </div>
      `);

      await expectNoToast(page);
    });

    it('should throw when toast is visible', async () => {
      await page.setContent(`
        <div role="alert">
          <div class="toast-message">Visible toast</div>
        </div>
      `);

      await expect(async () => {
        await expectNoToast(page, undefined, 2000);
      }).rejects.toThrow();
    });

    it('should use custom config when provided', async () => {
      const customConfig: Partial<ARTKConfig> = {
        assertions: {
          toast: {
            containerSelector: '.custom-toast',
            messageSelector: '.custom-message',
            typeAttribute: 'data-toast-type',
          },
          loading: { selectors: [] },
          form: { errorSelector: '', formErrorSelector: '' },
        },
      };

      await page.setContent(`
        <div role="alert">Standard toast (should be ignored)</div>
        <div class="custom-toast" style="display: none;">Hidden custom toast</div>
      `);

      await expectNoToast(page, customConfig as ARTKConfig);
    });
  });

  describe('waitForToastDismiss', () => {
    // TIMING NOTE: Use 1000ms minimum for transient elements in tests.
    // Shorter values (100-200ms) cause race conditions where the element
    // may be removed before Playwright's assertion can detect it,
    // especially under CI load or slow VMs. The assertion timeout should
    // always exceed the element's lifetime by at least 1000ms buffer.

    it('should wait for toast to appear and then disappear', async () => {
      await page.setContent('<div id="container"></div>');

      await page.evaluate(() => {
        const container = document.getElementById('container');
        if (container) {
          const toast = document.createElement('div');
          toast.setAttribute('role', 'alert');
          toast.innerHTML = '<div class="toast-message">Auto-dismiss toast</div>';
          container.appendChild(toast);

          setTimeout(() => {
            toast.remove();
          }, 1000);
        }
      });

      await waitForToastDismiss(page, 'Auto-dismiss toast', { timeout: 3000 });

      // Toast should be gone
      await expectNoToast(page);
    });

    it('should verify toast type before waiting for dismiss', async () => {
      await page.setContent('<div id="container"></div>');

      await page.evaluate(() => {
        const container = document.getElementById('container');
        if (container) {
          const toast = document.createElement('div');
          toast.setAttribute('role', 'alert');
          toast.setAttribute('data-type', 'success');
          toast.innerHTML = '<div class="toast-message">Success toast</div>';
          container.appendChild(toast);

          setTimeout(() => {
            toast.remove();
          }, 1000);
        }
      });

      await waitForToastDismiss(page, 'Success toast', {
        type: 'success',
        timeout: 3000,
      });

      await expectNoToast(page);
    });
  });
});
