/**
 * LLKB i18n Mining Module
 *
 * Extracts internationalization (i18n) keys from source code to generate
 * test patterns for text verification.
 *
 * Supports:
 * - react-i18next
 * - angular-translate
 * - vue-i18n
 * - next-intl
 *
 * @module llkb/mining/i18n-mining
 */

import * as fsp from 'fs/promises';
import * as path from 'path';
import { type MiningCache, scanAllSourceDirectories, type ScannedFile } from '../mining-cache.js';
import type { DiscoveredPattern } from '../pattern-generation.js';
import { randomUUID } from 'crypto';

// =============================================================================
// Constants
// =============================================================================

/** Maximum regex iterations to prevent ReDoS */
const MAX_REGEX_ITERATIONS = 10_000;

/** Default confidence for i18n patterns */
const I18N_PATTERN_CONFIDENCE = 0.75;

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * An i18n key discovered in source code
 */
export interface I18nKey {
  /** Translation key */
  key: string;
  /** Optional namespace */
  namespace?: string;
  /** Optional default value */
  defaultValue?: string;
  /** Source file where key was found */
  source: string;
}

/**
 * Result of i18n mining operation
 */
export interface I18nMiningResult {
  /** Detected i18n library */
  library: 'react-i18next' | 'angular-translate' | 'vue-i18n' | 'next-intl' | 'unknown';
  /** Discovered i18n keys */
  keys: I18nKey[];
  /** Locale files found */
  localeFiles: string[];
}

// =============================================================================
// Detection Patterns
// =============================================================================

/**
 * Patterns to detect i18n library usage
 */
