/**
 * LLKB Version Tracking Module
 *
 * Provides functions to track LLKB versions in generated tests and detect
 * when tests need updating due to new LLKB knowledge.
 *
 * @module llkb/versioning
 */

import * as fs from 'fs';
import * as path from 'path';
import type { AnalyticsFile, ComponentsFile, LessonsFile } from './types.js';
import { loadJSON } from './file-utils.js';
import { LIMITS, TABLE, TIME } from './constants.js';

/**
 * Default LLKB root directory
 */
const DEFAULT_LLKB_ROOT = '.artk/llkb';

/**
 * Version comparison result
 */
export interface VersionComparison {
  /** LLKB version from the test file header (ISO timestamp or null if not found) */
  testLlkbVersion: string | null;

  /** Current LLKB version (lastUpdated from analytics.json) */
  currentLlkbVersion: string;

  /** Whether the test is outdated (LLKB has newer knowledge) */
  isOutdated: boolean;

  /** Number of days since the test was generated */
  daysSinceUpdate: number;

  /** Number of new patterns (lessons) available since test was generated */
  newPatternsAvailable: number;

  /** Number of new components available since test was generated */
  newComponentsAvailable: number;

  /** Recommendation for the user */
  recommendation: 'update' | 'skip' | 'review';
}

/**
 * Result of checking updates for multiple tests
 */
export interface UpdateCheckResult {
  /** Tests that need updating */
  outdated: Array<{
    testFile: string;
    comparison: VersionComparison;
  }>;

  /** Tests that are up to date */
  upToDate: Array<{
    testFile: string;
    comparison: VersionComparison;
  }>;

  /** Tests that couldn't be read or parsed */
  errors: Array<{
    testFile: string;
    error: string;
  }>;

  /** Summary statistics */
  summary: {
    total: number;
    outdated: number;
    upToDate: number;
    errors: number;
    recommendation: string;
  };
}

/**
 * Extract @llkb-version from test file content
 *
 * Looks for JSDoc-style comment: @llkb-version 2026-01-23T10:00:00Z
 *
 * @param testContent - Content of the test file
 * @returns ISO timestamp string or null if not found
 *
 * @example
 * ```typescript
 * const content = `
 *   // @llkb-version 2026-01-23T10:00:00Z
 *   import { test } from '@playwright/test';
 * `;
 * const version = extractLlkbVersionFromTest(content);
 * // version === '2026-01-23T10:00:00Z'
 * ```
 */
export function extractLlkbVersionFromTest(testContent: string): string | null {
  // Match @llkb-version followed by an ISO timestamp
  // Supports various comment styles: // @llkb-version, * @llkb-version
  const match = testContent.match(/@llkb-version\s+(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)/);
  return match ? match[1] ?? null : null;
}

/**
 * Extract @llkb-entries count from test file content
 *
 * @param testContent - Content of the test file
 * @returns Entry count or null if not found
 */
export function extractLlkbEntriesFromTest(testContent: string): number | null {
  const match = testContent.match(/@llkb-entries\s+(\d+)/);
  return match ? parseInt(match[1] ?? '0', 10) : null;
}

/**
 * Update @llkb-version header in test content
 *
 * If the header exists, updates it. If not, adds it after @timestamp.
 *
 * @param testContent - Original test file content
 * @param newVersion - New LLKB version (ISO timestamp)
 * @param entryCount - Optional entry count to update
 * @returns Updated test content
 *
 * @example
 * ```typescript
 * const updated = updateTestLlkbVersion(content, '2026-01-23T15:00:00Z', 24);
 * ```
 */
