/**
 * LLKB Learn Command
 *
 * Record learning events (patterns, components, lessons).
 */

import { Command } from 'commander';
import { runLearnCommand, formatLearnResult } from '@artk/core/llkb';

export function learnCommand(program: Command): void {
  program
    .command('learn')
    .description('Record a learning event (pattern, component, lesson)')
    .requiredOption('--type <type>', 'Learning event type: pattern, component, or lesson')
    .requiredOption('--journey <id>', 'Journey ID where the learning occurred')
    .option('--id <id>', 'Entity ID (component or lesson ID)')
    .option('--success', 'Mark as successful', true)
    .option('--failure', 'Mark as failure')
    .option('--context <text>', 'Additional context or step text')
    .option('--test-file <path>', 'Test file path')
    .option('--selector-strategy <strategy>', 'Selector strategy (for pattern type)')
    .option('--selector-value <value>', 'Selector value (for pattern type)')
    .option('--llkb-root <path>', 'LLKB root directory', '.artk/llkb')
    .action((options) => {
      try {
        // Validate type
        const validTypes = ['pattern', 'component', 'lesson'];
        if (!validTypes.includes(options.type)) {
          console.error(`❌ Invalid type: ${options.type}. Must be one of: ${validTypes.join(', ')}`);
          process.exit(1);
        }

        // Determine success based on flags
        const success = options.failure ? false : true;

        const result = runLearnCommand({
          type: options.type,
          journeyId: options.journey,
          id: options.id,
          success,
          context: options.context,
          testFile: options.testFile,
          selectorStrategy: options.selectorStrategy,
          selectorValue: options.selectorValue,
          llkbRoot: options.llkbRoot,
        });

        console.log(formatLearnResult(result));

        if (!result.success) {
          process.exit(1);
        }

        process.exit(0);
      } catch (error) {
        console.error(`❌ Learn command failed: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });
}
