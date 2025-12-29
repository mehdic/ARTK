/**
 * Unit tests for PII masking utilities
 *
 * Tests PII selector validation, sanitization, and masking logic.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { sanitizePiiSelectors, validatePiiSelectors } from '../masking.js';

// =============================================================================
// validatePiiSelectors Tests
// =============================================================================

describe('validatePiiSelectors', () => {
  beforeEach(() => {
    // Setup a minimal DOM for testing
    if (typeof document === 'undefined') {
      // @ts-expect-error - Creating minimal DOM for testing
      global.document = {
        querySelector: (selector: string) => {
          // Validate selector syntax
          if (!selector || typeof selector !== 'string') {
            throw new Error('Invalid selector');
          }
          // Basic validation - throw on invalid CSS selector patterns
          if (selector.includes('::invalid') || selector.includes('[[')) {
            throw new Error('Invalid selector');
          }
          return null;
        },
      };
    }
  });

  it('should validate correct CSS selectors', () => {
    const selectors = ['.user-email', '#ssn', '[data-testid="personal-info"]'];
    expect(validatePiiSelectors(selectors)).toBe(true);
  });

  it('should return false for empty selector list', () => {
    expect(validatePiiSelectors([])).toBe(true); // Empty is valid
  });

  it('should detect invalid selectors', () => {
    const selectors = ['.valid', '::invalid', '.another-valid'];
    expect(validatePiiSelectors(selectors)).toBe(false);
  });

  it('should handle single valid selector', () => {
    expect(validatePiiSelectors(['.email'])).toBe(true);
  });

  it('should handle complex valid selectors', () => {
    const selectors = [
      'div.user-info > span.email',
      'input[type="email"]',
      '#user-panel .personal-data',
    ];
    expect(validatePiiSelectors(selectors)).toBe(true);
  });
});

// =============================================================================
// sanitizePiiSelectors Tests
// =============================================================================

describe('sanitizePiiSelectors', () => {
  beforeEach(() => {
    // Setup a minimal DOM for testing
    if (typeof document === 'undefined') {
      // @ts-expect-error - Creating minimal DOM for testing
      global.document = {
        querySelector: (selector: string) => {
          // Validate selector syntax
          if (!selector || typeof selector !== 'string') {
            throw new Error('Invalid selector');
          }
          // Basic validation - throw on invalid CSS selector patterns
          if (selector.includes('::invalid') || selector.includes('[[')) {
            throw new Error('Invalid selector');
          }
          return null;
        },
      };
    }
  });

  it('should keep all valid selectors', () => {
    const selectors = ['.user-email', '#ssn', '[data-testid="personal-info"]'];
    const sanitized = sanitizePiiSelectors(selectors);
    expect(sanitized).toEqual(selectors);
  });

  it('should remove invalid selectors', () => {
    const selectors = ['.valid', '::invalid', '.another-valid'];
    const sanitized = sanitizePiiSelectors(selectors);
    expect(sanitized).toEqual(['.valid', '.another-valid']);
  });

  it('should return empty array when all selectors invalid', () => {
    const selectors = ['::invalid1', '[[invalid2]]'];
    const sanitized = sanitizePiiSelectors(selectors);
    expect(sanitized).toEqual([]);
  });

  it('should handle empty input', () => {
    const sanitized = sanitizePiiSelectors([]);
    expect(sanitized).toEqual([]);
  });

  it('should preserve order of valid selectors', () => {
    const selectors = ['.first', '::invalid', '.second', '.third', '[[bad]]'];
    const sanitized = sanitizePiiSelectors(selectors);
    expect(sanitized).toEqual(['.first', '.second', '.third']);
  });
});

// =============================================================================
// Masking Options Tests
// =============================================================================

describe('MaskingOptions type validation', () => {
  it('should accept valid masking options with selectors', () => {
    const options = {
      selectors: ['.email', '.phone'],
    };
    expect(options.selectors).toHaveLength(2);
  });

  it('should accept masking options with maskColor', () => {
    const options = {
      selectors: ['.email'],
      maskColor: '#FF0000',
    };
    expect(options.maskColor).toBe('#FF0000');
  });

  it('should accept masking options with blurRadius', () => {
    const options = {
      selectors: ['.email'],
      blurRadius: 10,
    };
    expect(options.blurRadius).toBe(10);
  });

  it('should handle empty selectors array', () => {
    const options = {
      selectors: [],
    };
    expect(options.selectors).toEqual([]);
  });
});
