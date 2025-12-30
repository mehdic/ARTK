/**
 * Unit tests for TokenAuthProvider
 *
 * Tests P3-7: Token-based authentication provider
 *
 * @module auth/__tests__/token-provider.test
 */

import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { getStoredToken, TokenAuthProvider } from '../providers/token.js';
import type { Credentials, TokenAuthProviderConfig } from '../types.js';
import { ARTKAuthError } from '../../errors/auth-error.js';
import type { Page } from '@playwright/test';

// =============================================================================
// Test Fixtures
// =============================================================================

const createMockPage = (): Page => {
  const mockContext = {
    clearCookies: vi.fn().mockResolvedValue(undefined),
  };

  return {
    evaluate: vi.fn(),
    context: vi.fn().mockReturnValue(mockContext),
    url: vi.fn().mockReturnValue('https://api.example.com'),
  } as unknown as Page;
};

const createTestConfig = (overrides: Partial<TokenAuthProviderConfig> = {}): TokenAuthProviderConfig => ({
  tokenEndpoint: 'https://api.example.com/auth/token',
  headerName: 'Authorization',
  headerPrefix: 'Bearer ',
  tokenField: 'access_token',
  ...overrides,
});

const testCredentials: Credentials = {
  username: 'testuser@example.com',
  password: 'testpass123',
};

// =============================================================================
// TokenAuthProvider Tests
// =============================================================================

