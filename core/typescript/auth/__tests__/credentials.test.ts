/**
 * Unit tests for credentials loading
 *
 * Tests FR-011: Credentials from env vars only
 *
 * @module auth/__tests__/credentials.test
 */

import { describe, expect, it } from 'vitest';
import {
  formatMissingCredentialsError,
  getCredentials,
  getCredentialsFromRoleConfig,
  hasCredentials,
  type MissingCredential,
  validateCredentials,
} from '../credentials.js';
import type { AuthConfig, RoleConfig } from '../../config/types.js';
import { ARTKAuthError } from '../../errors/auth-error.js';

// =============================================================================
// Test Fixtures
// =============================================================================

const createTestAuthConfig = (roles: Record<string, RoleConfig> = {}): AuthConfig => ({
  provider: 'oidc',
  storageState: {
    directory: '.auth-states',
    maxAgeMinutes: 60,
    filePattern: '{role}.json',
  },
  roles: {
    admin: {
      credentialsEnv: {
        username: 'ADMIN_USER',
        password: 'ADMIN_PASS',
      },
      description: 'Administrator role',
    },
    standardUser: {
      credentialsEnv: {
        username: 'USER_USERNAME',
        password: 'USER_PASSWORD',
      },
      description: 'Standard user role',
    },
    ...roles,
  },
  oidc: {
    idpType: 'keycloak',
    loginUrl: 'https://app.example.com/login',
    success: { url: '/dashboard' },
  },
});

// =============================================================================
// getCredentials Tests
// =============================================================================

describe('getCredentials', () => {
  it('returns credentials when env vars are set', () => {
    const authConfig = createTestAuthConfig();
    const env = {
      ADMIN_USER: 'admin@example.com',
      ADMIN_PASS: 'secret123',
    };

    const credentials = getCredentials('admin', authConfig, { env });

    expect(credentials).toEqual({
      username: 'admin@example.com',
      password: 'secret123',
    });
  });

  it('throws ARTKAuthError when role is not found', () => {
    const authConfig = createTestAuthConfig();
    const env = {};

    expect(() => getCredentials('nonexistent', authConfig, { env }))
      .toThrow(ARTKAuthError);

    try {
      getCredentials('nonexistent', authConfig, { env });
    } catch (error) {
      expect(error).toBeInstanceOf(ARTKAuthError);
      expect((error as ARTKAuthError).role).toBe('nonexistent');
      expect((error as ARTKAuthError).phase).toBe('credentials');
      expect((error as ARTKAuthError).message).toContain('not found');
      expect((error as ARTKAuthError).message).toContain('admin, standardUser');
    }
  });

  it('throws ARTKAuthError when username env var is not set', () => {
    const authConfig = createTestAuthConfig();
    const env = {
      ADMIN_PASS: 'secret123',
      // ADMIN_USER is missing
    };

    expect(() => getCredentials('admin', authConfig, { env }))
      .toThrow(ARTKAuthError);

    try {
      getCredentials('admin', authConfig, { env });
    } catch (error) {
      expect(error).toBeInstanceOf(ARTKAuthError);
      expect((error as ARTKAuthError).role).toBe('admin');
      expect((error as ARTKAuthError).message).toContain('ADMIN_USER');
      expect((error as ARTKAuthError).message).toContain('username');
    }
  });

  it('throws ARTKAuthError when password env var is not set', () => {
    const authConfig = createTestAuthConfig();
    const env = {
      ADMIN_USER: 'admin@example.com',
      // ADMIN_PASS is missing
    };

    expect(() => getCredentials('admin', authConfig, { env }))
      .toThrow(ARTKAuthError);

    try {
      getCredentials('admin', authConfig, { env });
    } catch (error) {
      expect(error).toBeInstanceOf(ARTKAuthError);
      expect((error as ARTKAuthError).role).toBe('admin');
      expect((error as ARTKAuthError).message).toContain('ADMIN_PASS');
      expect((error as ARTKAuthError).message).toContain('password');
    }
  });

  it('provides remediation in error message', () => {
    const authConfig = createTestAuthConfig();
    const env = {};

    try {
      getCredentials('admin', authConfig, { env });
    } catch (error) {
      expect((error as ARTKAuthError).remediation).toContain('ADMIN_USER');
    }
  });

  it('handles multiple roles independently', () => {
    const authConfig = createTestAuthConfig();
    const env = {
      ADMIN_USER: 'admin@example.com',
      ADMIN_PASS: 'adminpass',
      USER_USERNAME: 'user@example.com',
      USER_PASSWORD: 'userpass',
    };

    const adminCreds = getCredentials('admin', authConfig, { env });
    const userCreds = getCredentials('standardUser', authConfig, { env });

    expect(adminCreds.username).toBe('admin@example.com');
    expect(userCreds.username).toBe('user@example.com');
    expect(adminCreds.password).toBe('adminpass');
    expect(userCreds.password).toBe('userpass');
  });
});

