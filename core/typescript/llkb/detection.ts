/**
 * LLKB Cross-Journey Detection Module
 *
 * This module provides functions to detect duplicate patterns across
 * multiple journey test files and identify extraction opportunities.
 *
 * @module llkb/detection
 */

import * as fs from 'fs';
import * as path from 'path';
import type { TestStep, ExtractionCandidate, Component } from './types.js';
import { normalizeCode, hashCode, countLines } from './normalize.js';
import { calculateSimilarity } from './similarity.js';
import { inferCategory } from './inference.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Result of duplicate detection across files
 */
export interface DuplicateDetectionResult {
  /** All test steps extracted from files */
  totalSteps: number;

  /** Number of unique patterns found */
  uniquePatterns: number;

  /** Number of duplicate patterns found */
  duplicatePatterns: number;

  /** Duplicate groups with their occurrences */
  duplicateGroups: DuplicateGroup[];

  /** Extraction candidates (sorted by priority) */
  extractionCandidates: ExtractionCandidate[];

  /** Files analyzed */
  filesAnalyzed: string[];
}

/**
 * A group of duplicate patterns
 */
export interface DuplicateGroup {
  /** Hash of the normalized pattern */
  patternHash: string;

  /** Normalized pattern code */
  normalizedCode: string;

  /** Original code samples */
  originalSamples: string[];

  /** All occurrences */
  occurrences: TestStep[];

  /** Number of unique journeys */
  uniqueJourneys: number;

  /** Number of unique files */
  uniqueFiles: number;

  /** Inferred category */
  category: string;

  /** Similarity score between occurrences */
  internalSimilarity: number;
}

/**
 * Options for duplicate detection
 */
export interface DetectionOptions {
  /** Minimum similarity threshold (default: 0.8) */
  similarityThreshold?: number;

  /** Minimum occurrences to report (default: 2) */
  minOccurrences?: number;

  /** Minimum lines for a pattern (default: 3) */
  minLines?: number;

  /** Include archived patterns */
  includeArchived?: boolean;

  /** File extensions to scan (default: ['.ts', '.js']) */
  extensions?: string[];

  /** Directories to exclude */
  excludeDirs?: string[];
}

/**
 * Parsed test step from file analysis
 */
interface ParsedStep {
  file: string;
  journeyId: string;
  stepName: string;
  code: string;
  lineStart: number;
  lineEnd: number;
}

// =============================================================================
// Constants
// =============================================================================

/** Default file extensions to scan */
const DEFAULT_EXTENSIONS = ['.ts', '.js'];

/** Default directories to exclude */
const DEFAULT_EXCLUDE_DIRS = ['node_modules', 'dist', 'build', '.git', 'coverage'];

/** Regex to extract test.step blocks */
const TEST_STEP_REGEX = /(?:await\s+)?test\.step\s*\(\s*(['"`])(.+?)\1\s*,\s*async\s*\([^)]*\)\s*=>\s*\{([\s\S]*?)\}\s*\)/g;

/** Regex to extract journey ID from file */
const JOURNEY_ID_REGEX = /(?:JRN|jrn)[-_]?(\d+)/i;

// =============================================================================
// File Parsing Functions
// =============================================================================

/**
 * Extract journey ID from file path or content
 */
function extractJourneyId(filePath: string, content: string): string {
  // Try filename first
  const fileMatch = path.basename(filePath).match(JOURNEY_ID_REGEX);
  if (fileMatch && fileMatch[1]) {
    return `JRN-${fileMatch[1].padStart(4, '0')}`;
  }

  // Try content
  const contentMatch = content.match(JOURNEY_ID_REGEX);
  if (contentMatch && contentMatch[1]) {
    return `JRN-${contentMatch[1].padStart(4, '0')}`;
  }

  // Generate from filename
  const basename = path.basename(filePath, path.extname(filePath));
  return `JRN-${basename.toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 20)}`;
}

/**
 * Parse test.step blocks from file content
 */
function parseTestSteps(filePath: string, content: string): ParsedStep[] {
  const steps: ParsedStep[] = [];
  const journeyId = extractJourneyId(filePath, content);

  // Reset regex
  TEST_STEP_REGEX.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = TEST_STEP_REGEX.exec(content)) !== null) {
    const stepName = match[2];
    const stepCode = match[3];

    // Skip if we didn't capture properly
    if (!stepName || !stepCode) continue;

    const trimmedCode = stepCode.trim();

    // Calculate line numbers
    const beforeMatch = content.slice(0, match.index);
    const lineStart = beforeMatch.split('\n').length;
    const lineEnd = lineStart + match[0].split('\n').length - 1;

    // Only include steps with actual code (not just comments)
    const codeWithoutComments = trimmedCode.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
    if (codeWithoutComments.length > 0) {
      steps.push({
        file: filePath,
        journeyId,
        stepName,
        code: trimmedCode,
        lineStart,
        lineEnd,
      });
    }
  }

  return steps;
}

/**
 * Recursively find test files in directory
 */
function findTestFiles(
  dir: string,
  extensions: string[],
  excludeDirs: string[]
): string[] {
  const files: string[] = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!excludeDirs.includes(entry.name)) {
        files.push(...findTestFiles(fullPath, extensions, excludeDirs));
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (extensions.includes(ext)) {
        // Look for test files specifically
        if (
          entry.name.includes('.spec.') ||
          entry.name.includes('.test.') ||
          entry.name.includes('.e2e.')
        ) {
          files.push(fullPath);
        }
      }
    }
  }

  return files;
}

