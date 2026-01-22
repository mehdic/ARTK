/**
 * Azure AD / Entra ID handler
 *
 * Handles Microsoft Azure Active Directory (now Entra ID) login page interactions.
 *
 * FR-006: Support OIDC with configurable Identity Provider handlers (Azure AD)
 *
 * @module auth/oidc/providers/azure-ad
 */
import type { Page } from '@playwright/test';
import type { IdpHandler } from '../../types.js';
/**
 * Azure AD / Entra ID handler
 *
 * Handles:
 * - Multi-step username/password login
 * - "Stay signed in?" prompt
 * - TOTP-based MFA
 * - Conditional Access prompts
 */
export declare const azureAdHandler: IdpHandler;
/**
 * Check if current page is an Azure AD login page
 */
export declare function isAzureAdLoginPage(page: Page): boolean;
/**
 * Check if Azure AD shows an error message
 */
export declare function getAzureAdErrorMessage(page: Page): Promise<string | undefined>;
/**
 * Check if Azure AD requires MFA
 */
export declare function isAzureAdMfaRequired(page: Page): Promise<boolean>;
//# sourceMappingURL=azure-ad.d.ts.map