// =============================================================================
// getCredentialsFromRoleConfig Tests
// =============================================================================

describe('getCredentialsFromRoleConfig', () => {
  it('returns credentials from role config', () => {
    const roleConfig: RoleConfig = {
      credentialsEnv: {
        username: 'TEST_USER',
        password: 'TEST_PASS',
      },
    };
    const env = {
      TEST_USER: 'testuser',
      TEST_PASS: 'testpass',
    };

    const credentials = getCredentialsFromRoleConfig('test', roleConfig, { env });

    expect(credentials).toEqual({
      username: 'testuser',
      password: 'testpass',
    });
  });

  it('throws when env vars are missing', () => {
    const roleConfig: RoleConfig = {
      credentialsEnv: {
        username: 'MISSING_USER',
        password: 'MISSING_PASS',
      },
    };
    const env = {};

    expect(() => getCredentialsFromRoleConfig('test', roleConfig, { env }))
      .toThrow(ARTKAuthError);
  });
});

// =============================================================================
// validateCredentials Tests
// =============================================================================

describe('validateCredentials', () => {
  it('returns empty array when all credentials are available', () => {
    const authConfig = createTestAuthConfig();
    const env = {
      ADMIN_USER: 'admin@example.com',
      ADMIN_PASS: 'adminpass',
      USER_USERNAME: 'user@example.com',
      USER_PASSWORD: 'userpass',
    };

    const missing = validateCredentials(['admin', 'standardUser'], authConfig, env);

    expect(missing).toEqual([]);
  });

  it('returns missing credentials for undefined env vars', () => {
    const authConfig = createTestAuthConfig();
    const env = {
      ADMIN_USER: 'admin@example.com',
      // ADMIN_PASS is missing
      USER_USERNAME: 'user@example.com',
      USER_PASSWORD: 'userpass',
    };

    const missing = validateCredentials(['admin', 'standardUser'], authConfig, env);

    expect(missing).toHaveLength(1);
    expect(missing[0]).toEqual({
      role: 'admin',
      type: 'password',
      envVar: 'ADMIN_PASS',
      message: 'Environment variable "ADMIN_PASS" not set',
    });
  });

  it('returns error for unknown role', () => {
    const authConfig = createTestAuthConfig();
    const env = {};

    const missing = validateCredentials(['unknown'], authConfig, env);

    expect(missing).toHaveLength(1);
    expect(missing[0]).toEqual({
      role: 'unknown',
      type: 'role',
      message: 'Role "unknown" not found in configuration',
    });
  });

  it('returns multiple missing items', () => {
    const authConfig = createTestAuthConfig();
    const env = {};

    const missing = validateCredentials(['admin'], authConfig, env);

    expect(missing).toHaveLength(2);
    expect(missing.map(m => m.type)).toContain('username');
    expect(missing.map(m => m.type)).toContain('password');
  });
});

// =============================================================================
// formatMissingCredentialsError Tests
// =============================================================================

