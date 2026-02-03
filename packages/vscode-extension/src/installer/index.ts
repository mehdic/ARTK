/**
 * Bundled ARTK Installer
 *
 * Installs ARTK directly from bundled assets without requiring npm registry access.
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

export interface BundledInstallOptions {
  targetPath: string;
  variant?: 'auto' | 'modern-esm' | 'modern-cjs' | 'legacy-16' | 'legacy-14';
  skipNpm?: boolean;
  skipLlkb?: boolean;
  skipBrowsers?: boolean;
  noPrompts?: boolean;
  force?: boolean;
}

export interface InstallResult {
  success: boolean;
  error?: string;
  artkE2ePath?: string;
}

/**
 * Get the path to bundled assets within the extension
 */
function getAssetsPath(context: vscode.ExtensionContext): string {
  return path.join(context.extensionPath, 'assets');
}

/**
 * Copy directory recursively
 */
async function copyDir(src: string, dest: string): Promise<void> {
  await fs.promises.mkdir(dest, { recursive: true });
  const entries = await fs.promises.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.promises.copyFile(srcPath, destPath);
    }
  }
}

/**
 * Detect Node.js version and module system
 */
function detectVariant(targetPath: string): 'modern-esm' | 'modern-cjs' | 'legacy-16' | 'legacy-14' {
  // Check Node.js version
  const nodeVersion = process.versions.node;
  const majorVersion = parseInt(nodeVersion.split('.')[0], 10);

  // Check package.json for module type
  let isEsm = false;
  try {
    const pkgPath = path.join(targetPath, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      isEsm = pkg.type === 'module';
    }
  } catch {
    // Ignore errors, default to CJS
  }

  if (majorVersion >= 18) {
    return isEsm ? 'modern-esm' : 'modern-cjs';
  } else if (majorVersion >= 16) {
    return 'legacy-16';
  } else {
    return 'legacy-14';
  }
}

/**
 * Create artk-e2e directory structure
 */
async function createDirectoryStructure(artkE2ePath: string): Promise<void> {
  const dirs = [
    '',
    'tests',
    'tests/smoke',
    'tests/release',
    'tests/regression',
    'journeys',
    'journeys/proposed',
    'journeys/defined',
    'journeys/clarified',
    'journeys/implemented',
    'docs',
    'vendor',
    'vendor/artk-core',
    '.auth-states',
    '.artk',
    '.artk/llkb',
    '.artk/llkb/patterns',
    '.artk/llkb/history',
  ];

  for (const dir of dirs) {
    await fs.promises.mkdir(path.join(artkE2ePath, dir), { recursive: true });
  }
}

/**
 * Create package.json for artk-e2e
 */
async function createPackageJson(artkE2ePath: string, variant: string): Promise<void> {
  const playwrightVersion = variant.startsWith('legacy-14')
    ? '^1.33.0'
    : variant.startsWith('legacy-16')
      ? '^1.49.0'
      : '^1.57.0';

  const pkg = {
    name: 'artk-e2e',
    version: '1.0.0',
    private: true,
    description: 'ARTK End-to-End Tests',
    scripts: {
      test: 'playwright test',
      'test:smoke': 'playwright test --grep @smoke',
      'test:release': 'playwright test --grep @release',
      'test:regression': 'playwright test --grep @regression',
    },
    dependencies: {
      '@playwright/test': playwrightVersion,
      yaml: '^2.3.4',
      zod: '^3.22.4',
    },
    devDependencies: {
      typescript: '^5.3.3',
      '@types/node': '^20.10.0',
    },
  };

  await fs.promises.writeFile(
    path.join(artkE2ePath, 'package.json'),
    JSON.stringify(pkg, null, 2)
  );
}

/**
 * Create artk.config.yml
 */
