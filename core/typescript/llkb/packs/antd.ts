/**
 * Ant Design Framework Pack
 *
 * Provides Ant Design-specific patterns for Table, Modal, Message, Select, Form, etc.
 *
 * @module llkb/packs/antd
 */

import type { FrameworkPack, PackPattern } from './types.js';

const ANTD_PATTERNS: PackPattern[] = [
  // Table
  {
    text: 'sort Ant table column',
    primitive: 'click',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'css', value: '.ant-table-column-sorters' }],
  },
  {
    text: 'filter Ant table',
    primitive: 'click',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'css', value: '.ant-table-filter-trigger' }],
  },
  {
    text: 'expand Ant table row',
    primitive: 'click',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'css', value: '.ant-table-row-expand-icon' }],
  },
  {
    text: 'select Ant table row',
    primitive: 'click',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'css', value: '.ant-table-row' }],
  },
  {
    text: 'paginate Ant table',
    primitive: 'click',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'css', value: '.ant-pagination-item' }],
  },
  {
    text: 'search Ant table',
    primitive: 'fill',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'css', value: '.ant-table-filter-dropdown input' }],
  },

  // Modal
  {
    text: 'open Ant modal',
    primitive: 'click',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'css', value: '[data-trigger-modal]' }],
  },
  {
    text: 'close Ant modal',
    primitive: 'click',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'css', value: '.ant-modal-close' }],
  },
  {
    text: 'confirm Ant modal',
    primitive: 'click',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'css', value: '.ant-modal-footer .ant-btn-primary' }],
  },
  {
    text: 'cancel Ant modal',
    primitive: 'click',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'css', value: '.ant-modal-footer .ant-btn-default' }],
  },

  // Message & Notification
  {
    text: 'verify Ant message',
    primitive: 'assert',
    category: 'assertion',
    selectorHints: [{ strategy: 'css', value: '.ant-message' }],
  },
  {
    text: 'verify Ant notification',
    primitive: 'assert',
    category: 'assertion',
    selectorHints: [{ strategy: 'css', value: '.ant-notification' }],
  },
  {
    text: 'close Ant notification',
    primitive: 'click',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'css', value: '.ant-notification-close-icon' }],
  },

  // Select
  {
    text: 'open Ant select dropdown',
    primitive: 'click',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'css', value: '.ant-select-selector' }],
  },
  {
    text: 'search Ant select',
    primitive: 'fill',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'css', value: '.ant-select-selection-search-input' }],
  },
  {
    text: 'select Ant option',
    primitive: 'click',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'css', value: '.ant-select-item-option' }],
  },
  {
    text: 'clear Ant select',
    primitive: 'click',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'css', value: '.ant-select-clear' }],
  },

  // Form
  {
    text: 'submit Ant form',
    primitive: 'click',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'css', value: '.ant-form button[type="submit"]' }],
  },
  {
    text: 'verify Ant form validation',
    primitive: 'assert',
    category: 'assertion',
    selectorHints: [{ strategy: 'css', value: '.ant-form-item-explain-error' }],
  },
  {
    text: 'fill Ant input',
    primitive: 'fill',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'css', value: '.ant-input' }],
  },
  {
    text: 'reset Ant form',
    primitive: 'click',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'css', value: '.ant-form button[type="reset"]' }],
  },

  // DatePicker
  {
    text: 'open Ant date picker',
    primitive: 'click',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'css', value: '.ant-picker' }],
  },
  {
    text: 'select Ant date',
    primitive: 'click',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'css', value: '.ant-picker-cell' }],
  },

  // Drawer
  {
    text: 'open Ant drawer',
    primitive: 'click',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'css', value: '[data-trigger-drawer]' }],
  },
  {
    text: 'close Ant drawer',
    primitive: 'click',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'css', value: '.ant-drawer-close' }],
  },
];

/**
 * Get the Ant Design framework pack
 */
export function getAntdPack(): FrameworkPack {
  return {
    name: 'antd',
    framework: 'antd',
    version: '1.0.0',
    description: 'Ant Design specific patterns for Table, Modal, Message, Select, Form, and more',
    patterns: ANTD_PATTERNS,
  };
}
