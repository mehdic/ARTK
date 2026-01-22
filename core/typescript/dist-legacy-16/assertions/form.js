"use strict";
/**
 * Form validation assertion helpers
 *
 * Provides assertions for verifying form validation states and error messages.
 * Implements FR-023: Form validation error assertions
 *
 * @module assertions/form
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.expectFormFieldError = expectFormFieldError;
exports.expectFormValid = expectFormValid;
exports.expectNoFormFieldError = expectNoFormFieldError;
exports.expectFormError = expectFormError;
const test_1 = require("@playwright/test");
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
async function expectFormFieldError(page, fieldName, expectedError, options = {}, config) {
    const { timeout = 5000, exact = false } = options;
    // Load config if not provided
    const formConfig = config?.assertions?.form ?? {
        errorSelector: '[data-field-error="{field}"], [data-error-for="{field}"], #error-{field}',
        formErrorSelector: '.form-error, [role="alert"]',
    };
    const { errorSelector } = formConfig;
    // Replace {field} placeholder with actual field name
    const fieldErrorSelector = errorSelector.replace(/{field}/g, fieldName);
    // Locate the error element
    const errorElement = page.locator(fieldErrorSelector);
    // Assert error is visible
    await (0, test_1.expect)(errorElement).toBeVisible({ timeout });
    // Check error message
    if (exact) {
        await (0, test_1.expect)(errorElement).toHaveText(expectedError, { timeout });
    }
    else {
        await (0, test_1.expect)(errorElement).toContainText(expectedError, { timeout });
    }
}
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
async function expectFormValid(page, formSelector, options = {}, config) {
    const { timeout = 5000 } = options;
    // Load config if not provided
    const formConfig = config?.assertions?.form ?? {
        errorSelector: '[data-field-error], [data-error-for], [id^="error-"]',
        formErrorSelector: '.form-error, [role="alert"]',
    };
    const { formErrorSelector } = formConfig;
    // Locate the form
    const form = getFormLocator(page, formSelector);
    await (0, test_1.expect)(form).toBeVisible({ timeout });
    // Assert no error elements within form
    const errorElements = form.locator(formErrorSelector);
    await (0, test_1.expect)(errorElements).toHaveCount(0, { timeout });
}
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
async function expectNoFormFieldError(page, fieldName, options = {}, config) {
    const { timeout = 5000 } = options;
    // Load config if not provided
    const formConfig = config?.assertions?.form ?? {
        errorSelector: '[data-field-error="{field}"], [data-error-for="{field}"], #error-{field}',
        formErrorSelector: '.form-error, [role="alert"]',
    };
    const { errorSelector } = formConfig;
    // Replace {field} placeholder with actual field name
    const fieldErrorSelector = errorSelector.replace(/{field}/g, fieldName);
    // Locate the error element
    const errorElement = page.locator(fieldErrorSelector);
    // Assert error is not visible
    await (0, test_1.expect)(errorElement).not.toBeVisible({ timeout });
}
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
async function expectFormError(page, formSelector, expectedError, options = {}, config) {
    const { timeout = 5000, exact = false } = options;
    // Load config if not provided
    const formConfig = config?.assertions?.form ?? {
        errorSelector: '[data-field-error], [data-error-for], [id^="error-"]',
        formErrorSelector: '.form-error, [role="alert"]',
    };
    const { formErrorSelector } = formConfig;
    // Locate the form
    const form = getFormLocator(page, formSelector);
    await (0, test_1.expect)(form).toBeVisible({ timeout });
    // Find form-level error
    const formError = form.locator(formErrorSelector);
    await (0, test_1.expect)(formError).toBeVisible({ timeout });
    // Check error message
    if (exact) {
        await (0, test_1.expect)(formError).toHaveText(expectedError, { timeout });
    }
    else {
        await (0, test_1.expect)(formError).toContainText(expectedError, { timeout });
    }
}
/**
 * Get form locator using common strategies
 *
 * @param page - Playwright page object
 * @param formSelector - Form selector
 * @returns Form locator
 */
function getFormLocator(page, formSelector) {
    // Try data-testid first
    if (!formSelector.includes('[') && !formSelector.includes('.') && !formSelector.includes('#')) {
        return page.getByTestId(formSelector);
    }
    // Try role if it looks like a role selector
    if (formSelector === 'form') {
        return page.getByRole('form');
    }
    // Fall back to CSS selector
    return page.locator(formSelector);
}
//# sourceMappingURL=form.js.map