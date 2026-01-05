/**
 * Step Mapping Patterns - Regex patterns for parsing step text into IR primitives
 * @see research/2026-01-02_autogen-refined-plan.md Section 10
 */
import type { IRPrimitive, LocatorSpec, ValueSpec, LocatorStrategy } from '../ir/types.js';

/**
 * Pattern result with match groups
 */
export interface PatternMatch {
  type: IRPrimitive['type'];
  groups: Record<string, string>;
}

/**
 * Pattern definition
 */
export interface StepPattern {
  /** Pattern name for debugging */
  name: string;
  /** Regex pattern with named groups */
  regex: RegExp;
  /** IR primitive type this pattern produces */
  primitiveType: IRPrimitive['type'];
  /** Extract IR primitive from match */
  extract: (match: RegExpMatchArray) => IRPrimitive | null;
}

/**
 * Create a locator spec from pattern match
 */
export function createLocatorFromMatch(
  strategy: LocatorStrategy,
  value: string,
  name?: string
): LocatorSpec {
  const locator: LocatorSpec = { strategy, value };
  if (name) {
    locator.options = { name };
  }
  return locator;
}

/**
 * Create a value spec from text
 */
export function createValueFromText(text: string): ValueSpec {
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
export const navigationPatterns: StepPattern[] = [
  {
    name: 'navigate-to-url',
    regex: /^(?:user\s+)?(?:navigates?|go(?:es)?|opens?)\s+(?:to\s+)?(?:the\s+)?["']?([^"'\s]+)["']?$/i,
    primitiveType: 'goto',
    extract: (match) => ({
      type: 'goto',
      url: match[1],
      waitForLoad: true,
    }),
  },
  {
    name: 'navigate-to-page',
    regex: /^(?:user\s+)?(?:navigates?|go(?:es)?|opens?)\s+(?:to\s+)?(?:the\s+)?(.+?)\s+page$/i,
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
export const clickPatterns: StepPattern[] = [
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
export const fillPatterns: StepPattern[] = [
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
export const selectPatterns: StepPattern[] = [
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
export const checkPatterns: StepPattern[] = [
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
export const visibilityPatterns: StepPattern[] = [
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
export const toastPatterns: StepPattern[] = [
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
      toastType: match[1].toLowerCase() as 'success' | 'error' | 'info' | 'warning',
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
export const urlPatterns: StepPattern[] = [
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
export const authPatterns: StepPattern[] = [
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
export const waitPatterns: StepPattern[] = [
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
 * Helper function to convert natural language selectors to Playwright locator strategies
 */
export function parseSelectorToLocator(selector: string): { strategy: LocatorStrategy; value: string; name?: string } {
  // Remove leading "the" if present
  let cleanSelector = selector.replace(/^the\s+/i, '').trim();

  // Match button patterns
  if (/button$/i.test(cleanSelector)) {
    const buttonName = cleanSelector.replace(/\s*button$/i, '').trim();
    return { strategy: 'role', value: 'button', name: buttonName };
  }

  // Match link patterns
  if (/link$/i.test(cleanSelector)) {
    const linkName = cleanSelector.replace(/\s*link$/i, '').trim();
    return { strategy: 'role', value: 'link', name: linkName };
  }

  // Match input/field patterns
  if (/(?:input|field)$/i.test(cleanSelector)) {
    const labelName = cleanSelector.replace(/\s*(?:input|field)$/i, '').trim();
    return { strategy: 'label', value: labelName };
  }

  // Default to text locator
  return { strategy: 'text', value: cleanSelector };
}

/**
 * Structured step patterns for Journey markdown format
 * Matches patterns like:
 * - **Action**: Click the login button
 * - **Wait for**: Dashboard to load
 * - **Assert**: User name is visible
 */
export const structuredPatterns: StepPattern[] = [
  // Action patterns
  {
    name: 'structured-action-click',
    regex: /^\*\*Action\*\*:\s*[Cc]lick\s+(?:the\s+)?['"]?(.+?)['"]?\s*(?:button|link)?$/i,
    primitiveType: 'click',
    extract: (match) => {
      const target = match[1];
      const locatorInfo = parseSelectorToLocator(target + ' button');
      return {
        type: 'click',
        locator: locatorInfo.name
          ? createLocatorFromMatch(locatorInfo.strategy, locatorInfo.value, locatorInfo.name)
          : { strategy: locatorInfo.strategy, value: locatorInfo.value },
      };
    },
  },
  {
    name: 'structured-action-fill',
    regex: /^\*\*Action\*\*:\s*[Ff]ill\s+(?:in\s+)?['"]?(.+?)['"]?\s+with\s+['"]?(.+?)['"]?$/i,
    primitiveType: 'fill',
    extract: (match) => {
      const target = match[1];
      const value = match[2];
      const locatorInfo = parseSelectorToLocator(target);
      return {
        type: 'fill',
        locator: locatorInfo.name
          ? createLocatorFromMatch(locatorInfo.strategy, locatorInfo.value, locatorInfo.name)
          : { strategy: locatorInfo.strategy, value: locatorInfo.value },
        value: createValueFromText(value),
      };
    },
  },
  {
    name: 'structured-action-navigate',
    regex: /^\*\*Action\*\*:\s*[Nn]avigate\s+to\s+['"]?(.+?)['"]?$/i,
    primitiveType: 'goto',
    extract: (match) => ({
      type: 'goto',
      url: match[1],
      waitForLoad: true,
    }),
  },

  // Wait patterns
  {
    name: 'structured-wait-for-visible',
    regex: /^\*\*Wait for\*\*:\s*(.+?)\s+(?:to\s+)?(?:be\s+)?(?:visible|appear|load)/i,
    primitiveType: 'expectVisible',
    extract: (match) => {
      const target = match[1];
      const locatorInfo = parseSelectorToLocator(target);
      return {
        type: 'expectVisible',
        locator: locatorInfo.name
          ? createLocatorFromMatch(locatorInfo.strategy, locatorInfo.value, locatorInfo.name)
          : { strategy: locatorInfo.strategy, value: locatorInfo.value },
      };
    },
  },

  // Assert patterns
  {
    name: 'structured-assert-visible',
    regex: /^\*\*Assert\*\*:\s*(.+?)\s+(?:is\s+)?visible$/i,
    primitiveType: 'expectVisible',
    extract: (match) => {
      const target = match[1];
      const locatorInfo = parseSelectorToLocator(target);
      return {
        type: 'expectVisible',
        locator: locatorInfo.name
          ? createLocatorFromMatch(locatorInfo.strategy, locatorInfo.value, locatorInfo.name)
          : { strategy: locatorInfo.strategy, value: locatorInfo.value },
      };
    },
  },
  {
    name: 'structured-assert-text',
    regex: /^\*\*Assert\*\*:\s*(.+?)\s+(?:contains|has text)\s+['"]?(.+?)['"]?$/i,
    primitiveType: 'expectText',
    extract: (match) => {
      const target = match[1];
      const text = match[2];
      const locatorInfo = parseSelectorToLocator(target);
      return {
        type: 'expectText',
        locator: locatorInfo.name
          ? createLocatorFromMatch(locatorInfo.strategy, locatorInfo.value, locatorInfo.name)
          : { strategy: locatorInfo.strategy, value: locatorInfo.value },
        text,
      };
    },
  },
];

/**
 * All patterns in priority order (more specific patterns first)
 * Structured patterns come first to prioritize the Journey markdown format
 */
export const allPatterns: StepPattern[] = [
  ...structuredPatterns,
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
export function matchPattern(text: string): IRPrimitive | null {
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
export function getPatternMatches(text: string): Array<{ pattern: string; match: IRPrimitive }> {
  const trimmedText = text.trim();
  const matches: Array<{ pattern: string; match: IRPrimitive }> = [];

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
