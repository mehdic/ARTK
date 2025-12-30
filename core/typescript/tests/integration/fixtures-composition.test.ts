/**
 * Integration Tests: Fixtures Composition (T110)
 *
 * Verifies that fixtures compose correctly with auth and data modules.
 * Tests the integration between:
 * - Base fixture (config loading)
 * - Auth fixtures (role-based authentication)
 * - Data fixtures (test data management, cleanup)
 *
 * @module tests/integration/fixtures-composition
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

// Import fixtures modules
import {
  ensureConfigLoaded,
  getStorageStateDirectory,
  getStorageStatePathForRole,
  isStorageStateValidForRole,
} from '../../fixtures/base.js';

import {
  createRolePageFixture,
  getAvailableRoles,
} from '../../fixtures/auth.js';

import {
  createTestDataManager,
  createUniqueEmail,
  createUniqueName,
  generateRunId,
  namespaceValue,
  shouldRunCleanup,
} from '../../fixtures/data.js';

// Import config for integration
import { clearConfigCache, loadConfig } from '../../config/loader.js';
// Note: ARTKConfig type is used via config objects, not directly imported

// Import storage state for integration
import { saveStorageState } from '../../auth/storage-state.js';
import type { Browser, BrowserContext } from '@playwright/test';

// =============================================================================
// Test Configuration
// =============================================================================

const SAMPLE_CONFIG_YAML = `
version: 1

app:
  name: "Fixtures Integration Test"
  baseUrl: "https://app.example.com"
  type: spa

environments:
  local:
    baseUrl: "http://localhost:3000"
  staging:
    baseUrl: "https://staging.example.com"

activeEnvironment: local

auth:
  provider: oidc
  storageState:
    directory: ".auth-states"
    maxAgeMinutes: 30
    filePattern: "{role}-{env}.json"
  roles:
    admin:
      credentialsEnv:
        username: ADMIN_USER
        password: ADMIN_PASS
      description: "Administrator with full access"
    editor:
      credentialsEnv:
        username: EDITOR_USER
        password: EDITOR_PASS
      description: "Content editor role"
    viewer:
      credentialsEnv:
        username: VIEWER_USER
        password: VIEWER_PASS
      description: "Read-only viewer"
  oidc:
    idpType: keycloak
    loginUrl: "https://keycloak.example.com/auth"
    success:
      url: "/dashboard"

selectors:
  testIdAttribute: "data-testid"
  strategy:
    - role
    - testid
    - css

assertions:
  toast:
    containerSelector: ".toast"
    messageSelector: ".toast-message"
    typeAttribute: "data-type"
  loading:
    selectors:
      - ".loading"
  form:
    errorSelector: ".field-error"
    formErrorSelector: ".form-error"

data:
  namespace:
    prefix: "[artk-"
    suffix: "]"
  cleanup:
    enabled: true
    onFailure: true
    parallel: false
  api:
    baseUrl: "https://api.example.com"
    useMainAuth: true

fixtures:
  defaultRole: admin
  roleFixtures:
    - admin
    - editor
  api:
    baseURL: "https://api.example.com"
    extraHTTPHeaders:
      X-Test-Header: "test-value"

tiers:
  smoke:
    retries: 0
    workers: 1
    timeout: 30000
    tag: "@smoke"
  release:
    retries: 1
    workers: 2
    timeout: 60000
    tag: "@release"
  regression:
    retries: 2
    workers: 4
    timeout: 120000
    tag: "@regression"

reporters: {}

artifacts:
  outputDir: "test-results"
  screenshots:
    mode: "only-on-failure"
    fullPage: false
    maskPii: true
    piiSelectors:
      - "[data-pii]"
  video:
    mode: "off"
  trace:
    mode: "retain-on-failure"

browsers:
  enabled:
    - chromium
  viewport:
    width: 1280
    height: 720
  headless: true

journeys:
  id:
    prefix: "JRN"
    width: 4
  layout: flat
  backlog:
    groupBy: tier
`;

// =============================================================================
// Test Helpers
// =============================================================================

let tempDir: string;
let configFilePath: string;

function createTempEnvironment(): void {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'artk-fixtures-'));
  const artkDir = path.join(tempDir, 'artk');
  fs.mkdirSync(artkDir, { recursive: true });
  configFilePath = path.join(artkDir, 'artk.config.yml');
  fs.writeFileSync(configFilePath, SAMPLE_CONFIG_YAML, 'utf-8');
}

function cleanupTempEnvironment(): void {
  if (tempDir && fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function createMockBrowserContext(): BrowserContext {
  const mockContext = {
    storageState: vi.fn().mockImplementation(async (options: { path?: string } = {}) => {
      if (options.path) {
        const state = {
          cookies: [{ name: 'session', value: 'token', domain: 'example.com', path: '/' }],
          origins: [{ origin: 'https://example.com', localStorage: [] }],
        };
        await fs.promises.mkdir(path.dirname(options.path), { recursive: true });
        await fs.promises.writeFile(options.path, JSON.stringify(state), 'utf-8');
        return state;
      }
      return { cookies: [], origins: [] };
    }),
  } as unknown as BrowserContext;
  return mockContext;
}

// =============================================================================
// Integration Tests: Base Fixture + Config
// =============================================================================

describe('Fixtures Composition Integration (T110)', () => {
  beforeEach(() => {
    createTempEnvironment();
    clearConfigCache();

    vi.stubEnv('ADMIN_USER', 'admin@example.com');
    vi.stubEnv('ADMIN_PASS', 'admin-password');
    vi.stubEnv('EDITOR_USER', 'editor@example.com');
    vi.stubEnv('EDITOR_PASS', 'editor-password');
    vi.stubEnv('VIEWER_USER', 'viewer@example.com');
    vi.stubEnv('VIEWER_PASS', 'viewer-password');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    cleanupTempEnvironment();
    clearConfigCache();
  });

  describe('Base Fixture + Config Integration', () => {
    it('ensures config is loaded via ensureConfigLoaded', () => {
      const config = ensureConfigLoaded({
        configPath: configFilePath,
        baseDir: tempDir,
      });

      expect(config).toBeDefined();
      expect(config.app.name).toBe('Fixtures Integration Test');
      expect(config.activeEnvironment).toBe('local');
    });

    it('provides storage state directory from config', () => {
      const config = ensureConfigLoaded({
        configPath: configFilePath,
        baseDir: tempDir,
      });

      const storageDir = getStorageStateDirectory(config, tempDir);

      expect(storageDir).toBe(path.join(tempDir, '.auth-states'));
    });

    it('resolves storage state path with environment pattern', () => {
      const config = ensureConfigLoaded({
        configPath: configFilePath,
        baseDir: tempDir,
      });

      // Config uses {role}-{env}.json pattern
      const adminPath = getStorageStatePathForRole(config, 'admin', tempDir);

      expect(adminPath).toContain('admin-local.json');
    });

    it('validates storage state for role with config settings', async () => {
      const config = ensureConfigLoaded({
        configPath: configFilePath,
        baseDir: tempDir,
      });

      // Create a mock storage state file
      const storageDir = getStorageStateDirectory(config, tempDir);
      fs.mkdirSync(storageDir, { recursive: true });

      const mockContext = createMockBrowserContext();
      await saveStorageState(mockContext, 'admin', {
        directory: '.auth-states',
        filePattern: '{role}-{env}.json',
        projectRoot: tempDir,
        environment: 'local',
        maxAgeMinutes: 30,
      });

      // Validate using fixture helper
      const isValid = await isStorageStateValidForRole(config, 'admin', tempDir);
      expect(isValid).toBe(true);
    });
  });

  describe('Auth Fixture Integration', () => {
    it('gets available roles from config', () => {
      const config = ensureConfigLoaded({
        configPath: configFilePath,
        baseDir: tempDir,
      });

      const roles = getAvailableRoles(config);

      expect(roles).toContain('admin');
      expect(roles).toContain('editor');
      expect(roles).toContain('viewer');
      expect(roles).toHaveLength(3);
    });

    it('creates role page fixture function', () => {
      const fixture = createRolePageFixture('admin');

      expect(typeof fixture).toBe('function');
    });

    it('role fixture throws for unknown role when invoked', async () => {
      const config = ensureConfigLoaded({
        configPath: configFilePath,
        baseDir: tempDir,
      });

      const fixture = createRolePageFixture('nonexistent');
      const mockUse = vi.fn();

      await expect(
        fixture({ browser: {} as unknown as Browser, config }, mockUse)
      ).rejects.toThrow('Role "nonexistent" not found');
    });

    it('fixtures config specifies defaultRole and roleFixtures', () => {
      const config = ensureConfigLoaded({
        configPath: configFilePath,
        baseDir: tempDir,
      });

      expect(config.fixtures.defaultRole).toBe('admin');
      expect(config.fixtures.roleFixtures).toContain('admin');
      expect(config.fixtures.roleFixtures).toContain('editor');
    });
  });

  describe('Data Fixture Integration', () => {
    it('generates unique run ID', () => {
      const runId1 = generateRunId();
      const runId2 = generateRunId();

      expect(runId1).toMatch(/^[a-f0-9]{8}$/);
      expect(runId2).toMatch(/^[a-f0-9]{8}$/);
      expect(runId1).not.toBe(runId2);
    });

    it('creates test data manager with run ID and config', () => {
      const config = ensureConfigLoaded({
        configPath: configFilePath,
        baseDir: tempDir,
      });

      const runId = generateRunId();
      const manager = createTestDataManager(runId, config);

      expect(manager.runId).toBe(runId);
      expect(typeof manager.cleanup).toBe('function');
      expect(typeof manager.cleanupApi).toBe('function');
      expect(typeof manager.runCleanup).toBe('function');
    });

    it('namespaces values with config prefix/suffix', () => {
      const config = ensureConfigLoaded({
        configPath: configFilePath,
        baseDir: tempDir,
      });

      const runId = 'abc12345';
      const result = namespaceValue('Test Entity', runId, config);

      // Config uses [artk-xxx] pattern
      expect(result).toBe('Test Entity [artk-abc12345]');
    });

    it('creates unique names with run ID', () => {
      const runId = 'xyz98765';
      const name = createUniqueName('Order', runId);

      expect(name).toBe('Order-xyz98765');
    });

    it('creates unique emails with run ID', () => {
      const runId = 'test1234';
      const email = createUniqueEmail('user', runId);

      expect(email).toBe('user-test1234@test.example.com');
    });

    it('creates unique emails with custom domain', () => {
      const runId = 'test1234';
      const email = createUniqueEmail('admin', runId, 'custom.example.org');

      expect(email).toBe('admin-test1234@custom.example.org');
    });
  });

  describe('Cleanup Logic Integration', () => {
    it('respects cleanup.enabled config', () => {
      const config = ensureConfigLoaded({
        configPath: configFilePath,
        baseDir: tempDir,
      });

      // Config has cleanup.enabled = true
      expect(shouldRunCleanup(config, true)).toBe(true);
    });

    it('respects cleanup.onFailure config', () => {
      const config = ensureConfigLoaded({
        configPath: configFilePath,
        baseDir: tempDir,
      });

      // Config has cleanup.onFailure = true
      expect(shouldRunCleanup(config, false)).toBe(true);
    });

    it('registers and runs cleanup functions in priority order', async () => {
      const config = ensureConfigLoaded({
        configPath: configFilePath,
        baseDir: tempDir,
      });

      const runId = generateRunId();
      const manager = createTestDataManager(runId, config);

      const executionOrder: number[] = [];

      manager.cleanup(() => Promise.resolve().then(() => { executionOrder.push(1); }), { priority: 10 });
      manager.cleanup(() => Promise.resolve().then(() => { executionOrder.push(2); }), { priority: 5 });
      manager.cleanup(() => Promise.resolve().then(() => { executionOrder.push(3); }), { priority: 20 });

      await manager.runCleanup();

      // Lower priority runs first
      expect(executionOrder).toEqual([2, 1, 3]);
    });

    it('continues cleanup on individual failures', async () => {
      const config = ensureConfigLoaded({
        configPath: configFilePath,
        baseDir: tempDir,
      });

      const runId = generateRunId();
      const manager = createTestDataManager(runId, config);

      const results: string[] = [];

      manager.cleanup(() => Promise.resolve().then(() => { results.push('first'); }), { priority: 1 });
      manager.cleanup(
        () => {
          return Promise.reject(new Error('Cleanup failed'));
        },
        { priority: 2, label: 'Failing cleanup' }
      );
      manager.cleanup(() => Promise.resolve().then(() => { results.push('third'); }), { priority: 3 });

      // Should throw aggregate error but run all cleanups
      await expect(manager.runCleanup()).rejects.toThrow();

      // First and third should have run despite second failing
      expect(results).toContain('first');
      expect(results).toContain('third');
    });

    it('registers API cleanup tasks', () => {
      const config = ensureConfigLoaded({
        configPath: configFilePath,
        baseDir: tempDir,
      });

      const runId = generateRunId();
      const manager = createTestDataManager(runId, config);

      // Should not throw
      expect(() => {
        manager.cleanupApi('DELETE', '/api/entities/123');
        manager.cleanupApi('POST', '/api/cleanup', { ids: [1, 2, 3] });
      }).not.toThrow();
    });
  });

  describe('Fixtures Composition Flow', () => {
    it('complete flow: config -> auth -> data fixtures', async () => {
      // Step 1: Load config (base fixture)
      const config = ensureConfigLoaded({
        configPath: configFilePath,
        baseDir: tempDir,
      });

      expect(config).toBeDefined();

      // Step 2: Get available roles (auth fixture)
      const roles = getAvailableRoles(config);
      expect(roles.length).toBeGreaterThan(0);

      // Step 3: Check storage state paths
      for (const role of roles) {
        const storagePath = getStorageStatePathForRole(config, role, tempDir);
        expect(storagePath).toContain(role);
      }

      // Step 4: Create test data manager (data fixture)
      const runId = generateRunId();
      const manager = createTestDataManager(runId, config);

      // Step 5: Use data utilities with config
      const namespacedValue = namespaceValue('Test Order', runId, config);
      expect(namespacedValue).toContain(runId);

      // Step 6: Register cleanup
      const cleanupExecuted: string[] = [];
      manager.cleanup(() => Promise.resolve().then(() => {
        cleanupExecuted.push('order-cleanup');
      }));

      // Step 7: Run cleanup
      await manager.runCleanup();
      expect(cleanupExecuted).toContain('order-cleanup');
    });

    it('fixtures respect environment-specific config', () => {
      // Load config
      const config = ensureConfigLoaded({
        configPath: configFilePath,
        baseDir: tempDir,
      });

      // Storage state path should include environment
      const adminPath = getStorageStatePathForRole(config, 'admin', tempDir);

      // Config uses {role}-{env}.json pattern with activeEnvironment = local
      expect(adminPath).toContain('admin-local.json');
    });

    it('data namespace uses config settings', () => {
      const config = ensureConfigLoaded({
        configPath: configFilePath,
        baseDir: tempDir,
      });

      const runId = 'unique123';

      // Config uses prefix: "[artk-" and suffix: "]"
      const namespaced = namespaceValue('Product', runId, config);

      expect(namespaced).toBe('Product [artk-unique123]');
    });
  });

  describe('Fixture Type Safety', () => {
    it('TestDataManager interface has required properties', () => {
      const config = ensureConfigLoaded({
        configPath: configFilePath,
        baseDir: tempDir,
      });

      const manager = createTestDataManager('test-id', config);

      // Type checks
      expect(typeof manager.runId).toBe('string');
      expect(typeof manager.cleanup).toBe('function');
      expect(typeof manager.cleanupApi).toBe('function');
      expect(typeof manager.runCleanup).toBe('function');
    });

    it('ARTKConfig has required fixture-related sections', () => {
      const config = ensureConfigLoaded({
        configPath: configFilePath,
        baseDir: tempDir,
      });

      // Type checks
      expect(config.fixtures).toBeDefined();
      expect(config.fixtures.defaultRole).toBeDefined();
      expect(config.fixtures.roleFixtures).toBeDefined();
      expect(config.auth).toBeDefined();
      expect(config.auth.roles).toBeDefined();
      expect(config.data).toBeDefined();
      expect(config.data.namespace).toBeDefined();
      expect(config.data.cleanup).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('handles config with minimal fixtures section', () => {
      // Minimal fixtures config
      const minimalConfig = SAMPLE_CONFIG_YAML.replace(
        `fixtures:
  defaultRole: admin
  roleFixtures:
    - admin
    - editor
  api:
    baseURL: "https://api.example.com"
    extraHTTPHeaders:
      X-Test-Header: "test-value"`,
        `fixtures:
  defaultRole: admin
  roleFixtures: []`
      );
      fs.writeFileSync(configFilePath, minimalConfig, 'utf-8');
      clearConfigCache();

      const config = ensureConfigLoaded({
        configPath: configFilePath,
        baseDir: tempDir,
      });

      expect(config.fixtures.roleFixtures).toEqual([]);
      expect(config.fixtures.defaultRole).toBe('admin');
    });

    it('handles empty cleanup registration', async () => {
      const config = ensureConfigLoaded({
        configPath: configFilePath,
        baseDir: tempDir,
      });

      const manager = createTestDataManager('empty-test', config);

      // Should not throw with no cleanups registered
      await expect(manager.runCleanup()).resolves.not.toThrow();
    });

    it('handles config reload with different environment', () => {
      // First load with default env
      const config1 = ensureConfigLoaded({
        configPath: configFilePath,
        baseDir: tempDir,
      });
      expect(config1.activeEnvironment).toBe('local');

      // The config's activeEnvironment is set from the YAML file's activeEnvironment field
      // Using getStorageStatePathForRole will use the config's activeEnvironment
      const localPath = getStorageStatePathForRole(config1, 'admin', tempDir);
      expect(localPath).toContain('admin-local.json');

      // Clear cache and reload with staging override via ARTK_ENV
      clearConfigCache();
      vi.stubEnv('ARTK_ENV', 'staging');

      const { config: config2, activeEnvironment } = loadConfig({
        configPath: configFilePath,
        baseDir: tempDir,
      });

      // The returned activeEnvironment is 'staging' (from ARTK_ENV override)
      expect(activeEnvironment).toBe('staging');

      // But config.activeEnvironment in the YAML stays as 'local'
      // The environment was OVERRIDDEN at load time, not stored in config
      expect(config2.activeEnvironment).toBe('local');

      // This verifies that environments can be overridden at runtime
      // without modifying the config file
    });
  });
});

// =============================================================================
// API Fixture Integration (if applicable)
// =============================================================================

describe('API Fixtures Integration', () => {
  beforeEach(() => {
    createTempEnvironment();
    clearConfigCache();

    vi.stubEnv('ADMIN_USER', 'admin@example.com');
    vi.stubEnv('ADMIN_PASS', 'admin-password');
    vi.stubEnv('EDITOR_USER', 'editor@example.com');
    vi.stubEnv('EDITOR_PASS', 'editor-password');
    vi.stubEnv('VIEWER_USER', 'viewer@example.com');
    vi.stubEnv('VIEWER_PASS', 'viewer-password');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    cleanupTempEnvironment();
    clearConfigCache();
  });

  it('config provides API settings for data fixtures', () => {
    const config = ensureConfigLoaded({
      configPath: configFilePath,
      baseDir: tempDir,
    });

    // Config has data.api settings
    expect(config.data.api).toBeDefined();
    expect(config.data.api?.baseUrl).toBe('https://api.example.com');
    expect(config.data.api?.useMainAuth).toBe(true);
  });

  it('fixtures config provides API baseURL and headers settings', () => {
    const config = ensureConfigLoaded({
      configPath: configFilePath,
      baseDir: tempDir,
    });

    expect(config.fixtures.api).toBeDefined();
    expect(config.fixtures.api?.baseURL).toBe('https://api.example.com');
    expect(config.fixtures.api?.extraHTTPHeaders).toEqual({ 'X-Test-Header': 'test-value' });
  });
});