export function updateTestLlkbVersion(
  testContent: string,
  newVersion: string,
  entryCount?: number
): string {
  let result = testContent;

  // Update or add @llkb-version
  const versionRegex = /(@llkb-version\s+)\S+/;
  if (versionRegex.test(result)) {
    result = result.replace(versionRegex, `$1${newVersion}`);
  } else {
    // Add after @timestamp line if it exists
    const timestampRegex = /(@timestamp\s+\S+)/;
    if (timestampRegex.test(result)) {
      result = result.replace(timestampRegex, `$1\n * @llkb-version ${newVersion}`);
    }
  }

  // Update or add @llkb-entries if count provided
  if (entryCount !== undefined) {
    const entriesRegex = /(@llkb-entries\s+)\d+/;
    if (entriesRegex.test(result)) {
      result = result.replace(entriesRegex, `$1${entryCount}`);
    } else {
      // Add after @llkb-version if it exists
      const llkbVersionRegex = /(@llkb-version\s+\S+)/;
      if (llkbVersionRegex.test(result)) {
        result = result.replace(llkbVersionRegex, `$1\n * @llkb-entries ${entryCount}`);
      }
    }
  }

  return result;
}

/**
 * Get current LLKB version from analytics
 *
 * @param llkbRoot - LLKB root directory
 * @returns Current LLKB version (lastUpdated timestamp) or current time if not found
 */
export function getCurrentLlkbVersion(llkbRoot: string = DEFAULT_LLKB_ROOT): string {
  const analyticsPath = path.join(llkbRoot, 'analytics.json');

  try {
    const analytics = loadJSON<AnalyticsFile>(analyticsPath);
    if (analytics?.lastUpdated) {
      return analytics.lastUpdated;
    }
  } catch {
    // Fall through to default
  }

  // Fall back to current time if analytics not available
  return new Date().toISOString();
}

/**
 * Count new entries (lessons or components) added since a given timestamp
 *
 * @param sinceTimestamp - ISO timestamp to compare against (or null for all entries)
 * @param type - Type of entries to count ('lessons' or 'components')
 * @param llkbRoot - LLKB root directory
 * @returns Number of new entries since the timestamp
 *
 * @example
 * ```typescript
 * const newLessons = countNewEntriesSince('2026-01-15T00:00:00Z', 'lessons');
 * console.log(`${newLessons} new lessons since Jan 15`);
 * ```
 */
export function countNewEntriesSince(
  sinceTimestamp: string | null,
  type: 'lessons' | 'components',
  llkbRoot: string = DEFAULT_LLKB_ROOT
): number {
  // If no timestamp, return 0 (nothing is "new" relative to nothing)
  if (!sinceTimestamp) {
    return 0;
  }

  const sinceDate = new Date(sinceTimestamp);

  if (type === 'lessons') {
    const lessonsPath = path.join(llkbRoot, 'lessons.json');
    try {
      const lessons = loadJSON<LessonsFile>(lessonsPath);
      if (!lessons?.lessons) {return 0;}

      return lessons.lessons.filter((lesson) => {
        const firstSeen = lesson.metrics.firstSeen;
        if (!firstSeen) {return false;}
        return new Date(firstSeen) > sinceDate;
      }).length;
    } catch {
      return 0;
    }
  } else {
    const componentsPath = path.join(llkbRoot, 'components.json');
    try {
      const components = loadJSON<ComponentsFile>(componentsPath);
      if (!components?.components) {return 0;}

      return components.components.filter((component) => {
        const extractedAt = component.source?.extractedAt;
        if (!extractedAt) {return false;}
        return new Date(extractedAt) > sinceDate;
      }).length;
    } catch {
      return 0;
    }
  }
}

/**
 * Compare a test file's LLKB version with current LLKB state
 *
 * @param testFilePath - Path to the test file
 * @param llkbRoot - LLKB root directory
 * @returns Comparison result with recommendation
 *
 * @example
 * ```typescript
 * const comparison = compareVersions('tests/login.spec.ts');
 * if (comparison.isOutdated) {
 *   console.log(`Test has ${comparison.newPatternsAvailable} new patterns available`);
 *   console.log(`Recommendation: ${comparison.recommendation}`);
 * }
 * ```
 */
