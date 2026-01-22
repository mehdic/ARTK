/**
 * Data API Client
 *
 * HTTP client for test data operations via API endpoints.
 * Supports authenticated requests and cleanup registration.
 */
import type { DataApiOptions } from './types.js';
/**
 * HTTP client for test data creation and cleanup
 *
 * Features:
 * - RESTful API operations (GET, POST, PUT, DELETE)
 * - Automatic authentication header injection
 * - JSON request/response handling
 * - Error handling with detailed logging
 *
 * @example
 * const client = new DataApiClient({
 *   baseUrl: 'https://api.example.com',
 *   headers: { 'Authorization': 'Bearer token123' }
 * });
 *
 * const user = await client.post('/users', {
 *   username: 'testuser',
 *   email: 'test@example.com'
 * });
 *
 * await client.delete(`/users/${user.id}`);
 */
export declare class DataApiClient {
    private readonly baseUrl;
    private readonly headers;
    /**
     * Create a new data API client
     *
     * @param options - Client configuration
     */
    constructor(options: DataApiOptions);
    /**
     * Perform GET request
     *
     * @param path - API endpoint path (e.g., '/users/123')
     * @returns Response data
     */
    get<T = unknown>(path: string): Promise<T>;
    /**
     * Perform POST request
     *
     * @param path - API endpoint path
     * @param data - Request body
     * @returns Response data
     */
    post<T = unknown>(path: string, data: Record<string, unknown>): Promise<T>;
    /**
     * Perform PUT request
     *
     * @param path - API endpoint path
     * @param data - Request body
     * @returns Response data
     */
    put<T = unknown>(path: string, data: Record<string, unknown>): Promise<T>;
    /**
     * Perform DELETE request
     *
     * @param path - API endpoint path
     * @param data - Optional request body
     * @returns Response data
     */
    delete<T = unknown>(path: string, data?: Record<string, unknown>): Promise<T>;
    /**
     * Perform HTTP request with error handling
     *
     * @param method - HTTP method
     * @param path - API endpoint path
     * @param data - Optional request body
     * @returns Response data
     * @throws {Error} If request fails
     */
    private request;
    /**
     * Create cleanup function for API-based resource deletion
     *
     * @param method - HTTP method (typically 'DELETE')
     * @param path - API endpoint path
     * @param matcher - Optional data matcher for conditional deletion
     * @returns Cleanup function
     *
     * @example
     * const cleanup = client.createCleanup('DELETE', '/users/123');
     * cleanupManager.register(cleanup, { label: 'Delete test user' });
     */
    createCleanup(method: string, path: string, matcher?: Record<string, unknown>): () => Promise<void>;
}
//# sourceMappingURL=api-client.d.ts.map