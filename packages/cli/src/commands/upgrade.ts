/**
 * upgrade command - Upgrade @artk/core in an existing installation
 */

import fs from 'fs-extra';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { Logger } from '../lib/logger.js';
import { getVersion, getCoreVersion } from '../lib/version.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface UpgradeOptions {
  check?: boolean;
  force?: boolean;
}

export async function upgradeCommand(targetPath: string, options: UpgradeOptions): Promise<void> {
  const logger = new Logger();
  const resolvedPath = path.resolve(targetPath);
  const artkE2ePath = path.join(resolvedPath, 'artk-e2e');

  logger.header('ARTK Upgrade');

  // Check if ARTK is installed
  if (!fs.existsSync(artkE2ePath)) {
    logger.error('ARTK is not installed in this project.');
    logger.info('Run: artk init <path>');
    process.exit(1);
  }

  // Get current version
  const vendorCorePath = path.join(artkE2ePath, 'vendor', 'artk-core', 'package.json');
  let currentVersion = 'unknown';
  if (fs.existsSync(vendorCorePath)) {
    try {
      const pkg = await fs.readJson(vendorCorePath);
      currentVersion = pkg.version || 'unknown';
    } catch {
      // Ignore
    }
  }

  const availableVersion = getCoreVersion();

  logger.info('Version information:');
  logger.table([
    { label: 'Installed', value: currentVersion },
    { label: 'Available', value: availableVersion },
  ]);
  logger.blank();

  // Check-only mode
  if (options.check) {
    if (currentVersion === availableVersion) {
      logger.success('Already up to date!');
    } else {
      logger.info(`Update available: ${currentVersion} → ${availableVersion}`);
      logger.info('Run: artk upgrade <path>');
    }
    return;
  }

  // Check if upgrade is needed
  if (currentVersion === availableVersion && !options.force) {
    logger.success('Already up to date!');
    return;
  }

  // Perform upgrade
  logger.startSpinner('Upgrading @artk/core...');

  try {
    // Get the assets directory
    const assetsDir = getAssetsDir();

    // Copy @artk/core
    const coreSource = path.join(assetsDir, 'core');
    const coreTarget = path.join(artkE2ePath, 'vendor', 'artk-core');

    if (fs.existsSync(coreSource)) {
      await fs.remove(coreTarget);
      await fs.copy(coreSource, coreTarget);
    } else {
      logger.failSpinner('Upgrade failed');
      logger.error('Core assets not found in CLI package');
      process.exit(1);
    }

    // Copy @artk/core-autogen
    const autogenSource = path.join(assetsDir, 'autogen');
    const autogenTarget = path.join(artkE2ePath, 'vendor', 'artk-core-autogen');

    if (fs.existsSync(autogenSource)) {
      await fs.remove(autogenTarget);
      await fs.copy(autogenSource, autogenTarget);
    }

    logger.succeedSpinner('Upgrade complete!');

    logger.blank();
    logger.success(`Upgraded: ${currentVersion} → ${availableVersion}`);
    logger.blank();
    logger.info('You may need to run npm install to update dependencies:');
    logger.list(['cd artk-e2e && npm install']);
  } catch (error) {
    logger.failSpinner('Upgrade failed');
    const message = error instanceof Error ? error.message : String(error);
    logger.error(message);
    process.exit(1);
  }
}

/**
 * Get the assets directory path
 */
function getAssetsDir(): string {
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

  return path.join(__dirname, '..', '..', 'assets');
}
