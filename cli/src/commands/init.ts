/**
 * ARTK CLI - Init Command
 *
 * Initializes ARTK in a target project with automatic variant detection.
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  VariantId,
  ArtkContext,
  InstallOptions,
} from '../utils/variant-types.js';
import {
  selectVariant,
  hasExistingInstallation,
  validateVariantCompatibility,
  getNodeMajorVersion,
} from '../utils/variant-detector.js';
import {
  getVariantDefinition,
  VARIANT_DEFINITIONS,
  getVariantHelpText,
  MIN_NODE_VERSION,
} from '../utils/variant-definitions.js';
import { createInstallLogger } from '../utils/install-logger.js';
import { createLockManager } from '../utils/lock-manager.js';
import { rollback, needsRollback } from '../utils/rollback.js';
import { isVariantId } from '../utils/variant-types.js';

/**
 * ARTK version (should be read from package.json in production).
 */
const ARTK_VERSION = '1.0.0';

/**
 * Init command options.
 */
export interface InitOptions {
  targetPath: string;
  variant?: string;
  force?: boolean;
  skipNpm?: boolean;
  skipBrowsers?: boolean;
}

/**
 * Init command result.
 */
export interface InitResult {
  success: boolean;
  variant?: VariantId;
  error?: string;
  warnings?: string[];
}

/**
 * Execute the init command.
 */
