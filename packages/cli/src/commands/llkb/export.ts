/**
 * LLKB Export Command
 *
 * Export LLKB for AutoGen consumption.
 */

import { Command } from 'commander';
import { runExportForAutogen, formatExportResultForConsole } from '@artk/core/llkb';

export function exportCommand(program: Command): void {
  program
    .command('export')
    .description('Export LLKB for AutoGen consumption')
    .option('--for-autogen', 'Export for AutoGen (default mode)', true)
    .option('-o, --output <dir>', 'Output directory', process.cwd())
    .option('--min-confidence <value>', 'Minimum confidence threshold', '0.7')
    .option('--llkb-root <path>', 'LLKB root directory', '.artk/llkb')
    .option('--dry-run', 'Show what would be exported without writing files')
    .action((options) => {
      try {
        const result = runExportForAutogen({
          llkbRoot: options.llkbRoot,
          outputDir: options.output,
          minConfidence: parseFloat(options.minConfidence),
          generateGlossary: true,
          generateConfig: true,
          configFormat: 'yaml',
        });

        console.log(formatExportResultForConsole(result));

        if (result.stats.totalExported === 0) {
          console.log('\n⚠️  No entries exported. Check minimum confidence threshold.');
        }

        process.exit(0);
      } catch (error) {
        console.error(`❌ Export failed: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });
}
