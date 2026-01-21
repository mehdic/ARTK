/**
 * ARTK CLI - Main entry point
 *
 * Bootstrap Playwright test suites with AI-assisted workflows
 */

import { program } from 'commander';
import { initCommand } from './commands/init.js';
import { checkCommand } from './commands/check.js';
import { upgradeCommand } from './commands/upgrade.js';
import { doctorCommand } from './commands/doctor.js';
import { uninstallCommand } from './commands/uninstall.js';
import { getVersion } from './lib/version.js';

const version = getVersion();

program
  .name('artk')
  .description('ARTK - Automatic Regression Testing Kit\n\nBootstrap Playwright test suites with AI-assisted workflows')
  .version(version, '-v, --version', 'Output the current version');

program
  .command('init <path>')
  .description('Initialize ARTK in a project')
  .option('--skip-npm', 'Skip npm install')
  .option('--skip-browsers', 'Skip browser installation')
  .option('-f, --force', 'Overwrite existing installation')
  .option('--variant <type>', 'Variant: modern-esm, modern-cjs, legacy-16, legacy-14, or auto (default: auto)', 'auto')
  .option('--no-prompts', 'Skip installing AI prompts')
  .option('--verbose', 'Show detailed output')
  .action(async (targetPath: string, options) => {
    await initCommand(targetPath, options);
  });

program
  .command('upgrade [path]')
  .description('Upgrade @artk/core in an existing installation')
  .option('--check', 'Check for updates without applying')
  .option('-f, --force', 'Force upgrade even if versions match')
  .action(async (targetPath: string | undefined, options) => {
    await upgradeCommand(targetPath || '.', options);
  });

program
  .command('check')
  .description('Verify prerequisites (Node.js, npm, browsers)')
  .option('--fix', 'Attempt to fix issues automatically')
  .action(async (options) => {
    await checkCommand(options);
  });

program
  .command('doctor [path]')
  .description('Diagnose and fix common issues in an ARTK installation')
  .option('--fix', 'Attempt to fix issues automatically')
  .option('--verbose', 'Show detailed diagnostic output')
  .action(async (targetPath: string | undefined, options) => {
    await doctorCommand(targetPath || '.', options);
  });

program
  .command('uninstall <path>')
  .description('Remove ARTK from a project')
  .option('--keep-tests', 'Keep test files in artk-e2e/')
  .option('--keep-prompts', 'Keep AI prompts in .github/prompts/')
  .option('-f, --force', 'Skip confirmation prompt')
  .action(async (targetPath: string, options) => {
    await uninstallCommand(targetPath, options);
  });

// Error handling
program.showHelpAfterError('(add --help for additional information)');

// Parse arguments
program.parse();
