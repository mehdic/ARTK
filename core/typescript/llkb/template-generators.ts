/**
 * LLKB Template Generators Module
 *
 * Generates patterns by multiplying templates with discovered entities.
 * This is the core feature that enables 300-400 app-specific patterns
 * from discovery results.
 *
 * Template multiplication:
 * - 5 CRUD operations × 12 entities = 60 patterns
 * - 5 form operations × 15 forms = 75 patterns
 * - 6 table operations × 8 tables = 48 patterns
 * - 4 modal operations × 12 modals = 48 patterns
 * - 8 navigation operations × 5 routes = 40 patterns
 *
 * @module llkb/template-generators
 */

import type { DiscoveredPattern, SelectorHint } from './pattern-generation.js';
import { randomUUID } from 'crypto';
import { pluralize, singularize } from './pluralization.js';

// =============================================================================
// Constants
// =============================================================================

/** Default confidence for generated patterns */
const DEFAULT_GENERATED_CONFIDENCE = 0.70;
/** Higher confidence for patterns with known selectors */
const SELECTOR_CONFIDENCE_BOOST = 0.15;
/** Maximum confidence cap */
const MAX_CONFIDENCE = 0.95;
/** Maximum generated patterns to prevent unbounded multiplication */
const MAX_GENERATED_PATTERNS = 2000;

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * A discovered entity that can be used in pattern generation
 */
export interface DiscoveredEntity {
  /** Entity name (e.g., "user", "product", "order") */
  name: string;
  /** Singular form of the name */
  singular: string;
  /** Plural form of the name */
  plural: string;
  /** Source file where entity was discovered */
  source?: string;
  /** API endpoint if available */
  endpoint?: string;
  /** Known selectors for this entity's UI elements */
  selectors?: Record<string, string>;
}

/**
 * A discovered route
 */
export interface DiscoveredRoute {
  /** Route path (e.g., "/users", "/products/:id") */
  path: string;
  /** Human-readable name */
  name: string;
  /** Route parameters */
  params?: string[];
  /** Associated component file */
  component?: string;
}

/**
 * A discovered form
 */
export interface DiscoveredForm {
  /** Form identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Form fields */
  fields: FormField[];
  /** Submit button selector */
  submitSelector?: string;
  /** Associated schema (Zod, Yup, etc.) */
  schema?: string;
}

/**
 * A form field
 */
export interface FormField {
  /** Field name */
  name: string;
  /** Field type (text, email, password, select, checkbox, etc.) */
  type: string;
  /** Field label */
  label?: string;
  /** Known selector */
  selector?: string;
  /** Whether field is required */
  required?: boolean;
}

/**
 * A discovered table/grid
 */
export interface DiscoveredTable {
  /** Table identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Column names */
  columns: string[];
  /** Known selectors */
  selectors?: {
    table?: string;
    row?: string;
    cell?: string;
    header?: string;
    sortButton?: string;
    filterInput?: string;
  };
}

/**
 * A discovered modal/dialog
 */
export interface DiscoveredModal {
  /** Modal identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Trigger selector (button that opens the modal) */
  triggerSelector?: string;
  /** Close button selector */
  closeSelector?: string;
  /** Confirm/submit button selector */
  confirmSelector?: string;
  /** Modal content selector */
  contentSelector?: string;
}

/**
 * All discovered elements for pattern generation
 */
export interface DiscoveredElements {
  entities: DiscoveredEntity[];
  routes: DiscoveredRoute[];
  forms: DiscoveredForm[];
  tables: DiscoveredTable[];
  modals: DiscoveredModal[];
}

/**
 * A template for pattern generation
 */
export interface PatternTemplate {
  /** Template text with {placeholder} variables */
  text: string;
  /** IR primitive to map to */
  primitive: string;
  /** Placeholders used in the template */
  placeholders: string[];
  /** Category for the generated pattern */
  category: 'auth' | 'navigation' | 'ui-interaction' | 'data' | 'assertion' | 'timing';
  /** Template source identifier */
  templateSource: 'crud' | 'form' | 'table' | 'modal' | 'navigation' | 'auth' | 'static';
}

/**
 * Result of template generation
 */
export interface GenerationResult {
  patterns: DiscoveredPattern[];
  stats: {
    crudPatterns: number;
    formPatterns: number;
    tablePatterns: number;
    modalPatterns: number;
    navigationPatterns: number;
    notificationPatterns: number;
    totalPatterns: number;
  };
}

// =============================================================================
// CRUD Templates
// =============================================================================

/**
 * CRUD operation templates
 * Each template generates patterns for each discovered entity
 */
