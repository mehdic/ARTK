/**
 * Unit tests for locator strategies
 *
 * @group unit
 * @group locators
 */

import { describe, expect, it, vi } from 'vitest';
import type { Locator, Page } from '@playwright/test';
import {
  byCss,
  byLabel,
  byPlaceholder,
  byRole,
  byText,
  tryStrategy,
} from '../strategies.js';

// =============================================================================
// Mock Helpers
// =============================================================================

function createMockPage(): Page {
  const mockLocator = {
    _selector: '.mock-selector',
  } as unknown as Locator;

  return {
    getByRole: vi.fn().mockReturnValue(mockLocator),
    getByLabel: vi.fn().mockReturnValue(mockLocator),
    getByPlaceholder: vi.fn().mockReturnValue(mockLocator),
    getByText: vi.fn().mockReturnValue(mockLocator),
    locator: vi.fn().mockReturnValue(mockLocator),
  } as any;
}

// =============================================================================
// byRole Tests
// =============================================================================

describe('byRole', () => {
  it('should call page.getByRole with role name', () => {
    const page = createMockPage();

    byRole(page, 'button');

    expect(page.getByRole).toHaveBeenCalledWith('button', {});
  });

  it('should pass name option to getByRole', () => {
    const page = createMockPage();

    byRole(page, 'button', { name: 'Submit' });

    expect(page.getByRole).toHaveBeenCalledWith('button', { name: 'Submit' });
  });

  it('should pass checked option to getByRole', () => {
    const page = createMockPage();

    byRole(page, 'checkbox', { checked: true });

    expect(page.getByRole).toHaveBeenCalledWith('checkbox', { checked: true });
  });

  it('should pass disabled option to getByRole', () => {
    const page = createMockPage();

    byRole(page, 'button', { disabled: true });

    expect(page.getByRole).toHaveBeenCalledWith('button', { disabled: true });
  });

  it('should pass level option to getByRole', () => {
    const page = createMockPage();

    byRole(page, 'heading', { level: 1 });

    expect(page.getByRole).toHaveBeenCalledWith('heading', { level: 1 });
  });

  it('should pass multiple options to getByRole', () => {
    const page = createMockPage();

    byRole(page, 'button', {
      name: 'Submit',
      disabled: false,
      exact: true,
    });

    expect(page.getByRole).toHaveBeenCalledWith('button', {
      name: 'Submit',
      disabled: false,
      exact: true,
    });
  });

  it('should handle regex name option', () => {
    const page = createMockPage();
    const nameRegex = /submit/i;

    byRole(page, 'button', { name: nameRegex });

    expect(page.getByRole).toHaveBeenCalledWith('button', { name: nameRegex });
  });
});

// =============================================================================
// byLabel Tests
// =============================================================================

describe('byLabel', () => {
  it('should call page.getByLabel with label text', () => {
    const page = createMockPage();

    byLabel(page, 'Email address');

    expect(page.getByLabel).toHaveBeenCalledWith('Email address', undefined);
  });

  it('should pass exact option to getByLabel', () => {
    const page = createMockPage();

    byLabel(page, 'Username', { exact: true });

    expect(page.getByLabel).toHaveBeenCalledWith('Username', { exact: true });
  });

  it('should handle regex label', () => {
    const page = createMockPage();
    const labelRegex = /email/i;

    byLabel(page, labelRegex);

    expect(page.getByLabel).toHaveBeenCalledWith(labelRegex, undefined);
  });
});

// =============================================================================
// byPlaceholder Tests
// =============================================================================

