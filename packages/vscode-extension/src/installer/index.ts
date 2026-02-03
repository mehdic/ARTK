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
 */
async function detectBrowser(): Promise<{ channel: string; version: string | null; path: string | null }> {
  const isWindows = process.platform === 'win32';
  const isMac = process.platform === 'darwin';

  const testBrowser = async (browserPath: string): Promise<string | null> => {
    return new Promise((resolve) => {
      const proc = spawn(browserPath, ['--version'], {
        shell: false,
        windowsHide: true,
        timeout: 5000,
      });

      let output = '';
      proc.stdout.on('data', (data) => {
        output += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0 && output) {
          resolve(output.trim());
        } else {
          resolve(null);
        }
      });

      proc.on('error', () => {
        resolve(null);
      });

      // Timeout fallback
      setTimeout(() => {
        proc.kill();
        resolve(null);
      }, 5000);
    });
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
      if (isWindows && !fs.existsSync(edgePath)) continue;
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
      if (isWindows && !fs.existsSync(chromePath)) continue;
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
 */
async function createBackup(artkE2ePath: string): Promise<string | null> {
  if (!fs.existsSync(artkE2ePath)) {
    return null;
  }

  const backupPath = `${artkE2ePath}.backup-${Date.now()}`;

  // Copy key files only (not node_modules)
  const filesToBackup = [
    'artk.config.yml',
    'playwright.config.ts',
    'tsconfig.json',
    '.artk/context.json',
  ];

  await fs.promises.mkdir(backupPath, { recursive: true });
  await fs.promises.mkdir(path.join(backupPath, '.artk'), { recursive: true });

  for (const file of filesToBackup) {
    const src = path.join(artkE2ePath, file);
    const dest = path.join(backupPath, file);
    if (fs.existsSync(src)) {
      await fs.promises.copyFile(src, dest);
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

      // 1. Copy full content to agents staging
      await fs.promises.writeFile(
        path.join(agentsStaging, `${basename}.agent.md`),
        content
      );

      // 2. Generate stub to prompts staging
      const stub = `---
name: ${name}
description: "${description}"
agent: ${name}
---
# ARTK ${name}

This prompt delegates to the \`@${name}\` agent for full functionality including suggested next actions (handoffs).

Run \`/${name}\` to start, or select \`@${name}\` from the agent picker.
`;
      await fs.promises.writeFile(
        path.join(promptsStaging, `${basename}.prompt.md`),
        stub
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

  // variant-features.json
  const features = {
    variant,
    playwrightVersion,
    nodeVersion: parseInt(nodeVersion, 10),
    moduleSystem,
    generatedAt: new Date().toISOString(),
    features: {
      route_from_har: { available: true },
      locator_filter: { available: true },
      web_first_assertions: { available: true },
      trace_viewer: { available: true },
      api_testing: { available: true },
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
 */
async function runNpmInstall(artkE2ePath: string): Promise<{ success: boolean; error?: string }> {
  const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

  return new Promise((resolve) => {
    const isWindows = process.platform === 'win32';
    const npm = isWindows ? 'npm.cmd' : 'npm';

    const proc = spawn(npm, ['install'], {
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
 * Install bundled Playwright chromium
 */
async function installBundledChromium(artkE2ePath: string): Promise<{ success: boolean; error?: string }> {
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

  // Case 3: Bundled install failed - try to detect system browsers as fallback
  progress?.report({ message: 'Bundled install failed, checking for system browsers...' });
  const fallbackBrowser = await detectBrowser();

  if (fallbackBrowser.channel === 'msedge' || fallbackBrowser.channel === 'chrome') {
    const browserName = fallbackBrowser.channel === 'msedge' ? 'Microsoft Edge' : 'Google Chrome';
    vscode.window.showWarningMessage(
      `Bundled Chromium install failed. Falling back to system browser: ${browserName}`
    );

    // Update all configs to use the fallback system browser
    await updatePlaywrightConfigChannel(artkE2ePath, fallbackBrowser.channel);
    await updateArtkConfigChannel(artkE2ePath, fallbackBrowser.channel, 'system');
    await updateContextBrowserInfo(artkE2ePath, fallbackBrowser);

    return { success: true, finalBrowser: fallbackBrowser };
  }

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

    // Create backup before force reinstall
    let backupPath: string | null = null;
    if (fs.existsSync(artkE2ePath) && force) {
      progress?.report({ message: 'Creating backup of existing installation...' });
      backupPath = await createBackup(artkE2ePath);
      if (backupPath) {
        vscode.window.showInformationMessage(
          `Backup created at: ${path.basename(backupPath)}`
        );
      }
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

    // Step 1: Create directory structure
    progress?.report({ message: 'Creating directory structure...' });
    await createDirectoryStructure(artkE2ePath);

    // Step 2: Create foundation module stubs
    progress?.report({ message: 'Creating foundation modules...' });
    await createFoundationStubs(artkE2ePath);

    // Step 3: Create package.json and tsconfig.json
    progress?.report({ message: 'Creating package.json...' });
    await createPackageJson(artkE2ePath, variant);
    await createTsConfig(artkE2ePath);

    // Step 4: Create config files
    progress?.report({ message: 'Creating configuration files...' });
    await createConfig(artkE2ePath, projectName, browserInfo.channel, browserStrategy);
    await createContext(artkE2ePath, variant, targetPath, browserInfo, backupPath);
    await createGitignore(artkE2ePath);

    // Step 5: Copy vendor libraries (core, autogen)
    progress?.report({ message: 'Installing ARTK core libraries...' });
    await installVendorLibs(assetsPath, artkE2ePath, variant);

    // Step 6: Copy templates
    progress?.report({ message: 'Installing templates...' });
    await installTemplates(assetsPath, artkE2ePath);

    // Step 7: Initialize LLKB
    if (!skipLlkb) {
      progress?.report({ message: 'Initializing LLKB...' });
      await initializeLLKB(path.join(artkE2ePath, '.artk', 'llkb'));
    }

    // Step 8: Install prompts (two-tier architecture)
    if (!noPrompts) {
      progress?.report({ message: 'Installing AI prompts and agents...' });
      await installPrompts(assetsPath, targetPath);

      // Generate variant-info.prompt.md (P2 fix)
      progress?.report({ message: 'Generating variant-specific prompts...' });
      await createVariantInfoPrompt(targetPath, variant);
    }

    // Step 8.5: Install VS Code settings (P1 fix)
    progress?.report({ message: 'Installing VS Code settings...' });
    await installVscodeSettings(assetsPath, targetPath);

    // Step 9: Run npm install
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

    // Step 10: Install browsers with proper fallback (matches bootstrap.sh)
    if (!skipBrowsers && !skipNpm) {
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

      // Update final browser info in result if it changed during fallback
      if (browserResult.finalBrowser.channel !== browserInfo.channel) {
        // Browser changed during fallback - configs already updated by installBrowsersWithFallback
      }
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
