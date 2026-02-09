/**
 * LLKB Pattern Generation Module
 *
 * Generates LLKB patterns from app profile and selector signals.
 * This is the core of F12 pattern discovery.
 *
 * @module llkb/pattern-generation
 */

import type { AuthHints, DiscoveredProfile, SelectorSignals } from './discovery.js';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { saveJSONAtomicSync } from './file-utils.js';
import { deduplicatePatterns as deduplicatePatternsQC } from './quality-controls.js';

// =============================================================================
// Constants
// =============================================================================

/** Confidence for auth patterns with known selectors */
const HIGH_CONFIDENCE_AUTH = 0.85;
/** Confidence for auth patterns without known selectors */
const MEDIUM_CONFIDENCE_AUTH = 0.70;
/** Default confidence for framework patterns */
const FRAMEWORK_PATTERN_CONFIDENCE = 0.60;
/** Maximum confidence for UI library patterns */
const MAX_UI_PATTERN_CONFIDENCE = 0.75;
/** Percentage divisor for coverage calculations */
const PERCENTAGE_DIVISOR = 100;

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Hint for locating an element
 */
export interface SelectorHint {
  /** Selector strategy */
  strategy: 'data-testid' | 'data-cy' | 'data-test' | 'role' | 'aria-label' | 'css' | 'xpath' | 'text';
  /** Selector value */
  value: string;
  /** Accessible name (for role-based selectors) */
  name?: string;
  /** Confidence in this selector */
  confidence?: number;
}

/**
 * A pattern discovered during F12 discovery
 */
export interface DiscoveredPattern {
  /** Unique pattern identifier (DP001, DP002, etc.) */
  id: string;
  /** Normalized text for matching */
  normalizedText: string;
  /** Original text before normalization */
  originalText: string;
  /** AutoGen IR primitive this maps to */
  mappedPrimitive: string;
  /** Hints for locating elements */
  selectorHints: SelectorHint[];
  /** Confidence score (0.0 - 1.0) */
  confidence: number;
  /** Pattern layer in the hierarchy */
  layer: 'app-specific' | 'framework' | 'universal';
  /** Pattern category */
  category?: 'auth' | 'navigation' | 'ui-interaction' | 'data' | 'assertion' | 'timing';
  /** Journey IDs where this pattern was discovered */
  sourceJourneys: string[];
  /** Number of successful applications */
  successCount: number;
  /** Number of failed applications */
  failCount: number;
  /** Template that generated this pattern */
  templateSource?: 'crud' | 'form' | 'table' | 'modal' | 'navigation' | 'auth' | 'static';
  /** Entity name if pattern was generated from a template */
  entityName?: string;
}

/**
 * Collection of discovered patterns with metadata
 */
export interface DiscoveredPatternsFile {
  /** Schema version */
  version: string;
  /** When patterns were generated */
  generatedAt: string;
  /** Source identifier */
  source: string;
  /** Array of discovered patterns */
  patterns: DiscoveredPattern[];
  /** Discovery metadata */
  metadata: {
    frameworks: string[];
    uiLibraries: string[];
    totalPatterns: number;
    byCategory: Record<string, number>;
    byTemplate: Record<string, number>;
    averageConfidence: number;
    discoveryDuration?: number;
  };
}

/**
 * Existing learned pattern from LLKB (persistence/merge format).
 *
 * This is the simplified persistence type used for merging discovered patterns
 * with existing learned knowledge. It stores `irPrimitive` as a string type name
 * (e.g., "click", "fill", "navigate").
 *
 * NOTE: This is distinct from AutoGen's `LearnedPattern` in patternExtension.ts,
 * which stores `mappedPrimitive` as a full `IRPrimitive` object for runtime matching.
 * See I-01 in the review for context.
 */
export interface LearnedPattern {
  normalizedText: string;
  originalText: string;
  irPrimitive: string;
  confidence: number;
  successCount: number;
  failCount: number;
  sourceJourneys: string[];
  lastUpdated?: string;
}

