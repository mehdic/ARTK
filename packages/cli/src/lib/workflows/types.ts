/**
 * Workflow types - Simple, testable workflow definitions
 *
 * Schema version: 1.0.0
 */

import { z } from 'zod';

// Environment types
export type ExecutionEnvironment = 'vscode-local' | 'github-web' | 'cli-terminal' | 'ci-pipeline' | 'unknown';

// Batch mode - only serial is currently implemented
export type BatchMode = 'serial' | 'parallel';  // Full type for future
export type ImplementedBatchMode = 'serial';     // What's actually available now

// Learning modes
export type LearningMode = 'strict' | 'batch' | 'none';

// Journey status schema
export const JourneyStatusSchema = z.enum([
  'proposed',
  'defined',
  'clarified',
  'implemented',
  'quarantined',
  'deprecated'
]);

export type JourneyStatus = z.infer<typeof JourneyStatusSchema>;

// Journey frontmatter schema (for validation)
export const JourneyFrontmatterSchema = z.object({
  id: z.string().regex(/^JRN-\d{4}$/, 'Journey ID must match JRN-XXXX pattern'),
  title: z.string().min(1, 'Title is required'),
  status: JourneyStatusSchema,
  tests: z.array(z.string()).optional().default([]),
  tier: z.enum(['smoke', 'release', 'regression']).optional(),
  actor: z.string().optional(),
  scope: z.string().optional(),
}).passthrough(); // Allow additional fields

export type JourneyFrontmatter = z.infer<typeof JourneyFrontmatterSchema>;

// Workflow context
export interface WorkflowContext {
  projectRoot: string;
  harnessRoot: string;
  llkbRoot: string;
  dryRun: boolean;
  environment: ExecutionEnvironment;
}

// Journey info
export interface JourneyInfo {
  id: string;
  path: string;
  status: JourneyStatus;
  title: string;
  tests: string[];
}

// Session state (tracks progress across journeys)
export interface SessionState {
  // Session metadata
  sessionId: string;
  schemaVersion: string;
  savedAt?: string;

  // Journey tracking
  journeysRequested: string[];
  journeysCompleted: string[];
  journeysFailed: string[];
  currentJourneyIndex: number;
  totalJourneys: number;

  // Execution modes (only serial implemented)
  batchMode: ImplementedBatchMode;
  learningMode: LearningMode;

  // LLKB tracking
  llkbExportCount: number;
  llkbSkippedExports: number;
  lastLlkbExportTime: number;

  // Timing
  startTime: number;
  endTime?: number;

  // Per-journey state (reset between journeys)
  currentJourneyId: string | null;
  verificationPassed: boolean;
  testsGenerated: string[];
}

// Validation result
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// Workflow result
export interface WorkflowResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
}

// LLKB config schema
export const LLKBConfigSchema = z.object({
  enabled: z.boolean(),
  version: z.string().optional(),
  minConfidence: z.number().min(0).max(1).optional(),
}).passthrough();

export type LLKBConfig = z.infer<typeof LLKBConfigSchema>;

// Batch limits
export const BATCH_LIMITS = {
  SOFT_LIMIT: 10,
  HARD_LIMIT: 50,
} as const;

// Default timeout for commands (5 minutes)
export const DEFAULT_COMMAND_TIMEOUT_MS = 5 * 60 * 1000;

// Session schema version
export const SESSION_SCHEMA_VERSION = '1.0.0';

// Generate a simple session ID
function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `sess_${timestamp}_${random}`;
}

// Create initial session state
export function createSessionState(
  journeyIds: string[],
  batchMode: ImplementedBatchMode,
  learningMode: LearningMode
): SessionState {
  return {
    sessionId: generateSessionId(),
    schemaVersion: SESSION_SCHEMA_VERSION,
    journeysRequested: journeyIds,
    journeysCompleted: [],
    journeysFailed: [],
    currentJourneyIndex: 0,
    totalJourneys: journeyIds.length,
    batchMode,
    learningMode,
    llkbExportCount: 0,
    llkbSkippedExports: 0,
    lastLlkbExportTime: 0,
    startTime: Date.now(),
    currentJourneyId: null,
    verificationPassed: false,
    testsGenerated: [],
  };
}
