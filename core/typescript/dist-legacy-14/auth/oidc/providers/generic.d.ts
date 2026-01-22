/**
 * Generic OIDC IdP handler
 *
 * Handles generic OIDC providers that don't have a specific handler.
 * Uses configurable selectors to interact with any OIDC login page.
 *
 * FR-006: Support OIDC with configurable Identity Provider handlers (Generic)
 *
 * @module auth/oidc/providers/generic
 */
import type { Page } from '@playwright/test';
import type { IdpHandler, OIDCIdpSelectors } from '../../types.js';
/**
 * Generic OIDC Identity Provider handler
 *
 * Provides a flexible handler that works with most OIDC providers
 * using common selector patterns. Custom selectors can be provided
 * via configuration to handle specific IdP quirks.
 *
 * Handles:
 * - Single-page and two-step login flows
 * - TOTP-based MFA
 * - Common error detection
 */
export declare const genericHandler: IdpHandler;
/**
 * Create a generic handler with custom selectors
 *
 * @param customSelectors - Custom selectors to merge with defaults
 * @returns Customized IdP handler
 *
 * @example
 * ```typescript
 * const myIdpHandler = createGenericHandler({
 *   username: '#my-username-field',
 *   password: '#my-password-field',
 *   submit: '#my-submit-button',
 * });
 * ```
 */
export declare function createGenericHandler(customSelectors: OIDCIdpSelectors): IdpHandler;
/**
 * Try to detect which IdP type based on URL patterns
 *
 * @param page - Playwright Page
 * @returns Detected IdP type or 'generic'
 */
export declare function detectIdpType(page: Page): string;
/**
 * Get generic error message from page
 */
export declare function getGenericErrorMessage(page: Page): Promise<string | undefined>;
//# sourceMappingURL=generic.d.ts.map