/**
 * Assertions Module API Contract
 *
 * This contract defines the public API for the ARTK Assertions module.
 * Implementation must satisfy these type signatures.
 */

import type { Page, APIResponse } from '@playwright/test';

// =============================================================================
// Toast Assertions
// =============================================================================

export interface ToastOptions {
  /** Toast type for verification */
  type?: 'success' | 'error' | 'warning' | 'info';
  /** Timeout for toast to appear (ms) */
  timeout?: number;
}

/**
 * Assert that a toast notification appears with the expected message
 *
 * @param page - Playwright Page
 * @param message - Expected message (string or regex)
 * @param options - Optional type and timeout
 *
 * @example
 * await expectToast(page, 'Order created successfully', { type: 'success' });
 * await expectToast(page, /saved/i);
 */
export declare function expectToast(
  page: Page,
  message: string | RegExp,
  options?: ToastOptions
): Promise<void>;

/**
 * Assert that no toast is currently visible
 *
 * @param page - Playwright Page
 * @param timeout - Time to wait for potential toast (ms)
 *
 * @example
 * await expectNoToast(page);
 */
export declare function expectNoToast(page: Page, timeout?: number): Promise<void>;

/**
 * Wait for toast to appear and dismiss
 *
 * @param page - Playwright Page
 * @param options - Optional timeout
 *
 * @example
 * await waitForToastDismiss(page);
 */
export declare function waitForToastDismiss(page: Page, options?: { timeout?: number }): Promise<void>;

// =============================================================================
// Table Assertions
// =============================================================================

export type RowMatcher = Record<string, string | RegExp | number>;

/**
 * Assert that a table contains a row matching the given criteria
 *
 * @param page - Playwright Page
 * @param tableSelector - Table identifier (test ID, aria-label, or selector)
 * @param rowData - Column values to match
 *
 * @example
 * await expectTableToContainRow(page, 'orders-table', {
 *   id: 'ORD-123',
 *   status: 'Active',
 *   total: /\$\d+/
 * });
 */
export declare function expectTableToContainRow(
  page: Page,
  tableSelector: string,
  rowData: RowMatcher
): Promise<void>;

/**
 * Assert that a table does NOT contain a row matching the criteria
 *
 * @param page - Playwright Page
 * @param tableSelector - Table identifier
 * @param rowData - Column values that should not exist
 */
export declare function expectTableNotToContainRow(
  page: Page,
  tableSelector: string,
  rowData: RowMatcher
): Promise<void>;

/**
 * Assert table row count
 *
 * @param page - Playwright Page
 * @param tableSelector - Table identifier
 * @param count - Expected row count
 */
export declare function expectTableRowCount(
  page: Page,
  tableSelector: string,
  count: number
): Promise<void>;

/**
 * Assert table row count is within range
 *
 * @param page - Playwright Page
 * @param tableSelector - Table identifier
 * @param min - Minimum row count
 * @param max - Maximum row count
 */
export declare function expectTableRowCountBetween(
  page: Page,
  tableSelector: string,
  min: number,
  max: number
): Promise<void>;

/**
 * Assert table is empty (no data rows)
 *
 * @param page - Playwright Page
 * @param tableSelector - Table identifier
 */
export declare function expectTableEmpty(page: Page, tableSelector: string): Promise<void>;

// =============================================================================
// Form Assertions
// =============================================================================

/**
 * Assert that a form field has a validation error
 *
 * @param page - Playwright Page
 * @param fieldName - Field name or identifier
 * @param errorMessage - Expected error message (string or regex)
 *
 * @example
 * await expectFormFieldError(page, 'email', 'Email is required');
 * await expectFormFieldError(page, 'password', /at least 8 characters/i);
 */
export declare function expectFormFieldError(
  page: Page,
  fieldName: string,
  errorMessage: string | RegExp
): Promise<void>;

/**
 * Assert that a form field has NO validation error
 *
 * @param page - Playwright Page
 * @param fieldName - Field name or identifier
 */
export declare function expectNoFormFieldError(page: Page, fieldName: string): Promise<void>;

/**
 * Assert that a form is valid (no validation errors)
 *
 * @param page - Playwright Page
 * @param formSelector - Form identifier
 */
