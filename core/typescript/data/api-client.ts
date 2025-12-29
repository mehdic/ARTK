/**
 * Data API Client
 *
 * HTTP client for test data operations via API endpoints.
 * Supports authenticated requests and cleanup registration.
 */

import { createLogger } from '../utils/logger.js';
import type { DataApiOptions } from './types.js';

const logger = createLogger('data', 'DataApiClient');

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
export class DataApiClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  /**
   * Create a new data API client
   *
   * @param options - Client configuration
   */
  constructor(options: DataApiOptions) {
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
  async get<T = unknown>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  /**
   * Perform POST request
   *
   * @param path - API endpoint path
   * @param data - Request body
   * @returns Response data
   */
  async post<T = unknown>(path: string, data: Record<string, unknown>): Promise<T> {
    return this.request<T>('POST', path, data);
  }

  /**
   * Perform PUT request
   *
   * @param path - API endpoint path
   * @param data - Request body
   * @returns Response data
   */
  async put<T = unknown>(path: string, data: Record<string, unknown>): Promise<T> {
    return this.request<T>('PUT', path, data);
  }

  /**
   * Perform DELETE request
   *
   * @param path - API endpoint path
   * @param data - Optional request body
   * @returns Response data
   */
  async delete<T = unknown>(path: string, data?: Record<string, unknown>): Promise<T> {
    return this.request<T>('DELETE', path, data);
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
  private async request<T>(
    method: string,
    path: string,
    data?: Record<string, unknown>,
  ): Promise<T> {
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
        throw new Error(
          `HTTP ${response.status} ${response.statusText}: ${errorText}`,
        );
      }

      // Handle empty responses (e.g., 204 No Content)
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        logger.debug(`${method} ${path} - non-JSON response`, {
          status: response.status,
          contentType,
        });
        return undefined as T;
      }

      const result = await response.json();

      logger.debug(`${method} ${path} - success`, {
        status: response.status,
      });

      return result as T;
    } catch (error) {
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
  createCleanup(
    method: string,
    path: string,
    matcher?: Record<string, unknown>,
  ): () => Promise<void> {
    return async (): Promise<void> => {
      await this.request(method, path, matcher);
    };
  }
}
