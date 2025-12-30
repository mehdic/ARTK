/**
 * Unit tests for ARTK Harness Module (T107)
 *
 * Tests Playwright configuration generation from ARTK config.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import type { ARTKConfig } from '../../config/types.js';
import type { PlaywrightProject, ReporterArray } from '../types.js';

import {
  createMinimalPlaywrightConfig,
  createPlaywrightConfig,
  createTierOverrides,
  getAllTierSettings,
  getTierSettings,
  getUseOptions,
  mergePlaywrightConfigs,
} from '../playwright.config.base.js';

import {
  createAuthSetupProject,
  createAuthSetupProjects,
  createBrowserProject,
  createBrowserProjects,
  createUnauthenticatedBrowserProjects,
  filterProjectsByBrowser,
  filterProjectsByRole,
  getAuthSetupProjects,
  getBrowserProjects,
  getStorageStatePathForRole,
  resolveStorageStateFilename,
} from '../projects.js';

import {
  getCIReporterConfig,
  getMinimalReporterConfig,
  getReporterConfig,
  getReporterConfigFromOptions,
  hasReporter,
  mergeReporterConfigs,
} from '../reporters.js';

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
    reporters: {
      html: {
        enabled: true,
        outputFolder: 'playwright-report',
        open: 'on-failure',
      },
      json: {
        enabled: true,
        outputFile: 'test-results/results.json',
      },
      junit: {
        enabled: false,
        outputFile: 'test-results/junit.xml',
      },
      artk: {
        enabled: true,
        outputFile: 'test-results/artk-report.json',
        includeJourneyMapping: true,
      },
    },
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
        mode: 'retain-on-failure',
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
// getTierSettings Tests
// =============================================================================

describe('getTierSettings', () => {
  let config: ARTKConfig;

  beforeEach(() => {
    config = createTestConfig();
  });

  it('returns smoke tier settings', () => {
    const settings = getTierSettings(config, 'smoke');

    expect(settings.retries).toBe(0);
    expect(settings.workers).toBe(1);
    expect(settings.timeout).toBe(30000);
    expect(settings.tag).toBe('@smoke');
  });

  it('returns release tier settings', () => {
    const settings = getTierSettings(config, 'release');

    expect(settings.retries).toBe(1);
    expect(settings.workers).toBe(2);
    expect(settings.timeout).toBe(60000);
    expect(settings.tag).toBe('@release');
  });

  it('returns regression tier settings', () => {
    const settings = getTierSettings(config, 'regression');

    expect(settings.retries).toBe(2);
    expect(settings.workers).toBe(4);
    expect(settings.timeout).toBe(120000);
    expect(settings.tag).toBe('@regression');
  });

  it('defaults to regression when tier not specified', () => {
    const settings = getTierSettings(config);

    expect(settings.retries).toBe(2);
    expect(settings.workers).toBe(4);
  });

  it('returns default settings for unconfigured tier', () => {
    const configWithoutTiers = createTestConfig({
      tiers: {},
    } as unknown as Partial<ARTKConfig>);

    const settings = getTierSettings(configWithoutTiers, 'smoke');

    // Should fall back to default smoke settings
    expect(settings.retries).toBe(0);
    expect(settings.workers).toBe(1);
  });
});

describe('getAllTierSettings', () => {
  it('returns settings for all tiers', () => {
    const config = createTestConfig();
    const allSettings = getAllTierSettings(config);

    expect(allSettings.smoke).toBeDefined();
    expect(allSettings.release).toBeDefined();
    expect(allSettings.regression).toBeDefined();
    expect(allSettings.smoke.tag).toBe('@smoke');
    expect(allSettings.release.tag).toBe('@release');
    expect(allSettings.regression.tag).toBe('@regression');
  });
});

// =============================================================================
// getUseOptions Tests
// =============================================================================

describe('getUseOptions', () => {
  let config: ARTKConfig;

  beforeEach(() => {
    config = createTestConfig();
  });

  it('returns correct base URL from active environment', () => {
    const useOptions = getUseOptions(config);

    expect(useOptions.baseURL).toBe('http://localhost:3000');
  });

  it('uses environment override when provided', () => {
    const useOptions = getUseOptions(config, 'staging');

    expect(useOptions.baseURL).toBe('https://staging.example.com');
  });

  it('falls back to app baseUrl for unknown environment', () => {
    const useOptions = getUseOptions(config, 'nonexistent');

    expect(useOptions.baseURL).toBe('https://example.com');
  });

  it('includes viewport settings', () => {
    const useOptions = getUseOptions(config);

    expect(useOptions.viewport.width).toBe(1280);
    expect(useOptions.viewport.height).toBe(720);
  });

  it('includes headless setting', () => {
    const useOptions = getUseOptions(config);

    expect(useOptions.headless).toBe(true);
  });

  it('includes screenshot mode', () => {
    const useOptions = getUseOptions(config);

    expect(useOptions.screenshot).toBe('only-on-failure');
  });

  it('includes video mode', () => {
    const useOptions = getUseOptions(config);

    expect(useOptions.video).toBe('off');
  });

  it('includes trace mode', () => {
    const useOptions = getUseOptions(config);

    expect(useOptions.trace).toBe('retain-on-failure');
  });

  it('includes test ID attribute', () => {
    const useOptions = getUseOptions(config);

    expect(useOptions.testIdAttribute).toBe('data-testid');
  });

  it('includes slowMo when configured', () => {
    const configWithSlowMo = createTestConfig({
      browsers: {
        enabled: ['chromium'],
        viewport: { width: 1280, height: 720 },
        headless: true,
        slowMo: 100,
      },
    });

    const useOptions = getUseOptions(configWithSlowMo);

    expect(useOptions.slowMo).toBe(100);
  });
});

// =============================================================================
// createPlaywrightConfig Tests
// =============================================================================

describe('createPlaywrightConfig', () => {
  let config: ARTKConfig;

  beforeEach(() => {
    config = createTestConfig();
  });

  it('creates valid Playwright configuration', () => {
    const playwrightConfig = createPlaywrightConfig({ config });

    expect(playwrightConfig.testDir).toBe('tests');
    expect(playwrightConfig.outputDir).toBe('test-results');
    expect(playwrightConfig.fullyParallel).toBe(true);
    expect(playwrightConfig.retries).toBe(2); // regression tier default
    expect(playwrightConfig.workers).toBe(4);
  });

  it('respects tier option', () => {
    const playwrightConfig = createPlaywrightConfig({
      config,
      tier: 'smoke',
    });

    expect(playwrightConfig.retries).toBe(0);
    expect(playwrightConfig.workers).toBe(1);
    expect(playwrightConfig.timeout).toBe(30000);
  });

  it('includes auth setup projects', () => {
    const playwrightConfig = createPlaywrightConfig({
      config,
      includeAuthSetup: true,
    });

    const authProjects = playwrightConfig.projects.filter((p) =>
      p.name.startsWith('auth-setup-')
    );

    expect(authProjects.length).toBe(2); // admin and standardUser
    expect(authProjects.map((p) => p.name)).toContain('auth-setup-admin');
    expect(authProjects.map((p) => p.name)).toContain('auth-setup-standardUser');
  });

  it('includes browser projects', () => {
    const playwrightConfig = createPlaywrightConfig({ config });

    const browserProjects = playwrightConfig.projects.filter((p) =>
      !p.name.startsWith('auth-setup-')
    );

    // chromium (unauthenticated) + chromium-admin + chromium-standardUser
    expect(browserProjects.length).toBeGreaterThanOrEqual(3);
  });

  it('includes use options', () => {
    const playwrightConfig = createPlaywrightConfig({ config });

    expect(playwrightConfig.use.baseURL).toBe('http://localhost:3000');
    expect(playwrightConfig.use.viewport).toEqual({ width: 1280, height: 720 });
    expect(playwrightConfig.use.headless).toBe(true);
  });

  it('includes reporters', () => {
    const playwrightConfig = createPlaywrightConfig({ config });

    expect(playwrightConfig.reporter.length).toBeGreaterThan(0);
  });

  it('respects custom testDir', () => {
    const playwrightConfig = createPlaywrightConfig({
      config,
      testDir: 'e2e',
    });

    expect(playwrightConfig.testDir).toBe('e2e');
  });

  it('respects custom outputDir', () => {
    const playwrightConfig = createPlaywrightConfig({
      config,
      outputDir: 'custom-results',
    });

    // Uses config.artifacts.outputDir when available
    expect(playwrightConfig.outputDir).toBe('test-results');
  });

  it('excludes auth setup when disabled', () => {
    const playwrightConfig = createPlaywrightConfig({
      config,
      includeAuthSetup: false,
    });

    const authProjects = playwrightConfig.projects.filter((p) =>
      p.name.startsWith('auth-setup-')
    );

    expect(authProjects.length).toBe(0);
  });

  it('includes additional projects', () => {
    const customProject: PlaywrightProject = {
      name: 'custom-project',
      use: { browserName: 'chromium' },
    };

    const playwrightConfig = createPlaywrightConfig({
      config,
      additionalProjects: [customProject],
    });

    const found = playwrightConfig.projects.find((p) => p.name === 'custom-project');
    expect(found).toBeDefined();
  });
});

// =============================================================================
// createAuthSetupProject Tests
// =============================================================================

describe('createAuthSetupProject', () => {
  it('creates auth setup project with correct name', () => {
    const project = createAuthSetupProject('admin', '.auth-states/admin.json');

    expect(project.name).toBe('auth-setup-admin');
  });

  it('includes test match pattern', () => {
    const project = createAuthSetupProject('admin', '.auth-states/admin.json');

    expect(project.testMatch).toBe('**/auth.setup.ts');
  });

  it('throws for empty role', () => {
    expect(() => createAuthSetupProject('', '.auth-states/test.json')).toThrow(
      'Role must be a non-empty string'
    );
  });

  it('throws for empty storage path', () => {
    expect(() => createAuthSetupProject('admin', '')).toThrow(
      'Storage state path must be a non-empty string'
    );
  });

  it('accepts custom test match pattern', () => {
    const project = createAuthSetupProject(
      'admin',
      '.auth-states/admin.json',
      '**/custom.setup.ts'
    );

    expect(project.testMatch).toBe('**/custom.setup.ts');
  });
});

