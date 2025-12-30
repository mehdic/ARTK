/**
 * Unit tests for FormAuthProvider
 *
 * Tests P3-6: Form-based authentication provider
 *
 * @module auth/__tests__/form-provider.test
 */

import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { FormAuthProvider } from '../providers/form.js';
import type { Credentials, FormAuthProviderConfig } from '../types.js';
import { ARTKAuthError } from '../../errors/auth-error.js';
import type { Locator, Page, Response } from '@playwright/test';

// =============================================================================
// Test Fixtures
// =============================================================================

const createMockPage = (): Page => {
  const mockLocator: Partial<Locator> = {
    waitFor: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
    fill: vi.fn().mockResolvedValue(undefined),
    click: vi.fn().mockResolvedValue(undefined),
    first: vi.fn().mockReturnThis(),
    isVisible: vi.fn().mockResolvedValue(false),
    textContent: vi.fn().mockResolvedValue(null),
  };

  const mockContext = {
    clearCookies: vi.fn().mockResolvedValue(undefined),
  };

  return {
    goto: vi.fn().mockResolvedValue({ ok: () => true } as Response),
    url: vi.fn().mockReturnValue('https://app.example.com/dashboard'),
    locator: vi.fn().mockReturnValue(mockLocator),
    waitForSelector: vi.fn().mockResolvedValue(undefined),
    waitForURL: vi.fn().mockResolvedValue(undefined),
    waitForLoadState: vi.fn().mockResolvedValue(undefined),
    context: vi.fn().mockReturnValue(mockContext),
  } as unknown as Page;
};

const createTestConfig = (overrides: Partial<FormAuthProviderConfig> = {}): FormAuthProviderConfig => ({
  loginUrl: 'https://app.example.com/login',
  selectors: {
    username: '#username',
    password: '#password',
    submit: 'button[type="submit"]',
  },
  success: {
    url: '/dashboard',
  },
  ...overrides,
});

const testCredentials: Credentials = {
  username: 'testuser@example.com',
  password: 'testpass123',
};

// =============================================================================
// FormAuthProvider Tests
// =============================================================================

