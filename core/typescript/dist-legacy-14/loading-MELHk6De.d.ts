import { Page } from '@playwright/test';
import { A as ARTKConfig } from './types-BBdYxuqU.js';

/**
 * TypeScript interfaces for ARTK Core v1 assertion helpers
 *
 * Common assertion types for UI patterns (toast, table, form, loading).
 * Designed for type-safe assertion usage across test suites.
 *
 * @module assertions/types
 */
/**
 * Toast notification type
 *
 * Represents the semantic type of a toast notification.
 */
type ToastType = 'success' | 'error' | 'warning' | 'info';
/**
 * Options for toast assertions
 */
interface ToastAssertionOptions {
    /** Expected toast type */
    readonly type?: ToastType;
    /** Timeout in milliseconds */
    readonly timeout?: number;
    /** Whether the message must match exactly (default: false, uses contains) */
    readonly exact?: boolean;
}
/**
 * Table row data for matching
 *
 * Key-value pairs representing column name to expected value.
 * Column names should match data-testid or column headers.
 */
type TableRowData = Readonly<Record<string, string | number | boolean>>;
/**
 * Options for table assertions
 */
interface TableAssertionOptions {
    /** Timeout in milliseconds */
    readonly timeout?: number;
    /** Whether to match values exactly (default: false, uses contains) */
    readonly exact?: boolean;
}
/**
 * Options for form field error assertions
 */
interface FormFieldErrorOptions {
    /** Timeout in milliseconds */
    readonly timeout?: number;
    /** Whether the error message must match exactly (default: false, uses contains) */
    readonly exact?: boolean;
}
/**
 * Options for form validity assertions
 */
interface FormValidityOptions {
    /** Timeout in milliseconds */
    readonly timeout?: number;
}
/**
 * Options for loading state assertions
 */
interface LoadingStateOptions {
    /** Timeout in milliseconds */
    readonly timeout?: number;
    /** Custom loading indicator selector(s) to check */
    readonly selectors?: readonly string[];
}
/**
 * Options for URL assertions
 */
interface UrlAssertionOptions {
    /** Timeout in milliseconds */
    readonly timeout?: number;
    /** Whether to ignore query parameters when matching */
    readonly ignoreQueryParams?: boolean;
    /** Whether to ignore URL hash/fragment when matching */
    readonly ignoreHash?: boolean;
}
/**
 * Expected API response structure for assertions
 */
interface ExpectedApiResponse {
    /** Expected HTTP status code */
    readonly status?: number;
    /** Expected response body (partial match) */
    readonly body?: Record<string, unknown>;
    /** Expected response headers */
    readonly headers?: Readonly<Record<string, string>>;
    /** Expected content type */
    readonly contentType?: string;
}
/**
 * Options for API response assertions
 */
interface ApiResponseAssertionOptions {
    /** Timeout in milliseconds */
    readonly timeout?: number;
    /** Whether to match body exactly (default: false, uses partial match) */
    readonly exactBodyMatch?: boolean;
}
/**
 * Assertion result for reporting and debugging
 *
 * Internal type used by assertion helpers to provide detailed feedback.
 */
interface AssertionResult {
    /** Whether the assertion passed */
    readonly passed: boolean;
    /** Assertion message */
    readonly message: string;
    /** Expected value (for debugging) */
    readonly expected?: unknown;
    /** Actual value (for debugging) */
    readonly actual?: unknown;
}

/**
 * Toast/notification assertion helpers
 *
 * Provides assertions for verifying toast notifications including type detection.
 * Implements FR-021: Toast/notification assertions with type detection
 *
 * @module assertions/toast
 */

/**
 * Assert that a toast notification with the given message appears
 *
 * @param page - Playwright page object
 * @param message - Expected toast message (supports partial match by default)
 * @param options - Toast assertion options
 * @param config - ARTK configuration (optional, will load from global if not provided)
 *
 * @example
 * ```typescript
 * // Basic toast assertion
 * await expectToast(page, 'Order created successfully');
 *
 * // Toast with type detection
 * await expectToast(page, 'Order created', { type: 'success' });
 *
 * // Exact message match
 * await expectToast(page, 'Order created successfully', { exact: true });
 *
 * // Custom timeout
 * await expectToast(page, 'Processing...', { timeout: 10000 });
 * ```
 */
declare function expectToast(page: Page, message: string, options?: ToastAssertionOptions, config?: ARTKConfig): Promise<void>;
/**
 * Assert that no toast notification is currently visible
 *
 * @param page - Playwright page object
 * @param config - ARTK configuration (optional, will load from global if not provided)
 * @param timeout - Timeout in milliseconds (default: 5000)
 *
 * @example
 * ```typescript
 * // Assert no toasts are displayed
 * await expectNoToast(page);
 *
 * // With custom config
 * await expectNoToast(page, config);
 *
 * // With custom timeout
 * await expectNoToast(page, undefined, 2000);
 * ```
 */
