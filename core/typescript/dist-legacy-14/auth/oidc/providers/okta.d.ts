/**
 * Okta IdP handler
 *
 * Handles Okta-specific login page interactions.
 *
 * FR-006: Support OIDC with configurable Identity Provider handlers (Okta)
 *
 * @module auth/oidc/providers/okta
 */
import type { Page } from '@playwright/test';
import type { IdpHandler } from '../../types.js';
/**
 * Okta Identity Provider handler
 *
 * Handles:
 * - Standard username/password login
 * - Okta Identity Engine flows
 * - TOTP-based MFA
 * - Push notification MFA (with timeout)
 */
export declare const oktaHandler: IdpHandler;
/**
 * Check if current page is an Okta login page
 */
export declare function isOktaLoginPage(page: Page): boolean;
/**
 * Check if Okta shows an error message
 */
export declare function getOktaErrorMessage(page: Page): Promise<string | undefined>;
/**
 * Check if Okta requires MFA factor selection
 */
export declare function isOktaFactorSelectionRequired(page: Page): Promise<boolean>;
//# sourceMappingURL=okta.d.ts.map