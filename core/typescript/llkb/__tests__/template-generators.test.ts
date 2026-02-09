/**
 * Template Generators Module Tests
 *
 * Tests for LLKB template multiplication that generates patterns
 * by combining templates with discovered entities.
 *
 * @module llkb/__tests__/template-generators.test.ts
 */

import { describe, expect, it } from 'vitest';

import {
  createEntity,
  createForm,
  createModal,
  createRoute,
  createTable,
  CRUD_TEMPLATES,
  type DiscoveredElements,
  type DiscoveredEntity,
  type DiscoveredForm,
  type DiscoveredModal,
  type DiscoveredRoute,
  type DiscoveredTable,
  EXTENDED_NAVIGATION_TEMPLATES,
  FORM_TEMPLATES,
  generateAllPatterns,
  generateCrudPatterns,
  generateFormPatterns,
  generateModalPatterns,
  generateNavigationPatterns,
  generateTablePatterns,
  MODAL_TEMPLATES,
  TABLE_TEMPLATES,
} from '../template-generators.js';

// =============================================================================
// Test Fixtures
// =============================================================================

function createMockEntity(name: string, overrides: Partial<DiscoveredEntity> = {}): DiscoveredEntity {
  return {
    name,
    singular: name.toLowerCase(),
    plural: name.toLowerCase() + 's',
    ...overrides,
  };
}

function createMockForm(name: string, fields: string[] = ['Name', 'Email']): DiscoveredForm {
  return {
    id: `form-${name.toLowerCase()}`,
    name,
    fields: fields.map(f => ({
      name: f.toLowerCase(),
      type: 'text',
      label: f,
    })),
  };
}

function createMockTable(name: string, columns: string[] = ['Name', 'Status']): DiscoveredTable {
  return {
    id: `table-${name.toLowerCase()}`,
    name,
    columns,
  };
}

function createMockModal(name: string, overrides: Partial<DiscoveredModal> = {}): DiscoveredModal {
  return {
    id: `modal-${name.toLowerCase()}`,
    name,
    ...overrides,
  };
}

function createMockRoute(path: string, name: string): DiscoveredRoute {
  return {
    path,
    name,
  };
}

// =============================================================================
// CRUD Pattern Generation Tests
// =============================================================================

describe('generateCrudPatterns', () => {
  it('should generate patterns for a single entity', () => {
    const entities = [createMockEntity('User')];

    const patterns = generateCrudPatterns(entities);

    expect(patterns.length).toBeGreaterThan(0);
    // Should have at least create, read, update, delete patterns
    expect(patterns.some(p => p.normalizedText.includes('create'))).toBe(true);
    expect(patterns.some(p => p.normalizedText.includes('view'))).toBe(true);
    expect(patterns.some(p => p.normalizedText.includes('edit'))).toBe(true);
    expect(patterns.some(p => p.normalizedText.includes('delete'))).toBe(true);
  });

  it('should multiply patterns by number of entities', () => {
    const singleEntity = [createMockEntity('User')];
    const multipleEntities = [
      createMockEntity('User'),
      createMockEntity('Product'),
      createMockEntity('Order'),
    ];

    const singlePatterns = generateCrudPatterns(singleEntity);
    const multiplePatterns = generateCrudPatterns(multipleEntities);

    expect(multiplePatterns.length).toBe(singlePatterns.length * 3);
  });

  it('should use entity singular form in patterns', () => {
    const entities = [createMockEntity('Order', { singular: 'order' })];

    const patterns = generateCrudPatterns(entities);
    const createPattern = patterns.find(p => p.normalizedText === 'create new order');

    expect(createPattern).toBeDefined();
  });

  it('should use entity plural form in filter patterns', () => {
    const entities = [createMockEntity('Product', { plural: 'products' })];

    const patterns = generateCrudPatterns(entities);
    const filterPattern = patterns.find(p => p.normalizedText.includes('filter products'));

    expect(filterPattern).toBeDefined();
  });

  it('should set correct templateSource for all patterns', () => {
    const entities = [createMockEntity('User')];

    const patterns = generateCrudPatterns(entities);

    expect(patterns.every(p => p.templateSource === 'crud')).toBe(true);
  });

  it('should set category to data for CRUD patterns', () => {
    const entities = [createMockEntity('User')];

    const patterns = generateCrudPatterns(entities);

    expect(patterns.every(p => p.category === 'data')).toBe(true);
  });

  it('should generate unique IDs for each pattern', () => {
    const entities = [createMockEntity('User'), createMockEntity('Product')];

    const patterns = generateCrudPatterns(entities);
    const ids = patterns.map(p => p.id);
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should return empty array for empty entities', () => {
    const patterns = generateCrudPatterns([]);

    expect(patterns).toHaveLength(0);
  });

  it('should apply custom confidence level', () => {
    const entities = [createMockEntity('User')];

    const patterns = generateCrudPatterns(entities, 0.85);

    expect(patterns.every(p => p.confidence === 0.85)).toBe(true);
  });
});

