"use strict";
/**
 * Data API Client
 *
 * HTTP client for test data operations via API endpoints.
 * Supports authenticated requests and cleanup registration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataApiClient = void 0;
const logger_js_1 = require("../utils/logger.js");
const logger = (0, logger_js_1.createLogger)('data', 'DataApiClient');
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
class DataApiClient {
    /**
     * Create a new data API client
     *
     * @param options - Client configuration
     */
    constructor(options) {
        this.baseUrl = options.baseUrl.replace(/\/$/, ''); // Remove trailing slash
        this.headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };
        logger.debug('Client initialized', {
            baseUrl: this.baseUrl,
            hasAuth: 'Authorization' in this.headers,
        });
    }
    /**
     * Perform GET request
     *
     * @param path - API endpoint path (e.g., '/users/123')
     * @returns Response data
     */
    async get(path) {
        return this.request('GET', path);
    }
    /**
     * Perform POST request
     *
     * @param path - API endpoint path
     * @param data - Request body
     * @returns Response data
     */
    async post(path, data) {
        return this.request('POST', path, data);
    }
    /**
     * Perform PUT request
     *
     * @param path - API endpoint path
     * @param data - Request body
     * @returns Response data
     */
    async put(path, data) {
        return this.request('PUT', path, data);
    }
    /**
     * Perform DELETE request
     *
     * @param path - API endpoint path
     * @param data - Optional request body
     * @returns Response data
     */
    async delete(path, data) {
        return this.request('DELETE', path, data);
    }
    /**
     * Perform HTTP request with error handling
     *
     * @param method - HTTP method
     * @param path - API endpoint path
     * @param data - Optional request body
     * @returns Response data
     * @throws {Error} If request fails
     */
    async request(method, path, data) {
        const url = `${this.baseUrl}${path}`;
        logger.debug(`${method} ${path}`, {
            url,
            hasBody: !!data,
        });
        try {
            const response = await fetch(url, {
                method,
                headers: this.headers,
                body: data ? JSON.stringify(data) : undefined,
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status} ${response.statusText}: ${errorText}`);
            }
            // Handle empty responses (e.g., 204 No Content)
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                logger.debug(`${method} ${path} - non-JSON response`, {
                    status: response.status,
                    contentType,
                });
                return undefined;
            }
            const result = await response.json();
            logger.debug(`${method} ${path} - success`, {
                status: response.status,
            });
            return result;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(`${method} ${path} - failed`, {
                error: errorMessage,
            });
            throw new Error(`API request failed: ${method} ${path} - ${errorMessage}`);
        }
    }
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
    createCleanup(method, path, matcher) {
        return async () => {
            await this.request(method, path, matcher);
        };
    }
}
exports.DataApiClient = DataApiClient;
//# sourceMappingURL=api-client.js.map