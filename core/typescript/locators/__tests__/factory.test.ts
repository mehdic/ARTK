/**
 * Unit tests for locator factory and scoped locators
 *
 * @group unit
 * @group locators
 */

import { describe, expect, it, vi } from 'vitest';
import type { Locator, Page } from '@playwright/test';
import {
  createConfigFromSelectors,
  createDefaultConfig,
  locate,
  withinForm,
  withinSection,
  withinTable,
} from '../factory.js';
import type { LocatorFactoryConfig } from '../types.js';

// =============================================================================
// Mock Helpers
// =============================================================================

function createMockPage(): Page {
  const mockLocator: Partial<Locator> = {
    _selector: '.mock-selector',
  };

  return {
    getByRole: vi.fn().mockReturnValue(mockLocator),
    getByLabel: vi.fn().mockReturnValue(mockLocator),
    getByPlaceholder: vi.fn().mockReturnValue(mockLocator),
    getByText: vi.fn().mockReturnValue(mockLocator),
    locator: vi.fn().mockReturnValue(mockLocator),
  } as any;
}

function createMockLocator(): Locator {
  const mockNested: any = {
    _selector: '.nested',
    nth: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    first: vi.fn().mockReturnThis(),
    and: vi.fn().mockReturnThis(),
  };

  return {
    page: vi.fn().mockReturnValue(createMockPage()),
    locator: vi.fn().mockReturnValue(mockNested),
    getByLabel: vi.fn().mockReturnValue(mockNested),
    getByRole: vi.fn().mockReturnValue(mockNested),
    _selector: '.mock',
  } as any;
}

// =============================================================================
// locate Tests
// =============================================================================

describe('locate', () => {
  it('should try role strategy first when configured', () => {
    const page = createMockPage();
    const config: LocatorFactoryConfig = {
      strategies: ['role', 'testid', 'css'],
      testIdAttribute: 'data-testid',
    };

    locate(page, 'button', config);

    expect(page.getByRole).toHaveBeenCalled();
  });

  it('should try testid strategy when configured', () => {
    const page = createMockPage();
    const config: LocatorFactoryConfig = {
      strategies: ['testid', 'css'],
      testIdAttribute: 'data-testid',
    };

    locate(page, 'submit', config);

    expect(page.locator).toHaveBeenCalled();
  });

  it('should fall back to CSS selector if all strategies fail', () => {
    const page = {
      getByRole: vi.fn().mockImplementation(() => {
        throw new Error('Not found');
      }),
      locator: vi.fn().mockReturnValue({}),
    } as any;

    const config: LocatorFactoryConfig = {
      strategies: ['role', 'css'],
      testIdAttribute: 'data-testid',
    };

    locate(page, 'button', config);

    expect(page.locator).toHaveBeenCalledWith('button');
  });

  it('should pass options to strategies', () => {
    const page = createMockPage();
    const config: LocatorFactoryConfig = {
      strategies: ['role'],
      testIdAttribute: 'data-testid',
    };
    const options = { name: 'Submit', exact: true };

    locate(page, 'button', config, options);

    expect(page.getByRole).toHaveBeenCalledWith('button', options);
  });

  it('should try strategies in configured order', () => {
    const callOrder: string[] = [];
    const page = {
      getByRole: vi.fn().mockImplementation(() => {
        callOrder.push('role');
        throw new Error('Not found');
      }),
      getByLabel: vi.fn().mockImplementation(() => {
        callOrder.push('label');
        throw new Error('Not found');
      }),
      locator: vi.fn().mockImplementation((sel) => {
        callOrder.push('css');
        return {};
      }),
    } as any;

    const config: LocatorFactoryConfig = {
      strategies: ['role', 'label', 'css'],
      testIdAttribute: 'data-testid',
    };

    locate(page, 'button', config);

    expect(callOrder).toEqual(['role', 'label', 'css']);
  });
});

// =============================================================================
// withinForm Tests
// =============================================================================

