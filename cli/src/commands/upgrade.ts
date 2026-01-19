/**
 * ARTK CLI - Upgrade Command
 *
 * Upgrades ARTK installation, detecting environment changes and migrating variants.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { VariantId, ArtkContext, UpgradeRecord } from '../utils/variant-types.js';
import {
  detectEnvironment,
  detectEnvironmentChange,
  hasExistingInstallation,
  getNodeMajorVersion,
} from '../utils/variant-detector.js';
import {
  getVariantDefinition,
  MIN_NODE_VERSION,
} from '../utils/variant-definitions.js';
import { ArtkContextSchema } from '../utils/variant-schemas.js';
import { createInstallLogger } from '../utils/install-logger.js';
import { createLockManager } from '../utils/lock-manager.js';
import { createBackup, restoreFromBackup } from '../utils/rollback.js';

/**
 * ARTK version.
 */
const ARTK_VERSION = '1.0.0';

/**
 * Upgrade command options.
 */
export interface UpgradeOptions {
  targetPath: string;
  force?: boolean;
  skipNpm?: boolean;
}

/**
 * Upgrade command result.
 */
export interface UpgradeResult {
  success: boolean;
  previousVariant?: VariantId;
  newVariant?: VariantId;
  variantChanged: boolean;
  error?: string;
  warnings?: string[];
}

/**
 * Execute the upgrade command.
 */
