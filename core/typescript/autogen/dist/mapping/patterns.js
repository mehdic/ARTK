/**
 * Create a locator spec from pattern match
 */
export function createLocatorFromMatch(strategy, value, name) {
    const locator = { strategy, value };
    if (name) {
        locator.options = { name };
    }
    return locator;
}
/**
 * Create a value spec from text
 */
export function createValueFromText(text) {
    // Actor reference: {{email}}, {{password}}, etc.
    if (/^\{\{.+\}\}$/.test(text)) {
        const path = text.slice(2, -2).trim();
        return { type: 'actor', value: path };
    }
    // Test data reference: $user.email, $testData.field
    if (/^\$.+/.test(text)) {
        return { type: 'testData', value: text.slice(1) };
    }
    // Generated value: ${runId}, ${timestamp}
    if (/\$\{.+\}/.test(text)) {
        return { type: 'generated', value: text };
    }
    // Literal value
    return { type: 'literal', value: text };
}
/**
 * Navigation patterns
 */
export const navigationPatterns = [
    {
        name: 'navigate-to-url',
        regex: /^(?:user\s+)?(?:navigates?|goes?|opens?)\s+(?:to\s+)?(?:the\s+)?["']?([^"'\s]+)["']?$/i,
        primitiveType: 'goto',
        extract: (match) => ({
            type: 'goto',
            url: match[1],
            waitForLoad: true,
        }),
    },
    {
        name: 'navigate-to-page',
        regex: /^(?:user\s+)?(?:navigates?|goes?|opens?)\s+(?:to\s+)?(?:the\s+)?(.+?)\s+page$/i,
        primitiveType: 'goto',
        extract: (match) => ({
            type: 'goto',
            url: `/${match[1].toLowerCase().replace(/\s+/g, '-')}`,
            waitForLoad: true,
        }),
    },
];
/**
 * Click patterns
 */
export const clickPatterns = [
    {
        name: 'click-button-quoted',
        regex: /^(?:user\s+)?(?:clicks?|presses?|taps?)\s+(?:on\s+)?(?:the\s+)?["']([^"']+)["']\s+button$/i,
        primitiveType: 'click',
        extract: (match) => ({
            type: 'click',
            locator: createLocatorFromMatch('role', 'button', match[1]),
        }),
    },
    {
        name: 'click-link-quoted',
        regex: /^(?:user\s+)?(?:clicks?|presses?|taps?)\s+(?:on\s+)?(?:the\s+)?["']([^"']+)["']\s+link$/i,
        primitiveType: 'click',
        extract: (match) => ({
            type: 'click',
            locator: createLocatorFromMatch('role', 'link', match[1]),
        }),
    },
    {
        name: 'click-element-quoted',
        regex: /^(?:user\s+)?(?:clicks?|presses?|taps?)\s+(?:on\s+)?(?:the\s+)?["']([^"']+)["']$/i,
        primitiveType: 'click',
        extract: (match) => ({
            type: 'click',
            locator: createLocatorFromMatch('text', match[1]),
        }),
    },
    {
        name: 'click-element-generic',
        regex: /^(?:user\s+)?(?:clicks?|presses?|taps?)\s+(?:on\s+)?(?:the\s+)?(.+?)\s+(?:button|link|icon|menu|tab)$/i,
        primitiveType: 'click',
        extract: (match) => ({
            type: 'click',
            locator: createLocatorFromMatch('text', match[1]),
        }),
    },
];
/**
 * Fill/Input patterns
 */