export const CRUD_TEMPLATES: PatternTemplate[] = [
  // Create operations
  { text: 'create new {entity}', primitive: 'click', placeholders: ['entity'], category: 'data', templateSource: 'crud' },
  { text: 'add {entity}', primitive: 'click', placeholders: ['entity'], category: 'data', templateSource: 'crud' },
  { text: 'click add {entity} button', primitive: 'click', placeholders: ['entity'], category: 'data', templateSource: 'crud' },
  { text: 'click create {entity} button', primitive: 'click', placeholders: ['entity'], category: 'data', templateSource: 'crud' },
  { text: 'open new {entity} form', primitive: 'click', placeholders: ['entity'], category: 'data', templateSource: 'crud' },

  // Read operations
  { text: 'view {entity} details', primitive: 'click', placeholders: ['entity'], category: 'data', templateSource: 'crud' },
  { text: 'open {entity}', primitive: 'click', placeholders: ['entity'], category: 'data', templateSource: 'crud' },
  { text: 'click on {entity}', primitive: 'click', placeholders: ['entity'], category: 'data', templateSource: 'crud' },
  { text: 'select {entity} from list', primitive: 'click', placeholders: ['entity'], category: 'data', templateSource: 'crud' },
  { text: 'view {entity} list', primitive: 'navigate', placeholders: ['entity'], category: 'data', templateSource: 'crud' },

  // Update operations
  { text: 'edit {entity}', primitive: 'click', placeholders: ['entity'], category: 'data', templateSource: 'crud' },
  { text: 'update {entity}', primitive: 'click', placeholders: ['entity'], category: 'data', templateSource: 'crud' },
  { text: 'modify {entity}', primitive: 'click', placeholders: ['entity'], category: 'data', templateSource: 'crud' },
  { text: 'click edit {entity} button', primitive: 'click', placeholders: ['entity'], category: 'data', templateSource: 'crud' },
  { text: 'save {entity} changes', primitive: 'click', placeholders: ['entity'], category: 'data', templateSource: 'crud' },

  // Delete operations
  { text: 'delete {entity}', primitive: 'click', placeholders: ['entity'], category: 'data', templateSource: 'crud' },
  { text: 'remove {entity}', primitive: 'click', placeholders: ['entity'], category: 'data', templateSource: 'crud' },
  { text: 'click delete {entity} button', primitive: 'click', placeholders: ['entity'], category: 'data', templateSource: 'crud' },
  { text: 'confirm {entity} deletion', primitive: 'click', placeholders: ['entity'], category: 'data', templateSource: 'crud' },
  { text: 'cancel {entity} deletion', primitive: 'click', placeholders: ['entity'], category: 'data', templateSource: 'crud' },

  // Search/filter operations
  { text: 'search for {entity}', primitive: 'fill', placeholders: ['entity'], category: 'data', templateSource: 'crud' },
  { text: 'filter {entities}', primitive: 'fill', placeholders: ['entities'], category: 'data', templateSource: 'crud' },
  { text: 'clear {entity} filter', primitive: 'click', placeholders: ['entity'], category: 'data', templateSource: 'crud' },
];

// =============================================================================
// Form Templates
// =============================================================================

/**
 * Form operation templates
 */
export const FORM_TEMPLATES: PatternTemplate[] = [
  // Form interactions
  { text: 'fill {form} form', primitive: 'fill', placeholders: ['form'], category: 'data', templateSource: 'form' },
  { text: 'submit {form} form', primitive: 'click', placeholders: ['form'], category: 'data', templateSource: 'form' },
  { text: 'cancel {form} form', primitive: 'click', placeholders: ['form'], category: 'data', templateSource: 'form' },
  { text: 'reset {form} form', primitive: 'click', placeholders: ['form'], category: 'data', templateSource: 'form' },
  { text: 'clear {form} form', primitive: 'click', placeholders: ['form'], category: 'data', templateSource: 'form' },

  // Field operations
  { text: 'enter {field} in {form}', primitive: 'fill', placeholders: ['field', 'form'], category: 'data', templateSource: 'form' },
  { text: 'fill in {field}', primitive: 'fill', placeholders: ['field'], category: 'data', templateSource: 'form' },
  { text: 'select {field} option', primitive: 'click', placeholders: ['field'], category: 'data', templateSource: 'form' },
  { text: 'check {field} checkbox', primitive: 'check', placeholders: ['field'], category: 'data', templateSource: 'form' },
  { text: 'uncheck {field} checkbox', primitive: 'uncheck', placeholders: ['field'], category: 'data', templateSource: 'form' },
  { text: 'toggle {field}', primitive: 'click', placeholders: ['field'], category: 'data', templateSource: 'form' },
  { text: 'upload file to {field}', primitive: 'upload', placeholders: ['field'], category: 'data', templateSource: 'form' },
  { text: 'clear {field} field', primitive: 'clear', placeholders: ['field'], category: 'data', templateSource: 'form' },

  // Validation
  { text: 'verify {field} error message', primitive: 'assert', placeholders: ['field'], category: 'assertion', templateSource: 'form' },
  { text: 'verify {form} validation error', primitive: 'assert', placeholders: ['form'], category: 'assertion', templateSource: 'form' },
  { text: 'verify {field} is required', primitive: 'assert', placeholders: ['field'], category: 'assertion', templateSource: 'form' },
  { text: 'verify {form} submitted successfully', primitive: 'assert', placeholders: ['form'], category: 'assertion', templateSource: 'form' },
];

