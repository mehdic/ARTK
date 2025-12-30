/**
 * Unit tests for test ID locator utilities
 *
 * @group unit
 * @group locators
 */

import { describe, expect, it, vi } from 'vitest';
import type { Locator, Page } from '@playwright/test';
import {
  byTestId,
  createCombinedTestIdSelector,
  createTestIdSelector,
  getTestIdValue,
  hasTestIdAttribute,
} from '../testid.js';
import type { LocatorFactoryConfig } from '../types.js';

// =============================================================================
// Mock Helpers
// =============================================================================

function createMockPage(): Page {
  const mockLocator: Partial<Locator> = {
    _selector: '.mock-selector',
    first: vi.fn().mockReturnThis(),
  };

  return {
    locator: vi.fn().mockReturnValue(mockLocator),
  } as any;
}

function createMockLocator(getAttribute: any = vi.fn()): Locator {
  return {
    getAttribute,
  } as any;
}

// =============================================================================
// byTestId Tests
// =============================================================================

describe('byTestId', () => {
  it('should use primary test ID attribute', () => {
    const page = createMockPage();
    const config: LocatorFactoryConfig = {
      testIdAttribute: 'data-testid',
      strategies: ['testid'],
    };

    byTestId(page, 'submit', config);

    expect(page.locator).toHaveBeenCalledWith('[data-testid="submit"]');
  });

  it('should return primary locator when no custom test IDs', () => {
    const page = createMockPage();
    const config: LocatorFactoryConfig = {
      testIdAttribute: 'data-testid',
      strategies: ['testid'],
    };

    const result = byTestId(page, 'submit', config);

    expect(result).toBeDefined();
    expect(page.locator).toHaveBeenCalledTimes(1);
  });

  it('should create combined selector with custom test IDs', () => {
    const page = createMockPage();
    const config: LocatorFactoryConfig = {
      testIdAttribute: 'data-testid',
      customTestIds: ['data-test', 'data-qa'],
      strategies: ['testid'],
    };

    byTestId(page, 'submit', config);

    // Should be called twice: once for primary, once for combined
    expect(page.locator).toHaveBeenCalledWith(
      '[data-testid="submit"], [data-test="submit"], [data-qa="submit"]'
    );
  });

  it('should handle empty custom test IDs array', () => {
    const page = createMockPage();
    const config: LocatorFactoryConfig = {
      testIdAttribute: 'data-testid',
      customTestIds: [],
      strategies: ['testid'],
    };

    byTestId(page, 'submit', config);

    expect(page.locator).toHaveBeenCalledWith('[data-testid="submit"]');
  });

  it('should use first matching element with combined selector', () => {
    const mockLocator = {
      first: vi.fn().mockReturnThis(),
    };
    const page = {
      locator: vi.fn().mockReturnValue(mockLocator),
    } as any;

    const config: LocatorFactoryConfig = {
      testIdAttribute: 'data-testid',
      customTestIds: ['data-test'],
      strategies: ['testid'],
    };

    byTestId(page, 'submit', config);

    expect(mockLocator.first).toHaveBeenCalled();
  });
});

// =============================================================================
// hasTestIdAttribute Tests
// =============================================================================

describe('hasTestIdAttribute', () => {
  it('should return true when primary attribute matches', async () => {
    const locator = createMockLocator(
      vi.fn().mockResolvedValue('submit')
    );
    const config: LocatorFactoryConfig = {
      testIdAttribute: 'data-testid',
      strategies: ['testid'],
    };

    const result = await hasTestIdAttribute(locator, 'submit', config);

    expect(result).toBe(true);
  });

  it('should return false when primary attribute does not match', async () => {
    const locator = createMockLocator(
      vi.fn().mockResolvedValue('cancel')
    );
    const config: LocatorFactoryConfig = {
      testIdAttribute: 'data-testid',
      strategies: ['testid'],
    };

    const result = await hasTestIdAttribute(locator, 'submit', config);

    expect(result).toBe(false);
  });

  it('should check custom test ID attributes', async () => {
    const getAttribute = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('submit');

    const locator = createMockLocator(getAttribute);
    const config: LocatorFactoryConfig = {
      testIdAttribute: 'data-testid',
      customTestIds: ['data-test'],
      strategies: ['testid'],
    };

    const result = await hasTestIdAttribute(locator, 'submit', config);

    expect(result).toBe(true);
    expect(getAttribute).toHaveBeenCalledWith('data-testid');
    expect(getAttribute).toHaveBeenCalledWith('data-test');
  });

  it('should return false when no attributes match', async () => {
    const locator = createMockLocator(
      vi.fn().mockResolvedValue(null)
    );
    const config: LocatorFactoryConfig = {
      testIdAttribute: 'data-testid',
      customTestIds: ['data-test'],
      strategies: ['testid'],
    };

    const result = await hasTestIdAttribute(locator, 'submit', config);

    expect(result).toBe(false);
  });

  it('should handle getAttribute throwing error', async () => {
    const locator = createMockLocator(
      vi.fn().mockRejectedValue(new Error('Attribute not found'))
    );
    const config: LocatorFactoryConfig = {
      testIdAttribute: 'data-testid',
      strategies: ['testid'],
    };

    const result = await hasTestIdAttribute(locator, 'submit', config);

    expect(result).toBe(false);
  });
});

