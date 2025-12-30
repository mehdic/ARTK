/**
 * ARTK Locators Module - Accessibility-First Locator Utilities
 *
 * Provides a strategy-based locator system that prioritizes accessibility
 * and semantic HTML over brittle CSS selectors.
 *
 * Key Features:
 * - FR-017: Multiple locator strategies (role, label, placeholder, testid, text, css)
 * - FR-018: Configurable strategy chain (first match wins)
 * - FR-019: Custom test ID attribute support
 * - FR-020: Scoped locators for forms, tables, sections
 * - ARIA/accessibility helper functions
 *
 * @module locators
 */

// =============================================================================
// Type Exports
// =============================================================================

export type {
  LocatorStrategy,
  ByRoleOptions,
  FormLocators,
  TableLocators,
  SectionLocators,
  LocatorFactoryConfig,
  AriaRole,
  LocatorStrategyFn,
} from './types.js';

// =============================================================================
// Strategy Functions
// =============================================================================

export {
  byRole,
  byLabel,
  byPlaceholder,
  byText,
  byCss,
  tryStrategy,
} from './strategies.js';

// =============================================================================
// Test ID Functions
// =============================================================================

export {
  byTestId,
  hasTestIdAttribute,
  getTestIdValue,
  createTestIdSelector,
  createCombinedTestIdSelector,
} from './testid.js';

// =============================================================================
// ARIA Helpers
// =============================================================================

export {
  getAriaRole,
  getAriaLabel,
  getAriaDescription,
  isAriaDisabled,
  isAriaExpanded,
  isAriaChecked,
  isAriaHidden,
  getAriaLive,
  isAriaRequired,
  isAriaInvalid,
  getAccessibleName,
  isValidAriaRole,
} from './aria.js';

// =============================================================================
// Locator Factory & Scoped Locators
// =============================================================================

export {
  locate,
  withinForm,
  withinTable,
  withinSection,
  createDefaultConfig,
  createConfigFromSelectors,
} from './factory.js';
