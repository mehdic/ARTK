/**
 * LLKB Migration Module
 *
 * This module provides utilities for migrating LLKB data between versions,
 * upgrading schemas, and handling backward compatibility.
 *
 * @module llkb/migration
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  LessonsFile,
  ComponentsFile,
  SaveResult,
} from './types.js';
import { saveJSONAtomic, loadJSON, ensureDir } from './file-utils.js';
import { createEmptyAnalytics } from './analytics.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Migration result
 */
export interface MigrationResult {
  /** Whether migration succeeded */
  success: boolean;

  /** Files that were migrated */
  migratedFiles: string[];

  /** Errors encountered */
  errors: string[];

  /** Warnings */
  warnings: string[];

  /** Version before migration */
  fromVersion: string;

  /** Version after migration */
  toVersion: string;
}

/**
 * Schema version info
 */
export interface VersionInfo {
  /** Major version */
  major: number;

  /** Minor version */
  minor: number;

  /** Patch version */
  patch: number;

  /** Full version string */
  full: string;
}

/**
 * Migration function signature
 */
type MigrationFn = (data: any, llkbRoot: string) => Promise<{ data: any; warnings: string[] }>;

// =============================================================================
// Constants
// =============================================================================

/** Current schema version */
export const CURRENT_VERSION = '1.0.0';

/** Minimum supported version */
export const MIN_SUPPORTED_VERSION = '0.1.0';

// =============================================================================
// Version Parsing
// =============================================================================

/**
 * Parse a version string into components
 */
export function parseVersion(version: string): VersionInfo {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    return { major: 0, minor: 0, patch: 0, full: '0.0.0' };
  }

  const major = match[1] || '0';
  const minor = match[2] || '0';
  const patch = match[3] || '0';

  return {
    major: parseInt(major, 10),
    minor: parseInt(minor, 10),
    patch: parseInt(patch, 10),
    full: `${major}.${minor}.${patch}`,
  };
}

/**
 * Compare two versions
 * @returns -1 if a < b, 0 if equal, 1 if a > b
 */
export function compareVersions(a: string, b: string): number {
  const va = parseVersion(a);
  const vb = parseVersion(b);

  if (va.major !== vb.major) return va.major < vb.major ? -1 : 1;
  if (va.minor !== vb.minor) return va.minor < vb.minor ? -1 : 1;
  if (va.patch !== vb.patch) return va.patch < vb.patch ? -1 : 1;
  return 0;
}

/**
 * Check if a version is supported
 */
export function isVersionSupported(version: string): boolean {
  return compareVersions(version, MIN_SUPPORTED_VERSION) >= 0;
}

/**
 * Check if migration is needed
 */
export function needsMigration(version: string): boolean {
  return compareVersions(version, CURRENT_VERSION) < 0;
}

// =============================================================================
// Migration Functions by Version
// =============================================================================

/**
 * Registry of migrations from version to version
 */
const migrations: Map<string, MigrationFn> = new Map();

// Migration from 0.x to 1.0.0
migrations.set('0.x->1.0.0', async (data: any, _llkbRoot: string) => {
  const warnings: string[] = [];

  // Handle lessons migration
  if (data.lessons && Array.isArray(data.lessons)) {
    data.lessons = data.lessons.map((lesson: any) => {
      // Ensure required fields exist
      if (!lesson.metrics) {
        lesson.metrics = {
          occurrences: lesson.occurrences || 0,
          successRate: lesson.successRate || 0.5,
          confidence: lesson.confidence || 0.5,
          firstSeen: lesson.createdAt || new Date().toISOString(),
          lastSuccess: null,
          lastApplied: null,
        };
        warnings.push(`Added missing metrics to lesson ${lesson.id}`);
      }

      if (!lesson.validation) {
        lesson.validation = {
          humanReviewed: false,
        };
      }

      // Migrate old field names
      if (lesson.created && !lesson.metrics.firstSeen) {
        lesson.metrics.firstSeen = lesson.created;
        delete lesson.created;
      }

      return lesson;
    });
  }

  // Handle components migration
  if (data.components && Array.isArray(data.components)) {
    data.components = data.components.map((component: any) => {
      // Ensure required fields exist
      if (!component.metrics) {
        component.metrics = {
          totalUses: component.uses || 0,
          successRate: 1.0,
          lastUsed: null,
        };
        delete component.uses;
        warnings.push(`Added missing metrics to component ${component.id}`);
      }

      if (!component.source) {
        component.source = {
          originalCode: component.code || '',
          extractedFrom: component.journeyId || 'unknown',
          extractedBy: 'journey-verify',
          extractedAt: component.createdAt || new Date().toISOString(),
        };
        delete component.code;
        delete component.journeyId;
        warnings.push(`Added missing source info to component ${component.id}`);
      }

      return component;
    });
  }

  // Update version
  data.version = '1.0.0';
  data.lastUpdated = new Date().toISOString();

  return { data, warnings };
});

// =============================================================================
// Core Migration Functions
// =============================================================================