// =============================================================================
// Table Templates
// =============================================================================

/**
 * Table/grid operation templates
 */
export const TABLE_TEMPLATES: PatternTemplate[] = [
  // Row operations
  { text: 'click row in {table}', primitive: 'click', placeholders: ['table'], category: 'ui-interaction', templateSource: 'table' },
  { text: 'select row in {table}', primitive: 'click', placeholders: ['table'], category: 'ui-interaction', templateSource: 'table' },
  { text: 'double-click row in {table}', primitive: 'dblclick', placeholders: ['table'], category: 'ui-interaction', templateSource: 'table' },
  { text: 'expand row in {table}', primitive: 'click', placeholders: ['table'], category: 'ui-interaction', templateSource: 'table' },
  { text: 'collapse row in {table}', primitive: 'click', placeholders: ['table'], category: 'ui-interaction', templateSource: 'table' },
  { text: 'hover over row in {table}', primitive: 'hover', placeholders: ['table'], category: 'ui-interaction', templateSource: 'table' },

  // Column operations
  { text: 'sort {column} column in {table}', primitive: 'click', placeholders: ['column', 'table'], category: 'ui-interaction', templateSource: 'table' },
  { text: 'sort {table} by {column}', primitive: 'click', placeholders: ['table', 'column'], category: 'ui-interaction', templateSource: 'table' },
  { text: 'filter {column} in {table}', primitive: 'fill', placeholders: ['column', 'table'], category: 'ui-interaction', templateSource: 'table' },
  { text: 'resize {column} column', primitive: 'drag', placeholders: ['column'], category: 'ui-interaction', templateSource: 'table' },
  { text: 'hide {column} column', primitive: 'click', placeholders: ['column'], category: 'ui-interaction', templateSource: 'table' },
  { text: 'show {column} column', primitive: 'click', placeholders: ['column'], category: 'ui-interaction', templateSource: 'table' },

  // Pagination
  { text: 'go to next page in {table}', primitive: 'click', placeholders: ['table'], category: 'ui-interaction', templateSource: 'table' },
  { text: 'go to previous page in {table}', primitive: 'click', placeholders: ['table'], category: 'ui-interaction', templateSource: 'table' },
  { text: 'go to page {page} in {table}', primitive: 'click', placeholders: ['page', 'table'], category: 'ui-interaction', templateSource: 'table' },
  { text: 'change page size in {table}', primitive: 'click', placeholders: ['table'], category: 'ui-interaction', templateSource: 'table' },

  // Cell operations
  { text: 'edit cell in {table}', primitive: 'dblclick', placeholders: ['table'], category: 'ui-interaction', templateSource: 'table' },
  { text: 'click cell in {table}', primitive: 'click', placeholders: ['table'], category: 'ui-interaction', templateSource: 'table' },

  // Selection
  { text: 'select all rows in {table}', primitive: 'click', placeholders: ['table'], category: 'ui-interaction', templateSource: 'table' },
  { text: 'deselect all rows in {table}', primitive: 'click', placeholders: ['table'], category: 'ui-interaction', templateSource: 'table' },

  // Assertions
  { text: 'verify {table} has {count} rows', primitive: 'assert', placeholders: ['table', 'count'], category: 'assertion', templateSource: 'table' },
  { text: 'verify {table} contains {text}', primitive: 'assert', placeholders: ['table', 'text'], category: 'assertion', templateSource: 'table' },
  { text: 'verify {table} is empty', primitive: 'assert', placeholders: ['table'], category: 'assertion', templateSource: 'table' },
  { text: 'verify {column} is sorted', primitive: 'assert', placeholders: ['column'], category: 'assertion', templateSource: 'table' },
];

