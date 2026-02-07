/**
 * Chakra UI Framework Pack
 *
 * Provides Chakra UI-specific patterns for Modal, Toast, Menu, Drawer, Tabs, etc.
 *
 * @module llkb/packs/chakra
 */

import type { FrameworkPack, PackPattern } from './types.js';

const CHAKRA_PATTERNS: PackPattern[] = [
  // Modal
  {
    text: 'open Chakra modal',
    primitive: 'click',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'css', value: '[data-chakra-modal-trigger]' }],
  },
  {
    text: 'close Chakra modal',
    primitive: 'click',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'css', value: '[aria-label="Close"]' }],
  },
  {
    text: 'verify Chakra modal open',
    primitive: 'assert',
    category: 'assertion',
    selectorHints: [{ strategy: 'role', value: 'dialog' }],
  },
  {
    text: 'confirm Chakra modal',
    primitive: 'click',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'css', value: '[role="dialog"] footer button:last-child' }],
  },

  // Toast
  {
    text: 'verify Chakra toast',
    primitive: 'assert',
    category: 'assertion',
    selectorHints: [{ strategy: 'role', value: 'status' }],
  },
  {
    text: 'dismiss Chakra toast',
    primitive: 'click',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'css', value: '[role="status"] button[aria-label="Close"]' }],
  },
  {
    text: 'verify Chakra toast message',
    primitive: 'assert',
    category: 'assertion',
    selectorHints: [{ strategy: 'css', value: '[role="status"]' }],
  },

  // Menu
  {
    text: 'open Chakra menu',
    primitive: 'click',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'role', value: 'button', name: 'menu' }],
  },
  {
    text: 'select Chakra menu item',
    primitive: 'click',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'role', value: 'menuitem' }],
  },
  {
    text: 'close Chakra menu',
    primitive: 'click',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'css', value: 'body' }],
  },

  // Drawer
  {
    text: 'open Chakra drawer',
    primitive: 'click',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'css', value: '[data-chakra-drawer-trigger]' }],
  },
  {
    text: 'close Chakra drawer',
    primitive: 'click',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'css', value: '[role="dialog"] [aria-label="Close"]' }],
  },
  {
    text: 'verify Chakra drawer open',
    primitive: 'assert',
    category: 'assertion',
    selectorHints: [{ strategy: 'role', value: 'dialog' }],
  },

  // Tabs
  {
    text: 'switch Chakra tab',
    primitive: 'click',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'role', value: 'tab' }],
  },
  {
    text: 'verify Chakra tab content',
    primitive: 'assert',
    category: 'assertion',
    selectorHints: [{ strategy: 'role', value: 'tabpanel' }],
  },
  {
    text: 'verify Chakra tab selected',
    primitive: 'assert',
    category: 'assertion',
    selectorHints: [{ strategy: 'css', value: '[role="tab"][aria-selected="true"]' }],
  },

  // Form
  {
    text: 'fill Chakra input',
    primitive: 'fill',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'css', value: 'input' }],
  },
  {
    text: 'verify Chakra form error',
    primitive: 'assert',
    category: 'assertion',
    selectorHints: [{ strategy: 'css', value: '[role="alert"]' }],
  },
  {
    text: 'submit Chakra form',
    primitive: 'click',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'css', value: 'button[type="submit"]' }],
  },

  // Popover
  {
    text: 'open Chakra popover',
    primitive: 'click',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'css', value: '[data-chakra-popover-trigger]' }],
  },
  {
    text: 'close Chakra popover',
    primitive: 'click',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'css', value: '[role="tooltip"] [aria-label="Close"]' }],
  },
];

/**
 * Get the Chakra UI framework pack
 */
export function getChakraPack(): FrameworkPack {
  return {
    name: 'chakra',
    framework: 'chakra',
    version: '1.0.0',
    description: 'Chakra UI specific patterns for Modal, Toast, Menu, Drawer, Tabs, and more',
    patterns: CHAKRA_PATTERNS,
  };
}