/**
 * Type alias for clarity when importing alongside AutoGen's LearnedPattern.
 * Prefer this name in contexts where both types are visible.
 */
export type LearnedPatternEntry = LearnedPattern;

// =============================================================================
// Pattern Templates
// =============================================================================

/**
 * Auth-related pattern templates
 */
export const AUTH_PATTERN_TEMPLATES: Array<{
  text: string;
  primitive: string;
  selectorKey?: string;
}> = [
  { text: 'click login button', primitive: 'click', selectorKey: 'submitButton' },
  { text: 'click sign in button', primitive: 'click', selectorKey: 'submitButton' },
  { text: 'enter username', primitive: 'fill', selectorKey: 'usernameField' },
  { text: 'enter email', primitive: 'fill', selectorKey: 'usernameField' },
  { text: 'enter password', primitive: 'fill', selectorKey: 'passwordField' },
  { text: 'submit login form', primitive: 'click', selectorKey: 'submitButton' },
  { text: 'click logout button', primitive: 'click' },
  { text: 'click sign out button', primitive: 'click' },
  { text: 'verify logged in', primitive: 'assert' },
  { text: 'verify logged out', primitive: 'assert' },
];

/**
 * Navigation-related pattern templates
 */
export const NAVIGATION_PATTERN_TEMPLATES: Array<{
  text: string;
  primitive: string;
}> = [
  { text: 'navigate to {route}', primitive: 'navigate' },
  { text: 'go to {route}', primitive: 'navigate' },
  { text: 'open {route} page', primitive: 'navigate' },
  { text: 'click {item} in navigation', primitive: 'click' },
  { text: 'click {item} in sidebar', primitive: 'click' },
  { text: 'click {item} in menu', primitive: 'click' },
  { text: 'return to home', primitive: 'navigate' },
  { text: 'go back', primitive: 'navigate' },
];

/**
 * UI interaction pattern templates by UI library
 */
export const UI_LIBRARY_PATTERNS: Record<string, Array<{
  text: string;
  primitive: string;
  component?: string;
}>> = {
  mui: [
    { text: 'click MUI button', primitive: 'click', component: 'Button' },
    { text: 'open MUI dialog', primitive: 'click', component: 'Dialog' },
    { text: 'close MUI dialog', primitive: 'click', component: 'Dialog' },
    { text: 'select MUI option', primitive: 'click', component: 'Select' },
    { text: 'fill MUI text field', primitive: 'fill', component: 'TextField' },
    { text: 'open MUI menu', primitive: 'click', component: 'Menu' },
    { text: 'click MUI tab', primitive: 'click', component: 'Tabs' },
    { text: 'toggle MUI switch', primitive: 'click', component: 'Switch' },
    { text: 'check MUI checkbox', primitive: 'check', component: 'Checkbox' },
    { text: 'dismiss MUI snackbar', primitive: 'click', component: 'Snackbar' },
  ],
  antd: [
    { text: 'click Ant button', primitive: 'click', component: 'Button' },
    { text: 'open Ant modal', primitive: 'click', component: 'Modal' },
    { text: 'close Ant modal', primitive: 'click', component: 'Modal' },
    { text: 'select Ant option', primitive: 'click', component: 'Select' },
    { text: 'fill Ant input', primitive: 'fill', component: 'Input' },
    { text: 'click Ant table row', primitive: 'click', component: 'Table' },
    { text: 'sort Ant table column', primitive: 'click', component: 'Table' },
    { text: 'dismiss Ant message', primitive: 'click', component: 'Message' },
  ],
  chakra: [
    { text: 'click Chakra button', primitive: 'click', component: 'Button' },
    { text: 'open Chakra modal', primitive: 'click', component: 'Modal' },
    { text: 'close Chakra modal', primitive: 'click', component: 'Modal' },
    { text: 'fill Chakra input', primitive: 'fill', component: 'Input' },
    { text: 'dismiss Chakra toast', primitive: 'click', component: 'Toast' },
  ],
  'ag-grid': [
    { text: 'click AG Grid row', primitive: 'click', component: 'agGrid' },
    { text: 'select AG Grid row', primitive: 'click', component: 'agGrid' },
    { text: 'sort AG Grid column', primitive: 'click', component: 'agGrid' },
    { text: 'filter AG Grid column', primitive: 'fill', component: 'agGrid' },
    { text: 'expand AG Grid row', primitive: 'click', component: 'agGrid' },
    { text: 'collapse AG Grid row', primitive: 'click', component: 'agGrid' },
    { text: 'edit AG Grid cell', primitive: 'fill', component: 'agGrid' },
    { text: 'clear AG Grid filter', primitive: 'click', component: 'agGrid' },
  ],
};

