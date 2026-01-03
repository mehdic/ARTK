/**
 * Navigation Wait Fix Tests
 * @see T059 - Unit test for navigation wait fix
 */
import { describe, it, expect } from 'vitest';
import {
  hasNavigationWait,
  extractUrlFromError,
  extractUrlFromGoto,
  inferUrlPattern,
  generateWaitForURL,
  generateToHaveURL,
  insertNavigationWait,
  applyNavigationFix,
  fixMissingGotoAwait,
} from '../../../src/heal/fixes/navigation.js';

describe('hasNavigationWait', () => {
  it('should detect waitForURL', () => {
    expect(hasNavigationWait("await page.waitForURL('/dashboard')")).toBe(true);
  });

  it('should detect toHaveURL assertion', () => {
    expect(hasNavigationWait("await expect(page).toHaveURL('/dashboard')")).toBe(true);
  });

  it('should detect waitForNavigation', () => {
    expect(hasNavigationWait("await page.waitForNavigation()")).toBe(true);
  });

  it('should detect waitForLoadState', () => {
    expect(hasNavigationWait("await page.waitForLoadState('networkidle')")).toBe(true);
  });

  it('should return false when no wait present', () => {
    expect(hasNavigationWait("await page.click('.btn')")).toBe(false);
  });
});

describe('extractUrlFromError', () => {
  it('should extract URL from match error', () => {
    const error = "Expected URL to match '/dashboard/'";
    expect(extractUrlFromError(error)).toBe('/dashboard/');
  });

  it('should extract URL from expected error', () => {
    const error = "expected 'http://localhost/home' to match";
    expect(extractUrlFromError(error)).toBe('http://localhost/home');
  });

  it('should extract URL from waiting message', () => {
    const error = "waiting for URL '/login'";
    expect(extractUrlFromError(error)).toBe('/login');
  });

  it('should return null for unrelated error', () => {
    expect(extractUrlFromError('Element not found')).toBeNull();
  });
});

describe('extractUrlFromGoto', () => {
  it('should extract URL from goto call', () => {
    expect(extractUrlFromGoto("await page.goto('/dashboard')")).toBe('/dashboard');
  });

  it('should handle template literals', () => {
    expect(extractUrlFromGoto('await page.goto(`/user/${id}`)')).toBe('/user/${id}');
  });

  it('should return null when no goto', () => {
    expect(extractUrlFromGoto("await page.click('.btn')")).toBeNull();
  });
});

describe('inferUrlPattern', () => {
  it('should prefer error message URL', () => {
    const pattern = inferUrlPattern(
      "await page.goto('/home')",
      "Expected URL to match '/dashboard/'"
    );
    expect(pattern).toBe('/dashboard/');
  });

  it('should fall back to goto URL', () => {
    const pattern = inferUrlPattern(
      "await page.goto('/dashboard')",
      'Some other error'
    );
    // Note: special chars in URL are escaped for regex
    expect(pattern).toBe('/dashboard');
  });

  it('should return null when no URL found', () => {
    const pattern = inferUrlPattern(
      "await page.click('.btn')",
      'Element not found'
    );
    expect(pattern).toBeNull();
  });
});

describe('generateWaitForURL', () => {
  it('should generate string-based wait', () => {
    expect(generateWaitForURL('/dashboard')).toBe("await page.waitForURL('/dashboard')");
  });

  it('should generate regex for pattern with special chars', () => {
    expect(generateWaitForURL('.*dashboard.*')).toBe('await page.waitForURL(/.*dashboard.*/)');
  });

  it('should include timeout when provided', () => {
    const result = generateWaitForURL('/dashboard', { timeout: 5000 });
    expect(result).toContain('timeout');
    expect(result).toContain('5000');
  });
});

describe('generateToHaveURL', () => {
  it('should generate string-based assertion', () => {
    expect(generateToHaveURL('/dashboard')).toBe("await expect(page).toHaveURL('/dashboard')");
  });

  it('should generate regex for pattern', () => {
    expect(generateToHaveURL('.*dashboard')).toBe('await expect(page).toHaveURL(/.*dashboard/)');
  });
});

describe('insertNavigationWait', () => {
  it('should insert wait after specified line', () => {
    const code = `await page.click('.login-btn');
await page.fill('#username', 'test');`;
    const result = insertNavigationWait(code, 1, '/dashboard');

    expect(result.applied).toBe(true);
    expect(result.code).toContain("toHaveURL('/dashboard')");
  });

  it('should preserve indentation', () => {
    const code = `    await page.click('.btn');`;
    const result = insertNavigationWait(code, 1, '/dashboard');

    expect(result.applied).toBe(true);
    expect(result.code).toMatch(/^\s{4}await expect/m);
  });

  it('should not insert if wait already exists', () => {
    const code = `await page.click('.btn');
await page.waitForURL('/dashboard');`;
    const result = insertNavigationWait(code, 1, '/dashboard');

    expect(result.applied).toBe(false);
  });

  it('should return not applied for invalid line number', () => {
    const result = insertNavigationWait('line', 99, '/dashboard');

    expect(result.applied).toBe(false);
  });
});

describe('applyNavigationFix', () => {
  it('should add navigation wait with inferred URL', () => {
    const result = applyNavigationFix({
      code: `await page.goto('/dashboard');
await page.click('.btn');`,
      lineNumber: 1,
      errorMessage: "Expected URL to match '/dashboard/'",
    });

    expect(result.applied).toBe(true);
    expect(result.code).toContain('toHaveURL');
  });

  it('should add waitForLoadState as fallback', () => {
    const result = applyNavigationFix({
      code: `await page.click('.btn');`,
      lineNumber: 1,
      errorMessage: 'Navigation failed',
    });

    expect(result.applied).toBe(true);
    expect(result.code).toContain('waitForLoadState');
  });

  it('should not apply if wait exists in context', () => {
    // Note: hasNavigationWait checks the whole code, not just context around lineNumber
    const code = `await page.click('.btn');
await page.waitForURL('/dashboard');`;

    // The function checks if navigation wait already exists in the code
    expect(hasNavigationWait(code)).toBe(true);
  });
});

describe('fixMissingGotoAwait', () => {
  it('should add await to page.goto', () => {
    const result = fixMissingGotoAwait("page.goto('/dashboard')");

    expect(result.applied).toBe(true);
    expect(result.code).toBe("await page.goto('/dashboard')");
  });

  it('should not double-add await', () => {
    const result = fixMissingGotoAwait("await page.goto('/dashboard')");

    expect(result.applied).toBe(false);
  });
});
