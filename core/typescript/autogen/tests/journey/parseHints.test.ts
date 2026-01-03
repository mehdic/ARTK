/**
 * Machine Hint Parser Tests
 * @see T069 - Unit test for machine hint parser
 */
import { describe, it, expect } from 'vitest';
import {
  parseHints,
  extractHints,
  hasLocatorHints,
  hasBehaviorHints,
  generateLocatorFromHints,
  parseModuleHint,
  validateHints,
  mergeWithInferred,
} from '../../src/journey/parseHints.js';

describe('parseHints', () => {
  it('should return empty result for text without hints', () => {
    const result = parseHints('User clicks the Submit button');

    expect(result.hints).toHaveLength(0);
    expect(result.cleanText).toBe('User clicks the Submit button');
    expect(result.warnings).toHaveLength(0);
  });

  it('should parse single role hint', () => {
    const result = parseHints('User clicks the Submit button (role=button)');

    expect(result.hints).toHaveLength(1);
    expect(result.hints[0].type).toBe('role');
    expect(result.hints[0].value).toBe('button');
    expect(result.cleanText).toBe('User clicks the Submit button');
  });

  it('should parse testid hint', () => {
    const result = parseHints('User clicks (testid=submit-btn) the Submit button');

    expect(result.hints).toHaveLength(1);
    expect(result.hints[0].type).toBe('testid');
    expect(result.hints[0].value).toBe('submit-btn');
  });

  it('should parse quoted label hint', () => {
    const result = parseHints('User enters email (label="Email Address")');

    expect(result.hints).toHaveLength(1);
    expect(result.hints[0].type).toBe('label');
    expect(result.hints[0].value).toBe('Email Address');
  });

  it('should parse multiple hints', () => {
    const result = parseHints('Click button (role=button) (label="Submit") (exact=true)');

    expect(result.hints).toHaveLength(3);
    expect(result.hints.map((h) => h.type)).toEqual(['role', 'label', 'exact']);
  });

  it('should warn for invalid role', () => {
    const result = parseHints('Click (role=invalidrole) button');

    expect(result.warnings).toContain('Invalid ARIA role: invalidrole');
  });

  it('should warn for unknown hint type', () => {
    const result = parseHints('Click (unknown=value) button');

    expect(result.warnings).toContain('Unknown hint type: unknown');
  });
});

describe('extractHints', () => {
  it('should extract locator hints', () => {
    const result = extractHints('Click button (role=button) (label="Submit")');

    expect(result.hasHints).toBe(true);
    expect(result.locator.role).toBe('button');
    expect(result.locator.label).toBe('Submit');
  });

  it('should extract behavior hints', () => {
    const result = extractHints('Navigate and wait (signal=loading-done) (timeout=5000)');

    expect(result.behavior.signal).toBe('loading-done');
    expect(result.behavior.timeout).toBe(5000);
  });

  it('should extract module hint', () => {
    const result = extractHints('Login with credentials (module=auth.login)');

    expect(result.behavior.module).toBe('auth.login');
  });

  it('should extract wait hint', () => {
    const result = extractHints('Navigate to page (wait=networkidle)');

    expect(result.behavior.wait).toBe('networkidle');
  });

  it('should extract level hint for heading', () => {
    const result = extractHints('See heading (role=heading) (level=2)');

    expect(result.locator.role).toBe('heading');
    expect(result.locator.level).toBe(2);
  });

  it('should extract exact hint', () => {
    const result = extractHints('See text (text="Hello") (exact=true)');

    expect(result.locator.text).toBe('Hello');
    expect(result.locator.exact).toBe(true);
  });
});

describe('hasLocatorHints', () => {
  it('should return true for role hint', () => {
    const hints = extractHints('Click (role=button)');
    expect(hasLocatorHints(hints)).toBe(true);
  });

  it('should return true for testid hint', () => {
    const hints = extractHints('Click (testid=submit)');
    expect(hasLocatorHints(hints)).toBe(true);
  });

  it('should return true for label hint', () => {
    const hints = extractHints('Enter in (label="Email")');
    expect(hasLocatorHints(hints)).toBe(true);
  });

  it('should return true for text hint', () => {
    const hints = extractHints('See (text="Hello")');
    expect(hasLocatorHints(hints)).toBe(true);
  });

  it('should return false when only behavior hints', () => {
    const hints = extractHints('Wait (timeout=5000)');
    expect(hasLocatorHints(hints)).toBe(false);
  });

  it('should return false when no hints', () => {
    const hints = extractHints('Click the button');
    expect(hasLocatorHints(hints)).toBe(false);
  });
});

