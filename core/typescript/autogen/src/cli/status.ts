/**
 * CLI Status Command - Show pipeline state
 *
 * Part of the Hybrid Agentic architecture. Shows current state
 * of the autogen pipeline for the orchestrating LLM to use.
 *
 * @see research/2026-02-02_autogen-enhancement-implementation-plan.md
 */
import { parseArgs } from 'node:util';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import {
  getHarnessRoot,
  getAutogenDir,
  getAutogenArtifact,
  hasAutogenArtifacts,
  type AutogenArtifact,
} from '../utils/paths.js';
import {
  loadPipelineState,
  getPipelineStateSummary,
  type PipelineState as PipelineStateData,
  type PipelineStage,
} from '../pipeline/state.js';
import { getTelemetry } from '../shared/telemetry.js';
import type { AnalysisOutput } from './analyze.js';
import type { PlanOutput } from './plan.js';
import type { RunOutput } from './run.js';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface PipelineStatus {
  version: '1.0';
  harnessRoot: string;
  autogenDir: string;
  hasArtifacts: boolean;
  artifacts: ArtifactStatus[];
  pipeline: PipelineStateView;
  persistedState?: PipelineStateData;
  refinementStates: RefinementStateInfo[];
  summary: StatusSummary;
  checkedAt: string;
}

export interface ArtifactStatus {
  name: AutogenArtifact;
  path: string;
  exists: boolean;
  size?: number;
  modifiedAt?: string;
  summary?: string;
}

export interface PipelineStateView {
  stage: PipelineStage;
  canProceed: boolean;
  nextAction: string;
  blockedReason?: string;
}

// Re-export PipelineStage from state module for consumers
export type { PipelineStage } from '../pipeline/state.js';

export interface RefinementStateInfo {
  testPath: string;
  attempts: number;
  lastStatus: string;
  trend: string;
  isBlocked: boolean;
}