// =============================================================================
// Form Pattern Generation Tests
// =============================================================================

describe('generateFormPatterns', () => {
  it('should generate form-level patterns', () => {
    const forms = [createMockForm('Login', ['Username', 'Password'])];

    const patterns = generateFormPatterns(forms);

    expect(patterns.some(p => p.normalizedText.includes('fill login form'))).toBe(true);
    expect(patterns.some(p => p.normalizedText.includes('submit login form'))).toBe(true);
  });

  it('should generate field-level patterns for each field', () => {
    const forms = [createMockForm('Registration', ['Name', 'Email', 'Phone'])];

    const patterns = generateFormPatterns(forms);

    expect(patterns.some(p => p.normalizedText.includes('name'))).toBe(true);
    expect(patterns.some(p => p.normalizedText.includes('email'))).toBe(true);
    expect(patterns.some(p => p.normalizedText.includes('phone'))).toBe(true);
  });

  it('should multiply patterns by number of forms', () => {
    const singleForm = [createMockForm('Login')];
    const multipleForms = [
      createMockForm('Login'),
      createMockForm('Register'),
      createMockForm('Settings'),
    ];

    const singlePatterns = generateFormPatterns(singleForm);
    const multiplePatterns = generateFormPatterns(multipleForms);

    // Multiple forms should have more patterns (roughly 3x for form-level + proportional field-level)
    expect(multiplePatterns.length).toBeGreaterThan(singlePatterns.length);
  });

  it('should include selector hints when submit selector is provided', () => {
    const forms: DiscoveredForm[] = [{
      id: 'login-form',
      name: 'Login',
      fields: [],
      submitSelector: 'button[type="submit"]',
    }];

    const patterns = generateFormPatterns(forms);
    const submitPattern = patterns.find(p => p.normalizedText.includes('submit'));

    expect(submitPattern).toBeDefined();
    expect(submitPattern!.selectorHints.length).toBeGreaterThan(0);
    expect(submitPattern!.selectorHints[0].value).toBe('button[type="submit"]');
  });

  it('should set correct templateSource for all patterns', () => {
    const forms = [createMockForm('Contact')];

    const patterns = generateFormPatterns(forms);

    expect(patterns.every(p => p.templateSource === 'form')).toBe(true);
  });

  it('should return empty array for empty forms', () => {
    const patterns = generateFormPatterns([]);

    expect(patterns).toHaveLength(0);
  });
});

// =============================================================================
// Table Pattern Generation Tests
// =============================================================================

