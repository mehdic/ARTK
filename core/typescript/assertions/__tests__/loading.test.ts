/**
 * Unit tests for loading state assertion helpers
 *
 * Tests FR-024: Loading state assertions with configurable selectors
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { type Browser, chromium, type Page } from '@playwright/test';
import {
  expectLoading,
  expectNotLoading,
  waitForLoadingComplete,
  waitForLoadingOperation,
} from '../loading.js';
import type { ARTKConfig } from '../../config/types.js';

describe('Loading State Assertions', () => {
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

  describe('expectLoading', () => {
    it('should pass when loading indicator is visible with data-loading', async () => {
      await page.setContent(`
        <div data-loading="true">Loading...</div>
      `);

      await expectLoading(page);
    });

    it('should pass when loading indicator has .loading class', async () => {
      await page.setContent(`
        <div class="loading">Loading...</div>
      `);

      await expectLoading(page);
    });

    it('should pass when loading indicator has .spinner class', async () => {
      await page.setContent(`
        <div class="spinner">Loading...</div>
      `);

      await expectLoading(page);
    });

    it('should pass when loading indicator has aria-busy="true"', async () => {
      await page.setContent(`
        <div aria-busy="true">Loading...</div>
      `);

      await expectLoading(page);
    });

    it('should pass when loading indicator has role="progressbar"', async () => {
      await page.setContent(`
        <div role="progressbar">Loading...</div>
      `);

      await expectLoading(page);
    });

    it('should work with custom selectors', async () => {
      await page.setContent(`
        <div class="custom-loader">Loading...</div>
      `);

      await expectLoading(page, {
        selectors: ['.custom-loader'],
      });
    });

    it('should work with config selectors', async () => {
      const customConfig: Partial<ARTKConfig> = {
        assertions: {
          loading: {
            selectors: ['.app-loading'],
          },
          toast: { containerSelector: '', messageSelector: '', typeAttribute: '' },
          form: { errorSelector: '', formErrorSelector: '' },
        },
      };

      await page.setContent(`
        <div class="app-loading">Loading...</div>
      `);

      await expectLoading(page, {}, customConfig as ARTKConfig);
    });

    it('should throw when no loading indicator is visible', async () => {
      await page.setContent(`
        <div>No loading here</div>
      `);

      await expect(async () => {
        await expectLoading(page, { timeout: 1000 });
      }).rejects.toThrow();
    });

    it('should throw when loading indicator exists but is hidden', async () => {
      await page.setContent(`
        <div class="loading" style="display: none;">Hidden</div>
      `);

      await expect(async () => {
        await expectLoading(page, { timeout: 1000 });
      }).rejects.toThrow();
    });
  });

  describe('expectNotLoading', () => {
    it('should pass when no loading indicators are visible', async () => {
      await page.setContent(`
        <div>Content loaded</div>
      `);

      await expectNotLoading(page);
    });

    it('should pass when loading indicators exist but are hidden', async () => {
      await page.setContent(`
        <div class="loading" style="display: none;">Hidden</div>
        <div data-loading="false">Not loading</div>
      `);

      await expectNotLoading(page);
    });

    it('should throw when any loading indicator is visible', async () => {
      await page.setContent(`
        <div class="loading">Loading...</div>
      `);

      await expect(async () => {
        await expectNotLoading(page, { timeout: 1000 });
      }).rejects.toThrow();
    });

    it('should check all configured selectors', async () => {
      await page.setContent(`
        <div class="spinner" style="display: none;">Hidden spinner</div>
        <div data-loading="true">Visible loading</div>
      `);

      await expect(async () => {
        await expectNotLoading(page, { timeout: 1000 });
      }).rejects.toThrow();
    });

    it('should work with custom selectors', async () => {
      await page.setContent(`
        <div class="loading">Standard loading (ignored)</div>
        <div class="custom-loader" style="display: none;">Custom hidden</div>
      `);

      await expectNotLoading(page, {
        selectors: ['.custom-loader'],
      });
    });
  });

  describe('waitForLoadingComplete', () => {
    it('should wait for loading to disappear', async () => {
      await page.setContent('<div id="container"></div>');

      // Add loading indicator that will be removed
      // TIMING NOTE: Use 1000ms minimum for transient elements in tests.
      // Shorter values (100-200ms) cause race conditions where the element
      // may be removed before Playwright's assertion can detect it,
      // especially under CI load or slow VMs.
      await page.evaluate(() => {
        const container = document.getElementById('container');
        if (container) {
          const loader = document.createElement('div');
          loader.className = 'loading';
          loader.textContent = 'Loading...';
          container.appendChild(loader);

          setTimeout(() => {
            loader.remove();
          }, 1000);
        }
      });

      await waitForLoadingComplete(page, { timeout: 2000 });

      // Should not throw - loading is complete
      await expectNotLoading(page);
    });

    it('should handle case where loading never starts', async () => {
      await page.setContent(`
        <div>Content already loaded</div>
      `);

      // Should not throw - no loading indicators
      await waitForLoadingComplete(page, { timeout: 2000 });
    });

    it('should work with custom selectors', async () => {
      await page.setContent('<div id="container"></div>');

      // See TIMING NOTE above - 1000ms prevents race conditions
      await page.evaluate(() => {
        const container = document.getElementById('container');
        if (container) {
          const loader = document.createElement('div');
          loader.className = 'custom-spinner';
          container.appendChild(loader);

          setTimeout(() => {
            loader.remove();
          }, 1000);
        }
      });

      await waitForLoadingComplete(page, {
        selectors: ['.custom-spinner'],
        timeout: 3000,
      });

      await expectNotLoading(page, { selectors: ['.custom-spinner'] });
    });

    it('should wait for all loading indicators to disappear', async () => {
      await page.setContent('<div id="container"></div>');

      // See TIMING NOTE above - stagger removal but keep both >= 1000ms
      await page.evaluate(() => {
        const container = document.getElementById('container');
        if (container) {
          const loader1 = document.createElement('div');
          loader1.className = 'loading';
          container.appendChild(loader1);

          const loader2 = document.createElement('div');
          loader2.className = 'spinner';
          container.appendChild(loader2);

          // Remove at different times (staggered to test multi-loader behavior)
          setTimeout(() => loader1.remove(), 1000);
          setTimeout(() => loader2.remove(), 1200);
        }
      });

      await waitForLoadingComplete(page, { timeout: 5000 });

      await expectNotLoading(page);
    });
  });

  describe('waitForLoadingOperation', () => {
    it('should wait for loading to start and complete after operation', async () => {
      await page.setContent(`
        <div id="container"></div>
        <button id="trigger">Trigger</button>
      `);

      // Set up button to trigger loading
      await page.evaluate(() => {
        const button = document.getElementById('trigger');
        const container = document.getElementById('container');

        if (button && container) {
          button.addEventListener('click', () => {
            const loader = document.createElement('div');
            loader.className = 'loading';
            loader.textContent = 'Loading...';
            container.appendChild(loader);

            // 1500ms is enough time for Playwright to observe the element
            // while still being short enough to test the complete flow
            setTimeout(() => {
              loader.remove();
            }, 1500);
          });
        }
      });

      await waitForLoadingOperation(
        page,
        async () => {
          await page.click('#trigger');
        },
        { timeout: 5000 }
      );

      // Loading should be complete
      await expectNotLoading(page);
    });

    it('should work with custom selectors', async () => {
      await page.setContent(`
        <div id="container"></div>
        <button id="trigger">Trigger</button>
      `);

      await page.evaluate(() => {
        const button = document.getElementById('trigger');
        const container = document.getElementById('container');

        if (button && container) {
          button.addEventListener('click', () => {
            const loader = document.createElement('div');
            loader.className = 'custom-loader';
            loader.textContent = 'Loading...';
            loader.style.display = 'block';
            container.appendChild(loader);

            // See TIMING NOTE in waitForLoadingComplete tests - 1000ms prevents race conditions
            setTimeout(() => {
              loader.remove();
            }, 1000);
          });
        }
      });

      await waitForLoadingOperation(
        page,
        async () => {
          await page.click('#trigger');
        },
        { selectors: ['.custom-loader'], timeout: 3000 }
      );

      await expectNotLoading(page, { selectors: ['.custom-loader'] });
    });

    it('should throw if loading never appears', async () => {
      await page.setContent(`
        <button id="no-op">No-op Button</button>
      `);

      await expect(async () => {
        await waitForLoadingOperation(
          page,
          async () => {
            await page.click('#no-op');
          },
          { timeout: 2000 }
        );
      }).rejects.toThrow();
    });
  });
});
