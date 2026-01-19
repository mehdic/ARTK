#!/usr/bin/env node
/**
 * ARTK CLI - Command Line Interface
 *
 * Main entry point for the ARTK CLI.
 */

import { init, parseInitArgs } from './commands/init.js';
import { doctor, parseDoctorArgs, printDoctorResults } from './commands/doctor.js';
import { upgrade, parseUpgradeArgs, printUpgradeResults } from './commands/upgrade.js';
import { getVariantHelpText } from './utils/variant-definitions.js';

/**
 * CLI version.
 */
const VERSION = '1.0.0';

/**
 * Print main help.
 */
function printHelp(): void {
  console.log(`
ARTK CLI v${VERSION}

A command-line interface for ARTK - Automatic Regression Testing Kit

Usage: artk <command> [options]

Commands:
  init [path]       Initialize ARTK in a project
  doctor [path]     Diagnose ARTK installation
  upgrade [path]    Upgrade ARTK installation
  check             Check prerequisites
  uninstall <path>  Remove ARTK from a project

Options:
  --help, -h        Show help for a command
  --version, -v     Show version number

${getVariantHelpText()}

Examples:
  artk init                        # Initialize in current directory
  artk init ./my-project           # Initialize in specific directory
  artk init --variant legacy-16    # Force legacy-16 variant
  artk doctor                      # Check installation health
  artk upgrade                     # Upgrade to latest/correct variant

For more help on a command, run:
  artk <command> --help
`);
}

/**
 * Print version.
 */
function printVersion(): void {
  console.log(`artk version ${VERSION}`);
}

/**
 * Main CLI entry point.
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    printHelp();
    process.exit(0);
  }

  if (command === '--version' || command === '-v') {
    printVersion();
    process.exit(0);
  }

  const commandArgs = args.slice(1);

  switch (command) {
    case 'init': {
      const options = parseInitArgs(commandArgs);
      const result = await init(options);

      if (result.success) {
        console.log(`\n\x1b[32m✓ ARTK initialized successfully\x1b[0m`);
        console.log(`  Variant: ${result.variant}`);

        if (result.warnings && result.warnings.length > 0) {
          console.log('\nWarnings:');
          for (const warning of result.warnings) {
            console.log(`  ⚠ ${warning}`);
          }
        }

        console.log('\nNext steps:');
        console.log('  1. cd artk-e2e');
        console.log('  2. npm install');
        console.log('  3. Run /artk.init-playbook in Copilot Chat');
      } else {
        console.error(`\n\x1b[31m✗ Initialization failed:\x1b[0m ${result.error}`);
        process.exit(1);
      }
      break;
    }

    case 'doctor': {
      const options = parseDoctorArgs(commandArgs);
      const result = await doctor(options);
      printDoctorResults(result);
      process.exit(result.healthy ? 0 : 1);
      break;
    }

    case 'upgrade': {
      const options = parseUpgradeArgs(commandArgs);
      const result = await upgrade(options);
      printUpgradeResults(result);
      process.exit(result.success ? 0 : 1);
      break;
    }

    case 'check': {
      // Simple prerequisites check
      console.log('\nARTK Prerequisites Check\n');

      const nodeVersion = process.version;
      const nodeMajor = parseInt(nodeVersion.slice(1).split('.')[0] || '0', 10);

      console.log(`Node.js: ${nodeVersion}`);

      if (nodeMajor >= 18) {
        console.log('  \x1b[32m✓ Modern variants available (modern-esm, modern-cjs)\x1b[0m');
      }
      if (nodeMajor >= 16) {
        console.log('  \x1b[32m✓ Legacy-16 variant available\x1b[0m');
      }
      if (nodeMajor >= 14) {
        console.log('  \x1b[32m✓ Legacy-14 variant available\x1b[0m');
      }
      if (nodeMajor < 14) {
        console.log('  \x1b[31m✗ Node.js 14+ required\x1b[0m');
        process.exit(1);
      }

      console.log('\n\x1b[32mAll prerequisites met!\x1b[0m');
      break;
    }

    case 'uninstall': {
      console.log('Uninstall command not yet implemented.');
      console.log('To manually uninstall, remove:');
      console.log('  - artk-e2e/ directory');
      console.log('  - .artk/ directory');
      console.log('  - .github/prompts/artk.*.prompt.md files');
      process.exit(0);
      break;
    }

    default: {
      console.error(`Unknown command: ${command}`);
      console.error('Run `artk --help` for usage information.');
      process.exit(1);
    }
  }
}

// Run CLI
main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