// =============================================================================
// Duplicate Detection Functions
// =============================================================================

/**
 * Group similar patterns together
 */
function groupSimilarPatterns(
  steps: ParsedStep[],
  similarityThreshold: number,
  minLines: number
): Map<string, ParsedStep[]> {
  const groups: Map<string, ParsedStep[]> = new Map();
  const normalizedByStep: Map<ParsedStep, string> = new Map();

  // Normalize all steps
  for (const step of steps) {
    const normalized = normalizeCode(step.code);
    const lineCount = countLines(step.code);

    // Skip steps that are too short
    if (lineCount < minLines) {
      continue;
    }

    normalizedByStep.set(step, normalized);
  }

  // Group by similarity
  const processed = new Set<ParsedStep>();

  for (const [step, normalized] of normalizedByStep) {
    if (processed.has(step)) continue;

    const hash = hashCode(normalized);
    let foundGroup = false;

    // Check if this is similar to an existing group
    for (const [groupHash, groupSteps] of groups) {
      const firstGroupStep = groupSteps[0];
      if (!firstGroupStep) continue;

      const groupNormalized = normalizedByStep.get(firstGroupStep);
      if (!groupNormalized) continue;

      const similarity = calculateSimilarity(normalized, groupNormalized);

      if (similarity >= similarityThreshold) {
        const existingGroup = groups.get(groupHash);
        if (existingGroup) {
          existingGroup.push(step);
        }
        processed.add(step);
        foundGroup = true;
        break;
      }
    }

    // Create new group if no match found
    if (!foundGroup) {
      groups.set(hash, [step]);
      processed.add(step);
    }
  }

  return groups;
}

/**
 * Convert step groups to duplicate groups with metadata
 */
function buildDuplicateGroups(
  stepGroups: Map<string, ParsedStep[]>,
  minOccurrences: number
): DuplicateGroup[] {
  const duplicateGroups: DuplicateGroup[] = [];

  for (const [hash, steps] of stepGroups) {
    // Only include groups with multiple occurrences
    if (steps.length < minOccurrences) {
      continue;
    }

    const uniqueJourneys = new Set(steps.map((s) => s.journeyId)).size;
    const uniqueFiles = new Set(steps.map((s) => s.file)).size;

    // Calculate internal similarity (average pairwise similarity)
    let totalSimilarity = 0;
    let pairs = 0;

    for (let i = 0; i < steps.length; i++) {
      for (let j = i + 1; j < steps.length; j++) {
        const stepI = steps[i];
        const stepJ = steps[j];
        if (!stepI || !stepJ) continue;

        const sim = calculateSimilarity(
          normalizeCode(stepI.code),
          normalizeCode(stepJ.code)
        );
        totalSimilarity += sim;
        pairs++;
      }
    }

    const internalSimilarity = pairs > 0 ? totalSimilarity / pairs : 1.0;

    // Collect original samples (up to 3)
    const originalSamples = steps.slice(0, 3).map((s) => s.code);

    // Infer category from first step
    const firstStep = steps[0];
    if (!firstStep) continue;

    const category = inferCategory(firstStep.code);

    // Convert to TestStep format
    const occurrences: TestStep[] = steps.map((s) => ({
      file: s.file,
      journey: s.journeyId,
      stepName: s.stepName,
      code: s.code,
      normalizedCode: normalizeCode(s.code),
      hash: hashCode(normalizeCode(s.code)),
      lineStart: s.lineStart,
      lineEnd: s.lineEnd,
    }));

    duplicateGroups.push({
      patternHash: hash,
      normalizedCode: normalizeCode(firstStep.code),
      originalSamples,
      occurrences,
      uniqueJourneys,
      uniqueFiles,
      category,
      internalSimilarity,
    });
  }

  // Sort by number of occurrences (descending)
  return duplicateGroups.sort((a, b) => b.occurrences.length - a.occurrences.length);
}

