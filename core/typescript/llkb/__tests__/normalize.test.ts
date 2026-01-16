/**
 * Unit tests for code normalization functions
 *
 * Tests:
 * - normalizeCode: String/number/variable normalization
 * - hashCode: Deterministic hash generation
 * - tokenize: Token extraction for similarity
 * - countLines: Line counting
 */

import { describe, expect, it } from 'vitest';
import { normalizeCode, hashCode, tokenize, countLines } from '../normalize.js';

// =============================================================================
// normalizeCode Tests
// =============================================================================

describe('normalizeCode', () => {
  it('normalizes single-quoted strings', () => {
    const code = `await page.click('button.submit')`;
    const result = normalizeCode(code);
    expect(result).toBe('await page.click(<STRING>)');
  });

  it('normalizes double-quoted strings', () => {
    const code = `await page.fill("input#name", "John Doe")`;
    const result = normalizeCode(code);
    expect(result).toBe('await page.fill(<STRING>, <STRING>)');
  });

  it('normalizes template literals', () => {
    const code = 'const url = `https://example.com/${path}`';
    const result = normalizeCode(code);
    expect(result).toBe('const <VAR> = <STRING>');
  });

  it('normalizes numeric literals', () => {
    const code = `await page.waitForTimeout(5000)`;
    const result = normalizeCode(code);
    expect(result).toBe('await page.waitForTimeout(<NUMBER>)');
  });

  it('normalizes decimal numbers', () => {
    const code = `const ratio = 3.14159`;
    const result = normalizeCode(code);
    expect(result).toBe('const <VAR> = <NUMBER>');
  });

  it('normalizes const variable declarations', () => {
    const code = `const myVariable = await page.locator('.item')`;
    const result = normalizeCode(code);
    expect(result).toBe('const <VAR> = await page.locator(<STRING>)');
  });

  it('normalizes let variable declarations', () => {
    const code = `let counter = 0`;
    const result = normalizeCode(code);
    expect(result).toBe('let <VAR> = <NUMBER>');
  });

  it('normalizes var variable declarations', () => {
    const code = `var oldStyle = true`;
    const result = normalizeCode(code);
    expect(result).toBe('var <VAR> = true');
  });

  it('normalizes multiple whitespace to single space', () => {
    const code = `await   page.click(   'button'   )`;
    const result = normalizeCode(code);
    expect(result).toBe('await page.click( <STRING> )');
  });

  it('trims leading and trailing whitespace', () => {
    const code = `   await page.click('button')   `;
    const result = normalizeCode(code);
    expect(result).toBe('await page.click(<STRING>)');
  });

  it('handles complex code with multiple patterns', () => {
    const code = `
      const locator = page.getByTestId("submit-btn");
      await locator.waitFor({ timeout: 5000 });
      await locator.click();
    `;
    const result = normalizeCode(code);
    expect(result).toContain('const <VAR>');
    expect(result).toContain('<STRING>');
    expect(result).toContain('<NUMBER>');
  });

  it('preserves method names and keywords', () => {
    const code = `await expect(page).toHaveURL('/dashboard')`;
    const result = normalizeCode(code);
    expect(result).toBe('await expect(page).toHaveURL(<STRING>)');
  });

  it('handles empty string', () => {
    const result = normalizeCode('');
    expect(result).toBe('');
  });

  it('handles code with no patterns to normalize', () => {
    const code = 'await page.reload()';
    const result = normalizeCode(code);
    expect(result).toBe('await page.reload()');
  });
});

// =============================================================================
// hashCode Tests
// =============================================================================

describe('hashCode', () => {
  it('generates consistent hash for same input', () => {
    const input = 'await page.click("button")';
    const hash1 = hashCode(input);
    const hash2 = hashCode(input);
    expect(hash1).toBe(hash2);
  });

  it('generates different hashes for different inputs', () => {
    const hash1 = hashCode('input A');
    const hash2 = hashCode('input B');
    expect(hash1).not.toBe(hash2);
  });

  it('returns hexadecimal string', () => {
    const hash = hashCode('test input');
    expect(hash).toMatch(/^[a-f0-9]+$/);
  });

  it('handles empty string', () => {
    const hash = hashCode('');
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
  });

  it('handles unicode characters', () => {
    const hash = hashCode('こんにちは世界');
    expect(typeof hash).toBe('string');
    expect(hash).toMatch(/^[a-f0-9]+$/);
  });

  it('generates short hash (8 chars)', () => {
    const hash = hashCode('any input');
    expect(hash.length).toBe(8);
  });
});

