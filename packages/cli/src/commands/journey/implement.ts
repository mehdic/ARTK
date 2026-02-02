/**
 * artk journey implement <ids>
 *
 * Generate Playwright tests for journey(s).
 * Replaces the implementation pseudocode in artk.journey-implement.md
 *
 * With --dry-run, shows what would be done without executing.
 */

import * as path from 'path';
import { Logger } from '../../lib/logger.js';
import { WorkflowContext } from '../../lib/workflows/types.js';
import {
  buildImplementPlan,
  formatImplementPlan,
  executeImplementation,
  ImplementOptions,
  ImplementPlan,
} from '../../lib/workflows/journey-implement.js';

export interface ImplementCommandOptions {
  harnessRoot: string;
  batchMode?: string;
  learningMode?: string;
  dryRun?: boolean;
  verbose?: boolean;
}

export interface ImplementCommandResult {
  success: boolean;
  plan?: ImplementPlan;
  testsGenerated?: string[];
  error?: string;
}

/**
 * Run the implement command and return structured result
 * Separated from CLI output for testability
 */
export function buildPlan(ids: string, options: ImplementCommandOptions): ImplementCommandResult {
  const harnessRoot = path.resolve(options.harnessRoot);
  const projectRoot = process.cwd();
  const llkbRoot = path.join(harnessRoot, '.artk', 'llkb');

  const ctx: WorkflowContext = {
    projectRoot,
    harnessRoot,
    llkbRoot,
    dryRun: options.dryRun || false,
    environment: 'unknown', // Will be detected in buildImplementPlan
  };

  const implementOptions: ImplementOptions = {
    journeyIds: ids,
    batchMode: options.batchMode,
    learningMode: options.learningMode,
    dryRun: options.dryRun,
    verbose: options.verbose,
  };

  // Build the plan
  const planResult = buildImplementPlan(ctx, implementOptions);

  if (!planResult.success) {
    return {
      success: false,
      error: planResult.error || 'Unknown error',
    };
  }

  return {
    success: true,
    plan: planResult.data!,
  };
}

/**
 * CLI entry point - handles output formatting and exit codes
 */
export async function implementCommand(ids: string, options: ImplementCommandOptions): Promise<number> {
  const logger = new Logger();
  const harnessRoot = path.resolve(options.harnessRoot);
  const projectRoot = process.cwd();
  const llkbRoot = path.join(harnessRoot, '.artk', 'llkb');

  const ctx: WorkflowContext = {
    projectRoot,
    harnessRoot,
    llkbRoot,
    dryRun: options.dryRun || false,
    environment: 'unknown',
  };

  const implementOptions: ImplementOptions = {
    journeyIds: ids,
    batchMode: options.batchMode,
    learningMode: options.learningMode,
    dryRun: options.dryRun,
    verbose: options.verbose,
  };

  // Build the plan
  const planResult = buildImplementPlan(ctx, implementOptions);

  if (!planResult.success) {
    logger.error('Failed to build implementation plan:');
    logger.error(planResult.error || 'Unknown error');
    return 1;
  }

  const plan = planResult.data!;

  // If dry-run, just show the plan
  if (options.dryRun) {
    console.log(formatImplementPlan(plan));
    console.log('\nThis is a dry run. No changes were made.');
    console.log('Remove --dry-run to execute the implementation.');
    return 0;
  }

  // Execute the implementation
  logger.header('Journey Implementation');
  logger.info(`Implementing ${plan.journeys.length} journey(s)...`);
  logger.info(`Environment: ${plan.environment}`);
  logger.info(`Batch Mode: ${plan.batchMode}`);
  logger.info(`Learning Mode: ${plan.learningMode}`);
  logger.blank();

  // Show warnings
  for (const warn of plan.warnings) {
    logger.warning(warn);
  }

  const result = await executeImplementation(ctx, plan, { verbose: options.verbose });

  if (!result.success) {
    logger.error('Implementation failed:');
    logger.error(result.error || 'Unknown error');

    // Show partial results if available
    if (result.data?.sessionState) {
      const state = result.data.sessionState;
      logger.blank();
      logger.info(`Completed: ${state.journeysCompleted.length}/${state.totalJourneys}`);
      logger.info(`Failed at: ${state.currentJourneyId || 'unknown'}`);
    }

    return 1;
  }

  logger.blank();
  logger.success('Implementation complete!');
  logger.info('Tests generated:');
  for (const test of result.data!.testsGenerated) {
    logger.info(`  - ${test}`);
  }

  // Show session summary
  const state = result.data!.sessionState;
  logger.blank();
  logger.info(`Session summary:`);
  logger.info(`  - LLKB exports: ${state.llkbExportCount}`);
  logger.info(`  - Duration: ${((state.endTime! - state.startTime) / 1000).toFixed(1)}s`);

  logger.blank();
  logger.info('Next steps:');
  logger.info('  1. Run: artk journey validate ' + ids);
  logger.info('  2. Run: npx playwright test --grep "' + ids.split(',')[0] + '"');

  return 0;
}
