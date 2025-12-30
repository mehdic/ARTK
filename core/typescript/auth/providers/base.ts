/**
 * Base AuthProvider abstract class
 *
 * Provides common functionality for all authentication providers including:
 * - Logging setup
 * - Retry configuration
 * - Session validation helpers
 *
 * @module auth/providers/base
 * @see data-model.md Section 2.1
 */

import type { Page } from '@playwright/test';
import type {
  AuthProvider,
  AuthRetryOptions,
  Credentials,
} from '../types.js';
import { createLogger, type Logger } from '../../utils/logger.js';

// =============================================================================
// Default Configuration
// =============================================================================

/**
 * Default retry options for authentication
 *
 * NFR-010: Retry authentication failures up to 2 times with exponential backoff
 */
export const DEFAULT_AUTH_RETRY_OPTIONS: Required<AuthRetryOptions> = {
  maxRetries: 2,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryOnTimeout: true,
  retryOnNetworkError: true,
};

// =============================================================================
// Base Class
// =============================================================================

/**
 * Abstract base class for authentication providers
 *
 * Provides common functionality that all auth providers inherit:
 * - Logger instance
 * - Retry configuration
 * - Helper methods for common operations
 *
 * @example
 * ```typescript
 * class MyAuthProvider extends BaseAuthProvider {
 *   constructor() {
 *     super('my-auth');
 *   }
 *
 *   async login(page: Page, credentials: Credentials): Promise<void> {
 *     this.logger.info('Starting login');
 *     // Implementation...
 *   }
 * }
 * ```
 */
export abstract class BaseAuthProvider implements AuthProvider {
  /**
   * Logger instance for this provider
   */
  protected readonly logger: Logger;

  /**
   * Retry options for authentication operations
   */
  protected readonly retryOptions: Required<AuthRetryOptions>;

  /**
   * Provider name for logging
   */
  protected readonly providerName: string;

  /**
   * Create a new base auth provider
   *
   * @param providerName - Name for logging (e.g., 'oidc', 'form', 'token')
   * @param retryOptions - Optional retry configuration override
   */
  constructor(
    providerName: string,
    retryOptions: AuthRetryOptions = {}
  ) {
    this.providerName = providerName;
    this.logger = createLogger('auth', providerName);
    this.retryOptions = {
      ...DEFAULT_AUTH_RETRY_OPTIONS,
      ...retryOptions,
    };
  }

  /**
   * Perform full login flow
   *
   * @param page - Playwright Page object
   * @param credentials - Username and password
   */
  abstract login(page: Page, credentials: Credentials): Promise<void>;

  /**
   * Check if current session is still valid
   *
   * @param page - Playwright Page object
   * @returns true if session is valid
   */
  abstract isSessionValid(page: Page): Promise<boolean>;

  /**
   * Perform logout
   *
   * @param page - Playwright Page object
   */
  abstract logout(page: Page): Promise<void>;

  /**
   * Attempt to refresh the session (optional)
   *
   * Default implementation returns false (refresh not supported).
   * Override in subclasses that support session refresh.
   *
   * @param page - Playwright Page object
   * @returns true if refresh succeeded, false if login required
   */
  refreshSession(_page: Page): Promise<boolean> {
    this.logger.debug('Session refresh not supported by this provider');
    return Promise.resolve(false);
  }

  // ===========================================================================
  // Protected Helper Methods
  // ===========================================================================

  /**
   * Wait for successful navigation after login
   *
   * Waits for either a URL pattern or element selector to indicate success.
   *
   * @param page - Playwright Page
   * @param options - Success detection options
   */
  protected async waitForLoginSuccess(
    page: Page,
    options: {
      url?: string;
      selector?: string;
      timeout?: number;
    }
  ): Promise<void> {
    const timeout = options.timeout ?? 5000;

    if (options.url && options.selector) {
      // Wait for either URL or selector
      await Promise.race([
        page.waitForURL(options.url, { timeout }),
        page.waitForSelector(options.selector, { timeout, state: 'visible' }),
      ]);
    } else if (options.url) {
      await page.waitForURL(options.url, { timeout });
    } else if (options.selector) {
      await page.waitForSelector(options.selector, { timeout, state: 'visible' });
    } else {
      // No success criteria - just wait for load state
      await page.waitForLoadState('networkidle', { timeout });
    }
  }

