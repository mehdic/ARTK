/**
 * Journey Implement Workflow
 *
 * This is the testable logic extracted from artk.journey-implement.md.
 * The prompt now just calls these CLI commands instead of containing pseudocode.
 *
 * Security fixes applied:
 * - No shell: true (prevents command injection)
 * - Path traversal protection
 * - Proper argument handling (no split(' '))
 * - Environment detection
 * - Terminal access checks
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import {
  WorkflowContext,
  WorkflowResult,
  JourneyInfo,
  SessionState,
  ExecutionEnvironment,
  ImplementedBatchMode,
  LearningMode,
  createSessionState,
  BATCH_LIMITS,
  DEFAULT_COMMAND_TIMEOUT_MS,
  SESSION_SCHEMA_VERSION,
} from './types.js';
import {
  loadJourney,
  validateJourneyForImplementation,
  validateLLKB,
  validateBatchMode,
  validateLearningMode,
  findJourneyFiles,
  parseJourneyList,
  validateBatchSize,
  isPathSafe,
} from './journey-validate.js';

export interface ImplementOptions {
  journeyIds: string;
  batchMode?: string;
  learningMode?: string;
  dryRun?: boolean;
  verbose?: boolean;
}

export interface ImplementPlan {
  journeys: JourneyInfo[];
  batchMode: ImplementedBatchMode;  // Only 'serial' is implemented
  learningMode: LearningMode;
  llkbExportCommand: CommandSpec;
  autogenCommands: CommandSpec[];
  warnings: string[];
  environment: ExecutionEnvironment;
}

/**
 * Command specification - safe alternative to string commands
 * Prevents command injection by separating command from arguments
 */
export interface CommandSpec {
  /** The executable (npx, npm, etc) */
  executable: string;
  /** Array of arguments - never concatenated as string */
  args: string[];
  /** Working directory */
  cwd?: string;
  /** Human-readable description */
  description: string;
}

/**
 * Detect the current execution environment
 * Enhanced detection for various IDEs and environments
 */
export function detectEnvironment(): ExecutionEnvironment {
  // VS Code (includes Copilot, Claude Code, etc.)
  if (process.env.VSCODE_PID || process.env.VSCODE_CWD || process.env.TERM_PROGRAM === 'vscode') {
    return 'vscode-local';
  }

  // Cursor IDE (VS Code fork)
  if (process.env.CURSOR_TRACE_ID || process.env.TERM_PROGRAM === 'Cursor') {
    return 'vscode-local'; // Cursor behaves like VS Code
  }

  // JetBrains IDEs (IntelliJ, WebStorm, PyCharm, etc.)
  if (process.env.JETBRAINS_IDE || process.env.TERMINAL_EMULATOR?.includes('JetBrains')) {
    return 'vscode-local'; // JetBrains has terminal access
  }

  // CI/CD pipelines
  if (
    process.env.GITHUB_ACTIONS === 'true' ||
    process.env.GITLAB_CI === 'true' ||
    process.env.JENKINS_URL ||
    process.env.CIRCLECI === 'true' ||
    process.env.TRAVIS === 'true' ||
    process.env.CI === 'true'
  ) {
    return 'ci-pipeline';
  }

  // GitHub Codespace or web-based Copilot (no terminal)
  if (process.env.CODESPACES === 'true' || process.env.GITHUB_CODESPACE_TOKEN) {
    return 'github-web';
  }

  // WSL (Windows Subsystem for Linux) - has terminal access
  if (process.env.WSL_DISTRO_NAME || process.env.WSLENV) {
    return 'cli-terminal';
  }

  // Docker container - has terminal access
  if (fs.existsSync('/.dockerenv') || process.env.container === 'docker') {
    return 'cli-terminal';
  }

  // Standard CLI terminal
  if (process.stdout.isTTY) {
    return 'cli-terminal';
  }

  return 'unknown';
}

/**
 * Check if terminal access is available for command execution
 */
