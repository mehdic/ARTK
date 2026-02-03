/**
 * CLI Generate Command - Generate Playwright tests from Journey files
 * @see T094 - Create CLI entry point for generation
 * @see research/2026-01-23_llkb-autogen-integration-specification.md (LLKB integration)
 * @see research/2026-01-27_autogen-empty-stubs-implementation-plan.md (telemetry)
 */
import { parseArgs } from 'node:util';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname, basename, resolve, relative } from 'node:path';
import fg from 'fast-glob';
import { generateJourneyTests, type GenerateJourneyTestsOptions } from '../index.js';
import { loadConfigs } from '../config/loader.js';
import { loadExtendedGlossary, getGlossaryStats } from '../mapping/glossary.js';
import { recordBlockedStep } from '../mapping/telemetry.js';
import { analyzeBlockedStep, formatBlockedStepAnalysis } from '../mapping/blockedStepAnalysis.js';
import { updatePipelineState, loadPipelineState, canProceedTo } from '../pipeline/state.js';
import { getTelemetry } from '../shared/telemetry.js';
import { recordPatternSuccess } from '../llkb/patternExtension.js';
import { plannedActionToIRPrimitive } from '../mapping/plannedActionAdapter.js';
import type { PlanOutput, TestPlan, PlannedStep } from './plan.js';

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

  // Track LLKB learning stats
  let totalLlkbRecorded = 0;
  let totalLlkbSkipped = 0;
  const useLlkb = !options['no-llkb'];

  for (const plan of plans) {
    if (!quiet) {
      console.log(`  Processing: ${plan.journeyId}`);
    }

    // Prefer generating from plan steps when available (already structured with actions)
    // This avoids re-parsing markdown and potentially losing step information
    if (plan.steps && plan.steps.length > 0 && plan.steps.some(s => s.action)) {
      // Plan has structured steps with actions - use direct generation
      const code = generateCodeFromPlan(plan);
      allTests.push({
        filename: `${plan.journeyId.toLowerCase()}.spec.ts`,
        code,
      });

      // Record successful patterns to LLKB for learning (if enabled)
      if (useLlkb && !dryRun) {
        const llkbResult = recordLlkbLearning(plan, { quiet });
        totalLlkbRecorded += llkbResult.recorded;
        totalLlkbSkipped += llkbResult.skipped;
      }
    } else if (plan.journeyPath && existsSync(plan.journeyPath)) {
      // Fallback: re-parse journey file if plan lacks structured steps
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
      // No steps and no journey path - generate empty stub
      const code = generateCodeFromPlan(plan);
      allTests.push({
        filename: `${plan.journeyId.toLowerCase()}.spec.ts`,
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
      // SECURITY: Validate path to prevent traversal attacks
      const filePath = validateOutputPath(outputDir, test.filename);
      mkdirSync(dirname(filePath), { recursive: true });
      writeFileSync(filePath, test.code, 'utf-8');
      if (!quiet) {
        console.log(`Generated: ${filePath}`);
      }
    }

    for (const mod of allModules) {
      // SECURITY: Validate path to prevent traversal attacks
      const filePath = validateOutputPath(outputDir, join('modules', mod.filename));
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
    if (useLlkb && (totalLlkbRecorded > 0 || totalLlkbSkipped > 0)) {
      console.log(`  LLKB patterns learned: ${totalLlkbRecorded} (${totalLlkbSkipped} skipped)`);
    }
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
 * Record successful pattern matches to LLKB for learning
 * This enables the system to learn from successful generations
 */
function recordLlkbLearning(
  plan: TestPlan,
  options: { llkbRoot?: string; quiet?: boolean } = {}
): { recorded: number; skipped: number } {
  let recorded = 0;
  let skipped = 0;

  for (const step of plan.steps) {
    // Skip custom/TODO actions - these weren't successfully matched
    if (step.action.type === 'custom') {
      skipped++;
      continue;
    }

    // Convert the PlannedAction back to an IR Primitive for recording
    const primitive = plannedActionToIRPrimitive(step.action);
    if (!primitive) {
      skipped++;
      continue;
    }

    try {
      // Record the successful pattern match
      recordPatternSuccess(
        step.description,
        primitive,
        plan.journeyId,
        { llkbRoot: options.llkbRoot }
      );
      recorded++;
    } catch (err) {
      // LLKB recording is non-fatal - continue generation
      if (!options.quiet) {
        console.warn(`  Warning: Failed to record LLKB pattern: ${err}`);
      }
      skipped++;
    }
  }

  return { recorded, skipped };
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
    const code = generateActionCode(step.action, step.waitCondition);
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
 * Escape string for use in generated code (single-quoted strings)
 *
 * SECURITY: Escapes all characters that could break out of single-quoted strings
 * or enable code injection:
 * - Backslash: literal backslashes
 * - Single quote: string delimiter
 * - Backtick: template literal delimiter (prevents ${} injection)
 * - Dollar sign: prevents ${} template injection even outside backticks
 * - Newline/carriage return: prevents multi-line injection
 */
function escapeStringForCode(str: string): string {
  return str
    .replace(/\\/g, '\\\\')       // Escape backslashes first
    .replace(/'/g, "\\'")          // Escape single quotes
    .replace(/`/g, '\\`')          // Escape backticks (template literals)
    .replace(/\$/g, '\\$')         // Escape dollar signs (prevent ${} injection)
    .replace(/\n/g, '\\n')         // Escape newlines
    .replace(/\r/g, '\\r');        // Escape carriage returns
}

/**
 * Dangerous URL schemes that could enable code execution or data exfiltration
 */
const DANGEROUS_URL_SCHEMES = [
  'javascript:',
  'data:',
  'vbscript:',
  'file:',
];

/**
 * Validate that a file path stays within the output directory
 *
 * SECURITY: Prevents path traversal attacks (e.g., ../../../etc/passwd)
 *
 * @throws Error if path escapes the output directory
 */
function validateOutputPath(outputDir: string, filename: string): string {

  // Resolve both paths to absolute
  const resolvedOutput = resolve(outputDir);
  const resolvedFile = resolve(outputDir, filename);

  // Check that the file path starts with the output directory
  const relativePath = relative(resolvedOutput, resolvedFile);

  // If relative path starts with ".." or is absolute, it's escaping
  if (relativePath.startsWith('..') || resolve(relativePath) === relativePath) {
    throw new Error(`Security: Path traversal detected in filename "${filename}"`);
  }

  return resolvedFile;
}

/**
 * Validate and sanitize a URL for use in navigation
 *
 * SECURITY: Blocks dangerous URL schemes that could enable:
 * - Code execution (javascript:, vbscript:)
 * - Data exfiltration (data:)
 * - Local file access (file:)
 *
 * @returns Sanitized URL or '/' if URL is dangerous
 */
function sanitizeNavigationUrl(url: string): string {
  const trimmedUrl = url.trim().toLowerCase();

  for (const scheme of DANGEROUS_URL_SCHEMES) {
    if (trimmedUrl.startsWith(scheme)) {
      console.warn(`Security: Blocked dangerous URL scheme "${scheme}" - using "/" instead`);
      return '/';
    }
  }

  return url;
}

/**
 * Generate code for a planned action
 */
function generateActionCode(action: PlannedStep['action'], waitCondition?: string): string {
  const target = action.target || '';
  const value = action.value || '';

  switch (action.type) {
    // Navigation
    case 'navigate':
      return `    await page.goto('${escapeStringForCode(sanitizeNavigationUrl(target || '/'))}');`;
    case 'reload':
      return `    await page.reload();`;
    case 'goBack':
      return `    await page.goBack();`;
    case 'goForward':
      return `    await page.goForward();`;

    // Click interactions
    case 'click':
      return generateClickCode(target);
    case 'dblclick':
      return generateClickCode(target).replace('.click()', '.dblclick()');
    case 'rightClick':
      return generateClickCode(target).replace('.click()', ".click({ button: 'right' })");

    // Form interactions
    case 'fill':
      return generateFillCode(target, value);
    case 'select':
      return `    await page.getByLabel('${escapeStringForCode(target)}').selectOption('${escapeStringForCode(value)}');`;
    case 'check':
      return `    await page.getByLabel('${escapeStringForCode(target)}').check();`;
    case 'uncheck':
      return `    await page.getByLabel('${escapeStringForCode(target)}').uncheck();`;
    case 'clear':
      return `    await page.getByLabel('${escapeStringForCode(target)}').clear();`;
    case 'upload':
      const files = action.files?.map(f => `'${escapeStringForCode(f)}'`).join(', ') || '';
      return `    await page.getByLabel('${escapeStringForCode(target)}').setInputFiles([${files}]);`;

    // Other interactions
    case 'press':
      const key = action.key || 'Enter';
      return `    await page.keyboard.press('${key}');`;
    case 'hover':
      return generateClickCode(target).replace('.click()', '.hover()');
    case 'focus':
      return `    await page.getByLabel('${escapeStringForCode(target)}').focus();`;

    // Visibility assertions
    case 'assert':
      return generateAssertCode(target);
    case 'assertHidden':
      return `    await expect(page.getByText('${escapeStringForCode(target)}')).toBeHidden();`;

    // Text/value assertions
    case 'assertText':
      return `    await expect(page.getByText('${escapeStringForCode(target)}')).toContainText('${escapeStringForCode(value)}');`;
    case 'assertValue':
      return `    await expect(page.getByLabel('${escapeStringForCode(target)}')).toHaveValue('${escapeStringForCode(value)}');`;

    // State assertions
    case 'assertChecked':
      return `    await expect(page.getByLabel('${escapeStringForCode(target)}')).toBeChecked();`;
    case 'assertEnabled':
      return `    await expect(page.getByLabel('${escapeStringForCode(target)}')).toBeEnabled();`;
    case 'assertDisabled':
      return `    await expect(page.getByLabel('${escapeStringForCode(target)}')).toBeDisabled();`;
    case 'assertCount':
      const count = action.count ?? 1;
      return `    await expect(page.getByText('${escapeStringForCode(target)}')).toHaveCount(${count});`;

    // Page assertions
    case 'assertURL':
      return `    await expect(page).toHaveURL(/${escapeStringForCode(target).replace(/\//g, '\\/')}/);`;
    case 'assertTitle':
      return `    await expect(page).toHaveTitle('${escapeStringForCode(target)}');`;

    // Toast/notification assertions
    case 'assertToast':
      const toastType = action.toastType || 'info';
      const message = value ? `.getByText('${escapeStringForCode(value)}')` : '';
      return `    await expect(page.getByRole('alert')${message}).toBeVisible(); // ${toastType} toast`;

    // Modal/alert handling
    case 'dismissModal':
      return `    await page.getByRole('dialog').getByRole('button', { name: /close|cancel|dismiss/i }).click();`;
    case 'acceptAlert':
      return `    page.once('dialog', dialog => dialog.accept());`;
    case 'dismissAlert':
      return `    page.once('dialog', dialog => dialog.dismiss());`;

    // Wait actions
    case 'wait':
      return `    await page.waitForLoadState('${waitCondition || 'networkidle'}');`;
    case 'waitForVisible':
      return `    await page.getByText('${escapeStringForCode(target)}').waitFor({ state: 'visible' });`;
    case 'waitForHidden':
      return `    await page.getByText('${escapeStringForCode(target)}').waitFor({ state: 'hidden' });`;
    case 'waitForURL':
      return `    await page.waitForURL(/${escapeStringForCode(target).replace(/\//g, '\\/')}/);`;
    case 'waitForNetwork':
      return `    await page.waitForLoadState('networkidle');`;

    // Module calls
    case 'callModule':
      const module = action.module || 'unknown';
      const method = action.method || 'run';
      return `    // Module call: ${module}.${method}()\n    // TODO: Implement module call or use fixture`;

    // Custom/fallback
    case 'custom':
    default:
      return `    // TODO: ${target}`;
  }
}

/**
 * Generate click code based on target format
 * Supports: "button:Name", "link:Name", or plain selector/text
 */
function generateClickCode(target: string): string {
  // Handle "button:Name" format
  if (target.startsWith('button:')) {
    const name = target.slice(7);
    return `    await page.getByRole('button', { name: '${escapeStringForCode(name)}' }).click();`;
  }

  // Handle "link:Name" format
  if (target.startsWith('link:')) {
    const name = target.slice(5);
    return `    await page.getByRole('link', { name: '${escapeStringForCode(name)}' }).click();`;
  }

  // Handle "checkbox:Name" format
  if (target.startsWith('checkbox:')) {
    const name = target.slice(9);
    return `    await page.getByLabel('${escapeStringForCode(name)}').click();`;
  }

  // Handle "menu:Name" format
  if (target.startsWith('menu:')) {
    const name = target.slice(5);
    return `    await page.getByRole('menuitem', { name: '${escapeStringForCode(name)}' }).click();`;
  }

  // Handle "tab:Name" format
  if (target.startsWith('tab:')) {
    const name = target.slice(4);
    return `    await page.getByRole('tab', { name: '${escapeStringForCode(name)}' }).click();`;
  }

  // Handle "menuitem:Name" format (actual ARIA role)
  if (target.startsWith('menuitem:')) {
    const name = target.slice(9);
    return `    await page.getByRole('menuitem', { name: '${escapeStringForCode(name)}' }).click();`;
  }

  // Default: use getByText for text content
  return `    await page.getByText('${escapeStringForCode(target)}').click();`;
}

/**
 * Generate fill code based on target format
 * Target is typically a field label
 */
function generateFillCode(target: string, value: string): string {
  // Handle "placeholder:Name" format
  if (target.startsWith('placeholder:')) {
    const placeholder = target.slice(12);
    return `    await page.getByPlaceholder('${escapeStringForCode(placeholder)}').fill('${escapeStringForCode(value)}');`;
  }

  // Use getByLabel for labeled inputs (most accessible approach)
  return `    await page.getByLabel('${escapeStringForCode(target)}').fill('${escapeStringForCode(value)}');`;
}

/**
 * Generate assertion code based on target
 */
function generateAssertCode(target: string): string {
  // Handle "status:Name" format for status role
  if (target.startsWith('status:')) {
    const name = target.slice(7);
    return `    await expect(page.getByRole('status', { name: '${escapeStringForCode(name)}' })).toBeVisible();`;
  }

  // Check if target looks like a page name
  const lowerTarget = target.toLowerCase();
  if (lowerTarget.includes('page') || lowerTarget.includes('dashboard') || lowerTarget.includes('home')) {
    // For page-level assertions, check for heading or main content
    return `    await expect(page.getByRole('heading', { level: 1 })).toContainText('${escapeStringForCode(target)}');`;
  }

  // Default: check that the text is visible
  return `    await expect(page.getByText('${escapeStringForCode(target)}')).toBeVisible();`;
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
      // SECURITY: Validate path to prevent traversal attacks
      const filePath = validateOutputPath(outputDir, test.filename);
      mkdirSync(dirname(filePath), { recursive: true });
      writeFileSync(filePath, test.code, 'utf-8');
      if (!quiet) {
        console.log(`Generated: ${filePath}`);
      }
    }

    // Write module files
    for (const mod of result.modules) {
      // SECURITY: Validate path to prevent traversal attacks
      const filePath = validateOutputPath(outputDir, join('modules', mod.filename));
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
