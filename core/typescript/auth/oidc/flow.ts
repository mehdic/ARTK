/**
 * Generic OIDC flow handler
 *
 * Orchestrates the complete OIDC authentication flow:
 * 1. Navigate to app login URL
 * 2. Handle IdP redirect
 * 3. Fill credentials on IdP page
 * 4. Handle MFA (if enabled)
 * 5. Handle callback redirect
 * 6. Verify successful authentication
 *
 * FR-006: System MUST support OIDC with configurable Identity Provider handlers
 * FR-010: System MUST handle TOTP-based MFA by generating codes from configured secret
 *
 * @module auth/oidc/flow
 */

import type { Page } from '@playwright/test';
import { authenticator } from 'otplib';
import type {
  AuthPhase,
  Credentials,
  IdpHandler,
  OIDCAuthProviderConfig,
  OIDCMfaConfig,
} from '../types.js';
import { ARTKAuthError } from '../../errors/auth-error.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('auth', 'oidc-flow');

// =============================================================================
// TOTP Generation (T038)
// =============================================================================

/**
 * Generate TOTP code from a secret stored in environment variable
 *
 * FR-010: Handle TOTP-based MFA by generating codes from configured secret
 *
 * @param secretEnvVar - Name of environment variable containing TOTP secret
 * @param env - Environment variables (defaults to process.env)
 * @returns 6-digit TOTP code
 * @throws ARTKAuthError if env var not set or secret invalid
 *
 * @example
 * ```typescript
 * // Given: MFA_SECRET_ADMIN=JBSWY3DPEHPK3PXP
 * const code = generateTOTPCode('MFA_SECRET_ADMIN');
 * // Returns: '123456' (time-based code)
 * ```
 */
export function generateTOTPCode(
  secretEnvVar: string,
  env: Record<string, string | undefined> = process.env
): string {
  const secret = env[secretEnvVar];

  if (!secret) {
    logger.error('TOTP secret environment variable not set', { envVar: secretEnvVar });
    throw new ARTKAuthError(
      `TOTP secret environment variable "${secretEnvVar}" is not set`,
      'unknown',
      'mfa',
      undefined,
      `Set the ${secretEnvVar} environment variable with your TOTP secret`
    );
  }

  try {
    // Clean the secret (remove spaces, normalize case)
    const cleanSecret = secret.replace(/\s+/g, '').toUpperCase();

    // Generate TOTP code
    const code = authenticator.generate(cleanSecret);

    logger.debug('Generated TOTP code', {
      envVar: secretEnvVar,
      codeLength: code.length,
    });

    return code;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Failed to generate TOTP code', { envVar: secretEnvVar, error: message });
    throw new ARTKAuthError(
      `Failed to generate TOTP code: ${message}`,
      'unknown',
      'mfa',
      undefined,
      `Verify that ${secretEnvVar} contains a valid base32-encoded TOTP secret`
    );
  }
}

/**
 * Verify a TOTP code against a secret
 *
 * @param code - 6-digit TOTP code to verify
 * @param secretEnvVar - Environment variable containing TOTP secret
 * @param env - Environment variables
 * @returns true if code is valid
 */
export function verifyTOTPCode(
  code: string,
  secretEnvVar: string,
  env: Record<string, string | undefined> = process.env
): boolean {
  const secret = env[secretEnvVar];

  if (!secret) {
    return false;
  }

  try {
    const cleanSecret = secret.replace(/\s+/g, '').toUpperCase();
    return authenticator.verify({ token: code, secret: cleanSecret });
  } catch {
    return false;
  }
}

/**
 * Get time until next TOTP code window
 *
 * Useful for waiting if a code is about to expire.
 *
 * @returns Seconds until next TOTP window (0-30)
 */
export function getTimeUntilNextTOTPWindow(): number {
  const step = authenticator.options.step ?? 30;
  const now = Math.floor(Date.now() / 1000);
  return step - (now % step);
}

/**
 * Wait for next TOTP window if current code is about to expire
 *
 * @param thresholdSeconds - If less than this many seconds remain, wait for next window
 * @returns Whether we waited
 */
