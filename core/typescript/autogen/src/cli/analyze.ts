/**
 * CLI Analyze Command - Analyze journey for test generation
 *
 * Part of the Hybrid Agentic architecture where the CLI provides
 * analysis data and the orchestrating LLM makes decisions.
 *
 * @see research/2026-02-02_autogen-enhancement-implementation-plan.md
 */
import { parseArgs } from 'node:util';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { basename } from 'node:path';
import fg from 'fast-glob';
import yaml from 'yaml';
import {
  getHarnessRoot,
  getAutogenArtifact,
  ensureAutogenDir,
  validatePath,
  PathTraversalError,
} from '../utils/paths.js';
import { updatePipelineState, loadPipelineState, canProceedTo } from '../pipeline/state.js';
import { getTelemetry } from '../shared/telemetry.js';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface JourneyAnalysis {
  journeyId: string;
  journeyPath: string;
  title: string;
  tier: string;
  status: string;
  actor: string;
  scope: string[];
  acceptanceCriteria: string[];
  steps: StepAnalysis[];
  dependencies: string[];
  complexity: ComplexityScore;
  warnings: string[];
  analyzedAt: string;
}

export interface StepAnalysis {
  index: number;
  text: string;
  type: StepType;
  hasSelector: boolean;
  hasAssertion: boolean;
  estimatedComplexity: 'low' | 'medium' | 'high';
  keywords: string[];
}

export type StepType =
  | 'navigation'
  | 'interaction'
  | 'assertion'
  | 'wait'
  | 'form'
  | 'unknown';

export interface ComplexityScore {
  overall: 'simple' | 'moderate' | 'complex';
  stepCount: number;
  assertionCount: number;
  interactionCount: number;
  formSteps: number;
  navigationSteps: number;
  estimatedLOC: number;
}

export interface AnalysisOutput {
  version: '1.0';
  harnessRoot: string;
  journeys: JourneyAnalysis[];
  summary: AnalysisSummary;
  analyzedAt: string;
}

