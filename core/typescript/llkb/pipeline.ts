/**
 * LLKB Full Discovery Pipeline Orchestrator
 *
 * Wires together all discovery phases into a single callable function:
 * 1. runDiscovery() - Framework/auth/selector detection
 * 2. mineElements() - Entity/route/form/table/modal extraction
 * 3. loadDiscoveredPatternsForFrameworks() - Framework pack patterns
 * 4. Mining modules - i18n, analytics, feature flag patterns
 * 5. Quality controls - Deduplication, confidence threshold, boosting
 * 6. Persistence - Save to discovered-patterns.json and discovered-profile.json
 *
 * This module addresses CRITICAL review finding: "No Pipeline Orchestrator".
 *
 * @module llkb/pipeline
 */

import { type DiscoveredProfile, type DiscoveryResult, runDiscovery, saveDiscoveredProfile } from './discovery.js';
import { mineElements, type MiningResult } from './mining.js';
import { generateAllPatterns } from './template-generators.js';
import {
  createDiscoveredPatternsFile,
  type DiscoveredPattern,
  type DiscoveredPatternsFile,
  generatePatterns,
  saveDiscoveredPatterns,
} from './pattern-generation.js';
import { loadDiscoveredPatternsForFrameworks } from './packs/index.js';
import { generateI18nPatterns, mineI18nKeys } from './mining/i18n-mining.js';
import { generateAnalyticsPatterns, mineAnalyticsEvents } from './mining/analytics-mining.js';
import { generateFeatureFlagPatterns, mineFeatureFlags } from './mining/feature-flag-mining.js';
import { applyAllQualityControls, applySignalWeighting, type QualityControlResult } from './quality-controls.js';
import { MiningCache } from './mining-cache.js';

// =============================================================================
// Constants
// =============================================================================

/** Spec AC3: confidence threshold for F12 export */
const SPEC_CONFIDENCE_THRESHOLD = 0.7;

/** Maximum patterns to retain after all generation (safety cap) */
const MAX_PIPELINE_PATTERNS = 2000;

/** Spec target: minimum patterns expected for a typical project */
const SPEC_PATTERN_TARGET = 360;

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Options for the full discovery pipeline
 */
export interface PipelineOptions {
  /** Confidence threshold for quality controls (default: 0.7 per spec AC3) */
  confidenceThreshold?: number;
  /** Maximum scan depth for file discovery */
  maxDepth?: number;
  /** Maximum files to scan */
  maxFiles?: number;
  /** Maximum patterns to generate (safety cap, default: 2000) */
  maxPatterns?: number;
  /** Skip framework pack loading */
  skipPacks?: boolean;
  /** Skip mining modules (i18n, analytics, feature flags) */
  skipMiningModules?: boolean;
  /** Output directory for persistence (default: llkbDir) */
  outputDir?: string;
  /**
   * Optional shared MiningCache instance for file content caching.
   * When provided, mining modules will reuse this cache.
   * NOTE (P-02): Discovery phase currently uses its own file scanning and does not
   * share a cache with mining. A future optimization could integrate discovery's
   * scanDirectoryForSelectors/scanForAuthPatterns with MiningCache.
   */
  cache?: MiningCache;
}

/**
 * Result of the full discovery pipeline
 */
export interface PipelineResult {
  /** Whether the pipeline succeeded */
  success: boolean;
  /** Generated app profile */
  profile: DiscoveredProfile | null;
  /** Final patterns file (after QC) */
  patternsFile: DiscoveredPatternsFile | null;
  /** Pipeline statistics */
  stats: PipelineStats;
  /** Warnings from the pipeline */
  warnings: string[];
  /** Errors from the pipeline */
  errors: string[];
}

/**
 * Detailed pipeline statistics
 */
export interface PipelineStats {
  /** Total pipeline duration in ms */
  durationMs: number;
  /** Patterns from each source */
  patternSources: {
    discovery: number;
    templates: number;
    frameworkPacks: number;
    i18n: number;
    analytics: number;
    featureFlags: number;
  };
  /** Total patterns before QC */
  totalBeforeQC: number;
  /** Total patterns after QC */
  totalAfterQC: number;
  /** Quality control metrics */
  qualityControls: QualityControlResult | null;
  /** Mining statistics */
  mining: {
    entitiesFound: number;
    routesFound: number;
    formsFound: number;
    tablesFound: number;
    modalsFound: number;
    filesScanned: number;
  } | null;
}

// =============================================================================
// Pipeline Orchestrator
// =============================================================================

