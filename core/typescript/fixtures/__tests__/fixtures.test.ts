/**
 * Unit tests for ARTK Fixtures Module (T056)
 *
 * Tests fixture composition, type safety, and behavior.
 * Note: These are unit tests - integration tests with actual browser
 * would run in a Playwright test context.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ARTKConfig } from '../../config/types.js';
import { createTestDataManager, createUniqueEmail, createUniqueName, generateRunId, namespaceValue, shouldRunCleanup } from '../data.js';
import { createRolePageFixture, getAvailableRoles } from '../auth.js';
import { getStorageStateDirectory, getStorageStatePathForRole } from '../base.js';

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Create a minimal valid ARTK config for testing
 */
function createTestConfig(overrides: Partial<ARTKConfig> = {}): ARTKConfig {
  return {
    version: 1,
    app: {
      name: 'Test App',
      baseUrl: 'https://example.com',
      type: 'spa',
    },
    environments: {
      local: { baseUrl: 'http://localhost:3000' },
      staging: { baseUrl: 'https://staging.example.com' },
    },
    activeEnvironment: 'local',
    auth: {
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
            username: 'USER_USER',
            password: 'USER_PASS',
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
    selectors: {
      testIdAttribute: 'data-testid',
      strategy: ['role', 'testid', 'css'],
    },
    assertions: {
      toast: {
        containerSelector: '.toast',
        messageSelector: '.toast-message',
        typeAttribute: 'data-type',
      },
      loading: {
        selectors: ['.loading', '.spinner'],
      },
      form: {
        errorSelector: '.field-error-{field}',
        formErrorSelector: '.form-error',
      },
    },
    data: {
      namespace: {
        prefix: '[artk-',
        suffix: ']',
      },
      cleanup: {
        enabled: true,
        onFailure: true,
        parallel: false,
      },
    },
    fixtures: {
      defaultRole: 'admin',
      roleFixtures: ['admin', 'standardUser'],
    },
    tiers: {
      smoke: { retries: 0, workers: 1, timeout: 30000, tag: '@smoke' },
      release: { retries: 1, workers: 2, timeout: 60000, tag: '@release' },
      regression: { retries: 2, workers: 4, timeout: 120000, tag: '@regression' },
    },
    reporters: {},
    artifacts: {
      outputDir: 'test-results',
      screenshots: {
        mode: 'only-on-failure',
        fullPage: false,
        maskPii: false,
        piiSelectors: [],
      },
      video: {
        mode: 'off',
      },
      trace: {
        mode: 'off',
      },
    },
    browsers: {
      enabled: ['chromium'],
      viewport: { width: 1280, height: 720 },
      headless: true,
    },
    journeys: {
      id: { prefix: 'JRN', width: 4 },
      layout: 'flat',
      backlog: { groupBy: 'tier' },
    },
    ...overrides,
  } as ARTKConfig;
}

// =============================================================================
// Run ID Tests (T053)
// =============================================================================

describe('generateRunId', () => {
  it('generates 8 character hex string', () => {
    const runId = generateRunId();

    expect(runId).toMatch(/^[a-f0-9]{8}$/);
    expect(runId).toHaveLength(8);
  });

  it('generates unique IDs', () => {
    const ids = new Set<string>();

    for (let i = 0; i < 100; i++) {
      ids.add(generateRunId());
    }

    expect(ids.size).toBe(100);
  });
});

// =============================================================================
// Test Data Manager Tests (T054)
// =============================================================================

describe('createTestDataManager', () => {
  let config: ARTKConfig;

  beforeEach(() => {
    config = createTestConfig();
  });

  it('creates manager with run ID', () => {
    const runId = 'abc12345';
    const manager = createTestDataManager(runId, config);

    expect(manager.runId).toBe(runId);
  });

  it('registers cleanup functions', () => {
    const runId = generateRunId();
    const manager = createTestDataManager(runId, config);

    const cleanupFn = vi.fn().mockResolvedValue(undefined);
    manager.cleanup(cleanupFn, { label: 'Test cleanup' });

    // Cleanup is registered but not yet run
    expect(cleanupFn).not.toHaveBeenCalled();
  });

  it('runs cleanups in order', async () => {
    const runId = generateRunId();
    const manager = createTestDataManager(runId, config);

    const order: number[] = [];

    manager.cleanup(async () => { order.push(1); }, { priority: 10 });
    manager.cleanup(async () => { order.push(2); }, { priority: 20 });
    manager.cleanup(async () => { order.push(3); }, { priority: 5 });

    await manager.runCleanup();

    // Should run in priority order (lower first)
    expect(order).toEqual([3, 1, 2]);
  });

  it('continues cleanup on individual failures', async () => {
    const runId = generateRunId();
    const manager = createTestDataManager(runId, config);

    const successFn = vi.fn().mockResolvedValue(undefined);
    const failFn = vi.fn().mockRejectedValue(new Error('Cleanup failed'));

    manager.cleanup(failFn, { priority: 10, label: 'Failing cleanup' });
    manager.cleanup(successFn, { priority: 20, label: 'Success cleanup' });

    // Should throw aggregate error but still run all cleanups
    await expect(manager.runCleanup()).rejects.toThrow();

    expect(failFn).toHaveBeenCalled();
    expect(successFn).toHaveBeenCalled();
  });

  it('registers API cleanups', () => {
    const runId = generateRunId();
    const manager = createTestDataManager(runId, config);

    // Should not throw
    manager.cleanupApi('DELETE', '/api/orders/123');
    manager.cleanupApi('POST', '/api/cleanup', { ids: [1, 2, 3] });
  });
});

// =============================================================================
// Data Utilities Tests
// =============================================================================

describe('namespaceValue', () => {
  let config: ARTKConfig;

  beforeEach(() => {
    config = createTestConfig();
  });

  it('namespaces value with run ID', () => {
    const result = namespaceValue('Test Order', 'abc123', config);

    expect(result).toBe('Test Order [artk-abc123]');
  });

  it('uses config namespace settings', () => {
    config = createTestConfig({
      data: {
        namespace: { prefix: '(test-', suffix: ')' },
        cleanup: { enabled: true, onFailure: true, parallel: false },
      },
    });

    const result = namespaceValue('Test Order', 'abc123', config);

    expect(result).toBe('Test Order (test-abc123)');
  });
});

describe('createUniqueName', () => {
  it('creates name with run ID suffix', () => {
    const result = createUniqueName('Order', 'abc123');

    expect(result).toBe('Order-abc123');
  });
});

describe('createUniqueEmail', () => {
  it('creates email with run ID and default domain', () => {
    const result = createUniqueEmail('user', 'abc123');

    expect(result).toBe('user-abc123@test.example.com');
  });

  it('uses custom domain', () => {
    const result = createUniqueEmail('admin', 'xyz789', 'custom.domain');

    expect(result).toBe('admin-xyz789@custom.domain');
  });
});

describe('shouldRunCleanup', () => {
  it('returns false when cleanup disabled', () => {
    const config = createTestConfig({
      data: {
        namespace: { prefix: '[', suffix: ']' },
        cleanup: { enabled: false, onFailure: false, parallel: false },
      },
    });

    expect(shouldRunCleanup(config, true)).toBe(false);
    expect(shouldRunCleanup(config, false)).toBe(false);
  });

  it('returns true when cleanup enabled and test passed', () => {
    const config = createTestConfig({
      data: {
        namespace: { prefix: '[', suffix: ']' },
        cleanup: { enabled: true, onFailure: false, parallel: false },
      },
    });

    expect(shouldRunCleanup(config, true)).toBe(true);
  });

  it('respects onFailure setting', () => {
    const configNoCleanupOnFail = createTestConfig({
      data: {
        namespace: { prefix: '[', suffix: ']' },
        cleanup: { enabled: true, onFailure: false, parallel: false },
      },
    });

    expect(shouldRunCleanup(configNoCleanupOnFail, false)).toBe(false);

    const configCleanupOnFail = createTestConfig({
      data: {
        namespace: { prefix: '[', suffix: ']' },
        cleanup: { enabled: true, onFailure: true, parallel: false },
      },
    });

    expect(shouldRunCleanup(configCleanupOnFail, false)).toBe(true);
  });
});

// =============================================================================
// Auth Fixture Tests (T050, T051)
// =============================================================================

describe('getAvailableRoles', () => {
  it('returns all role names from config', () => {
    const config = createTestConfig();
    const roles = getAvailableRoles(config);

    expect(roles).toContain('admin');
    expect(roles).toContain('standardUser');
    expect(roles).toHaveLength(2);
  });
});

describe('createRolePageFixture', () => {
  it('creates fixture function for role', () => {
    const fixture = createRolePageFixture('admin');

    expect(typeof fixture).toBe('function');
  });

  it('throws for unknown role when called', async () => {
    const config = createTestConfig();
    const fixture = createRolePageFixture('nonexistent');

    // Create a mock use function
    const use = vi.fn();

    // Should throw when role not in config
    await expect(
      fixture({ browser: {} as any, config }, use)
    ).rejects.toThrow('Role "nonexistent" not found');
  });
});

// =============================================================================
// Base Fixture Tests (T049)
// =============================================================================

describe('getStorageStateDirectory', () => {
  it('returns resolved directory path', () => {
    const config = createTestConfig();
    const dir = getStorageStateDirectory(config, '/project');

    expect(dir).toBe('/project/.auth-states');
  });
});

describe('getStorageStatePathForRole', () => {
  it('returns storage state path with role', () => {
    const config = createTestConfig();
    const path = getStorageStatePathForRole(config, 'admin', '/project');

    expect(path).toBe('/project/.auth-states/admin.json');
  });

  it('uses file pattern from config', () => {
    const config = createTestConfig({
      auth: {
        ...createTestConfig().auth,
        storageState: {
          directory: '.auth-states',
          maxAgeMinutes: 60,
          filePattern: '{role}-{env}.json',
        },
      },
    });

    const path = getStorageStatePathForRole(config, 'admin', '/project');

    expect(path).toBe('/project/.auth-states/admin-local.json');
  });
});

// =============================================================================
// Type Safety Tests
// =============================================================================

describe('Type safety', () => {
  it('TestDataManager interface has required properties', () => {
    const config = createTestConfig();
    const manager = createTestDataManager('test', config);

    // TypeScript compile-time checks
    expect(typeof manager.runId).toBe('string');
    expect(typeof manager.cleanup).toBe('function');
    expect(typeof manager.cleanupApi).toBe('function');
    expect(typeof manager.runCleanup).toBe('function');
  });

  it('ARTKConfig has required sections', () => {
    const config = createTestConfig();

    // TypeScript compile-time checks
    expect(config.app).toBeDefined();
    expect(config.auth).toBeDefined();
    expect(config.fixtures).toBeDefined();
    expect(config.data).toBeDefined();
    expect(config.browsers).toBeDefined();
  });
});

// =============================================================================
// Fixture Composition Tests
// =============================================================================

describe('Fixture composition', () => {
  it('testData includes runId', () => {
    const runId = generateRunId();
    const config = createTestConfig();
    const manager = createTestDataManager(runId, config);

    expect(manager.runId).toBe(runId);
  });

  it('config drives fixture behavior', () => {
    const config = createTestConfig({
      fixtures: {
        defaultRole: 'standardUser',
        roleFixtures: ['admin'],
      },
    });

    expect(config.fixtures.defaultRole).toBe('standardUser');
    expect(config.fixtures.roleFixtures).toContain('admin');
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Edge cases', () => {
  it('handles empty roleFixtures array', () => {
    const config = createTestConfig({
      fixtures: {
        defaultRole: 'admin',
        roleFixtures: [],
      },
    });

    expect(config.fixtures.roleFixtures).toEqual([]);
  });

  it('handles missing optional config sections', () => {
    const config = createTestConfig();
    // These are optional in the fixtures config
    expect(config.fixtures.api).toBeUndefined();
  });

  it('cleanup handles no registered functions', async () => {
    const config = createTestConfig();
    const manager = createTestDataManager('test', config);

    // Should not throw
    await manager.runCleanup();
  });
});
