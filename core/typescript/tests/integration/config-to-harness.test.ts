/**
 * Integration Tests: Config-to-Harness (T108)
 *
 * Verifies that the config module properly feeds into the harness module.
 * Tests the end-to-end flow from loading ARTK config to generating
 * Playwright configuration.
 *
 * @module tests/integration/config-to-harness
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

// Import from config module
import {
  clearConfigCache,
  loadConfig,
} from '../../config/loader.js';
// Note: ARTKConfig type is used via config objects, not directly imported for type annotations

// Import from harness module
import {
  createMinimalPlaywrightConfig,
  createPlaywrightConfig,
  getTierSettings,
  getUseOptions,
  mergePlaywrightConfigs,
} from '../../harness/playwright.config.base.js';

import {
  getReporterConfig,
  hasReporter,
} from '../../harness/reporters.js';

import {
  createAuthSetupProjects,
  createBrowserProjects,
} from '../../harness/projects.js';

// =============================================================================
// Test Configuration
// =============================================================================

/**
 * Sample YAML configuration content for integration testing
 */
const SAMPLE_CONFIG_YAML = `
version: 1

app:
  name: "Integration Test App"
  baseUrl: "https://example.com"
  type: spa

environments:
  local:
    baseUrl: "http://localhost:3000"
  staging:
    baseUrl: "https://staging.example.com"
  production:
    baseUrl: "https://example.com"

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
    standardUser:
      credentialsEnv:
        username: USER_USER
        password: USER_PASS
  oidc:
    idpType: keycloak
    loginUrl: "https://example.com/login"
    success:
      url: "https://example.com/dashboard"

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
      - ".spinner"
  form:
    errorSelector: ".field-error-{field}"
    formErrorSelector: ".form-error"

data:
  namespace:
    prefix: "[artk-"
    suffix: "]"
  cleanup:
    enabled: true
    onFailure: true
    parallel: false

fixtures:
  defaultRole: admin
  roleFixtures:
    - admin
    - standardUser

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

reporters:
  html:
    enabled: true
    outputFolder: "playwright-report"
    open: "on-failure"
  json:
    enabled: true
    outputFile: "test-results/results.json"
  junit:
    enabled: false
  artk:
    enabled: true
    outputFile: "test-results/artk-report.json"
    includeJourneyMapping: true

artifacts:
  outputDir: "test-results"
  screenshots:
    mode: "only-on-failure"
    fullPage: false
    maskPii: false
    piiSelectors: []
  video:
    mode: "off"
  trace:
    mode: "retain-on-failure"

browsers:
  enabled:
    - chromium
    - firefox
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
// Test Setup and Helpers
// =============================================================================

let tempDir: string;
let configFilePath: string;

/**
 * Create a temporary test environment with config file
 */
function createTempConfigEnvironment(): void {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'artk-integration-'));
  const artkDir = path.join(tempDir, 'artk');
  fs.mkdirSync(artkDir, { recursive: true });
  configFilePath = path.join(artkDir, 'artk.config.yml');
  fs.writeFileSync(configFilePath, SAMPLE_CONFIG_YAML, 'utf-8');
}

/**
 * Clean up temporary test environment
 */
function cleanupTempEnvironment(): void {
  if (tempDir && fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

// =============================================================================
// Integration Tests: Config Loading to Harness Generation
// =============================================================================

describe('Config-to-Harness Integration (T108)', () => {
  beforeEach(() => {
    clearConfigCache();
    createTempConfigEnvironment();

    // Mock environment variables for credentials
    vi.stubEnv('ADMIN_USER', 'admin@example.com');
    vi.stubEnv('ADMIN_PASS', 'admin-password');
    vi.stubEnv('USER_USER', 'user@example.com');
    vi.stubEnv('USER_PASS', 'user-password');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    cleanupTempEnvironment();
    clearConfigCache();
  });

  describe('End-to-End Config to Playwright Config', () => {
    it('loads config and generates valid Playwright config', () => {
      // Step 1: Load ARTK config
      const { config, activeEnvironment } = loadConfig({
        configPath: configFilePath,
        baseDir: tempDir,
      });

      expect(config).toBeDefined();
      expect(activeEnvironment).toBe('local');

      // Step 2: Generate Playwright config
      const playwrightConfig = createPlaywrightConfig({
        config,
        activeEnvironment,
        projectRoot: tempDir,
      });

      // Step 3: Verify Playwright config structure
      expect(playwrightConfig).toHaveProperty('testDir');
      expect(playwrightConfig).toHaveProperty('outputDir');
      expect(playwrightConfig).toHaveProperty('projects');
      expect(playwrightConfig).toHaveProperty('use');
      expect(playwrightConfig).toHaveProperty('reporter');
    });

    it('propagates environment baseURL to Playwright use options', () => {
      const { config } = loadConfig({
        configPath: configFilePath,
        baseDir: tempDir,
      });

      // Test local environment (default)
      const localUseOptions = getUseOptions(config, 'local');
      expect(localUseOptions.baseURL).toBe('http://localhost:3000');

      // Test staging environment
      const stagingUseOptions = getUseOptions(config, 'staging');
      expect(stagingUseOptions.baseURL).toBe('https://staging.example.com');

      // Test production environment
      const prodUseOptions = getUseOptions(config, 'production');
      expect(prodUseOptions.baseURL).toBe('https://example.com');
    });

    it('applies tier settings to Playwright config', () => {
      const { config } = loadConfig({
        configPath: configFilePath,
        baseDir: tempDir,
      });

      // Smoke tier
      const smokeConfig = createPlaywrightConfig({
        config,
        tier: 'smoke',
        projectRoot: tempDir,
      });
      expect(smokeConfig.retries).toBe(0);
      expect(smokeConfig.workers).toBe(1);
      expect(smokeConfig.timeout).toBe(30000);

      // Release tier
      const releaseConfig = createPlaywrightConfig({
        config,
        tier: 'release',
        projectRoot: tempDir,
      });
      expect(releaseConfig.retries).toBe(1);
      expect(releaseConfig.workers).toBe(2);
      expect(releaseConfig.timeout).toBe(60000);

      // Regression tier (default)
      const regressionConfig = createPlaywrightConfig({
        config,
        tier: 'regression',
        projectRoot: tempDir,
      });
      expect(regressionConfig.retries).toBe(2);
      expect(regressionConfig.workers).toBe(4);
      expect(regressionConfig.timeout).toBe(120000);
    });
  });

  describe('Auth Configuration to Projects', () => {
    it('creates auth setup projects from config roles', () => {
      const { config } = loadConfig({
        configPath: configFilePath,
        baseDir: tempDir,
      });

      const roles = Object.keys(config.auth.roles);
      const storageDir = path.join(tempDir, config.auth.storageState.directory);
      const filePattern = config.auth.storageState.filePattern;

      const authProjects = createAuthSetupProjects(roles, storageDir, filePattern);

      expect(authProjects).toHaveLength(2);
      expect(authProjects.map((p) => p.name)).toContain('auth-setup-admin');
      expect(authProjects.map((p) => p.name)).toContain('auth-setup-standardUser');
    });

    it('creates browser projects with correct role dependencies', () => {
      const { config } = loadConfig({
        configPath: configFilePath,
        baseDir: tempDir,
      });

      const roles = Object.keys(config.auth.roles);
      const browsers = config.browsers.enabled;
      const storageDir = path.join(tempDir, config.auth.storageState.directory);
      const filePattern = config.auth.storageState.filePattern;

      const browserProjects = createBrowserProjects(
        browsers,
        roles,
        storageDir,
        filePattern
      );

      // Check chromium projects
      const chromiumAdmin = browserProjects.find((p) => p.name === 'chromium-admin');
      expect(chromiumAdmin).toBeDefined();
      expect(chromiumAdmin?.dependencies).toContain('auth-setup-admin');

      // Check firefox projects
      const firefoxAdmin = browserProjects.find((p) => p.name === 'firefox-admin');
      expect(firefoxAdmin).toBeDefined();
      expect(firefoxAdmin?.dependencies).toContain('auth-setup-admin');
    });

    it('includes storage state paths in browser projects', () => {
      const { config } = loadConfig({
        configPath: configFilePath,
        baseDir: tempDir,
      });

      const playwrightConfig = createPlaywrightConfig({
        config,
        includeAuthSetup: true,
        projectRoot: tempDir,
      });

      const chromiumAdmin = playwrightConfig.projects.find(
        (p) => p.name === 'chromium-admin'
      );

      expect(chromiumAdmin?.use?.storageState).toContain('.auth-states');
      expect(chromiumAdmin?.use?.storageState).toContain('admin.json');
    });
  });

  describe('Reporter Configuration', () => {
    it('generates reporter config from ARTK config', () => {
      const { config } = loadConfig({
        configPath: configFilePath,
        baseDir: tempDir,
      });

      const reporters = getReporterConfig(config);

      // Verify enabled reporters
      expect(hasReporter(reporters, 'html')).toBe(true);
      expect(hasReporter(reporters, 'json')).toBe(true);

      // JUnit is disabled in config
      expect(hasReporter(reporters, 'junit')).toBe(false);

      // ARTK reporter should be included
      expect(hasReporter(reporters, 'artk-reporter')).toBe(true);
    });

    it('integrates reporters into full Playwright config', () => {
      const { config } = loadConfig({
        configPath: configFilePath,
        baseDir: tempDir,
      });

      const playwrightConfig = createPlaywrightConfig({
        config,
        projectRoot: tempDir,
      });

      expect(playwrightConfig.reporter).toBeDefined();
      expect(Array.isArray(playwrightConfig.reporter)).toBe(true);
      expect(playwrightConfig.reporter.length).toBeGreaterThan(0);
    });
  });

  describe('Viewport and Browser Settings', () => {
    it('applies viewport settings to use options', () => {
      const { config } = loadConfig({
        configPath: configFilePath,
        baseDir: tempDir,
      });

      const useOptions = getUseOptions(config);

      expect(useOptions.viewport).toEqual({
        width: 1280,
        height: 720,
      });
    });

    it('applies headless setting', () => {
      const { config } = loadConfig({
        configPath: configFilePath,
        baseDir: tempDir,
      });

      const useOptions = getUseOptions(config);
      expect(useOptions.headless).toBe(true);
    });

    it('applies test ID attribute setting', () => {
      const { config } = loadConfig({
        configPath: configFilePath,
        baseDir: tempDir,
      });

      const useOptions = getUseOptions(config);
      expect(useOptions.testIdAttribute).toBe('data-testid');
    });
  });

  describe('Artifact Settings', () => {
    it('applies screenshot mode', () => {
      const { config } = loadConfig({
        configPath: configFilePath,
        baseDir: tempDir,
      });

      const useOptions = getUseOptions(config);
      expect(useOptions.screenshot).toBe('only-on-failure');
    });

    it('applies video mode', () => {
      const { config } = loadConfig({
        configPath: configFilePath,
        baseDir: tempDir,
      });

      const useOptions = getUseOptions(config);
      expect(useOptions.video).toBe('off');
    });

    it('applies trace mode', () => {
      const { config } = loadConfig({
        configPath: configFilePath,
        baseDir: tempDir,
      });

      const useOptions = getUseOptions(config);
      expect(useOptions.trace).toBe('retain-on-failure');
    });

    it('uses output directory from config', () => {
      const { config } = loadConfig({
        configPath: configFilePath,
        baseDir: tempDir,
      });

      const playwrightConfig = createPlaywrightConfig({
        config,
        projectRoot: tempDir,
      });

      expect(playwrightConfig.outputDir).toBe('test-results');
    });
  });

  describe('Multi-Browser Support', () => {
    it('creates projects for all enabled browsers', () => {
      const { config } = loadConfig({
        configPath: configFilePath,
        baseDir: tempDir,
      });

      const playwrightConfig = createPlaywrightConfig({
        config,
        includeAuthSetup: false,
        projectRoot: tempDir,
      });

      const projectNames = playwrightConfig.projects.map((p) => p.name);

      // Should have chromium and firefox variants
      expect(projectNames.some((n) => n.includes('chromium'))).toBe(true);
      expect(projectNames.some((n) => n.includes('firefox'))).toBe(true);
    });
  });

  describe('Config Merging', () => {
    it('merges base config with overrides', () => {
      const baseConfig = createMinimalPlaywrightConfig('https://base.com');
      const overrides = {
        retries: 5,
        use: {
          baseURL: 'https://override.com',
          viewport: { width: 1920, height: 1080 },
          headless: false,
          screenshot: 'on' as const,
          video: 'on' as const,
          trace: 'on' as const,
          testIdAttribute: 'data-qa',
        },
      };

      const merged = mergePlaywrightConfigs(baseConfig, overrides);

      expect(merged.retries).toBe(5);
      expect(merged.use?.baseURL).toBe('https://override.com');
      expect(merged.use?.viewport?.width).toBe(1920);
    });

    it('preserves base config projects when overrides do not specify', () => {
      const baseConfig = createMinimalPlaywrightConfig('https://base.com', [
        'chromium',
        'firefox',
      ]);
      const overrides = {
        retries: 3,
      };

      const merged = mergePlaywrightConfigs(baseConfig, overrides);

      expect(merged.projects).toHaveLength(2);
    });
  });

  describe('Environment Variable Integration', () => {
    it('resolves environment variables in config', () => {
      const { config } = loadConfig({
        configPath: configFilePath,
        baseDir: tempDir,
        env: {
          ADMIN_USER: 'resolved@admin.com',
          ADMIN_PASS: 'resolved-password',
          USER_USER: 'resolved@user.com',
          USER_PASS: 'resolved-pass',
        },
      });

      // Verify config loaded with resolved env vars
      expect(config.auth.roles.admin).toBeDefined();
      expect(config.auth.roles.standardUser).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('throws when config file not found', () => {
      expect(() =>
        loadConfig({
          configPath: '/nonexistent/config.yml',
          baseDir: tempDir,
        })
      ).toThrow();
    });

    it('handles missing required sections gracefully', () => {
      // Write invalid config
      const invalidConfig = `