describe('formatMissingCredentialsError', () => {
  it('returns empty string when no missing credentials', () => {
    const result = formatMissingCredentialsError([]);

    expect(result).toBe('');
  });

  it('formats single missing credential', () => {
    const missing: MissingCredential[] = [
      { role: 'admin', type: 'username', envVar: 'ADMIN_USER', message: 'Not set' },
    ];

    const result = formatMissingCredentialsError(missing);

    expect(result).toContain('Missing credentials');
    expect(result).toContain('Role "admin"');
    expect(result).toContain('ADMIN_USER');
    expect(result).toContain('export ADMIN_USER=');
  });

  it('formats multiple missing credentials', () => {
    const missing: MissingCredential[] = [
      { role: 'admin', type: 'username', envVar: 'ADMIN_USER', message: 'Not set' },
      { role: 'admin', type: 'password', envVar: 'ADMIN_PASS', message: 'Not set' },
      { role: 'user', type: 'username', envVar: 'USER_NAME', message: 'Not set' },
    ];

    const result = formatMissingCredentialsError(missing);

    expect(result).toContain('Role "admin"');
    expect(result).toContain('Role "user"');
    expect(result).toContain('export ADMIN_USER=');
    expect(result).toContain('export ADMIN_PASS=');
    expect(result).toContain('export USER_NAME=');
  });

  it('handles role not found error', () => {
    const missing: MissingCredential[] = [
      { role: 'unknown', type: 'role', message: 'Role "unknown" not found' },
    ];

    const result = formatMissingCredentialsError(missing);

    expect(result).toContain('Role "unknown"');
    expect(result).toContain('not found');
  });
});

// =============================================================================
// hasCredentials Tests
// =============================================================================

describe('hasCredentials', () => {
  it('returns true when all credentials are available', () => {
    const authConfig = createTestAuthConfig();
    const env = {
      ADMIN_USER: 'admin@example.com',
      ADMIN_PASS: 'adminpass',
    };

    expect(hasCredentials('admin', authConfig, env)).toBe(true);
  });

  it('returns false when username is missing', () => {
    const authConfig = createTestAuthConfig();
    const env = {
      ADMIN_PASS: 'adminpass',
    };

    expect(hasCredentials('admin', authConfig, env)).toBe(false);
  });

  it('returns false when password is missing', () => {
    const authConfig = createTestAuthConfig();
    const env = {
      ADMIN_USER: 'admin@example.com',
    };

    expect(hasCredentials('admin', authConfig, env)).toBe(false);
  });

  it('returns false when role does not exist', () => {
    const authConfig = createTestAuthConfig();
    const env = {};

    expect(hasCredentials('nonexistent', authConfig, env)).toBe(false);
  });

  it('returns false for empty string credentials', () => {
    const authConfig = createTestAuthConfig();
    const env = {
      ADMIN_USER: '',
      ADMIN_PASS: 'adminpass',
    };

    expect(hasCredentials('admin', authConfig, env)).toBe(false);
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('edge cases', () => {
  it('handles credentials with special characters', () => {
    const authConfig = createTestAuthConfig();
    const env = {
      ADMIN_USER: 'admin+test@example.com',
      ADMIN_PASS: 'p@$$w0rd!#$%^&*()',
    };

    const credentials = getCredentials('admin', authConfig, { env });

    expect(credentials.username).toBe('admin+test@example.com');
    expect(credentials.password).toBe('p@$$w0rd!#$%^&*()');
  });

  it('handles credentials with unicode characters', () => {
    const authConfig = createTestAuthConfig();
    const env = {
      ADMIN_USER: 'admin@example.com',
      ADMIN_PASS: 'password\u00e9\u00e8\u00ea',
    };

    const credentials = getCredentials('admin', authConfig, { env });

    expect(credentials.password).toBe('password\u00e9\u00e8\u00ea');
  });

  it('handles empty role configuration', () => {
    const authConfig: AuthConfig = {
      provider: 'oidc',
      storageState: {
        directory: '.auth-states',
        maxAgeMinutes: 60,
        filePattern: '{role}.json',
      },
      roles: {},
    };

    expect(() => getCredentials('admin', authConfig, { env: {} }))
      .toThrow(ARTKAuthError);
  });
});
