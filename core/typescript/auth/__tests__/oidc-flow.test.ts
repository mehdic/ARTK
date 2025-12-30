/**
 * Unit tests for OIDC flow
 *
 * Tests FR-006: OIDC with configurable Identity Provider handlers
 * Tests FR-010: TOTP-based MFA handling
 *
 * @module auth/__tests__/oidc-flow.test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Page } from '@playwright/test';
import {
  generateTOTPCode,
  getTimeUntilNextTOTPWindow,
  verifyTOTPCode,
  waitForFreshTOTPWindow,
} from '../oidc/flow.js';
import { ARTKAuthError } from '../../errors/auth-error.js';

// Mock otplib
vi.mock('otplib', () => ({
  authenticator: {
    generate: vi.fn(),
    verify: vi.fn(),
    options: { step: 30 },
  },
}));

import { authenticator } from 'otplib';

// Get mock function references to avoid unbound-method ESLint errors
// These are vitest mocks, not actual class methods, so the rule doesn't apply
/* eslint-disable @typescript-eslint/unbound-method */
const getMockedGenerate = (): ReturnType<typeof vi.mocked<typeof authenticator.generate>> =>
  vi.mocked(authenticator.generate);
const getMockedVerify = (): ReturnType<typeof vi.mocked<typeof authenticator.verify>> =>
  vi.mocked(authenticator.verify);
/* eslint-enable @typescript-eslint/unbound-method */

// =============================================================================
// generateTOTPCode Tests
// =============================================================================

describe('generateTOTPCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates TOTP code from environment variable', () => {
    const mockCode = '123456';
    getMockedGenerate().mockReturnValue(mockCode);

    const env = {
      MFA_SECRET: 'JBSWY3DPEHPK3PXP',
    };

    const code = generateTOTPCode('MFA_SECRET', env);

    expect(code).toBe(mockCode);
    expect(getMockedGenerate()).toHaveBeenCalledWith('JBSWY3DPEHPK3PXP');
  });

  it('throws ARTKAuthError when env var is not set', () => {
    const env = {};

    expect(() => generateTOTPCode('MISSING_SECRET', env))
      .toThrow(ARTKAuthError);

    try {
      generateTOTPCode('MISSING_SECRET', env);
    } catch (error) {
      expect(error).toBeInstanceOf(ARTKAuthError);
      expect((error as ARTKAuthError).phase).toBe('mfa');
      expect((error as ARTKAuthError).message).toContain('MISSING_SECRET');
      expect((error as ARTKAuthError).remediation).toContain('Set the MISSING_SECRET');
    }
  });

  it('cleans whitespace from secret', () => {
    const mockCode = '654321';
    getMockedGenerate().mockReturnValue(mockCode);

    const env = {
      MFA_SECRET: 'JBSW Y3DP EHPK 3PXP',
    };

    const code = generateTOTPCode('MFA_SECRET', env);

    expect(code).toBe(mockCode);
    expect(getMockedGenerate()).toHaveBeenCalledWith('JBSWY3DPEHPK3PXP');
  });

  it('converts secret to uppercase', () => {
    const mockCode = '789012';
    getMockedGenerate().mockReturnValue(mockCode);

    const env = {
      MFA_SECRET: 'jbswy3dpehpk3pxp',
    };

    const code = generateTOTPCode('MFA_SECRET', env);

    expect(code).toBe(mockCode);
    expect(getMockedGenerate()).toHaveBeenCalledWith('JBSWY3DPEHPK3PXP');
  });

  it('throws ARTKAuthError when authenticator throws', () => {
    getMockedGenerate().mockImplementation(() => {
      throw new Error('Invalid secret');
    });

    const env = {
      MFA_SECRET: 'invalid',
    };

    expect(() => generateTOTPCode('MFA_SECRET', env))
      .toThrow(ARTKAuthError);

    try {
      generateTOTPCode('MFA_SECRET', env);
    } catch (error) {
      expect(error).toBeInstanceOf(ARTKAuthError);
      expect((error as ARTKAuthError).phase).toBe('mfa');
      expect((error as ARTKAuthError).message).toContain('Invalid secret');
    }
  });

  it('uses process.env by default', () => {
    const originalEnv = process.env.TEST_MFA_SECRET;
    process.env.TEST_MFA_SECRET = 'TESTSECRET';

    const mockCode = '111222';
    getMockedGenerate().mockReturnValue(mockCode);

    try {
      const code = generateTOTPCode('TEST_MFA_SECRET');
      expect(code).toBe(mockCode);
    } finally {
      if (originalEnv === undefined) {
        delete process.env.TEST_MFA_SECRET;
      } else {
        process.env.TEST_MFA_SECRET = originalEnv;
      }
    }
  });
});

