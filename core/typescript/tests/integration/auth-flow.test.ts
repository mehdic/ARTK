/**
 * Integration Tests: Auth Flow (T109)
 *
 * Verifies auth providers integrate with storage state management.
 * Tests the auth flow with mock IdP handlers to simulate authentication.
 *
 * Note: These tests mock Playwright's Page and BrowserContext since
 * real browser execution requires actual Playwright test context.
 *
 * @module tests/integration/auth-flow
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

// Import auth modules
import {
  cleanupExpiredStorageStates,
  clearStorageState,
  getStorageStateMetadata,
  isStorageStateValid,
  listStorageStates,
  loadStorageState,
  saveStorageState,
  type StorageStateOptions,
} from '../../auth/storage-state.js';

import {
  getCredentials,
  getCredentialsFromRoleConfig,
  validateCredentials,
} from '../../auth/credentials.js';
import type { BrowserContext, Page } from '@playwright/test';

// Import IdP handlers
import { isKeycloakLoginPage, keycloakHandler } from '../../auth/oidc/providers/keycloak.js';
import { azureAdHandler, isAzureAdLoginPage } from '../../auth/oidc/providers/azure-ad.js';
import { isOktaLoginPage, oktaHandler } from '../../auth/oidc/providers/okta.js';
import {
  createGenericHandler,
  detectIdpType,
  genericHandler,
} from '../../auth/oidc/providers/generic.js';

import { getIdpHandler, OIDCAuthProvider } from '../../auth/providers/oidc.js';

// Import config for integration testing
import { clearConfigCache, loadConfig } from '../../config/loader.js';
// Note: ARTKConfig type used via config objects returned by loadConfig

// =============================================================================
// Test Configuration
// =============================================================================

const SAMPLE_CONFIG_YAML = `
version: 1

app:
  name: "Auth Integration Test"
  baseUrl: "https://app.example.com"
  type: spa

environments:
  local:
    baseUrl: "http://localhost:3000"

activeEnvironment: local

auth:
  provider: oidc
  storageState:
    directory: ".auth-states"
    maxAgeMinutes: 60
    filePattern: "{role}.json"
  roles:
    admin:
      credentialsEnv:
        username: ADMIN_USER
        password: ADMIN_PASS
      description: "Administrator role"
    editor:
      credentialsEnv:
        username: EDITOR_USER
        password: EDITOR_PASS
    viewer:
      credentialsEnv:
        username: VIEWER_USER
        password: VIEWER_PASS

  oidc:
    idpType: keycloak
    loginUrl: "https://keycloak.example.com/auth/realms/test/protocol/openid-connect/auth"
    success:
      url: "https://app.example.com/dashboard"
    mfa:
      enabled: false

selectors:
  testIdAttribute: "data-testid"
  strategy:
    - role
    - testid

assertions:
  toast:
    containerSelector: ".toast"
    messageSelector: ".toast-message"
    typeAttribute: "data-type"
  loading:
    selectors: [".loading"]
  form:
    errorSelector: ".error"
    formErrorSelector: ".form-error"

data:
  namespace:
    prefix: "[test-"
    suffix: "]"
  cleanup:
    enabled: true
    onFailure: false
    parallel: false

fixtures:
  defaultRole: admin
  roleFixtures:
    - admin
    - editor

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
    mode: "off"
    fullPage: false
    maskPii: false
    piiSelectors: []
  video:
    mode: "off"
  trace:
    mode: "off"

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
// Test Helpers and Mocks
// =============================================================================

let tempDir: string;
let storageDir: string;
let configFilePath: string;

/**
 * Create mock BrowserContext
 */
function createMockBrowserContext(storageData?: object): BrowserContext {
  const mockContext = {
    storageState: vi.fn().mockImplementation(async (options: { path?: string } = {}) => {
      if (options.path) {
        const state = storageData ?? {
          cookies: [
            { name: 'session', value: 'mock-session-token', domain: 'example.com', path: '/' },
          ],
          origins: [
            {
              origin: 'https://example.com',
              localStorage: [{ name: 'auth_token', value: 'mock-auth-token' }],
            },
          ],
        };
        await fs.promises.mkdir(path.dirname(options.path), { recursive: true });
        await fs.promises.writeFile(options.path, JSON.stringify(state), 'utf-8');
        return state;
      }
      return storageData ?? { cookies: [], origins: [] };
    }),
    addCookies: vi.fn(),
    clearCookies: vi.fn(),
    cookies: vi.fn().mockResolvedValue([]),
  } as unknown as BrowserContext;

  return mockContext;
}

