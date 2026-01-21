import { U as UrlAssertionOptions, E as ExpectedApiResponse, A as ApiResponseAssertionOptions } from '../loading-MELHk6De.js';
export { i as AssertionResult, F as FormFieldErrorOptions, h as FormValidityOptions, L as LoadingStateOptions, g as TableAssertionOptions, f as TableRowData, d as ToastAssertionOptions, T as ToastType, p as expectFormError, b as expectFormFieldError, n as expectFormValid, c as expectLoading, o as expectNoFormFieldError, j as expectNoToast, q as expectNotLoading, m as expectTableEmpty, l as expectTableRowCount, a as expectTableToContainRow, e as expectToast, w as waitForLoadingComplete, r as waitForLoadingOperation, k as waitForToastDismiss } from '../loading-MELHk6De.js';
import { Page, APIResponse } from '@playwright/test';
import '../types-BBdYxuqU.js';

/**
 * URL assertion helpers
 *
 * Provides assertions for verifying page URLs and navigation.
 *
 * @module assertions/url
 */

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
declare function expectUrlContains(page: Page, expectedSubstring: string, options?: UrlAssertionOptions): Promise<void>;
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
declare function expectUrlMatches(page: Page, pattern: RegExp | string, options?: UrlAssertionOptions): Promise<void>;
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
declare function expectUrlEquals(page: Page, expectedUrl: string, options?: UrlAssertionOptions): Promise<void>;
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
declare function expectUrlPath(page: Page, expectedPath: string, options?: UrlAssertionOptions): Promise<void>;

/**
 * API response assertion helpers
 *
 * Provides assertions for verifying API responses (status, body, headers).
 * These are helpers for E2E tests that make API calls for data setup/verification,
 * not for standalone API testing.
 *
 * @module assertions/api
 */

/**
 * Assert that an API response matches expected criteria
 *
 * @param response - Playwright API response object
 * @param expected - Expected response structure
 * @param options - API response assertion options
 *
 * @example
 * ```typescript
 * // Basic status check
 * const response = await apiContext.get('/api/users');
 * await expectApiResponse(response, { status: 200 });
 *
 * // Check status and body
 * await expectApiResponse(response, {
 *   status: 200,
 *   body: { success: true }
 * });
 *
 * // Check status, body, and headers
 * await expectApiResponse(response, {
 *   status: 201,
 *   body: { id: 123, name: 'Test User' },
 *   headers: { 'content-type': 'application/json' }
 * });
 *
 * // Exact body match
 * await expectApiResponse(response, {
 *   status: 200,
 *   body: { exact: 'match' }
 * }, { exactBodyMatch: true });
 * ```
 */
declare function expectApiResponse(response: APIResponse, expected: ExpectedApiResponse, options?: ApiResponseAssertionOptions): Promise<void>;
/**
 * Assert that an API response indicates success (2xx status)
 *
 * @param response - Playwright API response object
 *
 * @example
 * ```typescript
 * const response = await apiContext.post('/api/orders', { data: orderData });
 * await expectApiSuccess(response);
 * ```
 */
declare function expectApiSuccess(response: APIResponse): Promise<void>;
/**
 * Assert that an API response indicates an error (4xx or 5xx status)
 *
 * @param response - Playwright API response object
 * @param expectedStatus - Optional specific error status to check
 *
 * @example
 * ```typescript
 * // Assert any error status
 * const response = await apiContext.get('/api/invalid');
 * await expectApiError(response);
 *
 * // Assert specific error status
 * await expectApiError(response, 404);
 * ```
 */
declare function expectApiError(response: APIResponse, expectedStatus?: number): Promise<void>;
/**
 * Assert that an API response body contains specific fields
 *
 * @param response - Playwright API response object
 * @param expectedFields - Array of field names that should exist in response body
 *
 * @example
 * ```typescript
 * const response = await apiContext.get('/api/users/123');
 * await expectApiBodyHasFields(response, ['id', 'name', 'email']);
 * ```
 */
declare function expectApiBodyHasFields(response: APIResponse, expectedFields: readonly string[]): Promise<void>;
/**
 * Assert that an API response body is an array with expected length
 *
 * @param response - Playwright API response object
 * @param expectedLength - Expected array length (or undefined to just check it's an array)
 *
 * @example
 * ```typescript
 * // Assert response is an array
 * const response = await apiContext.get('/api/users');
 * await expectApiBodyIsArray(response);
 *
 * // Assert response is an array with specific length
 * await expectApiBodyIsArray(response, 10);
 * ```
 */
declare function expectApiBodyIsArray(response: APIResponse, expectedLength?: number): Promise<void>;
/**
 * Assert that an API response indicates a validation error with specific message
 *
 * Common pattern: 400 status with error message in body.
 *
 * @param response - Playwright API response object
 * @param expectedMessage - Expected error message (partial match)
 *
 * @example
 * ```typescript
 * const response = await apiContext.post('/api/users', { data: { email: 'invalid' } });
 * await expectApiValidationError(response, 'Invalid email format');
 * ```
 */
declare function expectApiValidationError(response: APIResponse, expectedMessage: string): Promise<void>;

export { ApiResponseAssertionOptions, ExpectedApiResponse, UrlAssertionOptions, expectApiBodyHasFields, expectApiBodyIsArray, expectApiError, expectApiResponse, expectApiSuccess, expectApiValidationError, expectUrlContains, expectUrlEquals, expectUrlMatches, expectUrlPath };