export declare function expectFormValid(page: Page, formSelector: string): Promise<void>;

/**
 * Assert that a form has a form-level error
 *
 * @param page - Playwright Page
 * @param formSelector - Form identifier
 * @param errorMessage - Expected error message
 */
export declare function expectFormError(
  page: Page,
  formSelector: string,
  errorMessage: string | RegExp
): Promise<void>;

// =============================================================================
// Loading State Assertions
// =============================================================================

/**
 * Assert that a loading indicator is visible
 *
 * @param page - Playwright Page
 * @param options - Optional timeout
 *
 * @example
 * await expectLoading(page);
 */
export declare function expectLoading(page: Page, options?: { timeout?: number }): Promise<void>;

/**
 * Assert that no loading indicator is visible
 *
 * @param page - Playwright Page
 * @param timeout - Time to wait (ms)
 *
 * @example
 * await expectNotLoading(page, 10000);
 */
export declare function expectNotLoading(page: Page, timeout?: number): Promise<void>;

/**
 * Wait for all loading indicators to complete
 *
 * Uses configured loading selectors from assertions.loading.
 *
 * @param page - Playwright Page
 * @param options - Optional timeout
 *
 * @example
 * await page.click('[data-testid="save"]');
 * await waitForLoadingComplete(page);
 */
export declare function waitForLoadingComplete(
  page: Page,
  options?: { timeout?: number }
): Promise<void>;

// =============================================================================
// URL Assertions
// =============================================================================

/**
 * Assert that the current URL contains the given substring
 *
 * @param page - Playwright Page
 * @param substring - Expected substring
 *
 * @example
 * await expectUrlContains(page, '/dashboard');
 */
export declare function expectUrlContains(page: Page, substring: string): Promise<void>;

/**
 * Assert that the current URL matches a pattern
 *
 * @param page - Playwright Page
 * @param pattern - Regex pattern
 *
 * @example
 * await expectUrlMatches(page, /\/users\/\d+/);
 */
export declare function expectUrlMatches(page: Page, pattern: RegExp): Promise<void>;

/**
 * Assert that a query parameter has the expected value
 *
 * @param page - Playwright Page
 * @param param - Query parameter name
 * @param value - Expected value (string or regex)
 *
 * @example
 * await expectQueryParam(page, 'tab', 'settings');
 * await expectQueryParam(page, 'page', /\d+/);
 */
export declare function expectQueryParam(
  page: Page,
  param: string,
  value: string | RegExp
): Promise<void>;

/**
 * Assert that a query parameter is NOT present
 *
 * @param page - Playwright Page
 * @param param - Query parameter name
 */
export declare function expectNoQueryParam(page: Page, param: string): Promise<void>;

// =============================================================================
// API Response Assertions
// =============================================================================

/**
 * Assert that an API response is successful (2xx status)
 *
 * @param response - Playwright APIResponse
 *
 * @example
 * const response = await apiContext.get('/api/users');
 * await expectApiSuccess(response);
 */
export declare function expectApiSuccess(response: APIResponse): Promise<void>;

/**
 * Assert that an API response has a specific error status
 *
 * @param response - Playwright APIResponse
 * @param status - Expected HTTP status code
 *
 * @example
 * const response = await apiContext.get('/api/forbidden');
 * await expectApiError(response, 403);
 */
export declare function expectApiError(response: APIResponse, status: number): Promise<void>;

/**
 * Assert that an API response body contains expected data
 *
 * @param response - Playwright APIResponse
 * @param data - Expected data (partial match)
 *
 * @example
 * const response = await apiContext.get('/api/users/123');
 * await expectApiResponseContains(response, { id: 123, status: 'active' });
 */
export declare function expectApiResponseContains(
  response: APIResponse,
  data: Record<string, unknown>
): Promise<void>;

/**
 * Assert that an API response body matches a schema
 *
 * @param response - Playwright APIResponse
 * @param schema - Zod schema for validation
 *
 * @example
 * const UserSchema = z.object({ id: z.number(), name: z.string() });
 * await expectApiResponseMatchesSchema(response, UserSchema);
 */
export declare function expectApiResponseMatchesSchema(
  response: APIResponse,
  schema: unknown // Zod schema
): Promise<void>;