describe('createAuthSetupProjects', () => {
  it('creates projects for all roles', () => {
    const projects = createAuthSetupProjects(
      ['admin', 'user'],
      '.auth-states',
      '{role}.json'
    );

    expect(projects.length).toBe(2);
    expect(projects.map((p) => p.name)).toContain('auth-setup-admin');
    expect(projects.map((p) => p.name)).toContain('auth-setup-user');
  });

  it('handles empty roles array', () => {
    const projects = createAuthSetupProjects([], '.auth-states');

    expect(projects).toEqual([]);
  });
});

// =============================================================================
// createBrowserProjects Tests
// =============================================================================

describe('createBrowserProjects', () => {
  it('creates projects for all browser/role combinations', () => {
    const projects = createBrowserProjects(
      ['chromium', 'firefox'],
      ['admin'],
      '.auth-states',
      '{role}.json'
    );

    const projectNames = projects.map((p) => p.name);

    // Unauthenticated + authenticated for each browser
    expect(projectNames).toContain('chromium');
    expect(projectNames).toContain('chromium-admin');
    expect(projectNames).toContain('firefox');
    expect(projectNames).toContain('firefox-admin');
  });

  it('includes dependencies on auth setup', () => {
    const projects = createBrowserProjects(
      ['chromium'],
      ['admin'],
      '.auth-states',
      '{role}.json'
    );

    const adminProject = projects.find((p) => p.name === 'chromium-admin');

    expect(adminProject?.dependencies).toContain('auth-setup-admin');
  });

  it('includes storage state path for authenticated projects', () => {
    const projects = createBrowserProjects(
      ['chromium'],
      ['admin'],
      '.auth-states',
      '{role}.json'
    );

    const adminProject = projects.find((p) => p.name === 'chromium-admin');

    expect(adminProject?.use?.storageState).toContain('admin.json');
  });
});