describe('hasBehaviorHints', () => {
  it('should return true for signal hint', () => {
    const hints = extractHints('Wait (signal=done)');
    expect(hasBehaviorHints(hints)).toBe(true);
  });

  it('should return true for module hint', () => {
    const hints = extractHints('Login (module=auth.login)');
    expect(hasBehaviorHints(hints)).toBe(true);
  });

  it('should return true for wait hint', () => {
    const hints = extractHints('Navigate (wait=networkidle)');
    expect(hasBehaviorHints(hints)).toBe(true);
  });

  it('should return true for timeout hint', () => {
    const hints = extractHints('Click (timeout=10000)');
    expect(hasBehaviorHints(hints)).toBe(true);
  });

  it('should return false when only locator hints', () => {
    const hints = extractHints('Click (role=button)');
    expect(hasBehaviorHints(hints)).toBe(false);
  });
});

describe('generateLocatorFromHints', () => {
  it('should generate testid locator', () => {
    const hints = extractHints('Click (testid=submit-btn)');
    const locator = generateLocatorFromHints(hints.locator);

    expect(locator).toBe("page.getByTestId('submit-btn')");
  });

  it('should generate role locator with name', () => {
    const hints = extractHints('Click (role=button) (label="Submit")');
    const locator = generateLocatorFromHints(hints.locator);

    expect(locator).toBe("page.getByRole('button', { name: 'Submit' })");
  });

  it('should generate role locator with exact', () => {
    const hints = extractHints('Click (role=button) (exact=true)');
    const locator = generateLocatorFromHints(hints.locator);

    expect(locator).toBe("page.getByRole('button', { exact: true })");
  });

  it('should generate heading role with level', () => {
    const hints = extractHints('See (role=heading) (level=2)');
    const locator = generateLocatorFromHints(hints.locator);

    expect(locator).toBe("page.getByRole('heading', { level: 2 })");
  });

  it('should generate label locator', () => {
    const hints = extractHints('Enter in (label="Email Address")');
    const locator = generateLocatorFromHints(hints.locator);

    expect(locator).toBe("page.getByLabel('Email Address')");
  });

  it('should generate text locator', () => {
    const hints = extractHints('See (text="Welcome")');
    const locator = generateLocatorFromHints(hints.locator);

    expect(locator).toBe("page.getByText('Welcome')");
  });

  it('should generate text locator with exact', () => {
    const hints = extractHints('See (text="Log") (exact=true)');
    const locator = generateLocatorFromHints(hints.locator);

    expect(locator).toBe("page.getByText('Log', { exact: true })");
  });

  it('should return null for no locator hints', () => {
    const hints = extractHints('Wait (timeout=5000)');
    const locator = generateLocatorFromHints(hints.locator);

    expect(locator).toBeNull();
  });
});

describe('parseModuleHint', () => {
  it('should parse module.method format', () => {
    const result = parseModuleHint('auth.login');

    expect(result).toEqual({ module: 'auth', method: 'login' });
  });

  it('should return null for invalid format', () => {
    expect(parseModuleHint('invalid')).toBeNull();
    expect(parseModuleHint('too.many.parts')).toBeNull();
  });
});

describe('validateHints', () => {
  it('should pass for valid hints', () => {
    const hints = extractHints('Click (role=button) (label="Submit")');
    const errors = validateHints(hints);

    expect(errors).toHaveLength(0);
  });

  it('should error for conflicting locator hints', () => {
    const hints = extractHints('Click (role=button) (testid=btn)');
    const errors = validateHints(hints);

    expect(errors).toContain('Multiple conflicting locator hints specified');
  });

  it('should error for level without heading', () => {
    const hints = extractHints('Click (role=button) (level=2)');
    const errors = validateHints(hints);

    expect(errors).toContain('level hint only applies to role=heading');
  });

  it('should error for invalid module format', () => {
    // Manually set invalid module to test
    const hints = extractHints('Login (module=invalid)');
    const errors = validateHints(hints);

    expect(errors).toContain('module hint must be in format: moduleName.methodName');
  });
});

describe('mergeWithInferred', () => {
  it('should override with testid hint', () => {
    const hints = extractHints('Click (testid=btn)');
    const inferred = { strategy: 'text', value: 'Submit' };
    const result = mergeWithInferred(hints.locator, inferred);

    expect(result.strategy).toBe('testid');
    expect(result.value).toBe('btn');
  });

  it('should override with role hint', () => {
    const hints = extractHints('Click (role=button) (label="OK")');
    const inferred = { strategy: 'text', value: 'OK' };
    const result = mergeWithInferred(hints.locator, inferred);

    expect(result.strategy).toBe('role');
    expect(result.value).toBe('button');
    expect(result.options).toEqual({ name: 'OK' });
  });

  it('should add exact to inferred when specified', () => {
    const hints = extractHints('Click (exact=true)');
    const inferred = { strategy: 'text', value: 'Log' };
    const result = mergeWithInferred(hints.locator, inferred);

    expect(result.strategy).toBe('text');
    expect(result.value).toBe('Log');
    expect(result.options).toEqual({ exact: true });
  });

  it('should fall back to inferred when no hints', () => {
    const hints = extractHints('Click the button');
    const inferred = { strategy: 'text', value: 'Submit' };
    const result = mergeWithInferred(hints.locator, inferred);

    expect(result.strategy).toBe('text');
    expect(result.value).toBe('Submit');
  });
});