// =============================================================================
// Modal Templates
// =============================================================================

/**
 * Modal/dialog operation templates
 */
export const MODAL_TEMPLATES: PatternTemplate[] = [
  // Open/close
  { text: 'open {modal} modal', primitive: 'click', placeholders: ['modal'], category: 'ui-interaction', templateSource: 'modal' },
  { text: 'open {modal} dialog', primitive: 'click', placeholders: ['modal'], category: 'ui-interaction', templateSource: 'modal' },
  { text: 'close {modal} modal', primitive: 'click', placeholders: ['modal'], category: 'ui-interaction', templateSource: 'modal' },
  { text: 'close {modal} dialog', primitive: 'click', placeholders: ['modal'], category: 'ui-interaction', templateSource: 'modal' },
  { text: 'dismiss {modal}', primitive: 'click', placeholders: ['modal'], category: 'ui-interaction', templateSource: 'modal' },

  // Actions
  { text: 'confirm {modal}', primitive: 'click', placeholders: ['modal'], category: 'ui-interaction', templateSource: 'modal' },
  { text: 'cancel {modal}', primitive: 'click', placeholders: ['modal'], category: 'ui-interaction', templateSource: 'modal' },
  { text: 'click OK in {modal}', primitive: 'click', placeholders: ['modal'], category: 'ui-interaction', templateSource: 'modal' },
  { text: 'click Cancel in {modal}', primitive: 'click', placeholders: ['modal'], category: 'ui-interaction', templateSource: 'modal' },
  { text: 'click Yes in {modal}', primitive: 'click', placeholders: ['modal'], category: 'ui-interaction', templateSource: 'modal' },
  { text: 'click No in {modal}', primitive: 'click', placeholders: ['modal'], category: 'ui-interaction', templateSource: 'modal' },
  { text: 'submit {modal}', primitive: 'click', placeholders: ['modal'], category: 'ui-interaction', templateSource: 'modal' },

  // Close methods
  { text: 'press Escape to close {modal}', primitive: 'keyboard', placeholders: ['modal'], category: 'ui-interaction', templateSource: 'modal' },
  { text: 'click outside {modal} to close', primitive: 'click', placeholders: ['modal'], category: 'ui-interaction', templateSource: 'modal' },
  { text: 'click backdrop to close {modal}', primitive: 'click', placeholders: ['modal'], category: 'ui-interaction', templateSource: 'modal' },

  // Assertions
  { text: 'verify {modal} is open', primitive: 'assert', placeholders: ['modal'], category: 'assertion', templateSource: 'modal' },
  { text: 'verify {modal} is closed', primitive: 'assert', placeholders: ['modal'], category: 'assertion', templateSource: 'modal' },
  { text: 'verify {modal} contains {text}', primitive: 'assert', placeholders: ['modal', 'text'], category: 'assertion', templateSource: 'modal' },
  { text: 'verify {modal} title is {title}', primitive: 'assert', placeholders: ['modal', 'title'], category: 'assertion', templateSource: 'modal' },
];

// =============================================================================
// Navigation Templates (Extended)
// =============================================================================

/**
 * Extended navigation templates
 */