describe('generateTablePatterns', () => {
  it('should generate table-level patterns', () => {
    const tables = [createMockTable('Users', ['Name', 'Email', 'Status'])];

    const patterns = generateTablePatterns(tables);

    expect(patterns.some(p => p.normalizedText.includes('click row in users'))).toBe(true);
    expect(patterns.some(p => p.normalizedText.includes('select row in users'))).toBe(true);
  });

  it('should generate column-specific patterns for each column', () => {
    const tables = [createMockTable('Orders', ['ID', 'Customer', 'Amount', 'Date'])];

    const patterns = generateTablePatterns(tables);

    expect(patterns.some(p => p.normalizedText.includes('sort id'))).toBe(true);
    expect(patterns.some(p => p.normalizedText.includes('sort customer'))).toBe(true);
    expect(patterns.some(p => p.normalizedText.includes('sort amount'))).toBe(true);
  });

  it('should multiply patterns by number of tables', () => {
    const singleTable = [createMockTable('Users')];
    const multipleTables = [
      createMockTable('Users'),
      createMockTable('Products'),
    ];

    const singlePatterns = generateTablePatterns(singleTable);
    const multiplePatterns = generateTablePatterns(multipleTables);

    expect(multiplePatterns.length).toBeGreaterThan(singlePatterns.length);
  });

  it('should include selector hints when table selector is provided', () => {
    const tables: DiscoveredTable[] = [{
      id: 'users-table',
      name: 'Users',
      columns: ['Name'],
      selectors: {
        table: '[data-testid="users-table"]',
      },
    }];

    const patterns = generateTablePatterns(tables);
    const tablePattern = patterns.find(p =>
      p.normalizedText.includes('click row in users') && !p.normalizedText.includes('column')
    );

    expect(tablePattern).toBeDefined();
    expect(tablePattern!.selectorHints.length).toBeGreaterThan(0);
  });

  it('should set correct templateSource for all patterns', () => {
    const tables = [createMockTable('Products')];

    const patterns = generateTablePatterns(tables);

    expect(patterns.every(p => p.templateSource === 'table')).toBe(true);
  });

  it('should return empty array for empty tables', () => {
    const patterns = generateTablePatterns([]);

    expect(patterns).toHaveLength(0);
  });
});

// =============================================================================
// Modal Pattern Generation Tests
// =============================================================================

describe('generateModalPatterns', () => {
  it('should generate open/close patterns', () => {
    const modals = [createMockModal('Confirmation')];

    const patterns = generateModalPatterns(modals);

    expect(patterns.some(p => p.normalizedText.includes('open confirmation'))).toBe(true);
    expect(patterns.some(p => p.normalizedText.includes('close confirmation'))).toBe(true);
  });

  it('should generate action patterns (confirm, cancel)', () => {
    const modals = [createMockModal('Delete')];

    const patterns = generateModalPatterns(modals);

    expect(patterns.some(p => p.normalizedText.includes('confirm delete'))).toBe(true);
    expect(patterns.some(p => p.normalizedText.includes('cancel delete'))).toBe(true);
  });

  it('should multiply patterns by number of modals', () => {
    const singleModal = [createMockModal('Alert')];
    const multipleModals = [
      createMockModal('Alert'),
      createMockModal('Confirm'),
      createMockModal('Settings'),
    ];

    const singlePatterns = generateModalPatterns(singleModal);
    const multiplePatterns = generateModalPatterns(multipleModals);

    expect(multiplePatterns.length).toBe(singlePatterns.length * 3);
  });

  it('should include trigger selector hint for open patterns', () => {
    const modals: DiscoveredModal[] = [{
      id: 'settings-modal',
      name: 'Settings',
      triggerSelector: 'button[data-testid="open-settings"]',
    }];

    const patterns = generateModalPatterns(modals);
    const openPattern = patterns.find(p => p.normalizedText.includes('open settings'));

    expect(openPattern).toBeDefined();
    expect(openPattern!.selectorHints.length).toBeGreaterThan(0);
    expect(openPattern!.selectorHints[0].value).toBe('button[data-testid="open-settings"]');
  });

  it('should include close selector hint for close patterns', () => {
    const modals: DiscoveredModal[] = [{
      id: 'help-modal',
      name: 'Help',
      closeSelector: 'button[aria-label="Close"]',
    }];

    const patterns = generateModalPatterns(modals);
    const closePattern = patterns.find(p => p.normalizedText.includes('close help'));

    expect(closePattern).toBeDefined();
    expect(closePattern!.selectorHints.some(h => h.value === 'button[aria-label="Close"]')).toBe(true);
  });

  it('should set correct templateSource for all patterns', () => {
    const modals = [createMockModal('Alert')];

    const patterns = generateModalPatterns(modals);

    expect(patterns.every(p => p.templateSource === 'modal')).toBe(true);
  });

  it('should return empty array for empty modals', () => {
    const patterns = generateModalPatterns([]);

    expect(patterns).toHaveLength(0);
  });
});