export async function init(options: InitOptions): Promise<InitResult> {
  const { targetPath, variant, force, skipNpm, skipBrowsers } = options;
  const warnings: string[] = [];

  // Validate target path
  if (!fs.existsSync(targetPath)) {
    return {
      success: false,
      error: `Target directory does not exist: ${targetPath}`,
    };
  }

  // Check Node.js version
  const nodeVersion = getNodeMajorVersion();
  if (nodeVersion < MIN_NODE_VERSION) {
    return {
      success: false,
      error: `Node.js ${nodeVersion} is not supported. ARTK requires Node.js ${MIN_NODE_VERSION} or higher.`,
    };
  }

  // Initialize logging and lock manager
  const logger = createInstallLogger(targetPath);
  const lockManager = createLockManager(targetPath);

  // Try to acquire lock
  const { acquired, error: lockError } = lockManager.acquire('install');
  if (!acquired) {
    return {
      success: false,
      error: lockError || 'Failed to acquire installation lock',
    };
  }

  try {
    // Check for existing installation
    if (hasExistingInstallation(targetPath) && !force) {
      lockManager.release();
      return {
        success: false,
        error:
          'ARTK is already installed in this project. Use --force to overwrite.',
      };
    }

    // Check for partial installation that needs rollback
    const rollbackCheck = needsRollback(targetPath);
    if (rollbackCheck.needed) {
      warnings.push(`Cleaning up partial installation: ${rollbackCheck.reason}`);
      rollback(targetPath, rollbackCheck.reason || 'Partial installation cleanup');
    }

    // Validate and select variant
    let selectedVariant: VariantId;

    if (variant) {
      // User specified a variant
      if (!isVariantId(variant)) {
        lockManager.release();
        return {
          success: false,
          error: `Invalid variant: ${variant}\n\n${getVariantHelpText()}`,
        };
      }

      const compatibility = validateVariantCompatibility(variant, nodeVersion);
      if (!compatibility.valid) {
        lockManager.release();
        return {
          success: false,
          error: compatibility.error,
        };
      }

      selectedVariant = variant;
      warnings.push(`Using manually specified variant: ${selectedVariant}`);
    } else {
      // Auto-detect variant
      const detection = selectVariant({ targetPath });

      if (!detection.success) {
        lockManager.release();
        return {
          success: false,
          error: detection.error || 'Failed to detect environment',
        };
      }

      selectedVariant = detection.selectedVariant;
    }

    const variantDef = getVariantDefinition(selectedVariant);

    // Check if variant build files exist
    const missingBuildCheck = checkVariantBuildFiles(selectedVariant);
    if (!missingBuildCheck.valid) {
      lockManager.release();
      return {
        success: false,
        error: missingBuildCheck.error,
      };
    }

    // Log start
    logger.logInstallStart(selectedVariant, nodeVersion);
    logger.logDetection(
      nodeVersion,
      variantDef.moduleSystem,
      selectedVariant
    );

    // Create directory structure
    const artkE2e = path.join(targetPath, 'artk-e2e');
    const vendorCore = path.join(artkE2e, 'vendor', 'artk-core');
    const vendorAutogen = path.join(artkE2e, 'vendor', 'artk-core-autogen');
    const artkDir = path.join(targetPath, '.artk');

    fs.mkdirSync(vendorCore, { recursive: true });
    fs.mkdirSync(vendorAutogen, { recursive: true });
    fs.mkdirSync(artkDir, { recursive: true });

    // Copy variant files (placeholder - in production, copy from dist directories)
    // For now, we create the structure and write metadata

    // Write context.json
    const context: ArtkContext = {
      variant: selectedVariant,
      variantInstalledAt: new Date().toISOString(),
      nodeVersion,
      moduleSystem: variantDef.moduleSystem,
      playwrightVersion: variantDef.playwrightVersion,
      artkVersion: ARTK_VERSION,
      installMethod: 'cli',
      overrideUsed: Boolean(variant),
    };

    fs.writeFileSync(
      path.join(artkDir, 'context.json'),
      JSON.stringify(context, null, 2),
      'utf-8'
    );

    // Write AI protection markers
    writeReadonlyMarker(vendorCore, variantDef, context);
    writeAiIgnore(vendorCore, selectedVariant);
    writeVariantFeatures(vendorCore, selectedVariant);

    // Also for autogen
    writeReadonlyMarker(vendorAutogen, variantDef, context);
    writeAiIgnore(vendorAutogen, selectedVariant);

    // Log completion
    logger.logInstallComplete(selectedVariant);

    return {
      success: true,
      variant: selectedVariant,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.logInstallFailed(message, variant as VariantId | undefined);

    // Attempt rollback
    rollback(targetPath, `Installation failed: ${message}`);

    return {
      success: false,
      error: `Installation failed: ${message}`,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } finally {
    lockManager.release();
  }
}

/**
 * Write READONLY.md marker file.
 */
function writeReadonlyMarker(
  vendorPath: string,
  variantDef: ReturnType<typeof getVariantDefinition>,
  context: ArtkContext
): void {
  const template = `# ⚠️ DO NOT MODIFY THIS DIRECTORY

**This directory contains vendor code that should NOT be edited.**

## What This Is

This is a vendored copy of ARTK code.
It was installed by the ARTK CLI and should be treated as read-only.

## Variant Information

| Property | Value |
|----------|-------|
| **Variant** | ${variantDef.id} |
| **Display Name** | ${variantDef.displayName} |
| **Node.js Range** | ${variantDef.nodeRange.join(', ')} |
| **Playwright Version** | ${variantDef.playwrightVersion} |
| **Module System** | ${variantDef.moduleSystem} |
| **Installed At** | ${context.variantInstalledAt} |
| **ARTK Version** | ${context.artkVersion} |

## If You Encounter Issues

### Import/Module Errors

If you see errors like \`ERR_REQUIRE_ESM\` or \`Cannot use import statement\`:

\`\`\`bash
# Check the installed variant
cat ../.artk/context.json | grep variant

# Reinstall with correct variant detection
artk init . --force
\`\`\`

### Feature Not Working

Check \`variant-features.json\` in this directory to see if the feature is available.

### Need Different Variant

\`\`\`bash
# Re-detect and install correct variant
artk upgrade .

# Or force a specific variant
artk init . --variant modern-esm --force
\`\`\`

## For AI Agents

**DO NOT modify files in this directory.**

If you encounter compatibility issues:
1. Check the variant information above
2. Check \`variant-features.json\` for feature availability
3. Suggest running \`artk init --force\` to reinstall with correct variant
4. Use alternative approaches documented in \`variant-features.json\`

---

*This file was generated by ARTK CLI v${context.artkVersion}*
`;

  fs.writeFileSync(path.join(vendorPath, 'READONLY.md'), template, 'utf-8');
}

/**
 * Write .ai-ignore file.
 */
function writeAiIgnore(vendorPath: string, variant: VariantId): void {
  const content = `# ARTK Vendor Directory - DO NOT MODIFY
#
# This directory contains vendored @artk/core code.
# AI agents and code generation tools should NOT modify these files.
#
# Variant: ${variant}
# Installed: ${new Date().toISOString()}
#
# If you need to change behavior:
# 1. Create wrapper functions in your project code
# 2. Use configuration in artk.config.yml
# 3. Run \`artk upgrade\` to get latest version
#
# DO NOT:
# - Edit any .js or .ts files in this directory
# - Add polyfills or patches
# - Modify package.json
#
*
`;

  fs.writeFileSync(path.join(vendorPath, '.ai-ignore'), content, 'utf-8');
}

/**
 * Write variant-features.json file.
 */
function writeVariantFeatures(vendorPath: string, variant: VariantId): void {
  const variantDef = VARIANT_DEFINITIONS[variant];

  // Define features based on variant
  const features: Record<string, { available: boolean; alternative?: string; notes?: string }> = {};

  // Common features available in all variants
  const commonFeatures = [
    'route_from_har',
    'locator_filter',
    'web_first_assertions',
    'trace_viewer',
    'api_testing',
    'storage_state',
    'video_recording',
    'screenshot_assertions',
    'request_interception',
    'browser_contexts',
  ];

  for (const feature of commonFeatures) {
    features[feature] = { available: true };
  }

  // Variant-specific features
  if (variant === 'modern-esm' || variant === 'modern-cjs') {
    features['aria_snapshots'] = { available: true };
    features['clock_api'] = { available: true };
    features['locator_or'] = { available: true };
    features['locator_and'] = { available: true };
    features['component_testing'] = { available: true };
  } else if (variant === 'legacy-16') {
    features['aria_snapshots'] = { available: true };
    features['clock_api'] = { available: true };
    features['locator_or'] = { available: true };
    features['locator_and'] = { available: true };
    features['component_testing'] = { available: true };
  } else if (variant === 'legacy-14') {
    features['aria_snapshots'] = {
      available: false,
      alternative: 'Use page.evaluate() to query ARIA attributes',
    };
    features['clock_api'] = {
      available: false,
      alternative: 'Use page.evaluate() with manual Date mocking',
    };
    features['locator_or'] = {
      available: false,
      alternative: 'Use CSS :is() selector or chain locators',
    };
    features['locator_and'] = {
      available: false,
      alternative: 'Use more specific selectors',
    };
    features['component_testing'] = {
      available: false,
      alternative: 'Use E2E testing approach',
    };
  }

  // ESM-specific
  if (variant === 'modern-esm') {
    features['esm_imports'] = { available: true };
    features['top_level_await'] = { available: true };
  } else {
    features['esm_imports'] = {
      available: false,
      alternative: 'Use require() or dynamic import()',
    };
    features['top_level_await'] = {
      available: false,
      alternative: 'Wrap in async IIFE',
    };
  }

  const featureDoc = {
    variant,
    playwrightVersion: variantDef.playwrightVersion,
    nodeRange: variantDef.nodeRange,
    moduleSystem: variantDef.moduleSystem,
    features,
    generatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(vendorPath, 'variant-features.json'),
    JSON.stringify(featureDoc, null, 2),
    'utf-8'
  );
}

/**
 * Check if the variant build files exist.
 *
 * In CLI mode, this checks if the required variant dist directory is available
 * in the CLI package's bundled core distribution.
 *
 * Note: This is a validation check - actual copying happens elsewhere.
 */
function checkVariantBuildFiles(variant: VariantId): { valid: boolean; error?: string } {
  const variantDef = getVariantDefinition(variant);
  const distDir = variantDef.distDirectory;

  // In the CLI, we expect the core dist to be bundled
  // For now, we check if we're running from a built CLI with bundled core
  // This is a soft check - the bootstrap scripts handle actual file copying

  // Try to locate the CLI's bundled core directory
  // The CLI package should include the core dist directories
  const possiblePaths = [
    // When running from npm package
    path.join(__dirname, '..', '..', 'vendor', 'artk-core', distDir),
    // When running from source/development
    path.join(__dirname, '..', '..', '..', '..', 'core', 'typescript', distDir),
    // Monorepo structure
    path.join(process.cwd(), 'core', 'typescript', distDir),
  ];

  // Also check the ARTK_CORE_PATH environment variable
  if (process.env.ARTK_CORE_PATH) {
    possiblePaths.unshift(path.join(process.env.ARTK_CORE_PATH, distDir));
  }

  // Check if any of the paths exist
  for (const checkPath of possiblePaths) {
    if (fs.existsSync(checkPath)) {
      // Found the dist directory
      const indexFile = path.join(checkPath, 'index.js');
      if (fs.existsSync(indexFile)) {
        return { valid: true };
      }
    }
  }

  // If we couldn't find the build files, provide helpful error message
  return {
    valid: false,
    error: `Variant build files not found for '${variant}'.

The ${distDir}/ directory is missing or incomplete.

To build all variants, run from the ARTK repository:
  cd core/typescript
  npm run build:variants

Or build a specific variant:
  npm run build:${variant === 'modern-esm' ? '' : variant.replace('modern-', '')}

If you have @artk/core installed elsewhere, set:
  ARTK_CORE_PATH=/path/to/artk/core/typescript

Available variants: modern-esm, modern-cjs, legacy-16, legacy-14`,
  };
}

/**
 * CLI entry point for init command.
 */
export function parseInitArgs(args: string[]): InitOptions {
  const options: InitOptions = {
    targetPath: process.cwd(),
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--variant' && args[i + 1]) {
      options.variant = args[++i];
    } else if (arg?.startsWith('--variant=')) {
      options.variant = arg.split('=')[1];
    } else if (arg === '--force' || arg === '-f') {
      options.force = true;
    } else if (arg === '--skip-npm') {
      options.skipNpm = true;
    } else if (arg === '--skip-browsers') {
      options.skipBrowsers = true;
    } else if (arg === '--help' || arg === '-h') {
      printInitHelp();
      process.exit(0);
    } else if (!arg?.startsWith('-') && arg) {
      options.targetPath = path.resolve(arg);
    }
  }

  return options;
}

/**
 * Print help for init command.
 */
function printInitHelp(): void {
  console.log(`
ARTK Init Command

Usage: artk init [path] [options]

Arguments:
  path              Target project path (default: current directory)

Options:
  --variant <id>    Force a specific variant instead of auto-detection
  --force, -f       Overwrite existing installation
  --skip-npm        Skip npm install
  --skip-browsers   Skip browser installation
  --help, -h        Show this help message

${getVariantHelpText()}

Examples:
  artk init                        # Initialize in current directory
  artk init ./my-project           # Initialize in specific directory
  artk init --variant legacy-16    # Force legacy-16 variant
  artk init --force                # Overwrite existing installation
`);
}
