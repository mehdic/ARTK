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
import type { AuthPhase, Credentials, IdpHandler, OIDCAuthProviderConfig } from '../types.js';
import { ARTKAuthError } from '../../errors/auth-error.js';
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
export declare function generateTOTPCode(secretEnvVar: string, env?: Record<string, string | undefined>): string;
/**
 * Verify a TOTP code against a secret
 *
 * @param code - 6-digit TOTP code to verify
 * @param secretEnvVar - Environment variable containing TOTP secret
 * @param env - Environment variables
 * @returns true if code is valid
 */
export declare function verifyTOTPCode(code: string, secretEnvVar: string, env?: Record<string, string | undefined>): boolean;
/**
 * Get time until next TOTP code window
 *
 * Useful for waiting if a code is about to expire.
 *
 * @returns Seconds until next TOTP window (0-30)
 */
export declare function getTimeUntilNextTOTPWindow(): number;
/**
 * Wait for next TOTP window if current code is about to expire
 *
 * @param thresholdSeconds - If less than this many seconds remain, wait for next window
 * @returns Whether we waited
 */
export declare function waitForFreshTOTPWindow(thresholdSeconds?: number): Promise<boolean>;
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
export declare function executeOIDCFlow(page: Page, config: OIDCAuthProviderConfig, credentials: Credentials, options: OIDCFlowOptions): Promise<OIDCFlowResult>;
/**
 * Check if current session is valid by looking for success indicators
 *
 * @param page - Playwright Page
 * @param config - OIDC configuration
 * @returns true if session appears valid
 */
export declare function isOIDCSessionValid(page: Page, config: OIDCAuthProviderConfig): Promise<boolean>;
//# sourceMappingURL=flow.d.ts.map