// =============================================================================
// verifyTOTPCode Tests
// =============================================================================

describe('verifyTOTPCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true for valid code', () => {
    getMockedVerify().mockReturnValue(true);

    const env = {
      MFA_SECRET: 'JBSWY3DPEHPK3PXP',
    };

    const result = verifyTOTPCode('123456', 'MFA_SECRET', env);

    expect(result).toBe(true);
    expect(getMockedVerify()).toHaveBeenCalledWith({
      token: '123456',
      secret: 'JBSWY3DPEHPK3PXP',
    });
  });

  it('returns false for invalid code', () => {
    getMockedVerify().mockReturnValue(false);

    const env = {
      MFA_SECRET: 'JBSWY3DPEHPK3PXP',
    };

    const result = verifyTOTPCode('000000', 'MFA_SECRET', env);

    expect(result).toBe(false);
  });

  it('returns false when env var is not set', () => {
    const env = {};

    const result = verifyTOTPCode('123456', 'MISSING_SECRET', env);

    expect(result).toBe(false);
  });

  it('returns false when verification throws', () => {
    getMockedVerify().mockImplementation(() => {
      throw new Error('Verification error');
    });

    const env = {
      MFA_SECRET: 'invalid',
    };

    const result = verifyTOTPCode('123456', 'MFA_SECRET', env);

    expect(result).toBe(false);
  });
});

// =============================================================================
// getTimeUntilNextTOTPWindow Tests
// =============================================================================

describe('getTimeUntilNextTOTPWindow', () => {
  it('returns seconds until next window', () => {
    const result = getTimeUntilNextTOTPWindow();

    // Should be between 0 and 30 (the TOTP step)
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(30);
  });

  it('returns consistent values within same second', () => {
    const result1 = getTimeUntilNextTOTPWindow();
    const result2 = getTimeUntilNextTOTPWindow();

    // Should be the same or off by at most 1 (if second boundary crossed)
    expect(Math.abs(result1 - result2)).toBeLessThanOrEqual(1);
  });
});

// =============================================================================
// waitForFreshTOTPWindow Tests
// =============================================================================

describe('waitForFreshTOTPWindow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not wait when plenty of time remaining', async () => {
    // Set time to middle of a TOTP window (15 seconds in)
    vi.setSystemTime(new Date('2024-01-01T00:00:15Z'));

    const promise = waitForFreshTOTPWindow(5);
    vi.advanceTimersByTime(0);
    const waited = await promise;

    expect(waited).toBe(false);
  });

  it('waits when time is about to expire', async () => {
    // Set time to 3 seconds before window end (27 seconds in)
    vi.setSystemTime(new Date('2024-01-01T00:00:27Z'));

    const promise = waitForFreshTOTPWindow(5);

    // Should wait for ~4 seconds (3 remaining + 1)
    vi.advanceTimersByTime(4000);

    const waited = await promise;

    expect(waited).toBe(true);
  });

  it('uses default threshold of 5 seconds', async () => {
    // Set time to 4 seconds before window end (26 seconds in)
    vi.setSystemTime(new Date('2024-01-01T00:00:26Z'));

    const promise = waitForFreshTOTPWindow();

    // Should wait for ~5 seconds (4 remaining + 1)
    vi.advanceTimersByTime(5000);

    const waited = await promise;

    expect(waited).toBe(true);
  });
});

