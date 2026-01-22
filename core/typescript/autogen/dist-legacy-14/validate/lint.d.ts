import type { ValidationIssue } from './journey.js';
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
export declare const PLAYWRIGHT_LINT_RULES: Record<string, unknown>;
/**
 * Generate ESLint flat config for Playwright tests
 */
export declare function generateESLintConfig(rules?: Record<string, unknown>): string;
/**
 * Check if ESLint and Playwright plugin are available
 */
export declare function isESLintAvailable(cwd?: string): boolean;
/**
 * Check if eslint-plugin-playwright is installed
 */
export declare function isPlaywrightPluginAvailable(cwd?: string): boolean;
/**
 * Parse ESLint JSON output to validation issues
 */
export declare function parseESLintOutput(output: string): ValidationIssue[];
/**
 * Run ESLint on code string
 * Note: This creates a temporary file for linting
 */
export declare function lintCode(code: string, filename?: string, options?: LintOptions): Promise<LintResult>;
/**
 * Lint a file directly
 */
export declare function lintFile(filePath: string, options?: LintOptions): Promise<LintResult>;
/**
 * Quick check if code has lint errors (without full details)
 */
export declare function hasLintErrors(code: string): boolean;
//# sourceMappingURL=lint.d.ts.map