export interface StatusSummary {
  totalJourneys?: number;
  totalPlans?: number;
  testsRun?: number;
  testsPassed?: number;
  testsFailed?: number;
  refinementAttempts: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// USAGE
// ═══════════════════════════════════════════════════════════════════════════

const USAGE = `
Usage: artk-autogen status [options]

Show the current state of the autogen pipeline.

Options:
  --json                 Output JSON to stdout
  -q, --quiet            Suppress output except errors
  -h, --help             Show this help message

Examples:
  artk-autogen status
  artk-autogen status --json
`;

// ═══════════════════════════════════════════════════════════════════════════
// STATUS LOGIC
// ═══════════════════════════════════════════════════════════════════════════

function getArtifactStatus(artifact: AutogenArtifact): ArtifactStatus {
  const path = getAutogenArtifact(artifact);
  const exists = existsSync(path);

  const status: ArtifactStatus = {
    name: artifact,
    path,
    exists,
  };

  if (exists) {
    const stat = statSync(path);
    status.size = stat.size;
    status.modifiedAt = stat.mtime.toISOString();

    // Add summary based on artifact type
    try {
      if (artifact === 'analysis') {
        const data: AnalysisOutput = JSON.parse(readFileSync(path, 'utf-8'));
        status.summary = `${data.journeys?.length || 0} journeys, ${data.summary?.totalSteps || 0} steps`;
      } else if (artifact === 'plan') {
        const data: PlanOutput = JSON.parse(readFileSync(path, 'utf-8'));
        status.summary = `${data.plans?.length || 0} plans, ${data.summary?.totalSteps || 0} steps`;
      } else if (artifact === 'results') {
        const data: RunOutput = JSON.parse(readFileSync(path, 'utf-8'));
        status.summary = `${data.summary?.passed || 0}/${data.summary?.total || 0} passed`;
      }
    } catch {
      status.summary = 'Error reading file';
    }
  }

  return status;
}

function loadRefinementStates(): RefinementStateInfo[] {
  const autogenDir = getAutogenDir();
  if (!existsSync(autogenDir)) return [];

  const states: RefinementStateInfo[] = [];

  try {
    const files = readdirSync(autogenDir);
    for (const file of files) {
      if (file.startsWith('refine-state-') && file.endsWith('.json')) {
        const path = join(autogenDir, file);
        try {
          const data = JSON.parse(readFileSync(path, 'utf-8'));
          const lastAttempt = data.attempts?.[data.attempts.length - 1];

          states.push({
            testPath: data.testPath,
            attempts: data.attempts?.length || 0,
            lastStatus: lastAttempt?.errors?.length > 0 ? 'failed' : 'passed',
            trend: 'unknown', // Would need convergence detector
            isBlocked: data.circuitBreakerState?.isOpen ?? false,  // Fixed: was incorrectly reading circuitBreaker
          });
        } catch {
          // Skip corrupted files
        }
      }
    }
  } catch {
    // Directory read error
  }

  return states;
}

function determinePipelineStage(artifacts: ArtifactStatus[], persistedState?: PipelineStateData): PipelineStateView {
  const hasAnalysis = artifacts.find(a => a.name === 'analysis')?.exists;
  const hasPlan = artifacts.find(a => a.name === 'plan')?.exists;
  const hasResults = artifacts.find(a => a.name === 'results')?.exists;

  // Check results for test status
  let allTestsPassed = false;
  let hasFailures = false;

  if (hasResults) {
    const resultsPath = getAutogenArtifact('results');
    try {
      const data: RunOutput = JSON.parse(readFileSync(resultsPath, 'utf-8'));
      allTestsPassed = data.summary?.failed === 0 && data.summary?.error === 0;
      hasFailures = (data.summary?.failed || 0) > 0 || (data.summary?.error || 0) > 0;
    } catch {
      // Ignore parse errors
    }
  }

  // Check for blocked refinements
  const refinementStates = loadRefinementStates();
  const hasBlockedRefinements = refinementStates.some(s => s.isBlocked);

  // Use persisted state if available and valid
  if (persistedState && persistedState.isBlocked) {
    return {
      stage: 'blocked',
      canProceed: false,
      nextAction: 'Review blocked state and fix manually',
      blockedReason: persistedState.blockedReason || 'Pipeline is blocked',
    };
  }

  // Determine stage
  if (hasBlockedRefinements) {
    return {
      stage: 'blocked',
      canProceed: false,
      nextAction: 'Review blocked refinements and fix manually',
      blockedReason: 'Circuit breaker triggered on one or more tests',
    };
  }

  if (allTestsPassed) {
    return {
      stage: 'completed',
      canProceed: false,
      nextAction: 'Pipeline complete - all tests passing',
    };
  }

  if (hasFailures && refinementStates.length > 0) {
    return {
      stage: 'refining',
      canProceed: true,
      nextAction: 'Run "artk-autogen refine" to get refinement suggestions',
    };
  }

  if (hasResults) {
    return {
      stage: 'tested',
      canProceed: true,
      nextAction: hasFailures
        ? 'Run "artk-autogen refine" to analyze failures'
        : 'Pipeline complete - all tests passing',
    };
  }

  if (hasPlan) {
    return {
      stage: 'planned',
      canProceed: true,
      nextAction: 'Run "artk-autogen generate" to generate tests from plan',
    };
  }

  if (hasAnalysis) {
    return {
      stage: 'analyzed',
      canProceed: true,
      nextAction: 'Run "artk-autogen plan" to create test plan',
    };
  }

  return {
    stage: 'initial',
    canProceed: true,
    nextAction: 'Run "artk-autogen analyze <journey-files>" to start',
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMMAND
// ═══════════════════════════════════════════════════════════════════════════

export async function runStatus(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      json: { type: 'boolean', default: false },
      quiet: { type: 'boolean', short: 'q', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: true,
  });

  if (values.help) {
    console.log(USAGE);
    return;
  }

  const outputJson = values.json;
  const quiet = values.quiet;

  // Initialize telemetry
  const telemetry = getTelemetry();
  await telemetry.load();
  const eventId = telemetry.trackCommandStart('status');

  const harnessRoot = getHarnessRoot();
  const autogenDir = getAutogenDir();

  // Load persisted pipeline state
  const persistedState = loadPipelineState();

  // Check all artifacts
  const artifactTypes: AutogenArtifact[] = [
    'analysis', 'plan', 'state', 'results', 'telemetry',
  ];
  const artifacts = artifactTypes.map(a => getArtifactStatus(a));

  // Load refinement states
  const refinementStates = loadRefinementStates();

  // Determine pipeline state
  const pipeline = determinePipelineStage(artifacts, persistedState);

  // Calculate summary
  const summary: StatusSummary = {
    refinementAttempts: refinementStates.reduce((sum, s) => sum + s.attempts, 0),
  };

  // Extract more info from artifacts
  const analysisArtifact = artifacts.find(a => a.name === 'analysis');
  if (analysisArtifact?.exists) {
    try {
      const data: AnalysisOutput = JSON.parse(readFileSync(analysisArtifact.path, 'utf-8'));
      summary.totalJourneys = data.journeys?.length;
    } catch {
      // Ignore
    }
  }

  const planArtifact = artifacts.find(a => a.name === 'plan');
  if (planArtifact?.exists) {
    try {
      const data: PlanOutput = JSON.parse(readFileSync(planArtifact.path, 'utf-8'));
      summary.totalPlans = data.plans?.length;
    } catch {
      // Ignore
    }
  }

  const resultsArtifact = artifacts.find(a => a.name === 'results');
  if (resultsArtifact?.exists) {
    try {
      const data: RunOutput = JSON.parse(readFileSync(resultsArtifact.path, 'utf-8'));
      summary.testsRun = data.summary?.total;
      summary.testsPassed = data.summary?.passed;
      summary.testsFailed = data.summary?.failed;
    } catch {
      // Ignore
    }
  }

  const status: PipelineStatus = {
    version: '1.0',
    harnessRoot,
    autogenDir,
    hasArtifacts: hasAutogenArtifacts(),
    artifacts,
    pipeline,
    persistedState,
    refinementStates,
    summary,
    checkedAt: new Date().toISOString(),
  };

  // Output
  if (outputJson) {
    console.log(JSON.stringify(status, null, 2));
  } else if (!quiet) {
    console.log('AutoGen Pipeline Status');
    console.log('═'.repeat(50));
    console.log(`Harness: ${harnessRoot}`);
    console.log(`Stage: ${pipeline.stage}`);
    console.log(`Can proceed: ${pipeline.canProceed ? 'Yes' : 'No'}`);
    console.log(`Next action: ${pipeline.nextAction}`);
    if (pipeline.blockedReason) {
      console.log(`Blocked: ${pipeline.blockedReason}`);
    }

    console.log('\nArtifacts:');
    for (const artifact of artifacts) {
      const icon = artifact.exists ? '✓' : '✗';
      const summary = artifact.summary ? ` (${artifact.summary})` : '';
      console.log(`  ${icon} ${artifact.name}${summary}`);
    }

    if (refinementStates.length > 0) {
      console.log('\nRefinement States:');
      for (const state of refinementStates) {
        const icon = state.isBlocked ? '⚠' : '○';
        console.log(`  ${icon} ${basename(state.testPath)}: ${state.attempts} attempts, ${state.lastStatus}`);
      }
    }

    if (summary.testsRun !== undefined) {
      console.log('\nSummary:');
      console.log(`  Journeys: ${summary.totalJourneys || 'N/A'}`);
      console.log(`  Plans: ${summary.totalPlans || 'N/A'}`);
      console.log(`  Tests: ${summary.testsPassed}/${summary.testsRun} passed`);
      console.log(`  Refinement attempts: ${summary.refinementAttempts}`);
    }

    // Show persisted state info if available
    if (persistedState && persistedState.stage !== 'initial') {
      console.log('\nPersisted State:');
      console.log(`  ${getPipelineStateSummary(persistedState)}`);
    }
  }

  // Track command completion
  telemetry.trackCommandEnd(eventId, true, {
    stage: pipeline.stage,
    hasArtifacts: status.hasArtifacts,
    refinementStates: refinementStates.length,
  });
  await telemetry.save();
}
