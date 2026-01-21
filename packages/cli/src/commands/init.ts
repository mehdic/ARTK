/**
 * init command - Initialize ARTK in a project
 */

import * as path from 'path';
import { bootstrap, type BootstrapOptions } from '../lib/bootstrap.js';
import { Logger } from '../lib/logger.js';
import {
  type VariantId,
  isVariantId,
} from '../lib/variants/index.js';
import {
  ALL_VARIANT_IDS,
  getVariantHelpText,
} from '../lib/variants/variant-definitions.js';

export interface InitOptions {
  skipNpm?: boolean;
  skipBrowsers?: boolean;
  force?: boolean;
  variant?: string;
  prompts?: boolean;
  verbose?: boolean;
}

/**
 * Map legacy variant names to new names (backward compatibility)
 */
const LEGACY_VARIANT_MAP: Record<string, VariantId> = {
  'commonjs': 'modern-cjs',
  'cjs': 'modern-cjs',
  'esm': 'modern-esm',
};

export async function initCommand(targetPath: string, options: InitOptions): Promise<void> {
  const logger = new Logger({ verbose: options.verbose });

  // Validate variant option
  let variant: VariantId | 'auto' = 'auto';
  if (options.variant && options.variant !== 'auto') {
    // Check for legacy variant names (backward compatibility)
    if (options.variant in LEGACY_VARIANT_MAP) {
      const mappedVariant = LEGACY_VARIANT_MAP[options.variant];
      logger.warning(`--variant ${options.variant} is deprecated. Using '${mappedVariant}' instead.`);
      logger.warning(`For legacy Node.js support, use: --variant legacy-16 or --variant legacy-14`);
      variant = mappedVariant;
    } else if (isVariantId(options.variant)) {
      variant = options.variant;
    } else {
      logger.error(`Invalid variant: ${options.variant}`);
      logger.error(`Valid variants: ${ALL_VARIANT_IDS.join(', ')}, auto`);
      logger.blank();
      logger.info(getVariantHelpText());
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
