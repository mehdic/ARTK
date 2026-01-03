/**
 * Machine Hint Parser - Extract hints from Journey step text
 * @see T072 - Implement machine hint parser
 */
import {
  type HintType,
  type MachineHint,
  HINT_BLOCK_PATTERN,
  HINT_PATTERNS,
  isValidRole,
  containsHints,
  removeHints,
} from './hintPatterns.js';

/**
 * Parsed hints result
 */
export interface ParsedHints {
  /** All parsed hints */
  hints: MachineHint[];
  /** Step text with hints removed */
  cleanText: string;
  /** Original text */
  originalText: string;
  /** Validation warnings */
  warnings: string[];
}

/**
 * Locator hints extracted for code generation
 */
export interface LocatorHints {
  /** ARIA role */
  role?: string;
  /** Test ID */
  testid?: string;
  /** Label text */
  label?: string;
  /** Text content */
  text?: string;
  /** Exact matching */
  exact?: boolean;
  /** Heading level (for role=heading) */
  level?: number;
}

/**
 * Behavioral hints extracted for code generation
 */
export interface BehaviorHints {
  /** Signal to wait for */
  signal?: string;
  /** Module method to call */
  module?: string;
  /** Wait strategy */
  wait?: 'networkidle' | 'domcontentloaded' | 'load' | 'commit';
  /** Timeout in ms */
  timeout?: number;
}

/**
 * Complete hint extraction result
 */
export interface ExtractedHints {
  /** Locator-related hints */
  locator: LocatorHints;
  /** Behavior-related hints */
  behavior: BehaviorHints;
  /** Whether any hints were found */
  hasHints: boolean;
  /** Clean step text */
  cleanText: string;
  /** Warnings */
  warnings: string[];
}

/**
 * Parse machine hints from step text
 */
export function parseHints(text: string): ParsedHints {
  const hints: MachineHint[] = [];
  const warnings: string[] = [];

  if (!containsHints(text)) {
    return {
      hints: [],
      cleanText: text,
      originalText: text,
      warnings: [],
    };
  }

  // Extract all hint blocks
  HINT_BLOCK_PATTERN.lastIndex = 0;
  let match;

  while ((match = HINT_BLOCK_PATTERN.exec(text)) !== null) {
    const key = match[1].toLowerCase() as HintType;
    const value = match[2] || match[3] || match[4];

    if (!value) {
      warnings.push(`Empty value for hint: ${key}`);
      continue;
    }

    // Validate the hint type
    if (!(key in HINT_PATTERNS)) {
      warnings.push(`Unknown hint type: ${key}`);
      continue;
    }

    // Validate role values
    if (key === 'role' && !isValidRole(value)) {
      warnings.push(`Invalid ARIA role: ${value}`);
    }

    hints.push({
      type: key,
      value,
      raw: match[0],
    });
  }

  return {
    hints,
    cleanText: removeHints(text),
    originalText: text,
    warnings,
  };
}

/**
 * Extract structured hints for code generation
 */
export function extractHints(text: string): ExtractedHints {
  const parsed = parseHints(text);

  const locator: LocatorHints = {};
  const behavior: BehaviorHints = {};

  for (const hint of parsed.hints) {
    switch (hint.type) {
      case 'role':
        locator.role = hint.value;
        break;
      case 'testid':
        locator.testid = hint.value;
        break;
      case 'label':
        locator.label = hint.value;
        break;
      case 'text':
        locator.text = hint.value;
        break;
      case 'exact':
        locator.exact = hint.value.toLowerCase() === 'true';
        break;
      case 'level':
        locator.level = parseInt(hint.value, 10);
        break;
      case 'signal':
        behavior.signal = hint.value;
        break;
      case 'module':
        behavior.module = hint.value;
        break;
      case 'wait':
        behavior.wait = hint.value as BehaviorHints['wait'];
        break;
      case 'timeout':
        behavior.timeout = parseInt(hint.value, 10);
        break;
    }
  }

  return {
    locator,
    behavior,
    hasHints: parsed.hints.length > 0,
    cleanText: parsed.cleanText,
    warnings: parsed.warnings,
  };
}

