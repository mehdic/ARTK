/**
 * init command - Initialize ARTK in a project
 */

import * as path from 'path';
import { bootstrap, type BootstrapOptions } from '../lib/bootstrap.js';
import { Logger } from '../lib/logger.js';

export interface InitOptions {
  skipNpm?: boolean;
  skipBrowsers?: boolean;
  force?: boolean;
  variant?: string;
  prompts?: boolean;
  verbose?: boolean;
}

export async function initCommand(targetPath: string, options: InitOptions): Promise<void> {
  const logger = new Logger({ verbose: options.verbose });

  // Validate variant option
  let variant: 'commonjs' | 'esm' | 'auto' = 'auto';
  if (options.variant) {
    if (['commonjs', 'esm', 'auto'].includes(options.variant)) {
      variant = options.variant as 'commonjs' | 'esm' | 'auto';
    } else {
      logger.error(`Invalid variant: ${options.variant}. Use: commonjs, esm, or auto`);
      process.exit(1);
    }
  }

  const bootstrapOptions: BootstrapOptions = {
    skipNpm: options.skipNpm,
    skipBrowsers: options.skipBrowsers,
    force: options.force,
    variant,
    prompts: options.prompts,
    verbose: options.verbose,
  };

  try {
    const result = await bootstrap(targetPath, bootstrapOptions);

    if (!result.success) {
      logger.error('Bootstrap failed');
      if (result.errors.length > 0) {
        logger.error('Errors:');
        for (const error of result.errors) {
          logger.error(`  - ${error}`);
        }
      }
      process.exit(1);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Unexpected error: ${message}`);
    process.exit(1);
  }
}