export const EXTENDED_NAVIGATION_TEMPLATES: PatternTemplate[] = [
  // Direct navigation
  { text: 'navigate to {route}', primitive: 'navigate', placeholders: ['route'], category: 'navigation', templateSource: 'navigation' },
  { text: 'go to {route}', primitive: 'navigate', placeholders: ['route'], category: 'navigation', templateSource: 'navigation' },
  { text: 'open {route} page', primitive: 'navigate', placeholders: ['route'], category: 'navigation', templateSource: 'navigation' },
  { text: 'visit {route}', primitive: 'navigate', placeholders: ['route'], category: 'navigation', templateSource: 'navigation' },

  // Menu/sidebar navigation
  { text: 'click {route} in navigation', primitive: 'click', placeholders: ['route'], category: 'navigation', templateSource: 'navigation' },
  { text: 'click {route} in sidebar', primitive: 'click', placeholders: ['route'], category: 'navigation', templateSource: 'navigation' },
  { text: 'click {route} in menu', primitive: 'click', placeholders: ['route'], category: 'navigation', templateSource: 'navigation' },
  { text: 'select {route} from menu', primitive: 'click', placeholders: ['route'], category: 'navigation', templateSource: 'navigation' },
  { text: 'expand {route} menu', primitive: 'click', placeholders: ['route'], category: 'navigation', templateSource: 'navigation' },
  { text: 'collapse {route} menu', primitive: 'click', placeholders: ['route'], category: 'navigation', templateSource: 'navigation' },

  // Breadcrumb navigation
  { text: 'click {route} in breadcrumb', primitive: 'click', placeholders: ['route'], category: 'navigation', templateSource: 'navigation' },
  { text: 'navigate via breadcrumb to {route}', primitive: 'click', placeholders: ['route'], category: 'navigation', templateSource: 'navigation' },

  // Tab navigation
  { text: 'click {route} tab', primitive: 'click', placeholders: ['route'], category: 'navigation', templateSource: 'navigation' },
  { text: 'switch to {route} tab', primitive: 'click', placeholders: ['route'], category: 'navigation', templateSource: 'navigation' },

  // Header/footer navigation
  { text: 'click {route} in header', primitive: 'click', placeholders: ['route'], category: 'navigation', templateSource: 'navigation' },
  { text: 'click {route} in footer', primitive: 'click', placeholders: ['route'], category: 'navigation', templateSource: 'navigation' },

  // Back/forward
  { text: 'go back', primitive: 'navigate', placeholders: [], category: 'navigation', templateSource: 'navigation' },
  { text: 'go forward', primitive: 'navigate', placeholders: [], category: 'navigation', templateSource: 'navigation' },
  { text: 'return to {route}', primitive: 'navigate', placeholders: ['route'], category: 'navigation', templateSource: 'navigation' },

  // Assertions
  { text: 'verify on {route} page', primitive: 'assert', placeholders: ['route'], category: 'assertion', templateSource: 'navigation' },
  { text: 'verify URL contains {route}', primitive: 'assert', placeholders: ['route'], category: 'assertion', templateSource: 'navigation' },
  { text: 'verify {route} is active in navigation', primitive: 'assert', placeholders: ['route'], category: 'assertion', templateSource: 'navigation' },
];

// =============================================================================
// Notification/Toast Templates
// =============================================================================

/**
 * Generic notification/toast operation templates.
 * Covers success, error, warning, info toasts for any app.
 * Framework-specific packs (MUI/Antd/Chakra) supplement these with
 * library-specific selectors.
 */
export const NOTIFICATION_TEMPLATES: PatternTemplate[] = [
  // Toast/notification appearance
  { text: 'a success notification appears', primitive: 'assert', placeholders: [], category: 'assertion', templateSource: 'static' },
  { text: 'an error notification appears', primitive: 'assert', placeholders: [], category: 'assertion', templateSource: 'static' },
  { text: 'a warning notification appears', primitive: 'assert', placeholders: [], category: 'assertion', templateSource: 'static' },
  { text: 'an info notification appears', primitive: 'assert', placeholders: [], category: 'assertion', templateSource: 'static' },
  { text: 'a toast message appears', primitive: 'assert', placeholders: [], category: 'assertion', templateSource: 'static' },
  { text: 'a notification with text {text} appears', primitive: 'assert', placeholders: ['text'], category: 'assertion', templateSource: 'static' },

  // Toast/notification content
  { text: 'verify success message is displayed', primitive: 'assert', placeholders: [], category: 'assertion', templateSource: 'static' },
  { text: 'verify error message is displayed', primitive: 'assert', placeholders: [], category: 'assertion', templateSource: 'static' },
  { text: 'verify notification contains {text}', primitive: 'assert', placeholders: ['text'], category: 'assertion', templateSource: 'static' },
  { text: 'verify toast shows {text}', primitive: 'assert', placeholders: ['text'], category: 'assertion', templateSource: 'static' },

  // Dismiss/close
  { text: 'dismiss notification', primitive: 'click', placeholders: [], category: 'ui-interaction', templateSource: 'static' },
  { text: 'close toast', primitive: 'click', placeholders: [], category: 'ui-interaction', templateSource: 'static' },
  { text: 'dismiss all notifications', primitive: 'click', placeholders: [], category: 'ui-interaction', templateSource: 'static' },

  // Wait for
  { text: 'wait for notification to appear', primitive: 'waitForVisible', placeholders: [], category: 'timing', templateSource: 'static' },
  { text: 'wait for toast to disappear', primitive: 'waitForVisible', placeholders: [], category: 'timing', templateSource: 'static' },
  { text: 'wait for notification to close', primitive: 'waitForVisible', placeholders: [], category: 'timing', templateSource: 'static' },

  // Alert dialogs
  { text: 'verify alert message contains {text}', primitive: 'assert', placeholders: ['text'], category: 'assertion', templateSource: 'static' },
  { text: 'accept alert dialog', primitive: 'click', placeholders: [], category: 'ui-interaction', templateSource: 'static' },
  { text: 'dismiss alert dialog', primitive: 'click', placeholders: [], category: 'ui-interaction', templateSource: 'static' },
  { text: 'verify alert is shown', primitive: 'assert', placeholders: [], category: 'assertion', templateSource: 'static' },
];

