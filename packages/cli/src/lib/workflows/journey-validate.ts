/**
 * Journey Validation Logic
 *
 * Extracted from artk.journey-implement.md pseudocode.
 * Now testable as pure TypeScript functions.
 *
 * Security fixes applied:
 * - Path traversal protection (Windows + Unix)
 * - Zod schema validation with detailed error messages
 * - Input sanitization
 * - Duplicate journey detection
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import {
  ValidationResult,
  JourneyInfo,
  JourneyFrontmatter,
  JourneyFrontmatterSchema,
  LLKBConfigSchema,
  BATCH_LIMITS,
  ImplementedBatchMode,
  LearningMode,
} from './types.js';

/**
 * Validate that a path stays within its root directory (path traversal protection)
 * Works on both Windows and Unix, handles case sensitivity appropriately
 */
export function isPathSafe(targetPath: string, rootPath: string): boolean {
  // Resolve to absolute paths
  const normalizedTarget = path.resolve(targetPath);
  const normalizedRoot = path.resolve(rootPath);

  // On Windows, paths are case-insensitive
  const isWindows = process.platform === 'win32';

  const targetToCheck = isWindows ? normalizedTarget.toLowerCase() : normalizedTarget;
  const rootToCheck = isWindows ? normalizedRoot.toLowerCase() : normalizedRoot;

  // Must start with root + separator, or be exactly root
  const rootWithSep = rootToCheck + path.sep;

  return targetToCheck === rootToCheck || targetToCheck.startsWith(rootWithSep);
}

/**
 * Validate journey ID format (strict validation, no injection risk)
 */
export function isValidJourneyId(id: string): boolean {
  return /^JRN-\d{4}$/.test(id);
}

/**
 * Result type for frontmatter parsing with detailed errors
 */
export type ParseResult = {
  success: true;
  data: JourneyFrontmatter;
} | {
  success: false;
  error: string;
  details?: string[];
};

/**
 * Parse journey frontmatter from a markdown file with Zod validation
 * Returns detailed error information on failure
 */
