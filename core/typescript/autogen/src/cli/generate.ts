/**
 * CLI Generate Command - Generate Playwright tests from Journey files
 * @see T094 - Create CLI entry point for generation
 * @see research/2026-01-23_llkb-autogen-integration-specification.md (LLKB integration)
 * @see research/2026-01-27_autogen-empty-stubs-implementation-plan.md (telemetry)
 */
import { parseArgs } from 'node:util';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import fg from 'fast-glob';
import { generateJourneyTests, type GenerateJourneyTestsOptions } from '../index.js';
import { loadConfigs } from '../config/loader.js';
import { loadExtendedGlossary, getGlossaryStats } from '../mapping/glossary.js';
import { recordBlockedStep } from '../mapping/telemetry.js';
import { analyzeBlockedStep, formatBlockedStepAnalysis } from '../mapping/blockedStepAnalysis.js';
import { updatePipelineState, loadPipelineState, canProceedTo } from '../pipeline/state.js';
import { getTelemetry } from '../shared/telemetry.js';
import type { PlanOutput, TestPlan } from './plan.js';

// ═══════════════════════════════════════════════════════════════════════════
// PLAN-BASED GENERATION
// ═══════════════════════════════════════════════════════════════════════════

interface GenerateOptions {
  output?: string;
  modules: boolean;
  config?: string;
  'dry-run': boolean;
  quiet: boolean;
  'llkb-config'?: string;
  'llkb-glossary'?: string;
  'no-llkb': boolean;
}

/**
 * Generate tests from a plan file
 */
async function runGenerateFromPlan(
  planPath: string,
  journeyFilter: string | undefined,
  options: GenerateOptions
): Promise<void> {
  const quiet = options.quiet;
  const dryRun = options['dry-run'];
  const outputDir = options.output || './tests/generated';

  // Load plan
  let planOutput: PlanOutput;
  try {
    planOutput = JSON.parse(readFileSync(planPath, 'utf-8'));
  } catch (e) {
    console.error(`Error: Failed to parse plan file: ${e}`);
    process.exit(1);
  }

  // Filter plans if journey specified
  let plans = planOutput.plans || [];
  if (journeyFilter) {
    plans = plans.filter(p => p.journeyId === journeyFilter);
    if (plans.length === 0) {
      console.error(`Error: No plans found for journey "${journeyFilter}"`);
      process.exit(1);
    }
  }

  if (!quiet) {
    console.log(`Generating tests from plan: ${plans.length} journey(s)`);
  }

  // Load LLKB configs/glossary if provided
  await loadLlkbResources(options, quiet);

  // Generate from each plan
  const allTests: { filename: string; code: string }[] = [];
  const allModules: { filename: string; code: string }[] = [];
  const allWarnings: string[] = [];
  const allErrors: string[] = [];

  for (const plan of plans) {
    if (!quiet) {
      console.log(`  Processing: ${plan.journeyId}`);
    }

    // If plan has a journeyPath, use the existing generation
    if (plan.journeyPath && existsSync(plan.journeyPath)) {
      const genOptions: GenerateJourneyTestsOptions = {
        journeys: [plan.journeyPath],
        isFilePaths: true,
        outputDir,
        generateModules: options.modules,
      };

      if (options.config) {
        genOptions.config = options.config;
      }

      const result = await generateJourneyTests(genOptions);
      allTests.push(...result.tests);
      allModules.push(...result.modules);
      allWarnings.push(...result.warnings);
      allErrors.push(...result.errors);
    } else {
      // Generate directly from plan (for orchestrator-created plans)
      const code = generateCodeFromPlan(plan);
      allTests.push({
        filename: `${plan.journeyId}.spec.ts`,
        code,
      });
    }
  }

  // Write files
  if (!dryRun) {
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    for (const test of allTests) {
      const filePath = join(outputDir, test.filename);
      mkdirSync(dirname(filePath), { recursive: true });
      writeFileSync(filePath, test.code, 'utf-8');
      if (!quiet) {
        console.log(`Generated: ${filePath}`);
      }
    }

    for (const mod of allModules) {
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
      for (const test of allTests) {
        console.log(`  - ${join(outputDir, test.filename)}`);
      }
      for (const mod of allModules) {
        console.log(`  - ${join(outputDir, 'modules', mod.filename)}`);
      }
    }
  }

  // Summary
  if (!quiet) {
    console.log(`\nSummary:`);
    console.log(`  Tests: ${allTests.length}`);
    console.log(`  Modules: ${allModules.length}`);
    console.log(`  Errors: ${allErrors.length}`);
    console.log(`  Warnings: ${allWarnings.length}`);
  }

  if (allErrors.length > 0) {
    console.error('\nErrors:');
    for (const error of allErrors) {
      console.error(`  - ${error}`);
    }
    process.exit(1);
  }
}