// =============================================================================
// Pattern ID Generation
// =============================================================================

/**
 * Generate a unique pattern ID
 */
function generatePatternId(): string {
  return `DP-${randomUUID().slice(0, 8)}`;
}

// =============================================================================
// Template Expansion Functions
// =============================================================================

/**
 * Expand a template with an entity to create patterns
 */
function expandEntityTemplate(
  template: PatternTemplate,
  entity: DiscoveredEntity,
  confidence: number = DEFAULT_GENERATED_CONFIDENCE
): DiscoveredPattern[] {
  const patterns: DiscoveredPattern[] = [];

  // Replace {entity} with singular
  if (template.placeholders.includes('entity')) {
    const text = template.text.replace('{entity}', entity.singular);
    patterns.push(createPattern(template, text, entity.singular, confidence));
  }

  // Replace {entities} with plural
  if (template.placeholders.includes('entities')) {
    const text = template.text.replace('{entities}', entity.plural);
    patterns.push(createPattern(template, text, entity.plural, confidence));
  }

  return patterns;
}

/**
 * Expand a template with a form to create patterns
 */
function expandFormTemplate(
  template: PatternTemplate,
  form: DiscoveredForm,
  confidence: number = DEFAULT_GENERATED_CONFIDENCE
): DiscoveredPattern[] {
  const patterns: DiscoveredPattern[] = [];

  // Replace {form} placeholder
  if (template.placeholders.includes('form') && !template.placeholders.includes('field')) {
    const text = template.text.replace('{form}', form.name);
    const selectorHints: SelectorHint[] = [];

    if (form.submitSelector && template.text.includes('submit')) {
      selectorHints.push({
        strategy: 'css',
        value: form.submitSelector,
        confidence: confidence + SELECTOR_CONFIDENCE_BOOST,
      });
    }

    patterns.push(createPattern(template, text, form.name, confidence, selectorHints));
  }

  // Generate field-specific patterns
  if (template.placeholders.includes('field')) {
    for (const field of form.fields) {
      let text = template.text.replace('{field}', field.label || field.name);
      if (template.placeholders.includes('form')) {
        text = text.replace('{form}', form.name);
      }

      const selectorHints: SelectorHint[] = [];
      if (field.selector) {
        selectorHints.push({
          strategy: 'css',
          value: field.selector,
          confidence: confidence + SELECTOR_CONFIDENCE_BOOST,
        });
      }

      patterns.push(createPattern(template, text, field.name, confidence, selectorHints));
    }
  }

  return patterns;
}

/**
 * Expand a template with a table to create patterns
 */
function expandTableTemplate(
  template: PatternTemplate,
  table: DiscoveredTable,
  confidence: number = DEFAULT_GENERATED_CONFIDENCE
): DiscoveredPattern[] {
  const patterns: DiscoveredPattern[] = [];

  // Table-only patterns
  if (template.placeholders.includes('table') && !template.placeholders.includes('column')) {
    const text = template.text.replace('{table}', table.name);
    const selectorHints: SelectorHint[] = [];

    if (table.selectors?.table) {
      selectorHints.push({
        strategy: 'css',
        value: table.selectors.table,
        confidence: confidence + SELECTOR_CONFIDENCE_BOOST,
      });
    }

    patterns.push(createPattern(template, text, table.name, confidence, selectorHints));
  }

  // Column-specific patterns
  if (template.placeholders.includes('column')) {
    for (const column of table.columns) {
      let text = template.text.replace('{column}', column);
      if (template.placeholders.includes('table')) {
        text = text.replace('{table}', table.name);
      }

      const selectorHints: SelectorHint[] = [];
      if (table.selectors?.header) {
        selectorHints.push({
          strategy: 'css',
          value: `${table.selectors.header}:has-text("${column}")`,
          confidence: confidence + SELECTOR_CONFIDENCE_BOOST * 0.5,
        });
      }

      patterns.push(createPattern(template, text, column, confidence, selectorHints));
    }
  }

  return patterns;
}

/**
 * Expand a template with a modal to create patterns
 */