describe('FormAuthProvider', () => {
  let mockPage: Page;

  beforeEach(() => {
    mockPage = createMockPage();
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Happy Path Tests
  // ---------------------------------------------------------------------------

  it('should navigate to login page', async () => {
    const config = createTestConfig();
    const provider = new FormAuthProvider(config);
    const gotoSpy = mockPage.goto as Mock;

    await provider.login(mockPage, testCredentials);

    expect(gotoSpy).toHaveBeenCalledWith(
      config.loginUrl,
      expect.objectContaining({
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      })
    );
  });

  it('should fill username and password', async () => {
    const config = createTestConfig();
    const provider = new FormAuthProvider(config);
    const mockLocator = mockPage.locator('#username') as Partial<Locator>;
    const locatorSpy = mockPage.locator as Mock;

    await provider.login(mockPage, testCredentials);

    // Verify locators were created for username and password
    expect(locatorSpy).toHaveBeenCalledWith('#username');
    expect(locatorSpy).toHaveBeenCalledWith('#password');

    // Verify fill was called
    expect(mockLocator.fill).toHaveBeenCalled();
  });

  it('should submit form', async () => {
    const config = createTestConfig();
    const provider = new FormAuthProvider(config);
    const mockLocator = mockPage.locator('button[type="submit"]') as Partial<Locator>;
    const locatorSpy = mockPage.locator as Mock;

    await provider.login(mockPage, testCredentials);

    // Verify submit button was clicked
    expect(locatorSpy).toHaveBeenCalledWith('button[type="submit"]');
    expect(mockLocator.click).toHaveBeenCalled();
  });

  it('should wait for success URL', async () => {
    const config = createTestConfig();
    const provider = new FormAuthProvider(config);
    const waitForURLSpy = mockPage.waitForURL as Mock;

    await provider.login(mockPage, testCredentials);

    // Verify waitForURL was called with success URL
    expect(waitForURLSpy).toHaveBeenCalledWith(
      '/dashboard',
      expect.objectContaining({
        timeout: expect.any(Number),
      })
    );
  });

  it('should detect login errors', async () => {
    const config = createTestConfig();
    const provider = new FormAuthProvider(config, { maxRetries: 0 });

    // Mock error detection
    const mockErrorLocator = {
      first: vi.fn().mockReturnThis(),
      isVisible: vi.fn().mockResolvedValue(true),
      textContent: vi.fn().mockResolvedValue('Invalid credentials'),
    } as unknown as Locator;

    const locatorSpy = mockPage.locator as Mock;
    const waitForURLSpy = mockPage.waitForURL as Mock;
    locatorSpy.mockReturnValue(mockErrorLocator);
    waitForURLSpy.mockRejectedValue(new Error('Timeout'));

    await expect(provider.login(mockPage, testCredentials)).rejects.toThrow(ARTKAuthError);
  });

  // ---------------------------------------------------------------------------
  // Retry Logic Tests
  // ---------------------------------------------------------------------------

  it('should retry on transient failures', async () => {
    const config = createTestConfig();
    const provider = new FormAuthProvider(config, {
      maxRetries: 2,
      initialDelayMs: 10,
    });

    let attemptCount = 0;
    const gotoSpy = mockPage.goto as Mock;
    gotoSpy.mockImplementation(() => {
      attemptCount++;
      if (attemptCount < 2) {
        throw new Error('Network timeout');
      }
      return Promise.resolve({ ok: () => true } as Response);
    });

    await provider.login(mockPage, testCredentials);

    // Should have retried once
    expect(gotoSpy).toHaveBeenCalledTimes(2);
  });

  it('should throw ARTKAuthError on permanent failure', async () => {
    const config = createTestConfig();
    const provider = new FormAuthProvider(config, { maxRetries: 1 });
    provider.setRole('testUser');

    const gotoSpy = mockPage.goto as Mock;
    gotoSpy.mockRejectedValue(new Error('Page not found'));

    await expect(provider.login(mockPage, testCredentials)).rejects.toThrow(ARTKAuthError);

    try {
      await provider.login(mockPage, testCredentials);
    } catch (error) {
      expect(error).toBeInstanceOf(ARTKAuthError);
      const authError = error as ARTKAuthError;
      expect(authError.role).toBe('testUser');
      expect(authError.phase).toBe('navigation');
    }
  });

  // ---------------------------------------------------------------------------
  // Logout Tests
  // ---------------------------------------------------------------------------

  it('should handle logout', async () => {
    const config = createTestConfig();
    const provider = new FormAuthProvider(config);

    const mockGotoResponse = { ok: () => true } as Response;
    const gotoSpy = mockPage.goto as Mock;
    gotoSpy.mockResolvedValue(mockGotoResponse);

    await provider.logout(mockPage);

    // Should attempt logout URLs
    expect(gotoSpy).toHaveBeenCalled();
  });

  it('should clear cookies as logout fallback', async () => {
    const config = createTestConfig();
    const provider = new FormAuthProvider(config);

    // Mock all logout URLs failing
    const gotoSpy = mockPage.goto as Mock;
    gotoSpy.mockResolvedValue({ ok: () => false } as Response);

    await provider.logout(mockPage);

    // Should clear cookies as fallback
    const mockContext = mockPage.context();
    const clearCookiesSpy = mockContext.clearCookies as Mock;
    expect(clearCookiesSpy).toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Session Validity Tests
  // ---------------------------------------------------------------------------

  it('should check session validity', async () => {
    const config = createTestConfig();
    const provider = new FormAuthProvider(config);

    // Mock successful session
    const urlSpy = mockPage.url as Mock;
    urlSpy.mockReturnValue('https://app.example.com/dashboard');

    const isValid = await provider.isSessionValid(mockPage);

    expect(isValid).toBe(true);
  });

  it('should detect invalid session when on login page', async () => {
    const config = createTestConfig();
    const provider = new FormAuthProvider(config);

    // Mock being on login page
    const urlSpy = mockPage.url as Mock;
    urlSpy.mockReturnValue('https://app.example.com/login');

    const isValid = await provider.isSessionValid(mockPage);

    expect(isValid).toBe(false);
  });

  it('should detect invalid session when success URL does not match', async () => {
    const config = createTestConfig();
    const provider = new FormAuthProvider(config);

    // Mock being on wrong URL
    const urlSpy = mockPage.url as Mock;
    urlSpy.mockReturnValue('https://app.example.com/error');

    const isValid = await provider.isSessionValid(mockPage);

    expect(isValid).toBe(false);
  });

  it('should check success selector for session validity', async () => {
    const config = createTestConfig({
      success: {
        url: '/dashboard',
        selector: '#user-menu',
      },
    });
    const provider = new FormAuthProvider(config);

    const urlSpy = mockPage.url as Mock;
    const waitForSelectorSpy = mockPage.waitForSelector as Mock;
    urlSpy.mockReturnValue('https://app.example.com/dashboard');
    waitForSelectorSpy.mockResolvedValue(undefined);

    const isValid = await provider.isSessionValid(mockPage);

    expect(isValid).toBe(true);
    expect(waitForSelectorSpy).toHaveBeenCalledWith(
      '#user-menu',
      expect.objectContaining({ state: 'visible', timeout: 1000 })
    );
  });

  // ---------------------------------------------------------------------------
  // Configuration Tests
  // ---------------------------------------------------------------------------

  it('should expose configuration via getConfig', () => {
    const config = createTestConfig();
    const provider = new FormAuthProvider(config);

    const exposedConfig = provider.getConfig();

    expect(exposedConfig).toEqual(config);
  });

  it('should set role for error reporting', async () => {
    const config = createTestConfig();
    const provider = new FormAuthProvider(config, { maxRetries: 0 });
    provider.setRole('adminUser');

    (mockPage.goto as Mock).mockRejectedValue(new Error('Navigation failed'));

    try {
      await provider.login(mockPage, testCredentials);
    } catch (error) {
      expect(error).toBeInstanceOf(ARTKAuthError);
      expect((error as ARTKAuthError).role).toBe('adminUser');
    }
  });

  // ---------------------------------------------------------------------------
  // Custom Timeout Tests
  // ---------------------------------------------------------------------------

  it('should use custom navigation timeout', async () => {
    const config = createTestConfig({
      timeouts: {
        navigationMs: 15000,
      },
    });
    const provider = new FormAuthProvider(config);
    const gotoSpy = mockPage.goto as Mock;

    await provider.login(mockPage, testCredentials);

    expect(gotoSpy).toHaveBeenCalledWith(
      config.loginUrl,
      expect.objectContaining({
        timeout: 15000,
      })
    );
  });

  it('should use custom success timeout', async () => {
    const config = createTestConfig({
      success: {
        url: '/dashboard',
        timeout: 3000,
      },
    });
    const provider = new FormAuthProvider(config);
    const waitForURLSpy = mockPage.waitForURL as Mock;

    await provider.login(mockPage, testCredentials);

    expect(waitForURLSpy).toHaveBeenCalledWith(
      '/dashboard',
      expect.objectContaining({
        timeout: 3000,
      })
    );
  });
});
