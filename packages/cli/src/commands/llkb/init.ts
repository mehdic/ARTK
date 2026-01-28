/**
 * LLKB Init Command
 *
 * Initialize LLKB directory structure.
 * This is CRITICAL - called by discover-foundation prompt.
 */

import { Command } from 'commander';
import { initializeLLKB } from '@artk/core/llkb';
import { existsSync } from 'fs';
import { join } from 'path';

export function initCommand(program: Command): void {
  program
    .command('init')
    .description('Initialize LLKB directory structure')
    .option('--llkb-root <path>', 'LLKB root directory', '.artk/llkb')
    .option('--force', 'Reinitialize even if already exists')
    .action(async (options) => {
      const llkbRoot = options.llkbRoot as string;

      // Check if already initialized
      if (existsSync(join(llkbRoot, 'config.yml')) && !options.force) {
        console.log(`✓ LLKB already initialized at ${llkbRoot}`);
        console.log('  Use --force to reinitialize');
        return;
      }

      console.log(`Initializing LLKB at ${llkbRoot}...`);

      try {
        const result = await initializeLLKB(llkbRoot);

        if (result.success) {
          console.log('✅ LLKB initialized successfully');
          console.log(`   Created: ${llkbRoot}/config.yml`);
          console.log(`   Created: ${llkbRoot}/lessons.json`);
          console.log(`   Created: ${llkbRoot}/components.json`);
          console.log(`   Created: ${llkbRoot}/analytics.json`);
          console.log(`   Created: ${llkbRoot}/patterns/`);
          console.log(`   Created: ${llkbRoot}/history/`);
        } else {
          console.error(`❌ Failed to initialize LLKB: ${result.error}`);
          process.exit(1);
        }
      } catch (error) {
        console.error(`❌ Failed to initialize LLKB: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });
}
