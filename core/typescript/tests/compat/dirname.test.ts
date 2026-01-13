/**
 * Unit tests for getDirname compatibility function
 * T029, T030: Unit tests for getDirname() in both environments
 */

import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { fileURLToPath } from 'url';

// These will be implemented
import { getDirname, getFilename } from '../../compat/dirname.js';

// Expected directory for this test file
const expectedDir = path.dirname(fileURLToPath(import.meta.url));

describe('getDirname', () => {
  it('should return the current directory path', () => {
    // getDirname needs to be called from a module context
    // In tests, we verify it returns a valid path structure
    const result = getDirname(import.meta.url);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should return an absolute path', () => {
    const result = getDirname(import.meta.url);
    // On Unix, absolute paths start with /
    // On Windows, they start with drive letter (C:\)
    expect(path.isAbsolute(result)).toBe(true);
  });

  it('should return a directory that exists', async () => {
    const result = getDirname(import.meta.url);
    const fs = await import('fs');
    expect(fs.existsSync(result)).toBe(true);
  });

  it('should match the expected directory for this test', () => {
    const result = getDirname(import.meta.url);
    // Should point to the tests/compat directory
    expect(result).toBe(expectedDir);
  });

  it('should not include the filename', () => {
    const result = getDirname(import.meta.url);
    expect(result.endsWith('.ts')).toBe(false);
    expect(result.endsWith('.js')).toBe(false);
  });

  it('should handle file:// URLs correctly', () => {
    const fileUrl = 'file:///tmp/test/file.js';
    const result = getDirname(fileUrl);
    expect(result).toBe('/tmp/test');
  });

  it('should throw for invalid URLs', () => {
    expect(() => getDirname('invalid-url')).toThrow();
  });

  it('should throw for empty string', () => {
    expect(() => getDirname('')).toThrow();
  });
});

describe('getFilename', () => {
  it('should return the current filename', () => {
    const result = getFilename(import.meta.url);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should return an absolute path', () => {
    const result = getFilename(import.meta.url);
    expect(path.isAbsolute(result)).toBe(true);
  });

  it('should include the file extension', () => {
    const result = getFilename(import.meta.url);
    expect(result.endsWith('.ts') || result.endsWith('.js')).toBe(true);
  });

  it('should be in the same directory as getDirname returns', () => {
    const dirResult = getDirname(import.meta.url);
    const fileResult = getFilename(import.meta.url);
    expect(path.dirname(fileResult)).toBe(dirResult);
  });
});
