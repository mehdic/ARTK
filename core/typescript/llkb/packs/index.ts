/**
 * LLKB Framework Packs Registry
 *
 * Central registry for framework-specific pattern packs with lazy loading.
 *
 * @module llkb/packs
 */

import type { DiscoveredPattern, FrameworkPack, PackPattern, PackRegistryEntry } from './types.js';
import { getReactPack } from './react.js';
import { getAngularPack } from './angular.js';
import { getMuiPack } from './mui.js';
import { getAntdPack } from './antd.js';
import { getChakraPack } from './chakra.js';
import { randomUUID } from 'crypto';

/**
 * Default confidence for pack patterns (if not specified)
 */
const DEFAULT_PACK_CONFIDENCE = 0.65;

/**
 * Pack registry with lazy loading
 * Each entry maps framework signals to their pack loaders
 */
const PACK_REGISTRY: PackRegistryEntry[] = [
  {
    name: 'react',
    frameworks: ['react', 'nextjs'],
    loader: getReactPack,
  },
  {
    name: 'angular',
    frameworks: ['angular'],
    loader: getAngularPack,
  },
  {
    name: 'mui',
    frameworks: ['mui'],
    loader: getMuiPack,
  },
  {
    name: 'antd',
    frameworks: ['antd'],
    loader: getAntdPack,
  },
  {
    name: 'chakra',
    frameworks: ['chakra'],
    loader: getChakraPack,
  },
];

/**
 * Get the pack registry
 *
 * @returns Array of pack registry entries
 */
export function getPackRegistry(): PackRegistryEntry[] {
  return PACK_REGISTRY;
}

/**
 * Load packs for given framework signals
 *
 * @param frameworks - Array of framework names detected in the app
 * @returns Array of loaded framework packs
 */
export function loadPacksForFrameworks(frameworks: string[]): FrameworkPack[] {
  const packs: FrameworkPack[] = [];
  const loadedPackNames = new Set<string>();

  // Normalize framework names to lowercase for matching
  const normalizedFrameworks = frameworks.map(f => f.toLowerCase());

  for (const entry of PACK_REGISTRY) {
    // Check if any of the entry's frameworks match the detected frameworks
    const shouldLoad = entry.frameworks.some(f =>
      normalizedFrameworks.includes(f.toLowerCase())
    );

    if (shouldLoad && !loadedPackNames.has(entry.name)) {
      const pack = entry.loader();
      packs.push(pack);
      loadedPackNames.add(entry.name);
    }
  }

  return packs;
}

/**
 * Convert a PackPattern to a DiscoveredPattern
 *
 * @param packPattern - The pack pattern to convert
 * @param packName - Name of the pack this pattern came from
 * @returns Discovered pattern ready for LLKB integration
 */
function packPatternToDiscovered(
  packPattern: PackPattern,
  packName: string
): DiscoveredPattern {
  return {
    id: `DP-${randomUUID().slice(0, 8)}`,
    normalizedText: packPattern.text.toLowerCase(),
    originalText: packPattern.text,
    mappedPrimitive: packPattern.primitive,
    selectorHints: packPattern.selectorHints || [],
    confidence: packPattern.confidence || DEFAULT_PACK_CONFIDENCE,
    layer: 'framework',
    category: packPattern.category,
    sourceJourneys: [],
    successCount: 0,
    failCount: 0,
    templateSource: 'static',
    entityName: packName,
  };
}

/**
 * Convert all patterns in a pack to DiscoveredPattern format
 *
 * @param pack - The framework pack to convert
 * @returns Array of discovered patterns
 */
export function packPatternsToDiscovered(pack: FrameworkPack): DiscoveredPattern[] {
  return pack.patterns.map(pattern => packPatternToDiscovered(pattern, pack.name));
}

/**
 * Load and convert all packs for given frameworks
 *
 * This is a convenience function that loads packs and converts them to
 * DiscoveredPattern format in one step.
 *
 * @param frameworks - Array of framework names detected in the app
 * @returns Array of discovered patterns from all applicable packs
 */
export function loadDiscoveredPatternsForFrameworks(frameworks: string[]): DiscoveredPattern[] {
  const packs = loadPacksForFrameworks(frameworks);
  const patterns: DiscoveredPattern[] = [];

  for (const pack of packs) {
    patterns.push(...packPatternsToDiscovered(pack));
  }

  return patterns;
}

/**
 * Re-export types for convenience
 */
export type {
  PackPattern,
  FrameworkPack,
  PackRegistryEntry,
  DiscoveredPattern,
  SelectorHint,
} from './types.js';
