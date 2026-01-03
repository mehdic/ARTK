/**
 * TestID Scanner - Scan source files for data-testid attributes
 * @see T090 - Implement testid scanner
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, relative, basename, extname } from 'node:path';
import { glob } from 'fast-glob';
import {
  type SelectorCatalog,
  type SelectorEntry,
  type CSSDebtEntry,
  createEmptyCatalog,
} from './catalogSchema.js';

/**
 * Scanner options
 */
export interface ScannerOptions {
  /** Source directory to scan */
  sourceDir: string;
  /** Test ID attribute name */
  testIdAttribute?: string;
  /** File patterns to include */
  include?: string[];
  /** File patterns to exclude */
  exclude?: string[];
  /** Whether to track CSS selector debt */
  trackCSSDebt?: boolean;
  /** Existing catalog to merge with */
  existingCatalog?: SelectorCatalog;
}

/**
 * Scanner result
 */
export interface ScannerResult {
  /** Generated catalog */
  catalog: SelectorCatalog;
  /** Files scanned */
  filesScanned: number;
  /** TestIDs found */
  testIdsFound: number;
  /** CSS debt entries found */
  cssDebtFound: number;
  /** Warnings during scanning */
  warnings: string[];
}

/**
 * Default file patterns for scanning
 */
const DEFAULT_INCLUDE = [
  '**/*.tsx',
  '**/*.jsx',
  '**/*.ts',
  '**/*.js',
  '**/*.vue',
  '**/*.svelte',
];

const DEFAULT_EXCLUDE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/*.test.*',
  '**/*.spec.*',
  '**/__tests__/**',
];

/**
 * Regex patterns for extracting testids
 */
const TESTID_PATTERNS = {
  // data-testid="value" or data-testid='value'
  dataTestId: /data-testid=["']([^"']+)["']/gi,
  // data-test="value" or data-test='value'
  dataTest: /data-test=["']([^"']+)["']/gi,
  // data-cy="value" (Cypress)
  dataCy: /data-cy=["']([^"']+)["']/gi,
  // testID="value" (React Native)
  testID: /testID=["']([^"']+)["']/gi,
  // getByTestId('value') in tests
  getByTestId: /getByTestId\s*\(\s*["']([^"']+)["']\s*\)/gi,
};

/**
 * Regex patterns for detecting CSS selectors (debt tracking)
 */