/**
 * Run the full LLKB discovery pipeline.
 *
 * This is the main entry point that orchestrates all discovery phases:
 * 1. Framework/auth/selector detection via runDiscovery()
 * 2. Zero-config element mining via mineElements()
 * 3. Template-based pattern generation from mined elements
 * 4. Framework pack patterns (React, Angular, MUI, etc.)
 * 5. Mining module patterns (i18n, analytics, feature flags)
 * 6. Quality controls (dedup, threshold, cross-source boost)
 * 7. Persistence to discovered-patterns.json and discovered-profile.json
 *
 * @param projectRoot - Path to the project root directory
 * @param llkbDir - Path to the LLKB directory (e.g., .artk/llkb/)
 * @param options - Pipeline options
 * @returns Pipeline result with profile, patterns, and statistics
 */
export async function runFullDiscoveryPipeline(
  projectRoot: string,
  llkbDir: string,
  options: PipelineOptions = {}
): Promise<PipelineResult> {
  const startTime = Date.now();
  const warnings: string[] = [];
  const errors: string[] = [];

  const threshold = options.confidenceThreshold ?? SPEC_CONFIDENCE_THRESHOLD;
  const maxPatterns = options.maxPatterns ?? MAX_PIPELINE_PATTERNS;

  // Collect all patterns from all sources
  const allPatterns: DiscoveredPattern[] = [];
  const patternSources = {
    discovery: 0,
    templates: 0,
    frameworkPacks: 0,
    i18n: 0,
    analytics: 0,
    featureFlags: 0,
  };

  // Signal weighting: track pattern IDs by source strength (spec section 3.5)
  const strongIds: string[] = []; // routes, schemas, discovery
  const mediumIds: string[] = []; // i18n, framework packs
  const weakIds: string[] = [];   // analytics, feature flags

  let profile: DiscoveredProfile | null = null;
  let miningStats: PipelineStats['mining'] = null;

  // =========================================================================
  // Phase 1: Discovery (framework/auth/selector detection)
  // =========================================================================

  let discoveryResult: DiscoveryResult;
  try {
    discoveryResult = await runDiscovery(projectRoot);
    profile = discoveryResult.profile;
    warnings.push(...discoveryResult.warnings);

    if (!discoveryResult.success) {
      errors.push(...discoveryResult.errors);
    }
  } catch (e) {
    errors.push(`Discovery failed: ${String(e)}`);
    discoveryResult = { success: false, profile: null, errors: [], warnings: [] };
  }

  // =========================================================================
  // Phase 2: Generate discovery-based patterns (from profile + signals)
  // =========================================================================

  if (profile) {
    try {
      const discoveryPatterns = generatePatterns(profile, profile.selectorSignals);
      allPatterns.push(...discoveryPatterns);
      patternSources.discovery = discoveryPatterns.length;
      strongIds.push(...discoveryPatterns.map(p => p.id));
    } catch (e) {
      warnings.push(`Discovery pattern generation failed: ${String(e)}`);
    }
  }

  // =========================================================================
  // Phase 3: Mine elements and generate template patterns
  // =========================================================================

  try {
    const miningResult: MiningResult = await mineElements(projectRoot, {
      maxDepth: options.maxDepth,
      maxFiles: options.maxFiles,
    });

    miningStats = {
      entitiesFound: miningResult.stats.entitiesFound,
      routesFound: miningResult.stats.routesFound,
      formsFound: miningResult.stats.formsFound,
      tablesFound: miningResult.stats.tablesFound,
      modalsFound: miningResult.stats.modalsFound,
      filesScanned: miningResult.stats.filesScanned,
    };

    // Generate template patterns from mined elements
    const templateResult = generateAllPatterns(miningResult.elements);
    allPatterns.push(...templateResult.patterns);
    patternSources.templates = templateResult.patterns.length;
    // Templates are heuristic (regex-mined) — classify as medium, not strong
    mediumIds.push(...templateResult.patterns.map(p => p.id));
  } catch (e) {
    warnings.push(`Mining/template generation failed: ${String(e)}`);
  }

  // =========================================================================
  // Phase 4: Load framework pack patterns
  // =========================================================================

  if (!options.skipPacks && profile) {
    try {
      // Collect all detected framework and UI library names
      const frameworkNames = [
        ...profile.frameworks.map(f => f.name),
        ...profile.uiLibraries.map(l => l.name),
      ];

      if (frameworkNames.length > 0) {
        const packPatterns = loadDiscoveredPatternsForFrameworks(frameworkNames);
        allPatterns.push(...packPatterns);
        patternSources.frameworkPacks = packPatterns.length;
        mediumIds.push(...packPatterns.map(p => p.id));
      }
    } catch (e) {
      warnings.push(`Framework pack loading failed: ${String(e)}`);
    }
  }

  // =========================================================================
  // Phase 5: Mining module patterns (i18n, analytics, feature flags)
  // =========================================================================

  if (!options.skipMiningModules) {
    // Share a single mining cache across all mining modules for efficiency
    // P-02: Accept external cache if provided, otherwise create a new one
    const cache = options.cache ?? new MiningCache();
    const ownsCache = !options.cache;

    try {
      // i18n patterns
      try {
        const i18nResult = await mineI18nKeys(projectRoot, cache);
        if (i18nResult.keys.length > 0) {
          const i18nPatterns = generateI18nPatterns(i18nResult);
          allPatterns.push(...i18nPatterns);
          patternSources.i18n = i18nPatterns.length;
          mediumIds.push(...i18nPatterns.map(p => p.id));
        }
      } catch (e) {
        warnings.push(`i18n mining failed: ${String(e)}`);
      }

      // Analytics patterns
      try {
        const analyticsResult = await mineAnalyticsEvents(projectRoot, cache);
        if (analyticsResult.events.length > 0) {
          const analyticsPatterns = generateAnalyticsPatterns(analyticsResult);
          allPatterns.push(...analyticsPatterns);
          patternSources.analytics = analyticsPatterns.length;
          weakIds.push(...analyticsPatterns.map(p => p.id));
        }
      } catch (e) {
        warnings.push(`Analytics mining failed: ${String(e)}`);
      }

      // Feature flag patterns
      try {
        const ffResult = await mineFeatureFlags(projectRoot, cache);
        if (ffResult.flags.length > 0) {
          const ffPatterns = generateFeatureFlagPatterns(ffResult);
          allPatterns.push(...ffPatterns);
          patternSources.featureFlags = ffPatterns.length;
          weakIds.push(...ffPatterns.map(p => p.id));
        }
      } catch (e) {
        warnings.push(`Feature flag mining failed: ${String(e)}`);
      }
    } finally {
      // Only clear if we created the cache (don't clear caller's cache)
      if (ownsCache) {
        cache.clear();
      }
    }
  }

  // =========================================================================
  // Phase 6: Signal weighting + quality controls (spec section 3.5)
  // =========================================================================

  // Apply signal weighting: assign base confidence from source strength
  const signalStrengths = new Map<string, 'strong' | 'medium' | 'weak'>();
  for (const id of strongIds) {signalStrengths.set(id, 'strong');}
  for (const id of mediumIds) {signalStrengths.set(id, 'medium');}
  for (const id of weakIds) {signalStrengths.set(id, 'weak');}

  const weightedPatterns = signalStrengths.size > 0
    ? applySignalWeighting(allPatterns, signalStrengths)
    : allPatterns;

  const totalBeforeQC = weightedPatterns.length;
  let finalPatterns: DiscoveredPattern[];
  let qcResult: QualityControlResult | null = null;

  try {
    const { patterns: validated, result } = applyAllQualityControls(weightedPatterns, {
      threshold,
    });

    finalPatterns = validated;
    qcResult = result;
  } catch (e) {
    warnings.push(`Quality controls failed, using unvalidated patterns: ${String(e)}`);
    finalPatterns = weightedPatterns;
  }

  // F-05: Warn if pattern count is below spec target
  if (finalPatterns.length < SPEC_PATTERN_TARGET) {
    warnings.push(
      `Pattern count (${finalPatterns.length}) is below spec target (${SPEC_PATTERN_TARGET}). ` +
      `Consider adding framework packs or mining modules to increase coverage.`
    );
  }

  // F-04: Note that runtime validation of generated patterns is not yet implemented
  warnings.push(
    'Runtime validation of generated patterns against a live app is not yet implemented. ' +
    'Patterns are validated structurally only.'
  );

  // Apply safety cap
  if (finalPatterns.length > maxPatterns) {
    // Sort by confidence descending, keep top N
    finalPatterns.sort((a, b) => b.confidence - a.confidence);
    finalPatterns = finalPatterns.slice(0, maxPatterns);
    warnings.push(
      `Pattern count (${totalBeforeQC}) exceeded cap (${maxPatterns}), truncated to top ${maxPatterns} by confidence`
    );
  }

  // =========================================================================
  // Phase 7: Persistence
  // =========================================================================

  const outputDir = options.outputDir ?? llkbDir;
  let patternsFile: DiscoveredPatternsFile | null = null;

  if (profile) {
    try {
      const durationMs = Date.now() - startTime;
      patternsFile = createDiscoveredPatternsFile(finalPatterns, profile, durationMs);
      saveDiscoveredPatterns(patternsFile, outputDir);
      saveDiscoveredProfile(profile, outputDir);
    } catch (e) {
      errors.push(`Persistence failed: ${String(e)}`);
    }
  }

  // =========================================================================
  // Build result
  // =========================================================================

  const durationMs = Date.now() - startTime;

  return {
    success: errors.length === 0,
    profile,
    patternsFile,
    stats: {
      durationMs,
      patternSources,
      totalBeforeQC,
      totalAfterQC: finalPatterns.length,
      qualityControls: qcResult,
      mining: miningStats,
    },
    warnings,
    errors,
  };
}