function expandModalTemplate(
  template: PatternTemplate,
  modal: DiscoveredModal,
  confidence: number = DEFAULT_GENERATED_CONFIDENCE
): DiscoveredPattern[] {
  const patterns: DiscoveredPattern[] = [];

  if (template.placeholders.includes('modal')) {
    const text = template.text.replace('{modal}', modal.name);
    const selectorHints: SelectorHint[] = [];

    // Add appropriate selector based on action
    if (template.text.includes('open') && modal.triggerSelector) {
      selectorHints.push({
        strategy: 'css',
        value: modal.triggerSelector,
        confidence: confidence + SELECTOR_CONFIDENCE_BOOST,
      });
    } else if (template.text.includes('close') && modal.closeSelector) {
      selectorHints.push({
        strategy: 'css',
        value: modal.closeSelector,
        confidence: confidence + SELECTOR_CONFIDENCE_BOOST,
      });
    } else if ((template.text.includes('confirm') || template.text.includes('OK') || template.text.includes('Yes')) && modal.confirmSelector) {
      selectorHints.push({
        strategy: 'css',
        value: modal.confirmSelector,
        confidence: confidence + SELECTOR_CONFIDENCE_BOOST,
      });
    }

    patterns.push(createPattern(template, text, modal.name, confidence, selectorHints));
  }

  return patterns;
}

/**
 * Expand a template with a route to create patterns
 * Note: Templates with no placeholders are handled separately in generateNavigationPatterns
 */
function expandRouteTemplate(
  template: PatternTemplate,
  route: DiscoveredRoute,
  confidence: number = DEFAULT_GENERATED_CONFIDENCE
): DiscoveredPattern[] {
  const patterns: DiscoveredPattern[] = [];

  if (template.placeholders.includes('route')) {
    const text = template.text.replace('{route}', route.name);
    const selectorHints: SelectorHint[] = [];

    // Add navigation hints
    if (template.primitive === 'navigate') {
      selectorHints.push({
        strategy: 'text',
        value: route.name,
        confidence: confidence,
      });
    }

    patterns.push(createPattern(template, text, route.name, confidence, selectorHints));
  }

  return patterns;
}

/**
 * Create a DiscoveredPattern from template data
 */
function createPattern(
  template: PatternTemplate,
  text: string,
  entityName: string,
  confidence: number,
  selectorHints: SelectorHint[] = []
): DiscoveredPattern {
  return {
    id: generatePatternId(),
    normalizedText: text.toLowerCase(),
    originalText: text,
    mappedPrimitive: template.primitive,
    selectorHints,
    confidence: Math.min(confidence, MAX_CONFIDENCE),
    layer: 'app-specific',
    category: template.category,
    sourceJourneys: [],
    successCount: 0,
    failCount: 0,
    templateSource: template.templateSource,
    entityName: entityName || undefined,
  };
}

// =============================================================================
// Main Generation Functions
// =============================================================================

/**
 * Generate CRUD patterns from discovered entities
 */
export function generateCrudPatterns(
  entities: DiscoveredEntity[],
  confidence: number = DEFAULT_GENERATED_CONFIDENCE
): DiscoveredPattern[] {
  const patterns: DiscoveredPattern[] = [];

  for (const entity of entities) {
    for (const template of CRUD_TEMPLATES) {
      patterns.push(...expandEntityTemplate(template, entity, confidence));
    }
  }

  return patterns;
}

/**
 * Generate form patterns from discovered forms
 */
export function generateFormPatterns(
  forms: DiscoveredForm[],
  confidence: number = DEFAULT_GENERATED_CONFIDENCE
): DiscoveredPattern[] {
  const patterns: DiscoveredPattern[] = [];

  for (const form of forms) {
    for (const template of FORM_TEMPLATES) {
      patterns.push(...expandFormTemplate(template, form, confidence));
    }
  }

  return patterns;
}

/**
 * Generate table patterns from discovered tables
 */
export function generateTablePatterns(
  tables: DiscoveredTable[],
  confidence: number = DEFAULT_GENERATED_CONFIDENCE
): DiscoveredPattern[] {
  const patterns: DiscoveredPattern[] = [];

  for (const table of tables) {
    for (const template of TABLE_TEMPLATES) {
      patterns.push(...expandTableTemplate(template, table, confidence));
    }
  }

  return patterns;
}

/**
 * Generate modal patterns from discovered modals
 */
export function generateModalPatterns(
  modals: DiscoveredModal[],
  confidence: number = DEFAULT_GENERATED_CONFIDENCE
): DiscoveredPattern[] {
  const patterns: DiscoveredPattern[] = [];

  for (const modal of modals) {
    for (const template of MODAL_TEMPLATES) {
      patterns.push(...expandModalTemplate(template, modal, confidence));
    }
  }

  return patterns;
}

/**
 * Generate navigation patterns from discovered routes
 */