export function parseJourneyFrontmatter(content: string): ParseResult {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    return {
      success: false,
      error: 'No YAML frontmatter found. File must start with --- and end frontmatter with ---',
    };
  }

  try {
    const parsed = yaml.parse(match[1]);
    const result = JourneyFrontmatterSchema.safeParse(parsed);

    if (!result.success) {
      const details = result.error.issues.map(issue =>
        `${issue.path.join('.')}: ${issue.message}`
      );
      return {
        success: false,
        error: 'Invalid frontmatter schema',
        details,
      };
    }

    return { success: true, data: result.data };
  } catch (e) {
    return {
      success: false,
      error: `YAML parse error: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

/**
 * Result type for loading a journey with detailed errors
 */
export interface LoadJourneyResult {
  journey: JourneyInfo | null;
  error?: string;
  details?: string[];
}

/**
 * Load a journey file and extract its info
 * Returns detailed error information on failure
 */
export function loadJourney(journeyPath: string, harnessRoot?: string): LoadJourneyResult {
  // Path traversal check if harnessRoot provided
  if (harnessRoot && !isPathSafe(journeyPath, harnessRoot)) {
    return { journey: null, error: 'Path traversal detected - path outside allowed directory' };
  }

  try {
    if (!fs.existsSync(journeyPath)) {
      return { journey: null, error: 'File not found' };
    }

    const content = fs.readFileSync(journeyPath, 'utf-8');
    const parseResult = parseJourneyFrontmatter(content);

    if (!parseResult.success) {
      return {
        journey: null,
        error: parseResult.error,
        details: parseResult.details,
      };
    }

    return {
      journey: {
        id: parseResult.data.id,
        path: journeyPath,
        status: parseResult.data.status,
        title: parseResult.data.title,
        tests: parseResult.data.tests,
      },
    };
  } catch (e) {
    return {
      journey: null,
      error: `File read error: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

/**
 * Validate that a journey is ready for implementation
 */
export function validateJourneyForImplementation(journey: JourneyInfo): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check ID (should already be validated, but double-check)
  if (!journey.id) {
    errors.push('Journey is missing required field: id');
  } else if (!isValidJourneyId(journey.id)) {
    errors.push(`Journey ID "${journey.id}" does not match pattern JRN-XXXX`);
  }

  // Check status
  const validStatuses: JourneyInfo['status'][] = ['clarified', 'defined'];
  if (!validStatuses.includes(journey.status)) {
    if (journey.status === 'proposed') {
      errors.push(`Journey status is "proposed". Must be at least "defined" (preferably "clarified") before implementation.`);
    } else if (journey.status === 'implemented') {
      warnings.push('Journey is already implemented. Re-running will regenerate tests.');
    } else if (journey.status === 'quarantined') {
      errors.push('Journey is quarantined. Resolve issues before re-implementing.');
    } else if (journey.status === 'deprecated') {
      errors.push('Journey is deprecated and should not be implemented.');
    }
  }

  // Warn if not clarified
  if (journey.status === 'defined') {
    warnings.push('Journey is "defined" but not "clarified". Consider running /artk.journey-clarify first for better test generation.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate LLKB exists and is enabled
 */
export function validateLLKB(llkbRoot: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Check directory exists
    if (!fs.existsSync(llkbRoot)) {
      errors.push(`LLKB directory not found: ${llkbRoot}`);
      errors.push('Run /artk.discover-foundation to create LLKB.');
      return { valid: false, errors, warnings };
    }

    // Check config exists
    const configPath = path.join(llkbRoot, 'config.yml');
    if (!fs.existsSync(configPath)) {
      errors.push(`LLKB config not found: ${configPath}`);
      return { valid: false, errors, warnings };
    }

    // Parse and validate config with Zod
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const configParsed = yaml.parse(configContent);
    const configResult = LLKBConfigSchema.safeParse(configParsed);

    if (!configResult.success) {
      const details = configResult.error.issues.map(issue =>
        `${issue.path.join('.')}: ${issue.message}`
      ).join('; ');
      errors.push(`Invalid LLKB config: ${details}`);
      return { valid: false, errors, warnings };
    }

    if (configResult.data.enabled === false) {
      errors.push('LLKB is disabled in config.yml. Set enabled: true to use LLKB.');
    }

    // Check minConfidence if present
    if (configResult.data.minConfidence !== undefined) {
      if (configResult.data.minConfidence < 0.5) {
        warnings.push(`LLKB minConfidence is ${configResult.data.minConfidence}, which may include low-quality patterns.`);
      }
    }

    // Check required files
    const requiredFiles = ['components.json', 'lessons.json'];
    for (const file of requiredFiles) {
      const filePath = path.join(llkbRoot, file);
      if (!fs.existsSync(filePath)) {
        warnings.push(`LLKB file missing: ${file}. Will be created during export.`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return {
      valid: false,
      errors: [`Failed to validate LLKB: ${message}`],
      warnings,
    };
  }
}

/**
 * Validate batch mode parameter
 * NOTE: Only 'serial' is currently implemented. 'parallel' will fail explicitly.
 */
export function validateBatchMode(batchMode: string): {
  valid: boolean;
  normalized: ImplementedBatchMode;
  warning?: string;
  error?: string;
} {
  const input = batchMode.toLowerCase().trim();

  // Deprecated alias - warn but use serial
  if (input === 'subagent') {
    return {
      valid: true,
      normalized: 'serial',
      warning: 'batchMode=subagent is deprecated. Parallel mode is not yet implemented; using serial.',
    };
  }

  // Explicit parallel request - fail with clear message
  if (input === 'parallel') {
    return {
      valid: false,
      normalized: 'serial',
      error: 'Parallel mode (--batch-mode=parallel) is not yet implemented. Use --batch-mode=serial or omit the flag.',
    };
  }

  // Serial or empty (default)
  if (input === 'serial' || input === '') {
    return { valid: true, normalized: 'serial' };
  }

  // Unknown mode
  return {
    valid: false,
    normalized: 'serial',
    error: `Unknown batch mode: "${batchMode}". Valid option: serial`,
  };
}

/**
 * Validate learning mode parameter
 */
export function validateLearningMode(learningMode: string): {
  valid: boolean;
  normalized: LearningMode;
  error?: string;
} {
  const normalized = learningMode.toLowerCase().trim();

  if (normalized === 'strict' || normalized === 'batch' || normalized === 'none') {
    return { valid: true, normalized };
  }

  // Invalid - return strict as fallback (but mark as invalid)
  return {
    valid: false,
    normalized: 'strict',
    error: `Unknown learning mode: "${learningMode}". Valid options: strict, batch, none`,
  };
}

/**
 * Result type for finding journey files
 */
export interface FindJourneyFilesResult {
  found: Map<string, string | null>;
  duplicates: Map<string, string[]>;  // ID -> list of paths where found
}

/**
 * Find all journey files matching IDs
 * Detects duplicates across status folders and warns
 * Path traversal protection: validates all returned paths stay within harnessRoot
 */
export function findJourneyFiles(harnessRoot: string, journeyIds: string[]): FindJourneyFilesResult {
  const found = new Map<string, string | null>();
  const duplicates = new Map<string, string[]>();
  const journeysDir = path.join(harnessRoot, 'journeys');

  // Validate journey IDs first (prevents directory injection)
  const validIds = journeyIds.filter(isValidJourneyId);

  for (const id of validIds) {
    const locations: string[] = [];
    // Priority order: clarified > defined > proposed > implemented > quarantined > deprecated
    const statuses = ['clarified', 'defined', 'proposed', 'implemented', 'quarantined', 'deprecated'];

    for (const status of statuses) {
      const statusDir = path.join(journeysDir, status);

      // Path traversal protection
      if (!isPathSafe(statusDir, harnessRoot)) {
        continue;
      }

      try {
        if (!fs.existsSync(statusDir)) continue;

        const files = fs.readdirSync(statusDir);
        const match = files.find(f => f.startsWith(`${id}__`) && f.endsWith('.md'));

        if (match) {
          const fullPath = path.join(statusDir, match);

          // Verify path safety before adding
          if (isPathSafe(fullPath, harnessRoot)) {
            locations.push(fullPath);
          }
        }
      } catch {
        // Permission or filesystem errors - skip this directory
        continue;
      }
    }

    if (locations.length > 1) {
      // Duplicate detected - record all locations
      duplicates.set(id, locations);
      // Use first match (highest priority status)
      found.set(id, locations[0]);
    } else if (locations.length === 1) {
      found.set(id, locations[0]);
    } else {
      found.set(id, null);
    }
  }

  // Add invalid IDs as not found
  for (const id of journeyIds) {
    if (!validIds.includes(id) && !found.has(id)) {
      found.set(id, null);
    }
  }

  return { found, duplicates };
}

/**
 * Parse journey list from user input
 * Handles:
 * - Single: JRN-0001
 * - Comma-separated: JRN-0001,JRN-0002
 * - Ranges: JRN-0001..JRN-0010 (inclusive, handles backwards ranges)
 * - Combinations: JRN-0001,JRN-0003..JRN-0005,JRN-0010
 *
 * Returns deduplicated, sorted list of valid IDs
 */
export function parseJourneyList(input: string): string[] {
  const ids = new Set<string>();

  // Split by comma
  const parts = input.split(',').map(p => p.trim()).filter(Boolean);

  for (const part of parts) {
    // Check for range (supports both forward and backward ranges)
    const rangeMatch = part.match(/^(JRN-(\d{4}))\.\.JRN-(\d{4})$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[2], 10);
      const end = parseInt(rangeMatch[3], 10);

      // Handle both forward and backward ranges
      const min = Math.min(start, end);
      const max = Math.max(start, end);

      for (let i = min; i <= max; i++) {
        ids.add(`JRN-${i.toString().padStart(4, '0')}`);
      }
    } else if (isValidJourneyId(part)) {
      ids.add(part);
    }
    // Invalid IDs are silently ignored (filtered out)
  }

  // Return sorted, deduplicated array
  return Array.from(ids).sort((a, b) => {
    const numA = parseInt(a.replace('JRN-', ''), 10);
    const numB = parseInt(b.replace('JRN-', ''), 10);
    return numA - numB;
  });
}

/**
 * Validate batch size limits
 */
export function validateBatchSize(count: number): {
  valid: boolean;
  warning?: string;
  error?: string;
} {
  if (count <= 0) {
    return { valid: false, error: 'At least one journey ID required' };
  }

  if (count > BATCH_LIMITS.HARD_LIMIT) {
    return {
      valid: false,
      error: `Too many journeys: ${count}. Maximum is ${BATCH_LIMITS.HARD_LIMIT}. Use smaller batches.`
    };
  }

  if (count > BATCH_LIMITS.SOFT_LIMIT) {
    return {
      valid: true,
      warning: `Processing ${count} journeys. Consider using smaller batches (${BATCH_LIMITS.SOFT_LIMIT} or fewer) for better results.`
    };
  }

  return { valid: true };
}
