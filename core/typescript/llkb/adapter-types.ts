/**
 * LLKB Adapter Type Definitions
 *
 * This module defines all TypeScript interfaces for the LLKB-to-AutoGen
 * adapter system, enabling LLKB knowledge export for AutoGen consumption.
 *
 * @module llkb/adapter-types
 */

import type { LLKBCategory, LLKBScope } from './types.js';

// =============================================================================
// Configuration Types
// =============================================================================

/**
 * Configuration for the LLKB adapter export
 */
export interface LLKBAdapterConfig {
  /** Path to LLKB root directory (default: .artk/llkb) */
  llkbRoot?: string;

  /** Output directory for generated files */
  outputDir: string;

  /** Minimum confidence threshold (default: 0.7) */
  minConfidence?: number;

  /** Categories to include (default: all) */
  includeCategories?: LLKBCategory[];

  /** Scopes to include (default: all) */
  includeScopes?: LLKBScope[];

  /** Whether to generate glossary file (default: true) */
  generateGlossary?: boolean;

  /** Whether to generate config file (default: true) */
  generateConfig?: boolean;

  /** Output format for config (default: yaml) */
  configFormat?: 'yaml' | 'json';
}

// =============================================================================
// Result Types
// =============================================================================

/**
 * Statistics about what was exported
 */
export interface ExportStats {
  /** Number of patterns exported from lessons */
  patternsExported: number;

  /** Number of selector overrides exported */
  selectorsExported: number;

  /** Number of timing hints exported */
  timingHintsExported: number;

  /** Number of module mappings exported */
  modulesExported: number;

  /** Number of glossary entries generated */
  glossaryEntriesExported: number;

  /** Number of lessons skipped due to low confidence */
  lessonsSkipped: number;

  /** Number of components skipped due to low confidence */
  componentsSkipped: number;
}

/**
 * Result of the LLKB adapter export operation
 */
export interface LLKBAdapterResult {
  /** Path to generated config file (null if not generated) */
  configPath: string | null;

  /** Path to generated glossary file (null if not generated) */
  glossaryPath: string | null;

  /** Statistics about what was exported */
  stats: ExportStats;

  /** Warnings encountered during export */
  warnings: string[];

  /** Export timestamp (ISO 8601) */
  exportedAt: string;
}

// =============================================================================
// Export Data Types (AutoGen-Compatible)
// =============================================================================

/**
 * Source reference for an exported pattern
 */
export interface PatternSource {
  /** Original lesson ID */
  lessonId: string;

  /** Confidence score (0.0 - 1.0) */
  confidence: number;

  /** Number of times the pattern was observed */
  occurrences: number;
}

/**
 * An additional pattern generated from LLKB lesson
 */
export interface AdditionalPattern {
  /** Pattern name (e.g., "llkb-L042-ag-grid-edit") */
  name: string;

  /** Regex pattern for matching step text */
  regex: string;

  /** IR primitive type */
  primitiveType: 'callModule' | 'click' | 'fill' | 'navigate' | 'wait' | 'assert';

  /** Module name (if primitiveType is callModule) */
  module?: string;

  /** Method name (if primitiveType is callModule) */
  method?: string;

  /** Argument mapping from regex groups */
  argMapping?: string[];

  /** Source information */
  source: PatternSource;
}

/**
 * Selector override from LLKB lesson
 */
export interface SelectorOverride {
  /** Pattern to match (e.g., "Save button") */
  pattern: string;

  /** Override selector configuration */
  override: {
    /** Selector strategy */
    strategy: 'testid' | 'role' | 'label' | 'css' | 'xpath';

    /** Selector value */
    value: string;
  };

  /** Source information */
  source: PatternSource;
}

/**
 * Timing hint from LLKB lesson
 */
export interface TimingHint {
  /** Trigger condition */
  trigger: string;

  /** Wait time in milliseconds */
  waitMs: number;

  /** Source information */
  source: PatternSource;
}

/**
 * Module mapping from LLKB component
 */
export interface ModuleMapping {
  /** Module function name */
  name: string;

  /** Trigger pattern for matching step text */
  trigger: string;

  /** Original component ID */
  componentId: string;

  /** Import path for the module */
  importPath: string;

  /** Confidence score (0.0 - 1.0) */
  confidence: number;
}

// =============================================================================
// AutoGen Integration Config Schema
// =============================================================================

/**
 * LLKB configuration block for AutoGen config file
 */
export interface AutogenLLKBConfig {
  /** Schema version */
  version: number;

  /** Export timestamp (ISO 8601) */
  exportedAt: string;

  /** LLKB library version */
  llkbVersion: string;

  /** Minimum confidence threshold used */
  minConfidence: number;

  /** Additional patterns from lessons */
  additionalPatterns: AdditionalPattern[];

  /** Selector overrides from lessons */
  selectorOverrides: SelectorOverride[];

  /** Timing hints from lessons */
  timingHints: TimingHint[];

  /** Module mappings from components */
  modules: ModuleMapping[];
}

// =============================================================================
// Glossary Types
// =============================================================================

/**
 * IR Primitive type for glossary entries (simplified)
 */
export interface IRPrimitive {
  /** Primitive type */
  type: 'callModule' | 'click' | 'fill' | 'navigate' | 'wait' | 'assert';

  /** Module name (if type is callModule) */
  module?: string;

  /** Method name (if type is callModule) */
  method?: string;

  /** Additional parameters */
  params?: Record<string, unknown>;
}

/**
 * Glossary entry for natural language to primitive mapping
 */
export interface GlossaryEntry {
  /** Natural language phrase */
  phrase: string;

  /** IR Primitive mapping */
  primitive: IRPrimitive;

  /** Source component or lesson ID */
  sourceId: string;

  /** Confidence score */
  confidence: number;
}

/**
 * Glossary metadata
 */
export interface GlossaryMeta {
  /** Export timestamp (ISO 8601) */
  exportedAt: string;

  /** Minimum confidence threshold used */
  minConfidence: number;

  /** Total number of entries */
  entryCount: number;

  /** Source component IDs */
  sourceComponents: string[];

  /** Source lesson IDs */
  sourceLessons: string[];
}
