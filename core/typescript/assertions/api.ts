/**
 * API response assertion helpers
 *
 * Provides assertions for verifying API responses (status, body, headers).
 * These are helpers for E2E tests that make API calls for data setup/verification,
 * not for standalone API testing.
 *
 * @module assertions/api
 */

import { type APIResponse, expect } from '@playwright/test';
import type { ApiResponseAssertionOptions, ExpectedApiResponse } from './types.js';

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
export async function expectApiResponse(
  response: APIResponse,
  expected: ExpectedApiResponse,
  options: ApiResponseAssertionOptions = {}
): Promise<void> {
  const { exactBodyMatch = false } = options;

  // Check status code
  if (expected.status !== undefined) {
    expect(response.status(), `Expected status ${expected.status}`).toBe(expected.status);
  }

  // Check content type
  if (expected.contentType !== undefined) {
    const actualContentType = response.headers()['content-type'] ?? '';
    expect(actualContentType, `Expected content type ${expected.contentType}`).toContain(
      expected.contentType
    );
  }

  // Check headers
  if (expected.headers !== undefined) {
    const actualHeaders = response.headers();
    for (const [headerName, expectedValue] of Object.entries(expected.headers)) {
      const actualValue = actualHeaders[headerName.toLowerCase()];
      expect(actualValue, `Expected header ${headerName}: ${expectedValue}`).toBe(expectedValue);
    }
  }

  // Check body
  if (expected.body !== undefined) {
    const actualBody = await response.json();

    if (exactBodyMatch) {
      expect(actualBody, 'Expected exact body match').toEqual(expected.body);
    } else {
      // Partial match - check that all expected fields exist and match
      for (const [key, expectedValue] of Object.entries(expected.body)) {
        expect(actualBody, `Expected body to have key "${key}"`).toHaveProperty(key);
        expect(actualBody[key], `Expected ${key} to equal ${expectedValue}`).toEqual(
          expectedValue
        );
      }
    }
  }
}

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
export async function expectApiSuccess(response: APIResponse): Promise<void> {
  const status = response.status();
  expect(status, `Expected 2xx status but got ${status}`).toBeGreaterThanOrEqual(200);
  expect(status, `Expected 2xx status but got ${status}`).toBeLessThan(300);
}

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
export async function expectApiError(
  response: APIResponse,
  expectedStatus?: number
): Promise<void> {
  const status = response.status();

  if (expectedStatus !== undefined) {
    expect(status, `Expected status ${expectedStatus} but got ${status}`).toBe(expectedStatus);
  } else {
    const isError = status >= 400 && status < 600;
    expect(isError, `Expected error status (4xx or 5xx) but got ${status}`).toBe(true);
  }
}

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
export async function expectApiBodyHasFields(
  response: APIResponse,
  expectedFields: readonly string[]
): Promise<void> {
  const actualBody = await response.json();

  for (const field of expectedFields) {
    expect(actualBody, `Expected response body to have field "${field}"`).toHaveProperty(field);
  }
}

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
export async function expectApiBodyIsArray(
  response: APIResponse,
  expectedLength?: number
): Promise<void> {
  const actualBody = await response.json();

  expect(Array.isArray(actualBody), 'Expected response body to be an array').toBe(true);

  if (expectedLength !== undefined) {
    expect(
      actualBody.length,
      `Expected array length ${expectedLength} but got ${actualBody.length}`
    ).toBe(expectedLength);
  }
}

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
export async function expectApiValidationError(
  response: APIResponse,
  expectedMessage: string
): Promise<void> {
  // Check status is 400
  expect(response.status(), 'Expected validation error status 400').toBe(400);

  // Check body contains error message
  const body = await response.json();

  // Try common error field names
  const errorMessage =
    body.error ?? body.message ?? body.errorMessage ?? JSON.stringify(body);

  expect(
    typeof errorMessage === 'string' && errorMessage.includes(expectedMessage),
    `Expected error message to contain "${expectedMessage}" but got "${errorMessage}"`
  ).toBe(true);
}
