import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { installAutogenInstance } from '../../src/instance/install.js';

const TEST_DIR = join(process.cwd(), 'test-fixtures/install-test');

describe('installAutogenInstance', () => {
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

  it('should create all required directories', async () => {
    const result = await installAutogenInstance({
      rootDir: TEST_DIR,
    });

    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);

    // Check directories were created
    expect(existsSync(join(TEST_DIR, 'journeys'))).toBe(true);
    expect(existsSync(join(TEST_DIR, 'tests/journeys'))).toBe(true);
    expect(existsSync(join(TEST_DIR, 'tests/modules'))).toBe(true);
    expect(existsSync(join(TEST_DIR, '.artk'))).toBe(true);

    expect(result.created).toContain('journeys');
    expect(result.created).toContain('tests/journeys');
    expect(result.created).toContain('tests/modules');
    expect(result.created).toContain('.artk');
  });

  it('should create config file with default values', async () => {
    const result = await installAutogenInstance({
      rootDir: TEST_DIR,
    });

    expect(result.success).toBe(true);

    const configPath = join(TEST_DIR, 'autogen.config.yml');
    expect(existsSync(configPath)).toBe(true);

    const configContent = readFileSync(configPath, 'utf-8');
    const config = parseYaml(configContent);

    expect(config.version).toBe(1);
    expect(config.project).toBe('my-project');
    expect(config.baseUrl).toBe('http://localhost:3000');
    expect(config.testIdAttribute).toBe('data-testid');
    expect(config.paths).toBeDefined();
    expect(config.healing).toBeDefined();
    expect(config.validation).toBeDefined();

    expect(result.created).toContain('autogen.config.yml');
  });

  it('should create config with custom values', async () => {
    const result = await installAutogenInstance({
      rootDir: TEST_DIR,
      projectName: 'test-app',
      baseUrl: 'https://test.example.com',
      testIdAttribute: 'test-id',
    });

    expect(result.success).toBe(true);

    const configPath = join(TEST_DIR, 'autogen.config.yml');
    const configContent = readFileSync(configPath, 'utf-8');
    const config = parseYaml(configContent);

    expect(config.project).toBe('test-app');
    expect(config.baseUrl).toBe('https://test.example.com');
    expect(config.testIdAttribute).toBe('test-id');
  });

  it('should create .artk/.gitignore', async () => {
    const result = await installAutogenInstance({
      rootDir: TEST_DIR,
    });

    expect(result.success).toBe(true);

    const gitignorePath = join(TEST_DIR, '.artk/.gitignore');
    expect(existsSync(gitignorePath)).toBe(true);

    const content = readFileSync(gitignorePath, 'utf-8');
    expect(content).toContain('heal-logs/');
    expect(content).toContain('*.heal.json');
    expect(content).toContain('selector-catalog.local.json');

    expect(result.created).toContain('.artk/.gitignore');
  });

  it('should create glossary.yml', async () => {
    const result = await installAutogenInstance({
      rootDir: TEST_DIR,
    });

    expect(result.success).toBe(true);

    const glossaryPath = join(TEST_DIR, '.artk/glossary.yml');
    expect(existsSync(glossaryPath)).toBe(true);

    const content = readFileSync(glossaryPath, 'utf-8');
    const glossary = parseYaml(content);

    expect(glossary.terms).toEqual([]);
    expect(glossary.aliases).toEqual({});

    expect(result.created).toContain('.artk/glossary.yml');
  });

  it('should create example Journey by default', async () => {
    const result = await installAutogenInstance({
      rootDir: TEST_DIR,
    });

    expect(result.success).toBe(true);

    const examplePath = join(TEST_DIR, 'journeys/EXAMPLE-001.md');
    expect(existsSync(examplePath)).toBe(true);

    const content = readFileSync(examplePath, 'utf-8');
    expect(content).toContain('id: EXAMPLE-001');
    expect(content).toContain('title: Example Journey');
    expect(content).toContain('status: proposed');

    expect(result.created).toContain('journeys/EXAMPLE-001.md');
  });

  it('should skip example Journey when no-example is true', async () => {
    const result = await installAutogenInstance({
      rootDir: TEST_DIR,
      includeExample: false,
    });

    expect(result.success).toBe(true);

    const examplePath = join(TEST_DIR, 'journeys/EXAMPLE-001.md');
    expect(existsSync(examplePath)).toBe(false);

    expect(result.created).not.toContain('journeys/EXAMPLE-001.md');
  });

  it('should create VS Code settings', async () => {
    const result = await installAutogenInstance({
      rootDir: TEST_DIR,
    });

    expect(result.success).toBe(true);

    const settingsPath = join(TEST_DIR, '.vscode/settings.json');
    expect(existsSync(settingsPath)).toBe(true);

    const content = readFileSync(settingsPath, 'utf-8');
    const settings = JSON.parse(content);

    expect(settings['files.associations']).toBeDefined();
    expect(settings['files.associations']['*.journey.md']).toBe('markdown');
    expect(settings['editor.quickSuggestions']).toBeDefined();
    expect(settings['chat.promptFilesRecommendations']).toBeDefined();
    expect(settings['chat.promptFilesRecommendations']['artk.init-playbook']).toBe(
      true
    );
    expect(
      settings['chat.promptFilesRecommendations']['artk.discover-foundation']
    ).toBe(true);
    expect(settings['chat.promptFilesRecommendations']['artk.journey-propose']).toBe(
      true
    );
    expect(settings['chat.promptFilesRecommendations']['artk.journey-define']).toBe(
      true
    );
    expect(settings['chat.promptFilesRecommendations']['artk.journey-clarify']).toBe(
      true
    );
    expect(settings['chat.promptFilesRecommendations']['artk.testid-audit']).toBe(
      true
    );
    expect(
      settings['chat.promptFilesRecommendations']['artk.journey-implement']
    ).toBe(true);
    expect(settings['chat.promptFilesRecommendations']['artk.journey-validate']).toBe(
      true
    );
    expect(settings['chat.promptFilesRecommendations']['artk.journey-verify']).toBe(
      true
    );

    expect(result.created).toContain('.vscode/settings.json');
  });

  it('should skip existing directories when skipIfExists is true', async () => {
    // First install
    await installAutogenInstance({
      rootDir: TEST_DIR,
    });

    // Second install with skipIfExists
    const result = await installAutogenInstance({
      rootDir: TEST_DIR,
      skipIfExists: true,
    });

    expect(result.success).toBe(true);
    expect(result.skipped).toContain('autogen.config.yml');
    expect(result.skipped).toContain('.artk/.gitignore');
    expect(result.skipped).toContain('.artk/glossary.yml');
    expect(result.skipped).toContain('journeys/EXAMPLE-001.md');
    expect(result.skipped).toContain('.vscode/settings.json');
  });

  it('should overwrite existing files when force is true', async () => {
    // First install
    await installAutogenInstance({
      rootDir: TEST_DIR,
      projectName: 'original-project',
    });

    // Second install with force
    const result = await installAutogenInstance({
      rootDir: TEST_DIR,
      projectName: 'new-project',
      force: true,
    });

    expect(result.success).toBe(true);

    // Check that config was overwritten
    const configPath = join(TEST_DIR, 'autogen.config.yml');
    const configContent = readFileSync(configPath, 'utf-8');
    const config = parseYaml(configContent);

    expect(config.project).toBe('new-project');
    expect(result.created).toContain('autogen.config.yml');
  });

  it('should handle errors gracefully', async () => {
    // Try to install under /dev/null (a file, not a directory)
    // This will fail even for root users since you cannot create subdirectories under a file
    const result = await installAutogenInstance({
      rootDir: '/dev/null/test/cannot/create',
    });

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should return list of created files', async () => {
    const result = await installAutogenInstance({
      rootDir: TEST_DIR,
    });

    expect(result.success).toBe(true);
    expect(result.created).toContain('journeys');
    expect(result.created).toContain('tests/journeys');
    expect(result.created).toContain('tests/modules');
    expect(result.created).toContain('.artk');
    expect(result.created).toContain('autogen.config.yml');
    expect(result.created).toContain('.artk/.gitignore');
    expect(result.created).toContain('.artk/glossary.yml');
    expect(result.created).toContain('journeys/EXAMPLE-001.md');
    expect(result.created).toContain('.vscode/settings.json');
  });
});
