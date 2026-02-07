/**
 * LLKB Framework Packs Types
 *
 * Type definitions for framework-specific pattern packs.
 * Packs provide reusable patterns for common frameworks and UI libraries.
 *
 * @module llkb/packs/types
 */

import type { DiscoveredPattern, SelectorHint } from '../pattern-generation.js';

/**
 * A single pattern within a framework pack
 */
export interface PackPattern {
  /** Human-readable pattern text */
  text: string;
  /** IR primitive this maps to (click, fill, navigate, assert, wait, etc.) */
  primitive: string;
  /** Pattern category */
  category: 'auth' | 'navigation' | 'ui-interaction' | 'data' | 'assertion' | 'timing';
  /** Optional selector hints for this pattern */
  selectorHints?: SelectorHint[];
  /** Optional confidence score (0.0 - 1.0) */
  confidence?: number;
}

/**
 * A framework-specific pattern pack
 */
export interface FrameworkPack {
  /** Pack name */
  name: string;
  /** Target framework or library */
  framework: string;
  /** Pack version */
  version: string;
  /** Pack description */
  description: string;
  /** Patterns in this pack */
  patterns: PackPattern[];
}

/**
 * Registry entry for a framework pack with lazy loading
 */
export interface PackRegistryEntry {
  /** Pack name */
  name: string;
  /** Framework signals that trigger this pack (e.g., ['react', 'nextjs']) */
  frameworks: string[];
  /** Lazy loader function */
  loader: () => FrameworkPack;
}

/**
 * Re-export types from pattern-generation for convenience
 */
export type { DiscoveredPattern, SelectorHint };
