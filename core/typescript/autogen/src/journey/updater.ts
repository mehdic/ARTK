/**
 * Journey Frontmatter Updater - Enable bi-directional traceability
 * @see research/2026-01-03_autogen-remaining-features-plan.md Section 1
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { createHash } from 'node:crypto';

/**
 * Journey test entry with generation metadata
 */
export interface JourneyTestEntry {
  /** Path to generated test file (relative to project root) */
  path: string;
  /** Timestamp when test was generated */
  generated: string;
  /** Content hash for change detection (first 8 chars of SHA-256) */
  hash: string;
}

/**
 * Options for updating journey frontmatter
 */
export interface JourneyUpdateOptions {
  /** Path to the journey markdown file */
  journeyPath: string;
  /** Path to the generated test file */
  testPath: string;
  /** Content of the generated test (for hash calculation) */
  testContent: string;
  /** Module dependencies to add (foundation or feature module names) */
  modules?: {
    foundation?: string[];
    features?: string[];
  };
}

/**
 * Result of journey frontmatter update
 */
export interface JourneyUpdateResult {
  /** Whether update succeeded */
  success: boolean;
  /** Previous tests array before update */
  previousTests: JourneyTestEntry[];
  /** Updated tests array after update */
  updatedTests: JourneyTestEntry[];
  /** Modules added (not previously in the list) */
  modulesAdded: {
    foundation: string[];
    features: string[];
  };
}

/**
 * Split journey content into frontmatter and body
 */
function splitJourneyContent(content: string): {
  frontmatter: string;
  body: string;
} {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);

  if (!match) {
    throw new Error(
      'Invalid Journey format: missing frontmatter delimiters (content should be wrapped in --- ... ---)'
    );
  }

  return {
    frontmatter: match[1]!,
    body: match[2]!,
  };
}

/**
 * Calculate SHA-256 hash of content (first 8 characters)
 */
function calculateContentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex').substring(0, 8);
}

/**
 * Update Journey frontmatter with generated test info
 *
 * This enables bi-directional traceability by:
 * 1. Recording which tests were generated from this Journey
 * 2. Tracking when tests were generated
 * 3. Detecting test changes via content hash
 * 4. Linking module dependencies
 *
 * @param options - Update options
 * @returns Update result with previous and new state
 * @throws Error if journey file is invalid or cannot be written
 */
export function updateJourneyFrontmatter(
  options: JourneyUpdateOptions
): JourneyUpdateResult {
  const {
    journeyPath,
    testPath,
    testContent,
    modules = { foundation: [], features: [] },
  } = options;

  // Read journey file
  const content = readFileSync(journeyPath, 'utf-8');

  // Split frontmatter and body
  const { frontmatter, body } = splitJourneyContent(content);

  // Parse YAML frontmatter
  const parsed = parseYaml(frontmatter) as Record<string, unknown>;

  // Store previous state (deep copy to avoid mutation)
  const previousTests = Array.isArray(parsed.tests)
    ? (parsed.tests as JourneyTestEntry[]).map((t) =>
        typeof t === 'string' ? { path: t, generated: '', hash: '' } : { ...t }
      )
    : [];

  // Calculate content hash
  const hash = calculateContentHash(testContent);

  // Create/update test entry
  const testEntry: JourneyTestEntry = {
    path: testPath,
    generated: new Date().toISOString(),
    hash,
  };

  // Ensure tests array exists
  if (!Array.isArray(parsed.tests)) {
    parsed.tests = [];
  }

  // Find existing test entry by path
  const existingIndex = (parsed.tests as JourneyTestEntry[]).findIndex(
    (t) =>
      typeof t === 'string'
        ? t === testPath
        : (t as JourneyTestEntry).path === testPath
  );

  // Update or add test entry
  if (existingIndex >= 0) {
    (parsed.tests as JourneyTestEntry[])[existingIndex]! = testEntry;
  } else {
    (parsed.tests as JourneyTestEntry[]).push(testEntry);
  }

  // Update modules
  const modulesAdded = {
    foundation: [] as string[],
    features: [] as string[],
  };

  // Ensure modules structure exists
  if (!parsed.modules || typeof parsed.modules !== 'object') {
    parsed.modules = { foundation: [], features: [] };
  }

  const parsedModules = parsed.modules as {
    foundation?: string[];
    features?: string[];
  };

  // Ensure foundation and features arrays exist
  if (!Array.isArray(parsedModules.foundation)) {
    parsedModules.foundation = [];
  }
  if (!Array.isArray(parsedModules.features)) {
    parsedModules.features = [];
  }

  // Add foundation modules (deduplicate)
  if (modules.foundation) {
    const existingFoundation = new Set(parsedModules.foundation!);
    for (const mod of modules.foundation) {
      if (!existingFoundation.has(mod)) {
        modulesAdded.foundation.push(mod);
        parsedModules.foundation!.push(mod);
      }
    }
    // Sort for consistency
    parsedModules.foundation!.sort();
  }

  // Add feature modules (deduplicate)
  if (modules.features) {
    const existingFeatures = new Set(parsedModules.features);
    for (const mod of modules.features) {
      if (!existingFeatures.has(mod)) {
        modulesAdded.features.push(mod);
        parsedModules.features.push(mod);
      }
    }
    // Sort for consistency
    parsedModules.features.sort();
  }

  // Reconstruct file with updated frontmatter
  const newFrontmatter = stringifyYaml(parsed, {
    lineWidth: 0, // Prevent line wrapping
    defaultKeyType: 'PLAIN',
    defaultStringType: 'QUOTE_DOUBLE',
  });

  const newContent = `---\n${newFrontmatter}---\n${body}`;

  // Write back to file
  writeFileSync(journeyPath, newContent, 'utf-8');

  return {
    success: true,
    previousTests,
    updatedTests: parsed.tests as JourneyTestEntry[],
    modulesAdded,
  };
}

/**
 * Check if a Journey's test is up-to-date based on content hash
 *
 * @param journeyPath - Path to the journey file
 * @param testPath - Path to the test file to check
 * @param testContent - Current content of the test file
 * @returns True if the test hash matches the recorded hash
 */
export function isJourneyTestCurrent(
  journeyPath: string,
  testPath: string,
  testContent: string
): boolean {
  const content = readFileSync(journeyPath, 'utf-8');
  const { frontmatter } = splitJourneyContent(content);
  const parsed = parseYaml(frontmatter) as Record<string, unknown>;

  if (!Array.isArray(parsed.tests)) {
    return false;
  }

  // Find test entry
  const testEntry = (parsed.tests as JourneyTestEntry[]).find((t) =>
    typeof t === 'string' ? t === testPath : t.path === testPath
  );

  if (!testEntry || typeof testEntry === 'string') {
    return false;
  }

  // Calculate current hash
  const currentHash = calculateContentHash(testContent);

  return testEntry.hash === currentHash;
}
