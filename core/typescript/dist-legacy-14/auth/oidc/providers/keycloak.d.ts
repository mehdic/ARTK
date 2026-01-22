/**
 * Keycloak IdP handler
 *
 * Handles Keycloak-specific login page interactions.
 * Keycloak is the primary IdP for ITSS and many enterprise applications.
 *
 * FR-006: Support OIDC with configurable Identity Provider handlers (Keycloak primary)
 *
 * @module auth/oidc/providers/keycloak
 */
import type { Page } from '@playwright/test';
import type { IdpHandler } from '../../types.js';
/**
 * Keycloak Identity Provider handler
 *
 * Handles:
 * - Standard username/password login
 * - Two-step login (username then password)
 * - TOTP-based MFA
 * - Required actions (update password, verify email, etc.)
 */
export declare const keycloakHandler: IdpHandler;
/**
 * Check if current page is a Keycloak login page
 */
export declare function isKeycloakLoginPage(page: Page): boolean;
/**
 * Check if Keycloak shows an error message
 */
export declare function getKeycloakErrorMessage(page: Page): Promise<string | undefined>;
//# sourceMappingURL=keycloak.d.ts.map