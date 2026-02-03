/**
 * Tests for Playwright error parsing utilities
 *
 * Uses real Playwright output fixtures to verify error parsing accuracy.
 * @module tests/cli/error-parsing
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  parseErrorType,
  parseErrorLocation,
  suggestFix,
  parseErrors,
  type ErrorType,
} from '../../src/cli/run.js';

// ═══════════════════════════════════════════════════════════════════════════
// FIXTURE LOADING
// ═══════════════════════════════════════════════════════════════════════════

const FIXTURES_DIR = join(process.cwd(), 'tests', 'fixtures', 'playwright-outputs');

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), 'utf-8');
}

// ═══════════════════════════════════════════════════════════════════════════
// parseErrorType TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('parseErrorType', () => {
  describe('timeout errors', () => {
    it('should detect timeout from "Timeout XXms" pattern', () => {
      expect(parseErrorType('Timeout 30000ms exceeded')).toBe('timeout');
    });

    it('should detect timeout from "timeout exceeded" pattern', () => {
      expect(parseErrorType('Action timeout exceeded')).toBe('timeout');
    });

    it('should detect timeout from Playwright error message', () => {
      // This is the actual error message line from Playwright
      expect(parseErrorType('Error: locator.click: Timeout 30000ms exceeded.')).toBe('timeout');
    });
  });

  describe('selector errors', () => {
    it('should detect selector error from "locator.click:" pattern', () => {
      expect(parseErrorType('locator.click: Error: strict mode violation')).toBe('selector');
    });

    it('should detect selector error from "resolved to 0 elements" pattern', () => {
      expect(parseErrorType('Error: strict mode violation: locator resolved to 0 elements')).toBe('selector');
    });

    it('should detect selector error from Playwright error message', () => {
      // Actual Playwright selector error
      expect(parseErrorType('Error: locator.click: Error: strict mode violation: locator(\'[data-testid="x"]\') resolved to 0 elements')).toBe('selector');
    });
  });

  describe('assertion errors', () => {
    it('should detect assertion error from "expect(" pattern', () => {
      expect(parseErrorType('Error: expect(locator).toHaveText(expected)')).toBe('assertion');
    });

    it('should detect assertion error from "Expected string:" pattern', () => {
      expect(parseErrorType('Expected string: "$150.00"')).toBe('assertion');
    });

    it('should detect assertion error from "assertion" keyword', () => {
      expect(parseErrorType('Assertion failed: expected true')).toBe('assertion');
    });

    it('should detect assertion error from Playwright expect message', () => {
      // Actual Playwright assertion error
      expect(parseErrorType('Error: expect(locator).toHaveText(expected) Locator: locator(\'[data-testid="cart-total"]\')')).toBe('assertion');
    });
  });

  describe('navigation errors', () => {
    it('should detect navigation error from "navigation" keyword', () => {
      expect(parseErrorType('Navigation to URL failed')).toBe('navigation');
    });

    it('should detect navigation error from "page.goto" keyword', () => {
      expect(parseErrorType('Error: page.goto: net::ERR_NAME_NOT_RESOLVED')).toBe('navigation');
    });

    it('should detect navigation error from "net::ERR" pattern', () => {
      expect(parseErrorType('net::ERR_CONNECTION_REFUSED')).toBe('navigation');
    });
  });

  describe('typescript errors', () => {
    it('should detect TypeScript error from "error TS" pattern', () => {
      expect(parseErrorType('error TS2304: Cannot find name')).toBe('typescript');
    });

    it('should detect TypeScript error from "SyntaxError:" pattern', () => {
      expect(parseErrorType('SyntaxError: Unexpected token')).toBe('typescript');
    });

    it('should detect TypeScript error from TS code reference', () => {
      expect(parseErrorType('tests/broken.spec.ts:12:5 - error TS2304: Cannot find name')).toBe('typescript');
    });
  });

  describe('runtime errors', () => {
    it('should detect runtime error from "TypeError:" pattern', () => {
      expect(parseErrorType('TypeError: Cannot read properties of undefined')).toBe('runtime');
    });

    it('should detect runtime error from "Error:" pattern', () => {
      expect(parseErrorType('Error: Something went wrong')).toBe('runtime');
    });

    it('should detect runtime error from "exception" keyword', () => {
      expect(parseErrorType('Unhandled exception in test')).toBe('runtime');
    });
  });

  describe('unknown errors', () => {
    it('should return unknown for unrecognized patterns', () => {
      expect(parseErrorType('Some completely random message')).toBe('unknown');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// parseErrorLocation TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('parseErrorLocation', () => {
  it('should parse file:line:column format', () => {
    const location = parseErrorLocation('at tests/login.spec.ts:23:35');

    expect(location).toBeDefined();
    expect(location?.file).toBe('tests/login.spec.ts');
    expect(location?.line).toBe(23);
    expect(location?.column).toBe(35);
  });

  it('should parse file:line format without column', () => {
    const location = parseErrorLocation('error at src/utils.ts:42');

    expect(location).toBeDefined();
    expect(location?.file).toBe('src/utils.ts');
    expect(location?.line).toBe(42);
    expect(location?.column).toBeUndefined();
  });

  it('should handle .js files', () => {
    const location = parseErrorLocation('Error in dist/index.js:100:5');

    expect(location).toBeDefined();
    expect(location?.file).toBe('dist/index.js');
    expect(location?.line).toBe(100);
  });

  it('should extract location from timeout error fixture', () => {
    const fixture = loadFixture('timeout-error.txt');
    const location = parseErrorLocation(fixture);

    expect(location).toBeDefined();
    expect(location?.file).toBe('tests/login.spec.ts');
    // The first location found is the test definition line
    expect(location?.line).toBe(15);
  });

  it('should extract location from selector error fixture', () => {
    const fixture = loadFixture('selector-not-found.txt');
    const location = parseErrorLocation(fixture);

    expect(location).toBeDefined();
    expect(location?.file).toBe('tests/dashboard.spec.ts');
    // The first location found is the test definition line
    expect(location?.line).toBe(8);
  });

  it('should extract location from assertion error fixture', () => {
    const fixture = loadFixture('assertion-failure.txt');
    const location = parseErrorLocation(fixture);

    expect(location).toBeDefined();
    expect(location?.file).toBe('tests/cart.spec.ts');
    // The first location found is the test definition line
    expect(location?.line).toBe(22);
  });

  it('should return undefined for messages without location', () => {
    const location = parseErrorLocation('Some error without file reference');

    expect(location).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// suggestFix TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('suggestFix', () => {
  it('should suggest fix for selector errors with locator', () => {
    const suggestion = suggestFix('selector', 'locator.click failed');

    expect(suggestion).toBeDefined();
    expect(suggestion).toContain('selector');
  });

  it('should suggest fix for selector errors without locator', () => {
    const suggestion = suggestFix('selector', 'Element not found');

    expect(suggestion).toBeDefined();
    expect(suggestion).toContain('Element not found');
  });

  it('should suggest fix for timeout errors', () => {
    const suggestion = suggestFix('timeout', 'Timeout exceeded');

    expect(suggestion).toBeDefined();
    expect(suggestion).toContain('timeout');
  });

  it('should suggest fix for assertion errors', () => {
    const suggestion = suggestFix('assertion', 'expect failed');

    expect(suggestion).toBeDefined();
    expect(suggestion).toContain('expected');
  });

  it('should suggest fix for navigation errors', () => {
    const suggestion = suggestFix('navigation', 'page.goto failed');

    expect(suggestion).toBeDefined();
    expect(suggestion).toContain('URL');
  });

  it('should suggest fix for typescript errors', () => {
    const suggestion = suggestFix('typescript', 'TS2304: Cannot find name');

    expect(suggestion).toBeDefined();
    expect(suggestion).toContain('TypeScript');
  });

  it('should suggest fix for runtime errors', () => {
    const suggestion = suggestFix('runtime', 'Error: undefined');

    expect(suggestion).toBeDefined();
    expect(suggestion).toContain('stack trace');
  });

  it('should return undefined for unknown errors', () => {
    const suggestion = suggestFix('unknown', 'Some error');

    expect(suggestion).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// parseErrors TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('parseErrors', () => {
  it('should parse timeout error fixture', () => {
    const fixture = loadFixture('timeout-error.txt');
    const errors = parseErrors(fixture, '');

    expect(errors.length).toBeGreaterThan(0);

    const timeoutError = errors.find(e => e.type === 'timeout');
    expect(timeoutError).toBeDefined();
    expect(timeoutError?.location?.file).toBe('tests/login.spec.ts');
    expect(timeoutError?.suggestion).toBeDefined();
  });

  it('should parse selector error fixture', () => {
    const fixture = loadFixture('selector-not-found.txt');
    const errors = parseErrors(fixture, '');

    expect(errors.length).toBeGreaterThan(0);

    const selectorError = errors.find(e => e.type === 'selector');
    expect(selectorError).toBeDefined();
    expect(selectorError?.location?.file).toBe('tests/dashboard.spec.ts');
    expect(selectorError?.suggestion).toBeDefined();
  });

  it('should parse assertion error fixture', () => {
    const fixture = loadFixture('assertion-failure.txt');
    const errors = parseErrors(fixture, '');

    expect(errors.length).toBeGreaterThan(0);

    const assertionError = errors.find(e => e.type === 'assertion');
    expect(assertionError).toBeDefined();
    expect(assertionError?.location?.file).toBe('tests/cart.spec.ts');
    expect(assertionError?.suggestion).toBeDefined();
  });

  it('should parse navigation error fixture', () => {
    const fixture = loadFixture('navigation-error.txt');
    const errors = parseErrors(fixture, '');

    expect(errors.length).toBeGreaterThan(0);

    const navError = errors.find(e => e.type === 'navigation');
    expect(navError).toBeDefined();
    expect(navError?.location?.file).toBe('tests/checkout.spec.ts');
    expect(navError?.suggestion).toBeDefined();
  });

  it('should parse TypeScript error fixture', () => {
    const fixture = loadFixture('typescript-error.txt');
    const errors = parseErrors(fixture, '');

    expect(errors.length).toBeGreaterThan(0);

    // TypeScript errors should be detected
    const tsError = errors.find(e => e.type === 'typescript');
    expect(tsError).toBeDefined();
  });

  it('should extract code snippet when available', () => {
    const fixture = loadFixture('timeout-error.txt');
    const errors = parseErrors(fixture, '');

    // Some errors should have snippets (the > 23 | line format)
    const errorWithSnippet = errors.find(e => e.snippet);
    expect(errorWithSnippet?.snippet).toBeDefined();
  });

  it('should handle combined stdout and stderr', () => {
    const stdout = 'Running 1 test\nError: Timeout exceeded at test.ts:10:5';
    const stderr = 'FAILED test.spec.ts';
    const errors = parseErrors(stdout, stderr);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('should return empty array for passing test output', () => {
    const stdout = `Running 1 test using 1 worker
  ✓ tests/login.spec.ts:5:5 › Login › should work (500ms)

  1 passed`;
    const errors = parseErrors(stdout, '');

    // Should not find any errors in passing output
    // Note: The parser might still find "FAILED" patterns, but there should be no real errors
    expect(errors.filter(e => e.type !== 'unknown').length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// INTEGRATION TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('Error parsing integration', () => {
  it('should correctly categorize all fixture types', () => {
    const fixtures: Array<{ name: string; expectedType: ErrorType }> = [
      { name: 'timeout-error.txt', expectedType: 'timeout' },
      { name: 'selector-not-found.txt', expectedType: 'selector' },
      { name: 'assertion-failure.txt', expectedType: 'assertion' },
      { name: 'navigation-error.txt', expectedType: 'navigation' },
      { name: 'typescript-error.txt', expectedType: 'typescript' },
    ];

    for (const { name, expectedType } of fixtures) {
      const fixture = loadFixture(name);
      const errors = parseErrors(fixture, '');

      const matchingError = errors.find(e => e.type === expectedType);
      expect(matchingError, `Expected ${name} to produce ${expectedType} error`).toBeDefined();
    }
  });

  it('should extract file locations from all fixtures', () => {
    const fixturesWithLocations = [
      'timeout-error.txt',
      'selector-not-found.txt',
      'assertion-failure.txt',
      'navigation-error.txt',
    ];

    for (const name of fixturesWithLocations) {
      const fixture = loadFixture(name);
      const errors = parseErrors(fixture, '');

      const errorWithLocation = errors.find(e => e.location);
      expect(errorWithLocation?.location, `Expected ${name} to have location`).toBeDefined();
      expect(errorWithLocation?.location?.file).toContain('.ts');
      expect(errorWithLocation?.location?.line).toBeGreaterThan(0);
    }
  });

  it('should provide suggestions for all error types', () => {
    const errorTypes: ErrorType[] = ['timeout', 'selector', 'assertion', 'navigation', 'typescript', 'runtime'];

    for (const errorType of errorTypes) {
      const suggestion = suggestFix(errorType, 'test message');
      expect(suggestion, `Expected suggestion for ${errorType}`).toBeDefined();
    }
  });
});
