/**
 * Tests for Config Loader
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'node:path';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import {
  loadConfig,
  findConfigFile,
  getDefaultConfig,
  resolveConfigPath,
  ConfigLoadError,
} from '../../src/config/loader.js';
import { AutogenConfigSchema } from '../../src/config/schema.js';

describe('Config Loader', () => {
  const testDir = join(process.cwd(), 'test-fixtures', 'config-test');

  beforeEach(() => {
    // Create test directory
    mkdirSync(testDir, { recursive: true });
    mkdirSync(join(testDir, 'artk'), { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
  });

  describe('findConfigFile', () => {
    it('finds artk/autogen.config.yml', () => {
      const configPath = join(testDir, 'artk', 'autogen.config.yml');
      writeFileSync(configPath, 'version: 1');

      const found = findConfigFile(testDir);
      expect(found).toBe(configPath);
    });

    it('finds artk/autogen.config.yaml', () => {
      const configPath = join(testDir, 'artk', 'autogen.config.yaml');
      writeFileSync(configPath, 'version: 1');

      const found = findConfigFile(testDir);
      expect(found).toBe(configPath);
    });

    it('finds .artk/autogen.config.yml', () => {
      mkdirSync(join(testDir, '.artk'), { recursive: true });
      const configPath = join(testDir, '.artk', 'autogen.config.yml');
      writeFileSync(configPath, 'version: 1');

      const found = findConfigFile(testDir);
      expect(found).toBe(configPath);
    });

    it('returns null when no config found', () => {
      const found = findConfigFile(testDir);
      expect(found).toBeNull();
    });

    it('prefers artk/ over .artk/', () => {
      mkdirSync(join(testDir, '.artk'), { recursive: true });
      writeFileSync(join(testDir, 'artk', 'autogen.config.yml'), 'version: 1');
      writeFileSync(join(testDir, '.artk', 'autogen.config.yml'), 'version: 1');

      const found = findConfigFile(testDir);
      expect(found).toBe(join(testDir, 'artk', 'autogen.config.yml'));
    });
  });

  describe('loadConfig', () => {
    it('loads a valid config file', () => {
      const configPath = join(testDir, 'artk', 'autogen.config.yml');
      const configContent = `
version: 1
paths:
  journeys: custom/journeys
  modules: custom/modules
  tests: custom/tests
`;
      writeFileSync(configPath, configContent);

      const config = loadConfig(configPath);

      expect(config.version).toBe(1);
      expect(config.paths.journeys).toBe('custom/journeys');
      expect(config.paths.modules).toBe('custom/modules');
      expect(config.paths.tests).toBe('custom/tests');
    });

    it('applies default values for missing fields', () => {
      const configPath = join(testDir, 'artk', 'autogen.config.yml');
      writeFileSync(configPath, 'version: 1');

      const config = loadConfig(configPath);

      expect(config.paths.journeys).toBe('journeys');
      expect(config.paths.modules).toBe('e2e/modules');
      expect(config.paths.tests).toBe('e2e/tests');
      expect(config.selectorPolicy.priority).toEqual([
        'role',
        'label',
        'placeholder',
        'text',
        'testid',
        'css',
      ]);
    });

    it('throws ConfigLoadError for missing file', () => {
      const badPath = join(testDir, 'nonexistent.yml');

      expect(() => loadConfig(badPath)).toThrow(ConfigLoadError);
      expect(() => loadConfig(badPath)).toThrow('Config file not found');
    });

    it('throws ConfigLoadError for invalid YAML', () => {
      const configPath = join(testDir, 'artk', 'autogen.config.yml');
      writeFileSync(configPath, 'version: 1\n  bad: indentation');

      expect(() => loadConfig(configPath)).toThrow(ConfigLoadError);
      expect(() => loadConfig(configPath)).toThrow('Invalid YAML');
    });

    it('throws ConfigLoadError for invalid config structure', () => {
      const configPath = join(testDir, 'artk', 'autogen.config.yml');
      writeFileSync(configPath, 'version: "invalid"'); // version should be number

      expect(() => loadConfig(configPath)).toThrow(ConfigLoadError);
      expect(() => loadConfig(configPath)).toThrow('Invalid config');
    });

    it('loads full config with all options', () => {
      const configPath = join(testDir, 'artk', 'autogen.config.yml');
      const configContent = `
version: 1
paths:
  journeys: custom/journeys
  modules: e2e/page-objects
  tests: e2e/specs
  templates: artk/templates
  catalog: artk/selectors
selectorPolicy:
  priority:
    - role
    - testid
    - css
  forbiddenPatterns:
    - "//.*"
    - "nth-child"
validation:
  eslintRules:
    no-wait-for-timeout: error
    no-force-option: error
    prefer-web-first-assertions: warn
  customRules: []
heal:
  enabled: true
  maxSuggestions: 3
  skipPatterns:
    - "test-fixtures"
`;
      writeFileSync(configPath, configContent);

      const config = loadConfig(configPath);

      expect(config.selectorPolicy.priority).toEqual(['role', 'testid', 'css']);
      expect(config.selectorPolicy.forbiddenPatterns).toContain('//.*');
      expect(config.validation.eslintRules['no-wait-for-timeout']).toBe('error');
      expect(config.heal.enabled).toBe(true);
      expect(config.heal.maxSuggestions).toBe(3);
    });

    it('returns default config when no file found and no path provided', () => {
      // Mock process.cwd to return test directory
      vi.spyOn(process, 'cwd').mockReturnValue(testDir);

      // Suppress console.warn
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      const config = loadConfig();

      expect(config).toMatchObject(getDefaultConfig());
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('No autogen config file found')
      );
    });
  });

  describe('getDefaultConfig', () => {
    it('returns a valid default config', () => {
      const config = getDefaultConfig();

      expect(config.version).toBe(1);
      expect(config.paths.journeys).toBe('journeys');
      expect(config.paths.modules).toBe('e2e/modules');
      expect(config.paths.tests).toBe('e2e/tests');
      expect(config.paths.templates).toBe('artk/templates');
      expect(config.paths.catalog).toBe('artk/selectors');
    });

    it('has valid selector policy defaults', () => {
      const config = getDefaultConfig();

      expect(config.selectorPolicy.priority).toEqual([
        'role',
        'label',
        'placeholder',
        'text',
        'testid',
        'css',
      ]);
      expect(config.selectorPolicy.forbiddenPatterns).toEqual([]);
    });

    it('has valid validation defaults', () => {
      const config = getDefaultConfig();

      expect(config.validation.eslintRules).toMatchObject({
        'no-wait-for-timeout': 'error',
        'no-force-option': 'error',
        'prefer-web-first-assertions': 'error',
      });
    });

    it('has valid heal defaults', () => {
      const config = getDefaultConfig();

      expect(config.heal.enabled).toBe(true);
      expect(config.heal.maxSuggestions).toBe(5);
      expect(config.heal.skipPatterns).toEqual([]);
    });
  });

  describe('resolveConfigPath', () => {
    it('resolves path relative to project root', () => {
      const config = getDefaultConfig();

      const resolved = resolveConfigPath(config, 'journeys', testDir);

      expect(resolved).toBe(join(testDir, 'journeys'));
    });

    it('resolves all path keys', () => {
      const config = getDefaultConfig();
      const pathKeys: Array<keyof typeof config.paths> = [
        'journeys',
        'modules',
        'tests',
        'templates',
        'catalog',
      ];

      for (const key of pathKeys) {
        const resolved = resolveConfigPath(config, key, testDir);
        expect(resolved).toBe(join(testDir, config.paths[key]));
      }
    });

    it('uses process.cwd when no root provided', () => {
      vi.spyOn(process, 'cwd').mockReturnValue(testDir);
      const config = getDefaultConfig();

      const resolved = resolveConfigPath(config, 'journeys');

      expect(resolved).toBe(join(testDir, 'journeys'));
    });
  });

  describe('AutogenConfigSchema validation', () => {
    it('validates minimal config', () => {
      const result = AutogenConfigSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('rejects invalid version', () => {
      const result = AutogenConfigSchema.safeParse({ version: 2 });
      expect(result.success).toBe(false);
    });

    it('rejects invalid selector priority', () => {
      const result = AutogenConfigSchema.safeParse({
        selectorPolicy: {
          priority: ['invalid-strategy'],
        },
      });
      expect(result.success).toBe(false);
    });

    it('accepts custom eslint rules', () => {
      const result = AutogenConfigSchema.safeParse({
        validation: {
          eslintRules: {
            'custom-rule': 'warn',
          },
        },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.validation.eslintRules['custom-rule']).toBe('warn');
      }
    });
  });
});
