/**
 * @fileoverview LLKB Module Constants
 * @module @artk/core/llkb/constants
 *
 * Centralized constants to avoid magic numbers in LLKB module.
 */

// =============================================================================
// Confidence Thresholds
// =============================================================================

export const CONFIDENCE = {
  DEFAULT_WEIGHT: 0.5,
  MIN_THRESHOLD: 0.6,
} as const;

// =============================================================================
// Timeouts (milliseconds)
// =============================================================================

export const TIMEOUTS = {
  SHORT_MS: 300,
  MEDIUM_MS: 1000,
  LONG_MS: 2000,
} as const;

// =============================================================================
// Table Display
// =============================================================================

export const TABLE = {
  MAX_WIDTH: 100,
  COLUMN_WIDTH: 50,
} as const;

// =============================================================================
// Time Conversions
// =============================================================================

export const TIME = {
  MS_PER_SECOND: 1000,
  SECONDS_PER_MINUTE: 60,
  MINUTES_PER_HOUR: 60,
  HOURS_PER_DAY: 24,
} as const;

// =============================================================================
// Limits
// =============================================================================

export const LIMITS = {
  MAX_RECENT_ITEMS: 5,
  DEFAULT_RETENTION_DAYS: 30,
} as const;

// =============================================================================
// Percentages
// =============================================================================

export const PERCENTAGES = {
  FULL: 100,
} as const;
