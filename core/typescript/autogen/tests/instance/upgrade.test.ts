import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { stringify as stringifyYaml, parse as parseYaml } from 'yaml';
import { upgradeAutogenInstance, needsMigration, isVersionSupported } from '../../src/instance/upgrade.js';

const TEST_DIR = join(process.cwd(), 'test-fixtures/upgrade-test');

describe('upgradeAutogenInstance', () => {
  beforeEach(() => {
    // Clean up test directory before each test
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    // Clean up after tests
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it('should detect current version from config', async () => {
    // Create a config with version 0
    const configPath = join(TEST_DIR, 'autogen.config.yml');
    const config = {
      version: 0,
      project: 'test-app',
    };
    writeFileSync(configPath, stringifyYaml(config));

    const result = await upgradeAutogenInstance({
      rootDir: TEST_DIR,
    });

    expect(result.success).toBe(true);
    expect(result.fromVersion).toBe(0);
    expect(result.toVersion).toBe(1); // CURRENT_CONFIG_VERSION
  });

  it('should skip upgrade if already at target version', async () => {
    // Create a config already at current version
    const configPath = join(TEST_DIR, 'autogen.config.yml');
    const config = {
      version: 1, // CURRENT_CONFIG_VERSION
      project: 'test-app',
    };
    writeFileSync(configPath, stringifyYaml(config));

    const result = await upgradeAutogenInstance({
      rootDir: TEST_DIR,
    });

    expect(result.success).toBe(true);
    expect(result.fromVersion).toBe(1);
    expect(result.toVersion).toBe(1);
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0].description).toContain('no upgrade needed');
  });

  it('should create backup before upgrade', async () => {
    const configPath = join(TEST_DIR, 'autogen.config.yml');
    const config = {
      version: 0,
      project: 'test-app',
    };
    writeFileSync(configPath, stringifyYaml(config));

    const result = await upgradeAutogenInstance({
      rootDir: TEST_DIR,
      backup: true,
    });

    expect(result.success).toBe(true);
    expect(result.backupPath).toBeDefined();
    expect(existsSync(result.backupPath!)).toBe(true);

    const backupContent = readFileSync(result.backupPath!, 'utf-8');
    const backupConfig = parseYaml(backupContent);
    expect(backupConfig.version).toBe(0);
  });

  it('should not create backup when backup is false', async () => {
    const configPath = join(TEST_DIR, 'autogen.config.yml');
    const config = {
      version: 0,
      project: 'test-app',
    };
    writeFileSync(configPath, stringifyYaml(config));

    const result = await upgradeAutogenInstance({
      rootDir: TEST_DIR,
      backup: false,
    });

    expect(result.success).toBe(true);
    expect(result.backupPath).toBeUndefined();
  });

  it('should update config version', async () => {
    const configPath = join(TEST_DIR, 'autogen.config.yml');
    const config = {
      version: 0,
      project: 'test-app',
    };
    writeFileSync(configPath, stringifyYaml(config));

    const result = await upgradeAutogenInstance({
      rootDir: TEST_DIR,
    });

    expect(result.success).toBe(true);

    // Read updated config
    const updatedContent = readFileSync(configPath, 'utf-8');
    const updatedConfig = parseYaml(updatedContent);

    expect(updatedConfig.version).toBe(1); // CURRENT_CONFIG_VERSION
  });

  it('should preserve existing config fields during upgrade', async () => {
    const configPath = join(TEST_DIR, 'autogen.config.yml');
    const config = {
      version: 0,
      project: 'test-app',
      baseUrl: 'https://example.com',
      customField: 'custom value',
    };
    writeFileSync(configPath, stringifyYaml(config));

    const result = await upgradeAutogenInstance({
      rootDir: TEST_DIR,
    });

    expect(result.success).toBe(true);

    // Read updated config
    const updatedContent = readFileSync(configPath, 'utf-8');
    const updatedConfig = parseYaml(updatedContent) as Record<string, unknown>;

    expect(updatedConfig.version).toBe(1);
    expect(updatedConfig.project).toBe('test-app');
    expect(updatedConfig.baseUrl).toBe('https://example.com');
    expect(updatedConfig.customField).toBe('custom value');
  });

  it('should support dry run mode', async () => {
    const configPath = join(TEST_DIR, 'autogen.config.yml');
    const config = {
      version: 0,
      project: 'test-app',
    };
    const originalContent = stringifyYaml(config);
    writeFileSync(configPath, originalContent);

    const result = await upgradeAutogenInstance({
      rootDir: TEST_DIR,
      dryRun: true,
    });

    expect(result.success).toBe(true);
    expect(result.changes.length).toBeGreaterThan(0);

    // Config should not be modified
    const currentContent = readFileSync(configPath, 'utf-8');
    expect(currentContent).toBe(originalContent);
  });

  it('should fail when no config exists', async () => {
    const result = await upgradeAutogenInstance({
      rootDir: TEST_DIR,
    });

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('No autogen.config.yml found');
  });

  it('should include change descriptions', async () => {
    const configPath = join(TEST_DIR, 'autogen.config.yml');
    const config = {
      version: 0,
      project: 'test-app',
    };
    writeFileSync(configPath, stringifyYaml(config));

    const result = await upgradeAutogenInstance({
      rootDir: TEST_DIR,
    });

    expect(result.success).toBe(true);
    expect(result.changes.length).toBeGreaterThan(0);

    const upgradeChange = result.changes.find(c =>
      c.description.includes('Upgraded config')
    );
    expect(upgradeChange).toBeDefined();
  });

  it('should handle missing version field (legacy config)', async () => {
    const configPath = join(TEST_DIR, 'autogen.config.yml');
    const config = {
      project: 'test-app',
      // No version field
    };
    writeFileSync(configPath, stringifyYaml(config));

    const result = await upgradeAutogenInstance({
      rootDir: TEST_DIR,
    });

    expect(result.success).toBe(true);
    expect(result.fromVersion).toBe(0); // Should default to 0
    expect(result.toVersion).toBe(1);
  });
});

describe('needsMigration', () => {
  it('should return true for version 0', () => {
    const config = { version: 0 };
    expect(needsMigration(config)).toBe(true);
  });

  it('should return false for current version', () => {
    const config = { version: 1 }; // CURRENT_CONFIG_VERSION
    expect(needsMigration(config)).toBe(false);
  });

  it('should return true for missing version', () => {
    const config = {};
    expect(needsMigration(config)).toBe(true);
  });
});

describe('isVersionSupported', () => {
  it('should return true for version 1', () => {
    expect(isVersionSupported(1)).toBe(true);
  });

  it('should return false for version 0', () => {
    expect(isVersionSupported(0)).toBe(false);
  });

  it('should return false for future versions', () => {
    expect(isVersionSupported(999)).toBe(false);
  });

  it('should return false for negative versions', () => {
    expect(isVersionSupported(-1)).toBe(false);
  });
});