export async function upgrade(options: UpgradeOptions): Promise<UpgradeResult> {
  const { targetPath, force, skipNpm } = options;
  const warnings: string[] = [];

  // Check target exists
  if (!fs.existsSync(targetPath)) {
    return {
      success: false,
      variantChanged: false,
      error: `Target directory does not exist: ${targetPath}`,
    };
  }

  // Check Node.js version
  const nodeVersion = getNodeMajorVersion();
  if (nodeVersion < MIN_NODE_VERSION) {
    return {
      success: false,
      variantChanged: false,
      error: `Node.js ${nodeVersion} is not supported. ARTK requires Node.js ${MIN_NODE_VERSION} or higher.`,
    };
  }

  // Check existing installation
  if (!hasExistingInstallation(targetPath)) {
    return {
      success: false,
      variantChanged: false,
      error: 'ARTK is not installed. Run `artk init` first.',
    };
  }

  // Initialize logging and lock
  const logger = createInstallLogger(targetPath);
  const lockManager = createLockManager(targetPath);

  // Acquire lock
  const { acquired, error: lockError } = lockManager.acquire('upgrade');
  if (!acquired) {
    return {
      success: false,
      variantChanged: false,
      error: lockError || 'Failed to acquire upgrade lock',
    };
  }

  try {
    // Read existing context
    const contextPath = path.join(targetPath, '.artk', 'context.json');
    const contextContent = fs.readFileSync(contextPath, 'utf-8');
    const contextData = JSON.parse(contextContent);
    const contextResult = ArtkContextSchema.safeParse(contextData);

    if (!contextResult.success) {
      return {
        success: false,
        variantChanged: false,
        error: `Invalid context.json: ${contextResult.error.message}`,
      };
    }

    const existingContext = contextResult.data;
    const previousVariant = existingContext.variant;

    // Detect current environment
    const detection = detectEnvironment(targetPath);

    if (!detection.success) {
      return {
        success: false,
        variantChanged: false,
        error: detection.error || 'Environment detection failed',
      };
    }

    const newVariant = detection.selectedVariant;
    const variantChanged = previousVariant !== newVariant;

    // If no change and not forced, skip
    if (!variantChanged && !force) {
      return {
        success: true,
        previousVariant,
        newVariant,
        variantChanged: false,
        warnings: ['No variant change detected. Use --force to reinstall.'],
      };
    }

    // Log upgrade start
    if (variantChanged) {
      logger.logUpgradeStart(previousVariant, newVariant);
    }

    // Create backup
    const backup = createBackup(targetPath);
    if (!backup.success) {
      warnings.push(`Could not create backup: ${backup.error}`);
    }

    // Update context with new variant info
    const upgradeRecord: UpgradeRecord = {
      from: previousVariant,
      to: newVariant,
      at: new Date().toISOString(),
    };

    const newContext: ArtkContext = {
      variant: newVariant,
      variantInstalledAt: new Date().toISOString(),
      nodeVersion,
      moduleSystem: detection.moduleSystem,
      playwrightVersion: getVariantDefinition(newVariant).playwrightVersion,
      artkVersion: ARTK_VERSION,
      installMethod: 'cli',
      overrideUsed: false,
      previousVariant,
      upgradeHistory: [
        ...(existingContext.upgradeHistory || []),
        upgradeRecord,
      ],
    };

    // Write updated context
    fs.writeFileSync(
      contextPath,
      JSON.stringify(newContext, null, 2),
      'utf-8'
    );

    // Update AI protection markers
    const vendorCorePath = path.join(targetPath, 'artk-e2e', 'vendor', 'artk-core');
    if (fs.existsSync(vendorCorePath)) {
      updateVariantFeatures(vendorCorePath, newVariant);
      updateReadonlyMarker(vendorCorePath, newVariant, newContext);
    }

    // Log completion
    if (variantChanged) {
      logger.logUpgradeComplete(newVariant);
    }

    return {
      success: true,
      previousVariant,
      newVariant,
      variantChanged,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('upgrade', `Upgrade failed: ${message}`);

    return {
      success: false,
      variantChanged: false,
      error: `Upgrade failed: ${message}`,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } finally {
    lockManager.release();
  }
}

/**
 * Update variant-features.json for new variant.
 */
function updateVariantFeatures(vendorPath: string, variant: VariantId): void {
  const variantDef = getVariantDefinition(variant);
  const features: Record<string, { available: boolean; alternative?: string }> = {};

  // Common features
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

  // Variant-specific
  if (variant === 'legacy-14') {
    features['aria_snapshots'] = {
      available: false,
      alternative: 'Use page.evaluate()',
    };
    features['clock_api'] = {
      available: false,
      alternative: 'Use manual Date mocking',
    };
    features['locator_or'] = {
      available: false,
      alternative: 'Use CSS :is() selector',
    };
  } else {
    features['aria_snapshots'] = { available: true };
    features['clock_api'] = { available: true };
    features['locator_or'] = { available: true };
  }

  if (variant === 'modern-esm') {
    features['esm_imports'] = { available: true };
    features['top_level_await'] = { available: true };
  } else {
    features['esm_imports'] = {
      available: false,
      alternative: 'Use require()',
    };
    features['top_level_await'] = {
      available: false,
      alternative: 'Use async IIFE',
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
 * Update READONLY.md for new variant.
 */
function updateReadonlyMarker(
  vendorPath: string,
  variant: VariantId,
  context: ArtkContext
): void {
  const variantDef = getVariantDefinition(variant);

  const content = `# ⚠️ DO NOT MODIFY THIS DIRECTORY

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
${context.previousVariant ? `| **Previous Variant** | ${context.previousVariant} |` : ''}

**DO NOT modify files in this directory.**

---

*Updated by ARTK CLI v${context.artkVersion}*
`;

  fs.writeFileSync(path.join(vendorPath, 'READONLY.md'), content, 'utf-8');
}

/**
 * Print upgrade results.
 */
export function printUpgradeResults(result: UpgradeResult): void {
  if (!result.success) {
    console.log(`\n\x1b[31m✗ Upgrade failed:\x1b[0m ${result.error}`);
    return;
  }

  console.log('\n\x1b[32m✓ Upgrade complete\x1b[0m');

  if (result.variantChanged) {
    console.log(`\n  Variant changed: ${result.previousVariant} → ${result.newVariant}`);
  } else {
    console.log(`\n  Variant unchanged: ${result.newVariant}`);
  }

  if (result.warnings && result.warnings.length > 0) {
    console.log('\nWarnings:');
    for (const warning of result.warnings) {
      console.log(`  ⚠ ${warning}`);
    }
  }
}

/**
 * CLI entry point for upgrade command.
 */
export function parseUpgradeArgs(args: string[]): UpgradeOptions {
  const options: UpgradeOptions = {
    targetPath: process.cwd(),
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--force' || arg === '-f') {
      options.force = true;
    } else if (arg === '--skip-npm') {
      options.skipNpm = true;
    } else if (arg === '--help' || arg === '-h') {
      printUpgradeHelp();
      process.exit(0);
    } else if (!arg?.startsWith('-') && arg) {
      options.targetPath = path.resolve(arg);
    }
  }

  return options;
}

/**
 * Print help for upgrade command.
 */
function printUpgradeHelp(): void {
  console.log(`
ARTK Upgrade Command

Usage: artk upgrade [path] [options]

Arguments:
  path              Target project path (default: current directory)

Options:
  --force, -f       Force reinstallation even if no variant change
  --skip-npm        Skip npm install
  --help, -h        Show this help message

Examples:
  artk upgrade                     # Upgrade in current directory
  artk upgrade ./my-project        # Upgrade specific directory
  artk upgrade --force             # Force reinstall
`);
}
