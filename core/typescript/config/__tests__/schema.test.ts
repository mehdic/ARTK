/**
 * Unit tests for Zod schema validation
 *
 * Tests FR-002: Validate configuration against defined schema and report all validation errors with field paths
 */

import { describe, expect, it } from 'vitest';

import {
  AppConfigSchema,
  ARTKConfigSchema,
  AuthConfigSchema,
  BrowsersConfigSchema,
  FixturesConfigSchema,
  OIDCConfigSchema,
  OIDCSuccessConfigSchema,
  RoleConfigSchema,
  SelectorsConfigSchema,
  TierConfigSchema,
} from '../schema.js';
import {
  DEFAULT_APP_TYPE,
  DEFAULT_BROWSERS,
  DEFAULT_SELECTORS,
  DEFAULT_STORAGE_STATE,
  SUPPORTED_CONFIG_VERSION,
} from '../defaults.js';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a minimal valid configuration for testing
 */
function createMinimalConfig(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    version: SUPPORTED_CONFIG_VERSION,
    app: {
      name: 'Test App',
      baseUrl: 'https://example.com',
    },
    auth: {
      provider: 'oidc',
      roles: {
        admin: {
          credentialsEnv: {
            username: 'ADMIN_USER',
            password: 'ADMIN_PASS',
          },
        },
      },
      oidc: {
        idpType: 'keycloak',
        loginUrl: 'https://example.com/login',
        success: {
          url: 'https://example.com/dashboard',
        },
      },
    },
    fixtures: {
      defaultRole: 'admin',
    },
    ...overrides,
  };
}

// =============================================================================
// AppConfigSchema Tests
// =============================================================================

