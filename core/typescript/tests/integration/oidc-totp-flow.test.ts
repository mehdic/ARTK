/**
 * Integration Tests: OIDC + TOTP MFA Flow (P1-1)
 *
 * Verifies OIDC authentication with TOTP MFA integration.
 * Tests FR-009 (TOTP generation) and FR-010 (timeout configuration).
 *
 * @module tests/integration/oidc-totp-flow
 */

/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Page } from '@playwright/test';
import { authenticator } from 'otplib';
import { generateTOTPCode } from '../../auth/oidc/flow.js';
import { OIDCAuthProvider } from '../../auth/providers/oidc.js';

// =============================================================================
// Test Helpers and Mocks
// =============================================================================

/**
 * Create a mock Playwright Page for OIDC flow testing
 */
function createMockPage(): Page {
  let currentUrl = 'https://app.example.com/login';

  const mockPage = {
    url: vi.fn(() => currentUrl),

    goto: vi.fn(async (url: string) => {
      currentUrl = url;
      return null;
    }),

    waitForURL: vi.fn(async (urlOrPredicate: string | ((url: URL) => boolean)) => {
      // Simulate successful URL navigation
      if (typeof urlOrPredicate === 'string') {
        currentUrl = urlOrPredicate;
      } else {
        // For predicate, simulate navigation to dashboard
        currentUrl = 'https://app.example.com/dashboard';
      }
      return undefined;
    }),

    waitForSelector: vi.fn(async (selector: string, _options?: { timeout?: number; state?: string }) => {
      // Don't return elements for Keycloak required action indicators (to avoid triggering post-login prompt handling)
      const requiredActionIndicators = [
        '#kc-update-password',
        '#kc-update-profile',
        '#kc-verify-email',
        '.required-action',
      ];

      if (requiredActionIndicators.includes(selector)) {
        // Simulate timeout - element not found
        throw new Error(`Timeout waiting for selector "${selector}"`);
      }

      // Simulate selector found for other selectors
      return {
        isVisible: async () => true,
        textContent: async () => null,
      };
    }),

    fill: vi.fn(async () => {
      // Mock fill operation
      return undefined;
    }),

    click: vi.fn(async () => {
      // Mock click operation
      return undefined;
    }),

    waitForLoadState: vi.fn(async () => {
      return undefined;
    }),

    locator: vi.fn((selector: string) => ({
      isVisible: vi.fn(async () => {
        // Mock password field as visible for single-page login
        if (selector.includes('password')) {
          return true;
        }
        return false;
      }),
      inputValue: vi.fn(async () => ''),
      textContent: vi.fn(async () => null),
      first: () => ({
        isVisible: async () => false,
        textContent: async () => null,
      }),
    })),
  } as unknown as Page;

  return mockPage;
}

// =============================================================================
// Integration Tests: OIDC + TOTP Flow
// =============================================================================

