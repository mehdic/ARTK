/**
 * @module pipeline/state
 * @description Pipeline state management for the Hybrid Agentic architecture
 *
 * Persists pipeline state to .artk/autogen/pipeline-state.json so that:
 * - Orchestrator can resume interrupted pipelines
 * - Status command has accurate information
 * - Commands can validate they're being called in correct order
 *
 * @see research/2026-02-02_autogen-enhancement-implementation-plan.md
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { getAutogenArtifact, ensureAutogenDir } from '../utils/paths.js';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type PipelineStage =
  | 'initial'       // No artifacts
  | 'analyzed'      // analysis.json exists
  | 'planned'       // plan.json exists
  | 'generated'     // Tests generated
  | 'tested'        // Tests executed
  | 'refining'      // In refinement loop
  | 'completed'     // All tests pass
  | 'blocked';      // Circuit breaker triggered

export interface PipelineState {
  version: '1.0';
  stage: PipelineStage;
  lastCommand: string;
  lastCommandAt: string;
  journeyIds: string[];
  testPaths: string[];
  refinementAttempts: number;
  isBlocked: boolean;
  blockedReason?: string;
  history: PipelineHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface PipelineHistoryEntry {
  command: string;
  stage: PipelineStage;
  timestamp: string;
  success: boolean;
  details?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════

function createEmptyState(): PipelineState {
  const now = new Date().toISOString();
  return {
    version: '1.0',
    stage: 'initial',
    lastCommand: 'init',
    lastCommandAt: now,
    journeyIds: [],
    testPaths: [],
    refinementAttempts: 0,
    isBlocked: false,
    history: [],
    createdAt: now,
    updatedAt: now,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// STATE OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Load pipeline state from disk
 */
export function loadPipelineState(baseDir?: string): PipelineState {
  const statePath = getAutogenArtifact('state', baseDir);

  if (!existsSync(statePath)) {
    return createEmptyState();
  }

  try {
    const content = readFileSync(statePath, 'utf-8');
    const state = JSON.parse(content) as PipelineState;

    // Validate version
    if (state.version !== '1.0') {
      console.warn(`Pipeline state version mismatch: expected 1.0, got ${state.version}`);
    }

    return state;
  } catch {
    // Return empty state on parse error
    return createEmptyState();
  }
}

/**
 * Save pipeline state to disk
 */
export async function savePipelineState(
  state: PipelineState,
  baseDir?: string
): Promise<void> {
  await ensureAutogenDir(baseDir);
  const statePath = getAutogenArtifact('state', baseDir);

  state.updatedAt = new Date().toISOString();
  writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');
}

/**
 * Update pipeline state after a command execution
 */
export async function updatePipelineState(
  command: string,
  stage: PipelineStage,
  success: boolean,
  details?: Record<string, unknown>,
  baseDir?: string
): Promise<PipelineState> {
  const state = loadPipelineState(baseDir);

  const now = new Date().toISOString();

  // Update state
  state.stage = stage;
  state.lastCommand = command;
  state.lastCommandAt = now;

  // Add to history (keep last 50 entries)
  state.history.push({
    command,
    stage,
    timestamp: now,
    success,
    details,
  });
  if (state.history.length > 50) {
    state.history = state.history.slice(-50);
  }

  // Update specific fields based on command
  if (details?.journeyIds) {
    state.journeyIds = details.journeyIds as string[];
  }
  if (details?.testPaths) {
    state.testPaths = details.testPaths as string[];
  }
  if (details?.refinementAttempts !== undefined) {
    state.refinementAttempts = details.refinementAttempts as number;
  }
  if (details?.isBlocked !== undefined) {
    state.isBlocked = details.isBlocked as boolean;
    state.blockedReason = details.blockedReason as string | undefined;
  }

  await savePipelineState(state, baseDir);
  return state;
}

/**
 * Reset pipeline state (for clean command)
 */
export async function resetPipelineState(baseDir?: string): Promise<void> {
  await savePipelineState(createEmptyState(), baseDir);
}

/**
 * Check if pipeline can proceed to a given stage
 */
export function canProceedTo(
  currentState: PipelineState,
  targetStage: PipelineStage
): { allowed: boolean; reason?: string } {
  // Define valid transitions
  const validTransitions: Record<PipelineStage, PipelineStage[]> = {
    initial: ['analyzed'],
    analyzed: ['planned', 'initial'], // Can go back via clean
    planned: ['generated', 'analyzed', 'initial'],
    generated: ['tested', 'planned', 'initial'],
    tested: ['refining', 'completed', 'generated', 'initial'],
    refining: ['tested', 'completed', 'blocked', 'initial'],
    completed: ['initial', 'analyzed'], // Can restart
    blocked: ['initial', 'analyzed'], // Can only restart or re-analyze
  };

  const allowed = validTransitions[currentState.stage]?.includes(targetStage) ?? false;

  if (!allowed) {
    return {
      allowed: false,
      reason: `Cannot transition from '${currentState.stage}' to '${targetStage}'. ` +
        `Valid transitions: ${validTransitions[currentState.stage]?.join(', ') || 'none'}`,
    };
  }

  // Special case: blocked state needs manual intervention
  if (currentState.isBlocked && !['initial', 'analyzed'].includes(targetStage)) {
    return {
      allowed: false,
      reason: `Pipeline is blocked: ${currentState.blockedReason}. Clean or re-analyze to continue.`,
    };
  }

  return { allowed: true };
}

/**
 * Get a summary of the current pipeline state
 */
export function getPipelineStateSummary(state: PipelineState): string {
  const lines: string[] = [
    `Stage: ${state.stage}`,
    `Last command: ${state.lastCommand} at ${state.lastCommandAt}`,
  ];

  if (state.journeyIds.length > 0) {
    lines.push(`Journeys: ${state.journeyIds.length}`);
  }
  if (state.testPaths.length > 0) {
    lines.push(`Tests: ${state.testPaths.length}`);
  }
  if (state.refinementAttempts > 0) {
    lines.push(`Refinement attempts: ${state.refinementAttempts}`);
  }
  if (state.isBlocked) {
    lines.push(`BLOCKED: ${state.blockedReason}`);
  }

  return lines.join('\n');
}
