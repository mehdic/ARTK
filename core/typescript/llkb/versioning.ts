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
import type { LessonsFile, ComponentsFile, AnalyticsFile } from './types.js';
import { loadJSON } from './file-utils.js';

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
      if (!lessons?.lessons) return 0;

      return lessons.lessons.filter((lesson) => {
        const firstSeen = lesson.metrics.firstSeen;
        if (!firstSeen) return false;
        return new Date(firstSeen) > sinceDate;
      }).length;
    } catch {
      return 0;
    }
  } else {
    const componentsPath = path.join(llkbRoot, 'components.json');
    try {
      const components = loadJSON<ComponentsFile>(componentsPath);
      if (!components?.components) return 0;

      return components.components.filter((component) => {
        const extractedAt = component.source?.extractedAt;
        if (!extractedAt) return false;
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
    ? Math.floor((Date.now() - new Date(testLlkbVersion).getTime()) / (1000 * 60 * 60 * 24))
    : Infinity;

  // Count new entries since test version
  const newPatternsAvailable = countNewEntriesSince(testLlkbVersion, 'lessons', llkbRoot);
  const newComponentsAvailable = countNewEntriesSince(testLlkbVersion, 'components', llkbRoot);

  // Determine recommendation
  let recommendation: 'update' | 'skip' | 'review' = 'skip';

  if (isOutdated && (newPatternsAvailable > 5 || newComponentsAvailable > 2)) {
    recommendation = 'update';
  } else if (isOutdated && daysSinceUpdate > 30) {
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
  lines.push('─'.repeat(50));
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

  lines.push('─'.repeat(50));
  lines.push(`Total: ${result.summary.total} tests`);
  lines.push(result.summary.recommendation);

  return lines.join('\n');
}