export function generateNavigationPatterns(
  routes: DiscoveredRoute[],
  confidence: number = DEFAULT_GENERATED_CONFIDENCE
): DiscoveredPattern[] {
  const patterns: DiscoveredPattern[] = [];
  const addedGenericPatterns = new Set<string>();

  for (const route of routes) {
    for (const template of EXTENDED_NAVIGATION_TEMPLATES) {
      // For templates with no placeholders (go back, go forward), only add once
      if (template.placeholders.length === 0) {
        if (!addedGenericPatterns.has(template.text)) {
          patterns.push(createPattern(template, template.text, '', confidence, []));
          addedGenericPatterns.add(template.text);
        }
      } else {
        patterns.push(...expandRouteTemplate(template, route, confidence));
      }
    }
  }

  return patterns;
}

/**
 * Generate generic notification/toast patterns.
 * These are static templates (no entity multiplication) to cover
 * the spec target of 20 notification patterns.
 */
export function generateNotificationPatterns(
  confidence: number = DEFAULT_GENERATED_CONFIDENCE
): DiscoveredPattern[] {
  return NOTIFICATION_TEMPLATES.map(template => createPattern(
    template,
    template.text,
    '',
    confidence,
    []
  ));
}

/**
 * Generate all patterns from discovered elements
 *
 * This is the main entry point for template multiplication.
 */
export function generateAllPatterns(
  elements: DiscoveredElements,
  confidence: number = DEFAULT_GENERATED_CONFIDENCE
): GenerationResult {
  const crudPatterns = generateCrudPatterns(elements.entities, confidence);
  const formPatterns = generateFormPatterns(elements.forms, confidence);
  const tablePatterns = generateTablePatterns(elements.tables, confidence);
  const modalPatterns = generateModalPatterns(elements.modals, confidence);
  const navigationPatterns = generateNavigationPatterns(elements.routes, confidence);
  const notificationPatterns = generateNotificationPatterns(confidence);

  let allPatterns = [
    ...crudPatterns,
    ...formPatterns,
    ...tablePatterns,
    ...modalPatterns,
    ...navigationPatterns,
    ...notificationPatterns,
  ];

  // Safety cap: truncate by confidence if multiplication produces too many patterns
  if (allPatterns.length > MAX_GENERATED_PATTERNS) {
    allPatterns.sort((a, b) => b.confidence - a.confidence);
    allPatterns = allPatterns.slice(0, MAX_GENERATED_PATTERNS);
  }

  return {
    patterns: allPatterns,
    stats: {
      crudPatterns: crudPatterns.length,
      formPatterns: formPatterns.length,
      tablePatterns: tablePatterns.length,
      modalPatterns: modalPatterns.length,
      navigationPatterns: navigationPatterns.length,
      notificationPatterns: notificationPatterns.length,
      totalPatterns: allPatterns.length,
    },
  };
}

// =============================================================================
// Helper Functions for Common Entities
// =============================================================================
// ARCH-001 FIX: pluralize and singularize are now imported from './pluralization.js'

/**
 * Create a simple entity from a name
 */
export function createEntity(name: string): DiscoveredEntity {
  const lower = name.toLowerCase();

  // Determine if input is likely singular or plural
  const likelySingular = singularize(lower);
  const likelyPlural = pluralize(likelySingular);

  // Use singularized form as the singular
  const singular = likelySingular;
  const plural = likelyPlural;

  return {
    name,
    singular,
    plural,
  };
}

/**
 * Create a simple form from a name
 */
export function createForm(name: string, fields: string[] = []): DiscoveredForm {
  return {
    id: `form-${name.toLowerCase().replace(/\s+/g, '-')}`,
    name,
    fields: fields.map(f => ({
      name: f.toLowerCase().replace(/\s+/g, '_'),
      type: 'text',
      label: f,
    })),
  };
}

/**
 * Create a simple table from a name
 */
export function createTable(name: string, columns: string[] = []): DiscoveredTable {
  return {
    id: `table-${name.toLowerCase().replace(/\s+/g, '-')}`,
    name,
    columns,
  };
}

/**
 * Create a simple modal from a name
 */
export function createModal(name: string): DiscoveredModal {
  return {
    id: `modal-${name.toLowerCase().replace(/\s+/g, '-')}`,
    name,
  };
}

/**
 * Create a simple route from a path
 */
export function createRoute(path: string, name?: string): DiscoveredRoute {
  const routeName = name || path.split('/').filter(Boolean).pop() || 'home';

  return {
    path,
    name: routeName.charAt(0).toUpperCase() + routeName.slice(1),
  };
}
