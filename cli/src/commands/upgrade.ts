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
import { createBackup, restoreFromBackup, rollback } from '../utils/rollback.js';
import {
  getArtkVersion,
  validateVariantBuildFiles,
  copyVariantFiles,
  writeAllAiProtectionMarkers,
  writeCopilotInstructions,
} from '../utils/variant-files.js';

/**
 * ARTK version from package.json.
 */
const ARTK_VERSION = getArtkVersion();

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
      logger.info('upgrade', `Variant migration: ${previousVariant} -> ${newVariant}`, {
        reason: `Node version: ${nodeVersion}, Module system: ${detection.moduleSystem}`,
      });
    }

    // Validate new variant build files exist before making changes
    const buildValidation = validateVariantBuildFiles(newVariant);
    if (!buildValidation.valid) {
      return {
        success: false,
        variantChanged: false,
        error: buildValidation.error,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    }

    // Create backup
    const backup = createBackup(targetPath);
    if (!backup.success) {
      warnings.push(`Could not create backup: ${backup.error}`);
    }

    // If variant changed, replace vendor files
    if (variantChanged || force) {
      // FR-019: Preserve user config files before replacing vendor
      const artkConfigPath = path.join(targetPath, 'artk-e2e', 'artk.config.yml');
      let preservedConfig: string | null = null;

      if (fs.existsSync(artkConfigPath)) {
        preservedConfig = fs.readFileSync(artkConfigPath, 'utf-8');
        logger.info('upgrade', 'Preserved user config: artk.config.yml');
      }

      // Remove old vendor directories
      const vendorCorePath = path.join(targetPath, 'artk-e2e', 'vendor', 'artk-core');
      const vendorAutogenPath = path.join(targetPath, 'artk-e2e', 'vendor', 'artk-core-autogen');

      if (fs.existsSync(vendorCorePath)) {
        fs.rmSync(vendorCorePath, { recursive: true, force: true });
      }
      if (fs.existsSync(vendorAutogenPath)) {
        fs.rmSync(vendorAutogenPath, { recursive: true, force: true });
      }

      // Copy new variant files
      const copyResult = copyVariantFiles(newVariant, targetPath);
      if (!copyResult.success) {
        // Attempt to restore from backup
        if (backup.success && backup.backupPath) {
          restoreFromBackup(targetPath, backup.backupPath);
        }
        return {
          success: false,
          variantChanged: false,
          error: `Failed to copy variant files: ${copyResult.error}`,
          warnings: warnings.length > 0 ? warnings : undefined,
        };
      }

      logger.info('upgrade', `Copied ${copyResult.copiedFiles} files for variant ${newVariant}`);

      // Add any warnings from copy operation
      if (copyResult.warnings) {
        warnings.push(...copyResult.warnings);
        for (const warning of copyResult.warnings) {
          logger.warn('upgrade', warning);
        }
      }

      // FR-019: Restore user config after vendor replacement
      if (preservedConfig !== null) {
        fs.writeFileSync(artkConfigPath, preservedConfig, 'utf-8');
        logger.info('upgrade', 'Restored user config: artk.config.yml');
      }

      // FR-020: Log variant change to install.log
      if (variantChanged) {
        logger.info('upgrade', `Variant migration complete: ${previousVariant} -> ${newVariant}`, {
          previousVariant,
          newVariant,
          nodeVersion,
          moduleSystem: detection.moduleSystem,
          reason: force ? 'forced' : 'environment change detected',
        });
      }
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

    // Update AI protection markers in both vendor directories
    const vendorCorePath = path.join(targetPath, 'artk-e2e', 'vendor', 'artk-core');
    const vendorAutogenPath = path.join(targetPath, 'artk-e2e', 'vendor', 'artk-core-autogen');

    if (fs.existsSync(vendorCorePath)) {
      writeAllAiProtectionMarkers(vendorCorePath, newVariant, newContext);
    }
    if (fs.existsSync(vendorAutogenPath)) {
      writeAllAiProtectionMarkers(vendorAutogenPath, newVariant, newContext);
    }

    // Update variant-aware Copilot instructions
    writeCopilotInstructions(targetPath, newVariant);
    logger.info('upgrade', 'Updated variant-aware Copilot instructions');

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