// =============================================================================
// Navigation Pattern Generation Tests
// =============================================================================

describe('generateNavigationPatterns', () => {
  it('should generate navigate patterns', () => {
    const routes = [createMockRoute('/dashboard', 'Dashboard')];

    const patterns = generateNavigationPatterns(routes);

    expect(patterns.some(p => p.normalizedText === 'navigate to dashboard')).toBe(true);
    expect(patterns.some(p => p.normalizedText === 'go to dashboard')).toBe(true);
  });

  it('should generate menu/sidebar click patterns', () => {
    const routes = [createMockRoute('/settings', 'Settings')];

    const patterns = generateNavigationPatterns(routes);

    expect(patterns.some(p => p.normalizedText.includes('click settings in navigation'))).toBe(true);
    expect(patterns.some(p => p.normalizedText.includes('click settings in sidebar'))).toBe(true);
    expect(patterns.some(p => p.normalizedText.includes('click settings in menu'))).toBe(true);
  });

  it('should multiply patterns by number of routes', () => {
    const singleRoute = [createMockRoute('/home', 'Home')];
    const multipleRoutes = [
      createMockRoute('/home', 'Home'),
      createMockRoute('/about', 'About'),
      createMockRoute('/contact', 'Contact'),
    ];

    const singlePatterns = generateNavigationPatterns(singleRoute);
    const multiplePatterns = generateNavigationPatterns(multipleRoutes);

    // Multiple routes should have proportionally more patterns
    expect(multiplePatterns.length).toBeGreaterThan(singlePatterns.length);
  });

  it('should generate assertion patterns', () => {
    const routes = [createMockRoute('/profile', 'Profile')];

    const patterns = generateNavigationPatterns(routes);

    expect(patterns.some(p => p.normalizedText.includes('verify on profile page'))).toBe(true);
    expect(patterns.some(p => p.normalizedText.includes('verify url contains profile'))).toBe(true);
  });

  it('should generate generic back/forward patterns', () => {
    const routes = [createMockRoute('/any', 'Any')];

    const patterns = generateNavigationPatterns(routes);

    expect(patterns.some(p => p.normalizedText === 'go back')).toBe(true);
    expect(patterns.some(p => p.normalizedText === 'go forward')).toBe(true);
  });

  it('should set correct templateSource for all patterns', () => {
    const routes = [createMockRoute('/test', 'Test')];

    const patterns = generateNavigationPatterns(routes);

    expect(patterns.every(p => p.templateSource === 'navigation')).toBe(true);
  });

  it('should return empty array for empty routes', () => {
    const patterns = generateNavigationPatterns([]);

    expect(patterns).toHaveLength(0);
  });
});

// =============================================================================
// generateAllPatterns Tests
// =============================================================================

