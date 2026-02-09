/**
 * LLKB Feature Flag Mining Module
 *
 * Extracts feature flag configurations from source code to generate
 * test patterns for feature toggle scenarios.
 *
 * Supports:
 * - LaunchDarkly
 * - Split.io
 * - Flagsmith
 * - Unleash
 * - Custom feature flag implementations
 * - Environment variable flags (FEATURE_*)
 *
 * @module llkb/mining/feature-flag-mining
 */

import { type MiningCache, scanAllSourceDirectories, type ScannedFile } from '../mining-cache.js';
import type { DiscoveredPattern } from '../pattern-generation.js';
import { randomUUID } from 'crypto';
import * as path from 'path';

// =============================================================================
// Constants
// =============================================================================

/** Maximum regex iterations to prevent ReDoS */
const MAX_REGEX_ITERATIONS = 10_000;

/** Default confidence for feature flag patterns */
const FEATURE_FLAG_PATTERN_CONFIDENCE = 0.70;

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * A feature flag discovered in source code
 */
export interface FeatureFlag {
  /** Flag name */
  name: string;
  /** Feature flag provider */
  provider: string;
  /** Optional default value */
  defaultValue?: boolean;
  /** Source file where flag was found */
  source: string;
}

/**
 * Result of feature flag mining operation
 */
export interface FeatureFlagMiningResult {
  /** Detected feature flag provider */
  provider: 'launchdarkly' | 'split' | 'flagsmith' | 'unleash' | 'custom' | 'unknown';
  /** Discovered feature flags */
  flags: FeatureFlag[];
}

// =============================================================================
// Detection Patterns
// =============================================================================

/**
 * Patterns to detect feature flag provider usage
 */