describe('byPlaceholder', () => {
  it('should call page.getByPlaceholder with placeholder text', () => {
    const page = createMockPage();

    byPlaceholder(page, 'Enter your email');

    expect(page.getByPlaceholder).toHaveBeenCalledWith(
      'Enter your email',
      undefined
    );
  });

  it('should pass exact option to getByPlaceholder', () => {
    const page = createMockPage();

    byPlaceholder(page, 'Search...', { exact: true });

    expect(page.getByPlaceholder).toHaveBeenCalledWith('Search...', {
      exact: true,
    });
  });

  it('should handle regex placeholder', () => {
    const page = createMockPage();
    const placeholderRegex = /search/i;

    byPlaceholder(page, placeholderRegex);

    expect(page.getByPlaceholder).toHaveBeenCalledWith(
      placeholderRegex,
      undefined
    );
  });
});

// =============================================================================
// byText Tests
// =============================================================================

describe('byText', () => {
  it('should call page.getByText with text content', () => {
    const page = createMockPage();

    byText(page, 'Click here');

    expect(page.getByText).toHaveBeenCalledWith('Click here', undefined);
  });

  it('should pass exact option to getByText', () => {
    const page = createMockPage();

    byText(page, 'Submit', { exact: true });

    expect(page.getByText).toHaveBeenCalledWith('Submit', { exact: true });
  });

  it('should handle regex text', () => {
    const page = createMockPage();
    const textRegex = /click/i;

    byText(page, textRegex);

    expect(page.getByText).toHaveBeenCalledWith(textRegex, undefined);
  });
});

// =============================================================================
// byCss Tests
// =============================================================================

describe('byCss', () => {
  it('should call page.locator with CSS selector', () => {
    const page = createMockPage();

    byCss(page, '.submit-button');

    expect(page.locator).toHaveBeenCalledWith('.submit-button');
  });

  it('should handle ID selector', () => {
    const page = createMockPage();

    byCss(page, '#login-form');

    expect(page.locator).toHaveBeenCalledWith('#login-form');
  });

  it('should handle complex selector', () => {
    const page = createMockPage();
    const selector = 'form > div.field:nth-child(2) input';

    byCss(page, selector);

    expect(page.locator).toHaveBeenCalledWith(selector);
  });
});

// =============================================================================
// tryStrategy Tests
// =============================================================================

describe('tryStrategy', () => {
  it('should return locator for role strategy', () => {
    const page = createMockPage();

    const result = tryStrategy(page, 'role', 'button');

    expect(result).toBeDefined();
    expect(page.getByRole).toHaveBeenCalled();
  });

  it('should return locator for label strategy', () => {
    const page = createMockPage();

    const result = tryStrategy(page, 'label', 'Email');

    expect(result).toBeDefined();
    expect(page.getByLabel).toHaveBeenCalledWith('Email', undefined);
  });

  it('should return locator for placeholder strategy', () => {
    const page = createMockPage();

    const result = tryStrategy(page, 'placeholder', 'Search...');

    expect(result).toBeDefined();
    expect(page.getByPlaceholder).toHaveBeenCalledWith('Search...', undefined);
  });

  it('should return locator for text strategy', () => {
    const page = createMockPage();

    const result = tryStrategy(page, 'text', 'Click here');

    expect(result).toBeDefined();
    expect(page.getByText).toHaveBeenCalledWith('Click here', undefined);
  });

  it('should return locator for css strategy', () => {
    const page = createMockPage();

    const result = tryStrategy(page, 'css', '.button');

    expect(result).toBeDefined();
    expect(page.locator).toHaveBeenCalledWith('.button');
  });

  it('should return null for unknown strategy', () => {
    const page = createMockPage();

    const result = tryStrategy(page, 'unknown', 'selector');

    expect(result).toBeNull();
  });

  it('should return null if strategy throws error', () => {
    const page = createMockPage();
    page.getByRole = vi.fn().mockImplementation(() => {
      throw new Error('Strategy error');
    });

    const result = tryStrategy(page, 'role', 'button');

    expect(result).toBeNull();
  });

  it('should pass options to strategy', () => {
    const page = createMockPage();
    const options = { name: 'Submit', exact: true };

    tryStrategy(page, 'role', 'button', options);

    expect(page.getByRole).toHaveBeenCalledWith('button', options);
  });
});
