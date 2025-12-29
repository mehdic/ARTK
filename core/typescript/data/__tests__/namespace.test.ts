/**
 * Unit tests for namespace utilities
 */

import { describe, expect, it } from 'vitest';
import {
  generateRunId,
  isNamespaced,
  namespace,
  parseNamespace,
} from '../namespace.js';

describe('generateRunId', () => {
  it('should generate 8-character hex string', () => {
    const runId = generateRunId();

    expect(runId).toMatch(/^[a-f0-9]{8}$/);
    expect(runId).toHaveLength(8);
  });

  it('should generate unique IDs', () => {
    const ids = new Set<string>();

    // Generate 100 IDs
    for (let i = 0; i < 100; i++) {
      ids.add(generateRunId());
    }

    // All should be unique
    expect(ids.size).toBe(100);
  });

  it('should use cryptographically random bytes', () => {
    const id1 = generateRunId();
    const id2 = generateRunId();

    // Should be different (extremely unlikely to collide)
    expect(id1).not.toBe(id2);
  });
});

describe('namespace', () => {
  it('should append namespace with default config', () => {
    const result = namespace('Test Order', 'abc123');

    expect(result).toBe('Test Order [artk-abc123]');
  });

  it('should handle custom namespace config', () => {
    const result = namespace('Test Order', 'abc123', {
      prefix: '(test-',
      suffix: ')',
    });

    expect(result).toBe('Test Order (test-abc123)');
  });

  it('should work with empty string values', () => {
    const result = namespace('', 'abc123');

    expect(result).toBe(' [artk-abc123]');
  });

  it('should work with values containing spaces', () => {
    const result = namespace('Test Order With Spaces', 'abc123');

    expect(result).toBe('Test Order With Spaces [artk-abc123]');
  });

  it('should work with values containing special characters', () => {
    const result = namespace('Test@Order#123', 'abc123');

    expect(result).toBe('Test@Order#123 [artk-abc123]');
  });

  it('should handle different runId formats', () => {
    const result1 = namespace('Test', '12345678');
    const result2 = namespace('Test', 'abcdefgh');

    expect(result1).toBe('Test [artk-12345678]');
    expect(result2).toBe('Test [artk-abcdefgh]');
  });
});

describe('parseNamespace', () => {
  it('should parse namespaced value with default config', () => {
    const result = parseNamespace('Test Order [artk-abc123]');

    expect(result).toEqual({
      value: 'Test Order',
      runId: 'abc123',
    });
  });

  it('should parse namespaced value with custom config', () => {
    const result = parseNamespace('Test Order (test-abc123)', {
      prefix: '(test-',
      suffix: ')',
    });

    expect(result).toEqual({
      value: 'Test Order',
      runId: 'abc123',
    });
  });

  it('should return null for non-namespaced values', () => {
    const result1 = parseNamespace('Test Order');
    const result2 = parseNamespace('Test Order [not-a-namespace]');
    const result3 = parseNamespace('Test Order artk-abc123');

    expect(result1).toBeNull();
    expect(result2).toBeNull();
    expect(result3).toBeNull();
  });

  it('should handle values with namespace in middle', () => {
    const result = parseNamespace('Test [artk-abc123] Order');

    // Should return null because namespace is not at end
    expect(result).toBeNull();
  });

  it('should handle hex runId correctly', () => {
    const result = parseNamespace('Test [artk-a1b2c3d4]');

    expect(result).toEqual({
      value: 'Test',
      runId: 'a1b2c3d4',
    });
  });

  it('should handle special characters in prefix/suffix', () => {
    const result = parseNamespace('Test {artk|abc123}', {
      prefix: '{artk|',
      suffix: '}',
    });

    expect(result).toEqual({
      value: 'Test',
      runId: 'abc123',
    });
  });

  it('should handle parentheses in config', () => {
    const result = parseNamespace('Test (artk-abc123)', {
      prefix: '(artk-',
      suffix: ')',
    });

    expect(result).toEqual({
      value: 'Test',
      runId: 'abc123',
    });
  });

  it('should handle brackets in config', () => {
    const result = parseNamespace('Test [artk-abc123]', {
      prefix: '[artk-',
      suffix: ']',
    });

    expect(result).toEqual({
      value: 'Test',
      runId: 'abc123',
    });
  });

  it('should reject invalid hex characters in runId', () => {
    const result = parseNamespace('Test [artk-xyz123]');

    // 'xyz' contains invalid hex characters
    expect(result).toBeNull();
  });
});

describe('isNamespaced', () => {
  it('should return true for namespaced values', () => {
    expect(isNamespaced('Test Order [artk-abc123]')).toBe(true);
  });

  it('should return false for non-namespaced values', () => {
    expect(isNamespaced('Test Order')).toBe(false);
    expect(isNamespaced('Test Order [not-a-namespace]')).toBe(false);
    expect(isNamespaced('')).toBe(false);
  });

  it('should work with custom config', () => {
    const result = isNamespaced('Test (test-abc123)', {
      prefix: '(test-',
      suffix: ')',
    });

    expect(result).toBe(true);
  });

  it('should handle edge cases', () => {
    expect(isNamespaced('[artk-abc123]')).toBe(false); // No value before namespace
    expect(isNamespaced('Test [artk-]')).toBe(false); // No runId
    expect(isNamespaced('Test [artk-abc123')).toBe(false); // Missing suffix
    expect(isNamespaced('Test artk-abc123]')).toBe(false); // Missing prefix
  });
});

describe('namespace integration', () => {
  it('should create and parse namespace correctly', () => {
    const original = 'Test Order';
    const runId = generateRunId();

    const namespaced = namespace(original, runId);
    const parsed = parseNamespace(namespaced);

    expect(parsed).not.toBeNull();
    expect(parsed?.value).toBe(original);
    expect(parsed?.runId).toBe(runId);
  });

  it('should handle round-trip with custom config', () => {
    const original = 'Test Order';
    const runId = 'abc123';
    const config = { prefix: '<<', suffix: '>>' };

    const namespaced = namespace(original, runId, config);
    const parsed = parseNamespace(namespaced, config);

    expect(parsed).toEqual({
      value: original,
      runId,
    });
  });

  it('should detect namespaced values created by namespace()', () => {
    const namespaced = namespace('Test', 'abc123');

    expect(isNamespaced(namespaced)).toBe(true);
  });
});