/**
 * Get the appropriate migration path
 */
function getMigrationPath(fromVersion: string, toVersion: string): string[] {
  const from = parseVersion(fromVersion);
  const to = parseVersion(toVersion);
  const path: string[] = [];

  // For now, we have a simple migration path
  // Future versions can add more granular migrations
  if (from.major === 0 && to.major >= 1) {
    path.push('0.x->1.0.0');
  }

  return path;
}

/**
 * Apply a single migration
 */
async function applyMigration(
  data: any,
  migrationKey: string,
  llkbRoot: string
): Promise<{ data: any; warnings: string[] }> {
  const migrationFn = migrations.get(migrationKey);
  if (!migrationFn) {
    return { data, warnings: [`No migration found for ${migrationKey}`] };
  }

  return migrationFn(data, llkbRoot);
}

/**
 * Migrate a single file
 */
async function migrateFile(
  filePath: string,
  llkbRoot: string
): Promise<{ success: boolean; warnings: string[]; error?: string }> {
  try {
    // Read current file
    const data = loadJSON<any>(filePath);
    if (!data) {
      return { success: false, warnings: [], error: `Could not read ${filePath}` };
    }

    const currentVersion = data.version || '0.0.0';

    // Check if migration is needed
    if (!needsMigration(currentVersion)) {
      return { success: true, warnings: ['Already at current version'] };
    }

    // Check if version is supported
    if (!isVersionSupported(currentVersion)) {
      return {
        success: false,
        warnings: [],
        error: `Version ${currentVersion} is not supported (min: ${MIN_SUPPORTED_VERSION})`,
      };
    }

    // Get migration path
    const migrationPath = getMigrationPath(currentVersion, CURRENT_VERSION);

    let migratedData = data;
    const allWarnings: string[] = [];

    // Apply each migration in sequence
    for (const migrationKey of migrationPath) {
      const result = await applyMigration(migratedData, migrationKey, llkbRoot);
      migratedData = result.data;
      allWarnings.push(...result.warnings);
    }

    // Create backup
    const backupPath = `${filePath}.backup.${Date.now()}`;
    fs.copyFileSync(filePath, backupPath);

    // Save migrated data
    const saveResult = await saveJSONAtomic(filePath, migratedData);
    if (!saveResult.success) {
      // Restore backup
      fs.copyFileSync(backupPath, filePath);
      return { success: false, warnings: allWarnings, error: saveResult.error };
    }

    // Remove backup on success (optional - could keep for safety)
    fs.unlinkSync(backupPath);

    return { success: true, warnings: allWarnings };
  } catch (error) {
    return {
      success: false,
      warnings: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Migrate all LLKB files to the current version
 *
 * @param llkbRoot - Root directory of LLKB
 * @returns Migration result
 *
 * @example
 * ```typescript
 * const result = await migrateLLKB('.artk/llkb');
 * if (result.success) {
 *   console.log(`Migrated ${result.migratedFiles.length} files`);
 * }
 * ```
 */
export async function migrateLLKB(llkbRoot: string): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: true,
    migratedFiles: [],
    errors: [],
    warnings: [],
    fromVersion: '0.0.0',
    toVersion: CURRENT_VERSION,
  };

  // Files to migrate
  const files = [
    path.join(llkbRoot, 'lessons.json'),
    path.join(llkbRoot, 'components.json'),
    path.join(llkbRoot, 'analytics.json'),
  ];

  // Get initial version from lessons.json
  const lessonsPath = path.join(llkbRoot, 'lessons.json');
  if (fs.existsSync(lessonsPath)) {
    const lessonsData = loadJSON<any>(lessonsPath);
    result.fromVersion = lessonsData?.version || '0.0.0';
  }

  // Migrate each file
  for (const file of files) {
    if (!fs.existsSync(file)) {
      result.warnings.push(`File not found: ${file}`);
      continue;
    }

    const migrationResult = await migrateFile(file, llkbRoot);

    if (migrationResult.success) {
      result.migratedFiles.push(file);
    } else {
      result.success = false;
      if (migrationResult.error) {
        result.errors.push(`${file}: ${migrationResult.error}`);
      }
    }

    result.warnings.push(...migrationResult.warnings.map((w) => `${path.basename(file)}: ${w}`));
  }

  return result;
}

/**
 * Check if LLKB needs migration
 *
 * @param llkbRoot - Root directory of LLKB
 * @returns Version check result
 */
export function checkMigrationNeeded(llkbRoot: string): {
  needsMigration: boolean;
  currentVersion: string;
  targetVersion: string;
  supported: boolean;
} {
  const lessonsPath = path.join(llkbRoot, 'lessons.json');

  if (!fs.existsSync(lessonsPath)) {
    return {
      needsMigration: false,
      currentVersion: CURRENT_VERSION,
      targetVersion: CURRENT_VERSION,
      supported: true,
    };
  }

  const lessonsData = loadJSON<any>(lessonsPath);
  const currentVersion = lessonsData?.version || '0.0.0';

  return {
    needsMigration: needsMigration(currentVersion),
    currentVersion,
    targetVersion: CURRENT_VERSION,
    supported: isVersionSupported(currentVersion),
  };
}

// =============================================================================
// Initialization Functions
// =============================================================================

/**
 * Initialize LLKB directory structure with default files
 *
 * @param llkbRoot - Root directory for LLKB
 * @returns Save result
 *
 * @example
 * ```typescript
 * const result = await initializeLLKB('.artk/llkb');
 * ```
 */
export async function initializeLLKB(llkbRoot: string): Promise<SaveResult> {
  try {
    // Create directories
    ensureDir(llkbRoot);
    ensureDir(path.join(llkbRoot, 'patterns'));
    ensureDir(path.join(llkbRoot, 'history'));

    // Create default config.yml if not exists
    const configPath = path.join(llkbRoot, 'config.yml');
    if (!fs.existsSync(configPath)) {
      const defaultConfig = `# LLKB Configuration
version: "1.0.0"
enabled: true

extraction:
  minOccurrences: 2
  predictiveExtraction: true
  confidenceThreshold: 0.7
  maxPredictivePerJourney: 3
  maxPredictivePerDay: 10
  minLinesForExtraction: 3
  similarityThreshold: 0.8

retention:
  maxLessonAge: 90
  minSuccessRate: 0.6
  archiveUnused: 30

history:
  retentionDays: 365

injection:
  prioritizeByConfidence: true

scopes:
  universal: true
  frameworkSpecific: true
  appSpecific: true

overrides:
  allowUserOverride: true
  logOverrides: true
  flagAfterOverrides: 3
`;
      fs.writeFileSync(configPath, defaultConfig, 'utf-8');
    }

    // Create default lessons.json if not exists
    const lessonsPath = path.join(llkbRoot, 'lessons.json');
    if (!fs.existsSync(lessonsPath)) {
      const defaultLessons: LessonsFile = {
        version: CURRENT_VERSION,
        lastUpdated: new Date().toISOString(),
        lessons: [],
        archived: [],
        globalRules: [],
        appQuirks: [],
      };
      await saveJSONAtomic(lessonsPath, defaultLessons);
    }

    // Create default components.json if not exists
    const componentsPath = path.join(llkbRoot, 'components.json');
    if (!fs.existsSync(componentsPath)) {
      const defaultComponents: ComponentsFile = {
        version: CURRENT_VERSION,
        lastUpdated: new Date().toISOString(),
        components: [],
        componentsByCategory: {
          selector: [],
          timing: [],
          auth: [],
          data: [],
          assertion: [],
          navigation: [],
          'ui-interaction': [],
        },
        componentsByScope: {
          universal: [],
          'framework:angular': [],
          'framework:react': [],
          'framework:vue': [],
          'framework:ag-grid': [],
          'app-specific': [],
        },
      };
      await saveJSONAtomic(componentsPath, defaultComponents);
    }

    // Create default analytics.json if not exists
    const analyticsPath = path.join(llkbRoot, 'analytics.json');
    if (!fs.existsSync(analyticsPath)) {
      const defaultAnalytics = createEmptyAnalytics();
      await saveJSONAtomic(analyticsPath, defaultAnalytics);
    }

    // Create default pattern files if not exist
    const patternFiles = ['selectors.json', 'timing.json', 'assertions.json', 'auth.json', 'data.json'];
    for (const patternFile of patternFiles) {
      const patternPath = path.join(llkbRoot, 'patterns', patternFile);
      if (!fs.existsSync(patternPath)) {
        await saveJSONAtomic(patternPath, {
          version: CURRENT_VERSION,
          patterns: [],
        });
      }
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Validate LLKB installation
 *
 * @param llkbRoot - Root directory of LLKB
 * @returns Validation result
 */
export function validateLLKBInstallation(llkbRoot: string): {
  valid: boolean;
  missingFiles: string[];
  invalidFiles: string[];
  version: string;
} {
  const result = {
    valid: true,
    missingFiles: [] as string[],
    invalidFiles: [] as string[],
    version: CURRENT_VERSION,
  };

  // Required files
  const requiredFiles = [
    'config.yml',
    'lessons.json',
    'components.json',
    'analytics.json',
  ];

  for (const file of requiredFiles) {
    const filePath = path.join(llkbRoot, file);
    if (!fs.existsSync(filePath)) {
      result.missingFiles.push(file);
      result.valid = false;
    } else if (file.endsWith('.json')) {
      // Validate JSON
      try {
        const data = loadJSON<any>(filePath);
        if (!data || !data.version) {
          result.invalidFiles.push(file);
          result.valid = false;
        } else if (file === 'lessons.json') {
          result.version = data.version;
        }
      } catch {
        result.invalidFiles.push(file);
        result.valid = false;
      }
    }
  }

  // Check patterns directory
  const patternsDir = path.join(llkbRoot, 'patterns');
  if (!fs.existsSync(patternsDir)) {
    result.missingFiles.push('patterns/');
    result.valid = false;
  }

  return result;
}