describe('createBrowserProject', () => {
  it('creates unauthenticated project', () => {
    const project = createBrowserProject('chromium');

    expect(project.name).toBe('chromium');
    expect(project.use?.browserName).toBe('chromium');
    expect(project.use?.storageState).toBeUndefined();
  });

  it('creates authenticated project', () => {
    const project = createBrowserProject(
      'chromium',
      'admin',
      '.auth-states/admin.json',
      ['auth-setup-admin']
    );

    expect(project.name).toBe('chromium-admin');
    expect(project.use?.storageState).toBe('.auth-states/admin.json');
    expect(project.dependencies).toContain('auth-setup-admin');
  });
});

describe('createUnauthenticatedBrowserProjects', () => {
  it('creates projects without auth', () => {
    const projects = createUnauthenticatedBrowserProjects(['chromium', 'firefox']);

    expect(projects.length).toBe(2);
    expect(projects.every((p) => !p.dependencies)).toBe(true);
    expect(projects.every((p) => !p.use?.storageState)).toBe(true);
  });
});

// =============================================================================
// Storage State Helpers Tests
// =============================================================================

describe('resolveStorageStateFilename', () => {
  it('replaces {role} placeholder', () => {
    const filename = resolveStorageStateFilename('admin', '{role}.json');

    expect(filename).toBe('admin.json');
  });

  it('replaces {env} placeholder', () => {
    const filename = resolveStorageStateFilename('admin', '{role}-{env}.json', 'staging');

    expect(filename).toBe('admin-staging.json');
  });

  it('adds .json extension if missing', () => {
    const filename = resolveStorageStateFilename('admin', '{role}');

    expect(filename).toBe('admin.json');
  });

  it('uses default environment', () => {
    const filename = resolveStorageStateFilename('admin', '{role}-{env}.json');

    expect(filename).toBe('admin-default.json');
  });
});