export function compareVersions(
  testFilePath: string,
  llkbRoot: string = DEFAULT_LLKB_ROOT
): VersionComparison {
  // Read test file
  const testContent = fs.readFileSync(testFilePath, 'utf-8');

  // Extract LLKB version from test
  const testLlkbVersion = extractLlkbVersionFromTest(testContent);

  // Get current LLKB version
  const currentLlkbVersion = getCurrentLlkbVersion(llkbRoot);

  // Calculate if outdated
  const isOutdated = !testLlkbVersion ||
    new Date(testLlkbVersion) < new Date(currentLlkbVersion);

  // Calculate days since update
  const daysSinceUpdate = testLlkbVersion
    ? Math.floor((Date.now() - new Date(testLlkbVersion).getTime()) / (TIME.MS_PER_SECOND * TIME.SECONDS_PER_MINUTE * TIME.MINUTES_PER_HOUR * TIME.HOURS_PER_DAY))
    : Infinity;

  // Count new entries since test version
  const newPatternsAvailable = countNewEntriesSince(testLlkbVersion, 'lessons', llkbRoot);
  const newComponentsAvailable = countNewEntriesSince(testLlkbVersion, 'components', llkbRoot);

  // Determine recommendation
  let recommendation: 'update' | 'skip' | 'review' = 'skip';

  if (isOutdated && (newPatternsAvailable > LIMITS.MAX_RECENT_ITEMS || newComponentsAvailable > 2)) {
    recommendation = 'update';
  } else if (isOutdated && daysSinceUpdate > LIMITS.DEFAULT_RETENTION_DAYS) {
    recommendation = 'review';
  } else if (newPatternsAvailable > 0 || newComponentsAvailable > 0) {
    recommendation = 'review';
  }

  return {
    testLlkbVersion,
    currentLlkbVersion,
    isOutdated,
    daysSinceUpdate,
    newPatternsAvailable,
    newComponentsAvailable,
    recommendation,
  };
}

/**
 * Check multiple test files for LLKB updates
 *
 * @param testsDir - Directory containing test files
 * @param llkbRoot - LLKB root directory
 * @param pattern - Glob pattern for test files (default: *.spec.ts)
 * @returns Update check result with categorized tests
 *
 * @example
 * ```typescript
 * const result = checkUpdates('artk-e2e/tests/');
 * console.log(`${result.summary.outdated} tests need updating`);
 * ```
 */
export function checkUpdates(
  testsDir: string,
  llkbRoot: string = DEFAULT_LLKB_ROOT,
  pattern: string = '*.spec.ts'
): UpdateCheckResult {
  const result: UpdateCheckResult = {
    outdated: [],
    upToDate: [],
    errors: [],
    summary: {
      total: 0,
      outdated: 0,
      upToDate: 0,
      errors: 0,
      recommendation: '',
    },
  };

  // Find test files
  if (!fs.existsSync(testsDir)) {
    return result;
  }

  const testFiles = findTestFiles(testsDir, pattern);
  result.summary.total = testFiles.length;

  for (const testFile of testFiles) {
    try {
      const comparison = compareVersions(testFile, llkbRoot);

      if (comparison.isOutdated) {
        result.outdated.push({ testFile, comparison });
        result.summary.outdated++;
      } else {
        result.upToDate.push({ testFile, comparison });
        result.summary.upToDate++;
      }
    } catch (error) {
      result.errors.push({
        testFile,
        error: error instanceof Error ? error.message : String(error),
      });
      result.summary.errors++;
    }
  }

  // Generate recommendation
  if (result.summary.outdated === 0) {
    result.summary.recommendation = 'All tests are up to date';
  } else if (result.summary.outdated === 1) {
    result.summary.recommendation = '1 test should be updated';
  } else {
    result.summary.recommendation = `${result.summary.outdated} tests should be updated`;
  }

  return result;
}