// =============================================================================
// tokenize Tests
// =============================================================================

describe('tokenize', () => {
  it('extracts words as tokens', () => {
    const code = 'await page click button';
    const tokens = tokenize(code);
    expect(tokens.has('await')).toBe(true);
    expect(tokens.has('page')).toBe(true);
    expect(tokens.has('click')).toBe(true);
    expect(tokens.has('button')).toBe(true);
  });

  it('preserves original case', () => {
    const code = 'AWAIT Page CLICK';
    const tokens = tokenize(code);
    // Tokenize preserves case - use original casing
    expect(tokens.has('AWAIT')).toBe(true);
    expect(tokens.has('Page')).toBe(true);
    expect(tokens.has('CLICK')).toBe(true);
  });

  it('extracts tokens from code with punctuation', () => {
    const code = `await page.click('.button')`;
    const tokens = tokenize(code);
    expect(tokens.has('await')).toBe(true);
    expect(tokens.has('page')).toBe(true);
    expect(tokens.has('click')).toBe(true);
    // Implementation includes quotes as tokens since they're not in the delimiter regex
    expect(tokens.has("'")).toBe(true);
  });

  it('includes single character tokens (no filtering)', () => {
    const code = 'a = b + c';
    const tokens = tokenize(code);
    // Implementation does not filter single chars
    expect(tokens.has('a')).toBe(true);
    expect(tokens.has('b')).toBe(true);
    expect(tokens.has('c')).toBe(true);
  });

  it('includes keyword tokens (no noise filtering)', () => {
    const code = 'const var let function await async';
    const tokens = tokenize(code);
    // Implementation does not filter noise words
    expect(tokens.has('const')).toBe(true);
    expect(tokens.has('var')).toBe(true);
    expect(tokens.has('let')).toBe(true);
    expect(tokens.has('function')).toBe(true);
  });

  it('returns Set (unique tokens)', () => {
    const code = 'page page page click click';
    const tokens = tokenize(code);
    expect(tokens.size).toBe(2);
  });

  it('handles empty string', () => {
    const tokens = tokenize('');
    expect(tokens.size).toBe(0);
  });

  it('handles code with numbers', () => {
    const code = 'timeout 5000 retry 3';
    const tokens = tokenize(code);
    expect(tokens.has('timeout')).toBe(true);
    expect(tokens.has('retry')).toBe(true);
    expect(tokens.has('5000')).toBe(true);
    expect(tokens.has('3')).toBe(true);
  });
});

// =============================================================================
// countLines Tests
// =============================================================================

describe('countLines', () => {
  it('counts single line', () => {
    const code = 'await page.click("button")';
    expect(countLines(code)).toBe(1);
  });

  it('counts multiple lines', () => {
    const code = `line 1
line 2
line 3`;
    expect(countLines(code)).toBe(3);
  });

  it('handles Windows line endings', () => {
    const code = 'line 1\r\nline 2\r\nline 3';
    expect(countLines(code)).toBe(3);
  });

  it('handles mixed line endings', () => {
    const code = 'line 1\nline 2\r\nline 3';
    expect(countLines(code)).toBe(3);
  });

  it('counts empty lines', () => {
    const code = `line 1

line 3`;
    expect(countLines(code)).toBe(3);
  });

  it('handles empty string', () => {
    expect(countLines('')).toBe(0);
  });

  it('handles string with only newlines', () => {
    const code = '\n\n\n';
    expect(countLines(code)).toBe(4); // empty string before each \n plus one after
  });

  it('handles code block', () => {
    const code = `async function test() {
  await page.goto('/');
  await page.click('button');
  await expect(page).toHaveURL('/dashboard');
}`;
    expect(countLines(code)).toBe(5);
  });
});
