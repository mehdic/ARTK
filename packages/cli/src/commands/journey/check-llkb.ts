/**
 * artk journey check-llkb
 *
 * Check if LLKB is configured and ready.
 * Replaces the LLKB validation pseudocode in artk.journey-implement.md
 */

import * as path from 'path';
import { Logger } from '../../lib/logger.js';
import { validateLLKB, ValidationResult } from '../../lib/workflows/index.js';

export interface CheckLlkbOptions {
  harnessRoot: string;
  json?: boolean;
}

export interface CheckLlkbResult {
  valid: boolean;
  llkbRoot: string;
  errors: string[];
  warnings: string[];
}

/**
 * Run the check-llkb command and return structured result
 * Separated from CLI output for testability
 */
export function runCheckLlkb(options: CheckLlkbOptions): CheckLlkbResult {
  const harnessRoot = path.resolve(options.harnessRoot);
  const llkbRoot = path.join(harnessRoot, '.artk', 'llkb');

  const result = validateLLKB(llkbRoot);

  return {
    valid: result.valid,
    llkbRoot,
    errors: result.errors,
    warnings: result.warnings,
  };
}

/**
 * CLI entry point - handles output formatting and exit codes
 */
export async function checkLlkbCommand(options: CheckLlkbOptions): Promise<number> {
  const logger = new Logger();
  const result = runCheckLlkb(options);

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    logger.header('LLKB Check');
    logger.info(`LLKB Root: ${result.llkbRoot}`);
    logger.blank();

    if (result.valid) {
      logger.success('LLKB is configured and ready');
    } else {
      logger.error('LLKB is not ready');
      for (const err of result.errors) {
        logger.info(`  - ${err}`);
      }
    }

    for (const warn of result.warnings) {
      logger.warning(`  - ${warn}`);
    }
  }

  return result.valid ? 0 : 1;
}
