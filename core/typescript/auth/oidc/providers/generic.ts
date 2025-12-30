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
import type {
  Credentials,
  IdpHandler,
  OIDCIdpSelectors,
  OIDCMfaConfig,
} from '../../types.js';
import { generateTOTPCode } from '../flow.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('auth', 'generic-idp');

// =============================================================================
// Default Selectors
// =============================================================================

/**
 * Default generic form selectors
 *
 * These are common patterns that work with many IdPs.
 * Override with specific selectors in config when needed.
 */
const DEFAULT_GENERIC_SELECTORS: OIDCIdpSelectors = {
  // Common username/email input patterns
  username: [
    'input[type="email"]',
    'input[name="username"]',
    'input[name="email"]',
    'input[id*="username"]',
    'input[id*="email"]',
    'input[autocomplete="username"]',
  ].join(', '),

  // Common password input patterns
  password: [
    'input[type="password"]',
    'input[name="password"]',
    'input[id*="password"]',
    'input[autocomplete="current-password"]',
  ].join(', '),

  // Common submit button patterns
  submit: [
    'button[type="submit"]',
    'input[type="submit"]',
    'button:has-text("Sign in")',
    'button:has-text("Log in")',
    'button:has-text("Login")',
    'button:has-text("Submit")',
  ].join(', '),

  // Common TOTP input patterns
  totpInput: [
    'input[name*="otp"]',
    'input[name*="totp"]',
    'input[name*="code"]',
    'input[name*="token"]',
    'input[type="tel"][maxlength="6"]',
    'input[autocomplete="one-time-code"]',
  ].join(', '),

  // Common TOTP submit patterns
  totpSubmit: [
    'button[type="submit"]',
    'input[type="submit"]',
    'button:has-text("Verify")',
    'button:has-text("Submit")',
  ].join(', '),
};

// =============================================================================
// Generic Handler
// =============================================================================

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
export const genericHandler: IdpHandler = {
  idpType: 'generic',

  /**
   * Fill credentials on generic IdP login page
   */
  async fillCredentials(
    page: Page,
    credentials: Credentials,
    selectors?: OIDCIdpSelectors
  ): Promise<void> {
    const { username: usernameSelector, password: passwordSelector } = {
      ...DEFAULT_GENERIC_SELECTORS,
      ...selectors,
    };

    logger.debug('Filling credentials on generic IdP');

    // Wait for username field
    const usernameField = page.locator(usernameSelector!).first();
    await usernameField.waitFor({ state: 'visible', timeout: 10000 });

    // Check if password field is visible
    const passwordField = page.locator(passwordSelector!).first();
    const isPasswordVisible = await passwordField.isVisible().catch(() => false);

    if (isPasswordVisible) {
      // Single-page login - fill both fields
      await usernameField.fill(credentials.username);
      await passwordField.fill(credentials.password);
      logger.debug('Filled both username and password (single-page flow)');
    } else {
      // Might be two-step - fill username only
      await usernameField.fill(credentials.username);
      logger.debug('Filled username (possible two-step flow)');
    }
  },

  /**
   * Submit the login form
   */
  async submitForm(page: Page, selectors?: OIDCIdpSelectors): Promise<void> {
    const { submit: submitSelector, password: passwordSelector } = {
      ...DEFAULT_GENERIC_SELECTORS,
      ...selectors,
    };

    // Click submit button
    const submitButton = page.locator(submitSelector!).first();
    await submitButton.click();

    // Wait for navigation
    await page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});

    // Check for two-step flow (password appears after username submit)
    try {
      const passwordField = page.locator(passwordSelector!).first();
      const isPasswordVisible = await passwordField.isVisible({ timeout: 2000 });

      if (isPasswordVisible) {
        const passwordValue = await passwordField.inputValue();
        if (!passwordValue) {
          logger.debug('Two-step flow detected, password field now visible');
        }
      }
    } catch {
      // Password field not visible or doesn't exist
    }

    logger.debug('Form submitted');
  },

  /**
   * Handle MFA challenge
   */
  async handleMFA(page: Page, mfaConfig: OIDCMfaConfig): Promise<void> {
    if (mfaConfig.type !== 'totp') {
      logger.warn('Non-TOTP MFA type for generic handler', { type: mfaConfig.type });
      return;
    }

    const totpSelector = mfaConfig.totpInputSelector ?? DEFAULT_GENERIC_SELECTORS.totpInput;
    const submitSelector = mfaConfig.totpSubmitSelector ?? DEFAULT_GENERIC_SELECTORS.totpSubmit;

    logger.debug('Handling generic TOTP MFA');

    // Wait for OTP input
    const totpField = page.locator(totpSelector!).first();
    await totpField.waitFor({ state: 'visible', timeout: 10000 });

    // Generate and enter code
    if (!mfaConfig.totpSecretEnv) {
      throw new Error('TOTP secret environment variable not configured');
    }

    const code = generateTOTPCode(mfaConfig.totpSecretEnv);
    await totpField.fill(code);

    // Submit
    const submitButton = page.locator(submitSelector!).first();
    await submitButton.click();

    logger.debug('TOTP code submitted');
  },

  /**
   * Handle post-login prompts (generic - does nothing by default)
   */
  async handlePostLoginPrompts(_page: Page, _selectors?: OIDCIdpSelectors): Promise<void> {
    // Generic handler doesn't handle specific post-login prompts
    // Specific IdP handlers should override this
    logger.debug('No post-login prompt handling for generic IdP');
  },

  /**
   * Get default generic selectors
   */
  getDefaultSelectors(): OIDCIdpSelectors {
    return { ...DEFAULT_GENERIC_SELECTORS };
  },
};

