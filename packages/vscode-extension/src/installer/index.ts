/**
 * Bundled ARTK Installer
 *
 * Installs ARTK directly from bundled assets without requiring npm registry access.
 * This mirrors the functionality of scripts/bootstrap.sh
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
  forceLlkb?: boolean; // P2 FIX: Force LLKB reinitialization (delete and recreate)
  skipBrowsers?: boolean;
  noPrompts?: boolean;
  force?: boolean;
}

export interface InstallResult {
  success: boolean;
  error?: string;
  artkE2ePath?: string;
  backupPath?: string; // Path to backup if force reinstall was used
}

type Variant = 'modern-esm' | 'modern-cjs' | 'legacy-16' | 'legacy-14';

/**
 * Get the path to bundled assets within the extension
 */
function getAssetsPath(context: vscode.ExtensionContext): string {
  return path.join(context.extensionPath, 'assets');
}

/**
 * Copy directory recursively (skips symlinks for security)
 */
async function copyDir(src: string, dest: string): Promise<void> {
  await fs.promises.mkdir(dest, { recursive: true });
  const entries = await fs.promises.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    // Skip symlinks for security (prevents path traversal attacks)
    if (entry.isSymbolicLink()) {
      continue;
    }

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
 * Strip JSON comments safely without corrupting URLs
 * Handles // and /* comments while preserving strings containing //
 */
function stripJsonComments(content: string): string {
  let result = '';
  let inString = false;
  let escape = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const next = content[i + 1];

    if (escape) {
      result += char;
      escape = false;
      continue;
    }

    if (char === '\\' && inString) {
      result += char;
      escape = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      result += char;
      continue;
    }

    // Only strip comments when NOT inside a string
    if (!inString && char === '/' && next === '/') {
      // Skip to end of line
      while (i < content.length && content[i] !== '\n') i++;
      i--; // Back up so the loop increment lands on \n
      continue;
    }

    if (!inString && char === '/' && next === '*') {
      // Skip to */
      i += 2;
      while (i < content.length - 1 && !(content[i] === '*' && content[i + 1] === '/')) i++;
      i++; // Skip past /
      continue;
    }

    result += char;
  }

  // Also remove trailing commas
  return result.replace(/,(\s*[}\]])/g, '$1');
}

/**
 * Detect project's Node.js version from various sources
 * Priority: .nvmrc > package.json engines > PATH node > Electron's node
 */