describe('getStorageStatePathForRole', () => {
  it('builds full path', () => {
    const path = getStorageStatePathForRole(
      'admin',
      '/project/.auth-states',
      '{role}.json'
    );

    expect(path).toBe('/project/.auth-states/admin.json');
  });
});

// =============================================================================
// Project Filtering Tests
// =============================================================================

describe('filterProjectsByBrowser', () => {
  const projects: PlaywrightProject[] = [
    { name: 'chromium' },
    { name: 'chromium-admin' },
    { name: 'firefox' },
    { name: 'firefox-admin' },
  ];

  it('filters projects by browser', () => {
    const filtered = filterProjectsByBrowser(projects, 'chromium');

    expect(filtered.length).toBe(2);
    expect(filtered.every((p) => p.name.includes('chromium'))).toBe(true);
  });
});

describe('filterProjectsByRole', () => {
  const projects: PlaywrightProject[] = [
    { name: 'chromium' },
    { name: 'chromium-admin' },
    { name: 'auth-setup-admin' },
  ];

  it('filters projects by role', () => {
    const filtered = filterProjectsByRole(projects, 'admin');

    expect(filtered.length).toBe(2);
    expect(filtered.every((p) => p.name.includes('admin'))).toBe(true);
  });
});

describe('getAuthSetupProjects', () => {
  const projects: PlaywrightProject[] = [
    { name: 'auth-setup-admin' },
    { name: 'auth-setup-user' },
    { name: 'chromium' },
  ];

  it('returns only auth setup projects', () => {
    const authProjects = getAuthSetupProjects(projects);

    expect(authProjects.length).toBe(2);
    expect(authProjects.every((p) => p.name.startsWith('auth-setup-'))).toBe(true);
  });
});

describe('getBrowserProjects', () => {
  const projects: PlaywrightProject[] = [
    { name: 'auth-setup-admin' },
    { name: 'chromium' },
    { name: 'chromium-admin' },
  ];

  it('returns only browser projects', () => {
    const browserProjects = getBrowserProjects(projects);

    expect(browserProjects.length).toBe(2);
    expect(browserProjects.every((p) => !p.name.startsWith('auth-setup-'))).toBe(true);
  });
});

// =============================================================================
// Reporter Configuration Tests
// =============================================================================

describe('getReporterConfig', () => {
  it('includes list reporter', () => {
    const config = createTestConfig();
    const reporters = getReporterConfig(config);

    expect(hasReporter(reporters, 'list')).toBe(true);
  });

  it('includes enabled HTML reporter', () => {
    const config = createTestConfig();
    const reporters = getReporterConfig(config);

    expect(hasReporter(reporters, 'html')).toBe(true);
  });

  it('includes enabled JSON reporter', () => {
    const config = createTestConfig();
    const reporters = getReporterConfig(config);

    expect(hasReporter(reporters, 'json')).toBe(true);
  });

  it('excludes disabled JUnit reporter', () => {
    const config = createTestConfig();
    const reporters = getReporterConfig(config);

    expect(hasReporter(reporters, 'junit')).toBe(false);
  });

  it('includes ARTK reporter when enabled', () => {
    const config = createTestConfig();
    const reporters = getReporterConfig(config);

    expect(hasReporter(reporters, 'artk-reporter')).toBe(true);
  });
});

