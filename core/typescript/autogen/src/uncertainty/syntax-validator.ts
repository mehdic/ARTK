/**
 * @module uncertainty/syntax-validator
 * @description Validate TypeScript and Playwright syntax
 */

import {
  SyntaxValidationResult,
  SyntaxError,
  SyntaxWarning,
  TypeScriptValidation,
  PlaywrightValidation,
  DimensionScore,
} from './types.js';

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION PATTERNS
// ═══════════════════════════════════════════════════════════════════════════

const PLAYWRIGHT_IMPORTS = [
  '@playwright/test',
  'playwright',
];

const PLAYWRIGHT_TEST_PATTERNS = [
  /test\s*\(\s*['"`]/,
  /test\.describe\s*\(\s*['"`]/,
  /test\.beforeEach\s*\(/,
  /test\.afterEach\s*\(/,
  /test\.beforeAll\s*\(/,
  /test\.afterAll\s*\(/,
];

const PLAYWRIGHT_FIXTURE_PATTERNS = [
  /\{\s*page\s*\}/,
  /\{\s*page\s*,/,
  /,\s*page\s*\}/,
  /\{\s*browser\s*\}/,
  /\{\s*context\s*\}/,
  /\{\s*request\s*\}/,
];

const DEPRECATED_APIS = [
  { pattern: /page\.waitForTimeout\s*\(\s*\d+\s*\)/g, api: 'waitForTimeout with fixed delay', suggestion: 'Use waitForSelector or expect assertions' },
  { pattern: /page\.\$\(/g, api: 'page.$()', suggestion: 'Use page.locator()' },
  { pattern: /page\.\$\$\(/g, api: 'page.$$()', suggestion: 'Use page.locator().all()' },
  { pattern: /page\.waitForSelector\(/g, api: 'waitForSelector', suggestion: 'Use locator.waitFor() or expect assertions' },
  { pattern: /elementHandle\./g, api: 'ElementHandle', suggestion: 'Use Locator API instead' },
  { pattern: /page\.click\(/g, api: 'page.click()', suggestion: 'Use locator.click()' },
  { pattern: /page\.fill\(/g, api: 'page.fill()', suggestion: 'Use locator.fill()' },
  { pattern: /page\.type\(/g, api: 'page.type()', suggestion: 'Use locator.fill() or locator.pressSequentially()' },
];

const SYNTAX_ERROR_PATTERNS = [
  { pattern: /await\s+await\s+/g, message: 'Duplicate await', severity: 'error' as const },
  { pattern: /\}\s*\)\s*;?\s*\)\s*;/g, message: 'Unbalanced parentheses/braces', severity: 'error' as const },
  { pattern: /\(\s*\)\s*=>\s*\{[^}]*$/m, message: 'Unclosed arrow function', severity: 'error' as const },
  { pattern: /expect\([^)]*\)\s*\.\s*$/m, message: 'Incomplete expect chain', severity: 'error' as const },
  { pattern: /const\s+\w+\s*=\s*$/m, message: 'Incomplete variable declaration', severity: 'error' as const },
];

const SYNTAX_WARNING_PATTERNS = [
  { pattern: /\/\/\s*TODO/gi, message: 'TODO comment found - incomplete implementation', suggestion: 'Complete the TODO items' },
  { pattern: /console\.log\(/g, message: 'Console.log in test code', suggestion: 'Remove debug statements' },
  { pattern: /\.only\s*\(/g, message: '.only() will skip other tests', suggestion: 'Remove .only() before committing' },
  { pattern: /\.skip\s*\(/g, message: '.skip() found - test will not run', suggestion: 'Remove .skip() or add explanation' },
  { pattern: /any\s*[,)]/g, message: 'Use of "any" type', suggestion: 'Add proper type annotations' },
  { pattern: /as\s+any/g, message: 'Type assertion to any', suggestion: 'Use proper type instead' },
];

// ═══════════════════════════════════════════════════════════════════════════
// MAIN VALIDATOR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate syntax of generated Playwright test code
 */
export function validateSyntax(code: string): SyntaxValidationResult {
  const errors: SyntaxError[] = [];
  const warnings: SyntaxWarning[] = [];

  // Run all validations
  const bracketErrors = validateBrackets(code);
  errors.push(...bracketErrors);

  const patternErrors = validatePatterns(code);
  errors.push(...patternErrors);

  const patternWarnings = checkWarningPatterns(code);
  warnings.push(...patternWarnings);

  const typescript = validateTypeScript(code);
  errors.push(...typescript.errors);

  const playwright = validatePlaywright(code);

  // Calculate overall score
  const score = calculateSyntaxScore(errors, warnings, typescript, playwright);

  return {
    valid: errors.filter(e => e.severity === 'error').length === 0,
    score,
    errors,
    warnings,
    typescript,
    playwright,
  };
}

/**
 * Create a dimension score from syntax validation
 */
export function createSyntaxDimensionScore(result: SyntaxValidationResult): DimensionScore {
  const subScores = [
    {
      name: 'TypeScript Compilation',
      score: result.typescript.compiles ? 1.0 : 0.0,
      details: result.typescript.compiles ? 'Code compiles' : 'Compilation errors found',
    },
    {
      name: 'Type Inference',
      score: result.typescript.typeInferenceScore,
      details: `Type coverage: ${Math.round(result.typescript.typeInferenceScore * 100)}%`,
    },
    {
      name: 'Playwright API Usage',
      score: result.playwright.apiUsageScore,
      details: `API correctness: ${Math.round(result.playwright.apiUsageScore * 100)}%`,
    },
    {
      name: 'Test Structure',
      score: result.playwright.hasValidTestBlocks ? 1.0 : 0.3,
      details: result.playwright.hasValidTestBlocks ? 'Valid test blocks' : 'Missing test blocks',
    },
  ];

  const reasoning = generateSyntaxReasoning(result);

  return {
    dimension: 'syntax',
    score: result.score,
    weight: 0.25,
    reasoning,
    subScores,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// BRACKET VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

function validateBrackets(code: string): SyntaxError[] {
  const errors: SyntaxError[] = [];
  const stack: Array<{ char: string; line: number; column: number }> = [];
  const pairs: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
  const closers: Record<string, string> = { ')': '(', ']': '[', '}': '{' };

  const lines = code.split('\n');
  let inString = false;
  let stringChar = '';
  let inMultilineComment = false;

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];

    for (let col = 0; col < line.length; col++) {
      const char = line[col];
      const prevChar = col > 0 ? line[col - 1] : '';
      const nextChar = col < line.length - 1 ? line[col + 1] : '';

      // Handle comments
      if (!inString) {
        if (char === '/' && nextChar === '/' && !inMultilineComment) {
          break; // Rest of line is comment
        }
        if (char === '/' && nextChar === '*') {
          inMultilineComment = true;
          continue;
        }
        if (char === '*' && nextChar === '/' && inMultilineComment) {
          inMultilineComment = false;
          col++; // Skip the /
          continue;
        }
        if (inMultilineComment) continue;
      }

      // Handle strings
      if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
        continue;
      }

      if (inString) continue;

      // Track brackets
      if (pairs[char]) {
        stack.push({ char, line: lineNum + 1, column: col + 1 });
      } else if (closers[char]) {
        const last = stack.pop();
        if (!last) {
          errors.push({
            line: lineNum + 1,
            column: col + 1,
            message: `Unexpected closing '${char}'`,
            code: 'BRACKET_MISMATCH',
            severity: 'error',
          });
        } else if (last.char !== closers[char]) {
          errors.push({
            line: lineNum + 1,
            column: col + 1,
            message: `Mismatched brackets: expected '${pairs[last.char]}' but found '${char}'`,
            code: 'BRACKET_MISMATCH',
            severity: 'error',
          });
        }
      }
    }
  }

  // Check for unclosed brackets
  for (const unclosed of stack) {
    errors.push({
      line: unclosed.line,
      column: unclosed.column,
      message: `Unclosed '${unclosed.char}'`,
      code: 'BRACKET_UNCLOSED',
      severity: 'error',
    });
  }

  // Check for unterminated string
  if (inString) {
    errors.push({
      line: lines.length,
      column: 1,
      message: `Unterminated string literal`,
      code: 'STRING_UNTERMINATED',
      severity: 'error',
    });
  }

  return errors;
}

// ═══════════════════════════════════════════════════════════════════════════
// PATTERN VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

function validatePatterns(code: string): SyntaxError[] {
  const errors: SyntaxError[] = [];

  for (const errorPattern of SYNTAX_ERROR_PATTERNS) {
    let match: RegExpExecArray | null;
    const regex = new RegExp(errorPattern.pattern.source, errorPattern.pattern.flags);

    while ((match = regex.exec(code)) !== null) {
      const lineNum = code.substring(0, match.index).split('\n').length;
      const lineStart = code.lastIndexOf('\n', match.index) + 1;

      errors.push({
        line: lineNum,
        column: match.index - lineStart + 1,
        message: errorPattern.message,
        code: 'PATTERN_ERROR',
        severity: errorPattern.severity,
      });
    }
  }

  return errors;
}

function checkWarningPatterns(code: string): SyntaxWarning[] {
  const warnings: SyntaxWarning[] = [];

  for (const warningPattern of SYNTAX_WARNING_PATTERNS) {
    let match: RegExpExecArray | null;
    const regex = new RegExp(warningPattern.pattern.source, warningPattern.pattern.flags);

    while ((match = regex.exec(code)) !== null) {
      const lineNum = code.substring(0, match.index).split('\n').length;

      warnings.push({
        line: lineNum,
        message: warningPattern.message,
        suggestion: warningPattern.suggestion,
      });
    }
  }

  return warnings;
}

// ═══════════════════════════════════════════════════════════════════════════
// TYPESCRIPT VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

function validateTypeScript(code: string): TypeScriptValidation {
  const errors: SyntaxError[] = [];

  // Check for basic TypeScript validity
  // (Note: Full TypeScript compilation would require ts.transpile, but for static analysis we check patterns)

  // Check for incomplete statements
  const incompleteStatements = code.match(/(?:const|let|var|function|class)\s+\w+\s*(?::|=)?\s*$/gm);
  if (incompleteStatements) {
    for (const stmt of incompleteStatements) {
      const lineNum = code.substring(0, code.indexOf(stmt)).split('\n').length;
      errors.push({
        line: lineNum,
        column: 1,
        message: 'Incomplete statement',
        code: 'TS_INCOMPLETE',
        severity: 'error',
      });
    }
  }

  // Check for syntax errors in arrow functions
  const badArrows = code.match(/=>\s*\{[^}]*(?!\})/gm);
  if (badArrows) {
    errors.push({
      line: 1,
      column: 1,
      message: 'Unclosed arrow function body',
      code: 'TS_ARROW_ERROR',
      severity: 'error',
    });
  }

  // Calculate type inference score
  const typeInferenceScore = calculateTypeInferenceScore(code);

  return {
    compiles: errors.length === 0,
    errors,
    typeInferenceScore,
  };
}

function calculateTypeInferenceScore(code: string): number {
  let score = 1.0;

  // Penalize for 'any' usage
  const anyCount = (code.match(/:\s*any\b/g) || []).length;
  score -= anyCount * 0.1;

  // Penalize for missing type annotations on function parameters
  const untypedParams = (code.match(/\(\s*\w+\s*[,)]/g) || []).length;
  const typedParams = (code.match(/\(\s*\w+\s*:/g) || []).length;
  if (untypedParams + typedParams > 0) {
    score -= (untypedParams / (untypedParams + typedParams)) * 0.2;
  }

  // Bonus for explicit return types
  const hasReturnTypes = /\)\s*:\s*\w+/.test(code);
  if (hasReturnTypes) {
    score += 0.1;
  }

  return Math.max(0, Math.min(1, score));
}

// ═══════════════════════════════════════════════════════════════════════════
// PLAYWRIGHT VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

function validatePlaywright(code: string): PlaywrightValidation {
  // Check imports
  const hasValidImports = PLAYWRIGHT_IMPORTS.some(imp =>
    code.includes(`from '${imp}'`) || code.includes(`from "${imp}"`)
  );

  // Check test fixtures
  const usesTestFixtures = PLAYWRIGHT_FIXTURE_PATTERNS.some(pattern => pattern.test(code));

  // Check test blocks
  const hasValidTestBlocks = PLAYWRIGHT_TEST_PATTERNS.some(pattern => pattern.test(code));

  // Check for deprecated APIs
  const deprecatedAPIs: string[] = [];
  for (const deprecated of DEPRECATED_APIS) {
    if (deprecated.pattern.test(code)) {
      deprecatedAPIs.push(deprecated.api);
    }
  }

  // Calculate API usage score
  const apiUsageScore = calculatePlaywrightAPIScore(code, deprecatedAPIs);

  return {
    hasValidImports,
    usesTestFixtures,
    hasValidTestBlocks,
    apiUsageScore,
    deprecatedAPIs,
  };
}

function calculatePlaywrightAPIScore(code: string, deprecatedAPIs: string[]): number {
  let score = 1.0;

  // Penalize for deprecated APIs
  score -= deprecatedAPIs.length * 0.15;

  // Bonus for using modern locator API
  if (code.includes('.locator(') || code.includes('getBy')) {
    score += 0.1;
  }

  // Bonus for using expect assertions
  if (code.includes('expect(') && code.includes(').to')) {
    score += 0.1;
  }

  // Bonus for using test.step
  if (code.includes('test.step(')) {
    score += 0.05;
  }

  // Penalize for hard waits
  const hardWaits = (code.match(/waitForTimeout\s*\(\s*\d{4,}/g) || []).length;
  score -= hardWaits * 0.2;

  return Math.max(0, Math.min(1, score));
}

// ═══════════════════════════════════════════════════════════════════════════
// SCORE CALCULATION
// ═══════════════════════════════════════════════════════════════════════════

function calculateSyntaxScore(
  errors: SyntaxError[],
  warnings: SyntaxWarning[],
  typescript: TypeScriptValidation,
  playwright: PlaywrightValidation
): number {
  // Start with base score
  let score = 1.0;

  // Critical errors eliminate most of the score
  const criticalErrors = errors.filter(e => e.severity === 'error').length;
  score -= criticalErrors * 0.3;

  // Warnings have smaller impact
  score -= warnings.length * 0.05;

  // Factor in TypeScript validation
  if (!typescript.compiles) {
    score -= 0.4;
  }
  score *= (0.7 + 0.3 * typescript.typeInferenceScore);

  // Factor in Playwright validation
  if (!playwright.hasValidImports) score -= 0.2;
  if (!playwright.hasValidTestBlocks) score -= 0.3;
  if (!playwright.usesTestFixtures) score -= 0.1;
  score *= (0.7 + 0.3 * playwright.apiUsageScore);

  return Math.max(0, Math.min(1, score));
}

function generateSyntaxReasoning(result: SyntaxValidationResult): string {
  const reasons: string[] = [];

  if (result.errors.length > 0) {
    reasons.push(`${result.errors.length} syntax error(s) found`);
  }

  if (result.warnings.length > 0) {
    reasons.push(`${result.warnings.length} warning(s)`);
  }

  if (!result.typescript.compiles) {
    reasons.push('TypeScript compilation failed');
  }

  if (!result.playwright.hasValidImports) {
    reasons.push('Missing Playwright imports');
  }

  if (!result.playwright.hasValidTestBlocks) {
    reasons.push('No valid test blocks found');
  }

  if (result.playwright.deprecatedAPIs.length > 0) {
    reasons.push(`${result.playwright.deprecatedAPIs.length} deprecated API(s) used`);
  }

  if (reasons.length === 0) {
    reasons.push('Syntax is valid');
  }

  return reasons.join('; ');
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS FOR QUICK CHECKS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Quick check if code has valid structure (no full validation)
 */
export function quickSyntaxCheck(code: string): boolean {
  // Check for basic structure
  if (!code.includes('test(') && !code.includes('test.describe(')) {
    return false;
  }

  // Check bracket balance
  const brackets = validateBrackets(code);
  if (brackets.length > 0) {
    return false;
  }

  return true;
}

/**
 * Get list of deprecated APIs used
 */
export function getDeprecatedAPIs(code: string): Array<{ api: string; suggestion: string }> {
  const found: Array<{ api: string; suggestion: string }> = [];

  for (const deprecated of DEPRECATED_APIS) {
    if (deprecated.pattern.test(code)) {
      found.push({
        api: deprecated.api,
        suggestion: deprecated.suggestion,
      });
    }
  }

  return found;
}
