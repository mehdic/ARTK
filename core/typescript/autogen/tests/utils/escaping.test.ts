/**
 * Tests for escaping utilities
 */
import { describe, it, expect } from 'vitest';
import { escapeRegex, escapeString, escapeSelector } from '../../src/utils/escaping.js';

describe('escapeRegex', () => {
  it('should escape special regex characters', () => {
    expect(escapeRegex('hello.world')).toBe('hello\\.world');
    expect(escapeRegex('test*')).toBe('test\\*');
    expect(escapeRegex('test+')).toBe('test\\+');
    expect(escapeRegex('test?')).toBe('test\\?');
    expect(escapeRegex('test^')).toBe('test\\^');
    expect(escapeRegex('test$')).toBe('test\\$');
  });

  it('should escape curly braces', () => {
    expect(escapeRegex('test{}')).toBe('test\\{\\}');
  });

  it('should escape parentheses and pipe', () => {
    expect(escapeRegex('(test|value)')).toBe('\\(test\\|value\\)');
  });

  it('should escape square brackets', () => {
    expect(escapeRegex('test[abc]')).toBe('test\\[abc\\]');
  });

  it('should escape backslashes', () => {
    expect(escapeRegex('test\\value')).toBe('test\\\\value');
  });

  it('should escape forward slashes for URL patterns', () => {
    expect(escapeRegex('/api/users')).toBe('\\/api\\/users');
  });

  it('should handle multiple special characters', () => {
    expect(escapeRegex('/api/users?q=test.*')).toBe('\\/api\\/users\\?q=test\\.\\*');
  });

  it('should not escape normal characters', () => {
    expect(escapeRegex('hello world 123')).toBe('hello world 123');
  });

  it('should handle empty strings', () => {
    expect(escapeRegex('')).toBe('');
  });
});

describe('escapeString', () => {
  it('should escape backslashes', () => {
    expect(escapeString('path\\to\\file')).toBe('path\\\\to\\\\file');
  });

  it('should escape single quotes', () => {
    expect(escapeString("it's a test")).toBe("it\\'s a test");
  });

  it('should escape double quotes', () => {
    expect(escapeString('say "hello"')).toBe('say \\"hello\\"');
  });

  it('should escape newlines', () => {
    expect(escapeString('line1\nline2')).toBe('line1\\nline2');
  });

  it('should escape carriage returns', () => {
    expect(escapeString('line1\rline2')).toBe('line1\\rline2');
  });

  it('should handle multiple escape sequences', () => {
    expect(escapeString("path\\to\\'file'\nwith\"quotes\"")).toBe(
      "path\\\\to\\\\\\'file\\'\\nwith\\\"quotes\\\""
    );
  });

  it('should not escape normal characters', () => {
    expect(escapeString('hello world 123')).toBe('hello world 123');
  });

  it('should handle empty string', () => {
    expect(escapeString('')).toBe('');
  });
});

describe('escapeSelector', () => {
  it('should escape single quotes', () => {
    expect(escapeSelector("it's a test")).toBe("it\\'s a test");
  });

  it('should handle multiple single quotes', () => {
    expect(escapeSelector("user's name's value")).toBe("user\\'s name\\'s value");
  });

  it('should not escape other characters', () => {
    expect(escapeSelector('hello world 123')).toBe('hello world 123');
  });

  it('should not escape double quotes', () => {
    expect(escapeSelector('say "hello"')).toBe('say "hello"');
  });

  it('should handle empty string', () => {
    expect(escapeSelector('')).toBe('');
  });
});
