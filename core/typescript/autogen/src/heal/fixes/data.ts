/**
 * Data Isolation Fix - Namespace test data with runId
 * @see T065 - Implement data isolation fix (runId namespace)
 */
import { randomBytes } from 'node:crypto';

/**
 * Data fix context
 */
export interface DataFixContext {
  /** Original code */
  code: string;
  /** Test file path */
  testFile: string;
  /** Journey ID */
  journeyId: string;
}

/**
 * Data fix result
 */
export interface DataFixResult {
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
 * Generate unique run ID
 */
export function generateRunId(): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(4).toString('hex');
  return `${timestamp}-${random}`;
}

// Note: Patterns defined for reference, may be used in future enhancements

/**
 * Check if code has data isolation
 */
export function hasDataIsolation(code: string): boolean {
  // Check for runId pattern
  if (/\brunId\b/i.test(code)) {
    return true;
  }

  // Check for testInfo.testId usage
  if (/testInfo\.testId/i.test(code)) {
    return true;
  }

  // Check for dynamic data generation
  if (/Date\.now\(\)|Math\.random\(\)|crypto|uuid/i.test(code)) {
    return true;
  }

  return false;
}

/**
 * Add runId variable to test
 */
export function addRunIdVariable(code: string): DataFixResult {
  // Check if runId already exists
  if (/\bconst\s+runId\b/.test(code)) {
    return {
      applied: false,
      code,
      description: 'runId already defined',
      confidence: 0,
    };
  }

  // Find the test function start
  const testMatch = code.match(/test\s*\(\s*['"`][^'"`]+['"`]\s*,\s*async\s*\(\s*\{[^}]*\}\s*\)\s*=>\s*\{/);
  if (!testMatch) {
    return {
      applied: false,
      code,
      description: 'Unable to find test function',
      confidence: 0,
    };
  }

  // Insert runId after the test function opening brace
  const insertIndex = testMatch.index! + testMatch[0].length;
  const indentation = '    ';
  const runIdDeclaration = `\n${indentation}const runId = \`\${Date.now()}-\${Math.random().toString(36).slice(2, 8)}\`;`;

  const modifiedCode = code.slice(0, insertIndex) + runIdDeclaration + code.slice(insertIndex);

  return {
    applied: true,
    code: modifiedCode,
    description: 'Added runId variable for data isolation',
    confidence: 0.8,
  };
}

/**
 * Namespace email with runId
 */
export function namespaceEmail(email: string, runId: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return `${email}-${runId}`;
  return `${local}+${runId}@${domain}`;
}

/**
 * Namespace name with runId
 */
export function namespaceName(name: string, runId: string): string {
  return `${name} ${runId}`;
}

/**
 * Replace hardcoded email with namespaced version
 */
export function replaceHardcodedEmail(code: string): DataFixResult {
  const emailPattern = /(['"`])([\w.+-]+@[\w.-]+\.[\w]{2,})(['"`])/g;

  let applied = false;
  const modifiedCode = code.replace(emailPattern, (match, _q1, email, _q2) => {
    // Don't replace if already using template literals with runId
    if (code.includes('`') && code.includes('${runId}')) {
      return match;
    }

    // Check if this is in a fill() or similar
    const before = code.slice(Math.max(0, code.indexOf(match) - 50), code.indexOf(match));
    if (/\.fill\s*\([^,]*$/.test(before)) {
      applied = true;
      const [local, domain] = email.split('@');
      return `\`${local}+\${runId}@${domain}\``;
    }

    return match;
  });

  return {
    applied,
    code: modifiedCode,
    description: applied ? 'Namespaced email with runId' : 'No hardcoded email to namespace',
    confidence: applied ? 0.7 : 0,
  };
}

/**
 * Replace hardcoded test data with namespaced version
 */
export function replaceHardcodedTestData(code: string): DataFixResult {
  let modifiedCode = code;
  let applied = false;

  // Replace test names
  modifiedCode = modifiedCode.replace(
    /(['"`])(Test\s*(?:User|Name|Account|Client|Customer))\s*(['"`])/gi,
    (_match, _q1, name, _q2) => {
      applied = true;
      return `\`${name} \${runId}\``;
    }
  );

  // Replace test- prefixed strings in fill operations
  modifiedCode = modifiedCode.replace(
    /\.fill\s*\([^,]+,\s*['"`](test[-_]?\w+)['"`]\s*\)/gi,
    (match, value) => {
      applied = true;
      return match.replace(`'${value}'`, `\`${value}-\${runId}\``).replace(`"${value}"`, `\`${value}-\${runId}\``);
    }
  );

  return {
    applied,
    code: modifiedCode,
    description: applied ? 'Namespaced test data with runId' : 'No hardcoded test data found',
    confidence: applied ? 0.6 : 0,
  };
}

/**
 * Apply data isolation fix
 */
export function applyDataFix(context: DataFixContext): DataFixResult {
  const { code } = context;

  // Check if already has isolation
  if (hasDataIsolation(code)) {
    return {
      applied: false,
      code,
      description: 'Data isolation already present',
      confidence: 0,
    };
  }

  // First, add runId variable
  let result = addRunIdVariable(code);
  if (!result.applied) {
    return result;
  }

  let modifiedCode = result.code;
  let fixCount = 1;

  // Then namespace emails
  const emailResult = replaceHardcodedEmail(modifiedCode);
  if (emailResult.applied) {
    modifiedCode = emailResult.code;
    fixCount++;
  }

  // Then namespace test data
  const dataResult = replaceHardcodedTestData(modifiedCode);
  if (dataResult.applied) {
    modifiedCode = dataResult.code;
    fixCount++;
  }

  return {
    applied: true,
    code: modifiedCode,
    description: `Applied ${fixCount} data isolation fix(es)`,
    confidence: 0.7,
  };
}

/**
 * Add cleanup hook for test data
 */
export function addCleanupHook(code: string, cleanupCode: string): DataFixResult {
  // Check if afterEach already exists
  if (/test\.afterEach\s*\(/.test(code)) {
    return {
      applied: false,
      code,
      description: 'afterEach hook already exists',
      confidence: 0,
    };
  }

  // Find test.describe or test block
  const describeMatch = code.match(/test\.describe\s*\(\s*['"`][^'"`]+['"`]\s*,\s*\(\s*\)\s*=>\s*\{/);

  if (describeMatch) {
    // Add after describe opening
    const insertIndex = describeMatch.index! + describeMatch[0].length;
    const indentation = '  ';
    const hookCode = `\n${indentation}test.afterEach(async () => {\n${indentation}  ${cleanupCode}\n${indentation}});\n`;

    const modifiedCode = code.slice(0, insertIndex) + hookCode + code.slice(insertIndex);

    return {
      applied: true,
      code: modifiedCode,
      description: 'Added afterEach cleanup hook',
      confidence: 0.7,
    };
  }

  return {
    applied: false,
    code,
    description: 'Unable to find suitable location for cleanup hook',
    confidence: 0,
  };
}

/**
 * Extract test data patterns from code
 */
export function extractTestDataPatterns(code: string): string[] {
  const patterns: string[] = [];

  // Find fill operations
  const fillMatches = code.matchAll(/\.fill\s*\([^,]+,\s*['"`]([^'"`]+)['"`]\s*\)/g);
  for (const match of fillMatches) {
    patterns.push(match[1]);
  }

  // Find email patterns
  const emailMatches = code.matchAll(/['"`]([\w.+-]+@[\w.-]+\.[\w]{2,})['"`]/g);
  for (const match of emailMatches) {
    patterns.push(match[1]);
  }

  return patterns;
}
