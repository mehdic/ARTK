/**
 * LLKB Update Test Command
 *
 * Update a single test file with current LLKB version.
 */

import { Command } from 'commander';
import { runUpdateTest, formatUpdateTestResult } from '@artk/core/llkb';

export function updateTestCommand(program: Command): void {
  program
    .command('update-test')
    .description('Update a single test file with current LLKB version')
    .requiredOption('--test <path>', 'Path to the test file to update')
    .option('--llkb-root <path>', 'LLKB root directory', '.artk/llkb')
    .option('--dry-run', 'Show changes without writing')
    .action((options) => {
      try {
        const result = runUpdateTest({
          testPath: options.test,
          llkbRoot: options.llkbRoot,
          dryRun: options.dryRun ?? false,
        });

        console.log(formatUpdateTestResult(result));

        if (!result.success) {
          process.exit(1);
        }

        if (result.dryRun && result.modified) {
          console.log('\n💡 Run without --dry-run to apply changes');
        }

        process.exit(0);
      } catch (error) {
        console.error(`❌ Update test failed: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });
}
