/**
 * artk journey validate <id>
 *
 * Validate a journey is ready for implementation.
 * Replaces the validation pseudocode in artk.journey-implement.md
 */

import * as path from 'path';
import { Logger } from '../../lib/logger.js';
import {
  findJourneyFiles,
  loadJourney,
  validateJourneyForImplementation,
  parseJourneyList,
} from '../../lib/workflows/journey-validate.js';

export interface ValidateOptions {
  harnessRoot: string;
  json?: boolean;
}

export interface ValidateResult {
  valid: boolean;
  journeys: Array<{
    id: string;
    found: boolean;
    valid: boolean;
    errors: string[];
    warnings: string[];
  }>;
}

/**
 * Run the validate command and return structured result
 * Separated from CLI output for testability
 */
export function runValidation(id: string, options: ValidateOptions): ValidateResult {
  const harnessRoot = path.resolve(options.harnessRoot);

  // Parse journey IDs
  const ids = parseJourneyList(id);
  if (ids.length === 0) {
    return {
      valid: false,
      journeys: [{
        id: id || '(empty)',
        found: false,
        valid: false,
        errors: ['No valid journey IDs provided. Use format: JRN-0001 or JRN-0001,JRN-0002'],
        warnings: [],
      }],
    };
  }

  // Find journey files
  const journeyPaths = findJourneyFiles(harnessRoot, ids);

  const results: ValidateResult['journeys'] = [];
  let allValid = true;

  for (const journeyId of ids) {
    const journeyPath = journeyPaths.get(journeyId);

    if (!journeyPath) {
      results.push({
        id: journeyId,
        found: false,
        valid: false,
        errors: ['Journey file not found'],
        warnings: [],
      });
      allValid = false;
      continue;
    }

    const journey = loadJourney(journeyPath, harnessRoot);
    if (!journey) {
      results.push({
        id: journeyId,
        found: true,
        valid: false,
        errors: ['Failed to parse journey file'],
        warnings: [],
      });
      allValid = false;
      continue;
    }

    const validation = validateJourneyForImplementation(journey);
    results.push({
      id: journeyId,
      found: true,
      valid: validation.valid,
      errors: validation.errors,
      warnings: validation.warnings,
    });

    if (!validation.valid) {
      allValid = false;
    }
  }

  return { valid: allValid, journeys: results };
}

/**
 * CLI entry point - handles output formatting and exit codes
 */
export async function validateCommand(id: string, options: ValidateOptions): Promise<number> {
  const logger = new Logger();
  const result = runValidation(id, options);

  // Output results
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    logger.header('Journey Validation');

    for (const journey of result.journeys) {
      if (journey.valid) {
        logger.success(`${journey.id}: Ready for implementation`);
      } else if (!journey.found) {
        logger.error(`${journey.id}: Not found`);
      } else {
        logger.error(`${journey.id}: Not ready`);
        for (const err of journey.errors) {
          logger.info(`  - ${err}`);
        }
      }

      for (const warn of journey.warnings) {
        logger.warning(`  - ${warn}`);
      }
    }

    logger.blank();
    if (result.valid) {
      logger.success('All journeys are ready for implementation');
    } else {
      logger.error('Some journeys are not ready');
    }
  }

  return result.valid ? 0 : 1;
}
