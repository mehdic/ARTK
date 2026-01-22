/**
 * Form validation assertion helpers
 *
 * Provides assertions for verifying form validation states and error messages.
 * Implements FR-023: Form validation error assertions
 *
 * @module assertions/form
 */
import { type Page } from '@playwright/test';
import type { FormFieldErrorOptions, FormValidityOptions } from './types.js';
import type { ARTKConfig } from '../config/types.js';
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
export declare function expectFormFieldError(page: Page, fieldName: string, expectedError: string, options?: FormFieldErrorOptions, config?: ARTKConfig): Promise<void>;
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
export declare function expectFormValid(page: Page, formSelector: string, options?: FormValidityOptions, config?: ARTKConfig): Promise<void>;
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
export declare function expectNoFormFieldError(page: Page, fieldName: string, options?: FormFieldErrorOptions, config?: ARTKConfig): Promise<void>;
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
export declare function expectFormError(page: Page, formSelector: string, expectedError: string, options?: FormFieldErrorOptions, config?: ARTKConfig): Promise<void>;
//# sourceMappingURL=form.d.ts.map