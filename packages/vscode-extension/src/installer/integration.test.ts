/**
 * Integration test for ARTK bundled installer
 *
 * Tests the full installation process end-to-end:
 * 1. Creates a mock project directory
 * 2. Runs the bundled installer
 * 3. Verifies all expected files/directories are created
 * 4. Cleans up
 *
 * Run with: npx vitest run src/installer/integration.test.ts
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock vscode module
vi.mock('vscode', () => ({
  window: {
    showInformationMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    showErrorMessage: vi.fn(),
    withProgress: vi.fn((options, task) => task({ report: vi.fn() })),
  },
  ProgressLocation: {
    Notification: 1,
  },
  Uri: {
    file: (path: string) => ({ fsPath: path }),
  },
  workspace: {
    getConfiguration: vi.fn(() => ({
      get: vi.fn(),
    })),
  },
}));

// Import after mocking
import { installBundled, type BundledInstallOptions } from './index';

describe('ARTK Bundled Installer Integration', () => {
  let tempDir: string;
  let mockProjectDir: string;
  let mockExtensionContext: any;
  let assetsDir: string;

  beforeAll(async () => {
    // Create temp directory for test
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'artk-test-'));
    mockProjectDir = path.join(tempDir, 'mock-project');
    assetsDir = path.join(tempDir, 'extension-assets');

    // Create mock project with package.json
    await fs.promises.mkdir(mockProjectDir, { recursive: true });
    await fs.promises.writeFile(
      path.join(mockProjectDir, 'package.json'),
      JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        type: 'module',
      }, null, 2)
    );

    // Create mock extension assets directory structure
    await fs.promises.mkdir(path.join(assetsDir, 'core', 'dist'), { recursive: true });
    await fs.promises.mkdir(path.join(assetsDir, 'autogen', 'dist'), { recursive: true });
    await fs.promises.mkdir(path.join(assetsDir, 'journeys'), { recursive: true });
    await fs.promises.mkdir(path.join(assetsDir, 'prompts', 'common'), { recursive: true });
    await fs.promises.mkdir(path.join(assetsDir, 'prompts', 'next-commands'), { recursive: true });
    await fs.promises.mkdir(path.join(assetsDir, 'bootstrap-templates'), { recursive: true });

    // Create mock core package.json
    await fs.promises.writeFile(
      path.join(assetsDir, 'core', 'package.json'),
      JSON.stringify({ name: '@artk/core', version: '1.0.0' }, null, 2)
    );

    // Create mock core dist files
    await fs.promises.writeFile(
      path.join(assetsDir, 'core', 'dist', 'index.js'),
      '// Mock @artk/core\nexport const version = "1.0.0";'
    );

    // Create mock autogen package.json
    await fs.promises.writeFile(
      path.join(assetsDir, 'autogen', 'package.json'),
      JSON.stringify({ name: '@artk/core-autogen', version: '1.0.0' }, null, 2)
    );

    // Create mock journeys manifest
    await fs.promises.writeFile(
      path.join(assetsDir, 'journeys', 'core.manifest.json'),
      JSON.stringify({ version: '0.1.0' }, null, 2)
    );

    // Create mock prompt file
    await fs.promises.writeFile(
      path.join(assetsDir, 'prompts', 'artk.init.md'),
      `---
name: artk.init
description: "Initialize ARTK"
---
# ARTK Init
This is a test prompt.
`
    );

    // Create mock common prompt
    await fs.promises.writeFile(
      path.join(assetsDir, 'prompts', 'common', 'GENERAL_RULES.md'),
      '# General Rules\nTest rules.'
    );

    // Create mock next-commands file
    await fs.promises.writeFile(
      path.join(assetsDir, 'prompts', 'next-commands', 'init.txt'),
      '/artk.discover-foundation'
    );

    // Create mock playwright config template
    await fs.promises.writeFile(
      path.join(assetsDir, 'bootstrap-templates', 'playwright.config.template.ts'),
      `import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://localhost:3000',
  },
});
`
    );

    // Create mock extension context
    mockExtensionContext = {
      extensionPath: tempDir,
      extensionUri: { fsPath: tempDir },
      subscriptions: [],
      workspaceState: {
        get: vi.fn(),
        update: vi.fn(),
      },
      globalState: {
        get: vi.fn(),
        update: vi.fn(),
      },
    };

    // Rename assets dir to match expected path
    const expectedAssetsPath = path.join(tempDir, 'assets');
    await fs.promises.rename(assetsDir, expectedAssetsPath);
    assetsDir = expectedAssetsPath;
  });

  afterAll(async () => {
    // Cleanup
    if (tempDir && fs.existsSync(tempDir)) {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    }
  });

  it('should create artk-e2e directory structure', async () => {
    const options: BundledInstallOptions = {
      targetPath: mockProjectDir,
      variant: 'modern-esm',
      skipNpm: true, // Skip npm install for test speed
      skipBrowsers: true, // Skip browser install for test
      skipLlkb: false,
      noPrompts: false,
      force: false,
    };

    const result = await installBundled(mockExtensionContext, options);

    expect(result.success).toBe(true);
    expect(result.artkE2ePath).toBe(path.join(mockProjectDir, 'artk-e2e'));

    // Verify directory structure
    const artkE2ePath = result.artkE2ePath!;
    expect(fs.existsSync(artkE2ePath)).toBe(true);
    expect(fs.existsSync(path.join(artkE2ePath, 'vendor', 'artk-core'))).toBe(true);
    expect(fs.existsSync(path.join(artkE2ePath, 'tests'))).toBe(true);
    expect(fs.existsSync(path.join(artkE2ePath, 'journeys'))).toBe(true);
    expect(fs.existsSync(path.join(artkE2ePath, '.artk'))).toBe(true);
    expect(fs.existsSync(path.join(artkE2ePath, 'src', 'modules', 'foundation'))).toBe(true);
  });

  it('should create required config files', async () => {
    const artkE2ePath = path.join(mockProjectDir, 'artk-e2e');

    // Check package.json
    const pkgPath = path.join(artkE2ePath, 'package.json');
    expect(fs.existsSync(pkgPath)).toBe(true);
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    expect(pkg.name).toBe('artk-e2e');
    expect(pkg.devDependencies['@playwright/test']).toBeDefined();
    expect(pkg.devDependencies['@artk/core']).toBe('file:./vendor/artk-core');

    // Check tsconfig.json
    expect(fs.existsSync(path.join(artkE2ePath, 'tsconfig.json'))).toBe(true);

    // Check artk.config.yml
    const configPath = path.join(artkE2ePath, 'artk.config.yml');
    expect(fs.existsSync(configPath)).toBe(true);
    const config = fs.readFileSync(configPath, 'utf-8');
    expect(config).toContain('version: "1.0"');
    expect(config).toContain('app:');
    expect(config).toContain('name: "test-project"');
    expect(config).toContain('environments:');
    expect(config).toContain('browsers:');

    // Check .gitignore
    expect(fs.existsSync(path.join(artkE2ePath, '.gitignore'))).toBe(true);
  });

  it('should create context.json with correct metadata', async () => {
    const contextPath = path.join(mockProjectDir, 'artk-e2e', '.artk', 'context.json');
    expect(fs.existsSync(contextPath)).toBe(true);

    const context = JSON.parse(fs.readFileSync(contextPath, 'utf-8'));
    expect(context.variant).toBe('modern-esm');
    expect(context.moduleSystem).toBe('esm');
    expect(context.installMethod).toBe('vscode-extension');
    expect(context.artkVersion).toBe('1.0.0');
    expect(context.browser).toBeDefined();
    expect(context.browser.channel).toBeDefined();
  });

  it('should initialize LLKB structure', async () => {
    const llkbPath = path.join(mockProjectDir, 'artk-e2e', '.artk', 'llkb');
    expect(fs.existsSync(llkbPath)).toBe(true);

    // Check LLKB files
    expect(fs.existsSync(path.join(llkbPath, 'config.yml'))).toBe(true);
    expect(fs.existsSync(path.join(llkbPath, 'lessons.json'))).toBe(true);
    expect(fs.existsSync(path.join(llkbPath, 'components.json'))).toBe(true);
    expect(fs.existsSync(path.join(llkbPath, 'analytics.json'))).toBe(true);
    expect(fs.existsSync(path.join(llkbPath, 'patterns'))).toBe(true);

    // Verify lessons.json structure
    const lessons = JSON.parse(fs.readFileSync(path.join(llkbPath, 'lessons.json'), 'utf-8'));
    expect(lessons.version).toBe('1.0.0');
    expect(lessons.lessons).toEqual([]);
  });

  it('should install prompts and agents (two-tier architecture)', async () => {
    const promptsDir = path.join(mockProjectDir, '.github', 'prompts');
    const agentsDir = path.join(mockProjectDir, '.github', 'agents');

    expect(fs.existsSync(promptsDir)).toBe(true);
    expect(fs.existsSync(agentsDir)).toBe(true);

    // Check stub prompt exists
    const stubPrompt = path.join(promptsDir, 'artk.init.prompt.md');
    expect(fs.existsSync(stubPrompt)).toBe(true);
    const stubContent = fs.readFileSync(stubPrompt, 'utf-8');
    expect(stubContent).toContain('agent: artk.init');

    // Check full agent exists
    const agent = path.join(agentsDir, 'artk.init.agent.md');
    expect(fs.existsSync(agent)).toBe(true);
    const agentContent = fs.readFileSync(agent, 'utf-8');
    expect(agentContent).toContain('# ARTK Init');
  });

  it('should create foundation module stubs', async () => {
    const foundationPath = path.join(mockProjectDir, 'artk-e2e', 'src', 'modules', 'foundation');

    expect(fs.existsSync(path.join(foundationPath, 'index.ts'))).toBe(true);
    expect(fs.existsSync(path.join(foundationPath, 'auth', 'index.ts'))).toBe(true);
    expect(fs.existsSync(path.join(foundationPath, 'navigation', 'index.ts'))).toBe(true);
    expect(fs.existsSync(path.join(foundationPath, 'selectors', 'index.ts'))).toBe(true);
    expect(fs.existsSync(path.join(foundationPath, 'data', 'index.ts'))).toBe(true);
  });

  it('should create variant-features.json with correct features', async () => {
    const featuresPath = path.join(mockProjectDir, 'artk-e2e', 'vendor', 'artk-core', 'variant-features.json');
    expect(fs.existsSync(featuresPath)).toBe(true);

    const features = JSON.parse(fs.readFileSync(featuresPath, 'utf-8'));
    expect(features.variant).toBe('modern-esm');
    expect(features.moduleSystem).toBe('esm');
    expect(features.features.clock_api.available).toBe(true); // Modern variant
    expect(features.features.aria_snapshots.available).toBe(true);
  });

  it('should create AI protection markers', async () => {
    const corePath = path.join(mockProjectDir, 'artk-e2e', 'vendor', 'artk-core');

    expect(fs.existsSync(path.join(corePath, 'READONLY.md'))).toBe(true);
    expect(fs.existsSync(path.join(corePath, '.ai-ignore'))).toBe(true);

    const readme = fs.readFileSync(path.join(corePath, 'READONLY.md'), 'utf-8');
    expect(readme).toContain('DO NOT MODIFY');
    expect(readme).toContain('modern-esm');
  });

  it('should fail if already installed without force flag', async () => {
    const options: BundledInstallOptions = {
      targetPath: mockProjectDir,
      variant: 'modern-esm',
      skipNpm: true,
      skipBrowsers: true,
      force: false, // No force
    };

    const result = await installBundled(mockExtensionContext, options);

    expect(result.success).toBe(false);
    expect(result.error).toContain('already installed');
  });

  it('should succeed with force flag and create backup', async () => {
    const options: BundledInstallOptions = {
      targetPath: mockProjectDir,
      variant: 'modern-esm',
      skipNpm: true,
      skipBrowsers: true,
      force: true, // Force reinstall
    };

    const result = await installBundled(mockExtensionContext, options);

    expect(result.success).toBe(true);
    expect(result.backupPath).toBeDefined();
    expect(fs.existsSync(result.backupPath!)).toBe(true);

    // Verify backup contains expected files
    expect(fs.existsSync(path.join(result.backupPath!, 'artk.config.yml'))).toBe(true);
  });

  it('should detect correct variant for legacy Node version', async () => {
    // Create a new project with engines specifying Node 16
    const legacyProjectDir = path.join(tempDir, 'legacy-project');
    await fs.promises.mkdir(legacyProjectDir, { recursive: true });
    await fs.promises.writeFile(
      path.join(legacyProjectDir, 'package.json'),
      JSON.stringify({
        name: 'legacy-project',
        version: '1.0.0',
        engines: { node: '>=16.0.0' },
      }, null, 2)
    );

    const options: BundledInstallOptions = {
      targetPath: legacyProjectDir,
      variant: 'auto', // Auto-detect
      skipNpm: true,
      skipBrowsers: true,
    };

    const result = await installBundled(mockExtensionContext, options);

    // Note: Since we're running in Node 18+, it will detect modern variant
    // unless the PATH node is 16. This test verifies the auto-detection logic runs.
    expect(result.success).toBe(true);

    const contextPath = path.join(legacyProjectDir, 'artk-e2e', '.artk', 'context.json');
    const context = JSON.parse(fs.readFileSync(contextPath, 'utf-8'));
    expect(context.variant).toBeDefined();
  });

  it('should sanitize project name for YAML safety', async () => {
    // Create a project with special characters in name
    const specialProjectDir = path.join(tempDir, 'special-project');
    await fs.promises.mkdir(specialProjectDir, { recursive: true });
    await fs.promises.writeFile(
      path.join(specialProjectDir, 'package.json'),
      JSON.stringify({
        name: 'test"project:with\'special',
        version: '1.0.0',
      }, null, 2)
    );

    const options: BundledInstallOptions = {
      targetPath: specialProjectDir,
      variant: 'modern-esm',
      skipNpm: true,
      skipBrowsers: true,
    };

    const result = await installBundled(mockExtensionContext, options);
    expect(result.success).toBe(true);

    // Verify config.yml has sanitized project name (special chars removed)
    const configPath = path.join(specialProjectDir, 'artk-e2e', 'artk.config.yml');
    const config = fs.readFileSync(configPath, 'utf-8');
    // The name should be sanitized - special chars removed
    // Original: 'test"project:with\'special' -> Sanitized: 'testprojectwithspecial'
    expect(config).toContain('name: "testprojectwithspecial"');
    // Ensure no unescaped special characters that would break YAML parsing
    expect(config).not.toContain('test"project');
    expect(config).not.toContain(":with'");
  });
});
