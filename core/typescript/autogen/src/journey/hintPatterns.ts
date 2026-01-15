/**
 * Machine Hint Syntax Patterns - Define regex patterns for parsing hints
 * @see T071 - Define machine hint syntax regex patterns
 */

/**
 * Machine hint types
 */
export type HintType =
  | 'role'       // ARIA role hint: (role=button)
  | 'testid'     // Test ID hint: (testid=submit-btn)
  | 'label'      // Label hint: (label="Email Address")
  | 'text'       // Text hint: (text="Submit")
  | 'exact'      // Exact matching: (exact=true)
  | 'level'      // Heading level: (level=2)
  | 'signal'     // Signal hint: (signal=loading-done)
  | 'module'     // Module method hint: (module=auth.login)
  | 'wait'       // Wait strategy: (wait=networkidle)
  | 'timeout';   // Timeout hint: (timeout=5000)

/**
 * Parsed machine hint
 */
export interface MachineHint {
  /** Hint type */
  type: HintType;
  /** Hint value */
  value: string;
  /** Raw hint string */
  raw: string;
}

/**
 * Pattern for detecting hint blocks: (key=value) or (key="value with spaces")
 */
export const HINT_BLOCK_PATTERN = /\(([a-z]+)=(?:"([^"]+)"|'([^']+)'|([^,)\s]+))\)/gi;

/**
 * Pattern for a complete hints section: (...hints...)
 */
export const HINTS_SECTION_PATTERN = /\((?:[a-z]+=(?:"[^"]+"|'[^']+'|[^,)\s]+)(?:,\s*)?)+\)/gi;

/**
 * Individual hint patterns for validation
 */
export const HINT_PATTERNS: Record<HintType, RegExp> = {
  role: /role=(?:"([^"]+)"|'([^']+)'|([a-z]+))/i,
  testid: /testid=(?:"([^"]+)"|'([^']+)'|([a-z0-9_-]+))/i,
  label: /label=(?:"([^"]+)"|'([^']+)')/i,
  text: /text=(?:"([^"]+)"|'([^']+)')/i,
  exact: /exact=(true|false)/i,
  level: /level=([1-6])/i,
  signal: /signal=(?:"([^"]+)"|'([^']+)'|([a-z0-9_-]+))/i,
  module: /module=(?:"([^"]+)"|'([^']+)'|([a-z0-9_.]+))/i,
  wait: /wait=(networkidle|domcontentloaded|load|commit)/i,
  timeout: /timeout=(\d+)/i,
};

/**
 * Valid ARIA roles for validation
 */
export const VALID_ROLES = [
  'alert',
  'alertdialog',
  'application',
  'article',
  'banner',
  'button',
  'cell',
  'checkbox',
  'columnheader',
  'combobox',
  'complementary',
  'contentinfo',
  'definition',
  'dialog',
  'directory',
  'document',
  'feed',
  'figure',
  'form',
  'grid',
  'gridcell',
  'group',
  'heading',
  'img',
  'link',
  'list',
  'listbox',
  'listitem',
  'log',
  'main',
  'marquee',
  'math',
  'menu',
  'menubar',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'navigation',
  'none',
  'note',
  'option',
  'presentation',
  'progressbar',
  'radio',
  'radiogroup',
  'region',
  'row',
  'rowgroup',
  'rowheader',
  'scrollbar',
  'search',
  'searchbox',
  'separator',
  'slider',
  'spinbutton',
  'status',
  'switch',
  'tab',
  'table',
  'tablist',
  'tabpanel',
  'term',
  'textbox',
  'timer',
  'toolbar',
  'tooltip',
  'tree',
  'treegrid',
  'treeitem',
];

/**
 * Check if a role is valid
 */
export function isValidRole(role: string): boolean {
  return VALID_ROLES.includes(role.toLowerCase());
}

/**
 * Extract hint value from a match (handles quoted and unquoted values)
 */
export function extractHintValue(match: RegExpMatchArray): string | null {
  // Try quoted values first, then unquoted
  for (let i = 1; i < match.length; i++) {
    if (match[i] !== undefined) {
      return match[i] ?? null;
    }
  }
  return null;
}

/**
 * Check if text contains machine hints
 */
export function containsHints(text: string): boolean {
  // Reset lastIndex for global regex
  HINTS_SECTION_PATTERN.lastIndex = 0;
  return HINTS_SECTION_PATTERN.test(text);
}

/**
 * Remove hints section from step text
 */
export function removeHints(text: string): string {
  return text.replace(HINTS_SECTION_PATTERN, '').trim();
}