// =============================================================================
// Factory Function
// =============================================================================

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
export function createGenericHandler(customSelectors: OIDCIdpSelectors): IdpHandler {
  const mergedSelectors = {
    ...DEFAULT_GENERIC_SELECTORS,
    ...customSelectors,
  };

  return {
    idpType: 'generic',

    async fillCredentials(
      page: Page,
      credentials: Credentials,
      selectors?: OIDCIdpSelectors
    ): Promise<void> {
      const finalSelectors = { ...mergedSelectors, ...selectors };
      return genericHandler.fillCredentials(page, credentials, finalSelectors);
    },

    async submitForm(page: Page, selectors?: OIDCIdpSelectors): Promise<void> {
      const finalSelectors = { ...mergedSelectors, ...selectors };
      return genericHandler.submitForm(page, finalSelectors);
    },

    async handleMFA(page: Page, mfaConfig: OIDCMfaConfig): Promise<void> {
      return genericHandler.handleMFA!(page, mfaConfig);
    },

    async handlePostLoginPrompts(page: Page, selectors?: OIDCIdpSelectors): Promise<void> {
      const finalSelectors = { ...mergedSelectors, ...selectors };
      return genericHandler.handlePostLoginPrompts!(page, finalSelectors);
    },

    getDefaultSelectors(): OIDCIdpSelectors {
      return { ...mergedSelectors };
    },
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Try to detect which IdP type based on URL patterns
 *
 * @param page - Playwright Page
 * @returns Detected IdP type or 'generic'
 */
export function detectIdpType(page: Page): string {
  const url = page.url().toLowerCase();

  if (url.includes('keycloak') || url.includes('/auth/realms/')) {
    return 'keycloak';
  }

  if (url.includes('login.microsoftonline.com') || url.includes('login.live.com')) {
    return 'azure-ad';
  }

  if (url.includes('.okta.com') || url.includes('.oktapreview.com')) {
    return 'okta';
  }

  if (url.includes('auth0.com')) {
    return 'auth0';
  }

  return 'generic';
}

/**
 * Get generic error message from page
 */
export async function getGenericErrorMessage(page: Page): Promise<string | undefined> {
  const errorSelectors = [
    '.error',
    '.error-message',
    '.alert-danger',
    '.alert-error',
    '[role="alert"]',
    '.form-error',
    '.login-error',
  ];

  for (const selector of errorSelectors) {
    try {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 500 })) {
        return await element.textContent() ?? undefined;
      }
    } catch {
      // Continue
    }
  }

  return undefined;
}
