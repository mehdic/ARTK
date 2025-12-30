/**
 * OIDC Authentication Provider
 *
 * Implements the AuthProvider interface for OIDC authentication flows.
 * Supports multiple IdPs (Keycloak, Azure AD, Okta, generic) with retry logic.
 *
 * FR-006: Support OIDC with configurable Identity Provider handlers
 * NFR-010: Retry authentication failures up to 2 times with exponential backoff
 * NFR-011: After retry exhaustion, fail with actionable error message
 * NFR-012: Log each retry attempt at warn level
 *
 * @module auth/providers/oidc
 */

import type { Page } from '@playwright/test';
import type {
  AuthRetryOptions,
  Credentials,
  IdpHandler,
  OIDCAuthProviderConfig,
} from '../types.js';
import { BaseAuthProvider } from './base.js';
import { ARTKAuthError } from '../../errors/auth-error.js';
import { executeOIDCFlow, isOIDCSessionValid } from '../oidc/flow.js';
import { keycloakHandler } from '../oidc/providers/keycloak.js';
import { azureAdHandler } from '../oidc/providers/azure-ad.js';
import { oktaHandler } from '../oidc/providers/okta.js';
import { genericHandler } from '../oidc/providers/generic.js';

// =============================================================================
// IdP Handler Registry
// =============================================================================

/**
 * Map of IdP types to their handlers
 */
const IDP_HANDLERS: Record<string, IdpHandler> = {
  keycloak: keycloakHandler,
  'azure-ad': azureAdHandler,
  okta: oktaHandler,
  auth0: genericHandler, // Auth0 uses generic handler with Auth0-specific selectors
  generic: genericHandler,
};

/**
 * Get IdP handler for a given type
 *
 * @param idpType - Type of IdP
 * @returns IdP handler
 */
export function getIdpHandler(idpType: string): IdpHandler {
  const handler = IDP_HANDLERS[idpType];
  if (!handler) {
    return genericHandler;
  }
  return handler;
}

// =============================================================================
// OIDC Auth Provider
// =============================================================================

/**
 * OIDC Authentication Provider
 *
 * Handles OIDC login flows for various Identity Providers with:
 * - Automatic IdP handler selection based on type
 * - Retry logic with exponential backoff
 * - MFA handling (TOTP)
 * - Session validation
 *
 * @example
 * ```typescript
 * const provider = new OIDCAuthProvider({
 *   idpType: 'keycloak',
 *   loginUrl: 'https://app.example.com/login',
 *   success: { url: 'https://app.example.com/dashboard' },
 * });
 *
 * await provider.login(page, credentials);
 * ```
 */
export class OIDCAuthProvider extends BaseAuthProvider {
  private readonly config: OIDCAuthProviderConfig;
  private readonly idpHandler: IdpHandler;
  private currentRole: string = 'unknown';

  /**
   * Create OIDC auth provider
   *
   * @param config - OIDC configuration
   * @param retryOptions - Optional retry configuration
   */
  constructor(
    config: OIDCAuthProviderConfig,
    retryOptions: AuthRetryOptions = {}
  ) {
    super(`oidc-${config.idpType}`, retryOptions);
    this.config = config;
    this.idpHandler = getIdpHandler(config.idpType);
  }

  /**
   * Set the role for error reporting
   *
   * @param role - Role name
   */
  setRole(role: string): void {
    this.currentRole = role;
  }

  /**
   * Perform OIDC login with retry
   *
   * NFR-010: Retry authentication failures up to 2 times with exponential backoff
   * NFR-011: After retry exhaustion, fail with actionable error message
   * NFR-012: Log each retry attempt at warn level
   *
   * @param page - Playwright Page
   * @param credentials - User credentials
   * @throws ARTKAuthError on login failure
   */
  async login(page: Page, credentials: Credentials): Promise<void> {
    let lastError: ARTKAuthError | undefined;

    for (let attempt = 0; attempt <= this.retryOptions.maxRetries; attempt++) {
      try {
        // Execute OIDC flow
        const result = await executeOIDCFlow(page, this.config, credentials, {
          idpHandler: this.idpHandler,
          role: this.currentRole,
        });

        if (result.success) {
          this.logger.info('OIDC login successful', {
            role: this.currentRole,
            idpType: this.config.idpType,
            durationMs: result.durationMs,
            attempts: attempt + 1,
          });
          return;
        }

        // Flow failed
        lastError = result.error ?? new ARTKAuthError(
          'OIDC login failed',
          this.currentRole,
          result.phase,
          undefined,
          'Check credentials and OIDC configuration'
        );

        // Check if should retry
        if (attempt < this.retryOptions.maxRetries) {
          const delay = this.calculateRetryDelay(attempt);

          // NFR-012: Log each retry attempt at warn level
          this.logger.warn(`OIDC login attempt ${attempt + 1} failed, retrying in ${delay}ms`, {
            role: this.currentRole,
            attempt: attempt + 1,
            maxRetries: this.retryOptions.maxRetries,
            delayMs: delay,
            error: lastError.message,
          });

          await this.sleep(delay);
        }
      } catch (error) {
        // Unexpected error
        if (error instanceof ARTKAuthError) {
          lastError = error;
        } else {
          lastError = new ARTKAuthError(
            error instanceof Error ? error.message : String(error),
            this.currentRole,
            'credentials'
          );
        }

        // Check if should retry
        if (attempt < this.retryOptions.maxRetries && this.shouldRetry(lastError)) {
          const delay = this.calculateRetryDelay(attempt);

          this.logger.warn(`OIDC login error, retrying in ${delay}ms`, {
            role: this.currentRole,
            attempt: attempt + 1,
            delayMs: delay,
            error: lastError.message,
          });

          await this.sleep(delay);
        }
      }
    }

    // NFR-011: After retry exhaustion, fail with actionable error message
    this.logger.error('OIDC login failed after all retries', {
      role: this.currentRole,
      maxRetries: this.retryOptions.maxRetries,
      error: lastError?.message,
    });

    throw new ARTKAuthError(
      `OIDC login failed after ${this.retryOptions.maxRetries + 1} attempts: ${lastError?.message ?? 'Unknown error'}`,
      this.currentRole,
      lastError?.phase ?? 'credentials',
      lastError?.idpResponse,
      `Verify credentials for role "${this.currentRole}" are correct. Check OIDC configuration and IdP status.`
    );
  }

