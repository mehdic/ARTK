/**
 * Import Paths Validation Rule
 * T055: Implement import-paths rule (FR-023)
 *
 * Validates import paths have correct extensions for the module system.
 * ESM requires explicit .js extensions for relative imports.
 *
 * @module @artk/core/validation/rules/import-paths
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
  id: 'import-paths',
  name: 'Import Paths',
  description:
    'Validates import paths have correct extensions for the module system',
  defaultStrictness: 'warning',
};

/**
 * Check if an import path is a relative import
 */
function isRelativeImport(importPath: string): boolean {
  return importPath.startsWith('./') || importPath.startsWith('../');
}

/**
 * Check if an import path has a file extension
 */
function hasExtension(importPath: string): boolean {
  const parts = importPath.split('/');
  const lastPart = parts[parts.length - 1]!;
  return lastPart.includes('.');
}

/**
 * Check if a position is inside a comment or string literal
 */
function isInCommentOrString(content: string, position: number): boolean {
  const before = content.substring(0, position);

  // Check if in single-line comment
  const lastNewline = before.lastIndexOf('\n');
  const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
  const lineBefore = before.substring(lineStart);

  // Simple heuristic: if we see a // before any string starts on this line
  const commentIndex = lineBefore.indexOf('//');
  if (commentIndex !== -1) {
    // Make sure the // is not inside a string
    const quotesBefore = lineBefore.substring(0, commentIndex);
    const singleQuotes = (quotesBefore.match(/'/g) || []).length;
    const doubleQuotes = (quotesBefore.match(/"/g) || []).length;
    const backticks = (quotesBefore.match(/`/g) || []).length;

    // If odd number of quotes, the // might be in a string, otherwise comment
    if (singleQuotes % 2 === 0 && doubleQuotes % 2 === 0 && backticks % 2 === 0) {
      return true;
    }
  }

  // Check if in block comment
  const lastBlockStart = before.lastIndexOf('/*');
  const lastBlockEnd = before.lastIndexOf('*/');
  if (lastBlockStart > lastBlockEnd) {
    return true;
  }

  // Check if inside a string literal
  // This is a simple check: count unescaped quotes before position
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
 * Get line number for a position in content
 */
function getLineNumber(content: string, position: number): number {
  const before = content.substring(0, position);
  return before.split('\n').length;
}

/**
 * Extract import paths from content using regex
 */
function extractImportPaths(
  content: string
): Array<{ path: string; position: number; isTypeOnly: boolean }> {
  const imports: Array<{
    path: string;
    position: number;
    isTypeOnly: boolean;
  }> = [];

  // Match various import patterns
  const patterns = [
    // import ... from 'path'
    /import\s+(?:type\s+)?(?:[^'"]*\s+from\s+)?['"]([^'"]+)['"]/g,
    // export ... from 'path'
    /export\s+(?:\*|\{[^}]*\})\s+from\s+['"]([^'"]+)['"]/g,
    // await import('path') or import('path')
    /(?:await\s+)?import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];

  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let match;

    while ((match = pattern.exec(content)) !== null) {
      const position = match.index;

      // Skip if in comment or string literal
      if (isInCommentOrString(content, position)) {
        continue;
      }

      // Check if this is a type-only import
      const isTypeOnly = match[0].includes('import type');

      imports.push({
        path: match[1]!,
        position,
        isTypeOnly,
      });
    }
  }

  return imports;
}

/**
 * Import Paths Rule
 *
 * Validates import paths have correct extensions for the module system
 */
export class ImportPathsRule implements ValidationRule {
  config = config;

  /**
   * Validate a file for import path issues
   */
  validate(
    filePath: string,
    content: string,
    moduleSystem: 'commonjs' | 'esm'
  ): ValidationIssue[] {
    // CommonJS doesn't require extensions
    if (moduleSystem === 'commonjs') {
      return [];
    }

    const issues: ValidationIssue[] = [];
    const imports = extractImportPaths(content);

    for (const { path: importPath, position, isTypeOnly } of imports) {
      // Only check relative imports
      if (!isRelativeImport(importPath)) {
        continue;
      }

      // Check if missing extension
      if (!hasExtension(importPath)) {
        const lineNumber = getLineNumber(content, position);

        // Type-only imports are stripped at compile time, so lower severity
        const severity = isTypeOnly ? 'warning' : 'warning';

        issues.push({
          file: filePath,
          line: lineNumber,
          column: null,
          severity,
          ruleId: this.config.id,
          message: `ESM imports require explicit file extensions. Missing extension in: '${importPath}'`,
          suggestedFix: `Add .js extension: '${importPath}.js' (ESM requires explicit extensions for relative imports)`,
        });
      }
    }

    return issues;
  }
}

/**
 * Create a new ImportPathsRule instance
 */
export function createImportPathsRule(): ImportPathsRule {
  return new ImportPathsRule();
}
