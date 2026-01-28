/**
 * LLKB Prune Command
 *
 * Clean old data from LLKB.
 */

import { Command } from 'commander';
import { prune, formatPruneResult } from '@artk/core/llkb';

export function pruneCommand(program: Command): void {
  program
    .command('prune')
    .description('Clean old data from LLKB')
    .option('--llkb-root <path>', 'LLKB root directory', '.artk/llkb')
    .option('--history-retention-days <days>', 'Days to retain history files', '365')
    .option('--archive-inactive-lessons', 'Archive inactive lessons')
    .option('--archive-inactive-components', 'Archive inactive components')
    .option('--inactive-days <days>', 'Days of inactivity before archiving', '180')
    .action((options) => {
      try {
        const result = prune({
          llkbRoot: options.llkbRoot,
          historyRetentionDays: parseInt(options.historyRetentionDays, 10),
          archiveInactiveLessons: options.archiveInactiveLessons ?? false,
          archiveInactiveComponents: options.archiveInactiveComponents ?? false,
          inactiveDays: parseInt(options.inactiveDays, 10),
        });

        console.log(formatPruneResult(result));

        if (result.errors.length > 0) {
          process.exit(1);
        } else {
          process.exit(0);
        }
      } catch (error) {
        console.error(`❌ Prune command failed: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });
}