describe('TokenAuthProvider', () => {
  let mockPage: Page;

  beforeEach(() => {
    mockPage = createMockPage();
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Token Acquisition Tests
  // ---------------------------------------------------------------------------

  it('should POST credentials to token endpoint', async () => {
    const config = createTestConfig();
    const provider = new TokenAuthProvider(config);

    // Mock successful token acquisition
    const evaluateSpy = mockPage.evaluate as Mock;
    const mockImplementation = async (): Promise<{ data: { access_token: string } }> => {
      return { data: { access_token: 'test-token-123' } };
    };
    evaluateSpy.mockImplementation(mockImplementation);

    await provider.login(mockPage, testCredentials);

    // Verify evaluate was called with token acquisition logic
    expect(evaluateSpy).toHaveBeenCalled();
    const firstCall = evaluateSpy.mock.calls[0] as unknown[];
    expect(firstCall[1]).toMatchObject({
      endpoint: config.tokenEndpoint,
      body: {
        username: testCredentials.username,
        password: testCredentials.password,
      },
    });
  });

  it('should extract token from response', async () => {
    const config = createTestConfig({
      tokenField: 'access_token',
    });
    const provider = new TokenAuthProvider(config);

    const mockToken = 'extracted-token-456';
    const evaluateSpy = mockPage.evaluate as Mock;
    evaluateSpy
      .mockResolvedValueOnce({ data: { access_token: mockToken } })
      .mockResolvedValueOnce(undefined); // storeToken call

    await provider.login(mockPage, testCredentials);

    // Token should be cached
    expect(provider.getToken()).toBe(mockToken);
  });

  it('should store token in localStorage', async () => {
    const config = createTestConfig();
    const provider = new TokenAuthProvider(config);

    let storedData: unknown = null;
    const evaluateSpy = mockPage.evaluate as Mock;
    evaluateSpy.mockImplementation(async (_fn: unknown, args?: unknown) => {
      if (typeof args === 'object' && args !== null && 'token' in args) {
        // This is the storeToken call
        storedData = args;
        return undefined;
      }
      // This is the acquireToken call
      return { data: { access_token: 'test-token' } };
    });

    await provider.login(mockPage, testCredentials);

    // Verify token was stored
    expect(storedData).toMatchObject({
      token: 'test-token',
      headerName: 'Authorization',
      headerPrefix: 'Bearer ',
    });
  });

  // ---------------------------------------------------------------------------
  // Error Handling Tests
  // ---------------------------------------------------------------------------

  it('should handle missing token in response', async () => {
    const config = createTestConfig();
    const provider = new TokenAuthProvider(config, { maxRetries: 0 });
    provider.setRole('testUser');

    // Mock response without token
    const evaluateSpy = mockPage.evaluate as Mock;
    evaluateSpy.mockResolvedValue({
      data: { message: 'Success but no token' },
    });

    await expect(provider.login(mockPage, testCredentials)).rejects.toThrow(ARTKAuthError);

    try {
      await provider.login(mockPage, testCredentials);
    } catch (error) {
      expect(error).toBeInstanceOf(ARTKAuthError);
      const authError = error as ARTKAuthError;
      expect(authError.message).toContain('Token not found');
      expect(authError.phase).toBe('callback');
    }
  });

  it('should retry on network failures', async () => {
    const config = createTestConfig();
    const provider = new TokenAuthProvider(config, {
      maxRetries: 2,
      initialDelayMs: 10,
    });

    let attemptCount = 0;
    const evaluateSpy = mockPage.evaluate as Mock;
    evaluateSpy.mockImplementation(async () => {
      attemptCount++;
      if (attemptCount < 2) {
        return { error: 'Network error' };
      }
      // Second attempt succeeds
      return { data: { access_token: 'retry-token' } };
    });

    // Mock storeToken
    evaluateSpy.mockResolvedValueOnce({ error: 'Network error' });
    evaluateSpy.mockResolvedValueOnce({ data: { access_token: 'retry-token' } });
    evaluateSpy.mockResolvedValueOnce(undefined); // storeToken

    await provider.login(mockPage, testCredentials);

    // Should have been called multiple times (acquire + store)
    expect(evaluateSpy).toHaveBeenCalledTimes(3);
  });

  it('should throw ARTKAuthError on auth failure', async () => {
    const config = createTestConfig();
    const provider = new TokenAuthProvider(config, { maxRetries: 0 });
    provider.setRole('adminUser');

    // Mock authentication failure
    const evaluateSpy = mockPage.evaluate as Mock;
    evaluateSpy.mockResolvedValue({
      error: 'HTTP 401: Invalid credentials',
    });

    await expect(provider.login(mockPage, testCredentials)).rejects.toThrow(ARTKAuthError);

    try {
      await provider.login(mockPage, testCredentials);
    } catch (error) {
      expect(error).toBeInstanceOf(ARTKAuthError);
      const authError = error as ARTKAuthError;
      expect(authError.role).toBe('adminUser');
      expect(authError.phase).toBe('credentials');
      expect(authError.message).toContain('Token request failed');
    }
  });

  // ---------------------------------------------------------------------------
  // Logout Tests
  // ---------------------------------------------------------------------------

  it('should clear token on logout', async () => {
    const config = createTestConfig();
    const provider = new TokenAuthProvider(config);

    // Mock token acquisition and storage
    const evaluateSpy = mockPage.evaluate as Mock;
    evaluateSpy
      .mockResolvedValueOnce({ data: { access_token: 'test-token' } })
      .mockResolvedValueOnce(undefined); // storeToken

    await provider.login(mockPage, testCredentials);

    expect(provider.getToken()).toBe('test-token');

    // Mock logout evaluation
    evaluateSpy.mockResolvedValueOnce(undefined);

    await provider.logout(mockPage);

    // Verify token was cleared
    expect(provider.getToken()).toBeUndefined();

    // Verify localStorage.removeItem was called
    expect(evaluateSpy).toHaveBeenCalledWith(
      expect.any(Function),
      'artk_auth_token'
    );
  });

  // ---------------------------------------------------------------------------
  // Session Validity Tests
  // ---------------------------------------------------------------------------

  it('should check token presence for validity', async () => {
    const config = createTestConfig();
    const provider = new TokenAuthProvider(config);

    // Mock stored token exists
    const evaluateSpy = mockPage.evaluate as Mock;
    evaluateSpy.mockResolvedValue({
      token: 'stored-token',
      headerName: 'Authorization',
      headerPrefix: 'Bearer ',
      timestamp: Date.now(),
    });

    const isValid = await provider.isSessionValid(mockPage);

    expect(isValid).toBe(true);
  });

  it('should return false when token is missing', async () => {
    const config = createTestConfig();
    const provider = new TokenAuthProvider(config);

    // Mock no stored token
    const evaluateSpy = mockPage.evaluate as Mock;
    evaluateSpy.mockResolvedValue(null);

    const isValid = await provider.isSessionValid(mockPage);

    expect(isValid).toBe(false);
  });

  it('should handle errors during session validation', async () => {
    const config = createTestConfig();
    const provider = new TokenAuthProvider(config);

    // Mock evaluation error
    const evaluateSpy = mockPage.evaluate as Mock;
    evaluateSpy.mockRejectedValue(new Error('Evaluation failed'));

    const isValid = await provider.isSessionValid(mockPage);

    expect(isValid).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Auth Header Tests
  // ---------------------------------------------------------------------------

  it('should build correct auth header', async () => {
    const config = createTestConfig({
      headerName: 'X-API-Token',
      headerPrefix: 'Token ',
    });
    const provider = new TokenAuthProvider(config);

    // Mock token acquisition
    const evaluateSpy = mockPage.evaluate as Mock;
    evaluateSpy
      .mockResolvedValueOnce({ data: { access_token: 'api-token-789' } })
      .mockResolvedValueOnce(undefined); // storeToken

    await provider.login(mockPage, testCredentials);

    const authHeader = provider.getAuthHeader();

    expect(authHeader).toBe('Token api-token-789');
  });

  it('should return undefined auth header when no token', () => {
    const config = createTestConfig();
    const provider = new TokenAuthProvider(config);

    const authHeader = provider.getAuthHeader();

    expect(authHeader).toBeUndefined();
  });

  it('should return correct header name', () => {
    const config = createTestConfig({
      headerName: 'X-Custom-Auth',
    });
    const provider = new TokenAuthProvider(config);

    const headerName = provider.getHeaderName();

    expect(headerName).toBe('X-Custom-Auth');
  });

  it('should use default header name when not specified', () => {
    const config = createTestConfig({
      tokenEndpoint: 'https://api.example.com/token',
    });
    const provider = new TokenAuthProvider(config);

    const headerName = provider.getHeaderName();

    expect(headerName).toBe('Authorization');
  });

  // ---------------------------------------------------------------------------
  // Configuration Tests
  // ---------------------------------------------------------------------------

  it('should expose configuration via getConfig', () => {
    const config = createTestConfig();
    const provider = new TokenAuthProvider(config);

    const exposedConfig = provider.getConfig();

    expect(exposedConfig).toEqual(config);
  });

  it('should use custom request body fields', async () => {
    const config = createTestConfig({
      requestBody: {
        usernameField: 'email',
        passwordField: 'secret',
        additionalFields: {
          grant_type: 'password',
          client_id: 'test-client',
        },
      },
    });
    const provider = new TokenAuthProvider(config);

    const evaluateSpy = mockPage.evaluate as Mock;
    evaluateSpy
      .mockResolvedValueOnce({ data: { access_token: 'test-token' } })
      .mockResolvedValueOnce(undefined);

    await provider.login(mockPage, testCredentials);

    const firstCall = evaluateSpy.mock.calls[0] as unknown[];
    expect(firstCall[1]).toMatchObject({
      body: {
        email: testCredentials.username,
        secret: testCredentials.password,
        grant_type: 'password',
        client_id: 'test-client',
      },
    });
  });

  it('should use custom token field name', async () => {
    const config = createTestConfig({
      tokenField: 'jwt',
    });
    const provider = new TokenAuthProvider(config, { maxRetries: 0 });

    // Mock response with token in custom field
    const evaluateSpy = mockPage.evaluate as Mock;
    evaluateSpy.mockResolvedValue({
      data: { jwt: 'custom-field-token' },
    });

    // Mock storeToken
    evaluateSpy
      .mockResolvedValueOnce({ data: { jwt: 'custom-field-token' } })
      .mockResolvedValueOnce(undefined);

    await provider.login(mockPage, testCredentials);

    expect(provider.getToken()).toBe('custom-field-token');
  });

  it('should use custom timeout for token request', async () => {
    const config = createTestConfig({
      timeoutMs: 5000,
    });
    const provider = new TokenAuthProvider(config);

    const evaluateSpy = mockPage.evaluate as Mock;
    evaluateSpy
      .mockResolvedValueOnce({ data: { access_token: 'test-token' } })
      .mockResolvedValueOnce(undefined);

    await provider.login(mockPage, testCredentials);

    const firstCall = evaluateSpy.mock.calls[0] as unknown[];
    const evaluateParams = firstCall[1] as { endpoint: string; body: unknown; timeout: number };
    expect(evaluateParams.timeout).toBe(5000);
  });

  // ---------------------------------------------------------------------------
  // Utility Function Tests
  // ---------------------------------------------------------------------------

  it('should retrieve stored token via utility function', async () => {
    const mockStoredData = {
      token: 'stored-token-123',
      headerName: 'Authorization',
      headerPrefix: 'Bearer ',
      timestamp: Date.now(),
    };

    const evaluateSpy = mockPage.evaluate as Mock;
    evaluateSpy.mockResolvedValue(mockStoredData);

    const stored = await getStoredToken(mockPage);

    expect(stored).toEqual(mockStoredData);
  });

  it('should return undefined when no stored token via utility', async () => {
    const evaluateSpy = mockPage.evaluate as Mock;
    evaluateSpy.mockResolvedValue(null);

    const stored = await getStoredToken(mockPage);

    expect(stored).toBeUndefined();
  });

  it('should handle errors in getStoredToken utility', async () => {
    const evaluateSpy = mockPage.evaluate as Mock;
    evaluateSpy.mockRejectedValue(new Error('Storage error'));

    const stored = await getStoredToken(mockPage);

    expect(stored).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Role Setting Tests
  // ---------------------------------------------------------------------------

  it('should set role for error reporting', async () => {
    const config = createTestConfig();
    const provider = new TokenAuthProvider(config, { maxRetries: 0 });
    provider.setRole('apiUser');

    const evaluateSpy = mockPage.evaluate as Mock;
    evaluateSpy.mockResolvedValue({
      error: 'Token acquisition failed',
    });

    try {
      await provider.login(mockPage, testCredentials);
    } catch (error) {
      expect(error).toBeInstanceOf(ARTKAuthError);
      expect((error as ARTKAuthError).role).toBe('apiUser');
    }
  });
});
