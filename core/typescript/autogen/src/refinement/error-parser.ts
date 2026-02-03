/**
 * @module refinement/error-parser
 * @description Parse and categorize Playwright test errors
 */

import crypto from 'crypto';
import {
  ErrorAnalysis,
  ErrorCategory,
  ErrorSeverity,
  ErrorLocation,
  PlaywrightTestResult,
  TestStatus,
} from './types.js';

// ═══════════════════════════════════════════════════════════════════════════
// ERROR PATTERNS
// ═══════════════════════════════════════════════════════════════════════════

interface ErrorPattern {
  category: ErrorCategory;
  patterns: RegExp[];
  severity: ErrorSeverity;
  selectorExtractor?: RegExp;
  valueExtractor?: RegExp;
}

const ERROR_PATTERNS: ErrorPattern[] = [
  // Selector not found
  {
    category: 'SELECTOR_NOT_FOUND',
    patterns: [
      /locator\..*: Timeout \d+ms exceeded/i,
      /waiting for (locator|selector)/i,
      /No element matches selector/i,
      /Element is not attached to the DOM/i,
      /Element is outside of the viewport/i,
      /page\.\$\(.*\) resolved to (null|undefined)/i,
      /getByRole.*resolved to \d+ element/i,
      /getByTestId.*resolved to \d+ element/i,
      /getByText.*resolved to \d+ element/i,
      /locator resolved to \d+ elements/i,
    ],
    severity: 'major',
    selectorExtractor: /locator\(['"]([^'"]+)['"]\)|getBy\w+\(['"]([^'"]+)['"]\)/,
  },

  // Timeout
  {
    category: 'TIMEOUT',
    patterns: [
      /Timeout \d+ms exceeded/i,
      /page\.waitFor.*exceeded/i,
      /Test timeout of \d+ms exceeded/i,
      /Navigation timeout of \d+ms exceeded/i,
      /exceeded .*timeout/i,
    ],
    severity: 'major',
  },

  // Assertion failed
  {
    category: 'ASSERTION_FAILED',
    patterns: [
      /expect\(.*\)\.to/i,
      /Expected.*to (be|have|contain|match|equal)/i,
      /AssertionError/i,
      /Received.*Expected/i,
      /toBeVisible.*but.*hidden/i,
      /toHaveText.*but.*received/i,
      /toHaveValue.*but.*received/i,
      /toBeChecked.*but.*unchecked/i,
    ],
    severity: 'major',
    valueExtractor: /Expected:?\s*(.+?)\s*(?:Received|Actual|but|$)/i,
  },

  // Navigation error
  {
    category: 'NAVIGATION_ERROR',
    patterns: [
      /net::ERR_/i,
      /Navigation failed/i,
      /page\.goto.*failed/i,
      /Frame was detached/i,
      /Target page.*closed/i,
      /browser has disconnected/i,
      /Protocol error.*Target closed/i,
    ],
    severity: 'critical',
  },

  // Network error
  {
    category: 'NETWORK_ERROR',
    patterns: [
      /ECONNREFUSED/i,
      /ENOTFOUND/i,
      /ETIMEDOUT/i,
      /fetch failed/i,
      /Request failed/i,
      /Status code: [45]\d{2}/i,
    ],
    severity: 'major',
  },

  // Authentication error
  {
    category: 'AUTHENTICATION_ERROR',
    patterns: [
      /401 Unauthorized/i,
      /403 Forbidden/i,
      /Authentication failed/i,
      /Login failed/i,
      /Invalid credentials/i,
      /Session expired/i,
      /Token expired/i,
    ],
    severity: 'critical',
  },

  // Permission error
  {
    category: 'PERMISSION_ERROR',
    patterns: [
      /Permission denied/i,
      /Access denied/i,
      /not authorized/i,
      /insufficient permissions/i,
    ],
    severity: 'critical',
  },

  // Type error
  {
    category: 'TYPE_ERROR',
    patterns: [
      /TypeError:/i,
      /Cannot read propert/i,
      /is not a function/i,
      /is not defined/i,
      /undefined is not/i,
      /null is not/i,
    ],
    severity: 'major',
  },

  // Syntax error
  {
    category: 'SYNTAX_ERROR',
    patterns: [
      /SyntaxError:/i,
      /Unexpected token/i,
      /Unexpected identifier/i,
      /Invalid or unexpected token/i,
    ],
    severity: 'critical',
  },

  // Runtime error
  {
    category: 'RUNTIME_ERROR',
    patterns: [
      /ReferenceError:/i,
      /RangeError:/i,
      /Error:/i,
    ],
    severity: 'major',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// LOCATION EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════

const LOCATION_PATTERNS = [
  // Standard stack trace format
  /at\s+.*\s+\(([^:]+):(\d+):(\d+)\)/,
  // Playwright error format
  /([^:\s]+\.ts):(\d+):(\d+)/,
  // Simple file:line format
  /([^:\s]+\.(ts|js)):(\d+)/,
];

function extractLocation(errorText: string, stackTrace?: string): ErrorLocation | undefined {
  const textToSearch = stackTrace || errorText;

  for (const pattern of LOCATION_PATTERNS) {
    const match = textToSearch.match(pattern);
    if (match && match[1] && match[2]) {
      return {
        file: match[1],
        line: parseInt(match[2], 10),
        column: match[3] ? parseInt(match[3], 10) : undefined,
      };
    }
  }

  return undefined;
}

// ═══════════════════════════════════════════════════════════════════════════
// ERROR FINGERPRINTING
// ═══════════════════════════════════════════════════════════════════════════

function generateFingerprint(
  category: ErrorCategory,
  message: string,
  selector?: string,
  location?: ErrorLocation
): string {
  // Normalize message by removing dynamic values
  const normalizedMessage = message
    .replace(/\d+ms/g, 'Xms')
    .replace(/\d+ element/g, 'X element')
    .replace(/timeout of \d+/gi, 'timeout of X')
    .replace(/'[^']+'/g, "'X'")
    .replace(/"[^"]+"/g, '"X"')
    .toLowerCase()
    .trim();

  const components = [
    category,
    normalizedMessage.substring(0, 100),
    selector || '',
    location?.file || '',
    location?.line?.toString() || '',
  ];

  const hash = crypto.createHash('md5');
  hash.update(components.join('|'));
  return hash.digest('hex').substring(0, 12);
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PARSER
// ═══════════════════════════════════════════════════════════════════════════

export interface ParseErrorOptions {
  testFile?: string;
  testName?: string;
  includeStackTrace?: boolean;
}

/**
 * Parse a raw error string into structured ErrorAnalysis
 */
export function parseError(
  errorText: string,
  options: ParseErrorOptions = {}
): ErrorAnalysis {
  const { testFile, testName, includeStackTrace = true } = options;

  // Find matching category
  let matchedPattern: ErrorPattern | undefined;
  for (const pattern of ERROR_PATTERNS) {
    for (const regex of pattern.patterns) {
      if (regex.test(errorText)) {
        matchedPattern = pattern;
        break;
      }
    }
    if (matchedPattern) break;
  }

  const category = matchedPattern?.category || 'UNKNOWN';
  const severity = matchedPattern?.severity || 'major';

  // Extract selector if applicable
  let selector: string | undefined;
  if (matchedPattern?.selectorExtractor) {
    const selectorMatch = errorText.match(matchedPattern.selectorExtractor);
    if (selectorMatch && (selectorMatch[1] || selectorMatch[2])) {
      selector = selectorMatch[1] || selectorMatch[2];
    }
  }

  // Extract expected/actual values for assertions
  let expectedValue: string | undefined;
  let actualValue: string | undefined;
  if (category === 'ASSERTION_FAILED') {
    const expectedMatch = errorText.match(/Expected:?\s*(.+?)(?:\n|$)/i);
    const actualMatch = errorText.match(/Received:?\s*(.+?)(?:\n|$)/i);
    expectedValue = expectedMatch?.[1]?.trim();
    actualValue = actualMatch?.[1]?.trim();
  }

  // Extract stack trace
  const stackTraceMatch = errorText.match(/(\s+at\s+.+(?:\n\s+at\s+.+)*)/);
  const stackTrace = includeStackTrace ? stackTraceMatch?.[1]?.trim() : undefined;

  // Extract location
  const location = extractLocation(errorText, stackTrace);
  if (location && testFile) {
    location.file = testFile;
  }
  if (location && testName) {
    location.testName = testName;
  }

  // Extract message (first line or most relevant part)
  const firstLine = errorText.split('\n')[0]?.trim() || '';
  const message = firstLine.length > 200 ? firstLine.substring(0, 200) + '...' : firstLine;

  // Generate fingerprint
  const fingerprint = generateFingerprint(category, message, selector, location);

  return {
    category,
    severity,
    message,
    originalError: errorText,
    location,
    selector,
    expectedValue,
    actualValue,
    stackTrace,
    timestamp: new Date(),
    fingerprint,
  };
}

/**
 * Parse multiple errors from test output
 */
export function parseErrors(
  testOutput: string,
  options: ParseErrorOptions = {}
): ErrorAnalysis[] {
  const errors: ErrorAnalysis[] = [];

  // Split by common error boundaries
  const errorBlocks = testOutput.split(/(?=Error:|AssertionError:|TypeError:|TimeoutError:)/i);

  for (const block of errorBlocks) {
    const trimmed = block.trim();
    if (trimmed.length > 10 && /error|failed|timeout|assert/i.test(trimmed)) {
      errors.push(parseError(trimmed, options));
    }
  }

  // Deduplicate by fingerprint
  const seen = new Set<string>();
  return errors.filter(e => {
    if (seen.has(e.fingerprint)) return false;
    seen.add(e.fingerprint);
    return true;
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// PLAYWRIGHT RESULT PARSER
// ═══════════════════════════════════════════════════════════════════════════

export interface PlaywrightJsonReport {
  suites?: PlaywrightSuite[];
  stats?: {
    total?: number;
    passed?: number;
    failed?: number;
    skipped?: number;
    duration?: number;
  };
}

interface PlaywrightSuite {
  title: string;
  file?: string;
  specs?: PlaywrightSpec[];
  suites?: PlaywrightSuite[];
}

interface PlaywrightSpec {
  title: string;
  tests?: PlaywrightTest[];
}

interface PlaywrightTest {
  title: string;
  status: string;
  duration: number;
  results?: PlaywrightTestRun[];
}

interface PlaywrightTestRun {
  status: string;
  duration: number;
  error?: {
    message?: string;
    stack?: string;
  };
  stdout?: string[];
  stderr?: string[];
  attachments?: Array<{
    name: string;
    contentType: string;
    path?: string;
  }>;
}

/**
 * Parse Playwright JSON report into structured test results
 */
export function parsePlaywrightReport(
  report: PlaywrightJsonReport
): PlaywrightTestResult[] {
  const results: PlaywrightTestResult[] = [];

  function processSuite(suite: PlaywrightSuite, filePath?: string): void {
    const file = suite.file || filePath;

    // Process specs in this suite
    if (suite.specs) {
      for (const spec of suite.specs) {
        if (spec.tests) {
          for (const test of spec.tests) {
            const lastRun = test.results?.[test.results.length - 1];
            const errors: ErrorAnalysis[] = [];

            // Parse error if present
            if (lastRun?.error) {
              const errorText = [lastRun.error.message, lastRun.error.stack]
                .filter(Boolean)
                .join('\n');

              if (errorText) {
                errors.push(parseError(errorText, {
                  testFile: file,
                  testName: `${suite.title} > ${spec.title} > ${test.title}`,
                }));
              }
            }

            // Parse stderr for additional errors
            if (lastRun?.stderr?.length) {
              const stderrErrors = parseErrors(lastRun.stderr.join('\n'), {
                testFile: file,
                testName: `${suite.title} > ${spec.title} > ${test.title}`,
              });
              errors.push(...stderrErrors);
            }

            results.push({
              testId: `${file}:${spec.title}:${test.title}`,
              testName: `${suite.title} > ${spec.title} > ${test.title}`,
              testFile: file || 'unknown',
              status: mapStatus(test.status),
              duration: test.duration,
              errors: deduplicateErrors(errors),
              retries: (test.results?.length || 1) - 1,
              stdout: lastRun?.stdout?.join('\n'),
              stderr: lastRun?.stderr?.join('\n'),
              attachments: lastRun?.attachments?.map(a => ({
                name: a.name,
                contentType: a.contentType,
                path: a.path,
              })),
            });
          }
        }
      }
    }

    // Process nested suites
    if (suite.suites) {
      for (const nestedSuite of suite.suites) {
        processSuite(nestedSuite, file);
      }
    }
  }

  // Process all top-level suites
  if (report.suites) {
    for (const suite of report.suites) {
      processSuite(suite);
    }
  }

  return results;
}

function mapStatus(status: string): TestStatus {
  switch (status.toLowerCase()) {
    case 'passed':
      return 'passed';
    case 'failed':
      return 'failed';
    case 'timedout':
      return 'timedOut';
    case 'skipped':
    case 'pending':
      return 'skipped';
    case 'interrupted':
      return 'interrupted';
    default:
      return 'failed';
  }
}

function deduplicateErrors(errors: ErrorAnalysis[]): ErrorAnalysis[] {
  const seen = new Set<string>();
  return errors.filter(e => {
    if (seen.has(e.fingerprint)) return false;
    seen.add(e.fingerprint);
    return true;
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// ERROR CATEGORIZATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if error is likely fixable by selector change
 */
export function isSelectorRelated(error: ErrorAnalysis): boolean {
  return error.category === 'SELECTOR_NOT_FOUND' && !!error.selector;
}

/**
 * Check if error is likely fixable by adding waits
 */
export function isTimingRelated(error: ErrorAnalysis): boolean {
  return error.category === 'TIMEOUT' ||
    (error.category === 'SELECTOR_NOT_FOUND' && error.message.includes('Timeout'));
}

/**
 * Check if error is likely an environmental issue (not code-fixable)
 */
export function isEnvironmentalError(error: ErrorAnalysis): boolean {
  return [
    'NETWORK_ERROR',
    'AUTHENTICATION_ERROR',
    'PERMISSION_ERROR',
  ].includes(error.category);
}

/**
 * Check if error is a syntax/type error requiring code fix
 */
export function isCodeError(error: ErrorAnalysis): boolean {
  return [
    'SYNTAX_ERROR',
    'TYPE_ERROR',
    'RUNTIME_ERROR',
  ].includes(error.category);
}

/**
 * Get suggested fix types for an error category
 */
export function getSuggestedFixTypes(category: ErrorCategory): string[] {
  switch (category) {
    case 'SELECTOR_NOT_FOUND':
      return ['SELECTOR_CHANGE', 'LOCATOR_STRATEGY_CHANGED', 'FRAME_CONTEXT_ADDED'];
    case 'TIMEOUT':
      return ['WAIT_ADDED', 'TIMEOUT_INCREASED', 'RETRY_ADDED'];
    case 'ASSERTION_FAILED':
      return ['ASSERTION_MODIFIED', 'WAIT_ADDED'];
    case 'NAVIGATION_ERROR':
      return ['ERROR_HANDLING_ADDED', 'RETRY_ADDED'];
    case 'TYPE_ERROR':
    case 'RUNTIME_ERROR':
      return ['OTHER'];
    case 'SYNTAX_ERROR':
      return ['OTHER'];
    default:
      return ['OTHER'];
  }
}
