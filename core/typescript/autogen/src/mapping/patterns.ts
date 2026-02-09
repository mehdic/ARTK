/**
 * Step Mapping Patterns - Regex patterns for parsing step text into IR primitives
 * @see research/2026-01-02_autogen-refined-plan.md Section 10
 * @see research/2026-01-27_autogen-empty-stubs-implementation-plan.md Phase 3
 */
import type { IRPrimitive, LocatorSpec, ValueSpec, LocatorStrategy } from '../ir/types.js';

/**
 * Pattern version - increment when patterns change
 * Format: MAJOR.MINOR.PATCH
 * - MAJOR: Breaking changes to pattern behavior
 * - MINOR: New patterns added
 * - PATCH: Bug fixes to existing patterns
 */
export const PATTERN_VERSION = '1.1.0';

/**
 * Pattern metadata for tracking
 */
export interface PatternMetadata {
  name: string;
  version: string;
  addedDate: string;
  source: 'core' | 'llkb' | 'telemetry';
  category: string;
}

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
  /** Extract IR primitive from match (prefix with _ if unused) */
  extract: (_match: RegExpMatchArray) => IRPrimitive | null;
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
      url: match[1]!,
      waitForLoad: true,
    }),
  },
  {
    name: 'navigate-to-page',
    regex: /^(?:user\s+)?(?:navigates?|go(?:es)?|opens?)\s+(?:to\s+)?(?:the\s+)?(.+?)\s+page$/i,
    primitiveType: 'goto',
    extract: (match) => ({
      type: 'goto',
      url: `/${match[1]!.toLowerCase().replace(/\s+/g, '-')}`,
      waitForLoad: true,
    }),
  },
  {
    name: 'wait-for-url-change',
    // "Wait for URL to change to '/dashboard'" or "Wait until URL contains '/settings'"
    regex: /^(?:user\s+)?waits?\s+(?:for\s+)?(?:the\s+)?url\s+(?:to\s+)?(?:change\s+to|contain|include)\s+["']?([^"']+)["']?$/i,
    primitiveType: 'waitForURL',
    extract: (match) => ({
      type: 'waitForURL',
      pattern: match[1]!,
    }),
  },
];

/**
 * Click patterns
 */