const CSS_DEBT_PATTERNS = {
  // .className selectors in locator/querySelector
  classSelector: /(?:locator|querySelector|querySelectorAll)\s*\(\s*["']\.([a-zA-Z_-][a-zA-Z0-9_-]*)["']/gi,
  // #id selectors
  idSelector: /(?:locator|querySelector)\s*\(\s*["']#([a-zA-Z_-][a-zA-Z0-9_-]*)["']/gi,
  // Complex CSS selectors
  complexSelector: /(?:locator|querySelector)\s*\(\s*["']([^"']+\s+[^"']+)["']/gi,
};

/**
 * Extract component name from file path
 */
function extractComponentName(filePath: string): string {
  const baseName = basename(filePath, extname(filePath));
  // Remove common suffixes
  return baseName
    .replace(/\.(component|page|view|screen|container)$/i, '')
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

/**
 * Infer selector description from testid
 */
function inferDescription(testId: string): string {
  return testId
    .replace(/[-_]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase();
}

/**
 * Generate a unique selector ID
 */
function generateSelectorId(testId: string, component: string): string {
  return `${component.toLowerCase()}-${testId}`;
}

/**
 * Scan a single file for testids
 */
function scanFile(
  filePath: string,
  testIdAttribute: string,
  trackCSSDebt: boolean
): {
  selectors: SelectorEntry[];
  testIds: string[];
  cssDebt: CSSDebtEntry[];
} {
  const content = readFileSync(filePath, 'utf-8');
  const component = extractComponentName(filePath);
  const selectors: SelectorEntry[] = [];
  const testIds: string[] = [];
  const cssDebt: CSSDebtEntry[] = [];
  const seenTestIds = new Set<string>();

  // Determine which pattern to use based on attribute name
  let primaryPattern: RegExp;
  if (testIdAttribute === 'data-testid') {
    primaryPattern = TESTID_PATTERNS.dataTestId;
  } else if (testIdAttribute === 'data-test') {
    primaryPattern = TESTID_PATTERNS.dataTest;
  } else if (testIdAttribute === 'data-cy') {
    primaryPattern = TESTID_PATTERNS.dataCy;
  } else {
    // Generic pattern for custom attributes
    primaryPattern = new RegExp(`${testIdAttribute}=["']([^"']+)["']`, 'gi');
  }

  // Scan for primary testid pattern
  primaryPattern.lastIndex = 0;
  let match;
  while ((match = primaryPattern.exec(content)) !== null) {
    const testId = match[1];
    if (!seenTestIds.has(testId)) {
      seenTestIds.add(testId);
      testIds.push(testId);

      // Find line number
      const lineNumber = content.substring(0, match.index).split('\n').length;

      selectors.push({
        id: generateSelectorId(testId, component),
        description: inferDescription(testId),
        strategy: 'testid',
        value: testId,
        component,
        sourceFile: filePath,
        sourceLine: lineNumber,
        stable: true,
      });
    }
  }

  // Also scan for getByTestId in test files
  TESTID_PATTERNS.getByTestId.lastIndex = 0;
  while ((match = TESTID_PATTERNS.getByTestId.exec(content)) !== null) {
    const testId = match[1];
    if (!seenTestIds.has(testId)) {
      seenTestIds.add(testId);
      testIds.push(testId);
    }
  }

  // Track CSS debt if enabled
  if (trackCSSDebt) {
    for (const [patternName, pattern] of Object.entries(CSS_DEBT_PATTERNS)) {
      pattern.lastIndex = 0;
      while ((match = pattern.exec(content)) !== null) {
        const selector = match[1];
        const lineNumber = content.substring(0, match.index).split('\n').length;

        // Check if we already have this debt entry
        const existing = cssDebt.find((d) => d.selector === selector);
        if (existing) {
          existing.usages.push({ file: filePath, line: lineNumber });
        } else {
          cssDebt.push({
            selector: patternName === 'classSelector' ? `.${selector}` : selector,
            usages: [{ file: filePath, line: lineNumber }],
            priority: 'medium',
            reason: `CSS ${patternName} found - consider using testid or role`,
          });
        }
      }
    }
  }

  return { selectors, testIds, cssDebt };
}

/**
 * Scan source directory for testids
 */
export async function scanForTestIds(options: ScannerOptions): Promise<ScannerResult> {
  const {
    sourceDir,
    testIdAttribute = 'data-testid',
    include = DEFAULT_INCLUDE,
    exclude = DEFAULT_EXCLUDE,
    trackCSSDebt = true,
    existingCatalog,
  } = options;

  const resolvedDir = resolve(sourceDir);
  const warnings: string[] = [];

  if (!existsSync(resolvedDir)) {
    return {
      catalog: existingCatalog ?? createEmptyCatalog(),
      filesScanned: 0,
      testIdsFound: 0,
      cssDebtFound: 0,
      warnings: [`Source directory not found: ${resolvedDir}`],
    };
  }

  // Find files to scan
  const files = await glob(include, {
    cwd: resolvedDir,
    ignore: exclude,
    absolute: true,
  });

  // Start with existing or empty catalog
  const catalog: SelectorCatalog = existingCatalog ?? createEmptyCatalog();
  catalog.sourceDir = sourceDir;
  const allTestIds = new Set<string>(catalog.testIds);

  let filesScanned = 0;
  let testIdsFound = 0;
  let cssDebtFound = 0;

  // Scan each file
  for (const filePath of files) {
    try {
      const result = scanFile(filePath, testIdAttribute, trackCSSDebt);
      filesScanned++;

      // Add selectors
      for (const selector of result.selectors) {
        // Use relative path for sourceFile
        selector.sourceFile = relative(resolvedDir, filePath);
        catalog.selectors[selector.id] = selector;
      }

      // Track testids
      for (const testId of result.testIds) {
        if (!allTestIds.has(testId)) {
          allTestIds.add(testId);
          testIdsFound++;
        }
      }

      // Track CSS debt
      for (const debt of result.cssDebt) {
        // Convert file paths to relative
        debt.usages = debt.usages.map((u) => ({
          ...u,
          file: relative(resolvedDir, u.file),
        }));

        // Merge with existing debt
        const existing = catalog.cssDebt?.find((d) => d.selector === debt.selector);
        if (existing) {
          existing.usages.push(...debt.usages);
        } else {
          catalog.cssDebt = catalog.cssDebt ?? [];
          catalog.cssDebt.push(debt);
          cssDebtFound++;
        }
      }
    } catch (err) {
      warnings.push(`Failed to scan ${filePath}: ${err}`);
    }
  }

  // Update catalog testIds
  catalog.testIds = Array.from(allTestIds).sort();

  return {
    catalog,
    filesScanned,
    testIdsFound,
    cssDebtFound,
    warnings,
  };
}

/**
 * Quick scan to just get testids (faster, no full catalog)
 */
export async function quickScanTestIds(
  sourceDir: string,
  testIdAttribute = 'data-testid'
): Promise<string[]> {
  const result = await scanForTestIds({
    sourceDir,
    testIdAttribute,
    trackCSSDebt: false,
  });
  return result.catalog.testIds;
}
