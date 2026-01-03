/**
 * Machine Hint Patterns Tests
 * @see T069 - Unit test for machine hint syntax patterns
 */
import { describe, it, expect } from 'vitest';
import {
  HINT_BLOCK_PATTERN,
  HINTS_SECTION_PATTERN,
  HINT_PATTERNS,
  VALID_ROLES,
  isValidRole,
  extractHintValue,
  containsHints,
  removeHints,
} from '../../src/journey/hintPatterns.js';

describe('HINT_BLOCK_PATTERN', () => {
  it('should match unquoted values', () => {
    const text = '(role=button)';
    const matches = [...text.matchAll(HINT_BLOCK_PATTERN)];

    expect(matches).toHaveLength(1);
    expect(matches[0][1]).toBe('role');
    expect(matches[0][4]).toBe('button');
  });

  it('should match double-quoted values', () => {
    const text = '(label="Email Address")';
    const matches = [...text.matchAll(HINT_BLOCK_PATTERN)];

    expect(matches).toHaveLength(1);
    expect(matches[0][1]).toBe('label');
    expect(matches[0][2]).toBe('Email Address');
  });

  it('should match single-quoted values', () => {
    const text = "(text='Hello World')";
    const matches = [...text.matchAll(HINT_BLOCK_PATTERN)];

    expect(matches).toHaveLength(1);
    expect(matches[0][1]).toBe('text');
    expect(matches[0][3]).toBe('Hello World');
  });

  it('should match multiple hints', () => {
    const text = '(role=button) (label="Submit") (exact=true)';
    const matches = [...text.matchAll(HINT_BLOCK_PATTERN)];

    expect(matches).toHaveLength(3);
  });

  it('should match hints with hyphens in value', () => {
    const text = '(testid=submit-btn)';
    const matches = [...text.matchAll(HINT_BLOCK_PATTERN)];

    expect(matches).toHaveLength(1);
    expect(matches[0][4]).toBe('submit-btn');
  });
});

describe('HINTS_SECTION_PATTERN', () => {
  it('should match single hint section', () => {
    const text = 'Click (role=button) the button';
    expect(HINTS_SECTION_PATTERN.test(text)).toBe(true);
  });

  it('should not match text without hints', () => {
    const text = 'Click the button';
    expect(HINTS_SECTION_PATTERN.test(text)).toBe(false);
  });

  it('should not match parentheses without equals', () => {
    const text = 'User (admin) clicks button';
    expect(HINTS_SECTION_PATTERN.test(text)).toBe(false);
  });
});

describe('HINT_PATTERNS', () => {
  it('should have pattern for each hint type', () => {
    expect(HINT_PATTERNS.role).toBeDefined();
    expect(HINT_PATTERNS.testid).toBeDefined();
    expect(HINT_PATTERNS.label).toBeDefined();
    expect(HINT_PATTERNS.text).toBeDefined();
    expect(HINT_PATTERNS.exact).toBeDefined();
    expect(HINT_PATTERNS.level).toBeDefined();
    expect(HINT_PATTERNS.signal).toBeDefined();
    expect(HINT_PATTERNS.module).toBeDefined();
    expect(HINT_PATTERNS.wait).toBeDefined();
    expect(HINT_PATTERNS.timeout).toBeDefined();
  });

  it('should match role pattern', () => {
    expect(HINT_PATTERNS.role.test('role=button')).toBe(true);
    expect(HINT_PATTERNS.role.test('role="heading"')).toBe(true);
  });

  it('should match testid pattern', () => {
    expect(HINT_PATTERNS.testid.test('testid=submit-btn')).toBe(true);
    expect(HINT_PATTERNS.testid.test('testid=btn_123')).toBe(true);
  });

  it('should match label pattern with quotes', () => {
    expect(HINT_PATTERNS.label.test('label="Email Address"')).toBe(true);
    expect(HINT_PATTERNS.label.test("label='Password'")).toBe(true);
  });

  it('should match exact pattern', () => {
    expect(HINT_PATTERNS.exact.test('exact=true')).toBe(true);
    expect(HINT_PATTERNS.exact.test('exact=false')).toBe(true);
  });

  it('should match level pattern for 1-6', () => {
    expect(HINT_PATTERNS.level.test('level=1')).toBe(true);
    expect(HINT_PATTERNS.level.test('level=6')).toBe(true);
    expect(HINT_PATTERNS.level.test('level=7')).toBe(false);
  });

  it('should match signal pattern', () => {
    expect(HINT_PATTERNS.signal.test('signal=loading-done')).toBe(true);
    expect(HINT_PATTERNS.signal.test('signal="api-complete"')).toBe(true);
  });

  it('should match module pattern', () => {
    expect(HINT_PATTERNS.module.test('module=auth.login')).toBe(true);
    expect(HINT_PATTERNS.module.test('module="cart.addItem"')).toBe(true);
  });

  it('should match wait pattern', () => {
    expect(HINT_PATTERNS.wait.test('wait=networkidle')).toBe(true);
    expect(HINT_PATTERNS.wait.test('wait=domcontentloaded')).toBe(true);
    expect(HINT_PATTERNS.wait.test('wait=load')).toBe(true);
    expect(HINT_PATTERNS.wait.test('wait=commit')).toBe(true);
    expect(HINT_PATTERNS.wait.test('wait=invalid')).toBe(false);
  });

  it('should match timeout pattern', () => {
    expect(HINT_PATTERNS.timeout.test('timeout=5000')).toBe(true);
    expect(HINT_PATTERNS.timeout.test('timeout=30000')).toBe(true);
  });
});

