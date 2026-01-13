/**
 * Dirname Usage Validation Rule
 * T054: Implement dirname-usage rule (FR-022)
 *
 * Detects usage of __dirname and __filename in ESM environments where they are not available.
 *
 * @module @artk/core/validation/rules/dirname-usage
 */

import type {
  ValidationRule,
  ValidationRuleConfig,
  ValidationIssue,
} from '../types.js';

/**
 * Rule configuration
 */
const config: ValidationRuleConfig = {
  id: 'dirname-usage',
  name: 'Dirname Usage',
  description:
    'Detects usage of __dirname and __filename in ESM environments where they are not available',
  defaultStrictness: 'error',
};

/**
 * Check if a position is inside a comment or string literal
 */
function isInCommentOrString(content: string, position: number): boolean {
  const before = content.substring(0, position);

  // Check if in single-line comment
  const lastNewline = before.lastIndexOf('\n');
  const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
  const lineBefore = before.substring(lineStart);
  if (lineBefore.includes('//')) {
    return true;
  }

  // Check if in block comment
  const lastBlockStart = before.lastIndexOf('/*');
  const lastBlockEnd = before.lastIndexOf('*/');
  if (lastBlockStart > lastBlockEnd) {
    return true;
  }

  // Check if in string literal (simple heuristic)
  let inString = false;
  let stringChar = '';
  let escaped = false;

  for (let i = 0; i < position; i++) {
    const char = content[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
        stringChar = '';
      }
    }
  }

  return inString;
}

/**
 * Check if a match is a standalone global variable reference
 * (not part of a variable declaration like "const __dirname = ...")
 */
function isGlobalReference(
  content: string,
  match: RegExpExecArray,
  varName: string
): boolean {
  const position = match.index;

  // Get the line containing this match
  const lineStart = content.lastIndexOf('\n', position - 1) + 1;
  const lineEnd = content.indexOf('\n', position);
  const line = content.substring(
    lineStart,
    lineEnd === -1 ? content.length : lineEnd
  );

  // Check if this is a declaration (const __dirname = ..., let __dirname = ..., var __dirname = ...)
  const declarationPattern = new RegExp(
    `(?:const|let|var)\\s+${varName}\\s*=`
  );
  if (declarationPattern.test(line)) {
    return false;
  }

  // Check if this is part of a longer variable name
  const beforeChar = position > 0 ? content[position - 1] : ' ';
  const afterChar = content[position + varName.length] || ' ';

  // Valid identifier chars
  const identifierChar = /[a-zA-Z0-9_$]/;

  if (identifierChar.test(beforeChar) || identifierChar.test(afterChar)) {
    return false;
  }

  return true;
}

/**
 * Get line number for a position in content
 */
function getLineNumber(content: string, position: number): number {
  const before = content.substring(0, position);
  return before.split('\n').length;
}

/**
 * Dirname Usage Rule
 *
 * Detects __dirname and __filename usage in ESM environments
 */
export class DirnameUsageRule implements ValidationRule {
  config = config;

  /**
   * Validate a file for __dirname/__filename usage
   */
  validate(
    filePath: string,
    content: string,
    moduleSystem: 'commonjs' | 'esm'
  ): ValidationIssue[] {
    // __dirname and __filename are valid in CommonJS
    if (moduleSystem === 'commonjs') {
      return [];
    }

    const issues: ValidationIssue[] = [];

    // Patterns for __dirname and __filename as standalone identifiers
    const patterns: Array<{ regex: RegExp; name: string }> = [
      { regex: /__dirname/g, name: '__dirname' },
      { regex: /__filename/g, name: '__filename' },
    ];

    for (const { regex, name } of patterns) {
      regex.lastIndex = 0;

      let match;
      while ((match = regex.exec(content)) !== null) {
        const position = match.index;

        // Skip if in comment or string literal
        if (isInCommentOrString(content, position)) {
          continue;
        }

        // Skip if not a global reference (e.g., variable declaration)
        if (!isGlobalReference(content, match, name)) {
          continue;
        }

        const lineNumber = getLineNumber(content, position);

        issues.push({
          file: filePath,
          line: lineNumber,
          column: null,
          severity: 'error',
          ruleId: this.config.id,
          message: `${name} is not available in ESM modules`,
          suggestedFix: `Use getDirname(import.meta.url) from '@artk/core/compat' instead of ${name}`,
        });
      }
    }

    return issues;
  }
}

/**
 * Create a new DirnameUsageRule instance
 */
export function createDirnameUsageRule(): DirnameUsageRule {
  return new DirnameUsageRule();
}
