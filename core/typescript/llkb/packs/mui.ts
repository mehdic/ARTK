/**
 * Material-UI (MUI) Framework Pack
 *
 * Provides MUI-specific patterns for DataGrid, Dialog, Snackbar, Autocomplete, DatePicker, etc.
 *
 * @module llkb/packs/mui
 */

import type { FrameworkPack, PackPattern } from './types.js';

const MUI_PATTERNS: PackPattern[] = [
  // DataGrid
  {
    text: 'sort MUI DataGrid column',
    primitive: 'click',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'css', value: '.MuiDataGrid-columnHeader' }],
  },
  {
    text: 'filter MUI DataGrid',
    primitive: 'fill',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'css', value: '.MuiDataGrid-filterForm' }],
  },
  {
    text: 'select DataGrid row',
    primitive: 'click',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'css', value: '.MuiDataGrid-row' }],
  },
  {
    text: 'paginate DataGrid',
    primitive: 'click',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'css', value: '.MuiTablePagination-actions button' }],
  },
  {
    text: 'expand DataGrid row',
    primitive: 'click',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'css', value: '.MuiDataGrid-detailPanelToggle' }],
  },
  {
    text: 'edit DataGrid cell',
    primitive: 'fill',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'css', value: '.MuiDataGrid-cell--editable' }],
  },

  // Dialog
  {
    text: 'open MUI dialog',
    primitive: 'click',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'css', value: '[aria-haspopup="dialog"]' }],
  },
  {
    text: 'close MUI dialog',
    primitive: 'click',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'css', value: '.MuiDialog-root [aria-label="close"]' }],
  },
  {
    text: 'confirm MUI dialog',
    primitive: 'click',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'css', value: '.MuiDialogActions-root button:last-child' }],
  },
  {
    text: 'verify MUI dialog open',
    primitive: 'assert',
    category: 'assertion',
    selectorHints: [{ strategy: 'role', value: 'dialog' }],
  },

  // Snackbar
  {
    text: 'verify MUI snackbar message',
    primitive: 'assert',
    category: 'assertion',
    selectorHints: [{ strategy: 'css', value: '.MuiSnackbar-root' }],
  },
  {
    text: 'dismiss MUI snackbar',
    primitive: 'click',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'css', value: '.MuiSnackbar-root [aria-label="close"]' }],
  },

  // Autocomplete
  {
    text: 'type in MUI autocomplete',
    primitive: 'fill',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'css', value: '.MuiAutocomplete-input' }],
  },
  {
    text: 'select MUI autocomplete option',
    primitive: 'click',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'css', value: '.MuiAutocomplete-option' }],
  },
  {
    text: 'clear MUI autocomplete',
    primitive: 'click',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'css', value: '.MuiAutocomplete-clearIndicator' }],
  },

  // DatePicker
  {
    text: 'open MUI date picker',
    primitive: 'click',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'css', value: '.MuiPickersPopper-root' }],
  },
  {
    text: 'select date in picker',
    primitive: 'click',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'css', value: '.MuiPickersDay-root' }],
  },
  {
    text: 'navigate picker month',
    primitive: 'click',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'css', value: '.MuiPickersCalendarHeader-switchViewButton' }],
  },

  // Select
  {
    text: 'open MUI select',
    primitive: 'click',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'css', value: '.MuiSelect-select' }],
  },
  {
    text: 'select MUI option',
    primitive: 'click',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'css', value: '.MuiMenuItem-root' }],
  },

  // TextField
  {
    text: 'fill MUI text field',
    primitive: 'fill',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'css', value: '.MuiTextField-root input' }],
  },
  {
    text: 'verify MUI text field error',
    primitive: 'assert',
    category: 'assertion',
    selectorHints: [{ strategy: 'css', value: '.MuiFormHelperText-root.Mui-error' }],
  },

  // Menu
  {
    text: 'open MUI menu',
    primitive: 'click',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'role', value: 'button', name: 'menu' }],
  },
  {
    text: 'select MUI menu item',
    primitive: 'click',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'role', value: 'menuitem' }],
  },

  // Tabs
  {
    text: 'click MUI tab',
    primitive: 'click',
    category: 'ui-interaction',
    selectorHints: [{ strategy: 'role', value: 'tab' }],
  },
  {
    text: 'verify MUI tab selected',
    primitive: 'assert',
    category: 'assertion',
    selectorHints: [{ strategy: 'css', value: '.MuiTab-root[aria-selected="true"]' }],
  },
];

/**
 * Get the MUI framework pack
 */
export function getMuiPack(): FrameworkPack {
  return {
    name: 'mui',
    framework: 'mui',
    version: '1.0.0',
    description: 'Material-UI specific patterns for DataGrid, Dialog, Snackbar, Autocomplete, DatePicker, and more',
    patterns: MUI_PATTERNS,
  };
}