describe('withinForm', () => {
  const config: LocatorFactoryConfig = {
    strategies: ['testid', 'css'],
    testIdAttribute: 'data-testid',
  };

  it('should create form locators interface', () => {
    const formLocator = createMockLocator();

    const form = withinForm(formLocator, config);

    expect(form).toHaveProperty('field');
    expect(form).toHaveProperty('fieldByLabel');
    expect(form).toHaveProperty('submit');
    expect(form).toHaveProperty('cancel');
    expect(form).toHaveProperty('error');
  });

  it('should locate field by name attribute', () => {
    const formLocator = createMockLocator();

    const form = withinForm(formLocator, config);
    form.field('username');

    expect(formLocator.locator).toHaveBeenCalledWith('[name="username"]');
  });

  it('should locate field by label', () => {
    const formLocator = createMockLocator();

    const form = withinForm(formLocator, config);
    form.fieldByLabel('Email');

    expect(formLocator.getByLabel).toHaveBeenCalledWith('Email');
  });

  it('should locate submit button', () => {
    const formLocator = createMockLocator();

    const form = withinForm(formLocator, config);
    const submitButton = form.submit();

    expect(submitButton).toBeDefined();
  });

  it('should locate cancel button', () => {
    const formLocator = createMockLocator();

    const form = withinForm(formLocator, config);
    const cancelButton = form.cancel();

    expect(cancelButton).toBeDefined();
  });

  it('should locate error message for field', () => {
    const formLocator = createMockLocator();

    const form = withinForm(formLocator, config);
    form.error('email');

    expect(formLocator.locator).toHaveBeenCalled();
  });
});

// =============================================================================
// withinTable Tests
// =============================================================================

describe('withinTable', () => {
  it('should create table locators interface', () => {
    const tableLocator = createMockLocator();

    const table = withinTable(tableLocator);

    expect(table).toHaveProperty('row');
    expect(table).toHaveProperty('rowContaining');
    expect(table).toHaveProperty('cell');
    expect(table).toHaveProperty('header');
  });

  it('should locate row by index', () => {
    const mockNested = {
      nth: vi.fn().mockReturnThis(),
    };
    const tableLocator = {
      locator: vi.fn().mockReturnValue(mockNested),
    } as any;

    const table = withinTable(tableLocator);
    table.row(0);

    expect(tableLocator.locator).toHaveBeenCalledWith('tbody tr');
    expect(mockNested.nth).toHaveBeenCalledWith(0);
  });

  it('should locate row containing text', () => {
    const mockNested = {
      filter: vi.fn().mockReturnThis(),
    };
    const tableLocator = {
      locator: vi.fn().mockReturnValue(mockNested),
    } as any;

    const table = withinTable(tableLocator);
    table.rowContaining('john@example.com');

    expect(tableLocator.locator).toHaveBeenCalledWith('tbody tr');
    expect(mockNested.filter).toHaveBeenCalledWith({
      hasText: 'john@example.com',
    });
  });

  it('should locate cell by row and column index', () => {
    const mockCell = {
      nth: vi.fn().mockReturnThis(),
    };
    const mockRow = {
      nth: vi.fn().mockReturnThis(),
      locator: vi.fn().mockReturnValue(mockCell),
    };
    const tableLocator = {
      locator: vi.fn().mockReturnValue(mockRow),
    } as any;

    const table = withinTable(tableLocator);
    table.cell(0, 1);

    expect(tableLocator.locator).toHaveBeenCalledWith('tbody tr');
    expect(mockRow.nth).toHaveBeenCalledWith(0);
    expect(mockRow.locator).toHaveBeenCalledWith('td');
    expect(mockCell.nth).toHaveBeenCalledWith(1);
  });

  it('should locate header by column index', () => {
    const mockHeader = {
      nth: vi.fn().mockReturnThis(),
    };
    const tableLocator = {
      locator: vi.fn().mockReturnValue(mockHeader),
    } as any;

    const table = withinTable(tableLocator);
    table.header(0);

    expect(tableLocator.locator).toHaveBeenCalledWith('thead th');
    expect(mockHeader.nth).toHaveBeenCalledWith(0);
  });

  it('should locate header by column name', () => {
    const mockHeader = {
      filter: vi.fn().mockReturnThis(),
    };
    const tableLocator = {
      locator: vi.fn().mockReturnValue(mockHeader),
    } as any;

    const table = withinTable(tableLocator);
    table.header('Email');

    expect(tableLocator.locator).toHaveBeenCalledWith('thead th');
    expect(mockHeader.filter).toHaveBeenCalledWith({ hasText: 'Email' });
  });
});