async function createConfig(artkE2ePath: string): Promise<void> {
  const config = `# ARTK Configuration
# See documentation for all options

app:
  name: "My Application"
  # baseUrl will be set per environment

environments:
  local:
    baseUrl: "http://localhost:3000"
  dev:
    baseUrl: "https://dev.example.com"
  staging:
    baseUrl: "https://staging.example.com"

# Authentication configuration (uncomment and configure as needed)
# auth:
#   provider: "oidc"
#   users:
#     default:
#       username: "\${TEST_USER}"
#       password: "\${TEST_PASSWORD}"

# Browser configuration
browsers:
  channel: "chromium"
  headless: true

# LLKB configuration
llkb:
  enabled: true
  minConfidence: 0.7
`;

  await fs.promises.writeFile(path.join(artkE2ePath, 'artk.config.yml'), config);
}

/**
 * Create .artk/context.json
 */
async function createContext(
  artkE2ePath: string,
  variant: string,
  targetPath: string
): Promise<void> {
  const context = {
    artkVersion: '1.0.0',
    variant,
    nodeVersion: process.versions.node,
    playwrightVersion: variant.startsWith('legacy-14')
      ? '1.33.x'
      : variant.startsWith('legacy-16')
        ? '1.49.x'
        : '1.57.x',
    installedAt: new Date().toISOString(),
    projectRoot: targetPath,
    harnessRoot: artkE2ePath,
  };

  await fs.promises.writeFile(
    path.join(artkE2ePath, '.artk', 'context.json'),
    JSON.stringify(context, null, 2)
  );
}

/**
 * Initialize LLKB structure
 */
async function initializeLLKB(llkbPath: string): Promise<void> {
  // Create config.yml
  const config = `# LLKB Configuration
minConfidence: 0.7
maxLessons: 1000
historyRetentionDays: 90
`;
  await fs.promises.writeFile(path.join(llkbPath, 'config.yml'), config);

  // Create empty JSON files
  const emptyArray = '[]';
  const emptyAnalytics = JSON.stringify(
    {
      totalLessons: 0,
      totalComponents: 0,
      avgConfidence: 0,
      lastUpdated: new Date().toISOString(),
    },
    null,
    2
  );

  await fs.promises.writeFile(path.join(llkbPath, 'lessons.json'), emptyArray);
  await fs.promises.writeFile(path.join(llkbPath, 'components.json'), emptyArray);
  await fs.promises.writeFile(path.join(llkbPath, 'analytics.json'), emptyAnalytics);
}

/**
 * Copy prompts to target project
 */
async function installPrompts(
  assetsPath: string,
  targetPath: string
): Promise<void> {
  const promptsSrc = path.join(assetsPath, 'prompts');
  const promptsDest = path.join(targetPath, '.github', 'prompts');

  if (fs.existsSync(promptsSrc)) {
    await copyDir(promptsSrc, promptsDest);
  }
}

/**
 * Copy vendor libraries (artk-core, autogen)
 */
async function installVendorLibs(
  assetsPath: string,
  artkE2ePath: string
): Promise<void> {
  const coreSrc = path.join(assetsPath, 'core');
  const coreDest = path.join(artkE2ePath, 'vendor', 'artk-core');

  if (fs.existsSync(coreSrc)) {
    await copyDir(coreSrc, coreDest);
  }

  // Create READONLY marker
  await fs.promises.writeFile(
    path.join(coreDest, 'READONLY.md'),
    '# DO NOT MODIFY\n\nThis directory contains vendored ARTK core libraries.\nDo not modify files here - they will be overwritten on upgrade.\n'
  );
}

/**
 * Copy bootstrap templates
 */
async function installTemplates(
  assetsPath: string,
  artkE2ePath: string
): Promise<void> {
  const templatesSrc = path.join(assetsPath, 'bootstrap-templates');

  if (fs.existsSync(templatesSrc)) {
    // Copy playwright.config.ts template
    const configTemplate = path.join(templatesSrc, 'playwright.config.template.ts');
    if (fs.existsSync(configTemplate)) {
      let content = await fs.promises.readFile(configTemplate, 'utf-8');
      // Replace template variables if any
      content = content.replace(/\{\{PROJECT_NAME\}\}/g, 'artk-e2e');
      await fs.promises.writeFile(
        path.join(artkE2ePath, 'playwright.config.ts'),
        content
      );
    }
  }
}

