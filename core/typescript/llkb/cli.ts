/**
 * CLI Commands for LLKB
 *
 * Provides command-line interface functions for LLKB management.
 *
 * @module llkb/cli
 */

import * as fs from 'fs';
import * as path from 'path';
import type { LessonsFile, ComponentsFile, AnalyticsFile, LLKBCategory, LLKBScope } from './types.js';
import { loadJSON } from './file-utils.js';
import { updateAnalytics } from './analytics.js';
import { cleanupOldHistoryFiles, readTodayHistory, getHistoryDir } from './history.js';
import { detectDecliningConfidence, needsConfidenceReview } from './confidence.js';
import { exportForAutogen, formatExportResult } from './adapter.js';
import type { LLKBAdapterConfig, LLKBAdapterResult } from './adapter-types.js';
import { recordLearning, formatLearningResult, type LearningResult } from './learning.js';

/**
 * Default LLKB root directory
 */
const DEFAULT_LLKB_ROOT = '.artk/llkb';

/**
 * Health check result
 */
export interface HealthCheckResult {
  status: 'healthy' | 'warning' | 'error';
  checks: HealthCheck[];
  summary: string;
}

/**
 * Individual health check
 */
export interface HealthCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  details?: string;
}

/**
 * Stats result
 */
export interface StatsResult {
  lessons: {
    total: number;
    active: number;
    archived: number;
    avgConfidence: number;
    avgSuccessRate: number;
    needsReview: number;
  };
  components: {
    total: number;
    active: number;
    archived: number;
    totalReuses: number;
    avgReusesPerComponent: number;
  };
  history: {
    todayEvents: number;
    historyFiles: number;
    oldestFile: string | null;
    newestFile: string | null;
  };
}

/**
 * Prune result
 */
export interface PruneResult {
  historyFilesDeleted: number;
  deletedFiles: string[];
  archivedLessons: number;
  archivedComponents: number;
  errors: string[];
}

/**
 * Run health check on LLKB
 *
 * Verifies that:
 * - All required files exist
 * - JSON files are valid
 * - No data corruption detected
 * - Configuration is valid
 *
 * @param llkbRoot - Root LLKB directory
 * @returns Health check result
 *
 * @example
 * ```typescript
 * const result = runHealthCheck();
 * if (result.status === 'error') {
 *   console.error('LLKB needs attention:', result.summary);
 * }
 * ```
 */
