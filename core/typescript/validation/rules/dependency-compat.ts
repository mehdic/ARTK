/**
 * Dependency Compatibility Validation Rule
 * T056: Implement dependency-compat rule (FR-024, FR-025)
 *
 * Checks that project dependencies are compatible with the detected module system.
 * Detects ESM-only packages (like nanoid v5+) in CommonJS environments.
 *
 * @module @artk/core/validation/rules/dependency-compat
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  ValidationRule,
  ValidationRuleConfig,
  ValidationIssue,
} from '../types.js';

/**
 * Rule configuration
 */
const config: ValidationRuleConfig = {
  id: 'dependency-compat',
  name: 'Dependency Compatibility',
  description:
    'Checks that project dependencies are compatible with the detected module system',
  defaultStrictness: 'warning',
};

/**
 * Known ESM-only packages and their version constraints
 */
const ESM_ONLY_PACKAGES: Record<string, string> = {
  nanoid: '>=5.0.0', // v5+ is ESM-only
  chalk: '>=5.0.0', // v5+ is ESM-only
  execa: '>=6.0.0', // v6+ is ESM-only
  got: '>=12.0.0', // v12+ is ESM-only
  'p-limit': '>=4.0.0', // v4+ is ESM-only
  'p-queue': '>=7.0.0', // v7+ is ESM-only
  'globby': '>=13.0.0', // v13+ is ESM-only
  'find-up': '>=6.0.0', // v6+ is ESM-only
  'pkg-dir': '>=6.0.0', // v6+ is ESM-only
  'read-pkg': '>=7.0.0', // v7+ is ESM-only
  'read-pkg-up': '>=9.0.0', // v9+ is ESM-only
  'ora': '>=6.0.0', // v6+ is ESM-only
  'cli-spinners': '>=3.0.0', // v3+ is ESM-only
  'log-symbols': '>=5.0.0', // v5+ is ESM-only
  'figures': '>=5.0.0', // v5+ is ESM-only
  'boxen': '>=6.0.0', // v6+ is ESM-only
  'wrap-ansi': '>=8.0.0', // v8+ is ESM-only
  'string-width': '>=5.0.0', // v5+ is ESM-only
  'strip-ansi': '>=7.0.0', // v7+ is ESM-only
};

/**
 * Suggested alternatives or compatible versions
 */
const ALTERNATIVES: Record<string, string> = {
  nanoid: "Use nanoid@^4.0.0 for CommonJS or 'uuid' package as alternative",
  chalk: "Use chalk@^4.0.0 for CommonJS or 'kleur' as alternative",
  execa: "Use execa@^5.0.0 for CommonJS or 'cross-spawn' as alternative",
  got: "Use got@^11.0.0 for CommonJS or 'node-fetch' as alternative",
  'p-limit': 'Use p-limit@^3.0.0 for CommonJS',
};

/**
 * Parse a semver range and check if a version satisfies it
 */
function versionSatisfiesRange(version: string, range: string): boolean {
  // Simple parser for common semver patterns
  const versionMatch = version.match(/\^?~?(\d+)\.(\d+)\.(\d+)/);
  const rangeMatch = range.match(/>?=?(\d+)\.(\d+)\.(\d+)/);

  if (!versionMatch || !rangeMatch) {
    return false;
  }

  const [, vMajor, vMinor, vPatch] = versionMatch.map(Number);
  const [, rMajor, rMinor, rPatch] = rangeMatch.map(Number);

  // For >= range (most common case)
  if (range.startsWith('>=')) {
    if (vMajor! > rMajor!) return true;
    if (vMajor! < rMajor!) return false;
    if (vMinor! > rMinor!) return true;
    if (vMinor! < rMinor!) return false;
    return vPatch! >= rPatch!;
  }

  // For ^ range (semver compatible)
  if (version.startsWith('^')) {
    return vMajor! >= rMajor!;
  }

  return vMajor! >= rMajor!;
}

/**
 * Extract package name from import statement
 */