function detectProjectNodeVersion(targetPath: string): number {
  // Try .nvmrc first
  try {
    const nvmrcPath = path.join(targetPath, '.nvmrc');
    if (fs.existsSync(nvmrcPath)) {
      const content = fs.readFileSync(nvmrcPath, 'utf-8').trim();
      // Parse versions like "v20", "20", "v20.10.0", "lts/*"
      const match = content.match(/^v?(\d+)/);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
  } catch {
    // Continue to next method
  }

  // Try package.json engines.node
  try {
    const pkgPath = path.join(targetPath, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg.engines?.node) {
        // Parse versions like ">=18", "^20", "18.x", ">=18.0.0"
        const match = pkg.engines.node.match(/(\d+)/);
        if (match) {
          return parseInt(match[1], 10);
        }
      }
    }
  } catch {
    // Continue to next method
  }

  // Try running 'node --version' from PATH (async would be better, but keeping sync for simplicity)
  try {
    const { execSync } = require('child_process');
    const result = execSync('node --version', { encoding: 'utf-8', timeout: 5000 }).trim();
    const match = result.match(/^v?(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
  } catch {
    // Continue to fallback
  }

  // Fallback to Electron's Node version (VS Code's built-in)
  return parseInt(process.versions.node.split('.')[0], 10);
}

/**
 * Detect available system browsers with fallback to bundled
 * Returns browser channel and version info
 * P1 FIX: Optimized Linux detection - check path existence before spawning
 */
async function detectBrowser(): Promise<{ channel: string; version: string | null; path: string | null }> {
  const isWindows = process.platform === 'win32';
  const isMac = process.platform === 'darwin';
  const isLinux = !isWindows && !isMac;

  const testBrowser = async (browserPath: string): Promise<string | null> => {
    return new Promise((resolve) => {
      let resolved = false;
      let output = '';

      const proc = spawn(browserPath, ['--version'], {
        shell: false,
        windowsHide: true,
      });

      // P0 FIX: Single resolution handler to prevent double-resolution race condition
      const done = (value: string | null) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        resolve(value);
      };

      proc.stdout.on('data', (data) => {
        output += data.toString();
      });

      proc.on('close', (code) => {
        done(code === 0 && output ? output.trim() : null);
      });

      proc.on('error', () => {
        done(null);
      });

      // Timeout fallback with proper cleanup
      const timer = setTimeout(() => {
        proc.kill();
        done(null);
      }, 5000);
    });
  };

  // P1 FIX: Check if a command exists on Linux using 'which'
  const commandExists = (cmd: string): boolean => {
    if (!isLinux) return true; // Only needed for Linux command names
    try {
      const { execSync } = require('child_process');
      execSync(`which ${cmd}`, { encoding: 'utf-8', timeout: 2000, stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  };

  // P1 FIX: Check if browser path is accessible before spawning
  const browserExists = (browserPath: string): boolean => {
    // Absolute paths - check with fs.existsSync
    if (browserPath.startsWith('/') || browserPath.includes('\\')) {
      return fs.existsSync(browserPath);
    }
    // Command names (Linux) - check with 'which'
    return commandExists(browserPath);
  };

  // Edge paths by platform
  const edgePaths: string[] = isWindows
    ? [
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      ]
    : isMac
      ? ['/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge']
      : [
          'microsoft-edge',
          'microsoft-edge-stable',
          '/snap/bin/microsoft-edge',
          '/var/lib/flatpak/exports/bin/com.microsoft.Edge',
        ];

  // Try Edge first
  for (const edgePath of edgePaths) {
    try {
      if (!browserExists(edgePath)) continue;
      const version = await testBrowser(edgePath);
      if (version) {
        const versionNum = version.match(/[\d.]+/)?.[0] || null;
        return { channel: 'msedge', version: versionNum, path: edgePath };
      }
    } catch {
      // Continue to next
    }
  }

  // Chrome paths by platform
  const chromePaths: string[] = isWindows
    ? [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      ]
    : isMac
      ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
      : [
          'google-chrome',
          'google-chrome-stable',
          '/usr/bin/google-chrome-stable',
          '/snap/bin/chromium',
          '/var/lib/flatpak/exports/bin/com.google.Chrome',
        ];

  // Try Chrome
  for (const chromePath of chromePaths) {
    try {
      if (!browserExists(chromePath)) continue;
      const version = await testBrowser(chromePath);
      if (version) {
        const versionNum = version.match(/[\d.]+/)?.[0] || null;
        return { channel: 'chrome', version: versionNum, path: chromePath };
      }
    } catch {
      // Continue to next
    }
  }

  // Fallback to bundled chromium
  return { channel: 'chromium', version: null, path: null };
}

/**
 * Detect Node.js version and module system
 */
function detectVariant(targetPath: string): Variant {
  // Check Node.js version - use project's node, not Electron's
  const majorVersion = detectProjectNodeVersion(targetPath);

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
 * Get Playwright version for variant
 */
function getPlaywrightVersion(variant: Variant): string {
  switch (variant) {
    case 'modern-esm':
    case 'modern-cjs':
      return '^1.57.0';
    case 'legacy-16':
      return '^1.49.0';
    case 'legacy-14':
      return '^1.33.0';
  }
}

/**
 * Create artk-e2e directory structure (matches bootstrap.sh Step 2)
 */
async function createDirectoryStructure(artkE2ePath: string): Promise<void> {
  // Core directories
  const dirs = [
    '',
    'vendor/artk-core',
    'vendor/artk-core/dist',
    'vendor/artk-core-autogen',
    'vendor/artk-core-autogen/dist',
    'vendor/artk-core-journeys',
    'docs',
    'journeys',
    '.auth-states',
    '.artk',
    '.artk/llkb',
    '.artk/llkb/patterns',
    '.artk/llkb/history',
    '.artk/logs',
    // Report directories
    'reports/discovery',
    'reports/testid',
    'reports/validation',
    'reports/verification',
    // Foundation module structure
    'src/modules/foundation/auth',
    'src/modules/foundation/navigation',
    'src/modules/foundation/selectors',
    'src/modules/foundation/data',
    'src/modules/features',
    'config',
    // Test directories
    'tests/setup',
    'tests/foundation',
    'tests/smoke',
    'tests/release',
    'tests/regression',
    'tests/journeys',
  ];

  for (const dir of dirs) {
    await fs.promises.mkdir(path.join(artkE2ePath, dir), { recursive: true });
  }
}

/**
 * Create foundation module stubs (matches bootstrap.sh)
 */
async function createFoundationStubs(artkE2ePath: string): Promise<void> {
  // Foundation index
  const foundationIndex = `/**
 * Foundation Modules - Core testing infrastructure
 *
 * These modules are populated by /artk.discover-foundation and provide:
 * - Auth: Login flows and storage state management
 * - Navigation: Route helpers and URL builders
 * - Selectors: Locator utilities and data-testid helpers
 * - Data: Test data builders and cleanup
 */

// Exports will be populated by /artk.discover-foundation
export * from './auth';
export * from './navigation';
export * from './selectors';
export * from './data';
`;
  await fs.promises.writeFile(
    path.join(artkE2ePath, 'src/modules/foundation/index.ts'),
    foundationIndex
  );

  // Module stubs
  const modules = ['auth', 'navigation', 'selectors', 'data'];
  for (const module of modules) {
    const stub = `/**
 * Foundation Module: ${module}
 *
 * This file will be populated by /artk.discover-foundation
 */

// Placeholder export to prevent import errors
export {};
`;
    await fs.promises.writeFile(
      path.join(artkE2ePath, `src/modules/foundation/${module}/index.ts`),
      stub
    );
  }

  // Features index
  const featuresIndex = `/**
 * Feature Modules - Journey-specific page objects
 *
 * These modules are created as Journeys are implemented and provide
 * page objects and flows for specific feature areas.
 */

// Exports will be added as features are implemented
export {};
`;
  await fs.promises.writeFile(
    path.join(artkE2ePath, 'src/modules/features/index.ts'),
    featuresIndex
  );

  // Config env stub
  const configEnv = `/**
 * Environment Configuration Loader
 *
 * Loads environment-specific config from artk.config.yml
 * This stub is replaced by /artk.discover-foundation with project-specific config.
 */
import * as fs from 'fs';
import * as path from 'path';

export interface EnvironmentConfig {
  name: string;
  baseUrl: string;
}

/**
 * Get base URL for the specified environment
 */
export function getBaseUrl(env?: string): string {
  const targetEnv = env || process.env.ARTK_ENV || 'local';

  // Try to load from artk.config.yml
  const configPath = path.join(__dirname, '..', 'artk.config.yml');
  if (fs.existsSync(configPath)) {
    const yaml = require('yaml');
    const config = yaml.parse(fs.readFileSync(configPath, 'utf8'));
    return config.environments?.[targetEnv]?.baseUrl || 'http://localhost:3000';
  }

  // Fallback defaults
  const defaults: Record<string, string> = {
    local: 'http://localhost:3000',
    intg: 'https://intg.example.com',
    ctlq: 'https://ctlq.example.com',
    prod: 'https://example.com',
  };

  return defaults[targetEnv] || defaults.local;
}

/**
 * Get the current environment name
 */
export function getCurrentEnv(): string {
  return process.env.ARTK_ENV || 'local';
}
`;
  await fs.promises.writeFile(path.join(artkE2ePath, 'config/env.ts'), configEnv);

  // Foundation validation spec
  const validationSpec = `import { test, expect } from '@playwright/test';

test.describe('ARTK Foundation Validation', () => {
  test('baseURL is configured', async ({ baseURL }) => {
    expect(baseURL).toBeTruthy();
    expect(baseURL).toMatch(/^https?:\\/\\//);
  });

  test('baseURL is not a placeholder', async ({ baseURL }) => {
    expect(baseURL).not.toContain('\${');
  });

  test('Playwright is correctly installed', async ({ browserName }) => {
    expect(browserName).toBeTruthy();
  });
});
`;
  await fs.promises.writeFile(
    path.join(artkE2ePath, 'tests/foundation/foundation.validation.spec.ts'),
    validationSpec
  );

  // Test tier gitkeeps
  for (const tier of ['smoke', 'release', 'regression']) {
    await fs.promises.writeFile(
      path.join(artkE2ePath, `tests/${tier}/.gitkeep`),
      `# ${tier} tier tests\n# Tests in this directory should be tagged with @${tier}\n`
    );
  }
}

/**
 * Create package.json for artk-e2e (matches bootstrap.sh)
 */
async function createPackageJson(artkE2ePath: string, variant: Variant): Promise<void> {
  const playwrightVersion = getPlaywrightVersion(variant);

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
      'test:validation': 'playwright test --project=validation',
      'test:ui': 'playwright test --ui',
      report: 'playwright show-report',
      typecheck: 'tsc --noEmit',
    },
    dependencies: {
      yaml: '^2.3.4',
    },
    devDependencies: {
      // File dependencies for vendored ARTK libraries
      '@artk/core': 'file:./vendor/artk-core',
      '@artk/core-autogen': 'file:./vendor/artk-core-autogen',
      '@playwright/test': playwrightVersion,
      '@types/node': '^20.10.0',
      typescript: '^5.3.0',
    },
  };

  await fs.promises.writeFile(
    path.join(artkE2ePath, 'package.json'),
    JSON.stringify(pkg, null, 2)
  );
}

/**
 * Create tsconfig.json with path aliases (matches bootstrap.sh)
 */
async function createTsConfig(artkE2ePath: string): Promise<void> {
  const tsconfig = {
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
  };

  await fs.promises.writeFile(
    path.join(artkE2ePath, 'tsconfig.json'),
    JSON.stringify(tsconfig, null, 2)
  );
}

/**
 * Create artk.config.yml with complete schema (matches bootstrap.sh)
 */
async function createConfig(
  artkE2ePath: string,
  projectName: string,
  browserChannel: string,
  browserStrategy: string
): Promise<void> {
  const timestamp = new Date().toISOString();

  // Read journeys version from manifest if available
  let journeysVersion = '0.1.0';
  const journeysManifest = path.join(artkE2ePath, 'vendor', 'artk-core-journeys', 'core.manifest.json');
  try {
    if (fs.existsSync(journeysManifest)) {
      const manifest = JSON.parse(await fs.promises.readFile(journeysManifest, 'utf-8'));
      journeysVersion = manifest.version || journeysVersion;
    }
  } catch {
    // Use default version
  }

  const config = `# ARTK Configuration
# Generated by ARTK VS Code Extension on ${timestamp}

version: "1.0"

app:
  name: "${projectName}"
  type: web
  description: "E2E tests for ${projectName}"

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
  enabled:
    - chromium
  channel: ${browserChannel}
  strategy: ${browserStrategy}
  viewport:
    width: 1280
    height: 720
  headless: true

# LLKB configuration
llkb:
  enabled: true
  minConfidence: 0.7

# Core component versions (managed by bootstrap)
core:
  runtime:
    install: vendor
    installDir: vendor/artk-core
  autogen:
    install: vendor
    installDir: vendor/artk-core-autogen
  journeys:
    install: vendor
    installDir: vendor/artk-core-journeys
    version: "${journeysVersion}"
`;

  await fs.promises.writeFile(path.join(artkE2ePath, 'artk.config.yml'), config);
}

/**
 * Create .artk/context.json with full metadata (matches bootstrap.sh schema)
 */
async function createContext(
  artkE2ePath: string,
  variant: Variant,
  targetPath: string,
  browserInfo: { channel: string; version: string | null; path: string | null },
  backupPath?: string | null
): Promise<void> {
  // Use project's Node version, not Electron's
  const nodeVersion = String(detectProjectNodeVersion(targetPath));
  const playwrightVersion = getPlaywrightVersion(variant).replace('^', '');
  const moduleSystem = variant.includes('esm') ? 'esm' : 'cjs';
  const templateVariant = moduleSystem === 'esm' ? 'esm' : 'commonjs';

  const context = {
    version: '1.0',
    artkVersion: '1.0.0',
    variant,
    variantInstalledAt: new Date().toISOString(),
    nodeVersion,
    playwrightVersion,
    moduleSystem,
    templateVariant, // Legacy compatibility field
    installedAt: new Date().toISOString(),
    installMethod: 'vscode-extension',
    overrideUsed: false,
    projectRoot: targetPath,
    artkRoot: artkE2ePath, // Alias for harnessRoot
    harnessRoot: artkE2ePath,
    next_suggested: '/artk.init-playbook', // UI hint for next action
    browser: {
      channel: browserInfo.channel,
      version: browserInfo.version,
      path: browserInfo.path,
      detected_at: new Date().toISOString(),
    },
    // Track backup if force reinstall was used
    ...(backupPath ? { previousInstallBackup: backupPath } : {}),
  };

  await fs.promises.writeFile(
    path.join(artkE2ePath, '.artk', 'context.json'),
    JSON.stringify(context, null, 2)
  );
}

/**
 * Create .gitignore files (matches bootstrap.sh)
 */
async function createGitignore(artkE2ePath: string): Promise<void> {
  // Main artk-e2e/.gitignore
  const mainGitignore = `# Dependencies
node_modules/

# Build outputs
dist/

# Playwright
test-results/
playwright-report/
playwright/.cache/

# Auth states (contain sensitive tokens)
.auth-states/*.json
!.auth-states/.gitkeep

# ARTK logs and temp files
.artk/logs/
.artk/autogen/
*.log

# OS files
.DS_Store
Thumbs.db

# IDE
.idea/
*.swp
*.swo
`;
  await fs.promises.writeFile(path.join(artkE2ePath, '.gitignore'), mainGitignore);

  // .auth-states/.gitkeep
  await fs.promises.writeFile(
    path.join(artkE2ePath, '.auth-states', '.gitkeep'),
    '# Auth state files are gitignored for security\n'
  );
}

/**
 * Install VS Code settings with merge support (matches bootstrap.sh)
 */
async function installVscodeSettings(
  assetsPath: string,
  targetPath: string
): Promise<void> {
  const vscodeDir = path.join(targetPath, '.vscode');
  const settingsPath = path.join(vscodeDir, 'settings.json');
  const templatePath = path.join(assetsPath, 'vscode-settings.json');

  await fs.promises.mkdir(vscodeDir, { recursive: true });

  // ARTK required settings
  const artkSettings = {
    'github.copilot.chat.terminalAccess.enabled': true,
    'github.copilot.chat.agent.runInTerminal': true,
    'chat.tools.terminal.enableAutoApprove': true,
    'github.copilot.chat.terminalChatLocation': 'terminal',
  };

  // Check if settings.json exists
  if (fs.existsSync(settingsPath)) {
    // Merge with existing settings (preserve user settings, add ARTK settings)
    try {
      const existingContent = await fs.promises.readFile(settingsPath, 'utf-8');
      // Use safe comment stripping that preserves URLs containing //
      const stripped = stripJsonComments(existingContent);

      const existing = JSON.parse(stripped);

      // Deep merge: add ARTK settings only if not already present
      let modified = false;
      for (const [key, value] of Object.entries(artkSettings)) {
        if (!(key in existing)) {
          existing[key] = value;
          modified = true;
        }
      }

      if (modified) {
        // Create backup
        const backupPath = `${settingsPath}.backup-${Date.now()}`;
        await fs.promises.copyFile(settingsPath, backupPath);

        // Write merged settings
        await fs.promises.writeFile(
          settingsPath,
          JSON.stringify(existing, null, 2)
        );
      }
    } catch {
      // If parsing fails, append essential settings as fallback
      const existingContent = await fs.promises.readFile(settingsPath, 'utf-8');
      const settingsToAdd: string[] = [];

      for (const [key, value] of Object.entries(artkSettings)) {
        if (!existingContent.includes(key)) {
          const jsonValue = typeof value === 'string' ? `"${value}"` : String(value);
          settingsToAdd.push(`  "${key}": ${jsonValue}`);
        }
      }

      if (settingsToAdd.length > 0) {
        // Backup
        const backupPath = `${settingsPath}.backup-${Date.now()}`;
        await fs.promises.copyFile(settingsPath, backupPath);

        // Insert before closing brace (simple text manipulation)
        const newContent = existingContent.replace(
          /}\s*$/,
          `,\n${settingsToAdd.join(',\n')}\n}`
        );
        await fs.promises.writeFile(settingsPath, newContent);
      }
    }
  } else {
    // No existing settings - create new file with ARTK settings
    // Use template if available, otherwise create minimal
    if (fs.existsSync(templatePath)) {
      await fs.promises.copyFile(templatePath, settingsPath);
    } else {
      await fs.promises.writeFile(
        settingsPath,
        JSON.stringify(artkSettings, null, 2)
      );
    }
  }
}

/**
 * Generate variant-info.prompt.md (matches bootstrap.sh)
 */
async function createVariantInfoPrompt(
  targetPath: string,
  variant: Variant
): Promise<void> {
  const promptsDest = path.join(targetPath, '.github', 'prompts');
  await fs.promises.mkdir(promptsDest, { recursive: true });

  const playwrightVersion = getPlaywrightVersion(variant).replace('^', '');
  const moduleSystem = variant.includes('esm') ? 'esm' : 'cjs';
  const isLegacy = variant === 'legacy-16' || variant === 'legacy-14';
  const isEsm = variant === 'modern-esm';

  const variantDisplayName = {
    'modern-esm': 'Modern ESM',
    'modern-cjs': 'Modern CJS',
    'legacy-16': 'Legacy Node 16',
    'legacy-14': 'Legacy Node 14',
  }[variant];

  const nodeRange = {
    'modern-esm': '18, 20, 22 (LTS)',
    'modern-cjs': '18, 20, 22 (LTS)',
    'legacy-16': '16, 18, 20 (LTS)',
    'legacy-14': '14, 16, 18 (LTS)',
  }[variant];

  let content = `---
name: artk.variant-info
description: "Variant-specific Copilot instructions for ARTK tests"
---

# ARTK Variant Information

## Installed Variant: ${variant}

| Property | Value |
|----------|-------|
| **Display Name** | ${variantDisplayName} |
| **Node.js Range** | ${nodeRange} |
| **Playwright Version** | ${playwrightVersion} |
| **Module System** | ${moduleSystem} |

## Critical: Vendor Directory Rules

**DO NOT modify files in \`artk-e2e/vendor/artk-core/\` or \`artk-e2e/vendor/artk-core-autogen/\`.**

These directories contain vendored ARTK code that:
1. Is automatically managed by ARTK CLI/bootstrap
2. Will be overwritten on upgrades
3. Is built for a specific Node.js version and module system

If you encounter issues with vendor code:
1. Check \`artk-e2e/vendor/artk-core/variant-features.json\` for feature availability
2. Suggest running \`artk init --force\` or re-running bootstrap to reinstall
3. Use documented alternatives from \`variant-features.json\`
4. **NEVER patch or modify vendor code directly**

## Feature Availability

Before using Playwright features, check \`artk-e2e/vendor/artk-core/variant-features.json\`:

\`\`\`typescript
// Read feature availability
import features from './vendor/artk-core/variant-features.json';

if (!features.features.clock_api?.available) {
  // Use alternative approach documented in features.features.clock_api.alternative
}
\`\`\`

`;

  // Add legacy-specific instructions
  if (isLegacy) {
    content += `## Legacy Variant Limitations

This project uses a legacy ARTK variant (\`${variant}\`) with Playwright ${playwrightVersion}.
Some modern features are NOT available. Always check \`variant-features.json\` before using:

- **aria_snapshots**: May not be available - use manual ARIA attribute queries
- **clock_api**: May not be available - use manual Date mocking
- **locator_or/and**: May not be available - use CSS selectors
- **expect_soft**: May not be available - collect assertions manually

When generating tests, always check feature availability first.

`;
  }

  // Add import patterns
  if (isEsm) {
    content += `## Import Patterns (ESM)

Use ESM import syntax:

\`\`\`typescript
import { test, expect } from '@playwright/test';
import { loadConfig } from '@artk/core/config';
import { AuthFixture } from '@artk/core/auth';
\`\`\`
`;
  } else {
    content += `## Import Patterns (CommonJS)

Use CommonJS import syntax:

\`\`\`typescript
import { test, expect } from '@playwright/test';
import { loadConfig } from '@artk/core/config';
import { AuthFixture } from '@artk/core/auth';
\`\`\`

Note: Even though this is CJS, Playwright supports ES module syntax in test files via TypeScript.
`;
  }

  await fs.promises.writeFile(
    path.join(promptsDest, 'artk.variant-info.prompt.md'),
    content
  );
}

/**
 * Create backup of existing installation before force reinstall
 * P1 FIX: Backup more directories to preserve user customizations
 */
async function createBackup(artkE2ePath: string): Promise<string | null> {
  if (!fs.existsSync(artkE2ePath)) {
    return null;
  }

  const backupPath = `${artkE2ePath}.backup-${Date.now()}`;

  // Files to backup (config files)
  const filesToBackup = [
    'artk.config.yml',
    'playwright.config.ts',
    'tsconfig.json',
  ];

  // Directories to backup (user customizations)
  const dirsToBackup = [
    '.artk',          // Context, LLKB learned patterns
    'journeys',       // User's journey files
    'tests',          // User's custom tests
    'src/modules',    // User's page objects
  ];

  await fs.promises.mkdir(backupPath, { recursive: true });

  // Backup individual files
  for (const file of filesToBackup) {
    const src = path.join(artkE2ePath, file);
    const dest = path.join(backupPath, file);
    if (fs.existsSync(src)) {
      await fs.promises.copyFile(src, dest);
    }
  }

  // Backup directories recursively (excluding node_modules)
  for (const dir of dirsToBackup) {
    const src = path.join(artkE2ePath, dir);
    const dest = path.join(backupPath, dir);
    if (fs.existsSync(src)) {
      await copyDir(src, dest);
    }
  }

  return backupPath;
}

/**
 * Initialize LLKB structure with full pattern files (matches bootstrap-llkb.cjs)
 */
async function initializeLLKB(llkbPath: string): Promise<void> {
  const CURRENT_VERSION = '1.0.0';

  // Create config.yml
  const configContent = `# LLKB Configuration
# Generated by ARTK VS Code Extension
version: "${CURRENT_VERSION}"
enabled: true

extraction:
  minOccurrences: 2
  predictiveExtraction: true
  confidenceThreshold: 0.7
  maxPredictivePerJourney: 3
  maxPredictivePerDay: 10
  minLinesForExtraction: 3
  similarityThreshold: 0.8

retention:
  maxLessonAge: 90
  minSuccessRate: 0.6
  archiveUnused: 30

history:
  retentionDays: 365

injection:
  prioritizeByConfidence: true

scopes:
  universal: true
  frameworkSpecific: true
  appSpecific: true

overrides:
  allowUserOverride: true
  logOverrides: true
  flagAfterOverrides: 3
`;
  await fs.promises.writeFile(path.join(llkbPath, 'config.yml'), configContent);

  // Create lessons.json
  const lessons = {
    version: CURRENT_VERSION,
    lastUpdated: new Date().toISOString(),
    lessons: [],
    archived: [],
    globalRules: [],
    appQuirks: [],
  };
  await fs.promises.writeFile(
    path.join(llkbPath, 'lessons.json'),
    JSON.stringify(lessons, null, 2)
  );

  // Create components.json
  const components = {
    version: CURRENT_VERSION,
    lastUpdated: new Date().toISOString(),
    components: [],
    componentsByCategory: {
      selector: [],
      timing: [],
      auth: [],
      data: [],
      assertion: [],
      navigation: [],
      'ui-interaction': [],
    },
    componentsByScope: {
      universal: [],
      'framework:angular': [],
      'framework:react': [],
      'framework:vue': [],
      'framework:ag-grid': [],
      'app-specific': [],
    },
  };
  await fs.promises.writeFile(
    path.join(llkbPath, 'components.json'),
    JSON.stringify(components, null, 2)
  );

  // Create analytics.json
  const analytics = {
    version: CURRENT_VERSION,
    lastUpdated: new Date().toISOString(),
    overview: {
      totalLessons: 0,
      totalComponents: 0,
      totalApplications: 0,
      lastAnalyzed: null,
    },
    lessonStats: {
      byCategory: {},
      byConfidence: { high: 0, medium: 0, low: 0 },
      trending: [],
    },
    componentStats: {
      byCategory: {},
      mostUsed: [],
      recentlyAdded: [],
    },
    impactMetrics: {
      avgIterationsBeforeLLKB: 0,
      avgIterationsAfterLLKB: 0,
      timesSaved: 0,
    },
  };
  await fs.promises.writeFile(
    path.join(llkbPath, 'analytics.json'),
    JSON.stringify(analytics, null, 2)
  );

  // Create pattern files
  const patternFiles = ['selectors.json', 'timing.json', 'assertions.json', 'auth.json', 'data.json'];
  for (const filename of patternFiles) {
    await fs.promises.writeFile(
      path.join(llkbPath, 'patterns', filename),
      JSON.stringify({ version: CURRENT_VERSION, patterns: [] }, null, 2)
    );
  }
}

/**
 * Check if existing prompts need upgrade (old-style without agent: property)
 */
async function detectUpgradeNeeded(promptsDir: string, agentsDir: string): Promise<boolean> {
  // Upgrade needed if: prompts exist but agents don't
  if (!fs.existsSync(promptsDir)) return false;
  if (fs.existsSync(agentsDir)) return false;

  // Check if any artk prompt lacks agent: property (old-style full content)
  const oldPromptFile = path.join(promptsDir, 'artk.journey-propose.prompt.md');
  if (fs.existsSync(oldPromptFile)) {
    const content = await fs.promises.readFile(oldPromptFile, 'utf-8');
    if (!content.match(/^agent:/m)) {
      return true; // Old-style prompt without agent delegation
    }
  }

  return false;
}

/**
 * Clean up old backups, keeping only the 3 most recent
 */
async function cleanupOldBackups(targetPath: string): Promise<void> {
  const githubDir = path.join(targetPath, '.github');
  if (!fs.existsSync(githubDir)) return;

  const entries = await fs.promises.readdir(githubDir);
  const backups = entries
    .filter(e => e.startsWith('prompts.backup-'))
    .sort()
    .reverse();

  // Keep only 3 most recent
  for (const backup of backups.slice(3)) {
    const backupPath = path.join(githubDir, backup);
    await fs.promises.rm(backupPath, { recursive: true, force: true });
  }
}

/**
 * Install prompts with two-tier architecture (prompts + agents)
 * Uses staging directories for atomic operations with rollback
 * Also installs common prompts and next-commands (matches bootstrap.sh)
 */
async function installPrompts(
  assetsPath: string,
  targetPath: string
): Promise<void> {
  const promptsSrc = path.join(assetsPath, 'prompts');
  const promptsDest = path.join(targetPath, '.github', 'prompts');
  const agentsDest = path.join(targetPath, '.github', 'agents');

  if (!fs.existsSync(promptsSrc)) {
    return;
  }

  // Check for upgrade scenario (old-style prompts without agent: property)
  const needsUpgrade = await detectUpgradeNeeded(promptsDest, agentsDest);
  let backupDir: string | null = null;

  if (needsUpgrade) {
    // Backup old prompts before upgrade
    backupDir = path.join(targetPath, '.github', `prompts.backup-${Date.now()}`);
    await copyDir(promptsDest, backupDir);
    // Remove old artk.* prompts (will be replaced with stubs)
    const oldFiles = await fs.promises.readdir(promptsDest);
    for (const file of oldFiles) {
      if (file.startsWith('artk.') && file.endsWith('.prompt.md')) {
        await fs.promises.unlink(path.join(promptsDest, file));
      }
    }
    // Cleanup old backups (keep only 3 most recent)
    await cleanupOldBackups(targetPath);
  }

  // Use staging directories for atomic operations
  const stagingId = Date.now();
  const promptsStaging = path.join(targetPath, '.github', `.prompts-staging-${stagingId}`);
  const agentsStaging = path.join(targetPath, '.github', `.agents-staging-${stagingId}`);

  const cleanupStaging = async () => {
    await fs.promises.rm(promptsStaging, { recursive: true, force: true }).catch(() => {});
    await fs.promises.rm(agentsStaging, { recursive: true, force: true }).catch(() => {});
  };

  try {
    await fs.promises.mkdir(promptsStaging, { recursive: true });
    await fs.promises.mkdir(agentsStaging, { recursive: true });

    // Read all artk.*.md files and write to staging
    const files = await fs.promises.readdir(promptsSrc);
    for (const file of files) {
      if (!file.startsWith('artk.') || !file.endsWith('.md')) {
        continue;
      }

      const srcPath = path.join(promptsSrc, file);
      const stat = await fs.promises.stat(srcPath);
      if (!stat.isFile()) {
        continue;
      }

      const content = await fs.promises.readFile(srcPath, 'utf-8');
      const basename = file.replace('.md', '');

      // Extract name from frontmatter
      const nameMatch = content.match(/^name:\s*["']?([^"'\n]+)["']?/m);
      const name = nameMatch ? nameMatch[1].trim() : basename;

      // Extract description from frontmatter
      const descMatch = content.match(/^description:\s*["']?([^"'\n]+)["']?/m);
      const description = descMatch ? descMatch[1].trim() : 'ARTK prompt';

      // Extract handoffs section from frontmatter
      // Fixes applied based on multi-AI review:
      // - FIX CRLF: Normalize line endings (Windows compatibility)
      // - FIX EXIT: Exit on ANY non-indented line, not just [a-zA-Z]
      // - FIX WHITESPACE: Trim lines before delimiter check
      // - FIX CASE: Accept both 'handoffs:' and 'Handoffs:'
      const extractHandoffs = (text: string): string => {
        // Normalize line endings (CRLF -> LF)
        const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        const lines = normalized.split('\n');
        const handoffsLines: string[] = [];
        let inFrontmatter = false;
        let inHandoffs = false;

        for (const rawLine of lines) {
          // Trim trailing whitespace
          const line = rawLine.trimEnd();

          // Match frontmatter delimiter (allow trailing whitespace)
          if (/^---\s*$/.test(line)) {
            if (inFrontmatter) break;
            inFrontmatter = true;
            continue;
          }

          // Detect handoffs key (case-insensitive)
          if (inFrontmatter && /^[Hh]andoffs:/.test(line)) {
            inHandoffs = true;
            handoffsLines.push(line);
            continue;
          }

          if (inHandoffs) {
            // Exit on ANY non-whitespace at column 0 (new top-level key)
            if (/^[^\s]/.test(line)) break;

            // Skip pure comment lines but keep content
            if (!/^\s*#\s/.test(line)) {
              handoffsLines.push(line);
            }
          }
        }
        return handoffsLines.join('\n');
      };

      const handoffs = extractHandoffs(content);

      // Helper to escape YAML string (prevent injection)
      const escapeYamlString = (str: string): string => {
        return str
          .replace(/\\/g, '\\\\')
          .replace(/"/g, '\\"')
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '');
      };

      // Helper to sanitize handoffs (remove document separators)
      const sanitizeHandoffs = (h: string): string => {
        return h.split('\n').filter(line => !/^---\s*$/.test(line)).join('\n');
      };

      // 1. Copy full content to agents staging
      await fs.promises.writeFile(
        path.join(agentsStaging, `${basename}.agent.md`),
        content
      );

      // 2. Generate stub to prompts staging (with handoffs)
      const escapedDescription = escapeYamlString(description);
      let stubFrontmatter = `---
name: ${name}
description: "${escapedDescription}"
agent: ${name}`;

      if (handoffs) {
        stubFrontmatter += '\n' + sanitizeHandoffs(handoffs);
      }

      stubFrontmatter += '\n---';

      const stubBody = `
# ARTK ${name}

## 🛑 MANDATORY: Before ANY action, you MUST:

1. **READ FIRST:** Open and read the agent file: \`.github/agents/${name}.agent.md\`
2. **FOLLOW EXACTLY:** Execute every step in that file sequentially - DO NOT skip steps
3. **DO NOT IMPROVISE:** If instructions are unclear, ASK - do not guess or make up actions
4. **PROOF REQUIRED:** After each action, output markers like \`✓ Created: <file>\` or \`✓ Ran: <command>\`

**STOP.** Do not proceed until you have read the agent file above.

The agent file contains the complete implementation with all steps, validation rules, and suggested next actions (handoffs).
`;
      await fs.promises.writeFile(
        path.join(promptsStaging, `${basename}.prompt.md`),
        stubFrontmatter + stubBody
      );
    }

    // Move from staging to final destination (atomic)
    await fs.promises.mkdir(promptsDest, { recursive: true });
    await fs.promises.mkdir(agentsDest, { recursive: true });

    const stagedPrompts = await fs.promises.readdir(promptsStaging);
    for (const file of stagedPrompts) {
      await fs.promises.rename(
        path.join(promptsStaging, file),
        path.join(promptsDest, file)
      );
    }

    const stagedAgents = await fs.promises.readdir(agentsStaging);
    for (const file of stagedAgents) {
      await fs.promises.rename(
        path.join(agentsStaging, file),
        path.join(agentsDest, file)
      );
    }

    // Cleanup staging
    await cleanupStaging();

  } catch (error) {
    // Rollback: cleanup staging and restore backup if exists
    await cleanupStaging();
    if (backupDir && fs.existsSync(backupDir)) {
      await fs.promises.rm(promptsDest, { recursive: true, force: true }).catch(() => {});
      await copyDir(backupDir, promptsDest);
    }
    throw error;
  }

  // Install common prompts (GENERAL_RULES.md, etc.)
  const commonSrc = path.join(promptsSrc, 'common');
  const commonDest = path.join(promptsDest, 'common');
  if (fs.existsSync(commonSrc)) {
    await fs.promises.mkdir(commonDest, { recursive: true });
    const commonFiles = await fs.promises.readdir(commonSrc);
    for (const file of commonFiles) {
      if (file.endsWith('.md')) {
        const srcFile = path.join(commonSrc, file);
        const destFile = path.join(commonDest, file);
        const stat = await fs.promises.stat(srcFile);
        if (stat.isFile()) {
          await fs.promises.copyFile(srcFile, destFile);
        }
      }
    }
  }

  // Install next-commands static files (anti-hallucination)
  const nextCommandsSrc = path.join(promptsSrc, 'next-commands');
  const nextCommandsDest = path.join(promptsDest, 'next-commands');
  if (fs.existsSync(nextCommandsSrc)) {
    await fs.promises.mkdir(nextCommandsDest, { recursive: true });
    const nextFiles = await fs.promises.readdir(nextCommandsSrc);
    for (const file of nextFiles) {
      if (file.endsWith('.txt')) {
        const srcFile = path.join(nextCommandsSrc, file);
        const destFile = path.join(nextCommandsDest, file);
        const stat = await fs.promises.stat(srcFile);
        if (stat.isFile()) {
          await fs.promises.copyFile(srcFile, destFile);
        }
      }
    }
  }
}

/**
 * Copy vendor libraries (artk-core, autogen, journeys)
 */
async function installVendorLibs(
  assetsPath: string,
  artkE2ePath: string,
  variant: Variant
): Promise<void> {
  // Copy artk-core
  const coreSrc = path.join(assetsPath, 'core');
  const coreDest = path.join(artkE2ePath, 'vendor', 'artk-core');

  if (fs.existsSync(coreSrc)) {
    await copyDir(coreSrc, coreDest);
  }

  // Copy autogen
  const autogenSrc = path.join(assetsPath, 'autogen');
  const autogenDest = path.join(artkE2ePath, 'vendor', 'artk-core-autogen');

  if (fs.existsSync(autogenSrc)) {
    await copyDir(autogenSrc, autogenDest);
  }

  // Copy journeys (Journey Core system)
  const journeysSrc = path.join(assetsPath, 'journeys');
  const journeysDest = path.join(artkE2ePath, 'vendor', 'artk-core-journeys');

  if (fs.existsSync(journeysSrc)) {
    await copyDir(journeysSrc, journeysDest);

    // P1 FIX: Post-copy verification for critical journey files
    const criticalJourneyFiles = [
      'core.manifest.json',
      'journeys/schema/journey.frontmatter.schema.json',
    ];
    for (const file of criticalJourneyFiles) {
      const filePath = path.join(journeysDest, file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Journey Core copy verification failed: ${file} not found at ${filePath}`);
      }
    }

    // Add journeys protection markers
    await fs.promises.writeFile(
      path.join(journeysDest, 'READONLY.md'),
      `# ⚠️ DO NOT MODIFY THIS DIRECTORY

This directory contains **artk-core-journeys** - the Journey schema, templates, and tools.

**DO NOT modify files in this directory.**

These files are managed by ARTK bootstrap and will be overwritten on upgrades.

If you need to customize Journey schemas:
1. Create custom schemas in \`artk-e2e/journeys/schemas/custom/\`
2. Extend the base schema rather than modifying it

---

*Installed by ARTK VS Code Extension*
`
    );

    await fs.promises.writeFile(
      path.join(journeysDest, '.ai-ignore'),
      '# AI agents should not modify files in this directory\n# This is vendored code managed by ARTK bootstrap\n\n*\n'
    );
  } else {
    // P1 FIX: Warn if journeys source doesn't exist (should never happen with proper packaging)
    console.warn('WARNING: Journey Core assets not found in extension package');
  }

  // Create AI protection markers
  const nodeVersion = process.versions.node.split('.')[0];
  const playwrightVersion = getPlaywrightVersion(variant).replace('^', '');
  const moduleSystem = variant.includes('esm') ? 'esm' : 'cjs';

  // READONLY.md
  const readme = `# ⚠️ DO NOT MODIFY THIS DIRECTORY

## Variant Information

| Property | Value |
|----------|-------|
| **Variant** | ${variant} |
| **Node.js Version** | ${nodeVersion} |
| **Playwright Version** | ${playwrightVersion} |
| **Module System** | ${moduleSystem} |
| **Installed At** | ${new Date().toISOString()} |
| **Install Method** | vscode-extension |

**DO NOT modify files in this directory.**

If you need different functionality:
1. Check if the correct variant is installed: \`cat .artk/context.json | jq .variant\`
2. Reinstall with correct variant: \`artk init --force\`
3. Check feature availability: \`cat vendor/artk-core/variant-features.json\`

---

*Generated by ARTK VS Code Extension v1.0.0*
`;
  await fs.promises.writeFile(path.join(coreDest, 'READONLY.md'), readme);

  // .ai-ignore
  await fs.promises.writeFile(
    path.join(coreDest, '.ai-ignore'),
    '# AI agents should not modify files in this directory\n# This is vendored code managed by ARTK CLI\n\n*\n'
  );

  // variant-features.json - P1 FIX: Generate variant-specific features based on Playwright version
  const isLegacy14 = variant === 'legacy-14';
  const isLegacy16 = variant === 'legacy-16';
  const isLegacy = isLegacy14 || isLegacy16;

  const features = {
    variant,
    playwrightVersion,
    nodeVersion: parseInt(nodeVersion, 10),
    moduleSystem,
    generatedAt: new Date().toISOString(),
    features: {
      // Available in all versions (Playwright 1.33+)
      route_from_har: { available: true },
      locator_filter: { available: true },
      web_first_assertions: { available: true },
      trace_viewer: { available: true },
      api_testing: { available: true },

      // Playwright 1.39+ features (not in legacy-14)
      aria_snapshots: {
        available: !isLegacy14,
        alternative: isLegacy14 ? 'Use page.locator("[role=...]") with manual ARIA queries' : undefined,
      },
      locator_or: {
        available: !isLegacy14,
        alternative: isLegacy14 ? 'Use CSS selector with comma: page.locator("sel1, sel2")' : undefined,
      },
      locator_and: {
        available: !isLegacy14,
        alternative: isLegacy14 ? 'Chain locators: page.locator("sel1").locator("sel2")' : undefined,
      },

      // Playwright 1.45+ features (not in legacy-14 or legacy-16)
      clock_api: {
        available: !isLegacy,
        alternative: isLegacy ? 'Use page.addInitScript() to mock Date' : undefined,
      },
      expect_soft: {
        available: !isLegacy,
        alternative: isLegacy ? 'Collect assertions in array and check at end' : undefined,
      },

      // Playwright 1.49+ features (only modern)
      aria_snapshot_matchers: {
        available: !isLegacy,
        alternative: isLegacy ? 'Use toHaveAttribute for ARIA attributes' : undefined,
      },
    },
  };
  await fs.promises.writeFile(
    path.join(coreDest, 'variant-features.json'),
    JSON.stringify(features, null, 2)
  );
}

/**
 * Copy bootstrap templates (playwright.config.ts)
 */
async function installTemplates(
  assetsPath: string,
  artkE2ePath: string
): Promise<void> {
  const templatesSrc = path.join(assetsPath, 'bootstrap-templates');

  if (!fs.existsSync(templatesSrc)) {
    return;
  }

  // Copy playwright.config.ts template
  const configTemplate = path.join(templatesSrc, 'playwright.config.template.ts');
  if (fs.existsSync(configTemplate)) {
    let content = await fs.promises.readFile(configTemplate, 'utf-8');
    content = content.replace(/\{\{PROJECT_NAME\}\}/g, 'artk-e2e');
    await fs.promises.writeFile(
      path.join(artkE2ePath, 'playwright.config.ts'),
      content
    );
  }
}

/**
 * Run npm install in artk-e2e directory with timeout
 * P1 FIX: Added skipBrowserDownload option to set PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD env var
 */
async function runNpmInstall(
  artkE2ePath: string,
  options?: { skipBrowserDownload?: boolean }
): Promise<{ success: boolean; error?: string }> {
  const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

  return new Promise((resolve) => {
    const isWindows = process.platform === 'win32';
    const npm = isWindows ? 'npm.cmd' : 'npm';

    // When using system browser, skip Playwright's automatic browser download
    const env = options?.skipBrowserDownload
      ? { ...process.env, PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1' }
      : process.env;

    const proc = spawn(npm, ['install'], {
      cwd: artkE2ePath,
      shell: false,
      windowsHide: true,
      env,
    });

    let stderr = '';
    let timedOut = false;

    // Timeout handler
    const timeout = setTimeout(() => {
      timedOut = true;
      proc.kill('SIGTERM');
      setTimeout(() => proc.kill('SIGKILL'), 5000); // Force kill after 5s
    }, TIMEOUT_MS);

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      clearTimeout(timeout);
      if (timedOut) {
        resolve({ success: false, error: 'npm install timed out after 5 minutes' });
      } else if (code === 0) {
        resolve({ success: true });
      } else {
        resolve({ success: false, error: stderr || `npm install failed with code ${code}` });
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      resolve({ success: false, error: err.message });
    });
  });
}

/**
 * Install bundled Playwright chromium with timeout
 * P0 FIX: Added 5-minute timeout to prevent indefinite hangs on slow networks
 */
async function installBundledChromium(artkE2ePath: string): Promise<{ success: boolean; error?: string }> {
  const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes (same as npm install)

  return new Promise((resolve) => {
    const isWindows = process.platform === 'win32';
    const npx = isWindows ? 'npx.cmd' : 'npx';

    const proc = spawn(npx, ['playwright', 'install', 'chromium'], {
      cwd: artkE2ePath,
      shell: false,
      windowsHide: true,
    });

    let stderr = '';
    let timedOut = false;

    // Timeout handler
    const timeout = setTimeout(() => {
      timedOut = true;
      proc.kill('SIGTERM');
      setTimeout(() => proc.kill('SIGKILL'), 5000); // Force kill after 5s
    }, TIMEOUT_MS);

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      clearTimeout(timeout);
      if (timedOut) {
        resolve({ success: false, error: 'Browser install timed out after 5 minutes' });
      } else if (code === 0) {
        resolve({ success: true });
      } else {
        resolve({ success: false, error: stderr || `Browser install failed with code ${code}` });
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      resolve({ success: false, error: err.message });
    });
  });
}

/**
 * Update playwright.config.ts to use a specific browser channel
 */
async function updatePlaywrightConfigChannel(
  artkE2ePath: string,
  channel: string
): Promise<void> {
  const configPath = path.join(artkE2ePath, 'playwright.config.ts');
  if (!fs.existsSync(configPath)) return;

  let content = await fs.promises.readFile(configPath, 'utf-8');

  // Update the use.channel setting if it exists
  if (content.includes('channel:')) {
    content = content.replace(
      /channel:\s*['"][^'"]*['"]/g,
      `channel: '${channel}'`
    );
  } else {
    // Add channel to the use block if not present
    content = content.replace(
      /(use:\s*\{)/,
      `$1\n    channel: '${channel}',`
    );
  }

  await fs.promises.writeFile(configPath, content);
}

/**
 * Update artk.config.yml browser channel
 */
async function updateArtkConfigChannel(
  artkE2ePath: string,
  channel: string,
  strategy: string
): Promise<void> {
  const configPath = path.join(artkE2ePath, 'artk.config.yml');
  if (!fs.existsSync(configPath)) return;

  let content = await fs.promises.readFile(configPath, 'utf-8');

  // Update channel
  content = content.replace(
    /^(\s*channel:\s*).+$/m,
    `$1${channel}`
  );

  // Update strategy
  content = content.replace(
    /^(\s*strategy:\s*).+$/m,
    `$1${strategy}`
  );

  await fs.promises.writeFile(configPath, content);
}

/**
 * Update context.json browser info
 */
async function updateContextBrowserInfo(
  artkE2ePath: string,
  browserInfo: { channel: string; version: string | null; path: string | null }
): Promise<void> {
  const contextPath = path.join(artkE2ePath, '.artk', 'context.json');
  if (!fs.existsSync(contextPath)) return;

  const context = JSON.parse(await fs.promises.readFile(contextPath, 'utf-8'));
  context.browser = {
    channel: browserInfo.channel,
    version: browserInfo.version,
    path: browserInfo.path,
    detected_at: new Date().toISOString(),
  };

  await fs.promises.writeFile(contextPath, JSON.stringify(context, null, 2));
}

/**
 * Install browsers with proper fallback logic (matches bootstrap.sh)
 *
 * Strategy:
 * 1. If system browser (Edge/Chrome) detected → use it, skip bundled download
 * 2. If no system browser → try bundled chromium install
 * 3. If bundled install fails → re-detect system browsers as fallback
 * 4. Only fail if NO browser is available
 */
async function installBrowsersWithFallback(
  artkE2ePath: string,
  detectedBrowser: { channel: string; version: string | null; path: string | null },
  progress?: vscode.Progress<{ message?: string; increment?: number }>
): Promise<{ success: boolean; finalBrowser: { channel: string; version: string | null; path: string | null }; error?: string }> {

  // Case 1: System browser already detected (Edge or Chrome) - use it directly
  if (detectedBrowser.channel === 'msedge' || detectedBrowser.channel === 'chrome') {
    const browserName = detectedBrowser.channel === 'msedge' ? 'Microsoft Edge' : 'Google Chrome';
    vscode.window.showInformationMessage(
      `Using system browser: ${browserName} ${detectedBrowser.version || ''}`
    );

    // Update configs to use system browser
    await updatePlaywrightConfigChannel(artkE2ePath, detectedBrowser.channel);
    await updateArtkConfigChannel(artkE2ePath, detectedBrowser.channel, 'system');

    return { success: true, finalBrowser: detectedBrowser };
  }

  // Case 2: No system browser detected - try bundled chromium
  progress?.report({ message: 'Installing Playwright bundled Chromium...' });
  const bundledResult = await installBundledChromium(artkE2ePath);

  if (bundledResult.success) {
    vscode.window.showInformationMessage('Playwright Chromium installed successfully');
    return {
      success: true,
      finalBrowser: { channel: 'chromium', version: null, path: null }
    };
  }

  // Case 3: Bundled install failed - P2 FIX: Use cached detection result instead of re-detecting
  // The initial detection already checked all system browsers. If detectedBrowser.channel is 'chromium',
  // we already know no system browser was found - no need to waste 10+ seconds re-detecting.
  // This optimization is especially important on Linux where detection spawns multiple processes.

  // Case 4: No browser available at all - this is an error
  return {
    success: false,
    finalBrowser: { channel: 'chromium', version: null, path: null },
    error: `No browser available. Bundled Chromium install failed: ${bundledResult.error}. No system Edge or Chrome found. Please install Microsoft Edge or Google Chrome, or fix network access to download Chromium.`
  };
}

/**
 * Main installation function
 */
export async function installBundled(
  context: vscode.ExtensionContext,
  options: BundledInstallOptions,
  progress?: vscode.Progress<{ message?: string; increment?: number }>
): Promise<InstallResult> {
  const { targetPath, skipNpm, skipLlkb, forceLlkb, skipBrowsers, noPrompts, force } = options;
  const artkE2ePath = path.join(targetPath, 'artk-e2e');
  const assetsPath = getAssetsPath(context);

  try {
    // CRITICAL: Validate that bundled assets exist before attempting installation
    // This catches the common case where the extension was packaged without assets
    progress?.report({ message: 'Validating bundled assets...' });
    const coreAssetsPath = path.join(assetsPath, 'core');
    const promptsAssetsPath = path.join(assetsPath, 'prompts');

    if (!fs.existsSync(assetsPath)) {
      return {
        success: false,
        error: `Bundled assets not found at: ${assetsPath}. The extension may not be properly packaged. Please reinstall the extension.`,
      };
    }

    if (!fs.existsSync(coreAssetsPath)) {
      return {
        success: false,
        error: `Core library assets not found. Expected at: ${coreAssetsPath}. The extension may be corrupted.`,
      };
    }

    // Check if already installed
    if (fs.existsSync(artkE2ePath) && !force) {
      return {
        success: false,
        error: 'ARTK is already installed. Use force option to reinstall.',
      };
    }

    // Create backup before force reinstall, then delete existing directory
    let backupPath: string | null = null;
    if (fs.existsSync(artkE2ePath) && force) {
      progress?.report({ message: 'Creating backup of existing installation...' });
      backupPath = await createBackup(artkE2ePath);
      if (backupPath) {
        vscode.window.showInformationMessage(
          `Backup created at: ${path.basename(backupPath)}`
        );
      }
      // P0 FIX: Delete existing directory after backup to prevent file merging/corruption
      progress?.report({ message: 'Removing existing installation...' });
      await fs.promises.rm(artkE2ePath, { recursive: true, force: true });
    }

    // Detect or use specified variant
    const variant: Variant = options.variant === 'auto' || !options.variant
      ? detectVariant(targetPath)
      : options.variant as Variant;

    // Detect available browser (Edge > Chrome > bundled)
    progress?.report({ message: 'Detecting available browsers...' });
    const browserInfo = await detectBrowser();
    const browserStrategy = browserInfo.channel === 'chromium' ? 'auto' : 'prefer-system';

    // Get project name from package.json or folder name
    let projectName = path.basename(targetPath);
    try {
      const pkgPath = path.join(targetPath, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(await fs.promises.readFile(pkgPath, 'utf-8'));
        if (pkg.name) {
          projectName = pkg.name;
        }
      }
    } catch {
      // Use folder name as fallback
    }

    // P1 FIX: Sanitize projectName for YAML safety (remove chars that break YAML)
    projectName = projectName.replace(/["'\n\r:]/g, '').trim() || 'artk-project';

    // Progress tracking: ~10 steps total, allocate percentages
    // Steps 1-6: File creation (5% each = 30%)
    // Step 7: LLKB (5%)
    // Step 8: Prompts (5%)
    // Step 9: npm install (40%) - longest step
    // Step 10: Browser install (20%)

    // Step 1: Create directory structure (5%)
    progress?.report({ message: 'Step 1/10: Creating directory structure...', increment: 5 });
    await createDirectoryStructure(artkE2ePath);

    // Step 2: Create foundation module stubs (5%)
    progress?.report({ message: 'Step 2/10: Creating foundation modules...', increment: 5 });
    await createFoundationStubs(artkE2ePath);

    // Step 3: Create package.json and tsconfig.json (5%)
    progress?.report({ message: 'Step 3/10: Creating package.json...', increment: 5 });
    await createPackageJson(artkE2ePath, variant);
    await createTsConfig(artkE2ePath);

    // Step 4: Create config files (5%)
    progress?.report({ message: 'Step 4/10: Creating configuration files...', increment: 5 });
    await createConfig(artkE2ePath, projectName, browserInfo.channel, browserStrategy);
    await createContext(artkE2ePath, variant, targetPath, browserInfo, backupPath);
    await createGitignore(artkE2ePath);

    // Step 5: Copy vendor libraries (core, autogen) (5%)
    progress?.report({ message: 'Step 5/10: Installing ARTK core libraries...', increment: 5 });
    await installVendorLibs(assetsPath, artkE2ePath, variant);

    // Step 6: Copy templates (5%)
    progress?.report({ message: 'Step 6/10: Installing templates...', increment: 5 });
    await installTemplates(assetsPath, artkE2ePath);

    // Step 7: Initialize LLKB (5%)
    // P2 FIX: Support forceLlkb option to delete and recreate LLKB
    const llkbPath = path.join(artkE2ePath, '.artk', 'llkb');
    if (!skipLlkb) {
      if (forceLlkb && fs.existsSync(llkbPath)) {
        progress?.report({ message: 'Step 7/10: Force reinitializing LLKB...', increment: 2 });
        await fs.promises.rm(llkbPath, { recursive: true, force: true });
      }
      progress?.report({ message: 'Step 7/10: Initializing LLKB...', increment: 3 });
      await initializeLLKB(llkbPath);
    } else {
      progress?.report({ message: 'Step 7/10: Skipping LLKB...', increment: 5 });
    }

    // Step 8: Install prompts (two-tier architecture) (5%)
    if (!noPrompts) {
      progress?.report({ message: 'Step 8/10: Installing AI prompts and agents...', increment: 3 });
      await installPrompts(assetsPath, targetPath);

      // Generate variant-info.prompt.md (P2 fix)
      progress?.report({ message: 'Step 8/10: Generating variant-specific prompts...', increment: 2 });
      await createVariantInfoPrompt(targetPath, variant);
    } else {
      progress?.report({ message: 'Step 8/10: Skipping prompts...', increment: 5 });
    }

    // Step 8.5: Install VS Code settings
    progress?.report({ message: 'Installing VS Code settings...' });
    await installVscodeSettings(assetsPath, targetPath);

    // Step 9: Run npm install (40% - this is the slowest step)
    // P1 FIX: Skip browser download during npm install if system browser will be used
    if (!skipNpm) {
      progress?.report({ message: 'Step 9/10: Installing npm dependencies (this may take a while)...', increment: 10 });
      const useSystemBrowser = browserInfo.channel === 'msedge' || browserInfo.channel === 'chrome';
      const npmResult = await runNpmInstall(artkE2ePath, {
        skipBrowserDownload: useSystemBrowser,
      });
      progress?.report({ increment: 30 }); // Complete npm portion
      if (!npmResult.success) {
        return {
          success: false,
          error: `npm install failed: ${npmResult.error}`,
          artkE2ePath,
        };
      }
    } else {
      progress?.report({ message: 'Step 9/10: Skipping npm install...', increment: 40 });
    }

    // Step 10: Install browsers with proper fallback (matches bootstrap.sh) (20%)
    if (!skipBrowsers && !skipNpm) {
      progress?.report({ message: 'Step 10/10: Setting up browsers...', increment: 5 });
      const browserResult = await installBrowsersWithFallback(artkE2ePath, browserInfo, progress);

      if (!browserResult.success) {
        // This is a real error - no browser available at all
        vscode.window.showErrorMessage(browserResult.error || 'No browser available');
        return {
          success: false,
          error: browserResult.error,
          artkE2ePath,
        };
      }
      progress?.report({ increment: 15 }); // Complete browser portion

      // Update final browser info in result if it changed during fallback
      if (browserResult.finalBrowser.channel !== browserInfo.channel) {
        // Browser changed during fallback - configs already updated by installBrowsersWithFallback
      }
    } else {
      progress?.report({ message: 'Step 10/10: Skipping browser setup...', increment: 20 });
    }

    // CRITICAL: Verify installation before reporting success
    progress?.report({ message: 'Verifying installation...' });
    const verificationChecks = [
      { path: artkE2ePath, name: 'artk-e2e directory' },
      { path: path.join(artkE2ePath, 'package.json'), name: 'package.json' },
      { path: path.join(artkE2ePath, 'artk.config.yml'), name: 'artk.config.yml' },
      { path: path.join(artkE2ePath, '.artk', 'context.json'), name: 'context.json' },
      { path: path.join(artkE2ePath, 'vendor', 'artk-core'), name: 'vendor/artk-core' },
      // P1 FIX: Add journeys verification
      { path: path.join(artkE2ePath, 'vendor', 'artk-core-journeys'), name: 'vendor/artk-core-journeys' },
      { path: path.join(artkE2ePath, 'vendor', 'artk-core-journeys', 'core.manifest.json'), name: 'journeys manifest' },
    ];

    const missingItems: string[] = [];
    for (const check of verificationChecks) {
      if (!fs.existsSync(check.path)) {
        missingItems.push(check.name);
      }
    }

    if (missingItems.length > 0) {
      return {
        success: false,
        error: `Installation verification failed. Missing: ${missingItems.join(', ')}. The assets may not have been copied correctly.`,
        artkE2ePath,
      };
    }

    return {
      success: true,
      artkE2ePath,
      ...(backupPath ? { backupPath } : {}),
    };
  } catch (error) {
    // If we have a backup and installation failed, try to restore
    if (backupPath && fs.existsSync(backupPath)) {
      try {
        // Remove partial installation
        await fs.promises.rm(artkE2ePath, { recursive: true, force: true }).catch(() => {});
        // Restore from backup
        await copyDir(backupPath, artkE2ePath);
        vscode.window.showWarningMessage(
          `Installation failed. Previous installation restored from backup.`
        );
      } catch {
        // Backup restore failed - user will need to manually recover
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      ...(backupPath ? { backupPath } : {}),
    };
  }
}