describe('generateAllPatterns', () => {
  it('should combine all pattern types', () => {
    const elements: DiscoveredElements = {
      entities: [createMockEntity('User')],
      routes: [createMockRoute('/home', 'Home')],
      forms: [createMockForm('Login')],
      tables: [createMockTable('Users')],
      modals: [createMockModal('Confirm')],
    };

    const result = generateAllPatterns(elements);

    expect(result.stats.crudPatterns).toBeGreaterThan(0);
    expect(result.stats.formPatterns).toBeGreaterThan(0);
    expect(result.stats.tablePatterns).toBeGreaterThan(0);
    expect(result.stats.modalPatterns).toBeGreaterThan(0);
    expect(result.stats.navigationPatterns).toBeGreaterThan(0);
    expect(result.stats.totalPatterns).toBe(result.patterns.length);
  });

  it('should report correct statistics', () => {
    const elements: DiscoveredElements = {
      entities: [createMockEntity('Product')],
      routes: [createMockRoute('/products', 'Products')],
      forms: [createMockForm('Add Product', ['Name', 'Price'])],
      tables: [createMockTable('Products', ['Name', 'Price', 'Stock'])],
      modals: [createMockModal('Delete Product')],
    };

    const result = generateAllPatterns(elements);

    const expectedTotal =
      result.stats.crudPatterns +
      result.stats.formPatterns +
      result.stats.tablePatterns +
      result.stats.modalPatterns +
      result.stats.navigationPatterns +
      result.stats.notificationPatterns;

    expect(result.stats.totalPatterns).toBe(expectedTotal);
  });

  it('should handle empty elements (still generates notification patterns)', () => {
    const elements: DiscoveredElements = {
      entities: [],
      routes: [],
      forms: [],
      tables: [],
      modals: [],
    };

    const result = generateAllPatterns(elements);

    // Notification patterns are static (no entity multiplication), so always present
    expect(result.stats.crudPatterns).toBe(0);
    expect(result.stats.formPatterns).toBe(0);
    expect(result.stats.tablePatterns).toBe(0);
    expect(result.stats.modalPatterns).toBe(0);
    expect(result.stats.navigationPatterns).toBe(0);
    expect(result.stats.notificationPatterns).toBeGreaterThan(0);
    expect(result.stats.totalPatterns).toBe(result.stats.notificationPatterns);
  });

  it('should apply custom confidence to all patterns', () => {
    const elements: DiscoveredElements = {
      entities: [createMockEntity('Test')],
      routes: [],
      forms: [],
      tables: [],
      modals: [],
    };

    const result = generateAllPatterns(elements, 0.9);

    expect(result.patterns.every(p => p.confidence === 0.9)).toBe(true);
  });

  it('should generate expected number of patterns for typical project', () => {
    // Simulate a typical project with multiple entities
    const elements: DiscoveredElements = {
      entities: [
        createMockEntity('User'),
        createMockEntity('Product'),
        createMockEntity('Order'),
      ],
      routes: [
        createMockRoute('/dashboard', 'Dashboard'),
        createMockRoute('/users', 'Users'),
        createMockRoute('/products', 'Products'),
        createMockRoute('/orders', 'Orders'),
        createMockRoute('/settings', 'Settings'),
      ],
      forms: [
        createMockForm('Login', ['Email', 'Password']),
        createMockForm('User', ['Name', 'Email', 'Role']),
        createMockForm('Product', ['Name', 'Price', 'Description']),
      ],
      tables: [
        createMockTable('Users', ['Name', 'Email', 'Status']),
        createMockTable('Products', ['Name', 'Price', 'Stock']),
      ],
      modals: [
        createMockModal('Confirm Delete'),
        createMockModal('Edit User'),
        createMockModal('Settings'),
      ],
    };

    const result = generateAllPatterns(elements);

    // Should generate substantial number of patterns (target: 300-400)
    expect(result.stats.totalPatterns).toBeGreaterThan(100);
  });
});

// =============================================================================
// Helper Function Tests
// =============================================================================

describe('createEntity', () => {
  it('should create entity with singular and plural forms', () => {
    const entity = createEntity('Product');

    expect(entity.name).toBe('Product');
    expect(entity.singular).toBe('product');
    expect(entity.plural).toBe('products');
  });

  it('should handle already plural names', () => {
    const entity = createEntity('Users');

    // Singularization correctly detects "Users" as plural and computes singular
    expect(entity.singular).toBe('user');
    expect(entity.plural).toBe('users');
  });
});

