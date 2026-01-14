/**
 * Bootstrap - Core installation logic
 *
 * This module implements the complete ARTK bootstrap process,
 * replacing the shell scripts (bootstrap.sh/bootstrap.ps1) with
 * a unified TypeScript implementation.
 */

import { execSync, spawn, SpawnOptions } from 'child_process';
import fs from 'fs-extra';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { Logger } from './logger.js';
import { detectEnvironment, type EnvironmentInfo } from './environment.js';
import { resolveBrowser, updateArtkConfigBrowser, type BrowserInfo } from './browser-resolver.js';
import { validateArtkConfig } from './config-validator.js';
import { promptVariant, isInteractive } from './prompts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface BootstrapOptions {
  skipNpm?: boolean;
  skipBrowsers?: boolean;
  force?: boolean;
  variant?: 'commonjs' | 'esm' | 'auto';
  prompts?: boolean;
  verbose?: boolean;
}

export interface BootstrapResult {
  success: boolean;
  projectPath: string;
  artkE2ePath: string;
  browserInfo?: BrowserInfo;
  environment?: EnvironmentInfo;
  errors: string[];
}

interface BackupState {
  configPath: string | null;
  configBackupPath: string | null;
  contextPath: string | null;
  contextBackupPath: string | null;
}

/**
 * Bootstrap ARTK in a target project
 */