export function hasTerminalAccess(environment: ExecutionEnvironment): { available: boolean; reason?: string } {
  switch (environment) {
    case 'vscode-local':
      return { available: true };
    case 'cli-terminal':
      return { available: true };
    case 'ci-pipeline':
      return { available: true };
    case 'github-web':
      return {
        available: false,
        reason: 'GitHub.com Copilot does not have terminal access. Use VS Code with Copilot extension or CLI instead.',
      };
    case 'unknown':
      return {
        available: false,
        reason: 'Unknown environment. Cannot determine terminal access availability.',
      };
  }
}

/**
 * Build the implementation plan (what would happen)
 */
export function buildImplementPlan(
  ctx: WorkflowContext,
  options: ImplementOptions
): WorkflowResult<ImplementPlan> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Detect environment
  const environment = detectEnvironment();

  // Check terminal access
  const terminalCheck = hasTerminalAccess(environment);
  if (!terminalCheck.available && !options.dryRun) {
    return {
      success: false,
      error: terminalCheck.reason || 'Terminal access not available',
    };
  }

  if (!terminalCheck.available && options.dryRun) {
    warnings.push(`${terminalCheck.reason} Showing plan only.`);
  }

  // Parse journey list
  const journeyIds = parseJourneyList(options.journeyIds);
  if (journeyIds.length === 0) {
    return {
      success: false,
      error: 'No valid journey IDs provided. Use format: JRN-0001 or JRN-0001,JRN-0002 or JRN-0001..JRN-0010',
    };
  }

  // Validate batch size
  const batchSizeResult = validateBatchSize(journeyIds.length);
  if (!batchSizeResult.valid) {
    return { success: false, error: batchSizeResult.error };
  }
  if (batchSizeResult.warning) {
    warnings.push(batchSizeResult.warning);
  }

  // Validate batch mode (parallel is explicitly rejected by validateBatchMode)
  const batchModeResult = validateBatchMode(options.batchMode || 'serial');
  if (!batchModeResult.valid) {
    return {
      success: false,
      error: batchModeResult.error || `Invalid batch mode: ${options.batchMode}. Valid option: serial`,
    };
  }
  if (batchModeResult.warning) {
    warnings.push(batchModeResult.warning);
  }

  // Validate learning mode
  const learningModeResult = validateLearningMode(options.learningMode || 'strict');
  if (!learningModeResult.valid) {
    return {
      success: false,
      error: `Invalid learning mode: ${options.learningMode}. Valid values: strict, batch, none`,
    };
  }

  // Special case: batch learning mode with serial execution
  if (batchModeResult.normalized === 'serial' && learningModeResult.normalized === 'batch') {
    warnings.push('learningMode=batch with serial mode behaves the same as learningMode=strict (no batches in serial mode).');
  }

  // Validate LLKB
  const llkbResult = validateLLKB(ctx.llkbRoot);
  if (!llkbResult.valid) {
    return {
      success: false,
      error: llkbResult.errors.join('\n'),
    };
  }
  warnings.push(...llkbResult.warnings);

  // Find and validate journeys
  const findResult = findJourneyFiles(ctx.harnessRoot, journeyIds);
  const journeys: JourneyInfo[] = [];

  // Warn about duplicate journeys in multiple status folders
  for (const [id, paths] of findResult.duplicates) {
    warnings.push(
      `Journey ${id} found in multiple locations: ${paths.map(p => path.basename(path.dirname(p))).join(', ')}. Using highest priority.`
    );
  }

  for (const id of journeyIds) {
    const journeyPath = findResult.found.get(id);
    if (!journeyPath) {
      errors.push(`Journey not found: ${id}`);
      continue;
    }

    // Path traversal protection
    if (!isPathSafe(journeyPath, ctx.harnessRoot)) {
      errors.push(`Invalid journey path (security): ${id}`);
      continue;
    }

    const loadResult = loadJourney(journeyPath, ctx.harnessRoot);
    if (!loadResult.journey) {
      // Include detailed error information from Zod validation
      const errorMsg = loadResult.error || 'Unknown error';
      const details = loadResult.details ? `: ${loadResult.details.join(', ')}` : '';
      errors.push(`Failed to parse journey ${id}: ${errorMsg}${details}`);
      continue;
    }

    const validation = validateJourneyForImplementation(loadResult.journey);
    if (!validation.valid) {
      errors.push(`Journey ${id}: ${validation.errors.join(', ')}`);
    }
    warnings.push(...validation.warnings.map(w => `Journey ${id}: ${w}`));

    journeys.push(loadResult.journey);
  }

  if (errors.length > 0) {
    return {
      success: false,
      error: errors.join('\n'),
    };
  }

  // Build safe commands (no string concatenation!)
  const llkbExportCommand: CommandSpec = {
    executable: 'npx',
    args: [
      'artk',
      'llkb',
      'export',
      '--for-autogen',
      '--llkb-root',
      ctx.llkbRoot,
      '--output',
      ctx.harnessRoot,
      '--min-confidence',
      '0.7',
    ],
    cwd: ctx.projectRoot,
    description: 'Export LLKB for AutoGen consumption',
  };

  const autogenCommands: CommandSpec[] = journeys.map(j => {
    const testsDir = path.join(ctx.harnessRoot, 'tests');
    const llkbConfig = path.join(ctx.harnessRoot, 'autogen-llkb.config.yml');
    const llkbGlossary = path.join(ctx.harnessRoot, 'llkb-glossary.ts');

    return {
      executable: 'npx',
      args: [
        'artk-autogen',
        'generate',
        j.path,
        '-o',
        testsDir,
        '-m',
        '--llkb-config',
        llkbConfig,
        '--llkb-glossary',
        llkbGlossary,
      ],
      cwd: ctx.projectRoot,
      description: `Generate tests for ${j.id}`,
    };
  });

  return {
    success: true,
    data: {
      journeys,
      batchMode: batchModeResult.normalized,
      learningMode: learningModeResult.normalized,
      llkbExportCommand,
      autogenCommands,
      warnings,
      environment,
    },
  };
}

