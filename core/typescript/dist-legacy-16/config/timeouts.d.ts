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
export declare const TIMEOUTS: {
    /** Navigation timeout for auth pages */
    readonly AUTH_NAVIGATION_MS: 30000;
    /** Timeout for submitting credentials */
    readonly AUTH_SUBMIT_MS: 10000;
    /** Timeout for detecting successful authentication */
    readonly AUTH_SUCCESS_MS: 5000;
    /** Timeout for MFA push notification approval */
    readonly AUTH_MFA_PUSH_MS: 60000;
    /** Total timeout for complete login flow */
    readonly AUTH_LOGIN_FLOW_MS: 30000;
    /** Timeout for IdP redirect */
    readonly AUTH_IDP_REDIRECT_MS: 10000;
    /** Timeout for OAuth callback processing */
    readonly AUTH_CALLBACK_MS: 5000;
    /** Timeout for OIDC success URL detection */
    readonly OIDC_SUCCESS_MS: 5000;
    /** Default timeout for toast notifications */
    readonly TOAST_DEFAULT_MS: 5000;
    /** Default timeout for loading indicators */
    readonly LOADING_DEFAULT_MS: 30000;
    /** Default timeout for form validation */
    readonly FORM_VALIDATION_MS: 5000;
    /** Timeout for API requests */
    readonly API_REQUEST_MS: 30000;
    /** Timeout for acquiring tokens */
    readonly TOKEN_ACQUIRE_MS: 10000;
};
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
export declare function getTimeout(key: TimeoutKey): number;
//# sourceMappingURL=timeouts.d.ts.map