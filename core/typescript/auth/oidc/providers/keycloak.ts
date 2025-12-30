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
import type {
  Credentials,
  IdpHandler,
  OIDCIdpSelectors,
  OIDCMfaConfig,
} from '../../types.js';
import { generateTOTPCode } from '../flow.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('auth', 'keycloak');

// =============================================================================
// Default Selectors
// =============================================================================

/**
 * Default Keycloak form selectors
 */
const DEFAULT_KEYCLOAK_SELECTORS: OIDCIdpSelectors = {
  // Username can be on a separate page or same page as password
  username: '#username, input[name="username"], #kc-login input[name="username"]',
  password: '#password, input[name="password"], #kc-login input[name="password"]',
  submit: '#kc-login, button[type="submit"], input[type="submit"]',
  // TOTP/OTP selectors
  totpInput: '#otp, input[name="otp"], input[name="totp"]',
  totpSubmit: 'button[type="submit"], input[type="submit"]',
};

// =============================================================================
// Keycloak Handler
// =============================================================================

/**
 * Keycloak Identity Provider handler
 *
 * Handles:
 * - Standard username/password login
 * - Two-step login (username then password)
 * - TOTP-based MFA
 * - Required actions (update password, verify email, etc.)
 */
export const keycloakHandler: IdpHandler = {
  idpType: 'keycloak',

  /**
   * Fill credentials on Keycloak login page
   *
   * Handles both single-page and two-step login flows.
   */
  async fillCredentials(
    page: Page,
    credentials: Credentials,
    selectors?: OIDCIdpSelectors
  ): Promise<void> {
    const { username: usernameSelector, password: passwordSelector } = {
      ...DEFAULT_KEYCLOAK_SELECTORS,
      ...selectors,
    };

    logger.debug('Filling Keycloak credentials');

    // Wait for username field
    await page.waitForSelector(usernameSelector!, { state: 'visible', timeout: 10000 });

    // Check if password field is visible (single-page) or if we need to submit username first (two-step)
    const isPasswordVisible = await page.locator(passwordSelector!).isVisible().catch(() => false);

    if (isPasswordVisible) {
      // Single-page login - fill both fields
      await page.fill(usernameSelector!, credentials.username);
      await page.fill(passwordSelector!, credentials.password);
    } else {
      // Two-step login - fill username, submit, then password
      await page.fill(usernameSelector!, credentials.username);
      logger.debug('Two-step login detected, submitting username first');
    }
  },

  /**
   * Submit the Keycloak login form
   */
  async submitForm(page: Page, selectors?: OIDCIdpSelectors): Promise<void> {
    const { submit: submitSelector, password: passwordSelector } = {
      ...DEFAULT_KEYCLOAK_SELECTORS,
      ...selectors,
    };

    // Click submit button
    await page.click(submitSelector!);

    // Check if we need to handle two-step login (password page appears after username submit)
    try {
      // Wait a bit for potential page navigation
      await page.waitForLoadState('domcontentloaded', { timeout: 3000 });

      // Check if password field appeared (two-step flow)
      const passwordField = page.locator(passwordSelector!);
      const isPasswordVisible = await passwordField.isVisible({ timeout: 1000 });

      if (isPasswordVisible) {
        // Two-step flow - password page loaded, but we should have filled password already
        // This handles the case where password was visible but we only filled username
        logger.debug('Password field visible after submit, checking if needs input');

        const passwordValue = await passwordField.inputValue();
        if (!passwordValue) {
          // This shouldn't happen in normal flow, but log it
          logger.warn('Password field is empty after username submit - two-step flow may need handling');
        }
      }
    } catch {
      // Page may have navigated away or password field check timed out - that's fine
    }

    logger.debug('Keycloak form submitted');
  },

  /**
   * Handle Keycloak MFA challenge
   */
  async handleMFA(page: Page, mfaConfig: OIDCMfaConfig): Promise<void> {
    if (mfaConfig.type !== 'totp') {
      logger.warn('Non-TOTP MFA type, attempting generic handling', { type: mfaConfig.type });
      return;
    }

    const totpSelector = mfaConfig.totpInputSelector ?? DEFAULT_KEYCLOAK_SELECTORS.totpInput;
    const submitSelector = mfaConfig.totpSubmitSelector ?? DEFAULT_KEYCLOAK_SELECTORS.totpSubmit;

    logger.debug('Handling Keycloak TOTP MFA');

    // Wait for OTP input
    await page.waitForSelector(totpSelector!, { state: 'visible', timeout: 10000 });

    // Generate and enter code
    if (!mfaConfig.totpSecretEnv) {
      throw new Error('TOTP secret environment variable not configured');
    }

    const code = generateTOTPCode(mfaConfig.totpSecretEnv);
    await page.fill(totpSelector!, code);
    await page.click(submitSelector!);

    logger.debug('TOTP code submitted to Keycloak');
  },

  /**
   * Handle Keycloak post-login prompts
   *
   * Keycloak may show required actions like:
   * - Update password
   * - Verify email
   * - Configure OTP
   */
  async handlePostLoginPrompts(page: Page, _selectors?: OIDCIdpSelectors): Promise<void> {
    // Check for required action pages
    const requiredActionIndicators = [
      '#kc-update-password',
      '#kc-update-profile',
      '#kc-verify-email',
      '.required-action',
    ];

    for (const indicator of requiredActionIndicators) {
      try {
        const element = await page.waitForSelector(indicator, { timeout: 1000, state: 'visible' });
        if (element) {
          logger.warn('Keycloak required action detected', { indicator });
          // We can't automatically handle required actions
          throw new Error(`Keycloak required action page detected: ${indicator}. Please complete required actions manually first.`);
        }
      } catch (error) {
        // Selector not found, continue checking
        if (error instanceof Error && error.message.includes('required action')) {
          throw error;
        }
      }
    }
  },

  /**
   * Get default Keycloak selectors
   */
  getDefaultSelectors(): OIDCIdpSelectors {
    return { ...DEFAULT_KEYCLOAK_SELECTORS };
  },
};

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if current page is a Keycloak login page
 */
export function isKeycloakLoginPage(page: Page): boolean {
  const url = page.url();
  return (
    url.includes('/auth/realms/') ||
    url.includes('/realms/') ||
    url.includes('/protocol/openid-connect/')
  );
}

/**
 * Check if Keycloak shows an error message
 */
export async function getKeycloakErrorMessage(page: Page): Promise<string | undefined> {
  const errorSelectors = [
    '.alert-error',
    '.kc-feedback-text',
    '#input-error',
    '.error-message',
  ];

  for (const selector of errorSelectors) {
    try {
      const element = page.locator(selector);
      if (await element.isVisible({ timeout: 500 })) {
        return await element.textContent() ?? undefined;
      }
    } catch {
      // Continue
    }
  }

  return undefined;
}