/**
 * Format a CommandSpec as a human-readable string (for display only!)
 * Never use this for actual execution
 */
function formatCommand(cmd: CommandSpec): string {
  // Quote arguments that contain spaces or special characters
  const quotedArgs = cmd.args.map(arg => {
    if (arg.includes(' ') || arg.includes('"') || arg.includes('$') || arg.includes('`')) {
      // Escape any existing double quotes and wrap in double quotes
      return `"${arg.replace(/"/g, '\\"')}"`;
    }
    return arg;
  });
  return `${cmd.executable} ${quotedArgs.join(' ')}`;
}

/**
 * Get the path where session state should be persisted
 */
export function getSessionFilePath(harnessRoot: string): string {
  return path.join(harnessRoot, '.artk', 'session.json');
}

/**
 * Save session state to disk for recovery/debugging
 * Called after each journey to enable resume on failure
 */
export async function saveSessionState(harnessRoot: string, state: SessionState): Promise<boolean> {
  try {
    const sessionPath = getSessionFilePath(harnessRoot);
    const sessionDir = path.dirname(sessionPath);

    // Ensure .artk directory exists
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    // Add savedAt timestamp
    const stateToSave: SessionState = {
      ...state,
      savedAt: new Date().toISOString(),
    };

    fs.writeFileSync(sessionPath, JSON.stringify(stateToSave, null, 2), 'utf-8');
    return true;
  } catch {
    // Session persistence failure is non-fatal
    return false;
  }
}

/**
 * Load session state from disk (for resume functionality)
 */