describe('AppConfigSchema', () => {
  it('validates valid app config', () => {
    const result = AppConfigSchema.safeParse({
      name: 'ITSS',
      baseUrl: 'https://example.com',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe(DEFAULT_APP_TYPE);
    }
  });

  it('applies default app type', () => {
    const result = AppConfigSchema.safeParse({
      name: 'ITSS',
      baseUrl: 'https://example.com',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('spa');
    }
  });

  it('rejects empty name', () => {
    const result = AppConfigSchema.safeParse({
      name: '',
      baseUrl: 'https://example.com',
    });

    expect(result.success).toBe(false);
  });

  it('rejects empty baseUrl', () => {
    const result = AppConfigSchema.safeParse({
      name: 'ITSS',
      baseUrl: '',
    });

    expect(result.success).toBe(false);
  });

  it('accepts valid app types', () => {
    for (const type of ['spa', 'ssr', 'hybrid'] as const) {
      const result = AppConfigSchema.safeParse({
        name: 'ITSS',
        baseUrl: 'https://example.com',
        type,
      });

      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid app type', () => {
    const result = AppConfigSchema.safeParse({
      name: 'ITSS',
      baseUrl: 'https://example.com',
      type: 'invalid',
    });

    expect(result.success).toBe(false);
  });
});

// =============================================================================
// RoleConfigSchema Tests
// =============================================================================

describe('RoleConfigSchema', () => {
  it('validates valid role config', () => {
    const result = RoleConfigSchema.safeParse({
      credentialsEnv: {
        username: 'ADMIN_USER',
        password: 'ADMIN_PASS',
      },
    });

    expect(result.success).toBe(true);
  });

  it('accepts optional description', () => {
    const result = RoleConfigSchema.safeParse({
      credentialsEnv: {
        username: 'ADMIN_USER',
        password: 'ADMIN_PASS',
      },
      description: 'Administrator role',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe('Administrator role');
    }
  });

  it('rejects missing credentials', () => {
    const result = RoleConfigSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it('rejects empty username env var', () => {
    const result = RoleConfigSchema.safeParse({
      credentialsEnv: {
        username: '',
        password: 'PASS',
      },
    });

    expect(result.success).toBe(false);
  });
});

// =============================================================================
// OIDCSuccessConfigSchema Tests
// =============================================================================

describe('OIDCSuccessConfigSchema', () => {
  it('validates with url', () => {
    const result = OIDCSuccessConfigSchema.safeParse({
      url: 'https://example.com/dashboard',
    });

    expect(result.success).toBe(true);
  });

  it('validates with selector', () => {
    const result = OIDCSuccessConfigSchema.safeParse({
      selector: '[data-testid="dashboard"]',
    });

    expect(result.success).toBe(true);
  });

  it('validates with both url and selector', () => {
    const result = OIDCSuccessConfigSchema.safeParse({
      url: 'https://example.com/dashboard',
      selector: '[data-testid="dashboard"]',
    });

    expect(result.success).toBe(true);
  });

  it('rejects when neither url nor selector provided', () => {
    const result = OIDCSuccessConfigSchema.safeParse({});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('Either success.url or success.selector');
    }
  });
});

// =============================================================================
// OIDCConfigSchema Tests
// =============================================================================

describe('OIDCConfigSchema', () => {
  it('validates valid OIDC config', () => {
    const result = OIDCConfigSchema.safeParse({
      idpType: 'keycloak',
      loginUrl: 'https://example.com/login',
      success: {
        url: 'https://example.com/dashboard',
      },
    });

    expect(result.success).toBe(true);
  });

  it('accepts all valid idpTypes', () => {
    for (const idpType of ['keycloak', 'azure-ad', 'okta', 'auth0', 'generic'] as const) {
      const result = OIDCConfigSchema.safeParse({
        idpType,
        loginUrl: 'https://example.com/login',
        success: { url: 'https://example.com' },
      });

      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid idpType', () => {
    const result = OIDCConfigSchema.safeParse({
      idpType: 'invalid',
      loginUrl: 'https://example.com/login',
      success: { url: 'https://example.com' },
    });

    expect(result.success).toBe(false);
  });

  it('accepts optional MFA config', () => {
    const result = OIDCConfigSchema.safeParse({
      idpType: 'keycloak',
      loginUrl: 'https://example.com/login',
      success: { url: 'https://example.com' },
      mfa: {
        enabled: true,
        type: 'totp',
        totpSecretEnv: 'TOTP_SECRET',
      },
    });

    expect(result.success).toBe(true);
  });
});

// =============================================================================
// AuthConfigSchema Tests
// =============================================================================

describe('AuthConfigSchema', () => {
  it('validates valid auth config with OIDC', () => {
    const result = AuthConfigSchema.safeParse({
      provider: 'oidc',
      roles: {
        admin: {
          credentialsEnv: {
            username: 'ADMIN_USER',
            password: 'ADMIN_PASS',
          },
        },
      },
      oidc: {
        idpType: 'keycloak',
        loginUrl: 'https://example.com/login',
        success: { url: 'https://example.com' },
      },
    });

    expect(result.success).toBe(true);
  });

  it('applies default storage state', () => {
    const result = AuthConfigSchema.safeParse({
      provider: 'oidc',
      roles: {
        admin: {
          credentialsEnv: {
            username: 'ADMIN_USER',
            password: 'ADMIN_PASS',
          },
        },
      },
      oidc: {
        idpType: 'keycloak',
        loginUrl: 'https://example.com/login',
        success: { url: 'https://example.com' },
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.storageState.directory).toBe(DEFAULT_STORAGE_STATE.directory);
      expect(result.data.storageState.maxAgeMinutes).toBe(DEFAULT_STORAGE_STATE.maxAgeMinutes);
    }
  });

  it('requires OIDC config when provider is oidc', () => {
    const result = AuthConfigSchema.safeParse({
      provider: 'oidc',
      roles: {
        admin: {
          credentialsEnv: { username: 'U', password: 'P' },
        },
      },
      // Missing oidc config
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const oidcIssue = result.error.issues.find((i) => i.path.includes('oidc'));
      expect(oidcIssue).toBeDefined();
    }
  });

  it('requires at least one role', () => {
    const result = AuthConfigSchema.safeParse({
      provider: 'oidc',
      roles: {},
      oidc: {
        idpType: 'keycloak',
        loginUrl: 'https://example.com/login',
        success: { url: 'https://example.com' },
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('At least one role');
    }
  });

  it('validates form auth config', () => {
    const result = AuthConfigSchema.safeParse({
      provider: 'form',
      roles: {
        user: {
          credentialsEnv: { username: 'U', password: 'P' },
        },
      },
      form: {
        loginUrl: 'https://example.com/login',
        selectors: {
          username: '#username',
          password: '#password',
          submit: 'button[type="submit"]',
        },
        success: { url: 'https://example.com/dashboard' },
      },
    });

    expect(result.success).toBe(true);
  });
});

// =============================================================================
// SelectorsConfigSchema Tests
// =============================================================================

describe('SelectorsConfigSchema', () => {
  it('applies defaults', () => {
    const result = SelectorsConfigSchema.safeParse({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.testIdAttribute).toBe(DEFAULT_SELECTORS.testIdAttribute);
      expect(result.data.strategy).toEqual([...DEFAULT_SELECTORS.strategy]);
    }
  });

  it('accepts custom test ID attribute', () => {
    const result = SelectorsConfigSchema.safeParse({
      testIdAttribute: 'data-qa',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.testIdAttribute).toBe('data-qa');
    }
  });

  it('accepts custom strategy order', () => {
    const result = SelectorsConfigSchema.safeParse({
      strategy: ['testid', 'role', 'css'],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.strategy).toEqual(['testid', 'role', 'css']);
    }
  });

  it('rejects invalid strategy', () => {
    const result = SelectorsConfigSchema.safeParse({
      strategy: ['invalid'],
    });

    expect(result.success).toBe(false);
  });
});

// =============================================================================
// TierConfigSchema Tests
// =============================================================================

describe('TierConfigSchema', () => {
  it('validates valid tier config', () => {
    const result = TierConfigSchema.safeParse({
      retries: 2,
      workers: 4,
      timeout: 60000,
      tag: '@smoke',
    });

    expect(result.success).toBe(true);
  });

  it('rejects negative retries', () => {
    const result = TierConfigSchema.safeParse({
      retries: -1,
      workers: 4,
      timeout: 60000,
      tag: '@smoke',
    });

    expect(result.success).toBe(false);
  });

  it('rejects zero workers', () => {
    const result = TierConfigSchema.safeParse({
      retries: 2,
      workers: 0,
      timeout: 60000,
      tag: '@smoke',
    });

    expect(result.success).toBe(false);
  });

  it('rejects empty tag', () => {
    const result = TierConfigSchema.safeParse({
      retries: 2,
      workers: 4,
      timeout: 60000,
      tag: '',
    });

    expect(result.success).toBe(false);
  });
});

// =============================================================================
// BrowsersConfigSchema Tests
// =============================================================================

describe('BrowsersConfigSchema', () => {
  it('applies defaults', () => {
    const result = BrowsersConfigSchema.safeParse({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.enabled).toEqual(DEFAULT_BROWSERS.enabled);
      expect(result.data.viewport).toEqual(DEFAULT_BROWSERS.viewport);
      expect(result.data.headless).toBe(DEFAULT_BROWSERS.headless);
    }
  });

  it('accepts all valid browser types', () => {
    const result = BrowsersConfigSchema.safeParse({
      enabled: ['chromium', 'firefox', 'webkit'],
    });

    expect(result.success).toBe(true);
  });

  it('rejects empty enabled array', () => {
    const result = BrowsersConfigSchema.safeParse({
      enabled: [],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('At least one browser');
    }
  });

  it('rejects invalid browser type', () => {
    const result = BrowsersConfigSchema.safeParse({
      enabled: ['chrome'],
    });

    expect(result.success).toBe(false);
  });

  it('accepts custom viewport', () => {
    const result = BrowsersConfigSchema.safeParse({
      viewport: { width: 1920, height: 1080 },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.viewport).toEqual({ width: 1920, height: 1080 });
    }
  });
});

// =============================================================================
// FixturesConfigSchema Tests
// =============================================================================

describe('FixturesConfigSchema', () => {
  it('validates valid fixtures config', () => {
    const result = FixturesConfigSchema.safeParse({
      defaultRole: 'admin',
    });

    expect(result.success).toBe(true);
  });

  it('rejects empty defaultRole', () => {
    const result = FixturesConfigSchema.safeParse({
      defaultRole: '',
    });

    expect(result.success).toBe(false);
  });

  it('accepts optional roleFixtures', () => {
    const result = FixturesConfigSchema.safeParse({
      defaultRole: 'admin',
      roleFixtures: ['admin', 'user', 'guest'],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.roleFixtures).toEqual(['admin', 'user', 'guest']);
    }
  });
});

// =============================================================================
// ARTKConfigSchema Tests
// =============================================================================

describe('ARTKConfigSchema', () => {
  it('validates minimal valid config', () => {
    const config = createMinimalConfig();
    const result = ARTKConfigSchema.safeParse(config);

    expect(result.success).toBe(true);
  });

  it('accepts any version >= 1 (migration handles compatibility)', () => {
    // Version 2 is valid for the schema (migration will handle it in loader)
    const config = createMinimalConfig({ version: 2 });
    const result = ARTKConfigSchema.safeParse(config);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.version).toBe(2);
    }
  });

  it('rejects version 0', () => {
    const config = createMinimalConfig({ version: 0 });
    const result = ARTKConfigSchema.safeParse(config);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('greater than or equal to 1');
    }
  });

  it('validates activeEnvironment against environments', () => {
    const config = createMinimalConfig({
      environments: {
        local: { baseUrl: 'http://localhost:3000' },
        staging: { baseUrl: 'https://staging.example.com' },
      },
      activeEnvironment: 'production', // Not in environments
    });

    const result = ARTKConfigSchema.safeParse(config);

    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) =>
        i.message.includes('does not match any defined environment')
      );
      expect(issue).toBeDefined();
    }
  });

  it('accepts activeEnvironment with env var template', () => {
    const config = createMinimalConfig({
      environments: {
        local: { baseUrl: 'http://localhost:3000' },
      },
      activeEnvironment: '${ARTK_ENV:-local}',
    });

    const result = ARTKConfigSchema.safeParse(config);

    expect(result.success).toBe(true);
  });

  it('accepts non-default activeEnvironment with empty environments for backward compatibility', () => {
    // This is allowed for backward compatibility even though it may indicate misconfiguration
    const config = createMinimalConfig({
      environments: {},
      activeEnvironment: 'production',
    });

    const result = ARTKConfigSchema.safeParse(config);

    // Should pass for backward compatibility (empty environments = use app.baseUrl)
    expect(result.success).toBe(true);
  });

  it('accepts default activeEnvironment with empty environments', () => {
    // Using 'default' as activeEnvironment with empty environments is OK
    const config = createMinimalConfig({
      environments: {},
      activeEnvironment: 'default',
    });

    const result = ARTKConfigSchema.safeParse(config);

    // Should pass because 'default' is the default value
    expect(result.success).toBe(true);
  });

  it('validates fixtures.defaultRole exists in auth.roles', () => {
    const config = createMinimalConfig();
    // Change defaultRole to non-existent role
    (config['fixtures'] as Record<string, unknown>)['defaultRole'] = 'nonexistent';

    const result = ARTKConfigSchema.safeParse(config);

    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) =>
        i.message.includes('does not match any defined role')
      );
      expect(issue).toBeDefined();
    }
  });

  it('validates fixtures.roleFixtures all exist in auth.roles', () => {
    const config = createMinimalConfig();
    (config['fixtures'] as Record<string, unknown>)['roleFixtures'] = ['admin', 'nonexistent'];

    const result = ARTKConfigSchema.safeParse(config);

    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) =>
        i.message.includes('is not a defined role')
      );
      expect(issue).toBeDefined();
    }
  });

  it('applies all defaults', () => {
    const config = createMinimalConfig();
    const result = ARTKConfigSchema.safeParse(config);

    expect(result.success).toBe(true);
    if (result.success) {
      // Check various defaults are applied
      expect(result.data.selectors.testIdAttribute).toBe(DEFAULT_SELECTORS.testIdAttribute);
      expect(result.data.browsers.headless).toBe(true);
      expect(result.data.artifacts.screenshots.mode).toBe('only-on-failure');
      expect(Object.keys(result.data.tiers)).toContain('smoke');
    }
  });

  it('accepts complete valid config', () => {
    const config = {
      version: SUPPORTED_CONFIG_VERSION,
      app: {
        name: 'ITSS',
        baseUrl: 'https://itss.example.com',
        type: 'spa' as const,
      },
      environments: {
        local: { baseUrl: 'http://localhost:3000' },
        staging: { baseUrl: 'https://staging.itss.example.com' },
        production: { baseUrl: 'https://itss.example.com' },
      },
      activeEnvironment: 'local',
      auth: {
        provider: 'oidc' as const,
        storageState: {
          directory: '.auth-states',
          maxAgeMinutes: 30,
          filePattern: '{role}-{env}.json',
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
              username: 'USER_USER',
              password: 'USER_PASS',
            },
          },
        },
        oidc: {
          idpType: 'keycloak' as const,
          loginUrl: 'https://itss.example.com/login',
          success: {
            url: 'https://itss.example.com/dashboard',
          },
          mfa: {
            enabled: true,
            type: 'totp' as const,
            totpSecretEnv: 'TOTP_SECRET',
          },
        },
      },
      selectors: {
        testIdAttribute: 'data-testid',
        strategy: ['role', 'testid', 'css'] as const,
      },
      fixtures: {
        defaultRole: 'admin',
        roleFixtures: ['admin', 'standardUser'],
      },
      tiers: {
        smoke: { retries: 0, workers: 1, timeout: 30000, tag: '@smoke' },
        release: { retries: 1, workers: 2, timeout: 60000, tag: '@release' },
      },
      browsers: {
        enabled: ['chromium', 'firefox'] as const,
        viewport: { width: 1920, height: 1080 },
        headless: true,
      },
    };

    const result = ARTKConfigSchema.safeParse(config);

    expect(result.success).toBe(true);
  });
});