// =============================================================================
// withinSection Tests
// =============================================================================

describe('withinSection', () => {
  const config: LocatorFactoryConfig = {
    strategies: ['testid', 'css'],
    testIdAttribute: 'data-testid',
  };

  it('should create section locators interface', () => {
    const sectionLocator = createMockLocator();

    const section = withinSection(sectionLocator, config);

    expect(section).toHaveProperty('locator');
    expect(section).toHaveProperty('byTestId');
    expect(section).toHaveProperty('byRole');
  });

  it('should locate by CSS selector within section', () => {
    const sectionLocator = createMockLocator();

    const section = withinSection(sectionLocator, config);
    section.locator('.nav-link');

    expect(sectionLocator.locator).toHaveBeenCalledWith('.nav-link');
  });

  it('should locate by test ID within section', () => {
    const sectionLocator = createMockLocator();

    const section = withinSection(sectionLocator, config);
    section.byTestId('sidebar-search');

    expect(sectionLocator.locator).toHaveBeenCalled();
  });

  it('should locate by role within section', () => {
    const sectionLocator = createMockLocator();

    const section = withinSection(sectionLocator, config);
    section.byRole('link', { name: 'Dashboard' });

    expect(sectionLocator.getByRole).toHaveBeenCalledWith('link', {
      name: 'Dashboard',
    });
  });
});

// =============================================================================
// createDefaultConfig Tests
// =============================================================================

describe('createDefaultConfig', () => {
  it('should return default configuration', () => {
    const config = createDefaultConfig();

    expect(config).toEqual({
      strategies: ['role', 'label', 'placeholder', 'testid', 'text', 'css'],
      testIdAttribute: 'data-testid',
      customTestIds: [],
    });
  });

  it('should be a complete LocatorFactoryConfig', () => {
    const config = createDefaultConfig();

    expect(config).toHaveProperty('strategies');
    expect(config).toHaveProperty('testIdAttribute');
    expect(config).toHaveProperty('customTestIds');
    expect(Array.isArray(config.strategies)).toBe(true);
    expect(config.strategies.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// createConfigFromSelectors Tests
// =============================================================================

describe('createConfigFromSelectors', () => {
  it('should convert SelectorsConfig to LocatorFactoryConfig', () => {
    const selectorsConfig = {
      testIdAttribute: 'data-test',
      strategy: ['role', 'testid', 'css'] as const,
    };

    const config = createConfigFromSelectors(selectorsConfig);

    expect(config).toEqual({
      strategies: ['role', 'testid', 'css'],
      testIdAttribute: 'data-test',
      customTestIds: undefined,
    });
  });

  it('should include custom test IDs when present', () => {
    const selectorsConfig = {
      testIdAttribute: 'data-testid',
      strategy: ['testid', 'css'] as const,
      customTestIds: ['data-test', 'data-qa'] as const,
    };

    const config = createConfigFromSelectors(selectorsConfig);

    expect(config).toEqual({
      strategies: ['testid', 'css'],
      testIdAttribute: 'data-testid',
      customTestIds: ['data-test', 'data-qa'],
    });
  });

  it('should handle minimal SelectorsConfig', () => {
    const selectorsConfig = {
      testIdAttribute: 'data-testid',
      strategy: ['css'] as const,
    };

    const config = createConfigFromSelectors(selectorsConfig);

    expect(config.testIdAttribute).toBe('data-testid');
    expect(config.strategies).toEqual(['css']);
  });
});