describe('VALID_ROLES', () => {
  it('should include common ARIA roles', () => {
    expect(VALID_ROLES).toContain('button');
    expect(VALID_ROLES).toContain('link');
    expect(VALID_ROLES).toContain('textbox');
    expect(VALID_ROLES).toContain('heading');
    expect(VALID_ROLES).toContain('checkbox');
    expect(VALID_ROLES).toContain('dialog');
  });

  it('should include landmark roles', () => {
    expect(VALID_ROLES).toContain('navigation');
    expect(VALID_ROLES).toContain('main');
    expect(VALID_ROLES).toContain('banner');
    expect(VALID_ROLES).toContain('complementary');
  });

  it('should include widget roles', () => {
    expect(VALID_ROLES).toContain('combobox');
    expect(VALID_ROLES).toContain('listbox');
    expect(VALID_ROLES).toContain('menu');
    expect(VALID_ROLES).toContain('tab');
    expect(VALID_ROLES).toContain('slider');
  });
});

describe('isValidRole', () => {
  it('should return true for valid roles', () => {
    expect(isValidRole('button')).toBe(true);
    expect(isValidRole('BUTTON')).toBe(true);
    expect(isValidRole('Button')).toBe(true);
  });

  it('should return false for invalid roles', () => {
    expect(isValidRole('invalid')).toBe(false);
    expect(isValidRole('btn')).toBe(false);
    expect(isValidRole('')).toBe(false);
  });
});

describe('extractHintValue', () => {
  it('should extract first non-undefined capture group', () => {
    const match = ['full', 'first', undefined, undefined] as RegExpMatchArray;
    expect(extractHintValue(match)).toBe('first');
  });

  it('should return second capture if first is undefined', () => {
    const match = ['full', undefined, 'second', undefined] as RegExpMatchArray;
    expect(extractHintValue(match)).toBe('second');
  });

  it('should return null if all captures undefined', () => {
    const match = ['full'] as RegExpMatchArray;
    expect(extractHintValue(match)).toBeNull();
  });
});

describe('containsHints', () => {
  it('should return true for text with hints', () => {
    expect(containsHints('Click (role=button)')).toBe(true);
    expect(containsHints('Enter (label="Email")')).toBe(true);
  });

  it('should return false for text without hints', () => {
    expect(containsHints('Click the button')).toBe(false);
    expect(containsHints('User (admin) performs action')).toBe(false);
  });
});

describe('removeHints', () => {
  it('should remove single hint', () => {
    const result = removeHints('Click (role=button) the button');
    expect(result).toBe('Click  the button');
  });

  it('should remove multiple hints', () => {
    const result = removeHints('Click (role=button) (label="OK") now');
    expect(result).toBe('Click   now');
  });

  it('should return original text if no hints', () => {
    const result = removeHints('Click the button');
    expect(result).toBe('Click the button');
  });

  it('should trim result', () => {
    const result = removeHints('(role=button)');
    expect(result).toBe('');
  });
});
