/**
 * Unit tests for configuration loader
 *
 * Tests:
 * - FR-001: Load configuration from artk/artk.config.yml file
 * - FR-002: Validate configuration against defined schema
 * - FR-003: Resolve environment variables
 * - FR-004: Support named environment profiles switchable via ARTK_ENV
 * - FR-005: Provide typed access to all configuration sections
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ZodError, type ZodIssue } from 'zod';

import {
  clearConfigCache,
  DEFAULT_CONFIG_PATH,
  findConfigFile,
  formatZodError,
  getAppConfig,
  getAuthConfig,
  getBaseUrl,
  getConfig,
  getSelectorsConfig,
  getStorageStatePath,
  isConfigLoaded,
  loadConfig,
  loadYamlFile,
} from '../loader.js';
import { ARTKConfigError } from '../../errors/config-error.js';
import { SUPPORTED_CONFIG_VERSION } from '../defaults.js';

// =============================================================================
// Test Setup
// =============================================================================

/**
 * Create a temporary directory for testing
 */
function createTempDir(): string {
  const tempDir = join(tmpdir(), `artk-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(tempDir, { recursive: true });
  return tempDir;
}

/**
 * Create a valid YAML config file in proper YAML format
 */
function writeYamlConfig(dir: string, config: Record<string, unknown>): string {
  const artkDir = join(dir, 'artk');
  mkdirSync(artkDir, { recursive: true });

  const filePath = join(artkDir, 'artk.config.yml');
  const yaml = objectToYaml(config);
  writeFileSync(filePath, yaml, 'utf-8');

  return filePath;
}

/**
 * Convert object to YAML string (simplified)
 */
function objectToYaml(obj: unknown, indent: number = 0): string {
  const spaces = '  '.repeat(indent);

  if (obj === null || obj === undefined) {
    return 'null';
  }

  if (typeof obj === 'string') {
    // Quote strings with special characters
    if (obj.includes(':') || obj.includes('#') || obj.includes('$') || obj.includes('{')) {
      return `"${obj}"`;
    }
    return obj;
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return String(obj);
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) {return '[]';}
    return obj.map(item => `${spaces}- ${objectToYaml(item, indent)}`).join('\n');
  }

  if (typeof obj === 'object') {
    const entries = Object.entries(obj as Record<string, unknown>);
    if (entries.length === 0) {return '{}';}

    return entries.map(([key, value]) => {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        return `${spaces}${key}:\n${objectToYaml(value, indent + 1)}`;
      } else if (Array.isArray(value)) {
        if (value.length === 0) {return `${spaces}${key}: []`;}
        const arrayItems = value.map(item => {
          if (typeof item === 'object' && item !== null) {
            return `${spaces}  -\n${objectToYaml(item, indent + 2).split('\n').map(l => '  ' + l).join('\n')}`;
          }
          return `${spaces}  - ${objectToYaml(item, indent)}`;
        }).join('\n');
        return `${spaces}${key}:\n${arrayItems}`;
      } else {
        return `${spaces}${key}: ${objectToYaml(value, indent)}`;
      }
    }).join('\n');
  }

  return String(obj);
}

// =============================================================================
// Test Fixtures
// =============================================================================

let tempDir: string;

beforeEach(() => {
  clearConfigCache();
  tempDir = createTempDir();
});

afterEach(() => {
  clearConfigCache();
  if (tempDir && existsSync(tempDir)) {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

// =============================================================================
// findConfigFile Tests
// =============================================================================

describe('findConfigFile', () => {
  it('finds config in default location', () => {
    const config = {
      version: SUPPORTED_CONFIG_VERSION,
      app: { name: 'Test', baseUrl: 'https://example.com' },
      auth: {
        provider: 'oidc',
        roles: { admin: { credentialsEnv: { username: 'U', password: 'P' } } },
        oidc: { idpType: 'keycloak', loginUrl: 'https://example.com/login', success: { url: 'https://example.com' } },
      },
      fixtures: { defaultRole: 'admin' },
    };

    writeYamlConfig(tempDir, config);

    const found = findConfigFile(tempDir);
    expect(found).toBe(join(tempDir, DEFAULT_CONFIG_PATH));
  });

  it('returns undefined when config not found', () => {
    const found = findConfigFile(tempDir);
    expect(found).toBeUndefined();
  });

  it('finds yaml extension variant', () => {
    const artkDir = join(tempDir, 'artk');
    mkdirSync(artkDir, { recursive: true });

    const filePath = join(artkDir, 'artk.config.yaml');
    writeFileSync(filePath, 'version: 1', 'utf-8');

    const found = findConfigFile(tempDir);
    expect(found).toBe(filePath);
  });
});

// =============================================================================
// loadYamlFile Tests
// =============================================================================

describe('loadYamlFile', () => {
  it('loads valid YAML file', () => {
    const filePath = join(tempDir, 'test.yml');
    writeFileSync(filePath, 'name: Test\nvalue: 123', 'utf-8');

    const result = loadYamlFile(filePath);
    expect(result).toEqual({ name: 'Test', value: 123 });
  });

  it('throws for non-existent file', () => {
    const filePath = join(tempDir, 'nonexistent.yml');

    expect(() => loadYamlFile(filePath)).toThrow(ARTKConfigError);
    expect(() => loadYamlFile(filePath)).toThrow(/not found/);
  });

  it('throws for invalid YAML', () => {
    const filePath = join(tempDir, 'invalid.yml');
    writeFileSync(filePath, '{ invalid: yaml: content', 'utf-8');

    expect(() => loadYamlFile(filePath)).toThrow(ARTKConfigError);
    expect(() => loadYamlFile(filePath)).toThrow(/parse/i);
  });
});

// =============================================================================
// loadConfig Tests
// =============================================================================

describe('loadConfig', () => {
  it('loads valid configuration', () => {
    const config = {
      version: SUPPORTED_CONFIG_VERSION,
      app: { name: 'Test App', baseUrl: 'https://example.com' },
      auth: {
        provider: 'oidc',
        roles: { admin: { credentialsEnv: { username: 'ADMIN_USER', password: 'ADMIN_PASS' } } },
        oidc: { idpType: 'keycloak', loginUrl: 'https://example.com/login', success: { url: 'https://example.com' } },
      },
      fixtures: { defaultRole: 'admin' },
    };

    const filePath = writeYamlConfig(tempDir, config);

    const result = loadConfig({ baseDir: tempDir, skipCredentialsValidation: true });

    expect(result.config.app.name).toBe('Test App');
    expect(result.config.app.baseUrl).toBe('https://example.com');
    expect(result.configPath).toBe(filePath);
  });

  it('resolves environment variables', () => {
    const config = {
      version: SUPPORTED_CONFIG_VERSION,
      app: { name: 'Test App', baseUrl: '${TEST_BASE_URL}' },
      auth: {
        provider: 'oidc',
        roles: { admin: { credentialsEnv: { username: 'ADMIN_USER', password: 'ADMIN_PASS' } } },
        oidc: { idpType: 'keycloak', loginUrl: '${TEST_BASE_URL}/login', success: { url: '${TEST_BASE_URL}/dashboard' } },
      },
      fixtures: { defaultRole: 'admin' },
    };

    writeYamlConfig(tempDir, config);

    const testEnv = {
      TEST_BASE_URL: 'https://resolved.example.com',
    };

    const result = loadConfig({ baseDir: tempDir, env: testEnv, skipCredentialsValidation: true });

    expect(result.config.app.baseUrl).toBe('https://resolved.example.com');
    expect(result.config.auth.oidc?.loginUrl).toBe('https://resolved.example.com/login');
  });

  it('uses default values for env vars', () => {
    const config = {
      version: SUPPORTED_CONFIG_VERSION,
      app: { name: 'Test App', baseUrl: '${UNDEFINED_VAR:-https://default.example.com}' },
      auth: {
        provider: 'oidc',
        roles: { admin: { credentialsEnv: { username: 'ADMIN_USER', password: 'ADMIN_PASS' } } },
        oidc: { idpType: 'keycloak', loginUrl: 'https://example.com/login', success: { url: 'https://example.com' } },
      },
      fixtures: { defaultRole: 'admin' },
    };

    writeYamlConfig(tempDir, config);

    const result = loadConfig({ baseDir: tempDir, env: {}, skipCredentialsValidation: true });

    expect(result.config.app.baseUrl).toBe('https://default.example.com');
  });

  it('throws for missing required env vars', () => {
    const config = {
      version: SUPPORTED_CONFIG_VERSION,
      app: { name: 'Test App', baseUrl: '${MISSING_VAR}' },
      auth: {
        provider: 'oidc',
        roles: { admin: { credentialsEnv: { username: 'ADMIN_USER', password: 'ADMIN_PASS' } } },
        oidc: { idpType: 'keycloak', loginUrl: 'https://example.com/login', success: { url: 'https://example.com' } },
      },
      fixtures: { defaultRole: 'admin' },
    };

    writeYamlConfig(tempDir, config);

    expect(() => loadConfig({ baseDir: tempDir, env: {}, skipCredentialsValidation: true })).toThrow(ARTKConfigError);
    expect(() => loadConfig({ baseDir: tempDir, env: {}, skipCredentialsValidation: true })).toThrow(/MISSING_VAR/);
  });

  it('validates configuration schema', () => {
    const config = {
      version: 999, // Invalid version
      app: { name: 'Test App', baseUrl: 'https://example.com' },
      auth: {
        provider: 'oidc',
        roles: { admin: { credentialsEnv: { username: 'ADMIN_USER', password: 'ADMIN_PASS' } } },
        oidc: { idpType: 'keycloak', loginUrl: 'https://example.com/login', success: { url: 'https://example.com' } },
      },
      fixtures: { defaultRole: 'admin' },
    };

    writeYamlConfig(tempDir, config);

    expect(() => loadConfig({ baseDir: tempDir, skipCredentialsValidation: true })).toThrow(ARTKConfigError);
    expect(() => loadConfig({ baseDir: tempDir, skipCredentialsValidation: true })).toThrow(/version/i);
  });

  it('caches configuration', () => {
    const config = {
      version: SUPPORTED_CONFIG_VERSION,
      app: { name: 'Test App', baseUrl: 'https://example.com' },
      auth: {
        provider: 'oidc',
        roles: { admin: { credentialsEnv: { username: 'ADMIN_USER', password: 'ADMIN_PASS' } } },
        oidc: { idpType: 'keycloak', loginUrl: 'https://example.com/login', success: { url: 'https://example.com' } },
      },
      fixtures: { defaultRole: 'admin' },
    };

    writeYamlConfig(tempDir, config);

    const result1 = loadConfig({ baseDir: tempDir, skipCredentialsValidation: true });
    const result2 = loadConfig({ baseDir: tempDir, skipCredentialsValidation: true });

    expect(result1.config).toBe(result2.config); // Same reference
  });

  it('forces reload when requested', () => {
    const config = {
      version: SUPPORTED_CONFIG_VERSION,
      app: { name: 'Test App', baseUrl: 'https://example.com' },
      auth: {
        provider: 'oidc',
        roles: { admin: { credentialsEnv: { username: 'ADMIN_USER', password: 'ADMIN_PASS' } } },
        oidc: { idpType: 'keycloak', loginUrl: 'https://example.com/login', success: { url: 'https://example.com' } },
      },
      fixtures: { defaultRole: 'admin' },
    };

    writeYamlConfig(tempDir, config);

    const result1 = loadConfig({ baseDir: tempDir, skipCredentialsValidation: true });
    const result2 = loadConfig({ baseDir: tempDir, forceReload: true, skipCredentialsValidation: true });

    expect(result1.config).not.toBe(result2.config); // Different references
  });

  it('applies defaults', () => {
    const config = {
      version: SUPPORTED_CONFIG_VERSION,
      app: { name: 'Test App', baseUrl: 'https://example.com' },
      auth: {
        provider: 'oidc',
        roles: { admin: { credentialsEnv: { username: 'ADMIN_USER', password: 'ADMIN_PASS' } } },
        oidc: { idpType: 'keycloak', loginUrl: 'https://example.com/login', success: { url: 'https://example.com' } },
      },
      fixtures: { defaultRole: 'admin' },
    };

    writeYamlConfig(tempDir, config);

    const result = loadConfig({ baseDir: tempDir, skipCredentialsValidation: true });

    // Check various defaults are applied
    expect(result.config.selectors.testIdAttribute).toBe('data-testid');
    expect(result.config.browsers.headless).toBe(true);
    expect(result.config.artifacts.screenshots.mode).toBe('only-on-failure');
  });

  it('throws for missing config file', () => {
    expect(() => loadConfig({ baseDir: tempDir, skipCredentialsValidation: true })).toThrow(ARTKConfigError);
    expect(() => loadConfig({ baseDir: tempDir, skipCredentialsValidation: true })).toThrow(/not found/);
  });
});

// =============================================================================
// Environment Profile Tests (FR-004)
// =============================================================================

describe('Environment Profiles', () => {
  const baseConfig = {
    version: SUPPORTED_CONFIG_VERSION,
    app: { name: 'Test App', baseUrl: 'https://example.com' },
    environments: {
      local: { baseUrl: 'http://localhost:3000' },
      staging: { baseUrl: 'https://staging.example.com' },
      production: { baseUrl: 'https://example.com' },
    },
    activeEnvironment: 'local',
    auth: {
      provider: 'oidc',
      roles: { admin: { credentialsEnv: { username: 'ADMIN_USER', password: 'ADMIN_PASS' } } },
      oidc: { idpType: 'keycloak', loginUrl: 'https://example.com/login', success: { url: 'https://example.com' } },
    },
    fixtures: { defaultRole: 'admin' },
  };

  it('returns active environment from config', () => {
    writeYamlConfig(tempDir, baseConfig);

    const result = loadConfig({ baseDir: tempDir, skipCredentialsValidation: true });

    expect(result.activeEnvironment).toBe('local');
    expect(result.environmentConfig?.baseUrl).toBe('http://localhost:3000');
  });

  it('overrides environment with ARTK_ENV', () => {
    writeYamlConfig(tempDir, baseConfig);

    const result = loadConfig({
      baseDir: tempDir,
      env: { ARTK_ENV: 'staging' },
      skipCredentialsValidation: true
    });

    expect(result.activeEnvironment).toBe('staging');
    expect(result.environmentConfig?.baseUrl).toBe('https://staging.example.com');
  });

  it('overrides environment with option', () => {
    writeYamlConfig(tempDir, baseConfig);

    const result = loadConfig({
      baseDir: tempDir,
      activeEnvironment: 'production',
      skipCredentialsValidation: true
    });

    expect(result.activeEnvironment).toBe('production');
    expect(result.environmentConfig?.baseUrl).toBe('https://example.com');
  });

  it('option takes precedence over ARTK_ENV', () => {
    writeYamlConfig(tempDir, baseConfig);

    const result = loadConfig({
      baseDir: tempDir,
      env: { ARTK_ENV: 'staging' },
      activeEnvironment: 'production',
      skipCredentialsValidation: true
    });

    expect(result.activeEnvironment).toBe('production');
  });
});

// =============================================================================
// Config Accessors Tests (FR-005)
// =============================================================================

describe('Configuration Accessors', () => {
  beforeEach(() => {
    const config = {
      version: SUPPORTED_CONFIG_VERSION,
      app: { name: 'Accessor Test', baseUrl: 'https://example.com' },
      environments: {
        staging: { baseUrl: 'https://staging.example.com', apiUrl: 'https://api.staging.example.com' },
      },
      activeEnvironment: 'staging',
      auth: {
        provider: 'oidc',
        storageState: { directory: '.auth-states', maxAgeMinutes: 30, filePattern: '{role}-{env}.json' },
        roles: { admin: { credentialsEnv: { username: 'ADMIN_USER', password: 'ADMIN_PASS' } } },
        oidc: { idpType: 'keycloak', loginUrl: 'https://example.com/login', success: { url: 'https://example.com' } },
      },
      fixtures: { defaultRole: 'admin' },
      selectors: { testIdAttribute: 'data-qa', strategy: ['testid', 'role'] },
    };

    writeYamlConfig(tempDir, config);
    loadConfig({ baseDir: tempDir, skipCredentialsValidation: true });
  });

  it('getConfig returns loaded config', () => {
    const config = getConfig();
    expect(config.app.name).toBe('Accessor Test');
  });

  it('isConfigLoaded returns true after load', () => {
    expect(isConfigLoaded()).toBe(true);
  });

  it('isConfigLoaded returns false before load', () => {
    clearConfigCache();
    expect(isConfigLoaded()).toBe(false);
  });

  it('getConfig throws when not loaded', () => {
    clearConfigCache();
    expect(() => getConfig()).toThrow(ARTKConfigError);
    expect(() => getConfig()).toThrow(/not loaded/);
  });

  it('getAppConfig returns app config', () => {
    const app = getAppConfig();
    expect(app.name).toBe('Accessor Test');
    expect(app.baseUrl).toBe('https://example.com');
  });

  it('getAuthConfig returns auth config', () => {
    const auth = getAuthConfig();
    expect(auth.provider).toBe('oidc');
    expect(auth.roles.admin).toBeDefined();
  });

  it('getSelectorsConfig returns selectors config', () => {
    const selectors = getSelectorsConfig();
    expect(selectors.testIdAttribute).toBe('data-qa');
    expect(selectors.strategy).toEqual(['testid', 'role']);
  });

  it('getBaseUrl returns environment baseUrl when available', () => {
    const baseUrl = getBaseUrl('staging');
    expect(baseUrl).toBe('https://staging.example.com');
  });

  it('getBaseUrl returns app baseUrl as fallback', () => {
    const baseUrl = getBaseUrl('nonexistent');
    expect(baseUrl).toBe('https://example.com');
  });

  it('getStorageStatePath builds correct path', () => {
    const path = getStorageStatePath('admin', 'staging', tempDir);
    expect(path).toContain('.auth-states');
    expect(path).toContain('admin-staging.json');
  });
});

// =============================================================================
// clearConfigCache Tests
// =============================================================================

describe('clearConfigCache', () => {
  it('clears cached configuration', () => {
    const config = {
      version: SUPPORTED_CONFIG_VERSION,
      app: { name: 'Test App', baseUrl: 'https://example.com' },
      auth: {
        provider: 'oidc',
        roles: { admin: { credentialsEnv: { username: 'ADMIN_USER', password: 'ADMIN_PASS' } } },
        oidc: { idpType: 'keycloak', loginUrl: 'https://example.com/login', success: { url: 'https://example.com' } },
      },
      fixtures: { defaultRole: 'admin' },
    };

    writeYamlConfig(tempDir, config);
    loadConfig({ baseDir: tempDir, skipCredentialsValidation: true });

    expect(isConfigLoaded()).toBe(true);

    clearConfigCache();

    expect(isConfigLoaded()).toBe(false);
  });
});

// =============================================================================
// formatZodError Tests
// =============================================================================

describe('formatZodError', () => {
  it('formats single error', () => {
    const issues: ZodIssue[] = [
      { path: ['app', 'name'], message: 'Required', code: 'invalid_type', expected: 'string', received: 'undefined' },
    ];
    const error = new ZodError(issues);

    const formatted = formatZodError(error);
    expect(formatted).toContain('app.name');
    expect(formatted).toContain('Required');
  });

  it('formats multiple errors', () => {
    const issues: ZodIssue[] = [
      { path: ['app', 'name'], message: 'Required', code: 'invalid_type', expected: 'string', received: 'undefined' },
      { path: ['auth', 'provider'], message: 'Invalid enum value', code: 'invalid_enum_value', options: ['oidc', 'form'], received: 'invalid' },
    ];
    const error = new ZodError(issues);

    const formatted = formatZodError(error);
    expect(formatted).toContain('app.name');
    expect(formatted).toContain('auth.provider');
  });

  it('handles empty path', () => {
    const issues: ZodIssue[] = [
      { path: [], message: 'Invalid object', code: 'invalid_type', expected: 'object', received: 'undefined' },
    ];
    const error = new ZodError(issues);

    const formatted = formatZodError(error);
    expect(formatted).toContain('root');
  });
});
