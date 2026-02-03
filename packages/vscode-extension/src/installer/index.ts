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
}

type Variant = 'modern-esm' | 'modern-cjs' | 'legacy-16' | 'legacy-14';

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
function detectVariant(targetPath: string): Variant {
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
 * Create package.json for artk-e2e
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
  enabled:
    - chromium
  channel: chromium
  strategy: auto
  viewport:
    width: 1280
    height: 720
  headless: true

# LLKB configuration
llkb:
  enabled: true
  minConfidence: 0.7
`;

  await fs.promises.writeFile(path.join(artkE2ePath, 'artk.config.yml'), config);
}

/**
 * Create .artk/context.json with full metadata
 */
async function createContext(
  artkE2ePath: string,
  variant: Variant,
  targetPath: string
): Promise<void> {
  const nodeVersion = process.versions.node;
  const playwrightVersion = getPlaywrightVersion(variant).replace('^', '');
  const moduleSystem = variant.includes('esm') ? 'esm' : 'cjs';

  const context = {
    version: '1.0',
    artkVersion: '1.0.0',
    variant,
    nodeVersion,
    playwrightVersion,
    moduleSystem,
    installedAt: new Date().toISOString(),
    installMethod: 'vscode-extension',
    projectRoot: targetPath,
    harnessRoot: artkE2ePath,
    browser: {
      channel: 'chromium',
      version: null,
      path: null,
      detected_at: new Date().toISOString(),
    },
  };

  await fs.promises.writeFile(
    path.join(artkE2ePath, '.artk', 'context.json'),
    JSON.stringify(context, null, 2)
  );
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
 * Install prompts with two-tier architecture (prompts + agents)
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

  await fs.promises.mkdir(promptsDest, { recursive: true });
  await fs.promises.mkdir(agentsDest, { recursive: true });

  // Read all artk.*.md files
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

    // 1. Copy full content to agents/
    await fs.promises.writeFile(
      path.join(agentsDest, `${basename}.agent.md`),
      content
    );

    // 2. Generate stub to prompts/
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
      path.join(promptsDest, `${basename}.prompt.md`),
      stub
    );
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
    const variant: Variant = options.variant === 'auto' || !options.variant
      ? detectVariant(targetPath)
      : options.variant as Variant;

    // Step 1: Create directory structure
    progress?.report({ message: 'Creating directory structure...' });
    await createDirectoryStructure(artkE2ePath);

    // Step 2: Create foundation module stubs
    progress?.report({ message: 'Creating foundation modules...' });
    await createFoundationStubs(artkE2ePath);

    // Step 3: Create package.json
    progress?.report({ message: 'Creating package.json...' });
    await createPackageJson(artkE2ePath, variant);

    // Step 4: Create config files
    progress?.report({ message: 'Creating configuration files...' });
    await createConfig(artkE2ePath);
    await createContext(artkE2ePath, variant, targetPath);

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
    }

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

    // Step 10: Install browsers
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