// =============================================================================
// Pattern Generation Functions
// =============================================================================

/**
 * Generate a unique pattern ID using UUID
 * This ensures uniqueness even across parallel discovery runs
 */
function generatePatternId(): string {
  return `DP-${randomUUID().slice(0, 8)}`;
}

/**
 * @deprecated No longer needed with UUID-based generation
 * Kept for backward compatibility with tests
 */
export function resetPatternIdCounter(): void {
  // No-op: UUID-based IDs don't need reset
}

/**
 * Generate patterns from app profile and selector signals
 *
 * @param profile - App profile from discovery
 * @param signals - Selector signals from analysis
 * @returns Array of discovered patterns
 */
export function generatePatterns(
  profile: DiscoveredProfile,
  signals: SelectorSignals
): DiscoveredPattern[] {
  const patterns: DiscoveredPattern[] = [];

  // Generate auth patterns if auth was detected
  if (profile.auth.detected) {
    patterns.push(...generateAuthPatterns(profile.auth, signals));
  }

  // Generate navigation patterns
  patterns.push(...generateNavigationPatterns(signals));

  // Generate UI library specific patterns
  for (const uiLib of profile.uiLibraries) {
    const libPatterns = UI_LIBRARY_PATTERNS[uiLib.name];
    if (libPatterns) {
      patterns.push(...generateUiLibraryPatterns(uiLib.name, libPatterns, signals, uiLib.confidence));
    }
  }

  return patterns;
}

/**
 * Generate auth-related patterns
 */
function generateAuthPatterns(
  auth: AuthHints,
  signals: SelectorSignals
): DiscoveredPattern[] {
  const patterns: DiscoveredPattern[] = [];

  for (const template of AUTH_PATTERN_TEMPLATES) {
    const selectorHints: SelectorHint[] = [];

    // Add selector hint if we have a matching selector from auth discovery
    const selectorKey = template.selectorKey;
    const selectorValue = selectorKey ? auth.selectors?.[selectorKey] : undefined;
    if (selectorKey && selectorValue) {
      selectorHints.push({
        strategy: signals.primaryAttribute as SelectorHint['strategy'],
        value: selectorValue,
        confidence: HIGH_CONFIDENCE_AUTH,
      });
    }

    patterns.push({
      id: generatePatternId(),
      normalizedText: template.text.toLowerCase(),
      originalText: template.text,
      mappedPrimitive: template.primitive,
      selectorHints,
      confidence: auth.selectors?.[template.selectorKey || ''] ? HIGH_CONFIDENCE_AUTH : MEDIUM_CONFIDENCE_AUTH,
      layer: 'app-specific',
      category: 'auth',
      sourceJourneys: [],
      successCount: 0,
      failCount: 0,
      templateSource: 'auth',
    });
  }

  return patterns;
}

/**
 * Generate navigation-related patterns
 */
