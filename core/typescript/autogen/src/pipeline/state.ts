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
import { readFileSync, writeFileSync, existsSync, renameSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { z } from 'zod';
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
// VALIDATION SCHEMA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Valid pipeline stages
 */
const VALID_STAGES: PipelineStage[] = [
  'initial', 'analyzed', 'planned', 'generated',
  'tested', 'refining', 'completed', 'blocked'
];

/**
 * Zod schema for validating pipeline state
 */
const PipelineHistoryEntrySchema = z.object({
  command: z.string(),
  stage: z.enum(['initial', 'analyzed', 'planned', 'generated', 'tested', 'refining', 'completed', 'blocked']),
  timestamp: z.string(),
  success: z.boolean(),
  details: z.record(z.unknown()).optional(),
});

const PipelineStateSchema = z.object({
  version: z.literal('1.0'),
  stage: z.enum(['initial', 'analyzed', 'planned', 'generated', 'tested', 'refining', 'completed', 'blocked']),
  lastCommand: z.string(),
  lastCommandAt: z.string(),
  journeyIds: z.array(z.string()),
  testPaths: z.array(z.string()),
  refinementAttempts: z.number(),
  isBlocked: z.boolean(),
  blockedReason: z.string().optional(),
  history: z.array(PipelineHistoryEntrySchema),
  createdAt: z.string(),
  updatedAt: z.string(),
}).passthrough(); // Allow unknown fields for forward compatibility

/**
 * Result of loading pipeline state
 */
export interface LoadStateResult {
  state: PipelineState;
  wasCorrupted: boolean;
  wasReset: boolean;
  backupPath?: string;
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
 * Create a backup of a corrupted state file
 */
function backupCorruptedFile(statePath: string): string | undefined {
  const backupPath = `${statePath}.corrupted.${Date.now()}`;
  try {
    renameSync(statePath, backupPath);
    return backupPath;
  } catch {
    // If we can't rename, try to leave the original and just warn
    return undefined;
  }
}

/**
 * Load pipeline state from disk
 *
 * Features:
 * - Validates state against Zod schema
 * - Creates backup of corrupted files
 * - Logs warnings for issues
 * - Returns empty state on unrecoverable errors
 */
export function loadPipelineState(baseDir?: string): PipelineState {
  const statePath = getAutogenArtifact('state', baseDir);

  if (!existsSync(statePath)) {
    return createEmptyState();
  }

  let content: string;
  let parsed: unknown;

  // Step 1: Read file
  try {
    content = readFileSync(statePath, 'utf-8');
  } catch (error) {
    console.warn(`Warning: Cannot read pipeline state file: ${statePath}`);
    console.warn(`  Error: ${error instanceof Error ? error.message : 'Unknown'}`);
    return createEmptyState();
  }

  // Step 2: Parse JSON
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    console.warn(`Warning: Pipeline state file contains invalid JSON, creating backup and resetting.`);
    console.warn(`  Error: ${error instanceof Error ? error.message : 'Unknown'}`);

    const backupPath = backupCorruptedFile(statePath);
    if (backupPath) {
      console.warn(`  Backup saved to: ${backupPath}`);
    }

    return createEmptyState();
  }

  // Step 3: Validate against schema
  const validation = PipelineStateSchema.safeParse(parsed);

  if (!validation.success) {
    console.warn(`Warning: Pipeline state file has invalid structure, creating backup and resetting.`);

    // Log first few validation errors for debugging
    const errors = validation.error.errors.slice(0, 3);
    for (const err of errors) {
      console.warn(`  - ${err.path.join('.')}: ${err.message}`);
    }
    if (validation.error.errors.length > 3) {
      console.warn(`  ... and ${validation.error.errors.length - 3} more errors`);
    }

    const backupPath = backupCorruptedFile(statePath);
    if (backupPath) {
      console.warn(`  Backup saved to: ${backupPath}`);
    }

    return createEmptyState();
  }

  const state = validation.data as PipelineState;

  // Step 4: Warn about unknown fields (for forward compatibility)
  const knownFields = new Set([
    'version', 'stage', 'lastCommand', 'lastCommandAt', 'journeyIds',
    'testPaths', 'refinementAttempts', 'isBlocked', 'blockedReason',
    'history', 'createdAt', 'updatedAt'
  ]);
  const unknownFields = Object.keys(parsed as object).filter(k => !knownFields.has(k));
  if (unknownFields.length > 0) {
    console.warn(`Warning: Pipeline state has unknown fields (may be from newer version): ${unknownFields.join(', ')}`);
  }

  // Step 5: Validate stage is in valid list (extra safety)
  if (!VALID_STAGES.includes(state.stage)) {
    console.warn(`Warning: Invalid pipeline stage "${state.stage}", resetting to "initial"`);
    state.stage = 'initial';
  }

  return state;
}

/**
 * Load pipeline state with detailed result
 *
 * Same as loadPipelineState but returns additional metadata about
 * whether the state was corrupted, reset, or backed up.
 */
export function loadPipelineStateWithInfo(baseDir?: string): LoadStateResult {
  const statePath = getAutogenArtifact('state', baseDir);

  if (!existsSync(statePath)) {
    return {
      state: createEmptyState(),
      wasCorrupted: false,
      wasReset: true,
    };
  }

  let content: string;
  let parsed: unknown;

  // Step 1: Read file
  try {
    content = readFileSync(statePath, 'utf-8');
  } catch (error) {
    console.warn(`Warning: Cannot read pipeline state file: ${statePath}`);
    console.warn(`  Error: ${error instanceof Error ? error.message : 'Unknown'}`);
    return {
      state: createEmptyState(),
      wasCorrupted: true,
      wasReset: true,
    };
  }

  // Step 2: Parse JSON
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    console.warn(`Warning: Pipeline state file contains invalid JSON, creating backup and resetting.`);
    console.warn(`  Error: ${error instanceof Error ? error.message : 'Unknown'}`);

    const backupPath = backupCorruptedFile(statePath);
    if (backupPath) {
      console.warn(`  Backup saved to: ${backupPath}`);
    }

    return {
      state: createEmptyState(),
      wasCorrupted: true,
      wasReset: true,
      backupPath,
    };
  }

  // Step 3: Validate against schema
  const validation = PipelineStateSchema.safeParse(parsed);

  if (!validation.success) {
    console.warn(`Warning: Pipeline state file has invalid structure, creating backup and resetting.`);

    const errors = validation.error.errors.slice(0, 3);
    for (const err of errors) {
      console.warn(`  - ${err.path.join('.')}: ${err.message}`);
    }
    if (validation.error.errors.length > 3) {
      console.warn(`  ... and ${validation.error.errors.length - 3} more errors`);
    }

    const backupPath = backupCorruptedFile(statePath);
    if (backupPath) {
      console.warn(`  Backup saved to: ${backupPath}`);
    }

    return {
      state: createEmptyState(),
      wasCorrupted: true,
      wasReset: true,
      backupPath,
    };
  }

  return {
    state: validation.data as PipelineState,
    wasCorrupted: false,
    wasReset: false,
  };
}

/**
 * Save pipeline state to disk atomically
 *
 * Uses write-to-temp + rename pattern for atomic writes.
 * This prevents file corruption if two processes write simultaneously
 * or if the process is interrupted during write.
 */
export async function savePipelineState(
  state: PipelineState,
  baseDir?: string
): Promise<void> {
  await ensureAutogenDir(baseDir);
  const statePath = getAutogenArtifact('state', baseDir);

  state.updatedAt = new Date().toISOString();
  const content = JSON.stringify(state, null, 2);

  // Atomic write: write to temp file in same directory, then rename
  // Rename is atomic on most filesystems (POSIX guarantees it)
  const tempPath = join(dirname(statePath), `.state-${process.pid}-${Date.now()}.tmp`);

  try {
    writeFileSync(tempPath, content, 'utf-8');
    renameSync(tempPath, statePath);
  } catch (err) {
    // Clean up temp file on error
    try {
      if (existsSync(tempPath)) {
        unlinkSync(tempPath);
      }
    } catch {
      // Ignore cleanup errors
    }
    throw err;
  }
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
