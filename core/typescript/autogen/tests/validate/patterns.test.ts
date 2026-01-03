/**
 * Forbidden Pattern Scanner Tests
 * @see T036 - Unit test for forbidden pattern scanner
 */
import { describe, it, expect } from 'vitest';
import {
  scanForbiddenPatterns,
  scanResultsToIssues,
  hasErrorViolations,
  filterBySeverity,
  getViolationSummary,
  FORBIDDEN_PATTERNS,
} from '../../src/validate/patterns.js';

describe('scanForbiddenPatterns', () => {
  describe('waitForTimeout detection', () => {
    it('should detect page.waitForTimeout', () => {
      const code = `
        await page.waitForTimeout(1000);
      `;
      const results = scanForbiddenPatterns(code);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].pattern.id).toBe('WAIT_TIMEOUT');
    });

    it('should not flag legitimate waits', () => {
      const code = `
        await page.waitForSelector('.element');
        await page.waitForLoadState('networkidle');
      `;
      const results = scanForbiddenPatterns(code);
      const timeoutViolations = results.filter((r) => r.pattern.id === 'WAIT_TIMEOUT');
      expect(timeoutViolations.length).toBe(0);
    });
  });

  describe('force option detection', () => {
    it('should detect force: true on click', () => {
      const code = `
        await page.click('.button', { force: true });
      `;
      const results = scanForbiddenPatterns(code);
      expect(results.some((r) => r.pattern.id === 'FORCE_CLICK')).toBe(true);
    });

    it('should not flag normal clicks', () => {
      const code = `
        await page.click('.button');
        await page.getByRole('button').click();
      `;
      const results = scanForbiddenPatterns(code);
      const forceViolations = results.filter((r) => r.pattern.id === 'FORCE_CLICK');
      expect(forceViolations.length).toBe(0);
    });
  });

  describe('test.only detection', () => {
    it('should detect test.only', () => {
      const code = `
        test.only('should work', async () => {
          // test code
        });
      `;
      const results = scanForbiddenPatterns(code);
      expect(results.some((r) => r.pattern.id === 'TEST_ONLY')).toBe(true);
    });
  });

  describe('hardcoded URL detection', () => {
    it('should detect hardcoded URLs', () => {
      const code = `
        await page.goto('https://example.com/login');
      `;
      const results = scanForbiddenPatterns(code);
      expect(results.some((r) => r.pattern.id === 'HARDCODED_URL')).toBe(true);
    });

    it('should not flag relative URLs', () => {
      const code = `
        await page.goto('/login');
      `;
      const results = scanForbiddenPatterns(code);
      const urlViolations = results.filter((r) => r.pattern.id === 'HARDCODED_URL');
      expect(urlViolations.length).toBe(0);
    });
  });

  describe('console.log detection', () => {
    it('should detect console.log', () => {
      const code = `
        console.log('debug');
        console.error('error');
      `;
      const results = scanForbiddenPatterns(code);
      expect(results.filter((r) => r.pattern.id === 'CONSOLE_LOG').length).toBe(2);
    });
  });

  describe('element handle detection', () => {
    it('should detect page.$', () => {
      const code = `
        const element = await page.$('.selector');
      `;
      const results = scanForbiddenPatterns(code);
      expect(results.some((r) => r.pattern.id === 'ELEMENT_HANDLE')).toBe(true);
    });

    it('should detect page.$$', () => {
      const code = `
        const elements = await page.$$('.selector');
      `;
      const results = scanForbiddenPatterns(code);
      expect(results.some((r) => r.pattern.id === 'ELEMENT_HANDLE')).toBe(true);
    });
  });

  describe('line and column tracking', () => {
    it('should report correct line numbers', () => {
      const code = `line 1
line 2
await page.waitForTimeout(1000);
line 4`;
      const results = scanForbiddenPatterns(code);
      expect(results[0].line).toBe(3);
    });

    it('should include line content', () => {
      const code = `
        await page.waitForTimeout(1000);
      `;
      const results = scanForbiddenPatterns(code);
      expect(results[0].lineContent).toContain('waitForTimeout');
    });
  });

  describe('multiple violations', () => {
    it('should detect multiple different violations', () => {
      const code = `
        test.only('bad test', async () => {
          await page.waitForTimeout(1000);
          await page.click('.btn', { force: true });
          console.log('debug');
        });
      `;
      const results = scanForbiddenPatterns(code);
      const violationTypes = new Set(results.map((r) => r.pattern.id));
      expect(violationTypes.size).toBeGreaterThanOrEqual(3);
    });
  });
});

describe('scanResultsToIssues', () => {
  it('should convert scan results to validation issues', () => {
    const code = `await page.waitForTimeout(1000);`;
    const results = scanForbiddenPatterns(code);
    const issues = scanResultsToIssues(results);

    expect(issues.length).toBe(results.length);
    expect(issues[0].code).toBe('WAIT_TIMEOUT');
    expect(issues[0].severity).toBe('error');
    expect(issues[0].message).toContain('Line 1');
  });
});

describe('hasErrorViolations', () => {
  it('should return true for error-level violations', () => {
    const code = `await page.waitForTimeout(1000);`;
    const results = scanForbiddenPatterns(code);
    expect(hasErrorViolations(results)).toBe(true);
  });

  it('should return false for warning-only violations', () => {
    const code = `console.log('debug');`;
    const results = scanForbiddenPatterns(code);
    expect(hasErrorViolations(results)).toBe(false);
  });

  it('should return false for clean code', () => {
    const code = `
      test('should work', async ({ page }) => {
        await page.goto('/login');
        await page.getByRole('button', { name: 'Submit' }).click();
      });
    `;
    const results = scanForbiddenPatterns(code);
    expect(hasErrorViolations(results)).toBe(false);
  });
});

describe('filterBySeverity', () => {
  it('should filter by error severity', () => {
    const code = `
      await page.waitForTimeout(1000);
      console.log('debug');
    `;
    const results = scanForbiddenPatterns(code);
    const errors = filterBySeverity(results, 'error');
    const infos = filterBySeverity(results, 'info');

    expect(errors.every((r) => r.pattern.severity === 'error')).toBe(true);
    expect(infos.every((r) => r.pattern.severity === 'info')).toBe(true);
  });
});

describe('getViolationSummary', () => {
  it('should provide accurate summary', () => {
    const code = `
      await page.waitForTimeout(1000);
      await page.waitForTimeout(2000);
      console.log('debug');
    `;
    const results = scanForbiddenPatterns(code);
    const summary = getViolationSummary(results);

    expect(summary.total).toBe(3);
    expect(summary.errors).toBe(2); // waitForTimeout is error
    expect(summary.info).toBe(1); // console.log is info
    expect(summary.byPattern['WAIT_TIMEOUT']).toBe(2);
    expect(summary.byPattern['CONSOLE_LOG']).toBe(1);
  });
});

describe('FORBIDDEN_PATTERNS', () => {
  it('should have unique IDs', () => {
    const ids = FORBIDDEN_PATTERNS.map((p) => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should have suggestions for all patterns', () => {
    for (const pattern of FORBIDDEN_PATTERNS) {
      expect(pattern.suggestion).toBeTruthy();
      expect(pattern.reason).toBeTruthy();
    }
  });
});