describe('OIDC + TOTP Integration', () => {
  const testTotpSecret = 'JBSWY3DPEHPK3PXP'; // Standard test secret

  beforeEach(() => {
    // Set up test environment variable for TOTP secret
    vi.stubEnv('TEST_TOTP_SECRET', testTotpSecret);
    vi.stubEnv('ADMIN_USER', 'admin@example.com');
    vi.stubEnv('ADMIN_PASS', 'admin-password');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should complete OIDC flow with TOTP MFA', async () => {
    // Setup: Mock page and configure provider with MFA
    const mockPage = createMockPage();

    const provider = new OIDCAuthProvider({
      idpType: 'keycloak',
      loginUrl: 'https://keycloak.example.com/auth/login',
      success: { url: 'https://app.example.com/dashboard' },
      mfa: {
        enabled: true,
        type: 'totp',
        totpSecretEnv: 'TEST_TOTP_SECRET',
      },
    });

    // TOTP code will be generated during login process

    // Execute login
    await provider.login(mockPage, {
      username: 'admin@example.com',
      password: 'admin-password',
    });

    // Verify navigation happened
    expect(mockPage.goto).toHaveBeenCalledWith(
      'https://keycloak.example.com/auth/login',
      expect.objectContaining({
        waitUntil: 'domcontentloaded',
      })
    );

    // Verify credentials were filled
    expect(mockPage.fill).toHaveBeenCalledWith(
      expect.stringContaining('username'),
      'admin@example.com'
    );
    expect(mockPage.fill).toHaveBeenCalledWith(
      expect.stringContaining('password'),
      'admin-password'
    );

    // Verify TOTP code was generated and filled
    // The code should be a 6-digit number
    const totpCalls = (mockPage.fill as any).mock.calls.filter(
      (call: any[]) => /^\d{6}$/.test(call[1])
    );

    expect(totpCalls.length).toBeGreaterThan(0);

    // Verify the generated code is valid
    const filledCode = totpCalls[0][1];
    expect(filledCode).toHaveLength(6);
    expect(filledCode).toMatch(/^\d{6}$/);

    // Verify it's a valid TOTP code (within time window tolerance)
    const isValid = authenticator.verify({
      token: filledCode,
      secret: testTotpSecret,
    });
    expect(isValid).toBe(true);

    // Verify submit was clicked
    expect(mockPage.click).toHaveBeenCalled();

    // Verify we waited for success
    expect(mockPage.waitForURL).toHaveBeenCalled();
  });

  it('should respect MFA timeout configuration (FR-010)', async () => {
    const customTimeout = 45000; // 45 seconds

    const provider = new OIDCAuthProvider({
      idpType: 'keycloak',
      loginUrl: 'https://keycloak.example.com/auth/login',
      success: { url: 'https://app.example.com/dashboard' },
      mfa: {
        enabled: true,
        type: 'push',
        pushTimeoutMs: customTimeout,
      },
    });

    // Verify timeout configuration is stored
    const config = provider.getConfig();
    expect(config.mfa?.pushTimeoutMs).toBe(customTimeout);
    expect(config.mfa?.enabled).toBe(true);
    expect(config.mfa?.type).toBe('push');
  });

  it('should handle TOTP entry failure gracefully', async () => {
    // Setup: Provider with invalid TOTP secret env var
    const mockPage = createMockPage();

    const provider = new OIDCAuthProvider({
      idpType: 'keycloak',
      loginUrl: 'https://keycloak.example.com/auth/login',
      success: { url: 'https://app.example.com/dashboard' },
      mfa: {
        enabled: true,
        type: 'totp',
        totpSecretEnv: 'NONEXISTENT_SECRET_ENV',
      },
    });

    // Execute login - should fail gracefully with clear error
    await expect(
      provider.login(mockPage, {
        username: 'admin@example.com',
        password: 'admin-password',
      })
    ).rejects.toThrow(/TOTP secret environment variable.*not set/i);
  });

  it('should generate valid TOTP codes', () => {
    // Test the TOTP generation function directly
    const code = generateTOTPCode('TEST_TOTP_SECRET');

    // Should be 6 digits
    expect(code).toHaveLength(6);
    expect(code).toMatch(/^\d{6}$/);

    // Should be valid according to otplib
    const isValid = authenticator.verify({
      token: code,
      secret: testTotpSecret,
    });
    expect(isValid).toBe(true);
  });

  it('should handle missing TOTP secret gracefully', () => {
    // Remove the env var
    vi.unstubAllEnvs();

    // Should throw clear error
    expect(() => generateTOTPCode('MISSING_ENV_VAR')).toThrow(
      /TOTP secret environment variable.*not set/i
    );
  });

  it('should handle invalid TOTP secret gracefully', () => {
    // Set invalid secret (empty string should fail)
    vi.stubEnv('INVALID_SECRET', '');

    // Should throw clear error about invalid secret
    expect(() => generateTOTPCode('INVALID_SECRET')).toThrow(
      /Failed to generate TOTP code|TOTP secret environment variable/i
    );
  });

  it('should configure TOTP selectors correctly', async () => {
    const mockPage = createMockPage();

    const provider = new OIDCAuthProvider({
      idpType: 'keycloak',
      loginUrl: 'https://keycloak.example.com/auth/login',
      success: { url: 'https://app.example.com/dashboard' },
      mfa: {
        enabled: true,
        type: 'totp',
        totpSecretEnv: 'TEST_TOTP_SECRET',
        totpInputSelector: '#custom-totp-input',
        totpSubmitSelector: '#custom-submit-btn',
      },
    });

    await provider.login(mockPage, {
      username: 'admin@example.com',
      password: 'admin-password',
    });

    // Verify custom selectors were used
    expect(mockPage.waitForSelector).toHaveBeenCalledWith(
      '#custom-totp-input',
      expect.any(Object)
    );
  });

  it('should support different IdP types with TOTP', async () => {
    const mockPage = createMockPage();

    // Test with Azure AD
    const azureProvider = new OIDCAuthProvider({
      idpType: 'azure-ad',
      loginUrl: 'https://login.microsoftonline.com/tenant/oauth2/authorize',
      success: { url: 'https://app.example.com/dashboard' },
      mfa: {
        enabled: true,
        type: 'totp',
        totpSecretEnv: 'TEST_TOTP_SECRET',
      },
    });

    await azureProvider.login(mockPage, {
      username: 'admin@example.com',
      password: 'admin-password',
    });

    // Verify IdP handler was used
    expect(azureProvider.getIdpHandler().idpType).toBe('azure-ad');

    // Verify TOTP was still processed
    const totpCalls = (mockPage.fill as any).mock.calls.filter(
      (call: any[]) => /^\d{6}$/.test(call[1])
    );
    expect(totpCalls.length).toBeGreaterThan(0);
  });
});
