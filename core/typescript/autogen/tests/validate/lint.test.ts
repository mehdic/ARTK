/**
 * ESLint Integration Tests
 * @see T037 - Unit test for ESLint integration
 */
import { describe, it, expect } from 'vitest';
import {
  isESLintAvailable,
  parseESLintOutput,
  hasLintErrors,
  generateESLintConfig,
  PLAYWRIGHT_LINT_RULES,
} from '../../src/validate/lint.js';

describe('isESLintAvailable', () => {
  it('should return a boolean', () => {
    const result = isESLintAvailable();
    expect(typeof result).toBe('boolean');
  });
});

describe('parseESLintOutput', () => {
  it('should parse valid ESLint JSON output', () => {
    const output = JSON.stringify([
      {
        filePath: '/test/file.ts',
        messages: [
          {
            ruleId: 'no-unused-vars',
            severity: 2,
            message: 'Unused variable',
            line: 10,
            column: 5,
          },
          {
            ruleId: 'semi',
            severity: 1,
            message: 'Missing semicolon',
            line: 15,
            column: 20,
          },
        ],
        errorCount: 1,
        warningCount: 1,
        fixableErrorCount: 0,
        fixableWarningCount: 1,
      },
    ]);

    const issues = parseESLintOutput(output);

    expect(issues.length).toBe(2);
    expect(issues[0].code).toBe('no-unused-vars');
    expect(issues[0].severity).toBe('error');
    expect(issues[1].code).toBe('semi');
    expect(issues[1].severity).toBe('warning');
  });

  it('should handle empty results', () => {
    const output = JSON.stringify([
      {
        filePath: '/test/file.ts',
        messages: [],
        errorCount: 0,
        warningCount: 0,
        fixableErrorCount: 0,
        fixableWarningCount: 0,
      },
    ]);

    const issues = parseESLintOutput(output);
    expect(issues.length).toBe(0);
  });

  it('should handle invalid JSON', () => {
    const output = 'not valid json';
    const issues = parseESLintOutput(output);

    expect(issues.length).toBe(1);
    expect(issues[0].code).toBe('ESLINT_PARSE_ERROR');
  });

  it('should handle null ruleId', () => {
    const output = JSON.stringify([
      {
        filePath: '/test/file.ts',
        messages: [
          {
            ruleId: null,
            severity: 2,
            message: 'Parse error',
            line: 1,
            column: 1,
          },
        ],
        errorCount: 1,
        warningCount: 0,
        fixableErrorCount: 0,
        fixableWarningCount: 0,
      },
    ]);

    const issues = parseESLintOutput(output);
    expect(issues[0].code).toBe('ESLINT_ERROR');
  });
});

describe('hasLintErrors', () => {
  it('should detect test.only', () => {
    const code = `
      test.only('should work', async () => {
        // code
      });
    `;
    expect(hasLintErrors(code)).toBe(true);
  });

  it('should detect waitForTimeout', () => {
    const code = `
      await page.waitForTimeout(1000);
    `;
    expect(hasLintErrors(code)).toBe(true);
  });

  it('should detect page.pause', () => {
    const code = `
      await page.pause();
    `;
    expect(hasLintErrors(code)).toBe(true);
  });

  it('should return false for clean code', () => {
    const code = `
      test('should work', async ({ page }) => {
        await page.goto('/login');
        await page.getByRole('button').click();
      });
    `;
    expect(hasLintErrors(code)).toBe(false);
  });
});

describe('generateESLintConfig', () => {
  it('should generate valid config string', () => {
    const config = generateESLintConfig();

    expect(config).toContain("import playwright from 'eslint-plugin-playwright'");
    expect(config).toContain('export default');
    expect(config).toContain('**/*.spec.ts');
    expect(config).toContain('plugins');
    expect(config).toContain('rules');
  });

  it('should use custom rules', () => {
    const customRules = {
      'custom-rule': 'error',
    };
    const config = generateESLintConfig(customRules);

    expect(config).toContain('custom-rule');
    expect(config).toContain('error');
  });
});

describe('PLAYWRIGHT_LINT_RULES', () => {
  it('should have essential Playwright rules', () => {
    expect(PLAYWRIGHT_LINT_RULES['playwright/missing-playwright-await']).toBe('error');
    expect(PLAYWRIGHT_LINT_RULES['playwright/no-wait-for-timeout']).toBe('error');
    expect(PLAYWRIGHT_LINT_RULES['playwright/no-focused-test']).toBe('error');
    expect(PLAYWRIGHT_LINT_RULES['playwright/no-page-pause']).toBe('error');
  });

  it('should have warning-level rules for best practices', () => {
    expect(PLAYWRIGHT_LINT_RULES['playwright/no-force-option']).toBe('warn');
    expect(PLAYWRIGHT_LINT_RULES['playwright/no-networkidle']).toBe('warn');
  });
});