export function loadSessionState(harnessRoot: string): SessionState | null {
  try {
    const sessionPath = getSessionFilePath(harnessRoot);
    if (!fs.existsSync(sessionPath)) {
      return null;
    }

    const content = fs.readFileSync(sessionPath, 'utf-8');
    const state = JSON.parse(content) as SessionState;

    // Validate schema version
    if (state.schemaVersion !== SESSION_SCHEMA_VERSION) {
      return null; // Incompatible version
    }

    return state;
  } catch {
    return null;
  }
}

/**
 * Parse generated test file path from AutoGen stdout
 * Looks for patterns like "Generated: /path/to/JRN-0001.spec.ts" or "Created test file: ..."
 */
export function parseGeneratedTestFile(stdout: string, journeyId: string): string | null {
  // Pattern 1: "Generated: /path/to/file.spec.ts"
  const generatedMatch = stdout.match(/Generated:\s*(.+\.spec\.ts)/i);
  if (generatedMatch) {
    return generatedMatch[1].trim();
  }

  // Pattern 2: "Created test file: /path/to/file.spec.ts"
  const createdMatch = stdout.match(/Created test file:\s*(.+\.spec\.ts)/i);
  if (createdMatch) {
    return createdMatch[1].trim();
  }

  // Pattern 3: "Output: /path/to/file.spec.ts"
  const outputMatch = stdout.match(/Output:\s*(.+\.spec\.ts)/i);
  if (outputMatch) {
    return outputMatch[1].trim();
  }

  // Pattern 4: Look for journey ID in path
  const journeyPathMatch = stdout.match(new RegExp(`(\\S*${journeyId}\\S*\\.spec\\.ts)`, 'i'));
  if (journeyPathMatch) {
    return journeyPathMatch[1].trim();
  }

  // Fallback: use convention-based naming
  return null;
}

/**
 * Get test file name with fallback to convention
 */
function getTestFileName(stdout: string, journey: JourneyInfo): string {
  const parsed = parseGeneratedTestFile(stdout, journey.id);
  if (parsed) {
    return path.basename(parsed);
  }
  // Convention-based fallback
  return `${journey.id}.spec.ts`;
}

/**
 * Blocked step information parsed from AutoGen output
 */
export interface BlockedStep {
  stepNumber: number;
  reason: string;
  sourceText: string;
}

/**
 * Telemetry for AutoGen execution
 */
export interface AutoGenTelemetry {
  totalSteps: number;
  generatedSteps: number;
  blockedSteps: number;
  blockedRate: number;
  blockedDetails: BlockedStep[];
}

/**
 * Parse blocked steps from AutoGen stdout or generated test file
 * Looks for patterns like "ARTK BLOCKED:" comments in generated code
 */
export function parseBlockedSteps(stdout: string, testFileContent?: string): BlockedStep[] {
  const blockedSteps: BlockedStep[] = [];
  const content = testFileContent || stdout;

  // Pattern: "// ARTK BLOCKED: <reason>" followed by "// Source: <text>"
  const blockedPattern = /\/\/\s*ARTK BLOCKED:\s*(.+)\n\s*\/\/\s*Source:\s*(.+)/gi;
  let match: RegExpExecArray | null;
  let stepNumber = 1;

  while ((match = blockedPattern.exec(content)) !== null) {
    blockedSteps.push({
      stepNumber: stepNumber++,
      reason: match[1].trim(),
      sourceText: match[2].trim(),
    });
  }

  // Alternative pattern: "Blocked Steps: N" in stdout
  const countMatch = stdout.match(/Blocked Steps:\s*(\d+)/i);
  if (countMatch && blockedSteps.length === 0) {
    // We know there are blocked steps but couldn't parse details
    const count = parseInt(countMatch[1], 10);
    for (let i = 0; i < count; i++) {
      blockedSteps.push({
        stepNumber: i + 1,
        reason: 'Blocked step (details in generated test file)',
        sourceText: 'See test file for source text',
      });
    }
  }

  return blockedSteps;
}

/**
 * Calculate telemetry from AutoGen output
 */
