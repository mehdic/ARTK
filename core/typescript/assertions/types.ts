/**
 * TypeScript interfaces for ARTK Core v1 assertion helpers
 *
 * Common assertion types for UI patterns (toast, table, form, loading).
 * Designed for type-safe assertion usage across test suites.
 *
 * @module assertions/types
 */

// =============================================================================
// Toast Assertions
// =============================================================================

/**
 * Toast notification type
 *
 * Represents the semantic type of a toast notification.
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

/**
 * Options for toast assertions
 */
export interface ToastAssertionOptions {
  /** Expected toast type */
  readonly type?: ToastType;

  /** Timeout in milliseconds */
  readonly timeout?: number;

  /** Whether the message must match exactly (default: false, uses contains) */
  readonly exact?: boolean;
}

// =============================================================================
// Table Assertions
// =============================================================================

/**
 * Table row data for matching
 *
 * Key-value pairs representing column name to expected value.
 * Column names should match data-testid or column headers.
 */
export type TableRowData = Readonly<Record<string, string | number | boolean>>;

/**
 * Options for table assertions
 */
export interface TableAssertionOptions {
  /** Timeout in milliseconds */
  readonly timeout?: number;

  /** Whether to match values exactly (default: false, uses contains) */
  readonly exact?: boolean;
}

// =============================================================================
// Form Assertions
// =============================================================================

/**
 * Options for form field error assertions
 */
export interface FormFieldErrorOptions {
  /** Timeout in milliseconds */
  readonly timeout?: number;

  /** Whether the error message must match exactly (default: false, uses contains) */
  readonly exact?: boolean;
}

/**
 * Options for form validity assertions
 */
export interface FormValidityOptions {
  /** Timeout in milliseconds */
  readonly timeout?: number;
}

// =============================================================================
// Loading State Assertions
// =============================================================================

/**
 * Options for loading state assertions
 */
export interface LoadingStateOptions {
  /** Timeout in milliseconds */
  readonly timeout?: number;

  /** Custom loading indicator selector(s) to check */
  readonly selectors?: readonly string[];
}

// =============================================================================
// URL Assertions
// =============================================================================

/**
 * Options for URL assertions
 */
export interface UrlAssertionOptions {
  /** Timeout in milliseconds */
  readonly timeout?: number;

  /** Whether to ignore query parameters when matching */
  readonly ignoreQueryParams?: boolean;

  /** Whether to ignore URL hash/fragment when matching */
  readonly ignoreHash?: boolean;
}

// =============================================================================
// API Response Assertions
// =============================================================================

/**
 * Expected API response structure for assertions
 */
export interface ExpectedApiResponse {
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
export interface ApiResponseAssertionOptions {
  /** Timeout in milliseconds */
  readonly timeout?: number;

  /** Whether to match body exactly (default: false, uses partial match) */
  readonly exactBodyMatch?: boolean;
}

// =============================================================================
// Common Assertion Result
// =============================================================================

/**
 * Assertion result for reporting and debugging
 *
 * Internal type used by assertion helpers to provide detailed feedback.
 */
export interface AssertionResult {
  /** Whether the assertion passed */
  readonly passed: boolean;

  /** Assertion message */
  readonly message: string;

  /** Expected value (for debugging) */
  readonly expected?: unknown;

  /** Actual value (for debugging) */
  readonly actual?: unknown;
}