/**
 * Create mock Page for IdP detection
 */
interface MockPage {
  url(): string;
}

function createMockPage(url: string): MockPage {
  return { url: () => url };
}

function createTempEnvironment(): void {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'artk-auth-'));
  storageDir = path.join(tempDir, '.auth-states');
  fs.mkdirSync(storageDir, { recursive: true });

  // Create config file
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

let defaultStorageOptions: StorageStateOptions = {
  directory: '.auth-states',
  maxAgeMinutes: 60,
  filePattern: '{role}.json',
  projectRoot: '',
};

// =============================================================================
// Integration Tests: Storage State Flow
// =============================================================================

describe('Auth Flow Integration (T109)', () => {
  beforeEach(() => {
    createTempEnvironment();
    clearConfigCache();
    defaultStorageOptions = { ...defaultStorageOptions, projectRoot: tempDir };

    // Mock environment variables
    vi.stubEnv('ADMIN_USER', 'admin@example.com');
    vi.stubEnv('ADMIN_PASS', 'admin-secret-password');
    vi.stubEnv('EDITOR_USER', 'editor@example.com');
    vi.stubEnv('EDITOR_PASS', 'editor-secret-password');
    vi.stubEnv('VIEWER_USER', 'viewer@example.com');
    vi.stubEnv('VIEWER_PASS', 'viewer-secret-password');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    cleanupTempEnvironment();
    clearConfigCache();
  });

  describe('Storage State Persistence', () => {
    it('saves and loads storage state for a role', async () => {
      const mockContext = createMockBrowserContext();

      // Save storage state
      const savedPath = await saveStorageState(mockContext, 'admin', defaultStorageOptions);

      expect(savedPath).toContain('admin.json');
      expect(fs.existsSync(savedPath)).toBe(true);

      // Load storage state
      const loadedPath = await loadStorageState('admin', defaultStorageOptions);

      expect(loadedPath).toBe(savedPath);
    });

    it('validates storage state age correctly', async () => {
      const mockContext = createMockBrowserContext();
      await saveStorageState(mockContext, 'admin', defaultStorageOptions);

      // Should be valid immediately after save
      const isValid = await isStorageStateValid('admin', defaultStorageOptions);
      expect(isValid).toBe(true);

      // Create expired storage state (touch file with old mtime)
      const statePath = path.join(storageDir, 'expired.json');
      fs.writeFileSync(statePath, JSON.stringify({ cookies: [], origins: [] }));

      // Manually set file mtime to 2 hours ago
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      fs.utimesSync(statePath, twoHoursAgo, twoHoursAgo);

      const isExpiredValid = await isStorageStateValid('expired', {
        ...defaultStorageOptions,
        maxAgeMinutes: 60, // 1 hour max age
      });
      expect(isExpiredValid).toBe(false);
    });

    it('clears storage state for specific role', async () => {
      const mockContext = createMockBrowserContext();

      // Save states for multiple roles
      await saveStorageState(mockContext, 'admin', defaultStorageOptions);
      await saveStorageState(mockContext, 'editor', defaultStorageOptions);

      // Verify both exist
      expect(await isStorageStateValid('admin', defaultStorageOptions)).toBe(true);
      expect(await isStorageStateValid('editor', defaultStorageOptions)).toBe(true);

      // Clear admin only
      const deletedCount = await clearStorageState('admin', defaultStorageOptions);
      expect(deletedCount).toBe(1);

      // Admin should be gone, editor should remain
      expect(await isStorageStateValid('admin', defaultStorageOptions)).toBe(false);
      expect(await isStorageStateValid('editor', defaultStorageOptions)).toBe(true);
    });

    it('clears all storage states when role not specified', async () => {
      const mockContext = createMockBrowserContext();

      // Save states for multiple roles
      await saveStorageState(mockContext, 'admin', defaultStorageOptions);
      await saveStorageState(mockContext, 'editor', defaultStorageOptions);
      await saveStorageState(mockContext, 'viewer', defaultStorageOptions);

      // Clear all
      const deletedCount = await clearStorageState(undefined, defaultStorageOptions);
      expect(deletedCount).toBe(3);

      // All should be gone
      expect(await isStorageStateValid('admin', defaultStorageOptions)).toBe(false);
      expect(await isStorageStateValid('editor', defaultStorageOptions)).toBe(false);
      expect(await isStorageStateValid('viewer', defaultStorageOptions)).toBe(false);
    });
  });

  describe('Storage State Metadata', () => {
    it('returns metadata for existing storage state', async () => {
      const mockContext = createMockBrowserContext();
      await saveStorageState(mockContext, 'admin', defaultStorageOptions);

      const metadata = await getStorageStateMetadata('admin', defaultStorageOptions);

      expect(metadata).toBeDefined();
      expect(metadata?.role).toBe('admin');
      expect(metadata?.isValid).toBe(true);
      expect(metadata?.path).toContain('admin.json');
      expect(metadata?.createdAt).toBeInstanceOf(Date);
    });

    it('returns undefined for non-existent storage state', async () => {
      const metadata = await getStorageStateMetadata('nonexistent', defaultStorageOptions);
      expect(metadata).toBeUndefined();
    });

    it('lists all storage states', async () => {
      const mockContext = createMockBrowserContext();

      await saveStorageState(mockContext, 'admin', defaultStorageOptions);
      await saveStorageState(mockContext, 'editor', defaultStorageOptions);

      const states = await listStorageStates(defaultStorageOptions);

      expect(states).toHaveLength(2);
      expect(states.map((s) => s.role)).toContain('admin');
      expect(states.map((s) => s.role)).toContain('editor');
    });
  });

  describe('Cleanup Expired States', () => {
    it('cleans up states older than 24 hours', async () => {
      // Create storage state
      const statePath = path.join(storageDir, 'old-state.json');
      fs.writeFileSync(statePath, JSON.stringify({ cookies: [], origins: [] }));

      // Set file mtime to 25 hours ago
      const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);
      fs.utimesSync(statePath, twentyFiveHoursAgo, twentyFiveHoursAgo);

      // Also create a fresh state
      const freshPath = path.join(storageDir, 'fresh.json');
      fs.writeFileSync(freshPath, JSON.stringify({ cookies: [], origins: [] }));

      // Run cleanup
      const result = await cleanupExpiredStorageStates(defaultStorageOptions);

      expect(result.deletedCount).toBe(1);
      expect(result.deletedFiles).toContain(statePath);

      // Old state should be gone, fresh should remain
      expect(fs.existsSync(statePath)).toBe(false);
      expect(fs.existsSync(freshPath)).toBe(true);
    });

    it('handles empty directory gracefully', async () => {
      // Clear all files from storage dir
      const files = fs.readdirSync(storageDir);
      for (const file of files) {
        fs.unlinkSync(path.join(storageDir, file));
      }

      const result = await cleanupExpiredStorageStates(defaultStorageOptions);

      expect(result.deletedCount).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });
});

// =============================================================================
// Integration Tests: IdP Handlers
// =============================================================================

describe('IdP Handler Integration', () => {
  describe('Keycloak Handler', () => {
    it('provides correct default selectors', () => {
      const selectors = keycloakHandler.getDefaultSelectors();

      expect(selectors.username).toContain('#username');
      expect(selectors.password).toContain('#password');
      expect(selectors.submit).toContain('#kc-login');
    });

    it('detects Keycloak login page URLs', () => {
      const keycloakPage = createMockPage(
        'https://keycloak.example.com/auth/realms/myrealm/protocol/openid-connect/auth?client_id=app'
      );
      expect(isKeycloakLoginPage(keycloakPage as unknown as Page)).toBe(true);

      const nonKeycloakPage = createMockPage('https://example.com/login');
      expect(isKeycloakLoginPage(nonKeycloakPage as unknown as Page)).toBe(false);
    });

    it('has correct idpType', () => {
      expect(keycloakHandler.idpType).toBe('keycloak');
    });
  });

  describe('Azure AD Handler', () => {
    it('provides correct default selectors including stay signed in', () => {
      const selectors = azureAdHandler.getDefaultSelectors();

      expect(selectors.username).toBeDefined();
      expect(selectors.password).toBeDefined();
      expect(selectors.staySignedInNo).toContain('#idBtn_Back');
    });

    it('detects Azure AD login page URLs', () => {
      const azurePage = createMockPage(
        'https://login.microsoftonline.com/tenant-id/oauth2/v2.0/authorize'
      );
      expect(isAzureAdLoginPage(azurePage as unknown as Page)).toBe(true);

      const nonAzurePage = createMockPage('https://example.com/login');
      expect(isAzureAdLoginPage(nonAzurePage as unknown as Page)).toBe(false);
    });

    it('has correct idpType', () => {
      expect(azureAdHandler.idpType).toBe('azure-ad');
    });
  });

  describe('Okta Handler', () => {
    it('provides correct default selectors', () => {
      const selectors = oktaHandler.getDefaultSelectors();

      expect(selectors.username).toContain('#okta-signin-username');
      expect(selectors.submit).toContain('#okta-signin-submit');
    });

    it('detects Okta login page URLs', () => {
      const oktaPage = createMockPage('https://mycompany.okta.com/app/myapp/login');
      expect(isOktaLoginPage(oktaPage as unknown as Page)).toBe(true);

      const nonOktaPage = createMockPage('https://example.com/login');
      expect(isOktaLoginPage(nonOktaPage as unknown as Page)).toBe(false);
    });

    it('has correct idpType', () => {
      expect(oktaHandler.idpType).toBe('okta');
    });
  });

  describe('Generic Handler', () => {
    it('provides common default selectors', () => {
      const selectors = genericHandler.getDefaultSelectors();

      expect(selectors.username).toContain('input[type="email"]');
      expect(selectors.password).toContain('input[type="password"]');
      expect(selectors.submit).toContain('button[type="submit"]');
    });

    it('creates handler with custom selectors', () => {
      const customHandler = createGenericHandler({
        username: '#custom-user',
        password: '#custom-pass',
        submit: '#custom-btn',
      });

      const selectors = customHandler.getDefaultSelectors();

      expect(selectors.username).toBe('#custom-user');
      expect(selectors.password).toBe('#custom-pass');
      expect(selectors.submit).toBe('#custom-btn');
    });

    it('detects IdP type from page URL', () => {
      const keycloakPage = createMockPage('https://auth.example.com/auth/realms/test');
      expect(detectIdpType(keycloakPage as unknown as Page)).toBe('keycloak');

      const azurePage = createMockPage('https://login.microsoftonline.com/tenant');
      expect(detectIdpType(azurePage as unknown as Page)).toBe('azure-ad');

      const oktaPage = createMockPage('https://company.okta.com/login');
      expect(detectIdpType(oktaPage as unknown as Page)).toBe('okta');

      const genericPage = createMockPage('https://example.com/login');
      expect(detectIdpType(genericPage as unknown as Page)).toBe('generic');
    });
  });

  describe('IdP Handler Resolution', () => {
    it('returns correct handler for each IdP type', () => {
      expect(getIdpHandler('keycloak').idpType).toBe('keycloak');
      expect(getIdpHandler('azure-ad').idpType).toBe('azure-ad');
      expect(getIdpHandler('okta').idpType).toBe('okta');
      expect(getIdpHandler('generic').idpType).toBe('generic');
    });

    it('returns generic handler for unknown type', () => {
      expect(getIdpHandler('unknown').idpType).toBe('generic');
    });
  });
});

// =============================================================================
// Integration Tests: OIDC Auth Provider
// =============================================================================

describe('OIDC Auth Provider Integration', () => {
  it('instantiates with configuration', () => {
    const provider = new OIDCAuthProvider({
      idpType: 'keycloak',
      loginUrl: 'https://keycloak.example.com/login',
      success: { url: '/dashboard' },
    });

    expect(provider.getConfig().idpType).toBe('keycloak');
    expect(provider.getConfig().loginUrl).toBe('https://keycloak.example.com/login');
  });

  it('sets role correctly', () => {
    const provider = new OIDCAuthProvider({
      idpType: 'keycloak',
      loginUrl: 'https://keycloak.example.com/login',
      success: { url: '/dashboard' },
    });

    // Should not throw
    expect(() => provider.setRole('admin')).not.toThrow();
    expect(() => provider.setRole('editor')).not.toThrow();
  });

  it('gets correct IdP handler', () => {
    const keycloakProvider = new OIDCAuthProvider({
      idpType: 'keycloak',
      loginUrl: 'https://keycloak.example.com/login',
      success: { url: '/dashboard' },
    });

    const azureProvider = new OIDCAuthProvider({
      idpType: 'azure-ad',
      loginUrl: 'https://login.microsoftonline.com',
      success: { url: '/dashboard' },
    });

    expect(keycloakProvider.getIdpHandler().idpType).toBe('keycloak');
    expect(azureProvider.getIdpHandler().idpType).toBe('azure-ad');
  });
});

// =============================================================================
// Integration Tests: Credentials with Config
// =============================================================================

describe('Credentials Integration', () => {
  const mockAuthConfig = {
    provider: 'oidc' as const,
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
      },
      editor: {
        credentialsEnv: {
          username: 'EDITOR_USER',
          password: 'EDITOR_PASS',
        },
      },
    },
    oidc: {
      idpType: 'keycloak' as const,
      loginUrl: 'https://auth.example.com/login',
      success: { url: '/dashboard' },
    },
  };

  beforeEach(() => {
    vi.stubEnv('ADMIN_USER', 'admin@example.com');
    vi.stubEnv('ADMIN_PASS', 'admin-secret-password');
    vi.stubEnv('EDITOR_USER', 'editor@example.com');
    vi.stubEnv('EDITOR_PASS', 'editor-secret-password');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('retrieves credentials using role and authConfig', () => {
    const credentials = getCredentials('admin', mockAuthConfig);

    expect(credentials.username).toBe('admin@example.com');
    expect(credentials.password).toBe('admin-secret-password');
  });

  it('retrieves credentials for role from roleConfig directly', () => {
    const roleConfig = {
      credentialsEnv: {
        username: 'EDITOR_USER',
        password: 'EDITOR_PASS',
      },
    };

    const credentials = getCredentialsFromRoleConfig('editor', roleConfig);

    expect(credentials.username).toBe('editor@example.com');
    expect(credentials.password).toBe('editor-secret-password');
  });

  it('validates credentials - returns empty array when all valid', () => {
    const missing = validateCredentials(['admin', 'editor'], mockAuthConfig);
    expect(missing).toEqual([]);
  });

  it('validates credentials - reports missing env vars', () => {
    // Remove EDITOR env vars
    vi.unstubAllEnvs();
    vi.stubEnv('ADMIN_USER', 'admin@example.com');
    vi.stubEnv('ADMIN_PASS', 'admin-secret-password');
    // EDITOR_USER and EDITOR_PASS not set

    const missing = validateCredentials(['admin', 'editor'], mockAuthConfig);

    expect(missing.length).toBe(2); // username and password for editor
    expect(missing.some(m => m.role === 'editor' && m.type === 'username')).toBe(true);
    expect(missing.some(m => m.role === 'editor' && m.type === 'password')).toBe(true);
  });

  it('throws when role not found in config', () => {
    expect(() => getCredentials('nonexistent', mockAuthConfig)).toThrow();
  });

  it('throws when environment variable missing', () => {
    vi.unstubAllEnvs(); // Remove all env vars
    expect(() => getCredentials('admin', mockAuthConfig)).toThrow();
  });
});

// =============================================================================
// Integration Tests: Auth with Config Loading
// =============================================================================

describe('Auth with Config Integration', () => {
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

  it('loads config and uses auth settings for storage state', async () => {
    const { config } = loadConfig({
      configPath: configFilePath,
      baseDir: tempDir,
    });

    // Use config's storage state settings
    const storageOptions: StorageStateOptions = {
      directory: config.auth.storageState.directory,
      maxAgeMinutes: config.auth.storageState.maxAgeMinutes,
      filePattern: config.auth.storageState.filePattern,
      projectRoot: tempDir,
    };

    const mockContext = createMockBrowserContext();
    const savedPath = await saveStorageState(mockContext, 'admin', storageOptions);

    expect(savedPath).toContain(config.auth.storageState.directory);
    expect(savedPath).toContain('admin.json');
  });

  it('creates OIDC provider from config', () => {
    const { config } = loadConfig({
      configPath: configFilePath,
      baseDir: tempDir,
    });

    if (!config.auth.oidc) {
      throw new Error('OIDC config expected');
    }

    const provider = new OIDCAuthProvider(config.auth.oidc);

    expect(provider.getConfig().idpType).toBe(config.auth.oidc.idpType);
    expect(provider.getConfig().loginUrl).toBe(config.auth.oidc.loginUrl);
  });

  it('retrieves credentials for all configured roles', () => {
    const { config } = loadConfig({
      configPath: configFilePath,
      baseDir: tempDir,
    });

    const roles = Object.keys(config.auth.roles);

    for (const roleName of roles) {
      const roleConfig = config.auth.roles[roleName];
      if (!roleConfig) continue;
      const credentials = getCredentialsFromRoleConfig(roleName, roleConfig);

      expect(credentials.username).toBeTruthy();
      expect(credentials.password).toBeTruthy();
    }
  });
});
