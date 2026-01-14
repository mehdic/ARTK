/**
 * Navigation Wait Fix - Add waitForURL/toHaveURL assertions
 * @see T063 - Implement navigation wait fix
 */
// Navigation patterns defined for reference, used in pattern matching
/**
 * Patterns for existing waits (to avoid duplicates)
 */
const EXISTING_WAIT_PATTERNS = [
    /await\s+page\.waitForURL/,
    /await\s+expect\s*\(\s*page\s*\)\.toHaveURL/,
    /await\s+page\.waitForNavigation/,
    /await\s+page\.waitForLoadState/,
];
/**
 * Check if code already has navigation wait
 */
export function hasNavigationWait(code) {
    return EXISTING_WAIT_PATTERNS.some((pattern) => pattern.test(code));
}
/**
 * Extract URL pattern from error message
 */
export function extractUrlFromError(errorMessage) {
    // Pattern: Expected URL to match '/pattern/'
    const matchPattern = errorMessage.match(/Expected\s+URL\s+to\s+match\s+['"]([^'"]+)['"]/i);
    if (matchPattern) {
        return matchPattern[1];
    }
    // Pattern: expected "url" to match
    const matchUrl = errorMessage.match(/expected\s+['"]([^'"]+)['"]\s+to\s+match/i);
    if (matchUrl) {
        return matchUrl[1];
    }
    // Pattern: waiting for URL pattern
    const waitingPattern = errorMessage.match(/waiting\s+for\s+URL\s+['"]([^'"]+)['"]/i);
    if (waitingPattern) {
        return waitingPattern[1];
    }
    return null;
}
/**
 * Extract URL from goto call
 */
export function extractUrlFromGoto(code) {
    const match = code.match(/page\.goto\s*\(\s*['"`]([^'"`]+)['"`]/);
    return match ? match[1] : null;
}
/**
 * Infer expected URL pattern from navigation action
 */
export function inferUrlPattern(code, errorMessage) {
    // First try to extract from error message
    const errorUrl = extractUrlFromError(errorMessage);
    if (errorUrl) {
        return errorUrl;
    }
    // Try to extract from goto call
    const gotoUrl = extractUrlFromGoto(code);
    if (gotoUrl) {
        return gotoUrl;
    }
    return null;
}
/**
 * Generate waitForURL statement
 */
export function generateWaitForURL(urlPattern, options) {
    const opts = options?.timeout ? `, { timeout: ${options.timeout} }` : '';
    // Determine if pattern should be regex or string
    if (urlPattern.includes('*') || urlPattern.includes('\\')) {
        return `await page.waitForURL(/${urlPattern}/${opts})`;
    }
    return `await page.waitForURL('${urlPattern}'${opts})`;
}
/**
 * Generate toHaveURL assertion
 */
export function generateToHaveURL(urlPattern) {
    // Determine if pattern should be regex or string
    if (urlPattern.includes('*') || urlPattern.includes('\\')) {
        return `await expect(page).toHaveURL(/${urlPattern}/)`;
    }
    return `await expect(page).toHaveURL('${urlPattern}')`;
}
/**
 * Insert navigation wait after an action
 */
export function insertNavigationWait(code, lineNumber, urlPattern) {
    const lines = code.split('\n');
    if (lineNumber < 1 || lineNumber > lines.length) {
        return {
            applied: false,
            code,
            description: 'Invalid line number',
            confidence: 0,
        };
    }
    // Check if there's already a wait nearby
    const contextStart = Math.max(0, lineNumber - 2);
    const contextEnd = Math.min(lines.length, lineNumber + 2);
    const context = lines.slice(contextStart, contextEnd).join('\n');
    if (hasNavigationWait(context)) {
        return {
            applied: false,
            code,
            description: 'Navigation wait already exists in context',
            confidence: 0,
        };
    }
    // Get the line where action occurs
    const actionLine = lines[lineNumber - 1];
    const indentation = actionLine.match(/^(\s*)/)?.[1] || '';
    // Insert toHaveURL assertion after the action
    const waitStatement = `${indentation}${generateToHaveURL(urlPattern)}`;
    lines.splice(lineNumber, 0, waitStatement);
    return {
        applied: true,
        code: lines.join('\n'),
        description: `Added toHaveURL assertion for '${urlPattern}'`,
        confidence: 0.7,
    };
}
/**
 * Apply navigation wait fix to code
 */
export function applyNavigationFix(context) {
    const { code, lineNumber, expectedUrl, errorMessage } = context;
    // First, try to infer URL pattern
    const urlPattern = expectedUrl || inferUrlPattern(code, errorMessage);
    if (!urlPattern) {
        // If we can't determine URL, add waitForLoadState instead
        return applyLoadStateWait(code, lineNumber);
    }
    // Check if code already has navigation wait
    if (hasNavigationWait(code)) {
        return {
            applied: false,
            code,
            description: 'Navigation wait already exists',
            confidence: 0,
        };
    }
    return insertNavigationWait(code, lineNumber, urlPattern);
}
/**
 * Apply waitForLoadState as fallback
 */
function applyLoadStateWait(code, lineNumber) {
    const lines = code.split('\n');
    if (lineNumber < 1 || lineNumber > lines.length) {
        return {
            applied: false,
            code,
            description: 'Invalid line number',
            confidence: 0,
        };
    }
    // Get the line where action occurs
    const actionLine = lines[lineNumber - 1];
    const indentation = actionLine.match(/^(\s*)/)?.[1] || '';
    // Insert waitForLoadState after the action
    const waitStatement = `${indentation}await page.waitForLoadState('networkidle')`;
    lines.splice(lineNumber, 0, waitStatement);
    return {
        applied: true,
        code: lines.join('\n'),
        description: 'Added waitForLoadState as fallback',
        confidence: 0.5,
    };
}
/**
 * Fix missing await on goto
 */
export function fixMissingGotoAwait(code) {
    const pattern = /(?<!\bawait\s+)(\bpage\.goto\s*\()/g;
    if (!pattern.test(code)) {
        return {
            applied: false,
            code,
            description: 'No missing await on goto found',
            confidence: 0,
        };
    }
    const modifiedCode = code.replace(/(?<!\bawait\s+)(\bpage\.goto\s*\()/g, 'await $1');
    return {
        applied: modifiedCode !== code,
        code: modifiedCode,
        description: 'Added missing await to page.goto',
        confidence: 0.9,
    };
}
/**
 * Add navigation wait after click that likely navigates
 */
export function addNavigationWaitAfterClick(code, clickLineNumber, expectedUrl) {
    const urlPattern = expectedUrl || '.*';
    return insertNavigationWait(code, clickLineNumber, urlPattern);
}
//# sourceMappingURL=navigation.js.map