/**
 * Check if hints specify a locator strategy
 */
export function hasLocatorHints(hints: ExtractedHints): boolean {
  const { locator } = hints;
  return !!(locator.role || locator.testid || locator.label || locator.text);
}

/**
 * Check if hints specify behavioral modifications
 */
export function hasBehaviorHints(hints: ExtractedHints): boolean {
  const { behavior } = hints;
  return !!(behavior.signal || behavior.module || behavior.wait || behavior.timeout);
}

/**
 * Generate locator code from hints
 */
export function generateLocatorFromHints(hints: LocatorHints): string | null {
  // Priority: testid > role > label > text
  if (hints.testid) {
    return `page.getByTestId('${hints.testid}')`;
  }

  if (hints.role) {
    const options: string[] = [];
    if (hints.label) {
      options.push(`name: '${hints.label}'`);
    }
    if (hints.exact) {
      options.push('exact: true');
    }
    if (hints.level && hints.role === 'heading') {
      options.push(`level: ${hints.level}`);
    }

    if (options.length > 0) {
      return `page.getByRole('${hints.role}', { ${options.join(', ')} })`;
    }
    return `page.getByRole('${hints.role}')`;
  }

  if (hints.label) {
    if (hints.exact) {
      return `page.getByLabel('${hints.label}', { exact: true })`;
    }
    return `page.getByLabel('${hints.label}')`;
  }

  if (hints.text) {
    if (hints.exact) {
      return `page.getByText('${hints.text}', { exact: true })`;
    }
    return `page.getByText('${hints.text}')`;
  }

  return null;
}

/**
 * Parse module hint into module name and method
 */
export function parseModuleHint(moduleHint: string): { module: string; method: string } | null {
  const parts = moduleHint.split('.');
  if (parts.length !== 2) {
    return null;
  }
  return {
    module: parts[0],
    method: parts[1],
  };
}

/**
 * Validate hints for consistency
 */
export function validateHints(hints: ExtractedHints): string[] {
  const errors: string[] = [];

  // Check for conflicting locator hints
  const locatorCount = [
    hints.locator.testid,
    hints.locator.role,
    hints.locator.label && !hints.locator.role, // label with role is fine
    hints.locator.text,
  ].filter(Boolean).length;

  if (locatorCount > 1) {
    errors.push('Multiple conflicting locator hints specified');
  }

  // Check for level without heading role
  if (hints.locator.level && hints.locator.role !== 'heading') {
    errors.push('level hint only applies to role=heading');
  }

  // Check for module hint format
  if (hints.behavior.module) {
    const parsed = parseModuleHint(hints.behavior.module);
    if (!parsed) {
      errors.push('module hint must be in format: moduleName.methodName');
    }
  }

  return errors;
}

/**
 * Merge hints with inferred locator (hints take priority)
 */
export function mergeWithInferred(
  hints: LocatorHints,
  inferred: { strategy: string; value: string }
): { strategy: string; value: string; options?: Record<string, unknown> } {
  // If hints specify a locator, use it
  if (hints.testid) {
    return { strategy: 'testid', value: hints.testid };
  }

  if (hints.role) {
    const options: Record<string, unknown> = {};
    if (hints.label) {
      options.name = hints.label;
    }
    if (hints.exact) {
      options.exact = true;
    }
    if (hints.level) {
      options.level = hints.level;
    }
    return { strategy: 'role', value: hints.role, options };
  }

  if (hints.label) {
    const options: Record<string, unknown> = {};
    if (hints.exact) {
      options.exact = true;
    }
    return { strategy: 'label', value: hints.label, options };
  }

  if (hints.text) {
    const options: Record<string, unknown> = {};
    if (hints.exact) {
      options.exact = true;
    }
    return { strategy: 'text', value: hints.text, options };
  }

  // Add exact option to inferred if specified
  if (hints.exact) {
    return { ...inferred, options: { exact: true } };
  }

  // Fall back to inferred
  return inferred;
}
