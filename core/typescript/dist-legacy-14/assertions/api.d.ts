/**
 * API response assertion helpers
 *
 * Provides assertions for verifying API responses (status, body, headers).
 * These are helpers for E2E tests that make API calls for data setup/verification,
 * not for standalone API testing.
 *
 * @module assertions/api
 */
import { type APIResponse } from '@playwright/test';
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
export declare function expectApiResponse(response: APIResponse, expected: ExpectedApiResponse, options?: ApiResponseAssertionOptions): Promise<void>;
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
export declare function expectApiSuccess(response: APIResponse): Promise<void>;
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
export declare function expectApiError(response: APIResponse, expectedStatus?: number): Promise<void>;
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
export declare function expectApiBodyHasFields(response: APIResponse, expectedFields: readonly string[]): Promise<void>;
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
export declare function expectApiBodyIsArray(response: APIResponse, expectedLength?: number): Promise<void>;
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
export declare function expectApiValidationError(response: APIResponse, expectedMessage: string): Promise<void>;
//# sourceMappingURL=api.d.ts.map