// =============================================================================
// getTestIdValue Tests
// =============================================================================

describe('getTestIdValue', () => {
  it('should return value from primary attribute', async () => {
    const locator = createMockLocator(
      vi.fn().mockResolvedValue('submit-button')
    );
    const config: LocatorFactoryConfig = {
      testIdAttribute: 'data-testid',
      strategies: ['testid'],
    };

    const result = await getTestIdValue(locator, config);

    expect(result).toBe('submit-button');
  });

  it('should return value from custom attribute if primary is null', async () => {
    const getAttribute = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('submit-button');

    const locator = createMockLocator(getAttribute);
    const config: LocatorFactoryConfig = {
      testIdAttribute: 'data-testid',
      customTestIds: ['data-test'],
      strategies: ['testid'],
    };

    const result = await getTestIdValue(locator, config);

    expect(result).toBe('submit-button');
  });

  it('should return null when no attributes have values', async () => {
    const locator = createMockLocator(
      vi.fn().mockResolvedValue(null)
    );
    const config: LocatorFactoryConfig = {
      testIdAttribute: 'data-testid',
      customTestIds: ['data-test'],
      strategies: ['testid'],
    };

    const result = await getTestIdValue(locator, config);

    expect(result).toBeNull();
  });

  it('should handle getAttribute throwing error', async () => {
    const locator = createMockLocator(
      vi.fn().mockRejectedValue(new Error('Attribute not found'))
    );
    const config: LocatorFactoryConfig = {
      testIdAttribute: 'data-testid',
      strategies: ['testid'],
    };

    const result = await getTestIdValue(locator, config);

    expect(result).toBeNull();
  });
});

// =============================================================================
// createTestIdSelector Tests
// =============================================================================

describe('createTestIdSelector', () => {
  it('should create selector with primary test ID attribute', () => {
    const config: LocatorFactoryConfig = {
      testIdAttribute: 'data-testid',
      strategies: ['testid'],
    };

    const result = createTestIdSelector('submit', config);

    expect(result).toBe('[data-testid="submit"]');
  });

  it('should work with custom test ID attribute', () => {
    const config: LocatorFactoryConfig = {
      testIdAttribute: 'data-test',
      strategies: ['testid'],
    };

    const result = createTestIdSelector('submit', config);

    expect(result).toBe('[data-test="submit"]');
  });

  it('should escape special characters in test ID', () => {
    const config: LocatorFactoryConfig = {
      testIdAttribute: 'data-testid',
      strategies: ['testid'],
    };

    const result = createTestIdSelector('submit-button', config);

    expect(result).toBe('[data-testid="submit-button"]');
  });
});

// =============================================================================
// createCombinedTestIdSelector Tests
// =============================================================================

describe('createCombinedTestIdSelector', () => {
  it('should create selector with only primary attribute when no custom IDs', () => {
    const config: LocatorFactoryConfig = {
      testIdAttribute: 'data-testid',
      strategies: ['testid'],
    };

    const result = createCombinedTestIdSelector('submit', config);

    expect(result).toBe('[data-testid="submit"]');
  });

  it('should combine primary and custom attributes', () => {
    const config: LocatorFactoryConfig = {
      testIdAttribute: 'data-testid',
      customTestIds: ['data-test', 'data-qa'],
      strategies: ['testid'],
    };

    const result = createCombinedTestIdSelector('submit', config);

    expect(result).toBe(
      '[data-testid="submit"], [data-test="submit"], [data-qa="submit"]'
    );
  });

  it('should handle empty custom test IDs array', () => {
    const config: LocatorFactoryConfig = {
      testIdAttribute: 'data-testid',
      customTestIds: [],
      strategies: ['testid'],
    };

    const result = createCombinedTestIdSelector('submit', config);

    expect(result).toBe('[data-testid="submit"]');
  });

  it('should work with single custom test ID', () => {
    const config: LocatorFactoryConfig = {
      testIdAttribute: 'data-testid',
      customTestIds: ['data-test'],
      strategies: ['testid'],
    };

    const result = createCombinedTestIdSelector('submit', config);

    expect(result).toBe('[data-testid="submit"], [data-test="submit"]');
  });
});