describe('createForm', () => {
  it('should create form with fields', () => {
    const form = createForm('Contact', ['Name', 'Email', 'Message']);

    expect(form.name).toBe('Contact');
    expect(form.fields).toHaveLength(3);
    expect(form.fields[0].label).toBe('Name');
    expect(form.fields[0].type).toBe('text');
  });

  it('should generate ID from name', () => {
    const form = createForm('User Registration');

    expect(form.id).toBe('form-user-registration');
  });
});

describe('createTable', () => {
  it('should create table with columns', () => {
    const table = createTable('Inventory', ['SKU', 'Name', 'Quantity']);

    expect(table.name).toBe('Inventory');
    expect(table.columns).toEqual(['SKU', 'Name', 'Quantity']);
  });

  it('should generate ID from name', () => {
    const table = createTable('User List');

    expect(table.id).toBe('table-user-list');
  });
});

describe('createModal', () => {
  it('should create modal with name', () => {
    const modal = createModal('Confirmation');

    expect(modal.name).toBe('Confirmation');
    expect(modal.id).toBe('modal-confirmation');
  });

  it('should generate ID from name with spaces', () => {
    const modal = createModal('Delete Confirmation');

    expect(modal.id).toBe('modal-delete-confirmation');
  });
});

describe('createRoute', () => {
  it('should create route with path and name', () => {
    const route = createRoute('/users', 'Users');

    expect(route.path).toBe('/users');
    expect(route.name).toBe('Users');
  });

  it('should derive name from path if not provided', () => {
    const route = createRoute('/products');

    expect(route.name).toBe('Products');
  });

  it('should handle nested paths', () => {
    const route = createRoute('/admin/users/settings');

    expect(route.name).toBe('Settings');
  });

  it('should handle root path', () => {
    const route = createRoute('/');

    expect(route.name).toBe('Home');
  });
});

// =============================================================================
// Template Constants Tests
// =============================================================================

describe('CRUD_TEMPLATES', () => {
  it('should have create, read, update, delete operations', () => {
    const operations = ['create', 'view', 'edit', 'delete'];

    for (const op of operations) {
      expect(CRUD_TEMPLATES.some(t => t.text.includes(op))).toBe(true);
    }
  });

  it('should use {entity} or {entities} placeholders', () => {
    for (const template of CRUD_TEMPLATES) {
      expect(
        template.placeholders.includes('entity') ||
        template.placeholders.includes('entities')
      ).toBe(true);
    }
  });

  it('should have minimum expected templates', () => {
    // At least 5 operations x 4 variations = 20 templates
    expect(CRUD_TEMPLATES.length).toBeGreaterThanOrEqual(20);
  });
});

describe('FORM_TEMPLATES', () => {
  it('should have form and field operations', () => {
    const formOps = FORM_TEMPLATES.filter(t => t.placeholders.includes('form'));
    const fieldOps = FORM_TEMPLATES.filter(t => t.placeholders.includes('field'));

    expect(formOps.length).toBeGreaterThan(0);
    expect(fieldOps.length).toBeGreaterThan(0);
  });

  it('should include validation patterns', () => {
    expect(FORM_TEMPLATES.some(t => t.text.includes('verify') || t.text.includes('error'))).toBe(true);
  });
});

describe('TABLE_TEMPLATES', () => {
  it('should have row and column operations', () => {
    const rowOps = TABLE_TEMPLATES.filter(t => t.text.includes('row'));
    const colOps = TABLE_TEMPLATES.filter(t => t.placeholders.includes('column'));

    expect(rowOps.length).toBeGreaterThan(0);
    expect(colOps.length).toBeGreaterThan(0);
  });

  it('should include pagination patterns', () => {
    expect(TABLE_TEMPLATES.some(t => t.text.includes('page'))).toBe(true);
  });
});

