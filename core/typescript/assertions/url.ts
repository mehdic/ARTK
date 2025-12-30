/**
 * URL assertion helpers
 *
 * Provides assertions for verifying page URLs and navigation.
 *
 * @module assertions/url
 */

import type { Page } from '@playwright/test';
import type { UrlAssertionOptions } from './types.js';

/**
 * Assert that the current URL contains the expected substring
 *
 * @param page - Playwright page object
 * @param expectedSubstring - Expected substring in URL
 * @param options - URL assertion options
 *
 * @example
 * ```typescript
 * // Assert URL contains /dashboard
 * await expectUrlContains(page, '/dashboard');
 *
 * // Assert URL contains query parameter
 * await expectUrlContains(page, 'status=active');
 *
 * // Ignore query parameters
 * await expectUrlContains(page, '/users/123', { ignoreQueryParams: true });
 *
 * // With custom timeout
 * await expectUrlContains(page, '/orders', { timeout: 10000 });
 * ```
 */
export async function expectUrlContains(
  page: Page,
  expectedSubstring: string,
  options: UrlAssertionOptions = {}
): Promise<void> {
  const { timeout = 5000, ignoreQueryParams = false, ignoreHash = false } = options;

  // Wait for URL to match
  await page.waitForURL(
    (url) => {
      let urlStr = url.toString();

      // Remove query params if requested
      if (ignoreQueryParams) {
        const urlObj = new URL(urlStr);
        urlStr = `${urlObj.origin}${urlObj.pathname}`;
      }

      // Remove hash if requested
      if (ignoreHash) {
        urlStr = urlStr.split('#')[0] ?? urlStr;
      }

      return urlStr.includes(expectedSubstring);
    },
    { timeout }
  );
}

/**
 * Assert that the current URL matches a regular expression pattern
 *
 * @param page - Playwright page object
 * @param pattern - Regular expression or string pattern
 * @param options - URL assertion options
 *
 * @example
 * ```typescript
 * // Assert URL matches pattern
 * await expectUrlMatches(page, /\/users\/\d+/);
 *
 * // String pattern (converted to RegExp)
 * await expectUrlMatches(page, '/users/[0-9]+');
 *
 * // Ignore query parameters
 * await expectUrlMatches(page, /\/orders\/\d+$/, { ignoreQueryParams: true });
 * ```
 */
export async function expectUrlMatches(
  page: Page,
  pattern: RegExp | string,
  options: UrlAssertionOptions = {}
): Promise<void> {
  const { timeout = 5000, ignoreQueryParams = false, ignoreHash = false } = options;

  // Convert string pattern to RegExp
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

  // Wait for URL to match
  await page.waitForURL(
    (url) => {
      let urlStr = url.toString();

      // Remove query params if requested
      if (ignoreQueryParams) {
        const urlObj = new URL(urlStr);
        urlStr = `${urlObj.origin}${urlObj.pathname}`;
      }

      // Remove hash if requested
      if (ignoreHash) {
        urlStr = urlStr.split('#')[0] ?? urlStr;
      }

      return regex.test(urlStr);
    },
    { timeout }
  );
}

/**
 * Assert that the current URL exactly equals the expected URL
 *
 * @param page - Playwright page object
 * @param expectedUrl - Expected exact URL
 * @param options - URL assertion options
 *
 * @example
 * ```typescript
 * // Assert exact URL
 * await expectUrlEquals(page, 'https://example.com/dashboard');
 *
 * // Ignore query parameters
 * await expectUrlEquals(page, 'https://example.com/users', { ignoreQueryParams: true });
 *
 * // Ignore hash
 * await expectUrlEquals(page, 'https://example.com/page', { ignoreHash: true });
 * ```
 */
export async function expectUrlEquals(
  page: Page,
  expectedUrl: string,
  options: UrlAssertionOptions = {}
): Promise<void> {
  const { timeout = 5000, ignoreQueryParams = false, ignoreHash = false } = options;

  // Normalize expected URL
  let normalizedExpected = expectedUrl;
  if (ignoreQueryParams || ignoreHash) {
    const expectedUrlObj = new URL(expectedUrl, 'http://dummy.com');
    if (ignoreQueryParams) {
      normalizedExpected = `${expectedUrlObj.origin}${expectedUrlObj.pathname}`;
    }
    if (ignoreHash) {
      normalizedExpected = normalizedExpected.split('#')[0] ?? normalizedExpected;
    }
  }

  // Wait for URL to match
  await page.waitForURL(
    (url) => {
      let urlStr = url.toString();

      // Apply same normalization to actual URL
      if (ignoreQueryParams) {
        const urlObj = new URL(urlStr);
        urlStr = `${urlObj.origin}${urlObj.pathname}`;
      }

      if (ignoreHash) {
        urlStr = urlStr.split('#')[0] ?? urlStr;
      }

      return urlStr === normalizedExpected;
    },
    { timeout }
  );
}

/**
 * Assert that the current URL path matches the expected path
 *
 * This ignores the origin (protocol + domain) and only checks the pathname.
 *
 * @param page - Playwright page object
 * @param expectedPath - Expected URL path (e.g., '/users/123')
 * @param options - URL assertion options
 *
 * @example
 * ```typescript
 * // Assert URL path is /dashboard
 * await expectUrlPath(page, '/dashboard');
 *
 * // Ignore query parameters
 * await expectUrlPath(page, '/users/123', { ignoreQueryParams: true });
 * ```
 */
export async function expectUrlPath(
  page: Page,
  expectedPath: string,
  options: UrlAssertionOptions = {}
): Promise<void> {
  const { timeout = 5000, ignoreQueryParams = false, ignoreHash = false } = options;

  // Normalize expected path
  let normalizedExpectedPath = expectedPath;
  if (ignoreQueryParams || ignoreHash) {
    if (ignoreQueryParams) {
      normalizedExpectedPath = normalizedExpectedPath.split('?')[0] ?? normalizedExpectedPath;
    }
    if (ignoreHash) {
      normalizedExpectedPath = normalizedExpectedPath.split('#')[0] ?? normalizedExpectedPath;
    }
  }

  // Wait for URL path to match
  await page.waitForURL(
    (url) => {
      let pathname = url.pathname;

      // Apply same normalization to actual pathname
      if (ignoreQueryParams) {
        pathname = pathname.split('?')[0] ?? pathname;
      }

      if (ignoreHash) {
        pathname = pathname.split('#')[0] ?? pathname;
      }

      return pathname === normalizedExpectedPath;
    },
    { timeout }
  );
}