/**
 * Generate test code directly from a plan
 * This is used when the orchestrator creates plans without journey files
 */
function generateCodeFromPlan(plan: TestPlan): string {
  const imports = plan.imports.join(', ');

  // Ensure 'page' is always included in fixtures (required for most Playwright operations)
  // This prevents broken tests when plan.fixtures doesn't include 'page'
  const fixtureSet = new Set(plan.fixtures);
  if (fixtureSet.size > 0 && !fixtureSet.has('page')) {
    fixtureSet.add('page');
  }
  const fixtureList = fixtureSet.size > 0 ? Array.from(fixtureSet) : ['page'];
  const fixtures = `{ ${fixtureList.join(', ')} }`;

  const steps = plan.steps.map((step, idx) => {
    let code = '';
    const action = step.action;

    switch (action.type) {
      case 'navigate':
        code = `  await page.goto('${action.target || '/'}');`;
        break;
      case 'click':
        code = `  await page.locator('${action.target || 'button'}').click();`;
        break;
      case 'fill':
        code = `  await page.locator('${action.target || 'input'}').fill('${action.value || ''}');`;
        break;
      case 'assert':
        code = `  await expect(page.locator('${action.target || '*'}')).toBeVisible();`;
        break;
      case 'wait':
        code = `  await page.waitForLoadState('${step.waitCondition || 'networkidle'}');`;
        break;
      default:
        code = `  // TODO: ${step.description}`;
    }

    return `    // Step ${idx + 1}: ${step.description}\n${code}`;
  }).join('\n\n');

  return `/**
 * @journey ${plan.journeyId}
 * @generated ${plan.createdAt}
 * @strategy ${plan.strategy}
 */
import { ${imports} } from '@playwright/test';

test.describe('${plan.journeyId}', () => {
  test('should complete journey', async (${fixtures}) => {
${steps}
  });
});
`;
}

/**
 * Load LLKB resources (config and glossary)
 */