export async function bootstrap(
  targetPath: string,
  options: BootstrapOptions = {}
): Promise<BootstrapResult> {
  const logger = new Logger({ verbose: options.verbose });
  const errors: string[] = [];

  const resolvedPath = path.resolve(targetPath);
  const artkE2ePath = path.join(resolvedPath, 'artk-e2e');
  const artkDir = path.join(resolvedPath, '.artk');
  const logsDir = path.join(artkDir, 'logs');

  logger.header('ARTK Bootstrap Installation');
  logger.table([
    { label: 'Target', value: resolvedPath },
    { label: 'ARTK E2E', value: artkE2ePath },
  ]);

  // Validate target directory
  if (!fs.existsSync(resolvedPath)) {
    logger.error(`Target directory does not exist: ${resolvedPath}`);
    return { success: false, projectPath: resolvedPath, artkE2ePath, errors: ['Target directory does not exist'] };
  }

  // Check for existing installation
  if (fs.existsSync(artkE2ePath) && !options.force) {
    logger.error('ARTK is already installed in this project. Use --force to overwrite.');
    return { success: false, projectPath: resolvedPath, artkE2ePath, errors: ['Already installed'] };
  }

  // Create backup state for rollback
  const backup: BackupState = {
    configPath: null,
    configBackupPath: null,
    contextPath: null,
    contextBackupPath: null,
  };

  // Create logs directory early
  await fs.ensureDir(logsDir);

  try {
    // Backup existing config if doing a force overwrite
    if (options.force) {
      const configPath = path.join(artkE2ePath, 'artk.config.yml');
      if (fs.existsSync(configPath)) {
        backup.configPath = configPath;
        backup.configBackupPath = `${configPath}.bootstrap-backup`;
        await fs.copy(configPath, backup.configBackupPath);
        logger.debug('Backed up existing artk.config.yml');
      }

      const contextPath = path.join(artkDir, 'context.json');
      if (fs.existsSync(contextPath)) {
        backup.contextPath = contextPath;
        backup.contextBackupPath = `${contextPath}.bootstrap-backup`;
        await fs.copy(contextPath, backup.contextBackupPath);
        logger.debug('Backed up existing context.json');
      }
    }

    // Step 1: Detect environment
    logger.step(1, 7, 'Detecting environment...');
    const environment = await detectEnvironment(resolvedPath);
    let variant: 'commonjs' | 'esm';

    if (options.variant && options.variant !== 'auto') {
      // User explicitly specified a variant
      variant = options.variant;
    } else if (environment.moduleSystem !== 'unknown') {
      // Environment detection succeeded
      variant = environment.moduleSystem;
    } else if (isInteractive()) {
      // Interactive mode: prompt user to select variant
      logger.warning('Could not auto-detect module system');
      variant = await promptVariant();
    } else {
      // Non-interactive: default to CommonJS for compatibility
      variant = 'commonjs';
      logger.debug('Using CommonJS as default (non-interactive mode)');
    }

    logger.success(`Module system: ${variant}`);
    logger.debug(`Node.js: ${environment.nodeVersion}`);
    logger.debug(`Platform: ${environment.platform}/${environment.arch}`);

    // Step 2: Create directory structure
    logger.step(2, 7, 'Creating artk-e2e/ structure...');
    await createDirectoryStructure(artkE2ePath);
    logger.success('Directory structure created');

    // Step 3: Install @artk/core to vendor
    logger.step(3, 7, 'Installing @artk/core to vendor/...');
    await installVendorPackages(artkE2ePath, logger);
    logger.success('@artk/core installed to vendor/');

    // Step 4: Install prompts
    if (options.prompts !== false) {
      logger.step(4, 7, 'Installing prompts to .github/prompts/...');
      await installPrompts(resolvedPath, logger);
      logger.success('Prompts installed');
    } else {
      logger.step(4, 7, 'Skipping prompts installation (--no-prompts)');
    }

    // Step 5: Create configuration files
    logger.step(5, 7, 'Creating configuration files...');
    const projectName = path.basename(resolvedPath);
    await createConfigurationFiles(artkE2ePath, artkDir, resolvedPath, {
      projectName,
      variant,
    }, logger);
    logger.success('Configuration files created');

    // Validate generated config
    const configPath = path.join(artkE2ePath, 'artk.config.yml');
    const configValidation = validateArtkConfig(configPath, logger);
    if (!configValidation.valid) {
      logger.error('Generated configuration validation failed:');
      for (const error of configValidation.errors) {
        logger.error(`  - ${error}`);
      }
      throw new Error('Configuration validation failed');
    }

    if (configValidation.warnings.length > 0) {
      for (const warning of configValidation.warnings) {
        logger.warning(`Config: ${warning}`);
      }
    }

    // Step 6: npm install
    if (!options.skipNpm) {
      logger.step(6, 7, 'Running npm install...');
      await runNpmInstall(artkE2ePath, logsDir, logger);
      logger.success('npm install completed');
    } else {
      logger.step(6, 7, 'Skipping npm install (--skip-npm)');
    }

    // Step 7: Browser configuration
    let browserInfo: BrowserInfo | undefined;
    if (!options.skipBrowsers && !options.skipNpm) {
      logger.step(7, 7, 'Configuring browsers...');
      browserInfo = await resolveBrowser(resolvedPath, logger, { logsDir });

      // Install Playwright browsers if using bundled channel
      if (browserInfo.channel === 'bundled') {
        logger.debug('Installing Playwright browsers...');
        try {
          execSync('npx playwright install chromium', {
            cwd: artkE2ePath,
            stdio: 'pipe',
            env: { ...process.env },
            timeout: 300000, // 5 minute timeout
          });
          logger.debug('Playwright browsers installed');
        } catch (error) {
          // Non-blocking - browser resolver already configured fallback
          logger.warning('Playwright browser installation failed, using system browser fallback');
          // Update browser info to use system browser
          if (browserInfo.channel === 'bundled') {
            browserInfo = await resolveBrowser(resolvedPath, logger, {
              logsDir,
              skipBundled: true,
            });
          }
        }
      }

      // Update config with browser info
      const configPath = path.join(artkE2ePath, 'artk.config.yml');
      updateArtkConfigBrowser(configPath, browserInfo);

      // Update context.json with browser metadata
      await updateContextJson(artkDir, { browser: browserInfo });
      logger.success(`Browser configured: ${browserInfo.channel} (${browserInfo.strategy})`);
    } else {
      logger.step(7, 7, 'Skipping browser configuration');
    }

    // Success - clean up backups
    await cleanupBackup(backup);

    // Success!
    printSuccessSummary(logger, resolvedPath, artkE2ePath, browserInfo);

    return {
      success: true,
      projectPath: resolvedPath,
      artkE2ePath,
      browserInfo,
      environment,
      errors: [],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Bootstrap failed: ${errorMessage}`);
    errors.push(errorMessage);

    // Attempt rollback
    await rollbackOnFailure(backup, logger);

    return {
      success: false,
      projectPath: resolvedPath,
      artkE2ePath,
      errors,
    };
  }
}

/**
 * Roll back changes on failure
 */
async function rollbackOnFailure(backup: BackupState, logger: Logger): Promise<void> {
  logger.warning('Attempting to roll back changes...');

  try {
    // Restore config backup
    if (backup.configBackupPath && fs.existsSync(backup.configBackupPath)) {
      if (backup.configPath) {
        await fs.copy(backup.configBackupPath, backup.configPath);
        await fs.remove(backup.configBackupPath);
        logger.debug('Restored artk.config.yml from backup');
      }
    }

    // Restore context backup
    if (backup.contextBackupPath && fs.existsSync(backup.contextBackupPath)) {
      if (backup.contextPath) {
        await fs.copy(backup.contextBackupPath, backup.contextPath);
        await fs.remove(backup.contextBackupPath);
        logger.debug('Restored context.json from backup');
      }
    }

    logger.warning('Partial rollback completed. Some files may need manual cleanup.');
  } catch (rollbackError) {
    logger.error(`Rollback failed: ${rollbackError}`);
    logger.error('Manual cleanup may be required.');
  }
}

/**
 * Clean up backup files after successful bootstrap
 */
async function cleanupBackup(backup: BackupState): Promise<void> {
  try {
    if (backup.configBackupPath && fs.existsSync(backup.configBackupPath)) {
      await fs.remove(backup.configBackupPath);
    }
    if (backup.contextBackupPath && fs.existsSync(backup.contextBackupPath)) {
      await fs.remove(backup.contextBackupPath);
    }
  } catch {
    // Best effort cleanup
  }
}

/**
 * Create the artk-e2e directory structure
 */
async function createDirectoryStructure(artkE2ePath: string): Promise<void> {
  const directories = [
    'vendor/artk-core',
    'vendor/artk-core-autogen',
    'src/modules/foundation/auth',
    'src/modules/foundation/navigation',
    'src/modules/foundation/selectors',
    'src/modules/foundation/data',
    'src/modules/features',
    'config',
    'tests/setup',
    'tests/foundation',
    'tests/smoke',
    'tests/release',
    'tests/regression',
    'tests/journeys',
    'docs',
    'journeys',
    '.auth-states',
  ];

  for (const dir of directories) {
    await fs.ensureDir(path.join(artkE2ePath, dir));
  }
}

/**
 * Install @artk/core and @artk/core-autogen to vendor directory
 */
async function installVendorPackages(artkE2ePath: string, logger: Logger): Promise<void> {
  // Get the assets directory (bundled with CLI)
  const assetsDir = getAssetsDir();

  // Copy @artk/core
  const coreSource = path.join(assetsDir, 'core');
  const coreTarget = path.join(artkE2ePath, 'vendor', 'artk-core');

  if (fs.existsSync(coreSource)) {
    await fs.copy(coreSource, coreTarget, { overwrite: true });
    logger.debug(`Copied @artk/core from bundled assets`);
  } else {
    logger.warning(`@artk/core assets not found at ${coreSource}`);
    // Create minimal package.json for development
    await fs.writeJson(path.join(coreTarget, 'package.json'), {
      name: '@artk/core',
      version: '1.0.0',
      main: './dist/index.js',
    });
  }

  // Copy @artk/core-autogen
  const autogenSource = path.join(assetsDir, 'autogen');
  const autogenTarget = path.join(artkE2ePath, 'vendor', 'artk-core-autogen');

  if (fs.existsSync(autogenSource)) {
    await fs.copy(autogenSource, autogenTarget, { overwrite: true });
    logger.debug(`Copied @artk/core-autogen from bundled assets`);
  } else {
    logger.warning(`@artk/core-autogen assets not found at ${autogenSource}`);
    await fs.writeJson(path.join(autogenTarget, 'package.json'), {
      name: '@artk/core-autogen',
      version: '0.1.0',
      main: './dist/index.js',
    });
  }
}

/**
 * Install prompts to .github/prompts/
 */
async function installPrompts(projectPath: string, logger: Logger): Promise<void> {
  const assetsDir = getAssetsDir();
  const promptsSource = path.join(assetsDir, 'prompts');
  const promptsTarget = path.join(projectPath, '.github', 'prompts');

  await fs.ensureDir(promptsTarget);

  if (fs.existsSync(promptsSource)) {
    const promptFiles = await fs.readdir(promptsSource);
    let installed = 0;

    for (const file of promptFiles) {
      if (file.endsWith('.md') && file.startsWith('artk.')) {
        const source = path.join(promptsSource, file);
        // Rename artk.*.md to artk.*.prompt.md
        const targetName = file.replace(/\.md$/, '.prompt.md');
        const target = path.join(promptsTarget, targetName);

        await fs.copy(source, target, { overwrite: true });
        installed++;
        logger.debug(`Installed prompt: ${targetName}`);
      }
    }

    logger.debug(`Installed ${installed} prompt files`);
  } else {
    logger.warning(`Prompts assets not found at ${promptsSource}`);
  }
}

/**
 * Create configuration files (package.json, playwright.config.ts, etc.)
 */
async function createConfigurationFiles(
  artkE2ePath: string,
  artkDir: string,
  projectPath: string,
  options: { projectName: string; variant: 'commonjs' | 'esm' },
  logger: Logger
): Promise<void> {
  // package.json
  await fs.writeJson(
    path.join(artkE2ePath, 'package.json'),
    {
      name: 'artk-e2e',
      version: '1.0.0',
      private: true,
      scripts: {
        test: 'playwright test',
        'test:smoke': 'playwright test --grep @smoke',
        'test:release': 'playwright test --grep @release',
        'test:regression': 'playwright test --grep @regression',
        'test:validation': 'playwright test --project=validation',
        'test:ui': 'playwright test --ui',
        report: 'playwright show-report',
        typecheck: 'tsc --noEmit',
      },
      dependencies: {
        yaml: '^2.3.4',
      },
      devDependencies: {
        '@artk/core': 'file:./vendor/artk-core',
        '@artk/core-autogen': 'file:./vendor/artk-core-autogen',
        '@playwright/test': '^1.57.0',
        '@types/node': '^20.10.0',
        typescript: '^5.3.0',
      },
    },
    { spaces: 2 }
  );

  // playwright.config.ts
  await fs.writeFile(
    path.join(artkE2ePath, 'playwright.config.ts'),
    getPlaywrightConfigTemplate()
  );

  // tsconfig.json
  await fs.writeJson(
    path.join(artkE2ePath, 'tsconfig.json'),
    {
      compilerOptions: {
        target: 'ES2022',
        module: 'CommonJS',
        moduleResolution: 'Node',
        lib: ['ES2022', 'DOM'],
        strict: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        outDir: './dist',
        rootDir: '.',
        declaration: true,
        resolveJsonModule: true,
        baseUrl: '.',
        paths: {
          '@artk/core': ['./vendor/artk-core/dist'],
          '@artk/core/*': ['./vendor/artk-core/dist/*'],
        },
      },
      include: ['tests/**/*', 'src/**/*', 'config/**/*', '*.ts'],
      exclude: ['node_modules', 'dist', 'vendor'],
    },
    { spaces: 2 }
  );

  // artk.config.yml
  await fs.writeFile(
    path.join(artkE2ePath, 'artk.config.yml'),
    getArtkConfigTemplate(options.projectName)
  );

  // .gitignore
  await fs.writeFile(
    path.join(artkE2ePath, '.gitignore'),
    `node_modules/
dist/
test-results/
playwright-report/
.auth-states/
*.local
`
  );

  // Foundation modules generation using @artk/core's generator
  // This ensures feature parity with shell script bootstrap
  const coreGeneratorPath = path.join(artkE2ePath, 'vendor', 'artk-core', 'scripts', 'generate-foundation.ts');
  if (fs.existsSync(coreGeneratorPath)) {
    logger.debug('Generating foundation modules via @artk/core...');
    try {
      // Use tsx to run the TypeScript generator directly
      execSync(
        `npx tsx "${coreGeneratorPath}" --projectRoot="${projectPath}" --variant="${options.variant}"`,
        {
          cwd: artkE2ePath,
          stdio: 'pipe',
          env: { ...process.env },
        }
      );
      logger.debug('Foundation modules generated successfully');
    } catch (error) {
      // Non-blocking - foundation modules will be created by /artk.discover-foundation
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warning(`Foundation module generation failed (non-blocking): ${errorMessage}`);
      logger.debug('Foundation modules will be created by /artk.discover-foundation prompt');
    }
  } else {
    logger.debug('Foundation generator not found in vendor, using stubs only');
  }

  // Create additional module stubs (selectors, data, features)
  await createAdditionalModuleStubs(artkE2ePath);

  // .artk/context.json
  await fs.ensureDir(artkDir);
  await fs.writeJson(
    path.join(artkDir, 'context.json'),
    {
      version: '1.0',
      projectRoot: projectPath,
      artkRoot: artkE2ePath,
      initialized_at: new Date().toISOString(),
      templateVariant: options.variant,
      next_suggested: '/artk.init-playbook',
    },
    { spaces: 2 }
  );

  // .artk/.gitignore
  await fs.writeFile(
    path.join(artkDir, '.gitignore'),
    `# ARTK temporary files
browsers/
heal-logs/
logs/
*.heal.json
selector-catalog.local.json
`
  );
}

/**
 * Create additional module stubs (selectors, data, features)
 * The main foundation modules (auth, config, navigation) are generated by template processor
 */
async function createAdditionalModuleStubs(artkE2ePath: string): Promise<void> {
  const foundationPath = path.join(artkE2ePath, 'src', 'modules', 'foundation');

  // Selectors stub
  await fs.ensureDir(path.join(foundationPath, 'selectors'));
  await fs.writeFile(
    path.join(foundationPath, 'selectors', 'index.ts'),
    `/**
 * Selectors Module - Locator utilities
 *
 * This file will be populated by /artk.discover-foundation
 * Provides data-testid helpers and selector utilities.
 */

import type { Page, Locator } from '@playwright/test';

/**
 * Get element by data-testid
 */
export function getByTestId(page: Page, testId: string): Locator {
  return page.locator(\`[data-testid="\${testId}"]\`);
}

/**
 * Get all elements by data-testid prefix
 */
export function getAllByTestIdPrefix(page: Page, prefix: string): Locator {
  return page.locator(\`[data-testid^="\${prefix}"]\`);
}
`
  );

  // Data stub
  await fs.ensureDir(path.join(foundationPath, 'data'));
  await fs.writeFile(
    path.join(foundationPath, 'data', 'index.ts'),
    `/**
 * Data Module - Test data builders and cleanup
 *
 * This file will be populated by /artk.discover-foundation
 * Provides test data factories and cleanup utilities.
 */

/**
 * Generate unique test identifier
 */
export function generateTestId(prefix: string = 'test'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return \`\${prefix}_\${timestamp}_\${random}\`;
}

/**
 * Cleanup registry for test data
 */
const cleanupRegistry: Array<() => Promise<void>> = [];

export function registerCleanup(fn: () => Promise<void>): void {
  cleanupRegistry.push(fn);
}

export async function runCleanup(): Promise<void> {
  for (const cleanup of cleanupRegistry.reverse()) {
    await cleanup();
  }
  cleanupRegistry.length = 0;
}
`
  );

  // Features index
  await fs.writeFile(
    path.join(artkE2ePath, 'src', 'modules', 'features', 'index.ts'),
    `/**
 * Feature Modules - Journey-specific page objects
 *
 * These modules are created as Journeys are implemented and provide
 * page objects and flows for specific feature areas.
 */

export {};
`
  );
}

/**
 * Run npm install in artk-e2e directory
 */
async function runNpmInstall(artkE2ePath: string, logsDir: string, logger: Logger): Promise<void> {
  const logFile = path.join(logsDir, 'npm-install.log');

  return new Promise((resolve, reject) => {
    logger.startSpinner('Installing dependencies...');

    const logLines: string[] = [`npm install started - ${new Date().toISOString()}`];
    logLines.push(`Working directory: ${artkE2ePath}`);

    const child = spawn('npm', ['install', '--legacy-peer-deps'], {
      cwd: artkE2ePath,
      env: {
        ...process.env,
        PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1',
      },
      shell: true,
      stdio: 'pipe',
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      logLines.push(`Exit code: ${code}`);
      logLines.push('--- STDOUT ---');
      logLines.push(stdout || '(empty)');
      logLines.push('--- STDERR ---');
      logLines.push(stderr || '(empty)');

      // Write log file
      try {
        fs.writeFileSync(logFile, logLines.join('\n'));
      } catch {
        // Best effort
      }

      if (code === 0) {
        logger.succeedSpinner('Dependencies installed');
        resolve();
      } else {
        logger.failSpinner('npm install failed');
        logger.debug(`Details saved to: ${logFile}`);
        reject(new Error(`npm install failed with code ${code}. See ${logFile} for details.`));
      }
    });

    child.on('error', (error) => {
      logLines.push(`Process error: ${error.message}`);
      try {
        fs.writeFileSync(logFile, logLines.join('\n'));
      } catch {
        // Best effort
      }
      logger.failSpinner('npm install failed');
      reject(error);
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      logLines.push('TIMEOUT: Installation took longer than 5 minutes');
      try {
        fs.writeFileSync(logFile, logLines.join('\n'));
      } catch {
        // Best effort
      }
      child.kill();
      logger.failSpinner('npm install timed out');
      reject(new Error('npm install timed out'));
    }, 300000);
  });
}

/**
 * Update context.json with additional metadata
 */
async function updateContextJson(artkDir: string, updates: Record<string, any>): Promise<void> {
  const contextPath = path.join(artkDir, 'context.json');

  let context: Record<string, any> = {};
  if (fs.existsSync(contextPath)) {
    context = await fs.readJson(contextPath);
  }

  Object.assign(context, updates);
  await fs.writeJson(contextPath, context, { spaces: 2 });
}

/**
 * Get the assets directory path
 */
function getAssetsDir(): string {
  // Try relative to the built CLI
  const possiblePaths = [
    path.join(__dirname, '..', '..', 'assets'),
    path.join(__dirname, '..', 'assets'),
    path.join(__dirname, 'assets'),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  // Fallback to development path
  return path.join(__dirname, '..', '..', 'assets');
}

/**
 * Print success summary
 */
function printSuccessSummary(
  logger: Logger,
  projectPath: string,
  artkE2ePath: string,
  browserInfo?: BrowserInfo
): void {
  logger.blank();
  logger.header('ARTK Installation Complete!');
  logger.blank();

  logger.info('Installed:');
  logger.list([
    'artk-e2e/                             - E2E test workspace',
    'artk-e2e/vendor/artk-core/            - @artk/core (vendored)',
    'artk-e2e/vendor/artk-core-autogen/    - @artk/core-autogen (vendored)',
    'artk-e2e/package.json                 - Test workspace dependencies',
    'artk-e2e/playwright.config.ts         - Playwright configuration',
    'artk-e2e/tsconfig.json                - TypeScript configuration',
    'artk-e2e/artk.config.yml              - ARTK configuration',
    '.github/prompts/                      - Copilot prompts',
    '.artk/context.json                    - ARTK context',
    '.artk/browsers/                       - Playwright browsers cache',
  ]);

  if (browserInfo) {
    logger.blank();
    logger.info('Browser configuration:');
    logger.table([
      { label: 'channel', value: browserInfo.channel },
      { label: 'strategy', value: browserInfo.strategy },
      ...(browserInfo.path ? [{ label: 'path', value: browserInfo.path }] : []),
    ]);
  }

  logger.nextSteps([
    'cd artk-e2e',
    'Open VS Code and use /artk.init-playbook in Copilot Chat',
  ]);

  logger.info('Run tests:');
  logger.list(['cd artk-e2e && npm test']);
}

/**
 * Playwright config template
 */
function getPlaywrightConfigTemplate(): string {
  return `/**
 * Playwright Configuration for ARTK E2E Tests
 *
 * Note: Uses inline config loading to avoid ESM/CommonJS resolution issues
 * with vendored @artk/core packages.
 */
import { defineConfig, devices } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Load ARTK config from artk.config.yml
function loadArtkConfig(): Record<string, any> {
  const configPath = path.join(__dirname, 'artk.config.yml');
  if (!fs.existsSync(configPath)) {
    console.warn(\`ARTK config not found: \${configPath}, using defaults\`);
    return { environments: { local: { baseUrl: 'http://localhost:3000' } } };
  }

  const yaml = require('yaml');
  return yaml.parse(fs.readFileSync(configPath, 'utf8'));
}

const artkConfig = loadArtkConfig();
const env = process.env.ARTK_ENV || 'local';
const baseURL = artkConfig.environments?.[env]?.baseUrl || 'http://localhost:3000';
const browserChannel = artkConfig.browsers?.channel;

// Build browser use config
const browserUse: Record<string, any> = { ...devices['Desktop Chrome'] };
if (browserChannel && browserChannel !== 'bundled') {
  browserUse.channel = browserChannel;
}

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }]],
  timeout: artkConfig.settings?.timeout || 30000,

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // Auth setup project - runs first to create storage states
    {
      name: 'setup',
      testMatch: /.*\\.setup\\.ts/,
    },
    // Main browser project with auth dependency
    {
      name: 'chromium',
      use: browserUse,
      dependencies: ['setup'],
    },
    // Validation project - no auth needed
    {
      name: 'validation',
      testMatch: /foundation\\.validation\\.spec\\.ts/,
      use: browserUse,
    },
  ],
});
`;
}

/**
 * ARTK config template
 */
function getArtkConfigTemplate(projectName: string): string {
  return `# ARTK Configuration
# Generated by @artk/cli on ${new Date().toISOString()}

version: "1.0"

app:
  name: "${projectName}"
  type: web
  description: "E2E tests for ${projectName}"

environments:
  local:
    baseUrl: \${ARTK_BASE_URL:-http://localhost:3000}
  intg:
    baseUrl: \${ARTK_INTG_URL:-https://intg.example.com}
  ctlq:
    baseUrl: \${ARTK_CTLQ_URL:-https://ctlq.example.com}
  prod:
    baseUrl: \${ARTK_PROD_URL:-https://example.com}

auth:
  provider: oidc
  storageStateDir: ./.auth-states
  # roles:
  #   admin:
  #     username: \${ADMIN_USER}
  #     password: \${ADMIN_PASS}

settings:
  parallel: true
  retries: 2
  timeout: 30000
  traceOnFailure: true

browsers:
  enabled:
    - chromium
  channel: bundled
  strategy: auto
  viewport:
    width: 1280
    height: 720
  headless: true
`;
}
