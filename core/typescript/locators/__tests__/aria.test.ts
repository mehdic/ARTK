/**
 * Unit tests for ARIA helper functions
 *
 * @group unit
 * @group locators
 */

import { describe, expect, it, vi } from 'vitest';
import type { Locator } from '@playwright/test';
import {
  getAccessibleName,
  getAriaDescription,
  getAriaLabel,
  getAriaLive,
  getAriaRole,
  isAriaChecked,
  isAriaDisabled,
  isAriaExpanded,
  isAriaHidden,
  isAriaInvalid,
  isAriaRequired,
  isValidAriaRole,
} from '../aria.js';

// =============================================================================
// Mock Helpers
// =============================================================================

function createMockLocator(getAttribute: any = vi.fn()): Locator {
  return {
    getAttribute,
    textContent: vi.fn(),
  } as any;
}

// =============================================================================
// getAriaRole Tests
// =============================================================================

describe('getAriaRole', () => {
  it('should return role attribute value', async () => {
    const locator = createMockLocator(vi.fn().mockResolvedValue('button'));

    const result = await getAriaRole(locator);

    expect(result).toBe('button');
    expect(locator.getAttribute).toHaveBeenCalledWith('role');
  });

  it('should return null when role attribute is not present', async () => {
    const locator = createMockLocator(vi.fn().mockResolvedValue(null));

    const result = await getAriaRole(locator);

    expect(result).toBeNull();
  });

  it('should return null when getAttribute throws', async () => {
    const locator = createMockLocator(
      vi.fn().mockRejectedValue(new Error('Error'))
    );

    const result = await getAriaRole(locator);

    expect(result).toBeNull();
  });
});

// =============================================================================
// getAriaLabel Tests
// =============================================================================

describe('getAriaLabel', () => {
  it('should return aria-label value', async () => {
    const locator = createMockLocator(
      vi.fn().mockResolvedValue('Submit form')
    );

    const result = await getAriaLabel(locator);

    expect(result).toBe('Submit form');
    expect(locator.getAttribute).toHaveBeenCalledWith('aria-label');
  });

  it('should check aria-labelledby when aria-label is null', async () => {
    const getAttribute = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('label-id');

    const locator = createMockLocator(getAttribute);

    const result = await getAriaLabel(locator);

    expect(result).toBe('label-id');
    expect(getAttribute).toHaveBeenCalledWith('aria-label');
    expect(getAttribute).toHaveBeenCalledWith('aria-labelledby');
  });

  it('should return null when both attributes are null', async () => {
    const locator = createMockLocator(vi.fn().mockResolvedValue(null));

    const result = await getAriaLabel(locator);

    expect(result).toBeNull();
  });

  it('should return null when getAttribute throws', async () => {
    const locator = createMockLocator(
      vi.fn().mockRejectedValue(new Error('Error'))
    );

    const result = await getAriaLabel(locator);

    expect(result).toBeNull();
  });
});

// =============================================================================
// isAriaDisabled Tests
// =============================================================================

describe('isAriaDisabled', () => {
  it('should return true when aria-disabled is "true"', async () => {
    const locator = createMockLocator(vi.fn().mockResolvedValue('true'));

    const result = await isAriaDisabled(locator);

    expect(result).toBe(true);
  });

  it('should return false when aria-disabled is "false"', async () => {
    const getAttribute = vi
      .fn()
      .mockResolvedValueOnce('false')
      .mockResolvedValueOnce(null);

    const locator = createMockLocator(getAttribute);

    const result = await isAriaDisabled(locator);

    expect(result).toBe(false);
  });

  it('should check disabled attribute when aria-disabled is null', async () => {
    const getAttribute = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('disabled');

    const locator = createMockLocator(getAttribute);

    const result = await isAriaDisabled(locator);

    expect(result).toBe(true);
  });

  it('should return false when both attributes are null', async () => {
    const locator = createMockLocator(vi.fn().mockResolvedValue(null));

    const result = await isAriaDisabled(locator);

    expect(result).toBe(false);
  });

  it('should return false when getAttribute throws', async () => {
    const locator = createMockLocator(
      vi.fn().mockRejectedValue(new Error('Error'))
    );

    const result = await isAriaDisabled(locator);

    expect(result).toBe(false);
  });
});