async function loadLlkbResources(options: GenerateOptions, quiet: boolean): Promise<void> {
  const configPaths: string[] = [];
  if (options.config) {
    configPaths.push(options.config);
  }
  if (options['llkb-config'] && !options['no-llkb']) {
    configPaths.push(options['llkb-config']);
  }

  if (configPaths.length > 1) {
    loadConfigs(configPaths);
    if (!quiet) {
      console.log(`Loaded ${configPaths.length} config file(s)`);
    }
  }

  if (options['llkb-glossary'] && !options['no-llkb']) {
    const glossaryResult = await loadExtendedGlossary(options['llkb-glossary']);
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
}

const USAGE = `
Usage: artk-autogen generate [options] [journey-files...]

Generate Playwright tests from plan or Journey markdown files.

This command supports two modes:
1. Plan-based (recommended): Use --plan to generate from a prepared plan
2. Direct (legacy): Pass journey files directly for backwards compatibility

Arguments:
  journey-files    Journey file paths or glob patterns (legacy mode)

Options:
  -o, --output <dir>       Output directory for generated files (default: ./tests/generated)
  -m, --modules            Also generate module files
  -c, --config <file>      Path to autogen config file
  --plan <file>            Path to plan.json (default: .artk/autogen/plan.json if exists)
  --journey <id>           Generate only for specific journey ID from plan
  --dry-run                Preview generation without writing files
  -q, --quiet              Suppress output except errors
  -f, --force              Skip pipeline state validation
  -h, --help               Show this help message

LLKB Integration Options:
  --llkb-config <file>     Path to LLKB-generated config file
  --llkb-glossary <file>   Path to LLKB-generated glossary file
  --no-llkb                Disable LLKB integration even if config enables it

Examples:
  # Plan-based generation (recommended)
  artk-autogen generate --plan .artk/autogen/plan.json
  artk-autogen generate --plan plan.json --journey JRN-0001

  # Direct generation (legacy, still supported)
  artk-autogen generate journeys/login.md
  artk-autogen generate "journeys/*.md" -o tests/e2e -m
  artk-autogen generate journeys/*.md --llkb-config autogen-llkb.config.yml
`;

export async function runGenerate(args: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args,
    options: {
      output: { type: 'string', short: 'o' },
      modules: { type: 'boolean', short: 'm', default: false },
      config: { type: 'string', short: 'c' },
      plan: { type: 'string' },
      journey: { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
      quiet: { type: 'boolean', short: 'q', default: false },
      force: { type: 'boolean', short: 'f', default: false },
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

  const quiet = values.quiet;
  const force = values.force;

  // Validate pipeline state transition (unless --force)
  if (!force) {
    const currentState = loadPipelineState();
    const transition = canProceedTo(currentState, 'generated');
    if (!transition.allowed) {
      console.error(`Error: ${transition.reason}`);
      console.error('Use --force to bypass state validation.');
      process.exit(1);
    }
  } else if (!quiet) {
    console.log('Warning: Bypassing pipeline state validation (--force)');
  }

  // Initialize telemetry
  const telemetry = getTelemetry();
  await telemetry.load();
  const eventId = telemetry.trackCommandStart('generate');

  // Check for plan-based generation
  const planPath = values.plan;
  const journeyFilter = values.journey;

  // If no positionals and no plan specified, check for default plan
  if (positionals.length === 0 && !planPath) {
    // Try default plan location
    const { getAutogenArtifact } = await import('../utils/paths.js');
    const defaultPlanPath = getAutogenArtifact('plan');
    if (existsSync(defaultPlanPath)) {
      // Use plan-based generation
      await runGenerateFromPlan(defaultPlanPath, journeyFilter, values);
      // Track completion for plan-based generation
      await updatePipelineState('generate', 'generated', true, { mode: 'plan' });
      telemetry.trackCommandEnd(eventId, true, { mode: 'plan-based-default' });
      await telemetry.save();
      return;
    }
    console.error('Error: No journey files specified and no plan found');
    console.log('Run "artk-autogen analyze" and "artk-autogen plan" first, or provide journey files.');
    console.log(USAGE);
    telemetry.trackCommandEnd(eventId, false, { error: 'no_input' });
    await telemetry.save();
    process.exit(1);
  }

  // If plan is explicitly specified, use plan-based generation
  if (planPath) {
    if (!existsSync(planPath)) {
      console.error(`Error: Plan file not found: ${planPath}`);
      telemetry.trackCommandEnd(eventId, false, { error: 'plan_not_found' });
      await telemetry.save();
      process.exit(1);
    }
    await runGenerateFromPlan(planPath, journeyFilter, values);
    // Track completion for plan-based generation
    await updatePipelineState('generate', 'generated', true, { mode: 'plan', planPath });
    telemetry.trackCommandEnd(eventId, true, { mode: 'plan-based-explicit' });
    await telemetry.save();
    return;
  }

  const outputDir = values.output || './tests/generated';
  const dryRun = values['dry-run'];

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
    telemetry.trackCommandEnd(eventId, false, { error: 'no_matching_files' });
    await telemetry.save();
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

  // Update pipeline state
  const success = result.errors.length === 0;
  await updatePipelineState('generate', 'generated', success, {
    testsGenerated: result.tests.length,
    modulesGenerated: result.modules.length,
    blockedSteps: blockedStepAnalyses.length,
  });

  // Track command completion
  telemetry.trackCommandEnd(eventId, success, {
    tests: result.tests.length,
    modules: result.modules.length,
    blockedSteps: blockedStepAnalyses.length,
    errors: result.errors.length,
    warnings: otherWarnings.length,
    dryRun,
  });
  await telemetry.save();

  // Exit with error if there were errors
  if (result.errors.length > 0) {
    process.exit(1);
  }
}