/**
 * Detect duplicate patterns across multiple test files
 *
 * Scans test files for test.step blocks, normalizes the code,
 * and groups similar patterns to identify extraction opportunities.
 *
 * @param testDir - Directory containing test files
 * @param options - Detection options
 * @returns Duplicate detection result with groups and candidates
 *
 * @example
 * ```typescript
 * const result = detectDuplicatesAcrossFiles(
 *   'artk-e2e/tests',
 *   { similarityThreshold: 0.8, minOccurrences: 2 }
 * );
 * console.log(`Found ${result.duplicatePatterns} duplicate patterns`);
 * ```
 */
export function detectDuplicatesAcrossFiles(
  testDir: string,
  options: DetectionOptions = {}
): DuplicateDetectionResult {
  const {
    similarityThreshold = 0.8,
    minOccurrences = 2,
    minLines = 3,
    extensions = DEFAULT_EXTENSIONS,
    excludeDirs = DEFAULT_EXCLUDE_DIRS,
  } = options;

  // Find all test files
  const testFiles = findTestFiles(testDir, extensions, excludeDirs);

  // Parse all test steps
  const allSteps: ParsedStep[] = [];

  for (const file of testFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const steps = parseTestSteps(file, content);
      allSteps.push(...steps);
    } catch (error) {
      // Skip files that can't be read
      console.warn(`Warning: Could not read file ${file}`);
    }
  }

  // Group similar patterns
  const stepGroups = groupSimilarPatterns(allSteps, similarityThreshold, minLines);

  // Build duplicate groups
  const duplicateGroups = buildDuplicateGroups(stepGroups, minOccurrences);

  // Count unique patterns (groups with 1 occurrence)
  const uniquePatterns = Array.from(stepGroups.values()).filter(
    (g) => g.length === 1
  ).length;

  // Convert to extraction candidates format
  const extractionCandidates: ExtractionCandidate[] = duplicateGroups.map((group) => ({
    pattern: group.normalizedCode,
    originalCode: group.originalSamples[0] || group.normalizedCode,
    occurrences: group.occurrences.length,
    journeys: [...new Set(group.occurrences.map((o) => o.journey))],
    files: [...new Set(group.occurrences.map((o) => o.file))],
    category: group.category as ExtractionCandidate['category'],
    score: (group.occurrences.length * 0.3 + group.uniqueJourneys * 0.4 + group.internalSimilarity * 0.3),
    recommendation:
      group.occurrences.length >= 3 ? 'EXTRACT_NOW' :
      group.occurrences.length >= 2 ? 'CONSIDER' : 'SKIP',
  }));

  return {
    totalSteps: allSteps.length,
    uniquePatterns,
    duplicatePatterns: duplicateGroups.length,
    duplicateGroups,
    extractionCandidates: extractionCandidates.sort((a, b) => b.score - a.score),
    filesAnalyzed: testFiles,
  };
}

/**
 * Detect duplicates within a single file
 *
 * @param filePath - Path to the test file
 * @param options - Detection options
 * @returns Duplicate detection result
 */