function extractPackageName(importPath: string): string | null {
  // Skip relative imports
  if (importPath.startsWith('./') || importPath.startsWith('../')) {
    return null;
  }

  // Skip node: protocol
  if (importPath.startsWith('node:')) {
    return null;
  }

  // Handle scoped packages (@scope/package)
  if (importPath.startsWith('@')) {
    const parts = importPath.split('/');
    if (parts.length >= 2) {
      return `${parts[0]}/${parts[1]}`;
    }
  }

  // Regular packages
  const parts = importPath.split('/');
  return parts[0] ?? null;
}

/**
 * Dependency Compatibility Rule
 *
 * Detects ESM-only packages in CommonJS environments
 */
export class DependencyCompatRule implements ValidationRule {
  config = config;

  /**
   * Get list of known ESM-only packages
   */
  getEsmOnlyPackages(): string[] {
    return Object.keys(ESM_ONLY_PACKAGES);
  }

  /**
   * Get version constraints for ESM-only packages
   */
  getEsmOnlyConstraints(): Record<string, string> {
    return { ...ESM_ONLY_PACKAGES };
  }

  /**
   * Validate a file for ESM-only package imports
   */
  validate(
    filePath: string,
    content: string,
    moduleSystem: 'commonjs' | 'esm'
  ): ValidationIssue[] {
    // ESM-only packages are fine in ESM environments
    if (moduleSystem === 'esm') {
      return [];
    }

    const issues: ValidationIssue[] = [];
    const importedPackages = new Set<string>();

    // Extract import/require statements
    const patterns = [
      /import\s+(?:[^'"]*\s+from\s+)?['"]([^'"]+)['"]/g,
      /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
      /(?:await\s+)?import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    ];

    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      let match;

      while ((match = pattern.exec(content)) !== null) {
        const importPath = match[1]!;
        const packageName = extractPackageName(importPath);

        if (packageName && ESM_ONLY_PACKAGES[packageName]) {
          // Skip if we've already reported this package
          if (importedPackages.has(packageName)) {
            continue;
          }
          importedPackages.add(packageName);

          const lineNumber = this.getLineNumber(content, match.index);

          issues.push({
            file: filePath,
            line: lineNumber,
            column: null,
            severity: 'warning',
            ruleId: this.config.id,
            message: `'${packageName}' is ESM-only in newer versions and may not work in CommonJS`,
            suggestedFix:
              ALTERNATIVES[packageName] ||
              `Check if your version of '${packageName}' is CommonJS-compatible`,
          });
        }
      }
    }

    return issues;
  }

  /**
   * Validate dependencies in package.json
   */
  validateDependencies(
    projectDir: string,
    moduleSystem: 'commonjs' | 'esm'
  ): ValidationIssue[] {
    // ESM-only packages are fine in ESM environments
    if (moduleSystem === 'esm') {
      return [];
    }

    const packageJsonPath = path.join(projectDir, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
      return [];
    }

    let packageJson: Record<string, unknown>;
    try {
      const content = fs.readFileSync(packageJsonPath, 'utf8');
      packageJson = JSON.parse(content);
    } catch {
      return [];
    }

    const issues: ValidationIssue[] = [];
    const allDeps = {
      ...(packageJson.dependencies as Record<string, string> || {}),
      ...(packageJson.devDependencies as Record<string, string> || {}),
    };

    for (const [packageName, versionRange] of Object.entries(allDeps)) {
      const esmOnlyRange = ESM_ONLY_PACKAGES[packageName];

      if (esmOnlyRange && versionSatisfiesRange(versionRange, esmOnlyRange)) {
        issues.push({
          file: packageJsonPath,
          line: null,
          column: null,
          severity: 'warning',
          ruleId: this.config.id,
          message: `'${packageName}@${versionRange}' is ESM-only and incompatible with CommonJS`,
          suggestedFix:
            ALTERNATIVES[packageName] ||
            `Downgrade '${packageName}' to a CommonJS-compatible version`,
        });
      }
    }

    return issues;
  }

  /**
   * Get line number for a position in content
   */
  private getLineNumber(content: string, position: number): number {
    const before = content.substring(0, position);
    return before.split('\n').length;
  }
}

/**
 * Create a new DependencyCompatRule instance
 */
export function createDependencyCompatRule(): DependencyCompatRule {
  return new DependencyCompatRule();
}