export interface AnalysisSummary {
  totalJourneys: number;
  totalSteps: number;
  complexityDistribution: Record<string, number>;
  commonKeywords: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// USAGE
// ═══════════════════════════════════════════════════════════════════════════

const USAGE = `
Usage: artk-autogen analyze [options] <journey-files...>

Analyze journey files and output structured analysis for the orchestrating LLM.

Arguments:
  journey-files    Journey file paths or glob patterns

Options:
  -o, --output <path>    Output path for analysis.json (default: .artk/autogen/analysis.json)
  --json                 Output JSON to stdout instead of file
  -q, --quiet            Suppress output except errors
  -f, --force            Skip pipeline state validation
  -h, --help             Show this help message

Examples:
  artk-autogen analyze journeys/login.md
  artk-autogen analyze "journeys/*.md"
  artk-autogen analyze journeys/*.md --json
  artk-autogen analyze journeys/*.md -o custom/analysis.json
`;

// ═══════════════════════════════════════════════════════════════════════════
// STEP ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

const STEP_PATTERNS = {
  navigation: [
    /navigate/i, /go to/i, /open/i, /visit/i, /load/i, /url/i,
  ],
  interaction: [
    /click/i, /tap/i, /press/i, /select/i, /choose/i, /toggle/i,
    /expand/i, /collapse/i, /hover/i, /drag/i, /drop/i,
  ],
  assertion: [
    /see/i, /verify/i, /should/i, /expect/i, /confirm/i, /check/i,
    /visible/i, /displayed/i, /appears/i, /shows/i, /contains/i,
  ],
  wait: [
    /wait/i, /until/i, /loading/i, /spinner/i, /timeout/i,
  ],
  form: [
    /enter/i, /type/i, /fill/i, /input/i, /submit/i, /form/i,
    /field/i, /text/i, /password/i, /email/i, /upload/i,
  ],
};

function classifyStep(stepText: string): StepType {
  for (const [type, patterns] of Object.entries(STEP_PATTERNS)) {
    if (patterns.some(p => p.test(stepText))) {
      return type as StepType;
    }
  }
  return 'unknown';
}

function extractKeywords(stepText: string): string[] {
  // Extract meaningful words (nouns, verbs related to UI)
  const uiKeywords = [
    'button', 'link', 'input', 'field', 'form', 'modal', 'dialog',
    'dropdown', 'menu', 'tab', 'panel', 'table', 'row', 'cell',
    'checkbox', 'radio', 'toggle', 'switch', 'slider', 'spinner',
    'toast', 'alert', 'notification', 'message', 'error', 'success',
    'header', 'footer', 'sidebar', 'nav', 'navigation', 'search',
    'filter', 'sort', 'pagination', 'page', 'screen', 'view',
  ];

  const words = stepText.toLowerCase().split(/\s+/);
  return words.filter(w => uiKeywords.includes(w) || w.length > 3);
}

function hasSelector(stepText: string): boolean {
  // Check for selector-like patterns
  return /["'].*["']/.test(stepText) ||
    /data-testid/i.test(stepText) ||
    /\[.*\]/.test(stepText) ||
    /#\w+/.test(stepText) ||
    /\.\w+/.test(stepText);
}

function hasAssertion(stepText: string): boolean {
  return STEP_PATTERNS.assertion.some(p => p.test(stepText));
}

function estimateComplexity(stepText: string, type: StepType): 'low' | 'medium' | 'high' {
  const text = stepText.toLowerCase();

  // High complexity indicators
  if (text.includes('table') || text.includes('grid') || text.includes('ag-grid')) {
    return 'high';
  }
  if (text.includes('drag') || text.includes('drop')) {
    return 'high';
  }
  if (text.includes('upload') || text.includes('file')) {
    return 'high';
  }
  if (text.includes('iframe') || text.includes('frame')) {
    return 'high';
  }

  // Medium complexity indicators
  if (type === 'form' || type === 'wait') {
    return 'medium';
  }
  if (text.includes('modal') || text.includes('dialog')) {
    return 'medium';
  }

  return 'low';
}

function analyzeStep(stepText: string, index: number): StepAnalysis {
  const type = classifyStep(stepText);
  return {
    index,
    text: stepText,
    type,
    hasSelector: hasSelector(stepText),
    hasAssertion: hasAssertion(stepText),
    estimatedComplexity: estimateComplexity(stepText, type),
    keywords: extractKeywords(stepText),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// JOURNEY PARSING
// ═══════════════════════════════════════════════════════════════════════════

interface JourneyFrontmatter {
  id?: string;
  title?: string;
  tier?: string;
  status?: string;
  actor?: string;
  scope?: string[];
  dependencies?: string[];
}

function parseJourneyFile(filePath: string): JourneyAnalysis {
  const content = readFileSync(filePath, 'utf-8');
  const warnings: string[] = [];

  // Extract frontmatter
  let frontmatter: JourneyFrontmatter = {};
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (fmMatch && fmMatch[1]) {
    try {
      frontmatter = yaml.parse(fmMatch[1]) || {};
    } catch (e) {
      warnings.push(`Failed to parse frontmatter: ${e}`);
    }
  }

  // Extract acceptance criteria (## Acceptance Criteria section)
  const acceptanceCriteria: string[] = [];
  const acMatch = content.match(/##\s*Acceptance Criteria\s*\n([\s\S]*?)(?=\n##|\n---|$)/i);
  if (acMatch && acMatch[1]) {
    const lines = acMatch[1].split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\./.test(trimmed)) {
        acceptanceCriteria.push(trimmed.replace(/^[-*\d.]+\s*/, ''));
      }
    }
  }

  // Extract steps (## Steps or ## Procedure section)
  const steps: StepAnalysis[] = [];
  const stepsMatch = content.match(/##\s*(?:Steps|Procedure|Test Steps)\s*\n([\s\S]*?)(?=\n##|\n---|$)/i);
  if (stepsMatch && stepsMatch[1]) {
    const lines = stepsMatch[1].split('\n');
    let stepIndex = 0;
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\./.test(trimmed)) {
        const stepText = trimmed.replace(/^[-*\d.]+\s*/, '');
        if (stepText) {
          steps.push(analyzeStep(stepText, stepIndex++));
        }
      }
    }
  }

  // Calculate complexity
  const stepCount = steps.length;
  const assertionCount = steps.filter(s => s.hasAssertion).length;
  const interactionCount = steps.filter(s => s.type === 'interaction').length;
  const formSteps = steps.filter(s => s.type === 'form').length;
  const navigationSteps = steps.filter(s => s.type === 'navigation').length;

  let overall: 'simple' | 'moderate' | 'complex' = 'simple';
  if (stepCount > 15 || steps.some(s => s.estimatedComplexity === 'high')) {
    overall = 'complex';
  } else if (stepCount > 8 || formSteps > 3) {
    overall = 'moderate';
  }

  // Estimate LOC (rough approximation)
  const estimatedLOC = 20 + stepCount * 5 + assertionCount * 3 + formSteps * 8;

  const journeyId = frontmatter.id || basename(filePath, '.md');

  return {
    journeyId,
    journeyPath: filePath,
    title: frontmatter.title || journeyId,
    tier: frontmatter.tier || 'regression',
    status: frontmatter.status || 'proposed',
    actor: frontmatter.actor || 'user',
    scope: frontmatter.scope || [],
    acceptanceCriteria,
    steps,
    dependencies: frontmatter.dependencies || [],
    complexity: {
      overall,
      stepCount,
      assertionCount,
      interactionCount,
      formSteps,
      navigationSteps,
      estimatedLOC,
    },
    warnings,
    analyzedAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMMAND
// ═══════════════════════════════════════════════════════════════════════════

export async function runAnalyze(args: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args,
    options: {
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

  if (positionals.length === 0) {
    console.error('Error: No journey files specified');
    console.log(USAGE);
    process.exit(1);
  }

  const quiet = values.quiet;
  const outputJson = values.json;
  const force = values.force;

  // Validate pipeline state transition (unless --force)
  if (!force) {
    const currentState = await loadPipelineState();
    const transition = canProceedTo(currentState, 'analyzed');
    if (!transition.allowed) {
      console.error(`Error: ${transition.reason}`);
      console.error('Use --force to bypass state validation.');
      process.exit(1);
    }
  } else if (!quiet && !outputJson) {
    console.log('Warning: Bypassing pipeline state validation (--force)');
  }

  // Initialize telemetry
  const telemetry = getTelemetry();
  await telemetry.load();
  const eventId = telemetry.trackCommandStart('analyze');

  const harnessRoot = getHarnessRoot();

  // Expand glob patterns
  const journeyFiles = await fg(positionals, {
    absolute: true,
    cwd: harnessRoot,
  });

  if (journeyFiles.length === 0) {
    console.error('Error: No journey files found matching the patterns');
    process.exit(1);
  }

  // SECURITY: Validate all paths are within harness root to prevent path traversal
  const validatedFiles: string[] = [];
  for (const file of journeyFiles) {
    try {
      const validated = validatePath(file, harnessRoot);
      validatedFiles.push(validated);
    } catch (error) {
      if (error instanceof PathTraversalError) {
        console.error(`Warning: Skipping file outside harness root: ${file}`);
        continue;
      }
      throw error;
    }
  }

  if (validatedFiles.length === 0) {
    console.error('Error: No valid journey files within harness root');
    process.exit(1);
  }

  if (!quiet && !outputJson) {
    console.log(`Analyzing ${validatedFiles.length} journey file(s)...`);
  }

  // Analyze each journey
  const journeys: JourneyAnalysis[] = [];
  const allKeywords: string[] = [];

  for (const file of validatedFiles) {
    if (!existsSync(file)) {
      console.error(`Warning: File not found: ${file}`);
      continue;
    }
    const analysis = parseJourneyFile(file);
    journeys.push(analysis);
    for (const step of analysis.steps) {
      allKeywords.push(...step.keywords);
    }
  }

  // Calculate summary
  const complexityDistribution: Record<string, number> = {
    simple: 0,
    moderate: 0,
    complex: 0,
  };
  for (const j of journeys) {
    const level = j.complexity.overall;
    if (complexityDistribution[level] !== undefined) {
      complexityDistribution[level]++;
    }
  }

  // Find common keywords
  const keywordCounts = new Map<string, number>();
  for (const kw of allKeywords) {
    keywordCounts.set(kw, (keywordCounts.get(kw) || 0) + 1);
  }
  const commonKeywords = [...keywordCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([kw]) => kw);

  const output: AnalysisOutput = {
    version: '1.0',
    harnessRoot,
    journeys,
    summary: {
      totalJourneys: journeys.length,
      totalSteps: journeys.reduce((sum, j) => sum + j.steps.length, 0),
      complexityDistribution,
      commonKeywords,
    },
    analyzedAt: new Date().toISOString(),
  };

  // Output
  if (outputJson) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    // Write to file
    const outputPath = values.output || getAutogenArtifact('analysis');
    await ensureAutogenDir();
    writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

    if (!quiet) {
      console.log(`\nAnalysis complete:`);
      console.log(`  Journeys: ${output.summary.totalJourneys}`);
      console.log(`  Steps: ${output.summary.totalSteps}`);
      console.log(`  Complexity: ${JSON.stringify(complexityDistribution)}`);
      console.log(`\nOutput: ${outputPath}`);
    }
  }

  // Update pipeline state
  await updatePipelineState('analyze', 'analyzed', true, {
    journeyIds: journeys.map(j => j.journeyId),
  });

  // Track command completion
  telemetry.trackCommandEnd(eventId, true, {
    journeyCount: journeys.length,
    stepCount: output.summary.totalSteps,
  });
  await telemetry.save();
}