declare function expectNoToast(page: Page, config?: ARTKConfig, timeout?: number): Promise<void>;
/**
 * Wait for a toast to appear and then disappear
 *
 * Useful for transient notifications that auto-dismiss.
 *
 * @param page - Playwright page object
 * @param message - Expected toast message
 * @param options - Toast assertion options
 * @param config - ARTK configuration (optional, will load from global if not provided)
 *
 * @example
 * ```typescript
 * // Wait for success toast to appear and disappear
 * await waitForToastDismiss(page, 'Saved successfully', { type: 'success' });
 * ```
 */
declare function waitForToastDismiss(page: Page, message: string, options?: ToastAssertionOptions, config?: ARTKConfig): Promise<void>;

/**
 * Table assertion helpers
 *
 * Provides assertions for verifying table content and row data.
 * Implements FR-022: Table row assertions with column matching
 *
 * @module assertions/table
 */

/**
 * Assert that a table contains a row matching the given data
 *
 * Searches for a table row where all specified column values match.
 * Column names should correspond to data-testid attributes or visible headers.
 *
 * @param page - Playwright page object
 * @param tableSelector - Selector for the table element (testid, role, or CSS)
 * @param rowData - Expected row data as column-value pairs
 * @param options - Table assertion options
 *
 * @example
 * ```typescript
 * // Match row by ID and status
 * await expectTableToContainRow(page, 'orders-table', {
 *   id: '12345',
 *   status: 'Active',
 *   amount: 99.99
 * });
 *
 * // Exact match
 * await expectTableToContainRow(page, 'users-table', {
 *   email: 'user@example.com'
 * }, { exact: true });
 *
 * // With custom timeout
 * await expectTableToContainRow(page, 'results-table', {
 *   name: 'Test Result'
 * }, { timeout: 10000 });
 * ```
 */
declare function expectTableToContainRow(page: Page, tableSelector: string, rowData: TableRowData, options?: TableAssertionOptions): Promise<void>;
/**
 * Assert that a table has the expected number of rows
 *
 * @param page - Playwright page object
 * @param tableSelector - Selector for the table element
 * @param expectedCount - Expected number of rows
 * @param options - Table assertion options
 *
 * @example
 * ```typescript
 * // Assert table has exactly 10 rows
 * await expectTableRowCount(page, 'results-table', 10);
 *
 * // With custom timeout
 * await expectTableRowCount(page, 'orders-table', 5, { timeout: 10000 });
 * ```
 */
declare function expectTableRowCount(page: Page, tableSelector: string, expectedCount: number, options?: TableAssertionOptions): Promise<void>;
/**
 * Assert that a table is empty (has no data rows)
 *
 * @param page - Playwright page object
 * @param tableSelector - Selector for the table element
 * @param options - Table assertion options
 *
 * @example
 * ```typescript
 * // Assert table is empty
 * await expectTableEmpty(page, 'results-table');
 * ```
 */
declare function expectTableEmpty(page: Page, tableSelector: string, options?: TableAssertionOptions): Promise<void>;

/**
 * Form validation assertion helpers
 *
 * Provides assertions for verifying form validation states and error messages.
 * Implements FR-023: Form validation error assertions
 *
 * @module assertions/form
 */

/**
 * Assert that a form field displays a validation error
 *
 * @param page - Playwright page object
 * @param fieldName - Field name, label, or testid
 * @param expectedError - Expected error message (supports partial match by default)
 * @param options - Form field error options
 * @param config - ARTK configuration (optional)
 *
 * @example
 * ```typescript
 * // Assert email field has required error
 * await expectFormFieldError(page, 'email', 'Email is required');
 *
 * // Exact error message match
 * await expectFormFieldError(page, 'password', 'Password must be at least 8 characters', {
 *   exact: true
 * });
 *
 * // With custom timeout
 * await expectFormFieldError(page, 'username', 'Username taken', { timeout: 10000 });
 * ```
 */
declare function expectFormFieldError(page: Page, fieldName: string, expectedError: string, options?: FormFieldErrorOptions, config?: ARTKConfig): Promise<void>;
/**
 * Assert that a form is valid (no validation errors)
 *
 * @param page - Playwright page object
 * @param formSelector - Form selector (testid, CSS, or role)
 * @param options - Form validity options
 * @param config - ARTK configuration (optional)
 *
 * @example
 * ```typescript
 * // Assert login form is valid
 * await expectFormValid(page, 'login-form');
 *
 * // With custom timeout
 * await expectFormValid(page, 'registration-form', { timeout: 10000 });
 * ```
 */
declare function expectFormValid(page: Page, formSelector: string, options?: FormValidityOptions, config?: ARTKConfig): Promise<void>;
/**
 * Assert that a form field does NOT have a validation error
 *
 * @param page - Playwright page object
 * @param fieldName - Field name, label, or testid
 * @param options - Form field error options
 * @param config - ARTK configuration (optional)
 *
 * @example
 * ```typescript
 * // Assert email field has no error
 * await expectNoFormFieldError(page, 'email');
 * ```
 */
