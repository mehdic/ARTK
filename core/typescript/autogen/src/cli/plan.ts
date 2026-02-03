/**
 * CLI Plan Command - Create test generation plan
 *
 * Part of the Hybrid Agentic architecture. The orchestrating LLM can
 * either use the plan command to create a default plan, or create
 * the plan directly and pass it to generate.
 *
 * @see research/2026-02-02_autogen-enhancement-implementation-plan.md
 */
import { parseArgs } from 'node:util';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import {
  getAutogenArtifact,
  ensureAutogenDir,
} from '../utils/paths.js';
import { updatePipelineState, loadPipelineState, canProceedTo } from '../pipeline/state.js';
import { getTelemetry } from '../shared/telemetry.js';
import {
  createOrchestratorSampleRequest,
  DEFAULT_MULTI_SAMPLER_CONFIG,
  type OrchestratorSampleRequest,
} from '../uncertainty/multi-sampler.js';
import type { AnalysisOutput, JourneyAnalysis } from './analyze.js';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface TestPlan {
  version: '1.0';
  journeyId: string;
  journeyPath: string;
  strategy: PlanStrategy;
  steps: PlannedStep[];
  modules: PlannedModule[];
  imports: string[];
  fixtures: string[];
  configuration: PlanConfiguration;
  createdAt: string;
  createdBy: 'cli' | 'orchestrator';
  /** Multi-sample request for orchestrator (when strategy is 'multi-sample') */
  multiSampleRequest?: OrchestratorSampleRequest;
}

export type PlanStrategy = 'direct' | 'scot' | 'multi-sample';

export interface PlannedStep {
  index: number;
  description: string;
  action: PlannedAction;
  expectedOutcome?: string;
  selectors?: SelectorHint[];
  assertions?: AssertionHint[];
  waitCondition?: string;
  notes?: string;
}

export interface PlannedAction {
  type: 'navigate' | 'click' | 'fill' | 'select' | 'assert' | 'wait' | 'custom';
  target?: string;
  value?: string;
  options?: Record<string, unknown>;
}

export interface SelectorHint {
  strategy: 'testId' | 'role' | 'text' | 'label' | 'css' | 'xpath';
  value: string;
  confidence: number;
}

export interface AssertionHint {
  type: 'visible' | 'text' | 'value' | 'enabled' | 'checked' | 'url' | 'title';
  expected?: string;
}

export interface PlannedModule {
  name: string;
  type: 'page' | 'flow' | 'component';
  methods: string[];
}

export interface PlanConfiguration {
  timeout: number;
  retries: number;
  parallel: boolean;
  screenshot: 'on' | 'off' | 'only-on-failure';
  video: 'on' | 'off' | 'retain-on-failure';
  trace: 'on' | 'off' | 'retain-on-failure';
}

export interface PlanOutput {
  version: '1.0';
  plans: TestPlan[];
  summary: PlanSummary;
  createdAt: string;
}

export interface PlanSummary {
  totalPlans: number;
  totalSteps: number;
  strategies: Record<PlanStrategy, number>;
  estimatedTestTime: number; // seconds
}

// ═══════════════════════════════════════════════════════════════════════════
// USAGE
// ═══════════════════════════════════════════════════════════════════════════

const USAGE = `
Usage: artk-autogen plan [options]

Create test generation plan from analysis or direct input.

Options:
  -a, --analysis <path>  Path to analysis.json (default: .artk/autogen/analysis.json)
  -j, --journey <id>     Plan for specific journey ID only
  -s, --strategy <type>  Generation strategy: direct, scot, multi-sample (default: direct)
  -o, --output <path>    Output path for plan.json (default: .artk/autogen/plan.json)
  --json                 Output JSON to stdout instead of file
  -q, --quiet            Suppress output except errors
  -f, --force            Skip pipeline state validation
  -h, --help             Show this help message

Examples:
  artk-autogen plan
  artk-autogen plan --analysis custom/analysis.json
  artk-autogen plan --journey JRN-0001 --strategy scot
  artk-autogen plan --json
`;