export function runHealthCheck(llkbRoot: string = DEFAULT_LLKB_ROOT): HealthCheckResult {
  const checks: HealthCheck[] = [];
  let hasError = false;
  let hasWarning = false;

  // Check 1: Directory exists
  if (fs.existsSync(llkbRoot)) {
    checks.push({
      name: 'Directory exists',
      status: 'pass',
      message: `LLKB directory found at ${llkbRoot}`,
    });
  } else {
    checks.push({
      name: 'Directory exists',
      status: 'fail',
      message: `LLKB directory not found at ${llkbRoot}`,
    });
    hasError = true;
  }

  // Check 2: Config file
  const configPath = path.join(llkbRoot, 'config.yml');
  if (fs.existsSync(configPath)) {
    checks.push({
      name: 'Config file',
      status: 'pass',
      message: 'config.yml found',
    });
  } else {
    checks.push({
      name: 'Config file',
      status: 'warn',
      message: 'config.yml not found - using defaults',
    });
    hasWarning = true;
  }

  // Check 3: Lessons file
  const lessonsPath = path.join(llkbRoot, 'lessons.json');
  const lessonsCheck = checkJSONFile<LessonsFile>(lessonsPath, 'lessons.json');
  checks.push(lessonsCheck);
  if (lessonsCheck.status === 'fail') hasError = true;
  if (lessonsCheck.status === 'warn') hasWarning = true;

  // Check 4: Components file
  const componentsPath = path.join(llkbRoot, 'components.json');
  const componentsCheck = checkJSONFile<ComponentsFile>(componentsPath, 'components.json');
  checks.push(componentsCheck);
  if (componentsCheck.status === 'fail') hasError = true;
  if (componentsCheck.status === 'warn') hasWarning = true;

  // Check 5: Analytics file
  const analyticsPath = path.join(llkbRoot, 'analytics.json');
  const analyticsCheck = checkJSONFile<AnalyticsFile>(analyticsPath, 'analytics.json');
  checks.push(analyticsCheck);
  if (analyticsCheck.status === 'fail') hasError = true;
  if (analyticsCheck.status === 'warn') hasWarning = true;

  // Check 6: History directory
  const historyDir = getHistoryDir(llkbRoot);
  if (fs.existsSync(historyDir)) {
    const historyFiles = fs.readdirSync(historyDir).filter((f) => f.endsWith('.jsonl'));
    checks.push({
      name: 'History directory',
      status: 'pass',
      message: `History directory found with ${historyFiles.length} files`,
    });
  } else {
    checks.push({
      name: 'History directory',
      status: 'warn',
      message: 'History directory not found - will be created on first event',
    });
    hasWarning = true;
  }

  // Check 7: Low confidence lessons
  // Only check if lessons.json was valid (checkJSONFile passed)
  if (lessonsCheck.status === 'pass') {
    try {
      const lessons = loadJSON<LessonsFile>(lessonsPath);
      if (lessons) {
        const lowConfidence = lessons.lessons.filter(
          (l) => !l.archived && needsConfidenceReview(l)
        );
        const declining = lessons.lessons.filter(
          (l) => !l.archived && detectDecliningConfidence(l)
        );

        if (lowConfidence.length > 0 || declining.length > 0) {
          checks.push({
            name: 'Lesson health',
            status: 'warn',
            message: `${lowConfidence.length} low confidence, ${declining.length} declining`,
            details: [
              ...lowConfidence.map((l) => `Low confidence: ${l.id} (${l.metrics.confidence})`),
              ...declining.map((l) => `Declining: ${l.id}`),
            ].join(', '),
          });
          hasWarning = true;
        } else {
          checks.push({
            name: 'Lesson health',
            status: 'pass',
            message: 'All lessons healthy',
          });
        }
      }
    } catch {
      // Skip lesson health check if JSON is invalid (already flagged by checkJSONFile)
    }
  }

  // Determine overall status
  let status: 'healthy' | 'warning' | 'error';
  let summary: string;

  if (hasError) {
    status = 'error';
    summary = `LLKB has errors: ${checks.filter((c) => c.status === 'fail').length} failed checks`;
  } else if (hasWarning) {
    status = 'warning';
    summary = `LLKB has warnings: ${checks.filter((c) => c.status === 'warn').length} warnings`;
  } else {
    status = 'healthy';
    summary = 'LLKB is healthy';
  }

  return { status, checks, summary };
}

/**
 * Check a JSON file for validity
 */
