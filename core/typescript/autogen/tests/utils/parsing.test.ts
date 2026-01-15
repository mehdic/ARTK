/**
 * Tests for safe parsing utilities
 */
import { describe, it, expect, vi } from 'vitest';
import {
  parseIntSafe,
  parseIntSafeAllowNegative,
  parseFloatSafe,
  parseBoolSafe,
  parseEnumSafe,
  parseWithValidator,
} from '../../src/utils/parsing.js';

describe('parseIntSafe', () => {
  it('should return default for undefined', () => {
    expect(parseIntSafe(undefined, 'test', 42)).toBe(42);
  });

  it('should parse valid integers', () => {
    expect(parseIntSafe('123', 'test', 0)).toBe(123);
    expect(parseIntSafe('0', 'test', 42)).toBe(0);
    expect(parseIntSafe('999999', 'test', 0)).toBe(999999);
  });

  it('should return default and warn for NaN', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(parseIntSafe('abc', 'test', 42)).toBe(42);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid value'));
    warnSpy.mockRestore();
  });

  it('should return default and warn for negative values', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(parseIntSafe('-5', 'test', 42)).toBe(42);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Negative value'));
    warnSpy.mockRestore();
  });

  it('should handle float strings by truncating', () => {
    expect(parseIntSafe('3.7', 'test', 0)).toBe(3);
  });
});

describe('parseIntSafeAllowNegative', () => {
  it('should allow negative values', () => {
    expect(parseIntSafeAllowNegative('-5', 'test', 0)).toBe(-5);
    expect(parseIntSafeAllowNegative('-100', 'test', 0)).toBe(-100);
  });

  it('should still reject NaN', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(parseIntSafeAllowNegative('abc', 'test', 42)).toBe(42);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe('parseFloatSafe', () => {
  it('should return default for undefined', () => {
    expect(parseFloatSafe(undefined, 'test', 0.5)).toBe(0.5);
  });

  it('should parse valid floats', () => {
    expect(parseFloatSafe('3.14', 'test', 0)).toBe(3.14);
    expect(parseFloatSafe('0.001', 'test', 0)).toBe(0.001);
    expect(parseFloatSafe('100', 'test', 0)).toBe(100);
  });

  it('should return default and warn for NaN', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(parseFloatSafe('xyz', 'test', 0.5)).toBe(0.5);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('should return default and warn for negative values', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(parseFloatSafe('-1.5', 'test', 0.5)).toBe(0.5);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe('parseBoolSafe', () => {
  it('should return default for undefined', () => {
    expect(parseBoolSafe(undefined, true)).toBe(true);
    expect(parseBoolSafe(undefined, false)).toBe(false);
  });

  it('should parse truthy strings', () => {
    expect(parseBoolSafe('true', false)).toBe(true);
    expect(parseBoolSafe('TRUE', false)).toBe(true);
    expect(parseBoolSafe('yes', false)).toBe(true);
    expect(parseBoolSafe('YES', false)).toBe(true);
    expect(parseBoolSafe('1', false)).toBe(true);
    expect(parseBoolSafe('on', false)).toBe(true);
  });

  it('should parse falsy strings', () => {
    expect(parseBoolSafe('false', true)).toBe(false);
    expect(parseBoolSafe('FALSE', true)).toBe(false);
    expect(parseBoolSafe('no', true)).toBe(false);
    expect(parseBoolSafe('NO', true)).toBe(false);
    expect(parseBoolSafe('0', true)).toBe(false);
    expect(parseBoolSafe('off', true)).toBe(false);
  });

  it('should return default for unrecognized strings', () => {
    expect(parseBoolSafe('maybe', true)).toBe(true);
    expect(parseBoolSafe('maybe', false)).toBe(false);
    expect(parseBoolSafe('', true)).toBe(true);
  });
});

describe('parseEnumSafe', () => {
  const validValues = ['debug', 'info', 'warn', 'error'] as const;

  it('should return default for undefined', () => {
    expect(parseEnumSafe(undefined, validValues, 'level', 'info')).toBe('info');
  });

  it('should parse valid enum values', () => {
    expect(parseEnumSafe('debug', validValues, 'level', 'info')).toBe('debug');
    expect(parseEnumSafe('error', validValues, 'level', 'info')).toBe('error');
  });

  it('should handle case insensitivity', () => {
    expect(parseEnumSafe('DEBUG', validValues, 'level', 'info')).toBe('debug');
    expect(parseEnumSafe('INFO', validValues, 'level', 'debug')).toBe('info');
  });

  it('should return default and warn for invalid values', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(parseEnumSafe('invalid', validValues, 'level', 'info')).toBe('info');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('valid values are'));
    warnSpy.mockRestore();
  });
});

describe('parseWithValidator', () => {
  it('should return default for undefined', () => {
    expect(parseWithValidator(
      undefined,
      (v) => parseInt(v, 10),
      (n) => n > 0,
      'test',
      99
    )).toBe(99);
  });

  it('should parse and validate successfully', () => {
    const result = parseWithValidator(
      '42',
      (v) => parseInt(v, 10),
      (n) => n > 0 && n < 100,
      'test',
      0
    );
    expect(result).toBe(42);
  });

  it('should return default when validation fails', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = parseWithValidator(
      '150',
      (v) => parseInt(v, 10),
      (n) => n > 0 && n < 100, // 150 fails this validation
      'test',
      50
    );
    expect(result).toBe(50);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('should return default when parser throws', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = parseWithValidator(
      'invalid',
      () => { throw new Error('Parse error'); },
      () => true,
      'test',
      'default'
    );
    expect(result).toBe('default');
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('should work with complex types', () => {
    const dateResult = parseWithValidator(
      '2024-01-15',
      (v) => new Date(v),
      (d) => !isNaN(d.getTime()),
      'date',
      new Date(0)
    );
    expect(dateResult.toISOString()).toContain('2024-01-15');
  });
});
