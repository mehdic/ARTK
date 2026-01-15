/**
 * Selector Fix Strategy - Refine CSS selectors to role/label/testid
 * @see T062 - Implement selector refinement fix (CSS → role/label/testid)
 */

/**
 * Selector fix context
 */
export interface SelectorFixContext {
  /** Original code containing the selector */
  code: string;
  /** Line number where selector appears */
  lineNumber: number;
  /** The failing selector expression */
  selector: string;
  /** Error message from Playwright */
  errorMessage: string;
  /** Available ARIA information (if captured) */
  ariaInfo?: ARIANodeInfo;
}

/**
 * ARIA node information for selector inference
 */
export interface ARIANodeInfo {
  role?: string;
  name?: string;
  level?: number;
  hasTestId?: boolean;
  testId?: string;
  label?: string;
  placeholder?: string;
}

/**
 * Selector fix result
 */
export interface SelectorFixResult {
  /** Whether a fix was applied */
  applied: boolean;
  /** The modified code */
  code: string;
  /** Description of the fix */
  description: string;
  /** The new locator expression */
  newLocator?: string;
  /** Confidence in the fix (0-1) */
  confidence: number;
}

/**
 * CSS selector patterns to replace
 */
const CSS_SELECTOR_PATTERNS = [
  // page.locator('.class') or page.locator('#id')
  /page\.locator\s*\(\s*['"`]([.#][^'"`]+)['"`]\s*\)/g,
  // page.locator('[attribute]')
  /page\.locator\s*\(\s*['"`](\[[^\]]+\])['"`]\s*\)/g,
  // page.locator('tag.class')
  /page\.locator\s*\(\s*['"`]([a-z]+[.#][^'"`]+)['"`]\s*\)/g,
];

/**
 * Map of common UI patterns to role-based selectors
 */
const UI_PATTERN_TO_ROLE: Record<string, { role: string; nameHint?: string }> = {
  'button': { role: 'button' },
  'btn': { role: 'button' },
  'submit': { role: 'button', nameHint: 'submit' },
  'input': { role: 'textbox' },
  'textbox': { role: 'textbox' },
  'checkbox': { role: 'checkbox' },
  'radio': { role: 'radio' },
  'select': { role: 'combobox' },
  'dropdown': { role: 'combobox' },
  'link': { role: 'link' },
  'heading': { role: 'heading' },
  'h1': { role: 'heading' },
  'h2': { role: 'heading' },
  'h3': { role: 'heading' },
  'dialog': { role: 'dialog' },
  'modal': { role: 'dialog' },
  'alert': { role: 'alert' },
  'tab': { role: 'tab' },
  'menu': { role: 'menu' },
  'menuitem': { role: 'menuitem' },
  'table': { role: 'table' },
  'row': { role: 'row' },
  'cell': { role: 'cell' },
  'grid': { role: 'grid' },
  'list': { role: 'list' },
  'listitem': { role: 'listitem' },
  'img': { role: 'img' },
  'image': { role: 'img' },
  'nav': { role: 'navigation' },
  'navigation': { role: 'navigation' },
  'search': { role: 'search' },
  'main': { role: 'main' },
  'banner': { role: 'banner' },
  'footer': { role: 'contentinfo' },
};

/**
 * Extract CSS selector from code
 */
export function extractCSSSelector(code: string): string | null {
  for (const pattern of CSS_SELECTOR_PATTERNS) {
    pattern.lastIndex = 0;
    const match = pattern.exec(code);
    if (match) {
      return match[1] ?? null;
    }
  }
  return null;
}

/**
 * Check if code contains a CSS selector
 */
export function containsCSSSelector(code: string): boolean {
  return CSS_SELECTOR_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(code);
  });
}

/**
 * Infer role from CSS selector class/id names
 */
export function inferRoleFromSelector(selector: string): { role: string; name?: string } | null {
  const lowerSelector = selector.toLowerCase();

  for (const [pattern, roleInfo] of Object.entries(UI_PATTERN_TO_ROLE)) {
    if (lowerSelector.includes(pattern)) {
      return roleInfo;
    }
  }

  return null;
}

/**
 * Extract potential name from selector
 */
export function extractNameFromSelector(selector: string): string | null {
  // Extract text between brackets for attribute selectors
  const attrMatch = selector.match(/\[(?:aria-label|title|alt|name)=['"]([^'"]+)['"]\]/);
  if (attrMatch) {
    return attrMatch[1] ?? null;
  }

  // Extract class name parts that might be descriptive
  const classMatch = selector.match(/\.([a-zA-Z][-a-zA-Z0-9_]*)/);
  if (classMatch) {
    // Convert class name to readable format
    const className = classMatch[1]!;
    // Convert kebab-case or snake_case to words
    const words = className.split(/[-_]/).filter(Boolean);
    if (words.length > 0 && words[0]!.length > 2) {
      return words.join(' ');
    }
  }

  return null;
}

/**
 * Generate role-based locator from inferred information
 */
export function generateRoleLocator(
  role: string,
  name?: string,
  options?: { exact?: boolean; level?: number }
): string {
  const parts: string[] = [];

  if (name) {
    if (options?.exact) {
      parts.push(`{ name: '${name}', exact: true }`);
    } else {
      parts.push(`{ name: '${name}' }`);
    }
  }

  if (options?.level !== undefined && role === 'heading') {
    if (parts.length > 0) {
      // Merge with existing options
      const existing = parts[0]!.slice(0, -2); // Remove ' }'
      parts[0] = `${existing}, level: ${options.level} }`;
    } else {
      parts.push(`{ level: ${options.level} }`);
    }
  }

  if (parts.length > 0) {
    return `page.getByRole('${role}', ${parts[0]})`;
  }

  return `page.getByRole('${role}')`;
}

/**
 * Generate label-based locator
 */
export function generateLabelLocator(label: string, exact?: boolean): string {
  if (exact) {
    return `page.getByLabel('${label}', { exact: true })`;
  }
  return `page.getByLabel('${label}')`;
}

/**
 * Generate text-based locator
 */
export function generateTextLocator(text: string, exact?: boolean): string {
  if (exact) {
    return `page.getByText('${text}', { exact: true })`;
  }
  return `page.getByText('${text}')`;
}

/**
 * Generate testid-based locator
 */
export function generateTestIdLocator(testId: string): string {
  return `page.getByTestId('${testId}')`;
}

/**
 * Apply selector fix to code
 */
export function applySelectorFix(context: SelectorFixContext): SelectorFixResult {
  const { code, ariaInfo } = context;

  // If we have ARIA info, use it
  if (ariaInfo) {
    return applySelectorFixWithARIA(code, ariaInfo);
  }

  // Try to infer from CSS selector
  const cssSelector = extractCSSSelector(code);
  if (!cssSelector) {
    return {
      applied: false,
      code,
      description: 'No CSS selector found to refine',
      confidence: 0,
    };
  }

  return applySelectorFixFromCSS(code, cssSelector);
}

/**
 * Apply selector fix using ARIA information
 */
function applySelectorFixWithARIA(code: string, ariaInfo: ARIANodeInfo): SelectorFixResult {
  let newLocator: string | null = null;
  let confidence = 0;

  // Priority: testid > role+name > label > text
  if (ariaInfo.testId) {
    newLocator = generateTestIdLocator(ariaInfo.testId);
    confidence = 1.0;
  } else if (ariaInfo.role && ariaInfo.name) {
    newLocator = generateRoleLocator(ariaInfo.role, ariaInfo.name, {
      exact: true,
      level: ariaInfo.level,
    });
    confidence = 0.9;
  } else if (ariaInfo.label) {
    newLocator = generateLabelLocator(ariaInfo.label, true);
    confidence = 0.85;
  } else if (ariaInfo.role) {
    newLocator = generateRoleLocator(ariaInfo.role);
    confidence = 0.6;
  }

  if (!newLocator) {
    return {
      applied: false,
      code,
      description: 'Unable to generate locator from ARIA info',
      confidence: 0,
    };
  }

  // Replace CSS selector in code
  let modifiedCode = code;
  for (const pattern of CSS_SELECTOR_PATTERNS) {
    modifiedCode = modifiedCode.replace(pattern, newLocator);
  }

  return {
    applied: modifiedCode !== code,
    code: modifiedCode,
    description: `Replaced CSS selector with ${newLocator.split('(')[0]}`,
    newLocator,
    confidence,
  };
}

/**
 * Apply selector fix by inferring from CSS selector
 */
function applySelectorFixFromCSS(code: string, cssSelector: string): SelectorFixResult {
  // Try to infer role from selector
  const roleInfo = inferRoleFromSelector(cssSelector);
  const extractedName = extractNameFromSelector(cssSelector);

  let newLocator: string | null = null;
  let confidence = 0;

  if (roleInfo) {
    const name = extractedName;
    if (name) {
      newLocator = generateRoleLocator(roleInfo.role, name);
      confidence = 0.6;
    } else {
      newLocator = generateRoleLocator(roleInfo.role);
      confidence = 0.4;
    }
  } else if (extractedName) {
    // Fall back to text locator if we have a name but no role
    newLocator = generateTextLocator(extractedName);
    confidence = 0.3;
  }

  if (!newLocator) {
    return {
      applied: false,
      code,
      description: 'Unable to infer semantic locator from CSS selector',
      confidence: 0,
    };
  }

  // Replace CSS selector in code
  let modifiedCode = code;
  for (const pattern of CSS_SELECTOR_PATTERNS) {
    modifiedCode = modifiedCode.replace(pattern, newLocator);
  }

  return {
    applied: modifiedCode !== code,
    code: modifiedCode,
    description: `Inferred ${newLocator.split('(')[0]} from CSS selector pattern`,
    newLocator,
    confidence,
  };
}

/**
 * Add exact: true to existing locator
 */
export function addExactToLocator(code: string): SelectorFixResult {
  let modifiedCode = code;
  let applied = false;

  // Add exact: true to getByRole
  modifiedCode = modifiedCode.replace(
    /page\.getByRole\s*\(\s*['"](\w+)['"]\s*,\s*\{\s*name:\s*['"]([^'"]+)['"]\s*\}\s*\)/g,
    (_, role, name) => {
      applied = true;
      return `page.getByRole('${role}', { name: '${name}', exact: true })`;
    }
  );

  // Add exact: true to getByLabel
  modifiedCode = modifiedCode.replace(
    /page\.getByLabel\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    (_, label) => {
      applied = true;
      return `page.getByLabel('${label}', { exact: true })`;
    }
  );

  // Add exact: true to getByText
  modifiedCode = modifiedCode.replace(
    /page\.getByText\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    (_, text) => {
      applied = true;
      return `page.getByText('${text}', { exact: true })`;
    }
  );

  return {
    applied,
    code: modifiedCode,
    description: applied ? 'Added exact: true to locator' : 'No locator found to add exact option',
    confidence: applied ? 0.8 : 0,
  };
}
