/**
 * Journey command group
 *
 * CLI commands for journey operations, replacing pseudocode in prompts.
 */

import { Command } from 'commander';
import { validateCommand } from './validate.js';
import { implementCommand } from './implement.js';

export function journeyCommand(program: Command): void {
  const journey = program
    .command('journey')
    .description('Journey operations (validate, implement, etc.)');

  journey
    .command('validate <id>')
    .description('Validate a journey is ready for implementation')
    .option('--harness-root <path>', 'Path to artk-e2e directory', 'artk-e2e')
    .option('--json', 'Output as JSON')
    .action(async (id: string, options) => {
      const exitCode = await validateCommand(id, options);
      process.exitCode = exitCode;
    });

  journey
    .command('implement <ids>')
    .description('Generate tests for journey(s)')
    .option('--harness-root <path>', 'Path to artk-e2e directory', 'artk-e2e')
    .option('--batch-mode <mode>', 'Execution mode: serial or parallel', 'serial')
    .option('--learning-mode <mode>', 'LLKB learning: strict, batch, or none', 'strict')
    .option('--dry-run', 'Show what would be done without executing')
    .option('--verbose', 'Show detailed output')
    .action(async (ids: string, options) => {
      const exitCode = await implementCommand(ids, options);
      process.exitCode = exitCode;
    });

  journey
    .command('check-llkb')
    .description('Check if LLKB is configured and ready')
    .option('--harness-root <path>', 'Path to artk-e2e directory', 'artk-e2e')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const { checkLlkbCommand } = await import('./check-llkb.js');
      const exitCode = await checkLlkbCommand(options);
      process.exitCode = exitCode;
    });
}