function generateNavigationPatterns(
  _signals: SelectorSignals
): DiscoveredPattern[] {
  const patterns: DiscoveredPattern[] = [];

  for (const template of NAVIGATION_PATTERN_TEMPLATES) {
    patterns.push({
      id: generatePatternId(),
      normalizedText: template.text.toLowerCase(),
      originalText: template.text,
      mappedPrimitive: template.primitive,
      selectorHints: [],
      confidence: 0.70,
      layer: 'app-specific',
      category: 'navigation',
      sourceJourneys: [],
      successCount: 0,
      failCount: 0,
      templateSource: 'navigation',
    });
  }

  return patterns;
}

/**
 * Generate UI library specific patterns
 */
function generateUiLibraryPatterns(
  _libraryName: string,
  templates: Array<{ text: string; primitive: string; component?: string }>,
  signals: SelectorSignals,
  libraryConfidence: number
): DiscoveredPattern[] {
  const patterns: DiscoveredPattern[] = [];

  for (const template of templates) {
    const selectorHints: SelectorHint[] = [];

    // Add generic selector hints based on component
    if (template.component) {
      // Try to infer selector from component name
      const componentKebab = template.component
        .replace(/([A-Z])/g, '-$1')
        .toLowerCase()
        .replace(/^-/, '');

      selectorHints.push({
        strategy: signals.primaryAttribute as SelectorHint['strategy'],
        value: componentKebab,
        confidence: FRAMEWORK_PATTERN_CONFIDENCE,
      });
    }

    patterns.push({
      id: generatePatternId(),
      normalizedText: template.text.toLowerCase(),
      originalText: template.text,
      mappedPrimitive: template.primitive,
      selectorHints,
      confidence: Math.min(libraryConfidence, MAX_UI_PATTERN_CONFIDENCE),
      layer: 'framework',
      category: 'ui-interaction',
      sourceJourneys: [],
      successCount: 0,
      failCount: 0,
    });
  }

  return patterns;
}

/**
 * Merge discovered patterns with existing seed/learned patterns
 *
 * IMPORTANT: This is a NON-DESTRUCTIVE merge - existing patterns are NEVER modified.
 * Only new patterns are added. Duplicates are skipped entirely.
 *
 * @param existing - Existing patterns from LLKB (will not be modified)
 * @param discovered - Newly discovered patterns
 * @returns New array with existing patterns plus new discoveries (no mutations)
 */
export function mergeDiscoveredPatterns(
  existing: LearnedPattern[],
  discovered: DiscoveredPattern[]
): LearnedPattern[] {
  // Create lookup map for O(1) duplicate detection (fixes O(n^2) issue)
  const existingTextsMap = new Map<string, boolean>();
  for (const p of existing) {
    existingTextsMap.set(`${p.normalizedText.toLowerCase()}:${p.irPrimitive}`, true);
  }

  // Start with a shallow copy of existing (non-destructive)
  const merged: LearnedPattern[] = [...existing];

  for (const pattern of discovered) {
    const key = `${pattern.normalizedText.toLowerCase()}:${pattern.mappedPrimitive}`;

    if (existingTextsMap.has(key)) {
      // D-02 FIX: Check if discovered pattern has higher confidence than existing.
      // If so, replace the existing entry (non-destructive to other patterns).
      const existingIdx = merged.findIndex(
        p => `${p.normalizedText.toLowerCase()}:${p.irPrimitive}` === key
      );
      if (existingIdx >= 0 && pattern.confidence > merged[existingIdx]!.confidence) {
        merged[existingIdx] = {
          normalizedText: pattern.normalizedText,
          originalText: pattern.originalText,
          irPrimitive: pattern.mappedPrimitive,
          confidence: pattern.confidence,
          successCount: pattern.successCount,
          failCount: pattern.failCount,
          sourceJourneys: pattern.sourceJourneys,
          lastUpdated: new Date().toISOString(),
        };
      }
      continue;
    }

    // Add new pattern
    merged.push({
      normalizedText: pattern.normalizedText,
      originalText: pattern.originalText,
      irPrimitive: pattern.mappedPrimitive,
      confidence: pattern.confidence,
      successCount: pattern.successCount,
      failCount: pattern.failCount,
      sourceJourneys: pattern.sourceJourneys,
      lastUpdated: new Date().toISOString(),
    });

    existingTextsMap.set(key, true);
  }

  return merged;
}