export function calculateTelemetry(stdout: string, testFileContent?: string): AutoGenTelemetry {
  const blockedDetails = parseBlockedSteps(stdout, testFileContent);
  const blockedSteps = blockedDetails.length;

  // Try to extract total steps from output
  const totalMatch = stdout.match(/Total Steps:\s*(\d+)/i) ||
                     stdout.match(/(\d+)\s*steps?\s*processed/i);
  const totalSteps = totalMatch ? parseInt(totalMatch[1], 10) : blockedSteps; // Fallback to blocked count

  const generatedSteps = totalSteps - blockedSteps;
  const blockedRate = totalSteps > 0 ? (blockedSteps / totalSteps) * 100 : 0;

  return {
    totalSteps,
    generatedSteps,
    blockedSteps,
    blockedRate: Math.round(blockedRate * 10) / 10, // Round to 1 decimal
    blockedDetails,
  };
}

/**
 * Format telemetry for display
 */
export function formatTelemetry(telemetry: AutoGenTelemetry): string {
  const lines: string[] = [];

  lines.push('╔════════════════════════════════════════════════════════════════╗');
  lines.push('║  AUTOGEN TELEMETRY                                             ║');
  lines.push('╠════════════════════════════════════════════════════════════════╣');
  lines.push(`║  Total Steps: ${telemetry.totalSteps.toString().padEnd(47)}║`);
  lines.push(`║  Generated:   ${telemetry.generatedSteps.toString().padEnd(47)}║`);
  lines.push(`║  Blocked:     ${telemetry.blockedSteps.toString().padEnd(47)}║`);
  lines.push(`║  Blocked Rate: ${(telemetry.blockedRate.toFixed(1) + '%').padEnd(46)}║`);

  if (telemetry.blockedDetails.length > 0) {
    lines.push('║                                                                ║');
    lines.push('║  Blocked Steps (require manual implementation):                ║');
    for (const step of telemetry.blockedDetails.slice(0, 5)) { // Show max 5
      const truncatedReason = step.reason.length > 50
        ? step.reason.substring(0, 47) + '...'
        : step.reason;
      lines.push(`║    ${step.stepNumber}. ${truncatedReason.padEnd(56)}║`);
    }
    if (telemetry.blockedDetails.length > 5) {
      lines.push(`║    ... and ${(telemetry.blockedDetails.length - 5)} more                                         ║`);
    }
  }

  lines.push('╚════════════════════════════════════════════════════════════════╝');

  return lines.join('\n');
}

/**
 * Format the implementation plan as human-readable output
 */
export function formatImplementPlan(plan: ImplementPlan): string {
  const lines: string[] = [];

  lines.push('╔════════════════════════════════════════════════════════════════╗');
  lines.push('║  JOURNEY IMPLEMENTATION PLAN                                   ║');
  lines.push('╠════════════════════════════════════════════════════════════════╣');
  lines.push('');

  lines.push(`Environment: ${plan.environment}`);
  lines.push(`Batch Mode: ${plan.batchMode}`);
  lines.push(`Learning Mode: ${plan.learningMode}`);
  lines.push(`Journeys: ${plan.journeys.length}`);
  lines.push('');

  lines.push('Journeys to implement:');
  for (const j of plan.journeys) {
    lines.push(`  - ${j.id}: ${j.title} (status: ${j.status})`);
  }
  lines.push('');

  lines.push('Commands that will be executed:');
  lines.push('');
  lines.push('1. Export LLKB for AutoGen:');
  lines.push(`   ${formatCommand(plan.llkbExportCommand)}`);
  lines.push('');

  lines.push('2. Run AutoGen for each journey:');
  for (let i = 0; i < plan.autogenCommands.length; i++) {
    lines.push(`   [${i + 1}] ${formatCommand(plan.autogenCommands[i])}`);
  }
  lines.push('');

  if (plan.warnings.length > 0) {
    lines.push('Warnings:');
    for (const w of plan.warnings) {
      lines.push(`  ⚠️  ${w}`);
    }
    lines.push('');
  }

  lines.push('╚════════════════════════════════════════════════════════════════╝');

  return lines.join('\n');
}

