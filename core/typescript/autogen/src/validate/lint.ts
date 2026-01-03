/**
 * ESLint Integration - Run ESLint with Playwright plugin rules
 * @see T041 - ESLint integration with eslint-plugin-playwright
 */
import { execSync } from 'node:child_process';
import { existsSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import type { ValidationIssue, ValidationSeverity } from './journey.js';

/**
 * ESLint message from JSON output
 */
interface ESLintMessage {
  ruleId: string | null;
  severity: 1 | 2; // 1 = warning, 2 = error
  message: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  fix?: {
    range: [number, number];
    text: string;
  };
}

/**
 * ESLint file result from JSON output
 */
interface ESLintFileResult {
  filePath: string;
  messages: ESLintMessage[];
  errorCount: number;
  warningCount: number;
  fixableErrorCount: number;
  fixableWarningCount: number;
  source?: string;
}

/**
 * Result of linting code
 */
export interface LintResult {
  /** Whether linting passed (no errors) */
  passed: boolean;
  /** ESLint output */
  output: string;
  /** Parsed issues */
  issues: ValidationIssue[];
  /** Error count */
  errorCount: number;
  /** Warning count */
  warningCount: number;
}

/**
 * Options for ESLint
 */
export interface LintOptions {
  /** Additional ESLint rules to enable */
  rules?: Record<string, unknown>;
  /** Whether to fix auto-fixable issues */
  fix?: boolean;
  /** Custom ESLint config path */
  configPath?: string;
  /** Working directory */
  cwd?: string;
}

/**
 * Default Playwright ESLint rules
 */
export const PLAYWRIGHT_LINT_RULES: Record<string, unknown> = {
  // Playwright plugin rules
  'playwright/missing-playwright-await': 'error',
  'playwright/no-conditional-in-test': 'warn',
  'playwright/no-element-handle': 'error',
  'playwright/no-eval': 'error',
  'playwright/no-focused-test': 'error',
  'playwright/no-force-option': 'warn',
  'playwright/no-nested-step': 'warn',
  'playwright/no-networkidle': 'warn',
  'playwright/no-page-pause': 'error',
  'playwright/no-skipped-test': 'warn',
  'playwright/no-useless-await': 'warn',
  'playwright/no-useless-not': 'warn',
  'playwright/no-wait-for-timeout': 'error',
  'playwright/prefer-lowercase-title': 'off',
  'playwright/prefer-strict-equal': 'warn',
  'playwright/prefer-to-be': 'warn',
  'playwright/prefer-to-contain': 'warn',
  'playwright/prefer-to-have-count': 'warn',
  'playwright/prefer-to-have-length': 'warn',
  'playwright/prefer-web-first-assertions': 'error',
  'playwright/require-soft-assertions': 'off',
  'playwright/valid-describe-callback': 'error',
  'playwright/valid-expect': 'error',
  'playwright/valid-expect-in-promise': 'error',
  'playwright/valid-title': 'warn',
};

/**
 * Generate ESLint flat config for Playwright tests
 */
export function generateESLintConfig(
  rules: Record<string, unknown> = PLAYWRIGHT_LINT_RULES
): string {
  return `import playwright from 'eslint-plugin-playwright';

export default [
  {
    files: ['**/*.spec.ts', '**/*.test.ts'],
    plugins: {
      playwright,
    },
    rules: ${JSON.stringify(rules, null, 2)},
  },
];
`;
}

/**
 * Check if ESLint and Playwright plugin are available
 */
export function isESLintAvailable(cwd?: string): boolean {
  try {
    execSync('npx eslint --version', {
      cwd,
      stdio: 'pipe',
      encoding: 'utf-8',
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if eslint-plugin-playwright is installed
 */
export function isPlaywrightPluginAvailable(cwd?: string): boolean {
  try {
    const result = execSync('npm list eslint-plugin-playwright', {
      cwd,
      stdio: 'pipe',
      encoding: 'utf-8',
    });
    return result.includes('eslint-plugin-playwright');
  } catch {
    return false;
  }
}

/**
 * Convert ESLint severity to ValidationSeverity
 */
function convertSeverity(eslintSeverity: 1 | 2): ValidationSeverity {
  return eslintSeverity === 2 ? 'error' : 'warning';
}

/**
 * Parse ESLint JSON output to validation issues
 */
export function parseESLintOutput(output: string): ValidationIssue[] {
  try {
    const results: ESLintFileResult[] = JSON.parse(output);
    const issues: ValidationIssue[] = [];

    for (const file of results) {
      for (const msg of file.messages) {
        issues.push({
          code: msg.ruleId || 'ESLINT_ERROR',
          message: `Line ${msg.line}:${msg.column} - ${msg.message}`,
          severity: convertSeverity(msg.severity),
          suggestion: msg.fix ? 'Auto-fixable with --fix' : undefined,
        });
      }
    }

    return issues;
  } catch {
    // If JSON parsing fails, return a single error
    return [
      {
        code: 'ESLINT_PARSE_ERROR',
        message: 'Failed to parse ESLint output',
        severity: 'error',
      },
    ];
  }
}

/**
 * Run ESLint on code string
 * Note: This creates a temporary file for linting
 */
export async function lintCode(
  code: string,
  filename: string = 'test.spec.ts',
  options: LintOptions = {}
): Promise<LintResult> {
  const { cwd = process.cwd(), fix = false, configPath } = options;

  // Check ESLint availability
  if (!isESLintAvailable(cwd)) {
    return {
      passed: true,
      output: 'ESLint not available - skipping lint check',
      issues: [
        {
          code: 'ESLINT_NOT_AVAILABLE',
          message: 'ESLint is not installed',
          severity: 'info',
          suggestion: 'Run npm install eslint eslint-plugin-playwright',
        },
      ],
      errorCount: 0,
      warningCount: 0,
    };
  }

  // Create temp file for linting
  const tempDir = join(tmpdir(), 'autogen-lint');
  mkdirSync(tempDir, { recursive: true });
  const tempFile = join(tempDir, filename);

  try {
    writeFileSync(tempFile, code, 'utf-8');

    // Build ESLint command
    const args = ['eslint', '--format', 'json'];

    if (fix) {
      args.push('--fix');
    }

    if (configPath && existsSync(configPath)) {
      args.push('--config', configPath);
    }

    args.push(tempFile);

    // Run ESLint
    const result = execSync(`npx ${args.join(' ')}`, {
      cwd,
      stdio: 'pipe',
      encoding: 'utf-8',
    });

    return {
      passed: true,
      output: result,
      issues: parseESLintOutput(result),
      errorCount: 0,
      warningCount: 0,
    };
  } catch (err: unknown) {
    // ESLint exits with non-zero on errors/warnings
    const error = err as { stdout?: string; status?: number };
    const output = error.stdout || '';

    try {
      const results: ESLintFileResult[] = JSON.parse(output);
      const issues = parseESLintOutput(output);

      let errorCount = 0;
      let warningCount = 0;

      for (const file of results) {
        errorCount += file.errorCount;
        warningCount += file.warningCount;
      }

      return {
        passed: errorCount === 0,
        output,
        issues,
        errorCount,
        warningCount,
      };
    } catch {
      return {
        passed: false,
        output: output || 'ESLint execution failed',
        issues: [
          {
            code: 'ESLINT_EXECUTION_ERROR',
            message: 'ESLint execution failed',
            severity: 'error',
          },
        ],
        errorCount: 1,
        warningCount: 0,
      };
    }
  } finally {
    // Cleanup temp file
    try {
      unlinkSync(tempFile);
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Lint a file directly
 */
export async function lintFile(
  filePath: string,
  options: LintOptions = {}
): Promise<LintResult> {
  const { cwd = dirname(filePath), fix = false, configPath } = options;

  if (!existsSync(filePath)) {
    return {
      passed: false,
      output: `File not found: ${filePath}`,
      issues: [
        {
          code: 'FILE_NOT_FOUND',
          message: `File not found: ${filePath}`,
          severity: 'error',
        },
      ],
      errorCount: 1,
      warningCount: 0,
    };
  }

  // Check ESLint availability
  if (!isESLintAvailable(cwd)) {
    return {
      passed: true,
      output: 'ESLint not available - skipping lint check',
      issues: [],
      errorCount: 0,
      warningCount: 0,
    };
  }

  try {
    const args = ['eslint', '--format', 'json'];

    if (fix) {
      args.push('--fix');
    }

    if (configPath && existsSync(configPath)) {
      args.push('--config', configPath);
    }

    args.push(filePath);

    const result = execSync(`npx ${args.join(' ')}`, {
      cwd,
      stdio: 'pipe',
      encoding: 'utf-8',
    });

    return {
      passed: true,
      output: result,
      issues: parseESLintOutput(result),
      errorCount: 0,
      warningCount: 0,
    };
  } catch (err: unknown) {
    const error = err as { stdout?: string };
    const output = error.stdout || '';
    const issues = parseESLintOutput(output);

    return {
      passed: issues.filter((i) => i.severity === 'error').length === 0,
      output,
      issues,
      errorCount: issues.filter((i) => i.severity === 'error').length,
      warningCount: issues.filter((i) => i.severity === 'warning').length,
    };
  }
}

/**
 * Quick check if code has lint errors (without full details)
 */
export function hasLintErrors(code: string): boolean {
  // Simple heuristic check for common errors without running ESLint
  const patterns = [
    /test\.only\s*\(/g,
    /\.waitForTimeout\s*\(/g,
    /page\.pause\s*\(/g,
  ];

  for (const pattern of patterns) {
    if (pattern.test(code)) {
      return true;
    }
  }

  return false;
}
