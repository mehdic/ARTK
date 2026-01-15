/**
 * Timing/Async Fix - Handle timeout and async issues
 * @see T064 - Implement timing/async fix
 */

/**
 * Timing fix context
 */
export interface TimingFixContext {
  /** Original code */
  code: string;
  /** Line number where timing issue occurs */
  lineNumber: number;
  /** Current timeout (if known) */
  currentTimeout?: number;
  /** Error message from Playwright */
  errorMessage: string;
}

/**
 * Timing fix result
 */
export interface TimingFixResult {
  /** Whether a fix was applied */
  applied: boolean;
  /** The modified code */
  code: string;
  /** Description of the fix */
  description: string;
  /** Confidence in the fix (0-1) */
  confidence: number;
}

/**
 * Patterns for missing await detection
 */
const MISSING_AWAIT_PATTERNS = [
  // Playwright actions without await
  /(?<!\bawait\s+)(page\.(?:click|fill|type|check|uncheck|selectOption|hover|focus|press|dblclick|dragTo)\s*\()/g,
  // Expectations without await
  /(?<!\bawait\s+)(expect\s*\([^)]+\)\.(?:toBeVisible|toBeHidden|toHaveText|toContainText|toHaveValue|toHaveURL|toHaveTitle)\s*\()/g,
  // Locator actions without await
  /(?<!\bawait\s+)([a-zA-Z_$][a-zA-Z0-9_$]*\.(?:click|fill|type|check|hover|press)\s*\()/g,
];

// Web-first assertion patterns used in conversion logic below

/**
 * Extract timeout from error message
 */
export function extractTimeoutFromError(errorMessage: string): number | null {
  const match = errorMessage.match(/timeout\s+(\d+)ms/i);
  return match ? parseInt(match[1]!, 10) : null;
}

/**
 * Calculate suggested timeout increase
 */
export function suggestTimeoutIncrease(
  currentTimeout: number,
  maxTimeout: number = 30000
): number {
  // Increase by 50%, but cap at maxTimeout
  const suggested = Math.min(Math.round(currentTimeout * 1.5), maxTimeout);
  return suggested;
}

/**
 * Fix missing await statements
 */
export function fixMissingAwait(code: string): TimingFixResult {
  let modifiedCode = code;
  let fixCount = 0;

  for (const pattern of MISSING_AWAIT_PATTERNS) {
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0;

    modifiedCode = modifiedCode.replace(pattern, (_match, p1) => {
      fixCount++;
      return `await ${p1}`;
    });
  }

  return {
    applied: fixCount > 0,
    code: modifiedCode,
    description: fixCount > 0 ? `Added ${fixCount} missing await statement(s)` : 'No missing await found',
    confidence: fixCount > 0 ? 0.9 : 0,
  };
}

/**
 * Convert to web-first assertion
 */
export function convertToWebFirstAssertion(code: string): TimingFixResult {
  let modifiedCode = code;
  let applied = false;

  // Convert textContent extraction to toHaveText
  modifiedCode = modifiedCode.replace(
    /const\s+(\w+)\s*=\s*await\s+(\w+)\.textContent\s*\(\s*\)\s*;?\s*\n(\s*)expect\s*\(\s*\1\s*\)\.toBe\s*\(\s*(['"][^'"]+['"])\s*\)/g,
    (_, _varName, locator, indent, expected) => {
      applied = true;
      return `${indent}await expect(${locator}).toHaveText(${expected})`;
    }
  );

  // Convert innerText extraction to toHaveText
  modifiedCode = modifiedCode.replace(
    /const\s+(\w+)\s*=\s*await\s+(\w+)\.innerText\s*\(\s*\)\s*;?\s*\n(\s*)expect\s*\(\s*\1\s*\)\.toBe\s*\(\s*(['"][^'"]+['"])\s*\)/g,
    (_, _varName, locator, indent, expected) => {
      applied = true;
      return `${indent}await expect(${locator}).toHaveText(${expected})`;
    }
  );

  // Convert isVisible check to toBeVisible
  modifiedCode = modifiedCode.replace(
    /const\s+(\w+)\s*=\s*await\s+(\w+)\.isVisible\s*\(\s*\)\s*;?\s*\n(\s*)expect\s*\(\s*\1\s*\)\.toBe\s*\(\s*true\s*\)/g,
    (_, _varName, locator, indent) => {
      applied = true;
      return `${indent}await expect(${locator}).toBeVisible()`;
    }
  );

  // Convert isHidden check to toBeHidden
  modifiedCode = modifiedCode.replace(
    /const\s+(\w+)\s*=\s*await\s+(\w+)\.isHidden\s*\(\s*\)\s*;?\s*\n(\s*)expect\s*\(\s*\1\s*\)\.toBe\s*\(\s*true\s*\)/g,
    (_, _varName, locator, indent) => {
      applied = true;
      return `${indent}await expect(${locator}).toBeHidden()`;
    }
  );

  return {
    applied,
    code: modifiedCode,
    description: applied ? 'Converted to web-first assertion' : 'No conversion needed',
    confidence: applied ? 0.85 : 0,
  };
}

/**
 * Add explicit timeout to action
 */
export function addTimeout(
  code: string,
  lineNumber: number,
  timeout: number
): TimingFixResult {
  const lines = code.split('\n');

  if (lineNumber < 1 || lineNumber > lines.length) {
    return {
      applied: false,
      code,
      description: 'Invalid line number',
      confidence: 0,
    };
  }

  const line = lines[lineNumber - 1]!;

  // Check if line already has timeout
  if (/\btimeout\s*:/i.test(line)) {
    return {
      applied: false,
      code,
      description: 'Timeout already specified',
      confidence: 0,
    };
  }

  // Add timeout to action patterns
  let modifiedLine = line;

  // Pattern: .click(), .fill(), etc. with empty options
  modifiedLine = modifiedLine.replace(
    /\.(click|fill|press|type|hover|focus|check|uncheck)\s*\(\s*\)/g,
    `.$1({ timeout: ${timeout} })`
  );

  // Pattern: .click('text'), .fill('selector', 'value')
  modifiedLine = modifiedLine.replace(
    /\.(click|fill|press|type|hover|focus|check|uncheck)\s*\(\s*(['"][^'"]*['"])\s*\)/g,
    `.$1($2, { timeout: ${timeout} })`
  );

  // Pattern: .click({ options })
  modifiedLine = modifiedLine.replace(
    /\.(click|fill|press|type|hover|focus|check|uncheck)\s*\(\s*\{([^}]*)\}\s*\)/g,
    (_, action, options) => {
      if (options.includes('timeout')) {
        return _; // Already has timeout
      }
      return `.${action}({ ${options.trim()}, timeout: ${timeout} })`;
    }
  );

  // Pattern: expect().toBeVisible() etc.
  modifiedLine = modifiedLine.replace(
    /\.(toBeVisible|toBeHidden|toHaveText|toContainText|toHaveValue)\s*\(\s*\)/g,
    `.$1({ timeout: ${timeout} })`
  );

  const applied = modifiedLine !== line;
  lines[lineNumber - 1] = modifiedLine;

  return {
    applied,
    code: lines.join('\n'),
    description: applied ? `Added timeout: ${timeout}ms` : 'Unable to add timeout',
    confidence: applied ? 0.6 : 0,
  };
}

/**
 * Apply timing fix to code
 */
export function applyTimingFix(context: TimingFixContext): TimingFixResult {
  const { code, lineNumber, currentTimeout, errorMessage } = context;

  // First, try to fix missing await (most common cause)
  const awaitFix = fixMissingAwait(code);
  if (awaitFix.applied) {
    return awaitFix;
  }

  // Try converting to web-first assertion
  const webFirstFix = convertToWebFirstAssertion(code);
  if (webFirstFix.applied) {
    return webFirstFix;
  }

  // As last resort, increase timeout
  const timeout = currentTimeout || extractTimeoutFromError(errorMessage) || 5000;
  const newTimeout = suggestTimeoutIncrease(timeout);

  return addTimeout(code, lineNumber, newTimeout);
}

/**
 * Wrap with expect.toPass for complex conditions
 */
export function wrapWithExpectToPass(
  code: string,
  lineStart: number,
  lineEnd: number,
  options?: { timeout?: number; intervals?: number[] }
): TimingFixResult {
  const lines = code.split('\n');

  if (lineStart < 1 || lineEnd > lines.length || lineStart > lineEnd) {
    return {
      applied: false,
      code,
      description: 'Invalid line range',
      confidence: 0,
    };
  }

  // Extract the code block to wrap
  const blockLines = lines.slice(lineStart - 1, lineEnd);
  const indentation = blockLines[0]!.match(/^(\s*)/)?.[1] || '';

  // Build options string
  const optParts: string[] = [];
  if (options?.timeout) {
    optParts.push(`timeout: ${options.timeout}`);
  }
  if (options?.intervals) {
    optParts.push(`intervals: [${options.intervals.join(', ')}]`);
  }
  const optString = optParts.length > 0 ? `, { ${optParts.join(', ')} }` : '';

  // Wrap with expect.toPass
  const wrapped = [
    `${indentation}await expect(async () => {`,
    ...blockLines.map((line) => `  ${line}`),
    `${indentation}}).toPass(${optString.slice(2)})`,
  ];

  lines.splice(lineStart - 1, lineEnd - lineStart + 1, ...wrapped);

  return {
    applied: true,
    code: lines.join('\n'),
    description: 'Wrapped with expect.toPass for retry behavior',
    confidence: 0.7,
  };
}

/**
 * Wrap with expect.poll for dynamic values
 */
export function wrapWithExpectPoll(
  _code: string,
  _lineNumber: number,
  getter: string,
  expected: string,
  options?: { timeout?: number; intervals?: number[] }
): string {
  const optParts: string[] = [];
  if (options?.timeout) {
    optParts.push(`timeout: ${options.timeout}`);
  }
  if (options?.intervals) {
    optParts.push(`intervals: [${options.intervals.join(', ')}]`);
  }
  const optString = optParts.length > 0 ? `, { ${optParts.join(', ')} }` : '';

  return `await expect.poll(async () => ${getter}${optString}).toBe(${expected})`;
}
