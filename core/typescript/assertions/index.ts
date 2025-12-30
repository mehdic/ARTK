/**
 * ARTK Core v1 - Assertions Module
 *
 * Pre-built assertion helpers for common UI patterns.
 * Implements FR-021 to FR-024: Toast, Table, Form, and Loading assertions.
 *
 * @module assertions
 */

// Export all types
export type {
  ToastType,
  ToastAssertionOptions,
  TableRowData,
  TableAssertionOptions,
  FormFieldErrorOptions,
  FormValidityOptions,
  LoadingStateOptions,
  UrlAssertionOptions,
  ExpectedApiResponse,
  ApiResponseAssertionOptions,
  AssertionResult,
} from './types.js';

// Export toast assertions
export {
  expectToast,
  expectNoToast,
  waitForToastDismiss,
} from './toast.js';

// Export table assertions
export {
  expectTableToContainRow,
  expectTableRowCount,
  expectTableEmpty,
} from './table.js';

// Export form assertions
export {
  expectFormFieldError,
  expectFormValid,
  expectNoFormFieldError,
  expectFormError,
} from './form.js';

// Export loading assertions
export {
  expectLoading,
  expectNotLoading,
  waitForLoadingComplete,
  waitForLoadingOperation,
} from './loading.js';

// Export URL assertions
export {
  expectUrlContains,
  expectUrlMatches,
  expectUrlEquals,
  expectUrlPath,
} from './url.js';

// Export API assertions
export {
  expectApiResponse,
  expectApiSuccess,
  expectApiError,
  expectApiBodyHasFields,
  expectApiBodyIsArray,
  expectApiValidationError,
} from './api.js';
