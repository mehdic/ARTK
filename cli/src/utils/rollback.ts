/**
 * ARTK Rollback Utility
 *
 * Handles rollback on partial installation failure.
 * Removes all installed files to return to clean pre-install state.
 */

import * as fs from 'fs';
import * as path from 'path';
import { createInstallLogger } from './install-logger.js';

/**
 * Directories and files to remove on rollback.
 */
const ROLLBACK_TARGETS = {
  directories: [
    'artk-e2e/vendor/artk-core',
    'artk-e2e/vendor/artk-core-autogen',
  ],
  files: [
    '.artk/context.json',
    // Note: We don't remove .artk/install.log to preserve history
  ],
};

/**
 * Rollback result.
 */
export interface RollbackResult {
  success: boolean;
  removedDirectories: string[];
  removedFiles: string[];
  errors: string[];
}

/**
 * Perform rollback to clean state.
 */
export function rollback(targetPath: string, reason: string): RollbackResult {
  const logger = createInstallLogger(targetPath);
  logger.logRollbackStart(reason);

  const result: RollbackResult = {
    success: true,
    removedDirectories: [],
    removedFiles: [],
    errors: [],
  };

  // Remove directories
  for (const dir of ROLLBACK_TARGETS.directories) {
    const fullPath = path.join(targetPath, dir);

    if (fs.existsSync(fullPath)) {
      try {
        fs.rmSync(fullPath, { recursive: true, force: true });
        result.removedDirectories.push(dir);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Failed to remove ${dir}: ${message}`);
        result.success = false;
      }
    }
  }

  // Remove files
  for (const file of ROLLBACK_TARGETS.files) {
    const fullPath = path.join(targetPath, file);

    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
        result.removedFiles.push(file);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Failed to remove ${file}: ${message}`);
        result.success = false;
      }
    }
  }

  if (result.success) {
    logger.logRollbackComplete();
  } else {
    logger.error('rollback', 'Rollback completed with errors', {
      errors: result.errors,
    });
  }

  return result;
}

/**
 * Check if rollback is needed based on partial installation state.
 */
export function needsRollback(targetPath: string): {
  needed: boolean;
  reason?: string;
} {
  const contextPath = path.join(targetPath, '.artk', 'context.json');
  const vendorCorePath = path.join(
    targetPath,
    'artk-e2e',
    'vendor',
    'artk-core'
  );
  const vendorAutogenPath = path.join(
    targetPath,
    'artk-e2e',
    'vendor',
    'artk-core-autogen'
  );

  const hasContext = fs.existsSync(contextPath);
  const hasVendorCore = fs.existsSync(vendorCorePath);
  const hasVendorAutogen = fs.existsSync(vendorAutogenPath);

  // Partial state: context exists but vendor directories are missing or incomplete
  if (hasContext && (!hasVendorCore || !hasVendorAutogen)) {
    return {
      needed: true,
      reason:
        'Partial installation detected: context exists but vendor directories are incomplete',
    };
  }

  // Check for incomplete vendor directories
  if (hasVendorCore) {
    const hasIndex = fs.existsSync(path.join(vendorCorePath, 'dist', 'index.js'));
    const hasPackage = fs.existsSync(path.join(vendorCorePath, 'package.json'));

    if (!hasIndex || !hasPackage) {
      return {
        needed: true,
        reason: 'Incomplete vendor/artk-core installation',
      };
    }
  }

  return { needed: false };
}

/**
 * Create a backup of existing installation before upgrade.
 */
export function createBackup(
  targetPath: string
): { success: boolean; backupPath?: string; error?: string } {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(targetPath, '.artk', 'backups', timestamp);

  try {
    fs.mkdirSync(backupDir, { recursive: true });

    // Backup context.json
    const contextPath = path.join(targetPath, '.artk', 'context.json');
    if (fs.existsSync(contextPath)) {
      fs.copyFileSync(
        contextPath,
        path.join(backupDir, 'context.json')
      );
    }

    // Backup artk.config.yml
    const configPath = path.join(targetPath, 'artk-e2e', 'artk.config.yml');
    if (fs.existsSync(configPath)) {
      fs.copyFileSync(
        configPath,
        path.join(backupDir, 'artk.config.yml')
      );
    }

    return { success: true, backupPath: backupDir };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Restore from backup.
 */
export function restoreFromBackup(
  targetPath: string,
  backupPath: string
): { success: boolean; error?: string } {
  try {
    // Restore context.json
    const contextBackup = path.join(backupPath, 'context.json');
    if (fs.existsSync(contextBackup)) {
      const contextTarget = path.join(targetPath, '.artk', 'context.json');
      fs.copyFileSync(contextBackup, contextTarget);
    }

    // Restore artk.config.yml
    const configBackup = path.join(backupPath, 'artk.config.yml');
    if (fs.existsSync(configBackup)) {
      const configTarget = path.join(targetPath, 'artk-e2e', 'artk.config.yml');
      fs.copyFileSync(configBackup, configTarget);
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}