version: 1
app:
  name: "Incomplete App"
`;
      fs.writeFileSync(configFilePath, invalidConfig, 'utf-8');

      expect(() =>
        loadConfig({
          configPath: configFilePath,
          baseDir: tempDir,
        })
      ).toThrow();
    });
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Config-to-Harness Edge Cases', () => {
  beforeEach(() => {
    clearConfigCache();
    createTempConfigEnvironment();

    vi.stubEnv('ADMIN_USER', 'admin@example.com');
    vi.stubEnv('ADMIN_PASS', 'admin-password');
    vi.stubEnv('USER_USER', 'user@example.com');
    vi.stubEnv('USER_PASS', 'user-password');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    cleanupTempEnvironment();
    clearConfigCache();
  });

  it('handles empty role fixtures array', () => {
    const configWithEmptyFixtures = SAMPLE_CONFIG_YAML.replace(
      'roleFixtures:\n    - admin\n    - standardUser',
      'roleFixtures: []'
    );
    fs.writeFileSync(configFilePath, configWithEmptyFixtures, 'utf-8');

    const { config } = loadConfig({
      configPath: configFilePath,
      baseDir: tempDir,
    });

    const playwrightConfig = createPlaywrightConfig({
      config,
      includeAuthSetup: true,
      projectRoot: tempDir,
    });

    // Should still have auth setup projects for defined roles
    expect(playwrightConfig.projects.length).toBeGreaterThan(0);
  });

  it('handles custom tier settings', () => {
    const { config } = loadConfig({
      configPath: configFilePath,
      baseDir: tempDir,
    });

    const smokeSettings = getTierSettings(config, 'smoke');
    const releaseSettings = getTierSettings(config, 'release');
    const regressionSettings = getTierSettings(config, 'regression');

    // Verify each tier has unique settings
    expect(smokeSettings.tag).toBe('@smoke');
    expect(releaseSettings.tag).toBe('@release');
    expect(regressionSettings.tag).toBe('@regression');

    // Verify workers scale up with tier
    expect(smokeSettings.workers).toBeLessThan(releaseSettings.workers);
    expect(releaseSettings.workers).toBeLessThan(regressionSettings.workers);
  });

  it('falls back to app baseUrl when environment has no baseUrl', () => {
    const { config } = loadConfig({
      configPath: configFilePath,
      baseDir: tempDir,
    });

    // Use a non-existent environment to trigger fallback
    const useOptions = getUseOptions(config, 'nonexistent');

    expect(useOptions.baseURL).toBe('https://example.com');
  });
});
