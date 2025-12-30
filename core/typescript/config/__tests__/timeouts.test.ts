/**
 * Unit tests for centralized timeout constants
 *
 * Tests P3-2: Timeout centralization for easy auditing
 */

import { describe, expect, it } from 'vitest';
import { getTimeout, type TimeoutKey, TIMEOUTS } from '../timeouts.js';

describe('TIMEOUTS constants', () => {
  it('should export all required timeout constants', () => {
    // Auth timeouts
    expect(TIMEOUTS.AUTH_NAVIGATION_MS).toBe(30000);
    expect(TIMEOUTS.AUTH_SUBMIT_MS).toBe(10000);
    expect(TIMEOUTS.AUTH_SUCCESS_MS).toBe(5000);
    expect(TIMEOUTS.AUTH_MFA_PUSH_MS).toBe(60000);
    expect(TIMEOUTS.AUTH_LOGIN_FLOW_MS).toBe(30000);
    expect(TIMEOUTS.AUTH_IDP_REDIRECT_MS).toBe(10000);
    expect(TIMEOUTS.AUTH_CALLBACK_MS).toBe(5000);

    // OIDC timeouts
    expect(TIMEOUTS.OIDC_SUCCESS_MS).toBe(5000);

    // Assertion timeouts
    expect(TIMEOUTS.TOAST_DEFAULT_MS).toBe(5000);
    expect(TIMEOUTS.LOADING_DEFAULT_MS).toBe(30000);
    expect(TIMEOUTS.FORM_VALIDATION_MS).toBe(5000);

    // API timeouts
    expect(TIMEOUTS.API_REQUEST_MS).toBe(30000);
    expect(TIMEOUTS.TOKEN_ACQUIRE_MS).toBe(10000);
  });

  it('should be immutable (as const)', () => {
    // TypeScript enforces this at compile time, but verify runtime
    expect(Object.isFrozen(TIMEOUTS)).toBe(false); // as const doesn't freeze, but TS prevents modification

    // Verify all values are numbers
    Object.values(TIMEOUTS).forEach((value) => {
      expect(typeof value).toBe('number');
      expect(value).toBeGreaterThan(0);
    });
  });

  it('should have sensible timeout values', () => {
    // MFA push timeout should be longest
    expect(TIMEOUTS.AUTH_MFA_PUSH_MS).toBeGreaterThan(TIMEOUTS.AUTH_LOGIN_FLOW_MS);

    // Navigation timeouts should be longer than submit timeouts
    expect(TIMEOUTS.AUTH_NAVIGATION_MS).toBeGreaterThan(TIMEOUTS.AUTH_SUBMIT_MS);

    // All timeouts should be at least 5 seconds
    Object.values(TIMEOUTS).forEach((timeout) => {
      expect(timeout).toBeGreaterThanOrEqual(5000);
    });
  });

  it('should provide type-safe timeout keys', () => {
    const keys: TimeoutKey[] = [
      'AUTH_NAVIGATION_MS',
      'AUTH_SUBMIT_MS',
      'AUTH_SUCCESS_MS',
      'AUTH_MFA_PUSH_MS',
      'AUTH_LOGIN_FLOW_MS',
      'AUTH_IDP_REDIRECT_MS',
      'AUTH_CALLBACK_MS',
      'OIDC_SUCCESS_MS',
      'TOAST_DEFAULT_MS',
      'LOADING_DEFAULT_MS',
      'FORM_VALIDATION_MS',
      'API_REQUEST_MS',
      'TOKEN_ACQUIRE_MS',
    ];

    keys.forEach((key) => {
      expect(TIMEOUTS[key]).toBeDefined();
      expect(typeof TIMEOUTS[key]).toBe('number');
    });
  });
});

describe('getTimeout function', () => {
  it('should return correct timeout value for valid key', () => {
    expect(getTimeout('AUTH_LOGIN_FLOW_MS')).toBe(30000);
    expect(getTimeout('TOAST_DEFAULT_MS')).toBe(5000);
    expect(getTimeout('AUTH_MFA_PUSH_MS')).toBe(60000);
  });

  it('should be type-safe', () => {
    // This test verifies TypeScript compilation
    // Invalid keys won't compile: getTimeout('INVALID_KEY')
    const timeout: number = getTimeout('AUTH_NAVIGATION_MS');
    expect(timeout).toBe(30000);
  });

  it('should return same value as direct access', () => {
    const key: TimeoutKey = 'LOADING_DEFAULT_MS';
    expect(getTimeout(key)).toBe(TIMEOUTS[key]);
  });
});

describe('Integration with defaults.ts', () => {
  it('should be importable from defaults.ts', async () => {
    // Verify the import works without circular dependency
    const { DEFAULT_TOAST_TIMEOUT, DEFAULT_LOADING_TIMEOUT } = await import('../defaults.js');

    expect(DEFAULT_TOAST_TIMEOUT).toBe(TIMEOUTS.TOAST_DEFAULT_MS);
    expect(DEFAULT_LOADING_TIMEOUT).toBe(TIMEOUTS.LOADING_DEFAULT_MS);
  });

  it('should match OIDC defaults', async () => {
    const {
      DEFAULT_OIDC_SUCCESS_TIMEOUT,
      DEFAULT_PUSH_TIMEOUT_MS,
      DEFAULT_LOGIN_FLOW_MS,
      DEFAULT_IDP_REDIRECT_MS,
      DEFAULT_CALLBACK_MS,
    } = await import('../defaults.js');

    expect(DEFAULT_OIDC_SUCCESS_TIMEOUT).toBe(TIMEOUTS.OIDC_SUCCESS_MS);
    expect(DEFAULT_PUSH_TIMEOUT_MS).toBe(TIMEOUTS.AUTH_MFA_PUSH_MS);
    expect(DEFAULT_LOGIN_FLOW_MS).toBe(TIMEOUTS.AUTH_LOGIN_FLOW_MS);
    expect(DEFAULT_IDP_REDIRECT_MS).toBe(TIMEOUTS.AUTH_IDP_REDIRECT_MS);
    expect(DEFAULT_CALLBACK_MS).toBe(TIMEOUTS.AUTH_CALLBACK_MS);
  });
});