export function detectDuplicatesInFile(
  filePath: string,
  options: DetectionOptions = {}
): DuplicateDetectionResult {
  const {
    similarityThreshold = 0.8,
    minOccurrences = 2,
    minLines = 2, // Lower threshold for single file
  } = options;

  if (!fs.existsSync(filePath)) {
    return {
      totalSteps: 0,
      uniquePatterns: 0,
      duplicatePatterns: 0,
      duplicateGroups: [],
      extractionCandidates: [],
      filesAnalyzed: [],
    };
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const steps = parseTestSteps(filePath, content);

  // Group similar patterns
  const stepGroups = groupSimilarPatterns(steps, similarityThreshold, minLines);

  // Build duplicate groups
  const duplicateGroups = buildDuplicateGroups(stepGroups, minOccurrences);

  // Count unique patterns
  const uniquePatterns = Array.from(stepGroups.values()).filter(
    (g) => g.length === 1
  ).length;

  // Convert to extraction candidates
  const extractionCandidates: ExtractionCandidate[] = duplicateGroups.map((group) => {
    const firstOccurrence = group.occurrences[0];
    return {
      pattern: group.normalizedCode,
      originalCode: group.originalSamples[0] || group.normalizedCode,
      occurrences: group.occurrences.length,
      journeys: firstOccurrence ? [firstOccurrence.journey] : [],
      files: [filePath],
      category: group.category as ExtractionCandidate['category'],
      score: group.occurrences.length * 0.5 + group.internalSimilarity * 0.5,
      recommendation: group.occurrences.length >= 2 ? 'CONSIDER' : 'SKIP',
    };
  });

  return {
    totalSteps: steps.length,
    uniquePatterns,
    duplicatePatterns: duplicateGroups.length,
    duplicateGroups,
    extractionCandidates: extractionCandidates.sort((a, b) => b.score - a.score),
    filesAnalyzed: [filePath],
  };
}

/**
 * Find patterns in test files that match existing components
 *
 * Useful for identifying code that should be refactored to use components.
 *
 * @param testDir - Directory containing test files
 * @param components - Existing components to match against
 * @param options - Detection options
 * @returns Array of matches with component and location
 */
export function findUnusedComponentOpportunities(
  testDir: string,
  components: Component[],
  options: DetectionOptions = {}
): Array<{
  component: Component;
  matches: Array<{
    file: string;
    stepName: string;
    similarity: number;
    lineStart: number;
    lineEnd: number;
  }>;
}> {
  const {
    similarityThreshold = 0.6, // Lower threshold for opportunities
    extensions = DEFAULT_EXTENSIONS,
    excludeDirs = DEFAULT_EXCLUDE_DIRS,
  } = options;

  const testFiles = findTestFiles(testDir, extensions, excludeDirs);
  const opportunities: Map<string, Array<{
    file: string;
    stepName: string;
    similarity: number;
    lineStart: number;
    lineEnd: number;
  }>> = new Map();

  // Initialize map for each component
  for (const component of components) {
    if (!component.archived) {
      opportunities.set(component.id, []);
    }
  }

  // Scan all test files
  for (const file of testFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const steps = parseTestSteps(file, content);

      for (const step of steps) {
        const normalizedStep = normalizeCode(step.code);

        // Compare against each component
        for (const component of components) {
          if (component.archived) continue;

          const normalizedComponent = normalizeCode(component.source.originalCode);
          const similarity = calculateSimilarity(normalizedStep, normalizedComponent);

          if (similarity >= similarityThreshold) {
            const componentOpportunities = opportunities.get(component.id);
            if (componentOpportunities) {
              componentOpportunities.push({
                file: step.file,
                stepName: step.stepName,
                similarity,
                lineStart: step.lineStart,
                lineEnd: step.lineEnd,
              });
            }
          }
        }
      }
    } catch {
      // Skip unreadable files
    }
  }

  // Convert to result format
  return components
    .filter((c) => {
      if (c.archived) return false;
      const ops = opportunities.get(c.id);
      return ops && ops.length > 0;
    })
    .map((component) => ({
      component,
      matches: (opportunities.get(component.id) || []).sort((a, b) => b.similarity - a.similarity),
    }))
    .sort((a, b) => b.matches.length - a.matches.length);
}