export async function waitForFreshTOTPWindow(thresholdSeconds: number = 5): Promise<boolean> {
  const remaining = getTimeUntilNextTOTPWindow();

  if (remaining < thresholdSeconds) {
    logger.debug('Waiting for fresh TOTP window', { remaining, threshold: thresholdSeconds });
    await new Promise((resolve) => setTimeout(resolve, (remaining + 1) * 1000));
    return true;
  }

  return false;
}

// =============================================================================
// OIDC Flow Types
// =============================================================================

/**
 * Options for OIDC flow execution
 */
export interface OIDCFlowOptions {
  /** IdP-specific handler */
  readonly idpHandler: IdpHandler;

  /** Whether to skip IdP redirect (for direct IdP login) */
  readonly skipIdpRedirect?: boolean;

  /** Custom role name for error messages */
  readonly role?: string;
}

/**
 * Result of OIDC flow execution
 */
export interface OIDCFlowResult {
  /** Whether authentication succeeded */
  readonly success: boolean;

  /** Final URL after authentication */
  readonly finalUrl: string;

  /** Duration of the flow in milliseconds */
  readonly durationMs: number;

  /** Phase where flow completed or failed */
  readonly phase: AuthPhase;

  /** Error if authentication failed */
  readonly error?: ARTKAuthError;
}

// =============================================================================
// OIDC Flow Implementation (T033)
// =============================================================================

/**
 * Execute complete OIDC authentication flow
 *
 * FR-006: Support OIDC with configurable Identity Provider handlers
 *
 * @param page - Playwright Page
 * @param config - OIDC provider configuration
 * @param credentials - User credentials
 * @param options - Flow options including IdP handler
 * @returns Flow result
 *
 * @example
 * ```typescript
 * const result = await executeOIDCFlow(
 *   page,
 *   oidcConfig,
 *   { username: 'admin', password: 'secret' },
 *   { idpHandler: keycloakHandler }
 * );
 *
 * if (!result.success) {
 *   throw result.error;
 * }
 * ```
 */