/**
 * Create a DiscoveredPatternsFile from patterns and profile
 *
 * @param patterns - Array of discovered patterns
 * @param profile - App profile
 * @param durationMs - Discovery duration in milliseconds
 * @returns Complete discovered patterns file
 */
export function createDiscoveredPatternsFile(
  patterns: DiscoveredPattern[],
  profile: DiscoveredProfile,
  durationMs?: number
): DiscoveredPatternsFile {
  // Calculate category counts
  const byCategory: Record<string, number> = {};
  const byTemplate: Record<string, number> = {};

  for (const pattern of patterns) {
    if (pattern.category) {
      byCategory[pattern.category] = (byCategory[pattern.category] || 0) + 1;
    }
    if (pattern.templateSource) {
      byTemplate[pattern.templateSource] = (byTemplate[pattern.templateSource] || 0) + 1;
    }
  }

  // Calculate average confidence
  const avgConfidence = patterns.length > 0
    ? patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length
    : 0;

  return {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    source: 'discover-foundation:F12',
    patterns,
    metadata: {
      frameworks: profile.frameworks.map(f => f.name),
      uiLibraries: profile.uiLibraries.map(l => l.name),
      totalPatterns: patterns.length,
      byCategory,
      byTemplate,
      averageConfidence: Math.round(avgConfidence * PERCENTAGE_DIVISOR) / PERCENTAGE_DIVISOR,
      discoveryDuration: durationMs,
    },
  };
}

/**
 * Deduplicate patterns by normalized text + primitive.
 * Delegates to the richer implementation in quality-controls.ts
 * which uses :: separator (safe with CSS selectors), merges selector hints,
 * and sums success/fail counts.
 *
 * @param patterns - Array of patterns (potentially with duplicates)
 * @returns Deduplicated array (higher confidence patterns preferred)
 */
export function deduplicatePatterns(patterns: DiscoveredPattern[]): DiscoveredPattern[] {
  return deduplicatePatternsQC(patterns);
}

/**
 * Save discovered patterns to disk
 *
 * @param patternsFile - The discovered patterns file to save
 * @param outputDir - Directory to save to (usually .artk/llkb/)
 */
export function saveDiscoveredPatterns(
  patternsFile: DiscoveredPatternsFile,
  outputDir: string
): void {
  const outputPath = path.join(outputDir, 'discovered-patterns.json');
  fs.mkdirSync(outputDir, { recursive: true });
  saveJSONAtomicSync(outputPath, patternsFile);
}

/**
 * Load discovered patterns from disk
 *
 * @param llkbDir - LLKB directory (usually .artk/llkb/)
 * @returns Discovered patterns file or null if not found
 */
export function loadDiscoveredPatterns(llkbDir: string): DiscoveredPatternsFile | null {
  const patternsPath = path.join(llkbDir, 'discovered-patterns.json');
  if (!fs.existsSync(patternsPath)) {
    return null;
  }
  try {
    const content = fs.readFileSync(patternsPath, 'utf-8');
    const data: unknown = JSON.parse(content);

    // SEC-F03: Runtime shape validation after JSON.parse
    if (
      typeof data !== 'object' || data === null ||
      !('patterns' in data) || !Array.isArray(data.patterns) ||
      !('version' in data) || typeof data.version !== 'string'
    ) {
      console.warn(`[LLKB] Invalid discovered patterns shape in ${patternsPath}`);
      return null;
    }

    return data as DiscoveredPatternsFile;
  } catch (err) {
    console.warn(`[LLKB] Failed to load discovered patterns from ${patternsPath}: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}