const I18N_LIBRARY_PATTERNS = {
  'react-i18next': /(?:import|from)\s+['"]react-i18next['"]|useTranslation\(/g,
  'angular-translate': /\$translate\.get\(|translate\s+filter|\|\s*translate/g,
  'vue-i18n': /(?:import|from)\s+['"]vue-i18n['"]|createI18n\(|\$t\(/g,
  'next-intl': /(?:import|from)\s+['"]next-intl['"]|useTranslations\(/g,
};

/**
 * Patterns to extract i18n keys from source code
 */
const I18N_KEY_PATTERNS = {
  // react-i18next: t('key'), t('namespace:key'), t('key', { defaultValue: '...' })
  reactI18next: /\bt\s*\(\s*['"`]([^'"`]+)['"`]\s*(?:,\s*\{[^}]*defaultValue\s*:\s*['"`]([^'"`]+)['"`][^}]*\})?\)/g,

  // Trans component: <Trans i18nKey="key">...</Trans>
  transComponent: /<Trans\s+i18nKey\s*=\s*['"`]([^'"`]+)['"`]/g,

  // angular-translate: {{ 'key' | translate }}, $translate.get('key')
  angularTranslate: /(?:\{\{\s*['"`]([^'"`]+)['"`]\s*\|\s*translate\s*\}\}|\$translate\.get\s*\(\s*['"`]([^'"`]+)['"`]\))/g,

  // vue-i18n: $t('key'), t('key') in setup
  vueI18n: /\$t\s*\(\s*['"`]([^'"`]+)['"`]\)|(?:^|[^\w])t\s*\(\s*['"`]([^'"`]+)['"`]\)/g,

  // next-intl: t('key')
  nextIntl: /\bt\s*\(\s*['"`]([^'"`]+)['"`]\)/g,
};

// =============================================================================
// Mining Functions
// =============================================================================

/**
 * Mine i18n keys from a project
 *
 * @param projectRoot - Project root directory
 * @param cache - Optional mining cache
 * @returns i18n mining result
 */
export async function mineI18nKeys(
  projectRoot: string,
  cache?: MiningCache
): Promise<I18nMiningResult> {
  const resolvedRoot = path.resolve(projectRoot);

  // Create cache if not provided
  const miningCache = cache ?? new (await import('../mining-cache.js')).MiningCache();
  const shouldCleanup = !cache;

  try {
    // Scan all source files
    const files = await scanAllSourceDirectories(resolvedRoot, miningCache);

    // Detect which i18n library is being used
    const library = detectI18nLibrary(files);

    // Extract keys based on detected library
    const keys = extractI18nKeys(files, library);

    // Find locale files
    const localeFiles = await findLocaleFiles(resolvedRoot);

    return {
      library,
      keys,
      localeFiles,
    };
  } finally {
    // Clean up cache if we created it
    if (shouldCleanup) {
      miningCache.clear();
    }
  }
}

/**
 * Detect which i18n library is being used
 */
function detectI18nLibrary(
  files: ScannedFile[]
): 'react-i18next' | 'angular-translate' | 'vue-i18n' | 'next-intl' | 'unknown' {
  const detectionScores: Record<string, number> = {
    'react-i18next': 0,
    'angular-translate': 0,
    'vue-i18n': 0,
    'next-intl': 0,
  };

  for (const file of files) {
    for (const [library, pattern] of Object.entries(I18N_LIBRARY_PATTERNS)) {
      pattern.lastIndex = 0;
      if (pattern.test(file.content)) {
        detectionScores[library]++;
      }
    }
  }

  // Return library with highest score
  let maxScore = 0;
  let detectedLibrary: I18nMiningResult['library'] = 'unknown';

  for (const [library, score] of Object.entries(detectionScores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedLibrary = library as I18nMiningResult['library'];
    }
  }

  return detectedLibrary;
}

/**
 * Extract i18n keys from source files
 */
function extractI18nKeys(
  files: ScannedFile[],
  _library: I18nMiningResult['library']
): I18nKey[] {
  const keys: I18nKey[] = [];
  const seenKeys = new Set<string>();

  for (const file of files) {
    // Try all patterns (library detection is a hint, not strict)
    for (const [patternName, pattern] of Object.entries(I18N_KEY_PATTERNS)) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      let iterations = 0;

      while ((match = pattern.exec(file.content)) !== null) {
        if (++iterations > MAX_REGEX_ITERATIONS) {break;}

        // Extract key from first non-empty capture group
        const key = match[1] || match[2];
        if (!key) {continue;}

        // Skip if already seen
        const keyId = `${key}:${file.path}`;
        if (seenKeys.has(keyId)) {continue;}
        seenKeys.add(keyId);

        // Parse namespace if present (format: 'namespace:key')
        let namespace: string | undefined;
        let cleanKey = key;

        if (key.includes(':')) {
          const parts = key.split(':');
          if (parts.length === 2) {
            namespace = parts[0];
            cleanKey = parts[1];
          }
        } else if (key.includes('.')) {
          // Handle dotted keys like 'login.title' -> extract 'title'
          const parts = key.split('.');
          cleanKey = parts[parts.length - 1];
        }

        // Extract default value if present (for react-i18next pattern)
        const defaultValue = match[2] && patternName === 'reactI18next' ? match[2] : undefined;

        keys.push({
          key: cleanKey,
          namespace,
          defaultValue,
          source: file.path,
        });
      }
    }
  }

  return keys;
}

/**
 * Find locale/translation files in the project
 */
async function findLocaleFiles(projectRoot: string): Promise<string[]> {
  const localeFiles: string[] = [];
  const localeDirs = ['locales', 'i18n', 'translations', 'lang', 'public/locales'];

  for (const dir of localeDirs) {
    const fullPath = path.join(projectRoot, dir);

    try {
      const stat = await fsp.lstat(fullPath);
      if (stat.isSymbolicLink()) {continue;}
      if (!stat.isDirectory()) {continue;}

      const files = await findJsonFilesRecursive(fullPath);
      localeFiles.push(...files);
    } catch {
      // Directory doesn't exist, skip
      continue;
    }
  }

  return localeFiles;
}

/**
 * Recursively find JSON files in a directory
 */
async function findJsonFilesRecursive(
  dir: string,
  depth: number = 0,
  maxDepth: number = 5
): Promise<string[]> {
  if (depth > maxDepth) {return [];}

  const files: string[] = [];

  try {
    const entries = await fsp.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isSymbolicLink()) {continue;}

      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        const subFiles = await findJsonFilesRecursive(fullPath, depth + 1, maxDepth);
        files.push(...subFiles);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        files.push(fullPath);
      }
    }
  } catch {
    // Ignore errors
  }

  return files;
}

// =============================================================================
// Pattern Generation
// =============================================================================

/**
 * Generate test patterns from i18n mining result
 *
 * @param result - i18n mining result
 * @returns Array of discovered patterns
 */
export function generateI18nPatterns(result: I18nMiningResult): DiscoveredPattern[] {
  const patterns: DiscoveredPattern[] = [];
  const seenPatterns = new Set<string>();

  for (const i18nKey of result.keys) {
    // Generate label from key (convert snake_case/camelCase to Title Case)
    const label = keyToLabel(i18nKey.key);

    // Pattern 1: "verify {label} text"
    const verifyTextPattern = `verify ${label} text`;
    const verifyTextKey = `${verifyTextPattern}:assert`;

    if (!seenPatterns.has(verifyTextKey)) {
      seenPatterns.add(verifyTextKey);
      patterns.push({
        id: `DP-${randomUUID().slice(0, 8)}`,
        normalizedText: verifyTextPattern.toLowerCase(),
        originalText: verifyTextPattern,
        mappedPrimitive: 'assert',
        selectorHints: [
          {
            strategy: 'text',
            value: i18nKey.defaultValue || i18nKey.key,
            confidence: I18N_PATTERN_CONFIDENCE,
          },
        ],
        confidence: I18N_PATTERN_CONFIDENCE,
        layer: 'app-specific',
        category: 'assertion',
        sourceJourneys: [],
        successCount: 0,
        failCount: 0,
        templateSource: 'static',
      });
    }

    // Pattern 2: "verify {label} is visible"
    const verifyVisiblePattern = `verify ${label} is visible`;
    const verifyVisibleKey = `${verifyVisiblePattern}:assert`;

    if (!seenPatterns.has(verifyVisibleKey)) {
      seenPatterns.add(verifyVisibleKey);
      patterns.push({
        id: `DP-${randomUUID().slice(0, 8)}`,
        normalizedText: verifyVisiblePattern.toLowerCase(),
        originalText: verifyVisiblePattern,
        mappedPrimitive: 'assert',
        selectorHints: [
          {
            strategy: 'text',
            value: i18nKey.defaultValue || i18nKey.key,
            confidence: I18N_PATTERN_CONFIDENCE,
          },
        ],
        confidence: I18N_PATTERN_CONFIDENCE,
        layer: 'app-specific',
        category: 'assertion',
        sourceJourneys: [],
        successCount: 0,
        failCount: 0,
        templateSource: 'static',
      });
    }
  }

  return patterns;
}

/**
 * Convert i18n key to human-readable label
 */
function keyToLabel(key: string): string {
  return key
    .replace(/[_-]/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