/**
 * Result of command execution
 */
export interface CommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  timedOut?: boolean;
}

/**
 * Execute a command safely (no shell injection risk)
 * Uses spawn with explicit args array, NOT shell: true
 *
 * @param cmd - Command specification
 * @param timeoutMs - Timeout in milliseconds (default: 5 minutes)
 */
async function execCommand(
  cmd: CommandSpec,
  timeoutMs: number = DEFAULT_COMMAND_TIMEOUT_MS
): Promise<CommandResult> {
  return new Promise((resolve) => {
    const proc = spawn(cmd.executable, cmd.args, {
      cwd: cmd.cwd,
      shell: false, // CRITICAL: Never use shell: true with user input
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let killed = false;

    // Set up timeout
    const timer = setTimeout(() => {
      killed = true;
      proc.kill('SIGTERM');
      // Give process 5 seconds to clean up before SIGKILL
      setTimeout(() => {
        if (!proc.killed) {
          proc.kill('SIGKILL');
        }
      }, 5000);
    }, timeoutMs);

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (killed) {
        resolve({
          success: false,
          stdout,
          stderr: `Command timed out after ${Math.round(timeoutMs / 1000)} seconds`,
          timedOut: true,
        });
      } else {
        resolve({ success: code === 0, stdout, stderr });
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      resolve({ success: false, stdout, stderr: err.message });
    });
  });
}

/**
 * Execute the implementation workflow with session state tracking
 */
export async function executeImplementation(
  ctx: WorkflowContext,
  plan: ImplementPlan,
  options: { verbose?: boolean; timeoutMs?: number }
): Promise<WorkflowResult<{
  testsGenerated: string[];
  sessionState: SessionState;
  warnings: string[];
  telemetry: AutoGenTelemetry;
}>> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
  const warnings: string[] = [];

  // Initialize session state
  const sessionState = createSessionState(
    plan.journeys.map(j => j.id),
    plan.batchMode,
    plan.learningMode
  );

  // Persist initial session state
  await saveSessionState(ctx.harnessRoot, sessionState);

  const testsGenerated: string[] = [];

  // Aggregate telemetry across all journeys
  const aggregateTelemetry: AutoGenTelemetry = {
    totalSteps: 0,
    generatedSteps: 0,
    blockedSteps: 0,
    blockedRate: 0,
    blockedDetails: [],
  };

  // Step 1: Export LLKB
  if (options.verbose) {
    console.log('\n📦 Exporting LLKB for AutoGen...');
    console.log(`   ${formatCommand(plan.llkbExportCommand)}`);
  }

  const llkbResult = await execCommand(plan.llkbExportCommand, timeoutMs);
  if (!llkbResult.success) {
    sessionState.endTime = Date.now();
    await saveSessionState(ctx.harnessRoot, sessionState);

    if (llkbResult.timedOut) {
      return {
        success: false,
        error: `LLKB export timed out after ${Math.round(timeoutMs / 1000)} seconds`,
      };
    }
    return {
      success: false,
      error: `LLKB export failed: ${llkbResult.stderr}`,
    };
  }
  sessionState.llkbExportCount++;
  sessionState.lastLlkbExportTime = Date.now();
  await saveSessionState(ctx.harnessRoot, sessionState);

  // Step 2: Run AutoGen for each journey
  for (let i = 0; i < plan.journeys.length; i++) {
    const journey = plan.journeys[i];
    const command = plan.autogenCommands[i];

    // Update session state
    sessionState.currentJourneyIndex = i;
    sessionState.currentJourneyId = journey.id;
    await saveSessionState(ctx.harnessRoot, sessionState);

    if (options.verbose) {
      console.log(`\n🔨 [${i + 1}/${plan.journeys.length}] Generating tests for ${journey.id}...`);
      console.log(`   ${formatCommand(command)}`);
    }

    const result = await execCommand(command, timeoutMs);

    if (!result.success) {
      sessionState.journeysFailed.push(journey.id);
      sessionState.endTime = Date.now();
      await saveSessionState(ctx.harnessRoot, sessionState);

      const errorMsg = result.timedOut
        ? `AutoGen timed out for ${journey.id} after ${Math.round(timeoutMs / 1000)} seconds`
        : `AutoGen failed for ${journey.id}: ${result.stderr}`;

      return {
        success: false,
        error: errorMsg,
        data: { testsGenerated, sessionState, warnings, telemetry: aggregateTelemetry },
      };
    }

    // Parse generated test file from AutoGen output (with fallback)
    const testFile = getTestFileName(result.stdout, journey);
    testsGenerated.push(testFile);
    sessionState.testsGenerated.push(testFile);
    sessionState.journeysCompleted.push(journey.id);

    // Calculate telemetry for this journey
    const journeyTelemetry = calculateTelemetry(result.stdout);
    aggregateTelemetry.totalSteps += journeyTelemetry.totalSteps;
    aggregateTelemetry.generatedSteps += journeyTelemetry.generatedSteps;
    aggregateTelemetry.blockedSteps += journeyTelemetry.blockedSteps;
    aggregateTelemetry.blockedDetails.push(
      ...journeyTelemetry.blockedDetails.map(d => ({
        ...d,
        sourceText: `[${journey.id}] ${d.sourceText}`,
      }))
    );

    await saveSessionState(ctx.harnessRoot, sessionState);

    if (options.verbose) {
      console.log(`   ✅ Generated: ${testFile}`);
      if (journeyTelemetry.blockedSteps > 0) {
        console.log(`   ⚠️  Blocked steps: ${journeyTelemetry.blockedSteps} (require manual implementation)`);
      }
    }

    // Re-export LLKB if learningMode=strict and not last journey
    if (plan.learningMode === 'strict' && i < plan.journeys.length - 1) {
      if (options.verbose) {
        console.log('\n📦 Re-exporting LLKB with learned patterns...');
      }
      const reExportResult = await execCommand(plan.llkbExportCommand, timeoutMs);
      if (reExportResult.success) {
        sessionState.llkbExportCount++;
        sessionState.lastLlkbExportTime = Date.now();
      } else {
        sessionState.llkbSkippedExports++;
        // In strict mode, LLKB re-export failures ALWAYS get a warning
        const warnMsg = reExportResult.timedOut
          ? `LLKB re-export timed out after journey ${journey.id}. Continuing without updated patterns.`
          : `LLKB re-export failed after journey ${journey.id}: ${reExportResult.stderr}. Continuing without updated patterns.`;
        warnings.push(warnMsg);
        if (options.verbose) {
          console.log(`   ⚠️  ${warnMsg}`);
        }
      }
      await saveSessionState(ctx.harnessRoot, sessionState);
    }
  }

  // Finalize session state
  sessionState.endTime = Date.now();
  sessionState.currentJourneyId = null;
  sessionState.verificationPassed = true; // Will be set by verify step
  await saveSessionState(ctx.harnessRoot, sessionState);

  // Calculate final blocked rate
  aggregateTelemetry.blockedRate = aggregateTelemetry.totalSteps > 0
    ? Math.round((aggregateTelemetry.blockedSteps / aggregateTelemetry.totalSteps) * 1000) / 10
    : 0;

  // Output telemetry summary
  if (options.verbose && aggregateTelemetry.totalSteps > 0) {
    console.log('\n' + formatTelemetry(aggregateTelemetry));
  }

  return {
    success: true,
    data: { testsGenerated, sessionState, warnings, telemetry: aggregateTelemetry },
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}