export const fillPatterns = [
    {
        name: 'fill-field-quoted-value',
        regex: /^(?:user\s+)?(?:enters?|types?|fills?\s+in?|inputs?)\s+["']([^"']+)["']\s+(?:in|into)\s+(?:the\s+)?["']([^"']+)["']\s*(?:field|input)?$/i,
        primitiveType: 'fill',
        extract: (match) => ({
            type: 'fill',
            locator: createLocatorFromMatch('label', match[2]),
            value: createValueFromText(match[1]),
        }),
    },
    {
        name: 'fill-field-actor-value',
        regex: /^(?:user\s+)?(?:enters?|types?|fills?\s+in?|inputs?)\s+(\{\{[^}]+\}\})\s+(?:in|into)\s+(?:the\s+)?["']([^"']+)["']\s*(?:field|input)?$/i,
        primitiveType: 'fill',
        extract: (match) => ({
            type: 'fill',
            locator: createLocatorFromMatch('label', match[2]),
            value: createValueFromText(match[1]),
        }),
    },
    {
        name: 'fill-field-generic',
        regex: /^(?:user\s+)?(?:enters?|types?|fills?\s+in?|inputs?)\s+(.+?)\s+(?:in|into)\s+(?:the\s+)?(.+?)\s*(?:field|input)?$/i,
        primitiveType: 'fill',
        extract: (match) => ({
            type: 'fill',
            locator: createLocatorFromMatch('label', match[2].replace(/["']/g, '')),
            value: createValueFromText(match[1].replace(/["']/g, '')),
        }),
    },
];
/**
 * Select patterns
 */
export const selectPatterns = [
    {
        name: 'select-option',
        regex: /^(?:user\s+)?(?:selects?|chooses?)\s+["']([^"']+)["']\s+(?:from|in)\s+(?:the\s+)?["']([^"']+)["']\s*(?:dropdown|select|menu)?$/i,
        primitiveType: 'select',
        extract: (match) => ({
            type: 'select',
            locator: createLocatorFromMatch('label', match[2]),
            option: match[1],
        }),
    },
];
/**
 * Check/Uncheck patterns
 */
export const checkPatterns = [
    {
        name: 'check-checkbox',
        regex: /^(?:user\s+)?(?:checks?|enables?|ticks?)\s+(?:the\s+)?["']([^"']+)["']\s*(?:checkbox|option)?$/i,
        primitiveType: 'check',
        extract: (match) => ({
            type: 'check',
            locator: createLocatorFromMatch('label', match[1]),
        }),
    },
    {
        name: 'uncheck-checkbox',
        regex: /^(?:user\s+)?(?:unchecks?|disables?|unticks?)\s+(?:the\s+)?["']([^"']+)["']\s*(?:checkbox|option)?$/i,
        primitiveType: 'uncheck',
        extract: (match) => ({
            type: 'uncheck',
            locator: createLocatorFromMatch('label', match[1]),
        }),
    },
];
/**
 * Visibility assertion patterns
 */
export const visibilityPatterns = [
    {
        name: 'should-see-text',
        regex: /^(?:user\s+)?(?:should\s+)?(?:sees?|views?)\s+(?:the\s+)?["']([^"']+)["']$/i,
        primitiveType: 'expectVisible',
        extract: (match) => ({
            type: 'expectVisible',
            locator: createLocatorFromMatch('text', match[1]),
        }),
    },
    {
        name: 'is-visible',
        regex: /^["']?([^"']+)["']?\s+(?:is\s+)?(?:visible|displayed|shown)$/i,
        primitiveType: 'expectVisible',
        extract: (match) => ({
            type: 'expectVisible',
            locator: createLocatorFromMatch('text', match[1]),
        }),
    },
    {
        name: 'should-see-element',
        regex: /^(?:user\s+)?(?:should\s+)?(?:sees?|views?)\s+(?:the\s+)?(.+?)\s+(?:heading|button|link|form|page|element)$/i,
        primitiveType: 'expectVisible',
        extract: (match) => ({
            type: 'expectVisible',
            locator: createLocatorFromMatch('text', match[1]),
        }),
    },
    {
        name: 'page-displayed',
        regex: /^(?:the\s+)?(.+?)\s+(?:page|screen|view)\s+(?:is\s+)?(?:displayed|shown|visible)$/i,
        primitiveType: 'expectVisible',
        extract: (match) => ({
            type: 'expectVisible',
            locator: createLocatorFromMatch('text', match[1]),
        }),
    },
];
/**
 * Toast/notification patterns
 */
export const toastPatterns = [
    {
        name: 'success-toast-message',
        regex: /^(?:a\s+)?success\s+toast\s+(?:with\s+)?["']([^"']+)["']\s*(?:message\s+)?(?:appears?|is\s+shown|displays?)$/i,
        primitiveType: 'expectToast',
        extract: (match) => ({
            type: 'expectToast',
            toastType: 'success',
            message: match[1],
        }),
    },
    {
        name: 'error-toast-message',
        regex: /^(?:an?\s+)?error\s+toast\s+(?:with\s+)?["']([^"']+)["']\s*(?:message\s+)?(?:appears?|is\s+shown|displays?)$/i,
        primitiveType: 'expectToast',
        extract: (match) => ({
            type: 'expectToast',
            toastType: 'error',
            message: match[1],
        }),
    },
    {
        name: 'toast-appears',
        regex: /^(?:a\s+)?(success|error|info|warning)\s+toast\s+(?:appears?|is\s+shown|displays?)$/i,
        primitiveType: 'expectToast',
        extract: (match) => ({
            type: 'expectToast',
            toastType: match[1].toLowerCase(),
        }),
    },
    {
        name: 'toast-with-text',
        regex: /^(?:toast|notification)\s+(?:with\s+)?["']([^"']+)["']\s+(?:appears?|is\s+shown|displays?)$/i,
        primitiveType: 'expectToast',
        extract: (match) => ({
            type: 'expectToast',
            toastType: 'info',
            message: match[1],
        }),
    },
];
/**
 * URL assertion patterns
 */
export const urlPatterns = [
    {
        name: 'url-contains',
        regex: /^(?:the\s+)?url\s+(?:should\s+)?(?:contains?|includes?)\s+["']?([^"'\s]+)["']?$/i,
        primitiveType: 'expectURL',
        extract: (match) => ({
            type: 'expectURL',
            pattern: match[1],
        }),
    },
    {
        name: 'url-is',
        regex: /^(?:the\s+)?url\s+(?:should\s+)?(?:is|equals?|be)\s+["']?([^"'\s]+)["']?$/i,
        primitiveType: 'expectURL',
        extract: (match) => ({
            type: 'expectURL',
            pattern: match[1],
        }),
    },
    {
        name: 'redirected-to',
        regex: /^(?:user\s+)?(?:is\s+)?redirected\s+to\s+["']?([^"'\s]+)["']?$/i,
        primitiveType: 'expectURL',
        extract: (match) => ({
            type: 'expectURL',
            pattern: match[1],
        }),
    },
];
/**
 * Module call patterns (authentication)
 */
export const authPatterns = [
    {
        name: 'user-login',
        regex: /^(?:user\s+)?(?:logs?\s*in|login\s+is\s+performed|authenticates?)$/i,
        primitiveType: 'callModule',
        extract: () => ({
            type: 'callModule',
            module: 'auth',
            method: 'login',
        }),
    },
    {
        name: 'user-logout',
        regex: /^(?:user\s+)?(?:logs?\s*out|logout\s+is\s+performed|signs?\s*out)$/i,
        primitiveType: 'callModule',
        extract: () => ({
            type: 'callModule',
            module: 'auth',
            method: 'logout',
        }),
    },
    {
        name: 'login-as-role',
        regex: /^(?:user\s+)?logs?\s*in\s+as\s+(?:an?\s+)?(.+?)(?:\s+user)?$/i,
        primitiveType: 'callModule',
        extract: (match) => ({
            type: 'callModule',
            module: 'auth',
            method: 'loginAs',
            args: [match[1].toLowerCase()],
        }),
    },
];
/**
 * Wait patterns
 */
export const waitPatterns = [
    {
        name: 'wait-for-navigation',
        regex: /^(?:user\s+)?(?:waits?\s+)?(?:for\s+)?navigation\s+to\s+["']?([^"'\s]+)["']?$/i,
        primitiveType: 'waitForURL',
        extract: (match) => ({
            type: 'waitForURL',
            pattern: match[1],
        }),
    },
    {
        name: 'wait-for-page',
        regex: /^(?:user\s+)?(?:waits?\s+)?(?:for\s+)?(?:the\s+)?(.+?)\s+(?:page|screen)\s+to\s+load$/i,
        primitiveType: 'waitForLoadingComplete',
        extract: () => ({
            type: 'waitForLoadingComplete',
        }),
    },
];
/**
 * All patterns in priority order (more specific patterns first)
 */
export const allPatterns = [
    ...authPatterns,
    ...toastPatterns,
    ...navigationPatterns,
    ...clickPatterns,
    ...fillPatterns,
    ...selectPatterns,
    ...checkPatterns,
    ...visibilityPatterns,
    ...urlPatterns,
    ...waitPatterns,
];
/**
 * Match text against all patterns and return the first matching primitive
 */
export function matchPattern(text) {
    const trimmedText = text.trim();
    for (const pattern of allPatterns) {
        const match = trimmedText.match(pattern.regex);
        if (match) {
            const primitive = pattern.extract(match);
            if (primitive) {
                return primitive;
            }
        }
    }
    return null;
}
/**
 * Get all pattern matches for debugging
 */
export function getPatternMatches(text) {
    const trimmedText = text.trim();
    const matches = [];
    for (const pattern of allPatterns) {
        const match = trimmedText.match(pattern.regex);
        if (match) {
            const primitive = pattern.extract(match);
            if (primitive) {
                matches.push({ pattern: pattern.name, match: primitive });
            }
        }
    }
    return matches;
}
//# sourceMappingURL=patterns.js.map