// ═══════════════════════════════════════════════════════════════════════════
// PLAN GENERATION
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_CONFIG: PlanConfiguration = {
  timeout: 30000,
  retries: 2,
  parallel: false,
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
  trace: 'retain-on-failure',
};

function convertStepToAction(step: JourneyAnalysis['steps'][0]): PlannedAction {
  const text = step.text.toLowerCase();

  // Navigation
  if (step.type === 'navigation') {
    const urlMatch = text.match(/(?:to|url|page)\s+["']?([^"'\s]+)/i);
    return {
      type: 'navigate',
      target: urlMatch?.[1] || '/',
    };
  }

  // Click/interaction
  if (step.type === 'interaction') {
    return {
      type: 'click',
      target: extractTarget(text),
    };
  }

  // Form filling
  if (step.type === 'form') {
    const valueMatch = text.match(/["']([^"']+)["']/);
    return {
      type: 'fill',
      target: extractTarget(text),
      value: valueMatch?.[1] || '',
    };
  }

  // Assertion
  if (step.type === 'assertion') {
    return {
      type: 'assert',
      target: extractTarget(text),
    };
  }

  // Wait
  if (step.type === 'wait') {
    return {
      type: 'wait',
      options: { timeout: 5000 },
    };
  }

  // Default
  return {
    type: 'custom',
    target: text,
  };
}

function extractTarget(text: string): string {
  // Try to extract quoted strings
  const quoted = text.match(/["']([^"']+)["']/);
  if (quoted && quoted[1]) return quoted[1];

  // Try to extract button/link names
  const buttonMatch = text.match(/(?:button|link|input|field)\s+(?:called|named|labeled)?\s*["']?(\w+)/i);
  if (buttonMatch && buttonMatch[1]) return buttonMatch[1];

  // Return last noun-like word
  const words = text.split(/\s+/).filter(w => w.length > 2);
  return words[words.length - 1] || 'unknown';
}

function inferSelectors(step: JourneyAnalysis['steps'][0]): SelectorHint[] {
  const selectors: SelectorHint[] = [];
  const text = step.text.toLowerCase();

  // Check for data-testid hints
  const testIdMatch = text.match(/data-testid\s*[=:]\s*["']?([^"'\s]+)/i);
  if (testIdMatch && testIdMatch[1]) {
    selectors.push({
      strategy: 'testId',
      value: testIdMatch[1],
      confidence: 0.95,
    });
  }

  // Check for button/link names (suggest role-based)
  const buttonMatch = text.match(/(?:click|press)\s+(?:the\s+)?["']?(\w+)["']?\s*button/i);
  if (buttonMatch && buttonMatch[1]) {
    selectors.push({
      strategy: 'role',
      value: `button[name="${buttonMatch[1]}"]`,
      confidence: 0.7,
    });
  }

  // Check for links
  const linkMatch = text.match(/(?:click|press)\s+(?:the\s+)?["']?([^"']+)["']?\s*link/i);
  if (linkMatch && linkMatch[1]) {
    selectors.push({
      strategy: 'role',
      value: `link[name="${linkMatch[1]}"]`,
      confidence: 0.7,
    });
  }

  // Check for text content
  const textMatch = text.match(/(?:with|containing|text)\s+["']([^"']+)["']/i);
  if (textMatch && textMatch[1]) {
    selectors.push({
      strategy: 'text',
      value: textMatch[1],
      confidence: 0.6,
    });
  }

  return selectors;
}

function inferAssertions(step: JourneyAnalysis['steps'][0]): AssertionHint[] {
  const assertions: AssertionHint[] = [];
  const text = step.text.toLowerCase();

  if (text.includes('visible') || text.includes('see') || text.includes('displayed')) {
    assertions.push({ type: 'visible' });
  }

  if (text.includes('text') || text.includes('message') || text.includes('shows')) {
    const textMatch = text.match(/["']([^"']+)["']/);
    assertions.push({
      type: 'text',
      expected: textMatch?.[1],
    });
  }

  if (text.includes('url') || text.includes('navigate')) {
    const urlMatch = text.match(/url\s+(?:is|contains)?\s*["']?([^"'\s]+)/i);
    assertions.push({
      type: 'url',
      expected: urlMatch?.[1],
    });
  }

  return assertions;
}

function createPlanFromJourney(
  journey: JourneyAnalysis,
  strategy: PlanStrategy
): TestPlan {
  const steps: PlannedStep[] = journey.steps.map((step, idx) => ({
    index: idx,
    description: step.text,
    action: convertStepToAction(step),
    selectors: inferSelectors(step),
    assertions: step.hasAssertion ? inferAssertions(step) : undefined,
    waitCondition: step.type === 'wait' ? 'networkidle' : undefined,
  }));

  // Infer modules needed
  const modules: PlannedModule[] = [];

  // Check if auth is needed
  if (journey.scope.includes('auth') || journey.steps.some(s => s.text.toLowerCase().includes('login'))) {
    modules.push({
      name: 'auth',
      type: 'flow',
      methods: ['login', 'logout'],
    });
  }

  // Check for navigation patterns
  const hasNavigation = journey.steps.some(s => s.type === 'navigation');
  if (hasNavigation) {
    modules.push({
      name: 'navigation',
      type: 'flow',
      methods: ['navigateTo'],
    });
  }

  // Check for form interactions
  const hasForms = journey.steps.some(s => s.type === 'form');
  if (hasForms) {
    modules.push({
      name: 'forms',
      type: 'component',
      methods: ['fillForm', 'submitForm'],
    });
  }

  // Standard imports
  const imports = ['test', 'expect'];

  // Fixtures based on dependencies
  const fixtures: string[] = [];
  if (modules.some(m => m.name === 'auth')) {
    fixtures.push('authenticatedPage');
  }

  // Adjust config based on complexity
  const config = { ...DEFAULT_CONFIG };
  if (journey.complexity.overall === 'complex') {
    config.timeout = 60000;
    config.retries = 3;
    config.trace = 'on';
  }

  const plan: TestPlan = {
    version: '1.0',
    journeyId: journey.journeyId,
    journeyPath: journey.journeyPath,
    strategy,
    steps,
    modules,
    imports,
    fixtures,
    configuration: config,
    createdAt: new Date().toISOString(),
    createdBy: 'cli',
  };

  // Add multi-sample request if strategy is multi-sample
  if (strategy === 'multi-sample') {
    const prompt = createMultiSamplePrompt(journey, steps);
    plan.multiSampleRequest = createOrchestratorSampleRequest(
      prompt,
      journey.journeyId,
      DEFAULT_MULTI_SAMPLER_CONFIG
    );
  }

  return plan;
}

/**
 * Create a prompt for multi-sample generation
 */
function createMultiSamplePrompt(journey: JourneyAnalysis, steps: PlannedStep[]): string {
  const stepDescriptions = steps.map((s, i) =>
    `${i + 1}. ${s.description} (${s.action.type})`
  ).join('\n');

  return `Generate a Playwright test for the following journey:

Journey ID: ${journey.journeyId}
Title: ${journey.title}
Tier: ${journey.tier}
Complexity: ${journey.complexity.overall}

Steps:
${stepDescriptions}

Acceptance Criteria:
${journey.acceptanceCriteria.map(ac => `- ${ac}`).join('\n')}

Requirements:
- Use Playwright Test syntax with TypeScript
- Use data-testid selectors where possible
- Include proper assertions for each acceptance criterion
- Add appropriate wait conditions for async operations
- Follow Playwright best practices for reliability`;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMMAND
// ═══════════════════════════════════════════════════════════════════════════

export async function runPlan(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      analysis: { type: 'string', short: 'a' },
      journey: { type: 'string', short: 'j' },
      strategy: { type: 'string', short: 's', default: 'direct' },
      output: { type: 'string', short: 'o' },
      json: { type: 'boolean', default: false },
      quiet: { type: 'boolean', short: 'q', default: false },
      force: { type: 'boolean', short: 'f', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: true,
  });

  if (values.help) {
    console.log(USAGE);
    return;
  }

  const quiet = values.quiet;
  const outputJson = values.json;
  const force = values.force;
  const strategyInput = values.strategy?.toLowerCase().trim() || 'direct';

  // Validate and normalize strategy
  const validStrategies = ['direct', 'scot', 'multi-sample'];
  if (!validStrategies.includes(strategyInput)) {
    console.error(`Error: Invalid strategy "${strategyInput}". Use: ${validStrategies.join(', ')}`);
    process.exit(1);
  }
  const strategy = strategyInput as PlanStrategy;

  // Initialize telemetry
  const telemetry = getTelemetry();
  await telemetry.load();
  const eventId = telemetry.trackCommandStart('plan');

  // Validate pipeline state transition (unless --force)
  const pipelineState = await loadPipelineState();
  if (!force) {
    const transition = canProceedTo(pipelineState, 'planned');
    if (!transition.allowed) {
      console.error(`Error: ${transition.reason}`);
      console.error('Use --force to bypass state validation.');
      process.exit(1);
    }
  } else if (!quiet && !outputJson) {
    console.log('Warning: Bypassing pipeline state validation (--force)');
  }

  // Load analysis
  const analysisPath = values.analysis || getAutogenArtifact('analysis');
  if (!existsSync(analysisPath)) {
    console.error(`Error: Analysis file not found: ${analysisPath}`);
    console.error('Run "artk-autogen analyze" first.');
    process.exit(1);
  }

  let analysis: AnalysisOutput;
  try {
    analysis = JSON.parse(readFileSync(analysisPath, 'utf-8'));
  } catch (e) {
    console.error(`Error: Failed to parse analysis file: ${e}`);
    process.exit(1);
  }

  // Filter journeys if specific one requested
  let journeys = analysis.journeys;
  if (values.journey) {
    journeys = journeys.filter(j => j.journeyId === values.journey);
    if (journeys.length === 0) {
      console.error(`Error: Journey "${values.journey}" not found in analysis`);
      process.exit(1);
    }
  }

  if (!quiet && !outputJson) {
    console.log(`Creating plan for ${journeys.length} journey(s) with strategy: ${strategy}`);
  }

  // Create plans
  const plans: TestPlan[] = journeys.map(j => createPlanFromJourney(j, strategy));

  // Calculate summary
  const strategyCount: Record<PlanStrategy, number> = {
    direct: 0,
    scot: 0,
    'multi-sample': 0,
  };
  for (const p of plans) {
    strategyCount[p.strategy]++;
  }

  const totalSteps = plans.reduce((sum, p) => sum + p.steps.length, 0);
  // Rough estimate: 2 seconds per step average
  const estimatedTestTime = totalSteps * 2;

  const output: PlanOutput = {
    version: '1.0',
    plans,
    summary: {
      totalPlans: plans.length,
      totalSteps,
      strategies: strategyCount,
      estimatedTestTime,
    },
    createdAt: new Date().toISOString(),
  };

  // Output
  if (outputJson) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    // Write to file
    const outputPath = values.output || getAutogenArtifact('plan');
    await ensureAutogenDir();
    writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

    if (!quiet) {
      console.log(`\nPlan created:`);
      console.log(`  Plans: ${output.summary.totalPlans}`);
      console.log(`  Steps: ${output.summary.totalSteps}`);
      console.log(`  Strategy: ${strategy}`);
      console.log(`  Est. time: ${Math.ceil(estimatedTestTime / 60)} min`);

      // Show multi-sample info if applicable
      const multiSamplePlans = plans.filter(p => p.multiSampleRequest);
      if (multiSamplePlans.length > 0) {
        console.log(`  Multi-sample enabled: ${multiSamplePlans.length} plan(s)`);
      }

      console.log(`\nOutput: ${outputPath}`);
    }
  }

  // Update pipeline state
  await updatePipelineState('plan', 'planned', true, {
    journeyIds: plans.map(p => p.journeyId),
  });

  // Track command completion
  telemetry.trackCommandEnd(eventId, true, {
    planCount: plans.length,
    stepCount: totalSteps,
    strategy,
  });
  await telemetry.save();
}