function checkJSONFile<T>(filePath: string, fileName: string): HealthCheck {
  if (!fs.existsSync(filePath)) {
    return {
      name: fileName,
      status: 'warn',
      message: `${fileName} not found`,
    };
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    JSON.parse(content) as T;
    return {
      name: fileName,
      status: 'pass',
      message: `${fileName} is valid JSON`,
    };
  } catch (error) {
    return {
      name: fileName,
      status: 'fail',
      message: `${fileName} is invalid JSON`,
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get LLKB statistics
 *
 * @param llkbRoot - Root LLKB directory
 * @returns Statistics about LLKB contents
 *
 * @example
 * ```typescript
 * const stats = getStats();
 * console.log(`Total lessons: ${stats.lessons.total}`);
 * console.log(`Total reuses: ${stats.components.totalReuses}`);
 * ```
 */
export function getStats(llkbRoot: string = DEFAULT_LLKB_ROOT): StatsResult {
  const lessonsPath = path.join(llkbRoot, 'lessons.json');
  const componentsPath = path.join(llkbRoot, 'components.json');
  const historyDir = getHistoryDir(llkbRoot);

  // Lessons stats
  const lessons = loadJSON<LessonsFile>(lessonsPath);
  const activeLessons = lessons?.lessons.filter((l) => !l.archived) ?? [];
  const archivedLessons = lessons?.archived ?? [];

  let avgConfidence = 0;
  let avgSuccessRate = 0;
  let needsReview = 0;

  if (activeLessons.length > 0) {
    avgConfidence =
      Math.round(
        (activeLessons.reduce((acc, l) => acc + l.metrics.confidence, 0) /
          activeLessons.length) *
          100
      ) / 100;
    avgSuccessRate =
      Math.round(
        (activeLessons.reduce((acc, l) => acc + l.metrics.successRate, 0) /
          activeLessons.length) *
          100
      ) / 100;
    needsReview = activeLessons.filter(
      (l) => needsConfidenceReview(l) || detectDecliningConfidence(l)
    ).length;
  }

  // Components stats
  const components = loadJSON<ComponentsFile>(componentsPath);
  const activeComponents = components?.components.filter((c) => !c.archived) ?? [];
  const archivedComponents = components?.components.filter((c) => c.archived) ?? [];

  let totalReuses = 0;
  let avgReusesPerComponent = 0;

  if (activeComponents.length > 0) {
    totalReuses = activeComponents.reduce((acc, c) => acc + (c.metrics.totalUses ?? 0), 0);
    avgReusesPerComponent =
      Math.round((totalReuses / activeComponents.length) * 100) / 100;
  }

  // History stats
  let todayEvents = 0;
  let historyFiles = 0;
  let oldestFile: string | null = null;
  let newestFile: string | null = null;

  if (fs.existsSync(historyDir)) {
    const files = fs
      .readdirSync(historyDir)
      .filter((f) => f.endsWith('.jsonl'))
      .sort();

    historyFiles = files.length;
    if (files.length > 0) {
      oldestFile = files[0] ?? null;
      newestFile = files[files.length - 1] ?? null;
    }

    todayEvents = readTodayHistory(llkbRoot).length;
  }

  return {
    lessons: {
      total: (lessons?.lessons.length ?? 0) + archivedLessons.length,
      active: activeLessons.length,
      archived: archivedLessons.length,
      avgConfidence,
      avgSuccessRate,
      needsReview,
    },
    components: {
      total: components?.components.length ?? 0,
      active: activeComponents.length,
      archived: archivedComponents.length,
      totalReuses,
      avgReusesPerComponent,
    },
    history: {
      todayEvents,
      historyFiles,
      oldestFile,
      newestFile,
    },
  };
}

/**
 * Prune old history files and optionally archive stale items
 *
 * @param options - Prune options
 * @returns Prune result with counts of deleted/archived items
 *
 * @example
 * ```typescript
 * const result = prune({ historyRetentionDays: 90 });
 * console.log(`Deleted ${result.historyFilesDeleted} old history files`);
 * ```
 */
export function prune(
  options: {
    llkbRoot?: string;
    historyRetentionDays?: number;
    archiveInactiveLessons?: boolean;
    archiveInactiveComponents?: boolean;
    inactiveDays?: number;
  } = {}
): PruneResult {
  const {
    llkbRoot = DEFAULT_LLKB_ROOT,
    historyRetentionDays = 365,
    archiveInactiveLessons = false,
    archiveInactiveComponents = false,
    inactiveDays = 180,
  } = options;

  const result: PruneResult = {
    historyFilesDeleted: 0,
    deletedFiles: [],
    archivedLessons: 0,
    archivedComponents: 0,
    errors: [],
  };

  // Clean up old history files
  try {
    const deletedFiles = cleanupOldHistoryFiles(historyRetentionDays, llkbRoot);
    result.historyFilesDeleted = deletedFiles.length;
    result.deletedFiles = deletedFiles;
  } catch (error) {
    result.errors.push(
      `Failed to clean history files: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // Archive inactive lessons
  if (archiveInactiveLessons) {
    try {
      const archivedCount = archiveInactiveItems(
        path.join(llkbRoot, 'lessons.json'),
        'lessons',
        inactiveDays
      );
      result.archivedLessons = archivedCount;
    } catch (error) {
      result.errors.push(
        `Failed to archive lessons: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Archive inactive components
  if (archiveInactiveComponents) {
    try {
      const archivedCount = archiveInactiveItems(
        path.join(llkbRoot, 'components.json'),
        'components',
        inactiveDays
      );
      result.archivedComponents = archivedCount;
    } catch (error) {
      result.errors.push(
        `Failed to archive components: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Update analytics after pruning
  try {
    updateAnalytics(llkbRoot);
  } catch (error) {
    result.errors.push(
      `Failed to update analytics: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  return result;
}

/**
 * Archive items that haven't been used in a specified number of days
 */
function archiveInactiveItems(
  filePath: string,
  itemsKey: 'lessons' | 'components',
  inactiveDays: number
): number {
  if (!fs.existsSync(filePath)) {
    return 0;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content) as Record<string, unknown>;
  const items = data[itemsKey] as Array<{
    archived?: boolean;
    metrics: { lastSuccess?: string; lastUsed?: string };
  }>;

  if (!Array.isArray(items)) {
    return 0;
  }

  const now = new Date();
  const cutoffDate = new Date();
  cutoffDate.setDate(now.getDate() - inactiveDays);

  let archivedCount = 0;

  for (const item of items) {
    if (item.archived) continue;

    const lastUsedStr = item.metrics.lastSuccess ?? item.metrics.lastUsed;
    if (!lastUsedStr) continue;

    const lastUsed = new Date(lastUsedStr);
    if (lastUsed < cutoffDate) {
      item.archived = true;
      archivedCount++;
    }
  }

  if (archivedCount > 0) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  return archivedCount;
}

/**
 * Format health check result for console output
 *
 * @param result - Health check result
 * @returns Formatted string for console
 */
export function formatHealthCheck(result: HealthCheckResult): string {
  const lines: string[] = [];
  const statusIcon = result.status === 'healthy' ? '✓' : result.status === 'warning' ? '⚠' : '✗';

  lines.push(`${statusIcon} LLKB Health Check: ${result.status.toUpperCase()}`);
  lines.push('─'.repeat(50));

  for (const check of result.checks) {
    const icon = check.status === 'pass' ? '✓' : check.status === 'warn' ? '⚠' : '✗';
    lines.push(`${icon} ${check.name}: ${check.message}`);
    if (check.details) {
      lines.push(`  ${check.details}`);
    }
  }

  lines.push('─'.repeat(50));
  lines.push(result.summary);

  return lines.join('\n');
}

/**
 * Format stats result for console output
 *
 * @param stats - Stats result
 * @returns Formatted string for console
 */
export function formatStats(stats: StatsResult): string {
  const lines: string[] = [];

  lines.push('LLKB Statistics');
  lines.push('─'.repeat(50));

  lines.push('');
  lines.push('Lessons:');
  lines.push(`  Total: ${stats.lessons.total} (${stats.lessons.active} active, ${stats.lessons.archived} archived)`);
  lines.push(`  Avg Confidence: ${stats.lessons.avgConfidence}`);
  lines.push(`  Avg Success Rate: ${stats.lessons.avgSuccessRate}`);
  lines.push(`  Needs Review: ${stats.lessons.needsReview}`);

  lines.push('');
  lines.push('Components:');
  lines.push(`  Total: ${stats.components.total} (${stats.components.active} active, ${stats.components.archived} archived)`);
  lines.push(`  Total Reuses: ${stats.components.totalReuses}`);
  lines.push(`  Avg Reuses/Component: ${stats.components.avgReusesPerComponent}`);

  lines.push('');
  lines.push('History:');
  lines.push(`  Today's Events: ${stats.history.todayEvents}`);
  lines.push(`  History Files: ${stats.history.historyFiles}`);
  if (stats.history.oldestFile) {
    lines.push(`  Date Range: ${stats.history.oldestFile} to ${stats.history.newestFile}`);
  }

  return lines.join('\n');
}

/**
 * Format prune result for console output
 *
 * @param result - Prune result
 * @returns Formatted string for console
 */
export function formatPruneResult(result: PruneResult): string {
  const lines: string[] = [];

  lines.push('LLKB Prune Results');
  lines.push('─'.repeat(50));

  lines.push(`History files deleted: ${result.historyFilesDeleted}`);
  if (result.archivedLessons > 0) {
    lines.push(`Lessons archived: ${result.archivedLessons}`);
  }
  if (result.archivedComponents > 0) {
    lines.push(`Components archived: ${result.archivedComponents}`);
  }

  if (result.errors.length > 0) {
    lines.push('');
    lines.push('Errors:');
    for (const error of result.errors) {
      lines.push(`  ✗ ${error}`);
    }
  }

  return lines.join('\n');
}

// =============================================================================
// Export Command Types and Functions
// =============================================================================

/**
 * Options for the AutoGen export command
 */
export interface AutogenExportOptions {
  /** LLKB root directory (default: .artk/llkb) */
  llkbRoot?: string;

  /** Output directory for generated files */
  outputDir: string;

  /** Minimum confidence threshold (default: 0.7) */
  minConfidence?: number;

  /** Categories to include (default: all) */
  includeCategories?: LLKBCategory[];

  /** Scopes to include (default: all) */
  includeScopes?: LLKBScope[];

  /** Whether to generate glossary file (default: true) */
  generateGlossary?: boolean;

  /** Whether to generate config file (default: true) */
  generateConfig?: boolean;

  /** Output format for config (default: yaml) */
  configFormat?: 'yaml' | 'json';
}

/**
 * Export LLKB for AutoGen consumption
 *
 * Generates configuration and glossary files that AutoGen can use
 * to enhance test generation with learned patterns and components.
 *
 * @param options - Export options
 * @returns Export result with paths and statistics
 *
 * @example
 * ```typescript
 * const result = await runExportForAutogen({
 *   outputDir: './artk-e2e/',
 *   minConfidence: 0.7,
 *   configFormat: 'yaml',
 * });
 *
 * console.log(formatExportResultForConsole(result));
 * ```
 */
export async function runExportForAutogen(options: AutogenExportOptions): Promise<LLKBAdapterResult> {
  const config: LLKBAdapterConfig = {
    llkbRoot: options.llkbRoot,
    outputDir: options.outputDir,
    minConfidence: options.minConfidence,
    includeCategories: options.includeCategories,
    includeScopes: options.includeScopes,
    generateGlossary: options.generateGlossary,
    generateConfig: options.generateConfig,
    configFormat: options.configFormat,
  };

  return exportForAutogen(config);
}

/**
 * Format export result for console output
 *
 * @param result - Export result
 * @returns Formatted string for console
 */
export function formatExportResultForConsole(result: LLKBAdapterResult): string {
  return formatExportResult(result);
}

// =============================================================================
// Learning Command Types and Functions
// =============================================================================

/**
 * Options for the learn command
 */
export interface LearnOptions {
  /** Type of learning event */
  type: 'pattern' | 'component' | 'lesson';

  /** Journey ID where the learning occurred */
  journeyId: string;

  /** Entity ID (component or lesson ID) */
  id?: string;

  /** Whether the operation was successful */
  success: boolean;

  /** Additional context or step text */
  context?: string;

  /** Test file path */
  testFile?: string;

  /** Source prompt */
  prompt?: 'journey-implement' | 'journey-verify';

  /** Selector strategy (for pattern type) */
  selectorStrategy?: string;

  /** Selector value (for pattern type) */
  selectorValue?: string;

  /** LLKB root directory */
  llkbRoot?: string;
}

/**
 * Run the learn command to record a learning event
 *
 * Records patterns, component usages, or lesson applications back to LLKB
 * for continuous improvement of the knowledge base.
 *
 * @param options - Learn options
 * @returns Learning result
 *
 * @example
 * ```typescript
 * // Record component usage
 * const result = runLearnCommand({
 *   type: 'component',
 *   journeyId: 'JRN-0001',
 *   id: 'COMP012',
 *   success: true,
 * });
 *
 * // Record lesson application
 * const result = runLearnCommand({
 *   type: 'lesson',
 *   journeyId: 'JRN-0001',
 *   id: 'L042',
 *   success: true,
 *   context: 'Applied ag-grid wait pattern',
 * });
 *
 * // Record pattern learned
 * const result = runLearnCommand({
 *   type: 'pattern',
 *   journeyId: 'JRN-0001',
 *   success: true,
 *   context: 'Click the Save button',
 *   selectorStrategy: 'testid',
 *   selectorValue: 'btn-save',
 * });
 *
 * console.log(formatLearnResult(result));
 * ```
 */
export function runLearnCommand(options: LearnOptions): LearningResult {
  return recordLearning({
    type: options.type,
    journeyId: options.journeyId,
    testFile: options.testFile,
    prompt: options.prompt,
    id: options.id,
    success: options.success,
    context: options.context,
    stepText: options.context,
    selectorStrategy: options.selectorStrategy,
    selectorValue: options.selectorValue,
    llkbRoot: options.llkbRoot,
  });
}

/**
 * Format learn result for console output
 *
 * @param result - Learning result
 * @returns Formatted string for console
 */
export function formatLearnResult(result: LearningResult): string {
  return formatLearningResult(result);
}

// Re-export learning types for CLI consumers
export type { LearningResult } from './learning.js';

// =============================================================================
// Version Check Command Types and Functions
// =============================================================================

import {
  checkUpdates,
  compareVersions,
  formatUpdateCheckResult,
  formatVersionComparison,
  updateTestLlkbVersion,
  getCurrentLlkbVersion,
  extractLlkbVersionFromTest,
  type VersionComparison,
  type UpdateCheckResult,
} from './versioning.js';

// Re-export versioning types for CLI consumers
export type { VersionComparison, UpdateCheckResult };

/**
 * Options for the check-updates command
 */
export interface CheckUpdatesOptions {
  /** Directory containing test files */
  testsDir: string;

  /** LLKB root directory (default: .artk/llkb) */
  llkbRoot?: string;

  /** File pattern (default: *.spec.ts) */
  pattern?: string;
}

/**
 * Options for the update-test command
 */
export interface UpdateTestOptions {
  /** Path to the test file to update */
  testPath: string;

  /** LLKB root directory (default: .artk/llkb) */
  llkbRoot?: string;

  /** Whether to perform a dry run (show changes without writing) */
  dryRun?: boolean;
}

/**
 * Options for the update-tests command (batch)
 */
export interface UpdateTestsOptions {
  /** Directory containing test files */
  testsDir: string;

  /** LLKB root directory (default: .artk/llkb) */
  llkbRoot?: string;

  /** File pattern (default: *.spec.ts) */
  pattern?: string;

  /** Whether to require confirmation for each file */
  confirm?: boolean;

  /** Whether to perform a dry run */
  dryRun?: boolean;
}

/**
 * Result of updating a test file
 */
export interface UpdateTestResult {
  /** Whether the update succeeded */
  success: boolean;

  /** Path to the test file */
  testPath: string;

  /** Previous LLKB version (or null if none) */
  previousVersion: string | null;

  /** New LLKB version */
  newVersion: string;

  /** Whether the file was modified */
  modified: boolean;

  /** Error message if failed */
  error?: string;

  /** Whether this was a dry run */
  dryRun: boolean;
}

/**
 * Result of batch updating tests
 */
export interface UpdateTestsResult {
  /** Successfully updated tests */
  updated: UpdateTestResult[];

  /** Tests that were skipped (already up to date) */
  skipped: Array<{ testPath: string; reason: string }>;

  /** Tests that failed to update */
  failed: Array<{ testPath: string; error: string }>;

  /** Summary statistics */
  summary: {
    total: number;
    updated: number;
    skipped: number;
    failed: number;
  };
}

/**
 * Check which tests need LLKB updates
 *
 * @param options - Check options
 * @returns Update check result
 *
 * @example
 * ```typescript
 * const result = runCheckUpdates({ testsDir: 'artk-e2e/tests/' });
 * console.log(formatCheckUpdatesResult(result));
 * ```
 */
export function runCheckUpdates(options: CheckUpdatesOptions): UpdateCheckResult {
  return checkUpdates(
    options.testsDir,
    options.llkbRoot || DEFAULT_LLKB_ROOT,
    options.pattern || '*.spec.ts'
  );
}

/**
 * Format check-updates result for console output
 *
 * @param result - Check result
 * @returns Formatted string for console
 */
export function formatCheckUpdatesResult(result: UpdateCheckResult): string {
  return formatUpdateCheckResult(result);
}

/**
 * Update a single test file with current LLKB version
 *
 * @param options - Update options
 * @returns Update result
 *
 * @example
 * ```typescript
 * const result = runUpdateTest({
 *   testPath: 'artk-e2e/tests/login.spec.ts',
 *   dryRun: true,
 * });
 * console.log(formatUpdateTestResult(result));
 * ```
 */
export function runUpdateTest(options: UpdateTestOptions): UpdateTestResult {
  const { testPath, llkbRoot = DEFAULT_LLKB_ROOT, dryRun = false } = options;

  try {
    // Read current test content
    const content = fs.readFileSync(testPath, 'utf-8');

    // Extract current version
    const previousVersion = extractLlkbVersionFromTest(content);

    // Get current LLKB version
    const newVersion = getCurrentLlkbVersion(llkbRoot);

    // Check if update is needed
    if (previousVersion && previousVersion === newVersion) {
      return {
        success: true,
        testPath,
        previousVersion,
        newVersion,
        modified: false,
        dryRun,
      };
    }

    // Update content
    const updatedContent = updateTestLlkbVersion(content, newVersion);

    // Check if content actually changed
    const modified = content !== updatedContent;

    // Write if not dry run and content changed
    if (!dryRun && modified) {
      fs.writeFileSync(testPath, updatedContent, 'utf-8');
    }

    return {
      success: true,
      testPath,
      previousVersion,
      newVersion,
      modified,
      dryRun,
    };
  } catch (error) {
    return {
      success: false,
      testPath,
      previousVersion: null,
      newVersion: getCurrentLlkbVersion(llkbRoot),
      modified: false,
      error: error instanceof Error ? error.message : String(error),
      dryRun,
    };
  }
}

/**
 * Format update-test result for console output
 *
 * @param result - Update result
 * @returns Formatted string for console
 */
export function formatUpdateTestResult(result: UpdateTestResult): string {
  const lines: string[] = [];
  const filename = path.basename(result.testPath);

  if (!result.success) {
    lines.push(`✗ ${filename}: ${result.error}`);
    return lines.join('\n');
  }

  if (!result.modified) {
    lines.push(`✓ ${filename}: Already up to date`);
    return lines.join('\n');
  }

  const action = result.dryRun ? 'Would update' : 'Updated';
  const prevVer = result.previousVersion?.split('T')[0] || 'none';
  const newVer = result.newVersion.split('T')[0] ?? 'unknown';

  lines.push(`✓ ${filename}: ${action} LLKB version ${prevVer} → ${newVer}`);

  if (result.dryRun) {
    lines.push('  (dry run - no changes written)');
  }

  return lines.join('\n');
}

/**
 * Update multiple test files with current LLKB version
 *
 * @param options - Update options
 * @returns Batch update result
 *
 * @example
 * ```typescript
 * const result = runUpdateTests({
 *   testsDir: 'artk-e2e/tests/',
 *   dryRun: true,
 * });
 * console.log(formatUpdateTestsResult(result));
 * ```
 */
export function runUpdateTests(options: UpdateTestsOptions): UpdateTestsResult {
  const {
    testsDir,
    llkbRoot = DEFAULT_LLKB_ROOT,
    pattern = '*.spec.ts',
    dryRun = false,
  } = options;

  const result: UpdateTestsResult = {
    updated: [],
    skipped: [],
    failed: [],
    summary: {
      total: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
    },
  };

  // First check which tests need updates
  const checkResult = checkUpdates(testsDir, llkbRoot, pattern);
  result.summary.total = checkResult.summary.total;

  // Process outdated tests
  for (const { testFile } of checkResult.outdated) {
    const updateResult = runUpdateTest({
      testPath: testFile,
      llkbRoot,
      dryRun,
    });

    if (updateResult.success) {
      if (updateResult.modified) {
        result.updated.push(updateResult);
        result.summary.updated++;
      } else {
        result.skipped.push({
          testPath: testFile,
          reason: 'No changes needed after header update attempt',
        });
        result.summary.skipped++;
      }
    } else {
      result.failed.push({
        testPath: testFile,
        error: updateResult.error || 'Unknown error',
      });
      result.summary.failed++;
    }
  }

  // Count up-to-date as skipped
  for (const { testFile } of checkResult.upToDate) {
    result.skipped.push({
      testPath: testFile,
      reason: 'Already up to date',
    });
    result.summary.skipped++;
  }

  // Count errors
  for (const { testFile, error } of checkResult.errors) {
    result.failed.push({ testPath: testFile, error });
    result.summary.failed++;
  }

  return result;
}

/**
 * Format update-tests result for console output
 *
 * @param result - Batch update result
 * @returns Formatted string for console
 */
export function formatUpdateTestsResult(result: UpdateTestsResult): string {
  const lines: string[] = [];

  lines.push('LLKB Batch Update Results');
  lines.push('─'.repeat(50));
  lines.push('');

  if (result.updated.length > 0) {
    lines.push('Updated:');
    for (const update of result.updated) {
      lines.push(`  ${formatUpdateTestResult(update)}`);
    }
    lines.push('');
  }

  if (result.failed.length > 0) {
    lines.push('Failed:');
    for (const { testPath, error } of result.failed) {
      lines.push(`  ✗ ${path.basename(testPath)}: ${error}`);
    }
    lines.push('');
  }

  lines.push('─'.repeat(50));
  lines.push(`Total: ${result.summary.total} tests`);
  lines.push(`  Updated: ${result.summary.updated}`);
  lines.push(`  Skipped: ${result.summary.skipped}`);
  lines.push(`  Failed: ${result.summary.failed}`);

  return lines.join('\n');
}

// Re-export versioning functions that may be useful directly
export {
  compareVersions as compareTestVersion,
  extractLlkbVersionFromTest,
  updateTestLlkbVersion,
  getCurrentLlkbVersion,
  formatVersionComparison,
};
