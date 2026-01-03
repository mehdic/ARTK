/**
 * CLI Generate Command - Generate Playwright tests from Journey files
 * @see T094 - Create CLI entry point for generation
 */
import { parseArgs } from 'node:util';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import fg from 'fast-glob';
import { generateJourneyTests, type GenerateJourneyTestsOptions } from '../index.js';

const USAGE = `
Usage: artk-autogen generate [options] <journey-files...>

Generate Playwright tests from Journey markdown files.

Arguments:
  journey-files    Journey file paths or glob patterns

Options:
  -o, --output <dir>     Output directory for generated files (default: ./tests/generated)
  -m, --modules          Also generate module files
  -c, --config <file>    Path to autogen config file
  --dry-run              Preview generation without writing files
  -q, --quiet            Suppress output except errors
  -h, --help             Show this help message

Examples:
  artk-autogen generate journeys/login.md
  artk-autogen generate "journeys/*.md" -o tests/e2e -m
  artk-autogen generate journeys/*.md --dry-run
`;

export async function runGenerate(args: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args,
    options: {
      output: { type: 'string', short: 'o' },
      modules: { type: 'boolean', short: 'm', default: false },
      config: { type: 'string', short: 'c' },
      'dry-run': { type: 'boolean', default: false },
      quiet: { type: 'boolean', short: 'q', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: true,
  });

  if (values.help) {
    console.log(USAGE);
    return;
  }

  if (positionals.length === 0) {
    console.error('Error: No journey files specified');
    console.log(USAGE);
    process.exit(1);
  }

  const outputDir = values.output || './tests/generated';
  const dryRun = values['dry-run'];
  const quiet = values.quiet;

  // Expand glob patterns
  const journeyFiles = await fg(positionals, {
    absolute: true,
  });

  if (journeyFiles.length === 0) {
    console.error('Error: No journey files found matching the patterns');
    process.exit(1);
  }

  if (!quiet) {
    console.log(`Found ${journeyFiles.length} journey file(s)`);
  }

  // Generate tests
  const options: GenerateJourneyTestsOptions = {
    journeys: journeyFiles,
    isFilePaths: true,
    outputDir,
    generateModules: values.modules,
  };

  if (values.config) {
    options.config = values.config;
  }

  const result = await generateJourneyTests(options);

  // Output results
  if (result.errors.length > 0) {
    console.error('\nErrors:');
    for (const error of result.errors) {
      console.error(`  - ${error}`);
    }
  }

  if (result.warnings.length > 0 && !quiet) {
    console.warn('\nWarnings:');
    for (const warning of result.warnings) {
      console.warn(`  - ${warning}`);
    }
  }

  // Write files (unless dry-run)
  if (!dryRun) {
    // Ensure output directory exists
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    // Write test files
    for (const test of result.tests) {
      const filePath = join(outputDir, test.filename);
      mkdirSync(dirname(filePath), { recursive: true });
      writeFileSync(filePath, test.code, 'utf-8');
      if (!quiet) {
        console.log(`Generated: ${filePath}`);
      }
    }

    // Write module files
    for (const mod of result.modules) {
      const filePath = join(outputDir, 'modules', mod.filename);
      mkdirSync(dirname(filePath), { recursive: true });
      writeFileSync(filePath, mod.code, 'utf-8');
      if (!quiet) {
        console.log(`Generated: ${filePath}`);
      }
    }
  } else {
    if (!quiet) {
      console.log('\n[Dry run] Would generate:');
      for (const test of result.tests) {
        console.log(`  - ${join(outputDir, test.filename)}`);
      }
      for (const mod of result.modules) {
        console.log(`  - ${join(outputDir, 'modules', mod.filename)}`);
      }
    }
  }

  // Summary
  if (!quiet) {
    console.log(`\nSummary:`);
    console.log(`  Tests: ${result.tests.length}`);
    console.log(`  Modules: ${result.modules.length}`);
    console.log(`  Errors: ${result.errors.length}`);
    console.log(`  Warnings: ${result.warnings.length}`);
  }

  // Exit with error if there were errors
  if (result.errors.length > 0) {
    process.exit(1);
  }
}