// =============================================================================
// OIDC IdP Handler Tests
// =============================================================================

describe('IdP handlers', () => {
  describe('keycloakHandler', () => {
    it('is exported and has correct idpType', async () => {
      const { keycloakHandler } = await import('../oidc/providers/keycloak.js');

      expect(keycloakHandler).toBeDefined();
      expect(keycloakHandler.idpType).toBe('keycloak');
    });

    it('provides default selectors', async () => {
      const { keycloakHandler } = await import('../oidc/providers/keycloak.js');

      const selectors = keycloakHandler.getDefaultSelectors();

      expect(selectors.username).toContain('#username');
      expect(selectors.password).toContain('#password');
      expect(selectors.submit).toContain('#kc-login');
    });
  });

  describe('azureAdHandler', () => {
    it('is exported and has correct idpType', async () => {
      const { azureAdHandler } = await import('../oidc/providers/azure-ad.js');

      expect(azureAdHandler).toBeDefined();
      expect(azureAdHandler.idpType).toBe('azure-ad');
    });

    it('provides default selectors with stay signed in', async () => {
      const { azureAdHandler } = await import('../oidc/providers/azure-ad.js');

      const selectors = azureAdHandler.getDefaultSelectors();

      expect(selectors.staySignedInNo).toContain('#idBtn_Back');
    });
  });

  describe('oktaHandler', () => {
    it('is exported and has correct idpType', async () => {
      const { oktaHandler } = await import('../oidc/providers/okta.js');

      expect(oktaHandler).toBeDefined();
      expect(oktaHandler.idpType).toBe('okta');
    });

    it('provides default selectors', async () => {
      const { oktaHandler } = await import('../oidc/providers/okta.js');

      const selectors = oktaHandler.getDefaultSelectors();

      expect(selectors.username).toContain('#okta-signin-username');
      expect(selectors.submit).toContain('#okta-signin-submit');
    });
  });

  describe('genericHandler', () => {
    it('is exported and has correct idpType', async () => {
      const { genericHandler } = await import('../oidc/providers/generic.js');

      expect(genericHandler).toBeDefined();
      expect(genericHandler.idpType).toBe('generic');
    });

    it('provides default selectors with common patterns', async () => {
      const { genericHandler } = await import('../oidc/providers/generic.js');

      const selectors = genericHandler.getDefaultSelectors();

      expect(selectors.username).toContain('input[type="email"]');
      expect(selectors.password).toContain('input[type="password"]');
      expect(selectors.submit).toContain('button[type="submit"]');
    });
  });

  describe('createGenericHandler', () => {
    it('creates handler with custom selectors', async () => {
      const { createGenericHandler } = await import('../oidc/providers/generic.js');

      const customHandler = createGenericHandler({
        username: '#my-username',
        password: '#my-password',
        submit: '#my-submit',
      });

      expect(customHandler.idpType).toBe('generic');

      const selectors = customHandler.getDefaultSelectors();
      expect(selectors.username).toBe('#my-username');
      expect(selectors.password).toBe('#my-password');
      expect(selectors.submit).toBe('#my-submit');
    });
  });
});

// =============================================================================
// OIDCAuthProvider Tests
// =============================================================================

