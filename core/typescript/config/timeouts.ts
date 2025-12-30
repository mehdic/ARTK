/**
 * Centralized timeout constants
 *
 * All timeout values used throughout ARTK Core are defined here
 * for easy auditing and global adjustments.
 *
 * @module config/timeouts
 */

/**
 * Timeout constants in milliseconds
 */
export const TIMEOUTS = {
  // =============================================================================
  // Authentication Timeouts
  // =============================================================================

  /** Navigation timeout for auth pages */
  AUTH_NAVIGATION_MS: 30000,

  /** Timeout for submitting credentials */
  AUTH_SUBMIT_MS: 10000,

  /** Timeout for detecting successful authentication */
  AUTH_SUCCESS_MS: 5000,

  /** Timeout for MFA push notification approval */
  AUTH_MFA_PUSH_MS: 60000,

  /** Total timeout for complete login flow */
  AUTH_LOGIN_FLOW_MS: 30000,

  /** Timeout for IdP redirect */
  AUTH_IDP_REDIRECT_MS: 10000,

  /** Timeout for OAuth callback processing */
  AUTH_CALLBACK_MS: 5000,

  // =============================================================================
  // OIDC Specific Timeouts
  // =============================================================================

  /** Timeout for OIDC success URL detection */
  OIDC_SUCCESS_MS: 5000,

  // =============================================================================
  // Assertion Timeouts
  // =============================================================================

  /** Default timeout for toast notifications */
  TOAST_DEFAULT_MS: 5000,

  /** Default timeout for loading indicators */
  LOADING_DEFAULT_MS: 30000,

  /** Default timeout for form validation */
  FORM_VALIDATION_MS: 5000,

  // =============================================================================
  // API Timeouts
  // =============================================================================

  /** Timeout for API requests */
  API_REQUEST_MS: 30000,

  /** Timeout for acquiring tokens */
  TOKEN_ACQUIRE_MS: 10000,
} as const;

/**
 * Type-safe timeout keys
 */
export type TimeoutKey = keyof typeof TIMEOUTS;

/**
 * Get timeout value by key
 *
 * @param key - Timeout constant key
 * @returns Timeout value in milliseconds
 *
 * @example
 * ```typescript
 * const timeout = getTimeout('AUTH_LOGIN_FLOW_MS');
 * await page.waitForURL('/dashboard', { timeout });
 * ```
 */
export function getTimeout(key: TimeoutKey): number {
  return TIMEOUTS[key];
}
