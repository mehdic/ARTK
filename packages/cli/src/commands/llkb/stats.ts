/**
 * LLKB Stats Command
 *
 * Show LLKB statistics.
 */

import { Command } from 'commander';
import { getStats, formatStats } from '@artk/core/llkb';

export function statsCommand(program: Command): void {
  program
    .command('stats')
    .description('Show LLKB statistics')
    .option('--llkb-root <path>', 'LLKB root directory', '.artk/llkb')
    .action((options) => {
      try {
        const stats = getStats(options.llkbRoot);
        console.log(formatStats(stats));
        process.exit(0);
      } catch (error) {
        console.error(`❌ Stats command failed: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });
}