export const clickPatterns: StepPattern[] = [
  {
    name: 'click-button-quoted',
    regex: /^(?:user\s+)?(?:clicks?|presses?|taps?|selects?)\s+(?:on\s+)?(?:the\s+)?["']([^"']+)["']\s+button$/i,
    primitiveType: 'click',
    extract: (match) => ({
      type: 'click',
      locator: createLocatorFromMatch('role', 'button', match[1]!),
    }),
  },
  {
    name: 'click-link-quoted',
    regex: /^(?:user\s+)?(?:clicks?|presses?|taps?|selects?)\s+(?:on\s+)?(?:the\s+)?["']([^"']+)["']\s+link$/i,
    primitiveType: 'click',
    extract: (match) => ({
      type: 'click',
      locator: createLocatorFromMatch('role', 'link', match[1]!),
    }),
  },
  {
    name: 'click-menuitem-quoted',
    // "Click the 'Settings' menu item" or "Click on 'Edit' menuitem"
    regex: /^(?:user\s+)?(?:clicks?|selects?)\s+(?:on\s+)?(?:the\s+)?["']([^"']+)["']\s+menu\s*item$/i,
    primitiveType: 'click',
    extract: (match) => ({
      type: 'click',
      locator: createLocatorFromMatch('role', 'menuitem', match[1]!),
    }),
  },
  {
    name: 'click-tab-quoted',
    // "Click the 'Details' tab" or "Select the 'Overview' tab"
    regex: /^(?:user\s+)?(?:clicks?|selects?)\s+(?:on\s+)?(?:the\s+)?["']([^"']+)["']\s+tab$/i,
    primitiveType: 'click',
    extract: (match) => ({
      type: 'click',
      locator: createLocatorFromMatch('role', 'tab', match[1]!),
    }),
  },
  {
    name: 'click-element-quoted',
    regex: /^(?:user\s+)?(?:clicks?|presses?|taps?|selects?)\s+(?:on\s+)?(?:the\s+)?["']([^"']+)["']$/i,
    primitiveType: 'click',
    extract: (match) => ({
      type: 'click',
      locator: createLocatorFromMatch('text', match[1]!),
    }),
  },
  {
    name: 'click-element-generic',
    regex: /^(?:user\s+)?(?:clicks?|presses?|taps?|selects?)\s+(?:on\s+)?(?:the\s+)?(.+?)\s+(?:button|link|icon|menu|tab)$/i,
    primitiveType: 'click',
    extract: (match) => ({
      type: 'click',
      locator: createLocatorFromMatch('text', match[1]!),
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
      locator: createLocatorFromMatch('label', match[2]!),
      value: createValueFromText(match[1]!),
    }),
  },
  {
    name: 'fill-field-actor-value',
    regex: /^(?:user\s+)?(?:enters?|types?|fills?\s+in?|inputs?)\s+(\{\{[^}]+\}\})\s+(?:in|into)\s+(?:the\s+)?["']([^"']+)["']\s*(?:field|input)?$/i,
    primitiveType: 'fill',
    extract: (match) => ({
      type: 'fill',
      locator: createLocatorFromMatch('label', match[2]!),
      value: createValueFromText(match[1]!),
    }),
  },
  {
    name: 'fill-placeholder-field',
    // "Fill 'test@example.com' in the field with placeholder 'Enter email'"
    // or "Type 'value' into input with placeholder 'Search'"
    regex: /^(?:user\s+)?(?:enters?|types?|fills?)\s+["']([^"']+)["']\s+(?:in|into)\s+(?:the\s+)?(?:field|input)\s+with\s+placeholder\s+["']([^"']+)["']$/i,
    primitiveType: 'fill',
    extract: (match) => ({
      type: 'fill',
      locator: createLocatorFromMatch('placeholder', match[2]!),
      value: createValueFromText(match[1]!),
    }),
  },
  {
    name: 'fill-field-generic',
    regex: /^(?:user\s+)?(?:enters?|types?|fills?\s+in?|inputs?)\s+(.+?)\s+(?:in|into)\s+(?:the\s+)?(.+?)\s*(?:field|input)?$/i,
    primitiveType: 'fill',
    extract: (match) => ({
      type: 'fill',
      locator: createLocatorFromMatch('label', match[2]!.replace(/["']/g, '')),
      value: createValueFromText(match[1]!.replace(/["']/g, '')),
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
      locator: createLocatorFromMatch('label', match[2]!),
      option: match[1]!,
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
      locator: createLocatorFromMatch('label', match[1]!),
    }),
  },
  {
    // "Check the terms checkbox" - unquoted checkbox name
    name: 'check-checkbox-unquoted',
    regex: /^(?:user\s+)?(?:checks?|enables?|ticks?)\s+(?:the\s+)?(\w+(?:\s+\w+)*)\s+checkbox$/i,
    primitiveType: 'check',
    extract: (match) => ({
      type: 'check',
      locator: createLocatorFromMatch('label', match[1]!),
    }),
  },
  {
    name: 'uncheck-checkbox',
    regex: /^(?:user\s+)?(?:unchecks?|disables?|unticks?)\s+(?:the\s+)?["']([^"']+)["']\s*(?:checkbox|option)?$/i,
    primitiveType: 'uncheck',
    extract: (match) => ({
      type: 'uncheck',
      locator: createLocatorFromMatch('label', match[1]!),
    }),
  },
  {
    // "Uncheck the newsletter checkbox" - unquoted checkbox name
    name: 'uncheck-checkbox-unquoted',
    regex: /^(?:user\s+)?(?:unchecks?|disables?|unticks?)\s+(?:the\s+)?(\w+(?:\s+\w+)*)\s+checkbox$/i,
    primitiveType: 'uncheck',
    extract: (match) => ({
      type: 'uncheck',
      locator: createLocatorFromMatch('label', match[1]!),
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
      locator: createLocatorFromMatch('text', match[1]!),
    }),
  },
  {
    name: 'is-visible',
    regex: /^["']?([^"']+)["']?\s+(?:is\s+)?(?:visible|displayed|shown)$/i,
    primitiveType: 'expectVisible',
    extract: (match) => ({
      type: 'expectVisible',
      locator: createLocatorFromMatch('text', match[1]!),
    }),
  },
  {
    name: 'should-see-element',
    regex: /^(?:user\s+)?(?:should\s+)?(?:sees?|views?)\s+(?:the\s+)?(.+?)\s+(?:heading|button|link|form|page|element)$/i,
    primitiveType: 'expectVisible',
    extract: (match) => ({
      type: 'expectVisible',
      locator: createLocatorFromMatch('text', match[1]!),
    }),
  },
  {
    name: 'page-displayed',
    regex: /^(?:the\s+)?(.+?)\s+(?:page|screen|view)\s+(?:is\s+)?(?:displayed|shown|visible)$/i,
    primitiveType: 'expectVisible',
    extract: (match) => ({
      type: 'expectVisible',
      locator: createLocatorFromMatch('text', match[1]!),
    }),
  },
];

/**
 * Toast/notification patterns
 */
export const toastPatterns: StepPattern[] = [
  {
    name: 'success-toast-message',
    // "A success toast with 'Account created' appears" (pre-verb, quoted)
    regex: /^(?:a\s+)?success\s+toast\s+(?:with\s+)?["']([^"']+)["']\s*(?:message\s+)?(?:appears?|is\s+shown|displays?)$/i,
    primitiveType: 'expectToast',
    extract: (match) => ({
      type: 'expectToast',
      toastType: 'success',
      message: match[1]!,
    }),
  },
  {
    name: 'success-toast-appears-with',
    // "A success toast appears with Account created" (post-verb, unquoted)
    regex: /^(?:a\s+)?success\s+toast\s+(?:appears?|is\s+shown|displays?)\s+(?:with\s+)?(?:(?:message|text)\s+)?["']?(.+?)["']?$/i,
    primitiveType: 'expectToast',
    extract: (match) => ({
      type: 'expectToast',
      toastType: 'success',
      message: match[1]!,
    }),
  },
  {
    name: 'error-toast-message',
    // "An error toast with 'Invalid email' appears" (pre-verb, quoted)
    regex: /^(?:an?\s+)?error\s+toast\s+(?:with\s+)?["']([^"']+)["']\s*(?:message\s+)?(?:appears?|is\s+shown|displays?)$/i,
    primitiveType: 'expectToast',
    extract: (match) => ({
      type: 'expectToast',
      toastType: 'error',
      message: match[1]!,
    }),
  },
  {
    name: 'error-toast-appears-with',
    // "An error toast appears with Invalid email" (post-verb, unquoted)
    regex: /^(?:an?\s+)?error\s+toast\s+(?:appears?|is\s+shown|displays?)\s+(?:with\s+)?(?:(?:message|text)\s+)?["']?(.+?)["']?$/i,
    primitiveType: 'expectToast',
    extract: (match) => ({
      type: 'expectToast',
      toastType: 'error',
      message: match[1]!,
    }),
  },
  {
    name: 'toast-appears',
    // "A success toast appears" or "A toast notification appears"
    regex: /^(?:a\s+)?(?:(success|error|info|warning)\s+)?toast\s+(?:notification\s+)?(?:appears?|is\s+shown|displays?)$/i,
    primitiveType: 'expectToast',
    extract: (match) => ({
      type: 'expectToast',
      toastType: (match[1]?.toLowerCase() ?? 'info') as 'success' | 'error' | 'info' | 'warning',
    }),
  },
  {
    name: 'toast-with-text',
    // "Toast with text 'Hello' appears" (quoted) or "Toast with text Hello appears" (unquoted)
    regex: /^(?:a\s+)?(?:toast|notification)\s+(?:with\s+)?(?:(?:text|message)\s+)?["']?(.+?)["']?\s+(?:appears?|is\s+shown|displays?)$/i,
    primitiveType: 'expectToast',
    extract: (match) => ({
      type: 'expectToast',
      toastType: 'info',
      message: match[1]!,
    }),
  },
  {
    name: 'status-message-visible',
    // "A status message 'Processing...' is visible" or "The status shows 'Loading'"
    regex: /^(?:a\s+)?status\s+(?:message\s+)?["']([^"']+)["']\s+(?:is\s+)?(?:visible|shown|displayed)$/i,
    primitiveType: 'expectVisible',
    extract: (match) => ({
      type: 'expectVisible',
      locator: createLocatorFromMatch('role', 'status', match[1]!),
    }),
  },
  {
    name: 'verify-status-message',
    // "Verify the status message shows 'Complete'"
    regex: /^(?:verify|check)\s+(?:that\s+)?(?:the\s+)?status\s+(?:message\s+)?(?:shows?|displays?|contains?)\s+["']([^"']+)["']$/i,
    primitiveType: 'expectVisible',
    extract: (match) => ({
      type: 'expectVisible',
      locator: createLocatorFromMatch('role', 'status', match[1]!),
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
      pattern: match[1]!,
    }),
  },
  {
    name: 'url-is',
    regex: /^(?:the\s+)?url\s+(?:should\s+)?(?:is|equals?|be)\s+["']?([^"'\s]+)["']?$/i,
    primitiveType: 'expectURL',
    extract: (match) => ({
      type: 'expectURL',
      pattern: match[1]!,
    }),
  },
  {
    name: 'redirected-to',
    regex: /^(?:user\s+)?(?:is\s+)?redirected\s+to\s+["']?([^"'\s]+)["']?$/i,
    primitiveType: 'expectURL',
    extract: (match) => ({
      type: 'expectURL',
      pattern: match[1]!,
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
    extract: (_match) => ({
      type: 'callModule',
      module: 'auth',
      method: 'login',
    }),
  },
  {
    name: 'user-logout',
    regex: /^(?:user\s+)?(?:logs?\s*out|logout\s+is\s+performed|signs?\s*out)$/i,
    primitiveType: 'callModule',
    extract: (_match) => ({
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
      args: [match[1]!.toLowerCase()],
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
      pattern: match[1]!,
    }),
  },
  {
    name: 'wait-for-page',
    regex: /^(?:user\s+)?(?:waits?\s+)?(?:for\s+)?(?:the\s+)?(.+?)\s+(?:page|screen)\s+to\s+load$/i,
    primitiveType: 'waitForLoadingComplete',
    extract: (_match) => ({
      type: 'waitForLoadingComplete',
    }),
  },
];

/**
 * Helper function to convert natural language selectors to Playwright locator strategies
 */
export function parseSelectorToLocator(selector: string): { strategy: LocatorStrategy; value: string; name?: string } {
  // Remove leading "the" if present
  const cleanSelector = selector.replace(/^the\s+/i, '').trim();

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
      const target = match[1]!;
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
      const target = match[1]!;
      const value = match[2]!;
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
      url: match[1]!,
      waitForLoad: true,
    }),
  },

  // Wait patterns
  {
    name: 'structured-wait-for-visible',
    regex: /^\*\*Wait for\*\*:\s*(.+?)\s+(?:to\s+)?(?:be\s+)?(?:visible|appear|load)/i,
    primitiveType: 'expectVisible',
    extract: (match) => {
      const target = match[1]!;
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
      const target = match[1]!;
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
      const target = match[1]!;
      const text = match[2]!;
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
 * Extended click patterns - Common variations missed by core patterns
 * Added in v1.1.0 based on telemetry analysis
 * @see research/2026-01-27_autogen-empty-stubs-implementation-plan.md Phase 3
 */
export const extendedClickPatterns: StepPattern[] = [
  {
    name: 'click-on-element',
    // "Click on Submit" or "Click on the Submit button" or "Select on the item"
    regex: /^(?:user\s+)?(?:clicks?|selects?)\s+on\s+(?:the\s+)?(.+?)(?:\s+button|\s+link)?$/i,
    primitiveType: 'click',
    extract: (match) => ({
      type: 'click',
      locator: createLocatorFromMatch('text', match[1]!.replace(/["']/g, '')),
    }),
  },
  {
    name: 'press-enter-key',
    // "Press Enter" or "Press the Enter key" or "Hit Enter"
    regex: /^(?:user\s+)?(?:press(?:es)?|hits?)\s+(?:the\s+)?(?:enter|return)(?:\s+key)?$/i,
    primitiveType: 'press',
    extract: () => ({
      type: 'press',
      key: 'Enter',
    }),
  },
  {
    name: 'press-tab-key',
    // "Press Tab" or "Press the Tab key"
    regex: /^(?:user\s+)?(?:press(?:es)?|hits?)\s+(?:the\s+)?tab(?:\s+key)?$/i,
    primitiveType: 'press',
    extract: () => ({
      type: 'press',
      key: 'Tab',
    }),
  },
  {
    name: 'press-escape-key',
    // "Press Escape" or "Press Esc"
    regex: /^(?:user\s+)?(?:press(?:es)?|hits?)\s+(?:the\s+)?(?:escape|esc)(?:\s+key)?$/i,
    primitiveType: 'press',
    extract: () => ({
      type: 'press',
      key: 'Escape',
    }),
  },
  {
    name: 'double-click',
    // "Double click on" or "Double-click the"
    regex: /^(?:user\s+)?double[-\s]?clicks?\s+(?:on\s+)?(?:the\s+)?["']?(.+?)["']?$/i,
    primitiveType: 'dblclick',
    extract: (match) => ({
      type: 'dblclick',
      locator: createLocatorFromMatch('text', match[1]!.replace(/["']/g, '')),
    }),
  },
  {
    name: 'right-click',
    // "Right click on" or "Right-click the"
    regex: /^(?:user\s+)?right[-\s]?clicks?\s+(?:on\s+)?(?:the\s+)?["']?(.+?)["']?$/i,
    primitiveType: 'rightClick',
    extract: (match) => ({
      type: 'rightClick',
      locator: createLocatorFromMatch('text', match[1]!.replace(/["']/g, '')),
    }),
  },
  {
    name: 'submit-form',
    // "Submit the form" or "Submits form"
    regex: /^(?:user\s+)?submits?\s+(?:the\s+)?form$/i,
    primitiveType: 'click',
    extract: () => ({
      type: 'click',
      locator: createLocatorFromMatch('role', 'button', 'Submit'),
    }),
  },
];

/**
 * Extended fill patterns - Common variations missed by core patterns
 * Added in v1.1.0 based on telemetry analysis
 */
export const extendedFillPatterns: StepPattern[] = [
  {
    name: 'fill-field-with-value',
    // "Fill the username field with john" or "Fill the 'description' field with 'the value'"
    regex: /^(?:user\s+)?(?:fills?|enters?|types?|inputs?)(?:\s+in)?\s+(?:the\s+)?["']?(.+?)["']?\s+(?:field|input)\s+with\s+["']?(.+?)["']?$/i,
    primitiveType: 'fill',
    extract: (match) => ({
      type: 'fill',
      locator: createLocatorFromMatch('label', match[1]!.replace(/["']/g, '')),
      value: createValueFromText(match[2]!.replace(/["']/g, '')),
    }),
  },
  {
    name: 'type-into-field',
    // "Type 'password' into the Password field"
    regex: /^(?:user\s+)?types?\s+['"](.+?)['"]\s+into\s+(?:the\s+)?["']?(.+?)["']?\s*(?:field|input)?$/i,
    primitiveType: 'fill',
    extract: (match) => ({
      type: 'fill',
      locator: createLocatorFromMatch('label', match[2]!),
      value: createValueFromText(match[1]!),
    }),
  },
  {
    name: 'fill-in-field-no-value',
    // "Fill in the email address" (without explicit value - uses actor data)
    regex: /^(?:user\s+)?fills?\s+in\s+(?:the\s+)?["']?(.+?)["']?\s*(?:field|input)?$/i,
    primitiveType: 'fill',
    extract: (match) => {
      const fieldName = match[1]!.replace(/["']/g, '');
      return {
        type: 'fill',
        locator: createLocatorFromMatch('label', fieldName),
        value: { type: 'actor', value: fieldName.toLowerCase().replace(/\s+/g, '_') },
      };
    },
  },
  {
    name: 'clear-field',
    // "Clear the email field" or "Clears the input"
    regex: /^(?:user\s+)?clears?\s+(?:the\s+)?["']?(.+?)["']?\s*(?:field|input)?$/i,
    primitiveType: 'clear',
    extract: (match) => ({
      type: 'clear',
      locator: createLocatorFromMatch('label', match[1]!.replace(/["']/g, '')),
    }),
  },
  {
    name: 'set-value',
    // "Set the value to 'test'" or "Sets field to 'value'"
    regex: /^(?:user\s+)?sets?\s+(?:the\s+)?(?:value\s+)?(?:of\s+)?["']?(.+?)["']?\s+to\s+['"](.+?)['"]$/i,
    primitiveType: 'fill',
    extract: (match) => ({
      type: 'fill',
      locator: createLocatorFromMatch('label', match[1]!),
      value: createValueFromText(match[2]!),
    }),
  },
];

/**
 * Extended assertion patterns - Common variations missed by core patterns
 * Added in v1.1.0 based on telemetry analysis
 *
 * IMPORTANT: Patterns are ordered by SPECIFICITY (most specific first)
 * - "is not visible" patterns must come before generic "is visible" patterns
 * - "URL contains" patterns must come before generic "contains" patterns
 * - Specific state assertions (enabled, disabled, checked) before generic visibility
 */
export const extendedAssertionPatterns: StepPattern[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // MOST SPECIFIC: Negative assertions (must come before positive counterparts)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: 'verify-not-visible',
    // "Verify the error container is not visible"
    regex: /^(?:verify|confirm|check)\s+(?:that\s+)?(?:the\s+)?["']?(.+?)["']?\s+is\s+not\s+visible$/i,
    primitiveType: 'expectHidden',
    extract: (match) => ({
      type: 'expectHidden',
      locator: createLocatorFromMatch('text', match[1]!),
    }),
  },
  {
    name: 'element-should-not-be-visible',
    // "The error should not be visible" or "Error message is not displayed"
    regex: /^(?:the\s+)?["']?(.+?)["']?\s+(?:should\s+)?(?:not\s+be|is\s+not)\s+(?:visible|displayed|shown)$/i,
    primitiveType: 'expectHidden',
    extract: (match) => ({
      type: 'expectHidden',
      locator: createLocatorFromMatch('text', match[1]!),
    }),
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // URL AND TITLE: Specific patterns that match "URL" or "title" keywords
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: 'verify-url-contains',
    // "Verify the URL contains '/dashboard'"
    regex: /^(?:verify|confirm|check)\s+(?:that\s+)?(?:the\s+)?url\s+contains?\s+["']([^"']+)["']$/i,
    primitiveType: 'expectURL',
    extract: (match) => ({
      type: 'expectURL',
      pattern: match[1]!,
    }),
  },
  {
    name: 'verify-title-is',
    // "Verify the page title is 'Settings'"
    regex: /^(?:verify|confirm|check)\s+(?:that\s+)?(?:the\s+)?(?:page\s+)?title\s+(?:is|equals?)\s+["']([^"']+)["']$/i,
    primitiveType: 'expectTitle',
    extract: (match) => ({
      type: 'expectTitle',
      title: match[1]!,
    }),
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SPECIFIC STATE ASSERTIONS: enabled, disabled, checked, value, count
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: 'verify-field-value',
    // "Verify the username field has value 'testuser'"
    regex: /^(?:verify|confirm|check)\s+(?:that\s+)?(?:the\s+)?["']?(\w+)["']?\s+(?:field\s+)?has\s+value\s+["']([^"']+)["']$/i,
    primitiveType: 'expectValue',
    extract: (match) => ({
      type: 'expectValue',
      locator: createLocatorFromMatch('label', match[1]!),
      value: match[2]!,
    }),
  },
  {
    name: 'verify-element-enabled',
    // "Verify the submit button is enabled"
    regex: /^(?:verify|confirm|check)\s+(?:that\s+)?(?:the\s+)?["']?(.+?)["']?\s+(?:button\s+)?is\s+enabled$/i,
    primitiveType: 'expectEnabled',
    extract: (match) => ({
      type: 'expectEnabled',
      locator: createLocatorFromMatch('label', match[1]!),
    }),
  },
  {
    name: 'verify-element-disabled',
    // "Verify the disabled input is disabled"
    regex: /^(?:verify|confirm|check)\s+(?:that\s+)?(?:the\s+)?["']?(.+?)["']?\s+(?:input\s+)?is\s+disabled$/i,
    primitiveType: 'expectDisabled',
    extract: (match) => ({
      type: 'expectDisabled',
      locator: createLocatorFromMatch('label', match[1]!),
    }),
  },
  {
    name: 'verify-checkbox-checked',
    // "Verify the checkbox is checked"
    regex: /^(?:verify|confirm|check)\s+(?:that\s+)?(?:the\s+)?["']?(.+?)["']?\s+(?:checkbox\s+)?is\s+checked$/i,
    primitiveType: 'expectChecked',
    extract: (match) => ({
      type: 'expectChecked',
      locator: createLocatorFromMatch('label', match[1]!),
    }),
  },
  {
    name: 'verify-count',
    // "Verify 5 items are shown" or "Verify 3 elements exist"
    regex: /^(?:verify|confirm|check)\s+(?:that\s+)?(\d+)\s+(?:items?|elements?|rows?)\s+(?:are\s+)?(?:shown|displayed|exist|visible)$/i,
    primitiveType: 'expectCount',
    extract: (match) => ({
      type: 'expectCount',
      locator: { strategy: 'text', value: 'item' },
      count: parseInt(match[1]!, 10),
    }),
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERIC VISIBILITY: Catch-all patterns for "is visible/displayed/showing"
  // These must come AFTER specific patterns to avoid over-matching
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: 'verify-element-showing',
    // "Verify the dashboard is showing/displayed"
    regex: /^(?:verify|confirm|ensure)\s+(?:that\s+)?(?:the\s+)?["']?(.+?)["']?\s+(?:is\s+)?(?:showing|displayed|visible)$/i,
    primitiveType: 'expectVisible',
    extract: (match) => ({
      type: 'expectVisible',
      locator: createLocatorFromMatch('text', match[1]!),
    }),
  },
  {
    name: 'page-should-show',
    // "The page should show 'Welcome'" or "Page should display 'text'"
    regex: /^(?:the\s+)?page\s+should\s+(?:show|display|contain)\s+['"](.+?)['"]$/i,
    primitiveType: 'expectText',
    extract: (match) => ({
      type: 'expectText',
      locator: { strategy: 'role', value: 'main' },
      text: match[1]!,
    }),
  },
  {
    name: 'make-sure-assertion',
    // "Make sure the button is visible" or "Make sure user sees 'text'"
    regex: /^make\s+sure\s+(?:that\s+)?(?:the\s+)?(.+?)\s+(?:is\s+)?(?:visible|displayed|shown)$/i,
    primitiveType: 'expectVisible',
    extract: (match) => ({
      type: 'expectVisible',
      locator: createLocatorFromMatch('text', match[1]!),
    }),
  },
  {
    name: 'confirm-that-assertion',
    // "Confirm that the message appears", "Verify success message appears", or "Confirm the error is shown"
    regex: /^(?:verify|confirm)\s+(?:that\s+)?(?:the\s+)?["']?(.+?)["']?\s+(?:appears?|is\s+shown|displays?)$/i,
    primitiveType: 'expectVisible',
    extract: (match) => ({
      type: 'expectVisible',
      locator: createLocatorFromMatch('text', match[1]!),
    }),
  },
  {
    name: 'check-element-exists',
    // "Check that the element exists" or "Check the button is present"
    regex: /^check\s+(?:that\s+)?(?:the\s+)?["']?(.+?)["']?\s+(?:exists?|is\s+present)$/i,
    primitiveType: 'expectVisible',
    extract: (match) => ({
      type: 'expectVisible',
      locator: createLocatorFromMatch('text', match[1]!),
    }),
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERIC TEXT ASSERTIONS: "contains" patterns (must be last to avoid conflicts)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: 'element-contains-text',
    // "The header contains 'Welcome'" or "Element should contain 'text'"
    regex: /^(?:the\s+)?["']?(.+?)["']?\s+(?:should\s+)?contains?\s+['"](.+?)['"]$/i,
    primitiveType: 'expectText',
    extract: (match) => ({
      type: 'expectText',
      locator: createLocatorFromMatch('text', match[1]!),
      text: match[2]!,
    }),
  },
];

/**
 * Extended wait patterns - Common variations missed by core patterns
 * Added in v1.1.0 based on telemetry analysis
 */
export const extendedWaitPatterns: StepPattern[] = [
  {
    name: 'wait-for-element-visible',
    // "Wait for the loading spinner to disappear"
    regex: /^(?:user\s+)?waits?\s+(?:for\s+)?(?:the\s+)?["']?(.+?)["']?\s+to\s+(?:disappear|be\s+hidden)$/i,
    primitiveType: 'waitForHidden',
    extract: (match) => ({
      type: 'waitForHidden',
      locator: createLocatorFromMatch('text', match[1]!),
    }),
  },
  {
    name: 'wait-for-element-appear',
    // "Wait for the modal to appear" or "Wait for dialog to show"
    regex: /^(?:user\s+)?waits?\s+(?:for\s+)?(?:the\s+)?["']?(.+?)["']?\s+to\s+(?:appear|show|be\s+visible)$/i,
    primitiveType: 'waitForVisible',
    extract: (match) => ({
      type: 'waitForVisible',
      locator: createLocatorFromMatch('text', match[1]!),
    }),
  },
  {
    name: 'wait-until-loaded',
    // "Wait until the page is loaded" or "Wait until content loads"
    regex: /^(?:user\s+)?waits?\s+until\s+(?:the\s+)?(?:page|content|data)\s+(?:is\s+)?loaded$/i,
    primitiveType: 'waitForLoadingComplete',
    extract: () => ({
      type: 'waitForLoadingComplete',
    }),
  },
  {
    name: 'wait-seconds',
    // "Wait for 2 seconds" or "Wait 3 seconds"
    regex: /^(?:user\s+)?waits?\s+(?:for\s+)?(\d+)\s+seconds?$/i,
    primitiveType: 'waitForTimeout',
    extract: (match) => ({
      type: 'waitForTimeout',
      ms: parseInt(match[1]!, 10) * 1000,
    }),
  },
  {
    name: 'wait-for-network',
    // "Wait for network to be idle" or "Wait for network idle"
    regex: /^(?:user\s+)?waits?\s+(?:for\s+)?(?:the\s+)?network\s+(?:to\s+be\s+)?idle$/i,
    primitiveType: 'waitForNetworkIdle',
    extract: () => ({
      type: 'waitForNetworkIdle',
    }),
  },
];

/**
 * Extended navigation patterns - Common variations missed by core patterns
 * Added in v1.1.0 based on telemetry analysis
 */
export const extendedNavigationPatterns: StepPattern[] = [
  {
    name: 'refresh-page',
    // "Refresh the page" or "Reload the page"
    regex: /^(?:user\s+)?(?:refresh(?:es)?|reloads?)\s+(?:the\s+)?page$/i,
    primitiveType: 'reload',
    extract: () => ({
      type: 'reload',
    }),
  },
  {
    name: 'go-back',
    // "Go back" or "Navigate back" or "User goes back"
    regex: /^(?:user\s+)?(?:go(?:es)?|navigates?)\s+back$/i,
    primitiveType: 'goBack',
    extract: () => ({
      type: 'goBack',
    }),
  },
  {
    name: 'go-forward',
    // "Go forward" or "Navigate forward"
    regex: /^(?:user\s+)?(?:go(?:es)?|navigates?)\s+forward$/i,
    primitiveType: 'goForward',
    extract: () => ({
      type: 'goForward',
    }),
  },
];

/**
 * Extended select/dropdown patterns
 * Added in v1.1.0 based on telemetry analysis
 */
export const extendedSelectPatterns: StepPattern[] = [
  {
    name: 'select-from-named-dropdown',
    // "Select 'USA' from the country dropdown" or "Select 'Large' from the size selector"
    regex: /^(?:user\s+)?(?:selects?|chooses?)\s+["'](.+?)["']\s+from\s+(?:the\s+)?(.+?)\s*(?:dropdown|select|selector|menu|list)$/i,
    primitiveType: 'select',
    extract: (match) => ({
      type: 'select',
      locator: createLocatorFromMatch('label', match[2]!.trim()),
      option: match[1]!,
    }),
  },
  {
    name: 'select-from-dropdown',
    // "Select 'Option' from dropdown" or "Choose 'Value' from the dropdown"
    regex: /^(?:user\s+)?(?:selects?|chooses?)\s+['"](.+?)['"]\s+from\s+(?:the\s+)?dropdown$/i,
    primitiveType: 'select',
    extract: (match) => ({
      type: 'select',
      locator: { strategy: 'role', value: 'combobox' },
      option: match[1]!,
    }),
  },
  {
    name: 'select-option-named',
    // "Select option 'Value'" or "Select option named 'Premium'" or "Choose the 'Option' option"
    regex: /^(?:user\s+)?(?:selects?|chooses?)\s+(?:the\s+)?(?:option\s+)?(?:named\s+)?["'](.+?)["'](?:\s+option)?$/i,
    primitiveType: 'select',
    extract: (match) => ({
      type: 'select',
      locator: { strategy: 'role', value: 'combobox' },
      option: match[1]!,
    }),
  },
];

/**
 * Hover patterns
 * Added in v1.1.0 based on telemetry analysis
 */
export const hoverPatterns: StepPattern[] = [
  {
    name: 'hover-over-element',
    // "Hover over the menu" or "User hovers on button"
    regex: /^(?:user\s+)?hovers?\s+(?:over|on)\s+(?:the\s+)?["']?(.+?)["']?$/i,
    primitiveType: 'hover',
    extract: (match) => ({
      type: 'hover',
      locator: createLocatorFromMatch('text', match[1]!.replace(/["']/g, '')),
    }),
  },
  {
    name: 'mouse-over',
    // "Mouse over the element" or "Mouseover the button"
    regex: /^(?:user\s+)?mouse\s*over\s+(?:the\s+)?["']?(.+?)["']?$/i,
    primitiveType: 'hover',
    extract: (match) => ({
      type: 'hover',
      locator: createLocatorFromMatch('text', match[1]!.replace(/["']/g, '')),
    }),
  },
];

/**
 * Focus patterns
 * Added in v1.1.0 based on telemetry analysis
 */
export const focusPatterns: StepPattern[] = [
  {
    name: 'focus-on-element',
    // "Focus on the input" or "User focuses the field"
    regex: /^(?:user\s+)?focus(?:es)?\s+(?:on\s+)?(?:the\s+)?["']?(.+?)["']?$/i,
    primitiveType: 'focus',
    extract: (match) => ({
      type: 'focus',
      locator: createLocatorFromMatch('label', match[1]!.replace(/["']/g, '')),
    }),
  },
];

/**
 * Modal and Alert patterns
 * Added in v1.1.0 for comprehensive E2E coverage
 */
export const modalAlertPatterns: StepPattern[] = [
  {
    name: 'dismiss-modal',
    // "Dismiss the modal" or "Close the modal dialog"
    regex: /^(?:dismiss|close)\s+(?:the\s+)?(?:modal|dialog)(?:\s+dialog)?$/i,
    primitiveType: 'dismissModal',
    extract: () => ({
      type: 'dismissModal',
    }),
  },
  {
    name: 'accept-alert',
    // "Accept the alert" or "Click OK on alert"
    regex: /^(?:accept|confirm|ok)\s+(?:the\s+)?alert$/i,
    primitiveType: 'acceptAlert',
    extract: () => ({
      type: 'acceptAlert',
    }),
  },
  {
    name: 'dismiss-alert',
    // "Dismiss the alert" or "Cancel the alert"
    regex: /^(?:dismiss|cancel|close)\s+(?:the\s+)?alert$/i,
    primitiveType: 'dismissAlert',
    extract: () => ({
      type: 'dismissAlert',
    }),
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
  ...modalAlertPatterns, // Modal/alert patterns for dialog handling
  // Extended patterns come BEFORE base patterns to match more specific cases first
  ...extendedNavigationPatterns, // Must be before navigationPatterns (e.g., "Go back" vs "Go to")
  ...navigationPatterns,
  ...extendedClickPatterns, // Must be before clickPatterns (e.g., "Click on" vs "Click")
  ...clickPatterns,
  ...extendedFillPatterns,
  ...fillPatterns,
  ...extendedSelectPatterns,
  ...selectPatterns,
  ...checkPatterns,
  ...extendedAssertionPatterns, // Must be before visibilityPatterns (e.g., "not be visible")
  ...visibilityPatterns,
  ...urlPatterns,
  ...extendedWaitPatterns,
  ...waitPatterns,
  ...hoverPatterns,
  ...focusPatterns,
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

/**
 * Get all pattern names for CLI listing
 */
export function getAllPatternNames(): string[] {
  return allPatterns.map((p) => p.name);
}

/**
 * Get pattern count by category
 */
export function getPatternCountByCategory(): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const pattern of allPatterns) {
    const category = pattern.name.split('-')[0] || 'other';
    counts[category] = (counts[category] || 0) + 1;
  }

  return counts;
}

/**
 * Get pattern metadata for a specific pattern
 */
export function getPatternMetadata(patternName: string): PatternMetadata | null {
  const pattern = allPatterns.find((p) => p.name === patternName);
  if (!pattern) return null;

  // Determine version based on pattern name prefix
  const isExtended =
    patternName.includes('extended') ||
    patternName.startsWith('hover') ||
    patternName.startsWith('focus') ||
    patternName.startsWith('press-') ||
    patternName.startsWith('double-') ||
    patternName.startsWith('right-');

  return {
    name: pattern.name,
    version: isExtended ? '1.1.0' : '1.0.0',
    addedDate: isExtended ? '2026-01-27' : '2026-01-02',
    source: 'core',
    category: pattern.name.split('-')[0] || 'other',
  };
}

/**
 * Find patterns that match a given text (for debugging)
 */
export function findMatchingPatterns(text: string): string[] {
  const trimmedText = text.trim();
  const matchingNames: string[] = [];

  for (const pattern of allPatterns) {
    if (pattern.regex.test(trimmedText)) {
      matchingNames.push(pattern.name);
    }
  }

  return matchingNames;
}
