/**
 * uninstall command - Remove ARTK from a project
 */

import fs from 'fs-extra';
import * as path from 'path';
import * as readline from 'readline';
import { Logger } from '../lib/logger.js';

export interface UninstallOptions {
  keepTests?: boolean;
  keepPrompts?: boolean;
  force?: boolean;
}

export async function uninstallCommand(targetPath: string, options: UninstallOptions): Promise<void> {
  const logger = new Logger();
  const resolvedPath = path.resolve(targetPath);
  const artkE2ePath = path.join(resolvedPath, 'artk-e2e');
  const artkDir = path.join(resolvedPath, '.artk');
  const promptsDir = path.join(resolvedPath, '.github', 'prompts');

  logger.header('ARTK Uninstall');

  // Check if ARTK is installed
  if (!fs.existsSync(artkE2ePath) && !fs.existsSync(artkDir)) {
    logger.error('ARTK is not installed in this project.');
    process.exit(1);
  }

  // Show what will be removed
  logger.info('The following will be removed:');
  logger.blank();

  const toRemove: Array<{ path: string; description: string }> = [];

  if (fs.existsSync(artkE2ePath)) {
    if (options.keepTests) {
      // Keep tests but remove vendor and config
      toRemove.push({
        path: path.join(artkE2ePath, 'vendor'),
        description: 'artk-e2e/vendor/ (vendored packages)',
      });
      toRemove.push({
        path: path.join(artkE2ePath, 'node_modules'),
        description: 'artk-e2e/node_modules/',
      });
    } else {
      toRemove.push({
        path: artkE2ePath,
        description: 'artk-e2e/ (entire directory)',
      });
    }
  }

  if (fs.existsSync(artkDir)) {
    toRemove.push({
      path: artkDir,
      description: '.artk/ (ARTK metadata and browser cache)',
    });
  }

  if (!options.keepPrompts && fs.existsSync(promptsDir)) {
    // Only remove ARTK prompts
    const artkPrompts = fs.readdirSync(promptsDir)
      .filter(f => f.startsWith('artk.') && f.endsWith('.prompt.md'));

    if (artkPrompts.length > 0) {
      for (const prompt of artkPrompts) {
        toRemove.push({
          path: path.join(promptsDir, prompt),
          description: `.github/prompts/${prompt}`,
        });
      }
    }
  }

  if (toRemove.length === 0) {
    logger.info('Nothing to remove.');
    return;
  }

  for (const item of toRemove) {
    logger.list([item.description]);
  }

  logger.blank();

  // Confirm unless --force
  if (!options.force) {
    const confirmed = await confirmUninstall();
    if (!confirmed) {
      logger.info('Uninstall cancelled.');
      return;
    }
  }

  // Perform uninstall
  logger.startSpinner('Removing ARTK...');

  try {
    for (const item of toRemove) {
      if (fs.existsSync(item.path)) {
        await fs.remove(item.path);
      }
    }

    // Clean up empty .github/prompts directory
    if (fs.existsSync(promptsDir)) {
      const remaining = fs.readdirSync(promptsDir);
      if (remaining.length === 0) {
        await fs.remove(promptsDir);
      }
    }

    // Clean up empty .github directory
    const githubDir = path.join(resolvedPath, '.github');
    if (fs.existsSync(githubDir)) {
      const remaining = fs.readdirSync(githubDir);
      if (remaining.length === 0) {
        await fs.remove(githubDir);
      }
    }

    logger.succeedSpinner('ARTK removed successfully');

    logger.blank();
    logger.success('ARTK has been uninstalled from this project.');

    if (options.keepTests) {
      logger.info('Test files were preserved in artk-e2e/');
    }
    if (options.keepPrompts) {
      logger.info('Prompts were preserved in .github/prompts/');
    }
  } catch (error) {
    logger.failSpinner('Uninstall failed');
    const message = error instanceof Error ? error.message : String(error);
    logger.error(message);
    process.exit(1);
  }
}

/**
 * Confirm uninstall with user
 */
function confirmUninstall(): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question('Are you sure you want to uninstall? (y/N) ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}
