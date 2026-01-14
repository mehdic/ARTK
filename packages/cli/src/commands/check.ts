/**
 * check command - Verify prerequisites
 */

import { checkPrerequisites, printPrerequisitesReport } from '../lib/prerequisites.js';
import { Logger } from '../lib/logger.js';
import { getVersion, getCoreVersion } from '../lib/version.js';

export interface CheckOptions {
  fix?: boolean;
}

export async function checkCommand(options: CheckOptions): Promise<void> {
  const logger = new Logger();

  logger.header('ARTK Prerequisites Check');

  // Show versions
  logger.info('Versions:');
  logger.table([
    { label: '@artk/cli', value: getVersion() },
    { label: '@artk/core', value: getCoreVersion() },
  ]);
  logger.blank();

  // Run checks
  logger.info('Checking prerequisites...');
  const result = await checkPrerequisites();

  // Print report
  printPrerequisitesReport(result, logger);

  // Exit with appropriate code
  if (!result.passed) {
    process.exit(1);
  }
}