// =============================================================================
// isAriaExpanded Tests
// =============================================================================

describe('isAriaExpanded', () => {
  it('should return true when aria-expanded is "true"', async () => {
    const locator = createMockLocator(vi.fn().mockResolvedValue('true'));

    const result = await isAriaExpanded(locator);

    expect(result).toBe(true);
  });

  it('should return false when aria-expanded is "false"', async () => {
    const locator = createMockLocator(vi.fn().mockResolvedValue('false'));

    const result = await isAriaExpanded(locator);

    expect(result).toBe(false);
  });

  it('should return null when aria-expanded is not set', async () => {
    const locator = createMockLocator(vi.fn().mockResolvedValue(null));

    const result = await isAriaExpanded(locator);

    expect(result).toBeNull();
  });

  it('should return null when getAttribute throws', async () => {
    const locator = createMockLocator(
      vi.fn().mockRejectedValue(new Error('Error'))
    );

    const result = await isAriaExpanded(locator);

    expect(result).toBeNull();
  });
});

// =============================================================================
// isAriaChecked Tests
// =============================================================================

describe('isAriaChecked', () => {
  it('should return true when aria-checked is "true"', async () => {
    const locator = createMockLocator(vi.fn().mockResolvedValue('true'));

    const result = await isAriaChecked(locator);

    expect(result).toBe(true);
  });

  it('should return false when aria-checked is "false"', async () => {
    const locator = createMockLocator(vi.fn().mockResolvedValue('false'));

    const result = await isAriaChecked(locator);

    expect(result).toBe(false);
  });

  it('should return null when aria-checked is not set', async () => {
    const locator = createMockLocator(vi.fn().mockResolvedValue(null));

    const result = await isAriaChecked(locator);

    expect(result).toBeNull();
  });
});

// =============================================================================
// isValidAriaRole Tests
// =============================================================================

describe('isValidAriaRole', () => {
  it('should return true for valid widget role', () => {
    expect(isValidAriaRole('button')).toBe(true);
    expect(isValidAriaRole('checkbox')).toBe(true);
    expect(isValidAriaRole('link')).toBe(true);
  });

  it('should return true for valid landmark role', () => {
    expect(isValidAriaRole('main')).toBe(true);
    expect(isValidAriaRole('navigation')).toBe(true);
    expect(isValidAriaRole('banner')).toBe(true);
  });

  it('should return true for valid document structure role', () => {
    expect(isValidAriaRole('article')).toBe(true);
    expect(isValidAriaRole('list')).toBe(true);
    expect(isValidAriaRole('table')).toBe(true);
  });

  it('should return false for invalid role', () => {
    expect(isValidAriaRole('invalid-role')).toBe(false);
    expect(isValidAriaRole('custom-widget')).toBe(false);
    expect(isValidAriaRole('')).toBe(false);
  });
});

// =============================================================================
// getAccessibleName Tests
// =============================================================================

describe('getAccessibleName', () => {
  it('should return aria-label when present', async () => {
    const locator = {
      getAttribute: vi.fn().mockResolvedValue('Submit form'),
      textContent: vi.fn(),
    } as any;

    const result = await getAccessibleName(locator);

    expect(result).toBe('Submit form');
    expect(locator.textContent).not.toHaveBeenCalled();
  });

  it('should fall back to text content when aria-label is null', async () => {
    const locator = {
      getAttribute: vi.fn().mockResolvedValue(null),
      textContent: vi.fn().mockResolvedValue('  Submit  '),
    } as any;

    const result = await getAccessibleName(locator);

    expect(result).toBe('Submit');
    expect(locator.textContent).toHaveBeenCalled();
  });

  it('should return null when both aria-label and text content are null', async () => {
    const locator = {
      getAttribute: vi.fn().mockResolvedValue(null),
      textContent: vi.fn().mockResolvedValue(null),
    } as any;

    const result = await getAccessibleName(locator);

    expect(result).toBeNull();
  });

  it('should return null when an error occurs', async () => {
    const locator = {
      getAttribute: vi.fn().mockRejectedValue(new Error('Error')),
      textContent: vi.fn(),
    } as any;

    const result = await getAccessibleName(locator);

    expect(result).toBeNull();
  });
});