  /**
   * Fill a form field with retry on failure
   *
   * @param page - Playwright Page
   * @param selector - Field selector
   * @param value - Value to fill
   * @param options - Fill options
   */
  protected async fillField(
    page: Page,
    selector: string,
    value: string,
    options: { timeout?: number; clearFirst?: boolean } = {}
  ): Promise<void> {
    const timeout = options.timeout ?? 5000;
    const clearFirst = options.clearFirst ?? true;

    const locator = page.locator(selector);
    await locator.waitFor({ state: 'visible', timeout });

    if (clearFirst) {
      await locator.clear();
    }

    await locator.fill(value);
  }

  /**
   * Click an element with retry on failure
   *
   * @param page - Playwright Page
   * @param selector - Element selector
   * @param options - Click options
   */
  protected async clickElement(
    page: Page,
    selector: string,
    options: { timeout?: number; force?: boolean } = {}
  ): Promise<void> {
    const timeout = options.timeout ?? 5000;
    const force = options.force ?? false;

    const locator = page.locator(selector);
    await locator.waitFor({ state: 'visible', timeout });
    await locator.click({ force, timeout });
  }

  /**
   * Check if an element is visible on page
   *
   * @param page - Playwright Page
   * @param selector - Element selector
   * @param timeout - How long to check for visibility
   * @returns true if element is visible
   */
  protected async isElementVisible(
    page: Page,
    selector: string,
    timeout: number = 1000
  ): Promise<boolean> {
    try {
      await page.waitForSelector(selector, { state: 'visible', timeout });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the current page URL
   *
   * @param page - Playwright Page
   * @returns Current URL
   */
  protected getCurrentUrl(page: Page): string {
    return page.url();
  }

  /**
   * Check if current URL matches a pattern
   *
   * @param page - Playwright Page
   * @param pattern - URL pattern (string or RegExp)
   * @returns true if URL matches
   */
  protected urlMatches(page: Page, pattern: string | RegExp): boolean {
    const url = this.getCurrentUrl(page);
    if (typeof pattern === 'string') {
      return url.includes(pattern);
    }
    return pattern.test(url);
  }

  /**
   * Calculate delay for retry attempt using exponential backoff
   *
   * @param attempt - Current attempt number (0-indexed)
   * @returns Delay in milliseconds
   */
  protected calculateRetryDelay(attempt: number): number {
    const baseDelay = this.retryOptions.initialDelayMs;
    const multiplier = this.retryOptions.backoffMultiplier;
    const maxDelay = this.retryOptions.maxDelayMs;

    const delay = baseDelay * Math.pow(multiplier, attempt);
    return Math.min(delay, maxDelay);
  }

  /**
   * Determine if an error should trigger a retry
   *
   * @param error - Error that occurred
   * @returns true if should retry
   */
  protected shouldRetry(error: Error): boolean {
    const message = error.message.toLowerCase();

    // Retry on timeout
    if (this.retryOptions.retryOnTimeout) {
      if (message.includes('timeout') || message.includes('timed out')) {
        return true;
      }
    }

    // Retry on network errors
    if (this.retryOptions.retryOnNetworkError) {
      if (
        message.includes('network') ||
        message.includes('net::') ||
        message.includes('econnrefused') ||
        message.includes('enotfound')
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Sleep for a specified duration
   *
   * @param ms - Duration in milliseconds
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Options for login operations
 */
export interface LoginOptions {
  /** Timeout for the entire login flow in ms */
  readonly timeout?: number;

  /** Whether to skip session validation after login */
  readonly skipValidation?: boolean;
}

/**
 * Options for logout operations
 */
export interface LogoutOptions {
  /** Timeout for logout in ms */
  readonly timeout?: number;

  /** Whether to also logout from IdP (for OIDC) */
  readonly idpLogout?: boolean;
}
