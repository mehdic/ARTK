/**
 * LLKB Command Group
 *
 * Subcommands for managing LLKB (Lessons Learned Knowledge Base).
 */

import { Command } from 'commander';
import { initCommand } from './init.js';
import { seedCommand } from './seed.js';
import { exportCommand } from './export.js';
import { healthCommand } from './health.js';
import { statsCommand } from './stats.js';
import { pruneCommand } from './prune.js';
import { learnCommand } from './learn.js';
import { checkUpdatesCommand } from './check-updates.js';
import { updateTestCommand } from './update-test.js';
import { updateTestsCommand } from './update-tests.js';

/**
 * Register the llkb command group and all its subcommands
 */
export function llkbCommand(program: Command): Command {
  const llkb = program
    .command('llkb')
    .description('LLKB (Lessons Learned Knowledge Base) operations');

  // Register all subcommands
  initCommand(llkb);
  seedCommand(llkb);
  exportCommand(llkb);
  healthCommand(llkb);
  statsCommand(llkb);
  pruneCommand(llkb);
  learnCommand(llkb);
  checkUpdatesCommand(llkb);
  updateTestCommand(llkb);
  updateTestsCommand(llkb);

  return llkb;
}