export async function executeOIDCFlow(
  page: Page,
  config: OIDCAuthProviderConfig,
  credentials: Credentials,
  options: OIDCFlowOptions
): Promise<OIDCFlowResult> {
  const startTime = Date.now();
  const role = options.role ?? 'unknown';
  const { idpHandler } = options;

  logger.info('Starting OIDC flow', {
    role,
    idpType: config.idpType,
    loginUrl: config.loginUrl,
  });

  try {
    // Phase 1: Navigate to login URL
    await navigateToLogin(page, config, role);

    // Phase 2: Wait for IdP redirect (if not direct IdP login)
    if (!options.skipIdpRedirect && config.loginUrl !== config.idpLoginUrl) {
      await waitForIdPRedirect(page, config, role);
    }

    // Phase 3: Fill credentials on IdP page
    await fillIdPCredentials(page, config, credentials, idpHandler, role);

    // Phase 4: Submit login form
    await submitIdPForm(page, config, idpHandler, role);

    // Phase 5: Handle MFA (if enabled)
    if (config.mfa?.enabled) {
      await handleMFA(page, config.mfa, idpHandler, role);
    }

    // Phase 6: Handle post-login prompts (e.g., "Stay signed in?")
    if (idpHandler.handlePostLoginPrompts) {
      await idpHandler.handlePostLoginPrompts(page, config.idpSelectors);
    }

    // Phase 7: Wait for callback/success
    await waitForSuccess(page, config, role);

    const duration = Date.now() - startTime;
    logger.info('OIDC flow completed successfully', {
      role,
      durationMs: duration,
      finalUrl: page.url(),
    });

    return {
      success: true,
      finalUrl: page.url(),
      durationMs: duration,
      phase: 'callback',
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const authError = error instanceof ARTKAuthError
      ? error
      : new ARTKAuthError(
          error instanceof Error ? error.message : String(error),
          role,
          'credentials'
        );

    logger.error('OIDC flow failed', {
      role,
      phase: authError.phase,
      durationMs: duration,
      error: authError.message,
    });

    return {
      success: false,
      finalUrl: page.url(),
      durationMs: duration,
      phase: authError.phase,
      error: authError,
    };
  }
}

// =============================================================================
// Flow Step Functions
// =============================================================================

/**
 * Navigate to the login initiation URL
 */
async function navigateToLogin(
  page: Page,
  config: OIDCAuthProviderConfig,
  role: string
): Promise<void> {
  const timeout = config.timeouts?.loginFlowMs ?? 30000;

  logger.debug('Navigating to login URL', { url: config.loginUrl });

  try {
    await page.goto(config.loginUrl, {
      waitUntil: 'domcontentloaded',
      timeout,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ARTKAuthError(
      `Failed to navigate to login URL: ${message}`,
      role,
      'navigation',
      undefined,
      `Verify the login URL is correct and accessible: ${config.loginUrl}`
    );
  }
}

/**
 * Wait for redirect to IdP login page
 */
async function waitForIdPRedirect(
  page: Page,
  config: OIDCAuthProviderConfig,
  role: string
): Promise<void> {
  const timeout = config.timeouts?.idpRedirectMs ?? 10000;

  logger.debug('Waiting for IdP redirect');

  // If we have an idpLoginUrl, wait for it specifically
  if (config.idpLoginUrl) {
    try {
      await page.waitForURL((url) => url.toString().includes(new URL(config.idpLoginUrl!).host), {
        timeout,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new ARTKAuthError(
        `Timeout waiting for IdP redirect: ${message}`,
        role,
        'navigation',
        undefined,
        'The application may not have redirected to the IdP login page'
      );
    }
  } else {
    // Wait for URL to change from the original login URL
    const originalUrl = page.url();
    try {
      await page.waitForURL((url) => url.toString() !== originalUrl, { timeout });
    } catch {
      // URL may not change if it's a SPA, continue anyway
      logger.debug('URL did not change, may be SPA behavior');
    }
  }
}

/**
 * Fill credentials on IdP login page
 */
async function fillIdPCredentials(
  page: Page,
  config: OIDCAuthProviderConfig,
  credentials: Credentials,
  idpHandler: IdpHandler,
  role: string
): Promise<void> {
  logger.debug('Filling credentials on IdP page');

  try {
    await idpHandler.fillCredentials(page, credentials, config.idpSelectors);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ARTKAuthError(
      `Failed to fill credentials on IdP page: ${message}`,
      role,
      'credentials',
      undefined,
      'Check if the IdP selectors are correct for username/password fields'
    );
  }
}

/**
 * Submit the IdP login form
 */
async function submitIdPForm(
  page: Page,
  config: OIDCAuthProviderConfig,
  idpHandler: IdpHandler,
  role: string
): Promise<void> {
  logger.debug('Submitting IdP login form');

  try {
    await idpHandler.submitForm(page, config.idpSelectors);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ARTKAuthError(
      `Failed to submit login form: ${message}`,
      role,
      'credentials',
      undefined,
      'Check if the submit button selector is correct'
    );
  }
}

/**
 * Handle MFA challenge
 *
 * FR-010: Handle TOTP-based MFA by generating codes from configured secret
 */
async function handleMFA(
  page: Page,
  mfaConfig: OIDCMfaConfig,
  idpHandler: IdpHandler,
  role: string
): Promise<void> {
  logger.info('Handling MFA challenge', { type: mfaConfig.type });

  switch (mfaConfig.type) {
    case 'totp':
      await handleTOTPMFA(page, mfaConfig, idpHandler, role);
      break;

    case 'push':
      await handlePushMFA(page, mfaConfig, role);
      break;

    case 'sms':
      throw new ARTKAuthError(
        'SMS-based MFA is not supported for automated testing',
        role,
        'mfa',
        undefined,
        'Configure TOTP-based MFA for the test account instead'
      );

    case 'none':
      logger.debug('MFA type is none, skipping');
      break;

    default:
      // Use IdP handler if available
      if (idpHandler.handleMFA) {
        await idpHandler.handleMFA(page, mfaConfig);
      }
  }
}

/**
 * Handle TOTP MFA challenge
 */
async function handleTOTPMFA(
  page: Page,
  mfaConfig: OIDCMfaConfig,
  idpHandler: IdpHandler,
  role: string
): Promise<void> {
  if (!mfaConfig.totpSecretEnv) {
    throw new ARTKAuthError(
      'TOTP secret environment variable not configured',
      role,
      'mfa',
      undefined,
      'Configure mfa.totpSecretEnv in your artk.config.yml'
    );
  }

  // Wait for fresh TOTP window if current code is about to expire
  await waitForFreshTOTPWindow(5);

  // Generate TOTP code
  const code = generateTOTPCode(mfaConfig.totpSecretEnv);

  // Find TOTP input and fill it
  const totpSelector = mfaConfig.totpInputSelector ?? idpHandler.getDefaultSelectors().totpInput ?? 'input[name*="otp"], input[name*="totp"], input[name*="code"]';
  const submitSelector = mfaConfig.totpSubmitSelector ?? idpHandler.getDefaultSelectors().totpSubmit ?? 'button[type="submit"]';

  try {
    // Wait for TOTP input to appear
    await page.waitForSelector(totpSelector, { state: 'visible', timeout: 10000 });

    // Fill the code
    await page.fill(totpSelector, code);

    // Submit
    await page.click(submitSelector);

    logger.debug('TOTP code submitted');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ARTKAuthError(
      `Failed to complete TOTP MFA: ${message}`,
      role,
      'mfa',
      undefined,
      'Check TOTP input selector configuration and verify the secret is correct'
    );
  }
}

/**
 * Handle push notification MFA
 */
async function handlePushMFA(
  page: Page,
  mfaConfig: OIDCMfaConfig,
  role: string
): Promise<void> {
  const timeout = mfaConfig.pushTimeoutMs ?? 30000;

  logger.info('Waiting for push notification approval', { timeoutMs: timeout });

  // Wait for either success URL or push approval indicator
  // This is a best-effort approach - push MFA requires manual intervention
  try {
    await page.waitForURL((url) => {
      // Check if we've moved past the MFA page
      return !url.toString().includes('mfa') && !url.toString().includes('2fa');
    }, { timeout });
  } catch (error) {
    throw new ARTKAuthError(
      `Push MFA approval timeout after ${timeout}ms`,
      role,
      'mfa',
      undefined,
      'Approve the push notification on your device or configure TOTP instead'
    );
  }
}

/**
 * Wait for successful authentication callback
 */
async function waitForSuccess(
  page: Page,
  config: OIDCAuthProviderConfig,
  role: string
): Promise<void> {
  const timeout = config.success.timeout ?? config.timeouts?.callbackMs ?? 10000;

  logger.debug('Waiting for authentication success');

  const { url, selector } = config.success;

  if (!url && !selector) {
    // No specific success criteria - wait for network idle
    try {
      await page.waitForLoadState('networkidle', { timeout });
    } catch {
      // Network may not go idle, that's okay
    }
    return;
  }

  try {
    if (url && selector) {
      // Wait for either condition
      await Promise.race([
        page.waitForURL(url, { timeout }),
        page.waitForSelector(selector, { state: 'visible', timeout }),
      ]);
    } else if (url) {
      await page.waitForURL(url, { timeout });
    } else if (selector) {
      await page.waitForSelector(selector, { state: 'visible', timeout });
    }
  } catch (error) {
    // Check for common error indicators on page
    const errorText = await detectAuthError(page);

    throw new ARTKAuthError(
      'Authentication callback failed',
      role,
      'callback',
      errorText,
      'Verify credentials are correct and the success URL/selector configuration'
    );
  }
}

/**
 * Attempt to detect authentication error messages on the page
 */
async function detectAuthError(page: Page): Promise<string | undefined> {
  const errorSelectors = [
    '.error-message',
    '.alert-danger',
    '.error',
    '[role="alert"]',
    '.login-error',
    '#error-message',
  ];

  for (const selector of errorSelectors) {
    try {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 500 })) {
        return await element.textContent() ?? undefined;
      }
    } catch {
      // Continue checking other selectors
    }
  }

  return undefined;
}

// =============================================================================
// Session Validation
// =============================================================================

/**
 * Check if current session is valid by looking for success indicators
 *
 * @param page - Playwright Page
 * @param config - OIDC configuration
 * @returns true if session appears valid
 */
export async function isOIDCSessionValid(
  page: Page,
  config: OIDCAuthProviderConfig
): Promise<boolean> {
  const { url, selector } = config.success;

  // Check URL match
  if (url) {
    const currentUrl = page.url();
    const urlMatches = typeof url === 'string'
      ? currentUrl.includes(url)
      : new RegExp(url).test(currentUrl);

    if (!urlMatches) {
      return false;
    }
  }

  // Check selector presence
  if (selector) {
    try {
      await page.waitForSelector(selector, { state: 'visible', timeout: 1000 });
    } catch {
      return false;
    }
  }

  return true;
}
