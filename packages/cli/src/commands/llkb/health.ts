/**
 * LLKB Health Command
 *
 * Check LLKB health status.
 */

import { Command } from 'commander';
import { runHealthCheck, formatHealthCheck } from '@artk/core/llkb';

export function healthCommand(program: Command): void {
  program
    .command('health')
    .description('Check LLKB health status')
    .option('--llkb-root <path>', 'LLKB root directory', '.artk/llkb')
    .action((options) => {
      try {
        const result = runHealthCheck(options.llkbRoot);
        console.log(formatHealthCheck(result));
        process.exit(result.status === 'error' ? 1 : 0);
      } catch (error) {
        console.error(`❌ Health check failed: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });
}