describe('OIDCAuthProvider', () => {
  it('is exported and can be instantiated', async () => {
    const { OIDCAuthProvider } = await import('../providers/oidc.js');

    const provider = new OIDCAuthProvider({
      idpType: 'keycloak',
      loginUrl: 'https://app.example.com/login',
      success: { url: '/dashboard' },
    });

    expect(provider).toBeDefined();
    expect(provider.getConfig().idpType).toBe('keycloak');
  });

  it('sets role correctly', async () => {
    const { OIDCAuthProvider } = await import('../providers/oidc.js');

    const provider = new OIDCAuthProvider({
      idpType: 'keycloak',
      loginUrl: 'https://app.example.com/login',
      success: { url: '/dashboard' },
    });

    provider.setRole('admin');

    // Can't directly test private field, but setRole shouldn't throw
    expect(() => provider.setRole('user')).not.toThrow();
  });

  it('gets correct IdP handler', async () => {
    const { OIDCAuthProvider } = await import('../providers/oidc.js');

    const keycloakProvider = new OIDCAuthProvider({
      idpType: 'keycloak',
      loginUrl: 'https://app.example.com/login',
      success: { url: '/dashboard' },
    });

    const azureProvider = new OIDCAuthProvider({
      idpType: 'azure-ad',
      loginUrl: 'https://app.example.com/login',
      success: { url: '/dashboard' },
    });

    expect(keycloakProvider.getIdpHandler().idpType).toBe('keycloak');
    expect(azureProvider.getIdpHandler().idpType).toBe('azure-ad');
  });
});

// =============================================================================
// getIdpHandler Tests
// =============================================================================

describe('getIdpHandler', () => {
  it('returns correct handler for each IdP type', async () => {
    const { getIdpHandler } = await import('../providers/oidc.js');

    expect(getIdpHandler('keycloak').idpType).toBe('keycloak');
    expect(getIdpHandler('azure-ad').idpType).toBe('azure-ad');
    expect(getIdpHandler('okta').idpType).toBe('okta');
    expect(getIdpHandler('generic').idpType).toBe('generic');
  });

  it('returns generic handler for unknown type', async () => {
    const { getIdpHandler } = await import('../providers/oidc.js');

    expect(getIdpHandler('unknown').idpType).toBe('generic');
  });
});

// =============================================================================
// IdP Detection Tests
// =============================================================================

describe('IdP detection utilities', () => {
  it('detects Keycloak URLs', async () => {
    const { isKeycloakLoginPage } = await import('../oidc/providers/keycloak.js');

    // Mock page object
    const mockPage = {
      url: () => 'https://auth.example.com/auth/realms/myrealm/login',
    } as unknown as Page;

    expect(isKeycloakLoginPage(mockPage)).toBe(true);
  });

  it('detects Azure AD URLs', async () => {
    const { isAzureAdLoginPage } = await import('../oidc/providers/azure-ad.js');

    const mockPage = {
      url: () => 'https://login.microsoftonline.com/tenant/oauth2/v2.0/authorize',
    } as unknown as Page;

    expect(isAzureAdLoginPage(mockPage)).toBe(true);
  });

  it('detects Okta URLs', async () => {
    const { isOktaLoginPage } = await import('../oidc/providers/okta.js');

    const mockPage = {
      url: () => 'https://mycompany.okta.com/app/myapp/login',
    } as unknown as Page;

    expect(isOktaLoginPage(mockPage)).toBe(true);
  });

  it('detects IdP type from URL', async () => {
    const { detectIdpType } = await import('../oidc/providers/generic.js');

    const keycloakPage = {
      url: () => 'https://keycloak.example.com/auth/realms/test',
    } as unknown as Page;

    const azurePage = {
      url: () => 'https://login.microsoftonline.com/tenant',
    } as unknown as Page;

    const oktaPage = {
      url: () => 'https://mycompany.okta.com',
    } as unknown as Page;

    const genericPage = {
      url: () => 'https://example.com/login',
    } as unknown as Page;

    expect(detectIdpType(keycloakPage)).toBe('keycloak');
    expect(detectIdpType(azurePage)).toBe('azure-ad');
    expect(detectIdpType(oktaPage)).toBe('okta');
    expect(detectIdpType(genericPage)).toBe('generic');
  });
});