describe('MODAL_TEMPLATES', () => {
  it('should have open, close, and action patterns', () => {
    expect(MODAL_TEMPLATES.some(t => t.text.includes('open'))).toBe(true);
    expect(MODAL_TEMPLATES.some(t => t.text.includes('close'))).toBe(true);
    expect(MODAL_TEMPLATES.some(t => t.text.includes('confirm'))).toBe(true);
    expect(MODAL_TEMPLATES.some(t => t.text.includes('cancel'))).toBe(true);
  });
});

describe('EXTENDED_NAVIGATION_TEMPLATES', () => {
  it('should have direct navigation patterns', () => {
    expect(EXTENDED_NAVIGATION_TEMPLATES.some(t => t.text.includes('navigate to'))).toBe(true);
    expect(EXTENDED_NAVIGATION_TEMPLATES.some(t => t.text.includes('go to'))).toBe(true);
  });

  it('should have menu/sidebar navigation patterns', () => {
    expect(EXTENDED_NAVIGATION_TEMPLATES.some(t => t.text.includes('sidebar'))).toBe(true);
    expect(EXTENDED_NAVIGATION_TEMPLATES.some(t => t.text.includes('menu'))).toBe(true);
  });

  it('should be more comprehensive than basic navigation', () => {
    // Should have significantly more patterns than the basic 8
    expect(EXTENDED_NAVIGATION_TEMPLATES.length).toBeGreaterThan(15);
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Template Generation Integration', () => {
  it('should generate sufficient patterns for spec compliance', () => {
    // Create a realistic project structure
    const elements: DiscoveredElements = {
      entities: Array.from({ length: 12 }, (_, i) => createMockEntity(`Entity${i + 1}`)),
      routes: Array.from({ length: 8 }, (_, i) => createMockRoute(`/route${i + 1}`, `Route${i + 1}`)),
      forms: Array.from({ length: 10 }, (_, i) => createMockForm(`Form${i + 1}`, ['Field1', 'Field2', 'Field3'])),
      tables: Array.from({ length: 6 }, (_, i) => createMockTable(`Table${i + 1}`, ['Col1', 'Col2', 'Col3'])),
      modals: Array.from({ length: 8 }, (_, i) => createMockModal(`Modal${i + 1}`)),
    };

    const result = generateAllPatterns(elements);

    // Target: 300-400 patterns
    expect(result.stats.totalPatterns).toBeGreaterThan(300);
  });

  it('should not generate duplicate patterns within same category', () => {
    const elements: DiscoveredElements = {
      entities: [createMockEntity('Test')],
      routes: [],
      forms: [],
      tables: [],
      modals: [],
    };

    const result = generateAllPatterns(elements);
    const texts = result.patterns.map(p => p.normalizedText);
    const uniqueTexts = new Set(texts);

    expect(uniqueTexts.size).toBe(texts.length);
  });

  it('should generate patterns with correct layer assignments', () => {
    const elements: DiscoveredElements = {
      entities: [createMockEntity('User')],
      routes: [createMockRoute('/home', 'Home')],
      forms: [],
      tables: [],
      modals: [],
    };

    const result = generateAllPatterns(elements);

    // All generated patterns should be app-specific layer
    expect(result.patterns.every(p => p.layer === 'app-specific')).toBe(true);
  });

  it('should initialize patterns with zero success/fail counts', () => {
    const elements: DiscoveredElements = {
      entities: [createMockEntity('Test')],
      routes: [],
      forms: [],
      tables: [],
      modals: [],
    };

    const result = generateAllPatterns(elements);

    expect(result.patterns.every(p => p.successCount === 0)).toBe(true);
    expect(result.patterns.every(p => p.failCount === 0)).toBe(true);
  });

  it('should cap confidence at MAX_CONFIDENCE', () => {
    const elements: DiscoveredElements = {
      entities: [createMockEntity('Test')],
      routes: [],
      forms: [],
      tables: [],
      modals: [],
    };

    // Try to set confidence above max
    const result = generateAllPatterns(elements, 0.99);

    expect(result.patterns.every(p => p.confidence <= 0.95)).toBe(true);
  });
});