  /**
   * Check if current session is valid
   *
   * @param page - Playwright Page
   * @returns true if session is valid
   */
  async isSessionValid(page: Page): Promise<boolean> {
    try {
      // Navigate to a protected page or check for session indicators
      const currentUrl = page.url();

      // If we're on the login page, session is not valid
      if (currentUrl.includes(this.config.loginUrl)) {
        return false;
      }

      // Check for success indicators
      return await isOIDCSessionValid(page, this.config);
    } catch (error) {
      this.logger.debug('Session validation failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Attempt to refresh the session
   *
   * OIDC sessions are typically refreshed via silent renewal.
   * This method attempts a simple page refresh to trigger token refresh.
   *
   * @param page - Playwright Page
   * @returns true if session is still valid after refresh
   */
  async refreshSession(page: Page): Promise<boolean> {
    try {
      this.logger.debug('Attempting OIDC session refresh');

      // Reload page to trigger any token refresh
      await page.reload({ waitUntil: 'networkidle' });

      // Check if we were redirected to login
      if (page.url().includes(this.config.loginUrl)) {
        this.logger.debug('Session refresh failed - redirected to login');
        return false;
      }

      // Validate session
      const isValid = await this.isSessionValid(page);

      this.logger.debug('Session refresh result', { isValid });
      return isValid;
    } catch (error) {
      this.logger.warn('Session refresh error', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Perform logout
   *
   * @param page - Playwright Page
   */
  async logout(page: Page): Promise<void> {
    this.logger.debug('Performing OIDC logout', { role: this.currentRole });

    try {
      const logoutConfig = this.config.logout;

      if (logoutConfig?.url) {
        // Navigate to logout URL
        await page.goto(logoutConfig.url, { waitUntil: 'networkidle' });

        // If IdP logout is configured, handle redirect
        if (logoutConfig.idpLogout) {
          // Wait for IdP logout to complete
          await page.waitForLoadState('networkidle', { timeout: 10000 });
        }
      } else {
        // Try common logout URLs
        const baseUrl = new URL(this.config.loginUrl).origin;
        const logoutUrls = [
          `${baseUrl}/logout`,
          `${baseUrl}/api/logout`,
          `${baseUrl}/auth/logout`,
        ];

        for (const url of logoutUrls) {
          try {
            const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 5000 });
            if (response?.ok()) {
              this.logger.debug('Logout successful', { url });
              return;
            }
          } catch {
            // Try next URL
          }
        }

        // Clear cookies as fallback
        await page.context().clearCookies();
        this.logger.debug('Cleared cookies as logout fallback');
      }
    } catch (error) {
      this.logger.warn('Logout error', {
        error: error instanceof Error ? error.message : String(error),
      });
      // Clear cookies even if logout fails
      await page.context().clearCookies();
    }
  }

  /**
   * Get the configured IdP handler
   */
  getIdpHandler(): IdpHandler {
    return this.idpHandler;
  }

  /**
   * Get the OIDC configuration
   */
  getConfig(): OIDCAuthProviderConfig {
    return this.config;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create OIDC auth provider from config
 *
 * @param config - OIDC configuration
 * @param retryOptions - Optional retry configuration
 * @returns OIDC auth provider instance
 */
export function createOIDCAuthProvider(
  config: OIDCAuthProviderConfig,
  retryOptions?: AuthRetryOptions
): OIDCAuthProvider {
  return new OIDCAuthProvider(config, retryOptions);
}
