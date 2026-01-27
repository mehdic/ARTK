/**
 * LLKB Update Tests Command
 *
 * Batch update multiple test files with current LLKB version.
 */

import { Command } from 'commander';
import { runUpdateTests, formatUpdateTestsResult } from '@artk/core/llkb';

export function updateTestsCommand(program: Command): void {
  program
    .command('update-tests')
    .description('Batch update multiple test files with current LLKB version')
    .requiredOption('--tests-dir <path>', 'Directory containing test files')
    .option('--llkb-root <path>', 'LLKB root directory', '.artk/llkb')
    .option('--pattern <pattern>', 'File pattern to match', '*.spec.ts')
    .option('--dry-run', 'Show changes without writing')
    .action((options) => {
      try {
        const result = runUpdateTests({
          testsDir: options.testsDir,
          llkbRoot: options.llkbRoot,
          pattern: options.pattern,
          dryRun: options.dryRun ?? false,
        });

        console.log(formatUpdateTestsResult(result));

        if (result.summary.failed > 0) {
          process.exit(1);
        }

        if (options.dryRun && result.summary.updated > 0) {
          console.log('\n💡 Run without --dry-run to apply changes');
        }

        process.exit(0);
      } catch (error) {
        console.error(`❌ Batch update failed: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });
}
