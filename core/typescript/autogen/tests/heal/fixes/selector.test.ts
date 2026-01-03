/**
 * Selector Fix Strategy Tests
 * @see T058 - Unit test for selector fix strategy
 */
import { describe, it, expect } from 'vitest';
import {
  extractCSSSelector,
  containsCSSSelector,
  inferRoleFromSelector,
  extractNameFromSelector,
  generateRoleLocator,
  generateLabelLocator,
  generateTextLocator,
  generateTestIdLocator,
  applySelectorFix,
  addExactToLocator,
} from '../../../src/heal/fixes/selector.js';

describe('extractCSSSelector', () => {
  it('should extract class selector', () => {
    const code = "page.locator('.submit-button')";
    expect(extractCSSSelector(code)).toBe('.submit-button');
  });

  it('should extract ID selector', () => {
    const code = "page.locator('#login-form')";
    expect(extractCSSSelector(code)).toBe('#login-form');
  });

  it('should extract attribute selector', () => {
    const code = "page.locator('[data-test=submit]')";
    expect(extractCSSSelector(code)).toBe('[data-test=submit]');
  });

  it('should return null for role-based locator', () => {
    const code = "page.getByRole('button')";
    expect(extractCSSSelector(code)).toBeNull();
  });
});

describe('containsCSSSelector', () => {
  it('should return true for class selector', () => {
    expect(containsCSSSelector("page.locator('.btn')")).toBe(true);
  });

  it('should return true for ID selector', () => {
    expect(containsCSSSelector("page.locator('#submit')")).toBe(true);
  });

  it('should return false for role locator', () => {
    expect(containsCSSSelector("page.getByRole('button')")).toBe(false);
  });
});

describe('inferRoleFromSelector', () => {
  it('should infer button from .button', () => {
    const result = inferRoleFromSelector('.submit-button');
    expect(result?.role).toBe('button');
  });

  it('should infer button from .btn', () => {
    const result = inferRoleFromSelector('.btn-primary');
    expect(result?.role).toBe('button');
  });

  it('should infer textbox from .input', () => {
    const result = inferRoleFromSelector('.form-input');
    expect(result?.role).toBe('textbox');
  });

  it('should infer checkbox from checkbox class', () => {
    const result = inferRoleFromSelector('.checkbox-field');
    expect(result?.role).toBe('checkbox');
  });

  it('should infer dialog from .modal', () => {
    const result = inferRoleFromSelector('.modal-dialog');
    expect(result?.role).toBe('dialog');
  });

  it('should return null for unrecognized selector', () => {
    const result = inferRoleFromSelector('.custom-xyz');
    expect(result).toBeNull();
  });
});

describe('extractNameFromSelector', () => {
  it('should extract aria-label value', () => {
    const result = extractNameFromSelector('[aria-label="Submit form"]');
    expect(result).toBe('Submit form');
  });

  it('should extract title value', () => {
    const result = extractNameFromSelector('[title="Close dialog"]');
    expect(result).toBe('Close dialog');
  });

  it('should extract from class name', () => {
    const result = extractNameFromSelector('.login-button');
    expect(result).toContain('login');
  });

  it('should return null for short class', () => {
    const result = extractNameFromSelector('.a');
    expect(result).toBeNull();
  });
});

describe('generateRoleLocator', () => {
  it('should generate basic role locator', () => {
    expect(generateRoleLocator('button')).toBe("page.getByRole('button')");
  });

  it('should generate role locator with name', () => {
    expect(generateRoleLocator('button', 'Submit')).toBe("page.getByRole('button', { name: 'Submit' })");
  });

  it('should generate role locator with exact', () => {
    expect(generateRoleLocator('button', 'Submit', { exact: true }))
      .toBe("page.getByRole('button', { name: 'Submit', exact: true })");
  });

  it('should generate heading with level', () => {
    expect(generateRoleLocator('heading', undefined, { level: 2 }))
      .toBe("page.getByRole('heading', { level: 2 })");
  });
});

describe('generateLabelLocator', () => {
  it('should generate basic label locator', () => {
    expect(generateLabelLocator('Email')).toBe("page.getByLabel('Email')");
  });

  it('should generate label locator with exact', () => {
    expect(generateLabelLocator('Email', true)).toBe("page.getByLabel('Email', { exact: true })");
  });
});

describe('generateTextLocator', () => {
  it('should generate basic text locator', () => {
    expect(generateTextLocator('Submit')).toBe("page.getByText('Submit')");
  });

  it('should generate text locator with exact', () => {
    expect(generateTextLocator('Submit', true)).toBe("page.getByText('Submit', { exact: true })");
  });
});

describe('generateTestIdLocator', () => {
  it('should generate testid locator', () => {
    expect(generateTestIdLocator('submit-button')).toBe("page.getByTestId('submit-button')");
  });
});

describe('applySelectorFix', () => {
  it('should replace CSS selector with inferred role', () => {
    const result = applySelectorFix({
      code: "await page.locator('.submit-button').click()",
      lineNumber: 1,
      selector: '.submit-button',
      errorMessage: 'Locator resolved to 0 elements',
    });

    expect(result.applied).toBe(true);
    expect(result.code).toContain('getByRole');
    expect(result.code).not.toContain('.submit-button');
  });

  it('should use ARIA info when provided', () => {
    const result = applySelectorFix({
      code: "await page.locator('.btn').click()",
      lineNumber: 1,
      selector: '.btn',
      errorMessage: 'Locator resolved to 0 elements',
      ariaInfo: {
        role: 'button',
        name: 'Submit',
      },
    });

    expect(result.applied).toBe(true);
    expect(result.code).toContain("getByRole('button'");
    expect(result.code).toContain('Submit');
  });

  it('should use testid when available in ARIA info', () => {
    const result = applySelectorFix({
      code: "await page.locator('.btn').click()",
      lineNumber: 1,
      selector: '.btn',
      errorMessage: 'Locator resolved to 0 elements',
      ariaInfo: {
        testId: 'submit-btn',
      },
    });

    expect(result.applied).toBe(true);
    expect(result.code).toContain("getByTestId('submit-btn')");
  });

  it('should return not applied for non-CSS locator', () => {
    const result = applySelectorFix({
      code: "await page.getByRole('button').click()",
      lineNumber: 1,
      selector: '',
      errorMessage: 'Locator resolved to 0 elements',
    });

    expect(result.applied).toBe(false);
  });
});

describe('addExactToLocator', () => {
  it('should add exact to getByRole with name', () => {
    const result = addExactToLocator("page.getByRole('button', { name: 'Submit' })");

    expect(result.applied).toBe(true);
    expect(result.code).toContain('exact: true');
  });

  it('should add exact to getByLabel', () => {
    const result = addExactToLocator("page.getByLabel('Email')");

    expect(result.applied).toBe(true);
    expect(result.code).toContain('exact: true');
  });

  it('should add exact to getByText', () => {
    const result = addExactToLocator("page.getByText('Submit')");

    expect(result.applied).toBe(true);
    expect(result.code).toContain('exact: true');
  });

  it('should not modify if no locator found', () => {
    const result = addExactToLocator("const x = 1;");

    expect(result.applied).toBe(false);
  });
});