declare function expectNoFormFieldError(page: Page, fieldName: string, options?: FormFieldErrorOptions, config?: ARTKConfig): Promise<void>;
/**
 * Assert that a form displays a form-level error message
 *
 * Form-level errors are typically shown at the top of the form and apply
 * to the entire form rather than a specific field.
 *
 * @param page - Playwright page object
 * @param formSelector - Form selector
 * @param expectedError - Expected error message
 * @param options - Form field error options
 * @param config - ARTK configuration (optional)
 *
 * @example
 * ```typescript
 * // Assert form shows general error
 * await expectFormError(page, 'login-form', 'Invalid credentials');
 * ```
 */
declare function expectFormError(page: Page, formSelector: string, expectedError: string, options?: FormFieldErrorOptions, config?: ARTKConfig): Promise<void>;

/**
 * Loading state assertion helpers
 *
 * Provides assertions for verifying loading indicators and waiting for loading completion.
 * Implements FR-024: Loading state assertions with configurable selectors
 *
 * @module assertions/loading
 */

/**
 * Assert that a loading indicator is visible
 *
 * @param page - Playwright page object
 * @param options - Loading state options
 * @param config - ARTK configuration (optional)
 *
 * @example
 * ```typescript
 * // Assert any configured loading indicator is visible
 * await expectLoading(page);
 *
 * // With custom selectors
 * await expectLoading(page, {
 *   selectors: ['.custom-spinner', '#loading-overlay']
 * });
 *
 * // With custom timeout
 * await expectLoading(page, { timeout: 10000 });
 * ```
 */
declare function expectLoading(page: Page, options?: LoadingStateOptions, config?: ARTKConfig): Promise<void>;
/**
 * Assert that no loading indicators are visible
 *
 * @param page - Playwright page object
 * @param options - Loading state options
 * @param config - ARTK configuration (optional)
 *
 * @example
 * ```typescript
 * // Assert no loading indicators are visible
 * await expectNotLoading(page);
 *
 * // With custom selectors
 * await expectNotLoading(page, {
 *   selectors: ['.custom-spinner']
 * });
 * ```
 */
declare function expectNotLoading(page: Page, options?: LoadingStateOptions, config?: ARTKConfig): Promise<void>;
/**
 * Wait for all loading indicators to complete (disappear)
 *
 * This is the most commonly used loading assertion - it waits for the page
 * to finish loading before proceeding with test assertions.
 *
 * @param page - Playwright page object
 * @param options - Loading state options
 * @param config - ARTK configuration (optional)
 *
 * @example
 * ```typescript
 * // Wait for loading to complete
 * await waitForLoadingComplete(page);
 *
 * // With custom timeout (for slow operations)
 * await waitForLoadingComplete(page, { timeout: 30000 });
 *
 * // With custom loading selectors
 * await waitForLoadingComplete(page, {
 *   selectors: ['.data-grid-loading', '.chart-loading']
 * });
 * ```
 */
declare function waitForLoadingComplete(page: Page, options?: LoadingStateOptions, config?: ARTKConfig): Promise<void>;
/**
 * Wait for a specific loading operation to start and complete
 *
 * Useful for operations where you want to ensure loading actually occurred
 * (not just that loading is currently complete).
 *
 * @param page - Playwright page object
 * @param operation - Async function that triggers the loading operation
 * @param options - Loading state options
 * @param config - ARTK configuration (optional)
 *
 * @example
 * ```typescript
 * // Wait for save operation to complete
 * await waitForLoadingOperation(page, async () => {
 *   await page.getByRole('button', { name: 'Save' }).click();
 * });
 *
 * // With custom selectors
 * await waitForLoadingOperation(
 *   page,
 *   async () => { await page.getByRole('button', { name: 'Refresh' }).click(); },
 *   { selectors: ['.table-loading'] }
 * );
 * ```
 */
declare function waitForLoadingOperation(page: Page, operation: () => Promise<void>, options?: LoadingStateOptions, config?: ARTKConfig): Promise<void>;

export { type ApiResponseAssertionOptions as A, type ExpectedApiResponse as E, type FormFieldErrorOptions as F, type LoadingStateOptions as L, type ToastType as T, type UrlAssertionOptions as U, expectTableToContainRow as a, expectFormFieldError as b, expectLoading as c, type ToastAssertionOptions as d, expectToast as e, type TableRowData as f, type TableAssertionOptions as g, type FormValidityOptions as h, type AssertionResult as i, expectNoToast as j, waitForToastDismiss as k, expectTableRowCount as l, expectTableEmpty as m, expectFormValid as n, expectNoFormFieldError as o, expectFormError as p, expectNotLoading as q, waitForLoadingOperation as r, waitForLoadingComplete as w };
