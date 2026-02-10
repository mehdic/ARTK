/**
 * Universal Seed Patterns for LLKB Cold Start
 *
 * Provides 39 high-confidence seed patterns covering common web UI actions.
 * These are written to learned-patterns.json during LLKB initialization
 * so that first-run projects start with a useful pattern baseline.
 *
 * All patterns use confidence 0.80 (high but not promotion-eligible),
 * successCount 1 (survives default prune with minSuccess=1),
 * and valid AutoGen IR primitive type names.
 *
 * @module llkb/universal-seeds
 */

import type { LearnedPattern } from './pattern-generation.js';

/**
 * Valid IR primitive type names from autogen/src/ir/types.ts.
 * Used for documentation and validation only.
 */
export const VALID_IR_PRIMITIVES = [
  // Navigation
  'goto', 'goBack', 'goForward', 'reload',
  // Wait
  'waitForVisible', 'waitForHidden', 'waitForURL', 'waitForNetworkIdle', 'waitForTimeout',
  'waitForResponse', 'waitForLoadingComplete',
  // Interactions
  'click', 'dblclick', 'rightClick', 'fill', 'select', 'check', 'uncheck',
  'press', 'hover', 'focus', 'clear', 'upload',
  // Assertions
  'expectVisible', 'expectNotVisible', 'expectHidden', 'expectText', 'expectValue',
  'expectChecked', 'expectEnabled', 'expectDisabled', 'expectURL', 'expectTitle',
  'expectCount', 'expectContainsText',
  // Signals
  'expectToast', 'dismissModal', 'acceptAlert', 'dismissAlert',
] as const;

/** Seed pattern definition (compact form for readability) */
interface SeedDef {
  text: string;
  primitive: string;
}

/**
 * 39 universal seed patterns organized by category.
 *
 * Categories:
 * - Navigation (3): goto, goBack, reload
 * - Click (6): button, link, menu item, tab, checkbox, radio
 * - Fill (5): text input, password, search, textarea, email
 * - Form (3): submit, clear, select dropdown
 * - Assert (5): visible, text, URL, title, hidden
 * - Wait (3): element, navigation, network idle
 * - Modal (4): open, close, confirm, dismiss
 * - Toast (3): verify toast, close notification, wait disappear
 * - Table (4): sort, filter, select row, paginate
 * - Keyboard (3): Enter, Escape, Tab
 */
const SEED_DEFINITIONS: SeedDef[] = [
  // Navigation (3)
  { text: 'navigate to url', primitive: 'goto' },
  { text: 'go back to previous page', primitive: 'goBack' },
  { text: 'reload the page', primitive: 'reload' },

  // Click (6)
  { text: 'click the button', primitive: 'click' },
  { text: 'click the link', primitive: 'click' },
  { text: 'click the menu item', primitive: 'click' },
  { text: 'click the tab', primitive: 'click' },
  { text: 'check the checkbox', primitive: 'check' },
  { text: 'click the radio button', primitive: 'click' },

  // Fill (5)
  { text: 'enter text in the input field', primitive: 'fill' },
  { text: 'enter the password', primitive: 'fill' },
  { text: 'type in the search box', primitive: 'fill' },
  { text: 'enter text in the textarea', primitive: 'fill' },
  { text: 'enter the email address', primitive: 'fill' },

  // Form (3)
  { text: 'submit the form', primitive: 'click' },
  { text: 'clear the form', primitive: 'clear' },
  { text: 'select option from dropdown', primitive: 'select' },

  // Assert (5)
  { text: 'verify element is visible', primitive: 'expectVisible' },
  { text: 'verify text is displayed', primitive: 'expectText' },
  { text: 'verify the url', primitive: 'expectURL' },
  { text: 'verify the page title', primitive: 'expectTitle' },
  { text: 'verify element is hidden', primitive: 'expectHidden' },

  // Wait (3)
  { text: 'wait for element to appear', primitive: 'waitForVisible' },
  { text: 'wait for navigation to complete', primitive: 'waitForURL' },
  { text: 'wait for network idle', primitive: 'waitForNetworkIdle' },

  // Modal (4)
  { text: 'open the modal dialog', primitive: 'click' },
  { text: 'close the modal', primitive: 'dismissModal' },
  { text: 'confirm the dialog', primitive: 'acceptAlert' },
  { text: 'dismiss the dialog', primitive: 'dismissAlert' },

  // Toast (3)
  { text: 'verify toast notification appears', primitive: 'expectToast' },
  { text: 'close the notification', primitive: 'click' },
  { text: 'wait for toast to disappear', primitive: 'waitForHidden' },

  // Table (4)
  { text: 'sort the table column', primitive: 'click' },
  { text: 'filter the table', primitive: 'fill' },
  { text: 'select the table row', primitive: 'click' },
  { text: 'click next page in pagination', primitive: 'click' },

  // Keyboard (3)
  { text: 'press enter', primitive: 'press' },
  { text: 'press escape', primitive: 'press' },
  { text: 'press tab', primitive: 'press' },
];

/** Default confidence for all seed patterns */
const SEED_CONFIDENCE = 0.80;

/**
 * Create 39 universal seed patterns for LLKB cold start.
 *
 * These patterns provide immediate value on first run before any
 * app-specific discovery has occurred. They cover the most common
 * web UI interactions that virtually every web app requires.
 *
 * @returns Array of 39 LearnedPattern entries
 */
export function createUniversalSeedPatterns(): LearnedPattern[] {
  const now = new Date().toISOString();

  return SEED_DEFINITIONS.map((def): LearnedPattern => ({
    normalizedText: def.text,
    originalText: def.text,
    irPrimitive: def.primitive,
    confidence: SEED_CONFIDENCE,
    successCount: 1,
    failCount: 0,
    sourceJourneys: [],
    lastUpdated: now,
  }));
}
