/**
 * CLI Generate Command - Generate Playwright tests from Journey files
 * @see T094 - Create CLI entry point for generation
 * @see research/2026-01-23_llkb-autogen-integration-specification.md (LLKB integration)
 * @see research/2026-01-27_autogen-empty-stubs-implementation-plan.md (telemetry)
 */
import { parseArgs } from 'node:util';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import fg from 'fast-glob';
import { generateJourneyTests, type GenerateJourneyTestsOptions } from '../index.js';
import { loadConfigs } from '../config/loader.js';
import { loadExtendedGlossary, getGlossaryStats } from '../mapping/glossary.js';
import { recordBlockedStep } from '../mapping/telemetry.js';
import { analyzeBlockedStep, formatBlockedStepAnalysis } from '../mapping/blockedStepAnalysis.js';

const USAGE = `
Usage: artk-autogen generate [options] <journey-files...>

Generate Playwright tests from Journey markdown files.

Arguments:
  journey-files    Journey file paths or glob patterns

Options:
  -o, --output <dir>       Output directory for generated files (default: ./tests/generated)
  -m, --modules            Also generate module files
  -c, --config <file>      Path to autogen config file
  --dry-run                Preview generation without writing files
  -q, --quiet              Suppress output except errors
  -h, --help               Show this help message

LLKB Integration Options:
  --llkb-config <file>     Path to LLKB-generated config file
  --llkb-glossary <file>   Path to LLKB-generated glossary file
  --no-llkb                Disable LLKB integration even if config enables it

Examples:
  artk-autogen generate journeys/login.md
  artk-autogen generate "journeys/*.md" -o tests/e2e -m
  artk-autogen generate journeys/*.md --dry-run
  artk-autogen generate journeys/*.md --llkb-config autogen-llkb.config.yml --llkb-glossary llkb-glossary.ts
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
      // LLKB integration options
      'llkb-config': { type: 'string' },
      'llkb-glossary': { type: 'string' },
      'no-llkb': { type: 'boolean', default: false },
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

  // Load configs (base + LLKB if provided)
  const configPaths: string[] = [];
  if (values.config) {
    configPaths.push(values.config);
  }
  if (values['llkb-config'] && !values['no-llkb']) {
    configPaths.push(values['llkb-config']);
  }

  // Load merged config if multiple paths provided
  const configPath = values.config;
  if (configPaths.length > 1) {
    // When we have multiple configs, merge them and log
    // The merged config includes LLKB settings
    loadConfigs(configPaths);
    if (!quiet) {
      console.log(`Loaded ${configPaths.length} config file(s)`);
    }
  }

  // Load LLKB glossary if provided
  if (values['llkb-glossary'] && !values['no-llkb']) {
    const glossaryResult = await loadExtendedGlossary(values['llkb-glossary']);
    if (glossaryResult.loaded) {
      if (!quiet) {
        console.log(
          `Loaded LLKB glossary: ${glossaryResult.entryCount} entries` +
            (glossaryResult.exportedAt ? ` (exported: ${glossaryResult.exportedAt})` : '')
        );
      }
    } else if (!quiet) {
      console.warn(`Warning: Failed to load LLKB glossary: ${glossaryResult.error}`);
    }
  }

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
    // Show LLKB stats if glossary is loaded
    const stats = getGlossaryStats();
    if (stats.extendedEntries > 0) {
      console.log(`LLKB glossary active: ${stats.extendedEntries} extended entries`);
    }
  }

  // Generate tests
  const options: GenerateJourneyTestsOptions = {
    journeys: journeyFiles,
    isFilePaths: true,
    outputDir,
    generateModules: values.modules,
  };

  if (configPath) {
    options.config = configPath;
  }

  const result = await generateJourneyTests(options);

  // Analyze and record blocked steps for telemetry
  // Extract blocked steps from warnings (they contain "BLOCKED:" prefix)
  const blockedStepWarnings = result.warnings.filter((w) => w.includes('BLOCKED:'));
  const blockedStepAnalyses: ReturnType<typeof analyzeBlockedStep>[] = [];

  if (blockedStepWarnings.length > 0) {
    if (!quiet) {
      console.log(`\n🔧 Blocked Step Analysis (${blockedStepWarnings.length} blocked steps):\n`);
    }

    for (const warning of blockedStepWarnings) {
      // Extract step text and reason from warning (format: "BLOCKED: stepText - reason")
      const match = warning.match(/BLOCKED:\s*(.+?)(?:\s*-\s*(.+))?$/);
      if (match) {
        const stepText = match[1] || warning;
        const reason = match[2] || 'Unknown reason';

        // Analyze the blocked step
        const analysis = analyzeBlockedStep(stepText, reason);
        blockedStepAnalyses.push(analysis);

        // Record to telemetry (for pattern gap analysis)
        const journeyId = journeyFiles.length === 1 ? basename(journeyFiles[0]!, '.md') : 'multiple';
        recordBlockedStep({
          journeyId,
          stepText,
          reason,
          suggestedFix: analysis.suggestions[0]?.text,
          nearestPattern: analysis.nearestPattern?.name,
          nearestDistance: analysis.nearestPattern?.distance,
        });

        // Print analysis (unless quiet)
        if (!quiet) {
          console.log(formatBlockedStepAnalysis(analysis));
          console.log();
        }
      }
    }

    // Write blocked step analysis JSON for AI consumption
    // Write when ARTK_JSON_OUTPUT is set (even in dry-run) or when not in dry-run
    if (process.env.ARTK_JSON_OUTPUT || !dryRun) {
      const analysisPath = join(outputDir, 'blocked-steps-analysis.json');
      mkdirSync(dirname(analysisPath), { recursive: true });
      writeFileSync(analysisPath, JSON.stringify(blockedStepAnalyses, null, 2), 'utf-8');
      if (!quiet) {
        console.log(`\n💡 Blocked step analysis saved to: ${analysisPath}`);
        console.log('   Use this file to auto-fix journey steps.\n');
      }
    }
  }

  // Output results
  if (result.errors.length > 0) {
    console.error('\nErrors:');
    for (const error of result.errors) {
      console.error(`  - ${error}`);
    }
  }

  // Filter out blocked step warnings from display (already shown above)
  const otherWarnings = result.warnings.filter((w) => !w.includes('BLOCKED:'));
  if (otherWarnings.length > 0 && !quiet) {
    console.warn('\nWarnings:');
    for (const warning of otherWarnings) {
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
    console.log(`  Blocked steps: ${blockedStepAnalyses.length}`);
    console.log(`  Errors: ${result.errors.length}`);
    console.log(`  Warnings: ${otherWarnings.length}`);

    if (blockedStepAnalyses.length > 0) {
      console.log(`\n💡 Run 'artk-autogen patterns gaps' to see pattern improvement suggestions.`);
    }
  }

  // Exit with error if there were errors
  if (result.errors.length > 0) {
    process.exit(1);
  }
}