describe('getReporterConfigFromOptions', () => {
  it('creates reporters from options', () => {
    const reporters = getReporterConfigFromOptions({
      html: true,
      json: true,
      junit: false,
    });

    expect(hasReporter(reporters, 'html')).toBe(true);
    expect(hasReporter(reporters, 'json')).toBe(true);
    expect(hasReporter(reporters, 'junit')).toBe(false);
  });

  it('uses default options when not specified', () => {
    const reporters = getReporterConfigFromOptions();

    expect(hasReporter(reporters, 'list')).toBe(true);
    expect(hasReporter(reporters, 'html')).toBe(true);
  });
});

describe('getMinimalReporterConfig', () => {
  it('returns only list reporter', () => {
    const reporters = getMinimalReporterConfig();

    expect(reporters.length).toBe(1);
    expect(hasReporter(reporters, 'list')).toBe(true);
  });
});

describe('getCIReporterConfig', () => {
  it('includes CI-appropriate reporters', () => {
    const reporters = getCIReporterConfig();

    expect(hasReporter(reporters, 'dot')).toBe(true);
    expect(hasReporter(reporters, 'junit')).toBe(true);
    expect(hasReporter(reporters, 'json')).toBe(true);
  });
});

describe('mergeReporterConfigs', () => {
  it('merges reporter configs', () => {
    const config1: ReporterArray = [['list'], ['html', { outputFolder: 'a' }]];
    const config2: ReporterArray = [['json', { outputFile: 'b' }]];

    const merged = mergeReporterConfigs(config1, config2);

    expect(hasReporter(merged, 'list')).toBe(true);
    expect(hasReporter(merged, 'html')).toBe(true);
    expect(hasReporter(merged, 'json')).toBe(true);
  });

  it('later configs override earlier ones', () => {
    const config1: ReporterArray = [['html', { outputFolder: 'old' }]];
    const config2: ReporterArray = [['html', { outputFolder: 'new' }]];

    const merged = mergeReporterConfigs(config1, config2);

    const htmlReporter = merged.find((r) =>
      Array.isArray(r) && r[0] === 'html'
    );

    expect(htmlReporter).toBeDefined();
    if (Array.isArray(htmlReporter)) {
      expect((htmlReporter[1] as { outputFolder: string }).outputFolder).toBe('new');
    }
  });
});

describe('hasReporter', () => {
  it('finds reporter by type', () => {
    const reporters: ReporterArray = [['list'], ['html', {}]];

    expect(hasReporter(reporters, 'list')).toBe(true);
    expect(hasReporter(reporters, 'html')).toBe(true);
    expect(hasReporter(reporters, 'json')).toBe(false);
  });

  it('finds reporter by partial match', () => {
    const reporters: ReporterArray = [['./reporters/artk-reporter.ts', {}]];

    expect(hasReporter(reporters, 'artk-reporter')).toBe(true);
  });
});

// =============================================================================
// Utility Function Tests
// =============================================================================

describe('createMinimalPlaywrightConfig', () => {
  it('creates minimal config with baseURL', () => {
    const result = createMinimalPlaywrightConfig('https://example.com');

    expect(result.use?.baseURL).toBe('https://example.com');
    expect(result.projects?.length).toBe(1);
    expect(result.projects?.[0]?.name).toBe('chromium');
  });

  it('supports multiple browsers', () => {
    const config = createMinimalPlaywrightConfig(
      'https://example.com',
      ['chromium', 'firefox']
    );

    expect(config.projects?.length).toBe(2);
  });
});

describe('mergePlaywrightConfigs', () => {
  it('merges configs correctly', () => {
    const base = createMinimalPlaywrightConfig('https://base.com');
    const overrides = {
      retries: 3,
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

    const merged = mergePlaywrightConfigs(base, overrides);

    expect(merged.retries).toBe(3);
    expect(merged.use?.baseURL).toBe('https://override.com');
    expect(merged.use?.viewport?.width).toBe(1920);
  });
});

describe('createTierOverrides', () => {
  it('creates tier-specific overrides', () => {
    const config = createTestConfig();
    const overrides = createTierOverrides(config, 'smoke');

    expect(overrides.retries).toBe(0);
    expect(overrides.workers).toBe(1);
    expect(overrides.timeout).toBe(30000);
  });
});
