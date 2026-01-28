/**
 * LLKB Check Updates Command
 *
 * Check which tests need LLKB updates.
 */

import { Command } from 'commander';
import { runCheckUpdates, formatCheckUpdatesResult } from '@artk/core/llkb';

export function checkUpdatesCommand(program: Command): void {
  program
    .command('check-updates')
    .description('Check which tests need LLKB updates')
    .requiredOption('--tests-dir <path>', 'Directory containing test files')
    .option('--llkb-root <path>', 'LLKB root directory', '.artk/llkb')
    .option('--pattern <pattern>', 'File pattern to match', '*.spec.ts')
    .action((options) => {
      try {
        const result = runCheckUpdates({
          testsDir: options.testsDir,
          llkbRoot: options.llkbRoot,
          pattern: options.pattern,
        });

        console.log(formatCheckUpdatesResult(result));

        if (result.summary.outdated > 0) {
          console.log(`\n💡 Run 'artk llkb update-tests --tests-dir ${options.testsDir}' to update all tests`);
        }

        process.exit(0);
      } catch (error) {
        console.error(`❌ Check updates failed: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });
}
