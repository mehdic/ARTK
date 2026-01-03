/**
 * IR Serializer - Convert IR to JSON for debugging and analysis
 * @see research/2026-01-02_autogen-refined-plan.md Section 9
 */
import type { IRJourney, IRStep, IRPrimitive, LocatorSpec } from './types.js';

/**
 * Options for IR serialization
 */
export interface SerializeOptions {
  /** Include null/undefined values */
  includeEmpty?: boolean;
  /** Pretty print with indentation */
  pretty?: boolean;
  /** Indent size for pretty printing */
  indent?: number;
}

/**
 * Serialize an IR Journey to JSON string
 */
export function serializeJourney(
  journey: IRJourney,
  options: SerializeOptions = {}
): string {
  const { pretty = true, indent = 2 } = options;

  const cleaned = cleanObject(journey, options.includeEmpty ?? false);

  return pretty
    ? JSON.stringify(cleaned, null, indent)
    : JSON.stringify(cleaned);
}

/**
 * Serialize an IR Step to JSON string
 */
export function serializeStep(
  step: IRStep,
  options: SerializeOptions = {}
): string {
  const { pretty = true, indent = 2 } = options;

  const cleaned = cleanObject(step, options.includeEmpty ?? false);

  return pretty
    ? JSON.stringify(cleaned, null, indent)
    : JSON.stringify(cleaned);
}

/**
 * Serialize an IR Primitive to JSON string
 */
export function serializePrimitive(
  primitive: IRPrimitive,
  options: SerializeOptions = {}
): string {
  const { pretty = true, indent = 2 } = options;

  const cleaned = cleanObject(primitive, options.includeEmpty ?? false);

  return pretty
    ? JSON.stringify(cleaned, null, indent)
    : JSON.stringify(cleaned);
}

/**
 * Convert a LocatorSpec to a human-readable description
 */
export function describeLocator(locator: LocatorSpec): string {
  const { strategy, value, options } = locator;

  switch (strategy) {
    case 'role': {
      let desc = `getByRole('${value}'`;
      if (options?.name) {
        desc += `, { name: '${options.name}'`;
        if (options.exact) desc += ', exact: true';
        if (options.level) desc += `, level: ${options.level}`;
        desc += ' }';
      }
      desc += ')';
      return desc;
    }
    case 'label':
      return `getByLabel('${value}'${options?.exact ? ', { exact: true }' : ''})`;
    case 'placeholder':
      return `getByPlaceholder('${value}'${options?.exact ? ', { exact: true }' : ''})`;
    case 'text':
      return `getByText('${value}'${options?.exact ? ', { exact: true }' : ''})`;
    case 'testid':
      return `getByTestId('${value}')`;
    case 'css':
      return `locator('${value}')`;
    default:
      return `unknown('${value}')`;
  }
}

/**
 * Convert an IR Primitive to a human-readable description
 */
export function describePrimitive(primitive: IRPrimitive): string {
  switch (primitive.type) {
    case 'goto':
      return `Navigate to ${primitive.url}`;
    case 'click':
      return `Click ${describeLocator(primitive.locator)}`;
    case 'fill':
      return `Fill ${describeLocator(primitive.locator)} with "${primitive.value.value}"`;
    case 'select':
      return `Select "${primitive.option}" in ${describeLocator(primitive.locator)}`;
    case 'check':
      return `Check ${describeLocator(primitive.locator)}`;
    case 'uncheck':
      return `Uncheck ${describeLocator(primitive.locator)}`;
    case 'press':
      return `Press "${primitive.key}"`;
    case 'hover':
      return `Hover ${describeLocator(primitive.locator)}`;
    case 'expectVisible':
      return `Expect ${describeLocator(primitive.locator)} to be visible`;
    case 'expectNotVisible':
      return `Expect ${describeLocator(primitive.locator)} to be hidden`;
    case 'expectText':
      return `Expect ${describeLocator(primitive.locator)} to have text "${primitive.text}"`;
    case 'expectURL':
      return `Expect URL to match ${primitive.pattern}`;
    case 'expectTitle':
      return `Expect title to be "${primitive.title}"`;
    case 'expectToast':
      return `Expect ${primitive.toastType} toast${primitive.message ? `: "${primitive.message}"` : ''}`;
    case 'callModule':
      return `Call ${primitive.module}.${primitive.method}()`;
    case 'blocked':
      return `BLOCKED: ${primitive.reason}`;
    case 'waitForURL':
      return `Wait for URL to match ${primitive.pattern}`;
    case 'waitForResponse':
      return `Wait for response matching ${primitive.urlPattern}`;
    case 'waitForLoadingComplete':
      return `Wait for loading to complete`;
    default:
      return `Unknown primitive: ${(primitive as { type: string }).type}`;
  }
}

/**
 * Generate a summary of an IR Journey
 */
export function summarizeJourney(journey: IRJourney): string {
  const lines: string[] = [
    `Journey: ${journey.id} - ${journey.title}`,
    `  Tier: ${journey.tier}`,
    `  Scope: ${journey.scope}`,
    `  Actor: ${journey.actor}`,
    `  Tags: ${journey.tags.join(', ')}`,
    '',
    `  Steps (${journey.steps.length}):`,
  ];

  for (const step of journey.steps) {
    lines.push(`    ${step.id}: ${step.description}`);
    lines.push(`      Actions: ${step.actions.length}`);
    lines.push(`      Assertions: ${step.assertions.length}`);
  }

  if (journey.moduleDependencies.foundation.length > 0) {
    lines.push('');
    lines.push(`  Foundation Modules: ${journey.moduleDependencies.foundation.join(', ')}`);
  }

  if (journey.moduleDependencies.feature.length > 0) {
    lines.push(`  Feature Modules: ${journey.moduleDependencies.feature.join(', ')}`);
  }

  return lines.join('\n');
}

/**
 * Remove null/undefined values from an object recursively
 */
function cleanObject(obj: unknown, includeEmpty: boolean): unknown {
  if (obj === null || obj === undefined) {
    return includeEmpty ? obj : undefined;
  }

  if (Array.isArray(obj)) {
    const cleaned = obj
      .map((item) => cleanObject(item, includeEmpty))
      .filter((item) => includeEmpty || item !== undefined);
    return cleaned.length > 0 || includeEmpty ? cleaned : undefined;
  }

  if (typeof obj === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const cleanedValue = cleanObject(value, includeEmpty);
      if (includeEmpty || cleanedValue !== undefined) {
        cleaned[key] = cleanedValue;
      }
    }
    return Object.keys(cleaned).length > 0 || includeEmpty ? cleaned : undefined;
  }

  return obj;
}