/**
 * Find test files in a directory (recursive)
 *
 * @param dir - Directory to search
 * @param pattern - File pattern to match
 * @returns Array of file paths
 */
function findTestFiles(dir: string, pattern: string): string[] {
  const files: string[] = [];
  const patternRegex = globToRegex(pattern);

  function walkDir(currentDir: string): void {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        // Skip node_modules and hidden directories
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          walkDir(fullPath);
        }
      } else if (entry.isFile() && patternRegex.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }

  walkDir(dir);
  return files;
}

/**
 * Convert a simple glob pattern to regex
 */
function globToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/\./g, '\\.')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`);
}

/**
 * Format version comparison result for console output
 *
 * @param testFile - Test file path
 * @param comparison - Version comparison result
 * @returns Formatted string
 */
export function formatVersionComparison(testFile: string, comparison: VersionComparison): string {
  const status = comparison.isOutdated ? '!' : '✓';
  const llkbVer = comparison.testLlkbVersion
    ? comparison.testLlkbVersion.split('T')[0]
    : 'none';
  const currentVer = comparison.currentLlkbVersion.split('T')[0];

  let info = `${status} ${path.basename(testFile)}`;
  info += ` (LLKB: ${llkbVer}, current: ${currentVer}`;

  if (comparison.newPatternsAvailable > 0 || comparison.newComponentsAvailable > 0) {
    const parts: string[] = [];
    if (comparison.newPatternsAvailable > 0) {
      parts.push(`+${comparison.newPatternsAvailable} patterns`);
    }
    if (comparison.newComponentsAvailable > 0) {
      parts.push(`+${comparison.newComponentsAvailable} components`);
    }
    info += `, ${parts.join(', ')}`;
  }

  info += ')';

  return info;
}

/**
 * Format update check result for console output
 *
 * @param result - Update check result
 * @returns Formatted string for console
 */
export function formatUpdateCheckResult(result: UpdateCheckResult): string {
  const lines: string[] = [];

  lines.push('LLKB Version Check');
  lines.push('─'.repeat(TABLE.COLUMN_WIDTH));
  lines.push('');

  if (result.outdated.length > 0) {
    lines.push('Tests needing LLKB update:');
    for (const { testFile, comparison } of result.outdated) {
      lines.push(`  ${formatVersionComparison(testFile, comparison)}`);
    }
    lines.push('');
  }

  if (result.upToDate.length > 0 && result.outdated.length === 0) {
    lines.push('All tests are up to date');
    lines.push('');
  } else if (result.upToDate.length > 0) {
    lines.push(`Up to date: ${result.upToDate.length} tests`);
    lines.push('');
  }

  if (result.errors.length > 0) {
    lines.push('Errors:');
    for (const { testFile, error } of result.errors) {
      lines.push(`  ✗ ${path.basename(testFile)}: ${error}`);
    }
    lines.push('');
  }

  lines.push('─'.repeat(TABLE.COLUMN_WIDTH));
  lines.push(`Total: ${result.summary.total} tests`);
  lines.push(result.summary.recommendation);

  return lines.join('\n');
}

/**
 * Result of atomic test update with version check
 */
export interface UpdateTestResult {
  /** Whether the update succeeded */
  success: boolean;

  /** Version mismatch detected (LLKB updated since check) */
  versionMismatch?: boolean;

  /** Error message if failed */
  error?: string;

  /** New version written to test file */
  newVersion?: string;
}

/**
 * Update test file with atomic version check to prevent race conditions
 *
 * This function checks the LLKB version at write time to ensure LLKB hasn't
 * been updated between the initial check and the actual test update.
 *
 * @param testPath - Path to test file to update
 * @param expectedLlkbVersion - Expected LLKB version from initial check
 * @param llkbRoot - LLKB root directory
 * @returns Update result with success/mismatch status
 *
 * @example
 * ```typescript
 * // Initial check
 * const comparison = compareVersions('tests/login.spec.ts');
 * const expectedVersion = comparison.currentLlkbVersion;
 *
 * // Perform update with atomic version check
 * const result = updateTestWithVersionCheck(
 *   'tests/login.spec.ts',
 *   expectedVersion,
 *   '.artk/llkb'
 * );
 *
 * if (!result.success && result.versionMismatch) {
 *   console.log('LLKB was updated during operation, retry needed');
 * }
 * ```
 */
export function updateTestWithVersionCheck(
  testPath: string,
  expectedLlkbVersion: string,
  llkbRoot: string = DEFAULT_LLKB_ROOT
): UpdateTestResult {
  try {
    // Atomic version check at write time
    const currentVersion = getCurrentLlkbVersion(llkbRoot);

    if (currentVersion !== expectedLlkbVersion) {
      return {
        success: false,
        versionMismatch: true,
        error: `LLKB version changed: expected ${expectedLlkbVersion}, current ${currentVersion}`,
      };
    }

    // Read test file
    const testContent = fs.readFileSync(testPath, 'utf-8');

    // Update version in test content
    const updatedContent = updateTestLlkbVersion(testContent, currentVersion);

    // Write updated content
    fs.writeFileSync(testPath, updatedContent, 'utf-8');

    return {
      success: true,
      newVersion: currentVersion,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// =============================================================================
// Rollback Support (T007: Implement Rollback for Failed Updates)
// =============================================================================

/**
 * Options for updateTestSafe with verification and rollback
 */
export interface UpdateTestSafeOptions {
  /** Path to the test file to update */
  testPath: string;

  /** LLKB root directory (optional, defaults to .artk/llkb) */
  llkbRoot?: string;

  /** Whether to verify the test runs after update */
  verifyAfterUpdate?: boolean;

  /** Whether to rollback on verification failure */
  rollbackOnFailure?: boolean;

  /** Custom verification command (default: runs the test file) */
  verificationCommand?: string;
}

/**
 * Result of safe test update with optional rollback
 */
export interface UpdateTestSafeResult {
  /** Whether the update succeeded */
  success: boolean;

  /** Whether the update was rolled back */
  rolledBack?: boolean;

  /** Path to the backup file (if created) */
  originalBackupPath?: string;

  /** Error message if failed */
  error?: string;

  /** New version written to test file (if successful) */
  newVersion?: string;

  /** Verification result (if verification was requested) */
  verificationResult?: {
    success: boolean;
    output?: string;
    error?: string;
  };
}

/**
 * Update test file with atomic version check and optional rollback (T007)
 *
 * This function provides a safe update mechanism with backup and rollback support:
 * 1. Creates a backup of the original test file
 * 2. Updates the test file with new LLKB version
 * 3. Optionally verifies the test runs successfully
 * 4. Rolls back to backup if verification fails
 * 5. Cleans up backup on success
 *
 * @param options - Update options with verification and rollback settings
 * @returns Update result with success/rollback status
 *
 * @example
 * ```typescript
 * const result = await updateTestSafe({
 *   testPath: 'tests/login.spec.ts',
 *   llkbRoot: '.artk/llkb',
 *   verifyAfterUpdate: true,
 *   rollbackOnFailure: true,
 * });
 *
 * if (result.rolledBack) {
 *   console.log('Update failed verification, rolled back');
 * } else if (result.success) {
 *   console.log('Update successful');
 * }
 * ```
 */
export async function updateTestSafe(
  options: UpdateTestSafeOptions
): Promise<UpdateTestSafeResult> {
  const {
    testPath,
    llkbRoot = DEFAULT_LLKB_ROOT,
    verifyAfterUpdate = false,
    rollbackOnFailure = true,
    verificationCommand,
  } = options;

  let backupPath: string | null = null;

  try {
    // Step 1: Create backup
    backupPath = `${testPath}.backup`;

    try {
      fs.copyFileSync(testPath, backupPath);
    } catch (error) {
      return {
        success: false,
        error: `Failed to create backup: ${error instanceof Error ? error.message : String(error)}`,
      };
    }

    // Step 2: Get current LLKB version
    const currentVersion = getCurrentLlkbVersion(llkbRoot);

    // Step 3: Read and update test file
    let testContent: string;
    try {
      testContent = fs.readFileSync(testPath, 'utf-8');
    } catch (error) {
      // Restore backup before returning
      if (backupPath) {
        fs.copyFileSync(backupPath, testPath);
        fs.unlinkSync(backupPath);
      }
      return {
        success: false,
        error: `Failed to read test file: ${error instanceof Error ? error.message : String(error)}`,
      };
    }

    // Update version in content
    const updatedContent = updateTestLlkbVersion(testContent, currentVersion);

    // Write updated content
    try {
      fs.writeFileSync(testPath, updatedContent, 'utf-8');
    } catch (error) {
      // Restore backup before returning
      if (backupPath) {
        fs.copyFileSync(backupPath, testPath);
        fs.unlinkSync(backupPath);
      }
      return {
        success: false,
        error: `Failed to write updated test: ${error instanceof Error ? error.message : String(error)}`,
      };
    }

    // Step 4: Verify test runs (if requested)
    if (verifyAfterUpdate) {
      const verificationResult = await verifyTest(testPath, verificationCommand);

      if (!verificationResult.success) {
        // Verification failed - rollback if requested
        if (rollbackOnFailure && backupPath) {
          try {
            fs.copyFileSync(backupPath, testPath);
            fs.unlinkSync(backupPath);

            return {
              success: false,
              rolledBack: true,
              originalBackupPath: backupPath,
              error: 'Verification failed, rolled back to original',
              verificationResult,
            };
          } catch (rollbackError) {
            return {
              success: false,
              rolledBack: false,
              error: `Verification failed and rollback failed: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`,
              verificationResult,
            };
          }
        }

        // Verification failed but rollback not requested
        return {
          success: false,
          rolledBack: false,
          error: 'Verification failed, no rollback requested',
          verificationResult,
        };
      }

      // Verification succeeded - clean up backup
      if (backupPath) {
        try {
          fs.unlinkSync(backupPath);
        } catch {
          // Non-fatal - backup cleanup failed but update succeeded
        }
      }

      return {
        success: true,
        rolledBack: false,
        newVersion: currentVersion,
        verificationResult,
      };
    }

    // No verification requested - clean up backup and return success
    if (backupPath) {
      try {
        fs.unlinkSync(backupPath);
      } catch {
        // Non-fatal - backup cleanup failed but update succeeded
      }
    }

    return {
      success: true,
      rolledBack: false,
      newVersion: currentVersion,
    };
  } catch (error) {
    // Unexpected error - attempt rollback if backup exists
    if (backupPath && fs.existsSync(backupPath)) {
      try {
        fs.copyFileSync(backupPath, testPath);
        fs.unlinkSync(backupPath);
        return {
          success: false,
          rolledBack: true,
          error: `Unexpected error, rolled back: ${error instanceof Error ? error.message : String(error)}`,
        };
      } catch {
        return {
          success: false,
          rolledBack: false,
          error: `Unexpected error and rollback failed: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Verify a test file runs successfully
 *
 * @param testPath - Path to test file
 * @param customCommand - Custom verification command (optional)
 * @returns Verification result
 */
async function verifyTest(
  testPath: string,
  customCommand?: string
): Promise<{ success: boolean; output?: string; error?: string }> {
  // Import dynamically to avoid requiring Node.js child_process at module load time
  const { execSync } = await import('node:child_process');

  const command = customCommand ?? `npx playwright test ${testPath}`;

  try {
    const output = execSync(command, {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 60000, // 60 second timeout
    });

    return {
      success: true,
      output,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
