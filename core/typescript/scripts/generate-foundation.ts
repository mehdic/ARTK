#!/usr/bin/env node
/**
 * Foundation Module Generator Script
 * Called by bootstrap to generate foundation modules from templates
 *
 * Usage:
 *   node generate-foundation.ts --projectRoot=/path/to/project --variant=esm
 */
import { generateFoundationModules, createTemplateContext } from '../src/templates';
import { detectEnvironment } from '../detection/env';
import type { TemplateVariant } from '../src/templates/types';

interface ScriptOptions {
  projectRoot: string;
  variant?: TemplateVariant;
  verbose?: boolean;
  dryRun?: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(): ScriptOptions {
  const args = process.argv.slice(2);
  const options: Partial<ScriptOptions> = {};

  for (const arg of args) {
    if (arg.startsWith('--projectRoot=')) {
      options.projectRoot = arg.split('=')[1];
    } else if (arg.startsWith('--variant=')) {
      options.variant = arg.split('=')[1] as TemplateVariant;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  if (!options.projectRoot) {
    console.error('Error: --projectRoot is required');
    printHelp();
    process.exit(1);
  }

  return options as ScriptOptions;
}

/**
 * Print help message
 */
function printHelp() {
  console.log(`
Foundation Module Generator

Usage:
  node generate-foundation.ts --projectRoot=<path> [options]

Required:
  --projectRoot=<path>    Path to the project root

Options:
  --variant=<variant>     Template variant (esm|commonjs)
                          If not specified, will auto-detect
  --verbose, -v           Verbose output
  --dry-run               Preview without writing files
  --help, -h              Show this help message

Examples:
  # Auto-detect variant
  node generate-foundation.ts --projectRoot=/Users/me/my-project

  # Force ESM variant
  node generate-foundation.ts --projectRoot=/Users/me/my-project --variant=esm

  # Preview what will be generated
  node generate-foundation.ts --projectRoot=/Users/me/my-project --dry-run
  `);
}

/**
 * Main execution
 */
async function main() {
  const options = parseArgs();

  try {
    if (options.verbose) {
      console.log('Foundation Module Generator');
      console.log('Project root:', options.projectRoot);
      console.log('');
    }

    // Detect environment if variant not specified
    let variant = options.variant;
    if (!variant) {
      if (options.verbose) {
        console.log('Detecting environment...');
      }

      const envContext = detectEnvironment(options.projectRoot);
      variant = envContext.detection.moduleSystem === 'esm' ? 'esm' : 'commonjs';

      if (options.verbose) {
        console.log(`Detected: ${variant} (confidence: ${envContext.detection.confidence})`);
        console.log('');
      }
    }

    // Create template context
    const context = createTemplateContext({
      projectRoot: options.projectRoot,
      projectName: require('path').basename(options.projectRoot),
      artkRoot: 'artk-e2e',
      moduleSystem: variant === 'esm' ? 'esm' : 'commonjs',
      templateVariant: variant,
      baseURL: process.env.ARTK_BASE_URL || 'http://localhost:3000',
      authProvider: 'oidc',
      artkCorePath: '@artk/core',
      configPath: 'artk-e2e/config',
      authStatePath: '.auth-states'
    });

    // Generate foundation modules
    const result = await generateFoundationModules(
      options.projectRoot,
      variant,
      context,
      {
        verbose: options.verbose,
        dryRun: options.dryRun,
        overwrite: true,
        createBackup: true,
        validateAfter: true,
        rollbackOnFailure: true
      }
    );

    if (!result.success) {
      console.error('\n❌ Generation failed\n');

      for (const error of result.errors) {
        console.error(`  ${error.file}: ${error.error}`);
      }

      process.exit(1);
    }

    if (options.dryRun) {
      console.log('\n✅ Dry run complete (no files written)\n');
      console.log(`Would generate ${result.filesGenerated.length} files`);
    } else {
      console.log('\n✅ Foundation modules generated successfully\n');
      console.log(`Generated ${result.filesGenerated.length} files:`);
      for (const file of result.filesGenerated) {
        console.log(`  ✓ ${file.replace(options.projectRoot, '.')}`);
      }
    }

    if (result.warnings.length > 0) {
      console.log('\nWarnings:');
      for (const warning of result.warnings) {
        console.log(`  ⚠️  ${warning}`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