/**
 * Run npm install in artk-e2e directory
 */
async function runNpmInstall(artkE2ePath: string): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const isWindows = process.platform === 'win32';
    const npm = isWindows ? 'npm.cmd' : 'npm';

    const proc = spawn(npm, ['install'], {
      cwd: artkE2ePath,
      shell: false,
      windowsHide: true,
    });

    let stderr = '';

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        resolve({ success: false, error: stderr || `npm install failed with code ${code}` });
      }
    });

    proc.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });
  });
}

/**
 * Install Playwright browsers
 */
async function installBrowsers(artkE2ePath: string): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const isWindows = process.platform === 'win32';
    const npx = isWindows ? 'npx.cmd' : 'npx';

    const proc = spawn(npx, ['playwright', 'install', 'chromium'], {
      cwd: artkE2ePath,
      shell: false,
      windowsHide: true,
    });

    let stderr = '';

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        resolve({ success: false, error: stderr || `Browser install failed with code ${code}` });
      }
    });

    proc.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });
  });
}

/**
 * Main installation function
 */
export async function installBundled(
  context: vscode.ExtensionContext,
  options: BundledInstallOptions,
  progress?: vscode.Progress<{ message?: string; increment?: number }>
): Promise<InstallResult> {
  const { targetPath, skipNpm, skipLlkb, skipBrowsers, noPrompts, force } = options;
  const artkE2ePath = path.join(targetPath, 'artk-e2e');
  const assetsPath = getAssetsPath(context);

  try {
    // Check if already installed
    if (fs.existsSync(artkE2ePath) && !force) {
      return {
        success: false,
        error: 'ARTK is already installed. Use force option to reinstall.',
      };
    }

    // Detect or use specified variant
    const variant = options.variant === 'auto' || !options.variant
      ? detectVariant(targetPath)
      : options.variant;

    // Step 1: Create directory structure
    progress?.report({ message: 'Creating directory structure...' });
    await createDirectoryStructure(artkE2ePath);

    // Step 2: Create package.json
    progress?.report({ message: 'Creating package.json...' });
    await createPackageJson(artkE2ePath, variant);

    // Step 3: Create config files
    progress?.report({ message: 'Creating configuration files...' });
    await createConfig(artkE2ePath);
    await createContext(artkE2ePath, variant, targetPath);

    // Step 4: Copy vendor libraries
    progress?.report({ message: 'Installing ARTK core libraries...' });
    await installVendorLibs(assetsPath, artkE2ePath);

    // Step 5: Copy templates
    progress?.report({ message: 'Installing templates...' });
    await installTemplates(assetsPath, artkE2ePath);

    // Step 6: Initialize LLKB
    if (!skipLlkb) {
      progress?.report({ message: 'Initializing LLKB...' });
      await initializeLLKB(path.join(artkE2ePath, '.artk', 'llkb'));
    }

    // Step 7: Install prompts
    if (!noPrompts) {
      progress?.report({ message: 'Installing AI prompts...' });
      await installPrompts(assetsPath, targetPath);
    }

    // Step 8: Run npm install
    if (!skipNpm) {
      progress?.report({ message: 'Installing npm dependencies...' });
      const npmResult = await runNpmInstall(artkE2ePath);
      if (!npmResult.success) {
        return {
          success: false,
          error: `npm install failed: ${npmResult.error}`,
          artkE2ePath,
        };
      }
    }

    // Step 9: Install browsers
    if (!skipBrowsers && !skipNpm) {
      progress?.report({ message: 'Installing Playwright browsers...' });
      const browserResult = await installBrowsers(artkE2ePath);
      if (!browserResult.success) {
        // Non-fatal - browsers can be installed later
        vscode.window.showWarningMessage(
          `Browser installation failed: ${browserResult.error}. You can install browsers later with: npx playwright install chromium`
        );
      }
    }

    return {
      success: true,
      artkE2ePath,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