const FEATURE_FLAG_PROVIDER_PATTERNS = {
  launchdarkly: /useFlags\s*\(|ldClient\.variation\(|useLDClient\(|import.*launchdarkly|from\s+['"]launchdarkly['"]/g,
  split: /splitClient\.getTreatment\(|import.*@splitsoftware|from\s+['"]@splitsoftware['"]/g,
  flagsmith: /flagsmith\.hasFeature\(|flagsmith\.getValue\(|import.*flagsmith|from\s+['"]flagsmith['"]/g,
  unleash: /useFlag\s*\(|unleash\.isEnabled\(|import.*unleash-proxy|from\s+['"]unleash-proxy['"]/g,
};

/**
 * Patterns to extract feature flag references
 */
const FEATURE_FLAG_PATTERNS = {
  // LaunchDarkly: useFlags(), ldClient.variation('flagName', defaultValue)
  launchDarklyVariation: /ldClient\?\.variation\s*\(\s*['"]([^'"]+)['"]\s*(?:,\s*(true|false))?\)/g,
  launchDarklyUseFlags: /flags\[['"]([^'"]+)['"]\]/g,

  // Split.io: splitClient.getTreatment('flagName')
  split: /getTreatment\s*\(\s*['"]([^'"]+)['"]/g,

  // Flagsmith: flagsmith.hasFeature('flagName'), flagsmith.getValue('flagName')
  flagsmith: /(?:hasFeature|getValue)\s*\(\s*['"]([^'"]+)['"]/g,

  // Unleash: useFlag('flagName'), unleash.isEnabled('flagName')
  unleash: /(?:useFlag|isEnabled)\s*\(\s*['"]([^'"]+)['"]/g,

  // Custom: featureFlags.isEnabled('flagName'), isFeatureEnabled('flagName')
  custom: /(?:featureFlags|features)\.(?:isEnabled|enabled|has)\s*\(\s*['"]([^'"]+)['"]/g,
  customFunction: /isFeatureEnabled\s*\(\s*['"]([^'"]+)['"]/g,

  // Environment variables: process.env.FEATURE_FLAG_NAME, import.meta.env.FEATURE_FLAG_NAME
  envVar: /(?:process\.env|import\.meta\.env)\.FEATURE_(\w+)/g,
};

// =============================================================================
// Mining Functions
// =============================================================================

/**
 * Mine feature flags from a project
 *
 * @param projectRoot - Project root directory
 * @param cache - Optional mining cache
 * @returns Feature flag mining result
 */
export async function mineFeatureFlags(
  projectRoot: string,
  cache?: MiningCache
): Promise<FeatureFlagMiningResult> {
  const resolvedRoot = path.resolve(projectRoot);

  // Create cache if not provided
  const miningCache = cache ?? new (await import('../mining-cache.js')).MiningCache();
  const shouldCleanup = !cache;

  try {
    // Scan all source files
    const files = await scanAllSourceDirectories(resolvedRoot, miningCache);

    // Detect which feature flag provider is being used
    const provider = detectFeatureFlagProvider(files);

    // Extract flags based on detected provider
    const flags = extractFeatureFlags(files, provider);

    return {
      provider,
      flags,
    };
  } finally {
    // Clean up cache if we created it
    if (shouldCleanup) {
      miningCache.clear();
    }
  }
}

/**
 * Detect which feature flag provider is being used
 */
function detectFeatureFlagProvider(
  files: ScannedFile[]
): 'launchdarkly' | 'split' | 'flagsmith' | 'unleash' | 'custom' | 'unknown' {
  const detectionScores: Record<string, number> = {
    launchdarkly: 0,
    split: 0,
    flagsmith: 0,
    unleash: 0,
    custom: 0,
  };

  for (const file of files) {
    for (const [provider, pattern] of Object.entries(FEATURE_FLAG_PROVIDER_PATTERNS)) {
      pattern.lastIndex = 0;
      if (pattern.test(file.content)) {
        detectionScores[provider]!++;
      }
    }

    // Check for custom feature flag patterns
    const customPattern = /(?:featureFlags|isFeatureEnabled)\s*[.(]/g;
    customPattern.lastIndex = 0;
    if (customPattern.test(file.content)) {
      detectionScores.custom!++;
    }
  }

  // Return provider with highest score
  let maxScore = 0;
  let detectedProvider: FeatureFlagMiningResult['provider'] = 'unknown';

  for (const [provider, score] of Object.entries(detectionScores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedProvider = provider as FeatureFlagMiningResult['provider'];
    }
  }

  return detectedProvider;
}

/**
 * Extract feature flags from source files
 */
function extractFeatureFlags(
  files: ScannedFile[],
  provider: FeatureFlagMiningResult['provider']
): FeatureFlag[] {
  const flags: FeatureFlag[] = [];
  const seenFlags = new Set<string>();

  for (const file of files) {
    // Try all patterns (provider detection is a hint, not strict)
    for (const [patternName, pattern] of Object.entries(FEATURE_FLAG_PATTERNS)) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      let iterations = 0;

      while ((match = pattern.exec(file.content)) !== null) {
        if (++iterations > MAX_REGEX_ITERATIONS) {break;}

        const flagName = match[1];
        if (!flagName) {continue;}

        // Skip if already seen
        const flagId = `${flagName}:${file.path}`;
        if (seenFlags.has(flagId)) {continue;}
        seenFlags.add(flagId);

        // Extract default value if present (LaunchDarkly pattern)
        let defaultValue: boolean | undefined;
        if (match[2] !== undefined && patternName === 'launchDarklyVariation') {
          defaultValue = match[2] === 'true';
        }

        // Determine provider from pattern name
        let flagProvider = provider;
        if (patternName.includes('launchDarkly')) {
          flagProvider = 'launchdarkly';
        } else if (patternName.includes('split')) {
          flagProvider = 'split';
        } else if (patternName.includes('flagsmith')) {
          flagProvider = 'flagsmith';
        } else if (patternName.includes('unleash')) {
          flagProvider = 'unleash';
        } else {
          flagProvider = 'custom';
        }

        flags.push({
          name: flagName,
          provider: flagProvider,
          defaultValue,
          source: file.path,
        });
      }
    }
  }

  return flags;
}

// =============================================================================
// Pattern Generation
// =============================================================================

/**
 * Generate test patterns from feature flag mining result
 *
 * @param result - Feature flag mining result
 * @returns Array of discovered patterns
 */
export function generateFeatureFlagPatterns(result: FeatureFlagMiningResult): DiscoveredPattern[] {
  const patterns: DiscoveredPattern[] = [];
  const seenPatterns = new Set<string>();

  for (const flag of result.flags) {
    // Generate label from flag name
    const label = flagNameToLabel(flag.name);

    // Pattern 1: "ensure {feature} visible"
    const ensureVisiblePattern = `ensure ${label} visible`;
    const ensureVisibleKey = `${ensureVisiblePattern}:assert`;

    if (!seenPatterns.has(ensureVisibleKey)) {
      seenPatterns.add(ensureVisibleKey);
      patterns.push({
        id: `DP-${randomUUID().slice(0, 8)}`,
        normalizedText: ensureVisiblePattern.toLowerCase(),
        originalText: ensureVisiblePattern,
        mappedPrimitive: 'assert',
        selectorHints: [],
        confidence: FEATURE_FLAG_PATTERN_CONFIDENCE,
        layer: 'app-specific',
        category: 'assertion',
        sourceJourneys: [],
        successCount: 0,
        failCount: 0,
        templateSource: 'static',
      });
    }

    // Pattern 2: "verify {feature} enabled"
    const verifyEnabledPattern = `verify ${label} enabled`;
    const verifyEnabledKey = `${verifyEnabledPattern}:assert`;

    if (!seenPatterns.has(verifyEnabledKey)) {
      seenPatterns.add(verifyEnabledKey);
      patterns.push({
        id: `DP-${randomUUID().slice(0, 8)}`,
        normalizedText: verifyEnabledPattern.toLowerCase(),
        originalText: verifyEnabledPattern,
        mappedPrimitive: 'assert',
        selectorHints: [],
        confidence: FEATURE_FLAG_PATTERN_CONFIDENCE,
        layer: 'app-specific',
        category: 'assertion',
        sourceJourneys: [],
        successCount: 0,
        failCount: 0,
        templateSource: 'static',
      });
    }

    // Pattern 3: "test with {feature} disabled"
    const testDisabledPattern = `test with ${label} disabled`;
    const testDisabledKey = `${testDisabledPattern}:navigate`;

    if (!seenPatterns.has(testDisabledKey)) {
      seenPatterns.add(testDisabledKey);
      patterns.push({
        id: `DP-${randomUUID().slice(0, 8)}`,
        normalizedText: testDisabledPattern.toLowerCase(),
        originalText: testDisabledPattern,
        mappedPrimitive: 'navigate',
        selectorHints: [],
        confidence: FEATURE_FLAG_PATTERN_CONFIDENCE,
        layer: 'app-specific',
        category: 'navigation',
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
 * Convert flag name to human-readable label
 */
function flagNameToLabel(flagName: string): string {
  return flagName
    .replace(/[_-]/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
